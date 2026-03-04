'use client';

interface StreakBadgeProps {
  days: number;
  label?: string;
}

export function StreakBadge({ days, label = 'jours' }: StreakBadgeProps) {
  const r = 56;
  const c = r * 2 * Math.PI;
  const o = c - ((days % 7) / 7) * c;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: 120, height: 120 }}>
      <svg width={120} height={120} className="transform -rotate-90">
        <circle cx={60} cy={60} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={4} />
        <circle
          cx={60}
          cy={60}
          r={r}
          fill="none"
          stroke="#22D3EE"
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={o}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-light text-white">{days}</span>
        <span className="text-sm font-medium text-slate-400 mt-1">{label}</span>
      </div>
    </div>
  );
}
