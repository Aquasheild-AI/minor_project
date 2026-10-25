"""
Module B - District water-borne outbreak risk (next 14 days).

Data:
  - EpiClim (Zenodo 14580510, CC-BY-4.0): IDSP weekly outbreak reports 2009-2022
    by district. Water-borne = acute diarrhoeal disease, cholera, gastroenteritis.
  - NASA POWER weekly climate per district centroid (download_climate.py).

Each row is a surveillance location in ISO week t; label = a water-borne
outbreak starts there in week t+1 or t+2. Features: aquashield_ml/outbreak.py.

Validation is forward in time: to score year Y the model is trained only on
earlier years. 2020-2022 are reported separately because IDSP outbreak
reporting dropped sharply during COVID-19, so missing outbreaks there are
partly missing reports. The final model is trained on 2009-2019.

Outputs: ml/models/outbreak_risk_model.joblib, ml/reports/outbreak_model_metrics.json
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, brier_score_loss, roc_auc_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from aquashield_ml import outbreak as ob  # noqa: E402

EPICLIM = ROOT / "data" / "raw" / "epiclim_final_data.csv"
CLIMATE = ROOT / "data" / "raw" / "climate" / "power_weekly.csv.gz"
FRAME_CACHE = ROOT / "data" / "processed" / "outbreak_training_frame.csv.gz"
MODEL_PATH = ROOT / "models" / "outbreak_risk_model.joblib"
REPORT_PATH = ROOT / "reports" / "outbreak_model_metrics.json"

RANDOM_STATE = 42
TEST_YEARS = range(2014, 2020)
COVID_YEARS = range(2020, 2023)
FINAL_TRAIN_LAST_YEAR = 2019

FEATURE_SETS = {
    "full": ob.FEATURES,
    "history_season_only": ob.HISTORY_FEATURES + ob.SEASON_FEATURES + ob.LOCATION_FEATURES,
    "climate_season_only": ob.CLIMATE_FEATURES + ob.SEASON_FEATURES + ob.LOCATION_FEATURES,
}


def make_gbm():
    return HistGradientBoostingClassifier(
        max_iter=300,
        learning_rate=0.05,
        max_leaf_nodes=31,
        min_samples_leaf=200,
        l2_regularization=1.0,
        early_stopping=True,
        validation_fraction=0.1,
        random_state=RANDOM_STATE,
    )


def make_logreg():
    return make_pipeline(SimpleImputer(strategy="median"), StandardScaler(), LogisticRegression(max_iter=2000))


def evaluate(y, p):
    order = np.argsort(-p)
    top = order[: max(1, len(p) // 10)]
    return {
        "n": int(len(y)),
        "positives": int(y.sum()),
        "base_rate": round(float(y.mean()), 5),
        "roc_auc": round(roc_auc_score(y, p), 4),
        "pr_auc": round(average_precision_score(y, p), 4),
        "brier": round(brier_score_loss(y, p), 5),
        # Share of all outbreaks that fall in the 10% of district-fortnights ranked riskiest.
        "top10pct_capture": round(float(y[top].sum() / max(1, y.sum())), 4),
    }


def summarize(per_year):
    keys = ["roc_auc", "pr_auc", "top10pct_capture"]
    return {k: round(float(np.mean([r[k] for r in per_year.values()])), 4) for k in keys}


def rolling_validation(frame, features, make_model):
    per_year = {}
    for year in TEST_YEARS:
        train = frame[frame.target_year < year]
        test = frame[frame.target_year == year]
        model = make_model().fit(train[features], train.label)
        per_year[year] = evaluate(test.label.to_numpy(), model.predict_proba(test[features])[:, 1])
    return per_year


def reliability(y, p, bins=10):
    """Mean predicted vs observed outbreak rate per predicted-risk decile."""
    df = pd.DataFrame({"y": y, "p": p})
    df["bin"] = pd.qcut(df.p.rank(method="first"), bins, labels=False)
    g = df.groupby("bin").agg(mean_predicted=("p", "mean"), observed_rate=("y", "mean"), n=("y", "size"))
    return g.round(5).reset_index().to_dict(orient="records")


def load_frame():
    if FRAME_CACHE.exists():
        return pd.read_csv(FRAME_CACHE)
    epi = pd.read_csv(EPICLIM)
    climate = pd.read_csv(CLIMATE)
    frame = ob.build_training_frame(epi, climate)
    FRAME_CACHE.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(FRAME_CACHE, index=False, float_format="%.5g", compression="gzip")
    return frame


def main():
    frame = load_frame()
    print(f"{len(frame)} location-weeks, {frame['loc'].nunique()} locations, "
          f"positives {int(frame.label.sum())} ({frame.label.mean():.3%})")

    results = {}
    for name, feats in FEATURE_SETS.items():
        per_year = rolling_validation(frame, feats, make_gbm)
        results[f"gbm_{name}"] = {"mean": summarize(per_year), "per_year": per_year}
        print(f"  gbm {name:20s} {results[f'gbm_{name}']['mean']}")
    per_year = rolling_validation(frame, ob.FEATURES, make_logreg)
    results["logreg_full"] = {"mean": summarize(per_year), "per_year": per_year}
    print(f"  logreg full               {results['logreg_full']['mean']}")

    train = frame[frame.target_year <= FINAL_TRAIN_LAST_YEAR]
    final = make_gbm().fit(train[ob.FEATURES], train.label)

    covid = {}
    for year in COVID_YEARS:
        test = frame[frame.target_year == year]
        covid[year] = evaluate(test.label.to_numpy(), final.predict_proba(test[ob.FEATURES])[:, 1])
    print(f"  COVID years (trained <=2019): " + str({y: (r['roc_auc'], r['pr_auc']) for y, r in covid.items()}))

    # Reliability of the forward predictions (pooled 2014-2019 test years).
    ys, ps = [], []
    for year in TEST_YEARS:
        tr = frame[frame.target_year < year]
        te = frame[frame.target_year == year]
        ys.append(te.label.to_numpy())
        ps.append(make_gbm().fit(tr[ob.FEATURES], tr.label).predict_proba(te[ob.FEATURES])[:, 1])
    y_fwd, p_fwd = np.concatenate(ys), np.concatenate(ps)
    calib = reliability(y_fwd, p_fwd)
    # Isotonic map from raw score to observed outbreak rate, learned on the
    # forward (out-of-time) predictions. Monotone, so rankings are unchanged.
    calibrator = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0).fit(p_fwd, y_fwd)
    calib_after = reliability(y_fwd, calibrator.predict(p_fwd))

    # Reference distribution of predicted probabilities: a live prediction's
    # risk score is its percentile among all historical district-fortnights.
    train_p = final.predict_proba(train[ob.FEATURES])[:, 1]
    reference_quantiles = np.quantile(train_p, np.linspace(0, 1, 1001)).tolist()

    epi = pd.read_csv(EPICLIM)
    events = ob.waterborne_events(epi)
    climate = pd.read_csv(CLIMATE)
    climate["loc"] = [ob.location_key(a, b) for a, b in zip(climate.lat, climate.lon)]
    climatologies = {
        loc: ob.climatology(ob.add_rolling_climate(g)).round(4).to_dict(orient="index")
        for loc, g in climate.groupby("loc")
    }
    locations = (
        epi.assign(loc=[ob.location_key(a, b) for a, b in zip(epi.Latitude, epi.Longitude)])
        .groupby("loc").agg(lat=("Latitude", "first"), lon=("Longitude", "first"),
                            district=("district", "first"), state=("state_ut", "first"))
        .reset_index()
    )

    report = {
        "model": "OutbreakRisk-HGB-v1",
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "sklearn_version": sklearn.__version__,
        "data": {
            "outbreaks": "EpiClim (Zenodo record 14580510, CC-BY-4.0), IDSP weekly outbreak reports 2009-2022",
            "climate": "NASA POWER daily T2M, PRECTOTCORR, RH2M aggregated to ISO weeks",
            "waterborne_outbreaks": int(len(events)),
            "locations": int(frame["loc"].nunique()),
            "location_weeks": int(len(frame)),
            "positive_rate": round(float(frame.label.mean()), 5),
        },
        "target": "water-borne outbreak (ADD, cholera, gastroenteritis) starting at the location in the next 2 weeks",
        "validation": "rolling origin: train on years < Y, test on Y, for Y in 2014-2019",
        "rolling_validation": results,
        "covid_years_trained_to_2019": covid,
        "reliability_2014_2019": calib,
        "reliability_2014_2019_after_isotonic_in_sample": calib_after,
        "experiments": {
            "extreme_rain_features": "precip_max_4w, precip_12w, heavy_weeks_8w (>75 mm), temp_max_4w added "
                                     "no signal (rolling 2016-2019 ROC-AUC 0.7606 vs 0.7616 without); not used.",
        },
        "final_training_years": f"{ob.HISTORY_START_YEAR}-{FINAL_TRAIN_LAST_YEAR}",
        "limitations": [
            "Labels are reported outbreaks: districts with weaker surveillance look safer than they are.",
            "2020-2022 reporting collapsed during COVID-19 and is excluded from the final training set.",
            "Climate is at district-centroid resolution (NASA POWER ~0.5 degree).",
            "Probabilities are of an outbreak being reported, not of individual infection.",
        ],
    }
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, indent=2, default=str))

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({
        "model": final,
        "features": ob.FEATURES,
        "reference_quantiles": reference_quantiles,
        "base_rate": float(train.label.mean()),
        "calibrator": calibrator,
        "history": ob.history_table(events),
        "last_data_year": int(epi.year.max()),
        "climatology": climatologies,
        "locations": locations,
        "metrics": {"rolling_mean": results["gbm_full"]["mean"]},
        "model_name": report["model"],
        "trained_at": report["trained_at"],
        "sklearn_version": sklearn.__version__,
    }, MODEL_PATH)
    print(f"Saved {MODEL_PATH} and {REPORT_PATH}")


if __name__ == "__main__":
    main()
