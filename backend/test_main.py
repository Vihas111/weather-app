import requests
import os

BASE_URL = "http://127.0.0.1:8000"


def test_root_endpoint():
    """Test GET /"""
    response = requests.get(f"{BASE_URL}/")
    assert response.status_code == 200
    assert response.json()["status"] == "Weather API is running!"


def test_weather_endpoint_success():
    """Test valid city"""
    response = requests.get(f"{BASE_URL}/weather?city=London")
    assert response.status_code == 200

    data = response.json()
    assert "location" in data
    assert "current" in data
    assert "hourly" in data
    assert "daily" in data


def test_weather_endpoint_missing_city():
    """Missing city param"""
    response = requests.get(f"{BASE_URL}/weather")
    assert response.status_code == 422


def test_weather_endpoint_invalid_city():
    """Fake city"""
    response = requests.get(f"{BASE_URL}/weather?city=xxxxxxxx")
    assert response.status_code in (400, 404)


def test_settings_crud_cycle():
    """
    Full test for POST, GET, DELETE on settings.
    Matches backend EXACT behavior.
    """
    test_city = "Testville"

    # --- Cleanup first ---
    requests.delete(f"{BASE_URL}/settings/{test_city}")

    # --- CREATE ---
    payload = {
        "max_temp": 30.0,
        "min_temp": 10.0,
        "max_wind_kph": 50.0
    }

    r = requests.post(f"{BASE_URL}/settings/{test_city}", json=payload)
    assert r.status_code == 200
    assert r.json()["city"] == test_city

    # --- VERIFY CREATE ---
    r2 = requests.get(f"{BASE_URL}/settings")
    settings_list = r2.json()

    created = next((s for s in settings_list if s["city"] == test_city), None)
    assert created is not None
    assert created["max_temp"] == 30.0
    assert created["min_temp"] == 10.0
    assert created["max_wind_kph"] == 50.0

    # --- UPDATE ---
    updated_payload = {
        "max_temp": 35.0,
        "min_temp": 12.0,
        "max_wind_kph": None
    }

    r3 = requests.post(f"{BASE_URL}/settings/{test_city}", json=updated_payload)
    assert r3.status_code == 200

    # --- VERIFY UPDATE ---
    r4 = requests.get(f"{BASE_URL}/settings")
    settings_list2 = r4.json()

    updated = next((s for s in settings_list2 if s["city"] == test_city), None)
    assert updated is not None
    assert updated["max_temp"] == 35.0
    assert updated["min_temp"] == 12.0
    assert updated["max_wind_kph"] is None

    # --- DELETE ---
    r5 = requests.delete(f"{BASE_URL}/settings/{test_city}")
    assert r5.status_code == 200   # backend returns JSON, so it's 200

    # --- VERIFY DELETE ---
    r6 = requests.get(f"{BASE_URL}/settings")
    final_list = r6.json()

    assert not any(s["city"] == test_city for s in final_list)
