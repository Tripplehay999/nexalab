'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '@/lib/useAdmin';
import { createClient } from '@/lib/supabase/client';
import type { Staff } from '@/lib/types';
import AdminShell from '@/components/portal/AdminShell';
import { PortalLoading } from '@/components/portal/ClientShell';
import Avatar from '@/components/portal/Avatar';
import Icon from '@/components/portal/Icon';

type Member = Staff & { clients: number };
const EMPTY = { full_name: '', title: '', email: '', phone: '', photo_url: '', city: '', bio: '', is_active: true };

async function loadTeam(): Promise<Member[]> {
  const supabase = createClient();
  const [staff, assigns] = await Promise.all([
    supabase.from('staff').select('*').order('is_active', { ascending: false }).order('full_name'),
    supabase.from('client_assignments').select('staff_id'),
  ]);
  const counts = new Map<string, number>();
  (assigns.data ?? []).forEach((a: { staff_id: string }) => counts.set(a.staff_id, (counts.get(a.staff_id) ?? 0) + 1));
  return ((staff.data ?? []) as Staff[]).map((s) => ({ ...s, clients: counts.get(s.id) ?? 0 }));
}

export default function AdminTeamPage() {
  const { boot, loading } = useAdmin();
  const [team, setTeam] = useState<Member[] | null>(null);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!boot) return;
    let cancelled = false;
    loadTeam().then((t) => { if (!cancelled) setTeam(t); });
    return () => { cancelled = true; };
  }, [boot]);

  if (loading || !boot) return <PortalLoading />;

  function startEdit(m?: Member) {
    setError('');
    setEditing(m ? m.id : 'new');
    setForm(m ? { full_name: m.full_name, title: m.title, email: m.email ?? '', phone: m.phone ?? '', photo_url: m.photo_url ?? '', city: m.city ?? '', bio: m.bio ?? '', is_active: m.is_active } : EMPTY);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim() || !form.title.trim()) { setError('Name and role are required.'); return; }
    setSaving(true);
    const payload = {
      full_name: form.full_name.trim(), title: form.title.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null,
      photo_url: form.photo_url.trim() || null, city: form.city.trim() || null, bio: form.bio.trim() || null, is_active: form.is_active,
    };
    const supabase = createClient();
    const { error: err } = editing === 'new'
      ? await supabase.from('staff').insert(payload)
      : await supabase.from('staff').update(payload).eq('id', editing!);
    setSaving(false);
    if (err) { setError(err.message); return; }
    setEditing(null);
    loadTeam().then(setTeam);
  }

  async function remove(m: Member) {
    if (!window.confirm(`Remove ${m.full_name}? They’ll be unassigned from ${m.clients} client${m.clients === 1 ? '' : 's'}. To keep their history, mark them inactive instead.`)) return;
    await createClient().from('staff').delete().eq('id', m.id);
    setEditing(null);
    loadTeam().then(setTeam);
  }

  const editor = (
    <section className="pt-card">
      <div className="pt-card-head"><h2 className="pt-card-title">{editing === 'new' ? 'Add a team member' : 'Edit team member'}</h2><button className="pt-link" onClick={() => setEditing(null)}>Cancel</button></div>
      <form className="pt-form" onSubmit={save}>
        <div className="pt-form-row">
          <label className="pt-field">Full name *<input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></label>
          <label className="pt-field">Role / title *<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Account Manager" /></label>
        </div>
        <div className="pt-form-row">
          <label className="pt-field">Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label className="pt-field">Phone<input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label className="pt-field">City<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
        </div>
        <label className="pt-field">Photo URL<input value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} placeholder="https://nexalab.studio/team/name.png" /></label>
        <label className="pt-field">Short bio <span className="pt-muted">(optional)</span><textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={2} /></label>
        <label className="pt-check"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active (visible to clients and assignable)</label>
        {error && <p className="pt-error">{error}</p>}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="pt-btn pt-btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          {editing !== 'new' && team?.find((m) => m.id === editing) && (
            <button type="button" className="pt-btn pt-btn-danger" onClick={() => remove(team.find((m) => m.id === editing)!)}><Icon name="trash" size={15} /> Remove</button>
          )}
        </div>
      </form>
    </section>
  );

  return (
    <AdminShell
      boot={boot}
      kicker="Team"
      title={<>The people behind <em>NexaLab.</em></>}
      subtitle="Everyone here can be assigned to clients. Clients see the names, roles, and photos of the people on their account."
      actions={<button className="pt-btn pt-btn-primary" onClick={() => startEdit()}><Icon name="plus" size={16} /> Add team member</button>}
    >
      <div className="pt-grid pt-grid-main">
        <div>
          {team === null ? <p className="pt-muted">Loading…</p> : team.length === 0 ? (
            <div className="pt-card pt-empty"><span className="pt-empty-icon">👋</span><h3>No team members yet</h3><p>Add the people who work with clients so you can assign them.</p></div>
          ) : (
            <div className="pt-grid pt-grid-2">
              {team.map((m) => (
                <button key={m.id} className="pt-card pt-row-btn" onClick={() => startEdit(m)} style={{ opacity: m.is_active ? 1 : 0.55, borderColor: editing === m.id ? 'var(--ink)' : undefined }}>
                  <div className="pt-person">
                    <Avatar name={m.full_name} src={m.photo_url} size={56} />
                    <div style={{ minWidth: 0 }}>
                      <strong>{m.full_name}</strong>
                      <span>{m.title}{m.city ? ` · ${m.city}` : ''}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.9rem' }}>
                    <span className="pt-pill">{m.clients} client{m.clients === 1 ? '' : 's'}</span>
                    {!m.is_active && <span className="pt-pill tone-rose">Inactive</span>}
                    {m.email && <span className="pt-pill">{m.email}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <aside className="pt-stack">
          {editing ? editor : (
            <section className="pt-card">
              <h2 className="pt-card-title">Tips</h2>
              <ul className="pt-list" style={{ marginTop: '0.6rem' }}>
                <li className="pt-row"><span className="pt-row-icon">🖼️</span><p className="pt-row-main" style={{ margin: 0 }}>Square photos look best. Upload to your site’s <code>/public/team</code> folder and paste the URL.</p></li>
                <li className="pt-row"><span className="pt-row-icon">⭐</span><p className="pt-row-main" style={{ margin: 0 }}>Make one person the <strong>account lead</strong> per client — they’re featured on the client’s dashboard.</p></li>
                <li className="pt-row"><span className="pt-row-icon">🌙</span><p className="pt-row-main" style={{ margin: 0 }}>Leaving? Mark inactive instead of removing to keep history.</p></li>
              </ul>
            </section>
          )}
        </aside>
      </div>
    </AdminShell>
  );
}
