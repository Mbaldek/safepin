'use client';

import { motion } from 'framer-motion';
import { Check, ChevronRight } from 'lucide-react';

export interface ProfileBlockProps {
  name: string;
  email: string;
  isVerified: boolean;
  onPress: () => void;
}

export default function ProfileBlock({ name, email, isVerified, onPress }: ProfileBlockProps) {
  const initial = name.charAt(0).toUpperCase();

  return (
    <motion.button
      onClick={onPress}
      whileTap={{ scale: 0.98 }}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 20,
        cursor: 'pointer',
        width: '100%',
        background: 'none',
        border: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        textAlign: 'left',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #3BB4C1, #4A2C5A)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: '#fff',
          fontSize: 20,
          fontWeight: 300,
        }}
      >
        {initial}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>{name}</span>
          {isVerified && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                background: '#34D39920',
                color: '#34D399',
                fontSize: 10,
                fontWeight: 700,
                borderRadius: 20,
                padding: '2px 8px',
              }}
            >
              <Check size={10} />
              VÉRIFIÉ
            </span>
          )}
        </div>
        <span style={{ color: '#64748B', fontSize: 13 }}>{email}</span>
      </div>

      {/* Chevron */}
      <ChevronRight size={20} color="#64748B" style={{ flexShrink: 0 }} />
    </motion.button>
  );
}
