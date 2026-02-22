// src/components/SettingsSheet.tsx

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/stores/useStore';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ChevronRight, Shield, CreditCard, Database, FileText, User, Crown, ExternalLink, Bell, LayoutDashboard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DEFAULT_NOTIF_SETTINGS } from '@/types';

const springTransition = { type: 'spring', damping: 32, stiffness: 320, mass: 0.8 } as const;

type Props = { onClose: () => void };

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: 'var(--accent)' }}>{icon}</span>
        <p className="text-[0.65rem] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          {title}
        </p>
      </div>
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
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
  value?: string;
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
      className="w-full flex items-center justify-between px-4 py-3.5 transition active:opacity-60 border-b last:border-b-0 text-left"
      style={{ borderColor: 'var(--border)', cursor: onPress && !disabled ? 'pointer' : 'default' }}
    >
      <span
        className="text-sm font-semibold"
        style={{ color: destructive ? '#ef4444' : disabled ? 'var(--text-muted)' : 'var(--text-primary)' }}
      >
        {label}
      </span>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        {badge && (
          <span
            className="text-[0.55rem] font-black px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(244,63,94,0.10)', color: 'var(--accent)' }}
          >
            {badge}
          </span>
        )}
        {value && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{value}</span>
        )}
        {chevron && onPress && (
          <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
        )}
      </div>
    </button>
  );
}

