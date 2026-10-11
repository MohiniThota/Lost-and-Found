import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "lost_and_found.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Items table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL CHECK(type IN ('found', 'lost')),
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            location TEXT NOT NULL,
            item_date TEXT NOT NULL,
            description TEXT,
            image_filename TEXT,
            poster_name TEXT NOT NULL,
            poster_email TEXT NOT NULL,
            poster_phone TEXT,
            poster_pin TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'claimed', 'returned')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Claims table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS claims (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER NOT NULL,
            claimant_name TEXT NOT NULL,
            claimant_email TEXT NOT NULL,
            claimant_phone TEXT,
            proof_details TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
            response_note TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE
        )
    """)

    conn.commit()

    # Seed initial sample data if items table is empty
    cursor.execute("SELECT COUNT(*) FROM items")
    count = cursor.fetchone()[0]
    if count == 0:
        seed_sample_data(cursor)
        conn.commit()

    conn.close()

def seed_sample_data(cursor):
    sample_items = [
        (
            'found',
            'Black Leather Bifold Wallet',
            'Wallets & Bags',
            'Central Library 2nd Floor, Desk 14',
            datetime.now().strftime("%Y-%m-%d"),
            'Found a black leather wallet containing a transit pass and a student ID. Please claim with name on ID or description of key fob.',
            None,
            'Alex Morgan',
            'alex.finder@example.com',
            '+1 (555) 234-5678',
            '1234',
            'active'
        ),
        (
            'found',
            'Apple AirPods Pro (2nd Gen) in White Case',
            'Electronics',
            'Student Center Cafeteria, Booth 3',
            datetime.now().strftime("%Y-%m-%d"),
            'Found AirPods Pro in a white charging case with a small blue silicone lanyard. Describe serial ending or case scratch to claim.',
            None,
            'Priya Sharma',
            'priya.found@example.com',
            '+1 (555) 345-6789',
            '1234',
            'active'
        ),
        (
            'lost',
            'Silver Honda Car Key with Red Keychain',
            'Keys',
            'North Campus Parking Lot B',
            datetime.now().strftime("%Y-%m-%d"),
            'Lost my car key fob with a red miniature sneaker keychain while walking to the main gate. Urgent, please contact if found!',
            None,
            'David Chen',
            'david.lost@example.com',
            '+1 (555) 987-6543',
            '1234',
            'active'
        ),
        (
            'found',
            'Ray-Ban Aviator Sunglasses in Brown Case',
            'Accessories',
            'Sports Complex, Bleachers near Court 2',
            datetime.now().strftime("%Y-%m-%d"),
            'Classic gold-frame Ray-Ban sunglasses left behind after the evening basketball match.',
            None,
            'Marcus Vance',
            'marcus.sports@example.com',
            '+1 (555) 876-5432',
            '1234',
            'active'
        )
    ]

    cursor.executemany("""
        INSERT INTO items (
            type, title, category, location, item_date, description,
            image_filename, poster_name, poster_email, poster_phone,
            poster_pin, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, sample_items)

