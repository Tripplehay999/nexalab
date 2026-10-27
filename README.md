# NexaLab

The website, client portal, and admin for **[NexaLab](https://nexalab.studio)**, a commerce agency that builds and runs online stores for growing brands.

One Next.js app serves three things:

| Area | URL | Who it's for |
|---|---|---|
| **Marketing site** | `/`, `/services`, `/work`, `/about`, `/careers`, `/support` | Everyone |
| **Client portal** | `/dashboard/*`, `/onboarding`, `/invoice/[id]` | Signed-in clients |
| **Admin** | `/admin/*` | NexaLab staff (`profiles.role = 'admin'`) |

---

## Features

**Marketing site.** Brand pages, case studies, a careers page with roles and applications, and a support page with a public ticket form.

**Client portal**
- **Onboarding:** a 5-step flow after signup (business, goals, kickoff preferences) that creates the client's project.
- **Home:** project status in plain language, a live website preview with uptime check, "needs your attention", key numbers, and their assigned team.
- **Project:** milestones and tasks, plus recent GitHub commits and deploys for custom-built sites.
- **Deliverables, Store, Support:** files and links from the team, live orders, and support tickets.
- **Insights:** charts of their numbers and goals. Data comes from Google Analytics 4, Plausible, CSV import, manual entry, or the store sync.
- **Resources:** drag-and-drop file uploads (private storage) and shared links.
- **Billing:** their plan, balance, invoices with card payment (Stripe Checkout), and receipts.
- **Guided tour:** skippable, and can be replayed from the sidebar.

**Admin**
- **Overview:** what needs action, clients without a team, and staff workload.
- **Clients:** a page per client with tabs for team, project, billing, deliverables, insights, resources and activity.
- **Team:** staff profiles, assignable to clients with a role and one account lead.
- **Billing:** recurring revenue, collected this month and year, outstanding and overdue, an invoice editor, manual payments, and automatic monthly invoices.
- **Pending, Inquiries, Tickets:** the approvals and support queues.

**Integrations**
- **Stores:** Shopify, WooCommerce and BigCommerce sync every 15 minutes. Custom-built sites push orders to an [order webhook](#order-webhook-custom-built-sites).
- **Analytics:** Google Analytics 4 (sign in with Google), Plausible (API key), CSV, or the built-in [site tracker](#site-tracker-embed-code) — one script tag for custom-built sites.
- **GitHub:** links a repo to show recent commits and deployments.
- **Payments:** Stripe Checkout, with a signed webhook.

**Email.** Branded transactional emails sent through Resend from `hello@nexalab.studio`: the welcome email, invoices, receipts, ticket replies, and project approvals. There are also branded templates for Supabase's account emails.

---

## Tech stack

- **Next.js 16** (App Router, Turbopack), **React 19**, **TypeScript**, hand-written CSS (no UI framework)
- **Supabase:** Postgres with Row Level Security, Auth, Storage, and Edge Functions (Deno)
- **Resend** for email, **Stripe** for payments, **Vercel** for hosting and cron jobs

```
src/
  app/
    (site)/            Marketing site (own layout + site.css)
    auth/              Sign in / sign up / password reset (+ /auth/confirm for email links)
    onboarding/        New-client onboarding flow
    dashboard/         Client portal pages
    admin/             Admin pages
    invoice/[id]/      Printable invoice / receipt
    api/               Route handlers (integrations, billing, ingest, site status)
    portal.css         Portal + admin styles
  components/
    site/              Marketing components
    portal/            Portal shell, tour, charts, cards, connectors
  lib/                 Supabase clients, data helpers, billing, integrations
supabase/
  migrations/          SQL migrations, run in order (001 → 015)
  functions/           Edge Functions: send-notification (email), sync-store, contact-submit
  templates/           Supabase Auth email templates (generated, see below)
```

---

## Getting started

```bash
npm install
cp .env.example .env.local   # or create it — see variables below
npm run dev                   # http://localhost:3000
```

Other scripts: `npm run build`, `npm run start`, `npm run lint`.

### Environment variables

| Variable | Where | Required for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + `.env.local` | Everything |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + `.env.local` | Everything |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel (server only, **never** `NEXT_PUBLIC_`) | Integrations, store connect, order webhook, Stripe webhook, cron |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Vercel | Google Analytics connections |
| `STRIPE_SECRET_KEY` | Vercel | Card payments |
| `STRIPE_WEBHOOK_SECRET` | Vercel | Marking invoices paid automatically |
| `CRON_SECRET` | Vercel | Daily analytics sync + monthly auto-invoices |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Vercel (optional) | Cloudflare Turnstile bot check on public forms and sign-in |
| `RATE_LIMIT_SALT` | Vercel (optional) | Salt for hashed IPs in rate limits |

`NEXT_PUBLIC_*` values are baked in at build time, so **redeploy after changing them**.

---

## Supabase setup

1. **Migrations:** run every file in `supabase/migrations/` in order, either with `supabase db push` or by pasting each into the SQL Editor. All recent migrations are safe to re-run.
2. **Edge Functions:**
   ```bash
   supabase functions deploy send-notification
   supabase functions deploy sync-store
   ```
3. **Function secrets** (Dashboard → Edge Functions → Secrets): `RESEND_API_KEY`, `FROM_EMAIL` (`NexaLab <hello@nexalab.studio>`), `ADMIN_EMAIL`, `CRON_SECRET`.
4. **Auth:**
   - Under URL Configuration, set the Site URL to `https://nexalab.studio` and add `https://nexalab.studio/**` as a redirect URL.
   - Turn on custom SMTP with Resend (`smtp.resend.com:465`, user `resend`).
   - **Only if you set `NEXT_PUBLIC_TURNSTILE_SITE_KEY`:** enable Attack Protection → Captcha → Turnstile with the same secret key. Otherwise leave it off — sign-in fails if Supabase expects a captcha the app doesn't send.
5. **Email templates:** paste each file in `supabase/templates/` into Authentication → Emails. [supabase/templates/README.md](supabase/templates/README.md) lists which file goes where and the subject for each. To change them, edit `supabase/functions/send-notification/templates.ts`, then run:
   ```bash
   deno run --allow-read --allow-write supabase/templates/generate.ts
   ```
6. **Make yourself an admin:**
   ```sql
   update public.profiles set role = 'admin' where email = 'you@nexalab.studio';
   ```

### Integrations

- **Google Analytics:**
  1. Create an OAuth client (Web) in Google Cloud and enable the *Google Analytics Admin API* and *Google Analytics Data API*.
  2. Add the redirect URI `https://nexalab.studio/api/integrations/google/callback`.
  3. Publish the consent screen to **In production**. In testing mode, Google tokens expire after 7 days.
- **Stripe:**
  1. Add a webhook endpoint `https://nexalab.studio/api/billing/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
  2. Copy its signing secret to `STRIPE_WEBHOOK_SECRET`.
- **Cron:** `vercel.json` schedules `/api/integrations/sync-all` (analytics) and `/api/billing/cron` (auto-invoices) daily. Vercel authenticates them with `CRON_SECRET`. Store syncs run every 15 minutes via `pg_cron` (migration 007).

---

## Order webhook (custom-built sites)

A client creates a webhook in **Store → Custom-built** and gets a secret key starting `nxk_`. It's shown once and stored hashed.

```http
POST https://nexalab.studio/api/ingest/orders
Authorization: Bearer nxk_…
Content-Type: application/json

{ "orders": [ {
  "id": "1001",                        // required, unique per order (re-sending updates it)
  "amount": 129.50,                    // required
  "currency": "USD",
  "status": "paid",                    // refunded / cancelled orders are excluded from totals
  "customer_name": "Jane Smith",
  "customer_email": "jane@example.com",
  "ordered_at": "2026-10-26T14:03:00Z"
} ] }
```

You can send a single order object or `{ "orders": [...] }` with up to 500 orders. The response is `{ received, skipped, errors }`. Daily revenue and orders are recalculated automatically.

---

## Site tracker (embed code)

For custom-built sites, clients (or admins on a client's Insights tab) click **Get tracking code** on Insights and paste one tag before `</head>`:

```html
<script defer src="https://nexalab.studio/t.js" data-site="nxs_…"></script>
```

It reports page views (including single-page-app navigation), unique visitors, top pages and referrers / `utm_source` to `POST /api/t`. To track sales, call this from the order-confirmation page:

```html
<script>
  window.nexalab = window.nexalab || function () { (window.nexalab.q = window.nexalab.q || []).push(arguments); };
  nexalab('order', { id: '1001', value: 129.50, currency: 'USD' });
</script>
```

- **No cookies and no personal data.** A visitor is a SHA-256 of a daily-rotating salt, IP and user agent, so it can't be reversed or linked across days.
- **Allowed domains:** events from other origins are dropped, so a copied key can't pollute stats. Bots are filtered and each IP is rate-limited.
- **Orders** are de-duplicated by `id`, so a reloaded thank-you page counts once.
- The Insights card shows the last 30 days live. The daily cron also rolls monthly totals into the charts (source *Site tracker*).

For exact order data (status, customers, refunds), use the server-side [order webhook](#order-webhook-custom-built-sites) instead.

---

## Security notes

- **Row Level Security is on for every table.** Clients can only read their own data, and drafts and internal records are hidden from them.
- **Clients can't promote themselves to admin or change their notification email.** A database trigger blocks it.
- **Tokens and API keys** (Google, Plausible, store, GitHub) live in service-role-only tables or columns. The browser can't read them.
- **Server-side requests to user-supplied addresses** reject private and internal hosts.
- **User-supplied links must be `http(s)`.** This is enforced in the database and again when links are rendered.
- **Stripe webhooks are verified** with HMAC (5-minute tolerance), and payment amounts always come from the database.
- **Public forms** (support tickets and job applications) go through server routes with per-IP rate limits (`rate_limit_hit`), a honeypot field, a minimum fill time, and optional Turnstile. Anonymous direct inserts are blocked in the database, and admin email alerts need a signed-in caller or the server.
- **Security headers** are set in `next.config.ts`: no framing, `nosniff`, HSTS, and a strict referrer policy.

---

© NexaLab Studio · Brooklyn & Toronto · hello@nexalab.studio
