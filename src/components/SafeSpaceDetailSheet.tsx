// src/components/SafeSpaceDetailSheet.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/stores/useTheme';
import { SafeSpace, SafeSpaceMedia, DayHours } from '@/types';
import { toast } from 'sonner';

// ─── Theme helpers ─────────────────────────────────────────────────

function getColors(isDark: boolean) {
  return isDark
    ? {
        sheetBg: '#1A2540',
        surface: 'rgba(255,255,255,0.05)',
        surfaceBorder: 'rgba(255,255,255,0.08)',
        textPrimary: '#fff',
        textSecondary: '#94A3B8',
        textTertiary: '#64748B',
        borderSubtle: 'rgba(255,255,255,0.08)',
        shadow: '0 -8px 32px rgba(0,0,0,0.4)',
        tagBg: 'rgba(255,255,255,0.05)',
        tagBorder: 'rgba(255,255,255,0.08)',
        inputBg: 'rgba(255,255,255,0.06)',
        reviewBg: 'rgba(255,255,255,0.03)',
        upvoteActive: { bg: 'rgba(245,195,65,0.1)', border: 'rgba(245,195,65,0.3)', color: '#F5C341' },
        scoreGradient: 'linear-gradient(90deg,#34D399,#3BB4C1)',
        ghostBg: 'rgba(255,255,255,0.06)',
        ghostBorder: 'rgba(255,255,255,0.1)',
        ghostColor: '#94A3B8',
        backdrop: 'rgba(0,0,0,0.7)',
      }
    : {
        sheetBg: '#FFFFFF',
        surface: 'rgba(15,23,42,0.05)',
        surfaceBorder: 'rgba(15,23,42,0.08)',
        textPrimary: '#0F172A',
        textSecondary: '#475569',
        textTertiary: '#94A3B8',
        borderSubtle: 'rgba(15,23,42,0.06)',
        shadow: '0 -8px 32px rgba(0,0,0,0.08)',
        tagBg: 'rgba(15,23,42,0.05)',
        tagBorder: 'rgba(15,23,42,0.08)',
        inputBg: 'rgba(15,23,42,0.04)',
        reviewBg: 'rgba(15,23,42,0.03)',
        upvoteActive: { bg: 'rgba(212,160,23,0.1)', border: 'rgba(212,160,23,0.3)', color: '#D4A017' },
        scoreGradient: 'linear-gradient(90deg,#16A34A,#2A9DAA)',
        ghostBg: 'rgba(15,23,42,0.04)',
        ghostBorder: 'rgba(15,23,42,0.08)',
        ghostColor: '#475569',
        backdrop: 'rgba(0,0,0,0.5)',
      };
}

// ─── Helpers ────────────────────────────────────────────────────────

const DAY_ORDER = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const DAY_MAP_EN: Record<string, string> = {
  monday: 'lundi', tuesday: 'mardi', wednesday: 'mercredi',
  thursday: 'jeudi', friday: 'vendredi', saturday: 'samedi', sunday: 'dimanche',
};

function normalizeDayKey(key: string): string {
  return DAY_MAP_EN[key.toLowerCase()] ?? key.toLowerCase();
}

function getTodayFrench(): string {
  const d = new Date().getDay();
  return DAY_ORDER[d === 0 ? 6 : d - 1];
}

function formatHours(val: string | DayHours | undefined): string {
  if (!val) return 'Fermé';
  if (typeof val === 'string') return val;
  if (val.closed) return 'Fermé';
  return `${val.open ?? '09:00'} – ${val.close ?? '18:00'}`;
}

