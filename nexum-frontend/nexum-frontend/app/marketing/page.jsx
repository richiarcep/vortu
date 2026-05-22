'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const API   = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const NAVY  = '#0B1426'
const GREEN = '#16a34a'
const RED   = '#dc2626'
const AMBER = '#d97706'
const BLUE  = '#2563eb'
const CYAN  = '#00B4D8'

import Sidebar from '@/components/Sidebar'

// ── Notification Center ────────────────────────────────────────────────────────
function NotificationCenter({ token }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const ref = useRef()
  const router = useRouter()
  useEffect(() => { function h(e){if(ref.current&&!ref.current.contains(e.target))setOpen(false)}; document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h) }, [])
  useEffect(() => { if(token) load() }, [token])
  async function load() {
    const notifs=[]
    try {
      const [a,b,c] = await Promise.allSettled([
        fetch(`${API}/api/clientes/inbox`,{headers:{Authorization:`Bearer ${token}`}}),
        fetch(`${API}/api/proyectos/resumen`,{headers:{Authorization:`Bearer ${token}`}}),
        fetch(`${API}/api/ventas/alertas/stock`,{headers:{Authorization:`Bearer ${token}`}}),
      ])
      if(a.status==='fulfilled'&&a.value.ok){const d=await a.value.json();if(d.requires_human>0)notifs.push({id:'m1',type:'urgent',icon:'💬',title:`${d.requires_human} mensaje${d.requires_human>1?'s':''} requiere atención`,desc:'Un cliente necesita respuesta humana',href:'/clientes',time:'Ahora'})}
      if(b.status==='fulfilled'&&b.value.ok){const d=await b.value.json();if(d.at_risk>0)notifs.push({id:'p1',type:'warning',icon:'📋',title:`${d.at_risk} proyecto${d.at_risk>1?'s':''} en riesgo`,desc:'Health score bajo',href:'/proyectos',time:'Hoy'})}
      if(c.status==='fulfilled'&&c.value.ok){const d=await c.value.json();if(d.total>0)notifs.push({id:'s1',type:'warning',icon:'📦',title:`${d.total} producto${d.total>1?'s':''} con stock bajo`,desc:'Reabastece pronto',href:'/ventas',time:'Hoy'})}
    } catch{}
    setNotifications(notifs)
  }
  const unread = notifications.length
  const TC = { urgent:{color:RED,bg:'#fef2f2',dot:RED}, warning:{color:AMBER,bg:'#fffbeb',dot:AMBER}, info:{color:BLUE,bg:'#eff6ff',dot:BLUE} }
  return (
    <div ref={ref} style={{position:'relative'}}>
      <button onClick={()=>setOpen(o=>!o)} style={{position:'relative',width:'38px',height:'38px',borderRadius:'10px',border:'1px solid #e5e9f0',background:open?'#f4f6fb':'white',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        {unread>0&&<span style={{position:'absolute',top:'-4px',right:'-4px',width:'18px',height:'18px',borderRadius:'50%',background:RED,color:'white',fontSize:'10px',fontWeight:'800',display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid white'}}>{unread>9?'9+':unread}</span>}
      </button>
      {open&&(
        <div style={{position:'absolute',top:'46px',right:0,width:'360px',background:'white',borderRadius:'16px',border:'1px solid #e5e9f0',boxShadow:'0 16px 48px rgba(0,0,0,0.12)',zIndex:200,overflow:'hidden'}}>
          <div style={{padding:'16px 18px',borderBottom:'1px solid #f0f2f7',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:'14px',fontWeight:'700',color:NAVY}}>Notificaciones</div>
            {unread>0&&<span style={{fontSize:'11px',fontWeight:'700',color:'white',background:RED,padding:'2px 8px',borderRadius:'10px'}}>{unread} nueva{unread>1?'s':''}</span>}
          </div>
          <div style={{maxHeight:'360px',overflowY:'auto'}}>
            {notifications.length===0
              ?<div style={{padding:'40px',textAlign:'center'}}><div style={{fontSize:'28px',marginBottom:'10px',opacity:0.3}}>🔔</div><div style={{fontSize:'13px',color:'#6b7280',fontWeight:'500'}}>Todo en orden</div></div>
              :notifications.map((n,i)=>{const cfg=TC[n.type]||TC.info;return(
                <div key={n.id} onClick={()=>{router.push(n.href);setOpen(false)}} style={{padding:'13px 18px',borderBottom:i<notifications.length-1?'1px solid #f8f9fc':'none',cursor:'pointer',display:'flex',gap:'12px',alignItems:'flex-start'}} onMouseEnter={e=>e.currentTarget.style.background='#fafafa'} onMouseLeave={e=>e.currentTarget.style.background='white'}>
                  <div style={{width:'36px',height:'36px',borderRadius:'10px',background:cfg.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0}}>{n.icon}</div>
                  <div style={{flex:1}}><div style={{fontSize:'13px',fontWeight:'600',color:NAVY,marginBottom:'2px'}}>{n.title}</div><div style={{fontSize:'12px',color:'#6b7280'}}>{n.desc}</div><div style={{fontSize:'11px',color:'#9ca3af',display:'flex',alignItems:'center',gap:'5px',marginTop:'3px'}}><span style={{width:'5px',height:'5px',borderRadius:'50%',background:cfg.dot,display:'inline-block'}}/>{n.time}</div></div>
                  <span style={{fontSize:'16px',color:'#d1d5db'}}>›</span>
                </div>
              )})}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Profile Button ─────────────────────────────────────────────────────────────
function ProfileButton({ user }) {
  const [open,setOpen] = useState(false)
  const ref = useRef()
  const router = useRouter()
  useEffect(()=>{function h(e){if(ref.current&&!ref.current.contains(e.target))setOpen(false)};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h)},[])
  const initials = user?.name?user.name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase():'US'
  return (
    <div ref={ref} style={{position:'relative'}}>
      <button onClick={()=>setOpen(o=>!o)} style={{display:'flex',alignItems:'center',gap:'8px',padding:'5px 10px 5px 5px',borderRadius:'10px',border:'1px solid #e5e9f0',background:'white',cursor:'pointer'}}>
        <div style={{width:'28px',height:'28px',borderRadius:'8px',background:NAVY,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'11px',fontWeight:'800'}}>{initials}</div>
        <div style={{textAlign:'left'}}><div style={{fontSize:'12px',fontWeight:'700',color:NAVY,lineHeight:1.2}}>{user?.name?.split(' ')[0]||'Usuario'}</div><div style={{fontSize:'10px',color:'#9ca3af',lineHeight:1.2}}>Pro</div></div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{color:'#9ca3af'}}><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {open&&(
        <div style={{position:'absolute',top:'46px',right:0,width:'240px',background:'white',borderRadius:'14px',border:'1px solid #e5e9f0',boxShadow:'0 16px 48px rgba(0,0,0,0.12)',zIndex:200,overflow:'hidden'}}>
          <div style={{padding:'14px 16px',borderBottom:'1px solid #f0f2f7',background:'#fafafa',display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={{width:'36px',height:'36px',borderRadius:'10px',background:NAVY,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'13px',fontWeight:'800'}}>{initials}</div>
            <div><div style={{fontSize:'13px',fontWeight:'700',color:NAVY}}>{user?.name||'Usuario'}</div><div style={{fontSize:'11px',color:'#6b7280'}}>{user?.email||''}</div></div>
          </div>
          <div style={{padding:'6px 0'}}>
            {[{icon:'👤',label:'Mi perfil',action:()=>{}},{icon:'💳',label:'Suscripción',action:()=>router.push('/settings?tab=subscription')},{icon:'⚙️',label:'Configuración',action:()=>router.push('/settings')}].map((item,i)=>(
              <button key={i} onClick={()=>{item.action();setOpen(false)}} style={{width:'100%',padding:'9px 16px',display:'flex',alignItems:'center',gap:'10px',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',textAlign:'left'}} onMouseEnter={e=>e.currentTarget.style.background='#fafafa'} onMouseLeave={e=>e.currentTarget.style.background='none'}>
                <span style={{fontSize:'15px'}}>{item.icon}</span><span style={{fontSize:'13px',fontWeight:'600',color:NAVY}}>{item.label}</span>
              </button>
            ))}
          </div>
          <div style={{padding:'8px 12px 12px',borderTop:'1px solid #f0f2f7'}}>
            <button onClick={()=>{localStorage.removeItem('nexum_token');router.push('/login')}} style={{width:'100%',padding:'8px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'8px',color:RED,fontSize:'13px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}}>Cerrar sesión</button>
          </div>
        </div>
      )}
    </div>
  )
}

function SettingsButton() {
  const router = useRouter()
  return (
    <button onClick={()=>router.push('/settings')} style={{width:'38px',height:'38px',borderRadius:'10px',border:'1px solid #e5e9f0',background:'white',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.background='#f4f6fb'} onMouseLeave={e=>e.currentTarget.style.background='white'}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    </button>
  )
}

// ── Welcome Popup ──────────────────────────────────────────────────────────────
function WelcomePopup({ onClose }) {
  const [step, setStep] = useState(0)
  const steps = [
    {
      icon: '🔍',
      title: 'Analiza tu empresa',
      color: CYAN,
      desc: 'Vortu lee automáticamente tus datos de ventas, contabilidad y clientes para entender tu negocio. También puedes subir documentos extra como briefings o análisis de competencia.',
      tip: 'Ve a la pestaña Análisis y pulsa "Analizar mi empresa".',
    },
    {
      icon: '🚀',
      title: 'Crea tu primera campaña',
      color: '#8b5cf6',
      desc: 'Con el análisis listo, Claude genera automáticamente todos los copies: titulares y keywords para Google Ads, textos y CTAs para Meta, scripts de vídeo de 15s y 30s, y prompts de imagen.',
      tip: 'Ve a Campañas → Nueva campaña, elige objetivo y presupuesto.',
    },
    {
      icon: '📊',
      title: 'Conecta Google Ads y Meta',
      color: GREEN,
      desc: 'Para publicar y ver métricas reales necesitas conectar tus cuentas. Vortu publica directamente en las plataformas y trae de vuelta impresiones, clics, CTR, gasto y conversiones.',
      tip: (
        <div>
          <div style={{fontWeight:'700',marginBottom:'8px',color:NAVY}}>Google Ads — necesitas 5 datos:</div>
          {['Customer ID (en tu cuenta de Google Ads, esquina superior derecha)','Developer Token (Google Ads → Herramientas → API Center)','Client ID + Client Secret (Google Cloud Console → OAuth 2.0)','Refresh Token (generado con flujo OAuth)'].map((t,i)=>(
            <div key={i} style={{display:'flex',gap:'8px',marginBottom:'6px',fontSize:'12px',color:'#374151'}}>
              <span style={{color:GREEN,fontWeight:'700',flexShrink:0}}>✓</span>{t}
            </div>
          ))}
          <div style={{fontWeight:'700',marginTop:'12px',marginBottom:'8px',color:NAVY}}>Meta Ads — necesitas 3 datos:</div>
          {['Account ID (business.facebook.com → Cuentas publicitarias)','Access Token (System User permanente en Meta Business Manager)','App ID (developers.facebook.com → tu app)'].map((t,i)=>(
            <div key={i} style={{display:'flex',gap:'8px',marginBottom:'6px',fontSize:'12px',color:'#374151'}}>
              <span style={{color:'#1877F2',fontWeight:'700',flexShrink:0}}>✓</span>{t}
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: '📈',
      title: 'Monitoriza resultados',
      color: AMBER,
      desc: 'En la pestaña Métricas verás en tiempo real cómo van tus campañas: impresiones, clics, CTR, coste por clic, conversiones y ROAS. Vortu actualiza los datos directamente de las APIs.',
      tip: 'Desde Campañas puedes pausar o reanudar cualquier campaña con un clic.',
    },
  ]
  const current = steps[step]
  const isLast  = step === steps.length - 1

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(11,20,38,0.65)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'20px'}}>
      <div style={{background:'white',borderRadius:'20px',width:'100%',maxWidth:'580px',boxShadow:'0 40px 100px rgba(0,0,0,0.25)',overflow:'hidden',animation:'fadeUp 0.3s ease'}}>

        {/* Header */}
        <div style={{background:NAVY,padding:'24px 28px',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',inset:0,background:`radial-gradient(ellipse 60% 80% at 90% 50%, ${current.color}22, transparent)`,pointerEvents:'none'}}/>
          <div style={{display:'flex',alignItems:'center',gap:'12px',position:'relative'}}>
            <div style={{width:'48px',height:'48px',borderRadius:'14px',background:`${current.color}22`,border:`1.5px solid ${current.color}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',flexShrink:0}}>{current.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:'11px',fontWeight:'700',color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'3px'}}>
                Bienvenido a Marketing IA · Paso {step+1} de {steps.length}
              </div>
              <div style={{fontSize:'18px',fontWeight:'800',color:'white',letterSpacing:'-0.4px'}}>{current.title}</div>
            </div>
            <button onClick={onClose} style={{background:'rgba(255,255,255,0.08)',border:'none',color:'rgba(255,255,255,0.5)',width:'30px',height:'30px',borderRadius:'8px',cursor:'pointer',fontSize:'18px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>×</button>
          </div>
          {/* Progress dots */}
          <div style={{display:'flex',gap:'6px',marginTop:'16px',position:'relative'}}>
            {steps.map((_,i)=>(
              <div key={i} onClick={()=>setStep(i)} style={{height:'3px',flex:1,borderRadius:'2px',background:i<=step?current.color:'rgba(255,255,255,0.15)',cursor:'pointer',transition:'all 0.3s'}}/>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{padding:'24px 28px'}}>
          <p style={{margin:'0 0 20px',fontSize:'14px',color:'#374151',lineHeight:'1.7'}}>{current.desc}</p>

          <div style={{background:'#f8faff',borderRadius:'12px',border:`1px solid ${current.color}33`,padding:'16px',marginBottom:'24px'}}>
            <div style={{fontSize:'11px',fontWeight:'700',color:current.color,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'8px'}}>
              {step===2?'Qué necesitas':'💡 Cómo hacerlo'}
            </div>
            {typeof current.tip === 'string'
              ? <p style={{margin:0,fontSize:'13px',color:'#374151',lineHeight:'1.6'}}>{current.tip}</p>
              : current.tip
            }
          </div>

          <div style={{display:'flex',gap:'10px',justifyContent:'space-between',alignItems:'center'}}>
            <button onClick={onClose} style={{fontSize:'13px',color:'#9ca3af',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
              Saltar guía
            </button>
            <div style={{display:'flex',gap:'8px'}}>
              {step>0&&(
                <button onClick={()=>setStep(s=>s-1)} style={{padding:'10px 20px',borderRadius:'9px',border:'1px solid #e5e9f0',background:'white',color:NAVY,fontSize:'13px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}}>
                  ← Anterior
                </button>
              )}
              <button onClick={()=>isLast?onClose():setStep(s=>s+1)}
                style={{padding:'10px 24px',borderRadius:'9px',border:'none',background:isLast?GREEN:NAVY,color:'white',fontSize:'13px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s'}}>
                {isLast?'✓ Entendido, empezar':'Siguiente →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Create Campaign Modal ──────────────────────────────────────────────────────
function CreateCampaignModal({ onClose, onCreated, token, analysisId }) {
  const [form, setForm] = useState({ name:'', objective:'sales', platforms:['google','meta'], budget_daily:20, budget_total:0, start_date:'', end_date:'', final_url:'', extra_context:'' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const objectives = [
    {key:'awareness',label:'Awareness',desc:'Dar a conocer la marca',icon:'📢'},
    {key:'traffic',label:'Tráfico',desc:'Llevar visitas al sitio web',icon:'🌐'},
    {key:'leads',label:'Leads',desc:'Captar contactos',icon:'📋'},
    {key:'sales',label:'Ventas',desc:'Generar conversiones',icon:'💰'},
    {key:'retargeting',label:'Retargeting',desc:'Reconectar con visitantes',icon:'🔄'},
  ]
  function togglePlatform(p) {
    setForm(f=>({...f, platforms: f.platforms.includes(p)?f.platforms.filter(x=>x!==p):[...f.platforms,p]}))
  }
  async function handleCreate() {
    if(!form.name.trim()){setError('El nombre es obligatorio');return}
    if(form.platforms.length===0){setError('Selecciona al menos una plataforma');return}
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/api/marketing/campanas`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({...form,analysis_id:analysisId||null})})
      if(res.ok){const d=await res.json();onCreated(d)}
      else{const e=await res.json();setError(e.detail||'Error al crear campaña')}
    } catch{setError('Error de conexión')} finally{setLoading(false)}
  }
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(11,20,38,0.55)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'20px'}} onClick={onClose}>
      <div style={{background:'white',borderRadius:'18px',width:'100%',maxWidth:'560px',boxShadow:'0 32px 80px rgba(0,0,0,0.2)',overflow:'hidden',maxHeight:'90vh',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>
        <div style={{background:NAVY,padding:'20px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div>
            <div style={{fontSize:'16px',fontWeight:'800',color:'white',letterSpacing:'-0.3px'}}>🚀 Nueva campaña</div>
            <div style={{fontSize:'11px',color:'rgba(255,255,255,0.4)',marginTop:'2px'}}>Claude generará todos los copies y creatividades automáticamente</div>
          </div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.1)',border:'none',color:'white',width:'30px',height:'30px',borderRadius:'8px',cursor:'pointer',fontSize:'18px',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
        </div>
        <div style={{padding:'24px',overflowY:'auto',flex:1}}>
          {error&&<div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'8px',padding:'10px 14px',marginBottom:'16px',color:RED,fontSize:'13px'}}>{error}</div>}

          <div style={{marginBottom:'16px'}}>
            <label style={{fontSize:'12px',fontWeight:'700',color:'#374151',display:'block',marginBottom:'6px'}}>NOMBRE DE LA CAMPAÑA</label>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Ej: Verano 2026 — Ventas" style={{width:'100%',padding:'10px 12px',borderRadius:'9px',border:'1.5px solid #e5e9f0',fontSize:'13px',fontFamily:'inherit',outline:'none'}} onFocus={e=>e.target.style.borderColor=NAVY} onBlur={e=>e.target.style.borderColor='#e5e9f0'}/>
          </div>

          <div style={{marginBottom:'16px'}}>
            <label style={{fontSize:'12px',fontWeight:'700',color:'#374151',display:'block',marginBottom:'8px'}}>OBJETIVO</label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'6px'}}>
              {objectives.map(o=>(
                <button key={o.key} onClick={()=>setForm(f=>({...f,objective:o.key}))} style={{padding:'10px 6px',borderRadius:'10px',border:'1.5px solid',borderColor:form.objective===o.key?NAVY:'#e5e9f0',background:form.objective===o.key?NAVY:'white',cursor:'pointer',textAlign:'center',transition:'all 0.15s'}}>
                  <div style={{fontSize:'18px',marginBottom:'4px'}}>{o.icon}</div>
                  <div style={{fontSize:'10px',fontWeight:'700',color:form.objective===o.key?'white':NAVY}}>{o.label}</div>
                  <div style={{fontSize:'9px',color:form.objective===o.key?'rgba(255,255,255,0.5)':'#9ca3af',marginTop:'2px'}}>{o.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{marginBottom:'16px'}}>
            <label style={{fontSize:'12px',fontWeight:'700',color:'#374151',display:'block',marginBottom:'8px'}}>PLATAFORMAS</label>
            <div style={{display:'flex',gap:'8px'}}>
              {[{key:'google',label:'Google Ads',icon:'🔵',color:'#4285F4'},{key:'meta',label:'Meta Ads',icon:'🔷',color:'#1877F2'},{key:'tiktok',label:'TikTok',icon:'⬛',color:'#000000'}].map(p=>(
                <button key={p.key} onClick={()=>togglePlatform(p.key)} style={{flex:1,padding:'12px 8px',borderRadius:'10px',border:'1.5px solid',borderColor:form.platforms.includes(p.key)?p.color:'#e5e9f0',background:form.platforms.includes(p.key)?`${p.color}10`:'white',cursor:'pointer',textAlign:'center',transition:'all 0.15s'}}>
                  <div style={{fontSize:'20px',marginBottom:'4px'}}>{p.icon}</div>
                  <div style={{fontSize:'11px',fontWeight:'700',color:form.platforms.includes(p.key)?p.color:NAVY}}>{p.label}</div>
                  {form.platforms.includes(p.key)&&<div style={{fontSize:'10px',color:p.color,marginTop:'2px'}}>✓ Seleccionado</div>}
                </button>
              ))}
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'16px'}}>
            <div>
              <label style={{fontSize:'12px',fontWeight:'700',color:'#374151',display:'block',marginBottom:'5px'}}>PRESUPUESTO DIARIO (€)</label>
              <input type="number" value={form.budget_daily} onChange={e=>setForm(f=>({...f,budget_daily:parseFloat(e.target.value)||0}))} style={{width:'100%',padding:'10px 12px',borderRadius:'9px',border:'1.5px solid #e5e9f0',fontSize:'13px',fontFamily:'inherit',outline:'none'}} onFocus={e=>e.target.style.borderColor=NAVY} onBlur={e=>e.target.style.borderColor='#e5e9f0'}/>
            </div>
            <div>
              <label style={{fontSize:'12px',fontWeight:'700',color:'#374151',display:'block',marginBottom:'5px'}}>URL DE DESTINO</label>
              <input value={form.final_url} onChange={e=>setForm(f=>({...f,final_url:e.target.value}))} placeholder="https://miempresa.com" style={{width:'100%',padding:'10px 12px',borderRadius:'9px',border:'1.5px solid #e5e9f0',fontSize:'13px',fontFamily:'inherit',outline:'none'}} onFocus={e=>e.target.style.borderColor=NAVY} onBlur={e=>e.target.style.borderColor='#e5e9f0'}/>
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'16px'}}>
            {[{key:'start_date',label:'FECHA INICIO'},{key:'end_date',label:'FECHA FIN'}].map(f=>(
              <div key={f.key}>
                <label style={{fontSize:'12px',fontWeight:'700',color:'#374151',display:'block',marginBottom:'5px'}}>{f.label}</label>
                <input type="date" value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} style={{width:'100%',padding:'10px 12px',borderRadius:'9px',border:'1.5px solid #e5e9f0',fontSize:'13px',fontFamily:'inherit',outline:'none'}} onFocus={e=>e.target.style.borderColor=NAVY} onBlur={e=>e.target.style.borderColor='#e5e9f0'}/>
              </div>
            ))}
          </div>

          <div style={{marginBottom:'20px'}}>
            <label style={{fontSize:'12px',fontWeight:'700',color:'#374151',display:'block',marginBottom:'5px'}}>CONTEXTO ADICIONAL (opcional)</label>
            <textarea value={form.extra_context} onChange={e=>setForm(f=>({...f,extra_context:e.target.value}))} placeholder="Ej: Promoción especial de verano, descuento del 20%, enfocado en mujeres 25-40 años..." rows={2} style={{width:'100%',padding:'10px 12px',borderRadius:'9px',border:'1.5px solid #e5e9f0',fontSize:'13px',fontFamily:'inherit',outline:'none',resize:'vertical'}} onFocus={e=>e.target.style.borderColor=NAVY} onBlur={e=>e.target.style.borderColor='#e5e9f0'}/>
          </div>

          <button onClick={handleCreate} disabled={loading} style={{width:'100%',padding:'13px',borderRadius:'10px',border:'none',background:loading?'#e5e9f0':NAVY,color:loading?'#9ca3af':'white',fontWeight:'700',fontSize:'14px',cursor:loading?'not-allowed':'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
            {loading?<><span style={{width:'16px',height:'16px',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',borderRadius:'50%',display:'inline-block',animation:'spin 0.7s linear infinite'}}/> Claude está generando todos los copies...</>:'✨ Crear campaña con IA'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Campaign Card ──────────────────────────────────────────────────────────────
function CampaignCard({ campaign, onSelect, onToggleStatus, token }) {
  const [toggling, setToggling] = useState(false)
  const STATUS = {
    draft:  {label:'Borrador', color:'#374151',bg:'#f1f5f9',dot:'#9ca3af'},
    active: {label:'Activa',   color:'#1a6b4a',bg:'#f0fdf4',dot:'#22c55e'},
    paused: {label:'Pausada',  color:'#92400e',bg:'#fffbeb',dot:'#f59e0b'},
    ended:  {label:'Finalizada',color:'#374151',bg:'#f1f5f9',dot:'#6b7280'},
  }
  const PLATFORMS = {google:'🔵 Google',meta:'🔷 Meta',tiktok:'⬛ TikTok'}
  const status = STATUS[campaign.status]||STATUS.draft
  const platforms = Array.isArray(campaign.platforms)?campaign.platforms:[]
  async function toggle() {
    setToggling(true)
    const newStatus = campaign.status==='active'?'paused':'active'
    try {
      const res = await fetch(`${API}/api/marketing/campanas/${campaign.id}/status`,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({status:newStatus})})
      if(res.ok) onToggleStatus(campaign.id, newStatus)
    } catch{} finally{setToggling(false)}
  }
  return (
    <div style={{background:'white',borderRadius:'14px',border:'1px solid #e5e9f0',overflow:'hidden',transition:'all 0.15s'}} onMouseEnter={e=>e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,0.07)'} onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
      <div style={{height:'3px',background:`linear-gradient(90deg, ${CYAN}, ${BLUE})`}}/>
      <div style={{padding:'16px 18px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px'}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:'14px',fontWeight:'700',color:NAVY,marginBottom:'3px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{campaign.name}</div>
            <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
              {platforms.map(p=><span key={p} style={{fontSize:'10px',fontWeight:'600',color:'#6b7280',background:'#f1f5f9',padding:'2px 7px',borderRadius:'5px'}}>{PLATFORMS[p]||p}</span>)}
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'6px',flexShrink:0,marginLeft:'10px'}}>
            <span style={{width:'6px',height:'6px',borderRadius:'50%',background:status.dot,display:'inline-block'}}/>
            <span style={{fontSize:'11px',fontWeight:'600',color:status.color,background:status.bg,padding:'2px 8px',borderRadius:'6px'}}>{status.label}</span>
          </div>
        </div>
        <div style={{display:'flex',gap:'8px',marginBottom:'12px'}}>
          <div style={{flex:1,background:'#f8faff',borderRadius:'8px',padding:'8px 10px',textAlign:'center'}}>
            <div style={{fontSize:'14px',fontWeight:'800',color:NAVY}}>€{campaign.budget_daily}/día</div>
            <div style={{fontSize:'10px',color:'#9ca3af'}}>Presupuesto</div>
          </div>
          <div style={{flex:1,background:'#f8faff',borderRadius:'8px',padding:'8px 10px',textAlign:'center'}}>
            <div style={{fontSize:'12px',fontWeight:'700',color:'#6b7280',textTransform:'capitalize'}}>{campaign.objective}</div>
            <div style={{fontSize:'10px',color:'#9ca3af'}}>Objetivo</div>
          </div>
        </div>
        <div style={{display:'flex',gap:'6px'}}>
          <button onClick={()=>onSelect(campaign)} style={{flex:1,padding:'8px',borderRadius:'8px',border:'1px solid #e5e9f0',background:'white',color:NAVY,fontSize:'12px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}}>Ver copies →</button>
          {campaign.status!=='draft'&&(
            <button onClick={toggle} disabled={toggling} style={{padding:'8px 12px',borderRadius:'8px',border:'1px solid #e5e9f0',background:campaign.status==='active'?'#fffbeb':'#f0fdf4',color:campaign.status==='active'?AMBER:GREEN,fontSize:'12px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}}>
              {toggling?'...':(campaign.status==='active'?'⏸ Pausar':'▶ Reanudar')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Campaign Detail Modal ──────────────────────────────────────────────────────
function CampaignDetail({ campaign, token, onClose, onPublish }) {
  const [activeTab, setActiveTab] = useState('google')
  const [publishing, setPublishing] = useState(false)
  const [finalUrl, setFinalUrl] = useState(campaign.final_url||'')
  const [pubResult, setPubResult] = useState(null)
  const g = campaign.copies_google||{}
  const m = campaign.copies_meta||{}
  const t = campaign.copies_tiktok||{}
  const imgs = campaign.image_prompts||[]
  const vids = campaign.video_scripts||[]

  async function handlePublish() {
    if(!finalUrl){alert('Introduce la URL de destino primero');return}
    setPublishing(true)
    try {
      const res = await fetch(`${API}/api/marketing/campanas/${campaign.id}/publicar`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({platforms:(campaign.platforms||[]),final_url:finalUrl})})
      if(res.ok){const d=await res.json();setPubResult(d);onPublish&&onPublish(d)}
    } catch{} finally{setPublishing(false)}
  }

  const tabs = [
    {id:'google',label:'🔵 Google Ads'},
    {id:'meta',label:'🔷 Meta Ads'},
    {id:'tiktok',label:'⬛ TikTok'},
    {id:'imagenes',label:'🖼 Imágenes'},
    {id:'videos',label:'🎬 Vídeos'},
  ]

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(11,20,38,0.6)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'20px'}} onClick={onClose}>
      <div style={{background:'#f4f6fb',borderRadius:'20px',width:'100%',maxWidth:'900px',maxHeight:'92vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 40px 100px rgba(0,0,0,0.25)'}} onClick={e=>e.stopPropagation()}>
        <div style={{background:NAVY,padding:'20px 28px',display:'flex',alignItems:'center',gap:'16px'}}>
          <div style={{flex:1}}>
            <div style={{fontSize:'11px',fontWeight:'700',color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'3px'}}>Campaña · {campaign.objective}</div>
            <div style={{fontSize:'18px',fontWeight:'800',color:'white',letterSpacing:'-0.4px'}}>{campaign.name}</div>
          </div>
          {campaign.status==='draft'&&(
            <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
              <input value={finalUrl} onChange={e=>setFinalUrl(e.target.value)} placeholder="URL de destino" style={{padding:'8px 12px',borderRadius:'8px',border:'1px solid rgba(255,255,255,0.15)',background:'rgba(255,255,255,0.08)',color:'white',fontSize:'12px',fontFamily:'inherit',outline:'none',width:'200px'}}/>
              <button onClick={handlePublish} disabled={publishing} style={{padding:'9px 18px',borderRadius:'9px',border:'none',background:publishing?'rgba(255,255,255,0.1)':`linear-gradient(135deg, ${CYAN}, ${BLUE})`,color:'white',fontWeight:'700',fontSize:'13px',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
                {publishing?'Publicando...':'🚀 Publicar'}
              </button>
            </div>
          )}
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.08)',border:'none',color:'white',width:'32px',height:'32px',borderRadius:'8px',cursor:'pointer',fontSize:'18px',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
        </div>

        {pubResult&&(
          <div style={{background:'#f0fdf4',borderBottom:'1px solid #bbf7d0',padding:'12px 28px',display:'flex',gap:'16px'}}>
            {Object.entries(pubResult.results||{}).map(([p,r])=>(
              <div key={p} style={{fontSize:'12px',color:r.success?GREEN:RED,fontWeight:'600'}}>
                {p==='google'?'🔵':'🔷'} {r.success?r.message:r.error}
              </div>
            ))}
          </div>
        )}

        <div style={{background:'white',padding:'0 28px',borderBottom:'1px solid #e5e9f0',display:'flex',overflowX:'auto'}}>
          {tabs.map(tab=>(
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{padding:'13px 16px',background:'none',border:'none',borderBottom:activeTab===tab.id?`2px solid ${NAVY}`:'2px solid transparent',color:activeTab===tab.id?NAVY:'#6b7280',fontWeight:activeTab===tab.id?'700':'400',fontSize:'13px',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',transition:'all 0.15s'}}>
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'24px 28px'}}>

          {activeTab==='google'&&(
            <div style={{display:'grid',gap:'14px'}}>
              <div style={{background:'white',borderRadius:'14px',border:'1px solid #e5e9f0',padding:'20px'}}>
                <div style={{fontSize:'11px',fontWeight:'800',color:NAVY,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'14px'}}>Titulares ({(g.headlines||[]).length})</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'8px'}}>
                  {(g.headlines||[]).map((h,i)=><div key={i} style={{padding:'8px 12px',background:'#f8faff',borderRadius:'8px',fontSize:'13px',color:NAVY,fontWeight:'500',border:'1px solid #e5e9f0'}}>{h}</div>)}
                </div>
              </div>
              <div style={{background:'white',borderRadius:'14px',border:'1px solid #e5e9f0',padding:'20px'}}>
                <div style={{fontSize:'11px',fontWeight:'800',color:NAVY,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'14px'}}>Descripciones</div>
                {(g.descriptions||[]).map((d,i)=><div key={i} style={{padding:'10px 12px',background:'#f8faff',borderRadius:'8px',fontSize:'13px',color:'#374151',lineHeight:'1.5',marginBottom:'6px',border:'1px solid #e5e9f0'}}>{d}</div>)}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
                {[{label:'Keywords Exactas',items:g.keywords?.exact||[]},{label:'Keywords de Frase',items:g.keywords?.phrase||[]},{label:'Keywords Amplias',items:g.keywords?.broad||[]},{label:'Keywords Negativas',items:g.negative_keywords||[]}].map(kw=>(
                  <div key={kw.label} style={{background:'white',borderRadius:'12px',border:'1px solid #e5e9f0',padding:'16px'}}>
                    <div style={{fontSize:'11px',fontWeight:'700',color:'#374151',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'10px'}}>{kw.label}</div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:'5px'}}>{kw.items.map((k,i)=><span key={i} style={{fontSize:'11px',padding:'3px 8px',borderRadius:'5px',background:'#f1f5f9',color:'#374151'}}>{k}</span>)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab==='meta'&&(
            <div style={{display:'grid',gap:'14px'}}>
              {(m.ads||[]).map((ad,i)=>(
                <div key={i} style={{background:'white',borderRadius:'14px',border:'1px solid #e5e9f0',padding:'20px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
                    <div style={{fontSize:'13px',fontWeight:'800',color:NAVY}}>Variante {ad.variant} — {ad.format}</div>
                    <span style={{fontSize:'11px',fontWeight:'700',color:'#1877F2',background:'#EFF6FF',padding:'2px 10px',borderRadius:'6px'}}>{ad.cta}</span>
                  </div>
                  {[{label:'Texto principal',value:ad.primary_text},{label:'Titular',value:ad.headline},{label:'Descripción',value:ad.description},{label:'Ángulo creativo',value:ad.angle}].map(f=>f.value&&(
                    <div key={f.label} style={{marginBottom:'10px'}}>
                      <div style={{fontSize:'10px',fontWeight:'700',color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'4px'}}>{f.label}</div>
                      <div style={{fontSize:'13px',color:'#374151',background:'#f8faff',padding:'10px 12px',borderRadius:'8px',lineHeight:'1.5'}}>{f.value}</div>
                    </div>
                  ))}
                </div>
              ))}
              {m.audience&&(
                <div style={{background:'white',borderRadius:'14px',border:'1px solid #e5e9f0',padding:'20px'}}>
                  <div style={{fontSize:'11px',fontWeight:'800',color:NAVY,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'14px'}}>Segmentación recomendada</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                    {[{label:'Edad',value:`${m.audience.age_min}-${m.audience.age_max} años`},{label:'Ubicaciones',value:(m.audience.locations||[]).join(', ')},{label:'Lookalike',value:m.audience.lookalike},{label:'Objetivo campaña',value:m.campaign_objective}].map(f=>f.value&&(
                      <div key={f.label} style={{padding:'10px 12px',background:'#f8faff',borderRadius:'8px'}}>
                        <div style={{fontSize:'10px',color:'#9ca3af',marginBottom:'3px'}}>{f.label}</div>
                        <div style={{fontSize:'12px',fontWeight:'600',color:NAVY}}>{f.value}</div>
                      </div>
                    ))}
                  </div>
                  {(m.audience.interests||[]).length>0&&(
                    <div style={{marginTop:'12px'}}>
                      <div style={{fontSize:'10px',fontWeight:'700',color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'8px'}}>Intereses</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:'5px'}}>{(m.audience.interests||[]).map((int,i)=><span key={i} style={{fontSize:'11px',padding:'3px 9px',borderRadius:'5px',background:'#eff6ff',color:'#1e3a8a'}}>{int}</span>)}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab==='tiktok'&&(
            <div style={{display:'grid',gap:'14px'}}>
              {(t.scripts||[]).map((s,i)=>(
                <div key={i} style={{background:'white',borderRadius:'14px',border:'1px solid #e5e9f0',padding:'20px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
                    <div style={{fontSize:'13px',fontWeight:'800',color:NAVY}}>Variante {s.variant} · {s.duration_secs}s · {s.format}</div>
                    <span style={{fontSize:'11px',color:'#9ca3af'}}>{s.music_vibe}</span>
                  </div>
                  {[{label:'🎯 Hook (primeros 3s)',value:s.hook,color:RED},{label:'📖 Cuerpo',value:s.body,color:NAVY},{label:'📢 CTA',value:s.cta,color:GREEN},{label:'🎬 Notas visuales',value:s.visual_notes,color:'#6b7280'}].map(f=>f.value&&(
                    <div key={f.label} style={{marginBottom:'12px'}}>
                      <div style={{fontSize:'10px',fontWeight:'700',color:f.color,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'5px'}}>{f.label}</div>
                      <div style={{fontSize:'13px',color:'#374151',background:'#f8faff',padding:'10px 12px',borderRadius:'8px',lineHeight:'1.6',borderLeft:`3px solid ${f.color}`}}>{f.value}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {activeTab==='imagenes'&&(
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:'14px'}}>
              {imgs.map((img,i)=>(
                <div key={i} style={{background:'white',borderRadius:'14px',border:'1px solid #e5e9f0',padding:'18px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                    <div style={{fontSize:'12px',fontWeight:'700',color:NAVY}}>{img.format}</div>
                    <span style={{fontSize:'10px',fontWeight:'600',color:'#6b7280',background:'#f1f5f9',padding:'2px 8px',borderRadius:'5px'}}>{img.platform}</span>
                  </div>
                  <div style={{fontSize:'12px',color:'#374151',lineHeight:'1.6',marginBottom:'10px',background:'#f8faff',padding:'10px',borderRadius:'8px'}}>{img.prompt}</div>
                  <div style={{fontSize:'10px',fontWeight:'700',color:'#9ca3af',textTransform:'uppercase',marginBottom:'4px'}}>Estilo</div>
                  <div style={{fontSize:'11px',color:'#374151'}}>{img.style}</div>
                  {img.negative_prompt&&<><div style={{fontSize:'10px',fontWeight:'700',color:RED,textTransform:'uppercase',marginTop:'8px',marginBottom:'4px'}}>Evitar</div><div style={{fontSize:'11px',color:'#374151'}}>{img.negative_prompt}</div></>}
                </div>
              ))}
              {imgs.length===0&&<div style={{gridColumn:'1/-1',textAlign:'center',padding:'40px',color:'#9ca3af',fontSize:'13px'}}>No hay prompts de imagen generados</div>}
            </div>
          )}

          {activeTab==='videos'&&(
            <div style={{display:'grid',gap:'14px'}}>
              {vids.map((vid,i)=>(
                <div key={i} style={{background:'white',borderRadius:'14px',border:'1px solid #e5e9f0',padding:'20px'}}>
                  <div style={{fontSize:'13px',fontWeight:'800',color:NAVY,marginBottom:'16px'}}>{vid.platform} · {vid.duration_secs}s · {vid.aspect_ratio}</div>
                  {(vid.scenes||[]).map((scene,si)=>(
                    <div key={si} style={{marginBottom:'12px',padding:'12px',background:'#f8faff',borderRadius:'10px',borderLeft:`3px solid ${scene.type==='hook'?RED:scene.type==='cta'?GREEN:NAVY}`}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
                        <span style={{fontSize:'10px',fontWeight:'800',color:scene.type==='hook'?RED:scene.type==='cta'?GREEN:NAVY,textTransform:'uppercase',letterSpacing:'0.06em'}}>{scene.type} · {scene.seconds}s</span>
                        <span style={{fontSize:'10px',color:'#9ca3af'}}>{scene.music}</span>
                      </div>
                      {[{label:'Narración',value:scene.narration},{label:'Visual',value:scene.visual},{label:'Texto en pantalla',value:scene.text_overlay}].map(f=>f.value&&(
                        <div key={f.label} style={{marginBottom:'6px'}}>
                          <span style={{fontSize:'10px',fontWeight:'700',color:'#9ca3af'}}>{f.label}: </span>
                          <span style={{fontSize:'12px',color:'#374151'}}>{f.value}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
              {vids.length===0&&<div style={{textAlign:'center',padding:'40px',color:'#9ca3af',fontSize:'13px'}}>No hay scripts de vídeo generados</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function MarketingPage() {
  const router = useRouter()
  const [token, setToken] = useState(null)
  const [user, setUser]   = useState(null)
  const [activeTab, setActiveTab] = useState('analisis')
  const [showWelcome, setShowWelcome] = useState(false)
  const [showNewCampaign, setShowNewCampaign] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState(null)

  // Análisis
  const [analysis, setAnalysis]     = useState(null)
  const [analyzing, setAnalyzing]   = useState(false)
  const [analysisError, setAnalysisError] = useState('')

  // Campañas
  const [campaigns, setCampaigns]   = useState([])
  const [campsLoading, setCampsLoading] = useState(false)

  // Plataformas
  const [platforms, setPlatforms]   = useState({google:null,meta:null})
  const [connectingG, setConnectingG] = useState(false)
  const [connectingM, setConnectingM] = useState(false)
  const [gForm, setGForm] = useState({customer_id:'',developer_token:'',refresh_token:'',client_id:'',client_secret:''})
  const [mForm, setMForm] = useState({account_id:'',access_token:'',app_id:'',pixel_id:''})
  const [connectResult, setConnectResult] = useState({google:null,meta:null})

  useEffect(()=>{
    const t = localStorage.getItem('nexum_token')
    if(!t){router.push('/login');return}
    setToken(t)
    try{const p=JSON.parse(atob(t.split('.')[1]));setUser({email:p.sub||'',name:p.name||p.sub||'Usuario'})}catch{setUser({email:'',name:'Usuario'})}
    // Show welcome popup on first visit
    const seen = localStorage.getItem('vortu_marketing_welcome')
    if(!seen){setShowWelcome(true);localStorage.setItem('vortu_marketing_welcome','1')}
    // Load existing analysis + platforms
    loadAnalysis(t)
    loadCampaigns(t)
    loadPlatforms(t)
  },[])

  async function loadAnalysis(t) {
    try{const res=await fetch(`${API}/api/marketing/analisis`,{headers:{Authorization:`Bearer ${t}`}});if(res.ok){const d=await res.json();setAnalysis(d.analisis)}}catch{}
  }
  async function loadCampaigns(t) {
    setCampsLoading(true)
    try{const res=await fetch(`${API}/api/marketing/campanas`,{headers:{Authorization:`Bearer ${t}`}});if(res.ok){const d=await res.json();setCampaigns(d.campaigns||[])}}catch{}finally{setCampsLoading(false)}
  }
  async function loadPlatforms(t) {
    try{const res=await fetch(`${API}/api/marketing/plataformas`,{headers:{Authorization:`Bearer ${t}`}});if(res.ok){const d=await res.json();setPlatforms(d)}}catch{}
  }
  async function runAnalysis() {
    setAnalyzing(true); setAnalysisError('')
    try{const res=await fetch(`${API}/api/marketing/analizar`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({document_ids:[]})});if(res.ok){const d=await res.json();setAnalysis(d)}else{const e=await res.json();setAnalysisError(e.detail||'Error al analizar')}}catch{setAnalysisError('Error de conexión')}finally{setAnalyzing(false)}
  }
  async function connectGoogle() {
    setConnectingG(true)
    try{const res=await fetch(`${API}/api/marketing/plataformas/google/conectar`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(gForm)});if(res.ok){const d=await res.json();setConnectResult(p=>({...p,google:d}));loadPlatforms(token)}}catch{}finally{setConnectingG(false)}
  }
  async function connectMeta() {
    setConnectingM(true)
    try{const res=await fetch(`${API}/api/marketing/plataformas/meta/conectar`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(mForm)});if(res.ok){const d=await res.json();setConnectResult(p=>({...p,meta:d}));loadPlatforms(token)}}catch{}finally{setConnectingM(false)}
  }

  function handleToggleStatus(id, newStatus) {
    setCampaigns(prev=>prev.map(c=>c.id===id?{...c,status:newStatus}:c))
  }

  const TABS = [
    {id:'analisis', label:'🔍 Análisis',    count:null},
    {id:'campanas', label:'🚀 Campañas',    count:campaigns.length||null},
    {id:'metricas', label:'📊 Métricas',    count:null},
    {id:'plataformas',label:'⚙️ Plataformas',count:null},
  ]

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#f4f6fb',fontFamily:"'DM Sans', system-ui, sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        *{box-sizing:border-box;} input:focus,select:focus,textarea:focus{outline:none;}
        ::-webkit-scrollbar{width:5px;} ::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:3px;}
      `}</style>

      <Sidebar active="/marketing"/>

      <div style={{flex:1,display:'flex',flexDirection:'column',minHeight:'100vh',overflow:'hidden'}}>

        {/* TOP BAR */}
        <div style={{background:'white',borderBottom:'1px solid #e5e9f0',padding:'0 32px',display:'flex',alignItems:'center',justifyContent:'space-between',height:'64px',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center'}}>
            <div style={{paddingRight:'24px',marginRight:'8px',borderRight:'1px solid #f0f2f7'}}>
              <div style={{fontSize:'16px',fontWeight:'800',color:NAVY,letterSpacing:'-0.4px'}}>📣 Marketing IA</div>
              <div style={{fontSize:'11px',color:'#9ca3af'}}>Campañas inteligentes · Google Ads · Meta Ads</div>
            </div>
            <div style={{display:'flex'}}>
              {TABS.map(tab=>(
                <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{padding:'0 14px',height:'64px',background:'none',border:'none',borderBottom:activeTab===tab.id?`2px solid ${NAVY}`:'2px solid transparent',color:activeTab===tab.id?NAVY:'#6b7280',fontWeight:activeTab===tab.id?'700':'400',fontSize:'13px',cursor:'pointer',fontFamily:"'DM Sans', system-ui",transition:'all 0.15s',display:'flex',alignItems:'center',gap:'6px'}}>
                  {tab.label}
                  {tab.count>0&&<span style={{fontSize:'10px',fontWeight:'700',background:activeTab===tab.id?NAVY:'#f0f2f7',color:activeTab===tab.id?'white':'#6b7280',padding:'1px 6px',borderRadius:'8px'}}>{tab.count}</span>}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <button onClick={()=>setShowWelcome(true)} style={{padding:'8px 14px',borderRadius:'9px',border:'1px solid #e5e9f0',background:'white',color:'#6b7280',fontSize:'12px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}}>? Guía</button>
            <SettingsButton/>
            <NotificationCenter token={token}/>
            <ProfileButton user={user}/>
            {activeTab==='campanas'&&<button onClick={()=>setShowNewCampaign(true)} style={{padding:'9px 18px',borderRadius:'9px',border:'none',background:NAVY,color:'white',fontWeight:'700',fontSize:'13px',cursor:'pointer',fontFamily:"'DM Sans', system-ui",marginLeft:'4px'}}>+ Nueva campaña</button>}
          </div>
        </div>

        {/* CONTENT */}
        <div style={{flex:1,overflowY:'auto',padding:'28px 32px'}}>

          {/* ── ANÁLISIS ── */}
          {activeTab==='analisis'&&(
            <div style={{maxWidth:'860px',animation:'fadeUp 0.3s ease'}}>
              {!analysis?(
                <div style={{background:'white',borderRadius:'18px',border:'1px solid #e5e9f0',padding:'80px',textAlign:'center'}}>
                  <div style={{width:'72px',height:'72px',borderRadius:'18px',background:`linear-gradient(135deg, ${CYAN}, ${BLUE})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'32px',margin:'0 auto 20px'}}>🔍</div>
                  <div style={{fontSize:'22px',fontWeight:'800',color:NAVY,letterSpacing:'-0.5px',marginBottom:'10px'}}>Analiza tu empresa</div>
                  <div style={{fontSize:'14px',color:'#6b7280',lineHeight:'1.7',maxWidth:'420px',margin:'0 auto 28px'}}>
                    Claude leerá tus datos de ventas, contabilidad, clientes y RR.HH. para entender tu negocio y generar una estrategia de marketing personalizada.
                  </div>
                  {analysisError&&<div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'10px',padding:'12px 16px',marginBottom:'20px',color:RED,fontSize:'13px'}}>{analysisError}</div>}
                  <button onClick={runAnalysis} disabled={analyzing} style={{padding:'14px 36px',borderRadius:'12px',border:'none',background:analyzing?'#e5e9f0':`linear-gradient(135deg, ${CYAN}, ${BLUE})`,color:analyzing?'#9ca3af':'white',fontWeight:'700',fontSize:'15px',cursor:analyzing?'not-allowed':'pointer',fontFamily:'inherit',display:'inline-flex',alignItems:'center',gap:'10px',boxShadow:analyzing?'none':'0 8px 24px rgba(0,180,216,0.3)'}}>
                    {analyzing?<><span style={{width:'18px',height:'18px',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',borderRadius:'50%',display:'inline-block',animation:'spin 0.7s linear infinite'}}/> Analizando tu empresa...</>:'🔍 Analizar mi empresa con IA'}
                  </button>
                </div>
              ):(
                <div style={{display:'grid',gap:'16px'}}>
                  {/* Hero */}
                  <div style={{background:NAVY,borderRadius:'16px',padding:'24px 28px',display:'flex',gap:'20px',alignItems:'flex-start'}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'11px',fontWeight:'700',color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'6px'}}>Análisis IA — {new Date(analysis.created_at).toLocaleDateString('es-ES',{day:'2-digit',month:'long',year:'numeric'})}</div>
                      <div style={{fontSize:'20px',fontWeight:'800',color:'white',letterSpacing:'-0.5px',marginBottom:'6px'}}>{analysis.sector}</div>
                      <div style={{fontSize:'13px',color:'rgba(255,255,255,0.5)',marginBottom:'12px'}}>{analysis.business_type}</div>
                      <p style={{margin:0,fontSize:'13.5px',color:'rgba(255,255,255,0.65)',lineHeight:'1.7'}}>{analysis.full_analysis?.substring(0,300)}...</p>
                    </div>
                    <div style={{flexShrink:0,textAlign:'center',background:'rgba(255,255,255,0.06)',borderRadius:'14px',padding:'16px 20px'}}>
                      <div style={{fontSize:'32px',fontWeight:'800',color:CYAN,letterSpacing:'-1px'}}>€{analysis.recommended_budget_monthly?.toLocaleString('es-ES')}</div>
                      <div style={{fontSize:'11px',color:'rgba(255,255,255,0.4)',marginTop:'4px'}}>Presupuesto mensual<br/>recomendado</div>
                    </div>
                  </div>

                  {/* KPI row */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px'}}>
                    {[
                      {label:'Tono de voz',value:analysis.tone_of_voice,icon:'🎙',color:BLUE},
                      {label:'Plataformas ideales',value:(analysis.best_platforms||[]).join(' · ').toUpperCase(),icon:'📱',color:CYAN},
                      {label:'Posicionamiento',value:analysis.competitive_position?.substring(0,60)+'...',icon:'🎯',color:GREEN},
                    ].map(k=>(
                      <div key={k.label} style={{background:'white',borderRadius:'12px',border:'1px solid #e5e9f0',padding:'16px'}}>
                        <div style={{fontSize:'16px',marginBottom:'6px'}}>{k.icon}</div>
                        <div style={{fontSize:'13px',fontWeight:'700',color:NAVY,marginBottom:'3px'}}>{k.value}</div>
                        <div style={{fontSize:'10px',color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.05em'}}>{k.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Audience + Opportunities */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
                    <div style={{background:'white',borderRadius:'14px',border:'1px solid #e5e9f0',padding:'20px'}}>
                      <div style={{fontSize:'11px',fontWeight:'800',color:NAVY,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'14px'}}>👥 Público objetivo</div>
                      {typeof analysis.target_audience==='object'&&[
                        {label:'Primario',value:analysis.target_audience?.primario},
                        {label:'Edad',value:analysis.target_audience?.edad_rango},
                        {label:'Comportamiento',value:analysis.target_audience?.comportamiento},
                      ].filter(f=>f.value).map(f=>(
                        <div key={f.label} style={{marginBottom:'10px'}}>
                          <div style={{fontSize:'10px',fontWeight:'700',color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'3px'}}>{f.label}</div>
                          <div style={{fontSize:'12px',color:'#374151',lineHeight:'1.5'}}>{f.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{background:'white',borderRadius:'14px',border:'1px solid #e5e9f0',padding:'20px'}}>
                      <div style={{fontSize:'11px',fontWeight:'800',color:NAVY,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'14px'}}>🚀 Oportunidades</div>
                      {(analysis.opportunities||[]).slice(0,3).map((o,i)=>{
                        const imp = o.impacto==='alto'?RED:o.impacto==='medio'?AMBER:GREEN
                        return(
                          <div key={i} style={{marginBottom:'10px',padding:'10px 12px',background:'#f8faff',borderRadius:'9px',borderLeft:`3px solid ${imp}`}}>
                            <div style={{fontSize:'12px',fontWeight:'700',color:NAVY,marginBottom:'2px'}}>{o.titulo}</div>
                            <div style={{fontSize:'11px',color:'#6b7280'}}>{o.plataforma?.toUpperCase()} · Impacto {o.impacto}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Key messages + Quick wins */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
                    <div style={{background:'white',borderRadius:'14px',border:'1px solid #e5e9f0',padding:'20px'}}>
                      <div style={{fontSize:'11px',fontWeight:'800',color:NAVY,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'12px'}}>💬 Mensajes clave</div>
                      {(analysis.key_messages||[]).map((m,i)=>(
                        <div key={i} style={{display:'flex',gap:'8px',marginBottom:'8px',padding:'8px 10px',background:'#f8faff',borderRadius:'8px'}}>
                          <span style={{color:CYAN,fontWeight:'800',flexShrink:0}}>{i+1}</span>
                          <span style={{fontSize:'12px',color:'#374151'}}>{m}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{background:'white',borderRadius:'14px',border:'1px solid #e5e9f0',padding:'20px'}}>
                      <div style={{fontSize:'11px',fontWeight:'800',color:NAVY,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'12px'}}>⚡ Quick wins</div>
                      {(analysis.quick_wins||[]).map((w,i)=>(
                        <div key={i} style={{marginBottom:'10px',padding:'10px 12px',background:'#f0fdf4',borderRadius:'9px'}}>
                          <div style={{fontSize:'12px',fontWeight:'700',color:NAVY,marginBottom:'2px'}}>{w.accion}</div>
                          <div style={{fontSize:'11px',color:'#6b7280'}}>{w.tiempo} · {w.impacto_estimado}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
                    <button onClick={runAnalysis} disabled={analyzing} style={{padding:'10px 20px',borderRadius:'9px',border:'1px solid #e5e9f0',background:'white',color:NAVY,fontSize:'13px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}}>🔄 Re-analizar</button>
                    <button onClick={()=>{setActiveTab('campanas');setShowNewCampaign(true)}} style={{padding:'10px 24px',borderRadius:'9px',border:'none',background:NAVY,color:'white',fontSize:'13px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit'}}>🚀 Crear campaña →</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── CAMPAÑAS ── */}
          {activeTab==='campanas'&&(
            <div style={{animation:'fadeUp 0.3s ease'}}>
              {campsLoading?(
                <div style={{textAlign:'center',padding:'80px',color:'#9ca3af'}}>
                  <div style={{fontSize:'36px',marginBottom:'12px',animation:'pulse 1.5s ease infinite'}}>🚀</div>
                  <div style={{fontSize:'14px'}}>Cargando campañas...</div>
                </div>
              ):campaigns.length===0?(
                <div style={{background:'white',borderRadius:'18px',border:'1px solid #e5e9f0',padding:'80px',textAlign:'center'}}>
                  <div style={{fontSize:'56px',marginBottom:'16px',opacity:0.2}}>📣</div>
                  <div style={{fontSize:'20px',fontWeight:'800',color:NAVY,letterSpacing:'-0.5px',marginBottom:'8px'}}>No hay campañas aún</div>
                  <div style={{fontSize:'14px',color:'#6b7280',marginBottom:'28px',maxWidth:'360px',margin:'0 auto 28px'}}>Crea tu primera campaña y Claude generará automáticamente todos los copies, keywords e imágenes</div>
                  <button onClick={()=>setShowNewCampaign(true)} style={{padding:'13px 32px',borderRadius:'12px',border:'none',background:NAVY,color:'white',fontWeight:'700',fontSize:'15px',cursor:'pointer',fontFamily:'inherit'}}>+ Crear primera campaña</button>
                </div>
              ):(
                <div>
                  {/* Stats */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'20px'}}>
                    {[
                      {label:'Total',value:campaigns.length,color:NAVY,bg:'white'},
                      {label:'Activas',value:campaigns.filter(c=>c.status==='active').length,color:GREEN,bg:'#f0fdf4'},
                      {label:'Borradores',value:campaigns.filter(c=>c.status==='draft').length,color:'#374151',bg:'#f1f5f9'},
                      {label:'Pausadas',value:campaigns.filter(c=>c.status==='paused').length,color:AMBER,bg:'#fffbeb'},
                    ].map(s=>(
                      <div key={s.label} style={{background:s.bg,borderRadius:'12px',border:'1px solid #e5e9f0',padding:'16px',textAlign:'center'}}>
                        <div style={{fontSize:'26px',fontWeight:'800',color:s.color,letterSpacing:'-0.5px'}}>{s.value}</div>
                        <div style={{fontSize:'11px',color:'#6b7280',marginTop:'3px'}}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:'14px'}}>
                    {campaigns.map((c,i)=>(
                      <div key={c.id} style={{animation:`fadeUp 0.25s ease ${i*0.05}s both`}}>
                        <CampaignCard campaign={c} token={token} onSelect={setSelectedCampaign} onToggleStatus={handleToggleStatus}/>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── MÉTRICAS ── */}
          {activeTab==='metricas'&&(
            <div style={{animation:'fadeUp 0.3s ease'}}>
              {campaigns.filter(c=>c.google_campaign_id||c.meta_campaign_id).length===0?(
                <div style={{background:'white',borderRadius:'18px',border:'1px solid #e5e9f0',padding:'80px',textAlign:'center'}}>
                  <div style={{fontSize:'56px',marginBottom:'16px',opacity:0.2}}>📊</div>
                  <div style={{fontSize:'20px',fontWeight:'800',color:NAVY,letterSpacing:'-0.5px',marginBottom:'8px'}}>Sin campañas publicadas</div>
                  <div style={{fontSize:'14px',color:'#6b7280',marginBottom:'28px',maxWidth:'380px',margin:'0 auto 28px'}}>Las métricas se mostrarán aquí cuando publiques una campaña en Google Ads o Meta Ads</div>
                  <button onClick={()=>setActiveTab('campanas')} style={{padding:'12px 28px',borderRadius:'10px',border:'none',background:NAVY,color:'white',fontWeight:'700',fontSize:'14px',cursor:'pointer',fontFamily:'inherit'}}>Ver campañas →</button>
                </div>
              ):(
                <div style={{display:'grid',gap:'16px'}}>
                  {campaigns.filter(c=>c.google_campaign_id||c.meta_campaign_id).map(c=>(
                    <MetricCard key={c.id} campaign={c} token={token}/>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PLATAFORMAS ── */}
          {activeTab==='plataformas'&&(
            <div style={{maxWidth:'720px',animation:'fadeUp 0.3s ease'}}>
              <div style={{display:'grid',gap:'20px'}}>
                {/* Google Ads */}
                <div style={{background:'white',borderRadius:'16px',border:'1px solid #e5e9f0',overflow:'hidden'}}>
                  <div style={{background:NAVY,padding:'18px 22px',display:'flex',alignItems:'center',gap:'12px'}}>
                    <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px'}}>🔵</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'15px',fontWeight:'800',color:'white'}}>Google Ads</div>
                      <div style={{fontSize:'11px',color:'rgba(255,255,255,0.4)'}}>API v17 · Search, Display, Performance Max</div>
                    </div>
                    <div style={{padding:'4px 12px',borderRadius:'20px',background:platforms.google?.connected?'rgba(34,197,94,0.15)':'rgba(255,255,255,0.08)',border:`1px solid ${platforms.google?.connected?'rgba(34,197,94,0.3)':'rgba(255,255,255,0.1)'}`,fontSize:'11px',fontWeight:'700',color:platforms.google?.connected?'#4ade80':'rgba(255,255,255,0.4)'}}>
                      {platforms.google?.connected?'✓ Conectado':'Sin conectar'}
                    </div>
                  </div>
                  <div style={{padding:'20px 22px'}}>
                    {platforms.google?.connected&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'10px',padding:'10px 14px',marginBottom:'16px',fontSize:'12px',color:GREEN,fontWeight:'600'}}>✓ Cuenta conectada · Customer ID: {platforms.google.customer_id}</div>}
                    {connectResult.google&&<div style={{background:connectResult.google.connected?'#f0fdf4':'#fef2f2',border:`1px solid ${connectResult.google.connected?'#bbf7d0':'#fecaca'}`,borderRadius:'10px',padding:'10px 14px',marginBottom:'16px',fontSize:'12px',color:connectResult.google.connected?GREEN:RED,fontWeight:'600'}}>{connectResult.google.message||connectResult.google.error}</div>}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'14px'}}>
                      {[{key:'customer_id',label:'Customer ID',ph:'123-456-7890'},{key:'developer_token',label:'Developer Token',ph:'AbCdEfGh...'},{key:'refresh_token',label:'Refresh Token',ph:'1//0fXXXXX...'},{key:'client_id',label:'Client ID',ph:'XXXXX.apps.googleusercontent.com'},{key:'client_secret',label:'Client Secret',ph:'GOCSPX-XXXXX'}].map(f=>(
                        <div key={f.key} style={{gridColumn:f.key==='refresh_token'||f.key==='client_id'?'1/-1':'auto'}}>
                          <label style={{fontSize:'11px',fontWeight:'700',color:'#374151',display:'block',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'0.04em'}}>{f.label}</label>
                          <input value={gForm[f.key]} onChange={e=>setGForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.ph} style={{width:'100%',padding:'9px 11px',borderRadius:'8px',border:'1.5px solid #e5e9f0',fontSize:'12px',fontFamily:'monospace',outline:'none'}} onFocus={e=>e.target.style.borderColor=NAVY} onBlur={e=>e.target.style.borderColor='#e5e9f0'}/>
                        </div>
                      ))}
                    </div>
                    <button onClick={connectGoogle} disabled={connectingG} style={{width:'100%',padding:'11px',borderRadius:'9px',border:'none',background:connectingG?'#e5e9f0':NAVY,color:connectingG?'#9ca3af':'white',fontWeight:'700',fontSize:'13px',cursor:connectingG?'not-allowed':'pointer',fontFamily:'inherit'}}>
                      {connectingG?'Verificando...':'🔗 Conectar Google Ads'}
                    </button>
                  </div>
                </div>

                {/* Meta Ads */}
                <div style={{background:'white',borderRadius:'16px',border:'1px solid #e5e9f0',overflow:'hidden'}}>
                  <div style={{background:'#1877F2',padding:'18px 22px',display:'flex',alignItems:'center',gap:'12px'}}>
                    <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px'}}>🔷</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'15px',fontWeight:'800',color:'white'}}>Meta Ads</div>
                      <div style={{fontSize:'11px',color:'rgba(255,255,255,0.5)'}}>Graph API v19 · Facebook + Instagram + Reels</div>
                    </div>
                    <div style={{padding:'4px 12px',borderRadius:'20px',background:platforms.meta?.connected?'rgba(34,197,94,0.15)':'rgba(255,255,255,0.1)',border:`1px solid ${platforms.meta?.connected?'rgba(34,197,94,0.3)':'rgba(255,255,255,0.2)'}`,fontSize:'11px',fontWeight:'700',color:platforms.meta?.connected?'#4ade80':'rgba(255,255,255,0.5)'}}>
                      {platforms.meta?.connected?'✓ Conectado':'Sin conectar'}
                    </div>
                  </div>
                  <div style={{padding:'20px 22px'}}>
                    {platforms.meta?.connected&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'10px',padding:'10px 14px',marginBottom:'16px',fontSize:'12px',color:GREEN,fontWeight:'600'}}>✓ Cuenta conectada · ID: {platforms.meta.account_id}</div>}
                    {connectResult.meta&&<div style={{background:connectResult.meta.connected?'#f0fdf4':'#fef2f2',border:`1px solid ${connectResult.meta.connected?'#bbf7d0':'#fecaca'}`,borderRadius:'10px',padding:'10px 14px',marginBottom:'16px',fontSize:'12px',color:connectResult.meta.connected?GREEN:RED,fontWeight:'600'}}>{connectResult.meta.message||connectResult.meta.error}</div>}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'14px'}}>
                      {[{key:'account_id',label:'Account ID',ph:'act_123456789'},{key:'access_token',label:'Access Token (System User)',ph:'EAAxxxxxxxx'},{key:'app_id',label:'App ID',ph:'1234567890'},{key:'pixel_id',label:'Pixel ID (opcional)',ph:'987654321'}].map(f=>(
                        <div key={f.key} style={{gridColumn:f.key==='access_token'?'1/-1':'auto'}}>
                          <label style={{fontSize:'11px',fontWeight:'700',color:'#374151',display:'block',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'0.04em'}}>{f.label}</label>
                          <input value={mForm[f.key]||''} onChange={e=>setMForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.ph} style={{width:'100%',padding:'9px 11px',borderRadius:'8px',border:'1.5px solid #e5e9f0',fontSize:'12px',fontFamily:'monospace',outline:'none'}} onFocus={e=>e.target.style.borderColor='#1877F2'} onBlur={e=>e.target.style.borderColor='#e5e9f0'}/>
                        </div>
                      ))}
                    </div>
                    <button onClick={connectMeta} disabled={connectingM} style={{width:'100%',padding:'11px',borderRadius:'9px',border:'none',background:connectingM?'#e5e9f0':'#1877F2',color:connectingM?'#9ca3af':'white',fontWeight:'700',fontSize:'13px',cursor:connectingM?'not-allowed':'pointer',fontFamily:'inherit'}}>
                      {connectingM?'Verificando...':'🔗 Conectar Meta Ads'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Popups */}
      {showWelcome&&<WelcomePopup onClose={()=>setShowWelcome(false)}/>}
      {showNewCampaign&&token&&<CreateCampaignModal token={token} analysisId={analysis?.id} onClose={()=>setShowNewCampaign(false)} onCreated={c=>{setCampaigns(p=>[c,...p]);setShowNewCampaign(false)}}/>}
      {selectedCampaign&&token&&<CampaignDetail campaign={selectedCampaign} token={token} onClose={()=>setSelectedCampaign(null)} onPublish={()=>loadCampaigns(token)}/>}
    </div>
  )
}

// ── Metric Card (inline to avoid file split) ───────────────────────────────────
function MetricCard({ campaign, token }) {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(false)
  useEffect(()=>{fetchMetrics()},[campaign.id])
  async function fetchMetrics() {
    setLoading(true)
    try{const res=await fetch(`${API}/api/marketing/campanas/${campaign.id}/metricas`,{headers:{Authorization:`Bearer ${token}`}});if(res.ok){const d=await res.json();setMetrics(d)}}catch{}finally{setLoading(false)}
  }
  if(loading) return <div style={{background:'white',borderRadius:'14px',border:'1px solid #e5e9f0',padding:'24px',textAlign:'center',color:'#9ca3af',fontSize:'13px'}}>Cargando métricas de {campaign.name}...</div>
  const s = metrics?.summary||{}
  return (
    <div style={{background:'white',borderRadius:'14px',border:'1px solid #e5e9f0',overflow:'hidden'}}>
      <div style={{background:NAVY,padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{fontSize:'14px',fontWeight:'700',color:'white'}}>{campaign.name}</div>
        <button onClick={fetchMetrics} style={{padding:'5px 12px',borderRadius:'7px',border:'none',background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.6)',fontSize:'11px',cursor:'pointer',fontFamily:'inherit'}}>🔄 Actualizar</button>
      </div>
      <div style={{padding:'18px 20px'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'10px'}}>
          {[
            {label:'Gasto total',value:`€${s.total_spend?.toFixed(2)||'0.00'}`,color:NAVY},
            {label:'Impresiones',value:(s.total_impressions||0).toLocaleString('es-ES'),color:BLUE},
            {label:'Clics',value:(s.total_clicks||0).toLocaleString('es-ES'),color:CYAN},
            {label:'CTR',value:`${s.avg_ctr||0}%`,color:GREEN},
            {label:'CPC',value:`€${s.avg_cpc?.toFixed(2)||'0.00'}`,color:AMBER},
            {label:'Conversiones',value:s.total_conversions||0,color:RED},
          ].map(m=>(
            <div key={m.label} style={{textAlign:'center',padding:'12px 6px',background:'#f8faff',borderRadius:'10px'}}>
              <div style={{fontSize:'18px',fontWeight:'800',color:m.color,letterSpacing:'-0.5px'}}>{m.value}</div>
              <div style={{fontSize:'10px',color:'#9ca3af',marginTop:'3px'}}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}