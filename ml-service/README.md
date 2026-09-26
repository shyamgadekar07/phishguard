# PhishGuard ML Microservice

## Overview
This microservice handles behavioral analytics and predictive machine learning models for the PhishGuard cybersecurity awareness platform.

## Features (Phase 1)
- Minimal FastAPI web service
- Standard `/health` check endpoint
- Ready for feature extraction and Scikit-learn model integration in future phases

## Running Locally

1. Create a virtual environment:
   ```bash
   python -m venv venv
   ```
2. Activate the virtual environment:
   - **Windows**: `.\venv\Scripts\activate`
   - **Linux/macOS**: `source venv/bin/activate`
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the service:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
5. Check health:
   `http://localhost:8000/health`
