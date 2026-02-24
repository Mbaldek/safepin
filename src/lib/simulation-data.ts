// src/lib/simulation-data.ts — Centralized simulation constants, helpers, generators

import { DayHours } from '@/types';

// ─── Reference Point Type ────────────────────────────────────────────────────

export type ReferencePoint = {
  lat: number;
  lng: number;
  label: string;
  arrondissement: number;
};

// ─── 80 Reference Points — 4 per arrondissement across Paris intramuros ──────

export const PARIS_REFERENCE_POINTS: ReferencePoint[] = [
  // 1er
  { lat: 48.8606, lng: 2.3471, label: 'Chatelet', arrondissement: 1 },
  { lat: 48.8611, lng: 2.3364, label: 'Palais Royal', arrondissement: 1 },
  { lat: 48.8630, lng: 2.3365, label: 'Pyramides', arrondissement: 1 },
  { lat: 48.8625, lng: 2.3456, label: 'Les Halles', arrondissement: 1 },
  // 2e
  { lat: 48.8673, lng: 2.3414, label: 'Bourse', arrondissement: 2 },
  { lat: 48.8714, lng: 2.3487, label: 'Sentier', arrondissement: 2 },
  { lat: 48.8680, lng: 2.3384, label: 'Quatre-Septembre', arrondissement: 2 },
  { lat: 48.8695, lng: 2.3441, label: 'Grands Boulevards', arrondissement: 2 },
  // 3e
  { lat: 48.8671, lng: 2.3619, label: 'Temple', arrondissement: 3 },
  { lat: 48.8631, lng: 2.3587, label: 'Arts et Metiers', arrondissement: 3 },
  { lat: 48.8661, lng: 2.3570, label: 'Filles du Calvaire', arrondissement: 3 },
  { lat: 48.8627, lng: 2.3621, label: 'Rue de Bretagne', arrondissement: 3 },
  // 4e
  { lat: 48.8574, lng: 2.3514, label: 'Hotel de Ville', arrondissement: 4 },
  { lat: 48.8534, lng: 2.3488, label: 'Ile de la Cite', arrondissement: 4 },
  { lat: 48.8550, lng: 2.3614, label: 'Saint-Paul', arrondissement: 4 },
  { lat: 48.8580, lng: 2.3637, label: 'Place des Vosges', arrondissement: 4 },
  // 5e
  { lat: 48.8530, lng: 2.3449, label: 'Saint-Michel', arrondissement: 5 },
  { lat: 48.8462, lng: 2.3441, label: 'Place Monge', arrondissement: 5 },
  { lat: 48.8442, lng: 2.3558, label: 'Jussieu', arrondissement: 5 },
  { lat: 48.8465, lng: 2.3519, label: 'Jardin des Plantes', arrondissement: 5 },
  // 6e
  { lat: 48.8530, lng: 2.3339, label: 'Saint-Germain', arrondissement: 6 },
  { lat: 48.8462, lng: 2.3282, label: 'Edgar Quinet', arrondissement: 6 },
  { lat: 48.8512, lng: 2.3265, label: 'Saint-Sulpice', arrondissement: 6 },
  { lat: 48.8467, lng: 2.3372, label: 'Luxembourg', arrondissement: 6 },
  // 7e
  { lat: 48.8584, lng: 2.2945, label: 'Tour Eiffel', arrondissement: 7 },
  { lat: 48.8599, lng: 2.3266, label: 'Solferino', arrondissement: 7 },
  { lat: 48.8563, lng: 2.3178, label: 'Invalides', arrondissement: 7 },
  { lat: 48.8537, lng: 2.3057, label: 'Ecole Militaire', arrondissement: 7 },
  // 8e
  { lat: 48.8738, lng: 2.2950, label: 'Charles de Gaulle Etoile', arrondissement: 8 },
  { lat: 48.8697, lng: 2.3081, label: 'Champs-Elysees', arrondissement: 8 },
  { lat: 48.8752, lng: 2.3261, label: 'Saint-Lazare', arrondissement: 8 },
  { lat: 48.8723, lng: 2.3143, label: 'Madeleine', arrondissement: 8 },
  // 9e
  { lat: 48.8763, lng: 2.3402, label: 'Cadet', arrondissement: 9 },
  { lat: 48.8821, lng: 2.3379, label: 'Pigalle', arrondissement: 9 },
  { lat: 48.8783, lng: 2.3289, label: 'Opera', arrondissement: 9 },
  { lat: 48.8816, lng: 2.3449, label: 'Anvers', arrondissement: 9 },
  // 10e
  { lat: 48.8809, lng: 2.3553, label: 'Gare du Nord', arrondissement: 10 },
  { lat: 48.8764, lng: 2.3592, label: 'Gare de l\'Est', arrondissement: 10 },
  { lat: 48.8716, lng: 2.3630, label: 'Jacques Bonsergent', arrondissement: 10 },
  { lat: 48.8760, lng: 2.3703, label: 'Canal Saint-Martin', arrondissement: 10 },
  // 11e
  { lat: 48.8675, lng: 2.3636, label: 'Republique', arrondissement: 11 },
  { lat: 48.8533, lng: 2.3694, label: 'Bastille', arrondissement: 11 },
  { lat: 48.8622, lng: 2.3786, label: 'Oberkampf', arrondissement: 11 },
  { lat: 48.8560, lng: 2.3860, label: 'Charonne', arrondissement: 11 },
  // 12e
  { lat: 48.8486, lng: 2.3960, label: 'Nation', arrondissement: 12 },
  { lat: 48.8412, lng: 2.3746, label: 'Gare de Lyon', arrondissement: 12 },
  { lat: 48.8386, lng: 2.3880, label: 'Reuilly-Diderot', arrondissement: 12 },
  { lat: 48.8316, lng: 2.4048, label: 'Porte de Charenton', arrondissement: 12 },
  // 13e
  { lat: 48.8340, lng: 2.3550, label: 'Place d\'Italie', arrondissement: 13 },
  { lat: 48.8267, lng: 2.3565, label: 'Tolbiac', arrondissement: 13 },
  { lat: 48.8219, lng: 2.3634, label: 'Bibliotheque F. Mitterrand', arrondissement: 13 },
  { lat: 48.8283, lng: 2.3500, label: 'Gobelins', arrondissement: 13 },
  // 14e
  { lat: 48.8335, lng: 2.3275, label: 'Denfert-Rochereau', arrondissement: 14 },
  { lat: 48.8267, lng: 2.3270, label: 'Alesia', arrondissement: 14 },
  { lat: 48.8238, lng: 2.3124, label: 'Pernety', arrondissement: 14 },
  { lat: 48.8199, lng: 2.3268, label: 'Porte d\'Orleans', arrondissement: 14 },
  // 15e
  { lat: 48.8416, lng: 2.3018, label: 'La Motte-Picquet', arrondissement: 15 },
  { lat: 48.8412, lng: 2.2788, label: 'Javel', arrondissement: 15 },
  { lat: 48.8337, lng: 2.2930, label: 'Convention', arrondissement: 15 },
  { lat: 48.8271, lng: 2.3038, label: 'Porte de Vanves', arrondissement: 15 },
  // 16e
  { lat: 48.8646, lng: 2.2755, label: 'Trocadero', arrondissement: 16 },
  { lat: 48.8550, lng: 2.2606, label: 'Passy', arrondissement: 16 },
  { lat: 48.8483, lng: 2.2588, label: 'Ranelagh', arrondissement: 16 },
  { lat: 48.8715, lng: 2.2665, label: 'Porte Dauphine', arrondissement: 16 },
  // 17e
  { lat: 48.8836, lng: 2.3157, label: 'Place de Clichy', arrondissement: 17 },
  { lat: 48.8867, lng: 2.3040, label: 'Batignolles', arrondissement: 17 },
  { lat: 48.8932, lng: 2.3185, label: 'Porte de Saint-Ouen', arrondissement: 17 },
  { lat: 48.8780, lng: 2.2950, label: 'Ternes', arrondissement: 17 },
  // 18e
  { lat: 48.8847, lng: 2.3493, label: 'Barbes-Rochechouart', arrondissement: 18 },
  { lat: 48.8867, lng: 2.3431, label: 'Sacre-Coeur', arrondissement: 18 },
  { lat: 48.8914, lng: 2.3443, label: 'Marcadet-Poissonniers', arrondissement: 18 },
  { lat: 48.8974, lng: 2.3597, label: 'Porte de la Chapelle', arrondissement: 18 },
  // 19e
  { lat: 48.8827, lng: 2.3702, label: 'Jaures', arrondissement: 19 },
  { lat: 48.8900, lng: 2.3820, label: 'Buttes Chaumont', arrondissement: 19 },
  { lat: 48.8975, lng: 2.3930, label: 'Porte de Pantin', arrondissement: 19 },
  { lat: 48.8838, lng: 2.3882, label: 'Bolivar', arrondissement: 19 },
  // 20e
  { lat: 48.8714, lng: 2.3767, label: 'Belleville', arrondissement: 20 },
  { lat: 48.8634, lng: 2.3987, label: 'Pere Lachaise', arrondissement: 20 },
  { lat: 48.8530, lng: 2.4063, label: 'Porte de Montreuil', arrondissement: 20 },
  { lat: 48.8680, lng: 2.3913, label: 'Menilmontant', arrondissement: 20 },
];

