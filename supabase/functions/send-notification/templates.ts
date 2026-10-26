// Email templates for send-notification — same palette, type, and voice as nexalab.studio.
// Email-safe HTML: table layout, inline styles, web fonts with system fallbacks
// (Apple Mail/iOS load the fonts; Gmail/Outlook fall back gracefully).

export type Data = Record<string, unknown>;
export type Template = { subject: string; html: string };

const SITE = 'https://nexalab.studio';
const C = {
  paper: '#F5EFE4', paper2: '#ECE4D4', card: '#FFFCF6', ink: '#17130E', ink2: '#4A4339', ink3: '#7B7266',
  line: '#E4DCCB', tomato: '#FF5A36', lime: '#C9F266', sky: '#A3CDFF', lilac: '#CDBFFF', sun: '#FFD25E', forest: '#103B2F',
};
const F = {
  display: "'Bricolage Grotesque','Segoe UI',Helvetica,Arial,sans-serif",
  serif: "'Instrument Serif',Georgia,'Times New Roman',serif",
  sans: "Inter,'Segoe UI',Helvetica,Arial,sans-serif",
};

const face = (id: string, size = 160) =>
  id.startsWith('/') ? `${SITE}${id}` : `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&crop=faces&w=${size}&h=${size}&q=80`;

// Mirrors src/lib/site-data.ts (keep in sync if the team changes).
const TEAM = {
  sofia:  { name: 'Sofia Marchetti', role: 'Head of Client Success', city: 'Brooklyn', photo: '1494790108377-be9c29b29330' },
  marcus: { name: 'Marcus Tan', role: 'Co-founder & CEO', city: 'Brooklyn', photo: '1507003211169-0a1dd7228f2d' },
  aj:     { name: 'Al-Hamid (AJ)', role: 'Lead On-Call Developer', city: 'Toronto', photo: '/team/aj.png' },
  hannah: { name: 'Hannah Brooks', role: 'Account Manager', city: 'Toronto', photo: '1573496359142-b8d87734a5a2' },
  amara:  { name: 'Amara Okafor', role: 'Co-founder & Design Director', city: 'Brooklyn', photo: '1531123897727-8f129e1688ce' },
};

export const esc = (v: unknown, fallback = '—') =>
  v === undefined || v === null || v === ''
    ? fallback
    : String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const first = (name: unknown) => String(name ?? '').trim().split(/\s+/)[0] || '';

// ── Building blocks ──────────────────────────────────────────────────────────
// Mobile-first: layouts wrap on their own (fluid inline-block "hybrid" columns,
// stacked label/value rows, moderate padding), so they hold up even in apps that
// strip <style> media queries (e.g. Gmail app with non-Gmail accounts). The media
// queries below only refine spacing on clients that support them.

const X = 28; // horizontal padding inside the card (px)

