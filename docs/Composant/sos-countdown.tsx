"use client"

import { useState, useEffect, useCallback } from "react"

const EMERGENCY_NUMBERS = [
  { number: "15", label: "SAMU" },
  { number: "17", label: "POLICE" },
  { number: "18", label: "POMPIERS" },
  { number: "112", label: "UE" },
] as const

const DANGER_RED = "#E63946"

export function SosCountdown() {
  const [count, setCount] = useState(5)
  const [triggered, setTriggered] = useState(false)
  const [animKey, setAnimKey] = useState(0)

  useEffect(() => {
    if (triggered) return
    if (count <= 0) {
      setTriggered(true)
      return
    }

    const timer = setTimeout(() => {
      setCount((c) => c - 1)
      setAnimKey((k) => k + 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [count, triggered])

  const handleCancel = useCallback(() => {
    setCount(5)
    setTriggered(false)
    setAnimKey(0)
  }, [])

  return (
    <div
      className="flex h-full flex-col"
      style={{
        background: `radial-gradient(circle at 50% 35%, rgba(230,57,70,0.15) 0%, #1B2541 60%)`,
      }}
    >
      {/* Header */}
      <header className="px-6 pt-5">
        <span
          className="font-serif text-[14px] font-light tracking-[3px]"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          BREVEIL
        </span>
      </header>

      {/* Center content */}
      <div className="flex flex-1 flex-col items-center justify-center gap-0 px-6">
        {/* Countdown zone */}
        <div className="relative flex items-center justify-center">
          {/* Expanding ring */}
          {!triggered && (
            <div
              className="animate-ring-expand absolute rounded-full"
              key={`ring-${animKey}`}
              style={{
                width: 140,
                height: 140,
                border: `1.5px solid ${DANGER_RED}`,
                opacity: 0.3,
              }}
            />
          )}

          {/* Number */}
          <span
            key={`num-${animKey}`}
            className="animate-countdown-pulse select-none font-serif font-light"
            style={{
              fontSize: 120,
              lineHeight: 1,
              color: triggered ? "rgba(255,255,255,0.15)" : DANGER_RED,
              transition: "color 0.3s ease",
            }}
          >
            {triggered ? "0" : count}
          </span>
        </div>

        {/* Status text */}
        <p
          className="mt-3 text-[16px] font-sans font-medium text-foreground"
          style={{ opacity: triggered ? 0.5 : 1 }}
        >
          {triggered ? "Alerte envoy\u00E9e" : "Alerte en cours..."}
        </p>
        <p
          className="mt-1.5 text-[13px] font-sans"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          {triggered
            ? "Votre cercle a \u00E9t\u00E9 notifi\u00E9"
            : "Votre position sera partag\u00E9e"}
        </p>
      </div>

      {/* Emergency numbers */}
      <div className="px-6 pb-6">
        <div className="flex items-start justify-between">
          {EMERGENCY_NUMBERS.map((item) => (
            <button
              key={item.number}
              type="button"
              className="group flex flex-col items-center gap-2 transition-transform active:scale-95"
              onClick={() => {
                // In a real app, this would trigger tel: link
              }}
            >
              <div
                className="flex items-center justify-center rounded-full transition-colors duration-150 group-hover:brightness-125"
                style={{
                  width: 64,
                  height: 64,
                  backgroundColor: `rgba(230, 57, 70, 0.1)`,
                  border: `1.5px solid rgba(230, 57, 70, 0.25)`,
                }}
              >
                <span
                  className="font-sans text-[22px] font-bold"
                  style={{ color: DANGER_RED }}
                >
                  {item.number}
                </span>
              </div>
              <span
                className="font-sans text-[10px] font-medium uppercase tracking-[1px]"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {/* Cancel button */}
        <button
          type="button"
          onClick={handleCancel}
          className="mt-8 w-full rounded-[14px] text-[16px] font-bold uppercase tracking-[1px] transition-all duration-200 hover:brightness-125 active:scale-[0.98]"
          style={{
            backgroundColor: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.6)",
            padding: "18px",
          }}
        >
          ANNULER
        </button>
      </div>
    </div>
  )
}