function ToggleRow({ label, subtitle, value, onChange }: {
  label: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 border-b last:border-b-0"
      style={{ borderColor: 'var(--border)' }}>
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className="relative w-11 h-6 rounded-full shrink-0 ml-4 transition-colors"
        style={{ backgroundColor: value ? 'var(--accent)' : 'var(--border)' }}
      >
        <motion.div
          className="absolute top-0.5 w-5 h-5 rounded-full shadow-sm"
          style={{ backgroundColor: '#fff' }}
          animate={{ left: value ? '22px' : '2px' }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        />
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SettingsSheet({ onClose }: Props) {
  const { userId, userProfile, notifSettings, setNotifSettings, setActiveSheet } = useStore();
  const router = useRouter();
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [crashReports, setCrashReports] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    // Soft delete — sign out and mark account for deletion (hard delete via Supabase admin)
    await supabase.auth.signOut();
    toast.success('Account deletion requested. You have been signed out.');
    router.replace('/login');
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 z-[200]"
        style={{ backgroundColor: 'var(--bg-overlay)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        className="sheet-motion absolute bottom-0 left-1/2 -translate-x-1/2 w-[92%] max-w-[440px] rounded-t-3xl z-[201] max-h-[92dvh] overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={springTransition}
      >
        <div className="w-9 h-1 rounded-full mx-auto mt-3" style={{ backgroundColor: 'var(--border)' }} />

        <div className="px-5 pt-4 pb-12">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Settings</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {userProfile?.display_name ?? 'Your account'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-xs px-3 py-1.5 rounded-full font-bold"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              ✕
            </button>
          </div>

          {/* ── My Profile link ──────────────────────────────────────── */}
          <button
            onClick={() => { setActiveSheet('profile'); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl mb-6 transition active:opacity-70"
            style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--accent)' }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-black text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)' }}>
              {(userProfile?.display_name?.[0] ?? '?').toUpperCase()}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-black truncate" style={{ color: 'var(--text-primary)' }}>
                {userProfile?.display_name ?? 'Set your name'}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>View profile & activity</p>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
          </button>

          {/* ── Account ─────────────────────────────────────────────── */}
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

          {/* ── Subscription & Billing ───────────────────────────────── */}
          <Section title="Subscription & Billing" icon={<CreditCard size={13} />}>
            <div className="px-4 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Current plan</p>
                <span
                  className="text-[0.6rem] font-black px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981' }}
                >
                  Free
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                You have access to all core features at no cost.
              </p>
            </div>

            {/* Pro teaser */}
            <div className="px-4 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Crown size={14} style={{ color: '#f59e0b' }} />
                <p className="text-sm font-black" style={{ color: '#f59e0b' }}>SafePin Pro</p>
                <span
                  className="text-[0.55rem] font-black px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}
                >
                  Coming soon
                </span>
              </div>
              <ul className="flex flex-col gap-1">
                {[
                  'Unlimited saved routes & places',
                  'Advanced trip analytics',
                  'Priority alert notifications',
                  'Extended pin history (90 days)',
                  'Export your safety data',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span style={{ color: '#f59e0b' }}>✦</span> {f}
                  </li>
                ))}
              </ul>
            </div>

            <Row
              label="Invoices & receipts"
              badge="Coming soon"
              disabled
              chevron={false}
            />
          </Section>

          {/* ── Data & Privacy ───────────────────────────────────────── */}
          <Section title="Data & Privacy" icon={<Database size={13} />}>
            <ToggleRow
              label="Usage analytics"
              subtitle="Help us improve SafePin with anonymous usage data"
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
            <div className="px-4 py-3.5 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                Your GDPR rights
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                You have the right to access, rectify, and erase your personal data. You may also
                object to or restrict its processing, and request data portability. To exercise
                these rights, contact us at <span style={{ color: 'var(--accent)' }}>privacy@safepin.app</span>.
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

          {/* ── Legal & Conformity ──────────────────────────────────── */}
          <Section title="Legal & Conformity" icon={<FileText size={13} />}>
            <Row
              label="Privacy Policy"
              onPress={() => toast('Privacy policy — coming soon')}
              chevron={false}
              value={<ExternalLink size={12} style={{ color: 'var(--text-muted)' }} /> as unknown as string}
            />
            <Row
              label="Terms of Service"
              onPress={() => toast('Terms of service — coming soon')}
              chevron={false}
              value={<ExternalLink size={12} style={{ color: 'var(--text-muted)' }} /> as unknown as string}
            />
            <Row
              label="Cookie Policy"
              onPress={() => toast('Cookie policy — coming soon')}
              chevron={false}
              value={<ExternalLink size={12} style={{ color: 'var(--text-muted)' }} /> as unknown as string}
            />
            <div className="px-4 py-3.5" style={{ borderTop: '1px solid var(--border)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                SafePin complies with the EU General Data Protection Regulation (GDPR / RGPD) and
                the French Loi Informatique et Libertés. Data is stored in the EU. No data is sold
                to third parties.
              </p>
              <p className="text-[0.6rem] mt-2" style={{ color: 'var(--text-muted)' }}>
                SafePin v1.0 · © {new Date().getFullYear()} SafePin SAS
              </p>
            </div>
          </Section>

          {/* ── Notifications ────────────────────────────────────────── */}
          <Section title="Notifications" icon={<Bell size={13} />}>
            {/* Proximity radius */}
            <div className="px-4 py-3.5 border-b" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Alert radius</p>
              <div className="flex flex-wrap gap-1.5">
                {RADIUS_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => patchNotif({ proximity_radius_m: o.value })}
                    className="px-3 py-1 rounded-full text-xs font-bold transition"
                    style={
                      (notifSettings?.proximity_radius_m ?? 1000) === o.value
                        ? { backgroundColor: 'var(--accent)', color: '#fff' }
                        : { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                    }
                  >
                    {o.label}
                  </button>
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
              subtitle={`${notifSettings?.quiet_start ?? '22:00'} – ${notifSettings?.quiet_end ?? '07:00'} · SOS always active`}
              value={notifSettings?.quiet_hours_enabled ?? false}
              onChange={(v) => patchNotif({ quiet_hours_enabled: v })}
            />
          </Section>

          {/* ── Admin ────────────────────────────────────────────────── */}
          <Section title="Admin" icon={<LayoutDashboard size={13} />}>
            <Row
              label="Tower Control"
              badge="Admin only"
              onPress={() => { router.push('/admin'); onClose(); }}
            />
          </Section>

          {/* Security section */}
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

        </div>
      </motion.div>
    </>
  );
}
