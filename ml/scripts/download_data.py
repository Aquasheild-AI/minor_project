"""
Download the raw datasets used to train the AquaShield models.

  - EpiClim (Zenodo record 14580510, CC-BY-4.0): IDSP weekly outbreak reports 2009-2022
  - CPCB NWMP water quality PDFs 2016-2024 (rivers, lakes/ponds, groundwater)

The raw files are committed to the repo, so this is only needed to rebuild
from source. Climate is downloaded separately by download_climate.py.

cpcb.nic.in fails TLS negotiation with Windows' schannel (curl), so Python's
urllib/OpenSSL is used.
"""
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"

EPICLIM_URL = "https://zenodo.org/api/records/14580510/files/Final_data.csv/content"
CPCB_FILES = [
    "wqm/2016/Water_Ground_Water_2016.pdf",
    "wqm/2017/Water_Ground_Water_2017.pdf",
    "wqm/2018/NWMP_DATA_2018.pdf",
    *[f"wqm/{y}/NWMP_DATA_{y}.pdf" for y in (2019, 2020, 2021, 2022, 2024)],
    *[f"wqm/{y}/WQuality_River-Data-{y}.pdf" for y in range(2019, 2025)],
    *[f"wqm/{y}/Water_pond_tanks_{y}.pdf" for y in range(2019, 2025)],
    *[f"wqm/{y}/Water_Quality_data_of_River_{y}.pdf" for y in (2019, 2020, 2021)],
    *[f"wqm/{y}/Water_Quality_data_of_Med_Min_River_{y}.pdf" for y in (2022, 2023, 2024)],
]


def fetch(url, dest):
    if dest.exists():
        print(f"exists  {dest.name}")
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=300) as resp:
        dest.write_bytes(resp.read())
    print(f"fetched {dest.name}")


def main():
    fetch(EPICLIM_URL, RAW / "epiclim_final_data.csv")
    for path in CPCB_FILES:
        # Saved as <year>_<filename> because some files are re-published under later years.
        year, name = path.split("/")[1:]
        fetch(f"https://cpcb.nic.in/{path}", RAW / "cpcb" / f"{year}_{name}")


if __name__ == "__main__":
    main()
