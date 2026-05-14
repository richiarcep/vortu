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

const SEVERITY_CONFIG = {
  alta:  { color: '#991b1b', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444', label: 'Alta'  },
  media: { color: '#92400e', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b', label: 'Media' },
  baja:  { color: '#1e3a8a', bg: '#eff6ff', border: '#bfdbfe', dot: '#3b82f6', label: 'Baja'  },
}

const SUGGESTED_QUESTIONS = [
  '¿Cuál es la salud financiera de mi negocio?',
  '¿Tengo algún riesgo de flujo de caja?',
  '¿Cuáles son mis gastos más altos este mes?',
  '¿Qué debería mejorar ahora mismo?',
  '¿Cómo va mi rentabilidad este mes?',
  '¿Hay anomalías en mis transacciones?',
]

// ── Markdown renderer ──────────────────────────────────────────────────────────
function parseInline(text) {
  if (!text) return text
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p,i) => {
    if (p.startsWith('**')&&p.endsWith('**')) return <strong key={i} style={{fontWeight:'700',color:NAVY}}>{p.slice(2,-2)}</strong>
    const ip = p.split(/(\*[^*]+\*)/g)
    return ip.map((s,ii) => s.startsWith('*')&&s.endsWith('*') ? <em key={ii}>{s.slice(1,-1)}</em> : s)
  })
}

