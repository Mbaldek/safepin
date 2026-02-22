// src/components/LayerPanel.tsx

'use client';

import { motion } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';

type MapStyle = 'streets' | 'light' | 'dark';

type Props = {
  mapStyle: MapStyle;
  onStyleChange: (s: MapStyle) => void;
  showMetro: boolean;
  onMetroToggle: () => void;
  showRER: boolean;
  onRERToggle: () => void;
  showBus: boolean;
  onBusToggle: () => void;
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
  onClose: () => void;
};

const STYLES: { id: MapStyle; label: string; emoji: string }[] = [
  { id: 'streets', label: 'Streets', emoji: '🗺️' },
  { id: 'light',   label: 'Light',   emoji: '☀️' },
  { id: 'dark',    label: 'Dark',    emoji: '🌙' },
];

function Toggle({ on, loading, onToggle, label, color, emoji }: {
  on: boolean; loading?: boolean; onToggle: () => void; label: string; color: string; emoji: string;
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
      <span className="flex-1 text-xs font-bold" style={{ color: on ? color : 'var(--text-muted)' }}>
        {label}
      </span>
      {loading ? (
        <Loader2 size={13} className="animate-spin" style={{ color }} />
      ) : (
        <div
          className="w-8 h-[18px] rounded-full relative transition-colors"
          style={{ backgroundColor: on ? color : 'var(--border)' }}
        >
          <div
            className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-all"
            style={{ left: on ? '16px' : '2px' }}
          />
        </div>
      )}
    </button>
  );
}

export default function LayerPanel(props: Props) {
  return (
    <motion.div
      className="rounded-2xl p-3 w-[210px]"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--bg-primary) 92%, transparent)',
        border: '1px solid var(--border)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}
      initial={{ opacity: 0, scale: 0.85, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: 10 }}
      transition={{ type: 'spring', damping: 25, stiffness: 350, mass: 0.6 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="text-[0.6rem] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Layers
        </p>
        <button onClick={props.onClose} className="p-1 rounded-full transition active:opacity-60">
          <X size={12} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* Map style */}
      <div className="flex gap-1 mb-3">
        {STYLES.map(({ id, label, emoji }) => (
          <button
            key={id}
            onClick={() => props.onStyleChange(id)}
            className="flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-[0.6rem] font-bold transition"
            style={{
              backgroundColor: props.mapStyle === id ? 'var(--accent)' : 'transparent',
              color: props.mapStyle === id ? '#fff' : 'var(--text-muted)',
            }}
          >
            <span className="text-xs">{emoji}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-px mb-2" style={{ backgroundColor: 'var(--border)' }} />

      {/* Safety POIs */}
      <p className="text-[0.55rem] font-black uppercase tracking-widest px-1 mb-1" style={{ color: 'var(--text-muted)' }}>
        Safety
      </p>
      <div className="flex flex-col gap-0.5 mb-2">
        <Toggle on={props.showPharmacy} onToggle={props.onPharmacyToggle} loading={props.poiLoading} label="Pharmacies" color="#10b981" emoji="💊" />
        <Toggle on={props.showHospital} onToggle={props.onHospitalToggle} loading={props.poiLoading} label="Hospitals" color="#ef4444" emoji="🏥" />
        <Toggle on={props.showPolice}   onToggle={props.onPoliceToggle}   loading={props.poiLoading}   label="Police"     color="#3b82f6" emoji="🚔" />
      </div>

      {/* Divider */}
      <div className="h-px mb-2" style={{ backgroundColor: 'var(--border)' }} />

      {/* Transport */}
      <p className="text-[0.55rem] font-black uppercase tracking-widest px-1 mb-1" style={{ color: 'var(--text-muted)' }}>
        Transport
      </p>
      <div className="flex flex-col gap-0.5 mb-2">
        <Toggle on={props.showMetro} onToggle={props.onMetroToggle} loading={props.transitLoading && !props.showMetro && !props.showRER && !props.showBus} label="Metro" color="#3b82f6" emoji="🚇" />
        <Toggle on={props.showRER}   onToggle={props.onRERToggle}   loading={props.transitLoading && !props.showMetro && !props.showRER && !props.showBus} label="RER"   color="#8b5cf6" emoji="🚆" />
        <Toggle on={props.showBus}   onToggle={props.onBusToggle}   loading={props.transitLoading && !props.showMetro && !props.showRER && !props.showBus} label="Bus"   color="#f59e0b" emoji="🚌" />
      </div>

      {/* Divider */}
      <div className="h-px mb-2" style={{ backgroundColor: 'var(--border)' }} />

      {/* Data */}
      <p className="text-[0.55rem] font-black uppercase tracking-widest px-1 mb-1" style={{ color: 'var(--text-muted)' }}>
        Data
      </p>
      <div className="flex flex-col gap-0.5">
        <Toggle on={props.showHeatmap} onToggle={props.onHeatmapToggle} label="My heatmap" color="#f43f5e" emoji="🔥" />
        <Toggle on={props.showScores} onToggle={props.onScoresToggle} label="Safety scores" color="#6366f1" emoji="🗺️" />
      </div>
    </motion.div>
  );
}
