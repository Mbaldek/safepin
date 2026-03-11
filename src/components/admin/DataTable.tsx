'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminTheme } from './AdminThemeContext';

/* ─────────────────────────────────────────────
   Generic DataTable — search, sort, paginate
   Aligned with Breveil design system
   ───────────────────────────────────────────── */

export type Column<T> = {
  key: string;
  header: string;
  /** Render cell content. Gets the full row. */
  render: (row: T) => React.ReactNode;
  /** Optional sort accessor — return string | number for comparison */
  sortValue?: (row: T) => string | number;
  /** Width hint (CSS value) */
  width?: string;
};

export type RowAction<T> = {
  label: string;
  icon?: string;
  color?: string;
  onClick: (row: T) => void;
  disabled?: (row: T) => boolean;
  loading?: (row: T) => boolean;
};

interface DataTableProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  /** Search predicate — return true if row matches query */
  searchFilter?: (row: T, query: string) => boolean;
  /** Row actions (buttons rendered in last column) */
  actions?: RowAction<T>[];
  /** Rows per page (default 25) */
  pageSize?: number;
  /** Empty state message */
  emptyMessage?: string;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Called when a row is clicked */
  onRowClick?: (row: T) => void;
}

export default function DataTable<T extends { id: string }>({
  data,
  columns,
  searchFilter,
  actions,
  pageSize = 25,
  emptyMessage = 'Aucune donnée',
  searchPlaceholder = 'Rechercher...',
  onRowClick,
}: DataTableProps<T>) {
  const { theme } = useAdminTheme();
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);

  // Filter
  const filtered = useMemo(() => {
    if (!query.trim() || !searchFilter) return data;
    const q = query.toLowerCase();
    return data.filter((row) => searchFilter(row, q));
  }, [data, query, searchFilter]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return filtered;
    const accessor = col.sortValue;
    return [...filtered].sort((a, b) => {
      const va = accessor(a);
      const vb = accessor(b);
      if (typeof va === 'number' && typeof vb === 'number') return sortAsc ? va - vb : vb - va;
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      return sortAsc ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
  }, [filtered, sortKey, sortAsc, columns]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  function handleSort(key: string) {
    const col = columns.find((c) => c.key === key);
    if (!col?.sortValue) return;
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  // Reset page when search changes
  function handleSearch(v: string) {
    setQuery(v);
    setPage(0);
  }

  const thStyle: React.CSSProperties = {
    background: theme.elevated,
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: theme.t3,
    padding: '10px 14px',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  };

  const tdStyle: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: 12,
    color: theme.t2,
    borderTop: `1px solid ${theme.border}`,
    whiteSpace: 'nowrap',
  };

  return (
    <div>
      {/* Toolbar: search + count */}
      {searchFilter && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
            <input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                width: '100%',
                padding: '8px 14px 8px 36px',
                borderRadius: 10,
                border: `1px solid ${theme.borderMd}`,
                background: theme.card,
                color: theme.t1,
                fontSize: 13,
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3BB4C1';
                e.currentTarget.style.boxShadow = '0 0 12px rgba(59,180,193,0.2)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '';
                e.currentTarget.style.boxShadow = '';
              }}
            />
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: theme.t3 }}>
              🔍
            </span>
          </div>
          <span style={{ fontSize: 11, color: theme.t3 }}>
            {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Table */}
      <div
        style={{
          background: theme.card,
          border: `1px solid ${theme.border}`,
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: theme.panelShadow,
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    style={{
                      ...thStyle,
                      cursor: col.sortValue ? 'pointer' : 'default',
                      width: col.width,
                    }}
                    onClick={() => handleSort(col.key)}
                  >
                    {col.header}
                    {col.sortValue && sortKey === col.key && (
                      <span style={{ marginLeft: 4, fontSize: 9 }}>
                        {sortAsc ? '▲' : '▼'}
                      </span>
                    )}
                  </th>
                ))}
                {actions && actions.length > 0 && (
                  <th style={thStyle}>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {paged.map((row) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => onRowClick?.(row)}
                    style={{
                      cursor: onRowClick ? 'pointer' : 'default',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'var(--interactive-hover)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = '';
                    }}
                  >
                    {columns.map((col) => (
                      <td key={col.key} style={tdStyle}>
                        {col.render(row)}
                      </td>
                    ))}
                    {actions && actions.length > 0 && (
                      <td style={{ ...tdStyle, verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {actions.map((act) => (
                            <motion.button
                              key={act.label}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              disabled={act.disabled?.(row) || act.loading?.(row)}
                              onClick={(e) => { e.stopPropagation(); act.onClick(row); }}
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                padding: '3px 10px',
                                borderRadius: 100,
                                border: 'none',
                                cursor: act.disabled?.(row) ? 'default' : 'pointer',
                                opacity: act.loading?.(row) ? 0.5 : 1,
                                background: act.color
                                  ? `color-mix(in srgb, ${act.color} 12%, transparent)`
                                  : 'rgba(59,180,193,0.12)',
                                color: act.color ?? theme.cyan,
                                transition: 'opacity 0.15s',
                              }}
                            >
                              {act.icon && <span style={{ marginRight: 3 }}>{act.icon}</span>}
                              {act.label}
                            </motion.button>
                          ))}
                        </div>
                      </td>
                    )}
                  </motion.tr>
                ))}
              </AnimatePresence>
              {paged.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length + (actions ? 1 : 0)}
                    style={{ ...tdStyle, textAlign: 'center', padding: 32, color: theme.t3, fontSize: 13 }}
                  >
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            style={{
              padding: '6px 14px',
              borderRadius: 10,
              border: `1px solid ${theme.borderMd}`,
              background: theme.card,
              color: theme.t2,
              fontSize: 12,
              cursor: page === 0 ? 'default' : 'pointer',
              opacity: page === 0 ? 0.4 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            &larr; Précédent
          </motion.button>
          <span style={{ fontSize: 12, color: theme.t3 }}>
            {page + 1} / {totalPages}
          </span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            style={{
              padding: '6px 14px',
              borderRadius: 10,
              border: `1px solid ${theme.borderMd}`,
              background: theme.card,
              color: theme.t2,
              fontSize: 12,
              cursor: page >= totalPages - 1 ? 'default' : 'pointer',
              opacity: page >= totalPages - 1 ? 0.4 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            Suivant &rarr;
          </motion.button>
        </div>
      )}
    </div>
  );
}
