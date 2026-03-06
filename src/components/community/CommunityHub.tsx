// DEPRECATED — Logique migrée vers les tab-composants individuels (groupes-tab, messages-tab, etc.).
// À supprimer une fois que tous les fixes sont validés en prod.
"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { Search, Plus, ChevronRight, MessageCircle, Users, Building2, X } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/Avatar"
import { cn, springTransition } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { useStore } from "@/stores/useStore"
import { useTheme } from "@/stores/useTheme"
import { toast } from "sonner"

function getColors(isDark: boolean) {
  return isDark ? {
    bg: '#0F172A', card: '#1E293B', elevated: '#334155',
    t1: '#FFFFFF', t2: '#94A3B8', t3: '#64748B',
    border: 'rgba(255,255,255,0.08)',
    inputBg: 'rgba(255,255,255,0.06)', hover: 'rgba(255,255,255,0.05)',
  } : {
    bg: '#F8FAFC', card: '#FFFFFF', elevated: '#F1F5F9',
    t1: '#0F172A', t2: '#475569', t3: '#94A3B8',
    border: 'rgba(15,23,42,0.07)',
    inputBg: 'rgba(15,23,42,0.04)', hover: 'rgba(15,23,42,0.03)',
  }
}

const F = {
  cyan: '#3BB4C1', cyanSoft: 'rgba(59,180,193,0.12)',
}

interface CommunityHubProps {
  onClose: () => void
  onViewAllGroups?: () => void
}

type Tab = "messages" | "groups" | "communities"

/* ── Helpers ───────────────────────────────────────────────── */

