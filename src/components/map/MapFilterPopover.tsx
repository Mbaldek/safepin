'use client';

import { memo } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { MapFilters } from '@/stores/useStore';

interface MapFilterPopoverProps {
  isDark: boolean;
  showFilterPopover: boolean;
  setShowFilterPopover: (v: boolean) => void;
  mapFilters: MapFilters;
  setMapFilters: (f: MapFilters) => void;
  poiActive: boolean;
  setShowPharmacy: (v: boolean) => void;
  setShowHospital: (v: boolean) => void;
  setShowPolice: (v: boolean) => void;
  filterActiveCount: number;
}

export const MapFilterPopover = memo(function MapFilterPopover({
  isDark,
  showFilterPopover,
  setShowFilterPopover,
  mapFilters,
  setMapFilters,
  poiActive,
  setShowPharmacy,
  setShowHospital,
  setShowPolice,
  filterActiveCount,
}: MapFilterPopoverProps) {
  const active = showFilterPopover || filterActiveCount > 0;

  return (
    <>
      <button
        onClick={() => setShowFilterPopover(!showFilterPopover)}
        aria-label="Filtrer les signalements"
        style={{
          position: 'absolute', top: 58, right: 46, zIndex: 10,
          width: 32, height: 32, borderRadius: 9999,
          background: active ? '#3BB4C1' : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.85)'),
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          border: 'none',
          boxShadow: active ? '0 0 0 3px rgba(59,180,193,0.30)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', padding: 0,
        }}
      >
        <SlidersHorizontal size={16} strokeWidth={2} style={{ color: active ? '#fff' : 'var(--text-muted)' }} />
        {filterActiveCount > 0 && !showFilterPopover && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 14, height: 14, borderRadius: 7,
            background: '#EF4444', color: '#fff',
            fontSize: 8, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{filterActiveCount}</span>
        )}
      </button>

      {/* Filter popover */}
      {showFilterPopover && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowFilterPopover(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 59 }}
          />
          <div style={{
            position: 'absolute', top: 100, right: 10, zIndex: 60,
            width: 260, borderRadius: 12,
            background: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            padding: 12,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: isDark ? '#94A3B8' : '#64748B', marginBottom: 8 }}>
              Catégories
            </div>
            {[
              { emoji: '🚨', label: 'Danger', key: 'showDanger' as const, value: mapFilters.showDanger },
              { emoji: '⚠️', label: 'Vigilance', key: 'showWarning' as const, value: mapFilters.showWarning },
              { emoji: '🚧', label: 'Infrastructure', key: 'showInfra' as const, value: mapFilters.showInfra },
              { emoji: '💚', label: 'Positif', key: 'showPositive' as const, value: mapFilters.showPositive },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setMapFilters({ ...mapFilters, [item.key]: !item.value })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '7px 8px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: item.value
                    ? (isDark ? 'rgba(59,180,193,0.12)' : 'rgba(59,180,193,0.08)')
                    : 'transparent',
                  opacity: item.value ? 1 : 0.45,
                  transition: 'all 150ms',
                }}
              >
                <span style={{ fontSize: 13 }}>{item.emoji}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#E2E8F0' : '#1E293B', flex: 1, textAlign: 'left' }}>{item.label}</span>
                <div style={{
                  width: 32, height: 18, borderRadius: 9, padding: 2,
                  background: item.value ? '#3BB4C1' : (isDark ? '#334155' : '#CBD5E1'),
                  transition: 'background 150ms',
                }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: 7, background: '#fff',
                    transform: item.value ? 'translateX(14px)' : 'translateX(0)',
                    transition: 'transform 150ms',
                  }} />
                </div>
              </button>
            ))}

            {/* Lieux SOS toggle */}
            <button
              onClick={() => {
                const next = !poiActive;
                setShowPharmacy(next); setShowHospital(next); setShowPolice(next);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '7px 8px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: poiActive
                  ? (isDark ? 'rgba(59,180,193,0.12)' : 'rgba(59,180,193,0.08)')
                  : 'transparent',
                opacity: poiActive ? 1 : 0.45,
                transition: 'all 150ms',
              }}
            >
              <span style={{ fontSize: 13 }}>🏥</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#E2E8F0' : '#1E293B', flex: 1, textAlign: 'left' }}>Lieux SOS</span>
              <div style={{
                width: 32, height: 18, borderRadius: 9, padding: 2,
                background: poiActive ? '#3BB4C1' : (isDark ? '#334155' : '#CBD5E1'),
                transition: 'background 150ms',
              }}>
                <div style={{
                  width: 14, height: 14, borderRadius: 7, background: '#fff',
                  transform: poiActive ? 'translateX(14px)' : 'translateX(0)',
                  transition: 'transform 150ms',
                }} />
              </div>
            </button>

            {/* Divider */}
            <div style={{ height: 1, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', margin: '8px 0' }} />

            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: isDark ? '#94A3B8' : '#64748B', marginBottom: 6 }}>
              Qualité
            </div>

            {/* Confirmés only toggle */}
            <button
              onClick={() => setMapFilters({ ...mapFilters, confirmedOnly: !mapFilters.confirmedOnly })}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '7px 8px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: mapFilters.confirmedOnly
                  ? (isDark ? 'rgba(59,180,193,0.12)' : 'rgba(59,180,193,0.08)')
                  : 'transparent',
                transition: 'all 150ms',
              }}
            >
              <span style={{ fontSize: 13 }}>✅</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#E2E8F0' : '#1E293B', flex: 1, textAlign: 'left' }}>Confirmés uniquement</span>
              <div style={{
                width: 32, height: 18, borderRadius: 9, padding: 2,
                background: mapFilters.confirmedOnly ? '#3BB4C1' : (isDark ? '#334155' : '#CBD5E1'),
                transition: 'background 150ms',
              }}>
                <div style={{
                  width: 14, height: 14, borderRadius: 7, background: '#fff',
                  transform: mapFilters.confirmedOnly ? 'translateX(14px)' : 'translateX(0)',
                  transition: 'transform 150ms',
                }} />
              </div>
            </button>

            {/* Divider */}
            <div style={{ height: 1, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', margin: '8px 0' }} />

            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: isDark ? '#94A3B8' : '#64748B', marginBottom: 6 }}>
              Période
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {([
                { label: 'Tous', value: 'all' },
                { label: '1h', value: '1h' },
                { label: "Aujourd'hui", value: 'today' },
                { label: '7 jours', value: '7d' },
              ] as const).map((item) => (
                <button
                  key={item.value}
                  onClick={() => setMapFilters({ ...mapFilters, age: item.value })}
                  style={{
                    padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontSize: 11, fontWeight: 600,
                    background: mapFilters.age === item.value
                      ? '#3BB4C1'
                      : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                    color: mapFilters.age === item.value
                      ? '#fff'
                      : (isDark ? '#CBD5E1' : '#64748B'),
                    transition: 'all 150ms',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Reset link */}
            {filterActiveCount > 0 && (
              <button
                onClick={() => {
                  setMapFilters({ ...mapFilters, showDanger: true, showWarning: true, showInfra: true, showPositive: true, confirmedOnly: false, age: 'all' });
                  setShowPharmacy(true); setShowHospital(true); setShowPolice(true);
                }}
                style={{
                  display: 'block', width: '100%', marginTop: 8, padding: '6px 0',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 600, color: '#3BB4C1', textAlign: 'center',
                }}
              >
                Réinitialiser
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
});
