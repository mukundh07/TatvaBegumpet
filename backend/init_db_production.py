import sys
import os

# Add the project root to the path
sys.path.append(os.getcwd())

from backend.database import init_db, get_db
from backend.seed_data import seed

def run_init():
    print("--- Starting Production DB Initialization ---")
    init_db()
    
    conn = get_db()
    try:
        count = conn.execute("SELECT COUNT(*) FROM menu_items").fetchone()[0]
        if count == 0:
            print("Database empty. Seeding data...")
            seed()
            print("Seeding complete.")
        else:
            print(f"Database already contains {count} items.")
    except Exception as e:
        print(f"Error checking/seeding DB: {e}")
    finally:
        conn.close()
    print("--- DB Initialization Finished ---")

if __name__ == "__main__":
    run_init()
