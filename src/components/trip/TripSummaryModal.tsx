"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { colors, spring, getCardStyle } from "@/lib/trip-constants";

interface TripSummaryModalProps {
  isOpen: boolean;
  destination: string;
  tripSummary: { duration_s: number; distance_m: number; score: number } | null;
  elapsedSeconds: number;
  distanceM: number;
  isDark: boolean;
  onClose: () => void;
}

export default function TripSummaryModal({
  destination,
  tripSummary,
  elapsedSeconds,
  distanceM,
  isDark,
  onClose,
}: TripSummaryModalProps) {
  const theme = isDark ? "dark" : "light";
  const cardStyle = getCardStyle(isDark);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={spring}
        style={{
          width: "min(340px, 90vw)",
          padding: "28px 20px 20px",
          borderRadius: 24,
          backgroundColor: colors.sheet[theme],
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Success icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ duration: 0.5 }}
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            backgroundColor: `${colors.success}20`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Check size={36} color={colors.success} />
        </motion.div>

        <h1 style={{ fontSize: 19, fontWeight: 300, color: colors.textPrimary[theme], margin: "0 0 6px" }}>
          Vous êtes arrivée !
        </h1>
        <p style={{ fontSize: 14, color: colors.textSecondary[theme], margin: "0 0 4px" }}>
          {destination || "Gare du Nord"}
        </p>
        <p style={{ fontSize: 12, color: colors.textTertiary[theme], margin: "0 0 24px" }}>
          Trajet enregistré · {Math.round((tripSummary?.duration_s ?? elapsedSeconds) / 60)} min · {((tripSummary?.distance_m ?? distanceM) / 1000).toFixed(1)} km
        </p>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, width: "100%", marginBottom: 24 }}>
          {[
            { value: String(Math.round((tripSummary?.duration_s ?? elapsedSeconds) / 60)), unit: "min", delay: 0 },
            { value: ((tripSummary?.distance_m ?? distanceM) / 1000).toFixed(1), unit: "km", delay: 0.05 },
            { value: (tripSummary?.score ?? 0).toFixed(1), unit: "score", delay: 0.1 },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: stat.delay, ...spring }}
              style={{
                ...cardStyle,
                padding: "14px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 600, color: colors.textPrimary[theme] }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: colors.textTertiary[theme] }}>{stat.unit}</div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.97 }}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: 14,
            backgroundColor: colors.cyan,
            border: "none",
            fontSize: 15,
            fontWeight: 700,
            color: "white",
            cursor: "pointer",
          }}
        >
          Retour
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
