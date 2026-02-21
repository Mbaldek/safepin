
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
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
      <div className="text-[#f43f5e] text-2xl font-bold animate-pulse">
        <span className="text-[#f43f5e]">Safe</span>
        <span className="text-white">Pin</span>
      </div>
    </div>
  );
}