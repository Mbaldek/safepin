'use client';

import { useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { useTheme } from '@/stores/useTheme';
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
    iconBgD: 'rgba(52,211,153,0.15)',  iconBgL: 'rgba(52,211,153,0.12)',
    iconColor: '#34D399',
    bgD: 'rgba(14,30,22,0.94)',        bgL: 'rgba(236,253,245,0.97)',
    border: 'rgba(52,211,153,0.22)',
    progress: '#34D399',
    ctaColor: '#34D399', ctaBg: 'rgba(52,211,153,0.1)',
    duration: 4000,
  },
  danger: {
    icon: '✕',
    iconBgD: 'rgba(239,68,68,0.15)',   iconBgL: 'rgba(239,68,68,0.1)',
    iconColor: '#F87171',
    bgD: 'rgba(30,12,12,0.94)',        bgL: 'rgba(254,242,242,0.97)',
    border: 'rgba(239,68,68,0.25)',
    progress: '#EF4444',
    ctaColor: '#F87171', ctaBg: 'rgba(239,68,68,0.1)',
    duration: 6000,
  },
  warning: {
    icon: '⚠',
    iconBgD: 'rgba(251,191,36,0.15)',  iconBgL: 'rgba(251,191,36,0.12)',
    iconColor: '#FBBF24',
    bgD: 'rgba(30,24,8,0.94)',         bgL: 'rgba(255,251,235,0.97)',
    border: 'rgba(251,191,36,0.22)',
    progress: '#FBBF24',
    ctaColor: '#FBBF24', ctaBg: 'rgba(251,191,36,0.1)',
    duration: 5000,
  },
  info: {
    icon: '◈',
    iconBgD: 'rgba(59,180,193,0.13)',  iconBgL: 'rgba(59,180,193,0.1)',
    iconColor: '#3BB4C1',
    bgD: 'rgba(10,22,35,0.94)',        bgL: 'rgba(236,254,255,0.97)',
    border: 'rgba(59,180,193,0.22)',
    progress: '#3BB4C1',
    ctaColor: '#3BB4C1', ctaBg: 'rgba(59,180,193,0.1)',
    duration: 4000,
  },
  sos: {
    icon: '🔴',
    iconBgD: 'rgba(239,68,68,0.2)',    iconBgL: 'rgba(239,68,68,0.15)',
    iconColor: '#FF6B6B',
    bgD: 'rgba(35,8,8,0.97)',          bgL: 'rgba(255,232,232,0.99)',
    border: 'rgba(239,68,68,0.38)',
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
  const bg        = isDark ? cfg.bgD        : cfg.bgL;
  const iconBg    = isDark ? cfg.iconBgD    : cfg.iconBgL;
  const textPri   = isDark ? '#FFFFFF'      : '#0F172A';
  const textSec   = isDark ? '#94A3B8'      : '#475569';
  const dismissBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)';
  const dismissCl = isDark ? '#64748B'      : '#94A3B8';
  const shadow    = variant === 'sos'
    ? '0 8px 28px rgba(239,68,68,0.25)'
    : isDark ? '0 8px 28px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.1)';
  const dur = options.duration !== undefined ? options.duration : cfg.duration;

  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '11px',
        padding: '13px 12px 13px 13px',
        borderRadius: '18px',
        backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
        background: bg,
        border: `1px solid ${cfg.border}`,
        boxShadow: shadow,
        width: '100%', cursor: 'pointer',
        position: 'relative', overflow: 'hidden',
      }}
      onClick={() => { options.onCta?.(); toast.dismiss(toastId); }}
    >
      {/* Icon */}
      <div style={{
        width: '32px', height: '32px', borderRadius: '9px',
        background: iconBg, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '15px',
        color: cfg.iconColor, flexShrink: 0,
        animation: variant === 'sos' ? 'bv-sos 1s ease-in-out infinite' : undefined,
      }}>
        {cfg.icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '12.5px', fontWeight: 600, lineHeight: 1.3, marginBottom: '2px',
          color: variant === 'sos' ? '#FF6B6B' : textPri,
        }}>
          {options.title}
        </div>
        {options.desc && (
          <div style={{ fontSize: '11px', color: textSec, lineHeight: 1.4 }}>
            {options.desc}
          </div>
        )}
        {options.cta && (
          <div style={{
            fontSize: '10.5px', fontWeight: 700, marginTop: '6px',
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '3px 8px', borderRadius: '6px',
            color: cfg.ctaColor, background: cfg.ctaBg,
          }}>
            {options.cta}
          </div>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={(e) => { e.stopPropagation(); toast.dismiss(toastId); }}
        style={{
          width: '20px', height: '20px', borderRadius: '50%',
          background: dismissBg, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '9px', color: dismissCl, flexShrink: 0, marginTop: '2px',
        }}
      >
        ✕
      </button>

      {/* Progress bar */}
      {cfg.progress && dur && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0,
          height: '2px', borderRadius: '0 0 18px 18px',
          background: cfg.progress,
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
  const isDark = useTheme((s) => s.theme) === 'dark';
  const toastQueue  = useNotificationStore((s) => s.toastQueue);
  const dismissToast = useNotificationStore((s) => s.dismissToast);

  // Consomme le notificationStore.toastQueue existant
  useEffect(() => {
    if (toastQueue.length === 0) return;
    const item = toastQueue[0];

    // item.variant est 'info' | 'success' | 'warning' — pas de 'error'/'sos' dans le store legacy
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
        [data-sonner-toast] {
          animation: bv-in 0.42s cubic-bezier(0.16,1,0.3,1) both !important;
        }
        [data-sonner-toast][data-removed="true"] {
          animation: bv-out 0.26s cubic-bezier(0.4,0,1,1) forwards !important;
        }
        @keyframes bv-in {
          from { opacity:0; transform:translateY(-16px) scale(0.95); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes bv-out {
          from { opacity:1; transform:translateX(0); }
          to   { opacity:0; transform:translateX(110%); }
        }
      `}</style>
      <Toaster
        position="top-center"
        visibleToasts={3}
        gap={8}
        toastOptions={{
          unstyled: true,
          style: {
            width: '100%',
            maxWidth: '340px',
            fontFamily: 'Inter, -apple-system, sans-serif',
          },
        }}
      />
    </>
  );
}
