'use client';

import { useEffect, useState, useRef } from 'react';
import { useTheme } from '@/stores/useTheme';
import { supabase } from '@/lib/supabase';
import SettingsSection from '../components/SettingsSection';
import SettingsRow from '../components/SettingsRow';
import SettingsToggle from '../components/SettingsToggle';

interface Props {
  onBack: () => void;
}

interface AlertSettings {
  proximity_radius_m: number;
  notify_nearby_pins: boolean;
  notify_sos_nearby: boolean;
  quiet_hours_enabled: boolean;
  quiet_start: string;
  quiet_end: string;
}

const DEFAULTS: AlertSettings = {
  proximity_radius_m: 1000,
  notify_nearby_pins: true,
  notify_sos_nearby: true,
  quiet_hours_enabled: false,
  quiet_start: '22:00',
  quiet_end: '07:00',
};

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
        .select('proximity_radius_m, notify_nearby_pins, notify_sos_nearby, quiet_hours_enabled, quiet_start, quiet_end')
        .eq('user_id', user.id)
        .single();
      if (data) {
        setSettings({
          proximity_radius_m: data.proximity_radius_m ?? DEFAULTS.proximity_radius_m,
          notify_nearby_pins: data.notify_nearby_pins ?? DEFAULTS.notify_nearby_pins,
          notify_sos_nearby: data.notify_sos_nearby ?? DEFAULTS.notify_sos_nearby,
          quiet_hours_enabled: data.quiet_hours_enabled ?? DEFAULTS.quiet_hours_enabled,
          quiet_start: data.quiet_start ?? DEFAULTS.quiet_start,
          quiet_end: data.quiet_end ?? DEFAULTS.quiet_end,
        });
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
      .upsert({
        user_id: userIdRef.current,
        proximity_radius_m: next.proximity_radius_m,
        notify_nearby_pins: next.notify_nearby_pins,
        notify_sos_nearby: next.notify_sos_nearby,
        quiet_hours_enabled: next.quiet_hours_enabled,
        quiet_start: next.quiet_start,
        quiet_end: next.quiet_end,
      }, { onConflict: 'user_id' });
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
        {/* Rayon d'alerte */}
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

        {/* Types d'alertes */}
        <SettingsSection label="Types d'alertes">
          <SettingsRow
            icon="MapPin"
            iconColor="#3BB4C1"
            label="Pins a proximite"
            subtitle="Signalements dans votre rayon"
            rightEl={
              <SettingsToggle
                value={settings.notify_nearby_pins}
                onChange={(v) => save({ notify_nearby_pins: v })}
              />
            }
          />
          <div style={divider} />
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
      </div>
    </div>
  );
}
