// src/components/OnboardingOverlay.tsx

'use client';

import { useState } from 'react';

const STEPS = [
  {
    emoji: '🛡️',
    title: 'Welcome to SafePin',
    body: 'Your community safety network. Report incidents, stay informed, and look out for each other — all in real time.',
    cta: 'Get started',
  },
  {
    emoji: '📍',
    title: 'Drop a pin',
    body: 'Tap the + button on the map to report a safety incident. Add a description, severity level, and optional photo.',
    cta: 'Next',
  },
  {
    emoji: '🆘',
    title: 'Emergency mode',
    body: 'Hold the red SOS button to broadcast a live emergency alert. Your trail appears on everyone\'s map in real time.',
    cta: 'Next',
  },
  {
    emoji: '💬',
    title: 'Communities & messages',
    body: 'Join or create private groups, share stories, and send direct messages — just like a neighborhood watch, but smarter.',
    cta: 'Start exploring',
  },
] as const;

const STORAGE_KEY = 'safepin_onboarding_done';

export function useOnboardingDone(): [boolean, () => void] {
  const [done, setDone] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(STORAGE_KEY) === '1';
  });

  function markDone() {
    localStorage.setItem(STORAGE_KEY, '1');
    setDone(true);
  }

  return [done, markDone];
}

export default function OnboardingOverlay({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  function advance() {
    if (isLast) {
      onDone();
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[600] flex flex-col items-center justify-end"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-full max-w-[440px] mx-auto rounded-t-3xl px-6 pt-8 pb-10 flex flex-col items-center gap-5"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        {/* Step dots */}
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all"
              style={{
                width: i === step ? '20px' : '6px',
                height: '6px',
                backgroundColor: i === step ? 'var(--accent)' : 'var(--border)',
              }}
            />
          ))}
        </div>

        {/* Emoji icon */}
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-lg"
          style={{ background: 'linear-gradient(135deg, #f43f5e22, #f43f5e44)', border: '1.5px solid rgba(244,63,94,0.3)' }}
        >
          {current.emoji}
        </div>

        {/* Text */}
        <div className="text-center">
          <h2 className="text-xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>
            {current.title}
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {current.body}
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={advance}
          className="w-full py-4 rounded-2xl font-black text-base transition active:scale-[0.98]"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          {current.cta}
        </button>

        {/* Skip */}
        {!isLast && (
          <button
            onClick={onDone}
            className="text-xs font-bold"
            style={{ color: 'var(--text-muted)' }}
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
