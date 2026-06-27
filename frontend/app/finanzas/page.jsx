'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import VeraPanel from '@/components/ui/VeraPanel'
import VeraDrawer from '@/components/ui/VeraDrawer'
import VeraInsights from '@/components/ui/VeraInsights'
import { useT, FONT } from '@/components/ui/tokens'
import { Skeleton, EmptyState, PageHeader, SegmentedFilter, ErrorBanner } from '@/components/ui/primitives'
import { useMoney } from '@/lib/money'

import { API_BASE as API } from '@/lib/api'

// ════════════════════════════════════════════════════════════════════════════
// CACHE CONFIG (localStorage + TTL 90s)
// ════════════════════════════════════════════════════════════════════════════
const CACHE_KEY_SUMMARY  = 'vela:finanzas:summary:v2'
const CACHE_KEY_RATIOS   = 'vela:finanzas:ratios:v2'
const CACHE_KEY_VISTA    = 'vela:finanzas:vista'
const CACHE_KEY_SECTION  = 'vela:finanzas:section'
const CACHE_TTL_MS       = 90_000
const CACHE_TTL_LONG_MS  = 24 * 60 * 60 * 1000

function cacheGet(key, ttl = CACHE_TTL_MS) {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { data, t } = JSON.parse(raw)
    if (Date.now() - t > ttl) return { data, stale: true, t }
    return { data, stale: false, t }
  } catch { return null }
}
function cacheSet(key, data) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(key, JSON.stringify({ data, t: Date.now() })) } catch {}
}
function timeAgo(t) {
  if (!t) return '—'
  const s = Math.floor((Date.now() - t) / 1000)
  if (s < 5) return 'ahora'
  if (s < 60) return `hace ${s}s`
  if (s < 3600) return `hace ${Math.floor(s/60)}m`
  return `hace ${Math.floor(s/3600)}h`
}

