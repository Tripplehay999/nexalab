import { NextResponse } from 'next/server';
import { GOOGLE_SCOPE, getActor, googleConfigured, signState } from '@/lib/integrations';

// Starts "Connect Google Analytics": redirects to Google's consent screen.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const actor = await getActor(url.searchParams.get('client'));
  if ('error' in actor) return actor.error;
  if (!googleConfigured()) return NextResponse.redirect(new URL('/dashboard/analytics?ga=not-configured', url.origin));

  const state = signState({ client: actor.clientId, by: actor.userId, admin: actor.isAdmin });
  const google = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  google.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${url.origin}/api/integrations/google/callback`,
    response_type: 'code',
    scope: GOOGLE_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  }).toString();

  const res = NextResponse.redirect(google);
  res.cookies.set('nx_ga_state', state, { httpOnly: true, secure: url.protocol === 'https:', sameSite: 'lax', path: '/api/integrations/google', maxAge: 900 });
  return res;
}
