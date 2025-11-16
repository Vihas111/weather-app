import os
import time
import json
import logging
import asyncio
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

import requests
import cachetools
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Logging
from .logging_config import setup_logging
logger = setup_logging()

# Alerts
from .alert_monitor import load_settings, check_weather_thresholds

# ---------------------- Setup ----------------------
SCRIPT_DIR = Path(__file__).parent
ROOT_DIR = SCRIPT_DIR.parent
ENV_PATH = ROOT_DIR / ".env"
load_dotenv(ENV_PATH)

API_KEY = os.getenv("API_KEY")

app = FastAPI(title="Nimbus Weather Backend")

ALERT_STATUS = {"active": False, "breaches": []}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

api_cache = cachetools.TTLCache(maxsize=300, ttl=900)

SETTINGS_PATH = ROOT_DIR / "settings.json"

# ---------------------------------------------------
# Date Parsing Helpers
# ---------------------------------------------------
def parse_dt(s: str) -> datetime:
    fmts = ["%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M", "%Y-%m-%d"]
    for f in fmts:
        try:
            return datetime.strptime(s, f)
        except:
            continue
    raise HTTPException(400, "Invalid date format")

def day_list(start: datetime, end: datetime) -> List[datetime]:
    cur = start.date()
    last = end.date()
    out = []
    while cur <= last:
        out.append(datetime(cur.year, cur.month, cur.day))
        cur += timedelta(days=1)
    return out

# ---------------------------------------------------
# WeatherAPI Forecast Wrapper
# ---------------------------------------------------
@cachetools.cached(api_cache)
def get_weather_forecast(city: str) -> dict:

    logger.info("", extra={"event": "weather_api_called", "city": city, "breaches": None})

    if not API_KEY:
        raise HTTPException(500, "Missing WeatherAPI key")

    url = "https://api.weatherapi.com/v1/forecast.json"

    # ⭐ LOG external API request failures
    try:
        resp = requests.get(url, params={"key": API_KEY, "q": city, "days": 3}, timeout=5)
    except Exception as e:
        logger.error(
            "",
            extra={
                "event": "weather_api_request_failed",
                "city": city,
                "breaches": str(e),
            },
        )
        raise HTTPException(500, "Weather API request failed")

    # ⭐⭐⭐ THIS IS THE ONLY FIX ADDED (Option A) ⭐⭐⭐
    if resp.status_code != 200:
        logger.error(
            "",
            extra={
                "event": "weather_api_error",
                "city": city,
                "breaches": f"status={resp.status_code}",
            },
        )
        raise HTTPException(500, "Weather API returned an error")
    # ⭐⭐⭐ END OF FIX ⭐⭐⭐

    data = resp.json()

    # ⭐ City not found logging
    if "error" in data:
        logger.warning(
            "",
            extra={
                "event": "city_not_found",
                "city": city,
                "breaches": data["error"],
            },
        )
        raise HTTPException(404, "City not found")

    return data

@app.get("/weather")
def weather(city: str):

    logger.info("", extra={"event": "weather_endpoint_hit", "city": city, "breaches": None})

    raw = get_weather_forecast(city)

    current = raw.get("current", {})
    location = raw.get("location", {})
    astro = raw.get("forecast", {}).get("forecastday", [{}])[0].get("astro", {})

    hourly = []
    forecast = raw.get("forecast", {}).get("forecastday", [])
    if forecast:
        for h in forecast[0].get("hour", []):
            hourly.append({
                "time": h.get("time", ""),
                "temp": h.get("temp_c"),
                "wind": h.get("wind_kph"),
                "icon": h.get("condition", {}).get("icon", "")
            })

    daily = []
    for d in forecast:
        fd = d.get("day", {})
        daily.append({
            "date": d.get("date", ""),
            "max_temp": fd.get("maxtemp_c"),
            "min_temp": fd.get("mintemp_c"),
            "condition": fd.get("condition", {}).get("text", ""),
            "icon": fd.get("condition", {}).get("icon", ""),
        })

    return {
        "location": location,
        "current": {
            "temp_c": current.get("temp_c"),
            "wind_kph": current.get("wind_kph"),
            "humidity": current.get("humidity"),
            "condition": current.get("condition", {}),
            "sunrise": astro.get("sunrise", ""),
            "sunset": astro.get("sunset", "")
        },
        "hourly": hourly,
        "daily": daily
    }

