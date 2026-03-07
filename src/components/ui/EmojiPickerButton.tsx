'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Smile } from 'lucide-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface EmojiPickerButtonProps {
  onSelect: (emoji: string) => void;
  isDark: boolean;
  size?: 'sm' | 'md';
}

export default function EmojiPickerButton({ onSelect, isDark, size = 'md' }: EmojiPickerButtonProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ bottom: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const iconSize = size === 'sm' ? 14 : 18;
  const btnSize = size === 'sm' ? 24 : 32;

  // Calculate position when opening
  const updatePosition = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pickerWidth = 352; // emoji-mart default width
    // Anchor left-aligned to button, but clamp so it stays within viewport
    let left = rect.left;
    if (left + pickerWidth > window.innerWidth - 8) {
      left = window.innerWidth - pickerWidth - 8;
    }
    if (left < 8) left = 8;
    setPos({
      bottom: window.innerHeight - rect.top + 8,
      left,
    });
  }, []);

  // Click outside → close
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        pickerRef.current && !pickerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Recalculate position on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  return (
    <div ref={containerRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => { setOpen(p => !p); }}
        style={{
          width: btnSize, height: btnSize, borderRadius: '50%',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isDark ? '#64748B' : '#94A3B8',
          transition: 'color 150ms',
        }}
      >
        <Smile size={iconSize} />
      </button>

      {open && pos && createPortal(
        <div
          ref={pickerRef}
          style={{
            position: 'fixed',
            bottom: pos.bottom,
            left: pos.left,
            zIndex: 9999,
          }}
        >
          <Picker
            data={data}
            onEmojiSelect={(emoji: any) => {
              onSelect(emoji.native);
              setOpen(false);
            }}
            theme={isDark ? 'dark' : 'light'}
            previewPosition="none"
            skinTonePosition="none"
            locale="fr"
            perLine={8}
            maxFrequentRows={2}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
