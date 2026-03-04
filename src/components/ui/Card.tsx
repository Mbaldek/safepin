'use client';

import { forwardRef } from 'react';

type CardVariant = 'default' | 'elevated' | 'glass' | 'selection';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  selected?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<CardVariant, (selected: boolean) => string> = {
  default: () => 'bg-[#1E293B] border border-white/12',
  elevated: () => 'bg-[#334155] shadow-lg',
  glass: () => 'bg-white/[0.08] backdrop-blur-xl border border-white/8',
  selection: (selected) =>
    `border ${selected ? 'bg-white/10 border-[#3BB4C1]' : 'border-white/12 hover:bg-white/5'}`,
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', selected = false, children, className = '', onClick, ...props }, ref) => {
    return (
      <div
        ref={ref}
        onClick={onClick}
        className={`rounded-2xl transition-all ${variantStyles[variant](selected)} ${onClick ? 'cursor-pointer' : ''} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';
