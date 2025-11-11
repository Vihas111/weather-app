import requests
import os
from dotenv import load_dotenv
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query, Body, Path as FastAPIPath
from fastapi.middleware.cors import CORSMiddleware
import cachetools
import time
import logging
import json
from pydantic import BaseModel
from typing import Optional, List, Dict

# --- Setup ---
SCRIPT_DIR = Path(__file__).parent
ROOT_DIR = SCRIPT_DIR.parent
ENV_PATH = ROOT_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)
API_KEY = os.getenv("API_KEY")

# --- Settings File ---
SETTINGS_FILE = ROOT_DIR / "alert_settings.json"

app = FastAPI()

# ---- track server start time for uptime reporting ----
SERVER_START_TS = time.time()  # <--- THIS LINE WAS MISSING. I'VE ADDED IT BACK.

# --- Response Time Middleware ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.middleware("http")
async def add_process_time_header(request, call_next):
    start = time.time()
    response = await call_next(request)
    duration_ms = int((time.time() - start) * 1000)
    response.headers["X-Response-Time-ms"] = str(duration_ms)
    logger.info(f"{request.method} {request.url.path} - {duration_ms}ms")
    return response

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Cache (15 minutes) ---
api_cache = cachetools.TTLCache(maxsize=100, ttl=900)
@cachetools.cached(api_cache)
def get_weather_from_api(city: str):
    url = "https://api.weatherapi.com/v1/forecast.json"
    params = {"key": API_KEY, "q": city, "days": 3, "aqi": "no"}
    response = requests.get(url, params=params)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return response.json()


# --- NEW: Settings Pydantic Model (Per-City) ---
class CityAlertSetting(BaseModel):
    # Using 'city' as the unique key
    city: str
    max_temp: Optional[float] = None
    min_temp: Optional[float] = None
    max_wind_kph: Optional[float] = None

# --- NEW: Helper functions to read/write the list ---

def read_all_settings() -> List[CityAlertSetting]:
    """Reads the list of settings from the JSON file."""
    if not SETTINGS_FILE.exists():
        return []
    try:
        with open(SETTINGS_FILE, 'r') as f:
            data = json.load(f)
            # Validate and parse the list
            return [CityAlertSetting(**item) for item in data]
    except Exception:
        return []

def write_all_settings(settings: List[CityAlertSetting]):
    """Writes the full list of settings to the JSON file."""
    try:
        # Convert list of Pydantic models to list of dicts
        data_to_write = [item.model_dump() for item in settings]
        with open(SETTINGS_FILE, 'w') as f:
            json.dump(data_to_write, f, indent=4)
    except Exception as e:
        logger.error(f"Failed to save settings file: {e}")
        raise HTTPException(status_code=500, detail="Could not save settings file.")

# --- NEW: Updated Settings Endpoints ---

@app.get("/settings", response_model=List[CityAlertSetting])
def get_all_settings():
    """Reads all current alert settings from the JSON file."""
    return read_all_settings()

@app.post("/settings", response_model=CityAlertSetting)
def add_or_update_setting(setting: CityAlertSetting):
    """
    Adds a new city setting or updates an existing one.
    City name is case-insensitive.
    """
    all_settings = read_all_settings()
    
    # Use a dictionary for easy lookup and to handle case-insensitivity
    settings_dict: Dict[str, CityAlertSetting] = {
        s.city.lower(): s for s in all_settings
    }
    
    # Add or update the setting
    settings_dict[setting.city.lower()] = setting
    
    # Convert back to a list and write
    updated_list = list(settings_dict.values())
    write_all_settings(updated_list)
    
    return setting

@app.delete("/settings/{city_name}", status_code=204)
def delete_setting(city_name: str = FastAPIPath(...)):
    """Deletes a city's setting by name."""
    all_settings = read_all_settings()
    
    # Create a new list *excluding* the city to be deleted (case-insensitive)
    filtered_list = [
        s for s in all_settings if s.city.lower() != city_name.lower()
    ]
    
    # Write the new, smaller list back to the file
    write_all_settings(filtered_list)
    return


# --- Existing Endpoints ---
@app.get("/weather")
def weather_endpoint(city: str = Query(..., min_length=1)):
    start = time.time()
    raw = get_weather_from_api(city)
    current_epoch = raw['location']['localtime_epoch']
    hourly = [
        {"time": h['time'].split(' ')[1], "temp": h['temp_c'], "icon": h['condition']['icon'], "wind": h['wind_kph']}
        for h in raw['forecast']['forecastday'][0]['hour']
        if h['time_epoch'] > current_epoch
    ]
    daily = [
        {"date": d['date'], "max_temp": d['day']['maxtemp_c'], "min_temp": d['day']['mintemp_c'], "condition": d['day']['condition']['text'], "icon": d['day']['condition']['icon']}
        for d in raw['forecast']['forecastday']
    ]
    duration_ms = int((time.time() - start) * 1000)
    return {
        "location": {"city": raw['location']['name'], "region": raw['location']['region']},
        "current": {"temp": raw['current']['temp_c'], "condition": raw['current']['condition']['text'], "icon": raw['current']['condition']['icon'], "humidity": raw['current']['humidity'], "wind": raw['current']['wind_kph']},
        "hourly": hourly,
        "daily": daily,
        "backend_duration_ms": duration_ms
    }

@app.get("/health")
def health_check():
    uptime_sec = int(time.time() - SERVER_START_TS)
    return {"status": "ok", "uptime_seconds": uptime_sec, "timestamp": int(time.time())}

@app.get("/")
def read_root():
    return {"status": "Weather API is running!"}