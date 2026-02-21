// src/components/ProfileView.tsx

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { CATEGORIES, SEVERITY } from '@/types';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

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

export default function ProfileView({ userId, userEmail }: { userId: string; userEmail: string }) {
  const router = useRouter();
  const { pins, userProfile, setUserProfile, setSelectedPin, setActiveSheet } = useStore();
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const didSaveRef = useRef(false);

  useEffect(() => {
    setNameInput(userProfile?.display_name ?? '');
  }, [userProfile]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  // Derive initial from display_name or email
  const displayName = userProfile?.display_name ?? null;
  const initial = (displayName?.[0] ?? userEmail[0] ?? '?').toUpperCase();

  // Own pins from store
  const myPins = useMemo(() =>
    pins
      .filter((p) => p.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [pins, userId]
  );
  const myReports   = myPins.filter((p) => !p.is_emergency);
  const myAlerts    = myPins.filter((p) => p.is_emergency);
  const recentPins  = myPins.slice(0, 5);

  async function saveName() {
    if (didSaveRef.current || saving) return;
    const trimmed = nameInput.trim();
    if (!trimmed) { setEditing(false); return; }
    didSaveRef.current = true;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, display_name: trimmed });
    setSaving(false);
    didSaveRef.current = false;
    if (error) { console.error('[ProfileView] upsert error:', error); toast.error(`Save failed: ${error.message}`); return; }
    setUserProfile({
      id: userId,
      display_name: trimmed,
      created_at: userProfile?.created_at ?? new Date().toISOString(),
    });
    setEditing(false);
    toast.success('Name updated');
  }

  function startEditing() {
    didSaveRef.current = false;
    setEditing(true);
  }

  function cancelEdit() {
    didSaveRef.current = true; // prevent blur from saving
    setNameInput(userProfile?.display_name ?? '');
    setEditing(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-[440px] mx-auto w-full px-4 py-6 flex flex-col gap-5">

        {/* ── Avatar + name ─────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-3 pt-2">
          {/* Avatar circle */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-lg"
            style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)', boxShadow: '0 8px 24px rgba(244,63,94,0.35)' }}
          >
            {initial}
          </div>

          {/* Editable display name */}
          {editing ? (
            <div className="flex flex-col items-center gap-2 w-full max-w-[260px]">
              <input
                ref={inputRef}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveName(); } if (e.key === 'Escape') cancelEdit(); }}
                placeholder="Your name…"
                className="w-full text-center text-lg font-bold outline-none rounded-xl px-3 py-1.5"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1.5px solid var(--accent)',
                  color: 'var(--text-primary)',
                }}
              />
              <div className="flex gap-2 w-full">
                <button
                  onClick={cancelEdit}
                  className="flex-1 py-1.5 rounded-xl text-sm font-bold transition hover:opacity-80"
                  style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveName}
                  disabled={saving}
                  className="flex-1 py-1.5 rounded-xl text-sm font-bold transition hover:opacity-80 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={startEditing}
              className="flex items-center gap-1.5 group"
            >
              <span className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>
                {displayName ?? 'Set your name'}
              </span>
              <span className="text-sm opacity-0 group-hover:opacity-60 transition" style={{ color: 'var(--text-muted)' }}>
                ✏️
              </span>
            </button>
          )}

          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{userEmail}</p>
          {userProfile?.created_at && (
            <p className="text-[0.65rem] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Member since {joinedDate(userProfile.created_at)}
            </p>
          )}
        </div>

        {/* ── Stats ─────────────────────────────────────────────── */}
        <div
          className="grid grid-cols-3 gap-3 rounded-2xl p-4"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          {[
            { label: 'Reports',  value: myReports.length, emoji: '📋' },
            { label: 'Alerts',   value: myAlerts.length,  emoji: '🆘' },
            { label: 'Total',    value: myPins.length,    emoji: '📍' },
          ].map(({ label, value, emoji }) => (
            <div key={label} className="flex flex-col items-center gap-0.5">
              <span className="text-xl">{emoji}</span>
              <span className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{value}</span>
              <span className="text-[0.6rem] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* ── Recent activity ───────────────────────────────────── */}
        <div>
          <p className="text-[0.7rem] font-black uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-muted)' }}>
            Recent Activity
          </p>

          {recentPins.length === 0 ? (
            <div
              className="rounded-2xl p-5 flex flex-col items-center gap-2 text-center"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
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
                    {/* severity bar */}
                    <div
                      className="w-1 shrink-0 rounded-l-2xl"
                      style={{ backgroundColor: pin.is_emergency ? '#ef4444' : (sev?.color ?? '#6b7490') }}
                    />
                    <div className="flex-1 px-3 py-2.5 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                          {pin.is_emergency ? '🆘 Emergency' : `${cat?.emoji} ${cat?.label ?? pin.category}`}
                        </span>
                        <span className="text-[0.6rem] font-bold shrink-0" style={{ color: 'var(--text-muted)' }}>
                          {timeAgo(pin.created_at)}
                        </span>
                      </div>
                      <p className="text-xs line-clamp-1" style={{ color: 'var(--text-muted)' }}>
                        {pin.description}
                      </p>
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
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
          }}
        >
          Sign out
        </button>

        <div className="pb-4" />
      </div>
    </div>
  );
}
