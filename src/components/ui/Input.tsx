'use client';

import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, type = 'text', className = '', ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="relative">
        <input
          ref={ref}
          type={inputType}
          className={`
            w-full px-4 pt-5 pb-2
            bg-[var(--surface-card)]
            border border-[var(--border-default)]
            rounded-[var(--radius-md)]
            text-[var(--text-primary)] text-base
            placeholder-transparent
            transition-all duration-[var(--duration-fast)]
            focus:outline-none focus:border-[var(--gradient-start)] focus:shadow-[var(--shadow-glow)]
            peer
            ${error ? 'border-[var(--semantic-danger)]' : ''}
            ${isPassword ? 'pr-12' : ''}
            ${className}
          `.replace(/\s+/g, ' ').trim()}
          placeholder={label || ' '}
          {...props}
        />

        {label && (
          <label
            className={`
              absolute left-4 top-1/2 -translate-y-1/2
              text-[var(--text-tertiary)] text-base
              pointer-events-none
              transition-all duration-[var(--duration-fast)]
              peer-focus:top-3 peer-focus:text-xs peer-focus:text-[var(--text-secondary)]
              peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-xs
              ${error ? 'text-[var(--semantic-danger)]' : ''}
            `.replace(/\s+/g, ' ').trim()}
          >
            {label}
          </label>
        )}

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}

        {error && (
          <p className="mt-2 text-sm text-[var(--semantic-danger)]">{error}</p>
        )}

        {hint && !error && (
          <p className="mt-2 text-sm text-[var(--text-tertiary)]">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
