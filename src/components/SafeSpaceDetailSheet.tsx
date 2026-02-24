// src/components/SafeSpaceDetailSheet.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, ExternalLink, Phone, MapPin, Clock, Globe, ThumbsUp, Navigation, X, User, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { SafeSpace, DayHours } from '@/types';
import { toast } from 'sonner';

type Props = {
  space: SafeSpace | null;
  onClose: () => void;
};

const SPRING_TRANSITION = { type: 'spring' as const, damping: 30, stiffness: 350 };

const TYPE_EMOJI: Record<SafeSpace['type'], string> = {
  pharmacy: '\u{1F48A}',
  hospital: '\u{1F3E5}',
  police: '\u{1F46E}',
  cafe: '\u{2615}',
  shelter: '\u{1F3E0}',
};

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
// Also match short keys from admin form
const SHORT_TO_LONG: Record<string, string> = { mon: 'monday', tue: 'tuesday', wed: 'wednesday', thu: 'thursday', fri: 'friday', sat: 'saturday', sun: 'sunday' };

function formatDayHours(val: string | DayHours | undefined): string {
  if (!val) return 'Closed';
  if (typeof val === 'string') return val;
  if (val.closed) return 'Closed';
  const base = `${val.open ?? '09:00'} – ${val.close ?? '18:00'}`;
  if (val.breakStart && val.breakEnd) return `${base} (break ${val.breakStart}–${val.breakEnd})`;
  return base;
}

function normalizeHoursKeys(hours: Record<string, string | DayHours>): Record<string, string | DayHours> {
  const out: Record<string, string | DayHours> = { ...hours };
  for (const [short, long] of Object.entries(SHORT_TO_LONG)) {
    if (out[short] !== undefined && out[long] === undefined) {
      out[long] = out[short];
    }
  }
  return out;
}

function getTodayKey(): string {
  const d = new Date().getDay(); // 0=Sun
  return DAY_KEYS[d === 0 ? 6 : d - 1];
}

