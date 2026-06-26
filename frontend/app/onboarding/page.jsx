'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { useT, FONT } from '@/components/ui/tokens'

import { API_BASE as API } from '@/lib/api'

// Hero card oscuro intencional (idéntico en claro y oscuro) — no es token de paleta
const NAVY = '#0B0D2B'
const TOTAL_PASOS = 4

const PAISES = [
  { code:'ES', name:'España',       flag:'🇪🇸', desc:'VeriFactu — AEAT',           detalle:'PGC RD 1514/2007 · IVA 21/10/4% · IRPF',        disponible:true,  color:'#3D2BFF' },
  { code:'MX', name:'México',       flag:'🇲🇽', desc:'CFDI — SAT',                 detalle:'Plan contable · IVA 16% · CFDI próximamente',   disponible:true,  color:'#3D2BFF' },
  { code:'SV', name:'El Salvador',  flag:'🇸🇻', desc:'DTE — Ministerio de Hacienda', detalle:'IVA 13% · Facturación electrónica obligatoria', disponible:true,  color:'#34C759' },
  { code:'CO', name:'Colombia',     flag:'🇨🇴', desc:'DIAN — Factura Electrónica',  detalle:'Próximamente disponible',                       disponible:false, color:'#86868B' },
  { code:'AR', name:'Argentina',    flag:'🇦🇷', desc:'AFIP — Factura Electrónica',  detalle:'Próximamente disponible',                       disponible:false, color:'#86868B' },
  { code:'CL', name:'Chile',        flag:'🇨🇱', desc:'SII — Boleta/Factura',        detalle:'Próximamente disponible',                       disponible:false, color:'#86868B' },
]

// Campos fiscales por país para el paso (opcional / saltable). El identificador
// principal va a `nit` (slot genérico de config_fiscal); SV añade NRC.
const FISCAL = {
  ES: [{ key:'nit', label:'NIF / CIF',  ph:'B12345678' }],
  MX: [{ key:'nit', label:'RFC',        ph:'XAXX010101000' }],
  SV: [{ key:'nit', label:'NIT',        ph:'0614-310595-001-2' }, { key:'nrc', label:'NRC', ph:'123456-7' }],
}

