// src/components/MyKovaView.tsx — Unified "My Breveil" hub (Feed + Favorites + Stats + Profile)

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronDown, ChevronUp,
  Navigation, Trash2, Pencil, Check, X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import {
  Pin, SavedRoute, TripLog,
  CATEGORIES, SEVERITY, DECAY_HOURS,
} from '@/types';
import { getEffectiveDate } from '@/lib/pin-utils';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import VerificationView from '@/components/VerificationView';
import SettingsSheet from '@/components/settings/SettingsSheet';
import { timeAgoLong as timeAgo, springTransition } from '@/lib/utils';
import { useTheme } from '@/stores/useTheme';

// ─── Theme-aware colors ──────────────────────────────────────────────────────

function getColors(isDark: boolean) {
  return {
    textPrimary:      isDark ? '#FFFFFF' : '#0F172A',
    textMuted:        isDark ? '#64748B' : '#94A3B8',
    accent:           isDark ? '#3BB4C1' : '#C48A1E',
    accentGold:       '#F5C341',
    bgCard:           isDark ? '#334155' : '#FFFFFF',
    bgSecondary:      isDark ? '#1E293B' : '#FFFFFF',
    border:           isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.10)',
    surfaceBase:      isDark ? '#0F172A' : '#F8FAFC',
    interactiveHover: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.03)',
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MODE_EMOJI: Record<string, string> = {
  walk: '🚶', bike: '🚴', drive: '🚗', transit: '🚇',
  foot: '🚶', metro: '🚇', bus: '🚌', cycling: '🚲', car: '🚗',
};

