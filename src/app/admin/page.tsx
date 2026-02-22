// src/app/admin/page.tsx
// Tower Control — SafePin Admin Dashboard

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Toaster } from 'sonner';
import { Pin, UserReport, AdminParam, LiveSession } from '@/types';

// ─── Supabase client (uses service role via anon key — add RLS policies or use service key) ──
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ─── Types ────────────────────────────────────────────────────────────────────

type ProfileRow = {
  id: string;
  display_name: string | null;
  created_at: string;
  verification_status: string | null;
  is_admin: boolean | null;
};

type LiveSessionRow = LiveSession;

type PinFilter   = 'all' | 'active' | 'resolved' | 'emergency';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function shortId(id: string) {
  return id.slice(0, 8) + '…';
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {children}
    </span>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
    </div>
  );
}

function severityColor(s: string) {
  if (s === 'high') return 'bg-red-100 text-red-700';
  if (s === 'med')  return 'bg-yellow-100 text-yellow-700';
  return 'bg-green-100 text-green-700';
}

function statusColor(resolved: boolean) {
  return resolved ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700';
}

function reportStatusColor(status: string) {
  if (status === 'pending')  return 'bg-yellow-100 text-yellow-700';
  if (status === 'reviewed') return 'bg-blue-100 text-blue-700';
  return 'bg-green-100 text-green-700';
}

// ─── Default admin params ─────────────────────────────────────────────────────

const DEFAULT_PARAMS: AdminParam[] = [
  { key: 'pin_expiry_hours',      value: '24',   description: 'Hours before a pin auto-expires', updated_at: '' },
  { key: 'sos_expiry_hours',      value: '2',    description: 'Hours before an SOS pin auto-expires', updated_at: '' },
  { key: 'auto_resolve_denies',   value: '3',    description: 'Number of deny votes to auto-resolve a pin', updated_at: '' },
  { key: 'max_pins_per_user_day', value: '10',   description: 'Max pins a user can create per day', updated_at: '' },
  { key: 'notify_radius_default', value: '1000', description: 'Default push notification radius in metres', updated_at: '' },
];

// ─── Tab 1 — Overview ─────────────────────────────────────────────────────────

