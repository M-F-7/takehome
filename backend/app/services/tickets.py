import json
from datetime import datetime, timezone
from threading import Lock
from typing import Optional
from uuid import uuid4

from fastapi import HTTPException

from app.core.config import TICKETS_PATH
from app.core.prompts import CATEGORY_LABELS
from app.schemas import Ticket

TICKETS_LOCK = Lock()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_tickets_file() -> None:
    if not TICKETS_PATH.exists():
        TICKETS_PATH.write_text("[]", encoding="utf-8")


def load_tickets() -> list[dict]:
    ensure_tickets_file()
    with TICKETS_PATH.open("r", encoding="utf-8") as handle:
        try:
            data = json.load(handle)
            return data if isinstance(data, list) else []
        except json.JSONDecodeError:
            return []


def save_tickets(tickets: list[dict]) -> None:
    with TICKETS_PATH.open("w", encoding="utf-8") as handle:
        json.dump(tickets, handle, ensure_ascii=False, indent=2)


def create_ticket(
    title: str,
    message: str,
    category: str,
    source: str = "user",
    response: str | None = None,
    customer_email: str | None = None,
    ) -> Ticket:
    ticket = Ticket(
        id=str(uuid4()),
        title=title,
        message=message,
        category=category,
        category_label=CATEGORY_LABELS.get(category, "ℹ️ Général"),
        status="open",
        source=source,
        customer_email=customer_email,
        note=None,
        response=response,
        created_at=now_iso(),
        updated_at=now_iso(),
    )
    with TICKETS_LOCK:
        tickets = load_tickets()
        tickets.insert(0, ticket.model_dump())
        save_tickets(tickets)
    return ticket


def upsert_chat_ticket(
    ticket_id: str | None,
    title: str,
    message: str,
    category: str,
    customer_email: str,
    response: str | None = None,
) -> Ticket:
    with TICKETS_LOCK:
        tickets = load_tickets()
        if ticket_id:
            for index, item in enumerate(tickets):
                if item.get("id") != ticket_id:
                    continue
                if (item.get("customer_email") or "").lower() != customer_email.lower():
                    raise HTTPException(status_code=403, detail="Ticket non autorise")

                item["title"] = item.get("title") or title
                item["message"] = message
                item["category"] = category
                item["category_label"] = CATEGORY_LABELS.get(category, "ℹ️ Général")
                item["response"] = response
                item["updated_at"] = now_iso()
                tickets[index] = item
                save_tickets(tickets)
                return Ticket(**item)

    return create_ticket(
        title=title,
        message=message,
        category=category,
        source="chat",
        response=response,
        customer_email=customer_email,
    )


def update_ticket(ticket_id: str, status: Optional[str] = None, note: Optional[str] = None) -> Ticket:
    with TICKETS_LOCK:
        tickets = load_tickets()
        for index, item in enumerate(tickets):
            if item.get("id") == ticket_id:
                if status:
                    item["status"] = status
                if note is not None:
                    item["note"] = note
                item["updated_at"] = now_iso()
                tickets[index] = item
                save_tickets(tickets)
                return Ticket(**item)
    raise HTTPException(status_code=404, detail="Ticket introuvable")
