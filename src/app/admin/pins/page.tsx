'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAdminTheme } from '@/components/admin/AdminThemeContext';
import DataTable, { type Column, type RowAction } from '@/components/admin/DataTable';

/* ─── Types ─── */

type PinRow = {
  id: string;
  user_id: string;
  category: string | null;
  arrondissement: string | null;
  severity: string | null;
  confirmations: number | null;
  flag_count: number;
  is_emergency: boolean | null;
  resolved_at: string | null;
  hidden_at: string | null;
  created_at: string;
};

/* ─── Helpers ─── */

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function Badge({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: bg, color, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

/* ─── Main Page ─── */

export default function PinsPage() {
  const { theme } = useAdminTheme();
  const [pins, setPins] = useState<PinRow[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved' | 'hidden' | 'flagged'>('active');
  const [acting, setActing] = useState<string | null>(null);

  const loadPins = useCallback(() => {
    let q = supabase
      .from('pins')
      .select('id, user_id, category, arrondissement, severity, confirmations, flag_count, is_emergency, resolved_at, hidden_at, created_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (filter === 'active') q = q.is('resolved_at', null).is('hidden_at', null);
    else if (filter === 'resolved') q = q.not('resolved_at', 'is', null);
    else if (filter === 'hidden') q = q.not('hidden_at', 'is', null);
    else if (filter === 'flagged') q = q.gte('flag_count', 1);

    q.then(({ data }) => setPins((data as PinRow[]) ?? []));
  }, [filter]);

  useEffect(() => { loadPins(); }, [loadPins]);

  /* ─── Actions ─── */

  async function resolvePin(pin: PinRow) {
    setActing(pin.id + '-resolve');
    await supabase.from('pins').update({ resolved_at: new Date().toISOString() }).eq('id', pin.id);
    setActing(null);
    loadPins();
  }

  async function hidePin(pin: PinRow) {
    setActing(pin.id + '-hide');
    const next = pin.hidden_at ? null : new Date().toISOString();
    await supabase.from('pins').update({ hidden_at: next }).eq('id', pin.id);
    setActing(null);
    loadPins();
  }

  async function deletePin(pin: PinRow) {
    if (!confirm(`Supprimer définitivement le pin ${pin.id.slice(0, 8)} ?`)) return;
    setActing(pin.id + '-delete');
    await supabase.from('pins').delete().eq('id', pin.id);
    setActing(null);
    loadPins();
  }

  /* ─── Filter pills ─── */

  const FILTERS: { key: typeof filter; label: string; count?: number }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'active', label: 'Actifs' },
    { key: 'resolved', label: 'Résolus' },
    { key: 'hidden', label: 'Masqués' },
    { key: 'flagged', label: 'Signalés' },
  ];

  /* ─── Columns ─── */

  const columns: Column<PinRow>[] = [
    {
      key: 'id',
      header: 'ID',
      render: (p) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: theme.cyan }}>
          {p.id.slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Catégorie',
      sortValue: (p) => p.category ?? '',
      render: (p) => {
        const isEmergency = p.is_emergency === true;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{p.category ?? '—'}</span>
            {isEmergency && <Badge label="SOS" bg={theme.dangerSoft} color={theme.danger} />}
          </div>
        );
      },
    },
    {
      key: 'arrondissement',
      header: 'Lieu',
      sortValue: (p) => p.arrondissement ?? '',
      render: (p) => <span>{p.arrondissement ?? '—'}</span>,
    },
    {
      key: 'severity',
      header: 'Sévérité',
      sortValue: (p) => p.severity === 'high' ? 3 : p.severity === 'medium' ? 2 : 1,
      render: (p) => {
        const sev = p.severity ?? 'low';
        const map: Record<string, { bg: string; color: string }> = {
          high: { bg: theme.dangerSoft, color: theme.danger },
          medium: { bg: theme.warningSoft, color: theme.warning },
          low: { bg: theme.successSoft, color: theme.success },
        };
        const s = map[sev] ?? map.low;
        return <Badge label={sev} bg={s.bg} color={s.color} />;
      },
    },
    {
      key: 'confirmations',
      header: 'Conf.',
      sortValue: (p) => p.confirmations ?? 0,
      render: (p) => <span>{p.confirmations ?? 0}</span>,
    },
    {
      key: 'flags',
      header: 'Flags',
      sortValue: (p) => p.flag_count,
      render: (p) => {
        if (p.flag_count === 0) return <span style={{ color: theme.t3 }}>0</span>;
        return (
          <Badge
            label={String(p.flag_count)}
            bg={p.flag_count >= 3 ? theme.dangerSoft : theme.warningSoft}
            color={p.flag_count >= 3 ? theme.danger : theme.warning}
          />
        );
      },
    },
    {
      key: 'status',
      header: 'Statut',
      render: (p) => {
        if (p.hidden_at) return <Badge label="masqué" bg="rgba(167,139,250,0.12)" color="var(--accent-purple)" />;
        if (p.resolved_at) return <Badge label="résolu" bg={theme.successSoft} color={theme.success} />;
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: theme.success }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.success, display: 'inline-block' }} />
            actif
          </span>
        );
      },
    },
    {
      key: 'created_at',
      header: 'Créé',
      sortValue: (p) => new Date(p.created_at).getTime(),
      render: (p) => <span>{fmt(p.created_at)}</span>,
    },
  ];

  const fixedActions: RowAction<PinRow>[] = [
    {
      label: 'Résoudre',
      color: 'var(--semantic-success)',
      onClick: resolvePin,
      loading: (p) => acting === p.id + '-resolve',
      disabled: (p) => !!p.resolved_at,
    },
    {
      label: 'Masquer',
      color: 'var(--accent-purple)',
      onClick: hidePin,
      loading: (p) => acting === p.id + '-hide',
    },
    {
      label: 'Suppr.',
      color: 'var(--semantic-danger)',
      onClick: deletePin,
      loading: (p) => acting === p.id + '-delete',
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.t1, margin: 0 }}>Pins</h1>
        <span style={{ fontSize: 12, color: theme.t3 }}>{pins.length} pins</span>
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
        data={pins}
        columns={columns}
        actions={fixedActions}
        pageSize={25}
        searchPlaceholder="Rechercher par catégorie, lieu, ID..."
        searchFilter={(p, q) =>
          (p.category ?? '').toLowerCase().includes(q) ||
          (p.arrondissement ?? '').toLowerCase().includes(q) ||
          p.id.startsWith(q)
        }
        emptyMessage="Aucun pin trouvé"
      />
    </div>
  );
}
