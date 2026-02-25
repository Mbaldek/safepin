// Step 2 — Report demo (interactive category selector)

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { CATEGORIES } from '@/types';

export default function StepReportDemo({ onNext }: { onNext: () => void }) {
  const t = useTranslations('onboarding');
  const [selected, setSelected] = useState<string | null>(null);

  function handleSelect(key: string) {
    setSelected(key);
    if (typeof navigator !== 'undefined') navigator.vibrate?.(50);
  }

  return (
    <div className="flex flex-col items-center text-center pt-4 pb-4">
      <h2 className="text-xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>
        {t('reportTitle')}
      </h2>
      <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
        {t('reportBody')}
      </p>

      <div className="grid grid-cols-2 gap-3 w-full mb-5">
        {Object.entries(CATEGORIES).map(([key, { label, emoji }]) => (
          <button
            key={key}
            onClick={() => handleSelect(key)}
            className="relative rounded-2xl p-4 text-center border-2 transition active:scale-95"
            style={{
              borderColor: selected === key ? 'var(--accent)' : 'transparent',
              backgroundColor: selected === key ? 'var(--accent-glow)' : 'var(--bg-card)',
            }}
          >
            <motion.span
              className="text-2xl block mb-1"
              animate={selected === key ? { scale: [1, 1.3, 1] } : {}}
              transition={{ type: 'spring', damping: 15, stiffness: 400 }}
            >
              {emoji}
            </motion.span>
            <span
              className="text-xs font-bold"
              style={{ color: selected === key ? 'var(--accent)' : 'var(--text-primary)' }}
            >
              {label}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs font-bold mb-4"
            style={{ color: '#22c55e' }}
          >
            {t('reportFeedback')}
          </motion.p>
        )}
      </AnimatePresence>

      <button
        onClick={onNext}
        disabled={!selected}
        className="w-full py-4 rounded-2xl font-black text-base transition active:scale-[0.98] disabled:opacity-40"
        style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
      >
        {t('next')} →
      </button>
    </div>
  );
}
