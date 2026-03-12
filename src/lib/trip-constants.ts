import type React from "react";

export type Trip = {
  id: string;
  to_label: string | null;
  planned_duration_s: number | null;
  danger_score: number | null;
  distance_m: number | null;
  mode: string | null;
  status: string | null;
  started_at: string;
};

export type SavedPlace = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  icon: string | null;
};

export type CircleContact = {
  id: string;
  name: string;
  avatar_url: string | null;
};

// Brand colors
export const colors = {
  sheet: { dark: "#1A2540", light: "#FFFFFF" },
  card: { dark: "#1E293B", light: "#F8FAFC" },
  elevated: { dark: "#243050", light: "#F1F5F9" },
  cyan: "#3BB4C1",
  gold: "#F5C341",
  success: "#34D399",
  danger: "#EF4444",
  purple: "#A78BFA",
  warning: "#FBBF24",
  textPrimary: { dark: "#FFFFFF", light: "#0F172A" },
  textSecondary: { dark: "#94A3B8", light: "#475569" },
  textTertiary: { dark: "#64748B", light: "#94A3B8" },
};

// Spring animation config
export const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

// No scrollbar styles
export const noScrollbar: React.CSSProperties = {
  overflow: "auto",
  scrollbarWidth: "none",
  msOverflowStyle: "none",
};

// Shared card style helper (theme-dependent, call at render time)
export const getCardStyle = (isDark: boolean): React.CSSProperties => ({
  backgroundColor: colors.card[isDark ? "dark" : "light"],
  borderRadius: 14,
  border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
});

// Shared elevated style helper (theme-dependent, call at render time)
export const getElevatedStyle = (isDark: boolean): React.CSSProperties => ({
  backgroundColor: colors.elevated[isDark ? "dark" : "light"],
  borderRadius: 14,
  border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
});

export const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export const formatElapsed = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};
