// NexaLab — send-notification Edge Function
// Sends transactional emails via Resend.
//
// Required secrets (set in Supabase Dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY  — your Resend API key (re_...)
//   FROM_EMAIL      — verified sender, e.g. "NexaLab <hello@nexalab.io>"
//   ADMIN_EMAIL     — email address that receives admin notifications

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_KEY  = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM        = Deno.env.get('FROM_EMAIL')     ?? 'NexaLab <hello@nexalab.io>';
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL')    ?? 'hello@nexalab.io';

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { type, to, data = {} } = await req.json();

    type EmailTemplate = { subject: string; html: string };
    const templates: Record<string, EmailTemplate> = {

      // ── Client confirmation after contact form ────────────────────────────
      intake_confirm: {
        subject: 'We received your project intake — NexaLab',
        html: `<p>Hi ${data.name ?? 'there'},</p>
<p>Thanks for submitting your project intake to NexaLab! We've received all your details and our team will review them within a few hours.</p>
<p><strong>Plan selected:</strong> ${data.plan ?? 'Not specified'}</p>
<p><strong>Next steps:</strong></p>
<ol>
  <li>We review your intake — same day, usually within a few hours.</li>
  <li>Strategy call (30 min) — no pitch deck, just a focused conversation.</li>
  <li>Proposal + timeline — delivered within 48 hours.</li>
</ol>
<p>Once your project is approved you'll be able to log into your client portal at <a href="${data.portalUrl ?? 'https://nexalab.io/dashboard.html'}">nexalab.io/dashboard.html</a>.</p>
<p>— The NexaLab Team</p>`,
      },

      // ── Admin alert when new intake is submitted ──────────────────────────
      intake_admin_alert: {
        subject: `New intake: ${data.name ?? 'Unknown'} — ${data.company ?? 'No company'}`,
        html: `<p><strong>New project intake received.</strong></p>
<table cellpadding="6" style="border-collapse:collapse;width:100%">
  <tr><td><strong>Name</strong></td><td>${data.name ?? '—'}</td></tr>
  <tr><td><strong>Email</strong></td><td>${data.email ?? '—'}</td></tr>
  <tr><td><strong>Company</strong></td><td>${data.company ?? '—'}</td></tr>
  <tr><td><strong>Plan</strong></td><td>${data.plan ?? '—'}</td></tr>
  <tr><td><strong>Revenue</strong></td><td>${data.revenue ?? '—'}</td></tr>
  <tr><td><strong>Budget</strong></td><td>${data.budget ?? '—'}</td></tr>
  <tr><td><strong>Timeline</strong></td><td>${data.timeline ?? '—'}</td></tr>
  <tr><td><strong>Services</strong></td><td>${(data.services ?? []).join(', ') || '—'}</td></tr>
  <tr><td><strong>Goal</strong></td><td>${data.goal ?? '—'}</td></tr>
</table>
<p><a href="https://nexalab.io/admin.html#pending">Review in Admin Portal →</a></p>`,
      },

      // ── Client notification: project approved ─────────────────────────────
      project_approved: {
        subject: 'Your NexaLab project has been approved!',
        html: `<p>Hi ${data.name ?? 'there'},</p>
<p>Great news — your project has been approved and your client portal is now active.</p>
<p><strong>Plan:</strong> ${data.plan ?? 'NexaLab Retainer'}</p>
<p>Log in to your portal to track milestones, review deliverables, and get in touch with your team.</p>
<p><a href="${data.portalUrl ?? 'https://nexalab.io/dashboard.html'}">Access your client portal →</a></p>
<p>— The NexaLab Team</p>`,
      },

      // ── Client notification: project rejected ─────────────────────────────
      project_rejected: {
        subject: 'Update on your NexaLab project intake',
        html: `<p>Hi ${data.name ?? 'there'},</p>
<p>Thank you for your interest in NexaLab. After reviewing your project intake, we weren't able to move forward at this time.</p>
<p>This often comes down to a fit or timing issue rather than the quality of the project. If you'd like to discuss further, we're happy to chat.</p>
<p>Reply to this email or reach us at <a href="mailto:hello@nexalab.io">hello@nexalab.io</a>.</p>
<p>— The NexaLab Team</p>`,
      },

      // ── Client notification: admin replied to their ticket ────────────────
      ticket_reply_client: {
        subject: `Re: [${data.ticketRef ?? '#—'}] ${data.ticketTitle ?? 'Support ticket'}`,
        html: `<p>Hi ${data.name ?? 'there'},</p>
<p>Your NexaLab team has replied to your support ticket <strong>${data.ticketRef ?? ''}</strong>: <em>${data.ticketTitle ?? ''}</em></p>
<blockquote style="border-left:3px solid #7c5cfc;padding:0.5rem 1rem;margin:1rem 0;color:#555;">
  ${data.replyContent ?? ''}
</blockquote>
<p><a href="${data.portalUrl ?? 'https://nexalab.io/dashboard.html'}#support">View ticket &amp; reply →</a></p>
<p>— The NexaLab Team</p>`,
      },

      // ── Admin notification: client replied to a ticket ────────────────────
      ticket_reply_admin: {
        subject: `Client reply: [${data.ticketRef ?? '#—'}] ${data.ticketTitle ?? 'Support ticket'}`,
        html: `<p><strong>${data.clientName ?? 'A client'}</strong> replied to ticket <strong>${data.ticketRef ?? ''}</strong>.</p>
<blockquote style="border-left:3px solid #22d3a8;padding:0.5rem 1rem;margin:1rem 0;color:#555;">
  ${data.replyContent ?? ''}
</blockquote>
<p><a href="https://nexalab.io/admin.html#tickets">View in Admin Portal →</a></p>`,
      },
    };

    const tmpl = templates[type];
    if (!tmpl) {
      return new Response(JSON.stringify({ error: 'Unknown notification type' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    FROM,
        to:      to ?? ADMIN_EMAIL,
        subject: tmpl.subject,
        html:    tmpl.html,
      }),
    });

    const emailBody = await emailRes.json();

    return new Response(JSON.stringify({ ok: emailRes.ok, resend: emailBody }), {
      status: emailRes.ok ? 200 : 502,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
