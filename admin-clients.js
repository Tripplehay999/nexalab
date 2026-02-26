// NexaLab — Admin Portal: Clients page

const _state = { clientId: null, projectId: null, leadId: null };

(async function adminClientsPage() {
  const boot = await window.adminBoot;
  if (!boot) return;
  await loadClients();

  // Back button
  document.getElementById('adm-detail-back')?.addEventListener('click', () => {
    document.getElementById('clients-detail-view').hidden = true;
    document.getElementById('clients-grid-view').hidden   = false;
    window.scrollTo({ top: 0, behavior: 'instant' });
  });

  // Tab nav
  document.querySelectorAll('.adm-tab').forEach((tab) => {
    tab.addEventListener('click', () => switchProjectTab(tab.dataset.tab));
  });
})();

// ── Client grid ───────────────────────────────────────────

async function loadClients() {
  const [profilesRes, projRes] = await Promise.all([
    nexaSupabase.from('profiles').select('*').neq('role', 'admin').order('created_at', { ascending: false }),
    nexaSupabase.from('projects').select('client_id, status'),
  ]);

  const clients  = profilesRes.data ?? [];
  const projects = projRes.data     ?? [];

  const statusRank = { active: 3, pending: 2, rejected: 1 };
  const statusMap  = {};
  projects.forEach((p) => {
    const cur = statusMap[p.client_id];
    if (!cur || (statusRank[p.status] || 0) > (statusRank[cur] || 0)) statusMap[p.client_id] = p.status;
  });

  // Page header hint
  const hint = document.getElementById('adm-clients-hint');
  if (hint) {
    const active = Object.values(statusMap).filter((s) => s === 'active').length;
    hint.textContent = `${clients.length} client${clients.length !== 1 ? 's' : ''} · ${active} active project${active !== 1 ? 's' : ''}`;
  }

  const grid = document.getElementById('adm-client-grid');
  if (!grid) return;

  if (clients.length === 0) {
    grid.innerHTML = '<p class="adm-empty">No clients have signed up yet.</p>';
    return;
  }

  grid.innerHTML = clients.map((c) => {
    const ini   = c.avatar_initials || c.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?';
    const pStat = statusMap[c.id] || null;
    const b     = pStat
      ? `<span class="adm-client-status adm-client-status--${escHtml(pStat)}">${escHtml(pStat)}</span>`
      : `<span class="adm-client-status adm-client-status--none">no project</span>`;
    return `
      <div class="adm-client-card" data-client-id="${c.id}">
        <div class="adm-client-avatar">${escHtml(ini)}</div>
        <div class="adm-client-info">
          <p class="adm-client-name">${escHtml(c.full_name || 'Unnamed')}</p>
          <p class="adm-client-meta">${escHtml([c.company, c.email].filter(Boolean).join(' · '))}</p>
          ${b}
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

// ── Client detail ─────────────────────────────────────────

async function openClientDetail(client) {
  _state.clientId  = client.id;
  _state.projectId = null;
  _state.leadId    = null;

  document.getElementById('adm-detail-name').textContent = client.full_name || 'Unnamed';
  document.getElementById('adm-detail-sub').textContent  = [client.company, client.email].filter(Boolean).join(' · ');

  document.getElementById('clients-grid-view').hidden   = true;
  document.getElementById('clients-detail-view').hidden = false;
  window.scrollTo({ top: 0, behavior: 'instant' });

  const delBtn = document.getElementById('adm-delete-client-btn');
  if (delBtn) delBtn.onclick = () => deleteClient(client.id, client.full_name || 'this client');

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

// ── Tab switching ─────────────────────────────────────────

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
    if (tab === 'profile')      { if (_state.clientId)  loadClientProfile(_state.clientId); return; }
    if (tab === 'integrations') { if (_state.clientId)  loadClientIntegrations(_state.clientId); return; }
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

// ── Project tab ───────────────────────────────────────────

async function loadClientProject(clientId) {
  const { data: project } = await nexaSupabase
    .from('projects').select('*').eq('client_id', clientId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
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
            <input name="name" type="text" value="${escAttr(project?.name || '')}" placeholder="Meridian Apparel Store" required />
          </label>
          <label class="form-field">Plan name
            <input name="plan" type="text" value="${escAttr(project?.plan || '')}" placeholder="Full-Stack Commerce Retainer" />
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
      ['milestone-form-wrap', 'deliverable-form-wrap', 'activity-form-wrap'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.hidden = false;
      });
    }
  });
}

// ── Store Integrations tab ────────────────────────────────

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
    el.innerHTML = `
      <p class="dash-card-title">Connect Store</p>
      <p class="dash-card-sub" style="margin-bottom:1.25rem;">Link this client's store to sync live revenue, order count, and customer data into their portal.</p>
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
          <label class="form-field" id="fi-api-key">
            <span id="fi-api-key-label">Consumer Key (ck_…)</span>
            <input name="api_key" type="text" placeholder="ck_..." />
          </label>
          <label class="form-field" id="fi-api-secret">
            <span id="fi-api-secret-label">Consumer Secret (cs_…)</span>
            <input name="api_secret" type="password" placeholder="cs_..." />
          </label>
          <label class="form-field" id="fi-token" style="display:none;">
            <span id="fi-token-label">Access Token</span>
            <input name="access_token" type="password" placeholder="shppa_..." />
          </label>
          <label class="form-field" id="fi-hash" style="display:none;">Store Hash
            <input name="store_hash" type="text" placeholder="abc123xyz" />
          </label>
        </div>
        <details class="adm-integration-help" style="margin-top:1rem;">
          <summary style="cursor:pointer;font-size:0.82rem;color:var(--muted);">Where do I find these credentials?</summary>
          <div class="adm-integration-help-body">
            <p><strong>WordPress / WooCommerce:</strong> WooCommerce → Settings → Advanced → REST API → Add key. Set permissions to Read.</p>
            <p><strong>Shopify:</strong> Settings → Apps → Develop apps → Create app → Admin API access token.</p>
            <p><strong>BigCommerce:</strong> Settings → API accounts → Create V2/V3 API token.</p>
          </div>
        </details>
        <p class="adm-form-error" id="integration-error"></p>
        <button class="btn btn-primary btn-sm" type="submit" style="margin-top:1rem;">Connect &amp; Sync</button>
      </form>`;

    document.getElementById('adm-platform-select').addEventListener('change', (e) => {
      const p = e.target.value;
      document.getElementById('fi-api-key').style.display    = p === 'shopify'     ? 'none' : '';
      document.getElementById('fi-api-secret').style.display = p === 'shopify'     ? 'none' : '';
      document.getElementById('fi-token').style.display      = (p === 'wordpress') ? 'none' : '';
      document.getElementById('fi-hash').style.display       = p === 'bigcommerce' ? ''     : 'none';
      const keyLbl = document.getElementById('fi-api-key-label');
      const secLbl = document.getElementById('fi-api-secret-label');
      if (p === 'bigcommerce') { keyLbl.textContent = 'Client ID'; secLbl.textContent = 'Client Secret'; }
      else { keyLbl.textContent = 'Consumer Key (ck_…)'; secLbl.textContent = 'Consumer Secret (cs_…)'; }
    });

    document.getElementById('adm-integration-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await connectStore(clientId, Object.fromEntries(new FormData(e.target)));
    });

  } else {
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
          <a href="${escAttr(integration.store_url)}" target="_blank" class="adm-link">${escHtml(integration.store_url)}</a>
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
  if (errEl) errEl.textContent = '';

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
  if (error) { if (errEl) errEl.textContent = error.message; return; }

  showToast('Store connected — syncing now…');
  await syncStore(integration.id, clientId);
}

async function syncStore(integrationId, clientId) {
  const resultEl = document.getElementById('adm-sync-result');
  const syncBtn  = document.getElementById('adm-sync-btn');
  if (syncBtn)  { syncBtn.disabled = true; syncBtn.textContent = 'Syncing…'; }
  if (resultEl) resultEl.textContent = 'Fetching data from store…';

  try {
    const { data: result, error } = await nexaSupabase.functions.invoke('sync-store', {
      body: { integration_id: integrationId },
    });
    if (error) throw error;
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

// ── Milestones tab ────────────────────────────────────────

async function loadMilestones(projectId) {
  const msRes      = await nexaSupabase.from('milestones').select('*').eq('project_id', projectId).order('sort_order');
  const milestones = msRes.data ?? [];

  let allTasks = [];
  if (milestones.length > 0) {
    const ids = milestones.map((m) => m.id);
    const { data } = await nexaSupabase.from('milestone_tasks').select('*').in('milestone_id', ids);
    allTasks = data ?? [];
  }
  milestones.forEach((m) => { m.tasks = allTasks.filter((t) => t.milestone_id === m.id); });

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
            <button class="adm-icon-btn" data-ms-edit-toggle="${m.id}" title="Edit">✎</button>
            <button class="adm-icon-btn adm-icon-btn--danger" data-ms-delete="${m.id}" title="Delete">✕</button>
          </div>
        </div>
        ${m.description ? `<p class="adm-milestone-desc">${escHtml(m.description)}</p>` : ''}
        <div class="adm-inline-edit-wrap" id="ms-edit-${m.id}" hidden>
          <form class="adm-inline-edit-form" data-ms-edit="${m.id}">
            <div class="form-grid">
              <label class="form-field">Name * <input name="name" type="text" value="${escAttr(m.name)}" required /></label>
              <label class="form-field">Due date <input name="due_date" type="date" value="${m.due_date ? m.due_date.split('T')[0] : ''}" /></label>
            </div>
            <label class="form-field" style="margin-top:0.5rem;">Description <textarea name="description" rows="2">${escHtml(m.description || '')}</textarea></label>
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
                <button class="adm-icon-btn adm-icon-btn--danger adm-icon-btn--xs" data-task-delete="${t.id}">✕</button>
              </div>
            </div>`).join('')}
          <form class="adm-add-task-form" data-ms-id="${m.id}">
            <input type="text" name="task_name" placeholder="Add sub-task…" class="adm-inline-input" />
            <button class="btn btn-sm btn-outline" type="submit">+ Add</button>
          </form>
        </div>
      </div>`).join('');

    list.querySelectorAll('[data-ms-status]').forEach((sel) => {
      sel.addEventListener('change', async () => {
        const { error } = await nexaSupabase.from('milestones').update({ status: sel.value }).eq('id', sel.dataset.msStatus);
        if (error) showToast('Failed to update', 'error'); else showToast('Milestone updated');
      });
    });
    list.querySelectorAll('[data-ms-edit-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => { const w = document.getElementById(`ms-edit-${btn.dataset.msEditToggle}`); if (w) w.hidden = !w.hidden; });
    });
    list.querySelectorAll('[data-ms-edit-cancel]').forEach((btn) => {
      btn.addEventListener('click', () => { const w = document.getElementById(`ms-edit-${btn.dataset.msEditCancel}`); if (w) w.hidden = true; });
    });
    list.querySelectorAll('[data-ms-edit]').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        const { error } = await nexaSupabase.from('milestones').update({ name: data.name, description: data.description || null, due_date: data.due_date || null }).eq('id', form.dataset.msEdit);
        if (error) { showToast('Failed to update milestone', 'error'); return; }
        showToast('Milestone updated'); loadMilestones(projectId);
      });
    });
    list.querySelectorAll('[data-ms-delete]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this milestone and all its sub-tasks?')) return;
        const { error } = await nexaSupabase.from('milestones').delete().eq('id', btn.dataset.msDelete);
        if (error) { showToast('Failed to delete', 'error'); return; }
        showToast('Milestone deleted'); loadMilestones(projectId);
      });
    });
    list.querySelectorAll('[data-task-id]').forEach((sel) => {
      sel.addEventListener('change', async () => {
        const { error } = await nexaSupabase.from('milestone_tasks').update({ status: sel.value }).eq('id', sel.dataset.taskId);
        if (error) showToast('Failed to update', 'error'); else showToast('Task updated');
      });
    });
    list.querySelectorAll('[data-task-delete]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const { error } = await nexaSupabase.from('milestone_tasks').delete().eq('id', btn.dataset.taskDelete);
        if (error) { showToast('Failed to delete task', 'error'); return; }
        showToast('Task deleted'); loadMilestones(projectId);
      });
    });
    list.querySelectorAll('.adm-add-task-form').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = form.task_name.value.trim();
        if (!name) return;
        const { error } = await nexaSupabase.from('milestone_tasks').insert({ milestone_id: form.dataset.msId, name, sort_order: 99 });
        if (error) { showToast('Failed to add task', 'error'); return; }
        showToast('Task added'); form.reset(); loadMilestones(projectId);
      });
    });
  }

  const msForm = document.getElementById('adm-milestone-form');
  if (msForm) {
    msForm.onsubmit = async (e) => {
      e.preventDefault();
      const data  = Object.fromEntries(new FormData(e.target));
      const errEl = document.getElementById('milestone-error');
      const { error } = await nexaSupabase.from('milestones').insert({
        project_id: projectId, name: data.name, description: data.description || null,
        status: data.status, due_date: data.due_date || null, sort_order: milestones.length,
      });
      if (error) { errEl.textContent = error.message; return; }
      errEl.textContent = ''; msForm.reset(); showToast('Milestone added'); loadMilestones(projectId);
    };
  }
}

// ── Deliverables tab ──────────────────────────────────────

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
          ${d.url ? `<a href="${escAttr(d.url)}" target="_blank" rel="noopener" class="adm-link adm-dlv-url">↗ Open</a>` : ''}
          ${d.due_date ? `<span class="adm-dlv-meta">Due ${fmtDate(d.due_date)}</span>` : ''}
        </div>
        <div class="adm-dlv-controls">
          <select class="adm-select adm-inline-select adm-inline-select--sm" data-dlv-status="${d.id}">
            <option value="upcoming" ${d.status==='upcoming'?'selected':''}>Upcoming</option>
            <option value="ready"    ${d.status==='ready'   ?'selected':''}>Ready</option>
          </select>
          <button class="adm-icon-btn" data-dlv-edit-toggle="${d.id}">✎</button>
          <button class="adm-icon-btn adm-icon-btn--danger" data-dlv-delete="${d.id}">✕</button>
        </div>
      </div>
      <div class="adm-inline-edit-wrap adm-dlv-edit-wrap" id="dlv-edit-${d.id}" hidden>
        <form class="adm-inline-edit-form" data-dlv-edit="${d.id}">
          <div class="form-grid">
            <label class="form-field">Name * <input name="name" type="text" value="${escAttr(d.name)}" required /></label>
            <label class="form-field">Type <select name="type"><option value="doc" ${d.type==='doc'?'selected':''}>Document</option><option value="code" ${d.type==='code'?'selected':''}>Code</option><option value="link" ${d.type==='link'?'selected':''}>Link</option></select></label>
            <label class="form-field">URL <input name="url" type="url" value="${escAttr(d.url || '')}" placeholder="https://…" /></label>
            <label class="form-field">Meta <input name="meta" type="text" value="${escAttr(d.meta || '')}" /></label>
            <label class="form-field">Due date <input name="due_date" type="date" value="${d.due_date ? d.due_date.split('T')[0] : ''}" /></label>
          </div>
          <div class="adm-inline-edit-actions">
            <button class="btn btn-sm btn-primary" type="submit">Save</button>
            <button class="btn btn-sm btn-outline" type="button" data-dlv-edit-cancel="${d.id}">Cancel</button>
          </div>
        </form>
      </div>`).join('')}</div>`;

    list.querySelectorAll('[data-dlv-status]').forEach((sel) => {
      sel.addEventListener('change', async () => {
        const updates = { status: sel.value };
        if (sel.value === 'ready') updates.delivered_at = new Date().toISOString().split('T')[0];
        const { error } = await nexaSupabase.from('deliverables').update(updates).eq('id', sel.dataset.dlvStatus);
        if (error) showToast('Failed to update', 'error'); else showToast('Deliverable updated');
      });
    });
    list.querySelectorAll('[data-dlv-edit-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => { const w = document.getElementById(`dlv-edit-${btn.dataset.dlvEditToggle}`); if (w) w.hidden = !w.hidden; });
    });
    list.querySelectorAll('[data-dlv-edit-cancel]').forEach((btn) => {
      btn.addEventListener('click', () => { const w = document.getElementById(`dlv-edit-${btn.dataset.dlvEditCancel}`); if (w) w.hidden = true; });
    });
    list.querySelectorAll('[data-dlv-edit]').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        const { error } = await nexaSupabase.from('deliverables').update({ name: data.name, type: data.type, url: data.url || null, meta: data.meta || null, due_date: data.due_date || null }).eq('id', form.dataset.dlvEdit);
        if (error) { showToast('Failed to update deliverable', 'error'); return; }
        showToast('Deliverable updated'); loadDeliverables(projectId);
      });
    });
    list.querySelectorAll('[data-dlv-delete]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this deliverable?')) return;
        const { error } = await nexaSupabase.from('deliverables').delete().eq('id', btn.dataset.dlvDelete);
        if (error) { showToast('Failed to delete', 'error'); return; }
        showToast('Deliverable deleted'); loadDeliverables(projectId);
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
        project_id: projectId, name: data.name, type: data.type, url: data.url || null,
        meta: data.meta || null, status: data.status, due_date: data.due_date || null,
        delivered_at: data.delivered_at || null,
      });
      if (error) { errEl.textContent = error.message; return; }
      errEl.textContent = ''; dlvForm.reset(); showToast('Deliverable added'); loadDeliverables(projectId);
    };
  }
}

// ── Activity tab ──────────────────────────────────────────

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
      const { error } = await nexaSupabase.from('activity').insert({ project_id: projectId, text: data.text, color: data.color });
      if (error) { errEl.textContent = error.message; return; }
      errEl.textContent = ''; actForm.reset(); showToast('Activity logged'); loadActivityAdmin(projectId);
    };
  }
}

// ── Lead tab ──────────────────────────────────────────────

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
    form.next_checkin.value  = lead.next_checkin ? new Date(lead.next_checkin).toISOString().slice(0, 16) : '';
  }

  form.onsubmit = async (e) => {
    e.preventDefault();
    const data  = Object.fromEntries(new FormData(e.target));
    const errEl = document.getElementById('lead-error');
    const payload = {
      project_id:    projectId, name: data.name,
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
    errEl.textContent = ''; showToast('Account lead saved');
  };
}

// ── Profile tab ───────────────────────────────────────────

async function loadClientProfile(clientId) {
  const { data: client } = await nexaSupabase.from('profiles').select('*').eq('id', clientId).single();
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
    document.getElementById('adm-detail-name').textContent = data.full_name || 'Unnamed';
    document.getElementById('adm-detail-sub').textContent  = [data.company, data.email].filter(Boolean).join(' · ');
  };
}
