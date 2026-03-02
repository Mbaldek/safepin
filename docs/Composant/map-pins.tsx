export type PinSeverity = "mild" | "moderate" | "danger"

const PIN_CONFIG: Record<
  PinSeverity,
  { size: number; fill: string; glowColor: string; animClass: string }
> = {
  mild: {
    size: 12,
    fill: "#F4A940",
    glowColor: "",
    animClass: "",
  },
  moderate: {
    size: 14,
    fill: "#E8A838",
    glowColor: "",
    animClass: "animate-pin-pulse",
  },
  danger: {
    size: 16,
    fill: "#E63946",
    glowColor: "rgba(230,57,70,0.2)",
    animClass: "animate-danger-glow",
  },
}

interface MapPinProps {
  severity: PinSeverity
  className?: string
}

export function MapPin({ severity, className = "" }: MapPinProps) {
  const config = PIN_CONFIG[severity]
  const isDanger = severity === "danger"
  // total SVG canvas: circle + 2px white border + 8px glow ring (danger only)
  const outerPad = isDanger ? 12 : 6
  const svgSize = config.size + outerPad * 2
  const cx = svgSize / 2
  const cy = svgSize / 2
  const r = config.size / 2

  return (
    <svg
      width={svgSize}
      height={svgSize}
      viewBox={`0 0 ${svgSize} ${svgSize}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${config.animClass} ${className}`}
      style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.3))" }}
      role="img"
      aria-label={`${severity} severity incident pin`}
    >
      {/* Outer glow ring — danger only */}
      {isDanger && (
        <circle
          cx={cx}
          cy={cy}
          r={r + 6}
          fill="none"
          stroke={config.glowColor}
          strokeWidth="4"
        />
      )}

      {/* White border (2px) */}
      <circle cx={cx} cy={cy} r={r + 2} fill="#FFFFFF" />

      {/* Colored fill */}
      <circle cx={cx} cy={cy} r={r} fill={config.fill} />

      {/* Inner highlight for depth */}
      <circle
        cx={cx - r * 0.18}
        cy={cy - r * 0.18}
        r={r * 0.32}
        fill="rgba(255,255,255,0.3)"
      />
    </svg>
  )
}
