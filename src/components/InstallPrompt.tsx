// src/components/InstallPrompt.tsx — PWA install prompt

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download } from 'lucide-react';
import { useTranslations } from 'next-intl';
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

const LS_DISMISSED = 'brume_install_dismissed';
const LS_SESSION_COUNT = 'brume_session_count';
const MIN_SESSIONS = 3;

export default function InstallPrompt() {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);
  const t = useTranslations('install');
  const [show, setShow] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Don't show if already dismissed or already installed
    if (localStorage.getItem(LS_DISMISSED)) return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Increment session count
    const count = parseInt(localStorage.getItem(LS_SESSION_COUNT) ?? '0', 10) + 1;
    localStorage.setItem(LS_SESSION_COUNT, String(count));
    if (count < MIN_SESSIONS) return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem(LS_DISMISSED, '1');
    }
    deferredPrompt.current = null;
    setShow(false);
  }

  function handleDismiss() {
    localStorage.setItem(LS_DISMISSED, '1');
    setShow(false);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="absolute bottom-20 left-3 right-3 z-[160] rounded-2xl px-4 py-3 shadow-lg flex items-center gap-3"
          style={{
            backgroundColor: C.card,
            border: `1.5px solid ${FIXED.accentCyan}`,
            boxShadow: '0 8px 32px rgba(212,168,83,0.15)',
          }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `linear-gradient(135deg, ${FIXED.accentGold}, #B8923E)` }}>
            <Download size={16} style={{ color: '#fff' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black" style={{ color: C.textPrimary }}>{t('addToHome')}</p>
            <p className="text-[0.6rem]" style={{ color: C.textSecondary }}>{t('quickAccess')}</p>
          </div>
          <button onClick={handleInstall}
            className="px-3 py-1.5 rounded-xl text-[0.65rem] font-black shrink-0 transition hover:opacity-90"
            style={{ backgroundColor: FIXED.accentCyan, color: '#fff' }}>
            {t('install')}
          </button>
          <button onClick={handleDismiss} className="p-1 shrink-0">
            <X size={12} style={{ color: C.textSecondary }} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// TypeScript type for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
