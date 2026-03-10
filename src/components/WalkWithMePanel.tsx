// src/components/WalkWithMePanel.tsx — S45: Walk With Me Sessions (S3 v4 redesign)

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { useTheme } from '@/stores/useTheme';
import { bToast } from '@/components/GlobalToast';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Users, Clock, Shield, Phone, Bell, Sparkles, Share2, ChevronUp, Square, MicOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { WalkSession } from '@/types';

import { useAudioCall } from '@/stores/useAudioCall';

// ─── Design tokens ────────────────────────────────────────────────────────────

const TEAL    = '#3BB4C1';
const TEAL12  = 'rgba(59,180,193,0.12)';
const TEAL24  = 'rgba(59,180,193,0.24)';
const GREEN   = '#34D399';
const GREEN12 = 'rgba(52,211,153,0.12)';
const GREEN30 = 'rgba(52,211,153,0.30)';
const AMBER   = '#FBBF24';
const AMBER10 = 'rgba(251,191,36,0.10)';
const AMBER30 = 'rgba(251,191,36,0.30)';
const RED     = '#EF4444';
const RED12   = 'rgba(239,68,68,0.12)';
const PURPLE  = '#A78BFA';

function getColors(isDark: boolean) {
  return isDark
    ? {
        surface:     'rgba(15,23,42,0.96)',
        blur:        'blur(28px)',
        card:        'rgba(30,41,59,0.80)',
        elev:        '#283548',
        border:      'rgba(255,255,255,0.07)',
        borderM:     'rgba(255,255,255,0.12)',
        borderAccent: TEAL24,
        tp:          '#FFFFFF',
        ts:          '#94A3B8',
        ts2:         '#64748B',
        input:       'rgba(255,255,255,0.05)',
        inputBorder: 'rgba(255,255,255,0.08)',
        divider:     'rgba(255,255,255,0.06)',
        hover:       'rgba(255,255,255,0.04)',
        shadow:      '0 24px 64px rgba(0,0,0,0.50)',
        handle:      'rgba(255,255,255,0.13)',
      }
    : {
        surface:     'rgba(248,250,252,0.97)',
        blur:        'blur(28px)',
        card:        'rgba(255,255,255,0.90)',
        elev:        '#F1F5F9',
        border:      'rgba(15,23,42,0.06)',
        borderM:     'rgba(15,23,42,0.11)',
        borderAccent: TEAL24,
        tp:          '#0F172A',
        ts:          '#475569',
        ts2:         '#94A3B8',
        input:       'rgba(15,23,42,0.04)',
        inputBorder: 'rgba(15,23,42,0.08)',
        divider:     'rgba(15,23,42,0.05)',
        hover:       'rgba(15,23,42,0.03)',
        shadow:      '0 24px 64px rgba(15,23,42,0.14)',
        handle:      'rgba(15,23,42,0.13)',
      };
}

type CallState = 'idle' | 'connecting' | 'active' | 'error';

type Props = {
  userId: string;
  destination?: string;
  onClose: () => void;
};

function generateCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

const springConfig = { type: 'spring' as const, stiffness: 340, damping: 30 };

// ─── Keyframes ────────────────────────────────────────────────────────────────

