import { NextResponse } from 'next/server';
import { adminOrError, getActor } from '@/lib/integrations';

// Link / unlink a GitHub repo for a custom-built site.
//   POST { action: 'connect', repo: "owner/repo" | "https://github.com/owner/repo", token?, client? }
//   POST { action: 'disconnect', client? }
function parseRepo(input: string) {
  const m = input.trim().replace(/\.git$/, '').match(/(?:github\.com[/:])?([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/?$/);
  return m ? `${m[1]}/${m[2]}` : null;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const actor = await getActor(body.client);
  if ('error' in actor) return actor.error;
  const db = adminOrError();
  if ('error' in db) return db.error;

  if (body.action === 'disconnect') {
    await db.db.from('client_repos').delete().eq('client_id', actor.clientId);
    return NextResponse.json({ ok: true });
  }

  const full = parseRepo(String(body.repo ?? ''));
  if (!full) return NextResponse.json({ error: 'Use the repo’s address, like github.com/your-team/your-site.' }, { status: 400 });
  const token = String(body.token ?? '').trim();

  const res = await fetch(`https://api.github.com/repos/${full}`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'NexaLab-Portal', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    cache: 'no-store',
  });
  if (!res.ok) {
    return NextResponse.json({ error: res.status === 404 ? 'Repo not found — if it’s private, add a read-only token.' : res.status === 401 ? 'GitHub rejected that token.' : 'Couldn’t reach GitHub.' }, { status: 400 });
  }
  const repo = await res.json();

  const { data: saved, error } = await db.db.from('client_repos').upsert({ client_id: actor.clientId, full_name: repo.full_name, is_private: Boolean(repo.private) }, { onConflict: 'client_id' }).select('id').single();
  if (error || !saved) return NextResponse.json({ error: 'Couldn’t save the repo.' }, { status: 500 });
  if (token) await db.db.from('repo_secrets').upsert({ repo_id: saved.id, token });
  else await db.db.from('repo_secrets').delete().eq('repo_id', saved.id);
  return NextResponse.json({ ok: true, repo: repo.full_name });
}
