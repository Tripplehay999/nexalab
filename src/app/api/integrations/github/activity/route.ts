import { NextResponse } from 'next/server';
import { adminOrError, getActor } from '@/lib/integrations';

// Recent commits + latest deployment for the client's linked repo (cached 5 min).
export async function GET(request: Request) {
  const actor = await getActor(new URL(request.url).searchParams.get('client'));
  if ('error' in actor) return actor.error;
  const db = adminOrError();
  if ('error' in db) return db.error;

  const { data: repo } = await db.db.from('client_repos').select('id, full_name, is_private').eq('client_id', actor.clientId).maybeSingle();
  if (!repo) return NextResponse.json({ repo: null });
  const { data: secret } = await db.db.from('repo_secrets').select('token').eq('repo_id', repo.id).maybeSingle();
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'NexaLab-Portal', ...(secret?.token ? { Authorization: `Bearer ${secret.token}` } : {}) };
  const gh = (path: string) => fetch(`https://api.github.com/repos/${repo.full_name}${path}`, { headers, next: { revalidate: 300 } });

  const [commitsRes, deploysRes] = await Promise.all([gh('/commits?per_page=8'), gh('/deployments?per_page=1')]);
  if (!commitsRes.ok) {
    return NextResponse.json({ repo: repo.full_name, error: commitsRes.status === 401 || commitsRes.status === 404 ? 'GitHub access was removed — reconnect the repo.' : 'GitHub is busy — try again shortly.' });
  }
  type GhCommit = { sha: string; html_url: string; commit: { message: string; author: { name: string; date: string } }; author: { avatar_url: string; login: string } | null };
  const commits = ((await commitsRes.json()) as GhCommit[]).map((c) => ({
    sha: c.sha.slice(0, 7), url: c.html_url, message: c.commit.message.split('\n')[0].slice(0, 140),
    author: c.author?.login ?? c.commit.author.name, avatar: c.author?.avatar_url ?? null, date: c.commit.author.date,
  }));

  let deployment: { environment: string; state: string; date: string; url: string | null } | null = null;
  if (deploysRes.ok) {
    const [d] = (await deploysRes.json()) as { id: number; environment: string; created_at: string }[];
    if (d) {
      const st = await gh(`/deployments/${d.id}/statuses?per_page=1`);
      const [status] = st.ok ? ((await st.json()) as { state: string; environment_url?: string; target_url?: string }[]) : [];
      deployment = { environment: d.environment, state: status?.state ?? 'pending', date: d.created_at, url: status?.environment_url || status?.target_url || null };
    }
  }
  return NextResponse.json({ repo: repo.full_name, private: repo.is_private, url: `https://github.com/${repo.full_name}`, commits, deployment });
}
