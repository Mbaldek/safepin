// src/components/nearby/NearbySheet.tsx — Snap-draggable incidents sheet

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { Shield, ChevronUp, X } from 'lucide-react';
import { useStore } from '@/stores/useStore';
import { useTheme } from '@/stores/useTheme';
import { CATEGORY_DETAILS, CATEGORY_GROUPS } from '@/types';
import { haversineMeters } from '@/lib/utils';
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
  cyan: '#3BB4C1', cyanSoft: 'rgba(59,180,193,0.12)',
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

const SEVERITY_CONFIG: Record<string, { bg: string; label: string }> = {
  high: { bg: F.danger, label: 'Grave' },
  med: { bg: F.gold, label: 'Modéré' },
  low: { bg: F.success, label: 'Faible' },
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
  const isDark = useTheme((s) => s.theme) === 'dark';
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
      initial={{ height: getSnapHeight('half') }}
      animate={{ height: currentHeight }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: C.sheet,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 -4px 30px rgba(0,0,0,0.2)',
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', paddingBottom: snapPoint === 'collapsed' ? 16 : 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.t1, margin: 0 }}>
            Signalements proches
          </h2>
          <motion.span
            key={filteredPins.length}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              backgroundColor: F.cyan,
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: 9999,
            }}
          >
            {filteredPins.length}
          </motion.span>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 32,
            height: 32,
            borderRadius: 9999,
            backgroundColor: C.card,
            border: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={16} style={{ color: C.t2 }} />
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
          <div style={{ display: 'flex', padding: '0 20px', borderBottom: `1px solid ${C.border}` }}>
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  fontSize: 14,
                  fontWeight: 500,
                  color: activeTab === tab ? F.cyan : C.t3,
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab ? `2px solid ${F.cyan}` : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div style={{ padding: '12px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Radius */}
            <div style={{ display: 'flex', gap: 8 }}>
              {radiusFilters.map((f) => (
                <FilterChip key={f} label={f} isActive={radiusFilter === f} onClick={() => setRadiusFilter(f)} C={C} small />
              ))}
            </div>
            {/* Severity */}
            <div style={{ display: 'flex', gap: 8, paddingBottom: 8 }}>
              {severityFilters.map((f) => (
                <SeverityChip key={f} label={f} isActive={severityFilter === f} onClick={() => setSeverityFilter(f)} C={C} />
              ))}
            </div>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
            {filteredPins.length === 0 ? (
              <EmptyState C={C} />
            ) : (
              <div>
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

function FilterChip({ label, isActive, onClick, C, small = false }: {
  label: string; isActive: boolean; onClick: () => void; C: Colors; small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        backgroundColor: isActive ? F.cyan : 'transparent',
        color: isActive ? '#fff' : C.t2,
        border: `1px solid ${isActive ? F.cyan : C.border}`,
        borderRadius: 16,
        padding: small ? '5px 10px' : '7px 14px',
        fontSize: small ? 12 : 13,
        fontWeight: 500,
        cursor: 'pointer',
        whiteSpace: 'nowrap' as const,
      }}
    >
      {label}
    </button>
  );
}

function SeverityChip({ label, isActive, onClick, C }: {
  label: string; isActive: boolean; onClick: () => void; C: Colors;
}) {
  const getStyle = () => {
    if (!isActive) return { bg: 'transparent', text: C.t2, border: C.border };
    switch (label) {
      case 'Faible': return { bg: F.success, text: '#fff', border: F.success };
      case 'Modéré': return { bg: F.gold, text: '#fff', border: F.gold };
      case 'Grave': return { bg: F.danger, text: '#fff', border: F.danger };
      default: return { bg: F.cyan, text: '#fff', border: F.cyan };
    }
  };
  const s = getStyle();
  return (
    <button
      onClick={onClick}
      style={{
        backgroundColor: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
        borderRadius: 16,
        padding: '5px 12px',
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={() => onTap(pin)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 0',
        borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
        cursor: 'pointer',
      }}
    >
      {/* Emoji circle */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          backgroundColor: `${cat.color}20`,
          border: `1px solid ${cat.color}50`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          flexShrink: 0,
        }}
      >
        {cat.emoji}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: C.t1 }}>
          {cat.label}
        </div>
        <div style={{ fontSize: 13, color: C.t2, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          {dist !== null && <span>{formatDist(dist)}</span>}
          <span>·</span>
          <span>{formatTimeAgo(pin.created_at)}</span>
        </div>
      </div>

      {/* Severity badge */}
      <div
        style={{
          backgroundColor: sev.bg,
          color: '#fff',
          fontSize: 11,
          fontWeight: 600,
          padding: '4px 8px',
          borderRadius: 9999,
          flexShrink: 0,
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
      <div style={{ fontSize: 15, fontWeight: 500, color: C.t1, marginBottom: 4 }}>
        Aucun signalement
      </div>
      <div style={{ fontSize: 13, color: C.t2 }}>
        Cette zone semble calme
      </div>
    </motion.div>
  );
}
