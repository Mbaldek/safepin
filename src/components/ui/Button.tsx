'use client';

import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/stores/useTheme';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

function getColors(isDark: boolean) {
  return isDark ? {
    textPrimary: '#FFFFFF',
    borderMid: 'rgba(255,255,255,0.12)',
  } : {
    textPrimary: '#0F172A',
    borderMid: 'rgba(15,23,42,0.10)',
  };
}

const FIXED = {
  accentCyan: '#3BB4C1',
  semanticDanger: '#EF4444',
  semanticDangerSoft: 'rgba(239,68,68,0.12)',
};

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  'aria-label'?: string;
  id?: string;
  name?: string;
  style?: React.CSSProperties;
  'data-tour'?: string;
}

function Spinner() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

const sizeMap: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '10px 16px', fontSize: 14 },
  md: { padding: '16px 24px', fontSize: 16 },
  lg: { padding: '20px 32px', fontSize: 18 },
};

function getVariantStyle(variant: ButtonVariant, C: ReturnType<typeof getColors>): React.CSSProperties {
  switch (variant) {
    case 'primary':
      return { background: FIXED.accentCyan, color: '#fff' };
    case 'secondary':
    case 'ghost':
      return { background: 'transparent', color: C.textPrimary, border: `1px solid ${C.borderMid}` };
    case 'danger':
      return { background: FIXED.semanticDangerSoft, color: FIXED.semanticDanger, border: '1px solid rgba(239,68,68,0.2)' };
  }
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      fullWidth = true,
      disabled = false,
      loading = false,
      icon,
      className = '',
      type = 'button',
      onClick,
      ...rest
    },
    ref,
  ) => {
    const isDark = useTheme((s) => s.theme) === 'dark';
    const C = getColors(isDark);
    const isDisabled = disabled || loading;

    const variantStyle = getVariantStyle(variant, C);

    return (
      <motion.button
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={isDisabled}
        whileHover={!isDisabled ? { y: -1 } : {}}
        whileTap={!isDisabled ? { scale: 0.98 } : {}}
        transition={spring}
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          fontWeight: 600,
          borderRadius: 32,
          transition: 'all 150ms',
          width: fullWidth ? '100%' : undefined,
          opacity: isDisabled ? 0.4 : 1,
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          border: 'none',
          ...sizeMap[size],
          ...variantStyle,
          ...rest.style,
        }}
        aria-label={rest['aria-label']}
        id={rest.id}
        name={rest.name}
        data-tour={rest['data-tour']}
      >
        {loading ? <Spinner /> : <>{icon}{children}</>}
      </motion.button>
    );
  },
);

Button.displayName = 'Button';
