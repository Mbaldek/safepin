'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import MainSettings from './screens/MainSettings';
import MonCompteScreen from './screens/compte/MonCompteScreen';
import SecuriteScreen from './screens/SecuriteScreen';
import PreferencesScreen from './screens/PreferencesScreen';
import AideScreen from './screens/AideScreen';

export interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const screenTransition = { duration: 0.2 };
const screenInitial = { x: 30, opacity: 0 };
const screenAnimate = { x: 0, opacity: 1 };
const screenExit = { x: -30, opacity: 0 };

export default function SettingsSheet({ isOpen, onClose }: SettingsSheetProps) {
  const [currentScreen, setCurrentScreen] = useState('main');
  const sheetRef = useRef<HTMLDivElement>(null);

  const goBack = useCallback(() => setCurrentScreen('main'), []);

  // Reset to main when sheet opens
  useEffect(() => {
    if (isOpen) setCurrentScreen('main');
  }, [isOpen]);

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
        return <MonCompteScreen onBack={goBack} />;
      case 'securite':
        return <SecuriteScreen onBack={goBack} />;
      case 'preferences':
        return <PreferencesScreen onBack={goBack} />;
      case 'aide':
        return <AideScreen onBack={goBack} />;
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
              bottom: 0,
              left: 0,
              right: 0,
              height: '85%',
              background: '#1A2540',
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
                background: 'rgba(255,255,255,0.2)',
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
