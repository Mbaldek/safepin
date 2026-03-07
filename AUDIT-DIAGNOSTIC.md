# BREVEIL — Audit Diagnostic

> **Date** : 2026-03-07 | **Version app** : 0.1.0 | **Auteur** : Claude Opus 4.6 + Mathieu

---

## 1. IDENTITE & BRAND

| Attribut | Valeur |
|----------|--------|
| **Nom actuel** | Breveil |
| **Noms legacy** | Brume (localStorage), Safepin (repo GitHub) |
| **Couleur primaire** | `#3BB4C1` (cyan/teal) |
| **Gradient brand** | `#3BB4C1` → `#1E3A5F` → `#4A2C5A` → `#5C3D5E` |
| **Logo** | `public/logo.svg` |
| **PWA icons** | `public/icon-192.png`, `public/icon-512.png` |
| **PWA name** | "Breveil" |
| **PWA categories** | safety, navigation, social |

### Palette couleurs (CSS Custom Properties — globals.css)

| Variable | Hex | Usage |
|----------|-----|-------|
| `--gradient-start` | `#3BB4C1` | Cyan primaire |
| `--gradient-mid` | `#1E3A5F` | Bleu profond |
| `--gradient-transition` | `#4A2C5A` | Violet |
| `--gradient-end` | `#5C3D5E` | Rose/mauve |
| `--surface-base` | `#0F172A` | Fond dark |
| `--surface-card` | `#1E293B` | Carte dark |
| `--surface-elevated` | `#334155` | Surface haute |
| `--surface-glass` | `rgba(30,41,59,0.8)` | Effet verre |
| `--semantic-success` | `#34D399` | Vert (safe) |
| `--semantic-warning` | `#FBBF24` | Ambre (attention) |
| `--semantic-danger` | `#EF4444` | Rouge (urgence) |
| `--accent-gold` | `#F5C341` | Or |
| `--accent-cyan` | `#22D3EE` | Cyan vif |
| `--accent-purple` | `#A78BFA` | Violet |

### Typographies

| Usage | Font | Style |
|-------|------|-------|
| Body / UI | Inter | Sans-serif, clean |
| Type scale | 11px (overline) → 40px (hero) | 8 niveaux |

### Design tokens supplementaires (globals.css — 201 variables)

- **Spacing** : grille 8px (4px → 96px, 14 niveaux)
- **Border radius** : xs (4px) → full (9999px)
- **Shadows** : sm/md/lg/xl + glow/glow-strong
- **Z-index** : base(0) → max(9999), 10 niveaux
- **Transitions** : fast(150ms), normal(250ms), slow(400ms), slower(600ms)
- **Animations** : fadeIn, fadeInUp, slideInUp, pulse, spin, radar-pulse, sosPulse, tab-bounce, tab-pop

### Incoherences brand

| Probleme | Detail | Fichiers |
|----------|--------|----------|
| localStorage keys `brume_*` | 12 cles en `brume_` au lieu de `breveil_` | `stores/useStore.ts`, composants divers |
| Theme key | `brume-theme` (tiret) vs `brume_*` (underscore) | `stores/useTheme.ts` |
| Keys breveil | Seulement 2 cles en `breveil_` : `breveil_invite_code`, `breveil_recent_searches` | Composants divers |

**Liste complete des localStorage keys :**

| Cle | Prefixe |
|-----|---------|
| `brume_active_trip` | brume_ |
| `brume_community_tooltip_shown` | brume_ |
| `brume_install_dismissed` | brume_ |
| `brume_is_pro` | brume_ |
| `brume_last_session_ts` | brume_ |
| `brume_milestones` | brume_ |
| `brume_offline` | brume_ |
| `brume_onboarding_done` | brume_ |
| `brume_onboarding_state` | brume_ |
| `brume_session_count` | brume_ |
| `brume_show_pin_labels` | brume_ |
| `brume_show_simulated` | brume_ |
| `brume-theme` | brume- |
| `breveil_invite_code` | breveil_ |
| `breveil_recent_searches` | breveil_ |

---

## 2. STACK TECHNIQUE

