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

const MODULE_CONFIG = {
  finance:    { label: 'Finanzas',     color: '#1a6b4a', bg: '#e8f5ee', icon: '💰', desc: 'Estados financieros, facturas, banco'   },
  hr:         { label: 'RR.HH.',       color: '#1e3a8a', bg: '#e8eef8', icon: '👥', desc: 'Nóminas, empleados, feedback'            },
  accounting: { label: 'Contabilidad', color: '#6b1a6b', bg: '#f5e8f5', icon: '📒', desc: 'Asientos, cierre de caja, PGC'           },
  marketing:  { label: 'Marketing',    color: '#8a4a1e', bg: '#f5ede8', icon: '📣', desc: 'Campañas, análisis de mercado'           },
  general:    { label: 'General',      color: '#374151', bg: '#f1f5f9', icon: '📄', desc: 'Documentos generales'                    },
}
const STATUS_CONFIG = {
  complete:   { label: 'Completado', color: '#1a6b4a', bg: '#e8f5ee', dot: '#22c55e' },
  processing: { label: 'Procesando', color: '#92400e', bg: '#fef3c7', dot: '#f59e0b' },
  pending:    { label: 'Pendiente',  color: '#1e3a8a', bg: '#e8eef8', dot: '#3b82f6' },
  error:      { label: 'Error',      color: '#991b1b', bg: '#fee2e2', dot: '#ef4444' },
}

import Sidebar from '@/components/Sidebar'

