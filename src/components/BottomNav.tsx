// src/components/BottomNav.tsx

'use client';

import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/stores/useStore';
import { useShallow } from 'zustand/react/shallow';
import { useIsDark } from '@/hooks/useIsDark';
import { useNotificationStore } from '@/stores/notificationStore';
import { useTranslations } from 'next-intl';

type Tab = 'map' | 'community' | 'cercle' | 'trip' | 'me';

const ACCENT = '#3BB4C1';
const DANGER = '#EF4444';

const KEYFRAMES = `
  @keyframes bv-b1 {
    0%,100%{transform:translate(0,0) scale(1)}
    25%{transform:translate(3px,2px) scale(.94)}
    50%{transform:translate(4px,3px) scale(.91)}
    75%{transform:translate(1px,1px) scale(.97)}
  }
  @keyframes bv-b2 {
    0%,100%{transform:translate(0,0) scale(1)}
    25%{transform:translate(-3px,-2px) scale(1.05)}
    50%{transform:translate(-4px,-3px) scale(1.08)}
    75%{transform:translate(-1px,-1px) scale(1.02)}
  }
  @keyframes bv-dot {
    0%,80%,100%{transform:scale(1);opacity:.9}
    40%{transform:scale(.35);opacity:.25}
  }
  @keyframes eyeBlink {
    0%,80%,100%{transform:scaleY(1)}
    90%{transform:scaleY(0.06)}
  }
  @keyframes eyeGlow {
    0%,100%{filter:drop-shadow(0 0 2px rgba(59,130,246,.3))}
    50%{filter:drop-shadow(0 0 7px rgba(59,130,246,.9))}
  }
  @keyframes compSpin {
    0%{transform:rotate(0deg)}
    20%{transform:rotate(40deg)}
    40%{transform:rotate(-15deg)}
    60%{transform:rotate(25deg)}
    80%{transform:rotate(-5deg)}
    100%{transform:rotate(0deg)}
  }
  @keyframes jFloat {
    0%,100%{transform:translateY(0)}
    50%{transform:translateY(-2px)}
  }
  @keyframes jMorph {
    0%,100%{transform:scale(1,1)}
    20%{transform:scale(1.06,.94)}
    40%{transform:scale(.93,1.08)}
    60%{transform:scale(1.04,.96)}
    80%{transform:scale(.96,1.04)}
  }
  @keyframes ripple-burst {
    from{transform:scale(0);opacity:1}
    to{transform:scale(2.5);opacity:0}
  }
  @keyframes tab-pop {
    0%{transform:scale(1)}
    40%{transform:scale(1.25)}
    70%{transform:scale(0.9)}
    100%{transform:scale(1)}
  }
  @keyframes tab-bounce {
    0%{transform:translateY(0)}
    30%{transform:translateY(-4px)}
    60%{transform:translateY(1px)}
    100%{transform:translateY(0)}
  }
`;

