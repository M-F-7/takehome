import json
import sqlite3
from threading import Lock

from app.core.config import DB_PATH, TICKETS_PATH, USERS_PATH

DB_LOCK = Lock()


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with DB_LOCK:
        with get_connection() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    email TEXT PRIMARY KEY,
                    password_hash TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS tickets (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    message TEXT NOT NULL,
                    category TEXT NOT NULL,
                    category_label TEXT NOT NULL,
                    status TEXT NOT NULL,
                    source TEXT NOT NULL,
                    customer_email TEXT,
                    note TEXT,
                    response TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS ticket_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ticket_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(ticket_id) REFERENCES tickets(id)
                );
                """
            )
            connection.commit()

        migrate_json_data()


def migrate_json_data() -> None:
    migrate_users_from_json()
    migrate_tickets_from_json()


def migrate_users_from_json() -> None:
    if not USERS_PATH.exists():
        return

    try:
        users = json.loads(USERS_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return

    if not isinstance(users, list) or not users:
        return

    with get_connection() as connection:
        for user in users:
            if not isinstance(user, dict) or not user.get("email"):
                continue
            connection.execute(
                """
                INSERT OR IGNORE INTO users (email, password_hash, created_at)
                VALUES (?, ?, ?)
                """,
                (user.get("email"), user.get("password_hash"), user.get("created_at")),
            )
        connection.commit()


def migrate_tickets_from_json() -> None:
    if not TICKETS_PATH.exists():
        return

    try:
        tickets = json.loads(TICKETS_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return

    if not isinstance(tickets, list) or not tickets:
        return

    with get_connection() as connection:
        for ticket in tickets:
            if not isinstance(ticket, dict) or not ticket.get("id"):
                continue
            connection.execute(
                """
                INSERT OR IGNORE INTO tickets (
                    id, title, message, category, category_label, status, source,
                    customer_email, note, response, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    ticket.get("id"),
                    ticket.get("title"),
                    ticket.get("message"),
                    ticket.get("category"),
                    ticket.get("category_label"),
                    ticket.get("status"),
                    ticket.get("source"),
                    ticket.get("customer_email"),
                    ticket.get("note"),
                    ticket.get("response"),
                    ticket.get("created_at"),
                    ticket.get("updated_at"),
                ),
            )
        connection.commit()
