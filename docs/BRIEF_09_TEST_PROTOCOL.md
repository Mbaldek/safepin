# BRIEF 09 — User Test Protocol
### Priority: 🔴 CRITICAL · Est: Not code — preparation

---

## Objective
You're putting this in front of 20+ people. Without structure, you'll get "cool app!" or "I don't get it" — neither is useful. This protocol gives you actionable signal.

---

## Test format

**Type:** Unmoderated remote test (testers do it on their own phone, you collect data)
**Duration:** 15-20 minutes per tester
**Tools needed:** 
- The live app URL (Vercel deploy)
- A Google Form for feedback (template below)
- Optional: Hotjar or PostHog for session recordings

---

## Tester recruitment

**Target profile:** Women 18-35, Paris area, smartphone users
**Recruit from:** Instagram DMs, WhatsApp groups, university groups, friend-of-friend
**Incentive:** Early access + "founding member" badge (costs you nothing, feels exclusive)

**Message template (to send):**
```
Salut ! 👋

Je développe Breveil, une app communautaire de sécurité pour les femmes à Paris. On cherche des testeuses pour essayer la première version avant le lancement.

Ça prend ~15 min. Tu testes l'app sur ton téléphone et tu réponds à un court questionnaire.

En échange : accès early + badge "membre fondatrice" 💛

Intéressée ? Je t'envoie le lien !
```

---

## Test tasks (what testers do)

Send this instruction message with the app link:

```
Bienvenue sur Breveil ! 💛

Testez l'app comme si vous la découvriez pour la première fois. Voici 5 missions (10-15 min) :

1. 📝 INSCRIPTION — Créez votre compte et complétez votre profil
2. 🗺️ CARTE — Explorez la carte autour de vous. Trouvez un incident signalé et consultez ses détails.
3. 📍 SIGNALEMENT — Signalez un incident fictif (n'importe quel type, c'est un test !)
4. 👥 COMMUNAUTÉ — Allez dans l'onglet Communauté. Rejoignez un groupe qui vous parle.
5. 🚶 TRAJET — Planifiez un itinéraire vers un lieu de votre choix.

⚠️ NE testez PAS le bouton SOS (il est fonctionnel et enverra de vraies alertes).

Quand c'est fait, répondez au questionnaire ici : [LIEN GOOGLE FORM]

Merci ! Votre avis compte énormément 💛
```

---

## Feedback questionnaire (Google Form)

### Section 1: Première impression
1. **Note globale** — Quelle est votre première impression de l'app ? (1-5 étoiles)
2. **En un mot** — Décrivez Breveil en un seul mot.
3. **Clarté** — Avez-vous compris l'objectif de l'app dès l'inscription ? (Oui / Plus ou moins / Non)

### Section 2: Inscription & Profil
4. L'inscription était... (Très facile / Facile / Moyenne / Difficile / Très difficile)
5. Quelque chose vous a bloquée ou gênée pendant l'inscription ? (texte libre)

### Section 3: Carte
6. La carte est-elle facile à comprendre au premier coup d'œil ? (1-5)
7. Avez-vous trouvé les incidents signalés facilement ? (Oui / Avec difficulté / Non)
8. Les informations sur un incident sont-elles suffisantes ? (Oui / Il manque quelque chose → quoi ?)

### Section 4: Signalement
9. Signaler un incident était... (Très facile / Facile / Moyen / Difficile / Très difficile)
10. Les catégories d'incident couvrent-elles bien les situations que vous pourriez rencontrer ? (Oui / Il manque → quoi ?)

### Section 5: Communauté
11. L'onglet Communauté est... (Très clair / Clair / Confus / Très confus)
12. Rejoindriez-vous un groupe dans la vraie vie ? (Oui, absolument / Peut-être / Non → pourquoi ?)

### Section 6: Trajet
13. Planifier un itinéraire était... (Très facile / Facile / Moyen / Difficile / Très difficile)
14. La fonctionnalité "Marcher ensemble" vous intéresse-t-elle ? (Oui / Pas sûre / Non)

### Section 7: Global
15. **Utilisation réelle** — Utiliseriez-vous cette app dans votre quotidien ? (Oui, régulièrement / De temps en temps / Non)
16. **Fonctionnalité préférée** — Quelle fonctionnalité vous a le plus plu ? (texte libre)
17. **Manque le plus** — Qu'est-ce qui manque le plus à l'app ? (texte libre)
18. **Recommandation** — Recommanderiez-vous Breveil à une amie ? (1-10, NPS)
19. **Bugs** — Avez-vous rencontré des bugs ou des problèmes techniques ? (texte libre)
20. **Mot de la fin** — Autre chose à nous dire ? (texte libre)

### Section 8: Profil testeuse (optionnel)
21. Âge : (18-24 / 25-30 / 31-35 / 36+)
22. Arrondissement / ville :
23. Utilisez-vous déjà une app de sécurité ? (Oui → laquelle / Non)

---

## Metrics to track (product analytics)

If you have Vercel Analytics or PostHog, track:

| Metric | What it tells you |
|--------|-------------------|
| Onboarding completion rate | % of signups that reach the map |
| Onboarding drop-off screen | Which step loses people |
| Time to first incident report | Is the flow intuitive? |
| Community join rate | Do people find and join groups? |
| Map interaction depth | Do people tap pins? Open filters? |
| Trajet creation rate | Do people try routing? |
| Session duration | Are people exploring or bouncing? |
| SOS page views (NOT triggers) | Curiosity vs. actual need |

Minimum: add `console.log` or simple Supabase event tracking at key moments:
```ts
// Track key events
const trackEvent = async (event: string, data?: any) => {
  await supabase.from('analytics_events').insert({
    user_id: user?.id,
    event,
    data,
    created_at: new Date().toISOString(),
  });
};

// Usage
trackEvent('onboarding_completed');
trackEvent('incident_reported', { type: 'harassment', severity: 'moderate' });
trackEvent('community_joined', { community_id: '...' });
trackEvent('route_created', { mode: 'walk' });
```

Create the analytics table:
```sql
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  event TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Users can insert their own events
CREATE POLICY "Users can insert own events" ON analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only service role can read (for admin dashboard)
CREATE POLICY "Service role reads all" ON analytics_events
  FOR SELECT USING (auth.role() = 'service_role');
```

---

## Timeline

| Day | Action |
|-----|--------|
| Day 1-2 | Ship Briefs 01-04 (minimum viable test) |
| Day 3 | Ship Briefs 05-08 if time, set up Google Form |
| Day 4 | Deploy to Vercel, test yourself end-to-end |
| Day 5 | Send to first 5 testers (friends), catch critical bugs |
| Day 6-7 | Send to remaining 15-20 testers |
| Day 8-9 | Collect responses, analyze |

---

## SOS safety for testing

**CRITICAL:** The SOS button is functional. Testers MUST NOT accidentally trigger it during testing.

Options:
1. **Recommended:** Add a test-mode flag that shows "🧪 Mode test — SOS désactivé" banner and prevents SOS from actually sending alerts
2. **Alternative:** Require a 5-second hold (not just a tap) to start the SOS countdown
3. **Minimum:** Clear warning in test instructions (already included above)

The hold-to-activate approach (option 2) is good UX regardless — implement it permanently.

---

## Verification checklist
- [ ] Google Form created with all 23 questions
- [ ] Test instructions written and ready to send
- [ ] SOS has hold-to-activate safeguard for testing
- [ ] Analytics events table created in Supabase
- [ ] Key events tracked (onboarding, report, join, route)
- [ ] Vercel deploy is stable and accessible
- [ ] You've tested the full flow yourself on mobile
