// src/components/CoachMark.tsx — Spotlight tooltip for map tour

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface CoachMarkProps {
  targetSelector: string;
  title: string;
  description: string;
  position?: TooltipPosition;
  onNext: () => void;
  onSkip: () => void;
  currentStep: number;
  totalSteps: number;
  skipLabel?: string;
  nextLabel?: string;
  doneLabel?: string;
}

const TOOLTIP_WIDTH = 280;
const GAP = 14; // px between target edge and tooltip

export function CoachMark({
  targetSelector,
  title,
  description,
  position = 'bottom',
  onNext,
  onSkip,
  currentStep,
  totalSteps,
  skipLabel = 'Skip',
  nextLabel = 'Next →',
  doneLabel = 'Got it!',
}: CoachMarkProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    function measure() {
      const el = document.querySelector(targetSelector);
      if (el) setRect(el.getBoundingClientRect());
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [targetSelector]);

  if (!rect) return null;

  // ── Spotlight geometry ───────────────────────────────────────────────────────
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const spotRadius = Math.max(rect.width, rect.height) / 2 + 14;

  // ── Tooltip placement ────────────────────────────────────────────────────────
  // Clamp tooltip so it never overflows the viewport edges
  const clampLeft = (x: number) =>
    Math.max(8, Math.min(x, window.innerWidth - TOOLTIP_WIDTH - 8));

  let tooltipStyle: React.CSSProperties = { position: 'fixed', width: TOOLTIP_WIDTH };
  // horizontal center of target relative to where the tooltip starts
  let arrowOffset = 0; // px from left (or top) edge of tooltip to arrow center

  switch (position) {
    case 'bottom': {
      const left = clampLeft(cx - TOOLTIP_WIDTH / 2);
      tooltipStyle = { ...tooltipStyle, top: rect.bottom + GAP, left };
      arrowOffset = cx - left;
      break;
    }
    case 'top': {
      const left = clampLeft(cx - TOOLTIP_WIDTH / 2);
      tooltipStyle = { ...tooltipStyle, bottom: window.innerHeight - rect.top + GAP, left };
      arrowOffset = cx - left;
      break;
    }
    case 'right': {
      const top = Math.max(8, cy - 64);
      tooltipStyle = { ...tooltipStyle, top, left: rect.right + GAP };
      arrowOffset = cy - top;
      break;
    }
    case 'left': {
      const top = Math.max(8, cy - 64);
      tooltipStyle = { ...tooltipStyle, top, left: rect.left - TOOLTIP_WIDTH - GAP };
      arrowOffset = cy - top;
      break;
    }
  }

  // ── Animation direction ──────────────────────────────────────────────────────
  const initialY = position === 'bottom' ? -6 : position === 'top' ? 6 : 0;
  const initialX = position === 'right' ? -6 : position === 'left' ? 6 : 0;

  return (
    <>
      {/* ── Dark backdrop with spotlight cutout ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0"
        style={{
          zIndex: 200,
          background: `radial-gradient(
            circle ${spotRadius}px at ${cx}px ${cy}px,
            transparent ${spotRadius}px,
            rgba(0,0,0,0.72) ${spotRadius + 18}px
          )`,
        }}
        onClick={onSkip}
      />

      {/* ── Tooltip ─────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: initialY, x: initialX }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        exit={{ opacity: 0 }}
        transition={{ delay: 0.08, duration: 0.2 }}
        style={{
          ...tooltipStyle,
          zIndex: 201,
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Arrow pointer */}
        <Arrow position={position} offset={arrowOffset} />

        {/* Content */}
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          {title}
        </p>
        <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {currentStep}/{totalSteps}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onSkip}
              className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-muted)' }}
            >
              {skipLabel}
            </button>
            <button
              onClick={onNext}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-80"
              style={{ backgroundColor: 'var(--accent)', color: '#1B2541' }}
            >
              {currentStep === totalSteps ? doneLabel : nextLabel}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Arrow pointer ────────────────────────────────────────────────────────────
// Uses a rotated 12x12 square with selective borders so only the
// outer-facing sides are visible, creating a clean tooltip arrow.

const ARROW = 12; // px
const HALF = ARROW / 2;

function Arrow({ position, offset }: { position: TooltipPosition; offset: number }) {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: ARROW,
    height: ARROW,
    backgroundColor: 'var(--bg-card)',
    transform: 'rotate(45deg)',
  };

  // Offset clamp so arrow stays within tooltip bounds
  const safeOffset = Math.max(ARROW + 4, Math.min(offset, TOOLTIP_WIDTH - ARROW - 4));
  const safeOffsetV = Math.max(ARROW + 4, offset);

  switch (position) {
    // Tooltip is below target → arrow points up → triangle at top of tooltip
    case 'bottom':
      return (
        <div
          style={{
            ...base,
            top: -HALF,
            left: safeOffset - HALF,
            borderTop: '1px solid var(--border)',
            borderLeft: '1px solid var(--border)',
          }}
        />
      );
    // Tooltip is above target → arrow points down → triangle at bottom of tooltip
    case 'top':
      return (
        <div
          style={{
            ...base,
            bottom: -HALF,
            left: safeOffset - HALF,
            borderBottom: '1px solid var(--border)',
            borderRight: '1px solid var(--border)',
          }}
        />
      );
    // Tooltip is to the right of target → arrow points left → triangle at left of tooltip
    case 'right':
      return (
        <div
          style={{
            ...base,
            left: -HALF,
            top: safeOffsetV - HALF,
            borderLeft: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
          }}
        />
      );
    // Tooltip is to the left of target → arrow points right → triangle at right of tooltip
    case 'left':
      return (
        <div
          style={{
            ...base,
            right: -HALF,
            top: safeOffsetV - HALF,
            borderRight: '1px solid var(--border)',
            borderTop: '1px solid var(--border)',
          }}
        />
      );
  }
}
