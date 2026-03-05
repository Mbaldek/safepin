'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdminTheme } from '@/components/admin/AdminThemeContext';
import StatCard from '@/components/admin/StatCard';
import PanelShell from '@/components/admin/PanelShell';

type CategoryCount = { category: string; count: number };

export default function AnalyticsPage() {
  const { theme } = useAdminTheme();
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPins, setTotalPins] = useState(0);
  const [categories, setCategories] = useState<CategoryCount[]>([]);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => setTotalUsers(count ?? 0));

    supabase
      .from('pins')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => setTotalPins(count ?? 0));

    // Aggregate pins by category
    supabase
      .from('pins')
      .select('category')
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, number> = {};
        for (const row of data) {
          const cat = (row as { category: string | null }).category ?? 'Autre';
          map[cat] = (map[cat] ?? 0) + 1;
        }
        const sorted = Object.entries(map)
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count);
        setCategories(sorted);
      });
  }, []);

  const pinsPerUser = totalUsers > 0 ? (totalPins / totalUsers).toFixed(1) : '0';
  const maxCat = Math.max(...categories.map((c) => c.count), 1);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.t1, margin: '0 0 20px' }}>Analytics</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="Utilisateurs" icon={'\uD83D\uDC65'} value={totalUsers} valueColor={theme.purple} />
        <StatCard label="Total Pins" icon={'\uD83D\uDCCD'} value={totalPins} valueColor={theme.cyan} />
        <StatCard label="Pins / User" icon={'\uD83D\uDCC8'} value={pinsPerUser} valueColor={theme.gold} />
        {/* TODO: compute from real data */}
        <StatCard label="DAU" icon={'\uD83D\uDCCA'} value="\u2014" valueColor={theme.t3} sub="soon" />
        <StatCard label="D7 R\u00e9tention" icon={'\uD83D\uDD04'} value="\u2014" valueColor={theme.t3} sub="soon" />
        <StatCard label="Conv. Pro" icon={'\u2B50'} value="\u2014" valueColor={theme.t3} sub="soon" />
      </div>

      <PanelShell title="Pins par cat\u00e9gorie" dotColor={theme.cyan}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {categories.map((cat) => (
            <div key={cat.category} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 100, fontSize: 12, color: theme.t2, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {cat.category}
              </span>
              <div style={{ flex: 1, height: 16, background: theme.elevated, borderRadius: 4, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${(cat.count / maxCat) * 100}%`,
                    background: theme.cyan,
                    borderRadius: 4,
                    opacity: 0.7,
                  }}
                />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: theme.t1, width: 30, textAlign: 'right' }}>
                {cat.count}
              </span>
            </div>
          ))}
          {categories.length === 0 && (
            <div style={{ textAlign: 'center', padding: 24, color: theme.t3, fontSize: 12 }}>
              Aucune donn&eacute;e
            </div>
          )}
        </div>
      </PanelShell>
    </div>
  );
}
