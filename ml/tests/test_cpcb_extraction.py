"""
Ground-truth checks for extract_cpcb.py: values below were read by hand from
the raw PDF text. Each case covers a layout quirk (blank cells, values above
the station code, mislabelled header, regulatory-limit row, BDL tokens).

Run after scripts/extract_cpcb.py:  python -m unittest discover ml/tests
"""
import unittest
from pathlib import Path

import pandas as pd

CSV = Path(__file__).resolve().parents[1] / "data" / "processed" / "cpcb_water_quality.csv"

CASES = [
    # Same-line layout, nitrate is the last column in 2017.
    ("2017_Water_Ground_Water_2017.pdf", 26,
     dict(temp_min=25, ph_max=8.1, cond_max=1732, fc_max=2, tc_max=400, nitrate_max=4.21)),
    # Blank temperature and BOD cells must not shift later columns.
    ("2016_Water_Ground_Water_2016.pdf", 1516,
     dict(ph_min=8.5, ph_max=8.6, cond_min=557, nitrate_max=0.6, tc_max=400)),
    # Values printed above the station code.
    ("2016_Water_Ground_Water_2016.pdf", 1513,
     dict(temp_min=23, cond_min=1214, cond_max=1260, nitrate_max=1.9)),
    ("2022_Water_Quality_data_of_Med_Min_River_2022.pdf", 1448,
     dict(temp_min=25, do_min=6.2, cond_min=215, cond_max=365, fc_min=4, fc_max=28, tc_max=240)),
    ("2022_Water_Quality_data_of_Med_Min_River_2022.pdf", 4351,
     dict(do_min=5.5, cond_min=185, cond_max=416)),
    # Faecal streptococci cell blank.
    ("2023_Water_pond_tanks_2023.pdf", 5145,
     dict(temp_max=29, cond_max=1662, fc_min=127, fc_max=258, tc_max=921)),
    # Header labels for FC/TC swapped in the source PDF.
    ("2019_NWMP_DATA_2019.pdf", 26,
     dict(do_min=3.9, cond_max=1841, fc_max=3, tc_max=400)),
    # Regulatory-limit row under the header; 'Mi'/'Ma' header words.
    ("2024_WQuality_River-Data-2024.pdf", 1001,
     dict(temp_max=18, cond_max=208, fc_min=23, fc_max=79, tc_max=280)),
    # BDL (below detection limit) parsed as 0.
    ("2022_WQuality_River-Data-2022.pdf", 1001,
     dict(cond_max=403, bod_max=0, fc_max=110, tc_max=540)),
]


class CpcbExtractionTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not CSV.exists():
            raise unittest.SkipTest(f"{CSV} missing; run ml/scripts/extract_cpcb.py first")
        cls.df = pd.read_csv(CSV)

    def test_ground_truth_rows(self):
        for source_file, code, expected in CASES:
            with self.subTest(file=source_file, station=code):
                rows = self.df[(self.df.source_file == source_file) & (self.df.station_code == code)]
                self.assertEqual(len(rows), 1, "station row missing")
                row = rows.iloc[0]
                for col, value in expected.items():
                    self.assertAlmostEqual(row[col], value, places=6, msg=col)

    def test_physical_consistency(self):
        df = self.df
        self.assertTrue(df.ph_max.dropna().between(0, 14).all())
        both = df.dropna(subset=["fc_max", "tc_max"])
        self.assertTrue((both.fc_max <= both.tc_max * 1.01).all(), "faecal coliform must not exceed total")
        for p in ["temp", "ph", "cond", "fc", "tc"]:
            pair = df.dropna(subset=[f"{p}_min", f"{p}_max"])
            self.assertTrue((pair[f"{p}_min"] <= pair[f"{p}_max"]).all(), p)

    def test_coverage(self):
        self.assertGreater(len(self.df), 20000)
        self.assertEqual(set(self.df.water_body), {"GROUNDWATER", "LAKE_POND", "RIVER"})
        self.assertEqual(self.df.duplicated(["year", "station_code", "water_body"]).sum(), 0)


if __name__ == "__main__":
    unittest.main()
