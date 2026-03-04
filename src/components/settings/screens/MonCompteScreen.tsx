'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Camera, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '@/stores/useStore';
import { supabase } from '@/lib/supabase';
import SettingsSection from '../components/SettingsSection';
import SettingsRow from '../components/SettingsRow';

interface MonCompteScreenProps {
  onBack: () => void;
}

export default function MonCompteScreen({ onBack }: MonCompteScreenProps) {
  const userProfile = useStore((s) => s.userProfile);
  const setUserProfile = useStore((s) => s.setUserProfile);
  const userId = useStore((s) => s.userId);
  const [email, setEmail] = useState<string | null>(null);

  // Avatar
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Name edit
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Account deletion
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
  }, []);

  const name = userProfile?.display_name || 'Utilisateur';
  const initial = name.charAt(0).toUpperCase();

  // --- Avatar upload ---
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setAvatarUploading(true);
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${userId}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });
    if (upErr) {
      toast.error('Erreur lors de l\'upload');
      setAvatarUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const avatar_url = urlData.publicUrl + '?t=' + Date.now();
    const { error: dbErr } = await supabase
      .from('profiles')
      .update({ avatar_url })
      .eq('id', userId);
    if (dbErr) {
      toast.error('Erreur lors de la sauvegarde');
      setAvatarUploading(false);
      return;
    }
    setUserProfile({
      ...(userProfile ?? { id: userId, display_name: null, created_at: new Date().toISOString() }),
      avatar_url,
    });
    toast.success('Photo mise à jour');
    setAvatarUploading(false);
    e.target.value = '';
  };

  // --- Name edit ---
  const startEditingName = () => {
    setNameInput(userProfile?.display_name || '');
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  const saveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || !userId) return;
    setSavingName(true);
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, display_name: trimmed });
    if (error) {
      toast.error('Erreur lors de la sauvegarde');
      setSavingName(false);
      return;
    }
    setUserProfile({
      ...(userProfile ?? { id: userId, display_name: null, created_at: new Date().toISOString() }),
      display_name: trimmed,
    });
    toast.success('Nom mis à jour');
    setSavingName(false);
    setEditingName(false);
  };

  // --- Password change ---
  const handlePasswordChange = async () => {
    if (newPassword.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message);
      setSavingPassword(false);
      return;
    }
    toast.success('Mot de passe mis à jour');
    setSavingPassword(false);
    setShowPasswordForm(false);
    setNewPassword('');
    setConfirmPassword('');
  };

  // --- Account deletion ---
  const handleDeleteAccount = async () => {
    setDeleting(true);
    await supabase.auth.signOut();
    toast.success('Compte supprimé');
    window.location.href = '/';
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
  };

  const btnPrimary: React.CSSProperties = {
    padding: '10px 20px',
    borderRadius: 10,
    background: '#3BB4C1',
    border: 'none',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '20px 20px 12px',
        }}
      >
        <button
          onClick={onBack}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: '#334155',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={18} color="#94A3B8" />
        </button>
        <span style={{ fontSize: 19, fontWeight: 600, color: '#fff' }}>Mon compte</span>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Avatar editor block */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '28px 20px 20px',
          }}
        >
          {/* Avatar with camera button */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3BB4C1, #4A2C5A)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 32,
                fontWeight: 300,
                overflow: 'hidden',
                opacity: avatarUploading ? 0.5 : 1,
                transition: 'opacity 200ms',
              }}
            >
              {avatarUploading ? (
                <span style={{ fontSize: 14, animation: 'pulse 1.5s infinite' }}>…</span>
              ) : userProfile?.avatar_url ? (
                <img
                  src={userProfile.avatar_url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                initial
              )}
            </div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: '#3BB4C1',
                border: '2px solid #0F172A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: avatarUploading ? 'wait' : 'pointer',
                padding: 0,
              }}
            >
              <Camera size={12} color="#fff" />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarUpload}
            />
          </div>

          <span style={{ fontSize: 18, fontWeight: 300, color: '#fff' }}>{name}</span>
          {email && (
            <span style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{email}</span>
          )}
        </div>

        {/* Informations */}
        <SettingsSection label="Informations">
          {editingName ? (
            <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                ref={nameInputRef}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); saveName(); }
                  if (e.key === 'Escape') setEditingName(false);
                }}
                placeholder="Votre nom…"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={saveName}
                disabled={savingName}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(16,185,129,0.15)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Check size={16} color="#10B981" />
              </button>
              <button
                onClick={() => setEditingName(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.06)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={16} color="#64748B" />
              </button>
            </div>
          ) : (
            <SettingsRow
              icon="User"
              iconColor="#22D3EE"
              label="Nom & prénom"
              subtitle={name}
              onPress={startEditingName}
            />
          )}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '0 20px' }} />

          <SettingsRow
            icon="Lock"
            iconColor="#F5C341"
            label="Email & mot de passe"
            subtitle={email || '—'}
            onPress={() => setShowPasswordForm(!showPasswordForm)}
          />
          {showPasswordForm && (
            <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 2 }}>
                Email : {email} (non modifiable)
              </div>
              <input
                type="password"
                placeholder="Nouveau mot de passe (min. 8 car.)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={inputStyle}
              />
              <input
                type="password"
                placeholder="Confirmer le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordChange(); }}
                style={inputStyle}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  onClick={handlePasswordChange}
                  disabled={savingPassword || newPassword.length < 8}
                  style={{
                    ...btnPrimary,
                    opacity: savingPassword || newPassword.length < 8 ? 0.5 : 1,
                  }}
                >
                  {savingPassword ? 'Enregistrement…' : 'Changer le mot de passe'}
                </button>
                <button
                  onClick={() => {
                    setShowPasswordForm(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.06)',
                    border: 'none',
                    color: '#94A3B8',
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </SettingsSection>

        {/* Abonnement */}
        <SettingsSection label="Abonnement">
          <SettingsRow
            icon="Zap"
            iconColor="#F5C341"
            label="Plan actuel"
            subtitle="Gratuit · Breveil Pro bientôt"
            badge="GRATUIT"
          />
        </SettingsSection>

        {/* Danger zone */}
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.1em',
              color: '#64748B',
              padding: '20px 20px 8px',
            }}
          >
            Danger zone
          </div>
          <div
            style={{
              borderRadius: 16,
              border: '1px solid rgba(239,68,68,0.2)',
              overflow: 'hidden',
              margin: '0 16px',
              background: '#1E293B',
            }}
          >
            {showDeleteConfirm ? (
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 14, color: '#F87171', fontWeight: 600 }}>
                  Supprimer mon compte
                </div>
                <div style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.5 }}>
                  Cette action est irréversible. Toutes vos données, signalements et conversations seront supprimés définitivement.
                </div>
                <div style={{ fontSize: 13, color: '#64748B' }}>
                  Tapez <strong style={{ color: '#EF4444' }}>SUPPRIMER</strong> pour confirmer
                </div>
                <input
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder="SUPPRIMER"
                  style={{
                    ...inputStyle,
                    borderColor: deleteInput === 'SUPPRIMER' ? '#EF4444' : undefined,
                  }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteInput !== 'SUPPRIMER' || deleting}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 10,
                      background: deleteInput === 'SUPPRIMER' ? '#EF4444' : 'rgba(239,68,68,0.2)',
                      border: 'none',
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: deleteInput === 'SUPPRIMER' ? 'pointer' : 'not-allowed',
                      opacity: deleting ? 0.5 : 1,
                    }}
                  >
                    {deleting ? 'Suppression…' : 'Supprimer définitivement'}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteInput('');
                    }}
                    style={{
                      padding: '10px 16px',
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.06)',
                      border: 'none',
                      color: '#94A3B8',
                      fontSize: 14,
                      cursor: 'pointer',
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <SettingsRow
                icon="Trash2"
                iconColor="#EF4444"
                label="Supprimer mon compte"
                subtitle="Toutes vos données seront effacées"
                danger
                onPress={() => setShowDeleteConfirm(true)}
              />
            )}
          </div>
        </div>

        {/* Bottom spacing */}
        <div style={{ height: 32 }} />
      </div>
    </div>
  );
}
