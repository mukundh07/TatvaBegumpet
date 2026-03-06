"""Tatva – Modern Dining | Flask Backend API"""
import hashlib
import os
from functools import wraps
import traceback
import datetime
import jwt
from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from backend.database import get_db, init_db

# Point the static folder to the frontend directory
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend'))
app = Flask(__name__, static_folder=frontend_dir, static_url_path='')

app.secret_key = os.environ.get('SECRET_KEY', 'tatva-modern-dining-secret-key-2024')

# Cookie configuration for cross-site (Vercel -> Render)
app.config.update(
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_SAMESITE='None',
    SESSION_COOKIE_HTTPONLY=True,
)

# In production, we should specify the exact origins.
allowed_origins = [
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:3000"
]

# Add Vercel URL if provided in environment variables
vercel_url = os.environ.get('VERCEL_URL')
if vercel_url:
    # Clean the URL to avoid double https://
    clean_url = vercel_url.replace('https://', '').replace('http://', '').strip('/')
    allowed_origins.append(f"https://{clean_url}")
    allowed_origins.append(f"http://{clean_url}")
    allowed_origins.append(clean_url)

# Self-healing Database Initialization
def ensure_db_initialized():
    print("--- Checking Database Integrity ---")
    try:
        from backend.database import init_db, get_db
        init_db() # Create tables if they don't exist
        conn = get_db()
        # Check if we need to seed
        count = conn.execute("SELECT COUNT(*) FROM menu_items").fetchone()[0]
        if count == 0:
            print("DB empty, seeding...")
            from backend.seed_data import seed
            seed()
        print(f"DB check complete. Found {count} items.")
        conn.close()
    except Exception as e:
        print(f"DB Integrity Check FAILED: {e}")
        import traceback
        traceback.print_exc()

ensure_db_initialized()

CORS(app, supports_credentials=True, origins=allowed_origins, allow_headers=["Content-Type", "Authorization"])

@app.route('/api/debug/db')
def debug_db():
    from backend.database import DB_PATH
    info = {
        "db_path": DB_PATH,
        "exists": os.path.exists(DB_PATH),
        "cwd": os.getcwd(),
        "tables": []
    }
    if info["exists"]:
        try:
            conn = get_db()
            tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
            info["tables"] = [row[0] for row in tables]
            conn.close()
        except Exception as e:
            info["error"] = str(e)
    return jsonify(info)

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
        print(f"--- Auth Check for {request.path} ---")
        print(f"Headers: {dict(request.headers)}")
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({"error": "Token is missing"}), 401
        
        try:
            data = jwt.decode(token, app.secret_key, algorithms=["HS256"])
            # You can attach the admin data to the request if needed
            request.admin_id = data['admin_id']
        except Exception as e:
            return jsonify({"error": "Invalid token"}), 401
            
        return f(*args, **kwargs)
    return decorated


@app.errorhandler(500)
def handle_500_error(e):
    # Log the full traceback to the server console (Render logs)
    print("SERIOUS SERVER ERROR: 500")
    import traceback
    traceback.print_exc()
    return jsonify({"error": "Internal Server Error", "details": str(e)}), 500
    # Return the traceback in the response for direct debugging
    return jsonify({
        "error": "Internal Server Error",
        "details": str(e),
        "traceback": traceback.format_exc()
    }), 500


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
        # Generate JWT Token (valid for 1 day)
        token = jwt.encode({
            'admin_id': user['id'],
            'username': user['username'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1)
        }, app.secret_key, algorithm="HS256")
        
        # Ensure token is a string (PyJWT < 2.0 returns bytes)
        if isinstance(token, bytes):
            token = token.decode('utf-8')
        
        return jsonify({
            "success": True, 
            "username": user['username'],
            "token": token
        })
    return jsonify({"error": "Invalid credentials"}), 401


@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    # Token-based logout usually handled by deleting on frontend
    return jsonify({"success": True})


@app.route('/api/admin/check', methods=['GET'])
def admin_check():
    # For token auth, the frontend just checks if a token exists in localStorage,
    # but we can provide an endpoint to verify the token validity
    token = None
    if 'Authorization' in request.headers:
        auth_header = request.headers['Authorization']
        if auth_header.startswith('Bearer '):
            token = auth_header.split(" ")[1]
            
    if not token:
        return jsonify({"authenticated": False}), 401
        
    try:
        data = jwt.decode(token, app.secret_key, algorithms=["HS256"])
        return jsonify({"authenticated": True, "username": data['username']})
    except:
        return jsonify({"authenticated": False}), 401


@app.route('/api/admin/update-credentials', methods=['POST'])
@login_required
def admin_update_credentials():
    data = request.get_json()
    current_password = data.get('current_password', '')
    new_username = data.get('new_username', '')
    new_password = data.get('new_password', '')

    if not current_password or not new_username or not new_password:
        return jsonify({"error": "All fields are required"}), 400

    conn = get_db()
    # Verify current password
    user = conn.execute(
        "SELECT * FROM admin_users WHERE id = ? AND password = ?",
        (request.admin_id, hash_password(current_password))
    ).fetchone()

    if not user:
        conn.close()
        return jsonify({"error": "Incorrect current password"}), 401

    try:
        conn.execute(
            "UPDATE admin_users SET username = ?, password = ? WHERE id = ?",
            (new_username, hash_password(new_password), request.admin_id)
        )
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Credentials updated successfully. Please log in again."})
    except Exception as e:
        conn.close()
        return jsonify({"error": f"Failed to update credentials: {str(e)}"}), 500


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
    port = int(os.environ.get('PORT', 5000))
    print(f"Tatva Backend running on port {port}")
    app.run(host='0.0.0.0', port=port)
