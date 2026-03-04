// src/components/PushOptInModal.tsx

'use client';

import { motion } from 'framer-motion';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { useTheme } from '@/stores/useTheme';

function getColors(isDark: boolean) {
  return isDark ? {
    bg: '#0F172A', card: '#1E293B', elevated: '#334155',
    textPrimary: '#FFFFFF', textSecondary: '#94A3B8', textTertiary: '#64748B',
    border: 'rgba(255,255,255,0.08)', borderMid: 'rgba(255,255,255,0.12)',
    hover: 'rgba(255,255,255,0.05)', active: 'rgba(255,255,255,0.10)',
    inputBg: 'rgba(255,255,255,0.06)',
  } : {
    bg: '#F8FAFC', card: '#FFFFFF', elevated: '#F1F5F9',
    textPrimary: '#0F172A', textSecondary: '#475569', textTertiary: '#94A3B8',
    border: 'rgba(15,23,42,0.06)', borderMid: 'rgba(15,23,42,0.10)',
    hover: 'rgba(15,23,42,0.03)', active: 'rgba(15,23,42,0.06)',
    inputBg: 'rgba(15,23,42,0.04)',
  };
}
const FIXED = {
  accentCyan: '#3BB4C1', accentCyanSoft: 'rgba(59,180,193,0.12)',
  accentGold: '#F5C341', semanticDanger: '#EF4444',
};

const LS_KEY = 'brume_push_dismissed';

export function shouldShowPushOptIn(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return false;
  if (Notification.permission !== 'default') return false;
  if (localStorage.getItem(LS_KEY) === '1') return false;
  return true;
}

export function dismissPushOptIn() {
  localStorage.setItem(LS_KEY, '1');
}

type Props = {
  onEnable: () => void;
  onDismiss: () => void;
};

export default function PushOptInModal({ onEnable, onDismiss }: Props) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);
  const focusTrapRef = useFocusTrap(true, onDismiss);
  return (
    <>
      <motion.div
        className="fixed inset-0 z-[500]"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onDismiss}
      />
      <motion.div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Enable notifications"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[501] w-[88%] max-w-[360px] rounded-3xl p-6"
        style={{ backgroundColor: C.elevated }}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
      >
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, rgba(212,168,83,0.15), rgba(212,168,83,0.3))', border: '1.5px solid rgba(212,168,83,0.25)' }}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <path d="M16 2L4 7v9c0 8.5 5.2 14.2 12 17 6.8-2.8 12-8.5 12-17V7L16 2z" fill={FIXED.accentCyan} opacity="0.2" />
            <path d="M16 2L4 7v9c0 8.5 5.2 14.2 12 17 6.8-2.8 12-8.5 12-17V7L16 2z" stroke={FIXED.accentCyan} strokeWidth="1.5" fill="none" />
          </svg>
        </div>

        <h3 className="text-lg font-black text-center mb-1" style={{ color: C.textPrimary }}>
          Stay safe with alerts
        </h3>
        <p className="text-sm text-center leading-relaxed mb-5" style={{ color: C.textSecondary }}>
          Get notified when emergencies or safety incidents happen near you. You can customise alerts in Settings.
        </p>

        <button
          onClick={onEnable}
          className="w-full py-3.5 rounded-2xl font-black text-sm transition active:scale-[0.98]"
          style={{ backgroundColor: FIXED.accentCyan, color: '#fff' }}
        >
          Enable alerts
        </button>
        <button
          onClick={onDismiss}
          className="w-full py-2.5 text-xs font-bold mt-2 transition"
          style={{ color: C.textSecondary }}
        >
          Not now
        </button>
      </motion.div>
    </>
  );
}
