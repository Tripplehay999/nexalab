'use client';

import { useEffect, useState } from 'react';
import { useDashboard } from '@/lib/useDashboard';
import { createClient } from '@/lib/supabase/client';
import { LINK_CATEGORIES, deleteLink, fetchLinks, hostOf, normalizeUrl } from '@/lib/portal';
import type { ClientLink } from '@/lib/types';
import ClientShell, { PortalLoading } from '@/components/portal/ClientShell';
import FileDropzone from '@/components/portal/FileDropzone';
import ResourceRow from '@/components/portal/ResourceRow';
import Icon from '@/components/portal/Icon';

const CATEGORY_HINT: Record<string, string> = {
  Brand: 'Logos, fonts, colors, brand guidelines',
  Files: 'Product photos, documents, spreadsheets',
  Design: 'Figma, mood boards, inspiration',
  Store: 'Store admin, apps, suppliers',
  Analytics: 'GA4, Meta, Klaviyo dashboards',
  General: 'Anything else worth sharing',
};

const PLATFORMS = [['shopify', 'Shopify / Shopify Plus'], ['woocommerce', 'WooCommerce'], ['bigcommerce', 'BigCommerce'], ['magento', 'Magento / Adobe Commerce'], ['custom', 'Custom-built'], ['none', 'No store yet'], ['other', 'Other']];

