# BRIEF 03 — Seed Data
### Priority: 🔴 CRITICAL · Est: 1-2 hours

---

## Objective
New testers opening the app will see an empty ghost town — no incidents, no communities, no people. This makes the app feel dead. Seed realistic Paris data so the map and community tabs have life on first open.

---

## Why this matters
20+ testers open the app → see nothing → think "this doesn't work" → uninstall. You get zero useful feedback on actual features. Seed data is not cheating — every successful app does this for testing. Uber had fake drivers, Instagram had pre-populated explore feeds.

---

## 1. Seed Incidents (Supabase SQL)

Insert ~25-30 incidents across Paris arrondissements. Mix of types and severities. All dated within the last 48 hours so they show up in filters.

```sql
-- Run in Supabase SQL Editor
-- Adjust table/column names to match your schema

INSERT INTO incidents (type, severity, latitude, longitude, address, description, created_at, verified_count) VALUES
-- 15ème (user's area based on screenshots)
('poor_lighting', 'mild', 48.8462, 2.2890, 'Rue de Vaugirard, 75015', 'Rue mal éclairée entre Commerce et Félix Faure', NOW() - INTERVAL '2 hours', 3),
('harassment', 'moderate', 48.8428, 2.2835, 'Rue Lecourbe, 75015', 'Harcèlement verbal signalé par 2 utilisatrices', NOW() - INTERVAL '5 hours', 7),
('suspicious', 'mild', 48.8510, 2.2920, 'Quai de Grenelle, 75015', 'Personne suspecte observée à plusieurs reprises', NOW() - INTERVAL '8 hours', 2),

-- 7ème / Tour Eiffel area
('theft', 'moderate', 48.8584, 2.2945, 'Champ de Mars, 75007', 'Vol à l''arraché signalé près du Champ de Mars', NOW() - INTERVAL '3 hours', 12),
('harassment', 'mild', 48.8566, 2.3063, 'Rue Cler, 75007', 'Interpellations insistantes', NOW() - INTERVAL '12 hours', 4),

-- 1er / Châtelet-Les Halles
('aggression', 'danger', 48.8606, 2.3472, 'Les Halles, 75001', 'Altercation physique signalée sortie métro', NOW() - INTERVAL '1 hour', 15),
('theft', 'moderate', 48.8611, 2.3386, 'Rue de Rivoli, 75001', 'Pickpockets actifs zone touristique', NOW() - INTERVAL '4 hours', 9),
('intoxicated', 'mild', 48.8614, 2.3490, 'Fontaine des Innocents, 75001', 'Groupe bruyant en état d''ébriété', NOW() - INTERVAL '6 hours', 5),

-- 10ème / Gare du Nord
('stalking', 'moderate', 48.8809, 2.3553, 'Gare du Nord, 75010', 'Personne suivie dans le couloir du métro', NOW() - INTERVAL '2 hours', 8),
('poor_lighting', 'mild', 48.8764, 2.3595, 'Rue du Faubourg Saint-Denis, 75010', 'Éclairage défaillant sur 200m', NOW() - INTERVAL '18 hours', 6),
('verbal_abuse', 'moderate', 48.8785, 2.3570, 'Bd de Magenta, 75010', 'Insultes sexistes à la sortie du métro', NOW() - INTERVAL '7 hours', 11),

-- 11ème / Bastille-Oberkampf
('harassment', 'mild', 48.8603, 2.3695, 'Rue Oberkampf, 75011', 'Harcèlement de rue tard le soir', NOW() - INTERVAL '10 hours', 4),
('unsafe_road', 'mild', 48.8533, 2.3692, 'Place de la Bastille, 75011', 'Trottoir dangereux côté canal', NOW() - INTERVAL '24 hours', 3),

-- 18ème / Montmartre
('theft', 'moderate', 48.8867, 2.3431, 'Sacré-Cœur, 75018', 'Vol de téléphone par arrachement', NOW() - INTERVAL '5 hours', 14),
('isolated_area', 'mild', 48.8892, 2.3387, 'Rue Lamarck, 75018', 'Zone isolée le soir, escaliers peu fréquentés', NOW() - INTERVAL '30 hours', 2),
('suspicious', 'moderate', 48.8840, 2.3465, 'Place du Tertre, 75018', 'Arnaque signalée par plusieurs utilisateurs', NOW() - INTERVAL '6 hours', 7),

-- 19ème / Parc des Buttes-Chaumont
('poor_lighting', 'moderate', 48.8810, 2.3827, 'Parc des Buttes-Chaumont, 75019', 'Éclairage insuffisant à l''entrée sud', NOW() - INTERVAL '20 hours', 5),

-- 5ème / Latin Quarter
('intoxicated', 'mild', 48.8462, 2.3444, 'Place de la Contrescarpe, 75005', 'Groupe bruyant et agité', NOW() - INTERVAL '9 hours', 3),
('harassment', 'moderate', 48.8498, 2.3454, 'Rue Mouffetard, 75005', 'Harcèlement insistant', NOW() - INTERVAL '4 hours', 6),

-- 13ème
('unsafe_road', 'mild', 48.8296, 2.3561, 'Av d''Italie, 75013', 'Travaux non signalés, trottoir dangereux', NOW() - INTERVAL '36 hours', 2),

-- 8ème / Champs-Élysées
('theft', 'moderate', 48.8698, 2.3076, 'Champs-Élysées, 75008', 'Pickpockets actifs métro Franklin Roosevelt', NOW() - INTERVAL '3 hours', 18),

-- 20ème / Belleville
('aggression', 'moderate', 48.8693, 2.3850, 'Bd de Belleville, 75020', 'Tentative d''agression signalée', NOW() - INTERVAL '6 hours', 9),
('poor_lighting', 'mild', 48.8667, 2.3933, 'Rue de Ménilmontant, 75020', 'Éclairage public en panne', NOW() - INTERVAL '14 hours', 4),

-- 16ème
('stalking', 'mild', 48.8627, 2.2764, 'Trocadéro, 75016', 'Signalement de filature', NOW() - INTERVAL '11 hours', 3),

-- 4ème / Marais
('harassment', 'mild', 48.8566, 2.3593, 'Rue des Rosiers, 75004', 'Remarques déplacées répétées', NOW() - INTERVAL '8 hours', 5);
```

