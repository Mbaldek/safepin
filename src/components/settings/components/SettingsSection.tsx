'use client';

import { useIsDark } from '@/hooks/useIsDark';

export interface SettingsSectionProps {
  label: string;
  children: React.ReactNode;
}

export default function SettingsSection({ label, children }: SettingsSectionProps) {
  const isDark = useIsDark();

  return (
    <div>
      {/* Section header */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: isDark ? '#64748B' : '#94A3B8',
          padding: '20px 20px 8px',
        }}
      >
        {label}
      </div>

      {/* Section content */}
      <div
        style={{
          borderRadius: 16,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.07)'}`,
          overflow: 'hidden',
          margin: '0 16px',
          background: isDark ? '#1E293B' : '#FFFFFF',
        }}
      >
        {children}
      </div>
    </div>
  );
}
