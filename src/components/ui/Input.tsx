'use client';

import { forwardRef, useState, useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, type = 'text', value, onChange, disabled = false, required = false, className = '', ...props }, ref) => {
    const id = useId();
    const [focused, setFocused] = useState(false);
    const isActive = focused || (typeof value === 'string' && value.length > 0);

    return (
      <div className={`relative ${className}`}>
        <input
          ref={ref}
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          className={`w-full ${label ? 'pt-6 pb-2' : 'py-4'} px-4 bg-white/[0.08] text-white text-base rounded-xl border outline-none transition-all ${
            error
              ? 'border-red-500'
              : focused
                ? 'border-[#3BB4C1] shadow-[0_0_20px_rgba(59,180,193,0.3)]'
                : 'border-white/12'
          }`}
          {...props}
        />
        {label && (
          <label
            htmlFor={id}
            className={`absolute left-4 pointer-events-none transition-all ${
              isActive
                ? 'top-2 text-xs text-slate-400'
                : 'top-1/2 -translate-y-1/2 text-base text-slate-500'
            }`}
          >
            {label}
            {required && <span className="text-red-400">*</span>}
          </label>
        )}
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
