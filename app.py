from flask import Flask, jsonify, request, session, send_from_directory
from flask_mysqldb import MySQL
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)

app.secret_key = 'savings-dev-secret-key'
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False
app.config['PERMANENT_SESSION_LIFETIME'] = 86400  # 24 hours

# Frontend and API are served from the same origin (Flask serves everything),
# so CORS just needs to allow credentials through.
CORS(app, supports_credentials=True)

app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = ''
app.config['MYSQL_DB'] = 'savings_db'

mysql = MySQL(app)


# ---------- SERVE FRONTEND ----------
@app.route('/')
def home():
    return send_from_directory('.', 'index.html')


@app.route('/<path:path>')
def serve_file(path):
    try:
        return send_from_directory('.', path)
    except Exception:
        return jsonify({"error": "File not found"}), 404


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

            card_list = []
            for c in cards:
                card_list.append({
                    "id": c[0], "network": c[1], "type": c[2], "tier": c[3],
                    "cashback": c[4], "rewardPoints": c[5], "emi": bool(c[6]), "annualFee": c[7]
                })

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
                   offers.category, offers.discount, offers.valid_until, banks.name
            FROM offers
            JOIN banks ON offers.bank_id = banks.id
        """)
        rows = cur.fetchall()
        cur.close()

        result = []
        for r in rows:
            result.append({
                "id": r[0], "merchant": r[1], "title": r[2], "description": r[3],
                "category": r[4], "discount": r[5], "validUntil": str(r[6]), "bankName": r[7]
            })

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

        result = []
        for r in rows:
            result.append({
                "id": r[0], "name": r[1], "category": r[2], "description": r[3], "address": r[4]
            })

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

        result = []
        for r in rows:
            result.append({
                "id": r[0], "title": r[1], "category": r[2], "summary": r[3],
                "content": r[4], "readTime": r[5]
            })

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


@app.route('/api/dashboard')
def get_dashboard():
    try:
        if not session.get('user_id'):
            return jsonify({"error": "Not logged in"}), 401

        user_id = session['user_id']
        cur = mysql.connection.cursor()
        cur.execute("SELECT category, amount, transaction_date FROM transactions WHERE user_id = %s ORDER BY transaction_date", (user_id,))
        rows = cur.fetchall()
        cur.close()

        transactions = [{"category": r[0], "amount": float(r[1]), "date": str(r[2])} for r in rows]

        return jsonify({
            "name": session.get('user_name'),
            "transactions": transactions
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


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

        result = []
        for r in rows:
            result.append({
                "id": r[0], "network": r[1], "type": r[2], "tier": r[3],
                "cashback": r[4], "rewardPoints": r[5], "emi": bool(r[6]),
                "annualFee": r[7], "bankName": r[8]
            })
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


if __name__ == '__main__':
    app.run(debug=True, port=5000)