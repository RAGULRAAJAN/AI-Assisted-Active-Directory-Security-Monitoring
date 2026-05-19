import joblib
import pandas as pd
import numpy as np
import os

MODEL_PATH = "ml/models/isolation_forest.pkl"
SCALER_PATH = "ml/models/scaler.pkl"

FEATURE_COLS = [
    "total_logons", "failed_logons", "lockouts",
    "unique_ips", "kerberos_requests", "privilege_use",
    "off_hours_logons", "failure_rate"
]

def score_event(alert_data):
    """
    Score an alert based on user history features.
    alert_data is expected to contain a 'history' key with pre-calculated features.
    """
    if not os.path.exists(MODEL_PATH) or not os.path.exists(SCALER_PATH):
        # Fallback to simple heuristic if model isn't trained
        score = 0.0
        if alert_data.get("event_id") == 4625: score += 0.3
        if alert_data.get("history", {}).get("failed_logons", 0) > 5: score += 0.4
        return min(score, 1.0)

    try:
        model = joblib.load(MODEL_PATH)
        scaler = joblib.load(SCALER_PATH)
        
        history = alert_data.get("history", {})
        # Ensure all features are present
        features = []
        for col in FEATURE_COLS:
            features.append(history.get(col, 0))
        
        X = np.array([features])
        X_scaled = scaler.transform(X)
        
        # decision_function returns scores where lower is more anomalous
        # We want to return a probability-like score (0 to 1) where 1 is anomaly
        raw_score = model.decision_function(X_scaled)[0]
        # Map raw_score (roughly -0.5 to 0.5) to 0-1 range
        normalized_score = 1.0 / (1.0 + np.exp(raw_score * 10)) 
        
        return float(normalized_score)
    except Exception as e:
        print(f"Error in score_event: {e}")
        return 0.5
