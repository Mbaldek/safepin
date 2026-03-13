"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Map, Star, Signal, Users } from "lucide-react";
import { fetchDirectionsMulti, formatDuration, formatDistance } from "@/lib/directions";
import { fetchTransitRoute } from "@/lib/transit";
import { scoreRoute, scoreTransitRoute, countCorridorIncidents } from "@/lib/route-scoring";
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
import TripSummaryModal from "@/components/trip/TripSummaryModal";
import TripActiveHUD from "@/components/trip/TripActiveHUD";
import TripHistoryView from "@/components/trip/TripHistoryView";
import { colors, spring, noScrollbar, getCardStyle, getElevatedStyle } from "@/lib/trip-constants";
import type { Trip, SavedPlace, CircleContact } from "@/lib/trip-constants";

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
  const setMapFlyTo = useStore((s) => s.setMapFlyTo);
  const setShowWalkWithMe = useStore((s) => s.setShowWalkWithMe);
  const setHighlightedPinIds = useStore((s) => s.setHighlightedPinIds);
  const pins = useStore((s) => s.pins);
  const { isGated, shouldNudge, isNonSkippable, daysLeft, snooze } = useVerificationGate();
  const [state, setState] = useState<AppState>(openToHistory ? "history" : "idle");
  // When opened directly to history (openToHistory=true), "going back" means returning
  // to history state, not idle — idle is only the hub when opened normally from EscorteSheet
  const goBack = () => { setHighlightedPinIds(new Set()); openToHistory ? setState("history") : setState("idle"); };
  const [circleEnabled, setCircleEnabled] = useState(false);
  const [destination, setDestination] = useState("");
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [tripId, setTripId] = useState<string | null>(null);
  const [destCoords, setDestCoords] = useState<[number, number] | null>(null);
  const [tripSummary, setTripSummary] = useState<{ duration_s: number; distance_m: number; score: number } | null>(null);
  const [incidentsAvoided, setIncidentsAvoided] = useState(0);
  const [favAddMode, setFavAddMode] = useState(false);
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
      .from("trip_log")
      .select("id, to_label, planned_duration_s, danger_score, distance_m, mode, status, started_at")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
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
        .from("trip_log")
        .select("id, to_label, planned_duration_s, danger_score, distance_m, mode, status, started_at")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
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
  const [panelSnap, setPanelSnap] = useState<'expanded' | 'collapsed'>('expanded');
  const panelRef = useRef<HTMLDivElement>(null);

  const theme = isDark ? "dark" : "light";

  // Reset panel to expanded when entering planifier
  useEffect(() => {
    if (state === 'planifier') setPanelSnap('expanded');
  }, [state]);

  // Timer for active state
  useEffect(() => {
    if (state === "active") {
      const interval = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [state]);

  // Handle route-tap-collapse / route-tap-expand from map interactions
  useEffect(() => {
    const collapseHandler = () => setPanelSnap('collapsed');
    const expandHandler = () => setPanelSnap('expanded');
    window.addEventListener('route-tap-collapse', collapseHandler);
    window.addEventListener('route-tap-expand', expandHandler);
    return () => {
      window.removeEventListener('route-tap-collapse', collapseHandler);
      window.removeEventListener('route-tap-expand', expandHandler);
    };
  }, []);

  // Handle route-quick-launch event from RouteQuickCard
  useEffect(() => {
    const handler = async (e: Event) => {
      const idx = (e as CustomEvent).detail?.idx;
      const route = fetchedRoutes[idx];
      if (!route || !destination) return;
      setSelectedIdx(idx);
      setSelectedRouteIdx(idx);
      setState("active");
      setElapsedSeconds(0);
      setDistanceM(Math.round(route.distance));
      setPlannedDurationS(Math.round(route.duration));
      setActiveRoute({ coords: route.coords, destination });
      setPendingRoutes(null);
      setHighlightedPinIds(new Set());
      if (userId) {
        try {
          const origin = await getCurrentPosition();
          setTimeout(() => setMapFlyTo({ lat: origin.lat, lng: origin.lng, zoom: 16 }), 1400);
          const res = await fetch("/api/trips/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: userId,
              from_label: "Ma position",
              to_label: destination,
              mode: transportMode,
              origin_lat: origin.lat, origin_lng: origin.lng,
              dest_lat: destCoords ? destCoords[1] : origin.lat,
              dest_lng: destCoords ? destCoords[0] : origin.lng,
              planned_duration_s: Math.round(route.duration),
              danger_score: route.dangerScore,
              distance_m: Math.round(route.distance),
            }),
          });
          const data = await res.json();
          if (data.trip_id) setTripId(data.trip_id);
        } catch {}
      }
    };
    window.addEventListener('route-quick-launch', handler);
    return () => window.removeEventListener('route-quick-launch', handler);
  }, [fetchedRoutes, destination, userId, transportMode, destCoords]);

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
          const routeOptions: RouteOption[] = transitRoutes.slice(0, 3).map((tr, i) => {
            const incidents = countCorridorIncidents(tr.coords, pins);
            return {
              id: `transit-${i}`,
              label: i === 0 ? "Plus rapide" : i === 1 ? "Équilibrée" : "Moins de marche",
              color: ROUTE_COLORS[i] ?? "#94A3B8",
              coords: tr.coords,
              duration: tr.totalDuration,
              distance: 0,
              dangerScore: scoreTransitRoute(tr.steps, pins),
              nearbyIncidents: incidents.count,
              nearbyPinIds: incidents.pinIds,
              steps: tr.steps,
            };
          });
          setFetchedRoutes(routeOptions);
          setSelectedIdx(0);
          setSelectedRouteIdx(0);
          setPendingRoutes(routeOptions);
          if (routeOptions[0]?.nearbyPinIds) {
            setHighlightedPinIds(new Set(routeOptions[0].nearbyPinIds));
          }
          if (routeOptions[0]?.steps) {
            setTransitSegments(routeOptions[0].steps.map(s => ({
              coords: s.coords,
              color: s.mode === 'walking' ? '#94A3B8' : (s.lineColor || '#3BB4C1'),
              dashed: s.mode === 'walking',
            })));
          }
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
        const scored = results.map((r) => {
          const incidents = countCorridorIncidents(r.coords, pins);
          return {
            ...r,
            dangerScore: scoreRoute(r.coords, pins),
            nearbyIncidents: incidents.count,
            nearbyPinIds: incidents.pinIds,
          };
        });
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
            nearbyIncidents: r.nearbyIncidents,
            nearbyPinIds: r.nearbyPinIds,
          };
        });

        setFetchedRoutes(routeOptions);
        setSelectedIdx(0);
        setSelectedRouteIdx(0);
        setPendingRoutes(routeOptions);
        // Highlight pins for the initially selected (safest) route
        if (routeOptions[0]?.nearbyPinIds) {
          setHighlightedPinIds(new Set(routeOptions[0].nearbyPinIds));
        }
      } catch (e) {

      }
      setLoadingRoutes(false);
    })();
  }, [destCoords, transportMode, state]);


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
  const cardStyle = getCardStyle(isDark);
  const elevatedStyle = getElevatedStyle(isDark);


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
          onClick={() => { setState("history"); if (!allTrips.length && userId) { supabase.from("trip_log").select("id, to_label, planned_duration_s, danger_score, distance_m, mode, status, started_at").eq("user_id", userId).order("started_at", { ascending: false }).then(({ data }) => { if (data) setAllTrips(data); }); } }}
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
          const date = new Date(trip.started_at);
          const dayLabel = date.toLocaleDateString("fr-FR", { weekday: "short" });
          const durMin = trip.planned_duration_s ? Math.round(trip.planned_duration_s / 60) : null;
          const durLabel = durMin ? `${durMin}min` : "";
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
                  {trip.to_label || "Trajet"}
                </div>
                <div style={{ fontSize: 12, color: colors.textTertiary[theme] }}>
                  {dayLabel}{durLabel ? ` · ${durLabel}` : ""}
                </div>
              </div>
              {trip.danger_score != null && (
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
                  {Math.round(trip.danger_score)}
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
  const maxIncidents = fetchedRoutes.length > 0 ? Math.max(...fetchedRoutes.map(r => r.nearbyIncidents ?? 0)) : 0;

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
                onClick={() => {
                  setSelectedIdx(idx);
                  setSelectedRouteIdx(idx);
                  setHighlightedPinIds(new Set(route.nearbyPinIds));
                  if (route.steps) {
                    setTransitSegments(route.steps.map(s => ({
                      coords: s.coords,
                      color: s.mode === 'walking' ? '#94A3B8' : (s.lineColor || '#3BB4C1'),
                      dashed: s.mode === 'walking',
                    })));
                  } else {
                    setTransitSegments(null);
                  }
                }}
                style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" as const }}
              >
                <RouteCard
                  color={route.color}
                  label={route.label}
                  duration={formatDuration(route.duration)}
                  distance={formatDistance(route.distance)}
                  isSelected={selectedIdx === idx}
                  isDark={isDark}
                  steps={route.steps}
                  pins={pins}
                  onStepLocationTap={(lat, lng) => setMapFlyTo({ lat, lng, zoom: 16 })}
                  incidentsAvoided={maxIncidents - (route.nearbyIncidents ?? 0)}
                  nearbyIncidents={route.nearbyIncidents ?? 0}
                  nearbyPinIds={route.nearbyPinIds ?? []}
                  onPinFocus={(pin) => setMapFlyTo({ lat: pin.lat, lng: pin.lng, zoom: 16 })}
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
          setIncidentsAvoided(maxIncidents - (route.nearbyIncidents ?? 0));
          setActiveRoute({ coords: route.coords, destination });
          setPendingRoutes(null);
          if (userId) {
            try {
              const origin = await getCurrentPosition();
              // Zoom in to user's GPS location
              setTimeout(() => setMapFlyTo({ lat: origin.lat, lng: origin.lng, zoom: 16 }), 1400);
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

  // Render State 4 - Active HUD (extracted to TripActiveHUD)
  const renderActive = () => (
    <TripActiveHUD
      destination={destination}
      elapsedSeconds={elapsedSeconds}
      plannedDurationS={plannedDurationS}
      distanceM={distanceM}
      circleContacts={circleContacts}
      circleEnabled={circleEnabled}
      isSharingLocation={isSharingLocation}
      isDark={isDark}
      onComplete={async () => {
        await endTrip();
        setActiveRoute(null);
        setPendingRoutes(null);
        setTransitSegments(null);
        setState("arrived");
        if (isGated) setShowVerifGate(true);
        else if (shouldNudge) setShowVerifNudge(true);
      }}
      onSOS={() => {
        window.dispatchEvent(new CustomEvent("sos-trigger"));
      }}
      onToggleSharing={() => setIsSharingLocation(!isSharingLocation)}
    />
  );

  // Render State 5 - Arrived (extracted to TripSummaryModal)
  const renderArrived = () => (
    <TripSummaryModal
      isOpen={state === "arrived"}
      destination={destination}
      tripSummary={tripSummary}
      elapsedSeconds={elapsedSeconds}
      distanceM={distanceM}
      incidentsAvoided={incidentsAvoided}
      isDark={isDark}
      onClose={() => {
        goBack();
        setDestination("");
        setDestCoords(null);
        setTripSummary(null);
        setDistanceM(0);
        setPlannedDurationS(0);
      }}
    />
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

  // Render History screen (extracted to TripHistoryView)
  const renderHistory = () => (
    <TripHistoryView
      allTrips={allTrips}
      recentTrips={recentTrips}
      isDark={isDark}
      onBack={() => openToHistory ? onClose() : setState('idle')}
    />
  );

  const isCollapsible = state === 'planifier' && fetchedRoutes.length > 0;
  const isCollapsed = isCollapsible && panelSnap === 'collapsed';

  const handleDragEnd = useCallback((_: unknown, info: { velocity: { y: number }; offset: { y: number } }) => {
    if (!isCollapsible) return;
    // Swipe down or drag past threshold → collapse
    if (info.velocity.y > 100 || info.offset.y > 80) {
      setPanelSnap('collapsed');
    } else if (info.velocity.y < -100 || info.offset.y < -80) {
      setPanelSnap('expanded');
    }
  }, [isCollapsible]);

  return (
    <motion.div
      ref={panelRef}
      initial={{ y: "100%" }}
      animate={{ y: 0, maxHeight: isCollapsed ? 160 : (openToHistory ? '78%' : '72dvh') }}
      exit={{ y: "100%" }}
      transition={spring}
      drag={isCollapsible ? "y" : false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.1}
      onDragEnd={handleDragEnd}
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: openToHistory ? 310 : 50,
        backgroundColor: colors.sheet[theme],
        borderTopLeftRadius: 26,
        borderTopRightRadius: 26,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 -4px 30px rgba(0,0,0,0.15)",
        touchAction: isCollapsible ? "none" : "auto",
      }}
    >
      {/* Handle */}
      <div
        onClick={() => { if (isCollapsible) setPanelSnap(panelSnap === 'collapsed' ? 'expanded' : 'collapsed'); }}
        style={{
          padding: "10px 0 4px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          flexShrink: 0,
          cursor: isCollapsible ? "pointer" : "default",
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
          }}
        />
        {isCollapsible && (
          <div style={{ marginTop: 2 }}>
            {isCollapsed
              ? <ChevronUp size={14} color={isDark ? "rgba(255,255,255,0.25)" : "rgba(15,23,42,0.25)"} />
              : <ChevronDown size={14} color={isDark ? "rgba(255,255,255,0.25)" : "rgba(15,23,42,0.25)"} />
            }
          </div>
        )}
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
