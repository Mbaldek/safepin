"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Search, PenSquare, X } from "lucide-react";

interface HeaderProps {
  isDark: boolean;
  onCompose: () => void;
  onClose: () => void;
  onSearch?: (query: string) => void;
  forceOpen?: boolean;
  searchValue?: string;
}

export default function Header({ isDark, onCompose, onClose, onSearch, forceOpen, searchValue }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync forceOpen from parent
  useEffect(() => {
    if (forceOpen) setSearchOpen(true);
  }, [forceOpen]);

  // Sync searchValue from parent (e.g. hashtag click)
  useEffect(() => {
    if (searchValue !== undefined) setSearchQuery(searchValue);
  }, [searchValue]);

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  const handleCloseSearch = () => {
    setSearchQuery("");
    setSearchOpen(false);
    onSearch?.("");
  };

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
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
        {searchOpen ? (
          <input
            ref={inputRef}
            placeholder="Rechercher... #hashtag, mot-clé"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              onSearch?.(e.target.value);
            }}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 14,
              fontWeight: 600,
              color: textColor,
              flex: 1,
              minWidth: 0,
              padding: 0,
            }}
          />
        ) : (
          <>
            <span style={{ fontSize: 19, fontWeight: 600, color: textColor }}>
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
              <span style={{ fontSize: 12, color: "#3BB4C1", fontWeight: 500 }}>
                Paris 15e
              </span>
            </div>
          </>
        )}
      </div>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {searchOpen ? (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleCloseSearch}
            style={{
              width: 28, height: 28, borderRadius: "50%",
              backgroundColor: btnBg, border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={14} style={{ color: textColor }} />
          </motion.button>
        ) : (
          <>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setSearchOpen(true)}
              style={{
                width: 36, height: 36, borderRadius: "50%",
                backgroundColor: btnBg, border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Search size={18} style={{ color: textColor }} />
            </motion.button>
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
          </>
        )}
      </div>
    </div>
  );
}
