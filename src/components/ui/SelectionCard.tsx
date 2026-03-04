'use client';

import { Check } from 'lucide-react';
import { Card } from './Card';

interface SelectionCardProps {
  icon?: React.ReactNode;
  label: string;
  selected?: boolean;
  onChange?: (selected: boolean) => void;
  className?: string;
}

export function SelectionCard({
  icon,
  label,
  selected = false,
  onChange,
  className = '',
}: SelectionCardProps) {
  return (
    <Card
      variant="selection"
      selected={selected}
      onClick={() => onChange?.(!selected)}
      className={`p-4 ${className}`}
    >
      <div className="flex items-center gap-4">
        {icon && (
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              selected ? 'bg-[#3BB4C1]/20 text-[#3BB4C1]' : 'bg-white/5 text-slate-400'
            }`}
          >
            {icon}
          </div>
        )}
        <p className="flex-1 text-white font-medium">{label}</p>
        {selected && (
          <div className="w-6 h-6 rounded-full bg-[#3BB4C1] flex items-center justify-center">
            <Check size={14} color="white" strokeWidth={3} />
          </div>
        )}
      </div>
    </Card>
  );
}
