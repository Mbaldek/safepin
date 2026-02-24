// src/components/OnboardingOverlay.tsx

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function BrumeShield({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 2L4 7v9c0 8.5 5.2 14.2 12 17 6.8-2.8 12-8.5 12-17V7L16 2z" fill="var(--accent)" opacity="0.2" />
      <path d="M16 2L4 7v9c0 8.5 5.2 14.2 12 17 6.8-2.8 12-8.5 12-17V7L16 2z" stroke="var(--accent)" strokeWidth="1.5" fill="none" />
      <text x="16" y="21" textAnchor="middle" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="800" fontSize="13" fill="var(--accent)">B</text>
    </svg>
  );
}

type Step = {
  icon: 'shield' | string;
  title: string;
  body: string;
  cta: string;
};

const STEPS: Step[] = [
  {
    icon: 'shield',
    title: 'Welcome to Brume',
    body: 'See what\u2019s around you. Report in 30 seconds. SOS in one tap.',
    cta: 'Next',
  },
  {
    icon: '🆘',
    title: 'Your safety button',
    body: 'In danger? Hold the red SOS button. It alerts your trusted contacts and calls for help — instantly.',
    cta: 'Got it',
  },
];

const STORAGE_KEY = 'brume_onboarding_done';

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
        className="w-full max-w-[440px] mx-auto rounded-t-2xl px-6 pt-8 pb-10 flex flex-col items-center gap-5"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        {/* Step dots */}
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === step ? '20px' : '6px',
                height: '6px',
                backgroundColor: i === step ? 'var(--accent)' : 'var(--border)',
              }}
            />
          ))}
        </div>

        {/* Icon with transition */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300, mass: 0.6 }}
            className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, rgba(244,63,94,0.1), rgba(244,63,94,0.25))', border: '1.5px solid rgba(244,63,94,0.3)' }}
          >
            {current.icon === 'shield' ? <BrumeShield size={44} /> : <span className="text-4xl">{current.icon}</span>}
          </motion.div>
        </AnimatePresence>

        {/* Text with transition */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="text-center"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300, mass: 0.6 }}
          >
            <h2 className="text-xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>
              {current.title}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {current.body}
            </p>
          </motion.div>
        </AnimatePresence>

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
