"use client"

import { useState } from "react"
import { ArrowLeft, Search, Plus, MoreHorizontal, Users, Lock } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/Avatar"
import { cn } from "@/lib/utils"
import { useTheme } from "@/stores/useTheme"

function getColors(isDark: boolean) {
  return isDark ? {
    surfaceBase: '#0F172A',
    surfaceCard: '#1E293B',
    borderStrong: 'rgba(255,255,255,0.20)',
    borderDefault: 'rgba(255,255,255,0.12)',
    textPrimary: '#FFFFFF',
    textTertiary: '#64748B',
    gradientStart: '#3BB4C1',
  } : {
    surfaceBase: '#F8FAFC',
    surfaceCard: '#FFFFFF',
    borderStrong: 'rgba(15,23,42,0.20)',
    borderDefault: 'rgba(15,23,42,0.10)',
    textPrimary: '#0F172A',
    textTertiary: '#94A3B8',
    gradientStart: '#3BB4C1',
  };
}

interface GroupsViewProps {
  onBack: () => void
}

const allGroups = [
  {
    id: 1,
    name: "Paris Front de Seine",
    type: "community",
    avatar: "\u{1F3E0}",
    members: 1,
    groups: 1,
    isPrivate: true,
    isMember: true,
  },
  {
    id: 2,
    name: "Noctambules 10\u00e8me",
    type: "group",
    avatar: "\u{1F319}",
    members: 24,
    description: "Sorties et retours s\u00e9curis\u00e9s",
    isMember: true,
  },
  {
    id: 3,
    name: "Coureuses de Paris",
    type: "group",
    avatar: "\u{1F3C3}",
    members: 156,
    description: "Running s\u00e9curis\u00e9, de jour comme de nuit",
    isMember: true,
  },
  {
    id: 4,
    name: "Mamans du 15\u00e8me",
    type: "group",
    avatar: "\u{1F476}",
    members: 89,
    description: "S\u00e9curit\u00e9 des familles dans le quartier",
    isMember: false,
  },
  {
    id: 5,
    name: "Quartier Grenelle",
    type: "community",
    avatar: "\u{1F3D8}\uFE0F",
    members: 45,
    description: "Entraide et s\u00e9curit\u00e9 dans le 15\u00e8me",
    isMember: false,
  },
  {
    id: 6,
    name: "Voisins Montmartre",
    type: "community",
    avatar: "\u{1F3A8}",
    members: 123,
    description: "Vigilance et bienveillance \u00e0 Montmartre",
    isMember: false,
  },
  {
    id: 7,
    name: "Marais Solidaire",
    type: "community",
    avatar: "\u{1F308}",
    members: 234,
    description: "La communaut\u00e9 du Marais qui veille",
    isMember: false,
  },
]

type Filter = "all" | "groups" | "communities" | "mine"

