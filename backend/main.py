import requests
import os
from dotenv import load_dotenv
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import cachetools
import time
import logging
import json
from pydantic import BaseModel
from typing import Optional, List, Dict
import asyncio

# Import alerts logic
from alert_monitor import load_settings, check_weather_thresholds

# --- Setup ---
SCRIPT_DIR = Path(__file__).parent
ROOT_DIR = SCRIPT_DIR.parent
ENV_PATH = ROOT_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)
API_KEY = os.getenv("API_KEY")

app = FastAPI()

# ---- Server uptime tracking ----
SERVER_START_TS = time.time()

# ----------- ALERT STATE (GLOBAL) -----------
ALERT_STATUS = {"active": False, "breaches": []}

# ----------- CORS -----------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------- Weather Cache -----------
api_cache = cachetools.TTLCache(maxsize=100, ttl=900)

@cachetools.cached(api_cache)
def get_weather_from_api(city: str):
    url = "https://api.weatherapi.com/v1/forecast.json"
    params = {"key": API_KEY, "q": city, "days": 3, "aqi": "no"}
    response = requests.get(url, params=params)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return response.json()

# ----------- CITY ALERT SETTINGS MODEL -----------

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
        with open(SETTINGS_FILE, "r") as f:
            data = json.load(f)
            return [CityAlertSetting(**item) for item in data]
    except:
        return []


def write_all_settings(settings: List[CityAlertSetting]):
    with open(SETTINGS_FILE, "w") as f:
        json.dump([s.model_dump() for s in settings], f, indent=4)

# ----------- SETTINGS ENDPOINTS -----------

@app.get("/settings", response_model=List[CityAlertSetting])
def get_all_settings():
    return read_all_settings()

@app.post("/settings")
def add_or_update_setting(setting: CityAlertSetting):
    all_settings = read_all_settings()
    settings_dict = {s.city.lower(): s for s in all_settings}
    settings_dict[setting.city.lower()] = setting
    write_all_settings(list(settings_dict.values()))
    return setting

@app.delete("/settings/{city}")
def delete_setting(city: str):
    all_settings = read_all_settings()
    filtered = [s for s in all_settings if s.city.lower() != city.lower()]
    write_all_settings(filtered)
    return {"status": "deleted"}

# ----------- WEATHER ENDPOINT -----------

@app.get("/weather")
def weather_endpoint(city: str = Query(...)):
    start = time.time()
    raw = get_weather_from_api(city)
    current_epoch = raw["location"]["localtime_epoch"]

    hourly = [
        {
            "time": h["time"].split(" ")[1],
            "temp": h["temp_c"],
            "icon": h["condition"]["icon"],
            "wind": h["wind_kph"],
        }
        for h in raw["forecast"]["forecastday"][0]["hour"]
        if h["time_epoch"] > current_epoch
    ]

    daily = [
        {
            "date": d["date"],
            "max_temp": d["day"]["maxtemp_c"],
            "min_temp": d["day"]["mintemp_c"],
            "condition": d["day"]["condition"]["text"],
            "icon": d["day"]["condition"]["icon"],
        }
        for d in raw["forecast"]["forecastday"]
    ]

    duration_ms = int((time.time() - start) * 1000)
    return {
        "location": {
            "city": raw["location"]["name"],
            "region": raw["location"]["region"],
        },
        "current": {
            "temp": raw["current"]["temp_c"],
            "condition": raw["current"]["condition"]["text"],
            "icon": raw["current"]["condition"]["icon"],
            "humidity": raw["current"]["humidity"],
            "wind": raw["current"]["wind_kph"],
        },
        "hourly": hourly,
        "daily": daily,
        "backend_duration_ms": duration_ms,
    }

# ----------- HEALTH ENDPOINT -----------

@app.get("/health")
def health_check():
    uptime_sec = int(time.time() - SERVER_START_TS)
    return {"status": "ok", "uptime_seconds": uptime_sec, "timestamp": int(time.time())}

# ----------- ALERT STATUS ENDPOINT -----------

@app.get("/alerts/status")
def alert_status():
    return ALERT_STATUS

# ----------- BACKGROUND WEATHER MONITOR -----------

@app.on_event("startup")
async def start_weather_monitor():
    print("🌤 Starting background weather monitor...")

    async def monitor_loop():
        while True:
            settings = load_settings()
            ok, breaches = check_weather_thresholds(settings)

            if breaches and len(breaches) > 0:
                ALERT_STATUS["active"] = True
                ALERT_STATUS["breaches"] = breaches
            else:
                ALERT_STATUS["active"] = False
                ALERT_STATUS["breaches"] = []

            await asyncio.sleep(1)

    asyncio.create_task(monitor_loop())

# Root endpoint
@app.get("/")
def root():
    return {"status": "Weather API is running!"}
