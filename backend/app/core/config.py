from pathlib import Path

from dotenv import load_dotenv
import os

load_dotenv()

APP_TITLE = "Evollis Support Agent"
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")
TICKETS_PATH = Path(__file__).resolve().parents[2] / "tickets.json"
USERS_PATH = Path(__file__).resolve().parents[2] / "users.json"
DB_PATH = Path(__file__).resolve().parents[2] / "data" / "support.db"
