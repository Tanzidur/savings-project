from flask import Flask, jsonify
from flask_mysqldb import MySQL
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = ''
app.config['MYSQL_DB'] = 'savings_db'

mysql = MySQL(app)

@app.route('/api/banks')
def get_banks():
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
                "id": c[0],
                "network": c[1],
                "type": c[2],
                "tier": c[3],
                "cashback": c[4],
                "rewardPoints": c[5],
                "emi": bool(c[6]),
                "annualFee": c[7]
            })

        result.append({"id": bank_id, "name": bank_name, "cards": card_list})

    cur.close()
    return jsonify(result)
@app.route('/api/offers')
def get_offers():
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
            "id": r[0],
            "merchant": r[1],
            "title": r[2],
            "description": r[3],
            "category": r[4],
            "discount": r[5],
            "validUntil": str(r[6]),
            "bankName": r[7]
        })

    return jsonify(result)
@app.route('/api/merchants')
def get_merchants():
    cur = mysql.connection.cursor()
    cur.execute("SELECT id, name, category, description, address FROM merchants")
    rows = cur.fetchall()
    cur.close()

    result = []
    for r in rows:
        result.append({
            "id": r[0],
            "name": r[1],
            "category": r[2],
            "description": r[3],
            "address": r[4]
        })

    return jsonify(result)
@app.route('/api/articles')
def get_articles():
    cur = mysql.connection.cursor()
    cur.execute("SELECT id, title, category, summary, content, read_time FROM articles")
    rows = cur.fetchall()
    cur.close()

    result = []
    for r in rows:
        result.append({
            "id": r[0],
            "title": r[1],
            "category": r[2],
            "summary": r[3],
            "content": r[4],
            "readTime": r[5]
        })

    return jsonify(result)
if __name__ == '__main__':
    app.run(debug=True, port=5000)