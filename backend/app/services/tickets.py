from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import HTTPException

from app.core.prompts import CATEGORY_LABELS
from app.schemas import Ticket
from app.services.db import DB_LOCK, get_connection


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def row_to_ticket(row) -> Ticket:
    return Ticket(**dict(row))


def get_ticket(ticket_id: str) -> Ticket | None:
    with get_connection() as connection:
        row = connection.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,)).fetchone()
    return row_to_ticket(row) if row else None


def get_ticket_messages(ticket_id: str) -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT role, content FROM ticket_messages WHERE ticket_id = ? ORDER BY id ASC",
            (ticket_id,),
        ).fetchall()
    return [{"role": row["role"], "content": row["content"]} for row in rows]


def append_ticket_message(ticket_id: str, role: str, content: str) -> None:
    with DB_LOCK:
        with get_connection() as connection:
            connection.execute(
                "INSERT INTO ticket_messages (ticket_id, role, content, created_at) VALUES (?, ?, ?, ?)",
                (ticket_id, role, content, now_iso()),
            )
            connection.commit()


def load_tickets() -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM tickets ORDER BY updated_at DESC, created_at DESC"
        ).fetchall()
    return [dict(row) for row in rows]


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
    with DB_LOCK:
        with get_connection() as connection:
            connection.execute(
                """
                INSERT INTO tickets (
                    id, title, message, category, category_label, status, source,
                    customer_email, note, response, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    ticket.id,
                    ticket.title,
                    ticket.message,
                    ticket.category,
                    ticket.category_label,
                    ticket.status,
                    ticket.source,
                    ticket.customer_email,
                    ticket.note,
                    ticket.response,
                    ticket.created_at,
                    ticket.updated_at,
                ),
            )
            connection.commit()
    return ticket


def upsert_chat_ticket(
    ticket_id: str | None,
    title: str,
    message: str,
    category: str,
    customer_email: str,
    response: str | None = None,
) -> Ticket:
    with DB_LOCK:
        if ticket_id:
            with get_connection() as connection:
                row = connection.execute(
                    "SELECT * FROM tickets WHERE id = ?",
                    (ticket_id,),
                ).fetchone()
                if row:
                    item = dict(row)
                    if (item.get("customer_email") or "").lower() != customer_email.lower():
                        raise HTTPException(status_code=403, detail="Ticket non autorise")

                    updated_at = now_iso()
                    connection.execute(
                        """
                        UPDATE tickets
                        SET title = ?, message = ?, category = ?, category_label = ?, response = ?, updated_at = ?
                        WHERE id = ?
                        """,
                        (
                            item.get("title") or title,
                            message,
                            category,
                            CATEGORY_LABELS.get(category, "ℹ️ Général"),
                            response,
                            updated_at,
                            ticket_id,
                        ),
                    )
                    connection.commit()
                    refreshed = connection.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,)).fetchone()
                    return row_to_ticket(refreshed)

    return create_ticket(
        title=title,
        message=message,
        category=category,
        source="chat",
        response=response,
        customer_email=customer_email,
    )


def update_ticket(ticket_id: str, status: Optional[str] = None, note: Optional[str] = None) -> Ticket:
    with DB_LOCK:
        with get_connection() as connection:
            row = connection.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,)).fetchone()
            if row:
                item = dict(row)
                connection.execute(
                    "UPDATE tickets SET status = ?, note = ?, updated_at = ? WHERE id = ?",
                    (
                        status or item.get("status"),
                        note if note is not None else item.get("note"),
                        now_iso(),
                        ticket_id,
                    ),
                )
                connection.commit()
                refreshed = connection.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,)).fetchone()
                return row_to_ticket(refreshed)
    raise HTTPException(status_code=404, detail="Ticket introuvable")
