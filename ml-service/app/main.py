from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="PhishGuard ML Microservice",
    description="Microservice providing behavioral analytics and phishing susceptibility prediction for PhishGuard.",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Health"], include_in_schema=False)
@app.get("/health", tags=["Health"])
@app.get("/health/", tags=["Health"], include_in_schema=False)
@app.get("/api/health", tags=["Health"], include_in_schema=False)
async def health_check():
    """Health check probe for the ML microservice."""
    return {
        "success": True,
        "message": "PhishGuard ML Service is running",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
