// src/components/map/pin-renderer.ts

import type { Pin } from '@/types';
import { CATEGORY_DETAILS } from '@/types';
import { getPinOpacity as getPinOpacityUtil } from '@/lib/pin-utils';

/** Category-based canvas pin. Draws circle with optional border + glow. */
export function makeCategoryPin(
  color: string,
  displaySize: number,
  hasBorder: boolean,
  hasGlow: boolean,
): { width: number; height: number; data: Uint8Array } {
  // Canvas at 2x for HiDPI (pixelRatio:2 halves display size)
  const S = displaySize * 2;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d')!;
  const cx = S / 2, cy = S / 2;
  const dotR = S * 0.30;

  // Glow shadow
  if (hasGlow) {
    ctx.beginPath(); ctx.arc(cx, cy, dotR + 6, 0, Math.PI * 2);
    ctx.fillStyle = color + '44'; // 27% opacity glow
    ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, dotR + 10, 0, Math.PI * 2);
    ctx.fillStyle = color + '22'; // 13% opacity outer glow
    ctx.fill();
  }

  // White outer ring (border)
  if (hasBorder) {
    ctx.beginPath(); ctx.arc(cx, cy, dotR + 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fill();
  }

  // White base ring
  ctx.beginPath(); ctx.arc(cx, cy, dotR + 2, 0, Math.PI * 2);
  ctx.fillStyle = '#fff'; ctx.fill();

  // Colored dot
  ctx.beginPath(); ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();

  // Highlight reflection
  ctx.beginPath(); ctx.arc(cx - dotR * 0.18, cy - dotR * 0.18, dotR * 0.32, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fill();

  return { width: S, height: S, data: new Uint8Array(ctx.getImageData(0, 0, S, S).data) };
}

/** Safe space pin: emoji inside a #6BA68E semi-transparent circle. */
export function makeSafePin(emoji: string): { width: number; height: number; data: Uint8Array } {
  const S = 28;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d')!;
  ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 1, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(107,166,142,0.2)'; ctx.fill();
  ctx.strokeStyle = 'rgba(107,166,142,0.7)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.font = `${Math.round(S * 0.52)}px serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(emoji, S / 2, S / 2 + 1);
  return { width: S, height: S, data: new Uint8Array(ctx.getImageData(0, 0, S, S).data) };
}

/** Compute effective opacity for a pin, accounting for last_confirmed_at. */
export function getEffectiveOpacity(pin: Pin): number {
  return getPinOpacityUtil(pin);
}

/** Get category group id for a pin. */
export function getCategoryGroupId(pin: Pin): string {
  const details = CATEGORY_DETAILS[pin.category];
  return details?.group ?? 'infra';
}
