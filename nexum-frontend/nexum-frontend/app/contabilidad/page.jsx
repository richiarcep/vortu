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
}

const Icon = ({ d, size=16, sw=1.5 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>{d}</svg>
)
const I = {
  gear:    <Icon d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 14.5a1.5 1.5 0 0 0 .3 1.7l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.5 1.5 0 0 0-1.7-.3 1.5 1.5 0 0 0-.9 1.4v.4a2 2 0 1 1-4 0v-.2a1.5 1.5 0 0 0-1-1.4 1.5 1.5 0 0 0-1.7.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.5 1.5 0 0 0 .3-1.7 1.5 1.5 0 0 0-1.4-.9H3a2 2 0 1 1 0-4h.1a1.5 1.5 0 0 0 1.4-1 1.5 1.5 0 0 0-.3-1.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.5 1.5 0 0 0 1.7.3h.1a1.5 1.5 0 0 0 .9-1.4V3a2 2 0 1 1 4 0v.1a1.5 1.5 0 0 0 .9 1.4 1.5 1.5 0 0 0 1.7-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.5 1.5 0 0 0-.3 1.7v.1a1.5 1.5 0 0 0 1.4.9H21a2 2 0 1 1 0 4h-.2a1.5 1.5 0 0 0-1.4.9z"/></>} />,
  chevron: <Icon d={<path d="M6 9.5l6 5 6-5"/>} />,
  trend:   <Icon d={<><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></>} />,
  trendDown: <Icon d={<><path d="M3 7l6 6 4-4 8 8"/><path d="M14 17h7v-7"/></>} />,
}

function Card({ children, style={} }) {
  return <div style={{background:T.card,borderRadius:16,border:`.5px solid ${T.hairline}`,boxShadow:'0 1px 2px rgba(0,0,0,.03)',padding:20,...style}}>{children}</div>
}

function Btn({ children, onClick, disabled, color=T.blue, style={} }) {
  return <button onClick={onClick} disabled={disabled} style={{padding:'7px 16px',borderRadius:999,border:'none',fontSize:13,fontWeight:500,cursor:disabled?'not-allowed':'pointer',fontFamily:'inherit',background:disabled?T.sidebar:color,color:disabled?T.text4:'#fff',opacity:disabled?.6:1,display:'inline-flex',alignItems:'center',gap:6,transition:'opacity .15s',...style}}>{children}</button>
}

function BtnSec({ children, onClick, style={} }) {
  return <button onClick={onClick} style={{padding:'7px 16px',borderRadius:999,border:`.5px solid ${T.hairline}`,background:T.card,fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit',color:T.text,display:'inline-flex',alignItems:'center',gap:6,...style}}>{children}</button>
}

const inp = { width:'100%',padding:'8px 11px',borderRadius:8,border:`.5px solid ${T.hairline}`,background:T.sidebar,fontSize:13,color:T.text,fontFamily:'inherit',outline:'none' }

function Field({ label, children }) {
  return <div style={{marginBottom:12}}><div style={{fontSize:12,fontWeight:500,color:T.text3,marginBottom:5}}>{label}</div>{children}</div>
}

function Input({ style={}, ...props }) {
  return <input style={{...inp,...style}} {...props} onFocus={e=>e.target.style.borderColor=T.blue} onBlur={e=>e.target.style.borderColor='rgba(0,0,0,0.08)'}/>
}

function Sel({ children, style={}, ...props }) {
  return <select style={{...inp,...style}} {...props}>{children}</select>
}

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

function BarChart({ data, colorA=T.blue, colorB=T.cyan, labelA='Ingresos', labelB='Gastos' }) {
  const [hover,setHover]=useState(null)
  if (!data?.length) return <div style={{height:120,display:'flex',alignItems:'center',justifyContent:'center',color:T.text4,fontSize:13}}>Sin datos</div>
  const W=600,H=120,padL=32,padR=8,padT=8,padB=24
  const plotW=W-padL-padR,plotH=H-padT-padB
  const maxVal=Math.max(...data.flatMap(d=>[d.a||0,d.b||0]),1)
  const gridVals=[0,0.5,1].map(p=>Math.round(maxVal*p))
  const groupW=plotW/data.length,barW=Math.min(10,groupW/3),gap=3
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:120,display:'block'}}>
      {gridVals.map(v=>{
        const y=padT+plotH-(v/maxVal)*plotH
        return <g key={v}>
          <line x1={padL} x2={W-padR} y1={y} y2={y} stroke={T.hairline} strokeWidth=".5"/>
          <text x={padL-6} y={y+3} textAnchor="end" fontSize="9" fill={T.text4} fontFamily="system-ui">{v===0?'0':`${(v/1000).toFixed(0)}k`}</text>
        </g>
      })}
      {data.map((d,i)=>{
        const gx=padL+groupW*i+groupW/2
        const x1=gx-barW-gap/2,x2=gx+gap/2
        const aH=((d.a||0)/maxVal)*plotH
        const bH=((d.b||0)/maxVal)*plotH
        const isH=hover===i
        return <g key={i} onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)} style={{cursor:'pointer'}}>
          <rect x={x1-2} y={padT} width={barW*2+gap+4} height={plotH} fill="transparent"/>
          <rect x={x1} y={padT+plotH-aH} width={barW} height={Math.max(aH,2)} fill={colorA} opacity={hover===null||isH?1:.3} rx="2"/>
          <rect x={x2} y={padT+plotH-bH} width={barW} height={Math.max(bH,2)} fill={colorB} opacity={hover===null||isH?1:.3} rx="2"/>
          <text x={gx} y={H-6} textAnchor="middle" fontSize="8.5" fill={isH?T.text:T.text4} fontFamily="system-ui">{d.label}</text>
          {isH&&<g>
            <rect x={gx-44} y={padT+plotH-Math.max(aH,bH)-42} width="88" height="36" rx="6" fill={T.text}/>
            <text x={gx} y={padT+plotH-Math.max(aH,bH)-28} textAnchor="middle" fontSize="9.5" fill="rgba(255,255,255,.6)" fontFamily="system-ui">{labelA}: €{(d.a||0).toFixed(0)}</text>
            <text x={gx} y={padT+plotH-Math.max(aH,bH)-14} textAnchor="middle" fontSize="9.5" fill={colorB} fontFamily="system-ui">{labelB}: €{(d.b||0).toFixed(0)}</text>
          </g>}
        </g>
      })}
    </svg>
  )
}

