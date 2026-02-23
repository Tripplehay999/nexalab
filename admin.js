// NexaLab — Admin Portal

(async function adminApp() {

  // ── 1. Auth guard ─────────────────────────────────────
  const { data: { session } } = await nexaSupabase.auth.getSession();
  if (!session) { window.location.href = 'auth.html'; return; }
  const userId = session.user.id;

  // ── 2. Admin role check ───────────────────────────────
  const { data: profile } = await nexaSupabase
    .from('profiles').select('*').eq('id', userId).single();

  if (!profile || profile.role !== 'admin') {
    window.location.href = 'dashboard.html';
    return;
  }

  // ── 3. Identity ───────────────────────────────────────
  const initials = profile.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'NX';
  document.getElementById('adm-avatar').textContent = initials;
  document.getElementById('adm-name').textContent   = profile.full_name || 'Admin';
  document.getElementById('adm-email').textContent  = profile.email || '';
  document.getElementById('adm-date').textContent   = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });

  // ── 4. Sign out ───────────────────────────────────────
  document.getElementById('adm-logout').addEventListener('click', async () => {
    await nexaSupabase.auth.signOut();
    window.location.href = 'auth.html';
  });

  // ── 5. Sidebar nav ────────────────────────────────────
  const navItems  = document.querySelectorAll('.dash-nav-item[data-section]');
  const sections  = document.querySelectorAll('.dash-section');
  const pageTitle = document.getElementById('adm-page-title');
  const titles    = { overview: 'Overview', pending: 'Pending Approvals', inquiries: 'Inquiries', clients: 'Clients', tickets: 'Tickets' };
  const loaded    = {};
  let   _navBusy  = false;
  const overlay   = document.getElementById('page-overlay');

  function activateSection(key, pushState = true) {
    if (_navBusy) return;
    const next = document.getElementById(`section-${key}`);
    if (!next) return;
    const current = [...sections].find((s) => !s.hidden);
    if (current === next) return;

    _navBusy = true;
    navItems.forEach((n) => n.classList.toggle('is-active', n.dataset.section === key));
    const sidebar = document.getElementById('dash-sidebar');
    if (sidebar) sidebar.classList.remove('is-open');

    // Phase 1 — cover with overlay (feels like leaving a page)
    overlay.classList.add('covering');

    setTimeout(() => {
      // Phase 2 — swap content while screen is covered
      sections.forEach((s) => { s.hidden = true; });
      next.hidden = false;
      if (pageTitle) pageTitle.textContent = titles[key] || key;
      document.title = `${titles[key] || key} — NexaLab Admin`;
      if (pushState) history.pushState({ section: key }, '', `#${key}`);
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (!loaded[key]) {
        loaded[key] = true;
        if (key === 'overview')  loadOverview();
        if (key === 'pending')   loadPendingProjects();
        if (key === 'inquiries') loadInquiries();
        if (key === 'clients')   loadClients();
        if (key === 'tickets')   loadAllTickets();
      }
      // Phase 3 — reveal new "page"
      overlay.classList.remove('covering');
      setTimeout(() => { _navBusy = false; }, 160);
    }, 150);
  }

  // Browser back / forward
  window.addEventListener('popstate', (e) => {
    const key = e.state?.section || location.hash.replace('#', '') || 'overview';
    activateSection(key, false);
  });

  navItems.forEach((n) => n.addEventListener('click', (e) => {
    e.preventDefault();
    activateSection(n.dataset.section);
  }));

  // Mobile sidebar
  const menuBtn = document.getElementById('dash-menu-btn');
  const sidebar  = document.getElementById('dash-sidebar');
  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', () => sidebar.classList.toggle('is-open'));
    document.addEventListener('click', (e) => {
      if (!sidebar.contains(e.target) && e.target !== menuBtn) sidebar.classList.remove('is-open');
    });
  }

  // ── 6. Inquiry status filter ──────────────────────────
  document.getElementById('inq-status-filter').addEventListener('change', (e) => {
    loadInquiries(e.target.value);
  });

  // ── 7. Ticket status filter ───────────────────────────
  document.getElementById('ticket-status-filter').addEventListener('change', (e) => {
    loadAllTickets(e.target.value);
  });

  // ── 8. Client detail — back button ───────────────────
  document.getElementById('adm-back-btn').addEventListener('click', () => {
    const detail = document.getElementById('clients-detail-view');
    const grid   = document.getElementById('clients-grid-view');
    const _ov = document.getElementById('page-overlay');
    _ov.classList.add('covering');
    setTimeout(() => {
      detail.hidden = true;
      grid.hidden   = false;
      window.scrollTo({ top: 0, behavior: 'instant' });
      _ov.classList.remove('covering');
    }, 150);
    _state.clientId  = null;
    _state.projectId = null;
    _state.leadId    = null;
  });

  // ── 9. Project tabs ───────────────────────────────────
  document.querySelectorAll('.adm-tab').forEach((tab) => {
    tab.addEventListener('click', () => switchProjectTab(tab.dataset.tab));
  });

  // ── 10. Boot ──────────────────────────────────────────
  const hash = location.hash.replace('#', '');
  activateSection(titles[hash] ? hash : 'overview');

})();

// ── Shared state ──────────────────────────────────────────
const _state = { clientId: null, projectId: null, leadId: null };

// ── Utilities ─────────────────────────────────────────────
function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const d = Math.floor(diff / 86400);
  return d < 7 ? `${d}d ago` : fmtDate(iso);
}
function badge(status, map) {
  const { label, cls } = map[status] || { label: status, cls: 'adm-badge--gray' };
  return `<span class="adm-badge ${cls}">${escHtml(label)}</span>`;
}

const INQ_MAP = {
  new:       { label: 'New',       cls: 'adm-badge--purple' },
  contacted: { label: 'Contacted', cls: 'adm-badge--blue'   },
  converted: { label: 'Converted', cls: 'adm-badge--green'  },
  closed:    { label: 'Closed',    cls: 'adm-badge--gray'   },
};
const TIX_MAP = {
  'open':        { label: 'Open',        cls: 'adm-badge--red'  },
  'in-progress': { label: 'In progress', cls: 'adm-badge--blue' },
  'resolved':    { label: 'Resolved',    cls: 'adm-badge--green'},
};

