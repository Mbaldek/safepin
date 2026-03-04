// src/components/PlaceNotePopup.tsx
// Popup shown when user taps a place note marker on the map.
// Offers "Depart from here" and "Go here" to prefill the trip planner.

'use client';

import { motion } from 'framer-motion';
import { useStore } from '@/stores/useStore';
import { PlaceNote } from '@/types';
import { springTransition } from '@/lib/utils';
import { useTheme } from '@/stores/useTheme';

function getColors(isDark: boolean) {
  return isDark ? {
    bg: '#0F172A', card: '#1E293B', elevated: '#334155',
    textPrimary: '#FFFFFF', textSecondary: '#94A3B8', textTertiary: '#64748B',
    border: 'rgba(255,255,255,0.08)', borderMid: 'rgba(255,255,255,0.12)',
    hover: 'rgba(255,255,255,0.05)', active: 'rgba(255,255,255,0.10)',
    inputBg: 'rgba(255,255,255,0.06)',
  } : {
    bg: '#F8FAFC', card: '#FFFFFF', elevated: '#F1F5F9',
    textPrimary: '#0F172A', textSecondary: '#475569', textTertiary: '#94A3B8',
    border: 'rgba(15,23,42,0.06)', borderMid: 'rgba(15,23,42,0.10)',
    hover: 'rgba(15,23,42,0.03)', active: 'rgba(15,23,42,0.06)',
    inputBg: 'rgba(15,23,42,0.04)',
  };
}
const FIXED = {
  accentCyan: '#3BB4C1', accentCyanSoft: 'rgba(59,180,193,0.12)',
  accentGold: '#F5C341', semanticDanger: '#EF4444',
};

interface Props {
  note: PlaceNote;
  onClose: () => void;
}

export default function PlaceNotePopup({ note, onClose }: Props) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);
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
        style={{ backgroundColor: C.elevated, boxShadow: `0 -10px 40px ${isDark ? 'rgba(15,23,42,0.8)' : 'rgba(248,250,252,0.8)'}` }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={springTransition}
      >
        {/* Drag handle */}
        <div className="w-9 h-1 rounded-full mx-auto mt-3" style={{ backgroundColor: C.border }} />

        <div className="px-5 pt-4 pb-10 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                style={{ backgroundColor: C.card }}
              >
                {note.emoji}
              </div>
              <div className="min-w-0">
                <p className="font-black text-base truncate" style={{ color: C.textPrimary }}>
                  {note.name || 'Place Note'}
                </p>
                <p className="text-xs line-clamp-2 mt-0.5" style={{ color: C.textSecondary }}>
                  {note.note}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 text-xs px-3 py-1.5 rounded-full font-bold"
              style={{ color: C.textSecondary, border: `1px solid ${C.border}` }}
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
                backgroundColor: C.card,
                border: `1.5px solid ${FIXED.accentCyan}`,
                color: FIXED.accentCyan,
              }}
            >
              🚶 Depart from here
            </button>
            <button
              onClick={goHere}
              className="w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: FIXED.accentCyan, color: '#fff', boxShadow: '0 6px 20px rgba(212,168,83,0.25)' }}
            >
              📍 Go here
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
