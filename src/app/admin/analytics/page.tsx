'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAdminTheme } from '@/components/admin/AdminThemeContext';
import StatCard from '@/components/admin/StatCard';
import PanelShell from '@/components/admin/PanelShell';

/* ─── Types ─── */

type CategoryCount = { category: string; count: number };
type DateRange = '7d' | '30d' | '90d' | 'all';

/* ─── Helpers ─── */

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const RANGE_DAYS: Record<DateRange, number | null> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: null,
};

/* ─── Main Page ─── */

export default function AnalyticsPage() {
  const { theme } = useAdminTheme();
  const [range, setRange] = useState<DateRange>('30d');
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPins, setTotalPins] = useState(0);
  const [newUsers, setNewUsers] = useState(0);
  const [newPins, setNewPins] = useState(0);
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [severities, setSeverities] = useState<CategoryCount[]>([]);

  useEffect(() => {
    const days = RANGE_DAYS[range];
    const since = days ? daysAgo(days) : null;

    // Total counts (always all-time)
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => setTotalUsers(count ?? 0));

    supabase
      .from('pins')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => setTotalPins(count ?? 0));

    // New users in range
    if (since) {
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since)
        .then(({ count }) => setNewUsers(count ?? 0));
    } else {
      setNewUsers(totalUsers);
    }

    // New pins in range
    const pinsQuery = supabase.from('pins').select('category, severity');
    const pinsQueryFiltered = since ? pinsQuery.gte('created_at', since) : pinsQuery;

    pinsQueryFiltered.then(({ data }) => {
      if (!data) {
        setNewPins(0);
        setCategories([]);
        setSeverities([]);
        return;
      }
      setNewPins(data.length);

      // Aggregate by category
      const catMap: Record<string, number> = {};
      const sevMap: Record<string, number> = {};
      for (const row of data) {
        const r = row as { category: string | null; severity: string | null };
        const cat = r.category ?? 'Autre';
        catMap[cat] = (catMap[cat] ?? 0) + 1;
        const sev = r.severity ?? 'unknown';
        sevMap[sev] = (sevMap[sev] ?? 0) + 1;
      }

      setCategories(
        Object.entries(catMap)
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count),
      );
      setSeverities(
        Object.entries(sevMap)
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count),
      );
    });
  }, [range, totalUsers]);

  const pinsPerUser = totalUsers > 0 ? (totalPins / totalUsers).toFixed(1) : '0';
  const maxCat = Math.max(...categories.map((c) => c.count), 1);
  const maxSev = Math.max(...severities.map((s) => s.count), 1);

  const RANGES: { key: DateRange; label: string }[] = [
    { key: '7d', label: '7 jours' },
    { key: '30d', label: '30 jours' },
    { key: '90d', label: '90 jours' },
    { key: 'all', label: 'Tout' },
  ];

  const sevColors: Record<string, string> = {
    high: theme.danger,
    medium: theme.warning,
    low: theme.success,
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.t1, margin: 0 }}>Analytics</h1>
        {/* Date range pills */}
        <div style={{ display: 'flex', gap: 6 }}>
          {RANGES.map((r) => (
            <motion.button
              key={r.key}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setRange(r.key)}
              style={{
                padding: '5px 12px',
                borderRadius: 100,
                border: range === r.key ? `1px solid ${theme.cyanBorder}` : `1px solid ${theme.borderMd}`,
                background: range === r.key ? theme.cyanSoft : 'transparent',
                color: range === r.key ? theme.cyan : theme.t2,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {r.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="Utilisateurs" icon="👥" value={totalUsers} valueColor={theme.purple} sub="total" />
        <StatCard label="Nouveaux users" icon="📈" value={newUsers} valueColor={theme.cyan} sub={range} />
        <StatCard label="Pins créés" icon="📍" value={newPins} valueColor={theme.gold} sub={range} />
        <StatCard label="Pins / User" icon="📊" value={pinsPerUser} valueColor={theme.success} sub="ratio global" />
      </div>

      {/* Charts grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Category breakdown */}
        <PanelShell title="Pins par catégorie" dotColor={theme.cyan}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {categories.map((cat) => (
              <div key={cat.category} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 110, fontSize: 12, color: theme.t2, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {cat.category}
                </span>
                <div style={{ flex: 1, height: 18, background: theme.elevated, borderRadius: 6, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(cat.count / maxCat) * 100}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    style={{
                      height: '100%',
                      background: `linear-gradient(90deg, #3BB4C1, #A78BFA)`,
                      borderRadius: 6,
                    }}
                  />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: theme.t1, width: 36, textAlign: 'right' }}>
                  {cat.count}
                </span>
              </div>
            ))}
            {categories.length === 0 && (
              <div style={{ textAlign: 'center', padding: 24, color: theme.t3, fontSize: 12 }}>
                Aucune donnée
              </div>
            )}
          </div>
        </PanelShell>

        {/* Severity breakdown */}
        <PanelShell title="Répartition par sévérité" dotColor={theme.warning}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {severities.map((sev) => (
              <div key={sev.category} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 80, fontSize: 12, color: theme.t2, textTransform: 'capitalize' }}>
                  {sev.category}
                </span>
                <div style={{ flex: 1, height: 18, background: theme.elevated, borderRadius: 6, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(sev.count / maxSev) * 100}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    style={{
                      height: '100%',
                      background: sevColors[sev.category] ?? theme.t3,
                      borderRadius: 6,
                      opacity: 0.8,
                    }}
                  />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: theme.t1, width: 36, textAlign: 'right' }}>
                  {sev.count}
                </span>
              </div>
            ))}
            {severities.length === 0 && (
              <div style={{ textAlign: 'center', padding: 24, color: theme.t3, fontSize: 12 }}>
                Aucune donnée
              </div>
            )}
          </div>
        </PanelShell>
      </div>
    </div>
  );
}
