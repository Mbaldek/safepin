// src/__tests__/lib/levels.test.ts

import { describe, it, expect } from 'vitest';
import { getLevel, computeScore, LEVELS } from '@/lib/levels';

describe('LEVELS', () => {
  it('has 4 levels', () => {
    expect(LEVELS).toHaveLength(4);
  });

  it('levels are in ascending order by min', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].min).toBeGreaterThan(LEVELS[i - 1].min);
    }
  });
});

describe('getLevel', () => {
  it('returns Watcher for score 0', () => {
    expect(getLevel(0).label).toBe('Watcher');
  });

  it('returns Reporter for score 50', () => {
    expect(getLevel(50).label).toBe('Reporter');
  });

  it('returns Guardian for score 200', () => {
    expect(getLevel(200).label).toBe('Guardian');
  });

  it('returns Sentinel for score 500', () => {
    expect(getLevel(500).label).toBe('Sentinel');
  });

  it('returns Sentinel for very high scores', () => {
    expect(getLevel(99999).label).toBe('Sentinel');
  });

  it('returns Watcher for negative scores', () => {
    expect(getLevel(-10).label).toBe('Watcher');
  });
});

describe('computeScore', () => {
  it('returns 0 for zero inputs', () => {
    expect(computeScore(0, 0, 0, 0)).toBe(0);
  });

  it('weights pins at 10 points each', () => {
    expect(computeScore(5, 0, 0, 0)).toBe(50);
  });

  it('weights alerts at 15 points each', () => {
    expect(computeScore(0, 3, 0, 0)).toBe(45);
  });

  it('weights votes at 5 points each', () => {
    expect(computeScore(0, 0, 10, 0)).toBe(50);
  });

  it('weights comments at 2 points each', () => {
    expect(computeScore(0, 0, 0, 5)).toBe(10);
  });

  it('sums all contributions correctly', () => {
    // 2*10 + 1*15 + 3*5 + 4*2 = 20 + 15 + 15 + 8 = 58
    expect(computeScore(2, 1, 3, 4)).toBe(58);
  });

  // Additional specific cases per test plan
  it('computeScore(10, 0, 0, 0) = 100', () => {
    expect(computeScore(10, 0, 0, 0)).toBe(100);
  });

  it('computeScore(0, 1, 0, 0) = 15', () => {
    expect(computeScore(0, 1, 0, 0)).toBe(15);
  });

  it('computeScore(5, 2, 10, 20) = 50+30+50+40 = 170', () => {
    // 5*10 + 2*15 + 10*5 + 20*2 = 50 + 30 + 50 + 40 = 170
    expect(computeScore(5, 2, 10, 20)).toBe(170);
  });
});
