# BRIEF 02 — Bilingual i18n (FR + EN)
### Priority: 🔴 CRITICAL · Est: 2-3 hours

---

## Objective
Build a proper i18n system with French and English. User picks language at onboarding or in settings. Default: French (Paris test group). All UI strings come from translation files — zero hardcoded text.

---

## Architecture

### Option A: `next-intl` (recommended for Next.js)

```bash
npm install next-intl
```

### Option B: Simple hook + context (faster, no dependency)

Create `lib/i18n.tsx`:

```tsx
"use client";
import { createContext, useContext, useState, ReactNode } from "react";

type Locale = "fr" | "en";

const I18nContext = createContext<{
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: typeof fr;
}>({ locale: "fr", setLocale: () => {}, t: fr });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(
    () => (typeof window !== "undefined" && localStorage.getItem("locale") as Locale) || "fr"
  );
  const t = locale === "fr" ? fr : en;
  
  const handleSetLocale = (l: Locale) => {
    setLocale(l);
    if (typeof window !== "undefined") localStorage.setItem("locale", l);
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale: handleSetLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
```

Usage in any component:
```tsx
const { t, locale, setLocale } = useI18n();
// Use: t.nav_map, t.sos_cancel, etc.
// Switch: setLocale("en")
```

---

## Translation Files

### `lib/locales/fr.ts`

