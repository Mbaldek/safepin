'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAdminTheme } from '@/components/admin/AdminThemeContext';
import { timeAgo } from '@/lib/utils';

/* ─── Types ─── */

type ParamRow = {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
};

/* ─── Param Card ─── */

function ParamCard({
  param,
  onSave,
}: {
  param: ParamRow;
  onSave: (key: string, value: string) => Promise<void>;
}) {
  const { theme } = useAdminTheme();
  const [value, setValue] = useState(param.value);
  const [saving, setSaving] = useState(false);
  const changed = value !== param.value;

  async function handleSave() {
    setSaving(true);
    await onSave(param.key, value);
    setSaving(false);
  }

  // Detect type for input
  const isBoolean = param.value === 'true' || param.value === 'false';
  const isNumber = !isBoolean && !isNaN(Number(param.value)) && param.value.trim() !== '';

  return (
    <div
      style={{
        background: theme.card,
        border: `1px solid ${changed ? 'rgba(59,180,193,0.3)' : theme.border}`,
        borderRadius: 16,
        padding: 18,
        boxShadow: changed ? '0 0 12px rgba(59,180,193,0.1)' : theme.panelShadow,
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: theme.t1, fontFamily: 'var(--font-mono)' }}>
            {param.key}
          </div>
          {param.description && (
            <div style={{ fontSize: 11, color: theme.t3, marginTop: 3 }}>{param.description}</div>
          )}
        </div>
        <span style={{ fontSize: 10, color: theme.t3, whiteSpace: 'nowrap' }}>
          {timeAgo(param.updated_at)}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {isBoolean ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setValue(value === 'true' ? 'false' : 'true')}
            style={{
              flex: 1,
              padding: '8px 14px',
              borderRadius: 10,
              border: `1px solid ${value === 'true' ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'}`,
              background: value === 'true' ? 'var(--semantic-success-soft)' : 'var(--semantic-danger-soft)',
              color: value === 'true' ? 'var(--semantic-success)' : 'var(--semantic-danger)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {value === 'true' ? 'Activé' : 'Désactivé'}
          </motion.button>
        ) : (
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            type={isNumber ? 'number' : 'text'}
            style={{
              flex: 1,
              padding: '8px 14px',
              borderRadius: 10,
              border: `1px solid ${theme.borderMd}`,
              background: theme.elevated,
              color: theme.t1,
              fontSize: 13,
              fontFamily: isNumber ? "'DM Serif Display', serif" : 'var(--font-sans)',
              fontWeight: isNumber ? 400 : 500,
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#3BB4C1'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = ''; }}
          />
        )}

        {changed && (
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 18px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--gradient-start)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              opacity: saving ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {saving ? '...' : 'Sauver'}
          </motion.button>
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ─── */

export default function ParamsPage() {
  const { theme } = useAdminTheme();
  const [params, setParams] = useState<ParamRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadParams = useCallback(() => {
    setLoading(true);
    supabase
      .from('admin_params')
      .select('key, value, description, updated_at')
      .order('key')
      .then(({ data }) => {
        if (data) setParams(data as ParamRow[]);
        setLoading(false);
      });
  }, []);

  useEffect(() => { loadParams(); }, [loadParams]);

  async function saveParam(key: string, value: string) {
    const { error } = await supabase
      .from('admin_params')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', key);

    if (error) {
      alert(`Erreur: ${error.message}`);
      return;
    }
    loadParams();
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.t1, margin: 0 }}>Paramètres système</h1>
        <p style={{ fontSize: 12, color: theme.t3, margin: '4px 0 0' }}>
          Configuration globale de l&apos;application. Les changements sont immédiats.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: theme.t3, fontSize: 13 }}>
          Chargement...
        </div>
      ) : params.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: theme.t3, fontSize: 13 }}>
          Aucun paramètre configuré
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
          {params.map((p) => (
            <ParamCard key={p.key} param={p} onSave={saveParam} />
          ))}
        </div>
      )}
    </div>
  );
}
