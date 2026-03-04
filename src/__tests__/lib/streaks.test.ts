// src/__tests__/lib/streaks.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getStreakEmoji,
  STREAK_MILESTONES,
  updateStreak,
} from '@/lib/streaks';

// ---------------------------------------------------------------------------
// getStreakEmoji
// ---------------------------------------------------------------------------

describe('getStreakEmoji', () => {
  it('returns zzz emoji for streak 0', () => {
    expect(getStreakEmoji(0)).toBe('\u{1F4A4}');
  });

  it('returns fire emoji for streak 1', () => {
    expect(getStreakEmoji(1)).toBe('\u{1F525}');
  });

  it('returns fire emoji for streak 2', () => {
    expect(getStreakEmoji(2)).toBe('\u{1F525}');
  });

  it('returns double fire emoji for streak 3', () => {
    expect(getStreakEmoji(3)).toBe('\u{1F525}\u{1F525}');
  });

  it('returns double fire emoji for streak 6', () => {
    expect(getStreakEmoji(6)).toBe('\u{1F525}\u{1F525}');
  });

  it('returns zap emoji for streak 7', () => {
    expect(getStreakEmoji(7)).toBe('\u26A1');
  });

  it('returns zap emoji for streak 13', () => {
    expect(getStreakEmoji(13)).toBe('\u26A1');
  });

  it('returns double zap emoji for streak 14', () => {
    expect(getStreakEmoji(14)).toBe('\u26A1\u26A1');
  });

  it('returns double zap emoji for streak 29', () => {
    expect(getStreakEmoji(29)).toBe('\u26A1\u26A1');
  });

  it('returns diamond emoji for streak 30', () => {
    expect(getStreakEmoji(30)).toBe('\u{1F48E}');
  });

  it('returns diamond emoji for streak 59', () => {
    expect(getStreakEmoji(59)).toBe('\u{1F48E}');
  });

  it('returns double diamond emoji for streak 60', () => {
    expect(getStreakEmoji(60)).toBe('\u{1F48E}\u{1F48E}');
  });

  it('returns double diamond emoji for streak 99', () => {
    expect(getStreakEmoji(99)).toBe('\u{1F48E}\u{1F48E}');
  });

  it('returns crown emoji for streak 100', () => {
    expect(getStreakEmoji(100)).toBe('\u{1F451}');
  });

  it('returns crown emoji for streak 999', () => {
    expect(getStreakEmoji(999)).toBe('\u{1F451}');
  });
});

// ---------------------------------------------------------------------------
// STREAK_MILESTONES
// ---------------------------------------------------------------------------

describe('STREAK_MILESTONES', () => {
  it('contains expected values', () => {
    expect(STREAK_MILESTONES).toEqual([3, 7, 14, 30, 60, 100]);
  });

  it('has 6 milestones', () => {
    expect(STREAK_MILESTONES).toHaveLength(6);
  });

  it('is in ascending order', () => {
    for (let i = 1; i < STREAK_MILESTONES.length; i++) {
      expect(STREAK_MILESTONES[i]).toBeGreaterThan(STREAK_MILESTONES[i - 1]);
    }
  });
});

// ---------------------------------------------------------------------------
// updateStreak — mock Supabase client
// ---------------------------------------------------------------------------

describe('updateStreak', () => {
  const userId = 'user-123';

  function todayUTC(): string {
    return new Date().toISOString().slice(0, 10);
  }

  function yesterdayUTC(): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  function twoDaysAgoUTC(): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 2);
    return d.toISOString().slice(0, 10);
  }

  /** Helper: create a mock Supabase client returning the given profile row. */
  function createMockSupabase(profile: Record<string, unknown> | null, fetchError: unknown = null) {
    const updateEqMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });
    const selectSingleMock = vi.fn().mockResolvedValue({ data: profile, error: fetchError });
    const selectEqMock = vi.fn().mockReturnValue({ single: selectSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: selectEqMock });
    const insertSelectSingleMock = vi.fn().mockResolvedValue({ data: { id: 'evt-1' }, error: null });
    const insertSelectMock = vi.fn().mockReturnValue({ single: insertSelectSingleMock });
    const insertMock = vi.fn().mockReturnValue({ select: insertSelectMock });

    const fromMock = vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        return { select: selectMock, update: updateMock };
      }
      if (table === 'engagement_events') {
        return { insert: insertMock };
      }
      return {};
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { from: fromMock } as any;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns streak = 1 on first visit (no last_active_date)', async () => {
    const supabase = createMockSupabase({
      current_streak: 0,
      longest_streak: 0,
      last_active_date: null,
    });

    const result = await updateStreak(supabase, userId);

    expect(result.streak).toBe(1);
    expect(result.milestone).toBeNull();
  });

  it('increments streak on consecutive day', async () => {
    const supabase = createMockSupabase({
      current_streak: 5,
      longest_streak: 10,
      last_active_date: yesterdayUTC(),
    });

    const result = await updateStreak(supabase, userId);

    expect(result.streak).toBe(6);
    expect(result.isNewRecord).toBe(false);
  });

  it('resets streak to 1 when a day is skipped', async () => {
    const supabase = createMockSupabase({
      current_streak: 5,
      longest_streak: 10,
      last_active_date: twoDaysAgoUTC(),
    });

    const result = await updateStreak(supabase, userId);

    expect(result.streak).toBe(1);
    expect(result.isNewRecord).toBe(false);
  });

  it('returns current streak with no changes when visited same day', async () => {
    const supabase = createMockSupabase({
      current_streak: 5,
      longest_streak: 10,
      last_active_date: todayUTC(),
    });

    const result = await updateStreak(supabase, userId);

    expect(result.streak).toBe(5);
    expect(result.isNewRecord).toBe(false);
    expect(result.milestone).toBeNull();
  });

  it('returns milestone number when streak hits a milestone (7)', async () => {
    const supabase = createMockSupabase({
      current_streak: 6,
      longest_streak: 6,
      last_active_date: yesterdayUTC(),
    });

    const result = await updateStreak(supabase, userId);

    expect(result.streak).toBe(7);
    expect(result.milestone).toBe(7);
  });

  it('returns milestone number when streak hits 3', async () => {
    const supabase = createMockSupabase({
      current_streak: 2,
      longest_streak: 2,
      last_active_date: yesterdayUTC(),
    });

    const result = await updateStreak(supabase, userId);

    expect(result.streak).toBe(3);
    expect(result.milestone).toBe(3);
  });

  it('returns null milestone when streak is not on a milestone', async () => {
    const supabase = createMockSupabase({
      current_streak: 4,
      longest_streak: 4,
      last_active_date: yesterdayUTC(),
    });

    const result = await updateStreak(supabase, userId);

    expect(result.streak).toBe(5);
    expect(result.milestone).toBeNull();
  });

  it('sets isNewRecord true when exceeding longest streak', async () => {
    const supabase = createMockSupabase({
      current_streak: 10,
      longest_streak: 10,
      last_active_date: yesterdayUTC(),
    });

    const result = await updateStreak(supabase, userId);

    expect(result.streak).toBe(11);
    expect(result.isNewRecord).toBe(true);
  });

  it('throws when profile is not found', async () => {
    const supabase = createMockSupabase(null, null);

    await expect(updateStreak(supabase, userId)).rejects.toThrow('Profile not found');
  });

  it('throws when fetch returns an error', async () => {
    const supabase = createMockSupabase(null, new Error('DB error'));

    await expect(updateStreak(supabase, userId)).rejects.toThrow('DB error');
  });
});
