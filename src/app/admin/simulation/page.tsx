'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAdminTheme } from '@/components/admin/AdminThemeContext';
import StatCard from '@/components/admin/StatCard';
import PanelShell from '@/components/admin/PanelShell';
import { supabase } from '@/lib/supabase';

// ── G3: Hard caps (match API) ──
const CAPS = {
  users:       { min: 1, max: 200,  default: 50  },
  pins:        { min: 1, max: 1000, default: 100 },
  communities: { min: 1, max: 5,    default: 3   },
  contacts:    { min: 1, max: 4,    default: 2   },
  safeSpaces:  { min: 1, max: 100,  default: 30  },
};

// ── G4: Auto-tick limits ──
const TICK_MAX_COUNT = 100;

type Stats = {
  users: number;
  pins: number;
  communities: number;
  trips: number;
  contacts: number;
  walkSessions: number;
};

export default function SimulationPage() {
  const { theme } = useAdminTheme();

  // Stats
  const [stats, setStats] = useState<Stats>({ users: 0, pins: 0, communities: 0, trips: 0, contacts: 0, walkSessions: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  // Seed form
  const [seedForm, setSeedForm] = useState({
    userCount: CAPS.users.default,
    pinCount: CAPS.pins.default,
    communityCount: CAPS.communities.default,
    contactsPerUser: CAPS.contacts.default,
    seedSafeSpaces: false,
    safeSpaceCount: CAPS.safeSpaces.default,
  });
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  // Tick
  const [tickLog, setTickLog] = useState<string[]>([]);
  const [ticking, setTicking] = useState(false);
  const [autoTick, setAutoTick] = useState(false);
  const [tickInterval, setTickInterval] = useState(10);
  const [tickCount, setTickCount] = useState(0);
  const autoTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickCountRef = useRef(0);

  // Cleanup
  const [cleaning, setCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');

  // ── Fetch stats ──
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);

    // First get sim user ids
    const { data: simIds } = await supabase.from('profiles').select('id').eq('is_simulated', true).limit(200);
    const ids = (simIds ?? []).map(p => p.id);

    const [users, pins, trips] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_simulated', true),
      supabase.from('pins').select('*', { count: 'exact', head: true }).eq('is_simulated', true),
      supabase.from('trip_log').select('*', { count: 'exact', head: true }).eq('is_simulated', true),
    ]);

    let commCount = 0, contactCount = 0, walkCount = 0;
    if (ids.length > 0) {
      const [comm, cont, walks] = await Promise.all([
        supabase.from('communities').select('*', { count: 'exact', head: true }).in('owner_id', ids),
        supabase.from('trusted_contacts').select('*', { count: 'exact', head: true }).in('user_id', ids),
        supabase.from('walk_sessions').select('*', { count: 'exact', head: true }).in('creator_id', ids),
      ]);
      commCount = comm.count ?? 0;
      contactCount = cont.count ?? 0;
      walkCount = walks.count ?? 0;
    }

    setStats({
      users: users.count ?? 0,
      pins: pins.count ?? 0,
      communities: commCount,
      trips: trips.count ?? 0,
      contacts: contactCount,
      walkSessions: walkCount,
    });
    setLoadingStats(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ── Seed ──
  const handleSeed = async () => {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch('/api/simulation/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seedForm),
      });
      const data = await res.json();
      if (res.ok) {
        setSeedResult(`${data.users_created} users, ${data.pins_created} pins, ${data.communities_created} communautés, ${data.contacts_created} contacts, ${data.safe_spaces_created} safe spaces`);
        fetchStats();
      } else {
        setSeedResult(`Erreur: ${data.error}`);
      }
    } catch {
      setSeedResult('Erreur réseau');
    }
    setSeeding(false);
  };

  // ── Tick ──
  const runTick = useCallback(async () => {
    setTicking(true);
    try {
      const res = await fetch('/api/simulation/tick', { method: 'POST' });
      const data = await res.json();
      if (data.actions) {
        setTickLog(prev => [...data.actions, ...prev].slice(0, 50));
      }
      fetchStats();
    } catch { /* ignore */ }
    setTicking(false);
  }, [fetchStats]);

  // ── G4: Auto-tick with max count ──
  useEffect(() => {
    if (autoTickRef.current) clearInterval(autoTickRef.current);
    if (!autoTick) return;

    const intervalMs = Math.max(tickInterval * 1000, 10_000);
    autoTickRef.current = setInterval(() => {
      tickCountRef.current += 1;
      setTickCount(tickCountRef.current);
      if (tickCountRef.current >= TICK_MAX_COUNT) {
        setAutoTick(false);
        return;
      }
      runTick();
    }, intervalMs);

    return () => {
      if (autoTickRef.current) clearInterval(autoTickRef.current);
    };
  }, [autoTick, tickInterval, runTick]);

  // ── Cleanup ──
  const handleCleanup = async () => {
    if (confirmText !== 'PURGER') return;
    setCleaning(true);
    setCleanupResult(null);
    try {
      const res = await fetch('/api/simulation/cleanup', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        const parts = Object.entries(data as Record<string, number>).map(([k, v]) => `${k}: ${v}`).join(', ');
        setCleanupResult(`Supprimé — ${parts}`);
        setTickCount(0);
        tickCountRef.current = 0;
        setTickLog([]);
        fetchStats();
      } else {
        setCleanupResult(`Erreur: ${data.error}`);
      }
    } catch {
      setCleanupResult('Erreur réseau');
    }
    setCleaning(false);
    setConfirmText('');
  };

  // ── G7: Warning thresholds ──
  const showWarning = stats.users > 150 || stats.pins > 800;

  // ── Styles ──
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8,
    border: `1px solid ${theme.border}`, background: theme.elevated,
    color: theme.t1, fontSize: 12, fontFamily: 'inherit',
    boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, color: theme.t2, marginBottom: 4, display: 'block',
  };
  const btnStyle = (bg: string, disabled?: boolean): React.CSSProperties => ({
    padding: '10px 20px', borderRadius: 10, border: 'none',
    background: disabled ? theme.elevated : bg,
    color: disabled ? theme.t3 : 'white',
    fontSize: 12, fontWeight: 600, cursor: disabled ? 'default' : 'pointer',
    fontFamily: 'inherit', transition: 'opacity 0.15s',
    opacity: disabled ? 0.5 : 1,
  });

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100 }}>
      {/* Title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: theme.t1, margin: 0 }}>
          Simulation Engine
        </h1>
        <p style={{ fontSize: 12, color: theme.t3, margin: '4px 0 0' }}>
          Moteur de simulation cycle de vie complet — dev only
        </p>
      </div>

      {/* G7: Warning banner */}
      {showWarning && (
        <div style={{
          padding: '10px 16px', borderRadius: 10, marginBottom: 16,
          background: theme.warningSoft, border: `1px solid ${theme.warning}`,
          color: theme.warning, fontSize: 11, fontWeight: 600,
        }}>
          Attention : {stats.users} users sim, {stats.pins} pins sim — consommation DB élevée
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="Users sim" icon="👥" value={loadingStats ? '…' : stats.users} />
        <StatCard label="Pins sim" icon="📍" value={loadingStats ? '…' : stats.pins} />
        <StatCard label="Communautés" icon="🗣️" value={loadingStats ? '…' : stats.communities} />
        <StatCard label="Trajets" icon="🚶" value={loadingStats ? '…' : stats.trips} />
        <StatCard label="Contacts" icon="🤝" value={loadingStats ? '…' : stats.contacts} />
        <StatCard label="Marches" icon="🚶‍♀️" value={loadingStats ? '…' : stats.walkSessions} />
      </div>

      {/* Controls grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Seed panel */}
        <PanelShell title="Seed" dotColor={theme.cyan}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={labelStyle}>Users (max {CAPS.users.max})</label>
                <input type="number" style={inputStyle} value={seedForm.userCount}
                  min={CAPS.users.min} max={CAPS.users.max}
                  onChange={e => setSeedForm(f => ({ ...f, userCount: +e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Pins (max {CAPS.pins.max})</label>
                <input type="number" style={inputStyle} value={seedForm.pinCount}
                  min={CAPS.pins.min} max={CAPS.pins.max}
                  onChange={e => setSeedForm(f => ({ ...f, pinCount: +e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Communautés (max {CAPS.communities.max})</label>
                <input type="number" style={inputStyle} value={seedForm.communityCount}
                  min={CAPS.communities.min} max={CAPS.communities.max}
                  onChange={e => setSeedForm(f => ({ ...f, communityCount: +e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Contacts/user (max {CAPS.contacts.max})</label>
                <input type="number" style={inputStyle} value={seedForm.contactsPerUser}
                  min={CAPS.contacts.min} max={CAPS.contacts.max}
                  onChange={e => setSeedForm(f => ({ ...f, contactsPerUser: +e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={seedForm.seedSafeSpaces}
                onChange={e => setSeedForm(f => ({ ...f, seedSafeSpaces: e.target.checked }))} />
              <span style={{ fontSize: 11, color: theme.t2 }}>Safe spaces</span>
              {seedForm.seedSafeSpaces && (
                <input type="number" style={{ ...inputStyle, width: 60 }} value={seedForm.safeSpaceCount}
                  min={CAPS.safeSpaces.min} max={CAPS.safeSpaces.max}
                  onChange={e => setSeedForm(f => ({ ...f, safeSpaceCount: +e.target.value }))} />
              )}
            </div>
            <button onClick={handleSeed} disabled={seeding} style={btnStyle(theme.cyan, seeding)}>
              {seeding ? 'Seeding…' : 'Lancer le seed'}
            </button>
            {seedResult && (
              <div style={{ fontSize: 10, color: seedResult.startsWith('Erreur') ? theme.danger : theme.success, lineHeight: 1.4 }}>{seedResult}</div>
            )}
          </div>
        </PanelShell>

        {/* Tick panel */}
        <PanelShell title="Tick Engine" dotColor={autoTick ? theme.success : theme.t3}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setTickCount(c => c + 1); tickCountRef.current += 1; runTick(); }} disabled={ticking} style={btnStyle(theme.cyan, ticking)}>
                {ticking ? '…' : '1 Tick'}
              </button>
              <button
                onClick={() => setAutoTick(!autoTick)}
                style={btnStyle(autoTick ? theme.danger : theme.success)}
              >
                {autoTick ? 'Stop auto' : 'Auto-tick'}
              </button>
            </div>
            {/* G4: Interval selector + budget */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 10, color: theme.t3 }}>Intervalle :</label>
              {[10, 20, 30].map(s => (
                <button key={s} onClick={() => setTickInterval(s)}
                  style={{
                    padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                    border: `1px solid ${tickInterval === s ? theme.cyan : theme.border}`,
                    background: tickInterval === s ? theme.cyanSoft : 'transparent',
                    color: tickInterval === s ? theme.cyan : theme.t3,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  {s}s
                </button>
              ))}
            </div>
            <div style={{ fontSize: 10, color: tickCount > 80 ? theme.warning : theme.t3 }}>
              {tickCount}/{TICK_MAX_COUNT} ticks utilisés
              {tickCount >= TICK_MAX_COUNT && ' — limite atteinte'}
            </div>
            {/* Action feed */}
            <div style={{
              maxHeight: 180, overflowY: 'auto', borderRadius: 8,
              background: theme.elevated, border: `1px solid ${theme.border}`,
              padding: tickLog.length ? '8px 10px' : '0',
            }}>
              {tickLog.length === 0 && (
                <div style={{ padding: '16px 10px', textAlign: 'center', fontSize: 10, color: theme.t3 }}>
                  Aucune action. Lancez un tick.
                </div>
              )}
              {tickLog.map((action, i) => (
                <div key={i} style={{ fontSize: 10, color: theme.t2, padding: '2px 0', borderBottom: i < tickLog.length - 1 ? `1px solid ${theme.border}` : 'none' }}>
                  {action}
                </div>
              ))}
            </div>
          </div>
        </PanelShell>

        {/* Cleanup panel */}
        <PanelShell title="Cleanup" dotColor={theme.danger}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 11, color: theme.t3, margin: 0, lineHeight: 1.5 }}>
              Supprime toutes les données simulées : users, pins, communautés, trajets, contacts, marches.
              Irréversible.
            </p>
            <div>
              <label style={labelStyle}>Tapez PURGER pour confirmer</label>
              <input type="text" style={inputStyle} value={confirmText} placeholder="PURGER"
                onChange={e => setConfirmText(e.target.value)} />
            </div>
            <button
              onClick={handleCleanup}
              disabled={cleaning || confirmText !== 'PURGER'}
              style={btnStyle(theme.danger, cleaning || confirmText !== 'PURGER')}
            >
              {cleaning ? 'Suppression…' : 'Purger les données simulées'}
            </button>
            {cleanupResult && (
              <div style={{ fontSize: 10, color: theme.t2, lineHeight: 1.5, wordBreak: 'break-all' }}>{cleanupResult}</div>
            )}
          </div>
        </PanelShell>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 12 }}>
        <a
          href="/map?sim=1"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '8px 16px', borderRadius: 8,
            background: theme.cyanSoft, border: `1px solid ${theme.cyanBorder}`,
            color: theme.cyan, fontSize: 11, fontWeight: 600,
            textDecoration: 'none', transition: 'opacity 0.15s',
          }}
        >
          Voir sur la carte
        </a>
        <button onClick={() => { setTickCount(0); tickCountRef.current = 0; setTickLog([]); }}
          style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 11, fontWeight: 600,
            background: theme.elevated, border: `1px solid ${theme.border}`,
            color: theme.t2, cursor: 'pointer', fontFamily: 'inherit',
          }}>
          Reset compteur ticks
        </button>
      </div>
    </div>
  );
}
