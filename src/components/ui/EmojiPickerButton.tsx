'use client';

import { useState, useRef, useEffect } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const iconSize = size === 'sm' ? 14 : 18;
  const btnSize = size === 'sm' ? 24 : 32;

  return (
    <div ref={containerRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
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

      {open && (
        <div style={{
          position: 'absolute', bottom: btnSize + 8, right: 0, zIndex: 50,
        }}>
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
        </div>
      )}
    </div>
  );
}
