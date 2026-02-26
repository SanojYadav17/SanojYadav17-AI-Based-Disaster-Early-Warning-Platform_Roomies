"""
Database models and connection layer.
Uses SQLite for portability, easily swappable to PostgreSQL/MongoDB.
"""

import sqlite3
import os
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "disaster_warnings.db")


def get_db():
    """Get database connection."""
    db_path = os.path.abspath(DB_PATH)
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    """Initialize all database tables."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS regions (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            elevation REAL,
            flood_prone BOOLEAN DEFAULT 0,
            cyclone_prone BOOLEAN DEFAULT 0,
            earthquake_zone INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS weather_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            region_id TEXT NOT NULL,
            timestamp TIMESTAMP NOT NULL,
            temperature_c REAL,
            rainfall_mm REAL,
            humidity_pct REAL,
            wind_speed_kmh REAL,
            pressure_hpa REAL,
            river_level_m REAL,
            seismic_signal REAL,
            rainfall_gauge_mm REAL,
            source TEXT DEFAULT 'api',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (region_id) REFERENCES regions(id)
        );

        CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            region_id TEXT NOT NULL,
            timestamp TIMESTAMP NOT NULL,
            disaster_type TEXT,
            risk_probability REAL,
            risk_score INTEGER,
            risk_level TEXT,
            recommended_action TEXT,
            model_version TEXT,
            explanation_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (region_id) REFERENCES regions(id)
        );

        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prediction_id INTEGER,
            region_id TEXT NOT NULL,
            alert_type TEXT NOT NULL,
            severity TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT,
            recommended_action TEXT,
            status TEXT DEFAULT 'active',
            delivered_channels TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            resolved_at TIMESTAMP,
            FOREIGN KEY (prediction_id) REFERENCES predictions(id),
            FOREIGN KEY (region_id) REFERENCES regions(id)
        );

        CREATE TABLE IF NOT EXISTS model_versions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version TEXT NOT NULL,
            model_type TEXT NOT NULL,
            accuracy REAL,
            roc_auc REAL,
            precision_score REAL,
            recall REAL,
            f1 REAL,
            training_samples INTEGER,
            file_path TEXT,
            is_active BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS processed_features (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            region_id TEXT NOT NULL,
            timestamp TIMESTAMP NOT NULL,
            feature_json TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (region_id) REFERENCES regions(id)
        );

        CREATE INDEX IF NOT EXISTS idx_weather_region_ts ON weather_data(region_id, timestamp);
        CREATE INDEX IF NOT EXISTS idx_predictions_region_ts ON predictions(region_id, timestamp);
        CREATE INDEX IF NOT EXISTS idx_alerts_region ON alerts(region_id, status);
        CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);
    """)

    conn.commit()
    conn.close()
    print("[OK] Database initialized successfully.")


# ─── CRUD Operations ────────────────────────────────────────────

class RegionDAO:
    @staticmethod
    def insert_many(regions):
        conn = get_db()
        for r in regions:
            conn.execute(
                "INSERT OR REPLACE INTO regions (id, name, latitude, longitude, elevation, flood_prone, cyclone_prone, earthquake_zone) VALUES (?,?,?,?,?,?,?,?)",
                (r["id"], r["name"], r["lat"], r["lon"], r.get("elevation", 0),
                 r.get("flood_prone", False), r.get("cyclone_prone", False), r.get("earthquake_zone", 1))
            )
        conn.commit()
        conn.close()

    @staticmethod
    def get_all():
        conn = get_db()
        rows = conn.execute("SELECT * FROM regions").fetchall()
        conn.close()
        return [dict(r) for r in rows]


