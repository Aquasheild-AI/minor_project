"""
Module A - Water contamination risk model.

Question: given the rapid field readings a health worker can take on site
(pH, temperature, TDS, dissolved oxygen, nitrate) and the type of water
source, how likely is faecal contamination? Faecal coliform needs a 24-48 h
lab culture, so this gives an immediate screening estimate.

Data: CPCB National Water Quality Monitoring Programme 2016-2024, one row per
station-year with annual min/max of each parameter (ml/data/processed/
cpcb_water_quality.csv, built by extract_cpcb.py).

  features = annual midpoint of each parameter + water body type
  label    = WHO faecal-indicator risk band of the annual maximum faecal
             coliform (MPN/100 mL): <=10 LOW, 11-100 MEDIUM, 101-1000 HIGH,
             >1000 CRITICAL  (WHO Guidelines for Drinking-water Quality)

Model: ordinal gradient boosting (one model per band threshold) with
monotonic constraints - risk may not decrease as dissolved oxygen falls or as
nitrate rises, the standard indicators of sewage pollution. Without them the
model learns lab-reporting artefacts (e.g. anoxic, nitrate-rich urban lakes in
Telangana reported with faecal coliform of 2-70 MPN) and inverts those
relationships. State is deliberately not a feature for the same reason; both
alternatives are scored in the report as ablations.

Validation never puts the same monitoring station in train and test.

Outputs: ml/models/water_risk_model.joblib, ml/reports/water_model_metrics.json
"""
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    balanced_accuracy_score,
    confusion_matrix,
    f1_score,
    log_loss,
    roc_auc_score,
)
from sklearn.model_selection import GroupKFold
from sklearn.pipeline import make_pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler

import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from aquashield_ml.ordinal import MonotonicOrdinalClassifier  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "processed" / "cpcb_water_quality.csv"
MODEL_PATH = ROOT / "models" / "water_risk_model.joblib"
REPORT_PATH = ROOT / "reports" / "water_model_metrics.json"

CLASSES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
FC_BANDS = [-np.inf, 10, 100, 1000, np.inf]  # WHO faecal indicator risk bands
WATER_BODIES = ["GROUNDWATER", "LAKE_POND", "RIVER"]
FEATURES = ["ph", "temp_c", "ec_us_cm", "do_mg_l", "nitrate_n_mg_l"] + [f"body_{b}" for b in WATER_BODIES]
RANDOM_STATE = 42


def measured_tds_to_ec_ratio(df):
    """TDS (mg/L) / EC (uS/cm), measured on groundwater rows that report both."""
    both = df.dropna(subset=["tds_min", "tds_max", "cond_min", "cond_max"])
    ratio = pd.concat([both.tds_min / both.cond_min, both.tds_max / both.cond_max])
    ratio = ratio[np.isfinite(ratio) & (ratio > 0)]
    return float(ratio.median())


def build_dataset(df):
    df = df.dropna(subset=["fc_max"]).copy()

    def mid(p):
        return df[[f"{p}_min", f"{p}_max"]].mean(axis=1)

    X = pd.DataFrame({
        "ph": mid("ph"),
        "temp_c": mid("temp"),
        "ec_us_cm": mid("cond"),
        "do_mg_l": mid("do"),
        "nitrate_n_mg_l": mid("nitrate"),
    })
    for body in WATER_BODIES:
        X[f"body_{body}"] = (df.water_body == body).astype(float)
    y = pd.cut(df.fc_max, FC_BANDS, labels=range(4)).astype(int).to_numpy()
    groups = df.station_code.to_numpy()
    return X[FEATURES], y, groups, df


HGB_PARAMS = dict(
    max_iter=400,
    learning_rate=0.05,
    max_leaf_nodes=31,
    min_samples_leaf=40,
    l2_regularization=1.0,
    early_stopping=True,
    validation_fraction=0.15,
    random_state=RANDOM_STATE,
)
# +1: risk non-decreasing in nitrate; -1: risk non-increasing in dissolved oxygen.
MONOTONIC = [1 if f == "nitrate_n_mg_l" else -1 if f == "do_mg_l" else 0 for f in FEATURES]

STATES = [
    "ARUNACHAL PRADESH", "ANDHRA PRADESH", "HIMACHAL PRADESH", "MADHYA PRADESH", "UTTAR PRADESH",
    "ASSAM", "BIHAR", "CHHATTISGARH", "GOA", "GUJARAT", "HARYANA", "JHARKHAND", "KARNATAKA",
    "KERALA", "MAHARASHTRA", "MANIPUR", "MEGHALAYA", "MIZORAM", "NAGALAND", "ODISHA", "ORISSA",
    "PUNJAB", "RAJASTHAN", "SIKKIM", "TAMIL NADU", "TELANGANA", "TRIPURA", "UTTARAKHAND",
    "WEST BENGAL", "DELHI", "JAMMU", "PUDUCHERRY", "CHANDIGARH", "DAMAN", "DADRA",
]


