// src/components/SafeSpaceDetailSheet.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Clock, Shield, Star, ThumbsUp, ChevronDown, X,
  Image, Video, Edit, Plus, Navigation, Upload, Play, Loader2,
  Coffee, Heart, MessageCircle, Building2, Pill, Home,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/stores/useTheme';
import { SafeSpace, SafeSpaceMedia, DayHours } from '@/types';
import { T } from '@/lib/tokens';
import { toast } from 'sonner';

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
  if (!val) return 'Ferme';
  if (typeof val === 'string') return val;
  if (val.closed) return 'Ferme';
  return `${val.open ?? '09:00'} - ${val.close ?? '18:00'}`;
}

function isOpenNow(hours: Record<string, string | DayHours> | null): boolean {
  if (!hours) return false;
  const todayKey = getTodayFrench();
  let val: string | DayHours | undefined;
  for (const [k, v] of Object.entries(hours)) {
    if (normalizeDayKey(k) === todayKey) { val = v; break; }
  }
  if (!val) return false;
  if (typeof val === 'object' && val.closed) return false;
  const timeStr = typeof val === 'string' ? val : `${val.open}-${val.close}`;
  const match = timeStr.match(/(\d{1,2}:\d{2})\s*[-\u2013]\s*(\d{1,2}:\d{2})/);
  if (!match) return false;
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return hhmm >= match[1] && hhmm <= match[2];
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "a l'instant";
  if (m < 60) return `il y a ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

const AVATAR_COLORS = ['#3BB4C1', '#7C3AED', '#DC2626', '#16A34A', '#D97706', '#0891B2'];
function avatarColor(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}
function initial(name: string): string {
  return name.charAt(0).toUpperCase();
}

const CATEGORY_ICONS: Record<string, typeof Coffee> = {
  pharmacy: Pill,
  hospital: Building2,
  police: Shield,
  cafe: Coffee,
  shelter: Home,
};

// ─── Types ──────────────────────────────────────────────────────────

type Props = {
  safeSpace: SafeSpace;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (lat: number, lng: number, name: string) => void;
};

const SPRING = { type: 'spring' as const, damping: 30, stiffness: 300 };

// ─── Component ──────────────────────────────────────────────────────

export default function SafeSpaceDetailSheet({ safeSpace, userId, isOpen, onClose, onNavigate }: Props) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const d = isDark;

  // ── State ─────────────────────────────────────────────────────────
  const [mediaItems, setMediaItems] = useState<SafeSpaceMedia[]>([]);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [upvoted, setUpvoted] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(safeSpace.upvotes ?? 0);
  const [showUGCModal, setShowUGCModal] = useState(false);
  const [ugcType, setUgcType] = useState<'photo' | 'video' | 'review'>('photo');
  const [ugcCaption, setUgcCaption] = useState('');
  const [ugcFile, setUgcFile] = useState<File | null>(null);
  const [publishing, setPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Sync when safeSpace changes ───────────────────────────────────
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

  // ── Check initial upvote state ────────────────────────────────────
  useEffect(() => {
    if (!safeSpace?.id || !isOpen || !userId) return;
    const checkVote = async () => {
      const { data } = await supabase
        .from('safe_space_votes')
        .select('id')
        .eq('safe_space_id', safeSpace.id)
        .eq('user_id', userId)
        .maybeSingle();
      setUpvoted(!!data);
    };
    checkVote();
  }, [safeSpace?.id, isOpen, userId]);

  // ── Upvote toggle ─────────────────────────────────────────────────
  const handleUpvote = async () => {
    if (!userId || !safeSpace) return;
    const next = !upvoted;
    setUpvoted(next);
    setUpvoteCount((c) => (next ? c + 1 : c - 1));

    if (next) {
      await supabase.from('safe_space_votes').insert({
        safe_space_id: safeSpace.id,
        user_id: userId,
      });
      await supabase
        .from('safe_spaces')
        .update({ upvotes: upvoteCount + 1 })
        .eq('id', safeSpace.id);
    } else {
      await supabase
        .from('safe_space_votes')
        .delete()
        .eq('safe_space_id', safeSpace.id)
        .eq('user_id', userId);
      await supabase
        .from('safe_spaces')
        .update({ upvotes: Math.max(0, upvoteCount - 1) })
        .eq('id', safeSpace.id);
    }
  };

  // ── Publish UGC ──────────────────────────────────────────────────
  const handlePublish = async () => {
    if (publishing || !safeSpace || !userId) return;
    setPublishing(true);

    let mediaUrl: string | null = null;

    if (ugcFile && ugcType !== 'review') {
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
      toast.error('Publication echouee');
      setPublishing(false);
      return;
    }

    if (newMedia) setMediaItems((p) => [newMedia as unknown as SafeSpaceMedia, ...p]);
    toast.success('Contenu publie');
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

  // ── Computed ──────────────────────────────────────────────────────
  const todayFr = getTodayFrench();
  const open = isOpenNow(safeSpace.opening_hours);
  const isPremium = safeSpace.partner_tier === 'premium';
  const CatIcon = CATEGORY_ICONS[safeSpace.type] ?? MapPin;
  const mediaOnly = mediaItems.filter((m) => m.type !== 'review');
  const reviews = mediaItems.filter((m) => m.type === 'review');
  const safetyScore = Math.min(
    100,
    Math.round((upvoteCount / Math.max(1, mediaItems.length + upvoteCount)) * 100),
  );

  // ── Render ────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <style>{`@keyframes ssPulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

          {/* Backdrop */}
          <motion.div
            key="ss-backdrop"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 199,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
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
              background: d ? T.surfaceElevated : T.surfaceElevatedL,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderTop: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
              borderLeft: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
              borderRight: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
              maxHeight: '72vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={SPRING}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80) onClose();
            }}
          >
            {/* ① Handle */}
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: T.radiusFull,
                background: d ? T.borderStrong : T.borderStrongL,
                margin: '12px auto 0',
                flexShrink: 0,
              }}
            />

            {/* Scrollable body */}
            <div
              style={{
                overflowY: 'auto',
                flex: 1,
                minHeight: 0,
              }}
            >
              {/* ② HEADER */}
              <div
                style={{
                  padding: '14px 18px 12px',
                  borderBottom: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Logo */}
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: T.radiusMd,
                      background: d ? T.surfaceCard : T.surfaceCardL,
                      border: `1px solid ${d ? T.borderDefault : T.borderDefaultL}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <CatIcon size={22} strokeWidth={1.5} color={d ? T.textSecondary : T.textSecondaryL} />
                  </div>

                  {/* Body */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 600,
                        color: d ? T.textPrimary : T.textPrimaryL,
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
                            background: 'rgba(245,195,65,0.10)',
                            border: '1px solid rgba(245,195,65,0.30)',
                            color: T.accentGold,
                          }}
                        >
                          <Star size={9} strokeWidth={1.5} /> Premium Partner
                        </span>
                      )}
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          padding: '2px 8px',
                          borderRadius: 100,
                          fontSize: 10,
                          fontWeight: 700,
                          background: T.semanticSuccessSoft,
                          border: '1px solid rgba(52,211,153,0.25)',
                          color: T.semanticSuccess,
                        }}
                      >
                        <Shield size={9} strokeWidth={1.5} /> Safe Space
                      </span>
                    </div>

                    {/* Tags row */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 100,
                          fontSize: 11,
                          color: d ? T.textSecondary : T.textSecondaryL,
                          background: d ? T.interactiveHover : T.interactiveHoverL,
                          border: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
                        }}
                      >
                        {safeSpace.type.charAt(0).toUpperCase() + safeSpace.type.slice(1)}
                      </span>
                      {safeSpace.verified && (
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 100,
                            fontSize: 11,
                            color: d ? T.textSecondary : T.textSecondaryL,
                            background: d ? T.interactiveHover : T.interactiveHoverL,
                            border: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
                          }}
                        >
                          Verifie
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Close btn */}
                  <button
                    onClick={onClose}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      border: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
                      background: d ? T.interactiveHover : T.interactiveHoverL,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                      padding: 0,
                    }}
                  >
                    <X size={13} strokeWidth={1.5} color={d ? T.textSecondary : T.textSecondaryL} />
                  </button>
                </div>
              </div>

              {/* ③ PHOTO CAROUSEL */}
              {safeSpace.photo_urls && safeSpace.photo_urls.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    overflowX: 'auto',
                    padding: '12px 18px 4px',
                    scrollbarWidth: 'none',
                  }}
                >
                  {safeSpace.photo_urls.slice(0, 5).map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`${safeSpace.name} ${i + 1}`}
                      style={{
                        width: 68,
                        height: 68,
                        objectFit: 'cover',
                        borderRadius: T.radiusMd,
                        flexShrink: 0,
                        border: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
                      }}
                    />
                  ))}
                  {safeSpace.photo_urls.length === 0 && (
                    <div
                      style={{
                        width: 68,
                        height: 68,
                        borderRadius: T.radiusMd,
                        background: d ? T.surfaceCard : T.surfaceCardL,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Image size={20} strokeWidth={1.5} color={d ? T.textTertiary : T.textTertiaryL} />
                    </div>
                  )}
                </div>
              )}

              {/* ④ INFO SECTION */}
              <div
                style={{
                  padding: '12px 18px',
                  borderBottom: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
                }}
              >
                {/* Address */}
                {safeSpace.address && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    <MapPin size={14} strokeWidth={1.5} color={d ? T.textTertiary : T.textTertiaryL} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 13, color: d ? T.textPrimary : T.textPrimaryL, fontWeight: 600, lineHeight: 1.4 }}>
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
                      <Clock size={14} strokeWidth={1.5} color={d ? T.textTertiary : T.textTertiaryL} style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, color: d ? T.textPrimary : T.textPrimaryL, fontWeight: 600 }}>
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
                          background: open ? T.semanticSuccessSoft : 'rgba(239,68,68,0.12)',
                          color: open ? T.semanticSuccess : T.semanticDanger,
                        }}
                      >
                        {open ? 'Ouvert' : 'Ferme'}
                      </span>
                      <motion.div
                        animate={{ rotate: hoursOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown size={12} strokeWidth={1.5} color={d ? T.textTertiary : T.textTertiaryL} />
                      </motion.div>
                    </button>

                    <AnimatePresence initial={false}>
                      {hoursOpen && safeSpace.opening_hours && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div
                            style={{
                              marginTop: 8,
                              background: d ? T.interactiveHover : T.interactiveHoverL,
                              borderRadius: T.radiusMd,
                              padding: '8px 12px',
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
                                    color: isToday ? (d ? T.textPrimary : T.textPrimaryL) : (d ? T.textTertiary : T.textTertiaryL),
                                    fontWeight: isToday ? 600 : 400,
                                    padding: '3px 0',
                                  }}
                                >
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    {day.charAt(0).toUpperCase() + day.slice(1)}
                                    {isToday && (
                                      <span style={{
                                        width: 5, height: 5, borderRadius: '50%',
                                        background: T.semanticSuccess, display: 'inline-block',
                                      }} />
                                    )}
                                  </span>
                                  <span style={{ fontStyle: !val || (typeof val === 'object' && val.closed) ? 'italic' : 'normal' }}>
                                    {formatHours(val)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Certified */}
                {safeSpace.verified && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <Shield size={14} strokeWidth={1.5} color={T.semanticSuccess} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: d ? T.textSecondary : T.textSecondaryL }}>
                      Espace sur certifie &middot; Accueil sans conditions
                    </span>
                  </div>
                )}

                {/* Rating */}
                {(() => {
                  const rating = (safeSpace as Record<string, unknown>).rating as number | undefined;
                  const ratingCount = (safeSpace as Record<string, unknown>).rating_count as number | undefined;
                  if (!rating || rating <= 0) return null;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          size={11}
                          strokeWidth={1.5}
                          color={T.accentGold}
                          fill={n <= Math.round(rating) ? T.accentGold : 'none'}
                        />
                      ))}
                      <span style={{ fontSize: 13, fontWeight: 600, color: d ? T.textPrimary : T.textPrimaryL, marginLeft: 2 }}>
                        {rating.toFixed(1).replace('.', ',')}
                      </span>
                      {ratingCount !== undefined && (
                        <span style={{ fontSize: 11, color: d ? T.textTertiary : T.textTertiaryL }}>
                          ({ratingCount} avis)
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* ⑤ UPVOTE + SAFETY SCORE */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 18px',
                  borderBottom: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
                }}
              >
                {/* Upvote button */}
                <button
                  onClick={handleUpvote}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: T.radiusMd,
                    border: `1.5px solid ${upvoted ? 'rgba(245,195,65,0.28)' : (d ? T.borderDefault : T.borderDefaultL)}`,
                    background: upvoted ? 'rgba(245,195,65,0.08)' : (d ? T.interactiveHover : T.interactiveHoverL),
                    color: upvoted ? T.accentGold : (d ? T.textSecondary : T.textSecondaryL),
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    transition: 'all 150ms',
                    flexShrink: 0,
                  }}
                >
                  <ThumbsUp
                    size={14}
                    strokeWidth={1.5}
                    fill={upvoted ? T.accentGold : 'none'}
                    color={upvoted ? T.accentGold : (d ? T.textSecondary : T.textSecondaryL)}
                  />
                  Utile &middot; {upvoteCount}
                </button>

                {/* Safety score */}
                <div
                  style={{
                    flex: 1,
                    background: 'rgba(52,211,153,0.06)',
                    border: '1px solid rgba(52,211,153,0.12)',
                    borderRadius: T.radiusMd,
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Shield size={12} strokeWidth={1.5} color={T.semanticSuccess} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, height: 4, background: d ? T.borderSubtle : T.borderSubtleL, borderRadius: 2, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${safetyScore}%`,
                        height: '100%',
                        borderRadius: 2,
                        background: `linear-gradient(90deg, ${T.semanticSuccess}, ${T.gradientStart})`,
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: T.semanticSuccess, flexShrink: 0 }}>
                    {safetyScore}%
                  </span>
                </div>
              </div>

              {/* ⑥ UGC SECTION */}
              <div
                style={{
                  padding: '14px 18px',
                  borderBottom: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: d ? T.textTertiary : T.textTertiaryL }}>
                    Contenus communaute
                  </span>
                  <button
                    onClick={() => setShowUGCModal(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 10px',
                      borderRadius: T.radiusMd,
                      fontSize: 11,
                      fontWeight: 600,
                      background: 'rgba(59,180,193,0.08)',
                      border: '1px solid rgba(59,180,193,0.2)',
                      color: T.gradientStart,
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={11} strokeWidth={1.5} /> Ajouter
                  </button>
                </div>

                {/* Skeleton loading */}
                {mediaLoading && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          aspectRatio: '1/1',
                          borderRadius: T.radiusMd,
                          background: d ? T.interactiveHover : T.interactiveHoverL,
                          animation: 'ssPulse 1.5s ease-in-out infinite',
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Media grid (photo/video only) */}
                {!mediaLoading && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                    {mediaOnly.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        style={{
                          position: 'relative',
                          aspectRatio: '1/1',
                          borderRadius: T.radiusMd,
                          overflow: 'hidden',
                          background: d ? T.interactiveHover : T.interactiveHoverL,
                          border: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
                          cursor: 'pointer',
                        }}
                      >
                        {item.media_url ? (
                          <img
                            src={item.media_url}
                            alt={item.caption || ''}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Image size={20} strokeWidth={1.5} color={d ? T.textTertiary : T.textTertiaryL} />
                          </div>
                        )}

                        {/* Type chip */}
                        <span
                          style={{
                            position: 'absolute',
                            top: 4,
                            left: 4,
                            padding: '1px 6px',
                            borderRadius: 6,
                            fontSize: 9,
                            fontWeight: 700,
                            background: item.type === 'photo' ? 'rgba(59,180,193,0.8)' : 'rgba(239,68,68,0.8)',
                            color: '#fff',
                          }}
                        >
                          {item.type === 'photo' ? 'Photo' : 'Video'}
                        </span>

                        {/* Play overlay for video */}
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
                            }}
                          >
                            <Play size={12} strokeWidth={1.5} fill="#fff" color="#fff" />
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
                            background: 'linear-gradient(transparent, rgba(0,0,0,0.5))',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                          }}
                        >
                          <div
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              background: avatarColor(item.profiles?.name ?? 'A'),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 6,
                              fontWeight: 700,
                              color: '#fff',
                              flexShrink: 0,
                            }}
                          >
                            {initial(item.profiles?.name ?? 'A')}
                          </div>
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                        borderRadius: T.radiusMd,
                        border: '1.5px dashed rgba(59,180,193,0.3)',
                        background: 'rgba(59,180,193,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      <Plus size={18} strokeWidth={1.5} color={T.gradientStart} />
                      <span style={{ fontSize: 9, color: T.gradientStart, fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>
                        Publier un contenu
                      </span>
                    </button>
                  </div>
                )}

                {/* Reviews (text posts) */}
                {reviews.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                    {reviews.map((review) => {
                      const color = avatarColor(review.profiles?.name ?? 'A');
                      return (
                        <div
                          key={review.id}
                          style={{
                            background: d ? T.interactiveHover : T.interactiveHoverL,
                            border: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
                            borderRadius: T.radiusMd,
                            padding: '10px 12px',
                          }}
                        >
                          {/* Header */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <div
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                background: color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 11,
                                fontWeight: 700,
                                color: '#fff',
                              }}
                            >
                              {initial(review.profiles?.name ?? 'A')}
                            </div>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: d ? T.textPrimary : T.textPrimaryL }}>
                                {review.profiles?.name ?? 'Anonyme'}
                              </span>
                              <span style={{ fontSize: 10, color: d ? T.textTertiary : T.textTertiaryL, marginLeft: 8 }}>
                                {timeAgo(review.created_at)}
                              </span>
                            </div>
                            {safeSpace.verified && (
                              <span
                                style={{
                                  padding: '1px 6px',
                                  borderRadius: 100,
                                  fontSize: 9,
                                  fontWeight: 700,
                                  background: T.semanticSuccessSoft,
                                  color: T.semanticSuccess,
                                }}
                              >
                                Safe
                              </span>
                            )}
                          </div>
                          {/* Body */}
                          <p style={{ fontSize: 12, color: d ? T.textSecondary : T.textSecondaryL, lineHeight: 1.5, margin: 0 }}>
                            {review.caption}
                          </p>
                          {/* Actions */}
                          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                            <button
                              onClick={() => handleLikeMedia(review.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: 12,
                                color: d ? T.textTertiary : T.textTertiaryL,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: 0,
                              }}
                            >
                              <Heart size={12} strokeWidth={1.5} /> {review.likes_count}
                            </button>
                            <span
                              style={{
                                fontSize: 12,
                                color: d ? T.textTertiary : T.textTertiaryL,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <MessageCircle size={12} strokeWidth={1.5} /> Repondre
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* View all link */}
                {mediaItems.length > 6 && (
                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: T.gradientStart,
                      fontSize: 11,
                      fontWeight: 600,
                      padding: 0,
                      marginTop: 10,
                    }}
                  >
                    Voir les {mediaItems.length} contenus &rarr;
                  </button>
                )}
              </div>

              {/* ⑦ ACTIONS */}
              <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Primary — Navigate */}
                <button
                  onClick={() => onNavigate(safeSpace.lat, safeSpace.lng, safeSpace.name)}
                  style={{
                    width: '100%',
                    padding: 16,
                    borderRadius: 32,
                    background: d ? T.textPrimary : T.textPrimaryL,
                    color: d ? T.textInverse : T.textInverseL,
                    fontWeight: 600,
                    fontSize: 16,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <Navigation size={16} strokeWidth={1.5} />
                  S&apos;y rendre maintenant
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
                      toast.success('Lien copie');
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: 14,
                    borderRadius: 32,
                    background: 'transparent',
                    color: d ? T.textSecondary : T.textSecondaryL,
                    fontWeight: 600,
                    fontSize: 14,
                    border: `1px solid ${d ? T.borderDefault : T.borderDefaultL}`,
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  Partager ce lieu
                </button>
              </div>
            </div>
          </motion.div>

          {/* ═══ UGC PUBLISH MODAL ═════════════════════════════════════ */}
          <AnimatePresence>
            {showUGCModal && (
              <motion.div
                key="ugc-overlay"
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 250,
                  background: 'rgba(0,0,0,0.6)',
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
                    background: d ? T.surfaceElevated : T.surfaceElevatedL,
                    borderTopLeftRadius: T.radiusXl,
                    borderTopRightRadius: T.radiusXl,
                    borderTop: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
                    padding: '16px 20px 32px',
                    maxHeight: '75vh',
                    overflowY: 'auto',
                  }}
                  initial={{ y: '100%', opacity: 0, scale: 0.96 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: '100%', opacity: 0, scale: 0.96 }}
                  transition={SPRING}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Handle */}
                  <div
                    style={{
                      width: 36,
                      height: 4,
                      borderRadius: T.radiusFull,
                      background: d ? T.borderStrong : T.borderStrongL,
                      margin: '0 auto 16px',
                    }}
                  />

                  {/* Title + Close */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: d ? T.textPrimary : T.textPrimaryL }}>
                        Ajouter un contenu
                      </div>
                      <div style={{ fontSize: 13, color: d ? T.textSecondary : T.textSecondaryL, marginTop: 4 }}>
                        Partage ton experience a {safeSpace.name}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowUGCModal(false)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        border: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
                        background: d ? T.interactiveHover : T.interactiveHoverL,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                        padding: 0,
                      }}
                    >
                      <X size={13} strokeWidth={1.5} color={d ? T.textSecondary : T.textSecondaryL} />
                    </button>
                  </div>

                  {/* Type selector */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                    {([
                      { key: 'photo' as const, Icon: Image, label: 'Photo' },
                      { key: 'video' as const, Icon: Video, label: 'Video' },
                      { key: 'review' as const, Icon: Edit, label: 'Avis' },
                    ]).map((opt) => {
                      const sel = ugcType === opt.key;
                      return (
                        <button
                          key={opt.key}
                          onClick={() => setUgcType(opt.key)}
                          style={{
                            padding: '14px 8px',
                            borderRadius: T.radiusMd,
                            border: sel
                              ? '1.5px solid rgba(59,180,193,0.4)'
                              : `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
                            background: sel
                              ? 'rgba(59,180,193,0.08)'
                              : (d ? T.interactiveHover : T.interactiveHoverL),
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <opt.Icon
                            size={22}
                            strokeWidth={1.5}
                            color={sel ? T.gradientStart : (d ? T.textSecondary : T.textSecondaryL)}
                          />
                          <span style={{ fontSize: 11, fontWeight: 600, color: sel ? T.gradientStart : (d ? T.textSecondary : T.textSecondaryL) }}>
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* File picker */}
                  {ugcType !== 'review' && (
                    <div style={{ marginBottom: 12 }}>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          width: '100%',
                          padding: 20,
                          borderRadius: T.radiusMd,
                          border: `2px dashed ${d ? T.borderDefault : T.borderDefaultL}`,
                          background: 'transparent',
                          color: T.gradientStart,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Upload size={20} strokeWidth={1.5} color={T.gradientStart} />
                        {ugcFile ? (
                          <span>{ugcFile.name} ({(ugcFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                        ) : (
                          <span>Choisir un fichier</span>
                        )}
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept={ugcType === 'photo' ? 'image/*' : 'video/*'}
                        style={{ display: 'none' }}
                        onChange={(e) => setUgcFile(e.target.files?.[0] ?? null)}
                      />
                    </div>
                  )}

                  {/* Caption textarea */}
                  <textarea
                    placeholder="Decris ton experience pour la communaute..."
                    value={ugcCaption}
                    onChange={(e) => setUgcCaption(e.target.value)}
                    maxLength={280}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: 12,
                      borderRadius: T.radiusMd,
                      border: `1px solid ${d ? T.borderDefault : T.borderDefaultL}`,
                      background: d ? T.surfaceCard : T.surfaceCardL,
                      color: d ? T.textPrimary : T.textPrimaryL,
                      fontSize: 13,
                      resize: 'none',
                      outline: 'none',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      lineHeight: 1.5,
                    }}
                  />

                  {/* Publish button */}
                  <button
                    disabled={publishing || (ugcType !== 'review' && !ugcFile)}
                    onClick={handlePublish}
                    style={{
                      width: '100%',
                      padding: 16,
                      borderRadius: 32,
                      background: publishing || (ugcType !== 'review' && !ugcFile)
                        ? (d ? T.interactiveHover : T.interactiveHoverL)
                        : (d ? T.textPrimary : T.textPrimaryL),
                      color: publishing || (ugcType !== 'review' && !ugcFile)
                        ? (d ? T.textTertiary : T.textTertiaryL)
                        : (d ? T.textInverse : T.textInverseL),
                      fontWeight: 600,
                      fontSize: 15,
                      border: 'none',
                      cursor: publishing ? 'wait' : 'pointer',
                      marginTop: 16,
                      opacity: publishing ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    {publishing ? (
                      <>
                        <Loader2 size={16} strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} />
                        Publication...
                      </>
                    ) : (
                      'Publier'
                    )}
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
