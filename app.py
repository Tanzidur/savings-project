import os
import re
import base64
import json
from functools import wraps

import MySQLdb
import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request, session, send_from_directory
from flask_mysqldb import MySQL
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

load_dotenv()

app = Flask(__name__)

# Hardcoded for this prototype (per Update 3 plan). No separate admins table yet —
# swap this for a real admins table + hashed passwords before this ever goes live.
ADMIN_CREDENTIALS = {
    'admin@savings.com': 'admin123'
}


def admin_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not session.get('is_admin'):
            return jsonify({"error": "Admin login required"}), 401
        return f(*args, **kwargs)
    return wrapper


app.secret_key = 'savings-dev-secret-key'
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False
app.config['PERMANENT_SESSION_LIFETIME'] = 86400  # 24 hours

CORS(app, supports_credentials=True)

app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = ''
app.config['MYSQL_DB'] = 'savings_db'

mysql = MySQL(app)

# ---------- GEMINI OCR CONFIG ----------
GEMINI_KEYS = [k.strip() for k in os.environ.get('GEMINI_API_KEYS', '').split(',') if k.strip()]
GEMINI_MODEL = 'gemini-3.5-flash-lite'
ALLOWED_CATEGORIES = ['Shopping', 'Dining', 'Groceries', 'Entertainment', 'Travel', 'Other']

_schema_ready = False


def parse_percent(value):
    """Best-effort parse of strings like '10%', '1.5%', or bare '10'."""
    if value is None:
        return None
    text = str(value).strip()
    lower = text.lower()
    if 'bogo' in lower:
        return None
    if 'free' in lower:
        return None
    match = re.search(r'(\d+(?:\.\d+)?)\s*%', text)
    if match:
        return float(match.group(1))
    match = re.search(r'^(\d+(?:\.\d+)?)$', text)
    if match:
        return float(match.group(1))
    return None


def classify_discount(discount_str):
    if not discount_str:
        return 'none'
    lower = str(discount_str).lower()
    if 'bogo' in lower:
        return 'bogo'
    if 'free' in lower:
        return 'free_item'
    if parse_percent(discount_str) is not None:
        return 'percent'
    return 'other'


def estimate_savings_from_discount(discount_str, amount):
    """Numeric estimate. BOGO counts as 50% of spend (demo assumption). Free item = 0."""
    amount = float(amount or 0)
    kind = classify_discount(discount_str)
    if kind == 'bogo':
        return round(amount * 0.5, 2), kind
    if kind == 'free_item':
        return 0.0, kind
    pct = parse_percent(discount_str)
    if pct is None:
        return 0.0, kind
    return round(amount * (pct / 100.0), 2), kind


def merchant_listed_category(merchant_name, merchants, offers):
    """Category from the merchant directory, falling back to any offer at that merchant."""
    q = (merchant_name or '').strip().lower()
    if not q:
        return None
    for row in merchants or []:
        if (row.get('name') or '').lower() == q:
            cat = (row.get('category') or '').strip()
            if cat:
                return cat
    for offer in offers or []:
        if (offer.get('merchant') or '').lower() == q and offer.get('category'):
            return offer.get('category')
    return None


def picker_empty_reason(merchant, category, offers, merchants):
    """
    Strict purchase match:
    - merchant + category must both fit (Apex is Shopping, not Dining)
      and need a live offer at that merchant in that category
    - category only needs at least one live deal in that category
    - merchant only can always rank (cashback still applies in-store)
    """
    merchant = (merchant or '').strip()
    category = (category or '').strip()
    live = [o for o in (offers or []) if not o.get('isExpired')]

    if merchant and category:
        listed = merchant_listed_category(merchant, merchants, offers)
        if listed and listed.lower() != category.lower():
            return (
                f"{merchant} is listed as {listed}, so you can't use a {category} spend there."
            )
        matches = [
            o for o in live
            if (o.get('merchant') or '').lower() == merchant.lower()
            and (o.get('category') or '').lower() == category.lower()
        ]
        if not matches:
            return (
                f"No live {category} deals at {merchant} right now. Check Deals & Offers."
            )
        return None

    if category and not merchant:
        matches = [
            o for o in live
            if (o.get('category') or '').lower() == category.lower()
        ]
        if not matches:
            return f"No {category} deals right now. Check Deals & Offers."
        return None

    return None


def offer_matches_purchase(offer, merchant_q, category_q):
    merch_ok = (not merchant_q) or (offer.get('merchant') or '').lower() == merchant_q
    cat_ok = (not category_q) or (offer.get('category') or '').lower() == category_q
    if merchant_q and category_q:
        return merch_ok and cat_ok
    if merchant_q:
        return merch_ok
    if category_q:
        return cat_ok
    return False


def rank_cards_for_purchase(cards, offers, merchant, category, amount):
    """Rank cards by estimated savings for a merchant and/or category spend."""
    amount = float(amount) if amount else 0.0
    merchant_q = (merchant or '').strip().lower()
    category_q = (category or '').strip().lower()
    ranked = []

    for card in cards:
        bank_id = card['bankId']
        cashback_pct = parse_percent(card.get('cashback')) or 0.0
        base_savings = round(amount * (cashback_pct / 100.0), 2) if amount else 0.0

        matching = []
        for offer in offers:
            if offer.get('isExpired'):
                continue
            if offer.get('bankId') != bank_id:
                continue
            if offer_matches_purchase(offer, merchant_q, category_q):
                matching.append(offer)

        best_offer = None
        best_offer_savings = -1.0
        best_kind = 'none'
        for offer in matching:
            sav, kind = estimate_savings_from_discount(offer.get('discount'), amount)
            if sav > best_offer_savings:
                best_offer_savings = sav
                best_offer = offer
                best_kind = kind

        used_offer = False
        offer_id = None
        offer_title = None
        offer_discount = None
        estimated = base_savings

        if best_offer is not None:
            if best_kind == 'free_item' and base_savings >= best_offer_savings:
                reason = (
                    f"{card.get('cashback')} card cashback beats a non-percentage perk "
                    f"({best_offer['title']})"
                )
            elif best_offer_savings >= base_savings:
                estimated = best_offer_savings
                used_offer = True
                offer_id = best_offer['id']
                offer_title = best_offer['title']
                offer_discount = best_offer['discount']
                reason = f"Matching offer: {best_offer['title']} ({best_offer['discount']})"
                if best_kind == 'bogo':
                    reason += " — BOGO counted as 50% of spend for ranking"
            else:
                reason = f"{card.get('cashback')} card cashback"
        elif cashback_pct:
            reason = f"{card.get('cashback')} card cashback"
        else:
            reason = "No matching offer or cashback rate"

        ranked.append({
            "cardId": card['id'],
            "network": card.get('network'),
            "type": card.get('type'),
            "tier": card.get('tier'),
            "cashback": card.get('cashback'),
            "rewardPoints": card.get('rewardPoints'),
            "emi": card.get('emi'),
            "annualFee": card.get('annualFee'),
            "bankId": bank_id,
            "bankName": card.get('bankName'),
            "fromWallet": card.get('fromWallet', False),
            "estimatedSavings": estimated,
            "reason": reason,
            "usedOffer": used_offer,
            "offerId": offer_id,
            "offerTitle": offer_title,
            "offerDiscount": offer_discount
        })

    ranked.sort(key=lambda r: (-r['estimatedSavings'], r['cardId']))
    return ranked


