// NexaLab Client Portal — dashboard interactions + Supabase data loading

(async function dashboardApp() {

  // ── 1. Auth guard ─────────────────────────────────────
  const { data: { session } } = await nexaSupabase.auth.getSession();
  if (!session) {
    window.location.href = 'auth.html';
    return;
  }
  const userId = session.user.id;

  // ── 2. Date display ───────────────────────────────────
  const dateEl = document.getElementById('dash-date');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  // ── 3. Logout ─────────────────────────────────────────
  const logoutBtn = document.getElementById('dash-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await nexaSupabase.auth.signOut();
      window.location.href = 'auth.html';
    });
  }

  // ── 4. Load profile ───────────────────────────────────
  const { data: profile } = await nexaSupabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profile) {
    const firstName = (profile.full_name || session.user.email).split(' ')[0];
    const initials  = profile.full_name
      ? profile.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
      : session.user.email[0].toUpperCase();

    document.getElementById('dash-client-name')?.textContent && (document.getElementById('dash-client-name').textContent = profile.full_name || session.user.email);
    document.getElementById('dash-client-company')?.textContent && (document.getElementById('dash-client-company').textContent = profile.company || 'NexaLab Client');
    document.getElementById('dash-first-name')?.textContent && (document.getElementById('dash-first-name').textContent = firstName);
    const avatarEls = document.querySelectorAll('.dash-avatar, .dash-avatar-sm');
    avatarEls.forEach((el) => { el.textContent = initials; });
  }

  // ── 5. Load project + all related data ───────────────
  const { data: project } = await nexaSupabase
    .from('projects')
    .select('*')
    .eq('client_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!project) {
    renderSetupState();
    initStaticInteractions();
    return;
  }

  // Update page title with project name
  const planEl = document.getElementById('dash-project-plan');
  if (planEl) planEl.textContent = project.plan || project.name;

  // Load all data in parallel
  const [milestonesRes, tasksAllRes, deliverablesRes, ticketsRes, activityRes, leadRes] =
    await Promise.all([
      nexaSupabase.from('milestones').select('*').eq('project_id', project.id).order('sort_order'),
      nexaSupabase.from('milestone_tasks').select('*, milestone_id').in(
        'milestone_id',
        (await nexaSupabase.from('milestones').select('id').eq('project_id', project.id)).data?.map((m) => m.id) ?? [],
      ),
      nexaSupabase.from('deliverables').select('*').eq('project_id', project.id).order('created_at'),
      nexaSupabase.from('tickets').select('*').eq('project_id', project.id).order('created_at', { ascending: false }),
      nexaSupabase.from('activity').select('*').eq('project_id', project.id).order('created_at', { ascending: false }).limit(6),
      nexaSupabase.from('leads').select('*').eq('project_id', project.id).limit(1).maybeSingle(),
    ]);

  const milestones   = milestonesRes.data   ?? [];
  const allTasks     = tasksAllRes.data     ?? [];
  const deliverables = deliverablesRes.data ?? [];
  const tickets      = ticketsRes.data      ?? [];
  const activity     = activityRes.data     ?? [];
  const lead         = leadRes.data;

  // Attach tasks to their milestones
  milestones.forEach((m) => {
    m.tasks = allTasks.filter((t) => t.milestone_id === m.id);
  });

  // ── 6. Render sections ────────────────────────────────
  renderOverview(project, milestones, deliverables, tickets, activity);
  renderProject(project, milestones);
  renderDeliverables(deliverables);
  renderAnalytics(project);
  renderSupport(tickets, lead);

  // ── 7. Static interactions ────────────────────────────
  initStaticInteractions();

})();

// ── Render: Overview ─────────────────────────────────────

