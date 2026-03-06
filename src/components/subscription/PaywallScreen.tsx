'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Check,
  Lock,
  ChevronLeft,
  ChevronRight,
  Gift,
  MessageSquare,
  Mail,
  Phone,
  Link2,
  Copy,
  Sparkles,
  ExternalLink,
  History,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { useTheme } from '@/stores/useTheme';
import { useWaitlist } from '@/hooks/useWaitlist';
import { useStore } from '@/stores/useStore';
import { supabase } from '@/lib/supabase';

// Brand Colors
const colors = {
  dark: {
    background: '#0F172A',
    card: '#1E293B',
    elevated: '#243050',
    textPrimary: '#FFFFFF',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
    border: 'rgba(255,255,255,0.1)',
  },
  light: {
    background: '#F8FAFC',
    card: '#FFFFFF',
    elevated: '#F1F5F9',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#94A3B8',
    border: 'rgba(0,0,0,0.1)',
  },
  cyan: '#3BB4C1',
  gold: '#F5C341',
  goldDark: '#E8A800',
  success: '#34D399',
  danger: '#EF4444',
  purple: '#A78BFA',
};

type AppState = 'paywall' | 'mon-plan' | 'referral';
type PlanType = 'free' | 'pro';

const springConfig = { stiffness: 300, damping: 30 };

export interface PaywallScreenProps {
  onClose?: () => void;
  context?: 'onboarding' | 'settings';
}