const KEYFRAMES = `
  @keyframes bv-walk-spin       { to { transform: rotate(360deg); } }
  @keyframes bv-walk-dotpop     { 0%,80%,100%{opacity:.25;transform:scale(.6);}40%{opacity:1;transform:scale(1);} }
  @keyframes bv-walk-shimmer    { 0%{left:-100%;}55%,100%{left:130%;} }
  @keyframes bv-walk-joinpulse  { 0%,100%{box-shadow:0 0 0 0 rgba(59,180,193,.25);}50%{box-shadow:0 0 0 4px rgba(59,180,193,0);} }
  @keyframes bv-walk-audiocta   { 0%,100%{box-shadow:0 0 0 0 rgba(59,180,193,.2);}50%{box-shadow:0 0 0 5px rgba(59,180,193,0);} }
  @keyframes bv-walk-codeshadow { 0%,100%{box-shadow:0 0 0 0 rgba(59,180,193,0);}50%{box-shadow:0 0 10px 0 rgba(59,180,193,.12),inset 0 0 10px rgba(59,180,193,.05);} }
  @keyframes bv-walk-okpulse    { 0%{box-shadow:0 0 0 0 rgba(251,191,36,.6);}60%{box-shadow:0 0 0 8px rgba(251,191,36,0);}100%{box-shadow:0 0 0 0 rgba(251,191,36,0);} }
  @keyframes bv-walk-pulsedot   { 0%,100%{opacity:1;transform:scale(1);}50%{opacity:.4;transform:scale(.6);} }
  @keyframes bv-walk-wave       { 0%,100%{transform:scaleY(.3);}50%{transform:scaleY(1);} }
  @keyframes bv-walk-glown1     { 0%,100%{box-shadow:0 0 0 0 rgba(251,191,36,0);}50%{box-shadow:0 0 8px 0 rgba(251,191,36,.10);} }
  @keyframes bv-walk-glown2     { 0%,100%{box-shadow:0 0 0 0 rgba(59,180,193,0);}50%{box-shadow:0 0 8px 0 rgba(59,180,193,.10);} }
  @keyframes bv-walk-glown3     { 0%,100%{box-shadow:0 0 0 0 rgba(167,139,250,0);}50%{box-shadow:0 0 8px 0 rgba(167,139,250,.10);} }
  @keyframes bv-walk-icoamber   { 0%,100%{box-shadow:none;}50%{box-shadow:0 0 7px 2px rgba(251,191,36,.2);} }
  @keyframes bv-walk-icoteal    { 0%,100%{box-shadow:none;}50%{box-shadow:0 0 7px 2px rgba(59,180,193,.2);} }
  @keyframes bv-walk-icopurple  { 0%,100%{box-shadow:none;}50%{box-shadow:0 0 7px 2px rgba(167,139,250,.2);} }
`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function WalkWithMePanel({ userId, destination, onClose }: Props) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);
  const { userProfile, setShowWalkHistory } = useStore();
  const t = useTranslations('walkWithMe');
  const tEmergency = useTranslations('emergency');

  const [session, setSession]       = useState<WalkSession | null>(null);
  const [loading, setLoading]       = useState(false);
  const [joinCode, setJoinCode]     = useState('');
  const [elapsed, setElapsed]       = useState(0);
  const [nextCheckin, setNextCheckin] = useState<number | null>(null);
  const [shareOpen, setShareOpen]   = useState(false);

  const globalCallState = useAudioCall((s) => s.callState);
  const globalSource = useAudioCall((s) => s.source);
  const globalMuted = useAudioCall((s) => s.muted);
  const setGlobalMuted = useAudioCall((s) => s.setMuted);
  const startCallGlobal = useAudioCall((s) => s.startCall);
  const endCallGlobal = useAudioCall((s) => s.endCall);
  const callActive = globalSource === 'walk' && globalCallState !== 'idle';

  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkinRef = useRef<ReturnType<typeof setInterval> | null>(null);


  // Elapsed timer
  useEffect(() => {
    if (session?.status === 'active' && session.started_at) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - new Date(session.started_at!).getTime()) / 1000));
      }, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [session?.status, session?.started_at]);

  // Safety check-in (every 15 min)
  useEffect(() => {
    if (session?.status !== 'active') return;
    checkinRef.current = setInterval(() => setNextCheckin(Date.now()), 15 * 60 * 1000);
    return () => { if (checkinRef.current) clearInterval(checkinRef.current); };
  }, [session?.status]);

  // ── Actions ──────────────────────────────────────────────────────────────

  async function createSession() {
    setLoading(true);
    const code = generateCode();
    const { data, error } = await supabase
      .from('walk_sessions')
      .insert({ creator_id: userId, invite_code: code, destination: destination ?? null, status: 'waiting' })
      .select().single();
    if (error) { bToast.danger({ title: t('createFailed') }, isDark); setLoading(false); return; }
    setSession(data as WalkSession);
    setLoading(false);
    bToast.success({ title: t('sessionCreated') }, isDark);
  }

  async function joinSession() {
    if (!joinCode.trim()) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('walk_sessions')
      .update({ companion_id: userId, status: 'active', started_at: new Date().toISOString() })
      .eq('invite_code', joinCode.trim().toUpperCase())
      .eq('status', 'waiting')
      .select().single();
    if (error || !data) { bToast.danger({ title: t('invalidCode') }, isDark); setLoading(false); return; }
    setSession(data as WalkSession);
    setLoading(false);
    bToast.success({ title: t('joinedSuccess') }, isDark);
  }

  async function endSession() {
    if (!session) return;
    await supabase
      .from('walk_sessions')
      .update({ status: 'completed', ended_at: new Date().toISOString() })
      .eq('id', session.id);
    setSession(null);
    bToast.success({ title: t('walkCompleted') }, isDark);
    onClose();
  }

  async function cancelSession() {
    if (!session) return;
    await supabase.from('walk_sessions').update({ status: 'cancelled' }).eq('id', session.id);
    setSession(null);
  }

  function copyCode() {
    if (session?.invite_code) {
      navigator.clipboard.writeText(session.invite_code);
      bToast.success({ title: t('codeCopied') }, isDark);
    }
  }

  async function shareCode() {
    if (!session?.invite_code) return;
    const text = `Rejoins ma marche sécurisée sur Breveil ! Code : ${session.invite_code}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Marche avec moi', text }); } catch {}
    } else {
      navigator.clipboard.writeText(text);
      bToast.success({ title: t('codeCopied') }, isDark);
    }
  }

  const dismissCheckin = useCallback(() => setNextCheckin(null), []);

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  const userName = userProfile?.display_name ?? 'Vous';
  const userInitial = userName[0]?.toUpperCase() ?? 'V';

  // Sheet height per state
  const sheetH = !session ? '55vh' : session.status === 'waiting' ? '55vh' : '65vh';

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0, height: sheetH }}
      exit={{ y: '100%' }}
      transition={springConfig}
      style={{
        position: 'absolute',
        bottom: 64,
        left: 0,
        right: 0,
        background: C.surface,
        backdropFilter: C.blur, WebkitBackdropFilter: C.blur,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        border: `1px solid ${C.borderM}`,
        borderBottom: 'none',
        boxShadow: C.shadow,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 200,
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* ── Handle ── */}
      <div style={{ padding: '10px 0 0', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <div style={{ width: 34, height: 4, borderRadius: 99, background: C.handle }} />
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0, scrollbarWidth: 'none', padding: '12px 18px 20px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: TEAL12, border: `1px solid ${TEAL24}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Users size={14} strokeWidth={2.5} color={TEAL} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.tp }}>
              {t('title')}
            </span>
          </div>
          <button
            onClick={() => { if (session) { supabase.from('walk_sessions').update({ status: 'cancelled' }).eq('id', session.id); } onClose(); }}
            style={{
              width: 26, height: 26, borderRadius: '50%',
              background: C.hover, border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', padding: 0,
            }}
          >
            <X size={12} strokeWidth={2} color={C.ts} />
          </button>
        </div>

        {/* ═══════════════════════ STATE 0 — No session ═══════════════════════ */}
        {!session && (
          <>
            {/* CTA principal */}
            <button
              onClick={createSession}
              disabled={loading}
              style={{
                width: '100%', padding: '14px 18px', borderRadius: 16,
                background: loading ? `linear-gradient(135deg,#1e6e77,#155a62)` : `linear-gradient(135deg,${TEAL} 0%,#2a96a2 100%)`,
                border: 'none',
                color: '#FFFFFF', fontSize: 13, fontWeight: 700,
                cursor: loading ? 'default' : 'pointer',
                position: 'relative', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                boxShadow: '0 4px 20px rgba(59,180,193,0.3)',
                marginBottom: 10,
              }}
            >
              {/* Shimmer */}
              <span style={{
                position: 'absolute', top: 0, left: '-100%', width: '55%', height: '100%',
                background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.16),transparent)',
                animation: 'bv-walk-shimmer 3.5s ease-in-out infinite',
              }} />
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 14, height: 14, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white',
                    display: 'inline-block',
                    animation: 'bv-walk-spin 0.8s linear infinite',
                  }} />
                  {t('creating')}
                </span>
              ) : (
                <>
                  <Users size={16} strokeWidth={2.5} color="white" />
                  {t('startSession')}
                </>
              )}
            </button>

            {/* Join — compact */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, color: C.ts2, fontSize: 10, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase' as const }}>
                <div style={{ flex: 1, height: 1, background: C.border }} />
                {t('orJoin')}
                <div style={{ flex: 1, height: 1, background: C.border }} />
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="CODE"
                  maxLength={6}
                  style={{
                    flex: 1, padding: '8px 10px', borderRadius: 10,
                    background: C.input, border: `1px solid ${C.border}`,
                    color: C.ts, fontSize: 13, fontWeight: 700,
                    textAlign: 'center', letterSpacing: '.2em', fontFamily: "'Inter',monospace",
                    outline: 'none',
                    animation: joinCode.length === 6 ? 'bv-walk-joinpulse 1.2s ease-in-out 2' : undefined,
                  }}
                />
                <button
                  onClick={joinSession}
                  disabled={loading || !joinCode.trim()}
                  style={{
                    padding: '8px 12px', borderRadius: 10,
                    background: TEAL12, border: `1px solid ${TEAL24}`,
                    color: TEAL, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    animation: joinCode.length === 6 ? 'bv-walk-joinpulse 3s ease-in-out infinite' : undefined,
                  }}
                >
                  {t('join')} →
                </button>
              </div>
            </div>

            {/* Niveaux — compact avec glow */}
            <div style={{ fontSize: 10, fontWeight: 700, color: C.ts2, letterSpacing: '.07em', textTransform: 'uppercase' as const, marginBottom: 7 }}>
              Si tu ne réponds pas
            </div>
            {[
              { color: AMBER, bg: AMBER10, border: AMBER30, tag: 'N1', icon: <Bell size={13} strokeWidth={2} color={AMBER} />, nameKey: 'level1Name' as const, descKey: 'level1Desc' as const, glowCard: 'bv-walk-glown1 4s ease-in-out infinite', glowIco: 'bv-walk-icoamber 4s ease-in-out infinite' },
              { color: TEAL, bg: TEAL12, border: TEAL24, tag: 'N2', icon: <Phone size={13} strokeWidth={2} color={TEAL} />, nameKey: 'level2Name' as const, descKey: 'level2Desc' as const, glowCard: 'bv-walk-glown2 4s ease-in-out infinite 1.3s', glowIco: 'bv-walk-icoteal 4s ease-in-out infinite 1.3s' },
              { color: PURPLE, bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.22)', tag: 'N3', icon: <Sparkles size={13} strokeWidth={2} color={PURPLE} />, nameKey: 'level3Name' as const, descKey: 'level3Desc' as const, glowCard: 'bv-walk-glown3 4s ease-in-out infinite 2.6s', glowIco: 'bv-walk-icopurple 4s ease-in-out infinite 2.6s', soon: true },
            ].map((n, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 11px', borderRadius: 12,
                background: C.elev, border: `1px solid ${C.border}`,
                marginBottom: 5,
                animation: n.glowCard,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 9,
                  background: n.bg, border: `1px solid ${n.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  animation: n.glowIco,
                }}>
                  {n.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: n.color, letterSpacing: '.05em', textTransform: 'uppercase' as const }}>{n.tag}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.tp }}>{t(n.nameKey)}</span>
                    {n.soon && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 5, background: TEAL12, color: TEAL, border: `1px solid ${TEAL24}` }}>Bientôt</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: C.ts, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                    {t(n.descKey)}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ═══════════════════════ STATE 1 — Waiting ═══════════════════════ */}
        {session?.status === 'waiting' && (
          <>
            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12, fontSize: 12, color: C.ts }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: AMBER, animation: 'bv-walk-pulsedot 1.6s ease-in-out infinite' }} />
              {t('waitingCompanion')}
            </div>

            {/* Participants */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.ts2, letterSpacing: '.07em', textTransform: 'uppercase' as const, marginBottom: 7 }}>
                Participants
              </div>
              {/* Host */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', borderRadius: 10,
                background: C.elev, border: `1px solid ${C.border}`, marginBottom: 5,
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: `linear-gradient(135deg,${TEAL},#1E3A5F)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800, color: 'white', flexShrink: 0,
                }}>
                  {userInitial}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.tp }}>Toi (hôte)</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: GREEN }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: GREEN, animation: 'bv-walk-pulsedot 2s ease-in-out infinite' }} />
                    En ligne
                  </div>
                </div>
              </div>
              {/* Waiting slot */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 10px', borderRadius: 10,
                background: C.input, border: `1.5px dashed ${C.border}`,
                marginBottom: 12,
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid rgba(251,191,36,0.2)`, borderTopColor: AMBER,
                  animation: 'bv-walk-spin 1s linear infinite',
                }} />
                <div style={{ flex: 1, fontSize: 11, color: C.ts }}>En attente d&apos;autres participants…</div>
                <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <div key={i} style={{
                      width: 4, height: 4, borderRadius: '50%', background: AMBER,
                      animation: `bv-walk-dotpop 1.4s ease-in-out infinite ${delay}s`,
                    }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Audio CTA */}
            <button
              onClick={() => {
                if (!callActive && session) {
                  startCallGlobal({ roomName: `walk-${session.id}`, source: 'walk', sourceId: session.id, title: 'Canal vocal — Marche' })
                } else {
                  endCallGlobal()
                }
              }}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 13,
                background: `linear-gradient(135deg,rgba(59,180,193,0.14),rgba(59,180,193,0.07))`,
                border: `1px solid ${TEAL24}`,
                color: TEAL, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginBottom: 10,
                animation: !callActive ? 'bv-walk-audiocta 3s ease-in-out infinite' : undefined,
              }}
            >
              <Phone size={14} strokeWidth={2.5} color={TEAL} />
              {callActive ? 'Canal audio actif' : 'Démarrer le canal audio'}
            </button>
            {/* AudioChannel pill is now rendered globally by FloatingCallPill */}

            {/* Code d'invitation — compact */}
            <div
              onClick={copyCode}
              style={{
                padding: '10px 14px', borderRadius: 12,
                background: C.input, border: `1.5px dashed ${TEAL24}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 8, cursor: 'pointer',
                animation: 'bv-walk-codeshadow 3s ease-in-out infinite',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 6,
                  background: TEAL12, border: `1px solid ${TEAL24}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Copy size={10} strokeWidth={2.5} color={TEAL} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: C.ts, display: 'flex', alignItems: 'center', gap: 4 }}>
                  Code d&apos;invitation
                </span>
              </div>
              <span style={{
                fontSize: 20, fontWeight: 800, letterSpacing: '.25em', color: C.tp,
                fontFamily: "'Inter',monospace",
              }}>
                {session.invite_code}
              </span>
            </div>

            {/* Partager le code */}
            <button
              onClick={shareCode}
              style={{
                width: '100%', padding: '10px', borderRadius: 11,
                background: C.elev, border: `1px solid ${C.borderM}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                fontSize: 12, fontWeight: 700, color: C.tp, cursor: 'pointer',
                marginBottom: 7,
              }}
            >
              <Share2 size={13} strokeWidth={2.5} color={C.tp} />
              Partager le code
            </button>

            {/* Annuler */}
            <button
              onClick={cancelSession}
              style={{
                width: '100%', padding: '8px', borderRadius: 10,
                background: 'transparent', border: `1px solid ${C.border}`,
                color: C.ts2, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                textAlign: 'center', marginTop: 5,
              }}
            >
              Annuler la session
            </button>
          </>
        )}

        {/* ═══════════════════════ STATE 2 — Active ═══════════════════════ */}
        {session?.status === 'active' && (
          <>
            {/* ── Mini HUD ── */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 14px 11px',
              background: isDark ? 'rgba(20,30,48,0.92)' : 'rgba(255,255,255,0.93)',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              borderRadius: 16, border: `1px solid ${C.borderM}`,
              marginBottom: 12,
            }}>
              {/* Left — timer */}
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 300, letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums', color: C.tp, lineHeight: 1 }}>
                  {formatTime(elapsed)}
                </div>
                <div style={{ fontSize: 9, color: C.ts, marginTop: 1 }}>Durée</div>
              </div>
              {/* Center — waveform + REC */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {callActive && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 16 }}>
                    {[5, 12, 16, 10, 7].map((h, i) => (
                      <div key={i} style={{
                        width: 2.5, height: h, borderRadius: 2, background: TEAL,
                        animation: `bv-walk-wave 1.1s ease-in-out infinite ${i * 0.1}s`,
                      }} />
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700, color: RED }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: RED, animation: 'bv-walk-pulsedot 1.2s ease-in-out infinite' }} />
                  REC
                </div>
              </div>
              {/* Right — status + expand */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 8px', borderRadius: 20,
                  background: GREEN12, border: `1px solid ${GREEN30}`,
                  color: GREEN, fontSize: 10, fontWeight: 700,
                }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: GREEN, animation: 'bv-walk-pulsedot 2s ease-in-out infinite' }} />
                  En marche
                </div>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: TEAL12, border: `1px solid ${TEAL24}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: 13, color: TEAL,
                }}>
                  <ChevronUp size={13} strokeWidth={2.5} color={TEAL} />
                </div>
              </div>
            </div>

            {/* ── Protection active ── */}
            <div style={{ fontSize: 10, fontWeight: 700, color: C.ts2, letterSpacing: '.07em', textTransform: 'uppercase' as const, marginBottom: 6 }}>
              Protection active
            </div>
            {/* N1 — done */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 10,
              border: `1px solid ${C.border}`, marginBottom: 4, background: C.elev, opacity: 0.4,
            }}>
              <div style={{ width: 20, height: 20, borderRadius: 7, background: GREEN12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, flexShrink: 0, color: GREEN }}>✓</div>
              <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: C.tp }}>Cercle notifié</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: GREEN }}>Actif</div>
            </div>
            {/* N2 — active */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 10,
              border: `1px solid ${TEAL24}`, marginBottom: 4, background: TEAL12,
            }}>
              <div style={{ width: 20, height: 20, borderRadius: 7, background: TEAL12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Phone size={10} strokeWidth={2.5} color={TEAL} />
              </div>
              <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: TEAL }}>Canal audio · {callActive ? '3' : '0'} personnes</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: TEAL }}>● Live</div>
            </div>
            {/* N3 — veille */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 10,
              border: `1px solid ${C.border}`, marginBottom: 10, background: C.elev, opacity: 0.3,
            }}>
              <div style={{ width: 20, height: 20, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, color: C.ts2 }}>✦</div>
              <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: C.tp }}>Julia (si pas de réponse)</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.ts2 }}>Veille</div>
            </div>

            {/* ── Audio bar ── */}
            <div style={{
              padding: '9px 12px', borderRadius: 12,
              background: `linear-gradient(135deg,rgba(59,180,193,.10),rgba(59,180,193,.05))`,
              border: `1px solid ${TEAL24}`,
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7,
            }}>
              {/* Waveform */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 2.5, height: 20 }}>
                {[6, 14, 20, 12, 8].map((h, i) => (
                  <div key={i} style={{
                    width: 3, height: h, borderRadius: 2, background: TEAL,
                    animation: `bv-walk-wave 1.1s ease-in-out infinite ${i * 0.12}s`,
                  }} />
                ))}
              </div>
              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.tp }}>Canal audio actif</div>
                <div style={{ fontSize: 10, color: C.ts, display: 'flex', gap: 5, alignItems: 'center', marginTop: 1 }}>
                  <span>{callActive ? '3' : '0'} participants</span>
                  <span>·</span>
                  <span style={{ color: TEAL }}>{formatTime(elapsed)}</span>
                  <span>·</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: RED, display: 'inline-block', animation: 'bv-walk-pulsedot 1.2s ease-in-out infinite' }} />
                    <span style={{ color: RED, fontWeight: 700 }}>REC</span>
                  </span>
                </div>
              </div>
              {/* Actions */}
              <div style={{ display: 'flex', gap: 5 }}>
                <button
                  onClick={() => setGlobalMuted(!globalMuted)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    border: `1px solid ${globalMuted ? 'rgba(239,68,68,.25)' : C.borderM}`,
                    background: globalMuted ? RED12 : C.hover,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', padding: 0,
                  }}
                >
                  <MicOff size={11} strokeWidth={2} color={globalMuted ? RED : C.ts} />
                </button>
                <button
                  onClick={() => endCallGlobal()}
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    border: '1px solid rgba(239,68,68,.25)',
                    background: RED12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', padding: 0,
                  }}
                >
                  <X size={11} strokeWidth={2} color={RED} />
                </button>
              </div>
            </div>

            {/* ── REC bar ── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 10px', borderRadius: 9,
              background: C.input, border: `1px solid ${C.border}`, marginBottom: 9,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: C.ts }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  padding: '2px 6px', borderRadius: 5,
                  background: RED12, border: '1px solid rgba(239,68,68,.2)',
                  color: RED, fontSize: 9, fontWeight: 700,
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: RED, display: 'inline-block', animation: 'bv-walk-pulsedot 1.2s ease-in-out infinite' }} />
                  Enreg.
                </div>
                Auto-sauvegardé
              </div>
              <button
                onClick={() => setShowWalkHistory(true)}
                style={{ fontSize: 10, fontWeight: 700, color: TEAL, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
              >
                Historique →
              </button>
            </div>

            {/* ── Participants scroll ── */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 9, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
              {/* Host */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 8px', borderRadius: 10, background: C.elev, border: `1px solid ${C.border}`, minWidth: 50 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg,${TEAL},#1E3A5F)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white', position: 'relative' }}>
                  {userInitial}
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: GREEN, border: `2px solid ${C.card}`, position: 'absolute', bottom: -1, right: -1 }} />
                </div>
                <div style={{ fontSize: 9, fontWeight: 600, color: C.ts }}>Vous</div>
              </div>
              {/* Placeholder participants */}
              {['Sara', 'Léa'].map((name, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 8px', borderRadius: 10, background: C.elev, border: `1px solid ${C.border}`, minWidth: 50 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg,${i === 0 ? '#F87171,#A78BFA' : '#34D399,#3BB4C1'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white', position: 'relative' }}>
                    {name[0]}
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: GREEN, border: `2px solid ${C.card}`, position: 'absolute', bottom: -1, right: -1 }} />
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: C.ts }}>{name}</div>
                </div>
              ))}
              {/* Invite */}
              <div
                onClick={shareCode}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 8px', borderRadius: 10, background: C.elev, border: `1.5px dashed ${C.border}`, minWidth: 50, cursor: 'pointer' }}
              >
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: TEAL12, border: `1.5px dashed ${TEAL24}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TEAL, fontSize: 16 }}>+</div>
                <div style={{ fontSize: 9, fontWeight: 600, color: TEAL }}>Inviter</div>
              </div>
            </div>

            {/* ── Check-in ── */}
            <AnimatePresence>
              {nextCheckin && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '9px 11px', borderRadius: 12,
                    background: AMBER10, border: `1px solid ${AMBER30}`,
                    marginBottom: 9,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.tp }}>⏱ Check-in dans 3 min</div>
                    <div style={{ fontSize: 10, color: C.ts, marginTop: 1 }}>Confirme que tu vas bien</div>
                  </div>
                  <button
                    onClick={dismissCheckin}
                    style={{
                      padding: '7px 12px', borderRadius: 9,
                      background: AMBER, border: 'none',
                      color: '#0F172A', fontSize: 11, fontWeight: 800, cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      animation: 'bv-walk-okpulse 2s ease-out infinite',
                    }}
                  >
                    Je vais bien ✓
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AudioChannel pill is now rendered globally by FloatingCallPill */}

            {/* ── Terminer ── */}
            <div style={{ textAlign: 'center', marginTop: 2 }}>
              <button
                onClick={endSession}
                style={{
                  padding: '7px 14px', borderRadius: 9,
                  background: 'transparent', border: `1px solid ${C.border}`,
                  color: C.ts2, fontSize: 11, fontWeight: 500, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}
              >
                <Square size={10} strokeWidth={2} color={C.ts2} />
                Terminer la marche
              </button>
              <div style={{ fontSize: 9, color: C.ts2, marginTop: 3, opacity: 0.55 }}>
                Tes données restent dans l&apos;historique
              </div>
            </div>
          </>
        )}

      </div>
    </motion.div>
  );
}
