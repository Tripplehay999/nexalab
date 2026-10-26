'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FILES_BUCKET, MAX_FILE_BYTES, formatBytes } from '@/lib/portal';
import Icon from './Icon';

type Upload = { id: string; name: string; size: number; state: 'uploading' | 'done' | 'error'; error?: string };

const safeName = (name: string) => name.normalize('NFKD').replace(/[^\w.\-]+/g, '-').replace(/-+/g, '-').slice(-80);

// Drag-and-drop (or click to browse) uploader for a client's private files.
// Dropped links (e.g. dragged from another tab) are handed to `onUrl` instead.
export default function FileDropzone({ clientId, category, onUploaded, onUrl }: { clientId: string; category: string; onUploaded: () => void; onUrl?: (url: string) => void }) {
  const [over, setOver] = useState(false);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const patch = (id: string, p: Partial<Upload>) => setUploads((list) => list.map((u) => (u.id === id ? { ...u, ...p } : u)));

  async function uploadAll(files: File[]) {
    const supabase = createClient();
    const batch = files.map((f) => ({ file: f, id: crypto.randomUUID() }));
    setUploads((list) => [...batch.map(({ file, id }) => ({ id, name: file.name, size: file.size, state: 'uploading' as const })), ...list].slice(0, 8));

    await Promise.all(batch.map(async ({ file, id }) => {
      if (file.size > MAX_FILE_BYTES) { patch(id, { state: 'error', error: 'Over 50 MB' }); return; }
      const path = `${clientId}/${id}-${safeName(file.name)}`;
      const { error: upErr } = await supabase.storage.from(FILES_BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (upErr) { patch(id, { state: 'error', error: 'Upload failed' }); return; }
      const { error: rowErr } = await supabase.from('client_links').insert({
        client_id: clientId, label: file.name, url: null, file_path: path, file_size: file.size, mime_type: file.type || null, category,
      });
      if (rowErr) { await supabase.storage.from(FILES_BUCKET).remove([path]); patch(id, { state: 'error', error: 'Couldn’t save' }); return; }
      patch(id, { state: 'done' });
    }));
    onUploaded();
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) { uploadAll(files); return; }
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (url && /^https?:\/\//i.test(url.trim()) && onUrl) onUrl(url.trim().split('\n')[0]);
  }

  return (
    <div>
      <div
        className={`pt-drop ${over ? 'is-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
        role="button"
        tabIndex={0}
        aria-label="Upload files: drop them here or press to browse"
      >
        <span className="pt-drop-icon"><Icon name="deliverables" size={26} /></span>
        <strong>{over ? 'Drop to upload' : 'Drag & drop files here'}</strong>
        <span>or <u>browse your computer</u> · logos, fonts, photos, PDFs, zips — up to 50 MB each</span>
        <input ref={inputRef} type="file" multiple hidden onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ''; if (f.length) uploadAll(f); }} />
      </div>
      {uploads.length > 0 && (
        <ul className="pt-list" style={{ marginTop: '0.6rem' }}>
          {uploads.map((u) => (
            <li key={u.id} className="pt-row" style={{ padding: '0.5rem 0' }}>
              <span className="pt-row-main pt-small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name} <span className="pt-muted">· {formatBytes(u.size)}</span></span>
              <span className={`pt-pill ${u.state === 'done' ? 'tone-lime' : u.state === 'error' ? 'tone-rose' : 'tone-sun'}`}>{u.state === 'done' ? 'Uploaded' : u.state === 'error' ? u.error : 'Uploading…'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
