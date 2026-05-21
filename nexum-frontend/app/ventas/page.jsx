'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
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

const METODOS_PAGO = [
  {key:'efectivo',label:'Efectivo',icon:'💵'},
  {key:'tarjeta', label:'Tarjeta', icon:'💳'},
  {key:'transferencia',label:'Transferencia',icon:'📱'},
  {key:'otro',    label:'Otro',    icon:'🔄'},
]

const Icon = ({d,size=16,sw=1.5})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>{d}</svg>
)
const I = {
  gear:    <Icon d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 14.5a1.5 1.5 0 0 0 .3 1.7l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.5 1.5 0 0 0-1.7-.3 1.5 1.5 0 0 0-.9 1.4v.4a2 2 0 1 1-4 0v-.2a1.5 1.5 0 0 0-1-1.4 1.5 1.5 0 0 0-1.7.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.5 1.5 0 0 0 .3-1.7 1.5 1.5 0 0 0-1.4-.9H3a2 2 0 1 1 0-4h.1a1.5 1.5 0 0 0 1.4-1 1.5 1.5 0 0 0-.3-1.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.5 1.5 0 0 0 1.7.3h.1a1.5 1.5 0 0 0 .9-1.4V3a2 2 0 1 1 4 0v.1a1.5 1.5 0 0 0 .9 1.4 1.5 1.5 0 0 0 1.7-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.5 1.5 0 0 0-.3 1.7v.1a1.5 1.5 0 0 0 1.4.9H21a2 2 0 1 1 0 4h-.2a1.5 1.5 0 0 0-1.4.9z"/></>} />,
  chevron: <Icon d={<path d="M6 9.5l6 5 6-5"/>} />,
  plus:    <Icon d={<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>} />,
  search:  <Icon d={<><circle cx="11" cy="11" r="6.5"/><path d="M19.5 19.5l-3.5-3.5"/></>} sw={1.6}/>,
  trash:   <Icon d={<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>} />,
  scan:    <Icon d={<><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="3" y1="12" x2="21" y2="12"/></>} />,
  receipt: <Icon d={<><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/></>} />,
  pkg:     <Icon d={<><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></>} />,
  chart:   <Icon d={<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>} />,
}

