// src/stores/useTheme.ts

import { create } from 'zustand';

type ThemeStore = {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
};

export const useTheme = create<ThemeStore>((set) => ({
  theme: (typeof window !== 'undefined' && localStorage.getItem('kova-theme') === 'dark') ? 'dark' : 'light',
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem('kova-theme', next);
      }
      return { theme: next };
    }),
}));