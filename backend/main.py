"""
FastAPI Main Application — Disaster Early Warning Platform.
All API routes, background jobs, and CORS configuration.
"""

import os
import sys
import json
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict

# Project root — ensure both workspace root and backend dir are on sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.models.database import init_db, RegionDAO, WeatherDAO, PredictionDAO, AlertDAO, ModelVersionDAO
from app.services.risk_engine import compute_risk_score, should_trigger_alert, get_alert_severity
from app.services.alert_service import get_alert_service
from app.services.ingestion_service import DataIngestionService


# ─── Lifespan ───────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    print("🚀 Starting Disaster Early Warning Platform Backend...")
    init_db()
    print("✅ Database initialized.")
    yield
    print("👋 Shutting down...")


# ─── App ────────────────────────────────────────────────────────

app = FastAPI(
    title="Disaster Early Warning Platform",
    description="AI-based disaster prediction, risk scoring, and alert system",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Pydantic Models ───────────────────────────────────────────

class WeatherDataInput(BaseModel):
    region_id: str
    timestamp: Optional[str] = None
    temperature_c: float
    rainfall_mm: float
    humidity_pct: Optional[float] = 50.0
    wind_speed_kmh: Optional[float] = 10.0
    pressure_hpa: Optional[float] = 1013.0
    river_level_m: Optional[float] = 3.0
    seismic_signal: Optional[float] = 0.1
    rainfall_gauge_mm: Optional[float] = 0.0

class PredictRequest(BaseModel):
    region_id: str
    temperature_c: float
    rainfall_mm: float
    humidity_pct: Optional[float] = 50.0
    wind_speed_kmh: Optional[float] = 10.0
    pressure_hpa: Optional[float] = 1013.0
    river_level_m: Optional[float] = 3.0
    seismic_signal: Optional[float] = 0.1
    rainfall_gauge_mm: Optional[float] = 0.0
    elevation: Optional[float] = 10.0
    flood_prone: Optional[int] = 1
    cyclone_prone: Optional[int] = 0
    earthquake_zone: Optional[int] = 3

class AlertGenerateRequest(BaseModel):
    region_id: str
    disaster_type: str
    risk_score: int
    risk_level: str
    recommended_action: str = "Monitor"

class BulkIngestRequest(BaseModel):
    file_path: str


# ─── Health ─────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "name": "Disaster Early Warning Platform",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.utcnow().isoformat(),
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


# ─── Data Ingestion ─────────────────────────────────────────────

@app.post("/ingest-data")
async def ingest_data(data: WeatherDataInput):
    """Ingest a single weather/sensor data point."""
    try:
        service = DataIngestionService()
        record = data.dict()
        if not record.get("timestamp"):
            record["timestamp"] = datetime.utcnow().isoformat()
        result = service.ingest_single(record)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ingest-data/bulk")
async def ingest_bulk(req: BulkIngestRequest):
    """Ingest data from a CSV file."""
    try:
        service = DataIngestionService()
        result = service.ingest_from_csv(req.file_path)
        return result
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Prediction ─────────────────────────────────────────────────

@app.post("/predict-risk")
async def predict_risk(req: PredictRequest):
    """Predict disaster risk for given parameters."""
    try:
        # Try loading ML model
        try:
            sys.path.insert(0, os.path.join(PROJECT_ROOT, ".."))
            from ml_service.inference.predictor import get_predictor
            predictor = get_predictor()

            features = req.dict()
            # Add derived features with defaults
            features.update({
                "hour": datetime.utcnow().hour,
                "day_of_week": datetime.utcnow().weekday(),
                "month": datetime.utcnow().month,
                "day_of_year": datetime.utcnow().timetuple().tm_yday,
                "is_monsoon": 1 if datetime.utcnow().month in [6,7,8,9] else 0,
                "season_sin": 0.5, "season_cos": -0.5,
                "region_risk_index": 0.5,
                "total_anomaly_score": 0,
                "rainfall_intensity_index": min(1.0, req.rainfall_mm / 200.0),
                "heat_index": max(0, req.temperature_c * 1.2),
                "wind_severity_index": min(1.0, req.wind_speed_kmh / 200.0),
                "river_level_deviation": req.river_level_m - 3.0,
                "river_flood_risk": 1 if req.river_level_m > 5.0 else 0,
                "pressure_drop": 1013 - req.pressure_hpa,
                "low_pressure_flag": 1 if req.pressure_hpa < 990 else 0,
            })

            # Add rolling features with current values as defaults
            for col in ["temperature_c", "rainfall_mm", "humidity_pct", "wind_speed_kmh", "pressure_hpa"]:
                features[f"{col}_roll3"] = features.get(col, 0)
                features[f"{col}_roll7"] = features.get(col, 0)
                features[f"{col}_roll_std3"] = 0
                features[f"{col}_trend"] = 0

            ml_prediction = predictor.predict(features)
        except Exception as e:
            print(f"  ML model not available, using rule-based fallback: {e}")
            ml_prediction = _rule_based_prediction(req.dict())

        # Risk scoring
        risk_result = compute_risk_score(ml_prediction, req.dict())

        # Auto-alert if needed
        if should_trigger_alert(risk_result):
            alert_service = get_alert_service()
            region = _get_region_info(req.region_id)
            alert_service.generate_alert(risk_result, region)

        return risk_result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _rule_based_prediction(features: dict) -> dict:
    """Fallback rule-based prediction when ML model is unavailable."""
    score = 0
    disaster = "None"

    if features.get("rainfall_mm", 0) > 100 and features.get("river_level_m", 0) > 5:
        score = 75
        disaster = "Flood"
    elif features.get("wind_speed_kmh", 0) > 80 and features.get("pressure_hpa", 1013) < 990:
        score = 80
        disaster = "Cyclone"
    elif features.get("seismic_signal", 0) > 2.0:
        score = 70
        disaster = "Earthquake"
    elif features.get("temperature_c", 0) > 42:
        score = 65
        disaster = "Heatwave"
    elif features.get("rainfall_mm", 0) > 60:
        score = 45
        disaster = "Flood"
    elif features.get("wind_speed_kmh", 0) > 50:
        score = 50
        disaster = "Cyclone"

    return {
        "disaster_type": disaster,
        "risk_probability": score / 100.0,
        "risk_score": score,
        "risk_level": "Low" if score <= 40 else ("Medium" if score <= 70 else "High"),
        "recommended_action": "Monitor" if score <= 40 else ("Prepare" if score <= 70 else "Evacuate"),
        "class_probabilities": {disaster: score / 100.0},
        "model_version": "rule_based_v1",
    }


def _get_region_info(region_id: str) -> dict:
    """Get region info from DB or return default."""
    try:
        regions = RegionDAO.get_all()
        for r in regions:
            if r["id"] == region_id:
                return r
    except Exception:
        pass
    return {"id": region_id, "name": region_id}


# ─── Alerts ─────────────────────────────────────────────────────

@app.post("/generate-alert")
async def generate_alert(req: AlertGenerateRequest):
    """Manually generate an alert."""
    try:
        alert_service = get_alert_service()
        region = _get_region_info(req.region_id)
        risk_result = {
            "disaster_type": req.disaster_type,
            "final_risk_score": req.risk_score,
            "risk_level": req.risk_level,
            "risk_emoji": "🟢" if req.risk_level == "Low" else ("🟠" if req.risk_level == "Medium" else "🔴"),
            "recommended_action": req.recommended_action,
            "confidence": req.risk_score / 100.0,
            "risk_probability": req.risk_score / 100.0,
            "model_version": "manual",
        }
        result = alert_service.generate_alert(risk_result, region)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/alerts/active")
async def active_alerts(limit: int = Query(50, ge=1, le=200)):
    """Get active alerts."""
    try:
        alerts = AlertDAO.get_active(limit)
        return {"alerts": alerts, "count": len(alerts)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/alerts/history")
async def alert_history(region_id: Optional[str] = None, limit: int = Query(100, ge=1, le=500)):
    """Get alert history."""
    try:
        alerts = AlertDAO.get_history(region_id, limit)
        return {"alerts": alerts, "count": len(alerts)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: int):
    """Resolve an alert."""
    try:
        AlertDAO.resolve(alert_id)
        return {"status": "resolved", "alert_id": alert_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Dashboard Metrics ──────────────────────────────────────────

@app.get("/dashboard/metrics")
async def dashboard_metrics():
    """Get analytics and metrics for dashboard."""
    try:
        regions = RegionDAO.get_all()
        predictions = PredictionDAO.get_all_latest(100)
        active_alerts = AlertDAO.get_active(100)
        all_alerts = AlertDAO.get_history(limit=500)

        # Compute stats
        risk_distribution = {"Low": 0, "Medium": 0, "High": 0}
        disaster_counts = {}
        region_risks = {}

        for pred in predictions:
            level = pred.get("risk_level", "Low")
            risk_distribution[level] = risk_distribution.get(level, 0) + 1
            dtype = pred.get("disaster_type", "None")
            disaster_counts[dtype] = disaster_counts.get(dtype, 0) + 1
            rid = pred.get("region_id")
            if rid:
                region_risks[rid] = {
                    "risk_score": pred.get("risk_score", 0),
                    "risk_level": level,
                    "disaster_type": dtype,
                }

        return {
            "total_regions": len(regions),
            "total_predictions": len(predictions),
            "active_alerts": len(active_alerts),
            "total_alerts_history": len(all_alerts),
            "risk_distribution": risk_distribution,
            "disaster_type_counts": disaster_counts,
            "region_risks": region_risks,
            "regions": regions,
            "recent_predictions": predictions[:20],
            "recent_alerts": [dict(a) for a in active_alerts[:10]],
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Regions ────────────────────────────────────────────────────

@app.get("/regions")
async def list_regions():
    """Get all monitored regions."""
    try:
        regions = RegionDAO.get_all()
        return {"regions": regions, "count": len(regions)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Model Management ──────────────────────────────────────────

@app.get("/models")
async def list_models():
    """List all model versions."""
    try:
        models = ModelVersionDAO.get_all()
        active = ModelVersionDAO.get_active()
        return {"models": models, "active": active}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/models/retrain")
async def retrain_model():
    """Trigger model retraining."""
    try:
        sys.path.insert(0, os.path.join(PROJECT_ROOT, ".."))
        from ml_service.training.train_pipeline import run_training_pipeline
        version, results = run_training_pipeline()
        return {"status": "training_complete", "version": version, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Predictions History ───────────────────────────────────────

@app.get("/predictions")
async def get_predictions(region_id: Optional[str] = None, limit: int = Query(50, ge=1, le=200)):
    """Get prediction history."""
    try:
        if region_id:
            predictions = PredictionDAO.get_latest_by_region(region_id, limit)
        else:
            predictions = PredictionDAO.get_all_latest(limit)
        return {"predictions": predictions, "count": len(predictions)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
