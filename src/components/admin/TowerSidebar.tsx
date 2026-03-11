'use client';

import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAdminTheme } from './AdminThemeContext';

type SidebarSection = {
  label: string;
  items: { id: string; label: string; icon: string; count?: number }[];
};

const SECTIONS: SidebarSection[] = [
  {
    label: "Vue d'ensemble",
    items: [
      { id: 'overview',  label: 'Dashboard',  icon: '\uD83D\uDCCA' },
      { id: 'analytics', label: 'Analytics',   icon: '\uD83D\uDCC8' },
    ],
  },
  {
    label: 'Contenu',
    items: [
      { id: 'pins',       label: 'Pins',        icon: '\uD83D\uDCCD' },
      { id: 'reports',    label: 'Reports',      icon: '\uD83D\uDEA9' },
      { id: 'safespaces', label: 'Safe Spaces',  icon: '\uD83D\uDEE1\uFE0F' },
      { id: 'simulation', label: 'Simulation',   icon: '\uD83E\uDDEA' },
    ],
  },
  {
    label: 'Utilisateurs',
    items: [
      { id: 'users',   label: 'Users',   icon: '\uD83D\uDC65' },
      { id: 'support', label: 'Support',  icon: '\uD83D\uDCAC' },
      { id: 'invites', label: 'Invites',  icon: '\uD83D\uDCE8' },
      { id: 'emails',  label: 'Emails',   icon: '\u2709\uFE0F' },
    ],
  },
  {
    label: 'Syst\u00e8me',
    items: [
      { id: 'live',   label: 'Live Sessions', icon: '\uD83D\uDD34' },
      { id: 'params', label: 'Parameters',    icon: '\u2699\uFE0F' },
    ],
  },
];

export default function TowerSidebar() {
  const { theme } = useAdminTheme();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside
      style={{
        width: 220,
        position: 'sticky',
        top: 56,
        height: 'calc(100vh - 56px)',
        overflowY: 'auto',
        background: theme.topbarBg,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: `1px solid ${theme.borderMd}`,
        padding: '16px 0',
        flexShrink: 0,
      }}
    >
      {SECTIONS.map((section) => (
        <div key={section.label} style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: theme.t3,
              padding: '0 16px',
              marginBottom: 6,
            }}
          >
            {section.label}
          </div>
          {section.items.map((item) => {
            const active = pathname.includes(`/admin/${item.id}`);
            return (
              <motion.button
                key={item.id}
                onClick={() => router.push(`/admin/${item.id}`)}
                whileHover={{ x: 2 }}
                transition={{ duration: 0.15 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px 16px',
                  border: 'none',
                  borderLeft: active ? '3px solid #3BB4C1' : '3px solid transparent',
                  background: active ? theme.cyanSoft : 'transparent',
                  color: active ? theme.cyan : theme.t2,
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s, color 0.2s',
                  boxShadow: active ? '0 0 8px rgba(59,180,193,0.1)' : 'none',
                }}
              >
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.count !== undefined && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: theme.t3,
                      background: theme.elevated,
                      borderRadius: 6,
                      padding: '1px 6px',
                    }}
                  >
                    {item.count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
