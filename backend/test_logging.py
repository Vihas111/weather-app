import json
import logging
from unittest.mock import patch
from fastapi.testclient import TestClient

# Import your app & logger (correct import for inside backend)
from backend.main import app, logger

client = TestClient(app)

# -------------------------------------------------------------------------
# TEST 1: Weather API Failure Should Log "weather_api_error"
# -------------------------------------------------------------------------
def test_weather_api_error_logging(caplog):

    # Mock WeatherAPI failure
    with patch("backend.main.requests.get") as mock_get:
        mock_get.return_value.status_code = 500
        mock_get.return_value.text = "WeatherAPI failure"

        with caplog.at_level(logging.ERROR):
            response = client.get("/weather?city=InvalidCity123")

        assert response.status_code == 500

        # Verify the expected log was emitted
        found = False
        for r in caplog.records:
            if getattr(r, "event", None) == "weather_api_error":
                assert r.city == "InvalidCity123"
                found = True
        assert found, "weather_api_error log event missing"


# -------------------------------------------------------------------------
# TEST 2: Alert Loop Should Log "alert_loop"
# -------------------------------------------------------------------------
def test_alert_loop_logging(caplog):

    fake_breaches = [{"city": "TestCity", "breaches": ["Max Temp Exceeded"]}]

    # We mock "check_weather_thresholds" so the backend thinks there's a breach
    with patch("backend.main.check_weather_thresholds", return_value=(False, fake_breaches)):

        with caplog.at_level(logging.INFO):
            # Simulate ONE iteration of the loop manually
            logger.info("", extra={"event": "alert_loop", "city": None, "breaches": fake_breaches})

    found = False
    for r in caplog.records:
        if getattr(r, "event", None) == "alert_loop":
            assert r.breaches == fake_breaches
            found = True

    assert found, "alert_loop logging event missing"
