'use client';

const EMERGENCY_NUMBERS = [
  { num: '15',   label: 'SAMU \u2014 Urgences m\u00e9dicales',     icon: '\u{1F3E5}', priority: false },
  { num: '17',   label: 'Police \u2014 Secours d\u2019urgence',    icon: '\u{1F694}', priority: true  },
  { num: '18',   label: 'Pompiers \u2014 Incendie & secours',      icon: '\u{1F692}', priority: false },
  { num: '112',  label: 'Urgences europ\u00e9en',                   icon: '\u{1F198}', priority: false },
  { num: '3114', label: 'Pr\u00e9vention suicide',                  icon: '\u{1F499}', priority: false },
];

interface EmergencyNumbersProps {
  onBack: () => void;
}

export default function EmergencyNumbers({ onBack }: EmergencyNumbersProps) {
  return (
    <>
      {/* Scrim */}
      <div
        onClick={onBack}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 401,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      {/* Card */}
      <div
        style={{
          position: 'fixed',
          bottom: 96,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '92%',
          maxWidth: 320,
          background: 'var(--surface-card, #1E293B)',
          border: '1px solid var(--border-default, rgba(255,255,255,0.08))',
          borderRadius: 22,
          zIndex: 402,
          overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
          animation: 'sos-slideUp 0.25s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Top accent bar */}
        <div style={{
          height: 3,
          background: 'linear-gradient(90deg, var(--semantic-danger, #F04060), #FF6B6B)',
        }} />

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px 8px',
        }}>
          <button
            onClick={onBack}
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'var(--surface-elevated, #273449)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 11,
              color: 'var(--text-secondary, #94A3B8)',
              fontFamily: 'inherit',
              flexShrink: 0,
            }}
          >
            &larr;
          </button>
          <div style={{ flex: 1 }}>
            <p style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--text-primary, #FFFFFF)',
              margin: 0,
            }}>
              Num&eacute;ros d&apos;urgence
            </p>
            <p style={{
              fontSize: 9,
              color: 'var(--text-tertiary, #64748B)',
              margin: 0,
            }}>
              France &middot; Gratuits 24h/24
            </p>
          </div>
        </div>

        {/* List */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
          padding: '8px 10px 10px',
        }}>
          {EMERGENCY_NUMBERS.map((item) => (
            <button
              key={item.num}
              onClick={() => window.open(`tel:${item.num}`, '_self')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 11,
                padding: '7px 9px',
                background: item.priority
                  ? 'rgba(240,64,96,0.10)'
                  : 'var(--surface-elevated, #273449)',
                border: item.priority
                  ? '1px solid rgba(240,64,96,0.22)'
                  : '1px solid var(--border-default, rgba(255,255,255,0.08))',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
                fontFamily: 'inherit',
                transition: 'opacity 0.15s',
              }}
            >
              {/* Icon box */}
              <div style={{
                flexShrink: 0,
                width: 32,
                height: 32,
                borderRadius: 9,
                background: item.priority
                  ? 'rgba(240,64,96,0.10)'
                  : 'var(--surface-card, #1E293B)',
                border: item.priority
                  ? '1px solid rgba(240,64,96,0.22)'
                  : '1px solid var(--border-default, rgba(255,255,255,0.08))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
              }}>
                {item.icon}
              </div>

              {/* Text */}
              <div style={{ flex: 1 }}>
                <p style={{
                  fontSize: 20,
                  fontWeight: 300,
                  fontFamily: 'Georgia, serif',
                  letterSpacing: '-0.03em',
                  lineHeight: 1.05,
                  color: item.priority
                    ? 'var(--semantic-danger, #F04060)'
                    : 'var(--text-primary, #FFFFFF)',
                  margin: 0,
                }}>
                  {item.num}
                </p>
                <p style={{
                  fontSize: 9,
                  color: 'var(--text-secondary, #94A3B8)',
                  margin: '1px 0 0',
                }}>
                  {item.label}
                </p>
              </div>

              {/* Call button */}
              <div style={{
                flexShrink: 0,
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: item.priority
                  ? 'rgba(240,64,96,0.10)'
                  : 'var(--surface-card, #1E293B)',
                border: item.priority
                  ? '1px solid rgba(240,64,96,0.22)'
                  : '1px solid var(--border-default, rgba(255,255,255,0.08))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                color: item.priority
                  ? 'var(--semantic-danger, #F04060)'
                  : 'var(--text-tertiary, #64748B)',
              }}>
                {'\u{1F4DE}'}
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
