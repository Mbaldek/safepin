"use client"

import { useState, useCallback } from "react"
import { ProgressBar } from "./progress-bar"

interface Contact {
  id: string
  name: string
  initial: string
}

const SUGGESTED_CONTACTS: Contact[] = [
  { id: "1", name: "Clara Martin", initial: "C" },
  { id: "2", name: "Lucas Dubois", initial: "L" },
  { id: "3", name: "Marie Laurent", initial: "M" },
  { id: "4", name: "Hugo Bernard", initial: "H" },
]

function AvatarCircle({ initial }: { initial: string }) {
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] font-bold"
      style={{
        background: "linear-gradient(135deg, #E8A838 0%, #8B7EC8 100%)",
        color: "#FFFFFF",
      }}
    >
      {initial}
    </div>
  )
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.35)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function RemoveIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.35)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function AddCircle() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [query, setQuery] = useState("")
  const [showToast, setShowToast] = useState(false)

  const filteredSuggestions = query.length > 0
    ? SUGGESTED_CONTACTS.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) &&
          !contacts.some((added) => added.id === c.id)
      )
    : []

  const addContact = useCallback(
    (contact: Contact) => {
      if (contacts.some((c) => c.id === contact.id)) return
      setContacts((prev) => [...prev, contact])
      setQuery("")
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    },
    [contacts]
  )

  const removeContact = useCallback((id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id))
  }, [])

  return (
    <div className="flex h-full flex-col">
      {/* Progress bar */}
      <div className="px-6 pt-3">
        <ProgressBar progress={90} />
      </div>

      <div className="flex flex-1 flex-col px-6 pb-6">
        {/* Skip */}
        <div className="flex justify-end pt-5 pb-6">
          <button
            type="button"
            className="text-[13px] font-sans transition-colors hover:text-foreground"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            Skip
          </button>
        </div>

        {/* Heading */}
        <h1 className="font-serif text-[26px] font-light leading-tight text-foreground text-balance">
          Ajoutez vos proches
        </h1>
        <p
          className="mt-2 mb-6 text-[14px] font-sans leading-relaxed"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          {"Votre cercle \u2014 les amis et la famille avec qui vous partagez vos trajets et gardez le contact.\u00A0"}
          <span className="not-italic">{"💛"}</span>
        </p>

        {/* Search input */}
        <div className="relative mb-5">
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            <SearchIcon />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={"Nom ou num\u00E9ro de t\u00E9l\u00E9phone"}
            className="w-full rounded-[12px] border py-3 pl-9 pr-4 text-[14px] font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            style={{
              backgroundColor: "rgba(255,255,255,0.04)",
              borderColor: "rgba(255,255,255,0.08)",
            }}
          />

          {/* Autocomplete dropdown */}
          {filteredSuggestions.length > 0 && (
            <div
              className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-[12px] border"
              style={{
                backgroundColor: "#1F2D4D",
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              {filteredSuggestions.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => addContact(contact)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[rgba(255,255,255,0.04)]"
                >
                  <AvatarCircle initial={contact.initial} />
                  <span className="text-[14px] text-foreground">
                    {contact.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Contact list or empty state */}
        <div className="flex-1">
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <span className="text-[32px] mb-3">{"💛"}</span>
              <p className="text-[14px] font-medium text-foreground">
                {"Vos proches appara\u00EEtront ici"}
              </p>
              <p
                className="mt-1 text-center text-[13px] font-sans leading-relaxed"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                {"Partagez vos trajets, marchez\nensemble, gardez le contact"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {contacts.map((contact, i) => (
                <div
                  key={contact.id}
                  className="animate-fade-in-up flex items-center gap-3 rounded-[12px] border px-3 py-2.5"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.04)",
                    borderColor: "rgba(255,255,255,0.08)",
                    animationDelay: `${i * 60}ms`,
                  }}
                >
                  <AvatarCircle initial={contact.initial} />
                  <span className="flex-1 text-[14px] text-foreground">
                    {contact.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeContact(contact.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-[rgba(255,255,255,0.08)]"
                    aria-label={`Retirer ${contact.name}`}
                  >
                    <RemoveIcon />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Toast */}
        {showToast && (
          <div
            className="animate-fade-in-up mb-4 rounded-[12px] border px-4 py-3 text-[13px] font-sans leading-relaxed"
            style={{
              backgroundColor: "rgba(107,166,142,0.1)",
              borderColor: "rgba(107,166,142,0.2)",
              color: "#6BA68E",
            }}
          >
            {"🎉 Ils recevront une invitation \u00E0 rejoindre Breveil\u00A0!"}
          </div>
        )}

        {/* Continue button */}
        <button
          type="button"
          className="w-full rounded-[14px] bg-primary py-4 text-[15px] font-bold text-primary-foreground transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
        >
          Continuer
        </button>

        {/* Skip link */}
        <button
          type="button"
          className="mt-3 w-full py-2 text-center text-[14px] font-sans transition-colors hover:text-foreground"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          {"J\u2019ajouterai plus tard"}
        </button>
      </div>
    </div>
  )
}
