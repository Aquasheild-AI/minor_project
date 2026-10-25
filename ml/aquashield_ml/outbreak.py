"""
Module B - district water-borne outbreak risk: feature engineering shared by
training (ml/scripts/train_outbreak_model.py) and live prediction (backend).

Unit: one surveillance location (an EpiClim district centroid) in one ISO
week t. Target: a water-borne outbreak (acute diarrhoeal disease, cholera,
gastroenteritis) starts at that location in week t+1 or t+2 (next 14 days).

Every feature is computable live from data available at the end of week t:
  - climate up to week t (NASA POWER),
  - season of the target weeks,
  - the location's outbreak history from complete years before the target year.
No "recent outbreak" features are used: EpiClim ends in 2022, so they could
not be computed for today's date.
"""
import math

import numpy as np
import pandas as pd

WATERBORNE_PATTERN = r"diarr|cholera|gastro"
HISTORY_START_YEAR = 2009  # first year of EpiClim / IDSP digitised reports
HORIZON_WEEKS = 2

CLIMATE_FEATURES = [
    "precip_1w", "precip_2w", "precip_4w", "precip_8w", "precip_4w_anom",
    "temp_1w", "temp_4w", "temp_4w_anom", "humidity_2w",
]
SEASON_FEATURES = ["woy_sin", "woy_cos"]
LOCATION_FEATURES = ["lat", "lon"]
HISTORY_FEATURES = ["hist_rate", "hist_season_rate"]
FEATURES = CLIMATE_FEATURES + SEASON_FEATURES + LOCATION_FEATURES + HISTORY_FEATURES


def location_key(lat, lon):
    return f"{lat:.4f}_{lon:.4f}"


def waterborne_events(epiclim):
    """EpiClim rows for water-borne diseases, dated by outbreak start."""
    df = epiclim[epiclim.Disease.str.contains(WATERBORNE_PATTERN, case=False, regex=True)].copy()
    df["start_date"] = pd.to_datetime(dict(year=df.year, month=df.mon, day=df.day))
    iso = df.start_date.dt.isocalendar()
    df["iso_year"], df["iso_week"] = iso.year.astype(int), iso.week.astype(int)
    df["loc"] = [location_key(a, b) for a, b in zip(df.Latitude, df.Longitude)]
    return df


def history_table(events):
    """Outbreak counts per (location, calendar year, month of start)."""
    return (
        events.assign(cal_year=events.start_date.dt.year, month=events.start_date.dt.month)
        .groupby(["loc", "cal_year", "month"]).size().rename("n").reset_index()
    )


def history_features(hist, loc, target_year, target_month, last_data_year):
    """
    Outbreaks per year at `loc`, using only complete years before target_year
    (and no later than the last year in the data). NaN when no prior year exists.
    """
    first, last = HISTORY_START_YEAR, min(target_year - 1, last_data_year)
    n_years = last - first + 1
    if n_years <= 0:
        return {"hist_rate": np.nan, "hist_season_rate": np.nan}
    rows = hist[(hist["loc"] == loc) & (hist.cal_year >= first) & (hist.cal_year <= last)]
    months = {(target_month + k - 1) % 12 + 1 for k in (-1, 0, 1)}
    return {
        "hist_rate": rows.n.sum() / n_years,
        "hist_season_rate": rows[rows.month.isin(months)].n.sum() / n_years,
    }


def add_rolling_climate(weekly):
    """
    weekly: one location's consecutive ISO weeks with temp_mean_c, precip_mm,
    humidity_pct (sorted). Adds trailing-window features ending at each week.
    """
    w = weekly.sort_values(["iso_year", "iso_week"]).reset_index(drop=True).copy()
    p, t, h = w.precip_mm, w.temp_mean_c, w.humidity_pct
    w["precip_1w"] = p
    w["precip_2w"] = p.rolling(2).sum()
    w["precip_4w"] = p.rolling(4).sum()
    w["precip_8w"] = p.rolling(8).sum()
    w["temp_1w"] = t
    w["temp_4w"] = t.rolling(4).mean()
    w["humidity_2w"] = h.rolling(2).mean()
    return w


def climatology(weekly_with_rolling):
    """Per ISO week means used for anomalies (climate only, no outbreak labels)."""
    return (
        weekly_with_rolling.groupby("iso_week")[["precip_4w", "temp_4w"]].mean()
        .rename(columns={"precip_4w": "clim_precip_4w", "temp_4w": "clim_temp_4w"})
    )