export default function PaywallScreen({ onClose, context }: PaywallScreenProps) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const [isAnnual, setIsAnnual] = useState(false);
  const [currentState, setCurrentState] = useState<AppState>('paywall');
  const [userPlan, setUserPlan] = useState<PlanType>('free');
  const [copied, setCopied] = useState(false);
  const [direction, setDirection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const theme = isDark ? colors.dark : colors.light;

  const handleStateChange = (newState: AppState) => {
    const states: AppState[] = ['paywall', 'mon-plan', 'referral'];
    const currentIndex = states.indexOf(currentState);
    const newIndex = states.indexOf(newState);
    setDirection(newIndex > currentIndex ? 1 : -1);
    setCurrentState(newState);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText('BREVEIL-TOM');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      ref={containerRef}
      className="paywall-scroll"
      style={{
        backgroundColor: theme.background,
        height: '100%',
        width: '100%',
        position: 'relative',
        overflow: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      <style>{`.paywall-scroll::-webkit-scrollbar { display: none; }`}</style>

      <AnimatePresence mode="wait" custom={direction}>
        {currentState === 'paywall' && (
          <PaywallView
            key="paywall"
            theme={theme}
            isDark={isDark}
            isAnnual={isAnnual}
            setIsAnnual={setIsAnnual}
            direction={direction}
            onClose={onClose}
            context={context}
          />
        )}
        {currentState === 'mon-plan' && (
          <MonPlanView
            key="mon-plan"
            theme={theme}
            isDark={isDark}
            userPlan={userPlan}
            setUserPlan={setUserPlan}
            onNavigate={handleStateChange}
            direction={direction}
          />
        )}
        {currentState === 'referral' && (
          <ReferralView
            key="referral"
            theme={theme}
            isDark={isDark}
            copied={copied}
            onCopy={handleCopy}
            direction={direction}
          />
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          width: '100%',
          padding: '12px 20px 28px',
          background: `linear-gradient(transparent, ${theme.background})`,
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
          zIndex: 50,
        }}
      >
        {(['paywall', 'mon-plan', 'referral'] as AppState[]).map((state) => (
          <motion.button
            key={state}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleStateChange(state)}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              background: currentState === state ? colors.cyan : theme.elevated,
              color: currentState === state ? '#FFFFFF' : theme.textSecondary,
              transition: 'all 0.2s',
            }}
          >
            {state === 'paywall' && 'Offres'}
            {state === 'mon-plan' && 'Mon Plan'}
            {state === 'referral' && 'Parrainage'}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ========================
// PAYWALL VIEW
// ========================
function PaywallView({
  theme,
  isDark,
  isAnnual,
  setIsAnnual,
  direction,
  onClose,
  context,
}: {
  theme: typeof colors.dark;
  isDark: boolean;
  isAnnual: boolean;
  setIsAnnual: (v: boolean) => void;
  direction: number;
  onClose?: () => void;
  context?: 'onboarding' | 'settings';
}) {
  const waitlist = useWaitlist();
  const userId = useStore((s) => s.userId);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [showWaitlist, setShowWaitlist] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setWaitlistEmail(data.user.email);
    });
  }, []);

  const billingCycle = isAnnual ? 'yearly' as const : 'monthly' as const;

  return (
    <motion.div
      initial={{ x: direction * 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: direction * -40, opacity: 0 }}
      transition={springConfig}
      style={{ paddingBottom: 80 }}
    >
      {/* Header Gradient */}
      <div
        style={{
          height: 200,
          background: 'linear-gradient(180deg, #3BB4C1 0%, #1E3A5F 45%, #4A2C5A 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...springConfig, delay: 0.1 }}
        >
          <Shield size={56} color="#FFFFFF" strokeWidth={1.5} />
        </motion.div>
        <motion.h1
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ...springConfig, delay: 0.2 }}
          style={{
            fontSize: 26,
            fontWeight: 300,
            color: '#FFFFFF',
            marginTop: 12,
            textAlign: 'center',
          }}
        >
          Passez à Breveil Pro
        </motion.h1>
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ...springConfig, delay: 0.3 }}
          style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.75)',
            marginTop: 4,
            textAlign: 'center',
          }}
        >
          Votre sécurité, sans compromis
        </motion.p>
      </div>

      {/* Billing Toggle */}
      <div style={{ padding: '24px 20px 0' }}>
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ...springConfig, delay: 0.4 }}
          style={{ display: 'flex', justifyContent: 'center' }}
        >
          <div
            style={{
              display: 'flex',
              background: theme.elevated,
              borderRadius: 25,
              padding: 4,
            }}
          >
            <motion.button
              onClick={() => setIsAnnual(false)}
              style={{
                padding: '10px 20px',
                borderRadius: 20,
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                background: !isAnnual ? '#FFFFFF' : 'transparent',
                color: !isAnnual ? '#0F172A' : theme.textTertiary,
                transition: 'all 0.2s',
              }}
              whileTap={{ scale: 0.98 }}
            >
              Mensuel
            </motion.button>
            <motion.button
              onClick={() => setIsAnnual(true)}
              style={{
                padding: '10px 20px',
                borderRadius: 20,
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                background: isAnnual ? '#FFFFFF' : 'transparent',
                color: isAnnual ? '#0F172A' : theme.textTertiary,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s',
              }}
              whileTap={{ scale: 0.98 }}
            >
              Annuel
              <span
                style={{
                  background: colors.gold,
                  color: '#0F172A',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 6,
                }}
              >
                -20%
              </span>
            </motion.button>
          </div>
        </motion.div>

        {/* Plan Cards */}
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Pro Card */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ ...springConfig, delay: 0.5 }}
            style={{ position: 'relative' }}
          >
            <div
              style={{
                position: 'absolute',
                top: -12,
                left: '50%',
                transform: 'translateX(-50%)',
                background: colors.gold,
                color: '#0F172A',
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 12px',
                borderRadius: 12,
                zIndex: 10,
              }}
            >
              LE PLUS POPULAIRE
            </div>

            <motion.div
              style={{
                background: 'rgba(245,195,65,0.06)',
                border: `2px solid ${colors.gold}`,
                borderRadius: 20,
                padding: 20,
                position: 'relative',
                overflow: 'hidden',
              }}
              animate={{
                boxShadow: [
                  '0 0 20px rgba(245,195,65,0.1)',
                  '0 0 30px rgba(245,195,65,0.2)',
                  '0 0 20px rgba(245,195,65,0.1)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: colors.gold }}>Pro</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={isAnnual ? 'annual' : 'monthly'}
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 10, opacity: 0 }}
                    transition={springConfig}
                    style={{ fontSize: 32, fontWeight: 300, color: theme.textPrimary }}
                  >
                    {isAnnual ? '5,59\u20AC' : '6,99\u20AC'}
                  </motion.span>
                </AnimatePresence>
                <span style={{ fontSize: 14, color: theme.textTertiary }}>/mois</span>
                {isAnnual && (
                  <span
                    style={{
                      fontSize: 14,
                      color: theme.textTertiary,
                      textDecoration: 'line-through',
                      marginLeft: 8,
                    }}
                  >
                    6,99€
                  </span>
                )}
              </div>

              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  'Tout du plan Gratuit',
                  'Cercle illimité',
                  'Marche avec moi (partage temps réel)',
                  { text: 'Julia IA \u2014 sessions illimitées', sparkle: true },
                  'Trajets illimités & historique complet',
                  'Communauté \u2014 accès complet',
                  'Alertes prioritaires de zone',
                ].map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ ...springConfig, delay: 0.6 + i * 0.05 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                  >
                    <Check size={16} color={colors.cyan} />
                    <span style={{ fontSize: 13, color: theme.textPrimary }}>
                      {typeof feature === 'string' ? feature : feature.text}
                      {typeof feature === 'object' && feature.sparkle && (
                        <Sparkles
                          size={12}
                          color={colors.gold}
                          style={{ marginLeft: 4, display: 'inline' }}
                        />
                      )}
                    </span>
                  </motion.div>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                animate={{
                  boxShadow: [
                    '0 4px 20px rgba(245,195,65,0.2)',
                    '0 4px 30px rgba(245,195,65,0.4)',
                    '0 4px 20px rgba(245,195,65,0.2)',
                  ],
                }}
                transition={{ boxShadow: { duration: 2, repeat: Infinity } }}
                style={{
                  width: '100%',
                  marginTop: 20,
                  padding: '14px 24px',
                  background: `linear-gradient(135deg, ${colors.gold} 0%, ${colors.goldDark} 100%)`,
                  border: 'none',
                  borderRadius: 14,
                  cursor: 'pointer',
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#0F172A',
                }}
              >
                {"Commencer l'essai gratuit"}
              </motion.button>

              <p style={{ fontSize: 11, color: theme.textTertiary, textAlign: 'center', marginTop: 8 }}>
                7 jours gratuits · Sans CB requise
              </p>

              {/* Separator */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                margin: '12px 0',
              }}>
                <div style={{ flex: 1, height: 1, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: isDark ? '#64748B' : '#94A3B8' }}>ou</span>
                <div style={{ flex: 1, height: 1, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }} />
              </div>

              {/* CTA waitlist — outline */}
              {!showWaitlist && waitlist.state !== 'success' && waitlist.state !== 'already' && (
                <button
                  onClick={() => setShowWaitlist(true)}
                  style={{
                    width: '100%', padding: '12px 24px', borderRadius: 32,
                    background: 'transparent',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.15)'}`,
                    fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                    color: isDark ? '#94A3B8' : '#64748B',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    transition: 'all 150ms',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.5">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  {"Être notifiée au lancement"}
                </button>
              )}

              {/* Waitlist form */}
              {showWaitlist && waitlist.state !== 'success' && waitlist.state !== 'already' && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                  style={{
                    background: isDark ? '#1E293B' : '#F8FAFC',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'}`,
                    borderRadius: 16, padding: 14,
                    display: 'flex', flexDirection: 'column', gap: 8,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#FFF' : '#0F172A' }}>
                    {"Rejoindre la liste d'attente"}
                  </div>
                  <div style={{ fontSize: 11, color: isDark ? '#64748B' : '#94A3B8' }}>
                    {"Tu seras parmi les premières informées du lancement officiel."}
                  </div>

                  <div style={{ display: 'flex', gap: 7 }}>
                    <input
                      type="email"
                      value={waitlistEmail}
                      onChange={e => setWaitlistEmail(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') waitlist.join({ email: waitlistEmail, userId: userId ?? undefined, billingPref: billingCycle })
                      }}
                      placeholder="ton@email.com"
                      style={{
                        flex: 1, background: isDark ? '#334155' : '#FFF',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.12)'}`,
                        borderRadius: 10, padding: '9px 12px',
                        fontSize: 13, fontFamily: 'inherit',
                        color: isDark ? '#FFF' : '#0F172A', outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => waitlist.join({ email: waitlistEmail, userId: userId ?? undefined, billingPref: billingCycle })}
                      disabled={waitlist.state === 'loading'}
                      style={{
                        padding: '9px 14px', borderRadius: 10,
                        background: '#3BB4C1', color: '#0F172A',
                        fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                        border: 'none', cursor: 'pointer',
                        opacity: waitlist.state === 'loading' ? 0.7 : 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {waitlist.state === 'loading' ? '...' : "M'inscrire"}
                    </button>
                  </div>

                  {waitlist.state === 'error' && (
                    <div style={{ fontSize: 11, color: '#EF4444' }}>
                      {"Une erreur est survenue. Réessaie."}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Success state */}
              {(waitlist.state === 'success' || waitlist.state === 'already') && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    padding: '12px 14px',
                    background: 'rgba(52,211,153,0.08)',
                    border: '1px solid rgba(52,211,153,0.25)',
                    borderRadius: 12,
                    display: 'flex', alignItems: 'center', gap: 9,
                  }}
                >
                  <Check size={16} color={colors.success} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: colors.success }}>
                      {waitlist.state === 'already' ? 'Déjà inscrite' : 'Tu es sur la liste !'}
                    </div>
                    <div style={{ fontSize: 10, color: isDark ? '#64748B' : '#94A3B8', marginTop: 1 }}>
                      {waitlist.state === 'already'
                        ? "On t'a déjà enregistrée — tu seras notifiée."
                        : "On te contacte dès l'ouverture officielle."}
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>

          {/* Free Card */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ ...springConfig, delay: 0.6 }}
            style={{
              background: theme.card,
              border: `1px solid ${theme.border}`,
              borderRadius: 20,
              padding: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: theme.textTertiary }}>Gratuit</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
              <span style={{ fontSize: 32, fontWeight: 300, color: theme.textPrimary }}>0€</span>
              <span style={{ fontSize: 14, color: theme.textTertiary }}>/mois</span>
            </div>

            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { text: 'Carte & signalements communautaires', included: true },
                { text: "Bouton SOS d'urgence", included: true },
                { text: 'Cercle de confiance (3 contacts max)', included: true },
                { text: '5 trajets partagés / mois', included: true },
                { text: 'Marche avec moi', included: false },
                { text: 'Julia IA', included: false },
                { text: 'Trajets illimités', included: false },
              ].map((feature, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    opacity: feature.included ? 1 : 0.4,
                  }}
                >
                  {feature.included ? (
                    <Check size={16} color={colors.success} />
                  ) : (
                    <Lock size={16} color={theme.textTertiary} />
                  )}
                  <span style={{ fontSize: 13, color: theme.textPrimary }}>{feature.text}</span>
                </div>
              ))}
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              style={{
                width: '100%',
                marginTop: 20,
                padding: '14px 24px',
                background: 'transparent',
                border: `1px solid ${theme.border}`,
                borderRadius: 14,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                color: theme.textSecondary,
              }}
            >
              Continuer gratuitement
            </motion.button>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ...springConfig, delay: 0.7 }}
          style={{ marginTop: 24, textAlign: 'center' }}
        >
          <p style={{ fontSize: 12, color: theme.textTertiary }}>
            {"7 jours d'essai gratuit · Annulez à tout moment"}
          </p>
          <p style={{ fontSize: 11, color: theme.textTertiary, marginTop: 4 }}>
            Via Apple / Google · Aucun engagement
          </p>
          {onClose && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              style={{
                marginTop: 12,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                color: theme.textTertiary,
                textDecoration: 'underline',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {context === 'onboarding' ? 'Continuer sans Pro' : 'Retour'}
              <ChevronRight size={14} />
            </motion.button>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

// ========================
// MON PLAN VIEW
// ========================
function MonPlanView({
  theme,
  isDark,
  userPlan,
  setUserPlan,
  onNavigate,
  direction,
}: {
  theme: typeof colors.dark;
  isDark: boolean;
  userPlan: PlanType;
  setUserPlan: (v: PlanType) => void;
  onNavigate: (state: AppState) => void;
  direction: number;
}) {
  return (
    <motion.div
      initial={{ x: direction * 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: direction * -40, opacity: 0 }}
      transition={springConfig}
      style={{ paddingBottom: 80 }}
    >
      <div
        style={{
          padding: '24px 20px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onNavigate('paywall')}
          style={{
            background: theme.elevated,
            border: 'none',
            borderRadius: 12,
            padding: 10,
            cursor: 'pointer',
            display: 'flex',
          }}
        >
          <ChevronLeft size={20} color={theme.textPrimary} />
        </motion.button>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: theme.textPrimary }}>Mon abonnement</h1>
      </div>

      <div style={{ padding: '0 20px' }}>
        {userPlan === 'pro' ? (
          <>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ ...springConfig, delay: 0.1 }}
              style={{
                background: 'rgba(245,195,65,0.06)',
                border: `2px solid ${colors.gold}`,
                borderRadius: 20,
                padding: 20,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Shield size={36} color={colors.gold} />
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 600, color: theme.textPrimary }}>Breveil Pro</h3>
                    <p style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>
                      {"Actif jusqu'au 4 avril 2026"}
                    </p>
                  </div>
                </div>
                <span
                  style={{
                    background: colors.gold,
                    color: '#0F172A',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 8,
                  }}
                >
                  PRO
                </span>
              </div>
              <p style={{ fontSize: 12, color: theme.textTertiary, marginTop: 12 }}>Géré via App Store</p>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ ...springConfig, delay: 0.2 }}
              style={{ marginTop: 20, background: theme.card, borderRadius: 16, overflow: 'hidden' }}
            >
              {[
                { icon: ExternalLink, label: "Gérer l'abonnement", action: () => {} },
                { icon: Gift, label: 'Parrainer un ami', action: () => onNavigate('referral') },
                { icon: History, label: 'Historique des paiements', action: () => {} },
                { icon: RotateCcw, label: 'Restaurer les achats', action: () => {} },
              ].map((item, i) => (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.98 }}
                  onClick={item.action}
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: i < 3 ? `1px solid ${theme.border}` : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <item.icon size={18} color={theme.textSecondary} />
                    <span style={{ fontSize: 14, color: theme.textPrimary }}>{item.label}</span>
                  </div>
                  <ChevronRight size={16} color={theme.textTertiary} />
                </motion.button>
              ))}
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ ...springConfig, delay: 0.3 }}
              style={{ marginTop: 24 }}
            >
              <h4 style={{ fontSize: 14, fontWeight: 600, color: theme.textSecondary, marginBottom: 12 }}>
                Vos avantages Pro
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Cercle illimité', desc: 'Ajoutez autant de contacts que nécessaire' },
                  { label: 'Marche avec moi', desc: 'Partage de position en temps réel' },
                  { label: 'Julia IA', desc: 'Votre assistante sécurité personnelle' },
                  { label: 'Trajets illimités', desc: 'Historique complet de vos déplacements' },
                  { label: 'Communauté complète', desc: 'Accès à toutes les fonctionnalités' },
                  { label: 'Alertes prioritaires', desc: 'Notifications de zone en temps réel' },
                ].map((feature, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <Check size={16} color={colors.cyan} style={{ marginTop: 2 }} />
                    <div>
                      <p style={{ fontSize: 14, color: theme.textPrimary }}>{feature.label}</p>
                      <p style={{ fontSize: 12, color: theme.textTertiary, marginTop: 2 }}>{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ ...springConfig, delay: 0.4 }}
              style={{ marginTop: 24, padding: 16, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 14 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <AlertTriangle size={20} color={colors.danger} />
                <div>
                  <p
                    style={{ fontSize: 14, fontWeight: 600, color: colors.danger, cursor: 'pointer' }}
                    onClick={() => setUserPlan('free')}
                  >
                    Passer en Gratuit
                  </p>
                  <p style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                    {"Vous perdrez l'accès à Julia, Marche avec moi et votre historique."}
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        ) : (
          <>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ ...springConfig, delay: 0.1 }}
              style={{ background: theme.elevated, borderRadius: 20, padding: 20 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Shield size={36} color={theme.textSecondary} />
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 600, color: theme.textPrimary }}>Breveil Gratuit</h3>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onNavigate('paywall')}
                  style={{
                    background: colors.cyan,
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#FFFFFF',
                  }}
                >
                  Passez à Pro
                </motion.button>
              </div>

              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: theme.textSecondary }}>Cercle</span>
                    <span style={{ fontSize: 13, color: theme.textPrimary }}>2/3 contacts</span>
                  </div>
                  <div style={{ height: 6, background: theme.border, borderRadius: 3, overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '66%' }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      style={{ height: '100%', background: colors.cyan, borderRadius: 3 }}
                    />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: theme.textSecondary }}>Trajets</span>
                    <span style={{ fontSize: 13, color: theme.textPrimary }}>3/5 ce mois</span>
                  </div>
                  <div style={{ height: 6, background: theme.border, borderRadius: 3, overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '60%' }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                      style={{ height: '100%', background: colors.cyan, borderRadius: 3 }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ ...springConfig, delay: 0.2 }}
              style={{
                marginTop: 20,
                padding: 20,
                background: 'rgba(245,195,65,0.06)',
                border: `1px solid ${colors.gold}`,
                borderRadius: 16,
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: 16, fontWeight: 500, color: theme.textPrimary }}>
                Passez à Pro pour débloquer toutes les fonctionnalités
              </p>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setUserPlan('pro')}
                style={{
                  marginTop: 16,
                  padding: '12px 32px',
                  background: `linear-gradient(135deg, ${colors.gold} 0%, ${colors.goldDark} 100%)`,
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#0F172A',
                }}
              >
                Voir les offres
              </motion.button>
            </motion.div>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ========================
