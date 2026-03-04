// src/components/ChallengesSection.tsx — S48: Guardian Challenges

'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Trophy, Target, Flame, Loader2 } from 'lucide-react';
import type { Challenge, UserChallenge } from '@/types';
import { useTheme } from '@/stores/useTheme';

type Props = { userId: string };

type ChallengeWithProgress = Challenge & { progress: number; completed: boolean };

// Default weekly challenges (seeded if none exist for current week)
const DEFAULT_CHALLENGES: Omit<Challenge, 'id' | 'created_at' | 'is_active'>[] = [
  { title: 'Confirm 5 reports', emoji: '👍', description: 'Help verify 5 safety reports this week', challenge_type: 'votes', target_value: 5, reward_points: 50, week_start: '' },
  { title: 'Report 3 incidents', emoji: '📍', description: 'Submit 3 new safety reports', challenge_type: 'reports', target_value: 3, reward_points: 75, week_start: '' },
  { title: 'Comment on 3 pins', emoji: '💬', description: 'Help others by adding context to 3 reports', challenge_type: 'comments', target_value: 3, reward_points: 40, week_start: '' },
  { title: 'Save a safe route', emoji: '🗺️', description: 'Save at least 1 safe route for your commute', challenge_type: 'routes', target_value: 1, reward_points: 30, week_start: '' },
];

function getColors(isDark: boolean) {
  return isDark ? {
    bg: '#0F172A', card: '#1E293B', elevated: '#334155',
    textPrimary: '#FFFFFF', textSecondary: '#94A3B8', textTertiary: '#64748B',
    border: 'rgba(255,255,255,0.08)', borderMid: 'rgba(255,255,255,0.12)',
    hover: 'rgba(255,255,255,0.05)', active: 'rgba(255,255,255,0.10)',
    inputBg: 'rgba(255,255,255,0.06)',
  } : {
    bg: '#F8FAFC', card: '#FFFFFF', elevated: '#F1F5F9',
    textPrimary: '#0F172A', textSecondary: '#475569', textTertiary: '#94A3B8',
    border: 'rgba(15,23,42,0.06)', borderMid: 'rgba(15,23,42,0.10)',
    hover: 'rgba(15,23,42,0.03)', active: 'rgba(15,23,42,0.06)',
    inputBg: 'rgba(15,23,42,0.04)',
  };
}
const FIXED = {
  accentCyan: '#3BB4C1', accentCyanSoft: 'rgba(59,180,193,0.12)',
  accentGold: '#F5C341', semanticDanger: '#EF4444',
};

function getWeekStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + 1); // Monday
  return d.toISOString().slice(0, 10);
}