```ts
const fr = {
  // ─── NAVIGATION ───
  nav_map: "Carte",
  nav_community: "Communauté",
  nav_route: "Trajet",
  nav_profile: "Moi",

  // ─── HEADER ───
  brand_name: "BREVEIL",

  // ─── MAP ───
  nearby: "À proximité",
  layers: "Couches",
  streets: "Rues",
  light: "Clair",
  dark: "Sombre",
  
  // ─── INCIDENTS ───
  nearby_incidents: "Incidents à proximité",
  live: "En direct",
  all: "Tous",
  less_1h: "< 1h",
  less_6h: "< 6h",
  today: "Aujourd'hui",
  radius: "Rayon",
  any: "Tous",
  all_severity: "Toute gravité",
  mild: "Léger",
  moderate: "Modéré",
  danger: "Danger",
  no_incidents: "Aucun incident",
  all_clear: "Tout est calme autour de vous ☀️",
  all_clear_sub: "Bonne nouvelle !",

  // ─── INCIDENT REPORT ───
  what_happened: "Que s'est-il passé ?",
  harassment: "Harcèlement",
  stalking: "Traque",
  aggression: "Agression",
  theft: "Vol",
  verbal_abuse: "Insultes",
  poor_lighting: "Éclairage insuffisant",
  unsafe_road: "Route dangereuse",
  isolated_area: "Zone isolée",
  intoxicated: "Personne en état d'ébriété",
  suspicious: "Comportement suspect",
  other: "Autre",
  severity_label: "Gravité",
  submit_report: "Signaler à la communauté",
  add_details: "Ajouter des détails (optionnel)",
  tap_to_change: "appuyer pour changer",
  report_success: "Merci ! Votre signalement aide toute la communauté. 💛",

  // ─── SOS ───
  sos: "SOS",
  alerting_nearby: "Alerte en cours...",
  position_shared: "Votre position sera partagée",
  cancel: "ANNULER",
  emergency_detected: "Alerte active — votre cercle a été prévenu",
  en_route_to: "En route vers",
  share: "Partager",
  safe_spot: "Lieu sûr",
  im_safe: "Je suis en sécurité",
  safe_confirmed: "Votre cercle a été informé que vous êtes en sécurité. 💛",
  hold_to_activate: "Maintenez pour activer le SOS",
  samu: "SAMU",
  police: "Police",
  pompiers: "Pompiers",
  eu: "UE",

  // ─── ROUTE / TRAJET ───
  my_route: "Mon trajet",
  walk_together: "Marcher ensemble",
  plan_trip: "Planifier un itinéraire",
  my_favorites: "Mes favoris",
  share_with_circle: "Mon Cercle me suit",
  choose_route: "Choisir l'itinéraire",
  walk: "À pied",
  bike: "Vélo",
  drive: "Voiture",
  transit: "Transport",
  routes_count: "itinéraires",
  best: "meilleur",
  start: "Démarrer",
  departure: "Départ",
  destination: "Destination",
  your_position: "Votre position",
  destination_placeholder: "ex. Maison, Gare du Nord, Café...",
  search_routes: "Chercher des itinéraires",
  share_code: "Partagez ce code :",
  waiting_companion: "En attente... 💛",
  close: "Fermer",

  // ─── COMMUNITY ───
  communities: "Communautés",
  my_circle: "Mon Cercle",
  add: "Ajouter",
  invite_contact: "Inviter un proche",
  add_first_contact: "Ajoutez vos premiers proches 💛",
  circle_description: "Vos proches — partagez vos trajets, marchez ensemble et gardez le contact.",
  contacts_info: "Ils recevront vos mises à jour et vous les leurs.",
  messages: "Messages",
  friends_messages: "Amis & messages privés",
  neighbourhoods: "Quartiers",
  groups_communities: "Groupes & Communautés",
  new_group: "+ Nouveau",
  friends: "Amis",
  requests: "Demandes",
  no_friends: "Vos amis apparaîtront ici 💛",
  no_friends_sub: "Invitez vos proches sur Breveil",
  find_friends: "Trouver des amis",
  no_neighbourhoods: "Aucun quartier ici encore — soyez le premier ! 🏘️",
  members: "membres",
  view_group: "Voir →",
  leave: "Quitter",
  your_story: "Votre story",
  type_message: "Écrire un message...",
  your_communities: "VOS COMMUNAUTÉS",
  more: "PLUS",
  join: "Rejoindre",

  // ─── PROFILE ───
  my_breveil: "Mon Breveil",
  set_name: "Définir votre nom",
  view_profile: "Voir profil & activité",
  reports_stat: "Signalements",
  level: "Niveau",
  thanks: "Merci",
  level_watcher: "Veilleur",
  level_guardian: "Gardien",
  level_sentinel: "Sentinelle",
  level_protector: "Protecteur",
  activity: "Activité",
  saved: "Sauvegardé",
  statistics: "Statistiques",
  nothing_yet: "Votre activité apparaîtra au fil du temps 📍",
  saved_empty: "Vos signalements sauvegardés apparaîtront ici ⭐",
  stats_empty: "Vos statistiques apparaîtront au fil du temps 📊",
  my_communities: "Mes communautés",
  join_first: "Rejoignez votre premier quartier 🏘️",

  // ─── SETTINGS ───
  settings: "Paramètres",
  language: "Langue",
  preferences: "PRÉFÉRENCES",
  notifications: "Notifications",
  notif_desc: "Alertes, rayon, heures calmes",
  account: "Compte",
  account_desc: "Nom, email, mot de passe",
  restart_tour: "Relancer la visite guidée",
  tour_desc: "Redécouvrir les fonctionnalités",
  help: "AIDE & INFORMATIONS",
  user_guide: "Guide d'utilisation",
  guide_desc: "Comment utiliser Breveil",
  faq: "Questions fréquentes",

  // ─── MAP LAYERS ───
  security: "SÉCURITÉ",
  transport: "TRANSPORT",
  data: "DONNÉES",
  active: "active",
  heatmap: "Ma carte thermique",
  safety_scores: "Scores de sécurité",
  safe_spaces: "Espaces sûrs",
  none: "Aucun",

  // ─── ONBOARDING ───
  skip: "Passer",
  continue_btn: "Continuer",
  join_free: "Rejoindre gratuitement",
  log_in: "Se connecter",
  create_account: "Créer votre compte",
  join_community: "Rejoignez une communauté qui veille les uns sur les autres.",
  continue_google: "Continuer avec Google",
  continue_apple: "Continuer avec Apple",
  or: "OU",
  email: "Email",
  password: "Mot de passe",
  min_chars: "Min 8 caractères",
  sign_up: "S'inscrire",
  terms_text: "En vous inscrivant, vous acceptez nos",
  terms: "Conditions",
  and: "et",
  privacy: "Politique de confidentialité",

  tell_about_you: "Parlez-nous de vous",
  personalize: "Nous personnaliserons votre expérience.",
  first_name: "Prénom",
  birthday: "Date de naissance",
  city: "Ville",
  i_am: "Je suis...",
  pick_many: "(choisissez autant que vous voulez)",
  persona_commuter: "Navetteur",
  persona_student: "Étudiante",
  persona_nightowl: "Noctambule",
  persona_runner: "Coureuse",
  persona_parent: "Parent",
  persona_traveler: "Voyageuse",
  persona_freelance: "Freelance",
  persona_nightlife: "Vie nocturne",
  persona_everything: "Un peu de tout !",

  what_matters: "Qu'est-ce qui compte le plus ?",
  select_all: "Sélectionnez tout ce qui s'applique",
  goal_routes: "Itinéraires sécurisés",
  goal_routes_desc: "Navigation intelligente",
  goal_alerts: "Alertes de quartier",
  goal_alerts_desc: "Restez informée",
  goal_sos: "Protection SOS",
  goal_sos_desc: "Urgence en un tap",
  goal_transit: "Sécurité transports",
  goal_transit_desc: "Trajets plus sûrs",
  goal_community: "Ma communauté",
  goal_community_desc: "Connexion locale",
  goal_companion: "Compagnon virtuel",
  goal_companion_desc: "Julia, votre IA",

  enable_location: "Activer la localisation",
  location_desc: "Voyez ce qui se passe autour de vous et laissez votre cercle savoir où vous êtes.",
  allow_location: "Activer la localisation",
  not_now: "Plus tard",
  nearby_spots: "📍 Lieux proches",
  smart_routes: "🗺️ Itinéraires intelligents",
  local_community: "👥 Communauté locale",

  stay_in_loop: "Restez informée",
  notif_desc_onboard: "Activité de la communauté, mises à jour de vos proches, et alertes importantes.",
  allow_notifications: "Activer les notifications",
  notif_reassurance: "Pas d'inquiétude — vous pouvez ajuster tout ça dans votre profil ✨",

  add_best_people: "Ajoutez vos proches",
  circle_onboard_desc: "Votre cercle — les amis et la famille avec qui vous partagez vos trajets et gardez le contact. 💛",
  best_people_empty: "Vos proches apparaîtront ici",
  best_people_sub: "Partagez vos trajets, marchez ensemble, gardez le contact",
  invite_sent: "🎉 Ils recevront une invitation à rejoindre Breveil !",
  add_later: "J'ajouterai plus tard",

  welcome_title: "Bienvenue dans votre communauté,",
  welcome_desc: "Votre carte est prête. Explorez votre quartier, connectez-vous avec les gens autour de vous.",
  close_ones: "proches",
  interests: "centres d'intérêt",
  features: "fonctionnalités",
  explore_map: "Explorer votre carte communautaire →",

  // ─── MISC ───
  name_or_phone: "Nom ou numéro de téléphone",
  french: "Français",
  english: "English",
} as const;

export default fr;
export type Translations = typeof fr;
```