export function GroupsView({ onBack }: GroupsViewProps) {
  const isDark = useTheme(s => s.theme) === 'dark'
  const c = getColors(isDark)
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")

  const filteredGroups = allGroups.filter((group) => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter =
      filter === "all" ||
      (filter === "groups" && group.type === "group") ||
      (filter === "communities" && group.type === "community") ||
      (filter === "mine" && group.isMember)
    return matchesSearch && matchesFilter
  })

  const memberGroups = filteredGroups.filter((g) => g.isMember)
  const discoverGroups = filteredGroups.filter((g) => !g.isMember)

  return (
    <div className="min-h-screen flex flex-col items-center justify-end" style={{ backgroundColor: `color-mix(in srgb, ${c.surfaceBase} 80%, transparent)` }}>
      <div className="w-full max-w-md rounded-t-3xl flex flex-col max-h-[90vh]" style={{ backgroundColor: c.surfaceCard, boxShadow: '0 -4px 30px rgba(0,0,0,0.15)' }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: c.borderStrong }} />
        </div>

        <header className="px-4 pt-2 pb-2 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: c.textPrimary }} />
          </button>
          <h1 className="text-xl font-semibold flex-1" style={{ color: c.textPrimary }}>Groupes & Communaut\u00e9s</h1>
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: c.gradientStart }}
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        </header>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: c.textTertiary }} />
            <input
              placeholder="Rechercher un groupe ou une communaut\u00e9..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 h-10 rounded-xl border-0 text-sm outline-none"
              style={{
                backgroundColor: c.surfaceBase,
                color: c.textPrimary,
              }}
            />
          </div>
        </div>

        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          <FilterPill active={filter === "all"} onClick={() => setFilter("all")} label="Tous" colors={c} />
          <FilterPill active={filter === "mine"} onClick={() => setFilter("mine")} label="Mes groupes" colors={c} />
          <FilterPill active={filter === "groups"} onClick={() => setFilter("groups")} label="Groupes" colors={c} />
          <FilterPill active={filter === "communities"} onClick={() => setFilter("communities")} label="Communaut\u00e9s" colors={c} />
        </div>

        <div className="flex-1 overflow-y-auto">
          {memberGroups.length > 0 && (
            <div className="mb-4">
              <h3 className="px-4 text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: c.textTertiary }}>
                Vos groupes
              </h3>
              <div>
                {memberGroups.map((group) => (
                  <GroupRow key={group.id} group={group} colors={c} />
                ))}
              </div>
            </div>
          )}

          {discoverGroups.length > 0 && (
            <div>
              <h3 className="px-4 text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: c.textTertiary }}>
                D\u00e9couvrir
              </h3>
              <div>
                {discoverGroups.map((group) => (
                  <GroupRow key={group.id} group={group} showJoin colors={c} />
                ))}
              </div>
            </div>
          )}

          {filteredGroups.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: c.surfaceBase }}>
                <Users className="w-8 h-8" style={{ color: c.textTertiary }} />
              </div>
              <h3 className="font-medium mb-1" style={{ color: c.textPrimary }}>Aucun r\u00e9sultat</h3>
              <p className="text-sm" style={{ color: c.textTertiary }}>
                Essayez une autre recherche ou cr\u00e9ez un nouveau groupe
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

type Colors = ReturnType<typeof getColors>

function FilterPill({
  active,
  onClick,
  label,
  colors: c,
}: {
  active: boolean
  onClick: () => void
  label: string
  colors: Colors
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
        active && "text-white"
      )}
      style={{
        backgroundColor: active ? c.gradientStart : c.surfaceBase,
        color: active ? undefined : c.textTertiary,
      }}
    >
      {label}
    </button>
  )
}

function GroupRow({
  group,
  showJoin = false,
  colors: c,
}: {
  group: (typeof allGroups)[0]
  showJoin?: boolean
  colors: Colors
}) {
  return (
    <button
      className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
      style={{ borderBottom: `1px solid color-mix(in srgb, ${c.borderDefault} 30%, transparent)` }}
    >
      <Avatar className="w-12 h-12 shrink-0" style={{ backgroundColor: c.surfaceBase } as React.CSSProperties}>
        <AvatarFallback className="text-xl" style={{ backgroundColor: c.surfaceBase } as React.CSSProperties}>{group.avatar}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate" style={{ color: c.textPrimary }}>{group.name}</span>
          {group.type === "community" && (
            <span
              className="text-[10px] px-1.5 py-0 rounded-full shrink-0 font-medium"
              style={{
                backgroundColor: `color-mix(in srgb, ${c.gradientStart} 20%, transparent)`,
                color: c.gradientStart,
              }}
            >
              Communaut\u00e9
            </span>
          )}
          {group.isPrivate && <Lock className="w-3 h-3 shrink-0" style={{ color: c.textTertiary }} />}
        </div>
        <p className="text-sm truncate" style={{ color: c.textTertiary }}>
          {group.description || `${group.members} membre${group.members > 1 ? "s" : ""}`}
        </p>
        <span className="text-xs" style={{ color: c.textTertiary }}>
          {group.members} membre{group.members > 1 ? "s" : ""}
          {group.groups && ` \u00b7 ${group.groups} groupe${group.groups > 1 ? "s" : ""}`}
        </span>
      </div>
      {showJoin ? (
        <span
          className="px-4 py-1.5 rounded-full text-sm font-medium text-white transition-colors shrink-0 cursor-pointer"
          style={{ backgroundColor: c.gradientStart }}
        >
          Rejoindre
        </span>
      ) : (
        <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer">
          <MoreHorizontal className="w-5 h-5" style={{ color: c.textTertiary }} />
        </span>
      )}
    </button>
  )
}