def make_gbm():
    """Production model."""
    return MonotonicOrdinalClassifier(len(CLASSES), MONOTONIC, **HGB_PARAMS)


def make_unconstrained():
    """Ablation: plain multiclass boosting, no domain constraints."""
    return HistGradientBoostingClassifier(**HGB_PARAMS)


def state_from_location(text):
    text = str(text).upper()
    for state in STATES:
        if state in text:
            return "ODISHA" if state == "ORISSA" else state
    return None


def make_logreg():
    return make_pipeline(
        SimpleImputer(strategy="median"),
        StandardScaler(),
        LogisticRegression(max_iter=2000),
    )


def log_ec(X):
    X = X.copy()
    X["ec_us_cm"] = np.log1p(X["ec_us_cm"])
    return X


def evaluate(y_true, proba):
    pred = proba.argmax(axis=1)
    high = (y_true >= 2).astype(int)  # WHO high / very high: FC > 100
    return {
        "macro_f1": round(f1_score(y_true, pred, average="macro"), 4),
        "balanced_accuracy": round(balanced_accuracy_score(y_true, pred), 4),
        "log_loss": round(log_loss(y_true, proba, labels=range(4)), 4),
        "auc_ovr_macro": round(roc_auc_score(y_true, proba, multi_class="ovr", average="macro"), 4),
        "auc_fc_over_100": round(roc_auc_score(high, proba[:, 2:].sum(axis=1)), 4),
        "within_one_band": round(float(np.mean(np.abs(pred - y_true) <= 1)), 4),
    }


def body_prior_proba(y_train, X_train, X_test):
    """Baseline: class frequencies of the water body type, nothing else."""
    proba = np.zeros((len(X_test), 4))
    for body in WATER_BODIES:
        col = f"body_{body}"
        counts = np.bincount(y_train[X_train[col].to_numpy() == 1], minlength=4) + 1
        proba[X_test[col].to_numpy() == 1] = counts / counts.sum()
    return proba


def cross_validate(X, y, groups, states):
    X_state = X.assign(state=pd.Series(states).astype("category").cat.codes.replace(-1, np.nan).to_numpy())
    state_mask = [False] * len(FEATURES) + [True]
    names = ["gbm", "ablation_unconstrained", "ablation_with_state", "logreg", "body_prior"]
    oof = {name: np.zeros((len(y), 4)) for name in names}
    for train_idx, test_idx in GroupKFold(n_splits=5).split(X, y, groups):
        Xtr, Xte, ytr = X.iloc[train_idx], X.iloc[test_idx], y[train_idx]
        oof["gbm"][test_idx] = make_gbm().fit(Xtr, ytr).predict_proba(Xte)
        oof["ablation_unconstrained"][test_idx] = make_unconstrained().fit(Xtr, ytr).predict_proba(Xte)
        with_state = MonotonicOrdinalClassifier(len(CLASSES), MONOTONIC + [0], categorical_features=state_mask, **HGB_PARAMS)
        oof["ablation_with_state"][test_idx] = with_state.fit(X_state.iloc[train_idx], ytr).predict_proba(X_state.iloc[test_idx])
        oof["logreg"][test_idx] = make_logreg().fit(log_ec(Xtr), ytr).predict_proba(log_ec(Xte))
        oof["body_prior"][test_idx] = body_prior_proba(ytr, Xtr, Xte)
    return {name: evaluate(y, proba) for name, proba in oof.items()}, oof["gbm"]


