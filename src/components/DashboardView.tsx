// src/components/DashboardView.tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, MapPin, Star, BarChart2, Rss, ChevronRight, Navigation } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import {
  Pin, AppNotification, PlaceNote, SavedRoute, LiveSession,
  CATEGORIES, SEVERITY,
} from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const springTransition = { type: 'spring', damping: 32, stiffness: 320, mass: 0.8 } as const;

const MODE_EMOJI: Record<string, string> = {
  foot: '🚶', metro: '🚇', bus: '🚌', cycling: '🚲', car: '🚗',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(m: number): string {
  return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 2) return 'just now';
  if (hours < 1) return `${mins}min ago`;
  if (days < 1) return `${hours}h ago`;
  return `${days}d ago`;
}

function severityColor(sev: Pin['severity']): string {
  return SEVERITY[sev]?.color ?? '#6b7280';
}

// ─── Level system ─────────────────────────────────────────────────────────────

type Level = { label: string; emoji: string; color: string; minScore: number };

const LEVELS: Level[] = [
  { label: 'Newcomer',   emoji: '🌱', color: '#10b981', minScore: 0   },
  { label: 'Scout',      emoji: '🔍', color: '#3b82f6', minScore: 50  },
  { label: 'Guardian',   emoji: '🛡️', color: '#8b5cf6', minScore: 150 },
  { label: 'Sentinel',   emoji: '⚡', color: '#f59e0b', minScore: 350 },
  { label: 'Protector',  emoji: '🏆', color: '#f43f5e', minScore: 700 },
];

function getLevel(score: number): Level {
  return [...LEVELS].reverse().find((l) => score >= l.minScore) ?? LEVELS[0];
}

// ─── Notification helpers ─────────────────────────────────────────────────────

function notifLabel(n: AppNotification): string {
  return n.title || 'Notification';
}

function notifEmoji(type: AppNotification['type']): string {
  const map: Record<string, string> = {
    emergency: '🆘', vote: '✅', comment: '💬',
    resolve: '✅', community: '👥', trusted_contact: '🤝',
  };
  return map[type] ?? '🔔';
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function LiveBadge() {
  return (
    <span
      className="flex items-center gap-1 text-[0.6rem] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
      style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
    >
      <Radio size={9} />
      LIVE
    </span>
  );
}

function DangerBadge({ score }: { score: number }) {
  const color = score === 0 ? '#10b981' : score <= 2 ? '#f59e0b' : '#f43f5e';
  const label = score === 0 ? 'Safe' : score <= 2 ? 'Mild risk' : 'Danger';
  return (
    <span
      className="text-[0.6rem] font-bold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {label}
    </span>
  );
}

function EmptyState({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      <span className="text-4xl leading-none">{emoji}</span>
      <div>
        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{title}</p>
        <p className="text-xs mt-1 max-w-[220px] mx-auto" style={{ color: 'var(--text-muted)' }}>{body}</p>
      </div>
    </div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <p className="text-[0.65rem] font-black uppercase tracking-widest px-1" style={{ color: 'var(--text-muted)' }}>
      {text}
    </p>
  );
}

function SkeletonList({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 rounded-2xl animate-pulse" style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border)' }} />
      ))}
    </div>
  );
}

// ─── Tab animation variants ───────────────────────────────────────────────────

const TAB_VARIANTS = {
  initial: { opacity: 0, x: 18 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.18 } },
  exit:    { opacity: 0, x: -18, transition: { duration: 0.12 } },
};

// ─── Types ────────────────────────────────────────────────────────────────────

type DashTab      = 'feed' | 'nearby' | 'favorites' | 'stats';
type NearbyFilter = 'all' | 'active' | 'sos' | 'live';
type NearbyEntry  = { pin: Pin; dist: number };

// ─── Root component ───────────────────────────────────────────────────────────

