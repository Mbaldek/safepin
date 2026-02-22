// src/lib/useFocusTrap.ts — Trap Tab focus within a container, Escape to close

import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(active: boolean, onEscape?: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    // Store the element that had focus before the trap activated
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const el = containerRef.current;
    if (!el) return;

    // Focus the first focusable element inside the container
    const focusables = el.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (focusables.length > 0) {
      requestAnimationFrame(() => focusables[0].focus());
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onEscape?.();
        return;
      }

      if (e.key !== 'Tab') return;

      const nodes = el!.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      // Restore focus to the previously focused element
      previousFocusRef.current?.focus();
    };
  }, [active, onEscape]);

  return containerRef;
}
