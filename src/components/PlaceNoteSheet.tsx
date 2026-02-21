// src/components/PlaceNoteSheet.tsx

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { PlaceNote } from '@/types';
import { toast } from 'sonner';

const springTransition = { type: 'spring', damping: 32, stiffness: 320, mass: 0.8 } as const;

const EMOJI_OPTIONS = ['📌', '⚠️', '💡', '❤️', '🏠', '🍽️', '🌳', '🔒', '🚶', '⭐'];

type Props = {
  coords: { lat: number; lng: number };
  userId: string;
  onClose: () => void;
  onSaved: () => void;
};

export default function PlaceNoteSheet({ coords, userId, onClose, onSaved }: Props) {
  const { addPlaceNote } = useStore();
  const [note, setNote]   = useState('');
  const [emoji, setEmoji] = useState('📌');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!note.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('place_notes')
      .insert({ user_id: userId, lat: coords.lat, lng: coords.lng, note: note.trim(), emoji })
      .select()
      .single();
    setSaving(false);
    if (error) { toast.error('Could not save note'); return; }
    toast.success('Note saved 📌');
    addPlaceNote(data as PlaceNote);
    onSaved();
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 z-200"
        style={{ backgroundColor: 'var(--bg-overlay)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        className="sheet-motion absolute bottom-0 left-1/2 -translate-x-1/2 w-[92%] max-w-110 rounded-t-3xl z-201"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={springTransition}
      >
        <div className="w-9 h-1 rounded-full mx-auto mt-3" style={{ backgroundColor: 'var(--border)' }} />
        <div className="p-5 pb-10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>
              Add Place Note
            </h2>
            <button
              onClick={onClose}
              className="text-xs px-3 py-1.5 rounded-full font-bold"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              ✕
            </button>
          </div>

          {/* Location hint */}
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </p>

          {/* Emoji picker */}
          <div>
            <p className="text-[0.65rem] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
              Icon
            </p>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className="w-9 h-9 rounded-xl text-lg flex items-center justify-center transition"
                  style={{
                    backgroundColor: emoji === e ? 'var(--accent)' : 'var(--bg-card)',
                    border: emoji === e ? '2px solid var(--accent)' : '1.5px solid var(--border)',
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Note text */}
          <div>
            <p className="text-[0.65rem] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Note <span style={{ color: 'var(--accent)' }}>*</span>
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Well-lit at night, avoid after 10pm…"
              rows={3}
              className="w-full text-sm rounded-xl px-4 py-2.5 outline-none resize-none"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1.5px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Save */}
          <button
            onClick={save}
            disabled={!note.trim() || saving}
            className="w-full py-3.5 rounded-2xl font-black text-sm transition disabled:opacity-40"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          >
            {saving ? 'Saving…' : `${emoji} Save Note`}
          </button>
        </div>
      </motion.div>
    </>
  );
}