export default function DashboardView({ onClose }: { onClose: () => void }) {
  const {
    userId, userProfile, pins, userLocation,
    favPlaceIds, placeNotes, followedPinIds, liveSessions,
    notifSettings, notifications, setActiveSheet, setTripPrefill, setActiveTab,
  } = useStore();

  const [activeTab, setTab]       = useState<DashTab>('feed');
  const [nearbyFilter, setNearbyFilter] = useState<NearbyFilter>('all');
  const [savedRoutes, setSavedRoutes]   = useState<SavedRoute[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);

  // Confirmed votes + comments for stats
  const [confirmedVotes, setConfirmedVotes] = useState(0);

  useEffect(() => {
    if (!userId) return;

    setRoutesLoading(true);
    supabase
      .from('saved_routes')
      .select('*')
      .eq('user_id', userId)
      .order('last_used_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { setSavedRoutes((data as SavedRoute[]) ?? []); setRoutesLoading(false); });

    supabase
      .from('pin_votes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('vote_type', 'confirm')
      .then(({ count }) => setConfirmedVotes(count ?? 0));
  }, [userId]);

  // Derived
  const followedPins = useMemo(
    () => pins.filter((p) => followedPinIds.includes(p.id)),
    [pins, followedPinIds],
  );

  const nearbyEntries = useMemo((): NearbyEntry[] => {
    if (!userLocation) return [];
    const radius = notifSettings.proximity_radius_m;
    return pins
      .map((p) => ({ pin: p, dist: haversineMeters(userLocation.lat, userLocation.lng, p.lat, p.lng) }))
      .filter(({ dist }) => dist <= radius)
      .sort((a, b) => a.dist - b.dist);
  }, [pins, userLocation, notifSettings.proximity_radius_m]);

  const filteredNearby = useMemo((): NearbyEntry[] => {
    return nearbyEntries.filter(({ pin }) => {
      if (nearbyFilter === 'active') return !pin.resolved_at;
      if (nearbyFilter === 'sos')  return pin.is_emergency && !pin.resolved_at;
      if (nearbyFilter === 'live') return liveSessions.some((s) => s.pin_id === pin.id && !s.ended_at);
      return true;
    });
  }, [nearbyEntries, nearbyFilter, liveSessions]);

  const favPlaces = useMemo(
    () => placeNotes.filter((n) => favPlaceIds.includes(n.id)),
    [placeNotes, favPlaceIds],
  );

  const myPins     = useMemo(() => pins.filter((p) => p.user_id === userId), [pins, userId]);
  const activePins = useMemo(() => myPins.filter((p) => !p.resolved_at), [myPins]);

  const trustScore = myPins.length * 10 + confirmedVotes * 5;
  const level      = getLevel(trustScore);

  const feedNotifs = useMemo(() => [...notifications].reverse().slice(0, 20), [notifications]);

  function openTripToPlace(place: PlaceNote) {
    setTripPrefill({ destination: place.name ?? place.note.slice(0, 30), destCoords: [place.lng, place.lat] });
    setActiveTab('trip');
    onClose();
  }

  function openTripForRoute(route: SavedRoute) {
    setTripPrefill({ departure: route.from_label ?? undefined, destination: route.to_label });
    setActiveTab('trip');
    onClose();
  }

  return (
    <>
      <motion.div
        key="dashboard-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 z-200"
        style={{ backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      <motion.div
        key="dashboard-sheet"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={springTransition}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[92%] max-w-110 rounded-t-3xl z-201 flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--bg-primary)', maxHeight: '82dvh', boxShadow: '0 -8px 40px rgba(0,0,0,0.25)' }}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full" style={{ backgroundColor: 'var(--border)' }} />
        </div>

        <div className="px-5 pt-1 pb-3 shrink-0">
          <h2 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Dashboard</h2>
        </div>

        {/* Tab selector */}
        <div className="flex gap-1.5 px-4 pb-3 shrink-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {(
            [
              { id: 'feed',      label: 'Feed',      Icon: Rss       },
              { id: 'nearby',    label: 'Nearby',    Icon: MapPin    },
              { id: 'favorites', label: 'Favorites', Icon: Star      },
              { id: 'stats',     label: 'Stats',     Icon: BarChart2 },
            ] as { id: DashTab; label: string; Icon: React.ElementType }[]
          ).map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0"
                style={{
                  backgroundColor: active ? 'var(--accent)' : 'var(--bg-card)',
                  color: active ? '#fff' : 'var(--text-muted)',
                  border: active ? '1.5px solid transparent' : '1.5px solid var(--border)',
                }}
              >
                <Icon size={13} />
                {label}
              </button>
            );
          })}
        </div>

        <div className="h-px mx-4 shrink-0" style={{ backgroundColor: 'var(--border)' }} />

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <AnimatePresence mode="wait">
            {activeTab === 'feed' && (
              <FeedTab key="feed" notifications={feedNotifs} followedPins={followedPins} />
            )}
            {activeTab === 'nearby' && (
              <NearbyTab
                key="nearby"
                nearbyPins={filteredNearby}
                liveSessions={liveSessions}
                filter={nearbyFilter}
                setFilter={setNearbyFilter}
                userLocation={userLocation}
              />
            )}
            {activeTab === 'favorites' && (
              <FavoritesTab
                key="favorites"
                favPlaces={favPlaces}
                savedRoutes={savedRoutes}
                routesLoading={routesLoading}
                onOpenTripToPlace={openTripToPlace}
                onOpenTripForRoute={openTripForRoute}
              />
            )}
            {activeTab === 'stats' && (
              <StatsTab
                key="stats"
                myPinsCount={myPins.length}
                activePinsCount={activePins.length}
                confirmedVotes={confirmedVotes}
                trustScore={trustScore}
                level={level}
                onViewProfile={() => { setActiveSheet('profile'); onClose(); }}
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}

// ─── Feed tab ─────────────────────────────────────────────────────────────────

function FeedTab({ notifications, followedPins }: { notifications: AppNotification[]; followedPins: Pin[] }) {
  if (followedPins.length === 0 && notifications.length === 0) {
    return (
      <motion.div variants={TAB_VARIANTS} initial="initial" animate="animate" exit="exit">
        <EmptyState emoji="📡" title="Nothing here yet" body="Follow pins on the map to see their activity here" />
      </motion.div>
    );
  }

  return (
    <motion.div variants={TAB_VARIANTS} initial="initial" animate="animate" exit="exit" className="space-y-3">
      {notifications.length > 0 && (
        <div className="space-y-2">
          <SectionLabel text="Recent activity" />
          {notifications.map((n) => <NotifCard key={n.id} notif={n} />)}
        </div>
      )}
      {followedPins.length > 0 && (
        <div className="space-y-2 mt-3">
          <SectionLabel text="Followed pins" />
          {followedPins.map((pin) => <FollowedPinCard key={pin.id} pin={pin} />)}
        </div>
      )}
    </motion.div>
  );
}

function NotifCard({ notif }: { notif: AppNotification }) {
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-2xl"
      style={{
        backgroundColor: notif.read ? 'var(--bg-card)' : 'rgba(99,102,241,0.07)',
        border: `1.5px solid ${notif.read ? 'var(--border)' : 'rgba(99,102,241,0.25)'}`,
      }}
    >
      <span className="text-xl leading-none mt-0.5">{notifEmoji(notif.type)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug truncate" style={{ color: 'var(--text-primary)' }}>
          {notifLabel(notif)}
        </p>
        {notif.body && (
          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{notif.body}</p>
        )}
        <p className="text-[0.65rem] mt-1" style={{ color: 'var(--text-muted)' }}>{timeAgo(notif.created_at)}</p>
      </div>
      {!notif.read && (
        <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: 'var(--accent)' }} />
      )}
    </div>
  );
}

