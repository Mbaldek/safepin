import { create } from 'zustand';
import { Pin, AppNotification, PlaceNote, LiveSession, SafeSpace, NotifSettings, DEFAULT_NOTIF_SETTINGS } from '@/types';
import { supabase } from '@/lib/supabase';

export type WatchedLocation = { lat: number; lng: number; name: string | null };

type Sheet = 'none' | 'report' | 'detail';
type Tab = 'map' | 'trip' | 'community' | 'mykova';

export type RouteOption = {
  id: string;
  label: 'Safest' | 'Balanced' | 'Fastest';
  color: string;
  coords: [number, number][];
  duration: number;
  distance: number;
  dangerScore: number;
  rerouted?: boolean;
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
  } | null;
  setUserProfile: (p: {
    id: string;
    display_name: string | null;
    avatar_url?: string | null;
    created_at: string;
    verified?: boolean;
    verification_status?: 'unverified' | 'pending' | 'approved' | 'declined' | null;
    verification_id?: string | null;
  } | null) => void;

  // Active trip route
  activeRoute: { coords: [number, number][]; destination: string } | null;
  setActiveRoute: (r: { coords: [number, number][]; destination: string } | null) => void;

  // Pending route options
  pendingRoutes: RouteOption[] | null;
  setPendingRoutes: (routes: RouteOption[] | null) => void;

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

  // Safe Spaces (Sprint 40)
  safeSpaces: SafeSpace[];
  setSafeSpaces: (spaces: SafeSpace[]) => void;
  showSafeSpaces: boolean;
  setShowSafeSpaces: (v: boolean) => void;

  // Simulation toggle (admin-only, default hidden)
  showSimulated: boolean;
  setShowSimulated: (v: boolean) => void;

  // Deep-link into My KOVA sub-tab (e.g. from Settings → Profile)
  myKovaInitialTab: string | null;
  setMyKovaInitialTab: (tab: string | null) => void;
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
  favPlaceIds: loadLS<string[]>('kova_fav_places', []),
  toggleFavPlace: (id) =>
    set((state) => {
      const has = state.favPlaceIds.includes(id);
      const next = has ? state.favPlaceIds.filter((x) => x !== id) : [...state.favPlaceIds, id];
      saveLS('kova_fav_places', next);
      return { favPlaceIds: next };
    }),
  deletePlaceNote: (id) =>
    set((state) => {
      const next = state.favPlaceIds.filter((x) => x !== id);
      saveLS('kova_fav_places', next);
      return { placeNotes: state.placeNotes.filter((n) => n.id !== id), favPlaceIds: next };
    }),

  // Trip prefill
  tripPrefill: null,
  setTripPrefill: (p) => set({ tripPrefill: p }),

  // Followed pins
  followedPinIds: loadLS<string[]>('kova_followed_pins', []),
  toggleFollowPin: (id) =>
    set((state) => {
      const has = state.followedPinIds.includes(id);
      const next = has ? state.followedPinIds.filter((x) => x !== id) : [...state.followedPinIds, id];
      saveLS('kova_followed_pins', next);
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
  notifSettings: loadLS<NotifSettings>('kova_notif_settings', DEFAULT_NOTIF_SETTINGS),
  setNotifSettings: (s) => {
    saveLS('kova_notif_settings', s);
    set({ notifSettings: s });
  },

  // Achieved milestones
  achievedMilestones: loadLS<string[]>('kova_milestones', []),
  addAchievedMilestone: (key) =>
    set((state) => {
      if (state.achievedMilestones.includes(key)) return {};
      const next = [...state.achievedMilestones, key];
      saveLS('kova_milestones', next);
      return { achievedMilestones: next };
    }),

  // Offline queue count
  offlineQueueCount: 0,
  setOfflineQueueCount: (n) => set({ offlineQueueCount: n }),

  // Incidents list overlay
  showIncidentsList: false,
  setShowIncidentsList: (v) => set({ showIncidentsList: v }),

  // Safe Spaces
  safeSpaces: [],
  setSafeSpaces: (spaces) => set({ safeSpaces: spaces }),
  showSafeSpaces: false,
  setShowSafeSpaces: (v) => set({ showSafeSpaces: v }),

  // Simulation toggle
  showSimulated: false,
  setShowSimulated: (v) => set({ showSimulated: v }),

  // My KOVA deep-link
  myKovaInitialTab: null,
  setMyKovaInitialTab: (tab) => set({ myKovaInitialTab: tab }),
}));
