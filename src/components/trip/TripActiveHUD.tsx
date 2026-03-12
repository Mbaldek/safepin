"use client";

import { motion } from "framer-motion";
import { Share2, AlertTriangle } from "lucide-react";
import { colors, spring, noScrollbar, getCardStyle, getElevatedStyle, formatElapsed } from "@/lib/trip-constants";
import type { CircleContact } from "@/lib/trip-constants";

const CONTACT_COLORS = [colors.purple, colors.cyan, colors.gold, colors.success, "#60A5FA", "#F97316"];

function Avatar({ name, color, size = 36, isDark }: { name: string; color: string; size?: number; isDark: boolean }) {
  const theme = isDark ? "dark" : "light";
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `${color}30`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontWeight: 600,
        color: color,
        border: `2px solid ${colors.sheet[theme]}`,
        flexShrink: 0,
      }}
    >
      {name[0]}
    </div>
  );
}

interface TripActiveHUDProps {
  destination: string;
  elapsedSeconds: number;
  plannedDurationS: number;
  distanceM: number;
  circleContacts: CircleContact[];
  circleEnabled: boolean;
  isSharingLocation: boolean;
  isDark: boolean;
  onComplete: () => void;
  onSOS: () => void;
  onToggleSharing: () => void;
}

export default function TripActiveHUD({
  destination,
  elapsedSeconds,
  plannedDurationS,
  distanceM,
  circleContacts,
  isSharingLocation,
  isDark,
  onComplete,
  onSOS,
  onToggleSharing,
}: TripActiveHUDProps) {
  const theme = isDark ? "dark" : "light";
  const cardStyle = getCardStyle(isDark);
  const elevatedStyle = getElevatedStyle(isDark);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={spring}
      style={{ ...noScrollbar, height: "100%", padding: "0 20px 20px" }}
    >
      {/* Destination card */}
      <div style={{ ...cardStyle, padding: "14px", marginBottom: 12, borderRadius: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: colors.textPrimary[theme], margin: "0 0 3px" }}>
              {destination || "Gare du Nord"}
            </h2>
            <p style={{ fontSize: 12, color: colors.warning, margin: 0 }}>
              ~{Math.max(0, Math.round((plannedDurationS - elapsedSeconds) / 60))} min · {(Math.max(0, distanceM * (1 - (plannedDurationS > 0 ? elapsedSeconds / plannedDurationS : 0))) / 1000).toFixed(1)} km restants
            </p>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: colors.textPrimary[theme], fontVariantNumeric: "tabular-nums" }}>
              {formatElapsed(elapsedSeconds)}
            </div>
            <div style={{ fontSize: 10, color: colors.textTertiary[theme] }}>écoulé</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, backgroundColor: colors.elevated[theme], borderRadius: 3, marginTop: 12, overflow: "hidden" }}>
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: `${Math.min(100, plannedDurationS > 0 ? (elapsedSeconds / plannedDurationS) * 100 : 0)}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{
              height: "100%",
              background: `linear-gradient(90deg, ${colors.cyan}, ${colors.success})`,
              borderRadius: 3,
            }}
          />
        </div>
      </div>

      {/* Status chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {circleContacts.length > 0 && (
          <span style={{ fontSize: 11, fontWeight: 500, padding: "5px 10px", borderRadius: 16, backgroundColor: `${colors.purple}15`, color: colors.purple }}>
            {circleContacts.length} proches
          </span>
        )}
        {isSharingLocation && (
          <span style={{ fontSize: 11, fontWeight: 500, padding: "5px 10px", borderRadius: 16, backgroundColor: `${colors.success}15`, color: colors.success }}>
            Position partagée
          </span>
        )}
      </div>

      {/* Action row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onToggleSharing}
          style={{
            ...elevatedStyle,
            padding: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            cursor: "pointer",
            border: isSharingLocation ? `1px solid ${colors.success}40` : undefined,
            backgroundColor: isSharingLocation ? `${colors.success}15` : colors.elevated[theme],
          }}
        >
          <Share2 size={16} color={isSharingLocation ? colors.success : colors.textPrimary[theme]} />
          <span style={{ fontSize: 13, fontWeight: 500, color: isSharingLocation ? colors.success : colors.textPrimary[theme] }}>
            {isSharingLocation ? "Partagé \u2713" : "Partager"}
          </span>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onSOS}
          style={{
            padding: "12px",
            borderRadius: 14,
            backgroundColor: colors.danger,
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            cursor: "pointer",
          }}
        >
          <AlertTriangle size={16} color="white" />
          <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>SOS</span>
        </motion.button>
      </div>

      {/* Hero CTA */}
      <motion.button
        onClick={onComplete}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.97 }}
        style={{
          width: "100%",
          padding: "14px",
          borderRadius: 14,
          background: "linear-gradient(135deg, #F5C341, #E8A800)",
          boxShadow: "0 4px 20px rgba(245,195,65,0.3)",
          border: "none",
          fontSize: 15,
          fontWeight: 700,
          color: "white",
          cursor: "pointer",
          marginBottom: 12,
        }}
      >
        Je suis arrivée \u2713
      </motion.button>

      {/* Watchers */}
      {circleContacts.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
          <div style={{ display: "flex" }}>
            {circleContacts.slice(0, 3).map((c, i) => (
              <div key={c.id} style={{ marginLeft: i > 0 ? -8 : 0 }}>
                <Avatar name={c.name} color={CONTACT_COLORS[i % CONTACT_COLORS.length]} size={26} isDark={isDark} />
              </div>
            ))}
          </div>
          <span style={{ fontSize: 11, color: colors.textTertiary[theme] }}>
            {circleContacts.length <= 2
              ? circleContacts.map((c) => c.name).join(" et ") + " vous suivent"
              : `${circleContacts[0].name}, ${circleContacts[1].name} et ${circleContacts.length - 2} autre${circleContacts.length - 2 > 1 ? "s" : ""} vous suivent`}
          </span>
        </div>
      )}
    </motion.div>
  );
}
