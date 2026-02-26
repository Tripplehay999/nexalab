// NexaLab — Client Portal: Deliverables page

(async function deliverablesPage() {
  const boot = await window.clientBoot;
  if (!boot) return;
  const { project } = boot;

  if (!project || project.status === 'pending' || project.status === 'rejected') {
    window.location.href = 'dashboard.html';
    return;
  }

  const { data: deliverables = [] } = await nexaSupabase
    .from('deliverables')
    .select('*')
    .eq('project_id', project.id)
    .order('created_at');

  renderDeliverableStats(deliverables);
  renderDeliverables(deliverables);
  initDeliverableFilters(deliverables);
})();

// ── Render: Stats bar ────────────────────────────────────

function renderDeliverableStats(deliverables) {
  const bar     = document.getElementById('dlv-stats-bar');
  if (!bar) return;
  const ready    = deliverables.filter((d) => d.status === 'ready').length;
  const upcoming = deliverables.filter((d) => d.status !== 'ready').length;
  const total    = deliverables.length;

  bar.innerHTML = `
    <span class="ticket-stat"><strong>${ready}</strong> ready</span>
    <span class="ticket-stat-sep">·</span>
    <span class="ticket-stat"><strong>${upcoming}</strong> upcoming</span>
    <span class="ticket-stat-sep">·</span>
    <span class="ticket-stat"><strong>${total}</strong> total</span>`;
}

// ── Render: Deliverables list ────────────────────────────

function renderDeliverables(deliverables, filter = 'all') {
  const list = document.getElementById('dlv-list');
  if (!list) return;

  const filtered = filter === 'ready'
    ? deliverables.filter((d) => d.status === 'ready')
    : filter === 'upcoming'
      ? deliverables.filter((d) => d.status !== 'ready')
      : deliverables;

  if (filtered.length === 0) {
    list.innerHTML = filter === 'all'
      ? '<p style="font-size:0.85rem;color:var(--muted);">Deliverables will appear here as they are completed.</p>'
      : `<p style="font-size:0.85rem;color:var(--muted);">No ${filter} deliverables yet.</p>`;
    return;
  }

  const iconMap = { doc: 'dlv-icon--doc', code: 'dlv-icon--code', link: 'dlv-icon--link' };
  const svgMap  = {
    doc:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.7"/><polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1.7"/></svg>',
    code: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polyline points="16 18 22 12 16 6" stroke="currentColor" stroke-width="1.7"/><polyline points="8 6 2 12 8 18" stroke="currentColor" stroke-width="1.7"/></svg>',
    link: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  };
  const pendSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.7"/><polyline points="12 6 12 12 16 14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';

  list.innerHTML = filtered.map((d) => {
    const isReady  = d.status === 'ready';
    const type     = d.type || 'doc';
    const btnLabel = type === 'link' ? 'Open' : type === 'code' ? 'View repo' : 'Download';
    const dateStr  = isReady && d.delivered_at
      ? new Date(d.delivered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : d.due_date
        ? `Due ${new Date(d.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        : '';
    return `
      <div class="dlv-item ${isReady ? 'dlv-ready' : 'dlv-upcoming'}">
        <div class="dlv-icon ${isReady ? (iconMap[type] || 'dlv-icon--doc') : 'dlv-icon--pending'}">
          ${isReady ? (svgMap[type] || svgMap.doc) : pendSvg}
        </div>
        <div class="dlv-info">
          <p class="dlv-name">${escHtml(d.name)}</p>
          <p class="dlv-meta">${escHtml(d.meta || '')}${d.meta && dateStr ? ' · ' : ''}${dateStr}</p>
        </div>
        ${isReady
          ? `<button class="dlv-dl-btn" data-url="${escAttr(d.url || '')}">${escHtml(btnLabel)}</button>`
          : `<span class="dlv-upcoming-badge">Upcoming</span>`}
      </div>`;
  }).join('');

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

// ── Filter tabs ───────────────────────────────────────────

function initDeliverableFilters(deliverables) {
  const tabs = document.getElementById('dlv-filter-tabs');
  if (!tabs) return;
  tabs.querySelectorAll('.dlv-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.querySelectorAll('.dlv-tab').forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      renderDeliverables(deliverables, tab.dataset.filter);
    });
  });
}
