// Server-only abuse protection for public endpoints: rate limits (per hashed IP),
// optional Cloudflare Turnstile, and a honeypot + minimum-fill-time bot trap.
import { createHash } from 'node:crypto';
import type { createAdminClient } from '@/lib/supabase/admin';

type Db = ReturnType<typeof createAdminClient>;

/** Caller's IP (Vercel sets x-forwarded-for; first entry is the client). */
export function clientIp(request: Request) {
  return (request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown').trim();
}

/** IPs are never stored — only a salted hash. */
export function hashIp(ip: string) {
  const salt = process.env.RATE_LIMIT_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-16) || 'nexalab';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

/**
 * Count a hit against `limit` per `windowSeconds`. Returns true when allowed.
 * Fails open (allows) if the database function isn't installed yet, so a missing
 * migration never takes the forms down.
 */
export async function rateLimit(db: Db, bucket: string, ip: string, limit: number, windowSeconds: number) {
  const { data, error } = await db.rpc('rate_limit_hit', { p_key: `${bucket}:${hashIp(ip)}`, p_limit: limit, p_window_seconds: windowSeconds });
  if (error) { console.warn('rate_limit_hit unavailable:', error.message); return true; }
  return data === true;
}

/** Cloudflare Turnstile. Returns true when not configured (keys absent). */
export async function verifyTurnstile(token: unknown, ip: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof token !== 'string' || !token) return false;
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token, remoteip: ip }),
  }).catch(() => null);
  const json = res ? await res.json().catch(() => ({})) : {};
  return json.success === true;
}

/**
 * Honeypot + timing trap. Forms include a hidden `company_website` field humans
 * never see, and `_t` = when the form was opened. Bots fill everything instantly.
 */
export function looksLikeBot(fields: { company_website?: unknown; _t?: unknown }) {
  if (typeof fields.company_website === 'string' && fields.company_website.trim() !== '') return true;
  const opened = Number(fields._t);
  return Number.isFinite(opened) && opened > 0 && Date.now() - opened < 2500;
}

export const tooMany = (what = 'requests') => ({ error: `Too many ${what} from your connection — please wait a little and try again, or email hello@nexalab.studio.` });
