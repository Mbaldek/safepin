import { create } from 'zustand';
import { Pin } from '@/types';

type Sheet = 'none' | 'report' | 'detail';
type Tab = 'map' | 'incidents' | 'community' | 'messages' | 'profile';

type Store = {
  pins: Pin[];
  setPins: (pins: Pin[]) => void;
  addPin: (pin: Pin) => void;
  updatePin: (pin: Pin) => void;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  activeSheet: Sheet;
  setActiveSheet: (sheet: Sheet) => void;
  selectedPin: Pin | null;
  setSelectedPin: (pin: Pin | null) => void;
  newPinCoords: { lat: number; lng: number } | null;
  setNewPinCoords: (coords: { lat: number; lng: number } | null) => void;
  mapFlyTo: { lat: number; lng: number; zoom: number } | null;
  setMapFlyTo: (coords: { lat: number; lng: number; zoom: number } | null) => void;
  userLocation: { lat: number; lng: number } | null;
  setUserLocation: (loc: { lat: number; lng: number } | null) => void;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
};

export const useStore = create<Store>((set) => ({
  pins: [],
  setPins: (pins) => set({ pins }),
  addPin: (pin) => set((state) => ({ pins: [...state.pins, pin] })),
  updatePin: (pin) => set((state) => ({ pins: state.pins.map((p) => p.id === pin.id ? pin : p) })),
  activeFilter: 'all',
  setActiveFilter: (filter) => set({ activeFilter: filter }),
  activeSheet: 'none',
  setActiveSheet: (sheet) => set({ activeSheet: sheet }),
  selectedPin: null,
  setSelectedPin: (pin) => set({ selectedPin: pin }),
  newPinCoords: null,
  setNewPinCoords: (coords) => set({ newPinCoords: coords }),
  mapFlyTo: null,
  setMapFlyTo: (coords) => set({ mapFlyTo: coords }),
  userLocation: null,
  setUserLocation: (loc) => set({ userLocation: loc }),
  activeTab: 'map',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
