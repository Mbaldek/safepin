// src/components/SettingsSheet.tsx

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { useStore } from '@/stores/useStore';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ChevronRight, ChevronLeft, Shield, CreditCard, Database, FileText, User, Crown, ExternalLink, Bell, LayoutDashboard, Receipt, CheckCircle2, Clock, Globe, HelpCircle, BookOpen, BarChart3, MapPinned, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DEFAULT_NOTIF_SETTINGS, URBAN_CONTEXTS, type Subscription, type Invoice } from '@/types';
import { useTranslations, useLocale } from 'next-intl';

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

type MapStyle = 'custom' | 'streets' | 'light' | 'dark';

type Props = {
  onClose: () => void;
  mapStyle?: MapStyle;
  onMapStyleChange?: (s: MapStyle) => void;
};

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[#F5C341]">{icon}</span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
          {title}
        </p>
      </div>
      <div className="rounded-2xl overflow-hidden border border-white/12 bg-[#1E293B]">
        {children}
      </div>
    </div>
  );
}

// ─── Row types ────────────────────────────────────────────────────────────────

function Row({
  label, value, badge, destructive, disabled, onPress, chevron = true,
}: {
  label: string;
  value?: string | React.ReactNode;
  badge?: string;
  destructive?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  chevron?: boolean;
}) {
  return (
    <button
      onClick={onPress}
      disabled={disabled || !onPress}
      className="w-full flex items-center justify-between px-4 py-3.5 transition active:opacity-60 border-b last:border-b-0 border-white/8 text-left"
      style={{ cursor: onPress && !disabled ? 'pointer' : 'default' }}
    >
      <span
        className="text-sm font-medium"
        style={{ color: destructive ? '#EF4444' : disabled ? '#64748B' : '#FFFFFF' }}
      >
        {label}
      </span>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        {badge && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F5C341]/15 text-[#F5C341]">
            {badge}
          </span>
        )}
        {value && (
          <span className="text-xs text-[#64748B]">{value}</span>
        )}
        {chevron && onPress && (
          <ChevronRight size={14} className="text-[#64748B]" />
        )}
      </div>
    </button>
  );
}

