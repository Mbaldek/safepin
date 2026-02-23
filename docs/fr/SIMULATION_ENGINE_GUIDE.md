# Moteur de simulation Brume — Guide de démarrage rapide

Le moteur de simulation permet aux administrateurs de peupler Paris avec des données de sécurité fictives réalistes et de lancer des simulations d'activité en direct. Il est conçu pour les démonstrations, les présentations investisseurs, les tests de charge et le développement.

---

## Prérequis

- Vous devez être **administrateur** (`is_admin: true` dans votre profil).
- Vous devez être **connecté**.

---

## Étape 1 : Ouvrir l'onglet Simulation

1. Accédez à `/admin`.
2. Cliquez sur l'onglet **Simulation** (l'icône robot).
3. Vous verrez **4 cartes d'état** en haut de la page :

| Carte | Description |
|-------|-------------|
| **Statut** | Indique si la simulation est en cours ou arrêtée |
| **Utilisateurs simulés** | Nombre total de profils fictifs dans la base de données |
| **Épingles simulées** | Nombre total d'épingles d'incidents fictives dans la base de données |
| **Intervalle de tick** | Fréquence à laquelle la simulation génère de nouvelles activités |

---

## Étape 2 : Peupler Paris avec des données fictives

La fonction de peuplement remplit la base de données avec des utilisateurs simulés et des épingles d'incidents répartis à travers Paris.

### Configuration

- **Champ Utilisateurs** — Nombre de profils fictifs à créer (par défaut : 200)
- **Champ Épingles** — Nombre d'épingles d'incidents fictives à créer (par défaut : 500)

### Comment peupler

1. Définissez le nombre souhaité d'utilisateurs et d'épingles.
2. Cliquez sur **"Seed Paris"**.
3. Attendez la fin de l'opération.

### Ce qui est créé

- **Utilisateurs :** Noms français aléatoires, `is_simulated = true`, dates d'inscription variées.
- **Épingles :** Géographiquement pondérées vers les zones sensibles connues :
  - Châtelet
  - Gare du Nord
  - Barbès
  - République
  - Pigalle
- Environ **10 % des épingles** sont marquées comme urgences.

### Préréglages recommandés

| Scénario | Utilisateurs | Épingles | Cas d'usage |
|----------|-------------|----------|-------------|
| Démo rapide | 50 | 100 | Démonstration rapide ou capture d'écran |
| Démo complète | 200 | 500 | Présentation investisseurs ou démonstration en direct |
| Test de charge | 500 | 2 000 | Tests de performance et de montée en charge |

---

## Étape 3 : Visualiser les données simulées sur la carte

Les épingles simulées sont **masquées par défaut** afin de ne pas polluer la carte de sécurité réelle.

Pour les afficher :

1. Accédez à la **Carte**.
2. Ouvrez le panneau **Calques**.
3. Activez le toggle **"Simulé"**.

> **Remarque :** Le toggle Simulé est réservé aux administrateurs et est stylisé en couleur ambre pour le distinguer clairement des calques de données réelles.

---

## Étape 4 : Simulation en direct

La simulation en direct génère une activité continue à partir des utilisateurs simulés, à un rythme configurable.

### Options d'intervalle de tick

| Intervalle | Cas d'usage |
|------------|-------------|
| **10 secondes** | Démo rapide — activité soutenue pour un impact visuel |
| **30 secondes** | Recommandé — rythme réaliste pour les présentations |
| **1 minute** | Modéré — activité de fond pendant les démos prolongées |
| **5 minutes** | Lent — simulation de fond sur une longue durée |

### Ce qui se passe à chaque tick

À chaque tick, **1 à 3 utilisateurs simulés choisis au hasard** effectuent l'une des actions suivantes :

| Action | Probabilité |
|--------|-------------|
| Créer une nouvelle épingle | 60 % |
| Voter sur une épingle existante | 25 % |
| Commenter une épingle existante | 15 % |

### Journal d'activité

Le journal d'activité affiche les **50 dernières entrées** par ordre chronologique inversé, en indiquant ce que chaque utilisateur simulé a fait et quand.

---

## Étape 5 : Nettoyage

Lorsque vous avez terminé la simulation, vous pouvez supprimer toutes les données fictives.

