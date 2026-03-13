'use client';

import { motion } from 'framer-motion';
import { Shield, ChevronRight } from 'lucide-react';
import type { RouteOption } from '@/stores/useStore';
import { formatDuration, formatDistance } from '@/lib/directions';
import { useIsDark } from '@/hooks/useIsDark';
import type React from 'react';

const colors = {
  cyan: '#3BB4C1',
  success: '#34D399',
  textPrimary: { dark: '#FFFFFF', light: '#0F172A' } as Record<string, string>,
  textTertiary: { dark: '#64748B', light: '#94A3B8' } as Record<string, string>,
};

const getCardStyle = (isDark: boolean): React.CSSProperties => ({
  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
  borderRadius: 14,
  border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
});

interface RouteQuickCardProps {
  route: RouteOption;
  maxIncidents: number;
  onLaunch: () => void;
  onDismiss: () => void;
}

export default function RouteQuickCard({ route, maxIncidents, onLaunch, onDismiss }: RouteQuickCardProps) {
  const isDark = useIsDark();
  const theme = isDark ? 'dark' : 'light';
  const nearby = route.nearbyIncidents ?? 0;
  const incidentsAvoided = maxIncidents - nearby;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        bottom: 180,
        left: 16,
        right: 16,
        zIndex: 55,
        ...getCardStyle(isDark),
        padding: '12px 14px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
      }}
    >
      {/* Route info row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: route.color, flexShrink: 0 }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary[theme], flex: 1 }}>
          {route.label}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary[theme] }}>
          {formatDuration(route.duration)}
        </span>
        {route.distance > 0 && (
          <span style={{ fontSize: 11, color: colors.textTertiary[theme] }}>
            {formatDistance(route.distance)}
          </span>
        )}
      </div>

      {/* Incidents badge */}
      {(incidentsAvoided > 0 || nearby > 0) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Shield size={13} strokeWidth={2}
            color={incidentsAvoided > 0 ? colors.success : '#F59E0B'}
          />
          <span style={{
            fontSize: 12, fontWeight: 500,
            color: incidentsAvoided > 0 ? colors.success : '#F59E0B',
          }}>
            {incidentsAvoided > 0
              ? `Évite ${incidentsAvoided} incident${incidentsAvoided > 1 ? 's' : ''}`
              : `${nearby} incident${nearby > 1 ? 's' : ''} sur le trajet`
            }
          </span>
        </div>
      )}

      {/* Launch CTA */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onLaunch}
        style={{
          width: '100%',
          padding: '10px',
          borderRadius: 12,
          background: colors.cyan,
          border: 'none',
          fontSize: 14,
          fontWeight: 700,
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        Démarrer le trajet
        <ChevronRight size={16} />
      </motion.button>
    </motion.div>
  );
}
