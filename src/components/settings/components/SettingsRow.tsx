'use client';

import { icons, ChevronRight } from 'lucide-react';
import { useTheme } from '@/stores/useTheme';

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
  const isDark = useTheme((s) => s.theme) === 'dark';
  const Icon = icons[icon as keyof typeof icons];

  return (
    <div
      role="button"
      tabIndex={onPress ? 0 : undefined}
      onClick={onPress}
      onKeyDown={onPress ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPress(); } } : undefined}
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
      onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)'; }}
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
              color: danger ? '#EF4444' : isDark ? '#FFFFFF' : '#0F172A',
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
          <span style={{ fontSize: 12, color: isDark ? '#64748B' : '#94A3B8', display: 'block', marginTop: 2 }}>
            {subtitle}
          </span>
        )}
      </div>

      {/* Right element or chevron */}
      {rightEl ?? (
        onPress && <ChevronRight size={18} color={isDark ? '#64748B' : '#94A3B8'} style={{ flexShrink: 0 }} />
      )}
    </div>
  );
}
