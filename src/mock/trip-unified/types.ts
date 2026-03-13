/**
 * MOCK — Types unifies pour le systeme trajet
 *
 * Fusionne: TripSession (useStore) + Escorte (useEscorte) + TripLog (API)
 * en un seul type coherent.
 */

export type TripMode = 'walk' | 'bike' | 'car' | 'transit';

export type TripState = 'idle' | 'planning' | 'active' | 'arrived' | 'sos';

export type CircleMemberStatus = 'notified' | 'following' | 'vocal' | 'inactive';

export interface TripCircleMember {
  contactId: string;
  name: string;
  avatarUrl: string | null;
  status: CircleMemberStatus;
  respondedAt: string | null;
}

/**
 * ActiveTrip — un seul objet pour un trajet en cours.
 *
 * Ecrit dans `trip_log` (planning + completion data)
 * ET dans `escortes` si circle/GPS actif (live tracking data).
 */
export interface ActiveTrip {
  // Identifiers
  tripLogId: string;          // trip_log.id (toujours present)
  escorteId: string | null;   // escortes.id (seulement si GPS/circle actif)

  // Destination
  destination: string;
  destLat: number;
  destLng: number;

  // Route
  mode: TripMode;
  coords: [number, number][];
  plannedDurationS: number;
  distanceM: number;
  dangerScore: number;

  // Live state
  state: TripState;
  elapsedS: number;
  walkedDistanceM: number;

  // Features actives
  circleNotified: boolean;
  isSharingLocation: boolean;
  juliaActive: boolean;
  juliaCdSeconds: number;     // countdown avant activation Julia

  // Circle
  circleMembers: TripCircleMember[];
}

/**
 * StartTripParams — parametres pour demarrer un trajet
 * (appele par TripView apres selection de route)
 */
export interface StartTripParams {
  destination: string;
  destLat: number;
  destLng: number;
  mode: TripMode;
  coords: [number, number][];
  plannedDurationS: number;
  distanceM: number;
  dangerScore: number;
  withCircle: boolean;        // activer notification cercle + GPS
}

/**
 * TripSummary — retourne apres endTrip()
 */
export interface TripSummary {
  durationS: number;
  distanceM: number;
  incidentsAvoided: number;
  dangerScore: number;
}
