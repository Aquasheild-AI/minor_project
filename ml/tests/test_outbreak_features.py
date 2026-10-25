"""
Train/serve consistency: the vectorised training features
(outbreak.build_training_frame) must equal the row-by-row features used for
live predictions (outbreak.features_for_week).

Run:  python -m unittest discover ml/tests
"""
import sys
import unittest
from pathlib import Path

import numpy as np
import pandas as pd

ML_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML_ROOT))
from aquashield_ml import outbreak as ob  # noqa: E402

EPICLIM = ML_ROOT / "data" / "raw" / "epiclim_final_data.csv"
CLIMATE = ML_ROOT / "data" / "raw" / "climate" / "power_weekly.csv.gz"


class OutbreakFeatureConsistencyTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not (EPICLIM.exists() and CLIMATE.exists()):
            raise unittest.SkipTest("raw data missing; run ml/scripts/download_data.py and download_climate.py")
        epi = pd.read_csv(EPICLIM)
        climate = pd.read_csv(CLIMATE)
        rng = np.random.default_rng(0)
        # A handful of locations keeps the test fast.
        locs = epi[["Latitude", "Longitude"]].drop_duplicates().sample(8, random_state=1)
        keys = {ob.location_key(a, b) for a, b in zip(locs.Latitude, locs.Longitude)}
        climate["loc"] = [ob.location_key(a, b) for a, b in zip(climate.lat, climate.lon)]
        cls.climate = climate[climate["loc"].isin(keys)]
        cls.epi = epi
        cls.frame = ob.build_training_frame(epi, cls.climate.drop(columns="loc"))
        cls.sample = cls.frame.iloc[rng.choice(len(cls.frame), 300, replace=False)]

    def test_vectorised_matches_row_by_row(self):
        events = ob.waterborne_events(self.epi)
        hist = ob.history_table(events)
        last_year = int(self.epi.year.max())
        coords = {ob.location_key(a, b): (a, b) for a, b in zip(self.epi.Latitude, self.epi.Longitude)}
        for loc, rows in self.sample.groupby("loc"):
            weekly = ob.add_rolling_climate(self.climate[self.climate["loc"] == loc])
            clim = ob.climatology(weekly)
            lat, lon = coords[loc]
            indexed = weekly.set_index(["iso_year", "iso_week"])
            for r in rows.itertuples():
                week_row = indexed.loc[(r.iso_year, r.iso_week)].copy()
                week_row["iso_year"], week_row["iso_week"] = r.iso_year, r.iso_week
                live = ob.features_for_week(week_row, clim, hist, loc, lat, lon, last_year)
                for name in ob.FEATURES:
                    expected = getattr(r, name)
                    with self.subTest(loc=loc, week=(r.iso_year, r.iso_week), feature=name):
                        if pd.isna(expected):
                            self.assertTrue(pd.isna(live[name]))
                        else:
                            self.assertAlmostEqual(live[name], expected, places=6)

    def test_label_is_next_two_weeks(self):
        events = ob.waterborne_events(self.epi)
        event_weeks = set(zip(events["loc"], events.iso_year, events.iso_week))
        for r in self.sample.itertuples():
            start = ob.week_start(r.iso_year, r.iso_week)
            upcoming = [(start + pd.Timedelta(weeks=h)).isocalendar() for h in (1, 2)]
            expected = int(any((r.loc, int(y), int(w)) in event_weeks for y, w, _ in upcoming))
            self.assertEqual(r.label, expected)

    def test_history_uses_only_prior_years(self):
        # A location's hist_rate for target year Y must not change if year >= Y is altered.
        row = self.sample.iloc[0]
        events = ob.waterborne_events(self.epi)
        hist = ob.history_table(events)
        year, month = ob.target_period(row.iso_year, row.iso_week)
        before = ob.history_features(hist, row["loc"], year, month, 2022)
        future = pd.DataFrame([{"loc": row["loc"], "cal_year": year, "month": month, "n": 999}])
        after = ob.history_features(pd.concat([hist, future]), row["loc"], year, month, 2022)
        self.assertEqual(before, after)


if __name__ == "__main__":
    unittest.main()
