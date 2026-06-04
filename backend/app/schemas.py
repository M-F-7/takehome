from pydantic import BaseModel, Field
from typing import Optional


class ChatMessage(BaseModel):
    message: str
    history: list[dict] = Field(default_factory=list)
    customer_email: Optional[str] = None
    ticket_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    category: str
    category_label: str
    confidence: float
    ticket_id: Optional[str] = None
    llm_mode: str = "fallback"
    needs_faq: bool = False


class TicketCreate(BaseModel):
    title: str
    message: str
    category: str = "GENERAL"
    source: str = "user"
    customer_email: Optional[str] = None


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
    customer_email: Optional[str] = None
    note: Optional[str] = None
    response: Optional[str] = None
    created_at: str
    updated_at: str


class UserCredentials(BaseModel):
    email: str
    password: str


class UserProfile(BaseModel):
    email: str
    created_at: str


class PasswordChange(BaseModel):
    email: str
    current_password: str
    new_password: str


class AdminCredentials(BaseModel):
    email: str
    password: str


class AdminSession(BaseModel):
    token: str
