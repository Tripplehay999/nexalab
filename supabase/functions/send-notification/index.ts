// NexaLab — send-notification Edge Function
// Sends transactional emails via Resend.
//
// Required secrets (Supabase Dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY  — your Resend API key (re_...)
//   FROM_EMAIL      — verified sender, e.g. "NexaLab <hello@nexalab.studio>"
//   ADMIN_EMAIL     — inbox that receives admin notifications
// Provided automatically by Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Recipients are decided here, never by the caller:
//   SELF_TEMPLATES      → the signed-in caller's own email (e.g. the welcome email)
//   CLIENT_TEMPLATES    → a client's email; only an admin caller may send these
//   everything else     → ADMIN_EMAIL

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { buildTemplate, type Data } from './templates.ts';

// Trim (and drop wrapping quotes) so a stray newline or quotes pasted into the
// Secrets UI can't produce an invalid sender/recipient.
const env = (key: string, fallback: string) =>
  (Deno.env.get(key) ?? '').trim().replace(/^(['"])(.*)\1$/, '$2') || fallback;

const RESEND_KEY  = env('RESEND_API_KEY', '');
const FROM        = env('FROM_EMAIL', 'NexaLab <hello@nexalab.studio>');
const ADMIN_EMAIL = env('ADMIN_EMAIL', 'hello@nexalab.studio');
const REPLY_TO    = 'hello@nexalab.studio';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

const SELF_TEMPLATES   = new Set(['welcome']);
const CLIENT_TEMPLATES = new Set(['intake_confirm', 'project_approved', 'project_rejected', 'ticket_reply_client', 'invoice_sent', 'invoice_paid']);
const BILLING_TEMPLATES = new Set(['invoice_sent', 'invoice_paid']);

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// Plain-text alternative (HTML-only email scores worse with spam filters).
function toText(html: string) {
  return html
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<div style="display:none[\s\S]*?<\/div>/i, '')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, label: string) => `${label.replace(/<[^>]+>/g, '').trim()} (${href})`)
    .replace(/<(br|\/p|\/h[1-6]|\/tr|\/li|\/div)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#\d+;/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n /g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function getCaller(req: Request) {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  // The NexaLab app's own server (billing webhook, cron) calls with the service-role key.
  if (token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
    return { user: { id: 'server', email: null as string | null }, profile: { id: 'server', full_name: null, role: 'admin', welcome_sent_at: null as string | null } };
  }
  const { data } = await admin.auth.getUser(token);
  if (!data.user) return null; // e.g. the public anon key
  const { data: profile } = await admin.from('profiles')
    .select('id, full_name, role, welcome_sent_at').eq('id', data.user.id).single();
  return { user: data.user, profile };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { type, to, data = {} } = await req.json();
    const tmpl = buildTemplate(type, data as Data);
    if (!tmpl) return json({ error: 'Unknown notification type' }, 400);

    let recipient = ADMIN_EMAIL;

    if (SELF_TEMPLATES.has(type)) {
      const caller = await getCaller(req);
      if (!caller?.user.email) return json({ error: 'Sign in required' }, 401);
      // Welcome is sent once per account; the timestamp is only writable server-side.
      if (type === 'welcome') {
        if (caller.profile?.welcome_sent_at) return json({ ok: true, skipped: 'already sent' });
        await admin.from('profiles').update({ welcome_sent_at: new Date().toISOString() }).eq('id', caller.user.id);
      }
      recipient = caller.user.email;
    } else if (CLIENT_TEMPLATES.has(type)) {
      const caller = await getCaller(req);
      if (caller?.profile?.role !== 'admin') return json({ error: 'Admin only' }, 403);
      if (typeof data.client_id === 'string') {
        const { data: client } = await admin.from('profiles').select('email').eq('id', data.client_id).single();
        if (client?.email) recipient = client.email;
        if (BILLING_TEMPLATES.has(type)) {
          const { data: billing } = await admin.from('client_billing').select('billing_email').eq('client_id', data.client_id).maybeSingle();
          if (billing?.billing_email) recipient = billing.billing_email;
        }
      } else if (typeof to === 'string') {
        recipient = to;
      }
      if (recipient === ADMIN_EMAIL) return json({ error: 'Client email not found' }, 404);
    } else {
      // Admin alerts: only signed-in users or the app's own server (public forms send
      // through rate-limited server routes) — anonymous callers can't flood the inbox.
      const caller = await getCaller(req);
      if (!caller) return json({ error: 'Sign in required' }, 401);
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: recipient, reply_to: REPLY_TO, subject: tmpl.subject, html: tmpl.html, text: toText(tmpl.html) }),
    });
    const emailBody = await emailRes.json();
    return json({ ok: emailRes.ok, resend: emailBody }, emailRes.ok ? 200 : 502);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
