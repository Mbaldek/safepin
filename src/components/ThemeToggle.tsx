// src/components/ThemeToggle.tsx

'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/stores/useTheme';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="w-8 h-8 flex items-center justify-center rounded-xl transition hover:opacity-70"
      style={{ backgroundColor: 'var(--bg-card)' }}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark'
        ? <Sun size={16} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
        : <Moon size={16} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
      }
    </button>
  );
}
