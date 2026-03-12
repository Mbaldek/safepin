'use client'

interface JuliaQuickActionsProps {
  onSelect: (prompt: string) => void
  isDark: boolean
}

const ACTIONS = [
  { label: 'Analyser mon quartier', icon: '\uD83C\uDFD8\uFE0F', prompt: 'Analyse la s\u00e9curit\u00e9 de mon quartier actuel' },
  { label: 'Planifier trajet s\u00FBr', icon: '\uD83D\uDDFA\uFE0F', prompt: 'Aide-moi \u00e0 planifier un trajet s\u00FBr vers ma destination' },
  { label: 'Incidents proches', icon: '\u26A0\uFE0F', prompt: 'Quels sont les incidents signal\u00e9s \u00e0 proximit\u00e9 ?' },
  { label: 'Conseils s\u00e9curit\u00e9', icon: '\uD83D\uDEE1\uFE0F', prompt: 'Donne-moi des conseils de s\u00e9curit\u00e9 adapt\u00e9s \u00e0 ce moment' },
]

export default function JuliaQuickActions({ onSelect, isDark }: JuliaQuickActionsProps) {
  const textPrimary = isDark ? '#FFFFFF' : '#0F172A'
  const chipBg = isDark ? 'rgba(167,139,250,0.12)' : 'rgba(167,139,250,0.08)'
  const chipBorder = 'rgba(167,139,250,0.20)'

  return (
    <div
      style={{
        flexShrink: 0,
        display: 'flex',
        gap: 8,
        padding: '8px 14px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}
    >
      {ACTIONS.map((action) => (
        <button
          key={action.label}
          onClick={() => onSelect(action.prompt)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 12px',
            borderRadius: 20,
            background: chipBg,
            border: `1px solid ${chipBorder}`,
            color: textPrimary,
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'background 0.15s ease',
          }}
        >
          <span style={{ fontSize: 14 }}>{action.icon}</span>
          {action.label}
        </button>
      ))}
    </div>
  )
}
