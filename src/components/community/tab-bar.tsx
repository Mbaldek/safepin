"use client";

import { motion } from "framer-motion";

interface TabBarProps {
  tabs: string[];
  activeTab: number;
  setActiveTab: (index: number) => void;
  isDark: boolean;
}

export default function TabBar({ tabs, activeTab, setActiveTab, isDark }: TabBarProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 24,
        position: "relative",
        backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
        borderBottom: `1px solid ${isDark ? "#1E293B" : "#E2E8F0"}`,
      }}
    >
      {tabs.map((tab, index) => (
        <motion.button
          key={tab}
          onClick={() => setActiveTab(index)}
          style={{
            position: "relative",
            padding: "10px 0",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: activeTab === index ? 600 : 400,
            color: activeTab === index ? "#3BB4C1" : isDark ? "#64748B" : "#94A3B8",
            transition: "color 0.2s",
          }}
          whileTap={{ scale: 0.95 }}
        >
          {tab}
          {activeTab === index && (
            <motion.div
              layoutId="tab-indicator"
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 3,
                backgroundColor: "#3BB4C1",
                borderRadius: "3px 3px 0 0",
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
        </motion.button>
      ))}
    </div>
  );
}
