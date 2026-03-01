"use client"

import { useState } from "react"

const inputStyle = {
  backgroundColor: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
} as const

export function OnboardingForm() {
  const [prenom, setPrenom] = useState("")
  const [dateNaissance, setDateNaissance] = useState("")
  const [ville, setVille] = useState("")

  return (
    <div className="flex flex-col gap-3">
      {/* Prenom */}
      <div>
        <input
          type="text"
          placeholder="Pr\u00E9nom"
          value={prenom}
          onChange={(e) => setPrenom(e.target.value)}
          className="w-full px-4 py-3.5 text-[14px] font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
          style={inputStyle}
        />
      </div>

      {/* Date de naissance + Ville row */}
      <div className="flex gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Date de naissance"
            value={dateNaissance}
            onChange={(e) => setDateNaissance(e.target.value)}
            onFocus={(e) => {
              e.currentTarget.type = "date"
            }}
            onBlur={(e) => {
              if (!e.currentTarget.value) {
                e.currentTarget.type = "text"
              }
            }}
            className="w-full px-4 py-3.5 text-[14px] font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            style={inputStyle}
          />
        </div>
        <div className="flex-1">
          <input
            type="text"
            placeholder="Ville"
            value={ville}
            onChange={(e) => setVille(e.target.value)}
            className="w-full px-4 py-3.5 text-[14px] font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            style={inputStyle}
          />
        </div>
      </div>
    </div>
  )
}
