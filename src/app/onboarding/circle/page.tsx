// src/app/onboarding/circle/page.tsx — Step 4/5: Trusted Circle
// Searches profiles by name → inserts into trusted_circle → progress 90%
// 'Continuer' and 'J'ajouterai plus tard' both set onboarding_step=4 → /onboarding/welcome

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';

// ─── Icons ────────────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function AvatarCircle({ name }: { name: string }) {
  const initial = (name?.[0] ?? '?').toUpperCase();
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] font-bold"
      style={{
        background: 'linear-gradient(135deg, #E8A838 0%, #8B7EC8 100%)',
        color: '#FFFFFF',
      }}
    >
      {initial}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Profile = { id: string; name: string | null; display_name: string | null };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingCirclePage() {
  const router = useRouter();
  const t = useTranslations('onboarding');
  const userId = useStore((s) => s.userId);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [toast, setToast] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Search profiles by name ──────────────────────────────────────────────

  const search = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) { setResults([]); setShowDropdown(false); return; }
      const { data } = await supabase
        .from('profiles')
        .select('id, name, display_name')
        .ilike('name', `%${q.trim()}%`)
        .neq('id', userId ?? '')
        .limit(8);
      const filtered = (data ?? []).filter(
        (p) => !contacts.some((c) => c.id === p.id),
      );
      setResults(filtered);
      setShowDropdown(filtered.length > 0);
    },
    [userId, contacts],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  // ── Add contact ─────────────────────────────────────────────────────────

  async function addContact(profile: Profile) {
    if (!userId) return;
    setShowDropdown(false);
    setQuery('');
    setResults([]);
    setContacts((prev) => [...prev, profile]);
    await supabase.from('trusted_circle').upsert(
      { user_id: userId, contact_id: profile.id },
      { onConflict: 'user_id,contact_id' },
    );
    setToast(true);
    setTimeout(() => setToast(false), 3000);
    inputRef.current?.focus();
  }

  // ── Remove contact ───────────────────────────────────────────────────────

  async function removeContact(profile: Profile) {
    if (!userId) return;
    setContacts((prev) => prev.filter((c) => c.id !== profile.id));
    await supabase.from('trusted_circle')
      .delete()
      .eq('user_id', userId)
      .eq('contact_id', profile.id);
  }

  // ── Finish ───────────────────────────────────────────────────────────────

  async function finish() {
    if (!userId) { router.push('/onboarding/welcome'); return; }
    setSaving(true);
    await supabase.from('profiles').update({ onboarding_step: 4 }).eq('id', userId);
    router.push('/onboarding/welcome');
  }

  const displayName = (p: Profile) => p.name ?? p.display_name ?? '?';

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>

      {/* Progress bar — 90% */}
      <div style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ width: '90%', height: '100%', backgroundColor: 'var(--accent)', transition: 'width 0.5s ease-out' }} />
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div className="max-w-sm mx-auto w-full px-5 pb-6 flex flex-col" style={{ flex: 1 }}>

          {/* Skip */}
          <div className="flex justify-end pt-5 pb-6">
            <button
              onClick={finish}
              className="text-[13px] transition-colors"
              style={{ color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {t('skipBtn')}
            </button>
          </div>

          {/* Heading */}
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.625rem', fontWeight: 300, lineHeight: 1.25 }}>
            {t('circleTitle')}
          </h1>
          <p className="mt-2 mb-6 text-[14px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {t('circleSub')}
          </p>

          {/* Search input + dropdown */}
          <div className="relative mb-5">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <SearchIcon />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder={t('circlePlaceholder')}
              className="w-full rounded-xl py-3 pl-9 pr-4 text-[14px] outline-none focus:ring-1"
              style={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--text-primary)',
              }}
            />

            {showDropdown && (
              <div
                className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-xl border"
                style={{ backgroundColor: '#1F2D4D', borderColor: 'rgba(255,255,255,0.08)' }}
              >
                {results.length === 0 ? (
                  <div className="px-4 py-3 text-[14px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {t('circleNoResults')}
                  </div>
                ) : (
                  results.map((p) => (
                    <button
                      key={p.id}
                      onMouseDown={() => addContact(p)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                    >
                      <AvatarCircle name={displayName(p)} />
                      <span className="text-[14px]" style={{ color: 'var(--text-primary)' }}>{displayName(p)}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Contact list or empty state */}
          <div className="flex-1">
            {contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <span className="text-[32px] mb-3">💛</span>
                <p className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
                  {t('circleEmptyTitle')}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {t('circleEmptyBody')}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {contacts.map((c, i) => (
                  <div
                    key={c.id}
                    className="animate-fade-in-up flex items-center gap-3 rounded-xl border px-3 py-2.5"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      borderColor: 'rgba(255,255,255,0.08)',
                      animationDelay: `${i * 60}ms`,
                    }}
                  >
                    <AvatarCircle name={displayName(c)} />
                    <span className="flex-1 text-[14px]" style={{ color: 'var(--text-primary)' }}>
                      {displayName(c)}
                    </span>
                    <button
                      onClick={() => removeContact(c)}
                      className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-white/10"
                      aria-label={`Retirer ${displayName(c)}`}
                    >
                      <RemoveIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Toast — inline, above continue button */}
          {toast && (
            <div
              className="animate-fade-in-up mb-4 rounded-xl border px-4 py-3 text-[13px] leading-relaxed"
              style={{
                backgroundColor: 'rgba(107,166,142,0.10)',
                borderColor: 'rgba(107,166,142,0.20)',
                color: '#6BA68E',
              }}
            >
              {t('circleToast')}
            </div>
          )}

          {/* Continue button */}
          <button
            onClick={finish}
            disabled={saving}
            className="w-full py-4 text-[15px] font-bold transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
            style={{
              backgroundColor: 'var(--accent)',
              color: '#1B2541',
              borderRadius: 14,
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? '…' : `${t('continueBtn')} →`}
          </button>

          {/* Later */}
          <button
            onClick={finish}
            className="mt-3 w-full py-2 text-center text-[14px] transition-colors"
            style={{ color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {t('circleLaterBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}
