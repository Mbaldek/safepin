# BREVEIL — Audit Diagnostic

> **Date** : 2026-03-06 | **Version app** : 0.1.0 | **Auteur** : Claude Opus 4.6 + Mathieu

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

### Palette couleurs (CSS Custom Properties)

| Variable | Hex | Usage |
|----------|-----|-------|
| `--gradient-start` | `#3BB4C1` | Cyan primaire |
| `--gradient-mid` | `#1E3A5F` | Bleu profond |
| `--gradient-transition` | `#4A2C5A` | Violet |
| `--gradient-end` | `#5C3D5E` | Rose/mauve |
| `--surface-base` | `#0F172A` | Fond dark |
| `--surface-card` | `#1E293B` | Carte dark |
| `--surface-elevated` | `#334155` | Surface haute |
| `--semantic-success` | `#34D399` | Vert (safe) |
| `--semantic-warning` | `#FBBF24` | Ambre (attention) |
| `--semantic-danger` | `#EF4444` | Rouge (urgence) |
| `--accent-gold` | `#F5C341` | Or |
| `--accent-cyan` | `#22D3EE` | Cyan vif |
| `--accent-purple` | `#A78BFA` | Violet |

### Typographies

| Usage | Font | Style |
|-------|------|-------|
| Display | Cormorant Garamond | Serif, luxe |
| Body | Inter | Sans-serif, clean |
| Mono | JetBrains Mono | Code/données |

### Incohérences brand

| Problème | Détail | Fichiers |
|----------|--------|----------|
| localStorage keys `brume_*` | 12+ clés encore en `brume_` au lieu de `breveil_` | `stores/useStore.ts`, composants divers |
| Theme key | `brume-theme` (tiret) vs `brume_*` (underscore) | `stores/useTheme.ts` |
| Event messages mixtes | `BREVEIL_SYNC_COMPLETE` ET `BRUME_SYNC_COMPLETE` | `OfflineBanner.tsx` |

---

## 2. STACK TECHNIQUE

| Couche | Technologie | Version |
|--------|------------|---------|
| **Framework** | Next.js (App Router) | 16.1.6 |
| **UI** | React | 19.2.3 |
| **Langage** | TypeScript (strict) | ^5 |
| **Base de données** | Supabase (PostgreSQL + Auth + Storage + Realtime) | 2.97.0 |
| **Carte** | Mapbox GL JS (style custom `matlab244/cmm6okd7v005q01s49w19fac0`) | 3.18.1 |
| **State management** | Zustand | 5.0.11 |
| **CSS** | Tailwind v4 + CSS Custom Properties | 4.x |
| **Animations** | Framer Motion | 12.34.3 |
| **Icons** | Lucide React | 0.575.0 |
| **i18n** | next-intl (30 locales, en+fr a 100%) | 4.8.3 |
| **Paiement** | Stripe | 20.3.1 |
| **Email** | Resend | 6.9.3 |
| **Push notifications** | web-push (VAPID) | 3.6.7 |
| **Audio/Video temps reel** | LiveKit | 2.17.2 |
| **Verification identite** | Veriff | API externe |
| **Toasts** | Sonner | 2.0.7 |
| **Emoji** | @emoji-mart/react | 1.1.1 |
| **Tests** | Vitest + @testing-library | 4.0.18 |

---

## 3. ARCHITECTURE FICHIERS