def week_start(iso_year, iso_week):
    return pd.Timestamp.fromisocalendar(int(iso_year), int(iso_week), 1)


def season_features(iso_week):
    angle = 2 * math.pi * (iso_week - 1) / 52.0
    return {"woy_sin": math.sin(angle), "woy_cos": math.cos(angle)}


def target_period(iso_year, iso_week):
    """Calendar year and month of the middle of the prediction window (weeks t+1..t+2)."""
    mid = week_start(iso_year, iso_week) + pd.Timedelta(days=7 * 1 + 7)
    return mid.year, mid.month


def features_for_week(row, clim, hist, loc, lat, lon, last_data_year):
    """Feature dict for one location at the end of ISO week (row.iso_year, row.iso_week)."""
    clim_row = clim.loc[int(row.iso_week)] if int(row.iso_week) in clim.index else None
    feats = {name: row[name] for name in
             ["precip_1w", "precip_2w", "precip_4w", "precip_8w", "temp_1w", "temp_4w", "humidity_2w"]}
    feats["precip_4w_anom"] = row.precip_4w - clim_row.clim_precip_4w if clim_row is not None else np.nan
    feats["temp_4w_anom"] = row.temp_4w - clim_row.clim_temp_4w if clim_row is not None else np.nan
    feats.update(season_features(int(row.iso_week)))
    feats["lat"], feats["lon"] = lat, lon
    year, month = target_period(row.iso_year, row.iso_week)
    feats.update(history_features(hist, loc, year, month, last_data_year))
    return feats


def build_training_frame(epiclim, weekly_climate):
    """
    Vectorised equivalent of features_for_week over every location-week, plus
    the label. Rows whose target window falls outside the EpiClim period are
    dropped. tests/test_outbreak_features.py checks it against features_for_week.
    """
    events = waterborne_events(epiclim)
    hist = history_table(events)
    last_data_year = int(epiclim.year.max())
    locations = (
        epiclim.assign(loc=[location_key(a, b) for a, b in zip(epiclim.Latitude, epiclim.Longitude)])
        .groupby("loc")[["Latitude", "Longitude"]].first()
    )
    weekly_climate = weekly_climate.assign(
        loc=[location_key(a, b) for a, b in zip(weekly_climate.lat, weekly_climate.lon)]
    )
    event_weeks = set(zip(events["loc"], events.iso_year, events.iso_week))

    # Outbreak counts per location as a (year, month) grid for prefix sums.
    years = np.arange(HISTORY_START_YEAR, last_data_year + 1)
    grid = {}
    for loc, g in hist.groupby("loc"):
        arr = np.zeros((len(years), 12))
        for r in g.itertuples():
            if HISTORY_START_YEAR <= r.cal_year <= last_data_year:
                arr[r.cal_year - HISTORY_START_YEAR, r.month - 1] += r.n
        grid[loc] = arr

    frames = []
    for loc, wk in weekly_climate.groupby("loc"):
        if loc not in locations.index:
            continue
        lat, lon = locations.loc[loc]
        w = add_rolling_climate(wk)
        clim = climatology(w)
        w = w.join(clim, on="iso_week")
        w["precip_4w_anom"] = w.precip_4w - w.clim_precip_4w
        w["temp_4w_anom"] = w.temp_4w - w.clim_temp_4w
        angle = 2 * np.pi * (w.iso_week - 1) / 52.0
        w["woy_sin"], w["woy_cos"] = np.sin(angle), np.cos(angle)
        w["lat"], w["lon"] = lat, lon

        # Label: outbreak starting in week t+1 or t+2 (weeks are consecutive).
        has_event = np.array([(loc, y, k) in event_weeks for y, k in zip(w.iso_year, w.iso_week)])
        label = np.zeros(len(w), dtype=int)
        for h in range(1, HORIZON_WEEKS + 1):
            label[:-h] |= has_event[h:]
        w["label"] = label

        # History from complete years before the target year.
        starts = [week_start(y, k) + pd.Timedelta(days=14) for y, k in zip(w.iso_year, w.iso_week)]
        t_year = np.array([s.year for s in starts])
        t_month = np.array([s.month for s in starts])
        arr = grid.get(loc, np.zeros((len(years), 12)))
        cum_year = np.vstack([np.zeros((1, 12)), np.cumsum(arr, axis=0)])  # cum_year[i] = years < first+i
        last_idx = np.clip(np.minimum(t_year - 1, last_data_year) - HISTORY_START_YEAR + 1, 0, len(years))
        n_years = last_idx.astype(float)
        totals = cum_year[last_idx]  # (rows, 12) counts per month over prior years
        months_idx = np.stack([(t_month - 2) % 12, t_month - 1, t_month % 12], axis=1)
        season = np.take_along_axis(totals, months_idx, axis=1).sum(axis=1)
        with np.errstate(invalid="ignore", divide="ignore"):
            w["hist_rate"] = np.where(n_years > 0, totals.sum(axis=1) / n_years, np.nan)
            w["hist_season_rate"] = np.where(n_years > 0, season / n_years, np.nan)

        w["loc"] = loc
        w["target_year"] = t_year
        # Keep weeks whose whole target window lies inside the EpiClim period.
        end_weeks = [week_start(y, k) + pd.Timedelta(days=7 * (HORIZON_WEEKS + 1) - 1)
                     for y, k in zip(w.iso_year, w.iso_week)]
        inside = (np.array([s.year for s in starts]) >= HISTORY_START_YEAR) & \
                 (np.array([e.year for e in end_weeks]) <= last_data_year)
        frames.append(w[inside & w.precip_8w.notna().to_numpy()])

    out = pd.concat(frames, ignore_index=True)
    return out[["loc", "iso_year", "iso_week", "target_year"] + FEATURES + ["label"]]


