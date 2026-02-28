// src/components/FlagReportModal.tsx — Flag / report content modal

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

const REASON_IDS = ['spam', 'false_report', 'offensive', 'duplicate'] as const;
const REASON_EMOJIS: Record<string, string> = { spam: '🚫', false_report: '❌', offensive: '⚠️', duplicate: '📋' };
const REASON_KEYS: Record<string, { label: string; desc: string }> = {
  spam: { label: 'spam', desc: 'spamDesc' },
  false_report: { label: 'falseReport', desc: 'falseReportDesc' },
  offensive: { label: 'offensive', desc: 'offensiveDesc' },
  duplicate: { label: 'duplicate', desc: 'duplicateDesc' },
};

type Props = {
  targetType: 'pin' | 'user' | 'message' | 'story';
  targetId: string;
  onClose: () => void;
};

export default function FlagReportModal({ targetType, targetId, onClose }: Props) {
  const { userId } = useStore();
  const t = useTranslations('moderation');
  const focusTrapRef = useFocusTrap(true, onClose);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!selected || !userId || submitting) return;
    setSubmitting(true);
    const { error } = await supabase.from('user_reports').insert({
      reporter_id: userId,
      target_type: targetType,
      target_id: targetId,
      reason: selected,
    });
    setSubmitting(false);
    if (error) {
      if (error.code === '23505') {
        toast(t('alreadyReported'));
      } else {
        toast.error(t('reportFailed'));
      }
      onClose();
      return;
    }
    toast.success(t('reportSubmitted'));
    onClose();
  }

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[500]"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Report content"
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[501] max-w-[380px] mx-auto rounded-2xl p-5"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
            {t('reportTitle', { type: targetType })}
          </h3>
          <button onClick={onClose} className="p-1 rounded-full" style={{ color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          {t('whyReporting')}
        </p>

        <div className="flex flex-col gap-2 mb-5">
          {REASON_IDS.map((id) => (
            <button
              key={id}
              onClick={() => setSelected(id)}
              className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition"
              style={{
                backgroundColor: selected === id ? 'rgba(212,168,83,0.08)' : 'var(--bg-card)',
                border: `1.5px solid ${selected === id ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              <span className="text-lg">{REASON_EMOJIS[id]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold" style={{ color: selected === id ? 'var(--accent)' : 'var(--text-primary)' }}>
                  {t(REASON_KEYS[id].label)}
                </p>
                <p className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>{t(REASON_KEYS[id].desc)}</p>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!selected || submitting}
          className="w-full py-3 rounded-xl text-sm font-bold transition disabled:opacity-40"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          {submitting ? t('submitting') : t('submitReport')}
        </button>
      </motion.div>
    </>
  );
}
