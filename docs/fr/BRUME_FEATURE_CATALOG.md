# Brume -- Catalogue des fonctionnalites

Reference complete de chaque fonctionnalite de la plateforme de securite Brume.

---

## Table des matieres

1. [Carte de securite](#1-carte-de-securite)
2. [Signalement d'incidents](#2-signalement-dincidents)
3. [Detail d'un signalement et vote](#3-detail-dun-signalement-et-vote)
4. [Systeme d'urgence SOS](#4-systeme-durgence-sos)
5. [Walk With Me](#5-walk-with-me)
6. [Memo vocal](#6-memo-vocal)
7. [Planificateur d'itineraires surs](#7-planificateur-ditineraires-surs)
8. [Diffusion en direct](#8-diffusion-en-direct)
9. [Liste des incidents](#9-liste-des-incidents)
10. [Systeme communautaire](#10-systeme-communautaire)
11. [Amis et messages directs](#11-amis-et-messages-directs)
12. [Mon espace Brume](#12-mon-espace-kova)
13. [Systeme de niveaux de confiance](#13-systeme-de-niveaux-de-confiance)
14. [Badges d'expertise](#14-badges-dexpertise)
15. [Jalons](#15-jalons)
16. [Defis hebdomadaires](#16-defis-hebdomadaires)
17. [Systeme de parrainage](#17-systeme-de-parrainage)
18. [Diffusion SOS communautaire](#18-diffusion-sos-communautaire)
19. [Itineraires partages](#19-itineraires-partages)
20. [Jumelage de compagnons de securite](#20-jumelage-de-compagnons-de-securite)
21. [Cercle de confiance](#21-cercle-de-confiance)
22. [Notes de lieu](#22-notes-de-lieu)
23. [Notifications](#23-notifications)
24. [Parametres](#24-parametres)
25. [Tableau de bord administrateur (Tower Control)](#25-tableau-de-bord-administrateur-tower-control)
26. [Facturation et abonnements](#26-facturation-et-abonnements)
27. [PWA et mode hors-ligne](#27-pwa-et-mode-hors-ligne)
28. [Internationalisation](#28-internationalisation)
29. [Moteur de simulation](#29-moteur-de-simulation)
30. [Verification d'identite](#30-verification-didentite)
31. [Pages juridiques](#31-pages-juridiques)
32. [Page d'accueil](#32-page-daccueil)
33. [Lieux sûrs partenaires](#33-lieux-surs-partenaires)
34. [Séries quotidiennes](#34-series-quotidiennes)
35. [Itinéraires en transport](#35-itineraires-en-transport)

---

## 1. Carte de securite

**Composant :** `MapView.tsx`
**Emplacement :** Page principale de la carte -- toujours visible derriere toutes les bottom sheets

La carte interactive plein ecran Mapbox GL JS est le coeur de Brume. Elle affiche simultanement plusieurs couches de donnees et constitue l'interface principale pour la sensibilisation spatiale a la securite.

### Couches de la carte (activables via le LayerPanel)

| Couche | Description | Par defaut |
|---|---|---|
| Signalements | Marqueurs de signalement avec emoji de categorie + couleur de gravite | Active |
| Itineraire actif | Trace polyline de l'itineraire en cours | Active (pendant un trajet) |
| Alternatives | Jusqu'a 3 itineraires candidats pendant la planification | Active (pendant la planification) |
| Cercle de confiance | Points bleus indiquant la position en temps reel des contacts de confiance | Desactive |
| Notes de lieu | Emplacements personnels enregistres | Desactive |
| Arrets de bus | Arrets de bus parisiens (depuis OpenStreetMap via Overpass API) | Desactive |
| Metro / RER | Stations de metro, RER et tramway (depuis OpenStreetMap via Overpass API) | Desactive |
| Pharmacies | Pharmacies a proximite (POI Overpass) | Desactive |
| Hopitaux | Hopitaux a proximite | Desactive |
| Commissariats | Commissariats a proximite | Desactive |
| Historique de position | Carte thermique du parcours GPS personnel | Desactive (Pro uniquement) |
| Lieux surs | Emplacements surs verifies | Active |
| Scores de quartier | Superposition des scores de securite par zone | Desactive (Pro uniquement) |
| Donnees simulees | Donnees fictives du moteur de simulation | Desactive (Admin uniquement) |

### Styles de carte

| Style | Description |
|---|---|
| Streets | Style Mapbox Streets par defaut |
| Light | Fond de carte a tonalite claire |
| Dark | Fond de carte a tonalite sombre (synchronise avec le theme de l'application) |

### Controles de la carte

- **Bottom sheet de filtres :** Bottom sheet depliable avec filtres categories (gravite, anciennete, type de lieu, heure de la journee, confirmes uniquement). Ouvert via le bouton filtre sur la carte.
- **Bottom sheet de calques :** Bottom sheet depliable pour activer/desactiver les couches de la carte (POI de securite, Transport, Donnees, Admin). Ouvert via le bouton calques sur la carte.
- **Recherche d'adresse :** Mapbox Geocoding API avec autocompletion
- **Panneau de contexte urbain :** Informations contextuelles sur la zone visible a l'ecran
- **Pastille d'incidents proches :** Badge en haut a gauche affichant le nombre d'incidents actifs dans le champ de vision

### Disposition des boutons de la carte

Disposition en deux colonnes separant les actions principales (droite) des controles secondaires (gauche) :

```
[Pastille proches]                              [haut-gauche]

[Filtres      ]                                 [colonne gauche, haut]
[Calques      ]                                 [colonne gauche, milieu]
[Communaute   ]                                 [colonne gauche, bas]

                                  [Signaler +]  [colonne droite, haut]
                                  [   SOS    ]  [colonne droite, bas]
```

- **Colonne gauche** (controles secondaires) : Filtres (36px), Calques (36px), Acces rapide communaute (44px)
- **Colonne droite** (actions principales) : Bouton + Signaler (56px), SOS urgence (56px)
- Les bottom sheets Filtres et Calques sont mutuellement exclusifs (ouvrir l'un ferme l'autre)

---

## 2. Signalement d'incidents

**Composant :** `ReportSheet.tsx`
**Declencheur :** Appuyer sur le bouton FAB "+" sur la carte

Un parcours de signalement simplifie en 30 secondes pour les incidents de securite.

### Champs du signalement

| Champ | Options | Obligatoire |
|---|---|---|
| Categorie | Harcelement, Filature, Zone sombre, Agression, Personne en etat d'ebriete, Autre | Oui |
| Gravite | Faible (jaune), Moyenne (orange), Elevee (rouge) | Oui |
| Environnement | Rue, Metro, Bus, Parc, Bar/Club, Lieu de travail, Ecole, Autre | Oui |
| Contexte urbain | Residentiel, Commercial, Industriel, Noeud de transport, Parc/Espace vert | Non |
| Contexte personnalise | Texte libre (ex. : "pres de la fontaine") | Non |
| "Je suis en deplacement" | Bascule pour les incidents en transit | Non |
| Description | Texte libre | Non |
| Medias | Jusqu'a 5 fichiers (photo, video, audio) | Non |

### Localisation

- Le signalement est place aux coordonnees GPS actuelles de l'utilisateur
- Adresse geocodee automatiquement via l'API Mapbox pour un affichage lisible
- Adresse incluse dans la description du signalement

### Mode hors-ligne

Lorsqu'aucune connexion reseau n'est detectee :

1. Le signalement est serialise et sauvegarde dans la file d'attente **IndexedDB**
2. Le composant `OfflineBanner` affiche l'etat de la connexion
3. Le service worker effectue une **synchronisation en arriere-plan** au retour de la connexion
4. Les signalements en attente sont envoyes automatiquement

### Apres la creation

- Le signalement apparait sur la carte **instantanement** via Supabase Realtime `postgres_changes`
- Les utilisateurs a proximite recoivent une **notification Web Push** (filtree par rayon d'alerte)
- Le signalement suit un cycle de vie : actif -> confirme/infirme -> expire/resolu

---

## 3. Detail d'un signalement et vote

**Composant :** `DetailSheet.tsx`
**Declencheur :** Appuyer sur un signalement sur la carte ou dans la liste des incidents

### Informations affichees

- Emoji de categorie + libelle + barre de couleur de gravite
- Texte descriptif
- Adresse (geocodee)
- Temps ecoule depuis la creation (ex. : "il y a 23 min")
- Badge d'environnement
- Galerie de medias (photos, videos) -- zoom possible
- Compteurs de votes (confirmer / infirmer)
- Nombre de commentaires

### Actions interactives (hierarchie a 3 niveaux)

Les actions sont organisees en trois niveaux pour plus de clarte :

**Actions principales** (toujours visibles) :

| Action | Description |
|---|---|
| **Confirmer** | Voter que l'incident est reel -- incremente `votes_confirm`, prolonge la duree de vie du signalement |
| **Infirmer** | Voter que l'incident n'est plus d'actualite -- incremente `votes_deny`. A 3 infirmations, le signalement est automatiquement resolu |

**Actions secondaires** (visibles sous les actions principales) :

| Action | Description |
|---|---|
| **Commenter** | Ajouter un commentaire textuel -- discussion en temps reel sur le signalement via Supabase Realtime |
| **Suivre** | Ajouter ce signalement aux favoris pour recevoir les mises a jour -- sauvegarde dans localStorage, apparait dans le fil Mon Brume |
| **Remercier** | Envoyer de la gratitude au signaleur -- bouton coeur rose, incremente `thanks_received` du signaleur |

**Actions tertiaires** (dans le menu "Plus") :

| Action | Description |
|---|---|
| **Passer en direct** | Lancer une diffusion video/audio LiveKit depuis cet emplacement |
| **Regarder en direct** | Rejoindre un flux en direct actif sur ce signalement |
| **Signaler** | Signaler comme spam, faux, offensant ou doublon |
| **Resoudre** | Le proprietaire du signalement peut le marquer comme resolu manuellement |

### Complements pour les signalements d'urgence

Pour les signalements marques `is_emergency: true` :

- **Panneau de diffusion SOS** -- affiche les intervenants a proximite, bouton "J'arrive"
- **Bouton de memo vocal** -- enregistrer une mise a jour vocale pour l'urgence

---

## 4. Systeme d'urgence SOS

**Composant :** `EmergencyButton.tsx`
**Emplacement :** Bouton FAB rouge persistant en forme de bouclier, en bas a droite de la carte

### Processus d'activation

```
1. APPUYER sur le bouton SOS
   |
2. Superposition plein ecran avec compte a rebours de 5 secondes (empeche les declenchements accidentels)
   - Boutons d'appel d'urgence rapide visibles : 15 (SAMU), 17 (Police), 18 (Pompiers), 112 (UE)
   |
3. Le compte a rebours se termine ou l'utilisateur confirme plus tot
   |
4. SOS ACTIVE :
   - Signalement d'urgence cree a la position GPS (is_emergency: true)
   - L'Edge Function emergency-dispatch notifie tous les contacts de confiance
   - Le suivi GPS demarre (nouveau point de passage tous les 30 m ou 45 s)
   - La couche Lieux surs s'active automatiquement sur la carte
   - Bandeau "SOS ACTIF" affiche en haut de l'ecran
   |
5. ESCALADE : Apres 15 minutes sans resolution, re-envoi aux contacts de confiance
   |
6. RESOLUTION : Le bouton "Je suis en securite" resout tous les signalements de la session et notifie les contacts
```

### Fil d'Ariane GPS

Pendant un SOS actif, l'application utilise `watchPosition` pour creer un fil de signalements :

- Nouveau point tous les **30 metres** de deplacement ou **45 secondes** (selon ce qui arrive en premier)
- Chaque point du fil a `is_emergency: true` et est rattache a la session
- Le fil est visible par les contacts de confiance sur leur carte

### Numeros d'urgence (France)

| Numero | Service |
|---|---|
| 15 | SAMU (Medical) |
| 17 | Police |
| 18 | Pompiers (Incendie) |
| 112 | Urgence universelle UE |

---

## 5. Walk With Me

**Composant :** `WalkWithMePanel.tsx`
**Objectif :** Compagnon virtuel pour les trajets a pied en solo

### Creer une session

1. Appuyer sur "Walk With Me" dans l'interface de la carte
2. Saisir optionnellement une destination
3. Un **code d'invitation alphanumerique de 6 caracteres** unique est genere (ex. : `A3K9MX`)
4. La session est creee dans la table `walk_sessions` avec le statut `waiting`
5. Partager le code avec un ami

### Rejoindre une session

1. Saisir le code d'invitation
2. Automatiquement relie en tant que compagnon
3. La session passe au statut `active`

### Fonctionnalites de la session active

| Fonctionnalite | Description |
|---|---|
| Chronometre | Compteur de temps ecoule |
| Destination | Affichage optionnel de la destination |
| Partage de position | Les deux utilisateurs partagent leur position en temps reel via les canaux Supabase Presence |
| Compagnon sur la carte | La position du compagnon est affichee sous forme de point sur la carte |
| Points de controle a 15 min | Boite de dialogue "Ca va ?" toutes les 15 minutes -- si non fermee, peut declencher une alerte |
| Fin de session | Bouton "Terminer la marche -- Je suis en securite" pour cloturer proprement la session |

### Etats de la session

```
waiting -> active -> completed / cancelled
```

---

## 6. Memo vocal

**Composant :** `AudioCheckinButton.tsx`
**Objectif :** Enregistrement de memos vocaux pour les sessions de securite

### Processus d'enregistrement

1. Maintenir appuye le bouton microphone
2. **Visualisation de la forme d'onde en temps reel** via Web Audio API `AnalyserNode` (FFT 64 bandes)
3. Relacher pour arreter l'enregistrement
4. **Preecoute** avant l'envoi
5. Confirmer -> telechargement vers Supabase Storage (bucket `pin-photos`, prefixe `audio/`)
6. Metadonnees sauvegardees dans la table `audio_checkins` avec la duree

### Details techniques

| Propriete | Valeur |
|---|---|
| Format | `audio/webm;codecs=opus` |
| Chemin de stockage | `audio/{userId}/{timestamp}.webm` |
| Bucket de stockage | `pin-photos` |
| Visualisation | Web Audio API, `AnalyserNode`, FFT 64 bandes |
| Disponible dans | Sessions Walk With Me, sessions SOS d'urgence, fiches de detail des signalements |

---

## 7. Planificateur d'itineraires surs

**Composant :** `TripView.tsx`
**Acces :** Onglet Trajet dans la navigation inferieure

### Planification d'itineraire

| Champ | Description |
|---|---|
| Depart | Optionnel -- par defaut la position GPS actuelle |
| Destination | Obligatoire -- autocompletion via Mapbox geocoding |
| Mode | A pied, Velo, Voiture, Transports en commun |
| Filtre nocturne | Bascule pour les itineraires surs de nuit uniquement |
| Duree | 15 min, 30 min, 1 h, 2 h, 4 h |

### Moteur de calcul d'itineraire

1. Appel a l'API de routage **OSRM** pour obtenir jusqu'a **3 itineraires alternatifs**
2. **Score de danger :** Chaque itineraire est evalue en comptant les signalements non resolus dans un rayon de **200 metres** autour du trajet
3. **Algorithme de contournement :** Pour les segments dangereux, generation de points intermediaires a **380 metres hors itineraire** perpendiculairement pour devier autour des zones a risque
4. Itineraires etiquetes : **Le plus sur** (vert), **Equilibre** (ambre), **Le plus rapide** (bleu)
5. Les segments devies sont accompagnes d'un badge "Devie"

### Mode trajet actif

| Fonctionnalite | Description |
|---|---|
| Compte a rebours | Barre de progression vers l'heure d'arrivee estimee |
| Suivi GPS en direct | Enregistrement dans `location_history` toutes les 30 secondes |
| "Je suis en securite" | Terminer le trajet, sauvegarder dans `trip_log` |
| "Annuler le trajet" | Abandonner sans sauvegarder |
| Lieu sur le plus proche | Raccourci pour trouver le lieu sur le plus proche |
| Partage de position | Bascule pour diffuser sa position en direct au Cercle de confiance |
| Alertes intelligentes | Notifications lorsque de nouveaux incidents apparaissent le long de vos itineraires sauvegardes |

### Itineraires sauvegardes

- Mettre en favori n'importe quel itineraire dans la table `saved_routes`
- Les itineraires sauvegardes apparaissent dans l'onglet Favoris de Mon Brume
- Les itineraires sauvegardes sont surveilles pour les nouveaux incidents le long du trajet

---

## 8. Diffusion en direct

**Composants :** `LiveBroadcaster.tsx`, `LiveViewer.tsx`
**Technologie :** LiveKit (WebRTC)

### Passer en direct (Diffuseur)

1. Ouvrir la fiche de detail d'un signalement -> appuyer sur "Passer en direct"
2. Options de configuration :
   - Visibilite : Publique / Contacts uniquement
   - Type de flux : Audio uniquement / Video
   - Le mode video affiche un avertissement de consommation de batterie
3. Le jeton JWT LiveKit est recupere depuis `/api/livekit-token` avant le passage en direct (demarrage instantane)
4. Enregistrement cree dans la table `live_sessions`
5. Interface plein ecran de diffusion avec :
   - Indicateur "EN DIRECT" anime + compteur de duree
   - Nombre de spectateurs
   - Superposition de chat flottant (messages via le canal de donnees LiveKit)
   - Bouton "ARRETER LE DIRECT"

### Regarder en direct (Spectateur)

- Rejoint la salle LiveKit en tant qu'abonne
- Lecture video/audio
- Possibilite d'envoyer des messages dans la superposition de chat en temps reel
- Le signalement affiche un badge "EN DIRECT" pulsant sur la carte et dans la liste des incidents

---

## 9. Liste des incidents

**Composant :** `IncidentsView.tsx`
**Acces :** Onglet Incidents dans la navigation inferieure

### Filtres

| Filtre | Options |
|---|---|
| Periode | Tous, < 1 heure, < 6 heures, Aujourd'hui |
| Rayon | Tous, 500 m, 1 km, 2 km, 5 km (necessite le GPS) |
| Urgences uniquement | Bascule -- afficher uniquement les signalements SOS |
| En direct uniquement | Bascule -- afficher uniquement les signalements avec un flux actif |
| Gravite | Tous, Faible, Moyenne, Elevee |

### Affichage

- Regroupement par categorie avec sections depliables
- Alertes d'urgence affichees dans une carte rouge speciale avec point pulsant
- Les signalements classiques affichent : barre de couleur de gravite, emoji de categorie, distance, environnement, nombre de medias
- Badge de diffusion en direct sur les signalements avec sessions actives
- Ordre de tri : en direct d'abord -> urgences -> par date recente

---

## 10. Systeme communautaire

**Composant :** `CommunityView.tsx`
**Acces :** Onglet Communaute dans la navigation inferieure

### Trois sous-onglets

#### Onglet Groupes

- Parcourir toutes les communautes et groupes
- Rejoindre / quitter avec interface optimiste
- Creer une nouvelle communaute ou un nouveau groupe
  - Selecteur d'emoji (15 options)
  - Nom, description, bascule public/prive
- Vue de detail de la communaute : description, nombre de membres, sous-groupes
- **Discussion en temps reel** au sein de toute communaute/groupe (Supabase Realtime)
- Rangee de stories en haut du chat
- Acces restreint : il faut etre membre pour publier dans les communautes privees

#### Onglet Quartiers

**Composant :** `NeighborhoodFeed.tsx`

- Charge les communautes avec `community_subtype = 'neighborhood'`
- **Tri par distance** depuis la position GPS de l'utilisateur
- **Selection automatique** du quartier le plus proche
- **Adhesion automatique** au quartier le plus proche lors de la consultation
- Puces de selection defilables horizontalement (nom + nombre de membres)
- Discussion en temps reel complete pour le quartier selectionne
- Bouton "Creer un quartier" -- en cree un a la position actuelle avec un rayon de 1 km

#### Onglet Amis

Voir [Amis et messages directs](#11-amis-et-messages-directs) ci-dessous.

---

## 11. Amis et messages directs

**Composant :** `FriendsView.tsx`

### Gestion des amis

| Fonctionnalite | Description |
|---|---|
| Recherche | Trouver des utilisateurs par nom d'affichage (anti-rebond 300 ms) |
| Envoyer une demande | Cree un enregistrement `friendships` (statut : pending) |
| Accepter/Refuser | Repondre aux demandes entrantes |
| Onglet Demandes | Affiche les demandes en attente avec badge de compteur non lu |

### Messagerie directe

- Appuyer sur un ami pour ouvrir la conversation en MP
- Cree automatiquement un enregistrement `dm_conversations` si aucun n'existe
- **Synchronisation en temps reel** via Supabase Realtime sur `direct_messages`
- Prend en charge : texte, envoi d'images, envoi de videos (vers le bucket `media`)
- Regroupement par horodatage (messages espaces de moins de 5 minutes regroupes)
- Accuses de lecture via `user1_last_read_at` / `user2_last_read_at`

---

## 12. Mon espace Brume

**Composant :** `MyKovaView.tsx`
**Acces :** Onglet Mon Brume dans la navigation inferieure

### Carte de profil (toujours visible)

Une carte de profil persistante est affichee au-dessus des onglets :

- Avatar avec possibilite d'envoi (stocke dans Supabase Storage)
- Nom d'affichage
- Badge de verification (voir [Verification d'identite](#30-verification-didentite))
- Badges d'expertise (calcules automatiquement, jusqu'a 5)
- Badge du niveau de confiance avec emoji et couleur

### Trois sous-onglets

#### Activite

- Notifications recentes dans l'application (depuis la table `notifications`)
- Fil des signalements suivis (signalements en favoris depuis localStorage)
- Liste de mes signalements (modifiable, supprimable, depliable)
- Historique des trajets (depliable)
- Historique SOS (depliable)

#### Sauvegardes

- Notes de lieu favorites avec emoji
- Itineraires sauvegardes -- appuyer pour charger dans le Planificateur de trajet
- Gestion des favoris/suppressions
- Visualiseur d'historique de position (Pro, depliable)

#### Statistiques

**Affichage du score de confiance :**
- Barre de progression visuelle du niveau (actuel -> niveau suivant)
- Badge du niveau actuel avec emoji et couleur
- Decomposition des points

**Affichage de la serie quotidienne :**
- Serie actuelle, plus longue serie et emoji de serie

**Graphique d'activite sur 7 jours :**
- Diagramme en barres de la contribution quotidienne sur la semaine ecoulee

**Grille d'impact :**

| Statistique | Description |
|---|---|
| Signalements | Nombre total de signalements soumis |
| Confirmations | Nombre total de votes de confirmation |
| Signalements actifs | Signalements actuellement en cours |
| Commentaires | Nombre total de commentaires rediges |
| Notes de lieu | Marque-pages personnels crees |

**Sections supplementaires :**
- Gestion du Cercle de confiance
- Defis hebdomadaires (voir [Defis hebdomadaires](#16-defis-hebdomadaires))
- Systeme de parrainage (voir [Systeme de parrainage](#17-systeme-de-parrainage))
- Bouton de deconnexion

---

## 13. Systeme de niveaux de confiance

**Fichier :** `src/lib/levels.ts`

### Formule de score

```typescript
score = (pins * 10) + (alerts * 15) + (confirmedVotes * 5) + (commentsMade * 2)
```

### Niveaux

| Niveau | Emoji | Couleur | Hex | Points requis | Signification |
|---|---|---|---|---|---|
| Watcher | 👁 | Gris | `#6b7280` | 0--49 | Nouvel utilisateur, en phase de decouverte |
| Reporter | 📡 | Indigo | `#6366f1` | 50--199 | Contributeur actif |
| Guardian | ⚔️ | Ambre | `#f59e0b` | 200--499 | Membre de confiance de la communaute |
| Sentinel | 🛡️ | Rose | `#f43f5e` | 500+ | Champion d'elite de la securite |

### Code source

```typescript
export const LEVELS: Level[] = [
  { label: 'Watcher',  emoji: '👁',  color: '#6b7280', min: 0,   next: 50  },
  { label: 'Reporter', emoji: '📡',  color: '#6366f1', min: 50,  next: 200 },
  { label: 'Guardian', emoji: '⚔️',  color: '#f59e0b', min: 200, next: 500 },
  { label: 'Sentinel', emoji: '🛡️', color: '#f43f5e', min: 500, next: Infinity },
];

export function computeScore(
  pinsCount: number,
  alertsCount: number,
  confirmedVotes: number,
  commentsMade: number,
): number {
  return pinsCount * 10 + alertsCount * 15 + confirmedVotes * 5 + commentsMade * 2;
}
```

Le niveau de confiance est affiche sur le profil de l'utilisateur et visible par les autres utilisateurs sous forme de badge.

---

## 14. Badges d'expertise

**Fichier :** `src/lib/expertise.ts`

Cinq badges de profil calcules automatiquement en fonction des habitudes de contribution :

| Badge | Emoji | Couleur | Hex | Criteres |
|---|---|---|---|---|
| Night Owl | 🦉 | Indigo | `#6366f1` | 40 %+ des signalements deposes entre 22 h 00 et 05 h 00 (min. 5 signalements) |
| Transit Guardian | 🚇 | Ciel | `#0ea5e9` | 40 %+ des signalements en environnement metro/bus (min. 5 signalements) |
| First Responder | 🚨 | Rouge | `#ef4444` | 2+ alertes d'urgence deposees |
| Neighborhood Expert | 🏘️ | Ambre | `#f59e0b` | Grappe de 3+ signalements dans un rayon de 500 m |
| Verified Guardian | ✅ | Vert | `#10b981` | Identite verifiee ET niveau Guardian ou Sentinel |

Les badges se mettent a jour automatiquement en fonction de l'activite de l'utilisateur. Ils sont affiches sur le profil et visibles par les autres utilisateurs.

### Logique de calcul

```typescript
// Night Owl: >= 40% des signalements deposes apres 22:00 ou avant 05:00 (min 5 signalements)
// Transit Guardian: >= 40% des signalements en environnement metro/bus (min 5 signalements)
// First Responder: >= 2 alertes d'urgence deposees
// Neighborhood Expert: un signalement a >= 2 autres signalements dans un rayon de 500m
// Verified Guardian: identite verifiee + niveau Guardian ou Sentinel
```

---

## 15. Jalons

**Fichier :** `src/lib/milestones.ts`

11 accomplissements a vie avec notifications toast animees au deblocage :

| Cle | Libelle | Emoji | Description | Declencheur |
|---|---|---|---|---|
| `first_pin` | Premier signalement | 📍 | Vous avez cree votre premier signalement de securite | `pins >= 1` |
| `10_pins` | Oeil vigilant | 👁 | Vous avez cree 10 signalements de securite | `pins >= 10` |
| `first_sos` | Premiere alerte | 🆘 | Vous avez declenche votre premiere alerte d'urgence | `alerts >= 1` |
| `first_vote` | Voix de la communaute | 👍 | Vous avez confirme votre premier signalement | `votes >= 1` |
| `10_votes` | Verificateur de confiance | ✅ | Vous avez confirme 10 signalements | `votes >= 10` |
| `first_comment` | Premier commentaire | 💬 | Vous avez laisse votre premier commentaire sur un signalement | `comments >= 1` |
| `first_route` | Eclaireur | 🗺️ | Vous avez sauvegarde votre premier itineraire sur | `routes >= 1` |
| `first_place_note` | Marque-place | 📌 | Vous avez cree votre premiere note de lieu | `placeNotes >= 1` |
| `first_community` | Batisseur de communaute | 👥 | Vous avez rejoint ou cree votre premiere communaute | `communities >= 1` |
| `guardian_level` | Guardian | ⚔️ | Vous avez atteint le niveau de confiance Guardian | `score >= 200` |
| `sentinel_level` | Sentinel | 🛡️ | Vous avez atteint le niveau de confiance Sentinel | `score >= 500` |

### Persistance

- Les jalons atteints sont persistes dans `localStorage`
- Une notification `MilestoneToast` animee s'affiche au deblocage
- Verification via `checkMilestones(stats, achieved)` qui retourne les jalons nouvellement debloques

---

## 16. Defis hebdomadaires

**Composant :** `ChallengesSection.tsx`
**Emplacement :** Mon Brume -> onglet Statistiques

### Defis hebdomadaires par defaut

| Defi | Emoji | Objectif | Recompense |
|---|---|---|---|
| Confirmer 5 signalements | 👍 | 5 votes de confirmation | 50 pts |
| Signaler 3 incidents | 📍 | 3 nouveaux signalements | 75 pts |
| Commenter 3 signalements | 💬 | 3 commentaires sur des signalements | 40 pts |
| Sauvegarder un itineraire sur | 🗺️ | 1 itineraire sauvegarde | 30 pts |

### Fonctionnement

- De nouveaux defis sont **crees automatiquement chaque lundi** si aucun n'existe pour la semaine en cours
- La progression est **calculee automatiquement** a partir de l'activite reelle en base de donnees depuis lundi 00 h 00 (non declarative)
- Les barres de progression affichent le pourcentage d'accomplissement
- Un **bouton "Reclamer"** apparait a la completion -- ajoute les points a `profiles.challenge_points`
- Un compteur de jours restants est affiche dans l'en-tete
- Le total des points accumules est affiche avec une icone de flamme

---

## 17. Systeme de parrainage

**Composant :** `ReferralSection.tsx`
**Emplacement :** Mon Brume -> onglet Statistiques

### Fonctionnement

1. A la premiere consultation, un code unique est genere automatiquement : `Brume-XXXXX` (5 caracteres alphanumeriques aleatoires)
2. Le code est stocke dans `profiles.referral_code`
3. L'utilisateur peut **copier le code** dans le presse-papiers ou le **partager** via l'API Web Share native
4. Format de l'URL de partage : `safepin-pearl.vercel.app/login?ref=Brume-XXXXX`
5. Le nombre de parrainages est suivi dans `profiles.referral_count` et affiche

### Interface

- Bouton de copie avec notification toast de confirmation
- Bouton de partage (utilise l'API Web Share, repli sur le presse-papiers)
- Affichage du nombre de parrainages avec icone utilisateur

---

## 18. Diffusion SOS communautaire

**Composant :** `SosBroadcastPanel.tsx`
**Emplacement :** DetailSheet (pour les signalements d'urgence uniquement)

### Pour les utilisateurs a proximite

Lorsqu'un signalement d'urgence existe a proximite :

- Le panneau affiche le nombre de personnes qui interviennent
- Liste des intervenants avec :
  - Nom d'affichage
  - Statut : "En chemin" ou "Sur place"
  - Distance par rapport a l'incident
- Mises a jour en temps reel via un canal Supabase Realtime

### Actions de reponse

| Bouton | Action |
|---|---|
| "J'arrive" | Cree un enregistrement `sos_responders` avec le statut `on_way` et la position GPS de l'utilisateur |
| "Je suis sur place" | Met a jour le statut a `arrived` |

### Table de la base de donnees

```
sos_responders
  - id (uuid)
  - pin_id (references pins)
  - user_id (references auth.users)
  - status ('on_way' | 'arrived')
  - lat, lng (position de l'intervenant)
  - created_at
```

---

## 19. Itineraires partages

**Composant :** `SavedPanel.tsx` (onglet itineraires)

### Partage d'itineraires

Chaque itineraire sauvegarde dispose d'une bascule de partage :

- **Prive (par defaut) :** Visible uniquement par le createur
- **Public :** Visible par tous les utilisateurs, genere un `share_token` unique

### Votes positifs

Les itineraires publics affichent un badge de votes positifs :

- Les autres utilisateurs peuvent voter positivement pour les itineraires publics qu'ils jugent utiles
- Le compteur de votes positifs est affiche avec une icone pouce en l'air
- Stocke dans la table `route_upvotes`

### Interface

- Bouton bascule de partage (vert lorsque public, gris lorsque prive)
- Badge de compteur de votes positifs (violet, affiche uniquement lorsque l'itineraire est public)
- Bouton de suppression

---

## 20. Jumelage de compagnons de securite

**Composant :** `SafetyBuddySheet.tsx`
**Acces :** Fonctionnalite Pro (encapsulee dans `ProGate`)

### Configuration

1. Selectionner un itineraire sauvegarde
2. Choisir les jours recurrents (bascule lundi--dimanche, lundi--vendredi par defaut)
3. Definir la plage horaire (selecteurs d'heure debut / fin)
4. Sauvegarder le planning -> stocke dans la table `safety_buddies`

### Jumelage

- Affiche les autres utilisateurs ayant le **meme itineraire** et un **planning qui chevauche**
- Affiche les jours communs (ex. : "Lun, Mar, Mer")
- Bouton de chat pour ouvrir un MP avec un compagnon potentiel

---

## 21. Cercle de confiance

**Composant :** `TrustedCircleSection.tsx`
**Emplacement :** Mon Brume -> onglet Statistiques

### Fonctionnalites

- Rechercher des utilisateurs a ajouter comme contacts de confiance
- Envoyer/recevoir des invitations au cercle de confiance
- Accepter/refuser les invitations entrantes
- Liste des contacts de confiance acceptes avec :
  - Indicateur d'etat du partage de position en direct
  - Bascule pour activer/desactiver le partage de position
- Pendant un SOS, tous les contacts de confiance sont automatiquement notifies via l'Edge Function `emergency-dispatch`

### Integration a la carte

- Les membres du cercle de confiance sont visibles sous forme de points bleus sur la carte (couche activable)
- Mises a jour de position en temps reel via Supabase Presence

---

## 22. Notes de lieu

**Composants :** `PlaceNoteSheet.tsx`, `PlaceNotePopup.tsx`
**Emplacement :** Couche de la carte + Favoris Mon Brume

### Creer une note de lieu

- Appui long sur la carte pour deposer une note personnelle
- Champs :
  - **Nom :** Libelle du lieu
  - **Adresse / Note :** Description ou contexte supplementaire
  - **Emoji :** Choix parmi 10 options

### Emojis disponibles

| Emoji | Signification |
|---|---|
| 📌 | Epingle generique |
| 🏠 | Domicile |
| 💼 | Travail |
| 🍽️ | Restaurant |
| ❤️ | Favori |
| 🌳 | Parc / Nature |
| 🔒 | Lieu sur |
| 🚶 | Point de passage |
| ⭐ | Favori etoile |
| ⚠️ | Avertissement |

### Fonctionnalites

- Bascule favori -- les notes favorites apparaissent dans l'onglet Favoris
- Affichees sur la carte en tant que couche de marqueurs personnalises (personnels uniquement)
- Utilisables comme point de depart/destination dans le Planificateur de trajet (boutons "Partir d'ici" / "Y aller")

---

## 23. Notifications

**Composant :** `NotificationsSheet.tsx`

### Notifications dans l'application

Affichees via l'icone de cloche dans la barre superieure avec badge de compteur non lu.

| Type | Declencheur |
|---|---|
| Signalement a proximite | Nouveau signalement dans le rayon d'alerte de l'utilisateur |
| Alerte SOS | Signalement d'urgence a proximite (toujours delivre) |
| Mise a jour d'un signalement suivi | Mise a jour sur un signalement en favoris |
| Jalon debloque | Accomplissement obtenu |
| Defi termine | Defi hebdomadaire accompli |
| Demande de partage de position | Contact de confiance demandant la position |

### Push notifications

- **Web Push API** avec cles VAPID
- Le service worker (`/sw.js`) gere la reception des push en arriere-plan
- **Filtrage geographique :** l'Edge Function `notify-nearby` envoie uniquement aux utilisateurs dans un rayon configurable (1000 m par defaut)

### Parametres de notification

| Parametre | Options |
|---|---|
| Rayon d'alerte | 500 m, 1 km, 2 km, 5 km, 10 km |
| Signalements a proximite | Bascule activer/desactiver |
| Alertes SOS | Toujours actives (impossible a desactiver) |
| Signalements suivis | Bascule activer/desactiver |
| Jalons | Bascule activer/desactiver |
| Heures silencieuses | Selecteurs d'heure de debut / de fin |

---

## 24. Parametres

**Composant :** `SettingsSheet.tsx`

### Sections

| Section | Contenu |
|---|---|
| **Compte** | Nom d'affichage, envoi d'avatar |
| **Notifications** | Rayon d'alerte, bascules par categorie, heures silencieuses |
| **Confidentialite et donnees** | Bascule analytique, bascule rapports de plantage, droits RGPD, suppression du compte |
| **Abonnement** | Plan actuel, gestion via Stripe Portal, carte de mise a niveau, historique des factures |
| **Mentions legales** | Politique de confidentialite, Conditions d'utilisation, Politique des cookies -- ouverture via `window.open()` vers `/privacy`, `/terms`, `/cookies` |
| **Securite** | 2FA (bientot disponible), sessions actives (bientot disponible), deconnexion de tous les appareils |
| **Administration** | Lien vers Tower Control (`/admin`) -- utilisateurs administrateurs uniquement |
| **Langue** | Grille a 2 colonnes avec recherche, 30 langues, noms natifs + drapeaux en emoji, definit le cookie `NEXT_LOCALE` |

### Selecteur de langue

Le selecteur de langue affiche une grille avec recherche de l'ensemble des 30 langues prises en charge. Chaque entree affiche :
- Drapeau en emoji
- Nom de la langue dans sa langue natale (ex. : "Francais", "Deutsch", "Espanol")

La selection d'une langue definit le cookie `NEXT_LOCALE` et recharge l'application dans la langue choisie.

---

## 25. Tableau de bord administrateur (Tower Control)

**Fichier :** `src/app/admin/page.tsx`
**URL :** `/admin`

Interface d'administration a huit onglets pour la gestion de la plateforme.

### Onglets

#### Vue d'ensemble

- Cartes de statistiques : Total des signalements, Signalements actifs, SOS actifs, Total des utilisateurs, Signalements en attente, Sessions en direct
- Tableau des signalements recents avec indicateurs de categorie/gravite/statut

#### Analytique

- Grille de KPI : DAU, WAU, MAU, Nouveaux utilisateurs, Signalements, Taux de resolution, Taux d'engagement, Retention
- Graphiques de repartition horaire (diagrammes en barres SVG personnalises)
- Graphiques de tendance sur 30 jours pour l'activite des signalements et la croissance des utilisateurs

#### Signalements

- Tableau pagine (20 par page)
- Filtre : Tous / Actifs / Resolus / Urgences
- Actions par ligne : Resoudre, Supprimer
- Suppression groupee des signalements selectionnes
- Panneau de detail utilisateur (profil complet, historique des signalements, historique des votes, statistiques de commentaires)

#### Utilisateurs

- Liste complete des utilisateurs avec statistiques de contribution
- Bascule du statut administrateur
- Supprimer un utilisateur
- Panneau de detail utilisateur

#### Rapports

- Signalements soumis par les utilisateurs (spam, faux, offensant, doublon)
- Mise a jour du statut : pending -> reviewed -> resolved
- Supprimer des rapports

#### Parametres

Configuration cle-valeur modifiable en ligne :

| Parametre | Par defaut | Description |
|---|---|---|
| `pin_expiry_hours` | 24 | Nombre d'heures avant l'expiration automatique d'un signalement |
| `sos_expiry_hours` | 2 | Nombre d'heures avant l'expiration automatique d'un signalement SOS |
| `auto_resolve_denies` | 3 | Nombre de votes d'infirmation pour resoudre automatiquement un signalement |
| `max_pins_per_user_day` | 10 | Nombre maximum de signalements qu'un utilisateur peut creer par jour |
| `notify_radius_default` | 1000 | Rayon de notification par defaut en metres |

#### Direct

- Tableau des sessions en direct actives (actualisation automatique toutes les 15 secondes)
- Mettre fin a n'importe quelle session en direct

#### Simulation

- Voir [Moteur de simulation](#29-moteur-de-simulation) ci-dessous

---

## 26. Facturation et abonnements

### Parcours de paiement

```
Parametres -> "Passer a Pro" -> Session Stripe Checkout -> Paiement -> Webhook -> Abonnement actif
```

### Routes API

| Route | Objectif |
|---|---|
| `/api/stripe/checkout` | Cree une session Stripe Checkout (mensuel ou annuel) |
| `/api/stripe/webhook` | Traite les evenements webhook Stripe |
| `/api/stripe/portal` | Ouvre le portail client Stripe |

### Evenements webhook traites

| Evenement | Action |
|---|---|
| `checkout.session.completed` | Active l'abonnement en base de donnees |
| `invoice.paid` | Met a jour l'abonnement, sauvegarde l'enregistrement de facture |
| `invoice.payment_failed` | Marque le statut de l'abonnement en consequence |
| `customer.subscription.updated` | Synchronise les changements de plan |
| `customer.subscription.deleted` | Marque l'abonnement comme annule |

### Tarification

| Plan | Prix | Economie |
|---|---|---|
| Mensuel | 4,99 EUR/mois | -- |
| Annuel | 39,99 EUR/an | Economisez 33 % |

### Portail de facturation

Le bouton "Gerer l'abonnement" dans les Parametres ouvre le portail client Stripe pour :

- Changement de plan (mensuel <-> annuel)
- Annulation
- Mise a jour du moyen de paiement
- Historique des factures

### Detection du statut Pro

```typescript
// Le hook useIsPro verifie la table subscriptions
// Resultat mis en cache dans localStorage (cle : kova_is_pro)
// Le composant ProGate encapsule les fonctionnalites Pro -- affiche une superposition floue de mise a niveau pour les utilisateurs gratuits
```

### Fonctionnalites reservees aux abonnes Pro

| Fonctionnalite | Section |
|---|---|
| Couche Historique de position | Carte de securite |
| Couche Scores de quartier | Carte de securite |
| Jumelage de compagnons de securite | Compagnon de securite |
| Visualiseur d'historique de position | Profil Mon Brume |

---

## 27. PWA et mode hors-ligne

### Progressive Web App

- Entierement installable via "Ajouter a l'ecran d'accueil"
- Le composant `InstallPrompt` detecte l'evenement d'installation et affiche une banniere
- `manifest.json` pour les metadonnees PWA (nom, icones, couleur du theme)
- Service worker (`/sw.js`) pour les push notifications et la mise en cache

### File d'attente hors-ligne

- Lorsque le reseau est indisponible, les nouveaux signalements sont sauvegardes dans **IndexedDB**
- Le composant `OfflineBanner` affiche l'etat de la connexion
- Le service worker effectue une **synchronisation en arriere-plan** a la reconnexion
- Les signalements en attente sont envoyes automatiquement au retour en ligne

### Push notifications

- **Web Push API** avec cles VAPID
- `PushOptInModal` invite les utilisateurs a activer les notifications
- Les notifications sont delivrees meme lorsque l'application est fermee

---

## 28. Internationalisation

**Framework :** next-intl v4

### Langues prises en charge (30)

| Code | Langue | Nom natif |
|---|---|---|
| `en` | Anglais | English |
| `fr` | Francais | Francais |
| `es` | Espagnol | Espanol |
| `zh` | Chinois | 中文 |
| `ar` | Arabe | العربية |
| `hi` | Hindi | हिन्दी |
| `pt` | Portugais | Portugues |
| `bn` | Bengali | বাংলা |
| `ru` | Russe | Русский |
| `ja` | Japonais | 日本語 |
| `de` | Allemand | Deutsch |
| `ko` | Coreen | 한국어 |
| `it` | Italien | Italiano |
| `tr` | Turc | Turkce |
| `vi` | Vietnamien | Tieng Viet |
| `pl` | Polonais | Polski |
| `nl` | Neerlandais | Nederlands |
| `th` | Thai | ไทย |
| `sv` | Suedois | Svenska |
| `ro` | Roumain | Romana |
| `cs` | Tcheque | Cestina |
| `el` | Grec | Ελληνικα |
| `hu` | Hongrois | Magyar |
| `da` | Danois | Dansk |
| `fi` | Finnois | Suomi |
| `no` | Norvegien | Norsk |
| `he` | Hebreu | עברית |
| `id` | Indonesien | Bahasa Indonesia |
| `ms` | Malais | Bahasa Melayu |
| `uk` | Ukrainien | Українська |

### Implementation

- Fichiers de messages : `src/messages/{locale}.json` (un par langue)
- Espaces de noms principaux traduits : `common` (13 cles), `nav` (4 cles), `emergency` (13 cles)
- Tous les autres espaces de noms se replient sur l'anglais via `deepMerge` dans `src/i18n/request.ts`
- Detection de la langue par cookie (`NEXT_LOCALE`)
- Le proxy dans `src/proxy.ts` gere la detection de la langue depuis l'en-tete `Accept-Language` et redirige les chemins `/{locale}/*`
- Selecteur de langue : grille a 2 colonnes avec recherche, noms natifs et drapeaux en emoji

### Espaces de noms

| Espace de noms | Description |
|---|---|
| `common` | Libelles d'interface partages (boutons, actions, statuts) |
| `nav` | Onglets de navigation inferieure |
| `emergency` | Chaines du systeme SOS |
| `report` | Parcours de signalement d'incidents |
| `detail` | Fiche de detail d'un signalement |
| `filters` | Barre de filtres et options de filtrage |
| `layers` | Noms des couches de la carte |
| `trip` | Planificateur d'itineraire et trajet actif |
| `settings` | Page des parametres |
| `notifications` | Types et messages de notification |
| `mykova` | Espace Mon Brume |
| `community` | Communaute, groupes, quartiers |
| `offline` | Messages du mode hors-ligne |
| `moderation` | Signalement et moderation |
| `safeSpaces` | Fonctionnalite des lieux surs |
| `install` | Invites d'installation PWA |

---

## 29. Moteur de simulation

**Onglet admin :** Simulation (dans Tower Control)
**Edge Functions :** `seed-paris`, `simulate-activity`
**Client admin :** `src/lib/supabase-admin.ts` (`createAdminClient()`)

### Objectif

Generer des donnees fictives realistes pour :

- Demonstrations produit et presentations aux investisseurs
- Tests de charge
- Tests UI/UX avec des cartes peuplees
- Captures d'ecran d'integration

### Capacites

| Fonctionnalite | Description |
|---|---|
| Seed Paris | Generer 200+ faux utilisateurs et 500+ signalements concentres autour des points chauds parisiens |
| Simulation en direct | Creation automatique de signalements, votes et commentaires a intervalles configurables |
| Bascule carte | Bascule reservee aux administrateurs pour afficher/masquer les donnees simulees sur la carte |
| Nettoyage | Suppression en un clic de toutes les donnees simulees |

### Distribution de la simulation en direct

| Action | Probabilite |
|---|---|
| Nouveau signalement | 60 % |
| Vote sur un signalement existant | 25 % |
| Commentaire sur un signalement existant | 15 % |

### Isolation des donnees

- Toutes les donnees simulees sont marquees avec `is_simulated = true`
- La requete de la carte filtre les donnees simulees par defaut
- L'administrateur peut basculer la visibilite dans le LayerPanel
- Le nettoyage supprime uniquement les enregistrements `is_simulated = true`

### Configuration

- Intervalle de tick : Configurable (frequence a laquelle la simulation cree une nouvelle action)
- Points chauds parisiens : Coordonnees predefinies pour une distribution geographique realiste

Pour des instructions d'utilisation detaillees, consultez le [Guide du moteur de simulation](../SIMULATION_ENGINE_GUIDE.md).

---

## 30. Verification d'identite

**Composant :** `VerificationView.tsx`
**Fournisseur :** Veriff

### Parcours de verification

```
Parametres -> Verifier l'identite -> Appel API a /api/verify/start
   -> Session Veriff creee -> L'utilisateur est redirige vers l'interface Veriff
   -> L'utilisateur termine la verification -> Webhook a /api/verify/webhook
   -> Table profiles mise a jour (verification_status, verification_id, verified)
```

### Routes API

| Route | Objectif |
|---|---|
| `/api/verify/start` | Cree une nouvelle session de verification Veriff |
| `/api/verify/webhook` | Recoit les callbacks de decision Veriff |

### Etats de verification

| Statut | Description |
|---|---|
| `unverified` | Etat par defaut, aucune verification tentee |
| `pending` | Session de verification demarree, en attente du resultat |
| `approved` | Identite verifiee avec succes |
| `declined` | Verification echouee |
| `resubmission_requested` | Informations supplementaires necessaires, l'utilisateur peut reessayer |

### Champs en base de donnees

| Colonne | Table | Type | Description |
|---|---|---|---|
| `verification_status` | `profiles` | text | Statut actuel de la verification |
| `verification_id` | `profiles` | text | Identifiant de session Veriff |
| `verified` | `profiles` | boolean | Indicateur rapide pour les utilisateurs verifies |

### Securite

- Verification de la signature du webhook (fail-closed : les signatures absentes ou invalides sont rejetees)
- Le badge de verification est affiche sur le profil de l'utilisateur dans toute l'application
- Alimente le systeme de Badges d'expertise ("Verified Guardian" necessite `verified = true`)

---

## 31. Pages juridiques

Trois pages juridiques completes servies en tant que routes autonomes :

### Routes

| Route | Page | Description |
|---|---|---|
| `/privacy` | Politique de confidentialite | Politique de confidentialite conforme au RGPD |
| `/terms` | Conditions d'utilisation | Conditions generales de la plateforme |
| `/cookies` | Politique des cookies | Divulgation sur les cookies et le stockage local |

### Politique de confidentialite (`/privacy`)

11 sections couvrant :

1. Informations que nous collectons
2. Comment nous utilisons vos informations
3. Partage et divulgation des informations
4. Conservation des donnees
5. Vos droits (RGPD)
6. Securite des donnees
7. Confidentialite des enfants
8. Transferts internationaux de donnees
9. Modifications de cette politique
10. Services tiers
11. Coordonnees

### Conditions d'utilisation (`/terms`)

14 sections couvrant :

1. Acceptation des conditions
2. Description du service
3. Comptes utilisateurs
4. Utilisation acceptable
5. Contenu et conduite
6. Abonnements et paiements
7. Avertissement concernant les services d'urgence
8. Propriete intellectuelle
9. Limitation de responsabilite
10. Indemnisation
11. Resiliation
12. Droit applicable
13. Modifications des conditions
14. Coordonnees

### Politique des cookies (`/cookies`)

7 sections couvrant :

1. Qu'est-ce qu'un cookie
2. Cookies que nous utilisons (tableau de tous les cookies avec nom, finalite, duree)
3. Utilisation du stockage local
4. Cookies tiers
5. Gestion des cookies
6. Modifications de cette politique
7. Coordonnees

### Acces

- Accessibles depuis Parametres -> section Mentions legales via `window.open()`
- Egalement liees depuis le pied de page de la Page d'accueil
- Societe : DBEK, Paris, France
- Contact : brumeapp@pm.me

---

## 32. Page d'accueil

**Fichier :** `src/app/login/page.tsx`

Page d'accueil complete repensee, servant a la fois de page marketing et de point d'entree pour l'authentification.

### Structure de la page

#### Barre de navigation

- Logo et nom de marque Brume
- Liens de navigation

#### Section hero

- Grand titre avec texte en degrade
- Sous-titre descriptif sur la mission de la plateforme
- Bouton d'appel a l'action principal

#### Barre de statistiques

| Statistique | Valeur |
|---|---|
| Signalements | 10K+ |
| Langues | 30 |
| Surveillance | 24/7 |
| Prix | 100 % gratuit |

#### Carte d'authentification

4 methodes d'authentification :

| Methode | Description |
|---|---|
| Google OAuth | Se connecter avec un compte Google |
| Apple Sign-In | Se connecter avec un identifiant Apple |
| Magic Link | Lien de connexion sans mot de passe par e-mail |
| E-mail + Mot de passe | Identifiants classiques |

Interface a onglets avec 3 onglets :

| Onglet | Objectif |
|---|---|
| Magic Link | Saisir un e-mail, recevoir un lien de connexion |
| Inscription | Creer un nouveau compte avec e-mail + mot de passe |
| Connexion | Se connecter avec un e-mail + mot de passe existants |

#### Grille des fonctionnalites

6 cartes de fonctionnalites avec icones mettant en valeur les capacites principales :

1. Carte de securite en temps reel
2. Signalement d'incidents
3. Systeme d'urgence SOS
4. Planification d'itineraires surs
5. Engagement communautaire
6. Compagnon Walk With Me

#### Preuve sociale

- Section de citation avec temoignage utilisateur ou declaration de mission

#### Pied de page

- Liens juridiques : Politique de confidentialite, Conditions d'utilisation, Politique des cookies
- Les liens ouvrent les pages juridiques a `/privacy`, `/terms`, `/cookies`
- Informations sur la societe

---

## 33. Lieux sûrs partenaires

**Composant :** `SafeSpaceDetailSheet.tsx`
**Onglet admin :** Lieux sûrs (dans Tower Control)

### Niveaux partenaires

| Niveau | Couleur carte | Avantages |
|---|---|---|
| Standard | Vert | Marqueur de lieu sûr classique |
| Partenaire basique | Bleu | Badge vérifié, coordonnées affichées |
| Partenaire premium | Or | Marqueur mis en avant, profil complet (horaires, photos, description, site web) |

### Champs partenaires

- Adresse, téléphone, nom du contact
- Description et URL du site web
- Galerie de photos (URLs multiples)
- Horaires d'ouverture (planning par jour)
- Niveau partenaire (basique / premium)
- Date de partenariat

### Interface d'administration

- Onglet dédié "Lieux sûrs" dans Tower Control
- Opérations CRUD pour les lieux sûrs partenaires
- Bascule statut partenaire et niveau
- Ajout/modification des horaires et photos

### Intégration cartographique

- Style Mapbox piloté par les données pour différencier les niveaux partenaires
- Marqueurs or pour les premium, bleu pour les basiques, vert pour les standards
- Cliquer sur un lieu sûr pour ouvrir la fiche détaillée en bottom sheet
- Système de votes positifs pour la validation communautaire

---

## 34. Séries quotidiennes

**Fichier :** `src/lib/streaks.ts`
**Store :** `useStore.ts` (currentStreak, longestStreak, setStreakInfo)

### Fonctionnement des séries

- Chaque jour où vous ouvrez Brume et effectuez une action, votre série s'incrémente
- Manquer un jour remet la série à 0
- La plus longue série est suivie séparément

### Jalons de séries

| Jours | Emoji | Récompense |
|---|---|---|
| 3 | 🔥 | Toast "Bien parti" |
| 7 | ⚡ | Toast "Guerrier de la semaine" |
| 14 | 💪 | Toast "Champion de la quinzaine" |
| 30 | 🏆 | Toast "Gardien mensuel" |
| 60 | 👑 | Toast "Sentinelle des 60 jours" |
| 100 | 💎 | Toast "Protecteur centenaire" |

### Événements d'engagement

Toutes les actions utilisateur sont journalisées dans la table `engagement_events` :
- signup, login, pin_created, vote_cast, comment_posted, route_planned, sos_triggered, verification_started, verification_completed, streak_milestone

### Incitation à la vérification

- Les utilisateurs non vérifiés voient une bannière incitative 2 à 7 jours après l'inscription
- La bannière apparaît dans le composant VerificationView
- Masquable et non bloquante

---

## 35. Itinéraires en transport

**Fichier :** `src/lib/transit.ts`
**Composant :** `TripView.tsx` (mode transport)

### Intégration des transports publics parisiens

Utilise l'API IDFM (Île-de-France Mobilités) Navitia pour le calcul d'itinéraires en transport en commun en temps réel à Paris.

### Modes pris en charge

| Mode | Icône | Description |
|---|---|---|
| Métro | 🚇 | Lignes de métro parisien |
| RER | 🚆 | Réseau express régional |
| Bus | 🚌 | Lignes de bus |
| Tramway | 🚊 | Lignes de tramway |
| Marche | 🚶 | Segments de correspondance |

### Interface du trajet

- Décomposition étape par étape du trajet avec badges de ligne
- Nombre de correspondances et durée totale
- Heures de départ/arrivée pour chaque segment
- Code couleur par ligne de transport
- Formatage de la durée : "25 min" ou "1h 05"

### Repli

Lorsqu'aucune clé API IDFM n'est configurée, génère un itinéraire synthétique marche→métro→marche à des fins de développement/démonstration.

---

## Resume de l'architecture

### Pile technologique

| Couche | Technologie |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript |
| Style | Tailwind CSS |
| Cartographie | Mapbox GL JS |
| Base de donnees | Supabase (PostgreSQL) |
| Authentification | Supabase Auth (Google, Apple, Magic Link, E-mail) |
| Temps reel | Supabase Realtime (Postgres Changes, Presence, Broadcast) |
| Stockage | Supabase Storage |
| Edge Functions | Supabase Edge Functions (Deno) |
| Video/Audio | LiveKit (WebRTC) |
| Paiements | Stripe (Checkout, Webhooks, Customer Portal) |
| Identite | Veriff |
| Moteur de routage | OSRM |
| Geocodage | Mapbox Geocoding API |
| Donnees POI | Overpass API (OpenStreetMap) |
| Transports en commun | API IDFM Navitia (Ile-de-France Mobilites) |
| Internationalisation | next-intl v4 |
| PWA | Service Worker, Web Push API, IndexedDB |
| Hebergement | Vercel |

### Tables de la base de donnees (principales)

| Table | Fonction |
|---|---|
| `pins` | Signalements d'incidents de securite |
| `votes` | Votes de confirmation/infirmation sur les signalements |
| `comments` | Commentaires sur les signalements |
| `profiles` | Profils utilisateurs, scores de confiance, codes de parrainage |
| `friendships` | Liens d'amitie |
| `dm_conversations` | Fils de messages directs |
| `direct_messages` | Messages directs individuels |
| `communities` | Communautes, groupes et quartiers |
| `community_members` | Adhesions aux communautes |
| `community_messages` | Messages de chat des communautes |
| `walk_sessions` | Sessions Walk With Me |
| `live_sessions` | Sessions de diffusion LiveKit |
| `saved_routes` | Itineraires surs sauvegardes |
| `route_upvotes` | Votes positifs sur les itineraires partages |
| `safety_buddies` | Plannings de jumelage de compagnons de securite |
| `trusted_contacts` | Relations du cercle de confiance |
| `place_notes` | Marque-pages personnels de lieux |
| `notifications` | Notifications dans l'application |
| `push_subscriptions` | Points de terminaison d'abonnement Web Push |
| `sos_responders` | Intervenants de la diffusion SOS |
| `audio_checkins` | Enregistrements de memos vocaux |
| `trip_log` | Historique des trajets effectues |
| `location_history` | Donnees de trace GPS |
| `subscriptions` | Enregistrements d'abonnements Stripe |
| `invoices` | Enregistrements de factures Stripe |
| `weekly_challenges` | Definitions et progression des defis hebdomadaires |
| `reports` | Signalements soumis par les utilisateurs |
| `admin_parameters` | Parametres de la plateforme configurables par l'administrateur |
| `engagement_events` | Journal des actions utilisateur pour le suivi des series et de l'engagement |
| `challenges` | Definitions des defis (quotidiens et hebdomadaires) |
| `user_challenges` | Progression et accomplissement des defis par utilisateur |

### Edge Functions

| Fonction | Objectif |
|---|---|
| `emergency-dispatch` | Notifie les contacts de confiance pendant un SOS |
| `notify-nearby` | Push notifications geo-filtrees pour les nouveaux signalements |
| `seed-paris` | Genere des donnees simulees sur Paris |
| `simulate-activity` | Tick de simulation en direct (cree des signalements/votes/commentaires) |

---

*Brume -- Securite urbaine portee par la communaute.*
*Societe : DBEK, Paris, France*
*Contact : brumeapp@pm.me*
