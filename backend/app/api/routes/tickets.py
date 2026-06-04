from typing import Optional

from typing import Annotated

from fastapi import APIRouter, Depends, Header

from app.schemas import Ticket, TicketCreate, TicketMessage, TicketUpdate
from app.services.admin import require_admin_token
from app.services.tickets import create_ticket, get_ticket, get_ticket_messages, load_tickets, update_ticket
from app.services.users import require_existing_user

router = APIRouter()


@router.get("/tickets")
async def list_tickets(
    limit: int = 50,
    status: Optional[str] = None,
    category: Optional[str] = None,
    customer_email: Optional[str] = None,
    x_admin_token: str | None = Header(default=None),
):
    if not customer_email:
        require_admin_token(x_admin_token)

    tickets = load_tickets()
    if status:
        tickets = [ticket for ticket in tickets if ticket.get("status") == status]
    if category:
        tickets = [ticket for ticket in tickets if ticket.get("category") == category]
    if customer_email:
        normalized_email = customer_email.strip().lower()
        tickets = [ticket for ticket in tickets if (ticket.get("customer_email") or "").lower() == normalized_email]
    return {"items": tickets[: max(1, min(limit, 200))], "count": len(tickets)}


@router.post("/tickets", response_model=Ticket)
async def add_ticket(body: TicketCreate):
    customer_email = require_existing_user(body.customer_email)
    return create_ticket(
        title=body.title,
        message=body.message,
        category=body.category,
        source=body.source,
        customer_email=customer_email,
    )


@router.patch("/tickets/{ticket_id}", response_model=Ticket)
async def patch_ticket(ticket_id: str, body: TicketUpdate, _: Annotated[str, Depends(require_admin_token)]):
    return update_ticket(ticket_id, status=body.status, note=body.note)


@router.get("/tickets/{ticket_id}/messages", response_model=list[TicketMessage])
async def ticket_messages(
    ticket_id: str,
    customer_email: Optional[str] = None,
    x_admin_token: str | None = Header(default=None),
):
    ticket = get_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket introuvable")

    if customer_email:
        normalized_email = require_existing_user(customer_email)
        if (ticket.customer_email or "").lower() != normalized_email:
            raise HTTPException(status_code=403, detail="Ticket non autorise")
    else:
        require_admin_token(x_admin_token)

    return [TicketMessage(**message) for message in get_ticket_messages(ticket_id)]
