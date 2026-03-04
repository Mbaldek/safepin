// src/components/ui/BreveilLogo.tsx

interface BreveilLogoProps {
  size?: number;
  color?: string;
  className?: string;
}

export function BreveilLogo({ size = 40, color, className }: BreveilLogoProps) {
  const gold = color ?? '#3BB4C1';
  const purple = '#8B7EC8';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer arcs - Gold */}
      <path
        d="M20 40C20 28.954 28.954 20 40 20"
        stroke={gold}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M60 40C60 51.046 51.046 60 40 60"
        stroke={gold}
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Middle arcs - Aurora Purple */}
      <path
        d="M26 40C26 32.268 32.268 26 40 26"
        stroke={purple}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M54 40C54 47.732 47.732 54 40 54"
        stroke={purple}
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Inner arcs - Gold */}
      <path
        d="M32 40C32 35.582 35.582 32 40 32"
        stroke={gold}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M48 40C48 44.418 44.418 48 40 48"
        stroke={gold}
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Center dot */}
      <circle cx="40" cy="40" r="4" fill={gold} />
    </svg>
  );
}

// Preset sizes
export function BreveilLogoSmall(props: Omit<BreveilLogoProps, 'size'>) {
  return <BreveilLogo size={24} {...props} />;
}

export function BreveilLogoMedium(props: Omit<BreveilLogoProps, 'size'>) {
  return <BreveilLogo size={40} {...props} />;
}

export function BreveilLogoLarge(props: Omit<BreveilLogoProps, 'size'>) {
  return <BreveilLogo size={64} {...props} />;
}

export function BreveilLogoXL(props: Omit<BreveilLogoProps, 'size'>) {
  return <BreveilLogo size={80} {...props} />;
}
