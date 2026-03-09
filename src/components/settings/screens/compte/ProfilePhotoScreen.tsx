// src/components/settings/screens/compte/ProfilePhotoScreen.tsx

'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, Image, Trash2 } from 'lucide-react';
import { useTheme } from '@/stores/useTheme';
import { useStore } from '@/stores/useStore';
import { supabase } from '@/lib/supabase';
import { bToast } from '@/components/GlobalToast';
import { springTransition, fadeSlideUp } from './types';

function getColors(isDark: boolean) {
  return isDark ? {
    bg: '#0F172A', sheet: '#1A2540', card: '#1E293B', elevated: '#334155',
    t1: '#FFFFFF', t2: '#94A3B8', t3: '#64748B',
    border: 'rgba(255,255,255,0.08)', borderMid: 'rgba(255,255,255,0.13)',
    inputBg: 'rgba(255,255,255,0.06)', hover: 'rgba(255,255,255,0.05)',
  } : {
    bg: '#F8FAFC', sheet: '#FFFFFF', card: '#FFFFFF', elevated: '#F1F5F9',
    t1: '#0F172A', t2: '#475569', t3: '#94A3B8',
    border: 'rgba(15,23,42,0.07)', borderMid: 'rgba(15,23,42,0.12)',
    inputBg: 'rgba(15,23,42,0.04)', hover: 'rgba(15,23,42,0.03)',
  };
}

const F = {
  cyan: '#3BB4C1', cyanSoft: 'rgba(59,180,193,0.12)',
  gold: '#F5C341',
  success: '#34D399', successSoft: 'rgba(52,211,153,0.12)',
  danger: '#EF4444', dangerSoft: 'rgba(239,68,68,0.10)',
  purple: '#A78BFA', purpleSoft: 'rgba(167,139,250,0.12)',
};

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

interface ProfilePhotoScreenProps {
  firstName: string;
  onBack: () => void;
}

export default function ProfilePhotoScreen({ firstName, onBack }: ProfilePhotoScreenProps) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);
  const userId = useStore((s) => s.userId);
  const userProfile = useStore((s) => s.userProfile);
  const setUserProfile = useStore((s) => s.setUserProfile);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initial = (firstName || 'U').charAt(0).toUpperCase();
  const displayUrl = preview || userProfile?.avatar_url || null;

  // ── Take photo (mobile only) ──
  function handleTakePhoto() {
    // On mobile, input capture=environment triggers camera
    // On desktop, show a toast
    if (/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
      fileInputRef.current?.click();
    } else {
      bToast.info({ title: 'Fonctionnalité mobile uniquement' }, isDark);
    }
  }

  // ── Pick from gallery ──
  function handlePickGallery() {
    fileInputRef.current?.click();
  }

  // ── File selected ──
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    // Validate
    if (!file.type.startsWith('image/')) {
      bToast.danger({ title: 'Fichier invalide — image uniquement' }, isDark);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      bToast.danger({ title: 'Image trop lourde — 5 Mo maximum' }, isDark);
      return;
    }

    // Preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    // Upload
    setUploading(true);
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${userId}/avatar.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (upErr) {
      bToast.danger({ title: 'Erreur lors de l\'upload' }, isDark);
      setPreview(null);
      setUploading(false);
      e.target.value = '';
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const avatar_url = urlData.publicUrl + '?t=' + Date.now();

    await supabase.from('profiles').update({ avatar_url }).eq('id', userId);

    if (userProfile) {
      setUserProfile({ ...userProfile, avatar_url });
    }

    setPreview(null); // clear preview, real URL is now in store
    setUploading(false);
    bToast.success({ title: 'Photo mise à jour' }, isDark);
    e.target.value = '';
  }

  // ── Delete photo ──
  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      confirmTimerRef.current = setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }

    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    setConfirmDelete(false);

    if (!userId) return;
    setUploading(true);

    // Remove from storage (best effort — file may not exist)
    await supabase.storage.from('avatars').remove([`${userId}/avatar.jpg`, `${userId}/avatar.png`, `${userId}/avatar.webp`]);

    // Clear URL in DB
    await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId);

    if (userProfile) {
      setUserProfile({ ...userProfile, avatar_url: null });
    }

    setPreview(null);
    setUploading(false);
    bToast.success({ title: 'Photo supprimée' }, isDark);
  }

  return (
    <>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '20px 20px 12px',
          flexShrink: 0,
        }}
      >
        <button
          onClick={onBack}
          style={{
            width: 36, height: 36, borderRadius: '50%', background: C.elevated,
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <ArrowLeft size={18} color={C.t2} />
        </button>
        <span style={{ fontSize: 19, fontWeight: 600, color: C.t1 }}>Photo de profil</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <motion.div
          variants={stagger}
          initial="initial"
          animate="animate"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '32px 24px',
          }}
        >
          {/* Large avatar */}
          <motion.div
            variants={fadeSlideUp}
            transition={springTransition}
            whileHover={{ scale: 1.03 }}
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3BB4C1, #4A2C5A)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              marginBottom: 32,
              opacity: uploading ? 0.6 : 1,
              transition: 'opacity 200ms',
            }}
          >
            {displayUrl ? (
              <img
                src={displayUrl}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: 48, fontWeight: 300, color: '#FFFFFF' }}>
                {initial}
              </span>
            )}
          </motion.div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {/* ── Button 1: Take photo ── */}
          <motion.div variants={fadeSlideUp} transition={springTransition} style={{ width: '100%', marginBottom: 10 }}>
            <button
              onClick={handleTakePhoto}
              disabled={uploading}
              style={{
                width: '100%',
                padding: '14px 0',
                borderRadius: 14,
                background: F.cyan,
                border: 'none',
                color: '#FFFFFF',
                fontSize: 15,
                fontWeight: 700,
                cursor: uploading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Camera size={17} />
              Prendre une photo
            </button>
          </motion.div>

          {/* ── Button 2: Pick from gallery ── */}
          <motion.div variants={fadeSlideUp} transition={springTransition} style={{ width: '100%', marginBottom: 10 }}>
            <button
              onClick={handlePickGallery}
              disabled={uploading}
              style={{
                width: '100%',
                padding: '14px 0',
                borderRadius: 14,
                background: C.card,
                border: `1px solid ${C.borderMid}`,
                color: C.t1,
                fontSize: 15,
                fontWeight: 600,
                cursor: uploading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Image size={17} color={C.t2} />
              Choisir depuis la galerie
            </button>
          </motion.div>

          {/* ── Button 3: Delete photo ── */}
          <motion.div variants={fadeSlideUp} transition={springTransition} style={{ width: '100%' }}>
            <button
              onClick={handleDelete}
              disabled={uploading || (!displayUrl && !confirmDelete)}
              style={{
                width: '100%',
                padding: '14px 0',
                borderRadius: 14,
                background: confirmDelete ? F.danger : F.dangerSoft,
                border: 'none',
                color: confirmDelete ? '#FFFFFF' : F.danger,
                fontSize: 15,
                fontWeight: 700,
                cursor: !displayUrl && !confirmDelete ? 'not-allowed' : uploading ? 'wait' : 'pointer',
                opacity: !displayUrl && !confirmDelete ? 0.4 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'background 200ms, color 200ms',
              }}
            >
              <Trash2 size={15} />
              {confirmDelete ? 'Confirmer la suppression' : 'Supprimer la photo'}
            </button>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}