function layout({ preheader, label, body, footerNote }: { preheader: string; label: string; body: string; footerNote: string }) {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Instrument+Serif:ital@1&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  body{margin:0!important;padding:0!important;width:100%!important;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
  img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}
  a{color:${C.ink};}
  @media (max-width:520px){
    .outer{padding:16px 8px 28px!important}
    .px{padding-left:20px!important;padding-right:20px!important}
    .h1{font-size:32px!important}
    .h2{font-size:22px!important}
    .lead{font-size:16px!important}
    .hide-sm{display:none!important}
    .btn a{display:block!important;text-align:center!important}
    .btn{width:100%!important}
    .tile{max-width:100%!important;margin-right:0!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.paper};-webkit-font-smoothing:antialiased;word-break:break-word;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.paper};">${preheader}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.paper}" style="background:${C.paper};">
<tr><td align="center" class="outer" style="padding:24px 10px 36px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

<!-- Header -->
<tr><td style="padding:0 4px 14px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="font-family:${F.display};font-size:21px;font-weight:800;letter-spacing:-0.03em;color:${C.ink};white-space:nowrap;">
      <span style="display:inline-block;width:24px;height:24px;border-radius:7px;background:${C.ink};vertical-align:-5px;margin-right:7px;text-align:center;line-height:24px;"><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${C.tomato};vertical-align:1px;"></span></span>NexaLab
    </td>
    <td align="right" class="hide-sm" style="font-family:${F.sans};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${C.ink3};">${label}</td>
  </tr></table>
</td></tr>

<!-- Card -->
<tr><td bgcolor="${C.card}" style="background:${C.card};border-radius:22px;border:1px solid ${C.line};overflow:hidden;">
${body}
</td></tr>

<!-- Footer -->
<tr><td class="px" style="padding:24px 16px 0;font-family:${F.sans};font-size:13px;line-height:1.7;color:${C.ink3};text-align:center;">
  <p style="margin:0 0 6px;font-family:${F.display};font-size:15px;font-weight:700;color:${C.ink};">NexaLab — we build and run online stores.</p>
  <p style="margin:0 0 4px;">Brooklyn · Toronto</p>
  <p style="margin:0 0 4px;"><a href="tel:+14162061469" style="color:${C.ink3};">416-206-1469</a> · <a href="mailto:hello@nexalab.studio" style="color:${C.ink3};">hello@nexalab.studio</a></p>
  <p style="margin:0 0 12px;"><a href="${SITE}" style="color:${C.ink3};">Website</a> &nbsp;·&nbsp; <a href="${SITE}/support" style="color:${C.ink3};">Support</a> &nbsp;·&nbsp; <a href="${SITE}/dashboard" style="color:${C.ink3};">Client portal</a></p>
  <p style="margin:0;font-size:12px;color:#A39A8C;">${footerNote}</p>
</td></tr>

</table></td></tr></table>
</body></html>`;
}

const pad = (inner: string, top = 0, bottom = 28) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="px" style="padding:${top}px ${X}px ${bottom}px;">${inner}</td></tr></table>`;

function hero({ kicker, title, accent, lead, bg = C.forest }: { kicker: string; title: string; accent: string; lead: string; bg?: string }) {
  const dark = bg === C.forest;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td bgcolor="${bg}" class="px" style="background:${bg};padding:34px ${X}px 30px;border-radius:22px 22px 0 0;">
  <p style="margin:0 0 12px;font-family:${F.sans};font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${dark ? C.lime : C.ink};">— ${kicker}</p>
  <h1 class="h1" style="margin:0 0 14px;font-family:${F.display};font-size:38px;line-height:1.05;font-weight:700;letter-spacing:-0.03em;color:${dark ? C.paper : C.ink};">${title} <span style="font-family:${F.serif};font-style:italic;font-weight:400;color:${dark ? C.lime : C.tomato};">${accent}</span></h1>
  <p class="lead" style="margin:0;font-family:${F.sans};font-size:17px;line-height:1.6;color:${dark ? 'rgba(245,239,228,0.86)' : C.ink2};">${lead}</p>
</td></tr></table>`;
}

const button = (href: string, label: string, color = C.tomato) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" class="btn"><tr><td bgcolor="${color}" align="center" style="border-radius:999px;background:${color};">
  <a href="${href}" style="display:inline-block;padding:15px 26px;font-family:${F.sans};font-size:16px;line-height:1.2;font-weight:700;color:${color === C.ink || color === C.tomato ? '#ffffff' : C.ink};text-decoration:none;border-radius:999px;">${label}</a>
</td></tr></table>`;

const h2 = (kicker: string, title: string) =>
  `<p style="margin:0 0 6px;font-family:${F.sans};font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${C.ink3};"><span style="color:${C.tomato};">—</span> ${kicker}</p>
<h2 class="h2" style="margin:0 0 16px;font-family:${F.display};font-size:24px;line-height:1.15;font-weight:700;letter-spacing:-0.025em;color:${C.ink};">${title}</h2>`;

const p = (html: string, size = 16) =>
  `<p style="margin:0 0 14px;font-family:${F.sans};font-size:${size}px;line-height:1.65;color:${C.ink2};">${html}</p>`;

const divider = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="px" style="padding:0 ${X}px;"><div style="height:1px;background:${C.line};line-height:1px;font-size:1px;">&nbsp;</div></td></tr></table>`;

// Photo + text side by side; the photo column is narrow enough to fit any phone.
function personCard(person: { name: string; role: string; city: string; photo: string }, note: string, bg = C.lime) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${bg}" style="background:${bg};border-radius:18px;"><tr>
  <td width="72" valign="top" style="padding:20px 0 20px 18px;"><img src="${face(person.photo, 160)}" width="58" height="58" alt="${person.name}" style="display:block;width:58px;height:58px;border-radius:50%;object-fit:cover;border:3px solid ${C.card};"></td>
  <td valign="top" style="padding:20px 18px 20px 12px;font-family:${F.sans};color:${C.ink};">
    <p style="margin:0 0 2px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;opacity:0.7;">Your account lead</p>
    <p style="margin:0;font-family:${F.display};font-size:19px;font-weight:700;letter-spacing:-0.02em;">${person.name}</p>
    <p style="margin:0 0 10px;font-size:14px;opacity:0.8;">${person.role} · ${person.city}</p>
    <p style="margin:0;font-family:${F.serif};font-style:italic;font-size:18px;line-height:1.35;">${note}</p>
  </td></tr></table>`;
}

function timeline(steps: { when: string; title: string; body: string }[]) {
  const dot = [C.tomato, C.sun, C.lime, C.sky, C.lilac];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${steps.map((s, i) => `<tr>
  <td width="38" valign="top" style="padding:0 0 ${i === steps.length - 1 ? 0 : 18}px;">
    <div style="width:30px;height:30px;border-radius:50%;background:${dot[i % dot.length]};text-align:center;line-height:30px;font-family:${F.display};font-size:14px;font-weight:800;color:${i === 0 ? '#fff' : C.ink};">${i + 1}</div>
  </td>
  <td valign="top" style="padding:2px 0 ${i === steps.length - 1 ? 0 : 18}px 4px;font-family:${F.sans};">
    <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${C.ink3};">${s.when}</p>
    <p style="margin:2px 0 3px;font-family:${F.display};font-size:17px;font-weight:700;letter-spacing:-0.015em;color:${C.ink};">${s.title}</p>
    <p style="margin:0;font-size:15px;line-height:1.55;color:${C.ink2};">${s.body}</p>
  </td></tr>`).join('')}</table>`;
}

function checklist(items: string[]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.paper}" style="background:${C.paper};border-radius:16px;"><tr><td style="padding:18px 18px 8px;">
  ${items.map((it) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td width="28" valign="top" style="padding:3px 0 12px;"><div style="width:18px;height:18px;border-radius:5px;border:2px solid ${C.ink};"></div></td>
    <td valign="top" style="padding:0 0 12px;font-family:${F.sans};font-size:15px;line-height:1.55;color:${C.ink};">${it}</td>
  </tr></table>`).join('')}
