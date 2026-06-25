'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { sendNotification } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function IntakeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlPlan = searchParams.get('plan') || '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Pre-fill from session
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session || !formRef.current) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, company')
        .eq('id', session.user.id)
        .single();
      const f = formRef.current;
      const nameField = f.querySelector<HTMLInputElement>('#full-name');
      const emailField = f.querySelector<HTMLInputElement>('#work-email');
      const companyField = f.querySelector<HTMLInputElement>('#company-name');
      if (nameField && !nameField.value && profile?.full_name) nameField.value = profile.full_name;
      if (emailField && !emailField.value) emailField.value = profile?.email || session.user.email || '';
      if (companyField && !companyField.value && profile?.company) companyField.value = profile.company;
    });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => (fd.get(k) as string || '').trim();
    const fullName = get('fullName');
    const workEmail = get('workEmail');
    const revenue = get('revenue');
    const budget = get('budget');
    const goal = get('goal');
    const services = Array.from(e.currentTarget.querySelectorAll<HTMLInputElement>('input[name="services"]:checked')).map((el) => el.value);
    const plan = get('plan') || urlPlan || null;

    if (!fullName || !workEmail || !revenue || !budget || !goal) {
      setError('Please complete all required fields.');
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const inquiryId = crypto.randomUUID();
      const payload: Record<string, unknown> = {
        id: inquiryId,
        full_name: fullName,
        work_email: workEmail,
        company: get('company') || null,
        website: get('website') || null,
        platform: get('platform') || null,
        revenue,
        budget,
        timeline: get('timeline') || null,
        services,
        goal,
      };
      if (plan) payload.plan = plan;

      const { error: insertErr } = await supabase.from('inquiries').insert(payload);
      if (insertErr) { setError('Something went wrong. Please email hello@nexalab.io'); setLoading(false); return; }

      await sendNotification('intake_admin_alert', {
        name: fullName, email: workEmail, company: get('company'), plan, revenue, budget,
        timeline: get('timeline'), services, goal,
      });

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.from('projects').insert({
            client_id: session.user.id,
            inquiry_id: inquiryId,
            name: plan ? `${plan} Project` : 'New Project',
            plan: plan || null,
            status: 'pending',
            description: 'Awaiting review by the NexaLab team.',
          });
        }
      } catch { /* non-blocking */ }

      setSuccess(true);
      setTimeout(() => router.push('/dashboard'), 2200);
    } catch {
      setError('Could not reach our servers. Please email us directly at hello@nexalab.io');
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div id="intake-success" className="intake-success">
        <div className="success-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" stroke="#22d3a8" strokeWidth="1.5" />
            <path d="M7 12l4 4 6-7" stroke="#22d3a8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3>Submission received!</h3>
        <p>Redirecting you to your client portal…</p>
      </div>
    );
  }

  return (
    <form ref={formRef} id="intake-form" noValidate onSubmit={handleSubmit}>
      <input type="hidden" name="plan" value={urlPlan} />

      {urlPlan && (
        <div id="intake-plan-banner" className="intake-plan-banner">
          <span>Selected plan: {urlPlan}</span>
          <a href="/#pricing" className="intake-plan-change">Change plan</a>
        </div>
      )}

      <h2 className="form-title">Project intake</h2>
      <p className="form-subtitle">Fields marked * are required.</p>

      <div className="form-section">
        <p className="form-section-label">About you</p>
        <div className="form-grid">
          <label className="form-field">Full name * <input id="full-name" name="fullName" type="text" placeholder="Jane Smith" required /></label>
          <label className="form-field">Work email * <input id="work-email" name="workEmail" type="email" placeholder="jane@yourbrand.com" required /></label>
          <label className="form-field">Company / brand name <input id="company-name" name="company" type="text" placeholder="Acme Inc." /></label>
          <label className="form-field">Current website <input id="website-url" name="website" type="url" placeholder="https://yourbrand.com" /></label>
        </div>
      </div>

      <div className="form-section">
        <p className="form-section-label">Your business</p>
        <div className="form-grid">
          <label className="form-field">
            Current platform
            <select id="current-platform" name="platform">
              <option value="">Select platform</option>
              <option value="shopify">Shopify / Shopify Plus</option>
              <option value="woocommerce">WooCommerce</option>
              <option value="bigcommerce">BigCommerce</option>
              <option value="magento">Magento / Adobe Commerce</option>
              <option value="custom">Custom-built</option>
              <option value="none">No site yet</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="form-field">
            Monthly revenue *
            <select id="revenue-range" name="revenue" required>
              <option value="">Select range</option>
              <option value="pre-revenue">Pre-revenue / launching</option>
              <option value="under-50k">Under $50k / mo</option>
              <option value="50k-200k">$50k–$200k / mo</option>
              <option value="200k-500k">$200k–$500k / mo</option>
              <option value="500k+">$500k+ / mo</option>
            </select>
          </label>
          <label className="form-field">
            Monthly budget for NexaLab *
            <select id="budget-range" name="budget" required>
              <option value="">Select budget</option>
              <option value="$1k-$3k">$1k – $3k / mo</option>
              <option value="$3k-$7k">$3k – $7k / mo</option>
              <option value="$7k-$15k">$7k – $15k / mo</option>
              <option value="$15k+">$15k+ / mo</option>
            </select>
          </label>
          <label className="form-field">
            Project timeline
            <select id="timeline" name="timeline">
              <option value="">Select timeline</option>
              <option value="asap">ASAP — within 2 weeks</option>
              <option value="1-3mo">1 – 3 months</option>
              <option value="3-6mo">3 – 6 months</option>
              <option value="exploring">Just exploring</option>
            </select>
          </label>
        </div>
      </div>

      <div className="form-section">
        <p className="form-section-label">Services needed <span className="form-label-muted">(select all that apply)</span></p>
        <div className="checkbox-grid">
          {[
            ['storefront', 'Storefront & checkout'],
            ['inventory', 'Inventory & catalog'],
            ['fulfillment', 'Fulfillment & shipping'],
            ['analytics', 'Analytics & growth ops'],
            ['security', 'Security & compliance'],
            ['full-stack', 'Full-stack retainer'],
          ].map(([value, label]) => (
            <label key={value} className="checkbox-field">
              <input type="checkbox" name="services" value={value} />
              <span className="checkbox-box" />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="form-section">
        <p className="form-section-label">Tell us about your project</p>
        <label className="form-field">
          Primary goal &amp; current challenge *
          <textarea
            id="primary-goal"
            name="goal"
            rows={5}
            placeholder="Describe what you're building or fixing. What's slowing you down? What does success look like in 6 months?"
            required
          />
        </label>
      </div>

      {error && <p className="error-text" aria-live="polite">{error}</p>}
      <div className="form-submit-row">
        <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
          {loading ? (
            <svg className="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          ) : 'Submit project intake'}
        </button>
        <p className="submit-note">We never share your data. NDA available on request.</p>
      </div>
    </form>
  );
}
