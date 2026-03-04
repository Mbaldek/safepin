'use client';

import { useTheme } from '@/stores/useTheme';

function getColors(isDark: boolean) {
  return isDark ? {
    textTertiary: '#64748B',
    border: 'rgba(255,255,255,0.08)',
  } : {
    textTertiary: '#94A3B8',
    border: 'rgba(15,23,42,0.06)',
  };
}

const FIXED = {
  accentCyan: '#3BB4C1',
  accentCyanSoft: 'rgba(59,180,193,0.12)',
};

interface TabItem {
  id: string;
  icon: React.ReactNode;
  label: string;
}

interface TabBarProps {
  items: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
}

export function TabBar({ items, activeTab, onChange }: TabBarProps) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        right: 16,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '12px 16px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        background: isDark ? 'rgba(30,41,59,0.85)' : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${C.border}`,
        borderRadius: 32,
        zIndex: 300,
      }}
    >
      {items.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '8px 16px',
              borderRadius: 16,
              transition: 'all 150ms',
              border: 'none',
              cursor: 'pointer',
              background: isActive ? FIXED.accentCyanSoft : 'transparent',
              color: isActive ? FIXED.accentCyan : C.textTertiary,
            }}
          >
            {item.icon}
            <span style={{ fontSize: 11, fontWeight: 500 }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
