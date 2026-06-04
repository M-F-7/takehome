import type { AdminSession, ChatHistoryItem, ChatResponse, OpenAIDiagnostic, Ticket, TicketMessage, TicketsResponse, TicketStatus, UserProfile } from './types';

const API_BASE = '';

async function parseJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Le backend a renvoye une reponse inattendue.');
  }
  return response.json() as Promise<T>;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);
  const data = await parseJson<T | { detail?: string }>(response);
  if (!response.ok) {
    const detail = typeof data === 'object' && data && 'detail' in data ? data.detail : undefined;
    throw new Error(detail || 'Erreur serveur');
  }
  return data as T;
}

export function login(email: string, password: string) {
  return request<UserProfile>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export function register(email: string, password: string) {
  return request<UserProfile>('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export function changePassword(email: string, currentPassword: string, newPassword: string) {
  return request<UserProfile>('/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}

export function adminLogin(email: string, password: string) {
  return request<AdminSession>('/auth/admin-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export function sendChatMessage(payload: {
  message: string;
  history: ChatHistoryItem[];
  customerEmail: string;
  ticketId: string | null;
}) {
  return request<ChatResponse>('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: payload.message,
      history: payload.history,
      customer_email: payload.customerEmail,
      ticket_id: payload.ticketId,
    }),
  });
}

export function listMyTickets(email: string, limit = 50) {
  const query = new URLSearchParams({ limit: String(limit), customer_email: email });
  return request<TicketsResponse>(`/tickets?${query.toString()}`);
}

export function getTicketMessages(ticketId: string, customerEmail: string) {
  const query = new URLSearchParams({ customer_email: customerEmail });
  return request<TicketMessage[]>(`/tickets/${ticketId}/messages?${query.toString()}`);
}

export function listAdminTickets(adminToken: string, limit = 100) {
  return request<TicketsResponse>(`/tickets?limit=${limit}`, {
    headers: { 'X-Admin-Token': adminToken },
  });
}

export function updateTicketStatus(ticketId: string, status: TicketStatus, adminToken: string) {
  return request<Ticket>(`/tickets/${ticketId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
    body: JSON.stringify({ status }),
  });
}

export function getOpenAIDiagnostic(adminToken: string) {
  return request<OpenAIDiagnostic>('/health/openai', {
    headers: { 'X-Admin-Token': adminToken },
  });
}
