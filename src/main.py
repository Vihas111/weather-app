import requests
import json
import os
from dotenv import load_dotenv
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

# New imports for CSV logging
import csv
from datetime import datetime
import threading

# --- 1. Setup & API Key ---

SCRIPT_DIR = Path(__file__).parent  # This is the src/ folder
ROOT_DIR = SCRIPT_DIR.parent      # This is the weather/ folder
ENV_PATH = ROOT_DIR / ".env"
DATA_DIR = ROOT_DIR / "data"      # Path to your data folder

load_dotenv(dotenv_path=ENV_PATH)
API_KEY = os.getenv("API_KEY")

if not API_KEY:
    print("FATAL ERROR: API_KEY not found in .env file")
    
# Your full city list
CITY_COORDS = {
    # Original Cities (81)
    "New Delhi": (28.6139, 77.2090),
    "Mumbai": (19.0760, 72.8777),
    "Bengaluru": (12.9716, 77.5946),
    "Chennai": (13.0827, 80.2707),
    "Hyderabad": (17.3850, 78.4867),
    "Kolkata": (22.5726, 88.3639),
    "Pune": (18.5204, 73.8567),
    "Ahmedabad": (23.0225, 72.5714),
    "Jaipur": (26.9124, 75.7873),
    "Lucknow": (26.8467, 80.9462),

    "New York": (40.7128, -74.0060),
    "Los Angeles": (34.0522, -118.2437),
    "Chicago": (41.8781, -87.6298),
    "Houston": (29.7604, -95.3698),
    "Phoenix": (33.4484, -112.0740),
    "Philadelphia": (39.9526, -75.1652),
    "San Antonio": (29.4241, -98.4936),
    "San Diego": (32.7157, -117.1611),
    "Dallas": (32.7767, -96.7970),
    "San Jose": (37.3382, -121.8863),

    "London": (51.5074, -0.1278),
    "Paris": (48.8566, 2.3522),
    "Berlin": (52.52, 13.4050),
    "Rome": (41.9028, 12.4964),
    "Madrid": (40.4168, -3.7038),
    "Amsterdam": (52.3676, 4.9041),
    "Vienna": (48.2082, 16.3738),
    "Milan": (45.4642, 9.1900),
    "Munich": (48.1351, 11.5820),
    "Barcelona": (41.3851, 2.1734),

    "Tokyo": (35.6895, 139.6917),
    "Osaka": (34.6937, 135.5023),
    "Seoul": (37.5665, 126.9780),
    "Busan": (35.1796, 129.0756),
    "Beijing": (39.9042, 116.4074),
    "Shanghai": (31.2304, 121.4737),
    "Shenzhen": (22.5431, 114.0579),
    "Guangzhou": (23.1291, 113.2644),
    "Chengdu": (30.5728, 104.0668),
    "Wuhan": (30.5928, 114.3055),

    "Singapore": (1.3521, 103.8198),
    "Bangkok": (13.7563, 100.5018),
    "Jakarta": (6.2088, 106.8456),
    "Kuala Lumpur": (3.1390, 101.6869),
    "Manila": (14.5995, 120.9842),
    "Hanoi": (21.0285, 105.8542),
    "Ho Chi Minh City": (10.8231, 106.6297),
    "Taipei": (25.0329, 121.5654),
    "Hong Kong": (22.3193, 114.1694),
    "Kathmandu": (27.7172, 85.3240),

    "Sydney": (-33.8688, 151.2093),
    "Melbourne": (-37.8136, 144.9631),
    "Perth": (-31.9523, 115.8613),
    "Brisbane": (-27.4698, 153.0251),
    "Auckland": (-36.8485, 174.7633),
    "Wellington": (-41.2865, 174.7762),
    "Adelaide": (-34.9285, 138.6007),
    "Canberra": (-35.2809, 149.1300),
    "Hobart": (-42.8821, 147.3272),
    "Darwin": (-12.4634, 130.8456),

    "Cairo": (30.0444, 31.2357),
    "Lagos": (6.5244, 3.3792),
    "Nairobi": (-1.2921, 36.8219),
    "Johannesburg": (-26.2041, 28.0473),
    "Cape Town": (-33.9249, 18.4241),
    "Casablanca": (33.5731, -7.5898),
    "Accra": (5.6037, -0.1870),
    "Algiers": (36.7538, 3.0588),
    "Dar es Salaam": (-6.7924, 39.2083),
    "Kampala": (0.3476, 32.5825),

    "São Paulo": (-23.5505, -46.6333),
    "Rio de Janeiro": (-22.9068, -43.1729),
    "Buenos Aires": (-34.6037, -58.3816),
    "Santiago": (-33.4489, -70.6693),
    "Lima": (-12.0464, -77.0428),
    "Bogotá": (4.7110, -74.0721),
    "Mexico City": (19.4326, -99.1332),
    "Monterrey": (25.6866, -100.3161),
    "Guadalajara": (20.6597, -103.3496),
    "Caracas": (10.4806, -66.9036),
    "Quito": (-0.1807, -78.4678),

    # Added 50 Cities
    "Toronto": (43.6532, -79.3832),
    "Montreal": (45.5017, -73.5673),
    "Vancouver": (49.2827, -123.1207),
    "Washington D.C.": (38.9072, -77.0369),
    "Boston": (42.3601, -71.0589),
    "Miami": (25.7617, -80.1918),
    "Seattle": (47.6062, -122.3321),
    "Atlanta": (33.7490, -84.3880),
    "Dublin": (53.3498, -6.2603),
    "Brussels": (50.8503, 4.3517),
    "Copenhagen": (55.6761, 12.5683),
    "Stockholm": (59.3293, 18.0686),
    "Oslo": (59.9139, 10.7522),
    "Helsinki": (60.1699, 24.9384),
    "Zurich": (47.3769, 8.5417),
    "Geneva": (46.2044, 6.1432),
    "Moscow": (55.7558, 37.6173),
    "St. Petersburg": (59.9343, 30.3351),
    "Warsaw": (52.2297, 21.0122),
    "Prague": (50.0755, 14.4378),
    "Budapest": (47.4979, 19.0402),
    "Athens": (37.9838, 23.7275),
    "Lisbon": (38.7223, -9.1393),
    "Istanbul": (41.0082, 28.9784),
    "Dubai": (25.2770, 55.2962),
    "Riyadh": (24.7136, 46.6753),
    "Doha": (25.2854, 51.5310),
    "Abu Dhabi": (24.4539, 54.3773),
    "Tel Aviv": (32.0853, 34.7818),
    "Tehran": (35.6892, 51.3890),
    "Baghdad": (33.3152, 44.3661),
    "Pretoria": (-25.7479, 28.2293),
    "Dakar": (14.7167, -17.4677),
    "Addis Ababa": (9.0054, 38.7578),
    "Kinshasa": (-4.4419, 15.2663),
    "Rabat": (34.0209, -6.8417),
    "Karachi": (24.8607, 67.0011),
    "Lahore": (31.5204, 74.3587),
    "Dhaka": (23.8103, 90.4125),
    "Tashkent": (41.2995, 69.2401),
    "Almaty": (43.2220, 76.8512),
    "Chongqing": (29.4316, 106.9123),
    "Tianjin": (39.3434, 117.3616),
    "Xi'an": (34.3416, 108.9398),
    "Surabaya": (-7.2575, 112.7521),
    "Yangon": (16.8661, 96.1951),
    "Phnom Penh": (11.5564, 104.9282),
    "Havana": (23.1136, -82.3666),
    "Panama City": (8.9824, -79.5199),
    "Medellin": (6.2442, -75.5812),

    # Added 100 More Cities
    "Denver": (39.7392, -104.9903),
    "Las Vegas": (36.1699, -115.1398),
    "New Orleans": (29.9511, -90.0715),
    "Detroit": (42.3314, -83.0458),
    "Minneapolis": (44.9778, -93.2650),
    "Calgary": (51.0447, -114.0719),
    "Edmonton": (53.5461, -113.4938),
    "Ottawa": (45.4215, -75.6972),
    "Tijuana": (32.5149, -117.0382),
    "Puebla": (19.0414, -98.2063),
    "St. Louis": (38.6270, -90.1994),
    "Baltimore": (39.2904, -76.6122),
    "Tampa": (27.9506, -82.4572),
    "Honolulu": (21.3069, -157.8583),
    "Anchorage": (61.2181, -149.9003),
    "Brasília": (-15.7942, -47.8825),
    "Salvador": (-12.9777, -38.5016),
    "Fortaleza": (-3.7319, -38.5267),
    "Curitiba": (-25.4284, -49.2733),
    "Maracaibo": (10.6421, -71.6123),
    "Guayaquil": (-2.1710, -79.9224),
    "Cali": (3.4516, -76.5320),
    "Montevideo": (-34.9011, -56.1645),
    "La Paz": (-16.4897, -68.1193),
    "Asunción": (-25.2637, -57.5759),
    "Birmingham": (52.4862, -1.8904),
    "Manchester": (53.4839, -2.2446),
    "Glasgow": (55.8642, -4.2518),
    "Hamburg": (53.5511, 9.9937),
    "Cologne": (50.9375, 6.9603),
    "Frankfurt": (50.1109, 8.6821),
    "Lyon": (45.7640, 4.8357),
    "Marseille": (43.2965, 5.3698),
    "Rotterdam": (51.9244, 4.4777),
    "Antwerp": (51.2194, 4.4025),
    "Kyiv": (50.4501, 30.5234),
    "Bucharest": (44.4268, 26.1025),
    "Sofia": (42.6977, 23.3219),
    "Belgrade": (44.7866, 20.4489),
    "Zagreb": (45.8150, 15.9819),
    "Bratislava": (48.1486, 17.1077),
    "Vilnius": (54.6872, 25.2797),
    "Riga": (56.9496, 24.1052),
    "Tallinn": (59.4370, 24.7536),
    "Krakow": (50.0647, 19.9450),
    "Gothenburg": (57.7089, 11.9746),
    "Reykjavik": (64.1466, -21.9426),
    "Nagoya": (35.1815, 136.9066),
    "Fukuoka": (33.5904, 130.4017),
    "Sapporo": (43.0618, 141.3545),
    "Dalian": (38.9137, 121.6147),
    "Qingdao": (36.0671, 120.3826),
    "Hangzhou": (30.2741, 120.1551),
    "Nanjing": (32.0603, 118.7969),
    "Harbin": (45.7580, 126.6424),
    "Suzhou": (31.2990, 120.5853),
    "Dongguan": (23.0461, 113.7463),
    "Chiang Mai": (18.7883, 98.9853),
    "Da Nang": (16.0544, 108.2022),
    "Cebu City": (10.3157, 123.8854),
    "Bandung": (-6.9175, 107.6191),
    "Medan": (3.5952, 98.6722),
    "Faisalabad": (31.4187, 73.0791),
    "Rawalpindi": (33.5651, 73.0169),
    "Chittagong": (22.3569, 91.7832),
    "Kabul": (34.5553, 69.2075),
    "Baku": (40.4093, 49.8671),
    "Yerevan": (40.1792, 44.4991),
    "Tbilisi": (41.7151, 44.7835),
    "Nur-Sultan": (51.1694, 71.4491),
    "Ankara": (39.9334, 32.8597),
    "Izmir": (38.4237, 27.1428),
    "Jeddah": (21.4858, 39.1925),
    "Mecca": (21.3891, 39.8579),
    "Kuwait City": (29.3759, 47.9774),
    "Manama": (26.2285, 50.5860),
    "Muscat": (23.5880, 58.3829),
    "Damascus": (33.5138, 36.2765),
    "Beirut": (33.8938, 35.5018),
    "Alexandria": (31.2001, 29.9187),
    "Giza": (30.0071, 31.2089),
    "Kano": (12.0022, 8.5920),
    "Ibadan": (7.3776, 3.9470),
    "Luanda": (-8.8399, 13.2894),
    "Abidjan": (5.3600, -4.0083),
    "Khartoum": (15.5007, 32.5599),
    "Mogadishu": (2.0469, 45.3182),
    "Harare": (-17.8252, 31.0335),
    "Maputo": (-25.9692, 32.5731),
    "Lusaka": (-15.3875, 28.3228),
    "Kumasi": (6.6885, -1.6244),
    "Freetown": (8.4844, -13.2299),
    "Monrovia": (6.3003, -10.7969),
    "Bamako": (12.6392, -8.0029),
    "Ouagadougou": (12.3714, -1.5197),
    "Niamey": (13.5116, 2.1254),
    "Gold Coast": (-28.0167, 153.4000),
    "Christchurch": (-43.5321, 172.6362),
    "Suva": (-18.1149, 178.4419),
    "Port Moresby": (-9.4438, 147.1803),
}

