// src/lib/milestones.ts — Milestone definitions + checker

import { computeScore } from './levels';

export type MilestoneStats = {
  pins: number;
  alerts: number;
  votes: number;
  comments: number;
  routes: number;
  placeNotes: number;
  communities: number;
  score: number;
};

export type Milestone = {
  key: string;
  label: string;
  emoji: string;
  description: string;
  check: (s: MilestoneStats) => boolean;
};

export const MILESTONES: Milestone[] = [
  { key: 'first_pin',       label: 'First Report',      emoji: '📍', description: 'Created your first safety report',           check: (s) => s.pins >= 1 },
  { key: '10_pins',         label: 'Watchful Eye',       emoji: '👁',  description: 'Created 10 safety reports',                  check: (s) => s.pins >= 10 },
  { key: 'first_sos',       label: 'First Alert',        emoji: '🆘', description: 'Triggered your first emergency alert',       check: (s) => s.alerts >= 1 },
  { key: 'first_vote',      label: 'Community Voice',    emoji: '👍', description: 'Confirmed your first report',                check: (s) => s.votes >= 1 },
  { key: '10_votes',        label: 'Trusted Verifier',   emoji: '✅', description: 'Confirmed 10 reports',                       check: (s) => s.votes >= 10 },
  { key: 'first_comment',   label: 'First Comment',      emoji: '💬', description: 'Left your first comment on a report',        check: (s) => s.comments >= 1 },
  { key: 'first_route',     label: 'Path Finder',        emoji: '🗺️', description: 'Saved your first safe route',                check: (s) => s.routes >= 1 },
  { key: 'first_place_note',label: 'Place Marker',       emoji: '📌', description: 'Created your first place note',              check: (s) => s.placeNotes >= 1 },
  { key: 'first_community', label: 'Community Builder',  emoji: '👥', description: 'Joined or created your first community',     check: (s) => s.communities >= 1 },
  { key: 'guardian_level',  label: 'Guardian',            emoji: '⚔️', description: 'Reached Guardian trust level',               check: (s) => s.score >= 200 },
  { key: 'sentinel_level',  label: 'Sentinel',           emoji: '🛡️', description: 'Reached Sentinel trust level',               check: (s) => s.score >= 500 },
];

/**
 * Returns milestone keys that are newly unlocked (not yet in `achieved`).
 */
export function checkMilestones(stats: MilestoneStats, achieved: string[]): Milestone[] {
  return MILESTONES.filter((m) => !achieved.includes(m.key) && m.check(stats));
}
