import { create } from 'zustand';
import { Pin } from '@/types';

type Sheet = 'none' | 'report' | 'detail';

type Store = {
  pins: Pin[];
  setPins: (pins: Pin[]) => void;
  addPin: (pin: Pin) => void;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  activeSheet: Sheet;
  setActiveSheet: (sheet: Sheet) => void;
  selectedPin: Pin | null;
  setSelectedPin: (pin: Pin | null) => void;
  newPinCoords: { lat: number; lng: number } | null;
  setNewPinCoords: (coords: { lat: number; lng: number } | null) => void;
};

export const useStore = create<Store>((set) => ({
  pins: [],
  setPins: (pins) => set({ pins }),
  addPin: (pin) => set((state) => ({ pins: [...state.pins, pin] })),
  activeFilter: 'all',
  setActiveFilter: (filter) => set({ activeFilter: filter }),
  activeSheet: 'none',
  setActiveSheet: (sheet) => set({ activeSheet: sheet }),
  selectedPin: null,
  setSelectedPin: (pin) => set({ selectedPin: pin }),
  newPinCoords: null,
  setNewPinCoords: (coords) => set({ newPinCoords: coords }),
}));