function DonutChart({ value, max, color, size=80 }) {
  const pct = Math.min(value/max,1)
  const r=32, cx=size/2, cy=size/2
  const circ=2*Math.PI*r
  const dash=pct*circ
  return (
    <svg width={size} height={size} style={{display:'block'}}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.sidebar} strokeWidth="8"/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ/4}
        strokeLinecap="round" style={{transition:'stroke-dasharray .6s ease'}}/>
      <text x={cx} y={cy+4} textAnchor="middle" fontSize="13" fontWeight="600" fill={T.text} fontFamily="system-ui">{Math.round(pct*100)}%</text>
    </svg>
  )
}

function DownloadModal({ onClose, estadosPeriodo, downloadReport, downloadingReport }) {
  const reports = [
    {key:'pl',     title:'Estado de Resultados',desc:'P&L completo con analisis Vera',  icon:'📊',color:T.green},
    {key:'balance',title:'Balance General',      desc:'Activos, pasivos y patrimonio',   icon:'⚖️', color:T.blue},
    {key:'flujo',  title:'Flujo de Efectivo',    desc:'Operativo, inversion, financiamiento',icon:'💰',color:T.amber},
  ]
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:24}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{background:T.card,borderRadius:20,padding:28,width:'100%',maxWidth:460,boxShadow:'0 24px 64px rgba(0,0,0,.15)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
          <div style={{fontSize:17,fontWeight:600,color:T.text,letterSpacing:-0.3}}>Descargar reportes PDF</div>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:T.text4}}>x</button>
        </div>
        <div style={{fontSize:13,color:T.text3,marginBottom:18}}>Periodo: {estadosPeriodo.inicio} al {estadosPeriodo.fin}</div>
        <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:18}}>
          {reports.map(r=>(
            <div key={r.key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',background:T.sidebar,borderRadius:12,border:`.5px solid ${T.hairline}`}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <span style={{fontSize:22}}>{r.icon}</span>
                <div>
                  <div style={{fontSize:13,fontWeight:500,color:T.text}}>{r.title}</div>
                  <div style={{fontSize:11,color:T.text4}}>{r.desc}</div>
                </div>
              </div>
              <Btn onClick={()=>downloadReport(r.key)} disabled={downloadingReport===r.key} color={r.color} style={{marginLeft:12,padding:'6px 14px',borderRadius:8,fontSize:12}}>
                {downloadingReport===r.key?'Generando...':'Descargar'}
              </Btn>
            </div>
          ))}
        </div>
        <BtnSec onClick={onClose} style={{width:'100%',justifyContent:'center'}}>Cerrar</BtnSec>
      </div>
    </div>
  )
}

