from pathlib import Path

from dotenv import load_dotenv
import os

load_dotenv()

APP_TITLE = "Evollis Support Agent"
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
TICKETS_PATH = Path(__file__).resolve().parents[2] / "tickets.json"
