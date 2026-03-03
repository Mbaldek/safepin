'use client';

import { useEffect, type RefObject } from 'react';
import { useStore } from '@/stores/useStore';

/**
 * Observe a bottom-sheet element's height and push it to the store
 * so MapView can adjust its logical viewport padding.
 * Resets padding to 0 on unmount (sheet exit).
 */
export function useMapPadding(ref: RefObject<HTMLDivElement | null>) {
  const setMapBottomPadding = useStore((s) => s.setMapBottomPadding);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.borderBoxSize?.[0]
          ? entry.borderBoxSize[0].blockSize
          : entry.target.getBoundingClientRect().height;
        setMapBottomPadding(Math.round(height));
      }
    });

    observer.observe(el);

    return () => {
      observer.disconnect();
      setMapBottomPadding(0);
    };
  }, [ref, setMapBottomPadding]);
}
