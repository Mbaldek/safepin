// src/components/IncidentReportModal.tsx — 2-step incident report (Calm UI)

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, ArrowRight, MapPin, Check } from 'lucide-react';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { useMapPadding } from '@/hooks/useMapPadding';
import { useStore } from '@/stores/useStore';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { springTransition } from '@/lib/utils';
import { geocodeReverse } from '@/lib/geocode';
import { enqueue, getCount } from '@/lib/offlineQueue';
import { IncidentTypeSelector } from './IncidentTypeSelector';
import { IncidentDetailsForm } from './IncidentDetailsForm';
import type { IncidentType, SeverityLevel } from '@/lib/incident-types';
import type { MediaItem } from '@/types';

type LocalMedia = {
  file: File;
  preview: string;
  type: 'image' | 'video' | 'audio';
};

function detectType(file: File): 'image' | 'video' | 'audio' {
  if (file.type.startsWith('image')) return 'image';
  if (file.type.startsWith('video')) return 'video';
  return 'audio';
}

type Step = 'type' | 'details' | 'success';

export default function IncidentReportModal({ userId }: { userId: string | null }) {
  const {
    setActiveSheet,
    newPinCoords,
    setNewPinCoords,
    addPin,
    setOfflineQueueCount,
    setShowWalkWithMe,
  } = useStore();
  const t = useTranslations('report');
  const tTrip = useTranslations('trip');
  const tEmergency = useTranslations('emergency');
  const focusTrapRef = useFocusTrap(true, handleClose);
  useMapPadding(focusTrapRef);

  // Step state
  const [step, setStep] = useState<Step>('type');

  // Form data
  const [selectedType, setSelectedType] = useState<IncidentType | null>(null);
  const [severity, setSeverity] = useState<SeverityLevel | null>(null);
  const [description, setDescription] = useState('');
  const [mediaFiles, setMediaFiles] = useState<LocalMedia[]>([]);
  const [environment, setEnvironment] = useState<string | null>(null);
  const [urbanContext, setUrbanContext] = useState<string | null>(null);
  const [urbanContextCustom, setUrbanContextCustom] = useState('');
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [addrLoading, setAddrLoading] = useState(true);

  // Auto-set location to current GPS position on mount
  useEffect(() => {
    const { userLocation, newPinCoords: existing } = useStore.getState();
    if (!existing && userLocation) {
      setNewPinCoords(userLocation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reverse geocode pin coords → address
  useEffect(() => {
    if (!newPinCoords) {
      setAddrLoading(false);
      return;
    }
    setAddrLoading(true);
    geocodeReverse(newPinCoords.lng, newPinCoords.lat)
      .then((addr) => {
        if (addr) setAddress(addr);
      })
      .catch(() => {})
      .finally(() => setAddrLoading(false));
  }, [newPinCoords]);

  // Auto-advance to details on type selection
  const handleTypeSelect = useCallback((type: IncidentType) => {
    setSelectedType(type);
    setStep('details');
  }, []);

  const handleBack = useCallback(() => {
    setStep('type');
  }, []);

  function handleClose() {
    setActiveSheet('none');
    setNewPinCoords(null);
  }

  function handleMediaAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - mediaFiles.length;
    if (remaining <= 0) {
      toast.error(t('maxFiles'));
      return;
    }
    const toAdd = files.slice(0, remaining).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      type: detectType(file),
    }));
    setMediaFiles((prev) => [...prev, ...toAdd]);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  }

  function handleMediaRemove(index: number) {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!selectedType) return;
    if (!severity) {
      toast.error(t('selectSeverity'));
      return;
    }
    if (!newPinCoords) {
      toast.error(t('tapMap'));
      return;
    }
    if (!userId) {
      toast.error(tEmergency('signInFirst'));
      return;
    }

    setLoading(true);

    const dbSeverity = severity === 'moderate' ? 'med' : severity;
    const dbCategory = selectedType.dbCategory;
    const descText = description.trim() || 'No description.';

    // ── Offline: queue and register background sync ─────────────────
    if (!navigator.onLine) {
      const mediaBlobs = await Promise.all(
        mediaFiles.map(async (m) => ({
          name: m.file.name,
          type: m.file.type,
          blob: m.file as Blob,
        })),
      );
      await enqueue({
        id: crypto.randomUUID(),
        user_id: userId,
        lat: newPinCoords.lat,
        lng: newPinCoords.lng,
        category: dbCategory,
        severity: dbSeverity,
        environment: environment || null,
        urban_context: urbanContext || null,
        urban_context_custom:
          urbanContext === 'other' && urbanContextCustom.trim()
            ? urbanContextCustom.trim()
            : null,
        is_moving: false,
        description: descText,
        media_blobs: mediaBlobs,
        created_at: new Date().toISOString(),
      });
      const count = await getCount();
      setOfflineQueueCount(count);
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        const reg = await navigator.serviceWorker.ready;
        await (
          reg as ServiceWorkerRegistration & {
            sync: { register(tag: string): Promise<void> };
          }
        ).sync.register('brume-sync-pins');
      }
      toast.success(t('queued'));
      setActiveSheet('none');
      setNewPinCoords(null);
      setLoading(false);
      return;
    }

    // ── Online: upload media + insert ────────────────────────────────
    const uploaded: MediaItem[] = [];
    for (const media of mediaFiles) {
      const fileName = `${userId}/${Date.now()}-${media.file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('pin-photos')
        .upload(fileName, media.file);
      if (uploadError) {
        toast.error(t('uploadFailed'));
        setLoading(false);
        return;
      }
      const { data: urlData } = supabase.storage
        .from('pin-photos')
        .getPublicUrl(fileName);
      uploaded.push({ url: urlData.publicUrl, type: media.type });
    }

    const firstImage = uploaded.find((m) => m.type === 'image');

    const { data: newPin, error } = await supabase
      .from('pins')
      .insert({
        user_id: userId,
        lat: newPinCoords.lat,
        lng: newPinCoords.lng,
        category: dbCategory,
        severity: dbSeverity,
        environment: environment || null,
        urban_context: urbanContext || null,
        urban_context_custom:
          urbanContext === 'other' && urbanContextCustom.trim()
            ? urbanContextCustom.trim()
            : null,
        is_moving: false,
        description: descText,
        photo_url: firstImage?.url ?? null,
        media_urls: uploaded.length > 0 ? uploaded : null,
      })
      .select()
      .single();

    if (error) {
      toast.error(t('error'));
      console.error('Insert error:', error);
      setLoading(false);
      return;
    }

    // Immediately add to store so the map updates without waiting for realtime
    if (newPin) addPin(newPin as import('@/types').Pin);

    // Record initial evidence (the original report)
    if (newPin) {
      supabase
        .from('pin_evidence')
        .insert({
          pin_id: newPin.id,
          user_id: userId,
          activity: 'report',
          content: description || null,
          media_urls: uploaded.length > 0 ? uploaded : null,
        })
        .then(() => {}); // fire-and-forget
    }

    setLoading(false);

    // Show success step
    setStep('success');
    setTimeout(() => {
      // Walk With Me offer for high severity
      if (severity === 'high') {
        toast(t('submitted'), {
          action: {
            label: tTrip('walkWithMe'),
            onClick: () => setShowWalkWithMe(true),
          },
        });
      } else {
        toast.success(t('submitted'));
      }
      setActiveSheet('none');
      setNewPinCoords(null);
    }, 2000);
  }

  const canSubmit = selectedType && severity;
  const locationText = addrLoading
    ? t('loadingAddress')
    : address || t('unknownAddress');

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-200"
        style={{ backgroundColor: 'var(--bg-overlay)' }}
        onClick={handleClose}
      />

      {/* Bottom sheet modal */}
      <motion.div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Report incident"
        className="sheet-motion absolute bottom-0 left-1/2 -translate-x-1/2 w-[92%] max-w-[440px] rounded-t-2xl z-201 max-h-[85dvh] flex flex-col lg:bottom-2 lg:left-2 lg:translate-x-0 lg:w-[380px] lg:max-w-none lg:rounded-2xl"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          boxShadow: '0 -10px 40px var(--bg-overlay)',
        }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={springTransition}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div
            className="w-10 h-1 rounded-full"
            style={{ backgroundColor: 'var(--border)' }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          {/* Left: Back button or spacer */}
          <div className="w-10">
            {step === 'details' && (
              <button
                onClick={handleBack}
                className="p-2 -ml-2 rounded-full transition active:opacity-60"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Retour"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Center: Title */}
          <h2
            className="text-lg font-semibold text-center flex-1"
            style={{ color: 'var(--text-primary)' }}
          >
            {step === 'type' && t('category')}
            {step === 'details' && (selectedType?.label ?? t('severity'))}
            {step === 'success' && ''}
          </h2>

          {/* Right: Close or Submit icon */}
          <div className="w-10 flex justify-end">
            {step === 'details' ? (
              <button
                onClick={handleSubmit}
                disabled={loading || !canSubmit}
                className="w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 disabled:opacity-40"
                style={{
                  backgroundColor: canSubmit ? 'var(--accent)' : 'var(--bg-card)',
                }}
                aria-label="Envoyer"
              >
                <ArrowRight
                  className="w-5 h-5"
                  style={{ color: canSubmit ? '#fff' : 'var(--text-muted)' }}
                />
              </button>
            ) : step !== 'success' ? (
              <button
                onClick={handleClose}
                className="p-2 -mr-2 rounded-full transition active:opacity-60"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Location indicator */}
        {step !== 'success' && (
          <div className="flex items-center gap-2 px-5 pb-3">
            <MapPin className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span
              className="text-sm truncate"
              style={{ color: 'var(--text-muted)' }}
            >
              {locationText}
            </span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden px-5 pb-8">
          <AnimatePresence mode="wait">
            {/* Step 1: Type selection */}
            {step === 'type' && (
              <motion.div
                key="step-type"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
                className="h-[50vh]"
              >
                <IncidentTypeSelector onSelect={handleTypeSelect} />
              </motion.div>
            )}

            {/* Step 2: Details */}
            {step === 'details' && selectedType && (
              <motion.div
                key="step-details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.15 }}
                className="h-[55vh] overflow-y-auto"
              >
                <IncidentDetailsForm
                  incidentType={selectedType}
                  severity={severity}
                  onSeverityChange={setSeverity}
                  description={description}
                  onDescriptionChange={setDescription}
                  onTypeClick={handleBack}
                  mediaFiles={mediaFiles}
                  onMediaAdd={handleMediaAdd}
                  onMediaRemove={handleMediaRemove}
                  environment={environment}
                  onEnvironmentChange={setEnvironment}
                  urbanContext={urbanContext}
                  onUrbanContextChange={setUrbanContext}
                  urbanContextCustom={urbanContextCustom}
                  onUrbanContextCustomChange={setUrbanContextCustom}
                />
              </motion.div>
            )}

            {/* Success */}
            {step === 'success' && (
              <motion.div
                key="step-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-center py-16"
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: 'var(--accent-glow)' }}
                >
                  <Check className="w-8 h-8" style={{ color: 'var(--accent)' }} />
                </div>
                <h3
                  className="text-lg font-semibold mb-1"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Merci
                </h3>
                <p
                  className="text-sm text-center"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {t('success')}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}
