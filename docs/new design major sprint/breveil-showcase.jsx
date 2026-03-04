import React, { useState } from 'react';
import { Moon, MapPin, Users, Heart, Eye, AlertTriangle, Shield, Home, Map, Bell, User, Check, Star, X, Navigation } from 'lucide-react';

const gradient = "linear-gradient(180deg, #3BB4C1 0%, #1E3A5F 45%, #4A2C5A 75%, #5C3D5E 100%)";

const BreveilShowcase = () => {
  const [theme, setTheme] = useState('dark');
  const [section, setSection] = useState('all');
  const [selectedGoals, setSelectedGoals] = useState(['walk']);
  const [activeTab, setActiveTab] = useState('home');

  const c = {
    bg: theme === 'dark' ? '#0F172A' : '#F8FAFC',
    card: theme === 'dark' ? '#1E293B' : '#FFFFFF',
    text: theme === 'dark' ? '#FFFFFF' : '#0F172A',
    muted: theme === 'dark' ? '#94A3B8' : '#64748B',
    border: theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.1)',
  };

  const Logo = ({ size = 40, color = c.text }) => (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <path d="M20 60 Q20 30, 40 20 Q60 30, 60 60" stroke={color} strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M28 55 Q28 35, 40 28 Q52 35, 52 55" stroke={color} strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.6" />
      <circle cx="40" cy="22" r="4" fill={color} />
    </svg>
  );

  const goals = [
    { id: 'walk', label: 'Rentrer chez moi en sécurité', icon: Moon },
    { id: 'area', label: 'Connaître mon quartier', icon: MapPin },
    { id: 'peace', label: 'Rassurer mes proches', icon: Heart },
    { id: 'watch', label: 'Veiller sur mes proches', icon: Eye },
  ];

  return (
    <div style={{ minHeight: '100vh', background: c.bg, fontFamily: "'Inter', system-ui, sans-serif", color: c.text, padding: '32px' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '48px', maxWidth: '1000px', margin: '0 auto 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Logo size={40} />
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 300, margin: 0 }}>Breveil</h1>
            <p style={{ fontSize: '13px', color: c.muted, margin: 0 }}>Component Library</p>
          </div>
        </div>
        <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} style={{ padding: '10px 20px', borderRadius: '20px', background: c.card, border: `1px solid ${c.border}`, color: c.text, cursor: 'pointer' }}>
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>
      </header>

      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* BUTTONS */}
        <section style={{ marginBottom: '64px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 400, marginBottom: '24px', borderBottom: `1px solid ${c.border}`, paddingBottom: '12px' }}>Buttons</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <button style={{ padding: '16px 24px', background: theme === 'dark' ? 'white' : '#0F172A', color: theme === 'dark' ? '#0F172A' : 'white', fontSize: '16px', fontWeight: 600, border: 'none', borderRadius: '32px', cursor: 'pointer' }}>Primary</button>
            <button style={{ padding: '16px 24px', background: 'transparent', color: c.text, fontSize: '16px', fontWeight: 500, border: `1px solid ${c.border}`, borderRadius: '32px', cursor: 'pointer' }}>Secondary</button>
            <button style={{ padding: '16px 24px', background: 'transparent', color: c.muted, fontSize: '16px', fontWeight: 500, border: 'none', borderRadius: '32px', cursor: 'pointer' }}>Ghost</button>
            <button style={{ padding: '16px 24px', background: '#EF4444', color: 'white', fontSize: '16px', fontWeight: 600, border: 'none', borderRadius: '32px', cursor: 'pointer' }}>Danger</button>
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
            <button style={{ flex: 1, padding: '16px 24px', background: theme === 'dark' ? 'white' : '#0F172A', color: theme === 'dark' ? '#0F172A' : 'white', fontSize: '16px', fontWeight: 600, border: 'none', borderRadius: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <Navigation size={20} /> Commencer un trajet
            </button>
            <button disabled style={{ flex: 1, padding: '16px 24px', background: theme === 'dark' ? 'white' : '#0F172A', color: theme === 'dark' ? '#0F172A' : 'white', fontSize: '16px', fontWeight: 600, border: 'none', borderRadius: '32px', opacity: 0.5, cursor: 'not-allowed' }}>Disabled</button>
          </div>
        </section>

        {/* INPUTS */}
        <section style={{ marginBottom: '64px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 400, marginBottom: '24px', borderBottom: `1px solid ${c.border}`, paddingBottom: '12px' }}>Inputs</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <input placeholder="Default input" style={{ padding: '16px', background: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)', border: `1px solid ${c.border}`, borderRadius: '12px', color: c.text, fontSize: '16px', outline: 'none' }} />
            <input defaultValue="Focused" style={{ padding: '16px', background: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)', border: '1px solid #3BB4C1', borderRadius: '12px', color: c.text, fontSize: '16px', outline: 'none', boxShadow: '0 0 20px rgba(59,180,193,0.3)' }} />
            <input defaultValue="Error" style={{ padding: '16px', background: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)', border: '1px solid #EF4444', borderRadius: '12px', color: c.text, fontSize: '16px', outline: 'none' }} />
          </div>
        </section>

        {/* CARDS */}
        <section style={{ marginBottom: '64px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 400, marginBottom: '24px', borderBottom: `1px solid ${c.border}`, paddingBottom: '12px' }}>Cards</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: '16px', padding: '20px' }}>
              <p style={{ fontSize: '13px', color: c.muted, marginBottom: '8px' }}>Default</p>
              <p style={{ margin: 0 }}>Card content</p>
            </div>
            <div style={{ background: theme === 'dark' ? '#334155' : '#FFFFFF', borderRadius: '16px', padding: '20px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
              <p style={{ fontSize: '13px', color: c.muted, marginBottom: '8px' }}>Elevated</p>
              <p style={{ margin: 0 }}>Card content</p>
            </div>
            <div style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)', backdropFilter: 'blur(20px)', borderRadius: '16px', padding: '20px', border: `1px solid ${c.border}` }}>
              <p style={{ fontSize: '13px', color: c.muted, marginBottom: '8px' }}>Glass</p>
              <p style={{ margin: 0 }}>Card content</p>
            </div>
            <div style={{ background: gradient, borderRadius: '16px', padding: '20px' }}>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Gradient</p>
              <p style={{ margin: 0, color: 'white' }}>Card content</p>
            </div>
          </div>
        </section>

        {/* SELECTION CARDS */}
        <section style={{ marginBottom: '64px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 400, marginBottom: '24px', borderBottom: `1px solid ${c.border}`, paddingBottom: '12px' }}>Selection Cards</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {goals.map(goal => {
              const Icon = goal.icon;
              const isSelected = selectedGoals.includes(goal.id);
              return (
                <button key={goal.id} onClick={() => setSelectedGoals(p => p.includes(goal.id) ? p.filter(g => g !== goal.id) : [...p, goal.id])} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', background: isSelected ? (theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(59,180,193,0.1)') : 'transparent', border: `1px solid ${isSelected ? '#3BB4C1' : c.border}`, borderRadius: '16px', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: isSelected ? 'rgba(59,180,193,0.2)' : (theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: isSelected ? '#3BB4C1' : c.muted }}><Icon size={20} /></div>
                  <span style={{ flex: 1, color: c.text, fontWeight: 500 }}>{goal.label}</span>
                  {isSelected && <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#3BB4C1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={14} color="white" strokeWidth={3} /></div>}
                </button>
              );
            })}
          </div>
        </section>

        {/* BADGES */}
        <section style={{ marginBottom: '64px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 400, marginBottom: '24px', borderBottom: `1px solid ${c.border}`, paddingBottom: '12px' }}>Badges & Notes</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
            <span style={{ padding: '6px 14px', borderRadius: '20px', background: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', fontSize: '13px', fontWeight: 500 }}>Default</span>
            <span style={{ padding: '6px 14px', borderRadius: '20px', background: 'rgba(52,211,153,0.15)', color: '#34D399', fontSize: '13px', fontWeight: 500 }}>Success</span>
            <span style={{ padding: '6px 14px', borderRadius: '20px', background: 'rgba(251,191,36,0.15)', color: '#FBBF24', fontSize: '13px', fontWeight: 500 }}>Warning</span>
            <span style={{ padding: '6px 14px', borderRadius: '20px', background: 'rgba(239,68,68,0.15)', color: '#EF4444', fontSize: '13px', fontWeight: 500 }}>Danger</span>
            <span style={{ padding: '6px 14px', borderRadius: '20px', background: 'rgba(245,195,65,0.15)', color: '#F5C341', fontSize: '13px', fontWeight: 500 }}>Gold</span>
            <span style={{ padding: '6px 14px', borderRadius: '20px', background: 'rgba(34,211,238,0.15)', color: '#22D3EE', fontSize: '13px', fontWeight: 500 }}>Cyan</span>
          </div>
          <div style={{ display: 'grid', gap: '12px', maxWidth: '500px' }}>
            <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(245,195,65,0.1)', border: '1px solid rgba(245,195,65,0.3)' }}><p style={{ fontSize: '14px', color: '#F5C341', margin: 0 }}>💡 Info note with gold variant for tips and hints.</p></div>
            <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)' }}><p style={{ fontSize: '14px', color: '#34D399', margin: 0 }}>✓ Success note for confirmations and completions.</p></div>
          </div>
        </section>

        {/* TAB BAR */}
        <section style={{ marginBottom: '64px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 400, marginBottom: '24px', borderBottom: `1px solid ${c.border}`, paddingBottom: '12px' }}>Tab Bar</h2>
          <div style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)', backdropFilter: 'blur(20px)', borderRadius: '32px', padding: '12px 16px', display: 'flex', justifyContent: 'space-around', maxWidth: '400px', border: `1px solid ${c.border}` }}>
            {[{ id: 'home', icon: Home, label: 'Accueil' }, { id: 'map', icon: Map, label: 'Carte' }, { id: 'alerts', icon: Bell, label: 'Alertes' }, { id: 'profile', icon: User, label: 'Profil' }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '8px 16px', borderRadius: '20px', background: activeTab === tab.id ? (theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent', border: 'none', color: activeTab === tab.id ? c.text : c.muted, cursor: 'pointer' }}>
                <tab.icon size={20} /><span style={{ fontSize: '11px', fontWeight: 500 }}>{tab.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* STREAK BADGE */}
        <section style={{ marginBottom: '64px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 400, marginBottom: '24px', borderBottom: `1px solid ${c.border}`, paddingBottom: '12px' }}>Streak Badge</h2>
          <div style={{ display: 'flex', gap: '32px' }}>
            {[1, 7, 30].map(days => (
              <div key={days} style={{ textAlign: 'center' }}>
                <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                  <svg width={100} height={100} style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx={50} cy={50} r={45} fill="none" stroke={theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'} strokeWidth={4} />
                    <circle cx={50} cy={50} r={45} fill="none" stroke="#22D3EE" strokeWidth={4} strokeLinecap="round" strokeDasharray={283} strokeDashoffset={283 - ((days % 7) / 7) * 283} />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '28px', fontWeight: 300 }}>{days}</span>
                    <span style={{ fontSize: '12px', color: c.muted }}>jour{days > 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* BRANDING */}
        <section>
          <h2 style={{ fontSize: '20px', fontWeight: 400, marginBottom: '24px', borderBottom: `1px solid ${c.border}`, paddingBottom: '12px' }}>Branding</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: '16px', padding: '32px' }}>
              <p style={{ fontSize: '12px', color: c.muted, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Logo Sizes</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '24px' }}>
                {[24, 32, 48, 64].map(size => (<div key={size} style={{ textAlign: 'center' }}><Logo size={size} /><span style={{ display: 'block', marginTop: '8px', fontSize: '10px', color: c.muted }}>{size}px</span></div>))}
              </div>
            </div>
            <div style={{ background: gradient, borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Logo size={64} color="white" />
              <p style={{ marginTop: '16px', fontSize: '28px', fontWeight: 300, color: 'white' }}>Breveil</p>
              <p style={{ marginTop: '4px', fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>Marche avec nous.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default BreveilShowcase;
