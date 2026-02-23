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

  // Handle pending / rejected — show status panel instead of full portal
  if (project.status === 'pending' || project.status === 'rejected') {
    renderProjectStatusState(project);
    initStaticInteractions();
    return;
  }

  // Update page title with project name
  const planEl = document.getElementById('dash-project-plan');
  if (planEl) planEl.textContent = project.plan || project.name;

  // Status pill
  const statusTextEl = document.getElementById('dash-status-text');
  const statusDotEl  = document.getElementById('dash-status-dot');
  const statusPillEl = document.getElementById('dash-status-pill');
  const statusMap = { active: 'Sprint Active', paused: 'Paused', complete: 'Complete' };
  if (statusTextEl) statusTextEl.textContent = statusMap[project.status] || project.status;
  if (statusDotEl)  statusDotEl.className = `dash-status-dot dash-status-dot--${project.status || 'active'}`;
  if (statusPillEl) statusPillEl.className = `dash-status-pill dash-status-pill--${project.status || 'active'}`;

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
  renderAnalytics(project, milestones, deliverables);
  renderSupport(tickets, lead);
  initTicketForm(userId, project.id);

  // ── 7. Load store data (non-blocking, populates Store + Analytics sections) ──
  loadStoreSection(userId);
  loadAnalyticsStore(userId);

  // ── 8. Static interactions ────────────────────────────
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

function renderAnalytics(project, milestones, deliverables) {
  const wrap = document.getElementById('analytics-stats-wrap');
  const note = document.getElementById('analytics-note');

  const complete    = milestones.filter((m) => m.status === 'complete').length;
  const total       = milestones.length;
  const dlvReady    = deliverables.filter((d) => d.status === 'ready').length;
  const dlvTotal    = deliverables.length;
  const pct         = total ? Math.round((complete / total) * 100) : 0;
  const startDate   = project.started_at ? new Date(project.started_at) : null;
  const daysActive  = startDate ? Math.floor((Date.now() - startDate.getTime()) / 86400000) : '—';

  if (wrap) {
    wrap.innerHTML = `
      <div class="dash-stats">
        <div class="dash-stat-card">
          <p class="dash-stat-label">Overall progress</p>
          <p class="dash-stat-val">${pct}<span class="dash-stat-of">%</span></p>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="dash-stat-card">
          <p class="dash-stat-label">Milestones done</p>
          <p class="dash-stat-val">${complete} <span class="dash-stat-of">/ ${total}</span></p>
          <p class="dash-stat-sub ${complete === total && total > 0 ? 'dash-stat-green' : ''}">
            ${complete === total && total > 0 ? 'All complete' : `${total - complete} remaining`}
          </p>
        </div>
        <div class="dash-stat-card">
          <p class="dash-stat-label">Deliverables ready</p>
          <p class="dash-stat-val">${dlvReady} <span class="dash-stat-of">/ ${dlvTotal}</span></p>
          <div class="progress-bar"><div class="progress-fill" style="width:${dlvTotal ? Math.round((dlvReady / dlvTotal) * 100) : 0}%"></div></div>
        </div>
        <div class="dash-stat-card">
          <p class="dash-stat-label">Days active</p>
          <p class="dash-stat-val">${daysActive}</p>
          <p class="dash-stat-sub">${startDate ? 'since ' + startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Start date TBD'}</p>
        </div>
      </div>`;
  }

  if (note) {
    note.textContent = project.status === 'complete'
      ? `Project "${project.name}" is complete. Store analytics will appear here once your store is connected.`
      : `Store analytics (revenue, orders, customers) will appear here once your store is connected by the NexaLab team.`;
  }
}

// ── Render: Support ───────────────────────────────────────

