import { motion } from 'framer-motion'
import { Home, Briefcase, Coffee, Star, MapPin } from 'lucide-react'
import { tok } from '@/lib/tokens'
import { FAVORI_ICONS } from '@/lib/escorteHelpers'
import type { FavoriTrajet } from '@/types'

const ICON_MAP: Record<string, React.ElementType> = {
  Home, Briefcase, Coffee, Star, MapPin
}

interface Props {
  favori:  FavoriTrajet
  isDark:  boolean
  onClick: (f: FavoriTrajet) => void
}

export function FavoriButton({ favori, isDark, onClick }: Props) {
  const tk   = tok(isDark)
  const meta = FAVORI_ICONS[favori.icon] ?? FAVORI_ICONS.default
  const Icon = ICON_MAP[meta.icon] ?? MapPin

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => onClick(favori)}
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        gap:            5,
        background:     'none',
        border:         'none',
        cursor:         'pointer',
        flexShrink:     0,
      }}
    >
      <div style={{
        width:          52,
        height:         52,
        borderRadius:   14,
        background:     meta.bg,
        border:         `1px solid ${meta.color}35`,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
      }}>
        <Icon size={20} strokeWidth={1.5} color={meta.color} />
      </div>
      <span style={{
        fontSize:   10,
        fontWeight: 500,
        color:      isDark ? '#94A3B8' : '#475569',
        maxWidth:   56,
        overflow:   'hidden',
        textOverflow:'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {favori.name}
      </span>
    </motion.button>
  )
}
