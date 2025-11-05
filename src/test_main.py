import requests

# This is the URL where your FastAPI server is running
BASE_URL = "http://127.0.0.1:8000"

def test_root_endpoint():
    """
    Tests the main "/" endpoint to see if the server is alive.
    """
    try:
        response = requests.get(f"{BASE_URL}/")

        # Check if the request was successful (status code 200)
        assert response.status_code == 200

        # Check if the JSON response is what we expect
        data = response.json()
        assert data == {"status": "Weather API is running!"}

    except requests.exceptions.ConnectionError:
        # If the server isn't running, this test will fail
        assert False, "Could not connect to the server. Is it running?"

def test_weather_endpoint_no_city():
    """
    Tests that the /weather endpoint correctly returns an error
    if no 'city' is provided.
    """
    try:
        response = requests.get(f"{BASE_URL}/weather")

        # A "client error" (like missing parameter) is 4xx
        # The server should not crash (500 error)
        assert response.status_code == 422 # 422 is FastAPI's code for "Validation Error"

        data = response.json()
        assert "detail" in data  # Check that an error message was sent

    except requests.exceptions.ConnectionError:
        assert False, "Could not connect to the server. Is it running?"