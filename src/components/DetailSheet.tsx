'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronUp, ChevronDown, MapPin, Users, Check,
  Flag, Share2, ThumbsDown, MessageCircle, X,
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
    setShowConfirmFlow, setConfirmingPin,
  } = useStore();

  if (activeSheet !== 'detail' || !selectedPin) return null;

  const catDetails = CATEGORY_DETAILS[selectedPin.category];
  const groupDetails = catDetails ? CATEGORY_GROUPS[catDetails.group] : null;
  const timeLabel = formatTimeAgo(selectedPin.created_at);
  const confirmCount = selectedPin.confirmations ?? 0;

  const handleClose = () => {
    setActiveSheet('none');
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
      className="fixed bottom-0 left-0 right-0 z-201 bg-(--surface-elevated) rounded-t-xl overflow-hidden"
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
          <div className="w-9 h-1 rounded-full bg-(--border-strong)" />
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
              <p className="font-semibold text-(--text-primary)">{catDetails?.label}</p>
              <p className="text-xs text-(--text-tertiary)">
                {selectedPin.is_transport && `${selectedPin.transport_type?.toUpperCase()} ${selectedPin.transport_line} \u2022 `}
                {timeLabel}
              </p>
            </div>
            <button
              onClick={() => setDetailExpanded(!isDetailExpanded)}
              className="w-8 h-8 rounded-full bg-(--interactive-hover) flex items-center justify-center text-(--text-secondary)"
            >
              {isDetailExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
          </div>

          {/* Confirmations bar (always visible) */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[rgba(59,180,193,0.1)]">
            <Users size={14} className="text-(--gradient-start)" />
            <span className="text-xs font-medium text-(--gradient-start)">
              {confirmCount} confirmation{confirmCount > 1 ? 's' : ''}
            </span>
            <div className="flex-1" />
            <button
              onClick={handleConfirm}
              className="px-3 py-1.5 rounded-lg bg-(--gradient-start) text-white text-xs font-semibold flex items-center gap-1"
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
                <div className="p-3 rounded-xl bg-(--interactive-hover) mb-3">
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-(--text-tertiary) mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-(--text-primary)">
                        {selectedPin.address || 'Position sur la carte'}
                      </p>
                      {selectedPin.is_transport && (
                        <p className="text-xs text-(--text-tertiary) mt-1">
                          {selectedPin.transport_type?.toUpperCase()} Ligne {selectedPin.transport_line}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                {selectedPin.description && (
                  <p className="text-sm text-(--text-primary) leading-relaxed mb-3">
                    &ldquo;{selectedPin.description}&rdquo;
                  </p>
                )}

                {/* Media */}
                {selectedPin.media_url && (
                  <div className="mb-4 rounded-xl overflow-hidden bg-(--surface-card) h-40 flex items-center justify-center">
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
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-(--gradient-start) text-white text-sm font-semibold"
                  >
                    <Check size={16} /> Confirmer
                  </button>
                  <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-(--semantic-success-soft) text-(--semantic-success) text-sm font-semibold">
                    <Flag size={16} /> Résolu
                  </button>
                  <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-(--interactive-hover) text-(--text-secondary) text-sm font-medium border border-(--border-default)">
                    <Share2 size={16} />
                  </button>
                  <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-(--interactive-hover) text-(--text-secondary) text-sm font-medium border border-(--border-default)">
                    <ThumbsDown size={16} /> Faux
                  </button>
                  <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-(--interactive-hover) text-(--text-secondary) text-sm font-medium border border-(--border-default)">
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

export default DetailSheet;
