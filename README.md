# AI-Assisted Active Directory Security Monitoring

## Overview
This project provides an advanced security monitoring solution for Active Directory (AD) environments. By combining Machine Learning (ML) for anomaly detection and Large Language Models (LLM) for automated triage, it helps SOC analysts identify and respond to threats like brute force attacks, lateral movement, and privilege escalation with greater efficiency.

## Why This Project?
Traditional SIEM alerts often generate high volumes of false positives. This system adds two intelligent layers:
1. **Behavioral ML:** Uses an Isolation Forest model to baseline user behavior and identify statistical outliers in Windows Security Logs.
2. **LLM Triage:** Automatically analyzes anomalies using Llama 3 (via Groq) to provide human-readable investigation reports and recommended response actions.

## Architecture
- **Log Source:** Windows Security Event Logs (Events like 4624, 4625, 4768, etc.).
- **Data Pipeline:** Winlogbeat -> Logstash -> Elasticsearch.
- **Backend:** FastAPI (Python) orchestrating the detection and analysis pipeline.
- **Detection Engine:** 
  - **ML:** Scikit-learn Isolation Forest for scoring behavioral anomalies.
  - **LLM:** Groq Llama 3.3 for deep analysis and report generation.
- **Orchestration:** Model Context Protocol (MCP) for tool integration.
- **Dashboard:** Modern web UI for alert visualization and incident management.

## Project Structure
- backend/: FastAPI application, MCP server, and analysis logic.
- ml/: Training scripts and serialized models (Isolation Forest).
- dashboard/: Frontend assets (HTML/JS).
- logstash/: Pipeline configuration for ingesting Windows logs.
- simulate_attacks.py: Script to generate synthetic attack logs for testing.

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Python 3.10+
- Groq API Key (for LLM analysis)

### Installation
1. **Clone the repository:**
   \\\ash
   git clone https://github.com/RAGULRAAJAN/AI-Assisted-Active-Directory-Security-Monitoring.git
   cd AI-Assisted-Active-Directory-Security-Monitoring
   \\\`n
2. **Set up environment variables:**
   Create a .env file in the root directory:
   \\\env
   GROQ_API_KEY=your_api_key_here
   ES_HOST=http://localhost:9200
   \\\`n
3. **Install Python dependencies:**
   \\\ash
   pip install -r requirements.txt
   \\\`n
### Running the System
1. **Start the ELK Stack:**
   \\\ash
   docker-compose up -d
   \\\`n
2. **Train the ML Model:**
   (Ensure some logs are present in Elasticsearch first, or use simulate_attacks.py)
   \\\ash
   python ml/train_model.py
   \\\`n
3. **Start the Backend API:**
   \\\ash
   uvicorn backend.main:app --port 8000 --reload
   \\\`n
4. **Access the Dashboard:**
   Open http://localhost:8000/dashboard in your browser.

## Response Playbooks
The system supports automated and semi-automated response actions:
- Disable AD User Account
- Force Password Reset
- Isolate Machine via Network Block
- Notify SOC via Webhook/Email
