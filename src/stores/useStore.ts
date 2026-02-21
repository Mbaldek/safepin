import { create } from 'zustand';
import { Pin, AppNotification, PlaceNote } from '@/types';

export type WatchedLocation = { lat: number; lng: number; name: string | null };

type Sheet = 'none' | 'report' | 'detail';
type Tab = 'map' | 'incidents' | 'community' | 'trip' | 'profile';

export type RouteOption = {
  id: string;
  label: 'Safest' | 'Balanced' | 'Fastest';
  color: string;
  coords: [number, number][];
  duration: number;   // seconds
  distance: number;   // meters
  dangerScore: number;
  rerouted?: boolean; // true when bypass waypoint was applied
};

export type MapFilters = {
  severity: string;        // 'all' | 'low' | 'med' | 'high'
  age: string;             // 'all' | '1h' | '6h' | 'today'
  urban: string;           // 'all' | keyof URBAN_CONTEXTS
  confirmedOnly: boolean;
};

const DEFAULT_MAP_FILTERS: MapFilters = {
  severity: 'all',
  age: 'all',
  urban: 'all',
  confirmedOnly: false,
};

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
    created_at: string;
    verified?: boolean;
    verification_status?: 'unverified' | 'pending' | 'approved' | 'declined' | null;
    verification_id?: string | null;
  } | null;
  setUserProfile: (p: {
    id: string;
    display_name: string | null;
    created_at: string;
    verified?: boolean;
    verification_status?: 'unverified' | 'pending' | 'approved' | 'declined' | null;
    verification_id?: string | null;
  } | null) => void;

  // Active trip route
  activeRoute: { coords: [number, number][]; destination: string } | null;
  setActiveRoute: (r: { coords: [number, number][]; destination: string } | null) => void;

  // Pending route options (multi-route selection)
  pendingRoutes: RouteOption[] | null;
  setPendingRoutes: (routes: RouteOption[] | null) => void;

  // Notifications
  notifications: AppNotification[];
  addNotification: (n: AppNotification) => void;
  markNotificationsRead: () => void;

  // Walk With Me — location sharing
  isSharingLocation: boolean;
  setIsSharingLocation: (v: boolean) => void;
  watchedLocations: Record<string, WatchedLocation>;
  setWatchedLocation: (contactId: string, data: WatchedLocation | null) => void;

  // Place Notes — long-press to annotate map
  newPlaceNoteCoords: { lat: number; lng: number } | null;
  setNewPlaceNoteCoords: (c: { lat: number; lng: number } | null) => void;
  placeNotes: PlaceNote[];
  setPlaceNotes: (notes: PlaceNote[]) => void;
  addPlaceNote: (note: PlaceNote) => void;
  selectedPlaceNote: PlaceNote | null;
  setSelectedPlaceNote: (note: PlaceNote | null) => void;

  // Trip prefill — set by map popup to pre-fill trip planner fields
  tripPrefill: { departure?: string; departureCoords?: [number, number]; destination?: string; destCoords?: [number, number] } | null;
  setTripPrefill: (p: { departure?: string; departureCoords?: [number, number]; destination?: string; destCoords?: [number, number] } | null) => void;
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

  // Notifications
  notifications: [],
  addNotification: (n) => set((state) => ({ notifications: [...state.notifications, n] })),
  markNotificationsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),

  // Walk With Me
  isSharingLocation: false,
  setIsSharingLocation: (v) => set({ isSharingLocation: v }),
  watchedLocations: {},
  setWatchedLocation: (contactId, data) =>
    set((state) => {
      const next = { ...state.watchedLocations };
      if (data === null) {
        delete next[contactId];
      } else {
        next[contactId] = data;
      }
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
  tripPrefill: null,
  setTripPrefill: (p) => set({ tripPrefill: p }),
}));
