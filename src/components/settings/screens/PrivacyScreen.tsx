'use client';

import { useState } from 'react';
import { useTheme } from '@/stores/useTheme';
import { toast } from 'sonner';
import SettingsSection from '../components/SettingsSection';
import SettingsRow from '../components/SettingsRow';

interface Props {
  onBack: () => void;
  onNavigate: (screen: string) => void;
}

export default function PrivacyScreen({ onBack, onNavigate }: Props) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const [exporting, setExporting] = useState(false);

  const txt1 = isDark ? '#FFFFFF' : '#0F172A';
  const txt2 = isDark ? '#94A3B8' : '#64748B';
  const bg2 = isDark ? '#334155' : '#F1F5F9';
  const divider = { height: 1, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)', margin: '0 20px' } as const;

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/export-data');
      if (!res.ok) {
        toast.error('Erreur lors de l\'export');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `breveil-data-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Donnees exportees');
    } catch {
      toast.error('Erreur reseau');
    } finally {
      setExporting(false);
    }
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
            cursor: 'pointer', color: txt2, fontSize: 18,
          }}
        >
          &#8249;
        </button>
        <span style={{ fontSize: 19, fontWeight: 600, color: txt1 }}>
          Confidentialite &amp; RGPD
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Documents legaux */}
        <SettingsSection label="Documents legaux">
          <SettingsRow
            icon="FileText"
            iconColor="#3BB4C1"
            label="Politique de confidentialite"
            subtitle="Collecte, utilisation, droits"
            onPress={() => window.open('/privacy', '_blank')}
          />
          <div style={divider} />
          <SettingsRow
            icon="ScrollText"
            iconColor="#A78BFA"
            label="Conditions d'utilisation"
            subtitle="Regles du service"
            onPress={() => window.open('/terms', '_blank')}
          />
          <div style={divider} />
          <SettingsRow
            icon="Cookie"
            iconColor="#F59E0B"
            label="Politique cookies"
            subtitle="Cookies essentiels uniquement"
            onPress={() => window.open('/cookies', '_blank')}
          />
        </SettingsSection>

        {/* Vos donnees */}
        <SettingsSection label="Vos donnees">
          <SettingsRow
            icon="Download"
            iconColor="#22C55E"
            label={exporting ? 'Export en cours...' : 'Exporter mes donnees'}
            subtitle="Telecharger toutes vos donnees (JSON)"
            onPress={exporting ? undefined : handleExport}
          />
          <div style={divider} />
          <SettingsRow
            icon="Trash2"
            iconColor="#EF4444"
            label="Supprimer mon compte"
            subtitle="Toutes vos donnees seront effacees"
            onPress={() => onNavigate('delete-account-privacy')}
          />
        </SettingsSection>

        {/* Footer */}
        <div style={{ padding: '24px 20px 40px', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: txt2, margin: '0 0 4px', lineHeight: 1.5 }}>
            DBEK &middot; 75 rue de Lourmel, 75015 Paris
          </p>
          <p style={{ fontSize: 12, color: txt2, margin: '0 0 4px' }}>
            brumeapp@pm.me
          </p>
          <p style={{ fontSize: 11, color: isDark ? '#475569' : '#94A3B8', margin: 0 }}>
            Autorite de controle : CNIL (France)
          </p>
        </div>
      </div>
    </div>
  );
}
