import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { adminOrError } from '@/lib/integrations';
import { notifyAsServer } from '@/lib/billing-server';
import { clientIp, looksLikeBot, rateLimit, tooMany, verifyTurnstile } from '@/lib/security';

// Public support requests from /support (visitors without a client account).
const TOPICS = new Set(['Orders & shipping', 'Payments & checkout', 'Store changes', 'Integrations', 'Reports & analytics', 'Billing & account', 'Something else']);
const PRIORITIES = new Set(['urgent', 'high', 'normal', 'planning']);
const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const ref = `NX-${randomBytes(3).toString('hex').toUpperCase()}`;
  if (looksLikeBot(body)) return NextResponse.json({ ok: true, ref }); // quietly drop

  const db = adminOrError();
  if ('error' in db) return db.error;
  const ip = clientIp(request);
  if (!(await rateLimit(db.db, 'support-10m', ip, 3, 600)) || !(await rateLimit(db.db, 'support-day', ip, 8, 86400))) {
    return NextResponse.json(tooMany('requests'), { status: 429 });
  }
  if (!(await verifyTurnstile(body.turnstile, ip))) return NextResponse.json({ error: 'Please complete the “I’m human” check.' }, { status: 400 });

  const fullName = clip(body.fullName, 120);
  const email = clip(body.email, 200);
  const subject = clip(body.subject, 140);
  const description = clip(body.description, 5000);
  const topic = TOPICS.has(body.topic) ? body.topic : 'Something else';
  const priority = PRIORITIES.has(body.priority) ? body.priority : 'normal';
  const storeUrl = clip(body.storeUrl, 300);
  if (!fullName || !subject || !description || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please fill in all required fields with a valid email.' }, { status: 400 });
  }

  const { error } = await db.db.from('support_requests').insert({
    ref, full_name: fullName, email, company: clip(body.company, 120) || null,
    store_url: /^https?:\/\//i.test(storeUrl) ? storeUrl : storeUrl ? `https://${storeUrl}` : null,
    topic, priority, subject, description,
  });
  if (error) return NextResponse.json({ error: 'Couldn’t submit — please email support@nexalab.studio.' }, { status: 500 });

  await notifyAsServer('support_request_admin_alert', { ref, priority, topic, subject, description, name: fullName, email, storeUrl, isClient: false });
  return NextResponse.json({ ok: true, ref });
}
