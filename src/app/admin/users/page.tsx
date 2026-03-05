'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdminTheme } from '@/components/admin/AdminThemeContext';

type UserRow = {
  id: string;
  display_name: string | null;
  city: string | null;
  is_admin: boolean | null;
  verification_status: string | null;
  created_at: string;
};

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

const GRADIENTS = [
  'linear-gradient(135deg, #3BB4C1, #A78BFA)',
  'linear-gradient(135deg, #F5C341, #EF4444)',
  'linear-gradient(135deg, #34D399, #3BB4C1)',
  'linear-gradient(135deg, #A78BFA, #EF4444)',
  'linear-gradient(135deg, #FBBF24, #34D399)',
];

export default function UsersPage() {
  const { theme } = useAdminTheme();
  const [users, setUsers] = useState<UserRow[]>([]);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, display_name, city, is_admin, verification_status, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setUsers(data as UserRow[]);
      });
  }, []);

  const thStyle: React.CSSProperties = {
    background: theme.elevated,
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: theme.t3,
    padding: '10px 12px',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: 12,
    color: theme.t2,
    borderTop: `1px solid ${theme.border}`,
    whiteSpace: 'nowrap',
  };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.t1, margin: '0 0 20px' }}>Utilisateurs</h1>

      <div
        style={{
          background: theme.card,
          border: `1px solid ${theme.borderMd}`,
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: theme.panelShadow,
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Utilisateur</th>
                <th style={thStyle}>Ville</th>
                <th style={thStyle}>V&eacute;rification</th>
                <th style={thStyle}>Admin</th>
                <th style={thStyle}>Inscrit</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const initials = (u.display_name ?? 'U').slice(0, 2).toUpperCase();
                return (
                  <tr key={u.id}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: GRADIENTS[i % GRADIENTS.length],
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#fff',
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: theme.t1 }}>
                            {u.display_name ?? 'Sans nom'}
                          </div>
                          <div style={{ fontSize: 10, color: theme.t3, fontFamily: 'monospace' }}>
                            {u.id.slice(0, 8)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>{u.city ?? '\u2014'}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 100,
                          background:
                            u.verification_status === 'approved'
                              ? theme.successSoft
                              : u.verification_status === 'pending'
                                ? theme.warningSoft
                                : theme.elevated,
                          color:
                            u.verification_status === 'approved'
                              ? theme.success
                              : u.verification_status === 'pending'
                                ? theme.warning
                                : theme.t3,
                        }}
                      >
                        {u.verification_status ?? 'unverified'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {u.is_admin ? (
                        <span style={{ fontSize: 10, fontWeight: 700, color: theme.danger }}>Admin</span>
                      ) : (
                        <span style={{ color: theme.t3 }}>&mdash;</span>
                      )}
                    </td>
                    <td style={tdStyle}>{fmt(u.created_at)}</td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', padding: 24, color: theme.t3 }}>
                    Aucun utilisateur
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
