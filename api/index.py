from fastapi import FastAPI
from backend.main import app as backend_app

# Create a main app entry point for Vercel
app = FastAPI()

# Mount your existing backend app at the "/api" route.
# This tells FastAPI: "If a request starts with /api, send it to backend_app 
# AND strip the '/api' part off the URL first."
app.mount("/api", backend_app)