// Componentes a nivel de módulo (NO dentro del render — declararlos en el render
// recrea su tipo en cada cambio de estado y resetea el foco de los inputs).
const Spinner = () => (
  <div style={{ width:16,height:16,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin .7s linear infinite' }}/>
)

function Shell({ T, paso, titulo, sub, children }) {
  return (
    <div style={{
      minHeight:'100dvh', background:T.bg, fontFamily:FONT,
      display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', padding:'40px 20px',
    }}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:32}}>
        <div style={{ width:40,height:40,borderRadius:10, background:'linear-gradient(135deg,#3D2BFF,#A5B1FF)', display:'flex',alignItems:'center',justifyContent:'center', boxShadow:'0 4px 12px rgba(61,43,255,0.3)' }}>
          <svg width="20" height="17" viewBox="0 0 26 22" fill="none">
            <rect x="1" y="12" width="6" height="10" rx="1.5" fill="rgba(255,255,255,0.6)"/>
            <rect x="10" y="6" width="6" height="16" rx="1.5" fill="rgba(255,255,255,0.8)"/>
            <rect x="19" y="1" width="6" height="21" rx="1.5" fill="white"/>
          </svg>
        </div>
        <div style={{fontSize:18,fontWeight:700,color:T.text,letterSpacing:'-0.4px'}}>Vela</div>
      </div>

      <div style={{ width:'100%', maxWidth:680, background:T.card, borderRadius:20, border:`.5px solid ${T.hairline}`, boxShadow:'0 4px 40px rgba(0,0,0,0.08)', overflow:'hidden' }}>
        <div style={{ background:NAVY, padding:'34px 40px', backgroundImage:'radial-gradient(ellipse 60% 80% at 100% 50%, rgba(61,43,255,0.12) 0%, transparent 70%)' }}>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:14}}>
            {Array.from({length:TOTAL_PASOS}).map((_,i)=>(
              <div key={i} style={{ height:4, flex:1, borderRadius:999, background: i < paso ? '#fff' : 'rgba(255,255,255,0.18)', transition:'background .3s' }}/>
            ))}
          </div>
          <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.4)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:10}}>
            Paso {paso} de {TOTAL_PASOS}
          </div>
          <div style={{fontSize:26,fontWeight:700,color:'#fff',letterSpacing:'-0.5px',marginBottom:8}}>{titulo}</div>
          {sub && <div style={{fontSize:14,color:'rgba(255,255,255,0.5)',lineHeight:1.6}}>{sub}</div>}
        </div>
        <div style={{padding:'32px 40px'}}>{children}</div>
      </div>

      <div style={{marginTop:24,fontSize:12,color:T.text4}}>Vela · © 2026</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function OnboardingPage() {
  const T = useT()
  const router  = useRouter()
  const [step,     setStep]     = useState(1)
  const [selected, setSelected] = useState(null)
  const [fiscal,   setFiscal]   = useState({ nombre_legal:'', nit:'', nrc:'' })
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    const token = localStorage.getItem('vela_token')
    if (!token) { router.push('/login'); return }
    fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) { localStorage.removeItem('vela_token'); router.push('/login'); return null }
        return r.json()
      })
      .then(d => {
        if (!d) return
        // País ya configurado → el setup obligatorio ya está hecho. Al panel.
        if (d.country) { router.push('/dashboard'); return }
      })
      .catch(() => router.push('/login'))
  }, [])

  // Paso 2 → guardar país (OBLIGATORIO: sin esto el guard te devuelve aquí) → paso 3.
  async function guardarPais() {
    if (!selected) return
    setLoading(true); setError('')
    const token = localStorage.getItem('vela_token')
    try {
      const res = await fetch(`${API}/api/auth/set-country`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ country: selected }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.detail || 'No se pudo guardar el país.')
        return
      }
      setStep(3)
    } catch { setError('Error de conexión.') } finally { setLoading(false) }
  }

  // Paso 3 → guardar datos fiscales (OPCIONAL: se puede saltar) → paso 4.
  async function guardarFiscal(skip) {
    setError('')
    if (skip) { setStep(4); return }
    setLoading(true)
    const token = localStorage.getItem('vela_token')
    const payload = {
      nombre_legal: fiscal.nombre_legal || null,
      nit: fiscal.nit || null,
      nrc: fiscal.nrc || null,
    }
    try {
      await fetch(`${API}/api/fiscal/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
    } catch { /* best-effort: el paso es opcional, seguimos igual */ }
    finally { setLoading(false); setStep(4) }
  }

  const pais = PAISES.find(p => p.code === selected)
  const errorBox = error ? (
    <div style={{padding:'11px 14px',borderRadius:10,marginBottom:16,background:T.redSoft,border:`.5px solid ${T.red}`,color:T.red,fontSize:13}}>{error}</div>
  ) : null

  // ── Paso 1: Bienvenida ──────────────────────────────────────────────────────
  if (step === 1) {
    const items = [
      ['🧾','Contabilidad y facturación','Plan contable oficial y normativa fiscal de tu país, listos al instante.'],
      ['🛒','Ventas y POS','Productos, ventas y cobros con tarjeta/Apple Pay.'],
      ['📄','Documentos con IA','Sube una factura y Vera extrae los datos por ti.'],
    ]
    return (
      <Shell T={T} paso={1} titulo="Bienvenido a Vela" sub="Vamos a dejar tu cuenta lista en menos de un minuto.">
        <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:28}}>
          {items.map(([ic,t,d])=>(
            <div key={t} style={{display:'flex',gap:14,alignItems:'flex-start'}}>
              <div style={{fontSize:22,lineHeight:1.2,width:30,textAlign:'center'}}>{ic}</div>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:T.text,marginBottom:2}}>{t}</div>
                <div style={{fontSize:12.5,color:T.text3,lineHeight:1.5}}>{d}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={()=>setStep(2)} style={{ width:'100%',padding:'14px',borderRadius:12,border:'none',background:T.navy,color:'#fff',fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
          Empezar
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity:.5}}><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </button>
      </Shell>
    )
  }

  // ── Paso 2: País (OBLIGATORIO) ──────────────────────────────────────────────
  if (step === 2) {
    return (
      <Shell T={T} paso={2} titulo="¿En qué país opera tu empresa?" sub="Configuraremos tu contabilidad, impuestos y facturación según la normativa local.">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:14, marginBottom:24 }}>
          {PAISES.map(p => {
            const isSel = selected === p.code
            return (
              <button type="button" key={p.code} onClick={()=>p.disponible&&setSelected(p.code)} disabled={!p.disponible} aria-pressed={isSel}
                style={{ textAlign:'left',font:'inherit',appearance:'none',width:'100%',borderRadius:14,
                  border:isSel?`1.5px solid ${p.color}`:`.5px solid ${T.hairline}`,
                  background:isSel?`rgba(${p.color==='#3D2BFF'?'61,43,255':'52,199,89'},.06)`:p.disponible?T.card:T.sidebar,
                  padding:'20px 18px',cursor:p.disponible?'pointer':'not-allowed',opacity:p.disponible?1:0.5,transition:'all .15s',position:'relative',
                  boxShadow:isSel?`0 0 0 3px ${p.color}22`:'none' }}>
                {isSel && <div style={{position:'absolute',top:12,right:12,width:20,height:20,borderRadius:999,background:p.color,display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="11" height="8" viewBox="0 0 11 8" fill="none"><path d="M1 4l3 3 6-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></div>}
                {!p.disponible && <div style={{position:'absolute',top:10,right:10,fontSize:9,fontWeight:600,color:T.text4,background:T.sidebar,border:`.5px solid ${T.hairline}`,borderRadius:999,padding:'2px 7px'}}>Próximamente</div>}
                <div style={{fontSize:28,marginBottom:10}}>{p.flag}</div>
                <div style={{fontSize:14,fontWeight:600,color:T.text,marginBottom:4}}>{p.name}</div>
                <div style={{fontSize:12,color:isSel?p.color:T.text3,fontWeight:500,marginBottom:4}}>{p.desc}</div>
                <div style={{fontSize:11,color:T.text4,lineHeight:1.5}}>{p.detalle}</div>
              </button>
            )
          })}
        </div>
        {errorBox}
        <div style={{display:'flex',gap:10}}>
          <button onClick={()=>setStep(1)} style={{padding:'14px 18px',borderRadius:12,border:`.5px solid ${T.hairline}`,background:T.card,color:T.text3,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Atrás</button>
          <button onClick={guardarPais} disabled={!selected||loading}
            style={{flex:1,padding:'14px',borderRadius:12,border:'none',background:selected?T.navy:T.sidebar,color:selected?'#fff':T.text4,fontSize:15,fontWeight:600,cursor:selected?'pointer':'not-allowed',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8,opacity:loading?0.7:1}}>
            {loading ? <><Spinner/>Configurando...</> : <>Continuar{pais?` con ${pais.name}`:''}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity:.5}}><path d="M5 12h14M13 6l6 6-6 6"/></svg></>}
          </button>
        </div>
      </Shell>
    )
  }

  // ── Paso 3: Datos fiscales (OPCIONAL / saltable) ────────────────────────────
  if (step === 3) {
    const campos = FISCAL[selected] || []
    const inputStyle = { width:'100%',padding:'12px 14px',borderRadius:10,border:`.5px solid ${T.hairline}`,background:T.card,color:T.text,fontSize:14,fontFamily:'inherit',outline:'none' }
    return (
      <Shell T={T} paso={3} titulo="Datos fiscales de tu empresa" sub={`Opcional — puedes saltarlo y completarlo luego en Fiscal.${pais?` · ${pais.name}`:''}`}>
        <div style={{display:'flex',flexDirection:'column',gap:16,marginBottom:24}}>
          <div>
            <div style={{fontSize:12,fontWeight:600,color:T.text3,marginBottom:6}}>Razón social (nombre legal)</div>
            <input value={fiscal.nombre_legal} onChange={e=>setFiscal({...fiscal,nombre_legal:e.target.value})} placeholder="Mi Empresa S.L." style={inputStyle}/>
          </div>
          {campos.map(c=>(
            <div key={c.key}>
              <div style={{fontSize:12,fontWeight:600,color:T.text3,marginBottom:6}}>{c.label}</div>
              <input value={fiscal[c.key]} onChange={e=>setFiscal({...fiscal,[c.key]:e.target.value})} placeholder={c.ph} style={inputStyle}/>
            </div>
          ))}
        </div>
        {errorBox}
        <div style={{display:'flex',gap:10}}>
          <button onClick={()=>guardarFiscal(true)} style={{padding:'14px 18px',borderRadius:12,border:`.5px solid ${T.hairline}`,background:T.card,color:T.text3,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Saltar por ahora</button>
          <button onClick={()=>guardarFiscal(false)} disabled={loading}
            style={{flex:1,padding:'14px',borderRadius:12,border:'none',background:T.navy,color:'#fff',fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8,opacity:loading?0.7:1}}>
            {loading ? <><Spinner/>Guardando...</> : <>Guardar y continuar<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity:.5}}><path d="M5 12h14M13 6l6 6-6 6"/></svg></>}
          </button>
        </div>
      </Shell>
    )
  }

  // ── Paso 4: ¡Listo! ─────────────────────────────────────────────────────────
  const accesos = [
    ['/dashboard','📊','Panel','Tu resumen del negocio'],
    ['/ventas','🛒','Ventas','Productos y cobros'],
    ['/documentos','📄','Documentos','Sube y extrae con IA'],
  ]
  return (
    <Shell T={T} paso={4} titulo="¡Todo listo! 🎉" sub="Tu cuenta está configurada. Empieza por aquí:">
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:24}}>
        {accesos.map(([href,ic,t,d])=>(
          <button key={href} onClick={()=>router.push(href)} style={{textAlign:'left',font:'inherit',appearance:'none',borderRadius:14,border:`.5px solid ${T.hairline}`,background:T.card,padding:'18px',cursor:'pointer'}}>
            <div style={{fontSize:24,marginBottom:8}}>{ic}</div>
            <div style={{fontSize:14,fontWeight:600,color:T.text,marginBottom:2}}>{t}</div>
            <div style={{fontSize:11.5,color:T.text4,lineHeight:1.5}}>{d}</div>
          </button>
        ))}
      </div>
      <button onClick={()=>router.push('/dashboard')} style={{width:'100%',padding:'14px',borderRadius:12,border:'none',background:T.navy,color:'#fff',fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
        Ir al panel
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity:.5}}><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </button>
    </Shell>
  )
}
