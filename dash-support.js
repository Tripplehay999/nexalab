// NexaLab — Client Portal: Support page

(async function supportPage() {
  const boot = await window.clientBoot;
  if (!boot) return;
  const { userId, project } = boot;

  if (!project || project.status === 'pending' || project.status === 'rejected') {
    window.location.href = 'dashboard.html';
    return;
  }

  const [ticketsRes, leadRes] = await Promise.all([
    nexaSupabase.from('tickets').select('*')
      .eq('project_id', project.id).order('created_at', { ascending: false }),
    nexaSupabase.from('leads').select('*').eq('project_id', project.id).limit(1).maybeSingle(),
  ]);

  const tickets = ticketsRes.data ?? [];
  const lead    = leadRes.data;

  renderTicketStats(tickets);
  renderSupport(tickets, lead);
  initTicketForm(userId, project.id, tickets);
})();

// ── Render: Ticket stats bar ──────────────────────────────

function renderTicketStats(tickets) {
  const bar = document.getElementById('support-stats-bar');
  if (!bar) return;
  const open       = tickets.filter((t) => t.status === 'open').length;
  const inProgress = tickets.filter((t) => t.status === 'in-progress').length;
  const resolved   = tickets.filter((t) => t.status === 'resolved').length;
  bar.innerHTML = `
    <span class="ticket-stat"><strong>${open}</strong> open</span>
    <span class="ticket-stat-sep">·</span>
    <span class="ticket-stat"><strong>${inProgress}</strong> in progress</span>
    <span class="ticket-stat-sep">·</span>
    <span class="ticket-stat"><strong>${resolved}</strong> resolved</span>`;
}

// ── Render: Ticket list + lead card ──────────────────────

function renderSupport(tickets, lead) {
  const ticketList  = document.getElementById('ticket-list');
  const openCount   = document.getElementById('ticket-open-count');
  const openTickets = tickets.filter((t) => t.status !== 'resolved');

  if (openCount) {
    openCount.textContent = openTickets.length || '';
    openCount.hidden = openTickets.length === 0;
  }

  // Sidebar badge (kept in sync)
  const sideBadge = document.getElementById('dash-support-badge');
  if (sideBadge) { sideBadge.textContent = openTickets.length; sideBadge.hidden = openTickets.length === 0; }

  if (ticketList) {
    if (openTickets.length === 0) {
      ticketList.innerHTML = '<p style="font-size:0.85rem;color:var(--muted);margin-top:0.8rem;">No open tickets — all clear.</p>';
    } else {
      ticketList.innerHTML = openTickets.map((t) => `
        <div class="ticket-item ticket-review" data-ticket-id="${escHtml(t.id)}" style="cursor:pointer;" title="Click to view conversation">
          <div class="ticket-top">
            <span class="ticket-id">${escHtml(t.ticket_ref || '#—')}</span>
            <span class="ticket-status ticket-status--review">${escHtml(statusLabel(t.status))}</span>
          </div>
          <p class="ticket-title">${escHtml(t.title)}</p>
          <p class="ticket-meta">Opened ${timeAgo(t.created_at)}${t.category ? ' · ' + escHtml(t.category) : ''} · <span class="ticket-view-link">View replies →</span></p>
        </div>`).join('');

      ticketList.querySelectorAll('.ticket-item').forEach((item) => {
        item.addEventListener('click', () => {
          const tkt = openTickets.find((t) => t.id === item.dataset.ticketId);
          if (tkt) openTicketThread(tkt);
        });
      });
    }
  }

  // Account lead
  if (lead) {
    const leadNameEl = document.getElementById('lead-name');
    const leadRoleEl = document.getElementById('lead-role');
    const leadAvEl   = document.getElementById('lead-avatar-el');
    const leadTzEl   = document.getElementById('lead-tz');
    const leadRespEl = document.getElementById('lead-resp');
    const leadNextEl = document.getElementById('lead-next');
    if (leadNameEl) leadNameEl.textContent = lead.name;
    if (leadRoleEl) leadRoleEl.textContent = lead.role;
    if (leadAvEl)   leadAvEl.textContent   = lead.initials;
    if (leadTzEl)   leadTzEl.textContent   = lead.time_zone;
    if (leadRespEl) leadRespEl.textContent = lead.response_time;
    if (leadNextEl) {
      leadNextEl.textContent = lead.next_checkin
        ? new Date(lead.next_checkin).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
        : 'TBD';
    }
  }
}

// ── Ticket thread ─────────────────────────────────────────

