'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export interface AdminBoot {
  userId: string;
  email: string;
  firstName: string;
  initials: string;
}

export function useAdmin() {
  const router = useRouter();
  const [boot, setBoot] = useState<AdminBoot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/auth'); return; }
      const { data: profile } = await supabase.from('profiles').select('role,full_name').eq('id', session.user.id).single();
      if (profile?.role !== 'admin') { router.replace('/dashboard'); return; }
      const email     = session.user.email || '';
      const fullName  = profile?.full_name || email;
      const firstName = fullName.split(' ')[0];
      const initials  = fullName.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase();
      setBoot({ userId: session.user.id, email, firstName, initials });
      setLoading(false);
    });
  }, [router]);

  return { boot, loading };
}
