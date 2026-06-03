export type Category = 'BILLING' | 'TECHNICAL' | 'TRADEIN' | 'GENERAL';
export type TicketStatus = 'open' | 'in_progress' | 'resolved';
export type Mode = 'user' | 'admin';
export type AuthMode = 'login' | 'register';

export interface UserProfile {
  email: string;
  created_at: string;
}

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  response: string;
  category: Category;
  category_label: string;
  confidence: number;
  ticket_id: string | null;
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
