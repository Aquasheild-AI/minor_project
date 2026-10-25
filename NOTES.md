# ML work: status notes

Branch: `feature/ml-risk-models`, created from `origin/feature/risk-model-architecture`. It is committed locally (`1fad666`) but **not pushed** and there is no PR yet.

## Done and verified

- **Data (real, committed)**
  - `ml/data/raw/cpcb/*.pdf`: 26 CPCB NWMP PDFs, 2016–2024.
  - `ml/data/raw/epiclim_final_data.csv`: EpiClim/IDSP outbreaks, 2009–2022.
  - `ml/data/raw/climate/power_weekly.csv.gz`: NASA POWER weekly climate for 732 locations.
- **PDF extraction** (`ml/scripts/extract_cpcb.py`): produces `ml/data/processed/cpcb_water_quality.csv` with 21,349 station-years. It is checked against hand-read PDF rows in `ml/tests/test_cpcb_extraction.py`.
- **Water model, Module A**
  - Code: `ml/scripts/train_water_model.py`; inference in `ml/aquashield_ml/water.py` (`predict`).
  - Saved model and metrics: `ml/models/water_risk_model.joblib`, `ml/reports/water_model_metrics.json`.
  - Grouped CV: macro-F1 0.58, AUC(FC>100) 0.87. Forward-in-time on unseen stations: F1 0.50, AUC 0.78.
  - Sanity cases behave sensibly: low DO and high nitrate always raise risk.
- **Outbreak model, Module B**
  - Code: `ml/scripts/train_outbreak_model.py`; features and live inference in `ml/aquashield_ml/outbreak.py` (`build_training_frame`, `features_for_week`, `predict_live`).
  - Rolling-origin results for 2014–19: ROC-AUC 0.764, PR-AUC 0.078 (base rate 0.019), top-10% capture 37.6%.
- **NASA POWER defect**: any request whose range reaches into 2026 returns `PRECTOTCORR` 24× too large. This is detected and corrected in `ml/aquashield_ml/climate.py` (`correct_precip_scale`) and tested in `ml/tests/test_climate.py`.
- **ML tests**: `python -m unittest discover ml/tests` runs 10 tests, all OK. This includes the check that training features equal the live features.
- **Backend tests**: `cd backend && python manage.py test` runs 19 tests, all OK: the 9 existing ones plus 10 new ones in `backend/aquacare/test_risk.py`. The new tests cover:
  - `ml_service.refresh_village_water_risk`
  - `ml_service.refresh_district_risk`, using supplied climate
  - the lab E. coli override and alerts
  - `/api/risk/*` permissions
  - the climate-outage path, which stores nothing

## Half-done or untested

- **Frontend: not wired yet.** Done so far:
  - types added in `frontend/src/types/index.ts` (`WaterRiskPrediction`, `DiseaseRiskPrediction`, `ModelInfo`, `ApiVillage`)
  - `frontend/src/services/riskApi.ts` (`riskApi.*`, `toRiskLevel`)
  - `villageId` / `assignedVillageIds` added to `transformUser` in `frontend/src/hooks/useAuth.tsx`

  These type-check cleanly. The pages still use mock data:
  - `features/risk/RiskPredictionPage.tsx`
  - `features/worker/WorkerRiskAnalysis.tsx`
  - `features/community/CommunityRiskStatus.tsx`

  The planned shared components in `frontend/src/components/risk/` do not exist yet. `npm run typecheck` has about 96 errors in other, unrelated pages (AdminPage, VillagesPage, WaterQualityPage, …). None are in the new files.
- **Backend live path not exercised end-to-end through Django.** The tests mock or supply climate. The following have not been run against a real database or NASA:
  - `ml_service.refresh_all`
  - the command `python manage.py run_risk_predictions`
  - `POST /api/risk/refresh/`
- **Not yet in `backend/requirements.txt`**: `scikit-learn==1.9.0`, `pandas`, `numpy`, `joblib`, and `duckdb`, which was already missing. The backend needs these to load the models.
- The local `backend/db.sqlite3` still needs `python manage.py migrate`, because migration `0003` comes from the WIP branch.

## Model retrain status

- **Last outbreak retrain** (with isotonic calibration and `base_rate`): completed, exit code 0.
  - Saved to `ml/models/outbreak_risk_model.joblib` and `ml/reports/outbreak_model_metrics.json`.
  - Log, outside the repo, may be deleted: `C:\Users\MAYUKH\AppData\Local\Temp\claude\C--Users-MAYUKH-Documents-GitHub-minor-project\4018110f-6419-440e-9166-f43013891371\tasks\b1e9web1t.output`.
  - Metrics are identical to the previous run, since training is deterministic.
- **Water model**: last trained and saved to `ml/models/water_risk_model.joblib` and `ml/reports/water_model_metrics.json`.
- **Rerun training**: `python ml/scripts/train_water_model.py` and `python ml/scripts/train_outbreak_model.py`. The outbreak run takes about 15 minutes.
- **Rerun the live NASA POWER prediction test** from the repo root. It needs internet and should print `corrected=True` while the NASA defect persists:

```bash
cd ml && PYTHONIOENCODING=utf-8 python -c "
import sys; sys.path.insert(0,'.')
from aquashield_ml import outbreak as ob
for n,la,lo in [('Kolkata',22.57,88.36),('Guwahati',26.14,91.74),('Jaisalmer',26.91,70.92),('Chennai',13.08,80.27)]:
    r=ob.predict_live(la,lo); f=r['features']
    print(n, r['outbreak_probability'], r['risk_score'], r['risk_level'], 'corrected=', r['precip_scale_corrected'], 'rain4w=', round(f['precip_4w']), 'anom=', round(f['precip_4w_anom']))
"
```

  Note: the calibrated retrain finished after the last live run, so re-check that `outbreak_probability` values look plausible. Expect roughly 0.2–1% in late October.

## Next steps, in order

1. Add `scikit-learn==1.9.0`, `pandas`, `numpy`, `joblib` and `duckdb` to `backend/requirements.txt`.
2. Run the live NASA test above against the calibrated model.
3. Run `cd backend && python manage.py migrate && python manage.py run_risk_predictions` against a database with villages and water tests, and check the stored predictions and alerts.
4. Build `frontend/src/components/risk/` (water risk card, district outbreak card, model info card). Rewire `RiskPredictionPage`, `WorkerRiskAnalysis` and `CommunityRiskStatus` to `riskApi`, then run `npm run lint` and `npm run typecheck`.
5. Commit, push `feature/ml-risk-models` and open a PR into `feature/risk-model-architecture` or `main`. The commit includes about 160 MB of raw data and PDFs, as requested.
