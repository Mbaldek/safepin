import { T, tok } from '@/lib/tokens'

/** Theme-aware color palette for escorte views */
export function getColors(isDark: boolean) {
  return {
    t1:      isDark ? '#FFFFFF'                : '#0F172A',
    t2:      isDark ? '#94A3B8'               : '#475569',
    t3:      isDark ? '#64748B'               : '#94A3B8',
    bg:      isDark ? 'rgba(15,23,42,0.93)'   : 'rgba(255,255,255,0.96)',
    card:    isDark ? '#1E293B'               : '#FFFFFF',
    el:      isDark ? '#243050'               : '#F1F5F9',
    border:  isDark ? 'rgba(255,255,255,0.08)': 'rgba(15,23,42,0.08)',
    borderS: isDark ? 'rgba(255,255,255,0.15)': 'rgba(15,23,42,0.16)',
    handle:  isDark ? 'rgba(255,255,255,0.13)': 'rgba(15,23,42,0.13)',
    btn:     isDark ? '#FFFFFF'               : '#0F172A',
    btnTxt:  isDark ? '#0F172A'               : '#FFFFFF',
  }
}

export type EscorteColors = ReturnType<typeof getColors>

/** Card style (needs isDark for surface token) */
export function getCardStyle(isDark: boolean) {
  const tk = tok(isDark)
  return {
    background:   isDark ? T.surfaceCard : T.surfaceCardL,
    border:       `1px solid ${tk.bd}`,
    borderRadius: T.radiusLg,
  }
}

/** Primary button style */
export function getBtnPrimary(C: EscorteColors): React.CSSProperties {
  return {
    width:          '100%',
    padding:        '15px 20px',
    background:     C.btn,
    color:          C.btnTxt,
    fontFamily:     'inherit',
    fontSize:       '15px',
    fontWeight:     600,
    border:         'none',
    borderRadius:   T.radius2xl,
    cursor:         'pointer',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            '8px',
  }
}

/** Sheet height per view */
export const SHEET_HEIGHTS: Record<string, string> = {
  'hub':               '52vh',
  'escorte-intro':     '50vh',
  'escorte-notifying': '52vh',
  'escorte-live':      '72vh',
  'trip-form':         '50vh',
  'trip-active':       '0px',
  'arrived':           '0px',
}