// ─── Name Pools ──────────────────────────────────────────────────────────────

export const FIRST_NAMES = [
  'Camille','Lea','Manon','Chloe','Emma','Ines','Jade','Louise','Alice','Lina',
  'Lucas','Hugo','Louis','Nathan','Gabriel','Arthur','Jules','Raphael','Adam','Leo',
  'Clara','Sarah','Eva','Margot','Zoe','Nora','Lucie','Romane','Juliette','Elsa',
  'Tom','Theo','Ethan','Noah','Maxime','Romain','Antoine','Paul','Alexandre','Victor',
];

export const LAST_NAMES = [
  'Martin','Bernard','Dubois','Thomas','Robert','Richard','Petit','Durand','Leroy','Moreau',
  'Simon','Laurent','Lefebvre','Michel','Garcia','David','Bertrand','Roux','Vincent','Fournier',
  'Morel','Girard','Andre','Lefevre','Mercier','Dupont','Lambert','Bonnet','Francois','Martinez',
];

// ─── Simulation Enums ────────────────────────────────────────────────────────

export const SIM_CATEGORIES = ['harassment', 'stalking', 'dark_area', 'aggression', 'drunk', 'other'] as const;
export const SIM_SEVERITIES = ['low', 'med', 'high'] as const;
export const SIM_ENVIRONMENTS = ['foot', 'metro', 'bus', 'cycling', 'car', 'indoor'] as const;
export const SIM_URBAN_CONTEXTS = ['street', 'parking', 'store', 'metro', 'bus', 'park', 'restaurant', 'building'] as const;

