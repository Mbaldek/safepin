// src/components/TripSummary.tsx
// Post-trip summary card shown when a trip completes successfully.
// Displays duration, safety score, streak, and save/share actions.

'use client';

import { Check, Star, Share2, Flame, Shield, Clock, Route } from 'lucide-react';
import { TripSession } from '@/stores/useStore';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { useTheme } from '@/stores/useTheme';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

function getColors(isDark: boolean) {
  return isDark ? {
    bg: '#0F172A', sheet: '#1A2540', card: '#1E293B', elevated: '#334155',
    t1: '#FFFFFF', t2: '#94A3B8', t3: '#64748B',
    border: 'rgba(255,255,255,0.08)', borderMid: 'rgba(255,255,255,0.13)',
  } : {
    bg: '#F8FAFC', sheet: '#FFFFFF', card: '#FFFFFF', elevated: '#F1F5F9',
    t1: '#0F172A', t2: '#475569', t3: '#94A3B8',
    border: 'rgba(15,23,42,0.07)', borderMid: 'rgba(15,23,42,0.12)',
  };
}

const F = {
  cyan: '#3BB4C1',
  gold: '#F5C341',
  success: '#34D399',
  danger: '#EF4444',
  purple: '#A78BFA',
  warning: '#FBBF24',
};

type Props = {
  trip: TripSession;
  onDismiss: () => void;
  streak: number;
};

function safetyLabel(score: number): [string, string] {
  if (score === 0) return ['Excellent', F.success];
  if (score <= 2) return ['Bon', F.warning];
  return ['Risqué', F.danger];
}

export default function TripSummary({ trip, onDismiss, streak }: Props) {
  const { userProfile } = useStore();
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);
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
    if (error) toast.error('Impossible de sauvegarder');
    else toast.success('Trajet sauvegardé');
  }

  async function shareTrip() {
    try {
      await navigator.share?.({
        title: 'Breveil Safety Escort',
        text: `Je suis arrivé(e) à ${trip.destination.label} ! ${actualMin} min — score : ${safeLabel}`,
      });
    } catch {
      toast.success('Lien copié !');
    }
  }

  return (
    <div className="flex flex-col items-center gap-5 pt-4 pb-2">
      {/* Success icon */}
      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}>
        <Check size={32} strokeWidth={2.5} style={{ color: F.success }} />
      </div>

      <div className="text-center">
        <h3 className="text-lg font-black" style={{ color: C.t1 }}>{t('tripComplete')} ✓</h3>
        <p className="text-sm mt-1" style={{ color: C.t2 }}>
          {modeEmoji} {trip.origin.label} → {trip.destination.label}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2.5 w-full">
        <div className="flex items-center gap-2.5 px-3 py-3 rounded-xl" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
          <Clock size={16} strokeWidth={2} style={{ color: C.t2 }} />
          <div>
            <p className="text-xs font-black" style={{ color: C.t1 }}>{actualMin} min</p>
            <p className="text-[0.6rem]" style={{ color: C.t2 }}>{t('estMinutes', { minutes: plannedMin })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 px-3 py-3 rounded-xl" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
          <Shield size={16} strokeWidth={2} style={{ color: safeColor }} />
          <div>
            <p className="text-xs font-black" style={{ color: safeColor }}>{safeLabel}</p>
            <p className="text-[0.6rem]" style={{ color: C.t2 }}>{t('safetyScore')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 px-3 py-3 rounded-xl" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
          <Route size={16} strokeWidth={2} style={{ color: C.t2 }} />
          <div>
            <p className="text-xs font-black" style={{ color: C.t1 }}>{trip.incidents}</p>
            <p className="text-[0.6rem]" style={{ color: C.t2 }}>{t('incidentsNearby')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 px-3 py-3 rounded-xl" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
          <Flame size={16} strokeWidth={2} style={{ color: F.cyan }} />
          <div>
            <p className="text-xs font-black" style={{ color: C.t1 }}>{streak > 0 ? `${streak} jours` : '—'}</p>
            <p className="text-[0.6rem]" style={{ color: C.t2 }}>{t('tripStreak')}</p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2.5 w-full">
        <button
          onClick={saveRoute}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold transition active:scale-[0.98]"
          style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, color: C.t1 }}
        >
          <Star size={14} strokeWidth={2.5} style={{ color: F.gold }} />
          {t('saveRoute')}
        </button>
        <button
          onClick={shareTrip}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold transition active:scale-[0.98]"
          style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, color: C.t1 }}
        >
          <Share2 size={14} strokeWidth={2.5} style={{ color: F.purple }} />
          {t('share')}
        </button>
      </div>

      <button
        onClick={onDismiss}
        className="w-full py-3.5 rounded-2xl font-black text-sm transition active:scale-[0.98]"
        style={{ backgroundColor: F.cyan, color: '#fff' }}
      >
        {t('done')}
      </button>
    </div>
  );
}
