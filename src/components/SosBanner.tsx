// src/components/SosBanner.tsx

'use client';

import { useEffect, useState } from 'react';
import { Pin } from '@/types';

const DISMISS_AFTER_MS = 30_000;

function flatEarthDistanceM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const avgLat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  return R * Math.sqrt(dLat * dLat + (Math.cos(avgLat) * dLng) * (Math.cos(avgLat) * dLng));
}

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m away`;
  }
  return `${(meters / 1000).toFixed(1)} km away`;
}

type SosBannerProps = {
  pin: Pin;
  userLocation: { lat: number; lng: number } | null;
  onDismiss: () => void;
};

export default function SosBanner({ pin, userLocation, onDismiss }: SosBannerProps) {
  // progress goes from 100 → 0 over 30 seconds
  const [progress, setProgress] = useState(100);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const intervalMs = 100;
    const totalSteps = DISMISS_AFTER_MS / intervalMs;

    const timer = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + intervalMs;
        const newProgress = Math.max(0, 100 - (next / DISMISS_AFTER_MS) * 100);
        setProgress(newProgress);
        if (next >= DISMISS_AFTER_MS) {
          clearInterval(timer);
          onDismiss();
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
    // onDismiss intentionally excluded — we only want the countdown to run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const distanceM =
    userLocation
      ? flatEarthDistanceM(userLocation, { lat: pin.lat, lng: pin.lng })
      : null;

  const distanceText = distanceM !== null ? formatDistance(distanceM) : 'Distance unknown';

  const secondsLeft = Math.ceil((DISMISS_AFTER_MS - elapsed) / 1000);

  return (
    <div
      className="rounded-2xl p-4 shadow-xl overflow-hidden"
      style={{ backgroundColor: '#ef4444', color: '#ffffff' }}
      role="alert"
      aria-live="assertive"
    >
      {/* Main content */}
      <div className="flex flex-col gap-2">
        {/* Headline row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl animate-pulse">🆘</span>
            <span className="text-base font-black tracking-tight">SOS Nearby</span>
          </div>
          {/* Dismiss button */}
          <button
            onClick={onDismiss}
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition hover:opacity-80 active:scale-95"
            style={{ backgroundColor: 'rgba(255,255,255,0.18)', color: '#ffffff' }}
            aria-label="Dismiss SOS banner"
          >
            <span className="text-sm font-bold leading-none">✕</span>
          </button>
        </div>

        {/* Distance */}
        <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.95)' }}>
          {distanceText}
        </p>

        {/* Subtitle */}
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.82)' }}>
          Someone needs help — can you assist?
        </p>

        {/* Button row */}
        <div className="flex gap-2 mt-1">
          {/* Navigate button */}
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${pin.lat},${pin.lng}&travelmode=walking`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition hover:opacity-90 active:scale-95"
            style={{ backgroundColor: '#ffffff', color: '#ef4444' }}
          >
            <span>🧭</span>
            <span>Navigate</span>
          </a>

          {/* Call 17 button */}
          <a
            href="tel:17"
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition hover:opacity-90 active:scale-95"
            style={{ backgroundColor: '#ffffff', color: '#ef4444' }}
          >
            <span>📞</span>
            <span>Call 17</span>
          </a>
        </div>

        {/* Countdown hint */}
        <p
          className="text-[0.6rem] text-right"
          style={{ color: 'rgba(255,255,255,0.6)' }}
        >
          Auto-dismisses in {secondsLeft}s
        </p>
      </div>

      {/* Countdown bar */}
      <div
        className="mt-3 rounded-full overflow-hidden"
        style={{ height: '3px', backgroundColor: 'rgba(255,255,255,0.25)' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${progress}%`,
            backgroundColor: 'rgba(255,255,255,0.85)',
            transitionDuration: '100ms',
            transitionTimingFunction: 'linear',
          }}
        />
      </div>
    </div>
  );
}