// ════════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS — paleta reactiva vía useT() (soporta dark mode)
// ════════════════════════════════════════════════════════════════════════════
const Icon = ({ d, size=16, sw=1.5 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>{d}</svg>
)
const I = {
  gear:    <Icon d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 14.5a1.5 1.5 0 0 0 .3 1.7l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.5 1.5 0 0 0-1.7-.3 1.5 1.5 0 0 0-.9 1.4v.4a2 2 0 1 1-4 0v-.2a1.5 1.5 0 0 0-1-1.4 1.5 1.5 0 0 0-1.7.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.5 1.5 0 0 0 .3-1.7 1.5 1.5 0 0 0-1.4-.9H3a2 2 0 1 1 0-4h.1a1.5 1.5 0 0 0 1.4-1 1.5 1.5 0 0 0-.3-1.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.5 1.5 0 0 0 1.7.3h.1a1.5 1.5 0 0 0 .9-1.4V3a2 2 0 1 1 4 0v.1a1.5 1.5 0 0 0 .9 1.4 1.5 1.5 0 0 0 1.7-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.5 1.5 0 0 0-.3 1.7v.1a1.5 1.5 0 0 0 1.4.9H21a2 2 0 1 1 0 4h-.2a1.5 1.5 0 0 0-1.4.9z"/></>} />,
  chevron: <Icon d={<path d="M6 9.5l6 5 6-5"/>} />,
  bell:    <Icon d={<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>} />,
  refresh: <Icon d={<><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>} />,
  sparkle: <Icon d={<><path d="M12 3L13.5 8.5 19 10 13.5 11.5 12 17 10.5 11.5 5 10 10.5 8.5 12 3z"/></>} sw={1.2}/>,
}

// ════════════════════════════════════════════════════════════════════════════
// PRIMITIVOS UI
// ════════════════════════════════════════════════════════════════════════════
function Card({ children, style={}, padding=20 }) {
  const T = useT()
  return <div style={{background:T.card,borderRadius:14,border:`.5px solid ${T.hairline}`,boxShadow:'0 1px 2px rgba(0,0,0,.02)',padding,...style}}>{children}</div>
}
function Btn({ children, onClick, disabled, color, style={} }) {
  const T = useT()
  color = color || T.blue
  return <button onClick={onClick} disabled={disabled} style={{padding:'7px 16px',borderRadius:999,border:'none',fontSize:13,fontWeight:500,cursor:disabled?'not-allowed':'pointer',fontFamily:'inherit',background:disabled?T.sidebar:color,color:disabled?T.text4:'#fff',opacity:disabled?.6:1,display:'inline-flex',alignItems:'center',gap:6,transition:'opacity .15s',...style}}>{children}</button>
}
function BtnSec({ children, onClick, style={}, ...rest }) {
  const T = useT()
  return <button onClick={onClick} {...rest} style={{padding:'7px 16px',borderRadius:999,border:`.5px solid ${T.hairline}`,background:T.card,fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit',color:T.text,display:'inline-flex',alignItems:'center',gap:6,...style}}>{children}</button>
}
function IconBtn({ children, onClick, ariaLabel, style={} }) {
  const T = useT()
  return <button onClick={onClick} aria-label={ariaLabel} style={{width:32,height:32,borderRadius:8,border:`.5px solid ${T.hairline}`,background:T.card,display:'grid',placeItems:'center',cursor:'pointer',color:T.text3,fontFamily:'inherit',...style}}
    onMouseEnter={e=>{e.currentTarget.style.background=T.sidebar;e.currentTarget.style.color=T.text}}
    onMouseLeave={e=>{e.currentTarget.style.background=T.card;e.currentTarget.style.color=T.text3}}>
    {children}
  </button>
}

function Toast({ msg }) {
  const T = useT()
  if (!msg) return null
  const ok = msg.type==='success'
  return <div style={{padding:'10px 14px',background:ok?T.greenSoft:T.redSoft,border:`.5px solid ${ok?T.green:T.red}`,borderRadius:10,color:ok?T.green:T.red,fontSize:13,marginBottom:14}}>{msg.text}</div>
}

function FlagES({ size=14 }) {
  return <svg width={size} height={size*0.66} viewBox="0 0 3 2" style={{borderRadius:2,boxShadow:'0 0 0 .5px rgba(0,0,0,0.1)',flexShrink:0}}>
    <rect width="3" height="2" fill="#AA151B"/>
    <rect y="0.5" width="3" height="1" fill="#F1BF00"/>
  </svg>
}
function GreenDot() { const T = useT(); return <span style={{display:'inline-block',width:7,height:7,borderRadius:'50%',background:T.green}}/> }
function RedDot() { const T = useT(); return <span style={{display:'inline-block',width:7,height:7,borderRadius:'50%',background:T.red,boxShadow:`0 0 0 3px ${T.redSoft}`}}/> }

// ─── PILL GROUP (tabs estilo Vela)
function PillGroup({ items, active, onChange, size='md' }) {
  const T = useT()
  const padding = size==='sm' ? '5px 12px' : '7px 14px'
  const fs = size==='sm' ? 12 : 13
  return (
    <div style={{display:'inline-flex',gap:2,background:T.sidebar,padding:3,borderRadius:10}}>
      {items.map(it => (
        <button key={it.key} onClick={()=>onChange(it.key)}
          style={{padding,background:active===it.key?T.card:'transparent',
            border:active===it.key?`.5px solid ${T.hairline}`:'.5px solid transparent',
            color:active===it.key?T.text:T.text3,
            fontWeight:active===it.key?600:500,fontSize:fs,cursor:'pointer',fontFamily:'inherit',
            display:'inline-flex',alignItems:'center',gap:6,borderRadius:7,whiteSpace:'nowrap',
            boxShadow:active===it.key?'0 1px 2px rgba(0,0,0,.04)':'none',transition:'all .15s'}}>
          {it.label}
          {it.badge !== undefined && it.badge > 0 && (
            <span style={{fontSize:10,fontWeight:600,color:active===it.key?T.text3:T.text4,background:active===it.key?T.sidebar:'rgba(0,0,0,.05)',padding:'1px 6px',borderRadius:8}}>{it.badge}</span>
          )}
        </button>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// GAUGE & TREND CHART (preservados del original)
// ════════════════════════════════════════════════════════════════════════════
function Gauge({ score=0, size=120 }) {
  const T = useT()
  const pct = Math.min(score/10, 1)
  const color = score>=7?T.green:score>=5?T.amber:score>0?T.red:T.text4
  const r=46, cx=size/2, cy=size/2
  const circ=Math.PI*r
  const dash=pct*circ
  return (
    <svg width={size} height={size/2+16} style={{display:'block',overflow:'visible'}}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.sidebar} strokeWidth="10" strokeDasharray={`${circ} ${circ}`} strokeDashoffset={0} transform={`rotate(180 ${cx} ${cy})`} strokeLinecap="round"/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="10" strokeDasharray={`${dash} ${circ}`} strokeDashoffset={0} transform={`rotate(180 ${cx} ${cy})`} strokeLinecap="round" style={{transition:'stroke-dasharray .8s ease'}}/>
      <text x={cx} y={cy+6} textAnchor="middle" fontSize="24" fontWeight="600" fill={color} fontFamily="system-ui">{score||'—'}</text>
      <text x={cx} y={cy+20} textAnchor="middle" fontSize="11" fill={T.text4} fontFamily="system-ui">/10</text>
      <text x={cx-r-4} y={cy+4} textAnchor="end" fontSize="10" fill={T.text4} fontFamily="system-ui">0</text>
      <text x={cx+r+4} y={cy+4} textAnchor="start" fontSize="10" fill={T.text4} fontFamily="system-ui">10</text>
    </svg>
  )
}

function ProgressBar({ label, value, max, color, format }) {
  const T = useT()
  const { fmt } = useMoney()
  const pct = max>0?Math.min(value/max*100,100):0
  return (
    <div style={{marginBottom:10}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
        <span style={{fontSize:12,color:T.text2}}>{label}</span>
        <span style={{fontSize:12,fontWeight:600,color:color||T.text,fontVariantNumeric:'tabular-nums'}}>{format?format(value):fmt(value)}</span>
      </div>
      <div style={{height:6,background:T.sidebar,borderRadius:999,overflow:'hidden'}}>
        <div style={{height:'100%',width:`${pct}%`,background:color||T.blue,borderRadius:999,transition:'width .6s ease'}}/>
      </div>
    </div>
  )
}

function TrendChart({ data=[] }) {
  const T = useT()
  const { fmt, short } = useMoney()
  const [hover,setHover]=useState(null)
  if (!data.length) return (
    <div style={{minHeight:140,display:'grid',placeItems:'center'}}>
      <EmptyState
        icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-5"/></svg>}
        title="Sin movimientos aún"
        hint="Cuando registres ingresos y gastos, verás aquí la evolución de los últimos meses."
      />
    </div>
  )
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
          <text x={padL-6} y={y+3} textAnchor="end" fontSize="9" fill={T.text4} fontFamily="system-ui">{v===0?'0':short(v)}</text>
        </g>
      })}
      {data.map((d,i)=>{
        const gx=padL+groupW*i+groupW/2
        const x1=gx-barW-gap/2
        const x2=gx+gap/2
        const ingH=((d.ingresos||0)/maxVal)*plotH
        const gasH=((d.gastos||0)/maxVal)*plotH
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
                <rect x={gx-58} y={padT+plotH-Math.max(ingH,gasH)-62} width="116" height="56" rx="8" fill={T.text}/>
                <text x={gx} y={padT+plotH-Math.max(ingH,gasH)-46} textAnchor="middle" fontSize="9.5" fill="rgba(255,255,255,.5)" fontFamily="system-ui">Ingresos</text>
                <text x={gx} y={padT+plotH-Math.max(ingH,gasH)-32} textAnchor="middle" fontSize="11" fill={T.cyan} fontFamily="system-ui" fontWeight="600">{fmt(d.ingresos||0)}</text>
                <text x={gx} y={padT+plotH-Math.max(ingH,gasH)-18} textAnchor="middle" fontSize="9.5" fill="rgba(255,255,255,.5)" fontFamily="system-ui">Resultado</text>
                <text x={gx} y={padT+plotH-Math.max(ingH,gasH)-4} textAnchor="middle" fontSize="11" fill={isPos?T.green:T.red} fontFamily="system-ui" fontWeight="600">{isPos?'+':''}{fmt(d.resultado||0)}</text>
              </g>
            )}
          </g>
        )
      })}
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

// ════════════════════════════════════════════════════════════════════════════
// VERA DRAWER (estilo Vela unificado)
// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════
// VERA INSIGHTS CARD (sin emojis, observaciones múltiples)
// ════════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
export default function Finanzas() {
  const T = useT()
  const { fmt } = useMoney()
  const router = useRouter()
  const [section, setSection] = useState('resumen')
  const [summary, setSummary] = useState(null)
  const [summaryT, setSummaryT] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadErr, setLoadErr] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [msg, setMsg] = useState(null)
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [veraOpen, setVeraOpen] = useState(false)

  // Analizar
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadMode, setUploadMode] = useState('financial')
  const [uploadResult, setUploadResult] = useState(null)

  // Proyecciones
  const [contextFiles, setContextFiles] = useState([])
  const [contextFile, setContextFile] = useState(null)
  const [proyecciones, setProyecciones] = useState(null)
  const [proyLoading, setProyLoading] = useState(false)

  // Ratios
  const [ratios, setRatios] = useState(null)
  const [ratiosLoading, setRatiosLoading] = useState(false)

  // Vista
  const [vista, setVista] = useState('mes')

  const getToken = () => localStorage.getItem('vela_token')

  // ─── Bootstrap ────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = getToken()
    if (!t) { router.push('/login'); return }
    setToken(t)
    try { const p = JSON.parse(atob(t.split('.')[1])); setUser({email:p.sub||'',name:p.name||p.sub||'Usuario'}) }
    catch { setUser({email:'',name:'Usuario'}) }

    // Restaurar preferencias
    try {
      const v = cacheGet(CACHE_KEY_VISTA, CACHE_TTL_LONG_MS)
      if (v?.data) setVista(v.data)
      const s = cacheGet(CACHE_KEY_SECTION, CACHE_TTL_LONG_MS)
      if (s?.data) setSection(s.data)
    } catch {}

    // Stale-while-revalidate: pintar cache primero, refetch después
    const cached = cacheGet(CACHE_KEY_SUMMARY)
    if (cached?.data) {
      setSummary(cached.data)
      setSummaryT(cached.t)
    }
    loadSummary(!cached?.data)  // si no había cache, mostrar loading
  }, [])

  useEffect(() => { cacheSet(CACHE_KEY_VISTA, vista) }, [vista])
  useEffect(() => { cacheSet(CACHE_KEY_SECTION, section) }, [section])

  // Auto-refresh background cada 90s si la pestaña está activa
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') loadSummary(false, true)
    }, CACHE_TTL_MS)
    return () => clearInterval(id)
  }, [])

  // ─── Loaders ─────────────────────────────────────────────────────────────
  async function loadSummary(showLoading=true, isBackground=false) {
    if (showLoading) setLoading(true)
    if (isBackground) setRefreshing(true)
    try {
      const r = await fetch(`${API}/api/finance/summary`, { headers:{ Authorization:`Bearer ${getToken()}` } })
      if (!r.ok) throw new Error()
      const data = await r.json()
      setSummary(data)
      const t = Date.now()
      setSummaryT(t)
      cacheSet(CACHE_KEY_SUMMARY, data)
      setLoadErr(false)
    } catch { setLoadErr(true) }
    finally { setLoading(false); setRefreshing(false) }
  }

  async function uploadDocument(e) {
    e.preventDefault(); if (!uploadFile) return
    setLoading(true); setMsg(null); setUploadResult(null)
    const fd = new FormData(); fd.append('file', uploadFile); fd.append('module', 'finance')
    const res = await fetch(`${API}/api/upload/`, { method:'POST', headers:{ Authorization:`Bearer ${getToken()}` }, body: fd })
    const data = await res.json()
    if (res.ok) { setUploadResult(data); setMsg({type:'success',text:`Documento analizado · ID: ${data.id}`}); loadSummary(false, true) }
    else setMsg({type:'error',text:data.detail||'Error al subir el archivo'})
    setLoading(false)
  }

  async function uploadContextFile(e) {
    e.preventDefault(); if (!contextFile) return
    setLoading(true)
    const fd = new FormData(); fd.append('file', contextFile); fd.append('module', 'marketing')
    const res = await fetch(`${API}/api/upload/`, { method:'POST', headers:{ Authorization:`Bearer ${getToken()}` }, body: fd })
    const data = await res.json()
    if (res.ok) { setContextFiles(prev => [...prev, {name:contextFile.name, id:data.id}]); setContextFile(null) }
    setLoading(false)
  }

  async function generateProyecciones(force=false) {
    setProyLoading(true); setProyecciones(null)
    try {
      if (!force && contextFiles.length === 0) {
        const cached = await fetch(`${API}/api/finance/proyecciones/cached`, { headers:{Authorization:`Bearer ${getToken()}`} })
        if (cached.ok) {
          const cd = await cached.json()
          if (cd.cached && cd.data) {
            setProyecciones({...cd.data, _cached:true, _generated_at:cd.generated_at})
            setProyLoading(false); return
          }
        }
      }
      const res = await fetch(`${API}/api/finance/proyecciones`, {
        method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},
        body: JSON.stringify({context_document_ids: contextFiles.map(f=>f.id).filter(Boolean), meses_historico:6})
      })
      setProyecciones(await res.json())
    } catch { setProyecciones({error:'No se pudieron generar las proyecciones'}) }
    finally { setProyLoading(false) }
  }

  async function clearProyecciones() {
    await fetch(`${API}/api/finance/proyecciones/cached`, { method:'DELETE', headers:{Authorization:`Bearer ${getToken()}`} })
    setProyecciones(null)
  }

  async function generateRatios() {
    setRatiosLoading(true); setRatios(null)
    try {
      // Mirar cache primero
      const cached = cacheGet(CACHE_KEY_RATIOS, CACHE_TTL_LONG_MS)
      if (cached?.data && !cached.stale) {
        setRatios({...cached.data, _cached: true, _t: cached.t})
        setRatiosLoading(false)
        return
      }
      const res = await fetch(`${API}/api/finance/ratios`, { headers:{Authorization:`Bearer ${getToken()}`} })
      const data = await res.json()
      setRatios(data)
      cacheSet(CACHE_KEY_RATIOS, data)
    } catch { setRatios({error:'No se pudieron calcular los ratios'}) }
    finally { setRatiosLoading(false) }
  }

  // ─── Derivados ───────────────────────────────────────────────────────────
  const cont = summary?.contabilidad || {}
  const datos = vista==='mes' ? (cont.mes_actual || {}) : (cont.año_actual || {})
  const trend = cont.monthly_trend || []
  const topGastos = cont.top_gastos || []
  const maxGasto = Math.max(...topGastos.map(g => g.total), 1)
  const margen = datos.margen || 0
  const healthCalc = margen >= 30 ? 9 : margen >= 20 ? 8 : margen >= 10 ? 6 : margen >= 0 ? 4 : 2
  const health = datos.health_score || healthCalc
  const healthLabel = health>=7?'Saludable':health>=5?'Regular':health>0?'Crítico':'Sin datos'
  const healthColor = health>=7?T.green:health>=5?T.amber:health>0?T.red:T.text4

  // Variación vs mes anterior
  const trendData = trend.length >= 2 ? trend.slice(-2) : []
  const prevRes = trendData[0]?.resultado || 0
  const currRes = trendData[1]?.resultado || 0
  const variacion = prevRes !== 0 ? Math.round(((currRes - prevRes) / Math.abs(prevRes)) * 100) : 0

  // Alertas
  const alertas = useMemo(() => {
    const out = []
    if (margen < 0) out.push({type:'red',text:'Margen negativo este periodo'})
    else if (margen < 5 && datos.ingresos > 0) out.push({type:'amber',text:'Margen muy bajo (<5%)'})
    if (variacion < -20) out.push({type:'amber',text:`Resultado bajó ${Math.abs(variacion)}% vs mes anterior`})
    return out
  }, [margen, variacion, datos.ingresos])

  // KPIs para Vera
  const veraKpis = useMemo(() => ({
    ingresos: datos.ingresos || 0,
    gastos: datos.gastos || 0,
    margen,
    topCategoria: topGastos[0]?.categoria || null,
  }), [datos, margen, topGastos])

  const sections = [
    { key:'resumen',     label:'Resumen' },
    { key:'analizar',    label:'Analizar documento' },
    { key:'proyecciones',label:'Proyecciones IA' },
    { key:'ratios',      label:'Ratios financieros' },
  ]

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{minHeight:'100dvh',background:T.bg,display:'flex',fontFamily:FONT,WebkitFontSmoothing:'antialiased'}}>
      <style>{`*{box-sizing:border-box}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:${T.hairline};border-radius:999px}input:focus,select:focus{border-color:${T.blue}!important;outline:none}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.spin{animation:spin 1s linear infinite}@media (max-width:768px){.fin-kpis{grid-template-columns:repeat(auto-fit,minmax(180px,1fr))!important}.fin-row{grid-template-columns:1fr!important}.fin-3{grid-template-columns:repeat(auto-fit,minmax(120px,1fr))!important}.fin-4{grid-template-columns:repeat(auto-fit,minmax(160px,1fr))!important}.fin-2{grid-template-columns:1fr!important}.fin-proy{grid-template-columns:1fr!important}}@media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}}`}</style>

      <Sidebar active="/finanzas"/>

      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>

        <PageHeader
          title="Finanzas"
          subtitle={
            <span style={{display:'inline-flex',alignItems:'center',gap:6}}>
              <FlagES size={12}/> España
              <span style={{color:T.text4}}>·</span>
              <span style={{color:margen>=0?T.green:T.red,fontWeight:500}}>margen {margen}%</span>
              <span style={{color:T.text4}}>·</span>
              IVA 21%
              <span style={{marginLeft:4}}>{alertas.length===0?<GreenDot/>:<RedDot/>}</span>
            </span>
          }
          tabs={sections}
          activeTab={section}
          onTab={(k)=>{setSection(k);setMsg(null)}}
          primary={
            section==='resumen'
              ? {label:'Analizar documento',onClick:()=>setSection('analizar'),icon:<span aria-hidden="true" style={{fontSize:16,lineHeight:0,marginRight:1}}>+</span>}
              : section==='ratios'
                ? {label:'Calcular ratios',onClick:generateRatios,disabled:ratiosLoading}
                : undefined
          }
          secondary={
            <span style={{display:'inline-flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:11,color:T.text4,fontVariantNumeric:'tabular-nums'}}>
                {refreshing ? 'Actualizando…' : `Actualizado ${timeAgo(summaryT)}`}
              </span>
              <IconBtn onClick={()=>loadSummary(false, true)} ariaLabel="Refrescar">
                <span className={refreshing ? 'spin' : ''} style={{display:'flex'}}>{I.refresh}</span>
              </IconBtn>
            </span>
          }
          filters={section==='resumen'
            ? <SegmentedFilter
                label="Vista"
                items={[{key:'mes',label:'Este mes'},{key:'year',label:'Este año'}]}
                active={vista}
                onChange={setVista}
              />
            : undefined
          }
          onVera={()=>setVeraOpen(true)}
          user={user} router={router}
        />

        <div className="fade-in" style={{flex:1,overflowY:'auto'}}>
          <div style={{ padding: '16px 24px 0' }}><ErrorBanner show={loadErr && !summary} onRetry={() => loadSummary()} /></div>
          {/* CONTENIDO */}
          <div style={{padding:'20px 28px 60px'}}>

            {/* ══════════════════════════════════════════════════════════════
                SECCIÓN: RESUMEN
                ══════════════════════════════════════════════════════════════ */}
            {section==='resumen' && (
              <div>
                {/* Alertas si hay */}
                {alertas.length > 0 && (
                  <div style={{marginBottom:16,display:'flex',flexDirection:'column',gap:8}}>
                    {alertas.map((a,i)=>(
                      <div key={i} style={{padding:'10px 14px',background:a.type==='red'?T.redSoft:T.amberSoft,border:`.5px solid ${a.type==='red'?T.red:T.amber}30`,borderRadius:10,fontSize:12,color:a.type==='red'?T.red:T.amber,display:'flex',alignItems:'center',gap:8}}>
                        <span style={{width:6,height:6,borderRadius:'50%',background:a.type==='red'?T.red:T.amber}}/>
                        {a.text}
                      </div>
                    ))}
                  </div>
                )}

                {/* Vera Insights Card */}
                <VeraInsights modulo="finanzas" />

                {/* KPI ROW */}
                <div className="fin-kpis" style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 200px',gap:12,marginBottom:14}}>
                  <Card padding={18}>
                    <div style={{fontSize:11,color:T.text4,fontWeight:500,letterSpacing:.3,textTransform:'uppercase',marginBottom:8}}>Ingresos</div>
                    <div style={{fontSize:30,fontWeight:600,letterSpacing:-.8,color:T.text,fontVariantNumeric:'tabular-nums',lineHeight:1,marginBottom:10}}>{fmt(datos.ingresos||0)}</div>
                    <ProgressBar label="" value={datos.ingresos||0} max={Math.max(datos.ingresos||0,datos.gastos||0,1)} color={T.blue} format={()=>''}/>
                  </Card>
                  <Card padding={18}>
                    <div style={{fontSize:11,color:T.text4,fontWeight:500,letterSpacing:.3,textTransform:'uppercase',marginBottom:8}}>Gastos</div>
                    <div style={{fontSize:30,fontWeight:600,letterSpacing:-.8,color:T.text,fontVariantNumeric:'tabular-nums',lineHeight:1,marginBottom:10}}>{fmt(datos.gastos||0)}</div>
                    <ProgressBar label="" value={datos.gastos||0} max={Math.max(datos.ingresos||0,datos.gastos||0,1)} color={T.red} format={()=>''}/>
                  </Card>
                  <Card padding={18}>
                    <div style={{fontSize:11,color:T.text4,fontWeight:500,letterSpacing:.3,textTransform:'uppercase',marginBottom:8}}>Resultado neto</div>
                    <div style={{fontSize:30,fontWeight:600,letterSpacing:-.8,color:(datos.resultado||0)>=0?T.green:T.red,fontVariantNumeric:'tabular-nums',lineHeight:1,marginBottom:10}}>
                      {(datos.resultado||0)>=0?'+':''}{fmt(Math.abs(datos.resultado||0))}
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <div style={{flex:1,height:6,background:T.sidebar,borderRadius:999,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${Math.min(Math.abs(margen),100)}%`,background:(datos.resultado||0)>=0?T.green:T.red,borderRadius:999}}/>
                      </div>
                      <span style={{fontSize:12,fontWeight:600,color:(datos.resultado||0)>=0?T.green:T.red,fontVariantNumeric:'tabular-nums'}}>{margen}%</span>
                    </div>
                  </Card>
                  <Card padding={16} style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                    <Gauge score={health} size={130}/>
                    <div style={{fontSize:12,fontWeight:500,color:healthColor,marginTop:4}}>{healthLabel}</div>
                    <div style={{fontSize:11,color:T.text4,marginTop:2}}>Salud financiera</div>
                  </Card>
                </div>

                {/* GRÁFICO + TOP GASTOS */}
                <div className="fin-row" style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:14,marginBottom:14}}>
                  <Card>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                      <div>
                        <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-.2}}>Tendencia 6 meses</div>
                        <div style={{fontSize:12,color:T.text4}}>Ingresos, gastos y resultado neto</div>
                      </div>
                      <div style={{display:'flex',gap:12,fontSize:11,color:T.text3}}>
                        <span><span style={{width:8,height:8,borderRadius:2,background:T.blue,display:'inline-block',marginRight:4,verticalAlign:-1}}/>Ingresos</span>
                        <span><span style={{width:8,height:8,borderRadius:2,background:T.red,display:'inline-block',marginRight:4,verticalAlign:-1}}/>Gastos</span>
                        <span><span style={{width:16,height:2,background:T.green,display:'inline-block',marginRight:4,verticalAlign:3}}/>Resultado</span>
                      </div>
                    </div>
                    <TrendChart data={trend}/>
                    <div className="fin-3" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:14}}>
                      {[
                        {label:'Mejor mes',value:trend.length?fmt(Math.max(...trend.map(d=>d.ingresos||0))):'—',color:T.green},
                        {label:'Promedio mensual',value:trend.length?fmt(Math.round(trend.reduce((a,d)=>a+(d.ingresos||0),0)/trend.length)):'—',color:T.blue},
                        {label:'Total 6 meses',value:trend.length?fmt(trend.reduce((a,d)=>a+(d.resultado||0),0)):'—',color:trend.reduce((a,d)=>a+(d.resultado||0),0)>=0?T.green:T.red},
                      ].map((s,i)=>(
                        <div key={i} style={{padding:'10px',background:T.sidebar,borderRadius:10,border:`.5px solid ${T.hairline}`,textAlign:'center'}}>
                          <div style={{fontSize:11,color:T.text4,marginBottom:3}}>{s.label}</div>
                          <div style={{fontSize:14,fontWeight:600,color:s.color,fontVariantNumeric:'tabular-nums'}}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card>
                    <div style={{fontSize:14,fontWeight:600,color:T.text,letterSpacing:-.2,marginBottom:14}}>Top gastos del año</div>
                    {topGastos.length===0
                      ? <EmptyState
                          icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
                          title="Sin gastos registrados"
                          hint="Tus principales categorías de gasto aparecerán aquí."
                        />
                      : topGastos.map((g,i)=>(
                        <div key={i} style={{marginBottom:12}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                            <span style={{fontSize:12,color:T.text2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',marginRight:8}}>{g.categoria?.replace(/_/g,' ')||'Otros'}</span>
                            <span style={{fontSize:12,fontWeight:600,color:T.red,fontVariantNumeric:'tabular-nums',flexShrink:0}}>{fmt(g.total)}</span>
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
                        <span style={{fontSize:14,fontWeight:600,color:T.red,fontVariantNumeric:'tabular-nums'}}>{fmt(cont.año_actual?.gastos||0)}</span>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* ACCIONES RÁPIDAS */}
                <div className="fin-4" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
                  {[
                    {icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,title:'Analizar documento', desc:'Sube CSV, Excel o PDF',     action:()=>setSection('analizar'),       color:T.blue},
                    {icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-5"/></svg>,title:'Proyecciones IA',    desc:'3 escenarios a 3 meses',    action:()=>setSection('proyecciones'),   color:T.purple},
                    {icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,title:'Ratios financieros', desc:'8 indicadores clave',       action:()=>setSection('ratios'),         color:T.amber},
                    {icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,title:'Estados financieros',desc:'P&L, Balance, Cash flow',   action:()=>router.push('/contabilidad'), color:T.green},
                  ].map(m => (
                    <div key={m.title} className="hover-lift" onClick={m.action} style={{padding:'16px',background:T.card,borderRadius:14,border:`.5px solid ${T.hairline}`,cursor:'pointer',transition:'all .15s'}}
                      onMouseEnter={e=>{e.currentTarget.style.background=T.sidebar;e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.06)'}}
                      onMouseLeave={e=>{e.currentTarget.style.background=T.card;e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none'}}>
                      <div style={{width:38,height:38,borderRadius:10,background:`${m.color}15`,color:m.color,display:'grid',placeItems:'center',marginBottom:10}}>{m.icon}</div>
                      <div style={{fontSize:13,fontWeight:500,color:T.text,marginBottom:3}}>{m.title}</div>
                      <div style={{fontSize:11,color:T.text4}}>{m.desc}</div>
                      <div style={{marginTop:10,fontSize:11,fontWeight:500,color:m.color}}>Abrir →</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                SECCIÓN: ANALIZAR
                ══════════════════════════════════════════════════════════════ */}
            {section==='analizar' && (
              <div>
                <div className="fin-2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
                  {[
                    {key:'financial',iconName:'chart',title:'Estado financiero',desc:'CSV, Excel o PDF de estado de cuenta. Genera P&L automático y health score.'},
                    {key:'general',  iconName:'search',title:'Análisis libre',   desc:'Cualquier documento — factura, contrato, informe. Vera hace análisis completo.'},
                  ].map(m => (
                    <button key={m.key} onClick={()=>{setUploadMode(m.key);setUploadFile(null);setUploadResult(null)}}
                      style={{padding:'16px',border:`.5px solid ${uploadMode===m.key?T.blue:T.hairline}`,borderRadius:12,background:uploadMode===m.key?'rgba(61,43,255,.06)':T.card,cursor:'pointer',textAlign:'left',transition:'all .15s',fontFamily:'inherit',boxShadow:uploadMode===m.key?`0 0 0 1px ${T.blue}`:'none'}}>
                      <div style={{width:36,height:36,borderRadius:9,background:`${uploadMode===m.key?T.blue:T.text4}15`,color:uploadMode===m.key?T.blue:T.text3,display:'grid',placeItems:'center',marginBottom:8}}>{m.iconName==='chart' ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>}</div>
                      <div style={{fontSize:13,fontWeight:500,color:uploadMode===m.key?T.blue:T.text,marginBottom:4}}>{m.title}</div>
                      <div style={{fontSize:11,color:T.text4,lineHeight:1.5}}>{m.desc}</div>
                    </button>
                  ))}
                </div>
                <div className="fin-2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                  <Card>
                    <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-.2,marginBottom:14}}>{uploadMode==='financial'?'Subir estado financiero':'Subir documento'}</div>
                    <form onSubmit={uploadDocument}>
                      <div style={{border:`1.5px dashed ${uploadFile?T.green:T.hairline}`,borderRadius:12,padding:'32px 24px',textAlign:'center',marginBottom:14,background:uploadFile?T.greenSoft:T.sidebar,cursor:'pointer',transition:'all .2s'}}
                        onClick={()=>document.getElementById('financeFile').click()}>
                        <div style={{width:40,height:40,borderRadius:10,background:uploadFile?T.greenSoft:T.card,color:uploadFile?T.green:T.text3,display:'grid',placeItems:'center',margin:'0 auto 10px',border:`.5px solid ${T.hairline}`}}>{uploadFile ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>}</div>
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
                    <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-.2,marginBottom:14}}>Resultado del análisis</div>
                    {!uploadResult ? (
                      <div style={{padding:48,textAlign:'center'}}>
                        <div style={{width:48,height:48,borderRadius:12,background:T.sidebar,color:T.text4,display:'grid',placeItems:'center',margin:'0 auto 12px'}}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg></div>
                        <div style={{fontSize:13,color:T.text4}}>Sube un documento para ver el análisis</div>
                      </div>
                    ) : (() => {
                      let ai = {}
                      try { ai = JSON.parse(uploadResult.ai_result || '{}') } catch {}
                      return (
                        <div style={{maxHeight:480,overflowY:'auto'}}>
                          <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
                            <span style={{padding:'3px 10px',background:T.greenSoft,color:T.green,borderRadius:999,fontSize:11,fontWeight:500}}>Completado</span>
                          </div>
                          {ai.summary && <div style={{padding:'12px 14px',background:T.sidebar,borderRadius:10,marginBottom:12,fontSize:13,color:T.text2,lineHeight:1.6}}>{ai.summary}</div>}
                          {(ai.total_income !== undefined) && (
                            <div className="fin-2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                              {[
                                {label:'Ingresos', value:fmt(ai.total_income||0),color:T.green},
                                {label:'Gastos',   value:fmt(ai.total_expenses||0),color:T.red},
                                {label:'Resultado',value:fmt(ai.net_profit||0),color:(ai.net_profit||0)>=0?T.green:T.red},
                                {label:'H. Score', value:`${ai.health_score||0}/10`,color:T.amber},
                              ].map(m => (
                                <div key={m.label} style={{padding:'10px',background:T.sidebar,borderRadius:10,border:`.5px solid ${T.hairline}`,textAlign:'center'}}>
                                  <div style={{fontSize:11,color:T.text4,marginBottom:3}}>{m.label}</div>
                                  <div style={{fontSize:15,fontWeight:600,color:m.color,fontVariantNumeric:'tabular-nums'}}>{m.value}</div>
                                </div>
                              ))}
                            </div>
                          )}
                          {ai.recommendations?.length > 0 && (
                            <div>
                              <div style={{fontSize:11,fontWeight:600,color:T.text3,textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>Recomendaciones</div>
                              {ai.recommendations.map((r,i) => (
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

            {/* ══════════════════════════════════════════════════════════════
                SECCIÓN: PROYECCIONES
                ══════════════════════════════════════════════════════════════ */}
            {section==='proyecciones' && (
              <div className="fin-proy" style={{display:'grid',gridTemplateColumns:'260px 1fr',gap:20}}>
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  <Card>
                    <div style={{fontSize:14,fontWeight:600,color:T.text,letterSpacing:-.2,marginBottom:4}}>Contexto adicional</div>
                    <div style={{fontSize:12,color:T.text3,marginBottom:14,lineHeight:1.5}}>Sube informes o noticias de mercado para enriquecer el análisis.</div>
                    <form onSubmit={uploadContextFile}>
                      <div style={{border:`1.5px dashed ${contextFile?T.green:T.hairline}`,borderRadius:10,padding:'18px',textAlign:'center',marginBottom:10,background:contextFile?T.greenSoft:T.sidebar,cursor:'pointer'}} onClick={()=>document.getElementById('ctxFile').click()}>
                        <div style={{width:32,height:32,borderRadius:8,background:T.card,color:T.text3,display:'grid',placeItems:'center',margin:'0 auto 6px',border:`.5px solid ${T.hairline}`}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></div>
                        <div style={{fontSize:12,color:contextFile?T.text:T.text4}}>{contextFile?contextFile.name:'Subir informe o noticia'}</div>
                        <input id="ctxFile" type="file" accept=".pdf,.csv,.xlsx" style={{display:'none'}} onChange={e=>setContextFile(e.target.files[0])}/>
                      </div>
                      <BtnSec onClick={uploadContextFile} style={{width:'100%',justifyContent:'center',fontSize:12}}>Añadir al contexto</BtnSec>
                    </form>
                    {contextFiles.length>0 && contextFiles.map((f,i) => (
                      <div key={i} style={{fontSize:12,color:T.text2,padding:'5px 0',borderBottom:`.5px solid ${T.soft}`,display:'flex',gap:6,marginTop:8}}>
                        <span style={{color:T.green}}>✓</span>{f.name}
                      </div>
                    ))}
                  </Card>
                  <div style={{padding:'10px 14px',background:T.sidebar,borderRadius:10,border:`.5px solid ${T.hairline}`,fontSize:12,color:T.text3,lineHeight:1.5}}>
                    Vera usa datos reales de contabilidad + tendencias económicas de España 2025-2026.
                  </div>
                  <Btn onClick={()=>generateProyecciones(false)} disabled={proyLoading} style={{width:'100%',justifyContent:'center',borderRadius:10,padding:'10px'}}>
                    {proyLoading?'Vera generando...':'Generar proyecciones a 3 meses'}
                  </Btn>
                  {proyecciones && (
                    <button onClick={()=>{clearProyecciones();generateProyecciones(true)}} style={{width:'100%',padding:'7px',background:'none',border:`.5px solid ${T.hairline}`,borderRadius:999,fontSize:12,color:T.text3,cursor:'pointer',fontFamily:'inherit',marginTop:6}}>
                      Regenerar nuevas
                    </button>
                  )}
                </div>
                <div>
                  {!proyecciones && !proyLoading && (
                    <Card style={{padding:60,textAlign:'center'}}>
                      <div style={{width:56,height:56,borderRadius:14,background:T.purpleSoft,color:T.purple,display:'grid',placeItems:'center',margin:'0 auto 14px'}}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-5"/></svg></div>
                      <div style={{fontSize:16,fontWeight:600,color:T.text,letterSpacing:-.2,marginBottom:8}}>Proyecciones con datos reales</div>
                      <div style={{fontSize:13,color:T.text3,lineHeight:1.6,maxWidth:360,margin:'0 auto'}}>Vera usará tus datos de contabilidad para generar 3 escenarios. Se guardan 7 días automáticamente.</div>
                    </Card>
                  )}
                  {proyLoading && (
                    <Card style={{display:'flex',flexDirection:'column',gap:12}}>
                      <Skeleton w={200} h={16}/>
                      <Skeleton w="100%" h={120} radius={10}/>
                      <Skeleton w="100%" h={120} radius={10}/>
                      <Skeleton w="100%" h={120} radius={10}/>
                    </Card>
                  )}
                  {proyecciones?.error && <Card style={{padding:20,borderLeft:`2px solid ${T.red}`}}><div style={{color:T.red,fontSize:13}}>{proyecciones.error}</div></Card>}
                  {proyecciones && !proyecciones.error && (
                    <div style={{display:'flex',flexDirection:'column',gap:12}}>
                      {proyecciones._cached && (
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 14px',background:T.sidebar,borderRadius:10,border:`.5px solid ${T.hairline}`}}>
                          <span style={{fontSize:12,color:T.text3}}>Proyección guardada · {new Date(proyecciones._generated_at).toLocaleDateString('es-ES')}</span>
                          <button onClick={()=>{clearProyecciones();generateProyecciones(true)}} style={{fontSize:11,color:T.blue,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',fontWeight:500}}>Regenerar</button>
                        </div>
                      )}
                      {proyecciones.escenarios?.map((esc,i) => {
                        const c = esc.nombre==='Optimista'?T.green:esc.nombre==='Conservador'?T.amber:T.red
                        const cSoft = esc.nombre==='Optimista'?T.greenSoft:esc.nombre==='Conservador'?T.amberSoft:T.redSoft
                        return (
                          <Card key={i} style={{borderLeft:`2px solid ${c}`}}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
                              <div>
                                <div style={{fontSize:14,fontWeight:600,color:c,marginBottom:3}}>{esc.nombre}</div>
                                <div style={{fontSize:12,color:T.text3}}>{esc.descripcion}</div>
                              </div>
                              <span style={{padding:'3px 10px',background:cSoft,color:c,borderRadius:999,fontSize:11,fontWeight:500,flexShrink:0}}>{esc.probabilidad}</span>
                            </div>
                            <div className="fin-3" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
                              {esc.meses?.map((mes,j) => (
                                <div key={j} style={{padding:'12px',background:cSoft,borderRadius:10,textAlign:'center'}}>
                                  <div style={{fontSize:11,fontWeight:500,color:c,marginBottom:6}}>{mes.mes}</div>
                                  <div style={{fontSize:11,color:T.text4,marginBottom:1}}>Ingresos</div>
                                  <div style={{fontSize:14,fontWeight:600,color:T.green,fontVariantNumeric:'tabular-nums',marginBottom:6}}>{fmt(mes.ingresos||0)}</div>
                                  <div style={{fontSize:11,color:T.text4,marginBottom:1}}>Resultado</div>
                                  <div style={{fontSize:14,fontWeight:600,color:(mes.resultado||0)>=0?T.green:T.red,fontVariantNumeric:'tabular-nums'}}>{(mes.resultado||0)>=0?'+':''}{fmt(Math.abs(mes.resultado||0))}</div>
                                </div>
                              ))}
                            </div>
                            {esc.acciones?.length > 0 && (
                              <div style={{padding:'10px 12px',background:T.sidebar,borderRadius:10}}>
                                <div style={{fontSize:11,fontWeight:600,color:T.text3,textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>Acciones recomendadas</div>
                                {esc.acciones.map((a,j) => <div key={j} style={{fontSize:12,color:T.text2,marginBottom:2}}>→ {a}</div>)}
                              </div>
                            )}
                          </Card>
                        )
                      })}
                      {proyecciones.recomendacion_principal && (
                        <div style={{padding:'16px 20px',background:T.text,borderRadius:14,display:'flex',gap:12,alignItems:'center'}}>
                          <div style={{width:32,height:32,borderRadius:9,background:'rgba(255,255,255,.1)',color:'#fff',display:'grid',placeItems:'center',flexShrink:0}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
                          <div>
                            <div style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:.5,marginBottom:4}}>Recomendación principal de Vera</div>
                            <div style={{fontSize:13,color:'rgba(255,255,255,.9)',lineHeight:1.6}}>{proyecciones.recomendacion_principal}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                SECCIÓN: RATIOS
                ══════════════════════════════════════════════════════════════ */}
            {section==='ratios' && (
              <div>
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-.2}}>Ratios financieros</div>
                  <div style={{fontSize:12,color:T.text4}}>Calculados automáticamente desde tus datos contables reales.</div>
                </div>
                {!ratios && !ratiosLoading && (
                  <Card style={{padding:60,textAlign:'center'}}>
                    <div style={{width:56,height:56,borderRadius:14,background:T.amberSoft,color:T.amber,display:'grid',placeItems:'center',margin:'0 auto 14px'}}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div>
                    <div style={{fontSize:16,fontWeight:600,color:T.text,letterSpacing:-.2,marginBottom:8}}>Análisis de ratios financieros</div>
                    <div style={{fontSize:13,color:T.text3,marginBottom:20,maxWidth:360,margin:'0 auto 20px',lineHeight:1.6}}>Vera calculará ratios de liquidez, rentabilidad, solvencia y eficiencia con tus datos reales.</div>
                    <Btn onClick={generateRatios} style={{padding:'10px 24px',borderRadius:10}}>Calcular mis ratios</Btn>
                  </Card>
                )}
                {ratiosLoading && (
                  <div className="fin-2" style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12}}>
                    {[0,1,2,3].map(i=>(
                      <Card key={i} style={{display:'flex',flexDirection:'column',gap:10}}>
                        <Skeleton w={140} h={14}/>
                        <Skeleton w={80} h={22}/>
                        <Skeleton w="100%" h={32} radius={8}/>
                      </Card>
                    ))}
                  </div>
                )}
                {ratios?.error && <Card style={{padding:20,borderLeft:`2px solid ${T.red}`}}><div style={{color:T.red,fontSize:13}}>{ratios.error}</div></Card>}
                {ratios && !ratios.error && (
                  <div>
                    {ratios._cached && (
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 14px',background:T.sidebar,borderRadius:10,border:`.5px solid ${T.hairline}`,marginBottom:14}}>
                        <span style={{fontSize:12,color:T.text3}}>Ratios cacheados · {timeAgo(ratios._t)}</span>
                        <button onClick={()=>{localStorage.removeItem(CACHE_KEY_RATIOS);generateRatios()}} style={{fontSize:11,color:T.blue,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',fontWeight:500}}>Recalcular</button>
                      </div>
                    )}
                    {ratios.score_global && (
                      <Card style={{marginBottom:14,padding:'16px 20px'}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                          <div>
                            <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-.2}}>Score financiero global</div>
                            <div style={{fontSize:13,color:T.text3,marginTop:4,maxWidth:500,lineHeight:1.5}}>{ratios.resumen_ejecutivo}</div>
                          </div>
                          <div style={{textAlign:'center',flexShrink:0,marginLeft:20}}>
                            <div style={{fontSize:40,fontWeight:600,letterSpacing:-1.5,color:ratios.score_global>=7?T.green:ratios.score_global>=5?T.amber:T.red}}>{ratios.score_global}</div>
                            <div style={{fontSize:12,color:T.text4}}>de 10 — {ratios.salud_global}</div>
                          </div>
                        </div>
                      </Card>
                    )}
                    <div className="fin-2" style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12,marginBottom:14}}>
                      {ratios.ratios?.map((ratio,i) => {
                        const sc = ratio.estado==='bueno'?T.green:ratio.estado==='regular'?T.amber:ratio.estado==='malo'?T.red:T.text4
                        const sSoft = ratio.estado==='bueno'?T.greenSoft:ratio.estado==='regular'?T.amberSoft:ratio.estado==='malo'?T.redSoft:T.sidebar
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
                                  {ratio.estado==='bueno'?'Bueno':ratio.estado==='regular'?'Regular':'Crítico'}
                                </span>
                              </div>
                            </div>
                            <div style={{fontSize:12,color:T.text2,lineHeight:1.5,marginBottom:ratio.accion_prioritaria?8:0}}>{ratio.interpretacion}</div>
                            {ratio.accion_prioritaria && ratio.estado!=='bueno' && (
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

      <VeraDrawer open={veraOpen} onClose={()=>setVeraOpen(false)} token={token} kpis={veraKpis}/>
    </div>
  )
}
