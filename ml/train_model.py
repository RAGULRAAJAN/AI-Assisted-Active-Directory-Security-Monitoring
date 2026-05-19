from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib
import pandas as pd
import os

FEATURE_COLS = [
    "total_logons", "failed_logons", "lockouts",
    "unique_ips", "kerberos_requests", "privilege_use",
    "off_hours_logons", "failure_rate"
]

def train_isolation_forest(features_df):
    if features_df.empty:
        print("No features to train on.")
        return None, None
        
    X = features_df[FEATURE_COLS].fillna(0)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    model = IsolationForest(
        n_estimators=200,
        contamination=0.05,
        random_state=42
    )
    model.fit(X_scaled)
    
    os.makedirs("ml/models", exist_ok=True)
    joblib.dump(model, "ml/models/isolation_forest.pkl")
    joblib.dump(scaler, "ml/models/scaler.pkl")
    return model, scaler

if __name__ == "__main__":
    # Example usage (requires features)
    # from feature_engineering import extract_features
    # df = extract_features(1440) # Last 24h
    # train_isolation_forest(df)
    pass
