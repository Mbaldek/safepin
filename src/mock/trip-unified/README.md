# Mock: Architecture Trajet Unifiee

## Objectif
Fusionner les 2 systemes paralleles (Escorte trip + TripView) en un flux unique.

## Fichiers mock
- `useTrip.ts` — Hook unifie (remplace useEscorte.startTrip + TripView local state)
- `ActiveHUD.tsx` — HUD unique (fusionne TripHUD + TripActiveHUD)
- `types.ts` — Types unifies
- `MIGRATION.md` — Plan de migration depuis l'architecture actuelle

## Ce qui ne change PAS
- Escorte immediate (mode SOS) reste dans useEscorte
- Walk With Me reste independant
- TripView planification (multi-route, scoring) reste tel quel
- MapView route rendering reste tel quel

## Ce qui change
- "Demarrer le trajet" dans TripView → appelle useTrip.start() au lieu de logique locale
- useTrip.start() ecrit dans trip_log ET demarre GPS + circle notify (si active)
- Un seul ActiveHUD affiche sur la carte (pas dans le panel TripView)
- SOS wire au vrai systeme (edge function trigger-sos)
