'use client';

import { useEffect, useState } from 'react';
import { useDashboard } from '@/lib/useDashboard';
import { createClient } from '@/lib/supabase/client';
import type { Deliverable } from '@/lib/types';
import ClientShell, { PortalLoading } from '@/components/portal/ClientShell';
import Icon from '@/components/portal/Icon';

const TYPE: Record<string, { icon: string; label: string; action: string }> = {
  document: { icon: '📄', label: 'Documents', action: 'Download' },
  repo: { icon: '💻', label: 'Code', action: 'View repo' },
  link: { icon: '🔗', label: 'Links', action: 'Open' },
  design: { icon: '🎨', label: 'Designs', action: 'View design' },
  video: { icon: '🎥', label: 'Videos', action: 'Watch' },
};

async function loadDeliverables(projectId: string) {
  const { data } = await createClient().from('deliverables').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
  return (data ?? []) as Deliverable[];
}

export default function DeliverablesPage() {
  const { boot, loading } = useDashboard();
  const [items, setItems] = useState<Deliverable[] | null>(null);
  const [filter, setFilter] = useState<'all' | 'ready' | 'upcoming'>('all');
  const projectId = boot?.project?.id;

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    loadDeliverables(projectId).then((d) => { if (!cancelled) setItems(d); });
    return () => { cancelled = true; };
  }, [projectId]);

  if (loading || !boot) return <PortalLoading />;
  const all = items ?? [];
  const shown = all.filter((d) => filter === 'all' || d.status === filter);
  const groups = shown.reduce<Record<string, Deliverable[]>>((acc, d) => {
    const key = TYPE[d.type]?.label ?? 'Other';
    (acc[key] ??= []).push(d);
    return acc;
  }, {});

  return (
    <ClientShell
      boot={boot}
      kicker="Deliverables"
      title={<>Everything we’ve <em>made for you.</em></>}
      subtitle="Designs, files, code, and links — ready to download the moment they’re done."
    >
      <div className="pt-tabbar" role="tablist" aria-label="Filter deliverables">
        {([['all', `All (${all.length})`], ['ready', `Ready (${all.filter((d) => d.status === 'ready').length})`], ['upcoming', `Coming up (${all.filter((d) => d.status !== 'ready').length})`]] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? 'is-active' : ''} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>

      {items === null ? (
        <p className="pt-muted">Loading…</p>
      ) : shown.length === 0 ? (
        <div className="pt-card pt-empty">
          <span className="pt-empty-icon">📦</span>
          <h3>{all.length ? 'Nothing in this view' : 'Nothing here yet'}</h3>
          <p>{all.length ? 'Try another filter.' : 'As your project moves along, designs, files, and links appear here — we’ll flag new ones on your home page.'}</p>
        </div>
      ) : (
        <div className="pt-stack">
          {Object.entries(groups).map(([group, list]) => (
            <section key={group} className="pt-card">
              <div className="pt-card-head"><h2 className="pt-card-title">{group}</h2><span className="pt-muted pt-small">{list.length}</span></div>
              <ul className="pt-list">
                {list.map((d) => {
                  const t = TYPE[d.type] ?? { icon: '📁', label: 'Other', action: 'Open' };
                  return (
                    <li key={d.id} className="pt-row">
                      <span className="pt-row-icon">{t.icon}</span>
                      <div className="pt-row-main">
                        <p className="pt-row-title">{d.name}</p>
                        <p className="pt-row-sub">
                          {d.meta ? `${d.meta} · ` : ''}
                          {d.status === 'ready'
                            ? `Delivered ${d.delivered_at ? new Date(d.delivered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}`
                            : d.due_date ? `Expected ${new Date(d.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'In progress'}
                        </p>
                      </div>
                      {d.status === 'ready' && d.url ? (
                        <a href={d.url} target="_blank" rel="noopener noreferrer" className="pt-btn pt-btn-ghost pt-btn-sm">{t.action} <Icon name="external" size={14} /></a>
                      ) : (
                        <span className={`pt-pill ${d.status === 'ready' ? 'tone-lime' : ''}`}>{d.status === 'ready' ? 'Ready' : 'Coming up'}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </ClientShell>
  );
}
