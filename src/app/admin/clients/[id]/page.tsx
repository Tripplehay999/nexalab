'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useAdmin } from '@/lib/useAdmin';
import { createClient } from '@/lib/supabase/client';
import { sendNotification, timeAgo } from '@/lib/utils';
import {
  ASSIGNMENT_ROLES, LINK_CATEGORIES, METRICS, PROJECT_STATUS, deleteLink, fetchGoals, fetchLinks, fetchMetrics, fetchTeam,
  formatMetric, groupMetrics, hostOf, metricDef, normalizeUrl, slug, SOURCE_LABEL,
} from '@/lib/portal';
import type { Activity, Assignment, ClientLink, Deliverable, Goal, Metric, Milestone, MilestoneTask, Profile, Project, Staff } from '@/lib/types';
import AdminShell from '@/components/portal/AdminShell';
import { PortalLoading } from '@/components/portal/ClientShell';
import WebsiteCard from '@/components/portal/WebsiteCard';
import Avatar from '@/components/portal/Avatar';
import Icon from '@/components/portal/Icon';
import { LineChart } from '@/components/portal/Charts';
import AnalyticsConnections from '@/components/portal/AnalyticsConnections';
import FileDropzone from '@/components/portal/FileDropzone';
import ResourceRow from '@/components/portal/ResourceRow';

