// src/components/BottomNav.tsx

'use client';

import { motion } from 'framer-motion';
import { Map, AlertTriangle, Users, Navigation, User, type LucideIcon } from 'lucide-react';
import { useStore } from '@/stores/useStore';

type Tab = 'map' | 'incidents' | 'community' | 'trip' | 'profile';

const TABS: { id: Tab; label: string; Icon: LucideIcon }[] = [
  { id: 'map',       label: 'Map',       Icon: Map           },
  { id: 'incidents', label: 'Incidents', Icon: AlertTriangle  },
  { id: 'community', label: 'Community', Icon: Users          },
  { id: 'trip',      label: 'Trip',      Icon: Navigation     },
  { id: 'profile',   label: 'Profile',   Icon: User           },
];

export default function BottomNav() {
  const { activeTab, setActiveTab, pins } = useStore();

  const emergencyCount = pins.filter((p) => {
    if (!p.is_emergency || p.resolved_at) return false;
    return (Date.now() - new Date(p.created_at).getTime()) / 3_600_000 < 2;
  }).length;

  return (
    <div
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
      {TABS.map(({ id, label, Icon }) => {
        const isActive = activeTab === id;
        const badge = id === 'incidents' && emergencyCount > 0 ? emergencyCount : 0;

        return (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
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
                style={{ backgroundColor: '#ef4444', color: '#fff' }}
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
    </div>
  );
}
