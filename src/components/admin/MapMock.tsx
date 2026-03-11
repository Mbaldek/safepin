'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdminTheme } from './AdminThemeContext';
import PanelShell from './PanelShell';

type PinDot = {
  top: string;
  left: string;
  color: 'danger' | 'warning' | 'success';
  size: number;
};

export default function MapMock() {
  const { theme, isDark } = useAdminTheme();
  const [dots, setDots] = useState<PinDot[]>([]);
  const [totalActive, setTotalActive] = useState(0);

  useEffect(() => {
    async function load() {
      const { data, count } = await supabase
        .from('pins')
        .select('id, severity, latitude, longitude', { count: 'exact' })
        .is('resolved_at', null)
        .is('hidden_at', null)
        .order('created_at', { ascending: false })
        .limit(20);

      setTotalActive(count ?? 0);

      if (!data || data.length === 0) {
        setDots([]);
        return;
      }

      // Get lat/lng bounds for relative positioning
      const lats = data.filter((p) => p.latitude != null).map((p) => p.latitude as number);
      const lngs = data.filter((p) => p.longitude != null).map((p) => p.longitude as number);

      if (lats.length === 0) {
        // No coordinates — distribute randomly
        setDots(
          data.map((p) => ({
            top: `${15 + Math.random() * 70}%`,
            left: `${10 + Math.random() * 80}%`,
            color: p.severity === 'high' ? 'danger' : p.severity === 'medium' ? 'warning' : 'success',
            size: p.severity === 'high' ? 14 : p.severity === 'medium' ? 10 : 10,
          })),
        );
        return;
      }

      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      const latRange = maxLat - minLat || 0.01;
      const lngRange = maxLng - minLng || 0.01;

      setDots(
        data.map((p) => {
          const lat = p.latitude as number | null;
          const lng = p.longitude as number | null;
          const top = lat != null ? `${10 + ((maxLat - lat) / latRange) * 80}%` : `${15 + Math.random() * 70}%`;
          const left = lng != null ? `${5 + ((lng - minLng) / lngRange) * 90}%` : `${10 + Math.random() * 80}%`;
          return {
            top,
            left,
            color: (p.severity === 'high' ? 'danger' : p.severity === 'medium' ? 'warning' : 'success') as PinDot['color'],
            size: p.severity === 'high' ? 14 : 10,
          };
        }),
      );
    }

    load();
  }, []);

  const bg = isDark
    ? 'linear-gradient(135deg, #0D1B2A, #0A1520)'
    : 'linear-gradient(135deg, #E8F4F6, #D4EEF2)';

  const lineColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
  const routeColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';

  const softKey = (c: 'danger' | 'warning' | 'success') =>
    `${c}Soft` as 'dangerSoft' | 'warningSoft' | 'successSoft';

  return (
    <PanelShell title="Carte des pins" dotColor={theme.cyan}>
      <div
        style={{
          position: 'relative',
          height: 200,
          borderRadius: 10,
          overflow: 'hidden',
          background: bg,
          backgroundImage: `
            linear-gradient(${lineColor} 1px, transparent 1px),
            linear-gradient(90deg, ${lineColor} 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      >
        {/* Routes */}
        <div style={{ position: 'absolute', top: '45%', left: 0, right: 0, height: 2, background: routeColor }} />
        <div style={{ position: 'absolute', top: '70%', left: 0, right: 0, height: 2, background: routeColor }} />
        <div style={{ position: 'absolute', left: '35%', top: 0, bottom: 0, width: 2, background: routeColor }} />
        <div style={{ position: 'absolute', left: '65%', top: 0, bottom: 0, width: 2, background: routeColor }} />

        {/* Pins from DB */}
        {dots.map((pin, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: pin.top,
              left: pin.left,
              width: pin.size,
              height: pin.size,
              borderRadius: '50%',
              background: theme[pin.color],
              boxShadow: `0 0 0 5px ${theme[softKey(pin.color)]}`,
            }}
          />
        ))}

        {/* No data */}
        {dots.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.t3, fontSize: 12 }}>
            Aucun pin actif
          </div>
        )}

        {/* Legend */}
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            background: isDark ? 'rgba(8,14,26,0.85)' : 'rgba(255,255,255,0.92)',
            borderRadius: 8,
            padding: '6px 10px',
            display: 'flex',
            gap: 10,
            fontSize: 9,
            color: theme.t2,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.danger, display: 'inline-block' }} />
            Urgence
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.warning, display: 'inline-block' }} />
            Incident
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.success, display: 'inline-block' }} />
            Faible
          </span>
        </div>

        {/* Active count */}
        {totalActive > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: isDark ? 'rgba(8,14,26,0.85)' : 'rgba(255,255,255,0.92)',
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: 10,
              fontWeight: 600,
              color: theme.cyan,
            }}
          >
            {totalActive} actif{totalActive > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </PanelShell>
  );
}
