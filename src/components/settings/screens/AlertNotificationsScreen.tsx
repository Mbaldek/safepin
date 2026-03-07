'use client';

import { useEffect, useState, useRef } from 'react';
import { useTheme } from '@/stores/useTheme';
import { supabase } from '@/lib/supabase';
import type { NotifChannel } from '@/types';
import SettingsSection from '../components/SettingsSection';
import SettingsRow from '../components/SettingsRow';
import SettingsToggle from '../components/SettingsToggle';
import SegmentedControl from '../components/SegmentedControl';

interface Props {
  onBack: () => void;
}

interface AlertSettings {
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
}

const DEFAULTS: AlertSettings = {
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
};

const ALL_COLS = [
  'proximity_radius_m',
  'notify_sos_nearby', 'sos_notif_channel',
  'notify_new_pins', 'notify_confirmed_pins', 'notify_resolved_pins',
  'notify_cat_urgent', 'notify_cat_warning', 'notify_cat_infra',
  'pin_notif_channel',
  'quiet_hours_enabled', 'quiet_start', 'quiet_end',
] as const;

export default function AlertNotificationsScreen({ onBack }: Props) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const [settings, setSettings] = useState<AlertSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const userIdRef = useRef<string | null>(null);

  const txt1 = isDark ? '#FFFFFF' : '#0F172A';
  const txt2 = isDark ? '#94A3B8' : '#64748B';
  const bg2 = isDark ? '#334155' : '#F1F5F9';
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
        setSettings(merged as unknown as AlertSettings);
      }
      setLoaded(true);
    })();
  }, []);

  const save = async (patch: Partial<AlertSettings>) => {
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
            cursor: 'pointer', color: txt2, fontSize: 18,
          }}
        >
          &#8249;
        </button>
        <span style={{ fontSize: 19, fontWeight: 600, color: txt1 }}>
          Notifications d&apos;alerte
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', opacity: loaded ? 1 : 0.5, transition: 'opacity 0.3s' }}>

        {/* ── Section 1: Rayon d'alerte ── */}
        <SettingsSection label="Rayon d'alerte">
          <div style={{ padding: '12px 20px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: txt1 }}>Distance</span>
              <span style={{
                fontSize: 13, fontWeight: 700, color: '#3BB4C1',
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
                background: `linear-gradient(to right, #3BB4C1 ${((settings.proximity_radius_m - 200) / 4800) * 100}%, ${isDark ? '#334155' : '#E2E8F0'} 0%)`,
                accentColor: '#3BB4C1',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontSize: 11, color: txt2 }}>200 m</span>
              <span style={{ fontSize: 11, color: txt2 }}>5 km</span>
            </div>
          </div>
        </SettingsSection>

        {/* ── Section 2: Alertes SOS ── */}
        <SettingsSection label="Alertes SOS">
          <SettingsRow
            icon="AlertTriangle"
            iconColor="#EF4444"
            label="Alertes SOS"
            subtitle="Toujours recommande"
            rightEl={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#22C55E',
                  background: 'rgba(34,197,94,0.10)', padding: '2px 8px', borderRadius: 6,
                }}>
                  Recommande
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

        {/* ── Section 3: Cycle de vie des pins ── */}
        <SettingsSection label="Cycle de vie">
          <SettingsRow
            icon="Plus"
            iconColor="#3BB4C1"
            label="Nouveau signalement"
            subtitle="Un pin est cree dans votre rayon"
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
            label="Pin confirme"
            subtitle="Confirme par la communaute (5+)"
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
            label="Pin resolu"
            subtitle="L'incident a ete resolu"
            rightEl={
              <SettingsToggle
                value={settings.notify_resolved_pins}
                onChange={(v) => save({ notify_resolved_pins: v })}
              />
            }
          />
        </SettingsSection>

        {/* ── Section 4: Categories ── */}
        <SettingsSection label="Categories">
          <SettingsRow
            icon="AlertTriangle"
            iconColor="#EF4444"
            label="Urgent"
            subtitle="Agression, vol, harcelement, filature"
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
            subtitle="Suspect, attroupement, zone a eviter"
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
            subtitle="Eclairage, passage, fermeture"
            rightEl={
              <SettingsToggle
                value={settings.notify_cat_infra}
                onChange={(v) => save({ notify_cat_infra: v })}
              />
            }
          />
        </SettingsSection>

        {/* ── Section 5: Canal de notification (pins) ── */}
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

        {/* ── Section 6: Heures calmes ── */}
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
                    Debut
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
