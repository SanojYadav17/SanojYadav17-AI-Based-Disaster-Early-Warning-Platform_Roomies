"""
Explainable AI Module.
Uses SHAP for feature importance and prediction explanations.
Falls back to permutation importance if SHAP is not available.
"""

import os
import sys
import json
import numpy as np
import pandas as pd
from datetime import datetime

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, PROJECT_ROOT)


class ExplainabilityEngine:
    """Generate explanations for model predictions using SHAP or fallback methods."""

    def __init__(self, model, feature_names, class_names):
        self.model = model
        self.feature_names = feature_names
        self.class_names = class_names
        self.shap_available = False
        self.explainer = None

        try:
            import shap
            self.shap_available = True
            print("[OK] SHAP available for explanations.")
        except ImportError:
            print("[WARN] SHAP not installed. Using fallback feature importance.")

    def init_shap(self, X_background):
        """Initialize SHAP explainer with background data."""
        if not self.shap_available:
            return

        import shap
        try:
            # Use TreeExplainer for tree-based models
            self.explainer = shap.TreeExplainer(self.model)
            print("  Using TreeExplainer")
        except Exception:
            try:
                # Fallback to KernelExplainer
                bg = shap.kmeans(X_background, 50)
                self.explainer = shap.KernelExplainer(self.model.predict_proba, bg)
                print("  Using KernelExplainer")
            except Exception as e:
                print(f"  [WARN] SHAP init failed: {e}")
                self.shap_available = False

    def explain_prediction(self, X_single, prediction_result: dict) -> dict:
        """
        Generate explanation for a single prediction.
        Returns top contributing features and their impact.
        """
        explanation = {
            "prediction": prediction_result.get("disaster_type", "Unknown"),
            "risk_score": prediction_result.get("risk_score", 0),
            "timestamp": datetime.utcnow().isoformat(),
            "method": "none",
            "top_features": [],
            "feature_impacts": {},
            "summary": "",
        }

        if self.shap_available and self.explainer is not None:
            explanation = self._explain_with_shap(X_single, prediction_result, explanation)
        else:
            explanation = self._explain_with_fallback(X_single, prediction_result, explanation)

        # Generate human-readable summary
        explanation["summary"] = self._generate_summary(explanation)
        return explanation

    def _explain_with_shap(self, X_single, prediction_result, explanation):
        """SHAP-based explanation."""
        import shap

        try:
            if isinstance(X_single, dict):
                X_array = np.array([[X_single.get(f, 0) for f in self.feature_names]])
            else:
                X_array = np.array(X_single).reshape(1, -1)

            shap_values = self.explainer.shap_values(X_array)

            # Get predicted class index
            pred_class = list(self.class_names).index(prediction_result.get("disaster_type", self.class_names[0]))

            if isinstance(shap_values, list):
                values = shap_values[pred_class][0]
            else:
                values = shap_values[0]

            # Build feature impact dict
            feature_impacts = {}
            for i, fname in enumerate(self.feature_names):
                feature_impacts[fname] = round(float(values[i]), 4)

            # Top features by absolute impact
            sorted_features = sorted(feature_impacts.items(), key=lambda x: abs(x[1]), reverse=True)
            top_features = [
                {"feature": name, "impact": impact, "direction": "increases risk" if impact > 0 else "decreases risk"}
                for name, impact in sorted_features[:10]
            ]

            explanation["method"] = "SHAP"
            explanation["top_features"] = top_features
            explanation["feature_impacts"] = feature_impacts

        except Exception as e:
            print(f"  SHAP explanation failed: {e}")
            explanation = self._explain_with_fallback(X_single, prediction_result, explanation)

        return explanation

    def _explain_with_fallback(self, X_single, prediction_result, explanation):
        """Fallback: use model's feature_importances_ if available."""
        try:
            importances = self.model.feature_importances_
            feature_impacts = {}
            for i, fname in enumerate(self.feature_names):
                if i < len(importances):
                    feature_impacts[fname] = round(float(importances[i]), 4)

            sorted_features = sorted(feature_impacts.items(), key=lambda x: abs(x[1]), reverse=True)
            top_features = [
                {"feature": name, "importance": imp}
                for name, imp in sorted_features[:10]
            ]

            explanation["method"] = "feature_importance"
            explanation["top_features"] = top_features
            explanation["feature_impacts"] = feature_impacts

        except AttributeError:
            explanation["method"] = "none"
            explanation["top_features"] = []
            explanation["summary"] = "No feature importance available for this model type."

        return explanation

    def _generate_summary(self, explanation):
        """Generate human-readable summary."""
        pred = explanation.get("prediction", "Unknown")
        score = explanation.get("risk_score", 0)
        top = explanation.get("top_features", [])

        if not top:
            return f"Predicted {pred} with risk score {score}."

        feature_strs = []
        for f in top[:5]:
            name = f.get("feature", "unknown").replace("_", " ")
            if "impact" in f:
                direction = f.get("direction", "")
                feature_strs.append(f"{name} ({direction})")
            else:
                feature_strs.append(name)

        features_text = ", ".join(feature_strs)
        summary = f"Predicted '{pred}' with risk score {score}/100. "
        summary += f"Key contributing factors: {features_text}."

        if score > 70:
            summary += " IMMEDIATE ACTION RECOMMENDED."
        elif score > 40:
            summary += " Monitoring and preparation advised."

        return summary

    def generate_report(self, X_single, prediction_result):
        """Generate a full explanation report (dict) suitable for storage/display."""
        explanation = self.explain_prediction(X_single, prediction_result)
        return {
            "report_id": datetime.utcnow().strftime("%Y%m%d%H%M%S"),
            "generated_at": datetime.utcnow().isoformat(),
            "prediction": prediction_result,
            "explanation": explanation,
        }
