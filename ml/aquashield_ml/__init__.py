"""
Shared ML code for AquaShield, imported by both the training scripts in
ml/scripts and the Django backend (aquacare/ml_service.py), so features are
computed identically at training and prediction time.
"""
from pathlib import Path

ML_ROOT = Path(__file__).resolve().parents[1]
MODELS_DIR = ML_ROOT / "models"
