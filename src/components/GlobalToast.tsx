'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useNotificationStore } from '@/stores/notificationStore';

const variantConfig = {
  info: { emoji: '\u{1F499}', bg: 'rgba(43,191,191,0.2)' },
  success: { emoji: '\u2705', bg: 'rgba(52,211,153,0.2)' },
  warning: { emoji: '\u26A0\uFE0F', bg: 'rgba(251,191,36,0.2)' },
} as const;

export default function GlobalToast() {
  const toastQueue = useNotificationStore((s) => s.toastQueue);
  const dismiss = useNotificationStore((s) => s.dismissToast);

  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        left: 12,
        right: 12,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence mode="popLayout">
        {[...toastQueue].reverse().map((toast) => {
          const cfg = variantConfig[toast.variant];
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -60, opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => dismiss(toast.id)}
              style={{
                background: '#1E293B',
                borderRadius: 14,
                padding: '11px 14px',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                pointerEvents: 'auto',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: cfg.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                {cfg.emoji}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: 12,
                    lineHeight: '16px',
                  }}
                >
                  {toast.message}
                </div>
                {toast.subMessage && (
                  <div
                    style={{
                      color: '#94A3B8',
                      fontSize: 11,
                      lineHeight: '14px',
                      marginTop: 2,
                    }}
                  >
                    {toast.subMessage}
                  </div>
                )}
              </div>

              <div
                style={{
                  color: '#94A3B8',
                  fontSize: 11,
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                maint.
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