function showToast(msg, type = 'success') {
  let t = document.getElementById('adm-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'adm-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = `adm-toast adm-toast--${type} adm-toast--visible`;
  clearTimeout(t._tmr);
  t._tmr = setTimeout(() => t.classList.remove('adm-toast--visible'), 3000);
}

// ── Pending Approvals ─────────────────────────────────────
async function loadPendingProjects() {
  const { data: projects = [] } = await nexaSupabase
    .from('projects')
    .select('id, name, plan, status, created_at, client_id, inquiry_id, description')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  // Update sidebar badge
  const pb = document.getElementById('adm-pending-badge');
  if (pb) { pb.textContent = projects.length; pb.hidden = projects.length === 0; }

  const wrap = document.getElementById('adm-pending-list');
  if (!wrap) return;

  if (projects.length === 0) {
    wrap.innerHTML = '<div class="dash-card"><p class="adm-empty">No pending projects — all caught up.</p></div>';
    return;
  }

  // Fetch client profiles + inquiries
  const clientIds = [...new Set(projects.map((p) => p.client_id))];
  const inqIds    = projects.map((p) => p.inquiry_id).filter(Boolean);
  const [profilesRes, inqRes] = await Promise.all([
    nexaSupabase.from('profiles').select('id, full_name, company, email').in('id', clientIds),
    inqIds.length ? nexaSupabase.from('inquiries').select('id, goal, revenue, budget, timeline, services, plan, work_email').in('id', inqIds) : { data: [] },
  ]);
  const profileMap = {};
  const inqMap     = {};
  (profilesRes.data ?? []).forEach((p) => { profileMap[p.id] = p; });
  (inqRes.data     ?? []).forEach((i) => { inqMap[i.id]     = i; });

  wrap.innerHTML = projects.map((proj) => {
    const client = profileMap[proj.client_id] || {};
    const inq    = inqMap[proj.inquiry_id]    || {};
    const ini    = client.full_name?.split(' ').map((n) => n[0]).join('').slice(0,2).toUpperCase() || '?';
    return `
      <div class="adm-pending-card dash-card" id="pending-card-${proj.id}">
        <div class="adm-pending-card-header">
          <div class="adm-client-avatar" style="flex-shrink:0;">${escHtml(ini)}</div>
          <div style="flex:1;min-width:0;">
            <p class="adm-client-name">${escHtml(client.full_name || 'Unknown')}</p>
            <p class="adm-client-meta">${escHtml([client.company, client.email].filter(Boolean).join(' · '))}</p>
          </div>
          <div style="flex-shrink:0;display:flex;gap:0.5rem;">
            <button class="btn btn-sm btn-primary" data-approve-id="${proj.id}" data-client-email="${escHtml(client.email || '')}" data-client-name="${escHtml(client.full_name || '')}">✓ Approve</button>
            <button class="btn btn-sm btn-outline adm-icon-btn--danger" style="width:auto;padding:0 0.75rem;" data-reject-id="${proj.id}" data-client-email="${escHtml(client.email || '')}" data-client-name="${escHtml(client.full_name || '')}">✕ Reject</button>
          </div>
        </div>
        <div class="adm-pending-details">
          <div class="adm-pending-row"><span class="adm-pending-label">Plan</span><span>${escHtml(inq.plan || proj.plan || '—')}</span></div>
          <div class="adm-pending-row"><span class="adm-pending-label">Revenue</span><span>${escHtml(inq.revenue || '—')}</span></div>
          <div class="adm-pending-row"><span class="adm-pending-label">Budget</span><span>${escHtml(inq.budget || '—')}</span></div>
          <div class="adm-pending-row"><span class="adm-pending-label">Timeline</span><span>${escHtml(inq.timeline || '—')}</span></div>
          <div class="adm-pending-row"><span class="adm-pending-label">Services</span><span>${escHtml((inq.services || []).join(', ') || '—')}</span></div>
          <div class="adm-pending-row"><span class="adm-pending-label">Submitted</span><span>${fmtDate(proj.created_at)}</span></div>
          ${inq.goal ? `<div class="adm-pending-goal"><p class="adm-pending-label">Goal</p><p>${escHtml(inq.goal)}</p></div>` : ''}
        </div>
      </div>`;
  }).join('');

  wrap.querySelectorAll('[data-approve-id]').forEach((btn) => {
    btn.addEventListener('click', () => approveProject(btn.dataset.approveId, btn.dataset.clientEmail, btn.dataset.clientName));
  });
  wrap.querySelectorAll('[data-reject-id]').forEach((btn) => {
    btn.addEventListener('click', () => rejectProject(btn.dataset.rejectId, btn.dataset.clientEmail, btn.dataset.clientName));
  });
}

async function approveProject(projectId, clientEmail, clientName) {
  if (!confirm(`Approve this project for ${clientName || 'this client'}?`)) return;
  const { error } = await nexaSupabase.from('projects').update({ status: 'active' }).eq('id', projectId);
  if (error) { showToast('Failed to approve project', 'error'); return; }
  showToast('Project approved — client portal is now active');

  // Fetch plan for email
  const { data: proj } = await nexaSupabase.from('projects').select('plan').eq('id', projectId).single();
  await sendNotificationAdmin('project_approved', clientEmail, {
    name:      clientName,
    plan:      proj?.plan || '',
    portalUrl: `${location.origin}/dashboard.html`,
  });

  // Reload pending list
  const el = document.getElementById(`pending-card-${projectId}`);
  if (el) el.remove();
  const pb = document.getElementById('adm-pending-badge');
  const remaining = document.querySelectorAll('[id^="pending-card-"]').length;
  if (pb) { pb.textContent = remaining; pb.hidden = remaining === 0; }
  if (remaining === 0) {
    const wrap = document.getElementById('adm-pending-list');
    if (wrap) wrap.innerHTML = '<div class="dash-card"><p class="adm-empty">No pending projects — all caught up.</p></div>';
  }
}

async function rejectProject(projectId, clientEmail, clientName) {
  if (!confirm(`Reject this project for ${clientName || 'this client'}? They will be notified.`)) return;
  const { error } = await nexaSupabase.from('projects').update({ status: 'rejected' }).eq('id', projectId);
  if (error) { showToast('Failed to reject project', 'error'); return; }
  showToast('Project rejected — client notified');

  await sendNotificationAdmin('project_rejected', clientEmail, { name: clientName });

  const el = document.getElementById(`pending-card-${projectId}`);
  if (el) el.remove();
  const pb = document.getElementById('adm-pending-badge');
  const remaining = document.querySelectorAll('[id^="pending-card-"]').length;
  if (pb) { pb.textContent = remaining; pb.hidden = remaining === 0; }
  if (remaining === 0) {
    const wrap = document.getElementById('adm-pending-list');
    if (wrap) wrap.innerHTML = '<div class="dash-card"><p class="adm-empty">No pending projects — all caught up.</p></div>';
  }
}

async function sendNotificationAdmin(type, to, data) {
  if (!to) return;
  try {
    await fetch(`${NEXALAB_SUPABASE_URL}/functions/v1/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${NEXALAB_SUPABASE_KEY}`,
        'apikey':         NEXALAB_SUPABASE_KEY,
      },
      body: JSON.stringify({ type, to, data }),
    });
  } catch (_) {}
}

// ── Overview ──────────────────────────────────────────────
async function loadOverview() {
  const [clientsRes, projectsRes, inquiriesRes, ticketsRes] = await Promise.all([
    nexaSupabase.from('profiles').select('id').neq('role', 'admin'),
    nexaSupabase.from('projects').select('id, status'),
    nexaSupabase.from('inquiries').select('id, status, full_name, work_email, created_at').order('created_at', { ascending: false }).limit(6),
    nexaSupabase.from('tickets').select('id, status, title, ticket_ref, created_at').neq('status', 'resolved').order('created_at', { ascending: false }).limit(6),
  ]);


  const clients   = clientsRes.data   ?? [];
  const projects  = projectsRes.data  ?? [];
  const inquiries = inquiriesRes.data ?? [];
  const tickets   = ticketsRes.data   ?? [];
  const newInq    = inquiries.filter((i) => i.status === 'new').length;
  const openTix   = tickets.length;

  // Update sidebar badges
  const ib = document.getElementById('adm-inq-badge');
  if (ib) { ib.textContent = newInq; ib.hidden = newInq === 0; }
  const tb = document.getElementById('adm-ticket-badge');
  if (tb) { tb.textContent = openTix; tb.hidden = openTix === 0; }

  // Stat cards
  const grid = document.getElementById('adm-stats-grid');
  if (grid) {
    const active = projects.filter((p) => p.status === 'active').length;
    grid.innerHTML = `
      <div class="dash-stat-card">
        <p class="dash-stat-label">Total clients</p>
        <p class="dash-stat-val">${clients.length}</p>
        <p class="dash-stat-sub">${projects.length} project${projects.length !== 1 ? 's' : ''} created</p>
      </div>
      <div class="dash-stat-card">
        <p class="dash-stat-label">Active projects</p>
        <p class="dash-stat-val">${active}</p>
        <p class="dash-stat-sub">${projects.length - active} inactive</p>
      </div>
      <div class="dash-stat-card">
        <p class="dash-stat-label">New inquiries</p>
        <p class="dash-stat-val">${newInq}</p>
        <p class="dash-stat-sub ${newInq > 0 ? 'dash-stat-warn' : 'dash-stat-green'}">${newInq > 0 ? 'Needs review' : 'All reviewed'}</p>
      </div>
      <div class="dash-stat-card">
        <p class="dash-stat-label">Open tickets</p>
        <p class="dash-stat-val">${openTix}</p>
        <p class="dash-stat-sub ${openTix > 0 ? 'dash-stat-warn' : 'dash-stat-green'}">${openTix > 0 ? 'Awaiting response' : 'All clear'}</p>
      </div>`;
  }

  // Recent inquiries
  const ri = document.getElementById('adm-recent-inquiries');
  if (ri) {
    ri.innerHTML = inquiries.length === 0
      ? '<p class="adm-empty">No inquiries yet.</p>'
      : `<div class="adm-simple-list">${inquiries.map((i) => `
          <div class="adm-simple-row">
            <div>
              <p class="adm-simple-name">${escHtml(i.full_name)}</p>
              <p class="adm-simple-sub">${escHtml(i.work_email)} · ${timeAgo(i.created_at)}</p>
            </div>
            ${badge(i.status, INQ_MAP)}
          </div>`).join('')}</div>`;
  }

  // Recent tickets
  const rt = document.getElementById('adm-recent-tickets');
  if (rt) {
    rt.innerHTML = tickets.length === 0
      ? '<p class="adm-empty">No open tickets.</p>'
      : `<div class="adm-simple-list">${tickets.map((t) => `
          <div class="adm-simple-row">
            <div>
              <p class="adm-simple-name">${escHtml(t.ticket_ref || '#—')} ${escHtml(t.title)}</p>
              <p class="adm-simple-sub">${timeAgo(t.created_at)}</p>
            </div>
            ${badge(t.status, TIX_MAP)}
          </div>`).join('')}</div>`;
  }
}

