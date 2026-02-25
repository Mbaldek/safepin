import { create } from 'zustand';
import { Pin, AppNotification, PlaceNote, LiveSession, SafeSpace, NotifSettings, DEFAULT_NOTIF_SETTINGS } from '@/types';
import { supabase } from '@/lib/supabase';

export type WatchedLocation = { lat: number; lng: number; name: string | null };

type Sheet = 'none' | 'report' | 'detail';
type Tab = 'map' | 'community' | 'trip' | 'me';

export type RouteOption = {
  id: string;
  label: string;
  color: string;
  coords: [number, number][];
  duration: number;
  distance: number;
  dangerScore: number;
  rerouted?: boolean;
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
};

const DEFAULT_MAP_FILTERS: MapFilters = {
  severity: 'all',
  age: 'all',
  urban: 'all',
  confirmedOnly: false,
  liveOnly: false,
  timeOfDay: 'all',
};

function loadLS<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; } catch { return fallback; }
}
function saveLS(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
}

// One-time migration: copy kova_* localStorage keys to brume_* so existing users keep their data
if (typeof window !== 'undefined' && !localStorage.getItem('brume_keys_migrated')) {
  const renames: [string, string][] = [
    ['kova_active_trip', 'brume_active_trip'],
    ['kova_fav_routes', 'brume_fav_routes'],
    ['brume_fav_places', 'brume_fav_places'],
    ['brume_followed_pins', 'brume_followed_pins'],
    ['brume_notif_settings', 'brume_notif_settings'],
    ['brume_milestones', 'brume_milestones'],
    ['kova-theme', 'brume-theme'],
    ['kova_install_dismissed', 'brume_install_dismissed'],
    ['kova_session_count', 'brume_session_count'],
    ['kova_is_pro', 'brume_is_pro'],
    ['kova_onboarding_done', 'brume_onboarding_done'],
    ['kova_push_dismissed', 'brume_push_dismissed'],
    ['kova_last_session_ts', 'brume_last_session_ts'],
  ];
  for (const [oldKey, newKey] of renames) {
    const val = localStorage.getItem(oldKey);
    if (val !== null && localStorage.getItem(newKey) === null) {
      localStorage.setItem(newKey, val);
    }
  }
  localStorage.setItem('brume_keys_migrated', '1');
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
  userLocation: { lat: number; lng: number } | null;
  setUserLocation: (loc: { lat: number; lng: number } | null) => void;

  // Navigation
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;

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

  // Place Notes
  newPlaceNoteCoords: { lat: number; lng: number } | null;
  setNewPlaceNoteCoords: (c: { lat: number; lng: number } | null) => void;
  placeNotes: PlaceNote[];
  setPlaceNotes: (notes: PlaceNote[]) => void;
  addPlaceNote: (note: PlaceNote) => void;
  selectedPlaceNote: PlaceNote | null;
  setSelectedPlaceNote: (note: PlaceNote | null) => void;

  // Place note favorites
  favPlaceIds: string[];
  toggleFavPlace: (id: string) => void;
  deletePlaceNote: (id: string) => void;

  // Trip prefill
  tripPrefill: { departure?: string; departureCoords?: [number, number]; destination?: string; destCoords?: [number, number] } | null;
  setTripPrefill: (p: { departure?: string; departureCoords?: [number, number]; destination?: string; destCoords?: [number, number] } | null) => void;

  // Followed pins (Sprint 14)
  followedPinIds: string[];
  toggleFollowPin: (id: string) => void;

  // Live sessions (Sprint 20)
  liveSessions: LiveSession[];
  setLiveSessions: (sessions: LiveSession[]) => void;
  addLiveSession: (session: LiveSession) => void;
  removeLiveSession: (sessionId: string) => void;
  updateLiveSession: (session: LiveSession) => void;

  // Notification settings (Sprint 14)
  notifSettings: NotifSettings;
  setNotifSettings: (s: NotifSettings) => void;

  // Achieved milestones (Sprint 16) — locally cached to avoid re-notifying
  achievedMilestones: string[];
  addAchievedMilestone: (key: string) => void;

  // Offline queue count
  offlineQueueCount: number;
  setOfflineQueueCount: (n: number) => void;

  // Incidents list overlay on map
  showIncidentsList: boolean;
  setShowIncidentsList: (v: boolean) => void;

  // Walk With Me panel
  showWalkWithMe: boolean;
  setShowWalkWithMe: (v: boolean) => void;

  // Safe Spaces (Sprint 40)
  safeSpaces: SafeSpace[];
  setSafeSpaces: (spaces: SafeSpace[]) => void;
  showSafeSpaces: boolean;
  setShowSafeSpaces: (v: boolean) => void;

  // Simulation toggle (admin-only, default hidden)
  showSimulated: boolean;
  setShowSimulated: (v: boolean) => void;

  // Pins version counter — bump to trigger refetch from any page
  pinsVersion: number;
  bumpPinsVersion: () => void;

  // Deep-link into My Brume sub-tab (e.g. from Settings → Profile)
  myKovaInitialTab: string | null;
  setMyKovaInitialTab: (tab: string | null) => void;

  // Active trip session (Live Safety Escort)
  activeTrip: TripSession | null;
  setActiveTrip: (t: TripSession | null) => void;
  tripNudge: string | null;
  setTripNudge: (msg: string | null) => void;

  // Streaks
  currentStreak: number;
  longestStreak: number;
  setStreakInfo: (current: number, longest: number) => void;

  // Unread DM count (for Community tab badge)
  unreadDmCount: number;
  setUnreadDmCount: (n: number) => void;
};