1. Faites défiler jusqu'à la section **Zone de danger**.
2. Cliquez sur **"Supprimer toutes les données simulées"**.
3. Confirmez l'action.

Le processus de nettoyage supprime d'abord les **épingles** (pour respecter les contraintes de clés étrangères), puis les **profils**.

> **Attention :** Cette action est irréversible. Toutes les épingles, votes, commentaires et profils utilisateurs simulés seront définitivement supprimés.

---

## Référence d'architecture

### Schéma de base de données

| Élément | Description |
|---------|-------------|
| `pins.is_simulated` | Colonne booléenne — `true` pour les épingles simulées |
| `profiles.is_simulated` | Colonne booléenne — `true` pour les utilisateurs simulés |
| `admin_params.simulation_active` | Booléen — indique si la simulation en direct est en cours |
| `idx_pins_is_simulated` | Index de base de données pour le filtrage efficace des épingles simulées |

### Edge Functions

| Fonction | Méthode | Objectif |
|----------|---------|----------|
| `seed-paris` | POST | Crée les utilisateurs et épingles simulés |
| `simulate-activity` | POST | Génère un seul tick d'activité simulée |

Les deux fonctions requièrent une **authentification JWT** dans l'en-tête Authorization.

### Client administrateur

La simulation utilise `createAdminClient()` depuis `src/lib/supabase-admin.ts`. Il s'agit d'un client **réservé au serveur** qui s'authentifie avec la clé service role de Supabase. Il ne doit jamais être exposé côté navigateur.

### Filtre de requête cartographique

La carte exclut les données simulées par défaut grâce au filtre suivant :

```typescript
if (!showSimulated) {
  query = query.or('is_simulated.is.null,is_simulated.eq.false');
}
```

Cela garantit que seules les épingles réelles apparaissent sur la carte, sauf si l'administrateur active explicitement le calque simulé.

### Store

La visibilité du calque simulé est contrôlée par le booléen `showSimulated` dans le store Zustand :

```
src/stores/useStore.ts → showSimulated: boolean
```

---

## Conseils pratiques

- **Commencez petit.** Utilisez le préréglage Démo rapide (50 utilisateurs / 100 épingles) pour vérifier que tout fonctionne avant de monter en charge.
- **Utilisez des ticks de 30 secondes** pour les présentations investisseurs. Cela crée un rythme d'activité naturel, réaliste sans être envahissant.
- **Activez le calque simulé** avant de lancer la simulation en direct afin de voir les épingles apparaître en temps réel sur la carte.
- **Nettoyez avant la mise en production.** Lancez toujours "Supprimer toutes les données simulées" avant que de vrais utilisateurs accèdent à la plateforme.
- **Combinez avec Walk With Me** pour des démonstrations percutantes — peuplez les données, lancez une marche simulée, et montrez comment la carte réagit.

---

## Dépannage

| Problème | Cause | Solution |
|----------|-------|----------|
| Le bouton "Seed Paris" est désactivé | Vous n'êtes pas connecté en tant qu'administrateur | Vérifiez que votre profil a `is_admin: true` |
| Les épingles n'apparaissent pas sur la carte | Le calque simulé est désactivé | Ouvrez le panneau Calques et activez le toggle "Simulé" |
| L'Edge Function renvoie une erreur 401 | JWT invalide ou expiré | Déconnectez-vous puis reconnectez-vous pour rafraîchir votre session |
| Le peuplement est lent | Jeu de données volumineux demandé | Réduisez le nombre d'utilisateurs/épingles ou patientez — les peuplements importants peuvent prendre 30 à 60 secondes |
| Le nettoyage échoue | Contrainte de clé étrangère | Cela ne devrait pas se produire avec l'ordre de nettoyage intégré. Si c'est le cas, relancez le nettoyage |
| Le journal d'activité est vide | La simulation en direct n'a pas été lancée | Cliquez sur le bouton de démarrage et vérifiez que la carte de statut affiche "En cours" |
| Les épingles simulées apparaissent pour les non-administrateurs | Problème d'état du store | Vérifiez que `showSimulated` est à `false` par défaut et que le toggle est masqué pour les non-administrateurs |

---

*Moteur de simulation Brume — Composant de la suite d'administration Brume par DBEK.*
