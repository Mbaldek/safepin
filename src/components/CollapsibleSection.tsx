// src/components/CollapsibleSection.tsx

'use client';

import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

type Props = {
  label: string;
  summary?: string;
  isActive?: boolean;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export default function CollapsibleSection({
  label,
  summary,
  isActive,
  expanded,
  onToggle,
  children,
}: Props) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-5 py-3"
      >
        <span
          className="text-[0.6rem] font-black uppercase tracking-widest"
          style={{ color: 'var(--text-muted)' }}
        >
          {label}
        </span>
        <div className="flex items-center gap-2">
          {summary && (
            <span
              className="text-xs font-bold"
              style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}
            >
              {summary}
            </span>
          )}
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            style={{ color: 'var(--text-muted)' }}
          />
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300, mass: 0.6 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-5 pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
