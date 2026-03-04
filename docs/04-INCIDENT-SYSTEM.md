# Phase 4: Incident System

> Copie ce prompt ENTIER dans Claude Code
> **Prérequis**: Phase 1 + 2 + 3 complétées + Migration SQL appliquée

---

## Context

J'intègre le nouveau système d'incidents Breveil avec:
- Pins dynamiques (taille/opacity/ripple basés sur confirmations, temps, transport)
- Report flow redesigné avec chips par sévérité
- Detail view hybrid (collapse/expand)
- Confirm flow avec media upload

## Task

Implémenter le système d'incidents complet en plusieurs étapes.

---

## ÉTAPE 4.1: Types et Constants

### Update `src/types/index.ts`

Ajoute ces types et constants:

```typescript
// ════════════════════════════════════════════════════════════════════
// PIN TYPES
// ════════════════════════════════════════════════════════════════════

export interface Pin {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  category: string;
  severity: 'low' | 'med' | 'high';
  description?: string;
  media_url?: string;
  address?: string;
  created_at: string;
  expires_at?: string;
  flag_count: number;
  hidden: boolean;
  // Transport fields
  is_transport: boolean;
  transport_type?: 'metro' | 'rer' | 'bus' | 'tram';
  transport_line?: string;
  // Confirmations
  confirmations: number;
  decay_type: 'people' | 'infra' | 'positive';
}

// ════════════════════════════════════════════════════════════════════
// CATEGORY SYSTEM
// ════════════════════════════════════════════════════════════════════

export const CATEGORY_GROUPS = {
  urgent: {
    id: 'urgent',
    label: 'URGENT',
    color: { text: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
    items: ['assault', 'harassment', 'theft', 'following'],
    decayHours: 24,
  },
  warning: {
    id: 'warning',
    label: 'ATTENTION',
    color: { text: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
    items: ['suspect', 'group', 'unsafe'],
    decayHours: 12,
  },
  infra: {
    id: 'infra',
    label: 'INFRASTRUCTURE',
    color: { text: '#64748B', bg: 'rgba(148,163,184,0.12)' },
    items: ['lighting', 'blocked', 'closed'],
    decayHours: 168, // 7 days
  },
  positive: {
    id: 'positive',
    label: 'POSITIF',
    color: { text: '#34D399', bg: 'rgba(52,211,153,0.12)' },
    items: ['safe', 'help', 'presence'],
    decayHours: 720, // 30 days
  },
} as const;

export type CategoryGroupId = keyof typeof CATEGORY_GROUPS;

export const CATEGORY_DETAILS: Record<string, { 
  emoji: string; 
  label: string; 
  group: CategoryGroupId;
}> = {
  assault: { emoji: '🚨', label: 'Agression', group: 'urgent' },
  harassment: { emoji: '🚫', label: 'Harcèlement', group: 'urgent' },
  theft: { emoji: '👜', label: 'Vol', group: 'urgent' },
  following: { emoji: '👤', label: 'Filature', group: 'urgent' },
  suspect: { emoji: '👁️', label: 'Suspect', group: 'warning' },
  group: { emoji: '👥', label: 'Attroupement', group: 'warning' },
  unsafe: { emoji: '⚠️', label: 'Zone à éviter', group: 'warning' },
  lighting: { emoji: '💡', label: 'Mal éclairé', group: 'infra' },
  blocked: { emoji: '🚧', label: 'Passage difficile', group: 'infra' },
  closed: { emoji: '🚷', label: 'Fermé', group: 'infra' },
  safe: { emoji: '💚', label: 'Lieu sûr', group: 'positive' },
  help: { emoji: '🙋', label: 'Aide reçue', group: 'positive' },
  presence: { emoji: '👮', label: 'Sécurité', group: 'positive' },
};

export const TRANSPORT_TYPES = [
  { id: 'metro', emoji: '🚇', label: 'Métro', placeholder: 'Ligne (4, 11...)' },
  { id: 'rer', emoji: '🚆', label: 'RER', placeholder: 'Ligne (A, B...)' },
  { id: 'bus', emoji: '🚌', label: 'Bus', placeholder: 'N° (72, 91...)' },
  { id: 'tram', emoji: '🚊', label: 'Tram', placeholder: 'Ligne' },
] as const;

// ════════════════════════════════════════════════════════════════════
// TIME DECAY
// ════════════════════════════════════════════════════════════════════

export const DECAY_HOURS: Record<string, number> = {
  // Urgent (people-related, ephemeral)
  assault: 24,
  harassment: 24,
  theft: 24,
  following: 24,
  // Warning (mixed)
  suspect: 12,
  group: 6,
  unsafe: 48,
  // Infrastructure (persistent)
  lighting: 168,
  blocked: 168,
  closed: 168,
  // Positive (stable)
  safe: 720,
  help: 168,
  presence: 720,
};
```

