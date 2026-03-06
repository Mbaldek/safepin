'use client';

const EMERGENCY_NUMBERS = [
  { num: '15',   label: 'SAMU \u2014 Urgences m\u00e9dicales',     icon: '\u{1F3E5}', priority: false },
  { num: '17',   label: 'Police \u2014 Secours d\u2019urgence',    icon: '\u{1F694}', priority: true  },
  { num: '18',   label: 'Pompiers \u2014 Incendie & secours',      icon: '\u{1F692}', priority: false },
  { num: '112',  label: 'Num\u00e9ro europ\u00e9en d\u2019urgence',icon: '\u{1F198}', priority: false },
  { num: '3114', label: 'Pr\u00e9vention suicide',                  icon: '\u{1F499}', priority: false },
];

export default function EmergencyNumbers() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div
        style={{
          padding: '44px 16px 14px',
          borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
        }}
      >
        <p
          style={{
            fontSize: 20,
            fontWeight: 300,
            fontFamily: 'Georgia, serif',
            letterSpacing: '-0.02em',
            color: 'var(--text-primary, #FFFFFF)',
            margin: 0,
          }}
        >
          Num&eacute;ros d&apos;urgence
        </p>
        <p
          style={{
            fontSize: 11,
            color: 'var(--text-tertiary, #64748B)',
            margin: '4px 0 0',
          }}
        >
          France &middot; Gratuits 24h/24 &middot; 7j/7
        </p>
      </div>

      {/* List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 12px 90px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {EMERGENCY_NUMBERS.map((item) => (
          <button
            key={item.num}
            onClick={() => window.open(`tel:${item.num}`, '_self')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: item.priority
                ? 'rgba(240,64,96,0.10)'
                : 'var(--surface-card, #1E293B)',
              border: item.priority
                ? '1px solid rgba(240,64,96,0.22)'
                : '1px solid var(--border-default, rgba(255,255,255,0.08))',
              borderRadius: 16,
              padding: '12px 13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              width: '100%',
              textAlign: 'left',
              fontFamily: 'inherit',
            }}
          >
            {/* Icon box */}
            <div
              style={{
                flexShrink: 0,
                width: 48,
                height: 48,
                borderRadius: 13,
                background: item.priority
                  ? 'rgba(240,64,96,0.10)'
                  : 'var(--surface-elevated, #273449)',
                border: item.priority
                  ? '1px solid rgba(240,64,96,0.22)'
                  : '1px solid var(--border-default, rgba(255,255,255,0.08))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
              }}
            >
              {item.icon}
            </div>

            {/* Text */}
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontSize: 28,
                  fontWeight: 300,
                  fontFamily: 'Georgia, serif',
                  letterSpacing: '-0.03em',
                  lineHeight: 1.05,
                  color: item.priority
                    ? 'var(--semantic-danger, #F04060)'
                    : 'var(--text-primary, #FFFFFF)',
                  margin: 0,
                }}
              >
                {item.num}
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: 'var(--text-secondary, #94A3B8)',
                  marginTop: 1,
                  margin: '1px 0 0',
                }}
              >
                {item.label}
              </p>
            </div>

            {/* Call button */}
            <div
              style={{
                flexShrink: 0,
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: item.priority
                  ? 'rgba(240,64,96,0.10)'
                  : 'var(--surface-elevated, #273449)',
                border: item.priority
                  ? '1px solid rgba(240,64,96,0.22)'
                  : '1px solid var(--border-default, rgba(255,255,255,0.08))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                color: item.priority
                  ? 'var(--semantic-danger, #F04060)'
                  : 'var(--text-tertiary, #64748B)',
              }}
            >
              {'\u{1F4DE}'}
            </div>
          </button>
        ))}
      </div>

      {/* Footer note */}
      <div
        style={{
          padding: '12px 16px 32px',
          textAlign: 'center',
          borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
        }}
      >
        <p
          style={{
            fontSize: 11,
            color: 'var(--text-tertiary, #64748B)',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Ces num&eacute;ros sont gratuits et disponibles
          <br />
          24h/24, 7j/7, depuis tout t&eacute;l&eacute;phone
        </p>
      </div>
    </div>
  );
}
