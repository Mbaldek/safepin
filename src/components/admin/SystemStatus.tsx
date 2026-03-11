'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdminTheme } from './AdminThemeContext';
import PanelShell from './PanelShell';

type ServiceStatus = {
  name: string;
  status: string;
  color: 'success' | 'warning' | 'danger';
  latency?: number;
};

export default function SystemStatus() {
  const { theme } = useAdminTheme();
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    async function check() {
      const results: ServiceStatus[] = [];

      // Check Supabase DB — measure round-trip latency
      try {
        const start = performance.now();
        const { error } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true });
        const latency = Math.round(performance.now() - start);

        if (error) {
          results.push({ name: 'Supabase DB', status: 'Erreur', color: 'danger', latency });
        } else if (latency > 2000) {
          results.push({ name: 'Supabase DB', status: 'Lent', color: 'warning', latency });
        } else {
          results.push({ name: 'Supabase DB', status: 'Opérationnel', color: 'success', latency });
        }
      } catch {
        results.push({ name: 'Supabase DB', status: 'Hors ligne', color: 'danger' });
      }

      // Check Supabase Auth
      try {
        const start = performance.now();
        const { error } = await supabase.auth.getSession();
        const latency = Math.round(performance.now() - start);

        if (error) {
          results.push({ name: 'Supabase Auth', status: 'Erreur', color: 'danger', latency });
        } else {
          results.push({ name: 'Supabase Auth', status: 'Opérationnel', color: 'success', latency });
        }
      } catch {
        results.push({ name: 'Supabase Auth', status: 'Hors ligne', color: 'danger' });
      }

      // Check Supabase Realtime — channel subscription test
      try {
        const channel = supabase.channel('health-check');
        const status = channel.subscribe();
        results.push({
          name: 'Realtime',
          status: status ? 'Opérationnel' : 'Dégradé',
          color: status ? 'success' : 'warning',
        });
        supabase.removeChannel(channel);
      } catch {
        results.push({ name: 'Realtime', status: 'Hors ligne', color: 'danger' });
      }

      // Check Supabase Storage
      try {
        const start = performance.now();
        const { error } = await supabase.storage.listBuckets();
        const latency = Math.round(performance.now() - start);

        if (error) {
          results.push({ name: 'Storage', status: 'Erreur', color: 'danger', latency });
        } else {
          results.push({ name: 'Storage', status: 'Opérationnel', color: 'success', latency });
        }
      } catch {
        results.push({ name: 'Storage', status: 'Hors ligne', color: 'danger' });
      }

      // Mapbox — check env var presence (can't ping from client due to CORS)
      const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      results.push({
        name: 'Mapbox',
        status: mapboxToken ? 'Configuré' : 'Non configuré',
        color: mapboxToken ? 'success' : 'danger',
      });

      setServices(results);
      setChecked(true);
    }

    check();
    const interval = setInterval(check, 60000); // re-check every 60s
    return () => clearInterval(interval);
  }, []);

  const allOk = services.length > 0 && services.every((s) => s.color === 'success');
  const hasIssue = services.some((s) => s.color === 'danger');

  return (
    <PanelShell title="Statut système" dotColor={allOk ? theme.success : hasIssue ? theme.danger : theme.warning}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!checked && (
          <div style={{ textAlign: 'center', padding: 24, color: theme.t3, fontSize: 12 }}>
            Vérification...
          </div>
        )}
        {services.map((svc) => (
          <div key={svc.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: theme.t2 }}>{svc.name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {svc.latency !== undefined && (
                <span style={{ fontSize: 9, color: theme.t3 }}>{svc.latency}ms</span>
              )}
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
        {checked && (
          <div
            style={{
              marginTop: 8,
              background: allOk ? theme.successSoft : hasIssue ? theme.dangerSoft : theme.warningSoft,
              border: `1px solid ${allOk ? theme.successSoft : hasIssue ? theme.dangerSoft : theme.warningSoft}`,
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 11,
              fontWeight: 600,
              color: allOk ? theme.success : hasIssue ? theme.danger : theme.warning,
              textAlign: 'center',
            }}
          >
            {allOk
              ? 'Tous les services opérationnels ✓'
              : hasIssue
                ? 'Un ou plusieurs services en erreur'
                : 'Services partiellement dégradés'}
          </div>
        )}
      </div>
    </PanelShell>
  );
}
