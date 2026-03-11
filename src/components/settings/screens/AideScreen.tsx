'use client';

import { ExternalLink } from 'lucide-react';
import { useIsDark } from '@/hooks/useIsDark';
import SettingsSection from '../components/SettingsSection';
import SettingsRow from '../components/SettingsRow';

export interface AideScreenProps {
  onBack: () => void;
  onNavigateToSupport: () => void;
}

const LINKS = {
  guide: 'https://breveil.app/guide',
  faq: 'https://breveil.app/faq',
  contact: 'mailto:contact@breveil.app',
  methodologie: 'https://breveil.app/methodologie',
  cgu: 'https://breveil.app/cgu',
  privacy: 'https://breveil.app/privacy',
};

function openLink(url: string) {
  window.open(url, '_blank', 'noopener');
}

export default function AideScreen({ onBack, onNavigateToSupport }: AideScreenProps) {
  const isDark = useIsDark();
  const extIcon = <ExternalLink size={16} color={isDark ? '#64748B' : '#94A3B8'} />;
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
        <span style={{ fontSize: 19, fontWeight: 600, color: isDark ? '#fff' : '#0F172A' }}>Aide & support</span>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Ressources */}
        <SettingsSection label="Ressources">
          <SettingsRow
            icon="BookOpen"
            iconColor="#22D3EE"
            label="Guide d'utilisation"
            subtitle="Comment utiliser Breveil"
            rightEl={extIcon}
            onPress={() => openLink(LINKS.guide)}
          />
          <div style={divider} />
          <SettingsRow
            icon="HelpCircle"
            iconColor="#F5C341"
            label="FAQ"
            rightEl={extIcon}
            onPress={() => openLink(LINKS.faq)}
          />
          <div style={divider} />
          <SettingsRow
            icon="MessageCircle"
            iconColor="#A78BFA"
            label="Nous contacter"
            subtitle="Discuter avec l'équipe Breveil"
            onPress={onNavigateToSupport}
          />
        </SettingsSection>

        {/* Transparence */}
        <SettingsSection label="Transparence">
          <SettingsRow
            icon="BarChart2"
            label="Méthodologie & données"
            subtitle="Comment nous calculons les scores"
            rightEl={extIcon}
            onPress={() => openLink(LINKS.methodologie)}
          />
        </SettingsSection>

        {/* Breveil — no card, just rows */}
        <div style={{ padding: '20px 0 0' }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: isDark ? '#64748B' : '#94A3B8',
              padding: '0 20px 8px',
            }}
          >
            Breveil
          </div>
          <SettingsRow
            icon="FileText"
            label="Conditions générales"
            rightEl={extIcon}
            onPress={() => openLink(LINKS.cgu)}
          />
          <div style={divider} />
          <SettingsRow
            icon="Eye"
            label="Politique de confidentialité"
            rightEl={extIcon}
            onPress={() => openLink(LINKS.privacy)}
          />
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: 'center',
            padding: 24,
            fontSize: 13,
            color: isDark ? '#64748B' : '#94A3B8',
          }}
        >
          Fait avec ♥ à Paris
        </div>
      </div>
    </div>
  );
}