---

## 2. Seed Communities (Supabase SQL)

Create 6-8 starter communities that feel real and active:

```sql
INSERT INTO communities (name, description, type, icon, member_count, latitude, longitude, created_at) VALUES
('Quartier Grenelle', 'Entraide et sécurité dans le 15ème', 'neighbourhood', '🏘️', 234, 48.8462, 2.2890, NOW() - INTERVAL '30 days'),
('Marais Solidaire', 'La communauté du Marais qui veille', 'neighbourhood', '🏛️', 567, 48.8566, 2.3593, NOW() - INTERVAL '45 days'),
('Coureuses de Paris', 'Running sécurisé, de jour comme de nuit', 'group', '🏃‍♀️', 89, 48.8606, 2.3472, NOW() - INTERVAL '20 days'),
('Étudiantes Sorbonne', 'Sécurité et entraide entre étudiantes', 'group', '📚', 412, 48.8462, 2.3444, NOW() - INTERVAL '60 days'),
('Noctambules 10ème', 'Sorties et retours sécurisés', 'group', '🌙', 156, 48.8764, 2.3595, NOW() - INTERVAL '15 days'),
('Mamans du 15ème', 'Sécurité des familles dans le quartier', 'group', '👶', 78, 48.8428, 2.2835, NOW() - INTERVAL '25 days'),
('Voisins Montmartre', 'Vigilance et bienveillance à Montmartre', 'neighbourhood', '🎨', 345, 48.8867, 2.3431, NOW() - INTERVAL '40 days'),
('Safe Walk Buddies', 'Trouver quelqu''un pour rentrer ensemble', 'group', '🤝', 1204, 48.8603, 2.3695, NOW() - INTERVAL '90 days');
```

---

## 3. Seed Safe Spaces

Mark known safe spots on the map (real Paris locations):

```sql
INSERT INTO safe_spaces (name, type, latitude, longitude, description, verified) VALUES
('Commissariat 15ème', 'police', 48.8415, 2.2932, 'Commissariat de police', true),
('Pharmacie Grenelle', 'pharmacy', 48.8472, 2.2878, 'Pharmacie de garde', true),
('Hôpital Necker', 'hospital', 48.8470, 2.3155, 'Urgences 24/7', true),
('Gare Montparnasse', 'station', 48.8421, 2.3210, 'Gare SNCF avec agents de sécurité', true),
('Café Le Dôme', 'refuge', 48.8564, 2.3120, 'Établissement partenaire "lieu sûr"', true),
('Commissariat Châtelet', 'police', 48.8595, 2.3470, 'Commissariat de police', true),
('Pharmacie du Louvre', 'pharmacy', 48.8606, 2.3376, 'Pharmacie ouverte tard', true),
('Hôtel-Dieu', 'hospital', 48.8545, 2.3487, 'Urgences AP-HP', true);
```

---

## 4. Update empty states

Even with seed data, some personal sections will be empty. Make empty states feel intentional:

| Section | Current empty state | New empty state |
|---------|-------------------|-----------------|
| Friends | "No friends yet" + 👥 | "Vos amis apparaîtront ici 💛" + "Invitez vos proches sur Breveil" |
| Trusted Circle | "Add your first safety contact" | "Ajoutez vos premiers proches — ils pourront suivre vos trajets et vous les leurs" |
| Neighbourhoods | "No neighborhoods nearby. Create one!" | "Aucun quartier ici encore — soyez le premier ! 🏘️" |
| Activity | "Nothing here yet" + satellite | "Votre activité apparaîtra ici au fur et à mesure 📍" |
| Nearby (if no incidents) | "No incidents found - All clear in your area" | "Tout est calme autour de vous ☀️ — Bonne nouvelle !" |

---

## Verification checklist
- [ ] Map shows 20+ pins across Paris on first load
- [ ] Community tab shows 6+ joinable communities
- [ ] Safe spaces show on map when layer is enabled
- [ ] Empty states have warm, encouraging French copy
- [ ] Incidents have realistic timestamps (last 48h)
- [ ] Mix of severity levels visible in filters
