"""
Module A - water contamination risk: prediction for one field water test.
The model is trained by ml/scripts/train_water_model.py.
"""
from functools import lru_cache

import joblib
import numpy as np
import pandas as pd

from . import MODELS_DIR

MODEL_PATH = MODELS_DIR / "water_risk_model.joblib"

# App WaterSource.source_type -> NWMP water body the model was trained on.
SOURCE_TO_BODY = {
    "WELL": "GROUNDWATER",
    "TUBEWELL": "GROUNDWATER",
    "HANDPUMP": "GROUNDWATER",
    "RIVER": "RIVER",
    "POND": "LAKE_POND",
    # NWMP has no treated piped-supply stations; rural piped water in India is
    # mostly groundwater-sourced, so these are scored as groundwater and flagged.
    "TAP": "GROUNDWATER",
    "OTHER": "GROUNDWATER",
}
APPROXIMATED_SOURCES = {"TAP", "OTHER"}

FIELD_LABELS = {
    "ph": ("pH", ""),
    "temp_c": ("Water temperature", " °C"),
    "ec_us_cm": ("Dissolved solids (TDS)", " mg/L"),
    "do_mg_l": ("Dissolved oxygen", " mg/L"),
    "nitrate_n_mg_l": ("Nitrate", " mg/L"),
}


@lru_cache(maxsize=1)
def load_artifact(path=str(MODEL_PATH)):
    return joblib.load(path)


def _feature_row(artifact, ph, temperature, tds, dissolved_oxygen, nitrate, source_type):
    body = SOURCE_TO_BODY.get(source_type, "GROUNDWATER")
    row = {
        "ph": ph,
        "temp_c": temperature,
        "ec_us_cm": tds / artifact["tds_to_ec_ratio"] if tds is not None else np.nan,
        "do_mg_l": dissolved_oxygen if dissolved_oxygen is not None else np.nan,
        # App records nitrate as NO3 (BIS limit 45 mg/L); NWMP reports nitrate as N.
        "nitrate_n_mg_l": nitrate * artifact["nitrate_no3_to_n"] if nitrate is not None else np.nan,
    }
    for b in artifact["water_bodies"]:
        row[f"body_{b}"] = 1.0 if b == body else 0.0
    return pd.DataFrame([row])[artifact["features"]].astype(float), body


def severity(proba):
    """Expected WHO band (0 = LOW .. 3 = CRITICAL) as a 0-100 score."""
    return float(np.dot(proba, np.arange(len(proba))) / (len(proba) - 1) * 100)


def level_from_score(score, classes):
    """Nearest band to the expected band index, so score and level always agree."""
    idx = int(np.clip(np.round(score / 100 * (len(classes) - 1)), 0, len(classes) - 1))
    return classes[idx]


def predict(ph, temperature, tds, dissolved_oxygen=None, nitrate=None, source_type="HANDPUMP"):
    """
    Risk of faecal contamination for one field test.

    Returns risk_score (0-100), risk_level (LOW/MEDIUM/HIGH/CRITICAL, the WHO
    faecal-indicator bands), class probabilities and contributing_factors: the
    change in risk score when each reading is replaced by a typical value
    (positive = this reading raised the risk).
    """
    artifact = load_artifact()
    model, classes = artifact["model"], artifact["classes"]
    X, body = _feature_row(artifact, ph, temperature, tds, dissolved_oxygen, nitrate, source_type)
    proba = model.predict_proba(X)[0]
    score = severity(proba)

    contributions = {}
    for col, ref in artifact["reference_values"].items():
        if pd.isna(X.at[0, col]):
            continue
        X_ref = X.copy()
        X_ref.at[0, col] = ref
        contributions[col] = round(score - severity(model.predict_proba(X_ref)[0]), 1)

    return {
        "risk_score": round(score, 1),
        "risk_level": level_from_score(score, classes),
        "probabilities": {c: round(float(p), 4) for c, p in zip(classes, proba)},
        "probability_fc_over_100": round(float(proba[2:].sum()), 4),
        "water_body_used": body,
        "source_type_approximated": source_type in APPROXIMATED_SOURCES,
        "contributing_factors": dict(sorted(contributions.items(), key=lambda kv: -abs(kv[1]))),
        "model_name": artifact["model_name"],
        "trained_at": artifact["trained_at"],
    }


def describe_factor(feature, delta, value):
    label, unit = FIELD_LABELS[feature]
    direction = "raised" if delta > 0 else "lowered"
    return f"{label} ({value:g}{unit}) {direction} the risk by {abs(delta):.0f} points"
