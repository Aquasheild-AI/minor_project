# AquaShield AI - Water Security Platform

AquaShield AI is an intelligent system designed to safeguard community health by providing early detection of water-borne diseases, proactive risk prediction, and responsive health monitoring. By combining local water quality data with advanced AI, the platform empowers health workers and community members to take decisive action.

## Features

- **Disease Detection**: Uses AI to identify potential water-borne diseases based on reported symptoms.
- **Risk Prediction (ML)**: Two models trained on real Indian government data (see [ML Risk Models](#ml-risk-models)):
  - **Water contamination risk**: predicts the faecal contamination risk of a water source from field readings (pH, temperature, TDS, dissolved oxygen, nitrate). Trained on CPCB National Water Quality Monitoring data, 2016–2024.
  - **District outbreak risk**: predicts the chance of a water-borne disease outbreak in the next 14 days from recent rainfall, temperature and humidity (NASA POWER) and the district's outbreak history (IDSP via EpiClim, 2009–2022).
- **Health Monitoring**: Comprehensive health record management for individuals and communities.
- **Interactive GIS Maps**: Visualizes health risks, water quality data, and disease hotspots.
- **AI Health Assistant**: An intelligent chatbot to guide users with immediate health information and follow-up questions.
- **Role-Based Access**: Secure access for Community Members, Health Workers, and Authorities.

## Setup Guide

### Prerequisites

- Node.js (v16 or higher)
- Python (v3.8 or higher)
- [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### 1. Backend Setup

Navigate to the backend directory:
```bash
cd backend
```

Create a virtual environment:
```bash
python -m venv venv
venv\Scripts\activate
```

Install dependencies (includes `scikit-learn==1.9.0`, `pandas` and `numpy`, which the backend needs to load the ML models):
```bash
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory with the following variables:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Run migrations and create a superuser:
```bash
python manage.py migrate
python manage.py createsuperuser
```

### 2. Frontend Setup

Navigate to the frontend directory:
```bash
cd frontend
```

Install dependencies:
```bash
npm install
```

### 3. Running the Application

Start the backend server:
```bash
cd backend
python manage.py runserver
```

Start the frontend development server:
```bash
cd frontend
npm run dev
```

Open your browser and navigate to `http://localhost:5173`.

## ML Risk Models

The trained models are committed in `ml/models/`, so no training is needed to run the app. `ml/README.md` covers the data sources, validation results, limitations and how to retrain.

**How predictions reach the app:**
- Recording a water quality test (`POST /api/water-quality/`) automatically re-scores that village's water contamination risk.
- District outbreak risk is refreshed on demand. It needs internet access to fetch live NASA POWER climate:
  ```bash
  cd backend
  python manage.py run_risk_predictions            # both models
  python manage.py run_risk_predictions --water-only
  python manage.py run_risk_predictions --disease-only
  ```
- If a model or the live climate is unavailable, no prediction is stored. The API reports the reason instead of returning simulated values.
- Alerts are created automatically:
  - a CRITICAL water prediction notifies health workers to confirm it with a lab test;
  - a lab-confirmed E. coli result issues a boil-water advisory to everyone;
  - a CRITICAL district outbreak risk warns health workers.

**Risk API** (token auth):

| Method | Endpoint | Who | Purpose |
|---|---|---|---|
| GET | `/api/risk/water/?village_id=&district=` | Any user | Latest water risk per village |
| GET | `/api/risk/water/<village_id>/history/` | Any user | Past water risk predictions |
| POST | `/api/risk/water/<village_id>/refresh/` | Health worker (own villages), Authority | Re-score from the latest tests |
| GET | `/api/risk/disease/?district=` | Any user | Latest outbreak risk per district |
| GET | `/api/risk/disease/history/?district=` | Any user | Past outbreak risk predictions |
| POST | `/api/risk/refresh/` | Authority | Re-run both models for all villages and districts |
| GET | `/api/risk/models/` | Any user | Model names, training dates and validation metrics |

**Tests:**
```bash
python -m unittest discover ml/tests      # data extraction and feature consistency
cd backend && python manage.py test       # includes aquacare/test_risk.py
```

## Chatbot Usage

The AI Health Assistant is available for community members at `/community/chat`.

**Interaction Guide:**
- Ask questions about symptoms, diseases, or prevention methods.
- The chatbot will provide information based on the local knowledge base.
- It will ask follow-up questions or suggest related topics for deeper understanding.
- Use the "Report These Symptoms" button to quickly navigate to the health reporting section.

## Project Structure

- `backend/`: Django REST API application.
- `frontend/`: React application with Tailwind CSS.
- `ml/`: data, training scripts, trained models and the shared `aquashield_ml` package used by the backend. See `ml/README.md`.
- `CHATBOT_ARCHITECTURE.md`: Detailed documentation of the chatbot system.

## Notes

- This project is pre-configured to use SQLite (`db.sqlite3`) for easy setup without needing an external database server.
- Ensure the `GEMINI_API_KEY` is valid for the AI features to work.
- The frontend risk pages (`RiskPredictionPage`, `WorkerRiskAnalysis`, `CommunityRiskStatus`) still show mock data. The client for the real risk API is ready in `frontend/src/services/riskApi.ts`, and wiring the pages is the next step (see `NOTES.md`).
- Default credentials for superuser: username `admin`, password `admin` (created via `createsuperuser`).

## Support

For detailed architecture and API documentation, please refer to `CHATBOT_ARCHITECTURE.md`.
For development setup issues, ensure your Python environment is activated and dependencies are installed.