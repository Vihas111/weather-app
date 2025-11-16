import requests
import os

BASE_URL = "http://127.0.0.1:8000"


def test_root_endpoint():
    """Test GET /"""
    response = requests.get(f"{BASE_URL}/")
    assert response.status_code == 200
    assert response.json()["status"] == "Weather API is running!"


def test_weather_endpoint_success():
    """Test valid city and check for new chance_of_rain field"""
    response = requests.get(f"{BASE_URL}/weather?city=London")
    assert response.status_code == 200

    data = response.json()
    assert "location" in data
    assert "current" in data
    assert "hourly" in data
    assert "daily" in data
    
    # NEW CHECKS for the features we added
    assert "chance_of_rain" in data["current"]
    assert "chance_of_rain" in data["hourly"][0]
    assert "chance_of_rain" in data["daily"][0]


def test_weather_endpoint_missing_city():
    """Missing city param"""
    response = requests.get(f"{BASE_URL}/weather")
    assert response.status_code == 422


def test_weather_endpoint_invalid_city():
    """Fake city"""
    response = requests.get(f"{BASE_URL}/weather?city=xxxxxxxx")
    # A fake city can return 400 (Bad Request) or 404 (Not Found)
    assert response.status_code in (400, 404)
#
# test_settings_crud_cycle() has been removed because
# these endpoints are no longer used by the frontend.
#

if __name__ == "__main__":
    # A simple runner
    print("Running test: test_root_endpoint")
    test_root_endpoint()
    print("PASSED")
    
    print("Running test: test_weather_endpoint_success")
    test_weather_endpoint_success()
    print("PASSED")
    
    print("Running test: test_weather_endpoint_missing_city")
    test_weather_endpoint_missing_city()
    print("PASSED")
    
    print("Running test: test_weather_endpoint_invalid_city")
    test_weather_endpoint_invalid_city()
    print("PASSED")
    
    print("\n✅ All relevant tests passed!")