export default function ResourcesPage() {
  const { boot, loading } = useDashboard();
  const [links, setLinks] = useState<ClientLink[] | null>(null);
  const [form, setForm] = useState({ label: '', url: '', category: 'Brand' });
  const [uploadCategory, setUploadCategory] = useState('Brand');
  const [store, setStore] = useState<{ website: string; platform: string } | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string; where: 'link' | 'store' } | null>(null);
  const userId = boot?.userId;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchLinks(userId).then((l) => { if (!cancelled) setLinks(l); });
    return () => { cancelled = true; };
  }, [userId]);

  if (loading || !boot) return <PortalLoading />;

  const reload = () => fetchLinks(boot.userId).then(setLinks);
  const ob = (boot.profile.onboarding ?? {}) as { answers?: { website?: string; platform?: string } };
  const storeValues = store ?? { website: boot.profile.website || ob.answers?.website || '', platform: boot.profile.platform || ob.answers?.platform || '' };

  async function saveStore(e: React.FormEvent) {
    e.preventDefault();
    const website = storeValues.website.trim();
    if (website && !hostOf(website)) { setMsg({ kind: 'err', text: 'That doesn’t look like a web address.', where: 'store' }); return; }
    const { error } = await createClient().from('profiles').update({ website: website ? normalizeUrl(website) : null, platform: storeValues.platform || null }).eq('id', boot!.userId);
    setMsg(error ? { kind: 'err', text: 'Couldn’t save — please try again.', where: 'store' } : { kind: 'ok', text: 'Saved. Your home page now shows the live preview.', where: 'store' });
  }

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label.trim() || !hostOf(form.url)) { setMsg({ kind: 'err', text: 'Add a name and a valid link.', where: 'link' }); return; }
    const { error } = await createClient().from('client_links').insert({ client_id: boot!.userId, label: form.label.trim(), url: normalizeUrl(form.url), category: form.category });
    if (error) { setMsg({ kind: 'err', text: 'Couldn’t save that link — please try again.', where: 'link' }); return; }
    setMsg({ kind: 'ok', text: 'Shared with your team.', where: 'link' });
    setForm({ label: '', url: '', category: form.category });
    reload();
  }

  const byCategory = LINK_CATEGORIES.map((c) => ({ c, items: (links ?? []).filter((l) => l.category === c) })).filter((g) => g.items.length);
  const fileCount = (links ?? []).filter((l) => l.file_path).length;

  return (
    <ClientShell
      boot={boot}
      kicker="Resources"
      title={<>Everything we need, <em>in one place.</em></>}
      subtitle="Drop in brand assets, photos, and documents, or share links to folders and tools. Never paste passwords here — we’ll send a secure invite instead."
    >
      <div className="pt-grid pt-grid-main">
        <div className="pt-stack">
          <section className="pt-card">
            <div className="pt-card-head">
              <div><h2 className="pt-card-title">Upload files</h2><p className="pt-card-sub">Private to you and your NexaLab team{fileCount ? ` · ${fileCount} uploaded` : ''}.</p></div>
              <select className="pt-input" value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)} style={{ width: 'auto', minHeight: 36 }} aria-label="Category for uploads">
                {LINK_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <FileDropzone
              clientId={boot.userId}
              category={uploadCategory}
              onUploaded={reload}
              onUrl={(url) => { setForm({ ...form, url, label: form.label || hostOf(url) }); setMsg({ kind: 'ok', text: 'Link dropped — give it a name and share it.', where: 'link' }); }}
            />
          </section>

          {links === null ? (
            <p className="pt-muted">Loading…</p>
          ) : byCategory.length === 0 ? (
            <div className="pt-card pt-empty">
              <span className="pt-empty-icon">🎨</span>
              <h3>Nothing shared yet</h3>
              <p>Start with your logo and brand guidelines — drag them into the box above, or share a Google Drive folder link.</p>
            </div>
          ) : (
            byCategory.map(({ c, items }) => (
              <section key={c} className="pt-card">
                <div className="pt-card-head"><div><h2 className="pt-card-title">{c}</h2><p className="pt-card-sub">{CATEGORY_HINT[c]}</p></div><span className="pt-muted pt-small">{items.length}</span></div>
                <ul className="pt-list">
                  {items.map((l) => (
                    <ResourceRow key={l.id} link={l} byYou={l.added_by === boot.userId} canDelete={l.added_by === boot.userId} onDelete={async () => { await deleteLink(l); reload(); }} />
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>

        <aside className="pt-stack">
          <section className="pt-card" id="store-details">
            <h2 className="pt-card-title">Your store details</h2>
            <p className="pt-card-sub" style={{ marginBottom: '1rem' }}>Powers the live preview and uptime check on your home page.</p>
            <form className="pt-form" onSubmit={saveStore}>
              <label className="pt-field">Website<input value={storeValues.website} onChange={(e) => setStore({ ...storeValues, website: e.target.value })} placeholder="yourbrand.com" /></label>
              <label className="pt-field">Platform
                <select value={storeValues.platform} onChange={(e) => setStore({ ...storeValues, platform: e.target.value })}>
                  <option value="">Select platform</option>
                  {PLATFORMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              {msg?.where === 'store' && <p className={msg.kind === 'ok' ? 'pt-success' : 'pt-error'}>{msg.text}</p>}
              <button className="pt-btn pt-btn-ink">Save</button>
            </form>
          </section>

          <section className="pt-card">
            <h2 className="pt-card-title">Share a link</h2>
            <p className="pt-card-sub" style={{ marginBottom: '1rem' }}>Drive, Dropbox, Figma, Notion… Tip: you can drag a link onto the upload box too.</p>
            <form className="pt-form" onSubmit={addLink}>
              <label className="pt-field">Name<input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Brand guidelines" maxLength={80} /></label>
              <label className="pt-field">Link<input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://drive.google.com/…" /></label>
              <label className="pt-field">Category
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {LINK_CATEGORIES.map((c) => <option key={c} value={c}>{c} — {CATEGORY_HINT[c]}</option>)}
                </select>
              </label>
              {msg?.where === 'link' && <p className={msg.kind === 'ok' ? 'pt-success' : 'pt-error'}>{msg.text}</p>}
              <button className="pt-btn pt-btn-primary"><Icon name="plus" size={16} /> Share link</button>
            </form>
          </section>
        </aside>
      </div>
    </ClientShell>
  );
}

