// src/components/MyKovaView.tsx — Unified "My Brume" hub (Feed + Favorites + Stats + Profile)

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rss, Star, BarChart2, ChevronRight, ChevronDown, ChevronUp,
  Navigation, Trash2, Pencil, Check, X, Radio,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import {
  Pin, AppNotification, PlaceNote, SavedRoute, TripLog, LiveSession,
  CATEGORIES, SEVERITY,
} from '@/types';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import VerificationView from '@/components/VerificationView';
import TrustedCircleCard from '@/components/TrustedCircleCard';
import CommunityView from '@/components/CommunityView';
import { computeExpertiseTags } from '@/lib/expertise';
import { Level, LEVELS, getLevel, computeScore } from '@/lib/levels';
import LocationHistoryViewer from '@/components/LocationHistoryViewer';
import ChallengesSection from '@/components/ChallengesSection';
import ReferralSection from '@/components/ReferralSection';
import TrendSparkline from '@/components/TrendSparkline';
import { timeAgoLong as timeAgo, springTransition } from '@/lib/utils';

// ─── Constants ───────────────────────────────────────────────────────────────

const MODE_EMOJI: Record<string, string> = {
  walk: '🚶', bike: '🚴', drive: '🚗', transit: '🚇',
  foot: '🚶', metro: '🚇', bus: '🚌', cycling: '🚲', car: '🚗',
};

const TAB_VARIANTS = {
  initial: { opacity: 0, x: 18 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.18 } },
  exit:    { opacity: 0, x: -18, transition: { duration: 0.12 } },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function joinedDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en', { month: 'long', year: 'numeric' });
}

function fmtDur(s: number) {
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function fmtDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;
}

// ─── Shared UI primitives ────────────────────────────────────────────────────

function notifEmoji(type: AppNotification['type']): string {
  const map: Record<string, string> = {
    emergency: '🆘', vote: '✅', comment: '💬',
    resolve: '✅', community: '👥', trusted_contact: '🤝',
  };
  return map[type] ?? '🔔';
}

function LiveBadge() {
  return (
    <span
      className="flex items-center gap-1 text-[0.6rem] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
      style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
    >
      <Radio size={9} />
      LIVE
    </span>
  );
}

function DangerBadge({ score }: { score: number }) {
  const color = score === 0 ? '#10b981' : score <= 2 ? '#f59e0b' : '#f43f5e';
  const label = score === 0 ? 'Safe' : score <= 2 ? 'Mild risk' : 'Danger';
  return (
    <span className="text-[0.6rem] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}22`, color }}>
      {label}
    </span>
  );
}

