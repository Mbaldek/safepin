"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Map,
  Star,
  Signal,
  Users,
  Clock,
  Shield,
  Search,
  AlertTriangle,
  Share2,
  Check,
  Plus,
  Trash2,
  Repeat2,
} from "lucide-react";
import { fetchDirectionsMulti, formatDuration, formatDistance } from "@/lib/directions";
import { scoreRoute } from "@/lib/route-scoring";
import RouteCard from "@/components/trip/RouteCard";
import type { RouteOption } from "@/stores/useStore";
import { useTheme } from "@/stores/useTheme";
import { useStore } from "@/stores/useStore";
import { supabase } from "@/lib/supabase";
import AutocompleteInput from "@/components/AutocompleteInput";
import FavorisSheet from "@/components/trip/FavorisSheet";

type Trip = {
  id: string;
  destination: string | null;
  duration_min: number | null;
  safety_score: number | null;
  created_at: string;
};

type SavedPlace = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  icon: string | null;
};

type CircleContact = {
  id: string;
  name: string;
  avatar_url: string | null;
};

// Brand colors
const colors = {
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
const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

// No scrollbar styles
const noScrollbar: React.CSSProperties = {
  overflow: "auto",
  scrollbarWidth: "none",
  msOverflowStyle: "none",
};

type AppState = "idle" | "walk" | "planifier" | "active" | "arrived" | "favoris" | "history";
type WalkSubState = "intro" | "notifying" | "responding" | "active";

interface TripViewProps {
  onClose: () => void;
}

export default function TripView({ onClose }: TripViewProps) {
  const isDark = useTheme((s) => s.theme) === "dark";
  const userId = useStore((s) => s.userId);
  const isSharingLocation = useStore((s) => s.isSharingLocation);
  const setIsSharingLocation = useStore((s) => s.setIsSharingLocation);
  const setPendingRoutes = useStore((s) => s.setPendingRoutes);
  const setActiveRoute = useStore((s) => s.setActiveRoute);
  const pins = useStore((s) => s.pins);
  const [state, setState] = useState<AppState>("idle");
  const [walkSubState, setWalkSubState] = useState<WalkSubState>("intro");
  const [circleEnabled, setCircleEnabled] = useState(false);
  const [destination, setDestination] = useState("");
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [tripId, setTripId] = useState<string | null>(null);
  const [circleContacts, setCircleContacts] = useState<CircleContact[]>([]);
  const [destCoords, setDestCoords] = useState<[number, number] | null>(null);
  const [tripSummary, setTripSummary] = useState<{ duration_s: number; distance_m: number; score: number } | null>(null);
  const [favAddMode, setFavAddMode] = useState(false);
  const [sharingStoppedLocal, setSharingStoppedLocal] = useState(false);
  const [plannedDurationS, setPlannedDurationS] = useState(0);
  const [distanceM, setDistanceM] = useState(0);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  );

  // Fetch recent trips + saved places
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("trips")
      .select("id, destination, duration_min, safety_score, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => { if (data) setRecentTrips(data); });
    supabase
      .from("saved_places")
      .select("id, label, lat, lng, icon")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setSavedPlaces(data); });
  }, [userId]);
  const [routeMode, setRouteMode] = useState<"safe" | "balanced" | "fast">("balanced");
  const [transportMode, setTransportMode] = useState<"walk" | "bike" | "car">("walk");
  const [fetchedRoutes, setFetchedRoutes] = useState<RouteOption[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const routeFetchRef = useRef(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [countdownSeconds, setCountdownSeconds] = useState(107);
  const [contactStatuses, setContactStatuses] = useState<Record<string, string>>({});

  const theme = isDark ? "dark" : "light";
  const CONTACT_COLORS = [colors.purple, colors.cyan, colors.gold, colors.success, "#60A5FA", "#F97316"];

  // Timer for active state
  useEffect(() => {
    if (state === "active") {
      const interval = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [state]);

  // Countdown for notifying state
  useEffect(() => {
    if (walkSubState === "notifying" || walkSubState === "responding") {
      const interval = setInterval(() => {
        setCountdownSeconds((s) => Math.max(0, s - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [walkSubState]);

  // Fetch circle contacts
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: contacts } = await supabase
        .from("trusted_contacts")
        .select("user_id, contact_id")
        .or(`user_id.eq.${userId},contact_id.eq.${userId}`)
        .eq("status", "accepted");
      if (!contacts?.length) { setCircleContacts([]); return; }
      const contactIds = contacts.map((c) =>
        c.user_id === userId ? c.contact_id : c.user_id
      );
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, first_name, last_name, avatar_url")
        .in("id", contactIds);
      if (profiles) {
        setCircleContacts(
          profiles.map((p) => ({
            id: p.id,
            name:
              [p.first_name, p.last_name].filter(Boolean).join(" ") ||
              (p.display_name as string) ||
              "Contact",
            avatar_url: (p.avatar_url as string) || null,
          }))
        );
      }
    })();
  }, [userId]);

  // Update clock every minute
  useEffect(() => {
    const id = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
      );
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // Simulate contact responses (using real circle contact IDs)
  useEffect(() => {
    if (walkSubState !== "notifying" || circleContacts.length === 0) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (circleContacts[0]) {
      timers.push(
        setTimeout(() => {
          setContactStatuses((prev) => ({ ...prev, [circleContacts[0].id]: "following" }));
        }, 1500)
      );
    }
    if (circleContacts[1]) {
      timers.push(
        setTimeout(() => {
          setContactStatuses((prev) => ({ ...prev, [circleContacts[1].id]: "vocal" }));
          setWalkSubState("responding");
        }, 3000)
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [walkSubState, circleContacts]);

  // Fetch routes when destination or transport mode changes
  useEffect(() => {
    if (!destCoords || state !== "planifier") {
      setFetchedRoutes([]);
      setPendingRoutes(null);
      return;
    }
    const fetchId = ++routeFetchRef.current;
    setLoadingRoutes(true);

    (async () => {
      try {
        const origin = await getCurrentPosition();
        const from: [number, number] = [origin.lng, origin.lat];
        const to: [number, number] = destCoords;

        const results = await fetchDirectionsMulti(from, to, transportMode);
        if (fetchId !== routeFetchRef.current) return;

        if (results.length === 0) {
          setFetchedRoutes([]);
          setPendingRoutes(null);
          setLoadingRoutes(false);
          return;
        }

        const ROUTE_COLORS = ["#34D399", "#F5C341", "#EF4444"];

        // Score each route
        const scored = results.map((r) => ({
          ...r,
          dangerScore: scoreRoute(r.coords, pins),
        }));
        // Sort by danger score ascending (safest first)
        scored.sort((a, b) => a.dangerScore - b.dangerScore);

        // Find fastest (shortest duration)
        const fastestIdx = scored.reduce((best, r, i) => r.duration < scored[best].duration ? i : best, 0);

        const routeOptions: RouteOption[] = scored.map((r, i) => {
          let label = "Equilibree";
          if (i === 0) label = "Plus sure";
          if (i === fastestIdx && fastestIdx !== 0) label = "Plus rapide";
          return {
            id: `${transportMode}-${i}`,
            label,
            color: ROUTE_COLORS[i] ?? "#94A3B8",
            coords: r.coords,
            duration: r.duration,
            distance: r.distance,
            dangerScore: r.dangerScore,
          };
        });

        setFetchedRoutes(routeOptions);
        setSelectedIdx(0);
        setPendingRoutes(routeOptions);
      } catch (e) {
        console.error("Failed to fetch routes:", e);
      }
      setLoadingRoutes(false);
    })();
  }, [destCoords, transportMode, state]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatElapsed = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Geolocation helper
  const getCurrentPosition = (): Promise<{ lat: number; lng: number }> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("No geolocation"));
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        reject,
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });

  // Haversine distance (meters)
  const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // End trip API call
  const endTrip = async () => {
    if (!tripId || !userId) return;
    try {
      const res = await fetch("/api/trips/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trip_id: tripId,
          user_id: userId,
          actual_duration_s: elapsedSeconds,
          status: "completed" as const,
        }),
      });
      const data = await res.json();
      if (data.trip) {
        setTripSummary({
          duration_s: data.trip.actual_duration_s ?? elapsedSeconds,
          distance_m: data.trip.distance_m ?? distanceM,
          score: data.trip.danger_score ?? 0,
        });
      }
    } catch (e) {
      console.error("Failed to end trip:", e);
    }
    setTripId(null);
  };

  const handleWalkCTA = async () => {
    if (walkSubState === "intro") {
      setWalkSubState("notifying");
      setCountdownSeconds(107);
      const initial: Record<string, string> = {};
      circleContacts.forEach((c) => { initial[c.id] = "waiting"; });
      setContactStatuses(initial);
    } else if (walkSubState === "notifying" || walkSubState === "responding") {
      setWalkSubState("active");
      setElapsedSeconds(0);
      if (userId) {
        try {
          const origin = await getCurrentPosition();
          const toLabel = destination || "Marche accompagnée";
          const dLat = destCoords ? destCoords[1] : origin.lat;
          const dLng = destCoords ? destCoords[0] : origin.lng;
          const dist = destCoords ? haversineDistance(origin.lat, origin.lng, dLat, dLng) : 0;
          const estDuration = dist > 0 ? Math.round(dist / 1.39) : 1800;
          setDistanceM(Math.round(dist));
          setPlannedDurationS(estDuration);
          const res = await fetch("/api/trips/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: userId,
              from_label: "Ma position",
              to_label: toLabel,
              mode: "walk",
              origin_lat: origin.lat,
              origin_lng: origin.lng,
              dest_lat: dLat,
              dest_lng: dLng,
              planned_duration_s: estDuration,
              danger_score: 0,
              distance_m: Math.round(dist),
            }),
          });
          const data = await res.json();
          if (data.trip_id) setTripId(data.trip_id);
        } catch (e) {
          console.error("Failed to start walk trip:", e);
        }
      }
    }
  };

  const resetWalk = () => {
    setWalkSubState("intro");
    const initial: Record<string, string> = {};
    circleContacts.forEach((c) => { initial[c.id] = "waiting"; });
    setContactStatuses(initial);
    setCountdownSeconds(107);
    setSharingStoppedLocal(false);
  };

  // Save / remove favorite place
  const refreshSavedPlaces = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("saved_places")
      .select("id, label, lat, lng, icon")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data) setSavedPlaces(data);
  };

  const savePlace = async (label: string, lat: number, lng: number, icon?: string) => {
    if (!userId) return;
    await supabase.from("saved_places").insert({ user_id: userId, label, lat, lng, icon: icon || "⭐" });
    await refreshSavedPlaces();
  };

  const removePlace = async (id: string) => {
    await supabase.from("saved_places").delete().eq("id", id);
    setSavedPlaces((prev) => prev.filter((p) => p.id !== id));
  };

  const isDestSaved = savedPlaces.some(
    (p) => destCoords && Math.abs(p.lat - destCoords[1]) < 0.0001 && Math.abs(p.lng - destCoords[0]) < 0.0001
  );

  // Shared styles
  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.card[theme],
    borderRadius: 14,
    border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
  };

  const elevatedStyle: React.CSSProperties = {
    backgroundColor: colors.elevated[theme],
    borderRadius: 14,
    border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
  };

  // Render contact avatar
  const Avatar = ({ name, color, size = 36 }: { name: string; color: string; size?: number }) => (
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

  // Render State 1 - Idle
  const renderIdle = () => (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={spring}
      style={{ ...noScrollbar, height: "100%", padding: "0 20px 20px" }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: colors.textPrimary[theme], margin: 0 }}>Mon trajet</h1>
          <p style={{ fontSize: 13, color: colors.textTertiary[theme], margin: 0 }}>{currentTime} ☁️</p>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            backgroundColor: colors.card[theme],
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={18} color={colors.textSecondary[theme]} />
        </button>
      </div>

      {/* Hero CTA - Marche avec moi */}
      <motion.button
        onClick={() => setState("walk")}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.97 }}
        style={{
          width: "100%",
          padding: "14px 18px",
          borderRadius: 18,
          background: "linear-gradient(135deg, #F5C341, #E8A800)",
          boxShadow: "0 4px 20px rgba(245,195,65,0.3)",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              backgroundColor: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Users size={20} color="white" />
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "white" }}>Marche avec moi</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>Votre cercle alerté en 1 tap</div>
          </div>
        </div>
        <ChevronRight size={22} color="white" />
      </motion.button>

      {/* 2-col grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setState("planifier")}
          style={{
            ...cardStyle,
            padding: "14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
          }}
        >
          <Map size={20} color={colors.cyan} />
          <span style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary[theme] }}>Planifier</span>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setState("favoris")}
          style={{
            ...cardStyle,
            padding: "14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
          }}
        >
          <Star size={20} color={colors.gold} />
          <span style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary[theme] }}>Favoris</span>
          {savedPlaces.length > 0 && (
            <span
              style={{
                marginLeft: "auto",
                backgroundColor: `${colors.cyan}20`,
                color: colors.cyan,
                fontSize: 12,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 10,
              }}
            >
              {savedPlaces.length}
            </span>
          )}
        </motion.button>
      </div>

      {/* Toggle row */}
      <div
        style={{
          ...cardStyle,
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Signal size={18} color={colors.textTertiary[theme]} />
          <div>
            <span style={{ fontSize: 14, color: colors.textTertiary[theme] }}>Partage avec le Cercle</span>
            <div style={{ fontSize: 11, color: colors.textTertiary[theme], opacity: 0.7 }}>Disponible avec Marche avec moi</div>
          </div>
        </div>
        <div
          style={{
            width: 44,
            height: 26,
            borderRadius: 13,
            backgroundColor: colors.card[theme],
            border: `1px solid ${colors.textTertiary[theme]}`,
            padding: 2,
            opacity: 0.4,
            cursor: "not-allowed",
            display: "flex",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              backgroundColor: "white",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            }}
          />
        </div>
      </div>

      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: colors.textTertiary[theme], letterSpacing: 0.5 }}>
          TRAJETS RÉCENTS
        </span>
        <button
          onClick={() => { setState("history"); if (!allTrips.length && userId) { supabase.from("trips").select("id, destination, duration_min, safety_score, created_at").eq("user_id", userId).order("created_at", { ascending: false }).then(({ data }) => { if (data) setAllTrips(data); }); } }}
          style={{ fontSize: 13, color: colors.cyan, background: "none", border: "none", cursor: "pointer" }}
        >
          Voir tout ›
        </button>
      </div>

      {/* Recent trips */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {recentTrips.length === 0 ? (
          <div style={{ ...cardStyle, padding: "20px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: colors.textTertiary[theme] }}>
              Aucun trajet pour le moment
            </div>
          </div>
        ) : recentTrips.map((trip) => {
          const date = new Date(trip.created_at);
          const dayLabel = date.toLocaleDateString("fr-FR", { weekday: "short" });
          const durLabel = trip.duration_min ? `${trip.duration_min}min` : "";
          return (
            <motion.div
              key={trip.id}
              whileTap={{ scale: 0.98 }}
              style={{
                ...cardStyle,
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: colors.elevated[theme],
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                }}
              >
                {"\u{1F6B6}"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary[theme] }}>
                  {trip.destination || "Trajet"}
                </div>
                <div style={{ fontSize: 12, color: colors.textTertiary[theme] }}>
                  {dayLabel}{durLabel ? ` \u00b7 ${durLabel}` : ""}
                </div>
              </div>
              {trip.safety_score != null && (
                <span
                  style={{
                    backgroundColor: `${colors.cyan}20`,
                    color: colors.cyan,
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "3px 8px",
                    borderRadius: 8,
                  }}
                >
                  {Math.round(trip.safety_score)}
                </span>
              )}
              <ChevronRight size={16} color={colors.textTertiary[theme]} />
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );

  // Render State 2 - Walk (with sub-states)
  const renderWalk = () => (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={spring}
      style={{ ...noScrollbar, height: "100%", padding: "0 20px 20px" }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            setState("idle");
            resetWalk();
          }}
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            backgroundColor: colors.card[theme],
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <ChevronLeft size={20} color={colors.textPrimary[theme]} />
        </motion.button>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: colors.textPrimary[theme], margin: 0 }}>
            Marche avec moi
          </h1>
          <p style={{ fontSize: 12, color: colors.textSecondary[theme], margin: 0 }}>
            Votre cercle est alerté instantanément
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {walkSubState === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={spring}
          >
            {/* Icon */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <div
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 20,
                  backgroundColor: `${colors.gold}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Users size={32} color={colors.gold} />
              </div>
            </div>

            <h2
              style={{
                fontSize: 18,
                fontWeight: 300,
                color: colors.textPrimary[theme],
                textAlign: "center",
                margin: "0 0 6px",
              }}
            >
              Marchez ensemble en sécurité
            </h2>
            <p
              style={{
                fontSize: 12,
                color: colors.textSecondary[theme],
                textAlign: "center",
                lineHeight: 1.6,
                margin: "0 0 14px",
                padding: "0 10px",
              }}
            >
              Votre cercle reçoit une notification push. Ils peuvent vous suivre ou vous rejoindre en vocal.
            </p>

            {/* Explanation cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {[
                {
                  emoji: "🔔",
                  level: "NIVEAU 1",
                  levelColor: colors.gold,
                  title: "Notification téléphone",
                  desc: "Tout le cercle reçoit une alerte push. En 1 tap, ils vous suivent.",
                },
                {
                  emoji: "🎙",
                  level: "NIVEAU 2",
                  levelColor: colors.cyan,
                  title: "Chat vocal dans l'app",
                  desc: "Ils rejoignent une room audio privée. Parlez en direct.",
                },
                {
                  emoji: "✨",
                  level: "SI PERSONNE (2 min)",
                  levelColor: colors.purple,
                  title: "Julia vous rejoint",
                  desc: "L'IA Julia reste avec vous jusqu'à votre arrivée.",
                  badge: "BIENTÔT",
                },
              ].map((card, i) => (
                <div key={i} style={{ ...cardStyle, padding: "12px 14px", display: "flex", gap: 12 }}>
                  <div style={{ fontSize: 22, flexShrink: 0 }}>{card.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: card.levelColor, letterSpacing: 0.5 }}>
                        {card.level}
                      </span>
                      {card.badge && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 600,
                            color: colors.purple,
                            backgroundColor: `${colors.purple}20`,
                            padding: "1px 5px",
                            borderRadius: 4,
                          }}
                        >
                          {card.badge}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary[theme], marginBottom: 1 }}>
                      {card.title}
                    </div>
                    <div style={{ fontSize: 11, color: colors.textSecondary[theme], lineHeight: 1.4 }}>{card.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Circle preview */}
            {circleContacts.length > 0 && (
              <div
                style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, justifyContent: "center", flexWrap: "wrap" }}
              >
                <span style={{ fontSize: 12, color: colors.textSecondary[theme] }}>
                  Votre cercle ({circleContacts.length}) :
                </span>
                <div style={{ display: "flex", marginLeft: -6 }}>
                  {circleContacts.map((c, i) => (
                    <div key={c.id} style={{ marginLeft: i > 0 ? -8 : 0 }}>
                      <Avatar name={c.name} color={CONTACT_COLORS[i % CONTACT_COLORS.length]} size={30} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {circleContacts.length === 0 && (
              <p style={{ fontSize: 12, color: colors.textTertiary[theme], textAlign: "center", marginBottom: 14 }}>
                Ajoutez des contacts à votre cercle pour utiliser cette fonctionnalité
              </p>
            )}

            {/* CTA */}
            <motion.button
              onClick={handleWalkCTA}
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
              }}
            >
              Notifier mon cercle →
            </motion.button>
          </motion.div>
        )}

        {(walkSubState === "notifying" || walkSubState === "responding") && (
          <motion.div
            key="notifying"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={spring}
          >
            {/* Pulsing icon */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16, position: "relative", height: 80 }}>
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  position: "absolute",
                  width: 70,
                  height: 70,
                  borderRadius: "50%",
                  backgroundColor: colors.gold,
                  top: 5,
                }}
              />
              <div
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: "50%",
                  backgroundColor: `${colors.gold}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  zIndex: 1,
                  marginTop: 5,
                }}
              >
                <Users size={32} color={colors.gold} />
              </div>
            </div>

            <h2
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: colors.textPrimary[theme],
                textAlign: "center",
                margin: "0 0 4px",
              }}
            >
              Notification envoyée
            </h2>
            <p style={{ fontSize: 13, color: colors.textSecondary[theme], textAlign: "center", margin: "0 0 10px" }}>
              En attente de réponse de votre cercle
            </p>

            {/* Countdown */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
              <div
                style={{
                  backgroundColor: countdownSeconds < 30 ? `${colors.purple}20` : `${colors.gold}20`,
                  color: countdownSeconds < 30 ? colors.purple : colors.gold,
                  padding: "6px 14px",
                  borderRadius: 16,
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                Julia rejoint dans{" "}
                <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                  {formatTime(countdownSeconds)}
                </span>
              </div>
            </div>

            {/* Audio room banner */}
            {walkSubState === "responding" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  backgroundColor: `${colors.cyan}15`,
                  border: `1px solid ${colors.cyan}40`,
                  borderRadius: 12,
                  padding: "10px 14px",
                  marginBottom: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <motion.div
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: colors.success,
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.cyan }}>Room vocale active</div>
                  <div style={{ fontSize: 11, color: colors.textSecondary[theme] }}>
                    {circleContacts.find((c) => contactStatuses[c.id] === "vocal")?.name || "Quelqu'un"} vous écoute · Parlez librement
                  </div>
                </div>
              </motion.div>
            )}

            {/* Contacts list */}
            <div style={{ ...cardStyle, borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
              {circleContacts.map((contact, i, arr) => {
                const status = contactStatuses[contact.id] || "waiting";
                const contactColor = CONTACT_COLORS[i % CONTACT_COLORS.length];
                return (
                  <div
                    key={contact.id}
                    style={{
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      borderBottom: i < arr.length - 1 ? `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` : "none",
                    }}
                  >
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <Avatar name={contact.name} color={contactColor} size={34} />
                      {status !== "waiting" && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={spring}
                          style={{
                            position: "absolute",
                            bottom: -1,
                            right: -1,
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            backgroundColor: status === "following" ? colors.success : colors.cyan,
                            border: `2px solid ${colors.card[theme]}`,
                          }}
                        />
                      )}
                    </div>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: colors.textPrimary[theme], minWidth: 0 }}>
                      {contact.name}
                    </span>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={status}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={spring}
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          padding: "3px 8px",
                          borderRadius: 8,
                          backgroundColor:
                            status === "waiting"
                              ? colors.elevated[theme]
                              : status === "following"
                                ? `${colors.success}20`
                                : `${colors.cyan}20`,
                          color:
                            status === "waiting"
                              ? colors.textTertiary[theme]
                              : status === "following"
                                ? colors.success
                                : colors.cyan,
                          flexShrink: 0,
                        }}
                      >
                        {status === "waiting" ? "En attente" : status === "following" ? "Suit" : "🎙 Vocal"}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* CTA */}
            <motion.button
              onClick={handleWalkCTA}
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
                marginBottom: 8,
              }}
            >
              Démarrer le trajet →
            </motion.button>

            <button
              onClick={() => resetWalk()}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 14,
                backgroundColor: "transparent",
                border: "none",
                fontSize: 13,
                fontWeight: 500,
                color: colors.textSecondary[theme],
                cursor: "pointer",
              }}
            >
              Annuler
            </button>
          </motion.div>
        )}

        {walkSubState === "active" && (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={spring}
            style={{ textAlign: "center" }}
          >
            {/* Success icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.5 }}
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                backgroundColor: `${colors.success}20`,
                border: `2px solid ${colors.success}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
              }}
            >
              <Check size={28} color={colors.success} />
            </motion.div>

            <h2 style={{ fontSize: 17, fontWeight: 600, color: colors.textPrimary[theme], margin: "0 0 4px" }}>
              Votre cercle vous accompagne
            </h2>
            <p style={{ fontSize: 13, color: colors.textSecondary[theme], margin: "0 0 20px" }}>
              {Object.values(contactStatuses).filter((s) => s !== "waiting").length} contacts actifs sur {circleContacts.length}
            </p>

            {/* Active contacts — hidden when sharing stopped */}
            {!sharingStoppedLocal && (
              <div style={{ ...cardStyle, borderRadius: 14, overflow: "hidden", marginBottom: 20, textAlign: "left" }}>
                {circleContacts.filter((c) => contactStatuses[c.id] && contactStatuses[c.id] !== "waiting").map((contact, i, arr) => {
                  const status = contactStatuses[contact.id];
                  const contactColor = CONTACT_COLORS[circleContacts.indexOf(contact) % CONTACT_COLORS.length];
                  return (
                  <div
                    key={contact.id}
                    style={{
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      borderBottom: i < arr.length - 1 ? `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` : "none",
                    }}
                  >
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <Avatar name={contact.name} color={contactColor} size={34} />
                      <div
                        style={{
                          position: "absolute",
                          bottom: -1,
                          right: -1,
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          backgroundColor: status === "following" ? colors.success : colors.cyan,
                          border: `2px solid ${colors.card[theme]}`,
                        }}
                      />
                    </div>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: colors.textPrimary[theme] }}>
                      {contact.name}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        padding: "3px 8px",
                        borderRadius: 8,
                        backgroundColor: status === "following" ? `${colors.success}20` : `${colors.cyan}20`,
                        color: status === "following" ? colors.success : colors.cyan,
                      }}
                    >
                      {status === "following" ? "● Suit" : "🎙 Vocal"}
                    </span>
                  </div>
                  );
                })}
              </div>
            )}

            {sharingStoppedLocal && (
              <div style={{ ...cardStyle, padding: "16px 14px", marginBottom: 20, textAlign: "center" }}>
                <div style={{ fontSize: 13, color: colors.textTertiary[theme] }}>
                  Partage avec le cercle arrêté
                </div>
              </div>
            )}

            {/* Stop sharing button (does NOT end trip) */}
            <button
              onClick={() => {
                setIsSharingLocation(false);
                setSharingStoppedLocal(true);
              }}
              disabled={sharingStoppedLocal}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 14,
                backgroundColor: sharingStoppedLocal ? colors.card[theme] : `${colors.warning}15`,
                border: "none",
                fontSize: 14,
                fontWeight: 600,
                color: sharingStoppedLocal ? colors.textTertiary[theme] : colors.warning,
                cursor: sharingStoppedLocal ? "default" : "pointer",
                opacity: sharingStoppedLocal ? 0.6 : 1,
                marginBottom: 8,
              }}
            >
              {sharingStoppedLocal ? "Partage arrêté" : "Arrêter le partage"}
            </button>

            {/* End trip button */}
            <button
              onClick={async () => {
                await endTrip();
                setState("idle");
                resetWalk();
                setSharingStoppedLocal(false);
                setIsSharingLocation(false);
              }}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 14,
                backgroundColor: `${colors.danger}15`,
                border: "none",
                fontSize: 14,
                fontWeight: 600,
                color: colors.danger,
                cursor: "pointer",
              }}
            >
              Terminer le trajet
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  // Render State 3 - Planifier
  const TRANSPORT_MODES = [
    { id: "walk" as const, label: "A pied", emoji: "\uD83D\uDEB6" },
    { id: "bike" as const, label: "Velo", emoji: "\uD83D\uDEB2" },
    { id: "car" as const, label: "Voiture", emoji: "\uD83D\uDE97" },
  ];

  const selectedRoute = fetchedRoutes[selectedIdx] ?? null;

  const renderPlanifier = () => (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={spring}
      style={{ ...noScrollbar, height: "100%", padding: "0 20px 20px" }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { setState("idle"); setPendingRoutes(null); }}
            style={{
              width: 34, height: 34, borderRadius: "50%", backgroundColor: colors.card[theme],
              border: "none", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0,
            }}
          >
            <ChevronLeft size={20} color={colors.textPrimary[theme]} />
          </motion.button>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: colors.textPrimary[theme], margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Trajet avec destination
          </h1>
        </div>
        {selectedRoute && (
          <div style={{
            background: isDark ? "#FFFFFF" : "#111827", color: isDark ? "#111827" : "#FFFFFF",
            fontSize: 13, fontWeight: 500, padding: "6px 12px", borderRadius: 99, flexShrink: 0, marginLeft: 8,
          }}>
            {formatDuration(selectedRoute.duration)} →
          </div>
        )}
      </div>

      {/* Origin / Destination card */}
      <div style={{ ...cardStyle, padding: "12px 14px", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: colors.success, flexShrink: 0 }} />
          <span style={{ fontSize: 14, color: colors.textSecondary[theme] }}>Ma position actuelle</span>
        </div>
        <div style={{ height: 1, background: isDark ? "rgba(255,255,255,0.06)" : "#E5E7EB", margin: "0 0 10px 0" }} />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1, minWidth: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: colors.danger, flexShrink: 0, marginTop: 4 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <AutocompleteInput
                value={destination}
                onChange={(text, coords) => {
                  setDestination(text);
                  setDestCoords(coords || null);
                }}
                placeholder="Rechercher une destination"
                localSections={savedPlaces.length > 0 ? [{
                  title: "Lieux favoris",
                  items: savedPlaces.map((p) => ({
                    label: p.label,
                    coords: [p.lng, p.lat] as [number, number],
                    icon: p.icon || "\u2B50",
                  })),
                }] : undefined}
                autoFocus
              />
            </div>
          </div>
          {destination && destCoords && (
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={async () => {
                if (isDestSaved) {
                  const match = savedPlaces.find(
                    (p) => destCoords && Math.abs(p.lat - destCoords[1]) < 0.0001 && Math.abs(p.lng - destCoords[0]) < 0.0001
                  );
                  if (match) await removePlace(match.id);
                } else {
                  await savePlace(destination, destCoords[1], destCoords[0]);
                }
              }}
              style={{
                background: "none", border: "none", padding: 4, marginLeft: 8, cursor: "pointer", flexShrink: 0,
              }}
            >
              <Star size={16} color={isDestSaved ? colors.gold : colors.textTertiary[theme]} fill={isDestSaved ? colors.gold : "none"} />
            </motion.button>
          )}
        </div>
      </div>

      {/* Transport mode pills */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12, borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6"}`, paddingBottom: 12 }}>
        {TRANSPORT_MODES.map((mode) => {
          const isActive = transportMode === mode.id;
          return (
            <motion.button
              key={mode.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => setTransportMode(mode.id)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                padding: "8px 4px", borderRadius: 10, cursor: "pointer", border: "none",
                background: isActive ? (isDark ? "rgba(59,180,193,0.15)" : "#E0F7FB") : "transparent",
              }}
            >
              <span style={{ fontSize: 18 }}>{mode.emoji}</span>
              <span style={{ fontSize: 11, fontWeight: 500, lineHeight: 1.2, textAlign: "center", color: isActive ? colors.cyan : colors.textTertiary[theme] }}>
                {mode.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Veille cercle */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 0", marginBottom: 8,
        borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6"}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Users size={18} color={colors.textSecondary[theme]} />
          <span style={{ fontSize: 14, fontWeight: 500, color: colors.textPrimary[theme] }}>Veille cercle</span>
        </div>
        <button
          onClick={() => setCircleEnabled(!circleEnabled)}
          style={{
            width: 44, height: 26, borderRadius: 13, position: "relative",
            background: circleEnabled ? colors.cyan : (isDark ? "#475569" : "#D1D5DB"),
            border: "none", cursor: "pointer", padding: 0, flexShrink: 0,
            transition: "background 0.2s",
          }}
        >
          <div style={{
            width: 20, height: 20, borderRadius: "50%", background: "white", position: "absolute",
            top: 3, left: circleEnabled ? 21 : 3, transition: "left 0.2s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }} />
        </button>
      </div>

      {/* Itineraires section */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 0", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: colors.textTertiary[theme] }}>
          Itineraires
        </span>
      </div>

      {/* Route list */}
      {loadingRoutes ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24, color: colors.textTertiary[theme], fontSize: 13 }}>
          Recherche d'itineraires...
        </div>
      ) : fetchedRoutes.length > 0 ? (
        <div style={{ marginBottom: 16 }}>
          {fetchedRoutes.map((route, idx) => (
            <div key={route.id}>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => { setSelectedIdx(idx); }}
                style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" as const }}
              >
                <RouteCard
                  color={route.color}
                  label={route.label}
                  duration={formatDuration(route.duration)}
                  distance={formatDistance(route.distance)}
                  isSelected={selectedIdx === idx}
                  isDark={isDark}
                />
              </motion.button>
              {idx < fetchedRoutes.length - 1 && (
                <div style={{ height: 1, background: isDark ? "rgba(255,255,255,0.03)" : "#F9FAFB" }} />
              )}
            </div>
          ))}
        </div>
      ) : destCoords ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24, color: colors.textTertiary[theme], fontSize: 13 }}>
          Aucun itineraire trouve
        </div>
      ) : null}

      {/* CTA */}
      <motion.button
        onClick={async () => {
          const route = fetchedRoutes[selectedIdx];
          if (!destination || !route) return;
          setState("active");
          setElapsedSeconds(0);
          setDistanceM(Math.round(route.distance));
          setPlannedDurationS(Math.round(route.duration));
          setActiveRoute({ coords: route.coords, destination });
          setPendingRoutes(null);
          if (userId) {
            try {
              const origin = await getCurrentPosition();
              const res = await fetch("/api/trips/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  user_id: userId,
                  from_label: "Ma position",
                  to_label: destination,
                  mode: transportMode,
                  origin_lat: origin.lat,
                  origin_lng: origin.lng,
                  dest_lat: destCoords ? destCoords[1] : origin.lat,
                  dest_lng: destCoords ? destCoords[0] : origin.lng,
                  planned_duration_s: Math.round(route.duration),
                  danger_score: route.dangerScore,
                  distance_m: Math.round(route.distance),
                }),
              });
              const data = await res.json();
              if (data.trip_id) setTripId(data.trip_id);
            } catch (e) {
              console.error("Failed to start trip:", e);
            }
          }
        }}
        whileHover={selectedRoute ? { scale: 1.01 } : {}}
        whileTap={selectedRoute ? { scale: 0.97 } : {}}
        style={{
          width: "100%", padding: "14px", borderRadius: 14,
          background: selectedRoute ? colors.cyan : colors.elevated[theme],
          border: "none", fontSize: 15, fontWeight: 700,
          color: selectedRoute ? "white" : colors.textTertiary[theme],
          cursor: selectedRoute ? "pointer" : "default",
          opacity: selectedRoute ? 1 : 0.6,
        }}
      >
        Demarrer le trajet
      </motion.button>
    </motion.div>
  );

  // Render State 4 - Active HUD
  const renderActive = () => (
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
          onClick={() => setIsSharingLocation(!isSharingLocation)}
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
            {isSharingLocation ? "Partagé ✓" : "Partager"}
          </span>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            // Trigger SOS — dispatch custom event for EmergencyButton
            window.dispatchEvent(new CustomEvent("sos-trigger"));
          }}
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
        onClick={async () => { await endTrip(); setState("arrived"); }}
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
        Je suis arrivée ✓
      </motion.button>

      {/* Watchers */}
      {circleContacts.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
          <div style={{ display: "flex" }}>
            {circleContacts.slice(0, 3).map((c, i) => (
              <div key={c.id} style={{ marginLeft: i > 0 ? -8 : 0 }}>
                <Avatar name={c.name} color={CONTACT_COLORS[i % CONTACT_COLORS.length]} size={26} />
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

  // Render State 5 - Arrived
  const renderArrived = () => (
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
        width: "88%",
        maxWidth: 340,
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

      <h1 style={{ fontSize: 22, fontWeight: 300, color: colors.textPrimary[theme], margin: "0 0 6px" }}>
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
        onClick={() => {
          setState("idle");
          setDestination("");
          setDestCoords(null);
          setTripSummary(null);
          setDistanceM(0);
          setPlannedDurationS(0);
        }}
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

  // Render Favoris screen — now uses dedicated FavorisSheet
  const renderFavoris = () => {
    const userLoc = useStore.getState().userLocation;
    return (
      <FavorisSheet
        isOpen={state === "favoris"}
        onClose={() => { setState("idle"); setFavAddMode(false); }}
        onSelect={(place) => {
          setDestination(place.label);
          setDestCoords([place.lng, place.lat]);
          setState("planifier");
          setFavAddMode(false);
        }}
        userId={userId ?? ""}
        userLat={userLoc?.lat ?? 48.8566}
        userLng={userLoc?.lng ?? 2.3522}
      />
    );
  };

  // Render History screen
  const renderHistory = () => (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={spring}
      style={{ ...noScrollbar, height: "100%", padding: "0 20px 20px" }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setState("idle")}
          style={{
            width: 34, height: 34, borderRadius: "50%",
            backgroundColor: colors.card[theme], border: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", flexShrink: 0,
          }}
        >
          <ChevronLeft size={20} color={colors.textPrimary[theme]} />
        </motion.button>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: colors.textPrimary[theme], margin: 0 }}>Tous les trajets</h1>
      </div>

      {(allTrips.length > 0 ? allTrips : recentTrips).length === 0 ? (
        <div style={{ ...cardStyle, padding: "24px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 14, color: colors.textTertiary[theme] }}>Aucun trajet enregistré</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(allTrips.length > 0 ? allTrips : recentTrips).map((trip) => {
            const date = new Date(trip.created_at);
            const dateLabel = date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
            const durLabel = trip.duration_min ? `${trip.duration_min} min` : "";
            return (
              <div
                key={trip.id}
                style={{
                  ...cardStyle,
                  padding: "12px 14px",
                  display: "flex", alignItems: "center", gap: 10,
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  backgroundColor: colors.elevated[theme],
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20,
                }}>
                  {"\u{1F6B6}"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary[theme] }}>
                    {trip.destination || "Trajet"}
                  </div>
                  <div style={{ fontSize: 12, color: colors.textTertiary[theme] }}>
                    {dateLabel}{durLabel ? ` · ${durLabel}` : ""}
                  </div>
                </div>
                {trip.safety_score != null && (
                  <span style={{
                    backgroundColor: `${colors.cyan}20`, color: colors.cyan,
                    fontSize: 12, fontWeight: 600, padding: "3px 8px", borderRadius: 8,
                  }}>
                    {Math.round(trip.safety_score)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={spring}
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: "72dvh",
        zIndex: 50,
        backgroundColor: colors.sheet[theme],
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 -4px 30px rgba(0,0,0,0.15)",
      }}
    >
      {/* Handle */}
      <div style={{ padding: "10px 0 4px", display: "flex", justifyContent: "center", flexShrink: 0 }}>
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
          }}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
        <AnimatePresence mode="wait">
          {state === "idle" && renderIdle()}
          {state === "walk" && renderWalk()}
          {state === "planifier" && renderPlanifier()}
          {state === "active" && renderActive()}
          {state === "arrived" && renderArrived()}
          {state === "history" && renderHistory()}
        </AnimatePresence>
      </div>

      {/* FavorisSheet rendered as overlay outside AnimatePresence */}
      {renderFavoris()}
    </motion.div>
  );
}