// ── Inquiries ─────────────────────────────────────────────
async function loadInquiries(status = '') {
  let q = nexaSupabase.from('inquiries').select('*').order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data: rows = [] } = await q;

  const wrap = document.getElementById('inq-table-wrap');
  if (!wrap) return;

  if (rows.length === 0) {
    wrap.innerHTML = '<p class="adm-empty" style="padding:1rem 0;">No inquiries found.</p>';
    return;
  }

  const isDone = (s) => s === 'converted' || s === 'closed';

  wrap.innerHTML = `
    <div class="adm-table-wrap">
      <table class="adm-table">
        <thead>
          <tr>
            <th>Name</th><th>Email</th><th>Company</th><th>Revenue</th>
            <th>Budget</th><th>Services</th><th>Submitted</th><th>Status</th><th></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r) => `
          <tr class="adm-tr" data-inq-id="${escHtml(r.id)}">
            <td class="adm-td adm-td--name">${escHtml(r.full_name)}</td>
            <td class="adm-td"><a href="mailto:${escHtml(r.work_email)}" class="adm-link">${escHtml(r.work_email)}</a></td>
            <td class="adm-td">${escHtml(r.company || '—')}</td>
            <td class="adm-td">${escHtml(r.revenue)}</td>
            <td class="adm-td">${escHtml(r.budget)}</td>
            <td class="adm-td adm-td--services">${(r.services || []).join(', ') || '—'}</td>
            <td class="adm-td adm-td--date">${fmtDate(r.created_at)}</td>
            <td class="adm-td">
              <span class="adm-inq-status-badge adm-inq-status--${escHtml(r.status)}">${escHtml(r.status)}</span>
            </td>
            <td class="adm-td">
              <button class="adm-expand-btn" data-inq-id="${r.id}">Review ↓</button>
            </td>
          </tr>
          <tr class="adm-goal-row" id="goal-${r.id}" hidden>
            <td colspan="9" class="adm-goal-cell">
              <div class="adm-inq-detail">
                ${r.plan     ? `<div class="adm-inq-detail-row"><span class="adm-inq-detail-label">Plan</span>${escHtml(r.plan)}</div>` : ''}
                ${r.website  ? `<div class="adm-inq-detail-row"><span class="adm-inq-detail-label">Website</span><a href="${escHtml(r.website)}" target="_blank" class="adm-link">${escHtml(r.website)}</a></div>` : ''}
                ${r.timeline ? `<div class="adm-inq-detail-row"><span class="adm-inq-detail-label">Timeline</span>${escHtml(r.timeline)}</div>` : ''}
                <div class="adm-inq-detail-row adm-inq-goal"><span class="adm-inq-detail-label">Goal</span>${escHtml(r.goal)}</div>
                <div class="adm-inq-status-row">
                  <span class="adm-inq-detail-label">Change status</span>
                  <select class="adm-select adm-inline-select adm-inq-status-chg" data-inq-id="${escHtml(r.id)}">
                    <option value="new"       ${r.status==='new'       ?'selected':''}>New</option>
                    <option value="contacted" ${r.status==='contacted' ?'selected':''}>Contacted</option>
                    <option value="converted" ${r.status==='converted' ?'selected':''}>Converted</option>
                    <option value="closed"    ${r.status==='closed'    ?'selected':''}>Closed</option>
                  </select>
                </div>
                ${!isDone(r.status) ? `
                <div class="adm-inq-actions">
                  <button class="btn btn-sm adm-approve-inq-btn"
                    data-approve-inq="${escHtml(r.id)}"
                    data-inq-name="${escHtml(r.full_name)}"
                    data-inq-email="${escHtml(r.work_email)}"
                    data-inq-plan="${escHtml(r.plan || '')}"
                    data-inq-goal="${escHtml(r.goal || '')}">✓ Approve — activate client portal</button>
                  <button class="btn btn-sm adm-decline-inq-btn"
                    data-decline-inq="${escHtml(r.id)}"
                    data-inq-name="${escHtml(r.full_name)}"
                    data-inq-email="${escHtml(r.work_email)}">✗ Decline</button>
                </div>` : ''}
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  wrap.querySelectorAll('.adm-inq-status-chg').forEach((sel) => {
    sel.addEventListener('change', async () => {
      const { error } = await nexaSupabase.from('inquiries')
        .update({ status: sel.value }).eq('id', sel.dataset.inqId);
      if (error) showToast('Failed to update status', 'error');
      else { showToast('Status updated'); loadInquiries(document.getElementById('inq-status-filter')?.value || ''); }
    });
  });

  wrap.querySelectorAll('.adm-expand-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id      = btn.dataset.inqId;
      const goalRow = document.getElementById(`goal-${id}`);
      if (goalRow) {
        goalRow.hidden  = !goalRow.hidden;
        btn.textContent = goalRow.hidden ? 'Review ↓' : 'Close ↑';
      }
    });
  });

  wrap.querySelectorAll('[data-approve-inq]').forEach((btn) => {
    btn.addEventListener('click', () =>
      approveInquiry(btn.dataset.approveInq, btn.dataset.inqName, btn.dataset.inqEmail, btn.dataset.inqPlan, btn.dataset.inqGoal));
  });

  wrap.querySelectorAll('[data-decline-inq]').forEach((btn) => {
    btn.addEventListener('click', () =>
      declineInquiry(btn.dataset.declineInq, btn.dataset.inqName, btn.dataset.inqEmail));
  });
}

