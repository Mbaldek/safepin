// Step 3 — SOS demo (animated non-functional button)

'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

export default function StepSOSDemo({ onNext }: { onNext: () => void }) {
  const t = useTranslations('onboarding');

  return (
    <div className="flex flex-col items-center text-center pt-6 pb-4">
      <div className="relative flex items-center justify-center mb-8">
        {/* Pulse ring */}
        <motion.div
          className="absolute w-28 h-28 rounded-full"
          style={{ border: '2px solid rgba(239,68,68,0.3)' }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* SOS button */}
        <motion.button
          onClick={() => toast(t('sosDemo'), { icon: '🛡️' })}
          className="w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-lg"
          style={{ backgroundColor: '#ef4444' }}
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          whileTap={{ scale: 0.95 }}
        >
          🆘
        </motion.button>
      </div>

      <h2 className="text-xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>
        {t('sosTitle')}
      </h2>
      <p className="text-sm mb-8 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {t('sosBody')}
      </p>

      <button
        onClick={onNext}
        className="w-full py-4 rounded-2xl font-black text-base transition active:scale-[0.98]"
        style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
      >
        {t('iUnderstand')} →
      </button>
    </div>
  );
}
