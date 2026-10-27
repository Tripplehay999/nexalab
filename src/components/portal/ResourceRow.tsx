import { formatBytes, hostOf } from '@/lib/portal';
import { safeHref } from '@/lib/net';
import type { ClientLink } from '@/lib/types';
import Icon from './Icon';

const fileIcon = (mime: string | null, name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (mime?.startsWith('video/')) return '🎬';
  if (mime === 'application/pdf' || ext === 'pdf') return '📕';
  if (['zip', 'rar', '7z'].includes(ext)) return '🗜️';
  if (['ttf', 'otf', 'woff', 'woff2'].includes(ext)) return '🔤';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊';
  if (['ai', 'psd', 'fig', 'sketch', 'svg', 'eps'].includes(ext)) return '🎨';
  return '📄';
};

// One shared resource: an uploaded file (with thumbnail for images) or a link.
export default function ResourceRow({ link, byYou, canDelete, onDelete }: { link: ClientLink; byYou: boolean; canDelete: boolean; onDelete: () => void }) {
  const isFile = Boolean(link.file_path);
  const href = safeHref(isFile ? link.signed_url : link.url);
  const isImage = isFile && link.mime_type?.startsWith('image/') && link.signed_url;

  return (
    <li className="pt-row">
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={link.signed_url!} alt="" width={44} height={44} className="pt-row-icon" style={{ objectFit: 'cover', padding: 0 }} />
      ) : isFile ? (
        <span className="pt-row-icon">{fileIcon(link.mime_type, link.label)}</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`https://www.google.com/s2/favicons?domain=${hostOf(link.url)}&sz=64`} alt="" width={38} height={38} className="pt-row-icon" style={{ padding: 8 }} />
      )}
      <div className="pt-row-main">
        <a href={href} target="_blank" rel="noopener noreferrer" className="pt-row-title" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.label}</a>
        <p className="pt-row-sub">{isFile ? `${formatBytes(link.file_size)} file` : hostOf(link.url)} · {byYou ? 'Added by you' : 'Shared by NexaLab'}</p>
      </div>
      {href && (
        <a href={href} target="_blank" rel="noopener noreferrer" download={isFile ? link.label : undefined} className="pt-icon-btn" aria-label={isFile ? `Download ${link.label}` : `Open ${link.label}`}>
          <Icon name={isFile ? 'arrow' : 'external'} size={16} className={isFile ? 'pt-rot-90' : ''} />
        </a>
      )}
      {canDelete && <button className="pt-icon-btn" onClick={() => window.confirm(`Remove “${link.label}”?`) && onDelete()} aria-label={`Remove ${link.label}`}><Icon name="trash" size={16} /></button>}
    </li>
  );
}
