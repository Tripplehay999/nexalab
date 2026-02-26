// NexaLab — Client Portal: Project page

(async function projectPage() {
  const boot = await window.clientBoot;
  if (!boot) return;
  const { project } = boot;

  if (!project) {
    document.getElementById('proj-brief-wrap').innerHTML =
      '<div class="dash-card"><p class="adm-empty">Your project will appear here once setup is complete.</p></div>';
    return;
  }

  if (project.status === 'pending' || project.status === 'rejected') {
    window.location.href = 'dashboard.html';
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

  // Load milestones + tasks
  const milestoneIds = (await nexaSupabase.from('milestones').select('id').eq('project_id', project.id)).data?.map((m) => m.id) ?? [];

  const [milestonesRes, tasksRes] = await Promise.all([
    nexaSupabase.from('milestones').select('*').eq('project_id', project.id).order('sort_order'),
    milestoneIds.length
      ? nexaSupabase.from('milestone_tasks').select('*').in('milestone_id', milestoneIds)
      : Promise.resolve({ data: [] }),
  ]);

  const milestones = milestonesRes.data ?? [];
  const allTasks   = tasksRes.data     ?? [];
  milestones.forEach((m) => { m.tasks = allTasks.filter((t) => t.milestone_id === m.id); });

  renderProjectBrief(project, milestones);
  renderCurrentPhase(milestones);
  renderProject(project, milestones);
})();

// ── Render: Project brief ─────────────────────────────────

function renderProjectBrief(project, milestones) {
  const complete = milestones.filter((m) => m.status === 'complete').length;
  const total    = milestones.length;
  const pct      = total ? Math.round((complete / total) * 100) : 0;
  const started  = project.started_at
    ? new Date(project.started_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'TBD';
  const statusLabels = { active: 'Active', paused: 'Paused', complete: 'Complete', pending: 'Pending' };

  const wrap = document.getElementById('proj-brief-wrap');
  if (!wrap) return;

  wrap.innerHTML = `
    <div class="dash-card proj-brief-card">
      <div class="proj-brief-top">
        <div>
          <p class="dash-card-title" style="margin:0;">${escHtml(project.plan || project.name)}</p>
          ${project.description ? `<p class="proj-brief-desc">${escHtml(project.description)}</p>` : ''}
        </div>
        <span class="tl-badge tl-badge--${project.status === 'active' ? 'active' : project.status === 'complete' ? 'done' : 'pending'}">
          ${statusLabels[project.status] || project.status}
        </span>
      </div>
      <div class="proj-brief-meta">
        <div class="proj-brief-meta-item">
          <span class="proj-brief-meta-label">Started</span>
          <span>${started}</span>
        </div>
        <div class="proj-brief-meta-item">
          <span class="proj-brief-meta-label">Milestones</span>
          <span>${complete} of ${total} complete</span>
        </div>
        <div class="proj-brief-meta-item">
          <span class="proj-brief-meta-label">Overall progress</span>
          <span>${pct}%</span>
        </div>
      </div>
      <div class="progress-bar" style="margin-top:0.75rem;">
        <div class="progress-fill" style="width:${pct}%"></div>
      </div>
    </div>`;
}

// ── Render: Current phase highlight ──────────────────────

function renderCurrentPhase(milestones) {
  const wrap = document.getElementById('proj-phase-wrap');
  if (!wrap) return;

  const activeM = milestones.find((m) => m.status === 'active') || milestones.find((m) => m.status === 'pending');
  if (!activeM) {
    wrap.innerHTML = '';
    return;
  }

  const tasks     = activeM.tasks || [];
  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const pct       = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;
  const dueStr    = activeM.due_date
    ? new Date(activeM.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'TBD';
  const idx       = milestones.indexOf(activeM) + 1;
  const isActive  = activeM.status === 'active';

  wrap.innerHTML = `
    <div class="dash-card proj-phase-card">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:0.5rem;">
        <p class="dash-card-title" style="margin:0;">${isActive ? 'Current phase' : 'Up next'}</p>
        <span class="tl-badge tl-badge--${isActive ? 'active' : 'pending'}">${isActive ? 'In Progress' : 'Upcoming'}</span>
      </div>
      <div class="next-milestone-card">
        <div class="milestone-header">
          <span class="milestone-tag">Milestone ${idx}</span>
          <span class="milestone-due">Due ${dueStr}</span>
        </div>
        <p class="milestone-name">${escHtml(activeM.name)}</p>
        ${activeM.description ? `<p class="milestone-desc">${escHtml(activeM.description)}</p>` : ''}
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
      </div>
    </div>`;
}

// ── Render: Full milestone timeline ───────────────────────

function renderProject(project, milestones) {
  const list = document.getElementById('timeline-list');
  if (!list) return;

  if (milestones.length === 0) {
    list.innerHTML = '<p style="font-size:0.85rem;color:var(--muted);">Milestones will appear here once your project is set up.</p>';
    return;
  }

  list.innerHTML = milestones.map((m, i) => {
    const stateClass = m.status === 'complete' ? 'tl-done' : m.status === 'active' ? 'tl-active' : '';
    const b = m.status === 'complete'
      ? '<span class="tl-badge tl-badge--done">Complete</span>'
      : m.status === 'active'
        ? '<span class="tl-badge tl-badge--active">In Progress</span>'
        : '<span class="tl-badge tl-badge--pending">Upcoming</span>';
    const dueStr = m.due_date
      ? new Date(m.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : '';
    const tasks     = m.tasks || [];
    const doneTasks = tasks.filter((t) => t.status === 'done').length;
    const pct       = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : null;
    return `
      <div class="tl-item ${stateClass}">
        <div class="tl-marker"></div>
        <div class="tl-content">
          <div class="tl-head">
            <span class="tl-name">Milestone ${i + 1} — ${escHtml(m.name)}</span>
            ${dueStr ? `<span class="tl-date">${dueStr}</span>` : ''}
          </div>
          ${m.description ? `<p class="tl-desc">${escHtml(m.description)}</p>` : ''}
          ${pct !== null ? `<div class="progress-bar" style="margin:0.4rem 0;"><div class="progress-fill" style="width:${pct}%"></div></div>` : ''}
          ${b}
        </div>
      </div>`;
  }).join('');
}
