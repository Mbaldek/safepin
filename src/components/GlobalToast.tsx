'use client';

import { useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { useIsDark } from '@/hooks/useIsDark';
import { useNotificationStore } from '@/stores/notificationStore';

/* ─── Types ─────────────────────────────────── */
export type ToastVariant = 'success' | 'danger' | 'warning' | 'info' | 'sos';

export interface BreveilToastOptions {
  title: string;
  desc?: string;
  cta?: string;
  onCta?: () => void;
  duration?: number;
}

/* ─── Config par variant ─────────────────────── */
const VCFG = {
  success: {
    icon: '✓',
    iconColor: '#34D399',
    bgD: 'rgba(14,30,22,0.88)',        bgL: 'rgba(236,253,245,0.95)',
    border: 'rgba(52,211,153,0.25)',
    glowD: '0 0 20px rgba(52,211,153,0.12)',
    glowL: '0 0 16px rgba(52,211,153,0.08)',
    progress: '#34D399',
    ctaColor: '#34D399', ctaBg: 'rgba(52,211,153,0.1)',
    duration: 3000,
  },
  danger: {
    icon: '✕',
    iconColor: '#F87171',
    bgD: 'rgba(30,12,12,0.88)',        bgL: 'rgba(254,242,242,0.95)',
    border: 'rgba(239,68,68,0.25)',
    glowD: '0 0 20px rgba(239,68,68,0.12)',
    glowL: '0 0 16px rgba(239,68,68,0.08)',
    progress: '#EF4444',
    ctaColor: '#F87171', ctaBg: 'rgba(239,68,68,0.1)',
    duration: 5000,
  },
  warning: {
    icon: '⚠',
    iconColor: '#FBBF24',
    bgD: 'rgba(30,24,8,0.88)',         bgL: 'rgba(255,251,235,0.95)',
    border: 'rgba(251,191,36,0.25)',
    glowD: '0 0 20px rgba(251,191,36,0.12)',
    glowL: '0 0 16px rgba(251,191,36,0.08)',
    progress: '#FBBF24',
    ctaColor: '#FBBF24', ctaBg: 'rgba(251,191,36,0.1)',
    duration: 4000,
  },
  info: {
    icon: '◈',
    iconColor: '#3BB4C1',
    bgD: 'rgba(10,22,35,0.88)',        bgL: 'rgba(236,254,255,0.95)',
    border: 'rgba(59,180,193,0.25)',
    glowD: '0 0 20px rgba(59,180,193,0.12)',
    glowL: '0 0 16px rgba(59,180,193,0.08)',
    progress: '#3BB4C1',
    ctaColor: '#3BB4C1', ctaBg: 'rgba(59,180,193,0.1)',
    duration: 3000,
  },
  sos: {
    icon: '🔴',
    iconColor: '#FF6B6B',
    bgD: 'rgba(35,8,8,0.92)',          bgL: 'rgba(255,232,232,0.97)',
    border: 'rgba(239,68,68,0.35)',
    glowD: '0 0 24px rgba(239,68,68,0.2)',
    glowL: '0 0 20px rgba(239,68,68,0.15)',
    progress: null,
    ctaColor: '#FF6B6B', ctaBg: 'rgba(239,68,68,0.12)',
    duration: undefined,
  },
} as const;

/* ─── Renderer JSX du toast ──────────────────── */
function ToastContent({
  toastId,
  variant,
  options,
  isDark,
}: {
  toastId: string | number;
  variant: ToastVariant;
  options: BreveilToastOptions;
  isDark: boolean;
}) {
  const cfg = VCFG[variant];
  const isExpanded = !!(options.desc || options.cta);
  const bg     = isDark ? cfg.bgD   : cfg.bgL;
  const glow   = isDark ? cfg.glowD : cfg.glowL;
  const textPri = isDark ? '#F1F5F9' : '#0F172A';
  const textSec = isDark ? '#94A3B8' : '#64748B';
  const dur = options.duration !== undefined ? options.duration : cfg.duration;

  const shadow = variant === 'sos'
    ? `0 4px 16px rgba(239,68,68,0.2), ${glow}`
    : `0 4px 16px rgba(0,0,0,${isDark ? '0.3' : '0.08'}), ${glow}`;

  /* ── Pill mode (title only) ── */
  if (!isExpanded) {
    return (
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 14px 8px 10px',
          borderRadius: '999px',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          background: bg,
          border: `1px solid ${cfg.border}`,
          boxShadow: shadow,
          cursor: 'pointer',
          position: 'relative', overflow: 'hidden',
          maxWidth: '280px', margin: '0 auto',
        }}
        onClick={() => { options.onCta?.(); toast.dismiss(toastId); }}
      >
        {/* Icon badge */}
        <span style={{
          width: '20px', height: '20px', borderRadius: '50%',
          background: `${cfg.iconColor}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 700, color: cfg.iconColor, flexShrink: 0,
          animation: variant === 'sos' ? 'bv-sos 1s ease-in-out infinite' : undefined,
        }}>
          {cfg.icon}
        </span>

        {/* Text */}
        <span style={{
          fontSize: '13px', fontWeight: 600, lineHeight: 1,
          color: variant === 'sos' ? '#FF6B6B' : textPri,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {options.title}
        </span>

        {/* Progress bar */}
        {cfg.progress && dur && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0,
            height: '1.5px', borderRadius: '0 0 999px 999px',
            background: cfg.progress, opacity: 0.6,
            animation: `bv-progress ${dur}ms linear forwards`,
          }} />
        )}
      </div>
    );
  }

  /* ── Card mode (desc / cta) ── */
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '10px',
        padding: '10px 12px',
        borderRadius: '14px',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        background: bg,
        border: `1px solid ${cfg.border}`,
        boxShadow: shadow,
        cursor: 'pointer',
        position: 'relative', overflow: 'hidden',
        maxWidth: '300px', margin: '0 auto',
      }}
      onClick={() => { options.onCta?.(); toast.dismiss(toastId); }}
    >
      {/* Icon badge */}
      <span style={{
        width: '24px', height: '24px', borderRadius: '7px',
        background: `${cfg.iconColor}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', fontWeight: 700, color: cfg.iconColor, flexShrink: 0,
        marginTop: '1px',
        animation: variant === 'sos' ? 'bv-sos 1s ease-in-out infinite' : undefined,
      }}>
        {cfg.icon}
      </span>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '12.5px', fontWeight: 600, lineHeight: 1.3,
          color: variant === 'sos' ? '#FF6B6B' : textPri,
        }}>
          {options.title}
        </div>
        {options.desc && (
          <div style={{ fontSize: '11px', color: textSec, lineHeight: 1.35, marginTop: '2px' }}>
            {options.desc}
          </div>
        )}
        {options.cta && (
          <div style={{
            fontSize: '10.5px', fontWeight: 700, marginTop: '5px',
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '3px 8px', borderRadius: '6px',
            color: cfg.ctaColor, background: cfg.ctaBg,
          }}>
            {options.cta}
          </div>
        )}
      </div>

      {/* Progress bar */}
      {cfg.progress && dur && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0,
          height: '1.5px', borderRadius: '0 0 14px 14px',
          background: cfg.progress, opacity: 0.6,
          animation: `bv-progress ${dur}ms linear forwards`,
        }} />
      )}
    </div>
  );
}

