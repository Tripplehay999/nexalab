'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export interface DashProfile {
  id: string;
  full_name?: string;
  company?: string;
  role?: string;
  email?: string;
}

export interface DashProject {
  id: string;
  name: string;
  status: string;
  plan?: string;
  started_at?: string;
  description?: string;
  client_id: string;
}

export interface DashBoot {
  userId: string;
  profile: DashProfile;
  project: DashProject | null;
  firstName: string;
  initials: string;
  email: string;
}

export function useDashboard() {
  const router = useRouter();
  const [boot, setBoot] = useState<DashBoot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/auth'); return; }

      const userId = session.user.id;
      const email  = session.user.email || '';

      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', userId).single();

      const { data: project } = await supabase
        .from('projects').select('*').eq('client_id', userId)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();

      const fullName  = profile?.full_name || email;
      const firstName = fullName.split(' ')[0];
      const initials  = fullName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      setBoot({ userId, profile: profile ?? { id: userId, email }, project, firstName, initials, email });
      setLoading(false);
    });
  }, [router]);

  return { boot, loading };
}
