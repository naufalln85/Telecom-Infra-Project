# app/db/result_service.py
import sqlite3
import json
from datetime import datetime, timezone

DB_PATH = "/home/dino4/ai-serving/data/inference_results.db"


def init_db():
    import os
    os.makedirs("/home/dino4/ai-serving/data", exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS inference_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            model_id TEXT,
            success INTEGER,
            input_shape TEXT,
            prediction TEXT,
            message TEXT,
            timestamp TEXT
        )
    """)
    conn.commit()
    conn.close()


def save_result(model_id, result: dict):
    init_db()
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        INSERT INTO inference_results (model_id, success, input_shape, prediction, message, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            model_id,
            1 if result.get("success") else 0,
            json.dumps(result.get("input_shape")),
            json.dumps(result.get("prediction")),
            result.get("message"),
            datetime.now(timezone.utc).isoformat(),
        ),
    )
    conn.commit()
    conn.close()


def get_all_results(limit=50):
    init_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT * FROM inference_results ORDER BY id DESC LIMIT ?", (limit,)
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]
