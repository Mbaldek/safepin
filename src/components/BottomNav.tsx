// src/components/BottomNav.tsx

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Navigation, Sparkles, type LucideIcon } from 'lucide-react';
import { useStore } from '@/stores/useStore';
import { useTheme } from '@/stores/useTheme';
import { useNotificationStore } from '@/stores/notificationStore';
import { useTranslations } from 'next-intl';

type Tab = 'map' | 'community' | 'cercle' | 'trip' | 'me';

const TABS: { id: Tab; labelKey: string; Icon: LucideIcon; disabled?: boolean }[] = [
  { id: 'community', labelKey: 'community', Icon: MessageCircle },
  { id: 'cercle',    labelKey: 'cercle',    Icon: Heart         },
  { id: 'trip',      labelKey: 'trip',      Icon: Navigation    },
  { id: 'me',        labelKey: 'me',        Icon: Sparkles, disabled: true },
];

const ACCENT = '#3BB4C1';
const DANGER = '#EF4444';

export default function BottomNav() {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const { activeTab, setActiveTab, unreadDmCount } = useStore();
  const badgeCount = useNotificationStore((s) => s.badgeCount);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const t = useTranslations('nav');

  const [pressedTab, setPressedTab] = useState<string | null>(null);
  const [poppingTab, setPoppingTab] = useState<string | null>(null);

  const inactiveColor = isDark ? '#64748B' : '#94A3B8';

  const handleTabClick = (tab: typeof TABS[number]) => {
    if (tab.disabled) return;
    if (tab.id === 'community') markAllRead();

    setPressedTab(tab.id);
    setPoppingTab(tab.id);
    setActiveTab(tab.id);

    setTimeout(() => setPressedTab(null), 400);
    setTimeout(() => setPoppingTab(null), 350);
  };

  return (
    <nav
      id="bottom-nav"
      aria-label="Main navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 300,
        background: isDark ? 'rgba(15, 23, 42, 0.82)' : 'rgba(255, 255, 255, 0.82)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
      }}
    >
      <div style={{ display: 'flex', height: 64 }}>
        {TABS.map((tab) => {
          const { id, labelKey, Icon, disabled } = tab;
          const isActive = activeTab === id;
          const label = t(labelKey);

          const badge =
            id === 'community' && (badgeCount + unreadDmCount) > 0 ? (badgeCount + unreadDmCount) : 0;

          const color = disabled
            ? inactiveColor
            : isActive ? ACCENT : inactiveColor;
          const opacity = disabled ? 0.4 : 1;

          return (
            <button
              key={id}
              onClick={() => handleTabClick(tab)}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              aria-disabled={disabled || undefined}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                padding: '4px 0',
                position: 'relative',
                background: 'none',
                border: 'none',
                cursor: disabled ? 'default' : 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Active dot indicator */}
              {isActive && !disabled && (
                <motion.div
                  layoutId="nav-dot"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: ACCENT,
                  }}
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                />
              )}

              {/* Ripple burst */}
              {pressedTab === id && !disabled && (
                <span
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: 32,
                    height: 32,
                    marginTop: -16,
                    marginLeft: -16,
                    borderRadius: '50%',
                    background: 'rgba(59, 180, 193, 0.4)',
                    animation: 'ripple-burst 400ms ease-out forwards',
                    pointerEvents: 'none',
                  }}
                />
              )}

              {/* Icon wrapper (for animations) */}
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation:
                    poppingTab === id && isActive && !disabled
                      ? 'tab-pop 350ms ease-out'
                      : pressedTab === id && !disabled
                        ? 'tab-bounce 400ms ease-out'
                        : undefined,
                }}
              >
                {/* Badge */}
                {badge > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -10,
                      minWidth: 16,
                      height: 16,
                      padding: '0 4px',
                      background: DANGER,
                      color: '#fff',
                      fontSize: 9,
                      fontWeight: 700,
                      borderRadius: 99,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                      zIndex: 10,
                    }}
                  >
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}

                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  style={{
                    color,
                    opacity,
                    transition: 'color 150ms, opacity 150ms',
                  }}
                />
              </div>

              {/* Label */}
              <span
                style={{
                  fontSize: '0.58rem',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  lineHeight: 1,
                  color,
                  opacity,
                  transition: 'color 150ms, opacity 150ms',
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Safe area spacer */}
      <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
    </nav>
  );
}