</td></tr></table>`;
}

// Fluid two-up tiles: inline-blocks up to 258px wide sit side by side on desktop and
// drop to one per row on phones without a media query (.tile widens them where supported).
function tiles(items: { emoji: string; title: string; body: string; bg: string }[]) {
  return `<div style="font-size:0;line-height:0;text-align:left;">${items.map((t, i) => `<div class="tile" style="display:inline-block;width:100%;max-width:258px;vertical-align:top;margin:0 ${i % 2 === 0 ? 10 : 0}px 10px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${t.bg}" style="background:${t.bg};border-radius:16px;"><tr><td style="padding:16px 16px 14px;font-family:${F.sans};font-size:14px;line-height:1.5;color:${C.ink};">
      <p style="margin:0 0 8px;font-size:22px;line-height:1;">${t.emoji}</p>
      <p style="margin:0 0 4px;font-family:${F.display};font-size:16px;line-height:1.3;font-weight:700;letter-spacing:-0.015em;">${t.title}</p>
      <p style="margin:0;font-size:14px;line-height:1.5;opacity:0.85;">${t.body}</p>
    </td></tr></table>
  </div>`).join('')}</div>`;
}

// Fluid team grid: fixed-width cards that wrap 4 → 2 per row on phones.
function teamRow(people: { name: string; role: string; photo: string }[]) {
  return `<div style="font-size:0;line-height:0;text-align:center;">${people.map((m) => `<div style="display:inline-block;width:126px;vertical-align:top;padding:4px 2px 14px;text-align:center;">
    <img src="${face(m.photo, 180)}" width="68" height="68" alt="${m.name}" style="display:block;margin:0 auto 9px;width:68px;height:68px;border-radius:50%;object-fit:cover;">
    <p style="margin:0;font-family:${F.display};font-size:15px;line-height:1.25;font-weight:700;color:${C.ink};">${m.name}</p>
    <p style="margin:3px 0 0;font-family:${F.sans};font-size:13px;line-height:1.35;color:${C.ink3};">${m.role}</p>
  </div>`).join('')}</div>`;
}

// Label stacked above value: reads well at any width.
function infoTable(rows: [string, string][]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.line};border-radius:16px;border-collapse:separate;">${rows.map(([k, v], i) => `<tr><td style="padding:13px 16px;${i ? `border-top:1px solid ${C.line};` : ''}font-family:${F.sans};">
    <p style="margin:0 0 3px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${C.ink3};">${k}</p>
    <p style="margin:0;font-size:15px;line-height:1.5;color:${C.ink};">${v}</p>
  </td></tr>`).join('')}</table>`;
}

