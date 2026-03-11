// src/components/CommunityTooltip.tsx — Post-onboarding tooltip pointing at Community tab

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useIsDark } from '@/hooks/useIsDark';

function getColors(isDark: boolean) {
  return { accent: isDark ? '#3BB4C1' : '#C48A1E' };
}

const LS_KEY = 'breveil_community_tooltip_shown';
const SHOW_DELAY_MS = 2000;

// Migrate legacy key
if (typeof window !== 'undefined' && localStorage.getItem(LS_KEY) === null) {
  const legacy = localStorage.getItem('brume_community_tooltip_shown');
  if (legacy !== null) { localStorage.setItem(LS_KEY, legacy); localStorage.removeItem('brume_community_tooltip_shown'); }
}
const AUTO_DISMISS_MS = 6000;

type Props = {
  show: boolean;
};

export default function CommunityTooltip({ show }: Props) {
  const t = useTranslations('onboarding');
  const isDark = useIsDark();
  const c = getColors(isDark);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) return;
    if (localStorage.getItem(LS_KEY) === '1') return;

    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [show]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => dismiss(), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(LS_KEY, '1');
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="absolute z-100 flex flex-col items-center pointer-events-auto"
          style={{
            left: '37.5%',
            transform: 'translateX(-50%)',
            bottom: '72px',
          }}
        >
          <div
            className="relative px-4 py-3 rounded-2xl shadow-xl max-w-[240px]"
            style={{ backgroundColor: c.accent, color: '#fff' }}
          >
            <button
              onClick={dismiss}
              className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition hover:opacity-70"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            >
              <X size={10} strokeWidth={3} />
            </button>
            <p className="text-xs font-bold leading-relaxed pr-4">
              {t('communityTooltip')}
            </p>
          </div>
          {/* Arrow pointing down */}
          <div
            className="w-0 h-0"
            style={{
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: `8px solid ${c.accent}`,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
