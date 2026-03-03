// src/components/PlaceNoteSheet.tsx

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { useMapPadding } from '@/hooks/useMapPadding';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { PlaceNote } from '@/types';
import { toast } from 'sonner';
import { springTransition } from '@/lib/utils';

const EMOJI_OPTIONS = ['📌', '⚠️', '💡', '❤️', '🏠', '🍽️', '🌳', '🔒', '🚶', '⭐'];

type Props = {
  coords: { lat: number; lng: number };
  userId: string;
  onClose: () => void;
  onSaved: () => void;
};

export default function PlaceNoteSheet({ coords, userId, onClose, onSaved }: Props) {
  const { addPlaceNote, toggleFavPlace } = useStore();
  const focusTrapRef = useFocusTrap(true, onClose);
  useMapPadding(focusTrapRef);
  const [name, setName]         = useState('');
  const [note, setNote]         = useState('');
  const [emoji, setEmoji]       = useState('📌');
  const [saving, setSaving]     = useState(false);
  const [isFavorite, setFav]    = useState(false);
  const [address, setAddress]   = useState<string | null>(null);
  const [addrLoading, setAddrLoading] = useState(true);

  // Reverse geocode coords → human-readable address
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords.lng},${coords.lat}.json` +
      `?access_token=${token}&types=address,place&language=fr,en&limit=1`,
    )
      .then((r) => r.json())
      .then((d) => {
        const label = d.features?.[0]?.place_name as string | undefined;
        if (label) setAddress(label);
      })
      .catch(() => {})
      .finally(() => setAddrLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    if (!name.trim() && !note.trim()) return;
    setSaving(true);
    let result = await supabase
      .from('place_notes')
      .insert({ user_id: userId, lat: coords.lat, lng: coords.lng, name: name.trim() || null, note: note.trim() || name.trim(), emoji })
      .select()
      .single();

    // Fallback: if the `name` column doesn't exist yet (migration not run), retry without it
    if (result.error && result.error.message?.toLowerCase().includes('name')) {
      result = await supabase
        .from('place_notes')
        .insert({ user_id: userId, lat: coords.lat, lng: coords.lng, note: note.trim() || name.trim(), emoji })
        .select()
        .single();
    }

    const { data, error } = result;
    setSaving(false);
    if (error) {
      console.error('[PlaceNote save error]', error);
      toast.error(error.message ?? 'Could not save note');
      return;
    }
    addPlaceNote(data as PlaceNote);
    if (isFavorite) toggleFavPlace((data as PlaceNote).id);
    toast.success(isFavorite ? 'Note saved & added to favorites ⭐' : 'Note saved 📌');
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
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Place note"
        className="sheet-motion absolute bottom-0 left-1/2 -translate-x-1/2 w-[92%] max-w-110 rounded-t-2xl z-201"
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

          {/* Address / location hint */}
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            📍 {addrLoading
              ? 'Fetching address…'
              : address ?? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`}
          </p>

          {/* Name (optional) */}
          <div>
            <p className="text-[0.65rem] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Name <span style={{ color: 'var(--text-placeholder)' }}>(optional)</span>
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Home, Work, Coffee spot…"
              className="w-full text-sm rounded-xl px-4 py-2.5 outline-none"
              style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>

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
              Note <span style={{ color: 'var(--text-placeholder)' }}>(optional)</span>
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

          {/* Favorite toggle */}
          <button
            onClick={() => setFav((v) => !v)}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl transition text-sm font-bold"
            style={{
              backgroundColor: isFavorite ? 'rgba(245,158,11,0.10)' : 'var(--bg-card)',
              border: isFavorite ? '1.5px solid rgba(245,158,11,0.5)' : '1px solid var(--border)',
              color: isFavorite ? '#f59e0b' : 'var(--text-muted)',
            }}
          >
            <span className="text-base">{isFavorite ? '⭐' : '☆'}</span>
            <span>{isFavorite ? 'Added to Favorites' : 'Add to Favorites'}</span>
            <span className="ml-auto text-xs" style={{ color: 'var(--text-placeholder)' }}>
              {isFavorite ? 'Accessible in Trip Planner' : 'Quickly reuse in trips'}
            </span>
          </button>

          {/* Save */}
          <button
            onClick={save}
            disabled={(!name.trim() && !note.trim()) || saving}
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
