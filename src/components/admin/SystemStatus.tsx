'use client';

import { useAdminTheme } from './AdminThemeContext';
import PanelShell from './PanelShell';

const SERVICES = [
  { name: 'Supabase DB',  status: 'Op\u00e9rationnel', color: 'success' as const },
  { name: 'Mapbox API',   status: 'Op\u00e9rationnel', color: 'success' as const },
  { name: 'LiveKit',      status: 'Op\u00e9rationnel', color: 'success' as const },
  { name: 'Push Notifs',  status: 'Op\u00e9rationnel', color: 'success' as const },
  { name: 'Julia IA',     status: 'B\u00eata',         color: 'warning' as const },
];

export default function SystemStatus() {
  const { theme } = useAdminTheme();

  return (
    <PanelShell title="Statut syst\u00e8me" dotColor={theme.success}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {SERVICES.map((svc) => (
          <div key={svc.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: theme.t2 }}>{svc.name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: theme[svc.color],
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: 11, color: theme[svc.color], fontWeight: 600 }}>
                {svc.status}
              </span>
            </div>
          </div>
        ))}
        <div
          style={{
            marginTop: 8,
            background: theme.successSoft,
            border: `1px solid ${theme.successSoft}`,
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 11,
            fontWeight: 600,
            color: theme.success,
            textAlign: 'center',
          }}
        >
          Tous les services op&eacute;rationnels &check;
        </div>
      </div>
    </PanelShell>
  );
}
