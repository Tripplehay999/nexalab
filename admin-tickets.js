// NexaLab — Admin Portal: Tickets page

(async function adminTicketsPage() {
  const boot = await window.adminBoot;
  if (!boot) return;

  await loadAllTickets();

  document.getElementById('adm-ticket-status-filter')?.addEventListener('change', (e) => {
    loadAllTickets(e.target.value);
  });
})();

async function loadAllTickets(status = '') {
  let q = nexaSupabase
    .from('tickets')
    .select('id, title, ticket_ref, category, status, created_at, client_id, project_id, description')
    .order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data: tickets = [] } = await q;

  // Stats bar (all tickets, ignore filter)
  const { data: allTickets = [] } = await nexaSupabase.from('tickets').select('status');
  renderAdminTicketStats(allTickets);

  let profileMap = {};
  if (tickets.length > 0) {
    const clientIds = [...new Set(tickets.map((t) => t.client_id))];
    const { data: pData = [] } = await nexaSupabase.from('profiles').select('id, full_name, email').in('id', clientIds);
    pData.forEach((p) => { profileMap[p.id] = p; });
  }

  const listWrap = document.getElementById('adm-ticket-list');
  if (!listWrap) return;

  if (tickets.length === 0) {
    listWrap.innerHTML = '<p class="adm-empty">No tickets found.</p>';
    return;
  }

  listWrap.innerHTML = tickets.map((t) => {
    const client = profileMap[t.client_id] || {};
    return `
      <div class="adm-ticket-list-item" data-tix-idx="${t.id}" style="cursor:pointer;">
        <div class="adm-ticket-list-top">
          <span class="adm-td--ref" style="font-size:0.75rem;color:var(--muted);">${escHtml(t.ticket_ref || '#—')}</span>
          ${badge(t.status, TIX_MAP)}
        </div>
        <p class="adm-ticket-list-title">${escHtml(t.title)}</p>
        <p class="adm-ticket-list-meta">${escHtml(client.full_name || '—')} · ${escHtml(t.category || 'General')} · ${timeAgo(t.created_at)}</p>
      </div>`;
  }).join('');

  listWrap.querySelectorAll('.adm-ticket-list-item').forEach((item) => {
    item.addEventListener('click', () => {
      listWrap.querySelectorAll('.adm-ticket-list-item').forEach((i) => i.classList.remove('is-active'));
      item.classList.add('is-active');
      const tkt    = tickets.find((t) => t.id === item.dataset.tixIdx);
      const client = profileMap[tkt?.client_id] || {};
      if (tkt) openAdminTicketThread(tkt, client);
    });
  });
}

function renderAdminTicketStats(tickets) {
  const bar = document.getElementById('adm-ticket-stats-bar');
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

async function openAdminTicketThread(ticket, client) {
  const placeholder   = document.getElementById('adm-thread-placeholder');
  const threadContent = document.getElementById('adm-thread-content');
  if (placeholder)   placeholder.hidden = true;
  if (threadContent) threadContent.hidden = false;

  const titleEl   = document.getElementById('adm-thread-title');
  const metaEl    = document.getElementById('adm-thread-meta');
  const statusSel = document.getElementById('adm-thread-status');
  if (titleEl)  titleEl.textContent = `${ticket.ticket_ref || '#—'} · ${ticket.title}`;
  if (metaEl)   metaEl.textContent  = `${client.full_name || '—'} · ${ticket.category || 'General'} · Opened ${timeAgo(ticket.created_at)}`;
  if (statusSel) statusSel.value   = ticket.status;

  if (statusSel) {
    statusSel.onchange = async () => {
      const { error } = await nexaSupabase.from('tickets').update({ status: statusSel.value }).eq('id', ticket.id);
      if (error) showToast('Failed to update', 'error');
      else { showToast('Status updated'); ticket.status = statusSel.value; }
    };
  }

  await loadAdminTicketReplies(ticket);

  const replyForm = document.getElementById('adm-reply-form');
  if (replyForm) {
    replyForm.onsubmit = async (e) => {
      e.preventDefault();
      const content = (replyForm.content.value || '').trim();
      if (!content) return;
      const replyBtn = document.getElementById('adm-reply-btn');
      const replyErr = document.getElementById('adm-reply-error');
      if (replyBtn) { replyBtn.disabled = true; replyBtn.textContent = 'Sending…'; }
      if (replyErr) replyErr.textContent = '';

      const { data: { session } } = await nexaSupabase.auth.getSession();
      const { error } = await nexaSupabase.from('ticket_replies').insert({
        ticket_id:   ticket.id,
        author_id:   session?.user?.id,
        author_name: 'NexaLab Team',
        content,
        is_admin:    true,
      });

      if (replyBtn) { replyBtn.disabled = false; replyBtn.textContent = 'Send reply'; }
      if (error) { if (replyErr) replyErr.textContent = 'Could not send reply.'; return; }

      if (ticket.status === 'open') {
        await nexaSupabase.from('tickets').update({ status: 'in-progress' }).eq('id', ticket.id);
        if (statusSel) statusSel.value = 'in-progress';
        ticket.status = 'in-progress';
      }

      replyForm.reset();
      await loadAdminTicketReplies(ticket);

      await sendNotification('ticket_reply_client', client.email, {
        name:         client.full_name || 'there',
        ticketRef:    ticket.ticket_ref,
        ticketTitle:  ticket.title,
        replyContent: content,
        portalUrl:    `${location.origin}/dashboard.html`,
      });
    };
  }
}

async function loadAdminTicketReplies(ticket) {
  const msgsEl = document.getElementById('adm-thread-messages');
  if (!msgsEl) return;

  const { data: replies = [] } = await nexaSupabase
    .from('ticket_replies').select('*').eq('ticket_id', ticket.id).order('created_at', { ascending: true });

  const allMessages = [];
  if (ticket.description) {
    allMessages.push({ content: ticket.description, is_admin: false, author_name: 'Client', created_at: ticket.created_at, isOriginal: true });
  }
  replies.forEach((r) => allMessages.push(r));

  if (allMessages.length === 0) {
    msgsEl.innerHTML = '<p style="font-size:0.82rem;color:var(--muted);padding:0.5rem 0;">No messages yet.</p>';
    return;
  }

  msgsEl.innerHTML = allMessages.map((m) => {
    const side  = m.is_admin ? 'admin' : 'client';
    const name  = m.is_admin ? (m.author_name || 'NexaLab Team') : (m.author_name || 'Client');
    const label = m.isOriginal ? 'Original message' : name;
    return `
      <div class="reply-bubble reply-bubble--${side}">
        <p class="reply-author">${escHtml(label)} · ${timeAgo(m.created_at)}</p>
        <p class="reply-content">${escHtml(m.content)}</p>
      </div>`;
  }).join('');

  msgsEl.scrollTop = msgsEl.scrollHeight;
}
