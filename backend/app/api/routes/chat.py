from fastapi import APIRouter, HTTPException

from app.core.prompts import CATEGORY_LABELS
from app.schemas import ChatMessage, ChatResponse
from app.services.llm import classify_message, generate_response
from app.services.tickets import create_ticket

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatMessage):
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Message vide")

    category, confidence = classify_message(body.message)
    response_text = generate_response(category, body.message, body.history)

    ticket = None
    try:
        title = body.message[:64] if body.message else "Support client"
        ticket = create_ticket(title=title, message=body.message, category=category, source="chat", response=response_text)
    except Exception:
        ticket = None

    return ChatResponse(
        response=response_text,
        category=category,
        category_label=CATEGORY_LABELS.get(category, "ℹ️ Général"),
        confidence=confidence,
        ticket_id=ticket.id if ticket else None,
    )
