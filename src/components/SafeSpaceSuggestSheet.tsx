// src/components/SafeSpaceSuggestSheet.tsx — Sheet to suggest a new safe space

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { SafeSpace } from '@/types';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

const springTransition = { type: 'spring', damping: 32, stiffness: 320, mass: 0.8 } as const;

const SPACE_TYPES: { id: SafeSpace['type']; emoji: string; labelKey: string }[] = [
  { id: 'pharmacy', emoji: '💊', labelKey: 'pharmacy' },
  { id: 'hospital', emoji: '🏥', labelKey: 'hospital' },
  { id: 'police',   emoji: '🚔', labelKey: 'police' },
  { id: 'cafe',     emoji: '☕', labelKey: 'cafe' },
  { id: 'shelter',  emoji: '🏠', labelKey: 'shelter' },
];

type Props = {
  coords: { lat: number; lng: number };
  onClose: () => void;
};

export default function SafeSpaceSuggestSheet({ coords, onClose }: Props) {
  const { userId, safeSpaces, setSafeSpaces } = useStore();
  const t = useTranslations('safeSpaces');

  const [name, setName] = useState('');
  const [type, setType] = useState<SafeSpace['type']>('cafe');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim() || !userId) return;
    setSubmitting(true);

    const { data, error } = await supabase
      .from('safe_spaces')
      .insert({
        lat: coords.lat,
        lng: coords.lng,
        name: name.trim(),
        type,
        source: 'user',
        created_by: userId,
      })
      .select()
      .single();

    setSubmitting(false);

    if (error) {
      toast.error(t('submitFailed'));
      return;
    }

    setSafeSpaces([data as SafeSpace, ...safeSpaces]);
    toast.success(t('submitted'));
    onClose();
  }

  return (
    <>
      <motion.div
        key="ss-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 z-200"
        style={{ backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      <motion.div
        key="ss-sheet"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={springTransition}
        className="sheet-motion absolute bottom-0 left-1/2 -translate-x-1/2 w-[92%] max-w-110 rounded-t-3xl z-201 flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--bg-primary)', maxHeight: '70dvh', boxShadow: '0 -8px 40px rgba(0,0,0,0.25)' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full" style={{ backgroundColor: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-1 pb-3 shrink-0">
          <h2 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>
            {t('suggestTitle')}
          </h2>
          <button onClick={onClose} className="p-1">
            <X size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-4">
          {/* Name */}
          <div>
            <p className="text-[0.65rem] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
              {t('name')}
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('namePlaceholder')}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1.5px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Type */}
          <div>
            <p className="text-[0.65rem] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
              {t('type')}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {SPACE_TYPES.map(({ id, emoji, labelKey }) => (
                <button
                  key={id}
                  onClick={() => setType(id)}
                  className="flex flex-col items-center gap-1 py-3 rounded-2xl transition"
                  style={{
                    backgroundColor: type === id ? 'var(--accent)' : 'var(--bg-card)',
                    border: type === id ? '2px solid var(--accent)' : '1.5px solid var(--border)',
                    color: type === id ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  <span className="text-lg">{emoji}</span>
                  <span className="text-[0.6rem] font-bold">{t(labelKey)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="rounded-xl px-4 py-2.5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[0.6rem] font-bold" style={{ color: 'var(--text-muted)' }}>
              📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </p>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || submitting}
            className="w-full py-3.5 rounded-2xl font-black text-sm transition disabled:opacity-40"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          >
            {submitting ? t('submitting') : t('submit')}
          </button>
        </div>
      </motion.div>
    </>
  );
}
