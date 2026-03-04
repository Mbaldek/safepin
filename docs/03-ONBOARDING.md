# Phase 3: Onboarding Redesign

> Copie ce prompt ENTIER dans Claude Code
> **Prérequis**: Phase 1 + Phase 2 complétées

---

## Context

Je redesign l'onboarding Breveil avec le nouveau brand system. L'onboarding actuel est OnboardingFunnelV2.tsx avec 5 steps. Je veux intégrer les nouveaux composants UI et le style Breveil.

## Task

Refactor `src/components/OnboardingFunnelV2.tsx` avec:

1. **Gradient background** — utiliser `bg-gradient` (var(--gradient-primary))
2. **Nouveaux composants** — Button, Input, SelectionCard, Card de `@/components/ui`
3. **Animations** — slide translateX entre steps, breathe sur logo
4. **5 steps** : Welcome → Profile → Goals → Permissions → Circle

---

## Design Specs

### Step 0: Welcome
- Logo Breveil (Shield icon dans cercle glassmorphism avec animation breathe)
- Tagline: "Tu n'es pas seule."
- 3 value props en cards glassmorphism
- Button "Commencer"

### Step 1: Profile
- Avatar upload (rond avec icône Camera)
- Input floating label pour le nom
- Card pour la ville (Paris hardcoded)
- Buttons: "Continuer" + "Passer"

### Step 2: Goals
- Titre + sous-titre
- 5 SelectionCard avec emoji:
  - 🌙 Rentrer en sécurité
  - 🗺️ Connaître mon quartier
  - 👥 Rejoindre la communauté
  - 💚 Rassurer mes proches
  - 📍 Signaler des incidents
- Multi-select (toggle)

### Step 3: Permissions
- Location card avec Button "Autoriser"
- Notifications card avec Button "Autoriser"
- Privacy note en bas
- Buttons: "Continuer" + "Passer"

### Step 4: Circle
- Input email/phone + Button "Envoyer"
- Liste des invitations envoyées
- Card avec lien de partage + "Copier"
- Buttons: "Terminer" + "Plus tard"

---

## Implementation Notes

### Imports nécessaires
```tsx
import { Button, Input, SelectionCard, Card } from '@/components/ui';
import { springTransition } from '@/lib/tokens';
import { MapPin, Bell, Camera, ChevronRight, Copy, Check, Shield, Map, Users, Heart } from 'lucide-react';
```

### Slide animation
```tsx
<div 
  className="flex h-full transition-transform duration-500 ease-out"
  style={{ transform: `translateX(-${step * 100}%)` }}
>
  {/* Each step is w-full h-full flex-shrink-0 */}
</div>
```

### Progress dots
```tsx
<div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
  {Array.from({ length: 5 }).map((_, i) => (
    <div
      key={i}
      className={`w-2 h-2 rounded-full transition-all ${
        i === step ? 'w-6 bg-white' : 'bg-white/30'
      }`}
    />
  ))}
</div>
```

### handleComplete
```tsx
const handleComplete = async () => {
  await supabase.from('profiles').update({
    display_name: displayName || null,
    avatar_url: avatarUrl,
    city: 'Paris',
    onboarding_goals: selectedGoals,
    onboarding_completed: true,
    onboarding_completed_at: new Date().toISOString(),
  }).eq('id', userId);

  document.cookie = 'ob_done=1;path=/;max-age=31536000';
  localStorage.setItem('brume_onboarding_done', '1');
  onComplete?.();
};
```

---

## Styling Classes

### Container
```tsx
className="fixed inset-0 z-[300] bg-gradient overflow-hidden"
```

### Glass cards
```tsx
className="px-5 py-4 rounded-2xl bg-white/10 backdrop-blur"
```

### Buttons
- Primary: `<Button variant="primary" size="lg" fullWidth>`
- Skip link: `className="w-full py-3 text-white/60 text-sm hover:text-white/80"`

### Text
- h2: `className="text-h2 text-white mb-2"`
- body: `className="text-body-sm text-white/60"`

---

## Checklist

- [ ] Gradient background fonctionne
- [ ] Logo avec animation breathe
- [ ] Slide animation entre steps
- [ ] SelectionCard toggle multi-select
- [ ] Avatar upload vers Supabase Storage
- [ ] Permissions request (location + notifications)
- [ ] Invite form sauvegarde dans pending_invites
- [ ] handleComplete sauvegarde dans profiles
- [ ] Progress dots actifs

---

*Fin Phase 3*