function BottomNav({ onTabPress }: { onTabPress?: (tab: Tab) => void }) {
  const isDark = useIsDark();
  const { activeTab, setActiveTab, unreadDmCount } = useStore(useShallow((s) => ({ activeTab: s.activeTab, setActiveTab: s.setActiveTab, unreadDmCount: s.unreadDmCount })));
  const badgeCount = useNotificationStore((s) => s.badgeCount);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const t = useTranslations('nav');

  const [pressedTab, setPressedTab] = useState<string | null>(null);
  const [poppingTab, setPoppingTab] = useState<string | null>(null);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  const inactiveColor = isDark ? '#64748B' : '#94A3B8';

  const handleTabClick = (tab: { id: Tab; labelKey: string; disabled?: boolean }) => {
    if (tab.disabled) return;
    if (tab.id === 'community') markAllRead();

    setPressedTab(tab.id);
    setPoppingTab(tab.id);
    if (onTabPress) onTabPress(tab.id);
    else setActiveTab(tab.id);

    setTimeout(() => setPressedTab(null), 400);
    setTimeout(() => setPoppingTab(null), 350);
  };

  const communityTab = { id: 'community' as Tab, labelKey: 'community', disabled: false };
  const cercleTab = { id: 'cercle' as Tab, labelKey: 'cercle', disabled: false };
  const tripTab = { id: 'trip' as Tab, labelKey: 'trip', disabled: false };
  const meTab = { id: 'me' as Tab, labelKey: 'me', disabled: false };

  const isCommunityActive = activeTab === 'community';
  const isCercleActive = activeTab === 'cercle';
  const isTripActive = activeTab === 'trip';
  const isMeActive = activeTab === 'me';

  const communityBadge = (badgeCount + unreadDmCount) > 0 ? (badgeCount + unreadDmCount) : 0;

  const communityColor = isCommunityActive ? ACCENT : inactiveColor;
  const cercleColor = isCercleActive ? ACCENT : inactiveColor;
  const tripColor = isTripActive ? ACCENT : inactiveColor;
  const meColor = isMeActive ? ACCENT : inactiveColor;

  const animCommunity = hoveredTab === 'community' || pressedTab === 'community';
  const animCercle = hoveredTab === 'cercle' || pressedTab === 'cercle';
  const animTrip = hoveredTab === 'trip' || pressedTab === 'trip';
  const animMe = hoveredTab === 'me' || pressedTab === 'me';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      <nav
        id="bottom-nav"
        aria-label="Main navigation"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 300,
          background: activeTab !== 'map'
            ? (isDark ? '#0F172A' : '#F8FAFC')
            : (isDark ? 'rgba(15, 23, 42, 0.82)' : 'rgba(255, 255, 255, 0.82)'),
          backdropFilter: activeTab !== 'map' ? 'none' : 'blur(20px)',
          WebkitBackdropFilter: activeTab !== 'map' ? 'none' : 'blur(20px)',
          borderTop: activeTab !== 'map' ? 'none' : `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
          transition: 'background 200ms, border-top 200ms',
        }}
      >
        <div style={{ display: 'flex', height: 64 }}>

          {/* ═══════════════════════════════════════ */}
          {/* ── TAB: Community (double-bubble)  ──── */}
          {/* ═══════════════════════════════════════ */}
          <button
            onClick={() => handleTabClick(communityTab)}
            onMouseEnter={() => setHoveredTab('community')}
            onMouseLeave={() => setHoveredTab(null)}
            aria-label={t(communityTab.labelKey)}
            aria-current={isCommunityActive ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              padding: '4px 0',
              position: 'relative',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              opacity: isCommunityActive ? 1 : 0.35,
              transition: 'opacity 250ms',
            }}
          >
            {isCommunityActive && (
              <motion.div
                layoutId="nav-dot"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: ACCENT,
                }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              />
            )}
            {pressedTab === 'community' && (
              <span
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: 32,
                  height: 32,
                  marginTop: -16,
                  marginLeft: -16,
                  borderRadius: '50%',
                  background: 'rgba(59, 180, 193, 0.4)',
                  animation: 'ripple-burst 400ms ease-out forwards',
                  pointerEvents: 'none',
                }}
              />
            )}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation:
                  poppingTab === 'community' && isCommunityActive
                    ? 'tab-pop 350ms ease-out'
                    : pressedTab === 'community'
                      ? 'tab-bounce 400ms ease-out'
                      : undefined,
              }}
            >
              {communityBadge > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -10,
                    minWidth: 16,
                    height: 16,
                    padding: '0 4px',
                    background: DANGER,
                    color: '#fff',
                    fontSize: 9,
                    fontWeight: 700,
                    borderRadius: 99,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                    zIndex: 10,
                  }}
                >
                  {communityBadge > 99 ? '99+' : communityBadge}
                </span>
              )}
              <div style={{ position: 'relative', width: 28, height: 26 }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0,
                  width: 18, height: 16,
                  borderRadius: '9px 9px 2px 9px',
                  background: 'linear-gradient(140deg,#5BC8F5,#3BA8E8)',
                  boxShadow: '0 0 8px rgba(59,168,232,0.35)',
                  animation: animCommunity ? 'bv-b1 2s ease-in-out infinite' : 'none',
                }}>
                  <div style={{
                    position: 'absolute', bottom: -4, left: 3,
                    width: 0, height: 0,
                    borderLeft: '4px solid transparent',
                    borderRight: '2px solid transparent',
                    borderTop: '5px solid #3BA8E8',
                  }} />
                </div>
                <div style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 19, height: 17,
                  borderRadius: '9px 9px 9px 2px',
                  background: 'linear-gradient(135deg,rgba(160,220,255,0.65),rgba(90,175,245,0.5))',
                  border: '1px solid rgba(255,255,255,0.6)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)',
                  animation: animCommunity ? 'bv-b2 2s ease-in-out infinite' : 'none',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 2,
                }}>
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <div key={i} style={{
                      width: 2.5, height: 2.5, borderRadius: '50%',
                      background: 'white', opacity: 0.9,
                      animation: animCommunity ? `bv-dot 1.4s ease-in-out infinite ${delay}s` : 'none',
                    }} />
                  ))}
                  <div style={{
                    position: 'absolute', bottom: -4, right: 3,
                    width: 0, height: 0,
                    borderLeft: '2px solid transparent',
                    borderRight: '4px solid transparent',
                    borderTop: '5px solid rgba(100,185,250,0.55)',
                  }} />
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.58rem',
                fontWeight: 600,
                letterSpacing: '0.02em',
                lineHeight: 1,
                color: communityColor,
                transition: 'color 150ms',
              }}
            >
              {t(communityTab.labelKey)}
            </span>
          </button>

          {/* ═══════════════════════════════════════ */}
          {/* ── TAB: Cercle (eye icon)  ──────────── */}
          {/* ═══════════════════════════════════════ */}
          <button
            onClick={() => handleTabClick(cercleTab)}
            onMouseEnter={() => setHoveredTab('cercle')}
            onMouseLeave={() => setHoveredTab(null)}
            aria-label={t(cercleTab.labelKey)}
            aria-current={isCercleActive ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              padding: '4px 0',
              position: 'relative',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              opacity: isCercleActive ? 1 : 0.35,
              transition: 'opacity 250ms',
            }}
          >
            {isCercleActive && (
              <motion.div
                layoutId="nav-dot"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: ACCENT,
                }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              />
            )}
            {pressedTab === 'cercle' && (
              <span
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: 32,
                  height: 32,
                  marginTop: -16,
                  marginLeft: -16,
                  borderRadius: '50%',
                  background: 'rgba(59, 180, 193, 0.4)',
                  animation: 'ripple-burst 400ms ease-out forwards',
                  pointerEvents: 'none',
                }}
              />
            )}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation:
                  poppingTab === 'cercle' && isCercleActive
                    ? 'tab-pop 350ms ease-out'
                    : pressedTab === 'cercle'
                      ? 'tab-bounce 400ms ease-out'
                      : undefined,
              }}
            >
              <svg width={34} height={24} viewBox="0 0 40 28" fill="none">
                <defs>
                  <linearGradient id="bv-eg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#5BC8F5" />
                    <stop offset="100%" stopColor="#2A6FD4" />
                  </linearGradient>
                  <radialGradient id="bv-ig" cx="42%" cy="38%" r="50%">
                    <stop offset="0%" stopColor="#5BC8F5" />
                    <stop offset="40%" stopColor="#2A6FD4" />
                    <stop offset="100%" stopColor="#0A1A5A" />
                  </radialGradient>
                </defs>
                <g style={{
                  transformOrigin: '20px 14px',
                  animation: animCercle ? 'eyeBlink 1.5s ease-in-out infinite, eyeGlow 1.5s ease-in-out infinite' : 'none',
                }}>
                  <path
                    d="M2,14 Q10,2 20,2 Q30,2 38,14 Q30,26 20,26 Q10,26 2,14 Z"
                    fill="rgba(59,130,246,0.08)"
                    stroke="url(#bv-eg)"
                    strokeWidth={1.8}
                  />
                  <circle fill="url(#bv-ig)" cx={20} cy={14} r={8} />
                  <circle fill="#0A1A5A" cx={20} cy={14} r={4} />
                  <ellipse
                    fill="rgba(255,255,255,0.7)"
                    cx={17} cy={11} rx={2.5} ry={1.8}
                    transform="rotate(-20,17,11)"
                  />
                  <circle fill="rgba(255,255,255,0.5)" cx={23} cy={16} r={1} />
                </g>
              </svg>
            </div>
            <span
              style={{
                fontSize: '0.58rem',
                fontWeight: 600,
                letterSpacing: '0.02em',
                lineHeight: 1,
                color: cercleColor,
                transition: 'color 150ms',
              }}
            >
              {t(cercleTab.labelKey)}
            </span>
          </button>

          {/* ═══════════════════════════════════════ */}
          {/* ── TAB: Trip (compass icon)  ────────── */}
          {/* ═══════════════════════════════════════ */}
          <button
            onClick={() => handleTabClick(tripTab)}
            onMouseEnter={() => setHoveredTab('trip')}
            onMouseLeave={() => setHoveredTab(null)}
            aria-label={t(tripTab.labelKey)}
            aria-current={isTripActive ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              padding: '4px 0',
              position: 'relative',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              opacity: isTripActive ? 1 : 0.35,
              transition: 'opacity 250ms',
            }}
          >
            {isTripActive && (
              <motion.div
                layoutId="nav-dot"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: ACCENT,
                }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              />
            )}
            {pressedTab === 'trip' && (
              <span
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: 32,
                  height: 32,
                  marginTop: -16,
                  marginLeft: -16,
                  borderRadius: '50%',
                  background: 'rgba(59, 180, 193, 0.4)',
                  animation: 'ripple-burst 400ms ease-out forwards',
                  pointerEvents: 'none',
                }}
              />
            )}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation:
                  poppingTab === 'trip' && isTripActive
                    ? 'tab-pop 350ms ease-out'
                    : pressedTab === 'trip'
                      ? 'tab-bounce 400ms ease-out'
                      : undefined,
              }}
            >
              <svg width={30} height={30} viewBox="0 0 40 40" fill="none">
                <defs>
                  <linearGradient id="bv-cg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#5BC8F5" />
                    <stop offset="100%" stopColor="#2A8AD4" />
                  </linearGradient>
                </defs>
                <circle cx={20} cy={20} r={17} fill="rgba(59,180,193,0.06)" stroke="url(#bv-cg)" strokeWidth={1.5} />
                <g stroke="#5BC8F5" strokeWidth={0.8} opacity={0.3}>
                  <line x1={20} y1={4} x2={20} y2={7} />
                  <line x1={20} y1={33} x2={20} y2={36} />
                  <line x1={4} y1={20} x2={7} y2={20} />
                  <line x1={33} y1={20} x2={36} y2={20} />
                </g>
                <g style={{
                  transformOrigin: '20px 20px',
                  animation: animTrip ? 'compSpin 3s cubic-bezier(0.34,1.56,0.64,1) infinite' : 'none',
                }}>
                  <polygon points="20,5 22.5,20 20,18 17.5,20" fill="url(#bv-cg)" />
                  <polygon points="20,35 22.5,20 20,22 17.5,20" fill="rgba(59,130,246,0.25)" />
                </g>
                <circle cx={20} cy={20} r={2.5} fill="#3BB4C1" />
                <circle cx={20} cy={20} r={1} fill="white" />
              </svg>
            </div>
            <span
              style={{
                fontSize: '0.58rem',
                fontWeight: 600,
                letterSpacing: '0.02em',
                lineHeight: 1,
                color: tripColor,
                transition: 'color 150ms',
              }}
            >
              {t(tripTab.labelKey)}
            </span>
          </button>

          {/* ═══════════════════════════════════════ */}
          {/* ── TAB: Me / Julia (bubble icon) ────── */}
          {/* ═══════════════════════════════════════ */}
          <button
            onClick={() => handleTabClick(meTab)}
            onMouseEnter={() => setHoveredTab('me')}
            onMouseLeave={() => setHoveredTab(null)}
            aria-label={t(meTab.labelKey)}
            aria-current={isMeActive ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              padding: '4px 0',
              position: 'relative',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              opacity: isMeActive ? 1 : 0.35,
              transition: 'opacity 250ms',
            }}
          >
            {isMeActive && (
              <motion.div
                layoutId="nav-dot"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: ACCENT,
                }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              />
            )}
            {pressedTab === 'me' && (
              <span
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: 32,
                  height: 32,
                  marginTop: -16,
                  marginLeft: -16,
                  borderRadius: '50%',
                  background: 'rgba(59, 180, 193, 0.4)',
                  animation: 'ripple-burst 400ms ease-out forwards',
                  pointerEvents: 'none',
                }}
              />
            )}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation:
                  poppingTab === 'me' && isMeActive
                    ? 'tab-pop 350ms ease-out'
                    : pressedTab === 'me'
                      ? 'tab-bounce 400ms ease-out'
                      : undefined,
              }}
            >
              <svg width={30} height={30} viewBox="0 0 40 40" fill="none">
                <defs>
                  <radialGradient id="bv-bb" cx="38%" cy="32%" r="65%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
                    <stop offset="35%" stopColor="rgba(160,210,255,0.55)" />
                    <stop offset="70%" stopColor="rgba(100,160,255,0.38)" />
                    <stop offset="100%" stopColor="rgba(80,100,220,0.2)" />
                  </radialGradient>
                </defs>
                <g style={{
                  transformOrigin: '20px 20px',
                  animation: animMe ? 'jFloat 2s ease-in-out infinite' : 'none',
                }}>
                  <path
                    style={{
                      animation: animMe ? 'jMorph 3s ease-in-out infinite' : 'none',
                    }}
                    d="M20,6 C28,6 34,12 34,20 C34,28 28,34 20,34 C12,34 6,28 6,20 C6,12 12,6 20,6 Z"
                    fill="url(#bv-bb)"
                    stroke="rgba(180,220,255,0.55)"
                    strokeWidth={1}
                  />
                  <ellipse
                    cx={15} cy={13} rx={5} ry={3.5}
                    fill="rgba(255,255,255,0.5)"
                    transform="rotate(-30,15,13)"
                  />
                  <ellipse
                    cx={14} cy={12} rx={2.5} ry={1.5}
                    fill="rgba(255,255,255,0.75)"
                    transform="rotate(-30,14,12)"
                  />
                </g>
              </svg>
            </div>
            <span
              style={{
                fontSize: '0.58rem',
                fontWeight: 600,
                letterSpacing: '0.02em',
                lineHeight: 1,
                color: meColor,
                transition: 'color 150ms',
              }}
            >
              {t(meTab.labelKey)}
            </span>
          </button>

        </div>

        {/* Safe area spacer */}
        <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </nav>
    </>
  );
}

export default memo(BottomNav);
