// src/components/nearby/NearbySheet.tsx — Snap-draggable incidents sheet

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, PanInfo, AnimatePresence } from 'framer-motion';
import { Shield, ChevronUp, X } from 'lucide-react';
import { useStore } from '@/stores/useStore';
import { useIsDark } from '@/hooks/useIsDark';
import { CATEGORY_DETAILS, CATEGORY_GROUPS } from '@/types';
import { haversineMeters } from '@/lib/utils';
import { useMemo } from 'react';
import type { Pin } from '@/types';

// ── Theme ────────────────────────────────────────────────────────────────────

function getColors(isDark: boolean) {
  return isDark ? {
    bg: '#0F172A', sheet: '#1A2540', card: '#1E293B', elevated: '#334155',
    t1: '#FFFFFF', t2: '#94A3B8', t3: '#64748B',
    border: 'rgba(255,255,255,0.08)',
  } : {
    bg: '#F8FAFC', sheet: '#FFFFFF', card: '#FFFFFF', elevated: '#F1F5F9',
    t1: '#0F172A', t2: '#475569', t3: '#94A3B8',
    border: 'rgba(15,23,42,0.07)',
  };
}

const F = {
  cyan: '#3BB4C1', cyanSoft: 'rgba(59,180,193,0.12)', cyanBorder: 'rgba(59,180,193,0.25)',
  gold: '#F5C341',
  success: '#34D399',
  danger: '#EF4444',
  warning: '#FBBF24',
};

// ── Category / severity config ───────────────────────────────────────────────

const EMOJI_MAP: Record<string, string> = {
  theft: '👜', assault: '🚨', harassment: '🫷', following: '👤',
  suspect: '👁️', group: '👥', unsafe: '⚠️',
  lighting: '💡', blocked: '🚧', closed: '🔒',
  safe: '✅', help: '🤝', presence: '👮',
};

function getCatConfig(category: string) {
  const detail = CATEGORY_DETAILS[category];
  const emoji = EMOJI_MAP[category] ?? detail?.emoji ?? '⚠️';
  const group = detail?.group ?? 'warning';
  const color = CATEGORY_GROUPS[group]?.color.text ?? F.warning;
  const label = detail?.label ?? category;
  return { emoji, color, label };
}

const SEVERITY_CONFIG: Record<string, { bg: string; border: string; text: string; label: string }> = {
  high: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.2)',   text: F.danger,  label: 'Grave' },
  med:  { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.2)', text: F.gold,    label: 'Modéré' },
  low:  { bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.2)', text: F.success, label: 'Faible' },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDist(m: number) {
  if (m < 1000) return `${Math.round(m / 10) * 10}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

function formatTimeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'À l\u2019instant';
  if (s < 3600) return `Il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `Il y a ${Math.floor(s / 3600)}h`;
  return `Il y a ${Math.floor(s / 86400)}j`;
}

// ── Snap points ──────────────────────────────────────────────────────────────

const SNAP_POINTS = { collapsed: 120, half: 0.5, full: 0.85 };
type SnapPoint = 'collapsed' | 'half' | 'full';

const tabs = ['Signalements', 'Sécurité', 'Alertes'] as const;

// ── Main Component ───────────────────────────────────────────────────────────

type Props = { onClose: () => void };

