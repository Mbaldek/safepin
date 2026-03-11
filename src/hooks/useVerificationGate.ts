import { useCallback } from 'react';
import { useStore } from '@/stores/useStore';

const SNOOZE_KEY = 'breveil_verif_snooze';

export type VerificationGateState = {
  daysSinceSignup: number;
  daysLeft: number;
  isGated: boolean;
  shouldNudge: boolean;
  isNonSkippable: boolean;
  isVerified: boolean;
  snooze: () => void;
  clearSnooze: () => void;
};

function isSnoozed(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = localStorage.getItem(SNOOZE_KEY);
  if (!raw) return false;
  return new Date(raw).getTime() > Date.now();
}

export default function useVerificationGate(): VerificationGateState {
  const userProfile = useStore((s) => s.userProfile);

  const createdAt = userProfile?.created_at;
  const status = userProfile?.verification_status;

  const daysSinceSignup = createdAt
    ? Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)
    : 0;
  const daysLeft = Math.max(0, 7 - daysSinceSignup);
  const isVerified = status === 'approved' || status === 'pending';
  const isGated = !isVerified && daysSinceSignup >= 7;
  const isNonSkippable = daysLeft <= 1;
  const shouldNudge =
    !!userProfile &&
    !isVerified &&
    daysSinceSignup >= 1 &&
    daysSinceSignup < 7 &&
    !isSnoozed();

  const snooze = useCallback(() => {
    if (isNonSkippable) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    localStorage.setItem(SNOOZE_KEY, tomorrow.toISOString());
  }, [isNonSkippable]);

  const clearSnooze = useCallback(() => {
    localStorage.removeItem(SNOOZE_KEY);
  }, []);

  if (!userProfile || !createdAt) {
    return {
      daysSinceSignup: 0,
      daysLeft: 0,
      isGated: false,
      shouldNudge: false,
      isNonSkippable: false,
      isVerified: false,
      snooze: () => {},
      clearSnooze: () => {},
    };
  }

  return {
    daysSinceSignup,
    daysLeft,
    isGated,
    shouldNudge,
    isNonSkippable,
    isVerified,
    snooze,
    clearSnooze,
  };
}
