'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const T = {
  bg:'#FBFBFD', sidebar:'#F5F5F7', card:'#FFFFFF',
  hairline:'rgba(0,0,0,0.08)', hairlineSoft:'rgba(0,0,0,0.05)',
  text:'#1D1D1F', text2:'#424245', text3:'#6E6E73', text4:'#86868B',
  blue:'#0071E3', cyan:'#00B4D8',
  green:'#34C759', greenSoft:'rgba(52,199,89,.12)',
  amber:'#FF9500', amberSoft:'rgba(255,149,0,.12)',
  red:'#FF3B30', redSoft:'rgba(255,59,48,.10)',
}

const Icon = ({ d, size=17, sw=1.5 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round"
    strokeLinejoin="round" style={{flexShrink:0}}>{d}</svg>
)
const I = {
  coin:     <Icon d={<><circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.5c-.7-1-1.9-1.5-2.8-1.5-1.8 0-3 .9-3 2.2 0 3 6 1.6 6 4.6 0 1.3-1.2 2.2-3 2.2-1.4 0-2.6-.7-3.2-1.7M12 7v10"/></>} />,
  trend:    <Icon d={<><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></>} sw={1.8} />,
  cart:     <Icon d={<><path d="M3 4.5h2L7.4 15.7a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8.5H6"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/></>} />,
  sparkle:  <Icon d={<><path d="M12 3.5l1.6 4.4 4.4 1.6-4.4 1.6L12 15.5l-1.6-4.4-4.4-1.6 4.4-1.6L12 3.5z"/><path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7L19 16z"/></>} />,
  bell:     <Icon d={<><path d="M6 8.5a6 6 0 0 1 12 0c0 6.5 2.5 6.5 2.5 8.5h-17c0-2 2.5-2 2.5-8.5z"/><path d="M10 20a2 2 0 0 0 4 0"/></>} />,
  gear:     <Icon d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 14.5a1.5 1.5 0 0 0 .3 1.7l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.5 1.5 0 0 0-1.7-.3 1.5 1.5 0 0 0-.9 1.4v.4a2 2 0 1 1-4 0v-.2a1.5 1.5 0 0 0-1-1.4 1.5 1.5 0 0 0-1.7.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.5 1.5 0 0 0 .3-1.7 1.5 1.5 0 0 0-1.4-.9H3a2 2 0 1 1 0-4h.1a1.5 1.5 0 0 0 1.4-1 1.5 1.5 0 0 0-.3-1.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.5 1.5 0 0 0 1.7.3h.1a1.5 1.5 0 0 0 .9-1.4V3a2 2 0 1 1 4 0v.1a1.5 1.5 0 0 0 .9 1.4 1.5 1.5 0 0 0 1.7-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.5 1.5 0 0 0-.3 1.7v.1a1.5 1.5 0 0 0 1.4.9H21a2 2 0 1 1 0 4h-.2a1.5 1.5 0 0 0-1.4.9z"/></>} />,
  search:   <Icon d={<><circle cx="11" cy="11" r="6.5"/><path d="M19.5 19.5l-3.5-3.5"/></>} sw={1.6} />,
  arrowUp:  <Icon d={<path d="M7 14l5-5 5 5"/>} sw={2} />,
  arrowDown:<Icon d={<path d="M7 10l5 5 5-5"/>} sw={2} />,
  chevDown: <Icon d={<path d="M6 9.5l6 5 6-5"/>} />,
  folder:   <Icon d={<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>} />,
  brief:    <Icon d={<><rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M8 7V5.5A2 2 0 0 1 10 3.5h4a2 2 0 0 1 2 2V7M3 13h18"/></>} />,
  pkg:      <Icon d={<><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></>} />,
}

function Sparkbar({ data=[], color=T.blue }) {
  if (!data.length) return null
  const w=200, h=36
  const max=Math.max(...data,1)
  const bw=(w-(data.length-1)*3)/data.length
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{width:'100%',height:36,marginTop:2}}>
      {data.map((v,i) => {
        const bh=(v/max)*h
        const x=i*(bw+3)
        return <rect key={i} x={x} y={h-bh} width={bw} height={bh} rx="2" fill={color} opacity={0.15+0.85*(i/(data.length-1))}/>
      })}
    </svg>
  )
}

function KpiCard({ label, value, unit, delta, up, comp, color, spark, loading }) {
  return (
    <div style={{background:T.card,borderRadius:16,padding:'20px 22px 18px',border:`.5px solid ${T.hairline}`,display:'flex',flexDirection:'column',gap:14,minWidth:0,boxShadow:'0 1px 2px rgba(0,0,0,.03)'}}>
      <div style={{fontSize:13,color:T.text3,fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',letterSpacing:-0.1}}>{label}</div>
      <div>
        {loading
          ? <div style={{height:36,borderRadius:8,background:'rgba(0,0,0,.06)',animation:'shimmer 1.4s ease infinite'}}/>
          : <><span style={{fontSize:36,fontWeight:600,letterSpacing:-1.2,lineHeight:1,color:T.text,fontVariantNumeric:'tabular-nums'}}>{value}</span>
             {unit&&<span style={{fontSize:18,color:T.text3,fontWeight:500,marginLeft:3,letterSpacing:-0.4}}>{unit}</span>}</>
        }
      </div>
      <Sparkbar data={spark} color={color}/>
      {!loading&&(
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <span style={{display:'inline-flex',alignItems:'center',gap:2,fontSize:12.5,fontWeight:600,color:up?T.green:T.red,flexShrink:0}}>
            {up?I.arrowUp:I.arrowDown}{delta}
          </span>
          <span style={{fontSize:12,color:T.text4,overflow:'hidden',textOverflow:'ellipsis',minWidth:0}}>{comp}</span>
        </div>
      )}
    </div>
  )
}

function BarChart({ data=[], ingresos30=0, gastos30=0 }) {
  const [hover,setHover]=useState(null)
  const neto=ingresos30-gastos30
  if (!data.length) return (
    <div style={{background:T.card,borderRadius:18,padding:'22px 24px',border:`.5px solid ${T.hairline}`,display:'flex',alignItems:'center',justifyContent:'center',minHeight:300,color:T.text3,fontSize:13,boxShadow:'0 1px 2px rgba(0,0,0,.03)'}}>
      Sin datos de ventas
    </div>
  )
  const W=820,H=220,padL=36,padR=8,padT=12,padB=26
  const plotW=W-padL-padR, plotH=H-padT-padB
  const maxVal=Math.max(...data.map(d=>Math.max(d.ing||0,d.gas||0)),1)
  const gridVals=[0,0.25,0.5,0.75,1].map(p=>Math.round(maxVal*p))
  const groupW=plotW/data.length, barW=Math.min(11,groupW/3), gap=3
  return (
    <div style={{background:T.card,borderRadius:18,padding:'22px 24px 18px',border:`.5px solid ${T.hairline}`,minWidth:0,boxShadow:'0 1px 2px rgba(0,0,0,.03)'}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16,gap:16,flexWrap:'wrap'}}>
        <div>
          <div style={{fontSize:17,fontWeight:600,color:T.text,letterSpacing:-0.3}}>Ingresos — ultimos 14 dias</div>
          <div style={{fontSize:13,color:T.text3,marginTop:2}}>Ventas diarias acumuladas</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:14,fontSize:12.5,color:T.text3}}>
          <span><span style={{width:9,height:9,borderRadius:3,background:T.blue,display:'inline-block',marginRight:6,verticalAlign:-1}}/>Ingresos</span>
          <span><span style={{width:9,height:9,borderRadius:3,background:T.cyan,display:'inline-block',marginRight:6,verticalAlign:-1}}/>Ventas</span>
        </div>
      </div>
      <div style={{display:'flex',gap:28,marginBottom:18,paddingBottom:18,borderBottom:`.5px solid ${T.hairlineSoft}`}}>
        {[
          {label:'Ingresos 30d', val:`${(ingresos30/1000).toFixed(1)}k`, color:T.text},
          {label:'Gastos 30d',   val:`${(gastos30/1000).toFixed(1)}k`,   color:T.text},
          {label:'Neto 30d',     val:`${(neto/1000).toFixed(1)}k`,        color:neto>=0?T.green:T.red},
        ].map(m=>(
          <div key={m.label} style={{display:'flex',flexDirection:'column',gap:4}}>
            <span style={{fontSize:12.5,color:T.text3,fontWeight:500}}>{m.label}</span>
            <span style={{fontSize:26,fontWeight:600,color:m.color,letterSpacing:-0.8,fontVariantNumeric:'tabular-nums'}}>
              {m.val}<span style={{fontSize:16,color:T.text3,marginLeft:2}}>€</span>
            </span>
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:220,display:'block'}}>
        {gridVals.map(v=>{
          const y=padT+plotH-(v/maxVal)*plotH
          return (
            <g key={v}>
              <line x1={padL} x2={W-padR} y1={y} y2={y} stroke={T.hairlineSoft} strokeWidth="1"/>
              <text x={padL-8} y={y+3.5} textAnchor="end" fontSize="10" fill={T.text4}>
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
          const isH=hover===i
          return (
            <g key={i} onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)} style={{cursor:'pointer'}}>
              <rect x={x1-4} y={padT} width={barW*2+gap+8} height={plotH} fill="transparent"/>
              <rect x={x1} y={padT+plotH-ingH} width={barW} height={Math.max(ingH,2)} fill={T.blue} opacity={hover===null||isH?1:0.3} rx="3"/>
              <rect x={x2} y={padT+plotH-gasH} width={barW} height={Math.max(gasH,2)} fill={T.cyan} opacity={hover===null||isH?1:0.3} rx="3"/>
              <text x={gx} y={H-8} textAnchor="middle" fontSize="10" fill={isH?T.text:T.text3} fontWeight={isH?600:500}>{d.label}</text>
              {isH&&(
                <g>
                  <rect x={gx-62} y={padT+plotH-Math.max(ingH,gasH)-62} width="124" height="52" rx="8" fill="#1D1D1F"/>
                  <text x={gx} y={padT+plotH-Math.max(ingH,gasH)-44} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,.5)">{d.label}</text>
                  <text x={gx-54} y={padT+plotH-Math.max(ingH,gasH)-26} fontSize="11" fill="rgba(255,255,255,.7)">Ingresos</text>
                  <text x={gx+54} y={padT+plotH-Math.max(ingH,gasH)-26} textAnchor="end" fontSize="11" fill="#fff" fontWeight="600">€{(d.ing||0).toFixed(0)}</text>
                  <text x={gx-54} y={padT+plotH-Math.max(ingH,gasH)-10} fontSize="11" fill="rgba(255,255,255,.5)">Ventas</text>
                  <text x={gx+54} y={padT+plotH-Math.max(ingH,gasH)-10} textAnchor="end" fontSize="11" fill={T.cyan} fontWeight="600">€{(d.gas||0).toFixed(0)}</text>
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
  const suggestions=['Cual es mi margen?','Que producto vende mas?','Cuanto gaste en nominas?']
  async function send() {
    if (!msg.trim()||!token) return
    setLoading(true)
    try {
      const r=await fetch(`${API}/api/agente/chat`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({mensaje:msg,historial:[]})})
      const d=await r.json()
      setResp(d.respuesta||'')
      setMsg('')
    } catch{} finally{setLoading(false)}
  }
  return (
    <div style={{background:T.card,borderRadius:18,padding:22,border:`.5px solid ${T.hairline}`,display:'flex',flexDirection:'column',gap:18,boxShadow:'0 1px 2px rgba(0,0,0,.03)'}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:30,height:30,borderRadius:8,background:'linear-gradient(135deg,#0071E3,#00B4D8)',color:'#fff',display:'grid',placeItems:'center',flexShrink:0,boxShadow:'0 1px 2px rgba(0,113,227,.25)'}}>{I.sparkle}</div>
        <div>
          <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2}}>Vera</div>
          <div style={{fontSize:11.5,color:T.text4}}>Datos en tiempo real</div>
        </div>
      </div>
      {resp&&(
        <div style={{padding:'14px 16px',background:T.sidebar,borderRadius:12,fontSize:13.5,color:T.text,lineHeight:1.5,maxHeight:180,overflowY:'auto',position:'relative',letterSpacing:-0.1}}>
          {resp}
          <button onClick={()=>setResp('')} style={{position:'absolute',top:8,right:8,background:'none',border:'none',cursor:'pointer',fontSize:14,color:T.text4}}>x</button>
        </div>
      )}
      {!resp&&(
        <div style={{display:'flex',flexDirection:'column',gap:4}}>
          {suggestions.map((s,i)=>(
            <button key={s} onClick={()=>setMsg(s)} style={{padding:'10px 14px',borderRadius:10,border:`.5px solid ${T.hairline}`,background:T.sidebar,color:T.text2,fontSize:13,cursor:'pointer',fontFamily:'inherit',textAlign:'left',transition:'background .12s'}}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,.06)'}
              onMouseLeave={e=>e.currentTarget.style.background=T.sidebar}
            >{s}</button>
          ))}
        </div>
      )}
      <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(0,0,0,.04)',borderRadius:999,padding:'8px 8px 8px 14px'}}>
        <input value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}
          placeholder="Pregunta sobre tu negocio..."
          style={{flex:1,border:'none',background:'transparent',outline:'none',fontSize:13,color:T.text,fontFamily:'inherit'}}
        />
        <button onClick={send} disabled={loading||!msg.trim()} style={{width:28,height:28,borderRadius:999,background:loading||!msg.trim()?'rgba(0,0,0,.1)':T.blue,color:'#fff',border:'none',display:'grid',placeItems:'center',cursor:loading||!msg.trim()?'not-allowed':'pointer',flexShrink:0,fontSize:14,fontWeight:700}}>
          {loading?'...':'↑'}
        </button>
      </div>
      <button onClick={()=>router.push('/agente')} style={{background:'none',border:'none',color:T.blue,fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit',textAlign:'center',letterSpacing:-0.1}}>
        Abrir chat completo
      </button>
    </div>
  )
}

function NotifCenter({ token }) {
  const [open,setOpen]=useState(false)
  const [notifs,setNotifs]=useState([])
  const ref=useRef()
  const router=useRouter()
  useEffect(()=>{
    function h(e){if(ref.current&&!ref.current.contains(e.target))setOpen(false)}
    document.addEventListener('mousedown',h)
    return()=>document.removeEventListener('mousedown',h)
  },[])
  useEffect(()=>{if(token)load()},[token])
  async function load() {
    const n=[]
    try {
      const [a,b,c]=await Promise.allSettled([
        fetch(`${API}/api/clientes/inbox`,{headers:{Authorization:`Bearer ${token}`}}),
        fetch(`${API}/api/proyectos/resumen`,{headers:{Authorization:`Bearer ${token}`}}),
        fetch(`${API}/api/ventas/alertas/stock`,{headers:{Authorization:`Bearer ${token}`}}),
      ])
      if(a.status==='fulfilled'&&a.value.ok){const d=await a.value.json();if(d.requires_human>0)n.push({id:'m1',text:`${d.requires_human} mensaje requiere atencion`,href:'/clientes',color:T.amber})}
      if(b.status==='fulfilled'&&b.value.ok){const d=await b.value.json();if(d.at_risk>0)n.push({id:'p1',text:`${d.at_risk} proyecto en riesgo`,href:'/proyectos',color:T.red})}
      if(c.status==='fulfilled'&&c.value.ok){const d=await c.value.json();if(d.total>0)n.push({id:'s1',text:`${d.total} producto con stock bajo`,href:'/ventas',color:T.amber})}
    } catch{}
    setNotifs(n)
  }
  return (
    <div ref={ref} style={{position:'relative'}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:32,height:32,borderRadius:8,border:'none',background:open?'rgba(0,0,0,.06)':'transparent',display:'grid',placeItems:'center',cursor:'pointer',color:T.text3,position:'relative',transition:'background .15s'}}
        onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,.06)'}
        onMouseLeave={e=>e.currentTarget.style.background=open?'rgba(0,0,0,.06)':'transparent'}
      >
        {I.bell}
        {notifs.length>0&&<span style={{position:'absolute',top:7,right:7,width:7,height:7,borderRadius:999,background:T.red,border:'1.5px solid #FBFBFD'}}/>}
      </button>
      {open&&(
        <div style={{position:'absolute',top:40,right:0,width:300,background:T.card,borderRadius:14,border:`.5px solid ${T.hairline}`,boxShadow:'0 8px 32px rgba(0,0,0,.12)',zIndex:200,overflow:'hidden'}}>
          <div style={{padding:'14px 16px',borderBottom:`.5px solid ${T.hairline}`,fontSize:13,fontWeight:600,color:T.text}}>Notificaciones</div>
          {notifs.length===0
            ?<div style={{padding:'32px',textAlign:'center',color:T.text4,fontSize:13}}>Sin notificaciones</div>
            :notifs.map((n,i)=>(
              <div key={n.id} onClick={()=>{router.push(n.href);setOpen(false)}}
                style={{padding:'12px 16px',borderBottom:i<notifs.length-1?`.5px solid ${T.hairlineSoft}`:'none',cursor:'pointer',display:'flex',gap:10,alignItems:'center'}}
                onMouseEnter={e=>e.currentTarget.style.background=T.sidebar}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              >
                <span style={{width:7,height:7,borderRadius:999,background:n.color,flexShrink:0}}/>
                <span style={{fontSize:13,color:T.text}}>{n.text}</span>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}

function ProfileBtn({ user }) {
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
      <div onClick={()=>setOpen(o=>!o)} style={{display:'flex',alignItems:'center',gap:8,padding:'3px 4px 3px 3px',borderRadius:999,cursor:'pointer'}}
        onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,.04)'}
        onMouseLeave={e=>e.currentTarget.style.background='transparent'}
      >
        <div style={{width:28,height:28,borderRadius:999,background:'linear-gradient(135deg,#0071E3,#00B4D8)',color:'#fff',display:'grid',placeItems:'center',fontWeight:600,fontSize:11.5,boxShadow:'inset 0 0 0 .5px rgba(0,0,0,.1)'}}>{initials}</div>
        <div style={{display:'flex',flexDirection:'column',lineHeight:1.2,whiteSpace:'nowrap'}}>
          <span style={{fontSize:13,fontWeight:500,color:T.text}}>{user?.name?.split(' ')[0]||'Usuario'}</span>
          <span style={{fontSize:11,color:T.text4}}>Pro</span>
        </div>
        <span style={{color:T.text4,display:'flex'}}>{I.chevDown}</span>
      </div>
      {open&&(
        <div style={{position:'absolute',top:44,right:0,width:200,background:T.card,borderRadius:14,border:`.5px solid ${T.hairline}`,boxShadow:'0 8px 32px rgba(0,0,0,.12)',zIndex:200,overflow:'hidden'}}>
          <div style={{padding:'12px 14px',borderBottom:`.5px solid ${T.hairlineSoft}`}}>
            <div style={{fontSize:13,fontWeight:500,color:T.text}}>{user?.name}</div>
            <div style={{fontSize:11,color:T.text4}}>{user?.email}</div>
          </div>
          <div style={{padding:'6px 0'}}>
            <button onClick={()=>{router.push('/settings');setOpen(false)}} style={{width:'100%',padding:'9px 14px',display:'flex',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:13,color:T.text}}
              onMouseEnter={e=>e.currentTarget.style.background=T.sidebar}
              onMouseLeave={e=>e.currentTarget.style.background='none'}
            >Configuracion</button>
          </div>
          <div style={{padding:'6px 8px 10px',borderTop:`.5px solid ${T.hairlineSoft}`}}>
            <button onClick={()=>{localStorage.removeItem('nexum_token');router.push('/login')}} style={{width:'100%',padding:'8px',background:T.redSoft,border:'none',borderRadius:8,color:T.red,fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
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
  const esPos=(d.resultado_neto||0)>=0
  const chartData=(ventas?.daily_revenue||[]).map(x=>({label:x.label,ing:x.revenue||0,gas:x.revenue*0.45||0}))
  const makeSpark=(base,n=10)=>[...Array(n)].map((_,i)=>base*(0.5+0.5*(i/(n-1)))*(0.85+Math.random()*0.15))
  const now=new Date()
  const hour=now.getHours()
  const greeting=hour<13?'Buenos dias':hour<20?'Buenas tardes':'Buenas noches'
  const dateStr=now.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})

  const statusRows=[
    {label:'Alertas activas',   value:resumen?.alertas_activas||0,   bad:(resumen?.alertas_activas||0)>0,   icon:I.bell},
    {label:'Clientes en riesgo',value:clientes?.overview?.at_risk_contacts||0,bad:(clientes?.overview?.at_risk_contacts||0)>0,icon:I.brief},
    {label:'Proyectos en riesgo',value:proyectos?.at_risk||0,bad:(proyectos?.at_risk||0)>0,icon:I.folder},
    {label:'Stock bajo',        value:ventas?.low_stock_alerts?.length||0,bad:(ventas?.low_stock_alerts?.length||0)>0,icon:I.pkg},
  ]
  const isOk=statusRows.every(r=>!r.bad)

  const modules=[
    {icon:'📒',title:'Contabilidad',desc:'Partida doble · PGC',href:'/contabilidad',stat:`€${(d.ingresos||0).toLocaleString('es-ES')}`,statLabel:'ingresos 30d',statColor:T.green},
    {icon:'👥',title:'Recursos Humanos',desc:'Nominas · IRPF',href:'/hr',stat:resumen?.empleados||'—',statLabel:'empleados',statColor:T.text},
    {icon:'💬',title:'Clientes',desc:'CRM · Inbox · IA',href:'/clientes',stat:clientes?.overview?.pending_responses||0,statLabel:'pendientes',statColor:(clientes?.overview?.pending_responses||0)>0?T.amber:T.green},
    {icon:'📋',title:'Proyectos',desc:'Health score · IA',href:'/proyectos',stat:proyectos?.total_projects||0,statLabel:'activos',statColor:T.text},
  ]

  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden',background:T.bg,fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',system-ui,sans-serif",WebkitFontSmoothing:'antialiased',letterSpacing:'-0.01em'}}>
      <style>{`
        *{box-sizing:border-box}
        @keyframes shimmer{0%,100%{opacity:.3}50%{opacity:.7}}
        ::-webkit-scrollbar{width:6px}
        ::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:999px}
      `}</style>

      <Sidebar active="/dashboard"/>

      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
        {/* Topbar */}
        <header style={{height:56,background:'rgba(251,251,253,.85)',backdropFilter:'saturate(180%) blur(20px)',WebkitBackdropFilter:'saturate(180%) blur(20px)',borderBottom:`.5px solid ${T.hairline}`,display:'flex',alignItems:'center',padding:'0 24px',gap:16,flexShrink:0,position:'sticky',top:0,zIndex:10}}>
          <div style={{fontSize:17,fontWeight:600,color:T.text,letterSpacing:-0.3,whiteSpace:'nowrap',flexShrink:0}}>{greeting}</div>
          <div style={{width:1,height:18,background:T.hairline,flexShrink:0}}/>
          <div style={{fontSize:13,color:T.text3,whiteSpace:'nowrap',flexShrink:0,textTransform:'capitalize'}}>{dateStr}</div>
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:7,background:'rgba(0,0,0,.05)',padding:'6px 10px',borderRadius:8,width:200,color:T.text3,fontSize:13,flexShrink:1,minWidth:0}}>
            <span style={{display:'flex',color:T.text4}}>{I.search}</span>
            <input placeholder="Buscar..." style={{border:'none',background:'transparent',outline:'none',flex:1,fontSize:13,color:T.text,minWidth:0,fontFamily:'inherit'}}/>
            <span style={{fontSize:11,color:T.text4,flexShrink:0}}>⌘ K</span>
          </div>
          <NotifCenter token={token}/>
          <button onClick={()=>router.push('/settings')} style={{width:32,height:32,borderRadius:8,border:'none',background:'transparent',display:'grid',placeItems:'center',cursor:'pointer',color:T.text3,transition:'background .15s'}}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,.06)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}
          >{I.gear}</button>
          <ProfileBtn user={user}/>
        </header>

        <main style={{flex:1,overflowY:'auto',padding:'24px 28px 40px'}}>
          {/* Subheader */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
            <div style={{fontSize:13,color:T.text3}}>Resumen de los ultimos <strong style={{color:T.text,fontWeight:600}}>30 dias</strong></div>
            <button onClick={loadAll} style={{fontSize:12.5,fontWeight:500,padding:'6px 14px',borderRadius:999,border:`.5px solid ${T.hairline}`,background:T.card,color:T.text,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 1px 2px rgba(0,0,0,.03)'}}>
              Actualizar
            </button>
          </div>

          {/* KPIs */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:16}}>
            <KpiCard label="Ingresos (30 dias)" value={(d.ingresos||0).toLocaleString('es-ES')} unit="€" delta={`Margen ${d.margen||0}%`} up={true} comp="ultimos 30 dias" color={T.blue} spark={makeSpark(d.ingresos||1)} loading={loading}/>
            <KpiCard label="Gastos (30 dias)" value={(d.gastos||0).toLocaleString('es-ES')} unit="€" delta="vs ingresos" up={false} comp="ultimos 30 dias" color={T.cyan} spark={makeSpark(d.gastos||1)} loading={loading}/>
            <KpiCard label="Resultado neto" value={(d.resultado_neto||0).toLocaleString('es-ES')} unit="€" delta={`${d.margen||0}% margen`} up={esPos} comp="30 dias" color={esPos?T.green:T.red} spark={makeSpark(Math.abs(d.resultado_neto||1))} loading={loading}/>
            <KpiCard label="Ventas hoy" value={(ventas?.today?.total_revenue||0).toFixed(2)} unit="€" delta={`${ventas?.today?.total_sales||0} ventas`} up={true} comp="hoy" color={T.blue} spark={makeSpark(ventas?.today?.total_revenue||1)} loading={loading}/>
          </div>

          {/* Chart + Agent */}
          <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 320px',gap:16,marginBottom:16}}>
            <BarChart data={chartData} ingresos30={d.ingresos||0} gastos30={d.gastos||0}/>
            <AgentPanel token={token}/>
          </div>

          {/* Status + Best Sellers */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
            <div style={{background:T.card,borderRadius:16,padding:20,border:`.5px solid ${T.hairline}`,boxShadow:'0 1px 2px rgba(0,0,0,.03)'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                <span style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2}}>Estado del negocio</span>
                <span style={{fontSize:12,fontWeight:600,padding:'3px 10px',borderRadius:999,background:isOk?T.greenSoft:T.amberSoft,color:isOk?T.green:T.amber}}>{isOk?'Saludable':'Atencion'}</span>
              </div>
              {statusRows.map((r,i)=>(
                <div key={r.label} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 0',borderBottom:i<statusRows.length-1?`.5px solid ${T.hairlineSoft}`:'none'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <span style={{color:T.text4,display:'flex'}}>{r.icon}</span>
                    <span style={{fontSize:13,color:T.text2}}>{r.label}</span>
                  </div>
                  <span style={{fontSize:17,fontWeight:600,color:r.bad?T.red:T.green,fontVariantNumeric:'tabular-nums'}}>{r.value}</span>
                </div>
              ))}
            </div>
            <div style={{background:T.card,borderRadius:16,padding:20,border:`.5px solid ${T.hairline}`,boxShadow:'0 1px 2px rgba(0,0,0,.03)'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                <span style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2}}>Mas vendidos</span>
                <button onClick={()=>router.push('/ventas')} style={{background:'none',border:'none',color:T.blue,fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>Ver todo</button>
              </div>
              {(ventas?.best_sellers||[]).length===0
                ?<div style={{textAlign:'center',padding:'24px',color:T.text4,fontSize:13}}>Sin ventas</div>
                :(ventas?.best_sellers||[]).slice(0,5).map((p,i)=>(
                  <div key={p.product_id} style={{display:'flex',alignItems:'center',gap:12,padding:'9px 0',borderBottom:i<4?`.5px solid ${T.hairlineSoft}`:'none'}}>
                    <span style={{fontSize:12,fontWeight:600,color:T.text4,width:18,textAlign:'center',flexShrink:0}}>{i+1}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:500,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                      <div style={{fontSize:11,color:T.text4}}>{p.units_sold} uds</div>
                    </div>
                    <span style={{fontSize:13,fontWeight:600,color:T.green,fontVariantNumeric:'tabular-nums'}}>€{p.revenue.toFixed(0)}</span>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Quick Access */}
          <div style={{background:T.card,borderRadius:16,padding:20,border:`.5px solid ${T.hairline}`,marginBottom:16,boxShadow:'0 1px 2px rgba(0,0,0,.03)'}}>
            <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2,marginBottom:14}}>Acceso rapido</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
              {modules.map(m=>(
                <div key={m.href} onClick={()=>router.push(m.href)} style={{background:T.sidebar,borderRadius:12,border:`.5px solid ${T.hairline}`,padding:'16px',cursor:'pointer',transition:'all 0.15s'}}
                  onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.06)';e.currentTarget.style.transform='translateY(-1px)'}}
                  onMouseLeave={e=>{e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='translateY(0)'}}
                >
                  <div style={{fontSize:20,marginBottom:10}}>{m.icon}</div>
                  <div style={{fontSize:13,fontWeight:500,color:T.text,marginBottom:2,letterSpacing:-0.1}}>{m.title}</div>
                  <div style={{fontSize:11,color:T.text4,marginBottom:10}}>{m.desc}</div>
                  <div style={{display:'flex',alignItems:'baseline',gap:4}}>
                    <span style={{fontSize:18,fontWeight:600,color:m.statColor,fontVariantNumeric:'tabular-nums',letterSpacing:-0.5}}>{m.stat}</span>
                    <span style={{fontSize:11,color:T.text4}}>{m.statLabel}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{marginTop:16,fontSize:11,color:T.text4,textAlign:'center'}}>
            Vortu · {new Date().toLocaleDateString('es-ES')} · Nexum Solutions
          </div>
        </main>
      </div>
    </div>
  )
}