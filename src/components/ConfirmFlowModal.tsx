'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Video, Mic, Check } from 'lucide-react';
import { useStore } from '@/stores/useStore';
import { supabase } from '@/lib/supabase';
import { CATEGORY_DETAILS } from '@/types';
import { springTransition } from '@/lib/tokens';
import { Button } from '@/components/ui';
import { toast } from 'sonner';

export function ConfirmFlowModal() {
  const {
    showConfirmFlow, setShowConfirmFlow,
    confirmingPin, setConfirmingPin,
    userId, updatePin,
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
      const { data, error } = await supabase
        .rpc('confirm_pin', { p_pin_id: confirmingPin.id });

      if (error) {
        if (error.message?.includes('already_confirmed')) {
          toast.error('Vous avez d\u00e9j\u00e0 confirm\u00e9 ce signalement');
        } else {
          toast.error('Erreur lors de la confirmation');
        }
        return;
      }

      if (data) updatePin(data);
      toast.success('Confirmation enregistr\u00e9e');
      handleClose();
    } catch (err) {
      console.error('Error confirming:', err);
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
        className="fixed inset-0 bg-black/60 z-300 flex items-end justify-center"
        onClick={handleClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={springTransition}
          className="w-full max-w-md bg-(--surface-elevated) rounded-t-xl p-5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-(--text-primary)">
              Confirmer cet incident
            </h3>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-(--interactive-hover) flex items-center justify-center text-(--text-secondary)"
            >
              <X size={18} />
            </button>
          </div>

          {/* Incident recap */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-(--interactive-hover) mb-4">
            <span className="text-2xl">{catDetails?.emoji}</span>
            <div>
              <p className="font-medium text-(--text-primary)">{catDetails?.label}</p>
              <p className="text-xs text-(--text-tertiary)">
                {confirmingPin.is_transport
                  ? `${confirmingPin.transport_type?.toUpperCase()} ${confirmingPin.transport_line}`
                  : 'Localisation fixe'
                }
              </p>
            </div>
          </div>

          {/* Media upload */}
          <p className="text-sm text-(--text-tertiary) mb-3">
            Ajouter une preuve (optionnel)
          </p>

          <div className="flex gap-2 mb-4">
            {([
              { id: 'photo' as const, icon: Camera, label: 'Photo' },
              { id: 'video' as const, icon: Video, label: 'Vidéo' },
              { id: 'audio' as const, icon: Mic, label: 'Audio' },
            ]).map((m) => (
              <button
                key={m.id}
                onClick={() => setMediaType(mediaType === m.id ? null : m.id)}
                className={`flex-1 py-3.5 rounded-xl flex flex-col items-center gap-1.5 transition-all border ${
                  mediaType === m.id
                    ? 'bg-[rgba(59,180,193,0.15)] border-(--gradient-start) text-(--gradient-start)'
                    : 'bg-(--interactive-hover) border-transparent text-(--text-tertiary)'
                }`}
              >
                <m.icon size={20} />
                <span className="text-xs">{m.label}</span>
              </button>
            ))}
          </div>

          {/* Media preview placeholder */}
          {mediaType && (
            <div className="relative mb-4 rounded-xl overflow-hidden bg-(--surface-card) h-20 flex items-center justify-center">
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
            <Check size={18} /> Confirmer l&apos;incident
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
