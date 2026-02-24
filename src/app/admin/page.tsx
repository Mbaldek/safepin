// src/app/admin/page.tsx
// Tower Control — Brume Admin Dashboard

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Toaster } from 'sonner';
import { Pin, UserReport, AdminParam, LiveSession, SafeSpace, DayHours } from '@/types';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { geocodeForward } from '@/lib/geocode';

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
  const [userNames, setUserNames] = useState<Record<string, string | null>>({});
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
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
      const rows = (data as Pin[]) ?? [];
      setPins(rows);
      setTotal(count ?? 0);

      // Resolve user names for this page
      const uids = [...new Set(rows.map((p) => p.user_id).filter(Boolean))] as string[];
      if (uids.length) {
        const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', uids);
        const nm: Record<string, string | null> = {};
        for (const p of (profiles ?? [])) nm[p.id] = p.display_name;
        setUserNames((prev) => ({ ...prev, ...nm }));
      }
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
      {detailUserId && <UserDetailPanel userId={detailUserId} onClose={() => setDetailUserId(null)} />}
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
                  <th className="px-4 py-3">User</th>
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
                    <td className="px-4 py-3"><UserChip userId={pin.user_id} name={userNames[pin.user_id ?? '']} onSelect={setDetailUserId} /></td>
                    <td className="px-4 py-3 font-medium text-gray-800">{pin.category}</td>
                    <td className="px-4 py-3"><Badge color={severityColor(pin.severity)}>{pin.severity}</Badge></td>
                    <td className="px-4 py-3">{pin.is_emergency ? <Badge color="bg-red-100 text-red-700">Yes</Badge> : <span className="text-gray-400">—</span>}</td>
                    <td className="px-4 py-3 text-gray-500">{fmt(pin.created_at)}</td>
                    <td className="px-4 py-3"><Badge color={statusColor(!!pin.resolved_at)}>{pin.resolved_at ? 'resolved' : 'active'}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/map?pin=${pin.id}${pin.is_simulated ? '&sim=1' : ''}`} target="_blank" className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">See on map</Link>
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
  const [detailUserId, setDetailUserId] = useState<string | null>(null);

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
      {detailUserId && <UserDetailPanel userId={detailUserId} onClose={() => setDetailUserId(null)} />}
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
                    <td className="px-4 py-3"><UserChip userId={u.id} name={u.display_name} onSelect={setDetailUserId} /></td>
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
  const [userNames, setUserNames] = useState<Record<string, string | null>>({});
  const [detailUserId, setDetailUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('user_reports').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const rows = (data as UserReport[]) ?? [];
      setReports(rows);
      // Resolve reporter names
      const uids = [...new Set(rows.map((r) => r.reporter_id).filter(Boolean))];
      if (uids.length) {
        const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', uids);
        const nm: Record<string, string | null> = {};
        for (const p of (profiles ?? [])) nm[p.id] = p.display_name;
        setUserNames(nm);
      }
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
      {detailUserId && <UserDetailPanel userId={detailUserId} onClose={() => setDetailUserId(null)} />}
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
                    <td className="px-4 py-3"><UserChip userId={r.reporter_id} name={userNames[r.reporter_id]} onSelect={setDetailUserId} /></td>
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

// ─── Shared: SVG Bar Chart ────────────────────────────────────────────────────

type ChartPoint = { label: string; value: number };

function MiniBarChart({ data, color = '#6366f1', height = 80 }: { data: ChartPoint[]; color?: string; height?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  const W = 600; const H = height;
  const bw = Math.max(1, Math.floor(W / data.length) - 2);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="overflow-visible">
      {data.map((d, i) => {
        const bh = Math.max(1, (d.value / max) * H);
        return (
          <g key={i}>
            <rect x={i * (W / data.length) + 1} y={H - bh} width={bw} height={bh} fill={color} rx={2} opacity={0.85} />
            {d.value > 0 && i % Math.ceil(data.length / 8) === 0 && (
              <text x={i * (W / data.length) + bw / 2} y={H - bh - 3} textAnchor="middle" fontSize={18} fill="#6b7280">{d.value}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function ChartCard({ title, subtitle, data, color }: { title: string; subtitle?: string; data: ChartPoint[]; color?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-700">{title}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <span className="text-xl font-black text-gray-900">{total.toLocaleString()}</span>
      </div>
      <div className="h-20">
        <MiniBarChart data={data} color={color} height={80} />
      </div>
      <div className="flex items-center justify-between mt-2 text-[0.65rem] text-gray-400">
        <span>{data[0]?.label ?? ''}</span>
        <span>{data[data.length - 1]?.label ?? ''}</span>
      </div>
    </div>
  );
}

// ─── Shared: User Chip + Detail Panel ────────────────────────────────────────

function UserChip({ userId, name, onSelect }: { userId?: string | null; name?: string | null; onSelect?: (id: string) => void }) {
  if (!userId) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <button
      onClick={() => onSelect?.(userId)}
      className="group flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
      title={userId}
    >
      <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[0.55rem] font-black text-blue-700 group-hover:bg-blue-200 transition-colors">
        {(name?.[0] ?? '?').toUpperCase()}
      </span>
      <span className="hover:underline">{name ?? shortId(userId)}</span>
    </button>
  );
}

type UserDetail = {
  id: string;
  display_name: string | null;
  created_at: string;
  verification_status: string | null;
  is_admin: boolean | null;
  avatar_url?: string | null;
};

function UserDetailPanel({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [user, setUser]       = useState<UserDetail | null>(null);
  const [pins, setUserPins]   = useState<Pin[]>([]);
  const [stats, setStats]     = useState({ pinCount: 0, voteCount: 0, commentCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [profileRes, pinsRes, votesRes, commentsRes] = await Promise.all([
        supabase.from('profiles').select('id, display_name, created_at, verification_status, is_admin, avatar_url').eq('id', userId).single(),
        supabase.from('pins').select('id, category, severity, is_emergency, resolved_at, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
        supabase.from('pin_votes').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('pin_comments').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      ]);
      setUser((profileRes.data as UserDetail) ?? null);
      setUserPins((pinsRes.data as Pin[]) ?? []);
      setStats({
        pinCount:     pinsRes.data?.length ?? 0,
        voteCount:    (votesRes as { count: number | null }).count ?? 0,
        commentCount: (commentsRes as { count: number | null }).count ?? 0,
      });
      setLoading(false);
    })();
  }, [userId]);

  async function handleToggleAdmin() {
    if (!user) return;
    await supabase.from('profiles').update({ is_admin: !user.is_admin }).eq('id', userId);
    setUser((u) => u ? { ...u, is_admin: !u.is_admin } : u);
    toast.success('Admin status updated');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-linear-to-r from-gray-900 to-gray-700 px-6 py-5 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-black overflow-hidden">
                {user?.avatar_url
                  ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                  : (user?.display_name?.[0] ?? '?').toUpperCase()}
              </div>
              <div>
                <p className="font-black text-base leading-tight">{user?.display_name ?? 'Unnamed user'}</p>
                <p className="text-xs text-white/60 mt-0.5 font-mono">{userId}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white text-xl leading-none">✕</button>
          </div>
          <div className="flex gap-3 mt-4">
            {[
              { label: 'Pins',     value: stats.pinCount     },
              { label: 'Votes',    value: stats.voteCount    },
              { label: 'Comments', value: stats.commentCount },
            ].map(({ label, value }) => (
              <div key={label} className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-center">
                <p className="text-lg font-black">{value}</p>
                <p className="text-[0.6rem] text-white/60 uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        {loading ? <Spinner /> : (
          <div className="px-6 py-4 space-y-4">
            {/* Meta */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-400 font-medium mb-0.5">Joined</p>
                <p className="font-semibold text-gray-800">{user?.created_at ? fmt(user.created_at) : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium mb-0.5">Verification</p>
                <p className="font-semibold text-gray-800">{user?.verification_status ?? 'None'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium mb-0.5">Role</p>
                {user?.is_admin
                  ? <Badge color="bg-purple-100 text-purple-700">Admin</Badge>
                  : <Badge color="bg-gray-100 text-gray-500">User</Badge>}
              </div>
            </div>

            {/* Recent pins */}
            {pins.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent pins</p>
                <div className="space-y-1.5">
                  {pins.map((pin) => (
                    <div key={pin.id} className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2">
                      <Badge color={severityColor(pin.severity)}>{pin.severity}</Badge>
                      <span className="font-medium text-gray-700">{pin.category}</span>
                      <span className="ml-auto text-gray-400">{fmt(pin.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={handleToggleAdmin}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${user?.is_admin ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {user?.is_admin ? 'Revoke admin' : 'Grant admin'}
              </button>
              <button
                onClick={async () => {
                  if (!confirm('Delete this user profile?')) return;
                  await supabase.from('profiles').delete().eq('id', userId);
                  toast.success('Profile deleted');
                  onClose();
                }}
                className="flex-1 py-2 text-sm font-semibold rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
              >
                Delete profile
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 7 — Analytics ────────────────────────────────────────────────────────

function groupByHour(rows: { created_at: string }[]): ChartPoint[] {
  const counts: Record<string, number> = {};
  for (let h = 0; h < 24; h++) counts[String(h).padStart(2, '0')] = 0;
  const todayStr = new Date().toISOString().slice(0, 10);
  for (const r of rows) {
    if (!r.created_at.startsWith(todayStr)) continue;
    const hh = r.created_at.slice(11, 13);
    if (hh in counts) counts[hh]++;
  }
  return Object.entries(counts).map(([h, value]) => ({ label: `${h}h`, value }));
}

function groupByDay(rows: { created_at: string }[], days = 30): ChartPoint[] {
  const counts: Record<string, number> = {};
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    counts[key] = 0;
  }
  for (const r of rows) {
    const key = r.created_at.slice(0, 10);
    if (key in counts) counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts).map(([day, value]) => ({
    label: day.slice(5), // MM-DD
    value,
  }));
}

function distinctUsers(rows: { created_at: string; user_id?: string | null }[]): Set<string> {
  const s = new Set<string>();
  for (const r of rows) { if (r.user_id) s.add(r.user_id); }
  return s;
}

function filterByRange(rows: { created_at: string }[], from: Date, to: Date) {
  return rows.filter((r) => {
    const t = new Date(r.created_at).getTime();
    return t >= from.getTime() && t < to.getTime();
  });
}

function AnalyticsTab() {
  const [loading, setLoading] = useState(true);

  // raw data
  const [allProfiles, setAllProfiles] = useState<{ id: string; created_at: string }[]>([]);
  const [allPins, setAllPins] = useState<{ user_id: string | null; created_at: string; resolved_at: string | null }[]>([]);
  const [allVotes, setAllVotes] = useState<{ user_id: string | null; created_at: string }[]>([]);
  const [allComments, setAllComments] = useState<{ user_id: string | null; created_at: string }[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
      const [profilesRes, pinsRes, votesRes, commentsRes] = await Promise.all([
        supabase.from('profiles').select('id, created_at').gte('created_at', cutoff),
        supabase.from('pins').select('user_id, created_at, resolved_at').gte('created_at', cutoff),
        supabase.from('pin_votes').select('user_id, created_at').gte('created_at', cutoff),
        supabase.from('pin_comments').select('user_id, created_at').gte('created_at', cutoff),
      ]);
      setAllProfiles((profilesRes.data as { id: string; created_at: string }[]) ?? []);
      setAllPins((pinsRes.data as { user_id: string | null; created_at: string; resolved_at: string | null }[]) ?? []);
      setAllVotes((votesRes.data as { user_id: string | null; created_at: string }[]) ?? []);
      setAllComments((commentsRes.data as { user_id: string | null; created_at: string }[]) ?? []);
      setLoading(false);
    })();
  }, []);

  // Date ranges
  const todayStart     = new Date(); todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const weekStart      = new Date(todayStart.getTime() - 6 * 86400000);
  const monthStart     = new Date(todayStart); monthStart.setDate(1);
  const tomorrow       = new Date(todayStart.getTime() + 86400000);

  // Active users (combined: pins + votes + comments)
  function activeUsers(from: Date, to: Date) {
    const allActivity = [...allPins, ...allVotes, ...allComments];
    return distinctUsers(filterByRange(allActivity, from, to)).size;
  }

  const dauToday     = activeUsers(todayStart, tomorrow);
  const dauYesterday = activeUsers(yesterdayStart, todayStart);
  const wau          = activeUsers(weekStart, tomorrow);
  const mau          = activeUsers(monthStart, tomorrow);

  // New users
  const newToday = filterByRange(allProfiles, todayStart, tomorrow).length;
  const newMonth = filterByRange(allProfiles, monthStart, tomorrow).length;

  // Pins
  const pinsToday = filterByRange(allPins, todayStart, tomorrow).length;
  const pinsWeek  = filterByRange(allPins, weekStart, tomorrow).length;

  // Engagement
  const resolvedPins  = allPins.filter((p) => p.resolved_at).length;
  const resolutionRate = allPins.length > 0 ? Math.round((resolvedPins / allPins.length) * 100) : 0;
  const engagementRate = allPins.length > 0
    ? ((allVotes.length + allComments.length) / allPins.length).toFixed(1)
    : '0';

  // Retention: users active this week who joined >7 days ago
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const oldUserIds = new Set(allProfiles.filter((p) => p.created_at < sevenDaysAgo).map((p) => p.id));
  const returnedThisWeek = [...distinctUsers(filterByRange([...allPins, ...allVotes, ...allComments], weekStart, tomorrow))].filter((id) => oldUserIds.has(id)).length;

  // Chart data (30-day trends)
  const newUsersChart = groupByDay(allProfiles);
  const pinsChart     = groupByDay(allPins);
  const votesChart    = groupByDay(allVotes);
  const commentsChart = groupByDay(allComments);

  // DAU chart (unique active user count per day)
  const dauChart: ChartPoint[] = (() => {
    const pts: ChartPoint[] = [];
    const now = Date.now();
    for (let i = 29; i >= 0; i--) {
      const from = new Date(now - i * 86400000); from.setHours(0, 0, 0, 0);
      const to   = new Date(from.getTime() + 86400000);
      pts.push({ label: from.toISOString().slice(5, 10), value: activeUsers(from, to) });
    }
    return pts;
  })();

  // Intra-day charts (hourly, today)
  const pinsHourly    = groupByHour(allPins);
  const votesHourly   = groupByHour(allVotes);
  const commentsHourly = groupByHour(allComments);
  const allActivityHourly: ChartPoint[] = pinsHourly.map((p, i) => ({
    label: p.label,
    value: p.value + votesHourly[i].value + commentsHourly[i].value,
  }));
  const peakHour = allActivityHourly.reduce((best, cur) => cur.value > best.value ? cur : best, allActivityHourly[0]);
  const totalActivityToday = allActivityHourly.reduce((s, p) => s + p.value, 0);

  const kpiRows = [
    { label: 'DAU Today',      value: dauToday,      color: 'text-indigo-700', sub: `${dauYesterday} yesterday` },
    { label: 'WAU',            value: wau,            color: 'text-blue-700',   sub: 'last 7 days' },
    { label: 'MAU',            value: mau,            color: 'text-cyan-700',   sub: 'this month' },
    { label: 'New users today',value: newToday,       color: 'text-emerald-700',sub: `${newMonth} this month` },
    { label: 'Pins today',     value: pinsToday,      color: 'text-orange-700', sub: `${pinsWeek} this week` },
    { label: 'Resolution rate',value: `${resolutionRate}%`, color: 'text-green-700', sub: 'resolved / total' },
    { label: 'Avg engagement', value: engagementRate, color: 'text-purple-700', sub: 'votes+comments / pin' },
    { label: 'Retention (7d)', value: returnedThisWeek, color: 'text-rose-700', sub: 'old users re-active' },
  ];

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpiRows.map(({ label, value, color, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-[0.6rem] text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Intra-day (today, hourly) */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h3 className="text-sm font-bold text-gray-700">Today — Hourly Breakdown</h3>
          <span className="text-xs text-gray-400">{totalActivityToday} actions total · Peak at {peakHour.label} ({peakHour.value})</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard title="All activity / hour"  subtitle="Pins + votes + comments today" data={allActivityHourly} color="#6366f1" />
          <ChartCard title="Pins / hour"           subtitle="New reports today"             data={pinsHourly}       color="#f59e0b" />
          <ChartCard title="Votes / hour"          subtitle="Confirmations today"           data={votesHourly}      color="#3b82f6" />
          <ChartCard title="Comments / hour"       subtitle="Discussion today"              data={commentsHourly}   color="#8b5cf6" />
        </div>
      </div>

      {/* 30-day trends */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3">30-Day Trends</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard title="Daily Active Users"  subtitle="30-day trend"        data={dauChart}     color="#6366f1" />
          <ChartCard title="New Users / day"     subtitle="Signups last 30 days" data={newUsersChart} color="#10b981" />
          <ChartCard title="Pins created / day"  subtitle="Content volume"       data={pinsChart}    color="#f59e0b" />
          <ChartCard title="Votes / day"         subtitle="Community engagement"  data={votesChart}   color="#3b82f6" />
          <ChartCard title="Comments / day"      subtitle="Discussion activity"   data={commentsChart} color="#8b5cf6" />
        </div>
      </div>
    </div>
  );
}

// ─── Tab 8 — Simulation ──────────────────────────────────────────────────────

function SimulationTab() {
  const [loading, setLoading] = useState(false);
  const [simActive, setSimActive] = useState(false);
  const [userCount, setUserCount] = useState(200);
  const [pinCount, setPinCount] = useState(500);
  const [interval, setIntervalMs] = useState(30000);
  const [stats, setStats] = useState({ simUsers: 0, simPins: 0 });
  const [tickLog, setTickLog] = useState<string[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load stats + current state
  const loadStats = useCallback(async () => {
    const [usersRes, pinsRes, paramRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_simulated', true),
      supabase.from('pins').select('id', { count: 'exact', head: true }).eq('is_simulated', true),
      supabase.from('admin_params').select('value').eq('key', 'simulation_active').single(),
    ]);
    setStats({ simUsers: usersRes.count ?? 0, simPins: pinsRes.count ?? 0 });
    setSimActive(paramRes.data?.value === 'true');
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  // Seed Paris
  async function handleSeed() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Not authenticated'); return; }
      const res = await fetch('/api/simulation/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ userCount, pinCount }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      useStore.getState().setShowSimulated(true);
      toast.success(`Seeded ${data.users_created} users & ${data.pins_created} pins — visible on map`);
      loadStats();
    } catch (err) {
      toast.error(`Seed failed: ${err}`);
    } finally {
      setLoading(false);
    }
  }

  // Toggle simulation active
  async function toggleSimulation() {
    const newVal = !simActive;
    await supabase.from('admin_params').update({ value: String(newVal) }).eq('key', 'simulation_active');
    setSimActive(newVal);
    if (newVal) useStore.getState().setShowSimulated(true);
    toast.success(newVal ? 'Simulation started' : 'Simulation stopped');
    if (!newVal && tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }

  // Tick — call simulate-activity edge function
  const tick = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/simulation/tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'tick' }),
      });
      const data = await res.json();
      if (data.actions?.length) {
        setTickLog((prev) => [`${new Date().toLocaleTimeString()} — ${data.actions.join(', ')}`, ...prev.slice(0, 49)]);
        loadStats();
      }
    } catch { /* ignore tick failures */ }
  }, [loadStats]);

  // Start/stop tick interval
  useEffect(() => {
    if (simActive) {
      tick(); // immediate first tick
      tickRef.current = setInterval(tick, interval);
    } else if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [simActive, interval, tick]);

  // Cleanup all simulated data
  async function handleCleanup() {
    if (!confirm(`Delete ALL simulated data?\n${stats.simUsers} users + ${stats.simPins} pins will be removed.`)) return;
    setLoading(true);
    try {
      // Delete pins first (FK), then profiles
      await supabase.from('pins').delete().eq('is_simulated', true);
      await supabase.from('profiles').delete().eq('is_simulated', true);
      toast.success('All simulated data deleted');
      loadStats();
    } catch {
      toast.error('Cleanup failed');
    } finally {
      setLoading(false);
    }
  }

  const intervalOptions = [
    { label: '10s', value: 10000 },
    { label: '30s', value: 30000 },
    { label: '1min', value: 60000 },
    { label: '5min', value: 300000 },
  ];

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
          <p className={`text-lg font-black ${simActive ? 'text-green-600' : 'text-gray-400'}`}>
            {simActive ? '● Active' : '○ Inactive'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Simulated Users</p>
          <p className="text-2xl font-black text-amber-600">{stats.simUsers}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Simulated Pins</p>
          <p className="text-2xl font-black text-amber-600">{stats.simPins}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Tick Interval</p>
          <p className="text-2xl font-black text-gray-700">{interval / 1000}s</p>
        </div>
      </div>

      {/* Seed Data */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-bold text-gray-700 mb-4">Seed Paris with Fake Data</h3>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Users</label>
            <input type="number" value={userCount} onChange={(e) => setUserCount(Number(e.target.value))}
              className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Pins</label>
            <input type="number" value={pinCount} onChange={(e) => setPinCount(Number(e.target.value))}
              className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <button onClick={handleSeed} disabled={loading}
            className="px-5 py-2.5 bg-amber-500 text-white font-bold text-sm rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors">
            {loading ? 'Seeding...' : 'Seed Paris'}
          </button>
        </div>
      </div>

      {/* Live Simulation */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-bold text-gray-700 mb-4">Live Simulation</h3>
        <div className="flex flex-wrap items-center gap-4">
          <button onClick={toggleSimulation}
            className={`px-5 py-2.5 font-bold text-sm rounded-lg transition-colors ${simActive ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-green-500 text-white hover:bg-green-600'}`}>
            {simActive ? 'Stop Simulation' : 'Start Simulation'}
          </button>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {intervalOptions.map((opt) => (
              <button key={opt.value} onClick={() => setIntervalMs(opt.value)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${interval === opt.value ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tick log */}
        {tickLog.length > 0 && (
          <div className="mt-4 max-h-40 overflow-y-auto bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-xs font-bold text-gray-500 mb-2">Activity Log</p>
            {tickLog.map((entry, i) => (
              <p key={i} className="text-xs text-gray-600 font-mono">{entry}</p>
            ))}
          </div>
        )}
      </div>

      {/* Cleanup */}
      <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6">
        <h3 className="text-sm font-bold text-red-700 mb-2">Danger Zone</h3>
        <p className="text-xs text-gray-500 mb-4">
          Delete all simulated users ({stats.simUsers}) and pins ({stats.simPins}). This cannot be undone.
        </p>
        <button onClick={handleCleanup} disabled={loading || (stats.simUsers === 0 && stats.simPins === 0)}
          className="px-5 py-2.5 bg-red-600 text-white font-bold text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
          {loading ? 'Deleting...' : 'Delete All Simulated Data'}
        </button>
      </div>
    </div>
  );
}

// ─── Tab 9 — Safe Spaces ──────────────────────────────────────────────────────

const SAFE_SPACE_TYPES = ['pharmacy', 'hospital', 'police', 'cafe', 'shelter'] as const;
const PARTNER_TIERS = ['basic', 'premium'] as const;
const DAYS_OF_WEEK = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

type SpaceFilter = 'all' | 'pharmacy' | 'hospital' | 'police' | 'cafe' | 'shelter';
type LocalPhoto = { file: File; preview: string };
type GeoSuggestion = { place_name: string; label: string; sublabel: string; coords: [number, number] };

const EMPTY_DAY: DayHours = { closed: false, open: '09:00', close: '18:00' };

const EMPTY_SPACE_FORM = {
  name: '',
  type: 'pharmacy' as SafeSpace['type'],
  address: '',
  phone: '',
  contact_name: '',
  description: '',
  website: '',
  opening_hours: Object.fromEntries(DAYS_OF_WEEK.map((d) => [d, { ...EMPTY_DAY }])) as Record<string, DayHours>,
  is_partner: true,
  partner_tier: 'basic' as 'basic' | 'premium',
  lat: 0,
  lng: 0,
};

function parseLegacyHours(hours: Record<string, string | DayHours>): Record<string, DayHours> {
  return Object.fromEntries(
    DAYS_OF_WEEK.map((d) => {
      const val = hours[d];
      if (!val) return [d, { closed: true }];
      if (typeof val === 'object') return [d, val as DayHours];
      const parts = (val as string).split('-');
      if (parts.length === 2) return [d, { closed: false, open: parts[0].trim(), close: parts[1].trim() }];
      return [d, { closed: (val as string).toLowerCase() === 'closed', open: '09:00', close: '18:00' }];
    })
  );
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];
  function splitLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { if (inQ && line[i + 1] === '"') { current += '"'; i++; } else { inQ = !inQ; } }
      else if (line[i] === ',' && !inQ) { result.push(current.trim()); current = ''; }
      else { current += line[i]; }
    }
    result.push(current.trim());
    return result;
  }
  const headers = splitLine(lines[0]);
  return lines.slice(1).map((line) => {
    const vals = splitLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
  });
}

