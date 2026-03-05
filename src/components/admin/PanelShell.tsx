'use client';

import { useAdminTheme } from './AdminThemeContext';

interface PanelShellProps {
  title: string;
  dotColor?: string;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
}

export default function PanelShell({ title, dotColor, action, children }: PanelShellProps) {
  const { theme } = useAdminTheme();

  return (
    <div
      style={{
        background: theme.card,
        border: `1px solid ${theme.borderMd}`,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: theme.panelShadow,
      }}
    >
      {/* Header */}
      <div
        style={{
          background: theme.elevated,
          borderBottom: `1px solid ${theme.border}`,
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {dotColor && (
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: dotColor,
                display: 'inline-block',
              }}
            />
          )}
          <span style={{ fontSize: 13, fontWeight: 600, color: theme.t1 }}>{title}</span>
        </div>
        {action && (
          <button
            onClick={action.onClick}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: theme.cyan,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {action.label}
          </button>
        )}
      </div>
      {/* Body */}
      <div style={{ padding: '16px 20px' }}>{children}</div>
    </div>
  );
}
