'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/stores/useTheme';
import { useStore } from '@/stores/useStore';
import SettingsSection from '../components/SettingsSection';
import SettingsRow from '../components/SettingsRow';

export interface SecuriteScreenProps {
  onBack: () => void;
  onClose: () => void;
  onNavigate: (screen: string) => void;
}

export default function SecuriteScreen({ onBack, onClose, onNavigate }: SecuriteScreenProps) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const verified = useStore((s) => s.userProfile?.verified);
  const [circleCount, setCircleCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count } = await supabase
        .from('trusted_contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setCircleCount(count ?? 0);
    })();
  }, []);

  const comingSoon = () => toast('Bientôt disponible');
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
        {/* Cercle de confiance */}
        <SettingsSection label="Cercle de confiance">
          <SettingsRow
            icon="Users"
            iconColor="#A78BFA"
            label="Mon cercle"
            subtitle={
              circleCount === null
                ? 'Chargement…'
                : `${circleCount} contact${circleCount !== 1 ? 's' : ''} de confiance`
            }
            onPress={() => {
              useStore.getState().setCommunityDefaultTab(1);
              useStore.getState().setActiveTab('community');
              onClose();
            }}
          />
          <div style={divider} />
          <SettingsRow
            icon="ShieldCheck"
            iconColor="#34D399"
            label="Badge de vérification"
            subtitle={verified ? "Compte vérifié ✓" : "Vérifier votre identité"}
            onPress={() => onNavigate('verification')}
          />
        </SettingsSection>

        {/* Alertes */}
        <SettingsSection label="Alertes">
          <SettingsRow
            icon="Bell"
            iconColor="#F87171"
            label="Notifications d'alerte"
            subtitle="Rayon, heures calmes"
            onPress={() => onNavigate('alert-notifications')}
          />
          <div style={divider} />
          <SettingsRow
            icon="Eye"
            iconColor="#22D3EE"
            label="Localisation"
            subtitle="G\u00e9rer la localisation"
            onPress={() => onNavigate('location')}
          />
        </SettingsSection>

        {/* Données */}
        <SettingsSection label="Données">
          <SettingsRow
            icon="Lock"
            label="Confidentialité & RGPD"
            subtitle="Analytics, export, suppression"
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
      </div>
    </div>
  );
}
