// NexaLab — Contact Submit Edge Function
// Saves inquiry to Supabase DB and sends emails via Resend.
//
// Environment variables (set via: supabase secrets set KEY=value):
//   RESEND_API_KEY   — your Resend API key
//   TEAM_EMAIL       — NexaLab inbox that receives notifications (e.g. hello@nexalab.io)
//   SITE_URL         — your live site URL (e.g. https://nexalab.io)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // restrict to your domain in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { fullName, workEmail, company, website, platform, revenue, budget, timeline, services, goal } = body as {
    fullName: string; workEmail: string; company?: string; website?: string;
    platform?: string; revenue: string; budget: string; timeline?: string;
    services?: string[]; goal: string;
  };

  // Validate required fields
  if (!fullName || !workEmail || !revenue || !budget || !goal) {
    return json({ error: 'Missing required fields' }, 400);
  }

  // ── Save to Supabase ──────────────────────────────────────
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { error: dbError } = await supabaseAdmin.from('inquiries').insert({
    full_name: fullName,
    work_email: workEmail,
    company: company || null,
    website: website || null,
    platform: platform || null,
    revenue,
    budget,
    timeline: timeline || null,
    services: Array.isArray(services) ? services : [],
    goal,
  });

  if (dbError) {
    console.error('DB insert error:', dbError);
    return json({ error: 'Failed to save inquiry' }, 500);
  }

  // ── Send emails via Resend ────────────────────────────────
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const teamEmail = Deno.env.get('TEAM_EMAIL') || 'hello@nexalab.io';
  const siteUrl   = Deno.env.get('SITE_URL') || 'https://nexalab.io';
  const firstName = fullName.split(' ')[0];

  if (resendKey) {
    // Welcome email to submitter
    await sendEmail(resendKey, {
      from: 'NexaLab <hello@nexalab.io>',
      to: workEmail,
      subject: `Got it, ${firstName} — here's what happens next`,
      html: welcomeHtml(firstName, siteUrl),
    });

    // Notification to NexaLab team
    await sendEmail(resendKey, {
      from: 'NexaLab Inquiries <hello@nexalab.io>',
      to: teamEmail,
      subject: `New inquiry — ${fullName}${company ? ` · ${company}` : ''}`,
      html: teamHtml({ fullName, workEmail, company, website, platform, revenue, budget, timeline, services, goal }),
    });
  }

  return json({ ok: true }, 200);
});

// ── Helpers ───────────────────────────────────────────────

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sendEmail(apiKey: string, payload: {
  from: string; to: string; subject: string; html: string;
}): Promise<void> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('Resend error:', err);
    }
  } catch (e) {
    console.error('Failed to send email:', e);
  }
}

// ── Email templates ───────────────────────────────────────

