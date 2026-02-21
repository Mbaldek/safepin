// src/types/index.ts

export type MediaItem = {
  url: string;
  type: 'image' | 'video' | 'audio';
};

export type Pin = {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  category: 'harassment' | 'stalking' | 'dark_area' | 'aggression' | 'drunk' | 'other';
  severity: 'low' | 'med' | 'high';
  description: string;
  photo_url: string | null;
  environment: string | null;
  media_urls: MediaItem[] | null;
  is_emergency: boolean;
  resolved_at: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  name: string;
  created_at: string;
};

export const CATEGORIES = {
  harassment: { label: 'Harassment', emoji: '😰' },
  stalking: { label: 'Stalking', emoji: '👁' },
  dark_area: { label: 'Dark area', emoji: '🌑' },
  aggression: { label: 'Aggression', emoji: '⚡' },
  drunk: { label: 'Intoxicated', emoji: '🍺' },
  other: { label: 'Other', emoji: '⚠️' },
} as const;

export const ENVIRONMENTS = {
  foot:    { label: 'On foot',  emoji: '🚶' },
  metro:   { label: 'Transit',  emoji: '🚇' },
  bus:     { label: 'Bus',      emoji: '🚌' },
  cycling: { label: 'Cycling',  emoji: '🚲' },
  car:     { label: 'Vehicle',  emoji: '🚗' },
  indoor:  { label: 'Indoor',   emoji: '🏠' },
} as const;

export const SEVERITY = {
  low: { label: 'Mild', emoji: '😟', color: '#10b981' },
  med: { label: 'Moderate', emoji: '⚠️', color: '#f59e0b' },
  high: { label: 'Danger', emoji: '🚨', color: '#f43f5e' },
} as const;