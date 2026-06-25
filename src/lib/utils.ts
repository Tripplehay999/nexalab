export function escHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    open: 'Awaiting review',
    'in-progress': 'In progress',
    resolved: 'Resolved',
  };
  return map[status] ?? status;
}

export const INQ_MAP: Record<string, { label: string; cls: string }> = {
  new: { label: 'New', cls: 'adm-badge--purple' },
  contacted: { label: 'Contacted', cls: 'adm-badge--blue' },
  converted: { label: 'Converted', cls: 'adm-badge--green' },
  closed: { label: 'Closed', cls: 'adm-badge--gray' },
};

export const TIX_MAP: Record<string, { label: string; cls: string }> = {
  open: { label: 'Open', cls: 'adm-badge--red' },
  'in-progress': { label: 'In progress', cls: 'adm-badge--blue' },
  resolved: { label: 'Resolved', cls: 'adm-badge--green' },
};

export function badgeCls(status: string, map: Record<string, { label: string; cls: string }>): { label: string; cls: string } {
  return map[status] ?? { label: status, cls: 'adm-badge--gray' };
}

export async function sendNotification(
  type: string,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    await fetch(`${url}/functions/v1/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        apikey: key!,
      },
      body: JSON.stringify({ type, data }),
    });
  } catch {
    // best-effort
  }
}
