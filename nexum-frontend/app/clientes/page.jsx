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

const SENTIMENT_CFG = {
  positive:  { label: 'Positivo',  color: GREEN,     bg: '#f0fdf4', icon: '😊' },
  neutral:   { label: 'Neutral',   color: '#6b7280', bg: '#f8f9fc', icon: '😐' },
  negative:  { label: 'Negativo',  color: RED,       bg: '#fef2f2', icon: '😞' },
  urgent:    { label: 'Urgente',   color: '#7c2d12', bg: '#fff7ed', icon: '🚨' },
}
const INTENT_CFG = {
  question:   { label: 'Pregunta',  color: BLUE,      bg: '#eff6ff' },
  complaint:  { label: 'Queja',     color: RED,       bg: '#fef2f2' },
  purchase:   { label: 'Compra',    color: GREEN,     bg: '#f0fdf4' },
  compliment: { label: 'Elogio',    color: '#7c3aed', bg: '#f5f3ff' },
  other:      { label: 'Otro',      color: '#6b7280', bg: '#f8f9fc' },
}
const RISK_CFG = {
  bajo:    { label: 'Bajo',     color: GREEN,     bg: '#f0fdf4' },
  medio:   { label: 'Medio',   color: AMBER,     bg: '#fffbeb' },
  alto:    { label: 'Alto',    color: RED,       bg: '#fef2f2' },
  critico: { label: 'Crítico', color: '#7c2d12', bg: '#fff7ed' },
}

import Sidebar from '@/components/Sidebar'

function NotificationCenter({ token }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const ref = useRef()
  const router = useRouter()
  useEffect(() => { function h(e){if(ref.current&&!ref.current.contains(e.target))setOpen(false)}; document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h) }, [])
  useEffect(() => { if(token)load() }, [token])
  async function load() {
    const notifs = []
    try {
      const [a,b,c] = await Promise.allSettled([
        fetch(`${API}/api/clientes/inbox`,{headers:{Authorization:`Bearer ${token}`}}),
        fetch(`${API}/api/proyectos/resumen`,{headers:{Authorization:`Bearer ${token}`}}),
        fetch(`${API}/api/ventas/alertas/stock`,{headers:{Authorization:`Bearer ${token}`}}),
      ])
      if(a.status==='fulfilled'&&a.value.ok){const d=await a.value.json();if(d.requires_human>0)notifs.push({id:'m1',type:'urgent',icon:'💬',title:`${d.requires_human} mensaje${d.requires_human>1?'s':''} requiere atención`,desc:'Un cliente necesita respuesta humana',href:'/clientes',time:'Ahora'});if(d.pending>0)notifs.push({id:'m2',type:'info',icon:'📬',title:`${d.pending} pendiente${d.pending>1?'s':''}`,desc:'Revisa la bandeja de entrada',href:'/clientes',time:'Hoy'})}
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
  const [open, setOpen] = useState(false)
  const ref = useRef()
  const router = useRouter()
  useEffect(() => { function h(e){if(ref.current&&!ref.current.contains(e.target))setOpen(false)}; document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h) }, [])
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

function SentimentDonut({ score, size = 80 }) {
  const pct=Math.min((score||5)/10,1),r=size/2-8,cx=size/2,cy=size/2,circ=2*Math.PI*r
  const color=score>=7?GREEN:score>=5?AMBER:score>=3?RED:'#7c2d12'
  return (
    <svg width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f2f7" strokeWidth="8"/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8" strokeDasharray={circ} strokeDashoffset={circ*(1-pct)} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} style={{transition:'stroke-dashoffset 0.8s ease'}}/>
      <text x={cx} y={cy+1} textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="800" fill={color}>{(score||5).toFixed(1)}</text>
    </svg>
  )
}

