# Breveil — Brief Produit & Architecture

> App de sécurité urbaine collaborative — signalements en temps réel, escorte de trajet, cercle de confiance, communauté.

---

## 1. Vision & Positionnement

**Breveil** est une app mobile-first (PWA Next.js) de sécurité urbaine collaborative. Les utilisateurs signalent des incidents géolocalisés, partagent leur trajet en temps réel avec leur cercle de confiance, et accèdent à un réseau de lieux sûrs partenaires. L'app cible les piétons, cyclistes et usagers des transports en commun dans les grandes villes françaises (lancement Paris).

**Modèle** : Freemium (gratuit + Pro avec fonctionnalités avancées via Stripe).

---

## 2. Stack Technique

| Couche | Technologie |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript strict |
| Base de données & Auth | Supabase (Postgres, Auth, Storage, Realtime) |
| Carte | Mapbox GL JS v3, style custom Breveil |
| State | Zustand v5 (localStorage `brume_*`) |
| Animations | Framer Motion v12 |
| i18n | next-intl (30 locales, FR/EN à 100%) |
| Paiements | Stripe (checkout sessions + customer portal) |
| Emails | Resend (lifecycle emails : welcome, first report, inactivité, streak) |
| Push | Web Push (VAPID) |
| Audio/Vidéo live | LiveKit |
| Vérification identité | Veriff (HMAC) |
| Transit routing | Transitous API (MOTIS/RATP, gratuit) |
| Walking ETA | OSRM (project-osrm.org) |
| Styling | Tailwind v4 + inline styles (composants settings/compte = 100% inline) |
| Tests | Vitest + Testing Library |
| Hosting | Vercel (Hobby) |
| Cron | Vercel Cron (1x/jour lifecycle emails) |

---

## 3. Architecture des Routes

### Pages

| Route | Fonction |
|---|---|
| `/` | Auth gate — redirige vers `/map` ou `/login` |
| `/login` | Google/Apple OAuth, email/password, magic link |
| `/auth/callback` | Échange PKCE code → session |
| `/map` | Page principale — carte, sheets, tour, tabs |
| `/admin` | Tower Control (modération, users, pins, safe spaces) |
| `/track/[sessionId]` | Lien public de suivi d'urgence |
| `/privacy`, `/terms`, `/cookies` | Pages légales |

### API Routes

| Endpoint | Fonction |
|---|---|
| `POST /api/stripe/checkout` | Crée session Stripe Pro |
| `POST /api/stripe/portal` | Portail gestion abonnement |
| `POST /api/stripe/webhook` | Webhook Stripe (subscription events) |
| `POST /api/trips/start` | Démarre un trajet + notifie cercle |
| `POST /api/trips/checkpoint` | Enregistre checkpoint transit |
| `POST /api/trips/end` | Termine un trajet |
| `POST /api/notify-nearby` | Push notif aux users proches d'un nouveau pin |
| `POST /api/livekit-token` | Token LiveKit pour audio/vidéo live |
| `POST /api/verify/start` | Session Veriff (vérification identité) |
| `POST /api/verify/webhook` | Résultat Veriff |
| `POST /api/invite/validate` | Valide code d'invitation B2B2C |
| `POST /api/invite/redeem` | Active code d'invitation |
| `GET /api/cron/lifecycle-emails` | Cron daily : emails automatiques |
| `POST /api/simulation/*` | Seed/cleanup/tick données simulées (admin) |

---

## 4. Schéma Base de Données

### Tables principales