async function approveInquiry(inquiryId, name, email, plan, goal) {
  if (!confirm(`Approve ${name}'s inquiry and activate their client portal?`)) return;

  const { error: inqErr } = await nexaSupabase
    .from('inquiries').update({ status: 'converted' }).eq('id', inquiryId);
  if (inqErr) { showToast('Failed to update inquiry', 'error'); return; }

  // Find any linked pending project
  const { data: existingProject } = await nexaSupabase
    .from('projects').select('id').eq('inquiry_id', inquiryId).eq('status', 'pending').maybeSingle();

  if (existingProject) {
    // Approve the existing linked project
    await nexaSupabase.from('projects').update({ status: 'active' }).eq('id', existingProject.id);
  } else {
    // No linked project — find the client by email and create one from inquiry data
    const { data: clientProfile } = await nexaSupabase
      .from('profiles').select('id').eq('email', email).maybeSingle();

    if (clientProfile) {
      await nexaSupabase.from('projects').insert({
        client_id:   clientProfile.id,
        inquiry_id:  inquiryId,
        name:        plan ? `${plan} Project` : `${name}'s Project`,
        plan:        plan  || null,
        status:      'active',
        description: goal  || 'Approved via inquiry.',
      });
    } else {
      showToast(`Inquiry marked converted — client hasn't created an account yet`, 'warn');
      loadInquiries(document.getElementById('inq-status-filter')?.value || '');
      return;
    }
  }

  await sendNotificationAdmin('project_approved', email, {
    name, plan,
    portalUrl: `${location.origin}/dashboard.html`,
  });
  showToast(`${name} approved — portal is now active`);
  loadInquiries(document.getElementById('inq-status-filter')?.value || '');
}

async function declineInquiry(inquiryId, name, email) {
  if (!confirm(`Decline ${name}'s inquiry? They will be notified.`)) return;

  const { error: inqErr } = await nexaSupabase
    .from('inquiries').update({ status: 'closed' }).eq('id', inquiryId);
  if (inqErr) { showToast('Failed to update inquiry', 'error'); return; }

  // Find and reject any linked pending project
  const { data: project } = await nexaSupabase
    .from('projects').select('id').eq('inquiry_id', inquiryId).eq('status', 'pending').maybeSingle();

  if (project) {
    await nexaSupabase.from('projects').update({ status: 'rejected' }).eq('id', project.id);
    await sendNotificationAdmin('project_rejected', email, { name });
  }

  showToast(`${name}'s inquiry declined`);
  loadInquiries(document.getElementById('inq-status-filter')?.value || '');
}

// ── Clients ───────────────────────────────────────────────
async function loadClients() {
  const [profilesRes, projRes] = await Promise.all([
    nexaSupabase.from('profiles').select('*').neq('role', 'admin').order('created_at', { ascending: false }),
    nexaSupabase.from('projects').select('client_id, status'),
  ]);

  const clients  = profilesRes.data ?? [];
  const projects = projRes.data     ?? [];

  // Build a map: client_id → best project status (active > pending > rejected > none)
  const statusRank = { active: 3, pending: 2, rejected: 1 };
  const statusMap  = {};
  projects.forEach((p) => {
    const cur = statusMap[p.client_id];
    if (!cur || (statusRank[p.status] || 0) > (statusRank[cur] || 0)) {
      statusMap[p.client_id] = p.status;
    }
  });

  const grid = document.getElementById('adm-client-grid');
  if (!grid) return;

  if (clients.length === 0) {
    grid.innerHTML = '<p class="adm-empty">No clients have signed up yet.</p>';
    return;
  }

  grid.innerHTML = clients.map((c) => {
    const ini    = c.avatar_initials || c.full_name?.split(' ').map((n) => n[0]).join('').slice(0,2).toUpperCase() || '?';
    const pStat  = statusMap[c.id] || null;
    const badge  = pStat
      ? `<span class="adm-client-status adm-client-status--${escHtml(pStat)}">${escHtml(pStat)}</span>`
      : `<span class="adm-client-status adm-client-status--none">no project</span>`;
    return `
      <div class="adm-client-card" data-client-id="${c.id}">
        <div class="adm-client-avatar">${escHtml(ini)}</div>
        <div class="adm-client-info">
          <p class="adm-client-name">${escHtml(c.full_name || 'Unnamed')}</p>
          <p class="adm-client-meta">${escHtml([c.company, c.email].filter(Boolean).join(' · '))}</p>
          ${badge}
        </div>
        <button class="btn btn-sm btn-outline adm-manage-btn">Manage →</button>
      </div>`;
  }).join('');

  grid.querySelectorAll('.adm-manage-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card   = btn.closest('.adm-client-card');
      const client = clients.find((c) => c.id === card.dataset.clientId);
      openClientDetail(client);
    });
  });
}

async function openClientDetail(client) {
  _state.clientId  = client.id;
  _state.projectId = null;
  _state.leadId    = null;

  const grid   = document.getElementById('clients-grid-view');
  const detail = document.getElementById('clients-detail-view');
  document.getElementById('adm-detail-name').textContent = client.full_name || 'Unnamed';
  document.getElementById('adm-detail-sub').textContent  = [client.company, client.email].filter(Boolean).join(' · ');
  const _ov = document.getElementById('page-overlay');
  _ov.classList.add('covering');
  setTimeout(() => {
    grid.hidden   = true;
    detail.hidden = false;
    window.scrollTo({ top: 0, behavior: 'instant' });
    _ov.classList.remove('covering');
  }, 150);

  // Wire delete button for this client
  const delBtn = document.getElementById('adm-delete-client-btn');
  if (delBtn) {
    delBtn.onclick = () => deleteClient(client.id, client.full_name || 'this client');
  }

  switchProjectTab('project');
  await loadClientProject(client.id);
}

async function deleteClient(clientId, clientName) {
  if (!confirm(`Permanently delete ${clientName}'s profile and all their data? This cannot be undone.`)) return;

  const { error } = await nexaSupabase.from('profiles').delete().eq('id', clientId);
  if (error) { showToast('Failed to delete client: ' + error.message, 'error'); return; }

  showToast(`${clientName} deleted`);
  document.getElementById('clients-detail-view').hidden = true;
  document.getElementById('clients-grid-view').hidden   = false;
  loadClients();
}

async function loadClientProject(clientId) {
  const { data: project } = await nexaSupabase
    .from('projects').select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1).maybeSingle();

  _state.projectId = project?.id || null;
  renderProjectTab(project, clientId);
}

function renderProjectTab(project, clientId) {
  const el = document.getElementById('project-tab-content');
  if (!el) return;

  el.innerHTML = `
    <div class="dash-card adm-form-card">
      <p class="dash-card-title">${project ? 'Edit project' : 'Create project for this client'}</p>
      <form id="adm-project-form">
        <div class="form-grid">
          <label class="form-field">Project name *
            <input name="name" type="text" value="${escHtml(project?.name || '')}" placeholder="Meridian Apparel Store" required />
          </label>
          <label class="form-field">Plan name
            <input name="plan" type="text" value="${escHtml(project?.plan || '')}" placeholder="Full-Stack Commerce Retainer" />
          </label>
          <label class="form-field">Status
            <select name="status">
              <option value="pending"  ${project?.status==='pending'  ?'selected':''}>Pending (awaiting approval)</option>
              <option value="active"   ${project?.status==='active'   ?'selected':''}>Active</option>
              <option value="paused"   ${project?.status==='paused'   ?'selected':''}>Paused</option>
              <option value="complete" ${project?.status==='complete' ?'selected':''}>Complete</option>
              <option value="rejected" ${project?.status==='rejected' ?'selected':''}>Rejected</option>
            </select>
          </label>
          <label class="form-field">Start date
            <input name="started_at" type="date" value="${project?.started_at || ''}" />
          </label>
        </div>
        <label class="form-field" style="margin-top:0.75rem;">Description
          <textarea name="description" rows="2" placeholder="Brief project description…">${escHtml(project?.description || '')}</textarea>
        </label>
        <p class="adm-form-error" id="project-error"></p>
        <button class="btn btn-primary btn-sm" type="submit" style="margin-top:1rem;">
          ${project ? 'Update project' : 'Create project'}
        </button>
      </form>
    </div>`;

  document.getElementById('adm-project-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data  = Object.fromEntries(new FormData(e.target));
    const errEl = document.getElementById('project-error');
    errEl.textContent = '';

    const payload = {
      name: data.name, plan: data.plan || null,
      status: data.status, started_at: data.started_at || null,
      description: data.description || null,
    };

    if (project) {
      const { error } = await nexaSupabase.from('projects').update(payload).eq('id', project.id);
      if (error) { errEl.textContent = error.message; return; }
      showToast('Project updated');
      Object.assign(project, payload);
    } else {
      const { data: np, error } = await nexaSupabase.from('projects')
        .insert({ client_id: clientId, ...payload }).select().single();
      if (error) { errEl.textContent = error.message; return; }
      _state.projectId = np.id;
      showToast('Project created');
      renderProjectTab(np, clientId);
      // Show form wraps now that project exists
      ['milestone-form-wrap','deliverable-form-wrap','activity-form-wrap'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.hidden = false;
      });
    }
  });
}

