'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

import { API_BASE as API } from '@/lib/api'
const T = {
  bg:'#FBFBFD', card:'#FFFFFF', sidebar:'#F5F5F7',
  hairline:'rgba(0,0,0,0.08)', soft:'rgba(0,0,0,0.05)',
  text:'#1D1D1F', text2:'#424245', text3:'#6E6E73', text4:'#86868B',
  blue:'#0071E3', cyan:'#00B4D8',
  green:'#34C759', greenSoft:'rgba(52,199,89,.1)',
  amber:'#FF9500', amberSoft:'rgba(255,149,0,.1)',
  red:'#FF3B30', redSoft:'rgba(255,59,48,.08)',
}

const PAISES = [
  { code:'SV', name:'El Salvador', flag:'🇸🇻', desc:'DTE — Ministerio de Hacienda', disponible:true },
  { code:'ES', name:'España',       flag:'🇪🇸', desc:'FacturaE — AEAT VeriFactu',   disponible:false },
  { code:'MX', name:'México',       flag:'🇲🇽', desc:'CFDI — SAT',                  disponible:false },
  { code:'CO', name:'Colombia',     flag:'🇨🇴', desc:'DIAN — Factura Electrónica',  disponible:false },
  { code:'GT', name:'Guatemala',    flag:'🇬🇹', desc:'FEL — SAT Guatemala',         disponible:false },
  { code:'HN', name:'Honduras',     flag:'🇭🇳', desc:'SAR — Próximamente',          disponible:false },
]

const DEPARTAMENTOS_SV = [
  'Ahuachapán','Santa Ana','Sonsonate','Chalatenango','La Libertad',
  'San Salvador','Cuscatlán','La Paz','Cabañas','San Vicente',
  'Usulután','San Miguel','Morazán','La Unión'
]

const ACTIVIDADES = [
  'Comercio al por mayor y menor','Industria manufacturera','Servicios de alimentación',
  'Construcción','Transporte y almacenamiento','Servicios profesionales',
  'Tecnología e información','Salud y servicios sociales','Educación',
  'Agricultura y ganadería','Otros servicios'
]

function Card({ children, style={} }) {
  return <div style={{background:T.card,borderRadius:16,border:`.5px solid ${T.hairline}`,boxShadow:'0 1px 2px rgba(0,0,0,.03)',padding:20,...style}}>{children}</div>
}

function Btn({ children, onClick, disabled, color=T.blue, style={} }) {
  return <button onClick={onClick} disabled={disabled} style={{padding:'9px 20px',borderRadius:999,border:'none',fontSize:13,fontWeight:500,cursor:disabled?'not-allowed':'pointer',fontFamily:'inherit',background:disabled?T.sidebar:color,color:disabled?T.text4:'#fff',opacity:disabled?.6:1,display:'inline-flex',alignItems:'center',gap:6,transition:'all .15s',...style}}>{children}</button>
}

function BtnSec({ children, onClick, style={} }) {
  return <button onClick={onClick} style={{padding:'9px 20px',borderRadius:999,border:`.5px solid ${T.hairline}`,background:T.card,fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit',color:T.text,display:'inline-flex',alignItems:'center',gap:6,...style}}>{children}</button>
}

const inp = {
  width:'100%',padding:'9px 12px',borderRadius:10,
  border:`.5px solid ${T.hairline}`,background:T.sidebar,
  fontSize:13,color:T.text,fontFamily:'inherit',outline:'none',
}

function Field({ label, hint, children, valid, error }) {
  return (
    <div style={{marginBottom:14}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
        <div style={{fontSize:12,fontWeight:500,color:T.text3}}>{label}</div>
        {hint&&<div style={{fontSize:11,color:T.text4}}>{hint}</div>}
      </div>
      {children}
      {valid&&<div style={{fontSize:11,color:T.green,marginTop:4}}>✓ {valid}</div>}
      {error&&<div style={{fontSize:11,color:T.red,marginTop:4}}>✗ {error}</div>}
    </div>
  )
}

function Input({ style={}, ...props }) {
  return <input style={{...inp,...style}} {...props}
    onFocus={e=>e.target.style.borderColor=T.blue}
    onBlur={e=>e.target.style.borderColor='rgba(0,0,0,0.08)'}
  />
}

function Sel({ children, style={}, ...props }) {
  return <select style={{...inp,...style}} {...props}>{children}</select>
}

function StepIndicator({ paso, total }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:28}}>
      {Array.from({length:total}).map((_,i)=>(
        <div key={i} style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{
            width:28,height:28,borderRadius:999,display:'grid',placeItems:'center',
            fontSize:12,fontWeight:600,
            background: i+1<paso?T.green : i+1===paso?T.blue : T.sidebar,
            color: i+1<=paso?'#fff':T.text4,
            border: i+1===paso?`2px solid ${T.blue}`:'none',
            transition:'all .3s'
          }}>
            {i+1<paso?'✓':i+1}
          </div>
          {i<total-1&&<div style={{width:32,height:1.5,background:i+1<paso?T.green:T.hairline,transition:'background .3s'}}/>}
        </div>
      ))}
    </div>
  )
}