class WeatherDAO:
    @staticmethod
    def insert(data):
        conn = get_db()
        conn.execute(
            """INSERT INTO weather_data (region_id, timestamp, temperature_c, rainfall_mm, humidity_pct,
               wind_speed_kmh, pressure_hpa, river_level_m, seismic_signal, rainfall_gauge_mm, source)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (data["region_id"], data["timestamp"], data.get("temperature_c"),
             data.get("rainfall_mm"), data.get("humidity_pct"), data.get("wind_speed_kmh"),
             data.get("pressure_hpa"), data.get("river_level_m"), data.get("seismic_signal"),
             data.get("rainfall_gauge_mm"), data.get("source", "api"))
        )
        conn.commit()
        conn.close()

    @staticmethod
    def insert_bulk(records):
        conn = get_db()
        for data in records:
            conn.execute(
                """INSERT INTO weather_data (region_id, timestamp, temperature_c, rainfall_mm, humidity_pct,
                   wind_speed_kmh, pressure_hpa, river_level_m, seismic_signal, rainfall_gauge_mm, source)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                (data["region_id"], data["timestamp"], data.get("temperature_c"),
                 data.get("rainfall_mm"), data.get("humidity_pct"), data.get("wind_speed_kmh"),
                 data.get("pressure_hpa"), data.get("river_level_m"), data.get("seismic_signal"),
                 data.get("rainfall_gauge_mm"), data.get("source", "ingestion"))
            )
        conn.commit()
        conn.close()

    @staticmethod
    def get_latest_by_region(region_id, limit=100):
        conn = get_db()
        rows = conn.execute(
            "SELECT * FROM weather_data WHERE region_id=? ORDER BY timestamp DESC LIMIT ?",
            (region_id, limit)
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]


class PredictionDAO:
    @staticmethod
    def insert(data):
        conn = get_db()
        cursor = conn.execute(
            """INSERT INTO predictions (region_id, timestamp, disaster_type, risk_probability,
               risk_score, risk_level, recommended_action, model_version, explanation_json)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (data["region_id"], data["timestamp"], data["disaster_type"],
             data["risk_probability"], data["risk_score"], data["risk_level"],
             data["recommended_action"], data.get("model_version", "v1.0"),
             json.dumps(data.get("explanation", {})))
        )
        prediction_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return prediction_id

    @staticmethod
    def get_latest_by_region(region_id, limit=10):
        conn = get_db()
        rows = conn.execute(
            "SELECT * FROM predictions WHERE region_id=? ORDER BY timestamp DESC LIMIT ?",
            (region_id, limit)
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]

    @staticmethod
    def get_all_latest(limit=50):
        conn = get_db()
        rows = conn.execute(
            "SELECT * FROM predictions ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]


class AlertDAO:
    @staticmethod
    def insert(data):
        conn = get_db()
        cursor = conn.execute(
            """INSERT INTO alerts (prediction_id, region_id, alert_type, severity, title, message,
               recommended_action, status, delivered_channels)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (data.get("prediction_id"), data["region_id"], data["alert_type"],
             data["severity"], data["title"], data.get("message", ""),
             data.get("recommended_action", ""), data.get("status", "active"),
             data.get("delivered_channels", "web"))
        )
        alert_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return alert_id

    @staticmethod
    def get_active(limit=50):
        conn = get_db()
        rows = conn.execute(
            "SELECT * FROM alerts WHERE status='active' ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]

    @staticmethod
    def get_history(region_id=None, limit=100):
        conn = get_db()
        if region_id:
            rows = conn.execute(
                "SELECT * FROM alerts WHERE region_id=? ORDER BY created_at DESC LIMIT ?",
                (region_id, limit)
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM alerts ORDER BY created_at DESC LIMIT ?", (limit,)
            ).fetchall()
        conn.close()
        return [dict(r) for r in rows]

    @staticmethod
    def resolve(alert_id):
        conn = get_db()
        conn.execute(
            "UPDATE alerts SET status='resolved', resolved_at=? WHERE id=?",
            (datetime.utcnow().isoformat(), alert_id)
        )
        conn.commit()
        conn.close()


class ModelVersionDAO:
    @staticmethod
    def insert(data):
        conn = get_db()
        conn.execute(
            """INSERT INTO model_versions (version, model_type, accuracy, roc_auc, precision_score,
               recall, f1, training_samples, file_path, is_active)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (data["version"], data["model_type"], data.get("accuracy"),
             data.get("roc_auc"), data.get("precision_score"), data.get("recall"),
             data.get("f1"), data.get("training_samples"), data.get("file_path"),
             data.get("is_active", False))
        )
        conn.commit()
        conn.close()

    @staticmethod
    def get_active():
        conn = get_db()
        row = conn.execute(
            "SELECT * FROM model_versions WHERE is_active=1 ORDER BY created_at DESC LIMIT 1"
        ).fetchone()
        conn.close()
        return dict(row) if row else None

    @staticmethod
    def get_all():
        conn = get_db()
        rows = conn.execute("SELECT * FROM model_versions ORDER BY created_at DESC").fetchall()
        conn.close()
        return [dict(r) for r in rows]


if __name__ == "__main__":
    init_db()
