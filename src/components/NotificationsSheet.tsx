// src/components/NotificationsSheet.tsx

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { useStore } from '@/stores/useStore';
import { supabase } from '@/lib/supabase';
import { MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { AppNotification } from '@/types';
import { timeAgoLong as timeAgo, springTransition } from '@/lib/utils';
import { useTheme } from '@/stores/useTheme';

const TYPE_META: Record<string, { icon: string; color: string }> = {
  emergency: { icon: '🆘', color: 'rgba(239,68,68,0.12)' },
  vote:      { icon: '👍', color: 'rgba(16,185,129,0.10)' },
  comment:   { icon: '💬', color: 'rgba(59,130,246,0.10)' },
  resolve:   { icon: '✅', color: 'rgba(16,185,129,0.10)' },
  community: { icon: '💬', color: 'rgba(139,92,246,0.10)' },
  milestone: { icon: '🏆', color: 'rgba(245,158,11,0.12)' },
  digest:    { icon: '📊', color: 'rgba(99,102,241,0.10)' },
};

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

export default function NotificationsSheet({ onClose }: { onClose: () => void }) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);
  const { notifications, markNotificationsRead, setActiveTab, userId, addNotification } = useStore();
  const t = useTranslations('notifications');
  const focusTrapRef = useFocusTrap(true, onClose);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from DB on first open if Zustand array is empty
  useEffect(() => {
    if (hydrated || notifications.length > 0 || !userId) { setHydrated(true); return; }
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) {
          for (const n of data.reverse()) {
            const existing = useStore.getState().notifications.find((x) => x.id === n.id);
            if (!existing) {
              // Add to Zustand only (skip DB insert since it already exists)
              useStore.setState((s) => ({ notifications: [n as AppNotification, ...s.notifications] }));
            }
          }
        }
        setHydrated(true);
      });
  }, [userId, notifications.length, hydrated]);

  useEffect(() => {
    markNotificationsRead();
  }, [markNotificationsRead]);

  const sorted = [...notifications].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <>
      <motion.div
        className="absolute inset-0 z-[200]"
        style={{ backgroundColor: isDark ? 'rgba(15,23,42,0.8)' : 'rgba(248,250,252,0.8)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />
      <motion.div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        className="sheet-motion absolute bottom-0 left-1/2 -translate-x-1/2 w-[92%] max-w-[440px] rounded-t-2xl z-[201] max-h-[72dvh] overflow-y-auto"
        style={{ backgroundColor: C.elevated }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={springTransition}
      >
        <div className="w-9 h-1 rounded-full mx-auto mt-3" style={{ backgroundColor: C.border }} />
        <div className="p-5 pb-10">
          <h3 className="text-lg font-black mb-4" style={{ color: C.textPrimary }}>
            {t('title')}
          </h3>

          {sorted.length === 0 ? (
            <div className="flex flex-col items-center py-14 gap-3">
              <span className="text-4xl">🔔</span>
              <p className="text-sm font-bold" style={{ color: C.textSecondary }}>
                {t('empty')}
              </p>
              <p className="text-xs" style={{ color: C.textSecondary }}>
                {t('emptyDesc')}
              </p>
              <button
                onClick={() => { setActiveTab('map'); onClose(); }}
                className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition hover:opacity-80"
                style={{ backgroundColor: FIXED.accentCyan, color: '#fff' }}
              >
                <MapPin size={13} />
                {t('goToMap')}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {sorted.map((n) => {
                const meta = TYPE_META[n.type] ?? { icon: '📍', color: C.card };
                return (
                  <div
                    key={n.id}
                    className="flex gap-3 p-3 rounded-xl"
                    style={{
                      backgroundColor: n.read ? C.card : meta.color,
                      border: n.read ? `1px solid ${C.border}` : '1px solid rgba(59,180,193,0.2)',
                    }}
                  >
                    <span className="text-xl shrink-0">{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold" style={{ color: C.textPrimary }}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: C.textSecondary }}>
                          {n.body}
                        </p>
                      )}
                      <p className="text-[0.6rem] mt-1 font-bold" style={{ color: C.textSecondary }}>
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                    {!n.read && (
                      <div
                        className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                        style={{ backgroundColor: FIXED.accentCyan }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full mt-5 py-3.5 rounded-xl font-bold text-sm transition hover:opacity-80"
            style={{
              backgroundColor: C.card,
              border: `1px solid ${C.border}`,
              color: C.textPrimary,
            }}
          >
            {t('close')}
          </button>
        </div>
      </motion.div>
    </>
  );
}