| Couche | Technologie | Version |
|--------|------------|---------|
| **Framework** | Next.js (App Router) | 16.1.6 |
| **UI** | React | 19.2.3 |
| **Langage** | TypeScript (strict) | ^5 |
| **Base de donnees** | Supabase (PostgreSQL + Auth + Storage + Realtime) | 2.97.0 |
| **Carte** | Mapbox GL JS (style custom `matlab244/cmm6okd7v005q01s49w19fac0`) | 3.18.1 |
| **State management** | Zustand | 5.0.11 |
| **CSS** | Tailwind v4 + CSS Custom Properties (201 tokens) | 4.x |
| **Animations** | Framer Motion | 12.34.3 |
| **Icons** | Lucide React | 0.575.0 |
| **i18n** | next-intl (30 locales, en+fr a 100%) | 4.8.3 |
| **Paiement** | Stripe | 20.3.1 |
| **Email** | Resend | 6.9.3 |
| **Push notifications** | web-push (VAPID) | 3.6.7 |
| **Audio/Video temps reel** | LiveKit | 2.17.2 |
| **Verification identite** | Veriff | API externe |
| **Toasts** | Sonner | 2.0.7 |
| **Emoji** | @emoji-mart/react + @emoji-mart/data | 1.1.1 / 1.2.1 |
| **Tests** | Vitest + @testing-library | 4.0.18 |

---

## 3. ARCHITECTURE FICHIERS

```
src/
  app/                          # Next.js App Router
    admin/                     # Dashboard admin (12 sous-pages)
    api/                       # 22 routes API
    auth/                      # OAuth callback
    login/                     # Page login
    map/                       # Page principale (map)
    onboarding/                # Funnel onboarding
    track/[sessionId]/         # Suivi trajet public
    cookies/ privacy/ terms/   # Pages legales
    layout.tsx                 # Root layout
    globals.css                # 201 design tokens + animations
    tailwind-theme.css         # Extension theme Tailwind

  components/                   # 104 composants
    admin/          (12)       # Panel admin
    chat/           (2)        # ChatView, ChatBubble
    community/      (16)       # Hub social complet
    escorte/        (3)        # Accompagnement securise
    hashtags/       (4)        # Systeme hashtags
    map/            (1)        # PinDetailSheet
    nearby/         (1)        # NearbySheet
    settings/       (20)       # Parametres complets (4 composants + 16 screens)
    subscription/   (1)        # PaywallScreen
    trip/           (3)        # TripView, FavorisSheet, RouteCard
    ui/             (2)        # Avatar, EmojiPicker
    [root]          (39)       # Composants principaux

  stores/           (4)        # useStore, useTheme, uiStore, notificationStore
  hooks/            (9)        # Custom hooks React
  lib/              (31)       # Utilitaires (dont route-scoring.ts NOUVEAU)
  types/            (1)        # Types TypeScript centraux (60+ types exportes)
  messages/         (2)        # en.json, fr.json
  i18n/             (2)        # Config i18n
  __tests__/        (8)        # Tests unitaires

supabase/
  migrations/       (11)       # Migrations SQL
  functions/        (4)        # Edge Functions (emergency-dispatch, on-new-pin, send-push, weekly-digest)

public/
  service-worker.js            # Service worker push
  manifest.json                # PWA manifest
  logo.svg, icon-*.png         # Assets brand
  breveil-*.html               # Pages marketing statiques
```

### Conventions

| Convention | Regle |
|------------|-------|
| Composants | PascalCase (`.tsx`) |
| Hooks | `use*.ts` |
| Stores | `use*Store.ts` |
| API routes | `src/app/api/[feature]/route.ts` |
| localStorage | Prefixe `brume_` (legacy, migration vers `breveil_` recommandee) |
| CSS z-index | Tailwind scale : `z-600` pas `z-[600]` |
| i18n | Pas de `t(variable)` — lookup maps (Record) |
| Styles composants | Inline `style={}` (pas de Tailwind dans les composants) |

---

## 4. FEATURES — STATUT COMPLET

### Tableau synthese

