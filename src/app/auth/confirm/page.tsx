'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

// Landing page for every auth email link (reset password, confirm signup, magic link,
// invite, email change). Links carry a token_hash instead of a PKCE code, so they work
// in any browser or device. The token is only used when the person clicks — email
// security scanners that "open" links to check them can't burn it.

const COPY: Record<string, { kicker: string; title: [string, string]; body: string; cta: string }> = {
  recovery: { kicker: 'Password reset', title: ['Let’s get you', 'back in.'], body: 'Click below to continue and choose a new password.', cta: 'Continue to reset password →' },
  email: { kicker: 'Confirm your email', title: ['One click and', 'you’re in.'], body: 'Confirm your email to activate your NexaLab client portal.', cta: 'Confirm my email →' },
  signup: { kicker: 'Confirm your email', title: ['One click and', 'you’re in.'], body: 'Confirm your email to activate your NexaLab client portal.', cta: 'Confirm my email →' },
  magiclink: { kicker: 'Sign in', title: ['Your sign-in', 'link.'], body: 'Click below to sign in to your NexaLab client portal.', cta: 'Sign in →' },
  invite: { kicker: 'You’re invited', title: ['Come on', 'in.'], body: 'Accept your invitation, then choose a password for your account.', cta: 'Accept invitation →' },
  email_change: { kicker: 'Email change', title: ['Confirm your', 'new email.'], body: 'Click below to confirm the new email address for your account.', cta: 'Confirm new email →' },
};

const DEFAULT_NEXT: Record<string, string> = {
  recovery: '/auth?mode=reset',
  invite: '/auth?mode=reset',
  email: '/onboarding',
  signup: '/onboarding',
  magiclink: '/dashboard',
  email_change: '/dashboard',
};

// Only allow same-site relative redirects.
const safeNext = (next: string | null, type: string) =>
  next && next.startsWith('/') && !next.startsWith('//') ? next : DEFAULT_NEXT[type] ?? '/dashboard';

function Confirm() {
  const router = useRouter();
  const params = useSearchParams();
  const tokenHash = params.get('token_hash') ?? '';
  const type = (params.get('type') ?? '') as EmailOtpType;
  const next = safeNext(params.get('next'), type);
  const copy = COPY[type] ?? COPY.email;

  const [state, setState] = useState<'ready' | 'working' | 'error'>(tokenHash && COPY[type] ? 'ready' : 'error');

  async function confirm() {
    setState('working');
    const { error } = await createClient().auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) { setState('error'); return; }
    router.replace(next);
  }

  return (
    <div className="lg lg-solo">
      <main className="lg-main">
        <div className="lg-top">
          <Link href="/" className="logo"><span className="logo-mark" aria-hidden="true"><span /></span>NexaLab</Link>
          <Link href="/" className="back-link lg-back">← Back to site</Link>
        </div>

        <div className="lg-card">
          {state !== 'error' ? (
            <>
              <p className="kicker">{copy.kicker}</p>
              <h1 className="lg-title">{copy.title[0]} <em>{copy.title[1]}</em></h1>
              <p className="lg-intro">{copy.body}</p>
              <button className="s-btn s-btn-tomato s-btn-lg lg-submit" onClick={confirm} disabled={state === 'working'}>
                {state === 'working' ? 'One moment…' : copy.cta}
              </button>
              <p className="lg-fine" style={{ marginTop: '1rem' }}>This extra click keeps your link safe from email scanners.</p>
            </>
          ) : (
            <div className="lg-done">
              <span className="lg-done-icon" aria-hidden="true">⏳</span>
              <h1 className="lg-title">This link has <em>expired.</em></h1>
              <p>
                Links work once and expire after an hour. If you requested more than one email, only the newest link works.
                {type === 'recovery' ? ' Request a fresh reset link below.' : ' Head to the sign-in page to get a new one.'}
              </p>
              <Link href={type === 'recovery' ? '/auth?mode=forgot' : '/auth'} className="s-btn s-btn-tomato s-btn-lg lg-submit">
                {type === 'recovery' ? 'Send me a new reset link' : 'Go to sign in'}
              </Link>
              <p className="lg-fine" style={{ marginTop: '1rem' }}>Still stuck? Call 416-206-1469 or email hello@nexalab.studio.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense>
      <Confirm />
    </Suspense>
  );
}
