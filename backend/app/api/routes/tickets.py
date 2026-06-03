from typing import Optional

from fastapi import APIRouter

from app.schemas import Ticket, TicketCreate, TicketUpdate
from app.services.tickets import create_ticket, load_tickets, update_ticket

router = APIRouter()


@router.get("/tickets")
async def list_tickets(limit: int = 50, status: Optional[str] = None, category: Optional[str] = None):
    tickets = load_tickets()
    if status:
        tickets = [ticket for ticket in tickets if ticket.get("status") == status]
    if category:
        tickets = [ticket for ticket in tickets if ticket.get("category") == category]
    return {"items": tickets[: max(1, min(limit, 200))], "count": len(tickets)}


@router.post("/tickets", response_model=Ticket)
async def add_ticket(body: TicketCreate):
    return create_ticket(
        title=body.title,
        message=body.message,
        category=body.category,
        source=body.source,
    )


@router.patch("/tickets/{ticket_id}", response_model=Ticket)
async def patch_ticket(ticket_id: str, body: TicketUpdate):
    return update_ticket(ticket_id, status=body.status, note=body.note)
