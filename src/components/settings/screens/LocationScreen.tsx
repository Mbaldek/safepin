'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useTheme } from '@/stores/useTheme';
import { supabase } from '@/lib/supabase';
import SettingsSection from '../components/SettingsSection';
import SettingsToggle from '../components/SettingsToggle';

type LocationMode = 'always' | 'while_using' | 'never';

interface LocationSettings {
  location_mode: LocationMode;
  share_with_circle: boolean;
  high_accuracy: boolean;
}

const DEFAULTS: LocationSettings = {
  location_mode: 'while_using',
  share_with_circle: false,
  high_accuracy: true,
};

const MODE_OPTIONS: { value: LocationMode; icon: string; label: string; desc: string }[] = [
  { value: 'always', icon: '\uD83C\uDF0D', label: 'Toujours', desc: 'Position mise \u00e0 jour en arri\u00e8re-plan' },
  { value: 'while_using', icon: '\uD83D\uDCCD', label: "En utilisant l'app", desc: "Seulement quand l'app est ouverte" },
  { value: 'never', icon: '\uD83D\uDEAB', label: 'Jamais', desc: 'Aucune position enregistr\u00e9e' },
];

interface Props {
  onBack: () => void;
}

export default function LocationScreen({ onBack }: Props) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const [settings, setSettings] = useState<LocationSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const userIdRef = useRef<string | null>(null);

  const txt1 = isDark ? '#FFFFFF' : '#0F172A';
  const txt2 = isDark ? '#94A3B8' : '#64748B';
  const txt3 = isDark ? '#64748B' : '#94A3B8';
  const bg2 = isDark ? '#334155' : '#F1F5F9';
  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.07)';
  const cyan = '#3BB4C1';

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userIdRef.current = user.id;
      const { data } = await supabase
        .from('notification_settings')
        .select('location_mode, share_with_circle, high_accuracy')
        .eq('user_id', user.id)
        .single();
      if (data) {
        setSettings({
          location_mode: (data.location_mode as LocationMode) ?? DEFAULTS.location_mode,
          share_with_circle: data.share_with_circle ?? DEFAULTS.share_with_circle,
          high_accuracy: data.high_accuracy ?? DEFAULTS.high_accuracy,
        });
      }
      setLoaded(true);
    })();
  }, []);

  const save = async (patch: Partial<LocationSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    if (!userIdRef.current) return;
    await supabase
      .from('notification_settings')
      .upsert({
        user_id: userIdRef.current,
        location_mode: next.location_mode,
        share_with_circle: next.share_with_circle,
        high_accuracy: next.high_accuracy,
      }, { onConflict: 'user_id' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 12px' }}>
        <button
          onClick={onBack}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: bg2, border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={18} color={txt2} />
        </button>
        <span style={{ fontSize: 19, fontWeight: 600, color: txt1 }}>Localisation</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', opacity: loaded ? 1 : 0.5, transition: 'opacity 0.3s' }}>
        {/* Mode de localisation */}
        <SettingsSection label="Mode de localisation">
          <div style={{ padding: '8px 16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MODE_OPTIONS.map((opt) => {
              const active = settings.location_mode === opt.value;
              return (
                <motion.button
                  key={opt.value}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => save({ location_mode: opt.value })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 14,
                    background: active ? `${cyan}12` : cardBg,
                    border: `1.5px solid ${active ? cyan : border}`,
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{opt.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: active ? cyan : txt1 }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: 11, color: txt3, marginTop: 2 }}>
                      {opt.desc}
                    </div>
                  </div>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    border: `2px solid ${active ? cyan : (isDark ? '#475569' : '#CBD5E1')}`,
                    background: active ? cyan : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFFFFF' }} />}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Warning if "never" */}
          {settings.location_mode === 'never' && (
            <div style={{
              margin: '0 16px 14px', padding: '10px 14px', borderRadius: 12,
              background: 'rgba(245,195,65,0.10)', border: '1px solid rgba(245,195,65,0.20)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <AlertTriangle size={16} color="#F5C341" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#F5C341', lineHeight: 1.4 }}>
                Les alertes de proximit&eacute; ne fonctionneront pas sans localisation
              </span>
            </div>
          )}
        </SettingsSection>

        {/* Partage avec le cercle */}
        <SettingsSection label="Cercle de confiance">
          <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: txt1 }}>
                Partager ma position avec mon cercle
              </div>
              <div style={{ fontSize: 11, color: txt3, marginTop: 2 }}>
                Vos contacts de confiance verront votre position
              </div>
            </div>
            <SettingsToggle
              value={settings.share_with_circle}
              onChange={(v) => save({ share_with_circle: v })}
            />
          </div>
        </SettingsSection>

        {/* Précision */}
        <SettingsSection label="Pr&eacute;cision">
          <div style={{ padding: '8px 16px 14px', display: 'flex', gap: 8 }}>
            {([
              { value: true, icon: '\uD83C\uDFAF', label: 'Pr\u00e9cise', desc: 'GPS haute pr\u00e9cision' },
              { value: false, icon: '\uD83D\uDCE1', label: 'Approximative', desc: '\u00c9conomie de batterie' },
            ] as const).map((opt) => {
              const active = settings.high_accuracy === opt.value;
              return (
                <motion.button
                  key={String(opt.value)}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => save({ high_accuracy: opt.value })}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 6, padding: '14px 8px', borderRadius: 14,
                    background: active ? `${cyan}12` : cardBg,
                    border: `1.5px solid ${active ? cyan : border}`,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 22 }}>{opt.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: active ? cyan : txt1 }}>{opt.label}</span>
                  <span style={{ fontSize: 10, color: txt3 }}>{opt.desc}</span>
                </motion.button>
              );
            })}
          </div>
        </SettingsSection>

        {/* SOS safety override banner */}
        <div style={{
          margin: '8px 20px 24px', padding: '12px 14px', borderRadius: 14,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>&#x1F6A8;</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#EF4444' }}>
              SOS &amp; urgences
            </div>
            <div style={{ fontSize: 11, color: txt3, marginTop: 2, lineHeight: 1.4 }}>
              En cas de SOS, la localisation pr&eacute;cise est toujours activ&eacute;e pour votre s&eacute;curit&eacute;
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
