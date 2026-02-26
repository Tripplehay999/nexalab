// NexaLab — Admin Portal: Overview page

(async function adminOverviewPage() {
  const boot = await window.adminBoot;
  if (!boot) return;

  await loadOverview();
})();

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
  const pending   = (await nexaSupabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'pending')).count || 0;

  // Quick-action badges
  const qpb = document.getElementById('qa-pending-badge');
  const qib = document.getElementById('qa-inq-badge');
  const qtb = document.getElementById('qa-ticket-badge');
  if (qpb) { qpb.textContent = pending; qpb.hidden = pending === 0; }
  if (qib) { qib.textContent = newInq;  qib.hidden = newInq  === 0; }
  if (qtb) { qtb.textContent = openTix; qtb.hidden = openTix === 0; }

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
