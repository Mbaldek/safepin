// src/components/CoachMark.tsx — Spotlight tooltip for map tour

'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
const GAP = 14;
const ARROW_SIZE = 8;
const PADDING = 6; // ring padding around target

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
  const [targetRadius, setTargetRadius] = useState(12);
  const prevStepRef = useRef(currentStep);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    function measure() {
      const el = document.querySelector(targetSelector);
      if (!el) return;
      setRect(el.getBoundingClientRect());
      const computed = getComputedStyle(el);
      const r = parseFloat(computed.borderRadius) || 12;
      setTargetRadius(r);
      // Elevate the target element
      const htmlEl = el as HTMLElement;
      htmlEl.style.position = 'relative';
      htmlEl.style.zIndex = '999';
    }
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      // Clean up z-index on unmount
      const el = document.querySelector(targetSelector) as HTMLElement | null;
      if (el) {
        el.style.zIndex = '';
      }
    };
  }, [targetSelector]);

  // Fade transition between steps
  useEffect(() => {
    if (currentStep !== prevStepRef.current) {
      setVisible(false);
      const t = setTimeout(() => {
        prevStepRef.current = currentStep;
        setVisible(true);
      }, 150);
      return () => clearTimeout(t);
    }
  }, [currentStep]);

  if (!rect) return null;

  // ── Spotlight clip path (rectangular with rounded corners) ──────────────
  const spotLeft = rect.left - PADDING;
  const spotTop = rect.top - PADDING;
  const spotW = rect.width + PADDING * 2;
  const spotH = rect.height + PADDING * 2;
  const r = targetRadius + 2;

  // ── Tooltip placement ──────────────────────────────────────────────────
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const clampLeft = (x: number) =>
    Math.max(12, Math.min(x, window.innerWidth - TOOLTIP_WIDTH - 12));

  let tooltipStyle: React.CSSProperties = { position: 'fixed', width: TOOLTIP_WIDTH };
  let arrowLeft = 0;
  let arrowTop = 0;
  let arrowSide: 'top' | 'bottom' | 'left' | 'right' = 'top';

  switch (position) {
    case 'bottom': {
      const left = clampLeft(cx - TOOLTIP_WIDTH / 2);
      tooltipStyle = { ...tooltipStyle, top: rect.bottom + GAP + PADDING, left };
      arrowLeft = cx - left;
      arrowSide = 'top';
      break;
    }
    case 'top': {
      const left = clampLeft(cx - TOOLTIP_WIDTH / 2);
      tooltipStyle = { ...tooltipStyle, bottom: window.innerHeight - rect.top + GAP + PADDING, left };
      arrowLeft = cx - left;
      arrowSide = 'bottom';
      break;
    }
    case 'right': {
      const top = Math.max(12, cy - 64);
      tooltipStyle = { ...tooltipStyle, top, left: rect.right + GAP + PADDING };
      arrowTop = cy - top;
      arrowSide = 'left';
      break;
    }
    case 'left': {
      const top = Math.max(12, cy - 64);
      tooltipStyle = { ...tooltipStyle, top, left: rect.left - TOOLTIP_WIDTH - GAP - PADDING };
      arrowTop = cy - top;
      arrowSide = 'right';
      break;
    }
  }

  const isLast = currentStep === totalSteps;

  return (
    <>
      {/* ── Scrim with rectangular cutout ──────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0"
        style={{
          zIndex: 998,
          pointerEvents: 'auto',
        }}
        onClick={onSkip}
      >
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <mask id="coach-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={spotLeft} y={spotTop}
                width={spotW} height={spotH}
                rx={r} ry={r}
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%" height="100%"
            fill="rgba(0,0,0,0.6)"
            mask="url(#coach-mask)"
          />
        </svg>
      </motion.div>

      {/* ── Highlight ring around target ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          left: spotLeft,
          top: spotTop,
          width: spotW,
          height: spotH,
          borderRadius: r,
          boxShadow: '0 0 0 4px var(--accent-teal, #3BB4C1), 0 0 0 8px rgba(59,180,193,0.25)',
          zIndex: 999,
          pointerEvents: 'none',
        }}
      />

      {/* ── Tooltip bubble ────────────────────────────────────────────── */}
      <AnimatePresence>
        {visible && (
          <motion.div
            key={`tooltip-${currentStep}`}
            initial={{ opacity: 0, y: position === 'top' ? -8 : position === 'bottom' ? 8 : 0, x: position === 'left' ? -8 : position === 'right' ? 8 : 0 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              ...tooltipStyle,
              zIndex: 1000,
              background: 'var(--surface-elevated, #1E293B)',
              border: '1px solid var(--border-default, rgba(255,255,255,0.08))',
              borderRadius: 24,
              padding: '16px 18px',
              maxWidth: TOOLTIP_WIDTH,
              boxShadow: 'var(--shadow-lg, 0 20px 60px rgba(0,0,0,0.4))',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Arrow */}
            <TooltipArrow side={arrowSide} offsetX={arrowLeft} offsetY={arrowTop} />

            {/* Step counter */}
            <p style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', marginBottom: 6,
              color: 'var(--text-tertiary, #64748B)',
            }}>
              {currentStep} / {totalSteps}
            </p>

            {/* Title */}
            <p style={{
              fontSize: 15, fontWeight: 600, marginBottom: 4,
              color: 'var(--text-primary, #FFFFFF)',
              lineHeight: 1.3,
            }}>
              {title}
            </p>

            {/* Description */}
            <p style={{
              fontSize: 13, lineHeight: 1.55, marginBottom: 14,
              color: 'var(--text-secondary, #94A3B8)',
            }}>
              {description}
            </p>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={onSkip}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, padding: '8px 12px',
                  color: 'var(--text-tertiary, #64748B)',
                  fontFamily: 'inherit',
                  transition: 'opacity .15s',
                }}
              >
                {skipLabel}
              </button>
              <button
                onClick={onNext}
                style={{
                  background: 'var(--text-primary, #FFFFFF)',
                  color: 'var(--text-inverse, #0F172A)',
                  border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600,
                  padding: '8px 16px',
                  borderRadius: 9999,
                  fontFamily: 'inherit',
                  transition: 'opacity .15s',
                }}
              >
                {isLast ? doneLabel : nextLabel}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Tooltip arrow ──────────────────────────────────────────────────────────

