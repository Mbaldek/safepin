// src/components/BottomNav.tsx

'use client';

import { motion } from 'framer-motion';
import { MapPin, MessageCircle, Navigation, Sparkles, type LucideIcon } from 'lucide-react';
import { useStore } from '@/stores/useStore';
import { useTheme } from '@/stores/useTheme';
import { useTranslations } from 'next-intl';

function getColors(isDark: boolean) {
  return isDark ? {
    textTertiary: '#64748B',
    border: 'rgba(255,255,255,0.08)',
  } : {
    textTertiary: '#94A3B8',
    border: 'rgba(15,23,42,0.06)',
  };
}
const FIXED = { accentCyan: '#3BB4C1', semanticDanger: '#EF4444' };

type Tab = 'map' | 'community' | 'trip' | 'me';

const TAB_KEYS: { id: Tab; key: 'map' | 'community' | 'trip' | 'me'; Icon: LucideIcon }[] = [
  { id: 'map',       key: 'map',       Icon: MapPin        },
  { id: 'community', key: 'community', Icon: MessageCircle },
  { id: 'trip',      key: 'trip',      Icon: Navigation    },
  { id: 'me',        key: 'me',        Icon: Sparkles      },
];

export default function BottomNav() {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);
  const { activeTab, setActiveTab, pins, unreadDmCount } = useStore();
  const t = useTranslations('nav');

  const emergencyCount = pins.filter((p) => {
    if (!p.is_emergency || p.resolved_at) return false;
    return (Date.now() - new Date(p.created_at).getTime()) / 3_600_000 < 2;
  }).length;

  return (
    <nav
      id="bottom-nav"
      aria-label="Main navigation"
      className="shrink-0 flex items-stretch"
      style={{
        height: '64px',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: isDark ? 'rgba(30,41,59,0.85)' : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: `1px solid ${C.border}`,
      }}
    >
      {TAB_KEYS.map(({ id, key, Icon }) => {
        const isActive = activeTab === id;
        const label = t(key);
        const badge =
          id === 'map' && emergencyCount > 0 ? emergencyCount :
          id === 'community' && unreadDmCount > 0 ? unreadDmCount : 0;

        return (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            className="flex-1 flex flex-col items-center justify-center gap-1 relative"
            {...(id === 'trip' ? { 'data-tour': 'nav-trip' } : id === 'me' ? { 'data-tour': 'nav-me' } : {})}
          >
            {/* Active dot indicator */}
            {isActive && (
              <motion.div
                layoutId="nav-dot"
                className="absolute bottom-1.5 w-1 h-1 rounded-full"
                style={{ background: FIXED.accentCyan }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              />
            )}

            {/* Badge */}
            {badge > 0 && (
              <span
                className="absolute top-2 right-[calc(50%-14px)] min-w-[15px] h-[15px] rounded-full text-[0.5rem] font-semibold flex items-center justify-center px-1 z-10"
                style={{ color: '#fff', background: id === 'community' ? FIXED.accentCyan : FIXED.semanticDanger }}
              >
                {badge}
              </span>
            )}

            {/* Online dot — Julia AI */}
            {id === 'me' && (
              <span
                className="absolute top-2 right-[calc(50%-14px)] w-[7px] h-[7px] rounded-full z-10"
                style={{ backgroundColor: '#34D399', boxShadow: '0 0 4px #34D399' }}
              />
            )}

            {/* Icon */}
            <Icon
              size={20}
              strokeWidth={isActive ? 2.2 : 1.8}
              style={{ color: isActive ? FIXED.accentCyan : C.textTertiary, transition: 'color 150ms' }}
            />

            {/* Label */}
            <span
              className="text-[0.58rem] font-semibold tracking-wide leading-none"
              style={{ color: isActive ? FIXED.accentCyan : C.textTertiary, transition: 'color 150ms' }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
