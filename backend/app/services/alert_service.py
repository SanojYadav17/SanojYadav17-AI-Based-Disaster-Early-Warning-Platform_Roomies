"""
Alert Service.
Generates, delivers, and manages disaster alerts with rate limiting and escalation.
"""

import json
import os
import sys
from datetime import datetime, timedelta
from collections import defaultdict

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.models.database import AlertDAO, PredictionDAO


# ─── Rate Limiter ───────────────────────────────────────────────
class AlertRateLimiter:
    """Prevent alert flooding per region."""

    def __init__(self, cooldown_minutes=60):
        self.cooldown = timedelta(minutes=cooldown_minutes)
        self.last_alert = defaultdict(lambda: datetime.min)

    def can_send(self, region_id: str) -> bool:
        return datetime.utcnow() - self.last_alert[region_id] > self.cooldown

    def record(self, region_id: str):
        self.last_alert[region_id] = datetime.utcnow()


# ─── Alert Generator ───────────────────────────────────────────

class AlertService:
    """Generate and manage disaster alerts."""

    def __init__(self, cooldown_minutes=60):
        self.rate_limiter = AlertRateLimiter(cooldown_minutes)

    def generate_alert(self, risk_result: dict, region_info: dict) -> dict:
        """Generate an alert from risk scoring result."""
        region_id = region_info.get("id", "unknown")
        region_name = region_info.get("name", "Unknown Region")

        # Rate limiting
        if not self.rate_limiter.can_send(region_id):
            return {"status": "rate_limited", "region_id": region_id}

        severity = risk_result.get("risk_level", "Low")
        disaster = risk_result.get("disaster_type", "Unknown")
        score = risk_result.get("final_risk_score", 0)
        action = risk_result.get("recommended_action", "Monitor")

        # Generate alert message
        title = f"{risk_result.get('risk_emoji', '⚠️')} {severity} Risk: {disaster} Alert — {region_name}"
        message = (
            f"Disaster Type: {disaster}\n"
            f"Risk Score: {score}/100 ({severity})\n"
            f"Region: {region_name}\n"
            f"Action: {action}\n"
            f"Confidence: {risk_result.get('confidence', 0):.1%}\n"
            f"Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}"
        )

        alert_data = {
            "region_id": region_id,
            "alert_type": disaster,
            "severity": severity.lower(),
            "title": title,
            "message": message,
            "recommended_action": action,
            "status": "active",
            "delivered_channels": "web",
            "risk_score": score,
        }

        # Store prediction first
        prediction_data = {
            "region_id": region_id,
            "timestamp": datetime.utcnow().isoformat(),
            "disaster_type": disaster,
            "risk_probability": risk_result.get("risk_probability", 0),
            "risk_score": score,
            "risk_level": severity,
            "recommended_action": action,
            "model_version": risk_result.get("model_version", "unknown"),
            "explanation": risk_result.get("explanation", {}),
        }

        try:
            prediction_id = PredictionDAO.insert(prediction_data)
            alert_data["prediction_id"] = prediction_id
        except Exception as e:
            print(f"  ⚠️ Could not save prediction: {e}")

        # Store alert
        try:
            alert_id = AlertDAO.insert(alert_data)
            alert_data["id"] = alert_id
        except Exception as e:
            print(f"  ⚠️ Could not save alert: {e}")

        self.rate_limiter.record(region_id)

        # Simulate delivery
        self._deliver_alert(alert_data)

        return {
            "status": "sent",
            "alert": alert_data,
        }

    def _deliver_alert(self, alert_data):
        """Simulate alert delivery (web, email, SMS)."""
        print(f"\n{'='*50}")
        print(f"🚨 ALERT DELIVERED")
        print(f"{'='*50}")
        print(f"  Title: {alert_data['title']}")
        print(f"  Severity: {alert_data['severity']}")
        print(f"  Channel: {alert_data['delivered_channels']}")
        print(f"{'='*50}\n")

        # Log to file
        log_dir = os.path.join(PROJECT_ROOT, "logs")
        os.makedirs(log_dir, exist_ok=True)
        log_file = os.path.join(log_dir, "alerts.log")
        with open(log_file, "a") as f:
            f.write(f"[{datetime.utcnow().isoformat()}] {alert_data['title']} | {alert_data['severity']}\n")

    def escalate_alert(self, alert_id: int, new_severity: str):
        """Escalate an existing alert to higher severity."""
        # In production, this would update the alert and notify additional channels
        print(f"  ⬆️ Alert {alert_id} escalated to {new_severity}")

    def resolve_alert(self, alert_id: int):
        """Mark an alert as resolved."""
        AlertDAO.resolve(alert_id)
        print(f"  ✅ Alert {alert_id} resolved")

    def get_active_alerts(self, limit=50):
        """Get all active alerts."""
        return AlertDAO.get_active(limit)

    def get_alert_history(self, region_id=None, limit=100):
        """Get alert history."""
        return AlertDAO.get_history(region_id, limit)


# Singleton
_alert_service = None

def get_alert_service() -> AlertService:
    global _alert_service
    if _alert_service is None:
        _alert_service = AlertService()
    return _alert_service
