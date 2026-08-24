import os
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
                   (offers.valid_until < CURDATE()) AS is_expired
            FROM offers
            JOIN banks ON offers.bank_id = banks.id
        """)
        rows = cur.fetchall()
        cur.close()

        result = [{
            "id": r[0], "merchant": r[1], "title": r[2], "description": r[3],
            "category": r[4], "discount": r[5], "validUntil": str(r[6]), "bankName": r[7],
            "isExpired": bool(r[8])
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
        cur.execute("SELECT id, category, amount, transaction_date, offer_title, description FROM transactions WHERE user_id = %s ORDER BY transaction_date", (user_id,))
        rows = cur.fetchall()
        cur.close()

        transactions = [{"id": r[0], "category": r[1], "amount": float(r[2]), "date": str(r[3]), "offerTitle": r[4], "description": r[5]} for r in rows]

        return jsonify({"name": session.get('user_name'), "transactions": transactions})
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
                   cards.reward_points, cards.emi, cards.annual_fee, banks.name
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
            "annualFee": r[7], "bankName": r[8]
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
        category = data.get('category')
        amount = data.get('amount')
        offer_title = data.get('offerTitle')

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
            "INSERT INTO transactions (user_id, category, amount, transaction_date, offer_title, description) VALUES (%s, %s, %s, CURDATE(), %s, %s)",
            (user_id, category, amount, offer_title, offer_title)
        )
        mysql.connection.commit()
        cur.close()
        return jsonify({"success": True})
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


# ---------- PROFILE ----------
@app.route('/api/profile', methods=['GET'])
def get_profile():
    try:
        if not session.get('user_id'):
            return jsonify({"error": "Not logged in"}), 401

        user_id = session['user_id']
        cur = mysql.connection.cursor()
        cur.execute("SELECT name, email FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()
        cur.close()
        return jsonify({"name": user[0], "email": user[1]})
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