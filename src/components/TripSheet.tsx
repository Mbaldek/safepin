'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, MapPin, Clock, Users, Home, Briefcase, Coffee, Shield,
  AlertTriangle, CheckCircle2, Navigation, Loader2, X, Plus,
  Phone, MoreHorizontal, Star, Heart,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/stores/useTheme';
import { useStore } from '@/stores/useStore';
import { useTripTracking, isNearDestination } from '@/hooks/useTripTracking';
import { useCircleContacts } from '@/hooks/useCircleContacts';
import FavorisSheet from '@/components/trip/FavorisSheet';
import type { Trip, TripView, TripContact, SavedPlace } from '@/types';
import { toast } from 'sonner';

// ─── Brand tokens ───────────────────────────────────────────────────

const T = {
  surfaceBase: '#0F172A',
  surfaceCard: '#1E293B',
  surfaceElevated: '#334155',
  surfaceGlass: 'rgba(30,41,59,0.85)',
  surfaceBaseL: '#F8FAFC',
  surfaceCardL: '#FFFFFF',
  surfaceElevatedL: '#FFFFFF',
  surfaceGlassL: 'rgba(255,255,255,0.92)',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  textInverse: '#0F172A',
  textPrimaryL: '#0F172A',
  textSecondaryL: '#475569',
  textTertiaryL: '#94A3B8',
  gradientStart: '#3BB4C1',
  accentGold: '#F5C341',
  accentCyan: '#22D3EE',
  semanticSuccess: '#34D399',
  semanticSuccessSoft: 'rgba(52,211,153,0.15)',
  semanticDanger: '#EF4444',
  borderSubtle: 'rgba(255,255,255,0.08)',
  borderDefault: 'rgba(255,255,255,0.12)',
  borderStrong: 'rgba(255,255,255,0.20)',
  borderFocus: '#3BB4C1',
  borderSubtleL: 'rgba(15,23,42,0.06)',
  borderDefaultL: 'rgba(15,23,42,0.10)',
  borderStrongL: 'rgba(15,23,42,0.20)',
  interactiveHover: 'rgba(255,255,255,0.05)',
  interactiveActive: 'rgba(255,255,255,0.10)',
  interactiveHoverL: 'rgba(15,23,42,0.04)',
  interactiveActiveL: 'rgba(15,23,42,0.07)',
  radiusMd: '12px',
  radiusLg: '16px',
  radiusXl: '24px',
  radius2xl: '32px',
  radiusFull: '9999px',
  shadowMd: '0 4px 12px rgba(0,0,0,0.25)',
  shadowGlow: '0 0 20px rgba(59,180,193,0.3)',
  easeOut: 'cubic-bezier(0.16,1,0.3,1)',
};

// ─── Helpers ────────────────────────────────────────────────────────

function calcDist(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function debounce<F extends (...args: never[]) => void>(fn: F, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<F>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Hier';
  return `Il y a ${days}j`;
}

type MapboxFeature = {
  id: string;
  text: string;
  place_name: string;
  center: [number, number];
  properties: Record<string, unknown>;
};

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 30 };

const AVATAR_COLORS = ['#A78BFA', '#3BB4C1', '#F5C341', '#34D399', '#60A5FA', '#F97316'];

const CATEGORY_ICON: Record<string, typeof Home> = {
  home: Home, work: Briefcase, cafe: Coffee, safe_space: Shield,
  health: Heart, sport: Star, other: MapPin,
};

// ─── Props ──────────────────────────────────────────────────────────

interface TripSheetProps {
  userId: string;
  userLat: number;
  userLng: number;
  initialDestination?: { name: string; address?: string; lat: number; lng: number };
  onTripStart: (trip: Trip) => void;
  onTripEnd: () => void;
  onClose: () => void;
}

// ─── Component ──────────────────────────────────────────────────────

