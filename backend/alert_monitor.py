# backend/alert_monitor.py
import os
import sys
import time
import json
import logging
from typing import List, Dict, Optional, Any
from pathlib import Path

import requests
from dotenv import load_dotenv

# -------------------------------------------------------------------
# Logging Initialization
# -------------------------------------------------------------------
try:
    from backend.logging_config import setup_logging
    setup_logging()
except Exception:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

logger = logging.getLogger("weather-backend")

# -------------------------------------------------------------------
# Paths & Environment
# -------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRIPT_DIR.parent
ENV_PATH = ROOT_DIR / ".env"

if ENV_PATH.exists():
    load_dotenv(dotenv_path=str(ENV_PATH))
else:
    load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")
BACKEND_HEALTH_URL = f"{BACKEND_URL.rstrip('/')}/health"

WEBHOOK_URL = os.getenv("ALERT_WEBHOOK_URL") or os.getenv("BETTERSTACK_TOKEN")
WEATHER_API_URL = "https://api.weatherapi.com/v1/forecast.json"
API_KEY = os.getenv("API_KEY")

# 🔥 Correct unified settings file (same as backend main.py)
SETTINGS_FILE = str(ROOT_DIR / "settings.json")

# -------------------------------------------------------------------
# Webhook Sender
# -------------------------------------------------------------------
def send_webhook_alert(title: str, message: str) -> None:
    if not WEBHOOK_URL:
        logger.warning({"event": "webhook_missing", "title": title})
        return

    payload = {"text": f":rotating_light: *{title}*\n{message}"}

    try:
        ingestion_host = os.getenv("BETTERSTACK_INGEST_HOST")
        endpoint = ingestion_host if ingestion_host else WEBHOOK_URL

        if endpoint.startswith("http"):
            r = requests.post(endpoint, json=payload, timeout=5)
            r.raise_for_status()
            logger.info({"event": "webhook_sent", "title": title, "status": r.status_code})
        else:
            logger.warning({"event": "webhook_bad_config", "token_snippet": str(endpoint)[:8]})
    except Exception as e:
        logger.error({"event": "webhook_failure", "title": title, "error": str(e)})

# -------------------------------------------------------------------
# Backend Health Check
# -------------------------------------------------------------------
def check_health() -> bool:
    try:
        r = requests.get(BACKEND_HEALTH_URL, timeout=5)
        if r.status_code != 200:
            msg = f"Unhealthy status code: {r.status_code} - body: {r.text}"
            logger.error({"event": "backend_unhealthy", "status": r.status_code})
            send_webhook_alert("Nimbus backend UNHEALTHY", msg)
            return False

        return True

    except Exception as e:
        logger.error({"event": "backend_health_exception", "error": str(e)})
        send_webhook_alert("Nimbus backend DOWN", str(e))
        return False

# -------------------------------------------------------------------
# Load Alert Settings (Supports both dict & list formats)
# -------------------------------------------------------------------
def load_settings() -> List[Dict[str, Any]]:
    """
    Returns a list of:

    [
      { "city": "Bengaluru", "max_temp": 35, "min_temp": 10, "max_wind_kph": 60 },
      ...
    ]
    """

    if not os.path.exists(SETTINGS_FILE):
        logger.warning({"event": "settings_missing", "path": SETTINGS_FILE})
        return []

    try:
        with open(SETTINGS_FILE, "r", encoding="utf-8") as fh:
            data = json.load(fh)
    except Exception as e:
        logger.error({"event": "settings_load_error", "error": str(e)})
        return []

    # Case 1: new frontend format = dict
    if isinstance(data, dict):
        converted = []
        for city, vals in data.items():
            converted.append({
                "city": city,
                "max_temp": vals.get("max_temp"),
                "min_temp": vals.get("min_temp"),
                "max_wind_kph": vals.get("max_wind"),
            })
        logger.info({"event": "settings_loaded_dict", "count": len(converted)})
        return converted

    # Case 2: old format = list
    if isinstance(data, list):
        logger.info({"event": "settings_loaded_list", "count": len(data)})
        return data

    logger.error({"event": "settings_invalid_format"})
    return []

# -------------------------------------------------------------------
# Fetch Weather From WeatherAPI
# -------------------------------------------------------------------
def fetch_weather_external(city: str) -> Optional[Dict[str, Any]]:
    if not API_KEY:
        logger.error({"event": "api_key_missing"})
        return None

    try:
        r = requests.get(WEATHER_API_URL, params={"key": API_KEY, "q": city, "days": 3}, timeout=10)
        if r.status_code != 200:
            logger.error({"event": "weather_api_error", "city": city})
            return None

        return r.json()

    except Exception as e:
        logger.error({"event": "weather_api_exception", "city": city, "error": str(e)})
        return None

# -------------------------------------------------------------------
# Threshold Checking
# -------------------------------------------------------------------
def check_weather_thresholds(settings_list: List[Dict[str, Any]]):
    if not settings_list:
        return True, []

    all_ok = True
    all_breaches = []

    for setting in settings_list:
        city = setting.get("city")
        if not city:
            continue

        raw = fetch_weather_external(city)
        if not raw:
            all_ok = False
            continue

        current = raw.get("current", {})
        temp = current.get("temp_c") or current.get("temp")
        wind = current.get("wind_kph") or current.get("wind")

        breaches = []

        if setting.get("max_temp") is not None and temp is not None and temp > setting["max_temp"]:
            breaches.append(f"Max Temp Exceeded: {temp}°C (> {setting['max_temp']}°C)")

        if setting.get("min_temp") is not None and temp is not None and temp < setting["min_temp"]:
            breaches.append(f"Min Temp Breach: {temp}°C (< {setting['min_temp']}°C)")

        if setting.get("max_wind_kph") is not None and wind is not None and wind > setting["max_wind_kph"]:
            breaches.append(f"Max Wind Exceeded: {wind} kph (> {setting['max_wind_kph']} kph)")

        if breaches:
            all_ok = False
            all_breaches.append({"city": city, "breaches": breaches})

    return all_ok, all_breaches

# -------------------------------------------------------------------
# Manual CLI Run
# -------------------------------------------------------------------
if __name__ == "__main__":
    logger.info({"event": "monitor_start"})

    if not check_health():
        sys.exit(1)

    settings_list = load_settings()
    ok, breaches = check_weather_thresholds(settings_list)

    if not ok:
        logger.error({"event": "monitor_breaches_detected", "breaches": breaches})
        sys.exit(2)

    logger.info({"event": "monitor_complete"})
    sys.exit(0)
