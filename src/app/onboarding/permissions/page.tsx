// src/app/onboarding/permissions/page.tsx — Step 3/5: Permissions
// Two internal sub-steps: Location (65%) → Notifications (80%)
// Both "Plus tard" skip without blocking. Saves onboarding_step=3 → /onboarding/circle

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';

// ─── Map illustration (ported from v0) ────────────────────────────────────────

function MapIllustration() {
  return (
    <div
      className="relative mx-auto w-full overflow-hidden rounded-2xl"
      style={{ backgroundColor: 'var(--surface-card)', height: 220 }}
    >
      <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
        {/* Street grid */}
        <line x1="0" y1="55" x2="100%" y2="55" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        <line x1="0" y1="110" x2="100%" y2="110" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        <line x1="0" y1="165" x2="100%" y2="165" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        <line x1="80" y1="0" x2="80" y2="100%" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        <line x1="165" y1="0" x2="165" y2="100%" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        <line x1="245" y1="0" x2="245" y2="100%" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        {/* Dashed connectors between pins */}
        <line x1="90" y1="75" x2="190" y2="125" stroke="rgba(232,168,56,0.15)" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="190" y1="125" x2="270" y2="80" stroke="rgba(139,126,200,0.15)" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="190" y1="125" x2="155" y2="170" stroke="rgba(107,166,142,0.15)" strokeWidth="1" strokeDasharray="4 4" />
        {/* Subtle building blocks */}
        <rect x="100" y="30" width="45" height="20" rx="3" fill="rgba(255,255,255,0.02)" />
        <rect x="200" y="140" width="30" height="35" rx="3" fill="rgba(255,255,255,0.02)" />
        <rect x="50" y="130" width="35" height="25" rx="3" fill="rgba(255,255,255,0.02)" />
      </svg>

      {/* Pin 1 — Gold — Lieux proches */}
      <div className="absolute" style={{ left: 60, top: 58 }}>
        <div className="flex flex-col items-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: 'var(--accent-gold)', boxShadow: '0 0 16px rgba(232,168,56,0.35)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--surface-base)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div className="mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap"
            style={{ backgroundColor: 'rgba(232,168,56,0.15)', color: 'var(--accent-gold)' }}>
            Lieux proches
          </div>
        </div>
      </div>

      {/* Pin 2 — Purple — Itinéraires intelligents */}
      <div className="absolute" style={{ left: 230, top: 50 }}>
        <div className="flex flex-col items-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: '#8B7EC8', boxShadow: '0 0 16px rgba(139,126,200,0.35)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--surface-base)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
              <line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" />
            </svg>
          </div>
          <div className="mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap"
            style={{ backgroundColor: 'rgba(139,126,200,0.15)', color: '#8B7EC8' }}>
            Itinéraires intelligents
          </div>
        </div>
      </div>

      {/* Pin 3 — Green — Communauté locale */}
      <div className="absolute" style={{ left: 120, top: 145 }}>
        <div className="flex flex-col items-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: '#6BA68E', boxShadow: '0 0 16px rgba(107,166,142,0.35)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--surface-base)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap"
            style={{ backgroundColor: 'rgba(107,166,142,0.15)', color: '#6BA68E' }}>
            Communauté locale
          </div>
        </div>
      </div>

      {/* Radial glow */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ width: 120, height: 120, background: 'radial-gradient(circle, rgba(232,168,56,0.06) 0%, transparent 70%)' }} />
    </div>
  );
}

// ─── Notification stack illustration (ported from v0) ─────────────────────────

const MOCK_NOTIFICATIONS = [
  {
    accentColor: '#8B7EC8',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B7EC8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    title: 'Nouveau dans votre quartier',
    body: 'Sarah a rejoint Marais Solidaire',
    time: 'il y a 2 min',
  },
  {
    accentColor: '#6BA68E',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6BA68E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    title: 'Clara est en route',
    body: 'Elle a partagé son trajet avec vous',
    time: 'il y a 8 min',
  },
  {
    accentColor: 'var(--accent-gold)',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8A838" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
    title: 'Bilan de la semaine',
    body: 'Votre quartier est 23% plus sûr',
    time: 'il y a 1 h',
  },
] as const;