export default function ChallengesSection({ userId }: Props) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);
  const [challenges, setChallenges] = useState<ChallengeWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState(0);

  const loadChallenges = useCallback(async () => {
    setLoading(true);
    const weekStart = getWeekStart();

    // Load this week's challenges
    let { data: chs } = await supabase
      .from('challenges')
      .select('*')
      .eq('week_start', weekStart)
      .eq('is_active', true);

    // If no challenges for this week, seed defaults
    if (!chs?.length) {
      const toInsert = DEFAULT_CHALLENGES.map((c) => ({ ...c, week_start: weekStart, is_active: true }));
      const { data: inserted } = await supabase.from('challenges').insert(toInsert).select();
      chs = inserted ?? [];
    }

    // Load user's progress
    const ids = (chs ?? []).map((c) => c.id);
    const { data: userChs } = await supabase
      .from('user_challenges')
      .select('*')
      .eq('user_id', userId)
      .in('challenge_id', ids);

    const progressMap = new Map<string, UserChallenge>();
    for (const uc of (userChs ?? []) as UserChallenge[]) {
      progressMap.set(uc.challenge_id, uc);
    }

    // Calculate progress from actual user activity this week
    const [{ count: weekVotes }, { count: weekPins }, { count: weekComments }, { count: weekRoutes }] = await Promise.all([
      supabase.from('pin_votes').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', weekStart),
      supabase.from('pins').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', weekStart),
      supabase.from('pin_comments').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', weekStart),
      supabase.from('saved_routes').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', weekStart),
    ]);

    const activityMap: Record<string, number> = {
      votes: weekVotes ?? 0,
      reports: weekPins ?? 0,
      comments: weekComments ?? 0,
      routes: weekRoutes ?? 0,
      communities: 0,
      streak: 0,
    };

    const merged: ChallengeWithProgress[] = (chs as Challenge[]).map((c) => {
      const uc = progressMap.get(c.id);
      const actualProgress = activityMap[c.challenge_type] ?? 0;
      const progress = Math.min(actualProgress, c.target_value);
      const completed = !!uc?.completed_at || progress >= c.target_value;

      // Upsert progress if changed
      if (progress > (uc?.progress ?? 0)) {
        supabase.from('user_challenges').upsert(
          {
            user_id: userId,
            challenge_id: c.id,
            progress,
            completed_at: completed ? new Date().toISOString() : null,
          },
          { onConflict: 'user_id,challenge_id' }
        ).then(() => {});
      }

      return { ...c, progress, completed };
    });

    setChallenges(merged);

    // Load total points
    const { data: profile } = await supabase.from('profiles').select('challenge_points').eq('id', userId).single();
    setPoints(profile?.challenge_points ?? 0);

    setLoading(false);
  }, [userId]);

  useEffect(() => { loadChallenges(); }, [loadChallenges]);

  // Claim reward
  async function claimReward(challenge: ChallengeWithProgress) {
    if (!challenge.completed) return;
    const newPoints = points + challenge.reward_points;
    await supabase.from('profiles').update({ challenge_points: newPoints }).eq('id', userId);
    setPoints(newPoints);
    toast.success(`+${challenge.reward_points} points!`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={18} className="animate-spin" style={{ color: C.textSecondary }} />
      </div>
    );
  }

  const daysLeft = 7 - new Date().getDay() || 7;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={16} style={{ color: '#f59e0b' }} />
          <span className="text-sm font-black" style={{ color: C.textPrimary }}>Weekly Challenges</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Flame size={13} style={{ color: '#f59e0b' }} />
          <span className="text-xs font-black" style={{ color: '#f59e0b' }}>{points} pts</span>
          <span className="text-[0.6rem] ml-1" style={{ color: C.textSecondary }}>{daysLeft}d left</span>
        </div>
      </div>

      {/* Challenge cards */}
      {challenges.map((c) => {
        const pct = Math.min(100, Math.round((c.progress / c.target_value) * 100));
        return (
          <div
            key={c.id}
            className="rounded-xl p-3"
            style={{
              backgroundColor: c.completed ? 'rgba(16,185,129,0.06)' : C.card,
              border: c.completed ? '1px solid rgba(16,185,129,0.3)' : `1px solid ${C.border}`,
            }}
          >
            <div className="flex items-start gap-2.5">
              <span className="text-lg">{c.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black" style={{ color: C.textPrimary }}>{c.title}</p>
                  <span className="text-[0.6rem] font-bold" style={{ color: c.completed ? '#10b981' : C.textSecondary }}>
                    {c.completed ? 'Done!' : `${c.progress}/${c.target_value}`}
                  </span>
                </div>
                {c.description && (
                  <p className="text-[0.6rem] mt-0.5" style={{ color: C.textSecondary }}>{c.description}</p>
                )}
                {/* Progress bar */}
                <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: C.border }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: c.completed ? '#10b981' : FIXED.accentCyan,
                    }}
                  />
                </div>
                {/* Reward */}
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[0.55rem] font-bold" style={{ color: C.textSecondary }}>
                    <Target size={10} className="inline mr-0.5" /> +{c.reward_points} pts
                  </span>
                  {c.completed && (
                    <button
                      onClick={() => claimReward(c)}
                      className="text-[0.6rem] font-black px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: '#10b981', color: '#fff' }}
                    >
                      Claim
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
