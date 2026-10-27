'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDashboard } from '@/lib/useDashboard';
import { createClient } from '@/lib/supabase/client';
import { METRICS, SOURCE_LABEL, fetchGoals, fetchMetrics, formatMetric, groupMetrics, metricDef, slug, trend } from '@/lib/portal';
import type { Goal, Metric, StoreMetric } from '@/lib/types';
import ClientShell, { PortalLoading } from '@/components/portal/ClientShell';
import Icon from '@/components/portal/Icon';
import AnalyticsConnections from '@/components/portal/AnalyticsConnections';
import SiteTracker from '@/components/portal/SiteTracker';
import { LineChart, Progress } from '@/components/portal/Charts';

type Data = { metrics: Metric[]; goals: Goal[]; store: StoreMetric[] };

async function loadInsights(clientId: string): Promise<Data> {
  const [metrics, goals, storeRes] = await Promise.all([
    fetchMetrics(clientId),
    fetchGoals(clientId),
    createClient().from('store_metrics').select('*').eq('client_id', clientId).order('date', { ascending: false }).limit(30),
  ]);
  return { metrics, goals, store: ((storeRes.data ?? []) as StoreMetric[]).reverse() };
}

const today = () => new Date().toISOString().slice(0, 10);
const shortDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default function InsightsPage() {
  const { boot, loading } = useDashboard();
  const [data, setData] = useState<Data | null>(null);
  const [selected, setSelected] = useState('revenue');
  const [form, setForm] = useState({ metric: 'revenue', custom: '', value: '', period: today(), note: '' });
  const [goalForm, setGoalForm] = useState({ metric: 'revenue', target: '', due: '' });
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const userId = boot?.userId;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    loadInsights(userId).then((d) => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, [userId]);

  const reload = () => userId && loadInsights(userId).then(setData);
  const grouped = useMemo(() => groupMetrics(data?.metrics ?? []), [data]);
  const customKeys = [...grouped.keys()].filter((k) => !METRICS.some((m) => m.key === k));
  const allKeys = [...METRICS.map((m) => m.key), ...customKeys];

  if (loading || !boot) return <PortalLoading />;

  const list = grouped.get(selected) ?? [];
  const def = metricDef(selected, list[0]?.label);
  const { latest, change } = trend(list);
  const best = list.length ? Math.max(...list.map((m) => Number(m.value))) : null;

  async function addMetric(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(form.value);
    const isCustom = form.metric === '__custom';
    const key = isCustom ? slug(form.custom) : form.metric;
    if (isCustom && !key) { setMsg({ kind: 'err', text: 'Give your custom metric a name.' }); return; }
    if (form.value === '' || Number.isNaN(value)) { setMsg({ kind: 'err', text: 'Enter a number.' }); return; }
    setSaving(true);
    const { error } = await createClient().from('client_metrics').insert({
      client_id: boot!.userId, metric: key, label: isCustom ? form.custom.trim() : null,
      value, period: form.period || today(), note: form.note.trim() || null, source: 'manual',
    });
    setSaving(false);
    if (error) { setMsg({ kind: 'err', text: 'Couldn’t save that — please try again.' }); return; }
    setMsg({ kind: 'ok', text: `Added ${metricDef(key, form.custom).label}: ${formatMetric(key, value)}` });
    setForm({ ...form, value: '', note: '' });
    setSelected(key);
    reload();
  }

  async function removeMetric(id: string) {
    await createClient().from('client_metrics').delete().eq('id', id);
    reload();
  }

  async function addGoal(e: React.FormEvent) {
    e.preventDefault();
    const target = Number(goalForm.target);
    if (!goalForm.target || Number.isNaN(target)) return;
    await createClient().from('client_goals').insert({
      client_id: boot!.userId, metric: goalForm.metric, label: metricDef(goalForm.metric, grouped.get(goalForm.metric)?.[0]?.label).label,
      target, due_date: goalForm.due || null,
    });
    setGoalForm({ ...goalForm, target: '', due: '' });
    reload();
  }

  async function removeGoal(id: string) {
    await createClient().from('client_goals').delete().eq('id', id);
    reload();
  }

  return (
    <ClientShell
      boot={boot}
      kicker="Insights"
      title={<>How your store is <em>doing.</em></>}
      subtitle="Connect Google Analytics or Plausible and your numbers update every day — or add them yourself. Your team adds theirs too, and everything charts here."
    >
      <div className="pt-tabbar" role="tablist" aria-label="Choose a metric">
        {allKeys.map((k) => (
          <button key={k} role="tab" aria-selected={selected === k} className={selected === k ? 'is-active' : ''} onClick={() => setSelected(k)}>
            {metricDef(k, grouped.get(k)?.[0]?.label).label}{grouped.has(k) ? '' : ' ·'}
          </button>
        ))}
      </div>

      <div className="pt-grid pt-grid-main">
        <div className="pt-stack">
          <SiteTracker clientId={boot.userId} siteUrl={boot.profile.website} />
          <section className="pt-card">
            <div className="pt-card-head">
              <div>
                <h2 className="pt-card-title">{def.label}</h2>
                <p className="pt-card-sub">{def.hint}</p>
              </div>
              {latest && <span className="pt-pill">{list.length} entr{list.length === 1 ? 'y' : 'ies'}</span>}
            </div>
            {list.length === 0 ? (
              <div className="pt-empty">
                <span className="pt-empty-icon">📊</span>
                <h3>No {def.label.toLowerCase()} yet</h3>
                <p>Add your first figure using the form — once there are two or more, you’ll see the trend.</p>
              </div>
            ) : (
              <>
                <div className="pt-grid pt-grid-3" style={{ marginBottom: '1rem' }}>
                  <div className="pt-metric"><span className="pt-metric-label">Latest</span><span className="pt-metric-value">{formatMetric(selected, latest!.value, { compact: true })}</span><span className="pt-small pt-muted">{shortDate(latest!.period)}</span></div>
                  <div className="pt-metric"><span className="pt-metric-label">Change</span><span className={`pt-metric-value ${change === null ? '' : change >= 0 ? 'pt-up' : 'pt-down'}`}>{change === null ? '—' : `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`}</span><span className="pt-small pt-muted">vs previous entry</span></div>
                  <div className="pt-metric"><span className="pt-metric-label">Best</span><span className="pt-metric-value">{best === null ? '—' : formatMetric(selected, best, { compact: true })}</span><span className="pt-small pt-muted">all time</span></div>
                </div>
                <LineChart points={list.map((m) => ({ label: shortDate(m.period), value: Number(m.value) }))} color={def.color} format={(v) => formatMetric(selected, v)} />
              </>
            )}
          </section>

          {list.length > 0 && (
            <section className="pt-card pt-card-flush">
              <div className="pt-card-head" style={{ padding: '1.1rem 1.2rem 0' }}><h2 className="pt-card-title">History</h2></div>
              <div className="pt-table-wrap">
                <table className="pt-table">
                  <thead><tr><th>Date</th><th>Value</th><th>Note</th><th>Added by</th><th aria-label="Actions" /></tr></thead>
                  <tbody>
                    {[...list].reverse().map((m) => (
                      <tr key={m.id}>
                        <td>{shortDate(m.period)}</td>
                        <td className="pt-strong">{formatMetric(selected, m.value)}</td>
                        <td className="pt-muted">{m.note || '—'}</td>
                        <td><span className={`pt-pill ${m.source === 'manual' ? '' : 'tone-lime'}`}>{m.source === 'manual' ? (m.created_by === boot.userId ? 'You' : 'NexaLab') : SOURCE_LABEL[m.source] ?? m.source}</span></td>
                        <td style={{ textAlign: 'right' }}>
                          {m.created_by === boot.userId && m.source === 'manual' && (
                            <button className="pt-icon-btn" onClick={() => removeMetric(m.id)} aria-label="Delete entry" title="Delete"><Icon name="trash" size={16} /></button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {data && data.store.length > 0 && (
            <section className="pt-card">
              <div className="pt-card-head">
                <div><h2 className="pt-card-title">Synced from your store</h2><p className="pt-card-sub">Daily revenue, updated automatically every 15 minutes.</p></div>
              </div>
              <LineChart points={data.store.map((s) => ({ label: shortDate(s.date), value: Number(s.revenue) }))} color="#103B2F" format={(v) => formatMetric('revenue', v)} height={180} />
            </section>
          )}
        </div>

        <aside className="pt-stack">
          <AnalyticsConnections clientId={boot.userId} onChange={reload} />

          <section className="pt-card">
            <h2 className="pt-card-title">Add numbers manually</h2>
            <p className="pt-card-sub" style={{ marginBottom: '1rem' }}>Rough figures are totally fine.</p>
            <form className="pt-form" onSubmit={addMetric}>
              <label className="pt-field">What are you adding?
                <select value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })}>
                  {METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                  {customKeys.map((k) => <option key={k} value={k}>{metricDef(k, grouped.get(k)?.[0]?.label).label}</option>)}
                  <option value="__custom">+ Something else…</option>
                </select>
              </label>
              {form.metric === '__custom' && (
                <label className="pt-field">Name it<input value={form.custom} onChange={(e) => setForm({ ...form, custom: e.target.value })} placeholder="e.g. Returns, Instagram followers" maxLength={40} /></label>
              )}
              <div className="pt-form-row">
                <label className="pt-field">Value<input inputMode="decimal" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value.replace(/[^0-9.\-]/g, '') })} placeholder={metricDef(form.metric).unit === 'percent' ? 'e.g. 2.4' : 'e.g. 12500'} /></label>
                <label className="pt-field">For date<input type="date" value={form.period} max={today()} onChange={(e) => setForm({ ...form, period: e.target.value })} /></label>
              </div>
              <label className="pt-field">Note <span className="pt-muted">(optional)</span><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. Black Friday week" maxLength={120} /></label>
              {msg && <p className={msg.kind === 'ok' ? 'pt-success' : 'pt-error'}>{msg.text}</p>}
              <button className="pt-btn pt-btn-primary" disabled={saving}><Icon name="plus" size={16} /> {saving ? 'Saving…' : 'Add'}</button>
            </form>
          </section>

          <section className="pt-card">
            <h2 className="pt-card-title">Goals</h2>
            <p className="pt-card-sub" style={{ marginBottom: '1rem' }}>Set a target and we’ll track progress against your latest number.</p>
            {(data?.goals ?? []).length > 0 && (
              <ul className="pt-list" style={{ marginBottom: '1rem' }}>
                {data!.goals.map((g) => {
                  const cur = trend(grouped.get(g.metric) ?? []).latest;
                  const pct = cur ? (Number(cur.value) / Number(g.target)) * 100 : 0;
                  return (
                    <li key={g.id} className="pt-row" style={{ display: 'block' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.4rem' }}>
                        <span className="pt-strong">{g.label || metricDef(g.metric).label}</span>
                        <button className="pt-link pt-small" onClick={() => removeGoal(g.id)}>Remove</button>
                      </div>
                      <Progress value={pct} tone={pct >= 100 ? 'forest' : 'tomato'} />
                      <p className="pt-small pt-muted" style={{ margin: '0.35rem 0 0' }}>
                        {cur ? formatMetric(g.metric, cur.value, { compact: true }) : 'No data yet'} of {formatMetric(g.metric, g.target, { compact: true })}
                        {g.due_date ? ` · by ${shortDate(g.due_date)}` : ''}{pct >= 100 ? ' · 🎉 reached!' : ''}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
            <form className="pt-form" onSubmit={addGoal}>
              <label className="pt-field">Metric
                <select value={goalForm.metric} onChange={(e) => setGoalForm({ ...goalForm, metric: e.target.value })}>
                  {allKeys.map((k) => <option key={k} value={k}>{metricDef(k, grouped.get(k)?.[0]?.label).label}</option>)}
                </select>
              </label>
              <div className="pt-form-row">
                <label className="pt-field">Target<input inputMode="decimal" value={goalForm.target} onChange={(e) => setGoalForm({ ...goalForm, target: e.target.value.replace(/[^0-9.]/g, '') })} placeholder="e.g. 50000" /></label>
                <label className="pt-field">By <span className="pt-muted">(optional)</span><input type="date" value={goalForm.due} onChange={(e) => setGoalForm({ ...goalForm, due: e.target.value })} /></label>
              </div>
              <button className="pt-btn pt-btn-ghost"><Icon name="flag" size={16} /> Set goal</button>
            </form>
          </section>
        </aside>
      </div>
    </ClientShell>
  );
}