---

## ÉTAPE 4.2: Store Updates

### Update `src/stores/useStore.ts`

Ajoute ces slices au store:

```typescript
// Dans l'interface StoreState, ajoute:

// Detail sheet
isDetailExpanded: boolean;
setDetailExpanded: (expanded: boolean) => void;

// Confirm flow
showConfirmFlow: boolean;
setShowConfirmFlow: (show: boolean) => void;
confirmingPin: Pin | null;
setConfirmingPin: (pin: Pin | null) => void;

// Report flow
reportStep: number;
setReportStep: (step: number) => void;
reportCategory: string | null;
setReportCategory: (cat: string | null) => void;
reportTransport: {
  isTransport: boolean | null;
  type: string | null;
  line: string;
};
setReportTransport: (transport: Partial<StoreState['reportTransport']>) => void;
resetReport: () => void;

// Dans l'implémentation du store:

isDetailExpanded: false,
setDetailExpanded: (expanded) => set({ isDetailExpanded: expanded }),

showConfirmFlow: false,
setShowConfirmFlow: (show) => set({ showConfirmFlow: show }),
confirmingPin: null,
setConfirmingPin: (pin) => set({ confirmingPin: pin }),

reportStep: 1,
setReportStep: (step) => set({ reportStep: step }),
reportCategory: null,
setReportCategory: (cat) => set({ reportCategory: cat }),
reportTransport: { isTransport: null, type: null, line: '' },
setReportTransport: (transport) => set((state) => ({
  reportTransport: { ...state.reportTransport, ...transport }
})),
resetReport: () => set({
  reportStep: 1,
  reportCategory: null,
  reportTransport: { isTransport: null, type: null, line: '' },
}),
```

---

## ÉTAPE 4.3: Pin Helpers

### Crée `src/lib/pin-utils.ts`

```typescript
import { CATEGORY_DETAILS, CATEGORY_GROUPS, DECAY_HOURS } from '@/types';

/**
 * Get pin size based on confirmations count
 */
export function getPinSize(confirmations: number): number {
  if (confirmations >= 10) return 28;
  if (confirmations >= 4) return 22;
  if (confirmations >= 2) return 18;
  return 14;
}

/**
 * Get pin opacity based on time decay
 */
export function getPinOpacity(createdAt: string, category: string): number {
  const hoursAgo = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  const maxHours = DECAY_HOURS[category] || 24;
  const ratio = Math.min(hoursAgo / maxHours, 1);
  return Math.max(1 - ratio * 0.7, 0.3);
}

/**
 * Get pin color based on category
 */
export function getPinColor(category: string): string {
  const details = CATEGORY_DETAILS[category];
  if (!details) return '#94A3B8';
  const group = CATEGORY_GROUPS[details.group];
  return group.color.text;
}

/**
 * Get category group from category id
 */
export function getCategoryGroup(category: string) {
  const details = CATEGORY_DETAILS[category];
  if (!details) return null;
  return CATEGORY_GROUPS[details.group];
}

/**
 * Format time ago string
 */
export function formatTimeAgo(createdAt: string): string {
  const hoursAgo = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  
  if (hoursAgo < 1) return 'il y a moins d\'1h';
  if (hoursAgo < 24) return `il y a ${Math.floor(hoursAgo)}h`;
  return `il y a ${Math.floor(hoursAgo / 24)}j`;
}

/**
 * Determine decay type from category
 */
export function getDecayType(category: string): 'people' | 'infra' | 'positive' {
  const details = CATEGORY_DETAILS[category];
  if (!details) return 'people';
  
  if (details.group === 'infra') return 'infra';
  if (details.group === 'positive') return 'positive';
  return 'people';
}
```

