import asyncio
from mcp.server import Server
from .anomaly_detector import score_event
from .log_collector import get_user_history
from .llm_analyzer import generate_investigation_report
from .response_playbooks import disable_ad_user, force_password_reset, block_machine_network, notify_soc

server = Server("ad-security-monitor")

async def analyze_alert(alert_data: dict) -> dict:
    """Analyze a security alert using ML + LLM pipeline."""
    username = alert_data.get("username")
    
    # Step 1: Fetch related logs for context
    history = get_user_history(username=username, hours=24)
    
    # Step 2: Get anomaly score
    alert_with_history = alert_data.copy()
    alert_with_history["history"] = history
    ml_score = score_event(alert_with_history)
    
    # Step 3: Send to LLM for triage
    report = await generate_investigation_report(
        alert=alert_data,
        history=history,
        ml_score=ml_score
    )
    
    def classify_severity(score):
        if score > 0.8: return "Critical"
        if score > 0.6: return "High"
        if score > 0.4: return "Medium"
        return "Low"

    return {
        "ml_score": ml_score,
        "severity": classify_severity(ml_score),
        "report": report,
        "recommended_actions": report.get("recommended_actions", report.get("actions", []))
    }

async def trigger_response(action: str, target: str) -> str:
    """Execute automated response actions."""
    actions = {
        "disable_user": disable_ad_user,
        "reset_password": force_password_reset,
        "isolate_machine": block_machine_network,
        "notify_soc": notify_soc
    }
    if action in actions:
        return await actions[action](target)
    return f"Unknown action: {action}"

# If running as standalone MCP server
if __name__ == "__main__":
    # In a real setup, we would expose these via MCP tools
    # server.add_tool(analyze_alert)
    # server.add_tool(trigger_response)
    # asyncio.run(server.run())
    pass
