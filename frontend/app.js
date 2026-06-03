const API_BASE = '';

let history = [];
let isLoading = false;
let currentMode = 'user';
let currentTicketFilter = 'all';
let ticketsCache = [];

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function switchMode(mode) {
  currentMode = mode;
  document.getElementById('userView').hidden = mode !== 'user';
  document.getElementById('adminView').hidden = mode !== 'admin';
  document.getElementById('userModeBtn').classList.toggle('active', mode === 'user');
  document.getElementById('adminModeBtn').classList.toggle('active', mode === 'admin');

  if (mode === 'admin') {
    loadTickets();
  }
}

function sendQuick(text) {
  document.getElementById('userInput').value = text;
  sendMessage();
}

function hideWelcome() {
  const w = document.getElementById('welcome');
  if (w) w.remove();
}

function appendMessage(role, content, category = null, categoryLabel = null) {
  hideWelcome();
  const container = document.getElementById('chatContainer');

  const msg = document.createElement('div');
  msg.className = `message ${role}`;

  const avatarEmoji = role === 'agent' ? '🤖' : '👤';
  const avatarClass = role === 'agent' ? 'agent' : 'user-av';

  const bubbleWrap = document.createElement('div');
  bubbleWrap.className = 'bubble-wrap';

  if (category && categoryLabel) {
    const tag = document.createElement('span');
    tag.className = `category-tag tag-${category}`;
    tag.textContent = String(categoryLabel);
    bubbleWrap.appendChild(tag);
  }

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  // Insert text safely, preserving line breaks
  const frag = document.createDocumentFragment();
  if (typeof content === 'string') {
    content.split('\n').forEach((part, idx) => {
      frag.appendChild(document.createTextNode(part));
      if (idx < content.split('\n').length - 1) frag.appendChild(document.createElement('br'));
    });
  } else {
    frag.appendChild(document.createTextNode(String(content)));
  }
  bubble.appendChild(frag);

  bubbleWrap.appendChild(bubble);

  const avatar = document.createElement('div');
  avatar.className = `avatar ${avatarClass}`;
  avatar.textContent = avatarEmoji;

  msg.appendChild(avatar);
  msg.appendChild(bubbleWrap);
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function showTyping() {
  hideWelcome();
  const container = document.getElementById('chatContainer');
  const el = document.createElement('div');
  el.className = 'message agent';
  el.id = 'typing';
  el.innerHTML = `
    <div class="avatar agent">🤖</div>
    <div class="typing-indicator">
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>`;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

function hideTyping() {
  const el = document.getElementById('typing');
  if (el) el.remove();
}

async function loadTickets() {
  try {
    const res = await fetch(`${API_BASE}/tickets?limit=100`);
    const data = await res.json();
    ticketsCache = Array.isArray(data.items) ? data.items : [];
    renderAdminTickets();
  } catch (err) {
    ticketsCache = [];
    renderAdminTickets();
  }
}

function setTicketFilter(filter) {
  currentTicketFilter = filter;
  document.querySelectorAll('.ticket-filter').forEach((button) => {
    button.classList.toggle('active', button.dataset.filter === filter);
  });
  loadTickets();
}

function renderAdminTickets() {
  const list = document.getElementById('adminTicketList');
  const total = ticketsCache.length;
  const openCount = ticketsCache.filter((ticket) => ticket.status === 'open').length;
  const progressCount = ticketsCache.filter((ticket) => ticket.status === 'in_progress').length;
  const resolvedCount = ticketsCache.filter((ticket) => ticket.status === 'resolved').length;
  const visibleTickets = currentTicketFilter === 'all'
    ? ticketsCache
    : ticketsCache.filter((ticket) => ticket.status === currentTicketFilter);

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statOpen').textContent = openCount;
  document.getElementById('statInProgress').textContent = progressCount;
  document.getElementById('statResolved').textContent = resolvedCount;

  list.innerHTML = '';

  if (!visibleTickets.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'Aucun ticket à afficher pour ce filtre.';
    list.appendChild(empty);
    return;
  }

  visibleTickets.forEach((ticket) => {
    const card = document.createElement('article');
    card.className = 'ticket-card';

    const top = document.createElement('div');
    top.className = 'ticket-top';

    const info = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'ticket-title';
    title.textContent = ticket.title || 'Ticket sans titre';

    const message = document.createElement('div');
    message.className = 'ticket-message';
    message.textContent = ticket.message || '';

    const meta = document.createElement('div');
    meta.className = 'ticket-meta';

    const category = document.createElement('span');
    category.className = 'pill';
    category.textContent = ticket.category_label || ticket.category || 'GENERAL';

    const status = document.createElement('span');
    status.className = `pill pill-${ticket.status}`;
    status.textContent = ticket.status || 'open';

    const source = document.createElement('span');
    source.className = 'pill';
    source.textContent = ticket.source || 'user';

    const date = document.createElement('span');
    date.className = 'pill';
    date.textContent = ticket.created_at ? new Date(ticket.created_at).toLocaleString('fr-FR') : '';

    meta.append(category, status, source, date);
    info.append(title, message, meta);

    const actions = document.createElement('div');
    actions.className = 'ticket-actions';

    ['open', 'in_progress', 'resolved'].forEach((statusName) => {
      const button = document.createElement('button');
      button.className = 'ticket-action';
      button.textContent = statusName === 'in_progress' ? 'En cours' : statusName === 'resolved' ? 'Résolu' : 'Open';
      button.onclick = () => updateTicketStatus(ticket.id, statusName);
      actions.appendChild(button);
    });

    top.append(info, actions);
    card.append(top);
    list.appendChild(card);
  });
}

async function updateTicketStatus(ticketId, status) {
  try {
    await fetch(`${API_BASE}/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await loadTickets();
  } catch (err) {
    await loadTickets();
  }
}

async function sendMessage() {
  if (isLoading) return;
  const input = document.getElementById('userInput');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  input.style.height = 'auto';
  isLoading = true;
  document.getElementById('sendBtn').disabled = true;

  appendMessage('user', text);
  history.push({ role: 'user', content: text });

  showTyping();

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: history.slice(-6) }),
    });

    if (!res.ok) throw new Error('Erreur serveur');
    const data = await res.json();
    console.debug('chat response', data);
    // expose last response for debugging in the page context
    try { window._lastChatResponse = data; } catch (e) {}

    hideTyping();
    appendMessage('agent', data.response, data.category, data.category_label);
    history.push({ role: 'assistant', content: data.response });
    if (currentMode === 'admin') {
      loadTickets();
    }

  } catch (err) {
    hideTyping();
    appendMessage('agent', "Désolé, une erreur est survenue. Veuillez réessayer dans quelques instants.", null, null);
  }

  isLoading = false;
  document.getElementById('sendBtn').disabled = false;
  input.focus();
}

function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

document.getElementById('userInput').focus();
switchMode('user');
