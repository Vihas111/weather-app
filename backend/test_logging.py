import json
import logging
from unittest.mock import patch
from fastapi.testclient import TestClient

# 1. THE IMPORT IS FIXED:
from .main import app, logger

client = TestClient(app)

# -------------------------------------------------------------------------
# TEST 1: "City not found" Should Log "city_not_found"
# (This test is updated to match your new main.py)
# -------------------------------------------------------------------------
def test_city_not_found_logging(caplog):

    # Mock WeatherAPI returning a "city not found" error
    with patch("backend.main.requests.get") as mock_get:
        # This is what WeatherAPI sends for a 404
        mock_get.return_value.status_code = 404
        mock_get.return_value.json.return_value = {
            "error": {"code": 1006, "message": "No matching location found."}
        }

        # The log we are looking for is a WARNING
        with caplog.at_level(logging.WARNING):
            response = client.get("/weather?city=FakeCity123")

        # The frontend should get a 404
        assert response.status_code == 404

        # Verify the expected log was emitted
        found = False
        for r in caplog.records:
            if getattr(r, "event", None) == "city_not_found":
                assert r.city == "FakeCity123"
                found = True
                
        assert found, "city_not_found log event missing"


# -------------------------------------------------------------------------
# TEST 2: (test_alert_loop_logging)
# This test has been DELETED because the alert loop was
# intentionally commented out of main.py.
# -------------------------------------------------------------------------