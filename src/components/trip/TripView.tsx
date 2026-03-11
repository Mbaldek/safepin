"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
import { fetchTransitRoute } from "@/lib/transit";
import { scoreRoute } from "@/lib/route-scoring";
import RouteCard from "@/components/trip/RouteCard";
import type { RouteOption } from "@/stores/useStore";
import { useIsDark } from "@/hooks/useIsDark";
import { useStore } from "@/stores/useStore";
import { supabase } from "@/lib/supabase";
import AutocompleteInput from "@/components/AutocompleteInput";
import FavorisSheet from "@/components/trip/FavorisSheet";
import useVerificationGate from "@/hooks/useVerificationGate";
import VerificationNudgeSheet from "@/components/VerificationNudgeSheet";
import VerificationGateModal from "@/components/VerificationGateModal";

type Trip = {
  id: string;
  destination: string | null;
  duration_min: number | null;
  safety_score: number | null;
  distance_m: number | null;
  mode: string | null;
  status: string | null;
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

type AppState = "idle" | "planifier" | "active" | "arrived" | "favoris" | "history";

interface TripViewProps {
  onClose: () => void;
  openToHistory?: boolean;
}

export default function TripView({ onClose, openToHistory = false }: TripViewProps) {
  const isDark = useIsDark();
  const userId = useStore((s) => s.userId);
  const isSharingLocation = useStore((s) => s.isSharingLocation);
  const setIsSharingLocation = useStore((s) => s.setIsSharingLocation);
  const setPendingRoutes = useStore((s) => s.setPendingRoutes);
  const setActiveRoute = useStore((s) => s.setActiveRoute);
  const setSelectedRouteIdx = useStore((s) => s.setSelectedRouteIdx);
  const setTransitSegments = useStore((s) => s.setTransitSegments);
  const setShowWalkWithMe = useStore((s) => s.setShowWalkWithMe);
  const pins = useStore((s) => s.pins);
  const { isGated, shouldNudge, isNonSkippable, daysLeft, snooze } = useVerificationGate();
  const [state, setState] = useState<AppState>(openToHistory ? "history" : "idle");
  // When opened directly to history (openToHistory=true), "going back" means returning
  // to history state, not idle — idle is only the hub when opened normally from EscorteSheet
  const goBack = () => openToHistory ? setState("history") : setState("idle");
  const [circleEnabled, setCircleEnabled] = useState(false);
  const [destination, setDestination] = useState("");
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [tripId, setTripId] = useState<string | null>(null);
  const [destCoords, setDestCoords] = useState<[number, number] | null>(null);
  const [tripSummary, setTripSummary] = useState<{ duration_s: number; distance_m: number; score: number } | null>(null);
  const [favAddMode, setFavAddMode] = useState(false);
  const [plannedDurationS, setPlannedDurationS] = useState(0);
  const [distanceM, setDistanceM] = useState(0);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  );

  // ─── History filter state ───────────────────────────────────────────────────
  const [historyFilterOpen, setHistoryFilterOpen] = useState(false);
  const [historySelectedPeriod, setHistorySelectedPeriod] = useState<'week' | 'month' | 'all' | null>(null);
  const [historyActivePeriod, setHistoryActivePeriod] = useState<'week' | 'month' | 'all' | null>(null);

  const filteredTrips = useMemo(() => {
    const trips = allTrips.length ? allTrips : recentTrips;
    if (!historyActivePeriod) return trips;
    const now = Date.now();
    const cutoff = historyActivePeriod === 'week' ? 7 : historyActivePeriod === 'month' ? 30 : Infinity;
    if (cutoff === Infinity) return trips;
    return trips.filter(t => (now - new Date(t.created_at).getTime()) <= cutoff * 24 * 60 * 60 * 1000);
  }, [allTrips, recentTrips, historyActivePeriod]);

  const groupedTrips = useMemo(() => {
    const now = Date.now();
    const sections: { label: string; trips: typeof filteredTrips }[] = [];
    const week: typeof filteredTrips = [];
    const lastWeek: typeof filteredTrips = [];
    const month: typeof filteredTrips = [];
    const older: typeof filteredTrips = [];
    filteredTrips.forEach(t => {
      const age = (now - new Date(t.created_at).getTime()) / 86400000;
      if (age <= 7) week.push(t);
      else if (age <= 14) lastWeek.push(t);
      else if (age <= 30) month.push(t);
      else older.push(t);
    });
    if (week.length) sections.push({ label: 'Cette semaine', trips: week });
    if (lastWeek.length) sections.push({ label: 'La semaine dernière', trips: lastWeek });
    if (month.length) sections.push({ label: 'Ce mois', trips: month });
    if (older.length) sections.push({ label: 'Plus ancien', trips: older });
    return sections;
  }, [filteredTrips]);

  // Fetch recent trips + saved places
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("trips")
      .select("id, destination, duration_min, safety_score, distance_m, mode, status, created_at")
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
    // If opened directly in history mode, pre-fetch all trips
    if (openToHistory) {
      supabase
        .from("trips")
        .select("id, destination, duration_min, safety_score, distance_m, mode, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .then(({ data }) => { if (data) setAllTrips(data); });
    }
  }, [userId]);
  const [routeMode, setRouteMode] = useState<"safe" | "balanced" | "fast">("balanced");
  const [transportMode, setTransportMode] = useState<"walk" | "transit" | "bike" | "car">("walk");
  const [fetchedRoutes, setFetchedRoutes] = useState<RouteOption[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const routeFetchRef = useRef(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [circleContacts, setCircleContacts] = useState<CircleContact[]>([]);
  const [showVerifNudge, setShowVerifNudge] = useState(false);
  const [showVerifGate, setShowVerifGate] = useState(false);

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

        const ROUTE_COLORS = ["#34D399", "#F5C341", "#EF4444"];

        if (transportMode === "transit") {
          const transitRoutes = await fetchTransitRoute(from, to);
          if (fetchId !== routeFetchRef.current) return;
          if (!transitRoutes.length) {
            setFetchedRoutes([]); setPendingRoutes(null); setLoadingRoutes(false);
            return;
          }
          const routeOptions: RouteOption[] = transitRoutes.slice(0, 3).map((tr, i) => ({
            id: `transit-${i}`,
            label: i === 0 ? "Plus rapide" : i === 1 ? "Équilibrée" : "Moins de marche",
            color: ROUTE_COLORS[i] ?? "#94A3B8",
            coords: tr.coords,
            duration: tr.totalDuration,
            distance: 0,
            dangerScore: scoreRoute(tr.coords, pins),
          }));
          setFetchedRoutes(routeOptions);
          setSelectedIdx(0);
          setSelectedRouteIdx(0);
          setPendingRoutes(routeOptions);
          setLoadingRoutes(false);
          return;
        }

        const results = await fetchDirectionsMulti(from, to, transportMode);
        if (fetchId !== routeFetchRef.current) return;

        if (results.length === 0) {
          setFetchedRoutes([]);
          setPendingRoutes(null);
          setLoadingRoutes(false);
          return;
        }

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
          let label = "Équilibrée";
          if (i === 0) label = "Plus sûre";
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
        setSelectedRouteIdx(0);
        setPendingRoutes(routeOptions);
      } catch (e) {

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

    }
    setTripId(null);
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
          <h1 style={{ fontSize: 19, fontWeight: 600, color: colors.textPrimary[theme], margin: 0 }}>Mon trajet</h1>
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
        onClick={() => setShowWalkWithMe(true)}
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

      {/* Planifier button */}
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
          width: "100%",
          marginBottom: 12,
        }}
      >
        <Map size={20} color={colors.cyan} />
        <span style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary[theme] }}>Planifier un trajet</span>
        <ChevronRight size={16} color={colors.textTertiary[theme]} style={{ marginLeft: "auto" }} />
      </motion.button>

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
            backgroundColor: isDark ? "#334155" : "#CBD5E1",
            padding: 2,
            opacity: 0.4,
            cursor: "not-allowed",
            display: "flex",
            alignItems: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              backgroundColor: "white",
              boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
              position: "absolute",
              left: 3,
            }}
          />
        </div>
      </div>

      {/* Separator */}
      <div style={{ height: 1, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.07)", marginBottom: 12 }} />

      {/* Mes favoris row */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setState("favoris")}
        style={{
          ...cardStyle,
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          width: "100%",
          marginBottom: 12,
        }}
      >
        <Star size={18} color={colors.gold} />
        <span style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary[theme] }}>Mes favoris</span>
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
        <ChevronRight size={16} color={colors.textTertiary[theme]} style={savedPlaces.length > 0 ? {} : { marginLeft: "auto" }} />
      </motion.button>

      {/* Separator */}
      <div style={{ height: 1, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.07)", marginBottom: 12 }} />

      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: colors.textTertiary[theme], letterSpacing: 0.5 }}>
          TRAJETS RÉCENTS
        </span>
        <button
          onClick={() => { setState("history"); if (!allTrips.length && userId) { supabase.from("trips").select("id, destination, duration_min, safety_score, distance_m, mode, status, created_at").eq("user_id", userId).order("created_at", { ascending: false }).then(({ data }) => { if (data) setAllTrips(data); }); } }}
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
                  {dayLabel}{durLabel ? ` · ${durLabel}` : ""}
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
  // Render State 3 - Planifier
  const TRANSPORT_MODES = [
    { id: "walk" as const, label: "À pied", emoji: "🚶" },
    { id: "transit" as const, label: "Transports", emoji: "🚇" },
    { id: "bike" as const, label: "Vélo", emoji: "🚲" },
    { id: "car" as const, label: "Voiture", emoji: "🚗" },
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
            onClick={() => { goBack(); setPendingRoutes(null); }}
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
                    icon: p.icon || "⭐",
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 12, borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6"}`, paddingBottom: 12 }}>
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
                onClick={() => { setSelectedIdx(idx); setSelectedRouteIdx(idx); }}
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
        onClick={async () => {
          await endTrip();
          setActiveRoute(null);
          setPendingRoutes(null);
          setTransitSegments(null);
          setState("arrived");
          if (isGated) setShowVerifGate(true);
          else if (shouldNudge) setShowVerifNudge(true);
        }}
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
        onClick={() => {
          goBack();
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
        onClose={() => { goBack(); setFavAddMode(false); }}
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
  const renderHistory = () => {
    const H = {
      surfaceBase:   isDark ? '#0F172A' : '#F1F5F9',
      surfaceCard:   isDark ? '#1E293B' : '#FFFFFF',
      surfaceEl:     isDark ? '#253347' : '#F8FAFC',
      textPrimary:   isDark ? '#FFFFFF' : '#0F172A',
      textSecond:    isDark ? '#94A3B8' : '#475569',
      textTertiary:  isDark ? '#64748B' : '#94A3B8',
      borderSubtle:  isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)',
      borderDef:     isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.10)',
      teal:          '#3BB4C1',
      purple:        '#A78BFA',
      success:       '#34D399',
      warning:       '#FBBF24',
      danger:        '#EF4444',
    };

    const scoreColor = (score: number | null) => {
      if (!score) return H.textTertiary;
      if (score >= 70) return H.success;
      if (score >= 40) return H.warning;
      return H.danger;
    };
    const scoreBg = (score: number | null) => {
      if (!score) return 'rgba(148,163,184,0.10)';
      if (score >= 70) return 'rgba(52,211,153,0.10)';
      if (score >= 40) return 'rgba(251,191,36,0.10)';
      return 'rgba(239,68,68,0.10)';
    };
    const modeIcon = (trip: Trip) => {
      const m = trip.mode;
      if (m === 'cycling') return '🚴‍♀️';
      if (m === 'driving') return '🚗';
      return '🚶‍♀️';
    };
    const periodMeta: Record<string, { icon: string; name: string; desc: string }> = {
      week:  { icon: '📅', name: 'Cette semaine', desc: '7 derniers jours' },
      month: { icon: '🗓', name: 'Ce mois', desc: '30 derniers jours' },
      all:   { icon: '∞', name: "Tout l'historique", desc: 'Depuis le début' },
    };

    return (
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={spring}
        style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}
      >
        {/* HEADER */}
        <div style={{ padding: '12px 16px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            {/* Left */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => openToHistory ? onClose() : setState('idle')}
                style={{
                  width: 28, height: 28, borderRadius: 9999,
                  background: H.surfaceEl, border: `1px solid ${H.borderDef}`,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: H.textSecond, fontSize: 13, fontFamily: 'inherit',
                }}
              >
                {'‹'}
              </button>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: 'linear-gradient(135deg,#3BB4C1,#1E3A5F)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
              }}>
                {'🗺'}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: H.textPrimary }}>Mes trajets</div>
                <div style={{ fontSize: 11, color: H.textTertiary, marginTop: 1 }}>Trajet avec destination · historique</div>
              </div>
            </div>
            {/* Filter button */}
            <button
              onClick={() => { setHistorySelectedPeriod(historyActivePeriod); setHistoryFilterOpen(true); }}
              style={{
                width: 28, height: 28, borderRadius: 9999, position: 'relative',
                background: historyActivePeriod ? 'rgba(59,180,193,0.12)' : H.surfaceEl,
                border: `1px solid ${historyActivePeriod ? 'rgba(59,180,193,0.4)' : H.borderDef}`,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: historyActivePeriod ? H.teal : H.textTertiary, fontSize: 13, fontFamily: 'inherit',
              }}
            >
              {'⚙'}
              {historyActivePeriod && (
                <div style={{
                  position: 'absolute', top: 3, right: 3, width: 7, height: 7,
                  borderRadius: '50%', background: H.teal,
                  border: `2px solid ${H.surfaceCard}`,
                }} />
              )}
            </button>
          </div>

          {/* Active filter pill */}
          <div style={{
            overflow: 'hidden',
            maxHeight: historyActivePeriod ? 36 : 0,
            opacity: historyActivePeriod ? 1 : 0,
            transition: 'max-height 0.25s ease, opacity 0.2s',
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'rgba(59,180,193,0.10)', border: '1px solid rgba(59,180,193,0.25)',
              borderRadius: 9999, padding: '4px 10px', fontSize: 11, fontWeight: 500,
              color: H.teal, marginBottom: 8,
            }}>
              <span>{historyActivePeriod ? periodMeta[historyActivePeriod]?.name ?? '' : ''}</span>
              <button
                onClick={() => { setHistoryActivePeriod(null); setHistorySelectedPeriod(null); }}
                style={{
                  background: 'none', border: 'none', color: H.teal,
                  cursor: 'pointer', fontSize: 10, opacity: 0.7, fontFamily: 'inherit', padding: 0,
                }}
              >
                {'✕'}
              </button>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 80px', WebkitOverflowScrolling: 'touch' }}>
          {filteredTrips.length === 0 ? (
            /* Empty state */
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '60px 24px', textAlign: 'center', gap: 10,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'linear-gradient(135deg,rgba(59,180,193,0.15),rgba(167,139,250,0.15))',
                border: `1px solid ${H.borderSubtle}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, marginBottom: 4,
              }}>
                {'🗺'}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: H.textPrimary }}>Aucun trajet enregistré</div>
              <div style={{ fontSize: 13, color: H.textTertiary, lineHeight: 1.5, maxWidth: 220 }}>
                Tes trajets avec destination apparaîtront ici une fois complétés.
              </div>
            </div>
          ) : (
            groupedTrips.map(({ label, trips: sectionTrips }) => (
              <div key={label}>
                <div style={{
                  fontSize: 10, fontWeight: 600, color: H.textTertiary,
                  textTransform: 'uppercase', letterSpacing: '0.06em', margin: '12px 0 7px',
                }}>
                  {label}
                </div>
                {sectionTrips.map((trip, idx) => {
                  const score = trip.safety_score ?? null;
                  return (
                    <motion.div
                      key={trip.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1], delay: idx * 0.04 }}
                      style={{
                        background: H.surfaceCard,
                        border: `1px solid ${score !== null && score < 40 ? 'rgba(251,191,36,0.15)' : H.borderSubtle}`,
                        borderRadius: 12, padding: 11, marginBottom: 8,
                      }}
                    >
                      {/* Card top */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                        {/* Mode icon + score dot */}
                        <div style={{
                          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                          background: H.surfaceEl, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 16, position: 'relative',
                        }}>
                          {modeIcon(trip)}
                          <div style={{
                            position: 'absolute', bottom: -2, right: -2,
                            width: 10, height: 10, borderRadius: '50%',
                            background: scoreColor(score),
                            border: `2px solid ${H.surfaceCard}`,
                          }} />
                        </div>
                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13, fontWeight: 600, color: H.textPrimary,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2,
                          }}>
                            {trip.destination || 'Destination inconnue'}
                          </div>
                          <div style={{ fontSize: 10, color: H.textTertiary }}>
                            {new Date(trip.created_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                            {trip.duration_min ? ` · ${trip.duration_min} min` : ''}
                          </div>
                        </div>
                        {/* Status badge */}
                        <div style={{
                          padding: '2px 7px', borderRadius: 9999, fontSize: 10, fontWeight: 600, flexShrink: 0,
                          background: trip.status === 'completed' ? 'rgba(52,211,153,0.12)' : 'rgba(251,191,36,0.12)',
                          color: trip.status === 'completed' ? H.success : H.warning,
                        }}>
                          {trip.status === 'completed' ? '✓ Arrivée' : '↩ Abandonné'}
                        </div>
                      </div>

                      {/* Route row */}
                      {trip.destination && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 7,
                          padding: '7px 10px', background: H.surfaceBase,
                          borderRadius: 8, marginBottom: 7,
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: H.teal }} />
                            <div style={{ width: 1, height: 8, background: H.borderDef }} />
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: H.purple }} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
                            <span style={{
                              fontSize: 11, fontWeight: 500, color: H.textPrimary,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                              Ma position
                            </span>
                            <span style={{
                              fontSize: 11, color: H.textSecond,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                              {trip.destination}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Meta + score */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {trip.duration_min != null && (
                            <span style={{ fontSize: 11, color: H.textTertiary }}>{'🕐'} {trip.duration_min} min</span>
                          )}
                          {trip.duration_min != null && (
                            <div style={{ width: 2, height: 2, borderRadius: '50%', background: H.borderDef }} />
                          )}
                          <span style={{ fontSize: 11, color: H.textTertiary }}>
                            {'📍'} {trip.distance_m ? `${(trip.distance_m / 1000).toFixed(1)} km` : '—'}
                          </span>
                        </div>
                        {score !== null && (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '2px 7px', borderRadius: 9999, fontSize: 10, fontWeight: 600,
                            background: scoreBg(score), color: scoreColor(score),
                          }}>
                            <div style={{
                              width: 28, height: 3, borderRadius: 2,
                              background: H.borderSubtle, overflow: 'hidden',
                            }}>
                              <div style={{
                                width: `${Math.min(score, 100)}%`, height: '100%',
                                borderRadius: 2, background: scoreColor(score),
                              }} />
                            </div>
                            Score {Math.round(score)}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* FILTER MODAL */}
        <AnimatePresence>{historyFilterOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setHistoryFilterOpen(false)}
              style={{
                position: 'absolute', inset: 0,
                background: 'rgba(7,16,31,0.65)',
                backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
                zIndex: 500, borderRadius: 'inherit',
              }}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: H.surfaceCard,
              borderTopLeftRadius: 20, borderTopRightRadius: 20,
              zIndex: 600, borderTop: `1px solid ${H.borderSubtle}`,
            }}>
              <div style={{ width: 32, height: 3, background: H.borderDef, borderRadius: 9999, margin: '10px auto 0' }} />
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px 12px', borderBottom: `1px solid ${H.borderSubtle}`,
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: H.textPrimary }}>Période</div>
                  <div style={{ fontSize: 11, color: H.textTertiary, marginTop: 2 }}>Filtrer l&apos;historique</div>
                </div>
                <button
                  onClick={() => { setHistoryActivePeriod(historySelectedPeriod); setHistoryFilterOpen(false); }}
                  disabled={!historySelectedPeriod}
                  style={{
                    width: 30, height: 30, borderRadius: 9999,
                    background: historySelectedPeriod ? H.teal : H.surfaceEl,
                    border: 'none', cursor: historySelectedPeriod ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: historySelectedPeriod ? 'white' : H.textTertiary,
                    fontSize: 14, fontFamily: 'inherit',
                  }}
                >
                  {'→'}
                </button>
              </div>
              {(['week', 'month', 'all'] as const).map(k => {
                const meta = periodMeta[k];
                const on = historySelectedPeriod === k;
                return (
                  <div
                    key={k}
                    onClick={() => setHistorySelectedPeriod(k)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '11px 16px', cursor: 'pointer',
                      background: on ? 'rgba(59,180,193,0.06)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                      background: on ? 'rgba(59,180,193,0.15)' : H.surfaceEl,
                      transition: 'background 0.15s',
                    }}>
                      {meta.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: on ? H.teal : H.textPrimary, transition: 'color 0.15s' }}>
                        {meta.name}
                      </div>
                      <div style={{ fontSize: 11, color: H.textTertiary, marginTop: 1 }}>{meta.desc}</div>
                    </div>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%',
                      border: on ? 'none' : `1.5px solid ${H.borderDef}`,
                      background: on ? H.teal : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: on ? 10 : 0, color: 'white',
                      transform: on ? 'scale(1.15)' : 'scale(1)',
                      transition: 'all 0.2s',
                    }}>
                      {on ? '✓' : ''}
                    </div>
                  </div>
                );
              })}
              <div style={{ height: 1, background: H.borderSubtle, margin: '4px 16px' }} />
              <button
                onClick={() => { setHistoryActivePeriod(null); setHistorySelectedPeriod(null); setHistoryFilterOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '12px 16px 16px', fontSize: 12, color: H.textTertiary,
                  gap: 4, background: 'none', border: 'none', width: '100%',
                  fontFamily: 'inherit', cursor: 'pointer',
                }}
              >
                {'↺'}&nbsp;&nbsp;Réinitialiser
              </button>
            </motion.div>
          </>
        )}</AnimatePresence>
      </motion.div>
    );
  };

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
        maxHeight: openToHistory ? '78%' : "72dvh",
        zIndex: openToHistory ? 310 : 50,
        backgroundColor: colors.sheet[theme],
        borderTopLeftRadius: 26,
        borderTopRightRadius: 26,
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
            backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
          }}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
        <AnimatePresence mode="wait">
          {state === "idle" && renderIdle()}
          {state === "planifier" && renderPlanifier()}
          {state === "active" && renderActive()}
          {state === "arrived" && renderArrived()}
          {state === "history" && renderHistory()}
        </AnimatePresence>
      </div>

      {/* FavorisSheet rendered as overlay outside AnimatePresence */}
      {renderFavoris()}

      <AnimatePresence>
        {showVerifNudge && (
          <VerificationNudgeSheet
            daysLeft={daysLeft}
            isNonSkippable={isNonSkippable}
            onVerify={() => { setShowVerifNudge(false); }}
            onSkip={() => { snooze(); setShowVerifNudge(false); }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showVerifGate && (
          <VerificationGateModal
            onVerify={() => { setShowVerifGate(false); }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
