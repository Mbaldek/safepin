"use client"

import { useState } from "react"
import { ArrowLeft, Search, Plus, MoreHorizontal, Users, Lock } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/Avatar"
import { cn } from "@/lib/utils"

interface GroupsViewProps {
  onBack: () => void
}

const allGroups = [
  {
    id: 1,
    name: "Paris Front de Seine",
    type: "community",
    avatar: "🏠",
    members: 1,
    groups: 1,
    isPrivate: true,
    isMember: true,
  },
  {
    id: 2,
    name: "Noctambules 10ème",
    type: "group",
    avatar: "🌙",
    members: 24,
    description: "Sorties et retours sécurisés",
    isMember: true,
  },
  {
    id: 3,
    name: "Coureuses de Paris",
    type: "group",
    avatar: "🏃",
    members: 156,
    description: "Running sécurisé, de jour comme de nuit",
    isMember: true,
  },
  {
    id: 4,
    name: "Mamans du 15ème",
    type: "group",
    avatar: "👶",
    members: 89,
    description: "Sécurité des familles dans le quartier",
    isMember: false,
  },
  {
    id: 5,
    name: "Quartier Grenelle",
    type: "community",
    avatar: "🏘️",
    members: 45,
    description: "Entraide et sécurité dans le 15ème",
    isMember: false,
  },
  {
    id: 6,
    name: "Voisins Montmartre",
    type: "community",
    avatar: "🎨",
    members: 123,
    description: "Vigilance et bienveillance à Montmartre",
    isMember: false,
  },
  {
    id: 7,
    name: "Marais Solidaire",
    type: "community",
    avatar: "🌈",
    members: 234,
    description: "La communauté du Marais qui veille",
    isMember: false,
  },
]

type Filter = "all" | "groups" | "communities" | "mine"

export function GroupsView({ onBack }: GroupsViewProps) {
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
    <div className="min-h-screen flex flex-col items-center justify-end" style={{ backgroundColor: 'color-mix(in srgb, var(--surface-base) 80%, transparent)' }}>
      {/* Panel Container - anchored to bottom, centered, max-width */}
      <div className="w-full max-w-md rounded-t-3xl flex flex-col max-h-[90vh]" style={{ backgroundColor: 'var(--surface-card)', boxShadow: '0 -4px 30px rgba(0,0,0,0.15)' }}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--border-strong)' }} />
        </div>

        {/* Header */}
        <header className="px-4 pt-2 pb-2 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
          </button>
          <h1 className="text-xl font-semibold flex-1" style={{ color: 'var(--text-primary)' }}>Groupes & Communautés</h1>
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: 'var(--gradient-start)' }}
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        </header>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
            <input
              placeholder="Rechercher un groupe ou une communauté..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 h-10 rounded-xl border-0 text-sm outline-none"
              style={{
                backgroundColor: 'var(--surface-base)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          <FilterPill active={filter === "all"} onClick={() => setFilter("all")} label="Tous" />
          <FilterPill active={filter === "mine"} onClick={() => setFilter("mine")} label="Mes groupes" />
          <FilterPill active={filter === "groups"} onClick={() => setFilter("groups")} label="Groupes" />
          <FilterPill active={filter === "communities"} onClick={() => setFilter("communities")} label="Communautés" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Member Groups */}
          {memberGroups.length > 0 && (
            <div className="mb-4">
              <h3 className="px-4 text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Vos groupes
              </h3>
              <div>
                {memberGroups.map((group) => (
                  <GroupRow key={group.id} group={group} />
                ))}
              </div>
            </div>
          )}

          {/* Discover */}
          {discoverGroups.length > 0 && (
            <div>
              <h3 className="px-4 text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Découvrir
              </h3>
              <div>
                {discoverGroups.map((group) => (
                  <GroupRow key={group.id} group={group} showJoin />
                ))}
              </div>
            </div>
          )}

          {filteredGroups.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--surface-base)' }}>
                <Users className="w-8 h-8" style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <h3 className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Aucun résultat</h3>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                Essayez une autre recherche ou créez un nouveau groupe
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FilterPill({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
        active && "text-white"
      )}
      style={{
        backgroundColor: active ? 'var(--gradient-start)' : 'var(--surface-base)',
        color: active ? undefined : 'var(--text-tertiary)',
      }}
    >
      {label}
    </button>
  )
}

function GroupRow({
  group,
  showJoin = false,
}: {
  group: (typeof allGroups)[0]
  showJoin?: boolean
}) {
  return (
    <button
      className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
      style={{ borderBottom: '1px solid color-mix(in srgb, var(--border-default) 30%, transparent)' }}
    >
      <Avatar className="w-12 h-12 shrink-0" style={{ backgroundColor: 'var(--surface-base)' } as React.CSSProperties}>
        <AvatarFallback className="text-xl" style={{ backgroundColor: 'var(--surface-base)' } as React.CSSProperties}>{group.avatar}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{group.name}</span>
          {group.type === "community" && (
            <span
              className="text-[10px] px-1.5 py-0 rounded-full shrink-0 font-medium"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--gradient-start) 20%, transparent)',
                color: 'var(--gradient-start)',
              }}
            >
              Communauté
            </span>
          )}
          {group.isPrivate && <Lock className="w-3 h-3 shrink-0" style={{ color: 'var(--text-tertiary)' }} />}
        </div>
        <p className="text-sm truncate" style={{ color: 'var(--text-tertiary)' }}>
          {group.description || `${group.members} membre${group.members > 1 ? "s" : ""}`}
        </p>
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {group.members} membre{group.members > 1 ? "s" : ""}
          {group.groups && ` · ${group.groups} groupe${group.groups > 1 ? "s" : ""}`}
        </span>
      </div>
      {showJoin ? (
        <span
          className="px-4 py-1.5 rounded-full text-sm font-medium text-white transition-colors shrink-0 cursor-pointer"
          style={{ backgroundColor: 'var(--gradient-start)' }}
        >
          Rejoindre
        </span>
      ) : (
        <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer">
          <MoreHorizontal className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
        </span>
      )}
    </button>
  )
}
