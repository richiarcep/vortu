'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const T = {
  bg:'#FBFBFD', card:'#FFFFFF', sidebar:'#F5F5F7',
  hairline:'rgba(0,0,0,0.08)', soft:'rgba(0,0,0,0.05)',
  text:'#1D1D1F', text2:'#424245', text3:'#6E6E73', text4:'#86868B',
  blue:'#0071E3', cyan:'#00B4D8',
  green:'#34C759', greenSoft:'rgba(52,199,89,.1)',
  amber:'#FF9500', amberSoft:'rgba(255,149,0,.1)',
  red:'#FF3B30', redSoft:'rgba(255,59,48,.08)',
  purple:'#6366F1', purpleSoft:'rgba(99,102,241,.1)',
}

const Icon = ({ d, size=16, sw=1.5 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>{d}</svg>
)
const I = {
  gear:    <Icon d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 14.5a1.5 1.5 0 0 0 .3 1.7l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.5 1.5 0 0 0-1.7-.3 1.5 1.5 0 0 0-.9 1.4v.4a2 2 0 1 1-4 0v-.2a1.5 1.5 0 0 0-1-1.4 1.5 1.5 0 0 0-1.7.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.5 1.5 0 0 0 .3-1.7 1.5 1.5 0 0 0-1.4-.9H3a2 2 0 1 1 0-4h.1a1.5 1.5 0 0 0 1.4-1 1.5 1.5 0 0 0-.3-1.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.5 1.5 0 0 0 1.7.3h.1a1.5 1.5 0 0 0 .9-1.4V3a2 2 0 1 1 4 0v.1a1.5 1.5 0 0 0 .9 1.4 1.5 1.5 0 0 0 1.7-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.5 1.5 0 0 0-.3 1.7v.1a1.5 1.5 0 0 0 1.4.9H21a2 2 0 1 1 0 4h-.2a1.5 1.5 0 0 0-1.4.9z"/></>} />,
  chevron: <Icon d={<path d="M6 9.5l6 5 6-5"/>} />,
}

function Card({ children, style={} }) {
  return <div style={{background:T.card,borderRadius:16,border:`.5px solid ${T.hairline}`,boxShadow:'0 1px 2px rgba(0,0,0,.03)',padding:20,...style}}>{children}</div>
}

function Btn({ children, onClick, disabled, color=T.blue, style={} }) {
  return <button onClick={onClick} disabled={disabled} style={{padding:'7px 16px',borderRadius:999,border:'none',fontSize:13,fontWeight:500,cursor:disabled?'not-allowed':'pointer',fontFamily:'inherit',background:disabled?T.sidebar:color,color:disabled?T.text4:'#fff',opacity:disabled?.6:1,display:'inline-flex',alignItems:'center',gap:6,...style}}>{children}</button>
}

function BtnSec({ children, onClick, style={} }) {
  return <button onClick={onClick} style={{padding:'7px 16px',borderRadius:999,border:`.5px solid ${T.hairline}`,background:T.card,fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit',color:T.text,display:'inline-flex',alignItems:'center',gap:6,...style}}>{children}</button>
}

const inp = {width:'100%',padding:'8px 11px',borderRadius:8,border:`.5px solid ${T.hairline}`,background:T.sidebar,fontSize:13,color:T.text,fontFamily:'inherit',outline:'none'}

function Toast({ msg }) {
  if (!msg) return null
  const ok = msg.type==='success'
  return <div style={{padding:'10px 14px',background:ok?T.greenSoft:T.redSoft,border:`.5px solid ${ok?T.green:T.red}`,borderRadius:10,color:ok?T.green:T.red,fontSize:13,marginBottom:14}}>{msg.text}</div>
}

function ProfileBtn({ user, router }) {
  const [open,setOpen]=useState(false)
  const ref=useRef()
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
        <div style={{width:28,height:28,borderRadius:999,background:'linear-gradient(135deg,#0071E3,#00B4D8)',color:'#fff',display:'grid',placeItems:'center',fontWeight:600,fontSize:11}}>{initials}</div>
        <span style={{fontSize:13,fontWeight:500,color:T.text}}>{user?.name?.split(' ')[0]||'Usuario'}</span>
        <span style={{color:T.text4,display:'flex'}}>{I.chevron}</span>
      </div>
      {open&&(
        <div style={{position:'absolute',top:44,right:0,width:180,background:T.card,borderRadius:12,border:`.5px solid ${T.hairline}`,boxShadow:'0 8px 32px rgba(0,0,0,.12)',zIndex:200,overflow:'hidden'}}>
          <div style={{padding:'6px 0'}}>
            <button onClick={()=>{router.push('/settings');setOpen(false)}} style={{width:'100%',padding:'9px 14px',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:13,color:T.text,textAlign:'left'}} onMouseEnter={e=>e.currentTarget.style.background=T.sidebar} onMouseLeave={e=>e.currentTarget.style.background='none'}>Configuracion</button>
          </div>
          <div style={{padding:'6px 8px 10px',borderTop:`.5px solid ${T.hairline}`}}>
            <button onClick={()=>{localStorage.removeItem('nexum_token');router.push('/login')}} style={{width:'100%',padding:'8px',background:T.redSoft,border:'none',borderRadius:8,color:T.red,fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>Cerrar sesion</button>
          </div>
        </div>
      )}
    </div>
  )
}

// Gauge visual para health score
function Gauge({ score=0, size=120 }) {
  const pct = Math.min(score/10, 1)
  const color = score>=7?T.green:score>=5?T.amber:score>0?T.red:T.text4
  const r=46, cx=size/2, cy=size/2
  const circ=Math.PI*r // semicircle
  const dash=pct*circ
  return (
    <svg width={size} height={size/2+16} style={{display:'block',overflow:'visible'}}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.sidebar} strokeWidth="10"
        strokeDasharray={`${circ} ${circ}`} strokeDashoffset={0}
        transform={`rotate(180 ${cx} ${cy})`} strokeLinecap="round"/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`} strokeDashoffset={0}
        transform={`rotate(180 ${cx} ${cy})`} strokeLinecap="round"
        style={{transition:'stroke-dasharray .8s ease'}}/>
      <text x={cx} y={cy+6} textAnchor="middle" fontSize="24" fontWeight="600" fill={color} fontFamily="system-ui">{score||'—'}</text>
      <text x={cx} y={cy+20} textAnchor="middle" fontSize="11" fill={T.text4} fontFamily="system-ui">/10</text>
      <text x={cx-r-4} y={cy+4} textAnchor="end" fontSize="10" fill={T.text4} fontFamily="system-ui">0</text>
      <text x={cx+r+4} y={cy+4} textAnchor="start" fontSize="10" fill={T.text4} fontFamily="system-ui">10</text>
    </svg>
  )
}

// Barra de progreso con label
function ProgressBar({ label, value, max, color, format }) {
  const pct = max>0?Math.min(value/max*100,100):0
  return (
    <div style={{marginBottom:10}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
        <span style={{fontSize:12,color:T.text2}}>{label}</span>
        <span style={{fontSize:12,fontWeight:600,color:color||T.text,fontVariantNumeric:'tabular-nums'}}>{format?format(value):`€${value.toLocaleString('es-ES')}`}</span>
      </div>
      <div style={{height:6,background:T.sidebar,borderRadius:999,overflow:'hidden'}}>
        <div style={{height:'100%',width:`${pct}%`,background:color||T.blue,borderRadius:999,transition:'width .6s ease'}}/>
      </div>
    </div>
  )
}

// Gráfico de barras de tendencia 6 meses
function TrendChart({ data=[] }) {
  const [hover,setHover]=useState(null)
  if (!data.length) return <div style={{height:140,display:'flex',alignItems:'center',justifyContent:'center',color:T.text4,fontSize:12}}>Sin datos</div>
  const W=580, H=140, padL=40, padR=10, padT=10, padB=28
  const plotW=W-padL-padR, plotH=H-padT-padB
  const maxVal=Math.max(...data.flatMap(d=>[d.ingresos||0,d.gastos||0]),1)
  const gridVals=[0,0.5,1].map(p=>maxVal*p)
  const groupW=plotW/data.length
  const barW=Math.min(18,groupW/3)
  const gap=4

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:140,display:'block'}}>
      {gridVals.map((v,i)=>{
        const y=padT+plotH-(v/maxVal)*plotH
        return <g key={i}>
          <line x1={padL} x2={W-padR} y1={y} y2={y} stroke={T.soft} strokeWidth=".8"/>
          <text x={padL-6} y={y+3} textAnchor="end" fontSize="9" fill={T.text4} fontFamily="system-ui">{v===0?'0':`${(v/1000).toFixed(0)}k`}</text>
        </g>
      })}
      {data.map((d,i)=>{
        const gx=padL+groupW*i+groupW/2
        const x1=gx-barW-gap/2
        const x2=gx+gap/2
        const ingH=((d.ingresos||0)/maxVal)*plotH
        const gasH=((d.gastos||0)/maxVal)*plotH
        const resH=Math.abs((d.resultado||0)/maxVal)*plotH
        const isPos=(d.resultado||0)>=0
        const isH=hover===i
        return (
          <g key={i} onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)} style={{cursor:'pointer'}}>
            <rect x={x1-4} y={padT} width={barW*2+gap+8} height={plotH} fill="transparent"/>
            <rect x={x1} y={padT+plotH-ingH} width={barW} height={Math.max(ingH,2)} fill={T.blue} opacity={hover===null||isH?.9:.2} rx="3"/>
            <rect x={x2} y={padT+plotH-gasH} width={barW} height={Math.max(gasH,2)} fill={T.red} opacity={hover===null||isH?.7:.2} rx="3"/>
            <text x={gx} y={H-8} textAnchor="middle" fontSize="9.5" fill={isH?T.text:T.text4} fontFamily="system-ui" fontWeight={isH?600:400}>{d.mes}</text>
            {isH&&(
              <g>
                <rect x={gx-52} y={padT+plotH-Math.max(ingH,gasH)-56} width="104" height="50" rx="8" fill={T.text}/>
                <text x={gx} y={padT+plotH-Math.max(ingH,gasH)-42} textAnchor="middle" fontSize="9.5" fill="rgba(255,255,255,.5)" fontFamily="system-ui">Ingresos</text>
                <text x={gx} y={padT+plotH-Math.max(ingH,gasH)-28} textAnchor="middle" fontSize="10" fill={T.cyan} fontFamily="system-ui" fontWeight="600">€{(d.ingresos||0).toLocaleString('es-ES')}</text>
                <text x={gx} y={padT+plotH-Math.max(ingH,gasH)-14} textAnchor="middle" fontSize="9.5" fill="rgba(255,255,255,.5)" fontFamily="system-ui">Resultado: <tspan fill={isPos?T.green:T.red} fontWeight="600">{isPos?'+':''}€{(d.resultado||0).toLocaleString('es-ES')}</tspan></text>
              </g>
            )}
          </g>
        )
      })}
      {/* Linea de resultado */}
      {data.length>1&&(
        <polyline
          points={data.map((d,i)=>{
            const gx=padL+groupW*i+groupW/2
            const y=padT+plotH-((d.resultado||0)/maxVal)*plotH
            return `${gx},${Math.max(padT,Math.min(padT+plotH,y))}`
          }).join(' ')}
          fill="none" stroke={T.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".8"
        />
      )}
    </svg>
  )
}

export default function Finanzas() {
  const router = useRouter()
  const [section, setSection] = useState('resumen')
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadMode, setUploadMode] = useState('financial')
  const [uploadResult, setUploadResult] = useState(null)
  const [contextFiles, setContextFiles] = useState([])
  const [contextFile, setContextFile] = useState(null)
  const [proyecciones, setProyecciones] = useState(null)
  const [proyLoading, setProyLoading] = useState(false)
  const [ratios, setRatios] = useState(null)
  const [ratiosLoading, setRatiosLoading] = useState(false)
  const [vista, setVista] = useState('mes') // mes | year

  const getToken = () => localStorage.getItem('nexum_token')

  useEffect(()=>{
    const t=getToken()
    if(!t){router.push('/login');return}
    setToken(t)
    try{const p=JSON.parse(atob(t.split('.')[1]));setUser({email:p.sub||'',name:p.name||p.sub||'Usuario'})}
    catch{setUser({email:'',name:'Usuario'})}
    loadSummary()
  },[])

  function loadSummary() {
    fetch(`${API}/api/finance/summary`,{headers:{Authorization:`Bearer ${getToken()}`}})
      .then(r=>r.json()).then(setSummary).catch(()=>{})
  }

  async function uploadDocument(e) {
    e.preventDefault();if(!uploadFile)return
    setLoading(true);setMsg(null);setUploadResult(null)
    const fd=new FormData();fd.append('file',uploadFile);fd.append('module','finance')
    const res=await fetch(`${API}/api/upload/`,{method:'POST',headers:{Authorization:`Bearer ${getToken()}`},body:fd})
    const data=await res.json()
    if(res.ok){setUploadResult(data);setMsg({type:'success',text:`Documento analizado · ID: ${data.id}`});loadSummary()}
    else setMsg({type:'error',text:data.detail||'Error al subir el archivo'})
    setLoading(false)
  }

  async function uploadContextFile(e) {
    e.preventDefault();if(!contextFile)return
    setLoading(true)
    const fd=new FormData();fd.append('file',contextFile);fd.append('module','marketing')
    const res=await fetch(`${API}/api/upload/`,{method:'POST',headers:{Authorization:`Bearer ${getToken()}`},body:fd})
    const data=await res.json()
    if(res.ok){setContextFiles(prev=>[...prev,{name:contextFile.name,id:data.id}]);setContextFile(null)}
    setLoading(false)
  }

  async function generateProyecciones(force=false) {
    setProyLoading(true);setProyecciones(null)
    try{
      // Check cache first unless forced or has context files
      if (!force && contextFiles.length===0) {
        const cached = await fetch(`${API}/api/finance/proyecciones/cached`,{headers:{Authorization:`Bearer ${getToken()}`}})
        if (cached.ok) {
          const cd = await cached.json()
          if (cd.cached && cd.data) {
            setProyecciones({...cd.data, _cached: true, _generated_at: cd.generated_at})
            setProyLoading(false)
            return
          }
        }
      }
      const res=await fetch(`${API}/api/finance/proyecciones`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify({context_document_ids:contextFiles.map(f=>f.id).filter(Boolean),meses_historico:6})})
      setProyecciones(await res.json())
    }catch{setProyecciones({error:'No se pudieron generar las proyecciones'})}
    finally{setProyLoading(false)}
  }

  async function clearProyecciones() {
    await fetch(`${API}/api/finance/proyecciones/cached`,{method:'DELETE',headers:{Authorization:`Bearer ${getToken()}`}})
    setProyecciones(null)
  }

  async function generateRatios() {
    setRatiosLoading(true);setRatios(null)
    try{
      const res=await fetch(`${API}/api/finance/ratios`,{headers:{Authorization:`Bearer ${getToken()}`}})
      setRatios(await res.json())
    }catch{setRatios({error:'No se pudieron calcular los ratios'})}
    finally{setRatiosLoading(false)}
  }

  const cont = summary?.contabilidad || {}
  const datos = vista==='mes' ? cont.mes_actual||{} : cont.año_actual||{}
  const trend = cont.monthly_trend || []
  const topGastos = cont.top_gastos || []
  const maxGasto = Math.max(...topGastos.map(g=>g.total),1)
  // Health score — calculado desde margen si no viene del backend
  const margen = datos.margen || 0
  const healthCalc = margen >= 30 ? 9 : margen >= 20 ? 8 : margen >= 10 ? 6 : margen >= 0 ? 4 : 2
  const health = datos.health_score || healthCalc
  const healthLabel = health>=7?'Saludable':health>=5?'Regular':health>0?'Critico':'Sin datos'
  const healthColor = health>=7?T.green:health>=5?T.amber:health>0?T.red:T.text4

  const sections=[
    {key:'resumen',     label:'Resumen'},
    {key:'analizar',    label:'Analizar documento'},
    {key:'proyecciones',label:'Proyecciones IA'},
    {key:'ratios',      label:'Ratios financieros'},
  ]

  return (
    <div style={{minHeight:'100vh',background:T.bg,display:'flex',fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',system-ui,sans-serif",WebkitFontSmoothing:'antialiased'}}>
      <style>{`*{box-sizing:border-box}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:999px}input:focus,select:focus{border-color:${T.blue}!important;outline:none}`}</style>

      <Sidebar active="/finanzas"/>

      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <header style={{height:56,background:'rgba(251,251,253,.9)',backdropFilter:'saturate(180%) blur(20px)',WebkitBackdropFilter:'saturate(180%) blur(20px)',borderBottom:`.5px solid ${T.hairline}`,display:'flex',alignItems:'center',padding:'0 24px',flexShrink:0,position:'sticky',top:0,zIndex:10}}>
          <div style={{display:'flex',flexDirection:'column',lineHeight:1.1,paddingRight:20,borderRight:`.5px solid ${T.hairline}`,marginRight:4}}>
            <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.3}}>Finanzas</div>
            <div style={{fontSize:11,color:T.text4}}>Conectado a contabilidad en tiempo real</div>
          </div>
          <div style={{display:'flex',height:56}}>
            {sections.map(s=>(
              <button key={s.key} onClick={()=>{setSection(s.key);setMsg(null)}} style={{padding:'0 16px',height:56,background:'none',border:'none',borderBottom:section===s.key?`2px solid ${T.text}`:'2px solid transparent',color:section===s.key?T.text:T.text3,fontWeight:section===s.key?600:400,fontSize:13,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',transition:'all .15s'}}>
                {s.label}
              </button>
            ))}
          </div>
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8}}>
            <button onClick={()=>router.push('/settings')} style={{width:32,height:32,borderRadius:8,border:'none',background:'transparent',display:'grid',placeItems:'center',cursor:'pointer',color:T.text3}} onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,.06)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>{I.gear}</button>
            <ProfileBtn user={user} router={router}/>
          </div>
        </header>

        <div style={{flex:1,overflowY:'auto',padding:'24px 28px'}}>

          {/* ══ RESUMEN ══ */}
          {section==='resumen'&&(
            <div>
              {/* Selector periodo */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                <div style={{display:'flex',gap:6}}>
                  {[{key:'mes',label:'Este mes'},{key:'year',label:'Este año'}].map(p=>(
                    <button key={p.key} onClick={()=>setVista(p.key)} style={{padding:'6px 14px',borderRadius:999,border:`.5px solid ${vista===p.key?T.blue:T.hairline}`,background:vista===p.key?'rgba(0,113,227,.08)':T.card,color:vista===p.key?T.blue:T.text2,fontSize:13,fontWeight:vista===p.key?500:400,cursor:'pointer',fontFamily:'inherit',transition:'all .15s',boxShadow:vista===p.key?`0 0 0 1px ${T.blue}`:'none'}}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <div style={{display:'flex',gap:8}}>
                  <BtnSec onClick={()=>router.push('/contabilidad')} style={{fontSize:12}}>Ver en Contabilidad</BtnSec>
                  <Btn onClick={loadSummary} style={{fontSize:12,padding:'6px 14px'}}>Actualizar</Btn>
                </div>
              </div>

              {/* KPI row principal */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 200px',gap:12,marginBottom:14}}>
                <Card style={{padding:'18px 20px'}}>
                  <div style={{fontSize:12,color:T.text3,fontWeight:500,marginBottom:8}}>Ingresos</div>
                  <div style={{fontSize:32,fontWeight:600,letterSpacing:-1,color:T.text,fontVariantNumeric:'tabular-nums',lineHeight:1,marginBottom:8}}>€{(datos.ingresos||0).toLocaleString('es-ES')}</div>
                  <ProgressBar label="" value={datos.ingresos||0} max={Math.max(datos.ingresos||0,datos.gastos||0,1)} color={T.blue} format={()=>''}/>
                </Card>
                <Card style={{padding:'18px 20px'}}>
                  <div style={{fontSize:12,color:T.text3,fontWeight:500,marginBottom:8}}>Gastos</div>
                  <div style={{fontSize:32,fontWeight:600,letterSpacing:-1,color:T.text,fontVariantNumeric:'tabular-nums',lineHeight:1,marginBottom:8}}>€{(datos.gastos||0).toLocaleString('es-ES')}</div>
                  <ProgressBar label="" value={datos.gastos||0} max={Math.max(datos.ingresos||0,datos.gastos||0,1)} color={T.red} format={()=>''}/>
                </Card>
                <Card style={{padding:'18px 20px'}}>
                  <div style={{fontSize:12,color:T.text3,fontWeight:500,marginBottom:8}}>Resultado neto</div>
                  <div style={{fontSize:32,fontWeight:600,letterSpacing:-1,color:(datos.resultado||0)>=0?T.green:T.red,fontVariantNumeric:'tabular-nums',lineHeight:1,marginBottom:8}}>
                    {(datos.resultado||0)>=0?'+':''}€{Math.abs(datos.resultado||0).toLocaleString('es-ES')}
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <div style={{flex:1,height:6,background:T.sidebar,borderRadius:999,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${Math.min(datos.margen||0,100)}%`,background:(datos.resultado||0)>=0?T.green:T.red,borderRadius:999}}/>
                    </div>
                    <span style={{fontSize:12,fontWeight:600,color:(datos.resultado||0)>=0?T.green:T.red}}>{datos.margen||0}%</span>
                  </div>
                </Card>
                {/* Gauge salud */}
                <Card style={{padding:'16px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                  <Gauge score={health} size={140}/>
                  <div style={{fontSize:12,fontWeight:500,color:healthColor,marginTop:4}}>{healthLabel}</div>
                  <div style={{fontSize:11,color:T.text4,marginTop:2}}>Salud financiera</div>
                </Card>
              </div>

              {/* Grafico tendencia + Top gastos */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:14,marginBottom:14}}>
                <Card>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                    <div>
                      <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2}}>Tendencia 6 meses</div>
                      <div style={{fontSize:12,color:T.text4}}>Ingresos, gastos y resultado neto</div>
                    </div>
                    <div style={{display:'flex',gap:12,fontSize:11,color:T.text3}}>
                      <span><span style={{width:8,height:8,borderRadius:2,background:T.blue,display:'inline-block',marginRight:4,verticalAlign:-1}}/>Ingresos</span>
                      <span><span style={{width:8,height:8,borderRadius:2,background:T.red,display:'inline-block',marginRight:4,verticalAlign:-1}}/>Gastos</span>
                      <span><span style={{width:16,height:2,background:T.green,display:'inline-block',marginRight:4,verticalAlign:3}}/>Resultado</span>
                    </div>
                  </div>
                  <TrendChart data={trend}/>
                  {/* Resumen del grafico */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:14}}>
                    {[
                      {label:'Mejor mes',value:trend.length?`€${Math.max(...trend.map(d=>d.ingresos||0)).toLocaleString('es-ES')}`:'—',color:T.green},
                      {label:'Promedio mensual',value:trend.length?`€${Math.round(trend.reduce((a,d)=>a+(d.ingresos||0),0)/trend.length).toLocaleString('es-ES')}`:'—',color:T.blue},
                      {label:'Total 6 meses',value:trend.length?`€${trend.reduce((a,d)=>a+(d.resultado||0),0).toLocaleString('es-ES')}`:'—',color:(trend.reduce((a,d)=>a+(d.resultado||0),0))>=0?T.green:T.red},
                    ].map((s,i)=>(
                      <div key={i} style={{padding:'10px',background:T.sidebar,borderRadius:10,border:`.5px solid ${T.hairline}`,textAlign:'center'}}>
                        <div style={{fontSize:11,color:T.text4,marginBottom:3}}>{s.label}</div>
                        <div style={{fontSize:14,fontWeight:600,color:s.color,fontVariantNumeric:'tabular-nums'}}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card>
                  <div style={{fontSize:14,fontWeight:600,color:T.text,letterSpacing:-0.2,marginBottom:14}}>Top gastos del año</div>
                  {topGastos.length===0
                    ?<div style={{padding:32,textAlign:'center',color:T.text4,fontSize:12}}>Sin datos de gastos</div>
                    :topGastos.map((g,i)=>(
                      <div key={i} style={{marginBottom:12}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                          <span style={{fontSize:12,color:T.text2,textTransform:'capitalize'}}>{g.categoria?.replace(/_/g,' ')||'Otros'}</span>
                          <span style={{fontSize:12,fontWeight:600,color:T.red,fontVariantNumeric:'tabular-nums'}}>€{g.total.toLocaleString('es-ES')}</span>
                        </div>
                        <div style={{height:5,background:T.sidebar,borderRadius:999,overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${(g.total/maxGasto)*100}%`,background:`rgba(255,59,48,${0.3+0.7*(g.total/maxGasto)})`,borderRadius:999,transition:'width .6s ease'}}/>
                        </div>
                      </div>
                    ))
                  }
                  <div style={{marginTop:16,paddingTop:14,borderTop:`.5px solid ${T.hairline}`}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontSize:12,color:T.text3}}>Total gastos año</span>
                      <span style={{fontSize:14,fontWeight:600,color:T.red,fontVariantNumeric:'tabular-nums'}}>€{(cont.año_actual?.gastos||0).toLocaleString('es-ES')}</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Acciones rapidas */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
                {[
                  {icon:'📄',title:'Analizar documento',  desc:'Sube CSV, Excel o PDF',      action:()=>setSection('analizar'),      color:T.blue},
                  {icon:'🔮',title:'Proyecciones IA',     desc:'3 escenarios a 3 meses',     action:()=>setSection('proyecciones'),  color:T.purple},
                  {icon:'📐',title:'Ratios financieros',  desc:'8 indicadores clave',        action:()=>setSection('ratios'),        color:T.amber},
                  {icon:'📒',title:'Estados financieros', desc:'P&L, Balance, Cash flow',    action:()=>router.push('/contabilidad'),color:T.green},
                ].map(m=>(
                  <div key={m.title} onClick={m.action} style={{padding:'16px',background:T.card,borderRadius:14,border:`.5px solid ${T.hairline}`,cursor:'pointer',transition:'all .15s'}}
                    onMouseEnter={e=>{e.currentTarget.style.background=T.sidebar;e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow=`0 4px 16px rgba(0,0,0,.06)`}}
                    onMouseLeave={e=>{e.currentTarget.style.background=T.card;e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none'}}
                  >
                    <div style={{fontSize:24,marginBottom:10}}>{m.icon}</div>
                    <div style={{fontSize:13,fontWeight:500,color:T.text,marginBottom:3}}>{m.title}</div>
                    <div style={{fontSize:11,color:T.text4}}>{m.desc}</div>
                    <div style={{marginTop:10,fontSize:11,fontWeight:500,color:m.color}}>Abrir →</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ ANALIZAR ══ */}
          {section==='analizar'&&(
            <div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
                {[
                  {key:'financial',icon:'📊',title:'Estado financiero',desc:'CSV, Excel o PDF de estado de cuenta. Genera P&L automatico y health score.'},
                  {key:'general',  icon:'🔍',title:'Analisis libre',   desc:'Cualquier documento — factura, contrato, informe. Vera hace analisis completo.'},
                ].map(m=>(
                  <button key={m.key} onClick={()=>{setUploadMode(m.key);setUploadFile(null);setUploadResult(null)}}
                    style={{padding:'16px',border:`.5px solid ${uploadMode===m.key?T.blue:T.hairline}`,borderRadius:12,background:uploadMode===m.key?'rgba(0,113,227,.06)':T.card,cursor:'pointer',textAlign:'left',transition:'all .15s',fontFamily:'inherit',boxShadow:uploadMode===m.key?`0 0 0 1px ${T.blue}`:'none'}}>
                    <div style={{fontSize:22,marginBottom:8}}>{m.icon}</div>
                    <div style={{fontSize:13,fontWeight:500,color:uploadMode===m.key?T.blue:T.text,marginBottom:4}}>{m.title}</div>
                    <div style={{fontSize:11,color:T.text4,lineHeight:1.5}}>{m.desc}</div>
                  </button>
                ))}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                <Card>
                  <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2,marginBottom:14}}>{uploadMode==='financial'?'Subir estado financiero':'Subir documento'}</div>
                  <form onSubmit={uploadDocument}>
                    <div style={{border:`1.5px dashed ${uploadFile?T.green:T.hairline}`,borderRadius:12,padding:'32px 24px',textAlign:'center',marginBottom:14,background:uploadFile?T.greenSoft:T.sidebar,cursor:'pointer',transition:'all .2s'}}
                      onClick={()=>document.getElementById('financeFile').click()}>
                      <div style={{fontSize:28,marginBottom:8}}>{uploadFile?'✓':uploadMode==='financial'?'📊':'🔍'}</div>
                      <div style={{fontSize:13,fontWeight:500,color:T.text,marginBottom:4}}>{uploadFile?uploadFile.name:'Haz clic para seleccionar'}</div>
                      <div style={{fontSize:11,color:T.text4}}>{uploadMode==='financial'?'CSV, Excel o PDF':'Cualquier formato'}</div>
                      <input id="financeFile" type="file" accept=".csv,.xlsx,.xls,.pdf" style={{display:'none'}} onChange={e=>setUploadFile(e.target.files[0])}/>
                    </div>
                    <Toast msg={msg}/>
                    <Btn disabled={loading||!uploadFile} style={{width:'100%',justifyContent:'center',borderRadius:10,padding:'10px'}}>
                      {loading?'Vera analizando...':'Analizar con Vera'}
                    </Btn>
                  </form>
                </Card>
                <Card>
                  <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2,marginBottom:14}}>Resultado del analisis</div>
                  {!uploadResult?(
                    <div style={{padding:48,textAlign:'center'}}>
                      <div style={{fontSize:32,marginBottom:10,opacity:.2}}>🤖</div>
                      <div style={{fontSize:13,color:T.text4}}>Sube un documento para ver el analisis</div>
                    </div>
                  ):(() => {
                    let ai={}
                    try{ai=JSON.parse(uploadResult.ai_result||'{}')}catch{}
                    return (
                      <div style={{maxHeight:480,overflowY:'auto'}}>
                        <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
                          <span style={{padding:'3px 10px',background:T.greenSoft,color:T.green,borderRadius:999,fontSize:11,fontWeight:500}}>Completado</span>
                        </div>
                        {ai.summary&&<div style={{padding:'12px 14px',background:T.sidebar,borderRadius:10,marginBottom:12,fontSize:13,color:T.text2,lineHeight:1.6}}>{ai.summary}</div>}
                        {(ai.total_income!==undefined)&&(
                          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                            {[
                              {label:'Ingresos', value:`€${(ai.total_income||0).toLocaleString('es-ES')}`,color:T.green},
                              {label:'Gastos',   value:`€${(ai.total_expenses||0).toLocaleString('es-ES')}`,color:T.red},
                              {label:'Resultado',value:`€${(ai.net_profit||0).toLocaleString('es-ES')}`,color:(ai.net_profit||0)>=0?T.green:T.red},
                              {label:'H. Score', value:`${ai.health_score||0}/10`,color:T.amber},
                            ].map(m=>(
                              <div key={m.label} style={{padding:'10px',background:T.sidebar,borderRadius:10,border:`.5px solid ${T.hairline}`,textAlign:'center'}}>
                                <div style={{fontSize:11,color:T.text4,marginBottom:3}}>{m.label}</div>
                                <div style={{fontSize:15,fontWeight:600,color:m.color,fontVariantNumeric:'tabular-nums'}}>{m.value}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        {ai.recommendations?.length>0&&(
                          <div>
                            <div style={{fontSize:11,fontWeight:600,color:T.text3,textTransform:'uppercase',letterSpacing:0.5,marginBottom:8}}>Recomendaciones</div>
                            {ai.recommendations.map((r,i)=>(
                              <div key={i} style={{fontSize:12,color:T.text2,padding:'5px 0',borderBottom:`.5px solid ${T.soft}`,display:'flex',gap:6}}>
                                <span style={{color:T.blue,flexShrink:0}}>→</span>
                                {typeof r==='string'?r:r.accion||JSON.stringify(r)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </Card>
              </div>
            </div>
          )}

          {/* ══ PROYECCIONES ══ */}
          {section==='proyecciones'&&(
            <div style={{display:'grid',gridTemplateColumns:'260px 1fr',gap:20}}>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <Card>
                  <div style={{fontSize:14,fontWeight:600,color:T.text,letterSpacing:-0.2,marginBottom:4}}>Contexto adicional</div>
                  <div style={{fontSize:12,color:T.text3,marginBottom:14,lineHeight:1.5}}>Sube informes o noticias de mercado para enriquecer el analisis.</div>
                  <form onSubmit={uploadContextFile}>
                    <div style={{border:`1.5px dashed ${contextFile?T.green:T.hairline}`,borderRadius:10,padding:'18px',textAlign:'center',marginBottom:10,background:contextFile?T.greenSoft:T.sidebar,cursor:'pointer'}} onClick={()=>document.getElementById('ctxFile').click()}>
                      <div style={{fontSize:20,marginBottom:4}}>🌐</div>
                      <div style={{fontSize:12,color:contextFile?T.text:T.text4}}>{contextFile?contextFile.name:'Subir informe o noticia'}</div>
                      <input id="ctxFile" type="file" accept=".pdf,.csv,.xlsx" style={{display:'none'}} onChange={e=>setContextFile(e.target.files[0])}/>
                    </div>
                    <BtnSec onClick={uploadContextFile} style={{width:'100%',justifyContent:'center',fontSize:12}}>Anadir al contexto</BtnSec>
                  </form>
                  {contextFiles.length>0&&contextFiles.map((f,i)=>(
                    <div key={i} style={{fontSize:12,color:T.text2,padding:'5px 0',borderBottom:`.5px solid ${T.soft}`,display:'flex',gap:6,marginTop:8}}>
                      <span style={{color:T.green}}>✓</span>{f.name}
                    </div>
                  ))}
                </Card>
                <div style={{padding:'10px 14px',background:T.sidebar,borderRadius:10,border:`.5px solid ${T.hairline}`,fontSize:12,color:T.text3,lineHeight:1.5}}>
                  Vera usa datos reales de contabilidad + tendencias economicas de Espana 2025-2026.
                </div>
                <Btn onClick={()=>generateProyecciones(false)} disabled={proyLoading} style={{width:'100%',justifyContent:'center',borderRadius:10,padding:'10px'}}>
                  {proyLoading?'Vera generando...':'Generar proyecciones a 3 meses'}
                </Btn>
                {proyecciones&&(
                  <button onClick={()=>{clearProyecciones();generateProyecciones(true)}} style={{width:'100%',padding:'7px',background:'none',border:`.5px solid ${T.hairline}`,borderRadius:999,fontSize:12,color:T.text3,cursor:'pointer',fontFamily:'inherit',marginTop:6}}>
                    Regenerar nuevas
                  </button>
                )}
              </div>
              <div>
                {!proyecciones&&!proyLoading&&(
                  <Card style={{padding:60,textAlign:'center'}}>
                    <div style={{fontSize:40,marginBottom:14,opacity:.2}}>🔮</div>
                    <div style={{fontSize:16,fontWeight:600,color:T.text,letterSpacing:-0.2,marginBottom:8}}>Proyecciones con datos reales</div>
                    <div style={{fontSize:13,color:T.text3,lineHeight:1.6,maxWidth:360,margin:'0 auto'}}>Vera usara tus datos de contabilidad para generar 3 escenarios. Se guardan 7 dias automaticamente.</div>
                  </Card>
                )}
                {proyLoading&&<Card style={{padding:60,textAlign:'center'}}><div style={{fontSize:13,color:T.text3}}>Vera esta analizando tus datos...</div></Card>}
                {proyecciones?.error&&<Card style={{padding:20,borderLeft:`2px solid ${T.red}`}}><div style={{color:T.red,fontSize:13}}>{proyecciones.error}</div></Card>}
                {proyecciones&&!proyecciones.error&&(
                  <div style={{display:'flex',flexDirection:'column',gap:12}}>
                    {proyecciones._cached&&(
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 14px',background:T.sidebar,borderRadius:10,border:`.5px solid ${T.hairline}`}}>
                        <span style={{fontSize:12,color:T.text3}}>Proyeccion guardada · {new Date(proyecciones._generated_at).toLocaleDateString('es-ES')}</span>
                        <button onClick={()=>{clearProyecciones();generateProyecciones(true)}} style={{fontSize:11,color:T.blue,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',fontWeight:500}}>Regenerar</button>
                      </div>
                    )}
                    {proyecciones.escenarios?.map((esc,i)=>{
                      const c=esc.nombre==='Optimista'?T.green:esc.nombre==='Conservador'?T.amber:T.red
                      const cSoft=esc.nombre==='Optimista'?T.greenSoft:esc.nombre==='Conservador'?T.amberSoft:T.redSoft
                      return (
                        <Card key={i} style={{borderLeft:`2px solid ${c}`}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
                            <div>
                              <div style={{fontSize:14,fontWeight:600,color:c,marginBottom:3}}>{esc.nombre==='Optimista'?'🚀':esc.nombre==='Conservador'?'📊':'⚠️'} {esc.nombre}</div>
                              <div style={{fontSize:12,color:T.text3}}>{esc.descripcion}</div>
                            </div>
                            <span style={{padding:'3px 10px',background:cSoft,color:c,borderRadius:999,fontSize:11,fontWeight:500,flexShrink:0}}>{esc.probabilidad}</span>
                          </div>
                          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
                            {esc.meses?.map((mes,j)=>(
                              <div key={j} style={{padding:'12px',background:cSoft,borderRadius:10,textAlign:'center'}}>
                                <div style={{fontSize:11,fontWeight:500,color:c,marginBottom:6}}>{mes.mes}</div>
                                <div style={{fontSize:11,color:T.text4,marginBottom:1}}>Ingresos</div>
                                <div style={{fontSize:14,fontWeight:600,color:T.green,fontVariantNumeric:'tabular-nums',marginBottom:6}}>€{(mes.ingresos||0).toLocaleString('es-ES')}</div>
                                <div style={{fontSize:11,color:T.text4,marginBottom:1}}>Resultado</div>
                                <div style={{fontSize:14,fontWeight:600,color:(mes.resultado||0)>=0?T.green:T.red,fontVariantNumeric:'tabular-nums'}}>{(mes.resultado||0)>=0?'+':''}€{Math.abs(mes.resultado||0).toLocaleString('es-ES')}</div>
                              </div>
                            ))}
                          </div>
                          {esc.acciones_recomendadas?.length>0&&(
                            <div style={{padding:'10px 12px',background:T.sidebar,borderRadius:10}}>
                              <div style={{fontSize:11,fontWeight:600,color:T.text3,textTransform:'uppercase',letterSpacing:0.5,marginBottom:6}}>Acciones recomendadas</div>
                              {esc.acciones_recomendadas.map((a,j)=><div key={j} style={{fontSize:12,color:T.text2,marginBottom:2}}>→ {a}</div>)}
                            </div>
                          )}
                        </Card>
                      )
                    })}
                    {proyecciones.recomendacion_principal&&(
                      <div style={{padding:'16px 20px',background:T.text,borderRadius:14,display:'flex',gap:12,alignItems:'center'}}>
                        <span style={{fontSize:22}}>⭐</span>
                        <div>
                          <div style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:0.5,marginBottom:4}}>Recomendacion principal de Vera</div>
                          <div style={{fontSize:13,color:'rgba(255,255,255,.9)',lineHeight:1.6}}>{proyecciones.recomendacion_principal}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ RATIOS ══ */}
          {section==='ratios'&&(
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <div>
                  <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2}}>Ratios financieros</div>
                  <div style={{fontSize:12,color:T.text4}}>Calculados automaticamente desde tus datos contables reales.</div>
                </div>
                <Btn onClick={generateRatios} disabled={ratiosLoading}>{ratiosLoading?'Calculando...':'Calcular ratios'}</Btn>
              </div>
              {!ratios&&!ratiosLoading&&(
                <Card style={{padding:60,textAlign:'center'}}>
                  <div style={{fontSize:40,marginBottom:14,opacity:.2}}>📐</div>
                  <div style={{fontSize:16,fontWeight:600,color:T.text,letterSpacing:-0.2,marginBottom:8}}>Analisis de ratios financieros</div>
                  <div style={{fontSize:13,color:T.text3,marginBottom:20,maxWidth:360,margin:'0 auto 20px',lineHeight:1.6}}>Vera calculara ratios de liquidez, rentabilidad, solvencia y eficiencia con tus datos reales.</div>
                  <Btn onClick={generateRatios} style={{padding:'10px 24px',borderRadius:10}}>Calcular mis ratios</Btn>
                </Card>
              )}
              {ratiosLoading&&<Card style={{padding:60,textAlign:'center'}}><div style={{fontSize:13,color:T.text3}}>Calculando ratios financieros...</div></Card>}
              {ratios?.error&&<Card style={{padding:20,borderLeft:`2px solid ${T.red}`}}><div style={{color:T.red,fontSize:13}}>{ratios.error}</div></Card>}
              {ratios&&!ratios.error&&(
                <div>
                  {/* Score global */}
                  {ratios.score_global&&(
                    <Card style={{marginBottom:14,padding:'16px 20px'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <div>
                          <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2}}>Score financiero global</div>
                          <div style={{fontSize:13,color:T.text3,marginTop:4,maxWidth:500}}>{ratios.resumen_ejecutivo}</div>
                        </div>
                        <div style={{textAlign:'center',flexShrink:0,marginLeft:20}}>
                          <div style={{fontSize:40,fontWeight:600,letterSpacing:-1.5,color:ratios.score_global>=7?T.green:ratios.score_global>=5?T.amber:T.red}}>{ratios.score_global}</div>
                          <div style={{fontSize:12,color:T.text4}}>de 10 — {ratios.salud_global}</div>
                        </div>
                      </div>
                    </Card>
                  )}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12,marginBottom:14}}>
                    {ratios.ratios?.map((ratio,i)=>{
                      const sc=ratio.estado==='bueno'?T.green:ratio.estado==='regular'?T.amber:ratio.estado==='malo'?T.red:T.text4
                      const sSoft=ratio.estado==='bueno'?T.greenSoft:ratio.estado==='regular'?T.amberSoft:ratio.estado==='malo'?T.redSoft:T.sidebar
                      return (
                        <Card key={i} style={{borderLeft:`2px solid ${sc}`}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:13,fontWeight:500,color:T.text,marginBottom:2}}>{ratio.nombre}</div>
                              <div style={{fontSize:11,color:T.text4}}>{ratio.benchmark}</div>
                            </div>
                            <div style={{textAlign:'right',flexShrink:0,marginLeft:12}}>
                              <div style={{fontSize:22,fontWeight:600,color:sc,fontVariantNumeric:'tabular-nums'}}>{ratio.valor}</div>
                              <span style={{padding:'2px 8px',background:sSoft,color:sc,borderRadius:999,fontSize:10,fontWeight:500}}>
                                {ratio.estado==='bueno'?'Bueno':ratio.estado==='regular'?'Regular':'Critico'}
                              </span>
                            </div>
                          </div>
                          <div style={{fontSize:12,color:T.text2,lineHeight:1.5,marginBottom:ratio.accion_prioritaria?8:0}}>{ratio.interpretacion}</div>
                          {ratio.accion_prioritaria&&ratio.estado!=='bueno'&&(
                            <div style={{padding:'7px 10px',background:sSoft,borderRadius:8,fontSize:11,color:sc}}>→ {ratio.accion_prioritaria}</div>
                          )}
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
