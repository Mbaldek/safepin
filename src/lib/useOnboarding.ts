// src/lib/useOnboarding.ts — Hook to read and write onboarding state from Supabase

'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';

export type OnboardingState = {
  onboarding_completed: boolean;
  onboarding_step: number;
  birthday: string | null;
  city: string | null;
  personas: string[];
  goals: string[];
};

type UseOnboardingReturn = {
  state: OnboardingState | null;
  loading: boolean;
  update: (data: Partial<OnboardingState>) => Promise<void>;
  advanceStep: (step: number) => Promise<void>;
  completeOnboarding: () => Promise<void>;
};

const ONBOARDING_COLUMNS =
  'onboarding_completed, onboarding_step, birthday, city, personas, goals';

export function useOnboarding(): UseOnboardingReturn {
  const userId = useStore((s) => s.userId);
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    supabase
      .from('profiles')
      .select(ONBOARDING_COLUMNS)
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setState({
            onboarding_completed: data.onboarding_completed ?? false,
            onboarding_step: data.onboarding_step ?? 0,
            birthday: data.birthday ?? null,
            city: data.city ?? null,
            personas: data.personas ?? [],
            goals: data.goals ?? [],
          });
        }
        setLoading(false);
      });
  }, [userId]);

  const update = useCallback(
    async (data: Partial<OnboardingState>) => {
      if (!userId) return;
      await supabase.from('profiles').update(data).eq('id', userId);
      setState((prev) => (prev ? { ...prev, ...data } : null));
    },
    [userId],
  );

  const advanceStep = useCallback(
    async (step: number) => {
      await update({ onboarding_step: step });
    },
    [update],
  );

  const completeOnboarding = useCallback(async () => {
    await update({ onboarding_completed: true, onboarding_step: 5 });
    // Set cookie so middleware fast-path skips the DB check on next request
    document.cookie = 'ob_done=1;path=/;max-age=31536000';
  }, [update]);

  return { state, loading, update, advanceStep, completeOnboarding };
}
