import { create } from 'zustand';
import { Pin, AppNotification, LiveSession, SafeSpace } from '@/types';
import { supabase } from '@/lib/supabase';

export type WatchedLocation = { lat: number; lng: number; name: string | null };

type Sheet = 'none' | 'report' | 'detail';
type Tab = 'map' | 'community' | 'cercle' | 'trip' | 'me';

export type RouteOption = {
  id: string;
  label: string;
  color: string;
  coords: [number, number][];
  duration: number;
  distance: number;
  dangerScore: number;
  nearbyIncidents?: number;
  nearbyPinIds?: string[];
  rerouted?: boolean;
  steps?: import('@/lib/transit').TransitStep[];
};

export type RouteSegment = {
  coords: [number, number][];
  color: string;
  dashed?: boolean; // true for walking segments
};

export type EscortState = 'IDLE' | 'PLANNING' | 'ACTIVE' | 'COMPLETED';

export type TripSession = {
  id: string;
  state: EscortState;
  origin: { label: string; coords: [number, number] };
  destination: { label: string; coords: [number, number] };
  mode: 'walk' | 'bike' | 'drive' | 'transit';
  route: RouteOption;
  transitSteps?: import('@/lib/transit').TransitStep[];
  startedAt: string;
  estimatedArrival: string;
  sharingWithCircle: boolean;
  incidents: number;
  nudges: number;
  escalated: boolean;
};

export type TimeOfDay = 'all' | 'morning' | 'afternoon' | 'evening' | 'night';

export type MapFilters = {
  severity: string;
  age: string;
  urban: string;
  confirmedOnly: boolean;
  liveOnly: boolean;
  timeOfDay: TimeOfDay;
  showDanger: boolean;
  showWarning: boolean;
  showInfra: boolean;
  showPositive: boolean;
};

const DEFAULT_MAP_FILTERS: MapFilters = {
  severity: 'all',
  age: 'all',
  urban: 'all',
  confirmedOnly: false,
  liveOnly: false,
  timeOfDay: 'all',
  showDanger: true,
  showWarning: true,
  showInfra: true,
  showPositive: true,
};

function migrateKey(oldKey: string, newKey: string): string | null {
  if (typeof window === 'undefined') return null;
  const v = localStorage.getItem(newKey);
  if (v !== null) return v;
  const legacy = localStorage.getItem(oldKey);
  if (legacy !== null) {
    localStorage.setItem(newKey, legacy);
    localStorage.removeItem(oldKey);
  }
  return legacy;
}
function loadLS<T>(key: string, fallback: T, legacyKey?: string): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = legacyKey ? migrateKey(legacyKey, key) : localStorage.getItem(key);
    return JSON.parse(raw ?? 'null') ?? fallback;
  } catch { return fallback; }
}
function saveLS(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
}