### `lib/locales/en.ts`

```ts
import type { Translations } from "./fr";

const en: Translations = {
  // ─── NAVIGATION ───
  nav_map: "Map",
  nav_community: "Community",
  nav_route: "Route",
  nav_profile: "Me",

  // ─── HEADER ───
  brand_name: "BREVEIL",

  // ─── MAP ───
  nearby: "Nearby",
  layers: "Layers",
  streets: "Streets",
  light: "Light",
  dark: "Dark",

  // ─── INCIDENTS ───
  nearby_incidents: "Nearby incidents",
  live: "Live",
  all: "All",
  less_1h: "< 1h",
  less_6h: "< 6h",
  today: "Today",
  radius: "Radius",
  any: "Any",
  all_severity: "All severity",
  mild: "Mild",
  moderate: "Moderate",
  danger: "Danger",
  no_incidents: "No incidents",
  all_clear: "All clear around you ☀️",
  all_clear_sub: "Good news!",

  // ─── INCIDENT REPORT ───
  what_happened: "What happened?",
  harassment: "Harassment",
  stalking: "Stalking",
  aggression: "Aggression",
  theft: "Theft",
  verbal_abuse: "Verbal abuse",
  poor_lighting: "Poor lighting",
  unsafe_road: "Unsafe road",
  isolated_area: "Isolated area",
  intoxicated: "Intoxicated person",
  suspicious: "Suspicious behaviour",
  other: "Other",
  severity_label: "Severity",
  submit_report: "Report to community",
  add_details: "Add details (optional)",
  tap_to_change: "tap to change",
  report_success: "Thank you! Your report helps the whole community. 💛",

  // ─── SOS ───
  sos: "SOS",
  alerting_nearby: "Alerting nearby...",
  position_shared: "Your position will be shared",
  cancel: "CANCEL",
  emergency_detected: "Alert active — your circle has been notified",
  en_route_to: "En route to",
  share: "Share",
  safe_spot: "Safe spot",
  im_safe: "I'm safe",
  safe_confirmed: "Your circle has been notified that you're safe. 💛",
  hold_to_activate: "Hold to activate SOS",
  samu: "SAMU",
  police: "Police",
  pompiers: "Fire dept",
  eu: "EU 112",

  // ─── ROUTE ───
  my_route: "My route",
  walk_together: "Walk together",
  plan_trip: "Plan a trip",
  my_favorites: "My favourites",
  share_with_circle: "My Circle is watching",
  choose_route: "Choose route",
  walk: "Walk",
  bike: "Bike",
  drive: "Drive",
  transit: "Transit",
  routes_count: "routes",
  best: "best",
  start: "Start",
  departure: "Departure",
  destination: "Destination",
  your_position: "Your position",
  destination_placeholder: "e.g. Home, Gare du Nord, Café...",
  search_routes: "Search routes",
  share_code: "Share this code:",
  waiting_companion: "Waiting... 💛",
  close: "Close",

  // ─── COMMUNITY ───
  communities: "Communities",
  my_circle: "My Circle",
  add: "Add",
  invite_contact: "Invite someone",
  add_first_contact: "Add your first close ones 💛",
  circle_description: "Your people — share routes, walk together, and stay connected.",
  contacts_info: "They'll see your updates and you'll see theirs.",
  messages: "Messages",
  friends_messages: "Friends & direct messages",
  neighbourhoods: "Neighbourhoods",
  groups_communities: "Groups & Communities",
  new_group: "+ New",
  friends: "Friends",
  requests: "Requests",
  no_friends: "Your friends will appear here 💛",
  no_friends_sub: "Invite your people to Breveil",
  find_friends: "Find friends",
  no_neighbourhoods: "No neighbourhoods here yet — be the first! 🏘️",
  members: "members",
  view_group: "View →",
  leave: "Leave",
  your_story: "Your story",
  type_message: "Type a message...",
  your_communities: "YOUR COMMUNITIES",
  more: "MORE",
  join: "Join",

  // ─── PROFILE ───
  my_breveil: "My Breveil",
  set_name: "Set your name",
  view_profile: "View profile & activity",
  reports_stat: "Reports",
  level: "Level",
  thanks: "Thanks",
  level_watcher: "Watcher",
  level_guardian: "Guardian",
  level_sentinel: "Sentinel",
  level_protector: "Protector",
  activity: "Activity",
  saved: "Saved",
  statistics: "Statistics",
  nothing_yet: "Your activity will appear over time 📍",
  saved_empty: "Your saved reports will appear here ⭐",
  stats_empty: "Your statistics will appear over time 📊",
  my_communities: "My communities",
  join_first: "Join your first neighbourhood 🏘️",

  // ─── SETTINGS ───
  settings: "Settings",
  language: "Language",
  preferences: "PREFERENCES",
  notifications: "Notifications",
  notif_desc: "Alerts, radius, quiet hours",
  account: "Account",
  account_desc: "Name, email, password",
  restart_tour: "Restart onboarding tour",
  tour_desc: "Re-discover Breveil features",
  help: "HELP & INFORMATION",
  user_guide: "User guide",
  guide_desc: "How to use Breveil",
  faq: "FAQ",

  // ─── MAP LAYERS ───
  security: "SECURITY",
  transport: "TRANSPORT",
  data: "DATA",
  active: "active",
  heatmap: "My heatmap",
  safety_scores: "Safety scores",
  safe_spaces: "Safe spaces",
  none: "None",

  // ─── ONBOARDING ───
  skip: "Skip",
  continue_btn: "Continue",
  join_free: "Join for free",
  log_in: "Log in",
  create_account: "Create your account",
  join_community: "Join a community that looks out for each other.",
  continue_google: "Continue with Google",
  continue_apple: "Continue with Apple",
  or: "OR",
  email: "Email",
  password: "Password",
  min_chars: "Min 8 characters",
  sign_up: "Sign up",
  terms_text: "By signing up, you agree to our",
  terms: "Terms",
  and: "and",
  privacy: "Privacy Policy",

  tell_about_you: "Tell us about you",
  personalize: "We'll personalize your experience.",
  first_name: "First name",
  birthday: "Birthday",
  city: "City",
  i_am: "I am...",
  pick_many: "(pick as many as you like)",
  persona_commuter: "Commuter",
  persona_student: "Student",
  persona_nightowl: "Night owl",
  persona_runner: "Runner",
  persona_parent: "Parent",
  persona_traveler: "Traveller",
  persona_freelance: "Freelancer",
  persona_nightlife: "Nightlife",
  persona_everything: "A bit of everything!",

  what_matters: "What matters most to you?",
  select_all: "Select all that apply",
  goal_routes: "Safer routes",
  goal_routes_desc: "Smart navigation",
  goal_alerts: "Neighbourhood alerts",
  goal_alerts_desc: "Stay in the loop",
  goal_sos: "SOS protection",
  goal_sos_desc: "One-tap emergency",
  goal_transit: "Transit safety",
  goal_transit_desc: "Safer commutes",
  goal_community: "My community",
  goal_community_desc: "Connect locally",
  goal_companion: "Virtual companion",
  goal_companion_desc: "Julia, your AI",

  enable_location: "Enable location",
  location_desc: "See what's happening around you and let your circle know where you are.",
  allow_location: "Allow location",
  not_now: "Not now",
  nearby_spots: "📍 Nearby spots",
  smart_routes: "🗺️ Smart routes",
  local_community: "👥 Local community",

  stay_in_loop: "Stay in the loop",
  notif_desc_onboard: "Community updates, friend activity, and important alerts.",
  allow_notifications: "Allow notifications",
  notif_reassurance: "No worries — you can adjust all notifications in your profile anytime ✨",

  add_best_people: "Add your best people",
  circle_onboard_desc: "Your inner circle — the friends and family you share routes with and stay connected to. 💛",
  best_people_empty: "Your best people will appear here",
  best_people_sub: "Share routes, walk together, stay connected",
  invite_sent: "🎉 They'll get an invite to join Breveil!",
  add_later: "I'll add people later",

  welcome_title: "Welcome to your community,",
  welcome_desc: "Your map is ready. Explore your neighbourhood, connect with people nearby.",
  close_ones: "close ones",
  interests: "interests",
  features: "features",
  explore_map: "Explore your community map →",

  // ─── MISC ───
  name_or_phone: "Name or phone number",
  french: "Français",
  english: "English",
};

export default en;
```