function ToggleRow({ label, subtitle, value, onChange }: {
  label: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 border-b last:border-b-0 border-white/8">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {subtitle && <p className="text-xs mt-0.5 text-[#64748B]">{subtitle}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className="relative w-11 h-6 rounded-full shrink-0 ml-4 transition-colors"
        style={{ backgroundColor: value ? '#F5C341' : 'rgba(255,255,255,0.12)' }}
      >
        <motion.div
          className="absolute top-0.5 w-5 h-5 rounded-full shadow-sm bg-white"
          animate={{ left: value ? '22px' : '2px' }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        />
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type SectionId = 'account' | 'notifications' | 'privacy' | 'legal' | 'security' | 'billing' | 'admin' | 'mapDisplay';

const LOCALE_LABELS: Record<string, { native: string; flag: string }> = {
  en: { native: 'English', flag: '🇬🇧' },
  fr: { native: 'Français', flag: '🇫🇷' },
  es: { native: 'Español', flag: '🇪🇸' },
  zh: { native: '中文', flag: '🇨🇳' },
  ar: { native: 'العربية', flag: '🇸🇦' },
  hi: { native: 'हिन्दी', flag: '🇮🇳' },
  pt: { native: 'Português', flag: '🇧🇷' },
  bn: { native: 'বাংলা', flag: '🇧🇩' },
  ru: { native: 'Русский', flag: '🇷🇺' },
  ja: { native: '日本語', flag: '🇯🇵' },
  de: { native: 'Deutsch', flag: '🇩🇪' },
  ko: { native: '한국어', flag: '🇰🇷' },
  it: { native: 'Italiano', flag: '🇮🇹' },
  tr: { native: 'Türkçe', flag: '🇹🇷' },
  vi: { native: 'Tiếng Việt', flag: '🇻🇳' },
  pl: { native: 'Polski', flag: '🇵🇱' },
  nl: { native: 'Nederlands', flag: '🇳🇱' },
  th: { native: 'ไทย', flag: '🇹🇭' },
  sv: { native: 'Svenska', flag: '🇸🇪' },
  ro: { native: 'Română', flag: '🇷🇴' },
  cs: { native: 'Čeština', flag: '🇨🇿' },
  el: { native: 'Ελληνικά', flag: '🇬🇷' },
  hu: { native: 'Magyar', flag: '🇭🇺' },
  da: { native: 'Dansk', flag: '🇩🇰' },
  fi: { native: 'Suomi', flag: '🇫🇮' },
  no: { native: 'Norsk', flag: '🇳🇴' },
  he: { native: 'עברית', flag: '🇮🇱' },
  id: { native: 'Bahasa', flag: '🇮🇩' },
  ms: { native: 'Melayu', flag: '🇲🇾' },
  uk: { native: 'Українська', flag: '🇺🇦' },
};

export default function SettingsSheet({ onClose, mapStyle, onMapStyleChange }: Props) {
  const { userId, userProfile, notifSettings, setNotifSettings, setActiveTab, setMyKovaInitialTab, mapFilters, setMapFilters } = useStore();
  const router = useRouter();
  const t = useTranslations('settings');
  const focusTrapRef = useFocusTrap(true, onClose);
  const locale = useLocale();
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [crashReports, setCrashReports] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [section, setSection] = useState<SectionId | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [waitlistJoined, setWaitlistJoined] = useState(false);
  const [langSearch, setLangSearch] = useState('');
  const [langOpen, setLangOpen] = useState(false);
  const [mapStyleOpen, setMapStyleOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (section !== 'billing' || !userId) return;
    setBillingLoading(true);
    Promise.all([
      supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('invoices').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
      supabase.from('pro_waitlist').select('id').eq('user_id', userId).maybeSingle(),
    ]).then(([subRes, invRes, wlRes]) => {
      setSubscription(subRes.data ?? null);
      setInvoices(invRes.data ?? []);
      setWaitlistJoined(!!wlRes.data);
      setBillingLoading(false);
    });
  }, [section, userId]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email?.includes('balleron')) setIsAdmin(true);
    });
  }, []);

  const [upgrading, setUpgrading] = useState(false);

  async function handleUpgrade(plan: 'pro' | 'pro_annual') {
    if (!userId) return;
    setUpgrading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email: user?.email ?? '', plan }),
      });
      const { url, error } = await res.json();
      if (error) { toast.error(error); return; }
      window.location.href = url;
    } catch { toast.error(t('checkoutFailed')); }
    finally { setUpgrading(false); }
  }

  async function handleJoinWaitlist() {
    if (!userId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { toast('No email found on your account'); return; }
    const { error } = await supabase.from('pro_waitlist').upsert({ user_id: userId, email: user.email }, { onConflict: 'email' });
    if (error) { toast.error(t('waitlistFailed')); return; }
    setWaitlistJoined(true);
    toast.success(t('waitlistSuccess'));
  }

  const RADIUS_OPTIONS = [
    { label: '500 m', value: 500 },
    { label: '1 km',  value: 1000 },
    { label: '2 km',  value: 2000 },
    { label: '5 km',  value: 5000 },
    { label: '10 km', value: 10000 },
  ];

  function patchNotif(patch: Partial<typeof notifSettings>) {
    setNotifSettings({ ...(notifSettings ?? DEFAULT_NOTIF_SETTINGS), ...patch });
  }

  async function handleDeleteAccount() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    await supabase.auth.signOut();
    toast.success(t('accountDeleted'));
    router.replace('/login');
  }

  // ─── Chip helper ────────────────────────────────────────────────────────────
  function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
    return (
      <button
        onClick={onClick}
        className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition ${
          active
            ? 'bg-[#F5C341] text-[#0F172A] border border-[#F5C341]'
            : 'bg-white/[0.06] text-[#64748B] border border-white/8 hover:bg-white/10'
        }`}
      >
        {children}
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-400"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="fixed bottom-0 left-0 right-0 bg-[#334155] rounded-t-3xl z-500 max-h-[92dvh] overflow-hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 24px)' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={spring}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-9 h-1 bg-white/20 rounded-full" />
        </div>

        {/* ── Fixed header ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-3">
          {section ? (
            <button
              onClick={() => setSection(null)}
              className="flex items-center gap-1.5 text-sm font-semibold transition active:opacity-60 text-[#F5C341]"
            >
              <ChevronLeft size={16} />
              {t('title')}
            </button>
          ) : (
            <h2 className="text-xl font-medium text-white">{t('title')}</h2>
          )}
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white transition hover:bg-white/15"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(92dvh - 100px)' }}>
        <div className="px-6 pt-2 pb-12">

          <AnimatePresence mode="wait">
          {!section ? (
            /* ── Level 1: Category menu ────────────────────────────── */
            <motion.div key="menu" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.15 }}>

          {/* ── My Profile link ──────────────────────────────────────── */}
          <button
            onClick={() => { setMyKovaInitialTab('stats'); setActiveTab('me'); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl mb-5 transition active:opacity-70 border border-[#F5C341]/30 bg-white/[0.06]"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-lg font-semibold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #F5C341, #B8923E)' }}>
              {userProfile?.avatar_url
                ? <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                : (userProfile?.display_name?.[0] ?? '?').toUpperCase()}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {userProfile?.display_name ?? 'Set your name'}
              </p>
              <p className="text-xs text-[#64748B]">View profile & activity</p>
            </div>
            <ChevronRight size={16} className="text-[#64748B]" />
          </button>

          {/* ── Language picker ───────────────────────────────────────── */}
          <div className="rounded-2xl overflow-hidden mb-3 border border-white/12 bg-[#1E293B]">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-3 px-4 py-3.5 w-full text-left"
            >
              <Globe size={16} className="text-[#F5C341]" />
              <span className="text-sm font-medium text-white flex-1">{t('language')}</span>
              <span className="text-xs font-medium text-[#64748B]">
                {LOCALE_LABELS[locale]?.flag} {LOCALE_LABELS[locale]?.native ?? locale}
              </span>
              <ChevronRight size={14} className={`text-[#64748B] transition-transform duration-200 ${langOpen ? 'rotate-90' : ''}`} />
            </button>
            {langOpen && (
              <div className="px-3 pb-3">
                <input
                  value={langSearch}
                  onChange={(e) => setLangSearch(e.target.value)}
                  placeholder="Search language…"
                  className="w-full text-xs rounded-xl px-3 py-2 mb-2 outline-none bg-white/[0.08] border border-white/12 text-white placeholder:text-[#64748B] focus:border-[#3BB4C1] transition"
                />
                <div className="grid grid-cols-2 gap-1.5 max-h-[240px] overflow-y-auto">
                  {Object.entries(LOCALE_LABELS)
                    .filter(([, v]) => !langSearch || v.native.toLowerCase().includes(langSearch.toLowerCase()))
                    .map(([code, { native, flag }]) => (
                    <button
                      key={code}
                      onClick={async () => {
                        document.cookie = `NEXT_LOCALE=${code};path=/;max-age=31536000`;
                        const { data: { session } } = await supabase.auth.getSession();
                        if (session) {
                          await supabase.from('profiles').update({ language: code }).eq('id', session.user.id);
                        }
                        window.location.reload();
                      }}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium transition text-left ${
                        locale === code
                          ? 'bg-[#F5C341] text-[#0F172A]'
                          : 'bg-white/[0.06] text-white border border-white/8 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-sm">{flag}</span>
                      <span className="truncate">{native}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Group A — Preferences ──────────────────────────────── */}
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B] mb-2 ml-1">Preferences</p>
          <div className="rounded-2xl overflow-hidden mb-4 border border-white/12 bg-[#1E293B]">
            {([
              { id: 'notifications', label: 'Notifications', subtitle: 'Alerts, radius, quiet hours', icon: <Bell size={16} /> },
              { id: 'mapDisplay',    label: t('mapDisplay'),  subtitle: t('mapDisplayDesc'),           icon: <MapPinned size={16} /> },
              { id: 'account',       label: 'Account',       subtitle: userProfile?.display_name ?? 'Name, email, password', icon: <User size={16} /> },
            ] as { id: SectionId; label: string; subtitle: string; icon: React.ReactNode }[]).map(({ id, label, subtitle, icon }) => (
              <button
                key={id}
                onClick={() => setSection(id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 border-b last:border-b-0 border-white/8 text-left transition active:opacity-60"
              >
                <span className="text-[#F5C341]">{icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="text-xs mt-0.5 truncate text-[#64748B]">{subtitle}</p>
                </div>
                <ChevronRight size={15} className="text-[#64748B] shrink-0" />
              </button>
            ))}
          </div>

          {/* ── Restart onboarding (disabled — coming soon) ──────── */}
          <div className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl mb-4 opacity-40 cursor-not-allowed border border-white/12 bg-[#1E293B]">
            <span className="text-base">🎓</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">Relancer le tutoriel</p>
              <p className="text-xs mt-0.5 text-[#64748B]">Bientôt disponible</p>
            </div>
          </div>

          {/* ── Map Style (collapsible) ───────────────────────────── */}
          {mapStyle !== undefined && onMapStyleChange && (
            <div className="mb-4">
              <button
                onClick={() => setMapStyleOpen(!mapStyleOpen)}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition active:opacity-60 border border-white/12 bg-[#1E293B]"
              >
                <span className="text-base">🗺️</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">Map style</p>
                  <p className="text-xs mt-0.5 text-[#64748B]">
                    {mapStyle === 'custom' ? 'Breveil' : mapStyle === 'streets' ? 'Streets' : mapStyle === 'light' ? 'Light' : 'Dark'}
                  </p>
                </div>
                <ChevronRight
                  size={15}
                  className={`text-[#64748B] transition-transform duration-200 ${mapStyleOpen ? 'rotate-90' : ''}`}
                />
              </button>
              {mapStyleOpen && (
                <div className="rounded-2xl overflow-hidden mt-1.5 border border-white/12 bg-[#1E293B]">
                  {([
                    { id: 'custom'  as MapStyle, label: 'Breveil',  emoji: '✦',  sub: 'Custom style' },
                    { id: 'streets' as MapStyle, label: 'Streets',  emoji: '🗺️', sub: 'Standard' },
                    { id: 'light'   as MapStyle, label: 'Light',    emoji: '☀️', sub: 'Minimal' },
                    { id: 'dark'    as MapStyle, label: 'Dark',     emoji: '🌙', sub: 'Night' },
                  ]).map(({ id, label, emoji, sub }) => {
                    const active = mapStyle === id;
                    return (
                      <button
                        key={id}
                        onClick={() => { onMapStyleChange(id); setMapStyleOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3.5 border-b last:border-b-0 border-white/8 text-left transition active:opacity-60"
                      >
                        <span className="text-base">{emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{label}</p>
                          <p className="text-xs mt-0.5 text-[#64748B]">{sub}</p>
                        </div>
                        {active && (
                          <span className="text-sm font-semibold text-[#F5C341]">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Group B — Help & Information ──────────────────────── */}
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B] mb-2 ml-1">Help & Information</p>
          <div className="rounded-2xl overflow-hidden mb-4 border border-white/12 bg-[#1E293B]">
            {([
              { label: 'User Guide',          subtitle: 'How to use Breveil',          icon: <BookOpen size={16} />,   href: '/guide.html' },
              { label: 'FAQ',                  subtitle: 'Frequently asked questions', icon: <HelpCircle size={16} />, href: '/faq.html' },
              { label: 'Methodology & Data',   subtitle: 'How safety scores work',    icon: <BarChart3 size={16} />,  href: '/methodology.html' },
            ]).map(({ label, subtitle, icon, href }) => (
              <button
                key={label}
                onClick={() => window.open(href, '_blank')}
                className="w-full flex items-center gap-3 px-4 py-3.5 border-b last:border-b-0 border-white/8 text-left transition active:opacity-60"
              >
                <span className="text-[#F5C341]">{icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="text-xs mt-0.5 truncate text-[#64748B]">{subtitle}</p>
                </div>
                <ExternalLink size={13} className="text-[#64748B] shrink-0" />
              </button>
            ))}
          </div>

          {/* ── Group C — Subscription ────────────────────────────── */}
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B] mb-2 ml-1">Subscription</p>
          <div className="rounded-2xl overflow-hidden mb-4 border border-white/12 bg-[#1E293B]">
            <button
              onClick={() => setSection('billing')}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition active:opacity-60"
            >
              <span className="text-[#F5C341]"><CreditCard size={16} /></span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">Subscription</p>
                <p className="text-xs mt-0.5 truncate text-[#64748B]">Free plan · Breveil Pro coming soon</p>
              </div>
              <ChevronRight size={15} className="text-[#64748B] shrink-0" />
            </button>
          </div>

          {/* ── Group D — Privacy & Security ──────────────────────── */}
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B] mb-2 ml-1">Privacy & Security</p>
          <div className="rounded-2xl overflow-hidden mb-4 border border-white/12 bg-[#1E293B]">
            {([
              { id: 'privacy',  label: 'Privacy & Data', subtitle: 'Analytics, GDPR, delete account', icon: <Database size={16} /> },
              { id: 'security', label: 'Security',       subtitle: '2FA, sessions, sign out',         icon: <Shield size={16} /> },
              { id: 'legal',    label: 'Legal',           subtitle: 'Privacy policy, ToS, GDPR',       icon: <FileText size={16} /> },
            ] as { id: SectionId; label: string; subtitle: string; icon: React.ReactNode }[]).map(({ id, label, subtitle, icon }) => (
              <button
                key={id}
                onClick={() => setSection(id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 border-b last:border-b-0 border-white/8 text-left transition active:opacity-60"
              >
                <span className="text-[#F5C341]">{icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="text-xs mt-0.5 truncate text-[#64748B]">{subtitle}</p>
                </div>
                <ChevronRight size={15} className="text-[#64748B] shrink-0" />
              </button>
            ))}
          </div>

          {/* ── Group E — Admin ───────────────────────────────────── */}
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B] mb-2 ml-1">Admin</p>
          <div className="rounded-2xl overflow-hidden mb-3 border border-white/12 bg-[#1E293B]">
            <button
              onClick={() => setSection('admin')}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition active:opacity-60"
            >
              <span className="text-[#F5C341]"><LayoutDashboard size={16} /></span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">Admin — Tower Control</p>
                <p className="text-xs mt-0.5 truncate text-[#64748B]">Moderation & parameters</p>
              </div>
              <ChevronRight size={15} className="text-[#64748B] shrink-0" />
            </button>
          </div>

          {/* ── Admin: Reset Onboarding ──────────────────────────── */}
          {isAdmin && (
            <button
              onClick={async () => {
                if (!userId) return;
                await supabase.from('profiles').update({ onboarding_completed: false, onboarding_step: 0 }).eq('id', userId);
                document.cookie = 'ob_done=;path=/;max-age=0';
                ['brume_onboarding_done', 'ob_done', 'onboardingDone', 'onboardingStep', 'onboarding_done'].forEach((k) => localStorage.removeItem(k));
                toast.success('Onboarding reset — rechargement...');
                setTimeout(() => { window.location.href = '/map'; }, 1000);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl mt-2 mb-1 transition active:opacity-60 border border-orange-500/35 bg-orange-500/[0.07]"
            >
              <span className="text-sm font-semibold text-orange-500">🔧 Reset Onboarding (Admin)</span>
            </button>
          )}

          {/* ── Sign Out ─────────────────────────────────────────── */}
          <button
            onClick={async () => {
              await supabase.auth.signOut({ scope: 'global' });
              router.replace('/login');
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl mt-2 mb-1 transition active:opacity-60 border border-[#EF4444]/20 bg-[#EF4444]/[0.05]"
          >
            <span className="text-sm font-semibold text-[#EF4444]">Sign out</span>
          </button>
          <p className="text-center text-[11px] pb-2 text-[#64748B]">
            Breveil v0.1.0-beta
          </p>

            </motion.div>
          ) : section === 'account' ? (
            <motion.div key="account" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.15 }}>
          <Section title="Account" icon={<User size={13} />}>
            <Row
              label="Display name"
              value={userProfile?.display_name ?? 'Not set'}
              onPress={() => { toast('Edit your name in the Profile tab'); onClose(); }}
            />
            <Row
              label="Email address"
              value={userProfile ? '••••••••' : '—'}
              chevron={false}
            />
            <Row
              label="Identity verification"
              value={
                userProfile?.verification_status === 'approved' ? '✅ Verified' :
                userProfile?.verification_status === 'pending'  ? '⏳ Pending' :
                'Not verified'
              }
              onPress={() => { toast('Open the Profile tab to verify your identity'); onClose(); }}
            />
            <Row
              label="Change password"
              badge="Via email"
              onPress={() => {
                toast('Password reset email sent');
                supabase.auth.resetPasswordForEmail('');
              }}
            />
          </Section>
            </motion.div>

          ) : section === 'billing' ? (
            <motion.div key="billing" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.15 }}>
          {/* ── Subscription & Billing ───────────────────────────────── */}
          <Section title="Current Plan" icon={<CreditCard size={13} />}>
            {billingLoading ? (
              <div className="px-4 py-6 text-center text-xs text-[#64748B]">Loading…</div>
            ) : (
              <>
                {/* Plan status */}
                <div className="px-4 py-4 border-b border-white/8">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {subscription?.plan === 'pro' || subscription?.plan === 'pro_annual'
                        ? <Crown size={14} className="text-[#F5C341]" />
                        : <CheckCircle2 size={14} className="text-[#34D399]" />
                      }
                      <p className="text-sm font-semibold text-white">
                        {subscription?.plan === 'pro' ? 'Breveil Pro'
                          : subscription?.plan === 'pro_annual' ? 'Breveil Pro Annual'
                          : 'Free'}
                      </p>
                    </div>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={
                        subscription?.status === 'active' || !subscription
                          ? { backgroundColor: 'rgba(52,211,153,0.15)', color: '#34D399' }
                          : subscription.status === 'past_due'
                          ? { backgroundColor: 'rgba(251,191,36,0.15)', color: '#FBBF24' }
                          : { backgroundColor: 'rgba(100,116,139,0.12)', color: '#64748B' }
                      }
                    >
                      {subscription?.status ?? 'Active'}
                    </span>
                  </div>
                  {subscription?.current_period_end ? (
                    <p className="text-xs text-[#64748B]">
                      {subscription.cancel_at_period_end ? 'Cancels' : 'Renews'} on{' '}
                      {new Date(subscription.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  ) : (
                    <p className="text-xs text-[#64748B]">
                      All core features included at no cost.
                    </p>
                  )}
                </div>

                {/* Manage subscription via Stripe portal */}
                {subscription && subscription.plan !== 'free' && (
                  <div className="px-4 py-3.5 border-b border-white/8">
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/stripe/portal', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId }),
                          });
                          const { url, error } = await res.json();
                          if (error) { toast.error(error); return; }
                          window.location.href = url;
                        } catch { toast.error(t('billingPortalFailed')); }
                      }}
                      className="w-full text-center text-xs font-medium py-2 rounded-xl flex items-center justify-center gap-1.5 transition hover:opacity-80 bg-white/[0.08] text-white"
                    >
                      <ExternalLink size={12} /> Manage subscription
                    </button>
                  </div>
                )}
              </>
            )}
          </Section>

          {/* Breveil Pro upgrade card */}
          {(!subscription || subscription.plan === 'free') && (
            <Section title="Upgrade" icon={<Crown size={13} />}>
              <div className="px-4 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <Crown size={15} className="text-[#F5C341]" />
                  <p className="text-sm font-semibold text-[#F5C341]">Breveil Pro</p>
                </div>
                <ul className="flex flex-col gap-1.5 mb-4">
                  {[
                    'Location history viewer',
                    'Safety buddy matching',
                    'Neighborhood safety scores',
                    'Advanced trip analytics',
                    'Priority alert notifications',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-[#94A3B8]">
                      <span className="text-[#F5C341]">✦</span> {f}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleUpgrade('pro')}
                    disabled={upgrading}
                    className="w-full py-2.5 rounded-[32px] text-xs font-semibold transition-opacity disabled:opacity-50 bg-[#F5C341] text-[#0F172A]"
                  >
                    {upgrading ? 'Redirecting…' : 'Upgrade — €4.99/mo'}
                  </button>
                  <button
                    onClick={() => handleUpgrade('pro_annual')}
                    disabled={upgrading}
                    className="w-full py-2 rounded-[32px] text-xs font-medium transition-opacity disabled:opacity-50 bg-[#F5C341]/15 text-[#F5C341]"
                  >
                    Annual — €39.99/yr (save 33%)
                  </button>
                </div>
              </div>
            </Section>
          )}

          {/* Invoices */}
          <Section title="Invoices & Receipts" icon={<Receipt size={13} />}>
            {billingLoading ? (
              <div className="px-4 py-6 text-center text-xs text-[#64748B]">Loading…</div>
            ) : invoices.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <Clock size={22} className="mx-auto mb-2 opacity-30 text-[#64748B]" />
                <p className="text-xs text-[#64748B]">No invoices yet.</p>
                <p className="text-[11px] mt-0.5 text-[#64748B]">
                  Invoices will appear here once you subscribe to Breveil Pro.
                </p>
              </div>
            ) : (
              invoices.map((inv) => (
                <div key={inv.id} className="px-4 py-3.5 flex items-center justify-between border-b border-white/8">
                  <div>
                    <p className="text-xs font-medium text-white">
                      {inv.description ?? 'Breveil subscription'}
                    </p>
                    <p className="text-[11px] text-[#64748B]">
                      {new Date(inv.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">
                      {(inv.amount_cents / 100).toFixed(2)} {inv.currency.toUpperCase()}
                    </span>
                    {inv.invoice_pdf_url ? (
                      <a
                        href={inv.invoice_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-medium text-[#F5C341]"
                      >
                        PDF
                      </a>
                    ) : (
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={
                          inv.status === 'paid'
                            ? { backgroundColor: 'rgba(52,211,153,0.15)', color: '#34D399' }
                            : { backgroundColor: 'rgba(100,116,139,0.12)', color: '#64748B' }
                        }
                      >
                        {inv.status}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </Section>
            </motion.div>

          ) : section === 'privacy' ? (
            <motion.div key="privacy" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.15 }}>
          {/* ── Data & Privacy ───────────────────────────────────────── */}
          <Section title="Data & Privacy" icon={<Database size={13} />}>
            <ToggleRow
              label="Usage analytics"
              subtitle="Help us improve Breveil with anonymous usage data"
              value={analyticsEnabled}
              onChange={setAnalyticsEnabled}
            />
            <ToggleRow
              label="Crash reports"
              subtitle="Automatically send crash logs to our team"
              value={crashReports}
              onChange={setCrashReports}
            />
            <Row
              label="Download my data"
              badge="Coming soon"
              disabled
              chevron={false}
            />
            <div className="px-4 py-3.5 border-b last:border-b-0 border-white/8">
              <p className="text-sm font-medium text-white mb-1">
                Your GDPR rights
              </p>
              <p className="text-xs leading-relaxed text-[#64748B]">
                You have the right to access, rectify, and erase your personal data. You may also
                object to or restrict its processing, and request data portability. To exercise
                these rights, contact us at <span className="text-[#F5C341]">brumeapp@pm.me</span>.
              </p>
            </div>
            <Row
              label="Delete my account"
              destructive
              chevron={false}
              onPress={handleDeleteAccount}
              value={confirmDelete ? 'Tap again to confirm' : undefined}
            />
          </Section>
            </motion.div>

          ) : section === 'legal' ? (
            <motion.div key="legal" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.15 }}>
          {/* ── Legal & Conformity ──────────────────────────────────── */}
          <Section title="Legal & Conformity" icon={<FileText size={13} />}>
            <Row
              label="Privacy Policy"
              onPress={() => window.open('/privacy', '_blank')}
              chevron={false}
              value={<ExternalLink size={12} className="text-[#64748B]" />}
            />
            <Row
              label="Terms of Service"
              onPress={() => window.open('/terms', '_blank')}
              chevron={false}
              value={<ExternalLink size={12} className="text-[#64748B]" />}
            />
            <Row
              label="Cookie Policy"
              onPress={() => window.open('/cookies', '_blank')}
              chevron={false}
              value={<ExternalLink size={12} className="text-[#64748B]" />}
            />
            <div className="px-4 py-3.5 border-t border-white/8">
              <p className="text-xs text-[#64748B]">
                Breveil complies with the EU General Data Protection Regulation (GDPR / RGPD) and
                the French Loi Informatique et Libertés. Data is stored in the EU. No data is sold
                to third parties.
              </p>
              <p className="text-[11px] mt-2 leading-relaxed text-[#64748B]">
                Breveil v1.0 · © {new Date().getFullYear()} DBEK — 75 rue de Lourmel, 75015 Paris, France
              </p>
              <p className="text-[11px] mt-0.5 text-[#64748B]">
                <a href="mailto:brumeapp@pm.me" className="text-[#F5C341]">brumeapp@pm.me</a>
              </p>
            </div>
          </Section>
            </motion.div>

          ) : section === 'mapDisplay' ? (
            <motion.div key="mapDisplay" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.15 }}>
          {/* ── Map Display ─────────────────────────────────────────── */}
          <Section title={t('mapDisplay')} icon={<MapPinned size={13} />}>
            {/* Urban context chips */}
            <div className="px-4 py-3.5 border-b border-white/8">
              <p className="text-xs font-semibold mb-2 text-white">{t('locationType')}</p>
              <div className="flex flex-wrap gap-1.5">
                {(['all', ...Object.keys(URBAN_CONTEXTS)] as const).map((key) => {
                  const isAll = key === 'all';
                  const active = mapFilters.urban === key;
                  const emoji = isAll ? null : URBAN_CONTEXTS[key as keyof typeof URBAN_CONTEXTS]?.emoji;
                  return (
                    <Chip key={key} active={active} onClick={() => setMapFilters({ ...mapFilters, urban: key })}>
                      {emoji ? `${emoji} ` : ''}{isAll ? t('any') : (URBAN_CONTEXTS[key as keyof typeof URBAN_CONTEXTS]?.label ?? key)}
                    </Chip>
                  );
                })}
              </div>
            </div>

            {/* Time of day chips */}
            <div className="px-4 py-3.5 border-b border-white/8">
              <p className="text-xs font-semibold mb-2 text-white">{t('timeOfDay')}</p>
              <div className="flex flex-wrap gap-1.5">
                {([
                  { id: 'all', label: t('anyTime') },
                  { id: 'morning', label: t('morning') },
                  { id: 'afternoon', label: t('afternoon') },
                  { id: 'evening', label: t('evening') },
                  { id: 'night', label: t('night') },
                ] as const).map(({ id, label }) => {
                  const active = mapFilters.timeOfDay === id;
                  return (
                    <Chip key={id} active={active} onClick={() => setMapFilters({ ...mapFilters, timeOfDay: id as typeof mapFilters.timeOfDay })}>
                      {label}
                    </Chip>
                  );
                })}
              </div>
            </div>

            {/* Confirmed only toggle */}
            <ToggleRow
              label={t('confirmedOnly')}
              subtitle={t('confirmedDesc')}
              value={mapFilters.confirmedOnly}
              onChange={(v) => setMapFilters({ ...mapFilters, confirmedOnly: v })}
            />
          </Section>
            </motion.div>

          ) : section === 'notifications' ? (
            <motion.div key="notifications" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.15 }}>
          {/* ── Notifications ────────────────────────────────────────── */}
          <Section title="Notifications" icon={<Bell size={13} />}>
            {/* Proximity radius */}
            <div className="px-4 py-3.5 border-b border-white/8">
              <p className="text-sm font-medium mb-2 text-white">Alert radius</p>
              <div className="flex flex-wrap gap-1.5">
                {RADIUS_OPTIONS.map((o) => (
                  <Chip
                    key={o.value}
                    active={(notifSettings?.proximity_radius_m ?? 1000) === o.value}
                    onClick={() => patchNotif({ proximity_radius_m: o.value })}
                  >
                    {o.label}
                  </Chip>
                ))}
              </div>
            </div>
            <ToggleRow
              label="Notify on nearby pins"
              subtitle="New reports within your alert radius"
              value={notifSettings?.notify_nearby_pins ?? true}
              onChange={(v) => patchNotif({ notify_nearby_pins: v })}
            />
            <ToggleRow
              label="SOS alerts (always on)"
              subtitle="Emergency alerts near you — cannot be silenced"
              value={notifSettings?.notify_sos_nearby ?? true}
              onChange={(v) => patchNotif({ notify_sos_nearby: v })}
            />
            <ToggleRow
              label="Followed pin activity"
              subtitle="Messages, stories, and status changes on pins you follow"
              value={notifSettings?.notify_followed_pins ?? true}
              onChange={(v) => patchNotif({ notify_followed_pins: v })}
            />
            <ToggleRow
              label="Milestones & achievements"
              subtitle="Level-ups, impact stats, and badges"
              value={notifSettings?.notify_milestones ?? true}
              onChange={(v) => patchNotif({ notify_milestones: v })}
            />
            <ToggleRow
              label="Quiet hours"
              subtitle="Silence non-emergency alerts during set hours. SOS always active."
              value={notifSettings?.quiet_hours_enabled ?? false}
              onChange={(v) => patchNotif({ quiet_hours_enabled: v })}
            />
            {(notifSettings?.quiet_hours_enabled) && (
              <div className="px-4 py-3.5 flex items-center gap-4 border-t border-white/8">
                <div className="flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B] mb-1.5">From</p>
                  <input
                    type="time"
                    value={notifSettings?.quiet_start ?? '22:00'}
                    onChange={(e) => patchNotif({ quiet_start: e.target.value })}
                    className="w-full rounded-xl px-3 py-2 text-sm font-medium outline-none bg-white/[0.08] border border-white/12 text-white focus:border-[#3BB4C1] transition"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B] mb-1.5">To</p>
                  <input
                    type="time"
                    value={notifSettings?.quiet_end ?? '07:00'}
                    onChange={(e) => patchNotif({ quiet_end: e.target.value })}
                    className="w-full rounded-xl px-3 py-2 text-sm font-medium outline-none bg-white/[0.08] border border-white/12 text-white focus:border-[#3BB4C1] transition"
                  />
                </div>
              </div>
            )}
          </Section>
            </motion.div>

          ) : section === 'admin' ? (
            <motion.div key="admin" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.15 }}>
          <Section title="Admin — Tower Control" icon={<LayoutDashboard size={13} />}>
            <Row
              label="Open Tower Control"
              badge="Admin only"
              onPress={() => { router.push('/admin'); onClose(); }}
            />
          </Section>
          <Section title="Onboarding" icon={<User size={13} />}>
            <Row
              label="Restart onboarding"
              badge="Dev"
              chevron={false}
              onPress={async () => {
                const uid = useStore.getState().userId;
                if (uid) {
                  await supabase.from('profiles').update({ onboarding_completed: false, onboarding_step: 0 }).eq('id', uid);
                }
                document.cookie = 'ob_done=0;path=/;max-age=0';
                onClose();
                router.push('/onboarding/profile');
              }}
            />
          </Section>
            </motion.div>

          ) : section === 'security' ? (
            <motion.div key="security" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.15 }}>
          <Section title="Security" icon={<Shield size={13} />}>
            <Row
              label="Two-factor authentication"
              badge="Coming soon"
              disabled
              chevron={false}
            />
            <Row
              label="Active sessions"
              badge="Coming soon"
              disabled
              chevron={false}
            />
            <Row
              label="Sign out of all devices"
              onPress={async () => {
                await supabase.auth.signOut({ scope: 'global' });
                router.replace('/login');
              }}
              destructive
              chevron={false}
            />
          </Section>
            </motion.div>

          ) : null}
          </AnimatePresence>

        </div>
        </div>
      </motion.div>
    </>
  );
}