let _tabBusy = false;
function switchProjectTab(tab) {
  if (_tabBusy) return;
  const panes   = [...document.querySelectorAll('.adm-tab-pane')];
  const next    = document.getElementById(`tab-${tab}`);
  const current = panes.find((p) => !p.hidden);

  document.querySelectorAll('.adm-tab').forEach((t) => t.classList.toggle('is-active', t.dataset.tab === tab));

  const doSwitch = () => {
    panes.forEach((p) => { p.hidden = true; });
    if (next) next.hidden = false;
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (tab === 'profile')      { if (_state.clientId) loadClientProfile(_state.clientId); return; }
    if (tab === 'integrations') { if (_state.clientId) loadClientIntegrations(_state.clientId); return; }
    if (!_state.projectId) return;
    if (tab === 'milestones')   loadMilestones(_state.projectId);
    if (tab === 'deliverables') loadDeliverables(_state.projectId);
    if (tab === 'activity')     loadActivityAdmin(_state.projectId);
    if (tab === 'lead')         loadLead(_state.projectId);
  };

  if (current && current !== next) {
    _tabBusy = true;
    current.classList.add('is-leaving');
    setTimeout(() => {
      current.classList.remove('is-leaving');
      _tabBusy = false;
      doSwitch();
    }, 110);
  } else {
    doSwitch();
  }
}

// ── Store Integrations ────────────────────────────────────
async function loadClientIntegrations(clientId) {
  const { data: integration } = await nexaSupabase
    .from('store_integrations').select('id, platform, store_url, last_synced_at, is_active')
    .eq('client_id', clientId).eq('is_active', true).limit(1).maybeSingle();

  renderIntegrationTab(integration, clientId);
}

function renderIntegrationTab(integration, clientId) {
  const el = document.getElementById('adm-integration-card');
  if (!el) return;

  if (!integration) {
    // ── Connect form ────────────────────────────────────────
    el.innerHTML = `
      <p class="dash-card-title">Connect Store</p>
      <p class="dash-card-sub" style="margin-bottom:1.25rem;">
        Link this client's store to sync live revenue, order count, and customer data into their portal.
      </p>
      <form id="adm-integration-form">
        <div class="form-grid">
          <label class="form-field">Platform *
            <select name="platform" id="adm-platform-select">
              <option value="wordpress">WordPress + WooCommerce</option>
              <option value="shopify">Shopify</option>
              <option value="bigcommerce">BigCommerce</option>
            </select>
          </label>
          <label class="form-field">Store URL *
            <input name="store_url" type="url" placeholder="https://yourstore.com" required />
          </label>
          <!-- WooCommerce / BigCommerce -->
          <label class="form-field" id="fi-api-key">
            <span id="fi-api-key-label">Consumer Key (ck_…)</span>
            <input name="api_key" type="text" placeholder="ck_..." />
          </label>
          <label class="form-field" id="fi-api-secret">
            <span id="fi-api-secret-label">Consumer Secret (cs_…)</span>
            <input name="api_secret" type="password" placeholder="cs_..." />
          </label>
          <!-- Shopify / BigCommerce access token -->
          <label class="form-field" id="fi-token" style="display:none;">
            <span id="fi-token-label">Access Token</span>
            <input name="access_token" type="password" placeholder="shppa_..." />
          </label>
          <!-- BigCommerce store hash -->
          <label class="form-field" id="fi-hash" style="display:none;">Store Hash
            <input name="store_hash" type="text" placeholder="abc123xyz" />
          </label>
        </div>
        <details class="adm-integration-help" style="margin-top:1rem;">
          <summary style="cursor:pointer;font-size:0.82rem;color:var(--muted);">Where do I find these credentials?</summary>
          <div class="adm-integration-help-body">
            <p><strong>WordPress / WooCommerce:</strong> WooCommerce → Settings → Advanced → REST API → Add key. Set permissions to Read.</p>
            <p><strong>Shopify:</strong> Settings → Apps → Develop apps → Create app → Admin API access token.</p>
            <p><strong>BigCommerce:</strong> Settings → API accounts → Create V2/V3 API token. Copy Access Token and Store Hash from the URL.</p>
          </div>
        </details>
        <p class="adm-form-error" id="integration-error"></p>
        <button class="btn btn-primary btn-sm" type="submit" style="margin-top:1rem;">Connect &amp; Sync</button>
      </form>`;

    // Platform toggle
    document.getElementById('adm-platform-select').addEventListener('change', (e) => {
      const p = e.target.value;
      const isWoo = p === 'wordpress' || p === 'woocommerce';
      document.getElementById('fi-api-key').style.display    = p === 'shopify'    ? 'none' : '';
      document.getElementById('fi-api-secret').style.display = p === 'shopify'    ? 'none' : '';
      document.getElementById('fi-token').style.display      = isWoo              ? 'none' : '';
      document.getElementById('fi-hash').style.display       = p === 'bigcommerce'? ''     : 'none';
      const keyLbl = document.getElementById('fi-api-key-label');
      const secLbl = document.getElementById('fi-api-secret-label');
      const tokLbl = document.getElementById('fi-token-label');
      if (p === 'bigcommerce') { keyLbl.textContent = 'Client ID'; secLbl.textContent = 'Client Secret'; tokLbl.textContent = 'Access Token'; }
      else { keyLbl.textContent = 'Consumer Key (ck_…)'; secLbl.textContent = 'Consumer Secret (cs_…)'; tokLbl.textContent = 'Access Token'; }
    });

    // Form submit
    document.getElementById('adm-integration-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = Object.fromEntries(fd);
      await connectStore(clientId, payload);
    });

  } else {
    // ── Connected state ─────────────────────────────────────
    const platformLabel = { wordpress: 'WordPress', woocommerce: 'WooCommerce', shopify: 'Shopify', bigcommerce: 'BigCommerce' };
    el.innerHTML = `
      <div class="adm-integration-header">
        <div>
          <p class="dash-card-title" style="margin:0;">Store Connected</p>
          <p class="dash-card-sub" style="margin:0.2rem 0 0;">${escHtml(platformLabel[integration.platform] || integration.platform)}</p>
        </div>
        <span class="adm-integration-status-badge">● Live</span>
      </div>
      <div class="adm-integration-details">
        <div class="adm-inq-detail-row">
          <span class="adm-inq-detail-label">Store URL</span>
          <a href="${escHtml(integration.store_url)}" target="_blank" class="adm-link">${escHtml(integration.store_url)}</a>
        </div>
        <div class="adm-inq-detail-row">
          <span class="adm-inq-detail-label">Last synced</span>
          ${integration.last_synced_at ? fmtDate(integration.last_synced_at) : 'Never'}
        </div>
      </div>
      <div class="adm-integration-actions">
        <button class="btn btn-sm btn-primary" id="adm-sync-btn">↻ Sync Now</button>
        <button class="btn btn-sm" style="background:rgba(255,80,80,0.1);border:1px solid rgba(255,80,80,0.2);color:#ff7070;" id="adm-disconnect-btn">Disconnect</button>
      </div>
      <div id="adm-sync-result" style="margin-top:0.75rem;font-size:0.82rem;color:var(--muted);"></div>`;

    document.getElementById('adm-sync-btn').addEventListener('click', () => syncStore(integration.id, clientId));
    document.getElementById('adm-disconnect-btn').addEventListener('click', () => disconnectStore(integration.id, clientId));
  }
}

