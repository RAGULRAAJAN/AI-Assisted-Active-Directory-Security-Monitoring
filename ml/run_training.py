import pandas as pd
from feature_engineering import extract_features
from train_model import train_isolation_forest
import os

if __name__ == "__main__":
    print("Extracting features from Elasticsearch...")
    # Extract features from the last 60 minutes
    df = extract_features(60)
    
    if df.empty:
        print("No data found in Elasticsearch. Make sure winlogbeat-simulation index has recent logs.")
    else:
        print(f"Found data for {len(df)} users. Training model...")
        model, scaler = train_isolation_forest(df)
        if model:
            print("Model trained and saved to ml/models/isolation_forest.pkl")
        else:
            print("Failed to train model.")
