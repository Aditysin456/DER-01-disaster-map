import sqlite3
from datetime import datetime

DB_NAME = "reports.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hazard_type TEXT,
            confidence REAL,
            severity TEXT,
            lat REAL,
            lon REAL,
            timestamp TEXT NOT NULL,
            image_path TEXT,
            source TEXT NOT NULL DEFAULT 'mobile',
            thermal_image_path TEXT,
            humans_detected INTEGER,
            human_count_estimate INTEGER,
            thermal_confidence REAL,
            captured_at TEXT
        )
    """)
    conn.commit()
    conn.close()

def insert_report(hazard_type, confidence, severity, lat, lon, image_path,
                   source="mobile", thermal_image_path=None,
                   humans_detected=None, human_count_estimate=None,
                   thermal_confidence=None, captured_at=None):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    timestamp = datetime.utcnow().isoformat()
    cursor.execute("""
        INSERT INTO reports (
            hazard_type, confidence, severity, lat, lon, timestamp, image_path,
            source, thermal_image_path, humans_detected, human_count_estimate,
            thermal_confidence, captured_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        hazard_type, confidence, severity, lat, lon, timestamp, image_path,
        source, thermal_image_path,
        None if humans_detected is None else int(humans_detected),
        human_count_estimate, thermal_confidence, captured_at
    ))
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
        "timestamp": timestamp,
        "source": source,
        "thermal_image_url": thermal_image_path,
        "humans_detected": humans_detected,
        "human_count_estimate": human_count_estimate,
        "thermal_confidence": thermal_confidence,
        "captured_at": captured_at
    }

def get_all_reports():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, hazard_type, confidence, severity, lat, lon, timestamp,
               source, thermal_image_path AS thermal_image_url,
               humans_detected, human_count_estimate, thermal_confidence, captured_at
        FROM reports ORDER BY id DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    results = []
    for row in rows:
        d = dict(row)
        d["humans_detected"] = None if d["humans_detected"] is None else bool(d["humans_detected"])
        results.append(d)
    return results
