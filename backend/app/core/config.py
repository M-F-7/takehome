from pathlib import Path

from dotenv import load_dotenv
import os

load_dotenv()

APP_TITLE = "Evollis Support Agent"
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "openai")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-3.5-turbo")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant")
GROQ_API_BASE = os.environ.get("GROQ_API_BASE", "https://api.groq.com/openai/v1")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")
TICKETS_PATH = Path(__file__).resolve().parents[2] / "tickets.json"
USERS_PATH = Path(__file__).resolve().parents[2] / "users.json"
DB_PATH = Path(__file__).resolve().parents[2] / "data" / "support.db"
