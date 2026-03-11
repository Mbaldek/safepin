'use client';

import { motion } from 'framer-motion';
import { useTheme } from '@/stores/useTheme';

interface VerificationNudgeSheetProps {
  daysLeft: number;
  isNonSkippable: boolean;
  onVerify: () => void;
  onSkip: () => void;
}

export default function VerificationNudgeSheet({
  daysLeft,
  isNonSkippable,
  onVerify,
  onSkip,
}: VerificationNudgeSheetProps) {
  const isDark = useTheme((s) => s.theme) === 'dark';

  const surfaceCard = isDark ? '#1E293B' : '#FFFFFF';
  const surfaceEl = isDark ? '#253347' : '#EEF2F7';
  const borderDefault = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.10)';
  const textTertiary = isDark ? '#64748B' : '#94A3B8';

  const urgent = daysLeft <= 1;
  const accentColor = urgent ? '#EF4444' : '#FBBF24';
  const ctaBg = urgent ? '#EF4444' : '#3BB4C1';
  const progressPct = Math.round(((7 - daysLeft) / 7) * 100);

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 800,
        backgroundColor: surfaceCard,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderTop: `1px solid ${borderDefault}`,
        padding: '14px 16px 24px',
      }}
    >
      {/* Handle */}
      <div
        style={{
          width: 32,
          height: 3,
          borderRadius: 9999,
          backgroundColor: borderDefault,
          margin: '0 auto 14px',
        }}
      />

      {/* Row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 24, flexShrink: 0 }}>
          {urgent ? '\u23F3' : '\u{1F44B}'}
        </span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: accentColor }}>
            {urgent ? 'Dernier jour !' : 'V\u00e9rifiez votre identit\u00e9'}
          </div>
          <div
            style={{
              fontSize: 11,
              color: textTertiary,
              lineHeight: 1.4,
              marginTop: 2,
            }}
          >
            {urgent
              ? "Demain, l\u2019acc\u00e8s au trajet, cercle et messagerie sera limit\u00e9."
              : `Plus que ${daysLeft} jour${daysLeft > 1 ? 's' : ''} pour obtenir votre badge de confiance.`}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          backgroundColor: surfaceEl,
          height: 4,
          borderRadius: 9999,
          marginBottom: 10,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progressPct}%`,
            height: '100%',
            backgroundColor: accentColor,
            borderRadius: 9999,
            transition: 'width 0.6s',
          }}
        />
      </div>

      {/* Day labels */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 10,
          marginTop: -6,
        }}
      >
        <span style={{ fontSize: 9, color: textTertiary }}>
          Jour {7 - daysLeft}/7
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, color: accentColor }}>
          J-{daysLeft}
        </span>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onVerify}
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 9999,
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            color: '#FFFFFF',
            backgroundColor: ctaBg,
            cursor: 'pointer',
          }}
        >
          {'\u{1FAAA}'} V\u00e9rifier — 2 min
        </button>
        {!isNonSkippable && (
          <button
            onClick={onSkip}
            style={{
              padding: '10px 14px',
              borderRadius: 9999,
              border: `1px solid ${borderDefault}`,
              backgroundColor: 'transparent',
              color: textTertiary,
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Plus tard
          </button>
        )}
      </div>
    </motion.div>
  );
}