const PERSONA_ICONS: Record<string, string> = {
  commuter: '🚇', student: '📚', nightowl: '🌙', runner: '🏃',
  parent: '👨‍👩‍👦', traveler: '✈️', freelance: '💻', nightlife: '🎉', everything: '🌈',
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

function DangerBadge({ score }: { score: number }) {
  const color = score === 0 ? '#10b981' : score <= 2 ? '#f59e0b' : '#ef4444';
  const label = score === 0 ? 'Safe' : score <= 2 ? 'Mild risk' : 'Danger';
  return (
    <span className="text-[0.6rem] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}22`, color }}>
      {label}
    </span>
  );
}

function EmptyState({ emoji, title, body, ctaLabel, onCta }: { emoji: string; title: string; body: string; ctaLabel?: string; onCta?: () => void }) {
  const _isDark = useTheme((s) => s.theme) === 'dark';
  const _c = getColors(_isDark);
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      <span className="text-4xl leading-none">{emoji}</span>
      <div>
        <p className="text-sm font-bold" style={{ color: _c.textPrimary }}>{title}</p>
        <p className="text-xs mt-1 max-w-[220px] mx-auto" style={{ color: _c.textMuted }}>{body}</p>
      </div>
      {ctaLabel && onCta && (
        <button
          onClick={onCta}
          className="mt-1 px-4 py-2 rounded-xl text-xs font-bold transition hover:opacity-80"
          style={{ backgroundColor: _c.accent, color: '#fff' }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

function SectionLabel({ text }: { text: string }) {
  const _isDark = useTheme((s) => s.theme) === 'dark';
  const _c = getColors(_isDark);
  return (
    <p className="text-[0.65rem] font-black uppercase tracking-widest px-1" style={{ color: _c.textMuted }}>
      {text}
    </p>
  );
}

function SkeletonList({ rows }: { rows: number }) {
  const _isDark = useTheme((s) => s.theme) === 'dark';
  const _c = getColors(_isDark);
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 rounded-2xl animate-pulse" style={{ backgroundColor: _c.bgCard, border: `1.5px solid ${_c.border}` }} />
      ))}
    </div>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

type MyKovaTab = 'activity' | 'saved' | 'stats';
type PinFilter = 'all' | 'active' | 'resolved';

// ─── Root component ──────────────────────────────────────────────────────────

export default function MyKovaView({ userId, userEmail, onClose }: { userId: string; userEmail: string; onClose: () => void }) {
  const toast = useToast();
  const router = useRouter();
  const {
    pins, userProfile, setUserProfile, setSelectedPin, setActiveSheet, setPins, updatePin,
    setTripPrefill, setActiveTab,
    myBreveilInitialTab, setMyBreveilInitialTab,
  } = useStore();

  const t = useTranslations('mykova');
  const tOb = useTranslations('onboarding');
  const isDark = useTheme((s) => s.theme) === 'dark';
  const c = getColors(isDark);

  // ─── Sub-tab state ──────────────────────────────────────────────────────
  const [activeSubTab, setActiveSubTab] = useState<MyKovaTab>('activity');

  // Consume deep-link on mount
  useEffect(() => {
    if (myBreveilInitialTab && ['activity', 'saved', 'stats'].includes(myBreveilInitialTab)) {
      setActiveSubTab(myBreveilInitialTab as MyKovaTab);
      setMyBreveilInitialTab(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Feed data ──────────────────────────────────────────────────────────

  // ─── Favorites data ─────────────────────────────────────────────────────
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);

  // ─── Stats / Profile data ──────────────────────────────────────────────
  const [confirmedVotes, setConfirmedVotes] = useState(0);
  const [commentsMade, setCommentsMade] = useState(0);
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


  // ─── New profile/circle/communities state ────────────────────────────
  const [showSettings, setShowSettings] = useState(false);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileCity, setProfileCity] = useState<string | null>(null);
  const [profilePersonas, setProfilePersonas] = useState<string[]>([]);
  const [thanksCount, setThanksCount] = useState(0);
  const [circleCount, setCircleCount] = useState(0);
  const [circleNames, setCircleNames] = useState<string[]>([]);
  const [communityCount, setCommunityCount] = useState(0);
  const [communityPreviewNames, setCommunityPreviewNames] = useState<string[]>([]);
  const [communityJoins, setCommunityJoins] = useState<Array<{ id: string; community_name: string; created_at: string }>>([]);
  const [profileDataLoaded, setProfileDataLoaded] = useState(false);

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
      const [votesRes, commentsRes] = await Promise.all([
        myPinIds.length > 0
          ? supabase.from('pin_votes').select('*', { count: 'exact', head: true }).in('pin_id', myPinIds).eq('vote_type', 'confirm')
          : Promise.resolve({ count: 0 }),
        supabase.from('pin_comments').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      ]);
      setConfirmedVotes((votesRes as { count: number | null }).count ?? 0);
      setCommentsMade((commentsRes as { count: number | null }).count ?? 0);
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

  useEffect(() => {
    if (profileDataLoaded || !userId) return;
    async function loadProfileExtras() {
      const [profRes, circleRes, comRes] = await Promise.all([
        supabase.from('profiles').select('name, city, personas, thanks_received').eq('id', userId).single(),
        supabase.from('trusted_circle').select('contact_id').eq('user_id', userId),
        supabase.from('community_members').select('created_at, communities(name)').eq('user_id', userId)
          .order('created_at', { ascending: false }).limit(20),
      ]);
      if (profRes.data) {
        const pd = profRes.data as Record<string, unknown>;
        setProfileName((pd.name as string | null) ?? null);
        setProfileCity((pd.city as string | null) ?? null);
        setProfilePersonas((pd.personas as string[] | null) ?? []);
        setThanksCount((pd.thanks_received as number | null) ?? 0);
      }
      const circleIds = (circleRes.data ?? []).map((r: Record<string, unknown>) => r.contact_id);
      setCircleCount(circleIds.length);
      if (circleIds.length > 0) {
        const { data: cProfiles } = await supabase.from('profiles')
          .select('name, display_name').in('id', circleIds.slice(0, 3));
        setCircleNames((cProfiles ?? []).map((p: Record<string, unknown>) => (p.name as string | null) || (p.display_name as string | null) || '?'));
      }
      const joins = (comRes.data ?? []) as Array<Record<string, unknown>>;
      setCommunityCount(joins.length);
      setCommunityPreviewNames(joins.slice(0, 3).map((j) => (j.communities as Record<string, unknown> | null)?.name as string ?? '').filter(Boolean));
      setCommunityJoins(joins.map((j, i) => ({
        id: `join-${i}`,
        community_name: ((j.communities as Record<string, unknown> | null)?.name as string) ?? 'Communauté',
        created_at: j.created_at as string,
      })));
      setProfileDataLoaded(true);
    }
    loadProfileExtras();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, profileDataLoaded]);

  // ─── Derived data ──────────────────────────────────────────────────────

  const displayName = userProfile?.display_name ?? null;
  const displayFirst = profileName ?? displayName;
  const initial = (displayFirst?.[0] ?? userEmail[0] ?? '?').toUpperCase();

  const myPins = useMemo(() =>
    pins.filter((p) => p.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [pins, userId],
  );
  const myReports = myPins.filter((p) => !p.is_emergency);
  const myAlerts  = myPins.filter((p) => p.is_emergency);

  const now = Date.now();
  function isPinActive(pin: Pin) {
    if (pin.resolved_at) return false;
    const base = getEffectiveDate(pin).getTime();
    const maxH = pin.is_emergency ? 2 : (DECAY_HOURS[pin.category] || 24);
    return (now - base) / 3_600_000 < maxH;
  }
  const activePins = myPins.filter(isPinActive);

  const filteredPins = useMemo(() => {
    if (pinFilter === 'active')   return myPins.filter(isPinActive);
    if (pinFilter === 'resolved') return myPins.filter((p) => !isPinActive(p));
    return myPins;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myPins, pinFilter]);

  const activityItems = useMemo(() => {
    const pinItems = myPins.slice(0, 10).map((pin) => {
      const cat = CATEGORIES[pin.category as keyof typeof CATEGORIES];
      return {
        id: `pin-${pin.id}`,
        icon: '📍',
        text: `${t('youReported')} : ${cat?.label ?? pin.category}${pin.description ? ' · ' + pin.description.slice(0, 40) : ''}`,
        date: pin.created_at,
      };
    });
    const joinItems = communityJoins.map((j) => ({
      id: j.id,
      icon: '🏘️',
      text: `${t('youJoined')} : ${j.community_name}`,
      date: j.created_at,
    }));
    return [...pinItems, ...joinItems]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 15);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myPins, communityJoins]);

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
    if (error) { toast.error(t('nameSaveError')); return; }
    setUserProfile({ ...(userProfile ?? { id: userId, display_name: null, created_at: new Date().toISOString() }), display_name: trimmed });
    setEditing(false);
    toast.success(t('nameUpdated'));
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
    if (upErr) { toast.error(t('photoUploadError')); setAvatarUploading(false); return; }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const avatar_url = urlData.publicUrl + '?t=' + Date.now();
    const { error: dbErr } = await supabase.from('profiles').update({ avatar_url }).eq('id', userId);
    if (dbErr) { toast.error(t('photoSaveError')); setAvatarUploading(false); return; }
    setUserProfile({ ...(userProfile ?? { id: userId, display_name: null, created_at: new Date().toISOString() }), avatar_url });
    toast.success(t('photoUpdated'));
    setAvatarUploading(false);
    e.target.value = '';
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  async function deletePin(pin: Pin) {
    const { error } = await supabase.from('pins').delete().eq('id', pin.id);
    if (error) { toast.error(t('pinDeleteError')); return; }
    setPins(pins.filter((p) => p.id !== pin.id));
    setConfirmDeleteId(null);
    toast.success(t('pinDeleted'));
  }

  function startPinEdit(pin: Pin) {
    setEditingPinId(pin.id);
    setEditSeverity(pin.severity);
    setEditDesc(pin.description ?? '');
    setConfirmDeleteId(null);
  }

  async function savePinEdit(pin: Pin) {
    setEditSaving(true);
    const { error } = await supabase.from('pins')
      .update({ severity: editSeverity, description: editDesc.trim() })
      .eq('id', pin.id);
    setEditSaving(false);
    if (error) { toast.error(t('pinSaveError')); return; }
    updatePin({ ...pin, severity: editSeverity as Pin['severity'], description: editDesc.trim() });
    setEditingPinId(null);
    toast.success(t('pinUpdated'));
  }

  function openTripForRoute(route: SavedRoute) {
    setTripPrefill({ departure: route.from_label ?? undefined, destination: route.to_label });
    setActiveTab('trip');
    onClose();
  }

  const card = { backgroundColor: c.bgCard, border: `1px solid ${c.border}` };

  // ─── Render ────────────────────────────────────────────────────────────

  const SUB_TABS: { id: MyKovaTab; label: string }[] = [
    { id: 'activity', label: t('activity') },
    { id: 'saved',    label: t('saved')    },
    { id: 'stats',    label: t('stats')    },
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
        className="sheet-motion absolute bottom-0 left-1/2 -translate-x-1/2 w-[92%] max-w-110 rounded-t-2xl z-201 flex flex-col overflow-hidden lg:bottom-2 lg:left-2 lg:translate-x-0 lg:w-95 lg:max-w-none lg:rounded-2xl"
        style={{ backgroundColor: c.surfaceBase, maxHeight: '92dvh', boxShadow: '0 -8px 40px rgba(0,0,0,0.4)' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Scrollable inner */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col px-5 pt-4 pb-8">

            {/* ── Header ──────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
              <h1 className="font-serif text-[20px] font-light text-foreground">{t('title')}</h1>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full transition-colors"
                style={{ backgroundColor: c.interactiveHover }}
                aria-label="Fermer"
              >
                <X size={18} style={{ color: c.textMuted }} />
              </button>
            </div>

            {/* ── Profile card ─────────────────────────────────────────── */}
            <div
              className="mt-5 rounded-2xl p-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-3.5">
                {/* Avatar */}
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${c.accentGold}, #8B7EC8)` }}
                >
                  {userProfile?.avatar_url ? (
                    <Image src={userProfile.avatar_url} alt="Avatar" fill className="object-cover" />
                  ) : avatarUploading ? (
                    <span className="text-xs animate-pulse text-white">…</span>
                  ) : (
                    <span className="text-[22px] font-semibold text-foreground">{initial}</span>
                  )}
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

                {/* Name + city + personas */}
                <div className="min-w-0 flex-1">
                  {editing ? (
                    <div className="flex items-center gap-1.5">
                      <input ref={inputRef} value={nameInput} onChange={(e) => setNameInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveName(); } if (e.key === 'Escape') cancelEdit(); }}
                        placeholder="Votre prénom…"
                        className="flex-1 font-serif text-[20px] font-normal outline-none rounded-lg px-2 py-1 min-w-0"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.2)', color: c.textPrimary }} />
                      <button onClick={saveName} disabled={saving} className="p-1 rounded-lg" style={{ color: '#10b981' }}><Check size={14} /></button>
                      <button onClick={cancelEdit} className="p-1 rounded-lg" style={{ color: 'rgba(255,255,255,0.4)' }}><X size={14} /></button>
                    </div>
                  ) : (
                    <button onClick={startEditing} className="flex items-center gap-1 group text-left">
                      <h2 className="font-serif text-[22px] font-normal leading-tight text-foreground">
                        {displayFirst ?? 'Votre prénom'}
                      </h2>
                      <Pencil size={10} className="opacity-0 group-hover:opacity-60 transition" style={{ color: 'rgba(255,255,255,0.4)' }} />
                    </button>
                  )}
                  {profileCity && (
                    <p className="mt-0.5 text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {profileCity}
                    </p>
                  )}
                  {profilePersonas.length > 0 && (
                    <div className="mt-2 flex gap-1.5 flex-wrap">
                      {profilePersonas.slice(0, 3).map((persona) => (
                        <span
                          key={persona}
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
                          style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }}
                        >
                          <span className="text-[10px]">{PERSONA_ICONS[persona] ?? '✨'}</span>
                          {tOb(`persona_${persona}` as Parameters<typeof tOb>[0])}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Stats row ────────────────────────────────────────────── */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {/* Signalements */}
              <div
                className="flex flex-col items-center rounded-xl py-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span className="font-serif text-[24px] leading-none" style={{ color: c.accentGold }}>{myReports.length}</span>
                <span className="mt-1.5 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {t('reports')}
                </span>
              </div>

              {/* Merci */}
              <div
                className="flex flex-col items-center rounded-xl py-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span className="font-serif text-[24px] leading-none" style={{ color: c.accentGold }}>{thanksCount}</span>
                <span className="mt-1.5 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {t('thanks')}
                </span>
              </div>
            </div>

            {/* ── Circle card ──────────────────────────────────────────── */}
            <button
              type="button"
              onClick={() => { setActiveTab('community'); onClose(); }}
              className="mt-3 flex w-full items-center justify-between rounded-2xl p-3.5 text-left transition-colors hover:brightness-110"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div>
                <p className="text-[14px] font-semibold text-foreground">💛 {t('circle')}</p>
                <p className="mt-1 text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {circleCount} {t('proches')}{circleNames.length > 0 ? ` · ${circleNames.join(', ')}` : ''}
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>

            {/* ── Communities card ─────────────────────────────────────── */}
            <button
              type="button"
              onClick={() => {}}
              className="mt-2 flex w-full items-center justify-between rounded-2xl p-3.5 text-left transition-colors hover:brightness-110"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div>
                <p className="text-[14px] font-semibold text-foreground">👥 {t('communities')}</p>
                <p className="mt-1 text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {communityCount > 0
                    ? `${communityCount} ${t('groups')}${communityPreviewNames.length > 0 ? ` · ${communityPreviewNames.join(', ')}` : ''}`
                    : t('communityDesc')}
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>

            {/* ── Tab bar ──────────────────────────────────────────────── */}
            <div className="mt-5 flex gap-2">
              {SUB_TABS.map(({ id, label }) => {
                const isActive = activeSubTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveSubTab(id)}
                    className="rounded-full px-4 py-2 text-[12px] transition-all duration-200"
                    style={{
                      backgroundColor: isActive ? c.accentGold : 'transparent',
                      color: isActive ? c.surfaceBase : 'rgba(255,255,255,0.4)',
                      fontWeight: isActive ? 700 : 500,
                      border: isActive ? '1px solid transparent' : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* ── Tab content ──────────────────────────────────────────── */}
            <div className="mt-4">
              <AnimatePresence mode="wait">

            {/* ═══ ACTIVITY TAB ═══ */}
            {activeSubTab === 'activity' && (
              <motion.div key="activity" variants={TAB_VARIANTS} initial="initial" animate="animate" exit="exit" className="flex flex-col gap-2">
                {activityItems.length === 0 ? (
                  <EmptyState emoji="📍" title={t('noActivity')} body="Signalez un incident ou rejoignez une communauté" ctaLabel={t('browseMap')} onCta={() => setActiveTab('map')} />
                ) : (
                  activityItems.map((item, i) => (
                    <div
                      key={item.id}
                      className="rounded-xl p-3 animate-fade-in-up"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        animationDelay: `${i * 80}ms`,
                        opacity: 0,
                      }}
                    >
                      <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        <span className="mr-1.5">{item.icon}</span>
                        {item.text}
                      </p>
                      <p className="mt-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                        {timeAgo(item.date)}
                      </p>
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {/* ═══ SAVED TAB ═══ */}
            {activeSubTab === 'saved' && (
              <motion.div key="saved" variants={TAB_VARIANTS} initial="initial" animate="animate" exit="exit" className="space-y-4">
                {savedRoutes.length === 0 && !routesLoading ? (
                  <EmptyState emoji="⭐" title="No favorites yet" body="Save routes from the Trip planner" ctaLabel={t('explorePlaces')} onCta={() => setActiveTab('map')} />
                ) : (
                  <>
                    {(routesLoading || savedRoutes.length > 0) && (
                      <div className="space-y-2">
                        <SectionLabel text="Saved routes" />
                        {routesLoading ? <SkeletonList rows={3} /> : savedRoutes.map((route) => (
                          <button key={route.id} onClick={() => openTripForRoute(route)}
                            className="w-full text-left flex items-center gap-3 p-3 rounded-2xl transition active:scale-[0.98]"
                            style={{ backgroundColor: c.bgCard, border: `1.5px solid ${c.border}` }}>
                            <span className="text-xl leading-none">{MODE_EMOJI[route.mode] ?? '🗺️'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate" style={{ color: c.textPrimary }}>
                                {route.from_label ? `${route.from_label} → ` : ''}{route.to_label}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <DangerBadge score={route.danger_score_last} />
                                <span className="text-[0.6rem]" style={{ color: c.textMuted }}>{route.trip_count}x used</span>
                              </div>
                            </div>
                            <Navigation size={15} style={{ color: c.accent, flexShrink: 0 }} />
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
                {/* Weekly activity sparkline */}
                <div className="rounded-2xl p-4 flex items-center justify-between" style={{ backgroundColor: c.bgCard, border: `1px solid ${c.border}` }}>
                  <div>
                    <p className="text-[0.65rem] font-black uppercase tracking-widest" style={{ color: c.textMuted }}>7-day activity</p>
                    <p className="text-xs mt-0.5" style={{ color: c.textMuted }}>{myPins.length} total pins</p>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: c.textMuted }}>{myPins.length}</span>
                </div>

                {/* Impact grid */}
                <div>
                  <p className="text-[0.7rem] font-black uppercase tracking-widest mb-2.5" style={{ color: c.textMuted }}>Your Impact</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Reports made',        value: myReports.length,  emoji: '📋', color: '#6366f1' },
                      { label: 'Confirmed by others', value: confirmedVotes,    emoji: '👍', color: '#22c55e' },
                      { label: 'Active right now',    value: activePins.length, emoji: '🔴', color: '#ef4444' },
                      { label: 'Comments written',    value: commentsMade,      emoji: '💬', color: '#f59e0b' },
                    ].map(({ label, value, emoji, color }) => (
                      <div key={label} className="rounded-2xl p-3.5 flex flex-col gap-1" style={card}>
                        <span className="text-xl">{emoji}</span>
                        <span className="text-2xl font-black" style={{ color, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
                        <span className="text-[0.6rem] font-bold uppercase tracking-wide leading-tight" style={{ color: c.textMuted }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>


                {/* ── Collapsible: My Pins ─────────────────────── */}
                <div>
                  <button onClick={() => toggleSection('pins')}
                    className="w-full flex items-center justify-between py-2 px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">📍</span>
                      <span className="text-sm font-black" style={{ color: c.textPrimary }}>My Pins</span>
                      {myPins.length > 0 && (
                        <span className="text-[0.55rem] font-black px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: 'rgba(212,168,83,0.12)', color: c.accent }}>{myPins.length}</span>
                      )}
                    </div>
                    {expandedSections.has('pins') ? <ChevronUp size={16} style={{ color: c.textMuted }} /> : <ChevronDown size={16} style={{ color: c.textMuted }} />}
                  </button>
                  {expandedSections.has('pins') && (
                    <div className="space-y-2 mt-1">
                      <div className="flex gap-1.5">
                        {(['all', 'active', 'resolved'] as PinFilter[]).map((f) => (
                          <button key={f} onClick={() => setPinFilter(f)}
                            className="px-3 py-1.5 rounded-full text-xs font-bold transition capitalize"
                            style={{
                              backgroundColor: pinFilter === f ? c.accent : c.bgCard,
                              color: pinFilter === f ? '#fff' : c.textMuted,
                              border: pinFilter === f ? `1.5px solid ${c.accent}` : `1px solid ${c.border}`,
                            }}>
                            {f === 'all' ? `All (${myPins.length})` : f === 'active' ? `Active (${activePins.length})` : `Resolved (${myPins.length - activePins.length})`}
                          </button>
                        ))}
                      </div>
                      {filteredPins.length === 0 ? (
                        <div className="rounded-2xl p-6 flex flex-col items-center gap-2 text-center" style={card}>
                          <span className="text-2xl">📍</span>
                          <p className="text-sm font-bold" style={{ color: c.textMuted }}>{pinFilter === 'all' ? 'No pins yet' : `No ${pinFilter} pins`}</p>
                          {pinFilter === 'all' && (
                            <button
                              onClick={() => setActiveTab('map')}
                              className="mt-1 px-4 py-2 rounded-xl text-xs font-bold transition hover:opacity-80"
                              style={{ backgroundColor: c.accent, color: '#fff' }}
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
                                style={{ backgroundColor: c.bgCard, border: `1px solid ${isEditingPin ? c.accent : c.border}` }}>
                                <div className="flex items-center gap-0">
                                  <div className="w-1 self-stretch shrink-0 rounded-l-2xl"
                                    style={{ backgroundColor: pin.is_emergency ? '#ef4444' : (sev?.color ?? '#6b7490') }} />
                                  <button className="flex-1 px-3 py-2.5 text-left min-w-0"
                                    onClick={() => { setSelectedPin(pin); setActiveSheet('detail'); }}>
                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                      <span className="text-sm font-bold truncate" style={{ color: c.textPrimary }}>
                                        {pin.is_emergency ? '🆘 Emergency' : `${cat?.emoji ?? ''} ${cat?.label ?? pin.category}`}
                                      </span>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-[0.55rem] font-black px-1.5 py-0.5 rounded-full"
                                          style={{ backgroundColor: pinIsActive ? 'rgba(34,197,94,0.12)' : 'rgba(107,114,128,0.12)', color: pinIsActive ? '#22c55e' : '#6b7280' }}>
                                          {pinIsActive ? 'Active' : pin.resolved_at ? 'Resolved' : 'Expired'}
                                        </span>
                                        <span className="text-[0.6rem]" style={{ color: c.textMuted }}>{timeAgo(pin.created_at)}</span>
                                      </div>
                                    </div>
                                    <p className="text-xs line-clamp-1" style={{ color: c.textMuted }}>{pin.description}</p>
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
                                        <X size={12} style={{ color: c.textMuted }} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {isEditingPin && (
                                  <div className="px-3 pb-3 pt-1 flex flex-col gap-2 border-t" style={{ borderColor: c.border }}>
                                    <div className="flex gap-1.5">
                                      {Object.entries(SEVERITY).map(([key, { label, color }]) => (
                                        <button key={key} onClick={() => setEditSeverity(key)}
                                          className="flex-1 py-1 rounded-lg text-[0.6rem] font-black transition"
                                          style={{
                                            backgroundColor: editSeverity === key ? color + '22' : c.bgSecondary,
                                            color: editSeverity === key ? color : c.textMuted,
                                            border: editSeverity === key ? `1.5px solid ${color}` : `1px solid ${c.border}`,
                                          }}>{label}</button>
                                      ))}
                                    </div>
                                    <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2}
                                      className="w-full text-xs rounded-xl px-3 py-2 outline-none resize-none"
                                      style={{ backgroundColor: c.bgSecondary, border: `1px solid ${c.border}`, color: c.textPrimary }} />
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
                      <span className="text-sm font-black" style={{ color: c.textPrimary }}>Trip History</span>
                      {tripHistory.length > 0 && (
                        <span className="text-[0.55rem] font-black px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: 'rgba(212,168,83,0.12)', color: c.accent }}>{tripHistory.length}</span>
                      )}
                    </div>
                    {expandedSections.has('trips') ? <ChevronUp size={16} style={{ color: c.textMuted }} /> : <ChevronDown size={16} style={{ color: c.textMuted }} />}
                  </button>
                  {expandedSections.has('trips') && (
                    <div className="space-y-2 mt-1">
                      {tripHistory.length === 0 ? (
                        <div className="rounded-2xl p-6 flex flex-col items-center gap-2 text-center" style={card}>
                          <span className="text-2xl">🗺️</span>
                          <p className="text-sm font-bold" style={{ color: c.textMuted }}>No trips recorded yet</p>
                          <button
                            onClick={() => setActiveTab('trip')}
                            className="mt-1 px-4 py-2 rounded-xl text-xs font-bold transition hover:opacity-80"
                            style={{ backgroundColor: c.accent, color: '#fff' }}
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
                                <p className="text-sm font-bold truncate" style={{ color: c.textPrimary }}>
                                  {trip.from_label ? `${trip.from_label} → ` : ''}{trip.to_label}
                                </p>
                                <p className="text-[0.6rem]" style={{ color: c.textMuted }}>
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
                      <span className="text-sm font-black" style={{ color: c.textPrimary }}>SOS History</span>
                      {myAlerts.length > 0 && (
                        <span className="text-[0.55rem] font-black px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>{myAlerts.length}</span>
                      )}
                    </div>
                    {expandedSections.has('sos') ? <ChevronUp size={16} style={{ color: c.textMuted }} /> : <ChevronDown size={16} style={{ color: c.textMuted }} />}
                  </button>
                  {expandedSections.has('sos') && (
                    <div className="space-y-2 mt-1">
                      {myAlerts.length === 0 ? (
                        <div className="rounded-2xl p-6 flex flex-col items-center gap-2 text-center" style={card}>
                          <span className="text-2xl">🆘</span>
                          <p className="text-sm font-bold" style={{ color: c.textMuted }}>No SOS signals sent</p>
                        </div>
                      ) : myAlerts.map((pin) => {
                        const pinIsActive = isPinActive(pin);
                        const resolvedAt = pin.resolved_at ? new Date(pin.resolved_at) : null;
                        const createdAt = new Date(pin.created_at);
                        const durationMin = resolvedAt ? Math.round((resolvedAt.getTime() - createdAt.getTime()) / 60_000) : null;
                        return (
                          <button key={pin.id} onClick={() => { setSelectedPin(pin); setActiveSheet('detail'); }}
                            className="w-full rounded-2xl overflow-hidden text-left flex transition active:scale-[0.98]"
                            style={{ backgroundColor: c.bgCard, border: `1.5px solid ${pinIsActive ? '#ef444440' : c.border}` }}>
                            <div className="w-1 shrink-0" style={{ backgroundColor: pinIsActive ? '#ef4444' : '#6b7280' }} />
                            <div className="flex-1 px-3 py-3 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-sm font-black" style={{ color: pinIsActive ? '#ef4444' : c.textPrimary }}>🆘 Emergency alert</span>
                                <span className="text-[0.55rem] font-black px-1.5 py-0.5 rounded-full"
                                  style={{ backgroundColor: pinIsActive ? 'rgba(239,68,68,0.12)' : 'rgba(107,114,128,0.12)', color: pinIsActive ? '#ef4444' : '#6b7280' }}>
                                  {pinIsActive ? 'Active' : 'Resolved'}
                                </span>
                              </div>
                              <p className="text-xs line-clamp-2 mb-1" style={{ color: c.textMuted }}>{pin.description}</p>
                              <p className="text-[0.6rem]" style={{ color: c.textMuted }}>
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
                  style={{ backgroundColor: c.bgCard, border: `1px solid ${c.border}`, color: c.textMuted }}>
                  Sign out
                </button>

                <div className="pb-6" />
              </motion.div>
            )}

              </AnimatePresence>
            </div>{/* /tab content */}
          </div>{/* /flex-col px-5 */}
        </div>{/* /flex-1 overflow-y-auto */}
      </motion.div>

      <SettingsSheet isOpen={showSettings} onClose={() => setShowSettings(false)} />
      {showVerification && <VerificationView onClose={() => setShowVerification(false)} />}


</>
  );
}
