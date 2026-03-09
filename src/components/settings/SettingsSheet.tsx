'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from '@/stores/useTheme';
import MainSettings from './screens/MainSettings';
import MonCompteScreen from './screens/compte/MonCompteScreen';
import SecuriteScreen from './screens/SecuriteScreen';
import PreferencesScreen from './screens/PreferencesScreen';
import AideScreen from './screens/AideScreen';
import SupportChatScreen from './screens/SupportChatScreen';
import PaywallScreen from '../subscription/PaywallScreen';
import MyProfileScreen from './screens/MyProfileScreen';
import AlertNotificationsScreen from './screens/AlertNotificationsScreen';
import LocationScreen from './screens/LocationScreen';
import PrivacyScreen from './screens/PrivacyScreen';
import DeleteAccountScreen from './screens/compte/DeleteAccountScreen';
import SessionsSecurityScreen from './screens/SessionsSecurityScreen';
import VerificationScreen from './screens/compte/VerificationScreen';
import { useStore } from '@/stores/useStore';

export interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialScreen?: string;
}

const screenTransition = { duration: 0.2 };
const screenInitial = { x: 30, opacity: 0 };
const screenAnimate = { x: 0, opacity: 1 };
const screenExit = { x: -30, opacity: 0 };

export default function SettingsSheet({ isOpen, onClose, initialScreen }: SettingsSheetProps) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const [currentScreen, setCurrentScreen] = useState('main');
  const sheetRef = useRef<HTMLDivElement>(null);

  const goBack = useCallback(() => setCurrentScreen('main'), []);

  // Reset to initial screen when sheet opens
  useEffect(() => {
    if (isOpen) setCurrentScreen(initialScreen ?? 'main');
  }, [isOpen, initialScreen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !sheetRef.current) return;
    const sheet = sheetRef.current;
    const focusable = sheet.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length) focusable[0].focus();

    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', trap);
    return () => document.removeEventListener('keydown', trap);
  }, [isOpen, currentScreen]);

  function renderScreen() {
    switch (currentScreen) {
      case 'compte':
        return <MonCompteScreen onBack={goBack} onNavigateParent={setCurrentScreen} />;
      case 'securite':
        return <SecuriteScreen onBack={goBack} onClose={onClose} onNavigate={setCurrentScreen} />;
      case 'verification': {
        const profile = useStore.getState().userProfile;
        return (
          <VerificationScreen
            isVerified={!!profile?.verified}
            onVerified={() => {
              if (profile) {
                useStore.getState().setUserProfile({ ...profile, verified: true, verification_status: 'approved' });
              }
            }}
            onBack={() => setCurrentScreen('securite')}
          />
        );
      }
      case 'preferences':
        return <PreferencesScreen onBack={goBack} />;
      case 'aide':
        return <AideScreen onBack={goBack} onNavigateToSupport={() => setCurrentScreen('support-chat')} />;
      case 'support-chat':
        return <SupportChatScreen onBack={() => setCurrentScreen('aide')} />;
      case 'abonnement':
        return <PaywallScreen onClose={goBack} context="settings" />;
      case 'myProfile':
        return <MyProfileScreen onClose={goBack} />;
      case 'alert-notifications':
        return <AlertNotificationsScreen onBack={() => setCurrentScreen('securite')} />;
      case 'location':
        return <LocationScreen onBack={() => setCurrentScreen('securite')} />;
      case 'sessions-security':
        return <SessionsSecurityScreen onBack={() => setCurrentScreen('securite')} />;
      case 'privacy-rgpd':
        return <PrivacyScreen onBack={() => setCurrentScreen('securite')} onNavigate={setCurrentScreen} />;
      case 'delete-account-privacy':
        return <DeleteAccountScreen onBack={() => setCurrentScreen('privacy-rgpd')} />;
      default:
        return <MainSettings onNavigate={setCurrentScreen} onClose={onClose} />;
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="settings-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 900,
            }}
          />

          {/* Sheet */}
          <motion.div
            key="settings-sheet"
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Paramètres"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              position: 'fixed',
              bottom: 64,
              left: 0,
              right: 0,
              height: '85%',
              background: isDark ? '#0B1628' : '#FFFFFF',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              zIndex: 901,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Handle */}
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                margin: '12px auto 0',
                flexShrink: 0,
              }}
            />

            {/* Content */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentScreen}
                  initial={screenInitial}
                  animate={screenAnimate}
                  exit={screenExit}
                  transition={screenTransition}
                  style={{ height: '100%' }}
                >
                  {renderScreen()}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