export default function NearbySheet({ onClose }: Props) {
  const isDark = useIsDark();
  const C = getColors(isDark);
  const { pins, userLocation, setSelectedPin, setActiveSheet, setMapFlyTo } = useStore();

  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('Signalements');
  const [severityFilter, setSeverityFilter] = useState<string>('Tous');
  const [radiusFilter, setRadiusFilter] = useState<string>('1km');
  const [snapPoint, setSnapPoint] = useState<SnapPoint>('half');
  const containerRef = useRef<HTMLDivElement>(null);

  const [viewportHeight, setViewportHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  useEffect(() => {
    const update = () => setViewportHeight(window.innerHeight);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const getSnapHeight = (p: SnapPoint) =>
    p === 'collapsed' ? SNAP_POINTS.collapsed : viewportHeight * SNAP_POINTS[p];
  const currentHeight = getSnapHeight(snapPoint);

  // ── Filter pins ──────────────────────────────────────────────────────────

  const radiusMeters = (() => {
    const n = parseFloat(radiusFilter);
    return radiusFilter.endsWith('km') ? n * 1000 : n;
  })();

  const enrichedPins = useMemo(() => {
    const now = Date.now();
    return pins
      .filter((p) => !p.resolved_at && !p.hidden_at)
      .filter((p) => (now - new Date(p.created_at).getTime()) / 3_600_000 < 48)
      .map((p) => ({
        pin: p,
        dist: userLocation ? haversineMeters(userLocation, { lat: p.lat, lng: p.lng }) : null,
      }))
      .filter((e) => e.dist === null || e.dist <= radiusMeters)
      .sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity));
  }, [pins, userLocation, radiusMeters]);

  const filteredPins = useMemo(() => {
    if (severityFilter === 'Tous') return enrichedPins;
    const map: Record<string, string> = { Faible: 'low', 'Modéré': 'med', Grave: 'high' };
    const sev = map[severityFilter];
    return enrichedPins.filter((e) => e.pin.severity === sev);
  }, [enrichedPins, severityFilter]);

  // ── Drag snap ────────────────────────────────────────────────────────────

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const vel = info.velocity.y;
    if (vel > 500) {
      setSnapPoint(snapPoint === 'full' ? 'half' : 'collapsed');
    } else if (vel < -500) {
      setSnapPoint(snapPoint === 'collapsed' ? 'half' : 'full');
    } else {
      const offset = currentHeight + info.offset.y;
      const dists = (['collapsed', 'half', 'full'] as SnapPoint[]).map((p) => ({
        p,
        d: Math.abs(offset - getSnapHeight(p)),
      }));
      dists.sort((a, b) => a.d - b.d);
      setSnapPoint(dists[0].p);
    }
  };

  // ── Pin tap ──────────────────────────────────────────────────────────────

  function handlePinTap(pin: Pin) {
    setSelectedPin(pin);
    setActiveSheet('detail');
    setMapFlyTo({ lat: pin.lat, lng: pin.lng, zoom: 16 });
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const severityFilters = ['Tous', 'Faible', 'Modéré', 'Grave'];
  const radiusFilters = ['500m', '1km', '2km', '5km'];

  return (
    <motion.div
      ref={containerRef}
      className="sheet-glow sheet-highlight"
      initial={{ height: getSnapHeight('half') }}
      animate={{ height: currentHeight }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        position: 'fixed',
        bottom: 64,
        left: 0,
        right: 0,
        backgroundColor: isDark ? 'rgba(30,41,59,0.92)' : 'rgba(255,255,255,0.95)',
        zIndex: 301,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
      }}
    >
      {/* Drag handle */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        onClick={() => snapPoint === 'collapsed' && setSnapPoint('half')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 10,
          paddingBottom: 6,
          cursor: 'grab',
          touchAction: 'none',
        }}
      >
        <div style={{ width: 36, height: 4, backgroundColor: C.t3, borderRadius: 9999, opacity: 0.4 }} />
        {snapPoint === 'collapsed' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, color: C.t2, fontSize: 12 }}
          >
            <ChevronUp size={14} />
            <span>Glisser pour voir</span>
          </motion.div>
        )}
      </motion.div>

      {/* Peek header — always visible */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 0', paddingBottom: snapPoint === 'collapsed' ? 16 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ fontSize: 13, fontWeight: 800, color: C.t1, margin: 0 }}>
            Signalements proches
          </h2>
          <motion.span
            key={filteredPins.length}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              backgroundColor: F.cyanSoft,
              border: `1px solid ${F.cyanBorder}`,
              color: F.cyan,
              fontSize: 11,
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 9999,
            }}
          >
            {filteredPins.length}
          </motion.span>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 28,
            height: 28,
            borderRadius: 9999,
            backgroundColor: C.elevated,
            border: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={13} style={{ color: C.t2 }} />
        </button>
      </div>

      {/* Content — hidden when collapsed */}
      {snapPoint !== 'collapsed' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          {/* Tabs */}
          <div style={{ display: 'flex', padding: '10px 16px 0', borderBottom: `1px solid ${C.border}` }}>
            {tabs.map((tab) => {
              const disabled = tab === 'Sécurité' || tab === 'Alertes';
              const isActive = !disabled && activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => { if (!disabled) setActiveTab(tab); }}
                  style={{
                    flex: 1,
                    padding: '0 4px 8px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: disabled ? C.t3 : isActive ? F.cyan : C.t3,
                    opacity: disabled ? 0.45 : 1,
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: '2px solid transparent',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    pointerEvents: disabled ? 'none' : 'auto',
                    transition: 'color 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    position: 'relative',
                    fontFamily: 'inherit',
                  }}
                >
                  {tab}
                  {disabled && (
                    <span style={{
                      fontSize: 9,
                      fontWeight: 700,
                      background: C.elevated,
                      color: C.t3,
                      borderRadius: 99,
                      padding: '1px 5px',
                      border: `1px solid ${C.border}`,
                    }}>
                      Bientôt
                    </span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="nearby-tab-bar"
                      style={{
                        position: 'absolute',
                        bottom: -1, left: 0, right: 0,
                        height: 2,
                        background: F.cyan,
                        borderRadius: 1,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Filters */}
          <div style={{ padding: '10px 14px 0', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {/* Radius */}
            <div style={{ display: 'flex', gap: 6 }}>
              {radiusFilters.map((f) => (
                <Pill
                  key={f}
                  label={f}
                  isActive={radiusFilter === f}
                  activeColor="teal"
                  onClick={() => setRadiusFilter(f)}
                  C={C}
                />
              ))}
            </div>
            {/* Severity */}
            <div style={{ display: 'flex', gap: 6, paddingBottom: 8 }}>
              {severityFilters.map((f) => (
                <Pill
                  key={f}
                  label={f}
                  isActive={severityFilter === f}
                  activeColor={f === 'Tous' ? 'teal' : f === 'Faible' ? 'green' : f === 'Modéré' ? 'amber' : 'red'}
                  tint={f === 'Faible' ? 'green' : f === 'Modéré' ? 'amber' : f === 'Grave' ? 'red' : undefined}
                  onClick={() => setSeverityFilter(f)}
                  C={C}
                />
              ))}
            </div>
          </div>

          {/* Separator */}
          <div style={{ height: 1, background: C.border, margin: '0 14px' }} />

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0 8px' }}>
            {filteredPins.length === 0 ? (
              <EmptyState C={C} />
            ) : (
              <div key={`${radiusFilter}-${severityFilter}`}>
                {filteredPins.map((entry, i) => (
                  <IncidentItem
                    key={entry.pin.id}
                    pin={entry.pin}
                    dist={entry.dist}
                    index={i}
                    C={C}
                    isLast={i === filteredPins.length - 1}
                    onTap={handlePinTap}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

type Colors = ReturnType<typeof getColors>;
type ActiveColor = 'teal' | 'green' | 'amber' | 'red';
type TintColor = 'green' | 'amber' | 'red';

const ACTIVE_STYLES: Record<ActiveColor, { bg: string; border: string; color: string; shadow: string }> = {
  teal:  { bg: F.cyan,    border: F.cyan,    color: '#fff',     shadow: '0 4px 14px rgba(59,180,193,0.4)' },
  green: { bg: F.success, border: F.success, color: '#fff',     shadow: '0 4px 14px rgba(52,211,153,0.4)' },
  amber: { bg: F.gold,    border: F.gold,    color: '#0F172A',  shadow: '0 4px 14px rgba(251,191,36,0.4)' },
  red:   { bg: F.danger,  border: F.danger,  color: '#fff',     shadow: '0 4px 14px rgba(239,68,68,0.4)' },
};

const TINT_STYLES: Record<TintColor, { bg: string; border: string; color: string }> = {
  green: { bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)',  color: F.success },
  amber: { bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)',  color: F.gold },
  red:   { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   color: F.danger },
};

function Pill({ label, isActive, activeColor, tint, onClick, C }: {
  label: string;
  isActive: boolean;
  activeColor: ActiveColor;
  tint?: TintColor;
  onClick: () => void;
  C: Colors;
}) {
  const activeStyle = ACTIVE_STYLES[activeColor];
  const tintStyle = tint ? TINT_STYLES[tint] : null;

  const bg = isActive ? activeStyle.bg : (tintStyle ? tintStyle.bg : 'transparent');
  const border = isActive ? activeStyle.border : (tintStyle ? tintStyle.border : C.border);
  const color = isActive ? activeStyle.color : (tintStyle ? tintStyle.color : C.t2);
  const shadow = isActive ? activeStyle.shadow : 'none';

  return (
    <motion.button
      onClick={onClick}
      animate={{ scale: isActive ? 1.06 : 1, boxShadow: shadow }}
      whileTap={{ scale: 0.88 }}
      whileHover={!isActive ? { scale: 1.04 } : { scale: 1.09 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      style={{
        backgroundColor: bg,
        color,
        border: `1.5px solid ${border}`,
        borderRadius: 99,
        padding: '6px 13px',
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        whiteSpace: 'nowrap' as const,
        fontFamily: 'inherit',
        outline: 'none',
      }}
    >
      {label}
    </motion.button>
  );
}

function IncidentItem({ pin, dist, index, C, isLast, onTap }: {
  pin: Pin; dist: number | null; index: number; C: Colors; isLast: boolean;
  onTap: (p: Pin) => void;
}) {
  const cat = getCatConfig(pin.category);
  const sev = SEVERITY_CONFIG[pin.severity] ?? SEVERITY_CONFIG.low;

  return (
    <motion.div
      initial={{ opacity: 0, x: -22 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 360, damping: 28, delay: Math.min(index * 0.08, 0.32) }}
      whileTap={{ scale: 0.98, opacity: 0.75 }}
      onClick={() => onTap(pin)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '11px 16px',
        borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
        cursor: 'pointer',
      }}
    >
      {/* Emoji circle */}
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          backgroundColor: `${cat.color}20`,
          border: `1px solid ${cat.color}50`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          flexShrink: 0,
        }}
      >
        {cat.emoji}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {cat.label}
        </div>
        <div style={{ fontSize: 10, color: C.t3, display: 'flex', alignItems: 'center', gap: 6 }}>
          {dist !== null && <span>{formatDist(dist)}</span>}
          <span>·</span>
          <span>{formatTimeAgo(pin.created_at)}</span>
        </div>
      </div>

      {/* Severity badge — soft */}
      <div
        style={{
          backgroundColor: sev.bg,
          border: `1px solid ${sev.border}`,
          color: sev.text,
          fontSize: 10,
          fontWeight: 700,
          padding: '3px 8px',
          borderRadius: 9999,
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        {sev.label}
      </div>
    </motion.div>
  );
}

function EmptyState({ C }: { C: Colors }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 0',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 9999,
          backgroundColor: `${F.cyan}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
        }}
      >
        <Shield size={28} color={F.cyan} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.t1, marginBottom: 4 }}>
        Aucun signalement
      </div>
      <div style={{ fontSize: 11, color: C.t2 }}>
        Cette zone semble calme
      </div>
    </motion.div>
  );
}
