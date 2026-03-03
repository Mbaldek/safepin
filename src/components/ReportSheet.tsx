'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, ArrowLeft, ArrowRight, Camera, Video, Mic } from 'lucide-react';
import { useStore } from '@/stores/useStore';
import { supabase } from '@/lib/supabase';
import { CATEGORY_GROUPS, CATEGORY_DETAILS, TRANSPORT_TYPES } from '@/types';
import { getDecayType } from '@/lib/pin-utils';
import { springTransition } from '@/lib/tokens';
import { Button, Input, Chip } from '@/components/ui';

export function ReportSheet() {
  const {
    activeSheet, setActiveSheet,
    newPinCoords, userId,
    reportStep, setReportStep,
    reportCategory, setReportCategory,
    reportTransport, setReportTransport,
    resetReport, addPin,
  } = useStore();

  const [description, setDescription] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (activeSheet !== 'report') return null;

  const selectedCatDetails = reportCategory ? CATEGORY_DETAILS[reportCategory] : null;
  const selectedGroup = selectedCatDetails ? CATEGORY_GROUPS[selectedCatDetails.group] : null;

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
    setActiveSheet('none');
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
      className="fixed bottom-0 left-0 right-0 z-201 bg-(--surface-elevated) rounded-t-xl max-h-[85vh] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-(--border-subtle)">
        <button
          onClick={handleBack}
          className="w-8 h-8 rounded-full bg-(--interactive-hover) flex items-center justify-center text-(--text-secondary)"
        >
          {reportStep > 1 ? <ArrowLeft size={18} /> : <X size={18} />}
        </button>

        <div className="flex-1 text-center">
          <span className="text-base font-semibold text-(--text-primary)">
            {stepTitles[reportStep]}
          </span>
        </div>

        <button
          onClick={handleNext}
          disabled={!canProceed()}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            canProceed()
              ? 'bg-(--accent-gold) text-(--surface-base)'
              : 'bg-(--interactive-hover) text-(--text-tertiary) opacity-40'
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

            <p className="text-base font-semibold text-(--text-primary) mb-4">
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
                  {TRANSPORT_TYPES.map(tt => (
                    <button
                      key={tt.id}
                      onClick={() => setReportTransport({ type: tt.id })}
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                        reportTransport.type === tt.id
                          ? 'bg-[rgba(59,180,193,0.25)] border-(--gradient-start) text-(--text-primary)'
                          : 'bg-(--interactive-hover) text-(--text-secondary)'
                      } border border-transparent`}
                    >
                      {tt.emoji} {tt.label}
                    </button>
                  ))}
                </div>

                {reportTransport.type && (
                  <Input
                    label={TRANSPORT_TYPES.find(tt => tt.id === reportTransport.type)?.placeholder || 'Ligne'}
                    value={reportTransport.line}
                    onChange={(e) => setReportTransport({ line: e.target.value })}
                  />
                )}
              </div>
            ) : (
              <p className="text-sm text-(--text-tertiary)">
                Appuie sur → pour continuer
              </p>
            )}
          </div>
        )}

        {/* STEP 3: Details */}
        {reportStep === 3 && (
          <div>
            <p className="text-xs text-(--text-tertiary) mb-4">Optionnel</p>

            {/* Media buttons */}
            <div className="flex gap-2 mb-4">
              {[
                { icon: Camera, label: 'Photo' },
                { icon: Video, label: 'Vidéo' },
                { icon: Mic, label: 'Audio' },
              ].map((m, i) => (
                <button
                  key={i}
                  className="flex-1 py-4 rounded-xl bg-(--interactive-hover) border border-(--border-default) flex flex-col items-center gap-2 text-(--text-tertiary) hover:bg-(--interactive-active)"
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
              className="w-full px-4 py-3 rounded-xl bg-(--surface-card) border border-(--border-default) text-(--text-primary) text-sm resize-none focus:outline-none focus:border-(--gradient-start)"
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