| # | Feature | Statut | Fichiers cles |
|---|---------|--------|---------------|
| 1 | Carte & Pins | ACTIF | `MapView.tsx`, `MapPin.tsx`, `map/page.tsx` |
| 2 | SOS / Urgence | ACTIF | `EmergencyButton.tsx`, edge function `emergency-dispatch` |
| 3 | Communaute (fil) | ACTIF | `fil-tab.tsx`, `post-card.tsx`, `compose-modal.tsx` |
| 4 | Cercle de confiance | ACTIF | `cercle-tab.tsx`, `AddCircleContactModal.tsx` |
| 5 | Groupes | ACTIF | `groupes-tab.tsx`, `create-group-modal.tsx` |
| 6 | Messagerie directe | ACTIF | `messages-tab.tsx`, `ChatView.tsx`, `ChatBubble.tsx` |
| 7 | Stories | ACTIF | `story-compose-modal.tsx`, `story-viewer.tsx`, `stories-row.tsx` |
| 8 | Trajet / Escorte | ACTIF | `EscorteSheet.tsx`, `TripView.tsx`, `TripHUD.tsx`, `route-scoring.ts`, `RouteCard.tsx` |
| 9 | Espaces surs | ACTIF | `SafeSpaceDetailSheet.tsx` |
| 10 | Signalement incident | ACTIF | `ReportSheet.tsx`, `ConfirmIncidentModal.tsx` |
| 11 | Notifications push | ACTIF | `/api/push-notify*`, `service-worker.js`, `notificationStore.ts` |
| 12 | Notifications in-app | ACTIF | `NotificationsSheet.tsx`, `GlobalToast.tsx`, `notificationStore.ts` |
| 13 | Parametres | ACTIF | `SettingsSheet.tsx`, 20 sous-ecrans |
| 14 | Onboarding | ACTIF | `OnboardingFunnel.tsx` (V2 = version active) |
| 15 | Abonnement Stripe | ACTIF | `PaywallScreen.tsx`, `/api/stripe/*` |
| 16 | Gamification | PARTIEL | `milestones.ts`, `streaks.ts`, `levels.ts` actifs ; `ChallengesSection.tsx` orphelin |
| 17 | Profil | ACTIF | `UserProfileModal.tsx`, `UserContextMenu.tsx`, `MyKovaView.tsx`, `MyProfileScreen.tsx` |
| 18 | Admin dashboard | ACTIF | `admin/` (12 pages) |
| 19 | PWA | ACTIF | `manifest.json`, `InstallPrompt.tsx`, `OfflineBanner.tsx` |
| 20 | i18n | ACTIF | `next-intl` — en+fr complets, 28 locales squelettes |
| 21 | Verification identite | PARTIEL | `/api/verify/*`, Veriff — UI "coming soon" |
| 22 | RGPD / Export donnees | PARTIEL | Menu dans Securite, backend incomplet |
| 23 | Route scoring & alternatives | NOUVEAU | `route-scoring.ts`, `fetchDirectionsMulti()`, `RouteCard.tsx` |

### Changements depuis dernier audit (2026-03-06)

| Element | Avant | Apres |
|---------|-------|-------|
| `PushOptInModal.tsx` | ACTIF | **SUPPRIME** |
| `route-scoring.ts` | N'existait pas | **CREE** — algo danger scoring |
| `RouteCard.tsx` | N'existait pas | **CREE** — composant route card |
| `directions.ts` | fetchDirections() seulement | **+ fetchDirectionsMulti()** avec alternatives |
| `uiStore.ts` | ContextMenuUser sans displayName | **+ displayName** champ optionnel |
| `useStore.ts` | Pas de selectedRouteIdx | **+ selectedRouteIdx** + setter |
| `fil-tab.tsx` | post.user.name = display_name | **= username** (pseudo) + displayName separe |
| `post-card.tsx` | Pas de displayName sur Post | **+ displayName** dans interface Post |
| `OnboardingFunnelV2.tsx` | Mentionne en memoire | **N'EXISTE PAS** — V2 = OnboardingFunnel.tsx |
| `CoachMark.tsx` | Mentionne en memoire | **N'EXISTE PAS** — tour supprime |
| `useTour.ts` | Mentionne en memoire | **N'EXISTE PAS** — tour supprime |
| Composants total | ~95 | **104** |
| Libs total | ~28 | **31** |
| Stores total | 3 | **4** (+ notificationStore) |

### Detail features cles

