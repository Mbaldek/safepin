'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAdminTheme } from '@/components/admin/AdminThemeContext';
import DataTable, { type Column, type RowAction } from '@/components/admin/DataTable';

/* ─── Types ─── */

type UserRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  city: string | null;
  is_admin: boolean | null;
  is_shadow_banned: boolean | null;
  blocked_reason: string | null;
  verified: boolean | null;
  verification_status: string | null;
  created_at: string;
  deleted_at: string | null;
};

type UserDetail = UserRow & {
  bio: string | null;
  phone: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean | null;
  pins_count: number;
  reports_count: number;
};

/* ─── Helpers ─── */

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

const GRADIENTS = [
  'linear-gradient(135deg, #3BB4C1, #A78BFA)',
  'linear-gradient(135deg, #F5C341, #EF4444)',
  'linear-gradient(135deg, #34D399, #3BB4C1)',
  'linear-gradient(135deg, #A78BFA, #EF4444)',
  'linear-gradient(135deg, #FBBF24, #34D399)',
];

function hashIndex(id: string) {
  let h = 0;
  for (let i = 0; i < 8; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % GRADIENTS.length;
}

/* ─── Badge component ─── */

function Badge({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 100,
        background: bg,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

/* ─── User Detail Drawer ─── */

function UserDrawer({
  user,
  onClose,
  onAction,
}: {
  user: UserDetail;
  onClose: () => void;
  onAction: () => void;
}) {
  const { theme } = useAdminTheme();
  const [blockReason, setBlockReason] = useState(user.blocked_reason ?? '');
  const [saving, setSaving] = useState('');

  async function toggleShadowBan() {
    setSaving('shadow');
    await supabase
      .from('profiles')
      .update({ is_shadow_banned: !user.is_shadow_banned })
      .eq('id', user.id);
    setSaving('');
    onAction();
  }

  async function saveBlock() {
    setSaving('block');
    const reason = blockReason.trim() || null;
    await supabase
      .from('profiles')
      .update({ blocked_reason: reason })
      .eq('id', user.id);
    setSaving('');
    onAction();
  }

  async function deleteAccount() {
    if (!confirm(`Supprimer définitivement le compte de ${user.display_name ?? user.id.slice(0, 8)} ? Cette action est irréversible.`)) return;
    setSaving('delete');
    const { error } = await supabase.rpc('admin_delete_account', { target_user_id: user.id });
    if (error) {
      alert(`Erreur: ${error.message}`);
    }
    setSaving('');
    onAction();
    onClose();
  }

  const isBlocked = !!user.blocked_reason;
  const isBanned = user.is_shadow_banned === true;
  const isDeleted = !!user.deleted_at;

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 200,
        }}
      />
      {/* Drawer */}
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 420,
          background: theme.bg,
          borderLeft: `1px solid ${theme.borderMd}`,
          zIndex: 201,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${theme.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: theme.card,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: GRADIENTS[hashIndex(user.id)],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {(user.display_name ?? 'U').slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: theme.t1 }}>
              {user.display_name ?? 'Sans nom'}
            </div>
            <div style={{ fontSize: 11, color: theme.t3, fontFamily: 'var(--font-mono)' }}>
              {user.id.slice(0, 12)}...
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: `1px solid ${theme.borderMd}`,
              background: 'transparent',
              color: theme.t2,
              fontSize: 16,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </motion.button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Email', value: user.email ?? '—' },
              { label: 'Ville', value: user.city ?? '—' },
              { label: 'Téléphone', value: user.phone ?? '—' },
              { label: 'Inscrit le', value: fmt(user.created_at) },
              { label: 'Pins créés', value: String(user.pins_count) },
              { label: 'Reports reçus', value: String(user.reports_count) },
            ].map((item) => (
              <div key={item.label} style={{ background: theme.card, borderRadius: 12, padding: '10px 14px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: theme.t3, marginBottom: 4 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: theme.t1 }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Status badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {user.is_admin && <Badge label="Admin" bg="rgba(239,68,68,0.12)" color="var(--semantic-danger)" />}
            {user.verification_status === 'approved' && <Badge label="Vérifié" bg="var(--semantic-success-soft)" color="var(--semantic-success)" />}
            {user.verification_status === 'pending' && <Badge label="En attente" bg="var(--semantic-warning-soft)" color="var(--semantic-warning)" />}
            {isBanned && <Badge label="Shadow ban" bg="rgba(167,139,250,0.12)" color="var(--accent-purple)" />}
            {isBlocked && <Badge label="Bloqué" bg="var(--semantic-danger-soft)" color="var(--semantic-danger)" />}
            {isDeleted && <Badge label="Supprimé" bg="var(--semantic-danger-soft)" color="var(--semantic-danger)" />}
            {user.onboarding_completed && <Badge label="Onboarding OK" bg="rgba(59,180,193,0.12)" color="var(--gradient-start)" />}
          </div>

          {user.bio && (
            <div style={{ background: theme.card, borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: theme.t3, marginBottom: 6 }}>Bio</div>
              <div style={{ fontSize: 13, color: theme.t2, lineHeight: 1.5 }}>{user.bio}</div>
            </div>
          )}

          {/* ─── Actions ─── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: theme.t3 }}>
              Actions de modération
            </div>

            {/* Shadow ban */}
            <div
              style={{
                background: theme.card,
                borderRadius: 12,
                padding: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: theme.t1 }}>Shadow ban</div>
                <div style={{ fontSize: 11, color: theme.t3, marginTop: 2 }}>
                  Contenu masqué des autres, sans notification
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleShadowBan}
                disabled={saving === 'shadow' || isDeleted}
                style={{
                  padding: '6px 14px',
                  borderRadius: 100,
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: isDeleted ? 'default' : 'pointer',
                  background: isBanned ? 'var(--semantic-danger-soft)' : 'rgba(167,139,250,0.12)',
                  color: isBanned ? 'var(--semantic-danger)' : 'var(--accent-purple)',
                  opacity: saving === 'shadow' ? 0.5 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {isBanned ? 'Lever le ban' : 'Shadow ban'}
              </motion.button>
            </div>

            {/* Block with reason */}
            <div style={{ background: theme.card, borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: theme.t1, marginBottom: 8 }}>
                Bloquer avec raison
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Raison du blocage..."
                  disabled={isDeleted}
                  style={{
                    flex: 1,
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: `1px solid ${theme.borderMd}`,
                    background: theme.elevated,
                    color: theme.t1,
                    fontSize: 12,
                    outline: 'none',
                  }}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={saveBlock}
                  disabled={saving === 'block' || isDeleted}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 100,
                    border: 'none',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: isDeleted ? 'default' : 'pointer',
                    background: isBlocked ? 'var(--semantic-success-soft)' : 'var(--semantic-warning-soft)',
                    color: isBlocked ? 'var(--semantic-success)' : 'var(--semantic-warning)',
                    opacity: saving === 'block' ? 0.5 : 1,
                    transition: 'opacity 0.15s',
                  }}
                >
                  {isBlocked ? (blockReason.trim() ? 'Mettre à jour' : 'Débloquer') : 'Bloquer'}
                </motion.button>
              </div>
              {isBlocked && (
                <div style={{ fontSize: 11, color: theme.danger, marginTop: 6 }}>
                  Raison actuelle : {user.blocked_reason}
                </div>
              )}
            </div>

            {/* Delete account */}
            {!isDeleted && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={deleteAccount}
                disabled={saving === 'delete'}
                style={{
                  padding: '10px 16px',
                  borderRadius: 12,
                  border: '1px solid var(--semantic-danger-border)',
                  background: 'var(--semantic-danger-soft)',
                  color: 'var(--semantic-danger)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: saving === 'delete' ? 0.5 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                Supprimer le compte définitivement
              </motion.button>
            )}
          </div>
        </div>
      </motion.aside>
    </>
  );
}

/* ─── Main Page ─── */

export default function UsersPage() {
  const { theme } = useAdminTheme();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);

  const loadUsers = useCallback(() => {
    supabase
      .from('profiles')
      .select('id, display_name, email, city, is_admin, is_shadow_banned, blocked_reason, verified, verification_status, created_at, deleted_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setUsers(data as UserRow[]);
      });
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  async function openDetail(user: UserRow) {
    const [profileRes, pinsRes, reportsRes] = await Promise.all([
      supabase.from('profiles')
        .select('bio, phone, avatar_url, onboarding_completed')
        .eq('id', user.id)
        .single(),
      supabase.from('pins')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabase.from('user_reports')
        .select('id', { count: 'exact', head: true })
        .eq('target_id', user.id)
        .eq('target_type', 'user'),
    ]);

    setSelectedUser({
      ...user,
      bio: profileRes.data?.bio ?? null,
      phone: profileRes.data?.phone ?? null,
      avatar_url: profileRes.data?.avatar_url ?? null,
      onboarding_completed: profileRes.data?.onboarding_completed ?? null,
      pins_count: pinsRes.count ?? 0,
      reports_count: reportsRes.count ?? 0,
    });
  }

  async function toggleVerified(user: UserRow) {
    setUpdating(user.id + '-verified');
    const next = !(user.verified === true);
    const { error } = await supabase.from('profiles').update({
      verified: next,
      verification_status: next ? 'approved' : 'declined',
    }).eq('id', user.id);
    if (!error) {
      setUsers((prev) => prev.map((u) =>
        u.id === user.id ? { ...u, verified: next, verification_status: next ? 'approved' : 'declined' } : u
      ));
    }
    setUpdating(null);
  }

  async function toggleAdmin(user: UserRow) {
    setUpdating(user.id + '-admin');
    const next = !(user.is_admin === true);
    const { error } = await supabase.from('profiles').update({ is_admin: next }).eq('id', user.id);
    if (!error) {
      setUsers((prev) => prev.map((u) =>
        u.id === user.id ? { ...u, is_admin: next } : u
      ));
    }
    setUpdating(null);
  }

  /* ─── DataTable columns ─── */

  const columns: Column<UserRow>[] = [
    {
      key: 'user',
      header: 'Utilisateur',
      sortValue: (r) => (r.display_name ?? '').toLowerCase(),
      render: (u) => {
        const initials = (u.display_name ?? 'U').slice(0, 2).toUpperCase();
        const isBanned = u.is_shadow_banned === true;
        const isBlocked = !!u.blocked_reason;
        const isDeleted = !!u.deleted_at;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: isDeleted ? theme.elevated : GRADIENTS[hashIndex(u.id)],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: isDeleted ? theme.t3 : '#fff',
                flexShrink: 0,
                opacity: isDeleted ? 0.5 : 1,
              }}
            >
              {initials}
            </div>
            <div>
              <div style={{
                fontSize: 12,
                fontWeight: 600,
                color: isDeleted ? theme.t3 : theme.t1,
                textDecoration: isDeleted ? 'line-through' : 'none',
              }}>
                {u.display_name ?? 'Sans nom'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, color: theme.t3, fontFamily: 'var(--font-mono)' }}>
                  {u.id.slice(0, 8)}
                </span>
                {isBanned && <span style={{ fontSize: 8, color: 'var(--accent-purple)' }} title="Shadow banned">👻</span>}
                {isBlocked && <span style={{ fontSize: 8, color: 'var(--semantic-danger)' }} title="Bloqué">🚫</span>}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'email',
      header: 'Email',
      sortValue: (r) => (r.email ?? '').toLowerCase(),
      render: (u) => (
        <span style={{ fontSize: 12, color: theme.t2 }}>{u.email ?? '—'}</span>
      ),
    },
    {
      key: 'city',
      header: 'Ville',
      sortValue: (r) => (r.city ?? '').toLowerCase(),
      render: (u) => <span>{u.city ?? '—'}</span>,
    },
    {
      key: 'verification',
      header: 'Vérification',
      sortValue: (r) => r.verification_status ?? 'z',
      render: (u) => {
        const status = u.verification_status ?? 'unverified';
        const map: Record<string, { bg: string; color: string }> = {
          approved: { bg: theme.successSoft, color: theme.success },
          pending: { bg: theme.warningSoft, color: theme.warning },
        };
        const style = map[status] ?? { bg: theme.elevated, color: theme.t3 };
        return <Badge label={status} bg={style.bg} color={style.color} />;
      },
    },
    {
      key: 'admin',
      header: 'Rôle',
      render: (u) => {
        if (u.is_admin) return <Badge label="Admin" bg="rgba(239,68,68,0.12)" color={theme.danger} />;
        return <span style={{ color: theme.t3 }}>—</span>;
      },
    },
    {
      key: 'created_at',
      header: 'Inscrit',
      sortValue: (r) => new Date(r.created_at).getTime(),
      render: (u) => <span>{fmt(u.created_at)}</span>,
    },
  ];

  const actions: RowAction<UserRow>[] = [
    {
      label: 'Détails',
      icon: '→',
      onClick: (u) => openDetail(u),
    },
    {
      label: '',
      icon: '✓',
      color: 'var(--gradient-start)',
      onClick: (u) => toggleVerified(u),
      loading: (u) => updating === u.id + '-verified',
      disabled: (u) => !!u.deleted_at,
    },
    {
      label: '',
      icon: '⬆',
      color: 'var(--semantic-warning)',
      onClick: (u) => toggleAdmin(u),
      loading: (u) => updating === u.id + '-admin',
      disabled: (u) => !!u.deleted_at,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.t1, margin: 0 }}>Utilisateurs</h1>
        <span style={{ fontSize: 12, color: theme.t3 }}>{users.length} comptes</span>
      </div>

      <DataTable
        data={users}
        columns={columns}
        actions={actions}
        pageSize={25}
        searchPlaceholder="Rechercher par nom, email, ville..."
        searchFilter={(u, q) =>
          (u.display_name ?? '').toLowerCase().includes(q) ||
          (u.email ?? '').toLowerCase().includes(q) ||
          (u.city ?? '').toLowerCase().includes(q) ||
          u.id.startsWith(q)
        }
        emptyMessage="Aucun utilisateur"
        onRowClick={(u) => openDetail(u)}
      />

      <AnimatePresence>
        {selectedUser && (
          <UserDrawer
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            onAction={() => {
              loadUsers();
              if (selectedUser) openDetail(selectedUser);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