// ── Notification Center ────────────────────────────────────────────────────────
function NotificationCenter({ token }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const ref = useRef()
  const router = useRouter()
  useEffect(() => { function h(e){if(ref.current&&!ref.current.contains(e.target))setOpen(false)}; document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h) }, [])
  useEffect(() => { if(token)load() }, [token])
  async function load() {
    const notifs=[]
    try {
      const [a,b,c]=await Promise.allSettled([
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
  const unread=notifications.length
  const TC={urgent:{color:RED,bg:'#fef2f2',dot:RED},warning:{color:AMBER,bg:'#fffbeb',dot:AMBER},info:{color:BLUE,bg:'#eff6ff',dot:BLUE}}
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
            {notifications.length===0?<div style={{padding:'40px',textAlign:'center'}}><div style={{fontSize:'28px',marginBottom:'10px',opacity:0.3}}>🔔</div><div style={{fontSize:'13px',color:'#6b7280',fontWeight:'500'}}>Todo en orden</div></div>
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

function ProfileButton({ user }) {
  const [open,setOpen]=useState(false)
  const ref=useRef()
  const router=useRouter()
  useEffect(()=>{function h(e){if(ref.current&&!ref.current.contains(e.target))setOpen(false)};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h)},[])
  const initials=user?.name?user.name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase():'US'
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
  const router=useRouter()
  return (
    <button onClick={()=>router.push('/settings')} style={{width:'38px',height:'38px',borderRadius:'10px',border:'1px solid #e5e9f0',background:'white',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.background='#f4f6fb'} onMouseLeave={e=>e.currentTarget.style.background='white'}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    </button>
  )
}

// ── Upload Zone ────────────────────────────────────────────────────────────────
function UploadZone({ onUpload, uploading }) {
  const [dragging, setDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedModule, setSelectedModule] = useState('finance')
  const fileRef = useRef()

  function handleDrop(e) { e.preventDefault(); setDragging(false); const f=e.dataTransfer.files[0]; if(f)setSelectedFile(f) }
  function getFileIcon(name) { if(!name)return'📄'; const ext=name.split('.').pop().toLowerCase(); if(ext==='pdf')return'📕'; if(['csv','xlsx','xls'].includes(ext))return'📊'; return'📄' }
  function formatSize(bytes) { if(bytes<1024)return bytes+' B'; if(bytes<1048576)return(bytes/1024).toFixed(1)+' KB'; return(bytes/1048576).toFixed(1)+' MB' }

  return (
    <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e5e9f0', overflow: 'hidden' }}>
      <div style={{ background: NAVY, padding: '16px 20px' }}>
        <div style={{ fontSize: '14px', fontWeight: '800', color: 'white', letterSpacing: '-0.3px' }}>📤 Subir documento</div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '3px' }}>Claude analiza cualquier archivo automáticamente</div>
      </div>
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '10px' }}>Módulo destino</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '6px' }}>
            {Object.entries(MODULE_CONFIG).map(([key,cfg]) => (
              <button key={key} onClick={()=>setSelectedModule(key)} style={{ padding: '9px 4px', borderRadius: '9px', border: '1.5px solid', borderColor: selectedModule===key?NAVY:'#e5e9f0', background: selectedModule===key?NAVY:'white', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center' }}>
                <div style={{ fontSize: '16px', marginBottom: '3px' }}>{cfg.icon}</div>
                <div style={{ fontSize: '10px', fontWeight: '700', color: selectedModule===key?'white':'#374151' }}>{cfg.label}</div>
              </button>
            ))}
          </div>
          <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#9ca3af' }}>{MODULE_CONFIG[selectedModule].desc}</p>
        </div>
        <div onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={handleDrop} onClick={()=>!selectedFile&&fileRef.current.click()}
          style={{ border: `2px dashed ${dragging?NAVY:selectedFile?GREEN:'#d1d5db'}`, borderRadius: '12px', padding: '28px', textAlign: 'center', background: dragging?'#f8f9ff':selectedFile?'#f0fdf4':'#fafafa', cursor: selectedFile?'default':'pointer', transition: 'all 0.2s', marginBottom: '14px' }}>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.pdf" onChange={e=>{if(e.target.files[0])setSelectedFile(e.target.files[0])}} style={{ display: 'none' }} />
          {selectedFile ? (
            <div>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{getFileIcon(selectedFile.name)}</div>
              <div style={{ fontWeight: '700', color: NAVY, fontSize: '13px', marginBottom: '3px' }}>{selectedFile.name}</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '10px' }}>{formatSize(selectedFile.size)}</div>
              <button onClick={e=>{e.stopPropagation();setSelectedFile(null)}} style={{ fontSize: '11px', color: '#6b7280', background: 'none', border: '1px solid #e5e9f0', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}>Cambiar archivo</button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '32px', marginBottom: '10px', opacity: 0.35 }}>📂</div>
              <div style={{ fontWeight: '600', color: '#374151', fontSize: '13px', marginBottom: '4px' }}>Arrastra tu archivo aquí</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>o haz clic para seleccionar</div>
              <div style={{ marginTop: '10px', display: 'flex', gap: '5px', justifyContent: 'center' }}>
                {['CSV','Excel','PDF'].map(t=><span key={t} style={{ fontSize: '10px', background: '#f1f5f9', color: '#475569', padding: '2px 7px', borderRadius: '4px', fontWeight: '600' }}>{t}</span>)}
              </div>
            </div>
          )}
        </div>
        <button onClick={()=>selectedFile&&onUpload(selectedFile,selectedModule)} disabled={!selectedFile||uploading}
          style={{ width: '100%', padding: '12px', borderRadius: '10px', background: selectedFile&&!uploading?NAVY:'#e5e9f0', color: selectedFile&&!uploading?'white':'#9ca3af', border: 'none', fontWeight: '700', fontSize: '13px', cursor: selectedFile&&!uploading?'pointer':'not-allowed', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: "'DM Sans', system-ui" }}>
          {uploading ? (<><span style={{ width:'14px',height:'14px',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',borderRadius:'50%',display:'inline-block',animation:'spin 0.8s linear infinite'}}/>Procesando con IA...</>) : <>📤 Analizar con Claude</>}
        </button>
      </div>
    </div>
  )
}

// ── Document Card ──────────────────────────────────────────────────────────────
function DocumentCard({ doc, onViewResult }) {
  const mod = MODULE_CONFIG[doc.module] || MODULE_CONFIG.general
  const status = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending
  function getFileIcon(name) { if(!name)return'📄'; const ext=name.split('.').pop().toLowerCase(); if(ext==='pdf')return'📕'; if(['csv','xlsx','xls'].includes(ext))return'📊'; return'📄' }
  function formatDate(str) { if(!str)return'—'; const d=new Date(str); return d.toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) }
  return (
    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e9f0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', transition: 'all 0.15s' }}
      onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.06)'} onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
      <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: mod.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{getFileIcon(doc.filename)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: '600', color: NAVY, fontSize: '13px', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.filename}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: mod.color, background: mod.bg, padding: '2px 8px', borderRadius: '5px' }}>{mod.icon} {mod.label}</span>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>{formatDate(doc.created_at)}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: status.dot, display: 'inline-block' }} />
        <span style={{ fontSize: '12px', fontWeight: '600', color: status.color }}>{status.label}</span>
      </div>
      {doc.status==='complete'&&doc.ai_result&&(
        <button onClick={()=>onViewResult(doc)} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #e5e9f0', background: 'white', color: NAVY, fontSize: '12px', fontWeight: '600', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}
          onMouseEnter={e=>{e.currentTarget.style.background=NAVY;e.currentTarget.style.color='white'}} onMouseLeave={e=>{e.currentTarget.style.background='white';e.currentTarget.style.color=NAVY}}>
          Ver análisis →
        </button>
      )}
      {doc.status==='processing'&&<div style={{ fontSize: '12px', color: AMBER, fontStyle: 'italic', flexShrink: 0 }}>En proceso...</div>}
    </div>
  )
}

