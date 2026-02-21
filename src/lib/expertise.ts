// src/lib/expertise.ts

import { Pin } from '@/types';

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type ExpertiseTag = {
  label: string;
  emoji: string;
  color: string;
};

const TAG_DEFS: Record<string, ExpertiseTag> = {
  'Night Owl':           { label: 'Night Owl',           emoji: '🦉', color: '#6366f1' },
  'Transit Guardian':    { label: 'Transit Guardian',    emoji: '🚇', color: '#0ea5e9' },
  'First Responder':     { label: 'First Responder',     emoji: '🚨', color: '#ef4444' },
  'Neighborhood Expert': { label: 'Neighborhood Expert', emoji: '🏘️',  color: '#f59e0b' },
  'Verified Guardian':   { label: 'Verified Guardian',   emoji: '✅',  color: '#10b981' },
};

export function computeExpertiseTags(
  pins: Pin[],
  userId: string,
  verified: boolean,
  levelLabel: string,
): ExpertiseTag[] {
  const myPins    = pins.filter((p) => p.user_id === userId && !p.is_emergency);
  const allMyPins = pins.filter((p) => p.user_id === userId);
  const tags: string[] = [];

  // Night Owl: ≥40% of reports posted after 22:00 or before 05:00 (min 5 pins)
  if (myPins.length >= 5) {
    const night = myPins.filter((p) => {
      const h = new Date(p.created_at).getHours();
      return h >= 22 || h < 5;
    });
    if (night.length / myPins.length >= 0.4) tags.push('Night Owl');
  }

  // Transit Guardian: ≥40% of reports in metro/bus environment (min 5 pins)
  if (myPins.length >= 5) {
    const transit = myPins.filter(
      (p) => p.environment === 'metro' || p.environment === 'bus',
    );
    if (transit.length / myPins.length >= 0.4) tags.push('Transit Guardian');
  }

  // First Responder: filed ≥2 emergency alerts
  if (allMyPins.filter((p) => p.is_emergency).length >= 2) {
    tags.push('First Responder');
  }

  // Neighborhood Expert: any single pin has ≥2 other pins within 500 m
  if (myPins.length >= 3) {
    const hasCluster = myPins.some((p1) => {
      let nearby = 0;
      for (const p2 of myPins) {
        if (p2.id === p1.id) continue;
        if (haversineMeters(p1.lat, p1.lng, p2.lat, p2.lng) <= 500) nearby++;
        if (nearby >= 2) return true;
      }
      return false;
    });
    if (hasCluster) tags.push('Neighborhood Expert');
  }

  // Verified Guardian: verified identity + Guardian or Sentinel level
  if (verified && (levelLabel === 'Guardian' || levelLabel === 'Sentinel')) {
    tags.push('Verified Guardian');
  }

  return tags.map((t) => TAG_DEFS[t]).filter(Boolean);
}
