# AquaShield ML

There are two models, both trained on real Indian government data. Their predictions are saved by the Django backend (`backend/aquacare/ml_service.py`) and shown in the frontend.

| | Module A: water contamination risk | Module B: district outbreak risk |
|---|---|---|
| Question | How likely is faecal contamination of this water source, given rapid field readings? | How likely is a water-borne outbreak in this district in the next 14 days? |
| Unit | One water quality test (village level) | One district-week |
| Inputs | pH, temperature, TDS, dissolved oxygen, nitrate, source type | Rainfall, temperature and humidity over the last 1–8 weeks, season, the district's outbreak history |
| Output | WHO faecal-indicator band (LOW ≤10, MEDIUM 11–100, HIGH 101–1000, CRITICAL >1000 MPN/100 mL) plus a 0–100 score | Outbreak probability plus a percentile score against historical district-fortnights |
| Data | CPCB NWMP 2016–2024: 18,198 station-years, 3,901 stations | EpiClim/IDSP 2009–2022: 5,896 outbreaks at 732 locations, plus NASA POWER climate |
| Model | Ordinal gradient boosting with monotonic constraints (DO ↓ ⇒ risk ↑, nitrate ↑ ⇒ risk ↑) | Gradient boosting |
| Validation | Grouped CV by station, plus a forward-in-time test on unseen stations | Rolling forward by year: train on years before Y, test on Y (2014–2019) |

`reports/*_metrics.json` has the full metrics, baselines, ablations and limitations.

## Data sources

| File | Source | Licence |
|---|---|---|
| `data/raw/cpcb/*.pdf` | Central Pollution Control Board, National Water Quality Monitoring Programme (https://cpcb.nic.in/nwmp-data/) | Government of India open data |
| `data/raw/epiclim_final_data.csv` | EpiClim: weekly district-wise all-India multi-epidemics climate-health dataset, Zenodo record 14580510 (https://zenodo.org/records/14580510), built from IDSP weekly outbreak reports | CC-BY-4.0 |
| `data/raw/climate/power_weekly.csv.gz` | NASA POWER daily T2M, PRECTOTCORR and RH2M (https://power.larc.nasa.gov/), aggregated to ISO weeks | Public |

## Setup

```bash
pip install -r ml/requirements.txt
```

`scikit-learn` is pinned because the backend loads the pickled models: train and serve with the same version.

## Rebuild from scratch

The raw data, processed CSV and trained models are committed, so this is only needed to change something.

```bash
python ml/scripts/download_data.py        # EpiClim + CPCB PDFs (skips files that exist)
python ml/scripts/download_climate.py     # NASA POWER for 732 locations (~15 min, cached per location)
python ml/scripts/extract_cpcb.py         # PDFs -> data/processed/cpcb_water_quality.csv
python ml/scripts/train_water_model.py    # -> models/water_risk_model.joblib
python ml/scripts/train_outbreak_model.py # -> models/outbreak_risk_model.joblib
python -m unittest discover ml/tests      # extraction ground truth + train/serve feature consistency
```

## Layout

- `aquashield_ml/` is shared code imported by both the training scripts and the backend, so features are computed the same way in training and in production.
  - `water.py`: Module A prediction and per-reading explanations.
  - `outbreak.py`: Module B features, training frame and live prediction.
  - `climate.py`: NASA POWER client.
  - `ordinal.py`: monotonic ordinal classifier.
- `scripts/`: download, extraction and training.
- `tests/`: hand-checked PDF rows and the train/serve consistency test.

## Design notes and known limitations

- **PDF extraction.** NWMP PDFs change layout every year. Values are mapped to columns by x-position under the Min/Max header. Each station's row is assigned by two independent rules, and a row is kept only when the rules agree (two files use one verified rule). One PDF, `2019_NWMP_DATA_2019.pdf`, has its FC/TC headers swapped; this is corrected in the code, with the evidence in a comment.
- **Why monotonic constraints and no state feature (Module A).** Labs in different states report coliform very differently. Without constraints, the model learns that sewage-like chemistry (low DO, high nitrate) means *lower* risk, because some states report near-zero coliform for anoxic urban lakes. Adding state as a feature raises the CV score but makes the prediction depend mostly on which state's lab reported the data. Both variants are scored in the report as ablations.
- **Module A unit mismatch.** The model is trained on each station's annual min/max envelope, while the app sends a single reading. NWMP has no turbidity, and no treated piped-water stations: `TAP`/`OTHER` sources are scored as groundwater and flagged.
- **Module B labels are reported outbreaks.** Districts with weak surveillance look safer than they are. IDSP reporting collapsed in 2020–2022 (COVID-19), so those years are scored separately and excluded from final training.
- **Live use of Module B** needs the internet, to fetch recent NASA POWER climate. If that fails, the backend stores no prediction rather than a made-up one.
