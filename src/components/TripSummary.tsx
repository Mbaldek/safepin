// src/components/TripSummary.tsx
// Post-trip summary card shown when a trip completes successfully.
// Displays duration, safety score, streak, and save/share actions.

'use client';

import { Check, Star, Share2, Flame, Shield, Clock, Route } from 'lucide-react';
import { TripSession } from '@/stores/useStore';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

type Props = {
  trip: TripSession;
  onDismiss: () => void;
  streak: number;
};

function fmtDuration(startIso: string, endNow: boolean = true): string {
  const startMs = new Date(startIso).getTime();
  const endMs = endNow ? Date.now() : new Date(startIso).getTime();
  const s = Math.round((endMs - startMs) / 1000);
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

function safetyLabel(score: number): [string, string] {
  if (score === 0) return ['Excellent', '#22c55e'];
  if (score <= 2) return ['Good', '#f59e0b'];
  return ['Fair', '#ef4444'];
}

export default function TripSummary({ trip, onDismiss, streak }: Props) {
  const { userProfile } = useStore();
  const t = useTranslations('trip');

  const plannedMin = Math.round(trip.route.duration / 60);
  const actualMin = Math.round((Date.now() - new Date(trip.startedAt).getTime()) / 60_000);
  const [safeLabel, safeColor] = safetyLabel(trip.route.dangerScore);

  const modeEmoji = (() => {
    switch (trip.mode) { case 'walk': return '🚶'; case 'bike': return '🚴'; case 'drive': return '🚗'; case 'transit': return '🚇'; default: return '📍'; }
  })();

  async function saveRoute() {
    if (!userProfile?.id) return;
    const { error } = await supabase.from('saved_routes').upsert(
      {
        user_id: userProfile.id,
        name: trip.destination.label,
        from_label: trip.origin.label,
        to_label: trip.destination.label,
        mode: trip.mode,
        coords: trip.route.coords,
        danger_score_last: trip.route.dangerScore,
        trip_count: 1,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,name' },
    );
    if (error) toast.error('Could not save route');
    else toast.success('Route saved ✓');
  }

  async function shareTrip() {
    try {
      await navigator.share?.({
        title: `Brume Safety Escort`,
        text: `I arrived safely at ${trip.destination.label}! ${actualMin} min trip — safety score: ${safeLabel}`,
      });
    } catch {
      toast.success('Link copied!');
    }
  }

  return (
    <div className="flex flex-col items-center gap-5 pt-4 pb-2">
      {/* Success icon */}
      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}>
        <Check size={32} strokeWidth={2.5} style={{ color: '#22c55e' }} />
      </div>

      <div className="text-center">
        <h3 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>{t('tripComplete')} ✓</h3>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {modeEmoji} {trip.origin.label} → {trip.destination.label}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2.5 w-full">
        <div className="flex items-center gap-2.5 px-3 py-3 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <Clock size={16} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
          <div>
            <p className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>{actualMin} min</p>
            <p className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>{t('estMinutes', { minutes: plannedMin })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 px-3 py-3 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <Shield size={16} strokeWidth={2} style={{ color: safeColor }} />
          <div>
            <p className="text-xs font-black" style={{ color: safeColor }}>{safeLabel}</p>
            <p className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>{t('safetyScore')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 px-3 py-3 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <Route size={16} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
          <div>
            <p className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>{trip.incidents}</p>
            <p className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>{t('incidentsNearby')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 px-3 py-3 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <Flame size={16} strokeWidth={2} style={{ color: 'var(--accent)' }} />
          <div>
            <p className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>{streak > 0 ? `${streak} days` : '—'}</p>
            <p className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>{t('tripStreak')}</p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2.5 w-full">
        <button
          onClick={saveRoute}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold transition active:scale-[0.98]"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        >
          <Star size={14} strokeWidth={2.5} style={{ color: '#f59e0b' }} />
          {t('saveRoute')}
        </button>
        <button
          onClick={shareTrip}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold transition active:scale-[0.98]"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        >
          <Share2 size={14} strokeWidth={2.5} style={{ color: '#6366f1' }} />
          {t('share')}
        </button>
      </div>

      <button
        onClick={onDismiss}
        className="w-full py-3.5 rounded-2xl font-black text-sm transition active:scale-[0.98]"
        style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
      >
        {t('done')}
      </button>
    </div>
  );
}
