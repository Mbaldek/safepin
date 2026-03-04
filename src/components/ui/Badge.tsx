'use client';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'gold' | 'cyan';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-white/10 text-white',
  success: 'bg-[#34D399]/15 text-[#34D399]',
  warning: 'bg-[#FBBF24]/15 text-[#FBBF24]',
  danger: 'bg-[#EF4444]/15 text-[#EF4444]',
  gold: 'bg-[#F5C341]/15 text-[#F5C341]',
  cyan: 'bg-[#22D3EE]/15 text-[#22D3EE]',
};

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${variantStyles[variant]}`}>
      {children}
    </span>
  );
}