export default function TripSheet({
  userId,
  userLat,
  userLng,
  initialDestination,
  onTripStart,
  onTripEnd,
  onClose,
}: TripSheetProps) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const d = isDark;

  // ── State ──
  const [view, setView] = useState<TripView>('idle');
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [query, setQuery] = useState('');
  const [destination, setDest] = useState<{ name: string; address?: string; lat: number; lng: number } | null>(
    initialDestination ?? null,
  );
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [searching, setSearching] = useState(false);
  const [walkWithMe, setWalkWithMe] = useState(true);
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [pinnedPlaces, setPinnedPlaces] = useState<SavedPlace[]>([]);
  const [startingTrip, setStartingTrip] = useState(false);
  const [showFavoris, setShowFavoris] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const { contacts } = useCircleContacts(userId);
  const { position } = useTripTracking(currentTrip?.id ?? null);

  // ── Computed ──
  const etaMinutes = destination
    ? Math.round(calcDist(userLat, userLng, destination.lat, destination.lng) / 0.083)
    : null;
  const distKm = destination
    ? calcDist(userLat, userLng, destination.lat, destination.lng)
    : 0;

  // ── Arrival detection ──
  useEffect(() => {
    if (!position || !currentTrip || view !== 'active') return;
    if (
      isNearDestination(
        position.coords.latitude,
        position.coords.longitude,
        currentTrip.dest_lat,
        currentTrip.dest_lng,
      )
    ) {
      handleEndTrip('arrived');
    }
  }, [position, currentTrip, view]);

  // ── Elapsed timer ──
  useEffect(() => {
    if (view !== 'active') return;
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [view]);

  // ── Fetch recent trips ──
  useEffect(() => {
    if (view !== 'idle' || !userId) return;
    supabase
      .from('trips')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['arrived', 'cancelled'])
      .order('started_at', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (data) setRecentTrips(data as unknown as Trip[]);
      });
  }, [view, userId]);

  // ── Fetch pinned favorites ──
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('saved_places')
      .select('*')
      .eq('user_id', userId)
      .eq('is_pinned', true)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (data) setPinnedPlaces(data as unknown as SavedPlace[]);
      });
  }, [userId]);

  // ── Mapbox search ──
  const debouncedSearch = useMemo(
    () =>
      debounce(async (q: string) => {
        if (q.length < 2) { setSuggestions([]); return; }
        setSearching(true);
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        const proximity = `${userLng},${userLat}`;
        const url =
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
          `?access_token=${token}&language=fr&limit=5&proximity=${proximity}&types=poi,address,place`;
        try {
          const res = await fetch(url);
          const json = await res.json();
          setSuggestions(json.features ?? []);
        } catch {
          setSuggestions([]);
        }
        setSearching(false);
      }, 300),
    [userLat, userLng],
  );

  useEffect(() => { debouncedSearch(query); }, [query, debouncedSearch]);

  // ── Actions ──

  const handleStartTrip = async () => {
    if (!destination || !userId) return;
    setStartingTrip(true);

    const { data, error } = await supabase
      .from('trips')
      .insert({
        user_id: userId,
        dest_name: destination.name,
        dest_lat: destination.lat,
        dest_lng: destination.lng,
        dest_address: destination.address ?? null,
        destination: destination.name,
        status: 'active',
        walk_with_me: walkWithMe,
        eta_minutes: etaMinutes,
        started_at: new Date().toISOString(),
        last_lat: userLat,
        last_lng: userLng,
        last_seen_at: new Date().toISOString(),
        distance_km: distKm,
      })
      .select('*')
      .single();

    if (error) {
      toast.error('Impossible de démarrer');
      setStartingTrip(false);
      return;
    }

    const trip = data as unknown as Trip;
    setCurrentTrip(trip);
    setView('active');
    setElapsedSeconds(0);
    onTripStart(trip);
    setStartingTrip(false);
  };

  const handleEndTrip = async (reason: 'arrived' | 'cancelled') => {
    if (!currentTrip) return;
    await supabase
      .from('trips')
      .update({
        status: reason,
        ended_at: new Date().toISOString(),
        duration_min: Math.round(elapsedSeconds / 60),
      })
      .eq('id', currentTrip.id);

    if (reason === 'arrived') {
      setView('arrived');
      toast.success('Arrivée confirmée');
      setTimeout(() => {
        setView('idle');
        setCurrentTrip(null);
        setDest(null);
        setQuery('');
        setElapsedSeconds(0);
        onTripEnd();
      }, 3000);
    } else {
      setCurrentTrip(null);
      setView('idle');
      setDest(null);
      setQuery('');
      setElapsedSeconds(0);
      onTripEnd();
    }
  };

  const handleToggleWWM = async (val: boolean) => {
    setWalkWithMe(val);
    if (!currentTrip) return;
    await supabase
      .from('trips')
      .update({ walk_with_me: val })
      .eq('id', currentTrip.id);
  };

  const handleSOS = async () => {
    if (!currentTrip) return;
    await supabase
      .from('trips')
      .update({ status: 'sos' })
      .eq('id', currentTrip.id);
    setCurrentTrip((t) => (t ? { ...t, status: 'sos' } : null));
    setView('sos');
    toast.error('SOS envoyé à ton cercle');
    window.dispatchEvent(new CustomEvent('sos-trigger'));
  };

  // ── Shorthand colors ──
  const bg = d ? T.surfaceBase : T.surfaceBaseL;
  const cardBg = d ? T.surfaceCard : T.surfaceCardL;
  const elevBg = d ? T.surfaceElevated : T.surfaceElevatedL;
  const glassBg = d ? T.surfaceGlass : T.surfaceGlassL;
  const txt1 = d ? T.textPrimary : T.textPrimaryL;
  const txt2 = d ? T.textSecondary : T.textSecondaryL;
  const txt3 = d ? T.textTertiary : T.textTertiaryL;
  const brdSub = d ? T.borderSubtle : T.borderSubtleL;
  const brdDef = d ? T.borderDefault : T.borderDefaultL;
  const hover = d ? T.interactiveHover : T.interactiveHoverL;

  // ── Render: Contact avatar ──
  const Avatar = ({ name, idx, size = 40 }: { name: string; idx: number; size?: number }) => {
    const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: `${color}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.35,
          fontWeight: 700,
          color,
          flexShrink: 0,
        }}
      >
        {name[0]?.toUpperCase()}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════
  // VIEW: IDLE
  // ══════════════════════════════════════════════════════════════════════

  const renderIdle = () => (
    <motion.div
      key="idle"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={SPRING}
      style={{ padding: '0 20px 20px', overflow: 'auto', scrollbarWidth: 'none' as const }}
    >
      {/* Title */}
      <div style={{ padding: '14px 0 10px' }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: txt1 }}>Où vas-tu ?</div>
        <div style={{ fontSize: 13, color: txt2, marginTop: 2 }}>
          Tes contacts suivront ton trajet en temps réel
        </div>
      </div>

      {/* Search input */}
      <div style={{ padding: '0 0 12px' }}>
        <div
          onClick={() => searchRef.current?.focus()}
          style={{
            background: cardBg,
            border: `1px solid ${brdDef}`,
            borderRadius: T.radiusMd,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Search size={16} strokeWidth={1.5} color={txt3} />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une destination…"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 14,
              color: txt1,
            }}
          />
          {query && (
            <button
              onClick={(e) => { e.stopPropagation(); setQuery(''); setSuggestions([]); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <X size={16} strokeWidth={1.5} color={txt3} />
            </button>
          )}
          {searching && <Loader2 size={16} strokeWidth={1.5} color={txt3} style={{ animation: 'spin 1s linear infinite' }} />}
          <Navigation size={16} strokeWidth={1.5} color={txt3} />
        </div>

        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <div
            style={{
              marginTop: 4,
              background: cardBg,
              border: `1px solid ${brdDef}`,
              borderRadius: T.radiusMd,
              overflow: 'hidden',
            }}
          >
            {suggestions.map((f, i) => (
              <div
                key={f.id}
                onClick={() => {
                  setDest({ name: f.text, address: f.place_name, lat: f.center[1], lng: f.center[0] });
                  setQuery('');
                  setSuggestions([]);
                }}
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  borderBottom: i < suggestions.length - 1 ? `1px solid ${brdSub}` : 'none',
                }}
              >
                <MapPin size={16} strokeWidth={1.5} color={T.gradientStart} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: txt1 }}>{f.text}</div>
                  <div style={{ fontSize: 11, color: txt3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                    {f.place_name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick favorites (horizontal scroll) */}
      {pinnedPlaces.length > 0 && (
        <div style={{ display: 'flex', gap: 8, padding: '0 0 10px', overflowX: 'auto', scrollbarWidth: 'none' as const }}>
          {pinnedPlaces.map((place) => {
            const IconComp = CATEGORY_ICON[place.category] ?? MapPin;
            const tintColor =
              place.category === 'home' ? T.accentGold
                : place.category === 'work' ? T.accentCyan
                  : place.category === 'cafe' ? T.semanticSuccess
                    : T.gradientStart;
            return (
              <div
                key={place.id}
                onClick={() => setDest({ name: place.label, address: place.address ?? undefined, lat: place.lat, lng: place.lng })}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: T.radiusLg,
                    background: `${tintColor}15`,
                    border: `1px solid ${tintColor}25`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconComp size={20} strokeWidth={1.5} color={tintColor} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 500, color: txt3, maxWidth: 56, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, textAlign: 'center' }}>
                  {place.label}
                </span>
              </div>
            );
          })}
          {/* Add button */}
          <div
            onClick={() => setShowFavoris(true)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: T.radiusLg,
                border: `1px dashed ${brdDef}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Plus size={20} strokeWidth={1.5} color={txt3} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 500, color: txt3 }}>Ajouter</span>
          </div>
        </div>
      )}

      {/* Divider + Récents */}
      <div style={{ height: 1, background: brdSub, margin: '6px 0 12px' }} />
      <div style={{ fontSize: 11, fontWeight: 600, color: txt3, letterSpacing: 0.5, textTransform: 'uppercase' as const, marginBottom: 8 }}>
        Récents
      </div>

      {recentTrips.length === 0 ? (
        <div style={{ background: cardBg, borderRadius: T.radiusMd, padding: '20px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: txt3 }}>Aucun trajet récent</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {recentTrips.map((trip) => (
            <div
              key={trip.id}
              onClick={() =>
                setDest({
                  name: trip.dest_name ?? trip.destination ?? 'Trajet',
                  address: trip.dest_address ?? undefined,
                  lat: trip.dest_lat ?? 0,
                  lng: trip.dest_lng ?? 0,
                })
              }
              style={{
                background: cardBg,
                borderRadius: T.radiusMd,
                border: `1px solid ${brdSub}`,
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: T.radiusMd,
                  background: hover,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Clock size={16} strokeWidth={1.5} color={txt3} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: txt1 }}>
                  {trip.dest_name ?? trip.destination ?? 'Trajet'}
                </div>
                <div style={{ fontSize: 11, color: txt3 }}>
                  {trip.dest_address ? `${trip.dest_address.slice(0, 40)}` : ''}
                  {trip.dest_lat && trip.dest_lng ? ` · ${calcDist(userLat, userLng, trip.dest_lat, trip.dest_lng).toFixed(1)} km` : ''}
                </div>
              </div>
              <span style={{ fontSize: 11, color: txt3, flexShrink: 0 }}>
                {trip.started_at ? relativeTime(trip.started_at) : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Destination preview card */}
      {destination && (
        <div
          style={{
            marginTop: 14,
            background: 'rgba(52,211,153,0.06)',
            border: '1px solid rgba(52,211,153,0.14)',
            borderRadius: T.radiusLg,
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <MapPin size={16} strokeWidth={1.5} color={T.semanticSuccess} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: txt1 }}>{destination.name}</div>
              {destination.address && (
                <div style={{ fontSize: 11, color: txt2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                  {destination.address}
                </div>
              )}
            </div>
            <button
              onClick={() => setDest(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
            >
              <X size={16} strokeWidth={1.5} color={txt3} />
            </button>
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: `${T.semanticSuccess}15`,
              borderRadius: T.radiusFull,
              padding: '4px 10px',
            }}
          >
            <Clock size={12} strokeWidth={1.5} color={T.semanticSuccess} />
            <span style={{ fontSize: 12, fontWeight: 500, color: T.semanticSuccess }}>
              {etaMinutes} min à pied · {distKm.toFixed(1)} km
            </span>
          </div>
        </div>
      )}

      {/* CTA */}
      <div style={{ marginTop: 14 }}>
        {destination ? (
          <button
            onClick={handleStartTrip}
            disabled={startingTrip}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: T.radiusLg,
              background: startingTrip ? elevBg : `linear-gradient(135deg, ${T.gradientStart}, #0E7490)`,
              border: 'none',
              fontSize: 15,
              fontWeight: 700,
              color: startingTrip ? txt3 : '#FFFFFF',
              cursor: startingTrip ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {startingTrip && <Loader2 size={16} strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} />}
            Lancer l&apos;escorte
          </button>
        ) : (
          <button
            onClick={() => {
              // TODO: emit event for map pick mode
            }}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: T.radiusLg,
              background: cardBg,
              border: `1px solid ${brdDef}`,
              fontSize: 14,
              fontWeight: 600,
              color: txt2,
              cursor: 'pointer',
            }}
          >
            Choisir sur la carte
          </button>
        )}
      </div>
    </motion.div>
  );

  // ══════════════════════════════════════════════════════════════════════
  // VIEW: ACTIVE
  // ══════════════════════════════════════════════════════════════════════

  const renderActive = () => {
    const remainMin = Math.max(0, (currentTrip?.eta_minutes ?? etaMinutes ?? 0) - Math.round(elapsedSeconds / 60));
    const progress = currentTrip?.eta_minutes
      ? Math.min(100, (elapsedSeconds / (currentTrip.eta_minutes * 60)) * 100)
      : 0;

    return (
      <motion.div
        key="active"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={SPRING}
        style={{ position: 'relative' }}
      >
        {/* Active bar (top gradient pulse) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: `linear-gradient(90deg, ${T.gradientStart}, ${T.semanticSuccess})`,
            animation: 'pulse-bar 1.8s ease-in-out infinite',
          }}
        />

        {/* TOP HUD pill */}
        <div
          style={{
            margin: '8px 16px 0',
            background: glassBg,
            backdropFilter: 'blur(16px)',
            border: `1px solid ${brdSub}`,
            borderRadius: T.radiusFull,
            padding: '9px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Clock size={14} strokeWidth={1.5} color={T.semanticSuccess} />
          <span style={{ fontSize: 15, fontWeight: 600, color: txt1 }}>{remainMin} min</span>
          <div style={{ width: 1, height: 14, background: brdDef }} />
          <span style={{ fontSize: 12, color: txt2 }}>{distKm.toFixed(1)} km</span>
          <div style={{ flex: 1 }} />
          <span
            style={{
              fontSize: 11,
              color: txt3,
              background: hover,
              borderRadius: T.radiusFull,
              padding: '3px 8px',
            }}
          >
            Pied
          </span>
        </div>

        {/* Sheet content */}
        <div style={{ padding: '14px 20px 20px', overflow: 'auto', scrollbarWidth: 'none' as const }}>

          {/* Destination row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: T.radiusMd,
                background: T.semanticSuccessSoft,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MapPin size={18} strokeWidth={1.5} color={T.semanticSuccess} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: txt1 }}>
                {currentTrip?.dest_name ?? destination?.name}
              </div>
              <div style={{ fontSize: 12, color: txt2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                {currentTrip?.dest_address ?? destination?.address}
              </div>
            </div>
            <div
              style={{
                background: `${T.semanticSuccess}15`,
                borderRadius: T.radiusFull,
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 600,
                color: T.semanticSuccess,
              }}
            >
              {remainMin} min
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: 4, background: hover, borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{ height: '100%', background: `linear-gradient(90deg, ${T.gradientStart}, ${T.semanticSuccess})`, borderRadius: 2 }}
            />
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: brdSub, marginBottom: 12 }} />

          {/* Circle contacts */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: txt3, letterSpacing: 0.5, textTransform: 'uppercase' as const }}>
                Cercle de confiance
              </span>
              <span style={{ fontSize: 11, fontWeight: 500, color: T.gradientStart, cursor: 'pointer' }}>Gérer</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              {contacts.slice(0, 4).map((c, i) => (
                <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{ position: 'relative' }}>
                    <Avatar name={c.name} idx={i} size={40} />
                    {/* Status dot */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        border: `2px solid ${bg}`,
                        background: c.is_watching
                          ? T.semanticSuccess
                          : c.notified
                            ? T.accentGold
                            : brdDef,
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 10, color: txt3, maxWidth: 50, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, textAlign: 'center' }}>
                    {c.name.split(' ')[0]}
                  </span>
                </div>
              ))}
              {/* Add contact button */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: `1px dashed ${brdDef}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={16} strokeWidth={1.5} color={txt3} />
                </div>
                <span style={{ fontSize: 10, color: txt3 }}>Ajouter</span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: brdSub, marginBottom: 12 }} />

          {/* Walk With Me row */}
          <div
            style={{
              background: 'rgba(59,180,193,0.06)',
              border: '1px solid rgba(59,180,193,0.18)',
              borderRadius: T.radiusLg,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: T.radiusMd,
                background: 'rgba(59,180,193,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Users size={18} strokeWidth={1.5} color={T.gradientStart} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: txt1 }}>Marche avec moi</div>
              <div style={{ fontSize: 11, color: txt2 }}>Ton cercle te voit en direct</div>
            </div>
            {/* Toggle */}
            <div
              onClick={() => handleToggleWWM(!walkWithMe)}
              style={{
                width: 40,
                height: 24,
                borderRadius: 12,
                background: walkWithMe ? T.gradientStart : brdDef,
                padding: 2,
                cursor: 'pointer',
                transition: 'background 200ms ease-out',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <motion.div
                animate={{ x: walkWithMe ? 16 : 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {[
              { icon: Star, label: 'Favoris', color: T.accentGold, action: () => setShowFavoris(true) },
              { icon: Shield, label: 'Safe Spaces', color: T.semanticSuccess, action: () => {} },
              { icon: Phone, label: 'Contacter', color: T.gradientStart, action: () => {} },
              { icon: MoreHorizontal, label: 'Plus', color: txt3, action: () => {} },
            ].map((qa) => (
              <div
                key={qa.label}
                onClick={qa.action}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 5,
                  padding: '10px 8px',
                  background: hover,
                  border: `1px solid ${brdSub}`,
                  borderRadius: T.radiusMd,
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: T.radiusMd,
                    background: `${qa.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <qa.icon size={16} strokeWidth={1.5} color={qa.color} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: txt2, whiteSpace: 'nowrap' as const }}>
                  {qa.label}
                </span>
              </div>
            ))}
          </div>

          {/* SOS Button */}
          <button
            onClick={handleSOS}
            style={{
              width: '100%',
              padding: '15px',
              borderRadius: T.radius2xl,
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.30)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer',
              marginBottom: 8,
            }}
          >
            <AlertTriangle size={16} strokeWidth={1.5} color={T.semanticDanger} />
            <span style={{ fontSize: 14, fontWeight: 700, color: T.semanticDanger }}>
              Alerter mon cercle · SOS
            </span>
          </button>

          {/* End trip */}
          <button
            onClick={() => handleEndTrip('arrived')}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: T.radiusLg,
              background: 'transparent',
              border: `1px solid ${brdDef}`,
              fontSize: 14,
              fontWeight: 600,
              color: txt2,
              cursor: 'pointer',
            }}
          >
            Je suis arrivée
          </button>
        </div>
      </motion.div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════
  // VIEW: ARRIVED
  // ══════════════════════════════════════════════════════════════════════

  const renderArrived = () => (
    <motion.div
      key="arrived"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={SPRING}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(52,211,153,0.12)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        zIndex: 10,
      }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ duration: 0.5 }}
      >
        <CheckCircle2 size={64} strokeWidth={1.5} color={T.semanticSuccess} />
      </motion.div>
      <div style={{ fontSize: 32, fontWeight: 300, color: txt1 }}>Tu es arrivée !</div>
      <div style={{ fontSize: 16, color: txt2 }}>
        {currentTrip?.dest_name ?? destination?.name}
      </div>
    </motion.div>
  );

  // ══════════════════════════════════════════════════════════════════════
  // VIEW: SOS
  // ══════════════════════════════════════════════════════════════════════

  const renderSOS = () => (
    <motion.div
      key="sos"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={SPRING}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(239,68,68,0.12)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        zIndex: 10,
      }}
    >
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <AlertTriangle size={64} strokeWidth={1.5} color={T.semanticDanger} />
      </motion.div>
      <div style={{ fontSize: 28, fontWeight: 700, color: T.semanticDanger }}>SOS envoyé</div>
      <div style={{ fontSize: 14, color: txt2 }}>Ton cercle a été alerté</div>
      <button
        onClick={() => {
          setView('active');
          if (currentTrip) {
            supabase.from('trips').update({ status: 'active' }).eq('id', currentTrip.id);
            setCurrentTrip((t) => (t ? { ...t, status: 'active' } : null));
          }
        }}
        style={{
          marginTop: 16,
          padding: '12px 32px',
          borderRadius: T.radiusLg,
          background: cardBg,
          border: `1px solid ${brdDef}`,
          fontSize: 14,
          fontWeight: 600,
          color: txt1,
          cursor: 'pointer',
        }}
      >
        Revenir au trajet
      </button>
    </motion.div>
  );

  // ══════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ══════════════════════════════════════════════════════════════════════

  return (
    <>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={SPRING}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: view === 'arrived' || view === 'sos' ? '100dvh' : '72dvh',
          zIndex: 50,
          background: bg,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 -4px 30px rgba(0,0,0,0.15)',
        }}
      >
        {/* Handle */}
        {view !== 'arrived' && view !== 'sos' && (
          <div style={{ padding: '10px 0 4px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: d ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
              }}
            />
          </div>
        )}

        {/* Close button (idle only) */}
        {view === 'idle' && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 14,
              right: 16,
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: cardBg,
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 2,
            }}
          >
            <X size={16} strokeWidth={1.5} color={txt2} />
          </button>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden', minHeight: 0, position: 'relative' }}>
          <AnimatePresence mode="wait">
            {view === 'idle' && renderIdle()}
            {view === 'active' && renderActive()}
            {view === 'arrived' && renderArrived()}
            {view === 'sos' && renderSOS()}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* FavorisSheet overlay */}
      <FavorisSheet
        isOpen={showFavoris}
        onClose={() => setShowFavoris(false)}
        onSelect={(place) => {
          setDest({ name: place.label, address: place.address ?? undefined, lat: place.lat, lng: place.lng });
          setShowFavoris(false);
        }}
        userId={userId}
        userLat={userLat}
        userLng={userLng}
      />

      {/* CSS keyframes for spin and pulse animations */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-bar { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
      `}</style>
    </>
  );
}
