"use client"

import { useState, useCallback } from "react"

const CHIPS = [
  { emoji: "\u{1F687}", label: "Navetteur" },
  { emoji: "\u{1F4DA}", label: "\u00C9tudiante" },
  { emoji: "\u{1F319}", label: "Noctambule" },
  { emoji: "\u{1F3C3}\u200D\u2640\uFE0F", label: "Coureuse" },
  { emoji: "\u{1F476}", label: "Parent" },
  { emoji: "\u2708\uFE0F", label: "Voyageuse" },
  { emoji: "\u{1F4BB}", label: "Freelance" },
  { emoji: "\u{1F389}", label: "Vie nocturne" },
  { emoji: "\u2728", label: "Un peu de tout !" },
] as const

const ALL_OPTION = "Un peu de tout !"

export function IdentityChips() {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = useCallback((label: string) => {
    setSelected((prev) => {
      const next = new Set(prev)

      if (label === ALL_OPTION) {
        // If "Un peu de tout" is clicked, toggle it exclusively
        if (next.has(ALL_OPTION)) {
          next.delete(ALL_OPTION)
        } else {
          next.clear()
          next.add(ALL_OPTION)
        }
        return next
      }

      // Clicking any other chip deselects "Un peu de tout"
      next.delete(ALL_OPTION)

      if (next.has(label)) {
        next.delete(label)
      } else {
        next.add(label)
      }
      return next
    })
  }, [])

  return (
    <div className="flex flex-wrap gap-2.5">
      {CHIPS.map(({ emoji, label }) => {
        const isSelected = selected.has(label)
        return (
          <button
            key={label}
            type="button"
            onClick={() => toggle(label)}
            className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition-all duration-200"
            style={{
              backgroundColor: isSelected
                ? "rgba(232,168,56,0.12)"
                : "rgba(255,255,255,0.04)",
              border: `1px solid ${
                isSelected
                  ? "rgba(232,168,56,0.3)"
                  : "rgba(255,255,255,0.08)"
              }`,
              color: isSelected ? "#E8A838" : "rgba(255,255,255,0.6)",
            }}
          >
            <span className="text-sm">{emoji}</span>
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