# ---------------------------------------------------------------------------
# Live prediction
# ---------------------------------------------------------------------------

MODEL_FILENAME = "outbreak_risk_model.joblib"
LIVE_WEEKS = 12
MAX_PLAUSIBLE_WEEKLY_PRECIP_MM = 2500.0
# Percentile of historical district-fortnights (2009-2019) -> risk level.
LEVEL_PERCENTILES = [("CRITICAL", 95.0), ("HIGH", 85.0), ("MEDIUM", 60.0), ("LOW", 0.0)]


class ClimateUnavailable(Exception):
    """Recent climate could not be fetched or is incomplete; no prediction is made."""


def load_artifact(path=None):
    import joblib
    from . import MODELS_DIR

    global _ARTIFACT
    if path is None and "_ARTIFACT" in globals():
        return _ARTIFACT
    artifact = joblib.load(path or MODELS_DIR / MODEL_FILENAME)
    if path is None:
        _ARTIFACT = artifact
    return artifact


def haversine_km(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(np.radians, (lat1, lon1, lat2, lon2))
    a = np.sin((lat2 - lat1) / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin((lon2 - lon1) / 2) ** 2
    return 6371.0 * 2 * np.arcsin(np.sqrt(a))


def nearest_location(artifact, lat, lon):
    locs = artifact["locations"]
    dist = haversine_km(lat, lon, locs.lat.to_numpy(), locs.lon.to_numpy())
    i = int(np.argmin(dist))
    return locs.iloc[i], float(dist[i])


def recent_weekly_climate(lat, lon, as_of=None):
    """Last complete ISO weeks of NASA POWER climate ending on or before as_of."""
    from .climate import fetch_power_daily, to_weekly

    end = pd.Timestamp(as_of or pd.Timestamp.utcnow().tz_localize(None)).normalize()
    start = end - pd.Timedelta(weeks=LIVE_WEEKS + 2)
    try:
        daily = fetch_power_daily(lat, lon, start.strftime("%Y%m%d"), end.strftime("%Y%m%d"), retries=2, timeout=30)
    except Exception as exc:
        raise ClimateUnavailable(f"NASA POWER request failed: {exc}") from exc
    weekly = to_weekly(daily)
    weekly.attrs["precip_scale_corrected"] = daily.attrs.get("precip_scale_corrected", False)
    if len(weekly) < 8:
        raise ClimateUnavailable(f"only {len(weekly)} complete weeks of recent climate available")
    # The wettest weeks on record in India are ~2,500 mm (Cherrapunji); anything
    # above that means the feed is broken, so refuse rather than predict on it.
    if (weekly.precip_mm > MAX_PLAUSIBLE_WEEKLY_PRECIP_MM).any():
        raise ClimateUnavailable("implausible weekly rainfall in NASA POWER response")
    # Rolling windows need consecutive weeks: keep the latest unbroken run.
    starts = [week_start(y, w) for y, w in zip(weekly.iso_year, weekly.iso_week)]
    gaps = np.diff(starts) != pd.Timedelta(weeks=1)
    run_start = (np.where(gaps)[0][-1] + 1) if gaps.any() else 0
    corrected = weekly.attrs["precip_scale_corrected"]
    weekly = weekly.iloc[run_start:]
    weekly.attrs["precip_scale_corrected"] = corrected
    if len(weekly) < 8:
        raise ClimateUnavailable("recent climate has gaps; fewer than 8 consecutive weeks")
    return weekly


def risk_percentile(artifact, probability):
    quantiles = np.asarray(artifact["reference_quantiles"])
    return float(np.interp(probability, quantiles, np.linspace(0, 100, len(quantiles))))


def level_for_percentile(pct):
    for level, threshold in LEVEL_PERCENTILES:
        if pct >= threshold:
            return level
    return "LOW"


def predict_live(lat, lon, as_of=None, weekly=None):
    """
    Outbreak risk for the next 14 days near (lat, lon).

    `weekly` may be passed (e.g. in tests) instead of fetching NASA POWER.
    Raises ClimateUnavailable when recent climate cannot be obtained.
    """
    artifact = load_artifact()
    loc_row, distance_km = nearest_location(artifact, lat, lon)
    loc = location_key(loc_row.lat, loc_row.lon)
    if weekly is None:
        weekly = recent_weekly_climate(loc_row.lat, loc_row.lon, as_of)
    w = add_rolling_climate(weekly)
    last = w.iloc[-1]
    clim = pd.DataFrame.from_dict(artifact["climatology"][loc], orient="index")
    clim.index = clim.index.astype(int)
    feats = features_for_week(last, clim, artifact["history"], loc, loc_row.lat, loc_row.lon,
                              artifact["last_data_year"])
    X = pd.DataFrame([feats])[artifact["features"]].astype(float)
    model = artifact["model"]
    raw = float(model.predict_proba(X)[0, 1])
    # Percentile uses the raw score (reference quantiles are raw); the shown
    # probability is calibrated to observed outbreak rates.
    pct = risk_percentile(artifact, raw)
    prob = float(artifact["calibrator"].predict([raw])[0]) if "calibrator" in artifact else raw

    # Contribution of recent weather: score change when rainfall / temperature
    # are reset to this location's normal for the time of year.
    normal = clim.loc[int(last.iso_week)] if int(last.iso_week) in clim.index else None
    factors = {}
    if normal is not None:
        rain_normal = X.copy()
        weekly_normal = normal.clim_precip_4w / 4
        for col, n in [("precip_1w", 1), ("precip_2w", 2), ("precip_4w", 4), ("precip_8w", 8)]:
            rain_normal[col] = weekly_normal * n
        rain_normal["precip_4w_anom"] = 0.0
        temp_normal = X.copy()
        temp_normal[["temp_1w", "temp_4w"]] = normal.clim_temp_4w
        temp_normal["temp_4w_anom"] = 0.0
        for name, Xn in [("recent_rainfall", rain_normal), ("recent_temperature", temp_normal)]:
            factors[name] = round(pct - risk_percentile(artifact, float(model.predict_proba(Xn)[0, 1])), 1)

    week_end = week_start(last.iso_year, last.iso_week) + pd.Timedelta(days=6)
    return {
        "outbreak_probability": round(prob, 4),
        "risk_score": round(pct, 1),
        "risk_level": level_for_percentile(pct),
        # Share of historical district-fortnights (2009-2019) with a reported outbreak.
        "base_rate": round(artifact["base_rate"], 4),
        "matched_location": {
            "district": loc_row.district, "state": loc_row.state,
            "lat": float(loc_row.lat), "lon": float(loc_row.lon), "distance_km": round(distance_km, 1),
        },
        "climate_week_ending": week_end.date().isoformat(),
        "precip_scale_corrected": bool(weekly.attrs.get("precip_scale_corrected", False)),
        "features": {k: (None if pd.isna(v) else round(float(v), 3)) for k, v in feats.items()},
        "contributing_factors": factors,
        "model_name": artifact["model_name"],
        "trained_at": artifact["trained_at"],
    }
