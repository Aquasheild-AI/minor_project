# AquaShield AI - Water Security Platform

AquaShield AI is an intelligent system designed to safeguard community health by providing early detection of water-borne diseases, proactive risk prediction, and responsive health monitoring. By combining local water quality data with advanced AI, the platform empowers health workers and community members to take decisive action.

## Features

- **Disease Detection**: Uses AI to identify potential water-borne diseases based on reported symptoms.
- **Risk Prediction**: Analyzes water quality parameters and health reports to predict community health risks.
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

Install dependencies:
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
- `CHATBOT_ARCHITECTURE.md`: Detailed documentation of the chatbot system.

## Notes

- This project is pre-configured to use SQLite (`db.sqlite3`) for easy setup without needing an external database server.
- Ensure the `GEMINI_API_KEY` is valid for the AI features to work.
- Default credentials for superuser: username `admin`, password `admin` (created via `createsuperuser`).

## Support

For detailed architecture and API documentation, please refer to `CHATBOT_ARCHITECTURE.md`.
For development setup issues, ensure your Python environment is activated and dependencies are installed.