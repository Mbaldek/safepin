"use client";

import { motion } from "framer-motion";
import { PenSquare, X } from "lucide-react";

export interface HashtagSuggestion {
  tag: string;
  count: number;
  category?: string;
  color?: string;
}

interface HeaderProps {
  isDark: boolean;
  onCompose: () => void;
  onClose: () => void;
  onSearchToggle?: () => void;
  searchOpen?: boolean;
}

export default function Header({ isDark, onCompose, onClose }: HeaderProps) {
  const textColor = isDark ? "#FFFFFF" : "#0F172A";
  const btnBg = isDark ? "#243050" : "#F1F5F9";

  return (
    <div
      style={{
        padding: "16px 16px 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
      }}
    >
      {/* Left side */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: textColor }}>
          Communaute
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 10px",
            borderRadius: 20,
            backgroundColor: isDark ? "rgba(59, 180, 193, 0.15)" : "rgba(59, 180, 193, 0.1)",
          }}
        >
          <span style={{ fontSize: 11 }}>📍</span>
          <span style={{ fontSize: 11, color: "#3BB4C1", fontWeight: 500 }}>
            Paris 15e
          </span>
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onCompose}
          style={{
            width: 36, height: 36, borderRadius: "50%",
            backgroundColor: btnBg, border: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <PenSquare size={18} style={{ color: textColor }} />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          style={{
            width: 36, height: 36, borderRadius: "50%",
            backgroundColor: btnBg, border: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={18} style={{ color: textColor }} />
        </motion.button>
      </div>
    </div>
  );
}
