'use client';

import { useAdminTheme } from './AdminThemeContext';
import PanelShell from './PanelShell';

const PINS = [
  { top: '38%', left: '44%', color: 'danger' as const, size: 14 },
  { top: '52%', left: '28%', color: 'warning' as const, size: 10 },
  { top: '30%', left: '62%', color: 'warning' as const, size: 10 },
  { top: '65%', left: '55%', color: 'success' as const, size: 12 },
  { top: '45%', left: '70%', color: 'danger' as const, size: 12 },
];

const softKey = (c: 'danger' | 'warning' | 'success') =>
  `${c}Soft` as 'dangerSoft' | 'warningSoft' | 'successSoft';

export default function MapMock() {
  const { theme, isDark } = useAdminTheme();

  const bg = isDark
    ? 'linear-gradient(135deg, #0D1B2A, #0A1520)'
    : 'linear-gradient(135deg, #E8F4F6, #D4EEF2)';

  const lineColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
  const routeColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';

  return (
    <PanelShell title="Carte des pins" dotColor={theme.cyan}>
      <div
        style={{
          position: 'relative',
          height: 200,
          borderRadius: 10,
          overflow: 'hidden',
          background: bg,
          backgroundImage: `
            linear-gradient(${lineColor} 1px, transparent 1px),
            linear-gradient(90deg, ${lineColor} 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      >
        {/* Routes */}
        <div style={{ position: 'absolute', top: '45%', left: 0, right: 0, height: 2, background: routeColor }} />
        <div style={{ position: 'absolute', top: '70%', left: 0, right: 0, height: 2, background: routeColor }} />
        <div style={{ position: 'absolute', left: '35%', top: 0, bottom: 0, width: 2, background: routeColor }} />
        <div style={{ position: 'absolute', left: '65%', top: 0, bottom: 0, width: 2, background: routeColor }} />

        {/* Pins */}
        {PINS.map((pin, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: pin.top,
              left: pin.left,
              width: pin.size,
              height: pin.size,
              borderRadius: '50%',
              background: theme[pin.color],
              boxShadow: `0 0 0 5px ${theme[softKey(pin.color)]}`,
            }}
          />
        ))}

        {/* Legend */}
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            background: isDark ? 'rgba(8,14,26,0.85)' : 'rgba(255,255,255,0.92)',
            borderRadius: 8,
            padding: '6px 10px',
            display: 'flex',
            gap: 10,
            fontSize: 9,
            color: theme.t2,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.danger, display: 'inline-block' }} />
            Urgence
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.warning, display: 'inline-block' }} />
            Incident
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.success, display: 'inline-block' }} />
            R&eacute;solu
          </span>
        </div>
      </div>
    </PanelShell>
  );
}
