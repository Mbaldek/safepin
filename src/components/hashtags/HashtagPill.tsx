'use client'

import { motion } from 'framer-motion'
import { Hashtag } from '@/types'

interface HashtagPillProps {
  hashtag: Hashtag
  isDark: boolean
  size?: 'xs' | 'sm' | 'md'
  onPress?: () => void
  selected?: boolean
}

const PILL_COLORS = [
  { active: '#3BB4C1', glow: 'rgba(59,180,193,0.45)' },
  { active: '#F472B6', glow: 'rgba(244,114,182,0.45)' },
  { active: '#A78BFA', glow: 'rgba(167,139,250,0.45)' },
  { active: '#34D399', glow: 'rgba(52,211,153,0.45)' },
  { active: '#FBBF24', glow: 'rgba(251,191,36,0.45)' },
]

function hashIndex(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h % PILL_COLORS.length
}

export function HashtagPill({ hashtag, isDark, size = 'sm', onPress, selected = false }: HashtagPillProps) {
  const col = PILL_COLORS[hashIndex(hashtag.name ?? hashtag.tag ?? '')]

  const paddingMap = { xs: '3px 10px', sm: '5px 13px', md: '7px 16px' }
  const fontMap = { xs: 10, sm: 11, md: 13 }

  return (
    <motion.button
      onClick={onPress}
      initial={{ opacity: 0, y: 8, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ scale: 1.07, y: -2 }}
      whileTap={{ scale: 0.93 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      style={{
        flexShrink: 0,
        padding: paddingMap[size],
        borderRadius: 20,
        border: `1px solid ${selected ? col.active : (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)')}`,
        background: selected
          ? col.active
          : isDark
          ? 'rgba(255,255,255,0.05)'
          : 'rgba(0,0,0,0.04)',
        color: selected ? '#fff' : isDark ? '#94A3B8' : '#475569',
        fontSize: fontMap[size],
        fontWeight: 600,
        cursor: 'pointer',
        boxShadow: selected ? `0 4px 18px ${col.glow}` : 'none',
        transition: 'background 200ms, border-color 200ms, box-shadow 200ms, color 200ms',
        whiteSpace: 'nowrap',
      }}
    >
      #{hashtag.name ?? hashtag.tag} · {hashtag.count ?? hashtag.pin_count ?? 0}
    </motion.button>
  )
}
