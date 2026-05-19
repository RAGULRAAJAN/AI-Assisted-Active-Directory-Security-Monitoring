import pandas as pd
from elasticsearch import Elasticsearch
import os

ES_HOST = os.getenv("ES_HOST", "localhost:9200")
es = Elasticsearch(f"http://{ES_HOST}")

def extract_features(time_window_minutes=60):
    query = {
        "query": {
            "range": {
                "@timestamp": {
                    "gte": f"now-{time_window_minutes}m",
                    "lte": "now"
                }
            }
        },
        "size": 10000
    }
    
    try:
        res = es.search(index="winlogbeat-*", body=query)
        logs = [hit["_source"] for hit in res["hits"]["hits"]]
        if not logs:
            return pd.DataFrame()
        
        df = pd.json_normalize(logs)
        
        # Adjust grouping based on actual winlogbeat schema
        # Now fields are flattened like winlog.event_data.TargetUserName
        features = df.groupby("winlog.event_data.TargetUserName").agg(
            total_logons=("winlog.event_id", lambda x: (x == 4624).sum()),
            failed_logons=("winlog.event_id", lambda x: (x == 4625).sum()),
            lockouts=("winlog.event_id", lambda x: (x == 4740).sum()),
            unique_ips=("winlog.event_data.IpAddress", "nunique"),
            kerberos_requests=("winlog.event_id", lambda x: (x == 4768).sum()),
            privilege_use=("winlog.event_id", lambda x: (x == 4672).sum()),
            off_hours_logons=("@timestamp", lambda x: sum(
                1 for t in pd.to_datetime(x)
                if t.hour < 7 or t.hour > 20
            ))
        ).reset_index()
        
        features["failure_rate"] = features["failed_logons"] / (features["total_logons"] + 1)
        return features
    except Exception as e:
        print(f"Error extracting features: {e}")
        return pd.DataFrame()
