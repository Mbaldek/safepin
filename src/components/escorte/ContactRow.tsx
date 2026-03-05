import { motion, AnimatePresence } from 'framer-motion'
import { T, tok } from '@/lib/tokens'
import { avatarColor, circleStatusLabel, circleStatusColor } from '@/lib/escorteHelpers'
import type { EscorteCircleMember } from '@/types'

interface Props {
  member: EscorteCircleMember
  isDark: boolean
  showBorder?: boolean
}

export function ContactRow({ member, isDark, showBorder = true }: Props) {
  const d   = isDark
  const tk  = tok(isDark)
  const name = member.profiles?.name ?? '?'
  const col  = avatarColor(name)
  const statusLabel = circleStatusLabel(member.status)
  const statusColor = circleStatusColor(member.status, T)
  const statusBg    = member.status === 'following'
    ? T.semanticSuccessSoft
    : member.status === 'vocal'
      ? 'rgba(59,180,193,0.10)'
      : member.status === 'notified'
        ? T.semanticWarningSoft
        : tk.ih

  return (
    <div style={{
      padding:       '11px 14px',
      display:       'flex',
      alignItems:    'center',
      gap:           10,
      borderBottom:  showBorder ? `1px solid ${tk.bd}` : 'none',
    }}>
      {/* Avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width:            36,
          height:           36,
          borderRadius:     '50%',
          background:       `${col}25`,
          border:           `2px solid ${col}50`,
          display:          'flex',
          alignItems:       'center',
          justifyContent:   'center',
          fontSize:         13,
          fontWeight:       700,
          color:            col,
        }}>
          {name[0].toUpperCase()}
        </div>
        {member.status !== 'notified' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              position:        'absolute',
              bottom:          -1,
              right:           -1,
              width:           10,
              height:          10,
              borderRadius:    '50%',
              background:      statusColor,
              border:          `2px solid ${d ? T.surfaceCard : '#fff'}`,
            }}
          />
        )}
      </div>

      {/* Name */}
      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: tk.tp, minWidth: 0 }}>
        {name}
      </span>

      {/* Status badge */}
      <AnimatePresence mode="wait">
        <motion.span
          key={member.status}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          style={{
            fontSize:         11,
            fontWeight:       500,
            padding:          '3px 9px',
            borderRadius:     100,
            background:       statusBg,
            color:            statusColor,
            whiteSpace:       'nowrap',
          }}
        >
          {statusLabel}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}
