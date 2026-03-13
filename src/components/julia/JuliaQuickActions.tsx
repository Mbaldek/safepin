'use client'

import { useMemo } from 'react'

interface JuliaQuickActionsProps {
  onSelect: (prompt: string) => void
  isDark: boolean
}

type Pill = { label: string; icon: string; cat: string }

const PILLS: Record<string, Pill[]> = {
  situationnel: [
    { label: 'Je rentre seule ce soir', icon: '🙏', cat: 'situationnel' },
    { label: 'Quelqu\'un me suit, je crois', icon: '😰', cat: 'situationnel' },
    { label: 'Je me sens pas à l\'aise là', icon: '😟', cat: 'situationnel' },
  ],
  quartier: [
    { label: 'C\'est safe par ici ?', icon: '📍', cat: 'quartier' },
    { label: 'Trouve-moi une sortie rapide', icon: '🚪', cat: 'quartier' },
    { label: 'Mon trajet de ce soir ?', icon: '🗺️', cat: 'quartier' },
  ],
  presence: [
    { label: 'Reste avec moi', icon: '🤝', cat: 'presence' },
    { label: 'Parle-moi, je marche seule', icon: '💬', cat: 'presence' },
  ],
  positif: [
    { label: 'Je suis arrivée !', icon: '🎉', cat: 'positif' },
    { label: 'Trajet impeccable !', icon: '🌟', cat: 'positif' },
    { label: 'Mon quartier devient plus safe ?', icon: '📈', cat: 'positif' },
  ],
  rassurant: [
    { label: 'Tout va bien, juste bonjour', icon: '👋', cat: 'rassurant' },
    { label: 'Je me sens bien ce soir', icon: '😊', cat: 'rassurant' },
  ],
}

/** Simple seeded pseudo-random (stable per hour, no re-render flicker) */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr]
  let s = seed
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0
    const j = s % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function getTimePills(hour: number): Pill[] {
  let pool: Pill[]
  if (hour >= 7 && hour < 12) {
    pool = [...PILLS.quartier, ...PILLS.positif, ...PILLS.rassurant]
  } else if (hour >= 12 && hour < 18) {
    pool = [...PILLS.quartier, ...PILLS.rassurant, ...PILLS.positif]
  } else if (hour >= 18 && hour < 23) {
    pool = [...PILLS.presence, ...PILLS.situationnel, ...PILLS.positif]
  } else {
    pool = [...PILLS.situationnel, ...PILLS.presence, ...PILLS.rassurant]
  }

  const shuffled = seededShuffle(pool, hour * 7 + new Date().getDate())

  // Guarantee at least 1 positif/rassurant
  const selected: Pill[] = []
  let hasPositive = false
  let tensionCount = 0

  for (const pill of shuffled) {
    if (selected.length >= 4) break
    const isTension = pill.cat === 'situationnel'
    const isPositive = pill.cat === 'positif' || pill.cat === 'rassurant'

    if (isTension && tensionCount >= 2) continue
    if (isTension) tensionCount++
    if (isPositive) hasPositive = true

    selected.push(pill)
  }

  // If no positive pill selected, swap last non-positive for a positive one
  if (!hasPositive && selected.length > 0) {
    const positivePill = shuffled.find(p => (p.cat === 'positif' || p.cat === 'rassurant') && !selected.includes(p))
    if (positivePill) {
      const lastNonPositive = [...selected].reverse().findIndex(p => p.cat !== 'positif' && p.cat !== 'rassurant')
      if (lastNonPositive >= 0) {
        selected[selected.length - 1 - lastNonPositive] = positivePill
      }
    }
  }

  return selected
}

export default function JuliaQuickActions({ onSelect, isDark }: JuliaQuickActionsProps) {
  const textPrimary = isDark ? '#FFFFFF' : '#0F172A'
  const chipBg = isDark ? 'rgba(167,139,250,0.12)' : 'rgba(167,139,250,0.08)'
  const chipBorder = 'rgba(167,139,250,0.20)'

  const pills = useMemo(() => getTimePills(new Date().getHours()), [])

  return (
    <div
      style={{
        flexShrink: 0,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        padding: '8px 14px',
      }}
    >
      {pills.map((pill) => (
        <button
          key={pill.label}
          onClick={() => onSelect(pill.label)}
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
          <span style={{ fontSize: 14 }}>{pill.icon}</span>
          {pill.label}
        </button>
      ))}
    </div>
  )
}
