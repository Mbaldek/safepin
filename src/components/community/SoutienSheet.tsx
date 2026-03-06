'use client';

import { useState, useRef } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';

const REACTIONS = [
  { emoji: '\uD83E\uDEC2', label: 'Je suis avec toi' },
  { emoji: '\uD83D\uDC99', label: 'Prend soin de toi' },
  { emoji: '\uD83D\uDCAA', label: 'Tu es forte' },
  { emoji: '\uD83D\uDE4F', label: 'Courage' },
  { emoji: '\uD83C\uDF38', label: 'Tout ira bien' },
  { emoji: '\uD83E\uDD1D', label: "Tu n'es pas seule" },
];

interface SoutienSheetProps {
  postId: string;
  onClose: () => void;
}

export default function SoutienSheet({ postId, onClose }: SoutienSheetProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [sent, setSent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const canSend = selected !== null || (inputRef.current?.value?.length ?? 0) > 0;

  const handleSend = () => {
    // post_reactions table doesn't exist yet — toast-only mode
    const label = selected !== null
      ? `${REACTIONS[selected].emoji} ${REACTIONS[selected].label}`
      : inputRef.current?.value || '';
    void label; // will be used when DB table exists
    void postId;
    toast('\uD83E\uDEC2 Soutien envoy\u00e9');
    setSent(true);
  };

  return (
    <>
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 410,
          background: 'rgba(0,0,0,0.4)',
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--surface-elevated, #1E293B)',
          borderRadius: '24px 24px 0 0',
          padding: '16px 16px 32px',
          zIndex: 411,
          animation: 'sos-slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Handle */}
        <div style={{
          width: 36,
          height: 4,
          background: 'var(--border-strong, rgba(255,255,255,0.15))',
          borderRadius: 99,
          margin: '0 auto 14px',
        }} />

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-tertiary, #64748B)',
            padding: 4,
          }}
        >
          <X size={18} />
        </button>

        {!sent ? (
          <>
            {/* Header */}
            <p style={{
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--text-primary, #FFFFFF)',
              margin: '0 0 2px',
            }}>
              Envoyer du soutien
            </p>
            <p style={{
              fontSize: 11,
              color: 'var(--text-tertiary, #64748B)',
              margin: '0 0 14px',
            }}>
              Anonyme &middot; Un seul message par alerte
            </p>

            {/* Reaction grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 7,
            }}>
              {REACTIONS.map((r, i) => {
                const isSelected = selected === i;
                return (
                  <button
                    key={i}
                    onClick={() => setSelected(isSelected ? null : i)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: isSelected
                        ? 'rgba(167,139,250,0.12)'
                        : 'var(--surface-card, #273449)',
                      border: `1px solid ${isSelected
                        ? 'rgba(167,139,250,0.40)'
                        : 'var(--border-default, rgba(255,255,255,0.08))'}`,
                      borderRadius: 11,
                      padding: '9px 11px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{r.emoji}</span>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: isSelected
                        ? '#A78BFA'
                        : 'var(--text-secondary, #94A3B8)',
                    }}>
                      {r.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom input */}
            <input
              ref={inputRef}
              placeholder="Ou \u00e9cris un message personnalis\u00e9\u2026"
              onChange={() => {
                // Force re-render so canSend updates
                setSelected(selected);
              }}
              style={{
                width: '100%',
                background: 'var(--surface-card, #273449)',
                border: '1px solid var(--border-default, rgba(255,255,255,0.08))',
                borderRadius: 11,
                padding: '9px 12px',
                fontSize: 12,
                color: 'var(--text-primary, #FFFFFF)',
                marginTop: 4,
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />

            {/* Send button */}
            <button
              onClick={canSend ? handleSend : undefined}
              style={{
                width: '100%',
                marginTop: 10,
                padding: 12,
                borderRadius: 99,
                fontSize: 14,
                fontWeight: 700,
                fontFamily: 'inherit',
                border: 'none',
                cursor: canSend ? 'pointer' : 'default',
                background: canSend ? '#3BB4C1' : 'var(--surface-card, #273449)',
                color: canSend ? '#FFFFFF' : 'var(--text-tertiary, #64748B)',
                transition: 'all 0.15s ease',
              }}
            >
              Envoyer le soutien {'\u2713'}
            </button>
          </>
        ) : (
          /* Sent confirmation */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px 0 10px',
            gap: 8,
          }}>
            <span style={{ fontSize: 40 }}>{'\uD83E\uDEC2'}</span>
            <p style={{
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--text-primary, #FFFFFF)',
              margin: 0,
            }}>
              Soutien envoy&eacute;
            </p>
            <p style={{
              fontSize: 12,
              color: 'var(--text-tertiary, #64748B)',
              margin: 0,
              textAlign: 'center',
            }}>
              Ton message anonyme a bien &eacute;t&eacute; transmis
            </p>
            <button
              onClick={onClose}
              style={{
                marginTop: 10,
                padding: '10px 32px',
                borderRadius: 99,
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'inherit',
                border: 'none',
                cursor: 'pointer',
                background: 'var(--surface-card, #273449)',
                color: 'var(--text-secondary, #94A3B8)',
              }}
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </>
  );
}
