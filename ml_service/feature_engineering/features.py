"""
Feature Engineering Module.
Temporal, spatial, statistical, and domain-specific features.
"""

import pandas as pd
import numpy as np
from typing import Optional


def compute_temporal_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add rolling averages, trends, and seasonality features."""
    df = df.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(["region_id", "timestamp"])

    # Time components
    df["hour"] = df["timestamp"].dt.hour
    df["day_of_week"] = df["timestamp"].dt.dayofweek
    df["month"] = df["timestamp"].dt.month
    df["day_of_year"] = df["timestamp"].dt.dayofyear
    df["is_monsoon"] = df["month"].isin([6, 7, 8, 9]).astype(int)
    df["season_sin"] = np.sin(2 * np.pi * df["day_of_year"] / 365)
    df["season_cos"] = np.cos(2 * np.pi * df["day_of_year"] / 365)

    # Rolling features per region
    for col in ["temperature_c", "rainfall_mm", "humidity_pct", "wind_speed_kmh", "pressure_hpa"]:
        if col in df.columns:
            grouped = df.groupby("region_id")[col]
            df[f"{col}_roll3"] = grouped.transform(lambda x: x.rolling(3, min_periods=1).mean())
            df[f"{col}_roll7"] = grouped.transform(lambda x: x.rolling(7, min_periods=1).mean())
            df[f"{col}_roll_std3"] = grouped.transform(lambda x: x.rolling(3, min_periods=1).std().fillna(0))
            # Trend: difference from rolling mean
            df[f"{col}_trend"] = df[col] - df[f"{col}_roll7"]

    return df


def compute_spatial_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add region-based spatial risk features."""
    df = df.copy()

    # Region risk index (composite)
    risk_weights = {"flood_prone": 0.3, "cyclone_prone": 0.25, "earthquake_zone": 0.15}
    df["region_risk_index"] = (
        df["flood_prone"].astype(float) * risk_weights["flood_prone"] +
        df["cyclone_prone"].astype(float) * risk_weights["cyclone_prone"] +
        (df["earthquake_zone"] / 5.0) * risk_weights["earthquake_zone"]
    )

    # Elevation category
    df["elevation_category"] = pd.cut(
        df["elevation"],
        bins=[-np.inf, 20, 100, 500, 2000, np.inf],
        labels=["coastal", "low", "medium", "hill", "mountain"]
    ).astype(str)

    # One-hot encode elevation
    elev_dummies = pd.get_dummies(df["elevation_category"], prefix="elev", drop_first=True)
    df = pd.concat([df, elev_dummies], axis=1)

    return df


def compute_statistical_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add volatility and anomaly score features."""
    df = df.copy()

    for col in ["temperature_c", "rainfall_mm", "wind_speed_kmh", "pressure_hpa"]:
        if col in df.columns:
            mean = df[col].mean()
            std = df[col].std()
            df[f"{col}_zscore"] = (df[col] - mean) / (std + 1e-8)
            df[f"{col}_anomaly"] = (df[f"{col}_zscore"].abs() > 2).astype(int)

    # Combined anomaly score
    anomaly_cols = [c for c in df.columns if c.endswith("_anomaly")]
    df["total_anomaly_score"] = df[anomaly_cols].sum(axis=1)

    return df


def compute_domain_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add domain-specific disaster prediction features."""
    df = df.copy()

    # Rainfall Intensity Index (normalized 0-1)
    if "rainfall_mm" in df.columns:
        max_rainfall = df["rainfall_mm"].max()
        df["rainfall_intensity_index"] = df["rainfall_mm"] / (max_rainfall + 1e-8)

    # Heat Index (simplified)
    if "temperature_c" in df.columns and "humidity_pct" in df.columns:
        T = df["temperature_c"]
        H = df["humidity_pct"]
        df["heat_index"] = (
            -8.785 + 1.611 * T + 2.339 * H - 0.1461 * T * H
            - 0.01231 * T**2 - 0.01642 * H**2
            + 0.002212 * T**2 * H + 0.0007255 * T * H**2
            - 0.000003582 * T**2 * H**2
        )
        df["heat_index"] = df["heat_index"].clip(lower=0)

    # Wind Severity Index (0-1)
    if "wind_speed_kmh" in df.columns:
        df["wind_severity_index"] = np.clip(df["wind_speed_kmh"] / 200.0, 0, 1)

    # River Level Deviation
    if "river_level_m" in df.columns:
        normal_level = 3.0
        df["river_level_deviation"] = df["river_level_m"] - normal_level
        df["river_flood_risk"] = (df["river_level_m"] > 5.0).astype(int)

    # Pressure Drop (low pressure = cyclone risk)
    if "pressure_hpa" in df.columns:
        df["pressure_drop"] = 1013 - df["pressure_hpa"]
        df["low_pressure_flag"] = (df["pressure_hpa"] < 990).astype(int)

    return df


def engineer_all_features(df: pd.DataFrame) -> pd.DataFrame:
    """Run the full feature engineering pipeline."""
    print("  [1/4] Computing temporal features...")
    df = compute_temporal_features(df)
    print("  [2/4] Computing spatial features...")
    df = compute_spatial_features(df)
    print("  [3/4] Computing statistical features...")
    df = compute_statistical_features(df)
    print("  [4/4] Computing domain features...")
    df = compute_domain_features(df)

    # Drop non-numeric and non-feature columns for ML
    drop_cols = ["timestamp", "region_name", "elevation_category"]
    df = df.drop(columns=[c for c in drop_cols if c in df.columns], errors="ignore")

    return df


# ─── Feature list for ML ────────────────────────────────────────

FEATURE_COLUMNS = [
    "temperature_c", "rainfall_mm", "humidity_pct", "wind_speed_kmh", "pressure_hpa",
    "river_level_m", "seismic_signal", "rainfall_gauge_mm",
    "elevation", "flood_prone", "cyclone_prone", "earthquake_zone",
    "hour", "day_of_week", "month", "day_of_year", "is_monsoon",
    "season_sin", "season_cos",
    "temperature_c_roll3", "temperature_c_roll7", "temperature_c_roll_std3", "temperature_c_trend",
    "rainfall_mm_roll3", "rainfall_mm_roll7", "rainfall_mm_roll_std3", "rainfall_mm_trend",
    "humidity_pct_roll3", "humidity_pct_roll7",
    "wind_speed_kmh_roll3", "wind_speed_kmh_roll7",
    "pressure_hpa_roll3", "pressure_hpa_roll7",
    "region_risk_index",
    "temperature_c_zscore", "rainfall_mm_zscore", "wind_speed_kmh_zscore", "pressure_hpa_zscore",
    "total_anomaly_score",
    "rainfall_intensity_index", "heat_index", "wind_severity_index",
    "river_level_deviation", "river_flood_risk", "pressure_drop", "low_pressure_flag",
]

TARGET_COLUMN = "disaster_type"


if __name__ == "__main__":
    # Test with demo data
    import os
    data_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "raw", "disaster_data.csv")
    if os.path.exists(data_path):
        df = pd.read_csv(data_path)
        df = engineer_all_features(df)
        print(f"\nFeature-engineered shape: {df.shape}")
        print(f"Columns: {list(df.columns)}")
    else:
        print("Run data/generate_demo_data.py first!")
