"""
db.py
Database connection and row mapping helpers using Python's standard sqlite3 module.
Database file: loans.db
"""

import sqlite3
import os
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "loans.db")

def get_db_connection():
    """Returns a sqlite3 connection with Row factory enabled for dict-like access."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def execute_query(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    """Executes a SELECT query and returns a list of dictionaries."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

def execute_single(query: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
    """Executes a SELECT query expecting a single row, returns dict or None."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        row = cursor.fetchone()
        return dict(row) if row else None

def execute_write(query: str, params: tuple = ()) -> int:
    """Executes an INSERT/UPDATE/DELETE query and returns the lastrowid or rowcount."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        conn.commit()
        return cursor.lastrowid

def execute_many(query: str, params_list: List[tuple]):
    """Executes bulk write operations."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.executemany(query, params_list)
        conn.commit()
