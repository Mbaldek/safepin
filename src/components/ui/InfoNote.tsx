'use client';

type InfoNoteVariant = 'info' | 'gold' | 'success';

interface InfoNoteProps {
  variant?: InfoNoteVariant;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const variantStyles: Record<InfoNoteVariant, string> = {
  info: 'bg-[#60A5FA]/10 border-[#60A5FA]/30 text-[#60A5FA]',
  gold: 'bg-[#F5C341]/10 border-[#F5C341]/30 text-[#F5C341]',
  success: 'bg-[#34D399]/10 border-[#34D399]/30 text-[#34D399]',
};

export function InfoNote({ children, variant = 'gold', icon }: InfoNoteProps) {
  return (
    <div className={`p-4 rounded-xl border ${variantStyles[variant]}`}>
      <p className="text-sm leading-relaxed flex items-start gap-2">
        {icon}
        {children}
      </p>
    </div>
  );
}
