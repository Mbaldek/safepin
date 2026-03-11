'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAdminTheme } from '@/components/admin/AdminThemeContext';
import { timeAgo } from '@/lib/utils';
import DataTable, { type Column, type RowAction } from '@/components/admin/DataTable';

/* ─── Types ─── */

type ReportRow = {
  id: string;
  reporter_id: string;
  reporter_name: string | null;
  target_type: 'pin' | 'user' | 'message' | 'story';
  target_id: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
};

/* ─── Helpers ─── */

function Badge({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: bg, color, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  false_report: 'Faux signalement',
  offensive: 'Offensant',
  duplicate: 'Doublon',
};

const TARGET_LABELS: Record<string, { label: string; icon: string }> = {
  pin: { label: 'Pin', icon: '📍' },
  user: { label: 'Utilisateur', icon: '👤' },
  message: { label: 'Message', icon: '💬' },
  story: { label: 'Story', icon: '📸' },
};

/* ─── Main Page ─── */

export default function ReportsPage() {
  const { theme } = useAdminTheme();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved'>('pending');
  const [acting, setActing] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    let q = supabase
      .from('user_reports')
      .select('id, reporter_id, target_type, target_id, reason, status, created_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (filter !== 'all') q = q.eq('status', filter);

    const { data } = await q;
    if (!data || data.length === 0) {
      setReports([]);
      return;
    }

    // Enrich with reporter names
    const reporterIds = [...new Set(data.map((r) => r.reporter_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', reporterIds);

    const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

    setReports(
      data.map((r) => ({
        ...r,
        reporter_name: nameMap.get(r.reporter_id) ?? null,
      })) as ReportRow[],
    );
  }, [filter]);

  useEffect(() => { loadReports(); }, [loadReports]);

  /* ─── Actions ─── */

  async function setStatus(report: ReportRow, status: 'reviewed' | 'resolved') {
    setActing(report.id + '-' + status);
    await supabase.from('user_reports').update({ status }).eq('id', report.id);
    setActing(null);
    loadReports();
  }

  /* ─── Filter pills ─── */

  const FILTERS: { key: typeof filter; label: string }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'pending', label: 'En attente' },
    { key: 'reviewed', label: 'Examinés' },
    { key: 'resolved', label: 'Résolus' },
  ];

  /* ─── Columns ─── */

  const columns: Column<ReportRow>[] = [
    {
      key: 'target',
      header: 'Cible',
      render: (r) => {
        const t = TARGET_LABELS[r.target_type] ?? { label: r.target_type, icon: '?' };
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>{t.icon}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: theme.t1 }}>{t.label}</div>
              <div style={{ fontSize: 10, color: theme.t3, fontFamily: 'var(--font-mono)' }}>
                {r.target_id.slice(0, 8)}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'reason',
      header: 'Raison',
      sortValue: (r) => r.reason,
      render: (r) => {
        const reasonMap: Record<string, { bg: string; color: string }> = {
          spam: { bg: theme.warningSoft, color: theme.warning },
          offensive: { bg: theme.dangerSoft, color: theme.danger },
          false_report: { bg: 'rgba(167,139,250,0.12)', color: 'var(--accent-purple)' },
          duplicate: { bg: theme.elevated, color: theme.t3 },
        };
        const s = reasonMap[r.reason] ?? { bg: theme.elevated, color: theme.t3 };
        return <Badge label={REASON_LABELS[r.reason] ?? r.reason} bg={s.bg} color={s.color} />;
      },
    },
    {
      key: 'reporter',
      header: 'Signalé par',
      sortValue: (r) => (r.reporter_name ?? '').toLowerCase(),
      render: (r) => (
        <div>
          <div style={{ fontSize: 12, color: theme.t1 }}>{r.reporter_name ?? 'Anonyme'}</div>
          <div style={{ fontSize: 10, color: theme.t3, fontFamily: 'var(--font-mono)' }}>
            {r.reporter_id.slice(0, 8)}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      sortValue: (r) => r.status,
      render: (r) => {
        const map: Record<string, { bg: string; color: string; label: string }> = {
          pending: { bg: theme.warningSoft, color: theme.warning, label: 'En attente' },
          reviewed: { bg: 'rgba(59,180,193,0.12)', color: 'var(--gradient-start)', label: 'Examiné' },
          resolved: { bg: theme.successSoft, color: theme.success, label: 'Résolu' },
        };
        const s = map[r.status] ?? map.pending;
        return <Badge label={s.label} bg={s.bg} color={s.color} />;
      },
    },
    {
      key: 'created_at',
      header: 'Date',
      sortValue: (r) => new Date(r.created_at).getTime(),
      render: (r) => <span style={{ fontSize: 12 }}>{timeAgo(r.created_at)}</span>,
    },
  ];

  const actions: RowAction<ReportRow>[] = [
    {
      label: 'Examiner',
      color: 'var(--gradient-start)',
      onClick: (r) => setStatus(r, 'reviewed'),
      loading: (r) => acting === r.id + '-reviewed',
      disabled: (r) => r.status !== 'pending',
    },
    {
      label: 'Résoudre',
      color: 'var(--semantic-success)',
      onClick: (r) => setStatus(r, 'resolved'),
      loading: (r) => acting === r.id + '-resolved',
      disabled: (r) => r.status === 'resolved',
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.t1, margin: 0 }}>Reports</h1>
        <span style={{ fontSize: 12, color: theme.t3 }}>{reports.length} signalements</span>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {FILTERS.map((f) => (
          <motion.button
            key={f.key}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '6px 14px',
              borderRadius: 100,
              border: filter === f.key ? `1px solid ${theme.cyanBorder}` : `1px solid ${theme.borderMd}`,
              background: filter === f.key ? theme.cyanSoft : 'transparent',
              color: filter === f.key ? theme.cyan : theme.t2,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {f.label}
          </motion.button>
        ))}
      </div>

      <DataTable
        data={reports}
        columns={columns}
        actions={actions}
        pageSize={25}
        searchPlaceholder="Rechercher par raison, reporter, cible..."
        searchFilter={(r, q) =>
          (r.reporter_name ?? '').toLowerCase().includes(q) ||
          r.reason.includes(q) ||
          r.target_type.includes(q) ||
          r.target_id.startsWith(q)
        }
        emptyMessage="Aucun signalement"
      />
    </div>
  );
}