function NotificationStack() {
  return (
    <div className="relative w-full" style={{ height: 220 }}>
      {MOCK_NOTIFICATIONS.map((n, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 rounded-xl p-3"
          style={{
            top: i * 62,
            transform: `scale(${1 - i * 0.02})`,
            opacity: 1 - i * 0.08,
            backgroundColor: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            zIndex: 10 - i,
          }}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${n.accentColor}15` }}>
              {n.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{n.title}</span>
                <span className="shrink-0 text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{n.time}</span>
              </div>
              <p className="mt-0.5 text-[12px] leading-snug truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>{n.body}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPermissionsPage() {
  const router = useRouter();
  const t = useTranslations('onboarding');
  const userId = useStore((s) => s.userId);

  const [step, setStep] = useState<'location' | 'notifications'>('location');
  const [loading, setLoading] = useState(false);

  const progress = step === 'location' ? 65 : 80;

  async function finishPermissions() {
    if (!userId) { router.push('/onboarding/circle'); return; }
    setLoading(true);
    await supabase.from('profiles').update({ onboarding_step: 3 }).eq('id', userId);
    router.push('/onboarding/circle');
  }

  async function handleLocation() {
    try {
      await new Promise<void>((res, rej) =>
        navigator.geolocation.getCurrentPosition(() => res(), rej, { timeout: 8000 }),
      );
    } catch { /* denied or unavailable — continue */ }
    setStep('notifications');
  }

  async function handleNotifications() {
    try {
      if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
        await Notification.requestPermission();
      }
    } catch { /* not supported — continue */ }
    await finishPermissions();
  }

  const btnStyle: React.CSSProperties = {
    backgroundColor: 'var(--accent)',
    color: 'var(--surface-base)',
    borderRadius: 14,
    border: 'none',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
  };

  const laterStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.35)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  };

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>

      {/* Progress bar */}
      <div style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--accent)', transition: 'width 0.5s ease-out' }} />
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div className="max-w-sm mx-auto w-full px-5 pb-8 flex flex-col" style={{ flex: 1 }}>

          {/* Skip button */}
          <div className="flex justify-end pt-5 pb-6">
            <button
              onClick={step === 'location' ? () => setStep('notifications') : finishPermissions}
              className="text-sm"
              style={laterStyle}
            >
              {t('skipBtn')}
            </button>
          </div>

          {/* Illustration */}
          {step === 'location' ? <MapIllustration /> : <NotificationStack />}

          {/* Text */}
          <h1 className="mt-7" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.625rem', fontWeight: 300, lineHeight: 1.25 }}>
            {step === 'location' ? t('locationTitle') : t('notifTitle')}
          </h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {step === 'location' ? t('locationSub') : t('notifSub')}
          </p>

          {/* Spacer */}
          <div style={{ flex: 1, minHeight: 24 }} />

          {/* Primary button */}
          <button
            onClick={step === 'location' ? handleLocation : handleNotifications}
            disabled={loading}
            className="w-full py-4 text-[15px] font-bold transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
            style={btnStyle}
          >
            {loading ? '…' : (step === 'location' ? t('locationBtn') : t('notifBtn'))}
          </button>

          {/* Later / footer */}
          {step === 'location' ? (
            <button onClick={() => setStep('notifications')} className="mt-3 w-full py-2 text-sm text-center" style={laterStyle}>
              {t('laterBtn')}
            </button>
          ) : (
            <>
              <button onClick={finishPermissions} className="mt-3 w-full py-2 text-sm text-center" style={laterStyle}>
                {t('laterBtn')}
              </button>
              <p className="mt-4 text-center text-xs italic" style={{ color: 'rgba(255,255,255,0.30)' }}>
                {t('notifFooter')}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
