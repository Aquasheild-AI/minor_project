"""Tests for the NASA POWER precipitation-scale correction (no network)."""
import sys
import unittest
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from aquashield_ml.climate import correct_precip_scale  # noqa: E402


def daily(precip):
    idx = pd.date_range("2026-07-01", periods=len(precip), freq="D")
    return pd.DataFrame({"T2M": 28.0, "PRECTOTCORR": precip, "RH2M": 85.0}, index=idx)


class PrecipScaleTest(unittest.TestCase):
    def setUp(self):
        rng = np.random.default_rng(0)
        # Genuine data: 0.01 mm resolution, mostly not multiples of 0.24.
        self.true = np.round(rng.gamma(0.8, 10, 90), 2)
        self.true[rng.random(90) < 0.3] = 0.0

    def test_inflated_series_is_divided_by_24(self):
        inflated = np.round(self.true * 100) * 0.24  # what the defective API returns
        fixed, corrected = correct_precip_scale(daily(inflated))
        self.assertTrue(corrected)
        np.testing.assert_allclose(fixed.PRECTOTCORR.to_numpy(), np.round(self.true * 100) / 100, atol=1e-9)

    def test_genuine_series_is_untouched(self):
        fixed, corrected = correct_precip_scale(daily(self.true))
        self.assertFalse(corrected)
        np.testing.assert_array_equal(fixed.PRECTOTCORR.to_numpy(), self.true)

    def test_dry_spell_is_untouched(self):
        # Too few rainy days to judge the signature.
        dry = np.zeros(60)
        dry[:5] = 0.24
        _, corrected = correct_precip_scale(daily(dry))
        self.assertFalse(corrected)

    def test_training_climate_is_not_inflated(self):
        path = Path(__file__).resolve().parents[1] / "data" / "raw" / "climate" / "power_weekly.csv.gz"
        if not path.exists():
            self.skipTest("climate data not downloaded")
        weekly = pd.read_csv(path)
        nonzero = weekly.precip_mm[weekly.precip_mm > 0]
        on_grid = np.isclose(np.round(nonzero / 0.24) * 0.24, nonzero, atol=0.002).mean()
        self.assertLess(on_grid, 0.2)
        annual = weekly.groupby(["lat", "lon", "iso_year"]).precip_mm.sum().median()
        self.assertTrue(300 < annual < 3000, f"median annual rainfall {annual:.0f} mm is implausible")


if __name__ == "__main__":
    unittest.main()
