from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import asyncio
import os

from .log_collector import query_anomalies, get_user_history, get_stats, get_alert_timeline
from .mcp_server import analyze_alert as mcp_analyze, trigger_response

app = FastAPI(title="AD Security Monitor API")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Mount dashboard if directory exists
if os.path.exists("dashboard"):
    app.mount("/dashboard", StaticFiles(directory="dashboard", html=True), name="dashboard")

class AlertPayload(BaseModel):
    event_id: int
    username: str
    source_ip: str
    timestamp: str
    raw_log: dict

@app.get("/api/alerts")
async def get_alerts(limit: int = 50, severity: str = None):
    """Fetch recent anomaly alerts."""
    return await query_anomalies(limit=limit, severity=severity)

@app.post("/api/analyze")
async def analyze_alert(payload: AlertPayload):
    """Run ML + LLM analysis on a specific alert."""
    return await mcp_analyze(payload.dict())

@app.get("/api/users/{username}/timeline")
async def user_timeline(username: str, hours: int = 24):
    """Get full activity timeline for a user."""
    return get_user_history(username=username, hours=hours)

@app.post("/api/respond")
async def execute_response(action: str, target: str, background_tasks: BackgroundTasks):
    """Execute automated response action."""
    background_tasks.add_task(trigger_response, action, target)
    return {"status": "queued", "action": action, "target": target}

@app.get("/api/stats")
async def dashboard_stats():
    """Live stats for dashboard."""
    return await get_stats()

@app.get("/api/alerts/timeline")
async def alerts_timeline(hours: int = 24):
    """Hourly alert counts for the timeline chart."""
    return await get_alert_timeline(hours=hours)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
