'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTheme } from '@/stores/useTheme';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

function getColors(isDark: boolean) {
  return isDark ? {
    textPrimary: '#FFFFFF',
    border: 'rgba(255,255,255,0.08)',
    borderMid: 'rgba(255,255,255,0.12)',
  } : {
    textPrimary: '#0F172A',
    border: 'rgba(15,23,42,0.06)',
    borderMid: 'rgba(15,23,42,0.10)',
  };
}

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Sheet({ isOpen, onClose, title, children }: SheetProps) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 400,
            }}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={spring}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: isDark ? '#1A2540' : '#FFFFFF',
              borderTop: `1px solid ${C.border}`,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              boxShadow: isDark ? '0 -8px 32px rgba(0,0,0,0.4)' : '0 -8px 32px rgba(0,0,0,0.08)',
              zIndex: 500,
              paddingBottom: 'env(safe-area-inset-bottom, 24px)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 8 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: C.borderMid }} />
            </div>
            {title && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 24px',
                borderBottom: `1px solid ${C.border}`,
              }}>
                <h2 style={{ fontSize: 20, fontWeight: 500, color: C.textPrimary }}>{title}</h2>
                <button
                  onClick={onClose}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.06)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: C.textPrimary,
                    cursor: 'pointer',
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            )}
            <div style={{ padding: '24px 24px' }}>{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
