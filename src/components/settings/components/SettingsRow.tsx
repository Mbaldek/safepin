'use client';

import { icons, ChevronRight } from 'lucide-react';

export interface SettingsRowProps {
  icon: string;
  iconColor?: string;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  rightEl?: React.ReactNode;
  danger?: boolean;
  badge?: string;
}

export default function SettingsRow({
  icon,
  iconColor = '#3BB4C1',
  label,
  subtitle,
  onPress,
  rightEl,
  danger,
  badge,
}: SettingsRowProps) {
  const Icon = icons[icon as keyof typeof icons];

  return (
    <button
      onClick={onPress}
      disabled={!onPress}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '14px 20px',
        background: 'transparent',
        border: 'none',
        cursor: onPress ? 'pointer' : 'default',
        textAlign: 'left',
        transition: 'background 150ms ease-out',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Icon */}
      {Icon && (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: iconColor + '20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={18} color={iconColor} />
        </div>
      )}

      {/* Label + subtitle */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: danger ? '#EF4444' : '#FFFFFF',
            }}
          >
            {label}
          </span>
          {badge && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 999,
                background: 'rgba(239,68,68,0.15)',
                color: '#EF4444',
              }}
            >
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <span style={{ fontSize: 12, color: '#64748B', display: 'block', marginTop: 2 }}>
            {subtitle}
          </span>
        )}
      </div>

      {/* Right element or chevron */}
      {rightEl ?? (
        onPress && <ChevronRight size={18} color="#64748B" style={{ flexShrink: 0 }} />
      )}
    </button>
  );
}