export default function SafeSpaceDetailSheet({ space, onClose }: Props) {
  const { userId } = useStore();
  const t = useTranslations('safeSpaces');

  const [hasVoted, setHasVoted] = useState(false);
  const [upvotes, setUpvotes] = useState(0);
  const [voting, setVoting] = useState(false);
  const [hoursExpanded, setHoursExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset state when space changes
  useEffect(() => {
    if (!space) return;
    setUpvotes(space.upvotes);
    setHasVoted(false);
    setHoursExpanded(false);

    // Check if user already voted
    if (userId) {
      supabase
        .from('safe_space_votes')
        .select('id')
        .eq('safe_space_id', space.id)
        .eq('user_id', userId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setHasVoted(true);
        });
    }
  }, [space?.id, userId]);

  async function handleUpvote() {
    if (!space || !userId || hasVoted || voting) return;
    setVoting(true);

    const { error } = await supabase
      .from('safe_space_votes')
      .insert({ safe_space_id: space.id, user_id: userId });

    if (!error) {
      // Increment upvotes on the safe_spaces row
      await supabase
        .from('safe_spaces')
        .update({ upvotes: upvotes + 1 })
        .eq('id', space.id);

      setUpvotes((c) => c + 1);
      setHasVoted(true);
      toast.success('Upvoted!');
    } else {
      toast.error('Could not upvote');
    }
    setVoting(false);
  }

  function openDirections() {
    if (!space) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${space.lat},${space.lng}`;
    window.open(url, '_blank', 'noopener');
  }

  const todayKey = getTodayKey();

  return (
    <AnimatePresence>
      {space && (
        <>
          {/* Backdrop */}
          <motion.div
            key="safe-space-backdrop"
            className="absolute inset-0 z-[200]"
            style={{ backgroundColor: 'var(--bg-overlay)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="safe-space-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Safe space details"
            className="sheet-motion absolute bottom-0 left-1/2 -translate-x-1/2 w-[92%] max-w-[440px] rounded-t-3xl z-[201] overflow-y-auto"
            style={{ backgroundColor: 'var(--bg-secondary)', maxHeight: '85vh' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SPRING_TRANSITION}
          >
            {/* Drag handle */}
            <div className="w-9 h-1 rounded-full mx-auto mt-3" style={{ backgroundColor: 'var(--border)' }} />

            <div className="p-5 pb-10" ref={scrollRef}>
              {/* ── Header ─────────────────────────────────────────────── */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-2xl shrink-0">{TYPE_EMOJI[space.type]}</span>
                  <div className="min-w-0">
                    <h2 className="text-lg font-black leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
                      {space.name}
                    </h2>
                    {space.is_partner && space.partner_tier && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <ShieldCheck
                          size={13}
                          style={{ color: space.partner_tier === 'premium' ? '#d97706' : '#3b82f6' }}
                        />
                        <span
                          className="text-[0.6rem] font-black uppercase tracking-wider"
                          style={{ color: space.partner_tier === 'premium' ? '#d97706' : '#3b82f6' }}
                        >
                          {space.partner_tier === 'premium' ? 'Premium Partner' : 'Partner'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full shrink-0 transition hover:opacity-70"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>

              {/* ── Type pill + verified ────────────────────────────────── */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                  style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                >
                  {TYPE_EMOJI[space.type]} {t(space.type)}
                </span>
                {space.verified && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                    style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}
                  >
                    Verified
                  </span>
                )}
                {space.source === 'user' && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                    style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.3)' }}
                  >
                    Community
                  </span>
                )}
              </div>

              {/* ── Address ─────────────────────────────────────────────── */}
              {space.address && (
                <div className="flex items-start gap-2.5 mb-3">
                  <MapPin size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {space.address}
                  </p>
                </div>
              )}

              {/* ── Opening hours ───────────────────────────────────────── */}
              {space.opening_hours && Object.keys(space.opening_hours).length > 0 && (() => {
                const nh = normalizeHoursKeys(space.opening_hours);
                const todayVal = nh[todayKey];
                return (
                  <div className="mb-3">
                    <button
                      onClick={() => setHoursExpanded((v) => !v)}
                      className="flex items-center gap-2.5 w-full text-left"
                    >
                      <Clock size={14} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                          {todayVal !== undefined
                            ? `Today: ${formatDayHours(todayVal)}`
                            : 'Opening hours'}
                        </span>
                      </div>
                      {hoursExpanded
                        ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} />
                        : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
                    </button>

                    {hoursExpanded && (
                      <div
                        className="mt-2 ml-6 rounded-xl p-3 space-y-1.5"
                        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                      >
                        {DAY_KEYS.map((day) => (
                          <div
                            key={day}
                            className="flex items-center justify-between text-xs"
                            style={{ color: day === todayKey ? 'var(--text-primary)' : 'var(--text-muted)' }}
                          >
                            <span className={day === todayKey ? 'font-bold' : 'font-medium'}>
                              {day.charAt(0).toUpperCase() + day.slice(1)}
                            </span>
                            <span className={day === todayKey ? 'font-bold' : ''}>
                              {formatDayHours(nh[day])}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── Phone ───────────────────────────────────────────────── */}
              {space.phone && (
                <div className="flex items-center gap-2.5 mb-3">
                  <Phone size={14} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <a
                    href={`tel:${space.phone}`}
                    className="text-sm font-bold underline"
                    style={{ color: 'var(--accent)' }}
                  >
                    {space.phone}
                  </a>
                </div>
              )}

              {/* ── Contact name (partners only) ────────────────────────── */}
              {space.is_partner && space.contact_name && (
                <div className="flex items-center gap-2.5 mb-3">
                  <User size={14} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Contact: <span style={{ color: 'var(--text-primary)' }} className="font-bold">{space.contact_name}</span>
                  </p>
                </div>
              )}

              {/* ── Description ─────────────────────────────────────────── */}
              {space.description && (
                <p
                  className="text-sm leading-relaxed mb-4"
                  style={{ color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}
                >
                  {space.description}
                </p>
              )}

              {/* ── Photo carousel ──────────────────────────────────────── */}
              {space.photo_urls.length > 0 && (
                <div className="mb-4 -mx-1">
                  <div className="flex gap-2.5 overflow-x-auto px-1 pb-2" style={{ scrollSnapType: 'x mandatory' }}>
                    {space.photo_urls.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`${space.name} photo ${i + 1}`}
                        className="w-52 h-36 object-cover rounded-xl shrink-0"
                        style={{ border: '1px solid var(--border)', scrollSnapAlign: 'start' }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Divider ─────────────────────────────────────────────── */}
              <div className="mb-4" style={{ height: '1px', backgroundColor: 'var(--border)' }} />

              {/* ── Upvote row ──────────────────────────────────────────── */}
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={handleUpvote}
                  disabled={!userId || hasVoted || voting}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50"
                  style={
                    hasVoted
                      ? { backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1.5px solid rgba(16,185,129,0.5)' }
                      : { backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                  }
                >
                  <ThumbsUp size={14} />
                  {upvotes > 0 ? upvotes : ''} {hasVoted ? 'Upvoted' : 'Upvote'}
                </button>

                {/* Website link */}
                {space.website && (
                  <a
                    href={space.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition hover:opacity-70"
                    style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                  >
                    <Globe size={14} />
                    Website
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>

              {/* ── Get Directions ───────────────────────────────────────── */}
              <button
                onClick={openDirections}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm transition hover:opacity-90"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              >
                <Navigation size={15} />
                Get Directions
              </button>

              {/* ── Close ────────────────────────────────────────────────── */}
              <button
                onClick={onClose}
                className="w-full font-bold rounded-xl py-3.5 text-sm transition hover:opacity-80 mt-3"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
