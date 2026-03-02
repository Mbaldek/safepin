import type { PinSeverity } from "./map-pins"

const SEVERITY_COLORS: Record<PinSeverity, string> = {
  mild: "#F4A940",
  moderate: "#E8A838",
  danger: "#E63946",
}

const SEVERITY_LABELS: Record<PinSeverity, string> = {
  mild: "Faible",
  moderate: "Mod\u00E9r\u00E9",
  danger: "Grave",
}

interface IncidentCardProps {
  emoji: string
  type: string
  address: string
  time: string
  verifications: number
  severity: PinSeverity
}

export function IncidentCard({
  emoji,
  type,
  address,
  time,
  verifications,
  severity,
}: IncidentCardProps) {
  const color = SEVERITY_COLORS[severity]
  const label = SEVERITY_LABELS[severity]
  const isDanger = severity === "danger"

  return (
    <div
      className="flex items-start gap-3 rounded-[14px] p-[14px] transition-colors duration-200"
      style={{
        backgroundColor: isDanger
          ? "rgba(230,57,70,0.03)"
          : "rgba(255,255,255,0.04)",
        border: `1px solid ${isDanger ? "rgba(230,57,70,0.15)" : "rgba(255,255,255,0.08)"}`,
        borderLeft: isDanger ? `3px solid #E63946` : undefined,
      }}
    >
      {/* Emoji circle */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
        style={{ backgroundColor: `${color}15` }}
        aria-hidden="true"
      >
        {emoji}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-[14px] font-semibold text-foreground">
          {type}
        </span>
        <span
          className="text-[12px]"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          {address}
        </span>
        <span
          className="text-[11px]"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          {time}
          {" \u00B7 "}
          {verifications}
          {" v\u00E9rifications"}
        </span>
      </div>

      {/* Severity badge */}
      <div
        className="shrink-0 self-start rounded-full px-2 py-0.5 text-[10px] font-semibold"
        style={{
          backgroundColor: `${color}18`,
          color: color,
        }}
      >
        {label}
      </div>
    </div>
  )
}
