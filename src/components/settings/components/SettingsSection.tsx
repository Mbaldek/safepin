'use client';

export interface SettingsSectionProps {
  label: string;
  children: React.ReactNode;
}

export default function SettingsSection({ label, children }: SettingsSectionProps) {
  return (
    <div>
      {/* Section header */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#64748B',
          padding: '20px 20px 8px',
        }}
      >
        {label}
      </div>

      {/* Section content */}
      <div
        style={{
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
          margin: '0 16px',
          background: '#1E293B',
        }}
      >
        {children}
      </div>
    </div>
  );
}