function timeAgo(d: string) {
  const s = (Date.now() - new Date(d).getTime()) / 1000
  if (s < 60) return "Maintenant"
  if (s < 3600) return `${Math.floor(s / 60)}min`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}j`
}

/* ── Types ─────────────────────────────────────────────────── */

interface DMRow {
  id: string
  partner_id: string
  partner_name: string
  partner_avatar: string | null
  last_message: string | null
  last_message_at: string
  is_unread: boolean
  is_group: boolean
}

interface GroupRow {
  id: string
  name: string
  avatar_emoji: string
  member_count: number
  description: string | null
}

interface CommunityRow {
  id: string
  name: string
  avatar_emoji: string
  member_count: number
  is_private: boolean
  group_count: number
}

/* ── Main Component ────────────────────────────────────────── */

export default function CommunityHub({ onClose, onViewAllGroups }: CommunityHubProps) {
  const { userId, unreadDmCount } = useStore()
  const isDark = useTheme((s) => s.theme) === 'dark'
  const C = getColors(isDark)
  const [activeTab, setActiveTab] = useState<Tab>("messages")
  const [searchQuery, setSearchQuery] = useState("")

  // Real data state
  const [dmConvos, setDmConvos] = useState<DMRow[]>([])
  const [myGroups, setMyGroups] = useState<GroupRow[]>([])
  const [nearbyGroups, setNearbyGroups] = useState<GroupRow[]>([])
  const [myCommunities, setMyCommunities] = useState<CommunityRow[]>([])
  const [discoverCommunities, setDiscoverCommunities] = useState<CommunityRow[]>([])
  const [memberships, setMemberships] = useState<Set<string>>(new Set())

  /* ── Fetch DM conversations ────────────────────────────── */
  useEffect(() => {
    if (!userId) return
    ;(async () => {
      const { data: convos } = await supabase
        .from("dm_conversations")
        .select("*")
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order("last_message_at", { ascending: false })
      if (!convos) return
      const partnerIds = convos.map(c => (c.user1_id === userId ? c.user2_id : c.user1_id))
      const { data: profiles } = await supabase.from("profiles").select("id,display_name,avatar_url").in("id", partnerIds)
      const pMap = new Map((profiles || []).map(p => [p.id, p]))
      setDmConvos(
        convos.map(c => {
          const pid = c.user1_id === userId ? c.user2_id : c.user1_id
          const p = pMap.get(pid)
          const readAt = c.user1_id === userId ? c.user1_last_read_at : c.user2_last_read_at
          return {
            id: c.id,
            partner_id: pid,
            partner_name: p?.display_name || "Utilisateur",
            partner_avatar: p?.avatar_url || null,
            last_message: c.last_message || null,
            last_message_at: c.last_message_at || c.created_at,
            is_unread: !readAt || new Date(c.last_message_at) > new Date(readAt),
            is_group: false,
          }
        })
      )
    })()
  }, [userId])

  /* ── Fetch communities & groups ────────────────────────── */
  useEffect(() => {
    if (!userId) return
    ;(async () => {
      const [{ data: items }, { data: members }, { data: subCounts }] = await Promise.all([
        supabase.from("communities").select("*").is("parent_community_id", null).order("created_at", { ascending: false }),
        supabase.from("community_members").select("community_id").eq("user_id", userId),
        supabase.from("communities").select("parent_community_id").not("parent_community_id", "is", null),
      ])
      const memberSet = new Set((members || []).map(m => m.community_id))
      setMemberships(memberSet)

      // Count sub-groups per parent
      const groupCounts: Record<string, number> = {}
      for (const s of subCounts || []) {
        if (s.parent_community_id) groupCounts[s.parent_community_id] = (groupCounts[s.parent_community_id] || 0) + 1
      }

      const allItems = items || []

      // Groups (community_type = 'group')
      const groups = allItems.filter(i => i.community_type === "group")
      setMyGroups(groups.filter(g => memberSet.has(g.id)).map(g => ({
        id: g.id, name: g.name, avatar_emoji: g.avatar_emoji || "👥",
        member_count: g.member_count || 0, description: g.description,
      })))
      setNearbyGroups(groups.filter(g => !memberSet.has(g.id)).slice(0, 6).map(g => ({
        id: g.id, name: g.name, avatar_emoji: g.avatar_emoji || "👥",
        member_count: g.member_count || 0, description: g.description,
      })))

      // Communities (community_type = 'community')
      const comms = allItems.filter(i => i.community_type === "community")
      setMyCommunities(comms.filter(c => memberSet.has(c.id)).map(c => ({
        id: c.id, name: c.name, avatar_emoji: c.avatar_emoji || "🏘️",
        member_count: c.member_count || 0, is_private: c.is_private,
        group_count: groupCounts[c.id] || 0,
      })))
      setDiscoverCommunities(comms.filter(c => !memberSet.has(c.id)).map(c => ({
        id: c.id, name: c.name, avatar_emoji: c.avatar_emoji || "🏘️",
        member_count: c.member_count || 0, is_private: c.is_private,
        group_count: groupCounts[c.id] || 0,
      })))
    })()
  }, [userId])

  /* ── Join handler ──────────────────────────────────────── */
  const handleJoin = async (communityId: string) => {
    if (!userId) return
    const { error } = await supabase.from("community_members").insert({ community_id: communityId, user_id: userId })
    if (error) { toast.error("Impossible de rejoindre"); return }
    setMemberships(prev => new Set([...prev, communityId]))
    toast.success("Rejoint !")
  }

  /* ── Search filter ─────────────────────────────────────── */
  const q = searchQuery.toLowerCase()
  const filteredDMs = dmConvos.filter(d => !q || d.partner_name.toLowerCase().includes(q))
  const filteredMyGroups = myGroups.filter(g => !q || g.name.toLowerCase().includes(q))
  const filteredMyCommunities = myCommunities.filter(c => !q || c.name.toLowerCase().includes(q))
  const filteredDiscover = discoverCommunities.filter(c => !q || c.name.toLowerCase().includes(q))

  const totalUnread = unreadDmCount || filteredDMs.filter(d => d.is_unread).length

  return (
    <motion.div
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={springTransition}
      className="fixed bottom-16 left-1/2 -translate-x-1/2 z-40 w-full rounded-t-3xl flex flex-col overflow-hidden"
      style={{ backgroundColor: C.card, boxShadow: "0 -4px 30px rgba(0,0,0,0.1)", maxHeight: "72dvh", maxWidth: 448 }}
    >
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-2">
        <div className="w-10 h-1 rounded-full" style={{ backgroundColor: C.border }} />
      </div>

      {/* Header */}
      <header className="px-5 pt-2 pb-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold" style={{ color: C.t1 }}>Communauté</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toast("Nouveau — bientôt disponible ✨")}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: F.cyan, color: '#fff', opacity: 0.5, cursor: 'default' }}
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 transition-colors"
            style={{ color: C.t3 }}
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* Search */}
      <div className="px-5 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.t3 }} />
          <input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 h-10 rounded-xl text-sm outline-none"
            style={{ backgroundColor: C.inputBg, color: C.t1, border: `1px solid ${C.border}` }}
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-5 flex gap-2 pb-3" style={{ borderBottom: `1px solid ${C.border}` }}>
        <TabButton active={activeTab === "messages"} onClick={() => setActiveTab("messages")}
          icon={<MessageCircle className="w-4 h-4" />} label="Messages" count={totalUnread} C={C} />
        <TabButton active={activeTab === "groups"} onClick={() => setActiveTab("groups")}
          icon={<Users className="w-4 h-4" />} label="Groupes" C={C} />
        <TabButton active={activeTab === "communities"} onClick={() => setActiveTab("communities")}
          icon={<Building2 className="w-4 h-4" />} label="Communautés" C={C} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {activeTab === "messages" && (
          <div>
            {filteredDMs.length === 0 && (
              <div className="flex flex-col items-center py-14 gap-2">
                <span className="text-4xl">💬</span>
                <p className="text-sm font-medium" style={{ color: C.t2 }}>Aucune conversation</p>
                <p className="text-xs" style={{ color: C.t3 }}>Envoyez un message pour commencer</p>
              </div>
            )}
            {filteredDMs.map((dm) => (
              <button
                key={dm.id}
                onClick={() => toast(`${dm.partner_name} — bientôt disponible ✨`)}
                className="w-full flex items-center gap-3 px-5 py-3 transition-colors text-left"
                style={{ borderBottom: `1px solid ${C.border}`, opacity: 0.5, cursor: 'default' }}
              >
                <div className="relative">
                  <Avatar className="w-12 h-12" style={{ backgroundColor: C.elevated } as React.CSSProperties}>
                    <AvatarFallback className="relative text-lg" style={{ backgroundColor: C.elevated, color: C.t1 } as React.CSSProperties}>
                      {dm.partner_avatar
                        ? <Image src={dm.partner_avatar} alt="" fill className="object-cover rounded-full" />
                        : dm.partner_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={cn("truncate", dm.is_unread ? "font-semibold" : "font-medium")} style={{ color: C.t1 }}>{dm.partner_name}</span>
                    <span className="text-xs ml-2 shrink-0" style={{ color: C.t3 }}>{timeAgo(dm.last_message_at)}</span>
                  </div>
                  <p className="text-sm truncate mt-0.5" style={{ color: C.t3 }}>
                    {dm.last_message || "Nouvelle conversation"}
                  </p>
                </div>
                {dm.is_unread && (
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: F.cyan }} />
                )}
              </button>
            ))}
          </div>
        )}

        {activeTab === "groups" && (
          <div className="px-5 py-3">
            {/* Mon Cercle */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: C.t3 }}>Mon Cercle</h3>
                <button onClick={() => toast("Inviter — bientôt disponible ✨")} className="text-xs font-medium" style={{ color: F.cyan, opacity: 0.5, cursor: 'default' }}>Inviter</button>
              </div>
              <button onClick={() => toast("Mes proches — bientôt disponible ✨")} className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors"
                style={{ backgroundColor: C.hover, opacity: 0.5, cursor: 'default' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: F.cyanSoft }}>
                  <span className="text-lg">💛</span>
                </div>
                <div className="flex-1 text-left">
                  <span className="font-medium" style={{ color: C.t1 }}>Mes proches</span>
                  <p className="text-xs" style={{ color: C.t3 }}>Cercle de confiance</p>
                </div>
                <ChevronRight className="w-4 h-4" style={{ color: C.t3 }} />
              </button>
            </div>

            {/* Mes Groupes */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: C.t3 }}>Mes Groupes</h3>
                <button onClick={onViewAllGroups} className="text-xs font-medium" style={{ color: F.cyan }}>Voir tout</button>
              </div>
              {filteredMyGroups.length === 0 && (
                <div className="flex flex-col items-center py-10 gap-2">
                  <span className="text-3xl">👥</span>
                  <p className="text-sm font-medium" style={{ color: C.t2 }}>Aucun groupe rejoint</p>
                </div>
              )}
              <div className="space-y-1">
                {filteredMyGroups.map((group) => (
                  <button key={group.id} onClick={() => toast(`${group.name} — bientôt disponible ✨`)} className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors" style={{ opacity: 0.5, cursor: 'default' }}>
                    <Avatar className="w-10 h-10" style={{ backgroundColor: C.elevated } as React.CSSProperties}>
                      <AvatarFallback className="text-lg" style={{ backgroundColor: C.elevated } as React.CSSProperties}>{group.avatar_emoji}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <span className="font-medium" style={{ color: C.t1 }}>{group.name}</span>
                      <p className="text-xs" style={{ color: C.t3 }}>{group.member_count} membres</p>
                    </div>
                    <ChevronRight className="w-4 h-4" style={{ color: C.t3 }} />
                  </button>
                ))}
              </div>
            </div>

            {/* Autour de vous */}
            {nearbyGroups.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-2" style={{ color: C.t3 }}>Autour de vous</h3>
                <div className="grid grid-cols-3 gap-2">
                  {nearbyGroups.slice(0, 3).map((g) => (
                    <button key={g.id} onClick={() => handleJoin(g.id)}
                      className="flex flex-col items-center p-3 rounded-xl transition-colors"
                      style={{ backgroundColor: C.hover }}>
                      <span className="text-2xl mb-1">{g.avatar_emoji}</span>
                      <span className="text-xs font-medium truncate w-full text-center" style={{ color: C.t1 }}>{g.name}</span>
                      <span className="text-xs" style={{ color: C.t3 }}>{g.member_count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "communities" && (
          <div className="px-5 py-3">
            {/* Vos communautés */}
            <div className="mb-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-2" style={{ color: C.t3 }}>Vos communautés</h3>
              {filteredMyCommunities.length === 0 && (
                <div className="flex flex-col items-center py-10 gap-2">
                  <span className="text-3xl">🏘️</span>
                  <p className="text-sm font-medium" style={{ color: C.t2 }}>Aucune communauté rejointe</p>
                </div>
              )}
              <div className="space-y-1">
                {filteredMyCommunities.map((c) => (
                  <button key={c.id} onClick={() => toast(`${c.name} — bientôt disponible ✨`)} className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors" style={{ opacity: 0.5, cursor: 'default' }}>
                    <Avatar className="w-10 h-10" style={{ backgroundColor: C.elevated } as React.CSSProperties}>
                      <AvatarFallback className="text-lg" style={{ backgroundColor: C.elevated } as React.CSSProperties}>{c.avatar_emoji}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium" style={{ color: C.t1 }}>{c.name}</span>
                        {c.is_private && (
                          <span className="text-[10px] px-1.5 py-0 rounded-full" style={{ border: `1px solid ${C.border}`, color: C.t3 }}>
                            Privé
                          </span>
                        )}
                      </div>
                      <p className="text-xs" style={{ color: C.t3 }}>
                        {c.member_count} membre{c.member_count > 1 ? "s" : ""} · {c.group_count} groupe{c.group_count > 1 ? "s" : ""}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4" style={{ color: C.t3 }} />
                  </button>
                ))}
              </div>
            </div>

            {/* Découvrir */}
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-2" style={{ color: C.t3 }}>Découvrir</h3>
              {filteredDiscover.length === 0 && (
                <div className="flex flex-col items-center py-10 gap-2">
                  <span className="text-3xl">🎉</span>
                  <p className="text-sm font-medium" style={{ color: C.t2 }}>Toutes les communautés sont rejointes</p>
                </div>
              )}
              <div className="space-y-1">
                {filteredDiscover.map((c) => (
                  <button key={c.id} onClick={() => handleJoin(c.id)}
                    className="w-full flex items-center justify-between p-3 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                        style={{ backgroundColor: C.elevated }}>
                        {c.avatar_emoji}
                      </div>
                      <div className="text-left">
                        <span className="font-medium" style={{ color: C.t1 }}>{c.name}</span>
                        <p className="text-xs" style={{ color: C.t3 }}>{c.member_count} membres</p>
                      </div>
                    </div>
                    <span className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                      style={{ backgroundColor: F.cyan, color: '#fff' }}>
                      Rejoindre
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ── SOSPostCard ──────────────────────────────────────────── */

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
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: resolved ? successSoft : dangerSoft,
            border: `2px solid ${resolved ? 'rgba(52,211,153,0.3)' : 'rgba(240,64,96,0.3)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15,
          }}>
            {post.is_anonymous ? '\uD83C\uDF3A' : (post.author_emoji || '\uD83D\uDC64')}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
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
              onClick={() => toast("Commentaires bient\u00F4t disponibles")}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 12, color: 'var(--text-tertiary)',
              }}
            >
              <MessageCircle size={14} /> Soutien
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
    </div>
  )
}

/* ── Tab Button ────────────────────────────────────────────── */

function TabButton({ active, onClick, icon, label, count, C }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number
  C: ReturnType<typeof getColors>
}) {
  return (
    <button
      onClick={onClick}
      className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors")}
      style={{
        backgroundColor: active ? F.cyan : C.bg,
        color: active ? '#fff' : C.t3,
      }}
    >
      {icon}
      <span>{label}</span>
      {count != null && count > 0 && (
        <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full min-w-[18px] text-center"
          style={{
            backgroundColor: active ? "rgba(255,255,255,0.2)" : F.cyan,
            color: '#fff',
          }}>
          {count}
        </span>
      )}
    </button>
  )
}
