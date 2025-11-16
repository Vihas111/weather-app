# backend/logging_config.py

import logging
import requests
from pythonjsonlogger import jsonlogger

# --------------------------------
# BetterStack Config
# --------------------------------
BETTERSTACK_SOURCE_TOKEN = "kcTXFWL6Pv4Jn7N5mVYCAWMR"
BETTERSTACK_ENDPOINT = "https://s1592232.eu-nbg-2.betterstackdata.com/logs"  # <-- FIXED

# --------------------------------
# BetterStack Handler
# --------------------------------
class BetterStackHandler(logging.Handler):
    def emit(self, record):
        try:
            log_entry = self.format(record)

            requests.post(
                BETTERSTACK_ENDPOINT,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {BETTERSTACK_SOURCE_TOKEN}",
                },
                data=log_entry.encode("utf-8"),
                timeout=1.0,  # non-blocking
            )

        except Exception:
            # Never break backend if BetterStack is slow/down
            pass


# --------------------------------
# Setup Logging
# --------------------------------
def setup_logging():

    logger = logging.getLogger()
    logger.setLevel(logging.INFO)

    # Remove Uvicorn default noisy handlers
    for h in logger.handlers[:]:
        logger.removeHandler(h)

    # JSON format
    formatter = jsonlogger.JsonFormatter(
        "%(asctime)s %(levelname)s %(name)s %(message)s %(event)s %(city)s %(breaches)s"
    )

    # Console logs
    console = logging.StreamHandler()
    console.setFormatter(formatter)

    # Remote logs to BetterStack
    bs_handler = BetterStackHandler()
    bs_handler.setFormatter(formatter)

    logger.addHandler(console)
    logger.addHandler(bs_handler)

    return logger
