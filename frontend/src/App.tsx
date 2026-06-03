import { useEffect, useMemo, useState } from 'react';
import { changePassword, listAdminTickets, listMyTickets, login, register, sendChatMessage, updateTicketStatus } from './api';
import type { AuthMode, ChatHistoryItem, ChatMessage, Mode, Ticket, TicketStatus, UserProfile } from './types';

function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}...`;
}

function loadStoredUser(): UserProfile | null {
  return null;
}

function saveStoredUser(user: UserProfile | null) {
  void user;
}

function LoginScreen(props: {
  mode: AuthMode | null;
  authEmail: string;
  authPassword: string;
  authFeedback: string;
  authPending: boolean;
  onChooseMode: (mode: AuthMode) => void;
  onBack: () => void;
  onSubmit: () => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
}) {
  const title = props.mode === 'register'
    ? 'Creez votre compte pour ouvrir et suivre vos demandes.'
    : props.mode === 'login'
      ? 'Connectez-vous pour retrouver vos demandes en cours.'
      : 'Choisissez inscription ou connexion pour acceder a votre espace support.';

  return (
    <div className="auth-screen">
      <div className="auth-panel auth-gate">
        <div className="panel-subtitle">{title}</div>
        <div className="auth-home">
          <button
            className={`auth-choice ${props.mode === 'register' ? 'active' : ''}`.trim()}
            type="button"
            onClick={() => props.onChooseMode('register')}
          >
            Inscription
          </button>
          <button
            className={`auth-choice ${props.mode === 'login' ? 'active' : ''}`.trim()}
            type="button"
            onClick={() => props.onChooseMode('login')}
          >
            Connexion
          </button>
        </div>
        {props.mode && (
          <div className="auth-actions">
            <input
              value={props.authEmail}
              onChange={(event) => props.onEmailChange(event.target.value)}
              type="email"
              placeholder="Email"
              autoComplete="email"
              onKeyDown={(event) => event.key === 'Enter' && props.onSubmit()}
            />
            <input
              value={props.authPassword}
              onChange={(event) => props.onPasswordChange(event.target.value)}
              type="password"
              placeholder="Mot de passe"
              autoComplete={props.mode === 'register' ? 'new-password' : 'current-password'}
              onKeyDown={(event) => event.key === 'Enter' && props.onSubmit()}
            />
            <button className="mode-btn active" type="button" onClick={props.onSubmit} disabled={props.authPending}>
              {props.authPending ? 'Chargement...' : props.mode === 'register' ? 'Creer mon compte' : 'Se connecter'}
            </button>
            <button className="mode-btn" type="button" onClick={props.onBack} disabled={props.authPending}>
              Retour
            </button>
          </div>
        )}
        {props.authFeedback && <div className="auth-feedback error">{props.authFeedback}</div>}
      </div>
    </div>
  );
}

function ProfilePanel(props: {
  email: string;
  open: boolean;
  currentPassword: string;
  newPassword: string;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onChangePassword: () => void;
  onLogout: () => void;
}) {
  if (!props.open) return null;

  return (
    <section className="profile-panel">
      <div className="profile-copy">
        <div className="panel-title">Mon profil</div>
        <div className="panel-subtitle">{props.email}</div>
      </div>
      <div className="profile-actions">
        <input
          value={props.currentPassword}
          onChange={(event) => props.onCurrentPasswordChange(event.target.value)}
          type="password"
          placeholder="Mot de passe actuel"
          autoComplete="current-password"
        />
        <input
          value={props.newPassword}
          onChange={(event) => props.onNewPasswordChange(event.target.value)}
          type="password"
          placeholder="Nouveau mot de passe"
          autoComplete="new-password"
        />
        <button className="mode-btn" type="button" onClick={props.onChangePassword}>Changer le mot de passe</button>
        <button className="mode-btn" type="button" onClick={props.onLogout}>Se deconnecter</button>
      </div>
    </section>
  );
}

function TicketsSummary(props: {
  tickets: Ticket[];
  expanded: boolean;
  profileOpen: boolean;
  onToggleExpanded: () => void;
  onToggleProfile: () => void;
  onRefresh: () => void;
  onNewRequest: () => void;
}) {
  const visibleTickets = props.expanded ? props.tickets : props.tickets.slice(0, 2);

  return (
    <section className="my-tickets-panel">
      <div className="my-tickets-header">
        <div>
          <h3>Mes demandes</h3>
          <p>
            {props.tickets.length
              ? `${props.tickets.length} demande(s) sur votre compte. Les plus recentes restent visibles pour laisser la place au chat.`
              : 'Retrouvez ici les tickets associes a votre compte.'}
          </p>
        </div>
        <div className="profile-actions compact">
          <button className="mode-btn" type="button" onClick={props.onToggleProfile}>
            {props.profileOpen ? 'Fermer profil' : 'Profil'}
          </button>
          {props.tickets.length > 2 && (
            <button className="mode-btn" type="button" onClick={props.onToggleExpanded}>
              {props.expanded ? 'Voir moins' : 'Voir tout'}
            </button>
          )}
          <button className="mode-btn" type="button" onClick={props.onNewRequest}>Nouvelle demande</button>
          <button className="mode-btn" type="button" onClick={props.onRefresh}>Rafraichir</button>
        </div>
      </div>
      <div className="ticket-list compact">
        {!props.tickets.length && <div className="empty-state">Aucune demande enregistree pour le moment.</div>}
        {visibleTickets.map((ticket) => (
          <article key={ticket.id} className={`ticket-card ${props.expanded ? '' : 'ticket-card-compact'}`.trim()}>
            <div className="ticket-title">{ticket.title || 'Ticket sans titre'}</div>
            <div className="ticket-message">{props.expanded ? ticket.message : truncateText(ticket.message, 110)}</div>
            <div className="ticket-meta">
              <span className="pill">{ticket.category_label || ticket.category}</span>
              <span className={`pill pill-${ticket.status}`}>{ticket.status}</span>
              <span className="pill">{new Date(ticket.created_at).toLocaleString('fr-FR')}</span>
            </div>
            {props.expanded && ticket.response && <div className="ticket-response">{ticket.response}</div>}
          </article>
        ))}
      </div>
    </section>
  );
}

function ChatPanel(props: {
  messages: ChatMessage[];
  input: string;
  loading: boolean;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onQuick: (text: string) => void;
}) {
  const quickActions = [
    'Mon prelevement mensuel est incorrect',
    'Mon smartphone est tombe en panne',
    'Je veux restituer mon appareil en fin de contrat',
    'Comment fonctionne la location chez Evollis ?',
  ];

  return (
    <>
      <div className="chat-container">
        {!props.messages.length && (
          <div className="welcome">
            <div className="welcome-icon">🤖</div>
            <h2>Bonjour, comment puis-je vous aider ?</h2>
            <p>Je suis l'assistant Evollis. Je peux vous aider sur vos abonnements, vos appareils, vos reprises ou toute question generale.</p>
            <div className="quick-actions">
              {quickActions.map((text) => (
                <button key={text} className="quick-btn" type="button" onClick={() => props.onQuick(text)}>
                  {text}
                </button>
              ))}
            </div>
          </div>
        )}
        {props.messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`message ${message.role === 'agent' ? 'agent' : 'user'}`}>
            <div className={`avatar ${message.role === 'agent' ? 'agent' : 'user-av'}`}>
              {message.role === 'agent' ? '🤖' : '👤'}
            </div>
            <div className="bubble-wrap">
              {message.category && message.categoryLabel && (
                <span className={`category-tag tag-${message.category}`}>{message.categoryLabel}</span>
              )}
              <div className="bubble">{message.content}</div>
            </div>
          </div>
        ))}
        {props.loading && (
          <div className="message agent">
            <div className="avatar agent">🤖</div>
            <div className="typing-indicator">
              <div className="dot" />
              <div className="dot" />
              <div className="dot" />
            </div>
          </div>
        )}
      </div>
      <div className="input-area">
        <div className="input-wrap">
          <textarea
            value={props.input}
            onChange={(event) => props.onInputChange(event.target.value)}
            placeholder="Decrivez votre probleme ou posez votre question..."
            rows={1}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                props.onSubmit();
              }
            }}
          />
          <button className="send-btn" type="button" onClick={props.onSubmit} disabled={props.loading}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <div className="input-hint">Entree pour envoyer · Shift+Entree pour nouvelle ligne</div>
      </div>
    </>
  );
}

function AdminView(props: {
  tickets: Ticket[];
  onRefresh: () => void;
  onUpdateStatus: (ticketId: string, status: TicketStatus) => void;
}) {
  const openCount = props.tickets.filter((ticket) => ticket.status === 'open').length;
  const progressCount = props.tickets.filter((ticket) => ticket.status === 'in_progress').length;
  const resolvedCount = props.tickets.filter((ticket) => ticket.status === 'resolved').length;

  return (
    <div className="admin-shell">
      <div className="admin-hero">
        <div>
          <h2>Admin tickets</h2>
          <p>Vue de supervision des tickets crees par les utilisateurs.</p>
        </div>
        <div className="ticket-toolbar">
          <button className="refresh-btn" type="button" onClick={props.onRefresh}>Rafraichir</button>
        </div>
      </div>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Tickets total</div><div className="stat-value">{props.tickets.length}</div></div>
        <div className="stat-card"><div className="stat-label">Ouverts</div><div className="stat-value">{openCount}</div></div>
        <div className="stat-card"><div className="stat-label">En cours</div><div className="stat-value">{progressCount}</div></div>
        <div className="stat-card"><div className="stat-label">Resolus</div><div className="stat-value">{resolvedCount}</div></div>
      </div>
      <div className="ticket-list">
        {!props.tickets.length && <div className="empty-state">Aucun ticket a afficher.</div>}
        {props.tickets.map((ticket) => (
          <article key={ticket.id} className="ticket-card">
            <div className="ticket-top">
              <div>
                <div className="ticket-title">{ticket.title || 'Ticket sans titre'}</div>
                <div className="ticket-message">{ticket.message}</div>
                <div className="ticket-meta">
                  <span className="pill">{ticket.category_label || ticket.category}</span>
                  <span className={`pill pill-${ticket.status}`}>{ticket.status}</span>
                  <span className="pill">{ticket.source}</span>
                  <span className="pill">{new Date(ticket.created_at).toLocaleString('fr-FR')}</span>
                </div>
              </div>
              <div className="ticket-actions">
                <button className="ticket-action" type="button" onClick={() => props.onUpdateStatus(ticket.id, 'open')}>Open</button>
                <button className="ticket-action" type="button" onClick={() => props.onUpdateStatus(ticket.id, 'in_progress')}>En cours</button>
                <button className="ticket-action" type="button" onClick={() => props.onUpdateStatus(ticket.id, 'resolved')}>Resolu</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(() => loadStoredUser());
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFeedback, setAuthFeedback] = useState('');
  const [authPending, setAuthPending] = useState(false);
  const [mode, setMode] = useState<Mode>('user');
  const [profileOpen, setProfileOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [appFeedback, setAppFeedback] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [currentTicketId, setCurrentTicketId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [adminTickets, setAdminTickets] = useState<Ticket[]>([]);
  const [myTicketsExpanded, setMyTicketsExpanded] = useState(false);
  useEffect(() => {
    if (!user) return;
    void refreshMyTickets();
    if (mode === 'admin') {
      void refreshAdminTickets();
    }
  }, [user]);

  useEffect(() => {
    if (mode === 'admin' && user) {
      void refreshAdminTickets();
    }
  }, [mode, user]);

  useEffect(() => {
    const chatContainer = document.querySelector('.chat-container');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [messages, loading]);

  const myVisibleTickets = useMemo(
    () => (myTicketsExpanded ? myTickets : myTickets.slice(0, 2)),
    [myTickets, myTicketsExpanded],
  );

  async function refreshMyTickets() {
    if (!user) return;
    try {
      const data = await listMyTickets(user.email);
      setMyTickets(data.items);
    } catch {
      setMyTickets([]);
    }
  }

  async function refreshAdminTickets() {
    try {
      const data = await listAdminTickets();
      setAdminTickets(data.items);
    } catch {
      setAdminTickets([]);
    }
  }

  function resetConversation() {
    setMessages([]);
    setHistory([]);
    setCurrentTicketId(null);
    setInput('');
  }

  async function handleAuthSubmit() {
    if (!authMode) return;
    if (!authEmail || !authPassword) {
      setAuthFeedback('Renseignez un email et un mot de passe.');
      return;
    }
    if (!authEmail.includes('@')) {
      setAuthFeedback('Saisissez un email valide.');
      return;
    }
    if (authPassword.length < 6) {
      setAuthFeedback('Le mot de passe doit contenir au moins 6 caracteres.');
      return;
    }

    try {
      setAuthPending(true);
      setAuthFeedback('');
      const nextUser = authMode === 'register'
        ? await register(authEmail.trim(), authPassword)
        : await login(authEmail.trim(), authPassword);
      saveStoredUser(nextUser);
      setUser(nextUser);
      setAuthPassword('');
      setAuthMode(null);
      setMode('user');
      setProfileOpen(true);
      resetConversation();
    } catch (err) {
      setAuthFeedback(err instanceof Error ? err.message : 'Impossible de vous authentifier.');
    } finally {
      setAuthPending(false);
    }
  }

  async function handleChangePassword() {
    if (!user) return;
    if (!currentPassword || !newPassword) {
      setAppFeedback('Renseignez le mot de passe actuel et le nouveau mot de passe.');
      return;
    }
    if (newPassword.length < 6) {
      setAppFeedback('Le nouveau mot de passe doit contenir au moins 6 caracteres.');
      return;
    }

    try {
      setAppFeedback('');
      await changePassword(user.email, currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setAppFeedback('Mot de passe mis a jour.');
    } catch (err) {
      setAppFeedback(err instanceof Error ? err.message : 'Impossible de changer le mot de passe.');
    }
  }

  function handleLogout() {
    saveStoredUser(null);
    setUser(null);
    setAuthMode(null);
    setAuthPassword('');
    setProfileOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setMyTickets([]);
    setAdminTickets([]);
    setMyTicketsExpanded(false);
    setAppFeedback('');
    resetConversation();
  }

  async function postMessage(rawText: string, ticketId: string | null) {
    if (!user) throw new Error('Connectez-vous pour creer une demande.');
    return sendChatMessage({
      message: rawText,
      history,
      customerEmail: user.email,
      ticketId,
    });
  }

  async function handleSendMessage(prefilled?: string) {
    if (!user) {
      setAppFeedback('Connectez-vous pour creer une demande.');
      return;
    }
    const text = (prefilled ?? input).trim();
    if (!text || loading) return;

    setAppFeedback('');
    setInput('');
    setLoading(true);
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setHistory((prev) => [...prev, { role: 'user', content: text }]);

    try {
      let data;
      try {
        data = await postMessage(text, currentTicketId);
      } catch (err) {
        if (currentTicketId) {
          setCurrentTicketId(null);
          data = await postMessage(text, null);
        } else {
          throw err;
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          content: data.response,
          category: data.category,
          categoryLabel: data.category_label,
        },
      ]);
      setHistory((prev) => [...prev, { role: 'assistant', content: data.response }]);
      setCurrentTicketId(data.ticket_id || currentTicketId);
      await refreshMyTickets();
      if (mode === 'admin') {
        await refreshAdminTickets();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible d envoyer votre demande pour le moment.';
      setAppFeedback(message);
      setMessages((prev) => [...prev, { role: 'agent', content: 'Desole, une erreur est survenue. Veuillez reessayer dans quelques instants.' }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(ticketId: string, status: TicketStatus) {
    await updateTicketStatus(ticketId, status);
    await refreshAdminTickets();
    await refreshMyTickets();
  }

  if (!user) {
    return (
      <LoginScreen
        mode={authMode}
        authEmail={authEmail}
        authPassword={authPassword}
        authFeedback={authFeedback}
        authPending={authPending}
        onChooseMode={setAuthMode}
        onBack={() => {
          setAuthMode(null);
          setAuthFeedback('');
          setAuthPassword('');
        }}
        onSubmit={() => void handleAuthSubmit()}
        onEmailChange={setAuthEmail}
        onPasswordChange={setAuthPassword}
      />
    );
  }

  return (
    <div className="app-shell">
      <header>
        <div className="logo">
          <div className="logo-icon">EV</div>
          <div>
            <div className="logo-text">Evollis</div>
            <div className="logo-sub">Support Client</div>
          </div>
        </div>
        <div className="status-badge">
          <div className="status-dot" />
          Agent disponible
        </div>
        <div className="mode-switch" aria-label="Mode de l'application">
          <button className="mode-btn" type="button" onClick={() => setProfileOpen((prev) => !prev)}>
            {profileOpen ? 'Fermer profil' : 'Profil'}
          </button>
          <button className="mode-btn" type="button" onClick={handleLogout}>
            Se deconnecter
          </button>
          <button className={`mode-btn ${mode === 'user' ? 'active' : ''}`.trim()} type="button" onClick={() => setMode('user')}>
            Mode utilisateur
          </button>
          <button className={`mode-btn ${mode === 'admin' ? 'active' : ''}`.trim()} type="button" onClick={() => setMode('admin')}>
            Mode admin
          </button>
        </div>
      </header>

      {mode === 'user' ? (
        <div className="page">
          <div id="userAppContent">
            <ProfilePanel
              email={user.email}
              open={profileOpen}
              currentPassword={currentPassword}
              newPassword={newPassword}
              onCurrentPasswordChange={setCurrentPassword}
              onNewPasswordChange={setNewPassword}
              onChangePassword={() => void handleChangePassword()}
              onLogout={handleLogout}
            />
            <div className="user-note">Chaque message envoye sera rattache a votre compte et visible dans l espace admin.</div>
            {appFeedback && <div className="app-feedback error">{appFeedback}</div>}
            <TicketsSummary
              tickets={myVisibleTickets.length === myTickets.length ? myTickets : myTickets}
              expanded={myTicketsExpanded}
              profileOpen={profileOpen}
              onToggleExpanded={() => setMyTicketsExpanded((prev) => !prev)}
              onToggleProfile={() => setProfileOpen((prev) => !prev)}
              onRefresh={() => void refreshMyTickets()}
              onNewRequest={resetConversation}
            />
            <ChatPanel
              messages={messages}
              input={input}
              loading={loading}
              onInputChange={setInput}
              onSubmit={() => void handleSendMessage()}
              onQuick={(text) => void handleSendMessage(text)}
            />
          </div>
        </div>
      ) : (
        <div className="page">
          <AdminView tickets={adminTickets} onRefresh={() => void refreshAdminTickets()} onUpdateStatus={(id, status) => void handleUpdateStatus(id, status)} />
        </div>
      )}
    </div>
  );
}
