// NexaLab — Client Portal: Overview page

(async function overviewPage() {
  const boot = await window.clientBoot;
  if (!boot) return;
  const { userId, project } = boot;

  if (!project) { renderSetupState(); return; }

  if (project.status === 'pending' || project.status === 'rejected') {
    renderProjectStatusState(project);
    return;
  }

  // Status pill
  const statusMap = { active: 'Sprint Active', paused: 'Paused', complete: 'Complete' };
  const statusTextEl = document.getElementById('dash-status-text');
  const statusDotEl  = document.getElementById('dash-status-dot');
  const statusPillEl = document.getElementById('dash-status-pill');
  if (statusTextEl) statusTextEl.textContent = statusMap[project.status] || project.status;
  if (statusDotEl)  statusDotEl.className  = `dash-status-dot dash-status-dot--${project.status || 'active'}`;
  if (statusPillEl) statusPillEl.className = `dash-status-pill dash-status-pill--${project.status || 'active'}`;

  // Load data in parallel
  const milestoneIds = (await nexaSupabase.from('milestones').select('id').eq('project_id', project.id)).data?.map((m) => m.id) ?? [];

  const [milestonesRes, tasksAllRes, deliverablesRes, ticketsRes, activityRes] = await Promise.all([
    nexaSupabase.from('milestones').select('*').eq('project_id', project.id).order('sort_order'),
    milestoneIds.length
      ? nexaSupabase.from('milestone_tasks').select('*, milestone_id').in('milestone_id', milestoneIds)
      : Promise.resolve({ data: [] }),
    nexaSupabase.from('deliverables').select('*').eq('project_id', project.id),
    nexaSupabase.from('tickets').select('*').eq('project_id', project.id).order('created_at', { ascending: false }),
    nexaSupabase.from('activity').select('*').eq('project_id', project.id).order('created_at', { ascending: false }).limit(6),
  ]);

  const milestones   = milestonesRes.data   ?? [];
  const allTasks     = tasksAllRes.data     ?? [];
  const deliverables = deliverablesRes.data ?? [];
  const tickets      = ticketsRes.data      ?? [];
  const activity     = activityRes.data     ?? [];

  milestones.forEach((m) => { m.tasks = allTasks.filter((t) => t.milestone_id === m.id); });

  renderOverview(project, milestones, deliverables, tickets, activity);
  renderProjectHealth(project, milestones);
})();

// ── Render: Overview ──────────────────────────────────────

function renderOverview(project, milestones, deliverables, tickets, activity) {
  const startDate   = project.started_at ? new Date(project.started_at) : new Date();
  const daysActive  = Math.floor((Date.now() - startDate.getTime()) / 86400000);
  const complete    = milestones.filter((m) => m.status === 'complete').length;
  const dlvReady    = deliverables.filter((d) => d.status === 'ready').length;
  const openTickets = tickets.filter((t) => t.status !== 'resolved').length;

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

  const activityList = document.getElementById('activity-list');
  if (activityList) {
    activityList.innerHTML = activity.length
      ? activity.map((a) => `
          <li class="activity-item">
            <span class="activity-dot activity-dot--${a.color || 'gray'}"></span>
            <div>
              <p class="activity-text">${escHtml(a.text)}</p>
              <p class="activity-time">${timeAgo(a.created_at)}</p>
            </div>
          </li>`).join('')
      : '<li class="activity-item" style="color:var(--muted);font-size:0.82rem;">No activity yet.</li>';
  }

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
          ${tasks.length ? `<div class="milestone-tasks">
            <p class="milestone-tasks-label">Sub-tasks</p>
            <ul class="milestone-task-list">
              ${tasks.map((t) => `<li class="mtask ${t.status}">${escHtml(t.name)}</li>`).join('')}
            </ul></div>` : ''}
        </div>`;
    }
  }
}

// ── Render: Project health bar ────────────────────────────

function renderProjectHealth(project, milestones) {
  const el = document.getElementById('dash-project-health');
  if (!el || !milestones.length) return;

  const complete = milestones.filter((m) => m.status === 'complete').length;
  const total    = milestones.length;
  const pct      = Math.round((complete / total) * 100);
  const activeM  = milestones.find((m) => m.status === 'active');
  const activeIdx = activeM ? milestones.indexOf(activeM) + 1 : null;

  el.innerHTML = `
    <div class="dash-health-bar">
      <div class="dash-health-labels">
        <span class="dash-health-label">${activeIdx ? `Phase ${activeIdx} of ${total}` : `${complete} of ${total} phases complete`}</span>
        <span class="dash-health-pct">${pct}% complete</span>
      </div>
      <div class="progress-bar dash-health-progress">
        <div class="progress-fill" style="width:${pct}%"></div>
      </div>
      ${activeM ? `<p class="dash-health-phase">Currently in: <strong>${escHtml(activeM.name)}</strong></p>` : ''}
    </div>`;
}

// ── Setup / status states ─────────────────────────────────

function renderSetupState() {
  const el = document.getElementById('overview-content');
  if (el) el.innerHTML = `<div class="dash-card" style="text-align:center;padding:3rem 2rem;">
    <p style="font-size:1.1rem;font-weight:700;margin:0 0 0.5rem;">Setting up your portal</p>
    <p style="color:var(--muted);font-size:0.88rem;margin:0;">Your project will appear here once our team completes setup. You'll receive an email when it's ready.</p>
  </div>`;
}

function renderProjectStatusState(project) {
  document.getElementById('overview-content').hidden = true;
  const panel = document.getElementById('project-status-panel');
  if (panel) panel.hidden = false;
  if (project.status === 'pending') {
    document.getElementById('project-pending-panel').hidden = false;
    const t = document.getElementById('dash-page-title'); if (t) t.textContent = 'Project Under Review';
    const st = document.getElementById('dash-status-text'); if (st) st.textContent = 'Pending Approval';
    const sd = document.getElementById('dash-status-dot'); if (sd) sd.className = 'dash-status-dot dash-status-dot--paused';
  } else {
    document.getElementById('project-rejected-panel').hidden = false;
    const t = document.getElementById('dash-page-title'); if (t) t.textContent = 'Intake Reviewed';
    const st = document.getElementById('dash-status-text'); if (st) st.textContent = 'Not Approved';
    const sd = document.getElementById('dash-status-dot'); if (sd) sd.className = 'dash-status-dot dash-status-dot--paused';
  }
}
