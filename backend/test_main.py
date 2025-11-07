import requests

# This is the URL where your FastAPI server is running
BASE_URL = "http://127.0.0.1:8000"

def test_root_endpoint():
    """
    Tests if the server is running (GET /)
    """
    try:
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200
        # This message might change if you changed the root endpoint text
        # but it should at least be a 200 OK.
    except requests.exceptions.ConnectionError:
        assert False, "Could not connect to the server. Is it running?"

def test_weather_endpoint_success():
    """
    Tests a valid city search (GET /weather?city=London)
    """
    try:
        response = requests.get(f"{BASE_URL}/weather?city=London")
        assert response.status_code == 200
        
        data = response.json()
        
        # 1. Check HIGH-LEVEL keys exist
        assert "location" in data
        assert "current" in data
        assert "hourly" in data
        assert "daily" in data
        
        # 2. Check SPECIFIC values exist (proving our processing worked)
        assert data["location"]["city"] == "London"
        assert "temp" in data["current"]
        assert "humidity" in data["current"]
        assert "wind" in data["current"]
        
        # 3. Check Array Data
        assert len(data["daily"]) > 0  # Should have at least today's forecast
        assert "max_temp" in data["daily"][0] # Check first day has max_temp
        
    except requests.exceptions.ConnectionError:
        assert False, "Server not running"

def test_weather_endpoint_missing_city():
    """
    Tests that missing the 'city' parameter fails correctly (422 Error)
    """
    response = requests.get(f"{BASE_URL}/weather")
    assert response.status_code == 422

def test_weather_endpoint_invalid_city():
    """
    Tests searching for a fake city (should return 400 or 404 from WeatherAPI)
    """
    # "zzzzzzzz" is unlikely to be a real city
    response = requests.get(f"{BASE_URL}/weather?city=zzzzzzzz")
    # WeatherAPI usually returns 400 for "No matching location found."
    assert response.status_code == 400