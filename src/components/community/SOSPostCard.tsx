"use client"

import { useState } from "react"
import { useTheme } from "@/stores/useTheme"
import { useUiStore } from "@/stores/uiStore"
import SoutienSheet from "./SoutienSheet"

interface SOSPost {
  id: string
  author_id: string
  content: string
  type: string
  sos_id: string
  status: string
  visibility: string
  is_anonymous: boolean
  metadata: Record<string, any> | null
  created_at: string
  author_name?: string | null
  author_emoji?: string | null
}

export function SOSPostCard({ post, currentUserId }: { post: SOSPost; currentUserId: string | null }) {
  const isDark = useTheme((s) => s.theme) === 'dark'
  const { openContextMenu, openProfile } = useUiStore()
  const [showSoutien, setShowSoutien] = useState(false)
  const resolved = post.status === 'resolved'
  const isCircle = post.visibility === 'circle'

  const dangerColor = '#F04060'
  const dangerSoft = 'rgba(240,64,96,0.10)'
  const dangerMid = 'rgba(240,64,96,0.22)'
  const successColor = 'var(--semantic-success)'
  const successSoft = 'var(--semantic-success-soft)'
  const teal = '#3BB4C1'
  const tealSoft = 'rgba(59,180,193,0.10)'

  const triggeredAt = post.metadata?.triggeredAt
  const timeStr = triggeredAt
    ? new Date(triggeredAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')
    : ''

  const label: string = post.metadata?.label ?? ''
  const arrondissement = label.match(/(\d+)e/i)?.[1] ?? null

  const circleAvatars: string[] = post.metadata?.circleMembers ?? []

  return (
    <div style={{
      background: 'var(--surface-card)',
      border: `1px solid ${resolved ? 'var(--border-default)' : dangerMid}`,
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: resolved
        ? 'none'
        : `0 0 0 3px rgba(240,64,96,0.05), 0 6px 24px rgba(240,64,96,0.10)`,
      transition: 'all 0.4s ease',
    }}>
      {/* Banner */}
      <div style={{
        padding: '7px 13px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: resolved
          ? successSoft
          : `linear-gradient(90deg, rgba(240,64,96,0.10), rgba(240,64,96,0.05))`,
        borderBottom: `1px solid ${resolved ? 'rgba(52,211,153,0.28)' : 'rgba(240,64,96,0.20)'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {resolved ? (
            <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: successColor }}>
              {'\u2713'} Situation r{'\u00E9'}solue
            </span>
          ) : (
            <>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: dangerColor,
                animation: 'pulse 2s ease-in-out infinite',
              }} />
              <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: dangerColor }}>
                Alerte SOS active
              </span>
            </>
          )}
        </div>
        {timeStr && (
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{timeStr}</span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '12px 13px 9px' }}>
        {/* Author row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div
            onClick={(e) => {
              e.stopPropagation()
              if (post.is_anonymous) return
              if (post.author_id === currentUserId) {
                openProfile(post.author_id)
              } else if (post.author_id) {
                openContextMenu({ userId: post.author_id, username: post.author_name || '', displayName: post.author_name || '' })
              }
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: post.is_anonymous ? 'default' : 'pointer' }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: resolved ? successSoft : dangerSoft,
              border: `2px solid ${resolved ? 'rgba(52,211,153,0.3)' : 'rgba(240,64,96,0.3)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15,
            }}>
              {post.is_anonymous ? '\uD83C\uDF3A' : (post.author_emoji || '\uD83D\uDC64')}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: 13, fontWeight: 600,
                  color: isDark ? '#FFFFFF' : '#0F172A',
                }}>
                  {post.is_anonymous ? 'Utilisatrice anonyme' : (post.author_name || 'Membre')}
                </span>
                {isCircle && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 6,
                    background: tealSoft, color: teal,
                  }}>Cercle</span>
                )}
              </div>
              {label && (
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{label}</span>
              )}
            </div>
          </div>
        </div>

        {/* Alert box */}
        <div style={{
          padding: '10px 12px', borderRadius: 12, marginBottom: 10,
          background: resolved ? successSoft : dangerSoft,
          border: `1px solid ${resolved ? 'rgba(52,211,153,0.22)' : dangerMid}`,
        }}>
          {resolved ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: successColor, marginBottom: 3 }}>
                {'\u2713'} Je suis en s{'\u00E9'}curit{'\u00E9'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                Situation r{'\u00E9'}solue. Merci {'\u00E0'} tous {'\uD83D\uDC99'}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: dangerColor, marginBottom: 3 }}>
                {'\uD83D\uDEA8'} A d{'\u00E9'}clench{'\u00E9'} une alerte SOS
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                Alerte d{'\u00E9'}clench{'\u00E9'}e {'\u00B7'} Position partag{'\u00E9'}e
              </div>
            </>
          )}
        </div>

        {/* Hashtags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {['#SOS', ...(arrondissement ? [`#Paris${arrondissement}e`] : []), '#Urgence'].map(tag => (
            <span key={tag} style={{
              fontSize: 11, fontWeight: 700, color: teal,
              background: tealSoft, padding: '2px 8px', borderRadius: 8,
            }}>{tag}</span>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 8,
          borderTop: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setShowSoutien(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 12, color: 'var(--text-tertiary)',
              }}
            >
              {'\uD83E\uDEC2'} Soutien
            </button>
          </div>

          {/* Circle member avatars */}
          {circleAvatars.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {circleAvatars.slice(0, 5).map((_, i) => (
                <div key={i} style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: isDark ? '#334155' : '#E2E8F0',
                  border: '2px solid var(--surface-card)',
                  marginLeft: i === 0 ? 0 : -7,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: isDark ? '#94A3B8' : '#64748B',
                }}>
                  {'\uD83D\uDC64'}
                </div>
              ))}
              {circleAvatars.length > 5 && (
                <span style={{
                  fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 4,
                }}>+{circleAvatars.length - 5}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {showSoutien && (
        <SoutienSheet postId={post.id} onClose={() => setShowSoutien(false)} />
      )}
    </div>
  )
}
