from elasticsearch import Elasticsearch
import os
import pandas as pd

ES_HOST = os.getenv("ES_HOST", "localhost:9200")
es = Elasticsearch(f"http://{ES_HOST}")

def get_user_history(username, hours=24):
    """Fetch behavioral features for a specific user from ES."""
    query = {
        "query": {
            "bool": {
                "must": [
                    {"term": {"winlog.event_data.TargetUserName.keyword": username}},
                    {"range": {"@timestamp": {"gte": f"now-{hours}h"}}}
                ]
            }
        },
        "size": 1000
    }
    
    try:
        res = es.search(index="winlogbeat-*", body=query)
        logs = [hit["_source"] for hit in res["hits"]["hits"]]
        if not logs:
            return {
                "total_logons": 0, "failed_logons": 0, "lockouts": 0,
                "unique_ips": 0, "kerberos_requests": 0, "off_hours_logons": 0,
                "recent_logs": []
            }
        
        df = pd.DataFrame(logs)
        history = {
            "total_logons": int((df["winlog.event_id"] == 4624).sum()),
            "failed_logons": int((df["winlog.event_id"] == 4625).sum()),
            "lockouts": int((df["winlog.event_id"] == 4740).sum()),
            "unique_ips": int(df["winlog.event_data.IpAddress"].nunique()) if "winlog.event_data.IpAddress" in df else 0,
            "kerberos_requests": int((df["winlog.event_id"] == 4768).sum()),
            "off_hours_logons": int(sum(1 for t in pd.to_datetime(df["@timestamp"]) if t.hour < 7 or t.hour > 20)),
            "recent_logs": logs[:10]
        }
        return history
    except Exception as e:
        print(f"Error fetching user history: {e}")
        return {"error": str(e)}

async def query_anomalies(limit=50, severity=None):
    """
    Fetch recent high-interest logs that might be anomalies.
    In a real system, this would query a pre-indexed 'anomalies' index.
    Here we query critical event IDs as a fallback.
    """
    query = {
        "query": {
            "bool": {
                "should": [
                    {"term": {"winlog.event_id": 4625}}, # Failed login
                    {"term": {"winlog.event_id": 4740}}, # Lockout
                    {"term": {"winlog.event_id": 4728}}  # Member added to security group
                ]
            }
        },
        "sort": [{"@timestamp": {"order": "desc"}}],
        "size": limit
    }
    
    try:
        res = es.search(index="winlogbeat-*", body=query)
        return [hit["_source"] for hit in res["hits"]["hits"]]
    except Exception as e:
        print(f"Error querying anomalies: {e}")
        return []

async def get_stats():
    """Aggregate stats for the dashboard."""
    try:
        # Simple aggregation for total logs and failed logins
        res = es.count(index="winlogbeat-*")
        total_logs = res["count"]
        
        failed_res = es.count(index="winlogbeat-*", body={"query": {"term": {"winlog.event_id": 4625}}})
        failed_logins = failed_res["count"]
        
        # Count critical event IDs (lockouts + group changes + privilege use)
        critical_query = {
            "query": {
                "bool": {
                    "should": [
                        {"term": {"winlog.event_id": 4740}},
                        {"term": {"winlog.event_id": 4728}},
                        {"term": {"winlog.event_id": 4672}}
                    ],
                    "minimum_should_match": 1
                }
            }
        }
        critical_res = es.count(index="winlogbeat-*", body=critical_query)
        
        # Count unique users from recent logs
        user_agg = es.search(index="winlogbeat-*", body={
            "size": 0,
            "query": {"range": {"@timestamp": {"gte": "now-24h"}}},
            "aggs": {"unique_users": {"cardinality": {"field": "winlog.event_data.TargetUserName.keyword"}}}
        })
        active_users = user_agg.get("aggregations", {}).get("unique_users", {}).get("value", 0)
        
        return {
            "total_logs": total_logs,
            "failed_logins": failed_logins,
            "critical_alerts": critical_res["count"],
            "active_users": active_users
        }
    except Exception as e:
        return {"error": str(e)}


async def get_alert_timeline(hours=24):
    """Get hourly alert counts for the timeline chart."""
    try:
        res = es.search(index="winlogbeat-*", body={
            "size": 0,
            "query": {
                "bool": {
                    "must": [{"range": {"@timestamp": {"gte": f"now-{hours}h"}}}],
                    "should": [
                        {"term": {"winlog.event_id": 4625}},
                        {"term": {"winlog.event_id": 4740}},
                        {"term": {"winlog.event_id": 4728}},
                        {"term": {"winlog.event_id": 4768}}
                    ],
                    "minimum_should_match": 1
                }
            },
            "aggs": {
                "timeline": {
                    "date_histogram": {
                        "field": "@timestamp",
                        "fixed_interval": "1h"
                    }
                }
            }
        })
        buckets = res.get("aggregations", {}).get("timeline", {}).get("buckets", [])
        return [{"hour": i, "count": b["doc_count"]} for i, b in enumerate(buckets)]
    except Exception as e:
        print(f"Error fetching timeline: {e}")
        return []