/* ─── Fonction publique ──────────────────────── */
export function showBreveilToast(
  variant: ToastVariant,
  options: BreveilToastOptions,
  isDark: boolean
) {
  const cfg = VCFG[variant];
  const dur = options.duration !== undefined ? options.duration : cfg.duration;

  toast.custom(
    (id) => (
      <ToastContent
        toastId={id}
        variant={variant}
        options={options}
        isDark={isDark}
      />
    ),
    {
      duration: dur ?? Infinity,
      unstyled: true,
      style: { padding: 0, background: 'transparent', border: 'none', width: '100%' },
    }
  );
}

/* ─── Helpers typés — usage simplifié ───────── */
export const bToast = {
  success: (opts: BreveilToastOptions, isDark: boolean) => showBreveilToast('success', opts, isDark),
  danger:  (opts: BreveilToastOptions, isDark: boolean) => showBreveilToast('danger',  opts, isDark),
  warning: (opts: BreveilToastOptions, isDark: boolean) => showBreveilToast('warning', opts, isDark),
  info:    (opts: BreveilToastOptions, isDark: boolean) => showBreveilToast('info',    opts, isDark),
  sos:     (opts: BreveilToastOptions, isDark: boolean) => showBreveilToast('sos',     opts, isDark),
};

/* ─── Composant principal ────────────────────── */
export default function GlobalToast() {
  const isDark = useIsDark();
  const toastQueue  = useNotificationStore((s) => s.toastQueue);
  const dismissToast = useNotificationStore((s) => s.dismissToast);

  // Consomme le notificationStore.toastQueue existant
  useEffect(() => {
    if (toastQueue.length === 0) return;
    const item = toastQueue[0];

    const variantMap: Record<string, ToastVariant> = {
      success: 'success',
      warning: 'warning',
      info: 'info',
    };
    const variant: ToastVariant = variantMap[item.variant] ?? 'info';

    showBreveilToast(
      variant,
      {
        title: item.message,
        desc: item.subMessage,
      },
      isDark
    );

    dismissToast(item.id);
  }, [toastQueue, isDark, dismissToast]);

  return (
    <>
      <style>{`
        @keyframes bv-progress { from { width:100%; } to { width:0%; } }
        @keyframes bv-sos {
          0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.45); }
          50%      { box-shadow: 0 0 0 5px rgba(239,68,68,0); }
        }
        [data-sonner-toaster] {
          left: 50% !important;
          transform: translateX(-50%) !important;
          --width: auto !important;
        }
        [data-sonner-toast] {
          animation: bv-in 0.32s cubic-bezier(0.16,1,0.3,1) both !important;
        }
        [data-sonner-toast][data-removed="true"] {
          animation: bv-out 0.2s cubic-bezier(0.4,0,1,1) forwards !important;
        }
        @keyframes bv-in {
          from { opacity:0; transform:translateY(-12px) scale(0.92); filter:blur(4px); }
          to   { opacity:1; transform:translateY(0) scale(1); filter:blur(0); }
        }
        @keyframes bv-out {
          from { opacity:1; transform:translateY(0) scale(1); }
          to   { opacity:0; transform:translateY(-8px) scale(0.95); }
        }
      `}</style>
      <Toaster
        position="top-center"
        visibleToasts={3}
        gap={6}
        style={{ left: '50%', transform: 'translateX(-50%)' }}
        toastOptions={{
          unstyled: true,
          style: {
            width: 'auto',
            fontFamily: 'Inter, -apple-system, sans-serif',
            display: 'flex',
            justifyContent: 'center',
          },
        }}
      />
    </>
  );
}
