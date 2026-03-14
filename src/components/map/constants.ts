// src/components/map/constants.ts

import {
  DB_CLUSTER_CIRCLE,
  DB_CLUSTER_HALO,
  DB_CLUSTER_LABEL,
} from './layers/ClusterLayer';
import { SOS_TRAIL_LYR } from './layers/SOSLayer';
import { ROUTE_LYR } from './layers/RouteLayer';
import { WATCH_CIRCLE, WATCH_LABEL } from './layers/WatchContactsLayer';
import { PENDING_LYRS } from './layers/PendingRoutesLayer';

// ── Style URLs ──────────────────────────────────────────────────────────────
export const STYLE_URLS: Record<string, string> = {
  custom:  'mapbox://styles/matlab244/cmm6okd7v005q01s49w19fac0',
  streets: 'mapbox://styles/mapbox/streets-v12',
  light:   'mapbox://styles/matlab244/cmm6okd7v005q01s49w19fac0',
  dark:    'mapbox://styles/mapbox/dark-v11',
};

// ── Layer source / layer ID constants ───────────────────────────────────────
export const TRANSIT_SRC    = 'transit-src';
export const TRANSIT_CIRCLE = 'transit-circle';
export const TRANSIT_LABEL  = 'transit-label';
export const POI_SRC        = 'poi-src';
export const POI_CIRCLE     = 'poi-circle';
export const POI_LABEL      = 'poi-label';
export const HEAT_SRC       = 'heatmap-src';
export const HEAT_LYR       = 'heatmap-layer';
export const SAFE_SRC       = 'safe-spaces-src';
export const SAFE_CIRCLE    = 'safe-circle';
export const SAFE_LABEL     = 'safe-label';
export const SAFE_PARTNER   = 'safe-partner';

// ── Pin colors ──────────────────────────────────────────────────────────────
export const PIN_COLORS = {
  urgent: '#EF4444', warning: '#FBBF24', infra: '#60A5FA', positive: '#34D399',
  safeSpace: '#34D399', safePartner: '#F5C341',
  emergency: '#EF4444', emergencyResolved: '#9CA3AF',
  destination: '#34D399', transport: '#22D3EE',
  watchContact: '#3BB4C1', surface: '#1E293B', elevated: '#334155', stroke: '#FFFFFF',
};

// ── All layer IDs we manage — preserved when hiding built-in Mapbox POI dot layers ──
export const OWN_LAYERS = new Set([
  'clusters', 'clusters-halo', 'cluster-count',
  DB_CLUSTER_CIRCLE, DB_CLUSTER_HALO, DB_CLUSTER_LABEL,
  TRANSIT_CIRCLE, TRANSIT_LABEL,
  POI_CIRCLE, POI_LABEL,
  HEAT_LYR,
  SAFE_CIRCLE, SAFE_LABEL, SAFE_PARTNER,
  WATCH_CIRCLE, WATCH_LABEL,
  SOS_TRAIL_LYR,
  ROUTE_LYR,
  ...PENDING_LYRS,
  'safety-scores-fill',
]);

// ── Paris bounding box ──────────────────────────────────────────────────────
export const PARIS_BBOX = '48.78,2.20,48.94,2.50'; // wider bbox covering all Paris + inner suburbs

// ── Group colors for category pins ──────────────────────────────────────────
export const GROUP_COLORS: Record<string, string> = {
  urgent: '#EF4444',
  warning: '#F59E0B',
  infra: '#64748B',
  positive: '#34D399',
};

// ── Safe space emoji map ────────────────────────────────────────────────────
export const SAFE_SPACE_EMOJI: Record<string, string> = {
  pharmacy: '💊', hospital: '🏥', police: '🚔', cafe: '☕', shelter: '🏠', other: '🛡️',
};

// ── Safety filter category mapping ──────────────────────────────────────────
export const SAFETY_FILTER_MAP: Record<string, string[]> = {
  '#urgence':            ['assault', 'suspect', 'group'],
  '#harcèlement':        ['harassment'],
  '#harcelement':        ['harassment'],
  '#unsafe':             ['lighting', 'blocked', 'unsafe'],
  '#alerte':             ['assault', 'harassment'],
  '#sos':                ['__sos__'],
  '#eclairagefaible':    ['lighting'],
  '#eclairageok':        ['safe', 'presence'],
  '#zonecalme':          ['safe'],
  '#trajetseul':         ['following', 'unsafe'],
  '#nuit':               ['lighting', 'unsafe', 'following'],
  '#soiree':             ['assault', 'harassment', 'suspect'],
  '#ruepeufréquentée':   ['unsafe', 'following'],
  '#ruepeufrequentee':   ['unsafe', 'following'],
};

// ── Transit station kind emoji ──────────────────────────────────────────────
export const KIND_EMOJI: Record<string, string> = { metro: '🚇', rer: '🚆', tram: '🚊', bus: '🚌' };
