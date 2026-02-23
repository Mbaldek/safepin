// src/lib/streaks.ts — Daily streak tracking + engagement event logging for KOVA

import type { SupabaseClient } from '@supabase/supabase-js';

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

export type EngagementEventType =
  | 'signup'
  | 'login'
  | 'pin_created'
  | 'vote_cast'
  | 'comment_posted'
  | 'route_planned'
  | 'sos_triggered'
  | 'verification_started'
  | 'verification_completed'
  | 'streak_milestone';

export type StreakResult = {
  streak: number;
  isNewRecord: boolean;
  milestone: number | null;
};

export type StreakInfo = {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns today's date as YYYY-MM-DD in UTC. */
function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Returns yesterday's date as YYYY-MM-DD in UTC. */
function yesterdayUTC(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Called on each app visit / login.
 * Increments, resets, or skips the streak depending on last_active_date.
 */
export async function updateStreak(
  supabase: SupabaseClient,
  userId: string,
): Promise<StreakResult> {
  const today = todayUTC();
  const yesterday = yesterdayUTC();

  const { data: profile, error: fetchErr } = await supabase
    .from('profiles')
    .select('current_streak, longest_streak, last_active_date')
    .eq('id', userId)
    .single();

  if (fetchErr || !profile) throw fetchErr ?? new Error('Profile not found');

  const lastActive: string | null = profile.last_active_date;
  let newStreak: number;

  if (lastActive === today) {
    // Already counted today — nothing to do
    return {
      streak: profile.current_streak,
      isNewRecord: false,
      milestone: null,
    };
  } else if (lastActive === yesterday) {
    newStreak = (profile.current_streak ?? 0) + 1;
  } else {
    newStreak = 1;
  }

  const longestStreak = Math.max(newStreak, profile.longest_streak ?? 0);
  const isNewRecord = longestStreak > (profile.longest_streak ?? 0);

  const { error: updateErr } = await supabase
    .from('profiles')
    .update({
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_active_date: today,
      streak_updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (updateErr) throw updateErr;

  // Check for milestone
  const milestone = STREAK_MILESTONES.includes(newStreak) ? newStreak : null;

  if (milestone !== null) {
    await logEngagement(supabase, userId, 'streak_milestone', {
      streak: milestone,
    });
  }

  return { streak: newStreak, isNewRecord, milestone };
}

/**
 * Generic engagement event logger.
 */
export async function logEngagement(
  supabase: SupabaseClient,
  userId: string,
  eventType: EngagementEventType,
  metadata?: Record<string, unknown>,
) {
  const { data, error } = await supabase
    .from('engagement_events')
    .insert({
      user_id: userId,
      event_type: eventType,
      metadata: metadata ?? {},
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Returns the current streak info for a user.
 */
export async function getStreakInfo(
  supabase: SupabaseClient,
  userId: string,
): Promise<StreakInfo> {
  const { data, error } = await supabase
    .from('profiles')
    .select('current_streak, longest_streak, last_active_date')
    .eq('id', userId)
    .single();

  if (error || !data) throw error ?? new Error('Profile not found');

  return {
    currentStreak: data.current_streak ?? 0,
    longestStreak: data.longest_streak ?? 0,
    lastActiveDate: data.last_active_date ?? null,
  };
}

/**
 * Returns an emoji string representing the streak tier.
 */
export function getStreakEmoji(streak: number): string {
  if (streak >= 100) return '\u{1F451}';   // crown
  if (streak >= 60) return '\u{1F48E}\u{1F48E}'; // diamond x2
  if (streak >= 30) return '\u{1F48E}';    // diamond
  if (streak >= 14) return '\u26A1\u26A1'; // zap x2
  if (streak >= 7) return '\u26A1';        // zap
  if (streak >= 3) return '\u{1F525}\u{1F525}'; // fire x2
  if (streak >= 1) return '\u{1F525}';     // fire
  return '\u{1F4A4}';                      // zzz
}
