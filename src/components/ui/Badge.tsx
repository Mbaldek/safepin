'use client';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

export function Badge({ variant = 'default', size = 'md', children }: BadgeProps) {
  const variants = {
    default: 'bg-[var(--interactive-active)] text-[var(--text-primary)]',
    success: 'bg-[var(--semantic-success-soft)] text-[var(--semantic-success)]',
    warning: 'bg-[var(--semantic-warning-soft)] text-[var(--semantic-warning)]',
    danger: 'bg-[var(--semantic-danger-soft)] text-[var(--semantic-danger)]',
    info: 'bg-[var(--semantic-info-soft)] text-[var(--semantic-info)]',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1
        font-medium rounded-full
        ${variants[variant]}
        ${sizes[size]}
      `.replace(/\s+/g, ' ').trim()}
    >
      {children}
    </span>
  );
}