function signoff(person: { name: string; role: string; photo: string }, line: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
  <td width="62" valign="top" style="padding-right:12px;"><img src="${face(person.photo, 120)}" width="50" height="50" alt="${person.name}" style="display:block;width:50px;height:50px;border-radius:50%;object-fit:cover;"></td>
  <td valign="middle" style="font-family:${F.sans};font-size:15px;line-height:1.4;color:${C.ink2};">
    <span style="font-family:${F.serif};font-style:italic;font-size:19px;color:${C.ink};">${line}</span><br>
    <strong style="color:${C.ink};">${person.name}</strong><br>${person.role}
  </td></tr></table>`;
}

// Compact branded layout for internal (admin) alerts.
function adminAlert(title: string, rows: [string, unknown][], link: { href: string; label: string }, accent = C.tomato) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:${C.paper};font-family:${F.sans};word-break:break-word;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper};"><tr><td align="center" style="padding:20px 10px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${C.card};border-radius:18px;border:1px solid ${C.line};overflow:hidden;">
<tr><td style="background:${C.ink};padding:15px 20px;font-family:${F.display};font-size:16px;font-weight:700;color:${C.paper};">
  <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${accent};margin-right:8px;"></span>${esc(title)}</td></tr>
<tr><td style="padding:8px 20px 4px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.map(([k, v], i) => `<tr><td style="padding:10px 0;${i ? `border-top:1px solid ${C.line};` : ''}">
    <p style="margin:0 0 2px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${C.ink3};">${k}</p>
    <p style="margin:0;font-size:14px;line-height:1.5;color:${C.ink};white-space:pre-wrap;">${esc(v)}</p></td></tr>`).join('')}</table>
</td></tr>
<tr><td style="padding:12px 20px 22px;">${button(link.href, link.label, C.ink)}</td></tr>
</table></td></tr></table></body></html>`;
}

const SUPPORT_ROWS: [string, string][] = [
  ['Reply to this email', 'Goes straight to a real person at <a href="mailto:hello@nexalab.studio">hello@nexalab.studio</a>.'],
  ['Support hours', 'Mon–Fri 8am–8pm ET · Sat 10am–4pm ET. Average first reply: under 10 minutes.'],
  ['Phone', '<a href="tel:+14162061469">416-206-1469</a>'],
  ['Open a ticket', `<a href="${SITE}/support#ticket">nexalab.studio/support</a> — get a reference number instantly and track it in your portal.`],
  ['Store down?', 'Open an <strong>Urgent</strong> ticket or call — our on-call developer picks up within 15 minutes, 24/7, on Operate &amp; Scale plans.'],
];

// ── Supabase Auth emails ────────────────────────────────────────────────────
// Pasted into Supabase → Authentication → Emails. They use Supabase's Go-template
// placeholders ({{ .ConfirmationURL }}, {{ .Token }}, {{ .Email }}, {{ .NewEmail }})
// instead of runtime data. Regenerate the HTML with: deno run -A supabase/templates/generate.ts

const code = (token: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" bgcolor="${C.paper}" style="background:${C.paper};border-radius:16px;border:1px dashed ${C.ink3};"><tr>
  <td style="padding:18px 28px;font-family:'Courier New',monospace;font-size:34px;font-weight:700;letter-spacing:0.3em;color:${C.ink};">${token}</td></tr></table>`;

const securityNote = (what: string) =>
  pad(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#FFE3DB" style="background:#FFE3DB;border-radius:16px;"><tr><td style="padding:16px 20px;font-family:${F.sans};font-size:15px;line-height:1.55;color:${C.ink};">
    <strong>Wasn’t you?</strong> ${what} Reset your password right away and call us on <a href="tel:+14162061469">416-206-1469</a> — our on-call developer answers 24/7 for account security.
  </td></tr></table>`, 0, 28);

const smallNote = (text: string) => `<p style="margin:14px 0 0;font-family:${F.sans};font-size:14px;color:${C.ink3};">${text}</p>`;
const ignoreLine = (text: string) => pad(p(text, 14), 0, 32);
const hl = (v: string) => `<strong style="color:${C.lime};">${v}</strong>`;

export type AuthEmail = { file: string; supabaseName: string; subject: string; html: string };

