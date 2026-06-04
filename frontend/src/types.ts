export type Category = 'BILLING' | 'TECHNICAL' | 'TRADEIN' | 'GENERAL';
export type TicketStatus = 'open' | 'in_progress' | 'resolved';
export type Mode = 'user' | 'admin';
export type AuthMode = 'login' | 'register';

export interface UserProfile {
  email: string;
  created_at: string;
}

export interface AdminSession {
  token: string;
}

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface TicketMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  response: string;
  category: Category;
  category_label: string;
  confidence: number;
  ticket_id: string | null;
  llm_mode: 'openai' | 'fallback' | 'clarification';
  needs_faq: boolean;
}

export interface Ticket {
  id: string;
  title: string;
  message: string;
  category: Category;
  category_label: string;
  status: TicketStatus;
  source: string;
  customer_email?: string | null;
  note?: string | null;
  response?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketsResponse {
  items: Ticket[];
  count: number;
}

export interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
  category?: Category | null;
  categoryLabel?: string | null;
}

export interface OpenAIDiagnostic {
  status: 'ok' | 'degraded';
  configured: boolean;
  reachable: boolean;
  model_call_ok: boolean;
  provider: string;
  error: string | null;
  sample?: string;
}
