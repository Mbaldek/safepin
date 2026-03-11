'use client';

import { useIsDark } from '@/hooks/useIsDark';
import SettingsSection from '../components/SettingsSection';
import SettingsRow from '../components/SettingsRow';

export interface SecuriteScreenProps {
  onBack: () => void;
  onClose: () => void;
  onNavigate: (screen: string) => void;
}

export default function SecuriteScreen({ onBack, onClose, onNavigate }: SecuriteScreenProps) {
  const isDark = useIsDark();

  const divider = { height: 1, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)', margin: '0 20px' } as const;

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
            background: isDark ? '#334155' : '#F1F5F9',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: isDark ? '#94A3B8' : '#64748B',
            fontSize: 18,
          }}
        >
          ‹
        </button>
        <span style={{ fontSize: 19, fontWeight: 600, color: isDark ? '#fff' : '#0F172A' }}>
          Sécurité & confidentialité
        </span>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Alertes & localisation */}
        <SettingsSection label="Alertes & localisation">
          <SettingsRow
            icon="MapPin"
            iconColor="#22D3EE"
            label="Localisation & alertes"
            subtitle="Mode, rayon, notifications, heures calmes"
            onPress={() => onNavigate('location')}
          />
        </SettingsSection>

        {/* Données */}
        <SettingsSection label="Données">
          <SettingsRow
            icon="Lock"
            label="Confidentialité & RGPD"
            subtitle="Analytics, export"
            onPress={() => onNavigate('privacy-rgpd')}
          />
          <div style={divider} />
          <SettingsRow
            icon="Settings"
            label="Sessions & sécurité"
            subtitle="2FA, appareils connectés"
            onPress={() => onNavigate('sessions-security')}
          />
        </SettingsSection>

        <div style={{ height: 32 }} />
      </div>
    </div>
  );
}
