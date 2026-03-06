'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/stores/useTheme';
import { supabase } from '@/lib/supabase';
import SettingsSection from '../components/SettingsSection';
import SettingsRow from '../components/SettingsRow';
import SettingsToggle from '../components/SettingsToggle';

export interface PreferencesScreenProps {
  onBack: () => void;
}

function getCurrentLocale(): string {
  if (typeof document === 'undefined') return 'fr';
  const match = document.cookie.match(/NEXT_LOCALE=(\w+)/);
  return match?.[1] ?? 'fr';
}

export default function PreferencesScreen({ onBack }: PreferencesScreenProps) {
  const { theme, toggleTheme } = useTheme();
  const darkMode = theme === 'dark';

  const [currentLocale, setCurrentLocale] = useState(getCurrentLocale);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [notifyDm, setNotifyDm] = useState(true);
  const [notifySettingsLoaded, setNotifySettingsLoaded] = useState(false);

  // Load notification settings
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('notification_settings')
        .select('notify_dm')
        .eq('user_id', user.id)
        .single();
      if (data) setNotifyDm(data.notify_dm ?? true);
      setNotifySettingsLoaded(true);
    })();
  }, []);

  const handleToggleDm = async (value: boolean) => {
    setNotifyDm(value);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('notification_settings')
      .upsert({ user_id: user.id, notify_dm: value }, { onConflict: 'user_id' });
  };
  const handleLocaleChange = (locale: string) => {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000`;
    setCurrentLocale(locale);
    setShowLangPicker(false);
    window.location.reload();
  };

  const divider = { height: 1, background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)', margin: '0 20px' } as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '20px 20px 12px',
        }}
      >
        <button
          onClick={onBack}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: darkMode ? '#334155' : '#F1F5F9',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: darkMode ? '#94A3B8' : '#64748B',
            fontSize: 18,
          }}
        >
          ‹
        </button>
        <span style={{ fontSize: 19, fontWeight: 600, color: darkMode ? '#fff' : '#0F172A' }}>
          Préférences
        </span>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Affichage */}
        <SettingsSection label="Affichage">
          <SettingsRow
            icon={darkMode ? 'Moon' : 'Sun'}
            iconColor="#F5C341"
            label="Mode sombre"
            rightEl={<SettingsToggle value={darkMode} onChange={() => toggleTheme()} />}
          />
        </SettingsSection>

        {/* Langue */}
        <SettingsSection label="Langue">
          {showLangPicker ? (
            <div>
              <button
                onClick={() => handleLocaleChange('fr')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '14px 20px',
                  background: currentLocale === 'fr' ? 'rgba(59,180,193,0.1)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: darkMode ? '#fff' : '#0F172A',
                  fontSize: 15,
                  fontWeight: 500,
                }}
              >
                <span>Français</span>
                {currentLocale === 'fr' && <span style={{ color: '#3BB4C1' }}>✓</span>}
              </button>
              <div style={divider} />
              <button
                onClick={() => handleLocaleChange('en')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '14px 20px',
                  background: currentLocale === 'en' ? 'rgba(59,180,193,0.1)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: darkMode ? '#fff' : '#0F172A',
                  fontSize: 15,
                  fontWeight: 500,
                }}
              >
                <span>English</span>
                {currentLocale === 'en' && <span style={{ color: '#3BB4C1' }}>✓</span>}
              </button>
            </div>
          ) : (
            <SettingsRow
              icon="Globe"
              iconColor="#60A5FA"
              label="Langue"
              subtitle={currentLocale === 'fr' ? 'Français' : 'English'}
              onPress={() => setShowLangPicker(true)}
            />
          )}
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection label="Notifications">
          <SettingsRow
            icon="MessageCircle"
            iconColor="#3BB4C1"
            label="Messages directs"
            subtitle="Recevoir une notification push"
            rightEl={
              <SettingsToggle
                value={notifyDm}
                onChange={handleToggleDm}
              />
            }
          />
        </SettingsSection>

      </div>
    </div>
  );
}
