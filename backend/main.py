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
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .alert_monitor import load_settings, check_weather_thresholds

# ---------------------- Setup ----------------------
SCRIPT_DIR = Path(__file__).parent
ROOT_DIR = SCRIPT_DIR.parent
ENV_PATH = ROOT_DIR / ".env"
load_dotenv(ENV_PATH)

API_KEY = os.getenv("API_KEY")

app = FastAPI(title="Nimbus Weather Backend")
SERVER_START_TS = time.time()

ALERT_STATUS = {"active": False, "breaches": []}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

api_cache = cachetools.TTLCache(maxsize=300, ttl=900)

# ---------------------------------------------------
# Flexible datetime parser
# ---------------------------------------------------
def parse_dt(s: str) -> datetime:
    fmts = ["%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M", "%Y-%m-%d"]
    for f in fmts:
        try:
            return datetime.strptime(s, f)
        except:
            continue
    raise HTTPException(400, "Invalid date format; must be YYYY-MM-DD or YYYY-MM-DDTHH:MM")

def day_list(start: datetime, end: datetime) -> List[datetime]:
    cur = start.date()
    last = end.date()
    days = []
    while cur <= last:
        days.append(datetime(cur.year, cur.month, cur.day))
        cur += timedelta(days=1)
    return days

# ---------------------------------------------------
# WeatherAPI forecast wrapper
# ---------------------------------------------------
@cachetools.cached(api_cache)
def get_weather_forecast(city: str) -> dict:
    if not API_KEY:
        raise HTTPException(500, "Missing WeatherAPI key")

    url = "https://api.weatherapi.com/v1/forecast.json"
    resp = requests.get(url, params={"key": API_KEY, "q": city, "days": 3})

    if resp.status_code != 200:
        raise HTTPException(resp.status_code, resp.text)

    data = resp.json()
    if "error" in data:
        raise HTTPException(404, "City not found")

    return data

@app.get("/weather")
def weather(city: str):
    raw = get_weather_forecast(city)

    current = raw.get("current", {})
    location = raw.get("location", {})

    # Astro values
    astro = raw.get("forecast", {}).get("forecastday", [{}])[0].get("astro", {})

    # Build HOURLY
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

    # Build DAILY
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
        "location": {
            "name": location.get("name", ""),
            "region": location.get("region", ""),
            "country": location.get("country", "")
        },
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
    start_dt = parse_dt(start)
    end_dt = parse_dt(end)

    if end_dt < start_dt:
        raise HTTPException(400, "End must be after start")

    span = end_dt - start_dt

    # ---------------- HOURLY MODE ----------------
    if span <= timedelta(hours=24):
        hourly = []

        for d in day_list(start_dt, end_dt):
            dstr = d.strftime("%Y-%m-%d")
            url = "https://api.weatherapi.com/v1/history.json"
            resp = requests.get(url, params={"key": API_KEY, "q": city, "dt": dstr})

            if resp.status_code != 200:
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

    # ---------------- DAILY MODE ----------------
    results = []
    for d in day_list(start_dt, end_dt):
        dstr = d.strftime("%Y-%m-%d")
        url = "https://api.weatherapi.com/v1/history.json"
        resp = requests.get(url, params={"key": API_KEY, "q": city, "dt": dstr})

        if resp.status_code != 200:
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

            # 🌅 NEW FIELDS
            "sunrise": astro.get("sunrise", ""),
            "sunset": astro.get("sunset", ""),
        })

    return {"mode": "daily", "data": results}

# ---------------------------------------------------
@app.get("/health")
def health():
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
            except:
                pass
            await asyncio.sleep(1)

    asyncio.create_task(loop())

@app.get("/")
def root():
    return {"status": "Weather API is running!"}
