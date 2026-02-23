# KOVA — Dossier de Présentation

**Entreprise :** DBEK
**Siège social :** 75 rue de Lourmel, 75015 Paris, France
**Contact :** kovaapp@pm.me
**Plateforme :** PWA (Progressive Web App)
**URL de production :** [safepin-pearl.vercel.app](https://safepin-pearl.vercel.app)
**Slogan :** *Un monde plus sûr, cartographié par les femmes — pour les femmes.*

---

## 1. Problème

- **1 femme sur 3** dans le monde est victime de violences physiques ou sexuelles (OMS, 2021).
- **80 % du harcèlement de rue** n'est jamais signalé.
- Il n'existe aucune source de données de sécurité en temps réel et participative. Les outils existants sont fragmentés, cloisonnés et passifs.

Les femmes se déplacent en ville sans information exploitable sur leur sécurité. Les solutions actuelles se concentrent soit sur l'intervention d'urgence (trop tardive), soit sur des bases de données criminelles statiques (trop obsolètes). Aucune ne combine sensibilisation communautaire en temps réel, planification proactive d'itinéraires et outils de sécurité personnelle au sein d'une même plateforme.

---

## 2. Solution

KOVA est une **plateforme communautaire de sécurité urbaine** — une carte de sécurité vivante, alimentée par sa communauté.

### Boucle principale

```
Vous voyez quelque chose → Signalez (30 secondes) → Apparaît sur la carte instantanément
→ Les votes de la communauté confirment ou invalident → Les itinéraires s'ajustent
automatiquement, les alertes se déclenchent, les scores de sécurité se mettent à jour
```

KOVA transforme des témoins passifs en un réseau de sécurité actif. Chaque signalement enrichit la carte, chaque vote affine la précision, et chaque utilisatrice profite de l'intelligence collective de la communauté.

---

## 3. Public cible

| Segment | Description |
|---------|-------------|
| **Principal** | Femmes urbaines de 18 à 45 ans — navetteurs, étudiantes, travailleuses de nuit, coureuses, nouvelles résidentes |
| **Secondaire** | Parents, administrations municipales, opérateurs de transport |

### Déploiement géographique

| Phase | Périmètre |
|-------|-----------|
| **Phase 1** | Paris |
| **Phase 2** | Villes européennes |
| **Phase 3** | International |

---

## 4. Modèle économique — Freemium SaaS

### Offre gratuite

Toutes les fonctionnalités essentielles, sans frais :

- Carte de sécurité
- Signalement d'incidents
- SOS urgence
- Planificateur d'itinéraires sécurisés
- Groupes communautaires et quartiers
- Walk With Me
- Diffusion en direct
- Défis hebdomadaires
- Système de parrainage

### KOVA Pro

| Formule | Tarif |
|---------|-------|
| Mensuel | **4,99 EUR/mois** |
| Annuel | **39,99 EUR/an** |

Les fonctionnalités Pro comprennent :

- Historique de localisation
- Safety buddy
- Scores de sécurité par quartier
- Analyses avancées
- Alertes prioritaires

### Paiements

Propulsés par **Stripe** :

- Stripe Checkout pour l'initiation des abonnements
- Stripe Webhooks pour la gestion des événements
- Stripe Billing Portal pour la gestion en libre-service
- Historique complet de facturation

### Sources de revenus futures

- Tableaux de bord B2B pour les municipalités
- Licence de données anonymisées

---

## 5. Stratégies de croissance

### Parrainage viral

Chaque utilisatrice reçoit un code de parrainage unique (`KOVA-XXXXX`). Le partage stimule l'acquisition organique grâce à des incitations intégrées.

### Ludification

| Niveau de confiance | Progression |
|---------------------|-------------|
| Watcher | Niveau de départ |
| Reporter | Contributrice active |
| Guardian | Membre de confiance de la communauté |
| Sentinel | Contributrice vérifiée de premier rang |

Mécanismes d'engagement supplémentaires :

- Défis hebdomadaires
- Jalons et récompenses
- Tags d'expertise

### Effets de réseau communautaire

- Les quartiers créent une densité locale
- Les cercles de confiance construisent des graphes sociaux
- Walk With Me favorise l'usage en binôme et l'engagement en temps réel

### Avantages de la PWA

- Zéro friction — aucun app store requis
- Installable sur tout appareil
- Push notifications via Web Push API
- Architecture offline-first

---

## 6. Paysage concurrentiel

| Concurrent | Catégorie | Différenciation KOVA |
|------------|-----------|----------------------|
| bSafe | Sécurité personnelle | KOVA ajoute l'intelligence communautaire et la carte en direct |
| Noonlight | Dispatch d'urgence | KOVA est proactif, pas seulement réactif |
| Citizen | Alertes d'incidents | KOVA est centré sur les femmes avec une communauté de confiance |
| Life360 | Suivi familial | KOVA ajoute le signalement d'incidents et la planification d'itinéraires |
| Google Maps | Navigation | KOVA superpose des données de sécurité en temps réel sur les itinéraires |
| Waze | Navigation communautaire | KOVA se concentre sur la sécurité personnelle, pas sur le trafic |

**KOVA est la seule solution à combiner** intelligence communautaire + sécurité personnelle + engagement social dans une seule PWA.

---

## 7. Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 16, React 19, TypeScript |
| Styles | Tailwind CSS v4, Framer Motion |
| Backend | Supabase (PostgreSQL + Auth + Realtime + Storage + Edge Functions) |
| Cartes | Mapbox GL JS v3 (intégration directe, sans wrapper) |
| Itinéraires | OSRM |
| Transports | Overpass API (OpenStreetMap) |
| Vidéo en direct | LiveKit (WebRTC) |
| Paiements | Stripe (Checkout, Webhooks, Portal) |
| Push | Web Push API + VAPID |
| i18n | next-intl — 30 langues |
| Vérification d'identité | Veriff |
| Gestion d'état | Zustand v5 |
| Icônes | Lucide React |
| Hébergement | Vercel |

---

## 8. Méthodes d'authentification

KOVA prend en charge quatre méthodes d'authentification :

1. **Google OAuth**
2. **Apple Sign-In**
3. **Magic Link** (OTP par e-mail)
4. **E-mail + mot de passe**

---

## 9. Page d'accueil

La page d'accueil a été repensée avec :

- **Section héro** avec texte en dégradé et proposition de valeur claire
- **Barre de statistiques** — 10 000+ signalements, 30 langues, disponibilité 24h/24 7j/7, 100 % gratuit
- **Carte d'authentification** avec interface à onglets pour la connexion et l'inscription
- **Grille de fonctionnalités** présentant les 6 fonctionnalités principales
- **Section preuve sociale**
- **Pied de page** avec liens légaux (Politique de confidentialité, Conditions d'utilisation, Politique de cookies)

---

## 10. RGPD et confidentialité

- **Instance Supabase en région UE** pour la conformité en matière de résidence des données
- **Pages légales complètes :**
  - Politique de confidentialité (`/privacy`)
  - Conditions d'utilisation (`/terms`)
  - Politique de cookies (`/cookies`)
- **Contrôles de confidentialité** granulaires pour chaque utilisatrice
- **Suppression des données** prise en charge
- **Heures de tranquillité** configurables
- **Vérification d'identité** via Veriff

---

## 11. Vue d'ensemble des fonctionnalités (29 fonctionnalités)

| # | Fonctionnalité | Description |
|---|----------------|-------------|
| 1 | Carte de sécurité | Carte en temps réel des incidents de sécurité signalés par la communauté |
| 2 | Signalement d'incidents | Soumettez un signalement en moins de 30 secondes |
| 3 | Votes et cycle de vie des épingles | La communauté confirme ou invalide les incidents par le vote |
| 4 | SOS urgence | Alerte d'urgence en un geste vers vos contacts et les autorités |
| 5 | Walk With Me | Demandez un accompagnement virtuel pendant votre trajet |
| 6 | Check-in audio | Confirmations de sécurité périodiques par audio |
| 7 | Planificateur d'itinéraires sécurisés | Itinéraires qui évitent les incidents signalés |
| 8 | Diffusion en direct | Diffusez de la vidéo en temps réel en situation d'insécurité |
| 9 | Groupes communautaires | Rejoignez ou créez des groupes dédiés à la sécurité |
| 10 | Quartiers | Communautés de sécurité localisées pour votre zone |
| 11 | Amis et messages directs | Connectez-vous avec des contacts de confiance et échangez en privé |
| 12 | Niveaux de confiance | Progressez à travers les niveaux Watcher, Reporter, Guardian, Sentinel |
| 13 | Défis hebdomadaires | Missions d'engagement ludiques renouvelées chaque semaine |
| 14 | Système de parrainage | Codes uniques KOVA-XXXXX pour la croissance virale |
| 15 | Diffusion SOS | Diffusez des alertes SOS aux utilisatrices à proximité |
| 16 | Safety Buddy (Pro) | Accompagnement virtuel dédié avec fonctionnalités enrichies |
| 17 | Jalons | Suivi des accomplissements et récompenses |
| 18 | Tags d'expertise | Obtenez des tags en fonction de vos domaines de contribution |
| 19 | Notifications | Push notifications via Web Push API |
| 20 | Tableau de bord administrateur | Panneau de contrôle administratif complet |
| 21 | Facturation | Gestion des abonnements propulsée par Stripe |
| 22 | PWA et hors-ligne | Application installable avec fonctionnement hors-ligne natif |
| 23 | i18n (30 langues) | Internationalisation complète via next-intl |
| 24 | Itinéraires partagés | Partagez des itinéraires sécurisés avec vos amis et contacts |
| 25 | Cercle de confiance | Cercle restreint de contacts de confiance vérifiés |
| 26 | Notes de lieux | Ajoutez des notes de sécurité personnelles à des emplacements |
| 27 | Moteur de simulation | Outil administrateur pour les données de démonstration et les tests de charge |
| 28 | Vérification d'identité | Confirmation d'identité propulsée par Veriff |
| 29 | Pages légales | Politique de confidentialité, Conditions d'utilisation, Politique de cookies |

---

## 12. Indicateurs clés

| Catégorie | Indicateurs |
|-----------|-------------|
| Engagement | DAU / WAU / MAU |
| Contenu | Épingles par jour |
| Qualité | Taux de résolution |
| Sécurité | Activations SOS |
| Activité | Taux d'engagement |
| Rétention | Rétention J7 / J30 |
| Monétisation | Taux de conversion Pro |
| Croissance | Coefficient de parrainage |
| Ludification | Taux de complétion des défis |

---

## 13. Vision

| Horizon | Objectifs |
|---------|-----------|
| **6 mois** | Devenir le compagnon de sécurité de référence à Paris, 10 000 utilisatrices |
| **18 mois** | 5 villes européennes, lancement du tableau de bord B2B, 100 000 utilisatrices |
| **3 ans** | 50+ villes, partenariats de données établis, 1 M+ utilisatrices |

---

*KOVA par DBEK — Un monde plus sûr, cartographié par les femmes, pour les femmes.*
