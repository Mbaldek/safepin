'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import SettingsSection from '../components/SettingsSection';
import SettingsRow from '../components/SettingsRow';

export interface SecuriteScreenProps {
  onBack: () => void;
}

export default function SecuriteScreen({ onBack }: SecuriteScreenProps) {
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
            background: '#334155',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#94A3B8',
            fontSize: 18,
          }}
        >
          ‹
        </button>
        <span style={{ fontSize: 19, fontWeight: 600, color: '#fff' }}>
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
            onPress={comingSoon}
          />
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 20px' }} />
          <SettingsRow
            icon="ShieldCheck"
            iconColor="#34D399"
            label="Badge de vérification"
            subtitle="Compte vérifié"
            onPress={comingSoon}
          />
        </SettingsSection>

        {/* Alertes */}
        <SettingsSection label="Alertes">
          <SettingsRow
            icon="Bell"
            iconColor="#F87171"
            label="Notifications d'alerte"
            subtitle="Rayon, heures calmes"
            onPress={comingSoon}
          />
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 20px' }} />
          <SettingsRow
            icon="Eye"
            iconColor="#22D3EE"
            label="Localisation"
            subtitle="Toujours active"
            onPress={comingSoon}
          />
        </SettingsSection>

        {/* Données */}
        <SettingsSection label="Données">
          <SettingsRow
            icon="Lock"
            label="Confidentialité & RGPD"
            subtitle="Analytics, export, suppression"
            onPress={comingSoon}
          />
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 20px' }} />
          <SettingsRow
            icon="Settings"
            label="Sessions & sécurité"
            subtitle="2FA, appareils connectés"
            onPress={comingSoon}
          />
        </SettingsSection>
      </div>
    </div>
  );
}
