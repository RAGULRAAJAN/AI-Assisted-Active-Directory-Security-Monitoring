

# AD Security Monitor - Project Instructions

## Architecture
- **Log Source:** Windows Security Logs (Winlogbeat).
- **Backend:** FastAPI (Python 3.10+).
- **Detection:** ML (Isolation Forest) + LLM (Groq Llama 3).
- **Orchestration:** MCP (Model Context Protocol).
- **Database:** Elasticsearch 8.12.0.

## Key Files
- `backend/main.py`: Entry point for the API.
- `backend/mcp_server.py`: Orchestrates tools for analysis and response.
- `backend/anomaly_detector.py`: ML scoring logic.
- `backend/llm_analyzer.py`: LLM report generation (Groq).
- `ml/train_model.py`: Training script for the anomaly detection model.

## Setup Instructions
1. **Environment Variables:**
   - `GROQ_API_KEY`: Required for LLM analysis.
   - `LLM_MODEL`: Model name on Groq (default: `llama-3.3-70b-versatile`).
   - `ES_HOST`: Elasticsearch host (default: `localhost:9200`).
2. **ML Model Training:**
   - Ensure logs are present in Elasticsearch.
   - Run `python ml/train_model.py` to create models in `ml/models/`.
3. **Running the API:**
   - `uvicorn backend.main:app --reload --port 8000`
4. **Docker Deployment:**
   - `docker-compose up -d`

## Conventions
- Use async/await for all I/O bound tasks (ES queries, LLM calls).
- Follow PEP 8 for Python code styling.
- Ensure all new API endpoints are documented with Pydantic models.