function openTicketThread(ticket) {
  const ticketList   = document.getElementById('ticket-list');
  const threadWrap   = document.getElementById('ticket-thread-wrap');
  const newTicketBtn = document.getElementById('new-ticket-btn');
  if (!threadWrap) return;

  if (ticketList)   ticketList.hidden   = true;
  if (newTicketBtn) newTicketBtn.hidden = true;
  threadWrap.hidden = false;

  const titleEl = document.getElementById('ticket-thread-title');
  const metaEl  = document.getElementById('ticket-thread-meta');
  if (titleEl) titleEl.textContent = `${ticket.ticket_ref || '#—'} · ${ticket.title}`;
  if (metaEl)  metaEl.textContent  = `${ticket.category || 'General'} · Opened ${timeAgo(ticket.created_at)} · ${statusLabel(ticket.status)}`;

  const backBtn = document.getElementById('ticket-thread-back');
  if (backBtn) {
    backBtn.onclick = () => {
      threadWrap.hidden = true;
      if (ticketList)   ticketList.hidden   = false;
      if (newTicketBtn) newTicketBtn.hidden = false;
    };
  }

  loadTicketReplies(ticket);

  const replyForm = document.getElementById('ticket-reply-form');
  if (replyForm) {
    replyForm.onsubmit = async (ev) => {
      ev.preventDefault();
      const content = (replyForm.content.value || '').trim();
      if (!content) return;
      const replyBtn = document.getElementById('ticket-reply-btn');
      const replyErr = document.getElementById('ticket-reply-error');
      if (replyBtn) { replyBtn.disabled = true; replyBtn.textContent = 'Sending…'; }
      if (replyErr) replyErr.textContent = '';

      const { data: { session } } = await nexaSupabase.auth.getSession();
      const { error } = await nexaSupabase.from('ticket_replies').insert({
        ticket_id:   ticket.id,
        author_id:   session?.user?.id,
        author_name: session?.user?.user_metadata?.full_name || 'Client',
        content,
        is_admin:    false,
      });

      if (replyBtn) { replyBtn.disabled = false; replyBtn.textContent = 'Send reply'; }
      if (error) { if (replyErr) replyErr.textContent = 'Could not send reply. Please try again.'; return; }
      replyForm.reset();
      await loadTicketReplies(ticket);

      try {
        await sendNotification('ticket_reply_admin', null, {
          clientName:   session?.user?.user_metadata?.full_name || 'Client',
          ticketRef:    ticket.ticket_ref,
          ticketTitle:  ticket.title,
          replyContent: content,
        });
      } catch (_) {}
    };
  }
}

async function loadTicketReplies(ticket) {
  const messagesEl = document.getElementById('ticket-thread-messages');
  if (!messagesEl) return;

  const { data: replies = [] } = await nexaSupabase
    .from('ticket_replies').select('*').eq('ticket_id', ticket.id).order('created_at', { ascending: true });

  const allMessages = [];
  if (ticket.description) {
    allMessages.push({ content: ticket.description, is_admin: false, author_name: 'You', created_at: ticket.created_at, isOriginal: true });
  }
  replies.forEach((r) => allMessages.push(r));

  if (allMessages.length === 0) {
    messagesEl.innerHTML = '<p style="font-size:0.82rem;color:var(--muted);padding:1rem 0;">No messages yet. The team will reply shortly.</p>';
    return;
  }

  messagesEl.innerHTML = allMessages.map((m) => {
    const side  = m.is_admin ? 'admin' : 'client';
    const name  = m.is_admin ? (m.author_name || 'NexaLab Team') : (m.author_name || 'You');
    const label = m.isOriginal ? 'Original message' : name;
    return `
      <div class="reply-bubble reply-bubble--${side}">
        <p class="reply-author">${escHtml(label)} · ${timeAgo(m.created_at)}</p>
        <p class="reply-content">${escHtml(m.content)}</p>
      </div>`;
  }).join('');

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ── New ticket form ───────────────────────────────────────

function initTicketForm(userId, projectId, initialTickets) {
  const openBtn   = document.getElementById('new-ticket-btn');
  const wrap      = document.getElementById('new-ticket-wrap');
  const form      = document.getElementById('new-ticket-form');
  const cancelBtn = document.getElementById('cancel-ticket-btn');
  const submitBtn = document.getElementById('ticket-submit-btn');
  const errEl     = document.getElementById('ticket-form-error');
  if (!openBtn || !wrap || !form) return;

  function showForm() { wrap.hidden = false; openBtn.hidden = true; }
  function hideForm() { wrap.hidden = true; openBtn.hidden = false; form.reset(); if (errEl) errEl.textContent = ''; }

  openBtn.addEventListener('click', showForm);
  if (cancelBtn) cancelBtn.addEventListener('click', hideForm);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data  = new FormData(form);
    const title = (data.get('title') || '').trim();
    if (!title) return;
    if (errEl) errEl.textContent = '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting…'; }

    const ticketRef = 'NL-' + Date.now().toString(36).toUpperCase().slice(-5);
    const { error } = await nexaSupabase.from('tickets').insert({
      client_id:   userId,
      project_id:  projectId,
      title,
      category:    data.get('category') || 'General',
      description: (data.get('description') || '').trim() || null,
      status:      'open',
      ticket_ref:  ticketRef,
    });

    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit ticket'; }
    if (error) { if (errEl) errEl.textContent = 'Could not submit ticket. Please try again.'; return; }

    hideForm();

    // Reload tickets
    const { data: fresh = [] } = await nexaSupabase
      .from('tickets').select('*').eq('project_id', projectId).order('created_at', { ascending: false });

    renderTicketStats(fresh);
    renderSupport(fresh, null);
  });
}