function welcomeHtml(firstName: string, siteUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#060913;color:#ecf0ff;-webkit-font-smoothing:antialiased;}
  .wrap{max-width:560px;margin:0 auto;padding:40px 24px;}
  .brand{font-size:1.15rem;font-weight:800;color:#fff;letter-spacing:0.01em;margin-bottom:28px;display:block;}
  .card{background:#0f162c;border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:32px;}
  h1{font-size:1.35rem;font-weight:800;color:#ecf0ff;margin-bottom:10px;}
  .sub{font-size:0.88rem;color:#8b9bbf;line-height:1.65;margin-bottom:24px;}
  .step{display:flex;gap:12px;margin-bottom:14px;align-items:flex-start;}
  .num{background:rgba(124,92,252,0.12);border:1px solid rgba(124,92,252,0.22);color:#9aa8ff;font-size:0.62rem;font-weight:800;border-radius:6px;width:22px;height:22px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;}
  .step-body{font-size:0.84rem;color:#8b9bbf;line-height:1.55;}
  .step-body strong{color:#ecf0ff;display:block;margin-bottom:2px;}
  .divider{height:1px;background:rgba(255,255,255,0.05);margin:22px 0;}
  .cta{display:inline-block;margin-top:4px;padding:11px 22px;background:linear-gradient(115deg,#7c5cfc,#ff4fd8);color:#fff;font-weight:700;font-size:0.88rem;border-radius:10px;text-decoration:none;}
  .footer{margin-top:24px;font-size:0.72rem;color:#8b9bbf;text-align:center;line-height:1.6;}
  .footer a{color:#8b9bbf;}
</style>
</head>
<body>
<div class="wrap">
  <span class="brand">NexaLab</span>
  <div class="card">
    <h1>Got it, ${firstName}.</h1>
    <p class="sub">Your project intake landed in our queue. We read every submission the same day — here's exactly what happens next.</p>

    <div class="step">
      <div class="num">01</div>
      <div class="step-body"><strong>We review your intake</strong>Our team reads this today and prepares before reaching out.</div>
    </div>
    <div class="step">
      <div class="num">02</div>
      <div class="step-body"><strong>Strategy call — 30 min</strong>No pitch deck. We map your stack, find gaps, and outline a plan.</div>
    </div>
    <div class="step">
      <div class="num">03</div>
      <div class="step-body"><strong>Custom proposal — within 48 h</strong>Scope, deliverables list, and projected milestones tailored to you.</div>
    </div>
    <div class="step">
      <div class="num">04</div>
      <div class="step-body"><strong>14-day sprint kickoff</strong>Once aligned, we start immediately. First deliverable in week one.</div>
    </div>

    <div class="divider"></div>
    <a href="${siteUrl}" class="cta">Visit NexaLab →</a>
  </div>
  <div class="footer">
    © ${new Date().getFullYear()} NexaLab · <a href="mailto:hello@nexalab.io">hello@nexalab.io</a><br/>
    You received this because you submitted a project intake on nexalab.io.
  </div>
</div>
</body>
</html>`;
}

function teamHtml(d: {
  fullName: string; workEmail: string; company?: string; website?: string;
  platform?: string; revenue: string; budget: string; timeline?: string;
  services?: string[]; goal: string;
}): string {
  const row = (label: string, val: string | undefined) =>
    `<tr><td style="color:#8b9bbf;font-size:0.82rem;padding:6px 0;min-width:130px;vertical-align:top;">${label}</td><td style="color:#ecf0ff;font-size:0.82rem;font-weight:600;padding:6px 0;">${val || '—'}</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Inter,-apple-system,sans-serif;background:#060913;color:#ecf0ff;-webkit-font-smoothing:antialiased;}
  .wrap{max-width:560px;margin:0 auto;padding:40px 24px;}
  .brand{font-size:1.15rem;font-weight:800;color:#fff;margin-bottom:6px;display:block;}
  .badge{display:inline-block;font-size:0.65rem;font-weight:800;color:#ff4fd8;background:rgba(255,79,216,0.1);border:1px solid rgba(255,79,216,0.2);border-radius:999px;padding:0.18rem 0.7rem;margin-bottom:22px;text-transform:uppercase;letter-spacing:0.08em;}
  .card{background:#0f162c;border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:28px;}
  h2{font-size:1.05rem;font-weight:800;color:#ecf0ff;margin-bottom:18px;}
  table{width:100%;border-collapse:collapse;}
  .divider{height:1px;background:rgba(255,255,255,0.05);margin:18px 0;}
  .goal-box{padding:14px;background:rgba(124,92,252,0.06);border:1px solid rgba(124,92,252,0.14);border-radius:10px;font-size:0.84rem;color:#8b9bbf;line-height:1.65;margin-top:4px;}
  .goal-label{font-size:0.68rem;font-weight:800;color:#9aa8ff;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;display:block;}
</style>
</head>
<body>
<div class="wrap">
  <span class="brand">NexaLab</span>
  <span class="badge">New Inquiry</span>
  <div class="card">
    <h2>Project intake received</h2>
    <table>
      ${row('Name', d.fullName)}
      ${row('Email', d.workEmail)}
      ${row('Company', d.company)}
      ${row('Website', d.website)}
      ${row('Platform', d.platform)}
      ${row('Monthly revenue', d.revenue)}
      ${row('Budget', d.budget)}
      ${row('Timeline', d.timeline)}
      ${row('Services', d.services?.join(', '))}
    </table>
    <div class="divider"></div>
    <div class="goal-box">
      <span class="goal-label">Primary goal</span>
      ${d.goal}
    </div>
  </div>
</div>
</body>
</html>`;
}
