from backend.main import app

# Tell FastAPI it's running behind the "/api" prefix.
# This makes it automatically strip "/api" from incoming requests
# so it can correctly match routes like "/health" or "/weather".
app.root_path = "/api"