export default function FiscalConfig() {
  const router = useRouter()
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(false)
  const [paso, setPaso] = useState(1)
  const [paisSeleccionado, setPaisSeleccionado] = useState(null)
  const [msg, setMsg] = useState(null)

  // Form state
  const [form, setForm] = useState({
    nombre_comercial:'', nombre_legal:'', nit:'', nrc:'',
    giro:'', actividad_economica:'', tipo_contribuyente:'mediano',
    departamento:'San Salvador', municipio:'', direccion:'',
    telefono:'', email_fiscal:'',
    ambiente:'pruebas', serie_dte:'A',
    api_key:'', api_secret:'',
  })
  const [nitValido, setNitValido] = useState(null)
  const [nrcValido, setNrcValido] = useState(null)
  const [certFile, setCertFile] = useState(null)
  const [certPwd, setCertPwd] = useState('')
  const [tieneCert, setTieneCert] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [stats, setStats] = useState(null)

  const getToken = () => localStorage.getItem('nexum_token')

  useEffect(()=>{
    const t = getToken()
    if(!t){router.push('/login');return}
    setToken(t)
    try{const p=JSON.parse(atob(t.split('.')[1]));setUser({name:p.name||p.sub||'Usuario'})}catch{}
    loadConfig()
  },[])

  async function loadConfig() {
    const t = getToken()
    const [r1, r2] = await Promise.allSettled([
      fetch(`${API}/api/fiscal/config`,{headers:{Authorization:`Bearer ${t}`}}),
      fetch(`${API}/api/fiscal/stats`,{headers:{Authorization:`Bearer ${t}`}}),
    ])
    if(r1.status==='fulfilled'&&r1.value.ok){
      const d = await r1.value.json()
      setConfig(d)
      if(d.pais) setPaisSeleccionado(d.pais)
      if(d.wizard_paso) setPaso(d.wizard_completado?6:d.wizard_paso)
      if(d.configurado) setForm(prev=>({...prev,...d}))
      if(d.tiene_certificado) setTieneCert(true)
    }
    if(r2.status==='fulfilled'&&r2.value.ok) setStats(await r2.value.json())
  }

  async function savePaso(data, nextPaso) {
    setLoading(true)
    const t = getToken()
    const res = await fetch(`${API}/api/fiscal/config`,{
      method:'POST',
      headers:{'Content-Type':'application/json',Authorization:`Bearer ${t}`},
      body: JSON.stringify({...data, wizard_paso: nextPaso, pais: paisSeleccionado})
    })
    if(res.ok){
      setPaso(nextPaso)
      setMsg({type:'success', text:'Guardado correctamente'})
      setTimeout(()=>setMsg(null),2000)
    } else setMsg({type:'error', text:'Error guardando'})
    setLoading(false)
  }

  async function validarNIT() {
    const res = await fetch(`${API}/api/fiscal/validar-nit`,{
      method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},
      body: JSON.stringify({nit: form.nit})
    })
    const d = await res.json()
    setNitValido(d)
    if(d.valido) setForm(f=>({...f, nit: d.nit_formateado}))
  }

  async function validarNRC() {
    const res = await fetch(`${API}/api/fiscal/validar-nrc`,{
      method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},
      body: JSON.stringify({nrc: form.nrc})
    })
    const d = await res.json()
    setNrcValido(d)
    if(d.valido) setForm(f=>({...f, nrc: d.nrc_formateado}))
  }

  async function subirCertificado() {
    if(!certFile) return
    setLoading(true)
    const fd = new FormData()
    fd.append('file', certFile)
    fd.append('password', certPwd)
    const res = await fetch(`${API}/api/fiscal/certificado`,{
      method:'POST', headers:{Authorization:`Bearer ${getToken()}`}, body:fd
    })
    if(res.ok){ setTieneCert(true); setMsg({type:'success',text:'Certificado subido correctamente'}) }
    else setMsg({type:'error',text:'Error subiendo certificado'})
    setLoading(false)
  }

  async function testConexion() {
    setLoading(true)
    const res = await fetch(`${API}/api/fiscal/test-conexion`,{
      method:'POST', headers:{Authorization:`Bearer ${getToken()}`}
    })
    const d = await res.json()
    setTestResult(d)
    setLoading(false)
  }

  async function completarWizard() {
    setLoading(true)
    const res = await fetch(`${API}/api/fiscal/wizard/completar`,{
      method:'POST', headers:{Authorization:`Bearer ${getToken()}`}
    })
    if(res.ok){ setPaso(6); loadConfig() }
    setLoading(false)
  }

  const isConfigured = config?.wizard_completado

  return (
    <div style={{minHeight:'100vh',background:T.bg,display:'flex',fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',system-ui,sans-serif",WebkitFontSmoothing:'antialiased'}}>
      <style>{`*{box-sizing:border-box}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:999px}input:focus,select:focus{border-color:${T.blue}!important;outline:none}`}</style>

      <Sidebar active="/fiscal"/>

      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        {/* Header */}
        <header style={{height:56,background:'rgba(251,251,253,.9)',backdropFilter:'saturate(180%) blur(20px)',WebkitBackdropFilter:'saturate(180%) blur(20px)',borderBottom:`.5px solid ${T.hairline}`,display:'flex',alignItems:'center',padding:'0 24px',flexShrink:0,position:'sticky',top:0,zIndex:10}}>
          <div style={{display:'flex',flexDirection:'column',lineHeight:1.1}}>
            <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.3}}>Configuracion Fiscal</div>
            <div style={{fontSize:11,color:T.text4}}>Facturacion electronica y DTE</div>
          </div>
          {isConfigured&&(
            <div style={{marginLeft:16,padding:'3px 10px',background:T.greenSoft,borderRadius:999,fontSize:11,fontWeight:500,color:T.green}}>
              ✓ Activo — {paisSeleccionado}
            </div>
          )}
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:28,height:28,borderRadius:999,background:'linear-gradient(135deg,#0071E3,#00B4D8)',color:'#fff',display:'grid',placeItems:'center',fontWeight:600,fontSize:11}}>
              {user?.name?.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase()||'US'}
            </div>
          </div>
        </header>

        <div style={{flex:1,overflowY:'auto',padding:'28px 32px',maxWidth:860,margin:'0 auto',width:'100%'}}>

          {/* Stats si ya configurado */}
          {isConfigured&&stats&&(
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
              {[
                {label:'DTE emitidos',value:stats.total,color:T.text},
                {label:'Aceptados',   value:stats.aceptados,color:T.green},
                {label:'Pendientes',  value:stats.pendientes,color:T.amber},
                {label:'Monto total', value:`$${(stats.monto_total||0).toLocaleString('es-SV',{minimumFractionDigits:2})}`,color:T.blue},
              ].map((s,i)=>(
                <Card key={i} style={{padding:'16px 18px'}}>
                  <div style={{fontSize:11,color:T.text4,marginBottom:6}}>{s.label}</div>
                  <div style={{fontSize:24,fontWeight:600,color:s.color,fontVariantNumeric:'tabular-nums'}}>{s.value}</div>
                </Card>
              ))}
            </div>
          )}

          {/* PASO 1 — Seleccionar pais */}
          {paso===1&&(
            <Card>
              <div style={{fontSize:18,fontWeight:600,color:T.text,letterSpacing:-0.3,marginBottom:4}}>¿En qué país opera tu empresa?</div>
              <div style={{fontSize:13,color:T.text3,marginBottom:24}}>Configuraremos la facturación electrónica según la normativa local vigente.</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:24}}>
                {PAISES.map(p=>(
                  <div key={p.code} onClick={()=>{if(p.disponible)setPaisSeleccionado(p.code)}}
                    style={{
                      padding:'16px',borderRadius:14,
                      border:`.5px solid ${paisSeleccionado===p.code?T.blue:T.hairline}`,
                      background:paisSeleccionado===p.code?'rgba(0,113,227,.06)':p.disponible?T.card:'rgba(0,0,0,.02)',
                      cursor:p.disponible?'pointer':'not-allowed',
                      opacity:p.disponible?1:0.5,
                      boxShadow:paisSeleccionado===p.code?`0 0 0 1px ${T.blue}`:'none',
                      transition:'all .15s'
                    }}>
                    <div style={{fontSize:28,marginBottom:8}}>{p.flag}</div>
                    <div style={{fontSize:13,fontWeight:500,color:paisSeleccionado===p.code?T.blue:T.text,marginBottom:3}}>{p.name}</div>
                    <div style={{fontSize:11,color:T.text4}}>{p.desc}</div>
                    {!p.disponible&&<div style={{fontSize:10,color:T.amber,marginTop:4,fontWeight:500}}>Proximamente</div>}
                  </div>
                ))}
              </div>
              <Btn onClick={async()=>{
                if(!paisSeleccionado) return
                const t=getToken()
                await fetch(`${API}/api/fiscal/pais`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${t}`},body:JSON.stringify({pais:paisSeleccionado})})
                setPaso(2)
              }} disabled={!paisSeleccionado}>
                Continuar con {PAISES.find(p=>p.code===paisSeleccionado)?.name||'...'}
              </Btn>
            </Card>
          )}

          {/* PASO 2 — Datos de la empresa */}
          {paso===2&&(
            <Card>
              <StepIndicator paso={2} total={5}/>
              <div style={{fontSize:17,fontWeight:600,color:T.text,letterSpacing:-0.3,marginBottom:4}}>Datos fiscales de la empresa</div>
              <div style={{fontSize:13,color:T.text3,marginBottom:24}}>Esta información aparecerá en todos tus documentos tributarios electrónicos.</div>

              {msg&&<div style={{padding:'10px 14px',background:msg.type==='success'?T.greenSoft:T.redSoft,borderRadius:10,color:msg.type==='success'?T.green:T.red,fontSize:13,marginBottom:16}}>{msg.text}</div>}

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <Field label="Nombre comercial" hint="Como aparece en facturas">
                  <Input placeholder="Ej: Mi Empresa" value={form.nombre_comercial} onChange={e=>setForm(f=>({...f,nombre_comercial:e.target.value}))}/>
                </Field>
                <Field label="Razón social / Nombre legal">
                  <Input placeholder="Nombre legal completo" value={form.nombre_legal} onChange={e=>setForm(f=>({...f,nombre_legal:e.target.value}))}/>
                </Field>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <Field label="NIT" hint="14 dígitos" valid={nitValido?.valido?nitValido.nit_formateado:null} error={nitValido?.valido===false?nitValido.mensaje:null}>
                  <div style={{display:'flex',gap:8}}>
                    <Input placeholder="0000-000000-000-0" value={form.nit} onChange={e=>setForm(f=>({...f,nit:e.target.value}))} style={{flex:1}}/>
                    <button onClick={validarNIT} style={{padding:'8px 14px',borderRadius:8,border:`.5px solid ${T.hairline}`,background:T.sidebar,fontSize:12,color:T.blue,cursor:'pointer',fontFamily:'inherit',fontWeight:500,whiteSpace:'nowrap'}}>Validar</button>
                  </div>
                </Field>
                <Field label="NRC" hint="Número de Registro de Contribuyente" valid={nrcValido?.valido?'NRC válido':null} error={nrcValido?.valido===false?nrcValido.mensaje:null}>
                  <div style={{display:'flex',gap:8}}>
                    <Input placeholder="000000-0" value={form.nrc} onChange={e=>setForm(f=>({...f,nrc:e.target.value}))} style={{flex:1}}/>
                    <button onClick={validarNRC} style={{padding:'8px 14px',borderRadius:8,border:`.5px solid ${T.hairline}`,background:T.sidebar,fontSize:12,color:T.blue,cursor:'pointer',fontFamily:'inherit',fontWeight:500,whiteSpace:'nowrap'}}>Validar</button>
                  </div>
                </Field>
              </div>

              <Field label="Giro o actividad principal">
                <Input placeholder="Ej: Venta de ropa y accesorios" value={form.giro} onChange={e=>setForm(f=>({...f,giro:e.target.value}))}/>
              </Field>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <Field label="Actividad económica">
                  <Sel value={form.actividad_economica} onChange={e=>setForm(f=>({...f,actividad_economica:e.target.value}))}>
                    <option value="">Selecciona...</option>
                    {ACTIVIDADES.map(a=><option key={a} value={a}>{a}</option>)}
                  </Sel>
                </Field>
                <Field label="Tipo de contribuyente">
                  <Sel value={form.tipo_contribuyente} onChange={e=>setForm(f=>({...f,tipo_contribuyente:e.target.value}))}>
                    <option value="grande">Grande</option>
                    <option value="mediano">Mediano</option>
                    <option value="pequeno">Pequeño</option>
                  </Sel>
                </Field>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 2fr',gap:14}}>
                <Field label="Departamento">
                  <Sel value={form.departamento} onChange={e=>setForm(f=>({...f,departamento:e.target.value}))}>
                    {DEPARTAMENTOS_SV.map(d=><option key={d} value={d}>{d}</option>)}
                  </Sel>
                </Field>
                <Field label="Municipio">
                  <Input placeholder="Municipio" value={form.municipio} onChange={e=>setForm(f=>({...f,municipio:e.target.value}))}/>
                </Field>
                <Field label="Dirección">
                  <Input placeholder="Dirección completa" value={form.direccion} onChange={e=>setForm(f=>({...f,direccion:e.target.value}))}/>
                </Field>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <Field label="Teléfono">
                  <Input placeholder="0000-0000" value={form.telefono} onChange={e=>setForm(f=>({...f,telefono:e.target.value}))}/>
                </Field>
                <Field label="Email fiscal">
                  <Input type="email" placeholder="fiscal@tuempresa.com" value={form.email_fiscal} onChange={e=>setForm(f=>({...f,email_fiscal:e.target.value}))}/>
                </Field>
              </div>

              <div style={{display:'flex',gap:10,marginTop:8}}>
                <BtnSec onClick={()=>setPaso(1)}>Atrás</BtnSec>
                <Btn onClick={()=>savePaso({nombre_comercial:form.nombre_comercial,nombre_legal:form.nombre_legal,nit:form.nit,nrc:form.nrc,giro:form.giro,actividad_economica:form.actividad_economica,tipo_contribuyente:form.tipo_contribuyente,departamento:form.departamento,municipio:form.municipio,direccion:form.direccion,telefono:form.telefono,email_fiscal:form.email_fiscal},3)} disabled={loading||!form.nit||!form.nrc||!form.nombre_legal}>
                  {loading?'Guardando...':'Continuar'}
                </Btn>
              </div>
            </Card>
          )}

          {/* PASO 3 — Certificado digital */}
          {paso===3&&(
            <Card>
              <StepIndicator paso={3} total={5}/>
              <div style={{fontSize:17,fontWeight:600,color:T.text,letterSpacing:-0.3,marginBottom:4}}>Certificado digital</div>
              <div style={{fontSize:13,color:T.text3,marginBottom:24}}>El certificado digital es emitido gratuitamente por la DGII del Ministerio de Hacienda. Lo necesitas para firmar tus DTE.</div>

              <div style={{padding:'14px 16px',background:T.amberSoft,borderRadius:12,border:`.5px solid ${T.amber}`,marginBottom:20}}>
                <div style={{fontSize:13,fontWeight:500,color:T.amber,marginBottom:4}}>¿No tienes certificado aún?</div>
                <div style={{fontSize:12,color:T.text2,lineHeight:1.6}}>Puedes solicitarlo en <strong>factura.gob.sv</strong>. El proceso tarda hasta 60 días. Mientras tanto puedes usar el ambiente de pruebas.</div>
                <a href="https://factura.gob.sv" target="_blank" style={{fontSize:12,color:T.blue,fontWeight:500,display:'inline-block',marginTop:6}}>Ir a factura.gob.sv →</a>
              </div>

              <div style={{display:'flex',gap:10,marginBottom:20}}>
                <button onClick={()=>setTieneCert(false)} style={{flex:1,padding:'14px',border:`.5px solid ${!tieneCert?T.blue:T.hairline}`,borderRadius:12,background:!tieneCert?'rgba(0,113,227,.06)':T.card,cursor:'pointer',fontFamily:'inherit',boxShadow:!tieneCert?`0 0 0 1px ${T.blue}`:'none'}}>
                  <div style={{fontSize:13,fontWeight:500,color:!tieneCert?T.blue:T.text}}>No tengo certificado aún</div>
                  <div style={{fontSize:11,color:T.text4,marginTop:2}}>Usar ambiente de pruebas</div>
                </button>
                <button onClick={()=>setTieneCert(true)} style={{flex:1,padding:'14px',border:`.5px solid ${tieneCert?T.blue:T.hairline}`,borderRadius:12,background:tieneCert?'rgba(0,113,227,.06)':T.card,cursor:'pointer',fontFamily:'inherit',boxShadow:tieneCert?`0 0 0 1px ${T.blue}`:'none'}}>
                  <div style={{fontSize:13,fontWeight:500,color:tieneCert?T.blue:T.text}}>Ya tengo mi certificado</div>
                  <div style={{fontSize:11,color:T.text4,marginTop:2}}>Subir archivo .p12</div>
                </button>
              </div>

              {tieneCert&&(
                <div style={{marginBottom:20}}>
                  <Field label="Archivo del certificado (.p12)">
                    <div style={{border:`1.5px dashed ${certFile?T.green:T.hairline}`,borderRadius:12,padding:'24px',textAlign:'center',background:certFile?T.greenSoft:T.sidebar,cursor:'pointer'}}
                      onClick={()=>document.getElementById('certInput').click()}>
                      <div style={{fontSize:24,marginBottom:6}}>{certFile?'✓':'🔐'}</div>
                      <div style={{fontSize:13,fontWeight:500,color:T.text}}>{certFile?certFile.name:'Seleccionar archivo .p12'}</div>
                      <div style={{fontSize:11,color:T.text4,marginTop:2}}>Certificado emitido por la DGII</div>
                      <input id="certInput" type="file" accept=".p12,.pfx" style={{display:'none'}} onChange={e=>setCertFile(e.target.files[0])}/>
                    </div>
                  </Field>
                  <Field label="Contraseña del certificado">
                    <Input type="password" placeholder="Contraseña de tu certificado .p12" value={certPwd} onChange={e=>setCertPwd(e.target.value)}/>
                  </Field>
                  <Btn onClick={subirCertificado} disabled={loading||!certFile||!certPwd} color={T.green}>
                    {loading?'Subiendo...':'Subir certificado'}
                  </Btn>
                </div>
              )}

              <div style={{display:'flex',gap:10,marginTop:8}}>
                <BtnSec onClick={()=>setPaso(2)}>Atrás</BtnSec>
                <Btn onClick={()=>savePaso({tiene_certificado:tieneCert?1:0},4)} disabled={loading||(!tieneCert&&false)}>
                  {loading?'Guardando...':'Continuar'}
                </Btn>
              </div>
            </Card>
          )}

          {/* PASO 4 — Config DTE y API */}
          {paso===4&&(
            <Card>
              <StepIndicator paso={4} total={5}/>
              <div style={{fontSize:17,fontWeight:600,color:T.text,letterSpacing:-0.3,marginBottom:4}}>Configuración del sistema DTE</div>
              <div style={{fontSize:13,color:T.text3,marginBottom:24}}>Define cómo se numerarán y firmarán tus documentos tributarios.</div>

              {msg&&<div style={{padding:'10px 14px',background:msg.type==='success'?T.greenSoft:T.redSoft,borderRadius:10,color:msg.type==='success'?T.green:T.red,fontSize:13,marginBottom:16}}>{msg.text}</div>}

              <div style={{padding:'14px 16px',background:T.sidebar,borderRadius:12,border:`.5px solid ${T.hairline}`,marginBottom:20}}>
                <div style={{fontSize:13,fontWeight:500,color:T.text,marginBottom:8}}>Ambiente de operacion</div>
                <div style={{display:'flex',gap:10}}>
                  {[
                    {key:'pruebas',   label:'Pruebas',   desc:'Para desarrollo y testing. No tiene validez fiscal.'},
                    {key:'produccion',label:'Producción', desc:'DTE con validez legal ante el Ministerio de Hacienda.'},
                  ].map(a=>(
                    <div key={a.key} onClick={()=>setForm(f=>({...f,ambiente:a.key}))}
                      style={{flex:1,padding:'12px 14px',borderRadius:10,border:`.5px solid ${form.ambiente===a.key?a.key==='produccion'?T.green:T.blue:T.hairline}`,background:form.ambiente===a.key?a.key==='produccion'?T.greenSoft:'rgba(0,113,227,.06)':T.card,cursor:'pointer',boxShadow:form.ambiente===a.key?`0 0 0 1px ${a.key==='produccion'?T.green:T.blue}`:'none'}}>
                      <div style={{fontSize:13,fontWeight:500,color:form.ambiente===a.key?a.key==='produccion'?T.green:T.blue:T.text,marginBottom:3}}>{a.label}</div>
                      <div style={{fontSize:11,color:T.text4,lineHeight:1.4}}>{a.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
                <Field label="Serie de documentos" hint="Letra identificadora">
                  <Input placeholder="A" maxLength={3} value={form.serie_dte} onChange={e=>setForm(f=>({...f,serie_dte:e.target.value.toUpperCase()}))}/>
                </Field>
                <Field label="Próximo número DTE">
                  <Input type="number" min={1} placeholder="1" value={form.siguiente_numero||1} onChange={e=>setForm(f=>({...f,siguiente_numero:parseInt(e.target.value)}))}/>
                </Field>
                <Field label="IVA aplicable">
                  <Sel value={form.iva_porcentaje} onChange={e=>setForm(f=>({...f,iva_porcentaje:parseFloat(e.target.value)}))}>
                    <option value={0.13}>13% — IVA estándar El Salvador</option>
                    <option value={0}>0% — Exento de IVA</option>
                  </Sel>
                </Field>
              </div>

              <div style={{marginTop:4,padding:'14px 16px',background:T.sidebar,borderRadius:12,border:`.5px solid ${T.hairline}`,marginBottom:20}}>
                <div style={{fontSize:13,fontWeight:500,color:T.text,marginBottom:4}}>Credenciales API Hacienda</div>
                <div style={{fontSize:12,color:T.text3,marginBottom:12}}>Las obtienes en factura.gob.sv al registrarte como emisor. Son opcionales en ambiente de pruebas.</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <Field label="Usuario / API Key">
                    <Input placeholder="Usuario de la plataforma" value={form.api_key} onChange={e=>setForm(f=>({...f,api_key:e.target.value}))}/>
                  </Field>
                  <Field label="Contraseña / API Secret">
                    <Input type="password" placeholder="Contraseña" value={form.api_secret} onChange={e=>setForm(f=>({...f,api_secret:e.target.value}))}/>
                  </Field>
                </div>
                {form.api_key&&form.api_secret&&(
                  <div>
                    <button onClick={testConexion} disabled={loading} style={{padding:'7px 16px',borderRadius:999,border:`.5px solid ${T.hairline}`,background:T.card,fontSize:12,color:T.blue,cursor:'pointer',fontFamily:'inherit',fontWeight:500}}>
                      {loading?'Probando...':'Probar conexión'}
                    </button>
                    {testResult&&(
                      <div style={{marginTop:10,padding:'10px 14px',background:testResult.ok?T.greenSoft:T.redSoft,borderRadius:10,fontSize:12,color:testResult.ok?T.green:T.red}}>
                        {testResult.ok?'✓':'✗'} {testResult.mensaje}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{display:'flex',gap:10}}>
                <BtnSec onClick={()=>setPaso(3)}>Atrás</BtnSec>
                <Btn onClick={()=>savePaso({ambiente:form.ambiente,serie_dte:form.serie_dte,siguiente_numero:form.siguiente_numero||1,iva_porcentaje:form.iva_porcentaje,api_key:form.api_key,api_secret:form.api_secret},5)} disabled={loading}>
                  {loading?'Guardando...':'Continuar'}
                </Btn>
              </div>
            </Card>
          )}

          {/* PASO 5 — Revision y activar */}
          {paso===5&&(
            <Card>
              <StepIndicator paso={5} total={5}/>
              <div style={{fontSize:17,fontWeight:600,color:T.text,letterSpacing:-0.3,marginBottom:4}}>Revisar y activar</div>
              <div style={{fontSize:13,color:T.text3,marginBottom:24}}>Revisa tu configuración antes de activar la facturación electrónica.</div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20}}>
                {[
                  {label:'País fiscal',         value:PAISES.find(p=>p.code===paisSeleccionado)?.name||'—'},
                  {label:'Nombre legal',         value:form.nombre_legal||'—'},
                  {label:'NIT',                  value:form.nit||'—'},
                  {label:'NRC',                  value:form.nrc||'—'},
                  {label:'Giro',                 value:form.giro||'—'},
                  {label:'Departamento',         value:form.departamento||'—'},
                  {label:'Ambiente',             value:form.ambiente==='produccion'?'🟢 Producción':'🟡 Pruebas'},
                  {label:'Serie DTE',            value:form.serie_dte||'A'},
                  {label:'Certificado digital',  value:tieneCert?'✓ Subido':'Pendiente'},
                  {label:'IVA',                  value:`${(form.iva_porcentaje||0.13)*100}%`},
                ].map((r,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:`.5px solid ${T.soft}`}}>
                    <span style={{fontSize:13,color:T.text3}}>{r.label}</span>
                    <span style={{fontSize:13,fontWeight:500,color:T.text}}>{r.value}</span>
                  </div>
                ))}
              </div>

              {form.ambiente==='produccion'&&!tieneCert&&(
                <div style={{padding:'14px 16px',background:T.redSoft,borderRadius:12,border:`.5px solid ${T.red}`,marginBottom:16}}>
                  <div style={{fontSize:13,fontWeight:500,color:T.red}}>⚠️ Certificado requerido para producción</div>
                  <div style={{fontSize:12,color:T.text2,marginTop:3}}>Para emitir DTE en producción necesitas subir tu certificado digital.</div>
                  <button onClick={()=>setPaso(3)} style={{fontSize:12,color:T.blue,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',marginTop:6,fontWeight:500}}>Ir a subir certificado →</button>
                </div>
              )}

              <div style={{display:'flex',gap:10}}>
                <BtnSec onClick={()=>setPaso(4)}>Atrás</BtnSec>
                <Btn onClick={completarWizard} disabled={loading||(form.ambiente==='produccion'&&!tieneCert)} color={T.green} style={{padding:'10px 24px'}}>
                  {loading?'Activando...':'✓ Activar facturación electrónica'}
                </Btn>
              </div>
            </Card>
          )}

          {/* PASO 6 — Configurado */}
          {paso===6&&(
            <div>
              <Card style={{textAlign:'center',padding:'40px 32px',marginBottom:16}}>
                <div style={{fontSize:48,marginBottom:14}}>🎉</div>
                <div style={{fontSize:22,fontWeight:600,color:T.text,letterSpacing:-0.4,marginBottom:8}}>Facturación electrónica activa</div>
                <div style={{fontSize:14,color:T.text3,marginBottom:24,maxWidth:420,margin:'0 auto 24px',lineHeight:1.6}}>
                  Tu empresa está configurada para emitir DTE en El Salvador. Puedes generar facturas desde el módulo de Ventas.
                </div>
                <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
                  <Btn onClick={()=>router.push('/ventas')} style={{padding:'10px 24px'}}>Ir a Ventas</Btn>
                  <BtnSec onClick={()=>setPaso(2)}>Editar configuracion</BtnSec>
                </div>
              </Card>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <Card>
                  <div style={{fontSize:14,fontWeight:600,color:T.text,letterSpacing:-0.2,marginBottom:12}}>Tipos de DTE disponibles</div>
                  {[
                    {code:'01',name:'Factura',                desc:'Para consumidores finales'},
                    {code:'03',name:'Comprobante Crédito Fiscal',desc:'Para contribuyentes IVA'},
                    {code:'05',name:'Nota de Crédito',        desc:'Devoluciones y descuentos'},
                    {code:'06',name:'Nota de Débito',         desc:'Cargos adicionales'},
                  ].map(d=>(
                    <div key={d.code} style={{display:'flex',alignItems:'center',gap:12,padding:'9px 0',borderBottom:`.5px solid ${T.soft}`}}>
                      <span style={{fontSize:11,fontWeight:600,color:T.blue,background:'rgba(0,113,227,.08)',padding:'2px 8px',borderRadius:999,flexShrink:0}}>{d.code}</span>
                      <div>
                        <div style={{fontSize:13,fontWeight:500,color:T.text}}>{d.name}</div>
                        <div style={{fontSize:11,color:T.text4}}>{d.desc}</div>
                      </div>
                    </div>
                  ))}
                </Card>
                <Card>
                  <div style={{fontSize:14,fontWeight:600,color:T.text,letterSpacing:-0.2,marginBottom:12}}>Tu configuracion activa</div>
                  {[
                    {label:'Pais',       value:`🇸🇻 El Salvador`},
                    {label:'Ambiente',   value:form.ambiente==='produccion'?'🟢 Produccion':'🟡 Pruebas'},
                    {label:'NIT',        value:form.nit||config?.nit||'—'},
                    {label:'NRC',        value:form.nrc||config?.nrc||'—'},
                    {label:'Serie',      value:form.serie_dte||config?.serie_dte||'A'},
                    {label:'IVA',        value:`${((form.iva_porcentaje||config?.iva_porcentaje||0.13)*100).toFixed(0)}%`},
                    {label:'Certificado',value:tieneCert?'✓ Activo':'Pendiente'},
                  ].map((r,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:`.5px solid ${T.soft}`}}>
                      <span style={{fontSize:12,color:T.text3}}>{r.label}</span>
                      <span style={{fontSize:12,fontWeight:500,color:T.text}}>{r.value}</span>
                    </div>
                  ))}
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
