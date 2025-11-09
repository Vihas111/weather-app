import requests
import os
from dotenv import load_dotenv
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import cachetools
import time
import logging

# --- Setup ---
SCRIPT_DIR = Path(__file__).parent
ROOT_DIR = SCRIPT_DIR.parent
ENV_PATH = ROOT_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)
API_KEY = os.getenv("API_KEY")

app = FastAPI()

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


# --- CORS (Allows frontend to talk to backend) ---
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

@app.get("/weather")
def weather_endpoint(city: str = Query(..., min_length=1)):
    start = time.time()
    raw = get_weather_from_api(city)
    
    # Process Hourly Data (only future hours for today)
    current_epoch = raw['location']['localtime_epoch']
    hourly = [
        {
            "time": h['time'].split(' ')[1],
            "temp": h['temp_c'],
            "icon": h['condition']['icon'],
            "wind": h['wind_kph']
        }
        for h in raw['forecast']['forecastday'][0]['hour']
        if h['time_epoch'] > current_epoch
    ]

    # Process 3-Day Forecast
    daily = [
        {
            "date": d['date'],
            "max_temp": d['day']['maxtemp_c'],
            "min_temp": d['day']['mintemp_c'],
            "condition": d['day']['condition']['text'],
            "icon": d['day']['condition']['icon']
        }
        for d in raw['forecast']['forecastday']
    ]

    duration_ms = int((time.time() - start) * 1000)

    return {
        "location": {"city": raw['location']['name'], "region": raw['location']['region']},
        "current": {
            "temp": raw['current']['temp_c'],
            "condition": raw['current']['condition']['text'],
            "icon": raw['current']['condition']['icon'],
            "humidity": raw['current']['humidity'],
            "wind": raw['current']['wind_kph']
        },
        "hourly": hourly,
        "daily": daily,
        "backend_duration_ms": duration_ms
    }


# Add this to the bottom of backend/main.py
@app.get("/")
def read_root():
    return {"status": "Weather API is running!"}