"""
PhishGuard ML Microservice - FastAPI Application
================================================
Provides behavioral analytics and phishing susceptibility prediction for PhishGuard.

Disclaimer:
This service is an academic prototype trained on synthetic behavioral data.
The risk predictions and model probabilities generated do not establish real-world
predictive validity and must not be used for production security enforcement.
"""

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Dict, Optional

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

logger = logging.getLogger("phishguard-ml")
logging.basicConfig(level=logging.INFO)

# ---------------------------------------------------------------------------
# Model Resolution & Loading Configuration
# ---------------------------------------------------------------------------
# Path resolved relative to this source file, independent of terminal working directory
DEFAULT_MODEL_PATH = (
    Path(__file__).resolve().parent.parent / "models" / "phishguard_risk_model.joblib"
)

PROTOTYPE_DISCLAIMER = (
    "Academic prototype trained on synthetic data. "
    "Does not establish real-world predictive validity."
)


def load_model_bundle(model_path: Optional[Path] = None) -> Optional[Dict]:
    """
    Loads the trained model artifact bundle from disk.
    Returns None if the artifact does not exist or fails to load.
    """
    target_path = model_path or Path(
        os.getenv("PHISHGUARD_MODEL_PATH", str(DEFAULT_MODEL_PATH))
    )

    if not target_path.exists():
        logger.warning("ML model artifact not found at: %s", target_path)
        return None

    try:
        bundle = joblib.load(target_path)
        logger.info("Successfully loaded ML model artifact from: %s", target_path)
        return bundle
    except Exception as exc:
        logger.error("Failed to load model artifact at %s: %s", target_path, exc)
        return None


# ---------------------------------------------------------------------------
# Application Lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager to load models at startup."""
    app.state.model_bundle = load_model_bundle()
    yield


# ---------------------------------------------------------------------------
# FastAPI App Initialization
# ---------------------------------------------------------------------------
app = FastAPI(
    title="PhishGuard ML Microservice",
    description="Microservice providing behavioral analytics and phishing susceptibility prediction for PhishGuard.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Pydantic Request & Response Schemas
# ---------------------------------------------------------------------------
class PredictRequest(BaseModel):
    """
    Behavioral features request schema.
    Strictly forbids unexpected fields (such as credentials, passwords, or tokens).
    """

    model_config = ConfigDict(extra="forbid")

    simulation_count: int = Field(
        ...,
        ge=0,
        description="Total simulation count assigned to the user (non-negative integer).",
    )
    click_rate: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Simulated email click rate ratio (0.0 to 1.0).",
    )
    report_rate: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Simulated email proactive report rate ratio (0.0 to 1.0).",
    )
    open_rate: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Simulated email open rate ratio (0.0 to 1.0).",
    )
    repeat_click_count: int = Field(
        ...,
        ge=0,
        description="Repeated click incidents across simulations (non-negative integer).",
    )


class PredictResponse(BaseModel):
    """
    Prediction response schema.
    Explicitly marks probabilities as model probabilities and includes prototype disclaimer.
    """

    status: str = Field(
        ...,
        description="Status code: 'success', 'insufficient_data', or error label.",
    )
    risk_category: Optional[str] = Field(
        None,
        description="Predicted risk level ('LOW', 'MEDIUM', 'HIGH') or null if insufficient data.",
    )
    model_probabilities: Optional[Dict[str, float]] = Field(
        None,
        description="Model estimated class probabilities (not guaranteed confidence).",
    )
    message: str = Field(
        ...,
        description="Explanatory message regarding prediction outcome.",
    )
    disclaimer: str = Field(
        default=PROTOTYPE_DISCLAIMER,
        description="Notice regarding synthetic data prototype limitations.",
    )


# ---------------------------------------------------------------------------
# Health Check Endpoints (Preserving all original routes)
# ---------------------------------------------------------------------------
@app.get("/", tags=["Health"], include_in_schema=False)
@app.get("/health", tags=["Health"])
@app.get("/health/", tags=["Health"], include_in_schema=False)
@app.get("/api/health", tags=["Health"], include_in_schema=False)
async def health_check():
    """Health check probe for the ML microservice."""
    model_loaded = getattr(app.state, "model_bundle", None) is not None
    return {
        "success": True,
        "message": "PhishGuard ML Service is running",
        "model_loaded": model_loaded,
    }


# ---------------------------------------------------------------------------
# Prediction Endpoint
# ---------------------------------------------------------------------------
@app.post(
    "/predict",
    response_model=PredictResponse,
    tags=["Prediction"],
    summary="Predict phishing risk category from behavioral simulation features",
)
async def predict_risk(request: PredictRequest):
    """
    Evaluates user behavioral telemetry against the baseline ML classifier.

    - If simulation_count is 0, returns 'insufficient_data' status without running ML inference.
    - If valid, passes features to the trained pipeline and returns predicted risk category
      along with per-class model probabilities.
    - If the model artifact cannot be loaded, returns HTTP 503.
    """
    # 1. Safely handle cold-start / zero simulations
    if request.simulation_count == 0:
        return PredictResponse(
            status="insufficient_data",
            risk_category=None,
            model_probabilities=None,
            message=(
                "Insufficient simulation history to generate a machine learning prediction. "
                "At least 1 simulation is required."
            ),
            disclaimer=PROTOTYPE_DISCLAIMER,
        )

    # 2. Check model availability
    bundle = getattr(app.state, "model_bundle", None)
    if bundle is None:
        # Attempt just-in-time reload before failing
        bundle = load_model_bundle()
        app.state.model_bundle = bundle

    if bundle is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "ML model artifact is not available on the server. "
                "Ensure train_model.py has been executed to generate models/phishguard_risk_model.joblib."
            ),
        )

    pipeline = bundle.get("pipeline")
    if pipeline is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Corrupted model artifact: missing pipeline.",
        )

    # 3. Construct input DataFrame matching feature columns
    features = [
        "simulation_count",
        "click_rate",
        "report_rate",
        "open_rate",
        "repeat_click_count",
    ]
    input_data = pd.DataFrame(
        [
            {
                "simulation_count": request.simulation_count,
                "click_rate": request.click_rate,
                "report_rate": request.report_rate,
                "open_rate": request.open_rate,
                "repeat_click_count": request.repeat_click_count,
            }
        ],
        columns=features,
    )

    # 4. Perform inference
    try:
        raw_pred = pipeline.predict(input_data)[0]
        risk_category = str(raw_pred)

        model_probabilities = None
        if hasattr(pipeline, "predict_proba"):
            proba = pipeline.predict_proba(input_data)[0]
            classes = getattr(pipeline, "classes_", bundle.get("classes", []))
            model_probabilities = {
                str(cls_name): round(float(p), 4) for cls_name, p in zip(classes, proba)
            }

        return PredictResponse(
            status="success",
            risk_category=risk_category,
            model_probabilities=model_probabilities,
            message="Prediction generated successfully.",
            disclaimer=PROTOTYPE_DISCLAIMER,
        )
    except Exception as exc:
        logger.error("Inference execution failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference execution failed: {str(exc)}",
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
