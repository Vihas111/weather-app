# backend/alert_monitor.py
import os
import requests
import time
from dotenv import load_dotenv
import sys
import json
from typing import List, Dict, Optional, Any

# --- Setup ---
SCRIPT_DIR = os.path.dirname(__file__)
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
ENV_PATH = os.path.join(ROOT_DIR, ".env")
load_dotenv(dotenv_path=ENV_PATH)

# --- Config ---
BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")
BACKEND_HEALTH_URL = f"{BACKEND_URL}/health"
WEBHOOK_URL = os.getenv("ALERT_WEBHOOK_URL")

# Weather API config (call external provider directly)
WEATHER_API_URL = "https://api.weatherapi.com/v1/forecast.json"
API_KEY = os.getenv("API_KEY")

# --- Settings File Path ---
SETTINGS_FILE = os.path.join(ROOT_DIR, "alert_settings.json")


def send_webhook_alert(title: str, message: str):
    if not WEBHOOK_URL:
        # webhook not configured — silent
        return
    payload = {"text": f":rotating_light: *{title}*\n{message}"}
    try:
        r = requests.post(WEBHOOK_URL, json=payload, timeout=10)
        r.raise_for_status()
    except Exception as e:
        print(f"Failed to send webhook alert for {title}: {e}")


def check_health():
    try:
        r = requests.get(BACKEND_HEALTH_URL, timeout=5)
        if r.status_code != 200:
            msg = f"Unhealthy status code: {r.status_code} - body: {r.text}"
            send_webhook_alert("Nimbus backend UNHEALTHY", msg)
            return False
        j = r.json()
        ts = j.get("timestamp")
        uptime = j.get("uptime_seconds")
        print(f"OK: Health check passed. Uptime={uptime}s, Timestamp={ts}")
        return True
    except Exception as e:
        msg = f"Exception while checking health: {e}"
        print(msg)
        send_webhook_alert("Nimbus backend DOWN", msg)
        return False


def load_settings() -> List[Dict[str, Any]]:
    """Loads the list of alert settings from the shared JSON file."""
    if not os.path.exists(SETTINGS_FILE):
        print(f"Settings file not found at {SETTINGS_FILE}. Skipping threshold checks.")
        return []
    try:
        with open(SETTINGS_FILE, "r") as f:
            settings_list = json.load(f)
            if not isinstance(settings_list, list):
                print("Settings file is invalid (not a list). Skipping.")
                return []
            return settings_list
    except Exception as e:
        print(f"Error reading settings file: {e}. Skipping threshold checks.")
        return []


def fetch_weather_external(city: str) -> Optional[Dict[str, Any]]:
    """
    Query the external weather API directly (no internal HTTP call).
    Returns the parsed JSON or None on failure.
    """
    if not API_KEY:
        print("No WEATHER API_KEY configured in .env")
        return None

    try:
        params = {"key": API_KEY, "q": city, "days": 3, "aqi": "no"}
        r = requests.get(WEATHER_API_URL, params=params, timeout=10)
        if r.status_code != 200:
            print(f"Weather API error for {city}: {r.status_code} - {r.text}")
            return None
        return r.json()
    except Exception as e:
        print(f"Exception while calling weather API for {city}: {e}")
        return None


def check_weather_thresholds(settings_list: List[Dict[str, Any]]):
    """
    Returns:
      (all_ok: bool, all_breaches: List[{"city": str, "breaches": [str]}])
    """
    if not settings_list:
        # no configured cities -> nothing to check (not an error)
        return True, []

    all_ok = True
    all_breaches = []

    for setting in settings_list:
        city = setting.get("city")
        if not city:
            print("Skipping invalid setting (missing 'city')")
            continue

        alert_max_temp = setting.get("max_temp")
        alert_min_temp = setting.get("min_temp")
        alert_max_wind = setting.get("max_wind_kph")

        print(f"--- Checking weather for: {city} ---")
        raw = fetch_weather_external(city)
        if not raw:
            # If the external fetch failed, optionally send webhook and continue
            print(f"Failed to fetch weather for {city}.")
            # send_webhook_alert(f"Weather Check FAILED: {city}", f"Could not fetch data.")
            all_ok = False
            continue

        current = raw.get("current")
        location_name = raw.get("location", {}).get("name", city)
        if not current:
            print(f"Could not parse 'current' for {city}. Response: {raw}")
            all_ok = False
            continue

        temp = current.get("temp_c") if current.get("temp_c") is not None else current.get("temp")
        wind = current.get("wind_kph") if current.get("wind_kph") is not None else current.get("wind")

        breaches = []

        if alert_max_temp is not None and temp is not None and temp > alert_max_temp:
            breaches.append(f"Max Temp Exceeded: {temp}°C (Threshold: {alert_max_temp}°C)")

        if alert_min_temp is not None and temp is not None and temp < alert_min_temp:
            breaches.append(f"Min Temp Breach: {temp}°C (Threshold: {alert_min_temp}°C)")

        if alert_max_wind is not None and wind is not None and wind > alert_max_wind:
            breaches.append(f"Max Wind Exceeded: {wind} kph (Threshold: {alert_max_wind} kph)")

        if breaches:
            all_ok = False
            print(f"ALERT for {location_name}: {breaches}")
            # send_webhook_alert(f"Weather Threshold Alert for {location_name}", "\n".join(breaches))
            all_breaches.append({"city": location_name, "breaches": breaches})
        else:
            print(f"OK: Weather thresholds passed for {city}.")

    return all_ok, all_breaches


if __name__ == "__main__":
    # Basic CLI mode for manual checks
    print("--- 1. Checking Backend Health ---")
    health_ok = check_health()
    if not health_ok:
        print("Health check FAILED. Exiting.")
        sys.exit(1)

    print("\n--- 2. Loading Settings List ---")
    settings_list = load_settings()

    print("\n--- 3. Checking All Weather Thresholds ---")
    weather_ok, breaches = check_weather_thresholds(settings_list)

    if not weather_ok:
        print("One or more weather threshold checks FAILED. Breaches:")
        print(json.dumps(breaches, indent=2))
        sys.exit(1)

    print("All checks passed.")
    sys.exit(0)
