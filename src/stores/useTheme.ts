// src/stores/useTheme.ts

import { create } from 'zustand';

type ThemeStore = {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
};

function readTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  let v = localStorage.getItem('breveil_theme');
  if (v === null) {
    const legacy = localStorage.getItem('brume-theme');
    if (legacy !== null) {
      localStorage.setItem('breveil_theme', legacy);
      localStorage.removeItem('brume-theme');
      v = legacy;
    }
  }
  return v === 'light' ? 'light' : 'dark';
}

export const useTheme = create<ThemeStore>((set) => ({
  theme: readTheme(),
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem('breveil_theme', next);
      }
      return { theme: next };
    }),
}));
