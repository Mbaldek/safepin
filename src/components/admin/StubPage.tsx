'use client';

import { useAdminTheme } from './AdminThemeContext';

interface StubPageProps {
  icon: string;
  title: string;
  description: string;
}

export default function StubPage({ icon, title, description }: StubPageProps) {
  const { theme } = useAdminTheme();

  return (
    <div style={{ padding: 48, textAlign: 'center', color: theme.t3 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: theme.t2 }}>{title}</div>
      <div style={{ fontSize: 12 }}>{description}</div>
    </div>
  );
}