```
src/
  app/                          # Next.js App Router
    admin/                     # Dashboard admin (10 pages)
    api/                       # 36 routes API
    auth/                      # OAuth callback
    login/                     # Page login
    map/                       # Page principale (map)
    onboarding/                # Funnel onboarding
    track/[sessionId]/         # Suivi trajet public
    cookies/ privacy/ terms/   # Pages legales
    layout.tsx                 # Root layout
    globals.css                # Design tokens + animations
    tailwind-theme.css         # Extension theme Tailwind

  components/                   # 95+ composants
    admin/          (11)       # Panel admin
    chat/           (2)        # ChatView, ChatBubble
    community/      (16)       # Hub social complet
    escorte/        (3)        # Accompagnement securise
    hashtags/       (5)        # Systeme hashtags
    map/            (1)        # PinDetailSheet
    nearby/         (1)        # NearbySheet
    settings/       (17)       # Parametres complets
    subscription/   (1)        # PaywallScreen
    trip/           (2)        # TripView, FavorisSheet
    ui/             (2)        # Avatar, EmojiPicker
    [root]          (40)       # Composants principaux

  stores/           (3)        # useStore, useTheme, notificationStore
  hooks/            (9)        # Custom hooks React
  lib/              (28)       # Utilitaires
  types/            (1)        # Types TypeScript centraux
  messages/         (2)        # en.json, fr.json
  i18n/             (2)        # Config i18n
  __tests__/        (8)        # Tests unitaires

supabase/
  migrations/       (11)       # Migrations SQL
  functions/                   # Edge Functions (emergency-dispatch, send-push)

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
| localStorage | Prefixe `brume_` (legacy) |
| CSS z-index | Tailwind scale: `z-600` pas `z-[600]` |
| i18n | Pas de `t(variable)` — lookup maps (Record) |

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
| 8 | Trajet / Escorte | ACTIF | `EscorteSheet.tsx`, `TripView.tsx`, `TripHUD.tsx` |
| 9 | Espaces surs | ACTIF | `SafeSpaceDetailSheet.tsx` |
| 10 | Signalement incident | ACTIF | `ReportSheet.tsx`, `ConfirmIncidentModal.tsx` |
| 11 | Notifications push | ACTIF | `PushOptInModal.tsx`, `/api/push-notify*`, `service-worker.js` |
| 12 | Notifications in-app | ACTIF | `NotificationsSheet.tsx`, `GlobalToast.tsx`, `notificationStore.ts` |
| 13 | Parametres | ACTIF | `SettingsSheet.tsx`, 17 sous-ecrans |
| 14 | Onboarding | ACTIF | `OnboardingFunnel.tsx` (11 etapes) |
| 15 | Abonnement Stripe | ACTIF | `PaywallScreen.tsx`, `/api/stripe/*` |
| 16 | Gamification | ACTIF | `milestones.ts`, `streaks.ts`, `levels.ts`, `ChallengesSection.tsx` |
| 17 | Profil perso | ACTIF | `MyKovaView.tsx` |
| 18 | Admin dashboard | ACTIF | `admin/` (13 pages) |
| 19 | PWA | ACTIF | `manifest.json`, `InstallPrompt.tsx`, `OfflineBanner.tsx` |
| 20 | i18n | ACTIF | `next-intl` — en+fr complets, 28 locales squelettes |
| 21 | Verification identite | PARTIEL | `/api/verify/*`, Veriff — UI "coming soon" |
| 22 | Tab "me" (profil) | DESACTIVE | `BottomNav.tsx` — tab rendu mais `aria-disabled`, opacity 0.4 |
| 23 | RGPD / Export donnees | PARTIEL | Menu dans Securite, backend incomplet |
| 24 | Redesign Communaute | DIFFERE | Besoin session design (Telegram-style) |
| 25 | HUD Escorte plein ecran | DIFFERE | Besoin session design |

### Detail par feature

#### 1. Carte & Pins
- **Layers** : pins HTML (`<MapPin>`), clusters GeoJSON, transit stops, safe spaces, POI, heat map, route lines
- **Filtres** : par categorie (urgent, attention, infra, positif), par temps
- **Style** : Mapbox custom style (dark by default, switch possible)
- **Interactions** : tap pin → detail sheet, drag pour signaler, compass button (reset north)
- **Catégories pins** : assault, harassment, theft, following, suspect, group, unsafe, lighting, blocked, closed, safe, help, presence

#### 2. SOS / Urgence
- **Activation** : hold 3s sur FAB → countdown 5s → dispatch
- **Phases** : idle → count → sending → sent → resolution
- **Actions** : pin urgence, trail GPS (30m/45s), dispatch contacts cercle via Edge Function, SOS thread communaute
- **Resolution** : bouton "I'm Safe", notification au cercle
- **UI** : flash rouge, progress ring SVG, vibration, numeros d'urgence (17, SAMU, pompiers, EU 112)

#### 3-7. Communaute
- **Fil** : posts communautaires + threads SOS, likes, commentaires
- **Cercle** : contacts de confiance, invitations (pseudo/email/tel), labels smart (Membre/En attente)
- **Groupes** : creation (nom + emoji + description), chat de groupe, decouverte
- **Messages** : DM 1-on-1, badge unread realtime, push notifications, ChatView avec emoji picker
- **Stories** : creation ephemere (24h), viewer fullscreen, likes, messages, partage

#### 8. Trajet / Escorte
- **Modes** : marche, velo, voiture, transports (metro, RER, bus, tram)
- **Directions** : Mapbox Directions API + Transit API
- **Features** : favoris, recents, selection membres cercle, canal audio LiveKit, ETA temps reel
- **HUD** : TripHUD en cours de trajet, checkpoints, session briefing

#### 9. Espaces surs
- **Types** : infirmeries, hopitaux, cafes, commerces
- **Details** : horaires par jour, photos/videos, votes, commentaires, navigation
- **Statut** : indicateur "ouvert maintenant"

#### 10-12. Notifications
- **Push** : VAPID web-push, service worker, `/api/push-notify`, `/api/push-notify-dm`, `/api/notify-nearby`
- **In-app** : NotificationsSheet (bell icon), GlobalToast (auto-dismiss 4s)
- **Types** : emergency, vote, comment, resolve, community, trusted_contact, milestone, digest, trip_share, circle_invitation
- **Settings** : toggle DM notifications, quiet hours, rayon proximite

#### 13. Parametres
- **Compte** : infos perso, photo, pseudo, email, mot de passe, verification, visibilite, suppression
- **Securite** : cercle, badge verif, alertes, localisation, RGPD
- **Preferences** : dark mode, langue (en/fr), notifications DM
- **Support** : chat avec equipe (meme systeme DM)
- **Abonnement** : paywall, mon plan, referral

#### 14. Onboarding (11 etapes)
1. Welcome, 2. Date naissance, 3. Pays, 4. Ville, 5. Objectifs (6 choix), 6. Avatar (12 emojis + gradient), 7. Nom, 8. Permission localisation, 9. Contacts confiance, 10. Paywall, 11. Tour

#### 15. Abonnement
- **Plans** : Free vs Pro (mensuel/annuel)
- **Integration** : Stripe Checkout, webhook, portal
- **Referral** : code parrainage avec copie

#### 16. Gamification
- Milestones (achievements), streaks quotidiens, niveaux, challenges hebdo
- `milestones.ts`, `streaks.ts`, `levels.ts`, `ChallengesSection.tsx`

---

## 5. BASE DE DONNEES

### Tables Supabase (62 tables)

| Table | Rows | RLS | Usage |
|-------|------|-----|-------|
| `profiles` | 6 | oui | Profils utilisateurs |
| `pins` | 310 | oui | Signalements carte |
| `pin_votes` | 18 | oui | Votes sur pins |
| `pin_comments` | 4 | oui | Commentaires pins |
| `pin_evidence` | 21 | oui | Preuves/medias pins |
| `pin_follows` | 0 | oui | Suivi de pins |
| `pin_stories` | 0 | oui | Stories liees aux pins |
| `pin_thanks` | 0 | oui | Remerciements pins |
| `communities` | 5 | oui | Communautes |
| `community_members` | 8 | oui | Membres communautes |
| `community_messages` | 8 | oui | Messages communautes |
| `community_posts` | 14 | oui | Posts communautes |
| `community_stories` | 2 | oui | Stories communautes |
| `post_comments` | 4 | oui | Commentaires posts |
| `post_likes` | 0 | oui | Likes posts |
| `story_likes` | 0 | oui | Likes stories |
| `story_messages` | 0 | oui | Messages stories |
| `dm_conversations` | 0 | oui | Conversations DM |
| `direct_messages` | 0 | oui | Messages directs |
| `trusted_contacts` | 4 | oui | Contacts de confiance |
| `circle_invitations` | 2 | oui | Invitations cercle |
| `friendships` | 1 | oui | Amities |
| `notifications` | 2 | oui | Notifications persistantes |
| `notification_settings` | 0 | oui | Preferences notifications |
| `push_subscriptions` | 0 | oui | Abonnements push |
| `escortes` | 46 | oui | Sessions escorte |
| `escorte_circle` | 1 | oui | Cercle escorte |
| `trips` | 1 | oui | Trajets |
| `trip_log` | 13 | oui | Logs trajet |
| `trip_checkpoints` | 0 | oui | Checkpoints trajet |
| `saved_routes` | 1 | oui | Routes sauvegardees |
| `favoris_trajets` | 2 | oui | Trajets favoris |
| `trajets_recents` | 14 | oui | Trajets recents |
| `saved_places` | 0 | oui | Lieux sauvegardes |
| `place_notes` | 2 | oui | Notes de lieux |
| `safe_spaces` | 1 | oui | Espaces surs |
| `safe_space_votes` | 0 | oui | Votes espaces surs |
| `safe_space_media` | 0 | oui | Medias espaces surs |
| `safe_space_media_likes` | 0 | oui | Likes medias |
| `location_history` | 571 | oui | Historique positions |
| `live_sessions` | 0 | oui | Sessions live |
| `walk_sessions` | 4 | oui | Sessions marche |
| `subscriptions` | 0 | oui | Abonnements Stripe |
| `invoices` | 0 | oui | Factures |
| `pro_waitlist` | 1 | oui | Liste attente Pro |
| `invite_codes` | 1 | oui | Codes invitation |
| `invite_code_uses` | 0 | oui | Utilisations codes |
| `pending_invites` | 1 | oui | Invitations en attente |
| `trusted_circle` | 0 | oui | Cercle de confiance (v2?) |
| `admin_params` | 10 | oui | Parametres admin |
| `user_milestones` | 0 | oui | Achievements utilisateur |
| `user_reports` | 1 | oui | Signalements utilisateur |
| `challenges` | 0 | oui | Challenges hebdo |
| `user_challenges` | 0 | oui | Progres challenges |
| `sos_responders` | 1 | oui | Repondants SOS |
| `sos_dispatch_log` | 0 | oui | Logs dispatch SOS |
| `audio_checkins` | 0 | oui | Check-ins audio |
| `engagement_events` | 5 | oui | Events engagement |
| `email_logs` | 3 | oui | Logs emails |
| `hashtags` | 10 | oui | Hashtags |
| `content_hashtags` | 2 | oui | Liens contenu-hashtag |
| `waitlist` | 0 | oui | Liste attente generale |
| `route_upvotes` | 0 | oui | Votes routes |

### Tables potentiellement inutilisees (0 rows, features non demarrees)

- `pin_follows`, `pin_stories`, `pin_thanks`
- `live_sessions`, `audio_checkins`
- `challenges`, `user_challenges`, `user_milestones`
- `subscriptions`, `invoices`
- `trusted_circle` (doublon avec `trusted_contacts`?)
- `waitlist`, `route_upvotes`, `saved_places`
- `safe_space_votes`, `safe_space_media`, `safe_space_media_likes`
- `push_subscriptions` (0 — en dev local seulement?)

### Migrations appliquees (11)

1. `20260222_subscriptions.sql` — Tables Stripe
2. `20260224_persistent_notifications.sql` — Notifications DB
3. `20260225_safety_buddies.sql` — Contacts confiance / cercle
4. `20260226_weekly_digest_cron.sql` — Cron emails digest
5. `20260227_moderation.sql` — Moderation contenu
6. `20260228_emergency_dispatch.sql` — Dispatch SOS
7. `20260229_invite_codes.sql` — Codes invitation
8. `20260301_admin_params.sql` — Parametres admin
9. `20260302_pin_evidence.sql` — Preuves pins
10. `20260303_profile_language.sql` — Langue profil
11. `20260305_trip_sheet_schema.sql` — Schema trajets

---

## 6. API ROUTES (36 endpoints)

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
| `/api/circle/search` | POST | Recherche par email/tel |

### Paiement (Stripe)

| Route | Methode | Usage |
|-------|---------|-------|
| `/api/stripe/checkout` | POST | Creer session checkout |
| `/api/stripe/webhook` | POST | Webhook paiement |
| `/api/stripe/portal` | POST | Portal facturation |

### Trajets

| Route | Methode | Usage |
|-------|---------|-------|
| `/api/trips/start` | POST | Demarrer trajet |
| `/api/trips/checkpoint` | POST | Logger checkpoint |
| `/api/trips/end` | POST | Terminer trajet |

### SOS

| Route | Methode | Usage |
|-------|---------|-------|
| `/api/sos/thread` | POST | Creer thread SOS communaute |

### Invitations

| Route | Methode | Usage |
|-------|---------|-------|
| `/api/invite/redeem` | POST | Utiliser code invitation |
| `/api/invite/validate` | POST | Valider code |

### Email

| Route | Methode | Usage |
|-------|---------|-------|
| `/api/send-welcome` | POST | Email bienvenue |
| `/api/cron/lifecycle-emails` | POST | Emails automatiques (cron) |

### LiveKit

| Route | Methode | Usage |
|-------|---------|-------|
| `/api/livekit-token` | POST | Token audio/video |

### Admin & Dev

| Route | Methode | Usage |
|-------|---------|-------|
| `/api/admin-bypass` | POST | Bypass admin (dev/test) |
| `/api/simulation/seed` | POST | Generer donnees test |
| `/api/simulation/tick` | POST | Tick simulation |
| `/api/simulation/cleanup` | POST | Nettoyer simulation |

---

## 7. COMPOSANTS — INVENTAIRE

### Actifs (utilises dans le rendu)

**Orchestrateur principal** : `src/app/map/page.tsx` (1045 lignes)

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
| PushOptInModal | `components/PushOptInModal.tsx` | map/page.tsx |
| InstallPrompt | `components/InstallPrompt.tsx` | map/page.tsx |
| OfflineBanner | `components/OfflineBanner.tsx` | map/page.tsx |
| SosBanner | `components/SosBanner.tsx` | map/page.tsx |
| CityContextPanel | `components/CityContextPanel.tsx` | map/page.tsx |
| CommunityTooltip | `components/CommunityTooltip.tsx` | map/page.tsx |
| GlobalToast | `components/GlobalToast.tsx` | map/page.tsx |
| ConfirmIncidentModal | `components/ConfirmIncidentModal.tsx` | map/page.tsx |
| SafeSpaceDetailSheet | `components/SafeSpaceDetailSheet.tsx` | map/page.tsx |
| ChatView | `components/chat/ChatView.tsx` | messages-tab, SupportChatScreen |
| ChatBubble | `components/chat/ChatBubble.tsx` | ChatView.tsx |
| UserProfileModal | `components/UserProfileModal.tsx` | community, map |
| UserContextMenu | `components/UserContextMenu.tsx` | community |
| EmojiPickerButton | `components/ui/EmojiPickerButton.tsx` | ChatView, compose-modal |

### Deprecated

| Composant | Fichier | Raison |
|-----------|---------|--------|
| CommunityHub | `components/community/CommunityHub.tsx` | Logique migree vers tab-composants individuels |

### Orphelins potentiels (a verifier)

| Composant | Fichier | Observation |
|-----------|---------|-------------|
| BrandAssets | `components/BrandAssets.tsx` | Utilitaire statique — verifier si importe |
| ThemeToggle | `components/ThemeToggle.tsx` | Peut etre remplace par SettingsToggle |
| SimulationTicker | `components/SimulationTicker.tsx` | Dev-only — conditionnel a env |
| NeighborhoodScoreLayer | `components/NeighborhoodScoreLayer.tsx` | Layer carte — verifier si actif |
| LocationHistoryViewer | `components/LocationHistoryViewer.tsx` | Viewer historique — verifier si monte |
| SessionBriefingCard | `components/SessionBriefingCard.tsx` | Briefing trip — verifier usage |
| TrendSparkline | `components/TrendSparkline.tsx` | Mini chart — verifier si importe |
| ProGate | `components/ProGate.tsx` | Paywall gate — verifier si utilise |
| ReferralSection | `components/ReferralSection.tsx` | Section referral — peut etre dans PaywallScreen |
| ChallengesSection | `components/ChallengesSection.tsx` | Challenges — verifier si monte |
| MilestoneToast | `components/MilestoneToast.tsx` | Toast achievement — verifier |
| VerificationView | `components/VerificationView.tsx` | UI verif — "coming soon" |

### Fichiers mentionnes dans MEMORY mais supprimes

| Fichier | Statut |
|---------|--------|
| `OnboardingFunnelV2.tsx` | SUPPRIME — V1 est la version active |
| `CoachMark.tsx` | SUPPRIME — tour tooltip |
| `useTour.ts` | SUPPRIME — hook tour 5 etapes |

---

## 8. DETTE TECHNIQUE

### 8.1 Fichiers trop volumineux (>1000 lignes)

| Fichier | Lignes | Recommandation |
|---------|--------|----------------|
| `components/trip/TripView.tsx` | 1,844 | Extraire sous-composants (mode selector, route preview, transit view) |
| `components/MapView.tsx` | 1,716 | Extraire layer managers, event handlers |
| `components/EscorteSheet.tsx` | 1,572 | Extraire formulaire depart/arrivee, mode selector |
| `components/OnboardingFunnel.tsx` | 1,351 | Extraire chaque step en composant |
| `components/SafeSpaceDetailSheet.tsx` | 1,321 | Extraire gallery, schedule, comments |
| `components/subscription/PaywallScreen.tsx` | 1,181 | Extraire pricing cards, referral |
| `components/MyKovaView.tsx` | 1,085 | Extraire stats cards, streak display |
| `components/trip/FavorisSheet.tsx` | 1,059 | Extraire list items, search |
| `app/map/page.tsx` | 1,045 | Extraire hooks custom (useMapInit, usePins, etc.) |
| `components/community/create-group-modal.tsx` | 1,018 | Extraire form steps |

### 8.2 Usages de `any` (8 fichiers)

| Fichier | Contexte |
|---------|----------|
| `community/post-card.tsx` | `(item as any).danger` |
| `community/groupes-tab.tsx` | Payload realtime |
| `community/fil-tab.tsx` | Payload realtime |
| `ui/EmojiPickerButton.tsx` | Emoji data type |
| `MapPin.tsx` | DOM element type |
| `hooks/useDestinationSearch.ts` | Mapbox response |
| `lib/transit.ts` | Transit API response |
| `lib/expertise.ts` | Expertise data |

### 8.3 console.log en production (26 fichiers)

Fichiers avec `console.log` / `console.error` a auditer :
- Composants : `MapView`, `EmergencyButton`, `post-card`, `story-viewer`, `ChatView`, etc.
- API routes : `push-notify`, `push-notify-dm`, `notify-nearby`, `stripe/*`, etc.
- Libs : `support.ts`, `pushSubscription.ts`, `TripMonitor.ts`

**Action** : Creer un logger utilitaire avec niveaux (dev/prod), supprimer les console.log directs.

### 8.4 Coherence CSS

| Pattern | Occurrences | Probleme |
|---------|-------------|----------|
| `className=` (Tailwind) | ~876 | OK |
| `style=` (inline) | ~2,711 | Trop d'inline — couleurs hardcodees |
| CSS Custom Properties | Dans `globals.css` | Bien centralise mais pas assez utilise |

**Duplication couleurs** :
- `globals.css` : variables CSS officielles
- `tailwind-theme.css` : repetition pour Tailwind
- `lib/colors.ts` : objet `C` avec noms paralleles (C.midnight, C.veil, etc.)
- Inline : hex codes hardcodes dans 10+ composants

### 8.5 Brand legacy

| Element | Valeur actuelle | Valeur cible |
|---------|----------------|--------------|
| localStorage `brume_onboarding_done` | `brume_` | `breveil_` |
| localStorage `brume_milestones` | `brume_` | `breveil_` |
| localStorage `brume_active_trip` | `brume_` | `breveil_` |
| localStorage `brume_show_simulated` | `brume_` | `breveil_` |
| localStorage `brume_push_dismissed` | `brume_` | `breveil_` |
| localStorage `brume_session_count` | `brume_` | `breveil_` |
| localStorage `brume_is_pro` | `brume_` | `breveil_` |
| localStorage `brume-theme` | tiret | `breveil_theme` |
| Event `BRUME_SYNC_COMPLETE` | mixte | `BREVEIL_SYNC_COMPLETE` |
| IndexedDB `brume_offline` | `brume_` | `breveil_` |

---

## 9. DEPENDANCES

### Dependencies (55)

| Categorie | Package | Utilise | Note |
|-----------|---------|---------|------|
| **Framework** | next, react, react-dom | OUI | Core |
| **TypeScript** | typescript | OUI | Core |
| **Database** | @supabase/supabase-js, @supabase/ssr | OUI | Core |
| **Map** | mapbox-gl | OUI | Core |
| **State** | zustand | OUI | Core |
| **CSS** | tailwindcss, @tailwindcss/postcss | OUI | Core |
| **Animation** | framer-motion | OUI | Forte utilisation |
| **Icons** | lucide-react | OUI | Partout |
| **i18n** | next-intl | OUI | 30 locales |
| **Toast** | sonner | OUI | Toasts systeme |
| **Paiement** | stripe, @stripe/stripe-js | OUI | Paywall |
| **Email** | resend | OUI | Emails transactionnels |
| **Push** | web-push | OUI | Notifications push |
| **Audio/Video** | livekit-client, livekit-server-sdk | OUI | Escorte audio |
| **Emoji** | @emoji-mart/react, @emoji-mart/data | OUI | Chat + compose |

**Aucune dependance manifestement inutilisee detectee.**

### DevDependencies (17)

| Package | Usage |
|---------|-------|
| vitest | Tests unitaires |
| @testing-library/* | Tests composants |
| @types/* | Types TypeScript |
| eslint, eslint-config-next | Linting |
| postcss | Pipeline CSS |

---

## 10. VARIABLES D'ENVIRONNEMENT

### Publiques (`NEXT_PUBLIC_*`)

| Variable | Service |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push |
| `NEXT_PUBLIC_SITE_URL` | URL production |
| `NEXT_PUBLIC_SUPPORT_USER_ID` | ID user support |

### Privees (server-side only)

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

---

## 11. RECOMMANDATIONS

### PRIORITE HAUTE

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 1 | Migrer `brume_*` → `breveil_*` localStorage (avec fallback migration) | Brand coherence | Moyen |
| 2 | Supprimer/conditionner les 26 `console.log` en production | Performance + securite | Faible |
| 3 | Supprimer `CommunityHub.tsx` (deprecated) | Nettoyage | Faible |
| 4 | Verifier et supprimer les composants orphelins (section 7) | Nettoyage | Moyen |

### PRIORITE MOYENNE

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 5 | Refactor TripView.tsx (1844 lignes) en sous-composants | Maintenabilite | Eleve |
| 6 | Refactor MapView.tsx (1716 lignes) | Maintenabilite | Eleve |
| 7 | Remplacer les 8 `any` par des types stricts | Type safety | Faible |
| 8 | Centraliser les couleurs inline → CSS vars | Coherence design | Moyen |
| 9 | Supprimer tables DB a 0 rows inutilisees | Nettoyage DB | Faible |

### PRIORITE BASSE

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 10 | Consolider globals.css + tailwind-theme.css + colors.ts | DX | Moyen |
| 11 | Activer le tab "me" ou le supprimer | UX coherence | Moyen |
| 12 | Completer traductions 28 locales restantes | i18n | Eleve |
| 13 | Ajouter tests unitaires (couverture actuelle faible) | Qualite | Eleve |
| 14 | Documenter les Edge Functions Supabase | DX | Faible |

---

## 12. METRIQUES PROJET

| Metrique | Valeur |
|----------|--------|
| Fichiers TS/TSX | ~195 |
| Composants React | 95+ |
| Routes API | 36 |
| Pages publiques | 8 |
| Pages admin | 13 |
| Custom hooks | 9 |
| Zustand stores | 3 |
| Libs utilitaires | 28 |
| Migrations DB | 11 |
| Tables Supabase | 62 |
| Dependencies npm | 55 |
| DevDependencies | 17 |
| Variables env | 21+ |
| Locales i18n | 30 (2 completes) |
| Lignes code estimees | ~30,000 |
| Plus gros fichier | TripView.tsx (1,844 lignes) |
| Services tiers | 6 (Supabase, Mapbox, Stripe, Resend, Veriff, LiveKit) |
