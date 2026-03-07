'use client';

import { useRef, useState, useCallback } from 'react';

interface UsePullToDismissOptions {
  onDismiss: () => void;
  threshold?: number;
}

export function usePullToDismiss({ onDismiss, threshold = 80 }: UsePullToDismissOptions) {
  const startY = useRef(0);
  const pulling = useRef(false);
  const [translateY, setTranslateY] = useState(0);
  const scrollRef = useRef<HTMLElement | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    pulling.current = false;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const scrollEl = scrollRef.current;
    const atTop = !scrollEl || scrollEl.scrollTop <= 0;
    const deltaY = e.touches[0].clientY - startY.current;

    if (atTop && deltaY > 0) {
      pulling.current = true;
      // Dampen the pull (feels like resistance)
      setTranslateY(deltaY * 0.5);
    } else if (pulling.current && deltaY <= 0) {
      pulling.current = false;
      setTranslateY(0);
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (pulling.current && translateY > threshold) {
      onDismiss();
    }
    pulling.current = false;
    setTranslateY(0);
  }, [translateY, threshold, onDismiss]);

  return { onTouchStart, onTouchMove, onTouchEnd, translateY, scrollRef };
}
