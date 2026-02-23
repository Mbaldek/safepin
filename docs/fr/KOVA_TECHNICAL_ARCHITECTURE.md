# KOVA — Guide d'architecture technique

## 1. Structure du projet

```
src/
├── app/                    # Pages Next.js 16 App Router
│   ├── layout.tsx          # Layout racine (ThemeProvider, NextIntlClientProvider)
│   ├── page.tsx            # Redirection vers /login ou /map
│   ├── login/page.tsx      # Page d'accueil + authentification
│   ├── map/page.tsx        # Application cartographique principale
│   ├── admin/page.tsx      # Tableau de bord admin Tower Control
│   ├── privacy/page.tsx    # Politique de confidentialite
│   ├── terms/page.tsx      # Conditions d'utilisation
│   ├── cookies/page.tsx    # Politique des cookies
│   └── api/                # Routes API
│       ├── livekit-token/  # Generation de tokens JWT LiveKit
│       ├── notify-nearby/  # Push notifications filtrees par zone geographique
│       ├── push-notify/    # Envoi direct de push notifications
│       ├── stripe/         # Facturation (checkout, webhook, portail)
│       └── verify/         # Verification d'identite (demarrage, webhook)
├── components/             # 49 composants React
│   ├── MapView.tsx         # Carte Mapbox GL JS
│   ├── EmergencyButton.tsx # Systeme SOS
│   ├── ReportSheet.tsx     # Signalement d'incidents
│   ├── DetailSheet.tsx     # Detail d'un pin + votes
│   ├── TripView.tsx        # Planificateur d'itineraire
│   ├── CommunityView.tsx   # Communautes + quartiers
│   ├── MyKovaView.tsx      # Profil + hub de statistiques
│   ├── SettingsSheet.tsx   # Parametres + facturation + mentions legales
│   ├── ... (46 autres)
├── lib/                    # Utilitaires partages & services
│   ├── utils.ts            # timeAgo, variantes haversine, springTransition
│   ├── geocode.ts          # geocodeForward, geocodeReverse (Mapbox)
│   ├── supabase.ts         # Client Supabase navigateur
│   ├── supabase-admin.ts   # Client admin serveur uniquement (service role)
│   ├── levels.ts           # Definitions des niveaux de confiance
│   ├── expertise.ts        # Tags d'expertise calcules automatiquement
│   ├── milestones.ts       # Definitions des accomplissements
│   ├── stripe.ts           # Configuration du client Stripe
│   ├── offlineQueue.ts     # File d'attente hors-ligne IndexedDB
│   ├── useIsPro.ts         # Hook d'abonnement Pro
│   └── useFocusTrap.ts     # Piege de focus pour l'accessibilite
├── stores/                 # Gestion d'etat
│   ├── useStore.ts         # Store global Zustand v5
│   └── useTheme.ts         # Etat du theme (sombre/clair)
├── i18n/                   # Internationalisation
│   ├── routing.ts          # 30 definitions de locales + type Locale
│   └── request.ts          # getRequestConfig avec deepMerge en repli
├── messages/               # Fichiers de traduction (30 locales)
│   ├── en.json             # Anglais (complet — 274 lignes, 16 namespaces)
│   ├── fr.json             # Francais (complet)
│   ├── es.json, zh.json... # 28 autres locales (common + nav + emergency traduits)
└── proxy.ts                # Proxy Next.js 16 : limitation de debit + cookie de locale
```

## 2. Stack technique

