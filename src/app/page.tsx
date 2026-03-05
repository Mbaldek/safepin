'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

/* ------------------------------------------------------------------ */
/*  Landing-page CSS (injected as global <style>)                      */
/* ------------------------------------------------------------------ */
const landingCSS = `
/* ===== LANDING PAGE STYLES ===== */
.landing-root {
  background: #0A0F1E;
  color: #FFFFFF;
  font-family: 'DM Sans', sans-serif;
  overflow-x: hidden;
  min-height: 100dvh;
}
.landing-root *, .landing-root *::before, .landing-root *::after {
  box-sizing: border-box;
}

/* NAV */
.lp-nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:20px 48px;display:flex;align-items:center;justify-content:space-between;background:rgba(10,15,30,0.8);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,0.08)}
.nav-logo{display:flex;align-items:center;gap:10px;font-size:18px;font-weight:600;letter-spacing:-0.02em}
.nav-logo svg{width:28px;height:28px}
.nav-links{display:flex;align-items:center;gap:32px}
.nav-links a{color:#94A3B8;text-decoration:none;font-size:14px;font-weight:500;transition:color .2s}
.nav-links a:hover{color:#FFFFFF}
.nav-cta{background:#3BB4C1;color:#fff;padding:10px 22px;border-radius:100px;font-size:14px;font-weight:600;text-decoration:none;transition:opacity .2s}
.nav-cta:hover{opacity:.85}

/* HERO */
.hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:120px 24px 80px;position:relative;overflow:hidden}
.hero-gradient{position:absolute;top:-200px;left:50%;transform:translateX(-50%);width:800px;height:800px;background:radial-gradient(ellipse at center,rgba(59,180,193,0.18) 0%,rgba(92,61,94,0.12) 50%,transparent 70%);pointer-events:none}
.hero-tag{display:inline-flex;align-items:center;gap:8px;background:rgba(59,180,193,0.12);border:1px solid rgba(59,180,193,0.3);border-radius:100px;padding:6px 16px;font-size:12px;font-weight:600;color:#3BB4C1;text-transform:uppercase;letter-spacing:.08em;margin-bottom:28px}
.hero-tag span{width:6px;height:6px;border-radius:50%;background:#3BB4C1;animation:lp-pulse-dot 2s infinite}
.landing-root h1{font-family:'DM Serif Display',serif;font-size:clamp(52px,7vw,88px);font-weight:400;line-height:1.05;letter-spacing:-0.03em;margin-bottom:24px;max-width:800px}
.landing-root h1 em{font-style:italic;background:linear-gradient(180deg,#3BB4C1 0%,#1E3A5F 45%,#4A2C5A 75%,#5C3D5E 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hero-sub{font-size:18px;color:#94A3B8;line-height:1.7;max-width:520px;margin:0 auto 48px;font-weight:400}
.hero-actions{display:flex;gap:16px;align-items:center;justify-content:center;flex-wrap:wrap}
.btn-primary{background:linear-gradient(180deg,#3BB4C1 0%,#1E3A5F 45%,#4A2C5A 75%,#5C3D5E 100%);color:#fff;padding:16px 32px;border-radius:100px;font-size:16px;font-weight:600;text-decoration:none;transition:transform .2s,box-shadow .2s;box-shadow:0 4px 24px rgba(59,180,193,0.3)}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(59,180,193,0.4)}
.btn-ghost{color:#94A3B8;padding:16px 32px;border-radius:100px;font-size:16px;font-weight:500;text-decoration:none;border:1px solid rgba(255,255,255,0.08);transition:border-color .2s,color .2s}
.btn-ghost:hover{border-color:rgba(255,255,255,0.2);color:#FFFFFF}
.hero-social-proof{margin-top:56px;display:flex;align-items:center;gap:20px;color:#64748B;font-size:13px}
.proof-avatars{display:flex}
.proof-avatars span{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;border:2px solid #0A0F1E;margin-left:-8px}
.proof-avatars span:first-child{margin-left:0}

/* PHONE MOCKUP */
.phone-section{padding:80px 48px;display:flex;justify-content:center;position:relative}
.phone-wrap{position:relative;width:320px;height:640px}
.phone-frame{width:100%;height:100%;border-radius:44px;background:#1A2540;border:1px solid rgba(255,255,255,0.12);overflow:hidden;position:relative;box-shadow:0 40px 100px rgba(0,0,0,0.6)}
.phone-screen-grad{width:100%;height:260px;background:linear-gradient(180deg,#3BB4C1 0%,#1E3A5F 45%,#4A2C5A 75%,#5C3D5E 100%)}
.phone-content{padding:0 16px}
.phone-pill{margin-top:-24px;background:rgba(26,37,64,0.95);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:14px 16px;display:flex;align-items:center;gap:10px}
.phone-pill-dot{width:8px;height:8px;border-radius:50%;background:#34D399;box-shadow:0 0 8px #34D399}
.phone-cards{margin-top:12px;display:flex;flex-direction:column;gap:8px}
.phone-card{background:#1E293B;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px}
.phone-card-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.phone-card-text{font-size:12px;color:#FFFFFF;font-weight:500;line-height:1.4}
.phone-card-sub{font-size:10px;color:#64748B;margin-top:2px}
.phone-glow{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:400px;height:400px;background:radial-gradient(ellipse,rgba(59,180,193,0.12) 0%,transparent 70%);pointer-events:none;z-index:-1}

/* STATS */
.stats{padding:80px 48px;display:flex;justify-content:center;gap:8px;flex-wrap:wrap;max-width:900px;margin:0 auto}
.stat-card{flex:1;min-width:200px;background:#1A2540;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:32px 28px;text-align:center}
.stat-num{font-family:'DM Serif Display',serif;font-size:48px;font-weight:400;line-height:1;letter-spacing:-0.02em}
.stat-num.cyan{color:#3BB4C1}
.stat-num.gold{color:#F5C341}
.stat-num.success{color:#34D399}
.stat-label{font-size:13px;color:#94A3B8;margin-top:8px;font-weight:500}

/* FEATURES */
.features{padding:80px 48px;max-width:1100px;margin:0 auto}
.section-tag{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#3BB4C1;margin-bottom:16px}
.section-title{font-family:'DM Serif Display',serif;font-size:clamp(32px,4vw,52px);font-weight:400;line-height:1.15;letter-spacing:-0.02em;margin-bottom:56px;max-width:600px}
.section-title em{font-style:italic;color:#3BB4C1}
.features-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}
.feature-card{background:#1A2540;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:32px;position:relative;overflow:hidden;transition:border-color .3s,transform .3s}
.feature-card:hover{border-color:rgba(59,180,193,0.3);transform:translateY(-4px)}
.feature-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;border-radius:20px 20px 0 0;opacity:0;transition:opacity .3s}
.feature-card:hover::before{opacity:1}
.fc-sos::before{background:#EF4444}
.fc-trajet::before{background:#3BB4C1}
.fc-comunity::before{background:#A78BFA}
.fc-map::before{background:#F5C341}
.fc-escort::before{background:#34D399}
.fc-julia::before{background:#A78BFA}
.feature-icon{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:20px}
.fi-danger{background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.2)}
.fi-cyan{background:rgba(59,180,193,0.12);border:1px solid rgba(59,180,193,0.2)}
.fi-purple{background:rgba(167,139,250,0.12);border:1px solid rgba(167,139,250,0.2)}
.fi-gold{background:rgba(245,195,65,0.12);border:1px solid rgba(245,195,65,0.2)}
.fi-success{background:rgba(52,211,153,0.12);border:1px solid rgba(52,211,153,0.2)}
.feature-title{font-size:18px;font-weight:600;margin-bottom:10px;letter-spacing:-0.01em}
.feature-desc{font-size:14px;color:#94A3B8;line-height:1.65}
.feature-tag{display:inline-block;margin-top:16px;font-size:11px;font-weight:600;padding:4px 10px;border-radius:100px}
.tag-pro{background:rgba(245,195,65,0.15);color:#F5C341}
.tag-free{background:rgba(52,211,153,0.15);color:#34D399}

/* HOW IT WORKS */
.how{padding:80px 48px;max-width:900px;margin:0 auto}
.steps{display:flex;flex-direction:column;gap:0}
.step{display:flex;gap:32px;align-items:flex-start;padding:32px 0;border-bottom:1px solid rgba(255,255,255,0.08);position:relative}
.step:last-child{border-bottom:none}
.step-num{width:48px;height:48px;border-radius:50%;background:#1A2540;border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-family:'DM Serif Display',serif;font-size:22px;flex-shrink:0;position:relative;z-index:1}
.step-connector{position:absolute;left:23px;top:80px;bottom:-32px;width:2px;background:rgba(255,255,255,0.08)}
.step:last-child .step-connector{display:none}
.step-content h3{font-size:20px;font-weight:600;margin-bottom:8px;letter-spacing:-0.01em}
.step-content p{font-size:14px;color:#94A3B8;line-height:1.65}

/* SAFETY ZONES */
.safety{padding:80px 48px;max-width:1100px;margin:0 auto}
.safety-grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:center}
.safety-text .section-title{margin-bottom:20px}
.safety-text p{font-size:15px;color:#94A3B8;line-height:1.7;margin-bottom:32px}
.safety-list{display:flex;flex-direction:column;gap:12px}
.safety-item{display:flex;align-items:center;gap:12px;font-size:14px;color:#94A3B8}
.safety-item::before{content:'';width:6px;height:6px;border-radius:50%;background:#34D399;flex-shrink:0}
.map-preview{background:#1A2540;border:1px solid rgba(255,255,255,0.08);border-radius:24px;height:360px;position:relative;overflow:hidden}
.map-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.08) 1px,transparent 1px);background-size:40px 40px}
.map-pin{position:absolute;width:12px;height:12px;border-radius:50%;transform:translate(-50%,-50%)}
.map-pin.p-danger{background:#EF4444;box-shadow:0 0 0 4px rgba(239,68,68,0.2);top:35%;left:45%}
.map-pin.p-warn{background:#F59E0B;box-shadow:0 0 0 4px rgba(245,158,11,0.2);top:55%;left:30%}
.map-pin.p-safe{background:#34D399;box-shadow:0 0 0 4px rgba(52,211,153,0.2);top:65%;left:62%}
.map-pin.p-user{background:#3BB4C1;box-shadow:0 0 0 8px rgba(59,180,193,0.2);top:50%;left:50%;width:16px;height:16px}

/* TESTIMONIALS */
.testimonials{padding:80px 48px;max-width:1100px;margin:0 auto}
.testimonials-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:48px}
.testimonial{background:#1A2540;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:28px}
.testimonial-quote{font-size:15px;line-height:1.7;color:#94A3B8;margin-bottom:20px;font-style:italic}
.testimonial-author{display:flex;align-items:center;gap:12px}
.author-avatar{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;flex-shrink:0}
.author-name{font-size:14px;font-weight:600}
.author-title{font-size:12px;color:#64748B;margin-top:2px}
.stars{color:#F5C341;font-size:12px;margin-bottom:12px;letter-spacing:2px}

/* PRICING */
.pricing{padding:80px 48px;max-width:800px;margin:0 auto;text-align:center}
.pricing .section-title{margin:0 auto 48px;text-align:center}
.pricing-cards{display:grid;grid-template-columns:1fr 1fr;gap:20px;text-align:left}
.pricing-card{background:#1A2540;border:1px solid rgba(255,255,255,0.08);border-radius:24px;padding:32px;position:relative}
.pricing-card.featured{border-color:rgba(245,195,65,0.4);background:rgba(245,195,65,0.04)}
.pricing-badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:#F5C341;color:#0A0F1E;font-size:11px;font-weight:700;padding:4px 16px;border-radius:100px;white-space:nowrap;text-transform:uppercase;letter-spacing:.06em}
.plan-name{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748B;margin-bottom:12px}
.plan-price{font-family:'DM Serif Display',serif;font-size:48px;font-weight:400;line-height:1;letter-spacing:-0.02em;margin-bottom:4px}
.plan-price sup{font-family:'DM Sans',sans-serif;font-size:20px;vertical-align:super}
.plan-price span{font-family:'DM Sans',sans-serif;font-size:14px;font-weight:400;color:#64748B}
.plan-period{font-size:12px;color:#64748B;margin-bottom:24px}
.plan-features{list-style:none;display:flex;flex-direction:column;gap:10px;margin-bottom:28px;padding:0}
.plan-features li{display:flex;align-items:center;gap:10px;font-size:14px;color:#94A3B8}
.plan-features li .check{color:#34D399;font-size:14px}
.plan-features li .lock{color:#64748B;font-size:12px}
.plan-btn{display:block;width:100%;padding:13px;border-radius:100px;font-size:14px;font-weight:600;text-align:center;text-decoration:none;transition:all .2s}
.plan-btn.gold{background:#F5C341;color:#0A0F1E}
.plan-btn.ghost{background:transparent;border:1px solid rgba(255,255,255,0.08);color:#94A3B8}
.plan-btn:hover{opacity:.85;transform:translateY(-1px)}

/* CTA */
.cta-section{padding:120px 48px;text-align:center;position:relative;overflow:hidden}
.cta-bg{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(59,180,193,0.1) 0%,rgba(92,61,94,0.06) 40%,transparent 70%)}
.cta-title{font-family:'DM Serif Display',serif;font-size:clamp(36px,5vw,64px);font-weight:400;line-height:1.1;letter-spacing:-0.02em;margin-bottom:20px;position:relative}
.cta-title em{font-style:italic;color:#3BB4C1}
.cta-sub{font-size:16px;color:#94A3B8;margin-bottom:40px;position:relative}

/* FOOTER */
.lp-footer{border-top:1px solid rgba(255,255,255,0.08);padding:48px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:24px}
.footer-links{display:flex;gap:24px;flex-wrap:wrap}
.footer-links a{font-size:13px;color:#64748B;text-decoration:none;transition:color .2s}
.footer-links a:hover{color:#94A3B8}
.footer-copy{font-size:13px;color:#64748B}

@keyframes lp-pulse-dot{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes lp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
.lp-float{animation:lp-float 4s ease-in-out infinite}

/* SCROLL ANIMATIONS */
.reveal{opacity:0;transform:translateY(24px);transition:opacity .6s ease,transform .6s ease}
.reveal.visible{opacity:1;transform:translateY(0)}

@media(max-width:768px){
  .lp-nav{padding:16px 20px}
  .nav-links{display:none}
  .hero{padding:100px 20px 60px}
  .landing-root h1{font-size:40px}
  .hero-social-proof{flex-direction:column;gap:8px}
  .features{padding:60px 20px}
  .features-grid{grid-template-columns:1fr}
  .safety-grid{grid-template-columns:1fr}
  .pricing-cards{grid-template-columns:1fr}
  .stats{padding:60px 20px;flex-direction:column}
  .stat-card{min-width:unset}
  .lp-footer{flex-direction:column;align-items:flex-start;padding:32px 20px}
}
`;

