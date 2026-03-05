'use client';

import { useAdminTheme } from './AdminThemeContext';

interface StatCardProps {
  label: string;
  icon: string;
  value: string | number;
  valueColor?: string;
  sub?: string;
  trend?: string;
  trendUp?: boolean;
}

export default function StatCard({ label, icon, value, valueColor, sub, trend, trendUp }: StatCardProps) {
  const { theme } = useAdminTheme();

  return (
    <div
      style={{
        background: theme.card,
        border: `1px solid ${theme.borderMd}`,
        borderRadius: 14,
        padding: '16px 18px',
        boxShadow: theme.panelShadow,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: theme.t2 }}>{label}</span>
        <span style={{ fontSize: 16 }}>{icon}</span>
      </div>
      <div
        style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 36,
          fontWeight: 400,
          color: valueColor ?? theme.cyan,
          lineHeight: 1,
          marginBottom: 4,
        }}
      >
        {value}
      </div>
      {(sub || trend) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          {sub && <span style={{ fontSize: 10, color: theme.t3 }}>{sub}</span>}
          {trend && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: trendUp ? theme.success : theme.danger,
              }}
            >
              {trendUp ? '\u2191' : '\u2193'} {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
