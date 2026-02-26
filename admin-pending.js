// NexaLab — Admin Portal: Pending Approvals page

(async function adminPendingPage() {
  const boot = await window.adminBoot;
  if (!boot) return;
  await loadPendingProjects();
})();

async function loadPendingProjects() {
  const { data: projects = [] } = await nexaSupabase
    .from('projects')
    .select('id, name, plan, status, created_at, client_id, inquiry_id, description')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  // Update sidebar badges
  const pb  = document.getElementById('adm-pending-badge');
  const qpb = document.getElementById('qa-pending-badge');
  if (pb)  { pb.textContent  = projects.length; pb.hidden  = projects.length === 0; }
  if (qpb) { qpb.textContent = projects.length; qpb.hidden = projects.length === 0; }

  // Header hint
  const hint = document.getElementById('adm-pending-hint');
  if (hint) hint.textContent = projects.length === 0
    ? 'No pending projects right now.'
    : `${projects.length} project${projects.length !== 1 ? 's' : ''} awaiting approval.`;

  const wrap = document.getElementById('adm-pending-list');
  if (!wrap) return;

  if (projects.length === 0) {
    wrap.innerHTML = '<div class="dash-card"><p class="adm-empty">No pending projects — all caught up.</p></div>';
    return;
  }

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
    const ini    = client.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?';
    return `
      <div class="adm-pending-card dash-card" id="pending-card-${proj.id}">
        <div class="adm-pending-card-header">
          <div class="adm-client-avatar" style="flex-shrink:0;">${escHtml(ini)}</div>
          <div style="flex:1;min-width:0;">
            <p class="adm-client-name">${escHtml(client.full_name || 'Unknown')}</p>
            <p class="adm-client-meta">${escHtml([client.company, client.email].filter(Boolean).join(' · '))}</p>
          </div>
          <div style="flex-shrink:0;display:flex;gap:0.5rem;">
            <button class="btn btn-sm btn-primary" data-approve-id="${proj.id}" data-client-email="${escAttr(client.email || '')}" data-client-name="${escAttr(client.full_name || '')}">✓ Approve</button>
            <button class="btn btn-sm btn-outline adm-icon-btn--danger" style="width:auto;padding:0 0.75rem;" data-reject-id="${proj.id}" data-client-email="${escAttr(client.email || '')}" data-client-name="${escAttr(client.full_name || '')}">✕ Reject</button>
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

  const { data: proj } = await nexaSupabase.from('projects').select('plan').eq('id', projectId).single();
  await sendNotification('project_approved', clientEmail, {
    name: clientName, plan: proj?.plan || '',
    portalUrl: `${location.origin}/dashboard.html`,
  });

  const el = document.getElementById(`pending-card-${projectId}`);
  if (el) el.remove();
  _refreshPendingBadge();
}

async function rejectProject(projectId, clientEmail, clientName) {
  if (!confirm(`Reject this project for ${clientName || 'this client'}? They will be notified.`)) return;
  const { error } = await nexaSupabase.from('projects').update({ status: 'rejected' }).eq('id', projectId);
  if (error) { showToast('Failed to reject project', 'error'); return; }
  showToast('Project rejected — client notified');

  await sendNotification('project_rejected', clientEmail, { name: clientName });

  const el = document.getElementById(`pending-card-${projectId}`);
  if (el) el.remove();
  _refreshPendingBadge();
}

function _refreshPendingBadge() {
  const remaining = document.querySelectorAll('[id^="pending-card-"]').length;
  const pb  = document.getElementById('adm-pending-badge');
  const qpb = document.getElementById('qa-pending-badge');
  if (pb)  { pb.textContent  = remaining; pb.hidden  = remaining === 0; }
  if (qpb) { qpb.textContent = remaining; qpb.hidden = remaining === 0; }
  const hint = document.getElementById('adm-pending-hint');
  if (hint) hint.textContent = remaining === 0
    ? 'No pending projects right now.'
    : `${remaining} project${remaining !== 1 ? 's' : ''} awaiting approval.`;
  if (remaining === 0) {
    const wrap = document.getElementById('adm-pending-list');
    if (wrap) wrap.innerHTML = '<div class="dash-card"><p class="adm-empty">No pending projects — all caught up.</p></div>';
  }
}