// ── Result Modal ───────────────────────────────────────────────────────────────
function ResultModal({ doc, onClose }) {
  if (!doc) return null
  let result = {}
  try { result = JSON.parse(doc.ai_result) } catch {}
  const mod = MODULE_CONFIG[doc.module] || MODULE_CONFIG.general
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '18px', width: '100%', maxWidth: '680px', maxHeight: '82vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.2)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ background: NAVY, padding: '18px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{mod.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '800', color: 'white', fontSize: '15px', letterSpacing: '-0.3px' }}>{doc.filename}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Análisis IA — {mod.label}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {result.summary && (
            <div style={{ background: '#f8faff', borderRadius: '12px', padding: '16px', marginBottom: '16px', borderLeft: `4px solid ${NAVY}` }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: NAVY, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>📋 Resumen ejecutivo</div>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#374151', lineHeight: '1.65' }}>{result.summary}</p>
            </div>
          )}
          {result.health_score && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px', padding: '16px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '36px', fontWeight: '800', color: GREEN, letterSpacing: '-1px' }}>{result.health_score}</div>
              <div><div style={{ fontWeight: '700', color: '#15803d', fontSize: '14px' }}>Puntuación de salud financiera</div><div style={{ fontSize: '12px', color: '#4ade80' }}>Sobre 10 — calculado por Claude</div></div>
            </div>
          )}
          {(result.net_profit||result.total_revenue||result.total_expenses) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '16px' }}>
              {[{label:'Ingresos totales',value:result.total_revenue,color:'#1a6b4a'},{label:'Gastos totales',value:result.total_expenses,color:'#991b1b'},{label:'Utilidad neta',value:result.net_profit,color:result.net_profit>=0?'#1a6b4a':'#991b1b'}].filter(m=>m.value!==undefined).map(m=>(
                <div key={m.label} style={{ background: '#fafafa', borderRadius: '10px', padding: '14px', border: '1px solid #f0f2f7' }}>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>{m.label}</div>
                  <div style={{ fontWeight: '800', color: m.color, fontSize: '18px', letterSpacing: '-0.4px' }}>€{Number(m.value||0).toLocaleString('es-ES',{minimumFractionDigits:2})}</div>
                </div>
              ))}
            </div>
          )}
          {result.recommendations?.length>0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>💡 Recomendaciones IA</div>
              {result.recommendations.map((rec,i)=>(
                <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px', padding: '10px 12px', background: '#f8faff', borderRadius: '9px', borderLeft: `3px solid ${NAVY}` }}>
                  <span style={{ color: NAVY, fontWeight: '800', flexShrink: 0 }}>{i+1}</span>
                  <span style={{ fontSize: '13px', color: '#374151' }}>{rec}</span>
                </div>
              ))}
            </div>
          )}
          {result.raw_analysis&&!result.summary && (
            <div style={{ background: '#fafafa', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Análisis completo</div>
              <p style={{ margin: 0, fontSize: '13px', color: '#374151', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{result.raw_analysis}</p>
            </div>
          )}
          {!result.summary&&!result.raw_analysis && (
            <div style={{ background: '#f8faff', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Datos del análisis</div>
              <pre style={{ margin: 0, fontSize: '12px', color: '#374151', overflowX: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{JSON.stringify(result,null,2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function DocumentosPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [filter, setFilter] = useState('all')
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const t = localStorage.getItem('nexum_token')
    if (!t) { router.push('/login'); return }
    setToken(t)
    try { const p=JSON.parse(atob(t.split('.')[1])); setUser({email:p.sub||'',name:p.name||p.sub||'Usuario'}) } catch { setUser({email:'',name:'Usuario'}) }
  }, [])

  async function fetchDocuments() {
    const t = localStorage.getItem('nexum_token')
    if (!t) { router.push('/login'); return }
    try {
      const res = await fetch(`${API}/api/upload/documents`,{headers:{Authorization:`Bearer ${t}`}})
      if(res.status===401){router.push('/login');return}
      if(res.ok){const data=await res.json();setDocuments(data.documents||data||[])}
    } catch { setError('No se pudo conectar con el servidor') } finally { setLoading(false) }
  }

  useEffect(() => { fetchDocuments(); const iv=setInterval(fetchDocuments,8000); return()=>clearInterval(iv) }, [])

  async function handleUpload(file, module) {
    const t = localStorage.getItem('nexum_token')
    if (!t) return
    setUploading(true); setError('')
    try {
      const form = new FormData()
      form.append('file',file); form.append('module',module)
      const res = await fetch(`${API}/api/upload/`,{method:'POST',headers:{Authorization:`Bearer ${t}`},body:form})
      if(res.ok){setUploadSuccess(true);setTimeout(()=>setUploadSuccess(false),3000);fetchDocuments()}
      else{const err=await res.json();setError(err.detail||'Error al subir el archivo')}
    } catch { setError('Error de conexión con el servidor') } finally { setUploading(false) }
  }

  const modules = ['all',...Object.keys(MODULE_CONFIG)]
  const filtered = filter==='all' ? documents : documents.filter(d=>d.module===filter)
  const stats = {
    total:      documents.length,
    complete:   documents.filter(d=>d.status==='complete').length,
    processing: documents.filter(d=>d.status==='processing'||d.status==='pending').length,
    error:      documents.filter(d=>d.status==='error').length,
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#f4f6fb', fontFamily:"'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
        *{box-sizing:border-box;}
        input:focus,select:focus{border-color:#0B1426!important;outline:none;}
        ::-webkit-scrollbar{width:5px;} ::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:3px;}
      `}</style>

      <Sidebar active="/documentos"/>

      <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:'100vh', overflow:'hidden' }}>

        {/* TOP BAR */}
        <div style={{ background:'white', borderBottom:'1px solid #e5e9f0', padding:'0 32px', display:'flex', alignItems:'center', justifyContent:'space-between', height:'64px', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', flex:1 }}>
            <div style={{ paddingRight:'24px', marginRight:'8px', borderRight:'1px solid #f0f2f7' }}>
              <div style={{ fontSize:'16px', fontWeight:'800', color:NAVY, letterSpacing:'-0.4px' }}>📁 Documentos</div>
              <div style={{ fontSize:'11px', color:'#9ca3af' }}>Sube cualquier archivo · Claude lo analiza automáticamente</div>
            </div>
            <div style={{ display:'flex', overflowX:'auto' }}>
              {modules.map(m => {
                const cfg = m==='all' ? {label:'Todos',icon:'📋'} : MODULE_CONFIG[m]
                const isActive = filter===m
                const count = m==='all' ? documents.length : documents.filter(d=>d.module===m).length
                return (
                  <button key={m} onClick={()=>setFilter(m)} style={{ padding:'0 14px', height:'64px', background:'none', border:'none', borderBottom:isActive?`2px solid ${NAVY}`:'2px solid transparent', color:isActive?NAVY:'#6b7280', fontWeight:isActive?'700':'400', fontSize:'13px', cursor:'pointer', fontFamily:"'DM Sans', system-ui", transition:'all 0.15s', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:'5px' }}>
                    <span>{cfg.icon}</span>{cfg.label}
                    {count>0&&<span style={{ background:isActive?NAVY:'#f1f5f9', color:isActive?'white':'#6b7280', borderRadius:'10px', padding:'1px 7px', fontSize:'11px', fontWeight:'700' }}>{count}</span>}
                  </button>
                )
              })}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <SettingsButton/>
            <NotificationCenter token={token}/>
            <ProfileButton user={user}/>
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ flex:1, overflowY:'auto', padding:'28px 32px' }}>

          {uploadSuccess && (
            <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'10px', padding:'12px 16px', marginBottom:'20px', color:GREEN, fontWeight:'600', fontSize:'13px', animation:'fadeUp 0.3s ease', display:'flex', alignItems:'center', gap:'8px' }}>
              ✓ Archivo subido correctamente — Claude está analizando...
            </div>
          )}
          {error && (
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'10px', padding:'12px 16px', marginBottom:'20px', color:RED, fontSize:'13px', animation:'fadeUp 0.3s ease', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span>⚠ {error}</span><button onClick={()=>setError('')} style={{ background:'none', border:'none', color:RED, cursor:'pointer', fontSize:'18px' }}>×</button>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:'24px', alignItems:'start' }}>
            <div>
              {/* Stats */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'20px' }}>
                {[
                  {label:'Total',      value:stats.total,      color:NAVY,  bg:'white'  },
                  {label:'Completados',value:stats.complete,   color:GREEN, bg:'#f0fdf4'},
                  {label:'Procesando', value:stats.processing, color:AMBER, bg:'#fffbeb'},
                  {label:'Con error',  value:stats.error,      color:RED,   bg:'#fef2f2'},
                ].map(s=>(
                  <div key={s.label} style={{ background:s.bg, borderRadius:'12px', padding:'16px', border:'1px solid #e5e9f0', textAlign:'center' }}>
                    <div style={{ fontSize:'26px', fontWeight:'800', color:s.color, letterSpacing:'-0.5px' }}>{s.value}</div>
                    <div style={{ fontSize:'11px', color:'#6b7280', marginTop:'3px' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Document list */}
              {loading ? (
                <div style={{ textAlign:'center', padding:'60px', color:'#9ca3af' }}>
                  <div style={{ fontSize:'32px', marginBottom:'12px', opacity:0.4 }}>📂</div>
                  <div style={{ fontSize:'14px' }}>Cargando documentos...</div>
                </div>
              ) : filtered.length===0 ? (
                <div style={{ background:'white', borderRadius:'16px', border:'1px solid #e5e9f0', padding:'70px', textAlign:'center' }}>
                  <div style={{ fontSize:'52px', marginBottom:'16px', opacity:0.2 }}>📭</div>
                  <div style={{ fontWeight:'800', color:NAVY, fontSize:'18px', marginBottom:'8px', letterSpacing:'-0.4px' }}>
                    {filter==='all' ? 'Aún no hay documentos' : `No hay documentos en ${MODULE_CONFIG[filter]?.label}`}
                  </div>
                  <div style={{ fontSize:'13px', color:'#9ca3af' }}>Sube tu primer archivo para que Claude lo analice</div>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {filtered.map((doc,i)=>(
                    <div key={doc.id} style={{ animation:`slideIn 0.2s ease ${i*0.04}s both` }}>
                      <DocumentCard doc={doc} onViewResult={setSelectedDoc}/>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upload zone + tips */}
            <div style={{ position:'sticky', top:'28px' }}>
              <UploadZone onUpload={handleUpload} uploading={uploading}/>
              <div style={{ background:'white', borderRadius:'14px', border:'1px solid #e5e9f0', padding:'18px 20px', marginTop:'14px' }}>
                <div style={{ fontSize:'11px', fontWeight:'700', color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'14px' }}>Qué puedes subir</div>
                {[
                  {icon:'📊',title:'Extractos bancarios CSV', desc:'Claude genera P&L y flujo de caja automáticamente'},
                  {icon:'📕',title:'Facturas PDF',            desc:'Extrae proveedor, importe, IVA e imputa al módulo'},
                  {icon:'📋',title:'Nóminas Excel',           desc:'Calcula IRPF, SS y genera recibos de sueldo'     },
                  {icon:'📝',title:'Cierre de caja',          desc:'Sube la plantilla Vortu y Claude la procesa'     },
                ].map(tip=>(
                  <div key={tip.title} style={{ display:'flex', gap:'10px', marginBottom:'12px' }}>
                    <span style={{ fontSize:'18px', flexShrink:0 }}>{tip.icon}</span>
                    <div><div style={{ fontSize:'12px', fontWeight:'700', color:NAVY }}>{tip.title}</div><div style={{ fontSize:'11px', color:'#9ca3af', marginTop:'2px' }}>{tip.desc}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedDoc && <ResultModal doc={selectedDoc} onClose={()=>setSelectedDoc(null)}/>}
    </div>
  )
}