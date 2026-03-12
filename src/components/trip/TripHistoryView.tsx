"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { colors, spring } from "@/lib/trip-constants";
import type { Trip } from "@/lib/trip-constants";

interface TripHistoryViewProps {
  allTrips: Trip[];
  recentTrips: Trip[];
  isDark: boolean;
  onBack: () => void;
  onSelectTrip?: (trip: Trip) => void;
}

export default function TripHistoryView({
  allTrips,
  recentTrips,
  isDark,
  onBack,
}: TripHistoryViewProps) {
  const [historyFilterOpen, setHistoryFilterOpen] = useState(false);
  const [historySelectedPeriod, setHistorySelectedPeriod] = useState<'week' | 'month' | 'all' | null>(null);
  const [historyActivePeriod, setHistoryActivePeriod] = useState<'week' | 'month' | 'all' | null>(null);

  const H = {
    surfaceBase:   isDark ? '#0F172A' : '#F1F5F9',
    surfaceCard:   isDark ? '#1E293B' : '#FFFFFF',
    surfaceEl:     isDark ? '#253347' : '#F8FAFC',
    textPrimary:   isDark ? '#FFFFFF' : '#0F172A',
    textSecond:    isDark ? '#94A3B8' : '#475569',
    textTertiary:  isDark ? '#64748B' : '#94A3B8',
    borderSubtle:  isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)',
    borderDef:     isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.10)',
    teal:          '#3BB4C1',
    purple:        '#A78BFA',
    success:       '#34D399',
    warning:       '#FBBF24',
    danger:        '#EF4444',
  };

  const scoreColor = (score: number | null) => {
    if (!score) return H.textTertiary;
    if (score >= 70) return H.success;
    if (score >= 40) return H.warning;
    return H.danger;
  };
  const scoreBg = (score: number | null) => {
    if (!score) return 'rgba(148,163,184,0.10)';
    if (score >= 70) return 'rgba(52,211,153,0.10)';
    if (score >= 40) return 'rgba(251,191,36,0.10)';
    return 'rgba(239,68,68,0.10)';
  };
  const modeIcon = (trip: Trip) => {
    const m = trip.mode;
    if (m === 'cycling') return '\u{1F6B4}\u200D\u2640\uFE0F';
    if (m === 'driving') return '\u{1F697}';
    return '\u{1F6B6}\u200D\u2640\uFE0F';
  };
  const periodMeta: Record<string, { icon: string; name: string; desc: string }> = {
    week:  { icon: '\u{1F4C5}', name: 'Cette semaine', desc: '7 derniers jours' },
    month: { icon: '\u{1F5D3}', name: 'Ce mois', desc: '30 derniers jours' },
    all:   { icon: '\u221E', name: "Tout l'historique", desc: 'Depuis le d\u00E9but' },
  };

  const filteredTrips = useMemo(() => {
    const trips = allTrips.length ? allTrips : recentTrips;
    if (!historyActivePeriod) return trips;
    const now = Date.now();
    const cutoff = historyActivePeriod === 'week' ? 7 : historyActivePeriod === 'month' ? 30 : Infinity;
    if (cutoff === Infinity) return trips;
    return trips.filter(t => (now - new Date(t.started_at).getTime()) <= cutoff * 24 * 60 * 60 * 1000);
  }, [allTrips, recentTrips, historyActivePeriod]);

  const groupedTrips = useMemo(() => {
    const now = Date.now();
    const sections: { label: string; trips: typeof filteredTrips }[] = [];
    const week: typeof filteredTrips = [];
    const lastWeek: typeof filteredTrips = [];
    const month: typeof filteredTrips = [];
    const older: typeof filteredTrips = [];
    filteredTrips.forEach(t => {
      const age = (now - new Date(t.started_at).getTime()) / 86400000;
      if (age <= 7) week.push(t);
      else if (age <= 14) lastWeek.push(t);
      else if (age <= 30) month.push(t);
      else older.push(t);
    });
    if (week.length) sections.push({ label: 'Cette semaine', trips: week });
    if (lastWeek.length) sections.push({ label: 'La semaine derni\u00E8re', trips: lastWeek });
    if (month.length) sections.push({ label: 'Ce mois', trips: month });
    if (older.length) sections.push({ label: 'Plus ancien', trips: older });
    return sections;
  }, [filteredTrips]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={spring}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}
    >
      {/* HEADER */}
      <div style={{ padding: '12px 16px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          {/* Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={onBack}
              style={{
                width: 28, height: 28, borderRadius: 9999,
                background: H.surfaceEl, border: `1px solid ${H.borderDef}`,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: H.textSecond, fontSize: 13, fontFamily: 'inherit',
              }}
            >
              {'\u2039'}
            </button>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'linear-gradient(135deg,#3BB4C1,#1E3A5F)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}>
              {'\u{1F5FA}'}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: H.textPrimary }}>Mes trajets</div>
              <div style={{ fontSize: 11, color: H.textTertiary, marginTop: 1 }}>Trajet avec destination \u00B7 historique</div>
            </div>
          </div>
          {/* Filter button */}
          <button
            onClick={() => { setHistorySelectedPeriod(historyActivePeriod); setHistoryFilterOpen(true); }}
            style={{
              width: 28, height: 28, borderRadius: 9999, position: 'relative',
              background: historyActivePeriod ? 'rgba(59,180,193,0.12)' : H.surfaceEl,
              border: `1px solid ${historyActivePeriod ? 'rgba(59,180,193,0.4)' : H.borderDef}`,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: historyActivePeriod ? H.teal : H.textTertiary, fontSize: 13, fontFamily: 'inherit',
            }}
          >
            {'\u2699'}
            {historyActivePeriod && (
              <div style={{
                position: 'absolute', top: 3, right: 3, width: 7, height: 7,
                borderRadius: '50%', background: H.teal,
                border: `2px solid ${H.surfaceCard}`,
              }} />
            )}
          </button>
        </div>

        {/* Active filter pill */}
        <div style={{
          overflow: 'hidden',
          maxHeight: historyActivePeriod ? 36 : 0,
          opacity: historyActivePeriod ? 1 : 0,
          transition: 'max-height 0.25s ease, opacity 0.2s',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(59,180,193,0.10)', border: '1px solid rgba(59,180,193,0.25)',
            borderRadius: 9999, padding: '4px 10px', fontSize: 11, fontWeight: 500,
            color: H.teal, marginBottom: 8,
          }}>
            <span>{historyActivePeriod ? periodMeta[historyActivePeriod]?.name ?? '' : ''}</span>
            <button
              onClick={() => { setHistoryActivePeriod(null); setHistorySelectedPeriod(null); }}
              style={{
                background: 'none', border: 'none', color: H.teal,
                cursor: 'pointer', fontSize: 10, opacity: 0.7, fontFamily: 'inherit', padding: 0,
              }}
            >
              {'\u2715'}
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 80px', WebkitOverflowScrolling: 'touch' }}>
        {filteredTrips.length === 0 ? (
          /* Empty state */
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '60px 24px', textAlign: 'center', gap: 10,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg,rgba(59,180,193,0.15),rgba(167,139,250,0.15))',
              border: `1px solid ${H.borderSubtle}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, marginBottom: 4,
            }}>
              {'\u{1F5FA}'}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: H.textPrimary }}>Aucun trajet enregistr\u00E9</div>
            <div style={{ fontSize: 13, color: H.textTertiary, lineHeight: 1.5, maxWidth: 220 }}>
              Tes trajets avec destination appara\u00EEtront ici une fois compl\u00E9t\u00E9s.
            </div>
          </div>
        ) : (
          groupedTrips.map(({ label, trips: sectionTrips }) => (
            <div key={label}>
              <div style={{
                fontSize: 10, fontWeight: 600, color: H.textTertiary,
                textTransform: 'uppercase', letterSpacing: '0.06em', margin: '12px 0 7px',
              }}>
                {label}
              </div>
              {sectionTrips.map((trip, idx) => {
                const score = trip.danger_score ?? null;
                return (
                  <motion.div
                    key={trip.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1], delay: idx * 0.04 }}
                    style={{
                      background: H.surfaceCard,
                      border: `1px solid ${score !== null && score < 40 ? 'rgba(251,191,36,0.15)' : H.borderSubtle}`,
                      borderRadius: 12, padding: 11, marginBottom: 8,
                    }}
                  >
                    {/* Card top */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                      {/* Mode icon + score dot */}
                      <div style={{
                        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                        background: H.surfaceEl, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 16, position: 'relative',
                      }}>
                        {modeIcon(trip)}
                        <div style={{
                          position: 'absolute', bottom: -2, right: -2,
                          width: 10, height: 10, borderRadius: '50%',
                          background: scoreColor(score),
                          border: `2px solid ${H.surfaceCard}`,
                        }} />
                      </div>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 600, color: H.textPrimary,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2,
                        }}>
                          {trip.to_label || 'Destination inconnue'}
                        </div>
                        <div style={{ fontSize: 10, color: H.textTertiary }}>
                          {new Date(trip.started_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                          {trip.planned_duration_s ? ` \u00B7 ${Math.round(trip.planned_duration_s / 60)} min` : ''}
                        </div>
                      </div>
                      {/* Status badge */}
                      <div style={{
                        padding: '2px 7px', borderRadius: 9999, fontSize: 10, fontWeight: 600, flexShrink: 0,
                        background: trip.status === 'completed' ? 'rgba(52,211,153,0.12)' : 'rgba(251,191,36,0.12)',
                        color: trip.status === 'completed' ? H.success : H.warning,
                      }}>
                        {trip.status === 'completed' ? '\u2713 Arriv\u00E9e' : '\u21A9 Abandonn\u00E9'}
                      </div>
                    </div>

                    {/* Route row */}
                    {trip.to_label && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        padding: '7px 10px', background: H.surfaceBase,
                        borderRadius: 8, marginBottom: 7,
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: H.teal }} />
                          <div style={{ width: 1, height: 8, background: H.borderDef }} />
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: H.purple }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 500, color: H.textPrimary,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            Ma position
                          </span>
                          <span style={{
                            fontSize: 11, color: H.textSecond,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {trip.to_label}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Meta + score */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {trip.planned_duration_s != null && (
                          <span style={{ fontSize: 11, color: H.textTertiary }}>{'\u{1F550}'} {Math.round(trip.planned_duration_s / 60)} min</span>
                        )}
                        {trip.planned_duration_s != null && (
                          <div style={{ width: 2, height: 2, borderRadius: '50%', background: H.borderDef }} />
                        )}
                        <span style={{ fontSize: 11, color: H.textTertiary }}>
                          {'\u{1F4CD}'} {trip.distance_m ? `${(trip.distance_m / 1000).toFixed(1)} km` : '\u2014'}
                        </span>
                      </div>
                      {score !== null && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '2px 7px', borderRadius: 9999, fontSize: 10, fontWeight: 600,
                          background: scoreBg(score), color: scoreColor(score),
                        }}>
                          <div style={{
                            width: 28, height: 3, borderRadius: 2,
                            background: H.borderSubtle, overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${Math.min(score, 100)}%`, height: '100%',
                              borderRadius: 2, background: scoreColor(score),
                            }} />
                          </div>
                          Score {Math.round(score)}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* FILTER MODAL */}
      <AnimatePresence>{historyFilterOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setHistoryFilterOpen(false)}
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(7,16,31,0.65)',
              backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
              zIndex: 500, borderRadius: 'inherit',
            }}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: H.surfaceCard,
              borderTopLeftRadius: 20, borderTopRightRadius: 20,
              zIndex: 600, borderTop: `1px solid ${H.borderSubtle}`,
            }}
          >
            <div style={{ width: 32, height: 3, background: H.borderDef, borderRadius: 9999, margin: '10px auto 0' }} />
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px 12px', borderBottom: `1px solid ${H.borderSubtle}`,
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: H.textPrimary }}>P\u00E9riode</div>
                <div style={{ fontSize: 11, color: H.textTertiary, marginTop: 2 }}>Filtrer l&apos;historique</div>
              </div>
              <button
                onClick={() => { setHistoryActivePeriod(historySelectedPeriod); setHistoryFilterOpen(false); }}
                disabled={!historySelectedPeriod}
                style={{
                  width: 30, height: 30, borderRadius: 9999,
                  background: historySelectedPeriod ? H.teal : H.surfaceEl,
                  border: 'none', cursor: historySelectedPeriod ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: historySelectedPeriod ? 'white' : H.textTertiary,
                  fontSize: 14, fontFamily: 'inherit',
                }}
              >
                {'\u2192'}
              </button>
            </div>
            {(['week', 'month', 'all'] as const).map(k => {
              const meta = periodMeta[k];
              const on = historySelectedPeriod === k;
              return (
                <div
                  key={k}
                  onClick={() => setHistorySelectedPeriod(k)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 16px', cursor: 'pointer',
                    background: on ? 'rgba(59,180,193,0.06)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                    background: on ? 'rgba(59,180,193,0.15)' : H.surfaceEl,
                    transition: 'background 0.15s',
                  }}>
                    {meta.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: on ? H.teal : H.textPrimary, transition: 'color 0.15s' }}>
                      {meta.name}
                    </div>
                    <div style={{ fontSize: 11, color: H.textTertiary, marginTop: 1 }}>{meta.desc}</div>
                  </div>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    border: on ? 'none' : `1.5px solid ${H.borderDef}`,
                    background: on ? H.teal : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: on ? 10 : 0, color: 'white',
                    transform: on ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.2s',
                  }}>
                    {on ? '\u2713' : ''}
                  </div>
                </div>
              );
            })}
            <div style={{ height: 1, background: H.borderSubtle, margin: '4px 16px' }} />
            <button
              onClick={() => { setHistoryActivePeriod(null); setHistorySelectedPeriod(null); setHistoryFilterOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '12px 16px 16px', fontSize: 12, color: H.textTertiary,
                gap: 4, background: 'none', border: 'none', width: '100%',
                fontFamily: 'inherit', cursor: 'pointer',
              }}
            >
              {'\u21BA'}&nbsp;&nbsp;R\u00E9initialiser
            </button>
          </motion.div>
        </>
      )}</AnimatePresence>
    </motion.div>
  );
}
