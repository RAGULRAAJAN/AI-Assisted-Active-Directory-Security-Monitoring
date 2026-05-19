import os
import sys

def check_requirements():
    print("--- Checking Requirements ---")
    try:
        import fastapi
        import elasticsearch
        import pandas
        import sklearn
        import joblib
        import groq
        import mcp
        print("OK: All major packages are installed.")
    except ImportError as e:
        print(f"ERROR: Missing package - {e}")

def check_files():
    print("\n--- Checking Project Files ---")
    files = [
        "backend/main.py",
        "backend/anomaly_detector.py",
        "backend/llm_analyzer.py",
        "backend/log_collector.py",
        "backend/mcp_server.py",
        "backend/response_playbooks.py",
        "ml/feature_engineering.py",
        "ml/train_model.py",
        "requirements.txt",
        "docker-compose.yml"
    ]
    for f in files:
        if os.path.exists(f):
            print(f"OK: {f} exists.")
        else:
            print(f"MISSING: {f}")

def check_ml_models():
    print("\n--- Checking ML Models ---")
    if os.path.exists("ml/models/isolation_forest.pkl"):
        print("OK: ML model found.")
    else:
        print("WARNING: ML model not found. Run training script or ensure data is in ES.")

if __name__ == "__main__":
    check_requirements()
    check_files()
    check_ml_models()
