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
  const titles    = { overview: 'Overview', inquiries: 'Inquiries', clients: 'Clients', tickets: 'Tickets' };
  const loaded    = {};

  function activateSection(key) {
    navItems.forEach((n) => n.classList.toggle('is-active', n.dataset.section === key));
    sections.forEach((s) => { s.hidden = s.id !== `section-${key}`; });
    if (pageTitle) pageTitle.textContent = titles[key] || key;
    if (!loaded[key]) {
      loaded[key] = true;
      if (key === 'overview')  loadOverview();
      if (key === 'inquiries') loadInquiries();
      if (key === 'clients')   loadClients();
      if (key === 'tickets')   loadAllTickets();
    }
  }

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
    document.getElementById('clients-grid-view').hidden  = false;
    document.getElementById('clients-detail-view').hidden = true;
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
              <select class="adm-select adm-inline-select" data-inq-status="${r.id}">
                <option value="new"       ${r.status==='new'       ?'selected':''}>New</option>
                <option value="contacted" ${r.status==='contacted' ?'selected':''}>Contacted</option>
                <option value="converted" ${r.status==='converted' ?'selected':''}>Converted</option>
                <option value="closed"    ${r.status==='closed'    ?'selected':''}>Closed</option>
              </select>
            </td>
            <td class="adm-td">
              <button class="adm-expand-btn" data-inq-id="${r.id}">View goal</button>
            </td>
          </tr>
          <tr class="adm-goal-row" id="goal-${r.id}" hidden>
            <td colspan="9" class="adm-goal-cell"><strong>Goal:</strong> ${escHtml(r.goal)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  wrap.querySelectorAll('[data-inq-status]').forEach((sel) => {
    sel.addEventListener('change', async () => {
      const { error } = await nexaSupabase.from('inquiries').update({ status: sel.value }).eq('id', sel.dataset.inqStatus);
      if (error) showToast('Failed to update status', 'error');
      else showToast('Status updated');
    });
  });

  wrap.querySelectorAll('.adm-expand-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id      = btn.dataset.inqId;
      const goalRow = document.getElementById(`goal-${id}`);
      if (goalRow) {
        goalRow.hidden  = !goalRow.hidden;
        btn.textContent = goalRow.hidden ? 'View goal' : 'Hide';
      }
    });
  });
}

