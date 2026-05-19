import json
import os
from groq import AsyncGroq

# Use environment variable for Groq API key
client = AsyncGroq(
    api_key=os.getenv("GROQ_API_KEY")
)

LLM_MODEL = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")

SYSTEM_PROMPT = """You are a senior SOC analyst specializing in Active Directory security.
Analyze the provided Windows security logs and anomaly detection results.
Provide your response in JSON format with the following keys:
1. threat: (Critical/High/Medium/Low)
2. pattern: Attack pattern identification (e.g., Pass-the-Hash, Kerberoasting, Brute Force)
3. assets: Affected assets and blast radius
4. actions: Recommended immediate response actions (list)
5. report: Detailed investigation steps and summary for the analyst

Be concise, technical, and actionable."""

async def generate_investigation_report(alert, history, ml_score):
    """Generate a SOC investigation report using Groq LLM."""
    if not os.getenv("GROQ_API_KEY"):
        return {
            "threat": "Medium (LLM not configured)",
            "pattern": "Potential Anomaly",
            "actions": ["Check logs manually", "Review user activity"],
            "report": "GROQ_API_KEY is missing. Manual investigation required."
        }

    context = f"""
## Alert Details
- Event ID: {alert.get('event_id')}
- User: {alert.get('username')}
- Source IP: {alert.get('source_ip')}
- Time: {alert.get('timestamp')}
- ML Anomaly Score: {ml_score:.4f}

## User Activity (Last 24h)
- Total logons: {history.get('total_logons')}
- Failed attempts: {history.get('failed_logons')}
- Unique source IPs: {history.get('unique_ips')}
- Off-hours activity: {history.get('off_hours_logons')} events
- Kerberos requests: {history.get('kerberos_requests')}

## Recent Log Samples
{json.dumps(history.get('recent_logs', [])[:5], indent=2)}
"""
    
    try:
        response = await client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": context}
            ],
            response_format={"type": "json_object"}
        )
        
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Error in LLM analysis: {e}")
        return {
            "threat": "Error",
            "pattern": "Error",
            "actions": ["Investigate system error"],
            "report": f"Failed to generate report: {str(e)}"
        }
