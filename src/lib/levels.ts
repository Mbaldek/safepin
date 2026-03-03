// src/lib/levels.ts — Shared trust-level system for Breveil

export type Level = { label: string; emoji: string; color: string; min: number; next: number };

export const LEVELS: Level[] = [
  { label: 'Watcher',  emoji: '👁',  color: '#6b7280', min: 0,   next: 50  },
  { label: 'Reporter', emoji: '📡',  color: '#6366f1', min: 50,  next: 200 },
  { label: 'Guardian', emoji: '⚔️',  color: '#f59e0b', min: 200, next: 500 },
  { label: 'Sentinel', emoji: '🛡️', color: 'var(--accent-gold)', min: 500, next: Infinity },
];

export function getLevel(score: number): Level {
  return [...LEVELS].reverse().find((l) => score >= l.min) ?? LEVELS[0];
}

export function computeScore(pinsCount: number, alertsCount: number, confirmedVotes: number, commentsMade: number): number {
  return pinsCount * 10 + alertsCount * 15 + confirmedVotes * 5 + commentsMade * 2;
}
