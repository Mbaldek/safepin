'use client';

import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth, loading, disabled, children, className = '', ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-semibold rounded-[var(--radius-2xl)]
      transition-all duration-[var(--duration-fast)]
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

    const variants = {
      primary: `
        bg-white text-[var(--surface-base)]
        hover:translate-y-[-1px] hover:shadow-[var(--shadow-md)]
        active:translate-y-0
      `,
      secondary: `
        bg-transparent text-[var(--text-primary)]
        border border-[var(--border-default)]
        hover:bg-[var(--interactive-hover)] hover:border-[var(--border-strong)]
      `,
      ghost: `
        bg-transparent text-[var(--text-secondary)]
        hover:text-[var(--text-primary)] hover:bg-[var(--interactive-hover)]
      `,
      danger: `
        bg-[var(--semantic-danger)] text-white
        hover:opacity-90
      `,
    };

    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-4 text-base',
      lg: 'px-8 py-5 text-lg',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          ${baseStyles}
          ${variants[variant]}
          ${sizes[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `.replace(/\s+/g, ' ').trim()}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