async function connectStore(clientId, formData) {
  const errEl = document.getElementById('integration-error');
  errEl.textContent = '';

  const payload = {
    client_id:    clientId,
    platform:     formData.platform,
    store_url:    formData.store_url.trim().replace(/\/$/, ''),
    api_key:      formData.api_key      || null,
    api_secret:   formData.api_secret   || null,
    access_token: formData.access_token || null,
    store_hash:   formData.store_hash   || null,
  };

  const { data: integration, error } = await nexaSupabase
    .from('store_integrations').insert(payload).select('id').single();
  if (error) { errEl.textContent = error.message; return; }

  showToast('Store connected — syncing now…');
  await syncStore(integration.id, clientId);
}

async function syncStore(integrationId, clientId) {
  const resultEl = document.getElementById('adm-sync-result');
  const syncBtn  = document.getElementById('adm-sync-btn');
  if (syncBtn)   { syncBtn.disabled = true; syncBtn.textContent = 'Syncing…'; }
  if (resultEl)  resultEl.textContent = 'Fetching data from store…';

  try {
    const { data: { session } } = await nexaSupabase.auth.getSession();
    const res = await fetch(`${NEXALAB_SUPABASE_URL}/functions/v1/sync-store`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey':         NEXALAB_SUPABASE_KEY,
      },
      body: JSON.stringify({ integration_id: integrationId }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);

    showToast(`Synced ${result.synced_orders} orders across ${result.synced_days} days`);
    if (resultEl) resultEl.textContent = `Last sync: ${result.synced_orders} orders pulled · ${result.synced_days} days of data`;
    loadClientIntegrations(clientId);
  } catch (e) {
    showToast('Sync failed: ' + e.message, 'error');
    if (resultEl) resultEl.textContent = 'Sync failed: ' + e.message;
  } finally {
    if (syncBtn) { syncBtn.disabled = false; syncBtn.textContent = '↻ Sync Now'; }
  }
}

async function disconnectStore(integrationId, clientId) {
  if (!confirm('Disconnect this store? Synced data (orders + metrics) will be deleted.')) return;
  await nexaSupabase.from('store_integrations').delete().eq('id', integrationId);
  showToast('Store disconnected');
  loadClientIntegrations(clientId);
}

// ── Milestones ────────────────────────────────────────────
async function loadMilestones(projectId) {
  const msRes  = await nexaSupabase.from('milestones').select('*').eq('project_id', projectId).order('sort_order');
  const milestones = msRes.data ?? [];

  // Fetch tasks for all milestones
  let allTasks = [];
  if (milestones.length > 0) {
    const ids = milestones.map((m) => m.id);
    const { data } = await nexaSupabase.from('milestone_tasks').select('*').in('milestone_id', ids);
    allTasks = data ?? [];
  }
  milestones.forEach((m) => { m.tasks = allTasks.filter((t) => t.milestone_id === m.id); });

  // Show form wrap
  const formWrap = document.getElementById('milestone-form-wrap');
  if (formWrap) formWrap.hidden = false;

  const list = document.getElementById('milestones-list');
  if (!list) return;

  if (milestones.length === 0) {
    list.innerHTML = '<p class="adm-empty">No milestones yet. Add one below.</p>';
  } else {
    list.innerHTML = milestones.map((m, i) => `
      <div class="adm-milestone-card" data-ms-card="${m.id}">
        <div class="adm-milestone-header">
          <div class="adm-milestone-title-group">
            <span class="adm-milestone-num">M${i + 1}</span>
            <span class="adm-milestone-name">${escHtml(m.name)}</span>
            ${m.due_date ? `<span class="adm-milestone-due">· Due ${fmtDate(m.due_date)}</span>` : ''}
          </div>
          <div class="adm-milestone-controls">
            <select class="adm-select adm-inline-select" data-ms-status="${m.id}">
              <option value="pending"  ${m.status==='pending'  ?'selected':''}>Pending</option>
              <option value="active"   ${m.status==='active'   ?'selected':''}>Active</option>
              <option value="complete" ${m.status==='complete' ?'selected':''}>Complete</option>
            </select>
            <button class="adm-icon-btn" data-ms-edit-toggle="${m.id}" title="Edit milestone">✎</button>
            <button class="adm-icon-btn adm-icon-btn--danger" data-ms-delete="${m.id}" title="Delete milestone">✕</button>
          </div>
        </div>
        ${m.description ? `<p class="adm-milestone-desc">${escHtml(m.description)}</p>` : ''}

        <!-- Inline edit form (hidden by default) -->
        <div class="adm-inline-edit-wrap" id="ms-edit-${m.id}" hidden>
          <form class="adm-inline-edit-form" data-ms-edit="${m.id}">
            <div class="form-grid">
              <label class="form-field">Name *
                <input name="name" type="text" value="${escHtml(m.name)}" required />
              </label>
              <label class="form-field">Due date
                <input name="due_date" type="date" value="${m.due_date ? m.due_date.split('T')[0] : ''}" />
              </label>
            </div>
            <label class="form-field" style="margin-top:0.5rem;">Description
              <textarea name="description" rows="2">${escHtml(m.description || '')}</textarea>
            </label>
            <div class="adm-inline-edit-actions">
              <button class="btn btn-sm btn-primary" type="submit">Save</button>
              <button class="btn btn-sm btn-outline" type="button" data-ms-edit-cancel="${m.id}">Cancel</button>
            </div>
          </form>
        </div>

        <div class="adm-task-list">
          ${m.tasks.map((t) => `
            <div class="adm-task-row">
              <span class="adm-task-name">${escHtml(t.name)}</span>
              <div class="adm-task-controls">
                <select class="adm-select adm-inline-select adm-inline-select--sm" data-task-id="${t.id}">
                  <option value="pending" ${t.status==='pending'?'selected':''}>Pending</option>
                  <option value="active"  ${t.status==='active' ?'selected':''}>Active</option>
                  <option value="done"    ${t.status==='done'   ?'selected':''}>Done</option>
                </select>
                <button class="adm-icon-btn adm-icon-btn--danger adm-icon-btn--xs" data-task-delete="${t.id}" title="Delete task">✕</button>
              </div>
            </div>`).join('')}
          <form class="adm-add-task-form" data-ms-id="${m.id}">
            <input type="text" name="task_name" placeholder="Add sub-task…" class="adm-inline-input" />
            <button class="btn btn-sm btn-outline" type="submit">+ Add</button>
          </form>
        </div>
      </div>`).join('');

    // Milestone status changes
    list.querySelectorAll('[data-ms-status]').forEach((sel) => {
      sel.addEventListener('change', async () => {
        const { error } = await nexaSupabase.from('milestones').update({ status: sel.value }).eq('id', sel.dataset.msStatus);
        if (error) showToast('Failed to update', 'error');
        else showToast('Milestone updated');
      });
    });

    // Toggle edit form
    list.querySelectorAll('[data-ms-edit-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const wrap = document.getElementById(`ms-edit-${btn.dataset.msEditToggle}`);
        if (wrap) wrap.hidden = !wrap.hidden;
      });
    });

    // Cancel edit form
    list.querySelectorAll('[data-ms-edit-cancel]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const wrap = document.getElementById(`ms-edit-${btn.dataset.msEditCancel}`);
        if (wrap) wrap.hidden = true;
      });
    });

    // Submit edit form
    list.querySelectorAll('[data-ms-edit]').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        const { error } = await nexaSupabase.from('milestones').update({
          name: data.name,
          description: data.description || null,
          due_date: data.due_date || null,
        }).eq('id', form.dataset.msEdit);
        if (error) { showToast('Failed to update milestone', 'error'); return; }
        showToast('Milestone updated');
        loadMilestones(projectId);
      });
    });

    // Delete milestone
    list.querySelectorAll('[data-ms-delete]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this milestone and all its sub-tasks?')) return;
        const { error } = await nexaSupabase.from('milestones').delete().eq('id', btn.dataset.msDelete);
        if (error) { showToast('Failed to delete', 'error'); return; }
        showToast('Milestone deleted');
        loadMilestones(projectId);
      });
    });

    // Task status changes
    list.querySelectorAll('[data-task-id]').forEach((sel) => {
      sel.addEventListener('change', async () => {
        const { error } = await nexaSupabase.from('milestone_tasks').update({ status: sel.value }).eq('id', sel.dataset.taskId);
        if (error) showToast('Failed to update', 'error');
        else showToast('Task updated');
      });
    });

    // Delete task
    list.querySelectorAll('[data-task-delete]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const { error } = await nexaSupabase.from('milestone_tasks').delete().eq('id', btn.dataset.taskDelete);
        if (error) { showToast('Failed to delete task', 'error'); return; }
        showToast('Task deleted');
        loadMilestones(projectId);
      });
    });

    // Add-task forms
    list.querySelectorAll('.adm-add-task-form').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = form.task_name.value.trim();
        if (!name) return;
        const { error } = await nexaSupabase.from('milestone_tasks').insert({
          milestone_id: form.dataset.msId, name, sort_order: 99,
        });
        if (error) { showToast('Failed to add task', 'error'); return; }
        showToast('Task added');
        form.reset();
        loadMilestones(projectId);
      });
    });
  }

  // Add-milestone form
  const msForm = document.getElementById('adm-milestone-form');
  if (msForm) {
    msForm.onsubmit = async (e) => {
      e.preventDefault();
      const data  = Object.fromEntries(new FormData(e.target));
      const errEl = document.getElementById('milestone-error');
      const { error } = await nexaSupabase.from('milestones').insert({
        project_id: projectId, name: data.name,
        description: data.description || null,
        status: data.status, due_date: data.due_date || null,
        sort_order: milestones.length,
      });
      if (error) { errEl.textContent = error.message; return; }
      errEl.textContent = '';
      msForm.reset();
      showToast('Milestone added');
      loadMilestones(projectId);
    };
  }
}

