"""Tatva – Modern Dining | Flask Backend API"""
import hashlib
import os
from functools import wraps
from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from database import get_db, init_db

# Point the static folder to the frontend directory
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend'))
app = Flask(__name__, static_folder=frontend_dir, static_url_path='')

app.secret_key = 'tatva-modern-dining-secret-key-2024'
CORS(app, supports_credentials=True, origins=["http://localhost:5000", "http://127.0.0.1:5000", "http://localhost:8000", "http://127.0.0.1:8000"])

# ───────── STATIC FILE SERVING ─────────

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/admin')
def serve_admin():
    return send_from_directory(app.static_folder, 'admin.html')

@app.route('/<path:filename>')
def serve_static_files(filename):
    if os.path.exists(os.path.join(app.static_folder, filename)):
        return send_from_directory(app.static_folder, filename)
    return jsonify({"error": "Not Found"}), 404



def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'admin_id' not in session:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated


# ───────── PUBLIC ENDPOINTS ─────────

@app.route('/api/menu', methods=['GET'])
def get_menu():
    conn = get_db()
    items = conn.execute(
        "SELECT * FROM menu_items WHERE is_available = 1 ORDER BY category, sort_order"
    ).fetchall()
    conn.close()

    menu = {}
    for item in items:
        cat = item['category']
        if cat not in menu:
            menu[cat] = []
        menu[cat].append({
            "id": item['id'],
            "name": item['name'],
            "description": item['description'],
            "price": item['price'],
        })

    return jsonify(menu)


@app.route('/api/reservations', methods=['POST'])
def create_reservation():
    data = request.get_json()
    required = ['name', 'phone', 'date', 'time']
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"'{field}' is required"}), 400

    conn = get_db()
    conn.execute(
        """INSERT INTO reservations (name, phone, email, date, time, guests, message)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (data['name'], data['phone'], data.get('email', ''),
         data['date'], data['time'], data.get('guests', 2), data.get('message', ''))
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "Reservation submitted successfully!"}), 201


@app.route('/api/enquiries', methods=['POST'])
def create_enquiry():
    data = request.get_json()
    if not data.get('name') or not data.get('message'):
        return jsonify({"error": "'name' and 'message' are required"}), 400

    conn = get_db()
    conn.execute(
        """INSERT INTO enquiries (name, email, phone, subject, message)
           VALUES (?, ?, ?, ?, ?)""",
        (data['name'], data.get('email', ''), data.get('phone', ''),
         data.get('subject', ''), data['message'])
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "Enquiry submitted!"}), 201


# ───────── ADMIN AUTH ─────────

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.get_json()
    username = data.get('username', '')
    password = data.get('password', '')

    conn = get_db()
    user = conn.execute(
        "SELECT * FROM admin_users WHERE username = ? AND password = ?",
        (username, hash_password(password))
    ).fetchone()
    conn.close()

    if user:
        session['admin_id'] = user['id']
        session['admin_username'] = user['username']
        return jsonify({"success": True, "username": user['username']})
    return jsonify({"error": "Invalid credentials"}), 401


@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    session.clear()
    return jsonify({"success": True})


@app.route('/api/admin/check', methods=['GET'])
def admin_check():
    if 'admin_id' in session:
        return jsonify({"authenticated": True, "username": session['admin_username']})
    return jsonify({"authenticated": False}), 401


# ───────── ADMIN: MENU MANAGEMENT ─────────

@app.route('/api/admin/menu', methods=['GET'])
@login_required
def admin_get_menu():
    conn = get_db()
    items = conn.execute("SELECT * FROM menu_items ORDER BY category, sort_order").fetchall()
    conn.close()
    return jsonify([dict(i) for i in items])


@app.route('/api/admin/menu', methods=['POST'])
@login_required
def admin_add_menu_item():
    data = request.get_json()
    required = ['category', 'name', 'price']
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"'{field}' is required"}), 400

    conn = get_db()
    cursor = conn.execute(
        """INSERT INTO menu_items (category, name, description, price, is_available, sort_order)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (data['category'], data['name'], data.get('description', ''),
         data['price'], data.get('is_available', 1), data.get('sort_order', 0))
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return jsonify({"success": True, "id": new_id}), 201


@app.route('/api/admin/menu/<int:item_id>', methods=['PUT'])
@login_required
def admin_update_menu_item(item_id):
    data = request.get_json()
    conn = get_db()
    conn.execute(
        """UPDATE menu_items SET category=?, name=?, description=?, price=?, is_available=?
           WHERE id=?""",
        (data['category'], data['name'], data.get('description', ''),
         data['price'], data.get('is_available', 1), item_id)
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route('/api/admin/menu/<int:item_id>', methods=['DELETE'])
@login_required
def admin_delete_menu_item(item_id):
    conn = get_db()
    conn.execute("DELETE FROM menu_items WHERE id=?", (item_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


# ───────── ADMIN: RESERVATIONS ─────────

@app.route('/api/admin/reservations', methods=['GET'])
@login_required
def admin_get_reservations():
    conn = get_db()
    rows = conn.execute("SELECT * FROM reservations ORDER BY created_at DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route('/api/admin/reservations/<int:res_id>', methods=['PUT'])
@login_required
def admin_update_reservation(res_id):
    data = request.get_json()
    conn = get_db()
    conn.execute("UPDATE reservations SET status=? WHERE id=?", (data['status'], res_id))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route('/api/admin/reservations/<int:res_id>', methods=['DELETE'])
@login_required
def admin_delete_reservation(res_id):
    conn = get_db()
    conn.execute("DELETE FROM reservations WHERE id=?", (res_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


# ───────── ADMIN: ENQUIRIES ─────────

@app.route('/api/admin/enquiries', methods=['GET'])
@login_required
def admin_get_enquiries():
    conn = get_db()
    rows = conn.execute("SELECT * FROM enquiries ORDER BY created_at DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route('/api/admin/enquiries/<int:enq_id>', methods=['PUT'])
@login_required
def admin_update_enquiry(enq_id):
    data = request.get_json()
    conn = get_db()
    conn.execute("UPDATE enquiries SET status=? WHERE id=?", (data['status'], enq_id))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route('/api/admin/enquiries/<int:enq_id>', methods=['DELETE'])
@login_required
def admin_delete_enquiry(enq_id):
    conn = get_db()
    conn.execute("DELETE FROM enquiries WHERE id=?", (enq_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


if __name__ == '__main__':
    init_db()
    # Run seed if DB is empty
    conn = get_db()
    count = conn.execute("SELECT COUNT(*) FROM menu_items").fetchone()[0]
    conn.close()
    if count == 0:
        from seed_data import seed
        seed()
    
    port = int(os.environ.get('PORT', 5000))
    print(f"Tatva Backend running on port {port}")
    app.run(host='0.0.0.0', port=port)
