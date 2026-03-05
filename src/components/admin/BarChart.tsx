'use client';

import { useAdminTheme } from './AdminThemeContext';
import PanelShell from './PanelShell';

const DEFAULT_DATA = [1, 0, 0, 0, 0, 1, 2, 3, 2, 1, 2, 3, 4, 3, 2, 3, 4, 5, 7, 8, 6, 4, 3, 2];

interface BarChartProps {
  data?: number[];
}

export default function BarChart({ data = DEFAULT_DATA }: BarChartProps) {
  const { theme } = useAdminTheme();
  const max = Math.max(...data, 1);

  function barColor(v: number) {
    if (v > 5) return theme.danger;
    if (v > 3) return theme.warning;
    return theme.cyan;
  }

  return (
    <PanelShell title="Pins par heure (24h)" dotColor={theme.cyan}>
      <div style={{ display: 'flex', alignItems: 'flex-end', height: 80, gap: 2 }}>
        {data.map((v, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${(v / max) * 100}%`,
              minHeight: v > 0 ? 3 : 0,
              background: barColor(v),
              borderRadius: '3px 3px 0 0',
              opacity: 0.7,
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {['00h', '06h', '12h', '18h', '23h'].map((lbl) => (
          <span key={lbl} style={{ fontSize: 9, color: theme.t3 }}>{lbl}</span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <div
          style={{
            flex: 1,
            background: theme.elevated,
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 11,
            color: theme.t2,
          }}
        >
          <span style={{ fontWeight: 600, color: theme.t1 }}>Pic</span> 19h&ndash;22h
        </div>
        <div
          style={{
            flex: 1,
            background: theme.elevated,
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 11,
            color: theme.t2,
          }}
        >
          <span style={{ fontWeight: 600, color: theme.t1 }}>Top:</span> Harcel.
        </div>
      </div>
    </PanelShell>
  );
}
