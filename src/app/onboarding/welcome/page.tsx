// src/app/onboarding/welcome/page.tsx — Step 5/5: Welcome
// Shows name from profiles, dynamic stats (circle count, goals count, 35 features).
// CTA sets onboarding_completed=true, onboarding_step=5, ob_done cookie → /
// No progress bar. No skip.

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { useOnboarding } from '@/lib/useOnboarding';

// ─── Veil symbol ──────────────────────────────────────────────────────────────

function VeilSymbol() {
  return (
    <div className="animate-breathe flex items-center justify-center py-10">
      <svg
        width="120"
        height="160"
        viewBox="0 0 120 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Glow ring */}
        <circle cx="60" cy="20" r="6" fill="none" stroke="rgba(232,168,56,0.3)" strokeWidth="1" />
        {/* Central light dot */}
        <circle cx="60" cy="20" r="3" fill="rgba(232,168,56,0.9)" />
        {/* Outer arcs — gold subtle */}
        <path d="M 20 20 Q 20 100 60 145" stroke="rgba(232,168,56,0.25)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M 100 20 Q 100 100 60 145" stroke="rgba(232,168,56,0.25)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        {/* Middle arcs — purple */}
        <path d="M 30 20 Q 30 95 60 138" stroke="rgba(139,126,200,0.5)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M 90 20 Q 90 95 60 138" stroke="rgba(139,126,200,0.5)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        {/* Inner arcs — gold bright */}
        <path d="M 42 20 Q 42 88 60 130" stroke="rgba(232,168,56,0.8)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M 78 20 Q 78 88 60 130" stroke="rgba(232,168,56,0.8)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        {/* Base dot */}
        <circle cx="60" cy="148" r="2" fill="rgba(255,255,255,0.15)" />
      </svg>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingWelcomePage() {
  const router = useRouter();
  const t = useTranslations('onboarding');
  const userId = useStore((s) => s.userId);
  const { state, completeOnboarding } = useOnboarding();

  const [firstName, setFirstName] = useState('');
  const [circleCount, setCircleCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch display name from profiles
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('name, display_name')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setFirstName(data.name ?? data.display_name ?? '');
      });
  }, [userId]);

  // Fetch real circle count
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('trusted_circle')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .then(({ count }) => setCircleCount(count ?? 0));
  }, [userId]);

  const goalsCount = state?.goals?.length ?? 0;

  async function handleCta() {
    setLoading(true);
    await completeOnboarding(); // sets onboarding_completed=true, step=5, ob_done cookie
    router.push('/');
  }

  const stats = [
    { number: circleCount, label: t('welcomeCircleStat') },
    { number: goalsCount,  label: t('welcomeGoalsStat') },
    { number: 35,          label: t('welcomeFeaturesStat') },
  ];

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div className="flex w-full max-w-sm flex-1 flex-col items-center px-6 pb-8">

        {/* Top spacer */}
        <div className="min-h-8 flex-1" />

        {/* Veil symbol */}
        <VeilSymbol />

        {/* Heading */}
        <h1
          className="mt-2 text-center text-balance"
          style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.5rem', fontWeight: 300, lineHeight: 1.3 }}
        >
          {t('welcomeTitle', { name: firstName || '…' })}
        </h1>

        {/* Description */}
        <p className="mt-3 text-center text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {t('welcomeDesc')}
        </p>

        {/* Stat pills */}
        <div className="mt-7 flex items-center gap-2 flex-wrap justify-center">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <span className="text-[13px] font-semibold" style={{ color: '#E8A838' }}>
                {stat.number}
              </span>
              <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom spacer */}
        <div className="min-h-8 flex-1" />

        {/* CTA */}
        <button
          onClick={handleCta}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 py-4 text-[15px] font-bold transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
          style={{
            backgroundColor: 'var(--accent)',
            color: '#1B2541',
            borderRadius: 14,
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? '…' : (
            <>
              {t('welcomeCta')}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
