'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Play, Pause, Download, Trash2, Clock, Home } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/stores/useTheme';
import type { WalkSession, AudioCheckin } from '@/types';

// ─── Design tokens ────────────────────────────────────────────────────────────
const TEAL      = '#3BB4C1';
const TEAL12    = 'rgba(59,180,193,0.12)';
const TEAL24    = 'rgba(59,180,193,0.24)';
const GREEN     = '#34D399';
const GREEN12   = 'rgba(52,211,153,0.12)';
const GREEN30   = 'rgba(52,211,153,0.30)';

// ─── Types ────────────────────────────────────────────────────────────────────
interface WalkHistorySheetProps {
  userId: string;
  onClose: () => void;
}

type SessionWithAudio = WalkSession & {
  audio: AudioCheckin | null;
  companionName: string | null;
  durationMin: number | null;
  daysUntilExpiry: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' }) +
    ' · ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function daysUntilExpiry(createdAt: string): number {
  const expiry = new Date(new Date(createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);
  return Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// ─── Audio Player ─────────────────────────────────────────────────────────────
function AudioPlayer({ checkin, isDark, onDelete }: { checkin: AudioCheckin; isDark: boolean; onDelete: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [totalTime, setTotalTime] = useState('0:00');
  const [deleting, setDeleting] = useState(false);

  const borderCol  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.07)';
  const bgPlayer   = isDark ? '#283548' : '#F8FAFC';
  const mutedCol   = isDark ? '#64748B' : '#94A3B8';

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const cur = audioRef.current.currentTime;
    const dur = audioRef.current.duration || 0;
    setProgress(dur > 0 ? (cur / dur) * 100 : 0);
    setCurrentTime(formatDuration(Math.floor(cur)));
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setTotalTime(formatDuration(Math.floor(audioRef.current.duration || 0)));
  };

  const handleEnded = () => setPlaying(false);

  const handleDelete = async () => {
    setDeleting(true);
    // Extract storage path from URL
    const url = new URL(checkin.audio_url);
    const pathMatch = url.pathname.match(/\/object\/public\/pin-photos\/(.*)/);
    if (pathMatch) {
      await supabase.storage.from('pin-photos').remove([pathMatch[1]]);
    }
    await supabase.from('audio_checkins').delete().eq('id', checkin.id);
    setDeleting(false);
    onDelete();
  };

  const fileSizeMo = checkin.duration_s
    ? `${(checkin.duration_s * 16 / 8 / 1024).toFixed(0)} Mo`
    : '';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: bgPlayer, border: `1px solid ${borderCol}`,
      borderRadius: 12, padding: '9px 12px', margin: '8px 0',
    }}>
      <audio
        ref={audioRef}
        src={checkin.audio_url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />
      <button
        onClick={togglePlay}
        style={{
          width: 28, height: 28, borderRadius: '50%', background: TEAL,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', cursor: 'pointer', flexShrink: 0,
        }}
      >
        {playing
          ? <Pause size={11} color="white" fill="white" />
          : <Play size={11} color="white" fill="white" />}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ height: 3, background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)', borderRadius: 99, marginBottom: 4, position: 'relative', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: TEAL, borderRadius: 99 }} />
        </div>
        <div style={{ fontSize: 9, color: mutedCol, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {currentTime} / {checkin.duration_s ? formatDuration(checkin.duration_s) : totalTime}{fileSizeMo ? ` · ${fileSizeMo}` : ''}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <a
          href={checkin.audio_url}
          download
          style={{
            width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', border: `1px solid ${borderCol}`,
            background: isDark ? 'rgba(255,255,255,0.07)' : 'white', textDecoration: 'none',
          }}
        >
          <Download size={13} color={isDark ? '#94A3B8' : 'rgba(15,23,42,0.5)'} />
        </a>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', border: '1px solid rgba(239,68,68,0.2)',
            background: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
            opacity: deleting ? 0.5 : 1,
          }}
        >
          <Trash2 size={13} color="#EF4444" />
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function WalkHistorySheet({ userId, onClose }: WalkHistorySheetProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [tab, setTab] = useState<'mes' | 'rejointes'>('mes');
  const [sessions, setSessions] = useState<SessionWithAudio[]>([]);
  const [loading, setLoading] = useState(true);
  const [audioMap, setAudioMap] = useState<Record<string, AudioCheckin>>({});

  // ─── Theme ───────────────────────────────────────────────────────────────
  const bg      = isDark ? '#1E293B' : '#FFFFFF';
  const card    = isDark ? '#283548' : '#F8FAFC';
  const border  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.07)';
  const text    = isDark ? '#F1F5F9' : '#0F172A';
  const muted   = isDark ? '#94A3B8' : '#64748B';
  const subtle  = isDark ? '#475569' : '#94A3B8';
  const tabBg   = isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9';
  const tabAct  = isDark ? 'rgba(255,255,255,0.10)' : '#FFFFFF';

  // ─── Fetch sessions ───────────────────────────────────────────────────────
  const fetchSessions = useCallback(async (currentTab: 'mes' | 'rejointes') => {
    setLoading(true);
    const field = currentTab === 'mes' ? 'creator_id' : 'companion_id';
    const { data: rows } = await supabase
      .from('walk_sessions')
      .select('*')
      .eq(field, userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(30);

    if (!rows || rows.length === 0) { setSessions([]); setLoading(false); return; }

    const ids = rows.map((r: WalkSession) => r.id);

    // Fetch audio checkins
    const { data: audios } = await supabase
      .from('audio_checkins')
      .select('*')
      .eq('session_type', 'walk')
      .in('session_id', ids);

    const newAudioMap: Record<string, AudioCheckin> = {};
    (audios ?? []).forEach((a: AudioCheckin) => { if (a.session_id) newAudioMap[a.session_id] = a; });
    setAudioMap(newAudioMap);

    // Fetch companion names
    const companionIds = rows
      .map((r: WalkSession) => currentTab === 'mes' ? r.companion_id : r.creator_id)
      .filter(Boolean) as string[];

    let profileMap: Record<string, string> = {};
    if (companionIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, full_name')
        .in('id', companionIds);
      (profiles ?? []).forEach((p: { id: string; display_name: string | null; full_name: string | null }) => {
        profileMap[p.id] = p.display_name ?? p.full_name ?? 'Anonyme';
      });
    }

    const enriched: SessionWithAudio[] = rows.map((r: WalkSession) => {
      const companionId = currentTab === 'mes' ? r.companion_id : r.creator_id;
      const durationMin = r.started_at && r.ended_at
        ? Math.round((new Date(r.ended_at).getTime() - new Date(r.started_at).getTime()) / 60000)
        : null;
      return {
        ...r,
        audio: newAudioMap[r.id] ?? null,
        companionName: companionId ? (profileMap[companionId] ?? 'Anonyme') : null,
        durationMin,
        daysUntilExpiry: daysUntilExpiry(r.created_at),
      };
    });

    setSessions(enriched);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchSessions(tab); }, [tab, fetchSessions]);

  const handleDeleteAudio = (sessionId: string) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, audio: null } : s));
    setAudioMap(prev => { const n = { ...prev }; delete n[sessionId]; return n; });
  };

  // ─── Latest session for notif card ────────────────────────────────────────
  const latest = sessions[0] ?? null;

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        position: 'fixed',
        bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
        left: 0, right: 0,
        maxHeight: '78%',
        background: bg,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column',
        zIndex: 310,
        overflow: 'hidden',
      }}
    >
      {/* Drag handle */}
      <div style={{ width: 36, height: 4, borderRadius: 99, background: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.12)', margin: '12px auto 0', flexShrink: 0 }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: TEAL12, border: `1px solid ${TEAL24}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Home size={16} color={TEAL} strokeWidth={2.2} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, color: text, letterSpacing: '-0.3px' }}>Historique</span>
        </div>
        <button
          onClick={onClose}
          style={{ width: 28, height: 28, borderRadius: '50%', background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.05)', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <X size={12} color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.4)'} strokeWidth={2.5} />
        </button>
      </div>

      {/* Scroll content */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '14px 18px 24px' }}>

        {/* ── Notif card — dernière session ─────────────────────────── */}
        {latest && (
          <>
            <div style={{ fontSize: 9, fontWeight: 800, color: subtle, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, marginTop: 4 }}>
              Dernière marche
            </div>
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: '13px 14px', marginBottom: 16, display: 'flex', gap: 11, alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: TEAL12, border: `1px solid ${TEAL24}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 2 }}>
                  Marche terminée{latest.durationMin ? ` · ${latest.durationMin} min` : ''}
                </div>
                <div style={{ fontSize: 11, color: muted, lineHeight: 1.4, marginBottom: 6 }}>
                  {latest.destination ?? 'Trajet Walk With Me'}
                  {latest.companionName ? ` avec ${latest.companionName}` : ''}.
                  {latest.audio ? ' Enregistrement disponible.' : ''}
                </div>
                {latest.audio && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: TEAL, cursor: 'pointer' }}>
                    Écouter l'enregistrement →
                  </span>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Section label ─────────────────────────────────────────── */}
        <div style={{ fontSize: 9, fontWeight: 800, color: subtle, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          Depuis le panel Walk with me
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 0, background: tabBg, borderRadius: 12, padding: 3, marginBottom: 14, flexShrink: 0 }}>
          {(['mes', 'rejointes'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 9,
                fontSize: 12, fontWeight: 700, textAlign: 'center',
                cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                background: tab === t ? tabAct : 'transparent',
                color: tab === t ? text : muted,
                boxShadow: tab === t && !isDark ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 150ms',
              }}
            >
              {t === 'mes' ? 'Mes marches' : 'Rejointes'}
            </button>
          ))}
        </div>

        {/* ── Session list ──────────────────────────────────────────── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: muted, fontSize: 13 }}>Chargement…</div>
        ) : sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: muted, fontSize: 13 }}>
            {tab === 'mes' ? 'Aucune marche pour l\'instant.' : 'Tu n\'as rejoint aucune marche.'}
          </div>
        ) : (
          sessions.map((s) => (
            <div key={s.id} style={{ marginBottom: 10, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'}`, paddingBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 5 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: text }}>{formatDate(s.created_at)}</div>
                  <div style={{ fontSize: 11, color: muted, marginTop: 1 }}>
                    {s.durationMin ? `${s.durationMin} min` : ''}
                    {s.destination ? ` · ${s.destination}` : ''}
                    {s.companionName ? ` · ${s.companionName}` : ''}
                  </div>
                </div>
                <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: GREEN12, color: GREEN, border: `1px solid ${GREEN30}`, flexShrink: 0, marginLeft: 8 }}>
                  ✓ Arrivée
                </span>
              </div>

              {/* Audio player */}
              {s.audio && (
                <AudioPlayer
                  checkin={s.audio}
                  isDark={isDark}
                  onDelete={() => handleDeleteAudio(s.id)}
                />
              )}

              {/* Expiry note (no audio, < 10 days) */}
              {!s.audio && s.daysUntilExpiry <= 10 && s.daysUntilExpiry > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: subtle, marginTop: 6 }}>
                  <Clock size={12} color={subtle} />
                  Expire dans {s.daysUntilExpiry} jour{s.daysUntilExpiry > 1 ? 's' : ''}
                </div>
              )}
            </div>
          ))
        )}

        {/* ── Footer ────────────────────────────────────────────────── */}
        {sessions.length > 0 && (
          <div style={{ textAlign: 'center', paddingTop: 10 }}>
            <div style={{ fontSize: 10, color: subtle, lineHeight: 1.5, marginBottom: 3 }}>
              🔒 Seules toi et les membres de la session peuvent accéder aux enregistrements.
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: TEAL }}>
              Suppression automatique après 30 jours.
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
