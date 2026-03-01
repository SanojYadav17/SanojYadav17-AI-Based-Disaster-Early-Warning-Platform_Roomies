# 🌍 AI-Based Disaster Early Warning Platform  

A production-grade, end-to-end AI-driven system for **early detection and alert generation** of floods, earthquakes, cyclones, and extreme weather. Built with **Machine Learning, FastAPI, React, and real-time data integration**.

---

## 👥 Team Members

- Sanoj Yadav  
- Saket Verma  
- Abhishek Mishra  
- Samarpit Gupta  

---

## 📋 Table of Contents  
- [Overview](#overview)  
- [Architecture](#architecture)  
- [Features](#features)  
- [Project Structure](#project-structure)  
- [Quick Start](#quick-start)  
- [Setup Guide](#setup-guide)  
- [API Reference](#api-reference)  
- [ML Pipeline](#ml-pipeline)  
- [Frontend Dashboard](#frontend-dashboard)  
- [Deployment](#deployment)  
- [MLOps & Monitoring](#mlops--monitoring)  
- [Ethics & Limitations](#ethics--limitations)  

---

## 🎯 Overview  

This platform provides:

| Feature | Description |
|---------|-------------|
| **Multi-source Data Ingestion** | Weather APIs, sensors, historical datasets |
| **ML Prediction Engine** | Logistic Regression, Random Forest, XGBoost, LightGBM, Ensemble |
| **Risk Scoring** | 0-100 score combining ML + rule-based thresholds |
| **Explainable AI** | SHAP/LIME feature importance for every prediction |
| **Automated Alerts** | Location-based, severity-graded notifications |
| **Live Dashboard** | Interactive map, charts, alert center, admin panel |
| **MLOps** | Model versioning, drift detection, retraining pipeline |

---

## 🏗️ Architecture  

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
│  Dashboard │ Live Map │ Alerts │ Predict │ Admin            │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API
┌──────────────────────────┴──────────────────────────────────┐
│                  BACKEND (FastAPI)                           │
│  /ingest-data │ /predict-risk │ /generate-alert │ /metrics  │
├─────────────────────────────────────────────────────────────┤
│  Data Ingestion │ Risk Engine │ Alert Service │ Analytics   │
└──────────┬──────────────┬───────────────┬───────────────────┘
           │              │               │
┌──────────┴──┐  ┌───────┴────────┐  ┌───┴───────────────────┐
│  Database   │  │  ML Service    │  │  Alert Channels       │
│  (SQLite/   │  │  Training      │  │  Web Notifications    │
│   MongoDB)  │  │  Inference     │  │  Email/SMS (simulated)│
│             │  │  Explainability│  │  Logging & Audit      │
└─────────────┘  │  MLOps Monitor │  └───────────────────────┘
                 └────────────────┘
```

---

## 📁 Project Structure  

```
disaster prediction/
├── backend/                    # FastAPI backend
│   ├── main.py                 # API entry point (all routes)
│   ├── Dockerfile
│   └── app/
│       ├── models/
│       │   └── database.py     # SQLite ORM + CRUD
│       ├── routes/             # (extensible)
│       ├── services/
│       │   ├── risk_engine.py  # Risk scoring + decision engine
│       │   ├── alert_service.py# Alert generation + delivery
│       │   └── ingestion_service.py # Data ingestion + validation
│       └── utils/
├── ml_service/                 # ML training & inference
│   ├── training/
│   │   └── train_pipeline.py   # Full training pipeline
│   ├── inference/
│   │   └── predictor.py        # Real-time prediction
│   ├── explainability/
│   │   └── explainer.py        # SHAP/LIME explanations
│   ├── feature_engineering/
│   │   └── features.py         # 40+ engineered features
│   ├── mlops_monitor.py        # Drift detection + monitoring
│   ├── models_store/           # Saved model artifacts
│   └── Dockerfile
├── frontend/                   # React dashboard
│   ├── public/
│   ├── src/
│   │   ├── App.js              # Router + navigation
│   │   ├── App.css             # Dark theme styles
│   │   ├── pages/
│   │   │   ├── Dashboard.js    # Stats, charts, predictions
│   │   │   ├── MapView.js      # Interactive risk map (Leaflet)
│   │   │   ├── AlertsPanel.js  # Active alerts + history
│   │   │   ├── PredictPage.js  # Manual prediction form
│   │   │   └── AdminPanel.js   # Models, retrain, config
│   │   └── services/
│   │       └── api.js          # API client (Axios)
│   ├── package.json
│   └── Dockerfile
├── data/
│   ├── generate_demo_data.py   # Synthetic dataset generator
│   ├── raw/                    # Raw CSV + region JSON
│   └── processed/
├── infra/
│   └── docker-compose.yml      # Full stack Docker setup
├── docs/
│   └── architecture.md
├── config.json                 # App configuration
├── requirements.txt            # Python dependencies
├── .env                        # Environment variables
├── .gitignore
└── README.md                   # This file
```

---

## 🚀 Quick Start  

### Prerequisites  
- Python 3.10+  
- Node.js 18+ (for frontend)  
- pip  

### 1. Install Python Dependencies  
```bash
cd "disaster prediction"
pip install -r requirements.txt
```

### 2. Generate Demo Data  
```bash
python data/generate_demo_data.py
```

### 3. Initialize Database & Train ML Model  
```bash
python -c "from backend.app.models.database import init_db; init_db()"
python ml_service/training/train_pipeline.py
```

### 4. Start Backend API  
```bash
uvicorn backend.main:app --reload --port 8000
```

### 5. Start Frontend (separate terminal)  
```bash
cd frontend
npm install
npm start
```

### 6. Open Dashboard  
- Frontend: **http://localhost:3000**  
- API Docs: **http://localhost:8000/docs**  

---

## 🔌 API Reference  

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/ingest-data` | POST | Ingest weather/sensor data |
| `/ingest-data/bulk` | POST | Bulk CSV import |
| `/predict-risk` | POST | Predict disaster risk |
| `/generate-alert` | POST | Manual alert generation |
| `/alerts/active` | GET | Active alerts |
| `/alerts/history` | GET | Alert history |
| `/alerts/{id}/resolve` | POST | Resolve an alert |
| `/dashboard/metrics` | GET | Dashboard analytics |
| `/regions` | GET | All monitored regions |
| `/predictions` | GET | Prediction history |
| `/models` | GET | Model versions |
| `/models/retrain` | POST | Trigger retraining |

### Example: Predict Risk  
```bash
curl -X POST http://localhost:8000/predict-risk \
  -H "Content-Type: application/json" \
  -d '{
    "region_id": "R001",
    "temperature_c": 35,
    "rainfall_mm": 120,
    "humidity_pct": 90,
    "wind_speed_kmh": 40,
    "pressure_hpa": 1005,
    "river_level_m": 6.0,
    "seismic_signal": 0.2
  }'
```

---

## 🧠 ML Pipeline  

### Models Trained  
1. **Logistic Regression** — Baseline  
2. **Random Forest** — Feature-rich tree ensemble  
3. **XGBoost** — Gradient boosting  
4. **LightGBM** — Fast gradient boosting  
5. **Ensemble** — Soft voting combination of all models  

### Features (40+)  
- **Temporal**: Rolling averages, trends, seasonality, monsoon flag  
- **Spatial**: Region risk index, elevation, flood/cyclone/earthquake flags  
- **Statistical**: Z-scores, anomaly scores, volatility  
- **Domain**: Rainfall intensity, heat index, wind severity, river deviation  

### Evaluation Metrics  
- Accuracy, ROC-AUC, Precision, Recall, F1  
- Confusion Matrix  
- Cross-validation (5-fold)  

### Risk Scoring  
```
Final Score = ML Score + Rule-Based Adjustments (capped at 100)

🟢 Low Risk:    0-40  → Monitor  
🟠 Medium Risk: 41-70 → Prepare  
🔴 High Risk:   71-100 → Evacuate  
```

---

## 🖥️ Frontend Dashboard  

| Page | Features |
|------|----------|
| **Dashboard** | Stats cards, risk distribution pie chart, disaster bar chart, recent predictions table |
| **Live Map** | Interactive Leaflet map with color-coded risk zones, click for details |
| **Alerts** | Active/history tabs, severity badges, resolve button |
| **Predict** | Manual input form with presets (flood/cyclone/earthquake/heatwave/safe), real-time results |
| **Admin** | Model versions, retrain button, configuration, ethics & limitations |

---

## 🐳 Deployment  

### Docker  
```bash
cd infra
docker-compose up --build
```

### Manual  
See Quick Start above.

### Environment Configs  
- `.env` — Development defaults  
- `config.json` — App configuration  

---

## 📊 MLOps & Monitoring  

- **Model Versioning**: Timestamped model artifacts + metadata JSON  
- **Drift Detection**: Z-score based feature distribution comparison  
- **Performance Monitoring**: F1 degradation check with auto-retrain flag  
- **Bias Auditing**: Per-region false alarm rate comparison  
- **Logging**: JSONL logs for predictions, alerts, drift, and performance  

---

## ⚠️ Ethics & Limitations  

- Predictions are probabilistic, not deterministic — use alongside expert judgment  
- Earthquake prediction is inherently limited by current science  
- Model is trained on synthetic data — production requires real data sources  
- Regular bias audits across regions are recommended  
- Confidence scores reflect model certainty, not event certainty  
- System designed as a support tool, not a replacement for human decision-making  

---

## 📄 License  

This project is built for educational and demonstration purposes.

---

**Built with ❤️ for disaster resilience and community safety.**
