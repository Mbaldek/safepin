'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/stores/useTheme';
import type { WalkSession, AudioCheckin } from '@/types';

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

type PeriodFilter = 'week' | 'month' | 'all' | null;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatShortDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  if (diffDays === 0) return `Aujourd'hui ${time}`;
  if (diffDays === 1) return `Hier ${time}`;
  return d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace(/\.$/, '') + `. ${time}`;
}

function daysUntilExpiry(createdAt: string): number {
  const expiry = new Date(new Date(createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);
  return Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function getTimeBucket(iso: string): 'thisWeek' | 'lastWeek' | 'thisMonth' | 'older' {
  const now = Date.now();
  const d = new Date(iso).getTime();
  const diffDays = (now - d) / (1000 * 60 * 60 * 24);
  if (diffDays <= 7) return 'thisWeek';
  if (diffDays <= 14) return 'lastWeek';
  if (diffDays <= 30) return 'thisMonth';
  return 'older';
}

function avatarColor(name: string): string {
  const colors = [
    'linear-gradient(135deg,#3BB4C1,#1E3A5F)',
    'linear-gradient(135deg,#A78BFA,#4A2C5A)',
    'linear-gradient(135deg,#34D399,#065F46)',
    'linear-gradient(135deg,#F472B6,#831843)',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return colors[Math.abs(hash) % colors.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const springSheet = { type: 'spring' as const, stiffness: 300, damping: 30 };

const PERIOD_OPTIONS: { val: PeriodFilter & string; label: string; desc: string; icon: string }[] = [
  { val: 'week', label: 'Cette semaine', desc: '7 derniers jours', icon: '\uD83D\uDCC5' },
  { val: 'month', label: 'Ce mois', desc: '30 derniers jours', icon: '\uD83D\uDDD3' },
  { val: 'all', label: "Tout l'historique", desc: 'Depuis le d\u00e9but', icon: '\u221E' },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function WalkHistorySheet({ userId, onClose }: WalkHistorySheetProps) {
  const isDark = useTheme(s => s.theme) === 'dark';
  const [tab, setTab] = useState<'mes' | 'rejointes'>('mes');
  const [sessions, setSessions] = useState<SessionWithAudio[]>([]);
  const [loading, setLoading] = useState(true);
  const [audioMap, setAudioMap] = useState<Record<string, AudioCheckin>>({});

  // Filter state
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>(null);
  const [activePeriod, setActivePeriod] = useState<PeriodFilter>(null);

  // ─── Design tokens ──────────────────────────────────────────────────────────
  const C = {
    surfaceBase:   isDark ? '#0F172A' : '#F1F5F9',
    surfaceCard:   isDark ? '#1E293B' : '#FFFFFF',
    surfaceEl:     isDark ? '#253347' : '#F8FAFC',
    textPrimary:   isDark ? '#FFFFFF' : '#0F172A',
    textSecondary: isDark ? '#94A3B8' : '#475569',
    textTertiary:  isDark ? '#64748B' : '#94A3B8',
    borderSubtle:  isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)',
    borderDefault: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.10)',
    teal:          '#3BB4C1',
    purple:        '#A78BFA',
    success:       '#34D399',
    danger:        '#EF4444',
    warning:       '#FBBF24',
  };

  // ─── Fetch sessions ─────────────────────────────────────────────────────────
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

  // ─── Filter logic (client-side) ────────────────────────────────────────────
  const filteredSessions = useMemo(() => {
    if (!activePeriod) return sessions;
    const now = Date.now();
    const cutoff = activePeriod === 'week' ? 7 : activePeriod === 'month' ? 30 : Infinity;
    if (cutoff === Infinity) return sessions;
    return sessions.filter(s => (now - new Date(s.created_at).getTime()) / (1000 * 60 * 60 * 24) <= cutoff);
  }, [sessions, activePeriod]);

  // Group by time bucket
  const grouped = useMemo(() => {
    const buckets: Record<string, SessionWithAudio[]> = {};
    for (const s of filteredSessions) {
      const b = getTimeBucket(s.created_at);
      (buckets[b] ??= []).push(s);
    }
    return buckets;
  }, [filteredSessions]);

  const bucketLabels: Record<string, string> = {
    thisWeek: 'Cette semaine',
    lastWeek: 'La semaine derni\u00e8re',
    thisMonth: 'Ce mois',
    older: 'Plus ancien',
  };
  const bucketOrder = ['thisWeek', 'lastWeek', 'thisMonth', 'older'];

  const openFilter = () => { setSelectedPeriod(activePeriod); setFilterOpen(true); };
  const closeFilter = () => setFilterOpen(false);
  const applyFilter = () => { setActivePeriod(selectedPeriod); closeFilter(); };
  const resetFilter = () => { setActivePeriod(null); setSelectedPeriod(null); closeFilter(); };

  // ─── Render helpers ─────────────────────────────────────────────────────────

  const renderSessionCard = (s: SessionWithAudio, index: number) => {
    const names: string[] = [];
    if (s.companionName) names.push(s.companionName);
    const memberCount = names.length + 1; // +1 for user
    const statusLabel = '\u2713 Safe';
    const statusBg = 'rgba(52,211,153,0.12)';
    const statusColor = C.success;
    const cardBorder = C.borderSubtle;

    return (
      <motion.div
        key={s.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1], delay: index * 0.04 }}
        style={{
          background: C.surfaceCard,
          border: `1px solid ${cardBorder}`,
          borderRadius: 12,
          padding: 11,
          marginBottom: 8,
        }}
      >
        {/* Top row: avatars + info + badge */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          {/* Avatar stack */}
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {/* User avatar */}
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 600, color: 'white',
              background: 'linear-gradient(135deg,#3BB4C1,#1E3A5F)',
              border: `2px solid ${C.surfaceCard}`,
              position: 'relative', zIndex: 2,
            }}>
              V
            </div>
            {/* Companion avatar(s) */}
            {names.map((name, i) => (
              <div key={i} style={{
                width: 28, height: 28, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 600, color: 'white',
                background: avatarColor(name),
                border: `2px solid ${C.surfaceCard}`,
                marginLeft: -6, position: 'relative', zIndex: 1 - i,
              }}>
                {initials(name)}
              </div>
            ))}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0, marginLeft: 8 }}>
            <div style={{
              fontSize: 12, fontWeight: 600, color: C.textPrimary,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {s.companionName ? `Vous + ${s.companionName}` : 'Vous (solo)'}
            </div>
            <div style={{ fontSize: 10, color: C.textTertiary }}>
              {memberCount} accompagnant{memberCount > 1 ? 's' : ''} · {formatShortDate(s.created_at)}
            </div>
          </div>

          {/* Status badge */}
          <div style={{
            padding: '2px 7px', borderRadius: 9999, fontSize: 10, fontWeight: 600,
            background: statusBg, color: statusColor, flexShrink: 0, marginLeft: 6,
          }}>
            {statusLabel}
          </div>
        </div>

        {/* Route row */}
        {s.destination && (
          <div style={{
            display: 'flex', gap: 7, padding: '7px 10px',
            background: C.surfaceBase, borderRadius: 8, marginBottom: 7,
          }}>
            {/* Connector dots */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0, paddingTop: 2 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.teal }} />
              <div style={{ width: 1, height: 8, background: C.borderDefault }} />
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.purple }} />
            </div>
            {/* Places */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 11, fontWeight: 500, color: C.textPrimary,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {s.destination}
              </div>
              <div style={{
                fontSize: 11, color: C.textSecondary,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                Trajet Walk With Me
              </div>
            </div>
          </div>
        )}

        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {s.durationMin != null && (
            <span style={{ fontSize: 11, color: C.textTertiary }}>
              \uD83D\uDD50 {s.durationMin} min
            </span>
          )}
          {s.durationMin != null && (
            <>
              <span style={{ width: 2, height: 2, borderRadius: '50%', background: C.borderDefault, display: 'inline-block' }} />
              <span style={{ fontSize: 11, color: C.textTertiary }}>
                \uD83D\uDCCD Walk With Me
              </span>
            </>
          )}
        </div>
      </motion.div>
    );
  };

  // ─── Filter modal ───────────────────────────────────────────────────────────
  const renderFilterModal = () => (
    <AnimatePresence>
      {filterOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeFilter}
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(7,16,31,0.65)',
              backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
              borderRadius: 'inherit',
              zIndex: 500,
            }}
          />
          {/* Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: C.surfaceCard,
              borderTopLeftRadius: 20, borderTopRightRadius: 20,
              borderTop: `1px solid ${C.borderSubtle}`,
              zIndex: 600,
              overflow: 'hidden',
            }}
          >
            {/* Handle */}
            <div style={{ width: 32, height: 3, borderRadius: 9999, background: C.borderDefault, margin: '12px auto 0' }} />

            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px 12px',
              borderBottom: `1px solid ${C.borderSubtle}`,
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>P\u00e9riode</div>
                <div style={{ fontSize: 11, color: C.textTertiary, marginTop: 1 }}>Filtrer l&apos;historique</div>
              </div>
              <button
                onClick={applyFilter}
                disabled={!selectedPeriod}
                style={{
                  width: 30, height: 30, borderRadius: '50%', border: 'none',
                  background: selectedPeriod ? C.teal : C.surfaceEl,
                  color: selectedPeriod ? 'white' : C.textTertiary,
                  fontSize: 14, fontWeight: 700, cursor: selectedPeriod ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'inherit',
                }}
              >
                \u2192
              </button>
            </div>

            {/* Period options */}
            <div style={{ padding: '4px 0' }}>
              {PERIOD_OPTIONS.map((opt) => {
                const sel = selectedPeriod === opt.val;
                return (
                  <div
                    key={opt.val}
                    onClick={() => setSelectedPeriod(opt.val)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '11px 16px', cursor: 'pointer',
                      background: sel ? 'rgba(59,180,193,0.06)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: 32, height: 32, borderRadius: 9,
                      background: sel ? 'rgba(59,180,193,0.15)' : C.surfaceEl,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15, flexShrink: 0,
                      transition: 'background 0.15s',
                    }}>
                      {opt.icon}
                    </div>
                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: sel ? C.teal : C.textPrimary, transition: 'color 0.15s' }}>
                        {opt.label}
                      </div>
                      <div style={{ fontSize: 11, color: C.textTertiary, marginTop: 1 }}>{opt.desc}</div>
                    </div>
                    {/* Check */}
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      border: sel ? `1.5px solid ${C.teal}` : `1.5px solid ${C.borderDefault}`,
                      background: sel ? C.teal : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                      transform: sel ? 'scale(1.15)' : 'scale(1)',
                    }}>
                      {sel && <span style={{ fontSize: 10, color: 'white', fontWeight: 700 }}>\u2713</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: C.borderSubtle, margin: '0 16px' }} />

            {/* Reset */}
            <div
              onClick={resetFilter}
              style={{
                padding: '12px 16px 16px', textAlign: 'center',
                fontSize: 12, color: C.textTertiary, cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              \u21BA  R\u00e9initialiser
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // ─── Main render ────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={springSheet}
      style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        maxHeight: '84%',
        background: C.surfaceCard,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column',
        zIndex: 310,
        overflow: 'hidden',
        borderTop: `1px solid ${C.borderSubtle}`,
      }}
    >
      {/* Handle */}
      <div style={{ width: 36, height: 4, borderRadius: 9999, background: C.borderDefault, margin: '10px auto 0', flexShrink: 0 }} />

      {/* Header */}
      <div style={{ padding: '12px 16px 0', flexShrink: 0 }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'linear-gradient(135deg,#3BB4C1,#1E3A5F)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16,
            }}>
              \uD83D\uDEB6\u200D\u2640\uFE0F
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.textPrimary }}>Mes marches</div>
              <div style={{ fontSize: 11, color: C.textTertiary, marginTop: 1 }}>Walk With Me \u00b7 historique</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Filter button */}
            <button
              onClick={openFilter}
              style={{
                width: 28, height: 28, borderRadius: '50%',
                background: activePeriod ? 'rgba(59,180,193,0.12)' : C.surfaceEl,
                border: `1px solid ${activePeriod ? 'rgba(59,180,193,0.4)' : C.borderDefault}`,
                color: activePeriod ? C.teal : C.textTertiary,
                fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              \u2699
              {activePeriod && (
                <div style={{
                  position: 'absolute', top: 3, right: 3,
                  width: 7, height: 7, borderRadius: '50%',
                  background: C.teal, border: `2px solid ${C.surfaceCard}`,
                }} />
              )}
            </button>
            {/* Close */}
            <button
              onClick={onClose}
              style={{
                width: 26, height: 26, borderRadius: '50%',
                background: C.surfaceEl, border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={12} strokeWidth={2.5} color={C.textSecondary} />
            </button>
          </div>
        </div>

        {/* Active filter pill */}
        <div style={{
          maxHeight: activePeriod ? 36 : 0,
          opacity: activePeriod ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.25s ease, opacity 0.25s ease',
          marginBottom: activePeriod ? 8 : 0,
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(59,180,193,0.10)',
            border: '1px solid rgba(59,180,193,0.25)',
            borderRadius: 9999, padding: '4px 10px',
            fontSize: 11, fontWeight: 500, color: C.teal,
          }}>
            {PERIOD_OPTIONS.find(o => o.val === activePeriod)?.label ?? ''}
            <button
              onClick={resetFilter}
              style={{
                background: 'none', border: 'none', color: C.teal,
                cursor: 'pointer', fontSize: 11, padding: 0, lineHeight: 1,
                opacity: 0.7, fontFamily: 'inherit',
              }}
            >
              \u2715
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', background: C.surfaceBase, borderRadius: 9999, padding: 3, gap: 2,
        }}>
          {(['mes', 'rejointes'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 9999,
                border: 'none', fontFamily: 'inherit',
                background: tab === t ? C.surfaceCard : 'transparent',
                color: tab === t ? C.textPrimary : C.textTertiary,
                fontSize: 12, fontWeight: 500, textAlign: 'center',
                cursor: 'pointer',
                boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {t === 'mes' ? 'Mes marches' : 'Rejointes'}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 100px', WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: C.textTertiary, fontSize: 13 }}>
            Chargement\u2026
          </div>
        ) : filteredSessions.length === 0 ? (
          /* Empty state */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 24px', textAlign: 'center', gap: 12 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg,rgba(59,180,193,0.15),rgba(167,139,250,0.15))',
              border: `1px solid ${C.borderSubtle}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28,
            }}>
              {tab === 'mes' ? '\uD83D\uDEB6\u200D\u2640\uFE0F' : '\uD83E\uDD1D'}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>
              {tab === 'mes' ? 'Aucune marche' : 'Pas encore accompagn\u00e9'}
            </div>
            <div style={{ fontSize: 13, color: C.textTertiary, lineHeight: 1.5, maxWidth: 220 }}>
              {tab === 'mes'
                ? "Tes marches Walk With Me appara\u00eetront ici."
                : "Quand une amie te demande de l\u2019accompagner, ses marches appara\u00eetront ici."
              }
            </div>
          </div>
        ) : (
          /* Grouped session list */
          bucketOrder.map((bucket) => {
            const items = grouped[bucket];
            if (!items || items.length === 0) return null;
            return (
              <div key={bucket}>
                <div style={{
                  fontSize: 10, fontWeight: 600, color: C.textTertiary,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  margin: '12px 0 8px',
                }}>
                  {bucketLabels[bucket]}
                </div>
                {items.map((s, i) => renderSessionCard(s, i))}
              </div>
            );
          })
        )}
      </div>

      {/* Filter modal */}
      {renderFilterModal()}
    </motion.div>
  );
}
