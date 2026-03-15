import { memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface ReportCrosshairProps {
  reportPlaceMode: boolean;
  isDark: boolean;
}

function ReportCrosshairRaw({ reportPlaceMode, isDark }: ReportCrosshairProps) {
  const stroke = isDark ? '#fff' : '#1E293B';
  const dot = isDark ? '#3BB4C1' : '#1E3A5F';

  return (
    <AnimatePresence>
      {reportPlaceMode && (
        <motion.div
          key="report-crosshair"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            top: 'calc((100vh - 174px) / 2)',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 50,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {/* Crosshair icon */}
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="8" stroke={stroke} strokeWidth="2" fill="none" opacity="0.7" />
            <line x1="24" y1="4" x2="24" y2="16" stroke={stroke} strokeWidth="1.5" opacity="0.5" />
            <line x1="24" y1="32" x2="24" y2="44" stroke={stroke} strokeWidth="1.5" opacity="0.5" />
            <line x1="4" y1="24" x2="16" y2="24" stroke={stroke} strokeWidth="1.5" opacity="0.5" />
            <line x1="32" y1="24" x2="44" y2="24" stroke={stroke} strokeWidth="1.5" opacity="0.5" />
            <circle cx="24" cy="24" r="2.5" fill={dot} />
          </svg>
          <span style={{
            fontSize: 10, fontWeight: 600,
            color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(15,23,42,0.6)',
            background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.8)',
            padding: '2px 8px', borderRadius: 6,
            backdropFilter: 'blur(8px)',
          }}>
            Déplace la carte
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const ReportCrosshair = memo(ReportCrosshairRaw);
