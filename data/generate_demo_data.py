"""
Demo Data Generator for AI-Based Disaster Early Warning Platform.
Generates realistic synthetic disaster data for training and testing.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
import json

np.random.seed(42)

# ─── Configuration ──────────────────────────────────────────────
NUM_RECORDS = 10000
START_DATE = datetime(2020, 1, 1)
END_DATE = datetime(2025, 12, 31)

REGIONS = [
    {"id": "R001", "name": "Mumbai Coast", "lat": 19.076, "lon": 72.877, "elevation": 14, "flood_prone": True, "cyclone_prone": True, "earthquake_zone": 3},
    {"id": "R002", "name": "Delhi NCR", "lat": 28.704, "lon": 77.102, "elevation": 216, "flood_prone": True, "cyclone_prone": False, "earthquake_zone": 4},
    {"id": "R003", "name": "Chennai", "lat": 13.083, "lon": 80.271, "elevation": 6, "flood_prone": True, "cyclone_prone": True, "earthquake_zone": 3},
    {"id": "R004", "name": "Assam Valley", "lat": 26.140, "lon": 91.736, "elevation": 55, "flood_prone": True, "cyclone_prone": False, "earthquake_zone": 5},
    {"id": "R005", "name": "Rajasthan Desert", "lat": 26.912, "lon": 70.901, "elevation": 225, "flood_prone": False, "cyclone_prone": False, "earthquake_zone": 2},
    {"id": "R006", "name": "Kerala Coast", "lat": 10.851, "lon": 76.271, "elevation": 10, "flood_prone": True, "cyclone_prone": True, "earthquake_zone": 3},
    {"id": "R007", "name": "Gujarat Coast", "lat": 22.258, "lon": 71.192, "elevation": 15, "flood_prone": True, "cyclone_prone": True, "earthquake_zone": 5},
    {"id": "R008", "name": "Uttarakhand Hills", "lat": 30.067, "lon": 79.017, "elevation": 1850, "flood_prone": True, "cyclone_prone": False, "earthquake_zone": 5},
    {"id": "R009", "name": "Odisha Coast", "lat": 20.296, "lon": 85.825, "elevation": 7, "flood_prone": True, "cyclone_prone": True, "earthquake_zone": 3},
    {"id": "R010", "name": "Andhra Pradesh", "lat": 15.912, "lon": 79.740, "elevation": 100, "flood_prone": True, "cyclone_prone": True, "earthquake_zone": 2},
]

DISASTER_TYPES = ["None", "Flood", "Cyclone", "Earthquake", "Heatwave"]

# ─── Helper Functions ───────────────────────────────────────────

def generate_timestamps(n):
    """Generate random timestamps between start and end date."""
    delta = (END_DATE - START_DATE).total_seconds()
    timestamps = [START_DATE + timedelta(seconds=np.random.randint(0, int(delta))) for _ in range(n)]
    return sorted(timestamps)


def seasonal_temperature(month, region):
    """Generate temperature based on month and region."""
    base_temps = {
        "Mumbai Coast": 28, "Delhi NCR": 25, "Chennai": 30,
        "Assam Valley": 24, "Rajasthan Desert": 30, "Kerala Coast": 27,
        "Gujarat Coast": 28, "Uttarakhand Hills": 15, "Odisha Coast": 28,
        "Andhra Pradesh": 29,
    }
    base = base_temps.get(region["name"], 25)
    seasonal_offset = 8 * np.sin(2 * np.pi * (month - 4) / 12)
    return base + seasonal_offset + np.random.normal(0, 2)


def seasonal_rainfall(month, region):
    """Generate rainfall based on monsoon seasonality."""
    monsoon_months = [6, 7, 8, 9]
    base = 5.0
    if month in monsoon_months:
        base = 80 if region["flood_prone"] else 30
    elif month in [10, 11]:
        base = 30 if region["name"] in ["Chennai", "Andhra Pradesh"] else 10
    return max(0, base + np.random.exponential(base * 0.5))


def generate_weather_data(timestamp, region):
    """Generate weather features for a given timestamp and region."""
    month = timestamp.month
    temp = seasonal_temperature(month, region)
    rainfall = seasonal_rainfall(month, region)
    humidity = np.clip(40 + rainfall * 0.3 + np.random.normal(0, 10), 20, 100)
    wind_speed = np.clip(np.random.exponential(15), 2, 200)
    pressure = np.clip(np.random.normal(1013, 8), 950, 1050)
    return temp, rainfall, humidity, wind_speed, pressure


def generate_sensor_data(region, rainfall):
    """Generate simulated sensor data."""
    base_river = 3.0 if region["flood_prone"] else 1.5
    river_level = max(0, base_river + rainfall * 0.05 + np.random.normal(0, 0.5))
    seismic_signal = np.random.exponential(0.5) if region["earthquake_zone"] >= 4 else np.random.exponential(0.1)
    rainfall_gauge = max(0, rainfall + np.random.normal(0, 2))
    return river_level, seismic_signal, rainfall_gauge


def determine_disaster(temp, rainfall, humidity, wind_speed, pressure, river_level, seismic_signal, region):
    """Determine disaster type based on conditions with realistic thresholds."""
    scores = {"None": 50, "Flood": 0, "Cyclone": 0, "Earthquake": 0, "Heatwave": 0}

    # Flood scoring
    if region["flood_prone"]:
        if rainfall > 100:
            scores["Flood"] += 40
        if rainfall > 60:
            scores["Flood"] += 20
        if river_level > 5:
            scores["Flood"] += 25
        if humidity > 85:
            scores["Flood"] += 10

    # Cyclone scoring
    if region["cyclone_prone"]:
        if wind_speed > 80:
            scores["Cyclone"] += 45
        if wind_speed > 50:
            scores["Cyclone"] += 20
        if pressure < 990:
            scores["Cyclone"] += 25
        if rainfall > 80:
            scores["Cyclone"] += 10

    # Earthquake scoring
    if region["earthquake_zone"] >= 4:
        if seismic_signal > 2.0:
            scores["Earthquake"] += 50
        if seismic_signal > 1.0:
            scores["Earthquake"] += 25

    # Heatwave scoring
    if temp > 42:
        scores["Heatwave"] += 50
    elif temp > 38:
        scores["Heatwave"] += 25
    if humidity < 30 and temp > 38:
        scores["Heatwave"] += 15

    # Add noise
    for key in scores:
        scores[key] += np.random.normal(0, 5)

    disaster = max(scores, key=scores.get)
    risk_probability = min(1.0, max(0.0, scores[disaster] / 100))
    return disaster, risk_probability


# ─── Main Generator ─────────────────────────────────────────────

def generate_dataset():
    """Generate the complete demo dataset."""
    print("Generating demo disaster dataset...")
    timestamps = generate_timestamps(NUM_RECORDS)
    records = []

    for i, ts in enumerate(timestamps):
        region = REGIONS[np.random.randint(0, len(REGIONS))]
        temp, rainfall, humidity, wind_speed, pressure = generate_weather_data(ts, region)
        river_level, seismic_signal, rainfall_gauge = generate_sensor_data(region, rainfall)
        disaster, risk_prob = determine_disaster(
            temp, rainfall, humidity, wind_speed, pressure,
            river_level, seismic_signal, region
        )
        risk_score = int(np.clip(risk_prob * 100, 0, 100))

        records.append({
            "timestamp": ts.isoformat(),
            "region_id": region["id"],
            "region_name": region["name"],
            "latitude": region["lat"],
            "longitude": region["lon"],
            "elevation": region["elevation"],
            "flood_prone": region["flood_prone"],
            "cyclone_prone": region["cyclone_prone"],
            "earthquake_zone": region["earthquake_zone"],
            "temperature_c": round(temp, 2),
            "rainfall_mm": round(rainfall, 2),
            "humidity_pct": round(humidity, 2),
            "wind_speed_kmh": round(wind_speed, 2),
            "pressure_hpa": round(pressure, 2),
            "river_level_m": round(river_level, 2),
            "seismic_signal": round(seismic_signal, 4),
            "rainfall_gauge_mm": round(rainfall_gauge, 2),
            "disaster_type": disaster,
            "risk_probability": round(risk_prob, 4),
            "risk_score": risk_score,
        })

        if (i + 1) % 2000 == 0:
            print(f"  Generated {i + 1}/{NUM_RECORDS} records...")

    df = pd.DataFrame(records)

    # Save as CSV & JSON
    raw_dir = os.path.join(os.path.dirname(__file__), "raw")
    os.makedirs(raw_dir, exist_ok=True)
    csv_path = os.path.join(raw_dir, "disaster_data.csv")
    json_path = os.path.join(raw_dir, "regions.json")

    df.to_csv(csv_path, index=False)
    with open(json_path, "w") as f:
        json.dump(REGIONS, f, indent=2)

    print(f"\n✅ Dataset saved: {csv_path} ({len(df)} records)")
    print(f"✅ Regions saved: {json_path}")
    print(f"\nDisaster distribution:\n{df['disaster_type'].value_counts()}")
    print(f"\nRisk score stats:\n{df['risk_score'].describe()}")
    return df


if __name__ == "__main__":
    generate_dataset()
