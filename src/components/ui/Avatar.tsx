'use client';

import { cn } from '@/lib/utils';

interface AvatarProps {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export function Avatar({ className, style, children }: AvatarProps) {
  return (
    <div className={cn('relative flex shrink-0 overflow-hidden rounded-full', className)} style={style}>
      {children}
    </div>
  );
}

interface AvatarFallbackProps {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export function AvatarFallback({ className, style, children }: AvatarFallbackProps) {
  return (
    <div className={cn('flex h-full w-full items-center justify-center rounded-full', className)} style={style}>
      {children}
    </div>
  );
}
