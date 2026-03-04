// src/components/MilestoneToast.tsx — Custom celebration toast for milestones

'use client';

import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useTheme } from '@/stores/useTheme';
import type { Milestone } from '@/lib/milestones';

function getColors(isDark: boolean) {
  return isDark ? {
    card: '#1E293B',
    textPrimary: '#FFFFFF',
    textSecondary: '#94A3B8',
  } : {
    card: '#FFFFFF',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
  };
}

function MilestoneContent({ milestone, id, isDark }: { milestone: Milestone; id: string | number; isDark: boolean }) {
  const C = getColors(isDark);
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="flex items-center gap-3 px-4 py-3 rounded-2xl w-full max-w-[340px]"
      style={{
        backgroundColor: C.card,
        border: '1.5px solid rgba(245,158,11,0.3)',
        boxShadow: '0 8px 32px rgba(245,158,11,0.15)',
      }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg"
        style={{ backgroundColor: 'rgba(245,158,11,0.12)' }}
      >
        {milestone.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black uppercase tracking-wide" style={{ color: '#f59e0b' }}>
          Milestone unlocked
        </p>
        <p className="text-sm font-bold truncate" style={{ color: C.textPrimary }}>
          {milestone.label}
        </p>
        <p className="text-[0.65rem]" style={{ color: C.textSecondary }}>
          {milestone.description}
        </p>
      </div>
      <button
        onClick={() => toast.dismiss(id)}
        className="text-xs font-bold shrink-0 px-2 py-1 rounded-lg transition hover:opacity-70"
        style={{ color: C.textSecondary, background: 'none', border: 'none', cursor: 'pointer' }}
      >
        OK
      </button>
    </motion.div>
  );
}

export function showMilestoneToast(milestone: Milestone) {
  const isDark = useTheme.getState().theme === 'dark';
  toast.custom(
    (id) => <MilestoneContent milestone={milestone} id={id} isDark={isDark} />,
    { duration: 6000, position: 'top-center' }
  );
}
