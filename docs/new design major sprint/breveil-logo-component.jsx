// ============================================
// BREVEIL LOGO COMPONENT
// G1: Together Mark - Two arcs + destination dot
// ============================================

import React from 'react';

/**
 * Breveil Logo - G1 Together Mark
 * Two curved arcs converging + destination dot
 */
export function BreveilLogo({ 
  size = 40, 
  color = 'currentColor',
  className = ''
}) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 80 80" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Breveil logo"
    >
      {/* Outer arc */}
      <path
        d="M20 60 Q20 30, 40 20 Q60 30, 60 60"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Inner arc (60% opacity) */}
      <path
        d="M28 55 Q28 35, 40 28 Q52 35, 52 55"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      
      {/* Destination dot */}
      <circle cx="40" cy="22" r="4" fill={color} />
    </svg>
  );
}

// Preset sizes
export const BreveilLogoSmall = (props) => <BreveilLogo size={24} {...props} />;
export const BreveilLogoMedium = (props) => <BreveilLogo size={40} {...props} />;
export const BreveilLogoLarge = (props) => <BreveilLogo size={64} {...props} />;
export const BreveilLogoXL = (props) => <BreveilLogo size={80} {...props} />;

export default BreveilLogo;
