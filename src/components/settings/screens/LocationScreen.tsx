'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useIsDark } from '@/hooks/useIsDark';
import { supabase } from '@/lib/supabase';
import type { NotifChannel } from '@/types';
import SettingsSection from '../components/SettingsSection';
import SettingsRow from '../components/SettingsRow';
import SettingsToggle from '../components/SettingsToggle';
import SegmentedControl from '../components/SegmentedControl';

type LocationMode = 'always' | 'while_using' | 'never';

interface AllSettings {
  // Location
  location_mode: LocationMode;
  share_with_circle: boolean;
  high_accuracy: boolean;
  // Alert radius
  proximity_radius_m: number;
  // SOS
  notify_sos_nearby: boolean;
  sos_notif_channel: NotifChannel;
  // Lifecycle
  notify_new_pins: boolean;
  notify_confirmed_pins: boolean;
  notify_resolved_pins: boolean;
  // Categories
  notify_cat_urgent: boolean;
  notify_cat_warning: boolean;
  notify_cat_infra: boolean;
  // Channel
  pin_notif_channel: NotifChannel;
  // Quiet hours
  quiet_hours_enabled: boolean;
  quiet_start: string;
  quiet_end: string;
  // Follower SOS
  notify_sos_followers: boolean;
  follower_sos_radius_m: number;
}

const DEFAULTS: AllSettings = {
  location_mode: 'while_using',
  share_with_circle: false,
  high_accuracy: true,
  proximity_radius_m: 1000,
  notify_sos_nearby: true,
  sos_notif_channel: 'both',
  notify_new_pins: true,
  notify_confirmed_pins: true,
  notify_resolved_pins: false,
  notify_cat_urgent: true,
  notify_cat_warning: true,
  notify_cat_infra: false,
  pin_notif_channel: 'both',
  quiet_hours_enabled: false,
  quiet_start: '22:00',
  quiet_end: '07:00',
  notify_sos_followers: true,
  follower_sos_radius_m: 5000,
};

const ALL_COLS = Object.keys(DEFAULTS) as (keyof AllSettings)[];

const MODE_OPTIONS: { value: LocationMode; icon: string; label: string; desc: string }[] = [
  { value: 'always', icon: '\uD83C\uDF0D', label: 'Toujours', desc: 'Position mise \u00e0 jour en arri\u00e8re-plan' },
  { value: 'while_using', icon: '\uD83D\uDCCD', label: "En utilisant l'app", desc: "Seulement quand l'app est ouverte" },
  { value: 'never', icon: '\uD83D\uDEAB', label: 'Jamais', desc: 'Aucune position enregistr\u00e9e' },
];

interface Props {
  onBack: () => void;
}

