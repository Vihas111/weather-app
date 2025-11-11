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
BACKEND_WEATHER_URL = f"{BACKEND_URL}/weather"
WEBHOOK_URL = os.getenv("ALERT_WEBHOOK_URL")

# --- Settings File Path ---
SETTINGS_FILE = os.path.join(ROOT_DIR, "alert_settings.json")


# ... (Webhook function is unchanged) ...
def send_webhook_alert(title: str, message: str):
    if not WEBHOOK_URL:
        print("No WEBHOOK_URL configured; skipping webhook alert.")
        return
    payload = {"text": f":rotating_light: *{title}*\n{message}"}
    try:
        r = requests.post(WEBHOOK_URL, json=payload, timeout=10)
        r.raise_for_status()
        print(f"Webhook alert sent for: {title}")
    except Exception as e:
        print(f"Failed to send webhook alert for {title}: {e}")

# ... (Health check function is unchanged) ...
def check_health():
    try:
        r = requests.get(BACKEND_HEALTH_URL, timeout=5)
        if r.status_code != 200:
            msg = f"Unhealthy status code: {r.status_code} - body: {r.text}"
            print(msg)
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

# --- UPDATED: Function to load settings list from JSON file ---
def load_settings() -> List[Dict[str, Any]]:
    """Loads the list of alert settings from the shared JSON file."""
    if not os.path.exists(SETTINGS_FILE):
        print(f"Settings file not found at {SETTINGS_FILE}. Skipping threshold checks.")
        return []
    try:
        with open(SETTINGS_FILE, 'r') as f:
            settings_list = json.load(f)
            if not isinstance(settings_list, list):
                print(f"Settings file is invalid (not a list). Skipping.")
                return []
            return settings_list
    except Exception as e:
        print(f"Error reading settings file: {e}. Skipping threshold checks.")
        return []

# --- UPDATED: Weather Threshold Check Function ---
def check_weather_thresholds(settings_list: List[Dict[str, Any]]):
    """
    Checks the /weather endpoint for each city against its
    own specific thresholds.
    """
    if not settings_list:
        print("No city alerts configured; skipping weather threshold checks.")
        return True  # Not a failure, just skipped.

    all_cities_ok = True
    
    # --- Loop through each setting in the list ---
    for setting in settings_list:
        city = setting.get("city")
        if not city:
            print("Skipping invalid setting (missing 'city')")
            continue
        
        # Get this city's specific thresholds
        alert_max_temp = setting.get("max_temp")
        alert_min_temp = setting.get("min_temp")
        alert_max_wind = setting.get("max_wind_kph")

        print(f"--- Checking weather for: {city} ---")
        try:
            r = requests.get(BACKEND_WEATHER_URL, params={"city": city}, timeout=10)
            
            if r.status_code != 200:
                msg = f"Failed to get weather for {city}. Status: {r.status_code}, Body: {r.text}"
                print(msg)
                send_webhook_alert(f"Weather Check FAILED: {city}", msg)
                all_cities_ok = False
                continue

            data = r.json()
            current_weather = data.get('current')
            location_name = data.get('location', {}).get('city', city)

            if not current_weather:
                msg = f"Could not parse 'current' weather for {city}. Response: {data}"
                print(msg)
                send_webhook_alert(f"Weather Check FAILED: {city}", msg)
                all_cities_ok = False
                continue

            # --- Perform Threshold Checks ---
            breaches = []
            temp = current_weather.get('temp')
            wind = current_weather.get('wind')

            # Max Temp Check
            if alert_max_temp is not None and temp is not None and temp > alert_max_temp:
                breaches.append(f"Max Temp Exceeded: {temp}°C (Threshold: {alert_max_temp}°C)")
            
            # Min Temp Check
            if alert_min_temp is not None and temp is not None and temp < alert_min_temp:
                breaches.append(f"Min Temp Breach: {temp}°C (Threshold: {alert_min_temp}°C)")

            # Max Wind Check
            if alert_max_wind is not None and wind is not None and wind > alert_max_wind:
                breaches.append(f"Max Wind Exceeded: {wind} kph (Threshold: {alert_max_wind} kph)")
            
            if breaches:
                all_cities_ok = False
                title = f"Weather Threshold Alert for {location_name}"
                message = "\n".join(breaches)
                print(f"ALERT: {title}\n{message}")
                send_webhook_alert(title, message)
            else:
                print(f"OK: Weather thresholds passed for {city}.")

        except Exception as e:
            msg = f"Exception while checking weather for {city}: {e}"
            print(msg)
            send_webhook_alert(f"Weather Check FAILED: {city}", msg)
            all_cities_ok = False
            
    return all_cities_ok

# --- Main Execution Block (Updated) ---
if __name__ == "__main__":
    print("--- 1. Checking Backend Health ---")
    health_ok = check_health()
    
    if not health_ok:
        print("Health check FAILED. Exiting.")
        sys.exit(1)
    
    print("\n--- 2. Loading Settings List ---")
    settings_list = load_settings()
    
    print("\n--- 3. Checking All Weather Thresholds ---")
    weather_ok = check_weather_thresholds(settings_list)
    
    if not weather_ok:
        print("One or more weather threshold checks FAILED. Exiting.")
        sys.exit(1)
    
    print("\nAll checks passed.")
    sys.exit(0)