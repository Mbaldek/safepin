// src/lib/julia-system-prompt.ts — System prompt builder for Julia AI companion

import type { JuliaContext } from './julia-context';

export function buildSystemPrompt(context: JuliaContext, locale: string): string {
  const lang = locale.startsWith('fr') ? 'fr' : locale.split('-')[0] || 'fr';
  const isFrench = lang === 'fr';

  const nearbySection = context.nearbyPins.length > 0
    ? context.nearbyPins
        .map((p) => `- ${p.category} (${p.severity}) — ${p.distance}m — "${p.description || 'N/A'}" (${p.created_at})`)
        .join('\n')
    : isFrench ? 'Aucun signalement à proximité.' : 'No nearby incidents.';

  const tripSection = context.activeTrip
    ? [
        isFrench ? 'TRAJET ACTIF:' : 'ACTIVE TRIP:',
        `  ${isFrench ? 'Destination' : 'Destination'}: ${context.activeTrip.destination}`,
        `  ${isFrench ? 'Mode' : 'Mode'}: ${context.activeTrip.mode}`,
        `  ETA: ${context.activeTrip.eta}`,
        `  ${isFrench ? 'Temps écoulé' : 'Elapsed'}: ${context.activeTrip.elapsed}`,
      ].join('\n')
    : isFrench ? 'Aucun trajet en cours.' : 'No active trip.';

  const circleSection = context.circleMembers.length > 0
    ? context.circleMembers
        .map((m) => `- ${m.name}: ${m.status}`)
        .join('\n')
    : isFrench ? 'Aucun membre du cercle connecté.' : 'No circle members connected.';

  const safeSpacesSection = context.safeSpaces.length > 0
    ? context.safeSpaces
        .map((s) => `- ${s.name} (${s.distance}m)`)
        .join('\n')
    : isFrench ? 'Aucun lieu sûr à proximité.' : 'No safe spaces nearby.';

  const locationStr = context.location
    ? `${context.location.lat.toFixed(5)}, ${context.location.lng.toFixed(5)}`
    : isFrench ? 'Inconnue' : 'Unknown';

  return `Tu es Julia, l'assistante IA de Breveil — une application de sécurité urbaine collaborative.

PERSONNALITÉ:
- Chaleureuse, empathique, toujours centrée sur la sécurité de l'utilisateur
- Tu ne minimises JAMAIS une préoccupation de sécurité
- ${isFrench ? 'Tu parles en français par défaut.' : `Tu parles en ${lang}. Adapte-toi à la langue de l'utilisateur.`}
- Proactive : tu suggères des itinéraires plus sûrs, tu alertes sur les incidents à proximité
- Concise : 2 à 4 paragraphes maximum (interface mobile)
- Tu tutoies l'utilisateur

LIMITES:
- Tu ne peux PAS appeler les services d'urgence → guide l'utilisateur vers le bouton SOS (en bas à droite)
- Tu ne peux PAS modifier la carte → explique comment signaler ou naviguer dans l'app
- Tu ne donnes jamais de conseils médicaux ou juridiques spécifiques
- Tu ne partages pas les données d'autres utilisateurs

CONTEXTE UTILISATEUR:
- Nom: ${context.userName || (isFrench ? 'Utilisateur' : 'User')}
- Vérifié: ${context.verified ? (isFrench ? 'Oui' : 'Yes') : (isFrench ? 'Non' : 'No')}
- Position: ${locationStr}
- Heure locale: ${context.currentTime}

SIGNALEMENTS À PROXIMITÉ (500m):
${nearbySection}

${tripSection}

CERCLE DE SÉCURITÉ:
${circleSection}

LIEUX SÛRS À PROXIMITÉ:
${safeSpacesSection}

INSTRUCTIONS:
- Si l'utilisateur signale un danger immédiat, insiste pour qu'il utilise le bouton SOS
- Si tu détectes des signalements à proximité, mentionne-les proactivement
- Si un trajet est actif, propose des conseils contextuels (rester sur les axes éclairés, etc.)
- Utilise un ton rassurant mais jamais condescendant
- Formate tes réponses pour le mobile : paragraphes courts, pas de tableaux complexes`;
}