type Store = {
  // Auth
  userId: string | null;
  setUserId: (id: string | null) => void;

  // Pins
  pins: Pin[];
  setPins: (pins: Pin[]) => void;
  addPin: (pin: Pin) => void;
  updatePin: (pin: Pin) => void;

  // Map filters
  mapFilters: MapFilters;
  setMapFilters: (f: MapFilters) => void;

  // Sheets
  activeSheet: Sheet;
  setActiveSheet: (sheet: Sheet) => void;
  selectedPin: Pin | null;
  setSelectedPin: (pin: Pin | null) => void;

  // Map
  newPinCoords: { lat: number; lng: number } | null;
  setNewPinCoords: (coords: { lat: number; lng: number } | null) => void;
  mapFlyTo: { lat: number; lng: number; zoom: number } | null;
  setMapFlyTo: (coords: { lat: number; lng: number; zoom: number } | null) => void;
  departDragPin: [number, number] | null;
  setDepartDragPin: (coords: [number, number] | null) => void;
  userLocation: { lat: number; lng: number } | null;
  setUserLocation: (loc: { lat: number; lng: number } | null) => void;

  // Navigation
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  communityDefaultTab: number | null;
  setCommunityDefaultTab: (tab: number | null) => void;
  // Profile
  userProfile: {
    id: string;
    display_name: string | null;
    avatar_url?: string | null;
    created_at: string;
    verified?: boolean;
    verification_status?: 'unverified' | 'pending' | 'approved' | 'declined' | null;
    verification_id?: string | null;
    onboarding_completed?: boolean;
    home_lat?: number | null;
    home_lng?: number | null;
    notification_radius?: number | null;
  } | null;
  setUserProfile: (p: {
    id: string;
    display_name: string | null;
    avatar_url?: string | null;
    created_at: string;
    verified?: boolean;
    verification_status?: 'unverified' | 'pending' | 'approved' | 'declined' | null;
    verification_id?: string | null;
    onboarding_completed?: boolean;
    home_lat?: number | null;
    home_lng?: number | null;
    notification_radius?: number | null;
  } | null) => void;

  // Active trip route
  activeRoute: { coords: [number, number][]; destination: string } | null;
  setActiveRoute: (r: { coords: [number, number][]; destination: string } | null) => void;

  // Pending route options
  pendingRoutes: RouteOption[] | null;
  setPendingRoutes: (routes: RouteOption[] | null) => void;
  selectedRouteIdx: number;
  setSelectedRouteIdx: (idx: number) => void;
  tappedRouteIdx: number | null;
  setTappedRouteIdx: (idx: number | null) => void;
  highlightedPinIds: Set<string>;
  setHighlightedPinIds: (ids: Set<string>) => void;

  // Transit per-segment colored route lines
  transitSegments: RouteSegment[] | null;
  setTransitSegments: (s: RouteSegment[] | null) => void;

  // Notifications
  notifications: AppNotification[];
  addNotification: (n: AppNotification) => void;
  markNotificationsRead: () => void;

  // Walk With Me
  isSharingLocation: boolean;
  setIsSharingLocation: (v: boolean) => void;
  watchedLocations: Record<string, WatchedLocation>;
  setWatchedLocation: (contactId: string, data: WatchedLocation | null) => void;

  // Trip prefill
  tripPrefill: { departure?: string; departureCoords?: [number, number]; destination?: string; destCoords?: [number, number] } | null;
  setTripPrefill: (p: { departure?: string; departureCoords?: [number, number]; destination?: string; destCoords?: [number, number] } | null) => void;

  // Live sessions (Sprint 20)
  liveSessions: LiveSession[];
  setLiveSessions: (sessions: LiveSession[]) => void;
  addLiveSession: (session: LiveSession) => void;
  removeLiveSession: (sessionId: string) => void;
  updateLiveSession: (session: LiveSession) => void;

  // Offline queue count
  offlineQueueCount: number;
  setOfflineQueueCount: (n: number) => void;

  // Incidents list overlay on map
  showIncidentsList: boolean;
  setShowIncidentsList: (v: boolean) => void;

  // Walk With Me panel
  showWalkWithMe: boolean;
  setShowWalkWithMe: (v: boolean) => void;

  // Walk History sheet
  showWalkHistory: boolean;
  setShowWalkHistory: (v: boolean) => void;

  // Trip History overlay (TripView in history mode)
  showTripHistory: boolean;
  setShowTripHistory: (v: boolean) => void;

  // Safe Spaces (Sprint 40)
  safeSpaces: SafeSpace[];
  setSafeSpaces: (spaces: SafeSpace[]) => void;
  showSafeSpaces: boolean;
  setShowSafeSpaces: (v: boolean) => void;

  // Pin labels toggle
  showPinLabels: boolean;
  setShowPinLabels: (v: boolean) => void;

  // Simulation toggle (admin-only, default hidden)
  showSimulated: boolean;
  setShowSimulated: (v: boolean) => void;

  // Pins version counter — bump to trigger refetch from any page
  pinsVersion: number;
  bumpPinsVersion: () => void;

  // Deep-link into My Breveil sub-tab (e.g. from Settings → Profile)
  myBreveilInitialTab: string | null;
  setMyBreveilInitialTab: (tab: string | null) => void;

  // Active trip session (Live Safety Escort)
  activeTrip: TripSession | null;
  setActiveTrip: (t: TripSession | null) => void;

  // Streaks
  currentStreak: number;
  longestStreak: number;
  setStreakInfo: (current: number, longest: number) => void;

  // Unread DM count (for Community tab badge)
  unreadDmCount: number;
  setUnreadDmCount: (n: number) => void;

  // Map bottom padding — set by bottom sheets to shift the map's logical center upward
  mapBottomPadding: number;
  setMapBottomPadding: (px: number) => void;

  // Map viewport — written by MapView on moveend, read by loadPins for spatial queries
  mapViewport: { lat: number; lng: number; zoom: number; radiusM: number } | null;
  setMapViewport: (v: { lat: number; lng: number; zoom: number; radiusM: number } | null) => void;

  // DB spatial clusters — populated at zoom < 10, cleared at zoom >= 10
  dbClusters: import('@/types').DbCluster[];
  setDbClusters: (c: import('@/types').DbCluster[]) => void;

  // Feed cache — stale-while-revalidate for instant community tab opening
  feedCache: { posts: any[]; sosPosts: any[]; pinPosts: any[]; communityIds: string[]; fetchedAt: number } | null;
  setFeedCache: (cache: { posts: any[]; sosPosts: any[]; pinPosts: any[]; communityIds: string[]; fetchedAt: number } | null) => void;

};