export default function LocationScreen({ onBack }: Props) {
  const isDark = useIsDark();
  const [settings, setSettings] = useState<AllSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const userIdRef = useRef<string | null>(null);

  const txt1 = isDark ? '#FFFFFF' : '#0F172A';
  const txt2 = isDark ? '#94A3B8' : '#64748B';
  const txt3 = isDark ? '#64748B' : '#94A3B8';
  const bg2 = isDark ? '#334155' : '#F1F5F9';
  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.07)';
  const cyan = '#3BB4C1';
  const divider = { height: 1, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)', margin: '0 20px' } as const;

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userIdRef.current = user.id;
      const { data } = await supabase
        .from('notification_settings')
        .select(ALL_COLS.join(', '))
        .eq('user_id', user.id)
        .single();
      if (data) {
        const d = data as unknown as Record<string, unknown>;
        const merged = { ...DEFAULTS } as Record<string, unknown>;
        for (const col of ALL_COLS) {
          if (d[col] != null) merged[col] = d[col];
        }
        setSettings(merged as unknown as AllSettings);
      }
      setLoaded(true);
    })();
  }, []);

  const save = async (patch: Partial<AllSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    if (!userIdRef.current) return;
    await supabase
      .from('notification_settings')
      .upsert({ user_id: userIdRef.current, ...next }, { onConflict: 'user_id' });
  };

  const formatRadius = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;

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
        <span style={{ fontSize: 19, fontWeight: 600, color: txt1 }}>Localisation & alertes</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', opacity: loaded ? 1 : 0.5, pointerEvents: loaded ? 'auto' : 'none', transition: 'opacity 0.3s' }}>

        {/* ═══ LOCATION ═══ */}

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

          {settings.location_mode === 'never' && (
            <div style={{
              margin: '0 16px 14px', padding: '10px 14px', borderRadius: 12,
              background: 'rgba(245,195,65,0.10)', border: '1px solid rgba(245,195,65,0.20)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <AlertTriangle size={16} color="#F5C341" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#F5C341', lineHeight: 1.4 }}>
                Les alertes de proximité ne fonctionneront pas sans localisation
              </span>
            </div>
          )}
        </SettingsSection>

        {/* Cercle */}
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
        <SettingsSection label="Précision">
          <div style={{ padding: '8px 16px 14px', display: 'flex', gap: 8 }}>
            {([
              { value: true, icon: '\uD83C\uDFAF', label: 'Précise', desc: 'GPS haute précision' },
              { value: false, icon: '\uD83D\uDCE1', label: 'Approximative', desc: 'Économie de batterie' },
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

        {/* SOS override banner */}
        <div style={{
          margin: '8px 20px 16px', padding: '12px 14px', borderRadius: 14,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>&#x1F6A8;</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#EF4444' }}>SOS & urgences</div>
            <div style={{ fontSize: 11, color: txt3, marginTop: 2, lineHeight: 1.4 }}>
              En cas de SOS, la localisation précise est toujours activée
            </div>
          </div>
        </div>

        {/* ═══ ALERTS ═══ */}

        {/* Rayon d'alerte */}
        <SettingsSection label="Rayon d'alerte">
          <div style={{ padding: '12px 20px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: txt1 }}>Distance</span>
              <span style={{
                fontSize: 13, fontWeight: 700, color: cyan,
                background: 'rgba(59,180,193,0.10)', padding: '2px 10px', borderRadius: 8,
              }}>
                {formatRadius(settings.proximity_radius_m)}
              </span>
            </div>
            <input
              type="range"
              min={200}
              max={5000}
              step={100}
              value={settings.proximity_radius_m}
              onChange={(e) => save({ proximity_radius_m: Number(e.target.value) })}
              style={{
                width: '100%', height: 6, appearance: 'none',
                borderRadius: 3, outline: 'none', cursor: 'pointer',
                background: `linear-gradient(to right, ${cyan} ${((settings.proximity_radius_m - 200) / 4800) * 100}%, ${isDark ? '#334155' : '#E2E8F0'} 0%)`,
                accentColor: cyan,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontSize: 11, color: txt2 }}>200 m</span>
              <span style={{ fontSize: 11, color: txt2 }}>5 km</span>
            </div>
          </div>
        </SettingsSection>

        {/* Alertes SOS */}
        <SettingsSection label="Alertes SOS">
          <SettingsRow
            icon="AlertTriangle"
            iconColor="#EF4444"
            label="Alertes SOS"
            subtitle="Toujours recommandé"
            rightEl={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#22C55E',
                  background: 'rgba(34,197,94,0.10)', padding: '2px 8px', borderRadius: 6,
                }}>
                  Recommandé
                </span>
                <SettingsToggle
                  value={settings.notify_sos_nearby}
                  onChange={(v) => save({ notify_sos_nearby: v })}
                />
              </div>
            }
          />
          {settings.notify_sos_nearby && (
            <>
              <div style={divider} />
              <div style={{ padding: '10px 20px 14px' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: txt2, marginBottom: 8, display: 'block' }}>
                  Canal de notification
                </span>
                <SegmentedControl
                  value={settings.sos_notif_channel}
                  onChange={(v) => save({ sos_notif_channel: v })}
                  isDark={isDark}
                />
              </div>
            </>
          )}
        </SettingsSection>

        {/* SOS abonnements */}
        <SettingsSection label="SOS abonnements">
          <SettingsRow
            icon="Users"
            iconColor="#8B5CF6"
            label="SOS d'un abonnement"
            subtitle="Quand un utilisateur que vous suivez déclenche un SOS"
            rightEl={
              <SettingsToggle
                value={settings.notify_sos_followers}
                onChange={(v) => save({ notify_sos_followers: v })}
              />
            }
          />
          {settings.notify_sos_followers && (
            <>
              <div style={divider} />
              <div style={{ padding: '12px 20px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: txt1 }}>Rayon abonnements</span>
                  <span style={{
                    fontSize: 13, fontWeight: 700, color: '#8B5CF6',
                    background: 'rgba(139,92,246,0.10)', padding: '2px 10px', borderRadius: 8,
                  }}>
                    {formatRadius(settings.follower_sos_radius_m)}
                  </span>
                </div>
                <input
                  type="range"
                  min={1000}
                  max={10000}
                  step={500}
                  value={settings.follower_sos_radius_m}
                  onChange={(e) => save({ follower_sos_radius_m: Number(e.target.value) })}
                  style={{
                    width: '100%', height: 6, appearance: 'none',
                    borderRadius: 3, outline: 'none', cursor: 'pointer',
                    background: `linear-gradient(to right, #8B5CF6 ${((settings.follower_sos_radius_m - 1000) / 9000) * 100}%, ${isDark ? '#334155' : '#E2E8F0'} 0%)`,
                    accentColor: '#8B5CF6',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: txt2 }}>1 km</span>
                  <span style={{ fontSize: 11, color: txt2 }}>10 km</span>
                </div>
              </div>
            </>
          )}
        </SettingsSection>

        {/* Cycle de vie */}
        <SettingsSection label="Cycle de vie">
          <SettingsRow
            icon="Plus"
            iconColor={cyan}
            label="Nouveau signalement"
            subtitle="Un pin est créé dans votre rayon"
            rightEl={
              <SettingsToggle
                value={settings.notify_new_pins}
                onChange={(v) => save({ notify_new_pins: v })}
              />
            }
          />
          <div style={divider} />
          <SettingsRow
            icon="CheckCircle"
            iconColor="#22C55E"
            label="Pin confirmé"
            subtitle="Confirmé par la communauté (5+)"
            rightEl={
              <SettingsToggle
                value={settings.notify_confirmed_pins}
                onChange={(v) => save({ notify_confirmed_pins: v })}
              />
            }
          />
          <div style={divider} />
          <SettingsRow
            icon="XCircle"
            iconColor="#64748B"
            label="Pin résolu"
            subtitle="L'incident a été résolu"
            rightEl={
              <SettingsToggle
                value={settings.notify_resolved_pins}
                onChange={(v) => save({ notify_resolved_pins: v })}
              />
            }
          />
        </SettingsSection>

        {/* Catégories */}
        <SettingsSection label="Catégories">
          <SettingsRow
            icon="AlertTriangle"
            iconColor="#EF4444"
            label="Urgent"
            subtitle="Agression, vol, harcèlement, filature"
            rightEl={
              <SettingsToggle
                value={settings.notify_cat_urgent}
                onChange={(v) => save({ notify_cat_urgent: v })}
              />
            }
          />
          <div style={divider} />
          <SettingsRow
            icon="Eye"
            iconColor="#F59E0B"
            label="Attention"
            subtitle="Suspect, attroupement, zone à éviter"
            rightEl={
              <SettingsToggle
                value={settings.notify_cat_warning}
                onChange={(v) => save({ notify_cat_warning: v })}
              />
            }
          />
          <div style={divider} />
          <SettingsRow
            icon="Settings"
            iconColor="#64748B"
            label="Infrastructure"
            subtitle="Éclairage, passage, fermeture"
            rightEl={
              <SettingsToggle
                value={settings.notify_cat_infra}
                onChange={(v) => save({ notify_cat_infra: v })}
              />
            }
          />
        </SettingsSection>

        {/* Canal (pins) */}
        <SettingsSection label="Canal (pins)">
          <div style={{ padding: '10px 20px 14px' }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: txt2, marginBottom: 8, display: 'block' }}>
              Comment recevoir les alertes de pins
            </span>
            <SegmentedControl
              value={settings.pin_notif_channel}
              onChange={(v) => save({ pin_notif_channel: v })}
              isDark={isDark}
            />
          </div>
        </SettingsSection>

        {/* Heures calmes */}
        <SettingsSection label="Heures calmes">
          <SettingsRow
            icon="Moon"
            iconColor="#A78BFA"
            label="Activer les heures calmes"
            subtitle="Silencieux pendant la nuit"
            rightEl={
              <SettingsToggle
                value={settings.quiet_hours_enabled}
                onChange={(v) => save({ quiet_hours_enabled: v })}
              />
            }
          />
          {settings.quiet_hours_enabled && (
            <>
              <div style={divider} />
              <div style={{ display: 'flex', gap: 12, padding: '12px 20px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: txt2, marginBottom: 6, display: 'block' }}>
                    Début
                  </label>
                  <input
                    type="time"
                    value={settings.quiet_start}
                    onChange={(e) => save({ quiet_start: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 12,
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0'}`,
                      background: isDark ? '#1E293B' : '#F8FAFC',
                      color: txt1, fontSize: 15, outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: txt2, marginBottom: 6, display: 'block' }}>
                    Fin
                  </label>
                  <input
                    type="time"
                    value={settings.quiet_end}
                    onChange={(e) => save({ quiet_end: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 12,
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0'}`,
                      background: isDark ? '#1E293B' : '#F8FAFC',
                      color: txt1, fontSize: 15, outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>
              <div style={{ padding: '4px 20px 12px' }}>
                <span style={{ fontSize: 12, color: txt2, fontStyle: 'italic' }}>
                  Les alertes SOS ignorent les heures calmes
                </span>
              </div>
            </>
          )}
        </SettingsSection>

        {/* Bottom spacing */}
        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
