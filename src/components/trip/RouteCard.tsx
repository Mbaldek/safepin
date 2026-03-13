'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Shield } from 'lucide-react';
import type { TransitStep } from '@/lib/transit';
import { getLineIcon, formatTransitDuration } from '@/lib/transit';
import { getStepAlerts } from '@/lib/route-scoring';
import type { Pin } from '@/types';

interface RouteCardProps {
  color: string;
  label: string;
  duration: string;
  distance: string;
  isSelected: boolean;
  isDark: boolean;
  steps?: TransitStep[];
  pins?: Pin[];
  onStepLocationTap?: (lat: number, lng: number) => void;
  incidentsAvoided?: number;
  nearbyIncidents?: number;
  nearbyPinIds?: string[];
  onPinFocus?: (pin: Pin) => void;
}

const SEV_COLORS = { low: '#F59E0B', med: '#F97316', high: '#EF4444' } as const;

const CATEGORY_LABELS: Record<string, string> = {
  aggression: 'Agression',
  vol: 'Vol',
  harcelement: 'Harcèlement',
  accident: 'Accident',
  incivilite: 'Incivilité',
  alerte: 'Alerte',
  safe_space: 'Safe space',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'à l\'instant';
  if (min < 60) return `il y a ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

export default function RouteCard({
  color, label, duration, distance,
  isSelected, isDark, steps, pins,
  onStepLocationTap,
  incidentsAvoided = 0, nearbyIncidents = 0, nearbyPinIds = [],
  onPinFocus,
}: RouteCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [incidentsExpanded, setIncidentsExpanded] = useState(false);
  const hasSteps = steps && steps.length > 0;

  // Resolve nearby pin objects for the incident list
  const nearbyPins = pins?.filter(p => nearbyPinIds.includes(p.id)) ?? [];

  // Incident badge
  const hasBadge = incidentsAvoided > 0 || nearbyIncidents > 0;
  const badgeColor = incidentsAvoided > 0 ? '#34D399' : '#F59E0B';
  const badgeText = incidentsAvoided > 0
    ? `-${incidentsAvoided}`
    : nearbyIncidents > 0 ? `${nearbyIncidents}` : '';

  return (
    <div>
      {/* Header row */}
      <div
        style={{ display: 'flex', alignItems: 'center', padding: '0 20px', height: 40, cursor: hasSteps ? 'pointer' : undefined }}
        onClick={hasSteps ? (e) => { e.stopPropagation(); setExpanded(v => !v); } : undefined}
      >
        {/* Selection dot */}
        {isSelected ? (
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3BB4C1', marginRight: 8, flexShrink: 0 }} />
        ) : (
          <div style={{ width: 6, marginRight: 8 }} />
        )}

        {/* Color indicator */}
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, marginRight: 12, flexShrink: 0 }} />

        {/* Label */}
        <span style={{
          fontSize: 13,
          fontWeight: 500,
          color: isSelected ? '#3BB4C1' : (isDark ? '#FFFFFF' : '#111827'),
          flexGrow: 1,
        }}>
          {label}
        </span>

        {/* Duration */}
        <span style={{
          fontSize: 13,
          fontWeight: 700,
          color: isDark ? '#FFFFFF' : '#111827',
          marginRight: 8,
        }}>
          {duration}
        </span>

        {/* Distance */}
        {distance && (
          <span style={{ fontSize: 11, color: isDark ? '#64748B' : '#6B7280', marginRight: hasBadge ? 6 : (hasSteps ? 6 : 0) }}>
            {distance}
          </span>
        )}

        {/* Incident badge */}
        {hasBadge && (
          <button
            onClick={(e) => { e.stopPropagation(); setIncidentsExpanded(v => !v); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 10, fontWeight: 700,
              color: badgeColor,
              background: `${badgeColor}18`,
              padding: '2px 7px',
              borderRadius: 8,
              border: 'none', cursor: 'pointer',
              marginRight: hasSteps ? 6 : 0,
              flexShrink: 0,
            }}
          >
            <Shield size={10} strokeWidth={2.5} />
            {badgeText}
          </button>
        )}

        {/* Expand chevron */}
        {hasSteps && (
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <ChevronDown size={14} color={isDark ? '#64748B' : '#94A3B8'} />
          </motion.div>
        )}
      </div>

      {/* Expandable incident list */}
      <AnimatePresence>
        {incidentsExpanded && nearbyPins.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden', paddingLeft: 36, paddingRight: 20 }}
          >
            <div style={{
              borderLeft: `2px solid ${incidentsAvoided > 0 ? '#34D39940' : '#F59E0B40'}`,
              paddingLeft: 12,
              paddingBottom: 6,
              paddingTop: 4,
            }}>
              {nearbyPins.map((pin) => (
                <button
                  key={pin.id}
                  onClick={(e) => { e.stopPropagation(); onPinFocus?.(pin); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '4px 0',
                    background: 'none', border: 'none', cursor: 'pointer',
                    width: '100%', textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: SEV_COLORS[pin.severity as keyof typeof SEV_COLORS] ?? '#F59E0B',
                  }} />
                  <span style={{
                    fontSize: 11, fontWeight: 500,
                    color: isDark ? '#CBD5E1' : '#475569',
                  }}>
                    {CATEGORY_LABELS[pin.category] ?? pin.category}
                  </span>
                  {pin.address && (
                    <span style={{
                      fontSize: 10,
                      color: isDark ? '#64748B' : '#94A3B8',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      flex: 1, minWidth: 0,
                    }}>
                      {pin.address}
                    </span>
                  )}
                  <span style={{
                    fontSize: 10,
                    color: isDark ? '#475569' : '#94A3B8',
                    flexShrink: 0,
                  }}>
                    {timeAgo(pin.created_at)}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded step detail */}
      <AnimatePresence>
        {expanded && hasSteps && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden', paddingLeft: 46, paddingRight: 20 }}
          >
            <div style={{
              borderLeft: `2px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              paddingLeft: 12,
              paddingBottom: 8,
              paddingTop: 4,
            }}>
              {steps!.map((step, i) => (
                <StepRow
                  key={i}
                  step={step}
                  isDark={isDark}
                  pins={pins}
                  onLocationTap={onStepLocationTap}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepRow({
  step, isDark, pins, onLocationTap,
}: {
  step: TransitStep;
  isDark: boolean;
  pins?: Pin[];
  onLocationTap?: (lat: number, lng: number) => void;
}) {
  const icon = getLineIcon(step.mode);
  const dur = formatTransitDuration(step.duration);
  const isWalking = step.mode === 'walking';
  const alerts = !isWalking && pins ? getStepAlerts(step, pins) : null;

  const handleStationTap = (coordIdx: number) => {
    if (!onLocationTap || step.coords.length === 0) return;
    const c = coordIdx === 0 ? step.coords[0] : step.coords[step.coords.length - 1];
    onLocationTap(c[1], c[0]); // [lng,lat] → (lat,lng)
  };

  if (isWalking) {
    const distM = estimateWalkDistance(step.duration);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#6B7280' }}>
          {dur} · {distM}
        </span>
      </div>
    );
  }

  // Transit step
  const lineLabel = step.line ? `Ligne ${step.line}` : step.mode.toUpperCase();

  return (
    <div style={{ padding: '5px 0' }}>
      {/* Line info row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{
          fontSize: 12, fontWeight: 600,
          color: step.lineColor || '#3BB4C1',
          background: step.lineColor ? `${step.lineColor}18` : undefined,
          padding: step.lineColor ? '1px 6px' : undefined,
          borderRadius: 4,
        }}>
          {lineLabel}
        </span>
        <span style={{ fontSize: 12, color: isDark ? '#CBD5E1' : '#475569' }}>
          {dur}{step.stops ? ` · ${step.stops} arrêts` : ''}
        </span>
        {alerts && (
          <span style={{
            fontSize: 10, fontWeight: 600,
            color: SEV_COLORS[alerts.maxSeverity],
            background: `${SEV_COLORS[alerts.maxSeverity]}18`,
            padding: '1px 6px',
            borderRadius: 8,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
          }}>
            {alerts.count} signalement{alerts.count > 1 ? 's' : ''}
          </span>
        )}
      </div>
      {/* Stations */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 22, paddingTop: 2 }}>
        <button
          onClick={(e) => { e.stopPropagation(); handleStationTap(0); }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: 11, color: isDark ? '#94A3B8' : '#6B7280',
            textDecoration: 'underline', textDecorationStyle: 'dotted' as const,
            textUnderlineOffset: 2,
          }}
        >
          {step.from}
        </button>
        <span style={{ fontSize: 10, color: isDark ? '#475569' : '#94A3B8' }}>&rarr;</span>
        <button
          onClick={(e) => { e.stopPropagation(); handleStationTap(-1); }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: 11, color: isDark ? '#94A3B8' : '#6B7280',
            textDecoration: 'underline', textDecorationStyle: 'dotted' as const,
            textUnderlineOffset: 2,
          }}
        >
          {step.to}
        </button>
      </div>
    </div>
  );
}

function estimateWalkDistance(durationSec: number): string {
  const meters = Math.round((durationSec / 60) * 80); // ~80m/min walking speed
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
}
