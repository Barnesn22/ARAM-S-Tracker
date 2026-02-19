import sqlite3

DB_NAME = "missions.db"

def get_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS champion_missions (
            champion_name TEXT PRIMARY KEY,
            completed INTEGER NOT NULL DEFAULT 0
        )
    """)
    conn.commit()
    conn.close()
