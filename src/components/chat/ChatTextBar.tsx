'use client';

import { useRef, useCallback, useState } from 'react';
import { Plus, Send, X } from 'lucide-react';
import GifPicker from './GifPicker';

interface ChatTextBarProps {
  isDark: boolean;
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  onFilePick?: (file: File) => void;
  pendingPreview?: string | null;
  pendingFileName?: string | null;
  pendingIsVideo?: boolean;
  onClearPending?: () => void;
  uploading?: boolean;
  sending?: boolean;
  placeholder?: string;
  disabled?: boolean;
  onGifSelect?: (gifUrl: string) => void;
}

function getColors(isDark: boolean) {
  return isDark ? {
    card: '#1E293B', inp: 'rgba(255,255,255,0.06)',
    txt: '#FFFFFF', txts: '#94A3B8',
    brd: 'rgba(255,255,255,0.08)', teal: '#3BB4C1',
  } : {
    card: '#FFFFFF', inp: 'rgba(15,23,42,0.04)',
    txt: '#0F172A', txts: '#475569',
    brd: 'rgba(15,23,42,0.10)', teal: '#3BB4C1',
  };
}

export default function ChatTextBar({
  isDark, value, onChange, onSend,
  onFilePick, pendingPreview, pendingFileName,
  pendingIsVideo, onClearPending,
  uploading, sending, placeholder = 'Message...',
  disabled, onGifSelect,
}: ChatTextBarProps) {
  const c = getColors(isDark);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasContent = value.trim().length > 0 || !!pendingPreview;
  const [gifOpen, setGifOpen] = useState(false);

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 96) + 'px';
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !sending) onSend();
    }
  }, [onSend, disabled, sending]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFilePick) onFilePick(file);
    e.target.value = '';
  }, [onFilePick]);

  return (
    <div style={{ position: 'relative' }}>
      {/* GIF Picker */}
      {gifOpen && onGifSelect && (
        <GifPicker
          onSelect={(url) => {
            onGifSelect(url);
            setGifOpen(false);
          }}
          onClose={() => setGifOpen(false)}
        />
      )}

      <div style={{ background: c.card }}>
        {/* Media preview strip */}
        {pendingPreview && (
          <div style={{
            padding: '8px 12px',
            borderTop: `1px solid ${c.brd}`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {pendingIsVideo ? (
                <video src={pendingPreview} style={{
                  width: 52, height: 52, borderRadius: 10,
                  objectFit: 'cover', border: `1px solid ${c.brd}`,
                }} />
              ) : (
                <img src={pendingPreview} alt="" style={{
                  width: 52, height: 52, borderRadius: 10,
                  objectFit: 'cover', border: `1px solid ${c.brd}`,
                }} />
              )}
              {onClearPending && (
                <button
                  onClick={onClearPending}
                  style={{
                    position: 'absolute', top: -5, right: -5,
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'rgba(15,23,42,0.7)',
                    border: `1.5px solid ${c.card}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', padding: 0,
                  }}
                >
                  <X size={10} color="#FFFFFF" />
                </button>
              )}
            </div>
            {pendingFileName && (
              <span style={{
                fontSize: 11, color: c.txts, flex: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {pendingFileName}
              </span>
            )}
          </div>
        )}

        {/* Input row */}
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 8,
          padding: '8px 12px 16px',
          borderTop: `1px solid ${c.brd}`,
        }}>
          {/* Hidden file input */}
          {onFilePick && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          )}

          {/* Attachment button */}
          {onFilePick && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || disabled}
              style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(59,180,193,0.10)',
                border: `1px solid ${c.brd}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: uploading ? 'wait' : 'pointer',
                opacity: uploading ? 0.4 : 1,
                transition: 'all 0.15s',
                padding: 0,
              }}
            >
              <Plus size={16} color={c.teal} />
            </button>
          )}

          {/* GIF button */}
          {onGifSelect && (
            <button
              onClick={() => setGifOpen(prev => !prev)}
              style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: gifOpen ? c.teal : 'rgba(59,180,193,0.10)',
                border: `1px solid ${gifOpen ? c.teal : c.brd}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', padding: 0,
                transition: 'all 0.15s',
                fontFamily: 'inherit',
                fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
                color: gifOpen ? '#FFFFFF' : c.teal,
              }}
            >
              GIF
            </button>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            rows={1}
            placeholder={placeholder}
            disabled={disabled}
            style={{
              flex: 1,
              background: c.inp,
              border: `1px solid ${c.brd}`,
              borderRadius: 24,
              padding: '10px 16px',
              fontSize: 14,
              color: c.txt,
              fontFamily: 'inherit',
              caretColor: c.teal,
              resize: 'none',
              lineHeight: 1.45,
              maxHeight: 96,
              overflowY: 'auto',
              outline: 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'rgba(59,180,193,0.4)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,180,193,0.08)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = c.brd;
              e.currentTarget.style.boxShadow = 'none';
            }}
          />

          {/* Send button */}
          <button
            onClick={onSend}
            disabled={!hasContent || sending || uploading || disabled}
            style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: c.teal,
              border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: hasContent ? 'pointer' : 'default',
              boxShadow: hasContent ? '0 4px 14px rgba(59,180,193,0.35)' : 'none',
              opacity: hasContent ? 1 : 0,
              transform: hasContent ? 'scale(1)' : 'scale(0.6)',
              pointerEvents: hasContent ? 'auto' : 'none',
              transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
              padding: 0,
            }}
          >
            <Send size={15} color="#FFFFFF" />
          </button>
        </div>
      </div>
    </div>
  );
}