function validateCsvRows(rows: Record<string, string>[]): string[] {
  const errors: string[] = [];
  rows.forEach((row, i) => {
    const n = i + 2;
    if (!row.name?.trim()) errors.push(`Row ${n}: missing name`);
    if (row.type && !SAFE_SPACE_TYPES.includes(row.type as (typeof SAFE_SPACE_TYPES)[number])) {
      errors.push(`Row ${n}: invalid type "${row.type}"`);
    }
    if (row.partner_tier && !PARTNER_TIERS.includes(row.partner_tier as (typeof PARTNER_TIERS)[number])) {
      errors.push(`Row ${n}: invalid partner_tier "${row.partner_tier}"`);
    }
  });
  return errors;
}

function SafeSpacesTab() {
  const [spaces, setSpaces] = useState<SafeSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SpaceFilter>('all');
  const [partnerOnly, setPartnerOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ ...EMPTY_SPACE_FORM });
  const [addLoading, setAddLoading] = useState(false);

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_SPACE_FORM });

  // Photo upload
  const [addPhotos, setAddPhotos] = useState<LocalPhoto[]>([]);
  const addPhotoRef = useRef<HTMLInputElement>(null);
  const [editPhotos, setEditPhotos] = useState<LocalPhoto[]>([]);
  const editPhotoRef = useRef<HTMLInputElement>(null);
  const [editExistingUrls, setEditExistingUrls] = useState<string[]>([]);

  // Address geocoding
  const [addGeoResults, setAddGeoResults] = useState<GeoSuggestion[]>([]);
  const [addGeoLoading, setAddGeoLoading] = useState(false);
  const [addGeoOpen, setAddGeoOpen] = useState(false);
  const addGeoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editGeoResults, setEditGeoResults] = useState<GeoSuggestion[]>([]);
  const [editGeoLoading, setEditGeoLoading] = useState(false);
  const [editGeoOpen, setEditGeoOpen] = useState(false);
  const editGeoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // CSV import
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvProgress, setCsvProgress] = useState(0);

  // Geocoding helper
  function geocodeAddress(
    query: string,
    timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
    setResults: (r: GeoSuggestion[]) => void,
    setGeoLoading: (l: boolean) => void,
  ) {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim() || query.length < 2) { setResults([]); setGeoLoading(false); return; }
    setGeoLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=5&language=fr,en`,
        );
        const data = await res.json();
        setResults((data.features ?? []).map((f: { place_name: string; geometry: { coordinates: [number, number] } }) => ({
          place_name: f.place_name,
          label: f.place_name.split(',')[0],
          sublabel: f.place_name.split(',').slice(1).join(',').trim(),
          coords: f.geometry.coordinates,
        })));
      } catch { setResults([]); }
      finally { setGeoLoading(false); }
    }, 300);
  }

  // Photo helpers
  function handlePhotoFiles(
    e: React.ChangeEvent<HTMLInputElement>,
    photos: LocalPhoto[],
    setPhotos: React.Dispatch<React.SetStateAction<LocalPhoto[]>>,
    existingCount: number,
  ) {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - photos.length - existingCount;
    if (remaining <= 0) { toast.error('Max 5 photos'); return; }
    const toAdd = files.slice(0, remaining).map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setPhotos((prev) => [...prev, ...toAdd]);
    e.target.value = '';
  }

  async function uploadPhotos(photos: LocalPhoto[], spaceId: string): Promise<string[]> {
    const urls: string[] = [];
    for (const photo of photos) {
      const fileName = `safe-spaces/${spaceId}/${Date.now()}-${photo.file.name}`;
      const { error: upErr } = await supabase.storage.from('pin-photos').upload(fileName, photo.file);
      if (upErr) { toast.error(`Upload failed: ${photo.file.name}`); continue; }
      const { data: urlData } = supabase.storage.from('pin-photos').getPublicUrl(fileName);
      urls.push(urlData.publicUrl);
    }
    return urls;
  }

  // CSV helpers
  function downloadCsvTemplate() {
    const headers = ['name','type','address','phone','contact_name','description','website','is_partner','partner_tier','opening_hours_json'];
    const example = [
      'Pharmacie Centrale','pharmacy','12 Rue de Rivoli, Paris','+33 1 42 00 00 00','Marie Dupont','Open 7/7','https://example.com',
      'true','premium',
      JSON.stringify({ mon:{closed:false,open:'09:00',close:'19:00'}, tue:{closed:false,open:'09:00',close:'19:00'}, wed:{closed:false,open:'09:00',close:'19:00'}, thu:{closed:false,open:'09:00',close:'19:00'}, fri:{closed:false,open:'09:00',close:'19:00'}, sat:{closed:false,open:'10:00',close:'17:00'}, sun:{closed:true} }),
    ];
    const csv = headers.join(',') + '\n' + example.map((v) => v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v).join(',');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'safe-spaces-template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCsvImport() {
    setCsvImporting(true); setCsvProgress(0);
    let inserted = 0;
    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];
      setCsvProgress(Math.round(((i + 1) / csvRows.length) * 100));
      let lat = 0, lng = 0;
      if (row.address?.trim()) {
        const coords = await geocodeForward(row.address.trim());
        if (coords) { lng = coords[0]; lat = coords[1]; }
        await new Promise((r) => setTimeout(r, 100));
      }
      let opening_hours = null;
      if (row.opening_hours_json?.trim()) { try { opening_hours = JSON.parse(row.opening_hours_json); } catch { /* skip */ } }
      const { error } = await supabase.from('safe_spaces').insert({
        name: row.name.trim(), type: (row.type?.trim() || 'pharmacy') as SafeSpace['type'],
        address: row.address?.trim() || null, phone: row.phone?.trim() || null,
        contact_name: row.contact_name?.trim() || null, description: row.description?.trim() || null,
        website: row.website?.trim() || null, opening_hours, lat, lng,
        is_partner: row.is_partner?.toLowerCase() === 'true',
        partner_tier: (row.partner_tier?.trim() as 'basic' | 'premium') || null,
        partner_since: row.is_partner?.toLowerCase() === 'true' ? new Date().toISOString() : null,
        source: 'user' as const, verified: true, upvotes: 0, photo_urls: [],
      });
      if (!error) inserted++;
    }
    toast.success(`Imported ${inserted}/${csvRows.length} safe spaces`);
    setCsvImporting(false); setCsvRows([]); setCsvErrors([]); setShowCsvImport(false); load();
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('safe_spaces').select('*', { count: 'exact' });
      if (filter !== 'all') query = query.eq('type', filter);
      if (partnerOnly) query = query.eq('is_partner', true);

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (error) throw error;
      setSpaces((data as SafeSpace[]) ?? []);
      setTotal(count ?? 0);
    } catch {
      toast.error('Failed to load safe spaces');
    } finally {
      setLoading(false);
    }
  }, [filter, partnerOnly, page]);

  useEffect(() => { load(); }, [load]);

  // Add partner safe space
  async function handleAdd() {
    if (!addForm.name.trim()) { toast.error('Name is required'); return; }
    if (!addForm.lat && !addForm.lng) { toast.error('Please select an address'); return; }
    setAddLoading(true);
    try {
      const row = {
        name: addForm.name.trim(),
        type: addForm.type,
        address: addForm.address.trim() || null,
        phone: addForm.phone.trim() || null,
        contact_name: addForm.contact_name.trim() || null,
        description: addForm.description.trim() || null,
        website: addForm.website.trim() || null,
        opening_hours: Object.values(addForm.opening_hours).some((dh) => !(dh as DayHours).closed) ? addForm.opening_hours : null,
        is_partner: addForm.is_partner,
        partner_tier: addForm.is_partner ? addForm.partner_tier : null,
        partner_since: addForm.is_partner ? new Date().toISOString() : null,
        lat: addForm.lat,
        lng: addForm.lng,
        source: 'user' as const,
        verified: true,
        upvotes: 0,
        photo_urls: [] as string[],
      };
      const { data, error } = await supabase.from('safe_spaces').insert(row).select('id').single();
      if (error) throw error;
      if (addPhotos.length > 0 && data) {
        const urls = await uploadPhotos(addPhotos, data.id);
        if (urls.length > 0) await supabase.from('safe_spaces').update({ photo_urls: urls }).eq('id', data.id);
      }
      toast.success('Safe space added');
      setAddForm({ ...EMPTY_SPACE_FORM });
      setAddPhotos([]);
      setShowAddForm(false);
      load();
    } catch {
      toast.error('Failed to add safe space');
    } finally {
      setAddLoading(false);
    }
  }

  // Start editing
  function startEdit(space: SafeSpace) {
    setEditingId(space.id);
    setEditForm({
      name: space.name,
      type: space.type,
      address: space.address ?? '',
      phone: space.phone ?? '',
      contact_name: space.contact_name ?? '',
      description: space.description ?? '',
      website: space.website ?? '',
      opening_hours: space.opening_hours
        ? parseLegacyHours(space.opening_hours)
        : Object.fromEntries(DAYS_OF_WEEK.map((d) => [d, { ...EMPTY_DAY }])),
      is_partner: space.is_partner,
      partner_tier: space.partner_tier ?? 'basic',
      lat: space.lat,
      lng: space.lng,
    });
    setEditExistingUrls(space.photo_urls ?? []);
    setEditPhotos([]);
  }

  // Save edit
  async function handleSaveEdit(id: string) {
    if (!editForm.name.trim()) { toast.error('Name is required'); return; }
    try {
      const newUrls = editPhotos.length > 0 ? await uploadPhotos(editPhotos, id) : [];
      const allUrls = [...editExistingUrls, ...newUrls];
      const updates = {
        name: editForm.name.trim(),
        type: editForm.type,
        address: editForm.address.trim() || null,
        phone: editForm.phone.trim() || null,
        contact_name: editForm.contact_name.trim() || null,
        description: editForm.description.trim() || null,
        website: editForm.website.trim() || null,
        opening_hours: Object.values(editForm.opening_hours).some((dh) => !(dh as DayHours).closed) ? editForm.opening_hours : null,
        is_partner: editForm.is_partner,
        partner_tier: editForm.is_partner ? editForm.partner_tier : null,
        partner_since: editForm.is_partner ? new Date().toISOString() : null,
        lat: editForm.lat,
        lng: editForm.lng,
        photo_urls: allUrls,
      };
      const { error } = await supabase.from('safe_spaces').update(updates).eq('id', id);
      if (error) throw error;
      toast.success('Safe space updated');
      setEditingId(null);
      setEditPhotos([]);
      setEditExistingUrls([]);
      load();
    } catch {
      toast.error('Failed to update safe space');
    }
  }

  // Delete
  async function handleDelete(id: string) {
    if (!confirm('Delete this safe space?')) return;
    const { error } = await supabase.from('safe_spaces').delete().eq('id', id);
    if (error) { toast.error('Failed to delete safe space'); return; }
    toast.success('Safe space deleted');
    load();
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const filterButtons: { id: SpaceFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'pharmacy', label: 'Pharmacy' },
    { id: 'hospital', label: 'Hospital' },
    { id: 'police', label: 'Police' },
    { id: 'cafe', label: 'Cafe' },
    { id: 'shelter', label: 'Shelter' },
  ];

  // Shared form fields renderer
  function renderFormFields(
    form: typeof EMPTY_SPACE_FORM,
    setForm: (fn: (prev: typeof EMPTY_SPACE_FORM) => typeof EMPTY_SPACE_FORM) => void,
    geo: { results: GeoSuggestion[]; loading: boolean; open: boolean; setOpen: (v: boolean) => void; timer: React.MutableRefObject<ReturnType<typeof setTimeout> | null>; setResults: (r: GeoSuggestion[]) => void; setLoading: (l: boolean) => void },
    photos: LocalPhoto[],
    setPhotos: React.Dispatch<React.SetStateAction<LocalPhoto[]>>,
    photoRef: React.RefObject<HTMLInputElement | null>,
    existingUrls?: string[],
    setExistingUrls?: React.Dispatch<React.SetStateAction<string[]>>,
  ) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="Safe space name"
            />
          </div>
          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as SafeSpace['type'] }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
            >
              {SAFE_SPACE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          {/* Partner tier */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Partner Tier</label>
            <select
              value={form.partner_tier}
              onChange={(e) => setForm((f) => ({ ...f, partner_tier: e.target.value as 'basic' | 'premium' }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
            >
              {PARTNER_TIERS.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          {/* Address with autocomplete */}
          <div className="relative sm:col-span-2 lg:col-span-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">Address *</label>
            <input
              value={form.address}
              onChange={(e) => {
                setForm((f) => ({ ...f, address: e.target.value }));
                geocodeAddress(e.target.value, geo.timer, geo.setResults, geo.setLoading);
                geo.setOpen(true);
              }}
              onFocus={() => geo.results.length > 0 && geo.setOpen(true)}
              onBlur={() => setTimeout(() => geo.setOpen(false), 150)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="Start typing an address..."
            />
            {form.lat !== 0 && form.lng !== 0 && (
              <p className="text-xs text-gray-400 mt-1">Coordinates: {form.lat.toFixed(6)}, {form.lng.toFixed(6)}</p>
            )}
            {geo.open && (geo.loading || geo.results.length > 0) && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                {geo.loading ? (
                  <div className="px-3 py-2 text-xs text-gray-400">Searching...</div>
                ) : geo.results.map((r, i) => (
                  <button key={i} type="button"
                    onMouseDown={() => {
                      setForm((f) => ({ ...f, address: r.place_name, lat: r.coords[1], lng: r.coords[0] }));
                      geo.setOpen(false); geo.setResults([]);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <span className="font-medium text-gray-800">{r.label}</span>
                    {r.sublabel && <span className="text-gray-400 text-xs ml-1">{r.sublabel}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Phone */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="+33 1 23 45 67 89"
            />
          </div>
          {/* Contact name */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Contact Name</label>
            <input
              value={form.contact_name}
              onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="Contact person"
            />
          </div>
          {/* Website */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Website</label>
            <input
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="https://..."
            />
          </div>
        </div>
        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            placeholder="Short description..."
          />
        </div>
        {/* Is partner checkbox */}
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={form.is_partner}
            onChange={(e) => setForm((f) => ({ ...f, is_partner: e.target.checked }))}
            className="rounded" id="partner-checkbox" />
          <label htmlFor="partner-checkbox" className="text-sm text-gray-700 font-medium">Is Partner</label>
        </div>
        {/* Photos */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">
            Photos ({(existingUrls?.length ?? 0) + photos.length}/5)
          </label>
          {existingUrls && existingUrls.length > 0 && (
            <div className="flex gap-2 mb-2 flex-wrap">
              {existingUrls.map((url, i) => (
                <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setExistingUrls?.((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600">x</button>
                </div>
              ))}
            </div>
          )}
          {photos.length > 0 && (
            <div className="flex gap-2 mb-2 flex-wrap">
              {photos.map((p, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                  <img src={p.preview} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600">x</button>
                </div>
              ))}
            </div>
          )}
          {(existingUrls?.length ?? 0) + photos.length < 5 && (
            <label className="inline-flex items-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors text-sm text-gray-500">
              + Add photos
              <input ref={photoRef} type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => handlePhotoFiles(e, photos, setPhotos, existingUrls?.length ?? 0)} />
            </label>
          )}
        </div>
        {/* Opening hours */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">Opening Hours</label>
          <div className="space-y-1.5">
            {DAYS_OF_WEEK.map((day) => {
              const dh = form.opening_hours[day] as DayHours;
              const hasBreak = !!dh.breakStart;
              return (
                <div key={day} className="border border-gray-200 rounded-lg p-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-gray-600 w-8 uppercase">{day}</span>
                    <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                      <input type="checkbox" checked={dh.closed} className="rounded"
                        onChange={(e) => setForm((f) => ({ ...f, opening_hours: { ...f.opening_hours, [day]: { ...dh, closed: e.target.checked } } }))} />
                      Closed
                    </label>
                    {!dh.closed && (
                      <>
                        <div className="flex items-center gap-0.5">
                          <select value={dh.open?.split(':')[0] ?? '09'} className="border border-gray-300 rounded px-1 py-0.5 text-xs bg-white"
                            onChange={(e) => setForm((f) => ({ ...f, opening_hours: { ...f.opening_hours, [day]: { ...dh, open: `${e.target.value}:${dh.open?.split(':')[1] ?? '00'}` } } }))}>
                            {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                          </select>
                          <span className="text-gray-400 text-xs">:</span>
                          <select value={dh.open?.split(':')[1] ?? '00'} className="border border-gray-300 rounded px-1 py-0.5 text-xs bg-white"
                            onChange={(e) => setForm((f) => ({ ...f, opening_hours: { ...f.opening_hours, [day]: { ...dh, open: `${dh.open?.split(':')[0] ?? '09'}:${e.target.value}` } } }))}>
                            {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                        <span className="text-gray-400 text-xs">to</span>
                        <div className="flex items-center gap-0.5">
                          <select value={dh.close?.split(':')[0] ?? '18'} className="border border-gray-300 rounded px-1 py-0.5 text-xs bg-white"
                            onChange={(e) => setForm((f) => ({ ...f, opening_hours: { ...f.opening_hours, [day]: { ...dh, close: `${e.target.value}:${dh.close?.split(':')[1] ?? '00'}` } } }))}>
                            {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                          </select>
                          <span className="text-gray-400 text-xs">:</span>
                          <select value={dh.close?.split(':')[1] ?? '00'} className="border border-gray-300 rounded px-1 py-0.5 text-xs bg-white"
                            onChange={(e) => setForm((f) => ({ ...f, opening_hours: { ...f.opening_hours, [day]: { ...dh, close: `${dh.close?.split(':')[0] ?? '18'}:${e.target.value}` } } }))}>
                            {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                        <button type="button" className="text-xs text-gray-400 hover:text-gray-600 transition-colors ml-auto"
                          onClick={() => setForm((f) => ({
                            ...f, opening_hours: { ...f.opening_hours, [day]: hasBreak
                              ? { closed: dh.closed, open: dh.open, close: dh.close }
                              : { ...dh, breakStart: '12:00', breakEnd: '13:00' } },
                          }))}>
                          {hasBreak ? '- Break' : '+ Break'}
                        </button>
                      </>
                    )}
                  </div>
                  {!dh.closed && hasBreak && (
                    <div className="flex items-center gap-2 mt-1.5 ml-10">
                      <span className="text-xs text-gray-400">Break:</span>
                      <div className="flex items-center gap-0.5">
                        <select value={dh.breakStart?.split(':')[0] ?? '12'} className="border border-gray-300 rounded px-1 py-0.5 text-xs bg-white"
                          onChange={(e) => setForm((f) => ({ ...f, opening_hours: { ...f.opening_hours, [day]: { ...dh, breakStart: `${e.target.value}:${dh.breakStart?.split(':')[1] ?? '00'}` } } }))}>
                          {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <span className="text-gray-400 text-xs">:</span>
                        <select value={dh.breakStart?.split(':')[1] ?? '00'} className="border border-gray-300 rounded px-1 py-0.5 text-xs bg-white"
                          onChange={(e) => setForm((f) => ({ ...f, opening_hours: { ...f.opening_hours, [day]: { ...dh, breakStart: `${dh.breakStart?.split(':')[0] ?? '12'}:${e.target.value}` } } }))}>
                          {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <span className="text-gray-400 text-xs">to</span>
                      <div className="flex items-center gap-0.5">
                        <select value={dh.breakEnd?.split(':')[0] ?? '13'} className="border border-gray-300 rounded px-1 py-0.5 text-xs bg-white"
                          onChange={(e) => setForm((f) => ({ ...f, opening_hours: { ...f.opening_hours, [day]: { ...dh, breakEnd: `${e.target.value}:${dh.breakEnd?.split(':')[1] ?? '00'}` } } }))}>
                          {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <span className="text-gray-400 text-xs">:</span>
                        <select value={dh.breakEnd?.split(':')[1] ?? '00'} className="border border-gray-300 rounded px-1 py-0.5 text-xs bg-white"
                          onChange={(e) => setForm((f) => ({ ...f, opening_hours: { ...f.opening_hours, [day]: { ...dh, breakEnd: `${dh.breakEnd?.split(':')[0] ?? '13'}:${e.target.value}` } } }))}>
                          {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Safe Spaces ({total})</h2>
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
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input type="checkbox" checked={partnerOnly} onChange={(e) => { setPartnerOnly(e.target.checked); setPage(0); }} className="rounded" />
            Partners only
          </label>
          <button
            onClick={() => setShowCsvImport((v) => !v)}
            className="px-3 py-1.5 text-xs font-medium bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {showCsvImport ? 'Close CSV' : 'CSV Import'}
          </button>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            {showAddForm ? 'Cancel' : '+ Add Partner'}
          </button>
        </div>
      </div>

      {/* CSV Import panel */}
      {showCsvImport && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-bold text-gray-700">CSV Bulk Import</h3>
          <div className="flex items-center gap-3">
            <button onClick={downloadCsvTemplate}
              className="px-3 py-2 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              Download Template
            </button>
            <label className="px-3 py-2 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
              Upload CSV
              <input type="file" accept=".csv" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const text = ev.target?.result as string;
                  const rows = parseCsv(text);
                  const errors = validateCsvRows(rows);
                  setCsvRows(rows);
                  setCsvErrors(errors);
                };
                reader.readAsText(file);
                e.target.value = '';
              }} />
            </label>
          </div>

          {csvRows.length > 0 && (
            <div className="space-y-3">
              {/* Errors */}
              {csvErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs font-bold text-red-700 mb-1">Validation Errors ({csvErrors.length})</p>
                  <ul className="text-xs text-red-600 space-y-0.5 max-h-32 overflow-y-auto">
                    {csvErrors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}

              {/* Analysis */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs font-bold text-gray-700 mb-2">Preview — {csvRows.length} row{csvRows.length > 1 ? 's' : ''} detected</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-200">
                        <th className="pb-1 pr-3">#</th>
                        <th className="pb-1 pr-3">Name</th>
                        <th className="pb-1 pr-3">Type</th>
                        <th className="pb-1 pr-3">Address</th>
                        <th className="pb-1">Partner</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-1 pr-3 text-gray-400">{i + 1}</td>
                          <td className="py-1 pr-3 font-medium text-gray-800">{row.name || '—'}</td>
                          <td className="py-1 pr-3 text-gray-600">{row.type || '—'}</td>
                          <td className="py-1 pr-3 text-gray-500 max-w-[200px] truncate">{row.address || '—'}</td>
                          <td className="py-1 text-gray-600">{row.is_partner || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {csvRows.length > 5 && <p className="text-xs text-gray-400 mt-1">...and {csvRows.length - 5} more rows</p>}
                </div>
              </div>

              {/* Progress bar */}
              {csvImporting && (
                <div className="space-y-1">
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-900 rounded-full transition-all duration-300" style={{ width: `${csvProgress}%` }} />
                  </div>
                  <p className="text-xs text-gray-500">Importing... {csvProgress}%</p>
                </div>
              )}

              {/* Confirm */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCsvImport}
                  disabled={csvErrors.length > 0 || csvImporting}
                  className="px-4 py-2 text-xs font-bold bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
                >
                  Confirm Import ({csvRows.length} rows)
                </button>
                <button
                  onClick={() => { setCsvRows([]); setCsvErrors([]); }}
                  className="px-4 py-2 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add form (inline) */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Add Partner Safe Space</h3>
          {renderFormFields(
            addForm,
            setAddForm as (fn: (prev: typeof EMPTY_SPACE_FORM) => typeof EMPTY_SPACE_FORM) => void,
            { results: addGeoResults, loading: addGeoLoading, open: addGeoOpen, setOpen: setAddGeoOpen, timer: addGeoTimer, setResults: setAddGeoResults, setLoading: setAddGeoLoading },
            addPhotos, setAddPhotos, addPhotoRef,
          )}
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleAdd}
              disabled={addLoading}
              className="px-5 py-2.5 bg-gray-900 text-white font-bold text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {addLoading ? 'Adding...' : 'Add Safe Space'}
            </button>
            <button
              onClick={() => { setShowAddForm(false); setAddForm({ ...EMPTY_SPACE_FORM }); }}
              className="px-5 py-2.5 bg-gray-100 text-gray-600 font-medium text-sm rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3">Partner</th>
                  <th className="px-4 py-3">Upvotes</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {spaces.map((space) => (
                  editingId === space.id ? (
                    <tr key={space.id} className="bg-blue-50">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Editing: {space.name}</p>
                          {renderFormFields(
                            editForm,
                            setEditForm as (fn: (prev: typeof EMPTY_SPACE_FORM) => typeof EMPTY_SPACE_FORM) => void,
                            { results: editGeoResults, loading: editGeoLoading, open: editGeoOpen, setOpen: setEditGeoOpen, timer: editGeoTimer, setResults: setEditGeoResults, setLoading: setEditGeoLoading },
                            editPhotos, setEditPhotos, editPhotoRef,
                            editExistingUrls, setEditExistingUrls,
                          )}
                          <div className="flex items-center gap-2 pt-2">
                            <button onClick={() => handleSaveEdit(space.id)} className="px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors">Save</button>
                            <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={space.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">{space.name}</td>
                      <td className="px-4 py-3"><Badge color="bg-gray-100 text-gray-600">{space.type}</Badge></td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={space.address ?? ''}>{space.address ?? <span className="text-gray-400">--</span>}</td>
                      <td className="px-4 py-3">
                        {space.is_partner
                          ? <Badge color="bg-green-100 text-green-700">{space.partner_tier ?? 'partner'}</Badge>
                          : <span className="text-gray-400">--</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-medium">{space.upvotes}</td>
                      <td className="px-4 py-3 text-gray-500">{fmt(space.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => startEdit(space)} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">Edit</button>
                          <button onClick={() => handleDelete(space.id)} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors">Delete</button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
                {spaces.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No safe spaces found</td></tr>}
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

// ─── Main page ────────────────────────────────────────────────────────────────

type AdminTab = 'overview' | 'analytics' | 'pins' | 'users' | 'reports' | 'params' | 'live' | 'simulation' | 'spaces';

const TABS: { id: AdminTab; label: string; emoji: string }[] = [
  { id: 'overview',    label: 'Overview',    emoji: '📊' },
  { id: 'analytics',   label: 'Analytics',   emoji: '📈' },
  { id: 'pins',        label: 'Pins',        emoji: '📍' },
  { id: 'users',       label: 'Users',       emoji: '👥' },
  { id: 'reports',     label: 'Reports',     emoji: '🚩' },
  { id: 'params',      label: 'Parameters',  emoji: '⚙️' },
  { id: 'live',        label: 'Live',        emoji: '📡' },
  { id: 'simulation',  label: 'Simulation',  emoji: '🤖' },
  { id: 'spaces',      label: 'Safe Spaces', emoji: '🛡️' },
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
                <p className="text-xs text-gray-400 leading-none mt-0.5">Brume Admin</p>
              </div>
            </div>
            <Link href="/map" className="text-xs text-gray-500 hover:text-gray-800 transition-colors">
              ← Back to app
            </Link>
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
        {activeTab === 'overview'   && <OverviewTab />}
        {activeTab === 'analytics'  && <AnalyticsTab />}
        {activeTab === 'pins'       && <PinsTab />}
        {activeTab === 'users'      && <UsersTab />}
        {activeTab === 'reports'    && <ReportsTab />}
        {activeTab === 'params'     && <ParametersTab />}
        {activeTab === 'live'       && <LiveTab />}
        {activeTab === 'simulation' && <SimulationTab />}
        {activeTab === 'spaces'     && <SafeSpacesTab />}
      </main>
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-400">Brume v1.0 · © {new Date().getFullYear()} DBEK — 75 rue de Lourmel, 75015 Paris, France · <a href="mailto:brumeapp@pm.me" className="hover:text-gray-600">brumeapp@pm.me</a></p>
      </footer>
    </div>
  );
}
