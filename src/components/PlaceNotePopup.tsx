// src/components/PlaceNotePopup.tsx
// Popup shown when user taps a place note marker on the map.
// Offers "Depart from here" and "Go here" to prefill the trip planner.

'use client';

import { motion } from 'framer-motion';
import { useStore } from '@/stores/useStore';
import { PlaceNote } from '@/types';
import { springTransition } from '@/lib/utils';

interface Props {
  note: PlaceNote;
  onClose: () => void;
}

export default function PlaceNotePopup({ note, onClose }: Props) {
  const { setTripPrefill, setActiveTab, setSelectedPlaceNote } = useStore();

  const label = note.name || `${note.emoji} ${note.note.slice(0, 30)}`;

  function departFrom() {
    setTripPrefill({
      departure: label,
      departureCoords: [note.lng, note.lat],
    });
    setSelectedPlaceNote(null);
    setActiveTab('trip');
    onClose();
  }

  function goHere() {
    setTripPrefill({
      destination: label,
      destCoords: [note.lng, note.lat],
    });
    setSelectedPlaceNote(null);
    setActiveTab('trip');
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 z-200"
        style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
      />

      {/* Popup card */}
      <motion.div
        className="sheet-motion absolute bottom-0 left-1/2 -translate-x-1/2 w-[92%] max-w-110 rounded-t-2xl z-201"
        style={{ backgroundColor: 'var(--bg-secondary)', boxShadow: '0 -10px 40px var(--bg-overlay)' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={springTransition}
      >
        {/* Drag handle */}
        <div className="w-9 h-1 rounded-full mx-auto mt-3" style={{ backgroundColor: 'var(--border)' }} />

        <div className="px-5 pt-4 pb-10 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                style={{ backgroundColor: 'var(--bg-card)' }}
              >
                {note.emoji}
              </div>
              <div className="min-w-0">
                <p className="font-black text-base truncate" style={{ color: 'var(--text-primary)' }}>
                  {note.name || 'Place Note'}
                </p>
                <p className="text-xs line-clamp-2 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {note.note}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 text-xs px-3 py-1.5 rounded-full font-bold"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              ✕
            </button>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={departFrom}
              className="w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition hover:opacity-90 active:scale-[0.98]"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1.5px solid var(--accent)',
                color: 'var(--accent)',
              }}
            >
              🚶 Depart from here
            </button>
            <button
              onClick={goHere}
              className="w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: 'var(--accent)', color: '#fff', boxShadow: '0 6px 20px rgba(212,168,83,0.25)' }}
            >
              📍 Go here
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
