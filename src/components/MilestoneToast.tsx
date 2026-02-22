// src/components/MilestoneToast.tsx — Custom celebration toast for milestones

'use client';

import { toast } from 'sonner';
import type { Milestone } from '@/lib/milestones';

export function showMilestoneToast(milestone: Milestone) {
  toast.custom(
    (id) => (
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg w-full max-w-[340px] animate-in slide-in-from-top-2 fade-in duration-300"
        style={{
          backgroundColor: 'var(--bg-card)',
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
          <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
            {milestone.label}
          </p>
          <p className="text-[0.65rem]" style={{ color: 'var(--text-muted)' }}>
            {milestone.description}
          </p>
        </div>
        <button
          onClick={() => toast.dismiss(id)}
          className="text-xs font-bold shrink-0 px-2 py-1 rounded-lg transition hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
        >
          OK
        </button>
      </div>
    ),
    { duration: 6000, position: 'top-center' }
  );
}
