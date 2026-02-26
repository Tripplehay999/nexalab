// NexaLab — Shared portal utilities
// Load after supabase-config.js, before any page script.

function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(str) {
  return String(str ?? '').replace(/"/g,'&quot;');
}
function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days < 7)     return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function statusLabel(status) {
  return { 'open': 'Awaiting review', 'in-progress': 'In progress', 'resolved': 'Resolved' }[status] || status;
}

// Badge maps used across both portals
const INQ_MAP = {
  new:       { label: 'New',       cls: 'adm-badge--purple' },
  contacted: { label: 'Contacted', cls: 'adm-badge--blue'   },
  converted: { label: 'Converted', cls: 'adm-badge--green'  },
  closed:    { label: 'Closed',    cls: 'adm-badge--gray'   },
};
const TIX_MAP = {
  'open':        { label: 'Open',        cls: 'adm-badge--red'   },
  'in-progress': { label: 'In progress', cls: 'adm-badge--blue'  },
  'resolved':    { label: 'Resolved',    cls: 'adm-badge--green' },
};
function badge(status, map) {
  const entry = map[status] || { label: status, cls: 'adm-badge--gray' };
  return `<span class="adm-badge ${entry.cls}">${escHtml(entry.label)}</span>`;
}

// Toast notification (single instance, appended to body if not present)
function showToast(msg, type = 'success') {
  let t = document.getElementById('portal-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'portal-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = `adm-toast adm-toast--${type} adm-toast--visible`;
  clearTimeout(t._tmr);
  t._tmr = setTimeout(() => t.classList.remove('adm-toast--visible'), 3000);
}

// Send email notification via edge function (best-effort, no throw)
async function sendNotification(type, to, data) {
  try {
    await nexaSupabase.functions.invoke('send-notification', {
      body: { type, to, data },
    });
  } catch (_) {}
}
