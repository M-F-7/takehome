from fastapi import APIRouter, HTTPException

from app.core.prompts import CATEGORY_LABELS
from app.schemas import ChatMessage, ChatResponse
from app.services.llm import classify_message, generate_response, should_reuse_existing_category
from app.services.tickets import append_ticket_message, get_ticket, get_ticket_messages, upsert_chat_ticket
from app.services.users import require_existing_user

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatMessage):
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Message vide")

    customer_email = require_existing_user(body.customer_email)
    existing_ticket = None
    conversation_history = body.history

    if body.ticket_id:
        existing_ticket = get_ticket(body.ticket_id)
        if existing_ticket and (existing_ticket.customer_email or "").lower() != customer_email.lower():
            raise HTTPException(status_code=403, detail="Ticket non autorise")
        if existing_ticket:
            conversation_history = get_ticket_messages(existing_ticket.id)

    category, confidence = classify_message(body.message)
    if existing_ticket and should_reuse_existing_category(body.message, confidence, True):
        category = existing_ticket.category
        confidence = max(confidence, 0.85)

    response_text = generate_response(category, body.message, conversation_history, existing_ticket.model_dump() if existing_ticket else None)

    title = existing_ticket.title if existing_ticket else (body.message[:64] if body.message else "Support client")
    ticket = upsert_chat_ticket(
        ticket_id=body.ticket_id,
        title=title,
        message=body.message,
        category=category,
        response=response_text,
        customer_email=customer_email,
    )
    append_ticket_message(ticket.id, "user", body.message)
    append_ticket_message(ticket.id, "assistant", response_text)

    return ChatResponse(
        response=response_text,
        category=category,
        category_label=CATEGORY_LABELS.get(category, "ℹ️ Général"),
        confidence=confidence,
        ticket_id=ticket.id if ticket else None,
    )
