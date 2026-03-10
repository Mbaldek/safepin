'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import { useTheme } from '@/stores/useTheme';
import { supabase } from '@/lib/supabase';
import SettingsSection from '../components/SettingsSection';
import SettingsRow from '../components/SettingsRow';
import type { User } from '@supabase/supabase-js';

interface Props {
  onBack: () => void;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  return `${local[0]}${'*'.repeat(Math.min(local.length - 1, 5))}@${domain}`;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "A l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `il y a ${days}j`;
}

function providerLabel(provider?: string): string {
  switch (provider) {
    case 'google': return 'Google';
    case 'apple': return 'Apple';
    case 'phone': return 'Telephone (SMS)';
    default: return provider ?? 'Email';
  }
}

export default function SessionsSecurityScreen({ onBack }: Props) {
  const toast = useToast();
  const isDark = useTheme((s) => s.theme) === 'dark';
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const txt1 = isDark ? '#FFFFFF' : '#0F172A';
  const txt2 = isDark ? '#94A3B8' : '#64748B';
  const bg2 = isDark ? '#334155' : '#F1F5F9';
  const divider = { height: 1, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)', margin: '0 20px' } as const;

  useEffect(() => {
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);
      setLoading(false);
    })();
  }, []);

  const handleResetPassword = async () => {
    if (!user?.email) {
      toast.error('Aucun email associe a ce compte');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(user.email);
    if (error) {
      toast.error('Erreur lors de l\'envoi');
    } else {
      toast.success(`Lien envoye a ${maskEmail(user.email)}`);
    }
  };

  const handleSignOut = async (scope: 'local' | 'global') => {
    setSigningOut(true);
    await supabase.auth.signOut({ scope });
    router.push('/login');
  };

  const provider = user?.app_metadata?.provider;
  const lastSignIn = user?.last_sign_in_at;
  const createdAt = user?.created_at;

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
          &lsaquo;
        </button>
        <span style={{ fontSize: 19, fontWeight: 600, color: txt1 }}>
          Sessions & securite
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: txt2, fontSize: 13 }}>
            Chargement...
          </div>
        ) : (
          <>
            {/* Session active */}
            <SettingsSection label="Session active">
              <SettingsRow
                icon="Smartphone"
                iconColor="#3BB4C1"
                label={providerLabel(provider)}
                subtitle={user?.email ? maskEmail(user.email) : (user?.phone ?? 'Aucun email')}
              />
              <div style={divider} />
              <SettingsRow
                icon="Clock"
                iconColor="#A78BFA"
                label="Derniere connexion"
                subtitle={lastSignIn ? timeAgo(lastSignIn) : 'Inconnue'}
              />
              <div style={divider} />
              <SettingsRow
                icon="Calendar"
                iconColor="#64748B"
                label="Compte cree le"
                subtitle={createdAt ? new Date(createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
              />
            </SettingsSection>

            {/* Authentification */}
            <SettingsSection label="Authentification">
              <SettingsRow
                icon="Shield"
                iconColor="#F5C341"
                label="Authentification 2FA"
                subtitle="Bientot disponible"
                rightEl={
                  <div style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    background: isDark ? 'rgba(245,195,65,0.12)' : 'rgba(245,195,65,0.1)',
                    color: '#F5C341',
                  }}>
                    Soon
                  </div>
                }
              />
              <div style={divider} />
              <SettingsRow
                icon="Key"
                iconColor="#34D399"
                label="Changer le mot de passe"
                subtitle="Recevoir un lien par email"
                onPress={handleResetPassword}
              />
            </SettingsSection>

            {/* Actions */}
            <SettingsSection label="Actions">
              <SettingsRow
                icon="LogOut"
                iconColor="#64748B"
                label="Se deconnecter"
                subtitle="Cet appareil uniquement"
                onPress={signingOut ? undefined : () => handleSignOut('local')}
              />
              <div style={divider} />
              <SettingsRow
                icon="LogOut"
                label="Deconnexion globale"
                subtitle="Tous les appareils"
                danger
                onPress={signingOut ? undefined : () => handleSignOut('global')}
              />
            </SettingsSection>
          </>
        )}
      </div>
    </div>
  );
}
