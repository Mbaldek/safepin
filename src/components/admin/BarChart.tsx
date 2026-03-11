'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdminTheme } from './AdminThemeContext';
import PanelShell from './PanelShell';

export default function BarChart() {
  const { theme } = useAdminTheme();
  const [hourly, setHourly] = useState<number[]>(new Array(24).fill(0));
  const [topCategory, setTopCategory] = useState<string | null>(null);
  const [peakRange, setPeakRange] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data } = await supabase
        .from('pins')
        .select('category, created_at')
        .gte('created_at', since);

      if (!data || data.length === 0) {
        setHourly(new Array(24).fill(0));
        setTopCategory(null);
        setPeakRange(null);
        return;
      }

      // Bucket by hour
      const buckets = new Array(24).fill(0);
      const catCount: Record<string, number> = {};
      const now = new Date();

      for (const pin of data) {
        const created = new Date(pin.created_at);
        // Hours ago from now, mapped to 0-23 (0 = 24h ago, 23 = current hour)
        const hoursAgo = Math.floor((now.getTime() - created.getTime()) / 3600000);
        const idx = 23 - Math.min(hoursAgo, 23);
        buckets[idx]++;

        const cat = pin.category ?? 'Autre';
        catCount[cat] = (catCount[cat] ?? 0) + 1;
      }

      setHourly(buckets);

      // Find top category
      const sorted = Object.entries(catCount).sort((a, b) => b[1] - a[1]);
      setTopCategory(sorted[0]?.[0] ?? null);

      // Find peak 3-hour range
      let maxSum = 0;
      let maxStart = 0;
      for (let i = 0; i <= 21; i++) {
        const sum = buckets[i] + buckets[i + 1] + buckets[i + 2];
        if (sum > maxSum) {
          maxSum = sum;
          maxStart = i;
        }
      }
      if (maxSum > 0) {
        const startHour = (now.getHours() - 23 + maxStart + 24) % 24;
        const endHour = (startHour + 3) % 24;
        setPeakRange(`${startHour}h–${endHour}h`);
      } else {
        setPeakRange(null);
      }
    }

    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  const max = Math.max(...hourly, 1);
  const total = hourly.reduce((a, b) => a + b, 0);

  function barColor(v: number) {
    if (v > 5) return theme.danger;
    if (v > 3) return theme.warning;
    return theme.cyan;
  }

  return (
    <PanelShell title="Pins par heure (24h)" dotColor={theme.cyan}>
      <div style={{ display: 'flex', alignItems: 'flex-end', height: 80, gap: 2 }}>
        {hourly.map((v, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${(v / max) * 100}%`,
              minHeight: v > 0 ? 3 : 0,
              background: barColor(v),
              borderRadius: '3px 3px 0 0',
              opacity: 0.7,
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {['−24h', '−18h', '−12h', '−6h', 'maint.'].map((lbl) => (
          <span key={lbl} style={{ fontSize: 9, color: theme.t3 }}>{lbl}</span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <div
          style={{
            flex: 1,
            background: theme.elevated,
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 11,
            color: theme.t2,
          }}
        >
          <span style={{ fontWeight: 600, color: theme.t1 }}>Pic</span>{' '}
          {peakRange ?? '—'}
        </div>
        <div
          style={{
            flex: 1,
            background: theme.elevated,
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 11,
            color: theme.t2,
          }}
        >
          <span style={{ fontWeight: 600, color: theme.t1 }}>Total:</span>{' '}
          {total} pin{total !== 1 ? 's' : ''}
        </div>
        {topCategory && (
          <div
            style={{
              flex: 1,
              background: theme.elevated,
              borderRadius: 8,
              padding: '8px 10px',
              fontSize: 11,
              color: theme.t2,
            }}
          >
            <span style={{ fontWeight: 600, color: theme.t1 }}>Top:</span>{' '}
            {topCategory}
          </div>
        )}
      </div>
    </PanelShell>
  );
}
