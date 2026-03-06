// ÉCRAN 1 — ESCORTE NOTIFYING
// Remplace : renderEscorteNotifying() dans EscorteSheet.tsx
// Sheet height : 52vh (déjà dans MASTER.md)

// COLLER CE JSX dans le return de renderEscorteNotifying() :

const C = {
  t1:     isDark ? '#FFFFFF'                  : '#0F172A',
  t2:     isDark ? '#94A3B8'                  : '#475569',
  t3:     isDark ? '#64748B'                  : '#94A3B8',
  card:   isDark ? '#1E293B'                  : '#FFFFFF',
  el:     isDark ? '#243050'                  : '#F1F5F9',
  border: isDark ? 'rgba(255,255,255,0.08)'   : 'rgba(15,23,42,0.08)',
}

return (
  <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>

    {/* Handle */}
    <div style={{
      width:28, height:4, borderRadius:2, margin:'8px auto 0', flexShrink:0,
      background: isDark ? 'rgba(255,255,255,0.13)' : 'rgba(15,23,42,0.13)',
    }} />

    {/* Julia banner */}
    <div style={{
      margin:'10px 14px 0', padding:'7px 12px', borderRadius:12, flexShrink:0,
      background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.20)',
      display:'flex', alignItems:'center', gap:7,
    }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="1.5">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
      <span style={{ fontSize:12, fontWeight:600, color:'#A78BFA', flex:1 }}>
        Julia vous accompagne · canal actif
      </span>
      <span style={{
        fontSize:8, fontWeight:800, color:'#A78BFA',
        background:'rgba(167,139,250,0.15)', padding:'1px 5px', borderRadius:3,
      }}>IA</span>
    </div>

    {/* Centre */}
    <div style={{
      flex:1, display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', gap:8, padding:'0 20px',
    }}>
      <div style={{
        width:56, height:56, borderRadius:'50%',
        background:'rgba(59,180,193,0.10)', border:'1px solid rgba(59,180,193,0.20)',
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3BB4C1" strokeWidth="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:15, fontWeight:700, color:C.t1, marginBottom:3 }}>
          Notification envoyée
        </div>
        <div style={{ fontSize:12, color:C.t2 }}>En attente de réponse</div>
      </div>
      <div style={{
        padding:'4px 14px', borderRadius:100,
        background:'rgba(245,195,65,0.10)', border:'1px solid rgba(245,195,65,0.25)',
        fontSize:12, fontWeight:600, color:'#F5C341',
      }}>
        Julia rejoint dans 2:00
      </div>
    </div>

    {/* Actions */}
    <div style={{ padding:'12px 14px 14px', display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
      <button
        onClick={() => escorte.startWithoutWaiting?.()}
        style={{
          width:'100%', padding:'12px', borderRadius:28,
          background: isDark ? '#FFFFFF' : '#0F172A',
          color: isDark ? '#0F172A' : '#FFFFFF',
          fontFamily:'inherit', fontSize:13, fontWeight:800,
          border:'none', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', gap:7,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Démarrer sans attendre
      </button>
      <button
        onClick={() => escorte.cancelEscorte?.()}
        style={{
          background:'none', border:'none', cursor:'pointer', padding:'4px',
          fontSize:12, color:C.t3, fontFamily:'inherit',
        }}
      >
        Annuler
      </button>
    </div>
  </div>
)
