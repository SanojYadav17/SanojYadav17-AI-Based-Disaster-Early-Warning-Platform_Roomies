"""
ML Inference Engine.
Loads the trained model and provides predictions with risk scores.
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, PROJECT_ROOT)

MODELS_DIR = os.path.join(PROJECT_ROOT, "ml_service", "models_store")


class DisasterPredictor:
    """Load trained model and make predictions with risk scoring."""

    def __init__(self):
        self.model = None
        self.scaler = None
        self.label_encoder = None
        self.metadata = None
        self.feature_names = None
        self.loaded = False

    def load_model(self, version="latest"):
        """Load model, scaler, label encoder, and metadata."""
        try:
            model_path = os.path.join(MODELS_DIR, f"model_{version}.joblib")
            scaler_path = os.path.join(MODELS_DIR, f"scaler_{version}.joblib")
            le_path = os.path.join(MODELS_DIR, f"label_encoder_{version}.joblib")
            meta_path = os.path.join(MODELS_DIR, f"metadata_{version}.json")

            self.model = joblib.load(model_path)
            self.scaler = joblib.load(scaler_path)
            self.label_encoder = joblib.load(le_path)

            with open(meta_path, "r") as f:
                self.metadata = json.load(f)

            self.feature_names = self.metadata.get("feature_names", [])
            self.loaded = True
            print(f"✅ Model loaded: {self.metadata.get('model_type')} ({self.metadata.get('version')})")
            return True
        except Exception as e:
            print(f"❌ Failed to load model: {e}")
            return False

    def predict(self, feature_dict: dict) -> dict:
        """
        Make a prediction from a feature dictionary.
        Returns disaster type, risk probability, risk score, risk level, and recommended action.
        """
        if not self.loaded:
            self.load_model()

        # Build feature vector
        feature_values = []
        for fname in self.feature_names:
            feature_values.append(feature_dict.get(fname, 0))

        X = np.array([feature_values])
        X_scaled = self.scaler.transform(X)

        # Predict class and probabilities
        pred_class = self.model.predict(X_scaled)[0]
        pred_proba = self.model.predict_proba(X_scaled)[0]

        disaster_type = self.label_encoder.inverse_transform([pred_class])[0]
        max_probability = float(pred_proba.max())

        # Risk score (0-100)
        if disaster_type == "None":
            risk_score = int(np.clip((1 - max_probability) * 40, 0, 40))
        else:
            risk_score = int(np.clip(max_probability * 100, 0, 100))

        # Risk level
        if risk_score <= 40:
            risk_level = "Low"
            recommended_action = "Monitor"
        elif risk_score <= 70:
            risk_level = "Medium"
            recommended_action = "Prepare"
        else:
            risk_level = "High"
            recommended_action = "Evacuate"

        # Class probabilities
        class_probabilities = {}
        for i, class_name in enumerate(self.label_encoder.classes_):
            class_probabilities[class_name] = round(float(pred_proba[i]), 4)

        return {
            "disaster_type": disaster_type,
            "risk_probability": round(max_probability, 4),
            "risk_score": risk_score,
            "risk_level": risk_level,
            "recommended_action": recommended_action,
            "class_probabilities": class_probabilities,
            "model_version": self.metadata.get("version", "unknown"),
            "timestamp": datetime.utcnow().isoformat(),
        }

    def predict_batch(self, feature_dicts: list) -> list:
        """Predict for a batch of feature dictionaries."""
        return [self.predict(fd) for fd in feature_dicts]


# ─── Singleton ──────────────────────────────────────────────────
_predictor = None

def get_predictor() -> DisasterPredictor:
    global _predictor
    if _predictor is None:
        _predictor = DisasterPredictor()
        _predictor.load_model()
    return _predictor


if __name__ == "__main__":
    predictor = DisasterPredictor()
    predictor.load_model()

    # Test prediction
    sample = {
        "temperature_c": 35, "rainfall_mm": 120, "humidity_pct": 90,
        "wind_speed_kmh": 40, "pressure_hpa": 1005, "river_level_m": 6.0,
        "seismic_signal": 0.2, "rainfall_gauge_mm": 118,
        "elevation": 10, "flood_prone": 1, "cyclone_prone": 1, "earthquake_zone": 3,
        "hour": 14, "day_of_week": 3, "month": 7, "day_of_year": 200, "is_monsoon": 1,
        "season_sin": 0.5, "season_cos": -0.87, "region_risk_index": 0.6,
        "total_anomaly_score": 2, "rainfall_intensity_index": 0.8,
        "heat_index": 42, "wind_severity_index": 0.2,
        "river_level_deviation": 3.0, "river_flood_risk": 1,
        "pressure_drop": 8, "low_pressure_flag": 0,
    }
    result = predictor.predict(sample)
    print(json.dumps(result, indent=2))
