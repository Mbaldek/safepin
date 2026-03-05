'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import OnboardingFunnelV2 from '@/components/OnboardingFunnelV2';

export default function OnboardingGatePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login?next=/onboarding');
        return;
      }

      // Check if already onboarded
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.onboarding_completed) {
        router.replace('/map');
        return;
      }

      setUserId(user.id);
      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh',
        background: '#0F172A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: 32,
          height: 32,
          border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: '#3BB4C1',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return (
    <OnboardingFunnelV2
      userId={userId!}
      onComplete={() => router.replace('/map')}
    />
  );
}
