"use client"

function VeilSymbol() {
  return (
    <div className="animate-breathe flex items-center justify-center py-10">
      <svg
        width="120"
        height="160"
        viewBox="0 0 120 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Glow ring */}
        <circle
          cx="60"
          cy="20"
          r="6"
          fill="none"
          stroke="rgba(232,168,56,0.3)"
          strokeWidth="1"
        />

        {/* Central light dot */}
        <circle cx="60" cy="20" r="3" fill="rgba(232,168,56,0.9)" />

        {/* Outer arcs — gold subtle */}
        <path
          d="M 20 20 Q 20 100 60 145"
          stroke="rgba(232,168,56,0.25)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 100 20 Q 100 100 60 145"
          stroke="rgba(232,168,56,0.25)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Middle arcs — purple */}
        <path
          d="M 30 20 Q 30 95 60 138"
          stroke="rgba(139,126,200,0.5)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 90 20 Q 90 95 60 138"
          stroke="rgba(139,126,200,0.5)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Inner arcs — gold bright */}
        <path
          d="M 42 20 Q 42 88 60 130"
          stroke="rgba(232,168,56,0.8)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 78 20 Q 78 88 60 130"
          stroke="rgba(232,168,56,0.8)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Base dot */}
        <circle cx="60" cy="148" r="2" fill="rgba(255,255,255,0.15)" />
      </svg>
    </div>
  )
}

const STATS = [
  { number: "3", label: "proches" },
  { number: "5", label: "centres d\u2019int\u00E9r\u00EAt" },
  { number: "35", label: "fonctionnalit\u00E9s" },
] as const

export function Welcome({ name = "Camille" }: { name?: string }) {
  return (
    <div className="flex h-full flex-col items-center">
      <div className="flex flex-1 flex-col items-center px-6 pb-6">
        {/* Top spacer */}
        <div className="min-h-8 flex-1" />

        {/* Veil symbol */}
        <VeilSymbol />

        {/* Heading */}
        <h1 className="mt-2 text-center font-serif text-[24px] font-light leading-tight text-foreground text-balance">
          {"Bienvenue dans votre communaut\u00E9, "}
          {name}
          {"\u00A0💛"}
        </h1>

        {/* Description */}
        <p
          className="mt-3 text-center text-[14px] font-sans leading-relaxed"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          {"Votre carte est pr\u00EAte. Explorez votre quartier, connectez-vous avec les gens autour de vous."}
        </p>

        {/* Stat pills */}
        <div className="mt-7 flex items-center gap-2">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span className="text-[13px] font-semibold" style={{ color: "#E8A838" }}>
                {stat.number}
              </span>
              <span
                className="text-[12px]"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom spacer */}
        <div className="min-h-8 flex-1" />

        {/* CTA button */}
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-primary py-4 text-[15px] font-bold text-primary-foreground transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
        >
          {"Explorer votre carte communautaire"}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  )
}
