'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { API_BASE } from '@/lib/api'

const API = API_BASE

import Sidebar from '@/components/Sidebar'
import { useT, useTheme } from '@/components/ui/tokens'

const MODULE_ACCESS = [
  { key:'dashboard',    label:'Dashboard'        },
  { key:'contabilidad', label:'Contabilidad'     },
  { key:'finanzas',     label:'Finanzas'         },
  { key:'hr',           label:'Recursos Humanos' },
  { key:'proyectos',    label:'Proyectos'        },
  { key:'clientes',     label:'Clientes'         },
  { key:'ventas',       label:'Ventas'           },
  { key:'documentos',   label:'Documentos'       },
  { key:'agente',       label:'Agente IA'        },
  { key:'marketing',    label:'Marketing IA'     },
]

const PAISES_FISCAL = [
  { code:'SV', name:'El Salvador', sistema:'DTE',      ente:'Ministerio de Hacienda', disponible:true  },
  { code:'ES', name:'España',      sistema:'FacturaE', ente:'AEAT VeriFactu',         disponible:false },
  { code:'MX', name:'México',      sistema:'CFDI',     ente:'SAT',                    disponible:false },
  { code:'CO', name:'Colombia',    sistema:'DIAN',     ente:'DIAN',                   disponible:false },
  { code:'GT', name:'Guatemala',   sistema:'FEL',      ente:'SAT Guatemala',          disponible:false },
]

const DEPARTAMENTOS_SV = ['Ahuachapán','Santa Ana','Sonsonate','Chalatenango','La Libertad','San Salvador','Cuscatlán','La Paz','Cabañas','San Vicente','Usulután','San Miguel','Morazán','La Unión']
const ACTIVIDADES_SV = ['Comercio al por mayor y menor','Industria manufacturera','Servicios de alimentación','Construcción','Transporte y almacenamiento','Servicios profesionales','Tecnología e información','Salud y servicios sociales','Educación','Agricultura y ganadería','Otros servicios']

const PROVINCIAS_ES = ['Álava','Albacete','Alicante','Almería','Asturias','Ávila','Badajoz','Barcelona','Burgos','Cáceres','Cádiz','Cantabria','Castellón','Ciudad Real','Córdoba','Cuenca','Girona','Granada','Guadalajara','Guipúzcoa','Huelva','Huesca','Islas Baleares','Jaén','La Coruña','La Rioja','Las Palmas','León','Lleida','Lugo','Madrid','Málaga','Murcia','Navarra','Ourense','Palencia','Pontevedra','Salamanca','Santa Cruz de Tenerife','Segovia','Sevilla','Soria','Tarragona','Teruel','Toledo','Valencia','Valladolid','Vizcaya','Zamora','Zaragoza']
const ACTIVIDADES_ES = ['Comercio al por menor','Comercio al por mayor','Industria manufacturera','Construcción','Hostelería y restauración','Transporte y logística','Servicios profesionales','Tecnología e información','Salud y servicios sociales','Educación','Agricultura y ganadería','Servicios financieros','Inmobiliaria','Otros servicios']
const REGIMENES_ES = ['General','Simplificado','Recargo de equivalencia','Criterio de caja','Arrendamiento','Agricola ganadero y pesquero','Grupos de entidades']