| Couche | Technologie | Version | Fonction |
|---|---|---|---|
| Framework | Next.js | 16 | App Router, SSR, routes API |
| Bibliotheque UI | React | 19 | Framework de composants |
| Langage | TypeScript | 5.x | Typage statique |
| Style | Tailwind CSS | v4 | CSS utilitaire |
| Animations | Framer Motion | — | Animations spring, transitions de feuilles |
| Backend | Supabase | — | PostgreSQL, Auth, Realtime, Storage, Edge Functions |
| Cartographie | Mapbox GL JS | v3 | Cartes interactives (integration directe, sans bibliotheque wrapper) |
| Moteur de routage | OSRM | — | Calcul d'itineraires pieton/velo/voiture |
| Donnees de transport | Overpass API | — | Donnees metro/bus/tram OpenStreetMap |
| Video en direct | LiveKit | — | Diffusion WebRTC |
| Paiements | Stripe | — | Checkout, Webhooks, portail de facturation |
| Push | Web Push API | — | Notifications VAPID |
| i18n | next-intl | v4 | 30 langues, locale basee sur cookie |
| Verification | Veriff | — | Verification d'identite |
| Etat | Zustand | v5 | Gestion d'etat cote client |
| Icones | Lucide React | — | Bibliotheque d'icones SVG |
| Hebergement | Vercel | — | Deploiement edge, fonctions serverless |

## 3. Utilitaires partages

### `src/lib/utils.ts`
Extraits depuis plus de 30 copies dans les composants pour eliminer la duplication :

| Export | Signature | Fonction |
|---|---|---|
| `timeAgo(dateStr)` | `string → string` | Temps relatif compact : "now", "5m", "3h", "2d" |
| `timeAgoLong(dateStr)` | `string → string` | Forme longue : "just now", "5min ago", "3h ago" |
| `haversineMeters(a, b)` | `{lat,lng} × {lat,lng} → number` | Distance en metres |
| `haversineKm(a, b)` | `{lat,lng} × {lat,lng} → number` | Distance en km |
| `haversineMetersLngLat(a, b)` | `[lng,lat] × [lng,lat] → number` | Ordre de coordonnees GeoJSON |
| `haversineMetersRaw(lat1,lng1,lat2,lng2)` | `4 numbers → number` | Parametres bruts (pour les routes API) |
| `springTransition` | `object` | Configuration spring partagee Framer Motion (damping:32, stiffness:320, mass:0.8) |

### `src/lib/geocode.ts`
Geocodage Mapbox partage :
- `geocodeForward(query, proximity?)` — adresse vers [lng, lat]
- `geocodeReverse(lng, lat)` — coordonnees vers chaine d'adresse

### `src/lib/supabase.ts`
Client navigateur utilisant `createBrowserClient` de `@supabase/ssr`. Valide les variables d'environnement a l'import.

### `src/lib/supabase-admin.ts`
Client admin serveur uniquement utilisant `SUPABASE_SERVICE_ROLE_KEY`. Utilise par toutes les routes API necessitant des permissions elevees.
```ts
import { createClient } from '@supabase/supabase-js';
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
```

## 4. Authentification

4 methodes prises en charge :

| Methode | Implementation |
|---|---|
| Google OAuth | `supabase.auth.signInWithOAuth({ provider: 'google' })` |
| Apple Sign-In | `supabase.auth.signInWithOAuth({ provider: 'apple' })` |
| Magic Link | `supabase.auth.signInWithOtp({ email })` |
| E-mail + mot de passe | `supabase.auth.signUp` / `supabase.auth.signInWithPassword` |

L'etat d'authentification est gere par Supabase Auth. Les cookies de session sont definis automatiquement. Les routes protegees verifient `supabase.auth.getUser()`.

## 5. Architecture d'internationalisation

### 30 locales prises en charge
en, fr, es, zh, ar, hi, pt, bn, ru, ja, de, ko, it, tr, vi, pl, nl, th, sv, ro, cs, el, hu, da, fi, no, he, id, ms, uk

### Flux
```
Requete utilisateur
    |
proxy.ts : detection de la locale via le cookie NEXT_LOCALE ou l'en-tete Accept-Language
    |
Definition du cookie NEXT_LOCALE si absent
    |
request.ts : getRequestConfig lit le cookie, importe dynamiquement le JSON de la locale
    |
deepMerge(en, localeMessages) — l'anglais sert de repli pour les cles manquantes
    |
Messages transmis au NextIntlClientProvider
```

