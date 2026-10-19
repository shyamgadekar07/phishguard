"""
Automated Test Suite for PhishGuard ML Microservice
===================================================
Tests POST /predict endpoint for:
1. Valid prediction with class probabilities and disclaimer
2. Cold-start / Zero simulations handling ('insufficient_data')
3. Out-of-range rates (> 1.0, < 0.0) -> HTTP 422
4. Negative counts (< 0) -> HTTP 422
5. Unpermitted extra fields (e.g. passwords/tokens) -> HTTP 422
6. Missing / unloadable model artifact handling -> HTTP 503
7. Existing /health probe preservation -> HTTP 200

Run from project root:
    .\\ml-service\\venv\\Scripts\\python.exe ml-service\\test_predict_api.py
"""

import sys
import os
import json
import asyncio
import unittest
from pathlib import Path
from typing import Tuple, Any, Optional

# Add ml-service to path so app.main can be imported
current_dir = Path(__file__).resolve().parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

from app.main import app, load_model_bundle, DEFAULT_MODEL_PATH


async def dispatch_asgi_request(
    app_instance,
    method: str,
    path: str,
    json_body: Optional[Any] = None,
) -> Tuple[int, Any]:
    """
    Simulates an HTTP request against a FastAPI ASGI application without requiring httpx.
    """
    body_bytes = json.dumps(json_body).encode("utf-8") if json_body is not None else b""
    headers = [
        (b"host", b"testserver"),
        (b"content-type", b"application/json"),
        (b"content-length", str(len(body_bytes)).encode("ascii")),
    ]
    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": method.upper(),
        "scheme": "http",
        "path": path,
        "raw_path": path.encode("ascii"),
        "query_string": b"",
        "headers": headers,
        "client": ("127.0.0.1", 12345),
        "server": ("testserver", 80),
    }

    sent = False
    status_code = 500
    response_body = b""

    async def receive():
        nonlocal sent
        if not sent:
            sent = True
            return {"type": "http.request", "body": body_bytes, "more_body": False}
        return {"type": "http.disconnect"}

    async def send(message):
        nonlocal status_code, response_body
        if message["type"] == "http.response.start":
            status_code = message["status"]
        elif message["type"] == "http.response.body":
            response_body += message.get("body", b"")

    await app_instance(scope, receive, send)

    try:
        data = json.loads(response_body.decode("utf-8")) if response_body else None
    except Exception:
        data = response_body.decode("utf-8", errors="replace")

    return status_code, data


class TestPhishGuardMLAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Ensure model bundle is loaded in app.state
        app.state.model_bundle = load_model_bundle(DEFAULT_MODEL_PATH)

    def test_01_health_check_preserved(self):
        """Verify existing /health endpoint returns 200 and success."""
        status_code, body = asyncio.run(dispatch_asgi_request(app, "GET", "/health"))
        self.assertEqual(status_code, 200)
        self.assertTrue(body.get("success"))
        self.assertEqual(body.get("message"), "PhishGuard ML Service is running")
        self.assertTrue(body.get("model_loaded"))

    def test_02_valid_prediction(self):
        """Verify valid behavioral telemetry returns category, probabilities, and disclaimer."""
        payload = {
            "simulation_count": 12,
            "click_rate": 0.08,
            "report_rate": 0.85,
            "open_rate": 0.40,
            "repeat_click_count": 0,
        }
        status_code, body = asyncio.run(
            dispatch_asgi_request(app, "POST", "/predict", json_body=payload)
        )
        self.assertEqual(status_code, 200)
        self.assertEqual(body.get("status"), "success")
        self.assertIn(body.get("risk_category"), ["LOW", "MEDIUM", "HIGH"])
        self.assertIsNotNone(body.get("model_probabilities"))
        self.assertIn("LOW", body["model_probabilities"])
        self.assertIn("MEDIUM", body["model_probabilities"])
        self.assertIn("HIGH", body["model_probabilities"])
        self.assertIn("Academic prototype", body.get("disclaimer", ""))

    def test_03_zero_simulations_insufficient_data(self):
        """Verify zero simulations safely returns insufficient_data without ML inference."""
        payload = {
            "simulation_count": 0,
            "click_rate": 0.0,
            "report_rate": 0.0,
            "open_rate": 0.0,
            "repeat_click_count": 0,
        }
        status_code, body = asyncio.run(
            dispatch_asgi_request(app, "POST", "/predict", json_body=payload)
        )
        self.assertEqual(status_code, 200)
        self.assertEqual(body.get("status"), "insufficient_data")
        self.assertIsNone(body.get("risk_category"))
        self.assertIsNone(body.get("model_probabilities"))
        self.assertIn("Insufficient simulation history", body.get("message", ""))
        self.assertIn("Academic prototype", body.get("disclaimer", ""))

    def test_04_out_of_range_rates_rejected(self):
        """Verify rates outside [0.0, 1.0] return HTTP 422 validation error."""
        # click_rate > 1.0
        payload_high = {
            "simulation_count": 5,
            "click_rate": 1.5,
            "report_rate": 0.5,
            "open_rate": 0.5,
            "repeat_click_count": 0,
        }
        status_code, _ = asyncio.run(
            dispatch_asgi_request(app, "POST", "/predict", json_body=payload_high)
        )
        self.assertEqual(status_code, 422)

        # report_rate < 0.0
        payload_neg = {
            "simulation_count": 5,
            "click_rate": 0.2,
            "report_rate": -0.1,
            "open_rate": 0.5,
            "repeat_click_count": 0,
        }
        status_code, _ = asyncio.run(
            dispatch_asgi_request(app, "POST", "/predict", json_body=payload_neg)
        )
        self.assertEqual(status_code, 422)

    def test_05_negative_counts_rejected(self):
        """Verify negative counts return HTTP 422 validation error."""
        # Negative simulation_count
        payload_neg_sims = {
            "simulation_count": -1,
            "click_rate": 0.2,
            "report_rate": 0.5,
            "open_rate": 0.5,
            "repeat_click_count": 0,
        }
        status_code, _ = asyncio.run(
            dispatch_asgi_request(app, "POST", "/predict", json_body=payload_neg_sims)
        )
        self.assertEqual(status_code, 422)

        # Negative repeat_click_count
        payload_neg_clicks = {
            "simulation_count": 5,
            "click_rate": 0.2,
            "report_rate": 0.5,
            "open_rate": 0.5,
            "repeat_click_count": -2,
        }
        status_code, _ = asyncio.run(
            dispatch_asgi_request(app, "POST", "/predict", json_body=payload_neg_clicks)
        )
        self.assertEqual(status_code, 422)

    def test_06_unpermitted_fields_credentials_rejected(self):
        """Verify sensitive/extra fields (like password, token) are rejected with 422."""
        payload_with_credentials = {
            "simulation_count": 5,
            "click_rate": 0.2,
            "report_rate": 0.5,
            "open_rate": 0.5,
            "repeat_click_count": 1,
            "password": "supersecretpassword",
            "token": "jwt-token-xyz",
        }
        status_code, body = asyncio.run(
            dispatch_asgi_request(app, "POST", "/predict", json_body=payload_with_credentials)
        )
        self.assertEqual(status_code, 422)

    def test_07_model_loading_failure_returns_503(self):
        """Verify that when the model is unavailable, server returns HTTP 503 instead of inventing predictions."""
        # Temporarily detach model bundle and point env var to invalid path
        original_bundle = getattr(app.state, "model_bundle", None)
        original_env = os.environ.get("PHISHGUARD_MODEL_PATH")

        try:
            app.state.model_bundle = None
            os.environ["PHISHGUARD_MODEL_PATH"] = str(current_dir / "nonexistent_model.joblib")

            payload = {
                "simulation_count": 5,
                "click_rate": 0.2,
                "report_rate": 0.5,
                "open_rate": 0.5,
                "repeat_click_count": 1,
            }
            status_code, body = asyncio.run(
                dispatch_asgi_request(app, "POST", "/predict", json_body=payload)
            )
            self.assertEqual(status_code, 503)
            self.assertIn("detail", body)
            self.assertIn("not available", body["detail"])
        finally:
            # Restore state
            app.state.model_bundle = original_bundle
            if original_env is not None:
                os.environ["PHISHGUARD_MODEL_PATH"] = original_env
            else:
                os.environ.pop("PHISHGUARD_MODEL_PATH", None)


if __name__ == "__main__":
    runner = unittest.TextTestRunner(verbosity=2)
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(TestPhishGuardMLAPI)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
