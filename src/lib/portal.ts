import { createClient } from '@/lib/supabase/client';
import type { Assignment, ClientLink, Goal, Metric } from '@/lib/types';

// ── Metrics ─────────────────────────────────────────────────────────────────

export type MetricDef = { key: string; label: string; unit: 'money' | 'number' | 'percent'; hint: string; color: string };

export const METRICS: MetricDef[] = [
  { key: 'revenue', label: 'Revenue', unit: 'money', hint: 'Total sales for the period', color: '#FF5A36' },
  { key: 'orders', label: 'Orders', unit: 'number', hint: 'Number of orders placed', color: '#103B2F' },
  { key: 'visitors', label: 'Visitors', unit: 'number', hint: 'Sessions or unique visitors', color: '#5B8DEF' },
  { key: 'conversion', label: 'Conversion rate', unit: 'percent', hint: 'Orders ÷ visitors × 100', color: '#8B6CF0' },
  { key: 'aov', label: 'Avg. order value', unit: 'money', hint: 'Revenue ÷ orders', color: '#E3A21A' },
  { key: 'subscribers', label: 'Email subscribers', unit: 'number', hint: 'Total list size', color: '#2F9E6E' },
];

export function metricDef(key: string, label?: string | null): MetricDef {
  return METRICS.find((m) => m.key === key) ?? { key, label: label || key, unit: 'number', hint: 'Custom metric', color: '#4A4339' };
}

export function formatMetric(key: string, value: number, opts: { compact?: boolean } = {}) {
  const def = metricDef(key);
  const n = Number(value) || 0;
  if (def.unit === 'percent') return `${n.toFixed(n < 10 ? 2 : 1)}%`;
  const num = opts.compact && Math.abs(n) >= 10000
    ? new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
    : new Intl.NumberFormat('en-US', { maximumFractionDigits: def.unit === 'money' ? 2 : 0 }).format(n);
  return def.unit === 'money' ? `$${num}` : num;
}

export const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

/** Group metric rows by metric key, sorted oldest → newest. */
export function groupMetrics(rows: Metric[]) {
  const map = new Map<string, Metric[]>();
  for (const r of rows) {
    const list = map.get(r.metric) ?? [];
    list.push(r);
    map.set(r.metric, list);
  }
  for (const list of map.values()) list.sort((a, b) => a.period.localeCompare(b.period) || a.created_at.localeCompare(b.created_at));
  return map;
}

export function trend(list: Metric[]) {
  const latest = list[list.length - 1];
  const prev = list[list.length - 2];
  const change = latest && prev && Number(prev.value) !== 0 ? ((Number(latest.value) - Number(prev.value)) / Math.abs(Number(prev.value))) * 100 : null;
  return { latest, prev, change };
}

// ── Data loaders (RLS scopes these to the signed-in client, or all for admins) ─

export async function fetchTeam(clientId: string) {
  const { data } = await createClient()
    .from('client_assignments').select('*, staff(*)').eq('client_id', clientId)
    .order('is_primary', { ascending: false }).order('created_at');
  return ((data ?? []) as Assignment[]).filter((a) => a.staff);
}

export async function fetchMetrics(clientId: string) {
  const { data } = await createClient().from('client_metrics').select('*').eq('client_id', clientId).order('period');
  return (data ?? []) as Metric[];
}

export async function fetchGoals(clientId: string) {
  const { data } = await createClient().from('client_goals').select('*').eq('client_id', clientId).order('created_at');
  return (data ?? []) as Goal[];
}

export async function fetchLinks(clientId: string) {
  const { data } = await createClient().from('client_links').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
  return (data ?? []) as ClientLink[];
}

// ── Small helpers ───────────────────────────────────────────────────────────

export function greeting(date = new Date()) {
  const h = date.getHours();
  return h < 5 ? 'Working late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?';

export function hostOf(url: string | null | undefined) {
  if (!url) return '';
  try { return new URL(/^https?:\/\//.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, ''); } catch { return ''; }
}

export const normalizeUrl = (url: string) => (/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`);

export const PROJECT_STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: 'Under review', tone: 'sun' },
  active: { label: 'In progress', tone: 'lime' },
  paused: { label: 'Paused', tone: 'sky' },
  complete: { label: 'Launched', tone: 'lilac' },
  rejected: { label: 'Not accepted', tone: 'rose' },
};

export const ASSIGNMENT_ROLES = ['Account lead', 'Project manager', 'Developer', 'Designer', 'Growth', 'Support', 'On-call'];
export const LINK_CATEGORIES = ['Brand', 'Files', 'Design', 'Store', 'Analytics', 'General'];
