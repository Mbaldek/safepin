// src/components/ProfileView.tsx

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { CATEGORIES, SEVERITY, TripLog } from '@/types';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import VerificationView from '@/components/VerificationView';
import TrustedCircleSection from '@/components/TrustedCircleSection';
import { computeExpertiseTags } from '@/lib/expertise';

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileView({ userId, userEmail }: { userId: string; userEmail: string }) {
  const router = useRouter();
  const { pins, userProfile, setUserProfile, setSelectedPin, setActiveSheet } = useStore();
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const didSaveRef = useRef(false);

  // Impact stats (fetched once)
  const [confirmedVotes, setConfirmedVotes] = useState(0);
  const [commentsMade, setCommentsMade] = useState(0);
  const [placeNotesCount, setPlaceNotesCount] = useState(0);
  const [impactLoaded, setImpactLoaded] = useState(false);

  // Trip history
  const [tripHistory, setTripHistory] = useState<TripLog[]>([]);
  const [tripsLoaded, setTripsLoaded] = useState(false);

  useEffect(() => {
    setNameInput(userProfile?.display_name ?? '');
  }, [userProfile]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  // Load impact stats
  useEffect(() => {
    if (impactLoaded) return;
    async function loadImpact() {
      const myPinIds = pins.filter((p) => p.user_id === userId).map((p) => p.id);

      const [votesRes, commentsRes, notesRes] = await Promise.all([
        myPinIds.length > 0
          ? supabase
              .from('pin_votes')
              .select('*', { count: 'exact', head: true })
              .in('pin_id', myPinIds)
              .eq('vote_type', 'confirm')
          : Promise.resolve({ count: 0 }),
        supabase
          .from('pin_comments')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from('place_notes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId),
      ]);

      setConfirmedVotes((votesRes as { count: number | null }).count ?? 0);
      setCommentsMade((commentsRes as { count: number | null }).count ?? 0);
      setPlaceNotesCount((notesRes as { count: number | null }).count ?? 0);
      setImpactLoaded(true);
    }
    loadImpact();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, pins.length]);

  // Load trip history
  useEffect(() => {
    if (tripsLoaded) return;
    supabase
      .from('trip_log')
      .select('*')
      .eq('user_id', userId)
      .order('ended_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setTripHistory((data as TripLog[]) ?? []);
        setTripsLoaded(true);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const displayName = userProfile?.display_name ?? null;
  const initial = (displayName?.[0] ?? userEmail[0] ?? '?').toUpperCase();

  const myPins   = useMemo(() =>
    pins
      .filter((p) => p.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [pins, userId]
  );
  const myReports  = myPins.filter((p) => !p.is_emergency);
  const myAlerts   = myPins.filter((p) => p.is_emergency);
  const recentPins = myPins.slice(0, 5);

  const trustScore = computeScore(myReports.length, myAlerts.length, confirmedVotes, commentsMade);
  const level      = getLevel(trustScore);
  const progress   = level.next === Infinity ? 1 : (trustScore - level.min) / (level.next - level.min);

  const expertiseTags = useMemo(() =>
    computeExpertiseTags(
      pins,
      userId,
      userProfile?.verification_status === 'approved',
      level.label,
    ),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [pins.length, userId, userProfile?.verification_status, level.label]);

  // Active pins (not resolved, not expired)
  const now = Date.now();
  const activePins = myPins.filter((p) => {
    if (p.resolved_at) return false;
    const base = p.last_confirmed_at
      ? Math.max(new Date(p.created_at).getTime(), new Date(p.last_confirmed_at).getTime())
      : new Date(p.created_at).getTime();
    return (now - base) / 3_600_000 < (p.is_emergency ? 2 : 24);
  });

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
  function cancelEdit() {
    didSaveRef.current = true;
    setNameInput(userProfile?.display_name ?? '');
    setEditing(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-110 mx-auto w-full px-4 py-6 flex flex-col gap-5">

        {/* ── Avatar + name ─────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <div className="relative">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-lg"
              style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)', boxShadow: '0 8px 24px rgba(244,63,94,0.35)' }}
            >
              {initial}
            </div>
            {/* Level badge over avatar */}
            <div
              className="absolute -bottom-1 -right-1 flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.55rem] font-black border-2"
              style={{
                backgroundColor: level.color + '18',
                color: level.color,
                borderColor: 'var(--bg-primary)',
              }}
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

          {/* Expertise tags */}
          {expertiseTags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5">
              {expertiseTags.map((tag) => (
                <span
                  key={tag.label}
                  className="text-[0.6rem] font-black px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor: tag.color + '18',
                    color: tag.color,
                    border: `1px solid ${tag.color}40`,
                  }}
                >
                  {tag.emoji} {tag.label}
                </span>
              ))}
            </div>
          )}

          {/* Verification badge */}
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

        {/* ── Impact Dashboard ──────────────────────────────────── */}
        <div>
          <p className="text-[0.7rem] font-black uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-muted)' }}>
            Your Impact
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Reports made',        value: myReports.length,   emoji: '📋', color: '#6366f1' },
              { label: 'Confirmed by others', value: confirmedVotes,     emoji: '👍', color: '#22c55e' },
              { label: 'Active right now',    value: activePins.length,  emoji: '🔴', color: '#f43f5e' },
              { label: 'Comments written',    value: commentsMade,       emoji: '💬', color: '#f59e0b' },
              { label: 'Place notes',         value: placeNotesCount,    emoji: '📌', color: '#8b5cf6' },
            ].map(({ label, value, emoji, color }) => (
              <div
                key={label}
                className="rounded-2xl p-3.5 flex flex-col gap-1"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <span className="text-xl">{emoji}</span>
                <span className="text-2xl font-black" style={{ color, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
                <span className="text-[0.6rem] font-bold uppercase tracking-wide leading-tight" style={{ color: 'var(--text-muted)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Trusted Circle ────────────────────────────────────── */}
        <TrustedCircleSection userId={userId} />

        {/* ── Trip History ──────────────────────────────────────── */}
        {tripHistory.length > 0 && (
          <div>
            <p className="text-[0.7rem] font-black uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-muted)' }}>
              Trip History
            </p>
            <div className="flex flex-col gap-2">
              {tripHistory.map((t) => {
                const modeEmoji: Record<string, string> = { walk: '🚶', bike: '🚴', drive: '🚗', transit: '🚇' };
                const distKm = t.distance_m >= 1000
                  ? `${(t.distance_m / 1000).toFixed(1)} km`
                  : `${t.distance_m} m`;
                const durationMin = Math.round(t.duration_s / 60);
                const dangerColor = t.danger_score === 0 ? '#22c55e' : t.danger_score <= 2 ? '#f59e0b' : '#ef4444';
                return (
                  <div
                    key={t.id}
                    className="rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl shrink-0">{modeEmoji[t.mode] ?? '🗺️'}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                          {t.from_label ? `${t.from_label} → ` : ''}{t.to_label}
                        </p>
                        <p className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>
                          {distKm} · {durationMin} min · {new Date(t.ended_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
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
          </div>
        )}

        {/* ── Recent Activity ───────────────────────────────────── */}
        <div>
          <p className="text-[0.7rem] font-black uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-muted)' }}>
            Recent Activity
          </p>
          {recentPins.length === 0 ? (
            <div className="rounded-2xl p-5 flex flex-col items-center gap-2 text-center"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <span className="text-2xl">🗺️</span>
              <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>No reports yet</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Your pins will appear here</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {recentPins.map((pin) => {
                const cat = CATEGORIES[pin.category as keyof typeof CATEGORIES];
                const sev = SEVERITY[pin.severity as keyof typeof SEVERITY];
                return (
                  <button
                    key={pin.id}
                    onClick={() => { setSelectedPin(pin); setActiveSheet('detail'); }}
                    className="w-full text-left rounded-2xl overflow-hidden flex transition active:scale-[0.98]"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  >
                    <div className="w-1 shrink-0 rounded-l-2xl"
                      style={{ backgroundColor: pin.is_emergency ? '#ef4444' : (sev?.color ?? '#6b7490') }} />
                    <div className="flex-1 px-3 py-2.5 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                          {pin.is_emergency ? '🆘 Emergency' : `${cat?.emoji} ${cat?.label ?? pin.category}`}
                        </span>
                        <span className="text-[0.6rem] font-bold shrink-0" style={{ color: 'var(--text-muted)' }}>
                          {timeAgo(pin.created_at)}
                        </span>
                      </div>
                      <p className="text-xs line-clamp-1" style={{ color: 'var(--text-muted)' }}>{pin.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Sign out ──────────────────────────────────────────── */}
        <button
          onClick={handleSignOut}
          className="w-full py-3.5 rounded-2xl font-bold text-sm transition hover:opacity-80 mt-2"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          Sign out
        </button>

        <div className="pb-4" />
      </div>

      {showVerification && <VerificationView onClose={() => setShowVerification(false)} />}
    </div>
  );
}