function isOpenNow(hours: Record<string, string | DayHours> | null): boolean {
  if (!hours) return false;
  const todayKey = getTodayFrench();
  // Try both French and English keys
  let val: string | DayHours | undefined;
  for (const [k, v] of Object.entries(hours)) {
    if (normalizeDayKey(k) === todayKey) { val = v; break; }
  }
  if (!val) return false;
  if (typeof val === 'object' && val.closed) return false;
  const timeStr = typeof val === 'string' ? val : `${val.open}-${val.close}`;
  const match = timeStr.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
  if (!match) return false;
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return hhmm >= match[1] && hhmm <= match[2];
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

// ─── Types ──────────────────────────────────────────────────────────

type Props = {
  safeSpace: SafeSpace;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
};

const SPRING = { type: 'spring' as const, damping: 30, stiffness: 300 };

// ─── Component ──────────────────────────────────────────────────────

export default function SafeSpaceDetailSheet({ safeSpace, userId, isOpen, onClose }: Props) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);

  // ── State ─────────────────────────────────────────────────────────
  const [mediaItems, setMediaItems] = useState<SafeSpaceMedia[]>([]);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [upvoted, setUpvoted] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(safeSpace.upvotes ?? 0);
  const [showUGCModal, setShowUGCModal] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [ugcType, setUgcType] = useState<'photo' | 'video' | 'review'>('photo');
  const [ugcCaption, setUgcCaption] = useState('');
  const [ugcFile, setUgcFile] = useState<File | null>(null);
  const [publishing, setPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Sync upvoteCount when safeSpace changes ──────────────────────
  useEffect(() => {
    setUpvoteCount(safeSpace.upvotes ?? 0);
    setUpvoted(false);
    setHoursOpen(false);
  }, [safeSpace.id]);

  // ── Fetch UGC media ──────────────────────────────────────────────
  useEffect(() => {
    if (!safeSpace?.id || !isOpen) return;
    const load = async () => {
      setMediaLoading(true);
      const { data } = await supabase
        .from('safe_space_media')
        .select(`
          id, type, media_url, caption,
          likes_count, created_at,
          profiles:user_id (name, avatar_url)
        `)
        .eq('safe_space_id', safeSpace.id)
        .order('created_at', { ascending: false })
        .limit(12);
      setMediaItems((data as unknown as SafeSpaceMedia[]) ?? []);
      setMediaLoading(false);
    };
    load();
  }, [safeSpace?.id, isOpen]);

  // ── Upvote ───────────────────────────────────────────────────────
  const handleUpvote = async () => {
    const next = !upvoted;
    setUpvoted(next);
    setUpvoteCount((c) => (next ? c + 1 : c - 1));
    await supabase
      .from('safe_spaces')
      .update({ upvotes: upvoteCount + (next ? 1 : -1) })
      .eq('id', safeSpace.id);
  };

  // ── Publish UGC ──────────────────────────────────────────────────
  const handlePublish = async () => {
    if (publishing) return;
    setPublishing(true);

    let mediaUrl: string | null = null;

    if (ugcFile) {
      const ext = ugcFile.name.split('.').pop();
      const path = `safe-space-media/${safeSpace.id}/${userId}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('safe-space-uploads')
        .upload(path, ugcFile, { upsert: false });

      if (uploadError) {
        toast.error("Erreur lors de l'upload");
        setPublishing(false);
        return;
      }
      const { data: urlData } = supabase.storage
        .from('safe-space-uploads')
        .getPublicUrl(path);
      mediaUrl = urlData.publicUrl;
    }

    const { data: newMedia, error } = await supabase
      .from('safe_space_media')
      .insert({
        safe_space_id: safeSpace.id,
        user_id: userId,
        type: ugcType,
        media_url: mediaUrl,
        caption: ugcCaption.trim() || null,
        likes_count: 0,
      })
      .select(`
        id, type, media_url, caption, likes_count, created_at,
        profiles:user_id (name, avatar_url)
      `)
      .single();

    if (error) {
      toast.error('Impossible de publier');
      setPublishing(false);
      return;
    }

    if (newMedia) setMediaItems((p) => [newMedia as unknown as SafeSpaceMedia, ...p]);
    toast.success('Contenu publié ✓');
    setUgcCaption('');
    setUgcFile(null);
    setUgcType('photo');
    setShowUGCModal(false);
    setPublishing(false);
  };

  // ── Like a media item ────────────────────────────────────────────
  const handleLikeMedia = async (mediaId: string) => {
    setMediaItems((prev) =>
      prev.map((m) =>
        m.id === mediaId ? { ...m, likes_count: m.likes_count + 1 } : m,
      ),
    );
    await supabase.from('safe_space_media').update({
      likes_count: (mediaItems.find((m) => m.id === mediaId)?.likes_count ?? 0) + 1,
    }).eq('id', mediaId);
  };

  // ── Computed values ──────────────────────────────────────────────
  const todayFr = getTodayFrench();
  const open = isOpenNow(safeSpace.opening_hours);
  const safetyScore = (safeSpace as Record<string, unknown>).safety_score as number | undefined ?? 88;
  const rating = (safeSpace as Record<string, unknown>).rating as number | undefined;
  const ratingCount = (safeSpace as Record<string, unknown>).rating_count as number | undefined;
  const isVerified = safeSpace.verified;
  const isPremium = safeSpace.partner_tier === 'premium';
  const isSafeSpace = true; // it's always a safe space in this sheet
  const lastReview = mediaItems.find((m) => m.type === 'review');

  // ── Render ───────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="ss-backdrop"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 199,
              background: C.backdrop,
              backdropFilter: 'blur(2px)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="ss-sheet"
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 200,
              background: C.sheetBg,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderTop: `1px solid ${C.borderSubtle}`,
              boxShadow: C.shadow,
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SPRING}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80) onClose();
            }}
          >
            {/* Handle bar */}
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: C.borderSubtle,
                margin: '12px auto 0',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            />

            {/* Scrollable body */}
            <div
              style={{
                overflowY: 'auto',
                padding: '16px 20px 32px',
                flex: 1,
                minHeight: 0,
              }}
            >
              {/* ═══ HEADER ═══════════════════════════════════════════ */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
                {/* Logo */}
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 13,
                    background: 'linear-gradient(135deg,#2A3A5E,#1E3A5F)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    flexShrink: 0,
                  }}
                >
                  {safeSpace.type === 'pharmacy' ? '💊' :
                   safeSpace.type === 'hospital' ? '🏥' :
                   safeSpace.type === 'police' ? '👮' :
                   safeSpace.type === 'cafe' ? '☕' : '🏠'}
                </div>

                {/* Name + badges */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "'DM Serif Display', serif",
                      fontSize: 19,
                      color: C.textPrimary,
                      lineHeight: 1.2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {safeSpace.name}
                  </div>

                  {/* Badges row */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {isPremium && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          padding: '2px 8px',
                          borderRadius: 100,
                          fontSize: 10,
                          fontWeight: 700,
                          background: 'rgba(245,195,65,0.12)',
                          color: '#F5C341',
                          border: '1px solid rgba(245,195,65,0.25)',
                        }}
                      >
                        ✦ Premium Partner
                      </span>
                    )}
                    {isVerified && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          padding: '2px 8px',
                          borderRadius: 100,
                          fontSize: 10,
                          fontWeight: 700,
                          background: 'rgba(59,180,193,0.12)',
                          color: '#3BB4C1',
                          border: '1px solid rgba(59,180,193,0.25)',
                        }}
                      >
                        ✓ Vérifié
                      </span>
                    )}
                    {isSafeSpace && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          padding: '2px 8px',
                          borderRadius: 100,
                          fontSize: 10,
                          fontWeight: 700,
                          background: 'rgba(52,211,153,0.12)',
                          color: '#34D399',
                          border: '1px solid rgba(52,211,153,0.25)',
                        }}
                      >
                        🛡️ Safe Space
                      </span>
                    )}
                  </div>
                </div>

                {/* Close btn */}
                <button
                  onClick={onClose}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    border: `1px solid ${C.borderSubtle}`,
                    background: C.surface,
                    color: C.textTertiary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: 14,
                    flexShrink: 0,
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Tags row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: 100,
                    fontSize: 11,
                    fontWeight: 600,
                    background: C.tagBg,
                    border: `1px solid ${C.tagBorder}`,
                    color: C.textSecondary,
                  }}
                >
                  {safeSpace.type.charAt(0).toUpperCase() + safeSpace.type.slice(1)}
                </span>
                {isVerified && (
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 100,
                      fontSize: 11,
                      fontWeight: 600,
                      background: C.tagBg,
                      border: `1px solid ${C.tagBorder}`,
                      color: C.textSecondary,
                    }}
                  >
                    ✓ Vérifié
                  </span>
                )}
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: 100,
                    fontSize: 11,
                    fontWeight: 600,
                    background: C.tagBg,
                    border: `1px solid ${C.tagBorder}`,
                    color: C.textSecondary,
                  }}
                >
                  👥 Communauté
                </span>
              </div>

              {/* ═══ PHOTOS CAROUSEL ══════════════════════════════════ */}
              {safeSpace.photo_urls && safeSpace.photo_urls.length > 0 && (
                <div style={{ marginBottom: 16, marginLeft: -20, marginRight: -20 }}>
                  <div
                    style={{
                      display: 'flex',
                      gap: 10,
                      overflowX: 'auto',
                      paddingLeft: 20,
                      paddingRight: 20,
                      paddingBottom: 4,
                      scrollSnapType: 'x mandatory',
                    }}
                  >
                    {safeSpace.photo_urls.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`${safeSpace.name} ${i + 1}`}
                        style={{
                          width: 200,
                          height: 140,
                          objectFit: 'cover',
                          borderRadius: 14,
                          flexShrink: 0,
                          border: `1px solid ${C.borderSubtle}`,
                          scrollSnapAlign: 'start',
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ═══ INFO ═════════════════════════════════════════════ */}
              <div style={{ marginBottom: 16 }}>
                {/* Address */}
                {safeSpace.address && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>📍</span>
                    <span style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5 }}>
                      {safeSpace.address}
                    </span>
                  </div>
                )}

                {/* Opening hours */}
                {safeSpace.opening_hours && Object.keys(safeSpace.opening_hours).length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <button
                      onClick={() => setHoursOpen((v) => !v)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: 14, flexShrink: 0 }}>🕐</span>
                      <span style={{ flex: 1, fontSize: 13, color: C.textPrimary, fontWeight: 600 }}>
                        {(() => {
                          const hrs = safeSpace.opening_hours!;
                          let todayVal: string | DayHours | undefined;
                          for (const [k, v] of Object.entries(hrs)) {
                            if (normalizeDayKey(k) === todayFr) { todayVal = v; break; }
                          }
                          return todayVal ? `Aujourd'hui ${formatHours(todayVal)}` : 'Horaires';
                        })()}
                      </span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 100,
                          fontSize: 10,
                          fontWeight: 700,
                          background: open ? 'rgba(52,211,153,0.12)' : 'rgba(239,68,68,0.12)',
                          color: open ? '#34D399' : '#EF4444',
                        }}
                      >
                        {open ? 'Ouvert' : 'Fermé'}
                      </span>
                      <span style={{ fontSize: 12, color: C.textTertiary }}>
                        {hoursOpen ? '▴' : '▾'}
                      </span>
                    </button>

                    {hoursOpen && safeSpace.opening_hours && (
                      <div
                        style={{
                          marginTop: 8,
                          marginLeft: 24,
                          background: C.surface,
                          border: `1px solid ${C.surfaceBorder}`,
                          borderRadius: 12,
                          padding: 12,
                        }}
                      >
                        {DAY_ORDER.map((day) => {
                          const hrs = safeSpace.opening_hours!;
                          let val: string | DayHours | undefined;
                          for (const [k, v] of Object.entries(hrs)) {
                            if (normalizeDayKey(k) === day) { val = v; break; }
                          }
                          const isToday = day === todayFr;
                          return (
                            <div
                              key={day}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: 12,
                                color: isToday ? C.textPrimary : C.textTertiary,
                                fontWeight: isToday ? 700 : 400,
                                padding: '3px 0',
                              }}
                            >
                              <span>{day.charAt(0).toUpperCase() + day.slice(1)}</span>
                              <span>{formatHours(val)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Verified certification */}
                {isVerified && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>✅</span>
                    <span style={{ fontSize: 13, color: C.textSecondary }}>
                      Lieu certifié Safe Space
                    </span>
                  </div>
                )}

                {/* Rating */}
                {rating !== undefined && rating > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>⭐</span>
                    <span style={{ fontSize: 13, color: C.textPrimary, fontWeight: 600 }}>
                      {'★'.repeat(Math.round(rating))}
                      {'☆'.repeat(5 - Math.round(rating))}
                    </span>
                    {ratingCount !== undefined && (
                      <span style={{ fontSize: 11, color: C.textTertiary }}>
                        ({ratingCount} avis)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* ═══ UPVOTE + SAFETY SCORE ════════════════════════════ */}
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.surfaceBorder}`,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                {/* Upvote button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <button
                    onClick={handleUpvote}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 16px',
                      borderRadius: 12,
                      border: `1.5px solid ${upvoted ? C.upvoteActive.border : C.surfaceBorder}`,
                      background: upvoted ? C.upvoteActive.bg : 'transparent',
                      color: upvoted ? C.upvoteActive.color : C.textSecondary,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                      transition: 'all 0.2s',
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{upvoted ? '👍' : '👆'}</span>
                    {upvoteCount} Upvote{upvoteCount !== 1 ? 's' : ''}
                  </button>
                  <span style={{ fontSize: 12, color: C.textTertiary }}>
                    Ce lieu est-il sûr ?
                  </span>
                </div>

                {/* Safety score bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary }}>
                      Score de sécurité
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary }}>
                      {safetyScore}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 3,
                      background: C.surface,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${safetyScore}%`,
                        height: '100%',
                        borderRadius: 3,
                        background: C.scoreGradient,
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* ═══ UGC — COMMUNITY CONTENT ══════════════════════════ */}
              <div style={{ marginBottom: 16 }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>📸</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary }}>
                      Contenus de la communauté
                    </span>
                    {mediaItems.length > 0 && (
                      <span
                        style={{
                          padding: '1px 7px',
                          borderRadius: 100,
                          fontSize: 10,
                          fontWeight: 700,
                          background: 'rgba(59,180,193,0.12)',
                          color: '#3BB4C1',
                        }}
                      >
                        {mediaItems.length}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowUGCModal(true)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 100,
                      fontSize: 12,
                      fontWeight: 600,
                      background: 'rgba(59,180,193,0.12)',
                      color: '#3BB4C1',
                      border: '1px solid rgba(59,180,193,0.2)',
                      cursor: 'pointer',
                    }}
                  >
                    + Ajouter
                  </button>
                </div>

                {/* Grid */}
                {!mediaLoading && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: 8,
                      marginBottom: 12,
                    }}
                  >
                    {mediaItems.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        style={{
                          position: 'relative',
                          aspectRatio: '1/1',
                          borderRadius: 12,
                          overflow: 'hidden',
                          background: C.surface,
                          border: `1px solid ${C.surfaceBorder}`,
                        }}
                      >
                        {item.media_url ? (
                          <img
                            src={item.media_url}
                            alt={item.caption || ''}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 24,
                            }}
                          >
                            {item.type === 'review' ? '✍️' : item.type === 'video' ? '🎥' : '📷'}
                          </div>
                        )}

                        {/* Type badge */}
                        {item.type !== 'review' && (
                          <span
                            style={{
                              position: 'absolute',
                              top: 6,
                              left: 6,
                              padding: '1px 6px',
                              borderRadius: 6,
                              fontSize: 9,
                              fontWeight: 700,
                              background: item.type === 'photo' ? 'rgba(59,180,193,0.85)' : 'rgba(239,68,68,0.85)',
                              color: '#fff',
                            }}
                          >
                            {item.type === 'photo' ? 'Photo' : 'Vidéo'}
                          </span>
                        )}

                        {/* Play icon for videos */}
                        {item.type === 'video' && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%,-50%)',
                              width: 28,
                              height: 28,
                              background: 'rgba(0,0,0,0.5)',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              color: '#fff',
                            }}
                          >
                            ▶
                          </div>
                        )}

                        {/* Author overlay */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            padding: '16px 6px 4px',
                            background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <div
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                              background: '#3BB4C1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 7,
                              fontWeight: 700,
                              color: '#fff',
                              flexShrink: 0,
                            }}
                          >
                            {item.profiles?.name?.charAt(0)?.toUpperCase() ?? '?'}
                          </div>
                          <span
                            style={{
                              fontSize: 9,
                              color: '#fff',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.profiles?.name ?? 'Anonyme'}
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Add cell */}
                    <button
                      onClick={() => setShowUGCModal(true)}
                      style={{
                        aspectRatio: '1/1',
                        borderRadius: 12,
                        border: '1.5px dashed rgba(59,180,193,0.3)',
                        background: 'rgba(59,180,193,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontSize: 20, color: '#3BB4C1' }}>+</span>
                      <span style={{ fontSize: 9, color: '#3BB4C1', fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>
                        Publier un contenu
                      </span>
                    </button>
                  </div>
                )}

                {mediaLoading && (
                  <div style={{ textAlign: 'center', padding: 20, color: C.textTertiary, fontSize: 12 }}>
                    Chargement…
                  </div>
                )}

                {/* Last review post */}
                {lastReview && (
                  <div
                    style={{
                      background: C.reviewBg,
                      border: `1px solid ${C.surfaceBorder}`,
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: '#3BB4C1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#fff',
                        }}
                      >
                        {lastReview.profiles?.name?.charAt(0)?.toUpperCase() ?? '?'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.textPrimary }}>
                          {lastReview.profiles?.name ?? 'Anonyme'}
                        </span>
                        <span style={{ fontSize: 10, color: C.textTertiary, marginLeft: 8 }}>
                          {timeAgo(lastReview.created_at)}
                        </span>
                      </div>
                      <span
                        style={{
                          padding: '1px 6px',
                          borderRadius: 100,
                          fontSize: 9,
                          fontWeight: 700,
                          background: 'rgba(52,211,153,0.12)',
                          color: '#34D399',
                        }}
                      >
                        Safe ✓
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5, margin: 0 }}>
                      {lastReview.caption}
                    </p>
                    <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                      <button
                        onClick={() => handleLikeMedia(lastReview.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 12,
                          color: C.textTertiary,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: 0,
                        }}
                      >
                        ❤️ {lastReview.likes_count}
                      </button>
                      <span style={{ fontSize: 12, color: C.textTertiary }}>💬</span>
                      <span style={{ fontSize: 12, color: C.textTertiary }}>↩ Répondre</span>
                    </div>
                  </div>
                )}

                {/* View all link */}
                {mediaItems.length > 0 && (
                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#3BB4C1',
                      fontSize: 12,
                      fontWeight: 600,
                      padding: 0,
                    }}
                  >
                    Voir les {mediaItems.length} contenus →
                  </button>
                )}
              </div>

              {/* ═══ ACTIONS ══════════════════════════════════════════ */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Primary — Navigate */}
                <button
                  onClick={() => {
                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${safeSpace.lat},${safeSpace.lng}`,
                      '_blank',
                    );
                  }}
                  style={{
                    width: '100%',
                    padding: '14px 0',
                    borderRadius: 100,
                    background: 'linear-gradient(90deg,#F5C341,#E8A800)',
                    color: '#0A0F1E',
                    fontWeight: 600,
                    fontSize: 15,
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  ✦ S&apos;y rendre maintenant
                </button>

                {/* Secondary — Share */}
                <button
                  onClick={async () => {
                    if (navigator.share) {
                      try {
                        await navigator.share({ title: safeSpace.name, url: window.location.href });
                      } catch { /* cancelled */ }
                    } else {
                      await navigator.clipboard.writeText(window.location.href);
                      toast.success('Lien copié ✓');
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '13px 0',
                    borderRadius: 100,
                    background: C.ghostBg,
                    color: C.ghostColor,
                    fontWeight: 600,
                    fontSize: 14,
                    border: `1px solid ${C.ghostBorder}`,
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  Partager ce lieu
                </button>
              </div>
            </div>
          </motion.div>

          {/* ═══ UGC MODAL ════════════════════════════════════════════ */}
          <AnimatePresence>
            {showUGCModal && (
              <motion.div
                key="ugc-modal"
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 250,
                  background: 'rgba(0,0,0,0.7)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowUGCModal(false)}
              >
                <motion.div
                  style={{
                    background: C.sheetBg,
                    borderTopLeftRadius: 28,
                    borderTopRightRadius: 28,
                    padding: '16px 20px 32px',
                    maxHeight: '75vh',
                    overflowY: 'auto',
                  }}
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={SPRING}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Handle */}
                  <div
                    style={{
                      width: 36,
                      height: 4,
                      borderRadius: 2,
                      background: C.borderSubtle,
                      margin: '0 auto 16px',
                    }}
                  />

                  {/* Title */}
                  <div style={{ marginBottom: 4 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: C.textPrimary }}>
                      Ajouter un contenu
                    </div>
                    <div style={{ fontSize: 13, color: C.textTertiary, marginTop: 4 }}>
                      Partage ton expérience à {safeSpace.name}
                    </div>
                  </div>

                  {/* Type selector */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: 8,
                      margin: '16px 0',
                    }}
                  >
                    {([
                      { key: 'photo' as const, emoji: '📷', label: 'Photo' },
                      { key: 'video' as const, emoji: '🎥', label: 'Vidéo' },
                      { key: 'review' as const, emoji: '✍️', label: 'Avis' },
                    ]).map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => setUgcType(opt.key)}
                        style={{
                          padding: '12px 0',
                          borderRadius: 12,
                          border: ugcType === opt.key
                            ? '1.5px solid #3BB4C1'
                            : `1px solid ${C.surfaceBorder}`,
                          background: ugcType === opt.key
                            ? 'rgba(59,180,193,0.1)'
                            : 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <span style={{ fontSize: 20 }}>{opt.emoji}</span>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: ugcType === opt.key ? '#3BB4C1' : C.textSecondary,
                          }}
                        >
                          {opt.label}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* File picker (photo/video) */}
                  {ugcType !== 'review' && (
                    <div style={{ marginBottom: 12 }}>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          width: '100%',
                          padding: '12px 0',
                          borderRadius: 12,
                          border: `1.5px dashed rgba(59,180,193,0.3)`,
                          background: 'rgba(59,180,193,0.04)',
                          color: '#3BB4C1',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {ugcFile ? ugcFile.name : 'Choisir un fichier'}
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*,video/*"
                        style={{ display: 'none' }}
                        onChange={(e) => setUgcFile(e.target.files?.[0] ?? null)}
                      />
                    </div>
                  )}

                  {/* Caption textarea */}
                  <textarea
                    placeholder="Ajoute une description ou un conseil…"
                    value={ugcCaption}
                    onChange={(e) => setUgcCaption(e.target.value)}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: 12,
                      borderRadius: 12,
                      border: `1px solid ${C.surfaceBorder}`,
                      background: C.inputBg,
                      color: C.textPrimary,
                      fontSize: 13,
                      resize: 'none',
                      outline: 'none',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />

                  {/* Publish button */}
                  <button
                    disabled={publishing || (ugcType !== 'review' && !ugcFile && !ugcCaption)}
                    onClick={handlePublish}
                    style={{
                      width: '100%',
                      padding: '14px 0',
                      borderRadius: 100,
                      background: publishing || (ugcType !== 'review' && !ugcFile && !ugcCaption)
                        ? C.surface
                        : 'linear-gradient(90deg,#F5C341,#E8A800)',
                      color: publishing || (ugcType !== 'review' && !ugcFile && !ugcCaption)
                        ? C.textTertiary
                        : '#0A0F1E',
                      fontWeight: 600,
                      fontSize: 15,
                      border: 'none',
                      cursor: publishing ? 'wait' : 'pointer',
                      marginTop: 16,
                      opacity: publishing ? 0.6 : 1,
                    }}
                  >
                    {publishing ? 'Publication…' : 'Publier →'}
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