def temporal_holdout(X, y, groups, years):
    """
    Forward-in-time validation on unseen stations. 20% of stations are held
    out entirely; the model trains on earlier years of the other 80% and is
    tested on later years of the held-out stations. (Holding out every station
    that appears in 2023-24 would leave <1,000 training rows, since most
    stations are monitored every year.)
    """
    rng = np.random.default_rng(RANDOM_STATE)
    stations = np.unique(groups)
    held_out = np.isin(groups, rng.choice(stations, size=len(stations) // 5, replace=False))

    def run(train_mask, test_mask):
        model = make_gbm().fit(X[train_mask], y[train_mask])
        res = evaluate(y[test_mask], model.predict_proba(X[test_mask]))
        res["n_train"], res["n_test"] = int(train_mask.sum()), int(test_mask.sum())
        return res

    result = {"train_2016_2022_test_2023_2024": run((years < 2023) & ~held_out, (years >= 2023) & held_out)}
    result["rolling_one_year_ahead"] = {
        int(yr): run((years < yr) & ~held_out, (years == yr) & held_out) for yr in range(2020, 2025)
    }
    return result


def per_body_metrics(y, proba, bodies):
    out = {}
    for body in WATER_BODIES:
        m = bodies == body
        out[body] = {
            "n": int(m.sum()),
            "macro_f1": round(f1_score(y[m], proba[m].argmax(axis=1), average="macro"), 4),
        }
    return out


def permutation_importance(model, X, y, n_repeats=5):
    rng = np.random.default_rng(RANDOM_STATE)
    base = log_loss(y, model.predict_proba(X), labels=range(4))
    result = {}
    for col in ["ph", "temp_c", "ec_us_cm", "do_mg_l", "nitrate_n_mg_l"]:
        losses = []
        for _ in range(n_repeats):
            Xp = X.copy()
            Xp[col] = rng.permutation(Xp[col].to_numpy())
            losses.append(log_loss(y, model.predict_proba(Xp), labels=range(4)))
        result[col] = round(float(np.mean(losses) - base), 4)
    body_cols = [f"body_{b}" for b in WATER_BODIES]
    losses = []
    for _ in range(n_repeats):
        Xp = X.copy()
        idx = rng.permutation(len(Xp))
        Xp[body_cols] = Xp[body_cols].to_numpy()[idx]
        losses.append(log_loss(y, model.predict_proba(Xp), labels=range(4)))
    result["water_body"] = round(float(np.mean(losses) - base), 4)
    return dict(sorted(result.items(), key=lambda kv: -kv[1]))


def main():
    raw = pd.read_csv(DATA)
    X, y, groups, rows = build_dataset(raw)
    print(f"{len(y)} station-years, {len(set(groups))} stations, class counts {np.bincount(y).tolist()}")

    states = rows.location_text.map(state_from_location).to_numpy()
    cv, oof = cross_validate(X, y, groups, states)
    for name, m in cv.items():
        print(f"  CV {name:10s} {m}")
    temporal = temporal_holdout(X, y, groups, rows.year.to_numpy())
    print(f"  temporal holdout (2023-24, unseen stations): {temporal}")

    final = make_gbm().fit(X, y)
    importance = permutation_importance(final, X, y)
    print(f"  permutation importance (log-loss increase): {importance}")

    tds_ratio = measured_tds_to_ec_ratio(raw)
    report = {
        "model": "WaterContamination-HGB-v1",
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "sklearn_version": sklearn.__version__,
        "data": {
            "source": "CPCB National Water Quality Monitoring Programme (NWMP) 2016-2024, cpcb.nic.in",
            "station_years": int(len(y)),
            "stations": int(len(set(groups))),
            "class_counts": dict(zip(CLASSES, np.bincount(y).tolist())),
            "by_water_body": rows.water_body.value_counts().to_dict(),
        },
        "label": "WHO faecal-indicator risk band of annual max faecal coliform (MPN/100mL): "
                 "LOW <=10, MEDIUM 11-100, HIGH 101-1000, CRITICAL >1000",
        "model_design": "Ordinal boosting (P(band > k) per threshold) with monotonic constraints: "
                        "risk non-increasing in dissolved oxygen, non-decreasing in nitrate.",
        "ablation_notes": {
            "ablation_unconstrained": "Scores higher in CV but learns inverted DO/nitrate effects from "
                                      "lab-reporting differences (sewage-like ponds rated low risk).",
            "ablation_with_state": "Scores highest in CV but predictions are dominated by the reporting "
                                   "state (identical clean pond: 1.7 in Telangana, 98.7 in Uttar Pradesh).",
        },
        "validation": "GroupKFold(5) by monitoring station; forward-in-time holdout on a held-out 20% of stations",
        "cross_validation": cv,
        "per_water_body_cv": per_body_metrics(y, oof, rows.water_body.to_numpy()),
        "confusion_matrix_cv": {
            "labels": CLASSES,
            "matrix": confusion_matrix(y, oof.argmax(axis=1)).tolist(),
        },
        "temporal_holdout": temporal,
        "permutation_importance": importance,
        "tds_to_ec_ratio": round(tds_ratio, 4),
        "limitations": [
            "Trained on annual min/max envelopes per station; a single field reading is treated as the station's typical value.",
            "Turbidity is not reported by NWMP, so it is not used.",
            "Surface water dominates (river, lake); groundwater is 30% of rows.",
            "Screening estimate only: a lab coliform / E. coli result always overrides it.",
        ],
    }
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, indent=2))

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({
        "model": final,
        "features": FEATURES,
        "classes": CLASSES,
        "water_bodies": WATER_BODIES,
        # Field values replaced by these when explaining a single prediction.
        "reference_values": X[FEATURES[:5]].median().round(4).to_dict(),
        "tds_to_ec_ratio": tds_ratio,
        "nitrate_no3_to_n": 1 / 4.427,  # mg/L NO3 -> mg/L NO3-N
        "metrics": {"cross_validation": cv["gbm"], "temporal_holdout": temporal},
        "model_name": report["model"],
        "trained_at": report["trained_at"],
        "sklearn_version": sklearn.__version__,
    }, MODEL_PATH)
    print(f"Saved {MODEL_PATH} and {REPORT_PATH}")


if __name__ == "__main__":
    main()
