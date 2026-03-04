"use client";

import { motion } from "framer-motion";

interface FilterChipsProps {
  isDark: boolean;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
}

const filters = [
  { id: "Tous", label: "Tous" },
  { id: "Alertes", label: "🚨 Alertes" },
  { id: "Événements", label: "🎉 Événements" },
  { id: "Bons plans", label: "🛍 Bons plans" },
  { id: "Quartier", label: "👥 Quartier" },
];

export default function FilterChips({ isDark, activeFilter, setActiveFilter }: FilterChipsProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        padding: "0 16px 16px",
        overflowX: "auto",
      }}
    >
      {filters.map((filter) => (
        <motion.button
          key={filter.id}
          onClick={() => setActiveFilter(filter.id)}
          whileTap={{ scale: 0.95 }}
          animate={{
            scale: activeFilter === filter.id ? 1 : 1,
          }}
          style={{
            padding: "8px 14px",
            borderRadius: 20,
            border:
              activeFilter === filter.id
                ? "1px solid #3BB4C1"
                : `1px solid ${isDark ? "#334155" : "#E2E8F0"}`,
            backgroundColor:
              activeFilter === filter.id
                ? "rgba(59, 180, 193, 0.15)"
                : "transparent",
            color: activeFilter === filter.id ? "#3BB4C1" : isDark ? "#94A3B8" : "#64748B",
            fontSize: 13,
            fontWeight: 500,
            whiteSpace: "nowrap",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {filter.label}
        </motion.button>
      ))}
    </div>
  );
}
