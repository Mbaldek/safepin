// src/components/ReportSheet.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { CATEGORIES, SEVERITY } from '@/types';
import { toast } from 'sonner';

export default function ReportSheet({ userId }: { userId: string | null }) {
  const { setActiveSheet, newPinCoords, setNewPinCoords } = useStore();
  const [category, setCategory] = useState<string | null>(null);
  const [severity, setSeverity] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [showCoords, setShowCoords] = useState(false);
  const [accessInfo, setAccessInfo] = useState('');

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

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit() {
    if (!category) { toast.error('Pick a category'); return; }
    if (!severity) { toast.error('Select severity'); return; }
    if (!newPinCoords) { toast.error('Tap the map to set location'); return; }
    if (!userId) { toast.error('Not signed in'); return; }

    setLoading(true);

    let photo_url: string | null = null;
    if (photo) {
      const fileName = `${userId}/${Date.now()}-${photo.name}`;
      const { error: uploadError } = await supabase.storage
        .from('pin-photos')
        .upload(fileName, photo);

      if (uploadError) {
        toast.error('Photo upload failed: ' + uploadError.message);
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('pin-photos')
        .getPublicUrl(fileName);
      photo_url = urlData.publicUrl;
    }

    const { error } = await supabase
      .from('pins')
      .insert({
        user_id: userId,
        lat: newPinCoords.lat,
        lng: newPinCoords.lng,
        category,
        severity,
        description: [description, accessInfo ? `Access: ${accessInfo}` : ''].filter(Boolean).join('\n') || 'No description.',
        photo_url,
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
        className="absolute bottom-0 left-0 right-0 rounded-t-3xl z-[201] max-h-[55dvh] overflow-y-auto animate-slide-up"
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
                    Location confirmed
                  </p>
                  <p className="text-sm leading-snug break-words" style={{ color: 'var(--text-primary)' }}>
                    {addressLoading ? '⏳ Fetching address…' : address ?? '📍 Address not found'}
                  </p>
                </div>
              </div>
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
              👆 Tap the map above to set location
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

          {/* Photo upload */}
          <label className="block text-[0.7rem] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Photo evidence (optional)
          </label>
          <label
            className="block border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition mb-4"
            style={{ borderColor: 'var(--border)' }}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" className="w-full h-24 object-cover rounded-lg" />
            ) : (
              <>
                <span className="text-2xl block mb-1">📎</span>
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Tap to attach photo</span>
              </>
            )}
            <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
          </label>

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
            {loading ? 'Submitting...' : 'Submit report'}
          </button>
        </div>
      </div>
    </>
  );
}