| Table | Description |
|---|---|
| `profiles` | Profils utilisateurs (nom, avatar, ville, streak, vérification, home coords, langue, persona, active_trip_id, visibility jsonb) |
| `pins` | Signalements géolocalisés (lat/lng, catégorie, sévérité, is_emergency, resolved_at, confirmations, transport) |
| `pin_evidence` | Preuves liées aux pins (media, audit trail) |
| `comments` | Commentaires sur les pins |
| `trusted_contacts` | Cercle de confiance (relations bidirectionnelles) |
| `communities` | Communautés / groupes |
| `community_members` | Membres des communautés (FK → communities) |
| `community_messages` | Messages dans les communautés |
| `dm_conversations` / `direct_messages` | Messages privés |
| `community_stories` / `pin_stories` | Stories éphémères |
| `safe_spaces` | Lieux sûrs (pharmacies, hôpitaux, police, cafés, refuges) avec tiers partenaire |
| `safe_space_votes` | Upvotes sur les lieux sûrs |
| `place_notes` | Annotations personnelles sur la carte |
| `walk_sessions` | Sessions "Walk With Me" |
| `trip_log` | Historique des trajets |
| `live_sessions` | Sessions audio/vidéo LiveKit |
| `notifications` | Notifications persistantes |
| `push_subscriptions` | Abonnements push VAPID |
| `subscriptions` / `invoices` | Abonnements Stripe Pro |
| `challenges` / `user_challenges` | Défis hebdomadaires |
| `engagement_events` | Événements analytics |
| `user_milestones` | Badges / milestones atteints |
| `emergency_dispatches` / `emergency_sessions` | Dispatches SOS + sessions publiques |
| `safety_buddies` | Système de buddy matching par route |
| `user_reports` | Modération (spam, faux, offensant, doublon) |
| `invite_codes` / `invite_code_uses` | Codes d'invitation B2B2C |
| `admin_params` | Config admin key-value |
| `email_logs` | Logs d'envoi d'emails |

---

## 5. Features Principales

### 5.1 Carte & Signalements

- **Carte interactive Mapbox** avec style custom Breveil (dark/light)
- **18 catégories d'incidents** regroupées en 4 groupes : Urgent (agression, vol, harcèlement), Warning (comportement suspect, zone mal éclairée), Infrastructure (travaux, route dangereuse), Positif (zone sûre, présence police)
- **Report en 4 étapes** : catégorie → transport → média (photo/vidéo/audio) → détails (sévérité, contexte urbain, description)
- **Decay system** : les pins perdent en opacité/taille avec le temps (decay hours par catégorie)
- **Confirmations** : les utilisateurs peuvent confirmer ou infirmer un signalement
- **Commentaires** en temps réel sur chaque pin
- **Filtres** : sévérité, âge, contexte urbain, confirmés uniquement, live uniquement, heure de la journée
- **Labels de pin** toggle sur la carte

### 5.2 SOS / Urgence

- **Bouton SOS** avec hold-to-activate (3s) → countdown (5s) → mode actif
- En mode actif : lieu sûr le plus proche avec ETA (OSRM), dispatch contacts de confiance, partage de lien public, trail de position GPS
- **Session d'urgence publique** (`/track/[sessionId]`) partageable
- **Dispatch** vers contacts de confiance via Edge Function
- Hold-to-resolve "I'm safe"

### 5.3 Trajet & Escorte

- **TripViewV2** : 5 états (idle → walk → planifier → active → arrived)
- **Walk With Me** : partage de position en temps réel avec le cercle
- **Transit routing** via Transitous (RATP/IDFM) : itinéraires multimodaux
- **TripMonitor** : engine background (polling 30s) — détection incidents proches (200m), anomalie stationnaire (15m/90s), arrivée auto (50m/30s), checkpoints transit
- **TripHUD** : overlay persistant sur la carte pendant un trajet actif

### 5.4 Communauté

- **4 onglets** : Fil (feed posts + stories), Cercle (contacts de confiance), Groupes, Messages (DMs)
- **Stories éphémères** (story viewer plein écran)
- **Compose modal** pour poster
- **Filtres par chips** sur le feed

### 5.5 Mon Breveil (Profil)

