"""
migrate_and_seed.py
Idempotent DB migration and seeding script.
Creates tables: applications, loan_products, status_history, notifications.
Seeds initial 5 loan products and ~100 sample applications if empty.
"""

import sqlite3
import random
from db import get_db_connection, DB_PATH

def migrate():
    print(f"Running database migration on {DB_PATH}...")
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Create loan_products table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS loan_products (
        loan_type TEXT PRIMARY KEY,
        interest_rate REAL NOT NULL,
        min_income REAL NOT NULL,
        max_tenure_months INTEGER NOT NULL
    );
    """)

    # 2. Create applications table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS applications (
        app_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        employment_type TEXT NOT NULL,
        monthly_income REAL NOT NULL,
        loan_type TEXT NOT NULL,
        loan_amount REAL NOT NULL,
        tenure_months INTEGER NOT NULL,
        existing_emi REAL NOT NULL,
        credit_score INTEGER NOT NULL,
        
        -- Pipeline / F2/F3 fields
        eligibility_status TEXT,
        eligibility_reasons TEXT,
        emi_amount REAL,
        emi_ratio REAL,
        recommendation TEXT,
        
        -- F5 fields
        explanation_text TEXT,
        priority_rank INTEGER,
        last_notified_status TEXT,
        gap_to_approval TEXT,
        suggestions_json TEXT,
        priority_score REAL,
        is_recoverable INTEGER DEFAULT 0
    );
    """)

    # Add missing columns if applications table existed previously without F5 columns (idempotent check)
    existing_cols = [row[1] for row in cursor.execute("PRAGMA table_info(applications);").fetchall()]
    new_cols = {
        "suggestions_json": "TEXT",
        "priority_score": "REAL",
        "is_recoverable": "INTEGER DEFAULT 0"
    }
    for col, col_type in new_cols.items():
        if col not in existing_cols:
            cursor.execute(f"ALTER TABLE applications ADD COLUMN {col} {col_type};")
            print(f"Added column {col} to applications table.")

    # 3. Create status_history table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS status_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_id INTEGER NOT NULL,
        old_status TEXT,
        new_status TEXT NOT NULL,
        changed_by TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (app_id) REFERENCES applications(app_id)
    );
    """)

    # 4. Create notifications table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_id INTEGER NOT NULL,
        channel TEXT NOT NULL,
        message TEXT NOT NULL,
        sent_at TEXT NOT NULL,
        delivery_status TEXT NOT NULL,
        FOREIGN KEY (app_id) REFERENCES applications(app_id)
    );
    """)

    conn.commit()
    conn.close()
    print("Migration completed successfully.")

def seed():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Seed Loan Products if empty
    cursor.execute("SELECT COUNT(*) FROM loan_products;")
    if cursor.fetchone()[0] == 0:
        print("Seeding loan products...")
        products = [
            ("Personal Loan", 12.0, 25000.0, 60),
            ("Home Loan", 8.5, 40000.0, 360),
            ("Auto Loan", 9.5, 30000.0, 84),
            ("Education Loan", 10.0, 20000.0, 120),
            ("Business Loan", 14.0, 50000.0, 60),
        ]
        cursor.executemany(
            "INSERT INTO loan_products (loan_type, interest_rate, min_income, max_tenure_months) VALUES (?, ?, ?, ?);",
            products
        )
        conn.commit()
        print(f"Seeded {len(products)} loan products.")

    # Seed Applications if empty
    cursor.execute("SELECT COUNT(*) FROM applications;")
    app_count = cursor.fetchone()[0]
    if app_count < 10:
        print("Seeding ~100 applications...")
        random.seed(42) # Deterministic random generation for consistent test dataset

        first_names = ["Aarav", "Ananya", "Rohan", "Priya", "Vikram", "Neha", "Rahul", "Sneha", "Aditya", "Pooja",
                       "Karan", "Divya", "Siddharth", "Kavya", "Amit", "Meera", "Suresh", "Anita", "Rajesh", "Sunita",
                       "Deepak", "Ritu", "Manish", "Swati", "Sanjay", "Shweta", "Nikhil", "Preeti", "Varun", "Isha"]
        last_names = ["Sharma", "Verma", "Gupta", "Patel", "Mehta", "Singh", "Kumar", "Reddy", "Joshi", "Rao",
                      "Nair", "Deshmukh", "Iyer", "Banerjee", "Chatterjee", "Kulkarni", "Aggarwal", "Bhasin", "Kapoor", "Chawla"]

        employment_types = ["Salaried", "Self-Employed", "Business"]
        loan_types_list = ["Personal Loan", "Home Loan", "Auto Loan", "Education Loan", "Business Loan"]

        applications_to_seed = []

        # We generate a mix: ~35 Strong (Approve), ~35 Borderline (Review), ~30 Weak (Reject)
        for i in range(1, 101):
            name = f"{random.choice(first_names)} {random.choice(last_names)}"
            
            # Tier category generation logic
            category = i % 3  # 0: Strong, 1: Borderline, 2: Weak/Reject
            
            if category == 0:  # Strong Approve
                age = random.randint(25, 50)
                emp = random.choice(["Salaried", "Self-Employed"])
                income = random.randint(60000, 200000)
                ltype = random.choice(loan_types_list)
                lamount = random.randint(200000, 1500000)
                tenure = random.choice([24, 36, 48, 60, 120])
                existing_emi = random.randint(0, 10000)
                credit_score = random.randint(720, 820)
            elif category == 1:  # Borderline Review
                age = random.randint(23, 58)
                emp = random.choice(employment_types)
                income = random.randint(35000, 80000)
                ltype = random.choice(loan_types_list)
                lamount = random.randint(300000, 2500000)
                tenure = random.choice([12, 24, 36, 48])
                existing_emi = random.randint(5000, 20000)
                credit_score = random.randint(640, 710)
            else:  # Weak Reject (some recoverable by reducing loan, some age/credit unrecoverable)
                if i % 2 == 0:  # EMI ratio high (recoverable)
                    age = random.randint(25, 55)
                    emp = random.choice(employment_types)
                    income = random.randint(25000, 50000)
                    ltype = "Personal Loan"
                    lamount = random.randint(800000, 2000000) # High loan relative to income
                    tenure = 24
                    existing_emi = random.randint(10000, 20000)
                    credit_score = random.randint(650, 750)
                else:  # Hard failure or low credit score
                    age = random.choice([19, 63, random.randint(25, 50)]) # Some underage/overage
                    emp = random.choice(["Salaried", "Freelancer", "Business"]) # Some invalid employment if Freelancer
                    income = random.randint(15000, 30000)
                    ltype = random.choice(loan_types_list)
                    lamount = random.randint(300000, 1000000)
                    tenure = 36
                    existing_emi = random.randint(0, 15000)
                    credit_score = random.randint(520, 640)

            applications_to_seed.append((
                name, age, emp, float(income), ltype, float(lamount), tenure, float(existing_emi), credit_score
            ))

        cursor.executemany("""
        INSERT INTO applications (name, age, employment_type, monthly_income, loan_type, loan_amount, tenure_months, existing_emi, credit_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, applications_to_seed)

        conn.commit()
        print(f"Seeded {len(applications_to_seed)} applications.")

    conn.close()

if __name__ == "__main__":
    migrate()
    seed()