# ---------------------------------------------------
# HISTORY ENDPOINT
# ---------------------------------------------------
@app.get("/api/weather/history")
def history(city: str, start: str, end: str):

    logger.info("", extra={"event": "history_endpoint_hit", "city": city, "breaches": None})

    start_dt = parse_dt(start)
    end_dt = parse_dt(end)

    if end_dt < start_dt:
        raise HTTPException(400, "End must be after start")

    span = end_dt - start_dt

    # HOURLY MODE
    if span <= timedelta(hours=24):
        hourly = []
        for d in day_list(start_dt, end_dt):
            dstr = d.strftime("%Y-%m-%d")
            url = "https://api.weatherapi.com/v1/history.json"
            resp = requests.get(url, params={"key": API_KEY, "q": city, "dt": dstr})

            if resp.status_code != 200:
                logger.error(
                    "",
                    extra={
                        "event": "history_api_error",
                        "city": city,
                        "breaches": f"status {resp.status_code}",
                    },
                )
                continue

            raw = resp.json()
            hours = raw.get("forecast", {}).get("forecastday", [{}])[0].get("hour", [])

            for h in hours:
                try:
                    hdt = datetime.strptime(h["time"], "%Y-%m-%d %H:%M")
                except:
                    continue
                if start_dt <= hdt <= end_dt:
                    hourly.append({
                        "time": h["time"],
                        "temp": h["temp_c"],
                        "wind": h["wind_kph"],
                        "humidity": h["humidity"],
                    })

        hourly.sort(key=lambda x: x["time"])
        return {"mode": "hourly", "data": hourly}

    # DAILY MODE
    results = []
    for d in day_list(start_dt, end_dt):
        dstr = d.strftime("%Y-%m-%d")
        url = "https://api.weatherapi.com/v1/history.json"
        resp = requests.get(url, params={"key": API_KEY, "q": city, "dt": dstr})

        if resp.status_code != 200:
            logger.error(
                "",
                extra={
                    "event": "history_api_error",
                    "city": city,
                    "breaches": f"status {resp.status_code}",
                },
            )
            continue

        raw = resp.json()
        fd = raw.get("forecast", {}).get("forecastday", [{}])[0]
        hours = fd.get("hour", [])
        astro = fd.get("astro", {})

        temps = [h.get("temp_c") for h in hours if h.get("temp_c") is not None]
        winds = [h.get("wind_kph") for h in hours if h.get("wind_kph") is not None]
        hums  = [h.get("humidity") for h in hours if h.get("humidity") is not None]

        def avg_min_max(arr):
            if not arr:
                return None, None, None
            return (
                round(sum(arr)/len(arr), 2),
                round(min(arr), 2),
                round(max(arr), 2),
            )

        avg_t, min_t, max_t = avg_min_max(temps)
        avg_w, min_w, max_w = avg_min_max(winds)
        avg_h, min_h, max_h = avg_min_max(hums)

        results.append({
            "date": dstr,
            "temp_avg": avg_t,
            "temp_min": min_t,
            "temp_max": max_t,
            "wind_avg": avg_w,
            "wind_min": min_w,
            "wind_max": max_w,
            "humidity_avg": avg_h,
            "humidity_min": min_h,
            "humidity_max": max_h,
            "sunrise": astro.get("sunrise", ""),
            "sunset": astro.get("sunset", ""),
        })

    return {"mode": "daily", "data": results}

# ---------------------------------------------------
# SETTINGS ENDPOINTS
# ---------------------------------------------------
def load_settings_file() -> Dict[str, Any]:
    if SETTINGS_PATH.exists():
        try:
            return json.load(open(SETTINGS_PATH, "r"))
        except:
            return {}
    return {}

def save_settings_file(data: Dict[str, Any]):
    json.dump(data, open(SETTINGS_PATH, "w"), indent=2)

@app.get("/settings")
def get_settings():

    logger.info("", extra={"event": "settings_load", "city": None, "breaches": None})

    raw = load_settings_file()

    return [
        {
            "city": city,
            "max_temp": vals.get("max_temp"),
            "min_temp": vals.get("min_temp"),
            "max_wind_kph": vals.get("max_wind_kph"),
        }
        for city, vals in raw.items()
    ]

class CitySetting(BaseModel):
    max_temp: Optional[float] = None
    min_temp: Optional[float] = None
    max_wind_kph: Optional[float] = None

@app.post("/settings/{city}")
def save_setting(city: str, setting: CitySetting):

    logger.info("", extra={"event": "settings_save", "city": city, "breaches": None})

    raw = load_settings_file()

    try:
        raw[city] = {
            "max_temp": setting.max_temp,
            "min_temp": setting.min_temp,
            "max_wind_kph": setting.max_wind_kph,
        }
        save_settings_file(raw)

    except Exception as e:
        logger.error(
            "",
            extra={
                "event": "settings_save_failed",
                "city": city,
                "breaches": str(e),
            },
        )
        raise

    return {"status": "saved", "city": city}

@app.delete("/settings/{city}")
def delete_setting(city: str):

    logger.info("", extra={"event": "settings_delete", "city": city, "breaches": None})

    raw = load_settings_file()
    if city in raw:
        del raw[city]
        save_settings_file(raw)
    return {"status": "deleted", "city": city}

# ---------------------------------------------------
@app.get("/health")
def health():
    logger.info("", extra={"event": "health_check", "city": None, "breaches": None})
    return {"status": "ok"}

@app.get("/alerts/status")
def alerts_status():
    return ALERT_STATUS

@app.on_event("startup")
async def on_start():
    async def loop():
        while True:
            try:
                settings = load_settings()
                ok, breaches = check_weather_thresholds(settings)

                ALERT_STATUS["active"] = bool(breaches)
                ALERT_STATUS["breaches"] = breaches

                # LOG alert loop status
                logger.info(
                    "",
                    extra={"event": "alert_loop", "city": None, "breaches": breaches},
                )

            except Exception as e:
                logger.error(
                    "",
                    extra={
                        "event": "alert_loop_error",
                        "city": None,
                        "breaches": str(e),
                    },
                )

            await asyncio.sleep(1)

    asyncio.create_task(loop())

@app.get("/")
def root():
    logger.info("", extra={"event": "root_hit", "city": None, "breaches": None})
    return {"status": "Weather API is running!"}
