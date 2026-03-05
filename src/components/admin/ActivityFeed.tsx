'use client';

import { useAdminTheme } from './AdminThemeContext';
import PanelShell from './PanelShell';

const EVENTS = [
  { icon: '\uD83D\uDCCD', label: 'Nouveau pin Harc\u00e8lement \u00b7 Paris 7\u00e8me', time: '12 min', bg: 'cyanSoft' as const },
  { icon: '\u2713',  label: 'Pin d10dd9e3 confirm\u00e9 \u00d73', time: '18 min', bg: 'successSoft' as const },
  { icon: '\uD83D\uDC64', label: 'Nouveau compte cr\u00e9\u00e9', time: '1h 04 min', bg: 'purpleSoft' as const },
  { icon: '\uD83E\uDDED', label: 'Session de trajet termin\u00e9e \u00b7 1.2 km', time: '2h 31 min', bg: 'goldSoft' as const },
  { icon: '\u26A0\uFE0F', label: 'Decay automatique \u00b7 4 pins expir\u00e9s', time: '3h', bg: 'warningSoft' as const },
];

export default function ActivityFeed() {
  const { theme } = useAdminTheme();

  return (
    <PanelShell title="Activit\u00e9 r\u00e9cente" dotColor={theme.success}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {EVENTS.map((ev, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: theme[ev.bg],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              {ev.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: theme.t1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {ev.label}
              </div>
            </div>
            <span style={{ fontSize: 10, color: theme.t3, whiteSpace: 'nowrap' }}>{ev.time}</span>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}
