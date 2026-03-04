
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
    <div
      className="min-h-dvh flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(180deg, #3BB4C1 0%, #1E3A5F 45%, #4A2C5A 75%, #5C3D5E 100%)' }}
    >
      <svg width={60} height={60} viewBox="0 0 80 80" fill="none" className="mb-4 animate-pulse">
        <path d="M20 60 Q20 30, 40 20 Q60 30, 60 60" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M28 55 Q28 35, 40 28 Q52 35, 52 55" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.6" />
        <circle cx="40" cy="22" r="4" fill="#FFFFFF" />
      </svg>
      <div className="text-2xl font-light tracking-wide text-white animate-pulse">
        Breveil
      </div>
    </div>
  );
}