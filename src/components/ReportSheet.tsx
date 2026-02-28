// src/components/ReportSheet.tsx — 3-tap report wizard

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { X, ArrowLeft, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { CATEGORIES, REPORT_CATEGORIES, SEVERITY, ENVIRONMENTS, URBAN_CONTEXTS, MediaItem } from '@/types';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { enqueue, getCount } from '@/lib/offlineQueue';
import { springTransition } from '@/lib/utils';
import { geocodeReverse } from '@/lib/geocode';

type LocalMedia = {
  file: File;
  preview: string;
  type: 'image' | 'video' | 'audio';
};

type Step = 'category' | 'severity';

function detectType(file: File): 'image' | 'video' | 'audio' {
  if (file.type.startsWith('image')) return 'image';
  if (file.type.startsWith('video')) return 'video';
  return 'audio';
}

export default function ReportSheet({ userId }: { userId: string | null }) {
  const { setActiveSheet, newPinCoords, setNewPinCoords, addPin, setOfflineQueueCount, setShowWalkWithMe } = useStore();
  const t = useTranslations('report');
  const focusTrapRef = useFocusTrap(true, handleClose);

  // Step state
  const [step, setStep] = useState<Step>('category');

  // Form data
  const [category, setCategory] = useState<string | null>(null);
  const [severity, setSeverity] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<string | null>(null);
  const [urbanContext, setUrbanContext] = useState<string | null>(null);
  const [urbanContextCustom, setUrbanContextCustom] = useState('');
  const [isMoving, setIsMoving] = useState(false);
  const [description, setDescription] = useState('');
  const [mediaFiles, setMediaFiles] = useState<LocalMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAutoLocation, setIsAutoLocation] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [addrLoading, setAddrLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-set location to current GPS position on mount
  useEffect(() => {
    const { userLocation, newPinCoords: existing } = useStore.getState();
    if (!existing && userLocation) {
      setNewPinCoords(userLocation);
      setIsAutoLocation(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reverse geocode pin coords → address
  useEffect(() => {
    if (!newPinCoords) { setAddrLoading(false); return; }
    setAddrLoading(true);
    geocodeReverse(newPinCoords.lng, newPinCoords.lat)
      .then((addr) => { if (addr) setAddress(addr); })
      .catch(() => {})
      .finally(() => setAddrLoading(false));
  }, [newPinCoords]);

  function handleMediaAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - mediaFiles.length;
    if (remaining <= 0) { toast.error('You can attach up to 5 files'); return; }
    const toAdd = files.slice(0, remaining).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      type: detectType(file),
    }));
    setMediaFiles((prev) => [...prev, ...toAdd]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeMedia(index: number) {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!category) { toast.error('Pick a category'); return; }
    if (!severity) { toast.error('Select severity'); return; }
    if (!newPinCoords) { toast.error('Tap the map to set location'); return; }
    if (!userId) { toast.error('Please sign in first'); return; }

    setLoading(true);

    // ── Offline: queue and register background sync ─────────────────────
    if (!navigator.onLine) {
      const mediaBlobs = await Promise.all(
        mediaFiles.map(async (m) => ({
          name: m.file.name,
          type: m.file.type,
          blob: m.file as Blob,
        }))
      );
      await enqueue({
        id: crypto.randomUUID(),
        user_id: userId,
        lat: newPinCoords.lat,
        lng: newPinCoords.lng,
        category,
        severity,
        environment: environment || null,
        urban_context: urbanContext || null,
        urban_context_custom: urbanContext === 'other' && urbanContextCustom.trim() ? urbanContextCustom.trim() : null,
        is_moving: isMoving,
        description: [description].filter(Boolean).join('\n') || 'No description.',
        media_blobs: mediaBlobs,
        created_at: new Date().toISOString(),
      });
      const count = await getCount();
      setOfflineQueueCount(count);
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        const reg = await navigator.serviceWorker.ready;
        await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync.register('brume-sync-pins');
      }
      toast.success(t('queued'));
      setActiveSheet('none');
      setNewPinCoords(null);
      setLoading(false);
      return;
    }

    // Upload all media files
    const uploaded: MediaItem[] = [];
    for (const media of mediaFiles) {
      const fileName = `${userId}/${Date.now()}-${media.file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('pin-photos')
        .upload(fileName, media.file);
      if (uploadError) {
        toast.error('Could not upload file. Check your connection.');
        setLoading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('pin-photos').getPublicUrl(fileName);
      uploaded.push({ url: urlData.publicUrl, type: media.type });
    }

    // Keep photo_url for backward compat (first image)
    const firstImage = uploaded.find((m) => m.type === 'image');

    const { data: newPin, error } = await supabase
      .from('pins')
      .insert({
        user_id: userId,
        lat: newPinCoords.lat,
        lng: newPinCoords.lng,
        category,
        severity,
        environment: environment || null,
        urban_context: urbanContext || null,
        urban_context_custom: urbanContext === 'other' && urbanContextCustom.trim() ? urbanContextCustom.trim() : null,
        is_moving: isMoving,
        description: [description].filter(Boolean).join('\n') || 'No description.',
        photo_url: firstImage?.url ?? null,
        media_urls: uploaded.length > 0 ? uploaded : null,
      })
      .select()
      .single();

    if (error) {
      toast.error('Something went wrong. Please try again.');
      console.error('Insert error:', error);
      setLoading(false);
      return;
    }

    // Immediately add to store so the map updates without waiting for realtime
    if (newPin) addPin(newPin as import('@/types').Pin);

    // Record initial evidence (the original report)
    if (newPin) {
      supabase.from('pin_evidence').insert({
        pin_id: newPin.id,
        user_id: userId,
        activity: 'report',
        content: description || null,
        media_urls: uploaded.length > 0 ? uploaded : null,
      }).then(() => {}); // fire-and-forget
    }

    // Human post-submit toast + Walk With Me offer for high severity
    if (severity === 'high') {
      toast('Report submitted. Stay safe.', {
        action: {
          label: 'Walk With Me',
          onClick: () => setShowWalkWithMe(true),
        },
      });
    } else {
      toast.success('Report submitted. Stay safe.');
    }

    setActiveSheet('none');
    setNewPinCoords(null);
    setLoading(false);
  }

  function handleClose() {
    setActiveSheet('none');
    setNewPinCoords(null);
  }

  function handleCategorySelect(key: string) {
    setCategory(key);
    setStep('severity');
  }

  function handleBack() {
    if (step === 'severity') {
      setStep('category');
    } else {
      handleClose();
    }
  }

  return (
    <>
      <motion.div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Report incident"
        className="sheet-motion absolute bottom-0 left-1/2 -translate-x-1/2 w-[92%] max-w-[440px] rounded-t-2xl z-[201] max-h-[80dvh] overflow-y-auto lg:bottom-2 lg:left-2 lg:translate-x-0 lg:w-[380px] lg:max-w-none lg:rounded-2xl"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          boxShadow: '0 -10px 40px var(--bg-overlay)',
        }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={springTransition}
      >
        <div className="w-9 h-1 rounded-full mx-auto mt-3" style={{ backgroundColor: 'var(--border)' }} />

        <div className="p-5 pb-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handleBack}
                className="p-1.5 rounded-full transition active:opacity-60"
                style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-card)' }}
                aria-label="Back"
              >
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {step === 'category' ? t('category') : t('severity')}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-full transition active:opacity-60"
              style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-card)' }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {/* ── Step 1: Category ─────────────────────────────────────── */}
            {step === 'category' && (
              <motion.div
                key="step-category"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
              >
                {/* Address indicator */}
                <div className="flex items-center gap-1.5 mb-3 px-1" style={{ color: 'var(--text-muted)' }}>
                  <MapPin size={13} className="shrink-0" />
                  <span className="text-xs truncate">
                    {addrLoading ? t('loadingAddress') : address || t('unknownAddress')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(REPORT_CATEGORIES).map(([key, { label, emoji }]) => (
                    <button
                      key={key}
                      onClick={() => handleCategorySelect(key)}
                      className="rounded-xl p-2.5 text-center border-2 transition active:scale-95"
                      style={{
                        borderColor: category === key ? 'var(--accent)' : 'transparent',
                        backgroundColor: category === key ? 'var(--accent-glow)' : 'var(--bg-card)',
                      }}
                    >
                      <span className="text-lg block mb-1">{emoji}</span>
                      <span
                        className="text-[0.65rem] font-bold leading-tight block"
                        style={{ color: category === key ? 'var(--accent)' : 'var(--text-primary)' }}
                      >
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Severity + Submit ────────────────────────────── */}
            {step === 'severity' && (
              <motion.div
                key="step-severity"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.15 }}
              >
                {/* Selected category indicator */}
                {category && (
                  <button
                    onClick={() => setStep('category')}
                    className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl transition active:opacity-70"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  >
                    <span className="text-lg">{CATEGORIES[category as keyof typeof CATEGORIES]?.emoji}</span>
                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {CATEGORIES[category as keyof typeof CATEGORIES]?.label}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>— tap to change</span>
                  </button>
                )}

                {/* Severity pills */}
                <div className="flex gap-2.5 mb-5">
                  {Object.entries(SEVERITY).map(([key, { label, emoji, color }]) => (
                    <button
                      key={key}
                      onClick={() => setSeverity(key)}
                      className="flex-1 py-4 rounded-2xl border-2 text-center font-bold transition active:scale-95"
                      style={
                        severity === key
                          ? { borderColor: color, color, backgroundColor: color + '18' }
                          : { borderColor: 'var(--border)', color: 'var(--text-muted)' }
                      }
                    >
                      <span className="text-2xl block mb-1">{emoji}</span>
                      <span className="text-xs">{label}</span>
                    </button>
                  ))}
                </div>

                {/* Submit button — visible as soon as severity is selected */}
                <button
                  onClick={handleSubmit}
                  disabled={loading || !severity}
                  className="w-full bg-gradient-to-r from-[#D4A853] to-[#B8923E] text-white font-bold rounded-xl py-4 text-sm shadow-lg disabled:opacity-40 transition mb-4"
                  style={{ boxShadow: severity ? '0 8px 24px var(--accent-glow)' : 'none' }}
                >
                  {loading ? t('submitting') : t('submit')}
                </button>

                {/* Collapsed optional details */}
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {showDetails ? 'Hide details' : 'Add details (optional)'}
                </button>

                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="pt-4 space-y-4">
                        {/* Description */}
                        <div>
                          <label className="block text-[0.7rem] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                            {t('description')}
                          </label>
                          <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('descriptionPlaceholder')}
                            rows={2}
                            className="w-full rounded-xl text-sm p-3 outline-none transition resize-none"
                            style={{
                              backgroundColor: 'var(--bg-card)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-primary)',
                            }}
                          />
                        </div>

                        {/* Media upload */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-[0.7rem] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                              {t('addMedia')}
                            </label>
                            <span className="text-[0.65rem]" style={{ color: 'var(--text-muted)' }}>{mediaFiles.length}/5</span>
                          </div>

                          {mediaFiles.length > 0 && (
                            <div className="flex gap-2 mb-3 flex-wrap">
                              {mediaFiles.map((m, i) => (
                                <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0"
                                  style={{ border: '1px solid var(--border)' }}>
                                  {m.type === 'image' && (
                                    <img src={m.preview} alt="" className="w-full h-full object-cover" />
                                  )}
                                  {m.type === 'video' && (
                                    <video src={m.preview} className="w-full h-full object-cover" muted />
                                  )}
                                  {m.type === 'audio' && (
                                    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-card)' }}>
                                      <span className="text-xl">🎵</span>
                                    </div>
                                  )}
                                  <button
                                    onClick={() => removeMedia(i)}
                                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[0.5rem]"
                                    style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {mediaFiles.length < 5 && (
                            <label
                              className="flex items-center gap-2 border-2 border-dashed rounded-xl p-3 cursor-pointer transition"
                              style={{ borderColor: 'var(--border)' }}
                            >
                              <span className="text-lg">📎</span>
                              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                                {t('addMedia')}
                              </span>
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,video/*,audio/*"
                                multiple
                                onChange={handleMediaAdd}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>

                        {/* Environment */}
                        <div>
                          <label className="block text-[0.7rem] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                            {t('environment')}
                          </label>
                          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                            {Object.entries(ENVIRONMENTS).map(([key, { label, emoji }]) => (
                              <button
                                key={key}
                                onClick={() => setEnvironment(environment === key ? null : key)}
                                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition whitespace-nowrap"
                                style={
                                  environment === key
                                    ? { borderColor: 'var(--accent)', color: 'var(--accent)', backgroundColor: 'var(--accent-glow)' }
                                    : { borderColor: 'var(--border)', color: 'var(--text-muted)', backgroundColor: 'transparent' }
                                }
                              >
                                {emoji} {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Urban context */}
                        <div>
                          <label className="block text-[0.7rem] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                            {t('urbanContext')}
                          </label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {Object.entries(URBAN_CONTEXTS).map(([key, { label, emoji }]) => (
                              <button
                                key={key}
                                onClick={() => setUrbanContext(urbanContext === key ? null : key)}
                                className="rounded-xl py-2 px-1 text-center border transition"
                                style={{
                                  borderColor: urbanContext === key ? 'var(--accent)' : 'var(--border)',
                                  backgroundColor: urbanContext === key ? 'var(--accent-glow)' : 'var(--bg-card)',
                                }}
                              >
                                <span className="text-base block mb-0.5">{emoji}</span>
                                <span
                                  className="text-[0.6rem] font-bold leading-tight block"
                                  style={{ color: urbanContext === key ? 'var(--accent)' : 'var(--text-muted)' }}
                                >
                                  {label}
                                </span>
                              </button>
                            ))}
                          </div>
                          {urbanContext === 'other' && (
                            <input
                              type="text"
                              value={urbanContextCustom}
                              onChange={(e) => setUrbanContextCustom(e.target.value)}
                              placeholder="Specify location…"
                              className="w-full text-xs rounded-xl px-3 py-2 outline-none mt-2"
                              style={{
                                backgroundColor: 'var(--bg-card)',
                                border: '1px solid var(--accent)',
                                color: 'var(--text-primary)',
                              }}
                            />
                          )}
                        </div>

                        {/* Moving toggle */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[0.7rem] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                              {t('isMoving')}
                            </p>
                            <p className="text-[0.65rem] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              Were you moving (bus, car, bike…)?
                            </p>
                          </div>
                          <button
                            onClick={() => setIsMoving(!isMoving)}
                            className="relative inline-flex items-center h-6 w-11 rounded-full transition-colors shrink-0"
                            style={{ backgroundColor: isMoving ? 'var(--accent)' : 'var(--border)' }}
                          >
                            <span
                              className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
                              style={{ transform: isMoving ? 'translateX(1.375rem)' : 'translateX(0.25rem)' }}
                            />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}
