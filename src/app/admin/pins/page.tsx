'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdminTheme } from '@/components/admin/AdminThemeContext';

type PinRow = {
  id: string;
  category: string | null;
  arrondissement: string | null;
  severity: string | null;
  confirmations: number | null;
  status: string | null;
  created_at: string;
};

const PAGE_SIZE = 20;

function shortId(id: string) { return id.slice(0, 8); }

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function PinsPage() {
  const { theme } = useAdminTheme();
  const [pins, setPins] = useState<PinRow[]>([]);
  const [filters, setFilters] = useState({ category: '', status: 'active', severity: '' });
  const [page, setPage] = useState(0);

  useEffect(() => {
    let q = supabase
      .from('pins')
      .select('id, category, arrondissement, severity, confirmations, status, created_at')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (filters.status) q = q.eq('status', filters.status);
    if (filters.severity) q = q.eq('severity', filters.severity);
    if (filters.category) q = q.ilike('category', `%${filters.category}%`);
    q.then(({ data }) => setPins((data as PinRow[]) ?? []));
  }, [filters, page]);

  const selectStyle: React.CSSProperties = {
    padding: '6px 12px',
    borderRadius: 8,
    border: `1px solid ${theme.borderMd}`,
    background: theme.elevated,
    color: theme.t1,
    fontSize: 12,
  };

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.t1, margin: 0 }}>Pins</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={filters.status}
            onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(0); }}
            style={selectStyle}
          >
            <option value="">Tous statuts</option>
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
          </select>
          <select
            value={filters.severity}
            onChange={(e) => { setFilters({ ...filters, severity: e.target.value }); setPage(0); }}
            style={selectStyle}
          >
            <option value="">Toutes s&eacute;v&eacute;rit&eacute;s</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <input
            placeholder="Cat\u00e9gorie..."
            value={filters.category}
            onChange={(e) => { setFilters({ ...filters, category: e.target.value }); setPage(0); }}
            style={{ ...selectStyle, width: 140 }}
          />
        </div>
      </div>

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
                  <td style={tdStyle}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 100,
                        background: pin.severity === 'high' ? theme.dangerSoft : pin.severity === 'medium' ? theme.warningSoft : theme.successSoft,
                        color: pin.severity === 'high' ? theme.danger : pin.severity === 'medium' ? theme.warning : theme.success,
                      }}
                    >
                      {pin.severity ?? 'N/A'}
                    </span>
                  </td>
                  <td style={tdStyle}>{pin.confirmations ?? 0}</td>
                  <td style={tdStyle}>{pin.status ?? '\u2014'}</td>
                  <td style={tdStyle}>{fmt(pin.created_at)}</td>
                </tr>
              ))}
              {pins.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', padding: 24, color: theme.t3 }}>
                    Aucun pin trouv&eacute;
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
        <button
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          style={{
            padding: '6px 14px',
            borderRadius: 8,
            border: `1px solid ${theme.borderMd}`,
            background: theme.card,
            color: theme.t2,
            fontSize: 12,
            cursor: page === 0 ? 'default' : 'pointer',
            opacity: page === 0 ? 0.4 : 1,
          }}
        >
          &larr; Pr&eacute;c&eacute;dent
        </button>
        <span style={{ fontSize: 12, color: theme.t3, display: 'flex', alignItems: 'center' }}>
          Page {page + 1}
        </span>
        <button
          disabled={pins.length < PAGE_SIZE}
          onClick={() => setPage((p) => p + 1)}
          style={{
            padding: '6px 14px',
            borderRadius: 8,
            border: `1px solid ${theme.borderMd}`,
            background: theme.card,
            color: theme.t2,
            fontSize: 12,
            cursor: pins.length < PAGE_SIZE ? 'default' : 'pointer',
            opacity: pins.length < PAGE_SIZE ? 0.4 : 1,
          }}
        >
          Suivant &rarr;
        </button>
      </div>
    </div>
  );
}
