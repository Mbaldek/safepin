# Breveil Integration — Master Plan

> **4 Phases** — Exécuter dans l'ordre avec Claude Code
> **Temps total**: 6-8 heures
> **Date**: Mars 2026

---

## 🗂️ Fichiers fournis

| Fichier | Usage |
|---------|-------|
| `00-MASTER-PLAN.md` | Ce document — ton guide |
| `01-BRAND-SYSTEM.md` | Prompt Phase 1 → coller dans Claude Code |
| `02-UI-COMPONENTS.md` | Prompt Phase 2 → coller dans Claude Code |
| `03-ONBOARDING.md` | Prompt Phase 3 → coller dans Claude Code |
| `04-INCIDENT-SYSTEM.md` | Prompt Phase 4 → coller dans Claude Code |
| `05-MIGRATION-SQL.sql` | SQL → exécuter dans Supabase AVANT Phase 4 |

---

## 📋 Séquence d'exécution

### Phase 1: Brand System (30 min)
**Fichier**: `prompts/01-BRAND-SYSTEM.md`

| Step | Action | Vérification |
|------|--------|--------------|
| 1.1 | Copier prompt dans Claude Code | - |
| 1.2 | Laisser Claude modifier globals.css | ✅ App render OK |
| 1.3 | Créer tokens.ts | ✅ Import sans erreur |
| 1.4 | Test visuel | ✅ Couleurs correctes |

---

### Phase 2: UI Components (45 min)
**Fichier**: `prompts/02-UI-COMPONENTS.md`

| Step | Action | Vérification |
|------|--------|--------------|
| 2.1 | Copier prompt dans Claude Code | - |
| 2.2 | Créer dossier components/ui | ✅ Fichiers créés |
| 2.3 | Créer chaque composant | ✅ Types OK |
| 2.4 | Test import | ✅ Pas d'erreur |

---

### Phase 3: Onboarding (1h)
**Fichier**: `prompts/03-ONBOARDING.md`

| Step | Action | Vérification |
|------|--------|--------------|
| 3.1 | Copier prompt dans Claude Code | - |
| 3.2 | Refactor OnboardingFunnelV2 | ✅ 5 steps OK |
| 3.3 | Intégrer nouveaux composants UI | ✅ Style Breveil |
| 3.4 | Tester flow complet | ✅ Fonctionne |

---

### Phase 4: Incident System (3-4h)
**Fichier**: `prompts/04-INCIDENT-SYSTEM.md`

| Step | Action | Vérification |
|------|--------|--------------|
| 4.1 | Appliquer migration SQL | ✅ Colonnes créées |
| 4.2 | Update types/index.ts | ✅ Types compilent |
| 4.3 | Update store | ✅ State OK |
| 4.4 | Map pins system | ✅ Pins dynamiques |
| 4.5 | ReportSheet redesign | ✅ Chips + transport |
| 4.6 | DetailSheet redesign | ✅ Expand/collapse |
| 4.7 | ConfirmFlowModal | ✅ Modal fonctionne |
| 4.8 | Wire everything | ✅ Flow complet |
| 4.9 | i18n | ✅ FR/EN OK |

---

## 🚀 Comment utiliser

### 1. Ouvre VS Code avec Claude Code

### 2. Pour chaque phase:
```
1. Ouvre le fichier prompt correspondant
2. Copie TOUT le contenu
3. Colle dans Claude Code
4. Laisse Claude exécuter
5. Vérifie les checkpoints
6. Passe à la phase suivante
```

### 3. Pour la migration SQL (Phase 4):
```
1. Ouvre Supabase Dashboard → SQL Editor
2. Copie le contenu de migrations/20260303_incident_v2.sql
3. Exécute
4. OU utilise: supabase db push
```

---

## ⚠️ Ordre important

```
Phase 1 (Brand) 
    ↓
Phase 2 (Components) — dépend de Phase 1
    ↓
Phase 3 (Onboarding) — dépend de Phase 2
    ↓
Phase 4 (Incidents) — dépend de Phase 1, 2
```

**Ne pas sauter de phase !**

---

## 🔧 En cas de problème

### Erreur de compilation
→ Vérifie que la phase précédente est complète

### Erreur Supabase
→ Vérifie que la migration SQL a été appliquée

### Style cassé
→ Vérifie globals.css et les CSS variables

---

## 📝 Notes

- Chaque prompt est **autonome** — il contient tout le contexte nécessaire
- Les prompts sont **longs** — c'est normal, Claude Code gère
- Fais un **commit Git** après chaque phase réussie
- **Teste en local** avant de déployer

---

*Bonne intégration ! 🚀*
