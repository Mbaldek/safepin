// src/components/OnboardingFunnel.tsx — 6-step interactive onboarding funnel

'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import StepWelcome from './onboarding/StepWelcome';
import StepMapPreview from './onboarding/StepMapPreview';
import StepReportDemo from './onboarding/StepReportDemo';
import StepSOSDemo from './onboarding/StepSOSDemo';
import StepTrustedContact from './onboarding/StepTrustedContact';
import StepHomeZone from './onboarding/StepHomeZone';
import StepCelebration from './onboarding/StepCelebration';

const STORAGE_KEY = 'brume_onboarding_done';
const TOTAL_STEPS = 7;

const slideTransition = { type: 'spring' as const, damping: 25, stiffness: 300, mass: 0.6 };

export function useOnboardingDone(
  profile: { onboarding_completed?: boolean } | null,
): [boolean, () => void] {
  const [done, setDone] = useState(() => {
    if (typeof window === 'undefined') return true;
    if (localStorage.getItem(STORAGE_KEY) === '1') return true;
    return profile?.onboarding_completed === true;
  });

  const markDone = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '1');
    setDone(true);
  }, []);

  return [done, markDone];
}

type Props = {
  userId: string;
  onDone: () => void;
};

export default function OnboardingFunnel({ userId, onDone }: Props) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [contactAdded, setContactAdded] = useState(false);
  const [contactName, setContactName] = useState('');
  const [homeZoneSet, setHomeZoneSet] = useState(false);

  function goNext() {
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }

  function goBack() {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }

  function handleSkip() {
    // Skip to celebration
    setDirection(1);
    setStep(6);
  }

  async function handleComplete() {
    await supabase.from('profiles').update({
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
    }).eq('id', userId);
    document.cookie = 'ob_done=1;path=/;max-age=31536000';
    onDone();
  }

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  function renderStep() {
    switch (step) {
      case 0: return <StepWelcome onNext={goNext} />;
      case 1: return <StepMapPreview onNext={goNext} />;
      case 2: return <StepReportDemo onNext={goNext} />;
      case 3: return <StepSOSDemo onNext={goNext} />;
      case 4: return (
        <StepTrustedContact
          userId={userId}
          onNext={goNext}
          onSkip={goNext}
          onContactAdded={(name) => { setContactAdded(true); setContactName(name); }}
        />
      );
      case 5: return (
        <StepHomeZone
          userId={userId}
          onNext={goNext}
          onSkip={goNext}
          onZoneSet={() => setHomeZoneSet(true)}
        />
      );
      case 6: return (
        <StepCelebration
          contactAdded={contactAdded}
          contactName={contactName}
          homeZoneSet={homeZoneSet}
          onDone={handleComplete}
        />
      );
      default: return null;
    }
  }

  return (
    <div
      className="fixed inset-0 z-[600] flex flex-col items-center justify-end"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-[440px] mx-auto rounded-t-2xl flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--bg-secondary)', maxHeight: '90dvh' }}
      >
        {/* Header: back + dots */}
        <div className="flex items-center px-5 pt-5 pb-3">
          {step > 0 ? (
            <button onClick={goBack} className="p-1 -ml-1" aria-label="Back">
              <ChevronLeft size={20} style={{ color: 'var(--text-muted)' }} />
            </button>
          ) : (
            <div className="w-7" />
          )}

          <div className="flex-1 flex justify-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
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

          {step > 0 && step < 6 ? (
            <button
              onClick={handleSkip}
              className="text-[0.6rem] font-bold"
              style={{ color: 'var(--text-muted)' }}
            >
              Skip
            </button>
          ) : (
            <div className="w-7" />
          )}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={slideTransition}
              className="px-6 pb-8"
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
