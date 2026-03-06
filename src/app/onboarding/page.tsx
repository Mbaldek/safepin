'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import OnboardingFunnel, { consumeOnboardingState } from '@/components/OnboardingFunnel';

export default function OnboardingGatePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialStep, setInitialStep] = useState(0);
  const [initialGoals, setInitialGoals] = useState<string[] | undefined>();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
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

        // Authenticated but not onboarded — check for saved state (OAuth return)
        setUserId(user.id);
        const saved = consumeOnboardingState();
        if (saved) {
          setInitialStep(3); // Skip to step after auth
          setInitialGoals(saved.goals);
        } else {
          setInitialStep(3); // Authenticated, skip welcome/goals/auth
        }
      } else {
        // Not authenticated — check for saved state (shouldn't normally happen)
        const saved = consumeOnboardingState();
        if (saved?.goals) {
          setInitialGoals(saved.goals);
        }
        // Start from step 0 (welcome)
        setInitialStep(0);
      }

      setLoading(false);
    })();
  }, [router]);

  const handleAuthComplete = async (uid: string) => {
    setUserId(uid);

    // Check if returning user already completed onboarding
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', uid)
      .maybeSingle();

    if (profile?.onboarding_completed) {
      document.cookie = 'ob_done=1;path=/;max-age=31536000';
      localStorage.setItem('brume_onboarding_done', '1');
      router.replace('/map');
    }
    // If not onboarded, the funnel will advance to step 3 via its own logic
  };

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
    <OnboardingFunnel
      userId={userId}
      initialStep={initialStep}
      initialGoals={initialGoals}
      onAuthComplete={handleAuthComplete}
      onComplete={() => router.replace('/map')}
    />
  );
}
