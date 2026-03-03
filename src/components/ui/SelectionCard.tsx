'use client';

import { Check } from 'lucide-react';

interface SelectionCardProps {
  icon?: React.ReactNode;
  emoji?: string;
  label: string;
  description?: string;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export function SelectionCard({
  icon,
  emoji,
  label,
  description,
  selected = false,
  onClick,
  disabled = false,
}: SelectionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full flex items-center gap-4 px-5 py-4
        rounded-[var(--radius-lg)]
        border transition-all duration-[var(--duration-fast)]
        text-left
        disabled:opacity-50 disabled:cursor-not-allowed
        ${selected
          ? 'bg-[var(--interactive-active)] border-[var(--gradient-start)]'
          : 'bg-transparent border-[var(--border-default)] hover:bg-[var(--interactive-hover)]'
        }
      `.replace(/\s+/g, ' ').trim()}
    >
      {emoji && (
        <span className="text-2xl flex-shrink-0">{emoji}</span>
      )}
      {icon && (
        <span className={`flex-shrink-0 ${selected ? 'text-[var(--gradient-start)]' : 'text-[var(--text-secondary)]'}`}>
          {icon}
        </span>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-base font-medium text-[var(--text-primary)]">{label}</p>
        {description && (
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">{description}</p>
        )}
      </div>

      {selected && (
        <Check size={20} className="text-[var(--gradient-start)] flex-shrink-0" />
      )}
    </button>
  );
}
