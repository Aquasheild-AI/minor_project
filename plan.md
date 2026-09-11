# PROPOSED PLAN AWAITING HUMAN APPROVAL

## 1. REVISED STRATEGY OVERVIEW
This plan has been revised to ensure strict separation of the two ML modules (Water Quality vs. Regional Disease) and an honest "demo mode" ML service interface. We will enforce a **Single Source of Truth** for risk predictions, ensuring that ML outputs are not duplicated across models. We will not add unnecessary models (like a new `District` table) or rewrite the frontend. 

The focus remains strictly on a functional MVP for the September defense.

## 2. DATABASE & ARCHITECTURE AUDIT RESULTS

### Identifying Existing References to Risk Fields
Based on a codebase grep search, the following references were found and must be safely migrated:
- **`Village` Model**: 
  - `risk_level` (CharField) and `risk_score` (FloatField).
  - Used in: `VillageSerializer`, `VillageDetailSerializer`, `VillageAdmin`, and Dashboard aggregations (`views.py` lines 828-830 counting high/medium/low risk villages).
- **`RiskPrediction` Model**:
  - Used in: `serializers.py` (`RiskPredictionSerializer`), `views.py` (imports), `admin.py`, and `Alert.related_prediction` (ForeignKey).
- **Frontend References**:
  - `src/types/index.ts` (`Village` and `RiskPrediction` interfaces).
  - API functions: `getRiskPrediction` (`api.ts`), `getWorkerRiskPrediction` (`workerApi.ts`).
  - UI Components: `RiskPredictionPage.tsx`, `WorkerRiskAnalysis.tsx`.

### Migration Design (Single Source of Truth)
We will NOT duplicate prediction state. `WaterRiskPrediction` will be the sole authoritative source of Module A predictions.
1. **Module A (Water Risk)**: We will entirely **remove** `risk_score` and `risk_level` columns from the `Village` database table. To avoid immediately breaking the frontend (which expects `Village.riskScore`), we will document a temporary compatibility approach: `VillageSerializer` will use a `SerializerMethodField` to dynamically fetch the latest `WaterRiskPrediction` for the village.
2. **Module B (Disease Risk)**: `DiseaseRiskPrediction` will be introduced. Since `Village.district` is already a `CharField`, the new prediction model will use a `district` string field rather than introducing an entirely new `District` database model.

## 3. PHASED IMPLEMENTATION ROUNDS

### Round 1 — Backend/model architecture audit + safe migration
- **Objective**: Restructure the database to strictly support independent Module A and Module B risk signals with a single source of truth.
- **Files likely to change**: `aquacare/models.py`, `aquacare/serializers.py`, `aquacare/views.py`, `aquacare/admin.py`.
- **Backend changes**:
  - Delete `risk_score` and `risk_level` fields from the `Village` model.
  - Rename `RiskPrediction` model to `WaterRiskPrediction`.
  - Add `DiseaseRiskPrediction` model (fields: `district`, `prediction_date`, `risk_score`, `risk_level`, `disease`, `is_latest`).
  - Update `Alert.related_prediction` to `related_water_prediction` and add `related_disease_prediction`.
  - Rewrite `views.py` dashboard aggregations to query `WaterRiskPrediction` directly instead of filtering `Village` by risk fields.
  - Update `VillageSerializer` with a `SerializerMethodField` to dynamically return `risk_level` and `risk_score` from the latest `WaterRiskPrediction` to maintain frontend compatibility.
- **Frontend changes**: None yet.
- **Migration requirements**: Generate and run `makemigrations` and `migrate`. Data migration might be needed if existing mock data should be preserved.
- **Tests**: Verify `aquacare/tests.py` (update model creations).
- **Expected result**: Database schema successfully separates Water Risk from Disease Risk with no duplicated fields.

### Round 2 — Authentication/permissions/API cleanup
- **Objective**: Verify and tighten RBAC on all existing endpoints.
- **Files likely to change**: `aquacare/views.py`, `aquacare/permissions.py`.
- **Backend changes**: Ensure Citizens cannot access clinical records. Ensure Authority has exclusive rights to broadcast alerts.
- **Frontend changes**: None.
- **Migration requirements**: None.
- **Tests**: Add unit tests for permission boundary checks.
- **Expected result**: Auth endpoints are strictly segregated by role.