export function authEmails(): AuthEmail[] {
  const wrap = (label: string, preheader: string, body: string[], footerNote = 'You’re receiving this because of activity on your NexaLab client account.') =>
    layout({ preheader, label, body: body.join(''), footerNote });

  return [
    {
      file: 'confirm-signup.html', supabaseName: 'Confirm signup', subject: 'Confirm your NexaLab account',
      html: wrap('Confirm your account', 'Confirm your email to activate your NexaLab client portal.', [
        hero({ kicker: 'Confirm your email', title: 'One click and', accent: 'you’re in.', lead: 'Confirm your email to activate your NexaLab client portal. You’ll go straight into a quick onboarding so we can book your kickoff call.' }),
        pad(button('{{ .ConfirmationURL }}', 'Confirm my email →') + smallNote('This link expires in 24 hours.'), 32, 28),
        divider,
        pad(h2('What happens next', 'Three quick steps.') + timeline([
          { when: 'Right after you confirm', title: 'A 3-minute onboarding', body: 'Tell us about your business, goals, and the best times for a call.' },
          { when: 'Within 1 business day', title: 'Meet your account lead', body: 'Sofia reaches out to book your 30-minute kickoff.' },
          { when: 'Within 48 hours of kickoff', title: 'Your plan & fixed price', body: 'A clear scope and timeline, in writing.' },
        ]), 32, 28),
        ignoreLine('Didn’t sign up for NexaLab? You can safely ignore this email — no account will be created.'),
      ], 'You’re receiving this because someone signed up for NexaLab with this address.'),
    },
    {
      file: 'reset-password.html', supabaseName: 'Reset password', subject: 'Reset your NexaLab password',
      html: wrap('Account security', 'Choose a new password for your NexaLab client portal.', [
        hero({ kicker: 'Password reset', title: 'Let’s get you', accent: 'back in.', lead: `We got a request to reset the password for ${hl('{{ .Email }}')}. Click below to choose a new one.` }),
        pad(button('{{ .ConfirmationURL }}', 'Choose a new password →') + smallNote('For your security, this link expires in 1 hour and can only be used once.'), 32, 28),
        divider,
        pad(h2('Good to know', 'A few quick tips.') + checklist([
          'Use <strong>at least 8 characters</strong> — a short phrase is easier to remember and harder to guess.',
          'Don’t reuse a password from another site.',
          'You can also sign in with <strong>Google</strong> or <strong>GitHub</strong> from the login page — no password needed.',
        ]), 32, 28),
        ignoreLine('Didn’t ask to reset your password? Ignore this email — your password won’t change unless you click the button above.'),
      ]),
    },
    {
      file: 'magic-link.html', supabaseName: 'Magic link', subject: 'Your NexaLab sign-in link',
      html: wrap('Sign in', 'Your one-click sign-in link for the NexaLab client portal.', [
        hero({ kicker: 'Sign-in link', title: 'Your sign-in', accent: 'link.', lead: `Click below to sign in to your NexaLab client portal as ${hl('{{ .Email }}')} — no password needed.` }),
        pad(button('{{ .ConfirmationURL }}', 'Sign in to NexaLab →') + smallNote('This link expires in 1 hour and works once.'), 32, 28),
        ignoreLine('Didn’t try to sign in? You can safely ignore this email — nobody can sign in without this link.'),
      ]),
    },
    {
      file: 'invite-user.html', supabaseName: 'Invite user', subject: 'You’re invited to the NexaLab client portal',
      html: wrap('Invitation', 'You’ve been invited to a NexaLab client portal.', [
        hero({ kicker: 'You’re invited', title: 'Come on', accent: 'in.', lead: `The NexaLab team has invited ${hl('{{ .Email }}')} to a client portal — where your project, deliverables, store stats, and support all live in one place.` }),
        pad(button('{{ .ConfirmationURL }}', 'Accept invitation →') + smallNote('You’ll set a password, then take a 3-minute onboarding.'), 32, 28),
        divider,
        pad(h2('Inside your portal', 'Everything in one place.') + tiles([
          { emoji: '🗺️', title: 'Project timeline', body: 'Every milestone and due date, updated as we work.', bg: C.lime },
          { emoji: '📦', title: 'Deliverables', body: 'Designs, files, repos, and links.', bg: C.sky },
          { emoji: '📈', title: 'Live store stats', body: 'Orders and revenue from your store.', bg: C.lilac },
          { emoji: '🎫', title: 'Support tickets', body: 'Ask for anything and track replies.', bg: C.sun },
        ]), 32, 28),
        ignoreLine('Not expecting this? You can ignore it — no account is created until you accept.'),
      ], 'You’re receiving this because the NexaLab team invited this address.'),
    },
    {
      file: 'change-email.html', supabaseName: 'Change email address', subject: 'Confirm your new NexaLab email address',
      html: wrap('Account security', 'Confirm the new email address for your NexaLab account.', [
        hero({ kicker: 'Email change', title: 'Confirm your', accent: 'new email.', lead: `You asked to change your NexaLab sign-in email from ${hl('{{ .Email }}')} to ${hl('{{ .NewEmail }}')}.` }),
        pad(button('{{ .ConfirmationURL }}', 'Confirm new email →') + smallNote('Until you confirm, you’ll keep signing in with your current email.'), 32, 28),
        securityNote('If you didn’t request this, don’t click the button.'),
      ]),
    },
    {
      file: 'reauthentication.html', supabaseName: 'Reauthentication', subject: 'Your NexaLab verification code',
      html: wrap('Account security', 'Your one-time NexaLab verification code.', [
        hero({ kicker: 'Verification code', title: 'Confirm it’s', accent: 'you.', lead: 'Enter this code in the NexaLab portal to finish what you were doing. It keeps sensitive changes to your account safe.' }),
        pad(code('{{ .Token }}') + smallNote('This code expires in 10 minutes. Never share it — NexaLab will never ask you for it.'), 32, 28),
        securityNote('If you didn’t request a code, someone may know your password.'),
      ]),
    },
    {
      file: 'password-changed.html', supabaseName: 'Password changed (security notification)', subject: 'Your NexaLab password was changed',
      html: wrap('Account security', 'The password for your NexaLab account was just changed.', [
        hero({ kicker: 'Security notice', title: 'Your password was', accent: 'changed.', lead: `The password for ${hl('{{ .Email }}')} was just updated. If that was you, you’re all set — nothing else to do.` }),
        pad(button('https://nexalab.studio/auth', 'Sign in to NexaLab →', C.ink), 32, 28),
        securityNote('Someone else may have access to your account.'),
      ]),
    },
    {
      file: 'email-changed.html', supabaseName: 'Email address changed (security notification)', subject: 'Your NexaLab sign-in email was changed',
      html: wrap('Account security', 'The sign-in email for your NexaLab account was changed.', [
        hero({ kicker: 'Security notice', title: 'Your email was', accent: 'changed.', lead: `The sign-in email for your NexaLab account changed from ${hl('{{ .OldEmail }}')} to ${hl('{{ .Email }}')}.` }),
        pad('', 28, 0),
        securityNote('Your account may have been accessed by someone else.'),
        ignoreLine('If you made this change, there’s nothing else to do. Future emails will go to your new address.'),
      ]),
    },
  ];
}

