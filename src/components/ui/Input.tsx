'use client';

import { forwardRef, useState, useId } from 'react';
import { useTheme } from '@/stores/useTheme';

function getColors(isDark: boolean) {
  return isDark ? {
    textPrimary: '#FFFFFF',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
    border: 'rgba(255,255,255,0.08)',
    inputBg: 'rgba(255,255,255,0.06)',
  } : {
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#94A3B8',
    border: 'rgba(15,23,42,0.06)',
    inputBg: 'rgba(15,23,42,0.04)',
  };
}

const FIXED = {
  accentCyan: '#3BB4C1',
  semanticDanger: '#EF4444',
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, type = 'text', value, onChange, disabled = false, required = false, className = '', style: styleProp, ...props }, ref) => {
    const isDark = useTheme((s) => s.theme) === 'dark';
    const C = getColors(isDark);
    const id = useId();
    const [focused, setFocused] = useState(false);
    const isActive = focused || (typeof value === 'string' && value.length > 0);

    const borderColor = error
      ? FIXED.semanticDanger
      : focused
        ? FIXED.accentCyan
        : C.border;

    const boxShadow = focused && !error
      ? '0 0 0 3px rgba(59,180,193,0.15)'
      : undefined;

    return (
      <div className={className} style={{ position: 'relative', ...styleProp }}>
        <input
          ref={ref}
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          style={{
            width: '100%',
            padding: label ? '24px 16px 8px' : '14px 16px',
            background: C.inputBg,
            border: `1px solid ${borderColor}`,
            borderRadius: 12,
            fontSize: 16,
            color: C.textPrimary,
            outline: 'none',
            transition: 'all 150ms',
            boxShadow,
          }}
          placeholder={props.placeholder}
          {...props}
        />
        {label && (
          <label
            htmlFor={id}
            style={{
              position: 'absolute',
              left: 16,
              pointerEvents: 'none',
              transition: 'all 150ms',
              ...(isActive
                ? { top: 6, fontSize: 12, color: focused ? C.textSecondary : C.textTertiary }
                : { top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: C.textTertiary }),
            }}
          >
            {label}
            {required && <span style={{ color: FIXED.semanticDanger }}>*</span>}
          </label>
        )}
        {error && <p style={{ marginTop: 8, fontSize: 14, color: FIXED.semanticDanger }}>{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