### Round 3 — Real backend CRUD/API integration
- **Objective**: Adapt serializers and views to the new dual-risk architecture.
- **Files likely to change**: `aquacare/serializers.py`, `aquacare/views.py`, `aquacare/urls.py`.
- **Backend changes**:
  - Create GET endpoints for `/api/risk/water-contamination/<village_id>/` and `/api/risk/regional-activity/<district_name>/`.
- **Frontend changes**: None yet.
- **Migration requirements**: None.
- **Tests**: Test the new API endpoints for correct JSON shape.
- **Expected result**: APIs correctly serve the two separated risk models.

### Round 4 — Risk API contracts + ML service interface
- **Objective**: Build the ML service layer stub that will eventually load trained `.pkl` artifacts.
- **Files likely to change**: `aquacare/ml_service.py` (NEW), `aquacare/views.py`.
- **Backend changes**:
  - Create an ML interface that explicitly flags when the actual model is unavailable via an API payload key (`"status": "MODEL_UNAVAILABLE_DEMO_MODE"`).
  - Do NOT generate fake numerical predictions designed to deceive. Any MVP demo fallback must be explicitly labeled as simulated/demo data everywhere it is returned.
- **Frontend changes**: None yet.
- **Migration requirements**: None.
- **Tests**: Unit test the ML service fallback logic.
- **Expected result**: The backend returns clean, labeled responses indicating demo state.

### Round 5 — Frontend replacement of mock data
- **Objective**: Wire the React frontend to the new separated APIs.
- **Files likely to change**: `frontend/src/types/index.ts`, `frontend/src/services/api.ts`, `frontend/src/services/workerApi.ts`.
- **Backend changes**: None.
- **Frontend changes**:
  - Replace the unified `RiskPrediction` interface with `WaterRiskPrediction` and `DiseaseRiskPrediction`.
  - Update service calls to point to the new `/api/risk/water-contamination/` and `/api/risk/regional-activity/` endpoints.
- **Migration requirements**: None.
- **Tests**: Run frontend linter (`npm run lint` / `npm run typecheck`).
- **Expected result**: Frontend successfully fetches real separated risk data from the backend.

### Round 6 — Risk dashboards
- **Objective**: Visually represent the two independent risk signals in the UI.
- **Files likely to change**: `RiskPredictionPage.tsx`, `WorkerRiskAnalysis.tsx`, dashboard layout components.
- **Backend changes**: None.
- **Frontend changes**:
  - Remove all unified gauges/charts.
  - Create distinct UI panels: one for Village-Level Water Risk, one for District-Level Regional Disease Risk.
  - Display the "Demo Mode / Model Unavailable" warning banner prominently if the API returns that status.
- **Migration requirements**: None.
- **Tests**: Visual inspection.
- **Expected result**: Clear, honest visualization of both independent risk modules without any artificially combined score.

### Round 7 — Alerts/workflows
- **Objective**: Formalize the distinct data flows and alert triggers.
- **Files likely to change**: `aquacare/models.py`, `aquacare/views.py`.
- **Backend changes**:
  - Ensure data flows remain distinct: Community Reports -> Health Worker Verification. Clinical Records -> ML Service. 
  - Define exactly how alerts are generated. Alerts should be triggered exclusively from carefully defined risk/threshold events (e.g., Water Risk crossing into 'CRITICAL'), and NOT directly from arbitrary citizen reports.
- **Frontend changes**: Ensure the Alerts inbox correctly displays the source of the alert (Water vs Disease).
- **Expected result**: Automated decision-support workflow is functional and logical.

### Round 8 — GIS
- **Objective**: Reflect the split risks on the spatial map.
- **Files likely to change**: `frontend/src/features/gis/RiskMapPage.tsx`.
- **Frontend changes**: Update Leaflet markers to either represent Water Risk natively on the village markers, or allow a toggle to color the map by District-level Disease risk.
- **Expected result**: Functional MVP mapping.

### Round 9 — Integration testing + defense demo
- **Objective**: Final polish and end-to-end walkthrough for the September defense.
- **Expected result**: A stable, honest, functional prototype ready for demonstration.
