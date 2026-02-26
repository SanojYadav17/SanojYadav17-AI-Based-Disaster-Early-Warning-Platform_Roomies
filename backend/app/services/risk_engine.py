"""
Risk Scoring & Decision Engine.
Converts ML predictions into actionable risk scores, combines ML + rule-based thresholds.
"""

import json
from datetime import datetime


# ─── Risk Thresholds ────────────────────────────────────────────

RISK_BANDS = {
    "Low":    {"min": 0,  "max": 40,  "color": "green",  "emoji": "LOW"},
    "Medium": {"min": 41, "max": 70,  "color": "orange", "emoji": "MEDIUM"},
    "High":   {"min": 71, "max": 100, "color": "red",    "emoji": "HIGH"},
}

SAFETY_THRESHOLDS = {
    "rainfall_mm": {"warning": 80, "danger": 150},
    "wind_speed_kmh": {"warning": 60, "danger": 100},
    "river_level_m": {"warning": 5.0, "danger": 7.0},
    "temperature_c": {"warning": 40, "danger": 45},
    "seismic_signal": {"warning": 1.5, "danger": 3.0},
    "pressure_hpa": {"warning": 995, "danger": 980},  # Below these values = danger
}

ACTIONS = {
    "Low": "Monitor - Continue normal activities. Stay informed via alerts.",
    "Medium": "Prepare - Review emergency plans. Secure property. Stay alert.",
    "High": "Evacuate - Move to safety immediately. Follow authority instructions.",
}


# ─── Risk Scoring ───────────────────────────────────────────────

def compute_risk_score(ml_prediction: dict, raw_features: dict = None) -> dict:
    """
    Combine ML prediction with rule-based safety checks to produce final risk assessment.

    Args:
        ml_prediction: Output from DisasterPredictor.predict()
        raw_features: Original weather/sensor values for rule-based checks

    Returns:
        Complete risk assessment dict.
    """
    # Base risk from ML model
    ml_risk_score = ml_prediction.get("risk_score", 0)
    disaster_type = ml_prediction.get("disaster_type", "None")
    ml_probability = ml_prediction.get("risk_probability", 0)

    # Rule-based adjustment
    rule_bonus = 0
    rule_alerts = []

    if raw_features:
        for param, thresholds in SAFETY_THRESHOLDS.items():
            value = raw_features.get(param)
            if value is None:
                continue

            # Handle pressure (lower = worse)
            if param == "pressure_hpa":
                if value < thresholds["danger"]:
                    rule_bonus += 20
                    rule_alerts.append(f"CRITICAL: {param} at {value} (danger threshold: {thresholds['danger']})")
                elif value < thresholds["warning"]:
                    rule_bonus += 10
                    rule_alerts.append(f"WARNING: {param} at {value} (warning threshold: {thresholds['warning']})")
            else:
                if value > thresholds["danger"]:
                    rule_bonus += 20
                    rule_alerts.append(f"CRITICAL: {param} at {value} (danger threshold: {thresholds['danger']})")
                elif value > thresholds["warning"]:
                    rule_bonus += 10
                    rule_alerts.append(f"WARNING: {param} at {value} (warning threshold: {thresholds['warning']})")

    # Combined risk score (weighted: 70% ML + 30% rules)
    final_score = int(min(100, max(0, ml_risk_score + rule_bonus)))

    # Determine risk level
    if final_score <= 40:
        risk_level = "Low"
    elif final_score <= 70:
        risk_level = "Medium"
    else:
        risk_level = "High"

    band = RISK_BANDS[risk_level]

    return {
        "disaster_type": disaster_type,
        "ml_risk_score": ml_risk_score,
        "rule_bonus": rule_bonus,
        "final_risk_score": final_score,
        "risk_level": risk_level,
        "risk_color": band["color"],
        "risk_emoji": band["emoji"],
        "risk_probability": ml_probability,
        "recommended_action": ACTIONS[risk_level],
        "rule_alerts": rule_alerts,
        "class_probabilities": ml_prediction.get("class_probabilities", {}),
        "model_version": ml_prediction.get("model_version", "unknown"),
        "confidence": round(ml_probability, 4),
        "timestamp": datetime.utcnow().isoformat(),
    }


def should_trigger_alert(risk_result: dict) -> bool:
    """Determine if an alert should be triggered based on risk result."""
    return risk_result["final_risk_score"] > 40 and risk_result["disaster_type"] != "None"


def get_alert_severity(risk_result: dict) -> str:
    """Map risk level to alert severity string."""
    mapping = {"Low": "info", "Medium": "warning", "High": "critical"}
    return mapping.get(risk_result["risk_level"], "info")


def batch_risk_scoring(predictions: list, features_list: list = None) -> list:
    """Score a batch of predictions."""
    results = []
    for i, pred in enumerate(predictions):
        feats = features_list[i] if features_list and i < len(features_list) else None
        results.append(compute_risk_score(pred, feats))
    return results


# ─── Alert Severity ─────────────────────────────────────────────

def determine_alert_severity(risk_assessment: dict) -> dict:
    """Determine alert details from risk assessment."""
    score = risk_assessment["final_risk_score"]
    disaster = risk_assessment["disaster_type"]
    level = risk_assessment["risk_level"]

    if level == "Low":
        return {
            "should_alert": False,
            "severity": "info",
            "title": f"Low Risk - {disaster}",
            "message": f"Risk score: {score}/100. No immediate action required.",
        }
    elif level == "Medium":
        return {
            "should_alert": True,
            "severity": "warning",
            "title": f"[WARNING] Medium Risk - {disaster} Warning",
            "message": f"Risk score: {score}/100. Prepare emergency supplies and review evacuation routes.",
        }
    else:
        return {
            "should_alert": True,
            "severity": "critical",
            "title": f"[CRITICAL] HIGH RISK - {disaster} Alert",
            "message": f"Risk score: {score}/100. IMMEDIATE ACTION REQUIRED. Follow evacuation procedures.",
        }
