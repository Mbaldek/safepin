// src/components/ProfileView.tsx

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { CATEGORIES, SEVERITY, TripLog, Pin } from '@/types';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import VerificationView from '@/components/VerificationView';
import TrustedCircleSection from '@/components/TrustedCircleSection';
import { computeExpertiseTags } from '@/lib/expertise';
import { Trash2, Pencil, Check, X } from 'lucide-react';

const springTransition = { type: 'spring', damping: 32, stiffness: 320, mass: 0.8 } as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}min ago`;
  if (days < 1) return `${hours}h ago`;
  return `${days}d ago`;
}

function joinedDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en', { month: 'long', year: 'numeric' });
}

function fmtDur(s: number) {
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function fmtDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}

// ─── Trust Score / Levels ────────────────────────────────────────────────────

type Level = { label: string; emoji: string; color: string; min: number; next: number };
const LEVELS: Level[] = [
  { label: 'Watcher',  emoji: '👁',  color: '#6b7280', min: 0,   next: 50  },
  { label: 'Reporter', emoji: '📡',  color: '#6366f1', min: 50,  next: 200 },
  { label: 'Guardian', emoji: '⚔️',  color: '#f59e0b', min: 200, next: 500 },
  { label: 'Sentinel', emoji: '🛡️', color: '#f43f5e', min: 500, next: Infinity },
];

function getLevel(score: number): Level {
  return [...LEVELS].reverse().find((l) => score >= l.min) ?? LEVELS[0];
}

function computeScore(pinsCount: number, alertsCount: number, confirmedVotes: number, commentsMade: number) {
  return pinsCount * 10 + alertsCount * 15 + confirmedVotes * 5 + commentsMade * 2;
}

type PanelTab = 'stats' | 'pins' | 'trips' | 'sos';
type PinFilter = 'all' | 'active' | 'resolved';

const MODE_EMOJI: Record<string, string> = { walk: '🚶', bike: '🚴', drive: '🚗', transit: '🚇' };

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileView({ userId, userEmail, onClose }: { userId: string; userEmail: string; onClose: () => void }) {
  const router = useRouter();
  const { pins, userProfile, setUserProfile, setSelectedPin, setActiveSheet, setPins, updatePin } = useStore();
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const didSaveRef = useRef(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Panel state
  const [panelTab, setPanelTab] = useState<PanelTab>('stats');
  const [pinFilter, setPinFilter] = useState<PinFilter>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingPinId, setEditingPinId] = useState<string | null>(null);
  const [editSeverity, setEditSeverity] = useState<string>('');
  const [editDesc, setEditDesc] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Impact stats
  const [confirmedVotes, setConfirmedVotes] = useState(0);
  const [commentsMade, setCommentsMade] = useState(0);
  const [placeNotesCount, setPlaceNotesCount] = useState(0);
  const [impactLoaded, setImpactLoaded] = useState(false);

  // Trip history
  const [tripHistory, setTripHistory] = useState<TripLog[]>([]);
  const [tripsLoaded, setTripsLoaded] = useState(false);

  useEffect(() => { setNameInput(userProfile?.display_name ?? ''); }, [userProfile]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  // Load impact stats
  useEffect(() => {
    if (impactLoaded) return;
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

  // Load trip history (limit 20)
  useEffect(() => {
    if (tripsLoaded) return;
    supabase
      .from('trip_log').select('*').eq('user_id', userId)
      .order('ended_at', { ascending: false }).limit(20)
      .then(({ data }) => { setTripHistory((data as TripLog[]) ?? []); setTripsLoaded(true); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ── Derived data ─────────────────────────────────────────────────────────

  const displayName = userProfile?.display_name ?? null;
  const initial = (displayName?.[0] ?? userEmail[0] ?? '?').toUpperCase();

  const myPins = useMemo(() =>
    pins
      .filter((p) => p.user_id === userId)
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
  function isActive(pin: Pin) {
    if (pin.resolved_at) return false;
    const base = pin.last_confirmed_at
      ? Math.max(new Date(pin.created_at).getTime(), new Date(pin.last_confirmed_at).getTime())
      : new Date(pin.created_at).getTime();
    return (now - base) / 3_600_000 < (pin.is_emergency ? 2 : 24);
  }
  const activePins = myPins.filter(isActive);

  const filteredPins = useMemo(() => {
    if (pinFilter === 'active')   return myPins.filter(isActive);
    if (pinFilter === 'resolved') return myPins.filter((p) => !isActive(p));
    return myPins;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myPins, pinFilter]);

  // ── Actions ──────────────────────────────────────────────────────────────

  async function saveName() {
    if (didSaveRef.current || saving) return;
    const trimmed = nameInput.trim();
    if (!trimmed) { setEditing(false); return; }
    didSaveRef.current = true;
    setSaving(true);
    const { error } = await supabase.from('profiles').upsert({ id: userId, display_name: trimmed });
    setSaving(false);
    didSaveRef.current = false;
    if (error) { toast.error(`Save failed: ${error.message}`); return; }
    setUserProfile({ id: userId, display_name: trimmed, created_at: userProfile?.created_at ?? new Date().toISOString() });
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
    if (upErr) { toast.error('Upload failed'); setAvatarUploading(false); return; }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const avatar_url = urlData.publicUrl + '?t=' + Date.now();
    const { error: dbErr } = await supabase.from('profiles').update({ avatar_url }).eq('id', userId);
    if (dbErr) { toast.error('Failed to save photo'); setAvatarUploading(false); return; }
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
    const { error } = await supabase
      .from('pins')
      .update({ severity: editSeverity, description: editDesc.trim() })
      .eq('id', pin.id);
    setEditSaving(false);
    if (error) { toast.error('Could not save changes'); return; }
    updatePin({ ...pin, severity: editSeverity as Pin['severity'], description: editDesc.trim() });
    setEditingPinId(null);
    toast.success('Pin updated');
  }

  // ── Panel tab config ──────────────────────────────────────────────────────

  const TABS: { id: PanelTab; emoji: string; label: string; count?: number }[] = [
    { id: 'stats', emoji: '📊', label: 'Stats' },
    { id: 'pins',  emoji: '📍', label: 'Pins',  count: myPins.length },
    { id: 'trips', emoji: '🗺️', label: 'Trips', count: tripHistory.length > 0 ? tripHistory.length : undefined },
    { id: 'sos',   emoji: '🆘', label: 'SOS',   count: myAlerts.length > 0 ? myAlerts.length : undefined },
  ];

  // ── Common styles ─────────────────────────────────────────────────────────

  const card = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 z-60"
        style={{ backgroundColor: 'var(--bg-overlay)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        className="sheet-motion absolute bottom-0 left-1/2 -translate-x-1/2 w-[92%] max-w-110 rounded-t-3xl z-61 flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--bg-secondary)', maxHeight: 'calc(100dvh - 120px)' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={springTransition}
      >
        {/* Header bar with close button */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full mx-auto" style={{ backgroundColor: 'var(--border)' }} />
        </div>
        <div className="flex items-center justify-between px-4 pb-2 shrink-0">
          <span className="text-base font-black" style={{ color: 'var(--text-primary)' }}>My Profile</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full transition active:opacity-60"
            style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-card)' }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="max-w-110 mx-auto w-full px-4 py-2 flex flex-col gap-5">

        {/* ── Avatar + name ─────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <div className="relative">
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-3xl font-black text-white shadow-lg relative group"
              style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)', boxShadow: '0 8px 24px rgba(244,63,94,0.35)' }}
              title="Change profile photo"
            >
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : avatarUploading ? (
                <span className="text-sm animate-pulse">⏳</span>
              ) : (
                initial
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity">
                <span className="text-xs font-bold text-white">📷</span>
              </div>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <div
              className="absolute -bottom-1 -right-1 flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.55rem] font-black border-2"
              style={{ backgroundColor: level.color + '18', color: level.color, borderColor: 'var(--bg-primary)' }}
            >
              {level.emoji} {level.label}
            </div>
          </div>

          {editing ? (
            <div className="flex flex-col items-center gap-2 w-full max-w-65">
              <input
                ref={inputRef}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveName(); } if (e.key === 'Escape') cancelEdit(); }}
                placeholder="Your name…"
                className="w-full text-center text-lg font-bold outline-none rounded-xl px-3 py-1.5"
                style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--accent)', color: 'var(--text-primary)' }}
              />
              <div className="flex gap-2 w-full">
                <button onClick={cancelEdit} className="flex-1 py-1.5 rounded-xl text-sm font-bold transition hover:opacity-80"
                  style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  Cancel
                </button>
                <button onClick={saveName} disabled={saving} className="flex-1 py-1.5 rounded-xl text-sm font-bold transition hover:opacity-80 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={startEditing} className="flex items-center gap-1.5 group">
              <span className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>
                {displayName ?? 'Set your name'}
              </span>
              <span className="text-sm opacity-0 group-hover:opacity-60 transition" style={{ color: 'var(--text-muted)' }}>✏️</span>
            </button>
          )}

          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{userEmail}</p>
          {userProfile?.created_at && (
            <p className="text-[0.65rem] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Member since {joinedDate(userProfile.created_at)}
            </p>
          )}

          {expertiseTags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5">
              {expertiseTags.map((tag) => (
                <span
                  key={tag.label}
                  className="text-[0.6rem] font-black px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: tag.color + '18', color: tag.color, border: `1px solid ${tag.color}40` }}
                >
                  {tag.emoji} {tag.label}
                </span>
              ))}
            </div>
          )}

          {userProfile?.verification_status === 'approved' ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black"
              style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1.5px solid rgba(16,185,129,0.3)' }}>
              ✅ Verified identity
            </div>
          ) : userProfile?.verification_status === 'pending' ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
              style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1.5px solid rgba(245,158,11,0.3)' }}>
              ⏳ Verification under review
            </div>
          ) : (
            <button onClick={() => setShowVerification(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition hover:opacity-80"
              style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1.5px solid var(--border)' }}>
              🪪 Verify your identity
            </button>
          )}
        </div>

        {/* ── Trust Score bar ───────────────────────────────────── */}
        <div
          className="rounded-2xl p-4 flex flex-col gap-2.5"
          style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${level.color}33` }}
        >
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
            <span className="text-2xl font-black" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              {trustScore}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, progress * 100)}%`, backgroundColor: level.color }}
            />
          </div>
        </div>

        {/* ── Activity panels ────────────────────────────────────── */}

        {/* Tab row */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setPanelTab(t.id)}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition shrink-0"
              style={{
                backgroundColor: panelTab === t.id ? 'var(--accent)' : 'var(--bg-card)',
                color: panelTab === t.id ? '#fff' : 'var(--text-muted)',
                border: panelTab === t.id ? '1.5px solid var(--accent)' : '1px solid var(--border)',
              }}
            >
              <span>{t.emoji}</span>
              <span>{t.label}</span>
              {t.count != null && t.count > 0 && (
                <span
                  className="text-[0.5rem] px-1.5 py-0.5 rounded-full font-black"
                  style={{
                    backgroundColor: panelTab === t.id ? 'rgba(255,255,255,0.25)' : 'rgba(244,63,94,0.12)',
                    color: panelTab === t.id ? '#fff' : 'var(--accent)',
                  }}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Stats panel ───────────────────────────────────────── */}
        {panelTab === 'stats' && (
          <>
            <div>
              <p className="text-[0.7rem] font-black uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-muted)' }}>
                Your Impact
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Reports made',        value: myReports.length,  emoji: '📋', color: '#6366f1' },
                  { label: 'Confirmed by others', value: confirmedVotes,    emoji: '👍', color: '#22c55e' },
                  { label: 'Active right now',    value: activePins.length, emoji: '🔴', color: '#f43f5e' },
                  { label: 'Comments written',    value: commentsMade,      emoji: '💬', color: '#f59e0b' },
                  { label: 'Place notes',         value: placeNotesCount,   emoji: '📌', color: '#8b5cf6' },
                ].map(({ label, value, emoji, color }) => (
                  <div
                    key={label}
                    className="rounded-2xl p-3.5 flex flex-col gap-1"
                    style={card}
                  >
                    <span className="text-xl">{emoji}</span>
                    <span className="text-2xl font-black" style={{ color, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
                    <span className="text-[0.6rem] font-bold uppercase tracking-wide leading-tight" style={{ color: 'var(--text-muted)' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <TrustedCircleSection userId={userId} />
          </>
        )}

        {/* ── Pins panel ────────────────────────────────────────── */}
        {panelTab === 'pins' && (
          <>
            {/* Filter chips */}
            <div className="flex gap-1.5">
              {(['all', 'active', 'resolved'] as PinFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setPinFilter(f)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold transition capitalize"
                  style={{
                    backgroundColor: pinFilter === f ? 'var(--accent)' : 'var(--bg-card)',
                    color:           pinFilter === f ? '#fff'          : 'var(--text-muted)',
                    border:          pinFilter === f ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  }}
                >
                  {f === 'all' ? `All (${myPins.length})` : f === 'active' ? `Active (${activePins.length})` : `Resolved (${myPins.length - activePins.length})`}
                </button>
              ))}
            </div>

            {filteredPins.length === 0 ? (
              <div className="rounded-2xl p-6 flex flex-col items-center gap-2 text-center" style={card}>
                <span className="text-2xl">📍</span>
                <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
                  {pinFilter === 'all' ? 'No pins yet' : `No ${pinFilter} pins`}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredPins.map((pin) => {
                  const cat = CATEGORIES[pin.category as keyof typeof CATEGORIES];
                  const sev = SEVERITY[pin.severity as keyof typeof SEVERITY];
                  const pinIsActive = isActive(pin);
                  const canManage = !pin.is_emergency;
                  const isEditing = editingPinId === pin.id;
                  const isConfirmingDelete = confirmDeleteId === pin.id;

                  return (
                    <div
                      key={pin.id}
                      className="rounded-2xl overflow-hidden"
                      style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${isEditing ? 'var(--accent)' : 'var(--border)'}` }}
                    >
                      {/* Pin row */}
                      <div className="flex items-center gap-0">
                        {/* Severity strip */}
                        <div
                          className="w-1 self-stretch shrink-0 rounded-l-2xl"
                          style={{ backgroundColor: pin.is_emergency ? '#ef4444' : (sev?.color ?? '#6b7490') }}
                        />
                        {/* Main content */}
                        <button
                          className="flex-1 px-3 py-2.5 text-left min-w-0"
                          onClick={() => { setSelectedPin(pin); setActiveSheet('detail'); }}
                        >
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                              {pin.is_emergency ? '🆘 Emergency' : `${cat?.emoji ?? ''} ${cat?.label ?? pin.category}`}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className="text-[0.55rem] font-black px-1.5 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: pinIsActive ? 'rgba(34,197,94,0.12)' : 'rgba(107,114,128,0.12)',
                                  color:           pinIsActive ? '#22c55e' : '#6b7280',
                                }}
                              >
                                {pinIsActive ? 'Active' : pin.resolved_at ? 'Resolved' : 'Expired'}
                              </span>
                              <span className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>
                                {timeAgo(pin.created_at)}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs line-clamp-1" style={{ color: 'var(--text-muted)' }}>{pin.description}</p>
                        </button>
                        {/* Action buttons (non-emergency only) */}
                        {canManage && !isEditing && (
                          <div className="flex items-center gap-1 pr-2 shrink-0">
                            <button
                              onClick={() => startPinEdit(pin)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center transition hover:opacity-70"
                              style={{ backgroundColor: 'rgba(99,102,241,0.10)' }}
                              title="Edit"
                            >
                              <Pencil size={11} style={{ color: '#6366f1' }} />
                            </button>
                            {isConfirmingDelete ? (
                              <button
                                onClick={() => deletePin(pin)}
                                className="px-2 h-7 rounded-lg flex items-center justify-center text-[0.6rem] font-black transition"
                                style={{ backgroundColor: '#ef4444', color: '#fff' }}
                                title="Confirm delete"
                              >
                                Delete?
                              </button>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(pin.id)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center transition hover:opacity-70"
                                style={{ backgroundColor: 'rgba(239,68,68,0.10)' }}
                                title="Delete"
                              >
                                <Trash2 size={11} style={{ color: '#ef4444' }} />
                              </button>
                            )}
                          </div>
                        )}
                        {isEditing && (
                          <div className="flex items-center gap-1 pr-2 shrink-0">
                            <button
                              onClick={() => savePinEdit(pin)}
                              disabled={editSaving}
                              className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}
                            >
                              <Check size={12} style={{ color: '#22c55e' }} />
                            </button>
                            <button
                              onClick={() => setEditingPinId(null)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: 'rgba(107,114,128,0.10)' }}
                            >
                              <X size={12} style={{ color: 'var(--text-muted)' }} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Inline edit form */}
                      {isEditing && (
                        <div className="px-3 pb-3 pt-1 flex flex-col gap-2 border-t" style={{ borderColor: 'var(--border)' }}>
                          {/* Severity chips */}
                          <div className="flex gap-1.5">
                            {Object.entries(SEVERITY).map(([key, { label, color }]) => (
                              <button
                                key={key}
                                onClick={() => setEditSeverity(key)}
                                className="flex-1 py-1 rounded-lg text-[0.6rem] font-black transition"
                                style={{
                                  backgroundColor: editSeverity === key ? color + '22' : 'var(--bg-secondary)',
                                  color:           editSeverity === key ? color : 'var(--text-muted)',
                                  border:          editSeverity === key ? `1.5px solid ${color}` : '1px solid var(--border)',
                                }}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          {/* Description */}
                          <textarea
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            rows={2}
                            className="w-full text-xs rounded-xl px-3 py-2 outline-none resize-none"
                            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Trips panel ───────────────────────────────────────── */}
        {panelTab === 'trips' && (
          <>
            {tripHistory.length === 0 ? (
              <div className="rounded-2xl p-6 flex flex-col items-center gap-2 text-center" style={card}>
                <span className="text-2xl">🗺️</span>
                <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>No trips recorded yet</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Completed trips appear here</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {tripHistory.map((t) => {
                  const dangerColor = t.danger_score === 0 ? '#22c55e' : t.danger_score <= 2 ? '#f59e0b' : '#ef4444';
                  return (
                    <div
                      key={t.id}
                      className="rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
                      style={card}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xl shrink-0">{MODE_EMOJI[t.mode] ?? '🗺️'}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                            {t.from_label ? `${t.from_label} → ` : ''}{t.to_label}
                          </p>
                          <p className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>
                            {fmtDist(t.distance_m)} · {fmtDur(t.duration_s)} · {new Date(t.ended_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <span
                        className="text-[0.55rem] font-black px-2 py-0.5 rounded-full shrink-0"
                        style={{ backgroundColor: dangerColor + '18', color: dangerColor }}
                      >
                        {t.danger_score === 0 ? 'Clear' : `${t.danger_score} risk`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── SOS panel ─────────────────────────────────────────── */}
        {panelTab === 'sos' && (
          <>
            {myAlerts.length === 0 ? (
              <div className="rounded-2xl p-6 flex flex-col items-center gap-2 text-center" style={card}>
                <span className="text-2xl">🆘</span>
                <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>No SOS signals sent</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Emergency alerts you've triggered will appear here</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {myAlerts.map((pin) => {
                  const pinIsActive = isActive(pin);
                  const resolvedAt = pin.resolved_at ? new Date(pin.resolved_at) : null;
                  const createdAt = new Date(pin.created_at);
                  const durationMin = resolvedAt
                    ? Math.round((resolvedAt.getTime() - createdAt.getTime()) / 60_000)
                    : null;
                  return (
                    <button
                      key={pin.id}
                      onClick={() => { setSelectedPin(pin); setActiveSheet('detail'); }}
                      className="rounded-2xl overflow-hidden text-left flex transition active:scale-[0.98]"
                      style={{ backgroundColor: 'var(--bg-card)', border: `1.5px solid ${pinIsActive ? '#ef444440' : 'var(--border)'}` }}
                    >
                      <div
                        className="w-1 shrink-0"
                        style={{ backgroundColor: pinIsActive ? '#ef4444' : '#6b7280' }}
                      />
                      <div className="flex-1 px-3 py-3 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm font-black" style={{ color: pinIsActive ? '#ef4444' : 'var(--text-primary)' }}>
                            🆘 Emergency alert
                          </span>
                          <span
                            className="text-[0.55rem] font-black px-1.5 py-0.5 rounded-full"
                            style={{
                              backgroundColor: pinIsActive ? 'rgba(239,68,68,0.12)' : 'rgba(107,114,128,0.12)',
                              color:           pinIsActive ? '#ef4444' : '#6b7280',
                            }}
                          >
                            {pinIsActive ? 'Active' : 'Resolved'}
                          </span>
                        </div>
                        <p className="text-xs line-clamp-2 mb-1" style={{ color: 'var(--text-muted)' }}>
                          {pin.description}
                        </p>
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
          </>
        )}

        {/* ── Sign out ──────────────────────────────────────────── */}
        <button
          onClick={handleSignOut}
          className="w-full py-3.5 rounded-2xl font-bold text-sm transition hover:opacity-80 mt-2"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          Sign out
        </button>

        <div className="pb-6" />
      </div>
        </div>
      </motion.div>

      {showVerification && <VerificationView onClose={() => setShowVerification(false)} />}
    </>
  );
}