export const useStore = create<Store>((set) => ({
  // Auth
  userId: null,
  setUserId: (id) => set({ userId: id }),

  // Pins
  pins: [],
  setPins: (pins) => set({ pins }),
  addPin: (pin) => set((state) => ({
    pins: state.pins.some((p) => p.id === pin.id) ? state.pins : [pin, ...state.pins],
  })),
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
  userLocation: null,
  setUserLocation: (loc) => set({ userLocation: loc }),

  // Navigation
  activeTab: 'map',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Profile
  userProfile: null,
  setUserProfile: (p) => set({ userProfile: p }),

  // Active trip route
  activeRoute: null,
  setActiveRoute: (r) => set({ activeRoute: r }),

  // Pending route options
  pendingRoutes: null,
  setPendingRoutes: (routes) => set({ pendingRoutes: routes }),
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

  // Place Notes
  newPlaceNoteCoords: null,
  setNewPlaceNoteCoords: (c) => set({ newPlaceNoteCoords: c }),
  placeNotes: [],
  setPlaceNotes: (notes) => set({ placeNotes: notes }),
  addPlaceNote: (note) => set((state) => ({ placeNotes: [note, ...state.placeNotes] })),
  selectedPlaceNote: null,
  setSelectedPlaceNote: (note) => set({ selectedPlaceNote: note }),

  // Place note favorites
  favPlaceIds: loadLS<string[]>('brume_fav_places', []),
  toggleFavPlace: (id) =>
    set((state) => {
      const has = state.favPlaceIds.includes(id);
      const next = has ? state.favPlaceIds.filter((x) => x !== id) : [...state.favPlaceIds, id];
      saveLS('brume_fav_places', next);
      return { favPlaceIds: next };
    }),
  deletePlaceNote: (id) =>
    set((state) => {
      const next = state.favPlaceIds.filter((x) => x !== id);
      saveLS('brume_fav_places', next);
      return { placeNotes: state.placeNotes.filter((n) => n.id !== id), favPlaceIds: next };
    }),

  // Trip prefill
  tripPrefill: null,
  setTripPrefill: (p) => set({ tripPrefill: p }),

  // Followed pins
  followedPinIds: loadLS<string[]>('brume_followed_pins', []),
  toggleFollowPin: (id) =>
    set((state) => {
      const has = state.followedPinIds.includes(id);
      const next = has ? state.followedPinIds.filter((x) => x !== id) : [...state.followedPinIds, id];
      saveLS('brume_followed_pins', next);
      return { followedPinIds: next };
    }),

  // Live sessions
  liveSessions: [],
  setLiveSessions: (sessions) => set({ liveSessions: sessions }),
  addLiveSession: (session) => set((state) => ({ liveSessions: [...state.liveSessions, session] })),
  removeLiveSession: (sessionId) =>
    set((state) => ({ liveSessions: state.liveSessions.filter((s) => s.id !== sessionId) })),
  updateLiveSession: (session) =>
    set((state) => ({ liveSessions: state.liveSessions.map((s) => s.id === session.id ? session : s) })),

  // Notification settings
  notifSettings: loadLS<NotifSettings>('brume_notif_settings', DEFAULT_NOTIF_SETTINGS),
  setNotifSettings: (s) => {
    saveLS('brume_notif_settings', s);
    set({ notifSettings: s });
  },

  // Achieved milestones
  achievedMilestones: loadLS<string[]>('brume_milestones', []),
  addAchievedMilestone: (key) =>
    set((state) => {
      if (state.achievedMilestones.includes(key)) return {};
      const next = [...state.achievedMilestones, key];
      saveLS('brume_milestones', next);
      return { achievedMilestones: next };
    }),

  // Offline queue count
  offlineQueueCount: 0,
  setOfflineQueueCount: (n) => set({ offlineQueueCount: n }),

  // Incidents list overlay
  showIncidentsList: false,
  setShowIncidentsList: (v) => set({ showIncidentsList: v }),

  // Walk With Me panel
  showWalkWithMe: false,
  setShowWalkWithMe: (v) => set({ showWalkWithMe: v }),

  // Safe Spaces
  safeSpaces: [],
  setSafeSpaces: (spaces) => set({ safeSpaces: spaces }),
  showSafeSpaces: true,
  setShowSafeSpaces: (v) => set({ showSafeSpaces: v }),

  // Simulation toggle
  showSimulated: false,
  setShowSimulated: (v) => set({ showSimulated: v }),

  // Pins version counter
  pinsVersion: 0,
  bumpPinsVersion: () => set((state) => ({ pinsVersion: state.pinsVersion + 1 })),

  // My Brume deep-link
  myKovaInitialTab: null,
  setMyKovaInitialTab: (tab) => set({ myKovaInitialTab: tab }),

  // Active trip session (Live Safety Escort)
  activeTrip: loadLS<TripSession | null>('brume_active_trip', null),
  setActiveTrip: (t) => {
    if (t) saveLS('brume_active_trip', t);
    else { try { localStorage.removeItem('brume_active_trip'); } catch { /* */ } }
    set({ activeTrip: t });
  },
  tripNudge: null,
  setTripNudge: (msg) => set({ tripNudge: msg }),

  // Streaks
  currentStreak: 0,
  longestStreak: 0,
  setStreakInfo: (current, longest) => set({ currentStreak: current, longestStreak: longest }),

  // Unread DM count
  unreadDmCount: 0,
  setUnreadDmCount: (n) => set({ unreadDmCount: n }),
}));

// Shallow selectors for performance — prevent unnecessary re-renders
export const useUserId = () => useStore((s) => s.userId);
export const usePins = () => useStore((s) => s.pins);
export const useActiveTab = () => useStore((s) => s.activeTab);
export const useActiveSheet = () => useStore((s) => s.activeSheet);
export const useMapFilters = () => useStore((s) => s.mapFilters);
export const useStreak = () => useStore((s) => ({ current: s.currentStreak, longest: s.longestStreak }));
export const useActiveTrip = () => useStore((s) => s.activeTrip);
