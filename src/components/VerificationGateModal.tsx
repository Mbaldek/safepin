'use client';

import { motion } from 'framer-motion';
import { useIsDark } from '@/hooks/useIsDark';

interface VerificationGateModalProps {
  onVerify: () => void;
}

const FEATURES = [
  { ic: '\u{1F9ED}', label: 'Trajet & Escorte', status: 'locked' },
  { ic: '\u{1F91D}', label: 'Cercle de confiance', status: 'locked' },
  { ic: '\u{1F4AC}', label: 'Messagerie DM', status: 'locked' },
  { ic: '\u{1F4CD}', label: 'Signaler un incident', status: 'locked' },
  { ic: '\u{1F465}', label: 'Groupes', status: 'locked' },
  { ic: '\u{1F4F0}', label: 'Fil communaut\u00e9', status: 'readonly' },
] as const;

const ringKeyframes = `
@keyframes gate-ring-pulse {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.08; transform: scale(1.12); }
}`;

export default function VerificationGateModal({ onVerify }: VerificationGateModalProps) {
  const isDark = useIsDark();

  const surfaceBase = isDark ? '#0F172A' : '#F1F5F9';
  const surfaceCard = isDark ? '#1E293B' : '#FFFFFF';
  const borderSubtle = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)';
  const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
  const textTertiary = isDark ? '#64748B' : '#94A3B8';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 900,
        backgroundColor: surfaceBase,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{ringKeyframes}</style>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 16px 12px',
          backgroundColor: surfaceCard,
          borderBottom: `1px solid ${borderSubtle}`,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: '#EF4444' }}>
          {'\u26A0\uFE0F'} Acc\u00e8s limit\u00e9
        </span>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {/* Hero */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            textAlign: 'center',
            padding: '8px 0 4px',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: 'rgba(239,68,68,0.10)',
              border: '1px solid rgba(239,68,68,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <span style={{ fontSize: 26 }}>{'\u{1F512}'}</span>
            <div
              style={{
                position: 'absolute',
                inset: -4,
                borderRadius: '50%',
                border: '2px solid #EF4444',
                animation: 'gate-ring-pulse 2.5s infinite',
              }}
            />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: textPrimary }}>
            V\u00e9rification requise
          </span>
          <span
            style={{
              fontSize: 11,
              color: textTertiary,
              lineHeight: 1.4,
              maxWidth: 210,
            }}
          >
            Pour acc\u00e9der \u00e0 cette fonctionnalit\u00e9, v\u00e9rifiez votre identit\u00e9. \u00c7a prend 2 minutes.
          </span>
        </div>

        {/* Features card */}
        <div
          style={{
            backgroundColor: surfaceCard,
            borderRadius: 14,
            border: `1px solid ${borderSubtle}`,
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: textTertiary,
              textTransform: 'uppercase',
              padding: '10px 12px 6px',
              letterSpacing: 0.5,
            }}
          >
            Fonctionnalit\u00e9s concern\u00e9es
          </div>
          {FEATURES.map((f) => (
            <div
              key={f.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 12px',
                borderTop: `1px solid ${borderSubtle}`,
              }}
            >
              <span style={{ fontSize: 14 }}>{f.ic}</span>
              <span style={{ flex: 1, fontSize: 11, color: textPrimary, fontWeight: 500 }}>
                {f.label}
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 9999,
                  backgroundColor:
                    f.status === 'locked'
                      ? 'rgba(239,68,68,0.12)'
                      : 'rgba(251,191,36,0.12)',
                  color: f.status === 'locked' ? '#EF4444' : '#FBBF24',
                }}
              >
                {f.status === 'locked' ? 'Bloqu\u00e9' : 'Lecture seule'}
              </span>
            </div>
          ))}
        </div>

        {/* SOS row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 12,
            backgroundColor: 'rgba(52,211,153,0.08)',
            border: '1px solid rgba(52,211,153,0.2)',
          }}
        >
          <span style={{ fontSize: 16 }}>{'\u{1F198}'}</span>
          <span style={{ color: '#34D399', fontSize: 11, fontWeight: 600 }}>
            Le bouton SOS reste toujours accessible
          </span>
        </div>

        {/* CTA */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onVerify}
          style={{
            width: '100%',
            padding: 13,
            borderRadius: 9999,
            border: 'none',
            backgroundColor: '#EF4444',
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {'\u{1FAAA}'} V\u00e9rifier mon identit\u00e9 — 2 min
        </motion.button>
      </div>
    </motion.div>
  );
}
