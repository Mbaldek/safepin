// src/components/ReportSheet.tsx

'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { CATEGORIES, SEVERITY } from '@/types';
import { toast } from 'sonner';

export default function ReportSheet({ userId }: { userId: string | null }) {
  const { setActiveSheet, addPin, newPinCoords, setNewPinCoords } = useStore();
  const [category, setCategory] = useState<string | null>(null);
  const [severity, setSeverity] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

    // Upload photo if present
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

    const { data, error } = await supabase
      .from('pins')
      .insert({
        user_id: userId,
        lat: newPinCoords.lat,
        lng: newPinCoords.lng,
        category,
        severity,
        description: description || 'No description.',
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

    toast.success('📍 Report submitted!');
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
      {/* NO full-screen backdrop — map stays tappable above the sheet */}

      {/* Sheet — sits at the bottom, map is visible and tappable above */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#12151c] rounded-t-3xl z-[201] max-h-[55dvh] overflow-y-auto animate-slide-up shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        {/* Handle */}
        <div className="w-9 h-1 bg-[rgba(255,255,255,0.1)] rounded-full mx-auto mt-3" />

        <div className="p-5 pb-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold">Report a situation</h2>
            <button onClick={handleClose} className="text-xs text-[#6b7490] border border-[rgba(255,255,255,0.1)] rounded-full px-3 py-1.5 font-bold hover:text-white transition">
              ✕ Close
            </button>
          </div>
          <p className="text-xs text-[#6b7490] font-medium mb-5">
            {newPinCoords
              ? `📍 ${newPinCoords.lat.toFixed(4)}°N, ${newPinCoords.lng.toFixed(4)}°E`
              : '👆 Tap the map above to set location'}
          </p>

          {/* Category grid */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {Object.entries(CATEGORIES).map(([key, { label, emoji }]) => (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={`rounded-xl p-3 text-center border-2 transition ${
                  category === key
                    ? 'border-[#f43f5e] bg-[rgba(244,63,94,0.08)]'
                    : 'border-transparent bg-[#191d28] hover:border-[rgba(255,255,255,0.1)]'
                }`}
              >
                <span className="text-xl block mb-1">{emoji}</span>
                <span className={`text-[0.68rem] font-bold ${category === key ? 'text-[#fb7185]' : 'text-[#6b7490]'}`}>
                  {label}
                </span>
              </button>
            ))}
          </div>

          {/* Description */}
          <label className="block text-[0.7rem] font-bold text-[#6b7490] uppercase tracking-wider mb-1.5">
            Describe what happened
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Man shouting near bus stop…"
            rows={2}
            className="w-full bg-[#191d28] border border-[rgba(255,255,255,0.06)] rounded-xl text-sm text-white p-3 outline-none focus:border-[#f43f5e] transition resize-none mb-4 placeholder:text-[#4a5068]"
          />

          {/* Photo upload */}
          <label className="block text-[0.7rem] font-bold text-[#6b7490] uppercase tracking-wider mb-1.5">
            Photo evidence (optional)
          </label>
          <label className="block border-2 border-dashed border-[rgba(255,255,255,0.08)] rounded-xl p-4 text-center cursor-pointer hover:border-[#f43f5e] transition mb-4">
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" className="w-full h-24 object-cover rounded-lg" />
            ) : (
              <>
                <span className="text-2xl block mb-1">📎</span>
                <span className="text-xs text-[#6b7490] font-medium">Tap to attach photo</span>
              </>
            )}
            <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
          </label>

          {/* Severity */}
          <label className="block text-[0.7rem] font-bold text-[#6b7490] uppercase tracking-wider mb-1.5">
            Severity
          </label>
          <div className="flex gap-2 mb-5">
            {Object.entries(SEVERITY).map(([key, { label, emoji, color }]) => (
              <button
                key={key}
                onClick={() => setSeverity(key)}
                className={`flex-1 py-2.5 rounded-xl border-2 text-xs font-bold transition ${
                  severity === key
                    ? `border-[${color}] text-[${color}]`
                    : 'border-[rgba(255,255,255,0.06)] text-[#6b7490]'
                }`}
                style={severity === key ? { borderColor: color, color, backgroundColor: color + '12' } : {}}
              >
                {emoji} {label}
              </button>
            ))}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#f43f5e] to-[#e11d48] text-white font-bold rounded-xl py-4 text-sm shadow-lg shadow-[rgba(244,63,94,0.25)] disabled:opacity-50 transition"
          >
            {loading ? 'Submitting…' : '📍 Submit report'}
          </button>
        </div>
      </div>
    </>
  );
}
