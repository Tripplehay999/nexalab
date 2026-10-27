import { NextResponse } from 'next/server';
import { adminOrError, syncConnection, syncTrackerMetrics } from '@/lib/integrations';

// Daily refresh of every active analytics connection, plus the embed tracker's monthly rollup (Vercel Cron — see vercel.json).
// Vercel sends "Authorization: Bearer <CRON_SECRET>" when CRON_SECRET is set.
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = adminOrError();
  if ('error' in db) return db.error;
  const { data } = await db.db.from('analytics_connections').select('id').in('status', ['active', 'error']);
  const results = [];
  for (const c of data ?? []) results.push({ id: c.id, ...(await syncConnection(db.db, c.id)) });
  const tracker = await syncTrackerMetrics(db.db);
  return NextResponse.json({ synced: results.length, results, tracker });
}
