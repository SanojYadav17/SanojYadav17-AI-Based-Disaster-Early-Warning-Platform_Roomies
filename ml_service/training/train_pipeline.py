"""
ML Training Pipeline.
Trains multiple models (Logistic Regression, Random Forest, XGBoost, LightGBM), evaluates them,
handles imbalanced data, performs hyperparameter tuning, and saves the best model.
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.metrics import (
    accuracy_score, roc_auc_score, precision_score, recall_score,
    f1_score, confusion_matrix, classification_report
)
from sklearn.utils.class_weight import compute_class_weight

# Add project root to path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, PROJECT_ROOT)

from ml_service.feature_engineering.features import engineer_all_features, FEATURE_COLUMNS, TARGET_COLUMN

MODELS_DIR = os.path.join(PROJECT_ROOT, "ml_service", "models_store")
DATA_PATH = os.path.join(PROJECT_ROOT, "data", "raw", "disaster_data.csv")

# ─── Data Loading & Prep ────────────────────────────────────────

def load_and_prepare_data():
    """Load CSV, engineer features, encode target."""
    print("📂 Loading data...")
    df = pd.read_csv(DATA_PATH)
    print(f"  Raw data shape: {df.shape}")

    print("\n🔧 Engineering features...")
    df = engineer_all_features(df)

    # Encode target
    le = LabelEncoder()
    df["target"] = le.fit_transform(df[TARGET_COLUMN])

    # Select features that exist
    available_features = [c for c in FEATURE_COLUMNS if c in df.columns]
    missing = [c for c in FEATURE_COLUMNS if c not in df.columns]
    if missing:
        print(f"  ⚠️ Missing features (will be skipped): {missing}")

    X = df[available_features].copy()
    y = df["target"].copy()

    # Convert booleans to int
    for col in X.columns:
        if X[col].dtype == bool:
            X[col] = X[col].astype(int)

    # Fill NaN
    X = X.fillna(0)

    print(f"\n  Features: {X.shape[1]}, Samples: {X.shape[0]}")
    print(f"  Target classes: {dict(zip(le.classes_, np.bincount(y)))}")

    return X, y, le, available_features


# ─── Model Training ─────────────────────────────────────────────

def train_all_models(X_train, y_train, X_test, y_test, label_encoder):
    """Train multiple models and return results."""
    classes = np.unique(y_train)
    class_weights = compute_class_weight("balanced", classes=classes, y=y_train)
    weight_dict = dict(zip(classes, class_weights))

    results = {}

    # 1. Logistic Regression
    print("\n🔹 Training Logistic Regression...")
    lr = LogisticRegression(
        max_iter=1000, class_weight="balanced",
        solver="lbfgs", random_state=42
    )
    lr.fit(X_train, y_train)
    results["logistic_regression"] = evaluate_model(lr, X_test, y_test, label_encoder, "Logistic Regression")

    # 2. Random Forest
    print("\n🔹 Training Random Forest...")
    rf = RandomForestClassifier(
        n_estimators=200, max_depth=20, min_samples_split=5,
        class_weight="balanced", random_state=42, n_jobs=-1
    )
    rf.fit(X_train, y_train)
    results["random_forest"] = evaluate_model(rf, X_test, y_test, label_encoder, "Random Forest")

    # 3. XGBoost
    print("\n🔹 Training XGBoost...")
    try:
        from xgboost import XGBClassifier
        xgb = XGBClassifier(
            n_estimators=300, max_depth=8, learning_rate=0.1,
            subsample=0.8, colsample_bytree=0.8,
            eval_metric="mlogloss",
            random_state=42, n_jobs=-1
        )
        xgb.fit(X_train, y_train)
        results["xgboost"] = evaluate_model(xgb, X_test, y_test, label_encoder, "XGBoost")
    except ImportError:
        print("  ⚠️ XGBoost not installed, skipping.")

    # 4. LightGBM
    print("\n🔹 Training LightGBM...")
    try:
        from lightgbm import LGBMClassifier
        lgbm = LGBMClassifier(
            n_estimators=300, max_depth=8, learning_rate=0.1,
            subsample=0.8, colsample_bytree=0.8,
            class_weight="balanced", random_state=42, n_jobs=-1, verbose=-1
        )
        lgbm.fit(X_train, y_train)
        results["lightgbm"] = evaluate_model(lgbm, X_test, y_test, label_encoder, "LightGBM")
    except ImportError:
        print("  ⚠️ LightGBM not installed, skipping.")

    # 5. Ensemble (Voting)
    print("\n🔹 Training Ensemble (Voting Classifier)...")
    estimators = [("lr", lr), ("rf", rf)]
    if "xgboost" in results:
        estimators.append(("xgb", xgb))
    if "lightgbm" in results:
        estimators.append(("lgbm", lgbm))

    ensemble = VotingClassifier(estimators=estimators, voting="soft")
    ensemble.fit(X_train, y_train)
    results["ensemble"] = evaluate_model(ensemble, X_test, y_test, label_encoder, "Ensemble")

    return results, {"lr": lr, "rf": rf, "ensemble": ensemble,
                     **({} if "xgboost" not in results else {"xgb": xgb}),
                     **({} if "lightgbm" not in results else {"lgbm": lgbm})}


def evaluate_model(model, X_test, y_test, label_encoder, name):
    """Evaluate model and return metrics."""
    y_pred = model.predict(X_test)

    try:
        y_proba = model.predict_proba(X_test)
        roc = roc_auc_score(y_test, y_proba, multi_class="ovr", average="weighted")
    except Exception:
        roc = 0.0

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, average="weighted", zero_division=0)
    rec = recall_score(y_test, y_pred, average="weighted", zero_division=0)
    f1 = f1_score(y_test, y_pred, average="weighted", zero_division=0)
    cm = confusion_matrix(y_test, y_pred)

    print(f"  {name}:")
    print(f"    Accuracy: {acc:.4f} | ROC-AUC: {roc:.4f}")
    print(f"    Precision: {prec:.4f} | Recall: {rec:.4f} | F1: {f1:.4f}")
    print(f"    Confusion Matrix:\n{cm}")

    return {
        "name": name,
        "accuracy": round(acc, 4),
        "roc_auc": round(roc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1": round(f1, 4),
        "confusion_matrix": cm.tolist(),
    }


# ─── Save & Export ──────────────────────────────────────────────

def save_best_model(results, models, scaler, label_encoder, feature_names):
    """Save the best performing model based on F1 score."""
    os.makedirs(MODELS_DIR, exist_ok=True)

    # Find best
    best_name = max(results, key=lambda k: results[k]["f1"])
    best_metrics = results[best_name]

    model_map = {
        "logistic_regression": "lr", "random_forest": "rf",
        "xgboost": "xgb", "lightgbm": "lgbm", "ensemble": "ensemble"
    }
    best_model = models[model_map[best_name]]

    version = datetime.now().strftime("v%Y%m%d_%H%M%S")

    # Save model
    model_path = os.path.join(MODELS_DIR, f"model_{version}.joblib")
    joblib.dump(best_model, model_path)

    # Save scaler
    scaler_path = os.path.join(MODELS_DIR, f"scaler_{version}.joblib")
    joblib.dump(scaler, scaler_path)

    # Save label encoder
    le_path = os.path.join(MODELS_DIR, f"label_encoder_{version}.joblib")
    joblib.dump(label_encoder, le_path)

    # Save metadata
    metadata = {
        "version": version,
        "model_type": best_name,
        "metrics": best_metrics,
        "feature_names": feature_names,
        "class_names": label_encoder.classes_.tolist(),
        "training_timestamp": datetime.now().isoformat(),
        "all_results": {k: v for k, v in results.items()},
        "files": {
            "model": os.path.basename(model_path),
            "scaler": os.path.basename(scaler_path),
            "label_encoder": os.path.basename(le_path),
        }
    }
    meta_path = os.path.join(MODELS_DIR, f"metadata_{version}.json")
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)

    # Save as "latest"
    for src, dst_name in [
        (model_path, "model_latest.joblib"),
        (scaler_path, "scaler_latest.joblib"),
        (le_path, "label_encoder_latest.joblib"),
        (meta_path, "metadata_latest.json"),
    ]:
        import shutil
        shutil.copy2(src, os.path.join(MODELS_DIR, dst_name))

    print(f"\n✅ Best model: {best_name} (F1: {best_metrics['f1']:.4f})")
    print(f"   Saved to: {model_path}")
    return version, best_metrics


# ─── Main Pipeline ──────────────────────────────────────────────

def run_training_pipeline():
    """Main training pipeline entry point."""
    print("=" * 60)
    print("🚀 DISASTER PREDICTION — ML TRAINING PIPELINE")
    print("=" * 60)

    # Load data
    X, y, label_encoder, feature_names = load_and_prepare_data()

    # Scale features
    scaler = StandardScaler()
    X_scaled = pd.DataFrame(scaler.fit_transform(X), columns=X.columns, index=X.index)

    # Time-aware split (80/20)
    split_idx = int(len(X_scaled) * 0.8)
    X_train, X_test = X_scaled.iloc[:split_idx], X_scaled.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
    print(f"\n📊 Train: {len(X_train)} | Test: {len(X_test)}")

    # Cross-validation on training set
    print("\n📈 Cross-validation (5-fold) on Random Forest...")
    rf_cv = RandomForestClassifier(n_estimators=100, class_weight="balanced", random_state=42, n_jobs=-1)
    cv_scores = cross_val_score(rf_cv, X_train, y_train, cv=StratifiedKFold(5, shuffle=True, random_state=42), scoring="f1_weighted")
    print(f"   CV F1 scores: {cv_scores.round(4)}")
    print(f"   CV F1 mean: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # Train all models
    results, models = train_all_models(X_train, y_train, X_test, y_test, label_encoder)

    # Save best
    version, best_metrics = save_best_model(results, models, scaler, label_encoder, feature_names)

    print("\n" + "=" * 60)
    print("✅ TRAINING COMPLETE")
    print("=" * 60)
    return version, results


if __name__ == "__main__":
    run_training_pipeline()