- **Hub unifié** avec onglets : Feed (pins suivis), Favoris, Stats (sparkline tendance), Profil
- **Système de niveaux** : Watcher → Reporter → Guardian → Sentinel (basé sur score = pins + alertes + votes + commentaires)
- **Streak** : série de jours actifs (milestones à 3/7/14/30/60/100j)
- **Tags d'expertise** : Night Owl, Transit Guardian, First Responder, Neighborhood Expert, Verified Guardian
- **11 milestones/badges** déblocables
- **Défis hebdomadaires** (challenges guardian)
- **Parrainage** (referral code)
- **Vérification identité** Veriff

### 5.6 Paramètres

- **Mon Compte** (9 sous-écrans) : infos perso, pseudo, email, mot de passe, photo, visibilité, vérification, suppression
- **Sécurité & confidentialité** : cercle, alertes, localisation, RGPD
- **Préférences** : thème dark/light, langue (FR/EN), style de carte, haptique
- **Abonnement** : gestion plan Stripe (Gratuit/Pro)
- **Aide & support** : guide, FAQ, contact, méthodologie, CGU, politique de confidentialité

### 5.7 Lieux Sûrs

- **Overlay carte** avec pharmacies, hôpitaux, police, cafés, refuges
- **Tiers partenaire** (partner tier) avec info enrichie
- **Upvotes** communautaires
- **Detail sheet** avec horaires, photos, distance

### 5.8 Onboarding

- **Funnel 7 étapes** : objectifs → nom → avatar → ville → localisation → notifications → paywall
- **Tour guidé 5 étapes** post-onboarding (CoachMark spotlight) : SOS, report, filtres, trip, profil

### 5.9 Notifications & Emails

- **Push notifications** VAPID (incidents proches, dispatch SOS, trip alerts)
- **Notifications in-app** persistées en DB
- **Emails lifecycle** (Resend, cron daily) : welcome, first report, réengagement 7j inactif, streak milestone (7/30j)

### 5.10 Admin (Tower Control)

- Dashboard modération : users, pins, safe spaces, email logs
- Simulation Paris (seed/cleanup/tick) pour démo
- Gate config via `admin_params`

---

## 6. UI/UX Design System

### Palette de couleurs

| Token | Dark | Light |
|---|---|---|
| `bg` | `#0F172A` | `#F8FAFC` |
| `sheet` | `#1A2540` | `#FFFFFF` |
| `card` | `#1E293B` | `#FFFFFF` |
| `elevated` | `#334155` | `#F1F5F9` |
| `t1` (text primary) | `#FFFFFF` | `#0F172A` |
| `t2` (text secondary) | `#94A3B8` | `#475569` |
| `t3` (text muted) | `#64748B` | `#94A3B8` |
| `border` | `rgba(255,255,255,0.08)` | `rgba(15,23,42,0.07)` |

### Couleurs d'accent (constantes)

| Nom | Hex | Usage |
|---|---|---|
| Cyan / Breveil | `#3BB4C1` | Accent principal, boutons, liens |
| Gold | `#F5C341` | Étoiles, streak, premium |
| Success | `#34D399` | Vérifié, zone sûre, streak active |
| Danger | `#EF4444` | SOS, urgence, suppression |
| Purple | `#A78BFA` | Cercle, communauté |

### Patterns UI

- **Bottom sheets** animés (Framer Motion spring, drag-to-dismiss)
- **Cards** avec border-radius 16px, border subtle
- **Buttons** : rounded-full pour FABs, rounded-xl pour actions
- **Typography** : système natif (sans-serif), tailles 11-19px
- **Composants settings/compte** : 100% inline `style={{}}`, zéro Tailwind className pour les couleurs
- **Theme** : `useTheme((s) => s.theme) === 'dark'` + conditionnels ternaires inline
- **Animations** : `whileTap={{ scale: 0.98 }}`, `AnimatePresence mode="wait"`, slideVariants, fadeSlideUp

### Navigation

