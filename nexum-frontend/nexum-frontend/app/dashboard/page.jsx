'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const T = {
  navy:'#0B1426', cyan:'#00B4D8', bg:'#F4F6FB', white:'#FFFFFF',
  text:'#0B1426', textMuted:'#5B6478', textFaint:'#8A93A6',
  border:'#E6E9F0', borderSoft:'#EEF1F6',
  green:'#16A34A', greenSoft:'#E6F6EC',
  amber:'#D97706', amberSoft:'#FEF3DC',
  red:'#DC2626', redSoft:'#FCE8E8', violet:'#6366F1',
}

const Icon = ({ d, size=18, sw=1.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round"
    strokeLinejoin="round" style={{flexShrink:0}}>{d}</svg>
)
const I = {
  coin:     <Icon d={<><circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.7-1-1.9-1.5-3-1.5-1.8 0-3 .9-3 2.2 0 3 6 1.6 6 4.6 0 1.3-1.2 2.2-3 2.2-1.4 0-2.6-.7-3.2-1.7M12 6.5v11"/></>} />,
  trend:    <Icon d={<><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></>} />,
  cart:     <Icon d={<><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></>} />,
  spark:    <Icon d={<><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3"/></>} />,
  bell:     <Icon d={<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z"/><path d="M10 21a2 2 0 0 0 4 0"/></>} />,
  settings: <Icon d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></>} />,
  arrowUp:  <Icon d={<path d="M7 14l5-5 5 5"/>} sw={2} />,
  arrowDown:<Icon d={<path d="M7 10l5 5 5-5"/>} sw={2} />,
  chevron:  <Icon d={<path d="M6 9l6 6 6-6"/>} />,
  search:   <Icon d={<><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></>} />,
  folder:   <Icon d={<><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></>} />,
  brief:    <Icon d={<><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/></>} />,
  pkg:      <Icon d={<><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></>} />,
}

function Sparkline({ data=[], up=true }) {
  if (!data.length) return null
  const w=200, h=28, p=2
  const min=Math.min(...data), max=Math.max(...data), range=max-min||1
  const pts=data.map((v,i)=>[p+(i/(data.length-1))*(w-p*2), h-p-((v-min)/range)*(h-p*2)])
  const path=pts.map((pt,i)=>(i===0?'M':'L')+pt[0].toFixed(1)+','+pt[1].toFixed(1)).join(' ')
  const area=path+` L${w-p},${h} L${p},${h} Z`
  const c=up?T.green:T.red
  const id='spark-fix'
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{height:28,width:'100%',marginTop:4}}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={c} stopOpacity=".22"/>
        <stop offset="100%" stopColor={c} stopOpacity="0"/>
      </linearGradient></defs>
      <path d={area} fill={`url(#${id})`}/>
      <path d={path} fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function KpiCard({ label, value, delta, up, comp, icon, tint, spark, loading }) {
  return (
    <div style={{background:'#fff',border:`1px solid ${T.border}`,borderRadius:14,padding:'20px 22px',display:'flex',flexDirection:'column',gap:14,minWidth:0}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontSize:12.5,color:T.textMuted,fontWeight:500}}>{label}</span>
        <div style={{width:30,height:30,borderRadius:8,background:tint,color:'#fff',display:'grid',placeItems:'center'}}>{icon}</div>
      </div>
      <div>
        <div style={{fontSize:28,fontWeight:600,letterSpacing:-0.8,lineHeight:1,color:loading?T.border:T.text,fontVariantNumeric:'tabular-nums',animation:loading?'shimmer 1.4s ease infinite':'none'}}>
          {loading?'\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0':value}
        </div>
        {!loading&&(
          <div style={{display:'flex',alignItems:'center',gap:8,marginTop:6}}>
            <span style={{display:'inline-flex',alignItems:'center',gap:2,fontSize:12,fontWeight:600,color:up?T.green:T.red,background:up?T.greenSoft:T.redSoft,padding:'2px 6px 2px 4px',borderRadius:999}}>
              {up?I.arrowUp:I.arrowDown}{delta}
            </span>
            <span style={{fontSize:11.5,color:T.textFaint}}>{comp}</span>
          </div>
        )}
      </div>
      <Sparkline data={spark} up={up}/>
    </div>
  )
}

function BarChart({ data=[] }) {
  const [hover,setHover]=useState(null)
  if (!data.length) return (
    <div style={{background:'#fff',border:`1px solid ${T.border}`,borderRadius:14,padding:22,display:'flex',alignItems:'center',justifyContent:'center',minHeight:280,color:T.textFaint,fontSize:13}}>
      Sin datos de ventas
    </div>
  )
  const W=820,H=220,padL=44,padR=12,padT=16,padB=30
  const plotW=W-padL-padR, plotH=H-padT-padB
  const maxVal=Math.max(...data.map(d=>Math.max(d.ing||0,d.gas||0)),1)
  const gridVals=[0,0.25,0.5,0.75,1].map(p=>Math.round(maxVal*p))
  const groupW=plotW/data.length, barW=Math.min(12,groupW/3), gap=3
  return (
    <div style={{background:'#fff',border:`1px solid ${T.border}`,borderRadius:14,padding:22}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:18,gap:16}}>
        <div>
          <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2}}>Ingresos — ultimos 14 dias</div>
          <div style={{fontSize:12,color:T.textFaint,marginTop:2}}>Ventas diarias acumuladas</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:16,fontSize:12,color:T.textMuted}}>
          <span><span style={{width:10,height:10,borderRadius:3,background:T.navy,display:'inline-block',marginRight:6,verticalAlign:-1}}/>Ingresos</span>
          <span><span style={{width:10,height:10,borderRadius:3,background:T.cyan,display:'inline-block',marginRight:6,verticalAlign:-1}}/>Ventas</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:220,display:'block'}}>
        {gridVals.map(v=>{
          const y=padT+plotH-(v/maxVal)*plotH
          return (
            <g key={v}>
              <line x1={padL} x2={W-padR} y1={y} y2={y} stroke="#EEF1F6" strokeWidth="1"/>
              <text x={padL-8} y={y+3.5} textAnchor="end" fontSize="10" fill={T.textFaint} fontFamily="monospace">
                {v===0?'0':`${(v/1000).toFixed(0)}k`}
              </text>
            </g>
          )
        })}
        {data.map((d,i)=>{
          const gx=padL+groupW*i+groupW/2
          const x1=gx-barW-gap/2, x2=gx+gap/2
          const ingH=((d.ing||0)/maxVal)*plotH
          const gasH=((d.gas||0)/maxVal)*plotH
          const isHov=hover===i
          return (
            <g key={i} onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)} style={{cursor:'pointer'}}>
              <rect x={x1-4} y={padT} width={barW*2+gap+8} height={plotH} fill="transparent"/>
              <rect x={x1} y={padT+plotH-ingH} width={barW} height={Math.max(ingH,2)} fill={T.navy} opacity={hover===null||isHov?1:0.4} rx="3"/>
              <rect x={x2} y={padT+plotH-gasH} width={barW} height={Math.max(gasH,2)} fill={T.cyan} opacity={hover===null||isHov?1:0.4} rx="3"/>
              <text x={gx} y={H-8} textAnchor="middle" fontSize="9.5" fill={isHov?T.text:T.textFaint} fontWeight={isHov?600:400}>{d.label}</text>
              {isHov&&(
                <g>
                  <rect x={gx-58} y={padT+plotH-Math.max(ingH,gasH)-58} width="116" height="48" rx="6" fill={T.navy}/>
                  <text x={gx} y={padT+plotH-Math.max(ingH,gasH)-40} textAnchor="middle" fontSize="10" fill="#9AA6BD">{d.label}</text>
                  <text x={gx-50} y={padT+plotH-Math.max(ingH,gasH)-24} fontSize="11" fill="#fff">Ingresos</text>
                  <text x={gx+50} y={padT+plotH-Math.max(ingH,gasH)-24} textAnchor="end" fontSize="11" fill="#fff" fontWeight="600">€{(d.ing||0).toFixed(0)}</text>
                  <text x={gx-50} y={padT+plotH-Math.max(ingH,gasH)-8} fontSize="11" fill="#9AA6BD">Ventas</text>
                  <text x={gx+50} y={padT+plotH-Math.max(ingH,gasH)-8} textAnchor="end" fontSize="11" fill={T.cyan} fontWeight="600">€{(d.gas||0).toFixed(0)}</text>
                </g>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function AgentPanel({ token }) {
  const [msg,setMsg]=useState('')
  const [resp,setResp]=useState('')
  const [loading,setLoading]=useState(false)
  const router=useRouter()
  const suggestions=['Cual es mi margen este mes?','Que producto vende mas?','Cuanto he gastado en nominas?']
  async function send() {
    if (!msg.trim()||!token) return
    setLoading(true)
    try {
      const r=await fetch(`${API}/api/agente/chat`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({mensaje:msg,historial:[]})})
      const data=await r.json()
      setResp(data.respuesta||'')
      setMsg('')
    } catch{} finally{setLoading(false)}
  }
  return (
    <div style={{background:'#fff',border:`1px solid ${T.border}`,borderRadius:14,padding:20,display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{color:T.cyan,display:'flex'}}>{I.spark}</span>
          <span style={{fontSize:14,fontWeight:600,color:T.text,letterSpacing:-0.2}}>Vera</span>
        </div>
        <span style={{fontSize:10.5,fontWeight:600,color:T.cyan,background:'rgba(0,180,216,.1)',padding:'2px 7px',borderRadius:999,letterSpacing:0.3}}>EN VIVO</span>
      </div>
      {!resp&&(
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {suggestions.map(s=>(
            <button key={s} onClick={()=>setMsg(s)} style={{padding:'5px 10px',borderRadius:20,border:`1px solid ${T.border}`,background:T.bg,color:T.textMuted,fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>{s}</button>
          ))}
        </div>
      )}
      {resp&&(
        <div style={{padding:'12px 14px',background:T.bg,borderRadius:10,fontSize:13,color:T.text,lineHeight:1.65,maxHeight:160,overflowY:'auto',border:`1px solid ${T.border}`,position:'relative'}}>
          <div style={{fontSize:10,fontWeight:700,color:T.cyan,textTransform:'uppercase',letterSpacing:0.05,marginBottom:6}}>Respuesta</div>
          {resp}
          <button onClick={()=>setResp('')} style={{position:'absolute',top:8,right:8,background:'none',border:'none',cursor:'pointer',fontSize:14,color:T.textFaint}}>x</button>
        </div>
      )}
      <div style={{display:'flex',gap:8}}>
        <input value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}
          placeholder="Pregunta sobre tu negocio..."
          style={{flex:1,padding:'9px 12px',borderRadius:9,border:`1.5px solid ${T.border}`,fontSize:13,fontFamily:'inherit',outline:'none',background:T.bg}}
          onFocus={e=>{e.target.style.borderColor=T.navy;e.target.style.background='#fff'}}
          onBlur={e=>{e.target.style.borderColor=T.border;e.target.style.background=T.bg}}
        />
        <button onClick={send} disabled={loading||!msg.trim()} style={{padding:'9px 16px',borderRadius:9,border:'none',background:loading?T.border:T.navy,color:loading?T.textFaint:'#fff',fontWeight:700,fontSize:14,cursor:loading?'not-allowed':'pointer',fontFamily:'inherit'}}>
          {loading?'...':'->'}
        </button>
      </div>
      <button onClick={()=>router.push('/agente')} style={{background:'none',border:'none',color:T.cyan,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',textAlign:'center'}}>
        Abrir chat completo →
      </button>
    </div>
  )
}

function NotificationCenter({ token }) {
  const [open,setOpen]=useState(false)
  const [notifications,setNotifications]=useState([])
  const ref=useRef()
  const router=useRouter()
  useEffect(()=>{
    function h(e){if(ref.current&&!ref.current.contains(e.target))setOpen(false)}
    document.addEventListener('mousedown',h)
    return()=>document.removeEventListener('mousedown',h)
  },[])
  useEffect(()=>{if(token)load()},[token])
  async function load() {
    const notifs=[]
    try {
      const [a,b,c]=await Promise.allSettled([
        fetch(`${API}/api/clientes/inbox`,{headers:{Authorization:`Bearer ${token}`}}),
        fetch(`${API}/api/proyectos/resumen`,{headers:{Authorization:`Bearer ${token}`}}),
        fetch(`${API}/api/ventas/alertas/stock`,{headers:{Authorization:`Bearer ${token}`}}),
      ])
      if(a.status==='fulfilled'&&a.value.ok){const d=await a.value.json();if(d.requires_human>0)notifs.push({id:'m1',icon:'💬',title:`${d.requires_human} mensaje requiere atencion`,href:'/clientes'})}
      if(b.status==='fulfilled'&&b.value.ok){const d=await b.value.json();if(d.at_risk>0)notifs.push({id:'p1',icon:'📋',title:`${d.at_risk} proyecto en riesgo`,href:'/proyectos'})}
      if(c.status==='fulfilled'&&c.value.ok){const d=await c.value.json();if(d.total>0)notifs.push({id:'s1',icon:'📦',title:`${d.total} producto con stock bajo`,href:'/ventas'})}
    } catch{}
    setNotifications(notifs)
  }
  const unread=notifications.length
  return (
    <div ref={ref} style={{position:'relative'}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:36,height:36,borderRadius:9,border:`1px solid ${T.border}`,background:open?T.bg:'#fff',display:'grid',placeItems:'center',cursor:'pointer',color:T.textMuted,position:'relative'}}>
        {I.bell}
        {unread>0&&<span style={{position:'absolute',top:7,right:7,width:7,height:7,borderRadius:999,background:T.cyan,border:'2px solid #fff'}}/>}
      </button>
      {open&&(
        <div style={{position:'absolute',top:44,right:0,width:320,background:'#fff',borderRadius:14,border:`1px solid ${T.border}`,boxShadow:'0 16px 48px rgba(0,0,0,0.10)',zIndex:200,overflow:'hidden'}}>
          <div style={{padding:'14px 18px',borderBottom:`1px solid ${T.borderSoft}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:14,fontWeight:600,color:T.text}}>Notificaciones</span>
            {unread>0&&<span style={{fontSize:11,fontWeight:700,color:'#fff',background:T.red,padding:'2px 8px',borderRadius:999}}>{unread}</span>}
          </div>
          <div style={{maxHeight:300,overflowY:'auto'}}>
            {notifications.length===0
              ?<div style={{padding:40,textAlign:'center',color:T.textFaint,fontSize:13}}>Todo en orden</div>
              :notifications.map((n,i)=>(
                <div key={n.id} onClick={()=>{router.push(n.href);setOpen(false)}}
                  style={{padding:'12px 18px',borderBottom:i<notifications.length-1?`1px solid ${T.borderSoft}`:'none',cursor:'pointer',display:'flex',gap:12,alignItems:'center'}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bg}
                  onMouseLeave={e=>e.currentTarget.style.background='#fff'}
                >
                  <span style={{fontSize:18}}>{n.icon}</span>
                  <span style={{fontSize:13,color:T.text}}>{n.title}</span>
                </div>
              ))
            }
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
  useEffect(()=>{
    function h(e){if(ref.current&&!ref.current.contains(e.target))setOpen(false)}
    document.addEventListener('mousedown',h)
    return()=>document.removeEventListener('mousedown',h)
  },[])
  const initials=user?.name?user.name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase():'US'
  return (
    <div ref={ref} style={{position:'relative'}}>
      <div onClick={()=>setOpen(o=>!o)} style={{display:'flex',alignItems:'center',gap:10,padding:'5px 10px 5px 5px',borderRadius:999,border:`1px solid ${T.border}`,cursor:'pointer',background:'#fff'}}>
        <div style={{width:28,height:28,borderRadius:999,background:'linear-gradient(135deg,#1e3a8a 0%,#00B4D8 100%)',color:'#fff',display:'grid',placeItems:'center',fontWeight:600,fontSize:11}}>{initials}</div>
        <div style={{display:'flex',flexDirection:'column',lineHeight:1.15}}>
          <span style={{fontSize:12.5,fontWeight:600,color:T.text}}>{user?.name?.split(' ')[0]||'Usuario'}</span>
          <span style={{fontSize:10.5,color:T.textFaint}}>Pro</span>
        </div>
        <span style={{color:T.textFaint,display:'flex'}}>{I.chevron}</span>
      </div>
      {open&&(
        <div style={{position:'absolute',top:46,right:0,width:200,background:'#fff',borderRadius:12,border:`1px solid ${T.border}`,boxShadow:'0 16px 48px rgba(0,0,0,0.10)',zIndex:200,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:`1px solid ${T.borderSoft}`}}>
            <div style={{fontSize:13,fontWeight:600,color:T.text}}>{user?.name||'Usuario'}</div>
            <div style={{fontSize:11,color:T.textFaint}}>{user?.email||''}</div>
          </div>
          <div style={{padding:'6px 0'}}>
            <button onClick={()=>{router.push('/settings');setOpen(false)}} style={{width:'100%',padding:'9px 16px',display:'flex',alignItems:'center',gap:10,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',textAlign:'left',fontSize:13,color:T.text}}
              onMouseEnter={e=>e.currentTarget.style.background=T.bg}
              onMouseLeave={e=>e.currentTarget.style.background='none'}
            >Configuracion</button>
          </div>
          <div style={{padding:'8px 12px 12px',borderTop:`1px solid ${T.borderSoft}`}}>
            <button onClick={()=>{localStorage.removeItem('nexum_token');router.push('/login')}} style={{width:'100%',padding:'8px',background:T.redSoft,border:`1px solid #fecaca`,borderRadius:8,color:T.red,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
              Cerrar sesion
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const router=useRouter()
  const [token,setToken]=useState(null)
  const [user,setUser]=useState(null)
  const [resumen,setResumen]=useState(null)
  const [ventas,setVentas]=useState(null)
  const [clientes,setClientes]=useState(null)
  const [proyectos,setProyectos]=useState(null)
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    const t=localStorage.getItem('nexum_token')
    if(!t){router.push('/login');return}
    setToken(t)
    try{const p=JSON.parse(atob(t.split('.')[1]));setUser({email:p.sub||'',name:p.name||p.sub||'Usuario'})}
    catch{setUser({email:'',name:'Usuario'})}
  },[])

  useEffect(()=>{if(token)loadAll()},[token])

  async function loadAll() {
    setLoading(true)
    const h={Authorization:`Bearer ${token}`}
    const [r1,r2,r3,r4]=await Promise.allSettled([
      fetch(`${API}/api/agente/resumen`,{headers:h}),
      fetch(`${API}/api/ventas/resumen`,{headers:h}),
      fetch(`${API}/api/clientes/analytics`,{headers:h}),
      fetch(`${API}/api/proyectos/resumen`,{headers:h}),
    ])
    if(r1.status==='fulfilled'&&r1.value.ok)setResumen(await r1.value.json())
    if(r2.status==='fulfilled'&&r2.value.ok)setVentas(await r2.value.json())
    if(r3.status==='fulfilled'&&r3.value.ok)setClientes(await r3.value.json())
    if(r4.status==='fulfilled'&&r4.value.ok)setProyectos(await r4.value.json())
    setLoading(false)
  }

  const d=resumen?.ultimos_30_dias||{}
  const esPositivo=(d.resultado_neto||0)>=0
  const chartData=(ventas?.daily_revenue||[]).map(d=>({label:d.label,ing:d.revenue||0,gas:d.revenue*0.45||0}))
  const ingSpark=[0.7,0.75,0.8,0.72,0.85,0.88,0.9,0.87,0.92,1].map(x=>x*(d.ingresos||1))
  const gasSpark=[0.8,0.82,0.85,0.83,0.87,0.88,0.9,0.89,0.92,1].map(x=>x*(d.gastos||1))
  const netSpark=[0.5,0.6,0.7,0.55,0.75,0.8,0.85,0.82,0.9,1].map(x=>x*Math.abs(d.resultado_neto||1))
  const now=new Date()
  const hour=now.getHours()
  const greeting=hour<13?'Buenos dias':hour<20?'Buenas tardes':'Buenas noches'
  const dateStr=now.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})

  const modules=[
    {icon:'📒',title:'Contabilidad',desc:'Partida doble · PGC',href:'/contabilidad',stat:resumen?`€${(d.ingresos||0).toLocaleString('es-ES')}`:'—',statLabel:'ingresos 30d',statColor:T.green},
    {icon:'👥',title:'Recursos Humanos',desc:'Nominas · IRPF · SS',href:'/hr',stat:resumen?.empleados||'—',statLabel:'empleados',statColor:T.text},
    {icon:'💬',title:'Clientes',desc:'CRM · Inbox · IA',href:'/clientes',stat:clientes?.overview?.pending_responses||0,statLabel:'pendientes',statColor:(clientes?.overview?.pending_responses||0)>0?T.amber:T.green},
    {icon:'📋',title:'Proyectos',desc:'Health score · IA',href:'/proyectos',stat:proyectos?.total_projects||0,statLabel:'activos',statColor:T.text},
  ]
  const statusRows=[
    {icon:I.bell,label:'Alertas activas',value:resumen?.alertas_activas||0,bad:(resumen?.alertas_activas||0)>0},
    {icon:I.brief,label:'Clientes en riesgo',value:clientes?.overview?.at_risk_contacts||0,bad:(clientes?.overview?.at_risk_contacts||0)>0},
    {icon:I.folder,label:'Proyectos en riesgo',value:proyectos?.at_risk||0,bad:(proyectos?.at_risk||0)>0},
    {icon:I.pkg,label:'Stock bajo',value:ventas?.low_stock_alerts?.length||0,bad:(ventas?.low_stock_alerts?.length||0)>0},
  ]
  const isOk=statusRows.every(r=>!r.bad)

  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden',background:T.bg,fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box}
        @keyframes shimmer{0%,100%{opacity:.3}50%{opacity:.7}}
        ::-webkit-scrollbar{width:6px}
        ::-webkit-scrollbar-thumb{background:#d6dbe6;border-radius:6px}
      `}</style>

      <Sidebar active="/dashboard"/>

      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
        <header style={{height:64,background:'#fff',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',padding:'0 28px',gap:20,flexShrink:0}}>
          <div style={{display:'flex',flexDirection:'column',lineHeight:1.1}}>
            <div style={{fontSize:11.5,color:T.textFaint,marginBottom:3,fontWeight:500,textTransform:'capitalize'}}>{dateStr}</div>
            <h1 style={{fontSize:18,fontWeight:600,letterSpacing:-0.3,color:T.text,margin:0}}>{greeting}</h1>
          </div>
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8,background:T.bg,border:`1px solid ${T.border}`,padding:'8px 12px',borderRadius:9,width:260,color:T.textMuted,fontSize:13}}>
            <span style={{display:'flex',color:T.textFaint}}>{I.search}</span>
            <input placeholder="Buscar..." style={{border:'none',background:'transparent',outline:'none',flex:1,fontSize:13,color:T.text,fontFamily:'inherit'}}/>
          </div>
          <button onClick={()=>router.push('/settings')} style={{width:36,height:36,borderRadius:9,border:`1px solid ${T.border}`,background:'#fff',display:'grid',placeItems:'center',cursor:'pointer',color:T.textMuted}}>{I.settings}</button>
          <NotificationCenter token={token}/>
          <ProfileButton user={user}/>
        </header>

        <main style={{flex:1,overflowY:'auto',padding:'24px 28px 36px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
            <div style={{color:T.textMuted,fontSize:13.5}}>
              Resumen de los ultimos <strong style={{color:T.text,fontWeight:600}}>30 dias</strong>
            </div>
            <button onClick={loadAll} style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:12.5,fontWeight:500,padding:'8px 14px',borderRadius:9,border:`1px solid ${T.border}`,background:'#fff',color:T.text,cursor:'pointer',fontFamily:'inherit'}}>
              Actualizar
            </button>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:16}}>
            <KpiCard label="Ingresos (30 dias)" value={`€${(d.ingresos||0).toLocaleString('es-ES')}`} delta={`Margen ${d.margen||0}%`} up={true} comp="ultimos 30 dias" icon={I.coin} tint={T.navy} spark={ingSpark} loading={loading}/>
            <KpiCard label="Gastos (30 dias)" value={`€${(d.gastos||0).toLocaleString('es-ES')}`} delta="vs ingresos" up={false} comp="ultimos 30 dias" icon={I.trend} tint={T.cyan} spark={gasSpark} loading={loading}/>
            <KpiCard label="Resultado neto" value={`€${(d.resultado_neto||0).toLocaleString('es-ES')}`} delta={`${d.margen||0}% margen`} up={esPositivo} comp="30 dias" icon={I.trend} tint={esPositivo?T.green:T.red} spark={netSpark} loading={loading}/>
            <KpiCard label="Ventas hoy" value={`€${(ventas?.today?.total_revenue||0).toFixed(2)}`} delta={`${ventas?.today?.total_sales||0} transacciones`} up={true} comp="hoy" icon={I.cart} tint={T.violet} spark={[0.2,0.4,0.3,0.5,0.7,0.6,0.8,0.75,0.9,1]} loading={loading}/>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 340px',gap:16,marginBottom:16}}>
            <BarChart data={chartData}/>
            <AgentPanel token={token}/>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
            <div style={{background:'#fff',border:`1px solid ${T.border}`,borderRadius:14,padding:20}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                <span style={{fontSize:14,fontWeight:600,color:T.text,letterSpacing:-0.2}}>Estado del negocio</span>
                <span style={{fontSize:11.5,fontWeight:600,padding:'3px 10px',borderRadius:999,background:isOk?T.greenSoft:T.amberSoft,color:isOk?T.green:T.amber}}>{isOk?'Saludable':'Atencion'}</span>
              </div>
              {statusRows.map((r,i)=>(
                <div key={r.label} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:i<statusRows.length-1?`1px solid ${T.borderSoft}`:'none'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <span style={{color:T.textFaint,display:'flex'}}>{r.icon}</span>
                    <span style={{fontSize:13,color:T.text}}>{r.label}</span>
                  </div>
                  <span style={{fontSize:16,fontWeight:700,color:r.bad?T.red:T.green}}>{r.value}</span>
                </div>
              ))}
            </div>
            <div style={{background:'#fff',border:`1px solid ${T.border}`,borderRadius:14,padding:20}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                <span style={{fontSize:14,fontWeight:600,color:T.text,letterSpacing:-0.2}}>Mas vendidos</span>
                <button onClick={()=>router.push('/ventas')} style={{background:'none',border:'none',color:T.cyan,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Ver todo</button>
              </div>
              {(ventas?.best_sellers||[]).length===0
                ?<div style={{textAlign:'center',padding:'24px',color:T.textFaint,fontSize:13}}>Sin ventas aun</div>
                :(ventas?.best_sellers||[]).slice(0,5).map((p,i)=>(
                  <div key={p.product_id} style={{display:'flex',alignItems:'center',gap:12,padding:'9px 0',borderBottom:i<4?`1px solid ${T.borderSoft}`:'none'}}>
                    <div style={{width:22,height:22,borderRadius:6,background:T.bg,display:'grid',placeItems:'center',fontSize:11,fontWeight:700,color:T.textFaint}}>{i+1}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:500,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                      <div style={{fontSize:11,color:T.textFaint}}>{p.units_sold} uds</div>
                    </div>
                    <div style={{fontSize:13,fontWeight:700,color:T.green}}>€{p.revenue.toFixed(0)}</div>
                  </div>
                ))
              }
            </div>
          </div>

          <div style={{background:'#fff',border:`1px solid ${T.border}`,borderRadius:14,padding:20,marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:600,color:T.text,letterSpacing:-0.2,marginBottom:14}}>Acceso rapido</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
              {modules.map(m=>(
                <div key={m.href} onClick={()=>router.push(m.href)} style={{background:T.bg,borderRadius:12,border:`1px solid ${T.border}`,padding:'16px',cursor:'pointer',transition:'all 0.15s'}}
                  onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.06)';e.currentTarget.style.transform='translateY(-2px)'}}
                  onMouseLeave={e=>{e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='translateY(0)'}}
                >
                  <div style={{fontSize:20,marginBottom:10}}>{m.icon}</div>
                  <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:2}}>{m.title}</div>
                  <div style={{fontSize:11,color:T.textFaint,marginBottom:10}}>{m.desc}</div>
                  <div style={{display:'flex',alignItems:'baseline',gap:4}}>
                    <span style={{fontSize:18,fontWeight:700,color:m.statColor}}>{m.stat}</span>
                    <span style={{fontSize:11,color:T.textFaint}}>{m.statLabel}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{marginTop:24,fontSize:11,color:T.textFaint,textAlign:'center',fontFamily:'monospace'}}>
            Vortu · {new Date().toLocaleDateString('es-ES')} · Nexum Solutions
          </div>
        </main>
      </div>
    </div>
  )
}
