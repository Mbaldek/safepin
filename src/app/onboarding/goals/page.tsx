// src/app/onboarding/goals/page.tsx — Step 2/5: Goal selection
// Multi-select cards → saves goals[] to profiles → /onboarding/permissions

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useOnboarding } from '@/lib/useOnboarding';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';

const GOALS = [
  { id: 'routes',    emoji: '🧭', titleKey: 'goal_routes',    descKey: 'goal_routes_desc' },
  { id: 'alerts',    emoji: '📍', titleKey: 'goal_alerts',    descKey: 'goal_alerts_desc' },
  { id: 'sos',       emoji: '🆘', titleKey: 'goal_sos',       descKey: 'goal_sos_desc' },
  { id: 'transit',   emoji: '🚇', titleKey: 'goal_transit',   descKey: 'goal_transit_desc' },
  { id: 'community', emoji: '👥', titleKey: 'goal_community', descKey: 'goal_community_desc' },
  { id: 'companion', emoji: '💬', titleKey: 'goal_companion', descKey: 'goal_companion_desc' },
] as const;

type GoalId = (typeof GOALS)[number]['id'];

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="8" fill="#E8A838" />
      <path
        d="M5 8.5L7 10.5L11 6"
        stroke="#1B2541"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function OnboardingGoalsPage() {
  const router = useRouter();
  const t = useTranslations('onboarding');
  const userId = useStore((s) => s.userId);
  const { state } = useOnboarding();

  const [selectedGoals, setSelectedGoals] = useState<GoalId[]>([]);
  const [saving, setSaving] = useState(false);

  // Pre-fill from hook state on mid-flow return
  useEffect(() => {
    if (state?.goals?.length) {
      setSelectedGoals(state.goals as GoalId[]);
    }
  }, [state]);

  const toggleGoal = useCallback((id: GoalId) => {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  }, []);

  const handleSkip = () => router.push('/onboarding/permissions');

  const handleSubmit = async () => {
    if (!userId) return;
    setSaving(true);
    await supabase
      .from('profiles')
      .update({ goals: selectedGoals, onboarding_step: 2 })
      .eq('id', userId);
    router.push('/onboarding/permissions');
  };

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>

      {/* Progress bar — 50% */}
      <div style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ width: '50%', height: '100%', backgroundColor: 'var(--accent)', transition: 'width 0.5s ease-out' }} />
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div className="max-w-sm mx-auto px-5 pb-10">

          {/* Skip button */}
          <div className="flex justify-end pt-5 pb-8">
            <button
              onClick={handleSkip}
              className="text-sm"
              style={{ color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {t('skipBtn')}
            </button>
          </div>

          {/* Heading */}
          <h1
            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.75rem', fontWeight: 300, lineHeight: 1.25 }}
          >
            {t('goalsTitle')}
          </h1>
          <p className="text-sm mt-2 mb-7" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {t('goalsSub')}
          </p>

          {/* Goal cards — 2-column grid */}
          <div className="grid grid-cols-2 gap-3">
            {GOALS.map((goal) => {
              const selected = selectedGoals.includes(goal.id);
              return (
                <button
                  key={goal.id}
                  onClick={() => toggleGoal(goal.id)}
                  className="group relative flex flex-col items-start rounded-[14px] p-4 text-left transition-all duration-200 active:scale-[0.97]"
                  style={{
                    backgroundColor: selected ? 'rgba(232,168,56,0.10)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${selected ? 'rgba(232,168,56,0.30)' : 'rgba(255,255,255,0.08)'}`,
                    cursor: 'pointer',
                  }}
                >
                  {/* Check icon — visible when selected */}
                  <div
                    className="absolute top-3 right-3 transition-all duration-200"
                    style={{
                      opacity: selected ? 1 : 0,
                      transform: selected ? 'scale(1)' : 'scale(0.5)',
                    }}
                  >
                    <CheckIcon />
                  </div>

                  {/* Emoji */}
                  <span className="text-[24px] leading-none">{goal.emoji}</span>

                  {/* Title */}
                  <span
                    className="mt-3 text-[14px] font-bold leading-snug transition-colors duration-200"
                    style={{ color: selected ? '#E8A838' : '#FFFFFF' }}
                  >
                    {t(goal.titleKey)}
                  </span>

                  {/* Description */}
                  <span className="mt-0.5 text-[12px] leading-snug" style={{ color: 'rgba(255,255,255,0.40)' }}>
                    {t(goal.descKey)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Continue button */}
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="mt-6 w-full py-4 rounded-[14px] font-bold text-[15px] transition-all"
            style={{
              backgroundColor: 'var(--accent)',
              color: '#1B2541',
              opacity: saving ? 0.7 : 1,
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? '…' : `${t('continueBtn')} →`}
          </button>
        </div>
      </div>
    </div>
  );
}