function Card({children,style={}}){ const T = useT(); return <div style={{background:T.card,borderRadius:16,border:`.5px solid ${T.hairline}`,boxShadow:'0 1px 2px rgba(0,0,0,.03)',padding:20,...style}}>{children}</div> }
function Btn({children,onClick,disabled,color,style={}}){ const T = useT(); const c = color ?? T.blue; return <button onClick={onClick} disabled={disabled} style={{padding:'8px 18px',borderRadius:999,border:'none',fontSize:13,fontWeight:500,cursor:disabled?'not-allowed':'pointer',fontFamily:'inherit',background:disabled?T.sidebar:c,color:disabled?T.text4:'#fff',opacity:disabled?.6:1,display:'inline-flex',alignItems:'center',gap:6,transition:'all .15s',...style}}>{children}</button> }
function BtnSec({children,onClick,style={}}){ const T = useT(); return <button onClick={onClick} style={{padding:'8px 18px',borderRadius:999,border:`.5px solid ${T.hairline}`,background:T.card,fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit',color:T.text,display:'inline-flex',alignItems:'center',gap:6,...style}}>{children}</button> }

const inp = (T) => ({width:'100%',padding:'8px 11px',borderRadius:8,border:`.5px solid ${T.hairline}`,background:T.sidebar,fontSize:13,color:T.text,fontFamily:'inherit',outline:'none',transition:'border-color .15s'})

function Field({label,hint,ok,err,children}){
  const T = useT()
  return (
    <div style={{marginBottom:14}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
        <span style={{fontSize:12,fontWeight:500,color:T.text3}}>{label}</span>
        {hint&&<span style={{fontSize:11,color:T.text4}}>{hint}</span>}
      </div>
      {children}
      {ok&&<div style={{fontSize:11,color:T.green,marginTop:3}}>✓ {ok}</div>}
      {err&&<div style={{fontSize:11,color:T.red,marginTop:3}}>✗ {err}</div>}
    </div>
  )
}

function Input({style={},...props}){
  const T = useT()
  return <input style={{...inp(T),...style}} {...props}
    onFocus={e=>e.target.style.borderColor=T.blue}
    onBlur={e=>e.target.style.borderColor=T.hairline}
  />
}

function Sel({children,style={},...props}){
  const T = useT()
  return <select style={{...inp(T),...style}} {...props}>{children}</select>
}

function Toggle({value,onChange}){
  const T = useT()
  return (
    <div onClick={()=>onChange(!value)} style={{width:40,height:22,borderRadius:999,background:value?T.blue:T.hairline,cursor:'pointer',position:'relative',transition:'background .2s',flexShrink:0}}>
      <div style={{width:18,height:18,borderRadius:999,background:'#fff',position:'absolute',top:2,left:value?20:2,transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.15)'}}/>
    </div>
  )
}

function Steps({current,total,labels}){
  const T = useT()
  return (
    <div style={{display:'flex',alignItems:'center',gap:0,marginBottom:24}}>
      {Array.from({length:total}).map((_,i)=>(
        <div key={i} style={{display:'flex',alignItems:'center',flex:i<total-1?1:'none'}}>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
            <div style={{width:26,height:26,borderRadius:999,display:'grid',placeItems:'center',fontSize:11,fontWeight:600,background:i+1<current?T.green:i+1===current?T.text:T.sidebar,color:i+1<=current?'#fff':T.text4,transition:'all .3s'}}>
              {i+1<current?'✓':i+1}
            </div>
            {labels&&<div style={{fontSize:10,color:i+1===current?T.text:T.text4,fontWeight:i+1===current?500:400,whiteSpace:'nowrap'}}>{labels[i]}</div>}
          </div>
          {i<total-1&&<div style={{flex:1,height:1.5,background:i+1<current?T.green:T.hairline,margin:'0 6px',marginBottom:labels?14:0,transition:'background .3s'}}/>}
        </div>
      ))}
    </div>
  )
}

// ── Fiscal Wizard ──────────────────────────────────────────────────────────────
function FiscalWizard({token}){
  const T = useT()
  const [paso,setPaso]=useState(1)
  const [companyCountry,setCompanyCountry]=useState(null)
  const [config,setConfig]=useState(null)
  const [pais,setPais]=useState(null)
  const [loading,setLoading]=useState(false)
  const [msg,setMsg]=useState(null)
  const [stats,setStats]=useState(null)
  const [nitOk,setNitOk]=useState(null)
  const [nrcOk,setNrcOk]=useState(null)
  const [certFile,setCertFile]=useState(null)
  const [certPwd,setCertPwd]=useState('')
  const [tieneCert,setTieneCert]=useState(null)
  const [certSubido,setCertSubido]=useState(false)
  const [testResult,setTestResult]=useState(null)
  const [form,setForm]=useState({
    nombre_comercial:'',nombre_legal:'',nit:'',nrc:'',
    giro:'',actividad_economica:'',tipo_contribuyente:'mediano',
    departamento:'San Salvador',municipio:'',direccion:'',
    telefono:'',email_fiscal:'',
    ambiente:'pruebas',serie_dte:'A',siguiente_numero:1,iva_porcentaje:0.21,
    api_key:'',api_secret:''
  })

  const H={Authorization:`Bearer ${token}`}

  async function load(){
    try{
      const [r0,r1,r2]=await Promise.allSettled([
        fetch(`${API}/api/auth/me`,{headers:H}),
        fetch(`${API}/api/fiscal/config`,{headers:H}),
        fetch(`${API}/api/fiscal/stats`,{headers:H}),
      ])
      if(r0.status==='fulfilled'&&r0.value.ok){
        const me=await r0.value.json()
        if(me.country){
          setPais(me.country);setCompanyCountry(me.country);setPaso(p=>p===1?2:p)
          // Ajustar IVA por defecto segun pais
          setForm(f=>({...f,iva_porcentaje:me.country==='SV'?0.13:0.21}))
        }
      }
      if(r1.status==='fulfilled'&&r1.value.ok){
        const d=await r1.value.json()
        setConfig(d)
        if(d.pais)setPais(d.pais)
        if(d.wizard_completado)setPaso(6)
        else if(d.wizard_paso&&d.wizard_paso>1)setPaso(d.wizard_paso)
        if(d.nit)setForm(f=>({...f,...d}))
        if(d.tiene_certificado){setTieneCert(true);setCertSubido(true)}
      }
      if(r2.status==='fulfilled'&&r2.value.ok)setStats(await r2.value.json())
    }catch{}
  }

  async function save(data,next){
    setLoading(true)
    try{
      const res=await fetch(`${API}/api/fiscal/config`,{method:'POST',headers:{...H,'Content-Type':'application/json'},body:JSON.stringify({...data,wizard_paso:next,pais})})
      if(res.ok){setPaso(next);setMsg(null)}
      else setMsg({ok:false,text:'Error guardando'})
    }catch{setMsg({ok:false,text:'Error de conexion'})}
    setLoading(false)
  }

  async function validarNIT(){
    if(!form.nit)return
    try{
      const r=await fetch(`${API}/api/fiscal/validar-nit`,{method:'POST',headers:{...H,'Content-Type':'application/json'},body:JSON.stringify({nit:form.nit})})
      const d=await r.json();setNitOk(d)
      if(d.valido)setForm(f=>({...f,nit:d.nit_formateado}))
    }catch{}
  }

  async function validarNRC(){
    if(!form.nrc)return
    try{
      const r=await fetch(`${API}/api/fiscal/validar-nrc`,{method:'POST',headers:{...H,'Content-Type':'application/json'},body:JSON.stringify({nrc:form.nrc})})
      const d=await r.json();setNrcOk(d)
    }catch{}
  }

  async function subirCert(){
    if(!certFile||!certPwd)return
    setLoading(true)
    try{
      const fd=new FormData();fd.append('file',certFile);fd.append('password',certPwd)
      const r=await fetch(`${API}/api/fiscal/certificado`,{method:'POST',headers:H,body:fd})
      if(r.ok){setCertSubido(true);setMsg({ok:true,text:'Firma digital verificada y guardada de forma segura'})}
      else setMsg({ok:false,text:'No se pudo verificar. Revisa la contrasena.'})
    }catch{setMsg({ok:false,text:'Error subiendo la firma'})}
    setLoading(false)
  }

  async function testAPI(){
    setLoading(true)
    try{const r=await fetch(`${API}/api/fiscal/test-conexion`,{method:'POST',headers:H});setTestResult(await r.json())}catch{}
    setLoading(false)
  }

  async function activar(){
    setLoading(true)
    try{const r=await fetch(`${API}/api/fiscal/wizard/completar`,{method:'POST',headers:H});if(r.ok){setPaso(6);load()}}catch{}
    setLoading(false)
  }

  useEffect(()=>{if(token)load()},[token])

  const paisInfo=PAISES_FISCAL.find(p=>p.code===companyCountry)

  if(!token)return null

  return (
    <div>
      {msg&&(
        <div style={{padding:'10px 14px',background:msg.ok?T.greenSoft:T.redSoft,border:`.5px solid ${msg.ok?T.green:T.red}`,borderRadius:10,color:msg.ok?T.green:T.red,fontSize:13,marginBottom:16}}>
          {msg.text}
        </div>
      )}

      {/* Stats si activo */}
      {config?.wizard_completado&&stats&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))',gap:10,marginBottom:20}}>
          {[
            {label:'DTE emitidos',value:stats.total,          color:T.text},
            {label:'Aceptados',   value:stats.aceptados,      color:T.green},
            {label:'Pendientes',  value:stats.pendientes,     color:T.amber},
            {label:'Monto total', value:`$${(stats.monto_total||0).toLocaleString('es-SV',{minimumFractionDigits:2})}`,color:T.blue},
          ].map((s,i)=>(
            <Card key={i} style={{padding:'14px 16px'}}>
              <div style={{fontSize:11,color:T.text4,marginBottom:4}}>{s.label}</div>
              <div style={{fontSize:22,fontWeight:600,color:s.color,fontVariantNumeric:'tabular-nums'}}>{s.value}</div>
            </Card>
          ))}
        </div>
      )}

      {/* PASO 1 */}
      {paso===1&&(
        <div>
          {/* Pais seleccionado — grande y claro */}
          <div style={{padding:'32px',background:T.text,borderRadius:16,marginBottom:16,textAlign:'center'}}>
            <div style={{fontSize:48,marginBottom:12,lineHeight:1}}>
              {companyCountry==='ES'?'🇪🇸':companyCountry==='SV'?'🇸🇻':companyCountry==='MX'?'🇲🇽':companyCountry==='CO'?'🇨🇴':companyCountry==='GT'?'🇬🇹':'🌐'}
            </div>
            <div style={{fontSize:28,fontWeight:700,color:'#fff',letterSpacing:-0.6,marginBottom:6}}>
              {paisInfo?.name||companyCountry}
            </div>
            <div style={{fontSize:14,color:'rgba(255,255,255,.5)',marginBottom:4}}>{paisInfo?.sistema} — {paisInfo?.ente}</div>
            <div style={{display:'inline-block',marginTop:12,padding:'4px 14px',background:'rgba(255,255,255,.1)',borderRadius:999,fontSize:12,color:'rgba(255,255,255,.6)'}}>
              Pais fiscal fijo al registrarse
            </div>
          </div>
          <Card style={{marginBottom:12}}>
            <div style={{fontSize:13,color:T.text2,lineHeight:1.6}}>
              Vela configurara automaticamente todo lo necesario para cumplir con la normativa fiscal de <strong>{paisInfo?.ente}</strong>. El pais queda fijo al registrar la empresa — si necesitas operar en otro pais, contacta con soporte.
            </div>
          </Card>
          <Btn onClick={()=>setPaso(2)}>
            Configurar facturacion de {paisInfo?.name||companyCountry}
          </Btn>
        </div>
      )}

      {/* PASO 2 */}
      {paso===2&&(
        <div>
          <Steps current={2} total={5} labels={['Pais','Empresa','Firma','Config','Activar']}/>
          {/* Badge pais */}
          <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'5px 12px',background:T.sidebar,borderRadius:999,border:`.5px solid ${T.hairline}`,marginBottom:16,cursor:'pointer'}} onClick={()=>setPaso(1)}>
            <span style={{fontSize:16}}>{companyCountry==='ES'?'🇪🇸':companyCountry==='SV'?'🇸🇻':companyCountry==='MX'?'🇲🇽':'🌐'}</span>
            <span style={{fontSize:13,fontWeight:500,color:T.text}}>{paisInfo?.name||companyCountry}</span>
            <span style={{fontSize:11,color:T.text4}}>·</span>
            <span style={{fontSize:11,color:T.text4}}>{paisInfo?.sistema}</span>
          </div>
          <div style={{fontSize:13,color:T.text3,marginBottom:20,lineHeight:1.6}}>
            {companyCountry==='ES'
              ? 'Esta informacion aparecera en todos tus documentos fiscales. Debe coincidir con tu registro en la AEAT.'
              : 'Esta informacion aparecera en todos tus documentos fiscales. Debe coincidir exactamente con tu registro ante el Ministerio de Hacienda.'}
          </div>

          <div className="set-row" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <Field label="Nombre comercial" hint="Como te conocen tus clientes">
              <Input placeholder="Mi Empresa" value={form.nombre_comercial} onChange={e=>setForm(f=>({...f,nombre_comercial:e.target.value}))}/>
            </Field>
            <Field label="Razon social / Nombre legal" hint={companyCountry==='ES'?'Como aparece en el Registro Mercantil':'Exactamente como aparece en Hacienda'}>
              <Input placeholder={companyCountry==='ES'?'Mi Empresa S.L.':'Mi Empresa S.A. de C.V.'} value={form.nombre_legal} onChange={e=>setForm(f=>({...f,nombre_legal:e.target.value}))}/>
            </Field>
          </div>

          {/* Campos segun pais */}
          {companyCountry==='ES'&&(
            <div>
              <div className="set-row" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <Field label="CIF / NIF" hint="Identificacion fiscal" ok={nitOk?.valido?'CIF valido':null} err={nitOk?.valido===false?'Formato incorrecto. Ej: B12345678 o 12345678Z':null}>
                  <div style={{display:'flex',gap:8}}>
                    <Input placeholder="B12345678" value={form.nit} onChange={e=>{setForm(f=>({...f,nit:e.target.value}));setNitOk(null)}} style={{flex:1}}/>
                    <button onClick={validarNIT} style={{padding:'8px 14px',borderRadius:8,border:`.5px solid ${T.hairline}`,background:T.sidebar,fontSize:12,color:T.blue,cursor:'pointer',fontFamily:'inherit',fontWeight:500,whiteSpace:'nowrap'}}>Verificar</button>
                  </div>
                </Field>
                <Field label="Regimen de IVA">
                  <Sel value={form.tipo_contribuyente} onChange={e=>setForm(f=>({...f,tipo_contribuyente:e.target.value}))}>
                    {REGIMENES_ES.map(r=><option key={r} value={r}>{r}</option>)}
                  </Sel>
                </Field>
              </div>
              <Field label="Actividad economica">
                <Sel value={form.actividad_economica} onChange={e=>setForm(f=>({...f,actividad_economica:e.target.value}))}>
                  <option value="">Selecciona tu actividad...</option>
                  {ACTIVIDADES_ES.map(a=><option key={a} value={a}>{a}</option>)}
                </Sel>
              </Field>
              <Field label="Descripcion de la actividad" hint="Que vende o que servicios ofrece">
                <Input placeholder="Ej: Venta de ropa y accesorios" value={form.giro} onChange={e=>setForm(f=>({...f,giro:e.target.value}))}/>
              </Field>
              <div className="set-row" style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:14}}>
                <Field label="Provincia">
                  <Sel value={form.departamento} onChange={e=>setForm(f=>({...f,departamento:e.target.value}))}>
                    <option value="">Selecciona...</option>
                    {PROVINCIAS_ES.map(p=><option key={p} value={p}>{p}</option>)}
                  </Sel>
                </Field>
                <Field label="Direccion fiscal">
                  <Input placeholder="Calle, numero, piso, codigo postal, ciudad" value={form.direccion} onChange={e=>setForm(f=>({...f,direccion:e.target.value}))}/>
                </Field>
              </div>
              <div className="set-row" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <Field label="Telefono"><Input placeholder="+34 600 000 000" value={form.telefono} onChange={e=>setForm(f=>({...f,telefono:e.target.value}))}/></Field>
                <Field label="Email fiscal"><Input type="email" placeholder="fiscal@empresa.com" value={form.email_fiscal} onChange={e=>setForm(f=>({...f,email_fiscal:e.target.value}))}/></Field>
              </div>
            </div>
          )}

          {companyCountry==='SV'&&(
            <div>
              <div className="set-row" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <Field label="NIT" hint="14 digitos" ok={nitOk?.valido?'NIT valido':null} err={nitOk?.valido===false?'Formato incorrecto. Ejemplo: 0614-010101-001-0':null}>
                  <div style={{display:'flex',gap:8}}>
                    <Input placeholder="0000-000000-000-0" value={form.nit} onChange={e=>{setForm(f=>({...f,nit:e.target.value}));setNitOk(null)}} onBlur={()=>{if(form.nit)validarNIT()}} style={{flex:1,borderColor:nitOk?.valido===true?T.green:nitOk?.valido===false?T.red:undefined}}/>
                    <button onClick={validarNIT} style={{padding:'8px 14px',borderRadius:8,border:`.5px solid ${T.hairline}`,background:T.sidebar,fontSize:12,color:T.blue,cursor:'pointer',fontFamily:'inherit',fontWeight:500,whiteSpace:'nowrap'}}>Verificar</button>
                  </div>
                </Field>
                <Field label="NRC" hint="Numero de Registro de Contribuyente" ok={nrcOk?.valido?'NRC valido':null} err={nrcOk?.valido===false?'NRC invalido':null}>
                  <div style={{display:'flex',gap:8}}>
                    <Input placeholder="000000-0" value={form.nrc} onChange={e=>{setForm(f=>({...f,nrc:e.target.value}));setNrcOk(null)}} onBlur={()=>{if(form.nrc)validarNRC()}} style={{flex:1}}/>
                    <button onClick={validarNRC} style={{padding:'8px 14px',borderRadius:8,border:`.5px solid ${T.hairline}`,background:T.sidebar,fontSize:12,color:T.blue,cursor:'pointer',fontFamily:'inherit',fontWeight:500,whiteSpace:'nowrap'}}>Verificar</button>
                  </div>
                </Field>
              </div>
              <Field label="Actividad economica">
                <Sel value={form.actividad_economica} onChange={e=>setForm(f=>({...f,actividad_economica:e.target.value}))}>
                  <option value="">Selecciona tu actividad...</option>
                  {ACTIVIDADES_SV.map(a=><option key={a} value={a}>{a}</option>)}
                </Sel>
              </Field>
              <Field label="Descripcion del giro" hint="Que vende o que servicios ofrece">
                <Input placeholder="Ej: Venta de ropa y accesorios" value={form.giro} onChange={e=>setForm(f=>({...f,giro:e.target.value}))}/>
              </Field>
              <div className="set-row" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <Field label="Tipo de contribuyente">
                  <Sel value={form.tipo_contribuyente} onChange={e=>setForm(f=>({...f,tipo_contribuyente:e.target.value}))}>
                    <option value="grande">Grande</option>
                    <option value="mediano">Mediano</option>
                    <option value="pequeno">Pequeno</option>
                  </Sel>
                </Field>
                <Field label="Departamento">
                  <Sel value={form.departamento} onChange={e=>setForm(f=>({...f,departamento:e.target.value}))}>
                    {DEPARTAMENTOS_SV.map(d=><option key={d} value={d}>{d}</option>)}
                  </Sel>
                </Field>
              </div>
              <div className="set-row" style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:14}}>
                <Field label="Municipio">
                  <Input placeholder="Municipio" value={form.municipio} onChange={e=>setForm(f=>({...f,municipio:e.target.value}))}/>
                </Field>
                <Field label="Direccion">
                  <Input placeholder="Calle, numero, colonia, referencia" value={form.direccion} onChange={e=>setForm(f=>({...f,direccion:e.target.value}))}/>
                </Field>
              </div>
              <div className="set-row" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <Field label="Telefono"><Input placeholder="0000-0000" value={form.telefono} onChange={e=>setForm(f=>({...f,telefono:e.target.value}))}/></Field>
                <Field label="Email fiscal"><Input type="email" placeholder="fiscal@empresa.com" value={form.email_fiscal} onChange={e=>setForm(f=>({...f,email_fiscal:e.target.value}))}/></Field>
              </div>
            </div>
          )}

          {companyCountry&&companyCountry!=='ES'&&companyCountry!=='SV'&&(
            <div style={{padding:'20px',background:T.sidebar,borderRadius:12,border:`.5px solid ${T.hairline}`,marginBottom:16,textAlign:'center'}}>
              <div style={{fontSize:14,fontWeight:500,color:T.text,marginBottom:6}}>Pais en desarrollo</div>
              <div style={{fontSize:13,color:T.text3}}>La configuracion fiscal para {PAISES_FISCAL.find(p=>p.code===companyCountry)?.name||companyCountry} estara disponible proximamente.</div>
            </div>
          )}

          <div style={{display:'flex',gap:10,marginTop:8}}>
            <BtnSec onClick={()=>setPaso(1)}>Atras</BtnSec>
            <Btn onClick={()=>save({nombre_comercial:form.nombre_comercial,nombre_legal:form.nombre_legal,nit:form.nit,nrc:form.nrc,giro:form.giro,actividad_economica:form.actividad_economica,tipo_contribuyente:form.tipo_contribuyente,departamento:form.departamento,municipio:form.municipio,direccion:form.direccion,telefono:form.telefono,email_fiscal:form.email_fiscal},3)}
              disabled={loading||!form.nombre_legal}>
              {loading?'Guardando...':'Continuar'}
            </Btn>
          </div>
        </div>
      )}

      {/* PASO 3 */}
      {paso===3&&(
        <div>
          <Steps current={3} total={5} labels={['Pais','Empresa','Firma','Config','Activar']}/>
          <div style={{fontSize:16,fontWeight:600,color:T.text,letterSpacing:-0.3,marginBottom:4}}>Firma digital</div>
          <div style={{fontSize:13,color:T.text3,marginBottom:20,lineHeight:1.6}}>
            Para que tus documentos fiscales tengan validez legal, necesitan una firma digital. La emite el Ministerio de Hacienda de forma gratuita cuando registras tu empresa como emisor.
          </div>

          {tieneCert===null&&(
            <div className="set-row" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
              {[
                {v:true, t:'Ya tengo mi firma digital',    d:'Tengo el archivo .p12 y su contrasena listos para subir.'},
                {v:false,t:'Todavia no la tengo',          d:'La estoy tramitando o no la he solicitado aun.'},
              ].map(o=>(
                <div key={String(o.v)} onClick={()=>setTieneCert(o.v)}
                  style={{padding:'18px',borderRadius:12,border:`.5px solid ${T.hairline}`,cursor:'pointer',transition:'all .15s',background:T.card}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=T.blue;e.currentTarget.style.background=T.sidebar}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(0,0,0,0.08)';e.currentTarget.style.background=T.card}}
                >
                  <div style={{fontSize:13,fontWeight:500,color:T.text,marginBottom:4}}>{o.t}</div>
                  <div style={{fontSize:12,color:T.text4,lineHeight:1.5}}>{o.d}</div>
                </div>
              ))}
            </div>
          )}

          {tieneCert===true&&!certSubido&&(
            <div style={{marginBottom:20}}>
              <div style={{padding:'12px 14px',background:T.sidebar,borderRadius:10,border:`.5px solid ${T.hairline}`,marginBottom:16,fontSize:13,color:T.text2,lineHeight:1.6}}>
                El archivo de firma digital tiene extension <strong>.p12</strong> y viene con una contrasena. Vela lo guardara cifrado — no tendras que volver a subirlo.
              </div>
              <Field label="Archivo de firma digital (.p12)">
                <div style={{border:`1.5px dashed ${certFile?T.green:T.hairline}`,borderRadius:12,padding:'28px',textAlign:'center',background:certFile?T.greenSoft:T.sidebar,cursor:'pointer',transition:'all .2s'}}
                  onClick={()=>document.getElementById('certFile').click()}>
                  <div style={{width:40,height:40,borderRadius:10,background:T.card,border:`.5px solid ${T.hairline}`,display:'grid',placeItems:'center',margin:'0 auto 10px'}}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={certFile?T.green:T.text3} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  </div>
                  <div style={{fontSize:13,fontWeight:500,color:T.text}}>{certFile?certFile.name:'Seleccionar archivo .p12'}</div>
                  <div style={{fontSize:11,color:T.text4,marginTop:3}}>Solo archivos .p12 o .pfx</div>
                  <input id="certFile" type="file" accept=".p12,.pfx" style={{display:'none'}} onChange={e=>setCertFile(e.target.files[0])}/>
                </div>
              </Field>
              <Field label="Contrasena de la firma digital">
                <Input type="password" placeholder="Contrasena del archivo .p12" value={certPwd} onChange={e=>setCertPwd(e.target.value)}/>
              </Field>
              <div style={{display:'flex',gap:10}}>
                <BtnSec onClick={()=>setTieneCert(null)}>Volver</BtnSec>
                <Btn onClick={subirCert} disabled={loading||!certFile||!certPwd} color={T.green}>
                  {loading?'Verificando...':'Subir y verificar'}
                </Btn>
              </div>
            </div>
          )}

          {tieneCert===true&&certSubido&&(
            <div style={{padding:'14px 16px',background:T.greenSoft,borderRadius:12,border:`.5px solid ${T.green}`,marginBottom:20}}>
              <div style={{fontSize:13,fontWeight:500,color:T.green,marginBottom:3}}>Firma digital verificada</div>
              <div style={{fontSize:12,color:T.text2}}>Tus documentos fiscales tendran validez legal completa ante el Ministerio de Hacienda.</div>
            </div>
          )}

          {tieneCert===false&&(
            <div>
              <div style={{padding:'14px 16px',background:T.amberSoft,borderRadius:12,border:`.5px solid ${T.amber}`,marginBottom:16}}>
                <div style={{fontSize:13,fontWeight:500,color:T.amber,marginBottom:6}}>Sin firma digital — modo de pruebas</div>
                <div style={{fontSize:13,color:T.text2,lineHeight:1.6,marginBottom:6}}>
                  Activaremos tu cuenta en <strong>modo de pruebas</strong>. Podras generar y practicar con tus documentos fiscales, pero no tendran validez legal hasta que subas tu firma digital.
                </div>
                <div style={{fontSize:13,color:T.text2,lineHeight:1.6}}>
                  Cuando la tengas, vuelve aqui y la subes en menos de un minuto. Vela hara el resto automaticamente.
                </div>
              </div>
              <BtnSec onClick={()=>setTieneCert(null)}>Volver</BtnSec>
            </div>
          )}

          {(certSubido||tieneCert===false)&&(
            <div style={{display:'flex',gap:10,marginTop:16}}>
              <BtnSec onClick={()=>setPaso(2)}>Atras</BtnSec>
              <Btn onClick={()=>save({tiene_certificado:certSubido?1:0},4)} disabled={loading}>
                {loading?'Guardando...':'Continuar'}
              </Btn>
            </div>
          )}
        </div>
      )}

      {/* PASO 4 */}
      {paso===4&&(
        <div>
          <Steps current={4} total={5} labels={['Pais','Empresa','Firma','Config','Activar']}/>
          <div style={{fontSize:16,fontWeight:600,color:T.text,letterSpacing:-0.3,marginBottom:4}}>Configuracion de documentos</div>
          <div style={{fontSize:13,color:T.text3,marginBottom:20,lineHeight:1.6}}>
            Vela ya tiene todo configurado con los valores estandar para El Salvador. Solo ajusta lo que necesites.
          </div>

          <Field label="Modo de operacion">
            <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:4}}>
              {[
                {k:'pruebas',   l:'Pruebas',    d:'Los documentos no tienen validez fiscal. Para familiarizarte con el sistema.'},
                {k:'produccion',l:'Produccion', d:'Documentos con validez legal completa ante el Ministerio de Hacienda.'},
              ].map(o=>(
                <div key={o.k} onClick={()=>setForm(f=>({...f,ambiente:o.k}))}
                  style={{padding:'12px 14px',borderRadius:10,border:`.5px solid ${form.ambiente===o.k?(o.k==='produccion'?T.green:T.blue):T.hairline}`,background:form.ambiente===o.k?T.sidebar:T.card,cursor:'pointer',transition:'all .15s'}}>
                  <div style={{fontSize:13,fontWeight:500,color:form.ambiente===o.k?(o.k==='produccion'?T.green:T.blue):T.text,marginBottom:2}}>{o.l}</div>
                  <div style={{fontSize:11,color:T.text4,lineHeight:1.4}}>{o.d}</div>
                </div>
              ))}
            </div>
          </Field>

          <div className="set-row" style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
            <Field label="Serie" hint="Letra identificadora">
              <Input placeholder="A" maxLength={3} value={form.serie_dte} onChange={e=>setForm(f=>({...f,serie_dte:e.target.value.toUpperCase()}))}/>
            </Field>
            <Field label="Numero inicial">
              <Input type="number" min={1} value={form.siguiente_numero} onChange={e=>setForm(f=>({...f,siguiente_numero:parseInt(e.target.value)||1}))}/>
            </Field>
            <Field label="IVA aplicable">
              <Sel value={form.iva_porcentaje} onChange={e=>setForm(f=>({...f,iva_porcentaje:parseFloat(e.target.value)}))}>
                {companyCountry==='ES'?(
                  <>
                    <option value={0.21}>21% — Tipo general</option>
                    <option value={0.10}>10% — Tipo reducido</option>
                    <option value={0.04}>4% — Tipo superreducido</option>
                    <option value={0}>0% — Exento de IVA</option>
                  </>
                ):(
                  <>
                    <option value={0.13}>13% — Tasa estandar El Salvador</option>
                    <option value={0}>0% — Exento de IVA</option>
                  </>
                )}
              </Sel>
            </Field>
          </div>

          {form.ambiente==='produccion'&&!certSubido&&(
            <div style={{padding:'12px 14px',background:T.redSoft,borderRadius:10,border:`.5px solid ${T.red}`,marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:500,color:T.red,marginBottom:3}}>Se requiere firma digital para produccion</div>
              <div style={{fontSize:12,color:T.text2}}>Regresa al paso anterior para subir tu archivo .p12 antes de activar el modo de produccion.</div>
              <button onClick={()=>setPaso(3)} style={{fontSize:12,color:T.blue,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',marginTop:6,fontWeight:500}}>Ir a subir firma digital</button>
            </div>
          )}

          <div style={{display:'flex',gap:10,marginTop:8}}>
            <BtnSec onClick={()=>setPaso(3)}>Atras</BtnSec>
            <Btn onClick={()=>save({ambiente:form.ambiente,serie_dte:form.serie_dte,siguiente_numero:form.siguiente_numero||1,iva_porcentaje:form.iva_porcentaje},5)}
              disabled={loading||(form.ambiente==='produccion'&&!certSubido)}>
              {loading?'Guardando...':'Continuar'}
            </Btn>
          </div>
        </div>
      )}

      {/* PASO 5 */}
      {paso===5&&(
        <div>
          <Steps current={5} total={5} labels={['Pais','Empresa','Firma','Config','Activar']}/>
          <div style={{fontSize:16,fontWeight:600,color:T.text,letterSpacing:-0.3,marginBottom:4}}>Todo listo para activar</div>
          <div style={{fontSize:13,color:T.text3,marginBottom:20,lineHeight:1.6}}>
            Revisa que todo este correcto antes de activar. Podras editar estos datos en cualquier momento.
          </div>

          <Card style={{padding:0,overflow:'hidden',marginBottom:16}}>
            {[
              {l:'Pais fiscal',    v:PAISES_FISCAL.find(p=>p.code===pais)?.name||'—'},
              {l:'Nombre legal',   v:form.nombre_legal||config?.nombre_legal||'—'},
              {l:'NIT',            v:form.nit||config?.nit||'—'},
              {l:'NRC',            v:form.nrc||config?.nrc||'—'},
              {l:'Actividad',      v:form.actividad_economica||config?.actividad_economica||'—'},
              {l:'Departamento',   v:form.departamento||config?.departamento||'—'},
              {l:'Email fiscal',   v:form.email_fiscal||config?.email_fiscal||'—'},
              {l:'Modo',           v:form.ambiente==='produccion'?'Produccion — validez legal':'Pruebas — sin validez fiscal'},
              {l:'Serie',          v:form.serie_dte||config?.serie_dte||'A'},
              {l:'IVA',            v:`${((form.iva_porcentaje||config?.iva_porcentaje||0.13)*100).toFixed(0)}%`},
              {l:'Firma digital',  v:certSubido||config?.tiene_certificado?'Activa — documentos con validez legal':'Pendiente — modo pruebas activo'},
            ].map((r,i,arr)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'11px 16px',borderBottom:i<arr.length-1?`.5px solid ${T.soft}`:'none'}}>
                <span style={{fontSize:13,color:T.text3}}>{r.l}</span>
                <span style={{fontSize:13,fontWeight:500,color:T.text}}>{r.v}</span>
              </div>
            ))}
          </Card>

          <div style={{display:'flex',gap:10}}>
            <BtnSec onClick={()=>setPaso(4)}>Atras</BtnSec>
            <Btn onClick={activar} disabled={loading||(form.ambiente==='produccion'&&!certSubido)} color={T.green} style={{padding:'10px 28px'}}>
              {loading?'Activando...':'Activar facturacion electronica'}
            </Btn>
          </div>
        </div>
      )}

      {/* PASO 6 */}
      {paso===6&&(
        <div>
          <Card style={{textAlign:'center',padding:'40px 32px',marginBottom:16}}>
            <div style={{width:56,height:56,borderRadius:16,background:T.greenSoft,border:`.5px solid ${T.green}`,display:'grid',placeItems:'center',margin:'0 auto 16px'}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div style={{fontSize:20,fontWeight:600,color:T.text,letterSpacing:-0.4,marginBottom:8}}>Facturacion electronica activa</div>
            <div style={{fontSize:13,color:T.text3,maxWidth:400,margin:'0 auto 24px',lineHeight:1.6}}>
              {config?.ambiente==='produccion'
                ?'Tus documentos tributarios electronicos tienen validez legal completa ante el Ministerio de Hacienda.'
                :'Estas en modo de pruebas. Cuando tengas tu firma digital, subela aqui para activar validez legal.'}
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
              <Btn onClick={()=>window.location.href='/ventas'}>Ir a emitir documentos</Btn>
              <BtnSec onClick={()=>setPaso(2)}>Editar datos</BtnSec>
              {!certSubido&&!config?.tiene_certificado&&(
                <BtnSec onClick={()=>setPaso(3)} style={{borderColor:T.amber,color:T.amber}}>Subir firma digital</BtnSec>
              )}
            </div>
          </Card>

          <div className="set-row" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <Card>
              <div style={{fontSize:14,fontWeight:600,color:T.text,letterSpacing:-0.2,marginBottom:14}}>Documentos que puedes emitir</div>
              {[
                {code:'01',name:'Factura',                   desc:'Para ventas a consumidores finales'},
                {code:'03',name:'Comprobante Credito Fiscal', desc:'Para ventas a otros contribuyentes IVA'},
                {code:'05',name:'Nota de Credito',           desc:'Para devoluciones y descuentos'},
                {code:'06',name:'Nota de Debito',            desc:'Para cargos adicionales a facturas'},
              ].map(d=>(
                <div key={d.code} style={{display:'flex',alignItems:'center',gap:12,padding:'9px 0',borderBottom:`.5px solid ${T.soft}`}}>
                  <span style={{fontSize:11,fontWeight:600,color:T.blue,background:'rgba(79,70,229,.08)',padding:'2px 8px',borderRadius:999,flexShrink:0}}>{d.code}</span>
                  <div>
                    <div style={{fontSize:13,fontWeight:500,color:T.text}}>{d.name}</div>
                    <div style={{fontSize:11,color:T.text4}}>{d.desc}</div>
                  </div>
                </div>
              ))}
            </Card>
            <Card>
              <div style={{fontSize:14,fontWeight:600,color:T.text,letterSpacing:-0.2,marginBottom:14}}>Tu configuracion activa</div>
              {[
                {l:'Pais',        v:`El Salvador`},
                {l:'Modo',        v:config?.ambiente==='produccion'?'Produccion':'Pruebas'},
                {l:'NIT',         v:config?.nit||form.nit||'—'},
                {l:'NRC',         v:config?.nrc||form.nrc||'—'},
                {l:'Serie',       v:config?.serie_dte||form.serie_dte||'A'},
                {l:'IVA',         v:`${((config?.iva_porcentaje||0.13)*100).toFixed(0)}%`},
                {l:'Firma digital',v:certSubido||config?.tiene_certificado?'Activa':'Pendiente'},
              ].map((r,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:`.5px solid ${T.soft}`}}>
                  <span style={{fontSize:12,color:T.text3}}>{r.l}</span>
                  <span style={{fontSize:12,fontWeight:500,color:T.text}}>{r.v}</span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Settings ──────────────────────────────────────────────────────────────
function SettingsInner(){
  const T = useT()
  const router=useRouter()
  const searchParams=useSearchParams()
  const { theme, setTheme }=useTheme()
  const [tab,setTab]=useState(searchParams?.get('tab')||'company')
  const [token,setToken]=useState(null)
  const [user,setUser]=useState(null)
  const [saved,setSaved]=useState(false)
  const [companyData,setCompanyData]=useState({name:'',cif:'',address:'',phone:'',email:'',website:''})
  const [team,setTeam]=useState([])
  const [inviteEmail,setInviteEmail]=useState('')
  const [inviteRole,setInviteRole]=useState('member')
  const [inviting,setInviting]=useState(false)
  const [billingStatus,setBillingStatus]=useState(null)
  const [upgradeLoading,setUpgradeLoading]=useState(null)
  const [portalLoading,setPortalLoading]=useState(false)
  const [cancelLoading,setCancelLoading]=useState(false)
  const [showUpgradeModal,setShowUpgradeModal]=useState(null)
  const [showDowngradeModal,setShowDowngradeModal]=useState(null)
  const [twoFA,setTwoFA]=useState({enabled:false,loading:false,qr:null,secret:null,code:'',verifying:false,error:null,step:null})
  const PLANS_INFO=[
    {id:'starter',name:'Starter',monthly:19,users:1,modules:['Dashboard','Contabilidad','Finanzas','Ventas'],moduleCount:4,ai:50,docs:25,color:'#6b7280'},
    {id:'pro',name:'Pro',monthly:39,users:3,modules:['Dashboard','Contabilidad','Finanzas','Ventas','RRHH','Proyectos','Clientes','Documentos','Agente IA'],moduleCount:9,ai:500,docs:100,color:'#4F46E5'},
    {id:'business',name:'Business',monthly:79,users:10,modules:['Dashboard','Contabilidad','Finanzas','Ventas','RRHH','Proyectos','Clientes','Documentos','Agente IA','Marketing IA'],moduleCount:10,ai:-1,docs:-1,color:'#4F46E5'},
  ]
  const [notifPrefs,setNotifPrefs]=useState({stock_bajo:true,clientes_riesgo:true,proyectos_urgentes:true,mensajes_pendientes:true,alertas_contabilidad:true,informe_semanal:true,email_digest:false,push:true})
  const [profileOpen,setProfileOpen]=useState(false)
  const profileRef=useRef()

  useEffect(()=>{
    function h(e){if(profileRef.current&&!profileRef.current.contains(e.target))setProfileOpen(false)}
    document.addEventListener('mousedown',h)
    return()=>document.removeEventListener('mousedown',h)
  },[])

  useEffect(()=>{
    const t=localStorage.getItem('vela_token')
    if(!t){router.push('/login');return}
    setToken(t)
    try{const p=JSON.parse(atob(t.split('.')[1]));setUser({email:p.sub||'',name:p.name||p.sub||'Usuario',is_admin:p.is_admin})}
    catch{setUser({email:'',name:'Usuario'})}
  },[])

  useEffect(()=>{
    if(token&&(tab==='subscription'||tab==='team'))loadBillingStatus()
  },[token,tab])

  async function loadBillingStatus(){
    try{
      const r=await fetch(`${API}/api/billing/status`,{headers:{Authorization:`Bearer ${token}`}})
      if(r.ok)setBillingStatus(await r.json())
    }catch{}
  }

  function showSaved(){setSaved(true);setTimeout(()=>setSaved(false),2000)}

  async function handleInvite(){
    if(!inviteEmail)return
    setInviting(true)
    await fetch(`${API}/api/team/invite`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({email:inviteEmail,role:inviteRole})})
    setInviteEmail('');setInviting(false)
    showSaved()
  }

  function handleUpgrade(planId){
    const targetPlan=PLANS_INFO.find(p=>p.id===planId)
    const currentPlanId=billingStatus?.plan||'trial'
    const currentPlan=PLANS_INFO.find(p=>p.id===currentPlanId)
    if(!targetPlan)return
    // No sub yet or upgrading
    const currentIdx=PLANS_INFO.findIndex(p=>p.id===currentPlanId)
    const targetIdx=PLANS_INFO.findIndex(p=>p.id===planId)
    if(currentIdx>=0&&targetIdx<currentIdx){
      // DOWNGRADE
      const lostModules=currentPlan.modules.filter(m=>!targetPlan.modules.includes(m))
      const lostUsers=currentPlan.users-targetPlan.users
      const lostAI=currentPlan.ai===-1?'IA ilimitada → '+targetPlan.ai+'/mes':currentPlan.ai>targetPlan.ai?(currentPlan.ai-targetPlan.ai)+' consultas IA/mes':null
      const savings=currentPlan.monthly-targetPlan.monthly
      // Calculate days left in period
      let daysLeft=0
      if(billingStatus?.current_period_end){
        const end=new Date(billingStatus.current_period_end)
        daysLeft=Math.max(0,Math.ceil((end-new Date())/(1000*60*60*24)))
      }
      setShowDowngradeModal({from:currentPlan,to:targetPlan,lostModules,lostUsers,lostAI,savings,daysLeft,periodEnd:billingStatus?.current_period_end})
    } else {
      // UPGRADE or new sub
      let prorationCredit=0
      if(currentPlan&&billingStatus?.current_period_end&&billingStatus?.status==='active'){
        const end=new Date(billingStatus.current_period_end)
        const daysLeft=Math.max(0,Math.ceil((end-new Date())/(1000*60*60*24)))
        const dailyRate=currentPlan.monthly/30
        prorationCredit=Math.round(dailyRate*daysLeft*100)/100
      }
      setShowUpgradeModal({plan:targetPlan,prorationCredit,isNew:!currentPlan||currentPlanId==='trial',currentPlan})
    }
  }
  async function confirmUpgrade(planId){
    setUpgradeLoading(planId)
    try{
      const isNew=!billingStatus?.plan||billingStatus?.plan==='trial'||billingStatus?.status==='none'
      const endpoint=isNew?'/api/billing/subscription/checkout':'/api/billing/upgrade'
      const body=isNew?{plan_id:planId}:{new_plan_id:planId}
      const r=await fetch(`${API}${endpoint}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body)})
      const d=await r.json()
      if(d.checkout_url)window.location.href=d.checkout_url
      else{loadBillingStatus();setShowUpgradeModal(null);setShowDowngradeModal(null)}
    }catch{}
    setUpgradeLoading(null)
  }

  async function handlePortal(){
    setPortalLoading(true)
    try{
      const r=await fetch(`${API}/api/billing/portal`,{method:'POST',headers:{Authorization:`Bearer ${token}`}})
      const d=await r.json()
      if(d.portal_url)window.location.href=d.portal_url
    }catch{}
    setPortalLoading(false)
  }

  async function handleCancel(){
    setCancelLoading(true)
    try{await fetch(`${API}/api/billing/cancel`,{method:'POST',headers:{Authorization:`Bearer ${token}`}});loadBillingStatus()}catch{}
    setCancelLoading(false)
  }

  const initials=user?.name?user.name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase():'US'

  const TABS=[
    {id:'company',      label:'Empresa'},
    {id:'subscription', label:'Suscripcion'},
    {id:'team',         label:'Equipo'},
    {id:'notifications',label:'Notificaciones'},
    {id:'apariencia',   label:'Apariencia'},
    {id:'security',     label:'Seguridad'},
    {id:'fiscal',       label:'Fiscal'},
  ]

  return (
    <div style={{minHeight:'100dvh',background:T.bg,display:'flex',fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',system-ui,sans-serif",WebkitFontSmoothing:'antialiased'}}>
      <style>{`*{box-sizing:border-box}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:${T.hairline};border-radius:999px}input:focus,select:focus,textarea:focus{border-color:${T.blue}!important;outline:none}@media (max-width:768px){.set-row{grid-template-columns:1fr!important}}`}</style>

      <Sidebar active="/settings"/>

      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        {/* Header */}
        <header style={{height:56,background:theme==='dark'?'rgba(11,11,12,.9)':'rgba(251,251,253,.9)',backdropFilter:'saturate(180%) blur(20px)',WebkitBackdropFilter:'saturate(180%) blur(20px)',borderBottom:`.5px solid ${T.hairline}`,display:'flex',alignItems:'center',padding:'0 24px',flexShrink:0,position:'sticky',top:0,zIndex:10}}>
          <button onClick={()=>router.back()} aria-label="Volver al dashboard" style={{display:'flex',alignItems:'center',gap:6,background:'none',border:'none',cursor:'pointer',color:T.text3,fontSize:13,fontFamily:'inherit',marginRight:12,padding:'4px 8px',borderRadius:8}}
            onMouseEnter={e=>e.currentTarget.style.background=T.soft}
            onMouseLeave={e=>e.currentTarget.style.background='none'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            Dashboard
          </button>
          <div style={{width:1,height:18,background:T.hairline,marginRight:16}}/>
          <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.3}}>Configuracion</div>

          {saved&&<div style={{marginLeft:16,padding:'3px 10px',background:T.greenSoft,borderRadius:999,fontSize:11,fontWeight:500,color:T.green}}>Guardado</div>}

          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8}}>
            <div ref={profileRef} style={{position:'relative'}}>
              <div onClick={()=>setProfileOpen(o=>!o)} style={{display:'flex',alignItems:'center',gap:8,padding:'3px 4px 3px 3px',borderRadius:999,cursor:'pointer'}}
                onMouseEnter={e=>e.currentTarget.style.background=T.soft}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              >
                <div style={{width:28,height:28,borderRadius:999,background:'linear-gradient(135deg,#4F46E5,#A5B1FF)',color:'#fff',display:'grid',placeItems:'center',fontWeight:600,fontSize:11}}>{initials}</div>
                <span style={{fontSize:13,fontWeight:500,color:T.text}}>{user?.name?.split(' ')[0]||'Usuario'}</span>
              </div>
              {profileOpen&&(
                <div style={{position:'absolute',top:44,right:0,width:180,background:T.card,borderRadius:12,border:`.5px solid ${T.hairline}`,boxShadow:'0 8px 32px rgba(0,0,0,.12)',zIndex:200,overflow:'hidden'}}>
                  <div style={{padding:'6px 0'}}>
                    <button onClick={()=>setProfileOpen(false)} style={{width:'100%',padding:'9px 14px',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:13,color:T.text,textAlign:'left'}} onMouseEnter={e=>e.currentTarget.style.background=T.sidebar} onMouseLeave={e=>e.currentTarget.style.background='none'}>Mi perfil</button>
                  </div>
                  <div style={{padding:'6px 8px 10px',borderTop:`.5px solid ${T.hairline}`}}>
                    <button onClick={()=>{localStorage.removeItem('vela_token');router.push('/login')}} style={{width:'100%',padding:'8px',background:T.redSoft,border:'none',borderRadius:8,color:T.red,fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>Cerrar sesion</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div style={{flex:1,overflowY:'auto'}}>
          {/* Tab bar */}
          <div style={{borderBottom:`.5px solid ${T.hairline}`,background:theme==='dark'?'rgba(11,11,12,.9)':'rgba(251,251,253,.9)',backdropFilter:'saturate(180%) blur(20px)',display:'flex',padding:'0 24px'}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:'0 16px',height:44,background:'none',border:'none',borderBottom:tab===t.id?`2px solid ${T.text}`:'2px solid transparent',color:tab===t.id?T.text:T.text3,fontWeight:tab===t.id?600:400,fontSize:13,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',transition:'all .15s'}}>
                {t.label}
              </button>
            ))}
          </div>

          <div style={{padding:'24px 28px',maxWidth:860,margin:'0 auto',paddingTop:28}}>

            {/* APARIENCIA */}
            {tab==='apariencia'&&(
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <Card>
                  <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2,marginBottom:4}}>Tema</div>
                  <div style={{fontSize:13,color:T.text3,marginBottom:16,lineHeight:1.5}}>Elige cómo se ve Vela. Se guarda en este dispositivo.</div>
                  <div className="set-row" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,maxWidth:420}}>
                    {[
                      {k:'light',l:'Claro',d:'Fondo claro',
                        icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>},
                      {k:'dark',l:'Oscuro',d:'Fondo oscuro',
                        icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>},
                    ].map(o=>{
                      const active=theme===o.k
                      return (
                        <button key={o.k} type="button" onClick={()=>setTheme(o.k)}
                          aria-pressed={active}
                          style={{textAlign:'left',padding:16,borderRadius:12,cursor:'pointer',fontFamily:'inherit',
                            border:`1px solid ${active?T.blue:T.hairline}`,
                            background:active?'rgba(79,70,229,.06)':T.card,
                            color:active?T.blue:T.text2,transition:'all .15s'}}>
                          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                            {o.icon}
                            {active&&<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                          </div>
                          <div style={{fontSize:13.5,fontWeight:600,color:active?T.blue:T.text}}>{o.l}</div>
                          <div style={{fontSize:11.5,color:T.text4,marginTop:2}}>{o.d}</div>
                        </button>
                      )
                    })}
                  </div>
                </Card>
              </div>
            )}

            {/* EMPRESA */}
            {tab==='company'&&(
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <Card>
                  <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2,marginBottom:16}}>Datos de la empresa</div>
                  <div className="set-row" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                    {[
                      {key:'name',    label:'Nombre de la empresa', placeholder:'Mi Empresa S.L.'},
                      {key:'cif',     label:'CIF / NIF',            placeholder:'B12345678'},
                      {key:'address', label:'Direccion fiscal',     placeholder:'Calle Mayor 1'},
                      {key:'phone',   label:'Telefono',             placeholder:'+34 600 000 000'},
                      {key:'email',   label:'Email de contacto',    placeholder:'contacto@empresa.com'},
                      {key:'website', label:'Sitio web',            placeholder:'www.empresa.com'},
                    ].map(f=>(
                      <div key={f.key}>
                        <div style={{fontSize:12,fontWeight:500,color:T.text3,marginBottom:5}}>{f.label}</div>
                        <Input placeholder={f.placeholder} value={companyData[f.key]||''} onChange={e=>setCompanyData(d=>({...d,[f.key]:e.target.value}))}/>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:16}}>
                    <Btn onClick={showSaved}>Guardar cambios</Btn>
                  </div>
                </Card>

                <Card>
                  <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2,marginBottom:4}}>Logo de la empresa</div>
                  <div style={{fontSize:13,color:T.text3,marginBottom:14}}>Aparecera en facturas, reportes y documentos generados por Vela.</div>
                  <div style={{display:'flex',alignItems:'center',gap:16}}>
                    <div style={{width:64,height:64,borderRadius:14,background:T.sidebar,border:`.5px solid ${T.hairline}`,display:'grid',placeItems:'center'}}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T.text4} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </div>
                    <div>
                      <Btn style={{fontSize:12,padding:'6px 14px'}}>Subir logo</Btn>
                      <div style={{fontSize:11,color:T.text4,marginTop:6}}>PNG o SVG, max 2MB, fondo transparente recomendado</div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* SUSCRIPCION */}
            {tab==='subscription'&&(
              <div>
                {billingStatus&&billingStatus.status!=='none'&&(()=>{
                  const daysLeft=billingStatus.days_until_expiry||0
                  const totalDays=30
                  const daysUsed=totalDays-daysLeft
                  const progress=Math.min(100,Math.max(0,(daysUsed/totalDays)*100))
                  const renewDate=billingStatus.current_period_end?new Date(billingStatus.current_period_end).toLocaleDateString('es-ES',{day:'numeric',month:'short'}):null
                  return (
                  <Card style={{marginBottom:14,padding:0,overflow:'hidden'}}>
                    <div style={{padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <div style={{width:7,height:7,borderRadius:'50%',background:'#059669',boxShadow:'0 0 6px rgba(5,150,105,.4)'}}/>
                        <span style={{fontSize:14,fontWeight:600,color:T.text}}>Plan {billingStatus.plan_name||billingStatus.plan}</span>
                        <span style={{fontSize:12,color:T.text4}}>{billingStatus.fase==='beta'?'Beta gratuita':billingStatus.status==='active'?'Activo':billingStatus.status}</span>
                        {billingStatus.pending_downgrade_plan&&(
                          <span style={{fontSize:11,color:'#d97706',background:'#fffbeb',padding:'2px 8px',borderRadius:6,fontWeight:500}}>Cambia a {billingStatus.pending_downgrade_plan} el {renewDate}</span>
                        )}
                      </div>
                      <button onClick={handlePortal} disabled={portalLoading} style={{padding:'6px 14px',borderRadius:8,border:`.5px solid ${T.hairline}`,background:T.sidebar,color:T.text3,fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
                        {portalLoading?'...':'Gestionar facturacion'}
                      </button>
                    </div>
                    <div style={{padding:'0 18px 14px',display:'flex',alignItems:'center',gap:12}}>
                      <div style={{flex:1,height:4,borderRadius:2,background:T.sidebar,overflow:'hidden'}}>
                        <div style={{width:progress+'%',height:'100%',borderRadius:2,background:progress>85?'#d97706':T.cyan,transition:'width .5s ease'}}/>
                      </div>
                      <span style={{fontSize:11,color:T.text4,whiteSpace:'nowrap'}}>
                        {billingStatus.cancel_at_period_end?`Cancela el ${renewDate}`:`Renueva el ${renewDate} · ${daysLeft}d restantes`}
                      </span>
                    </div>
                  </Card>
                )})()}

                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))',gap:14,marginBottom:16}}>
                  {[
                    {id:'starter',name:'Starter',monthly:19,users:1,ai:'50/mes',docs:'25/mes',color:'#6b7280',modules:4,sub:'Contabilidad + Ventas + Finanzas',tag:null,popular:false,highlights:[]},
                    {id:'pro',name:'Pro',monthly:39,users:3,ai:'500/mes',docs:'100/mes',color:T.cyan,modules:9,sub:'Todo lo que necesita tu pyme',tag:'Mas popular',popular:true,highlights:['Vera IA con 500 consultas','3 usuarios incluidos','CRM + Proyectos completo']},
                    {id:'business',name:'Business',monthly:79,users:10,ai:'Sin limite',docs:'Sin limite',color:'#4F46E5',modules:10,sub:'Sin limites, escala sin preocuparte',tag:'Maximo valor',popular:false,highlights:['IA sin limite','Marketing IA completo','10 usuarios incluidos']},
                  ].map(plan=>{
                    const isCurrent=billingStatus?.plan===plan.id&&billingStatus?.status!=='none'
                    return (
                      <Card key={plan.id} style={{position:'relative',border:plan.popular?`2px solid ${T.cyan}`:isCurrent?`1.5px solid ${plan.color}`:`.5px solid ${T.hairline}`,background:T.card,transform:plan.popular?'scale(1.02)':'none',boxShadow:plan.popular?'0 8px 32px rgba(79,70,229,.1)':'none',display:'flex',flexDirection:'column'}}>
                        {plan.tag&&<div style={{position:'absolute',top:-11,left:'50%',transform:'translateX(-50%)',background:plan.popular?T.cyan:'#4F46E5',color:'#fff',fontSize:10,fontWeight:700,padding:'3px 12px',borderRadius:20,whiteSpace:'nowrap',boxShadow:`0 2px 8px ${plan.popular?'rgba(79,70,229,.3)':'rgba(79,70,229,.3)'}`}}>{plan.tag}</div>}
                        {isCurrent&&!plan.tag&&<div style={{position:'absolute',top:-11,left:'50%',transform:'translateX(-50%)',background:plan.color,color:'#fff',fontSize:10,fontWeight:600,padding:'2px 10px',borderRadius:999,whiteSpace:'nowrap'}}>Plan actual</div>}
                        <div style={{fontSize:12,fontWeight:600,color:plan.color,letterSpacing:'.03em',textTransform:'uppercase',marginBottom:10}}>{plan.name}</div>
                        <div style={{marginBottom:2}}>
                          <span style={{fontSize:32,fontWeight:800,color:T.text,letterSpacing:-1.5,lineHeight:1}}>€{plan.monthly}</span>
                          <span style={{fontSize:13,color:T.text4}}>/mes</span>
                        </div>
                        <div style={{fontSize:11,color:plan.popular?T.cyan:T.text4,fontWeight:500,marginBottom:16}}>{plan.sub}</div>
                        <div style={{flex:1,marginBottom:16}}>
                          {[
                            {label:`${plan.users} usuario${plan.users>1?'s':''} incluido${plan.users>1?'s':''}`,hl:plan.users>=3},
                            {label:`${plan.modules} modulos`,hl:plan.modules>=9},
                            {label:`IA: ${plan.ai}`,hl:plan.ai==='Sin limite'||plan.ai==='500/mes'},
                            {label:`Docs: ${plan.docs}`,hl:plan.docs==='Sin limite'},
                          ].map((f,i)=>(
                            <div key={i} style={{display:'flex',alignItems:'center',gap:7,padding:'4px 0'}}>
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="7" fill={f.hl?(plan.popular?T.cyan:plan.color):'#e5e9f0'} opacity={f.hl?.15:1}/><path d="M4 7L6 9L10 5" stroke={f.hl?(plan.popular?T.cyan:plan.color):'#9ca3af'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              <span style={{fontSize:12.5,color:f.hl?T.text:T.text3,fontWeight:f.hl?600:400}}>{f.label}</span>
                            </div>
                          ))}
                          {plan.highlights.length>0&&(
                            <div style={{marginTop:10,paddingTop:10,borderTop:`.5px solid ${T.hairline}`}}>
                              {plan.highlights.map((h,i)=>(
                                <div key={i} style={{fontSize:11.5,color:plan.color,fontWeight:500,padding:'2px 0',display:'flex',alignItems:'center',gap:5}}>
                                  <span style={{fontSize:9}}>★</span>{h}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <button onClick={()=>!isCurrent&&handleUpgrade(plan.id)} disabled={isCurrent||upgradeLoading===plan.id}
                          style={{width:'100%',padding:'11px',borderRadius:10,fontSize:13.5,fontWeight:600,cursor:isCurrent?'default':'pointer',fontFamily:'inherit',border:'none',transition:'all .2s',
                            background:isCurrent?T.sidebar:plan.popular?T.cyan:plan.id==='business'?T.text:'transparent',
                            color:isCurrent?T.text4:plan.popular||plan.id==='business'?'#fff':T.text,
                            ...(plan.id==='starter'&&!isCurrent?{border:`.5px solid ${T.hairline}`}:{}),
                            boxShadow:plan.popular&&!isCurrent?'0 4px 14px rgba(79,70,229,.3)':'none'}}>
                          {upgradeLoading===plan.id?'Redirigiendo a pago...':isCurrent?'Plan actual':billingStatus?.status!=='none'&&billingStatus?.plan?`Cambiar a ${plan.name}`:`Empezar con ${plan.name}`}
                        </button>
                        <div style={{textAlign:'center',fontSize:11,color:T.text4,marginTop:8}}>+€8/usuario adicional/mes</div>
                      </Card>
                    )
                  })}
                </div>

                <Card style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:600,color:T.text,marginBottom:2}}>Enterprise</div>
                    <div style={{fontSize:12,color:T.text3}}>Usuarios ilimitados · Instancia dedicada · SLA · Onboarding personalizado</div>
                  </div>
                  <BtnSec onClick={()=>window.open('mailto:hola@vela.com?subject=Vela Enterprise','_blank')}>Contactar</BtnSec>
                </Card>

                <div style={{display:'flex',justifyContent:'center',gap:28,padding:'14px 0',fontSize:12,color:T.text4}}>
                  <span>Pago seguro con Stripe</span>
                  <span>Cancela cuando quieras</span>
                  <span>Soporte incluido</span>
                </div>

                {/* UPGRADE MODAL */}
                {showUpgradeModal&&(
                  <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,backdropFilter:'blur(4px)'}} onClick={()=>setShowUpgradeModal(null)}>
                    <div style={{background:T.card,borderRadius:20,padding:32,maxWidth:420,width:'90%',boxShadow:'0 20px 60px rgba(0,0,0,.15)'}} onClick={e=>e.stopPropagation()}>
                      <div style={{textAlign:'center',marginBottom:24}}>
                        <div style={{width:52,height:52,borderRadius:14,margin:'0 auto 14px',background:`${showUpgradeModal.plan.color}15`,display:'grid',placeItems:'center'}}><svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke={showUpgradeModal.plan.color} strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'><path d='M13 2L3 14h9l-1 8 10-12h-9l1-8z'/></svg></div>
                        <div style={{fontSize:19,fontWeight:700,color:T.text,marginBottom:6}}>Activar plan {showUpgradeModal.plan.name}</div>
                        <div style={{fontSize:13,color:T.text3}}>{showUpgradeModal.isNew?'Empieza hoy, cancela cuando quieras.':'Tu plan se actualiza inmediatamente.'}</div>
                      </div>
                      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:14,marginBottom:16}}>
                        <div style={{fontSize:11,fontWeight:700,color:'#166534',marginBottom:8,textTransform:'uppercase',letterSpacing:'.04em'}}>Lo que desbloqueas</div>
                        <div style={{fontSize:13,color:'#047857'}}>
                          {showUpgradeModal.plan.moduleCount} modulos · {showUpgradeModal.plan.users} usuario{showUpgradeModal.plan.users>1?'s':''} · {showUpgradeModal.plan.ai===-1?'IA sin limite':showUpgradeModal.plan.ai+' consultas IA/mes'}
                        </div>
                      </div>
                      <div style={{background:T.sidebar,borderRadius:12,padding:14,marginBottom:20}}>
                        {showUpgradeModal.isNew?(
                          <>
                            <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:T.text2,marginBottom:4}}>
                              <span>Plan {showUpgradeModal.plan.name}</span>
                              <span style={{fontWeight:600}}>€{showUpgradeModal.plan.monthly}/mes</span>
                            </div>
                            <div style={{fontSize:11,color:T.text4,marginTop:6}}>Primer cobro hoy. Renovacion automatica cada 30 dias.</div>
                          </>
                        ):(
                          <>
                            <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:T.text2,marginBottom:4}}>
                              <span>Nuevo plan</span>
                              <span style={{fontWeight:600}}>€{showUpgradeModal.plan.monthly}/mes</span>
                            </div>
                            {showUpgradeModal.prorationCredit>0&&(
                              <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#059669',marginBottom:4}}>
                                <span>Credito del plan actual</span>
                                <span style={{fontWeight:600}}>-€{showUpgradeModal.prorationCredit.toFixed(2)}</span>
                              </div>
                            )}
                            <div style={{borderTop:'.5px solid '+T.hairline,marginTop:8,paddingTop:8,display:'flex',justifyContent:'space-between',fontSize:14,color:T.text,fontWeight:700}}>
                              <span>Hoy pagas aprox.</span>
                              <span>€{Math.max(0,showUpgradeModal.plan.monthly-showUpgradeModal.prorationCredit).toFixed(2)}</span>
                            </div>
                            <div style={{fontSize:11,color:T.text4,marginTop:6}}>Stripe calcula el prorrateo exacto. Despues €{showUpgradeModal.plan.monthly}/mes.</div>
                          </>
                        )}
                      </div>
                      <div style={{display:'flex',gap:10}}>
                        <button onClick={()=>setShowUpgradeModal(null)} style={{flex:1,padding:11,borderRadius:10,fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit',background:T.sidebar,color:T.text3,border:'.5px solid '+T.hairline}}>Cancelar</button>
                        <button onClick={()=>confirmUpgrade(showUpgradeModal.plan.id)} disabled={upgradeLoading} style={{flex:2,padding:11,borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',background:showUpgradeModal.plan.color,color:'#fff',border:'none',boxShadow:'0 4px 14px '+showUpgradeModal.plan.color+'40',opacity:upgradeLoading?.7:1}}>
                          {upgradeLoading?'Procesando...':'Activar '+showUpgradeModal.plan.name}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* DOWNGRADE MODAL — LOSS AVERSION */}
                {showDowngradeModal&&(
                  <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,backdropFilter:'blur(4px)'}} onClick={()=>setShowDowngradeModal(null)}>
                    <div style={{background:T.card,borderRadius:20,padding:32,maxWidth:440,width:'90%',boxShadow:'0 20px 60px rgba(0,0,0,.15)'}} onClick={e=>e.stopPropagation()}>
                      <div style={{textAlign:'center',marginBottom:24}}>
                        <div style={{width:52,height:52,borderRadius:14,margin:'0 auto 14px',background:'#fef2f2',display:'grid',placeItems:'center',fontSize:22}}>⚠️</div>
                        <div style={{fontSize:19,fontWeight:700,color:T.text,marginBottom:6}}>¿Seguro que quieres cambiar?</div>
                        <div style={{fontSize:13,color:T.text3}}>De {showDowngradeModal.from.name} a {showDowngradeModal.to.name}</div>
                      </div>
                      <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:12,padding:14,marginBottom:14}}>
                        <div style={{fontSize:11,fontWeight:700,color:'#991b1b',marginBottom:8,textTransform:'uppercase',letterSpacing:'.04em'}}>Perderas acceso a</div>
                        {showDowngradeModal.lostModules.map((m,i)=>(
                          <div key={i} style={{fontSize:13,color:'#dc2626',padding:'2px 0',display:'flex',alignItems:'center',gap:6}}>
                            <span style={{fontWeight:700}}>−</span>{m}
                          </div>
                        ))}
                        {showDowngradeModal.lostAI&&(
                          <div style={{fontSize:13,color:'#dc2626',padding:'2px 0',display:'flex',alignItems:'center',gap:6}}>
                            <span style={{fontWeight:700}}>−</span>{showDowngradeModal.lostAI}
                          </div>
                        )}
                        {showDowngradeModal.lostUsers>0&&(
                          <div style={{fontSize:13,color:'#dc2626',padding:'2px 0',display:'flex',alignItems:'center',gap:6}}>
                            <span style={{fontWeight:700}}>−</span>{showDowngradeModal.lostUsers} puesto{showDowngradeModal.lostUsers>1?'s':''} de usuario
                          </div>
                        )}
                      </div>
                      {showDowngradeModal.periodEnd&&(
                        <div style={{background:T.sidebar,borderRadius:12,padding:14,marginBottom:14}}>
                          <div style={{fontSize:12,fontWeight:600,color:T.text,marginBottom:6}}>Calendario del cambio</div>
                          <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
                            <span style={{color:T.text3}}>Plan actual ({showDowngradeModal.from.name})</span>
                            <span style={{color:'#059669',fontWeight:600}}>Activo hasta {new Date(showDowngradeModal.periodEnd).toLocaleDateString('es-ES')}</span>
                          </div>
                          <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                            <span style={{color:T.text3}}>Plan nuevo ({showDowngradeModal.to.name})</span>
                            <span style={{color:T.text4}}>Desde {new Date(showDowngradeModal.periodEnd).toLocaleDateString('es-ES')}</span>
                          </div>
                          <div style={{fontSize:11,color:T.text4,marginTop:8}}>Tienes {showDowngradeModal.daysLeft} dias restantes de {showDowngradeModal.from.name}. No se cobra nada hoy.</div>
                        </div>
                      )}
                      <div style={{display:'flex',gap:10,marginTop:16}}>
                        <button onClick={()=>confirmUpgrade(showDowngradeModal.to.id)} disabled={upgradeLoading} style={{flex:1,padding:11,borderRadius:10,fontSize:12.5,fontWeight:500,cursor:'pointer',fontFamily:'inherit',background:T.sidebar,color:T.text3,border:'.5px solid '+T.hairline}}>
                          {upgradeLoading?'...':'Cambiar a '+showDowngradeModal.to.name}
                        </button>
                        <button onClick={()=>setShowDowngradeModal(null)} style={{flex:2,padding:11,borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',background:T.cyan,color:'#fff',border:'none',boxShadow:'0 4px 14px rgba(79,70,229,.3)'}}>
                          Mantener {showDowngradeModal.from.name}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* EQUIPO */}
            {tab==='team'&&(
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <Card>
                  <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2,marginBottom:4}}>Invitar miembro</div>
                  <div style={{fontSize:13,color:T.text3,marginBottom:14}}>
                    {billingStatus?`${team.length+1} de ${billingStatus.max_users} usuarios · +€8/mes por usuario adicional`:'Cargando...'}
                  </div>
                  <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                    <Input placeholder="correo@empresa.com" type="email" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleInvite()} style={{flex:1,minWidth:200}}/>
                    <Sel value={inviteRole} onChange={e=>setInviteRole(e.target.value)} style={{width:140}}>
                      {['member','admin','viewer'].map(r=><option key={r} value={r}>{r==='member'?'Miembro':r==='admin'?'Admin':'Solo lectura'}</option>)}
                    </Sel>
                    <Btn onClick={handleInvite} disabled={inviting}>{inviting?'...':'Enviar invitacion'}</Btn>
                  </div>
                </Card>

                <Card style={{padding:0,overflow:'hidden'}}>
                  <div style={{background:T.sidebar,padding:'10px 16px',display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:16,alignItems:'center',borderBottom:`.5px solid ${T.hairline}`}}>
                    {['Miembro','Rol','Estado',''].map(h=><div key={h} style={{fontSize:11,fontWeight:600,color:T.text3,textTransform:'uppercase',letterSpacing:0.5}}>{h}</div>)}
                  </div>
                  <div style={{padding:'12px 16px',borderBottom:`.5px solid ${T.soft}`,display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:16,alignItems:'center'}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:32,height:32,borderRadius:999,background:'linear-gradient(135deg,#4F46E5,#A5B1FF)',color:'#fff',display:'grid',placeItems:'center',fontSize:11,fontWeight:600,flexShrink:0}}>{initials}</div>
                      <div><div style={{fontSize:13,fontWeight:500,color:T.text}}>{user?.name||'Tu'}</div><div style={{fontSize:11,color:T.text4}}>{user?.email}</div></div>
                    </div>
                    <span style={{fontSize:11,fontWeight:500,color:T.text,background:T.sidebar,padding:'2px 10px',borderRadius:999}}>Propietario</span>
                    <span style={{fontSize:11,fontWeight:500,color:T.green,background:T.greenSoft,padding:'2px 10px',borderRadius:999}}>Activo</span>
                    <div/>
                  </div>
                  {team.map((m,i)=>(
                    <div key={m.id} style={{padding:'12px 16px',borderBottom:i<team.length-1?`.5px solid ${T.soft}`:'none',display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:16,alignItems:'center'}}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <div style={{width:32,height:32,borderRadius:999,background:T.sidebar,color:T.text,display:'grid',placeItems:'center',fontSize:11,fontWeight:600,flexShrink:0}}>{m.email.substring(0,2).toUpperCase()}</div>
                        <div><div style={{fontSize:13,fontWeight:500,color:T.text}}>{m.email}</div><div style={{fontSize:11,color:T.text4}}>{m.joined_at?new Date(m.joined_at).toLocaleDateString('es-ES'):'Pendiente'}</div></div>
                      </div>
                      <span style={{fontSize:11,fontWeight:500,color:T.blue,background:'rgba(79,70,229,.08)',padding:'2px 10px',borderRadius:999}}>{m.role==='member'?'Miembro':m.role==='admin'?'Admin':'Solo lectura'}</span>
                      <span style={{fontSize:11,fontWeight:500,color:m.status==='active'?T.green:T.amber,background:m.status==='active'?T.greenSoft:T.amberSoft,padding:'2px 10px',borderRadius:999}}>
                        {m.status==='active'?'Activo':'Pendiente'}
                      </span>
                      <button style={{padding:'4px 10px',borderRadius:999,border:`.5px solid ${T.hairline}`,background:T.redSoft,color:T.red,fontSize:11,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>Eliminar</button>
                    </div>
                  ))}
                  {team.length===0&&<div style={{padding:'32px',textAlign:'center',color:T.text4,fontSize:13}}>No has invitado a nadie aun.</div>}
                </Card>
              </div>
            )}

            {/* NOTIFICACIONES */}
            {tab==='notifications'&&(
              <div className="set-row" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <Card>
                  <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2,marginBottom:4}}>Alertas de modulos</div>
                  <div style={{fontSize:13,color:T.text3,marginBottom:16}}>Elige que alertas quieres recibir</div>
                  {[
                    {key:'stock_bajo',          label:'Stock bajo',          desc:'Cuando un producto baja del umbral'},
                    {key:'clientes_riesgo',      label:'Clientes en riesgo',  desc:'Sentimiento deteriorandose'},
                    {key:'proyectos_urgentes',   label:'Proyectos urgentes',  desc:'Health score critico o vencidos'},
                    {key:'mensajes_pendientes',  label:'Mensajes pendientes', desc:'Bandeja sin responder'},
                    {key:'alertas_contabilidad', label:'Alertas contabilidad',desc:'Anomalias en ingresos o gastos'},
                    {key:'informe_semanal',      label:'Informe semanal IA',  desc:'Resumen ejecutivo los lunes'},
                  ].map(n=>(
                    <div key={n.key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'11px 0',borderBottom:`.5px solid ${T.soft}`}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:500,color:T.text}}>{n.label}</div>
                        <div style={{fontSize:11,color:T.text4}}>{n.desc}</div>
                      </div>
                      <Toggle value={notifPrefs[n.key]} onChange={v=>setNotifPrefs(p=>({...p,[n.key]:v}))}/>
                    </div>
                  ))}
                  <div style={{marginTop:14}}><Btn onClick={showSaved}>Guardar preferencias</Btn></div>
                </Card>
                <Card>
                  <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2,marginBottom:4}}>Canal de notificaciones</div>
                  <div style={{fontSize:13,color:T.text3,marginBottom:16}}>Como quieres recibirlas</div>
                  {[
                    {key:'push',        label:'Notificaciones en app', desc:'Centro de notificaciones de Vela'},
                    {key:'email_digest',label:'Resumen por email',     desc:'Un email diario con el resumen'},
                  ].map(c=>(
                    <div key={c.key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px',borderRadius:12,border:`.5px solid ${notifPrefs[c.key]?T.blue:T.hairline}`,background:notifPrefs[c.key]?'rgba(79,70,229,.04)':T.card,marginBottom:10,cursor:'pointer'}}
                      onClick={()=>setNotifPrefs(p=>({...p,[c.key]:!p[c.key]}))}>
                      <div>
                        <div style={{fontSize:13,fontWeight:500,color:T.text}}>{c.label}</div>
                        <div style={{fontSize:11,color:T.text4}}>{c.desc}</div>
                      </div>
                      <Toggle value={notifPrefs[c.key]} onChange={v=>setNotifPrefs(p=>({...p,[c.key]:v}))}/>
                    </div>
                  ))}
                </Card>
              </div>
            )}

            {/* SEGURIDAD */}
            {tab==='security'&&(
              <SecurityTab token={token} T={T} showSaved={showSaved}/>
            )}

            {/* FISCAL */}
            {tab==='fiscal'&&(
              <FiscalWizard token={token}/>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}


function SecurityTab({token,T,showSaved}){
  const API=API_BASE
  const [tfa,setTfa]=useState({enabled:false,loading:true,qr:null,secret:null,code:'',verifying:false,error:null,step:null})
  const [passwords,setPasswords]=useState({current:'',new1:'',new2:''})
  const h=()=>({Authorization:`Bearer ${token}`,'Content-Type':'application/json'})

  useEffect(()=>{
    fetch(`${API}/api/auth/2fa/status`,{headers:h()})
      .then(r=>r.json())
      .then(d=>setTfa(p=>({...p,enabled:d.enabled,loading:false})))
      .catch(()=>setTfa(p=>({...p,loading:false})))
  },[])

  async function startSetup(){
    setTfa(p=>({...p,loading:true,error:null}))
    try{
      const r=await fetch(`${API}/api/auth/2fa/setup`,{method:'POST',headers:h()})
      const d=await r.json()
      setTfa(p=>({...p,qr:d.qr_code,secret:d.secret,step:'scan',loading:false}))
    }catch{setTfa(p=>({...p,error:'Error de conexion',loading:false}))}
  }

  async function verifyCode(){
    if(tfa.code.length!==6)return
    setTfa(p=>({...p,verifying:true,error:null}))
    try{
      const r=await fetch(`${API}/api/auth/2fa/verify`,{method:'POST',headers:h(),body:JSON.stringify({code:tfa.code})})
      if(r.ok){setTfa(p=>({...p,enabled:true,step:null,verifying:false,qr:null,secret:null,code:''}))}
      else{const d=await r.json();setTfa(p=>({...p,error:d.detail||'Codigo incorrecto',verifying:false}))}
    }catch{setTfa(p=>({...p,error:'Error de conexion',verifying:false}))}
  }

  async function disable2FA(){
    if(tfa.code.length!==6)return
    setTfa(p=>({...p,verifying:true,error:null}))
    try{
      const r=await fetch(`${API}/api/auth/2fa/disable`,{method:'POST',headers:h(),body:JSON.stringify({code:tfa.code})})
      if(r.ok){setTfa(p=>({...p,enabled:false,step:null,verifying:false,code:''}))}
      else{const d=await r.json();setTfa(p=>({...p,error:d.detail||'Codigo incorrecto',verifying:false}))}
    }catch{setTfa(p=>({...p,error:'Error de conexion',verifying:false}))}
  }

  const Card=({children,style:s})=><div style={{background:T.card,borderRadius:16,border:`.5px solid ${T.hairline}`,padding:20,...s}}>{children}</div>
  const Btn=({children,onClick,disabled,style:s})=><button onClick={onClick} disabled={disabled} style={{padding:'9px 18px',borderRadius:10,border:'none',background:T.blue,color:'#fff',fontSize:13,fontWeight:600,cursor:disabled?'default':'pointer',fontFamily:'inherit',opacity:disabled?.6:1,...s}}>{children}</button>

  return (
    <div className="set-row" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
      <Card>
        <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2,marginBottom:4}}>Cambiar contrasena</div>
        <div style={{fontSize:13,color:T.text3,marginBottom:16}}>Minimo 12 caracteres</div>
        {[{k:'current',l:'Contrasena actual'},{k:'new1',l:'Nueva contrasena'},{k:'new2',l:'Confirmar contrasena'}].map(f=>(
          <div key={f.k} style={{marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:500,color:T.text3,marginBottom:5}}>{f.l}</div>
            <input type="password" value={passwords[f.k]} onChange={e=>setPasswords(p=>({...p,[f.k]:e.target.value}))} placeholder="••••••••••••" style={{width:'100%',padding:'10px 14px',borderRadius:10,border:`.5px solid ${T.hairline}`,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
          </div>
        ))}
        <Btn onClick={showSaved} style={{marginTop:8}}>Actualizar contrasena</Btn>
      </Card>

      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <Card>
          <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2,marginBottom:4}}>Autenticacion en dos pasos</div>
          <div style={{fontSize:13,color:T.text3,marginBottom:14}}>Protege tu cuenta con un codigo temporal</div>

          {tfa.loading?(
            <div style={{padding:20,textAlign:'center',color:T.text4,fontSize:13}}>Cargando...</div>
          ):tfa.enabled&&!tfa.step?(
            <div>
              <div style={{padding:'14px 16px',background:'#f0fdf4',borderRadius:12,border:'1px solid #bbf7d0',display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
                <div style={{width:36,height:36,borderRadius:10,background:'#059669',display:'grid',placeItems:'center'}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:'#166534'}}>2FA activo</div>
                  <div style={{fontSize:11,color:'#059669'}}>Tu cuenta esta protegida</div>
                </div>
              </div>
              <div style={{fontSize:12,color:T.text3,marginBottom:10}}>Para desactivar, introduce tu codigo actual:</div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input value={tfa.code} onChange={e=>setTfa(p=>({...p,code:e.target.value.replace(/\D/g,'').slice(0,6)}))} placeholder="000000" maxLength={6} style={{width:120,padding:'10px 14px',borderRadius:10,border:`.5px solid ${T.hairline}`,fontSize:16,fontFamily:'monospace',textAlign:'center',letterSpacing:4,outline:'none'}}/>
                <button onClick={disable2FA} disabled={tfa.code.length!==6||tfa.verifying} style={{padding:'9px 16px',borderRadius:10,border:`.5px solid ${T.red}`,background:T.redSoft,color:T.red,fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit',opacity:tfa.code.length!==6?.5:1}}>
                  {tfa.verifying?'...':'Desactivar 2FA'}
                </button>
              </div>
              {tfa.error&&<div style={{fontSize:12,color:T.red,marginTop:8}}>{tfa.error}</div>}
            </div>
          ):tfa.step==='scan'?(
            <div>
              <div style={{fontSize:13,fontWeight:500,color:T.text,marginBottom:12}}>1. Escanea este QR con tu app de autenticacion</div>
              <div style={{display:'flex',justifyContent:'center',marginBottom:14}}>
                {tfa.qr&&<img src={tfa.qr} alt="QR 2FA" style={{width:180,height:180,borderRadius:12,border:`.5px solid ${T.hairline}`}}/>}
              </div>
              <div style={{fontSize:11,color:T.text4,marginBottom:4}}>O introduce este codigo manualmente:</div>
              <div style={{padding:'8px 12px',background:T.sidebar,borderRadius:8,fontFamily:'monospace',fontSize:12,color:T.text,letterSpacing:1,marginBottom:16,wordBreak:'break-all',userSelect:'all'}}>{tfa.secret}</div>
              <div style={{fontSize:13,fontWeight:500,color:T.text,marginBottom:8}}>2. Introduce el codigo de 6 digitos</div>
              <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
                <input value={tfa.code} onChange={e=>setTfa(p=>({...p,code:e.target.value.replace(/\D/g,'').slice(0,6),error:null}))} placeholder="000000" maxLength={6} autoFocus style={{width:140,padding:'12px 16px',borderRadius:12,border:`.5px solid ${T.blue}`,fontSize:20,fontFamily:'monospace',textAlign:'center',letterSpacing:6,outline:'none'}}/>
                <Btn onClick={verifyCode} disabled={tfa.code.length!==6||tfa.verifying}>
                  {tfa.verifying?'Verificando...':'Verificar y activar'}
                </Btn>
              </div>
              {tfa.error&&<div style={{fontSize:12,color:T.red,marginTop:4}}>{tfa.error}</div>}
              <button onClick={()=>setTfa(p=>({...p,step:null,qr:null,secret:null,code:'',error:null}))} style={{fontSize:12,color:T.text4,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',marginTop:8}}>Cancelar</button>
            </div>
          ):(
            <div>
              <div style={{padding:'14px 16px',background:T.sidebar,borderRadius:12,border:`.5px solid ${T.hairline}`,display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                <div>
                  <div style={{fontSize:13,fontWeight:500,color:T.text}}>App de autenticacion</div>
                  <div style={{fontSize:11,color:T.text4}}>Google Authenticator, Authy...</div>
                </div>
                <span style={{fontSize:11,fontWeight:500,color:T.text4,background:T.sidebar,padding:'2px 10px',borderRadius:999,border:`.5px solid ${T.hairline}`}}>No activo</span>
              </div>
              <Btn onClick={startSetup}>Configurar 2FA</Btn>
            </div>
          )}
        </Card>

        <Card style={{borderColor:T.redSoft}}>
          <div style={{fontSize:14,fontWeight:500,color:T.red,marginBottom:4}}>Zona de peligro</div>
          <div style={{fontSize:12,color:T.text3,marginBottom:14}}>Estas acciones son irreversibles</div>
          <button style={{padding:'8px 18px',borderRadius:999,border:`.5px solid ${T.red}`,background:T.redSoft,color:T.red,fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>Eliminar mi cuenta</button>
        </Card>
      </div>
    </div>
  )
}

export default function SettingsPage(){
  return (
    <Suspense fallback={<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif',color:'#6b7280'}}>Cargando...</div>}>
      <SettingsInner/>
    </Suspense>
  )
}
