'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { springTransition } from '@/lib/tokens';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showHandle?: boolean;
  showClose?: boolean;
}

export function Sheet({
  isOpen,
  onClose,
  title,
  children,
  showHandle = true,
  showClose = false,
}: SheetProps) {
  // Lock body scroll when open
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-200"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springTransition}
            className="fixed bottom-0 left-0 right-0 z-201 bg-[var(--surface-elevated)] rounded-t-[var(--radius-xl)] max-h-[90vh] overflow-y-auto sheet-motion"
          >
            {/* Handle */}
            {showHandle && (
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-9 h-1 rounded-full bg-[var(--border-strong)]" />
              </div>
            )}

            {/* Header */}
            {(title || showClose) && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
                {title && (
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
                )}
                {showClose && (
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-[var(--interactive-hover)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="px-6 py-4 pb-[calc(var(--space-6)+env(safe-area-inset-bottom))]">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