export const useStore = create<Store>((set) => ({
  // Auth
  userId: null,
  setUserId: (id) => set({ userId: id }),

  // Pins
  pins: [],
  setPins: (pins) => set({ pins }),
  addPin: (pin) => set((state) => ({ pins: [...state.pins, pin] })),
  updatePin: (pin) => set((state) => ({ pins: state.pins.map((p) => p.id === pin.id ? pin : p) })),

  // Map filters
  mapFilters: DEFAULT_MAP_FILTERS,
  setMapFilters: (f) => set({ mapFilters: f }),

  // Sheets
  activeSheet: 'none',
  setActiveSheet: (sheet) => set({ activeSheet: sheet }),
  selectedPin: null,
  setSelectedPin: (pin) => set({ selectedPin: pin }),

  // Map
  newPinCoords: null,
  setNewPinCoords: (coords) => set({ newPinCoords: coords }),
  mapFlyTo: null,
  setMapFlyTo: (coords) => set({ mapFlyTo: coords }),
  departDragPin: null,
  setDepartDragPin: (coords) => set({ departDragPin: coords }),
  userLocation: null,
  setUserLocation: (loc) => set({ userLocation: loc }),

  // Navigation
  activeTab: 'map',
  setActiveTab: (tab) => set({ activeTab: tab }),
  communityDefaultTab: null,
  setCommunityDefaultTab: (tab) => set({ communityDefaultTab: tab }),
  // Profile
  userProfile: null,
  setUserProfile: (p) => set({ userProfile: p }),

  // Active trip route
  activeRoute: null,
  setActiveRoute: (r) => set({ activeRoute: r }),

  // Pending route options
  pendingRoutes: null,
  setPendingRoutes: (routes) => set({ pendingRoutes: routes }),
  selectedRouteIdx: 0,
  setSelectedRouteIdx: (idx) => set({ selectedRouteIdx: idx }),
  tappedRouteIdx: null,
  setTappedRouteIdx: (idx) => set({ tappedRouteIdx: idx }),
  highlightedPinIds: new Set<string>(),
  setHighlightedPinIds: (ids) => set({ highlightedPinIds: ids }),
  transitSegments: null,
  setTransitSegments: (s) => set({ transitSegments: s }),

  // Notifications (in-memory + DB persistence)
  notifications: [],
  addNotification: (n) => {
    set((state) => ({ notifications: [n, ...state.notifications] }));
    // Persist to DB (fire-and-forget)
    const uid = useStore.getState().userId;
    if (uid) {
      supabase.from('notifications').insert({
        id: n.id,
        user_id: uid,
        type: n.type,
        title: n.title,
        body: n.body,
        read: n.read,
        pin_id: n.pin_id ?? null,
        community_id: n.community_id ?? null,
      }).then(() => {});
    }
  },
  markNotificationsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
    // Batch update in DB (fire-and-forget)
    const uid = useStore.getState().userId;
    if (uid) {
      supabase.from('notifications').update({ read: true }).eq('user_id', uid).eq('read', false).then(() => {});
    }
  },

  // Walk With Me
  isSharingLocation: false,
  setIsSharingLocation: (v) => set({ isSharingLocation: v }),
  watchedLocations: {},
  setWatchedLocation: (contactId, data) =>
    set((state) => {
      const next = { ...state.watchedLocations };
      if (data === null) delete next[contactId];
      else next[contactId] = data;
      return { watchedLocations: next };
    }),

  // Trip prefill
  tripPrefill: null,
  setTripPrefill: (p) => set({ tripPrefill: p }),

  // Live sessions
  liveSessions: [],
  setLiveSessions: (sessions) => set({ liveSessions: sessions }),
  addLiveSession: (session) => set((state) => ({ liveSessions: [...state.liveSessions, session] })),
  removeLiveSession: (sessionId) =>
    set((state) => ({ liveSessions: state.liveSessions.filter((s) => s.id !== sessionId) })),
  updateLiveSession: (session) =>
    set((state) => ({ liveSessions: state.liveSessions.map((s) => s.id === session.id ? session : s) })),

  // Offline queue count
  offlineQueueCount: 0,
  setOfflineQueueCount: (n) => set({ offlineQueueCount: n }),

  // Incidents list overlay
  showIncidentsList: false,
  setShowIncidentsList: (v) => set({ showIncidentsList: v }),

  // Walk With Me panel
  showWalkWithMe: false,
  setShowWalkWithMe: (v) => set({ showWalkWithMe: v }),

  // Walk History sheet
  showWalkHistory: false,
  setShowWalkHistory: (v) => set({ showWalkHistory: v }),

  // Trip History overlay
  showTripHistory: false,
  setShowTripHistory: (v) => set({ showTripHistory: v }),

  // Safe Spaces
  safeSpaces: [],
  setSafeSpaces: (spaces) => set({ safeSpaces: spaces }),
  showSafeSpaces: true,
  setShowSafeSpaces: (v) => set({ showSafeSpaces: v }),

  // Pin labels toggle (persisted)
  showPinLabels: loadLS('breveil_show_pin_labels', false, 'brume_show_pin_labels'),
  setShowPinLabels: (v) => { saveLS('breveil_show_pin_labels', v); set({ showPinLabels: v }); },

  // Simulation toggle (persisted so it survives page navigation)
  showSimulated: loadLS('breveil_show_simulated', false, 'brume_show_simulated'),
  setShowSimulated: (v) => { saveLS('breveil_show_simulated', v); set({ showSimulated: v }); },

  // Pins version counter
  pinsVersion: 0,
  bumpPinsVersion: () => set((state) => ({ pinsVersion: state.pinsVersion + 1 })),

  // My Breveil deep-link
  myBreveilInitialTab: null,
  setMyBreveilInitialTab: (tab) => set({ myBreveilInitialTab: tab }),

  // Active trip session (Live Safety Escort)
  activeTrip: loadLS<TripSession | null>('breveil_active_trip', null, 'brume_active_trip'),
  setActiveTrip: (t) => {
    if (t) saveLS('breveil_active_trip', t);
    else { try { localStorage.removeItem('breveil_active_trip'); } catch { /* */ } }
    set({ activeTrip: t });
  },
  // Streaks
  currentStreak: 0,
  longestStreak: 0,
  setStreakInfo: (current, longest) => set({ currentStreak: current, longestStreak: longest }),

  // Unread DM count
  unreadDmCount: 0,
  setUnreadDmCount: (n) => set({ unreadDmCount: n }),

  // Map bottom padding
  mapBottomPadding: 0,
  setMapBottomPadding: (px) => set({ mapBottomPadding: px }),

  // Map viewport
  mapViewport: null,
  setMapViewport: (v) => set({ mapViewport: v }),

  // DB spatial clusters
  dbClusters: [],
  setDbClusters: (c) => set({ dbClusters: c }),

  // Feed cache
  feedCache: null,
  setFeedCache: (cache) => set({ feedCache: cache }),

}));
