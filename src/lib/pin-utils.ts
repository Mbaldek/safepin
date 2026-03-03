import { CATEGORY_DETAILS, CATEGORY_GROUPS, DECAY_HOURS } from '@/types';

/**
 * Get pin size based on confirmations count
 */
export function getPinSize(confirmations: number): number {
  if (confirmations >= 10) return 28;
  if (confirmations >= 4) return 22;
  if (confirmations >= 2) return 18;
  return 14;
}

/**
 * Get pin opacity based on time decay
 */
export function getPinOpacity(createdAt: string, category: string): number {
  const hoursAgo = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  const maxHours = DECAY_HOURS[category] || 24;
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
