"use client"

import { useState } from "react"

const PERSONA_CHIPS = [
  { icon: "\uD83C\uDF19", label: "Noctambule" },
  { icon: "\uD83D\uDCDA", label: "\u00C9tudiante" },
]

const ACTIVITY_TABS = ["Activit\u00E9", "Sauvegard\u00E9", "Statistiques"] as const

const ACTIVITIES = [
  {
    icon: "\uD83D\uDCCD",
    text: "Vous avez signal\u00E9 : Harc\u00E8lement \u00B7 Rue Lecourbe",
    time: "il y a 2h",
  },
  {
    icon: "\uD83C\uDFD8\uFE0F",
    text: "Vous avez rejoint : Quartier Grenelle",
    time: "il y a 1j",
  },
  {
    icon: "\uD83D\uDCCD",
    text: "Vous avez signal\u00E9 : \u00C9clairage d\u00E9faillant \u00B7 Bd Garibaldi",
    time: "il y a 3j",
  },
]

export function Profile() {
  const [activeTab, setActiveTab] = useState<(typeof ACTIVITY_TABS)[number]>(
    "Activit\u00E9"
  )

  return (
    <div className="flex h-dvh flex-col overflow-y-auto px-5 pt-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-[20px] font-light text-foreground">
          Mon Breveil
        </h1>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors"
          style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
          aria-label="Param\u00E8tres"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </button>
      </div>

      {/* Profile card */}
      <div
        className="mt-5 rounded-[16px] p-4"
        style={{
          backgroundColor: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-3.5">
          {/* Avatar */}
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
            style={{
              background: "linear-gradient(135deg, #E8A838, #8B7EC8)",
            }}
          >
            <span className="text-[22px] font-semibold text-foreground">
              S
            </span>
          </div>

          {/* Name + handle */}
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-[22px] font-normal leading-tight text-foreground">
              Sarah
            </h2>
            <p
              className="mt-0.5 text-[12px]"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              @sarah_paris &middot; Paris
            </p>

            {/* Persona chips */}
            <div className="mt-2 flex gap-1.5">
              {PERSONA_CHIPS.map((chip) => (
                <span
                  key={chip.label}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.04)",
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  <span className="text-[10px]">{chip.icon}</span>
                  {chip.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {/* Signalements */}
        <div
          className="flex flex-col items-center rounded-[14px] py-3"
          style={{
            backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <span
            className="font-serif text-[24px] leading-none"
            style={{ color: "#E8A838" }}
          >
            12
          </span>
          <span
            className="mt-1.5 text-[10px] font-medium uppercase tracking-wider"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            Signalements
          </span>
        </div>

        {/* Niveau */}
        <div
          className="flex flex-col items-center rounded-[14px] py-3"
          style={{
            backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <span
            className="font-serif text-[18px] font-medium leading-none"
            style={{ color: "#8B7EC8" }}
          >
            Veilleur
          </span>
          <span
            className="mt-1.5 text-[10px] font-medium uppercase tracking-wider"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            Niveau
          </span>
          {/* Progress bar */}
          <div
            className="mt-2 h-[3px] w-3/4 overflow-hidden rounded-full"
            style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
          >
            <div
              className="h-full rounded-full animate-progress-fill"
              style={{ width: "30%", backgroundColor: "#8B7EC8" }}
            />
          </div>
        </div>

        {/* Merci */}
        <div
          className="flex flex-col items-center rounded-[14px] py-3"
          style={{
            backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <span
            className="font-serif text-[24px] leading-none"
            style={{ color: "#E8A838" }}
          >
            5
          </span>
          <span
            className="mt-1.5 text-[10px] font-medium uppercase tracking-wider"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            Merci
          </span>
        </div>
      </div>

      {/* Circle card */}
      <button
        type="button"
        className="mt-3 flex w-full items-center justify-between rounded-[16px] p-3.5 text-left transition-colors hover:brightness-110"
        style={{
          backgroundColor: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div>
          <p className="text-[14px] font-semibold text-foreground">
            {"\uD83D\uDC9B"} Mon Cercle
          </p>
          <p
            className="mt-1 text-[12px]"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            3 proches &middot; Clara, Sarah, Marc
          </p>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      {/* Communities card */}
      <button
        type="button"
        className="mt-2 flex w-full items-center justify-between rounded-[16px] p-3.5 text-left transition-colors hover:brightness-110"
        style={{
          backgroundColor: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div>
          <p className="text-[14px] font-semibold text-foreground">
            {"\uD83D\uDC65"} Mes communaut{"é"}s
          </p>
          <p
            className="mt-1 text-[12px]"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            4 groupes &middot; Marais Solidaire...
          </p>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      {/* Tab bar */}
      <div className="mt-5 flex gap-2">
        {ACTIVITY_TABS.map((tab) => {
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className="rounded-[20px] px-4 py-2 text-[12px] font-medium transition-all duration-200"
              style={{
                backgroundColor: isActive ? "#E8A838" : "transparent",
                color: isActive ? "#1B2541" : "rgba(255,255,255,0.4)",
                fontWeight: isActive ? 700 : 500,
                border: isActive
                  ? "1px solid transparent"
                  : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {tab}
            </button>
          )
        })}
      </div>

      {/* Activity feed */}
      <div className="mt-4 flex flex-col gap-2">
        {ACTIVITIES.map((item, i) => (
          <div
            key={i}
            className="rounded-[12px] p-3 animate-fade-in-up"
            style={{
              backgroundColor: "rgba(255,255,255,0.03)",
              animationDelay: `${i * 80}ms`,
              opacity: 0,
            }}
          >
            <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
              <span className="mr-1.5">{item.icon}</span>
              {item.text}
            </p>
            <p
              className="mt-1 text-[11px]"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              {item.time}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
