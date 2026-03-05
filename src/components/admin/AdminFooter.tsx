'use client';

import { useAdminTheme } from './AdminThemeContext';

export default function AdminFooter() {
  const { theme } = useAdminTheme();

  return (
    <footer
      style={{
        padding: '18px 28px',
        borderTop: `1px solid ${theme.borderMd}`,
        background: theme.card,
        boxShadow: theme.shadow,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span style={{ fontSize: 11, color: theme.t3 }}>
        Breveil v1.0 &middot; Tower Control &middot; &copy; 2026 DBEK &mdash; Paris
      </span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: theme.success,
          background: theme.successSoft,
          border: `1px solid ${theme.successSoft}`,
          borderRadius: 100,
          padding: '4px 10px',
        }}
      >
        &bull; Tous services op&eacute;rationnels
      </span>
    </footer>
  );
}