function TooltipArrow({ side, offsetX, offsetY }: { side: 'top' | 'bottom' | 'left' | 'right'; offsetX: number; offsetY: number }) {
  const size = ARROW_SIZE;
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));

  const base: React.CSSProperties = {
    position: 'absolute',
    width: 0, height: 0,
    borderStyle: 'solid',
  };

  const bg = 'var(--surface-elevated, #1E293B)';

  switch (side) {
    case 'top': {
      const left = clamp(offsetX, 20, TOOLTIP_WIDTH - 20);
      return (
        <div style={{
          ...base,
          top: -size, left: left - size,
          borderWidth: `0 ${size}px ${size}px ${size}px`,
          borderColor: `transparent transparent ${bg} transparent`,
        }} />
      );
    }
    case 'bottom': {
      const left = clamp(offsetX, 20, TOOLTIP_WIDTH - 20);
      return (
        <div style={{
          ...base,
          bottom: -size, left: left - size,
          borderWidth: `${size}px ${size}px 0 ${size}px`,
          borderColor: `${bg} transparent transparent transparent`,
        }} />
      );
    }
    case 'left': {
      const top = clamp(offsetY, 20, 200);
      return (
        <div style={{
          ...base,
          left: -size, top: top - size,
          borderWidth: `${size}px ${size}px ${size}px 0`,
          borderColor: `transparent ${bg} transparent transparent`,
        }} />
      );
    }
    case 'right': {
      const top = clamp(offsetY, 20, 200);
      return (
        <div style={{
          ...base,
          right: -size, top: top - size,
          borderWidth: `${size}px 0 ${size}px ${size}px`,
          borderColor: `transparent transparent transparent ${bg}`,
        }} />
      );
    }
  }
}
