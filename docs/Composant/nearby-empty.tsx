export function NearbyEmpty() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12">
      {/* Warm glow background */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: 120,
          height: 120,
          background:
            "radial-gradient(circle, rgba(232,168,56,0.08) 0%, transparent 70%)",
        }}
      >
        {/* Veil symbol at low opacity */}
        <svg
          width="60"
          height="80"
          viewBox="0 0 120 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          style={{ opacity: 0.15 }}
        >
          {/* Central light dot */}
          <circle cx="60" cy="20" r="4" fill="rgba(232,168,56,0.9)" />
          {/* Glow ring */}
          <circle
            cx="60"
            cy="20"
            r="8"
            fill="none"
            stroke="rgba(232,168,56,0.3)"
            strokeWidth="1"
          />

          {/* Outer arcs - gold subtle */}
          <path
            d="M 20 20 Q 20 100 60 145"
            stroke="rgba(232,168,56,0.4)"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 100 20 Q 100 100 60 145"
            stroke="rgba(232,168,56,0.4)"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Middle arcs - purple */}
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

          {/* Inner arcs - gold bright */}
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

      {/* Copy */}
      <p className="mt-4 text-center text-[16px] font-medium text-foreground">
        {"Tout est calme autour de vous \u2600\uFE0F"}
      </p>
      <p
        className="mt-1 text-center text-[13px]"
        style={{ color: "rgba(255,255,255,0.45)" }}
      >
        {"Bonne nouvelle\u00A0!"}
      </p>
    </div>
  )
}
