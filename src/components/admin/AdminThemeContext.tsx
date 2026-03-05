'use client';

import { createContext, useContext, useState } from 'react';
import { adminDark, adminLight, type AdminTheme } from './adminTheme';

type Ctx = {
  theme: AdminTheme;
  isDark: boolean;
  toggle: () => void;
};

const AdminThemeCtx = createContext<Ctx>({
  theme: adminDark,
  isDark: true,
  toggle: () => {},
});

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const toggle = () => setIsDark((v) => !v);
  return (
    <AdminThemeCtx.Provider value={{ theme: isDark ? adminDark : adminLight, isDark, toggle }}>
      {children}
    </AdminThemeCtx.Provider>
  );
}

export const useAdminTheme = () => useContext(AdminThemeCtx);