// ── Deliverables ──────────────────────────────────────────
async function loadDeliverables(projectId) {
  const { data: deliverables = [] } = await nexaSupabase
    .from('deliverables').select('*').eq('project_id', projectId).order('created_at');

  const formWrap = document.getElementById('deliverable-form-wrap');
  if (formWrap) formWrap.hidden = false;

  const list = document.getElementById('deliverables-list');
  if (!list) return;

  if (deliverables.length === 0) {
    list.innerHTML = '<p class="adm-empty">No deliverables yet. Add one below.</p>';
  } else {
    const typeColors = { doc: 'adm-dlv-type--doc', code: 'adm-dlv-type--code', link: 'adm-dlv-type--link' };
    list.innerHTML = `<div class="adm-dlv-admin-list">${deliverables.map((d) => `
      <div class="adm-dlv-row">
        <div class="adm-dlv-info">
          <span class="adm-dlv-type ${typeColors[d.type] || ''}">${d.type}</span>
          <span class="adm-dlv-name">${escHtml(d.name)}</span>
          ${d.meta ? `<span class="adm-dlv-meta">${escHtml(d.meta)}</span>` : ''}
          ${d.url ? `<a href="${escHtml(d.url)}" target="_blank" rel="noopener" class="adm-link adm-dlv-url">↗ Open</a>` : ''}
          ${d.due_date ? `<span class="adm-dlv-meta">Due ${fmtDate(d.due_date)}</span>` : ''}
        </div>
        <div class="adm-dlv-controls">
          <select class="adm-select adm-inline-select adm-inline-select--sm" data-dlv-status="${d.id}">
            <option value="upcoming" ${d.status==='upcoming'?'selected':''}>Upcoming</option>
            <option value="ready"    ${d.status==='ready'   ?'selected':''}>Ready</option>
          </select>
          <button class="adm-icon-btn" data-dlv-edit-toggle="${d.id}" title="Edit deliverable">✎</button>
          <button class="adm-icon-btn adm-icon-btn--danger" data-dlv-delete="${d.id}" title="Delete deliverable">✕</button>
        </div>
      </div>
      <!-- Inline edit form -->
      <div class="adm-inline-edit-wrap adm-dlv-edit-wrap" id="dlv-edit-${d.id}" hidden>
        <form class="adm-inline-edit-form" data-dlv-edit="${d.id}">
          <div class="form-grid">
            <label class="form-field">Name *
              <input name="name" type="text" value="${escHtml(d.name)}" required />
            </label>
            <label class="form-field">Type
              <select name="type">
                <option value="doc"  ${d.type==='doc'  ?'selected':''}>Document</option>
                <option value="code" ${d.type==='code' ?'selected':''}>Code</option>
                <option value="link" ${d.type==='link' ?'selected':''}>Link</option>
              </select>
            </label>
            <label class="form-field">URL
              <input name="url" type="url" value="${escHtml(d.url || '')}" placeholder="https://…" />
            </label>
            <label class="form-field">Meta
              <input name="meta" type="text" value="${escHtml(d.meta || '')}" placeholder='e.g. "PDF · 12 pages"' />
            </label>
            <label class="form-field">Due date
              <input name="due_date" type="date" value="${d.due_date ? d.due_date.split('T')[0] : ''}" />
            </label>
          </div>
          <div class="adm-inline-edit-actions">
            <button class="btn btn-sm btn-primary" type="submit">Save</button>
            <button class="btn btn-sm btn-outline" type="button" data-dlv-edit-cancel="${d.id}">Cancel</button>
          </div>
        </form>
      </div>`).join('')}</div>`;

    // Status change
    list.querySelectorAll('[data-dlv-status]').forEach((sel) => {
      sel.addEventListener('change', async () => {
        const updates = { status: sel.value };
        if (sel.value === 'ready') updates.delivered_at = new Date().toISOString().split('T')[0];
        const { error } = await nexaSupabase.from('deliverables').update(updates).eq('id', sel.dataset.dlvStatus);
        if (error) showToast('Failed to update', 'error');
        else showToast('Deliverable updated');
      });
    });

    // Toggle edit form
    list.querySelectorAll('[data-dlv-edit-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const wrap = document.getElementById(`dlv-edit-${btn.dataset.dlvEditToggle}`);
        if (wrap) wrap.hidden = !wrap.hidden;
      });
    });

    // Cancel edit form
    list.querySelectorAll('[data-dlv-edit-cancel]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const wrap = document.getElementById(`dlv-edit-${btn.dataset.dlvEditCancel}`);
        if (wrap) wrap.hidden = true;
      });
    });

    // Submit edit form
    list.querySelectorAll('[data-dlv-edit]').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        const { error } = await nexaSupabase.from('deliverables').update({
          name:     data.name,
          type:     data.type,
          url:      data.url      || null,
          meta:     data.meta     || null,
          due_date: data.due_date || null,
        }).eq('id', form.dataset.dlvEdit);
        if (error) { showToast('Failed to update deliverable', 'error'); return; }
        showToast('Deliverable updated');
        loadDeliverables(projectId);
      });
    });

    // Delete deliverable
    list.querySelectorAll('[data-dlv-delete]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this deliverable?')) return;
        const { error } = await nexaSupabase.from('deliverables').delete().eq('id', btn.dataset.dlvDelete);
        if (error) { showToast('Failed to delete', 'error'); return; }
        showToast('Deliverable deleted');
        loadDeliverables(projectId);
      });
    });
  }

  const dlvForm = document.getElementById('adm-deliverable-form');
  if (dlvForm) {
    dlvForm.onsubmit = async (e) => {
      e.preventDefault();
      const data  = Object.fromEntries(new FormData(e.target));
      const errEl = document.getElementById('deliverable-error');
      const { error } = await nexaSupabase.from('deliverables').insert({
        project_id: projectId, name: data.name, type: data.type,
        url: data.url || null, meta: data.meta || null, status: data.status,
        due_date: data.due_date || null, delivered_at: data.delivered_at || null,
      });
      if (error) { errEl.textContent = error.message; return; }
      errEl.textContent = '';
      dlvForm.reset();
      showToast('Deliverable added');
      loadDeliverables(projectId);
    };
  }
}

