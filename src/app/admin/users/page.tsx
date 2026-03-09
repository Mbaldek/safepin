'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdminTheme } from '@/components/admin/AdminThemeContext';

type UserRow = {
  id: string;
  display_name: string | null;
  city: string | null;
  is_admin: boolean | null;
  verified: boolean | null;
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
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, display_name, city, is_admin, verified, verification_status, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setUsers(data as UserRow[]);
      });
  }, []);

  async function toggleVerified(userId: string, current: boolean) {
    setUpdating(userId + '-verified');
    const { error } = await supabase.from('profiles').update({
      verified: !current,
      verification_status: !current ? 'approved' : 'declined',
    }).eq('id', userId);
    if (!error) {
      setUsers((prev) => prev.map((u) =>
        u.id === userId
          ? { ...u, verified: !current, verification_status: !current ? 'approved' : 'declined' }
          : u
      ));
    }
    setUpdating(null);
  }

  async function toggleAdmin(userId: string, current: boolean) {
    setUpdating(userId + '-admin');
    const { error } = await supabase.from('profiles').update({ is_admin: !current }).eq('id', userId);
    if (!error) {
      setUsers((prev) => prev.map((u) =>
        u.id === userId ? { ...u, is_admin: !current } : u
      ));
    }
    setUpdating(null);
  }

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
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const initials = (u.display_name ?? 'U').slice(0, 2).toUpperCase();
                const isVerified = u.verified === true;
                const isAdmin = u.is_admin === true;
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
                      {isAdmin ? (
                        <span style={{ fontSize: 10, fontWeight: 700, color: theme.danger }}>Admin</span>
                      ) : (
                        <span style={{ color: theme.t3 }}>&mdash;</span>
                      )}
                    </td>
                    <td style={tdStyle}>{fmt(u.created_at)}</td>
                    <td style={{ ...tdStyle, verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {/* Toggle verified */}
                        <button
                          disabled={updating === u.id + '-verified'}
                          onClick={() => toggleVerified(u.id, isVerified)}
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: '3px 10px',
                            borderRadius: 100,
                            border: 'none',
                            cursor: 'pointer',
                            opacity: updating === u.id + '-verified' ? 0.5 : 1,
                            background: isVerified ? 'rgba(239,68,68,0.12)' : 'rgba(59,180,193,0.12)',
                            color: isVerified ? theme.danger : theme.cyan,
                            transition: 'opacity 0.15s',
                          }}
                        >
                          {isVerified ? '✗ Retirer' : '✓ Vérifier'}
                        </button>
                        {/* Toggle admin */}
                        <button
                          disabled={updating === u.id + '-admin'}
                          onClick={() => toggleAdmin(u.id, isAdmin)}
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: '3px 10px',
                            borderRadius: 100,
                            border: 'none',
                            cursor: 'pointer',
                            opacity: updating === u.id + '-admin' ? 0.5 : 1,
                            background: isAdmin ? 'rgba(239,68,68,0.08)' : 'rgba(245,195,65,0.10)',
                            color: isAdmin ? theme.danger : theme.warning,
                            transition: 'opacity 0.15s',
                          }}
                        >
                          {isAdmin ? '⬇ Admin' : '⬆ Admin'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', padding: 24, color: theme.t3 }}>
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
