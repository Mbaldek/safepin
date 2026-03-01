"use client"

import { ProgressBar } from "./progress-bar"

function MapIllustration() {
  return (
    <div
      className="relative mx-auto w-full overflow-hidden rounded-[16px]"
      style={{
        backgroundColor: "#0F1729",
        height: 220,
      }}
    >
      {/* Grid lines */}
      <svg
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Horizontal streets */}
        <line x1="0" y1="55" x2="100%" y2="55" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        <line x1="0" y1="110" x2="100%" y2="110" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        <line x1="0" y1="165" x2="100%" y2="165" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        {/* Vertical streets */}
        <line x1="80" y1="0" x2="80" y2="100%" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        <line x1="165" y1="0" x2="165" y2="100%" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        <line x1="245" y1="0" x2="245" y2="100%" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

        {/* Connecting lines between pins */}
        <line x1="90" y1="75" x2="190" y2="125" stroke="rgba(232,168,56,0.15)" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="190" y1="125" x2="270" y2="80" stroke="rgba(139,126,200,0.15)" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="190" y1="125" x2="155" y2="170" stroke="rgba(107,166,142,0.15)" strokeWidth="1" strokeDasharray="4 4" />

        {/* Subtle building blocks */}
        <rect x="100" y="30" width="45" height="20" rx="3" fill="rgba(255,255,255,0.02)" />
        <rect x="200" y="140" width="30" height="35" rx="3" fill="rgba(255,255,255,0.02)" />
        <rect x="50" y="130" width="35" height="25" rx="3" fill="rgba(255,255,255,0.02)" />
      </svg>

      {/* Pin 1 — Gold — Lieux proches */}
      <div className="absolute" style={{ left: 60, top: 58 }}>
        <div className="flex flex-col items-center">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: "#E8A838", boxShadow: "0 0 16px rgba(232,168,56,0.35)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1B2541" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div
            className="mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap"
            style={{
              backgroundColor: "rgba(232,168,56,0.15)",
              color: "#E8A838",
            }}
          >
            Lieux proches
          </div>
        </div>
      </div>

      {/* Pin 2 — Purple — Itinéraires intelligents */}
      <div className="absolute" style={{ left: 230, top: 50 }}>
        <div className="flex flex-col items-center">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: "#8B7EC8", boxShadow: "0 0 16px rgba(139,126,200,0.35)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1B2541" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
              <line x1="9" y1="3" x2="9" y2="18" />
              <line x1="15" y1="6" x2="15" y2="21" />
            </svg>
          </div>
          <div
            className="mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap"
            style={{
              backgroundColor: "rgba(139,126,200,0.15)",
              color: "#8B7EC8",
            }}
          >
            {"Itin\u00E9raires intelligents"}
          </div>
        </div>
      </div>

      {/* Pin 3 — Green — Communauté locale */}
      <div className="absolute" style={{ left: 120, top: 145 }}>
        <div className="flex flex-col items-center">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: "#6BA68E", boxShadow: "0 0 16px rgba(107,166,142,0.35)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1B2541" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div
            className="mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap"
            style={{
              backgroundColor: "rgba(107,166,142,0.15)",
              color: "#6BA68E",
            }}
          >
            {"Communaut\u00E9 locale"}
          </div>
        </div>
      </div>

      {/* Subtle radial glow center */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 120,
          height: 120,
          background: "radial-gradient(circle, rgba(232,168,56,0.06) 0%, transparent 70%)",
        }}
      />
    </div>
  )
}

export function PermissionLocation() {
  return (
    <div className="flex h-full flex-col">
      {/* Progress bar */}
      <div className="px-6 pt-3">
        <ProgressBar progress={65} />
      </div>

      <div className="flex flex-1 flex-col px-6 pb-6">
        {/* Skip */}
        <div className="flex justify-end pt-5 pb-6">
          <button
            type="button"
            className="text-[13px] font-sans transition-colors hover:text-foreground"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            Skip
          </button>
        </div>

        {/* Map illustration */}
        <MapIllustration />

        {/* Text */}
        <h1 className="mt-7 font-serif text-[26px] font-light leading-tight text-foreground text-balance">
          Activer la localisation
        </h1>
        <p
          className="mt-2 text-[14px] font-sans leading-relaxed"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          {"Voyez ce qui se passe autour de vous et laissez votre cercle savoir o\u00F9 vous \u00EAtes."}
        </p>

        {/* Spacer */}
        <div className="flex-1 min-h-8" />

        {/* Primary button */}
        <button
          type="button"
          className="w-full rounded-[14px] bg-primary py-4 text-[15px] font-bold text-primary-foreground transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
        >
          Activer la localisation
        </button>

        {/* Secondary link */}
        <button
          type="button"
          className="mt-3 w-full py-2 text-center text-[14px] font-sans transition-colors hover:text-foreground"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          Plus tard
        </button>
      </div>
    </div>
  )
}
