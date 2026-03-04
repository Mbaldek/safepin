# Phase 2: UI Components

> Copie ce prompt ENTIER dans Claude Code
> **Prérequis**: Phase 1 (Brand System) complétée

---

## Context

J'intègre le design system Breveil. Phase 1 (globals.css, tokens.ts) est fait. Maintenant je crée les composants UI réutilisables.

## Task

Crée une bibliothèque de composants UI dans `src/components/ui/`.

---

## 1. Crée le dossier et le barrel export

```bash
mkdir -p src/components/ui
```

Crée `src/components/ui/index.ts` :

```typescript
export { Button } from './Button';
export { Input } from './Input';
export { Card } from './Card';
export { SelectionCard } from './SelectionCard';
export { Sheet } from './Sheet';
export { Badge } from './Badge';
export { Chip } from './Chip';
```

---

## 2. Crée `src/components/ui/Button.tsx`

```tsx
'use client';

import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth, loading, disabled, children, className = '', ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-semibold rounded-[var(--radius-2xl)]
      transition-all duration-[var(--duration-fast)]
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

    const variants = {
      primary: `
        bg-white text-[var(--surface-base)]
        hover:translate-y-[-1px] hover:shadow-[var(--shadow-md)]
        active:translate-y-0
      `,
      secondary: `
        bg-transparent text-[var(--text-primary)]
        border border-[var(--border-default)]
        hover:bg-[var(--interactive-hover)] hover:border-[var(--border-strong)]
      `,
      ghost: `
        bg-transparent text-[var(--text-secondary)]
        hover:text-[var(--text-primary)] hover:bg-[var(--interactive-hover)]
      `,
      danger: `
        bg-[var(--semantic-danger)] text-white
        hover:opacity-90
      `,
    };

    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-4 text-base',
      lg: 'px-8 py-5 text-lg',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          ${baseStyles}
          ${variants[variant]}
          ${sizes[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `.replace(/\s+/g, ' ').trim()}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

---

## 3. Crée `src/components/ui/Input.tsx`

```tsx
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
```

---

## 4. Crée `src/components/ui/Card.tsx`

```tsx
'use client';

import { forwardRef } from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', children, className = '', ...props }, ref) => {
    const variants = {
      default: 'bg-[var(--surface-card)] border border-[var(--border-subtle)]',
      elevated: 'bg-[var(--surface-elevated)] shadow-[var(--shadow-md)]',
      glass: 'bg-[var(--surface-glass)] backdrop-blur-[20px] border border-[var(--border-subtle)]',
    };

    const paddings = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    };

    return (
      <div
        ref={ref}
        className={`
          rounded-[var(--radius-lg)]
          ${variants[variant]}
          ${paddings[padding]}
          ${className}
        `.replace(/\s+/g, ' ').trim()}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
```

---

## 5. Crée `src/components/ui/SelectionCard.tsx`

```tsx
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
```

---

## 6. Crée `src/components/ui/Sheet.tsx`

```tsx
'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { springTransition } from '@/lib/tokens';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showHandle?: boolean;
  showClose?: boolean;
}

export function Sheet({
  isOpen,
  onClose,
  title,
  children,
  showHandle = true,
  showClose = false,
}: SheetProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-[200]"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springTransition}
            className="
              fixed bottom-0 left-0 right-0 z-[201]
              bg-[var(--surface-elevated)]
              rounded-t-[var(--radius-xl)]
              max-h-[90vh] overflow-y-auto
              sheet-motion
            "
          >
            {/* Handle */}
            {showHandle && (
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-9 h-1 rounded-full bg-[var(--border-strong)]" />
              </div>
            )}

            {/* Header */}
            {(title || showClose) && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
                {title && (
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
                )}
                {showClose && (
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-[var(--interactive-hover)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="px-6 py-4 pb-[calc(var(--space-6)+env(safe-area-inset-bottom))]">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

---

## 7. Crée `src/components/ui/Badge.tsx`

```tsx
'use client';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

export function Badge({ variant = 'default', size = 'md', children }: BadgeProps) {
  const variants = {
    default: 'bg-[var(--interactive-active)] text-[var(--text-primary)]',
    success: 'bg-[var(--semantic-success-soft)] text-[var(--semantic-success)]',
    warning: 'bg-[var(--semantic-warning-soft)] text-[var(--semantic-warning)]',
    danger: 'bg-[var(--semantic-danger-soft)] text-[var(--semantic-danger)]',
    info: 'bg-[var(--semantic-info-soft)] text-[var(--semantic-info)]',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1
        font-medium rounded-full
        ${variants[variant]}
        ${sizes[size]}
      `.replace(/\s+/g, ' ').trim()}
    >
      {children}
    </span>
  );
}
```

---

## 8. Crée `src/components/ui/Chip.tsx`

```tsx
'use client';

import { Check } from 'lucide-react';

interface ChipProps {
  label: string;
  emoji?: string;
  color?: {
    text: string;
    bg: string;
  };
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

export function Chip({
  label,
  emoji,
  color,
  selected = false,
  onClick,
  size = 'md',
}: ChipProps) {
  const sizes = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
  };

  const defaultBg = 'rgba(255,255,255,0.06)';
  const selectedBg = 'rgba(59,180,193,0.25)';
  const defaultColor = 'var(--text-secondary)';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center
        rounded-full font-medium
        border transition-all duration-[var(--duration-fast)]
        ${sizes[size]}
      `.replace(/\s+/g, ' ').trim()}
      style={{
        background: selected ? selectedBg : (color?.bg || defaultBg),
        borderColor: selected ? 'var(--gradient-start)' : 'transparent',
        borderWidth: '1.5px',
        color: selected ? 'var(--text-primary)' : (color?.text || defaultColor),
      }}
    >
      {emoji && <span className="text-sm">{emoji}</span>}
      {label}
      {selected && <Check size={14} className="text-[var(--gradient-start)]" />}
    </button>
  );
}
```

---

## Vérification

Après exécution :
1. Tous les fichiers sont créés dans `src/components/ui/`
2. L'import fonctionne : `import { Button, Input, Card } from '@/components/ui'`
3. Pas d'erreur TypeScript

Test rapide dans un composant :
```tsx
import { Button, Card, Badge } from '@/components/ui';

<Card>
  <Badge variant="success">Active</Badge>
  <Button variant="primary">Click me</Button>
</Card>
```

---

*Fin Phase 2*
