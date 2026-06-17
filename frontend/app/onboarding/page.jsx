'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { useT, FONT } from '@/components/ui/tokens'

import { API_BASE as API } from '@/lib/api'

// Hero card oscuro intencional (idéntico en claro y oscuro) — no es token de paleta
const NAVY = '#0B1426'

const PAISES = [
  {
    code:'ES', name:'España', flag:'🇪🇸',
    desc:'VeriFactu — AEAT',
    detalle:'PGC Real Decreto 1514/2007 · IVA 21/10/4% · IRPF',
    disponible:true,
    color:'#0071E3',
  },
  {
    code:'SV', name:'El Salvador', flag:'🇸🇻',
    desc:'DTE — Ministerio de Hacienda',
    detalle:'IVA 13% · Facturación electrónica obligatoria',
    disponible:true,
    color:'#34C759',
  },
  {
    code:'MX', name:'México', flag:'🇲🇽',
    desc:'CFDI — SAT',
    detalle:'Próximamente disponible',
    disponible:false,
    color:'#86868B',
  },
  {
    code:'CO', name:'Colombia', flag:'🇨🇴',
    desc:'DIAN — Factura Electrónica',
    detalle:'Próximamente disponible',
    disponible:false,
    color:'#86868B',
  },
  {
    code:'GT', name:'Guatemala', flag:'🇬🇹',
    desc:'FEL — SAT Guatemala',
    detalle:'Próximamente disponible',
    disponible:false,
    color:'#86868B',
  },
  {
    code:'HN', name:'Honduras', flag:'🇭🇳',
    desc:'SAR — Facturación',
    detalle:'Próximamente disponible',
    disponible:false,
    color:'#86868B',
  },
]