function MessageCard({ msg, selected, onClick }) {
  const sent=SENTIMENT_CFG[msg.ai_sentiment]||SENTIMENT_CFG.neutral, contact=msg.contact
  return (
    <div onClick={onClick} style={{padding:'14px 16px',borderBottom:'1px solid #f0f2f7',cursor:'pointer',background:selected?'#f0f7ff':msg.requires_human?'#fff7ed':'white',borderLeft:`3px solid ${msg.requires_human?AMBER:msg.ai_sentiment==='urgent'?RED:msg.ai_sentiment==='negative'?'#fca5a5':'#e5e9f0'}`,transition:'background 0.15s'}} onMouseEnter={e=>{if(!selected)e.currentTarget.style.background='#fafafa'}} onMouseLeave={e=>{if(!selected)e.currentTarget.style.background=msg.requires_human?'#fff7ed':'white'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'4px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <div style={{width:'30px',height:'30px',borderRadius:'50%',background:NAVY,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'12px',fontWeight:'700',flexShrink:0}}>{contact?.name?.charAt(0)||'?'}</div>
          <div><div style={{fontSize:'13px',fontWeight:'700',color:NAVY}}>{contact?.name||'Desconocido'}</div><div style={{fontSize:'11px',color:'#9ca3af'}}>{msg.platform} · {msg.created_at?.split('T')[0]}</div></div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
          <span style={{fontSize:'14px'}}>{sent.icon}</span>
          {msg.requires_human&&<span style={{fontSize:'10px',fontWeight:'700',color:AMBER,background:'#fffbeb',padding:'2px 6px',borderRadius:'4px'}}>HUMANO</span>}
          {msg.status==='draft_ready'&&<span style={{width:'8px',height:'8px',borderRadius:'50%',background:BLUE,display:'inline-block'}}/>}
        </div>
      </div>
      <div style={{fontSize:'12px',color:'#6b7280',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',paddingLeft:'38px'}}>{msg.content?.substring(0,80)}...</div>
    </div>
  )
}

function MessageDetail({ msg, token, onUpdate }) {
  const [draft,setDraft]=useState(msg.ai_draft||'')
  const [editing,setEditing]=useState(false)
  const [loading,setLoading]=useState(false)
  useEffect(()=>{setDraft(msg.ai_draft||'');setEditing(false)},[msg.id])
  const sent=SENTIMENT_CFG[msg.ai_sentiment]||SENTIMENT_CFG.neutral
  const intent=INTENT_CFG[msg.ai_intent]||INTENT_CFG.other
  const contact=msg.contact
  async function approve(){setLoading(true);try{await fetch(`${API}/api/clientes/mensaje/${msg.id}/aprobar`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({send_via_email:!!contact?.email})});onUpdate()}catch{}finally{setLoading(false)}}
  async function editAndSend(){setLoading(true);try{await fetch(`${API}/api/clientes/mensaje/${msg.id}/editar`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({draft})});onUpdate()}catch{}finally{setLoading(false)}}
  async function reject(){setLoading(true);try{await fetch(`${API}/api/clientes/mensaje/${msg.id}/rechazar`,{method:'POST',headers:{Authorization:`Bearer ${token}`}});onUpdate()}catch{}finally{setLoading(false)}}
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflowY:'auto'}}>
      <div style={{padding:'16px 20px',borderBottom:'1px solid #f0f2f7',display:'flex',alignItems:'center',gap:'12px',background:'white'}}>
        <div style={{width:'40px',height:'40px',borderRadius:'50%',background:NAVY,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'16px',fontWeight:'700',flexShrink:0}}>{contact?.name?.charAt(0)||'?'}</div>
        <div style={{flex:1}}><div style={{fontSize:'14px',fontWeight:'700',color:NAVY}}>{contact?.name||'Desconocido'}</div><div style={{fontSize:'12px',color:'#6b7280'}}>{contact?.email||contact?.phone||msg.platform}</div></div>
        {contact&&<SentimentDonut score={contact.sentiment_score||5} size={48}/>}
      </div>
      <div style={{padding:'12px 20px',borderBottom:'1px solid #f0f2f7',display:'flex',gap:'8px',flexWrap:'wrap',background:'white'}}>
        <span style={{fontSize:'11px',fontWeight:'700',color:sent.color,background:sent.bg,padding:'3px 10px',borderRadius:'6px'}}>{sent.icon} {sent.label}</span>
        <span style={{fontSize:'11px',fontWeight:'700',color:intent.color,background:intent.bg,padding:'3px 10px',borderRadius:'6px'}}>{intent.label}</span>
        {msg.urgency_score>5&&<span style={{fontSize:'11px',fontWeight:'700',color:RED,background:'#fef2f2',padding:'3px 10px',borderRadius:'6px'}}>⚡ Urgencia {msg.urgency_score}/10</span>}
        {msg.ai_topics?.map((t,i)=><span key={i} style={{fontSize:'11px',color:'#6b7280',background:'#f1f5f9',padding:'3px 8px',borderRadius:'6px'}}>{t}</span>)}
      </div>
      <div style={{padding:'16px 20px',borderBottom:'1px solid #f0f2f7',background:'#fafafa'}}>
        <div style={{fontSize:'11px',fontWeight:'700',color:'#374151',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'8px'}}>Mensaje del cliente</div>
        <div style={{fontSize:'13.5px',color:'#374151',lineHeight:'1.65',background:'white',borderRadius:'10px',padding:'14px',border:'1px solid #f0f2f7',borderLeft:'3px solid #e5e9f0'}}>{msg.content}</div>
      </div>
      <div style={{padding:'16px 20px',flex:1,background:'white'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
          <div style={{fontSize:'11px',fontWeight:'700',color:'#374151',textTransform:'uppercase',letterSpacing:'0.05em'}}>Respuesta sugerida por Claude</div>
          {!editing&&msg.status==='draft_ready'&&<button onClick={()=>setEditing(true)} style={{fontSize:'11px',color:BLUE,background:'none',border:'none',cursor:'pointer',fontWeight:'600'}}>✏️ Editar</button>}
        </div>
        {msg.status==='sent'||msg.status==='auto_sent'?(
          <div style={{fontSize:'13.5px',color:'#374151',lineHeight:'1.65',background:'#f0fdf4',borderRadius:'10px',padding:'14px',borderLeft:`3px solid ${GREEN}`}}>{draft}<div style={{marginTop:'8px',fontSize:'11px',color:GREEN,fontWeight:'600'}}>✓ Enviado</div></div>
        ):editing?(
          <textarea value={draft} onChange={e=>setDraft(e.target.value)} style={{width:'100%',minHeight:'140px',padding:'12px',borderRadius:'10px',border:'1.5px solid #e5e9f0',fontSize:'13.5px',color:'#374151',lineHeight:'1.65',fontFamily:"'DM Sans', system-ui, sans-serif",resize:'vertical',outline:'none'}} onFocus={e=>e.target.style.borderColor=NAVY} onBlur={e=>e.target.style.borderColor='#e5e9f0'}/>
        ):(
          <div style={{fontSize:'13.5px',color:'#374151',lineHeight:'1.65',background:'#f8faff',borderRadius:'10px',padding:'14px',borderLeft:`3px solid ${NAVY}`}}>{draft||'Sin borrador generado'}</div>
        )}
        {msg.requires_human&&<div style={{marginTop:'10px',padding:'10px 14px',background:'#fffbeb',borderRadius:'8px',border:'1px solid #fde68a',fontSize:'12px',color:'#92400e',fontWeight:'500'}}>⚠ Claude recomienda revisión humana antes de enviar</div>}
      </div>
      {(msg.status==='draft_ready'||msg.status==='pending'||msg.status==='rejected')&&(
        <div style={{padding:'16px 20px',borderTop:'1px solid #f0f2f7',display:'flex',gap:'8px',background:'white'}}>
          {editing?(
            <>
              <button onClick={editAndSend} disabled={loading} style={{flex:1,padding:'11px',borderRadius:'9px',border:'none',background:NAVY,color:'white',fontWeight:'700',fontSize:'13px',cursor:'pointer',fontFamily:"'DM Sans', system-ui"}}>{loading?'Enviando...':'✓ Guardar y enviar'}</button>
              <button onClick={()=>setEditing(false)} style={{padding:'11px 16px',borderRadius:'9px',border:'1px solid #e5e9f0',background:'white',color:'#374151',fontSize:'13px',cursor:'pointer',fontFamily:"'DM Sans', system-ui"}}>Cancelar</button>
            </>
          ):(
            <>
              <button onClick={approve} disabled={loading} style={{flex:1,padding:'11px',borderRadius:'9px',border:'none',background:GREEN,color:'white',fontWeight:'700',fontSize:'13px',cursor:'pointer',fontFamily:"'DM Sans', system-ui"}}>{loading?'...':'✓ Aprobar y enviar'}</button>
              <button onClick={()=>setEditing(true)} style={{flex:1,padding:'11px',borderRadius:'9px',border:'1px solid #e5e9f0',background:'white',color:NAVY,fontWeight:'600',fontSize:'13px',cursor:'pointer',fontFamily:"'DM Sans', system-ui"}}>✏️ Editar</button>
              <button onClick={reject} disabled={loading} style={{padding:'11px 14px',borderRadius:'9px',border:'1px solid #fecaca',background:'#fef2f2',color:RED,fontSize:'13px',cursor:'pointer',fontFamily:"'DM Sans', system-ui"}}>✗</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function NewMessageModal({ onClose, onSent, token }) {
  const [form,setForm]=useState({contact_name:'',platform:'manual',content:''})
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  async function handleSubmit(){
    if(!form.content.trim()||!form.contact_name.trim()){setError('Nombre y mensaje son obligatorios');return}
    setLoading(true)
    try{const res=await fetch(`${API}/api/clientes/mensaje`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(form)});if(res.ok)onSent();else{const e=await res.json();setError(e.detail||'Error')}}catch{setError('Error de conexión')}finally{setLoading(false)}
  }
  const inp={width:'100%',padding:'10px 12px',borderRadius:'8px',border:'1.5px solid #e5e9f0',fontSize:'13px',fontFamily:"'DM Sans', system-ui",outline:'none'}
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(11,20,38,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'20px'}} onClick={onClose}>
      <div style={{background:'white',borderRadius:'18px',width:'100%',maxWidth:'480px',boxShadow:'0 24px 64px rgba(0,0,0,0.15)',overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
        <div style={{background:NAVY,padding:'18px 24px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><div style={{fontSize:'15px',fontWeight:'800',color:'white',letterSpacing:'-0.3px'}}>Nuevo mensaje</div><div style={{fontSize:'11px',color:'rgba(255,255,255,0.4)',marginTop:'2px'}}>Claude analizará y generará respuesta automáticamente</div></div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.1)',border:'none',color:'white',width:'30px',height:'30px',borderRadius:'8px',cursor:'pointer',fontSize:'18px',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
        </div>
        <div style={{padding:'20px 24px'}}>
          {error&&<div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'8px',padding:'10px 14px',marginBottom:'14px',color:RED,fontSize:'13px'}}>{error}</div>}
          <div style={{marginBottom:'12px'}}><label style={{fontSize:'12px',fontWeight:'600',color:'#374151',display:'block',marginBottom:'5px'}}>Nombre del cliente *</label><input value={form.contact_name} onChange={e=>setForm(p=>({...p,contact_name:e.target.value}))} placeholder="Juan García" style={inp} onFocus={e=>e.target.style.borderColor=NAVY} onBlur={e=>e.target.style.borderColor='#e5e9f0'}/></div>
          <div style={{marginBottom:'12px'}}><label style={{fontSize:'12px',fontWeight:'600',color:'#374151',display:'block',marginBottom:'5px'}}>Plataforma</label><select value={form.platform} onChange={e=>setForm(p=>({...p,platform:e.target.value}))} style={inp}><option value="manual">Manual</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option><option value="facebook">Facebook</option></select></div>
          <div style={{marginBottom:'20px'}}><label style={{fontSize:'12px',fontWeight:'600',color:'#374151',display:'block',marginBottom:'5px'}}>Mensaje del cliente *</label><textarea value={form.content} onChange={e=>setForm(p=>({...p,content:e.target.value}))} placeholder="Pega aquí el mensaje del cliente..." rows={5} style={{...inp,resize:'vertical'}} onFocus={e=>e.target.style.borderColor=NAVY} onBlur={e=>e.target.style.borderColor='#e5e9f0'}/></div>
          <button onClick={handleSubmit} disabled={loading} style={{width:'100%',padding:'12px',borderRadius:'9px',border:'none',background:loading?'#e5e9f0':NAVY,color:loading?'#9ca3af':'white',fontWeight:'700',fontSize:'14px',cursor:loading?'not-allowed':'pointer',fontFamily:"'DM Sans', system-ui"}}>{loading?'Claude analizando...':'🤖 Analizar y generar respuesta'}</button>
        </div>
      </div>
    </div>
  )
}

export default function ClientesPage() {
  const router = useRouter()
  const [tab,setTab]=useState('inbox')
  const [token,setToken]=useState(null)
  const [user,setUser]=useState(null)
  const [inbox,setInbox]=useState(null)
  const [inboxLoading,setInboxLoading]=useState(false)
  const [selectedMsg,setSelectedMsg]=useState(null)
  const [showNewMsg,setShowNewMsg]=useState(false)
  const [inboxFilter,setInboxFilter]=useState('all')
  const [contacts,setContacts]=useState([])
  const [contactsLoading,setContactsLoading]=useState(false)
  const [analytics,setAnalytics]=useState(null)
  const [analyticsLoading,setAnalyticsLoading]=useState(false)
  const [sentimentReport,setSentimentReport]=useState(null)
  const [reportLoading,setReportLoading]=useState(false)
  const [kb,setKb]=useState([])
  const [emailConfig,setEmailConfig]=useState(null)
  const [newKb,setNewKb]=useState({title:'',full_content:'',kb_type:'general'})
  const [emailForm,setEmailForm]=useState({imap_host:'',imap_port:993,smtp_host:'',smtp_port:587,email:'',password:''})
  const [configLoading,setConfigLoading]=useState(false)
  const [configMsg,setConfigMsg]=useState(null)

  useEffect(()=>{
    const t=localStorage.getItem('nexum_token')
    if(!t){router.push('/login');return}
    setToken(t)
    try{const p=JSON.parse(atob(t.split('.')[1]));setUser({email:p.sub||'',name:p.name||p.sub||'Usuario'})}catch{setUser({email:'',name:'Usuario'})}
  },[])

  useEffect(()=>{
    if(!token)return
    if(tab==='inbox')loadInbox()
    if(tab==='contactos')loadContacts()
    if(tab==='analytics'){loadAnalytics();loadSentimentReport()}
    if(tab==='config'){loadKb();loadEmailConfig()}
  },[tab,token])

  async function loadInbox(){setInboxLoading(true);try{const r=await fetch(`${API}/api/clientes/inbox`,{headers:{Authorization:`Bearer ${token}`}});if(r.ok)setInbox(await r.json())}catch{}finally{setInboxLoading(false)}}
  async function loadContacts(){setContactsLoading(true);try{const r=await fetch(`${API}/api/clientes/contactos`,{headers:{Authorization:`Bearer ${token}`}});if(r.ok){const d=await r.json();setContacts(d.contacts||[])}}catch{}finally{setContactsLoading(false)}}
  async function loadAnalytics(){setAnalyticsLoading(true);try{const r=await fetch(`${API}/api/clientes/analytics`,{headers:{Authorization:`Bearer ${token}`}});if(r.ok)setAnalytics(await r.json())}catch{}finally{setAnalyticsLoading(false)}}
  async function loadSentimentReport(){try{const r=await fetch(`${API}/api/clientes/sentiment-report`,{headers:{Authorization:`Bearer ${token}`}});if(r.ok)setSentimentReport(await r.json())}catch{}}
  async function generateSentimentReport(){setReportLoading(true);try{const r=await fetch(`${API}/api/clientes/sentiment-report/generar`,{method:'POST',headers:{Authorization:`Bearer ${token}`}});if(r.ok)setSentimentReport(await r.json())}catch{}finally{setReportLoading(false)}}
  async function loadKb(){try{const r=await fetch(`${API}/api/clientes/knowledge-base`,{headers:{Authorization:`Bearer ${token}`}});if(r.ok){const d=await r.json();setKb(d.entries||[])}}catch{}}
  async function loadEmailConfig(){try{const r=await fetch(`${API}/api/clientes/email/config`,{headers:{Authorization:`Bearer ${token}`}});if(r.ok)setEmailConfig(await r.json())}catch{}}
  async function addKb(){if(!newKb.title||!newKb.full_content)return;setConfigLoading(true);try{const r=await fetch(`${API}/api/clientes/knowledge-base`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(newKb)});if(r.ok){setNewKb({title:'',full_content:'',kb_type:'general'});loadKb();setConfigMsg({type:'success',text:'✓ Documento añadido a la base de conocimiento'})}}catch{}finally{setConfigLoading(false)}}
  async function connectEmail(){setConfigLoading(true);try{const r=await fetch(`${API}/api/clientes/email/conectar`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(emailForm)});const d=await r.json();if(r.ok){setConfigMsg({type:'success',text:'✓ Email conectado correctamente'});loadEmailConfig()}else setConfigMsg({type:'error',text:d.detail||'Error'})}catch{setConfigMsg({type:'error',text:'Error de conexión'})}finally{setConfigLoading(false)}}
  async function syncEmail(){try{const r=await fetch(`${API}/api/clientes/email/sync`,{method:'POST',headers:{Authorization:`Bearer ${token}`}});const d=await r.json();setConfigMsg({type:'success',text:`✓ ${d.synced} emails nuevos sincronizados`});loadInbox()}catch{}}

  const filteredMessages=inbox?.messages?.filter(m=>{if(inboxFilter==='pending')return m.status==='pending'||m.status==='draft_ready';if(inboxFilter==='urgent')return m.ai_sentiment==='urgent'||m.requires_human;if(inboxFilter==='sent')return m.status==='sent'||m.status==='auto_sent';return true})||[]

  const card={background:'white',borderRadius:'14px',border:'1px solid #e5e9f0'}
  const inputStyle={width:'100%',padding:'9px 12px',borderRadius:'8px',border:'1.5px solid #e5e9f0',fontSize:'13px',fontFamily:"'DM Sans', system-ui, sans-serif",outline:'none'}
  const labelStyle={fontSize:'12px',fontWeight:'600',color:'#374151',display:'block',marginBottom:'5px'}

  const tabs=[
    {id:'inbox',    label:'📬 Bandeja',     badge:inbox?.pending},
    {id:'contactos',label:'👥 Contactos'},
    {id:'analytics',label:'📊 Analytics'},
    {id:'config',   label:'⚙️ Configuración'},
  ]

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#f4f6fb',fontFamily:"'DM Sans', system-ui, sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;}
        input:focus,textarea:focus,select:focus{border-color:#0B1426!important;outline:none;}
        ::-webkit-scrollbar{width:5px;} ::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:3px;}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <Sidebar active="/clientes"/>

      <div style={{ flex: 1, flex:1,display:'flex',flexDirection:'column',minHeight:'100vh',overflow:'hidden'}}>

        {/* TOP BAR */}
        <div style={{background:'white',borderBottom:'1px solid #e5e9f0',padding:'0 32px',display:'flex',alignItems:'center',justifyContent:'space-between',height:'64px',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',flex:1}}>
            <div style={{paddingRight:'24px',marginRight:'8px',borderRight:'1px solid #f0f2f7'}}>
              <div style={{fontSize:'16px',fontWeight:'800',color:NAVY,letterSpacing:'-0.4px'}}>💬 Atención al Cliente</div>
              <div style={{fontSize:'11px',color:'#9ca3af'}}>Bandeja unificada · IA · Análisis de sentimiento</div>
            </div>
            <div style={{display:'flex'}}>
              {tabs.map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:'0 14px',height:'64px',background:'none',border:'none',borderBottom:tab===t.id?`2px solid ${NAVY}`:'2px solid transparent',color:tab===t.id?NAVY:'#6b7280',fontWeight:tab===t.id?'700':'400',fontSize:'13px',cursor:'pointer',fontFamily:"'DM Sans', system-ui",transition:'all 0.15s',display:'flex',alignItems:'center',gap:'6px'}}>
                  {t.label}
                  {t.badge>0&&<span style={{background:BLUE,color:'white',borderRadius:'10px',padding:'1px 7px',fontSize:'11px',fontWeight:'700'}}>{t.badge}</span>}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <SettingsButton/>
            <NotificationCenter token={token}/>
            <ProfileButton user={user}/>
            {tab==='inbox'&&<button onClick={()=>setShowNewMsg(true)} style={{padding:'9px 18px',borderRadius:'9px',border:'none',background:NAVY,color:'white',fontWeight:'700',fontSize:'13px',cursor:'pointer',fontFamily:"'DM Sans', system-ui",marginLeft:'4px'}}>+ Nuevo mensaje</button>}
          </div>
        </div>

        {/* INBOX */}
        {tab==='inbox'&&(
          <div style={{flex:1,display:'grid',gridTemplateColumns:'340px 1fr',overflow:'hidden'}}>
            <div style={{borderRight:'1px solid #e5e9f0',display:'flex',flexDirection:'column',background:'white',overflow:'hidden'}}>
              <div style={{padding:'10px 14px',borderBottom:'1px solid #f0f2f7',display:'flex',gap:'6px',flexWrap:'wrap'}}>
                {[{key:'all',label:'Todos',count:inbox?.total},{key:'pending',label:'Pendientes',count:inbox?.pending},{key:'urgent',label:'Urgentes',count:inbox?.requires_human},{key:'sent',label:'Enviados'}].map(f=>(
                  <button key={f.key} onClick={()=>setInboxFilter(f.key)} style={{padding:'4px 10px',borderRadius:'6px',border:'none',background:inboxFilter===f.key?NAVY:'#f1f5f9',color:inboxFilter===f.key?'white':'#6b7280',fontSize:'11px',fontWeight:'600',cursor:'pointer',fontFamily:"'DM Sans', system-ui",display:'flex',alignItems:'center',gap:'4px'}}>
                    {f.label}{f.count>0&&<span style={{background:inboxFilter===f.key?'rgba(255,255,255,0.2)':'#e5e9f0',borderRadius:'8px',padding:'0 5px'}}>{f.count}</span>}
                  </button>
                ))}
              </div>
              <div style={{flex:1,overflowY:'auto'}}>
                {inboxLoading?<div style={{textAlign:'center',padding:'40px',color:'#9ca3af'}}><div style={{fontSize:'24px',marginBottom:'8px',animation:'pulse 1.5s ease infinite'}}>📬</div><div style={{fontSize:'13px'}}>Cargando mensajes...</div></div>
                :filteredMessages.length===0?<div style={{textAlign:'center',padding:'48px 20px'}}><div style={{fontSize:'36px',marginBottom:'12px',opacity:0.3}}>📭</div><div style={{fontSize:'13px',color:'#6b7280'}}>No hay mensajes</div></div>
                :filteredMessages.map(msg=><MessageCard key={msg.id} msg={msg} selected={selectedMsg?.id===msg.id} onClick={()=>setSelectedMsg(msg)}/>)}
              </div>
            </div>
            <div style={{overflow:'hidden',display:'flex',flexDirection:'column'}}>
              {selectedMsg?<MessageDetail msg={selectedMsg} token={token} onUpdate={()=>{loadInbox();setSelectedMsg(null)}}/>
              :<div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'#9ca3af'}}><div style={{fontSize:'48px',marginBottom:'16px',opacity:0.2}}>💬</div><div style={{fontSize:'14px',fontWeight:'600',color:'#374151'}}>Selecciona un mensaje</div><div style={{fontSize:'12px',marginTop:'6px',color:'#9ca3af'}}>Claude genera una respuesta automáticamente</div></div>}
            </div>
          </div>
        )}

        {/* CONTACTOS */}
        {tab==='contactos'&&(
          <div style={{flex:1,overflowY:'auto',padding:'28px 32px'}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:'12px',marginBottom:'24px',animation:'fadeUp 0.3s ease'}}>
              {[
                {label:'Total contactos',value:contacts.length,color:NAVY,bg:'white'},
                {label:'VIP',value:contacts.filter(c=>c.is_vip).length,color:'#7c3aed',bg:'#f5f3ff'},
                {label:'En riesgo',value:contacts.filter(c=>['alto','critico'].includes(c.risk_level)).length,color:RED,bg:'#fef2f2'},
                {label:'Satisfacción avg',value:contacts.length>0?(contacts.reduce((a,c)=>a+(c.sentiment_score||5),0)/contacts.length).toFixed(1):'—',color:GREEN,bg:'#f0fdf4'},
              ].map(s=>(<div key={s.label} style={{...card,padding:'16px',background:s.bg,textAlign:'center'}}><div style={{fontSize:'22px',fontWeight:'800',color:s.color}}>{s.value}</div><div style={{fontSize:'11px',color:'#6b7280',marginTop:'3px'}}>{s.label}</div></div>))}
            </div>
            <div style={{...card,overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{background:NAVY}}>{['Contacto','Plataforma','Sentimiento','Tendencia','Riesgo','Último contacto'].map(h=><th key={h} style={{padding:'11px 14px',textAlign:'left',fontSize:'11px',fontWeight:'700',color:'white',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>)}</tr></thead>
                <tbody>
                  {contactsLoading?<tr><td colSpan="6" style={{padding:'40px',textAlign:'center',color:'#9ca3af'}}>Cargando...</td></tr>
                  :contacts.length===0?<tr><td colSpan="6" style={{padding:'48px',textAlign:'center',color:'#6b7280',fontSize:'13px'}}><div style={{fontSize:'36px',marginBottom:'12px',opacity:0.3}}>👥</div>Se crean automáticamente cuando recibes mensajes.</td></tr>
                  :contacts.map((c,i)=>{
                    const risk=RISK_CFG[c.risk_level]||RISK_CFG.bajo
                    const tColor=c.sentiment_trend==='mejorando'?GREEN:c.sentiment_trend==='deteriorando'?RED:'#6b7280'
                    const tLabel=c.sentiment_trend==='mejorando'?'↑ Mejorando':c.sentiment_trend==='deteriorando'?'↓ Deteriorando':'→ Estable'
                    return(
                      <tr key={c.id} style={{borderBottom:'1px solid #f0f2f7',background:i%2===0?'white':'#fafafa'}} onMouseEnter={e=>e.currentTarget.style.background='#f4f6fb'} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'white':'#fafafa'}>
                        <td style={{padding:'12px 14px'}}><div style={{display:'flex',alignItems:'center',gap:'10px'}}><div style={{width:'32px',height:'32px',borderRadius:'50%',background:NAVY,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'13px',fontWeight:'700',flexShrink:0}}>{c.name?.charAt(0)}</div><div><div style={{fontSize:'13px',fontWeight:'600',color:NAVY}}>{c.name} {c.is_vip&&'⭐'}</div><div style={{fontSize:'11px',color:'#9ca3af'}}>{c.email||c.phone||'—'}</div></div></div></td>
                        <td style={{padding:'12px 14px',fontSize:'12px',color:'#374151'}}>{c.platform}</td>
                        <td style={{padding:'12px 14px'}}><SentimentDonut score={c.sentiment_score||5} size={36}/></td>
                        <td style={{padding:'12px 14px',fontSize:'12px',fontWeight:'600',color:tColor}}>{tLabel}</td>
                        <td style={{padding:'12px 14px'}}><span style={{fontSize:'11px',fontWeight:'700',color:risk.color,background:risk.bg,padding:'3px 8px',borderRadius:'6px'}}>{risk.label}</span></td>
                        <td style={{padding:'12px 14px',fontSize:'12px',color:'#9ca3af'}}>{c.last_contact_at?.split('T')[0]||'—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ANALYTICS */}
        {tab==='analytics'&&(
          <div style={{flex:1,overflowY:'auto',padding:'28px 32px'}}>
            {analyticsLoading?<div style={{textAlign:'center',padding:'60px',color:'#9ca3af'}}><div style={{fontSize:'32px',marginBottom:'12px',animation:'pulse 1.5s ease infinite'}}>📊</div><div style={{fontSize:'14px'}}>Cargando analytics...</div></div>
            :analytics?(
              <>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:'12px',marginBottom:'20px',animation:'fadeUp 0.3s ease'}}>
                  {[{label:'Mensajes esta semana',value:analytics.overview?.messages_this_week,color:NAVY,bg:'white'},{label:'Tiempo respuesta avg',value:analytics.overview?.avg_response_minutes?`${analytics.overview.avg_response_minutes}min`:'—',color:BLUE,bg:'#eff6ff'},{label:'Satisfacción general',value:(analytics.overview?.avg_satisfaction||0).toFixed(1)+'/10',color:GREEN,bg:'#f0fdf4'},{label:'Clientes en riesgo',value:analytics.overview?.at_risk_contacts,color:RED,bg:'#fef2f2'}].map(k=>(<div key={k.label} style={{...card,padding:'16px',background:k.bg,textAlign:'center'}}><div style={{fontSize:'22px',fontWeight:'800',color:k.color}}>{k.value??'—'}</div><div style={{fontSize:'11px',color:'#6b7280',marginTop:'3px'}}>{k.label}</div></div>))}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
                  <div style={{...card,padding:'20px'}}>
                    <div style={{fontSize:'13px',fontWeight:'700',color:NAVY,marginBottom:'14px'}}>Sentimiento de mensajes</div>
                    {Object.entries(analytics.sentiment_breakdown||{}).map(([key,pct])=>{const cfg=SENTIMENT_CFG[key]||SENTIMENT_CFG.neutral;return(<div key={key} style={{marginBottom:'10px'}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}><span style={{fontSize:'12px',color:'#374151'}}>{cfg.icon} {cfg.label}</span><span style={{fontSize:'12px',fontWeight:'700',color:cfg.color}}>{pct}%</span></div><div style={{height:'6px',background:'#f0f2f7',borderRadius:'3px',overflow:'hidden'}}><div style={{height:'100%',background:cfg.color,borderRadius:'3px',width:`${pct}%`,transition:'width 0.8s ease'}}/></div></div>)})}
                  </div>
                  <div style={{...card,padding:'20px'}}>
                    <div style={{fontSize:'13px',fontWeight:'700',color:NAVY,marginBottom:'14px'}}>Intención de mensajes</div>
                    {Object.entries(analytics.intent_breakdown||{}).map(([key,count])=>{const cfg=INTENT_CFG[key]||INTENT_CFG.other;return(<div key={key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid #f0f2f7'}}><span style={{fontSize:'12px',fontWeight:'600',color:cfg.color,background:cfg.bg,padding:'2px 8px',borderRadius:'5px'}}>{cfg.label}</span><span style={{fontSize:'13px',fontWeight:'800',color:NAVY}}>{count}</span></div>)})}
                  </div>
                </div>
                {analytics.trending_topics?.length>0&&(
                  <div style={{...card,padding:'20px',marginBottom:'16px'}}>
                    <div style={{fontSize:'13px',fontWeight:'700',color:NAVY,marginBottom:'12px'}}>🔥 Temas más mencionados esta semana</div>
                    <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>{analytics.trending_topics.map((t,i)=><span key={i} style={{fontSize:'12px',fontWeight:'600',color:NAVY,background:'#f4f6fb',border:'1px solid #e5e9f0',padding:'5px 12px',borderRadius:'20px'}}>{t.topic} <span style={{color:'#6b7280',fontWeight:'400'}}>({t.count})</span></span>)}</div>
                  </div>
                )}
                {analytics.clients_needing_attention?.length>0&&(
                  <div style={{...card,padding:'20px',marginBottom:'16px'}}>
                    <div style={{fontSize:'13px',fontWeight:'700',color:NAVY,marginBottom:'12px'}}>⚠ Clientes que necesitan atención</div>
                    {analytics.clients_needing_attention.map((c,i)=>{const risk=RISK_CFG[c.risk_level]||RISK_CFG.bajo;return(<div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:i<analytics.clients_needing_attention.length-1?'1px solid #f0f2f7':'none'}}><div style={{display:'flex',alignItems:'center',gap:'10px'}}><div style={{width:'32px',height:'32px',borderRadius:'50%',background:NAVY,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'13px',fontWeight:'700'}}>{c.name?.charAt(0)}</div><div><div style={{fontSize:'13px',fontWeight:'600',color:NAVY}}>{c.name}</div><div style={{fontSize:'11px',color:'#9ca3af'}}>Último contacto: {c.last_contact?.split('T')[0]||'—'}</div></div></div><div style={{display:'flex',alignItems:'center',gap:'10px'}}><SentimentDonut score={c.sentiment_score||5} size={36}/><span style={{fontSize:'11px',fontWeight:'700',color:risk.color,background:risk.bg,padding:'3px 8px',borderRadius:'6px'}}>{risk.label}</span></div></div>)})}
                  </div>
                )}
                <div style={{...card,padding:'20px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
                    <div style={{fontSize:'13px',fontWeight:'700',color:NAVY}}>🧠 Informe semanal de sentimiento</div>
                    <button onClick={generateSentimentReport} disabled={reportLoading} style={{padding:'7px 14px',borderRadius:'8px',border:'none',background:reportLoading?'#e5e9f0':NAVY,color:reportLoading?'#9ca3af':'white',fontSize:'12px',fontWeight:'600',cursor:reportLoading?'not-allowed':'pointer',fontFamily:"'DM Sans', system-ui"}}>{reportLoading?'Generando...':'🔄 Generar'}</button>
                  </div>
                  {sentimentReport?.narrative?(<><div style={{background:'#f8faff',borderRadius:'10px',padding:'14px',borderLeft:`3px solid ${NAVY}`,marginBottom:'12px'}}><p style={{margin:0,fontSize:'13.5px',color:'#374151',lineHeight:'1.65'}}>{sentimentReport.narrative}</p></div><div style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:'10px'}}>{[{label:'Positivos',value:`${sentimentReport.positive_pct}%`,color:GREEN},{label:'Negativos',value:`${sentimentReport.negative_pct}%`,color:RED},{label:'Mensajes',value:sentimentReport.total_messages,color:NAVY}].map(s=><div key={s.label} style={{background:'#f8faff',borderRadius:'8px',padding:'12px',textAlign:'center',border:'1px solid #f0f2f7'}}><div style={{fontSize:'16px',fontWeight:'800',color:s.color}}>{s.value}</div><div style={{fontSize:'11px',color:'#6b7280'}}>{s.label}</div></div>)}</div></>)
                  :<div style={{textAlign:'center',padding:'24px',color:'#9ca3af',fontSize:'13px'}}>Haz clic en "Generar" para crear el informe semanal con Claude</div>}
                </div>
              </>
            ):<div style={{textAlign:'center',padding:'60px',color:'#9ca3af',fontSize:'13px'}}>Error cargando analytics</div>}
          </div>
        )}

        {/* CONFIG */}
        {tab==='config'&&(
          <div style={{flex:1,overflowY:'auto',padding:'28px 32px'}}>
            {configMsg&&<div style={{padding:'10px 14px',borderRadius:'8px',marginBottom:'16px',background:configMsg.type==='success'?'#f0fdf4':'#fef2f2',border:`1px solid ${configMsg.type==='success'?'#bbf7d0':'#fecaca'}`,color:configMsg.type==='success'?GREEN:RED,fontSize:'13px',display:'flex',justifyContent:'space-between'}}><span>{configMsg.text}</span><button onClick={()=>setConfigMsg(null)} style={{background:'none',border:'none',cursor:'pointer',color:'inherit',fontSize:'16px'}}>×</button></div>}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px',animation:'fadeUp 0.3s ease'}}>
              <div style={{...card,padding:'24px'}}>
                <div style={{fontSize:'15px',fontWeight:'700',color:NAVY,marginBottom:'4px'}}>📚 Base de conocimiento</div>
                <div style={{fontSize:'12px',color:'#6b7280',marginBottom:'18px'}}>Claude usa estos documentos para responder a los clientes</div>
                {kb.length>0&&<div style={{marginBottom:'16px'}}>{kb.map(e=><div key={e.id} style={{padding:'10px 12px',background:'#f8faff',borderRadius:'8px',marginBottom:'6px',border:'1px solid #e5e9f0',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><div style={{fontSize:'13px',fontWeight:'600',color:NAVY}}>{e.title}</div><div style={{fontSize:'11px',color:'#9ca3af'}}>{e.kb_type} · {e.content_summary?.substring(0,60)}...</div></div><span style={{fontSize:'11px',fontWeight:'600',color:GREEN,background:'#f0fdf4',padding:'2px 8px',borderRadius:'4px'}}>Activo</span></div>)}</div>}
                <div style={{marginBottom:'10px'}}><label style={labelStyle}>Título</label><input value={newKb.title} onChange={e=>setNewKb(p=>({...p,title:e.target.value}))} placeholder="FAQs, Catálogo de productos..." style={inputStyle}/></div>
                <div style={{marginBottom:'10px'}}><label style={labelStyle}>Tipo</label><select value={newKb.kb_type} onChange={e=>setNewKb(p=>({...p,kb_type:e.target.value}))} style={inputStyle}><option value="faq">FAQ</option><option value="product_catalog">Catálogo</option><option value="pricing">Precios</option><option value="policy">Políticas</option><option value="general">General</option></select></div>
                <div style={{marginBottom:'14px'}}><label style={labelStyle}>Contenido</label><textarea value={newKb.full_content} onChange={e=>setNewKb(p=>({...p,full_content:e.target.value}))} rows={5} placeholder="Pega aquí el contenido..." style={{...inputStyle,resize:'vertical'}}/></div>
                <button onClick={addKb} disabled={configLoading} style={{width:'100%',padding:'11px',borderRadius:'9px',border:'none',background:configLoading?'#e5e9f0':NAVY,color:configLoading?'#9ca3af':'white',fontWeight:'700',fontSize:'13px',cursor:configLoading?'not-allowed':'pointer',fontFamily:"'DM Sans', system-ui"}}>{configLoading?'Procesando con Claude...':'+ Añadir a base de conocimiento'}</button>
              </div>
              <div style={{...card,padding:'24px'}}>
                <div style={{fontSize:'15px',fontWeight:'700',color:NAVY,marginBottom:'4px'}}>📧 Conexión de email</div>
                <div style={{fontSize:'12px',color:'#6b7280',marginBottom:'18px'}}>Conecta tu email para recibir mensajes automáticamente</div>
                {emailConfig?.connected&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'10px',padding:'12px 14px',marginBottom:'16px'}}><div style={{fontSize:'13px',fontWeight:'600',color:GREEN,marginBottom:'2px'}}>✓ Email conectado</div><div style={{fontSize:'12px',color:'#374151'}}>{emailConfig.email}</div><div style={{fontSize:'11px',color:'#9ca3af',marginTop:'2px'}}>Última sync: {emailConfig.last_sync_at?.split('T')[0]||'—'}</div><button onClick={syncEmail} style={{marginTop:'10px',padding:'7px 14px',borderRadius:'7px',border:'none',background:GREEN,color:'white',fontSize:'12px',fontWeight:'600',cursor:'pointer',fontFamily:"'DM Sans', system-ui"}}>🔄 Sincronizar ahora</button></div>}
                {[{key:'imap_host',label:'Servidor IMAP',placeholder:'imap.gmail.com',type:'text'},{key:'imap_port',label:'Puerto IMAP',placeholder:'993',type:'number'},{key:'smtp_host',label:'Servidor SMTP',placeholder:'smtp.gmail.com',type:'text'},{key:'smtp_port',label:'Puerto SMTP',placeholder:'587',type:'number'},{key:'email',label:'Email',placeholder:'tu@email.com',type:'email'},{key:'password',label:'Contraseña de aplicación',placeholder:'xxxx xxxx xxxx',type:'password'}].map(f=><div key={f.key} style={{marginBottom:'10px'}}><label style={labelStyle}>{f.label}</label><input type={f.type} value={emailForm[f.key]} onChange={e=>setEmailForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder} style={inputStyle}/></div>)}
                <div style={{background:'#f8faff',borderRadius:'8px',padding:'10px 12px',marginBottom:'14px',border:'1px solid #e5e9f0'}}><div style={{fontSize:'11px',color:'#6b7280',lineHeight:'1.5'}}>💡 Para Gmail usa una <strong>contraseña de aplicación</strong>. Ve a Cuenta de Google → Seguridad → Contraseñas de aplicación.</div></div>
                <button onClick={connectEmail} disabled={configLoading} style={{width:'100%',padding:'11px',borderRadius:'9px',border:'none',background:configLoading?'#e5e9f0':NAVY,color:configLoading?'#9ca3af':'white',fontWeight:'700',fontSize:'13px',cursor:configLoading?'not-allowed':'pointer',fontFamily:"'DM Sans', system-ui"}}>{configLoading?'Conectando...':'🔌 Conectar email'}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showNewMsg&&token&&<NewMessageModal token={token} onClose={()=>setShowNewMsg(false)} onSent={()=>{setShowNewMsg(false);loadInbox()}}/>}
    </div>
  )
}