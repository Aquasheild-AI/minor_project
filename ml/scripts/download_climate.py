"""
Download daily climate for every EpiClim district location from NASA POWER
and aggregate it to ISO weeks (complete weeks only).

Climate is fetched for all weeks, not only outbreak weeks, so positive and
negative training samples come from the same source.

Output: ml/data/raw/climate/power_weekly.csv.gz
  columns: lat, lon, iso_year, iso_week, temp_mean_c, precip_mm, humidity_pct
"""
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from aquashield_ml.climate import fetch_power_daily, to_weekly  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
EPICLIM = ROOT / "data" / "raw" / "epiclim_final_data.csv"
CACHE_DIR = ROOT / "data" / "raw" / "climate" / "location_cache"
OUT_PATH = ROOT / "data" / "raw" / "climate" / "power_weekly.csv.gz"

START, END = "20080101", "20221231"  # one extra year before EpiClim for lag features


def download_location(lat, lon):
    cache = CACHE_DIR / f"{lat:.4f}_{lon:.4f}.csv"
    if cache.exists():
        return pd.read_csv(cache)
    weekly = to_weekly(fetch_power_daily(lat, lon, START, END))
    weekly.insert(0, "lon", lon)
    weekly.insert(0, "lat", lat)
    weekly.to_csv(cache, index=False)
    return weekly


def main():
    if not EPICLIM.exists():
        sys.exit(f"{EPICLIM} missing. Run download_data.py first.")
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    epi = pd.read_csv(EPICLIM)
    locations = list(epi[["Latitude", "Longitude"]].round(4).drop_duplicates().itertuples(index=False))
    print(f"{len(locations)} locations")

    frames, failed = [], []
    # NASA POWER rate-limits (HTTP 429) above a few concurrent requests.
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = {pool.submit(download_location, lat, lon): (lat, lon) for lat, lon in locations}
        for i, fut in enumerate(as_completed(futures), 1):
            try:
                frames.append(fut.result())
            except Exception as exc:
                failed.append(futures[fut])
                print(f"FAILED {futures[fut]}: {exc}", flush=True)
            if i % 50 == 0:
                print(f"  {i}/{len(locations)}", flush=True)

    if failed:
        sys.exit(f"{len(failed)} locations failed; re-run to retry (finished ones are cached).")
    out = pd.concat(frames, ignore_index=True)
    # Round climate values only: lat/lon must keep 4 decimals to match EpiClim location keys.
    out[["temp_mean_c", "precip_mm", "humidity_pct"]] = out[["temp_mean_c", "precip_mm", "humidity_pct"]].round(3)
    out.to_csv(OUT_PATH, index=False, compression="gzip")
    print(f"Wrote {len(out)} location-weeks -> {OUT_PATH}")


if __name__ == "__main__":
    main()
