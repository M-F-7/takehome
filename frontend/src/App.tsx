import { useEffect, useMemo, useState } from 'react';
import { adminLogin, changePassword, getOpenAIDiagnostic, listAdminTickets, listMyTickets, login, register, sendChatMessage, updateTicketStatus } from './api';
import type { AuthMode, ChatHistoryItem, ChatMessage, Mode, Ticket, TicketStatus, UserProfile } from './types';

const FAQ_ITEMS = [
  {
    question: 'Comment fonctionne la location chez Evollis ?',
    answer: 'Evollis propose de la location longue duree avec mensualites, assurance casse ou vol et extension de garantie selon le contrat.',
  },
  {
    question: 'Que faire si mon appareil est en panne ?',
    answer: 'Preparez le modele exact, le symptome et depuis quand le souci est apparu. Cela aide a orienter le diagnostic ou la prise en charge.',
  },
  {
    question: 'Comment se passe la fin de contrat ?',
    answer: 'En fin de contrat, vous pouvez generalement restituer l appareil, demander un upgrade ou etudier une reprise selon votre dossier.',
  },
  {
    question: 'Que verifier pour une question de facturation ?',
    answer: 'Comparez le montant, la date du prelevement et la reference de contrat avec votre echeance attendue avant d ouvrir une verification.',
  },
];

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

function loadAdminToken(): string | null {
  try {
    return sessionStorage.getItem('evollis_admin_token');
  } catch {
    return null;
  }
}

function saveAdminToken(token: string | null) {
  try {
    if (token) {
      sessionStorage.setItem('evollis_admin_token', token);
    } else {
      sessionStorage.removeItem('evollis_admin_token');
    }
  } catch {
    // no-op
  }
}

