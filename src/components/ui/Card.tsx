'use client';

import { forwardRef } from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', children, className = '', ...props }, ref) => {
    const variants = {
      default: 'bg-[var(--surface-card)] border border-[var(--border-subtle)]',
      elevated: 'bg-[var(--surface-elevated)] shadow-[var(--shadow-md)]',
      glass: 'bg-[var(--surface-glass)] backdrop-blur-[20px] border border-[var(--border-subtle)]',
    };

    const paddings = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    };

    return (
      <div
        ref={ref}
        className={`
          rounded-[var(--radius-lg)]
          ${variants[variant]}
          ${paddings[padding]}
          ${className}
        `.replace(/\s+/g, ' ').trim()}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
