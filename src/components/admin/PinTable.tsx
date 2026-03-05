'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdminTheme } from './AdminThemeContext';

type PinRow = {
  id: string;
  category: string | null;
  arrondissement: string | null;
  severity: string | null;
  confirmations: number | null;
  status: string | null;
  created_at: string;
};

interface PinTableProps {
  limit?: number;
}

function shortId(id: string) {
  return id.slice(0, 8);
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PinTable({ limit = 10 }: PinTableProps) {
  const { theme } = useAdminTheme();
  const [pins, setPins] = useState<PinRow[]>([]);

  useEffect(() => {
    supabase
      .from('pins')
      .select('id, category, arrondissement, severity, confirmations, status, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        if (data) setPins(data as PinRow[]);
      });
  }, [limit]);

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

  function severityBadge(sev: string | null) {
    const colors: Record<string, { bg: string; color: string }> = {
      high:   { bg: theme.dangerSoft,  color: theme.danger },
      medium: { bg: theme.warningSoft, color: theme.warning },
      low:    { bg: theme.successSoft, color: theme.success },
    };
    const c = colors[sev ?? ''] ?? { bg: theme.elevated, color: theme.t3 };
    return (
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: 100,
          background: c.bg,
          color: c.color,
        }}
      >
        {sev ?? 'N/A'}
      </span>
    );
  }

  function statusBadge(status: string | null) {
    const isActive = status === 'active';
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: isActive ? theme.success : theme.t3 }}>
        {isActive && (
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.success, display: 'inline-block' }} />
        )}
        {status ?? 'unknown'}
      </span>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>ID</th>
            <th style={thStyle}>Cat&eacute;gorie</th>
            <th style={thStyle}>Arrondissement</th>
            <th style={thStyle}>S&eacute;v&eacute;rit&eacute;</th>
            <th style={thStyle}>Confirmations</th>
            <th style={thStyle}>Statut</th>
            <th style={thStyle}>Cr&eacute;&eacute;</th>
          </tr>
        </thead>
        <tbody>
          {pins.map((pin) => (
            <tr key={pin.id}>
              <td style={{ ...tdStyle, fontFamily: 'monospace', color: theme.cyan }}>{shortId(pin.id)}</td>
              <td style={tdStyle}>{pin.category ?? '\u2014'}</td>
              <td style={tdStyle}>{pin.arrondissement ?? '\u2014'}</td>
              <td style={tdStyle}>{severityBadge(pin.severity)}</td>
              <td style={tdStyle}>{pin.confirmations ?? 0}</td>
              <td style={tdStyle}>{statusBadge(pin.status)}</td>
              <td style={tdStyle}>{fmt(pin.created_at)}</td>
            </tr>
          ))}
          {pins.length === 0 && (
            <tr>
              <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: theme.t3, padding: 24 }}>
                Aucun pin
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
