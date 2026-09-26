"""
PhishGuard ML Microservice - Root Entry Point
Allows running uvicorn main:app directly from the ml-service root directory.
"""
from app.main import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
