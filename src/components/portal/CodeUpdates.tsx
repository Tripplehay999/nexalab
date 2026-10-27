'use client';

import { useEffect, useState } from 'react';
import { safeHref } from '@/lib/net';
import { timeAgo } from '@/lib/utils';
import Icon from './Icon';

type Activity = {
  repo: string | null; url?: string; private?: boolean; error?: string;
  commits?: { sha: string; url: string; message: string; author: string; avatar: string | null; date: string }[];
  deployment?: { environment: string; state: string; date: string; url: string | null } | null;
};

const DEPLOY_TONE: Record<string, string> = { success: 'tone-lime', failure: 'tone-rose', error: 'tone-rose', in_progress: 'tone-sun', queued: 'tone-sun', pending: 'tone-sun', inactive: '' };

// Linked GitHub repo: latest deployment + recent commits (custom-built sites).
export default function CodeUpdates({ clientId, asAdmin = false }: { clientId: string; asAdmin?: boolean }) {
  const [data, setData] = useState<Activity | null>(null);
  const [form, setForm] = useState({ open: false, repo: '', token: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const q = asAdmin ? `?client=${clientId}` : '';

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/integrations/github/activity${q}`).then((r) => r.json()).then((j) => { if (!cancelled) setData(j); }).catch(() => { if (!cancelled) setData({ repo: null }); });
    return () => { cancelled = true; };
  }, [q]);

  const reload = () => fetch(`/api/integrations/github/activity${q}`).then((r) => r.json()).then(setData);

  async function call(body: Record<string, unknown>) {
    setBusy(true); setErr('');
    const res = await fetch('/api/integrations/github', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, client: asAdmin ? clientId : undefined }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(j.error || 'Something went wrong'); return; }
    setForm({ open: false, repo: '', token: '' });
    reload();
  }

  if (data === null) return null;

  if (!data.repo) {
    return (
      <section className="pt-card">
        <div className="pt-card-head">
          <div><h2 className="pt-card-title">Code updates</h2><p className="pt-card-sub">Custom-built site? Link its GitHub repo to follow every update.</p></div>
          {!form.open && <button className="pt-btn pt-btn-ghost pt-btn-sm" onClick={() => setForm({ ...form, open: true })}><Icon name="plus" size={15} /> Link repo</button>}
        </div>
        {form.open && (
          <form className="pt-form" onSubmit={(e) => { e.preventDefault(); call({ action: 'connect', repo: form.repo, token: form.token }); }}>
            <label className="pt-field">Repository<input value={form.repo} onChange={(e) => setForm({ ...form, repo: e.target.value })} placeholder="github.com/your-team/your-site" /></label>
            <label className="pt-field">Access token <span className="pt-muted">(private repos only)</span>
              <input type="password" value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} placeholder="github_pat_…" autoComplete="off" />
            </label>
            <p className="pt-small pt-muted" style={{ margin: 0 }}>
              Create a <a className="pt-link" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">fine-grained token</a> for just this repo with read-only <em>Contents</em>, <em>Metadata</em> and <em>Deployments</em>.
            </p>
            {err && <p className="pt-error">{err}</p>}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="pt-btn pt-btn-primary pt-btn-sm" disabled={busy}>{busy ? 'Checking…' : 'Link repo'}</button>
              <button type="button" className="pt-link" onClick={() => setForm({ open: false, repo: '', token: '' })}>Cancel</button>
            </div>
          </form>
        )}
      </section>
    );
  }

  return (
    <section className="pt-card">
      <div className="pt-card-head">
        <div>
          <h2 className="pt-card-title">Code updates</h2>
          <a className="pt-card-sub pt-link" href={safeHref(data.url)} target="_blank" rel="noopener noreferrer">{data.repo}{data.private ? ' · private' : ''}</a>
        </div>
        {data.deployment && (
          <span className={`pt-pill ${DEPLOY_TONE[data.deployment.state] ?? ''}`} title={`${data.deployment.environment} · ${timeAgo(data.deployment.date)}`}>
            {data.deployment.state === 'success' ? 'Deployed' : data.deployment.state.replace('_', ' ')} · {data.deployment.environment}
          </span>
        )}
      </div>
      {data.error ? <p className="pt-error">{data.error}</p> : (
        <ul className="pt-list">
          {(data.commits ?? []).map((c) => (
            <li key={c.sha} className="pt-row">
              {c.avatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={c.avatar} alt="" width={30} height={30} className="pt-avatar" style={{ width: 30, height: 30 }} />
                : <span className="pt-row-icon" style={{ width: 30, height: 30 }}>💾</span>}
              <div className="pt-row-main">
                <a href={safeHref(c.url)} target="_blank" rel="noopener noreferrer" className="pt-row-title" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.message}</a>
                <p className="pt-row-sub">{c.author} · {timeAgo(c.date)} · <code>{c.sha}</code></p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button className="pt-link pt-small" style={{ marginTop: '0.8rem' }} onClick={() => window.confirm('Unlink this repo?') && call({ action: 'disconnect' })}>Unlink repo</button>
    </section>
  );
}
