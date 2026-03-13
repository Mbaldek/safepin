import { CATEGORY_DETAILS, CATEGORY_GROUPS, DECAY_HOURS } from '@/types';

/**
 * Effective reference date for decay — uses last_confirmed_at when available.
 */
export function getEffectiveDate(pin: { created_at: string; last_confirmed_at?: string | null }): Date {
  if (pin.last_confirmed_at) {
    return new Date(Math.max(
      new Date(pin.created_at).getTime(),
      new Date(pin.last_confirmed_at).getTime(),
    ));
  }
  return new Date(pin.created_at);
}

/**
 * Get pin size based on confirmations count
 */
export function getPinSize(confirmations: number): number {
  if (confirmations >= 10) return 32;
  if (confirmations >= 4) return 26;
  if (confirmations >= 2) return 20;
  return 16;
}

/**
 * Get pin opacity based on time decay (accounts for last_confirmed_at)
 */
export function getPinOpacity(pin: { created_at: string; last_confirmed_at?: string | null; category: string }): number {
  const effectiveDate = getEffectiveDate(pin);
  const hoursAgo = (Date.now() - effectiveDate.getTime()) / (1000 * 60 * 60);
  const maxHours = DECAY_HOURS[pin.category] || 24;
  const ratio = Math.min(hoursAgo / maxHours, 1);
  return Math.max(1 - ratio * 0.7, 0.3);
}

/**
 * Get pin color based on category
 */
export function getPinColor(category: string): string {
  const details = CATEGORY_DETAILS[category];
  if (!details) return '#94A3B8';
  const group = CATEGORY_GROUPS[details.group];
  return group.color.text;
}

/**
 * Get category group from category id
 */
export function getCategoryGroup(category: string) {
  const details = CATEGORY_DETAILS[category];
  if (!details) return null;
  return CATEGORY_GROUPS[details.group];
}

/**
 * Format time ago string
 */
export function formatTimeAgo(createdAt: string): string {
  const hoursAgo = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);

  if (hoursAgo < 1) return "il y a moins d'1h";
  if (hoursAgo < 24) return `il y a ${Math.floor(hoursAgo)}h`;
  return `il y a ${Math.floor(hoursAgo / 24)}j`;
}

/**
 * Determine decay type from category
 */
export function getDecayType(category: string): 'people' | 'infra' | 'positive' {
  const details = CATEGORY_DETAILS[category];
  if (!details) return 'people';

  if (details.group === 'infra') return 'infra';
  if (details.group === 'positive') return 'positive';
  return 'people';
}

/**
 * Linearly interpolate between two hex colors.
 */
function lerpColor(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 0xff) * (1 - t) + ((pb >> 16) & 0xff) * t);
  const g = Math.round(((pa >> 8) & 0xff) * (1 - t) + ((pb >> 8) & 0xff) * t);
  const bl = Math.round((pa & 0xff) * (1 - t) + (pb & 0xff) * t);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1).toUpperCase()}`;
}

/**
 * Get pin color blended toward grey based on age. Positive pins never fade.
 */
export function getPinColorWithAge(pin: { created_at: string; last_confirmed_at?: string | null; category: string }): string {
  const decayType = getDecayType(pin.category);
  if (decayType === 'positive') return getPinColor(pin.category);

  const effectiveDate = getEffectiveDate(pin);
  const hoursAgo = (Date.now() - effectiveDate.getTime()) / 3600000;
  const maxHours = DECAY_HOURS[pin.category] ?? 24;
  const ratio = Math.min(hoursAgo / maxHours, 1);

  return lerpColor(getPinColor(pin.category), '#94A3B8', ratio);
}

/**
 * Get the age ratio (0 = fresh, 1 = expired). Positive pins always return 0.
 */
export function getPinAgeRatio(pin: { created_at: string; last_confirmed_at?: string | null; category: string }): number {
  if (getDecayType(pin.category) === 'positive') return 0;
  const effectiveDate = getEffectiveDate(pin);
  const hoursAgo = (Date.now() - effectiveDate.getTime()) / 3600000;
  const maxHours = DECAY_HOURS[pin.category] ?? 24;
  return Math.min(hoursAgo / maxHours, 1);
}
