"""NASA POWER daily climate (MERRA-2 based; free, no API key) aggregated to ISO weeks."""
import json
import time
import urllib.request

import numpy as np
import pandas as pd

POWER_URL = (
    "https://power.larc.nasa.gov/api/temporal/daily/point"
    "?parameters=T2M,PRECTOTCORR,RH2M&community=AG"
    "&longitude={lon}&latitude={lat}&start={start}&end={end}&format=JSON"
)


PRECIP_INFLATION_FACTOR = 24.0


def correct_precip_scale(daily):
    """
    Undo a NASA POWER defect seen in October 2026: when a request's date range
    reaches into 2026, PRECTOTCORR for the whole response comes back exactly
    24x too large (e.g. Kolkata Jul-Oct 2022: 197.58 mm/day vs 8.23 mm/day
    from the same API with an earlier end date). Every affected value is a
    multiple of 0.24, a pattern genuine 0.01 mm-resolution data does not
    show, so the correction is applied only when that signature is present.
    Returns (daily, corrected).
    """
    precip = daily["PRECTOTCORR"].dropna()
    nonzero = precip[precip > 0]
    if len(nonzero) < 10:
        return daily, False
    on_grid = np.isclose(np.round(nonzero / 0.24) * 0.24, nonzero, atol=0.002).mean()
    if on_grid < 0.9:
        return daily, False
    daily = daily.copy()
    daily["PRECTOTCORR"] = daily["PRECTOTCORR"] / PRECIP_INFLATION_FACTOR
    return daily, True


def fetch_power_daily(lat, lon, start, end, retries=4, timeout=120):
    """
    Daily T2M (deg C), PRECTOTCORR (mm/day), RH2M (%) for one point.
    start/end are 'YYYYMMDD'. Missing values (-999) become NaN.
    df.attrs["precip_scale_corrected"] records whether correct_precip_scale applied.
    """
    url = POWER_URL.format(lat=round(lat, 4), lon=round(lon, 4), start=start, end=end)
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(url, timeout=timeout) as resp:
                params = json.load(resp)["properties"]["parameter"]
            df = pd.DataFrame(params)
            df.index = pd.to_datetime(df.index, format="%Y%m%d")
            df, corrected = correct_precip_scale(df.replace(-999.0, float("nan")))
            df.attrs["precip_scale_corrected"] = corrected
            return df
        except Exception:
            if attempt == retries - 1:
                raise
            time.sleep(5 * (attempt + 1))


def to_weekly(daily):
    """Aggregate daily climate to ISO weeks; incomplete weeks are dropped."""
    daily = daily.dropna()
    iso = daily.index.isocalendar()
    grouped = daily.groupby([iso.year, iso.week])
    weekly = grouped.agg(
        temp_mean_c=("T2M", "mean"),
        precip_mm=("PRECTOTCORR", "sum"),
        humidity_pct=("RH2M", "mean"),
    )
    weekly = weekly[grouped.size() == 7]
    weekly.index.names = ["iso_year", "iso_week"]
    return weekly.reset_index()
