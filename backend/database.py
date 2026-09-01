import sqlite3
from datetime import datetime

DB_NAME = "reports.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hazard_type TEXT NOT NULL,
            confidence REAL NOT NULL,
            severity TEXT NOT NULL,
            lat REAL NOT NULL,
            lon REAL NOT NULL,
            timestamp TEXT NOT NULL,
            image_path TEXT
        )
    """)
    conn.commit()
    conn.close()

def insert_report(hazard_type, confidence, severity, lat, lon, image_path):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    timestamp = datetime.utcnow().isoformat()
    cursor.execute("""
        INSERT INTO reports (hazard_type, confidence, severity, lat, lon, timestamp, image_path)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (hazard_type, confidence, severity, lat, lon, timestamp, image_path))
    conn.commit()
    report_id = cursor.lastrowid
    conn.close()
    return {
        "id": report_id,
        "hazard_type": hazard_type,
        "confidence": confidence,
        "severity": severity,
        "lat": lat,
        "lon": lon,
        "timestamp": timestamp
    }

def get_all_reports():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT id, hazard_type, confidence, severity, lat, lon, timestamp FROM reports ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]
