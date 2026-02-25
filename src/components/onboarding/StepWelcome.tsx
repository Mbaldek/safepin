// Step 0 — Welcome

'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

function BrumeShield({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 2L4 7v9c0 8.5 5.2 14.2 12 17 6.8-2.8 12-8.5 12-17V7L16 2z" fill="var(--accent)" opacity="0.2" />
      <path d="M16 2L4 7v9c0 8.5 5.2 14.2 12 17 6.8-2.8 12-8.5 12-17V7L16 2z" stroke="var(--accent)" strokeWidth="1.5" fill="none" />
      <text x="16" y="21" textAnchor="middle" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="800" fontSize="13" fill="var(--accent)">B</text>
    </svg>
  );
}

export default function StepWelcome({ onNext }: { onNext: () => void }) {
  const t = useTranslations('onboarding');

  return (
    <div className="flex flex-col items-center text-center pt-8 pb-4">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 18, stiffness: 260 }}
        className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
        style={{
          background: 'linear-gradient(135deg, rgba(244,63,94,0.1), rgba(244,63,94,0.25))',
          border: '1.5px solid rgba(244,63,94,0.3)',
        }}
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <BrumeShield size={52} />
        </motion.div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-black mb-2"
        style={{ color: 'var(--text-primary)' }}
      >
        {t('welcome')}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="text-sm mb-8"
        style={{ color: 'var(--text-muted)' }}
      >
        {t('welcomeSub')}
      </motion.p>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        onClick={onNext}
        className="w-full py-4 rounded-2xl font-black text-base transition active:scale-[0.98]"
        style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
      >
        {t('getStarted')}
      </motion.button>
    </div>
  );
}