// ── Activity ──────────────────────────────────────────────
async function loadActivityAdmin(projectId) {
  const { data: entries = [] } = await nexaSupabase
    .from('activity').select('*').eq('project_id', projectId)
    .order('created_at', { ascending: false }).limit(20);

  const formWrap = document.getElementById('activity-form-wrap');
  if (formWrap) formWrap.hidden = false;

  const list = document.getElementById('activity-list-admin');
  if (!list) return;

  list.innerHTML = entries.length === 0
    ? '<p class="adm-empty">No activity logged yet. Add an entry below.</p>'
    : `<ul class="activity-list">${entries.map((a) => `
        <li class="activity-item">
          <span class="activity-dot activity-dot--${a.color || 'gray'}"></span>
          <div>
            <p class="activity-text">${escHtml(a.text)}</p>
            <p class="activity-time">${timeAgo(a.created_at)}</p>
          </div>
        </li>`).join('')}</ul>`;

  const actForm = document.getElementById('adm-activity-form');
  if (actForm) {
    actForm.onsubmit = async (e) => {
      e.preventDefault();
      const data  = Object.fromEntries(new FormData(e.target));
      const errEl = document.getElementById('activity-error');
      const { error } = await nexaSupabase.from('activity').insert({
        project_id: projectId, text: data.text, color: data.color,
      });
      if (error) { errEl.textContent = error.message; return; }
      errEl.textContent = '';
      actForm.reset();
      showToast('Activity logged');
      loadActivityAdmin(projectId);
    };
  }
}

// ── Lead ──────────────────────────────────────────────────
async function loadLead(projectId) {
  const { data: lead } = await nexaSupabase
    .from('leads').select('*').eq('project_id', projectId).limit(1).maybeSingle();
  _state.leadId = lead?.id || null;

  const form = document.getElementById('adm-lead-form');
  if (!form) return;

  if (lead) {
    form.name.value          = lead.name          || '';
    form.role.value          = lead.role          || '';
    form.initials.value      = lead.initials      || '';
    form.time_zone.value     = lead.time_zone     || '';
    form.response_time.value = lead.response_time || '';
    form.next_checkin.value  = lead.next_checkin
      ? new Date(lead.next_checkin).toISOString().slice(0, 16) : '';
  }

  form.onsubmit = async (e) => {
    e.preventDefault();
    const data  = Object.fromEntries(new FormData(e.target));
    const errEl = document.getElementById('lead-error');
    const payload = {
      project_id:    projectId,
      name:          data.name,
      role:          data.role          || 'Commerce Engineer',
      initials:      data.initials.toUpperCase(),
      time_zone:     data.time_zone     || 'EST (UTC -5)',
      response_time: data.response_time || 'Same day',
      next_checkin:  data.next_checkin  || null,
    };
    let error;
    if (_state.leadId) {
      ({ error } = await nexaSupabase.from('leads').update(payload).eq('id', _state.leadId));
    } else {
      const res = await nexaSupabase.from('leads').insert(payload).select().single();
      error = res.error;
      if (!error) _state.leadId = res.data.id;
    }
    if (error) { errEl.textContent = error.message; return; }
    errEl.textContent = '';
    showToast('Account lead saved');
  };
}

// ── Client Profile ────────────────────────────────────────
async function loadClientProfile(clientId) {
  const { data: client } = await nexaSupabase
    .from('profiles').select('*').eq('id', clientId).single();

  const form = document.getElementById('adm-profile-form');
  if (!form || !client) return;

  form.full_name.value       = client.full_name       || '';
  form.company.value         = client.company         || '';
  form.email.value           = client.email           || '';
  form.avatar_initials.value = client.avatar_initials || '';
  form.role.value            = client.role            || 'client';

  form.onsubmit = async (e) => {
    e.preventDefault();
    const data  = Object.fromEntries(new FormData(e.target));
    const errEl = document.getElementById('profile-error');
    errEl.textContent = '';

    const { error } = await nexaSupabase.from('profiles').update({
      full_name:       data.full_name,
      company:         data.company         || null,
      email:           data.email           || null,
      avatar_initials: (data.avatar_initials || '').toUpperCase() || null,
      role:            data.role,
    }).eq('id', clientId);

    if (error) { errEl.textContent = error.message; return; }
    showToast('Profile updated');
    // Refresh the detail header
    document.getElementById('adm-detail-name').textContent = data.full_name || 'Unnamed';
    document.getElementById('adm-detail-sub').textContent  =
      [data.company, data.email].filter(Boolean).join(' · ');
  };
}

// ── All tickets (two-pane) ────────────────────────────────
async function loadAllTickets(status = '') {
  let q = nexaSupabase
    .from('tickets')
    .select('id, title, ticket_ref, category, status, created_at, client_id, project_id, description')
    .order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data: tickets = [] } = await q;

  // Fetch client names in parallel
  let profileMap = {};
  if (tickets.length > 0) {
    const clientIds = [...new Set(tickets.map((t) => t.client_id))];
    const { data: pData = [] } = await nexaSupabase.from('profiles')
      .select('id, full_name, email').in('id', clientIds);
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
      const tkt = tickets.find((t) => t.id === item.dataset.tixIdx);
      const client = profileMap[tkt?.client_id] || {};
      if (tkt) openAdminTicketThread(tkt, client);
    });
  });
}

async function openAdminTicketThread(ticket, client) {
  const placeholder  = document.getElementById('adm-thread-placeholder');
  const threadContent = document.getElementById('adm-thread-content');
  if (placeholder)   placeholder.hidden = true;
  if (threadContent) threadContent.hidden = false;

  // Header
  const titleEl  = document.getElementById('adm-thread-title');
  const metaEl   = document.getElementById('adm-thread-meta');
  const statusSel = document.getElementById('adm-thread-status');
  if (titleEl)  titleEl.textContent = `${ticket.ticket_ref || '#—'} · ${ticket.title}`;
  if (metaEl)   metaEl.textContent  = `${client.full_name || '—'} · ${ticket.category || 'General'} · Opened ${timeAgo(ticket.created_at)}`;
  if (statusSel) statusSel.value    = ticket.status;

  // Status change
  if (statusSel) {
    statusSel.onchange = async () => {
      const { error } = await nexaSupabase.from('tickets').update({ status: statusSel.value }).eq('id', ticket.id);
      if (error) showToast('Failed to update', 'error');
      else { showToast('Status updated'); ticket.status = statusSel.value; }
    };
  }

  // Load replies
  await loadAdminTicketReplies(ticket);

  // Reply form
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
      if (error) {
        if (replyErr) replyErr.textContent = 'Could not send reply.';
        return;
      }

      // Auto move to in-progress if still open
      if (ticket.status === 'open') {
        await nexaSupabase.from('tickets').update({ status: 'in-progress' }).eq('id', ticket.id);
        if (statusSel) statusSel.value = 'in-progress';
        ticket.status = 'in-progress';
      }

      replyForm.reset();
      await loadAdminTicketReplies(ticket);

      // Email client
      await sendNotificationAdmin('ticket_reply_client', client.email, {
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
    .from('ticket_replies')
    .select('*')
    .eq('ticket_id', ticket.id)
    .order('created_at', { ascending: true });

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