// ── Templates ────────────────────────────────────────────────────────────────

export function buildTemplate(type: string, data: Data): Template | null {
  const d = (k: string, fallback?: string) => esc(data[k], fallback);
  const name = esc(first(data.name), 'there');

  switch (type) {
    case 'welcome': {
      const body = [
        hero({
          kicker: 'Welcome to NexaLab',
          title: `Welcome aboard,`,
          accent: `${name}.`,
          lead: 'From today, a team of designers, engineers, and support folks is working for your store. This email has everything you need for the next two weeks — who to talk to, what happens when, and what to have ready.',
        }),
        pad(`${button(`${SITE}/onboarding`, 'Finish onboarding →')}
          <p style="margin:14px 0 0;font-family:${F.sans};font-size:14px;color:${C.ink3};">Takes about 3 minutes. It tells us about your business and goals, so your kickoff call starts with answers instead of questions.</p>`, 32, 32),
        pad(personCard(TEAM.sofia, '“I’ll be your main point of contact from kickoff to launch — and long after. I’ll email you within one business day to book your kickoff.”'), 0, 36),
        divider,
        pad(`${h2('Your first 14 days', 'Here’s exactly what happens next.')}
          ${timeline([
            { when: 'Today', title: 'Finish onboarding', body: 'Tell us about your business, goals, and the best times for a call. About 3 minutes.' },
            { when: 'Within 1 business day', title: '30-minute kickoff call', body: 'You, Sofia, and a strategist. We walk through your store, your numbers, and what’s slowing you down. No pitch deck.' },
            { when: 'Within 48 hours of kickoff', title: 'Your plan & fixed price', body: 'A clear scope, timeline, and price in writing — milestones show up in your portal the moment you approve.' },
            { when: 'Days 3–14', title: 'The build sprint', body: 'We design and build in the open: weekly demos, daily progress in your portal, and a direct line to the people doing the work.' },
            { when: 'Day 14', title: 'Launch — then we keep going', body: 'Your store goes live. From there, monthly growth experiments, weekly reports, and same-day support.' },
          ])}`, 36, 36),
        divider,
        pad(`${h2('Before your kickoff', 'Have these handy — it saves a week.')}
          ${checklist([
            '<strong>Store admin access</strong> — we’ll send a secure collaborator invite. <em>Never email us passwords.</em>',
            '<strong>Your logo and brand guidelines</strong> — fonts, colors, and any photography you love.',
            '<strong>Analytics access</strong> — Google Analytics, Meta Business, and your email tool (Klaviyo etc.).',
            '<strong>Your current numbers</strong> — monthly revenue, conversion rate, and average order value, even rough ones.',
            '<strong>Your top 3 goals</strong> for the next 6 months, and anything with a hard deadline.',
          ])}`, 36, 36),
        divider,
        pad(`${h2('Your client portal', 'Everything in one place.')}
          ${tiles([
            { emoji: '🗺️', title: 'Project timeline', body: 'Every milestone, task, and due date — updated as we work.', bg: C.lime },
            { emoji: '📦', title: 'Deliverables', body: 'Designs, files, repos, and links, ready to download.', bg: C.sky },
            { emoji: '📈', title: 'Live store stats', body: 'Orders and revenue synced from your store every 15 minutes.', bg: C.lilac },
            { emoji: '🎫', title: 'Support tickets', body: 'Open a ticket, see replies, and track every request.', bg: C.sun },
          ])}
          <div style="height:18px;"></div>${button(`${SITE}/dashboard`, 'Open your client portal', C.ink)}`, 36, 36),
        divider,
        pad(`${h2('Your team', 'Real people — you’ll know us all by name.')}
          ${teamRow([TEAM.sofia, TEAM.marcus, TEAM.aj, TEAM.hannah])}`, 36, 24),
        divider,
        pad(`${h2('Reaching us', 'However you like — we answer fast.')}${infoTable(SUPPORT_ROWS)}`, 36, 36),
        pad(`${p('We’re genuinely excited to work with you. If anything at all is unclear, just hit reply.')}
          ${signoff(TEAM.marcus, 'Personally — welcome.')}`, 0, 40),
      ].join('');
      return {
        subject: `Welcome to NexaLab, ${first(data.name) || 'there'} — here’s what happens next`,
        html: layout({
          preheader: 'Your account lead, your first 14 days, what to prepare, and how to reach us any time.',
          label: 'Client onboarding',
          body,
          footerNote: 'You’re receiving this because you created a NexaLab client account.',
        }),
      };
    }

    case 'project_approved': {
      const plan = d('plan', 'NexaLab');
      const body = [
        hero({ kicker: 'Project approved', title: 'You’re good to go,', accent: `${name}.`, lead: `Your project is approved and your client portal is now fully active on the <strong style="color:${C.lime};">${plan}</strong> plan. Here’s what happens from here.` }),
        pad(button(`${SITE}/dashboard`, 'Open your client portal →'), 32, 32),
        pad(`${h2('What happens now', 'The next few days.')}${timeline([
          { when: 'Today', title: 'Your portal fills up', body: 'Milestones, tasks, and due dates appear on your Project page as we set up your sprint.' },
          { when: 'Within 48 hours', title: 'Access & assets', body: 'Sofia sends secure invites for your store and analytics, plus a short list of brand assets we need.' },
          { when: 'This week', title: 'The build begins', body: 'Daily progress in your portal and a demo at the end of every week.' },
        ])}`, 0, 36),
        divider,
        pad(`${h2('Who to talk to', 'Your team on this project.')}${teamRow([TEAM.sofia, TEAM.amara, TEAM.aj])}`, 36, 24),
        divider,
        pad(`${h2('Reaching us', 'Any time you need us.')}${infoTable(SUPPORT_ROWS)}`, 36, 40),
      ].join('');
      return {
        subject: 'Your NexaLab project is approved 🎉',
        html: layout({ preheader: 'Your portal is live — here’s what happens over the next few days.', label: 'Project update', body, footerNote: 'You’re receiving this because you have a NexaLab client account.' }),
      };
    }

    case 'project_rejected': {
      const body = [
        hero({ kicker: 'Project update', title: 'Thank you,', accent: `${name}.`, lead: 'We read every intake carefully, and we wanted to let you know personally where things landed.', bg: C.paper2 }),
        pad(`${p('After reviewing your project, we aren’t able to take it on right now. That usually comes down to <strong>timing or fit</strong> — our sprint calendar is full, or what you need is outside what we do best — rather than anything about the project itself.')}
          ${p('We’d still love to help however we can:')}
          ${checklist([
            '<strong>Reply to this email</strong> and we’ll happily jump on a free 20-minute call to point you in the right direction.',
            '<strong>Timing changes?</strong> We open new sprint slots every month — reply and we’ll put you at the front of the line.',
            '<strong>Smaller scope?</strong> A focused project (checkout, speed, or tracking) can often start sooner.',
          ])}`, 32, 28),
        pad(signoff(TEAM.sofia, 'Wishing you every success.'), 0, 40),
      ].join('');
      return {
        subject: 'An update on your NexaLab project',
        html: layout({ preheader: 'Where your project landed, and how we can still help.', label: 'Project update', body, footerNote: 'You’re receiving this because you submitted a project intake to NexaLab.' }),
      };
    }

    case 'ticket_reply_client': {
      const body = [
        hero({ kicker: `Ticket ${d('ticketRef', '')}`, title: 'Your team', accent: 'replied.', lead: `Hi ${name} — there’s a new reply on <strong style="color:${C.lime};">${d('ticketTitle', 'your ticket')}</strong>.` }),
        pad(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.lilac}" style="background:${C.lilac};border-radius:18px 18px 18px 6px;"><tr><td style="padding:20px 22px;font-family:${F.sans};font-size:16px;line-height:1.6;color:${C.ink};white-space:pre-wrap;">${d('replyContent', '')}</td></tr></table>
          <p style="margin:10px 0 24px;font-family:${F.sans};font-size:13px;color:${C.ink3};">— ${d('authorName', 'The NexaLab team')}</p>
          ${button(`${SITE}/dashboard/support`, 'View the ticket & reply →')}`, 32, 32),
        divider,
        pad(infoTable(SUPPORT_ROWS.slice(1)), 32, 40),
      ].join('');
      return {
        subject: `Re: [${String(data.ticketRef ?? '#')}] ${String(data.ticketTitle ?? 'Support ticket')}`,
        html: layout({ preheader: String(data.replyContent ?? 'New reply on your support ticket').slice(0, 120), label: 'Support', body, footerNote: 'You’re receiving this because you have an open ticket with NexaLab.' }),
      };
    }

    case 'intake_confirm': {
      const body = [
        hero({ kicker: 'Intake received', title: 'Got it,', accent: `${name}.`, lead: 'Thanks for telling us about your project. A real strategist is reading it now — here’s what happens next.' }),
        pad(`${timeline([
          { when: 'Today', title: 'We review your intake', body: 'Usually within a few hours during support hours.' },
          { when: 'Next', title: '30-minute strategy call', body: 'We look at your store together and map the gaps. No pitch deck.' },
          { when: 'Within 48 hours', title: 'Scope, timeline & fixed price', body: 'In writing, with no surprises.' },
        ])}<div style="height:24px;"></div>${button(`${SITE}/dashboard`, 'Open your client portal →')}`, 32, 36),
        divider,
        pad(infoTable([['Plan', d('plan', 'Not selected yet')], ...SUPPORT_ROWS.slice(1, 3)]), 32, 40),
      ].join('');
      return {
        subject: 'We received your project intake — NexaLab',
        html: layout({ preheader: 'A strategist is reviewing it now. Here’s what happens next.', label: 'Project intake', body, footerNote: 'You’re receiving this because you submitted a project intake to NexaLab.' }),
      };
    }

    // ── Internal alerts ──────────────────────────────────────────────────────
    case 'onboarding_complete_admin':
      return {
        subject: `Onboarding complete: ${String(data.name ?? 'New client')} — ${String(data.company ?? 'No company')}`,
        html: adminAlert('A client finished onboarding', [
          ['Name', data.name], ['Email', data.email], ['Company', data.company], ['Role', data.jobTitle], ['Phone', data.phone],
          ['Website', data.website], ['Platform', data.platform], ['Revenue', data.revenue],
          ['Services', Array.isArray(data.services) ? data.services.join(', ') : ''], ['Goal', data.goal],
          ['Kickoff', `${data.kickoffDays ?? ''} · ${data.kickoffTimes ?? ''} · ${data.timezone ?? ''} · ${data.channel ?? ''}`], ['Notes', data.notes],
        ], { href: `${SITE}/admin/pending`, label: 'Open Admin Portal →' }, C.lime),
      };

    case 'intake_admin_alert':
      return {
        subject: `New intake: ${String(data.name ?? 'Unknown')} — ${String(data.company ?? 'No company')}`,
        html: adminAlert('New project intake', [
          ['Name', data.name], ['Email', data.email], ['Company', data.company], ['Plan', data.plan], ['Revenue', data.revenue],
          ['Budget', data.budget], ['Timeline', data.timeline], ['Services', Array.isArray(data.services) ? data.services.join(', ') : ''], ['Goal', data.goal],
        ], { href: `${SITE}/admin/pending`, label: 'Review in Admin Portal →' }),
      };

    case 'application_admin_alert':
      return {
        subject: `New application: ${String(data.name ?? 'Unknown')} — ${String(data.role ?? 'General')}`,
        html: adminAlert('New job application', [
          ['Role', data.role], ['Name', data.name], ['Email', data.email], ['Location', data.location], ['Experience', data.experience],
          ['LinkedIn', data.linkedin], ['Portfolio', data.portfolio], ['Resume', data.hasResume ? 'Attached (Storage → resumes)' : 'Not attached'],
        ], { href: `${SITE}/admin`, label: 'Open Admin Portal →' }, C.sky),
      };

    case 'support_request_admin_alert':
      return {
        subject: `${data.priority === 'urgent' ? '[URGENT] ' : ''}Support ${String(data.ref ?? '')}: ${String(data.subject ?? 'New request').slice(0, 120)}`,
        html: adminAlert(`${data.priority === 'urgent' ? 'URGENT — ' : ''}New support ${data.isClient ? 'ticket' : 'request'} ${String(data.ref ?? '')}`, [
          ['Priority', data.priority], ['Topic', data.topic], ['Name', data.name], ['Email', data.email], ['Store', data.storeUrl],
          ['Subject', data.subject], ['Details', data.description],
        ], { href: `${SITE}/admin/tickets`, label: 'Open in Admin Portal →' }, data.priority === 'urgent' ? C.tomato : C.sun),
      };

    case 'ticket_reply_admin':
      return {
        subject: `Client reply: [${String(data.ticketRef ?? '#')}] ${String(data.ticketTitle ?? 'Support ticket')}`,
        html: adminAlert(`${String(data.clientName ?? 'A client')} replied`, [
          ['Ticket', `${data.ticketRef ?? ''} ${data.ticketTitle ?? ''}`], ['Reply', data.replyContent],
        ], { href: `${SITE}/admin/tickets`, label: 'View in Admin Portal →' }, C.lilac),
      };
  }
  return null;
}