// REFERRAL VIEW
// ========================
function ReferralView({
  theme,
  isDark,
  copied,
  onCopy,
  direction,
}: {
  theme: typeof colors.dark;
  isDark: boolean;
  copied: boolean;
  onCopy: () => void;
  direction: number;
}) {
  return (
    <motion.div
      initial={{ x: direction * 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: direction * -40, opacity: 0 }}
      transition={springConfig}
      style={{ paddingBottom: 80 }}
    >
      <div
        style={{
          padding: '24px 20px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          style={{
            background: theme.elevated,
            border: 'none',
            borderRadius: 12,
            padding: 10,
            cursor: 'pointer',
            display: 'flex',
          }}
        >
          <ChevronLeft size={20} color={theme.textPrimary} />
        </motion.button>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: theme.textPrimary }}>Parrainer un ami</h1>
      </div>

      <div style={{ padding: '0 20px' }}>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ...springConfig, delay: 0.1 }}
          style={{ textAlign: 'center', marginTop: 20 }}
        >
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'rgba(245,195,65,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
            }}
          >
            <Gift size={48} color={colors.gold} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 300, color: theme.textPrimary, marginTop: 20 }}>
            Invitez vos proches
          </h2>
          <p style={{ fontSize: 14, color: theme.textSecondary, marginTop: 8, lineHeight: 1.5 }}>
            1 mois offert pour vous et votre filleule à chaque inscription Pro.
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ...springConfig, delay: 0.2 }}
          style={{ marginTop: 32, padding: 24, background: theme.card, borderRadius: 20, textAlign: 'center' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <motion.span
              style={{
                fontSize: 28,
                fontWeight: 700,
                fontFamily: 'monospace',
                color: colors.cyan,
                letterSpacing: '0.15em',
              }}
            >
              BREVEIL-TOM
            </motion.span>
            <motion.button
              whileTap={{ scale: 0.9 }}
              animate={copied ? { scale: [1, 1.2, 1] } : {}}
              onClick={onCopy}
              style={{
                background: theme.elevated,
                border: 'none',
                borderRadius: 8,
                padding: 8,
                cursor: 'pointer',
                display: 'flex',
              }}
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <Check size={18} color={colors.success} />
                  </motion.div>
                ) : (
                  <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <Copy size={18} color={colors.cyan} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
          <p style={{ fontSize: 12, color: theme.textTertiary, marginTop: 12 }}>
            {copied ? 'Copié !' : 'Partagez ce code avec vos amies'}
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ...springConfig, delay: 0.3 }}
          style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
        >
          {[
            { icon: MessageSquare, label: 'SMS', color: colors.success },
            { icon: Mail, label: 'Email', color: colors.cyan },
            { icon: Phone, label: 'WhatsApp', color: '#25D366' },
            { icon: Link2, label: 'Copier le lien', color: colors.purple },
          ].map((item, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: '16px',
                background: theme.card,
                border: `1px solid ${theme.border}`,
                borderRadius: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <item.icon size={18} color={item.color} />
              <span style={{ fontSize: 13, fontWeight: 500, color: theme.textPrimary }}>{item.label}</span>
            </motion.button>
          ))}
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ...springConfig, delay: 0.4 }}
          style={{
            marginTop: 24,
            padding: 16,
            background: 'rgba(52, 211, 153, 0.1)',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Check size={18} color={colors.success} />
          <span style={{ fontSize: 14, fontWeight: 500, color: colors.success }}>
            2 filleules · 2 mois offerts
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