// ── Clients ───────────────────────────────────────────────
async function loadClients() {
  const [profilesRes, projRes] = await Promise.all([
    nexaSupabase.from('profiles').select('*').neq('role', 'admin').order('created_at', { ascending: false }),
    nexaSupabase.from('projects').select('client_id, status'),
  ]);

  const clients  = profilesRes.data ?? [];
  const projects = projRes.data     ?? [];
  const countMap = {};
  projects.forEach((p) => { countMap[p.client_id] = (countMap[p.client_id] || 0) + 1; });

  const grid = document.getElementById('adm-client-grid');
  if (!grid) return;

  if (clients.length === 0) {
    grid.innerHTML = '<p class="adm-empty">No clients have signed up yet.</p>';
    return;
  }

  grid.innerHTML = clients.map((c) => {
    const ini   = c.avatar_initials || c.full_name?.split(' ').map((n) => n[0]).join('').slice(0,2).toUpperCase() || '?';
    const count = countMap[c.id] || 0;
    return `
      <div class="adm-client-card" data-client-id="${c.id}">
        <div class="adm-client-avatar">${escHtml(ini)}</div>
        <div class="adm-client-info">
          <p class="adm-client-name">${escHtml(c.full_name || 'Unnamed')}</p>
          <p class="adm-client-meta">${escHtml([c.company, c.email].filter(Boolean).join(' · '))}</p>
          <p class="adm-client-proj">${count} project${count !== 1 ? 's' : ''}</p>
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

  document.getElementById('clients-grid-view').hidden  = true;
  document.getElementById('clients-detail-view').hidden = false;
  document.getElementById('adm-detail-name').textContent = client.full_name || 'Unnamed';
  document.getElementById('adm-detail-sub').textContent  = [client.company, client.email].filter(Boolean).join(' · ');
  document.getElementById('clients-detail-view').scrollIntoView({ behavior: 'smooth', block: 'start' });

  switchProjectTab('project');
  await loadClientProject(client.id);
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
              <option value="active"   ${project?.status==='active'   ?'selected':''}>Active</option>
              <option value="paused"   ${project?.status==='paused'   ?'selected':''}>Paused</option>
              <option value="complete" ${project?.status==='complete' ?'selected':''}>Complete</option>
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

function switchProjectTab(tab) {
  document.querySelectorAll('.adm-tab').forEach((t) => t.classList.toggle('is-active', t.dataset.tab === tab));
  document.querySelectorAll('.adm-tab-pane').forEach((p) => { p.hidden = p.id !== `tab-${tab}`; });

  if (tab === 'profile') { if (_state.clientId) loadClientProfile(_state.clientId); return; }
  if (!_state.projectId) return;
  if (tab === 'milestones')   loadMilestones(_state.projectId);
  if (tab === 'deliverables') loadDeliverables(_state.projectId);
  if (tab === 'activity')     loadActivityAdmin(_state.projectId);
  if (tab === 'lead')         loadLead(_state.projectId);
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

// ── All tickets ───────────────────────────────────────────
async function loadAllTickets(status = '') {
  let q = nexaSupabase
    .from('tickets')
    .select('id, title, ticket_ref, category, status, created_at, client_id, project_id, description')
    .order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data: tickets = [] } = await q;

  // Fetch client names and project names in parallel
  let profileMap = {}, projectMap = {};
  if (tickets.length > 0) {
    const clientIds  = [...new Set(tickets.map((t) => t.client_id))];
    const projectIds = [...new Set(tickets.map((t) => t.project_id))];
    const [pRes, prRes] = await Promise.all([
      nexaSupabase.from('profiles').select('id, full_name, company').in('id', clientIds),
      nexaSupabase.from('projects').select('id, name').in('id', projectIds),
    ]);
    (pRes.data  ?? []).forEach((p) => { profileMap[p.id] = p; });
    (prRes.data ?? []).forEach((p) => { projectMap[p.id] = p; });
  }

  const wrap = document.getElementById('adm-ticket-table');
  if (!wrap) return;

  if (tickets.length === 0) {
    wrap.innerHTML = '<p class="adm-empty" style="padding:1rem 0;">No tickets found.</p>';
    return;
  }

  wrap.innerHTML = `
    <div class="adm-table-wrap">
      <table class="adm-table">
        <thead>
          <tr><th>Ref</th><th>Title</th><th>Client</th><th>Project</th><th>Category</th><th>Opened</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${tickets.map((t) => `
          <tr class="adm-tr">
            <td class="adm-td adm-td--ref">${escHtml(t.ticket_ref || '#—')}</td>
            <td class="adm-td adm-td--name">${escHtml(t.title)}</td>
            <td class="adm-td">${escHtml(profileMap[t.client_id]?.full_name || '—')}</td>
            <td class="adm-td">${escHtml(projectMap[t.project_id]?.name || '—')}</td>
            <td class="adm-td">${escHtml(t.category || '—')}</td>
            <td class="adm-td adm-td--date">${fmtDate(t.created_at)}</td>
            <td class="adm-td">
              <select class="adm-select adm-inline-select" data-tix-id="${t.id}">
                <option value="open"        ${t.status==='open'        ?'selected':''}>Open</option>
                <option value="in-progress" ${t.status==='in-progress' ?'selected':''}>In progress</option>
                <option value="resolved"    ${t.status==='resolved'    ?'selected':''}>Resolved</option>
              </select>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  wrap.querySelectorAll('[data-tix-id]').forEach((sel) => {
    sel.addEventListener('change', async () => {
      const { error } = await nexaSupabase.from('tickets').update({ status: sel.value }).eq('id', sel.dataset.tixId);
      if (error) showToast('Failed to update', 'error');
      else showToast('Ticket updated');
    });
  });
}