- **BottomNav** 4 onglets : Carte (`map`), Communauté (`community`), Trajet (`trip`), Mon Breveil (`me`)
- **Header** : logo Breveil + search + bell (notifications) + theme toggle + burger (settings)
- **Sheets** : bottom sheets pour detail, report, nearby, notifications, settings
- **Screen stack** dans settings : AnimatePresence avec slide horizontal

---

## 7. Flux Utilisateur Clés

### Inscription → Premier usage
```
Landing → Login (OAuth/email) → Onboarding funnel (7 steps) → Map → Tour guidé (5 steps)
```

### Signalement d'incident
```
Tap "+" FAB → ReportSheet step 1 (catégorie) → step 2 (transport) → step 3 (média) → step 4 (détails) → Submit → Pin apparaît sur carte → Push notif aux users proches
```

### SOS
```
Hold SOS 3s → Countdown 5s → Mode actif (lieu sûr + ETA + dispatch contacts) → Partage lien public → Hold "I'm safe" pour résoudre
```

### Trajet escorté
```
TripView idle → Planifier (origine/destination) → Transit routing Transitous → Start → TripHUD overlay + TripMonitor background (30s polling) → Arrivée auto-détectée ou manuelle
```

### Walk With Me
```
TripView → Walk → Invite contact → Partage position temps réel → Contact voit sur sa carte
```

---

## 8. Intégrations Externes

| Service | Usage | Auth |
|---|---|---|
| Supabase | DB, Auth, Storage (avatars), Realtime | `NEXT_PUBLIC_SUPABASE_URL` + `ANON_KEY` + `SERVICE_ROLE_KEY` |
| Mapbox | Carte, geocoding, style custom | `NEXT_PUBLIC_MAPBOX_TOKEN` |
| Stripe | Paiements Pro | `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| Resend | Emails transactionnels | `RESEND_API_KEY` |
| Veriff | Vérification identité | `VERIFF_API_KEY` + `VERIFF_HMAC_KEY` |
| LiveKit | Audio/vidéo live | `LIVEKIT_API_KEY` + `LIVEKIT_API_SECRET` + `NEXT_PUBLIC_LIVEKIT_URL` |
| Transitous | Transit routing RATP | Gratuit, pas de clé |
| OSRM | Walking ETA | Gratuit, `router.project-osrm.org` |
| Web Push | Notifications push | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` |

---

## 9. Variables d'Environnement Requises

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Resend
RESEND_API_KEY=

# Veriff
VERIFF_API_KEY=
VERIFF_HMAC_KEY=

# LiveKit
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
NEXT_PUBLIC_LIVEKIT_URL=

# Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=

# Cron
CRON_SECRET=
```

---

## 10. Fichiers Clés

| Fichier | Rôle |
|---|---|
| `src/app/map/page.tsx` | Page principale — wiring de tous les composants, sheets, tour |
| `src/stores/useStore.ts` | Store Zustand global (50+ slices) |
| `src/stores/useTheme.ts` | Thème dark/light |
| `src/types/index.ts` | Tous les types TypeScript + constantes |
| `src/components/MapView.tsx` | Carte Mapbox + layers |
| `src/components/EmergencyButton.tsx` | Bouton SOS |
| `src/components/ReportSheet.tsx` | Formulaire de signalement |
| `src/components/trip/TripViewV2.tsx` | Vue trajet (5 états) |
| `src/components/nearby/NearbySheet.tsx` | Liste incidents proches |
| `src/components/community/CommunityView.tsx` | Hub communauté |
| `src/components/MyKovaView.tsx` | Hub profil "Mon Breveil" |
| `src/components/settings/SettingsSheet.tsx` | Paramètres |
| `src/components/OnboardingFunnelV2.tsx` | Onboarding 7 étapes |
| `src/components/subscription/PaywallScreen.tsx` | Paywall Pro |
| `src/lib/TripMonitor.ts` | Engine de sécurité trajet (background) |
| `src/lib/transit.ts` | Client Transitous (RATP routing) |

---

*Généré le 2026-03-05 — Breveil v0.1.0-beta*