export const SIM_COMMENTS = [
  'Be careful around here, I saw the same thing yesterday.',
  'This area is usually fine during the day.',
  'I can confirm this, happened to me too.',
  'Thanks for reporting, will avoid this spot tonight.',
  'The lighting here is really bad after 9pm.',
  'I walk here every day, first time seeing this.',
  'Stay safe everyone.',
  'Reported to local authorities as well.',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function pick<T>(arr: readonly T[] | T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomOffset(range = 0.003): number {
  return (Math.random() - 0.5) * 2 * range;
}

export function randomDateWithinHours(hours: number): string {
  return new Date(Date.now() - Math.floor(Math.random() * hours * 3_600_000)).toISOString();
}

// ─── User Behavior Model ─────────────────────────────────────────────────────

export type SimPlace = {
  lat: number;
  lng: number;
  label: string;
  role: 'home' | 'work' | 'favorite';
};

/** Assign a unique set of places (home, work, 3-5 favorites) to a simulated user */
export function generateUserPlaces(): SimPlace[] {
  const pts = PARIS_REFERENCE_POINTS;
  const places: SimPlace[] = [];

  const homeRef = pick(pts);
  places.push({
    lat: homeRef.lat + randomOffset(0.002),
    lng: homeRef.lng + randomOffset(0.002),
    label: homeRef.label,
    role: 'home',
  });

  // Work in a different arrondissement
  let workRef: ReferencePoint;
  do { workRef = pick(pts); } while (workRef.arrondissement === homeRef.arrondissement);
  places.push({
    lat: workRef.lat + randomOffset(0.002),
    lng: workRef.lng + randomOffset(0.002),
    label: workRef.label,
    role: 'work',
  });

  // 3-5 favorite places
  const favCount = 3 + Math.floor(Math.random() * 3);
  const used = new Set([pts.indexOf(homeRef), pts.indexOf(workRef)]);
  for (let i = 0; i < favCount; i++) {
    let idx: number;
    do { idx = Math.floor(Math.random() * pts.length); } while (used.has(idx));
    used.add(idx);
    const ref = pts[idx];
    places.push({
      lat: ref.lat + randomOffset(0.003),
      lng: ref.lng + randomOffset(0.003),
      label: ref.label,
      role: 'favorite',
    });
  }

  return places;
}

/** Pick an activity location from a user's places (weighted) */
export function pickActivityLocation(places: SimPlace[]): { lat: number; lng: number } {
  if (!places || places.length === 0) {
    const ref = pick(PARIS_REFERENCE_POINTS);
    return { lat: ref.lat + randomOffset(), lng: ref.lng + randomOffset() };
  }

  const roll = Math.random();

  // 10% in-transit between two places
  if (roll < 0.10) {
    const a = pick(places);
    const b = pick(places);
    const t = Math.random();
    return {
      lat: a.lat + (b.lat - a.lat) * t + randomOffset(0.001),
      lng: a.lng + (b.lng - a.lng) * t + randomOffset(0.001),
    };
  }

  const home = places.find(p => p.role === 'home')!;
  const work = places.find(p => p.role === 'work')!;
  const favs = places.filter(p => p.role === 'favorite');

  let chosen: SimPlace;
  if (roll < 0.45) {
    chosen = home;       // 35% near home
  } else if (roll < 0.75) {
    chosen = work;       // 30% near work
  } else {
    chosen = pick(favs); // 25% near a favorite
  }

  return {
    lat: chosen.lat + randomOffset(0.002),
    lng: chosen.lng + randomOffset(0.002),
  };
}

// ─── Partner Safe Space Generator ────────────────────────────────────────────

const SAFE_SPACE_NAMES: Record<string, string[]> = {
  pharmacy: [
    'Pharmacie du Marais','Pharmacie Centrale','Pharmacie de la Place','Pharmacie du Parc',
    'Pharmacie Saint-Michel','Pharmacie de la Gare','Pharmacie Montmartre','Pharmacie des Arts',
    'Pharmacie de l\'Avenue','Pharmacie du Carrefour','Pharmacie de la Fontaine','Pharmacie Pasteur',
    'Pharmacie Victor Hugo','Pharmacie de la Bastille','Pharmacie du Pont','Pharmacie Voltaire',
    'Pharmacie du Temple','Pharmacie de l\'Etoile','Pharmacie Clemenceau','Pharmacie du Quartier',
  ],
  cafe: [
    'Le Petit Refuge','Cafe de la Paix','Le Comptoir Solidaire','Chez Marie','Le Cocon',
    'Cafe des Amis','La Maison Douce','Le Havre de Paix','Bistrot du Coin','L\'Abri Cafe',
    'Le Nid','Cafe Lumiere','Le Jardin Interieur','Chez Louise','Le Passage',
    'Cafe Esperance','La Terrasse Calme','Le Bon Accueil','Le Relais','Cafe Harmonie',
  ],
  shelter: [
    'Centre d\'Hebergement Aurore','Foyer Marie-Louise','Maison de la Solidarite',
    'Centre Emmaus','Accueil de Jour Saint-Martin','L\'Escale','Centre Flora Tristan',
    'Le Phare','Maison des Femmes','Centre d\'Accueil Halte','Foyer de l\'Esperance',
    'La Main Tendue','Accueil Louise Michel','Le Refuge Parisien','La Maison Ouverte',
    'Centre Egalite','Foyer Belleville','Accueil Securite','Centre Fraternite','L\'Oasis',
  ],
  hospital: [
    'Clinique Saint-Louis','Centre Medical Republique','Maison de Sante Voltaire',
    'Centre de Soins Montmartre','Clinique du Parc','Polyclinique de l\'Est',
    'Centre Medical des Halles','Clinique Sainte-Anne','Centre de Sante Gambetta',
    'Clinique des Lilas','Centre Medical Nation','Polyclinique du Sud',
    'Clinique du Marais','Centre Medical Denfert','Clinique des Batignolles',
  ],
  police: [
    'Commissariat du 1er','Commissariat du 5e','Commissariat du 8e',
    'Commissariat du 10e','Commissariat du 11e','Commissariat du 13e',
    'Commissariat du 14e','Commissariat du 15e','Commissariat du 17e',
    'Commissariat du 18e','Commissariat du 19e','Commissariat du 20e',
  ],
};

const FRENCH_STREETS = [
  'Rue de Rivoli','Boulevard Haussmann','Rue de la Paix','Avenue des Champs-Elysees',
  'Rue Saint-Honore','Boulevard Voltaire','Rue de Rennes','Avenue de la Republique',
  'Rue du Faubourg Saint-Antoine','Boulevard de Sebastopol','Rue de Belleville',
  'Avenue d\'Italie','Rue Oberkampf','Boulevard de Clichy','Rue de Vaugirard',
  'Avenue de Clichy','Rue Montmartre','Boulevard Beaumarchais','Rue Lafayette',
  'Rue de Charonne','Boulevard du Montparnasse','Rue du Commerce','Avenue Parmentier',
  'Rue de Menilmontant','Boulevard de la Villette','Rue de Turenne','Avenue de Choisy',
  'Rue des Martyrs','Boulevard Magenta','Rue de la Roquette',
];

function generateAddress(arrondissement: number): string {
  const num = 1 + Math.floor(Math.random() * 150);
  return `${num} ${pick(FRENCH_STREETS)}, 750${String(arrondissement).padStart(2, '0')} Paris`;
}

function generateOpeningHours(type: string): Record<string, DayHours> {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const hours: Record<string, DayHours> = {};

  if (type === 'hospital') {
    for (const d of days) hours[d] = { closed: false, open: '00:00', close: '23:59' };
    return hours;
  }

  const opens = type === 'cafe' ? '07:30' : type === 'pharmacy' ? '08:30' : '09:00';
  const closes = type === 'cafe' ? '22:00' : type === 'pharmacy' ? '20:00' : '18:00';

  for (const d of days) {
    if (d === 'sunday' && type !== 'cafe') {
      hours[d] = { closed: true };
    } else if (d === 'saturday') {
      hours[d] = { closed: false, open: type === 'cafe' ? '08:00' : '10:00', close: type === 'cafe' ? '23:00' : '17:00' };
    } else {
      hours[d] = { closed: false, open: opens, close: closes };
    }
  }
  return hours;
}

function generatePhone(): string {
  const a = 40 + Math.floor(Math.random() * 10);
  const b = String(Math.floor(Math.random() * 100)).padStart(2, '0');
  const c = String(Math.floor(Math.random() * 100)).padStart(2, '0');
  const d = String(Math.floor(Math.random() * 100)).padStart(2, '0');
  return `01 ${a} ${b} ${c} ${d}`;
}

/** Generate N partner safe spaces distributed across Paris */
export function generatePartnerSafeSpaces(count: number) {
  const types = ['pharmacy', 'cafe', 'shelter', 'hospital', 'police'] as const;
  const weights = [0.25, 0.30, 0.20, 0.10, 0.15];
  const nameCounters: Record<string, number> = {};
  const spaces = [];

  for (let i = 0; i < count; i++) {
    // Weighted type selection
    const roll = Math.random();
    let cum = 0;
    let type: string = 'cafe';
    for (let t = 0; t < types.length; t++) {
      cum += weights[t];
      if (roll < cum) { type = types[t]; break; }
    }

    const ref = pick(PARIS_REFERENCE_POINTS);
    const pool = SAFE_SPACE_NAMES[type] || SAFE_SPACE_NAMES.cafe;
    nameCounters[type] = (nameCounters[type] || 0) + 1;
    const nameIdx = (nameCounters[type] - 1) % pool.length;
    const suffix = nameCounters[type] > pool.length ? ` - ${ref.label}` : '';

    spaces.push({
      lat: ref.lat + randomOffset(0.003),
      lng: ref.lng + randomOffset(0.003),
      name: pool[nameIdx] + suffix,
      type,
      address: generateAddress(ref.arrondissement),
      phone: generatePhone(),
      contact_name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      description: type === 'cafe'
        ? 'Espace securise partenaire Brume. Personnel forme a l\'accueil d\'urgence.'
        : 'Accueil prioritaire signalements Brume.',
      website: null,
      opening_hours: generateOpeningHours(type),
      is_partner: true,
      partner_since: randomDateWithinHours(8760),
      partner_tier: (Math.random() < 0.3 ? 'premium' : 'basic') as 'basic' | 'premium',
      source: 'simulated' as const,
      verified: true,
      upvotes: Math.floor(Math.random() * 50),
      photo_urls: [] as string[],
      is_simulated: true,
    });
  }
  return spaces;
}