---

## Language Picker — Settings Page

In the settings sheet, the "Langue" / "Language" row should open a selector:

```tsx
const LanguagePicker = () => {
  const { locale, setLocale, t } = useI18n();
  return (
    <div>
      <button 
        onClick={() => setLocale("fr")} 
        style={{ fontWeight: locale === "fr" ? 700 : 400 }}
      >
        🇫🇷 Français
      </button>
      <button 
        onClick={() => setLocale("en")} 
        style={{ fontWeight: locale === "en" ? 700 : 400 }}
      >
        🇬🇧 English
      </button>
    </div>
  );
};
```

Also offer language choice on the onboarding auth screen (small toggle in top-right).

---

## Persisting Language

Save to Supabase profile AND localStorage:
```ts
// On language change:
await supabase.from('profiles').update({ language: locale }).eq('id', user.id);
localStorage.setItem("locale", locale);
```

On app load, read from profile first, fallback to localStorage, fallback to "fr".

---

## Verification checklist
- [ ] Zero hardcoded UI strings in components (all from `t.key`)
- [ ] `fr.ts` and `en.ts` have identical keys (TypeScript enforced)
- [ ] Settings shows working language picker
- [ ] Switching language updates ALL visible text instantly
- [ ] Language persists across page reload
- [ ] Onboarding screens use i18n strings
- [ ] Emergency numbers stay locale-aware (15/17/18/112 always shown for France)
- [ ] Default language is French
