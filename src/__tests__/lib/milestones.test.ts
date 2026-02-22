// src/__tests__/lib/milestones.test.ts

import { describe, it, expect } from 'vitest';
import { MILESTONES, checkMilestones, type MilestoneStats } from '@/lib/milestones';

const emptyStats: MilestoneStats = {
  pins: 0, alerts: 0, votes: 0, comments: 0,
  routes: 0, placeNotes: 0, communities: 0, score: 0,
};

describe('MILESTONES', () => {
  it('contains at least 10 milestones', () => {
    expect(MILESTONES.length).toBeGreaterThanOrEqual(10);
  });

  it('each milestone has required fields', () => {
    for (const m of MILESTONES) {
      expect(m.key).toBeTruthy();
      expect(m.label).toBeTruthy();
      expect(m.emoji).toBeTruthy();
      expect(typeof m.check).toBe('function');
    }
  });

  it('all keys are unique', () => {
    const keys = MILESTONES.map((m) => m.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('checkMilestones', () => {
  it('returns empty array for empty stats', () => {
    expect(checkMilestones(emptyStats, [])).toEqual([]);
  });

  it('detects first_pin milestone', () => {
    const stats = { ...emptyStats, pins: 1, score: 10 };
    const result = checkMilestones(stats, []);
    expect(result.some((m) => m.key === 'first_pin')).toBe(true);
  });

  it('does not return already achieved milestones', () => {
    const stats = { ...emptyStats, pins: 1, score: 10 };
    const result = checkMilestones(stats, ['first_pin']);
    expect(result.some((m) => m.key === 'first_pin')).toBe(false);
  });

  it('detects multiple milestones at once', () => {
    const stats: MilestoneStats = {
      pins: 10, alerts: 1, votes: 10, comments: 1,
      routes: 1, placeNotes: 1, communities: 1, score: 200,
    };
    const result = checkMilestones(stats, []);
    expect(result.length).toBeGreaterThanOrEqual(8);
  });

  it('detects guardian milestone at score 200', () => {
    const stats = { ...emptyStats, score: 200 };
    const result = checkMilestones(stats, []);
    expect(result.some((m) => m.key === 'guardian_level')).toBe(true);
  });

  it('detects sentinel milestone at score 500', () => {
    const stats = { ...emptyStats, score: 500 };
    const result = checkMilestones(stats, []);
    expect(result.some((m) => m.key === 'sentinel_level')).toBe(true);
  });
});
