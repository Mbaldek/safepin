// src/components/BottomNav.tsx

'use client';

import { motion } from 'framer-motion';
import { MapPin, MessageCircle, Navigation, User, type LucideIcon } from 'lucide-react';
import { useStore } from '@/stores/useStore';
import { useTranslations } from 'next-intl';

type Tab = 'map' | 'community' | 'trip' | 'me';

const TAB_KEYS: { id: Tab; key: 'map' | 'community' | 'trip' | 'me'; Icon: LucideIcon }[] = [
  { id: 'map',       key: 'map',       Icon: MapPin        },
  { id: 'community', key: 'community', Icon: MessageCircle },
  { id: 'trip',      key: 'trip',      Icon: Navigation    },
  { id: 'me',        key: 'me',        Icon: User          },
];

export default function BottomNav() {
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
        backgroundColor: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        height: '64px',
        paddingBottom: 'env(safe-area-inset-bottom)',
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
                style={{ backgroundColor: 'var(--accent)' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              />
            )}

            {/* Badge */}
            {badge > 0 && (
              <span
                className="absolute top-2 right-[calc(50%-14px)] min-w-[15px] h-[15px] rounded-full text-[0.5rem] font-black flex items-center justify-center px-1 z-10"
                style={{ backgroundColor: id === 'community' ? 'var(--accent)' : '#ef4444', color: '#fff' }}
              >
                {badge}
              </span>
            )}

            {/* Icon */}
            <Icon
              size={20}
              strokeWidth={isActive ? 2.2 : 1.8}
              style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)', transition: 'color 0.15s' }}
            />

            {/* Label */}
            <span
              className="text-[0.58rem] font-bold tracking-wide leading-none"
              style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)', transition: 'color 0.15s' }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
