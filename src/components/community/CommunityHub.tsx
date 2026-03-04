"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Search, Plus, ChevronRight, MessageCircle, Users, Building2, X } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/Avatar"
import { cn, springTransition } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { useStore } from "@/stores/useStore"
import { toast } from "sonner"

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
      className="fixed bottom-16 left-1/2 -translate-x-1/2 z-40 w-full max-w-md rounded-t-3xl flex flex-col overflow-hidden"
      style={{ backgroundColor: "var(--surface-card)", boxShadow: "0 -4px 30px rgba(0,0,0,0.1)", maxHeight: "72dvh" }}
    >
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-2">
        <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "var(--border-strong)" }} />
      </div>

      {/* Header */}
      <header className="px-5 pt-2 pb-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Communauté</h1>
        <div className="flex items-center gap-2">
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: "var(--gradient-start)" }}
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={onClose}
            className="p-1 transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* Search */}
      <div className="px-5 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
          <input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 h-10 rounded-xl text-sm outline-none"
            style={{ backgroundColor: "var(--surface-base)", color: "var(--text-primary)", border: "1px solid var(--border-default)" }}
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-5 flex gap-2 pb-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <TabButton active={activeTab === "messages"} onClick={() => setActiveTab("messages")}
          icon={<MessageCircle className="w-4 h-4" />} label="Messages" count={totalUnread} />
        <TabButton active={activeTab === "groups"} onClick={() => setActiveTab("groups")}
          icon={<Users className="w-4 h-4" />} label="Groupes" />
        <TabButton active={activeTab === "communities"} onClick={() => setActiveTab("communities")}
          icon={<Building2 className="w-4 h-4" />} label="Communautés" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {activeTab === "messages" && (
          <div>
            {filteredDMs.length === 0 && (
              <div className="flex flex-col items-center py-14 gap-2">
                <span className="text-4xl">💬</span>
                <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Aucune conversation</p>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Envoyez un message pour commencer</p>
              </div>
            )}
            {filteredDMs.map((dm) => (
              <button
                key={dm.id}
                className="w-full flex items-center gap-3 px-5 py-3 transition-colors text-left"
                style={{ borderBottom: "1px solid color-mix(in srgb, var(--border-default) 50%, transparent)" }}
              >
                <div className="relative">
                  <Avatar className="w-12 h-12" style={{ backgroundColor: "var(--surface-elevated)" } as React.CSSProperties}>
                    <AvatarFallback className="text-lg" style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-primary)" } as React.CSSProperties}>
                      {dm.partner_avatar
                        ? <img src={dm.partner_avatar} alt="" className="w-full h-full object-cover rounded-full" />
                        : dm.partner_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={cn("truncate", dm.is_unread ? "font-semibold" : "font-medium")} style={{ color: "var(--text-primary)" }}>{dm.partner_name}</span>
                    <span className="text-xs ml-2 shrink-0" style={{ color: "var(--text-tertiary)" }}>{timeAgo(dm.last_message_at)}</span>
                  </div>
                  <p className="text-sm truncate mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                    {dm.last_message || "Nouvelle conversation"}
                  </p>
                </div>
                {dm.is_unread && (
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: "var(--gradient-start)" }} />
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
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--text-tertiary)" }}>Mon Cercle</h3>
                <button className="text-xs font-medium" style={{ color: "var(--gradient-start)" }}>Inviter</button>
              </div>
              <button className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors"
                style={{ backgroundColor: "color-mix(in srgb, var(--surface-card) 50%, transparent)" }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "color-mix(in srgb, var(--gradient-start) 20%, transparent)" }}>
                  <span className="text-lg">💛</span>
                </div>
                <div className="flex-1 text-left">
                  <span className="font-medium" style={{ color: "var(--text-primary)" }}>Mes proches</span>
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Cercle de confiance</p>
                </div>
                <ChevronRight className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
              </button>
            </div>

            {/* Mes Groupes */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--text-tertiary)" }}>Mes Groupes</h3>
                <button onClick={onViewAllGroups} className="text-xs font-medium" style={{ color: "var(--gradient-start)" }}>Voir tout</button>
              </div>
              {filteredMyGroups.length === 0 && (
                <div className="flex flex-col items-center py-10 gap-2">
                  <span className="text-3xl">👥</span>
                  <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Aucun groupe rejoint</p>
                </div>
              )}
              <div className="space-y-1">
                {filteredMyGroups.map((group) => (
                  <button key={group.id} className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors">
                    <Avatar className="w-10 h-10" style={{ backgroundColor: "var(--surface-elevated)" } as React.CSSProperties}>
                      <AvatarFallback className="text-lg" style={{ backgroundColor: "var(--surface-elevated)" } as React.CSSProperties}>{group.avatar_emoji}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <span className="font-medium" style={{ color: "var(--text-primary)" }}>{group.name}</span>
                      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{group.member_count} membres</p>
                    </div>
                    <ChevronRight className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
                  </button>
                ))}
              </div>
            </div>

            {/* Autour de vous */}
            {nearbyGroups.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-2" style={{ color: "var(--text-tertiary)" }}>Autour de vous</h3>
                <div className="grid grid-cols-3 gap-2">
                  {nearbyGroups.slice(0, 3).map((g) => (
                    <button key={g.id} onClick={() => handleJoin(g.id)}
                      className="flex flex-col items-center p-3 rounded-xl transition-colors"
                      style={{ backgroundColor: "color-mix(in srgb, var(--surface-card) 50%, transparent)" }}>
                      <span className="text-2xl mb-1">{g.avatar_emoji}</span>
                      <span className="text-xs font-medium truncate w-full text-center" style={{ color: "var(--text-primary)" }}>{g.name}</span>
                      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{g.member_count}</span>
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
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-2" style={{ color: "var(--text-tertiary)" }}>Vos communautés</h3>
              {filteredMyCommunities.length === 0 && (
                <div className="flex flex-col items-center py-10 gap-2">
                  <span className="text-3xl">🏘️</span>
                  <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Aucune communauté rejointe</p>
                </div>
              )}
              <div className="space-y-1">
                {filteredMyCommunities.map((c) => (
                  <button key={c.id} className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors">
                    <Avatar className="w-10 h-10" style={{ backgroundColor: "var(--surface-elevated)" } as React.CSSProperties}>
                      <AvatarFallback className="text-lg" style={{ backgroundColor: "var(--surface-elevated)" } as React.CSSProperties}>{c.avatar_emoji}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium" style={{ color: "var(--text-primary)" }}>{c.name}</span>
                        {c.is_private && (
                          <span className="text-[10px] px-1.5 py-0 rounded-full" style={{ border: "1px solid var(--border-default)", color: "var(--text-tertiary)" }}>
                            Privé
                          </span>
                        )}
                      </div>
                      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        {c.member_count} membre{c.member_count > 1 ? "s" : ""} · {c.group_count} groupe{c.group_count > 1 ? "s" : ""}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
                  </button>
                ))}
              </div>
            </div>

            {/* Découvrir */}
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-2" style={{ color: "var(--text-tertiary)" }}>Découvrir</h3>
              {filteredDiscover.length === 0 && (
                <div className="flex flex-col items-center py-10 gap-2">
                  <span className="text-3xl">🎉</span>
                  <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Toutes les communautés sont rejointes</p>
                </div>
              )}
              <div className="space-y-1">
                {filteredDiscover.map((c) => (
                  <button key={c.id} onClick={() => handleJoin(c.id)}
                    className="w-full flex items-center justify-between p-3 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                        style={{ backgroundColor: "var(--surface-elevated)" }}>
                        {c.avatar_emoji}
                      </div>
                      <div className="text-left">
                        <span className="font-medium" style={{ color: "var(--text-primary)" }}>{c.name}</span>
                        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{c.member_count} membres</p>
                      </div>
                    </div>
                    <span className="px-3 py-1.5 rounded-full text-xs font-medium text-white transition-colors"
                      style={{ backgroundColor: "var(--gradient-start)" }}>
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

/* ── Tab Button ────────────────────────────────────────────── */

function TabButton({ active, onClick, icon, label, count }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number
}) {
  return (
    <button
      onClick={onClick}
      className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors", active && "text-white")}
      style={{
        backgroundColor: active ? "var(--gradient-start)" : "var(--surface-base)",
        color: active ? undefined : "var(--text-tertiary)",
      }}
    >
      {icon}
      <span>{label}</span>
      {count != null && count > 0 && (
        <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full min-w-[18px] text-center"
          style={{
            backgroundColor: active ? "rgba(255,255,255,0.2)" : "var(--gradient-start)",
            color: "white",
          }}>
          {count}
        </span>
      )}
    </button>
  )
}