function renderMarkdown(text) {
  if (!text) return []
  const lines = text.split('\n')
  const elements = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('## ')) { elements.push(<div key={i} style={{margin:'14px 0 6px',fontSize:'13.5px',fontWeight:'700',color:NAVY}}>{parseInline(line.slice(3))}</div>) }
    else if (line.startsWith('# ')) { elements.push(<div key={i} style={{margin:'16px 0 8px',fontSize:'15px',fontWeight:'700',color:NAVY}}>{parseInline(line.slice(2))}</div>) }
    else if (line.trim()==='---') { elements.push(<hr key={i} style={{border:'none',borderTop:'1px solid #f0f2f7',margin:'10px 0'}}/>) }
    else if (line.includes('|')&&lines[i+1]&&lines[i+1].includes('---')) {
      const headers = line.split('|').filter(c=>c.trim()).map(c=>c.trim())
      const rows = []; let j=i+2
      while(j<lines.length&&lines[j].includes('|')){rows.push(lines[j].split('|').filter(c=>c.trim()).map(c=>c.trim()));j++}
      elements.push(
        <div key={i} style={{overflowX:'auto',margin:'10px 0',borderRadius:'8px',border:'1px solid #e5e9f0'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12.5px'}}>
            <thead><tr>{headers.map((h,hi)=><th key={hi} style={{padding:'8px 12px',background:'#f4f6fb',color:'#374151',fontWeight:'700',textAlign:'left',borderBottom:'1px solid #e5e9f0'}}>{parseInline(h)}</th>)}</tr></thead>
            <tbody>{rows.map((row,ri)=><tr key={ri} style={{borderBottom:'1px solid #f8f9fc'}}>{row.map((cell,ci)=><td key={ci} style={{padding:'8px 12px',color:'#374151'}}>{parseInline(cell)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )
      i=j; continue
    } else if (line.match(/^[-*]\s/)) {
      const items=[]; let j=i
      while(j<lines.length&&lines[j].match(/^[-*]\s/)){items.push(lines[j].replace(/^[-*]\s/,''));j++}
      elements.push(<div key={i} style={{margin:'6px 0'}}>{items.map((item,ii)=><div key={ii} style={{display:'flex',gap:'8px',marginBottom:'5px',fontSize:'13.5px',color:'#374151',lineHeight:'1.5'}}><span style={{color:NAVY,fontWeight:'700',flexShrink:0}}>→</span><span>{parseInline(item)}</span></div>)}</div>)
      i=j; continue
    } else if (line.match(/^\d+\.\s/)) {
      const items=[]; let j=i
      while(j<lines.length&&lines[j].match(/^\d+\.\s/)){items.push(lines[j].replace(/^\d+\.\s/,''));j++}
      elements.push(<div key={i} style={{margin:'6px 0'}}>{items.map((item,ii)=><div key={ii} style={{display:'flex',gap:'8px',marginBottom:'5px',fontSize:'13.5px',color:'#374151',lineHeight:'1.5'}}><span style={{color:NAVY,fontWeight:'700',flexShrink:0,minWidth:'18px'}}>{ii+1}.</span><span>{parseInline(item)}</span></div>)}</div>)
      i=j; continue
    } else if (line.trim()==='') { elements.push(<div key={i} style={{height:'6px'}}/>) }
    else { elements.push(<p key={i} style={{margin:'3px 0',fontSize:'13.5px',color:'#374151',lineHeight:'1.65'}}>{parseInline(line)}</p>) }
    i++
  }
  return elements
}

// ── Charts ─────────────────────────────────────────────────────────────────────
function MiniBarChart({ data, label }) {
  if (!data||data.length===0) return null
  const max = Math.max(...data.map(d=>Math.abs(d.value)),1)
  const colors = [NAVY,'#ef4444','#22c55e']
  return (
    <div>
      <div style={{fontSize:'11px',fontWeight:'700',color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'12px'}}>{label}</div>
      <div style={{display:'flex',alignItems:'flex-end',gap:'8px',height:'90px'}}>
        {data.map((d,i)=>(
          <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'4px'}}>
            <div style={{fontSize:'10px',color:'#6b7280',fontWeight:'600'}}>{Math.abs(d.value)>=1000?(Math.abs(d.value)/1000).toFixed(1)+'k':Math.abs(d.value)}</div>
            <div style={{width:'100%',background:colors[i]||NAVY,borderRadius:'5px 5px 0 0',height:`${Math.max((Math.abs(d.value)/max)*68,4)}px`,transition:'height 0.8s ease'}}/>
            <div style={{fontSize:'10px',color:'#9ca3af',textAlign:'center'}}>{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DonutChart({ value, max, color, label, sublabel }) {
  const pct=max>0?Math.min(Math.abs(value)/max,1):0
  const r=28,cx=36,cy=36,circ=2*Math.PI*r
  return (
    <div style={{textAlign:'center'}}>
      <svg width="72" height="72" style={{display:'block',margin:'0 auto'}}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f2f7" strokeWidth="7"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="7" strokeDasharray={circ} strokeDashoffset={circ*(1-pct)} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} style={{transition:'stroke-dashoffset 0.8s ease'}}/>
        <text x={cx} y={cy+1} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="700" fill={NAVY}>{Math.round(pct*100)}%</text>
      </svg>
      <div style={{fontSize:'12px',fontWeight:'600',color:'#374151',marginTop:'6px'}}>{label}</div>
      {sublabel&&<div style={{fontSize:'11px',color:'#9ca3af'}}>{sublabel}</div>}
    </div>
  )
}

import Sidebar from '@/components/Sidebar'

// ── Notification Center ────────────────────────────────────────────────────────
function NotificationCenter({ token }) {
  const [open,setOpen]=useState(false)
  const [notifications,setNotifications]=useState([])
  const ref=useRef()
  const router=useRouter()
  useEffect(()=>{function h(e){if(ref.current&&!ref.current.contains(e.target))setOpen(false)};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h)},[])
  useEffect(()=>{if(token)load()},[token])
  async function load(){
    const notifs=[]
    try{
      const [a,b,c]=await Promise.allSettled([
        fetch(`${API}/api/clientes/inbox`,{headers:{Authorization:`Bearer ${token}`}}),
        fetch(`${API}/api/proyectos/resumen`,{headers:{Authorization:`Bearer ${token}`}}),
        fetch(`${API}/api/ventas/alertas/stock`,{headers:{Authorization:`Bearer ${token}`}}),
      ])
      if(a.status==='fulfilled'&&a.value.ok){const d=await a.value.json();if(d.requires_human>0)notifs.push({id:'m1',type:'urgent',icon:'💬',title:`${d.requires_human} mensaje${d.requires_human>1?'s':''} requiere atención`,desc:'Un cliente necesita respuesta humana',href:'/clientes',time:'Ahora'})}
      if(b.status==='fulfilled'&&b.value.ok){const d=await b.value.json();if(d.at_risk>0)notifs.push({id:'p1',type:'warning',icon:'📋',title:`${d.at_risk} proyecto${d.at_risk>1?'s':''} en riesgo`,desc:'Health score bajo',href:'/proyectos',time:'Hoy'})}
      if(c.status==='fulfilled'&&c.value.ok){const d=await c.value.json();if(d.total>0)notifs.push({id:'s1',type:'warning',icon:'📦',title:`${d.total} producto${d.total>1?'s':''} con stock bajo`,desc:'Reabastece pronto',href:'/ventas',time:'Hoy'})}
    }catch{}
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

// ── Main ───────────────────────────────────────────────────────────────────────
export default function AgentePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('chat')
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [messages, setMessages] = useState([{ role: 'assistant', content: '¡Hola! Soy el **Agente IA de Vortu**.\n\nTengo acceso completo a los datos de tu negocio — contabilidad, finanzas, nóminas y documentos.\n\nPuedes preguntarme cualquier cosa sobre cómo va tu empresa.' }])
  const [input, setInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef(null)
  const [alerts, setAlerts] = useState(null)
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [digest, setDigest] = useState(null)
  const [digestLoading, setDigestLoading] = useState(false)
  const [hrData, setHrData] = useState(null)
  const [hrLoading, setHrLoading] = useState(false)

  useEffect(() => {
    const t = localStorage.getItem('nexum_token')
    if (!t) { router.push('/login'); return }
    setToken(t)
    try { const p=JSON.parse(atob(t.split('.')[1])); setUser({email:p.sub||'',name:p.name||p.sub||'Usuario'}) } catch { setUser({email:'',name:'Usuario'}) }
  }, [])

  function getToken() { const t=localStorage.getItem('nexum_token'); if(!t){router.push('/login');return null} return t }

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, chatLoading])

  async function sendMessage(text) {
    const tok=getToken(); if(!tok) return
    const userMsg=text||input.trim(); if(!userMsg) return
    setInput('')
    setMessages(prev=>[...prev,{role:'user',content:userMsg}])
    setChatLoading(true)
    const history=messages.slice(1).map(m=>({role:m.role,content:m.content}))
    try {
      const res=await fetch(`${API}/api/agente/chat`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${tok}`},body:JSON.stringify({mensaje:userMsg,historial:history})})
      if(res.status===401){router.push('/login');return}
      const data=await res.json()
      setMessages(prev=>[...prev,{role:'assistant',content:data.respuesta||data.response||data.message||JSON.stringify(data)}])
    } catch { setMessages(prev=>[...prev,{role:'assistant',content:'Error de conexión. Asegúrate de que el backend está en marcha.'}]) }
    finally { setChatLoading(false) }
  }

  async function loadAlerts() { const tok=getToken();if(!tok)return;setAlertsLoading(true);try{const r=await fetch(`${API}/api/agente/alertas`,{headers:{Authorization:`Bearer ${tok}`}});if(r.ok)setAlerts(await r.json())}catch{}finally{setAlertsLoading(false)} }
  async function loadDigest() { const tok=getToken();if(!tok)return;setDigestLoading(true);try{const r=await fetch(`${API}/api/agente/digest`,{headers:{Authorization:`Bearer ${tok}`}});if(r.ok)setDigest(await r.json())}catch{}finally{setDigestLoading(false)} }
  async function loadHR() { const tok=getToken();if(!tok)return;setHrLoading(true);try{const r=await fetch(`${API}/api/hr/summary`,{headers:{Authorization:`Bearer ${tok}`}});if(r.ok)setHrData(await r.json())}catch{}finally{setHrLoading(false)} }

  useEffect(() => {
    if(activeTab==='alertas'){if(!alerts)loadAlerts();if(!hrData)loadHR()}
    if(activeTab==='digest'&&!digest)loadDigest()
  }, [activeTab])

  const ingresos  = digest?.ingresos?.esta_semana || 0
  const gastos    = digest?.gastos?.esta_semana || 0
  const resultado = digest?.resultado_neto || 0
  const margen    = ingresos>0 ? Math.round((resultado/ingresos)*100) : 0

  const tabs = [
    { id: 'chat',    label: 'Chat con IA',    icon: '💬' },
    { id: 'alertas', label: 'Alertas',        icon: '🔔' },
    { id: 'digest',  label: 'Digest semanal', icon: '📊' },
  ]

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#f4f6fb', fontFamily:"'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        *{box-sizing:border-box;} textarea:focus,input:focus{outline:none;}
        ::-webkit-scrollbar{width:5px;} ::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:3px;}
      `}</style>

      <Sidebar active="/agente"/>

      <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:'100vh', overflow:'hidden' }}>

        {/* TOP BAR */}
        <div style={{ background:'white', borderBottom:'1px solid #e5e9f0', padding:'0 32px', display:'flex', alignItems:'center', justifyContent:'space-between', height:'64px', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center' }}>
            <div style={{ paddingRight:'24px', marginRight:'8px', borderRight:'1px solid #f0f2f7' }}>
              <div style={{ fontSize:'16px', fontWeight:'800', color:NAVY, letterSpacing:'-0.4px' }}>🤖 Agente IA</div>
              <div style={{ fontSize:'11px', color:'#9ca3af' }}>Monitoriza tu negocio 24/7</div>
            </div>
            <div style={{ display:'flex' }}>
              {tabs.map(tab=>(
                <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{ padding:'0 16px', height:'64px', background:'none', border:'none', borderBottom:activeTab===tab.id?`2px solid ${NAVY}`:'2px solid transparent', color:activeTab===tab.id?NAVY:'#6b7280', fontWeight:activeTab===tab.id?'700':'400', fontSize:'13px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', fontFamily:"'DM Sans', system-ui", transition:'all 0.15s' }}>
                  {tab.icon} {tab.label}
                  {tab.id==='alertas'&&alerts?.alertas_alta>0&&<span style={{background:RED,color:'white',borderRadius:'10px',padding:'1px 7px',fontSize:'11px',fontWeight:'700'}}>{alerts.alertas_alta}</span>}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <SettingsButton/>
            <NotificationCenter token={token}/>
            <ProfileButton user={user}/>
          </div>
        </div>

        {/* CHAT */}
        {activeTab==='chat' && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ flex:1, overflowY:'auto', padding:'28px 0' }}>
              <div style={{ maxWidth:'760px', margin:'0 auto', padding:'0 32px' }}>
                {messages.length===1 && (
                  <div style={{ marginBottom:'28px', animation:'fadeUp 0.4s ease' }}>
                    <p style={{ fontSize:'11px', fontWeight:'700', color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'12px' }}>Preguntas sugeridas</p>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
                      {SUGGESTED_QUESTIONS.map((q,i)=>(
                        <button key={i} onClick={()=>sendMessage(q)} style={{ padding:'8px 16px', borderRadius:'20px', border:'1px solid #e5e9f0', background:'white', color:'#374151', fontSize:'13px', cursor:'pointer', fontFamily:"'DM Sans', system-ui", transition:'all 0.15s' }} onMouseEnter={e=>{e.currentTarget.style.background=NAVY;e.currentTarget.style.color='white';e.currentTarget.style.borderColor=NAVY}} onMouseLeave={e=>{e.currentTarget.style.background='white';e.currentTarget.style.color='#374151';e.currentTarget.style.borderColor='#e5e9f0'}}>{q}</button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((msg,idx)=>{
                  const isUser=msg.role==='user'
                  return (
                    <div key={idx} style={{ display:'flex', gap:'12px', marginBottom:'20px', flexDirection:isUser?'row-reverse':'row', alignItems:'flex-end', animation:'fadeUp 0.25s ease' }}>
                      <div style={{ width:'34px', height:'34px', borderRadius:'50%', flexShrink:0, background:NAVY, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px' }}>
                        {isUser ? '👤' : '🤖'}
                      </div>
                      <div style={{ maxWidth:'72%', background:isUser?NAVY:'white', border:isUser?'none':'1px solid #e5e9f0', borderRadius:isUser?'16px 16px 4px 16px':'16px 16px 16px 4px', padding:'14px 18px', boxShadow:isUser?'none':'0 2px 10px rgba(0,0,0,0.05)' }}>
                        {isUser
                          ? <p style={{ margin:0, fontSize:'14px', lineHeight:'1.6', color:'white' }}>{msg.content}</p>
                          : <div>{renderMarkdown(msg.content)}</div>
                        }
                      </div>
                    </div>
                  )
                })}
                {chatLoading && (
                  <div style={{ display:'flex', gap:'12px', marginBottom:'20px', alignItems:'flex-end' }}>
                    <div style={{ width:'34px', height:'34px', borderRadius:'50%', background:NAVY, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px' }}>🤖</div>
                    <div style={{ background:'white', border:'1px solid #e5e9f0', borderRadius:'16px 16px 16px 4px', padding:'14px 18px', boxShadow:'0 2px 10px rgba(0,0,0,0.05)' }}>
                      <div style={{ display:'flex', gap:'5px' }}>
                        {[0,1,2].map(i=><div key={i} style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#9ca3af', animation:`bounce 1.2s ease-in-out ${i*0.2}s infinite` }}/>)}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef}/>
              </div>
            </div>
            {/* Input */}
            <div style={{ background:'white', borderTop:'1px solid #e5e9f0', padding:'16px 32px', flexShrink:0 }}>
              <div style={{ maxWidth:'760px', margin:'0 auto' }}>
                <div style={{ display:'flex', gap:'10px', alignItems:'flex-end', background:'#f8f9fc', borderRadius:'14px', border:'1.5px solid #e5e9f0', padding:'10px 14px', transition:'border-color 0.15s' }} onFocusCapture={e=>e.currentTarget.style.borderColor=NAVY} onBlurCapture={e=>e.currentTarget.style.borderColor='#e5e9f0'}>
                  <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}}} placeholder="Pregunta cualquier cosa sobre tu negocio..." rows={1}
                    style={{ flex:1, background:'none', border:'none', resize:'none', fontSize:'14px', color:'#1f2937', fontFamily:"'DM Sans', system-ui", lineHeight:'1.5', maxHeight:'120px', overflowY:'auto' }}/>
                  <button onClick={()=>sendMessage()} disabled={!input.trim()||chatLoading} style={{ width:'34px', height:'34px', borderRadius:'9px', border:'none', background:input.trim()&&!chatLoading?NAVY:'#e5e9f0', color:input.trim()&&!chatLoading?'white':'#9ca3af', fontSize:'16px', cursor:input.trim()&&!chatLoading?'pointer':'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s' }}>↑</button>
                </div>
                <p style={{ margin:'6px 0 0', fontSize:'11px', color:'#9ca3af', textAlign:'center' }}>El agente tiene acceso a todos los datos de tu empresa · Enter para enviar · Shift+Enter nueva línea</p>
              </div>
            </div>
          </div>
        )}

        {/* ALERTAS */}
        {activeTab==='alertas' && (
          <div style={{ flex:1, overflowY:'auto', padding:'28px 32px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:'24px', alignItems:'start' }}>
              <div>
                {alertsLoading ? (
                  <div style={{ textAlign:'center', padding:'60px', color:'#9ca3af' }}><div style={{ fontSize:'32px', marginBottom:'12px', animation:'pulse 1.5s ease infinite' }}>🔍</div><div style={{ fontSize:'14px', fontWeight:'500' }}>Analizando transacciones...</div></div>
                ) : alerts ? (
                  <>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginBottom:'20px' }}>
                      {[{label:'Total',value:alerts.total_alertas,color:NAVY,bg:'white'},{label:'Alta',value:alerts.alertas_alta,color:'#991b1b',bg:'#fef2f2'},{label:'Media',value:alerts.alertas_media,color:'#92400e',bg:'#fffbeb'},{label:'Baja',value:alerts.alertas_baja,color:'#1e3a8a',bg:'#eff6ff'}].map(s=>(
                        <div key={s.label} style={{ background:s.bg, borderRadius:'12px', border:'1px solid #e5e9f0', padding:'14px', textAlign:'center' }}>
                          <div style={{ fontSize:'24px', fontWeight:'800', color:s.color, letterSpacing:'-0.5px' }}>{s.value}</div>
                          <div style={{ fontSize:'11px', color:'#6b7280', marginTop:'2px' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                    {alerts.analisis_ia && (
                      <div style={{ background:'#f8faff', border:'1px solid #e5e9f0', borderRadius:'12px', padding:'16px 18px', marginBottom:'16px', borderLeft:`4px solid ${NAVY}` }}>
                        <div style={{ fontSize:'11px', fontWeight:'800', color:NAVY, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Análisis IA</div>
                        <p style={{ margin:0, fontSize:'13.5px', color:'#374151', lineHeight:'1.65' }}>{alerts.analisis_ia}</p>
                      </div>
                    )}
                    {alerts.alertas?.length>0 ? (
                      <>
                        <div style={{ fontSize:'11px', fontWeight:'700', color:'#374151', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'10px' }}>Alertas detectadas</div>
                        {alerts.alertas.map((a,i)=>{
                          const sev=SEVERITY_CONFIG[a.severidad]||SEVERITY_CONFIG.baja
                          return (
                            <div key={i} style={{ background:sev.bg, border:`1px solid ${sev.border}`, borderRadius:'10px', padding:'14px 16px', marginBottom:'10px', borderLeft:`3px solid ${sev.dot}` }}>
                              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
                                <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:sev.dot, display:'inline-block' }}/>
                                <span style={{ fontSize:'11px', fontWeight:'700', color:sev.color, textTransform:'uppercase', letterSpacing:'0.05em' }}>{sev.label} — {a.tipo||'Alerta'}</span>
                              </div>
                              <p style={{ margin:0, fontSize:'13px', color:'#374151', lineHeight:'1.5' }}>{a.descripcion||a.mensaje}</p>
                              {a.recomendacion&&<p style={{ margin:'8px 0 0', fontSize:'12px', color:sev.color, fontWeight:'500' }}>→ {a.recomendacion}</p>}
                            </div>
                          )
                        })}
                      </>
                    ) : (
                      <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'12px', padding:'28px', textAlign:'center' }}>
                        <div style={{ fontSize:'36px', marginBottom:'10px' }}>✅</div>
                        <div style={{ fontWeight:'700', color:GREEN, marginBottom:'4px' }}>Sin anomalías detectadas</div>
                        <div style={{ fontSize:'13px', color:'#4ade80' }}>Tu negocio opera dentro de los parámetros normales</div>
                      </div>
                    )}
                    <button onClick={loadAlerts} style={{ marginTop:'16px', padding:'9px 18px', borderRadius:'9px', border:'1px solid #e5e9f0', background:'white', color:NAVY, fontSize:'13px', fontWeight:'600', cursor:'pointer', fontFamily:"'DM Sans', system-ui" }}>🔄 Actualizar</button>
                  </>
                ) : <div style={{ textAlign:'center', padding:'60px', color:'#9ca3af' }}>Error cargando alertas</div>}
              </div>

              {/* HR panel */}
              <div style={{ position:'sticky', top:'28px', display:'flex', flexDirection:'column', gap:'14px' }}>
                <div style={{ background:'white', borderRadius:'14px', border:'1px solid #e5e9f0', overflow:'hidden' }}>
                  <div style={{ background:NAVY, padding:'16px 18px' }}>
                    <div style={{ fontSize:'10px', fontWeight:'700', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'3px' }}>Panel RR.HH.</div>
                    <div style={{ fontSize:'14px', fontWeight:'800', color:'white' }}>Análisis del equipo</div>
                  </div>
                  {hrLoading ? <div style={{ padding:'28px', textAlign:'center', color:'#9ca3af', fontSize:'13px' }}>Cargando equipo...</div>
                  : hrData ? (
                    <div style={{ padding:'16px' }}>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'14px' }}>
                        {[{label:'Empleados',value:hrData.total_employees||hrData.empleados_activos||0,icon:'👥'},{label:'Nómina total',value:hrData.total_payroll?`€${Number(hrData.total_payroll).toLocaleString('es-ES')}`:'—',icon:'💶'}].map(m=>(
                          <div key={m.label} style={{ background:'#f8faff', borderRadius:'10px', padding:'12px', border:'1px solid #f0f2f7' }}>
                            <div style={{ fontSize:'16px', marginBottom:'4px' }}>{m.icon}</div>
                            <div style={{ fontSize:'16px', fontWeight:'800', color:NAVY, letterSpacing:'-0.3px' }}>{m.value}</div>
                            <div style={{ fontSize:'10px', color:'#6b7280', marginTop:'2px' }}>{m.label}</div>
                          </div>
                        ))}
                      </div>
                      {(hrData.positive_feedback!==undefined||hrData.feedback_positivo!==undefined) && (
                        <div style={{ marginBottom:'14px' }}>
                          <div style={{ fontSize:'11px', fontWeight:'700', color:'#374151', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'10px' }}>Sentimiento del equipo</div>
                          <div style={{ display:'flex', justifyContent:'space-around' }}>
                            <DonutChart value={hrData.positive_feedback||hrData.feedback_positivo||0} max={Math.max((hrData.positive_feedback||0)+(hrData.negative_feedback||0)+(hrData.neutral_feedback||0),1)} color="#22c55e" label="Positivo" sublabel={`${hrData.positive_feedback||0} resp.`}/>
                            <DonutChart value={hrData.negative_feedback||hrData.feedback_negativo||0} max={Math.max((hrData.positive_feedback||0)+(hrData.negative_feedback||0)+(hrData.neutral_feedback||0),1)} color="#ef4444" label="Negativo" sublabel={`${hrData.negative_feedback||0} resp.`}/>
                          </div>
                        </div>
                      )}
                      {hrData.by_department&&Object.keys(hrData.by_department).length>0 && (
                        <div style={{ marginBottom:'14px' }}>
                          <div style={{ fontSize:'11px', fontWeight:'700', color:'#374151', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'8px' }}>Departamentos</div>
                          {Object.entries(hrData.by_department).slice(0,4).map(([dept,count])=>(
                            <div key={dept} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                              <span style={{ fontSize:'12px', color:'#374151' }}>{dept}</span>
                              <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
                                <div style={{ width:'50px', height:'4px', background:'#f0f2f7', borderRadius:'2px' }}><div style={{ height:'100%', background:NAVY, borderRadius:'2px', width:`${Math.min((count/(hrData.total_employees||1))*100,100)}%` }}/></div>
                                <span style={{ fontSize:'12px', fontWeight:'600', color:NAVY }}>{count}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ borderTop:'1px solid #f0f2f7', paddingTop:'12px' }}>
                        {[{label:'→ Ver empleados',href:'/hr'},{label:'→ Procesar nómina',href:'/hr'}].map(a=>(
                          <a key={a.label} href={a.href} style={{ display:'block', fontSize:'12px', color:NAVY, fontWeight:'600', textDecoration:'none', padding:'6px 0', borderBottom:'1px solid #f8f9fc' }}>{a.label}</a>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding:'24px', textAlign:'center' }}>
                      <div style={{ fontSize:'28px', marginBottom:'8px', opacity:0.3 }}>👥</div>
                      <div style={{ fontSize:'12px', color:'#6b7280', marginBottom:'10px' }}>Sin datos de empleados</div>
                      <a href="/hr" style={{ fontSize:'12px', color:NAVY, fontWeight:'600' }}>Ir a RR.HH. →</a>
                    </div>
                  )}
                </div>
                <div style={{ background:'white', borderRadius:'14px', border:'1px solid #e5e9f0', padding:'16px' }}>
                  <div style={{ fontSize:'11px', fontWeight:'700', color:'#374151', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'10px' }}>💡 El agente monitoriza</div>
                  {['Transacciones inusualmente altas o bajas','Caídas de ingresos vs semana anterior','Gastos que superan el umbral histórico','Riesgo de flujo de caja','Nóminas sin procesar'].map((tip,i)=>(
                    <div key={i} style={{ fontSize:'12px', color:'#6b7280', marginBottom:'5px', display:'flex', gap:'6px' }}>
                      <span style={{ color:'#22c55e', fontWeight:'700', flexShrink:0 }}>✓</span>{tip}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DIGEST */}
        {activeTab==='digest' && (
          <div style={{ flex:1, overflowY:'auto', padding:'28px 32px' }}>
            {digestLoading ? (
              <div style={{ textAlign:'center', padding:'60px', color:'#9ca3af' }}><div style={{ fontSize:'32px', marginBottom:'12px', animation:'pulse 1.5s ease infinite' }}>📊</div><div style={{ fontSize:'14px', fontWeight:'500' }}>Generando digest semanal...</div></div>
            ) : digest ? (
              <div style={{ maxWidth:'860px' }}>
                <div style={{ background:NAVY, borderRadius:'16px', padding:'28px 32px', marginBottom:'20px' }}>
                  <div style={{ fontSize:'11px', fontWeight:'700', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'6px' }}>Digest semanal · {digest.periodo?.inicio} – {digest.periodo?.fin}</div>
                  <div style={{ fontSize:'20px', fontWeight:'800', color:'white', letterSpacing:'-0.5px', marginBottom:'12px' }}>Resumen de tu negocio</div>
                  <p style={{ margin:0, fontSize:'13.5px', color:'rgba(255,255,255,0.65)', lineHeight:'1.7', maxWidth:'580px' }}>{digest.resumen_ia||digest.resumen_ejecutivo}</p>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px' }}>
                  <div style={{ background:'white', borderRadius:'14px', border:'1px solid #e5e9f0', padding:'20px' }}>
                    <div style={{ fontSize:'11px', fontWeight:'700', color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'14px' }}>Cifras clave</div>
                    {[{label:'Ingresos',value:ingresos,color:GREEN},{label:'Gastos',value:gastos,color:RED},{label:'Resultado neto',value:resultado,color:resultado>=0?GREEN:RED},{label:'Saldo en caja',value:digest.saldo_caja||0,color:NAVY}].map(m=>(
                      <div key={m.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:'10px', marginBottom:'10px', borderBottom:'1px solid #f8f9fc' }}>
                        <span style={{ fontSize:'13px', color:'#6b7280' }}>{m.label}</span>
                        <span style={{ fontSize:'16px', fontWeight:'800', color:m.color, letterSpacing:'-0.5px' }}>€{Number(m.value).toLocaleString('es-ES')}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                    <div style={{ background:'white', borderRadius:'14px', border:'1px solid #e5e9f0', padding:'20px', flex:1 }}>
                      <MiniBarChart data={[{label:'Ingresos',value:ingresos},{label:'Gastos',value:gastos},{label:'Beneficio',value:Math.max(resultado,0)}]} label="Distribución financiera"/>
                    </div>
                    <div style={{ background:'white', borderRadius:'14px', border:'1px solid #e5e9f0', padding:'20px', display:'flex', alignItems:'center', gap:'16px' }}>
                      <DonutChart value={margen} max={100} color={margen>=20?'#22c55e':margen>=0?'#f59e0b':'#ef4444'} label="Margen neto" sublabel={`${margen}% período`}/>
                      <div>
                        <div style={{ fontSize:'13px', fontWeight:'700', color:NAVY, marginBottom:'4px' }}>{margen>=30?'🟢 Excelente':margen>=15?'🟡 Bueno':margen>=0?'🟠 Mejorable':'🔴 Pérdidas'}</div>
                        <div style={{ fontSize:'12px', color:'#6b7280', lineHeight:'1.5' }}>{margen>=30?'Margen superior al promedio del sector.':margen>=15?'Margen saludable con margen de mejora.':margen>=0?'Margen bajo — revisa tus gastos fijos.':'Los gastos superan los ingresos.'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px' }}>
                  <div style={{ background:'white', borderRadius:'14px', border:'1px solid #e5e9f0', padding:'20px' }}>
                    <div style={{ fontSize:'11px', fontWeight:'700', color:'#374151', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'14px' }}>📈 Tendencia semanal</div>
                    <div style={{ display:'flex', gap:'20px', alignItems:'center', marginBottom:'14px' }}>
                      <div><div style={{ fontSize:'10px', color:'#6b7280', marginBottom:'3px' }}>Esta semana</div><div style={{ fontSize:'20px', fontWeight:'800', color:NAVY }}>€{Number(ingresos).toLocaleString('es-ES')}</div></div>
                      <div style={{ color:'#d1d5db', fontSize:'20px' }}>→</div>
                      <div><div style={{ fontSize:'10px', color:'#6b7280', marginBottom:'3px' }}>Semana ant.</div><div style={{ fontSize:'20px', fontWeight:'800', color:'#9ca3af' }}>€{Number(digest.ingresos?.semana_anterior||0).toLocaleString('es-ES')}</div></div>
                    </div>
                    <div style={{ padding:'8px 12px', borderRadius:'8px', background:digest.ingresos?.tendencia==='positiva'?'#f0fdf4':'#fef2f2', color:digest.ingresos?.tendencia==='positiva'?GREEN:RED, fontSize:'12px', fontWeight:'600' }}>
                      {digest.ingresos?.tendencia==='positiva'?'↑ Tendencia positiva esta semana':'↓ Tendencia negativa esta semana'}
                    </div>
                  </div>
                  <div style={{ background:'white', borderRadius:'14px', border:'1px solid #e5e9f0', padding:'20px' }}>
                    <div style={{ fontSize:'11px', fontWeight:'700', color:'#374151', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'14px' }}>🔔 Estado de alertas</div>
                    {digest.alertas ? (
                      <>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginBottom:'12px' }}>
                          {[{label:'Alta',value:digest.alertas.alta_prioridad||0,color:'#ef4444'},{label:'Media',value:digest.alertas.media_prioridad||0,color:'#f59e0b'},{label:'Total',value:digest.alertas.total||0,color:NAVY}].map(s=>(
                            <div key={s.label} style={{ textAlign:'center', padding:'10px 6px', background:'#f8f9fc', borderRadius:'8px' }}>
                              <div style={{ fontSize:'18px', fontWeight:'800', color:s.color, letterSpacing:'-0.3px' }}>{s.value}</div>
                              <div style={{ fontSize:'10px', color:'#6b7280' }}>{s.label}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ fontSize:'12px', color:digest.alertas.total===0?GREEN:'#92400e', fontWeight:'500' }}>{digest.alertas.total===0?'✅ Sin alertas esta semana':`⚠ ${digest.alertas.total} alertas requieren atención`}</div>
                      </>
                    ) : <div style={{ fontSize:'13px', color:'#9ca3af' }}>Sin datos de alertas</div>}
                  </div>
                </div>

                {digest.recomendaciones?.length>0 && (
                  <div style={{ background:'#f8faff', borderRadius:'14px', border:'1px solid #e5e9f0', padding:'20px', marginBottom:'16px' }}>
                    <div style={{ fontSize:'11px', fontWeight:'700', color:'#374151', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'14px' }}>🧠 Recomendaciones para esta semana</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'10px' }}>
                      {digest.recomendaciones.map((r,i)=>(
                        <div key={i} style={{ background:'white', borderRadius:'10px', padding:'14px', border:'1px solid #e5e9f0', display:'flex', gap:'10px' }}>
                          <span style={{ fontWeight:'800', color:NAVY, fontSize:'14px', flexShrink:0 }}>{i+1}.</span>
                          <span style={{ fontSize:'13px', color:'#374151', lineHeight:'1.5' }}>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={loadDigest} style={{ padding:'9px 18px', borderRadius:'9px', border:'1px solid #e5e9f0', background:'white', color:NAVY, fontSize:'13px', fontWeight:'600', cursor:'pointer', fontFamily:"'DM Sans', system-ui" }}>🔄 Regenerar digest</button>
              </div>
            ) : <div style={{ textAlign:'center', padding:'60px', color:'#9ca3af' }}>Error cargando el digest</div>}
          </div>
        )}
      </div>
    </div>
  )
}