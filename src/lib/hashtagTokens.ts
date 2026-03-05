// Couleurs fixes pour les safety tags — NE PAS MODIFIER sans décision produit

export const SAFETY_TAG_COLORS: Record<string, {
  color:  string
  bg:     string
  border: string
  icon:   string
}> = {
  'harcèlement':      { color: '#EF4444', bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.22)',  icon: 'Zap'       },
  'eclairagefaible':  { color: '#FBBF24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.20)', icon: 'Sun'       },
  'zonecalme':        { color: '#34D399', bg: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.20)', icon: 'Check'     },
  'trajetseul':       { color: '#A78BFA', bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.20)',icon: 'User'      },
  'nuit':             { color: '#60A5FA', bg: 'rgba(96,165,250,0.10)',  border: 'rgba(96,165,250,0.18)', icon: 'Moon'      },
  'soiree':           { color: '#F87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.18)',icon: 'Star'      },
  'eclairageok':      { color: '#34D399', bg: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.20)', icon: 'SunMedium' },
  'ruepeufréquentée': { color: '#94A3B8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.16)',icon: 'MapPin'   },
}

export const LIEU_TAG = {
  color:  '#3BB4C1',
  bg:     'rgba(59,180,193,0.08)',
  border: 'rgba(59,180,193,0.18)',
}

export const LIBRE_TAG = (isDark: boolean) => ({
  color:  isDark ? '#94A3B8' : '#475569',
  bg:     isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)',
  border: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.08)',
})

export function getTagStyle(tag: string, category: string, isDark: boolean) {
  if (category === 'safety') {
    return SAFETY_TAG_COLORS[tag.toLowerCase()] ?? LIBRE_TAG(isDark)
  }
  if (category === 'lieu') return LIEU_TAG
  return LIBRE_TAG(isDark)
}

export function parseHashtags(text: string): string[] {
  const matches = text.match(/#[\wÀ-ÿ]+/g) ?? []
  return matches.map(t => t.slice(1).toLowerCase())
}
