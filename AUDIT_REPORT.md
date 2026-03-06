# BREVEIL AUDIT — 2026-03-06

## Composants

- **Total** : 219 fichiers (144 .tsx + 75 .ts)
- **Suspects (dupliques/versionnes)** :
  - `OnboardingFunnelV2.tsx` — seule version active, mais suffixe "V2" sans V1
  - `TripViewV2.tsx` — seule version active, suffixe "V2" sans V1
  - `src/components/settings/screens/MonCompteScreen.tsx` (506 lignes) **DOUBLON** de `src/components/settings/screens/compte/MonCompteScreen.tsx` (600 lignes) — seul le fichier `compte/` est importe par SettingsSheet.tsx

- **Non importes nulle part (orphelins)** :
  | Fichier | Lignes | Verdict |
  |---------|--------|---------|
  | `src/components/community/GroupsView.tsx` | ~200 | ORPHELIN — remplace par groupes-tab.tsx |
  | `src/components/community/filter-chips.tsx` | ~50 | ORPHELIN — jamais importe |
  | `src/components/settings/screens/MonCompteScreen.tsx` | 506 | ORPHELIN — doublon du fichier dans compte/ |
  | `src/components/ui/Button.tsx` | - | ORPHELIN — jamais importe |
  | `src/components/ui/Input.tsx` | - | ORPHELIN — jamais importe |
  | `src/components/ui/Card.tsx` | - | ORPHELIN — jamais importe |
  | `src/components/ui/Sheet.tsx` | - | ORPHELIN — jamais importe |
  | `src/components/ui/TabBar.tsx` | - | ORPHELIN — jamais importe |
  | `src/components/ui/Badge.tsx` | - | ORPHELIN — jamais importe |
  | `src/components/ui/Chip.tsx` | - | ORPHELIN — jamais importe |
  | `src/components/ui/SelectionCard.tsx` | - | ORPHELIN — jamais importe |
  | `src/components/ui/InfoNote.tsx` | - | ORPHELIN — jamais importe |
  | `src/components/ui/StreakBadge.tsx` | - | ORPHELIN — jamais importe |
  | `src/components/ui/BreveilLogo.tsx` | - | ORPHELIN — page.tsx a sa propre copie inline |
  | `src/components/ui/index.ts` | 12 | ORPHELIN — barrel re-exporte des composants jamais importes |

- **Pages routes anciennes (onboarding pre-V2)** :
  | Route | Lignes |
  |-------|--------|
  | `src/app/onboarding/goals/page.tsx` | 171 |
  | `src/app/onboarding/permissions/page.tsx` | 276 |
  | `src/app/onboarding/welcome/page.tsx` | 181 |
  | `src/app/onboarding/profile/page.tsx` | 207 |

  Ces 4 pages sont des routes Next.js accessibles publiquement mais l'onboarding actif passe par `OnboardingFunnelV2` sur `/onboarding`. Elles sont potentiellement mortes.

---

## Routes API

- **Total** : 21 routes

| Route | Appelee depuis | Statut |
|-------|----------------|--------|
| `/api/livekit-token` | `escorte/AudioChannel.tsx` | ACTIVE |
| `/api/verify/start` | `VerificationView.tsx` | ACTIVE |
| `/api/verify/webhook` | Veriff callback (externe) | ACTIVE (webhook) |
| `/api/stripe/checkout` | `ProGate.tsx` | ACTIVE |
| `/api/stripe/webhook` | Stripe callback (externe) | ACTIVE (webhook) |
| `/api/stripe/portal` | **AUCUN appelant** | ORPHELINE |
| `/api/trips/start` | `TripViewV2.tsx` | ACTIVE |
| `/api/trips/end` | `TripViewV2.tsx` | ACTIVE |
| `/api/trips/checkpoint` | `TripMonitor.ts` | ACTIVE |
| `/api/simulation/tick` | `SimulationTicker.tsx` | ACTIVE |
| `/api/simulation/seed` | **AUCUN appelant** | ORPHELINE (admin-only manual) |
| `/api/simulation/cleanup` | **AUCUN appelant** | ORPHELINE (admin-only manual) |
| `/api/invite/validate` | **AUCUN appelant** | ORPHELINE |
| `/api/invite/redeem` | `map/page.tsx` | ACTIVE |
| `/api/cron/lifecycle-emails` | **AUCUN appelant front** | ACTIVE (Vercel Cron) |
| `/api/push-notify` | **AUCUN appelant front** | ACTIVE (server-to-server) |
| `/api/notify-nearby` | `map/page.tsx` | ACTIVE |
| `/api/circle/invite` | `onboarding/circle/page.tsx`, `circle/add/route.ts` | ACTIVE |
| `/api/circle/search` | `AddCircleContactModal.tsx` | ACTIVE |
| `/api/circle/add` | `AddCircleContactModal.tsx` | ACTIVE |
| `/api/sos/thread` | `EmergencyButton.tsx` | ACTIVE |

