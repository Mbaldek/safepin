"use client"

import { useState, useEffect } from "react"

const DANGER_RED = "#E63946"
const SAGE_GREEN = "#6BA68E"

function MapBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: "#0F1729" }}>
      <svg
        viewBox="0 0 375 500"
        fill="none"
        className="h-full w-full"
        aria-hidden="true"
      >
        {/* Grid streets */}
        {[80, 160, 240, 320].map((x) => (
          <line
            key={`v-${x}`}
            x1={x}
            y1={0}
            x2={x}
            y2={500}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={1}
          />
        ))}
        {[60, 140, 220, 300, 380, 460].map((y) => (
          <line
            key={`h-${y}`}
            x1={0}
            y1={y}
            x2={375}
            y2={y}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={1}
          />
        ))}

        {/* Boulevard diagonal */}
        <line
          x1={40}
          y1={420}
          x2={340}
          y2={80}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={3}
        />
        <line
          x1={20}
          y1={100}
          x2={360}
          y2={350}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={2}
        />

        {/* Building blocks */}
        {[
          { x: 30, y: 40, w: 70, h: 50 },
          { x: 140, y: 20, w: 80, h: 60 },
          { x: 270, y: 50, w: 70, h: 45 },
          { x: 50, y: 160, w: 60, h: 55 },
          { x: 200, y: 140, w: 90, h: 50 },
          { x: 290, y: 170, w: 55, h: 65 },
          { x: 80, y: 280, w: 65, h: 45 },
          { x: 190, y: 260, w: 70, h: 55 },
        ].map((b, i) => (
          <rect
            key={`block-${i}`}
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            rx={3}
            fill="rgba(255,255,255,0.03)"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={0.5}
          />
        ))}

        {/* Route path (dashed) from user to destination */}
        <path
          d="M 188 240 C 188 200, 220 180, 240 160 C 260 140, 280 130, 290 110"
          stroke={DANGER_RED}
          strokeWidth={2}
          strokeDasharray="6 4"
          strokeLinecap="round"
          fill="none"
          opacity={0.5}
        />

        {/* User location (pulsing) */}
        <circle cx={188} cy={240} r={18} fill={`${DANGER_RED}15`} className="animate-ring-expand" />
        <circle cx={188} cy={240} r={7} fill={DANGER_RED} />
        <circle cx={188} cy={240} r={4} fill="#FFFFFF" />

        {/* Destination pin */}
        <g transform="translate(290, 92)">
          <circle r={12} fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize="11"
            fontWeight="600"
          >
            {"P"}
          </text>
        </g>
      </svg>

      {/* Gradient fade at bottom */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: 160,
          background: "linear-gradient(to top, #1B2541 30%, transparent)",
        }}
      />
    </div>
  )
}

function AlertBanner() {
  return (
    <div
      className="flex items-center gap-2.5 rounded-[12px] px-4 py-3"
      style={{
        backgroundColor: "rgba(230,57,70,0.1)",
        border: "1px solid rgba(230,57,70,0.2)",
      }}
    >
      <span className="text-[14px]" aria-hidden="true">
        {"!"}
      </span>
      <p className="text-[13px] font-semibold leading-snug" style={{ color: DANGER_RED }}>
        {"Alerte active \u2014 votre cercle a \u00E9t\u00E9 pr\u00E9venu"}
      </p>
    </div>
  )
}

function RouteCard() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setProgress(60), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className="mt-3 rounded-[14px] p-3.5"
      style={{
        backgroundColor: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px]"
            style={{ backgroundColor: "rgba(230,57,70,0.1)" }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M8 1L10.5 6H14L11 9.5L12.5 14.5L8 11.5L3.5 14.5L5 9.5L2 6H5.5L8 1Z"
                stroke={DANGER_RED}
                strokeWidth={1.2}
                strokeLinejoin="round"
                fill={`${DANGER_RED}30`}
              />
            </svg>
          </div>
          <span className="text-[14px] font-semibold leading-snug text-foreground">
            {"En route vers Commissariat 15\u00E8me"}
          </span>
        </div>
        <span
          className="flex-shrink-0 pt-0.5 text-[13px] font-medium tabular-nums"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          ETA 06:55
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-3.5">
        <div
          className="h-1 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${progress}%`,
              backgroundColor: DANGER_RED,
            }}
          />
        </div>
        <p
          className="mt-1.5 text-right text-[12px] tabular-nums"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          12:36
        </p>
      </div>
    </div>
  )
}

export function SosAlertSheet() {
  const [safe, setSafe] = useState(false)

  return (
    <div className="relative flex h-full flex-col" style={{ background: "#0F1729" }}>
      {/* Map behind */}
      <MapBackground />

      {/* Bottom sheet */}
      <div className="relative z-10 mt-auto">
        <div
          className="animate-slide-up rounded-t-[24px] px-5 pb-6 pt-2"
          style={{
            backgroundColor: "#1B2541",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.4)",
          }}
        >
          {/* Drag handle */}
          <div className="flex justify-center py-2">
            <div
              className="rounded-full"
              style={{
                width: 40,
                height: 4,
                backgroundColor: "rgba(255,255,255,0.15)",
              }}
            />
          </div>

          {/* Content */}
          <div className="mt-1">
            <AlertBanner />
            <RouteCard />

            {/* Action buttons */}
            <div className="mt-3.5 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-[12px] py-3 text-[13px] font-semibold text-foreground transition-all duration-150 active:scale-[0.97]"
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                Partager
              </button>
              <button
                type="button"
                className="flex-1 rounded-[12px] py-3 text-[13px] font-semibold text-foreground transition-all duration-150 active:scale-[0.97]"
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                Lieu s{"\u00FB"}r
              </button>
              <button
                type="button"
                onClick={() => setSafe(true)}
                className="flex-[1.4] rounded-[12px] py-3 text-[13px] font-bold text-foreground transition-all duration-200 active:scale-[0.97]"
                style={{
                  backgroundColor: safe ? "rgba(107,166,142,0.25)" : SAGE_GREEN,
                  color: safe ? SAGE_GREEN : "#FFFFFF",
                  border: safe ? `1px solid ${SAGE_GREEN}40` : "1px solid transparent",
                }}
              >
                {safe ? "En s\u00E9curit\u00E9" : "\u2713 Je suis en s\u00E9curit\u00E9"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
