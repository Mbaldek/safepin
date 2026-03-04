// src/components/BrandAssets.tsx — Breveil brand SVG components

'use client';

/** Layered protective arcs — map watermark, onboarding, community badges */
export const VeilSymbol = ({
  size = 40,
  variant = 'dark',
}: {
  size?: number;
  variant?: 'dark' | 'light';
}) => {
  const isDark = variant === 'dark';
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      {/* Outer arcs — community awareness */}
      <path
        d="M40 12 C18 12, 8 35, 8 50 C8 56, 11 61, 15 64"
        stroke={isDark ? 'rgba(59,180,193,0.25)' : 'rgba(27,37,65,0.12)'}
        strokeWidth="1.2" fill="none" strokeLinecap="round"
      />
      <path
        d="M40 12 C62 12, 72 35, 72 50 C72 56, 69 61, 65 64"
        stroke={isDark ? 'rgba(59,180,193,0.25)' : 'rgba(27,37,65,0.12)'}
        strokeWidth="1.2" fill="none" strokeLinecap="round"
      />
      {/* Middle arcs — trusted circle */}
      <path
        d="M40 22 C24 22, 18 40, 18 52 C18 57, 21 62, 26 64"
        stroke={isDark ? 'rgba(139,126,200,0.5)' : 'rgba(139,126,200,0.45)'}
        strokeWidth="1.2" fill="none" strokeLinecap="round"
      />
      <path
        d="M40 22 C56 22, 62 40, 62 52 C62 57, 59 62, 54 64"
        stroke={isDark ? 'rgba(139,126,200,0.5)' : 'rgba(139,126,200,0.45)'}
        strokeWidth="1.2" fill="none" strokeLinecap="round"
      />
      {/* Inner arcs — personal protection */}
      <path
        d="M40 32 C30 32, 28 44, 28 54 C28 58, 31 62, 35 64"
        stroke={isDark ? 'rgba(59,180,193,0.8)' : 'rgba(27,37,65,0.6)'}
        strokeWidth="1.5" fill="none" strokeLinecap="round"
      />
      <path
        d="M40 32 C50 32, 52 44, 52 54 C52 58, 49 62, 45 64"
        stroke={isDark ? 'rgba(59,180,193,0.8)' : 'rgba(27,37,65,0.6)'}
        strokeWidth="1.5" fill="none" strokeLinecap="round"
      />
      {/* Central point of light */}
      <circle cx="40" cy="38" r="3" fill={isDark ? 'rgba(59,180,193,0.9)' : 'rgba(27,37,65,0.7)'} />
      <circle cx="40" cy="38" r="6" fill="none"
        stroke={isDark ? 'rgba(59,180,193,0.25)' : 'rgba(27,37,65,0.15)'}
        strokeWidth="0.8"
      />
      {/* Base dot — the individual, grounded */}
      <circle cx="40" cy="68" r="1.5"
        fill={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(27,37,65,0.2)'}
      />
    </svg>
  );
};

/** "B" in Cormorant Garamond + veil arc accents — app icon, favicon, badges */
export const BreveilMonogram = ({
  size = 40,
  variant = 'dark',
}: {
  size?: number;
  variant?: 'dark' | 'light';
}) => {
  const isDark = variant === 'dark';
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <text
        x="40" y="56" textAnchor="middle"
        fontFamily="'Cormorant Garamond', serif"
        fontWeight="400" fontSize="48"
        fill={isDark ? 'white' : 'var(--surface-base)'}
      >
        B
      </text>
      <path
        d="M52 24 C62 28, 68 36, 62 42"
        stroke={isDark ? 'rgba(59,180,193,0.6)' : 'rgba(59,180,193,0.7)'}
        strokeWidth="1.2" fill="none" strokeLinecap="round"
      />
      <path
        d="M52 42 C65 46, 70 56, 60 62"
        stroke={isDark ? 'rgba(59,180,193,0.6)' : 'rgba(59,180,193,0.7)'}
        strokeWidth="1.2" fill="none" strokeLinecap="round"
      />
      <path
        d="M55 20 C70 26, 76 38, 66 46"
        stroke={isDark ? 'rgba(139,126,200,0.35)' : 'rgba(139,126,200,0.4)'}
        strokeWidth="1" fill="none" strokeLinecap="round"
      />
      <path
        d="M55 44 C73 50, 78 60, 64 68"
        stroke={isDark ? 'rgba(139,126,200,0.35)' : 'rgba(139,126,200,0.4)'}
        strokeWidth="1" fill="none" strokeLinecap="round"
      />
    </svg>
  );
};

/** "BREVEIL" SVG wordmark — headers, landing pages */
export const BreveilWordmark = ({
  width = 200,
  color = 'white',
}: {
  width?: number;
  color?: string;
}) => (
  <svg width={width} viewBox="0 0 400 60">
    <text
      x="200" y="48" textAnchor="middle"
      fontFamily="'Cormorant Garamond', serif"
      fontWeight="300" fontSize="52"
      fill={color} letterSpacing="12"
    >
      BREVEIL
    </text>
  </svg>
);
