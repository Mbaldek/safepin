// Distance entre 2 coords en km (Haversine)
export const calcDist = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ETA en minutes (5 km/h walk)
export const calcETA = (distKm: number): number => Math.round(distKm / 0.083)

// Format mm:ss
export const formatElapsed = (sec: number): string => {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Format mm:ss countdown
export const formatCountdown = (sec: number): string => {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// Score trajet (placeholder pour demo)
export const calcScore = (distKm: number, durationMin: number): number => {
  const baseScore = Math.min(10, (distKm + durationMin / 10))
  return Math.round(baseScore * 10) / 10
}

// Couleur avatar déterministe
const AVATAR_COLORS = ['#3BB4C1', '#A78BFA', '#F5C341', '#34D399', '#F87171', '#60A5FA']
export const avatarColor = (name: string): string =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]

// Libellé statut cercle
export const circleStatusLabel = (status: string): string => ({
  notified: 'Notifié',
  following: '● Suit',
  vocal: '🎙 Vocal',
  inactive: 'Hors ligne',
}[status] ?? 'En attente')

export const circleStatusColor = (status: string, T: Record<string, string>): string => ({
  notified: T.semanticWarning,
  following: T.semanticSuccess,
  vocal: T.gradientStart,
  inactive: T.textTertiary,
}[status] ?? T.textTertiary)

// Icône favori
export const FAVORI_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  home:    { icon: 'Home',      color: '#F5C341', bg: 'rgba(245,195,65,0.10)' },
  work:    { icon: 'Briefcase', color: '#22D3EE', bg: 'rgba(34,211,238,0.08)' },
  coffee:  { icon: 'Coffee',    color: '#34D399', bg: 'rgba(52,211,153,0.08)' },
  star:    { icon: 'Star',      color: '#A78BFA', bg: 'rgba(167,139,250,0.08)' },
  default: { icon: 'MapPin',    color: '#64748B', bg: 'rgba(255,255,255,0.06)' },
}
