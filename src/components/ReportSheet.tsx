// src/components/ReportSheet.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { CATEGORIES, SEVERITY, ENVIRONMENTS, URBAN_CONTEXTS, MediaItem } from '@/types';
import { toast } from 'sonner';

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

export default function ReportSheet({ userId }: { userId: string | null }) {
  const { setActiveSheet, newPinCoords, setNewPinCoords } = useStore();
  const [category, setCategory] = useState<string | null>(null);
  const [severity, setSeverity] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<string | null>(null);
  const [urbanContext, setUrbanContext] = useState<string | null>(null);
  const [urbanContextCustom, setUrbanContextCustom] = useState('');
  const [isMoving, setIsMoving] = useState(false);
  const [description, setDescription] = useState('');
  const [mediaFiles, setMediaFiles] = useState<LocalMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [showCoords, setShowCoords] = useState(false);
  const [accessInfo, setAccessInfo] = useState('');
  const [isAutoLocation, setIsAutoLocation] = useState(false);
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

  useEffect(() => {
    if (!newPinCoords) {
      setAddress(null);
      return;
    }
    setAddressLoading(true);
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${newPinCoords.lng},${newPinCoords.lat}.json?access_token=${token}&types=address,poi&limit=1&language=fr,en`
    )
      .then((r) => r.json())
      .then((data) => setAddress(data.features?.[0]?.place_name || null))
      .catch(() => setAddress(null))
      .finally(() => setAddressLoading(false));
  }, [newPinCoords]);

  function handleMediaAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - mediaFiles.length;
    if (remaining <= 0) { toast.error('Max 5 media files'); return; }
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
    if (!userId) { toast.error('Not signed in'); return; }

    setLoading(true);

    // Upload all media files
    const uploaded: MediaItem[] = [];
    for (const media of mediaFiles) {
      const fileName = `${userId}/${Date.now()}-${media.file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('pin-photos')
        .upload(fileName, media.file);
      if (uploadError) {
        toast.error(`Upload failed: ${media.file.name}`);
        setLoading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('pin-photos').getPublicUrl(fileName);
      uploaded.push({ url: urlData.publicUrl, type: media.type });
    }

    // Keep photo_url for backward compat (first image)
    const firstImage = uploaded.find((m) => m.type === 'image');

    const { error } = await supabase
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
        description: [description, accessInfo ? `Access: ${accessInfo}` : ''].filter(Boolean).join('\n') || 'No description.',
        photo_url: firstImage?.url ?? null,
        media_urls: uploaded.length > 0 ? uploaded : null,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to submit: ' + error.message);
      console.error('Insert error:', error);
      setLoading(false);
      return;
    }

    toast.success('Report submitted!');
    setActiveSheet('none');
    setNewPinCoords(null);
    setLoading(false);
  }

  function handleClose() {
    setActiveSheet('none');
    setNewPinCoords(null);
  }

  return (
    <>
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[92%] max-w-[440px] rounded-t-3xl z-[201] max-h-[60dvh] overflow-y-auto animate-slide-up"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          boxShadow: '0 -10px 40px var(--bg-overlay)',
        }}
      >
        <div className="w-9 h-1 rounded-full mx-auto mt-3" style={{ backgroundColor: 'var(--border)' }} />

        <div className="p-5 pb-10">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Report a situation</h2>
            <button
              onClick={handleClose}
              className="text-xs rounded-full px-3 py-1.5 font-bold transition hover:opacity-80"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              ✕ Close
            </button>
          </div>

          {/* Location status */}
          {newPinCoords ? (
            <div
              className="mb-5 rounded-xl p-3"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-start gap-2 mb-2">
                <span className="text-base leading-tight mt-0.5 font-bold" style={{ color: 'var(--safe)' }}>✓</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[0.65rem] font-bold uppercase tracking-wider mb-0.5" style={{ color: 'var(--safe)' }}>
                    {isAutoLocation ? '📍 Your current location' : 'Location confirmed'}
                  </p>
                  <p className="text-sm leading-snug" style={{ color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                    {addressLoading ? '⏳ Fetching address…' : address ?? '📍 Address not found'}
                  </p>
                </div>
              </div>
              {isAutoLocation ? (
                <button
                  onClick={() => { setNewPinCoords(null); setIsAutoLocation(false); }}
                  className="text-[0.65rem] font-bold transition hover:opacity-70"
                  style={{ color: 'var(--text-muted)' }}
                >
                  📌 Use a different spot? Tap the map above
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowCoords(!showCoords)}
                    className="text-[0.65rem] font-bold transition hover:opacity-70"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {showCoords ? '▲ Hide coordinates' : '▼ Show coordinates'}
                  </button>
                  {showCoords && (
                    <p className="text-[0.65rem] mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>
                      {newPinCoords.lat.toFixed(6)}°N, {newPinCoords.lng.toFixed(6)}°E
                    </p>
                  )}
                </>
              )}
              <input
                type="text"
                value={accessInfo}
                onChange={(e) => setAccessInfo(e.target.value)}
                placeholder="Access details (optional) — e.g. alley behind the park, gate #3…"
                className="w-full mt-2.5 text-xs rounded-lg px-2.5 py-2 outline-none"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          ) : (
            <p className="text-xs font-medium mb-5" style={{ color: 'var(--text-muted)' }}>
              👆 Tap the map above to set a different location
            </p>
          )}

          {/* Category grid */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {Object.entries(CATEGORIES).map(([key, { label, emoji }]) => (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className="rounded-xl p-3 text-center border-2 transition"
                style={{
                  borderColor: category === key ? 'var(--accent)' : 'transparent',
                  backgroundColor: category === key ? 'var(--accent-glow)' : 'var(--bg-card)',
                }}
              >
                <span className="text-xl block mb-1">{emoji}</span>
                <span
                  className="text-[0.68rem] font-bold"
                  style={{ color: category === key ? 'var(--accent)' : 'var(--text-muted)' }}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>

          {/* Environment (optional) */}
          <label className="block text-[0.7rem] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Context (optional)
          </label>
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5 no-scrollbar">
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

          {/* Urban context */}
          <label className="block text-[0.7rem] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Location type (optional)
          </label>
          <div className="grid grid-cols-3 gap-1.5 mb-2">
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
              className="w-full text-xs rounded-xl px-3 py-2 outline-none mb-3"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--accent)',
                color: 'var(--text-primary)',
              }}
            />
          )}

          {/* Moving toggle */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[0.7rem] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                In motion?
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

          {/* Description */}
          <label className="block text-[0.7rem] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Describe what happened
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Man shouting near bus stop..."
            rows={2}
            className="w-full rounded-xl text-sm p-3 outline-none transition resize-none mb-4"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          />

          {/* Multi-media upload */}
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[0.7rem] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Media (optional)
            </label>
            <span className="text-[0.65rem]" style={{ color: 'var(--text-muted)' }}>{mediaFiles.length}/5</span>
          </div>

          {mediaFiles.length > 0 && (
            <div className="flex gap-2 mb-3 flex-wrap">
              {mediaFiles.map((m, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0"
                  style={{ border: '1px solid var(--border)' }}>
                  {m.type === 'image' && (
                    <img src={m.preview} alt="" className="w-full h-full object-cover" />
                  )}
                  {m.type === 'video' && (
                    <video src={m.preview} className="w-full h-full object-cover" muted />
                  )}
                  {m.type === 'audio' && (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1"
                      style={{ backgroundColor: 'var(--bg-card)' }}>
                      <span className="text-2xl">🎵</span>
                      <span className="text-[0.6rem] font-bold" style={{ color: 'var(--text-muted)' }}>
                        {m.file.name.slice(0, 8)}…
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => removeMedia(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[0.6rem] font-bold"
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}
                  >
                    ✕
                  </button>
                  <div className="absolute bottom-1 left-1 text-[0.55rem] px-1 rounded font-bold"
                    style={{ backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff' }}>
                    {m.type === 'image' ? '📷' : m.type === 'video' ? '🎬' : '🎵'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {mediaFiles.length < 5 && (
            <label
              className="flex items-center gap-2 border-2 border-dashed rounded-xl p-3 cursor-pointer transition mb-4"
              style={{ borderColor: 'var(--border)' }}
            >
              <span className="text-xl">📎</span>
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                Add photo, video or audio…
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

          {/* Severity */}
          <label className="block text-[0.7rem] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Severity
          </label>
          <div className="flex gap-2 mb-5">
            {Object.entries(SEVERITY).map(([key, { label, emoji, color }]) => (
              <button
                key={key}
                onClick={() => setSeverity(key)}
                className="flex-1 py-2.5 rounded-xl border-2 text-xs font-bold transition"
                style={
                  severity === key
                    ? { borderColor: color, color, backgroundColor: color + '12' }
                    : { borderColor: 'var(--border)', color: 'var(--text-muted)' }
                }
              >
                {emoji} {label}
              </button>
            ))}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#f43f5e] to-[#e11d48] text-white font-bold rounded-xl py-4 text-sm shadow-lg disabled:opacity-50 transition"
            style={{ boxShadow: '0 8px 24px var(--accent-glow)' }}
          >
            {loading ? 'Submitting…' : 'Submit report'}
          </button>
        </div>
      </div>
    </>
  );
}
