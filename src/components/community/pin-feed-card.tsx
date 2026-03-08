"use client";

import { CATEGORY_DETAILS, CATEGORY_GROUPS, SEVERITY } from "@/types";

interface PinFeedCardProps {
  pin: {
    id: string;
    category: string;
    severity: "low" | "med" | "high";
    description?: string;
    address?: string;
    confirmations: number;
    _createdAt: string;
    user: { name: string };
  };
  isDark: boolean;
  onClick?: () => void;
}

function timeAgo(d: string) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "à l'instant";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}j`;
}

export default function PinFeedCard({ pin, isDark, onClick }: PinFeedCardProps) {
  const cat = CATEGORY_DETAILS[pin.category];
  const group = cat ? CATEGORY_GROUPS[cat.group] : null;
  const sev = SEVERITY[pin.severity];
  const accent = group?.color.text ?? "#64748B";

  return (
    <div
      onClick={onClick}
      style={{
        margin: "4px 16px",
        padding: "8px 12px",
        borderRadius: 12,
        background: isDark ? "#1E293B" : "#FFFFFF",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)"}`,
        borderLeft: `3px solid ${accent}`,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      {/* Emoji */}
      <span style={{ fontSize: 18, flexShrink: 0 }}>{cat?.emoji ?? "📍"}</span>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: accent }}>{cat?.label ?? pin.category}</span>
          <span style={{ fontSize: 9.5, fontWeight: 600, padding: "1px 6px", borderRadius: 8, background: `${sev.color}1a`, color: sev.color }}>
            {sev.label}
          </span>
          {pin.confirmations > 1 && (
            <span style={{ fontSize: 10, color: isDark ? "#94A3B8" : "#64748B", fontWeight: 600 }}>✓ {pin.confirmations}</span>
          )}
        </div>
        <div style={{ fontSize: 10.5, color: isDark ? "#64748B" : "#94A3B8", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {pin.address && <>{pin.address} · </>}{timeAgo(pin._createdAt)} · {pin.user.name}
        </div>
      </div>

      {/* Chevron */}
      <span style={{ fontSize: 14, color: isDark ? "#475569" : "#CBD5E1", flexShrink: 0 }}>›</span>
    </div>
  );
}
