'use client';

import { useEffect, useState } from 'react';
import { X, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ProfileBlock from '../components/ProfileBlock';
import SettingsSection from '../components/SettingsSection';
import SettingsRow from '../components/SettingsRow';

export interface MainSettingsProps {
  onNavigate: (screen: string) => void;
  onClose: () => void;
}

export default function MainSettings({ onNavigate, onClose }: MainSettingsProps) {
  const router = useRouter();
  const [logoutHover, setLogoutHover] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email?.includes('balleron')) setIsAdmin(true);
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
        <span style={{ fontSize: 19, fontWeight: 600, color: '#fff' }}>Paramètres</span>
        <button
          onClick={onClose}
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
          }}
        >
          <X size={18} color="#94A3B8" />
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Profile */}
        <ProfileBlock
          name="Nicolas"
          email="nicolas@breveil.app"
          isVerified={true}
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
            subtitle="Langue, carte, thème, haptique"
            onPress={() => onNavigate('preferences')}
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
            color: '#475569',
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