export default function OnboardingPage() {
  const T = useT()
  const router  = useRouter()
  const [selected, setSelected] = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [user,     setUser]     = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('nexum_token')
    if (!token) { router.push('/login'); return }
    fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d.country) { router.push('/dashboard'); return }
        setUser(d)
      })
      .catch(() => router.push('/login'))
  }, [])

  async function handleContinuar() {
    if (!selected) return
    setLoading(true)
    setError('')
    const token = localStorage.getItem('nexum_token')
    try {
      const res = await fetch(`${API}/api/auth/set-country`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ country: selected }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.detail || 'Error al guardar la jurisdicción.')
        return
      }
      router.push('/dashboard')
    } catch {
      setError('Error de conexión.')
    } finally {
      setLoading(false)
    }
  }

  const pais = PAISES.find(p => p.code === selected)

  return (
    <div style={{
      minHeight:'100dvh', background:T.bg,
      fontFamily:FONT,
      display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', padding:'40px 20px',
    }}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:48}}>
        <div style={{
          width:40,height:40,borderRadius:10,
          background:'linear-gradient(135deg,#00B4D8,#2563eb)',
          display:'flex',alignItems:'center',justifyContent:'center',
          boxShadow:'0 4px 12px rgba(0,180,216,0.3)',
        }}>
          <svg width="20" height="17" viewBox="0 0 26 22" fill="none">
            <rect x="1"  y="12" width="6" height="10" rx="1.5" fill="rgba(255,255,255,0.6)"/>
            <rect x="10" y="6"  width="6" height="16" rx="1.5" fill="rgba(255,255,255,0.8)"/>
            <rect x="19" y="1"  width="6" height="21" rx="1.5" fill="white"/>
          </svg>
        </div>
        <div>
          <div style={{fontSize:18,fontWeight:700,color:T.text,letterSpacing:'-0.4px'}}>Vortu</div>
          <div style={{fontSize:11,color:T.text4,letterSpacing:'0.06em',textTransform:'uppercase'}}>by Nexum Solutions</div>
        </div>
      </div>

      {/* Card principal */}
      <div style={{
        width:'100%', maxWidth:680,
        background:T.card, borderRadius:20,
        border:`.5px solid ${T.hairline}`,
        boxShadow:'0 4px 40px rgba(0,0,0,0.08)',
        overflow:'hidden',
      }}>

        {/* Top */}
        <div style={{
          background:NAVY, padding:'36px 40px',
          backgroundImage:'radial-gradient(ellipse 60% 80% at 100% 50%, rgba(0,180,216,0.12) 0%, transparent 70%)',
        }}>
          <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.4)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:10}}>
            Paso 2 de 3
          </div>
          <div style={{fontSize:26,fontWeight:700,color:'#fff',letterSpacing:'-0.5px',marginBottom:8}}>
            ¿En qué país opera tu empresa?
          </div>
          <div style={{fontSize:14,color:'rgba(255,255,255,0.5)',lineHeight:1.6}}>
            Configuraremos tu sistema contable, fiscal y de facturación según la normativa local vigente.
          </div>
        </div>

        {/* Grid de países */}
        <div style={{padding:'32px 40px'}}>
          <div style={{
            display:'grid',
            gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))',
            gap:14, marginBottom:28,
          }}>
            {PAISES.map(p => {
              const isSelected = selected === p.code
              return (
                <button
                  type="button"
                  key={p.code}
                  onClick={() => p.disponible && setSelected(p.code)}
                  disabled={!p.disponible}
                  aria-pressed={isSelected}
                  aria-label={`${p.name} — ${p.desc}`}
                  style={{
                    textAlign:'left', font:'inherit', appearance:'none', width:'100%',
                    borderRadius:14,
                    border: isSelected
                      ? `1.5px solid ${p.color}`
                      : `.5px solid ${T.hairline}`,
                    background: isSelected
                      ? `rgba(${p.color === '#0071E3' ? '0,113,227' : '52,199,89'},.06)`
                      : p.disponible ? T.card : T.sidebar,
                    padding:'20px 18px',
                    cursor: p.disponible ? 'pointer' : 'not-allowed',
                    opacity: p.disponible ? 1 : 0.5,
                    transition:'all .15s',
                    position:'relative',
                    boxShadow: isSelected ? `0 0 0 3px ${p.color}22` : 'none',
                  }}
                >
                  {/* Checkmark */}
                  {isSelected && (
                    <div style={{
                      position:'absolute', top:12, right:12,
                      width:20, height:20, borderRadius:999,
                      background:p.color,
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
                        <path d="M1 4l3 3 6-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}

                  {/* Próximamente badge */}
                  {!p.disponible && (
                    <div style={{
                      position:'absolute', top:10, right:10,
                      fontSize:9, fontWeight:600, color:T.text4,
                      background:T.sidebar, border:`.5px solid ${T.hairline}`,
                      borderRadius:999, padding:'2px 7px', letterSpacing:'0.04em',
                    }}>
                      Próximamente
                    </div>
                  )}

                  <div style={{fontSize:28, marginBottom:10}}>{p.flag}</div>
                  <div style={{fontSize:14,fontWeight:600,color:T.text,marginBottom:4}}>{p.name}</div>
                  <div style={{fontSize:12,color:isSelected ? p.color : T.text3,fontWeight:500,marginBottom:4}}>{p.desc}</div>
                  <div style={{fontSize:11,color:T.text4,lineHeight:1.5}}>{p.detalle}</div>
                </button>
              )
            })}
          </div>

          {/* Detalle del país seleccionado */}
          {pais && pais.disponible && (
            <div style={{
              background: pais.code === 'ES' ? 'rgba(0,113,227,.06)' : T.greenSoft,
              border: `.5px solid ${pais.code === 'ES' ? 'rgba(0,113,227,.2)' : 'rgba(52,199,89,.2)'}`,
              borderRadius:12, padding:'14px 18px',
              display:'flex', alignItems:'center', gap:12, marginBottom:24,
            }}>
              <span style={{fontSize:22}}>{pais.flag}</span>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:2}}>
                  {pais.name} seleccionado
                </div>
                <div style={{fontSize:12,color:T.text3}}>
                  {pais.code === 'ES'
                    ? 'PGC español (RD 1514/2007), IVA trimestral Modelo 303, IRPF Modelo 130/131'
                    : 'DTE electrónico, IVA 13%, conexión con Ministerio de Hacienda de El Salvador'}
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding:'11px 14px', borderRadius:10, marginBottom:16,
              background:T.redSoft, border:`.5px solid ${T.red}`,
              color:T.red, fontSize:13,
            }}>
              {error}
            </div>
          )}

          {/* Botón continuar */}
          <button
            onClick={handleContinuar}
            disabled={!selected || loading}
            style={{
              width:'100%', padding:'14px', borderRadius:12, border:'none',
              background: selected ? T.navy : T.sidebar,
              color: selected ? '#fff' : T.text4,
              fontSize:15, fontWeight:600, cursor: selected ? 'pointer' : 'not-allowed',
              fontFamily:'inherit', letterSpacing:'-0.2px',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              transition:'all .2s',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width:16,height:16,border:'2px solid rgba(255,255,255,0.3)',
                  borderTopColor:'white',borderRadius:'50%',
                  animation:'spin .7s linear infinite',
                }}/>
                Configurando...
              </>
            ) : (
              <>Continuar con {pais ? pais.name : 'el país seleccionado'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{opacity:.5,flexShrink:0}}>
                  <path d="M5 12h14M13 6l6 6-6 6"/>
                </svg>
              </>
            )}
          </button>

          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

          <div style={{textAlign:'center',marginTop:16,fontSize:12,color:T.text4}}>
            Podrás añadir operaciones en otros países más adelante desde Configuración.
          </div>
        </div>
      </div>

      <div style={{marginTop:24,fontSize:12,color:T.text4}}>
        Vortu by Nexum Solutions · © 2026
      </div>
    </div>
  )
}