---

## ÉTAPE 4.4: ReportSheet Redesign

### Remplace `src/components/ReportSheet.tsx`

```typescript
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, ArrowRight, Camera, Video, Mic, Check, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useStore } from '@/stores/useStore';
import { supabase } from '@/lib/supabase';
import { CATEGORY_GROUPS, CATEGORY_DETAILS, TRANSPORT_TYPES } from '@/types';
import { getDecayType } from '@/lib/pin-utils';
import { springTransition } from '@/lib/tokens';
import { Button, Input, Chip, Card } from '@/components/ui';

export function ReportSheet() {
  const t = useTranslations('report');
  const { 
    activeSheet, setActiveSheet,
    newPinCoords, userId,
    reportStep, setReportStep,
    reportCategory, setReportCategory,
    reportTransport, setReportTransport,
    resetReport, addPin
  } = useStore();

  const [description, setDescription] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (activeSheet !== 'report') return null;

  const selectedCatDetails = reportCategory ? CATEGORY_DETAILS[reportCategory] : null;
  const selectedGroup = selectedCatDetails ? CATEGORY_GROUPS[selectedCatDetails.group] : null;

  // Navigation
  const canProceed = () => {
    if (reportStep === 1) return !!reportCategory;
    if (reportStep === 2) return reportTransport.isTransport !== null;
    return true;
  };

  const handleBack = () => {
    if (reportStep > 1) {
      setReportStep(reportStep - 1);
    } else {
      handleClose();
    }
  };

  const handleNext = () => {
    if (reportStep < 3 && canProceed()) {
      setReportStep(reportStep + 1);
    } else if (reportStep === 3) {
      handleSubmit();
    }
  };

  const handleClose = () => {
    setActiveSheet(null);
    resetReport();
    setDescription('');
    setMediaUrl(null);
  };

  const handleCategorySelect = (catId: string) => {
    setReportCategory(catId);
    setTimeout(() => setReportStep(2), 150);
  };

  const handleSubmit = async () => {
    if (!newPinCoords || !reportCategory) return;
    
    setIsSubmitting(true);
    try {
      const newPin = {
        user_id: userId,
        lat: newPinCoords.lat,
        lng: newPinCoords.lng,
        category: reportCategory,
        severity: selectedGroup?.id === 'urgent' ? 'high' : selectedGroup?.id === 'warning' ? 'med' : 'low',
        description: description || null,
        media_url: mediaUrl,
        is_transport: reportTransport.isTransport ?? false,
        transport_type: reportTransport.type,
        transport_line: reportTransport.line || null,
        confirmations: 1,
        decay_type: getDecayType(reportCategory),
      };

      const { data, error } = await supabase.from('pins').insert(newPin).select().single();
      
      if (error) throw error;
      if (data) addPin(data);
      
      handleClose();
    } catch (error) {
      console.error('Error submitting report:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepTitles = ['', 'Catégorie', 'Transport', 'Détails'];

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={springTransition}
      className="fixed bottom-0 left-0 right-0 z-[201] bg-[var(--surface-elevated)] rounded-t-[var(--radius-xl)] max-h-[85vh] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-[var(--border-subtle)]">
        <button 
          onClick={handleBack}
          className="w-8 h-8 rounded-full bg-[var(--interactive-hover)] flex items-center justify-center text-[var(--text-secondary)]"
        >
          {reportStep > 1 ? <ArrowLeft size={18} /> : <X size={18} />}
        </button>
        
        <div className="flex-1 text-center">
          <span className="text-base font-semibold text-[var(--text-primary)]">
            {stepTitles[reportStep]}
          </span>
        </div>
        
        <button
          onClick={handleNext}
          disabled={!canProceed()}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            canProceed() 
              ? 'bg-[var(--accent-gold)] text-[var(--surface-base)]' 
              : 'bg-[var(--interactive-hover)] text-[var(--text-tertiary)] opacity-40'
          }`}
        >
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto max-h-[calc(85vh-60px)]">
        
        {/* STEP 1: Category Selection */}
        {reportStep === 1 && (
          <div className="space-y-4">
            {Object.entries(CATEGORY_GROUPS).map(([groupId, group]) => (
              <div key={groupId}>
                <p 
                  className="text-[10px] font-bold mb-2 tracking-wider uppercase"
                  style={{ color: group.color.text }}
                >
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {group.items.map(catId => {
                    const cat = CATEGORY_DETAILS[catId];
                    const isSelected = reportCategory === catId;
                    return (
                      <Chip
                        key={catId}
                        emoji={cat.emoji}
                        label={cat.label}
                        color={group.color}
                        selected={isSelected}
                        onClick={() => handleCategorySelect(catId)}
                        size="md"
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STEP 2: Transport */}
        {reportStep === 2 && (
          <div>
            {/* Selected category pill */}
            {selectedCatDetails && (
              <div 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-4"
                style={{ background: selectedGroup?.color.bg }}
              >
                <span>{selectedCatDetails.emoji}</span>
                <span className="text-sm" style={{ color: selectedGroup?.color.text }}>
                  {selectedCatDetails.label}
                </span>
              </div>
            )}

            <p className="text-base font-semibold text-[var(--text-primary)] mb-4">
              Dans un transport ?
            </p>

            {reportTransport.isTransport === null ? (
              <div className="flex gap-3">
                <Button 
                  variant="secondary" 
                  fullWidth 
                  onClick={() => setReportTransport({ isTransport: true })}
                >
                  Oui
                </Button>
                <Button 
                  variant="secondary" 
                  fullWidth 
                  onClick={() => setReportTransport({ isTransport: false })}
                >
                  Non
                </Button>
              </div>
            ) : reportTransport.isTransport ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {TRANSPORT_TYPES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setReportTransport({ type: t.id })}
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                        reportTransport.type === t.id
                          ? 'bg-[rgba(59,180,193,0.25)] border-[var(--gradient-start)] text-[var(--text-primary)]'
                          : 'bg-[var(--interactive-hover)] text-[var(--text-secondary)]'
                      } border border-transparent`}
                    >
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
                
                {reportTransport.type && (
                  <Input
                    label={TRANSPORT_TYPES.find(t => t.id === reportTransport.type)?.placeholder || 'Ligne'}
                    value={reportTransport.line}
                    onChange={(e) => setReportTransport({ line: e.target.value })}
                  />
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-tertiary)]">
                Appuie sur → pour continuer
              </p>
            )}
          </div>
        )}

        {/* STEP 3: Details */}
        {reportStep === 3 && (
          <div>
            <p className="text-xs text-[var(--text-tertiary)] mb-4">Optionnel</p>

            {/* Media buttons */}
            <div className="flex gap-2 mb-4">
              {[
                { icon: Camera, label: 'Photo' },
                { icon: Video, label: 'Vidéo' },
                { icon: Mic, label: 'Audio' },
              ].map((m, i) => (
                <button 
                  key={i}
                  className="flex-1 py-4 rounded-xl bg-[var(--interactive-hover)] border border-[var(--border-default)] flex flex-col items-center gap-2 text-[var(--text-tertiary)] hover:bg-[var(--interactive-active)]"
                >
                  <m.icon size={20} />
                  <span className="text-xs">{m.label}</span>
                </button>
              ))}
            </div>

            {/* Description */}
            <textarea
              placeholder="Description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-[var(--surface-card)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm resize-none focus:outline-none focus:border-[var(--gradient-start)]"
            />

            {/* Submit button */}
            <Button 
              variant="primary" 
              fullWidth 
              className="mt-4"
              onClick={handleSubmit}
              loading={isSubmitting}
            >
              Envoyer
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
```

---

## ÉTAPE 4.5: DetailSheet Redesign

### Remplace `src/components/DetailSheet.tsx`

```typescript
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronUp, ChevronDown, MapPin, Users, Check, 
  Flag, Share2, ThumbsDown, MessageCircle, X 
} from 'lucide-react';
import { useStore } from '@/stores/useStore';
import { CATEGORY_DETAILS, CATEGORY_GROUPS } from '@/types';
import { formatTimeAgo } from '@/lib/pin-utils';
import { springTransition } from '@/lib/tokens';
import { Button } from '@/components/ui';

export function DetailSheet() {
  const { 
    activeSheet, setActiveSheet,
    selectedPin, setSelectedPin,
    isDetailExpanded, setDetailExpanded,
    setShowConfirmFlow, setConfirmingPin
  } = useStore();

  if (activeSheet !== 'detail' || !selectedPin) return null;

  const catDetails = CATEGORY_DETAILS[selectedPin.category];
  const groupDetails = catDetails ? CATEGORY_GROUPS[catDetails.group] : null;
  const timeLabel = formatTimeAgo(selectedPin.created_at);

  const handleClose = () => {
    setActiveSheet(null);
    setSelectedPin(null);
    setDetailExpanded(false);
  };

  const handleConfirm = () => {
    setConfirmingPin(selectedPin);
    setShowConfirmFlow(true);
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={springTransition}
      className="fixed bottom-0 left-0 right-0 z-[201] bg-[var(--surface-elevated)] rounded-t-[var(--radius-xl)] overflow-hidden"
    >
      <motion.div
        animate={{ height: isDetailExpanded ? '80vh' : 180 }}
        transition={springTransition}
        className="overflow-hidden"
      >
        {/* Handle */}
        <div 
          className="flex justify-center pt-3 pb-2 cursor-pointer"
          onClick={() => setDetailExpanded(!isDetailExpanded)}
        >
          <div className="w-9 h-1 rounded-full bg-[var(--border-strong)]" />
        </div>

        <div className="px-4 pb-6">
          {/* Preview (always visible) */}
          <div className="flex items-center gap-3 mb-3">
            <div 
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: groupDetails?.color.bg }}
            >
              <span className="text-2xl">{catDetails?.emoji}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[var(--text-primary)]">{catDetails?.label}</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {selectedPin.is_transport && `${selectedPin.transport_type?.toUpperCase()} ${selectedPin.transport_line} • `}
                {timeLabel}
              </p>
            </div>
            <button 
              onClick={() => setDetailExpanded(!isDetailExpanded)}
              className="w-8 h-8 rounded-full bg-[var(--interactive-hover)] flex items-center justify-center text-[var(--text-secondary)]"
            >
              {isDetailExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
          </div>

          {/* Confirmations bar (always visible) */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[rgba(59,180,193,0.1)]">
            <Users size={14} className="text-[var(--gradient-start)]" />
            <span className="text-xs font-medium text-[var(--gradient-start)]">
              {selectedPin.confirmations} confirmation{selectedPin.confirmations > 1 ? 's' : ''}
            </span>
            <div className="flex-1" />
            <button
              onClick={handleConfirm}
              className="px-3 py-1.5 rounded-lg bg-[var(--gradient-start)] text-white text-xs font-semibold flex items-center gap-1"
            >
              <Check size={12} /> Confirmer
            </button>
          </div>

          {/* Expanded content */}
          <AnimatePresence>
            {isDetailExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-4 overflow-y-auto"
                style={{ maxHeight: 'calc(80vh - 200px)' }}
              >
                {/* Location */}
                <div className="p-3 rounded-xl bg-[var(--interactive-hover)] mb-3">
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-[var(--text-tertiary)] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {selectedPin.address || 'Position sur la carte'}
                      </p>
                      {selectedPin.is_transport && (
                        <p className="text-xs text-[var(--text-tertiary)] mt-1">
                          {selectedPin.transport_type?.toUpperCase()} Ligne {selectedPin.transport_line}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                {selectedPin.description && (
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed mb-3">
                    "{selectedPin.description}"
                  </p>
                )}

                {/* Media */}
                {selectedPin.media_url && (
                  <div className="mb-4 rounded-xl overflow-hidden bg-[var(--surface-card)] h-40 flex items-center justify-center">
                    <img 
                      src={selectedPin.media_url} 
                      alt="" 
                      className="object-cover w-full h-full"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleConfirm}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--gradient-start)] text-white text-sm font-semibold"
                  >
                    <Check size={16} /> Confirmer
                  </button>
                  <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--semantic-success-soft)] text-[var(--semantic-success)] text-sm font-semibold">
                    <Flag size={16} /> Résolu
                  </button>
                  <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--interactive-hover)] text-[var(--text-secondary)] text-sm font-medium border border-[var(--border-default)]">
                    <Share2 size={16} />
                  </button>
                  <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--interactive-hover)] text-[var(--text-secondary)] text-sm font-medium border border-[var(--border-default)]">
                    <ThumbsDown size={16} /> Faux
                  </button>
                  <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--interactive-hover)] text-[var(--text-secondary)] text-sm font-medium border border-[var(--border-default)]">
                    <MessageCircle size={16} /> Contact
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
```

---

## ÉTAPE 4.6: ConfirmFlowModal

### Crée `src/components/ConfirmFlowModal.tsx`

```typescript
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Video, Mic, Check } from 'lucide-react';
import { useStore } from '@/stores/useStore';
import { supabase } from '@/lib/supabase';
import { CATEGORY_DETAILS } from '@/types';
import { springTransition } from '@/lib/tokens';
import { Button } from '@/components/ui';

export function ConfirmFlowModal() {
  const { 
    showConfirmFlow, setShowConfirmFlow, 
    confirmingPin, setConfirmingPin,
    userId, updatePin
  } = useStore();
  
  const [mediaType, setMediaType] = useState<'photo' | 'video' | 'audio' | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!showConfirmFlow || !confirmingPin) return null;

  const catDetails = CATEGORY_DETAILS[confirmingPin.category];

  const handleClose = () => {
    setShowConfirmFlow(false);
    setConfirmingPin(null);
    setMediaType(null);
    setMediaUrl(null);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      // Increment confirmations
      const { data, error } = await supabase
        .from('pins')
        .update({ confirmations: confirmingPin.confirmations + 1 })
        .eq('id', confirmingPin.id)
        .select()
        .single();

      if (error) throw error;

      // Add evidence if media uploaded
      if (mediaUrl) {
        await supabase.from('pin_evidence').insert({
          pin_id: confirmingPin.id,
          user_id: userId,
          evidence_type: 'confirmation',
          media_url: mediaUrl,
        });
      }

      // Update local store
      if (data) updatePin(data);
      
      handleClose();
    } catch (error) {
      console.error('Error confirming:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-[300] flex items-end justify-center"
        onClick={handleClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={springTransition}
          className="w-full max-w-md bg-[var(--surface-elevated)] rounded-t-[var(--radius-xl)] p-5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Confirmer cet incident
            </h3>
            <button 
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-[var(--interactive-hover)] flex items-center justify-center text-[var(--text-secondary)]"
            >
              <X size={18} />
            </button>
          </div>

          {/* Incident recap */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--interactive-hover)] mb-4">
            <span className="text-2xl">{catDetails?.emoji}</span>
            <div>
              <p className="font-medium text-[var(--text-primary)]">{catDetails?.label}</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {confirmingPin.is_transport 
                  ? `${confirmingPin.transport_type?.toUpperCase()} ${confirmingPin.transport_line}`
                  : 'Localisation fixe'
                }
              </p>
            </div>
          </div>

          {/* Media upload */}
          <p className="text-sm text-[var(--text-tertiary)] mb-3">
            Ajouter une preuve (optionnel)
          </p>
          
          <div className="flex gap-2 mb-4">
            {[
              { id: 'photo', icon: Camera, label: 'Photo' },
              { id: 'video', icon: Video, label: 'Vidéo' },
              { id: 'audio', icon: Mic, label: 'Audio' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMediaType(mediaType === m.id ? null : m.id as any)}
                className={`flex-1 py-3.5 rounded-xl flex flex-col items-center gap-1.5 transition-all border ${
                  mediaType === m.id
                    ? 'bg-[rgba(59,180,193,0.15)] border-[var(--gradient-start)] text-[var(--gradient-start)]'
                    : 'bg-[var(--interactive-hover)] border-transparent text-[var(--text-tertiary)]'
                }`}
              >
                <m.icon size={20} />
                <span className="text-xs">{m.label}</span>
              </button>
            ))}
          </div>

          {/* Media preview placeholder */}
          {mediaType && (
            <div className="relative mb-4 rounded-xl overflow-hidden bg-[var(--surface-card)] h-20 flex items-center justify-center">
              <span className="text-2xl">📷</span>
              <button 
                onClick={() => { setMediaType(null); setMediaUrl(null); }}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center"
              >
                <X size={12} className="text-white" />
              </button>
            </div>
          )}

          {/* Submit */}
          <Button
            variant="primary"
            fullWidth
            onClick={handleConfirm}
            loading={isSubmitting}
          >
            <Check size={18} /> Confirmer l'incident
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
```

---

## ÉTAPE 4.7: Wire Everything

### Update `src/app/map/page.tsx`

Ajoute les imports:

```typescript
import { ReportSheet } from '@/components/ReportSheet';
import { DetailSheet } from '@/components/DetailSheet';
import { ConfirmFlowModal } from '@/components/ConfirmFlowModal';
```

Ajoute dans le JSX (à la fin, avant la fermeture du div principal):

```tsx
<ReportSheet />
<DetailSheet />
<ConfirmFlowModal />
```

### Update MapView pin click handler

Dans MapView, sur le click d'un pin:

```typescript
const handlePinClick = (pin: Pin) => {
  setSelectedPin(pin);
  setDetailExpanded(false);
  setActiveSheet('detail');
};
```

---

## ÉTAPE 4.8: i18n

### Update `src/messages/fr.json`

Ajoute:

```json
{
  "report": {
    "category": "Catégorie",
    "transport": "Transport",
    "details": "Détails",
    "inTransport": "Dans un transport ?",
    "optional": "Optionnel",
    "send": "Envoyer",
    "photo": "Photo",
    "video": "Vidéo",
    "audio": "Audio"
  },
  "detail": {
    "confirmations": "{count} confirmation(s)",
    "confirm": "Confirmer",
    "resolved": "Résolu",
    "false": "Faux",
    "contact": "Contact"
  },
  "confirm": {
    "title": "Confirmer cet incident",
    "addProof": "Ajouter une preuve (optionnel)",
    "submit": "Confirmer l'incident"
  },
  "categories": {
    "assault": "Agression",
    "harassment": "Harcèlement",
    "theft": "Vol",
    "following": "Filature",
    "suspect": "Suspect",
    "group": "Attroupement",
    "unsafe": "Zone à éviter",
    "lighting": "Mal éclairé",
    "blocked": "Passage difficile",
    "closed": "Fermé",
    "safe": "Lieu sûr",
    "help": "Aide reçue",
    "presence": "Sécurité"
  }
}
```

---

## Checklist Final

- [ ] Migration SQL appliquée
- [ ] Types et constants ajoutés
- [ ] Store mis à jour
- [ ] pin-utils.ts créé
- [ ] ReportSheet redesigné
- [ ] DetailSheet redesigné
- [ ] ConfirmFlowModal créé
- [ ] Composants wirés dans map/page.tsx
- [ ] i18n ajouté
- [ ] Test: créer un incident
- [ ] Test: voir le détail
- [ ] Test: confirmer un incident

---

*Fin Phase 4*
