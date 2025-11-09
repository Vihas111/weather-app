# backend/alert_monitor.py
import os
import requests
import time
from dotenv import load_dotenv

load_dotenv()

BACKEND_HEALTH = os.getenv("BACKEND_URL", "http://127.0.0.1:8000/health")
WEBHOOK_URL = os.getenv("ALERT_WEBHOOK_URL")  # Slack/Discord webhook

def send_webhook_alert(title: str, message: str):
    if not WEBHOOK_URL:
        print("No WEBHOOK_URL configured; skipping webhook alert.")
        return
    # Slack/Discord accept a simple JSON payload - both are usually okay with this simple structure
    payload = {
        "text": f":rotating_light: *{title}*\n{message}"
    }
    try:
        r = requests.post(WEBHOOK_URL, json=payload, timeout=10)
        r.raise_for_status()
        print("Webhook alert sent.")
    except Exception as e:
        print("Failed to send webhook alert:", e)

def check_health():
    try:
        r = requests.get(BACKEND_HEALTH, timeout=5)
        if r.status_code != 200:
            msg = f"Unhealthy status code: {r.status_code} - body: {r.text}"
            print(msg)
            send_webhook_alert("Nimbus backend UNHEALTHY", msg)
            return False
        j = r.json()
        # Optional checks: uptime too small/zero, timestamp stale, etc.
        ts = j.get("timestamp")
        uptime = j.get("uptime_seconds")
        print(f"OK: uptime={uptime}s timestamp={ts}")
        return True
    except Exception as e:
        msg = f"Exception while checking health: {e}"
        print(msg)
        send_webhook_alert("Nimbus backend DOWN", msg)
        return False

if __name__ == "__main__":
    ok = check_health()
    if not ok:
        # exit with non-zero so CI can mark this run as failure if desired
        raise SystemExit(1)
    else:
        print("Health check passed.")