- **Route fantome** : `AddCircleContactModal.tsx` appelle `/api/circle/invite-external` mais cette route n'existe pas (aucun fichier `src/app/api/circle/invite-external/route.ts`).

---

## Store Zustand (`src/stores/useStore.ts`)

### Proprietes actives
userId, pins, mapFilters, activeSheet, selectedPin, newPinCoords, mapFlyTo, departDragPin, escorteView, userLocation, activeTab, userProfile, activeRoute, pendingRoutes, transitSegments, notifications, isSharingLocation, watchedLocations, tripPrefill, followedPinIds, liveSessions, notifSettings, achievedMilestones, offlineQueueCount, showIncidentsList, showWalkWithMe, safeSpaces, showSafeSpaces, showPinLabels, showSimulated, pinsVersion, myKovaInitialTab, activeTrip, tripNudge, currentStreak/longestStreak, unreadDmCount, mapBottomPadding, isDetailExpanded, reportStep/reportCategory/reportTransport/resetReport

### Proprietes mortes (jamais lues/ecrites hors useStore.ts)
| Propriete | Detail |
|-----------|--------|
| `followedPinIds` / `toggleFollowPin` | Feature "suivre un pin" abandonnee |
| `liveSessions` / `setLiveSessions` / `addLiveSession` / `removeLiveSession` / `updateLiveSession` | 5 actions mortes |
| `notifSettings` / `setNotifSettings` | Jamais lu/ecrit |
| `tripNudge` / `setTripNudge` | Jamais lu/ecrit |
| `isDetailExpanded` / `setDetailExpanded` | Jamais lu/ecrit |
| `escorteView` / `setEscorteView` | Jamais lu/ecrit |
| `reportStep` / `setReportStep` / `reportCategory` / `setReportCategory` / `reportTransport` / `setReportTransport` / `resetReport` | 7 actions mortes — report flow entierement gere localement |

### Shallow selectors morts (jamais importes)
`useUserId`, `usePins`, `useActiveTab`, `useActiveSheet`, `useMapFilters`, `useStreak`, `useActiveTrip` — les 7 exports en bas du fichier ne sont jamais importes nulle part.

### Notes
- Migration `kova_*` -> `brume_*` toujours presente (lignes 79-103) — peut etre supprimee si tous les utilisateurs ont migre
- Le store est monolithique (500 lignes, ~30 slices) — candidat a un split en sous-stores
- **~22 proprietes mortes** au total (slices + selectors)

---

## Tables Supabase utilisees

51 tables referencees dans le code :

```
admin_params, avatars, challenges, communities, community_members,
community_messages, community_posts, community_stories, content_hashtags,
direct_messages, dm_conversations, email_logs, emergency_sessions,
engagement_events, escorte_circle, escortes, favoris_trajets, hashtags,
incident-proofs, invite_code_uses, invite_codes, invoices, live_sessions,
location_history, media, notification_settings, notifications, pin_comments,
pin_evidence, pin_votes, pins, profiles, push_subscriptions,
safe-space-uploads, safe_space_media, safe_space_votes, safe_spaces,
saved_places, saved_routes, subscriptions, trajets_recents, trip_checkpoints,
trip_log, trips, trusted_circle, trusted_contacts, user_challenges,
user_reports, waitlist, walk_sessions
```

**Note** : certaines tables sont referencees dans le code mais n'existent peut-etre pas en DB (ex: `community_posts` est entoure de try/catch "table may not exist").

---

## Dead code

### console.log de debug
- **36 occurrences** reparties sur 18 fichiers
- La plupart sont des `console.error` legitimes dans les catch (API routes, hooks)
- 1 `console.error('Complete error:', e)` generique dans `OnboardingFunnelV2.tsx:326`
- 1 `console.error('Error:', error)` generique dans `ReportSheet.tsx:194`

### Features desactivees
- `{/* TODO: compute from real data */}` — `src/app/admin/analytics/page.tsx:57`