### Fichiers de messages
- `en.json` : Complet (274 lignes, 16 namespaces : common, nav, emergency, report, detail, filters, layers, trip, settings, notifications, mykova, community, offline, moderation, safeSpaces, install)
- 28 autres locales : Cles principales traduites (common : 13, nav : 4, emergency : 13). Le reste est repris de l'anglais via deepMerge.

### Detection de la locale (proxy.ts)
1. Verification du cookie NEXT_LOCALE
2. Analyse de l'en-tete Accept-Language
3. Repli sur 'en' par defaut
- Limitation de debit sur les routes API (fenetre glissante par utilisateur)
- Redirection des chemins /\<locale\>/\* vers / avec definition du cookie

## 6. Architecture de facturation

### Flux
```
Parametres -> "Passer a Pro"
    |
/api/stripe/checkout -> Session Stripe Checkout (mensuel 4,99 EUR ou annuel 39,99 EUR)
    |
L'utilisateur finalise le paiement sur Stripe
    |
/api/stripe/webhook recoit les evenements -> mise a jour de la table subscriptions
    |
Le hook useIsPro lit la table subscriptions, met en cache dans localStorage
```

### Routes API
| Route | Fonction |
|---|---|
| POST /api/stripe/checkout | Creation d'une session Checkout |
| POST /api/stripe/webhook | Traitement des evenements Stripe |
| POST /api/stripe/portal | Ouverture du portail de facturation |

### Evenements webhook
checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted

### Restriction Pro
Le composant `ProGate` encapsule les fonctionnalites Pro. Affiche un overlay floute avec un appel a l'action de mise a niveau pour les utilisateurs gratuits.

## 7. Verification d'identite

### Flux
```
Parametres -> Verifier mon identite
    |
POST /api/verify/start -> creation d'une session Veriff
    |
L'utilisateur est redirige vers l'interface Veriff -> verification d'identite completee
    |
POST /api/verify/webhook recoit le resultat
    |
Mise a jour de profiles : verification_status, verification_id, verified
```

### Etats de statut
unverified -> pending -> approved / declined / resubmission_requested

Le webhook utilise une verification de signature en mode fail-closed (secret manquant = rejet).

## 8. Schema de base de donnees (tables principales)

| Table | Fonction |
|---|---|
| profiles | Profils utilisateurs (display_name, avatar_url, score de confiance, verification, is_admin, referral_code) |
| pins | Signalements d'incidents de securite (categorie, severite, lat/lng, votes, is_emergency, is_simulated) |
| pin_comments | Commentaires en temps reel sur les pins |
| subscriptions | Enregistrements d'abonnements Stripe |
| notifications | File d'attente de notifications internes |
| friendships | Demandes et connexions d'amis |
| dm_conversations | Fils de messages directs |
| direct_messages | Messages directs individuels |
| communities | Groupes communautaires + quartiers |
| community_members | Adhesion aux communautes |
| walk_sessions | Sessions Walk With Me (accompagnement) |
| live_sessions | Sessions de diffusion LiveKit |
| saved_routes | Itineraires sauvegardes par l'utilisateur |
| route_upvotes | Votes positifs sur les itineraires partages |
| place_notes | Signets de lieux personnels |
| trusted_circle | Relations de contacts de confiance |
| sos_responders | Suivi des interventions d'urgence |
| audio_checkins | Enregistrements de memos vocaux |
| location_history | Donnees de trace GPS (fonctionnalite Pro) |
| trip_log | Historique des trajets effectues |
| safety_buddies | Planification de binomes sur itineraire |
| admin_params | Parametres de configuration de la plateforme |
| flag_reports | Signalements de contenu par les utilisateurs |

## 9. Routes API

| Route | Methode | Fonction |
|---|---|---|
| /api/livekit-token | POST | Generation d'un JWT LiveKit pour la diffusion |
| /api/notify-nearby | POST | Envoi de push notifications filtrees geographiquement |
| /api/push-notify | POST | Push notification directe a un utilisateur |
| /api/stripe/checkout | POST | Creation d'une session Stripe Checkout |
| /api/stripe/webhook | POST | Traitement des evenements webhook Stripe |
| /api/stripe/portal | POST | Ouverture du portail de facturation Stripe |
| /api/verify/start | POST | Creation d'une session de verification Veriff |
| /api/verify/webhook | POST | Traitement des callbacks webhook Veriff |

