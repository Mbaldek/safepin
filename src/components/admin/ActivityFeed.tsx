'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdminTheme } from './AdminThemeContext';
import { timeAgo } from '@/lib/utils';
import PanelShell from './PanelShell';

type FeedEvent = {
  icon: string;
  label: string;
  time: string;
  bg: 'cyanSoft' | 'successSoft' | 'purpleSoft' | 'goldSoft' | 'warningSoft' | 'dangerSoft';
};

export default function ActivityFeed() {
  const { theme } = useAdminTheme();
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const feed: (FeedEvent & { ts: number })[] = [];

      // Recent pins (last 50)
      const { data: pins } = await supabase
        .from('pins')
        .select('id, category, arrondissement, is_emergency, created_at')
        .order('created_at', { ascending: false })
        .limit(15);

      if (pins) {
        for (const p of pins) {
          const loc = p.arrondissement ? ` · ${p.arrondissement}` : '';
          feed.push({
            icon: p.is_emergency ? '🆘' : '📍',
            label: `${p.is_emergency ? 'SOS' : 'Nouveau pin'} ${p.category ?? ''}${loc}`,
            time: timeAgo(p.created_at),
            bg: p.is_emergency ? 'dangerSoft' : 'cyanSoft',
            ts: new Date(p.created_at).getTime(),
          });
        }
      }

      // Recent users
      const { data: users } = await supabase
        .from('profiles')
        .select('display_name, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (users) {
        for (const u of users) {
          feed.push({
            icon: '👤',
            label: `Nouveau compte ${u.display_name ?? ''}`.trim(),
            time: timeAgo(u.created_at),
            bg: 'purpleSoft',
            ts: new Date(u.created_at).getTime(),
          });
        }
      }

      // Recent reports
      const { data: reports } = await supabase
        .from('user_reports')
        .select('reason, target_type, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (reports) {
        for (const r of reports) {
          feed.push({
            icon: '🚩',
            label: `Report ${r.target_type ?? ''} · ${r.reason ?? 'non spécifié'}`,
            time: timeAgo(r.created_at),
            bg: 'warningSoft',
            ts: new Date(r.created_at).getTime(),
          });
        }
      }

      // Recently resolved pins
      const { data: resolved } = await supabase
        .from('pins')
        .select('id, category, resolved_at')
        .not('resolved_at', 'is', null)
        .order('resolved_at', { ascending: false })
        .limit(5);

      if (resolved) {
        for (const r of resolved) {
          feed.push({
            icon: '✓',
            label: `Pin ${r.category ?? ''} résolu`,
            time: timeAgo(r.resolved_at!),
            bg: 'successSoft',
            ts: new Date(r.resolved_at!).getTime(),
          });
        }
      }

      // Sort by timestamp descending, take top 12
      feed.sort((a, b) => b.ts - a.ts);
      setEvents(feed.slice(0, 12));
      setLoading(false);
    }

    load();
    const interval = setInterval(load, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <PanelShell title="Activité récente" dotColor={theme.success}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading && events.length === 0 && (
          <div style={{ textAlign: 'center', padding: 24, color: theme.t3, fontSize: 12 }}>
            Chargement...
          </div>
        )}
        {!loading && events.length === 0 && (
          <div style={{ textAlign: 'center', padding: 24, color: theme.t3, fontSize: 12 }}>
            Aucune activité récente
          </div>
        )}
        {events.map((ev, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: theme[ev.bg],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              {ev.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: theme.t1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {ev.label}
              </div>
            </div>
            <span style={{ fontSize: 10, color: theme.t3, whiteSpace: 'nowrap' }}>{ev.time}</span>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}