function OverviewTab() {
  const [stats, setStats] = useState({
    totalPins: 0,
    activePins: 0,
    sosPins: 0,
    totalUsers: 0,
    pendingReports: 0,
    liveSessions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentPins, setRecentPins] = useState<Pin[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [pinsRes, usersRes, reportsRes, liveRes] = await Promise.all([
        supabase.from('pins').select('id, is_emergency, resolved_at, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(5),
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('user_reports').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('live_sessions').select('id', { count: 'exact' }).is('ended_at', null),
      ]);

      const allPins = pinsRes.data as Pin[] ?? [];
      setRecentPins(allPins);
      setStats({
        totalPins: pinsRes.count ?? 0,
        activePins: allPins.filter((p) => !p.resolved_at).length,
        sosPins:    allPins.filter((p) => p.is_emergency && !p.resolved_at).length,
        totalUsers: usersRes.count ?? 0,
        pendingReports: reportsRes.count ?? 0,
        liveSessions: liveRes.count ?? 0,
      });
      setLoading(false);
    })();
  }, []);

  const statCards = [
    { label: 'Total Pins',      value: stats.totalPins,       color: 'text-gray-900'  },
    { label: 'Active Pins',     value: stats.activePins,      color: 'text-green-700' },
    { label: 'Active SOS',      value: stats.sosPins,         color: 'text-red-700'   },
    { label: 'Users',           value: stats.totalUsers,      color: 'text-blue-700'  },
    { label: 'Pending Reports', value: stats.pendingReports,  color: 'text-yellow-700'},
    { label: 'Live Sessions',   value: stats.liveSessions,    color: 'text-purple-700'},
  ];

  return (
    <div className="space-y-6">
      {loading ? <Spinner /> : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {statCards.map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <p className="text-xs font-medium text-gray-500 mb-1">{s.label}</p>
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Pins</h3>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Emergency</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentPins.map((pin) => (
                    <tr key={pin.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">{shortId(pin.id)}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{pin.category}</td>
                      <td className="px-4 py-3"><Badge color={severityColor(pin.severity)}>{pin.severity}</Badge></td>
                      <td className="px-4 py-3">
                        {pin.is_emergency ? <Badge color="bg-red-100 text-red-700">Yes</Badge> : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3"><Badge color={statusColor(!!pin.resolved_at)}>{pin.resolved_at ? 'resolved' : 'active'}</Badge></td>
                      <td className="px-4 py-3 text-gray-500">{fmt(pin.created_at)}</td>
                    </tr>
                  ))}
                  {recentPins.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No pins found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tab 2 — Pins ─────────────────────────────────────────────────────────────

function PinsTab() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PinFilter>('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      let query = supabase.from('pins').select('*', { count: 'exact' });
      if (filter === 'active')    query = query.is('resolved_at', null).eq('is_emergency', false);
      if (filter === 'resolved')  query = query.not('resolved_at', 'is', null);
      if (filter === 'emergency') query = query.eq('is_emergency', true);

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (error) throw error;
      setPins((data as Pin[]) ?? []);
      setTotal(count ?? 0);
    } catch {
      toast.error('Failed to load pins');
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);

  async function handleResolve(id: string) {
    const { error } = await supabase.from('pins').update({ resolved_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Failed to resolve pin'); return; }
    toast.success('Pin resolved');
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this pin?')) return;
    const { error } = await supabase.from('pins').delete().eq('id', id);
    if (error) { toast.error('Failed to delete pin'); return; }
    toast.success('Pin deleted');
    load();
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} pins?`)) return;
    const { error } = await supabase.from('pins').delete().in('id', Array.from(selected));
    if (error) { toast.error('Bulk delete failed'); return; }
    toast.success(`Deleted ${selected.size} pins`);
    load();
  }

  function toggleSelect(id: string) {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  function toggleAll() {
    setSelected(selected.size === pins.length ? new Set() : new Set(pins.map((p) => p.id)));
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const filterButtons: { id: PinFilter; label: string }[] = [
    { id: 'all', label: 'All' }, { id: 'active', label: 'Active' },
    { id: 'resolved', label: 'Resolved' }, { id: 'emergency', label: 'Emergency' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Pins ({total})</h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {filterButtons.map((f) => (
              <button
                key={f.id}
                onClick={() => { setFilter(f.id); setPage(0); }}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${filter === f.id ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {selected.size > 0 && (
            <button onClick={handleBulkDelete} className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              Delete {selected.size} selected
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3"><input type="checkbox" checked={selected.size === pins.length && pins.length > 0} onChange={toggleAll} className="rounded" /></th>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Emergency</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pins.map((pin) => (
                  <tr key={pin.id} className={`hover:bg-gray-50 transition-colors ${selected.has(pin.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3"><input type="checkbox" checked={selected.has(pin.id)} onChange={() => toggleSelect(pin.id)} className="rounded" /></td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{shortId(pin.id)}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{pin.category}</td>
                    <td className="px-4 py-3"><Badge color={severityColor(pin.severity)}>{pin.severity}</Badge></td>
                    <td className="px-4 py-3">{pin.is_emergency ? <Badge color="bg-red-100 text-red-700">Yes</Badge> : <span className="text-gray-400">—</span>}</td>
                    <td className="px-4 py-3 text-gray-500">{fmt(pin.created_at)}</td>
                    <td className="px-4 py-3"><Badge color={statusColor(!!pin.resolved_at)}>{pin.resolved_at ? 'resolved' : 'active'}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {!pin.resolved_at && <button onClick={() => handleResolve(pin.id)} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors">Resolve</button>}
                        <button onClick={() => handleDelete(pin.id)} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pins.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No pins found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Page {page + 1} of {totalPages} ({total} total)</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">Prev</button>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 3 — Users ────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, created_at, verification_status, is_admin')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUsers((data as ProfileRow[]) ?? []);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleToggleAdmin(user: ProfileRow) {
    const { error } = await supabase.from('profiles').update({ is_admin: !user.is_admin }).eq('id', user.id);
    if (error) { toast.error('Failed to update admin status'); return; }
    toast.success(`Admin status ${!user.is_admin ? 'granted' : 'revoked'}`);
    load();
  }

  async function handleDeleteUser(id: string) {
    if (!confirm('Delete this user\'s profile?')) return;
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) { toast.error('Failed to delete profile'); return; }
    toast.success('Profile deleted');
    load();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Users ({users.length})</h2>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Display Name</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Verification</th>
                  <th className="px-4 py-3">Admin</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{shortId(u.id)}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{u.display_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{fmt(u.created_at)}</td>
                    <td className="px-4 py-3">{u.verification_status ? <Badge color="bg-green-100 text-green-700">{u.verification_status}</Badge> : <span className="text-gray-400">—</span>}</td>
                    <td className="px-4 py-3">{u.is_admin ? <Badge color="bg-purple-100 text-purple-700">Admin</Badge> : <span className="text-gray-400">—</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleToggleAdmin(u)} className={`px-2 py-1 text-xs rounded transition-colors ${u.is_admin ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          {u.is_admin ? 'Revoke admin' : 'Make admin'}
                        </button>
                        <button onClick={() => handleDeleteUser(u.id)} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No users found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 4 — Reports ─────────────────────────────────────────────────────────

function ReportsTab() {
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('user_reports').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setReports((data as UserReport[]) ?? []);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, status: 'reviewed' | 'resolved') {
    const { error } = await supabase.from('user_reports').update({ status }).eq('id', id);
    if (error) { toast.error('Failed to update report'); return; }
    toast.success(`Report marked ${status}`);
    load();
  }

  async function handleDeleteReport(id: string) {
    if (!confirm('Delete this report record?')) return;
    const { error } = await supabase.from('user_reports').delete().eq('id', id);
    if (error) { toast.error('Failed to delete report'); return; }
    toast.success('Report deleted');
    load();
  }

  const pending  = reports.filter((r) => r.status === 'pending').length;
  const reviewed = reports.filter((r) => r.status === 'reviewed').length;
  const resolved = reports.filter((r) => r.status === 'resolved').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Reports ({reports.length})</h2>
        <div className="flex gap-3 text-xs text-gray-500">
          <span><span className="font-semibold text-yellow-600">{pending}</span> pending</span>
          <span><span className="font-semibold text-blue-600">{reviewed}</span> reviewed</span>
          <span><span className="font-semibold text-green-600">{resolved}</span> resolved</span>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Reporter</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Target ID</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{shortId(r.reporter_id)}</td>
                    <td className="px-4 py-3"><Badge color="bg-gray-100 text-gray-600">{r.target_type}</Badge></td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{shortId(r.target_id)}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs truncate" title={r.reason}>{r.reason}</td>
                    <td className="px-4 py-3"><Badge color={reportStatusColor(r.status)}>{r.status}</Badge></td>
                    <td className="px-4 py-3 text-gray-500">{fmt(r.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        {r.status === 'pending' && <button onClick={() => updateStatus(r.id, 'reviewed')} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">Reviewed</button>}
                        {r.status !== 'resolved' && <button onClick={() => updateStatus(r.id, 'resolved')} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors">Resolve</button>}
                        <button onClick={() => handleDeleteReport(r.id)} className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded hover:bg-gray-200 transition-colors">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No reports found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 5 — Parameters ──────────────────────────────────────────────────────

function ParametersTab() {
  const [params, setParams] = useState<AdminParam[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('admin_params').select('*').order('key');
      if (error) throw error;

      if (!data || data.length === 0) {
        setParams(DEFAULT_PARAMS);
      } else {
        const keySet = new Set((data as AdminParam[]).map((p) => p.key));
        const merged = [...(data as AdminParam[])];
        for (const def of DEFAULT_PARAMS) {
          if (!keySet.has(def.key)) merged.push(def);
        }
        setParams(merged);
      }
    } catch {
      toast.error('Failed to load parameters');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveEdit(p: AdminParam) {
    if (editValue === p.value) { setEditingKey(null); return; }
    const { error } = await supabase.from('admin_params').upsert(
      { key: p.key, value: editValue, description: p.description, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
    if (error) { toast.error('Failed to save parameter'); return; }
    toast.success(`Saved ${p.key}`);
    setEditingKey(null);
    load();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Parameters</h2>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? <Spinner /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {params.map((p) => (
                <tr key={p.key} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-sm font-medium text-gray-800">{p.key}</td>
                  <td className="px-4 py-3">
                    {editingKey === p.key ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(p); if (e.key === 'Escape') setEditingKey(null); }}
                          className="w-32 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                        />
                        <button onClick={() => saveEdit(p)} className="px-2 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-700">Save</button>
                        <button onClick={() => setEditingKey(null)} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200">Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingKey(p.key); setEditValue(p.value); }}
                        className="font-mono text-sm text-gray-900 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors cursor-pointer"
                      >
                        {p.value}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.description ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{p.updated_at ? fmt(p.updated_at) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-gray-400">Click any value to edit inline. Changes are saved immediately.</p>
    </div>
  );
}

// ─── Tab 6 — Live Sessions ────────────────────────────────────────────────────

function LiveTab() {
  const [sessions, setSessions] = useState<LiveSessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('live_sessions').select('*').is('ended_at', null).order('started_at', { ascending: false });
      if (error) throw error;
      setSessions((data as LiveSessionRow[]) ?? []);
    } catch {
      toast.error('Failed to load live sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleTerminate(id: string) {
    if (!confirm('Terminate this live session?')) return;
    const { error } = await supabase.from('live_sessions').update({ ended_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Failed to terminate session'); return; }
    toast.success('Session terminated');
    load();
  }

  function sessionDuration(startedAt: string) {
    const diffMs = Date.now() - new Date(startedAt).getTime();
    const mins = Math.floor(diffMs / 60000);
    const hrs  = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    return `${mins}m`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Live Sessions
            {sessions.length > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-sm font-normal text-green-600">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                {sessions.length} active
              </span>
            )}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Auto-refreshes every 15 seconds</p>
        </div>
        <button onClick={load} disabled={loading} className="px-3 py-1.5 text-sm font-medium bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
          Refresh now
        </button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Session ID</th>
                  <th className="px-4 py-3">Pin ID</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Visibility</th>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{shortId(s.id)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{shortId(s.pin_id)}</td>
                    <td className="px-4 py-3 text-gray-800">{s.display_name ?? shortId(s.user_id)}</td>
                    <td className="px-4 py-3"><Badge color={s.visibility === 'public' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>{s.visibility}</Badge></td>
                    <td className="px-4 py-3 text-gray-500">{fmt(s.started_at)}</td>
                    <td className="px-4 py-3 text-gray-600 font-medium">{sessionDuration(s.started_at)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleTerminate(s.id)} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors">
                        Terminate
                      </button>
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No active live sessions</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type AdminTab = 'overview' | 'pins' | 'users' | 'reports' | 'params' | 'live';

const TABS: { id: AdminTab; label: string; emoji: string }[] = [
  { id: 'overview', label: 'Overview',   emoji: '📊' },
  { id: 'pins',     label: 'Pins',       emoji: '📍' },
  { id: 'users',    label: 'Users',      emoji: '👥' },
  { id: 'reports',  label: 'Reports',    emoji: '🚩' },
  { id: 'params',   label: 'Parameters', emoji: '⚙️' },
  { id: 'live',     label: 'Live',       emoji: '📡' },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster richColors position="top-right" />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <span className="text-xl">🗼</span>
              <div>
                <h1 className="text-base font-black text-gray-900 leading-none">Tower Control</h1>
                <p className="text-xs text-gray-400 leading-none mt-0.5">SafePin Admin</p>
              </div>
            </div>
            <a href="/map" className="text-xs text-gray-500 hover:text-gray-800 transition-colors">
              ← Back to app
            </a>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 pb-0 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.emoji}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'pins'     && <PinsTab />}
        {activeTab === 'users'    && <UsersTab />}
        {activeTab === 'reports'  && <ReportsTab />}
        {activeTab === 'params'   && <ParametersTab />}
        {activeTab === 'live'     && <LiveTab />}
      </main>
    </div>
  );
}
