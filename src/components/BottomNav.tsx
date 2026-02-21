// src/components/BottomNav.tsx

'use client';

import { useStore } from '@/stores/useStore';

const TABS = [
  { id: 'map',        label: 'Map',        icon: '🗺️',  live: true  },
  { id: 'incidents',  label: 'Incidents',  icon: '📋',  live: true  },
  { id: 'community',  label: 'Community',  icon: '💬',  live: false },
  { id: 'messages',   label: 'Messages',   icon: '✉️',   live: false },
  { id: 'profile',    label: 'Profile',    icon: '👤',  live: false },
] as const;

export default function BottomNav() {
  const { activeTab, setActiveTab, pins } = useStore();

  // Count active (unresolved, <2h) emergency pins for badge
  const emergencyCount = pins.filter((p) => {
    if (!p.is_emergency || p.resolved_at) return false;
    const ageH = (Date.now() - new Date(p.created_at).getTime()) / 3_600_000;
    return ageH < 2;
  }).length;

  return (
    <div
      className="shrink-0 flex items-stretch"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
        height: '60px',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {TABS.map(({ id, label, icon, live }) => {
        const isActive = activeTab === id;
        const badge = id === 'incidents' && emergencyCount > 0 ? emergencyCount : 0;

        return (
          <button
            key={id}
            onClick={() => live && setActiveTab(id as typeof activeTab)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-opacity"
            style={{ opacity: live ? 1 : 0.4 }}
          >
            {/* Badge */}
            {badge > 0 && (
              <span
                className="absolute top-1.5 right-[calc(50%-16px)] min-w-[16px] h-4 rounded-full text-[0.55rem] font-black flex items-center justify-center px-1"
                style={{ backgroundColor: '#ef4444', color: '#fff', lineHeight: 1 }}
              >
                {badge}
              </span>
            )}

            {/* Icon */}
            <span
              className="text-xl leading-none transition-transform"
              style={{ transform: isActive ? 'translateY(-1px)' : 'none' }}
            >
              {icon}
            </span>

            {/* Label */}
            <span
              className="text-[0.6rem] font-bold tracking-wide"
              style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}
            >
              {live ? label : label}
            </span>

            {/* Active indicator dot */}
            {isActive && (
              <span
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full"
                style={{ backgroundColor: 'var(--accent)' }}
              />
            )}

            {/* Soon chip for placeholder tabs */}
            {!live && (
              <span
                className="absolute top-1 right-[calc(50%-22px)] text-[0.45rem] font-black px-1 rounded"
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              >
                SOON
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
