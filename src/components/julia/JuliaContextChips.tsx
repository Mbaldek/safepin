'use client'

interface JuliaContextChipsProps {
  location: { lat: number; lng: number } | null
  nearbyPinCount: number
  activeTrip: unknown | null
  isDark: boolean
}

interface Chip {
  icon: string
  label: string
  show: boolean
  color: string
}

export default function JuliaContextChips({
  location,
  nearbyPinCount,
  activeTrip,
  isDark,
}: JuliaContextChipsProps) {
  const chips: Chip[] = [
    {
      icon: '\uD83D\uDCCD',
      label: 'Position active',
      show: !!location,
      color: isDark ? 'rgba(59,180,193,0.18)' : 'rgba(59,180,193,0.12)',
    },
    {
      icon: '\u26A0\uFE0F',
      label: `${nearbyPinCount} incident${nearbyPinCount > 1 ? 's' : ''} proche${nearbyPinCount > 1 ? 's' : ''}`,
      show: nearbyPinCount > 0,
      color: isDark ? 'rgba(251,191,36,0.18)' : 'rgba(251,191,36,0.12)',
    },
    {
      icon: '\uD83D\uDEB6',
      label: 'Trajet en cours',
      show: !!activeTrip,
      color: isDark ? 'rgba(167,139,250,0.18)' : 'rgba(167,139,250,0.12)',
    },
  ]

  const visibleChips = chips.filter((c) => c.show)
  if (visibleChips.length === 0) return null

  const textPrimary = isDark ? '#FFFFFF' : '#0F172A'
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'

  return (
    <div
      style={{
        flexShrink: 0,
        display: 'flex',
        gap: 8,
        padding: '8px 14px',
        overflowX: 'auto',
        borderBottom: `1px solid ${borderColor}`,
        scrollbarWidth: 'none',
      }}
    >
      {visibleChips.map((chip) => (
        <div
          key={chip.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 10px',
            borderRadius: 20,
            background: chip.color,
            fontSize: 11,
            fontWeight: 500,
            color: textPrimary,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 13 }}>{chip.icon}</span>
          {chip.label}
        </div>
      ))}
    </div>
  )
}
