# BREVEIL — MASTER INTEGRATION GUIDE
# Règle unique : chaque fichier = un composant = coller et remplacer.
# Aucune décision à prendre. Le code est complet.

---

## RÈGLE THÈME — À APPLIQUER PARTOUT

Chaque composant reçoit `isDark: boolean` en prop.
Ne jamais hardcoder de couleur. Toujours :

```typescript
// ✅ CORRECT
color: isDark ? '#FFFFFF' : '#0F172A'
background: isDark ? '#1E293B' : '#FFFFFF'

// ❌ INTERDIT
color: '#FFFFFF'          // hardcodé dark
background: '#1E293B'     // hardcodé dark
```

Palette complète :
```typescript
const C = {
  bg:      isDark ? '#0A0F1E'                        : '#F0F4F8',
  card:    isDark ? '#1E293B'                        : '#FFFFFF',
  el:      isDark ? '#243050'                        : '#F1F5F9',
  t1:      isDark ? '#FFFFFF'                        : '#0F172A',
  t2:      isDark ? '#94A3B8'                        : '#475569',
  t3:      isDark ? '#64748B'                        : '#94A3B8',
  border:  isDark ? 'rgba(255,255,255,0.08)'         : 'rgba(15,23,42,0.08)',
  borderS: isDark ? 'rgba(255,255,255,0.15)'         : 'rgba(15,23,42,0.16)',
  // Accents — identiques dark/light
  cyan:    '#3BB4C1',
  gold:    '#F5C341',
  green:   '#34D399',
  red:     '#EF4444',
  purple:  '#A78BFA',
}
```

---

## INVENTAIRE DES ÉCRANS — 6 FICHIERS À CRÉER

| # | Fichier | Remplace | État actuel |
|---|---|---|---|
| 1 | `EscorteNotifying.tsx` | renderEscorteNotifying() dans EscorteSheet | Trop grand, vide |
| 2 | `TripForm.tsx` | renderTripForm() STATE A+C dans EscorteSheet | Sheet trop haut |
| 3 | `TripHUD.tsx` | renderTripActive() — monter dans map/page.tsx | Absent |
| 4 | `TripFormDeparture.tsx` | renderTripForm() STATE B dans EscorteSheet | Incomplet |
| 5 | `EscorteLive.tsx` | renderEscorteLive() dans EscorteSheet | Dark hardcodé |
| 6 | `ArrivedView.tsx` | renderArrived() dans EscorteSheet | Dark hardcodé |

---

## INSTRUCTIONS D'INTÉGRATION — UNE PAR FICHIER

### Règle générale pour chaque fichier :

```
1. Lire le fichier screen/NomEcran.tsx
2. Dans EscorteSheet.tsx, trouver la fonction render correspondante
3. Remplacer le return de cette fonction par le JSX du fichier
4. Ajouter les imports manquants en haut du fichier
5. npx tsc --noEmit → corriger les erreurs de type uniquement
```

### Pour TripHUD.tsx uniquement (différent — composant externe) :
```
1. Copier src/screens/TripHUD.tsx vers src/components/TripHUD.tsx
2. Dans map/page.tsx, ajouter import { TripHUD } from '@/components/TripHUD'
3. Dans le JSX de map/page.tsx, dans le container relatif de la map,
   AVANT le BottomNav, ajouter : <TripHUD isDark={isDark} />
4. Dans EscorteSheet.tsx : const renderTripActive = () => null
5. Dans SHEET_HEIGHTS : 'trip-active': '0px'
```

### SHEET_HEIGHTS à mettre à jour (EscorteSheet.tsx ~ligne 194) :
```typescript
const SHEET_HEIGHTS: Record<string, string> = {
  'hub':               '52vh',
  'escorte-intro':     '60vh',
  'escorte-notifying': '52vh',   // ← réduit
  'escorte-live':      '72vh',
  'trip-form':         '46vh',   // ← réduit, laisse la route visible
  'trip-active':       '0px',    // ← zéro, TripHUD externe prend le relais
  'arrived':           '68vh',
}
```

---

## APRÈS CHAQUE ÉCRAN

```
□ Hot reload → vérifier visuellement
□ Tester dark ET light (toggle)
□ npx tsc --noEmit — 0 erreurs
□ Passer à l'écran suivant
```
