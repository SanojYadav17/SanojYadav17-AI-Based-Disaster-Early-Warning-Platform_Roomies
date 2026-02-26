"""
Data Ingestion Service.
Scheduled + real-time data fetch, validation, cleaning, and storage.
"""

import os
import sys
import json
import pandas as pd
import numpy as np
from datetime import datetime

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.models.database import WeatherDAO, RegionDAO


class DataIngestionService:
    """Ingest, validate, clean, and store weather/sensor data."""

    def __init__(self):
        self.config = self._load_config()

    def _load_config(self):
        config_path = os.path.join(PROJECT_ROOT, "config.json")
        if os.path.exists(config_path):
            with open(config_path) as f:
                return json.load(f)
        return {}

    def ingest_from_csv(self, csv_path: str) -> dict:
        """Ingest data from a CSV file into the database."""
        print(f"📂 Ingesting data from: {csv_path}")
        df = pd.read_csv(csv_path)
        print(f"  Raw records: {len(df)}")

        # Validate
        df = self._validate(df)
        print(f"  Valid records: {len(df)}")

        # Clean
        df = self._clean(df)

        # Store regions
        regions = df[["region_id", "region_name", "latitude", "longitude", "elevation",
                       "flood_prone", "cyclone_prone", "earthquake_zone"]].drop_duplicates("region_id")
        region_dicts = []
        for _, row in regions.iterrows():
            region_dicts.append({
                "id": row["region_id"], "name": row["region_name"],
                "lat": row["latitude"], "lon": row["longitude"],
                "elevation": row["elevation"], "flood_prone": bool(row["flood_prone"]),
                "cyclone_prone": bool(row["cyclone_prone"]),
                "earthquake_zone": int(row["earthquake_zone"]),
            })
        RegionDAO.insert_many(region_dicts)
        print(f"  Stored {len(region_dicts)} regions")

        # Store weather data
        weather_records = []
        for _, row in df.iterrows():
            weather_records.append({
                "region_id": row["region_id"],
                "timestamp": row["timestamp"],
                "temperature_c": row.get("temperature_c"),
                "rainfall_mm": row.get("rainfall_mm"),
                "humidity_pct": row.get("humidity_pct"),
                "wind_speed_kmh": row.get("wind_speed_kmh"),
                "pressure_hpa": row.get("pressure_hpa"),
                "river_level_m": row.get("river_level_m"),
                "seismic_signal": row.get("seismic_signal"),
                "rainfall_gauge_mm": row.get("rainfall_gauge_mm"),
                "source": "csv_import",
            })
        WeatherDAO.insert_bulk(weather_records)
        print(f"  Stored {len(weather_records)} weather records")

        return {"status": "success", "records_ingested": len(weather_records), "regions": len(region_dicts)}

    def ingest_single(self, data: dict) -> dict:
        """Ingest a single data point (real-time)."""
        required = ["region_id", "timestamp", "temperature_c", "rainfall_mm"]
        for field in required:
            if field not in data:
                return {"status": "error", "message": f"Missing required field: {field}"}

        # Clean single record
        data = self._clean_single(data)
        WeatherDAO.insert(data)
        return {"status": "success", "message": "Data ingested"}

    def fetch_from_api(self, region_lat: float, region_lon: float):
        """Fetch weather data from API (simulated if no API key)."""
        api_key = self.config.get("data_sources", {}).get("weather_api_key", "")
        if api_key == "YOUR_API_KEY_HERE" or not api_key:
            # Simulate API response
            return self._simulate_api_response(region_lat, region_lon)

        # Real API call would go here
        import requests
        url = self.config["data_sources"]["weather_api_url"]
        params = {"lat": region_lat, "lon": region_lon, "appid": api_key, "units": "metric"}
        try:
            resp = requests.get(url, params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            return {
                "temperature_c": data["main"]["temp"],
                "humidity_pct": data["main"]["humidity"],
                "pressure_hpa": data["main"]["pressure"],
                "wind_speed_kmh": data["wind"]["speed"] * 3.6,
                "rainfall_mm": data.get("rain", {}).get("1h", 0),
            }
        except Exception as e:
            print(f"  ⚠️ API fetch failed: {e}")
            return self._simulate_api_response(region_lat, region_lon)

    def _simulate_api_response(self, lat, lon):
        """Simulate weather API response."""
        return {
            "temperature_c": round(np.random.normal(30, 5), 2),
            "rainfall_mm": round(max(0, np.random.exponential(20)), 2),
            "humidity_pct": round(np.clip(np.random.normal(70, 15), 20, 100), 2),
            "wind_speed_kmh": round(max(2, np.random.exponential(15)), 2),
            "pressure_hpa": round(np.random.normal(1013, 8), 2),
            "river_level_m": round(max(0, np.random.normal(3, 1.5)), 2),
            "seismic_signal": round(max(0, np.random.exponential(0.3)), 4),
            "rainfall_gauge_mm": round(max(0, np.random.exponential(18)), 2),
            "source": "simulated",
        }

    def _validate(self, df):
        """Validate data: check required columns and value ranges."""
        required_cols = ["region_id", "timestamp", "temperature_c", "rainfall_mm"]
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"Missing required column: {col}")

        # Drop rows with null region_id or timestamp
        df = df.dropna(subset=["region_id", "timestamp"])

        # Range validation
        if "temperature_c" in df.columns:
            df = df[(df["temperature_c"] > -50) & (df["temperature_c"] < 60)]
        if "rainfall_mm" in df.columns:
            df = df[df["rainfall_mm"] >= 0]
        if "humidity_pct" in df.columns:
            df = df[(df["humidity_pct"] >= 0) & (df["humidity_pct"] <= 100)]

        return df

    def _clean(self, df):
        """Clean data: handle missing values, outliers, noise."""
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            # Fill missing with median
            df[col] = df[col].fillna(df[col].median())
            # Clip outliers to 1st/99th percentile
            low = df[col].quantile(0.01)
            high = df[col].quantile(0.99)
            df[col] = df[col].clip(low, high)
        return df

    def _clean_single(self, data):
        """Clean a single data record."""
        for key in ["temperature_c", "rainfall_mm", "humidity_pct", "wind_speed_kmh", "pressure_hpa"]:
            if key in data and data[key] is None:
                data[key] = 0
        if "rainfall_mm" in data:
            data["rainfall_mm"] = max(0, data["rainfall_mm"])
        if "humidity_pct" in data:
            data["humidity_pct"] = max(0, min(100, data["humidity_pct"]))
        return data