Toutes les routes API utilisent `createAdminClient()` de `src/lib/supabase-admin.ts` pour un acces eleve a la base de donnees.

## 10. Edge Functions (Supabase)

| Fonction | Objectif |
|---|---|
| seed-paris | Generation de faux utilisateurs + pins pour la simulation |
| simulate-activity | Creation d'un tick d'activite de simulation en direct |
| emergency-dispatch | Notification des contacts de confiance lors d'un SOS |

Deployees sur l'infrastructure Supabase, invoquees via REST avec authentification JWT.

## 11. Architecture temps reel

Supabase Realtime alimente :
- **postgres_changes** : Les creations/mises a jour de pins apparaissent instantanement sur toutes les cartes connectees
- **Channels de presence** : Partage de position Walk With Me
- **Channels de diffusion** : Chat communautaire, commentaires de pins, messages directs
- **Data channels LiveKit** : Overlay de chat sur les diffusions en direct

## 12. PWA et mode hors-ligne

- **manifest.json** : Metadonnees de l'application, icones, couleur du theme
- **Service worker** (/sw.js) : Push notifications, mise en cache
- **InstallPrompt** : Detection de l'evenement beforeinstallprompt
- **File d'attente hors-ligne** : IndexedDB stocke les signalements en attente
- **OfflineBanner** : Affiche l'etat de connectivite
- **Synchronisation en arriere-plan** : Soumission automatique des signalements en file d'attente a la reconnexion

## 13. Variables d'environnement

| Variable | Contexte | Fonction |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Client + Serveur | URL du projet Supabase |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Client + Serveur | Cle anonyme Supabase |
| SUPABASE_SERVICE_ROLE_KEY | Serveur uniquement | Acces admin a la base de donnees |
| NEXT_PUBLIC_MAPBOX_TOKEN | Client | Mapbox GL JS + geocodage |
| STRIPE_SECRET_KEY | Serveur uniquement | API Stripe |
| STRIPE_WEBHOOK_SECRET | Serveur uniquement | Verification des webhooks Stripe |
| STRIPE_PRICE_MONTHLY | Serveur uniquement | ID du tarif mensuel Stripe |
| STRIPE_PRICE_ANNUAL | Serveur uniquement | ID du tarif annuel Stripe |
| NEXT_PUBLIC_LIVEKIT_URL | Client | URL du serveur LiveKit |
| LIVEKIT_API_KEY | Serveur uniquement | Authentification LiveKit |
| LIVEKIT_API_SECRET | Serveur uniquement | Authentification LiveKit |
| VERIFF_API_KEY | Serveur uniquement | Verification Veriff |
| VERIFF_SHARED_SECRET | Serveur uniquement | Signature webhook Veriff |
| NEXT_PUBLIC_VAPID_KEY | Client | Cle publique VAPID Web Push |
| VAPID_PRIVATE_KEY | Serveur uniquement | Cle privee VAPID Web Push |

## 14. Securite

- **Limitation de debit** : Fenetre glissante par utilisateur dans proxy.ts (5/h pour notify, 10/h pour push, 30/h par defaut)
- **RLS** : Row Level Security Supabase sur toutes les tables
- **Verification des webhooks** : Stripe (en-tete stripe-signature), Veriff (HMAC fail-closed)
- **Restriction admin** : Verification is_admin sur /admin et les operations API d'administration
- **Moderation de contenu** : Systeme de signalement avec bannissement furtif (hidden_at, flag_count, is_shadow_banned)
- **RGPD** : Residance des donnees en UE, droit a l'effacement, options de confidentialite
- **Auth** : Supabase Auth avec JWT, 4 methodes de connexion
- **ProGate** : Statut d'abonnement valide cote serveur
