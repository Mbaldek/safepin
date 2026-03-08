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
    photo_url?: string | null;
    user: {
      name: string;
      avatar: string;
      avatarUrl?: string | null;
      gradientColors: string[];
    };
  };
  isDark: boolean;
  onClick?: () => void;
}

function timeAgo(d: string) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)}h`;
  return `il y a ${Math.floor(s / 86400)}j`;
}

export default function PinFeedCard({ pin, isDark, onClick }: PinFeedCardProps) {
  const cat = CATEGORY_DETAILS[pin.category];
  const group = cat ? CATEGORY_GROUPS[cat.group] : null;
  const sev = SEVERITY[pin.severity];
  const accentColor = group?.color.text ?? "#64748B";

  return (
    <div
      onClick={onClick}
      style={{
        margin: "6px 16px",
        padding: "12px 14px",
        borderRadius: 16,
        background: isDark ? "#1E293B" : "#FFFFFF",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)"}`,
        borderLeft: `3px solid ${accentColor}`,
        cursor: onClick ? "pointer" : undefined,
        transition: "box-shadow 0.15s",
      }}
    >
      {/* Header: category + severity */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 16 }}>{cat?.emoji ?? "📍"}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: accentColor }}>
            {cat?.label ?? pin.category}
          </span>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 10,
            background: `${sev.color}1a`,
            color: sev.color,
          }}
        >
          {sev.label}
        </span>
      </div>

      {/* Description */}
      {pin.description && (
        <p
          style={{
            fontSize: 12.5,
            lineHeight: 1.45,
            color: isDark ? "#E2E8F0" : "#334155",
            margin: "0 0 8px",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {pin.description}
        </p>
      )}

      {/* Footer: address, time, confirmations, reporter */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: isDark ? "#64748B" : "#94A3B8", minWidth: 0, flex: 1 }}>
          {pin.address && (
            <>
              <span>📍</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {pin.address}
              </span>
              <span style={{ margin: "0 2px" }}>·</span>
            </>
          )}
          <span style={{ whiteSpace: "nowrap" }}>{timeAgo(pin._createdAt)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 8 }}>
          {pin.confirmations > 1 && (
            <span style={{ color: isDark ? "#94A3B8" : "#64748B", fontWeight: 600 }}>
              ✓ {pin.confirmations}
            </span>
          )}
          <span style={{ color: isDark ? "#64748B" : "#94A3B8" }}>
            par {pin.user.name}
          </span>
        </div>
      </div>
    </div>
  );
}
