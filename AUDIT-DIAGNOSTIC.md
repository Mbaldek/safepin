# BREVEIL — Audit Diagnostic

> **Date** : 2026-03-11 | **Version app** : 0.1.0 | **Auteur** : Claude Opus 4.6 + Mathieu

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
| **Toasts** | Sonner 2.0.7 + `bToast` wrapper (`GlobalToast.tsx`) — migration en cours |
| **Emoji** | @emoji-mart/react + @emoji-mart/data | 1.1.1 / 1.2.1 |
| **Tests** | Vitest + @testing-library | 4.0.18 |
| **PostGIS** | postgis, unaccent, moddatetime (schema: extensions) | — |

---

## 3. ARCHITECTURE FICHIERS

```
src/
  app/                          # Next.js App Router
    admin/                     # Dashboard admin (12 sous-pages, 4 stubs)
    api/                       # 23 routes API
    auth/                      # OAuth callback
    login/                     # Page login
    map/                       # Page principale (map)
    onboarding/                # Funnel onboarding
    track/[sessionId]/         # Suivi trajet public
    cookies/ privacy/ terms/   # Pages legales
    layout.tsx                 # Root layout
    globals.css                # 201 design tokens + animations
    tailwind-theme.css         # Extension theme Tailwind

  components/                   # ~106 composants
    admin/          (12)       # Panel admin
    chat/           (2)        # ChatView, ChatBubble
    community/      (16)       # Hub social complet
    escorte/        (3)        # Accompagnement securise
    hashtags/       (4)        # Systeme hashtags
    map/            (1)        # PinDetailSheet
    nearby/         (1)        # NearbySheet
    settings/       (20)       # Parametres complets (5 composants + 15 screens)
    subscription/   (1)        # PaywallScreen
    trip/           (3)        # TripView, FavorisSheet, RouteCard
    ui/             (2)        # Avatar, EmojiPicker
    [root]          (41)       # Composants principaux (+WalkHistorySheet, WalkWithMePanel)

  stores/           (4)        # useStore, useTheme, uiStore, notificationStore
  hooks/            (9)        # Custom hooks React
  lib/              (32)       # Utilitaires (dont route-scoring.ts, geocode.ts, simulation-data.ts)
  types/            (1)        # Types TypeScript centraux (60+ types exportes)
  messages/         (2)        # en.json, fr.json
  i18n/             (2)        # Config i18n
  __tests__/        (8)        # Tests unitaires

supabase/
  migrations/       (18)       # Migrations SQL
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
| Toasts | `bToast.success/danger/info/warning({ title }, isDark)` via `GlobalToast.tsx` |

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
| 18 | Admin dashboard | ACTIF | `admin/` (12 pages, 4 stubs) |
| 19 | PWA | ACTIF | `manifest.json`, `InstallPrompt.tsx`, `OfflineBanner.tsx` |
| 20 | i18n | ACTIF | `next-intl` — en+fr complets, 28 locales squelettes |
| 21 | Verification identite | PARTIEL | `/api/verify/*`, Veriff — UI "coming soon" |
| 22 | RGPD / Export donnees | **ACTIF** | `PrivacyScreen.tsx`, `DeleteAccountScreen.tsx`, `/api/export-data`, RPC `delete_account` |
| 23 | Route scoring & alternatives | ACTIF | `route-scoring.ts`, `fetchDirectionsMulti()`, `RouteCard.tsx` |
| 24 | Walk With Me | **NOUVEAU** | `WalkWithMePanel.tsx`, `WalkHistorySheet.tsx`, audio player |
| 25 | Viewport clustering | **NOUVEAU** | RPCs `pins_nearby`, `pins_clustered`, `mapViewport` Zustand, `DB_CLUSTER_SRC` layers |
| 26 | Simulation lifecycle | **NOUVEAU** | `simulation-data.ts`, seed/tick/cleanup APIs, admin simulation panel |

### Changements depuis dernier audit (2026-03-09)

| Element | Avant | Apres |
|---------|-------|-------|
| Feature #22 RGPD | PARTIEL (menu seul) | **ACTIF** — PrivacyScreen + export JSON + delete_account RPC |
| `/api/export-data` | N'existait pas | **CREE** — export profil, pins, comments, votes, contacts, messages |
| `delete_account` RPC | Non tracke | **Migration creee** (`20260309_delete_account_rpc.sql`) — documentaire |
| Toast settings (5 fichiers) | `import { toast } from 'sonner'` | **Migre vers `bToast`** (GlobalToast wrapper) |
| PostGIS extensions | Non documentees | **postgis, unaccent, moddatetime** actifs en prod |
| `pins.location` | Texte lat/lng | **GEOGRAPHY(POINT,4326)** + index GIST |
| RPCs spatiales | Aucune | **pins_nearby, pins_clustered, user_ids_near_point** |
| 122 RLS policies | `auth.uid()` direct | **`(select auth.uid())`** (init-plan per-query) |
| GIN+trgm indexes | Aucun | **pins.address, hashtags, profiles, communities** |
| `pins.expires_at` | N'existait pas | **Colonne + trigger** mirroring DECAY_HOURS par categorie |
| `mapViewport` Zustand | N'existait pas | **{lat,lng,zoom,radiusM}** — MapView emet sur moveend (debounce 400ms) |
| DB clusters | N'existait pas | **`dbClusters`** dans Zustand, layers Mapbox GL `DB_CLUSTER_SRC` a zoom<10 |
| `WalkHistorySheet` | N'existait pas | **CREE** — historique marches Walk With Me + player audio |
| `UserProfileModal` | Version initiale | **Redesign** — bottom sheet snap points, share menu |
| `AutocompleteInput` | Bug onChange | **Fix** — API `(text, coords?)` correcte |
| Admin RLS (6 policies) | Manquantes — stats a 0 | **CREE** — `20260311_admin_rls_policies.sql` (reports, pins, trips) |
| Admin sim RLS (2 policies) | Manquantes — trip_log/contacts | **CREE** — `20260311_admin_sim_rls.sql` (admins_read_all) |
| Simulation seed | Stub (users+pins only) | **REECRIT** — users, pins, communities, contacts, safe spaces + hard caps G3 |
| Simulation tick | Stub (pin creation only) | **REECRIT** — 8 actions ponderees (pins, votes, comments, messages, trajets, contacts, marches) |
| Simulation cleanup | Stub (basique) | **REECRIT** — 13 etapes ordonnees par dependances FK |
| Simulation admin UI | Stub vide | **REECRIT** — 6 StatCards, seed panel, tick engine (auto 10/20/30s), G4 budget 100 ticks, cleanup panel |
| Edge fn `on-new-pin` | Pas de garde sim | **G1** — early return pour `is_simulated` pins (zero cout edge fn) |
| `simulation-data.ts` | N'existait pas | **CREE** — donnees sim (noms, lieux Paris, categories, messages groupe, modes trajet) |
| TowerSidebar | Tous liens actifs | **4 stubs** (Live, SafeSpaces, Invites, Emails) avec badge "Bientot" |
| WalkHistorySheet tabs | Jank au switch | **Fix** — hauteur stable 70vh, minHeight scroll area |
| Migrations total | 11 | **17** (+circle_messages, delete_account, story_mentions, story_visibility, admin_rls, admin_sim_rls) |
| Routes API total | 22 | **23** (+export-data) |
| Composants total | 104 | **~106** |

### Detail features cles

#### 8. Trajet / Escorte
- **Modes** : marche, velo, voiture (+ transports dans EscorteSheet)
- **Directions** : Mapbox Directions API + `alternatives=true` (jusqu'a 3 routes)
- **Route scoring** : `scoreRoute(coords, pins)` — corridor 200m, severity * decay * confirmations
- **UI** : RouteCard compact (dot selection, pastille couleur, label, duree, distance)
- **Couleurs routes** : Plus sure (#34D399), Equilibree (#F5C341), Plus rapide (#EF4444)
- **Features** : favoris, recents, selection membres cercle, canal audio LiveKit, ETA temps reel
- **HUD** : TripHUD en cours de trajet, checkpoints, session briefing
- **danger_score** : envoye a `/api/trips/start` (etait hardcode a 0)

#### 17. Profil (AMELIORE : redesign UserProfileModal)
- **UserProfileModal** : bottom sheet avec snap points 50%/86%, share menu (copier lien, WhatsApp, Telegram, Email, message in-app)
- **UserContextMenu** : bottom sheet avec Follow, Message, Voir profil, Inviter cercle
- **displayName** : champ separe du username, utilise pour affichage reel (prenom nom) vs @pseudo
- **Wiring global** : via `uiStore` + `GlobalModals.tsx`

#### 22. RGPD / Export donnees (COMPLETE)
- **PrivacyScreen** : 3 documents legaux (confidentialite, CGU, cookies) + export + suppression
- **Export** : `/api/export-data` → JSON (profil, pins, comments, votes, contacts, notifications, messages, routes)
- **Delete** : RPC `delete_account` (SECURITY DEFINER, SET search_path = '') → anonymise profil + supprime contacts, location_history, direct_messages, push_subscriptions
- **UI** : 2-step DeleteAccountScreen (checkbox "irréversible" → taper "SUPPRIMER")
- **Footer** : DBEK, 75 rue de Lourmel 75015 Paris, brumeapp@pm.me, CNIL

#### 24. Walk With Me (NOUVEAU)
- **WalkWithMePanel** : panneau accompagnement marche temps reel
- **WalkHistorySheet** : historique des marches avec player audio integre
- **Toasts** : migre vers bToast

#### 25. Viewport clustering (NOUVEAU)
- **mapViewport** : `{lat,lng,zoom,radiusM}` dans Zustand, emis par MapView sur moveend+load (debounce 400ms)
- **loadPins** : zoom>=10 → `pins_nearby` (radius*1.3, cap 15km) ; zoom<10 → `pins_clustered` (eps adaptatif) ; fallback → global
- **DB clusters** : `dbClusters` dans Zustand, layers `DB_CLUSTER_SRC` rendus a zoom<10
- **MapPin hide** : `mapZoom` state dans MapView — masque `<MapPin>` a zoom<10 (affiche clusters DB)
- **Distance** : PinDetailSheet affiche `haversineMetersRaw(userLocation, pin)` inline

#### 26. Simulation lifecycle (NOUVEAU)
- **Fichiers** : `lib/simulation-data.ts`, `api/simulation/{seed,tick,cleanup}/route.ts`, `admin/simulation/page.tsx`
- **Seed** : Cree users (auth+profiles+sim_places), pins, communities, trusted_contacts, safe_spaces avec hard caps (G3: 200 users, 1000 pins, 5 communities, 4 contacts/user, 100 safe spaces)
- **Tick** : 8 actions ponderees — pin (30%), vote (10%), comment (10%), message groupe (15%), lancer trajet (10%), completer trajet (5%), ajouter contact (10%), marche accompagnee (10%)
- **Cleanup** : 13 etapes ordonnees par dependances FK → auth users en dernier (batch 20)
- **Admin UI** : 6 StatCards temps reel, panneau seed configurable, tick engine (1-tick + auto 10/20/30s), budget G4 (100 ticks max), feed d'actions, panneau purge avec confirmation "PURGER", banner warning G7 (>150 users ou >800 pins)
- **Garde-fous** : G1 (edge fn skip sim), G2 (pas de notifications table), G3 (hard caps seed), G4 (budget ticks), G5 (1-3 actions/tick), G6 (batch inserts), G7 (warnings UI), G8 (dev-only guard)
- **Donnees** : 20 prenoms + 20 noms FR, 15 quartiers Paris avec coords, 15 messages groupe FR, 10 noms communautes, 3 modes trajet

---

## 5. BASE DE DONNEES

### Tables Supabase (62 tables)

| Table | Usage |
|-------|-------|
| `profiles` | Profils utilisateurs (+ GEOGRAPHY location/home_location) |
| `pins` | Signalements carte (+ GEOGRAPHY location, expires_at) |
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

### RPCs spatiales (NOUVEAU)

| RPC | Signature | Usage |
|-----|-----------|-------|
| `pins_nearby` | `(lat, lng, radius_m)` → SETOF pins | Pins dans rayon via GIST index |
| `pins_clustered` | `(lat, lng, radius_m, eps_m)` → clusters | ST_ClusterDBSCAN, centroids |
| `user_ids_near_point` | `(lat, lng, max_radius_m)` → user IDs | Pre-filtre spatial pour notify-nearby |
| `delete_account` | `()` → void | Anonymise profil + supprime donnees sensibles (SECURITY DEFINER) |

### Migrations appliquees (18)

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
| 12 | `20260308_circle_messages.sql` | Messages de cercle |
| 13 | `20260309_delete_account_rpc.sql` | RPC delete_account (documentaire — deja en prod) |
| 14 | `20260309_story_mentions.sql` | Mentions dans stories |
| 15 | `20260309_story_visibility.sql` | Visibilite stories |
| 16 | `20260311_admin_rls_policies.sql` | 6 RLS policies admin (reports CRUD, pins update/delete, trips SELECT) |
| 17 | `20260311_admin_sim_rls.sql` | 2 RLS policies admin (trip_log SELECT, trusted_contacts SELECT) |
| 18 | `20260311_profile_stat_triggers.sql` | Triggers stats profil (en attente) |

### PostGIS & indexes (appliques en prod, non migres)

- `postgis`, `unaccent`, `moddatetime` extensions (schema: extensions)
- `pins.location` + `profiles.location/home_location` → GEOGRAPHY(POINT,4326) + GIST indexes
- `pins.expires_at` colonne + trigger mirroring DECAY_HOURS par categorie
- Partial indexes: `idx_pins_active_expires`, `idx_pins_user_created`
- GIN+trgm indexes sur pins.address, hashtags, profiles, communities (fuzzy search FR)
- 122 RLS policies corrigees: `auth.uid()` → `(select auth.uid())` (init-plan per-query)

### Edge Functions Supabase (4)

| Fonction | Declencheur | Action |
|----------|-------------|--------|
| `emergency-dispatch` | Appel API | Dispatch SOS aux contacts via push + SMS |
| `on-new-pin` | DB webhook INSERT pins | Alerte proximite routes sauvegardees (300m) — **G1: skip is_simulated** |
| `send-push-notification` | DB webhook INSERT notifications | Envoi Web Push via VAPID/JWT |
| `weekly-digest` | pg_cron lundi 9h UTC | Email digest hebdomadaire |

---

## 6. API ROUTES (23 endpoints)

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

### RGPD (NOUVEAU)

| Route | Methode | Usage |
|-------|---------|-------|
| `/api/export-data` | GET | Export donnees utilisateur (JSON) — profil, pins, comments, votes, contacts, messages, routes |

### LiveKit & Admin

| Route | Methode | Usage |
|-------|---------|-------|
| `/api/livekit-token` | POST | Token audio/video |
| `/api/admin-bypass` | GET | Bypass admin (dev/test) |
| `/api/simulation/seed` | POST | Seed complet (users, pins, communities, contacts, safe spaces) — hard caps G3 |
| `/api/simulation/tick` | POST | 1-3 actions ponderees par tick (8 types d'actions) |
| `/api/simulation/cleanup` | POST | Purge 13 etapes ordonnees FK → auth users |

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
| WalkHistorySheet | `components/WalkHistorySheet.tsx` | map/page.tsx (lazy) |
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
| SimulationTicker | `components/SimulationTicker.tsx` | 71 (remplace par admin/simulation/page.tsx) |
| LocationHistoryViewer | `components/LocationHistoryViewer.tsx` | 190 |
| SessionBriefingCard | `components/SessionBriefingCard.tsx` | 189 |
| TrendSparkline | `components/TrendSparkline.tsx` | 137 |
| ProGate | `components/ProGate.tsx` | 84 |
| ReferralSection | `components/ReferralSection.tsx` | 143 |
| ChallengesSection | `components/ChallengesSection.tsx` | ~40 |

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

### 8.6 Migration toast Sonner → bToast (NOUVEAU)

| Statut | Fichiers | Details |
|--------|----------|---------|
| **Migre (bToast)** | **8 fichiers** | map/page.tsx, UserProfileModal, WalkWithMePanel, PrivacyScreen, DeleteAccountScreen, MonCompteScreen, PasswordScreen, ProfilePhotoScreen |
| **Encore sur Sonner** | **14 fichiers** | Voir liste ci-dessous |
| **GlobalToast.tsx** | Definit `bToast` | Importe `toast` de Sonner en interne (normal) |

**Fichiers restants sur Sonner (14) :**

| Fichier | Nombre d'appels toast |
|---------|-----------------------|
| `EmergencyButton.tsx` | 5 |
| `ConfirmIncidentModal.tsx` | 2 |
| `SafeSpaceDetailSheet.tsx` | 4 |
| `CercleChat.tsx` | 2 |
| `chat/ChatView.tsx` | 2 |
| `map/PinDetailSheet.tsx` | 6 |
| `MyKovaView.tsx` | 8 |
| `VerificationView.tsx` | 1 |
| `EscorteSheet.tsx` | 1 |
| `trip/FavorisSheet.tsx` | 3 |
| `community/SoutienSheet.tsx` | import seul (0 appels?) |
| `settings/screens/SecuriteScreen.tsx` | 1 |
| `settings/screens/SessionsSecurityScreen.tsx` | 3 |
| `settings/screens/MyProfileScreen.tsx` | ~10 |

### 8.7 DB — dette non-migree

| Element | Statut |
|---------|--------|
| 58 FK columns sans index | A indexer (batch suivant) |
| 22 fonctions sans `SET search_path = ''` | `function_search_path_mutable` |
| RPCs search (search_pins, search_users, search_hashtags, search_communities) | Crees en DB, pas wirees a l'UI |
| Edge fn `on-new-pin` G1 guard | Code local modifie, **pas encore deploye** (`supabase functions deploy on-new-pin`) |
| Admin pages stubs (4) | Live, SafeSpaces, Invites, Emails — marquees "Bientot" dans TowerSidebar |

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
| 3 | Migrer les 14 fichiers restants Sonner → bToast | Coherence toasts | Moyen |

### PRIORITE MOYENNE

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 4 | Refactor TripView.tsx (1,944 lignes) en sous-composants | Maintenabilite | Eleve |
| 5 | Refactor MapView.tsx (1,771 lignes) | Maintenabilite | Eleve |
| 6 | Centraliser les couleurs inline → CSS vars ou objet partage | Coherence design | Moyen |
| 7 | Consolider globals.css + tailwind-theme.css + colors.ts | DX | Moyen |
| 8 | Wirer search RPCs a l'UI (search_pins, search_users, search_hashtags, search_communities) | UX recherche | Moyen |
| 9 | Indexer les 58 FK columns non-indexes | Perf DB | Moyen |
| 10 | Corriger 22 fonctions `function_search_path_mutable` | Securite DB | Faible |

### PRIORITE BASSE

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 11 | Completer traductions 28 locales restantes | i18n | Eleve |
| 12 | Ajouter tests unitaires (couverture actuelle faible) | Qualite | Eleve |
| 13 | Documenter les Edge Functions Supabase | DX | Faible |
| 14 | Ajouter layer danger zones sur map pendant planification trajet | UX trajet | Moyen |
| 15 | Supprimer tables DB a 0 rows inutilisees | Nettoyage DB | Faible |

---

## 12. METRIQUES PROJET

| Metrique | Valeur |
|----------|--------|
| Fichiers TS/TSX | ~215 |
| Composants React | ~106 |
| Composants orphelins | 9 |
| Routes API | 23 |
| Pages publiques | 8 |
| Pages admin | 12 (8 actives, 4 stubs) |
| Custom hooks | 9 |
| Zustand stores | 4 |
| Libs utilitaires | 32 (+simulation-data.ts) |
| Types exportes | 60+ |
| Migrations DB | 18 |
| RLS policies admin | 8 (6 admin_rls_policies + 2 admin_sim_rls) |
| RPCs spatiales | 4 (pins_nearby, pins_clustered, user_ids_near_point, delete_account) |
| Tables Supabase | 62 |
| Edge Functions | 4 |
| Dependencies npm (prod) | 26 |
| DevDependencies | 15 |
| Variables env | 22 |
| Locales i18n | 30 (2 completes) |
| CSS custom properties | 201 |
| Lignes code estimees | ~52,000 |
| Plus gros fichier | TripView.tsx (1,944 lignes) |
| `as any` | 0 |
| console.log client | 0 |
| Toast bToast migres | 8 fichiers (36%) |
| Toast Sonner restants | 14 fichiers (64%) |
| Services tiers | 7 (Supabase, Mapbox, Stripe, Resend, Veriff, LiveKit, Web Push) |
