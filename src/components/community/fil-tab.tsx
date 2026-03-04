"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import StoriesRow from "./stories-row";
import FilterChips from "./filter-chips";
import PostCard from "./post-card";

interface FilTabProps {
  isDark: boolean;
  onStoryClick: (index: number) => void;
}

const posts = [
  {
    id: 1,
    type: "alerte" as const,
    user: {
      name: "marie_15e",
      avatar: "M",
      gradientColors: ["#A78BFA", "#8B5CF6"],
    },
    time: "il y a 12 min",
    location: "Rue de Vaugirard",
    title: "⚠️ Attention rue sombre",
    content: "Évitez cette rue après 22h, plusieurs témoignages de harcèlement ces derniers jours. Restez vigilantes.",
    confirmations: 23,
    hasMap: true,
  },
  {
    id: 2,
    type: "bonplan" as const,
    user: {
      name: "sofia_b",
      avatar: "S",
      gradientColors: ["#F5C341", "#F59E0B"],
    },
    time: "il y a 1h",
    location: "Rue du Commerce",
    title: "☕ Café safe avec wifi — accueil jusqu'à 23h",
    content: "Le café 'Chez Louise' est vraiment un endroit sûr pour travailler le soir. Personnel attentif et clientèle respectueuse.",
    likes: 47,
    comments: 12,
    hasImage: true,
  },
  {
    id: 3,
    type: "evenement" as const,
    user: {
      name: "asso_paris15",
      avatar: "A",
      gradientColors: ["#3BB4C1", "#06B6D4"],
      verified: true,
    },
    time: "il y a 3h",
    location: "Place Balard",
    title: "🎉 Marche nocturne sécurisée — Vendredi 21h",
    content: "Rejoignez-nous pour une marche collective dans le quartier. L'union fait la force !",
    date: "Ven. 15 mars",
    participants: 32,
  },
  {
    id: 4,
    type: "quartier" as const,
    user: {
      name: "lea_m",
      avatar: "L",
      gradientColors: ["#34D399", "#10B981"],
    },
    time: "hier",
    title: "",
    content: "Est-ce que quelqu'un connaît un bon itinéraire pour rentrer de la gare Montparnasse le soir ? Je cherche des chemins bien éclairés avec du passage.",
    likes: 15,
    comments: 8,
  },
];

export default function FilTab({ isDark, onStoryClick }: FilTabProps) {
  const [activeFilter, setActiveFilter] = useState("Tous");

  return (
    <div style={{ paddingBottom: 20 }}>
      {/* Stories Row */}
      <StoriesRow isDark={isDark} onStoryClick={onStoryClick} />

      {/* Filter Chips */}
      <FilterChips
        isDark={isDark}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
      />

      {/* Feed */}
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 16 }}>
        {posts.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              delay: index * 0.04,
            }}
          >
            <PostCard post={post} isDark={isDark} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