### Handlers toast-only (pas de DB)
- `SoutienSheet.tsx` — reactions "toast-only mode", `post_reactions` table n'existe pas
- `post-card.tsx` — bookmark toggle toast-only (`saved_posts` table n'existe pas)
- `post-card.tsx` — report action toast-only (`post_reports` table n'existe pas)
- `post-card.tsx` — comments button toast-only

---

## Features partiellement implementees

| Feature | Fichier | Ligne | Detail |
|---------|---------|-------|--------|
| Soutien reactions | `SoutienSheet.tsx` | 29-34 | `void label; void postId;` — pas de table DB |
| Post bookmarks | `post-card.tsx` | - | Toggle local state + toast, pas de persistence |
| Post report | `post-card.tsx` | - | Toast seulement, pas de table `post_reports` |
| Post comments | `post-card.tsx` | - | Toast "bientot disponible" |
| Circle invite-external | `AddCircleContactModal.tsx` | 118 | Appelle `/api/circle/invite-external` qui n'existe pas |
| SOS community_posts | `fil-tab.tsx` | 113-153 | try/catch "table may not exist yet" |
| Admin analytics | `admin/analytics/page.tsx` | 57 | TODO: compute from real data |
| Stripe portal | `/api/stripe/portal/route.ts` | - | Route existe mais jamais appelee |
| Invite validate | `/api/invite/validate/route.ts` | - | Route existe mais jamais appelee |

---

## Dependencies package.json

### Utilisees
`@stripe/stripe-js`, `@supabase/ssr`, `@supabase/supabase-js`, `framer-motion`, `livekit-client`, `livekit-server-sdk`, `lucide-react`, `mapbox-gl`, `next`, `next-intl`, `react`, `react-dom`, `resend`, `sonner`, `stripe`, `web-push`, `zustand`

### Suspectes / potentiellement inutiles
| Package | Statut |
|---------|--------|
| `@livekit/components-react` | **JAMAIS IMPORTE** — seul `livekit-client` est utilise dans AudioChannel.tsx |
| `@swc/helpers` | **JAMAIS IMPORTE** — dependency implicite de Next.js, probablement inutile en explicit |

---

## Recommandations Kill Week

### SUPPRIMER (fichiers morts)
1. `src/components/settings/screens/MonCompteScreen.tsx` — doublon de `compte/MonCompteScreen.tsx`
2. `src/components/community/GroupsView.tsx` — remplace par `groupes-tab.tsx`
3. `src/components/community/filter-chips.tsx` — jamais importe
4. `src/components/ui/Button.tsx` — jamais importe
5. `src/components/ui/Input.tsx` — jamais importe
6. `src/components/ui/Card.tsx` — jamais importe
7. `src/components/ui/Sheet.tsx` — jamais importe
8. `src/components/ui/TabBar.tsx` — jamais importe
9. `src/components/ui/Badge.tsx` — jamais importe
10. `src/components/ui/Chip.tsx` — jamais importe
11. `src/components/ui/SelectionCard.tsx` — jamais importe
12. `src/components/ui/InfoNote.tsx` — jamais importe
13. `src/components/ui/StreakBadge.tsx` — jamais importe
14. `src/components/ui/BreveilLogo.tsx` — doublon, `page.tsx` a sa propre version inline
15. `src/components/ui/index.ts` — barrel inutile
16. `src/app/api/stripe/portal/route.ts` — jamais appelee
17. `src/app/api/invite/validate/route.ts` — jamais appelee
18. Package `@livekit/components-react` — jamais importe

### NETTOYER
1. **4 pages onboarding legacy** (`goals/`, `permissions/`, `welcome/`, `profile/`) — l'onboarding actif est `OnboardingFunnelV2`. Si ces routes ne sont plus accessibles, les supprimer
2. **Migration kova_* -> brume_*** dans `useStore.ts` (lignes 79-103) — supprimer apres confirmation que tous les utilisateurs ont migre
3. **console.error generiques** : `OnboardingFunnelV2.tsx:326`, `ReportSheet.tsx:194` — remplacer par des messages specifiques
4. **Route fantome** `/api/circle/invite-external` — soit creer la route, soit retirer le fetch dans `AddCircleContactModal.tsx:118`
5. **Renommer** `myKovaInitialTab` -> `myBreveilInitialTab` (legacy naming)
6. **Package name** dans `package.json` est encore `"name": "kova"` — renommer en `"breveil"` ou `"safepin"`

### CONSOLIDER
1. **OnboardingFunnelV2** -> renommer en `OnboardingFunnel` (plus de V1)
2. **TripViewV2** -> renommer en `TripView` (plus de V1)
3. **Store monolithique** `useStore.ts` (500 lignes) — envisager un split : `useMapStore`, `useTripStore`, `useNotifStore`, `useReportStore`
4. **community_posts** table — soit la creer en DB pour de vrai, soit retirer le code SOS qui depend d'elle
5. **post_reactions / saved_posts / post_reports** — soit creer les tables, soit retirer les boutons qui pretendent fonctionner (bookmark, report, soutien)
