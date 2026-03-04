// src/components/ThemeToggle.tsx

'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/stores/useTheme';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      style={{
        width: 32,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        border: 'none',
        cursor: 'pointer',
        transition: 'opacity 150ms',
        background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.08)',
      }}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark
        ? <Sun size={16} strokeWidth={2} style={{ color: 'rgba(255,255,255,0.8)' }} />
        : <Moon size={16} strokeWidth={2} style={{ color: '#475569' }} />
      }
    </button>
  );
}