#### 8. Trajet / Escorte (NOUVEAU : route scoring)
- **Modes** : marche, velo, voiture (+ transports dans EscorteSheet)
- **Directions** : Mapbox Directions API + `alternatives=true` (jusqu'a 3 routes)
- **Route scoring** : `scoreRoute(coords, pins)` — corridor 200m, severity * decay * confirmations
- **UI** : RouteCard compact (dot selection, pastille couleur, label, duree, distance)
- **Couleurs routes** : Plus sure (#34D399), Equilibree (#F5C341), Plus rapide (#EF4444)
- **Features** : favoris, recents, selection membres cercle, canal audio LiveKit, ETA temps reel
- **HUD** : TripHUD en cours de trajet, checkpoints, session briefing
- **danger_score** : envoye a `/api/trips/start` (etait hardcode a 0)

#### 17. Profil (AMELIORE : displayName)
- **UserProfileModal** : bottom sheet avec snap points 50%/86%, share menu (copier lien, WhatsApp, Telegram, Email, message in-app)
- **UserContextMenu** : bottom sheet avec Follow, Message, Voir profil, Inviter cercle
- **displayName** : champ separe du username, utilise pour affichage reel (prenom nom) vs @pseudo
- **Wiring global** : via `uiStore` + `GlobalModals.tsx`

---

## 5. BASE DE DONNEES

### Tables Supabase (62 tables)

| Table | Usage |
|-------|-------|
| `profiles` | Profils utilisateurs |
| `pins` | Signalements carte |
| `pin_votes` | Votes sur pins |
| `pin_comments` | Commentaires pins |
| `pin_evidence` | Preuves/medias pins |
| `pin_follows` | Suivi de pins |
| `pin_stories` | Stories liees aux pins |
| `pin_thanks` | Remerciements pins |
| `communities` | Communautes |
| `community_members` | Membres communautes |
| `community_messages` | Messages communautes |
| `community_posts` | Posts communautes |
| `community_stories` | Stories communautes |
| `post_comments` | Commentaires posts |
| `post_likes` | Likes posts |
| `story_likes` | Likes stories |
| `story_messages` | Messages stories |
| `dm_conversations` | Conversations DM |
| `direct_messages` | Messages directs |
| `trusted_contacts` | Contacts de confiance (+is_watching) |
| `circle_invitations` | Invitations cercle |
| `follows` | Abonnements entre utilisateurs |
| `friendships` | Amities |
| `notifications` | Notifications persistantes |
| `notification_settings` | Preferences notifications |
| `push_subscriptions` | Abonnements push |
| `escortes` | Sessions escorte |
| `escorte_circle` | Cercle escorte |
| `trips` | Trajets (+status, walk_with_me, eta, last_seen) |
| `trip_log` | Logs trajet |
| `trip_checkpoints` | Checkpoints trajet |
| `saved_routes` | Routes sauvegardees |
| `favoris_trajets` | Trajets favoris |
| `trajets_recents` | Trajets recents |
| `saved_places` | Lieux sauvegardes |
| `place_notes` | Notes de lieux |
| `safe_spaces` | Espaces surs |
| `safe_space_votes` | Votes espaces surs |
| `safe_space_media` | Medias espaces surs |
| `safe_space_media_likes` | Likes medias |
| `location_history` | Historique positions |
| `live_sessions` | Sessions live |
| `walk_sessions` | Sessions marche |
| `subscriptions` | Abonnements Stripe |
| `invoices` | Factures |
| `pro_waitlist` | Liste attente Pro |
| `invite_codes` | Codes invitation |
| `invite_code_uses` | Utilisations codes |
| `pending_invites` | Invitations en attente |
| `trusted_circle` | Cercle de confiance (v2?) |
| `admin_params` | Parametres admin |
| `user_milestones` | Achievements utilisateur |
| `user_reports` | Signalements utilisateur |
| `challenges` | Challenges hebdo |
| `user_challenges` | Progres challenges |
| `sos_responders` | Repondants SOS |
| `sos_dispatch_log` | Logs dispatch SOS |
| `audio_checkins` | Check-ins audio |
| `engagement_events` | Events engagement |
| `email_logs` | Logs emails |
| `hashtags` | Hashtags |
| `content_hashtags` | Liens contenu-hashtag |
| `waitlist` | Liste attente generale |
| `route_upvotes` | Votes routes |

### Migrations appliquees (11)

| # | Fichier | Tables/Actions |
|---|---------|----------------|
| 1 | `20260222_subscriptions.sql` | subscriptions, invoices, pro_waitlist |
| 2 | `20260224_persistent_notifications.sql` | notifications, profil location tracking |
| 3 | `20260225_safety_buddies.sql` | safety_buddies (route matching) |
| 4 | `20260226_weekly_digest_cron.sql` | pg_cron + pg_net, cron lundi 9h UTC |
| 5 | `20260227_moderation.sql` | user_reports, pin flag_count/hidden_at, is_shadow_banned |
| 6 | `20260228_emergency_dispatch.sql` | emergency_dispatches, emergency_sessions |
| 7 | `20260229_invite_codes.sql` | invite_codes, invite_code_uses |
| 8 | `20260301_admin_params.sql` | admin_params (+description, updated_at, 6 defaults) |
| 9 | `20260302_pin_evidence.sql` | pin_evidence (report/confirmation/rejection) |
| 10 | `20260303_profile_language.sql` | profiles.language (default 'fr') |
| 11 | `20260305_trip_sheet_schema.sql` | trips (+dest_*, status, walk_with_me, eta), trusted_contacts.is_watching |

### Edge Functions Supabase (4)

| Fonction | Declencheur | Action |
|----------|-------------|--------|
| `emergency-dispatch` | Appel API | Dispatch SOS aux contacts via push + SMS |
| `on-new-pin` | DB webhook INSERT pins | Alerte proximite routes sauvegardees (300m) |
| `send-push-notification` | DB webhook INSERT notifications | Envoi Web Push via VAPID/JWT |
| `weekly-digest` | pg_cron lundi 9h UTC | Email digest hebdomadaire |

---

## 6. API ROUTES (22 endpoints)

### Auth & Verification

| Route | Methode | Usage |
|-------|---------|-------|
| `/api/auth/callback` | GET | OAuth callback Supabase |
| `/api/verify/start` | POST | Demarrer verification Veriff |
| `/api/verify/webhook` | POST | Webhook Veriff |

### Notifications & Push

| Route | Methode | Usage |
|-------|---------|-------|
| `/api/push-notify` | POST | Push generique (broadcast) |
| `/api/push-notify-dm` | POST | Push cible (1 user, DM) |
| `/api/notify-nearby` | POST | Push geo-filtre (proximite) |

### Cercle & Contacts

| Route | Methode | Usage |
|-------|---------|-------|
| `/api/circle/add` | POST | Ajouter contact au cercle |
| `/api/circle/invite` | POST | Invitation externe |
| `/api/circle/search` | POST | Recherche par email/tel/pseudo |

### Paiement (Stripe)

| Route | Methode | Usage |
|-------|---------|-------|
| `/api/stripe/checkout` | POST | Creer session checkout |
| `/api/stripe/webhook` | POST | Webhook paiement |
| `/api/stripe/portal` | POST | Portal facturation |

### Trajets

| Route | Methode | Usage |
|-------|---------|-------|
| `/api/trips/start` | POST | Demarrer trajet (+ danger_score reel) |
| `/api/trips/checkpoint` | POST | Logger checkpoint |
| `/api/trips/end` | POST | Terminer trajet |

### SOS

| Route | Methode | Usage |
|-------|---------|-------|
| `/api/sos/thread` | POST, PATCH | Creer/mettre a jour thread SOS |

### Invitations

| Route | Methode | Usage |
|-------|---------|-------|
| `/api/invite/redeem` | POST | Utiliser code invitation |
| `/api/invite/validate` | POST | Valider code |

### Email

| Route | Methode | Usage |
|-------|---------|-------|
| `/api/send-welcome` | POST | Email bienvenue |
| `/api/cron/lifecycle-emails` | GET | Emails automatiques (cron) |

### LiveKit & Admin

| Route | Methode | Usage |
|-------|---------|-------|
| `/api/livekit-token` | POST | Token audio/video |
| `/api/admin-bypass` | GET | Bypass admin (dev/test) |
| `/api/simulation/seed` | POST | Generer donnees test |
| `/api/simulation/tick` | POST | Tick simulation |
| `/api/simulation/cleanup` | POST | Nettoyer simulation |

---

## 7. COMPOSANTS — INVENTAIRE

### Orchestrateur principal : `src/app/map/page.tsx` (~1071 lignes)

### Actifs (importes et utilises)

| Composant | Fichier | Import par |
|-----------|---------|------------|
| MapView | `components/MapView.tsx` | map/page.tsx |
| MapPin | `components/MapPin.tsx` | MapView.tsx |
| EmergencyButton | `components/EmergencyButton.tsx` | map/page.tsx |
| BottomNav | `components/BottomNav.tsx` | map/page.tsx |
| ReportSheet | `components/ReportSheet.tsx` | map/page.tsx |
| NotificationsSheet | `components/NotificationsSheet.tsx` | map/page.tsx |
| PinDetailSheet | `components/map/PinDetailSheet.tsx` | map/page.tsx |
| EscorteSheet | `components/EscorteSheet.tsx` | map/page.tsx (lazy) |
| NearbySheet | `components/nearby/NearbySheet.tsx` | map/page.tsx |
| CommunityView | `components/community/CommunityView.tsx` | map/page.tsx (lazy) |
| SettingsSheet | `components/settings/SettingsSheet.tsx` | map/page.tsx (lazy) |
| TripHUD | `components/TripHUD.tsx` | map/page.tsx (lazy) |
| WalkWithMePanel | `components/WalkWithMePanel.tsx` | map/page.tsx (lazy) |
| MyKovaView | `components/MyKovaView.tsx` | map/page.tsx (lazy) |
| OnboardingFunnel | `components/OnboardingFunnel.tsx` | map/page.tsx |
| InstallPrompt | `components/InstallPrompt.tsx` | map/page.tsx |
| OfflineBanner | `components/OfflineBanner.tsx` | map/page.tsx |
| SosBanner | `components/SosBanner.tsx` | map/page.tsx |
| CityContextPanel | `components/CityContextPanel.tsx` | map/page.tsx |
| CommunityTooltip | `components/CommunityTooltip.tsx` | map/page.tsx |
| GlobalToast | `components/GlobalToast.tsx` | map/page.tsx |
| GlobalModals | `components/GlobalModals.tsx` | map/page.tsx |
| ConfirmIncidentModal | `components/ConfirmIncidentModal.tsx` | map/page.tsx |
| SafeSpaceDetailSheet | `components/SafeSpaceDetailSheet.tsx` | map/page.tsx |
| BrandAssets | `components/BrandAssets.tsx` | map/page.tsx (BreveilMonogram) |
| MilestoneToast | `components/MilestoneToast.tsx` | map/page.tsx |
| ChatView | `components/chat/ChatView.tsx` | messages-tab, SupportChatScreen |
| ChatBubble | `components/chat/ChatBubble.tsx` | ChatView.tsx |
| UserProfileModal | `components/UserProfileModal.tsx` | GlobalModals.tsx |
| UserContextMenu | `components/UserContextMenu.tsx` | GlobalModals.tsx |
| EmojiPickerButton | `components/ui/EmojiPickerButton.tsx` | ChatView, compose-modal |
| RouteCard | `components/trip/RouteCard.tsx` | TripView.tsx |
| NeighborhoodScoreLayer | `components/NeighborhoodScoreLayer.tsx` | MapView.tsx (buildScoreGeoJSON) |

### Orphelins confirmes (0 imports)

| Composant | Fichier | Lignes |
|-----------|---------|--------|
| CommunityHub | `components/community/CommunityHub.tsx` | 677 |
| ThemeToggle | `components/ThemeToggle.tsx` | 35 |
| SimulationTicker | `components/SimulationTicker.tsx` | 71 |
| LocationHistoryViewer | `components/LocationHistoryViewer.tsx` | 190 |
| SessionBriefingCard | `components/SessionBriefingCard.tsx` | 189 |
| TrendSparkline | `components/TrendSparkline.tsx` | 137 |
| ProGate | `components/ProGate.tsx` | 84 |
| ReferralSection | `components/ReferralSection.tsx` | 143 |
| ChallengesSection | `components/ChallengesSection.tsx` | ~40 |

### Fichiers supprimes (depuis dernier audit)

| Fichier | Raison |
|---------|--------|
| `PushOptInModal.tsx` | Modal "Stay safe with alerts" en anglais, supprime |
| `OnboardingFunnelV2.tsx` | N'a jamais existe — V2 = OnboardingFunnel.tsx |
| `CoachMark.tsx` | Tour spotlight supprime |
| `useTour.ts` | Hook tour 5 etapes supprime |

---

## 8. DETTE TECHNIQUE

### 8.1 Fichiers trop volumineux (>1000 lignes)

| Fichier | Lignes | Recommandation |
|---------|--------|----------------|
| `components/trip/TripView.tsx` | 1,944 | Extraire sous-composants (mode selector, route preview) |
| `components/MapView.tsx` | 1,771 | Extraire layer managers, event handlers |
| `components/EscorteSheet.tsx` | 1,572 | Extraire formulaire depart/arrivee, mode selector |
| `components/OnboardingFunnel.tsx` | 1,351 | Extraire chaque step en composant |
| `components/SafeSpaceDetailSheet.tsx` | 1,321 | Extraire gallery, schedule, comments |
| `components/subscription/PaywallScreen.tsx` | 1,181 | Extraire pricing cards, referral |
| `components/MyKovaView.tsx` | 1,085 | Extraire stats cards, streak display |
| `app/map/page.tsx` | 1,071 | Extraire hooks custom (useMapInit, usePins, etc.) |
| `components/trip/FavorisSheet.tsx` | 1,059 | Extraire list items, search |
| `components/community/create-group-modal.tsx` | 1,018 | Extraire form steps |

### 8.2 Type safety

| Metrique | Valeur | Statut |
|----------|--------|--------|
| `as any` dans src/ | **0** | EXCELLENT |
| TypeScript strict | OUI | OK |

### 8.3 console.log en production

| Metrique | Valeur | Statut |
|----------|--------|--------|
| console.log dans client src/ | **0** | EXCELLENT |
| console.log dans edge functions | **2** | Acceptable (server-side) |

Emplacements edge functions :
- `supabase/functions/on-new-pin/index.ts:95` — smart-alert logging
- `supabase/functions/send-push-notification/index.ts:179` — subscription cleanup

### 8.4 Coherence CSS

| Pattern | Occurrences | Observation |
|---------|-------------|-------------|
| `style=` (inline) | ~2,711 | Convention du projet |
| `className=` (Tailwind) | ~876 | Surtout pages admin |
| CSS Custom Properties | 201 vars dans `globals.css` | Bien centralise |

**Duplication couleurs** :
- `globals.css` : variables CSS officielles (201)
- `tailwind-theme.css` : repetition pour Tailwind
- `lib/colors.ts` : objet couleurs parallele
- Composants : hex codes inline dans `colors` const (TripView, EscorteSheet, etc.)

### 8.5 Brand legacy

| Element | Valeur actuelle | Valeur cible |
|---------|----------------|--------------|
| 12 localStorage keys | `brume_*` | `breveil_*` |
| Theme key | `brume-theme` | `breveil_theme` |
| 2 localStorage keys | `breveil_*` | OK |

---

## 9. DEPENDANCES

### Production (26)

| Package | Version |
|---------|---------|
| `@emoji-mart/data` | ^1.2.1 |
| `@emoji-mart/react` | ^1.1.1 |
| `@stripe/stripe-js` | ^8.8.0 |
| `@supabase/ssr` | ^0.8.0 |
| `@supabase/supabase-js` | ^2.97.0 |
| `@swc/helpers` | ^0.5.19 |
| `emoji-mart` | ^5.6.0 |
| `framer-motion` | ^12.34.3 |
| `livekit-client` | ^2.17.2 |
| `livekit-server-sdk` | ^2.15.0 |
| `lucide-react` | ^0.575.0 |
| `mapbox-gl` | ^3.18.1 |
| `next` | 16.1.6 |
| `next-intl` | ^4.8.3 |
| `react` | 19.2.3 |
| `react-dom` | 19.2.3 |
| `resend` | ^6.9.3 |
| `sonner` | ^2.0.7 |
| `stripe` | ^20.3.1 |
| `web-push` | ^3.6.7 |
| `zustand` | ^5.0.11 |

### DevDependencies (15)

| Package | Version |
|---------|---------|
| `@tailwindcss/postcss` | ^4 |
| `@testing-library/jest-dom` | ^6.9.1 |
| `@testing-library/react` | ^16.3.2 |
| `@testing-library/user-event` | ^14.6.1 |
| `@types/mapbox-gl` | ^3.4.1 |
| `@types/node` | ^20 |
| `@types/react` | ^19 |
| `@types/react-dom` | ^19 |
| `@types/web-push` | ^3.6.4 |
| `@vitejs/plugin-react` | ^5.1.4 |
| `eslint` | ^9 |
| `eslint-config-next` | 16.1.6 |
| `jsdom` | ^28.1.0 |
| `tailwindcss` | ^4 |
| `typescript` | ^5 |
| `vitest` | ^4.0.18 |

---

## 10. VARIABLES D'ENVIRONNEMENT

### Publiques (`NEXT_PUBLIC_*`) — 7

| Variable | Service |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push |
| `NEXT_PUBLIC_SITE_URL` | URL production |
| `NEXT_PUBLIC_SUPPORT_USER_ID` | ID user support |

### Privees (server-side) — 15

| Variable | Service |
|----------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin |
| `STRIPE_SECRET_KEY` | Stripe |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | Stripe plan |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | Stripe plan |
| `VAPID_PRIVATE_KEY` | Web Push |
| `VAPID_SUBJECT` | Web Push |
| `RESEND_API_KEY` | Resend |
| `VERIFF_API_KEY` | Veriff |
| `VERIFF_SECRET_KEY` | Veriff |
| `LIVEKIT_URL` | LiveKit |
| `LIVEKIT_API_KEY` | LiveKit |
| `LIVEKIT_API_SECRET` | LiveKit |
| `CRON_SECRET` | Cron jobs |
| `NODE_ENV` | Environnement |

---

## 11. RECOMMANDATIONS

### PRIORITE HAUTE

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 1 | Migrer `brume_*` → `breveil_*` localStorage (avec fallback migration) | Brand coherence | Moyen |
| 2 | Supprimer les 9 composants orphelins (1,566 lignes de code mort) | Nettoyage | Faible |
| 3 | Supprimer `CommunityHub.tsx` (677 lignes, deprecated) | Nettoyage | Faible |

### PRIORITE MOYENNE

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 4 | Refactor TripView.tsx (1,944 lignes) en sous-composants | Maintenabilite | Eleve |
| 5 | Refactor MapView.tsx (1,771 lignes) | Maintenabilite | Eleve |
| 6 | Centraliser les couleurs inline → CSS vars ou objet partage | Coherence design | Moyen |
| 7 | Consolider globals.css + tailwind-theme.css + colors.ts | DX | Moyen |
| 8 | Ajouter highlight route selectionnee sur map (line-width dynamique) | UX trajet | Faible |

### PRIORITE BASSE

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 9 | Completer traductions 28 locales restantes | i18n | Eleve |
| 10 | Ajouter tests unitaires (couverture actuelle faible) | Qualite | Eleve |
| 11 | Documenter les Edge Functions Supabase | DX | Faible |
| 12 | Ajouter layer danger zones sur map pendant planification trajet | UX trajet | Moyen |
| 13 | Supprimer tables DB a 0 rows inutilisees | Nettoyage DB | Faible |

---

## 12. METRIQUES PROJET

| Metrique | Valeur |
|----------|--------|
| Fichiers TS/TSX | ~208 |
| Composants React | 104 |
| Composants orphelins | 9 |
| Routes API | 22 |
| Pages publiques | 8 |
| Pages admin | 12 |
| Custom hooks | 9 |
| Zustand stores | 4 |
| Libs utilitaires | 31 |
| Types exportes | 60+ |
| Migrations DB | 11 |
| Tables Supabase | 62 |
| Edge Functions | 4 |
| Dependencies npm (prod) | 26 |
| DevDependencies | 15 |
| Variables env | 22 |
| Locales i18n | 30 (2 completes) |
| CSS custom properties | 201 |
| Lignes code estimees | ~48,800 |
| Plus gros fichier | TripView.tsx (1,944 lignes) |
| `as any` | 0 |
| console.log client | 0 |
| Services tiers | 7 (Supabase, Mapbox, Stripe, Resend, Veriff, LiveKit, Web Push) |
