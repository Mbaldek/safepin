'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, UserCheck, UserPlus, User, Shield, X, ChevronRight } from 'lucide-react'
import { useTheme } from '@/stores/useTheme'
import { useUiStore } from '@/stores/uiStore'
import { supabase } from '@/lib/supabase'

export function UserContextMenu() {
  const theme = useTheme().theme
  const isDark = theme === 'dark'
  const activeUser = useUiStore((s) => s.activeContextMenuUser)
  const closeContextMenu = useUiStore((s) => s.closeContextMenu)
  const openProfile = useUiStore((s) => s.openProfile)
  const openCommunityDM = useUiStore((s) => s.openCommunityDM)

  const isOpen = !!activeUser
  const userId = activeUser?.userId ?? ''
  const username = activeUser?.username ?? ''
  const displayName = activeUser?.displayName

  const [isFollowing, setIsFollowing] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [pressedIdx, setPressedIdx] = useState<number | null>(null)

  const t = isDark
    ? { bg:'#1E293B', border:'rgba(255,255,255,0.08)', textPrimary:'#F1F5F9', textTertiary:'#64748B', overlay:'rgba(0,0,0,0.5)' }
    : { bg:'#FFFFFF', border:'rgba(0,0,0,0.07)', textPrimary:'#0F172A', textTertiary:'#94A3B8', overlay:'rgba(0,0,0,0.25)' }

  useEffect(() => {
    if (!isOpen || !userId) return
    setIsFollowing(false)
    setInviteSent(false)
    setPressedIdx(null)
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id
      setCurrentUserId(uid ?? null)
      if (!uid) return
      supabase.from('follows').select('id').eq('follower_id', uid).eq('following_id', userId).maybeSingle()
        .then(({ data: f }) => setIsFollowing(!!f))
      supabase.from('circle_invitations').select('id').eq('inviter_id', uid).eq('invitee_id', userId).maybeSingle()
        .then(({ data: c }) => setInviteSent(!!c))
    })
  }, [isOpen, userId])

  const handleFollow = async () => {
    if (!currentUserId) return
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', userId)
      setIsFollowing(false)
    } else {
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: userId })
      setIsFollowing(true)
    }
  }

  const handleCircle = async () => {
    if (!currentUserId || inviteSent) return
    await supabase.from('circle_invitations').insert({ inviter_id: currentUserId, invitee_id: userId })
    setInviteSent(true)
  }

  const handleMessage = () => {
    openCommunityDM({ userId, userName: displayName ?? username })
    closeContextMenu()
  }

  const handleViewProfile = () => {
    openProfile(userId)
    closeContextMenu()
  }

  const actions = [
    {
      Icon: MessageCircle, label: 'Message', sub: 'Ouvrir une conversation',
      color: '#3BB4C1', disabled: false, onPress: handleMessage,
    },
    isFollowing
      ? { Icon: UserCheck, label: 'Abonné·e ✓', sub: 'Ne plus suivre', color: '#34D399', disabled: false, onPress: handleFollow }
      : { Icon: UserPlus, label: "S'abonner", sub: 'Voir ses publications', color: '#3BB4C1', disabled: false, onPress: handleFollow },
    {
      Icon: User, label: 'Voir le profil', sub: 'Fiche publique complète',
      color: '#64748B', disabled: false, onPress: handleViewProfile,
    },
    inviteSent
      ? { Icon: Shield, label: 'Invitation envoyée', sub: 'Demande déjà envoyée', color: '#94A3B8', disabled: true, onPress: () => {} }
      : { Icon: Shield, label: 'Inviter au cercle', sub: 'Ajouter à mon cercle', color: '#FBBF24', disabled: false, onPress: handleCircle },
  ]

  const initial = (displayName ?? username ?? '?')[0]?.toUpperCase() ?? '?'
  const avatarColors = ['#34D399','#3BB4C1','#A78BFA','#F472B6','#FBBF24','#F87171']
  const avatarColor = userId ? avatarColors[userId.charCodeAt(0) % avatarColors.length] : avatarColors[0]

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:400 }}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity:0 }}
            animate={{ opacity:1 }}
            exit={{ opacity:0 }}
            transition={{ duration:0.2 }}
            onClick={closeContextMenu}
            style={{
              position:'absolute', inset:0,
              background: t.overlay,
              backdropFilter:'blur(4px)',
              WebkitBackdropFilter:'blur(4px)',
            }}
          />

          {/* Panel — slide depuis la gauche */}
          <motion.div
            initial={{ x: -300, opacity:0 }}
            animate={{ x: 0, opacity:1 }}
            exit={{ x: -300, opacity:0 }}
            transition={{ type:'spring', stiffness:340, damping:30 }}
            style={{
              position:'absolute',
              top:'20%',
              left:16,
              width:272,
              background: t.bg,
              borderRadius:20,
              border:`1px solid ${t.border}`,
              boxShadow: isDark
                ? '0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)'
                : '0 24px 60px rgba(0,0,0,0.12)',
              overflow:'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              display:'flex', alignItems:'center', gap:12,
              padding:'15px 14px 13px',
              borderBottom:`1px solid ${t.border}`,
            }}>
              <div style={{
                width:42, height:42, borderRadius:'50%',
                background: avatarColor, flexShrink:0,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:17, fontWeight:700, color:'#fff',
              }}>
                {initial}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:700, color:t.textPrimary, lineHeight:1.2 }}>
                  {displayName ?? username}
                </div>
                <div style={{ fontSize:11, color:t.textTertiary, marginTop:1 }}>@{username}</div>
              </div>
              <button
                onClick={closeContextMenu}
                style={{
                  width:26, height:26, borderRadius:7,
                  border:`1px solid ${t.border}`, background:'none', cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:t.textTertiary, flexShrink:0,
                }}
              >
                <X size={12}/>
              </button>
            </div>

            {/* Actions */}
            <div style={{ padding:'6px 0 8px' }}>
              {actions.map((action, i) => {
                const { Icon } = action
                const pressed = pressedIdx === i

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity:0, x:-12 }}
                    animate={{ opacity:1, x:0 }}
                    transition={{ delay: i * 0.045, type:'spring', stiffness:340, damping:28 }}
                    onMouseDown={() => !action.disabled && setPressedIdx(i)}
                    onMouseUp={() => { setPressedIdx(null); !action.disabled && action.onPress() }}
                    onMouseLeave={() => setPressedIdx(null)}
                    onTouchStart={() => !action.disabled && setPressedIdx(i)}
                    onTouchEnd={() => { setPressedIdx(null); !action.disabled && action.onPress() }}
                    style={{
                      display:'flex', alignItems:'center', gap:11,
                      padding:'9px 14px',
                      cursor: action.disabled ? 'default' : 'pointer',
                      opacity: action.disabled ? 0.38 : 1,
                      transform: pressed ? 'scale(0.97)' : 'scale(1)',
                      background: pressed
                        ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)')
                        : 'transparent',
                      transition:'background 140ms, transform 140ms',
                    }}
                  >
                    <div style={{
                      width:34, height:34, borderRadius:10, flexShrink:0,
                      background:`${action.color}1A`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      transform: pressed ? 'scale(0.86)' : 'scale(1)',
                      transition:'transform 150ms cubic-bezier(0.34,1.56,0.64,1)',
                    }}>
                      <Icon size={15} style={{ color:action.color }}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:t.textPrimary }}>{action.label}</div>
                      <div style={{ fontSize:11, color:t.textTertiary, marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {action.sub}
                      </div>
                    </div>
                    {!action.disabled && <ChevronRight size={12} style={{ color:t.textTertiary, flexShrink:0 }}/>}
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default UserContextMenu
