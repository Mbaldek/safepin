// ÉCRAN 2 — TRIP FORM (STATE A+C uniquement — main form)
// Remplace : renderTripForm() lignes 951-1183 dans EscorteSheet.tsx
// NE PAS TOUCHER : STATE B (departure picker, lignes 827-949)
// Sheet height : 46vh (déjà dans MASTER.md)
//
// Variables supposées disponibles dans EscorteSheet :
//   selectedDest, setSelectedDest, departCoords, currentAddress
//   destQuery, setDestQuery, results, routeInfo, transportMode,
//   setTransportMode, withCircle, setWithCircle, circleCount
//   escorte.isStarting, handleStartTrip, setEditingDepart, favorites
//   selectFavoriteAsDestination, isDark

const C = {
  t1:     isDark ? '#FFFFFF'                  : '#0F172A',
  t2:     isDark ? '#94A3B8'                  : '#475569',
  t3:     isDark ? '#64748B'                  : '#94A3B8',
  card:   isDark ? '#1E293B'                  : '#FFFFFF',
  el:     isDark ? '#243050'                  : '#F1F5F9',
  border: isDark ? 'rgba(255,255,255,0.08)'   : 'rgba(15,23,42,0.08)',
  borderS:isDark ? 'rgba(255,255,255,0.15)'   : 'rgba(15,23,42,0.16)',
}

const MODES = [
  { id:'walk',    label:'À pied',    color:'#34D399', icon:'walk'   },
  { id:'transit', label:'Transports',color:'#3BB4C1', icon:'train'  },
  { id:'bike',    label:'Vélo',      color:'#F5C341', icon:'bike'   },
  { id:'car',     label:'Voiture',   color:'#94A3B8', icon:'car'    },
]

// durée estimée selon mode et routeInfo
const getDuration = (modeId: string) => {
  if (!routeInfo?.distance) return '—'
  const speeds: Record<string,number> = { walk:83, transit:250, bike:200, car:500 }
  return `~${Math.round(routeInfo.distance / 1000 / speeds[modeId] * 60)}min`
}

