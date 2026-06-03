from pydantic import BaseModel, Field
from typing import Optional


class ChatMessage(BaseModel):
    message: str
    history: list[dict] = Field(default_factory=list)


class ChatResponse(BaseModel):
    response: str
    category: str
    category_label: str
    confidence: float
    ticket_id: Optional[str] = None


class TicketCreate(BaseModel):
    title: str
    message: str
    category: str = "GENERAL"
    source: str = "user"


class TicketUpdate(BaseModel):
    status: Optional[str] = None
    note: Optional[str] = None


class Ticket(BaseModel):
    id: str
    title: str
    message: str
    category: str
    category_label: str
    status: str
    source: str
    note: Optional[str] = None
    response: Optional[str] = None
    created_at: str
    updated_at: str
