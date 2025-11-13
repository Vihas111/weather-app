# backend/main.py
import os
import time
import json
import logging
import asyncio
from pathlib import Path
from typing import List, Optional, Dict, Any

import requests
import cachetools
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Import alerts logic from alert_monitor.py
from .alert_monitor import load_settings, check_weather_thresholds

# --- Setup ---
SCRIPT_DIR = Path(__file__).parent
ROOT_DIR = SCRIPT_DIR.parent
ENV_PATH = ROOT_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

API_KEY = os.getenv("API_KEY")
if not API_KEY:
    logging.warning("No API_KEY found in environment. External weather calls will fail.")

# App
app = FastAPI(title="Nimbus Weather Backend")

# Server uptime
SERVER_START_TS = time.time()

# Global alert state
ALERT_STATUS: Dict[str, Any] = {"active": False, "breaches": []}

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cache (15 minutes)
api_cache = cachetools.TTLCache(maxsize=200, ttl=900)


@cachetools.cached(api_cache)
def get_weather_from_api(city: str) -> dict:
    """
    Query WeatherAPI and return parsed JSON.
    Now detects invalid city and returns 404.
    """
    if not API_KEY:
        raise HTTPException(
            status_code=500, detail="Weather API key is not configured on the server."
        )

    url = "https://api.weatherapi.com/v1/forecast.json"
    params = {"key": API_KEY, "q": city, "days": 3, "aqi": "no"}

    resp = requests.get(url, params=params, timeout=10)

    # If WeatherAPI returns non-200
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    try:
        data = resp.json()
    except ValueError:
        raise HTTPException(status_code=502, detail="Invalid JSON from weather provider")

    # 🚨 Story 1.4 — detect invalid city
    if "error" in data:
        raise HTTPException(status_code=404, detail="City not found")

    return data


# ---------------- City Alert Settings ----------------
class CityAlertSetting(BaseModel):
    city: str
    max_temp: Optional[float] = None
    min_temp: Optional[float] = None
    max_wind_kph: Optional[float] = None


SETTINGS_FILE = ROOT_DIR / "alert_settings.json"


def read_all_settings() -> List[CityAlertSetting]:
    if not SETTINGS_FILE.exists():
        return []
    try:
        with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
            raw = json.load(f)
            if not isinstance(raw, list):
                return []
            return [CityAlertSetting(**item) for item in raw]
    except Exception:
        logging.exception("Failed to read settings file")
        return []


def write_all_settings(settings: List[CityAlertSetting]) -> None:
    def serialize(obj: CityAlertSetting):
        if hasattr(obj, "model_dump"):
            return obj.model_dump()
        if hasattr(obj, "dict"):
            return obj.dict()
        return obj.__dict__

    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump([serialize(s) for s in settings], f, indent=2)


# ---------------- Settings Endpoints ----------------
@app.get("/settings", response_model=List[CityAlertSetting])
def get_all_settings():
    return read_all_settings()


@app.post("/settings", response_model=CityAlertSetting)
def add_or_update_setting(setting: CityAlertSetting):
    all_settings = read_all_settings()
    settings_map = {s.city.lower(): s for s in all_settings}
    settings_map[setting.city.lower()] = setting
    write_all_settings(list(settings_map.values()))
    return setting


@app.delete("/settings/{city}")
def delete_setting(city: str):
    all_settings = read_all_settings()
    filtered = [s for s in all_settings if s.city.lower() != city.lower()]
    write_all_settings(filtered)
    return {"status": "deleted"}


# ---------------- Weather Endpoint ----------------
@app.get("/weather")
def weather_endpoint(city: str = Query(..., min_length=1)):
    start = time.time()

    # Call WeatherAPI
    raw = get_weather_from_api(city)

    current_epoch = raw.get("location", {}).get("localtime_epoch", int(time.time()))

    # Hourly
    hourly = []
    forecast_list = raw.get("forecast", {}).get("forecastday", [])
    if forecast_list:
        try:
            for h in forecast_list[0].get("hour", []):
                if h.get("time_epoch") > current_epoch:
                    hourly.append(
                        {
                            "time": h.get("time", "").split(" ")[1]
                            if " " in h.get("time", "")
                            else h.get("time", ""),
                            "temp": h.get("temp_c"),
                            "icon": h.get("condition", {}).get("icon"),
                            "wind": h.get("wind_kph"),
                        }
                    )
        except Exception:
            logging.exception("Failed parsing hourly data")

    # Daily
    daily = []
    try:
        for d in forecast_list:
            daily.append(
                {
                    "date": d.get("date"),
                    "max_temp": d.get("day", {}).get("maxtemp_c"),
                    "min_temp": d.get("day", {}).get("mintemp_c"),
                    "condition": d.get("day", {}).get("condition", {}).get("text"),
                    "icon": d.get("day", {}).get("condition", {}).get("icon"),
                }
            )
    except Exception:
        logging.exception("Failed parsing daily data")

    duration_ms = int((time.time() - start) * 1000)

    return {
        "location": {
            "city": raw.get("location", {}).get("name"),
            "region": raw.get("location", {}).get("region"),
        },
        "current": {
            "temp": raw.get("current", {}).get("temp_c"),
            "condition": raw.get("current", {}).get("condition", {}).get("text"),
            "icon": raw.get("current", {}).get("condition", {}).get("icon"),
            "humidity": raw.get("current", {}).get("humidity"),
            "wind": raw.get("current", {}).get("wind_kph"),
        },
        "hourly": hourly,
        "daily": daily,
        "backend_duration_ms": duration_ms,
    }


# ---------------- Health Check ----------------
@app.get("/health")
def health_check():
    uptime_sec = int(time.time() - SERVER_START_TS)
    return {"status": "ok", "uptime_seconds": uptime_sec, "timestamp": int(time.time())}


# ---------------- Alerts Status ----------------
@app.get("/alerts/status")
def alert_status():
    return ALERT_STATUS


# ---------------- Background Monitor ----------------
@app.on_event("startup")
async def start_weather_monitor():
    logging.info("🌤 Starting background weather monitor...")

    async def loop():
        while True:
            try:
                settings = load_settings()
                ok, breaches = check_weather_thresholds(settings)

                if breaches:
                    ALERT_STATUS["active"] = True
                    ALERT_STATUS["breaches"] = breaches
                else:
                    ALERT_STATUS["active"] = False
                    ALERT_STATUS["breaches"] = []
            except Exception:
                logging.exception("Monitor error")

            await asyncio.sleep(1)

    asyncio.create_task(loop())


# ---------------- Root ----------------
@app.get("/")
def root():
    return {"status": "Weather API is running!"}