return (
  <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>

    {/* Handle */}
    <div style={{
      width:28, height:4, borderRadius:2, margin:'8px auto 0', flexShrink:0,
      background: isDark ? 'rgba(255,255,255,0.13)' : 'rgba(15,23,42,0.13)',
    }} />

    <div style={{
      flex:1, overflowY:'auto', padding:'9px 14px 12px',
      display:'flex', flexDirection:'column', gap:8,
      scrollbarWidth:'none',
    }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <button
          onClick={() => setView('hub')}
          style={{
            width:26, height:26, borderRadius:'50%', flexShrink:0,
            background:C.el, border:`1px solid ${C.border}`,
            display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.t2} strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span style={{ fontSize:13, fontWeight:700, color:C.t1 }}>
          Trajet avec destination
        </span>
      </div>

      {/* Card départ → destination */}
      <div style={{
        display:'flex', alignItems:'center', gap:8,
        background:C.el, border:`1px solid ${C.border}`,
        borderRadius:12, padding:'9px 11px',
      }}>
        {/* Connecteur */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, flexShrink:0 }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:'#34D399' }} />
          <div style={{ width:1, height:14, background:C.border }} />
          <div style={{ width:7, height:7, borderRadius:'50%', background:'#EF4444' }} />
        </div>
        {/* Adresses */}
        <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:5 }}>
          <div
            onClick={() => setEditingDepart(true)}
            style={{ fontSize:11, fontWeight:500, color:C.t2, cursor:'pointer',
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}
          >
            {currentAddress ?? 'Ma position actuelle'}
          </div>
          <div
            onClick={() => document.getElementById('dest-input')?.focus()}
            style={{ fontSize:12, fontWeight:600, cursor:'pointer',
              color: selectedDest ? C.t1 : C.t3,
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}
          >
            {selectedDest?.text ?? 'Rechercher une destination…'}
          </div>
        </div>
        {/* Swap */}
        {selectedDest && (
          <div
            onClick={() => setSelectedDest(null)}
            style={{
              width:24, height:24, borderRadius:'50%', flexShrink:0, cursor:'pointer',
              background:C.card, border:`1px solid ${C.border}`,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.t2} strokeWidth="2">
              <polyline points="17 1 21 5 17 9"/>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
              <polyline points="7 23 3 19 7 15"/>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
          </div>
        )}
      </div>

      {/* Input recherche — seulement si pas de destination */}
      {!selectedDest && (
        <div style={{ position:'relative' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.t3} strokeWidth="1.5"
            style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            id="dest-input"
            autoFocus
            value={destQuery}
            onChange={e => { setDestQuery(e.target.value) }}
            placeholder="Restaurant, adresse, lieu…"
            style={{
              width:'100%', background:C.card, border:`1px solid rgba(59,180,193,0.35)`,
              boxShadow:'0 0 0 3px rgba(59,180,193,0.08)',
              borderRadius:10, padding:'9px 12px 9px 34px',
              fontSize:12, fontFamily:'inherit', color:C.t1, outline:'none',
            }}
          />
          {/* Résultats */}
          {results && results.length > 0 && (
            <div style={{
              position:'absolute', top:'100%', left:0, right:0, zIndex:50, marginTop:4,
              background:C.card, border:`1px solid ${C.border}`,
              borderRadius:12, overflow:'hidden', boxShadow:'0 8px 24px rgba(0,0,0,0.2)',
            }}>
              {results.slice(0,5).map((r: any, i: number) => (
                <div
                  key={r.id ?? i}
                  onClick={() => { setSelectedDest(r); setDestQuery(r.text ?? r.name ?? '') }}
                  style={{
                    display:'flex', alignItems:'center', gap:9, padding:'9px 12px',
                    cursor:'pointer',
                    borderBottom: i < Math.min(results.length,5)-1
                      ? `1px solid ${C.border}` : 'none',
                  }}
                >
                  <div style={{
                    width:30, height:30, borderRadius:9, flexShrink:0, fontSize:14,
                    background: r.type === 'poi' ? 'rgba(59,180,193,0.10)' : C.el,
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    {r.icon ?? '📍'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:C.t1,
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {r.text ?? r.name}
                    </div>
                    <div style={{ fontSize:10, color:C.t3,
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {r.place_name ?? r.address ?? ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Favoris accès rapide — seulement si pas de destination */}
      {!selectedDest && favorites && favorites.length > 0 && (
        <div>
          <div style={{ fontSize:8, fontWeight:800, textTransform:'uppercase',
            letterSpacing:'0.08em', color:C.t3, marginBottom:6 }}>Accès rapide</div>
          <div style={{ display:'flex', gap:8 }}>
            {favorites.slice(0,4).map((fav: any) => (
              <div
                key={fav.id}
                onClick={() => selectFavoriteAsDestination?.(fav)}
                style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, cursor:'pointer' }}
              >
                <div style={{
                  width:40, height:40, borderRadius:12, fontSize:18,
                  background:C.el, border:`1px solid ${C.border}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  {fav.icon ?? '📍'}
                </div>
                <span style={{ fontSize:9, fontWeight:600, color:C.t2,
                  maxWidth:44, textAlign:'center',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {fav.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transport + CTA — seulement si destination choisie */}
      {selectedDest && (
        <>
          {/* Modes de transport */}
          <div style={{ display:'flex', gap:5 }}>
            {MODES.map(mode => {
              const on = transportMode === mode.id
              return (
                <button
                  key={mode.id}
                  onClick={() => setTransportMode(mode.id)}
                  style={{
                    flex:1, padding:'7px 4px', borderRadius:9, cursor:'pointer',
                    fontFamily:'inherit', border:`1.5px solid ${on ? mode.color : 'transparent'}`,
                    background: on ? `${mode.color}18` : C.el,
                    display:'flex', flexDirection:'column', alignItems:'center', gap:3,
                    transition:'all 150ms',
                  }}
                >
                  <span style={{ fontSize:9, fontWeight:700,
                    color: on ? mode.color : C.t2 }}>{mode.label}</span>
                  <span style={{ fontSize:7, color:C.t3 }}>{getDuration(mode.id)}</span>
                </button>
              )
            })}
          </div>

          {/* Escorte toggle — walk et transit uniquement */}
          {(transportMode === 'walk' || transportMode === 'transit') && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3BB4C1" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                </svg>
                <span style={{ fontSize:11, fontWeight:600, color:'#3BB4C1' }}>
                  Escorte cercle · {circleCount ?? 0} contacts
                </span>
              </div>
              <div
                onClick={() => setWithCircle?.(!withCircle)}
                style={{
                  width:34, height:20, borderRadius:100, cursor:'pointer',
                  background: withCircle ? '#3BB4C1' : C.el,
                  border:`1px solid ${withCircle ? '#3BB4C1' : C.borderS}`,
                  display:'flex', alignItems:'center',
                  padding:2, transition:'all 200ms',
                }}
              >
                <div style={{
                  width:16, height:16, borderRadius:'50%', background:'#fff',
                  marginLeft: withCircle ? 'auto' : 0,
                  boxShadow:'0 1px 3px rgba(0,0,0,0.2)',
                  transition:'margin 200ms',
                }} />
              </div>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleStartTrip}
            disabled={escorte?.isStarting}
            style={{
              width:'100%', padding:'11px', borderRadius:28,
              background: isDark ? '#FFFFFF' : '#0F172A',
              color: isDark ? '#0F172A' : '#FFFFFF',
              fontFamily:'inherit', fontSize:13, fontWeight:800,
              border:'none', cursor: escorte?.isStarting ? 'default' : 'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:6,
              opacity: escorte?.isStarting ? 0.7 : 1,
            }}
          >
            {escorte?.isStarting ? (
              <>
                <div style={{
                  width:12, height:12, borderRadius:'50%',
                  border:'2px solid rgba(128,128,128,0.3)',
                  borderTopColor:'currentColor',
                  animation:'spin 0.6s linear infinite',
                }} />
                Démarrage…
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                Démarrer · {routeInfo ? `${Math.round(routeInfo.duration / 60)} min` : '—'}
              </>
            )}
          </button>
        </>
      )}
    </div>
  </div>
)