export default function Contabilidad() {
  const router = useRouter()
  const [section, setSection] = useState('resumen')
  const [tab, setTab] = useState('ingreso')
  const [mode, setMode] = useState('manual')
  const [form, setForm] = useState({fecha:new Date().toISOString().split('T')[0],categoria:'',descripcion:'',monto:'',referencia:''})
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const [registro, setRegistro] = useState(null)
  const [pdfFile, setPdfFile] = useState(null)
  const [pdfResult, setPdfResult] = useState(null)
  const [plantillaConfig, setPlantillaConfig] = useState({tipo_negocio:'mixto',fecha:new Date().toISOString().split('T')[0]})
  const [estados, setEstados] = useState(null)
  const [estadosPeriodo, setEstadosPeriodo] = useState({inicio:new Date().toISOString().split('T')[0].substring(0,8)+'01',fin:new Date().toISOString().split('T')[0]})
  const [ledger, setLedger] = useState(null)
  const [balanza, setBalanza] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [downloadingReport, setDownloadingReport] = useState(null)
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [ventas, setVentas] = useState(null)
  const [periodo, setPeriodo] = useState('month')
  const [snapshotInfo, setSnapshotInfo] = useState(null)

  const getToken = () => localStorage.getItem('nexum_token')

  const categoriasIngreso = [{clave:'ventas',nombre:'Ventas'},{clave:'servicios',nombre:'Servicios'},{clave:'otros_ingresos',nombre:'Otros Ingresos'},{clave:'intereses',nombre:'Intereses'}]
  const categoriasGasto = [{clave:'nomina',nombre:'Nomina'},{clave:'alquiler',nombre:'Alquiler'},{clave:'marketing',nombre:'Marketing'},{clave:'suministros',nombre:'Suministros'},{clave:'software',nombre:'Software'},{clave:'servicios_basicos',nombre:'Servicios Basicos'},{clave:'servicios_profesionales',nombre:'Servicios Profesionales'},{clave:'impuestos',nombre:'Impuestos'},{clave:'otros_gastos',nombre:'Otros Gastos'}]

  useEffect(()=>{
    const t=getToken()
    if(!t){router.push('/login');return}
    setToken(t)
    try{const p=JSON.parse(atob(t.split('.')[1]));setUser({email:p.sub||'',name:p.name||p.sub||'Usuario'})}
    catch{setUser({email:'',name:'Usuario'})}
    loadAll()
  },[])

  async function loadAll() {
    loadRegistro()
    loadEstadosAuto('month')
    fetch(`${API}/api/ventas/resumen`,{headers:{Authorization:`Bearer ${getToken()}`}}).then(r=>r.ok?r.json():null).then(d=>{if(d)setVentas(d)}).catch(()=>{})
  }

  function loadRegistro() {
    const today=new Date().toISOString().split('T')[0]
    const monthStart=today.substring(0,8)+'01'
    fetch(`${API}/api/contabilidad/registro?fecha_inicio=${monthStart}&fecha_fin=${today}`,{headers:{Authorization:`Bearer ${getToken()}`}})
      .then(r=>r.json()).then(setRegistro).catch(()=>{})
  }

  async function loadEstadosAuto(p) {
    const period = p || periodo
    try {
      const res=await fetch(`${API}/api/contabilidad/snapshot?period=${period}`,{headers:{Authorization:`Bearer ${getToken()}`}})
      if(res.ok){
        const d=await res.json()
        setEstados(d.data)
        setSnapshotInfo({cached:d.cached, label:d.label, generated_at:d.generated_at})
      }
    } catch{}
  }

  async function refreshSnapshot() {
    await fetch(`${API}/api/contabilidad/snapshot/${periodo}`,{method:'DELETE',headers:{Authorization:`Bearer ${getToken()}`}})
    setEstados(null)
    setSnapshotInfo(null)
    await loadEstadosAuto()
  }

  async function loadEstados() {
    setLoading(true)
    const res=await fetch(`${API}/api/contabilidad/estados-financieros?fecha_inicio=${estadosPeriodo.inicio}&fecha_fin=${estadosPeriodo.fin}`,{headers:{Authorization:`Bearer ${getToken()}`}})
    if(res.ok)setEstados(await res.json())
    setLoading(false)
  }

  async function submitManual(e) {
    e.preventDefault();setLoading(true);setMsg(null)
    const endpoint=tab==='ingreso'?'/api/contabilidad/ingresos':'/api/contabilidad/gastos'
    const res=await fetch(`${API}${endpoint}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify({...form,monto:parseFloat(form.monto)})})
    const data=await res.json()
    if(res.ok){setMsg({type:'success',text:`Registrado. Asiento: ${data.asiento_contable}`});setForm({fecha:new Date().toISOString().split('T')[0],categoria:'',descripcion:'',monto:'',referencia:''});loadRegistro()}
    else setMsg({type:'error',text:data.detail||'Error al registrar'})
    setLoading(false)
  }

  async function submitPDF(e) {
    e.preventDefault();if(!pdfFile)return
    setLoading(true);setMsg(null);setPdfResult(null)
    const fd=new FormData();fd.append('file',pdfFile);fd.append('auto_registrar','true')
    const res=await fetch(`${API}/api/contabilidad/leer-pdf`,{method:'POST',headers:{Authorization:`Bearer ${getToken()}`},body:fd})
    const data=await res.json()
    if(res.ok){setPdfResult(data);setMsg({type:'success',text:`${data.total_registradas} transacciones registradas`});loadRegistro()}
    else setMsg({type:'error',text:data.detail||'Error procesando PDF'})
    setLoading(false)
  }

  async function downloadPlantilla() {
    setLoading(true)
    const res=await fetch(`${API}/api/contabilidad/plantilla?fecha=${plantillaConfig.fecha}&tipo_negocio=${plantillaConfig.tipo_negocio}`,{method:'POST',headers:{Authorization:`Bearer ${getToken()}`}})
    if(res.ok){const blob=await res.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`cierre_caja_${plantillaConfig.fecha}.pdf`;a.click();setMsg({type:'success',text:'Plantilla descargada'})}
    else setMsg({type:'error',text:'Error generando plantilla'})
    setLoading(false)
  }

  async function loadLedger() {
    setLoading(true)
    const res=await fetch(`${API}/api/contabilidad/libro-mayor`,{headers:{Authorization:`Bearer ${getToken()}`}})
    if(res.ok)setLedger(await res.json())
    setLoading(false)
  }

  async function loadBalanza() {
    setLoading(true)
    const res=await fetch(`${API}/api/contabilidad/balance-comprobacion`,{headers:{Authorization:`Bearer ${getToken()}`}})
    if(res.ok)setBalanza(await res.json())
    setLoading(false)
  }

  async function downloadReport(type) {
    setDownloadingReport(type)
    const urls={
      pl:`${API}/api/contabilidad/reporte/estado-resultados?fecha_inicio=${estadosPeriodo.inicio}&fecha_fin=${estadosPeriodo.fin}`,
      balance:`${API}/api/contabilidad/reporte/balance-general?fecha=${estadosPeriodo.fin}`,
      flujo:`${API}/api/contabilidad/reporte/flujo-efectivo?fecha_inicio=${estadosPeriodo.inicio}&fecha_fin=${estadosPeriodo.fin}`,
    }
    const names={pl:`estado_resultados_${estadosPeriodo.fin}.pdf`,balance:`balance_general_${estadosPeriodo.fin}.pdf`,flujo:`flujo_efectivo_${estadosPeriodo.fin}.pdf`}
    const res=await fetch(urls[type],{method:'POST',headers:{Authorization:`Bearer ${getToken()}`}})
    if(res.ok){const blob=await res.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=names[type];a.click()}
    setDownloadingReport(null)
  }

  const categorias=tab==='ingreso'?categoriasIngreso:categoriasGasto
  const pl=estados?.estado_de_resultados
  const bal=estados?.balance_general
  const flujo=estados?.flujo_de_efectivo
  const salud=estados?.puntaje_salud_financiera

  const sections=[
    {key:'resumen', label:'Resumen'},
    {key:'estados', label:'Estados financieros'},
    {key:'registro',label:'Registro diario'},
    {key:'libros',  label:'Libros'},
  ]

  return (
    <div style={{minHeight:'100vh',background:T.bg,display:'flex',fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',system-ui,sans-serif",WebkitFontSmoothing:'antialiased'}}>
      <style>{`*{box-sizing:border-box}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:999px}input:focus,select:focus{border-color:${T.blue}!important;outline:none}`}</style>

      <Sidebar active="/contabilidad"/>
      {showModal&&<DownloadModal onClose={()=>setShowModal(false)} estadosPeriodo={estadosPeriodo} downloadReport={downloadReport} downloadingReport={downloadingReport}/>}

      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <header style={{height:56,background:'rgba(251,251,253,.9)',backdropFilter:'saturate(180%) blur(20px)',WebkitBackdropFilter:'saturate(180%) blur(20px)',borderBottom:`.5px solid ${T.hairline}`,display:'flex',alignItems:'center',padding:'0 24px',flexShrink:0,position:'sticky',top:0,zIndex:10}}>
          <div style={{display:'flex',flexDirection:'column',lineHeight:1.1,paddingRight:20,borderRight:`.5px solid ${T.hairline}`,marginRight:4}}>
            <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.3}}>Contabilidad</div>
            <div style={{fontSize:11,color:T.text4}}>Partida doble · PGC espanol</div>
          </div>
          <div style={{display:'flex',height:56}}>
            {sections.map(s=>(
              <button key={s.key} onClick={()=>setSection(s.key)} style={{padding:'0 16px',height:56,background:'none',border:'none',borderBottom:section===s.key?`2px solid ${T.text}`:'2px solid transparent',color:section===s.key?T.text:T.text3,fontWeight:section===s.key?600:400,fontSize:13,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',transition:'all .15s'}}>
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
              {/* Period selector */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                <div style={{display:'flex',gap:6}}>
                  {[
                    {key:'month',   label:'Este mes'},
                    {key:'quarter', label:'Trimestre'},
                    {key:'semester',label:'Semestre'},
                    {key:'year',    label:'Este año'},
                  ].map(p=>(
                    <button key={p.key} onClick={()=>{setPeriodo(p.key);setEstados(null);setSnapshotInfo(null);loadEstadosAuto(p.key)}}
                      style={{padding:'6px 14px',borderRadius:999,border:`.5px solid ${periodo===p.key?T.blue:T.hairline}`,background:periodo===p.key?'rgba(0,113,227,.08)':T.card,color:periodo===p.key?T.blue:T.text2,fontSize:13,fontWeight:periodo===p.key?500:400,cursor:'pointer',fontFamily:'inherit',transition:'all .15s',boxShadow:periodo===p.key?`0 0 0 1px ${T.blue}`:'none'}}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  {snapshotInfo&&(
                    <span style={{fontSize:11,color:T.text4}}>
                      {snapshotInfo.cached?'Guardado':'Generado'} · {new Date(snapshotInfo.generated_at).toLocaleDateString('es-ES')}
                    </span>
                  )}
                  <button onClick={refreshSnapshot} style={{padding:'6px 14px',borderRadius:999,border:`.5px solid ${T.hairline}`,background:T.card,color:T.text2,fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
                    Actualizar
                  </button>
                </div>
              </div>
              {/* KPI strip */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
                {[
                  {label:'Ingresos este mes',value:`€${(pl?.ingresos?.total_ingresos||0).toLocaleString('es-ES')}`,color:T.green,sub:`Margen ${pl?.margen_utilidad_porcentaje||0}%`},
                  {label:'Gastos este mes',  value:`€${(pl?.gastos?.total_gastos||0).toLocaleString('es-ES')}`,    color:T.red,  sub:'ultimos 30 dias'},
                  {label:'Resultado neto',   value:`€${(pl?.utilidad_neta||0).toLocaleString('es-ES')}`,           color:(pl?.utilidad_neta||0)>=0?T.green:T.red, sub:pl?.es_rentable?'Rentable':'No rentable'},
                  {label:'Salud financiera', value:`${salud?.puntaje||0}/10`,color:(salud?.puntaje||0)>=7?T.green:(salud?.puntaje||0)>=5?T.amber:T.red,sub:salud?.calificacion||'—'},
                ].map((k,i)=>(
                  <Card key={i} style={{padding:'18px 20px'}}>
                    <div style={{fontSize:12,color:T.text3,fontWeight:500,marginBottom:10}}>{k.label}</div>
                    <div style={{fontSize:28,fontWeight:600,letterSpacing:-0.8,color:k.color,fontVariantNumeric:'tabular-nums',lineHeight:1}}>{k.value}</div>
                    <div style={{fontSize:12,color:T.text4,marginTop:6}}>{k.sub}</div>
                  </Card>
                ))}
              </div>

              {/* P&L visual + Balance */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
                <Card>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                    <div>
                      <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2}}>P&L — Este mes</div>
                      <div style={{fontSize:12,color:T.text4}}>Ingresos vs Gastos</div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:12,fontSize:12,color:T.text3}}>
                      <span><span style={{width:8,height:8,borderRadius:2,background:T.green,display:'inline-block',marginRight:5,verticalAlign:-1}}/>Ingresos</span>
                      <span><span style={{width:8,height:8,borderRadius:2,background:T.red,display:'inline-block',marginRight:5,verticalAlign:-1}}/>Gastos</span>
                    </div>
                  </div>
                  {pl?.ingresos?.cuentas&&(
                    <div style={{marginBottom:12}}>
                      {Object.entries(pl.ingresos.cuentas).map(([k,v])=>(
                        <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:`.5px solid ${T.soft}`}}>
                          <span style={{fontSize:13,color:T.text2}}>{typeof v==='object'?v.nombre:k}</span>
                          <span style={{fontSize:13,fontWeight:500,color:T.green,fontVariantNumeric:'tabular-nums'}}>€{(typeof v==='number'?v:v?.saldo||v?.balance||0).toLocaleString('es-ES')}</span>
                        </div>
                      ))}
                      {Object.entries(pl.gastos?.cuentas||{}).map(([k,v])=>(
                        <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:`.5px solid ${T.soft}`}}>
                          <span style={{fontSize:13,color:T.text2}}>{typeof v==='object'?v.nombre:k}</span>
                          <span style={{fontSize:13,fontWeight:500,color:T.red,fontVariantNumeric:'tabular-nums'}}>-€{(typeof v==='number'?v:v?.saldo||v?.balance||0).toLocaleString('es-ES')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 14px',background:T.sidebar,borderRadius:10,marginTop:8}}>
                    <span style={{fontSize:13,fontWeight:500,color:T.text}}>Utilidad neta</span>
                    <span style={{fontSize:20,fontWeight:600,color:(pl?.utilidad_neta||0)>=0?T.green:T.red,fontVariantNumeric:'tabular-nums'}}>€{(pl?.utilidad_neta||0).toLocaleString('es-ES')}</span>
                  </div>
                </Card>

                <Card>
                  <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2,marginBottom:14}}>Balance General</div>
                  <div style={{display:'flex',justifyContent:'center',gap:24,marginBottom:16}}>
                    <div style={{textAlign:'center'}}>
                      <DonutChart value={bal?.activos?.total_activos||0} max={Math.max(bal?.activos?.total_activos||1,1)} color={T.blue}/>
                      <div style={{fontSize:11,color:T.text4,marginTop:4}}>Activos</div>
                      <div style={{fontSize:14,fontWeight:600,color:T.text,fontVariantNumeric:'tabular-nums'}}>€{(bal?.activos?.total_activos||0).toLocaleString('es-ES')}</div>
                    </div>
                    <div style={{textAlign:'center'}}>
                      <DonutChart value={bal?.pasivos?.total_pasivos||0} max={Math.max(bal?.activos?.total_activos||1,1)} color={T.red}/>
                      <div style={{fontSize:11,color:T.text4,marginTop:4}}>Pasivos</div>
                      <div style={{fontSize:14,fontWeight:600,color:T.text,fontVariantNumeric:'tabular-nums'}}>€{(bal?.pasivos?.total_pasivos||0).toLocaleString('es-ES')}</div>
                    </div>
                    <div style={{textAlign:'center'}}>
                      <DonutChart value={bal?.patrimonio?.total_patrimonio||0} max={Math.max(bal?.activos?.total_activos||1,1)} color={T.green}/>
                      <div style={{fontSize:11,color:T.text4,marginTop:4}}>Patrimonio</div>
                      <div style={{fontSize:14,fontWeight:600,color:T.text,fontVariantNumeric:'tabular-nums'}}>€{(bal?.patrimonio?.total_patrimonio||0).toLocaleString('es-ES')}</div>
                    </div>
                  </div>
                  <div style={{padding:'10px 14px',background:bal?.ecuacion_balanceada?T.greenSoft:T.redSoft,borderRadius:10,border:`.5px solid ${bal?.ecuacion_balanceada?T.green:T.red}`,textAlign:'center'}}>
                    <span style={{fontSize:13,fontWeight:500,color:bal?.ecuacion_balanceada?T.green:T.red}}>
                      {bal?.ecuacion_balanceada?'Ecuacion balanceada':'Ecuacion no balanceada'}
                    </span>
                  </div>
                  {flujo&&(
                    <div style={{marginTop:14,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                      {[
                        {label:'Flujo operativo',value:flujo.actividades_operativas?.flujo_operativo_neto||0},
                        {label:'Cambio neto',    value:flujo.cambio_neto_efectivo||0},
                      ].map((s,i)=>(
                        <div key={i} style={{padding:'10px',background:T.sidebar,borderRadius:10,border:`.5px solid ${T.hairline}`,textAlign:'center'}}>
                          <div style={{fontSize:11,color:T.text4,marginBottom:3}}>{s.label}</div>
                          <div style={{fontSize:15,fontWeight:600,color:s.value>=0?T.green:T.red,fontVariantNumeric:'tabular-nums'}}>€{s.value.toLocaleString('es-ES')}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {/* Insight Vera + Transacciones recientes */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <Card>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                    <div style={{width:28,height:28,borderRadius:8,background:'linear-gradient(135deg,#0071E3,#00B4D8)',color:'#fff',display:'grid',placeItems:'center',fontSize:12,flexShrink:0}}>V</div>
                    <div>
                      <div style={{fontSize:14,fontWeight:600,color:T.text}}>Analisis de Vera</div>
                      <div style={{fontSize:11,color:T.text4}}>Inteligencia sobre tus estados financieros</div>
                    </div>
                  </div>
                  {pl?.analisis_ia&&<div style={{padding:'12px 14px',background:T.sidebar,borderRadius:10,fontSize:13,color:T.text2,lineHeight:1.6,marginBottom:10}}>{pl.analisis_ia}</div>}
                  {salud?.factores&&(
                    <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                      {salud.factores.map((f,i)=>(
                        <span key={i} style={{padding:'3px 10px',background:T.sidebar,borderRadius:999,fontSize:11,color:T.text2,border:`.5px solid ${T.hairline}`}}>✓ {f}</span>
                      ))}
                    </div>
                  )}
                </Card>

                <Card>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                    <div style={{fontSize:14,fontWeight:600,color:T.text,letterSpacing:-0.2}}>Movimientos recientes</div>
                    <button onClick={()=>setSection('registro')} style={{background:'none',border:'none',color:T.blue,fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>Ver todo</button>
                  </div>
                  <div style={{maxHeight:240,overflowY:'auto'}}>
                    {registro&&[...(registro.ingresos||[]).map(r=>({...r,tipo:'ingreso'})),...(registro.gastos||[]).map(r=>({...r,tipo:'gasto'}))].sort((a,b)=>b.fecha.localeCompare(a.fecha)).slice(0,10).map((r,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 0',borderBottom:`.5px solid ${T.soft}`}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:500,color:T.text}}>{r.descripcion}</div>
                          <div style={{fontSize:11,color:T.text4}}>{r.fecha} · {r.categoria}</div>
                        </div>
                        <span style={{fontSize:13,fontWeight:600,color:r.tipo==='ingreso'?T.green:T.red,fontVariantNumeric:'tabular-nums'}}>
                          {r.tipo==='ingreso'?'+':'-'}€{r.monto}
                        </span>
                      </div>
                    ))}
                    {!registro&&<div style={{padding:32,textAlign:'center',color:T.text4,fontSize:13}}>Cargando...</div>}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ══ ESTADOS FINANCIEROS ══ */}
          {section==='estados'&&(
            <div>
              <Card style={{marginBottom:16}}>
                <div style={{display:'flex',alignItems:'flex-end',gap:12,flexWrap:'wrap'}}>
                  <Field label="Desde"><Input type="date" value={estadosPeriodo.inicio} onChange={e=>setEstadosPeriodo({...estadosPeriodo,inicio:e.target.value})} style={{width:160}}/></Field>
                  <Field label="Hasta"><Input type="date" value={estadosPeriodo.fin} onChange={e=>setEstadosPeriodo({...estadosPeriodo,fin:e.target.value})} style={{width:160}}/></Field>
                  <div style={{display:'flex',gap:8,paddingBottom:12}}>
                    <Btn onClick={loadEstados} disabled={loading}>{loading?'Generando...':'Generar estados'}</Btn>
                    {estados&&<Btn onClick={()=>setShowModal(true)} color={T.green}>Descargar PDF</Btn>}
                  </div>
                </div>
              </Card>

              {estados&&(
                <>
                  {/* Salud */}
                  <Card style={{marginBottom:14}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <div>
                        <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2}}>Salud financiera</div>
                        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:8}}>
                          {salud?.factores?.map((f,i)=>(
                            <span key={i} style={{padding:'3px 10px',background:T.sidebar,borderRadius:999,fontSize:11,color:T.text2,border:`.5px solid ${T.hairline}`}}>✓ {f}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:40,fontWeight:600,letterSpacing:-1.5,color:(salud?.puntaje||0)>=7?T.green:(salud?.puntaje||0)>=5?T.amber:T.red,fontVariantNumeric:'tabular-nums'}}>{salud?.puntaje||0}</div>
                        <div style={{fontSize:13,color:T.text3}}>de 10 — {salud?.calificacion}</div>
                      </div>
                    </div>
                  </Card>

                  {/* P&L */}
                  <Card style={{marginBottom:14}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                      <div>
                        <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2}}>Estado de Resultados</div>
                        <div style={{fontSize:12,color:T.text4}}>{estadosPeriodo.inicio} al {estadosPeriodo.fin}</div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:24,fontWeight:600,color:(pl?.utilidad_neta||0)>=0?T.green:T.red,fontVariantNumeric:'tabular-nums'}}>€{(pl?.utilidad_neta||0).toLocaleString('es-ES')}</div>
                        <div style={{fontSize:12,color:T.text4}}>Utilidad neta · {pl?.margen_utilidad_porcentaje||0}% margen</div>
                      </div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                      <div>
                        {[
                          {label:'Total Ingresos',value:`€${(pl?.ingresos?.total_ingresos||0).toLocaleString('es-ES')}`,color:T.green},
                          {label:'Total Gastos',  value:`€${(pl?.gastos?.total_gastos||0).toLocaleString('es-ES')}`,    color:T.red},
                          {label:'EBITDA',        value:`€${(pl?.ebitda||0).toLocaleString('es-ES')}`,                  color:T.text},
                          {label:'Utilidad Neta', value:`€${(pl?.utilidad_neta||0).toLocaleString('es-ES')}`,           color:(pl?.utilidad_neta||0)>=0?T.green:T.red},
                          {label:'Margen',        value:`${pl?.margen_utilidad_porcentaje||0}%`,                         color:T.text2},
                        ].map((row,i)=>(
                          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:`.5px solid ${T.soft}`}}>
                            <span style={{fontSize:13,color:T.text3}}>{row.label}</span>
                            <span style={{fontSize:13,fontWeight:600,color:row.color,fontVariantNumeric:'tabular-nums'}}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{padding:'14px',background:T.sidebar,borderRadius:12,border:`.5px solid ${T.hairline}`}}>
                        <div style={{fontSize:12,fontWeight:500,color:T.text3,marginBottom:8}}>Analisis Vera</div>
                        <div style={{fontSize:13,color:T.text2,lineHeight:1.6}}>{pl?.analisis_ia||'Generando analisis...'}</div>
                      </div>
                    </div>
                  </Card>

                  {/* Balance */}
                  <Card style={{marginBottom:14}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                      <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2}}>Balance General</div>
                      <span style={{padding:'4px 12px',background:bal?.ecuacion_balanceada?T.greenSoft:T.redSoft,color:bal?.ecuacion_balanceada?T.green:T.red,borderRadius:999,fontSize:12,fontWeight:500}}>
                        {bal?.ecuacion_balanceada?'Balanceado':'No balanceado'}
                      </span>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                      <div>
                        {[
                          {label:'Total Activos',      value:`€${(bal?.activos?.total_activos||0).toLocaleString('es-ES')}`,      color:T.text},
                          {label:'Total Pasivos',      value:`€${(bal?.pasivos?.total_pasivos||0).toLocaleString('es-ES')}`,       color:T.red},
                          {label:'Total Patrimonio',   value:`€${(bal?.patrimonio?.total_patrimonio||0).toLocaleString('es-ES')}`, color:T.green},
                          {label:'Pasivos+Patrimonio', value:`€${(bal?.total_pasivos_y_patrimonio||0).toLocaleString('es-ES')}`,   color:T.text},
                        ].map((row,i)=>(
                          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:`.5px solid ${T.soft}`}}>
                            <span style={{fontSize:13,color:T.text3}}>{row.label}</span>
                            <span style={{fontSize:13,fontWeight:600,color:row.color,fontVariantNumeric:'tabular-nums'}}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{padding:'14px',background:T.sidebar,borderRadius:12,border:`.5px solid ${T.hairline}`}}>
                        <div style={{fontSize:12,fontWeight:500,color:T.text3,marginBottom:8}}>Analisis Vera</div>
                        <div style={{fontSize:13,color:T.text2,lineHeight:1.6}}>{bal?.analisis_ia||'Generando analisis...'}</div>
                      </div>
                    </div>
                  </Card>

                  {/* Flujo */}
                  <Card>
                    <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2,marginBottom:16}}>Flujo de Efectivo</div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
                      {[
                        {label:'Flujo operativo',     value:flujo?.actividades_operativas?.flujo_operativo_neto||0},
                        {label:'Flujo inversion',     value:flujo?.actividades_inversion?.flujo_inversion_neto||0},
                        {label:'Flujo financiamiento',value:flujo?.actividades_financiamiento?.flujo_financiamiento_neto||0},
                        {label:'Cambio neto',         value:flujo?.cambio_neto_efectivo||0,highlight:true},
                      ].map((s,i)=>(
                        <div key={i} style={{padding:'12px',background:s.highlight?(s.value>=0?T.greenSoft:T.redSoft):T.sidebar,borderRadius:10,border:`.5px solid ${s.highlight?(s.value>=0?T.green:T.red):T.hairline}`,textAlign:'center'}}>
                          <div style={{fontSize:11,color:T.text4,marginBottom:4}}>{s.label}</div>
                          <div style={{fontSize:16,fontWeight:600,color:s.value>=0?T.green:T.red,fontVariantNumeric:'tabular-nums'}}>€{s.value.toLocaleString('es-ES')}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{padding:'12px 14px',background:T.sidebar,borderRadius:10,border:`.5px solid ${T.hairline}`}}>
                      <div style={{fontSize:13,color:T.text2,lineHeight:1.6}}>{flujo?.analisis_ia||'—'}</div>
                    </div>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* ══ REGISTRO DIARIO ══ */}
          {section==='registro'&&(
            <>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
                {[
                  {key:'manual',   label:'Registro manual',desc:'Ingreso o gasto manualmente'},
                  {key:'pdf',      label:'Subir PDF a Vera',desc:'Vera extrae las transacciones'},
                  {key:'plantilla',label:'Cierre de caja', desc:'Plantilla oficial con QR'},
                ].map(m=>(
                  <button key={m.key} onClick={()=>{setMode(m.key);setMsg(null)}} style={{padding:'13px 16px',border:`.5px solid ${mode===m.key?T.blue:T.hairline}`,borderRadius:12,background:mode===m.key?'rgba(0,113,227,.06)':T.card,cursor:'pointer',textAlign:'left',transition:'all .15s',fontFamily:'inherit',boxShadow:mode===m.key?`0 0 0 1px ${T.blue}`:'none'}}>
                    <div style={{fontSize:13,fontWeight:500,color:mode===m.key?T.blue:T.text,marginBottom:2}}>{m.label}</div>
                    <div style={{fontSize:11,color:T.text4}}>{m.desc}</div>
                  </button>
                ))}
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                <Card>
                  {mode==='manual'&&(
                    <>
                      <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2,marginBottom:14}}>Registro manual</div>
                      <div style={{display:'flex',marginBottom:14,background:T.sidebar,borderRadius:8,padding:3}}>
                        {['ingreso','gasto'].map(t=>(
                          <button key={t} onClick={()=>{setTab(t);setForm({...form,categoria:''})}} style={{flex:1,padding:'7px',border:'none',cursor:'pointer',borderRadius:6,fontSize:13,fontWeight:t===tab?500:400,background:t===tab?T.card:'transparent',color:t===tab?T.text:T.text3,boxShadow:t===tab?'0 .5px 1px rgba(0,0,0,.06),0 1px 3px rgba(0,0,0,.04)':'none',transition:'all .15s',fontFamily:'inherit'}}>
                            {t==='ingreso'?'Ingreso':'Gasto'}
                          </button>
                        ))}
                      </div>
                      <form onSubmit={submitManual}>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                          <Field label="Fecha"><Input type="date" value={form.fecha} onChange={e=>setForm({...form,fecha:e.target.value})} required/></Field>
                          <Field label="Monto €"><Input type="number" step="0.01" placeholder="0.00" value={form.monto} onChange={e=>setForm({...form,monto:e.target.value})} required/></Field>
                        </div>
                        <Field label="Categoria">
                          <Sel value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value})} required>
                            <option value="">Selecciona categoria</option>
                            {categorias.map(c=><option key={c.clave} value={c.clave}>{c.nombre}</option>)}
                          </Sel>
                        </Field>
                        <Field label="Descripcion"><Input type="text" placeholder="Describe la transaccion..." value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})} required/></Field>
                        <Field label="Referencia (opcional)"><Input type="text" placeholder="No. factura..." value={form.referencia} onChange={e=>setForm({...form,referencia:e.target.value})}/></Field>
                        <Toast msg={msg}/>
                        <Btn disabled={loading} style={{width:'100%',justifyContent:'center',borderRadius:10,padding:'10px'}}>{loading?'Registrando...':`Registrar ${tab}`}</Btn>
                      </form>
                    </>
                  )}
                  {mode==='pdf'&&(
                    <>
                      <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2,marginBottom:4}}>Subir PDF a Vera</div>
                      <div style={{fontSize:13,color:T.text3,marginBottom:14}}>Vera analiza el documento y registra las transacciones automaticamente.</div>
                      <form onSubmit={submitPDF}>
                        <div style={{border:`1.5px dashed ${pdfFile?T.green:T.hairline}`,borderRadius:12,padding:'28px 24px',textAlign:'center',marginBottom:14,background:pdfFile?T.greenSoft:T.sidebar,cursor:'pointer',transition:'all .2s'}} onClick={()=>document.getElementById('pdfInput').click()}>
                          <div style={{fontSize:26,marginBottom:8}}>📄</div>
                          <div style={{fontSize:13,fontWeight:500,color:T.text,marginBottom:4}}>{pdfFile?pdfFile.name:'Selecciona un PDF'}</div>
                          <div style={{fontSize:11,color:T.text4}}>Factura, estado de cuenta, cierre de caja</div>
                          <input id="pdfInput" type="file" accept=".pdf" style={{display:'none'}} onChange={e=>setPdfFile(e.target.files[0])}/>
                        </div>
                        <Toast msg={msg}/>
                        <Btn disabled={loading||!pdfFile} style={{width:'100%',justifyContent:'center',borderRadius:10,padding:'10px'}}>{loading?'Vera esta analizando...':'Procesar con Vera'}</Btn>
                      </form>
                      {pdfResult&&<div style={{marginTop:12,padding:'10px 14px',background:T.greenSoft,borderRadius:10,border:`.5px solid ${T.green}`,fontSize:13,color:T.green}}>{pdfResult.total_registradas} transacciones registradas</div>}
                    </>
                  )}
                  {mode==='plantilla'&&(
                    <>
                      <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2,marginBottom:4}}>Cierre de caja oficial</div>
                      <div style={{fontSize:13,color:T.text3,marginBottom:14}}>Plantilla con QR cifrado para cumplimiento legal.</div>
                      <Field label="Fecha"><Input type="date" value={plantillaConfig.fecha} onChange={e=>setPlantillaConfig({...plantillaConfig,fecha:e.target.value})}/></Field>
                      <Field label="Tipo de negocio">
                        <Sel value={plantillaConfig.tipo_negocio} onChange={e=>setPlantillaConfig({...plantillaConfig,tipo_negocio:e.target.value})}>
                          <option value="mixto">Mixto</option>
                          <option value="restaurante">Restaurante / Bar</option>
                          <option value="tienda">Tienda / Comercio</option>
                          <option value="servicios">Servicios</option>
                        </Sel>
                      </Field>
                      <div style={{padding:'10px 14px',background:T.sidebar,borderRadius:10,border:`.5px solid ${T.hairline}`,marginBottom:14}}>
                        {['Ventas por departamento con IVA','Metodos de pago','Arqueo de caja','Analisis Vera','QR cifrado'].map((item,i)=>(
                          <div key={i} style={{fontSize:12,color:T.text3,marginBottom:3,display:'flex',gap:6}}><span style={{color:T.green}}>✓</span>{item}</div>
                        ))}
                      </div>
                      <Toast msg={msg}/>
                      <Btn onClick={downloadPlantilla} disabled={loading} style={{width:'100%',justifyContent:'center',borderRadius:10,padding:'10px'}}>{loading?'Generando...':'Descargar plantilla'}</Btn>
                    </>
                  )}
                </Card>

                <Card>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                    <div>
                      <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2}}>Registro del mes</div>
                      <div style={{fontSize:12,color:T.text4}}>Transacciones registradas</div>
                    </div>
                  </div>
                  {registro&&(
                    <>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:14}}>
                        {[
                          {label:'Ingresos',value:`€${registro.resumen?.total_ingresos||0}`,color:T.green},
                          {label:'Gastos',  value:`€${registro.resumen?.total_gastos||0}`,  color:T.red},
                          {label:'Neto',    value:`€${registro.resumen?.resultado_neto||0}`,color:registro.resumen?.es_positivo?T.green:T.red},
                        ].map((s,i)=>(
                          <div key={i} style={{padding:'10px',background:T.sidebar,borderRadius:10,border:`.5px solid ${T.hairline}`,textAlign:'center'}}>
                            <div style={{fontSize:11,color:T.text4,marginBottom:3}}>{s.label}</div>
                            <div style={{fontSize:15,fontWeight:600,color:s.color,fontVariantNumeric:'tabular-nums'}}>{s.value}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{maxHeight:360,overflowY:'auto'}}>
                        {[...(registro.ingresos||[]).map(r=>({...r,tipo:'ingreso'})),...(registro.gastos||[]).map(r=>({...r,tipo:'gasto'}))].sort((a,b)=>b.fecha.localeCompare(a.fecha)).map((r,i)=>(
                          <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 0',borderBottom:`.5px solid ${T.soft}`}}>
                            <div>
                              <div style={{fontSize:13,fontWeight:500,color:T.text}}>{r.descripcion}</div>
                              <div style={{fontSize:11,color:T.text4}}>{r.fecha} · {r.categoria}</div>
                            </div>
                            <span style={{fontSize:13,fontWeight:600,color:r.tipo==='ingreso'?T.green:T.red,fontVariantNumeric:'tabular-nums'}}>{r.tipo==='ingreso'?'+':'-'}€{r.monto}</span>
                          </div>
                        ))}
                        {(registro.ingresos?.length||0)+(registro.gastos?.length||0)===0&&<div style={{padding:32,textAlign:'center',fontSize:13,color:T.text4}}>Sin transacciones este mes</div>}
                      </div>
                    </>
                  )}
                </Card>
              </div>
            </>
          )}

          {/* ══ LIBROS ══ */}
          {section==='libros'&&(
            <div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16}}>
                <Btn onClick={loadLedger} disabled={loading}>{loading?'Cargando...':'Cargar libro mayor'}</Btn>
                <Btn onClick={loadBalanza} disabled={loading} color={T.amber}>{loading?'Cargando...':'Cargar balanza'}</Btn>
              </div>

              {ledger&&(
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:15,fontWeight:600,color:T.text,marginBottom:12,letterSpacing:-0.2}}>Libro Mayor — {ledger.total_accounts} cuentas</div>
                  {ledger.ledger?.map((account,i)=>(
                    <Card key={i} style={{marginBottom:10,padding:16}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{fontSize:12,fontWeight:600,color:T.blue,background:'rgba(0,113,227,.08)',padding:'2px 8px',borderRadius:999}}>{account.account_code}</span>
                          <span style={{fontSize:13,fontWeight:500,color:T.text}}>{account.account_name}</span>
                          <span style={{fontSize:11,color:T.text4,background:T.sidebar,padding:'2px 8px',borderRadius:999,border:`.5px solid ${T.hairline}`}}>{account.account_type}</span>
                        </div>
                        <span style={{fontSize:15,fontWeight:600,color:account.closing_balance>=0?T.green:T.red,fontVariantNumeric:'tabular-nums'}}>€{account.closing_balance?.toFixed(2)}</span>
                      </div>
                      <div style={{maxHeight:160,overflowY:'auto'}}>
                        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                          <thead>
                            <tr style={{borderBottom:`.5px solid ${T.hairline}`}}>
                              {['Fecha','Descripcion','Debe','Haber','Saldo'].map(h=>(
                                <th key={h} style={{padding:'4px 8px',textAlign:h==='Debe'||h==='Haber'||h==='Saldo'?'right':'left',fontSize:11,fontWeight:500,color:T.text4}}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {account.entries?.map((entry,j)=>(
                              <tr key={j} style={{borderBottom:`.5px solid ${T.soft}`}} onMouseEnter={e=>e.currentTarget.style.background=T.sidebar} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                                <td style={{padding:'5px 8px',color:T.text4}}>{entry.date}</td>
                                <td style={{padding:'5px 8px',color:T.text2,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{entry.description}</td>
                                <td style={{padding:'5px 8px',color:T.green,textAlign:'right',fontVariantNumeric:'tabular-nums'}}>{entry.debit>0?`€${entry.debit}`:''}</td>
                                <td style={{padding:'5px 8px',color:T.red,textAlign:'right',fontVariantNumeric:'tabular-nums'}}>{entry.credit>0?`€${entry.credit}`:''}</td>
                                <td style={{padding:'5px 8px',color:T.text,fontWeight:500,textAlign:'right',fontVariantNumeric:'tabular-nums'}}>€{entry.balance?.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  ))}
                  {ledger.ledger?.length===0&&<Card style={{textAlign:'center',padding:48}}><div style={{fontSize:13,color:T.text4}}>Sin asientos contables registrados</div></Card>}
                </div>
              )}

              {balanza&&(
                <div>
                  <div style={{fontSize:15,fontWeight:600,color:T.text,marginBottom:12,letterSpacing:-0.2}}>Balanza de Comprobacion</div>
                  <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
                    <span style={{padding:'5px 14px',background:balanza.is_balanced?T.greenSoft:T.redSoft,color:balanza.is_balanced?T.green:T.red,borderRadius:999,fontSize:13,fontWeight:500}}>
                      {balanza.is_balanced?'Balanza cuadrada':'Balanza no cuadrada'}
                    </span>
                    <span style={{padding:'5px 14px',background:T.sidebar,borderRadius:999,fontSize:13,color:T.text2,border:`.5px solid ${T.hairline}`}}>Debitos: €{balanza.total_debits?.toFixed(2)}</span>
                    <span style={{padding:'5px 14px',background:T.sidebar,borderRadius:999,fontSize:13,color:T.text2,border:`.5px solid ${T.hairline}`}}>Creditos: €{balanza.total_credits?.toFixed(2)}</span>
                  </div>
                  <Card style={{padding:0,overflow:'hidden'}}>
                    <table style={{width:'100%',borderCollapse:'collapse'}}>
                      <thead>
                        <tr style={{background:T.sidebar,borderBottom:`.5px solid ${T.hairline}`}}>
                          {['Codigo','Cuenta','Tipo','Debito','Credito'].map(h=>(
                            <th key={h} style={{padding:'10px 14px',textAlign:h==='Debito'||h==='Credito'?'right':'left',fontSize:11,fontWeight:600,color:T.text3,textTransform:'uppercase',letterSpacing:0.5}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {balanza.accounts?.map((acc,i)=>(
                          <tr key={i} style={{borderBottom:`.5px solid ${T.soft}`}} onMouseEnter={e=>e.currentTarget.style.background=T.sidebar} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                            <td style={{padding:'9px 14px',fontSize:12,fontWeight:600,color:T.blue}}>{acc.code}</td>
                            <td style={{padding:'9px 14px',fontSize:13,color:T.text,fontWeight:500}}>{acc.name}</td>
                            <td style={{padding:'9px 14px',fontSize:12,color:T.text4}}>{acc.type}</td>
                            <td style={{padding:'9px 14px',fontSize:13,color:T.green,fontWeight:500,textAlign:'right',fontVariantNumeric:'tabular-nums'}}>{acc.debit>0?`€${acc.debit?.toFixed(2)}`:''}</td>
                            <td style={{padding:'9px 14px',fontSize:13,color:T.red,fontWeight:500,textAlign:'right',fontVariantNumeric:'tabular-nums'}}>{acc.credit>0?`€${acc.credit?.toFixed(2)}`:''}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{borderTop:`.5px solid ${T.hairline}`,background:T.sidebar}}>
                          <td colSpan="3" style={{padding:'10px 14px',fontSize:13,fontWeight:600,color:T.text}}>Totales</td>
                          <td style={{padding:'10px 14px',fontSize:13,fontWeight:600,color:T.green,textAlign:'right',fontVariantNumeric:'tabular-nums'}}>€{balanza.total_debits?.toFixed(2)}</td>
                          <td style={{padding:'10px 14px',fontSize:13,fontWeight:600,color:T.red,textAlign:'right',fontVariantNumeric:'tabular-nums'}}>€{balanza.total_credits?.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
