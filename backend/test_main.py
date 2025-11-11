import requests
import os
import json

# This is the URL where your FastAPI server is running
BASE_URL = "http://127.0.0.1:8000"

# --- Helper to find our settings file (for cleanup) ---
# Assuming this test is run from the root folder
SETTINGS_FILE = "alert_settings.json"


# --- Tests for / and /weather (Unchanged) ---

def test_root_endpoint():
    """
    Tests if the server is running (GET /)
    """
    try:
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200
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
        
        # 2. Check SPECIFIC values exist
        assert data["location"]["city"] == "London"
        assert "temp" in data["current"]
        
        # 3. Check Array Data
        assert len(data["daily"]) > 0
        assert "max_temp" in data["daily"][0]
        
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
    response = requests.get(f"{BASE_URL}/weather?city=zzzzzzzz")
    assert response.status_code == 400


# --- NEW: Test for /settings Endpoints ---

def test_settings_crud_cycle():
    """
    Tests the full Create, Read, and Delete cycle for /settings
    """
    # 1. --- Define our Test Data ---
    test_city = "Testville"
    test_setting_payload = {
        "city": test_city,
        "max_temp": 30.0,
        "min_temp": 10.0,
        "max_wind_kph": 50.0
    }
    
    # 2. --- Cleanup (Just in case) ---
    # Delete the setting if it exists from a previous failed run
    requests.delete(f"{BASE_URL}/settings/{test_city}")
    
    # 3. --- CREATE (POST /settings) ---
    response_post = requests.post(f"{BASE_URL}/settings", json=test_setting_payload)
    assert response_post.status_code == 200
    assert response_post.json()["city"] == test_city
    assert response_post.json()["max_temp"] == 30.0

    # 4. --- READ (GET /settings) ---
    response_get = requests.get(f"{BASE_URL}/settings")
    assert response_get.status_code == 200
    
    all_settings = response_get.json()
    # Find our newly created setting in the list
    found = False
    for setting in all_settings:
        if setting["city"] == test_city:
            found = True
            assert setting["min_temp"] == 10.0
            assert setting["max_wind_kph"] == 50.0
            break
    
    assert found, f"Setting for {test_city} was not found after POST"
    
    # 5. --- UPDATE (POST /settings again) ---
    updated_payload = {
        "city": test_city,
        "max_temp": 35.0, # Changed value
        "min_temp": 12.0, # Changed value
        "max_wind_kph": None # Changed value
    }
    response_update = requests.post(f"{BASE_URL}/settings", json=updated_payload)
    assert response_update.status_code == 200
    assert response_update.json()["max_temp"] == 35.0
    
    # 6. --- READ AGAIN (to verify update) ---
    response_get_updated = requests.get(f"{BASE_URL}/settings")
    all_settings_updated = response_get_updated.json()
    found_updated = False
    for setting in all_settings_updated:
        if setting["city"] == test_city:
            found_updated = True
            assert setting["max_temp"] == 35.0 # Check new value
            assert setting["min_temp"] == 12.0 # Check new value
            assert setting["max_wind_kph"] is None # Check new value
            break
    
    assert found_updated, f"Setting for {test_city} was not found after UPDATE"

    # 7. --- DELETE (DELETE /settings/{city}) ---
    response_delete = requests.delete(f"{BASE_URL}/settings/{test_city}")
    # 204 means "No Content", which is the correct successful response
    assert response_delete.status_code == 204
    
    # 8. --- VERIFY DELETE (GET /settings) ---
    response_get_final = requests.get(f"{BASE_URL}/settings")
    all_settings_final = response_get_final.json()
    
    found_final = False
    for setting in all_settings_final:
        if setting["city"] == test_city:
            found_final = True
            break
            
    assert not found_final, f"Setting for {test_city} was *not* deleted"
    
    print("Settings CRUD test passed!")

# --- A simple way to run all tests if not using pytest ---
if __name__ == "__main__":
    # Clean up the settings file before starting
    if os.path.exists(SETTINGS_FILE):
        os.remove(SETTINGS_FILE)
        print(f"Removed old {SETTINGS_FILE} for a clean test run.")

    print("--- Running Root Test ---")
    test_root_endpoint()
    print("PASSED")

    print("--- Running Weather Success Test ---")
    test_weather_endpoint_success()
    print("PASSED")
    
    print("--- Running Weather Missing City Test ---")
    test_weather_endpoint_missing_city()
    print("PASSED")
    
    print("--- Running Weather Invalid City Test ---")
    test_weather_endpoint_invalid_city()
    print("PASSED")
    
    print("--- Running Settings CRUD Test ---")
    test_settings_crud_cycle()
    print("PASSED")
    
    print("\n✅ All tests passed!")
    
    # Clean up the settings file after
    if os.path.exists(SETTINGS_FILE):
        os.remove(SETTINGS_FILE)