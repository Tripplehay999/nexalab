// NexaLab — Admin Portal: Inquiries page

(async function adminInquiriesPage() {
  const boot = await window.adminBoot;
  if (!boot) return;

  await loadInquiries();

  document.getElementById('inq-status-filter')?.addEventListener('change', (e) => {
    loadInquiries(e.target.value);
  });
})();

async function loadInquiries(status = '') {
  let q = nexaSupabase.from('inquiries').select('*').order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data: rows = [] } = await q;

  // Stats bar (always show all counts regardless of filter)
  const { data: allRows = [] } = await nexaSupabase.from('inquiries').select('status');
  renderInquiryStats(allRows);

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
            <td class="adm-td"><a href="mailto:${escAttr(r.work_email)}" class="adm-link">${escHtml(r.work_email)}</a></td>
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
                ${r.website  ? `<div class="adm-inq-detail-row"><span class="adm-inq-detail-label">Website</span><a href="${escAttr(r.website)}" target="_blank" class="adm-link">${escHtml(r.website)}</a></div>` : ''}
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
                    data-inq-name="${escAttr(r.full_name)}"
                    data-inq-email="${escAttr(r.work_email)}"
                    data-inq-plan="${escAttr(r.plan || '')}"
                    data-inq-goal="${escAttr(r.goal || '')}">✓ Approve — activate client portal</button>
                  <button class="btn btn-sm adm-decline-inq-btn"
                    data-decline-inq="${escHtml(r.id)}"
                    data-inq-name="${escAttr(r.full_name)}"
                    data-inq-email="${escAttr(r.work_email)}">✗ Decline</button>
                </div>` : ''}
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  wrap.querySelectorAll('.adm-inq-status-chg').forEach((sel) => {
    sel.addEventListener('change', async () => {
      const { error } = await nexaSupabase.from('inquiries').update({ status: sel.value }).eq('id', sel.dataset.inqId);
      if (error) showToast('Failed to update status', 'error');
      else { showToast('Status updated'); loadInquiries(document.getElementById('inq-status-filter')?.value || ''); }
    });
  });

  wrap.querySelectorAll('.adm-expand-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const goalRow = document.getElementById(`goal-${btn.dataset.inqId}`);
      if (goalRow) { goalRow.hidden = !goalRow.hidden; btn.textContent = goalRow.hidden ? 'Review ↓' : 'Close ↑'; }
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

function renderInquiryStats(rows) {
  const bar = document.getElementById('inq-stats-bar');
  if (!bar) return;
  const count = (s) => rows.filter((r) => r.status === s).length;
  bar.innerHTML = `
    <span class="ticket-stat"><strong>${count('new')}</strong> new</span>
    <span class="ticket-stat-sep">·</span>
    <span class="ticket-stat"><strong>${count('contacted')}</strong> contacted</span>
    <span class="ticket-stat-sep">·</span>
    <span class="ticket-stat"><strong>${count('converted')}</strong> converted</span>
    <span class="ticket-stat-sep">·</span>
    <span class="ticket-stat"><strong>${count('closed')}</strong> closed</span>`;
}

async function approveInquiry(inquiryId, name, email, plan, goal) {
  if (!confirm(`Approve ${name}'s inquiry and activate their client portal?`)) return;

  const { error: inqErr } = await nexaSupabase.from('inquiries').update({ status: 'converted' }).eq('id', inquiryId);
  if (inqErr) { showToast('Failed to update inquiry', 'error'); return; }

  const { data: existingProject } = await nexaSupabase
    .from('projects').select('id').eq('inquiry_id', inquiryId).eq('status', 'pending').maybeSingle();

  if (existingProject) {
    await nexaSupabase.from('projects').update({ status: 'active' }).eq('id', existingProject.id);
  } else {
    const { data: clientProfile } = await nexaSupabase.from('profiles').select('id').eq('email', email).maybeSingle();
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

  await sendNotification('project_approved', email, {
    name, plan, portalUrl: `${location.origin}/dashboard.html`,
  });
  showToast(`${name} approved — portal is now active`);
  loadInquiries(document.getElementById('inq-status-filter')?.value || '');
}

async function declineInquiry(inquiryId, name, email) {
  if (!confirm(`Decline ${name}'s inquiry? They will be notified.`)) return;

  const { error: inqErr } = await nexaSupabase.from('inquiries').update({ status: 'closed' }).eq('id', inquiryId);
  if (inqErr) { showToast('Failed to update inquiry', 'error'); return; }

  const { data: project } = await nexaSupabase
    .from('projects').select('id').eq('inquiry_id', inquiryId).eq('status', 'pending').maybeSingle();
  if (project) {
    await nexaSupabase.from('projects').update({ status: 'rejected' }).eq('id', project.id);
    await sendNotification('project_rejected', email, { name });
  }

  showToast(`${name}'s inquiry declined`);
  loadInquiries(document.getElementById('inq-status-filter')?.value || '');
}
