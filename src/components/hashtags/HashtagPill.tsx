'use client'
import { motion } from 'framer-motion'
import {
  Zap, Sun, Check, User, Moon, Star, MapPin, SunMedium, Navigation,
} from 'lucide-react'
import { getTagStyle } from '@/lib/hashtagTokens'
import type { Hashtag } from '@/types'

const ICON_MAP: Record<string, React.ElementType> = {
  Zap, Sun, Check, User, Moon, Star, MapPin, SunMedium, Navigation,
}

interface Props {
  tag:       Hashtag
  isDark:    boolean
  size?:     'xs' | 'sm' | 'md'
  onPress?:  (tag: Hashtag) => void
  selected?: boolean
}

export function HashtagPill({ tag, isDark, size = 'sm', onPress, selected }: Props) {
  const style   = getTagStyle(tag.tag, tag.category, isDark)
  const Icon    = tag.icon ? ICON_MAP[tag.icon] : null

  const padding  = size === 'xs' ? '2px 6px' : size === 'sm' ? '3px 9px' : '5px 12px'
  const fontSize = size === 'xs' ? 9 : size === 'sm' ? 11 : 13
  const iconSize = size === 'xs' ? 8 : 9

  return (
    <motion.button
      whileTap={onPress ? { scale: 0.94 } : {}}
      onClick={onPress ? () => onPress(tag) : undefined}
      style={{
        display:     'inline-flex',
        alignItems:  'center',
        gap:         3,
        padding,
        borderRadius: 100,
        fontSize,
        fontWeight:  600,
        fontFamily:  'inherit',
        cursor:      onPress ? 'pointer' : 'default',
        background:  selected ? style.color : style.bg,
        color:       selected ? '#fff' : style.color,
        border:      `1px solid ${selected ? style.color : style.border}`,
        transition:  'all 150ms',
        whiteSpace:  'nowrap' as const,
      }}
    >
      {Icon && <Icon size={iconSize} strokeWidth={2} />}
      {tag.display}
    </motion.button>
  )
}