def ensure_update4_schema():
    global _schema_ready
    if _schema_ready:
        return
    cur = mysql.connection.cursor()
    try:
        cur.execute("ALTER TABLE transactions ADD COLUMN savings_amount DECIMAL(10,2) DEFAULT 0")
        mysql.connection.commit()
    except Exception:
        mysql.connection.rollback()
    try:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS offer_watchlist (
              id int(11) NOT NULL AUTO_INCREMENT,
              user_id int(11) NOT NULL,
              offer_id int(11) NOT NULL,
              added_at timestamp NOT NULL DEFAULT current_timestamp(),
              PRIMARY KEY (id),
              UNIQUE KEY user_offer (user_id, offer_id),
              KEY user_id (user_id),
              KEY offer_id (offer_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        """)
        mysql.connection.commit()
    except Exception:
        mysql.connection.rollback()
    for stmt in (
        "ALTER TABLE users ADD COLUMN phone VARCHAR(20) DEFAULT NULL",
        "ALTER TABLE users ADD COLUMN nid VARCHAR(20) DEFAULT NULL",
        "ALTER TABLE users ADD COLUMN phone_verified TINYINT(1) NOT NULL DEFAULT 0",
        "ALTER TABLE users ADD COLUMN nid_verified TINYINT(1) NOT NULL DEFAULT 0",
    ):
        try:
            cur.execute(stmt)
            mysql.connection.commit()
        except Exception:
            mysql.connection.rollback()
    extra_articles = [
        (
            'Debit vs Credit: Which Card Should You Carry?',
            'Credit Basics',
            'A simple way to choose between debit and credit for everyday spending in Bangladesh.',
            'Debit cards spend money you already have. Credit cards borrow from the bank and must be repaid. For groceries and small bills, debit keeps you inside your salary. Use credit when the card has a real perk — cashback, EMI, or a live merchant offer — and only if you can pay the statement in full. If you cannot clear the bill, the APR usually costs more than the discount you just earned. On Savings, save both types on Card Perks, then let Best Card Picker rank the one that actually fits the purchase.',
            '6 min'
        ),
        (
            'Annual Fee vs Cashback: Do the Math',
            'Smart Spending',
            'A high cashback card is only a win if you spend enough to cover the yearly fee.',
            'Write down the annual fee, the cashback rate, and a realistic monthly spend. Example: a 3,000 BDT fee with 5% cashback needs about 60,000 BDT of qualifying spend per year just to break even. Fees quoted as "1500" and "1500 BDT" are the same number — compare them in BDT, not by looking at the prettier card. Lounge access and points only count if you actually use them. If your spend is low, a cheap debit card plus a live Deals & Offers promo often beats a premium credit card that sits in the drawer.',
            '5 min'
        ),
        (
            'How to Read an Offer Before You Redeem',
            'Smart Spending',
            'Title, merchant, category, and valid-until date matter more than the big percentage.',
            'Open the deal and check four things. Merchant: the discount applies at that brand, not the whole category. Category: Dining at Apex will not work if Apex is listed as Shopping. Discount type: 20% is a rate, BOGO is roughly half on a second item, Free Item is a bonus not a fake percent. Valid until: expired offers stay visible so you can learn the pattern, but Pay/Redeem is blocked. Watchlist a deal that ends within two weeks so Dashboard can remind you. When you redeem, enter the real amount — Savings estimates savings from the offer, it does not charge the merchant.',
            '5 min'
        ),
        (
            'Stay Safe With Cards and OTPs',
            'Debt Management',
            'Most card loss in Bangladesh is social engineering, not a broken website.',
            'Never share an OTP, PIN, or full card number on the phone or in chat, even if the caller names your bank. Banks do not ask you to read an SMS code to "unlock cashback". Use the official app or branch for disputes. On this site, login sessions last a day — log out on shared computers. Receipt upload sends a photo to an OCR model to guess category and amount; you still confirm before anything is saved. If a deal looks too large to be real (for example 99 million BDT on a grocery promo), treat it as a demo figure, not a target.',
            '4 min'
        ),
    ]
    try:
        for title, category, summary, content, read_time in extra_articles:
            cur.execute("SELECT id FROM articles WHERE title = %s", (title,))
            if not cur.fetchone():
                cur.execute(
                    "INSERT INTO articles (title, category, summary, content, read_time) VALUES (%s, %s, %s, %s, %s)",
                    (title, category, summary, content, read_time)
                )
        mysql.connection.commit()
    except Exception:
        mysql.connection.rollback()
    cur.close()
    _schema_ready = True


@app.before_request
def _ensure_schema():
    if request.path.startswith('/api/'):
        try:
            ensure_update4_schema()
        except Exception:
            pass


def call_gemini_receipt_ocr(image_bytes, mime_type):
    prompt = f"""You are reading a purchase receipt image. Extract the following and respond with ONLY valid JSON, no other text:
{{
  "merchant": "the store/merchant name, or 'Unknown' if unreadable",
  "amount": total amount as a plain number, no currency symbol,
  "category": one of exactly these values: {ALLOWED_CATEGORIES},
  "description": "a short one-line description, e.g. 'Groceries at Shwapno'"
}}
If the image is not a receipt or is unreadable, set amount to 0."""

    image_b64 = base64.b64encode(image_bytes).decode('utf-8')
    last_error = None

    for i, key in enumerate(GEMINI_KEYS):
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={key}"
        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": mime_type, "data": image_b64}}
                ]
            }],
            "generationConfig": {"response_mime_type": "application/json"}
        }
        try:
            response = requests.post(url, json=payload, timeout=30)
            if response.status_code == 429:
                last_error = "Rate limited"
                continue
            if response.status_code != 200:
                last_error = response.text
                continue
            data = response.json()
            text_result = data['candidates'][0]['content']['parts'][0]['text']
            parsed = json.loads(text_result)
            if parsed.get('category') not in ALLOWED_CATEGORIES:
                parsed['category'] = 'Other'
            return parsed
        except Exception as e:
            last_error = str(e)
            continue

    raise Exception(f"All Gemini API keys exhausted or failed. Last error: {last_error}")


# ---------- SERVE FRONTEND ----------
@app.route('/')
def home():
    return send_from_directory('.', 'index.html')


@app.route('/<path:path>')
def serve_file(path):
    try:
        return send_from_directory('.', path)
    except Exception:
        return send_from_directory('.', 'pages/404.html'), 404


# ---------- BANKS & CARDS ----------
@app.route('/api/banks')
def get_banks():
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT id, name FROM banks")
        banks = cur.fetchall()
        result = []
        for bank in banks:
            bank_id, bank_name = bank
            cur.execute("SELECT id, network, type, tier, cashback, reward_points, emi, annual_fee FROM cards WHERE bank_id = %s", (bank_id,))
            cards = cur.fetchall()
            card_list = [{
                "id": c[0], "network": c[1], "type": c[2], "tier": c[3],
                "cashback": c[4], "rewardPoints": c[5], "emi": bool(c[6]), "annualFee": c[7]
            } for c in cards]
            result.append({"id": bank_id, "name": bank_name, "cards": card_list})
        cur.close()
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------- OFFERS ----------
@app.route('/api/offers')
def get_offers():
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT offers.id, offers.merchant, offers.title, offers.description,
                   offers.category, offers.discount, offers.valid_until, banks.name,
                   offers.bank_id, (offers.valid_until < CURDATE()) AS is_expired
            FROM offers
            JOIN banks ON offers.bank_id = banks.id
        """)
        rows = cur.fetchall()
        cur.close()

        result = [{
            "id": r[0], "merchant": r[1], "title": r[2], "description": r[3],
            "category": r[4], "discount": r[5], "validUntil": str(r[6]), "bankName": r[7],
            "bankId": r[8], "isExpired": bool(r[9])
        } for r in rows]

        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------- MERCHANTS ----------
@app.route('/api/merchants')
def get_merchants():
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT id, name, category, description, address FROM merchants")
        rows = cur.fetchall()
        cur.close()
        result = [{"id": r[0], "name": r[1], "category": r[2], "description": r[3], "address": r[4]} for r in rows]
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------- ARTICLES ----------
@app.route('/api/articles')
def get_articles():
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT id, title, category, summary, content, read_time FROM articles")
        rows = cur.fetchall()
        cur.close()
        result = [{
            "id": r[0], "title": r[1], "category": r[2], "summary": r[3],
            "content": r[4], "readTime": r[5]
        } for r in rows]
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------- AUTH ----------
@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')

        if not name or not email or not password:
            return jsonify({"success": False, "error": "All fields are required"}), 400

        cur = mysql.connection.cursor()
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            cur.close()
            return jsonify({"success": False, "error": "Email already registered"}), 409

        password_hash = generate_password_hash(password)
        cur.execute("INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s)",
                    (name, email, password_hash))
        mysql.connection.commit()
        user_id = cur.lastrowid
        cur.close()

        session.permanent = True
        session['user_id'] = user_id
        session['user_name'] = name
        return jsonify({"success": True, "name": name})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        cur = mysql.connection.cursor()
        cur.execute("SELECT id, name, password_hash FROM users WHERE email = %s", (email,))
        user = cur.fetchone()
        cur.close()

        if not user or not check_password_hash(user[2], password):
            return jsonify({"success": False, "error": "Invalid email or password"}), 401

        session.permanent = True
        session['user_id'] = user[0]
        session['user_name'] = user[1]
        return jsonify({"success": True, "name": user[1]})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/logout', methods=['POST'])
def logout():
    try:
        session.pop('user_id', None)
        session.pop('user_name', None)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/session')
def check_session():
    try:
        if session.get('user_id'):
            return jsonify({"loggedIn": True, "name": session.get('user_name')})
        return jsonify({"loggedIn": False})
    except Exception as e:
        return jsonify({"loggedIn": False, "error": str(e)}), 500


# ---------- DASHBOARD ----------
@app.route('/api/dashboard')
def get_dashboard():
    try:
        if not session.get('user_id'):
            return jsonify({"error": "Not logged in"}), 401

        user_id = session['user_id']
        cur = mysql.connection.cursor()
        cur.execute(
            "SELECT id, category, amount, transaction_date, offer_title, description, COALESCE(savings_amount, 0) "
            "FROM transactions WHERE user_id = %s ORDER BY transaction_date",
            (user_id,)
        )
        rows = cur.fetchall()

        cur.execute(
            "SELECT COALESCE(SUM(savings_amount), 0) FROM transactions "
            "WHERE user_id = %s AND YEAR(transaction_date) = YEAR(CURDATE()) "
            "AND MONTH(transaction_date) = MONTH(CURDATE())",
            (user_id,)
        )
        monthly_savings = float(cur.fetchone()[0] or 0)

        cur.execute("""
            SELECT offers.id, offers.merchant, offers.title, offers.discount, offers.valid_until, banks.name
            FROM offer_watchlist
            JOIN offers ON offers.id = offer_watchlist.offer_id
            JOIN banks ON offers.bank_id = banks.id
            WHERE offer_watchlist.user_id = %s
              AND offers.valid_until >= CURDATE()
              AND offers.valid_until <= DATE_ADD(CURDATE(), INTERVAL 14 DAY)
            ORDER BY offers.valid_until
        """, (user_id,))
        expiring_rows = cur.fetchall()
        cur.close()

        transactions = [{
            "id": r[0], "category": r[1], "amount": float(r[2]), "date": str(r[3]),
            "offerTitle": r[4], "description": r[5], "savingsAmount": float(r[6] or 0)
        } for r in rows]

        expiring = [{
            "id": r[0], "merchant": r[1], "title": r[2], "discount": r[3],
            "validUntil": str(r[4]), "bankName": r[5]
        } for r in expiring_rows]

        return jsonify({
            "name": session.get('user_name'),
            "transactions": transactions,
            "monthlySavings": monthly_savings,
            "expiringOffers": expiring
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/transaction/<int:transaction_id>')
def get_transaction(transaction_id):
    try:
        if not session.get('user_id'):
            return jsonify({"error": "Not logged in"}), 401

        user_id = session['user_id']
        cur = mysql.connection.cursor()
        cur.execute(
            "SELECT id, category, amount, transaction_date, offer_title, description FROM transactions WHERE id = %s AND user_id = %s",
            (transaction_id, user_id)
        )
        row = cur.fetchone()
        cur.close()

        if not row:
            return jsonify({"error": "Transaction not found"}), 404

        return jsonify({
            "id": row[0], "category": row[1], "amount": float(row[2]),
            "date": str(row[3]), "offerTitle": row[4], "description": row[5]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/add-transaction', methods=['POST'])
def add_transaction():
    try:
        if not session.get('user_id'):
            return jsonify({"error": "Not logged in"}), 401

        user_id = session['user_id']
        data = request.get_json()
        category = data.get('category')
        amount = data.get('amount')
        description = data.get('description')

        if not category or not amount:
            return jsonify({"success": False, "error": "Missing category or amount"}), 400

        try:
            amount = float(amount)
            if amount <= 0:
                raise ValueError
        except ValueError:
            return jsonify({"success": False, "error": "Invalid amount"}), 400

        cur = mysql.connection.cursor()
        cur.execute(
            "INSERT INTO transactions (user_id, category, amount, transaction_date, description) VALUES (%s, %s, %s, CURDATE(), %s)",
            (user_id, category, amount, description)
        )
        mysql.connection.commit()
        cur.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ---------- MY CARDS ----------
@app.route('/api/my-cards', methods=['GET'])
def get_my_cards():
    try:
        if not session.get('user_id'):
            return jsonify({"error": "Not logged in"}), 401

        user_id = session['user_id']
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT cards.id, cards.network, cards.type, cards.tier, cards.cashback,
                   cards.reward_points, cards.emi, cards.annual_fee, banks.name, cards.bank_id
            FROM user_cards
            JOIN cards ON user_cards.card_id = cards.id
            JOIN banks ON cards.bank_id = banks.id
            WHERE user_cards.user_id = %s
        """, (user_id,))
        rows = cur.fetchall()
        cur.close()

        result = [{
            "id": r[0], "network": r[1], "type": r[2], "tier": r[3],
            "cashback": r[4], "rewardPoints": r[5], "emi": bool(r[6]),
            "annualFee": r[7], "bankName": r[8], "bankId": r[9]
        } for r in rows]
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/my-cards', methods=['POST'])
def add_my_card():
    try:
        if not session.get('user_id'):
            return jsonify({"error": "Not logged in"}), 401

        user_id = session['user_id']
        card_id = request.get_json().get('cardId')

        cur = mysql.connection.cursor()
        cur.execute("SELECT id FROM user_cards WHERE user_id = %s AND card_id = %s", (user_id, card_id))
        if cur.fetchone():
            cur.close()
            return jsonify({"success": False, "error": "Card already added"}), 409

        cur.execute("INSERT INTO user_cards (user_id, card_id) VALUES (%s, %s)", (user_id, card_id))
        mysql.connection.commit()
        cur.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/my-cards/<card_id>', methods=['DELETE'])
def remove_my_card(card_id):
    try:
        if not session.get('user_id'):
            return jsonify({"error": "Not logged in"}), 401

        user_id = session['user_id']
        cur = mysql.connection.cursor()
        cur.execute("DELETE FROM user_cards WHERE user_id = %s AND card_id = %s", (user_id, card_id))
        mysql.connection.commit()
        cur.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ---------- REDEEM OFFER ----------
@app.route('/api/redeem', methods=['POST'])
def redeem_offer():
    try:
        if not session.get('user_id'):
            return jsonify({"error": "Not logged in"}), 401

        user_id = session['user_id']
        data = request.get_json()
        amount = data.get('amount')
        offer_id = data.get('offerId')
        card_id = data.get('cardId')

        if not offer_id:
            return jsonify({"success": False, "error": "Offer is required"}), 400

        try:
            amount = float(amount)
            if amount <= 0:
                raise ValueError
        except (TypeError, ValueError):
            return jsonify({"success": False, "error": "Invalid amount"}), 400

        cur = mysql.connection.cursor()
        cur.execute(
            "SELECT offers.discount, offers.title, offers.category, offers.bank_id, banks.name, "
            "(offers.valid_until < CURDATE()) AS is_expired "
            "FROM offers JOIN banks ON offers.bank_id = banks.id WHERE offers.id = %s",
            (offer_id,)
        )
        offer_row = cur.fetchone()
        if not offer_row:
            cur.close()
            return jsonify({"success": False, "error": "Offer not found"}), 404

        discount, offer_title, category, offer_bank_id, partner_bank, is_expired = (
            offer_row[0], offer_row[1], offer_row[2], offer_row[3], offer_row[4], bool(offer_row[5])
        )
        if is_expired:
            cur.close()
            return jsonify({"success": False, "error": "This offer has expired"}), 400

        if not card_id:
            cur.close()
            return jsonify({
                "success": False,
                "error": f"Select a saved {partner_bank} card to redeem this offer"
            }), 400

        cur.execute("""
            SELECT cards.bank_id FROM user_cards
            JOIN cards ON user_cards.card_id = cards.id
            WHERE user_cards.user_id = %s AND user_cards.card_id = %s
        """, (user_id, card_id))
        card_row = cur.fetchone()
        if not card_row:
            cur.close()
            return jsonify({"success": False, "error": "That card is not saved to your account"}), 400
        if card_row[0] != offer_bank_id:
            cur.close()
            return jsonify({
                "success": False,
                "error": f"This offer can only be redeemed with a saved {partner_bank} card."
            }), 403

        savings_amount, _ = estimate_savings_from_discount(discount, amount)

        cur.execute(
            "INSERT INTO transactions (user_id, category, amount, transaction_date, offer_title, description, savings_amount) "
            "VALUES (%s, %s, %s, CURDATE(), %s, %s, %s)",
            (user_id, category, amount, offer_title, offer_title, savings_amount)
        )
        mysql.connection.commit()
        cur.close()
        return jsonify({"success": True, "savingsAmount": savings_amount})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ---------- RECEIPT OCR ----------
@app.route('/api/ocr-receipt', methods=['POST'])
def ocr_receipt():
    try:
        if not session.get('user_id'):
            return jsonify({"error": "Not logged in"}), 401

        if 'receipt' not in request.files:
            return jsonify({"success": False, "error": "No file uploaded"}), 400

        file = request.files['receipt']
        image_bytes = file.read()
        mime_type = file.mimetype

        if not GEMINI_KEYS:
            return jsonify({"success": False, "error": "No API keys configured"}), 500

        result = call_gemini_receipt_ocr(image_bytes, mime_type)
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ---------- RECOMMEND BEST CARD ----------
@app.route('/api/recommend')
def recommend_card():
    try:
        merchant = (request.args.get('merchant') or '').strip()
        category = (request.args.get('category') or '').strip()
        amount_raw = request.args.get('amount')

        if not merchant and not category:
            return jsonify({"error": "Provide a merchant or category"}), 400

        amount = None
        if amount_raw not in (None, ''):
            try:
                amount = float(amount_raw)
                if amount < 0:
                    raise ValueError
            except ValueError:
                return jsonify({"error": "Invalid amount"}), 400

        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT offers.id, offers.merchant, offers.title, offers.description,
                   offers.category, offers.discount, offers.valid_until, banks.name,
                   offers.bank_id, (offers.valid_until < CURDATE()) AS is_expired
            FROM offers
            JOIN banks ON offers.bank_id = banks.id
        """)
        offer_rows = cur.fetchall()
        offers = [{
            "id": r[0], "merchant": r[1], "title": r[2], "description": r[3],
            "category": r[4], "discount": r[5], "validUntil": str(r[6]), "bankName": r[7],
            "bankId": r[8], "isExpired": bool(r[9])
        } for r in offer_rows]

        cur.execute("SELECT name, category FROM merchants")
        merchants = [{"name": r[0], "category": r[1]} for r in cur.fetchall()]

        used_wallet = False
        cards = []
        if session.get('user_id'):
            cur.execute("""
                SELECT cards.id, cards.network, cards.type, cards.tier, cards.cashback,
                       cards.reward_points, cards.emi, cards.annual_fee, banks.name, cards.bank_id
                FROM user_cards
                JOIN cards ON user_cards.card_id = cards.id
                JOIN banks ON cards.bank_id = banks.id
                WHERE user_cards.user_id = %s
            """, (session['user_id'],))
            wallet_rows = cur.fetchall()
            if wallet_rows:
                used_wallet = True
                cards = [{
                    "id": r[0], "network": r[1], "type": r[2], "tier": r[3],
                    "cashback": r[4], "rewardPoints": r[5], "emi": bool(r[6]),
                    "annualFee": r[7], "bankName": r[8], "bankId": r[9], "fromWallet": True
                } for r in wallet_rows]

        if not cards:
            cur.execute("""
                SELECT cards.id, cards.network, cards.type, cards.tier, cards.cashback,
                       cards.reward_points, cards.emi, cards.annual_fee, banks.name, cards.bank_id
                FROM cards
                JOIN banks ON cards.bank_id = banks.id
            """)
            all_rows = cur.fetchall()
            cards = [{
                "id": r[0], "network": r[1], "type": r[2], "tier": r[3],
                "cashback": r[4], "rewardPoints": r[5], "emi": bool(r[6]),
                "annualFee": r[7], "bankName": r[8], "bankId": r[9], "fromWallet": False
            } for r in all_rows]

        empty_reason = picker_empty_reason(merchant, category, offers, merchants)
        cur.close()
        if empty_reason:
            return jsonify({
                "usedWallet": used_wallet,
                "amount": amount,
                "merchant": merchant or None,
                "category": category or None,
                "cards": [],
                "emptyReason": empty_reason
            })

        ranked = rank_cards_for_purchase(cards, offers, merchant, category, amount)
        return jsonify({
            "usedWallet": used_wallet,
            "amount": amount,
            "merchant": merchant or None,
            "category": category or None,
            "cards": ranked,
            "emptyReason": None
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------- OFFER WATCHLIST ----------
@app.route('/api/watchlist', methods=['GET'])
def get_watchlist():
    try:
        if not session.get('user_id'):
            return jsonify({"error": "Not logged in"}), 401

        user_id = session['user_id']
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT offers.id FROM offer_watchlist
            JOIN offers ON offers.id = offer_watchlist.offer_id
            WHERE offer_watchlist.user_id = %s
        """, (user_id,))
        ids = [r[0] for r in cur.fetchall()]
        cur.close()
        return jsonify({"offerIds": ids})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/watchlist', methods=['POST'])
def add_watchlist():
    try:
        if not session.get('user_id'):
            return jsonify({"error": "Not logged in"}), 401

        user_id = session['user_id']
        offer_id = request.get_json().get('offerId')
        if not offer_id:
            return jsonify({"success": False, "error": "offerId is required"}), 400

        cur = mysql.connection.cursor()
        cur.execute(
            "INSERT IGNORE INTO offer_watchlist (user_id, offer_id) VALUES (%s, %s)",
            (user_id, offer_id)
        )
        mysql.connection.commit()
        cur.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/watchlist/<int:offer_id>', methods=['DELETE'])
def remove_watchlist(offer_id):
    try:
        if not session.get('user_id'):
            return jsonify({"error": "Not logged in"}), 401

        user_id = session['user_id']
        cur = mysql.connection.cursor()
        cur.execute(
            "DELETE FROM offer_watchlist WHERE user_id = %s AND offer_id = %s",
            (user_id, offer_id)
        )
        mysql.connection.commit()
        cur.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ---------- PROFILE ----------
@app.route('/api/profile', methods=['GET'])
def get_profile():
    try:
        if not session.get('user_id'):
            return jsonify({"error": "Not logged in"}), 401

        user_id = session['user_id']
        cur = mysql.connection.cursor()
        cur.execute(
            "SELECT name, email, phone, nid, phone_verified, nid_verified FROM users WHERE id = %s",
            (user_id,)
        )
        user = cur.fetchone()
        cur.close()
        if not user:
            return jsonify({"error": "Not found"}), 404
        phone_verified = bool(user[4])
        nid_verified = bool(user[5])
        return jsonify({
            "name": user[0],
            "email": user[1],
            "phone": user[2] or '',
            "nid": user[3] or '',
            "phoneVerified": phone_verified,
            "nidVerified": nid_verified,
            "accountVerified": phone_verified and nid_verified
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/profile', methods=['PUT'])
def update_profile():
    try:
        if not session.get('user_id'):
            return jsonify({"error": "Not logged in"}), 401

        user_id = session['user_id']
        data = request.get_json()
        name = data.get('name')
        email = data.get('email')

        if not name or not email:
            return jsonify({"success": False, "error": "Name and email are required"}), 400

        cur = mysql.connection.cursor()
        cur.execute("SELECT id FROM users WHERE email = %s AND id != %s", (email, user_id))
        if cur.fetchone():
            cur.close()
            return jsonify({"success": False, "error": "That email is already in use"}), 409

        cur.execute("UPDATE users SET name = %s, email = %s WHERE id = %s", (name, email, user_id))
        mysql.connection.commit()
        cur.close()

        session['user_name'] = name
        return jsonify({"success": True, "name": name})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


def valid_bd_phone(phone):
    digits = re.sub(r'\D', '', phone or '')
    if digits.startswith('880') and len(digits) == 13:
        digits = digits[3:]
    return bool(re.fullmatch(r'01[3-9]\d{8}', digits)), digits


def valid_bd_nid(nid):
    digits = re.sub(r'\D', '', nid or '')
    return len(digits) in (10, 13, 17), digits


@app.route('/api/profile/verification', methods=['PUT'])
def update_verification():
    try:
        if not session.get('user_id'):
            return jsonify({"error": "Not logged in"}), 401

        user_id = session['user_id']
        data = request.get_json() or {}
        step = (data.get('step') or '').strip().lower()

        cur = mysql.connection.cursor()

        if step == 'phone':
            ok, digits = valid_bd_phone(data.get('phone'))
            if not ok:
                cur.close()
                return jsonify({
                    "success": False,
                    "error": "Enter a valid Bangladeshi mobile number (01XXXXXXXXX)"
                }), 400
            cur.execute(
                "UPDATE users SET phone = %s, phone_verified = 1 WHERE id = %s",
                (digits, user_id)
            )
            mysql.connection.commit()
            cur.close()
            return jsonify({"success": True, "phone": digits, "phoneVerified": True})

        if step == 'nid':
            ok, digits = valid_bd_nid(data.get('nid'))
            if not ok:
                cur.close()
                return jsonify({
                    "success": False,
                    "error": "Enter a valid NID (10, 13, or 17 digits)"
                }), 400
            cur.execute(
                "UPDATE users SET nid = %s, nid_verified = 1 WHERE id = %s",
                (digits, user_id)
            )
            mysql.connection.commit()
            cur.close()
            return jsonify({"success": True, "nid": digits, "nidVerified": True})

        if step == 'confirm':
            cur.execute(
                "SELECT phone, nid, phone_verified, nid_verified FROM users WHERE id = %s",
                (user_id,)
            )
            row = cur.fetchone()
            cur.close()
            if not row or not row[2] or not row[3]:
                return jsonify({
                    "success": False,
                    "error": "Complete phone and NID steps first"
                }), 400
            return jsonify({
                "success": True,
                "accountVerified": True,
                "phone": row[0],
                "nid": row[1]
            })

        cur.close()
        return jsonify({"success": False, "error": "Unknown verification step"}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/profile/password', methods=['PUT'])
def update_password():
    try:
        if not session.get('user_id'):
            return jsonify({"error": "Not logged in"}), 401

        user_id = session['user_id']
        data = request.get_json()
        current_password = data.get('currentPassword')
        new_password = data.get('newPassword')

        cur = mysql.connection.cursor()
        cur.execute("SELECT password_hash FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()

        if not user or not check_password_hash(user[0], current_password):
            cur.close()
            return jsonify({"success": False, "error": "Current password is incorrect"}), 401

        new_hash = generate_password_hash(new_password)
        cur.execute("UPDATE users SET password_hash = %s WHERE id = %s", (new_hash, user_id))
        mysql.connection.commit()
        cur.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ---------- ADMIN AUTH ----------
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    try:
        data = request.get_json()
        email = (data.get('email') or '').strip()
        password = data.get('password') or ''

        if ADMIN_CREDENTIALS.get(email) == password:
            session.permanent = True
            session['is_admin'] = True
            session['admin_email'] = email
            return jsonify({"success": True, "email": email})

        return jsonify({"success": False, "error": "Invalid admin credentials"}), 401
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    session.pop('is_admin', None)
    session.pop('admin_email', None)
    return jsonify({"success": True})


@app.route('/api/admin/session')
def admin_session():
    if session.get('is_admin'):
        return jsonify({"loggedIn": True, "email": session.get('admin_email')})
    return jsonify({"loggedIn": False})


@app.route('/api/admin/stats')
@admin_required
def admin_stats():
    try:
        cur = mysql.connection.cursor()
        counts = {}
        for key, table in [("banks", "banks"), ("cards", "cards"), ("merchants", "merchants"),
                            ("articles", "articles"), ("offers", "offers"), ("users", "users")]:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            counts[key] = cur.fetchone()[0]
        cur.close()
        return jsonify(counts)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------- ADMIN: BANKS CRUD ----------
@app.route('/api/admin/banks', methods=['GET'])
@admin_required
def admin_get_banks():
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT banks.id, banks.name, COUNT(cards.id)
            FROM banks LEFT JOIN cards ON cards.bank_id = banks.id
            GROUP BY banks.id, banks.name ORDER BY banks.name
        """)
        rows = cur.fetchall()
        cur.close()
        return jsonify([{"id": r[0], "name": r[1], "cardCount": r[2]} for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/banks', methods=['POST'])
@admin_required
def admin_add_bank():
    try:
        data = request.get_json()
        bank_id = (data.get('id') or '').strip()
        name = (data.get('name') or '').strip()

        if not bank_id or not name:
            return jsonify({"success": False, "error": "Bank ID and name are required"}), 400

        cur = mysql.connection.cursor()
        cur.execute("SELECT id FROM banks WHERE id = %s", (bank_id,))
        if cur.fetchone():
            cur.close()
            return jsonify({"success": False, "error": "A bank with this ID already exists"}), 409

        cur.execute("INSERT INTO banks (id, name) VALUES (%s, %s)", (bank_id, name))
        mysql.connection.commit()
        cur.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/admin/banks/<bank_id>', methods=['PUT'])
@admin_required
def admin_update_bank(bank_id):
    try:
        data = request.get_json()
        name = (data.get('name') or '').strip()

        if not name:
            return jsonify({"success": False, "error": "Bank name is required"}), 400

        cur = mysql.connection.cursor()
        cur.execute("UPDATE banks SET name = %s WHERE id = %s", (name, bank_id))
        mysql.connection.commit()
        cur.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/admin/banks/<bank_id>', methods=['DELETE'])
@admin_required
def admin_delete_bank(bank_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("DELETE FROM banks WHERE id = %s", (bank_id,))
        mysql.connection.commit()
        cur.close()
        return jsonify({"success": True})
    except MySQLdb.IntegrityError:
        return jsonify({"success": False, "error": "Cannot delete: cards or offers still reference this bank"}), 409
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ---------- ADMIN: CARDS CRUD ----------
@app.route('/api/admin/cards', methods=['GET'])
@admin_required
def admin_get_cards():
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT cards.id, cards.bank_id, banks.name, cards.network, cards.type,
                   cards.tier, cards.cashback, cards.reward_points, cards.emi, cards.annual_fee
            FROM cards JOIN banks ON cards.bank_id = banks.id
            ORDER BY banks.name, cards.id
        """)
        rows = cur.fetchall()
        cur.close()
        result = [{
            "id": r[0], "bankId": r[1], "bankName": r[2], "network": r[3], "type": r[4],
            "tier": r[5], "cashback": r[6], "rewardPoints": r[7], "emi": bool(r[8]), "annualFee": r[9]
        } for r in rows]
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/cards', methods=['POST'])
@admin_required
def admin_add_card():
    try:
        data = request.get_json()
        card_id = (data.get('id') or '').strip()
        bank_id = (data.get('bankId') or '').strip()
        network = (data.get('network') or '').strip()
        card_type = (data.get('type') or '').strip()
        tier = (data.get('tier') or '').strip()
        cashback = (data.get('cashback') or '').strip()
        reward_points = (data.get('rewardPoints') or '').strip()
        emi = bool(data.get('emi'))
        annual_fee = (data.get('annualFee') or '').strip()

        if not card_id or not bank_id:
            return jsonify({"success": False, "error": "Card ID and bank are required"}), 400

        cur = mysql.connection.cursor()
        cur.execute("SELECT id FROM cards WHERE id = %s", (card_id,))
        if cur.fetchone():
            cur.close()
            return jsonify({"success": False, "error": "A card with this ID already exists"}), 409

        cur.execute("""
            INSERT INTO cards (id, bank_id, network, type, tier, cashback, reward_points, emi, annual_fee)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (card_id, bank_id, network, card_type, tier, cashback, reward_points, emi, annual_fee))
        mysql.connection.commit()
        cur.close()
        return jsonify({"success": True})
    except MySQLdb.IntegrityError:
        return jsonify({"success": False, "error": "Selected bank does not exist"}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/admin/cards/<card_id>', methods=['PUT'])
@admin_required
def admin_update_card(card_id):
    try:
        data = request.get_json()
        bank_id = (data.get('bankId') or '').strip()
        network = (data.get('network') or '').strip()
        card_type = (data.get('type') or '').strip()
        tier = (data.get('tier') or '').strip()
        cashback = (data.get('cashback') or '').strip()
        reward_points = (data.get('rewardPoints') or '').strip()
        emi = bool(data.get('emi'))
        annual_fee = (data.get('annualFee') or '').strip()

        cur = mysql.connection.cursor()
        cur.execute("""
            UPDATE cards SET bank_id=%s, network=%s, type=%s, tier=%s, cashback=%s,
                   reward_points=%s, emi=%s, annual_fee=%s WHERE id=%s
        """, (bank_id, network, card_type, tier, cashback, reward_points, emi, annual_fee, card_id))
        mysql.connection.commit()
        cur.close()
        return jsonify({"success": True})
    except MySQLdb.IntegrityError:
        return jsonify({"success": False, "error": "Selected bank does not exist"}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/admin/cards/<card_id>', methods=['DELETE'])
@admin_required
def admin_delete_card(card_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("DELETE FROM cards WHERE id = %s", (card_id,))
        mysql.connection.commit()
        cur.close()
        return jsonify({"success": True})
    except MySQLdb.IntegrityError:
        return jsonify({"success": False, "error": "Cannot delete: some users have saved this card"}), 409
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ---------- ADMIN: MERCHANTS CRUD ----------
@app.route('/api/admin/merchants', methods=['GET'])
@admin_required
def admin_get_merchants():
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT id, name, category, description, address FROM merchants ORDER BY name")
        rows = cur.fetchall()
        cur.close()
        return jsonify([
            {"id": r[0], "name": r[1], "category": r[2], "description": r[3], "address": r[4]}
            for r in rows
        ])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/merchants', methods=['POST'])
@admin_required
def admin_add_merchant():
    try:
        data = request.get_json()
        name = (data.get('name') or '').strip()
        category = (data.get('category') or '').strip()
        description = (data.get('description') or '').strip()
        address = (data.get('address') or '').strip()

        if not name:
            return jsonify({"success": False, "error": "Merchant name is required"}), 400

        cur = mysql.connection.cursor()
        cur.execute(
            "INSERT INTO merchants (name, category, description, address) VALUES (%s, %s, %s, %s)",
            (name, category, description, address)
        )
        mysql.connection.commit()
        cur.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/admin/merchants/<int:merchant_id>', methods=['PUT'])
@admin_required
def admin_update_merchant(merchant_id):
    try:
        data = request.get_json()
        name = (data.get('name') or '').strip()
        category = (data.get('category') or '').strip()
        description = (data.get('description') or '').strip()
        address = (data.get('address') or '').strip()

        if not name:
            return jsonify({"success": False, "error": "Merchant name is required"}), 400

        cur = mysql.connection.cursor()
        cur.execute(
            "UPDATE merchants SET name=%s, category=%s, description=%s, address=%s WHERE id=%s",
            (name, category, description, address, merchant_id)
        )
        mysql.connection.commit()
        cur.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/admin/merchants/<int:merchant_id>', methods=['DELETE'])
@admin_required
def admin_delete_merchant(merchant_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("DELETE FROM merchants WHERE id = %s", (merchant_id,))
        mysql.connection.commit()
        cur.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ---------- ADMIN: ARTICLES CRUD ----------
@app.route('/api/admin/articles', methods=['GET'])
@admin_required
def admin_get_articles():
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT id, title, category, summary, content, read_time FROM articles ORDER BY id")
        rows = cur.fetchall()
        cur.close()
        return jsonify([
            {"id": r[0], "title": r[1], "category": r[2], "summary": r[3], "content": r[4], "readTime": r[5]}
            for r in rows
        ])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/articles', methods=['POST'])
@admin_required
def admin_add_article():
    try:
        data = request.get_json()
        title = (data.get('title') or '').strip()
        category = (data.get('category') or '').strip()
        summary = (data.get('summary') or '').strip()
        content = (data.get('content') or '').strip()
        read_time = (data.get('readTime') or '').strip()

        if not title:
            return jsonify({"success": False, "error": "Article title is required"}), 400

        cur = mysql.connection.cursor()
        cur.execute(
            "INSERT INTO articles (title, category, summary, content, read_time) VALUES (%s, %s, %s, %s, %s)",
            (title, category, summary, content, read_time)
        )
        mysql.connection.commit()
        cur.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/admin/articles/<int:article_id>', methods=['PUT'])
@admin_required
def admin_update_article(article_id):
    try:
        data = request.get_json()
        title = (data.get('title') or '').strip()
        category = (data.get('category') or '').strip()
        summary = (data.get('summary') or '').strip()
        content = (data.get('content') or '').strip()
        read_time = (data.get('readTime') or '').strip()

        if not title:
            return jsonify({"success": False, "error": "Article title is required"}), 400

        cur = mysql.connection.cursor()
        cur.execute(
            "UPDATE articles SET title=%s, category=%s, summary=%s, content=%s, read_time=%s WHERE id=%s",
            (title, category, summary, content, read_time, article_id)
        )
        mysql.connection.commit()
        cur.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/admin/articles/<int:article_id>', methods=['DELETE'])
@admin_required
def admin_delete_article(article_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("DELETE FROM articles WHERE id = %s", (article_id,))
        mysql.connection.commit()
        cur.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ---------- ADMIN: OFFERS CRUD ----------
@app.route('/api/admin/offers', methods=['GET'])
@admin_required
def admin_get_offers():
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT offers.id, offers.merchant, offers.title, offers.description,
                   offers.category, offers.discount, offers.bank_id, banks.name, offers.valid_until,
                   (offers.valid_until < CURDATE()) AS is_expired
            FROM offers JOIN banks ON offers.bank_id = banks.id
            ORDER BY offers.valid_until DESC
        """)
        rows = cur.fetchall()
        cur.close()
        return jsonify([{
            "id": r[0], "merchant": r[1], "title": r[2], "description": r[3],
            "category": r[4], "discount": r[5], "bankId": r[6], "bankName": r[7],
            "validUntil": str(r[8]), "isExpired": bool(r[9])
        } for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/offers', methods=['POST'])
@admin_required
def admin_add_offer():
    try:
        data = request.get_json()
        merchant = (data.get('merchant') or '').strip()
        title = (data.get('title') or '').strip()
        description = (data.get('description') or '').strip()
        category = (data.get('category') or '').strip()
        discount = (data.get('discount') or '').strip()
        bank_id = (data.get('bankId') or '').strip()
        valid_until = (data.get('validUntil') or '').strip()

        if not merchant or not title or not bank_id or not valid_until:
            return jsonify({"success": False, "error": "Merchant, title, bank, and validity date are required"}), 400

        cur = mysql.connection.cursor()
        cur.execute("""
            INSERT INTO offers (merchant, title, description, category, discount, bank_id, valid_until)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (merchant, title, description, category, discount, bank_id, valid_until))
        mysql.connection.commit()
        cur.close()
        return jsonify({"success": True})
    except MySQLdb.IntegrityError:
        return jsonify({"success": False, "error": "Selected bank does not exist"}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/admin/offers/<int:offer_id>', methods=['PUT'])
@admin_required
def admin_update_offer(offer_id):
    try:
        data = request.get_json()
        merchant = (data.get('merchant') or '').strip()
        title = (data.get('title') or '').strip()
        description = (data.get('description') or '').strip()
        category = (data.get('category') or '').strip()
        discount = (data.get('discount') or '').strip()
        bank_id = (data.get('bankId') or '').strip()
        valid_until = (data.get('validUntil') or '').strip()

        if not merchant or not title or not bank_id or not valid_until:
            return jsonify({"success": False, "error": "Merchant, title, bank, and validity date are required"}), 400

        cur = mysql.connection.cursor()
        cur.execute("""
            UPDATE offers SET merchant=%s, title=%s, description=%s, category=%s,
                   discount=%s, bank_id=%s, valid_until=%s WHERE id=%s
        """, (merchant, title, description, category, discount, bank_id, valid_until, offer_id))
        mysql.connection.commit()
        cur.close()
        return jsonify({"success": True})
    except MySQLdb.IntegrityError:
        return jsonify({"success": False, "error": "Selected bank does not exist"}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/admin/offers/<int:offer_id>', methods=['DELETE'])
@admin_required
def admin_delete_offer(offer_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("DELETE FROM offers WHERE id = %s", (offer_id,))
        mysql.connection.commit()
        cur.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    
if __name__ == '__main__':
    app.run(debug=True, port=5000)