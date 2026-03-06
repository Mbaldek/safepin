"use client";

import { motion } from "framer-motion";
import { Search, PenSquare, X } from "lucide-react";

interface HeaderProps {
  isDark: boolean;
  onCompose: () => void;
  onClose: () => void;
}

export default function Header({ isDark, onCompose, onClose }: HeaderProps) {
  return (
    <div
      style={{
        padding: "16px 16px 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
      }}
    >
      {/* Left side */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            fontSize: 19,
            fontWeight: 600,
            color: isDark ? "#FFFFFF" : "#0F172A",
          }}
        >
          Communauté
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
          <span style={{ fontSize: 12 }}>📍</span>
          <span
            style={{
              fontSize: 12,
              color: "#3BB4C1",
              fontWeight: 500,
            }}
          >
            Paris 15e
          </span>
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <motion.button
          whileTap={{ scale: 0.95 }}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            backgroundColor: isDark ? "#243050" : "#F1F5F9",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Search size={18} style={{ color: isDark ? "#FFFFFF" : "#0F172A" }} />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onCompose}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            backgroundColor: isDark ? "#243050" : "#F1F5F9",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <PenSquare size={18} style={{ color: isDark ? "#FFFFFF" : "#0F172A" }} />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            backgroundColor: isDark ? "#243050" : "#F1F5F9",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={18} style={{ color: isDark ? "#FFFFFF" : "#0F172A" }} />
        </motion.button>
      </div>
    </div>
  );
}
