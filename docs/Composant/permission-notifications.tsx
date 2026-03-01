"use client"

import { ProgressBar } from "./progress-bar"

const MOCK_NOTIFICATIONS = [
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B7EC8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    accentColor: "#8B7EC8",
    title: "Nouveau dans votre quartier",
    body: "Sarah a rejoint Marais Solidaire",
    time: "il y a 2 min",
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6BA68E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    accentColor: "#6BA68E",
    title: "Clara est en route",
    body: "Elle a partag\u00E9 son trajet avec vous",
    time: "il y a 8 min",
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8A838" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    accentColor: "#E8A838",
    title: "Bilan de la semaine",
    body: "Votre quartier est 23% plus s\u00FBr",
    time: "il y a 1 h",
  },
] as const

function NotificationStack() {
  return (
    <div className="relative mx-auto w-full" style={{ height: 220 }}>
      {MOCK_NOTIFICATIONS.map((notif, i) => {
        const offset = i * 62
        const scale = 1 - i * 0.02
        const opacity = 1 - i * 0.08
        return (
          <div
            key={i}
            className="absolute left-0 right-0 rounded-[12px] p-3 transition-all duration-300"
            style={{
              top: offset,
              transform: `scale(${scale})`,
              opacity,
              backgroundColor: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              zIndex: 10 - i,
            }}
          >
            <div className="flex items-start gap-3">
              {/* Icon circle */}
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{
                  backgroundColor: `${notif.accentColor}15`,
                }}
              >
                {notif.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-foreground truncate">
                    {notif.title}
                  </span>
                  <span
                    className="shrink-0 text-[11px]"
                    style={{ color: "rgba(255,255,255,0.25)" }}
                  >
                    {notif.time}
                  </span>
                </div>
                <p
                  className="mt-0.5 text-[12px] leading-snug truncate"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                >
                  {notif.body}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function PermissionNotifications() {
  return (
    <div className="flex h-full flex-col">
      {/* Progress bar */}
      <div className="px-6 pt-3">
        <ProgressBar progress={80} />
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

        {/* Notification cards stack */}
        <NotificationStack />

        {/* Text */}
        <h1 className="mt-5 font-serif text-[26px] font-light leading-tight text-foreground text-balance">
          {"Restez inform\u00E9e"}
        </h1>
        <p
          className="mt-2 text-[14px] font-sans leading-relaxed"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          {"Activit\u00E9 de la communaut\u00E9, mises \u00E0 jour de vos proches, et alertes importantes."}
        </p>

        {/* Spacer */}
        <div className="flex-1 min-h-6" />

        {/* Primary button */}
        <button
          type="button"
          className="w-full rounded-[14px] bg-primary py-4 text-[15px] font-bold text-primary-foreground transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
        >
          Activer les notifications
        </button>

        {/* Footer text */}
        <p
          className="mt-4 text-center text-[12px] italic font-sans leading-relaxed"
          style={{ color: "rgba(255,255,255,0.30)" }}
        >
          {"Pas d\u2019inqui\u00E9tude \u2014 vous pouvez ajuster tout \u00E7a dans votre profil"}
        </p>
      </div>
    </div>
  )
}
