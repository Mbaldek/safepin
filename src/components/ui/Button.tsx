'use client';

import { forwardRef } from 'react';
import { motion } from 'framer-motion';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

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

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-white text-slate-900',
  secondary: 'bg-transparent text-white border border-white/12',
  ghost: 'bg-transparent text-white/60',
  danger: 'bg-red-500 text-white',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-2.5 text-sm',
  md: 'px-6 py-4 text-base',
  lg: 'px-8 py-5 text-lg',
};

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
    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={isDisabled}
        whileHover={!isDisabled ? { y: -1 } : {}}
        whileTap={!isDisabled ? { scale: 0.98 } : {}}
        transition={spring}
        className={`inline-flex items-center justify-center gap-3 font-semibold rounded-[32px] transition-all ${sizeStyles[size]} ${variantStyles[variant]} ${fullWidth ? 'w-full' : ''} ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
        aria-label={rest['aria-label']}
        id={rest.id}
        name={rest.name}
        style={rest.style}
        data-tour={rest['data-tour']}
      >
        {loading ? <Spinner /> : <>{icon}{children}</>}
      </motion.button>
    );
  },
);

Button.displayName = 'Button';
