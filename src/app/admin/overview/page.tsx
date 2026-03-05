'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdminTheme } from '@/components/admin/AdminThemeContext';
import StatCard from '@/components/admin/StatCard';
import PanelShell from '@/components/admin/PanelShell';
import PinTable from '@/components/admin/PinTable';
import ActivityFeed from '@/components/admin/ActivityFeed';
import SystemStatus from '@/components/admin/SystemStatus';
import MapMock from '@/components/admin/MapMock';
import BarChart from '@/components/admin/BarChart';

export default function OverviewPage() {
  const { theme } = useAdminTheme();
  const [stats, setStats] = useState({
    totalPins: 0,
    activePins: 0,
    activeSOS: 0,
    totalUsers: 0,
    pendingReports: 0,
    liveSessions: 0,
  });

  useEffect(() => {
    async function load() {
      const [pins, active, sos, users, reports, live] = await Promise.all([
        supabase.from('pins').select('id', { count: 'exact', head: true }),
        supabase.from('pins').select('id', { count: 'exact', head: true }).is('resolved_at', null),
        supabase.from('pins').select('id', { count: 'exact', head: true }).eq('is_emergency', true).is('resolved_at', null),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('user_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('trips').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      ]);
      setStats({
        totalPins:      pins.count     ?? 0,
        activePins:     active.count   ?? 0,
        activeSOS:      sos.count      ?? 0,
        totalUsers:     users.count    ?? 0,
        pendingReports: reports.count  ?? 0,
        liveSessions:   live.count     ?? 0,
      });
    }
    load();
  }, []);

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.t1, margin: 0 }}>Tower Control</h1>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: theme.success,
              display: 'inline-block',
            }}
          />
        </div>
        <p style={{ fontSize: 12, color: theme.t3, margin: '4px 0 0' }}>
          Vue d&apos;ensemble en temps r&eacute;el
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Pins" icon={'\uD83D\uDCCD'} value={stats.totalPins} valueColor={theme.cyan} sub="all time" />
        <StatCard label="Pins actifs" icon={'\uD83D\uDFE2'} value={stats.activePins} valueColor={theme.success} sub="non r\u00e9solus" />
        <StatCard label="SOS actifs" icon={'\uD83C\uDD98'} value={stats.activeSOS} valueColor={theme.danger} />
        <StatCard label="Utilisateurs" icon={'\uD83D\uDC65'} value={stats.totalUsers} valueColor={theme.purple} />
        <StatCard label="Reports" icon={'\uD83D\uDEA9'} value={stats.pendingReports} valueColor={theme.warning} sub="pending" />
        <StatCard label="Live Sessions" icon={'\uD83D\uDD34'} value={stats.liveSessions} valueColor={theme.gold} />
      </div>

      {/* Main grid: table + activity + status */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <PanelShell title="Pins r\u00e9cents" dotColor={theme.cyan}>
          <PinTable limit={5} />
        </PanelShell>
        <ActivityFeed />
        <SystemStatus />
      </div>

      {/* Bottom grid: map + chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <MapMock />
        <BarChart />
      </div>
    </div>
  );
}