function BrandLockup(props: { compact?: boolean }) {
  return (
    <div className={`brand-lockup ${props.compact ? 'compact' : ''}`.trim()}>
      <div className="brand-mark" aria-hidden="true">
        <div className="brand-ring ring-one" />
        <div className="brand-ring ring-two" />
        <div className="brand-core">EV</div>
      </div>
      <div>
        <div className="brand-name">Evollis</div>
        <div className="brand-tagline">Device as a Service, support & circularite</div>
      </div>
    </div>
  );
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
        <div className="auth-hero">
          <BrandLockup />
          <div className="auth-kicker">Support client nouvelle generation</div>
          <div className="auth-title">Un point d'entree simple pour vos questions abonnement, appareil et fin de contrat.</div>
        </div>
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
  onToggleExpanded: () => void;
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
  helpOpen: boolean;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onQuick: (text: string) => void;
  onToggleHelp: () => void;
}) {
  const quickActions = [
    'Mon prelevement mensuel est incorrect',
    'Mon smartphone est tombe en panne',
    'Je veux restituer mon appareil en fin de contrat',
    'Comment fonctionne la location chez Evollis ?',
  ];

  return (
    <>
      <div className="chat-help-bar">
        <button className="mode-btn help-btn" type="button" onClick={props.onToggleHelp} title="Comment utiliser le chatbot ?">
          ? Aide
        </button>
        {props.helpOpen && (
          <div className="help-popover">
            <div className="ticket-title">Comment utiliser le chatbot</div>
            <div className="ticket-message">
              Decrivez simplement votre situation en une ou deux phrases. Plus votre message est precis, plus la reponse sera utile.
              Vous pouvez ensuite continuer la meme discussion naturellement, ou cliquer sur <strong>Nouvelle demande</strong> pour repartir sur un autre sujet.
            </div>
          </div>
        )}
      </div>
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

function FaqPanel(props: { open: boolean; onClose: () => void }) {
  if (!props.open) return null;

  return (
    <section className="faq-panel">
      <div className="faq-panel-header">
        <div>
          <h3>FAQ Evollis</h3>
          <p>Quelques reponses rapides aux questions les plus frequentes.</p>
        </div>
        <button className="mode-btn" type="button" onClick={props.onClose}>Fermer</button>
      </div>
      <div className="faq-list">
        {FAQ_ITEMS.map((item) => (
          <article key={item.question} className="faq-item">
            <div className="ticket-title">{item.question}</div>
            <div className="ticket-message">{item.answer}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AdminView(props: {
  tickets: Ticket[];
  onRefresh: () => void;
  onUpdateStatus: (ticketId: string, status: TicketStatus) => void;
  onPingAgent: () => void;
  agentCheckResult: string;
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
          <button className="refresh-btn" type="button" onClick={props.onPingAgent}>Tester l agent</button>
        </div>
      </div>
      {props.agentCheckResult && <div className="app-feedback error">{props.agentCheckResult}</div>}
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

function AdminLoginPanel(props: {
  email: string;
  password: string;
  feedback: string;
  pending: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="admin-login-overlay">
      <div className="auth-panel auth-gate admin-login-panel">
        <div className="panel-title">Acces admin</div>
        <div className="panel-subtitle">Connectez-vous avec les identifiants admin configures dans le fichier d environnement.</div>
        <div className="auth-actions">
          <input value={props.email} onChange={(event) => props.onEmailChange(event.target.value)} type="email" placeholder="Email admin" />
          <input value={props.password} onChange={(event) => props.onPasswordChange(event.target.value)} type="password" placeholder="Mot de passe admin" />
          <button className="mode-btn active" type="button" onClick={props.onSubmit} disabled={props.pending}>
            {props.pending ? 'Connexion...' : 'Acceder a l admin'}
          </button>
          <button className="mode-btn" type="button" onClick={props.onCancel} disabled={props.pending}>Retour</button>
        </div>
        {props.feedback && <div className="auth-feedback error">{props.feedback}</div>}
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
  const [adminToken, setAdminToken] = useState<string | null>(() => loadAdminToken());
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAuthFeedback, setAdminAuthFeedback] = useState('');
  const [adminAuthPending, setAdminAuthPending] = useState(false);
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
  const [faqOpen, setFaqOpen] = useState(false);
  const [adminAgentCheckResult, setAdminAgentCheckResult] = useState('');
  const [chatHelpOpen, setChatHelpOpen] = useState(false);
  useEffect(() => {
    if (!user) return;
    void refreshMyTickets();
    if (mode === 'admin' && adminToken) {
      void refreshAdminTickets();
    }
  }, [user, mode, adminToken]);

  useEffect(() => {
    if (mode === 'admin' && user && adminToken) {
      void refreshAdminTickets();
    }
  }, [mode, user, adminToken]);

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
    if (!adminToken) return;
    try {
      const data = await listAdminTickets(adminToken);
      setAdminTickets(data.items);
    } catch {
      setAdminTickets([]);
    }
  }

  async function handleAdminLogin() {
    try {
      setAdminAuthPending(true);
      setAdminAuthFeedback('');
      const session = await adminLogin(adminEmail.trim(), adminPassword);
      setAdminToken(session.token);
      saveAdminToken(session.token);
      setAdminLoginOpen(false);
      setMode('admin');
      setAdminPassword('');
      await refreshAdminTickets();
    } catch (err) {
      setAdminAuthFeedback(err instanceof Error ? err.message : 'Connexion admin impossible.');
    } finally {
      setAdminAuthPending(false);
    }
  }

  function resetConversation() {
    setMessages([]);
    setHistory([]);
    setCurrentTicketId(null);
    setInput('');
    setChatHelpOpen(false);
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
    saveAdminToken(null);
    setUser(null);
    setAuthMode(null);
    setAuthPassword('');
    setAdminToken(null);
    setAdminLoginOpen(false);
    setAdminEmail('');
    setAdminPassword('');
    setAdminAuthFeedback('');
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
      if (data.llm_mode === 'clarification') {
        setAppFeedback('Je n ai pas compris votre demande. Vous pouvez la reformuler ou consulter la FAQ Evollis ci-dessous.');
        setFaqOpen(true);
      } else if (data.llm_mode === 'fallback' || data.needs_faq) {
        setAppFeedback('L agent n est pas pleinement accessible pour le moment. Vous pouvez continuer, reformuler votre demande ou consulter la FAQ Evollis ci-dessous.');
        setFaqOpen(true);
      }
      setHistory((prev) => [...prev, { role: 'assistant', content: data.response }]);
      setCurrentTicketId(data.ticket_id || currentTicketId);
      await refreshMyTickets();
      if (mode === 'admin') {
        await refreshAdminTickets();
      }
    } catch (err) {
      setAppFeedback('Je n ai pas compris votre demande ou l agent n est pas accessible pour le moment. Vous pouvez reformuler votre message ou consulter la FAQ Evollis ci-dessous.');
      setFaqOpen(true);
      setMessages((prev) => [...prev, { role: 'agent', content: 'Je n ai pas compris votre demande ou l agent n est pas accessible pour le moment. Vous pouvez reformuler votre message ou consulter la FAQ Evollis.' }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(ticketId: string, status: TicketStatus) {
    if (!adminToken) return;
    await updateTicketStatus(ticketId, status, adminToken);
    await refreshAdminTickets();
    await refreshMyTickets();
  }

  async function handlePingAgent() {
    if (!user || !adminToken) return;
    try {
      const diagnostic = await getOpenAIDiagnostic(adminToken);
      if (diagnostic.model_call_ok) {
        setAdminAgentCheckResult('Agent disponible via OpenAI.');
        return;
      }

      const details = diagnostic.error ? ` Détail: ${diagnostic.error}` : '';
      setAdminAgentCheckResult(
        diagnostic.configured
          ? `Agent joignable, mais OpenAI ne repond pas correctement.${details}`
          : `OpenAI n'est pas configure correctement.${details}`
      );
    } catch (err) {
      const details = err instanceof Error ? ` Détail: ${err.message}` : '';
      setAdminAgentCheckResult(`Agent indisponible. Consultez la FAQ pendant que le service revient.${details}`);
    }
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
          <BrandLockup compact />
        </div>
        <div className="status-badge">
          <div className="status-dot" />
          Agent disponible
        </div>
        <div className="mode-switch" aria-label="Mode de l'application">
          <button className="mode-btn" type="button" onClick={() => setFaqOpen((prev) => !prev)}>
            {faqOpen ? 'Masquer FAQ' : 'FAQ'}
          </button>
          <button className="mode-btn" type="button" onClick={() => setProfileOpen((prev) => !prev)}>
            {profileOpen ? 'Fermer profil' : 'Profil'}
          </button>
          <button className="mode-btn" type="button" onClick={handleLogout}>
            Se deconnecter
          </button>
          <button className={`mode-btn ${mode === 'user' ? 'active' : ''}`.trim()} type="button" onClick={() => setMode('user')}>
            Mode utilisateur
          </button>
          <button
            className={`mode-btn ${mode === 'admin' ? 'active' : ''}`.trim()}
            type="button"
            onClick={() => {
              if (!adminToken) {
                setAdminLoginOpen(true);
                setAdminAuthFeedback('');
                return;
              }
              setMode('admin');
            }}
          >
            Mode admin
          </button>
        </div>
      </header>

      {adminLoginOpen && (
        <AdminLoginPanel
          email={adminEmail}
          password={adminPassword}
          feedback={adminAuthFeedback}
          pending={adminAuthPending}
          onEmailChange={setAdminEmail}
          onPasswordChange={setAdminPassword}
          onSubmit={() => void handleAdminLogin()}
          onCancel={() => {
            setAdminLoginOpen(false);
            setAdminAuthFeedback('');
            setAdminPassword('');
          }}
        />
      )}

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
              onToggleExpanded={() => setMyTicketsExpanded((prev) => !prev)}
              onRefresh={() => void refreshMyTickets()}
              onNewRequest={resetConversation}
            />
            <FaqPanel open={faqOpen} onClose={() => setFaqOpen(false)} />
            <ChatPanel
              messages={messages}
              input={input}
              loading={loading}
              helpOpen={chatHelpOpen}
              onInputChange={setInput}
              onSubmit={() => void handleSendMessage()}
              onQuick={(text) => void handleSendMessage(text)}
              onToggleHelp={() => setChatHelpOpen((prev) => !prev)}
            />
          </div>
        </div>
      ) : (
        <div className="page">
          <AdminView
            tickets={adminTickets}
            onRefresh={() => void refreshAdminTickets()}
            onUpdateStatus={(id, status) => void handleUpdateStatus(id, status)}
            onPingAgent={() => void handlePingAgent()}
            agentCheckResult={adminAgentCheckResult}
          />
          <FaqPanel open={faqOpen} onClose={() => setFaqOpen(false)} />
        </div>
      )}
    </div>
  );
}