function renderSupport(tickets, lead) {
  const ticketList = document.getElementById('ticket-list');
  const openCount  = document.getElementById('ticket-open-count');
  const openTickets = tickets.filter((t) => t.status !== 'resolved');

  if (openCount) openCount.textContent = openTickets.length || '';

  // Sidebar badge
  const sideBadge = document.getElementById('dash-support-badge');
  if (sideBadge) {
    if (openTickets.length > 0) {
      sideBadge.textContent = openTickets.length;
      sideBadge.hidden = false;
    } else {
      sideBadge.hidden = true;
    }
  }

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

      // Wire click to open thread
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

// ── Render: Empty / setup state ───────────────────────────

function renderSetupState() {
  const sections = ['dash-stats-grid', 'activity-list', 'next-milestone-wrap', 'timeline-list', 'dlv-list', 'ticket-list'];
  const msg = '<p style="font-size:0.85rem;color:var(--muted);padding:0.5rem 0;">Your project will appear here once our team completes setup. You\'ll receive an email when it\'s ready.</p>';
  sections.forEach((id) => { const el = document.getElementById(id); if (el) el.innerHTML = msg; });
}

// ── Render: Pending / Rejected project state ──────────────

function renderProjectStatusState(project) {
  // Hide all normal sections, show the status panel
  document.querySelectorAll('.dash-section').forEach((s) => { s.hidden = true; });
  const panel = document.getElementById('project-status-panel');
  if (panel) panel.hidden = false;

  if (project.status === 'pending') {
    const p = document.getElementById('project-pending-panel');
    if (p) p.hidden = false;
    const titleEl = document.getElementById('dash-page-title');
    if (titleEl) titleEl.textContent = 'Project Under Review';
    const statusText = document.getElementById('dash-status-text');
    if (statusText) statusText.textContent = 'Pending Approval';
    const statusDot = document.getElementById('dash-status-dot');
    if (statusDot) statusDot.className = 'dash-status-dot dash-status-dot--paused';
  } else {
    const p = document.getElementById('project-rejected-panel');
    if (p) p.hidden = false;
    const titleEl = document.getElementById('dash-page-title');
    if (titleEl) titleEl.textContent = 'Intake Reviewed';
    const statusText = document.getElementById('dash-status-text');
    if (statusText) statusText.textContent = 'Not Approved';
    const statusDot = document.getElementById('dash-status-dot');
    if (statusDot) statusDot.className = 'dash-status-dot dash-status-dot--paused';
  }
}

// ── Static interactions ───────────────────────────────────

function initStaticInteractions() {
  // Sidebar section navigation
  const navItems  = document.querySelectorAll('.dash-nav-item[data-section]');
  const sections  = document.querySelectorAll('.dash-section');
  const pageTitle = document.getElementById('dash-page-title');

  const titles   = { overview: 'Overview', project: 'Project', deliverables: 'Deliverables', analytics: 'Analytics', store: 'Store', support: 'Support' };
  let   _navBusy = false;
  const overlay  = document.getElementById('page-overlay');

  function activateSection(key, pushState = true) {
    if (_navBusy) return;
    const next = document.getElementById(`section-${key}`);
    if (!next) return;
    const current = [...sections].find((s) => !s.hidden);
    if (current === next) return;

    _navBusy = true;
    navItems.forEach((item) => item.classList.toggle('is-active', item.dataset.section === key));
    const sidebar = document.getElementById('dash-sidebar');
    if (sidebar) sidebar.classList.remove('is-open');

    // Phase 1 — cover
    overlay.classList.add('covering');

    setTimeout(() => {
      // Phase 2 — swap while covered
      sections.forEach((sec) => { sec.hidden = true; });
      next.hidden = false;
      if (pageTitle) pageTitle.textContent = titles[key] || key;
      document.title = `${titles[key] || key} — NexaLab`;
      if (pushState) history.pushState({ section: key }, '', `#${key}`);
      window.scrollTo({ top: 0, behavior: 'instant' });

      // Phase 3 — reveal
      overlay.classList.remove('covering');
      setTimeout(() => { _navBusy = false; }, 160);
    }, 150);
  }

  // Browser back / forward
  window.addEventListener('popstate', (e) => {
    const key = e.state?.section || location.hash.replace('#', '') || 'overview';
    activateSection(key, false);
  });

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

// ── Ticket thread (reply conversation) ────────────────────

function openTicketThread(ticket) {
  const ticketList  = document.getElementById('ticket-list');
  const threadWrap  = document.getElementById('ticket-thread-wrap');
  const newTicketBtn = document.getElementById('new-ticket-btn');
  if (!threadWrap) return;

  // Hide list + new ticket button, show thread
  if (ticketList)   ticketList.hidden   = true;
  if (newTicketBtn) newTicketBtn.hidden = true;
  threadWrap.hidden = false;

  // Populate header
  const titleEl = document.getElementById('ticket-thread-title');
  const metaEl  = document.getElementById('ticket-thread-meta');
  if (titleEl) titleEl.textContent = `${ticket.ticket_ref || '#—'} · ${ticket.title}`;
  if (metaEl)  metaEl.textContent  = `${ticket.category || 'General'} · Opened ${timeAgo(ticket.created_at)} · ${statusLabel(ticket.status)}`;

  // Back button
  const backBtn = document.getElementById('ticket-thread-back');
  if (backBtn) {
    backBtn.onclick = () => {
      threadWrap.hidden  = true;
      if (ticketList)    { ticketList.hidden   = false; }
      if (newTicketBtn)  { newTicketBtn.hidden  = false; }
    };
  }

  // Load and render replies
  loadTicketReplies(ticket);

  // Wire reply form
  const replyForm = document.getElementById('ticket-reply-form');
  if (replyForm) {
    replyForm.onsubmit = async (ev) => {
      ev.preventDefault();
      const content = (replyForm.content.value || '').trim();
      if (!content) return;
      const replyBtn  = document.getElementById('ticket-reply-btn');
      const replyErr  = document.getElementById('ticket-reply-error');
      if (replyBtn) { replyBtn.disabled = true; replyBtn.textContent = 'Sending…'; }
      if (replyErr) replyErr.textContent = '';

      const { data: { session } } = await nexaSupabase.auth.getSession();
      const authorId = session?.user?.id;

      const { error } = await nexaSupabase.from('ticket_replies').insert({
        ticket_id:   ticket.id,
        author_id:   authorId,
        author_name: session?.user?.user_metadata?.full_name || 'Client',
        content,
        is_admin:    false,
      });

      if (replyBtn) { replyBtn.disabled = false; replyBtn.textContent = 'Send reply'; }

      if (error) {
        if (replyErr) replyErr.textContent = 'Could not send reply. Please try again.';
        return;
      }
      replyForm.reset();
      await loadTicketReplies(ticket);

      // Notify admin (best-effort)
      try {
        await fetch(`${NEXALAB_SUPABASE_URL}/functions/v1/send-notification`, {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${NEXALAB_SUPABASE_KEY}`,
            'apikey':         NEXALAB_SUPABASE_KEY,
          },
          body: JSON.stringify({
            type: 'ticket_reply_admin',
            data: {
              clientName:   session?.user?.user_metadata?.full_name || 'Client',
              ticketRef:    ticket.ticket_ref,
              ticketTitle:  ticket.title,
              replyContent: content,
            },
          }),
        });
      } catch (_) {}
    };
  }
}

async function loadTicketReplies(ticket) {
  const messagesEl = document.getElementById('ticket-thread-messages');
  if (!messagesEl) return;

  const { data: replies = [] } = await nexaSupabase
    .from('ticket_replies')
    .select('*')
    .eq('ticket_id', ticket.id)
    .order('created_at', { ascending: true });

  // Combine original description + replies
  const allMessages = [];
  if (ticket.description) {
    allMessages.push({
      content:    ticket.description,
      is_admin:   false,
      author_name: 'You',
      created_at: ticket.created_at,
      isOriginal: true,
    });
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

  // Scroll to bottom
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ── Ticket form ────────────────────────────────────────────

function initTicketForm(userId, projectId) {
  const openBtn   = document.getElementById('new-ticket-btn');
  const wrap      = document.getElementById('new-ticket-wrap');
  const form      = document.getElementById('new-ticket-form');
  const cancelBtn = document.getElementById('cancel-ticket-btn');
  const submitBtn = document.getElementById('ticket-submit-btn');
  const errEl     = document.getElementById('ticket-form-error');
  if (!openBtn || !wrap || !form) return;

  function showForm() {
    wrap.hidden = false;
    openBtn.hidden = true;
  }

  function hideForm() {
    wrap.hidden = true;
    openBtn.hidden = false;
    form.reset();
    if (errEl) errEl.textContent = '';
  }

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

    if (error) {
      if (errEl) errEl.textContent = 'Could not submit ticket. Please try again.';
      return;
    }

    hideForm();

    // Reload and re-render the ticket list
    const { data: fresh = [] } = await nexaSupabase
      .from('tickets').select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    const openTickets = fresh.filter((t) => t.status !== 'resolved');

    const ticketList = document.getElementById('ticket-list');
    const openCount  = document.getElementById('ticket-open-count');
    const sideBadge  = document.getElementById('dash-support-badge');

    if (openCount) openCount.textContent = openTickets.length || '';
    if (sideBadge) {
      sideBadge.textContent = openTickets.length;
      sideBadge.hidden = openTickets.length === 0;
    }
    if (ticketList) {
      if (openTickets.length === 0) {
        ticketList.innerHTML = '<p style="font-size:0.85rem;color:var(--muted);margin-top:0.8rem;">No open tickets — all clear.</p>';
      } else {
        ticketList.innerHTML = openTickets.map((t) => `
          <div class="ticket-item ticket-review" data-ticket-id="${escHtml(t.id)}" style="cursor:pointer;">
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
  });
}

// ── Store section ─────────────────────────────────────────

async function loadStoreSection(clientId) {
  const { data: integration } = await nexaSupabase
    .from('store_integrations')
    .select('id, platform, store_url, last_synced_at')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (!integration) {
    document.getElementById('store-empty-state').hidden  = false;
    document.getElementById('store-metrics-wrap').hidden = true;
    return;
  }

  document.getElementById('store-empty-state').hidden  = true;
  document.getElementById('store-metrics-wrap').hidden = false;

  // Connection status bar
  const platformLabel = { wordpress: 'WordPress', woocommerce: 'WooCommerce', shopify: 'Shopify', bigcommerce: 'BigCommerce' };
  const bar = document.getElementById('store-summary-bar');
  if (bar) {
    const synced = integration.last_synced_at
      ? new Date(integration.last_synced_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'Never';
    bar.innerHTML = `
      <span class="store-platform-badge">${platformLabel[integration.platform] || integration.platform}</span>
      <a href="${integration.store_url}" target="_blank" class="store-url-link">${integration.store_url}</a>
      <span class="store-sync-label">Last synced: ${synced}</span>`;
  }

  const statusColor = { completed: '#22d3a8', processing: '#9aa8ff', shipped: '#22d3a8', pending: '#fbbf24', refunded: '#ff7070', cancelled: '#ff7070', canceled: '#ff7070', failed: '#ff7070' };

  // Fetch most recent day metrics + status-bucketed order counts + live feed — in parallel
  const [metricsRes, statusRes, feedRes] = await Promise.all([
    // Most recent 2 days of aggregated metrics (latest day + previous for comparison)
    nexaSupabase.from('store_metrics').select('date, revenue, orders, customers, currency')
      .eq('client_id', clientId).order('date', { ascending: false }).limit(2),
    // All orders bucketed by status (only need status + amount columns)
    nexaSupabase.from('store_orders').select('status, amount, currency')
      .eq('client_id', clientId).order('ordered_at', { ascending: false }).limit(500),
    // Live feed — full row, 15 most recent
    nexaSupabase.from('store_orders').select('customer_name, customer_email, amount, currency, status, ordered_at')
      .eq('client_id', clientId).order('ordered_at', { ascending: false }).limit(15),
  ]);

  const metrics = metricsRes.data ?? [];
  const allOrders = statusRes.data ?? [];
  const feedOrders = feedRes.data ?? [];

  // ── Snapshot cards (latest synced day) ───────────────────
  const latest  = metrics[0];
  const prevDay = metrics[1];
  const currency = latest?.currency || allOrders[0]?.currency || feedOrders[0]?.currency || 'USD';
  const fmt     = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
  const fmtFull = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);

  const latestDateLabel = latest?.date
    ? new Date(latest.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'last sync';

  document.getElementById('store-today-revenue').textContent     = latest ? fmt(latest.revenue) : '—';
  document.getElementById('store-today-revenue-sub').textContent = latest ? `on ${latestDateLabel}` : 'Sync your store to see data';
  document.getElementById('store-today-orders').textContent      = latest ? latest.orders : '—';
  document.getElementById('store-today-orders-sub').textContent  = latest ? `on ${latestDateLabel}` : '';

  // ── Status counts ─────────────────────────────────────────
  const statusCounts = {};
  for (const o of allOrders) {
    const s = (o.status || 'unknown').toLowerCase();
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }
  document.getElementById('store-pending-orders').textContent    = statusCounts['pending']    || 0;
  document.getElementById('store-pending-sub').textContent       = 'awaiting payment';
  document.getElementById('store-processing-orders').textContent = statusCounts['processing'] || 0;
  document.getElementById('store-processing-sub').textContent    = 'being fulfilled';

  // ── Status breakdown bars ─────────────────────────────────
  const breakdownEl = document.getElementById('store-status-breakdown');
  if (breakdownEl) {
    const total = allOrders.length;
    const rows  = Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => {
        const pct   = total ? Math.round((count / total) * 100) : 0;
        const color = statusColor[status] || 'var(--muted)';
        return `
          <div class="store-status-row">
            <span class="store-status-name" style="color:${color};">${status}</span>
            <div class="store-status-bar-wrap">
              <div class="store-status-bar" style="width:${pct}%;background:${color};"></div>
            </div>
            <span class="store-status-count">${count}</span>
          </div>`;
      }).join('');
    breakdownEl.innerHTML = rows || '<p class="adm-empty">No orders synced yet.</p>';
  }

  // ── Live order feed ───────────────────────────────────────
  const ordersEl = document.getElementById('store-orders-list');
  if (!ordersEl) return;

  if (!feedOrders.length) {
    ordersEl.innerHTML = '<p class="adm-empty" style="padding:1rem 0;">No orders synced yet.</p>';
    return;
  }

  ordersEl.innerHTML = `
    <div class="store-orders-table">
      ${feedOrders.map((o) => {
        const when  = o.ordered_at ? new Date(o.ordered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
        const color = statusColor[o.status?.toLowerCase()] || 'var(--muted)';
        const amt   = fmtFull(o.amount || 0);
        return `
          <div class="store-order-row">
            <div class="store-order-customer">
              <span class="store-order-name">${o.customer_name || 'Anonymous'}</span>
              <span class="store-order-email">${o.customer_email || ''}</span>
            </div>
            <span class="store-order-amount">${amt}</span>
            <span class="store-order-status" style="color:${color};">${o.status || '—'}</span>
            <span class="store-order-date">${when}</span>
          </div>`;
      }).join('')}
    </div>`;
}

// ── Analytics: store data ──────────────────────────────────

async function loadAnalyticsStore(clientId) {
  const { data: integration } = await nexaSupabase
    .from('store_integrations')
    .select('id, platform')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (!integration) return; // leave "no store" note visible

  document.getElementById('analytics-store-wrap').hidden = false;
  document.getElementById('analytics-no-store').hidden   = true;

  const platformLabel = { wordpress: 'WordPress', woocommerce: 'WooCommerce', shopify: 'Shopify', bigcommerce: 'BigCommerce' };
  const badge = document.getElementById('analytics-platform-badge');
  if (badge) badge.textContent = platformLabel[integration.platform] || integration.platform;

  // Date boundaries
  const now      = new Date();
  const d30      = new Date(); d30.setDate(now.getDate() - 30);
  const d60      = new Date(); d60.setDate(now.getDate() - 60);
  const d30str   = d30.toISOString().split('T')[0];
  const d60str   = d60.toISOString().split('T')[0];

  // Fetch current period, previous period, and all orders for customer totals
  const [currRes, prevRes, ordersRes] = await Promise.all([
    nexaSupabase.from('store_metrics').select('*')
      .eq('client_id', clientId).gte('date', d30str).order('date', { ascending: true }),
    nexaSupabase.from('store_metrics').select('revenue, orders, customers')
      .eq('client_id', clientId).gte('date', d60str).lt('date', d30str),
    nexaSupabase.from('store_orders').select('customer_name, customer_email, amount, currency')
      .eq('client_id', clientId)
      .not('status', 'in', '(refunded,cancelled,canceled,failed)'),
  ]);

  const curr   = currRes.data   ?? [];
  const prev   = prevRes.data   ?? [];
  const orders = ordersRes.data ?? [];

  const sum = (arr, f) => arr.reduce((s, m) => s + (m[f] || 0), 0);
  const currency  = curr[0]?.currency || 'USD';
  const fmt       = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
  const fmtFull   = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);

  const cRev = sum(curr, 'revenue');
  const cOrd = sum(curr, 'orders');
  const cCus = sum(curr, 'customers');
  const cAov = cOrd > 0 ? cRev / cOrd : 0;
  const pRev = sum(prev, 'revenue');
  const pOrd = sum(prev, 'orders');
  const pCus = sum(prev, 'customers');
  const pAov = pOrd > 0 ? pRev / pOrd : 0;

  function trendBadge(cur, prv) {
    if (!prv) return '<span style="color:var(--muted);font-size:0.72rem;">No prev data</span>';
    const pct = ((cur - prv) / prv * 100).toFixed(1);
    return Number(pct) >= 0
      ? `<span style="color:#22d3a8;font-size:0.72rem;">↑ ${pct}% vs prev 30d</span>`
      : `<span style="color:#ff7070;font-size:0.72rem;">↓ ${Math.abs(Number(pct))}% vs prev 30d</span>`;
  }

  // ── KPI comparison grid ──────────────────────────────────
  const kpiEl = document.getElementById('analytics-kpi-grid');
  if (kpiEl) {
    kpiEl.innerHTML = `
      <div class="dash-stat-card">
        <p class="dash-stat-label">Revenue</p>
        <p class="dash-stat-val">${fmt(cRev)}</p>
        <p class="dash-stat-sub">${trendBadge(cRev, pRev)}</p>
      </div>
      <div class="dash-stat-card">
        <p class="dash-stat-label">Orders</p>
        <p class="dash-stat-val">${cOrd.toLocaleString()}</p>
        <p class="dash-stat-sub">${trendBadge(cOrd, pOrd)}</p>
      </div>
      <div class="dash-stat-card">
        <p class="dash-stat-label">Avg Order Value</p>
        <p class="dash-stat-val">${fmt(cAov)}</p>
        <p class="dash-stat-sub">${trendBadge(cAov, pAov)}</p>
      </div>
      <div class="dash-stat-card">
        <p class="dash-stat-label">New Customers</p>
        <p class="dash-stat-val">${cCus.toLocaleString()}</p>
        <p class="dash-stat-sub">${trendBadge(cCus, pCus)}</p>
      </div>`;
  }

  // ── 30-day bar chart ─────────────────────────────────────
  const dayMap = {};
  curr.forEach((m) => { dayMap[m.date] = m; });
  const maxRev = Math.max(...curr.map((m) => m.revenue || 0), 1);

  const bars   = [];
  const labels = [];
  for (let i = 29; i >= 0; i--) {
    const d   = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const m   = dayMap[key];
    const pct = m ? Math.max(Math.round((m.revenue / maxRev) * 100), 2) : 0;
    const lbl = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    bars.push(`<div class="analytics-bar${pct === 0 ? ' analytics-bar--empty' : ''}" style="height:${pct}%" title="${lbl}: ${m ? fmtFull(m.revenue) : '$0'}"></div>`);
    labels.push(i % 7 === 0
      ? `<span>${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>`
      : '<span></span>');
  }
  const chartEl = document.getElementById('analytics-chart');
  const labelEl = document.getElementById('analytics-chart-labels');
  if (chartEl) chartEl.innerHTML = bars.join('');
  if (labelEl) labelEl.innerHTML = labels.join('');

  // ── Highlights ───────────────────────────────────────────
  const bestDay = curr.reduce((best, m) => (!best || m.revenue > best.revenue) ? m : best, null);
  const hlEl    = document.getElementById('analytics-highlights');
  if (hlEl) {
    if (!bestDay) {
      hlEl.innerHTML = '<p class="adm-empty">No data yet.</p>';
    } else {
      const bestDate = new Date(bestDay.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      hlEl.innerHTML = `
        <div class="analytics-hl-row">
          <p class="analytics-hl-label">Best day revenue</p>
          <div><p class="analytics-hl-val">${fmt(bestDay.revenue)}</p><p class="analytics-hl-sub">${bestDate}</p></div>
        </div>
        <div class="analytics-hl-row">
          <p class="analytics-hl-label">Best day orders</p>
          <div><p class="analytics-hl-val">${bestDay.orders}</p><p class="analytics-hl-sub">${bestDate}</p></div>
        </div>
        <div class="analytics-hl-row">
          <p class="analytics-hl-label">Daily avg revenue</p>
          <div><p class="analytics-hl-val">${fmt(cRev / 30)}</p><p class="analytics-hl-sub">over last 30 days</p></div>
        </div>`;
    }
  }

  // ── Top customers by spend ────────────────────────────────
  const spend = {};
  for (const o of orders) {
    const key = o.customer_email || o.customer_name;
    if (!key) continue;
    if (!spend[key]) spend[key] = { name: o.customer_name || o.customer_email, total: 0, count: 0 };
    spend[key].total += o.amount || 0;
    spend[key].count += 1;
  }
  const top    = Object.values(spend).sort((a, b) => b.total - a.total).slice(0, 5);
  const tcEl   = document.getElementById('analytics-top-customers');
  if (tcEl) {
    tcEl.innerHTML = top.length
      ? top.map((c) => `
          <div class="analytics-customer-row">
            <div>
              <p class="analytics-customer-name">${escHtml(c.name)}</p>
              <p class="analytics-customer-meta">${c.count} order${c.count !== 1 ? 's' : ''}</p>
            </div>
            <p class="analytics-customer-total">${fmtFull(c.total)}</p>
          </div>`).join('')
      : '<p class="adm-empty">No customer data yet.</p>';
  }
}