function Card({children,style={}}){ return <div style={{background:T.card,borderRadius:16,border:`.5px solid ${T.hairline}`,boxShadow:'0 1px 2px rgba(0,0,0,.03)',padding:20,...style}}>{children}</div> }
function Btn({children,onClick,disabled,color=T.blue,style={}}){ return <button onClick={onClick} disabled={disabled} style={{padding:'8px 18px',borderRadius:999,border:'none',fontSize:13,fontWeight:500,cursor:disabled?'not-allowed':'pointer',fontFamily:'inherit',background:disabled?T.sidebar:color,color:disabled?T.text4:'#fff',opacity:disabled?.6:1,display:'inline-flex',alignItems:'center',gap:6,transition:'all .15s',...style}}>{children}</button> }
function BtnSec({children,onClick,style={}}){ return <button onClick={onClick} style={{padding:'8px 18px',borderRadius:999,border:`.5px solid ${T.hairline}`,background:T.card,fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit',color:T.text,display:'inline-flex',alignItems:'center',gap:6,...style}}>{children}</button> }

const inp = {width:'100%',padding:'8px 11px',borderRadius:8,border:`.5px solid ${T.hairline}`,background:T.sidebar,fontSize:13,color:T.text,fontFamily:'inherit',outline:'none'}

function ProfileBtn({user,router}){
  const [open,setOpen]=useState(false)
  const ref=useRef()
  useEffect(()=>{ function h(e){if(ref.current&&!ref.current.contains(e.target))setOpen(false)}; document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h) },[])
  const initials=user?.name?user.name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase():'US'
  return (
    <div ref={ref} style={{position:'relative'}}>
      <div onClick={()=>setOpen(o=>!o)} style={{display:'flex',alignItems:'center',gap:8,padding:'3px 4px 3px 3px',borderRadius:999,cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,.04)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
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

// ── Modal DTE ──────────────────────────────────────────────────────────────────
function DTEModal({sale, fiscalConfig, token, onClose, onSuccess}) {
  const [tipoDTE, setTipoDTE] = useState('01')
  const [receptor, setReceptor] = useState({nombre:'',nit:'',nrc:'',email:'',direccion:''})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  async function emitirDTE() {
    setLoading(true)
    try {
      const items = sale.items?.map(i=>({
        descripcion: i.product_name||i.nombre||'Producto',
        cantidad: i.quantity||1,
        precio_unitario: i.unit_price||i.precio||0,
        descuento: 0,
      })) || [{descripcion:'Venta',cantidad:1,precio_unitario:sale.total||0,descuento:0}]

      const res = await fetch(`${API}/api/fiscal/dte/emitir`,{
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body: JSON.stringify({
          tipo_dte: tipoDTE,
          receptor_tipo: tipoDTE==='03'?'contribuyente':'consumidor_final',
          receptor_nombre: receptor.nombre||'Consumidor Final',
          receptor_nit: receptor.nit||null,
          receptor_nrc: receptor.nrc||null,
          receptor_email: receptor.email||null,
          items,
          sale_id: sale.id,
        })
      })
      const d = await res.json()
      setResult(d)
      if(d.ok) onSuccess&&onSuccess(d)
    } catch(e) {
      setResult({ok:false,error:'Error al emitir DTE'})
    }
    setLoading(false)
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:24}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{background:T.card,borderRadius:20,padding:28,width:'100%',maxWidth:520,boxShadow:'0 24px 64px rgba(0,0,0,.15)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <div>
            <div style={{fontSize:17,fontWeight:600,color:T.text,letterSpacing:-0.3}}>Emitir DTE</div>
            <div style={{fontSize:12,color:T.text4}}>Documento Tributario Electronico — El Salvador</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:T.text4}}>×</button>
        </div>

        {!result ? (
          <>
            {/* Tipo DTE */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:500,color:T.text3,marginBottom:8}}>Tipo de documento</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {[
                  {code:'01',name:'Factura',desc:'Consumidor final'},
                  {code:'03',name:'Credito Fiscal',desc:'Contribuyente IVA'},
                ].map(t=>(
                  <div key={t.code} onClick={()=>setTipoDTE(t.code)} style={{padding:'12px 14px',borderRadius:10,border:`.5px solid ${tipoDTE===t.code?T.blue:T.hairline}`,background:tipoDTE===t.code?'rgba(0,113,227,.06)':T.sidebar,cursor:'pointer',boxShadow:tipoDTE===t.code?`0 0 0 1px ${T.blue}`:'none'}}>
                    <div style={{fontSize:11,fontWeight:600,color:T.blue,marginBottom:2}}>{t.code}</div>
                    <div style={{fontSize:13,fontWeight:500,color:T.text}}>{t.name}</div>
                    <div style={{fontSize:11,color:T.text4}}>{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Datos receptor */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:500,color:T.text3,marginBottom:8}}>Datos del receptor</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <input style={inp} placeholder="Nombre del cliente" value={receptor.nombre} onChange={e=>setReceptor(r=>({...r,nombre:e.target.value}))}
                  onFocus={e=>e.target.style.borderColor=T.blue} onBlur={e=>e.target.style.borderColor='rgba(0,0,0,0.08)'}/>
                {tipoDTE==='03'&&(
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    <input style={inp} placeholder="NIT (0000-000000-000-0)" value={receptor.nit} onChange={e=>setReceptor(r=>({...r,nit:e.target.value}))}
                      onFocus={e=>e.target.style.borderColor=T.blue} onBlur={e=>e.target.style.borderColor='rgba(0,0,0,0.08)'}/>
                    <input style={inp} placeholder="NRC" value={receptor.nrc} onChange={e=>setReceptor(r=>({...r,nrc:e.target.value}))}
                      onFocus={e=>e.target.style.borderColor=T.blue} onBlur={e=>e.target.style.borderColor='rgba(0,0,0,0.08)'}/>
                  </div>
                )}
                <input style={inp} placeholder="Email (para enviar el DTE)" value={receptor.email} onChange={e=>setReceptor(r=>({...r,email:e.target.value}))}
                  onFocus={e=>e.target.style.borderColor=T.blue} onBlur={e=>e.target.style.borderColor='rgba(0,0,0,0.08)'}/>
              </div>
            </div>

            {/* Resumen venta */}
            <div style={{padding:'12px 14px',background:T.sidebar,borderRadius:10,border:`.5px solid ${T.hairline}`,marginBottom:20}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                <span style={{fontSize:12,color:T.text3}}>Subtotal</span>
                <span style={{fontSize:12,fontWeight:500,color:T.text,fontVariantNumeric:'tabular-nums'}}>${(sale.total/1.13).toFixed(2)}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                <span style={{fontSize:12,color:T.text3}}>IVA 13%</span>
                <span style={{fontSize:12,fontWeight:500,color:T.text,fontVariantNumeric:'tabular-nums'}}>${(sale.total-sale.total/1.13).toFixed(2)}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',paddingTop:6,borderTop:`.5px solid ${T.hairline}`}}>
                <span style={{fontSize:13,fontWeight:600,color:T.text}}>Total</span>
                <span style={{fontSize:15,fontWeight:600,color:T.green,fontVariantNumeric:'tabular-nums'}}>${sale.total?.toFixed(2)}</span>
              </div>
            </div>

            <div style={{display:'flex',gap:10}}>
              <BtnSec onClick={onClose} style={{flex:1,justifyContent:'center'}}>Cancelar</BtnSec>
              <Btn onClick={emitirDTE} disabled={loading} color={T.green} style={{flex:2,justifyContent:'center'}}>
                {loading?'Emitiendo DTE...':'Emitir DTE'}
              </Btn>
            </div>
          </>
        ):(
          <div style={{textAlign:'center',padding:'20px 0'}}>
            {result.ok ? (
              <>
                <div style={{fontSize:40,marginBottom:12}}>✅</div>
                <div style={{fontSize:16,fontWeight:600,color:T.text,marginBottom:6}}>DTE Emitido</div>
                <div style={{fontSize:13,color:T.text3,marginBottom:4}}>Numero de control: <strong>{result.numero_control}</strong></div>
                <div style={{fontSize:12,color:T.text4,marginBottom:20}}>Sello: {result.sello||'Pendiente de Hacienda'}</div>
                <div style={{padding:'10px 14px',background:T.greenSoft,borderRadius:10,fontSize:12,color:T.green,marginBottom:16}}>
                  {result.ambiente==='pruebas'?'⚠️ DTE en ambiente de pruebas — sin validez fiscal':'✓ DTE enviado al Ministerio de Hacienda'}
                </div>
                <div style={{display:'flex',gap:10,justifyContent:'center'}}>
                  {result.pdf_url&&<Btn onClick={()=>window.open(result.pdf_url)} color={T.blue}>Descargar PDF</Btn>}
                  <BtnSec onClick={onClose}>Cerrar</BtnSec>
                </div>
              </>
            ):(
              <>
                <div style={{fontSize:40,marginBottom:12}}>❌</div>
                <div style={{fontSize:15,fontWeight:600,color:T.red,marginBottom:8}}>Error al emitir DTE</div>
                <div style={{fontSize:13,color:T.text3,marginBottom:16}}>{result.error||'Error desconocido'}</div>
                <BtnSec onClick={()=>setResult(null)}>Intentar de nuevo</BtnSec>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Checkout Modal ─────────────────────────────────────────────────────────────
function CheckoutModal({carrito,onClose,onSuccess,token,fiscalConfig}) {
  const [metodo,setMetodo]=useState('efectivo')
  const [loading,setLoading]=useState(false)
  const [completado,setCompletado]=useState(null)
  const [showDTE,setShowDTE]=useState(false)

  const subtotal=carrito.reduce((s,i)=>s+i.precio*i.cantidad,0)
  const iva=subtotal*0.13
  const total=subtotal+iva

  async function procesarVenta() {
    setLoading(true)
    try {
      const res=await fetch(`${API}/api/ventas/venta`,{
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body:JSON.stringify({
          items:carrito.map(i=>({product_id:i.id,quantity:i.cantidad,unit_price:i.precio,discount:0})),
          payment_method:metodo,
          subtotal,iva,total,
          notes:''
        })
      })
      const d=await res.json()
      if(res.ok){
        setCompletado(d)
        onSuccess&&onSuccess(d)
      }
    }catch{}
    setLoading(false)
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:24}} onClick={e=>{if(e.target===e.currentTarget&&!completado)onClose()}}>
      <div style={{background:T.card,borderRadius:20,padding:28,width:'100%',maxWidth:440,boxShadow:'0 24px 64px rgba(0,0,0,.15)'}}>
        {!completado ? (
          <>
            <div style={{fontSize:17,fontWeight:600,color:T.text,letterSpacing:-0.3,marginBottom:20}}>Cobrar venta</div>
            {/* Items */}
            <div style={{marginBottom:16,maxHeight:200,overflowY:'auto'}}>
              {carrito.map((item,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:`.5px solid ${T.soft}`}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:500,color:T.text}}>{item.nombre}</div>
                    <div style={{fontSize:11,color:T.text4}}>{item.cantidad} × ${item.precio.toFixed(2)}</div>
                  </div>
                  <span style={{fontSize:13,fontWeight:500,color:T.text,fontVariantNumeric:'tabular-nums'}}>${(item.precio*item.cantidad).toFixed(2)}</span>
                </div>
              ))}
            </div>
            {/* Totales */}
            <div style={{padding:'12px 14px',background:T.sidebar,borderRadius:10,marginBottom:16}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                <span style={{fontSize:12,color:T.text3}}>Subtotal</span>
                <span style={{fontSize:12,color:T.text,fontVariantNumeric:'tabular-nums'}}>${subtotal.toFixed(2)}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                <span style={{fontSize:12,color:T.text3}}>IVA 13%</span>
                <span style={{fontSize:12,color:T.text,fontVariantNumeric:'tabular-nums'}}>${iva.toFixed(2)}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',paddingTop:6,borderTop:`.5px solid ${T.hairline}`}}>
                <span style={{fontSize:15,fontWeight:600,color:T.text}}>Total</span>
                <span style={{fontSize:20,fontWeight:600,color:T.green,fontVariantNumeric:'tabular-nums'}}>${total.toFixed(2)}</span>
              </div>
            </div>
            {/* Metodo pago */}
            <div style={{marginBottom:20}}>
              <div style={{fontSize:12,fontWeight:500,color:T.text3,marginBottom:8}}>Metodo de pago</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                {METODOS_PAGO.map(m=>(
                  <button key={m.key} onClick={()=>setMetodo(m.key)} style={{padding:'10px 6px',borderRadius:10,border:`.5px solid ${metodo===m.key?T.blue:T.hairline}`,background:metodo===m.key?'rgba(0,113,227,.06)':T.sidebar,cursor:'pointer',fontFamily:'inherit',boxShadow:metodo===m.key?`0 0 0 1px ${T.blue}`:'none',textAlign:'center'}}>
                    <div style={{fontSize:18,marginBottom:3}}>{m.icon}</div>
                    <div style={{fontSize:10,fontWeight:500,color:metodo===m.key?T.blue:T.text3}}>{m.label}</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{display:'flex',gap:10}}>
              <BtnSec onClick={onClose} style={{flex:1,justifyContent:'center'}}>Cancelar</BtnSec>
              <Btn onClick={procesarVenta} disabled={loading} color={T.green} style={{flex:2,justifyContent:'center',fontSize:15,padding:'10px 18px'}}>
                {loading?'Procesando...`':'Cobrar $'+total.toFixed(2)}
              </Btn>
            </div>
          </>
        ):(
          <div style={{textAlign:'center',padding:'20px 0'}}>
            <div style={{fontSize:40,marginBottom:12}}>✅</div>
            <div style={{fontSize:18,fontWeight:600,color:T.text,marginBottom:4}}>Venta registrada</div>
            <div style={{fontSize:13,color:T.text3,marginBottom:4}}>Total cobrado: <strong style={{color:T.green}}>${total.toFixed(2)}</strong></div>
            <div style={{fontSize:12,color:T.text4,marginBottom:24}}>#{completado.id} · {metodo}</div>
            {fiscalConfig?.activo&&(
              <div style={{padding:'12px 16px',background:T.sidebar,borderRadius:12,border:`.5px solid ${T.hairline}`,marginBottom:16,textAlign:'left'}}>
                <div style={{fontSize:13,fontWeight:500,color:T.text,marginBottom:4}}>¿Emitir documento tributario?</div>
                <div style={{fontSize:12,color:T.text3,marginBottom:10}}>Genera el DTE para esta venta y envialo al Ministerio de Hacienda.</div>
                <Btn onClick={()=>setShowDTE(true)} color={T.blue} style={{fontSize:12,padding:'7px 16px'}}>
                  Emitir DTE
                </Btn>
              </div>
            )}
            <BtnSec onClick={onClose}>Cerrar</BtnSec>
          </div>
        )}
      </div>
      {showDTE&&completado&&(
        <DTEModal sale={{...completado,total}} fiscalConfig={fiscalConfig} token={token} onClose={()=>setShowDTE(false)} onSuccess={()=>setShowDTE(false)}/>
      )}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function Ventas() {
  const router = useRouter()
  const [section,setSection]=useState('tpv')
  const [token,setToken]=useState(null)
  const [user,setUser]=useState(null)
  const [productos,setProductos]=useState([])
  const [carrito,setCarrito]=useState([])
  const [busqueda,setBusqueda]=useState('')
  const [loading,setLoading]=useState(false)
  const [resumen,setResumen]=useState(null)
  const [historial,setHistorial]=useState([])
  const [stockAlertas,setStockAlertas]=useState([])
  const [showCheckout,setShowCheckout]=useState(false)
  const [fiscalConfig,setFiscalConfig]=useState(null)
  const [showDTEModal,setShowDTEModal]=useState(null)
  const [msg,setMsg]=useState(null)
  const [newProduct,setNewProduct]=useState({nombre:'',precio:'',stock:'',codigo_barras:'',categoria:''})
  const [showNewProduct,setShowNewProduct]=useState(false)

  const getToken=()=>localStorage.getItem('nexum_token')

  useEffect(()=>{
    const t=getToken()
    if(!t){router.push('/login');return}
    setToken(t)
    try{const p=JSON.parse(atob(t.split('.')[1]));setUser({email:p.sub||'',name:p.name||p.sub||'Usuario'})}catch{setUser({email:'',name:'Usuario'})}
    loadAll()
  },[])

  async function loadAll() {
    const t=getToken()
    const H={Authorization:`Bearer ${t}`}
    const [r1,r2,r3,r4,r5]=await Promise.allSettled([
      fetch(`${API}/api/ventas/productos`,{headers:H}),
      fetch(`${API}/api/ventas/resumen`,{headers:H}),
      fetch(`${API}/api/ventas/historial`,{headers:H}),
      fetch(`${API}/api/ventas/alertas/stock`,{headers:H}),
      fetch(`${API}/api/fiscal/config`,{headers:H}),
    ])
    if(r1.status==='fulfilled'&&r1.value.ok){const d=await r1.value.json();setProductos(Array.isArray(d)?d:d.products||d.items||[])}
    if(r2.status==='fulfilled'&&r2.value.ok)setResumen(await r2.value.json())
    if(r3.status==='fulfilled'&&r3.value.ok){const d=await r3.value.json();setHistorial(d.sales||d||[])}
    if(r4.status==='fulfilled'&&r4.value.ok){const d=await r4.value.json();setStockAlertas(d.products||[])}
    if(r5.status==='fulfilled'&&r5.value.ok)setFiscalConfig(await r5.value.json())
  }

  function addToCart(p) {
    setCarrito(c=>{
      const ex=c.find(i=>i.id===p.id)
      if(ex) return c.map(i=>i.id===p.id?{...i,cantidad:i.cantidad+1}:i)
      return [...c,{id:p.id,nombre:p.name||p.nombre,precio:p.sale_price||p.price||p.precio||0,cantidad:1}]
    })
  }

  function removeFromCart(id) { setCarrito(c=>c.filter(i=>i.id!==id)) }
  function updateQty(id,qty) { if(qty<1){removeFromCart(id);return}; setCarrito(c=>c.map(i=>i.id===id?{...i,cantidad:qty}:i)) }

  const total=carrito.reduce((s,i)=>s+i.precio*i.cantidad,0)
  const totalConIVA=total*1.13

  const productosFiltrados=productos.filter(p=>{
    const q=busqueda.toLowerCase()
    return (p.name||p.nombre||'').toLowerCase().includes(q)||(p.barcode||p.codigo_barras||'').includes(q)
  })

  async function crearProducto(e) {
    e.preventDefault()
    const res=await fetch(`${API}/api/ventas/productos`,{
      method:'POST',
      headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},
      body:JSON.stringify({name:newProduct.nombre,price:parseFloat(newProduct.precio),stock:parseInt(newProduct.stock||0),barcode:newProduct.codigo_barras,category:newProduct.categoria})
    })
    if(res.ok){setMsg({ok:true,text:'Producto creado'});setShowNewProduct(false);setNewProduct({nombre:'',precio:'',stock:'',codigo_barras:'',categoria:''});loadAll()}
    setTimeout(()=>setMsg(null),2000)
  }

  const sections=[
    {key:'tpv',      label:'Punto de venta'},
    {key:'productos',label:'Productos'},
    {key:'historial',label:'Historial'},
    {key:'resumen',  label:'Resumen'},
  ]

  return (
    <div style={{minHeight:'100vh',background:T.bg,display:'flex',fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',system-ui,sans-serif",WebkitFontSmoothing:'antialiased'}}>
      <style>{`*{box-sizing:border-box}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:999px}input:focus,select:focus{border-color:${T.blue}!important;outline:none}`}</style>
      <Sidebar active="/ventas"/>

      {showCheckout&&<CheckoutModal carrito={carrito} token={token} fiscalConfig={fiscalConfig} onClose={()=>setShowCheckout(false)} onSuccess={()=>{setCarrito([]);setShowCheckout(false);loadAll()}}/>}
      {showDTEModal&&<DTEModal sale={showDTEModal} fiscalConfig={fiscalConfig} token={token} onClose={()=>setShowDTEModal(null)}/>}

      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <header style={{height:56,background:'rgba(251,251,253,.9)',backdropFilter:'saturate(180%) blur(20px)',WebkitBackdropFilter:'saturate(180%) blur(20px)',borderBottom:`.5px solid ${T.hairline}`,display:'flex',alignItems:'center',padding:'0 24px',flexShrink:0,position:'sticky',top:0,zIndex:10}}>
          <div style={{display:'flex',flexDirection:'column',lineHeight:1.1,paddingRight:20,borderRight:`.5px solid ${T.hairline}`,marginRight:4}}>
            <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.3}}>Ventas</div>
            <div style={{fontSize:11,color:T.text4}}>TPV · Productos · DTE</div>
          </div>
          <div style={{display:'flex',height:56}}>
            {sections.map(s=>(
              <button key={s.key} onClick={()=>setSection(s.key)} style={{padding:'0 16px',height:56,background:'none',border:'none',borderBottom:section===s.key?`2px solid ${T.text}`:'2px solid transparent',color:section===s.key?T.text:T.text3,fontWeight:section===s.key?600:400,fontSize:13,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',transition:'all .15s'}}>
                {s.label}
              </button>
            ))}
          </div>
          {fiscalConfig?.activo&&(
            <div style={{marginLeft:16,padding:'3px 10px',background:T.greenSoft,borderRadius:999,fontSize:11,fontWeight:500,color:T.green,flexShrink:0}}>
              🧾 DTE activo
            </div>
          )}
          {!fiscalConfig?.activo&&fiscalConfig?.configurado===false&&(
            <div onClick={()=>router.push('/settings?tab=fiscal')} style={{marginLeft:16,padding:'3px 10px',background:T.amberSoft,borderRadius:999,fontSize:11,fontWeight:500,color:T.amber,cursor:'pointer',flexShrink:0}}>
              ⚠️ Configurar DTE
            </div>
          )}
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8}}>
            <button onClick={()=>router.push('/settings')} style={{width:32,height:32,borderRadius:8,border:'none',background:'transparent',display:'grid',placeItems:'center',cursor:'pointer',color:T.text3}} onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,.06)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>{I.gear}</button>
            <ProfileBtn user={user} router={router}/>
          </div>
        </header>

        <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
          {msg&&<div style={{padding:'10px 24px',background:msg.ok?T.greenSoft:T.redSoft,fontSize:13,color:msg.ok?T.green:T.red}}>{msg.text}</div>}

          {/* ══ TPV ══ */}
          {section==='tpv'&&(
            <div style={{flex:1,display:'grid',gridTemplateColumns:'1fr 340px',overflow:'hidden'}}>
              {/* Catalogo */}
              <div style={{overflowY:'auto',padding:'20px 24px'}}>
                {/* Stock alertas */}
                {stockAlertas.length>0&&(
                  <div style={{padding:'10px 14px',background:T.amberSoft,borderRadius:10,border:`.5px solid ${T.amber}`,marginBottom:14,fontSize:12,color:T.amber}}>
                    ⚠️ {stockAlertas.length} producto{stockAlertas.length>1?'s':''} con stock bajo: {stockAlertas.slice(0,3).map(p=>p.name||p.nombre).join(', ')}
                  </div>
                )}
                {/* Busqueda */}
                <div style={{display:'flex',alignItems:'center',gap:8,background:T.sidebar,borderRadius:999,padding:'8px 14px',marginBottom:16,border:`.5px solid ${T.hairline}`}}>
                  <span style={{color:T.text4,display:'flex'}}>{I.search}</span>
                  <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar producto o escanear codigo..." style={{border:'none',background:'transparent',outline:'none',flex:1,fontSize:13,color:T.text,fontFamily:'inherit'}}/>
                  {busqueda&&<button onClick={()=>setBusqueda('')} style={{background:'none',border:'none',color:T.text4,cursor:'pointer',fontSize:16}}>×</button>}
                </div>
                {/* Grid productos */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10}}>
                  {productosFiltrados.map(p=>{
                    const stock=p.stock_quantity||p.stock||p.stock_actual||0
                    const sinStock=stock===0
                    const bajoStock=stock>0&&stock<=5
                    return (
                      <div key={p.id} onClick={()=>!sinStock&&addToCart(p)} style={{padding:'14px',background:T.card,borderRadius:14,border:`.5px solid ${T.hairline}`,cursor:sinStock?'not-allowed':'pointer',opacity:sinStock?.5:1,transition:'all .15s',boxShadow:'0 1px 2px rgba(0,0,0,.03)'}}
                        onMouseEnter={e=>{if(!sinStock){e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.08)';e.currentTarget.style.transform='translateY(-1px)'}}}
                        onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 1px 2px rgba(0,0,0,.03)';e.currentTarget.style.transform='translateY(0)'}}>
                        <div style={{fontSize:11,fontWeight:600,color:bajoStock?T.amber:sinStock?T.red:T.green,marginBottom:4}}>
                          {sinStock?'Sin stock':bajoStock?`${stock} unid.`:`${stock} unid.`}
                        </div>
                        <div style={{fontSize:13,fontWeight:500,color:T.text,marginBottom:4,lineHeight:1.3,minHeight:36}}>{p.name||p.nombre}</div>
                        <div style={{fontSize:14,fontWeight:600,color:T.blue,fontVariantNumeric:'tabular-nums'}}>${(p.sale_price||p.price||p.precio||0).toFixed(2)}</div>
                      </div>
                    )
                  })}
                  {productosFiltrados.length===0&&(
                    <div style={{gridColumn:'1/-1',padding:'48px',textAlign:'center',color:T.text4,fontSize:13}}>
                      {busqueda?'Sin resultados':'Sin productos. Añade uno en la pestaña Productos.'}
                    </div>
                  )}
                </div>
              </div>

              {/* Carrito */}
              <div style={{borderLeft:`.5px solid ${T.hairline}`,display:'flex',flexDirection:'column',background:T.card}}>
                <div style={{padding:'16px 20px',borderBottom:`.5px solid ${T.hairline}`}}>
                  <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2}}>Carrito</div>
                  <div style={{fontSize:12,color:T.text4}}>{carrito.length} producto{carrito.length!==1?'s':''}</div>
                </div>
                <div style={{flex:1,overflowY:'auto',padding:'12px 20px'}}>
                  {carrito.length===0?(
                    <div style={{padding:'48px 0',textAlign:'center',color:T.text4,fontSize:13}}>Toca un producto para añadir</div>
                  ):carrito.map(item=>(
                    <div key={item.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:`.5px solid ${T.soft}`}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:500,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.nombre}</div>
                        <div style={{fontSize:11,color:T.text4}}>${item.precio.toFixed(2)} c/u</div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <button onClick={()=>updateQty(item.id,item.cantidad-1)} style={{width:22,height:22,borderRadius:999,border:`.5px solid ${T.hairline}`,background:T.sidebar,color:T.text,fontSize:14,cursor:'pointer',display:'grid',placeItems:'center'}}>-</button>
                        <span style={{fontSize:13,fontWeight:500,color:T.text,minWidth:20,textAlign:'center'}}>{item.cantidad}</span>
                        <button onClick={()=>updateQty(item.id,item.cantidad+1)} style={{width:22,height:22,borderRadius:999,border:`.5px solid ${T.hairline}`,background:T.sidebar,color:T.text,fontSize:14,cursor:'pointer',display:'grid',placeItems:'center'}}>+</button>
                      </div>
                      <div style={{fontSize:13,fontWeight:600,color:T.text,fontVariantNumeric:'tabular-nums',minWidth:52,textAlign:'right'}}>${(item.precio*item.cantidad).toFixed(2)}</div>
                      <button onClick={()=>removeFromCart(item.id)} style={{width:22,height:22,borderRadius:999,border:'none',background:T.redSoft,color:T.red,cursor:'pointer',display:'grid',placeItems:'center',flexShrink:0}}>×</button>
                    </div>
                  ))}
                </div>
                {carrito.length>0&&(
                  <div style={{padding:'16px 20px',borderTop:`.5px solid ${T.hairline}`}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:12,color:T.text3}}>Subtotal</span>
                      <span style={{fontSize:12,color:T.text,fontVariantNumeric:'tabular-nums'}}>${total.toFixed(2)}</span>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                      <span style={{fontSize:12,color:T.text3}}>IVA 13%</span>
                      <span style={{fontSize:12,color:T.text,fontVariantNumeric:'tabular-nums'}}>${(total*0.13).toFixed(2)}</span>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:14,paddingTop:8,borderTop:`.5px solid ${T.hairline}`}}>
                      <span style={{fontSize:15,fontWeight:600,color:T.text}}>Total</span>
                      <span style={{fontSize:20,fontWeight:600,color:T.green,fontVariantNumeric:'tabular-nums'}}>${totalConIVA.toFixed(2)}</span>
                    </div>
                    <Btn onClick={()=>setShowCheckout(true)} color={T.green} style={{width:'100%',justifyContent:'center',fontSize:15,padding:'12px',borderRadius:12}}>
                      Cobrar ${totalConIVA.toFixed(2)}
                    </Btn>
                    <button onClick={()=>setCarrito([])} style={{width:'100%',marginTop:8,padding:'8px',background:'none',border:'none',color:T.text4,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>
                      Vaciar carrito
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ PRODUCTOS ══ */}
          {section==='productos'&&(
            <div style={{flex:1,overflowY:'auto',padding:'20px 24px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2}}>Catalogo de productos</div>
                <Btn onClick={()=>setShowNewProduct(true)}>{I.plus} Nuevo producto</Btn>
              </div>

              {showNewProduct&&(
                <Card style={{marginBottom:16}}>
                  <div style={{fontSize:14,fontWeight:600,color:T.text,marginBottom:14}}>Nuevo producto</div>
                  <form onSubmit={crearProducto}>
                    <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:12,marginBottom:12}}>
                      <div>
                        <div style={{fontSize:12,color:T.text3,marginBottom:4}}>Nombre</div>
                        <input style={inp} placeholder="Nombre del producto" value={newProduct.nombre} onChange={e=>setNewProduct(p=>({...p,nombre:e.target.value}))} required onFocus={e=>e.target.style.borderColor=T.blue} onBlur={e=>e.target.style.borderColor='rgba(0,0,0,0.08)'}/>
                      </div>
                      <div>
                        <div style={{fontSize:12,color:T.text3,marginBottom:4}}>Precio $</div>
                        <input style={inp} type="number" step="0.01" placeholder="0.00" value={newProduct.precio} onChange={e=>setNewProduct(p=>({...p,precio:e.target.value}))} required onFocus={e=>e.target.style.borderColor=T.blue} onBlur={e=>e.target.style.borderColor='rgba(0,0,0,0.08)'}/>
                      </div>
                      <div>
                        <div style={{fontSize:12,color:T.text3,marginBottom:4}}>Stock inicial</div>
                        <input style={inp} type="number" placeholder="0" value={newProduct.stock} onChange={e=>setNewProduct(p=>({...p,stock:e.target.value}))} onFocus={e=>e.target.style.borderColor=T.blue} onBlur={e=>e.target.style.borderColor='rgba(0,0,0,0.08)'}/>
                      </div>
                      <div>
                        <div style={{fontSize:12,color:T.text3,marginBottom:4}}>Codigo de barras</div>
                        <input style={inp} placeholder="Opcional" value={newProduct.codigo_barras} onChange={e=>setNewProduct(p=>({...p,codigo_barras:e.target.value}))} onFocus={e=>e.target.style.borderColor=T.blue} onBlur={e=>e.target.style.borderColor='rgba(0,0,0,0.08)'}/>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:10}}>
                      <Btn disabled={!newProduct.nombre||!newProduct.precio}>Crear producto</Btn>
                      <BtnSec onClick={()=>setShowNewProduct(false)}>Cancelar</BtnSec>
                    </div>
                  </form>
                </Card>
              )}

              <Card style={{padding:0,overflow:'hidden'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{background:T.sidebar,borderBottom:`.5px solid ${T.hairline}`}}>
                      {['Producto','Categoria','Precio','Stock','Estado',''].map(h=>(
                        <th key={h} style={{padding:'10px 16px',textAlign:'left',fontSize:11,fontWeight:600,color:T.text3,textTransform:'uppercase',letterSpacing:0.5}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {productos.map((p,i)=>{
                      const stock=p.stock_quantity||p.stock||p.stock_actual||0
                      const sc=stock===0?{c:T.red,bg:T.redSoft,l:'Sin stock'}:stock<=5?{c:T.amber,bg:T.amberSoft,l:'Stock bajo'}:{c:T.green,bg:T.greenSoft,l:'OK'}
                      return (
                        <tr key={p.id} style={{borderBottom:`.5px solid ${T.soft}`}} onMouseEnter={e=>e.currentTarget.style.background=T.sidebar} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <td style={{padding:'11px 16px'}}>
                            <div style={{fontSize:13,fontWeight:500,color:T.text}}>{p.name||p.nombre}</div>
                            {(p.barcode||p.codigo_barras)&&<div style={{fontSize:11,color:T.text4}}>{p.barcode||p.codigo_barras}</div>}
                          </td>
                          <td style={{padding:'11px 16px',fontSize:12,color:T.text3}}>{p.category||p.categoria||'—'}</td>
                          <td style={{padding:'11px 16px',fontSize:13,fontWeight:600,color:T.text,fontVariantNumeric:'tabular-nums'}}>${(p.sale_price||p.price||p.precio||0).toFixed(2)}</td>
                          <td style={{padding:'11px 16px',fontSize:13,fontWeight:500,color:T.text,fontVariantNumeric:'tabular-nums'}}>{p.stock_quantity||p.stock||0}</td>
                          <td style={{padding:'11px 16px'}}>
                            <span style={{padding:'3px 10px',background:sc.bg,color:sc.c,borderRadius:999,fontSize:11,fontWeight:500}}>{sc.l}</span>
                          </td>
                          <td style={{padding:'11px 16px'}}>
                            <button onClick={()=>addToCart(p)} style={{padding:'5px 12px',borderRadius:999,border:`.5px solid ${T.hairline}`,background:T.card,fontSize:12,color:T.blue,cursor:'pointer',fontFamily:'inherit',fontWeight:500}}>+ Vender</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {productos.length===0&&<div style={{padding:'48px',textAlign:'center',color:T.text4,fontSize:13}}>Sin productos</div>}
              </Card>
            </div>
          )}

          {/* ══ HISTORIAL ══ */}
          {section==='historial'&&(
            <div style={{flex:1,overflowY:'auto',padding:'20px 24px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <div style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.2}}>Historial de ventas</div>
              </div>
              <Card style={{padding:0,overflow:'hidden'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{background:T.sidebar,borderBottom:`.5px solid ${T.hairline}`}}>
                      {['#','Fecha','Items','Metodo','Total','DTE',''].map(h=>(
                        <th key={h} style={{padding:'10px 16px',textAlign:'left',fontSize:11,fontWeight:600,color:T.text3,textTransform:'uppercase',letterSpacing:0.5}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historial.slice(0,50).map((v,i)=>(
                      <tr key={v.id||i} style={{borderBottom:`.5px solid ${T.soft}`}} onMouseEnter={e=>e.currentTarget.style.background=T.sidebar} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <td style={{padding:'10px 16px',fontSize:12,color:T.text4}}>#{v.id}</td>
                        <td style={{padding:'10px 16px',fontSize:12,color:T.text3,whiteSpace:'nowrap'}}>{v.sale_date||v.fecha||'—'}</td>
                        <td style={{padding:'10px 16px',fontSize:13,color:T.text}}>{v.items_count||v.items?.length||'—'} items</td>
                        <td style={{padding:'10px 16px',fontSize:12,color:T.text3}}>{v.payment_method||v.metodo||'—'}</td>
                        <td style={{padding:'10px 16px',fontSize:13,fontWeight:600,color:T.green,fontVariantNumeric:'tabular-nums'}}>${(v.total||0).toFixed(2)}</td>
                        <td style={{padding:'10px 16px'}}>
                          {v.dte_id
                            ?<span style={{padding:'2px 8px',background:T.greenSoft,color:T.green,borderRadius:999,fontSize:11,fontWeight:500}}>Emitido</span>
                            :fiscalConfig?.activo
                            ?<button onClick={()=>setShowDTEModal(v)} style={{padding:'3px 10px',borderRadius:999,border:`.5px solid ${T.blue}`,background:'rgba(0,113,227,.06)',fontSize:11,color:T.blue,cursor:'pointer',fontFamily:'inherit',fontWeight:500}}>Emitir DTE</button>
                            :<span style={{fontSize:11,color:T.text4}}>—</span>
                          }
                        </td>
                        <td style={{padding:'10px 16px'}}>
                          <span style={{fontSize:12,color:T.blue,cursor:'pointer',fontWeight:500}}>Ver</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {historial.length===0&&<div style={{padding:'48px',textAlign:'center',color:T.text4,fontSize:13}}>Sin ventas registradas</div>}
              </Card>
            </div>
          )}

          {/* ══ RESUMEN ══ */}
          {section==='resumen'&&(
            <div style={{flex:1,overflowY:'auto',padding:'20px 24px'}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
                {[
                  {label:'Ventas hoy',       value:`$${(resumen?.today?.total_revenue||0).toFixed(2)}`,    sub:`${resumen?.today?.total_sales||0} transacciones`,color:T.green},
                  {label:'Ventas este mes',   value:`$${(resumen?.month?.total_revenue||0).toFixed(2)}`,   sub:`${resumen?.month?.total_sales||0} transacciones`,  color:T.blue},
                  {label:'Ticket promedio',   value:`$${(resumen?.today?.avg_ticket||0).toFixed(2)}`,      sub:'promedio por venta',                                color:T.text},
                  {label:'Alertas de stock',  value:stockAlertas.length,                                    sub:'productos bajo minimo',                             color:stockAlertas.length>0?T.amber:T.green},
                ].map((k,i)=>(
                  <Card key={i} style={{padding:'18px 20px'}}>
                    <div style={{fontSize:12,color:T.text3,fontWeight:500,marginBottom:8}}>{k.label}</div>
                    <div style={{fontSize:28,fontWeight:600,letterSpacing:-0.8,color:k.color,fontVariantNumeric:'tabular-nums',lineHeight:1,marginBottom:4}}>{k.value}</div>
                    <div style={{fontSize:11,color:T.text4}}>{k.sub}</div>
                  </Card>
                ))}
              </div>

              {/* Mas vendidos */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <Card>
                  <div style={{fontSize:14,fontWeight:600,color:T.text,letterSpacing:-0.2,marginBottom:14}}>Mas vendidos</div>
                  {(resumen?.best_sellers||[]).slice(0,8).map((p,i)=>(
                    <div key={p.product_id||i} style={{display:'flex',alignItems:'center',gap:12,padding:'9px 0',borderBottom:`.5px solid ${T.soft}`}}>
                      <span style={{fontSize:12,fontWeight:600,color:T.text4,width:20,textAlign:'center',flexShrink:0}}>{i+1}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:500,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name||p.nombre}</div>
                        <div style={{fontSize:11,color:T.text4}}>{p.units_sold} unidades</div>
                      </div>
                      <span style={{fontSize:13,fontWeight:600,color:T.green,fontVariantNumeric:'tabular-nums'}}>${(p.revenue||0).toFixed(0)}</span>
                    </div>
                  ))}
                  {!resumen?.best_sellers?.length&&<div style={{padding:'32px',textAlign:'center',color:T.text4,fontSize:13}}>Sin datos</div>}
                </Card>

                <Card>
                  <div style={{fontSize:14,fontWeight:600,color:T.text,letterSpacing:-0.2,marginBottom:14}}>Stock bajo</div>
                  {stockAlertas.length===0?(
                    <div style={{padding:'32px',textAlign:'center',color:T.green,fontSize:13}}>Todo el stock esta bien</div>
                  ):stockAlertas.map((p,i)=>(
                    <div key={p.id||i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 0',borderBottom:`.5px solid ${T.soft}`}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:500,color:T.text}}>{p.name||p.nombre}</div>
                        <div style={{fontSize:11,color:T.text4}}>Minimo: {p.min_stock||p.minimo||5}</div>
                      </div>
                      <span style={{padding:'3px 10px',background:p.stock===0?T.redSoft:T.amberSoft,color:p.stock===0?T.red:T.amber,borderRadius:999,fontSize:12,fontWeight:600}}>{p.stock} unid.</span>
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
