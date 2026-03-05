'use client';

import { useEffect, useState } from 'react';
import { X, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/stores/useTheme';
import ProfileBlock from '../components/ProfileBlock';
import SettingsSection from '../components/SettingsSection';
import SettingsRow from '../components/SettingsRow';

export interface MainSettingsProps {
  onNavigate: (screen: string) => void;
  onClose: () => void;
}

export default function MainSettings({ onNavigate, onClose }: MainSettingsProps) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const router = useRouter();
  const [logoutHover, setLogoutHover] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('');
  const [profileVerified, setProfileVerified] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      if (user.email?.includes('balleron')) setIsAdmin(true);
      setProfileEmail(user.email ?? '');

      const { data: p } = await supabase
        .from('profiles')
        .select('first_name, last_name, display_name, name, username, avatar_url, verified')
        .eq('id', user.id)
        .maybeSingle();

      if (p) {
        const name = [p.first_name, p.last_name].filter(Boolean).join(' ')
          || (p.display_name as string)
          || (p.name as string)
          || (p.username as string)
          || user.email?.split('@')[0]
          || '';
        setProfileName(name);
        setProfileAvatar((p.avatar_url as string) ?? '');
        setProfileVerified((p.verified as boolean) ?? false);
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 20px 12px',
        }}
      >
        <span style={{ fontSize: 19, fontWeight: 600, color: isDark ? '#fff' : '#0F172A' }}>Paramètres</span>
        <button
          onClick={onClose}
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
          }}
        >
          <X size={18} color={isDark ? '#94A3B8' : '#64748B'} />
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Profile */}
        <ProfileBlock
          name={profileName || '…'}
          email={profileEmail}
          isVerified={profileVerified}
          avatarUrl={profileAvatar || undefined}
          onPress={() => onNavigate('compte')}
        />

        {/* Sécurité */}
        <SettingsSection label="Sécurité">
          <SettingsRow
            icon="Shield"
            iconColor="#34D399"
            label="Sécurité & confidentialité"
            subtitle="Cercle, alertes, localisation, RGPD"
            onPress={() => onNavigate('securite')}
          />
        </SettingsSection>

        {/* Personnalisation */}
        <SettingsSection label="Personnalisation">
          <SettingsRow
            icon="Settings"
            iconColor="#22D3EE"
            label="Préférences"
            subtitle="Langue, thème"
            onPress={() => onNavigate('preferences')}
          />
        </SettingsSection>

        {/* Abonnement */}
        <SettingsSection label="Abonnement">
          <SettingsRow
            icon="Shield"
            iconColor="#F5C341"
            label="Mon abonnement"
            subtitle="Gérer votre plan, parrainage"
            onPress={() => onNavigate('abonnement')}
            rightEl={
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 999,
                background: isDark ? 'rgba(100,116,139,0.2)' : 'rgba(148,163,184,0.2)',
                color: isDark ? '#94A3B8' : '#64748B',
              }}>
                Gratuit
              </span>
            }
          />
        </SettingsSection>

        {/* Support */}
        <SettingsSection label="Support">
          <SettingsRow
            icon="HelpCircle"
            iconColor="#F5C341"
            label="Aide & support"
            subtitle="Guide, FAQ, nous contacter"
            onPress={() => onNavigate('aide')}
          />
        </SettingsSection>

        {/* Admin — Tower Control (admin only) */}
        {isAdmin && (
          <SettingsSection label="Admin">
            <SettingsRow
              icon="LayoutDashboard"
              iconColor="#F97316"
              label="Admin — Tower Control"
              subtitle="Moderation & parameters"
              badge="ADMIN"
              onPress={() => { router.push('/admin'); onClose(); }}
            />
          </SettingsSection>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          onMouseEnter={() => setLogoutHover(true)}
          onMouseLeave={() => setLogoutHover(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: 'calc(100% - 32px)',
            margin: '24px 16px 8px',
            padding: '14px 0',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 16,
            background: logoutHover ? 'rgba(239,68,68,0.08)' : 'transparent',
            cursor: 'pointer',
            transition: 'background 150ms ease',
          }}
        >
          <LogOut size={16} color="#EF4444" />
          <span style={{ fontSize: 15, fontWeight: 600, color: '#EF4444' }}>Se déconnecter</span>
        </button>

        {/* Footer */}
        <div
          style={{
            textAlign: 'center',
            padding: '16px 20px 28px',
            fontSize: 12,
            color: isDark ? '#475569' : '#94A3B8',
            lineHeight: 1.6,
          }}
        >
          <div>Breveil v0.1.0-beta</div>
          <div>contact@breveil.app</div>
        </div>
      </div>
    </div>
  );
}
