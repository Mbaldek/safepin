// src/components/LayerPanel.tsx

'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import CollapsibleSection from '@/components/CollapsibleSection';
import { useTheme } from '@/stores/useTheme';

type MapStyle = 'custom' | 'streets' | 'light' | 'dark';

type Props = {
  open: boolean;
  onClose: () => void;
  mapStyle: MapStyle;
  onStyleChange: (s: MapStyle) => void;
  showBus: boolean;
  onBusToggle: () => void;
  showMetroRER: boolean;
  onMetroRERToggle: () => void;
  transitLoading: boolean;
  showPharmacy: boolean;
  onPharmacyToggle: () => void;
  showHospital: boolean;
  onHospitalToggle: () => void;
  showPolice: boolean;
  onPoliceToggle: () => void;
  poiLoading: boolean;
  showHeatmap: boolean;
  onHeatmapToggle: () => void;
  showScores: boolean;
  onScoresToggle: () => void;
  showSafeSpaces: boolean;
  onSafeSpacesToggle: () => void;
  isAdmin?: boolean;
  showSimulated?: boolean;
  onSimulatedToggle?: () => void;
};

const STYLES: { id: MapStyle; label: string; emoji: string }[] = [
  { id: 'custom',  label: 'Breveil', emoji: '✦'  },
  { id: 'streets', label: 'Streets', emoji: '🗺️' },
  { id: 'light',   label: 'Light',   emoji: '☀️' },
  { id: 'dark',    label: 'Dark',    emoji: '🌙' },
];

const springConfig = { type: 'spring', damping: 32, stiffness: 300, mass: 0.8 } as const;

function getColors(isDark: boolean) {
  return isDark ? {
    bg: '#0F172A', card: '#1E293B', elevated: '#334155',
    textPrimary: '#FFFFFF', textSecondary: '#94A3B8', textTertiary: '#64748B',
    border: 'rgba(255,255,255,0.08)', borderMid: 'rgba(255,255,255,0.12)',
    hover: 'rgba(255,255,255,0.05)', active: 'rgba(255,255,255,0.10)',
    inputBg: 'rgba(255,255,255,0.06)',
  } : {
    bg: '#F8FAFC', card: '#FFFFFF', elevated: '#F1F5F9',
    textPrimary: '#0F172A', textSecondary: '#475569', textTertiary: '#94A3B8',
    border: 'rgba(15,23,42,0.06)', borderMid: 'rgba(15,23,42,0.10)',
    hover: 'rgba(15,23,42,0.03)', active: 'rgba(15,23,42,0.06)',
    inputBg: 'rgba(15,23,42,0.04)',
  };
}
const FIXED = {
  accentCyan: '#3BB4C1', accentCyanSoft: 'rgba(59,180,193,0.12)',
  accentGold: '#F5C341', semanticDanger: '#EF4444',
};

function Toggle({ on, loading, onToggle, label, color, emoji, textMuted, borderColor }: {
  on: boolean; loading?: boolean; onToggle: () => void; label: string; color: string; emoji: string;
  textMuted: string; borderColor: string;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-left transition active:scale-[0.98]"
      style={{
        backgroundColor: on ? `${color}15` : 'transparent',
        border: on ? `1.5px solid ${color}40` : '1.5px solid transparent',
      }}
    >
      <span className="text-sm">{emoji}</span>
      <span className="flex-1 text-xs font-bold" style={{ color: on ? color : textMuted }}>
        {label}
      </span>
      {loading ? (
        <Loader2 size={13} className="animate-spin" style={{ color }} />
      ) : (
        <div
          className="w-8 h-4.5 rounded-full relative transition-colors"
          style={{ backgroundColor: on ? color : borderColor }}
        >
          <div
            className="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all"
            style={{ left: on ? '16px' : '2px' }}
          />
        </div>
      )}
    </button>
  );
}