function FollowedPinCard({ pin }: { pin: Pin }) {
  const { setSelectedPin, setActiveSheet } = useStore();
  const cat = CATEGORIES[pin.category];
  const isActive = !pin.resolved_at;

  return (
    <button
      onClick={() => { setSelectedPin(pin); setActiveSheet('detail'); }}
      className="w-full text-left flex items-start gap-3 p-3 rounded-2xl transition active:scale-[0.98]"
      style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border)' }}
    >
      <span className="text-xl leading-none mt-0.5">{cat?.emoji ?? '⚠️'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{cat?.label ?? 'Incident'}</span>
          <span
            className="text-[0.6rem] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: isActive ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)', color: isActive ? '#10b981' : '#6b7280' }}
          >
            {isActive ? 'Active' : 'Resolved'}
          </span>
        </div>
        {pin.description && (
          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{pin.description}</p>
        )}
        <p className="text-[0.65rem] mt-1" style={{ color: 'var(--text-muted)' }}>{timeAgo(pin.created_at)}</p>
      </div>
      <ChevronRight size={15} style={{ color: 'var(--text-muted)', marginTop: 2 }} />
    </button>
  );
}

// ─── Nearby tab ───────────────────────────────────────────────────────────────

const NEARBY_FILTERS: { id: NearbyFilter; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'active', label: 'Active' },
  { id: 'sos', label: 'SOS' }, { id: 'live',   label: 'LIVE'   },
];

