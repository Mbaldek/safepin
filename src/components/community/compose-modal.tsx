"use client";

import { motion } from "framer-motion";
import { X, MapPin, Users, Lock, Image, ChevronRight } from "lucide-react";
import { useState } from "react";

interface ComposeModalProps {
  isDark: boolean;
  onClose: () => void;
}

const postTypes = [
  { id: "alerte", label: "🚨 Alerte", color: "#EF4444" },
  { id: "bonplan", label: "📍 Bon plan", color: "#F5C341" },
  { id: "evenement", label: "🎉 Événement", color: "#A78BFA" },
  { id: "post", label: "💬 Post", color: "#3BB4C1" },
];

const placeholders: Record<string, string> = {
  alerte: "Décrivez la situation à signaler...",
  bonplan: "Partagez votre bon plan...",
  evenement: "Décrivez votre événement...",
  post: "Qu'avez-vous à partager ?",
};

export default function ComposeModal({ isDark, onClose }: ComposeModalProps) {
  const [selectedType, setSelectedType] = useState("post");
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState<"public" | "cercle">("public");

  const activeColor = postTypes.find((t) => t.id === selectedType)?.color || "#3BB4C1";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
          borderRadius: "24px 24px 0 0",
          maxHeight: "90%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: `1px solid ${isDark ? "#1E293B" : "#E2E8F0"}`,
          }}
        >
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
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
          <span
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: isDark ? "#FFFFFF" : "#0F172A",
            }}
          >
            Nouveau post
          </span>
          <motion.button
            whileTap={{ scale: 0.95 }}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              backgroundColor: activeColor,
              border: "none",
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Publier
          </motion.button>
        </div>

        {/* Post type selector */}
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "16px 20px",
            overflowX: "auto",
          }}
        >
          {postTypes.map((type) => (
            <motion.button
              key={type.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedType(type.id)}
              style={{
                padding: "8px 14px",
                borderRadius: 20,
                border:
                  selectedType === type.id
                    ? `2px solid ${type.color}`
                    : `1px solid ${isDark ? "#334155" : "#E2E8F0"}`,
                backgroundColor:
                  selectedType === type.id
                    ? `${type.color}20`
                    : "transparent",
                color: selectedType === type.id ? type.color : isDark ? "#94A3B8" : "#64748B",
                fontSize: 13,
                fontWeight: 500,
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
            >
              {type.label}
            </motion.button>
          ))}
        </div>

        {/* Content area */}
        <div style={{ padding: "0 20px", flex: 1 }}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholders[selectedType]}
            style={{
              width: "100%",
              height: 150,
              padding: 16,
              borderRadius: 12,
              border: `1px solid ${isDark ? "#334155" : "#E2E8F0"}`,
              backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
              color: isDark ? "#FFFFFF" : "#0F172A",
              fontSize: 15,
              lineHeight: 1.6,
              resize: "none",
              outline: "none",
            }}
          />
        </div>

        {/* Options */}
        <div style={{ padding: "16px 20px" }}>
          {/* Location */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
              borderRadius: 12,
              marginBottom: 12,
              border: `1px solid ${isDark ? "#334155" : "#E2E8F0"}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <MapPin size={18} style={{ color: "#F5C341" }} />
              <span style={{ fontSize: 14, color: isDark ? "#FFFFFF" : "#0F172A" }}>
                Paris 15e
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 13, color: "#3BB4C1" }}>Changer</span>
              <ChevronRight size={16} style={{ color: "#3BB4C1" }} />
            </div>
          </div>

          {/* Audience */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
              borderRadius: 12,
              marginBottom: 12,
              border: `1px solid ${isDark ? "#334155" : "#E2E8F0"}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {audience === "public" ? (
                <Users size={18} style={{ color: "#3BB4C1" }} />
              ) : (
                <Lock size={18} style={{ color: "#A78BFA" }} />
              )}
              <span style={{ fontSize: 14, color: isDark ? "#FFFFFF" : "#0F172A" }}>
                {audience === "public" ? "Tout le quartier" : "Mon cercle"}
              </span>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setAudience(audience === "public" ? "cercle" : "public")}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                backgroundColor: isDark ? "#243050" : "#F1F5F9",
                border: "none",
                color: isDark ? "#94A3B8" : "#64748B",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Changer
            </motion.button>
          </div>

          {/* Add photo */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              padding: "12px 16px",
              backgroundColor: "transparent",
              borderRadius: 12,
              border: `1px dashed ${isDark ? "#334155" : "#E2E8F0"}`,
              color: isDark ? "#64748B" : "#94A3B8",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            <Image size={18} />
            <span>Ajouter une photo</span>
          </motion.button>
        </div>

        {/* Safe area spacer */}
        <div style={{ height: 20 }} />
      </motion.div>
    </motion.div>
  );
}
