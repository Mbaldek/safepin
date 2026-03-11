'use client';

import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAdminTheme } from './AdminThemeContext';

const NAV = [
  { id: 'overview',   label: 'Overview',    icon: '\uD83D\uDCCA' },
  { id: 'analytics',  label: 'Analytics',   icon: '\uD83D\uDCC8' },
  { id: 'pins',       label: 'Pins',        icon: '\uD83D\uDCCD' },
  { id: 'users',      label: 'Users',       icon: '\uD83D\uDC65' },
  { id: 'reports',    label: 'Reports',     icon: '\uD83D\uDEA9' },
  { id: 'live',       label: 'Live',        icon: '\uD83D\uDD34' },
  { id: 'safespaces', label: 'Safe Spaces', icon: '\uD83D\uDEE1\uFE0F' },
  { id: 'params',     label: 'Parameters',  icon: '\u2699\uFE0F' },
];

export default function TowerTopbar() {
  const { theme, isDark, toggle } = useAdminTheme();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header
      style={{
        height: 56,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: theme.topbarBg,
        borderBottom: `1px solid ${theme.topbarBorder}`,
        boxShadow: theme.shadow,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 12,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width={24} height={24} viewBox="0 0 80 80" fill="none">
          <path d="M20 60 Q20 30, 40 20 Q60 30, 60 60" stroke="#3BB4C1" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M28 55 Q28 35, 40 28 Q52 35, 52 55" stroke="#3BB4C1" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.6" />
          <circle cx="40" cy="22" r="4" fill="#3BB4C1" />
        </svg>
        <span style={{ fontSize: 15, fontWeight: 700, color: theme.t1, letterSpacing: '0.04em' }}>Breveil</span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: '#fff',
            background: theme.danger,
            borderRadius: 6,
            padding: '2px 6px',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          Admin
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 28, background: theme.borderMd }} />

      {/* Nav items */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {NAV.map((item) => {
          const active = pathname.includes(`/admin/${item.id}`);
          return (
            <motion.button
              key={item.id}
              onClick={() => router.push(`/admin/${item.id}`)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                borderRadius: 8,
                border: active ? `1px solid ${theme.cyanBorder}` : '1px solid transparent',
                background: active ? theme.cyanSoft : 'transparent',
                color: active ? theme.cyan : theme.t2,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background 0.2s, color 0.2s, border-color 0.2s',
                boxShadow: active ? '0 0 12px rgba(59,180,193,0.15)' : 'none',
              }}
            >
              <span style={{ fontSize: 13 }}>{item.icon}</span>
              {item.label}
            </motion.button>
          );
        })}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Theme toggle */}
      <motion.button
        onClick={toggle}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          border: `1px solid ${theme.borderMd}`,
          borderRadius: 100,
          padding: '5px 12px',
          fontSize: 11,
          fontWeight: 600,
          color: theme.t2,
          background: 'transparent',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'border-color 0.2s, color 0.2s',
        }}
      >
        {isDark ? '\u2600\uFE0F Light' : '\uD83C\uDF19 Dark'}
      </motion.button>

      {/* Back to app */}
      <motion.button
        onClick={() => router.push('/')}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          border: `1px solid ${theme.borderMd}`,
          borderRadius: 100,
          padding: '5px 12px',
          fontSize: 11,
          fontWeight: 600,
          color: theme.t2,
          background: 'transparent',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'border-color 0.2s, color 0.2s',
        }}
      >
        &larr; Back to app
      </motion.button>

      {/* Avatar */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: `linear-gradient(135deg, #3BB4C1, #A78BFA)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
          color: '#fff',
          boxShadow: '0 0 12px rgba(59,180,193,0.25)',
        }}
      >
        A
      </div>
    </header>
  );
}
