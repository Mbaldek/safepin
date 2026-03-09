// src/components/WalkWithMePanel.tsx — S45: Walk With Me Sessions

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { useTheme } from '@/stores/useTheme';
import { bToast } from '@/components/GlobalToast';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Users, Clock, Shield, Phone, Bell, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { WalkSession } from '@/types';

const AudioChannel = dynamic(() => import('@/components/escorte/AudioChannel'), { ssr: false });

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

function getColors(isDark: boolean) {
  return isDark
    ? {
        surface:     'rgba(15,23,42,0.96)',
        blur:        'blur(28px)',
        card:        'rgba(30,41,59,0.80)',
        border:      'rgba(255,255,255,0.07)',
        borderAccent: TEAL24,
        tp:          '#FFFFFF',
        ts:          '#94A3B8',
        ts2:         '#64748B',
        input:       'rgba(30,41,59,0.70)',
        inputBorder: 'rgba(255,255,255,0.08)',
        divider:     'rgba(255,255,255,0.06)',
        shadow:      '0 20px 60px rgba(0,0,0,0.50)',
      }
    : {
        surface:     'rgba(248,250,252,0.97)',
        blur:        'blur(28px)',
        card:        'rgba(255,255,255,0.90)',
        border:      'rgba(15,23,42,0.06)',
        borderAccent: TEAL24,
        tp:          '#0F172A',
        ts:          '#475569',
        ts2:         '#94A3B8',
        input:       'rgba(241,245,249,0.90)',
        inputBorder: 'rgba(15,23,42,0.08)',
        divider:     'rgba(15,23,42,0.05)',
        shadow:      '0 12px 40px rgba(0,0,0,0.12)',
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

export default function WalkWithMePanel({ userId, destination, onClose }: Props) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);
  const { userProfile } = useStore();
  const t = useTranslations('walkWithMe');
  const tEmergency = useTranslations('emergency');

  const [session, setSession]       = useState<WalkSession | null>(null);
  const [loading, setLoading]       = useState(false);
  const [joinCode, setJoinCode]     = useState('');
  const [elapsed, setElapsed]       = useState(0);
  const [nextCheckin, setNextCheckin] = useState<number | null>(null);
  const [callState, setCallState]   = useState<CallState>('idle');

  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkinRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset call on session change
  useEffect(() => { setCallState('idle'); }, [session?.id]);

  // Load existing active session
  useEffect(() => {
    supabase
      .from('walk_sessions')
      .select('*')
      .eq('creator_id', userId)
      .in('status', ['waiting', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) setSession(data[0] as WalkSession);
      });
  }, [userId]);

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

  const dismissCheckin = useCallback(() => setNextCheckin(null), []);

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  const callActive = callState === 'connecting' || callState === 'active';

  const callBtnBg     = callState === 'active' ? TEAL12 : callState === 'connecting' ? AMBER10 : callState === 'error' ? RED12 : TEAL12;
  const callBtnBorder = callState === 'active' ? TEAL24 : callState === 'connecting' ? AMBER30 : callState === 'error' ? `${RED}40` : TEAL24;
  const callBtnColor  = callState === 'active' ? TEAL  : callState === 'connecting' ? AMBER  : callState === 'error' ? RED  : TEAL;

  return (
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 28, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 340, damping: 30 }}
      style={{ position: 'absolute', left: 12, right: 12, bottom: 68, zIndex: 180 }}
    >
      <style>{`
        @keyframes bv-walk-spin      { to { transform: rotate(360deg); } }
        @keyframes bv-walk-dotpop    { 0%,80%,100%{opacity:.25;transform:scale(.6);}40%{opacity:1;transform:scale(1);} }
        @keyframes bv-walk-shimmer   { 0%{left:-100%;} 55%,100%{left:130%;} }
        @keyframes bv-walk-loadslide { 0%{width:0%;opacity:1;}80%{width:100%;opacity:.4;}100%{width:100%;opacity:0;} }
        @keyframes bv-walk-joinpulse { 0%,100%{box-shadow:0 0 0 0 rgba(59,180,193,.25);}50%{box-shadow:0 0 0 4px rgba(59,180,193,0);} }
        @keyframes bv-walk-audiocta  { 0%,100%{box-shadow:0 0 0 0 rgba(59,180,193,.2);}50%{box-shadow:0 0 0 5px rgba(59,180,193,0);} }
        @keyframes bv-walk-codeshadow{ 0%,100%{box-shadow:0 0 0 0 rgba(59,180,193,0);}50%{box-shadow:0 0 10px 0 rgba(59,180,193,.12);} }
        @keyframes bv-walk-okpulse   { 0%{box-shadow:0 0 0 0 rgba(251,191,36,.6);}60%{box-shadow:0 0 0 8px rgba(251,191,36,0);}100%{box-shadow:0 0 0 0 rgba(251,191,36,0);} }
      `}</style>

      <div style={{
        background: C.surface,
        backdropFilter: C.blur, WebkitBackdropFilter: C.blur,
        border: `1px solid ${C.border}`,
        borderRadius: 24, padding: '16px 16px 18px',
        boxShadow: C.shadow, overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 10,
              background: TEAL12, border: `1px solid ${TEAL24}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Users size={14} strokeWidth={2} color={TEAL} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.tp, letterSpacing: -0.2 }}>
              {t('title')}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: C.card, border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', padding: 0,
            }}
          >
            <X size={13} strokeWidth={2} color={C.ts} />
          </button>
        </div>

        {/* ═══ STATE 0 — No session ═══ */}
        {!session && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Create button */}
            <button
              onClick={createSession}
              disabled={loading}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 16,
                background: loading ? TEAL12 : `linear-gradient(135deg, ${TEAL} 0%, #2BA8B5 100%)`,
                border: loading ? `1px solid ${TEAL24}` : 'none',
                color: loading ? TEAL : '#FFFFFF',
                fontSize: 13, fontWeight: 700,
                cursor: loading ? 'default' : 'pointer',
                position: 'relative', overflow: 'hidden',
                opacity: loading ? 0.85 : 1,
              }}
            >
              {loading && (
                <span style={{
                  position: 'absolute', top: 0, bottom: 0, width: '40%',
                  background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.18) 50%,transparent 100%)',
                  animation: 'bv-walk-shimmer 1.6s ease-in-out infinite',
                }} />
              )}
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{
                    width: 13, height: 13, borderRadius: '50%',
                    border: `2px solid ${TEAL}40`, borderTopColor: TEAL,
                    display: 'inline-block',
                    animation: 'bv-walk-spin 0.8s linear infinite',
                  }} />
                  {t('creating')}
                </span>
              ) : t('startSession')}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: C.divider }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: C.ts2, letterSpacing: 0.5 }}>
                {t('orJoin')}
              </span>
              <div style={{ flex: 1, height: 1, background: C.divider }} />
            </div>

            {/* Join row */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder={t('enterCode')}
                maxLength={6}
                style={{
                  flex: 1, padding: '11px 12px', borderRadius: 12,
                  background: C.input, border: `1px solid ${C.inputBorder}`,
                  color: C.tp, fontSize: 14, fontWeight: 800,
                  textAlign: 'center', letterSpacing: '0.25em', outline: 'none',
                  animation: joinCode.length === 6 ? 'bv-walk-joinpulse 1.2s ease-in-out 2' : undefined,
                }}
              />
              <button
                onClick={joinSession}
                disabled={loading || !joinCode.trim()}
                style={{
                  padding: '11px 16px', borderRadius: 12, flexShrink: 0,
                  background: joinCode.trim() ? TEAL : C.card,
                  border: joinCode.trim() ? 'none' : `1px solid ${C.border}`,
                  color: joinCode.trim() ? '#FFFFFF' : C.ts2,
                  fontSize: 12, fontWeight: 700,
                  cursor: joinCode.trim() && !loading ? 'pointer' : 'default',
                  opacity: loading ? 0.6 : 1,
                  transition: 'all 0.18s',
                }}
              >
                {t('join')}
              </button>
            </div>

            {/* Niveaux d'escalade */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: C.ts2, letterSpacing: '0.07em', textTransform: 'uppercase' as const, marginBottom: 2 }}>
                Si tu ne réponds pas
              </div>
              {[
                { color: AMBER, bg: AMBER10, border: AMBER30, tag: 'N1', icon: <Bell size={13} strokeWidth={2} color={AMBER} />, nameKey: 'level1Name', descKey: 'level1Desc' },
                { color: TEAL, bg: TEAL12, border: TEAL24, tag: 'N2', icon: <Phone size={13} strokeWidth={2} color={TEAL} />, nameKey: 'level2Name', descKey: 'level2Desc' },
                { color: '#A78BFA', bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.22)', tag: 'N3', icon: <Sparkles size={13} strokeWidth={2} color="#A78BFA" />, nameKey: 'level3Name', descKey: 'level3Desc', soon: true },
              ].map((n, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '8px 11px', borderRadius: 12,
                  background: C.card, border: `1px solid ${C.border}`,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 9,
                    background: n.bg, border: `1px solid ${n.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {n.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: n.color, letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>{n.tag}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.tp }}>{t(n.nameKey as any)}</span>
                      {n.soon && (
                        <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 5, background: TEAL12, color: TEAL, border: `1px solid ${TEAL24}` }}>Bientôt</span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: C.ts, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                      {t(n.descKey as any)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ═══ STATE 1 — Waiting ═══ */}
        {session?.status === 'waiting' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>

            {/* Pulsing status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%', background: AMBER,
                animation: 'bv-walk-okpulse 1.8s ease-in-out infinite',
              }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: C.ts }}>
                {t('waitingCompanion')}
              </span>
              <div style={{ display: 'flex', gap: 3 }}>
                {[0, 0.2, 0.4].map((delay, i) => (
                  <span key={i} style={{
                    width: 4, height: 4, borderRadius: '50%',
                    background: C.ts2, display: 'inline-block',
                    animation: `bv-walk-dotpop 1.4s ${delay}s ease-in-out infinite`,
                  }} />
                ))}
              </div>
            </div>

            {/* Audio CTA */}
            <button
              onClick={() => setCallState(callActive ? 'idle' : 'connecting')}
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 13,
                background: callActive ? 'rgba(59,180,193,0.18)' : TEAL12,
                border: `1px solid ${TEAL24}`,
                color: TEAL, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                animation: !callActive ? 'bv-walk-audiocta 3s ease-in-out infinite' : undefined,
              }}
            >
              <Phone size={14} strokeWidth={2} color={TEAL} />
              {callActive ? 'Canal audio actif' : 'Démarrer le canal audio'}
            </button>
            {callActive && (
              <AudioChannel
                roomName={`walk-${session!.id}`}
                userId={userId}
                isDark={isDark}
                title="Canal vocal — Marche"
                participantNames={[]}
                onEnd={() => setCallState('idle')}
                onStateChange={(s) => {
                  if (s === 'active') setCallState('active');
                  else if (s === 'error') setCallState('error');
                  else if (s === 'ended') setCallState('idle');
                }}
              />
            )}

            {/* Invite code */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px', borderRadius: 16,
              background: C.card, border: `1px solid ${C.borderAccent}`,
              animation: 'bv-walk-codeshadow 3s ease-in-out infinite',
              width: '100%',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.ts, marginBottom: 3 }}>
                  {t('shareCode')}
                </div>
                <span style={{
                  fontSize: 22, fontWeight: 900, letterSpacing: '0.3em',
                  color: TEAL, fontVariantNumeric: 'tabular-nums',
                }}>
                  {session.invite_code}
                </span>
              </div>
              <button
                onClick={copyCode}
                style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: TEAL12, border: `1px solid ${TEAL24}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', padding: 0,
                  animation: 'bv-walk-audiocta 2s ease-in-out infinite',
                }}
              >
                <Copy size={14} strokeWidth={2} color={TEAL} />
              </button>
            </div>

            {/* Cancel */}
            <button
              onClick={cancelSession}
              style={{
                width: '100%', padding: '10px 0', borderRadius: 12,
                background: C.card, border: `1px solid ${C.border}`,
                color: C.ts, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Annuler
            </button>

          </div>
        )}

        {/* ═══ STATE 2 — Active ═══ */}
        {session?.status === 'active' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Status + timer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 8,
                  background: GREEN12, border: `1px solid ${GREEN30}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Shield size={12} strokeWidth={2} color={GREEN} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: GREEN }}>
                  {t('walkTogether')}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock size={12} strokeWidth={1.5} color={C.ts} />
                <span style={{ fontSize: 13, fontWeight: 900, color: C.tp, fontVariantNumeric: 'tabular-nums' }}>
                  {formatTime(elapsed)}
                </span>
              </div>
            </div>

            {destination && (
              <div style={{
                padding: '8px 12px', borderRadius: 10,
                background: C.card, border: `1px solid ${C.border}`,
                fontSize: 11, color: C.ts,
              }}>
                {t('destination')}{' '}
                <span style={{ fontWeight: 700, color: C.tp }}>{destination}</span>
              </div>
            )}

            {/* Audio CTA */}
            <button
              onClick={() => setCallState(callActive ? 'idle' : 'connecting')}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 13,
                background: callActive ? 'rgba(59,180,193,0.18)' : TEAL12,
                border: `1px solid ${TEAL24}`,
                color: TEAL, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                animation: !callActive ? 'bv-walk-audiocta 3s ease-in-out infinite' : undefined,
              }}
            >
              <Phone size={14} strokeWidth={2} color={TEAL} />
              {callActive ? 'Canal audio actif' : 'Rejoindre le canal audio'}
            </button>

            {/* Safety check-in */}
            <AnimatePresence>
              {nextCheckin && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  style={{
                    padding: '10px 12px', borderRadius: 12,
                    background: AMBER10, border: `1px solid ${AMBER30}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: AMBER }}>
                    {t('safetyCheckin')}
                  </span>
                  <button
                    onClick={dismissCheckin}
                    style={{
                      padding: '5px 10px', borderRadius: 8,
                      background: GREEN, border: 'none',
                      color: '#FFFFFF', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      animation: 'bv-walk-okpulse 1.2s ease-in-out infinite',
                    }}
                  >
                    {tEmergency('imSafe')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AudioChannel */}
            <AnimatePresence>
              {callActive && (
                <AudioChannel
                  roomName={`walk-${session.id}`}
                  userId={userId}
                  isDark={isDark}
                  title="Marche sécurisée"
                  participantNames={[]}
                  onEnd={() => setCallState('idle')}
                  onStateChange={(s) => {
                    if (s === 'active') setCallState('active');
                    else if (s === 'error') setCallState('error');
                    else if (s === 'ended') setCallState('idle');
                  }}
                />
              )}
            </AnimatePresence>

            {/* Call + End row */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setCallState(callState === 'idle' || callState === 'error' ? 'connecting' : 'idle')}
                style={{
                  width: 44, height: 44, borderRadius: 13, flexShrink: 0,
                  background: callBtnBg, border: `1px solid ${callBtnBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', padding: 0,
                  animation: callState === 'connecting' ? 'bv-walk-audiocta 1s ease-in-out infinite' : undefined,
                }}
              >
                <Phone size={16} strokeWidth={2} color={callBtnColor} />
              </button>
              <button
                onClick={endSession}
                style={{
                  flex: 1, height: 44, borderRadius: 13,
                  background: GREEN12, border: `1px solid ${GREEN30}`,
                  color: GREEN, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  animation: 'bv-walk-audiocta 2.5s ease-in-out infinite',
                }}
              >
                {t('endWalk')}
              </button>
            </div>

          </div>
        )}

      </div>
    </motion.div>
  );
}
