"""
MLOps Module — Model Monitoring, Drift Detection, and Retraining.
"""

import os
import sys
import json
import numpy as np
import pandas as pd
from datetime import datetime

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, PROJECT_ROOT)

MODELS_DIR = os.path.join(PROJECT_ROOT, "models_store")
LOGS_DIR = os.path.join(PROJECT_ROOT, "..", "logs")


class ModelMonitor:
    """Monitor model performance and detect data drift."""

    def __init__(self):
        self.baseline_stats = None
        os.makedirs(LOGS_DIR, exist_ok=True)

    def set_baseline(self, X_train: pd.DataFrame):
        """Set baseline statistics from training data for drift detection."""
        self.baseline_stats = {
            "means": X_train.mean().to_dict(),
            "stds": X_train.std().to_dict(),
            "mins": X_train.min().to_dict(),
            "maxs": X_train.max().to_dict(),
            "timestamp": datetime.utcnow().isoformat(),
        }

        # Save baseline
        baseline_path = os.path.join(MODELS_DIR, "baseline_stats.json")
        os.makedirs(MODELS_DIR, exist_ok=True)
        with open(baseline_path, "w") as f:
            json.dump(self.baseline_stats, f, indent=2, default=str)

        print(f"✅ Baseline set with {len(self.baseline_stats['means'])} features.")
        return self.baseline_stats

    def load_baseline(self):
        """Load saved baseline stats."""
        baseline_path = os.path.join(MODELS_DIR, "baseline_stats.json")
        if os.path.exists(baseline_path):
            with open(baseline_path) as f:
                self.baseline_stats = json.load(f)
            return True
        return False

    def detect_drift(self, X_new: pd.DataFrame, threshold: float = 2.0) -> dict:
        """
        Detect data drift by comparing new data distribution against baseline.
        Uses a simple z-score based drift detection.
        """
        if self.baseline_stats is None:
            if not self.load_baseline():
                return {"drift_detected": False, "message": "No baseline available."}

        drift_features = []
        drift_scores = {}

        for col in X_new.columns:
            if col in self.baseline_stats["means"]:
                baseline_mean = self.baseline_stats["means"][col]
                baseline_std = max(self.baseline_stats["stds"].get(col, 1), 0.001)
                new_mean = X_new[col].mean()

                z_score = abs(new_mean - baseline_mean) / baseline_std
                drift_scores[col] = round(float(z_score), 4)

                if z_score > threshold:
                    drift_features.append({
                        "feature": col,
                        "z_score": round(float(z_score), 4),
                        "baseline_mean": round(float(baseline_mean), 4),
                        "new_mean": round(float(new_mean), 4),
                    })

        drift_detected = len(drift_features) > 0
        severity = "none"
        if len(drift_features) > 5:
            severity = "high"
        elif len(drift_features) > 2:
            severity = "medium"
        elif len(drift_features) > 0:
            severity = "low"

        result = {
            "drift_detected": drift_detected,
            "severity": severity,
            "drifted_feature_count": len(drift_features),
            "total_features_checked": len(drift_scores),
            "drifted_features": drift_features,
            "all_scores": drift_scores,
            "threshold": threshold,
            "timestamp": datetime.utcnow().isoformat(),
        }

        # Log
        self._log_drift(result)
        return result

    def check_model_performance(self, y_true, y_pred, model_version: str) -> dict:
        """Check if model performance has degraded."""
        from sklearn.metrics import accuracy_score, f1_score

        accuracy = accuracy_score(y_true, y_pred)
        f1 = f1_score(y_true, y_pred, average="weighted", zero_division=0)

        # Load expected performance from model metadata
        meta_path = os.path.join(MODELS_DIR, "metadata_latest.json")
        expected_f1 = 0.8
        if os.path.exists(meta_path):
            with open(meta_path) as f:
                meta = json.load(f)
            expected_f1 = meta.get("metrics", {}).get("f1", 0.8)

        degradation = expected_f1 - f1
        needs_retrain = degradation > 0.05

        result = {
            "current_accuracy": round(accuracy, 4),
            "current_f1": round(f1, 4),
            "expected_f1": round(expected_f1, 4),
            "degradation": round(degradation, 4),
            "needs_retrain": needs_retrain,
            "model_version": model_version,
            "timestamp": datetime.utcnow().isoformat(),
        }

        self._log_performance(result)
        return result

    def check_bias(self, predictions_df: pd.DataFrame, group_column: str = "region_id") -> dict:
        """Check for bias across regions (fairness audit)."""
        bias_report = {"groups": {}, "timestamp": datetime.utcnow().isoformat()}

        for group, group_df in predictions_df.groupby(group_column):
            if "risk_score" in group_df.columns:
                bias_report["groups"][str(group)] = {
                    "count": len(group_df),
                    "mean_risk_score": round(group_df["risk_score"].mean(), 2),
                    "high_risk_pct": round((group_df["risk_score"] > 70).mean() * 100, 2),
                    "false_alarm_rate": round(
                        ((group_df.get("disaster_type") == "None") & (group_df["risk_score"] > 40)).mean() * 100, 2
                    ) if "disaster_type" in group_df.columns else None,
                }

        # Check if any group has significantly different false alarm rates
        high_risk_rates = [v["high_risk_pct"] for v in bias_report["groups"].values()]
        if high_risk_rates:
            max_diff = max(high_risk_rates) - min(high_risk_rates)
            bias_report["max_disparity"] = round(max_diff, 2)
            bias_report["bias_flag"] = max_diff > 20  # Flag if >20% disparity

        return bias_report

    def _log_drift(self, result):
        """Log drift detection results."""
        log_path = os.path.join(LOGS_DIR, "drift_log.jsonl")
        os.makedirs(LOGS_DIR, exist_ok=True)
        with open(log_path, "a") as f:
            f.write(json.dumps(result, default=str) + "\n")

    def _log_performance(self, result):
        """Log model performance checks."""
        log_path = os.path.join(LOGS_DIR, "performance_log.jsonl")
        os.makedirs(LOGS_DIR, exist_ok=True)
        with open(log_path, "a") as f:
            f.write(json.dumps(result, default=str) + "\n")