/* ------------------------------------------------------------------ */
/*  Breveil Logo SVG (reused in nav + footer + loading)               */
/* ------------------------------------------------------------------ */
function BreveilLogo({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 80 80" fill="none" width={size} height={size}>
      <path d="M20 60 Q20 30, 40 20 Q60 30, 60 60" stroke="#3BB4C1" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M28 55 Q28 35, 40 28 Q52 35, 52 55" stroke="#3BB4C1" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.6" />
      <circle cx="40" cy="22" r="4" fill="#3BB4C1" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page component                                                */
/* ------------------------------------------------------------------ */
export default function Home() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  /* ---- Auth check ---- */
  useEffect(() => {
    // Handle OAuth code exchange if redirected here with ?code=
    const code = new URLSearchParams(window.location.search).get('code');
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data }) => {
        if (data.session) {
          router.replace('/map');
        } else {
          setAuthChecked(true);
          setIsAuthenticated(false);
        }
      });
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
        router.replace('/map');
      } else {
        setAuthChecked(true);
        setIsAuthenticated(false);
      }
    });
  }, [router]);

  /* ---- Scroll reveal observer ---- */
  const setupRevealObserver = useCallback(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    );

    document.querySelectorAll('.reveal').forEach((el) => {
      observerRef.current!.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  useEffect(() => {
    if (!authChecked || isAuthenticated) return;
    // Small delay so DOM is painted before observing
    const id = requestAnimationFrame(() => {
      setupRevealObserver();
    });
    return () => {
      cancelAnimationFrame(id);
      observerRef.current?.disconnect();
    };
  }, [authChecked, isAuthenticated, setupRevealObserver]);

  /* ---- Loading state while checking auth ---- */
  if (!authChecked || isAuthenticated) {
    return (
      <div
        className="min-h-dvh flex flex-col items-center justify-center"
        style={{ background: '#0A0F1E' }}
      >
        <svg width={60} height={60} viewBox="0 0 80 80" fill="none" className="mb-4 animate-pulse">
          <path d="M20 60 Q20 30, 40 20 Q60 30, 60 60" stroke="#3BB4C1" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M28 55 Q28 35, 40 28 Q52 35, 52 55" stroke="#3BB4C1" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.6" />
          <circle cx="40" cy="22" r="4" fill="#3BB4C1" />
        </svg>
        <div className="text-2xl font-light tracking-wide animate-pulse" style={{ color: '#3BB4C1' }}>
          Breveil
        </div>
      </div>
    );
  }

  /* ---- Landing page (unauthenticated) ---- */
  return (
    <div className="landing-root">
      {/* Inject landing CSS */}
      <style dangerouslySetInnerHTML={{ __html: landingCSS }} />

      {/* Google Fonts */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Serif+Display:ital@0;1&display=swap"
        rel="stylesheet"
      />

      {/* ==================== NAV ==================== */}
      <nav className="lp-nav">
        <div className="nav-logo">
          <BreveilLogo />
          Breveil
        </div>
        <div className="nav-links">
          <a href="#features">Fonctionnalites</a>
          <a href="#how">Comment ca marche</a>
          <a href="#pricing">Tarifs</a>
          <a href="#community">Communaute</a>
        </div>
        <Link href="/onboarding" className="nav-cta">Essayer gratuitement</Link>
      </nav>

      {/* ==================== HERO ==================== */}
      <section className="hero">
        <div className="hero-gradient" />
        <div className="hero-tag"><span /> Disponible a Paris &middot; Lancement 2026</div>
        <h1>La securite urbaine,<br /><em>ensemble.</em></h1>
        <p className="hero-sub">
          Breveil cartographie les zones a risque en temps reel, vous escorte
          jusqu&apos;a destination, et connecte votre cercle de confiance autour de vous.
        </p>
        <div className="hero-actions">
          <Link href="/onboarding" className="btn-primary">Commencer gratuitement &rarr;</Link>
          <a href="#how" className="btn-ghost">Voir comment ca marche</a>
        </div>
        <div className="hero-social-proof">
          <div className="proof-avatars">
            <span style={{ background: 'linear-gradient(135deg,#A78BFA,#7C3AED)' }}>M</span>
            <span style={{ background: 'linear-gradient(135deg,#3BB4C1,#0E7490)' }}>S</span>
            <span style={{ background: 'linear-gradient(135deg,#F5C341,#E8A800)' }}>A</span>
            <span style={{ background: 'linear-gradient(135deg,#34D399,#059669)' }}>L</span>
          </div>
          <span>+2 400 femmes securisees chaque mois a Paris</span>
        </div>
      </section>

      {/* ==================== PHONE MOCKUP ==================== */}
      <section className="phone-section">
        <div className="phone-glow" />
        <div className="phone-wrap lp-float">
          <div className="phone-frame">
            <div className="phone-screen-grad" />
            <div className="phone-content">
              <div className="phone-pill">
                <div className="phone-pill-dot" />
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Trajet actif — Gare du Nord</div>
                <div style={{ marginLeft: 'auto', fontSize: 11, color: '#94A3B8' }}>~14 min</div>
              </div>
              <div className="phone-cards">
                <div className="phone-card">
                  <div className="phone-card-icon" style={{ background: 'rgba(52,211,153,0.12)' }}>&#x1F6E1;&#xFE0F;</div>
                  <div>
                    <div className="phone-card-text">Marie vous accompagne</div>
                    <div className="phone-card-sub">&#9679; Suit votre trajet en direct</div>
                  </div>
                </div>
                <div className="phone-card">
                  <div className="phone-card-icon" style={{ background: 'rgba(239,68,68,0.12)' }}>&#9888;&#65039;</div>
                  <div>
                    <div className="phone-card-text">1 incident &middot; Rue de Vaugirard</div>
                    <div className="phone-card-sub">Signale il y a 23 min &middot; 400m</div>
                  </div>
                </div>
                <div className="phone-card">
                  <div className="phone-card-icon" style={{ background: 'rgba(59,180,193,0.12)' }}>&#x1F4CD;</div>
                  <div>
                    <div className="phone-card-text">Zone calme detectee</div>
                    <div className="phone-card-sub">Voie bien eclairee jusqu&apos;a destination</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== STATS ==================== */}
      <section className="stats">
        <div className="stat-card reveal">
          <div className="stat-num cyan">18</div>
          <div className="stat-label">Categories d&apos;incidents signales</div>
        </div>
        <div className="stat-card reveal">
          <div className="stat-num gold">&lt; 30s</div>
          <div className="stat-label">Pour declencher un SOS</div>
        </div>
        <div className="stat-card reveal">
          <div className="stat-num success">97%</div>
          <div className="stat-label">D&apos;utilisatrices se sentent plus en securite</div>
        </div>
      </section>

      {/* ==================== FEATURES ==================== */}
      <section className="features" id="features">
        <div className="section-tag reveal">Fonctionnalites</div>
        <h2 className="section-title reveal">Tout ce dont vous avez besoin,<br /><em>dans votre poche</em></h2>
        <div className="features-grid">
          <div className="feature-card fc-sos reveal">
            <div className="feature-icon fi-danger">&#x1F198;</div>
            <h3 className="feature-title">SOS d&apos;urgence</h3>
            <p className="feature-desc">Maintenez 3 secondes pour declencher l&apos;alerte. Votre cercle est notifie instantanement, votre position partagee, le lieu sur le plus proche affiche.</p>
            <span className="feature-tag tag-free">Gratuit</span>
          </div>
          <div className="feature-card fc-trajet reveal">
            <div className="feature-icon fi-cyan">&#x1F5FA;&#xFE0F;</div>
            <h3 className="feature-title">Trajet escorte</h3>
            <p className="feature-desc">Planifiez votre itineraire et laissez TripMonitor surveiller en arriere-plan. Detection d&apos;anomalie, checkpoints transit, arrivee auto-confirmee.</p>
            <span className="feature-tag tag-pro">Pro</span>
          </div>
          <div className="feature-card fc-comunity reveal">
            <div className="feature-icon fi-purple">&#x1F465;</div>
            <h3 className="feature-title">Communaute locale</h3>
            <p className="feature-desc">Feed geolocalise, stories ephemeres, groupes de quartier, DMs avec votre cercle. Une communaute bienveillante, ancree dans votre ville.</p>
            <span className="feature-tag tag-free">Gratuit</span>
          </div>
          <div className="feature-card fc-map reveal">
            <div className="feature-icon fi-gold">&#x1F4E1;</div>
            <h3 className="feature-title">Carte en temps reel</h3>
            <p className="feature-desc">18 types d&apos;incidents, confirmations communautaires, decay automatique des signalements obsoletes. La carte la plus a jour de votre quartier.</p>
            <span className="feature-tag tag-free">Gratuit</span>
          </div>
          <div className="feature-card fc-escort reveal">
            <div className="feature-icon fi-success">&#x1F91D;</div>
            <h3 className="feature-title">Marche avec moi</h3>
            <p className="feature-desc">Notifiez votre cercle en 1 tap. Ils suivent votre position, rejoignent une room vocale, et Julia IA prend le relais si personne ne repond sous 2 minutes.</p>
            <span className="feature-tag tag-pro">Pro</span>
          </div>
          <div className="feature-card fc-julia reveal">
            <div className="feature-icon fi-purple">&#x2728;</div>
            <h3 className="feature-title">Julia IA</h3>
            <p className="feature-desc">Votre assistante securite personnelle. Elle vous accompagne en vocal pendant vos trajets, surveille les anomalies et escalade vers le SOS si besoin.</p>
            <span className="feature-tag tag-pro">Pro</span>
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section className="how" id="how">
        <div className="section-tag reveal">Comment ca marche</div>
        <h2 className="section-title reveal">Simple.<br /><em>Immediat. Efficace.</em></h2>
        <div className="steps">
          <div className="step reveal">
            <div className="step-num">1</div>
            <div className="step-connector" />
            <div className="step-content">
              <h3>Creez votre compte en 2 minutes</h3>
              <p>Inscription via Google ou Apple. Configurez vos objectifs, ajoutez votre cercle de confiance et activez la localisation. L&apos;app apprend vos trajets habituels.</p>
            </div>
          </div>
          <div className="step reveal">
            <div className="step-num">2</div>
            <div className="step-connector" />
            <div className="step-content">
              <h3>Consultez la carte avant de partir</h3>
              <p>Verifiez les signalements recents sur votre itineraire. Filtrez par severite, par type, par heure. Choisissez l&apos;itineraire le plus sur.</p>
            </div>
          </div>
          <div className="step reveal">
            <div className="step-num">3</div>
            <div className="step-connector" />
            <div className="step-content">
              <h3>Demarrez votre trajet</h3>
              <p>Activez &quot;Marche avec moi&quot; ou lancez un trajet planifie. Votre cercle est alerte. TripMonitor surveille en arriere-plan. Vous marchez, on s&apos;occupe du reste.</p>
            </div>
          </div>
          <div className="step reveal">
            <div className="step-num">4</div>
            <div className="step-content">
              <h3>Arrivee confirmee</h3>
              <p>L&apos;app detecte automatiquement votre arrivee. Votre cercle est notifie. Vos stats de trajet sont enregistrees. Votre streak continue.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SAFETY ZONES ==================== */}
      <section className="safety">
        <div className="safety-grid">
          <div className="safety-text reveal">
            <div className="section-tag">Cartographie collaborative</div>
            <h2 className="section-title">La carte la plus precise<br /><em>de votre quartier</em></h2>
            <p>Chaque signalement est geolocalise, horodate, et peut etre confirme ou infirme par la communaute. Les pins s&apos;estompent automatiquement avec le temps pour garder la carte a jour.</p>
            <div className="safety-list">
              <div className="safety-item">18 categories d&apos;incidents (agressions, vol, harcelement, zones mal eclairees...)</div>
              <div className="safety-item">Confirmations et infirmations communautaires</div>
              <div className="safety-item">Decay automatique des signalements anciens</div>
              <div className="safety-item">Lieux surs : pharmacies, hopitaux, cafes partenaires</div>
              <div className="safety-item">Mode nuit optimise pour l&apos;utilisation en mobilite</div>
            </div>
          </div>
          <div className="map-preview reveal">
            <div className="map-grid" />
            <div className="map-pin p-user" />
            <div className="map-pin p-danger" />
            <div className="map-pin p-warn" />
            <div className="map-pin p-safe" />
            <div style={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              right: 16,
              background: 'rgba(26,37,64,0.95)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <span style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>&#9888;&#65039; 14 incidents a proximite</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#3BB4C1', fontWeight: 600 }}>Voir &rarr;</span>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== TESTIMONIALS ==================== */}
      <section className="testimonials" id="community">
        <div className="section-tag reveal">Temoignages</div>
        <h2 className="section-title reveal">Elles font confiance<br />a <em>Breveil</em></h2>
        <div className="testimonials-grid">
          <div className="testimonial reveal">
            <div className="stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
            <p className="testimonial-quote">&ldquo;Je rentre souvent tard du bureau. Depuis que j&apos;utilise Breveil, ma mere n&apos;est plus anxieuse — elle recoit ma confirmation d&apos;arrivee automatiquement.&rdquo;</p>
            <div className="testimonial-author">
              <div className="author-avatar" style={{ background: 'linear-gradient(135deg,#A78BFA,#7C3AED)' }}>M</div>
              <div>
                <div className="author-name">Marie L.</div>
                <div className="author-title">Consultante, Paris 15e</div>
              </div>
            </div>
          </div>
          <div className="testimonial reveal">
            <div className="stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
            <p className="testimonial-quote">&ldquo;Le bouton SOS m&apos;a sauve la mise un soir de decembre. Mon cercle a ete alerte en secondes. C&apos;est rassurant de savoir que ca marche vraiment.&rdquo;</p>
            <div className="testimonial-author">
              <div className="author-avatar" style={{ background: 'linear-gradient(135deg,#3BB4C1,#0E7490)' }}>S</div>
              <div>
                <div className="author-name">Sofia B.</div>
                <div className="author-title">Etudiante, Paris 5e</div>
              </div>
            </div>
          </div>
          <div className="testimonial reveal">
            <div className="stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
            <p className="testimonial-quote">&ldquo;La communaute du quartier est incroyable. On s&apos;alerte, on partage les bons plans, on organise des marches nocturnes. C&apos;est plus qu&apos;une app, c&apos;est un reseau.&rdquo;</p>
            <div className="testimonial-author">
              <div className="author-avatar" style={{ background: 'linear-gradient(135deg,#F5C341,#E8A800)' }}>A</div>
              <div>
                <div className="author-name">Anais P.</div>
                <div className="author-title">Infirmiere, Paris 20e</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== PRICING ==================== */}
      <section className="pricing" id="pricing">
        <div className="section-tag reveal" style={{ textAlign: 'center' }}>Tarifs</div>
        <h2 className="section-title reveal">Commencez gratuitement.<br /><em>Evoluez a votre rythme.</em></h2>
        <div className="pricing-cards reveal">
          <div className="pricing-card">
            <div className="plan-name">Gratuit</div>
            <div className="plan-price">0<span style={{ fontSize: 16, verticalAlign: 'middle' }}>&euro;</span></div>
            <div className="plan-period">pour toujours</div>
            <ul className="plan-features">
              <li><span className="check">&#10003;</span> Carte &amp; signalements</li>
              <li><span className="check">&#10003;</span> Bouton SOS</li>
              <li><span className="check">&#10003;</span> Cercle (3 contacts)</li>
              <li><span className="check">&#10003;</span> 5 trajets / mois</li>
              <li><span className="check">&#10003;</span> Communaute locale</li>
              <li><span className="lock">&#9919;</span> Marche avec moi</li>
              <li><span className="lock">&#9919;</span> Julia IA</li>
            </ul>
            <Link href="/onboarding" className="plan-btn ghost">Commencer gratuitement</Link>
          </div>
          <div className="pricing-card featured">
            <div className="pricing-badge">&#9889; 7 jours d&apos;essai gratuit</div>
            <div className="plan-name" style={{ color: '#F5C341' }}>Pro</div>
            <div className="plan-price" style={{ color: '#F5C341' }}>6,99<span style={{ fontSize: 16, verticalAlign: 'middle' }}>&euro;</span></div>
            <div className="plan-period">par mois &middot; gere via App Store</div>
            <ul className="plan-features">
              <li><span className="check">&#10003;</span> Tout du plan Gratuit</li>
              <li><span className="check">&#10003;</span> Cercle illimite</li>
              <li><span className="check">&#10003;</span> Trajets illimites</li>
              <li><span className="check">&#10003;</span> Marche avec moi</li>
              <li><span className="check">&#10003;</span> Julia IA illimitee &#10024;</li>
              <li><span className="check">&#10003;</span> Alertes prioritaires</li>
              <li><span className="check">&#10003;</span> Historique complet</li>
            </ul>
            <Link href="/onboarding" className="plan-btn gold">Commencer l&apos;essai gratuit</Link>
          </div>
        </div>
      </section>

      {/* ==================== CTA ==================== */}
      <section className="cta-section">
        <div className="cta-bg" />
        <h2 className="cta-title reveal">Prete a marcher<br /><em>sans crainte</em> ?</h2>
        <p className="cta-sub reveal">Rejoignez les milliers de femmes qui font confiance a Breveil chaque soir.</p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' as const, position: 'relative' as const }}>
          <Link href="/onboarding" className="btn-primary">Telecharger Breveil &rarr;</Link>
          <a href="#how" className="btn-ghost">Voir la demo</a>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="lp-footer">
        <div className="nav-logo">
          <BreveilLogo size={24} />
          Breveil
        </div>
        <div className="footer-links">
          <a href="#">Confidentialite</a>
          <a href="#">CGU</a>
          <a href="#">Cookies</a>
          <a href="#">Contact</a>
          <a href="#">Admin</a>
        </div>
        <div className="footer-copy">&copy; 2026 Breveil &middot; Paris, France</div>
      </footer>
    </div>
  );
}
