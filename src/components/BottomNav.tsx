// src/components/BottomNav.tsx

'use client';

import { motion } from 'framer-motion';
import { Map, Navigation, Users, Shield, type LucideIcon } from 'lucide-react';
import { useStore } from '@/stores/useStore';
import { useTranslations } from 'next-intl';

type Tab = 'map' | 'trip' | 'community' | 'mykova';

const TAB_KEYS: { id: Tab; key: 'map' | 'trip' | 'community' | 'myKova'; Icon: LucideIcon }[] = [
  { id: 'map',       key: 'map',       Icon: Map        },
  { id: 'trip',      key: 'trip',      Icon: Navigation },
  { id: 'community', key: 'community', Icon: Users      },
  { id: 'mykova',    key: 'myKova',    Icon: Shield     },
];

export default function BottomNav() {
  const { activeTab, setActiveTab, pins, offlineQueueCount, unreadDmCount } = useStore();
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
        const offlineBadge = id === 'map' && offlineQueueCount > 0;

        return (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            className="flex-1 flex flex-col items-center justify-center gap-1 relative"
          >
            {/* Pill background — shared layoutId so it slides between tabs */}
            {isActive && (
              <motion.div
                layoutId="nav-pill"
                className="absolute inset-x-2 inset-y-1 rounded-2xl"
                style={{ backgroundColor: 'var(--accent)', opacity: 0.12 }}
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
            {!badge && offlineBadge && (
              <span
                className="absolute top-2 right-[calc(50%-14px)] min-w-[15px] h-[15px] rounded-full text-[0.5rem] font-black flex items-center justify-center px-1 z-10"
                style={{ backgroundColor: '#f59e0b', color: '#fff' }}
              >
                {offlineQueueCount}
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