export default function LayerPanel(props: Props) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);
  const t = useTranslations('layers');
  const [expanded, setExpanded] = useState<string | null>(null);

  function toggle(id: string) {
    setExpanded(expanded === id ? null : id);
  }

  const poiCount = [props.showPharmacy, props.showHospital, props.showPolice].filter(Boolean).length;
  const transportCount = [props.showBus, props.showMetroRER].filter(Boolean).length;
  const dataCount = [props.showHeatmap, props.showScores, props.showSafeSpaces].filter(Boolean).length;

  return (
    <AnimatePresence>
      {props.open && (
        <>
          {/* Tap-away overlay */}
          <motion.div
            className="absolute inset-0 z-58"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ backgroundColor: isDark ? 'rgba(15,23,42,0.8)' : 'rgba(248,250,252,0.8)' }}
            onClick={props.onClose}
          />

          {/* Bottom sheet */}
          <motion.div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[92%] max-w-110 z-60 rounded-t-2xl max-h-[70vh] overflow-y-auto"
            style={{ backgroundColor: C.elevated, borderTop: `1px solid ${C.border}` }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springConfig}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: C.border }} />
            </div>

            {/* Header */}
            <div className="px-5 pb-2">
              <h3 className="text-base font-black" style={{ color: C.textPrimary }}>
                Layers
              </h3>
            </div>

            {/* Map style — always visible */}
            <div className="px-5 pb-3">
              <div className="flex gap-1">
                {STYLES.map(({ id, label, emoji }) => (
                  <button
                    key={id}
                    onClick={() => props.onStyleChange(id)}
                    className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-[0.65rem] font-bold transition"
                    style={{
                      backgroundColor: props.mapStyle === id ? FIXED.accentCyan : C.card,
                      color: props.mapStyle === id ? '#fff' : C.textSecondary,
                      border: props.mapStyle === id ? 'none' : `1px solid ${C.border}`,
                    }}
                  >
                    <span className="text-sm">{emoji}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Safety POIs */}
            <CollapsibleSection
              label={t('safetyPOI')}
              summary={poiCount > 0 ? `${poiCount} active` : 'None'}
              isActive={poiCount > 0}
              expanded={expanded === 'poi'}
              onToggle={() => toggle('poi')}
            >
              <div className="flex flex-col gap-0.5">
                <Toggle on={props.showPharmacy} onToggle={props.onPharmacyToggle} loading={props.poiLoading} label={t('pharmacies')} color="#10b981" emoji="💊" textMuted={C.textSecondary} borderColor={C.border} />
                <Toggle on={props.showHospital} onToggle={props.onHospitalToggle} loading={props.poiLoading} label={t('hospitals')} color="#ef4444" emoji="🏥" textMuted={C.textSecondary} borderColor={C.border} />
                <Toggle on={props.showPolice}   onToggle={props.onPoliceToggle}   loading={props.poiLoading} label={t('police')}     color="#3b82f6" emoji="🚔" textMuted={C.textSecondary} borderColor={C.border} />
              </div>
            </CollapsibleSection>

            {/* Transport */}
            <CollapsibleSection
              label={t('transport')}
              summary={transportCount > 0 ? `${transportCount} active` : 'None'}
              isActive={transportCount > 0}
              expanded={expanded === 'transport'}
              onToggle={() => toggle('transport')}
            >
              <div className="flex flex-col gap-0.5">
                <Toggle on={props.showBus} onToggle={props.onBusToggle} loading={props.transitLoading && !props.showBus} label={t('busStops')} color="#f59e0b" emoji="🚌" textMuted={C.textSecondary} borderColor={C.border} />
                <Toggle on={props.showMetroRER} onToggle={props.onMetroRERToggle} loading={props.transitLoading && !props.showMetroRER} label={t('metroRER')} color="#6366f1" emoji="🚇" textMuted={C.textSecondary} borderColor={C.border} />
              </div>
            </CollapsibleSection>

            {/* Data */}
            <CollapsibleSection
              label={t('data')}
              summary={dataCount > 0 ? `${dataCount} active` : 'None'}
              isActive={dataCount > 0}
              expanded={expanded === 'data'}
              onToggle={() => toggle('data')}
            >
              <div className="flex flex-col gap-0.5">
                <Toggle on={props.showHeatmap} onToggle={props.onHeatmapToggle} label={t('heatmap')} color={FIXED.accentGold} emoji="🔥" textMuted={C.textSecondary} borderColor={C.border} />
                <Toggle on={props.showScores} onToggle={props.onScoresToggle} label={t('safetyScores')} color="#6366f1" emoji="🗺️" textMuted={C.textSecondary} borderColor={C.border} />
                <Toggle on={props.showSafeSpaces} onToggle={props.onSafeSpacesToggle} label={t('safeSpaces')} color="#22c55e" emoji="🛡️" textMuted={C.textSecondary} borderColor={C.border} />
              </div>
            </CollapsibleSection>

            {/* Admin — Simulated */}
            {props.isAdmin && props.onSimulatedToggle && (
              <CollapsibleSection
                label="Admin"
                summary={props.showSimulated ? '1 active' : 'None'}
                isActive={!!props.showSimulated}
                expanded={expanded === 'admin'}
                onToggle={() => toggle('admin')}
              >
                <div className="flex flex-col gap-0.5">
                  <Toggle on={!!props.showSimulated} onToggle={props.onSimulatedToggle} label="Simulated" color="#f59e0b" emoji="🤖" textMuted={C.textSecondary} borderColor={C.border} />
                </div>
              </CollapsibleSection>
            )}

            {/* Bottom spacing */}
            <div className="h-4" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