def create_item(data):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO items (
            type, title, category, location, item_date, description,
            image_filename, poster_name, poster_email, poster_phone,
            poster_pin, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    """, (
        data['type'],
        data['title'],
        data['category'],
        data['location'],
        data['item_date'],
        data.get('description', ''),
        data.get('image_filename'),
        data['poster_name'],
        data['poster_email'],
        data.get('poster_phone', ''),
        data['poster_pin']
    ))
    item_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return item_id

def get_items(item_type=None, category=None, search=None, status=None):
    conn = get_connection()
    cursor = conn.cursor()

    query = """
        SELECT id, type, title, category, location, item_date, description,
               image_filename, poster_name, status, created_at,
               (SELECT COUNT(*) FROM claims WHERE claims.item_id = items.id) as claim_count
        FROM items
        WHERE 1=1
    """
    params = []

    if item_type and item_type != 'all':
        query += " AND type = ?"
        params.append(item_type)

    if category and category != 'all':
        query += " AND category = ?"
        params.append(category)

    if status and status != 'all':
        query += " AND status = ?"
        params.append(status)

    if search:
        query += " AND (title LIKE ? OR description LIKE ? OR location LIKE ?)"
        wildcard = f"%{search}%"
        params.extend([wildcard, wildcard, wildcard])

    query += " ORDER BY id DESC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_item_by_id(item_id, include_contact=False):
    conn = get_connection()
    cursor = conn.cursor()

    if include_contact:
        cursor.execute("SELECT * FROM items WHERE id = ?", (item_id,))
    else:
        cursor.execute("""
            SELECT id, type, title, category, location, item_date, description,
                   image_filename, poster_name, status, created_at,
                   (SELECT COUNT(*) FROM claims WHERE claims.item_id = items.id) as claim_count
            FROM items WHERE id = ?
        """, (item_id,))

    row = cursor.fetchone()
    conn.close()
    if row:
        res = dict(row)
        # Never leak poster_pin in general queries
        if 'poster_pin' in res and not include_contact:
            del res['poster_pin']
        return res
    return None

def verify_item_pin(item_id, pin):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT poster_pin FROM items WHERE id = ?", (item_id,))
    row = cursor.fetchone()
    conn.close()
    if row and str(row['poster_pin']).strip() == str(pin).strip():
        return True
    return False

def update_item_status(item_id, pin, new_status):
    if not verify_item_pin(item_id, pin):
        return False, "Invalid management PIN"

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE items SET status = ? WHERE id = ?", (new_status, item_id))
    conn.commit()
    conn.close()
    return True, "Status updated successfully"

def delete_item(item_id, pin):
    if not verify_item_pin(item_id, pin):
        return False, "Invalid management PIN"

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM items WHERE id = ?", (item_id,))
    cursor.execute("DELETE FROM claims WHERE item_id = ?", (item_id,))
    conn.commit()
    conn.close()
    return True, "Item deleted successfully"

def create_claim(data):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO claims (
            item_id, claimant_name, claimant_email, claimant_phone, proof_details, status
        ) VALUES (?, ?, ?, ?, ?, 'pending')
    """, (
        data['item_id'],
        data['claimant_name'],
        data['claimant_email'],
        data.get('claimant_phone', ''),
        data['proof_details']
    ))
    claim_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return claim_id

def get_claims_for_item(item_id, pin):
    if not verify_item_pin(item_id, pin):
        return None, "Invalid management PIN"

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM claims WHERE item_id = ? ORDER BY id DESC", (item_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows], None

def update_claim_status(item_id, claim_id, pin, new_status, response_note=""):
    if not verify_item_pin(item_id, pin):
        return False, "Invalid management PIN"

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE claims
        SET status = ?, response_note = ?
        WHERE id = ? AND item_id = ?
    """, (new_status, response_note, claim_id, item_id))

    if new_status == 'approved':
        cursor.execute("UPDATE items SET status = 'claimed' WHERE id = ?", (item_id,))

    conn.commit()
    conn.close()
    return True, "Claim status updated successfully"

def get_claim_details_for_claimant(item_id, claim_id, claimant_email):
    """Allows claimant to check status and receive finder contact info once approved."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM claims
        WHERE id = ? AND item_id = ? AND LOWER(claimant_email) = LOWER(?)
    """, (claim_id, item_id, claimant_email.strip()))
    claim_row = cursor.fetchone()

    if not claim_row:
        conn.close()
        return None, "Claim not found or email does not match"

    claim_data = dict(claim_row)

    # If approved, fetch finder contact info
    if claim_data['status'] == 'approved':
        cursor.execute("SELECT poster_name, poster_email, poster_phone FROM items WHERE id = ?", (item_id,))
        item_row = cursor.fetchone()
        if item_row:
            claim_data['finder_contact'] = dict(item_row)

    conn.close()
    return claim_data, None
