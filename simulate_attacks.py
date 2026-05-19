import requests
import json
import time
import random
from datetime import datetime

ES_URL = "http://localhost:9200"
INDEX = "winlogbeat-simulation"

def push_log(log_data):
    try:
        url = f"{ES_URL}/{INDEX}/_doc"
        headers = {"Content-Type": "application/json"}
        res = requests.post(url, headers=headers, data=json.dumps(log_data))
        return res.status_code == 201
    except Exception as e:
        print(f"Error pushing log: {e}")
        return False

def simulate_brute_force(target_user="admin_svc"):
    print(f"Simulating brute force attack on {target_user}...")
    source_ip = f"192.168.1.{random.randint(100, 200)}"
    for _ in range(15):
        log = {
            "@timestamp": datetime.utcnow().isoformat(),
            "winlog": {
                "event_id": 4625,
                "event_data": {
                    "TargetUserName": target_user,
                    "IpAddress": source_ip,
                    "LogonType": 3
                }
            },
            "message": "An account failed to log on."
        }
        push_log(log)
        time.sleep(0.5)
    print("Brute force simulation complete.")

def simulate_normal_activity(user="user1"):
    print(f"Simulating normal activity for {user}...")
    log = {
        "@timestamp": datetime.utcnow().isoformat(),
        "winlog": {
            "event_id": 4624,
            "event_data": {
                "TargetUserName": user,
                "IpAddress": "10.0.0.5",
                "LogonType": 2
            }
        },
        "message": "An account was successfully logged on."
    }
    push_log(log)

if __name__ == "__main__":
    # Create index if it doesn't exist
    requests.put(f"{ES_URL}/{INDEX}")
    
    simulate_normal_activity("it_admin")
    time.sleep(2)
    simulate_brute_force("finance_manager")
    time.sleep(2)
    simulate_normal_activity("hr_user")