function renderOverview(project, milestones, deliverables, tickets, activity) {
  const startDate   = project.started_at ? new Date(project.started_at) : new Date();
  const daysActive  = Math.floor((Date.now() - startDate.getTime()) / 86400000);
  const complete    = milestones.filter((m) => m.status === 'complete').length;
  const dlvReady    = deliverables.filter((d) => d.status === 'ready').length;
  const openTickets = tickets.filter((t) => t.status !== 'resolved').length;

  // Stat cards
  const statsGrid = document.getElementById('dash-stats-grid');
  if (statsGrid) {
    statsGrid.innerHTML = `
      <div class="dash-stat-card">
        <p class="dash-stat-label">Days active</p>
        <p class="dash-stat-val">${daysActive}</p>
        <p class="dash-stat-sub">since ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
      </div>
      <div class="dash-stat-card">
        <p class="dash-stat-label">Milestones complete</p>
        <p class="dash-stat-val">${complete} <span class="dash-stat-of">/ ${milestones.length}</span></p>
        <div class="progress-bar"><div class="progress-fill" style="width:${milestones.length ? Math.round((complete / milestones.length) * 100) : 0}%"></div></div>
      </div>
      <div class="dash-stat-card">
        <p class="dash-stat-label">Deliverables ready</p>
        <p class="dash-stat-val">${dlvReady} <span class="dash-stat-of">/ ${deliverables.length}</span></p>
        <div class="progress-bar"><div class="progress-fill" style="width:${deliverables.length ? Math.round((dlvReady / deliverables.length) * 100) : 0}%"></div></div>
      </div>
      <div class="dash-stat-card">
        <p class="dash-stat-label">Open tickets</p>
        <p class="dash-stat-val">${openTickets}</p>
        <p class="dash-stat-sub ${openTickets > 0 ? 'dash-stat-warn' : 'dash-stat-green'}">${openTickets > 0 ? 'Awaiting review' : 'All clear'}</p>
      </div>`;
  }

  // Activity list
  const activityList = document.getElementById('activity-list');
  if (activityList) {
    if (activity.length === 0) {
      activityList.innerHTML = '<li class="activity-item" style="color:var(--muted);font-size:0.82rem;">No activity yet.</li>';
    } else {
      activityList.innerHTML = activity.map((a) => `
        <li class="activity-item">
          <span class="activity-dot activity-dot--${a.color || 'gray'}"></span>
          <div>
            <p class="activity-text">${escHtml(a.text)}</p>
            <p class="activity-time">${timeAgo(a.created_at)}</p>
          </div>
        </li>`).join('');
    }
  }

  // Next milestone
  const nextM = milestones.find((m) => m.status === 'active') || milestones.find((m) => m.status === 'pending');
  const nextWrap = document.getElementById('next-milestone-wrap');
  if (nextWrap) {
    if (!nextM) {
      nextWrap.innerHTML = `<p style="font-size:0.85rem;color:var(--muted);">All milestones complete — great work!</p>`;
    } else {
      const tasks     = nextM.tasks || [];
      const doneTasks = tasks.filter((t) => t.status === 'done').length;
      const pct       = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;
      const dueStr    = nextM.due_date ? new Date(nextM.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD';
      const idx       = milestones.indexOf(nextM) + 1;

      nextWrap.innerHTML = `
        <div class="next-milestone-card">
          <div class="milestone-header">
            <span class="milestone-tag">Milestone ${idx}</span>
            <span class="milestone-due">Due ${dueStr}</span>
          </div>
          <p class="milestone-name">${escHtml(nextM.name)}</p>
          ${nextM.description ? `<p class="milestone-desc">${escHtml(nextM.description)}</p>` : ''}
          <div class="milestone-progress">
            <div class="milestone-progress-bar"><div class="milestone-progress-fill" style="width:${pct}%"></div></div>
            <span class="milestone-progress-pct">${pct}%</span>
          </div>
          ${tasks.length ? `
          <div class="milestone-tasks">
            <p class="milestone-tasks-label">Sub-tasks</p>
            <ul class="milestone-task-list">
              ${tasks.map((t) => `<li class="mtask ${t.status}">${escHtml(t.name)}</li>`).join('')}
            </ul>
          </div>` : ''}
        </div>`;
    }
  }
}

// ── Render: Project timeline ──────────────────────────────

function renderProject(project, milestones) {
  const list = document.getElementById('timeline-list');
  if (!list) return;

  if (milestones.length === 0) {
    list.innerHTML = '<p style="font-size:0.85rem;color:var(--muted);">Milestones will appear here once your project is set up.</p>';
    return;
  }

  const planEl = document.getElementById('dash-project-plan');
  if (planEl) planEl.textContent = project.plan || project.name;

  list.innerHTML = milestones.map((m, i) => {
    const stateClass = m.status === 'complete' ? 'tl-done' : m.status === 'active' ? 'tl-active' : '';
    const badge = m.status === 'complete'
      ? '<span class="tl-badge tl-badge--done">Complete</span>'
      : m.status === 'active'
        ? '<span class="tl-badge tl-badge--active">In Progress</span>'
        : '<span class="tl-badge tl-badge--pending">Upcoming</span>';
    const dueStr = m.due_date ? new Date(m.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    return `
      <div class="tl-item ${stateClass}">
        <div class="tl-marker"></div>
        <div class="tl-content">
          <div class="tl-head">
            <span class="tl-name">Milestone ${i + 1} — ${escHtml(m.name)}</span>
            ${dueStr ? `<span class="tl-date">${dueStr}</span>` : ''}
          </div>
          ${m.description ? `<p class="tl-desc">${escHtml(m.description)}</p>` : ''}
          ${badge}
        </div>
      </div>`;
  }).join('');
}

// ── Render: Deliverables ──────────────────────────────────

function renderDeliverables(deliverables) {
  const list     = document.getElementById('dlv-list');
  const countEl  = document.getElementById('dlv-count');
  if (!list) return;

  const ready    = deliverables.filter((d) => d.status === 'ready');
  const upcoming = deliverables.filter((d) => d.status !== 'ready');

  if (countEl) countEl.textContent = `${ready.length} ready · ${upcoming.length} upcoming`;

  if (deliverables.length === 0) {
    list.innerHTML = '<p style="font-size:0.85rem;color:var(--muted);">Deliverables will appear here as they are completed.</p>';
    return;
  }

  const iconMap = { doc: 'dlv-icon--doc', code: 'dlv-icon--code', link: 'dlv-icon--link' };
  const svgMap  = {
    doc:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.7"/><polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1.7"/></svg>',
    code: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polyline points="16 18 22 12 16 6" stroke="currentColor" stroke-width="1.7"/><polyline points="8 6 2 12 8 18" stroke="currentColor" stroke-width="1.7"/></svg>',
    link: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  };
  const pendSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.7"/><polyline points="12 6 12 12 16 14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';

  list.innerHTML = deliverables.map((d) => {
    const isReady = d.status === 'ready';
    const type    = d.type || 'doc';
    const btnLabel = type === 'link' ? 'Open' : type === 'code' ? 'View repo' : 'Download';
    const dateStr  = isReady && d.delivered_at
      ? new Date(d.delivered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : d.due_date ? `Due ${new Date(d.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : '';

    return `
      <div class="dlv-item ${isReady ? 'dlv-ready' : 'dlv-upcoming'}" data-url="${escAttr(d.url || '')}">
        <div class="dlv-icon ${isReady ? (iconMap[type] || 'dlv-icon--doc') : 'dlv-icon--pending'}">
          ${isReady ? (svgMap[type] || svgMap.doc) : pendSvg}
        </div>
        <div class="dlv-info">
          <p class="dlv-name">${escHtml(d.name)}</p>
          <p class="dlv-meta">${escHtml(d.meta || '')}${d.meta && dateStr ? ' · ' : ''}${dateStr}</p>
        </div>
        ${isReady
          ? `<button class="dlv-dl-btn" data-url="${escAttr(d.url || '')}" data-label="${escAttr(btnLabel)}">${escHtml(btnLabel)}</button>`
          : `<span class="dlv-upcoming-badge">Upcoming</span>`}
      </div>`;
  }).join('');

  // Download buttons
  list.querySelectorAll('.dlv-dl-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.url;
      if (url) { window.open(url, '_blank'); return; }
      const orig = btn.textContent;
      btn.textContent = '✓ No link yet';
      setTimeout(() => { btn.textContent = orig; }, 1800);
    });
  });
}

// ── Render: Analytics ─────────────────────────────────────

function renderAnalytics(project) {
  // Analytics data comes from real tools in production.
  // For now show a placeholder message.
  const analyticsNote = document.getElementById('analytics-note');
  if (analyticsNote) {
    analyticsNote.textContent = `Analytics for "${project.name}" will be available once your storefront goes live.`;
  }
}

// ── Render: Support ───────────────────────────────────────

function renderSupport(tickets, lead) {
  const ticketList = document.getElementById('ticket-list');
  const openCount  = document.getElementById('ticket-open-count');
  const openTickets = tickets.filter((t) => t.status !== 'resolved');

  if (openCount) openCount.textContent = openTickets.length || '';

  if (ticketList) {
    if (openTickets.length === 0) {
      ticketList.innerHTML = '<p style="font-size:0.85rem;color:var(--muted);margin-top:0.8rem;">No open tickets — all clear.</p>';
    } else {
      ticketList.innerHTML = openTickets.map((t) => `
        <div class="ticket-item ticket-review">
          <div class="ticket-top">
            <span class="ticket-id">${escHtml(t.ticket_ref || '#—')}</span>
            <span class="ticket-status ticket-status--review">${escHtml(statusLabel(t.status))}</span>
          </div>
          <p class="ticket-title">${escHtml(t.title)}</p>
          <p class="ticket-meta">Opened ${timeAgo(t.created_at)}${t.category ? ' · ' + escHtml(t.category) : ''}</p>
        </div>`).join('');
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

// ── Render: Empty / setup state ───────────────────────────

function renderSetupState() {
  const sections = ['dash-stats-grid', 'activity-list', 'next-milestone-wrap', 'timeline-list', 'dlv-list', 'ticket-list'];
  const msg = '<p style="font-size:0.85rem;color:var(--muted);padding:0.5rem 0;">Your project will appear here once our team completes setup. You\'ll receive an email when it\'s ready.</p>';
  sections.forEach((id) => { const el = document.getElementById(id); if (el) el.innerHTML = msg; });
}

// ── Static interactions ───────────────────────────────────

function initStaticInteractions() {
  // Sidebar section navigation
  const navItems  = document.querySelectorAll('.dash-nav-item[data-section]');
  const sections  = document.querySelectorAll('.dash-section');
  const pageTitle = document.getElementById('dash-page-title');

  const titles = { overview: 'Overview', project: 'Project', deliverables: 'Deliverables', analytics: 'Analytics', support: 'Support' };

  function activateSection(key) {
    navItems.forEach((item) => item.classList.toggle('is-active', item.dataset.section === key));
    sections.forEach((sec) => { sec.hidden = sec.id !== `section-${key}`; });
    if (pageTitle) pageTitle.textContent = titles[key] || key;
    const sidebar = document.getElementById('dash-sidebar');
    if (sidebar) sidebar.classList.remove('is-open');
  }

  navItems.forEach((item) => {
    item.addEventListener('click', (e) => { e.preventDefault(); activateSection(item.dataset.section); });
  });

  const hash = location.hash.replace('#', '');
  if (hash && titles[hash]) activateSection(hash);

  // Mobile sidebar
  const menuBtn = document.getElementById('dash-menu-btn');
  const sidebar  = document.getElementById('dash-sidebar');
  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', () => sidebar.classList.toggle('is-open'));
    document.addEventListener('click', (e) => {
      if (!sidebar.contains(e.target) && e.target !== menuBtn) sidebar.classList.remove('is-open');
    });
  }
}

// ── Utilities ─────────────────────────────────────────────

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(str) {
  return String(str).replace(/"/g,'&quot;');
}
function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days < 7)   return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function statusLabel(status) {
  return { 'open': 'Awaiting review', 'in-progress': 'In progress', 'resolved': 'Resolved' }[status] || status;
}
