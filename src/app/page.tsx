
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Handle OAuth code exchange if redirected here with ?code=
    const code = new URLSearchParams(window.location.search).get('code');
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data }) => {
        router.replace(data.session ? '/map' : '/login');
      });
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/map');
      } else {
        router.replace('/login');
      }
    });
  }, [router]);

  // Loading state while checking auth
  return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="text-2xl font-extrabold tracking-tight animate-pulse" style={{ color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
        Brev<span style={{ color: 'var(--accent)' }}>eil</span>
      </div>
    </div>
  );
}