'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Panel = 'signin' | 'signup' | 'check-email' | 'reset-email';

function AuthCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlMode    = searchParams.get('mode')      || '';
  const urlEmail   = searchParams.get('email')     || '';
  const urlFirst   = searchParams.get('firstName') || '';
  const urlCompany = searchParams.get('company')   || '';
  const urlPlan    = searchParams.get('plan')      || '';

  const [tab, setTab]   = useState<'signin' | 'signup'>(urlMode === 'signup' ? 'signup' : 'signin');
  const [panel, setPanel] = useState<Panel>(urlMode === 'signup' ? 'signup' : 'signin');

  // Sign in state
  const [siEmail, setSiEmail]       = useState('');
  const [siPassword, setSiPassword] = useState('');
  const [siError, setSiError]       = useState('');
  const [siLoading, setSiLoading]   = useState(false);

  // Sign up state
  const [suFname, setSuFname]       = useState(urlFirst);
  const [suLname, setSuLname]       = useState('');
  const [suCompany, setSuCompany]   = useState(urlCompany);
  const [suEmail, setSuEmail]       = useState(urlEmail);
  const [suPassword, setSuPassword] = useState('');
  const [suConfirm, setSuConfirm]   = useState('');
  const [suError, setSuError]       = useState('');
  const [suLoading, setSuLoading]   = useState(false);

  const [checkEmailName, setCheckEmailName] = useState('');

  const supabase = createClient();

  // Persist plan, redirect if already signed in
  useEffect(() => {
    if (urlPlan) localStorage.setItem('nexalab_plan', urlPlan);
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data: p } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      if (p?.role === 'admin') { router.replace('/admin'); return; }
      router.replace('/dashboard');
    });
  }, []);

  async function redirectToDashboard() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    localStorage.removeItem('nexalab_plan');
    localStorage.removeItem('nexalab_new_signup');
    if (p?.role === 'admin') { router.replace('/admin'); return; }
    router.replace('/dashboard');
  }

  async function signInWithProvider(provider: 'google' | 'github') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    if (error) setSiError(error.message);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!siEmail || !siPassword) { setSiError('Please fill in all fields.'); return; }
    setSiLoading(true); setSiError('');
    const { error } = await supabase.auth.signInWithPassword({ email: siEmail, password: siPassword });
    if (error) { setSiError(error.message); setSiLoading(false); return; }
    await redirectToDashboard();
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!suFname || !suLname || !suEmail || !suPassword) { setSuError('Please fill in all required fields.'); return; }
    if (suPassword.length < 8) { setSuError('Password must be at least 8 characters.'); return; }
    if (suPassword !== suConfirm) { setSuError('Passwords do not match.'); return; }
    setSuLoading(true); setSuError('');
    const { error } = await supabase.auth.signUp({
      email: suEmail,
      password: suPassword,
      options: {
        data: { full_name: `${suFname} ${suLname}`, company: suCompany || null },
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });
    if (error) { setSuError(error.message); setSuLoading(false); return; }
    localStorage.setItem('nexalab_new_signup', '1');
    setCheckEmailName(suFname);
    setPanel('check-email');
  }

  async function handleForgotPassword() {
    if (!siEmail) { setSiError('Enter your email above first.'); return; }
    setSiLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(siEmail, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setSiLoading(false);
    if (error) { setSiError(error.message); return; }
    setPanel('reset-email');
  }

  const Spinner = () => (
    <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Link href="/" className="auth-brand">NexaLab</Link>
        <p className="auth-portal-label">Client Portal</p>

        {/* Tabs */}
        {(panel === 'signin' || panel === 'signup') && (
          <div className="auth-tabs" role="tablist">
            {(['signin', 'signup'] as const).map((t) => (
              <button
                key={t}
                className={`auth-tab${tab === t ? ' is-active' : ''}`}
                role="tab"
                aria-selected={tab === t}
                onClick={() => { setTab(t); setPanel(t); setSiError(''); setSuError(''); }}
              >
                {t === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>
        )}

        {/* Social buttons */}
        {(panel === 'signin' || panel === 'signup') && (
          <div id="social-section">
            <div className="auth-social-btns">
              <button className="auth-social-btn" type="button" onClick={() => signInWithProvider('google')}>
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.9z" fill="#FFC107"/>
                  <path d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" fill="#FF3D00"/>
                  <path d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" fill="#4CAF50"/>
                  <path d="M43.6 20.1H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z" fill="#1976D2"/>
                </svg>
                Continue with Google
              </button>
              <button className="auth-social-btn" type="button" onClick={() => signInWithProvider('github')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
                Continue with GitHub
              </button>
            </div>
            <div className="auth-divider"><span>or continue with email</span></div>
          </div>
        )}

        {/* Sign In */}
        {panel === 'signin' && (
          <form className="auth-form" noValidate onSubmit={handleSignIn}>
            <label className="auth-field">
              Email address
              <input type="email" placeholder="you@brand.com" autoComplete="email" required value={siEmail} onChange={(e) => setSiEmail(e.target.value)} />
            </label>
            <label className="auth-field">
              Password
              <input type="password" placeholder="••••••••" autoComplete="current-password" required value={siPassword} onChange={(e) => setSiPassword(e.target.value)} />
            </label>
            <div className="auth-row">
              <button type="button" className="auth-link" onClick={handleForgotPassword}>Forgot password?</button>
            </div>
            {siError && <p className="auth-error" aria-live="polite">{siError}</p>}
            <button className="btn btn-primary auth-submit" type="submit" disabled={siLoading}>
              {siLoading ? <Spinner /> : 'Sign in'}
            </button>
            <p className="auth-footer-note">Access is invite-only. <Link href="/contact" className="auth-link">Book a demo</Link> to get started.</p>
          </form>
        )}

        {/* Sign Up */}
        {panel === 'signup' && (
          <form className="auth-form" noValidate onSubmit={handleSignUp}>
            <div className="auth-grid-2">
              <label className="auth-field">First name * <input type="text" placeholder="Jane" autoComplete="given-name" required value={suFname} onChange={(e) => setSuFname(e.target.value)} /></label>
              <label className="auth-field">Last name * <input type="text" placeholder="Smith" autoComplete="family-name" required value={suLname} onChange={(e) => setSuLname(e.target.value)} /></label>
            </div>
            <label className="auth-field">Company / brand name <input type="text" placeholder="Acme Inc." autoComplete="organization" value={suCompany} onChange={(e) => setSuCompany(e.target.value)} /></label>
            <label className="auth-field">Work email * <input type="email" placeholder="you@brand.com" autoComplete="email" required value={suEmail} onChange={(e) => setSuEmail(e.target.value)} /></label>
            <label className="auth-field">Password * <span className="auth-field-hint">(min 8 characters)</span><input type="password" placeholder="••••••••" autoComplete="new-password" required minLength={8} value={suPassword} onChange={(e) => setSuPassword(e.target.value)} /></label>
            <label className="auth-field">Confirm password * <input type="password" placeholder="••••••••" autoComplete="new-password" required value={suConfirm} onChange={(e) => setSuConfirm(e.target.value)} /></label>
            {suError && <p className="auth-error" aria-live="polite">{suError}</p>}
            <button className="btn btn-primary auth-submit" type="submit" disabled={suLoading}>
              {suLoading ? <Spinner /> : 'Create account'}
            </button>
            <p className="auth-footer-note">By creating an account you agree to NexaLab&apos;s terms of service.</p>
          </form>
        )}

        {/* Check email */}
        {panel === 'check-email' && (
          <div>
            <div className="auth-success-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#22d3a8" strokeWidth="1.5"/><path d="M7 12l4 4 6-7" stroke="#22d3a8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h3 className="auth-success-title">Check your inbox, {checkEmailName}</h3>
            <p className="auth-success-body">We&apos;ve sent a confirmation link to your email. Click it to activate your account — you&apos;ll then be taken straight to your client portal.</p>
            <button className="btn btn-outline auth-submit" style={{ marginTop: '1.2rem' }} onClick={() => { setPanel('signin'); setTab('signin'); }}>Back to sign in</button>
          </div>
        )}

        {/* Reset email */}
        {panel === 'reset-email' && (
          <div>
            <div className="auth-success-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#9aa8ff" strokeWidth="1.5"/><polyline points="22,6 12,13 2,6" stroke="#9aa8ff" strokeWidth="1.5"/></svg>
            </div>
            <h3 className="auth-success-title">Reset link sent</h3>
            <p className="auth-success-body">Check your inbox for a password reset link. It expires in 1 hour.</p>
            <button className="btn btn-outline auth-submit" style={{ marginTop: '1.2rem' }} onClick={() => { setPanel('signin'); setSiLoading(false); }}>Back to sign in</button>
          </div>
        )}
      </div>
      <p className="auth-back"><Link href="/">← Back to NexaLab</Link></p>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthCard />
    </Suspense>
  );
}