const TABS = ['overview', 'team', 'project', 'deliverables', 'insights', 'resources', 'activity'] as const;
type Tab = (typeof TABS)[number];
const today = () => new Date().toISOString().slice(0, 10);
const shortDate = (d: string | null) => (d ? new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

async function loadClient(id: string) {
  const supabase = createClient();
  const [{ data: profile }, { data: project }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).single(),
    supabase.from('projects').select('*').eq('client_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  return { profile: profile as Profile | null, project: project as Project | null };
}

function ClientDetail() {
  const { boot, loading } = useAdmin();
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const id = params.id;
  const tab = (TABS.includes(search.get('tab') as Tab) ? search.get('tab') : 'overview') as Tab;
  const [state, setState] = useState<{ profile: Profile | null; project: Project | null } | null>(null);

  useEffect(() => {
    if (!boot) return;
    let cancelled = false;
    loadClient(id).then((s) => { if (!cancelled) setState(s); });
    return () => { cancelled = true; };
  }, [boot, id]);

  const reload = useCallback(() => { loadClient(id).then(setState); }, [id]);

  if (loading || !boot) return <PortalLoading />;
  if (state && !state.profile) {
    return <AdminShell boot={boot} title="Client not found"><Link href="/admin/clients" className="pt-btn pt-btn-ghost">← All clients</Link></AdminShell>;
  }

  const p = state?.profile;
  const project = state?.project ?? null;
  const st = project ? PROJECT_STATUS[project.status] : null;

  return (
    <AdminShell
      boot={boot}
      kicker={<Link href="/admin/clients" className="pt-link">← All clients</Link>}
      title={p ? <>{p.full_name || p.email} {p.company && <em>· {p.company}</em>}</> : 'Loading…'}
      subtitle={p ? `${p.email ?? ''}${p.phone ? ` · ${p.phone}` : ''} · joined ${timeAgo(p.created_at)}` : undefined}
      actions={st && <span className={`pt-pill tone-${st.tone}`}>{st.label}</span>}
    >
      <div className="pt-tabbar" role="tablist" aria-label="Client sections">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'is-active' : ''} onClick={() => router.replace(`/admin/clients/${id}?tab=${t}`, { scroll: false })} style={{ textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      {!p ? <p className="pt-muted">Loading…</p> : (
        <>
          {tab === 'overview' && <OverviewTab profile={p} onSaved={reload} />}
          {tab === 'team' && <TeamTab clientId={id} />}
          {tab === 'project' && <ProjectTab client={p} project={project} onChanged={reload} />}
          {tab === 'deliverables' && <DeliverablesTab project={project} />}
          {tab === 'insights' && <InsightsTab clientId={id} />}
          {tab === 'resources' && <ResourcesTab clientId={id} />}
          {tab === 'activity' && <ActivityTab project={project} />}
        </>
      )}
    </AdminShell>
  );
}

// ── Overview ────────────────────────────────────────────────────────────────
function OverviewTab({ profile, onSaved }: { profile: Profile; onSaved: () => void }) {
  const ob = (profile.onboarding ?? {}) as { answers?: Record<string, unknown> };
  const a = ob.answers ?? {};
  const [site, setSite] = useState({ website: profile.website ?? String(a.website ?? ''), platform: profile.platform ?? String(a.platform ?? '') });
  const [saved, setSaved] = useState(false);

  async function saveSite(e: React.FormEvent) {
    e.preventDefault();
    await createClient().from('profiles').update({ website: site.website ? normalizeUrl(site.website) : null, platform: site.platform || null }).eq('id', profile.id);
    setSaved(true);
    onSaved();
  }

  const rows: [string, unknown][] = [
    ['Role', profile.job_title ?? a.jobTitle], ['Phone', profile.phone ?? a.phone], ['Revenue', a.revenue], ['Budget', a.budget], ['Timeline', a.timeline],
    ['Services', Array.isArray(a.services) ? a.services.join(', ') : ''], ['Goal', a.goal || a.projectNotes],
    ['Kickoff', [Array.isArray(a.days) ? a.days.join(', ') : '', Array.isArray(a.times) ? a.times.join(', ') : '', a.timezone, a.channel].filter(Boolean).join(' · ')],
    ['Notes', a.notes],
  ];

  return (
    <div className="pt-grid pt-grid-main">
      <section className="pt-card">
        <div className="pt-card-head">
          <div><h2 className="pt-card-title">Onboarding answers</h2><p className="pt-card-sub">{profile.onboarded_at ? `Completed ${shortDate(profile.onboarded_at)}` : 'Not finished yet'}</p></div>
        </div>
        <ul className="pt-list">
          {rows.map(([k, v]) => (
            <li key={k} className="pt-row" style={{ alignItems: 'flex-start' }}>
              <span className="pt-muted pt-small" style={{ width: 90, flexShrink: 0, paddingTop: 2 }}>{k}</span>
              <span className="pt-row-main" style={{ whiteSpace: 'pre-wrap' }}>{v ? String(v) : <span className="pt-muted">—</span>}</span>
            </li>
          ))}
        </ul>
      </section>
      <aside className="pt-stack">
        <WebsiteCard website={profile.website} platform={profile.platform} clientId={profile.id} />
        <section className="pt-card">
          <h2 className="pt-card-title">Website details</h2>
          <form className="pt-form" onSubmit={saveSite} style={{ marginTop: '0.8rem' }}>
            <label className="pt-field">Website<input value={site.website} onChange={(e) => { setSite({ ...site, website: e.target.value }); setSaved(false); }} placeholder="brand.com" /></label>
            <label className="pt-field">Platform<input value={site.platform} onChange={(e) => { setSite({ ...site, platform: e.target.value }); setSaved(false); }} placeholder="shopify" /></label>
            {saved && <p className="pt-success">Saved.</p>}
            <button className="pt-btn pt-btn-ink pt-btn-sm" style={{ justifySelf: 'start' }}>Save</button>
          </form>
        </section>
      </aside>
    </div>
  );
}

// ── Team ────────────────────────────────────────────────────────────────────
function TeamTab({ clientId }: { clientId: string }) {
  const [team, setTeam] = useState<Assignment[] | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [form, setForm] = useState({ staffId: '', role: 'Account lead', primary: true });
  const [error, setError] = useState('');

  const load = useCallback(() => {
    Promise.all([fetchTeam(clientId), createClient().from('staff').select('*').eq('is_active', true).order('full_name')])
      .then(([t, s]) => { setTeam(t); setStaff((s.data ?? []) as Staff[]); });
  }, [clientId]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchTeam(clientId), createClient().from('staff').select('*').eq('is_active', true).order('full_name')])
      .then(([t, s]) => { if (!cancelled) { setTeam(t); setStaff((s.data ?? []) as Staff[]); } });
    return () => { cancelled = true; };
  }, [clientId]);

  const available = staff.filter((s) => !(team ?? []).some((a) => a.staff_id === s.id));

  async function clearPrimary() {
    await createClient().from('client_assignments').update({ is_primary: false }).eq('client_id', clientId);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const staffId = form.staffId || available[0]?.id;
    if (!staffId) { setError('Everyone on the team is already assigned.'); return; }
    setError('');
    if (form.primary) await clearPrimary();
    const { error: err } = await createClient().from('client_assignments').insert({ client_id: clientId, staff_id: staffId, role: form.role, is_primary: form.primary });
    if (err) { setError(err.message); return; }
    setForm({ staffId: '', role: 'Developer', primary: false });
    load();
  }

  async function update(a: Assignment, patch: Partial<Pick<Assignment, 'role' | 'is_primary'>>) {
    if (patch.is_primary) await clearPrimary();
    await createClient().from('client_assignments').update(patch).eq('id', a.id);
    load();
  }

  async function remove(a: Assignment) {
    await createClient().from('client_assignments').delete().eq('id', a.id);
    load();
  }

  return (
    <div className="pt-grid pt-grid-main">
      <section className="pt-card">
        <div className="pt-card-head"><div><h2 className="pt-card-title">Assigned team</h2><p className="pt-card-sub">The client sees these people on their dashboard. The lead is featured in their sidebar.</p></div></div>
        {team === null ? <p className="pt-muted">Loading…</p> : team.length === 0 ? (
          <div className="pt-empty"><span className="pt-empty-icon">🤝</span><h3>No one assigned yet</h3><p>Start with an account lead — the client’s main point of contact.</p></div>
        ) : (
          <ul className="pt-list">
            {team.map((a) => (
              <li key={a.id} className="pt-row" style={{ flexWrap: 'wrap' }}>
                <div className="pt-person" style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <Avatar name={a.staff!.full_name} src={a.staff!.photo_url} size={44} />
                  <div><strong>{a.staff!.full_name}{a.is_primary && <span className="pt-pill tone-lime" style={{ marginLeft: 6, fontSize: '0.66rem' }}>Lead</span>}</strong><span>{a.staff!.title}</span></div>
                </div>
                <select className="pt-input" value={a.role} onChange={(e) => update(a, { role: e.target.value })} style={{ width: 'auto', minHeight: 36 }} aria-label="Role on this account">
                  {[...new Set([a.role, ...ASSIGNMENT_ROLES])].map((r) => <option key={r}>{r}</option>)}
                </select>
                {!a.is_primary && <button className="pt-btn pt-btn-ghost pt-btn-sm" onClick={() => update(a, { is_primary: true })}>Make lead</button>}
                <button className="pt-icon-btn" onClick={() => remove(a)} aria-label={`Unassign ${a.staff!.full_name}`}><Icon name="close" size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <aside className="pt-card">
        <h2 className="pt-card-title">Assign someone</h2>
        {staff.length === 0 ? (
          <p className="pt-muted" style={{ marginTop: '0.5rem' }}>Add team members first in <Link href="/admin/team" className="pt-link">Team</Link>.</p>
        ) : (
          <form className="pt-form" onSubmit={add} style={{ marginTop: '0.8rem' }}>
            <label className="pt-field">Team member
              <select value={form.staffId || available[0]?.id || ''} onChange={(e) => setForm({ ...form, staffId: e.target.value })}>
                {available.length === 0 && <option value="">Everyone is assigned</option>}
                {available.map((s) => <option key={s.id} value={s.id}>{s.full_name} — {s.title}</option>)}
              </select>
            </label>
            <label className="pt-field">Role on this account
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ASSIGNMENT_ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>
            <label className="pt-check"><input type="checkbox" checked={form.primary} onChange={(e) => setForm({ ...form, primary: e.target.checked })} /> Make them the account lead</label>
            {error && <p className="pt-error">{error}</p>}
            <button className="pt-btn pt-btn-primary" disabled={available.length === 0}><Icon name="plus" size={16} /> Assign</button>
          </form>
        )}
      </aside>
    </div>
  );
}

// ── Project, milestones & tasks ─────────────────────────────────────────────
async function loadMilestones(projectId: string) {
  const supabase = createClient();
  const { data } = await supabase.from('milestones').select('*').eq('project_id', projectId).order('sort_order');
  const mils = (data ?? []) as Milestone[];
  if (mils.length) {
    const { data: tasks } = await supabase.from('milestone_tasks').select('*').in('milestone_id', mils.map((m) => m.id)).order('sort_order');
    mils.forEach((m) => { m.tasks = ((tasks ?? []) as MilestoneTask[]).filter((t) => t.milestone_id === m.id); });
  }
  return mils;
}

function ProjectTab({ client, project, onChanged }: { client: Profile; project: Project | null; onChanged: () => void }) {
  const [info, setInfo] = useState({ name: project?.name ?? `${client.company || client.full_name || 'Client'} project`, status: project?.status ?? 'active', plan: project?.plan ?? '', started_at: project?.started_at ?? today() });
  const [milestones, setMilestones] = useState<Milestone[] | null>(null);
  const [newMs, setNewMs] = useState({ name: '', due_date: '', description: '' });
  const [taskDraft, setTaskDraft] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!project) return;
    let cancelled = false;
    loadMilestones(project.id).then((m) => { if (!cancelled) setMilestones(m); });
    return () => { cancelled = true; };
  }, [project]);

  const reloadMs = () => project && loadMilestones(project.id).then(setMilestones);
  const supabase = createClient();

  async function saveProject(e: React.FormEvent) {
    e.preventDefault();
    const payload = { name: info.name.trim(), status: info.status, plan: info.plan || null, started_at: info.started_at || null };
    if (project) {
      await supabase.from('projects').update(payload).eq('id', project.id);
      if (project.status === 'pending' && info.status === 'active') {
        await supabase.from('activity').insert({ project_id: project.id, text: 'Project approved and activated.', color: 'green' });
        sendNotification('project_approved', { client_id: client.id, name: client.full_name ?? '', plan: info.plan });
      }
    } else {
      await supabase.from('projects').insert({ ...payload, client_id: client.id });
    }
    setMsg('Saved.');
    onChanged();
  }

  async function addMilestone(e: React.FormEvent) {
    e.preventDefault();
    if (!project || !newMs.name.trim()) return;
    await supabase.from('milestones').insert({ project_id: project.id, name: newMs.name.trim(), description: newMs.description.trim() || null, due_date: newMs.due_date || null, status: 'pending', sort_order: milestones?.length ?? 0 });
    setNewMs({ name: '', due_date: '', description: '' });
    reloadMs();
  }

  async function setMilestoneStatus(m: Milestone, status: string) {
    await supabase.from('milestones').update({ status }).eq('id', m.id);
    if (status === 'complete') await supabase.from('activity').insert({ project_id: project!.id, text: `Milestone complete: ${m.name}`, color: 'green' });
    if (status === 'active') await supabase.from('activity').insert({ project_id: project!.id, text: `Started: ${m.name}`, color: 'orange' });
    reloadMs();
  }

  async function removeMilestone(m: Milestone) {
    if (!window.confirm(`Delete “${m.name}” and its tasks?`)) return;
    await supabase.from('milestones').delete().eq('id', m.id);
    reloadMs();
  }

  async function addTask(m: Milestone) {
    const name = (taskDraft[m.id] ?? '').trim();
    if (!name) return;
    await supabase.from('milestone_tasks').insert({ milestone_id: m.id, name, status: 'pending', sort_order: m.tasks?.length ?? 0 });
    setTaskDraft({ ...taskDraft, [m.id]: '' });
    reloadMs();
  }

  async function cycleTask(t: MilestoneTask) {
    const next = t.status === 'pending' ? 'active' : t.status === 'active' ? 'done' : 'pending';
    await supabase.from('milestone_tasks').update({ status: next }).eq('id', t.id);
    reloadMs();
  }

  async function removeTask(t: MilestoneTask) {
    await supabase.from('milestone_tasks').delete().eq('id', t.id);
    reloadMs();
  }

  return (
    <div className="pt-grid pt-grid-main">
      <div className="pt-stack">
        {!project ? (
          <div className="pt-card pt-empty"><span className="pt-empty-icon">🗺️</span><h3>No project yet</h3><p>Create one with the form to start adding milestones, deliverables, and updates.</p></div>
        ) : milestones === null ? <p className="pt-muted">Loading…</p> : (
          <>
            {milestones.length === 0 && <div className="pt-card pt-empty"><span className="pt-empty-icon">🧭</span><h3>No milestones yet</h3><p>Add the first one — the client sees them on their Project page and home dashboard.</p></div>}
            {milestones.map((m, i) => (
              <section key={m.id} className="pt-card">
                <div className="pt-card-head" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <p className="pt-small pt-muted" style={{ margin: 0 }}>Milestone {i + 1} · due {shortDate(m.due_date)}</p>
                    <h3 className="pt-card-title" style={{ marginTop: 2 }}>{m.name}</h3>
                    {m.description && <p className="pt-muted pt-small" style={{ margin: '0.3rem 0 0' }}>{m.description}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {(['pending', 'active', 'complete'] as const).map((s) => (
                      <button key={s} className={`pt-btn pt-btn-sm ${m.status === s ? 'pt-btn-ink' : 'pt-btn-ghost'}`} onClick={() => setMilestoneStatus(m, s)}>{s === 'pending' ? 'Coming up' : s === 'active' ? 'In progress' : 'Complete'}</button>
                    ))}
                    <button className="pt-icon-btn" onClick={() => removeMilestone(m)} aria-label="Delete milestone"><Icon name="trash" size={15} /></button>
                  </div>
                </div>
                <ul className="pt-tasks" style={{ marginTop: 0 }}>
                  {(m.tasks ?? []).map((t) => (
                    <li key={t.id} className={`pt-task is-${t.status}`}>
                      <button className="pt-task-box" onClick={() => cycleTask(t)} aria-label={`Task status: ${t.status}. Click to change.`} title="Click to cycle: to do → in progress → done" style={{ cursor: 'pointer', background: t.status === 'done' ? '#2F9E6E' : t.status === 'active' ? 'rgba(255,90,54,0.15)' : 'transparent' }}>
                        {t.status === 'done' && <Icon name="check" size={12} />}
                      </button>
                      <span style={{ flex: 1 }}>{t.name}</span>
                      <button className="pt-link pt-small" onClick={() => removeTask(t)}>Remove</button>
                    </li>
                  ))}
                </ul>
                <form onSubmit={(e) => { e.preventDefault(); addTask(m); }} style={{ display: 'flex', gap: '0.4rem', marginTop: '0.7rem' }}>
                  <input className="pt-input" value={taskDraft[m.id] ?? ''} onChange={(e) => setTaskDraft({ ...taskDraft, [m.id]: e.target.value })} placeholder="Add a task…" style={{ minHeight: 36 }} />
                  <button className="pt-btn pt-btn-ghost pt-btn-sm">Add</button>
                </form>
              </section>
            ))}
          </>
        )}
      </div>

      <aside className="pt-stack">
        <section className="pt-card">
          <h2 className="pt-card-title">{project ? 'Project' : 'Create project'}</h2>
          <form className="pt-form" onSubmit={saveProject} style={{ marginTop: '0.8rem' }}>
            <label className="pt-field">Name<input value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} /></label>
            <div className="pt-form-row">
              <label className="pt-field">Status
                <select value={info.status} onChange={(e) => setInfo({ ...info, status: e.target.value })}>
                  {Object.entries(PROJECT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </label>
              <label className="pt-field">Plan
                <select value={info.plan} onChange={(e) => setInfo({ ...info, plan: e.target.value })}>
                  <option value="">—</option>{['Launch', 'Operate', 'Scale'].map((p) => <option key={p}>{p}</option>)}
                </select>
              </label>
            </div>
            <label className="pt-field">Start date<input type="date" value={info.started_at ?? ''} onChange={(e) => setInfo({ ...info, started_at: e.target.value })} /></label>
            {project?.status === 'pending' && info.status === 'active' && <p className="pt-small pt-muted" style={{ margin: 0 }}>Saving will email the client that their project is approved.</p>}
            {msg && <p className="pt-success">{msg}</p>}
            <button className="pt-btn pt-btn-ink">{project ? 'Save project' : 'Create project'}</button>
          </form>
        </section>
        {project && (
          <section className="pt-card">
            <h2 className="pt-card-title">Add milestone</h2>
            <form className="pt-form" onSubmit={addMilestone} style={{ marginTop: '0.8rem' }}>
              <label className="pt-field">Name<input value={newMs.name} onChange={(e) => setNewMs({ ...newMs, name: e.target.value })} placeholder="e.g. Design & approval" /></label>
              <label className="pt-field">Due date<input type="date" value={newMs.due_date} onChange={(e) => setNewMs({ ...newMs, due_date: e.target.value })} /></label>
              <label className="pt-field">Description <span className="pt-muted">(optional)</span><textarea rows={2} value={newMs.description} onChange={(e) => setNewMs({ ...newMs, description: e.target.value })} /></label>
              <button className="pt-btn pt-btn-primary"><Icon name="plus" size={16} /> Add milestone</button>
            </form>
          </section>
        )}
      </aside>
    </div>
  );
}

// ── Deliverables ────────────────────────────────────────────────────────────
function DeliverablesTab({ project }: { project: Project | null }) {
  const [items, setItems] = useState<Deliverable[] | null>(null);
  const [form, setForm] = useState({ name: '', type: 'document', url: '', meta: '', status: 'upcoming', due_date: '' });
  const pid = project?.id;

  useEffect(() => {
    if (!pid) return;
    let cancelled = false;
    createClient().from('deliverables').select('*').eq('project_id', pid).order('created_at', { ascending: false })
      .then(({ data }) => { if (!cancelled) setItems((data ?? []) as Deliverable[]); });
    return () => { cancelled = true; };
  }, [pid]);

  const reload = () => pid && createClient().from('deliverables').select('*').eq('project_id', pid).order('created_at', { ascending: false }).then(({ data }) => setItems((data ?? []) as Deliverable[]));

  if (!project) return <div className="pt-card pt-empty"><span className="pt-empty-icon">📦</span><h3>Create a project first</h3><p>Deliverables belong to a project — set one up in the Project tab.</p></div>;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const ready = form.status === 'ready';
    await createClient().from('deliverables').insert({
      project_id: project!.id, name: form.name.trim(), type: form.type, url: form.url ? normalizeUrl(form.url) : null, meta: form.meta.trim() || null,
      status: form.status, due_date: form.due_date || null, delivered_at: ready ? today() : null,
    });
    if (ready) await createClient().from('activity').insert({ project_id: project!.id, text: `New deliverable ready: ${form.name.trim()}`, color: 'purple' });
    setForm({ name: '', type: form.type, url: '', meta: '', status: 'upcoming', due_date: '' });
    reload();
  }

  async function markReady(d: Deliverable) {
    await createClient().from('deliverables').update({ status: 'ready', delivered_at: today() }).eq('id', d.id);
    await createClient().from('activity').insert({ project_id: project!.id, text: `New deliverable ready: ${d.name}`, color: 'purple' });
    reload();
  }

  async function remove(d: Deliverable) {
    await createClient().from('deliverables').delete().eq('id', d.id);
    reload();
  }

  return (
    <div className="pt-grid pt-grid-main">
      <section className="pt-card">
        <div className="pt-card-head"><h2 className="pt-card-title">Deliverables</h2></div>
        {items === null ? <p className="pt-muted">Loading…</p> : items.length === 0 ? <p className="pt-muted" style={{ margin: 0 }}>Nothing yet.</p> : (
          <ul className="pt-list">
            {items.map((d) => (
              <li key={d.id} className="pt-row">
                <div className="pt-row-main">
                  <p className="pt-row-title">{d.name}</p>
                  <p className="pt-row-sub">{d.type}{d.meta ? ` · ${d.meta}` : ''}{d.url ? ` · ${hostOf(d.url)}` : ''}{d.status === 'ready' ? ` · delivered ${shortDate(d.delivered_at)}` : d.due_date ? ` · due ${shortDate(d.due_date)}` : ''}</p>
                </div>
                {d.status === 'ready' ? <span className="pt-pill tone-lime">Ready</span> : <button className="pt-btn pt-btn-ghost pt-btn-sm" onClick={() => markReady(d)}>Mark ready</button>}
                <button className="pt-icon-btn" onClick={() => remove(d)} aria-label={`Delete ${d.name}`}><Icon name="trash" size={15} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <aside className="pt-card">
        <h2 className="pt-card-title">Add deliverable</h2>
        <form className="pt-form" onSubmit={add} style={{ marginTop: '0.8rem' }}>
          <label className="pt-field">Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Homepage design" /></label>
          <div className="pt-form-row">
            <label className="pt-field">Type
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {['document', 'design', 'repo', 'link', 'video'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="pt-field">Status
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="upcoming">Coming up</option><option value="ready">Ready now</option>
              </select>
            </label>
          </div>
          <label className="pt-field">Link<input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://figma.com/…" /></label>
          <label className="pt-field">Short note<input value={form.meta} onChange={(e) => setForm({ ...form, meta: e.target.value })} placeholder="e.g. Final v2 · PDF" /></label>
          {form.status !== 'ready' && <label className="pt-field">Expected<input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></label>}
          <button className="pt-btn pt-btn-primary"><Icon name="plus" size={16} /> Add</button>
        </form>
      </aside>
    </div>
  );
}

// ── Insights ────────────────────────────────────────────────────────────────
function InsightsTab({ clientId }: { clientId: string }) {
  const [metrics, setMetrics] = useState<Metric[] | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [form, setForm] = useState({ metric: 'revenue', custom: '', value: '', period: today(), note: '' });

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchMetrics(clientId), fetchGoals(clientId)]).then(([m, g]) => { if (!cancelled) { setMetrics(m); setGoals(g); } });
    return () => { cancelled = true; };
  }, [clientId]);

  const reload = () => Promise.all([fetchMetrics(clientId), fetchGoals(clientId)]).then(([m, g]) => { setMetrics(m); setGoals(g); });
  const grouped = groupMetrics(metrics ?? []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const isCustom = form.metric === '__custom';
    const key = isCustom ? slug(form.custom) : form.metric;
    const value = Number(form.value);
    if (!key || form.value === '' || Number.isNaN(value)) return;
    await createClient().from('client_metrics').insert({ client_id: clientId, metric: key, label: isCustom ? form.custom.trim() : null, value, period: form.period || today(), note: form.note.trim() || null, source: 'nexalab' });
    setForm({ ...form, value: '', note: '' });
    reload();
  }

  async function remove(id: string) {
    await createClient().from('client_metrics').delete().eq('id', id);
    reload();
  }

  return (
    <div className="pt-grid pt-grid-main">
      <div className="pt-stack">
        {metrics === null ? <p className="pt-muted">Loading…</p> : grouped.size === 0 ? (
          <div className="pt-card pt-empty"><span className="pt-empty-icon">📈</span><h3>No numbers yet</h3><p>Add figures on the client’s behalf — they appear instantly on their Insights page.</p></div>
        ) : [...grouped.entries()].map(([k, list]) => {
          const def = metricDef(k, list[0].label);
          return (
            <section key={k} className="pt-card">
              <div className="pt-card-head"><h2 className="pt-card-title">{def.label}</h2><span className="pt-pill">{list.length}</span></div>
              {list.length > 1 && <LineChart points={list.map((m) => ({ label: shortDate(m.period).replace(/, \d{4}$/, ''), value: Number(m.value) }))} color={def.color} format={(v) => formatMetric(k, v)} height={160} />}
              <ul className="pt-list" style={{ marginTop: '0.6rem' }}>
                {[...list].reverse().slice(0, 6).map((m) => (
                  <li key={m.id} className="pt-row">
                    <span className="pt-row-main">{shortDate(m.period)}{m.note ? <span className="pt-muted"> · {m.note}</span> : null}</span>
                    <strong>{formatMetric(k, m.value)}</strong>
                    <span className={`pt-pill ${m.source === 'manual' ? '' : 'tone-lime'}`}>{m.source === 'manual' ? 'Client' : SOURCE_LABEL[m.source] ?? m.source}</span>
                    <button className="pt-icon-btn" onClick={() => remove(m.id)} aria-label="Delete entry"><Icon name="trash" size={15} /></button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      <aside className="pt-stack">
        <AnalyticsConnections clientId={clientId} asAdmin onChange={reload} />
        <section className="pt-card">
          <h2 className="pt-card-title">Add a number</h2>
          <form className="pt-form" onSubmit={add} style={{ marginTop: '0.8rem' }}>
            <label className="pt-field">Metric
              <select value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })}>
                {METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                {[...grouped.keys()].filter((k) => !METRICS.some((m) => m.key === k)).map((k) => <option key={k} value={k}>{metricDef(k, grouped.get(k)![0].label).label}</option>)}
                <option value="__custom">+ Custom…</option>
              </select>
            </label>
            {form.metric === '__custom' && <label className="pt-field">Name<input value={form.custom} onChange={(e) => setForm({ ...form, custom: e.target.value })} /></label>}
            <div className="pt-form-row">
              <label className="pt-field">Value<input inputMode="decimal" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value.replace(/[^0-9.\-]/g, '') })} /></label>
              <label className="pt-field">Date<input type="date" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} /></label>
            </div>
            <label className="pt-field">Note<input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
            <button className="pt-btn pt-btn-primary"><Icon name="plus" size={16} /> Add</button>
          </form>
        </section>
        <section className="pt-card">
          <h2 className="pt-card-title">Client goals</h2>
          {goals.length === 0 ? <p className="pt-muted" style={{ margin: '0.5rem 0 0' }}>No goals set.</p> : (
            <ul className="pt-list" style={{ marginTop: '0.6rem' }}>
              {goals.map((g) => <li key={g.id} className="pt-row"><span className="pt-row-main">{g.label || metricDef(g.metric).label}</span><strong>{formatMetric(g.metric, g.target, { compact: true })}</strong></li>)}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}

// ── Resources ───────────────────────────────────────────────────────────────
function ResourcesTab({ clientId }: { clientId: string }) {
  const [links, setLinks] = useState<ClientLink[] | null>(null);
  const [form, setForm] = useState({ label: '', url: '', category: 'General' });
  const [uploadCategory, setUploadCategory] = useState('Files');

  useEffect(() => {
    let cancelled = false;
    fetchLinks(clientId).then((l) => { if (!cancelled) setLinks(l); });
    return () => { cancelled = true; };
  }, [clientId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label.trim() || !hostOf(form.url)) return;
    await createClient().from('client_links').insert({ client_id: clientId, label: form.label.trim(), url: normalizeUrl(form.url), category: form.category });
    setForm({ label: '', url: '', category: form.category });
    fetchLinks(clientId).then(setLinks);
  }

  async function remove(link: ClientLink) {
    await deleteLink(link);
    fetchLinks(clientId).then(setLinks);
  }

  return (
    <div className="pt-grid pt-grid-main">
      <section className="pt-card">
        <div className="pt-card-head"><h2 className="pt-card-title">Shared resources</h2></div>
        {links === null ? <p className="pt-muted">Loading…</p> : links.length === 0 ? <p className="pt-muted" style={{ margin: 0 }}>Nothing shared yet.</p> : (
          <ul className="pt-list">
            {links.map((l) => (
              <ResourceRow key={l.id} link={l} byYou={l.added_by !== clientId} canDelete onDelete={() => remove(l)} />
            ))}
          </ul>
        )}
      </section>
      <aside className="pt-stack">
      <section className="pt-card">
        <div className="pt-card-head">
          <h2 className="pt-card-title">Upload for client</h2>
          <select className="pt-input" value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)} style={{ width: 'auto', minHeight: 36 }} aria-label="Category">{LINK_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        </div>
        <FileDropzone clientId={clientId} category={uploadCategory} onUploaded={() => fetchLinks(clientId).then(setLinks)} onUrl={(url) => setForm({ ...form, url, label: form.label || hostOf(url) })} />
      </section>
      <section className="pt-card">
        <h2 className="pt-card-title">Share a link</h2>
        <form className="pt-form" onSubmit={add} style={{ marginTop: '0.8rem' }}>
          <label className="pt-field">Name<input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Staging site" /></label>
          <label className="pt-field">Link<input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></label>
          <label className="pt-field">Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{LINK_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
          <button className="pt-btn pt-btn-primary"><Icon name="plus" size={16} /> Share</button>
        </form>
      </section>
      </aside>
    </div>
  );
}

// ── Activity ────────────────────────────────────────────────────────────────
function ActivityTab({ project }: { project: Project | null }) {
  const [items, setItems] = useState<Activity[] | null>(null);
  const [text, setText] = useState('');
  const [color, setColor] = useState('blue');
  const pid = project?.id;

  useEffect(() => {
    if (!pid) return;
    let cancelled = false;
    createClient().from('activity').select('*').eq('project_id', pid).order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => { if (!cancelled) setItems((data ?? []) as Activity[]); });
    return () => { cancelled = true; };
  }, [pid]);

  if (!project) return <div className="pt-card pt-empty"><span className="pt-empty-icon">📝</span><h3>Create a project first</h3><p>Updates are posted to a project’s feed.</p></div>;

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await createClient().from('activity').insert({ project_id: project!.id, text: text.trim(), color });
    setText('');
    createClient().from('activity').select('*').eq('project_id', project!.id).order('created_at', { ascending: false }).limit(50).then(({ data }) => setItems((data ?? []) as Activity[]));
  }

  return (
    <div className="pt-grid pt-grid-main">
      <section className="pt-card">
        <div className="pt-card-head"><div><h2 className="pt-card-title">Activity feed</h2><p className="pt-card-sub">What the client sees under “What’s been happening”.</p></div></div>
        {items === null ? <p className="pt-muted">Loading…</p> : items.length === 0 ? <p className="pt-muted" style={{ margin: 0 }}>No updates yet.</p> : (
          <ul className="pt-feed">{items.map((a) => <li key={a.id}><span className={`pt-feed-dot ${a.color}`} /><div><p>{a.text}</p><time>{timeAgo(a.created_at)}</time></div></li>)}</ul>
        )}
      </section>
      <aside className="pt-card">
        <h2 className="pt-card-title">Post an update</h2>
        <form className="pt-form" onSubmit={post} style={{ marginTop: '0.8rem' }}>
          <label className="pt-field">Update<textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Checkout redesign is live on staging — have a look!" maxLength={240} /></label>
          <label className="pt-field">Color
            <select value={color} onChange={(e) => setColor(e.target.value)}>
              <option value="blue">Blue — general update</option><option value="green">Green — something finished</option>
              <option value="orange">Orange — work started</option><option value="purple">Purple — something to review</option>
            </select>
          </label>
          <button className="pt-btn pt-btn-primary">Post update</button>
        </form>
      </aside>
    </div>
  );
}

export default function ClientDetailPage() {
  return (
    <Suspense fallback={<PortalLoading />}>
      <ClientDetail />
    </Suspense>
  );
}