function NearbyTab({
  nearbyPins, liveSessions, filter, setFilter, userLocation,
}: {
  nearbyPins: NearbyEntry[];
  liveSessions: LiveSession[];
  filter: NearbyFilter;
  setFilter: (f: NearbyFilter) => void;
  userLocation: { lat: number; lng: number } | null;
}) {
  return (
    <motion.div variants={TAB_VARIANTS} initial="initial" animate="animate" exit="exit" className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {NEARBY_FILTERS.map(({ id, label }) => {
          const active = filter === id;
          return (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className="px-3.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0"
              style={{
                backgroundColor: active ? 'var(--accent)' : 'var(--bg-card)',
                color: active ? '#fff' : 'var(--text-muted)',
                border: active ? '1.5px solid transparent' : '1.5px solid var(--border)',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {!userLocation ? (
        <EmptyState emoji="📍" title="Location unavailable" body="Enable location access to see nearby safety alerts" />
      ) : nearbyPins.length === 0 ? (
        <EmptyState emoji="✅" title="Clear in your area" body="No incidents within your proximity radius" />
      ) : (
        <div className="space-y-2">
          {nearbyPins.map(({ pin, dist }) => {
            const hasLive = liveSessions.some((s) => s.pin_id === pin.id && !s.ended_at);
            return <NearbyPinCard key={pin.id} pin={pin} dist={dist} hasLive={hasLive} />;
          })}
        </div>
      )}
    </motion.div>
  );
}

function NearbyPinCard({ pin, dist, hasLive }: { pin: Pin; dist: number; hasLive: boolean }) {
  const { setSelectedPin, setActiveSheet } = useStore();
  const cat        = CATEGORIES[pin.category];
  const stripColor = severityColor(pin.severity);

  return (
    <button
      onClick={() => { setSelectedPin(pin); setActiveSheet('detail'); }}
      className="w-full text-left flex items-stretch rounded-2xl overflow-hidden transition active:scale-[0.98]"
      style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border)' }}
    >
      <div className="w-1 shrink-0" style={{ backgroundColor: stripColor }} />
      <div className="flex-1 flex items-center gap-3 p-3 min-w-0">
        <span className="text-xl leading-none">{cat?.emoji ?? '⚠️'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{cat?.label ?? 'Incident'}</span>
            {pin.is_emergency && (
              <span className="text-[0.6rem] font-black px-2 py-0.5 rounded-full uppercase tracking-wide" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>SOS</span>
            )}
            {hasLive && <LiveBadge />}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[0.65rem]" style={{ color: 'var(--text-muted)' }}>{formatDist(dist)} away</span>
            <span className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>·</span>
            <span className="text-[0.65rem]" style={{ color: 'var(--text-muted)' }}>{timeAgo(pin.created_at)}</span>
          </div>
        </div>
        <ChevronRight size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      </div>
    </button>
  );
}

// ─── Favorites tab ────────────────────────────────────────────────────────────

function FavoritesTab({
  favPlaces, savedRoutes, routesLoading, onOpenTripToPlace, onOpenTripForRoute,
}: {
  favPlaces: PlaceNote[];
  savedRoutes: SavedRoute[];
  routesLoading: boolean;
  onOpenTripToPlace: (p: PlaceNote) => void;
  onOpenTripForRoute: (r: SavedRoute) => void;
}) {
  const hasAnything = favPlaces.length > 0 || savedRoutes.length > 0 || routesLoading;

  return (
    <motion.div variants={TAB_VARIANTS} initial="initial" animate="animate" exit="exit" className="space-y-4">
      {!hasAnything ? (
        <EmptyState emoji="⭐" title="No favorites yet" body="Star places on the map or save routes from the Trip planner" />
      ) : (
        <>
          {favPlaces.length > 0 && (
            <div className="space-y-2">
              <SectionLabel text="Places" />
              {favPlaces.map((place) => (
                <button
                  key={place.id}
                  onClick={() => onOpenTripToPlace(place)}
                  className="w-full text-left flex items-center gap-3 p-3 rounded-2xl transition active:scale-[0.98]"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border)' }}
                >
                  <span className="text-xl leading-none">{place.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {place.name || 'Unnamed place'}
                    </p>
                    {place.note && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{place.note}</p>
                    )}
                  </div>
                  <Navigation size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                </button>
              ))}
            </div>
          )}

          {(routesLoading || savedRoutes.length > 0) && (
            <div className="space-y-2">
              <SectionLabel text="Saved routes" />
              {routesLoading ? <SkeletonList rows={3} /> : (
                savedRoutes.map((route) => (
                  <button
                    key={route.id}
                    onClick={() => onOpenTripForRoute(route)}
                    className="w-full text-left flex items-center gap-3 p-3 rounded-2xl transition active:scale-[0.98]"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border)' }}
                  >
                    <span className="text-xl leading-none">{MODE_EMOJI[route.mode] ?? '🗺️'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {route.from_label ? `${route.from_label} → ` : ''}{route.to_label}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <DangerBadge score={route.danger_score_last} />
                        <span className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>{route.trip_count}x used</span>
                      </div>
                    </div>
                    <Navigation size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

// ─── Stats tab ────────────────────────────────────────────────────────────────

function StatsTab({
  myPinsCount, activePinsCount, confirmedVotes, trustScore, level, onViewProfile,
}: {
  myPinsCount: number;
  activePinsCount: number;
  confirmedVotes: number;
  trustScore: number;
  level: Level;
  onViewProfile: () => void;
}) {
  const STAT_CARDS = [
    { label: 'My Pins',       value: myPinsCount,    emoji: '📍'        },
    { label: 'Active',        value: activePinsCount, emoji: '🔴'       },
    { label: 'Confirmations', value: confirmedVotes,  emoji: '✅'        },
    { label: 'Trust Score',   value: trustScore,      emoji: level.emoji },
  ];

  return (
    <motion.div variants={TAB_VARIANTS} initial="initial" animate="animate" exit="exit" className="space-y-4 pb-2">
      {/* Level banner */}
      <div
        className="flex items-center gap-3 p-4 rounded-2xl"
        style={{ background: `linear-gradient(135deg, ${level.color}22, ${level.color}08)`, border: `1.5px solid ${level.color}44` }}
      >
        <span className="text-3xl leading-none">{level.emoji}</span>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: level.color }}>{level.label}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Trust score: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{trustScore}</span>
          </p>
        </div>
      </div>

      {/* 2×2 stat grid */}
      <div className="grid grid-cols-2 gap-2">
        {STAT_CARDS.map(({ label, value, emoji }) => (
          <div
            key={label}
            className="flex flex-col items-center justify-center p-4 rounded-2xl gap-1"
            style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border)' }}
          >
            <span className="text-2xl leading-none">{emoji}</span>
            <span className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{value}</span>
            <span className="text-[0.6rem] font-bold uppercase tracking-wide text-center leading-tight" style={{ color: 'var(--text-muted)' }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={onViewProfile}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition active:scale-[0.98]"
        style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border)' }}
      >
        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>View full profile</span>
        <ChevronRight size={16} style={{ color: 'var(--accent)' }} />
      </button>
    </motion.div>
  );
}
