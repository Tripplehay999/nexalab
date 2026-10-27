'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import HumanCheck from '@/components/HumanCheck';
import { LiveStatus } from '@/components/site/live';
import { CONTACT, SUPPORT_TEAM, person, photo } from '@/lib/site-data';

type Panel = 'signin' | 'signup' | 'check-email' | 'forgot' | 'reset-email' | 'reset-expired' | 'new-password' | 'password-updated';

function Spinner() {
  return (
    <svg className="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-label="Loading">
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function AuthCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlMode    = searchParams.get('mode')      || '';
  const urlEmail   = searchParams.get('email')     || '';
  const urlFirst   = searchParams.get('firstName') || '';
  const urlCompany = searchParams.get('company')   || '';
  const urlPlan    = searchParams.get('plan')      || '';
  const isReset    = urlMode === 'reset';

  const [supabase] = useState(createClient);
  const [panel, setPanel] = useState<Panel>(isReset ? 'new-password' : urlMode === 'signup' ? 'signup' : urlMode === 'forgot' ? 'forgot' : 'signin');

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

  // New password (after reset link)
  const [npPassword, setNpPassword] = useState('');
  const [npConfirm, setNpConfirm]   = useState('');
  const [npError, setNpError]       = useState('');
  const [npLoading, setNpLoading]   = useState(false);

  const [checkEmailName, setCheckEmailName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Turnstile token for Supabase Auth's captcha protection (only used when configured).
  const [captcha, setCaptcha] = useState('');
  const [captchaReset, setCaptchaReset] = useState(0);
  const onCaptcha = useCallback((t: string) => setCaptcha(t), []);
  const captchaOpts = captcha ? { captchaToken: captcha } : {};
  const resetCaptcha = () => { setCaptcha(''); setCaptchaReset((n) => n + 1); };

  // Persist plan, redirect if already signed in (except while resetting a password)
  useEffect(() => {
    if (urlPlan) localStorage.setItem('nexalab_plan', urlPlan);
    if (isReset) {
      supabase.auth.getSession().then(({ data: { session } }) => { if (!session) setPanel('reset-expired'); });
      return;
    }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data: p } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      router.replace(p?.role === 'admin' ? '/admin' : '/dashboard');
    });
  }, [isReset, router, supabase, urlPlan]);

  async function redirectToDashboard() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    localStorage.removeItem('nexalab_new_signup');
    router.replace(p?.role === 'admin' ? '/admin' : '/dashboard');
  }

  function switchTo(next: 'signin' | 'signup') {
    const params = new URLSearchParams(window.location.search);
    if (next === 'signup') params.set('mode', 'signup'); else params.delete('mode');
    const qs = params.toString();
    window.history.replaceState(null, '', qs ? `/auth?${qs}` : '/auth');
    setPanel(next);
    setSiError('');
    setSuError('');
    setShowPassword(false);
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
    const { error } = await supabase.auth.signInWithPassword({ email: siEmail, password: siPassword, options: captchaOpts });
    if (error) resetCaptcha();
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
        data: { full_name: `${suFname} ${suLname}`, company: suCompany || null, plan: urlPlan || null },
        emailRedirectTo: `${window.location.origin}/auth`,
        ...captchaOpts,
      },
    });
    if (error) { setSuError(error.message); setSuLoading(false); resetCaptcha(); return; }
    localStorage.setItem('nexalab_new_signup', '1');
    setCheckEmailName(suFname);
    setPanel('check-email');
  }

  async function handleForgotPassword(e?: React.FormEvent) {
    e?.preventDefault();
    if (!siEmail) { setSiError('Enter the email you use to sign in.'); return; }
    setSiLoading(true); setSiError('');
    const { error } = await supabase.auth.resetPasswordForEmail(siEmail, {
      redirectTo: `${window.location.origin}/auth?mode=reset`,
      ...captchaOpts,
    });
    setSiLoading(false);
    if (error) { setSiError(error.message); resetCaptcha(); return; }
    setPanel('reset-email');
  }

  async function handleNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (npPassword.length < 8) { setNpError('Password must be at least 8 characters.'); return; }
    if (npPassword !== npConfirm) { setNpError('Passwords do not match.'); return; }
    setNpLoading(true); setNpError('');
    const { error } = await supabase.auth.updateUser({ password: npPassword });
    setNpLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes('session')) { setPanel('reset-expired'); return; }
      setNpError(error.message);
      return;
    }
    setPanel('password-updated');
  }

  const isTabbed = panel === 'signin' || panel === 'signup';
  const pwType = showPassword ? 'text' : 'password';
  const lead = person('Sofia Marchetti');

  return (
    <div className="lg">
      <aside className="lg-brand">
        <Link href="/" className="logo logo-light">
          <span className="logo-mark" aria-hidden="true"><span /></span>
          NexaLab
        </Link>
        <div className="lg-brand-body">
          <LiveStatus className="on-dark" openText="Your team is online" closedText="Team offline — emergency line open 24/7" />
          {panel === 'signup' ? (
            <>
              <h2 className="lg-brand-title">Start your project in <em>four steps.</em></h2>
              <ol className="lg-steps">
                <li><strong>Create your account</strong><span>Takes about two minutes.</span></li>
                <li><strong>Tell us about your store</strong><span>A 3-minute onboarding: goals, platform, budget.</span></li>
                <li><strong>Kickoff call</strong><span>Your account lead reaches out within one business day.</span></li>
                <li><strong>Plan &amp; fixed price</strong><span>In writing, within 48 hours of the call.</span></li>
              </ol>
            </>
          ) : (
            <>
              <h2 className="lg-brand-title">Your store, your team, <em>one place.</em></h2>
              <ul className="lg-perks">
                <li>Track milestones and launch progress</li>
                <li>Download deliverables, repos, and files</li>
                <li>See live orders and revenue</li>
                <li>Open tickets and chat with your team</li>
              </ul>
            </>
          )}
        </div>
        <figure className="lg-quote">
          <blockquote>“Whenever something comes up, open a ticket here and one of us picks it up — usually within minutes.”</blockquote>
          <figcaption>
            <Image src={photo(lead.photo, 96, 96)} alt={lead.name} width={40} height={40} />
            <span><strong>{lead.name}</strong>{lead.role}</span>
          </figcaption>
        </figure>
      </aside>

      <main className="lg-main">
        <div className="lg-top">
          <Link href="/" className="logo lg-mobile-logo">
            <span className="logo-mark" aria-hidden="true"><span /></span>
            NexaLab
          </Link>
          <Link href="/" className="back-link lg-back">← Back to site</Link>
        </div>

        <div className="lg-card">
          {isTabbed && (
            <>
              <p className="kicker">{panel === 'signin' ? 'Client portal' : 'Start a project'}</p>
              <h1 className="lg-title">{panel === 'signin' ? <>Welcome <em>back.</em></> : <>Let’s start your <em>project.</em></>}</h1>
              {panel === 'signup' && (
                <p className="lg-intro">
                  Create your account, then a quick onboarding tells us about your store.
                  {urlPlan && <> You picked the <strong>{urlPlan}</strong> plan — <Link href="/services#pricing" className="lg-link">change</Link>.</>}
                </p>
              )}

              <div className="lg-tabs" role="tablist" aria-label="Sign in or start a project">
                {(['signin', 'signup'] as const).map((t) => (
                  <button key={t} role="tab" aria-selected={panel === t} className={panel === t ? 'is-active' : ''} onClick={() => switchTo(t)}>
                    {t === 'signin' ? 'Sign in' : 'Start a project'}
                  </button>
                ))}
              </div>

              <div className="lg-social">
                <button type="button" onClick={() => signInWithProvider('google')}>
                  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.9z" fill="#FFC107"/>
                    <path d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" fill="#FF3D00"/>
                    <path d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" fill="#4CAF50"/>
                    <path d="M43.6 20.1H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z" fill="#1976D2"/>
                  </svg>
                  Google
                </button>
                <button type="button" onClick={() => signInWithProvider('github')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
                  </svg>
                  GitHub
                </button>
              </div>
              <div className="lg-divider"><span>or with email</span></div>
            </>
          )}

          {panel === 'signin' && (
            <form className="lg-form" noValidate onSubmit={handleSignIn}>
              <label className="lg-field">
                Email address
                <input type="email" placeholder="you@brand.com" autoComplete="email" required value={siEmail} onChange={(e) => setSiEmail(e.target.value)} />
              </label>
              <label className="lg-field">
                <span className="lg-field-row">Password <button type="button" className="lg-link" onClick={() => { setSiError(''); setPanel('forgot'); }}>Forgot password?</button></span>
                <span className="lg-pw">
                  <input type={pwType} placeholder="••••••••" autoComplete="current-password" required value={siPassword} onChange={(e) => setSiPassword(e.target.value)} />
                  <button type="button" className="lg-pw-toggle" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button>
                </span>
              </label>
              <HumanCheck onToken={onCaptcha} resetKey={captchaReset} />
              {siError && <p className="lg-error" aria-live="polite">{siError}</p>}
              <button className="s-btn s-btn-tomato s-btn-lg lg-submit" type="submit" disabled={siLoading}>
                {siLoading ? <Spinner /> : 'Sign in'}
              </button>
              <p className="lg-note">New to NexaLab? <button type="button" className="lg-link" onClick={() => switchTo('signup')}>Start a project</button> — it begins with a free account.</p>
            </form>
          )}

          {panel === 'signup' && (
            <form className="lg-form" noValidate onSubmit={handleSignUp}>
              <div className="lg-grid-2">
                <label className="lg-field">First name * <input type="text" placeholder="Jane" autoComplete="given-name" required value={suFname} onChange={(e) => setSuFname(e.target.value)} /></label>
                <label className="lg-field">Last name * <input type="text" placeholder="Smith" autoComplete="family-name" required value={suLname} onChange={(e) => setSuLname(e.target.value)} /></label>
              </div>
              <label className="lg-field">Company / brand <input type="text" placeholder="Acme Inc." autoComplete="organization" value={suCompany} onChange={(e) => setSuCompany(e.target.value)} /></label>
              <label className="lg-field">Work email * <input type="email" placeholder="you@brand.com" autoComplete="email" required value={suEmail} onChange={(e) => setSuEmail(e.target.value)} /></label>
              <div className="lg-grid-2">
                <label className="lg-field">Password * <input type={pwType} placeholder="Min. 8 characters" autoComplete="new-password" required minLength={8} value={suPassword} onChange={(e) => setSuPassword(e.target.value)} /></label>
                <label className="lg-field">Confirm * <input type={pwType} placeholder="Repeat password" autoComplete="new-password" required value={suConfirm} onChange={(e) => setSuConfirm(e.target.value)} /></label>
              </div>
              <label className="lg-check"><input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} /> Show passwords</label>
              <HumanCheck onToken={onCaptcha} resetKey={captchaReset} />
              {suError && <p className="lg-error" aria-live="polite">{suError}</p>}
              <button className="s-btn s-btn-tomato s-btn-lg lg-submit" type="submit" disabled={suLoading}>
                {suLoading ? <Spinner /> : 'Create account & continue →'}
              </button>
              <p className="lg-note">Already a client? <button type="button" className="lg-link" onClick={() => switchTo('signin')}>Sign in</button></p>
              <p className="lg-fine">By creating an account you agree to NexaLab’s terms of service. No payment needed — you’ll get a fixed quote before any work starts.</p>
            </form>
          )}

          {panel === 'check-email' && (
            <div className="lg-done">
              <span className="lg-done-icon" aria-hidden="true">✉️</span>
              <h1 className="lg-title">Check your inbox, <em>{checkEmailName}.</em></h1>
              <p>We’ve sent a confirmation link to <strong>{suEmail}</strong>. Click it to activate your account — you’ll go straight to a 3-minute onboarding where you tell us about your project.</p>
              <button className="s-btn s-btn-line lg-submit" onClick={() => switchTo('signin')}>Back to sign in</button>
            </div>
          )}

          {panel === 'forgot' && (
            <form className="lg-form" noValidate onSubmit={handleForgotPassword}>
              <p className="kicker">Account recovery</p>
              <h1 className="lg-title">Forgot your <em>password?</em></h1>
              <p className="lg-intro">Enter the email you sign in with and we’ll send you a link to choose a new one.</p>
              <label className="lg-field">
                Email address
                <input type="email" placeholder="you@brand.com" autoComplete="email" required value={siEmail} onChange={(e) => setSiEmail(e.target.value)} />
              </label>
              <HumanCheck onToken={onCaptcha} resetKey={captchaReset} />
              {siError && <p className="lg-error" aria-live="polite">{siError}</p>}
              <button className="s-btn s-btn-tomato s-btn-lg lg-submit" type="submit" disabled={siLoading}>
                {siLoading ? <Spinner /> : 'Send reset link'}
              </button>
              <p className="lg-note">Remembered it? <button type="button" className="lg-link" onClick={() => switchTo('signin')}>Back to sign in</button></p>
            </form>
          )}

          {panel === 'reset-email' && (
            <div className="lg-done">
              <span className="lg-done-icon" aria-hidden="true">🔑</span>
              <h1 className="lg-title">Reset link <em>sent.</em></h1>
              <p>Check <strong>{siEmail}</strong> for a link to choose a new password. It expires in 1 hour, and only the newest link works.</p>
              <p className="lg-fine" style={{ marginBottom: '1.4rem' }}>Not there in a minute? Check your spam or promotions folder — and mark it “Not spam” so future emails arrive normally.</p>
              <button className="s-btn s-btn-line lg-submit" onClick={() => { switchTo('signin'); setSiLoading(false); }}>Back to sign in</button>
            </div>
          )}

          {panel === 'reset-expired' && (
            <div className="lg-done">
              <span className="lg-done-icon" aria-hidden="true">⏳</span>
              <h1 className="lg-title">That link has <em>expired.</em></h1>
              <p>Reset links work once and expire after an hour. If you requested more than one, only the newest works. Send yourself a fresh one:</p>
              <button className="s-btn s-btn-tomato s-btn-lg lg-submit" onClick={() => { setSiError(''); setPanel('forgot'); }}>Send me a new reset link</button>
            </div>
          )}

          {panel === 'new-password' && (
            <form className="lg-form" noValidate onSubmit={handleNewPassword}>
              <p className="kicker">Account recovery</p>
              <h1 className="lg-title">Choose a new <em>password.</em></h1>
              <label className="lg-field">New password <input type={pwType} placeholder="Min. 8 characters" autoComplete="new-password" required minLength={8} value={npPassword} onChange={(e) => setNpPassword(e.target.value)} /></label>
              <label className="lg-field">Confirm new password <input type={pwType} placeholder="Repeat password" autoComplete="new-password" required value={npConfirm} onChange={(e) => setNpConfirm(e.target.value)} /></label>
              <label className="lg-check"><input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} /> Show passwords</label>
              {npError && <p className="lg-error" aria-live="polite">{npError}</p>}
              <button className="s-btn s-btn-tomato s-btn-lg lg-submit" type="submit" disabled={npLoading}>
                {npLoading ? <Spinner /> : 'Update password'}
              </button>
            </form>
          )}

          {panel === 'password-updated' && (
            <div className="lg-done">
              <span className="lg-done-icon" aria-hidden="true">✅</span>
              <h1 className="lg-title">Password <em>updated.</em></h1>
              <p>You’re all set. Head to your portal to pick up where you left off.</p>
              <button className="s-btn s-btn-tomato s-btn-lg lg-submit" onClick={redirectToDashboard}>Go to my portal</button>
            </div>
          )}
        </div>

        <div className="lg-help">
          <div className="face-stack">
            {SUPPORT_TEAM.slice(0, 3).map((p) => (
              <Image key={p.name} src={photo(p.photo, 80, 80)} alt="" width={32} height={32} />
            ))}
          </div>
          <p>Trouble signing in? <Link href="/support#ticket" className="lg-link">Open a ticket</Link> or email <a href={`mailto:${CONTACT.support}`} className="lg-link">{CONTACT.support}</a></p>
        </div>
      </main>
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