# --- 2. Create the FastAPI App ---
app = FastAPI()

# --- 3. Add CORS Middleware ---
origins = [
    "http://localhost:3000",
    "http://localhost",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CSV Logging Setup ---
LOG_FILE = DATA_DIR / "weather_log.csv"
CSV_HEADERS = [
    'timestamp', 'search_query', 'result_city', 'result_region', 
    'current_temp_c', 'current_condition', 'forecast_today_high', 
    'forecast_today_low', 'aqi_epa_index'
]
# This lock prevents errors if two users search at the exact same time
csv_lock = threading.Lock()

def log_search_to_csv(data: dict):
    """
    Appends a new row to the CSV log file in a thread-safe way.
    """
    # Make sure the data/ directory exists
    DATA_DIR.mkdir(parents=True, exist_ok=True) 
    
    file_exists = LOG_FILE.exists()
    
    with csv_lock: # Acquire the lock so only one request can write at a time
        try:
            with open(LOG_FILE, 'a', newline='', encoding='utf-8') as f:
                # Use DictWriter to easily write our dictionary
                writer = csv.DictWriter(f, fieldnames=CSV_HEADERS)
                
                if not file_exists:
                    writer.writeheader() # Write headers only if file is new
                    
                writer.writerow(data)
        except IOError as e:
            # Log to console if writing fails, but don't crash the server
            print(f"Error writing to CSV: {e}")
        # The lock is automatically released when this block is exited


# --- 4. Helper functions (Processing) ---

def get_weather_data_from_api(city_name: str):
    """Fetches raw data from WeatherAPI."""
    base_url = "https://api.weatherapi.com/v1/forecast.json"
    
    query_param = city_name
    if city_name in CITY_COORDS:
        lat, lon = CITY_COORDS[city_name]
        query_param = f"{lat},{lon}"

    params = { "key": API_KEY, "q": query_param, "days": 3, "aqi": "yes" }

    try:
        response = requests.get(base_url, params=params)
        response.raise_for_status() # Raises an error for bad responses (4xx, 5xx)
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching from WeatherAPI: {e}")
        # Re-raise as an HTTPException that FastAPI can send to the user
        raise HTTPException(status_code=503, detail=f"Weather service unavailable: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unknown error occurred: {e}")

def process_hourly_forecast(data):
    hourly_data = []
    today_hourly = data['forecast']['forecastday'][0]['hour']
    current_time_epoch = data['current']['last_updated_epoch']
    
    for hour_data in today_hourly:
        if hour_data['time_epoch'] >= current_time_epoch:
            hourly_data.append({
                "time": hour_data['time'].split(' ')[1],
                "temp": hour_data['temp_c'],
                "condition": hour_data['condition']['text'],
                "wind_speed": hour_data['wind_kph']
            })
    return hourly_data

def process_air_quality(data):
    aqi_data = data['current'].get('air_quality', {})
    epa_index = aqi_data.get('us-epa-index', 'N/A')
    quality_map = {
        1: "Good", 2: "Moderate", 3: "Unhealthy (Sensitive)", 
        4: "Unhealthy", 5: "Very Unhealthy", 6: "Hazardous"
    }
    return {
        "quality": quality_map.get(epa_index, 'Unknown'),
        "epa_index": epa_index,
        "pm2_5": aqi_data.get('pm2_5', 0.0),
        "o3": aqi_data.get('o3', 0.0),
        "no2": aqi_data.get('no2', 0.0)
    }

def process_3_day_forecast(data):
    forecast_data = []
    for day_data in data['forecast']['forecastday']:
        forecast_data.append({
            "date": day_data['date'],
            "high_temp": day_data['day']['maxtemp_c'],
            "low_temp": day_data['day']['mintemp_c'],
            "condition": day_data['day']['condition']['text']
        })
    return forecast_data


# --- 5. Create the API Endpoint ---
# This is the URL your Next.js app will call.
# e.g., http://127.0.0.1:8000/weather?city=London

@app.get("/weather")
def get_weather(city: str = Query(..., min_length=2)):
    """
    The main API endpoint. It takes a 'city' query parameter.
    """
    if not city:
        raise HTTPException(status_code=400, detail="A 'city' query parameter is required.")
    
    # 1. Fetch
    raw_data = get_weather_data_from_api(city)
    
    # 2. Process
    hourly = process_hourly_forecast(raw_data)
    aqi = process_air_quality(raw_data)
    forecast = process_3_day_forecast(raw_data)
    
    # 3. Log the search result
    try:
        log_data = {
            "timestamp": datetime.now().isoformat(),
            "search_query": city,
            "result_city": raw_data['location']['name'],
            "result_region": raw_data['location']['region'],
            "current_temp_c": raw_data['current']['temp_c'],
            "current_condition": raw_data['current']['condition']['text'],
            "forecast_today_high": forecast[0]['high_temp'],
            "forecast_today_low": forecast[0]['low_temp'],
            "aqi_epa_index": aqi['epa_index']
        }
        # Run logging in a separate thread to not block the response
        log_thread = threading.Thread(target=log_search_to_csv, args=(log_data,))
        log_thread.start()
        
    except Exception as e:
        # Log to console if logging fails, but don't fail the API request
        print(f"Error starting CSV log thread: {e}")
    
    # 4. Return everything to the Next.js app
    return {
        "city": raw_data['location']['name'],
        "region": raw_data['location']['region'],
        "current_temp": raw_data['current']['temp_c'],
        "current_condition": raw_data['current']['condition']['text'],
        "hourly": hourly,
        "air_quality": aqi,
        "forecast": forecast
    }

# This is a "health check" endpoint to see if the server is running
@app.get("/")
def read_root():
    return {"status": "Weather API is running!"}