function EmptyState({ emoji, title, body, ctaLabel, onCta }: { emoji: string; title: string; body: string; ctaLabel?: string; onCta?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      <span className="text-4xl leading-none">{emoji}</span>
      <div>
        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{title}</p>
        <p className="text-xs mt-1 max-w-[220px] mx-auto" style={{ color: 'var(--text-muted)' }}>{body}</p>
      </div>
      {ctaLabel && onCta && (
        <button
          onClick={onCta}
          className="mt-1 px-4 py-2 rounded-xl text-xs font-bold transition hover:opacity-80"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <p className="text-[0.65rem] font-black uppercase tracking-widest px-1" style={{ color: 'var(--text-muted)' }}>
      {text}
    </p>
  );
}

function SkeletonList({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 rounded-2xl animate-pulse" style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border)' }} />
      ))}
    </div>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

type MyKovaTab = 'activity' | 'saved' | 'stats';
type PinFilter = 'all' | 'active' | 'resolved';

// ─── Root component ──────────────────────────────────────────────────────────

export default function MyKovaView({ userId, userEmail, onClose }: { userId: string; userEmail: string; onClose: () => void }) {
  const router = useRouter();
  const {
    pins, userProfile, setUserProfile, setSelectedPin, setActiveSheet, setPins, updatePin,
    favPlaceIds, placeNotes, followedPinIds, liveSessions,
    notifications, setTripPrefill, setActiveTab,
    myKovaInitialTab, setMyKovaInitialTab,
  } = useStore();

  const t = useTranslations('mykova');

  // ─── Sub-tab state ──────────────────────────────────────────────────────
  const [activeSubTab, setActiveSubTab] = useState<MyKovaTab>('activity');
  const [showCommunity, setShowCommunity] = useState(false);

  // Consume deep-link on mount
  useEffect(() => {
    if (myKovaInitialTab && ['activity', 'saved', 'stats'].includes(myKovaInitialTab)) {
      setActiveSubTab(myKovaInitialTab as MyKovaTab);
      setMyKovaInitialTab(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Feed data ──────────────────────────────────────────────────────────
  const followedPins = useMemo(
    () => pins.filter((p) => followedPinIds.includes(p.id)),
    [pins, followedPinIds],
  );
  const feedNotifs = useMemo(() => [...notifications].reverse().slice(0, 20), [notifications]);

  // ─── Favorites data ─────────────────────────────────────────────────────
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const favPlaces = useMemo(
    () => placeNotes.filter((n) => favPlaceIds.includes(n.id)),
    [placeNotes, favPlaceIds],
  );

  // ─── Stats / Profile data ──────────────────────────────────────────────
  const [confirmedVotes, setConfirmedVotes] = useState(0);
  const [commentsMade, setCommentsMade] = useState(0);
  const [placeNotesCount, setPlaceNotesCount] = useState(0);
  const [impactLoaded, setImpactLoaded] = useState(false);
  const [tripHistory, setTripHistory] = useState<TripLog[]>([]);
  const [tripsLoaded, setTripsLoaded] = useState(false);

  // Profile editing
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const didSaveRef = useRef(false);

  // Pin management
  const [pinFilter, setPinFilter] = useState<PinFilter>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingPinId, setEditingPinId] = useState<string | null>(null);
  const [editSeverity, setEditSeverity] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const [showLocationHistory, setShowLocationHistory] = useState(false);

  // Collapsible sections in Profile tab
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  function toggleSection(key: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  // ─── Data loading ───────────────────────────────────────────────────────

  useEffect(() => { setNameInput(userProfile?.display_name ?? ''); }, [userProfile]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  useEffect(() => {
    if (!userId) return;
    // Saved routes
    setRoutesLoading(true);
    supabase.from('saved_routes').select('*').eq('user_id', userId)
      .order('last_used_at', { ascending: false }).limit(20)
      .then(({ data }) => { setSavedRoutes((data as SavedRoute[]) ?? []); setRoutesLoading(false); });
  }, [userId]);

  useEffect(() => {
    if (impactLoaded || !userId) return;
    async function loadImpact() {
      const myPinIds = pins.filter((p) => p.user_id === userId).map((p) => p.id);
      const [votesRes, commentsRes, notesRes] = await Promise.all([
        myPinIds.length > 0
          ? supabase.from('pin_votes').select('*', { count: 'exact', head: true }).in('pin_id', myPinIds).eq('vote_type', 'confirm')
          : Promise.resolve({ count: 0 }),
        supabase.from('pin_comments').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('place_notes').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      ]);
      setConfirmedVotes((votesRes as { count: number | null }).count ?? 0);
      setCommentsMade((commentsRes as { count: number | null }).count ?? 0);
      setPlaceNotesCount((notesRes as { count: number | null }).count ?? 0);
      setImpactLoaded(true);
    }
    loadImpact();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, pins.length]);

  useEffect(() => {
    if (tripsLoaded || !userId) return;
    supabase.from('trip_log').select('*').eq('user_id', userId)
      .order('ended_at', { ascending: false }).limit(20)
      .then(({ data }) => { setTripHistory((data as TripLog[]) ?? []); setTripsLoaded(true); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ─── Derived data ──────────────────────────────────────────────────────

  const displayName = userProfile?.display_name ?? null;
  const initial = (displayName?.[0] ?? userEmail[0] ?? '?').toUpperCase();

  const myPins = useMemo(() =>
    pins.filter((p) => p.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [pins, userId],
  );
  const myReports = myPins.filter((p) => !p.is_emergency);
  const myAlerts  = myPins.filter((p) => p.is_emergency);

  const trustScore = computeScore(myReports.length, myAlerts.length, confirmedVotes, commentsMade);
  const level      = getLevel(trustScore);
  const progress   = level.next === Infinity ? 1 : (trustScore - level.min) / (level.next - level.min);

  const expertiseTags = useMemo(() =>
    computeExpertiseTags(pins, userId, userProfile?.verification_status === 'approved', level.label),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [pins.length, userId, userProfile?.verification_status, level.label]);

  const now = Date.now();
  function isPinActive(pin: Pin) {
    if (pin.resolved_at) return false;
    const base = pin.last_confirmed_at
      ? Math.max(new Date(pin.created_at).getTime(), new Date(pin.last_confirmed_at).getTime())
      : new Date(pin.created_at).getTime();
    return (now - base) / 3_600_000 < (pin.is_emergency ? 2 : 24);
  }
  const activePins = myPins.filter(isPinActive);

  const filteredPins = useMemo(() => {
    if (pinFilter === 'active')   return myPins.filter(isPinActive);
    if (pinFilter === 'resolved') return myPins.filter((p) => !isPinActive(p));
    return myPins;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myPins, pinFilter]);

  // ─── Actions ───────────────────────────────────────────────────────────

  async function saveName() {
    if (didSaveRef.current || saving) return;
    const trimmed = nameInput.trim();
    if (!trimmed) { setEditing(false); return; }
    didSaveRef.current = true;
    setSaving(true);
    const { error } = await supabase.from('profiles').upsert({ id: userId, display_name: trimmed });
    setSaving(false);
    didSaveRef.current = false;
    if (error) { toast.error('Could not save your name. Try again.'); return; }
    setUserProfile({ ...(userProfile ?? { id: userId, display_name: null, created_at: new Date().toISOString() }), display_name: trimmed });
    setEditing(false);
    toast.success('Name updated');
  }

  function startEditing() { didSaveRef.current = false; setEditing(true); }
  function cancelEdit()   { didSaveRef.current = true; setNameInput(userProfile?.display_name ?? ''); setEditing(false); }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${userId}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (upErr) { toast.error('Could not upload photo. Try again.'); setAvatarUploading(false); return; }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const avatar_url = urlData.publicUrl + '?t=' + Date.now();
    const { error: dbErr } = await supabase.from('profiles').update({ avatar_url }).eq('id', userId);
    if (dbErr) { toast.error('Photo uploaded but could not save. Try again.'); setAvatarUploading(false); return; }
    setUserProfile({ ...(userProfile ?? { id: userId, display_name: null, created_at: new Date().toISOString() }), avatar_url });
    toast.success('Profile photo updated');
    setAvatarUploading(false);
    e.target.value = '';
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  async function deletePin(pin: Pin) {
    const { error } = await supabase.from('pins').delete().eq('id', pin.id);
    if (error) { toast.error('Could not delete pin'); return; }
    setPins(pins.filter((p) => p.id !== pin.id));
    setConfirmDeleteId(null);
    toast.success('Pin deleted');
  }

  function startPinEdit(pin: Pin) {
    setEditingPinId(pin.id);
    setEditSeverity(pin.severity);
    setEditDesc(pin.description);
    setConfirmDeleteId(null);
  }

  async function savePinEdit(pin: Pin) {
    setEditSaving(true);
    const { error } = await supabase.from('pins')
      .update({ severity: editSeverity, description: editDesc.trim() })
      .eq('id', pin.id);
    setEditSaving(false);
    if (error) { toast.error('Could not save changes'); return; }
    updatePin({ ...pin, severity: editSeverity as Pin['severity'], description: editDesc.trim() });
    setEditingPinId(null);
    toast.success('Pin updated');
  }

  function openTripToPlace(place: PlaceNote) {
    setTripPrefill({ destination: place.name ?? place.note.slice(0, 30), destCoords: [place.lng, place.lat] });
    setActiveTab('trip');
    onClose();
  }

  function openTripForRoute(route: SavedRoute) {
    setTripPrefill({ departure: route.from_label ?? undefined, destination: route.to_label });
    setActiveTab('trip');
    onClose();
  }

  const card = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' };

  // ─── Render ────────────────────────────────────────────────────────────

  const SUB_TABS: { id: MyKovaTab; label: string; Icon: React.ElementType }[] = [
    { id: 'activity',  label: t('activity'),  Icon: Rss      },
    { id: 'saved',     label: t('saved'),     Icon: Star     },
    { id: 'stats',     label: t('stats'),     Icon: BarChart2 },
  ];

  return (
    <>
      <motion.div
        key="mykova-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 z-200"
        style={{ backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      <motion.div
        key="mykova-sheet"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={springTransition}
        className="sheet-motion absolute bottom-0 left-1/2 -translate-x-1/2 w-[92%] max-w-110 rounded-t-2xl z-201 flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--bg-primary)', maxHeight: '85dvh', boxShadow: '0 -8px 40px rgba(0,0,0,0.25)' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full" style={{ backgroundColor: 'var(--border)' }} />
        </div>

        {/* Title */}
        <div className="px-5 pt-1 pb-3 shrink-0">
          <h2 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{t('title')}</h2>
        </div>

        {/* Always-visible profile card */}
        <div className="px-4 pb-3 shrink-0">
          <div className="flex items-center gap-3 rounded-2xl p-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-lg font-black text-white shrink-0 relative group"
              style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)' }}
              title="Change photo"
            >
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : avatarUploading ? (
                <span className="text-xs animate-pulse">...</span>
              ) : initial}
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="flex items-center gap-1.5">
                  <input ref={inputRef} value={nameInput} onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveName(); } if (e.key === 'Escape') cancelEdit(); }}
                    placeholder="Your name..."
                    className="flex-1 text-sm font-bold outline-none rounded-lg px-2 py-1 min-w-0"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--accent)', color: 'var(--text-primary)' }} />
                  <button onClick={saveName} disabled={saving} className="p-1 rounded-lg" style={{ color: '#10b981' }}><Check size={14} /></button>
                  <button onClick={cancelEdit} className="p-1 rounded-lg" style={{ color: 'var(--text-muted)' }}><X size={14} /></button>
                </div>
              ) : (
                <button onClick={startEditing} className="flex items-center gap-1 group">
                  <span className="text-sm font-black truncate" style={{ color: 'var(--text-primary)' }}>{displayName ?? 'Set your name'}</span>
                  <Pencil size={10} className="opacity-0 group-hover:opacity-60 transition" style={{ color: 'var(--text-muted)' }} />
                </button>
              )}
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[0.6rem] font-black px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: level.color + '18', color: level.color }}>
                  {level.emoji} {level.label}
                </span>
                {userProfile?.verification_status === 'approved' && (
                  <span className="text-[0.6rem] font-bold" style={{ color: '#10b981' }}>✅ Verified</span>
                )}
              </div>
            </div>
            <span className="text-xl font-black shrink-0" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{trustScore}</span>
          </div>

          {/* Quick stats row */}
          <div className="flex gap-2 mt-2">
            {[
              { label: t('reports'), value: myReports.length, emoji: '📋' },
              { label: t('level'), value: level.label, emoji: level.emoji },
              { label: t('votes'), value: confirmedVotes, emoji: '👍' },
            ].map(({ label, value, emoji }) => (
              <div key={label} className="flex-1 rounded-xl py-2 flex flex-col items-center gap-0.5"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <span className="text-sm">{emoji}</span>
                <span className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>{value}</span>
                <span className="text-[0.55rem]" style={{ color: 'var(--text-muted)' }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Trusted Circle */}
          <div className="mt-2">
            <TrustedCircleCard userId={userId} compact />
          </div>

          {/* Community access */}
          <button
            onClick={() => setShowCommunity(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition active:opacity-70 mt-2"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <span className="text-lg">💬</span>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t('community')}</p>
              <p className="text-[0.65rem]" style={{ color: 'var(--text-muted)' }}>{t('communityDesc')}</p>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Sub-tab selector */}
        <div className="flex gap-1.5 px-4 pb-3 shrink-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {SUB_TABS.map(({ id, label, Icon }) => {
            const active = activeSubTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveSubTab(id)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0"
                style={{
                  backgroundColor: active ? 'var(--accent)' : 'var(--bg-card)',
                  color: active ? '#fff' : 'var(--text-muted)',
                  border: active ? '1.5px solid transparent' : '1.5px solid var(--border)',
                }}
              >
                <Icon size={13} />
                {label}
              </button>
            );
          })}
        </div>

        <div className="h-px mx-4 shrink-0" style={{ backgroundColor: 'var(--border)' }} />

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <AnimatePresence mode="wait">

            {/* ═══ ACTIVITY TAB ═══ */}
            {activeSubTab === 'activity' && (
              <motion.div key="activity" variants={TAB_VARIANTS} initial="initial" animate="animate" exit="exit" className="space-y-3">
                {followedPins.length === 0 && feedNotifs.length === 0 ? (
                  <EmptyState emoji="📡" title="Nothing here yet" body="Follow pins on the map to see their activity here" ctaLabel={t('browseMap')} onCta={() => setActiveTab('map')} />
                ) : (
                  <>
                    {feedNotifs.length > 0 && (
                      <div className="space-y-2">
                        <SectionLabel text="Recent activity" />
                        {feedNotifs.map((n) => (
                          <div
                            key={n.id}
                            className="flex items-start gap-3 p-3 rounded-2xl"
                            style={{
                              backgroundColor: n.read ? 'var(--bg-card)' : 'rgba(99,102,241,0.07)',
                              border: `1.5px solid ${n.read ? 'var(--border)' : 'rgba(99,102,241,0.25)'}`,
                            }}
                          >
                            <span className="text-xl leading-none mt-0.5">{notifEmoji(n.type)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold leading-snug truncate" style={{ color: 'var(--text-primary)' }}>
                                {n.title || 'Notification'}
                              </p>
                              {n.body && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{n.body}</p>}
                              <p className="text-[0.65rem] mt-1" style={{ color: 'var(--text-muted)' }}>{timeAgo(n.created_at)}</p>
                            </div>
                            {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: 'var(--accent)' }} />}
                          </div>
                        ))}
                      </div>
                    )}
                    {followedPins.length > 0 && (
                      <div className="space-y-2 mt-3">
                        <SectionLabel text="Followed pins" />
                        {followedPins.map((pin) => {
                          const cat = CATEGORIES[pin.category];
                          const isAct = !pin.resolved_at;
                          return (
                            <button
                              key={pin.id}
                              onClick={() => { setSelectedPin(pin); setActiveSheet('detail'); }}
                              className="w-full text-left flex items-start gap-3 p-3 rounded-2xl transition active:scale-[0.98]"
                              style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border)' }}
                            >
                              <span className="text-xl leading-none mt-0.5">{cat?.emoji ?? '⚠️'}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{cat?.label ?? 'Incident'}</span>
                                  <span className="text-[0.6rem] font-bold px-2 py-0.5 rounded-full"
                                    style={{ backgroundColor: isAct ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)', color: isAct ? '#10b981' : '#6b7280' }}>
                                    {isAct ? 'Active' : 'Resolved'}
                                  </span>
                                </div>
                                {pin.description && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{pin.description}</p>}
                                <p className="text-[0.65rem] mt-1" style={{ color: 'var(--text-muted)' }}>{timeAgo(pin.created_at)}</p>
                              </div>
                              <ChevronRight size={15} style={{ color: 'var(--text-muted)', marginTop: 2 }} />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* ═══ SAVED TAB ═══ */}
            {activeSubTab === 'saved' && (
              <motion.div key="saved" variants={TAB_VARIANTS} initial="initial" animate="animate" exit="exit" className="space-y-4">
                {favPlaces.length === 0 && savedRoutes.length === 0 && !routesLoading ? (
                  <EmptyState emoji="⭐" title="No favorites yet" body="Star places on the map or save routes from the Trip planner" ctaLabel={t('explorePlaces')} onCta={() => setActiveTab('map')} />
                ) : (
                  <>
                    {favPlaces.length > 0 && (
                      <div className="space-y-2">
                        <SectionLabel text="Places" />
                        {favPlaces.map((place) => (
                          <button key={place.id} onClick={() => openTripToPlace(place)}
                            className="w-full text-left flex items-center gap-3 p-3 rounded-2xl transition active:scale-[0.98]"
                            style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border)' }}>
                            <span className="text-xl leading-none">{place.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{place.name || 'Unnamed place'}</p>
                              {place.note && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{place.note}</p>}
                            </div>
                            <Navigation size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                          </button>
                        ))}
                      </div>
                    )}
                    {(routesLoading || savedRoutes.length > 0) && (
                      <div className="space-y-2">
                        <SectionLabel text="Saved routes" />
                        {routesLoading ? <SkeletonList rows={3} /> : savedRoutes.map((route) => (
                          <button key={route.id} onClick={() => openTripForRoute(route)}
                            className="w-full text-left flex items-center gap-3 p-3 rounded-2xl transition active:scale-[0.98]"
                            style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border)' }}>
                            <span className="text-xl leading-none">{MODE_EMOJI[route.mode] ?? '🗺️'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                {route.from_label ? `${route.from_label} → ` : ''}{route.to_label}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <DangerBadge score={route.danger_score_last} />
                                <span className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>{route.trip_count}x used</span>
                              </div>
                            </div>
                            <Navigation size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* ═══ STATS TAB ═══ */}
            {activeSubTab === 'stats' && (
              <motion.div key="stats" variants={TAB_VARIANTS} initial="initial" animate="animate" exit="exit" className="space-y-4 pb-2">
                {/* Trust Score bar */}
                <div className="rounded-2xl p-4 flex flex-col gap-2.5" style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${level.color}33` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{level.emoji}</span>
                      <div>
                        <p className="text-sm font-black" style={{ color: level.color }}>{level.label}</p>
                        <p className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>
                          {level.next === Infinity ? 'Max level reached' : `${level.next - trustScore} pts to ${LEVELS[LEVELS.findIndex(l => l.label === level.label) + 1]?.label ?? ''}`}
                        </p>
                      </div>
                    </div>
                    <span className="text-2xl font-black" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{trustScore}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, progress * 100)}%`, backgroundColor: level.color }} />
                  </div>
                </div>

                {/* Weekly activity sparkline */}
                <div className="rounded-2xl p-4 flex items-center justify-between" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div>
                    <p className="text-[0.65rem] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>7-day activity</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{myPins.length} total pins</p>
                  </div>
                  <TrendSparkline pins={myPins} />
                </div>

                {/* Impact grid */}
                <div>
                  <p className="text-[0.7rem] font-black uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-muted)' }}>Your Impact</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Reports made',        value: myReports.length,  emoji: '📋', color: '#6366f1' },
                      { label: 'Confirmed by others', value: confirmedVotes,    emoji: '👍', color: '#22c55e' },
                      { label: 'Active right now',    value: activePins.length, emoji: '🔴', color: '#f43f5e' },
                      { label: 'Comments written',    value: commentsMade,      emoji: '💬', color: '#f59e0b' },
                      { label: 'Place notes',         value: placeNotesCount,   emoji: '📌', color: '#8b5cf6' },
                    ].map(({ label, value, emoji, color }) => (
                      <div key={label} className="rounded-2xl p-3.5 flex flex-col gap-1" style={card}>
                        <span className="text-xl">{emoji}</span>
                        <span className="text-2xl font-black" style={{ color, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
                        <span className="text-[0.6rem] font-bold uppercase tracking-wide leading-tight" style={{ color: 'var(--text-muted)' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                  {trustScore === 0 && (
                    <button
                      onClick={() => setActiveTab('map')}
                      className="w-full mt-2 py-2.5 rounded-xl text-xs font-bold transition hover:opacity-80"
                      style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                    >
                      Report your first incident to earn points
                    </button>
                  )}
                </div>

                {/* Weekly Challenges — S48 */}
                <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <ChallengesSection userId={userId} />
                </div>

                {/* Referral — S49 */}
                <ReferralSection userId={userId} />

                {/* ── Location History ─────────────────────────── */}
                <button
                  onClick={() => setShowLocationHistory(true)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition active:scale-[0.98]"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                >
                  <span className="text-sm">📍</span>
                  <span className="flex-1 text-xs font-bold text-left" style={{ color: 'var(--text-primary)' }}>{t('locationHistory')}</span>
                  <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                </button>

                {/* ── Collapsible: My Pins ─────────────────────── */}
                <div>
                  <button onClick={() => toggleSection('pins')}
                    className="w-full flex items-center justify-between py-2 px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">📍</span>
                      <span className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>My Pins</span>
                      {myPins.length > 0 && (
                        <span className="text-[0.55rem] font-black px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: 'rgba(244,63,94,0.12)', color: 'var(--accent)' }}>{myPins.length}</span>
                      )}
                    </div>
                    {expandedSections.has('pins') ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                  </button>
                  {expandedSections.has('pins') && (
                    <div className="space-y-2 mt-1">
                      <div className="flex gap-1.5">
                        {(['all', 'active', 'resolved'] as PinFilter[]).map((f) => (
                          <button key={f} onClick={() => setPinFilter(f)}
                            className="px-3 py-1.5 rounded-full text-xs font-bold transition capitalize"
                            style={{
                              backgroundColor: pinFilter === f ? 'var(--accent)' : 'var(--bg-card)',
                              color: pinFilter === f ? '#fff' : 'var(--text-muted)',
                              border: pinFilter === f ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                            }}>
                            {f === 'all' ? `All (${myPins.length})` : f === 'active' ? `Active (${activePins.length})` : `Resolved (${myPins.length - activePins.length})`}
                          </button>
                        ))}
                      </div>
                      {filteredPins.length === 0 ? (
                        <div className="rounded-2xl p-6 flex flex-col items-center gap-2 text-center" style={card}>
                          <span className="text-2xl">📍</span>
                          <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>{pinFilter === 'all' ? 'No pins yet' : `No ${pinFilter} pins`}</p>
                          {pinFilter === 'all' && (
                            <button
                              onClick={() => setActiveTab('map')}
                              className="mt-1 px-4 py-2 rounded-xl text-xs font-bold transition hover:opacity-80"
                              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                            >
                              {t('reportIncident')}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {filteredPins.map((pin) => {
                            const cat = CATEGORIES[pin.category as keyof typeof CATEGORIES];
                            const sev = SEVERITY[pin.severity as keyof typeof SEVERITY];
                            const pinIsActive = isPinActive(pin);
                            const canManage = !pin.is_emergency;
                            const isEditingPin = editingPinId === pin.id;
                            const isConfirmingDelete = confirmDeleteId === pin.id;
                            return (
                              <div key={pin.id} className="rounded-2xl overflow-hidden"
                                style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${isEditingPin ? 'var(--accent)' : 'var(--border)'}` }}>
                                <div className="flex items-center gap-0">
                                  <div className="w-1 self-stretch shrink-0 rounded-l-2xl"
                                    style={{ backgroundColor: pin.is_emergency ? '#ef4444' : (sev?.color ?? '#6b7490') }} />
                                  <button className="flex-1 px-3 py-2.5 text-left min-w-0"
                                    onClick={() => { setSelectedPin(pin); setActiveSheet('detail'); }}>
                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                      <span className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                                        {pin.is_emergency ? '🆘 Emergency' : `${cat?.emoji ?? ''} ${cat?.label ?? pin.category}`}
                                      </span>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-[0.55rem] font-black px-1.5 py-0.5 rounded-full"
                                          style={{ backgroundColor: pinIsActive ? 'rgba(34,197,94,0.12)' : 'rgba(107,114,128,0.12)', color: pinIsActive ? '#22c55e' : '#6b7280' }}>
                                          {pinIsActive ? 'Active' : pin.resolved_at ? 'Resolved' : 'Expired'}
                                        </span>
                                        <span className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>{timeAgo(pin.created_at)}</span>
                                      </div>
                                    </div>
                                    <p className="text-xs line-clamp-1" style={{ color: 'var(--text-muted)' }}>{pin.description}</p>
                                  </button>
                                  {canManage && !isEditingPin && (
                                    <div className="flex items-center gap-1 pr-2 shrink-0">
                                      <button onClick={() => startPinEdit(pin)} className="w-7 h-7 rounded-lg flex items-center justify-center transition hover:opacity-70"
                                        style={{ backgroundColor: 'rgba(99,102,241,0.10)' }} title="Edit">
                                        <Pencil size={11} style={{ color: '#6366f1' }} />
                                      </button>
                                      {isConfirmingDelete ? (
                                        <button onClick={() => deletePin(pin)} className="px-2 h-7 rounded-lg flex items-center justify-center text-[0.6rem] font-black transition"
                                          style={{ backgroundColor: '#ef4444', color: '#fff' }}>Delete?</button>
                                      ) : (
                                        <button onClick={() => setConfirmDeleteId(pin.id)} className="w-7 h-7 rounded-lg flex items-center justify-center transition hover:opacity-70"
                                          style={{ backgroundColor: 'rgba(239,68,68,0.10)' }} title="Delete">
                                          <Trash2 size={11} style={{ color: '#ef4444' }} />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                  {isEditingPin && (
                                    <div className="flex items-center gap-1 pr-2 shrink-0">
                                      <button onClick={() => savePinEdit(pin)} disabled={editSaving}
                                        className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}>
                                        <Check size={12} style={{ color: '#22c55e' }} />
                                      </button>
                                      <button onClick={() => setEditingPinId(null)}
                                        className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(107,114,128,0.10)' }}>
                                        <X size={12} style={{ color: 'var(--text-muted)' }} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {isEditingPin && (
                                  <div className="px-3 pb-3 pt-1 flex flex-col gap-2 border-t" style={{ borderColor: 'var(--border)' }}>
                                    <div className="flex gap-1.5">
                                      {Object.entries(SEVERITY).map(([key, { label, color }]) => (
                                        <button key={key} onClick={() => setEditSeverity(key)}
                                          className="flex-1 py-1 rounded-lg text-[0.6rem] font-black transition"
                                          style={{
                                            backgroundColor: editSeverity === key ? color + '22' : 'var(--bg-secondary)',
                                            color: editSeverity === key ? color : 'var(--text-muted)',
                                            border: editSeverity === key ? `1.5px solid ${color}` : '1px solid var(--border)',
                                          }}>{label}</button>
                                      ))}
                                    </div>
                                    <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2}
                                      className="w-full text-xs rounded-xl px-3 py-2 outline-none resize-none"
                                      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Collapsible: Trips ───────────────────────── */}
                <div>
                  <button onClick={() => toggleSection('trips')} className="w-full flex items-center justify-between py-2 px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🗺️</span>
                      <span className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Trip History</span>
                      {tripHistory.length > 0 && (
                        <span className="text-[0.55rem] font-black px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: 'rgba(244,63,94,0.12)', color: 'var(--accent)' }}>{tripHistory.length}</span>
                      )}
                    </div>
                    {expandedSections.has('trips') ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                  </button>
                  {expandedSections.has('trips') && (
                    <div className="space-y-2 mt-1">
                      {tripHistory.length === 0 ? (
                        <div className="rounded-2xl p-6 flex flex-col items-center gap-2 text-center" style={card}>
                          <span className="text-2xl">🗺️</span>
                          <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>No trips recorded yet</p>
                          <button
                            onClick={() => setActiveTab('trip')}
                            className="mt-1 px-4 py-2 rounded-xl text-xs font-bold transition hover:opacity-80"
                            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                          >
                            {t('planFirstTrip')}
                          </button>
                        </div>
                      ) : tripHistory.map((trip) => {
                        const dangerColor = trip.danger_score === 0 ? '#22c55e' : trip.danger_score <= 2 ? '#f59e0b' : '#ef4444';
                        return (
                          <div key={trip.id} className="rounded-2xl px-4 py-3 flex items-center justify-between gap-3" style={card}>
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-xl shrink-0">{MODE_EMOJI[trip.mode] ?? '🗺️'}</span>
                              <div className="min-w-0">
                                <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                                  {trip.from_label ? `${trip.from_label} → ` : ''}{trip.to_label}
                                </p>
                                <p className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>
                                  {fmtDist(trip.distance_m)} · {fmtDur(trip.duration_s)} · {new Date(trip.ended_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                                </p>
                              </div>
                            </div>
                            <span className="text-[0.55rem] font-black px-2 py-0.5 rounded-full shrink-0"
                              style={{ backgroundColor: dangerColor + '18', color: dangerColor }}>
                              {trip.danger_score === 0 ? 'Clear' : `${trip.danger_score} risk`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── Collapsible: SOS History ─────────────────── */}
                <div>
                  <button onClick={() => toggleSection('sos')} className="w-full flex items-center justify-between py-2 px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🆘</span>
                      <span className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>SOS History</span>
                      {myAlerts.length > 0 && (
                        <span className="text-[0.55rem] font-black px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>{myAlerts.length}</span>
                      )}
                    </div>
                    {expandedSections.has('sos') ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                  </button>
                  {expandedSections.has('sos') && (
                    <div className="space-y-2 mt-1">
                      {myAlerts.length === 0 ? (
                        <div className="rounded-2xl p-6 flex flex-col items-center gap-2 text-center" style={card}>
                          <span className="text-2xl">🆘</span>
                          <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>No SOS signals sent</p>
                        </div>
                      ) : myAlerts.map((pin) => {
                        const pinIsActive = isPinActive(pin);
                        const resolvedAt = pin.resolved_at ? new Date(pin.resolved_at) : null;
                        const createdAt = new Date(pin.created_at);
                        const durationMin = resolvedAt ? Math.round((resolvedAt.getTime() - createdAt.getTime()) / 60_000) : null;
                        return (
                          <button key={pin.id} onClick={() => { setSelectedPin(pin); setActiveSheet('detail'); }}
                            className="w-full rounded-2xl overflow-hidden text-left flex transition active:scale-[0.98]"
                            style={{ backgroundColor: 'var(--bg-card)', border: `1.5px solid ${pinIsActive ? '#ef444440' : 'var(--border)'}` }}>
                            <div className="w-1 shrink-0" style={{ backgroundColor: pinIsActive ? '#ef4444' : '#6b7280' }} />
                            <div className="flex-1 px-3 py-3 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-sm font-black" style={{ color: pinIsActive ? '#ef4444' : 'var(--text-primary)' }}>🆘 Emergency alert</span>
                                <span className="text-[0.55rem] font-black px-1.5 py-0.5 rounded-full"
                                  style={{ backgroundColor: pinIsActive ? 'rgba(239,68,68,0.12)' : 'rgba(107,114,128,0.12)', color: pinIsActive ? '#ef4444' : '#6b7280' }}>
                                  {pinIsActive ? 'Active' : 'Resolved'}
                                </span>
                              </div>
                              <p className="text-xs line-clamp-2 mb-1" style={{ color: 'var(--text-muted)' }}>{pin.description}</p>
                              <p className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>
                                {createdAt.toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                {durationMin != null && ` · lasted ${durationMin} min`}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Sign out */}
                <button onClick={handleSignOut}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm transition hover:opacity-80 mt-2"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  Sign out
                </button>

                <div className="pb-6" />
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>

      {showVerification && <VerificationView onClose={() => setShowVerification(false)} />}

      <AnimatePresence>
        {showLocationHistory && (
          <LocationHistoryViewer userId={userId} onClose={() => setShowLocationHistory(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCommunity && (
          <CommunityView key="community-overlay" onClose={() => setShowCommunity(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
