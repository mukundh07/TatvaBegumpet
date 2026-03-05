"""Seed the database with Tatva Begumpet menu items and default admin user."""
import hashlib
from database import get_db, init_db

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def seed():
    init_db()
    conn = get_db()
    cursor = conn.cursor()

    # --- Default admin user ---
    cursor.execute("SELECT COUNT(*) FROM admin_users")
    if cursor.fetchone()[0] == 0:
        cursor.execute(
            "INSERT INTO admin_users (username, password) VALUES (?, ?)",
            ("admin", hash_password("tatva2024"))
        )
        print("Admin user created: admin / tatva2024")

    # --- Menu Items ---
    cursor.execute("SELECT COUNT(*) FROM menu_items")
    if cursor.fetchone()[0] > 0:
        print("Menu already seeded. Skipping.")
        conn.close()
        return

    menu = [
        # Starters & Appetizers
        ("Starters & Appetizers", "Manchurian", "Oriental veg dumplings in a soy-based sauce", 499),
        ("Starters & Appetizers", "Veg Spring Rolls", "Homemade mixed veg and cottage cheese spring rolls with hot garlic sauce", 499),
        ("Starters & Appetizers", "Crispy Corn Kernels", "Sweet corn with a burst of crunch and flavour", 525),
        ("Starters & Appetizers", "Special Thai Shashlik Paneer", "Jardinieres of paneer served with Thai sauce", 499),
        ("Starters & Appetizers", "Sweet & Spicy Water Chestnut", "Deep-fried water chestnuts in sweet and spicy sauce", 525),
        ("Starters & Appetizers", "Kung Pao Lotus Stem", "Chef Special — crisply fried lotus stem tossed in spicy soy-based sauce with crushed peanuts", 525),
        ("Starters & Appetizers", "Hara Bhara Kebab", "Spinach and green peas kebab with aromatic spices", 575),
        ("Starters & Appetizers", "Jalapeno Poppers", "Crispy jalapeno bites with creamy cheese filling", 599),
        ("Starters & Appetizers", "Paneer Tikka", "Tandoor-grilled paneer marinated in spiced yoghurt", 549),

        # Main Course
        ("Main Course", "Dal Makhani", "Lentils slow-cooked overnight with pureed tomatoes, cream, and butter", 499),
        ("Main Course", "Dal Tadka", "Yellow dal with aromatic tempering", 399),
        ("Main Course", "Paneer Tikka Masala", "Tandoor-cooked paneer in a thick tomato and cream-based gravy", 549),
        ("Main Course", "Palak Paneer", "Paneer cooked in a thick gravy of pureed spinach", 549),
        ("Main Course", "Kadai Paneer", "Paneer cooked with bell peppers in a kadai-style masala", 549),
        ("Main Course", "Malai Paneer Kofta", "Deep-fried cottage cheese dumplings in a cashew-based thick gravy", 549),
        ("Main Course", "Methi Chaman Bahar", "Paneer cooked with fenugreek leaves and spinach", 549),
        ("Main Course", "Mushroom Masala", "Button mushrooms in a tomato and onion-based gravy", 549),
        ("Main Course", "Lahsooni Palak", "Indian-flavoured wilted spinach spiked with garlic", 449),
        ("Main Course", "Veg Chatpata", "Semi-dry preparation of mixed vegetables with tangy spices", 499),
        ("Main Course", "Tarkari Koftey", "Vegetable kofta with dry fruits and paneer in spicy tomato cashew gravy", 625),

        # Rice & Biryani
        ("Rice & Biryani", "Veg Biryani", "Authentic Hyderabadi biryani with seasonal vegetables", 499),
        ("Rice & Biryani", "Veg Pulao", "Seasonal vegetables and Indian spices cooked in steamed basmati rice", 425),
        ("Rice & Biryani", "Jeera Rice", "Basmati rice with tempered jeera and fried onions", 349),
        ("Rice & Biryani", "Curd Rice", "Comforting curd rice with tempering", 300),

        # Breads
        ("Breads", "Plain Naan", "Classic tandoor-baked naan", 80),
        ("Breads", "Butter Tandoori Roti", "Whole wheat roti from the tandoor with butter", 100),
        ("Breads", "Plain Kulcha", "Soft refined flour bread from the tandoor", 100),
        ("Breads", "Lachcha Paratha", "Layered flaky paratha", 130),
        ("Breads", "Onion Kulcha", "Kulcha stuffed with spiced onion filling", 130),
        ("Breads", "Aloo Paratha", "Paratha stuffed with spiced potato filling", 130),
        ("Breads", "Mix Veg Kulcha", "Kulcha stuffed with mixed vegetables", 130),
        ("Breads", "Olive Naan", "Naan with olive and herb topping", 150),
        ("Breads", "Warqi Paratha", "Flaky layered paratha with a crisp finish", 150),
        ("Breads", "Cheese Chilli Naan", "Naan stuffed with chilli cheese", 150),

        # Chinese & Oriental
        ("Chinese & Oriental", "Mix Veg Manchurian Gravy", "Vegetable dumplings in a thick Manchurian gravy", 450),
        ("Chinese & Oriental", "Exotic Veg Szechuan Style", "Mixed exotic vegetables in a fiery Szechuan sauce", 525),
        ("Chinese & Oriental", "Veg Hakka Noodles", "Stir-fried noodles with vegetables and soy sauce", 425),
        ("Chinese & Oriental", "Fried Rice", "Wok-tossed rice with vegetables and oriental seasonings", 399),

        # Pizza & Continental
        ("Pizza & Continental", "Tandoori Paneer Tikka Pizza", "12-inch pizza with tandoori paneer tikka topping", 575),
        ("Pizza & Continental", "Quesadillas", "Mexican-style grilled tortilla with cheese and veggie filling", 500),
        ("Pizza & Continental", "Garlic Bread", "Toasted bread with garlic butter and herbs", 300),

        # Soups & Salads
        ("Soups & Salads", "Carrot Orange & Ginger Soup", "A refreshing blend of carrot, orange, and ginger", 250),
        ("Soups & Salads", "Tomato Basil Soup", "Classic tomato soup with fresh basil", 250),
        ("Soups & Salads", "Sweet Corn Soup", "Creamy sweet corn soup", 250),
        ("Soups & Salads", "Garden Fresh Salad", "Seasonal greens with house dressing", 275),

        # Desserts
        ("Desserts", "New York Cheesecake", "Classic creamy New York-style cheesecake", 400),
        ("Desserts", "Hazelnut Gateaux", "Rich hazelnut chocolate gateaux", 425),
        ("Desserts", "Tender Coconut Panna Cotta", "Silken Italian panna cotta with fresh tender coconut", 375),
        ("Desserts", "Gulab Jamun", "Soft milk dumplings soaked in rose-scented sugar syrup", 250),
        ("Desserts", "Brownie with Ice Cream", "Warm chocolate brownie served with vanilla ice cream", 375),
    ]

    for i, (category, name, description, price) in enumerate(menu):
        cursor.execute(
            "INSERT INTO menu_items (category, name, description, price, sort_order) VALUES (?, ?, ?, ?, ?)",
            (category, name, description, price, i)
        )

    conn.commit()
    conn.close()
    print(f"Seeded {len(menu)} menu items.")

if __name__ == '__main__':
    seed()
