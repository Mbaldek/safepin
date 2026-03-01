"use client"

import { useState, useCallback } from "react"

const GOALS = [
  {
    id: "routes",
    emoji: "\u{1F9ED}",
    title: "Itin\u00E9raires s\u00E9curis\u00E9s",
    description: "Navigation intelligente",
  },
  {
    id: "alerts",
    emoji: "\u{1F4CD}",
    title: "Alertes de quartier",
    description: "Restez inform\u00E9e",
  },
  {
    id: "sos",
    emoji: "\u{1F198}",
    title: "Protection SOS",
    description: "Urgence en un tap",
  },
  {
    id: "transport",
    emoji: "\u{1F687}",
    title: "S\u00E9curit\u00E9 transports",
    description: "Trajets plus s\u00FBrs",
  },
  {
    id: "community",
    emoji: "\u{1F465}",
    title: "Ma communaut\u00E9",
    description: "Connexion locale",
  },
  {
    id: "companion",
    emoji: "\u{1F4AC}",
    title: "Compagnon virtuel",
    description: "Julia, votre IA",
  },
] as const

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="8" cy="8" r="8" fill="#E8A838" />
      <path
        d="M5 8.5L7 10.5L11 6"
        stroke="#1B2541"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function GoalCards() {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  return (
    <div className="grid grid-cols-2 gap-3">
      {GOALS.map(({ id, emoji, title, description }) => {
        const isSelected = selected.has(id)
        return (
          <button
            key={id}
            type="button"
            onClick={() => toggle(id)}
            className="group relative flex flex-col items-start rounded-[14px] p-4 text-left transition-all duration-200 active:scale-[0.97]"
            style={{
              backgroundColor: isSelected
                ? "rgba(232, 168, 56, 0.10)"
                : "rgba(255, 255, 255, 0.04)",
              border: `1px solid ${
                isSelected
                  ? "rgba(232, 168, 56, 0.30)"
                  : "rgba(255, 255, 255, 0.08)"
              }`,
            }}
          >
            {/* Checkmark */}
            <div
              className="absolute top-3 right-3 transition-all duration-200"
              style={{
                opacity: isSelected ? 1 : 0,
                transform: isSelected ? "scale(1)" : "scale(0.5)",
              }}
            >
              <CheckIcon />
            </div>

            {/* Emoji */}
            <span className="text-[24px] leading-none">{emoji}</span>

            {/* Title */}
            <span
              className="mt-3 text-[14px] font-bold leading-snug transition-colors duration-200"
              style={{
                color: isSelected ? "#E8A838" : "#FFFFFF",
              }}
            >
              {title}
            </span>

            {/* Description */}
            <span
              className="mt-0.5 text-[12px] leading-snug"
              style={{ color: "rgba(255, 255, 255, 0.40)" }}
            >
              {description}
            </span>
          </button>
        )
      })}
    </div>
  )
}
