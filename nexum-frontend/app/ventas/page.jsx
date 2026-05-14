'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const API   = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const NAVY  = '#0B1426'
const GREEN = '#16a34a'
const RED   = '#dc2626'
const AMBER = '#d97706'
const CYAN  = '#00B4D8'
const BLUE  = '#2563eb'

const PAYMENT_METHODS = [
  { key: 'efectivo', label: 'Efectivo', icon: '💵' },
  { key: 'tarjeta',  label: 'Tarjeta',  icon: '💳' },
  { key: 'bizum',    label: 'Bizum',    icon: '📱' },
  { key: 'otro',     label: 'Otro',     icon: '🔄' },
]
const IVA_RATES = [0, 4, 10, 21]
const STOCK_CFG = {
  ok:        { color: GREEN, bg: '#f0fdf4', label: 'Stock OK'   },
  bajo:      { color: AMBER, bg: '#fffbeb', label: 'Stock bajo' },
  sin_stock: { color: RED,   bg: '#fef2f2', label: 'Sin stock'  },
}

import Sidebar from '@/components/Sidebar'

// ── Notification Center ────────────────────────────────────────────────────────
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
      if(a.status==='fulfilled'&&a.value.ok){const d=await a.value.json();if(d.requires_human>0)notifs.push({id:'m1',type:'urgent',icon:'💬',title:`${d.requires_human} mensaje${d.requires_human>1?'s':''} requiere atención`,desc:'Un cliente necesita respuesta humana',href:'/clientes',time:'Ahora'})}
      if(b.status==='fulfilled'&&b.value.ok){const d=await b.value.json();if(d.at_risk>0)notifs.push({id:'p1',type:'warning',icon:'📋',title:`${d.at_risk} proyecto${d.at_risk>1?'s':''} en riesgo`,desc:'Health score bajo',href:'/proyectos',time:'Hoy'})}
      if(c.status==='fulfilled'&&c.value.ok){const d=await c.value.json();if(d.total>0)notifs.push({id:'s1',type:'urgent',icon:'📦',title:`${d.total} producto${d.total>1?'s':''} con stock bajo`,desc:'Requiere reabastecimiento urgente',href:'/ventas',time:'Ahora'})}
    } catch{}
    setNotifications(notifs)
  }
  const unread = notifications.length
  const TC = { urgent:{color:RED,bg:'#fef2f2',dot:RED}, warning:{color:AMBER,bg:'#fffbeb',dot:AMBER}, info:{color:BLUE,bg:'#eff6ff',dot:BLUE} }
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

// ── Camera Scanner ─────────────────────────────────────────────────────────────
function CameraScanner({ onDetected, token }) {
  const videoRef = useRef(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [manualCode, setManualCode] = useState('')
  const animRef = useRef(null)

  async function startCamera() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } })
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); setScanning(true); startScanning() }
    } catch { setError('No se pudo acceder a la cámara. Usa el código manual.') }
  }

  function stopCamera() {
    if (videoRef.current?.srcObject) { videoRef.current.srcObject.getTracks().forEach(t => t.stop()); videoRef.current.srcObject = null }
    if (animRef.current) cancelAnimationFrame(animRef.current)
    setScanning(false)
  }

  function startScanning() {
    if ('BarcodeDetector' in window) {
      const detector = new window.BarcodeDetector({ formats: ['qr_code','ean_13','ean_8','code_128','data_matrix'] })
      const scan = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) { animRef.current = requestAnimationFrame(scan); return }
        try { const barcodes = await detector.detect(videoRef.current); if (barcodes.length > 0) { stopCamera(); onDetected(barcodes[0].rawValue); return } } catch {}
        animRef.current = requestAnimationFrame(scan)
      }
      animRef.current = requestAnimationFrame(scan)
    }
  }

  useEffect(() => () => stopCamera(), [])

  async function handleManual() {
    if (!manualCode.trim()) return
    onDetected(manualCode.trim()); setManualCode('')
  }

  return (
    <div>
      {!scanning ? (
        <div>
          <button onClick={startCamera} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: 'none', background: NAVY, color: 'white', fontWeight: '700', fontSize: '14px', cursor: 'pointer', fontFamily: "'DM Sans', system-ui", marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            📷 Activar cámara para escanear
          </button>
          {error && <div style={{ fontSize: '12px', color: AMBER, marginBottom: '10px', padding: '8px 10px', background: '#fffbeb', borderRadius: '7px' }}>{error}</div>}
        </div>
      ) : (
        <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px', background: '#111' }}>
          <video ref={videoRef} style={{ width: '100%', height: '220px', objectFit: 'cover', display: 'block' }} playsInline muted />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ width: '160px', height: '160px', border: `2px solid ${CYAN}`, borderRadius: '12px', boxShadow: '0 0 0 2000px rgba(0,0,0,0.4)' }} />
          </div>
          <div style={{ position: 'absolute', bottom: '8px', left: 0, right: 0, textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>Apunta al código Nexum o código de barras</div>
          <button onClick={stopCamera} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}>✕</button>
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input value={manualCode} onChange={e => setManualCode(e.target.value)} placeholder="Código manual (NX-001-00001 o EAN)" onKeyDown={e => e.key === 'Enter' && handleManual()}
          style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #e5e9f0', fontSize: '13px', fontFamily: "'DM Sans', system-ui", outline: 'none' }}
          onFocus={e => e.target.style.borderColor = NAVY} onBlur={e => e.target.style.borderColor = '#e5e9f0'} />
        <button onClick={handleManual} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: NAVY, color: 'white', fontWeight: '700', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', system-ui" }}>→</button>
      </div>
    </div>
  )
}

// ── Add Product Modal ──────────────────────────────────────────────────────────
function AddProductModal({ onClose, onCreated, token }) {
  const [form, setForm] = useState({ name: '', description: '', category: '', barcode: '', sale_price: '', cost_price: '', iva_rate: '21', stock_quantity: '0', low_stock_threshold: '5' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #e5e9f0', fontSize: '13px', fontFamily: "'DM Sans', system-ui", outline: 'none' }
  const labelStyle = { fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '5px' }

  async function handleSubmit() {
    if (!form.name || !form.sale_price) { setError('Nombre y precio son obligatorios'); return }
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/ventas/productos`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...form, sale_price: parseFloat(form.sale_price), cost_price: parseFloat(form.cost_price)||0, iva_rate: parseFloat(form.iva_rate), stock_quantity: parseInt(form.stock_quantity)||0, low_stock_threshold: parseInt(form.low_stock_threshold)||5 }) })
      if (res.ok) { const d = await res.json(); onCreated(d) } else { const e = await res.json(); setError(e.detail||'Error') }
    } catch { setError('Error de conexión') } finally { setLoading(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '18px', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: NAVY, padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><div style={{ fontSize: '15px', fontWeight: '800', color: 'white', letterSpacing: '-0.3px' }}>Nuevo producto</div><div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Se generará un código Nexum automáticamente</div></div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
        <div style={{ padding: '20px 24px', maxHeight: 'calc(90vh - 70px)', overflowY: 'auto' }}>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', color: RED, fontSize: '13px' }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Nombre *</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Nombre del producto" style={inputStyle} onFocus={e=>e.target.style.borderColor=NAVY} onBlur={e=>e.target.style.borderColor='#e5e9f0'}/></div>
            <div><label style={labelStyle}>Categoría</label><input value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} placeholder="Bebidas, Snacks..." style={inputStyle} onFocus={e=>e.target.style.borderColor=NAVY} onBlur={e=>e.target.style.borderColor='#e5e9f0'}/></div>
            <div><label style={labelStyle}>Código de barras (EAN)</label><input value={form.barcode} onChange={e=>setForm(p=>({...p,barcode:e.target.value}))} placeholder="8400000123456" style={inputStyle} onFocus={e=>e.target.style.borderColor=NAVY} onBlur={e=>e.target.style.borderColor='#e5e9f0'}/></div>
            <div><label style={labelStyle}>Precio de venta (s/IVA) € *</label><input type="number" step="0.01" value={form.sale_price} onChange={e=>setForm(p=>({...p,sale_price:e.target.value}))} placeholder="9.99" style={inputStyle} onFocus={e=>e.target.style.borderColor=NAVY} onBlur={e=>e.target.style.borderColor='#e5e9f0'}/></div>
            <div><label style={labelStyle}>Precio de coste €</label><input type="number" step="0.01" value={form.cost_price} onChange={e=>setForm(p=>({...p,cost_price:e.target.value}))} placeholder="5.00" style={inputStyle} onFocus={e=>e.target.style.borderColor=NAVY} onBlur={e=>e.target.style.borderColor='#e5e9f0'}/></div>
            <div><label style={labelStyle}>IVA %</label><select value={form.iva_rate} onChange={e=>setForm(p=>({...p,iva_rate:e.target.value}))} style={inputStyle}>{IVA_RATES.map(r=><option key={r} value={r}>{r}%</option>)}</select></div>
            <div><label style={labelStyle}>Stock inicial</label><input type="number" value={form.stock_quantity} onChange={e=>setForm(p=>({...p,stock_quantity:e.target.value}))} placeholder="0" style={inputStyle} onFocus={e=>e.target.style.borderColor=NAVY} onBlur={e=>e.target.style.borderColor='#e5e9f0'}/></div>
            <div><label style={labelStyle}>Alerta stock bajo (uds)</label><input type="number" value={form.low_stock_threshold} onChange={e=>setForm(p=>({...p,low_stock_threshold:e.target.value}))} placeholder="5" style={inputStyle} onFocus={e=>e.target.style.borderColor=NAVY} onBlur={e=>e.target.style.borderColor='#e5e9f0'}/></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Descripción</label><input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Descripción opcional" style={inputStyle} onFocus={e=>e.target.style.borderColor=NAVY} onBlur={e=>e.target.style.borderColor='#e5e9f0'}/></div>
          </div>
          {form.sale_price && (
            <div style={{ background: '#f8faff', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', border: '1px solid #e5e9f0', fontSize: '12px', color: '#374151' }}>
              Precio con IVA ({form.iva_rate}%): <strong style={{ color: NAVY }}>€{(parseFloat(form.sale_price||0)*(1+parseFloat(form.iva_rate||0)/100)).toFixed(2)}</strong>
              {form.cost_price && <span style={{ marginLeft: '12px' }}>Margen: <strong style={{ color: GREEN }}>{(((parseFloat(form.sale_price)-parseFloat(form.cost_price))/parseFloat(form.sale_price))*100).toFixed(1)}%</strong></span>}
            </div>
          )}
          <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: '9px', border: 'none', background: loading?'#e5e9f0':NAVY, color: loading?'#9ca3af':'white', fontWeight: '700', fontSize: '14px', cursor: loading?'not-allowed':'pointer', fontFamily: "'DM Sans', system-ui" }}>
            {loading?'Creando...':'✓ Crear producto y generar código Nexum'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── QR Modal ───────────────────────────────────────────────────────────────────
function QRModal({ product, token, onClose }) {
  const qrUrl = `${API}/api/ventas/productos/${product.id}/qr?size=280`
  const labelUrl = `${API}/api/ventas/productos/${product.id}/etiqueta`
  async function downloadLabel() {
    const res = await fetch(labelUrl, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) { const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `etiqueta_${product.nexum_code}.pdf`; a.click() }
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '380px', boxShadow: '0 32px 80px rgba(0,0,0,0.2)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: NAVY, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><div style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>{product.name}</div><div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', marginTop: '2px' }}>{product.nexum_code}</div></div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ borderRadius: '14px', overflow: 'hidden', marginBottom: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', background: '#111' }}>
            <img src={`${qrUrl}&token=${encodeURIComponent(localStorage.getItem('nexum_token')||'')}`} width={280} height={280} alt={`Código Nexum ${product.nexum_code}`} style={{ display: 'block' }} onError={e => { e.target.style.display = 'none' }} />
          </div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY, marginBottom: '4px' }}>{product.name}</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: NAVY, marginBottom: '4px' }}>€{(product.sale_price*(1+product.iva_rate/100)).toFixed(2)}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '20px', fontFamily: 'monospace' }}>{product.nexum_code}</div>
          <button onClick={downloadLabel} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: NAVY, color: 'white', fontWeight: '700', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', system-ui" }}>⬇ Descargar etiqueta PDF</button>
        </div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function VentasPage() {
  const router = useRouter()
  const [tab, setTab] = useState('pos')
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)

  const [cart, setCart] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [scanLoading, setScanLoading] = useState(false)
  const [scanError, setScanError] = useState('')
  const [saleSuccess, setSaleSuccess] = useState(null)
  const [processingPayment, setProcessingPayment] = useState(false)

  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [productSearch, setProductSearch] = useState('')

  const [dashboard, setDashboard] = useState(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)

  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    const t = localStorage.getItem('nexum_token')
    if (!t) { router.push('/login'); return }
    setToken(t)
    try { const p = JSON.parse(atob(t.split('.')[1])); setUser({ email: p.sub||'', name: p.name||p.sub||'Usuario' }) } catch { setUser({ email: '', name: 'Usuario' }) }
  }, [])

  useEffect(() => {
    if (!token) return
    if (tab === 'pos') loadDashboard()
    if (tab === 'productos') loadProducts()
    if (tab === 'historial') { loadHistory(); loadDashboard() }
  }, [tab, token])

  async function loadDashboard() { setDashboardLoading(true); try { const r = await fetch(`${API}/api/ventas/resumen`,{headers:{Authorization:`Bearer ${token}`}}); if(r.ok)setDashboard(await r.json()) } catch{} finally{setDashboardLoading(false)} }
  async function loadProducts() { setProductsLoading(true); try { const r = await fetch(`${API}/api/ventas/productos`,{headers:{Authorization:`Bearer ${token}`}}); if(r.ok){const d=await r.json();setProducts(d.products||[])} } catch{} finally{setProductsLoading(false)} }
  async function loadHistory() { setHistoryLoading(true); try { const r = await fetch(`${API}/api/ventas/historial`,{headers:{Authorization:`Bearer ${token}`}}); if(r.ok){const d=await r.json();setHistory(d.sales||[])} } catch{} finally{setHistoryLoading(false)} }

  async function handleScan(code) {
    setScanLoading(true); setScanError('')
    try {
      const res = await fetch(`${API}/api/ventas/productos/buscar/${encodeURIComponent(code)}`,{headers:{Authorization:`Bearer ${token}`}})
      if (res.ok) { addToCart(await res.json()) } else { setScanError(`Producto "${code}" no encontrado`) }
    } catch { setScanError('Error de conexión') } finally { setScanLoading(false) }
  }

  function addToCart(product) {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id)
      if (existing) return prev.map(i => i.product_id===product.id ? {...i,quantity:i.quantity+1} : i)
      return [...prev, { product_id:product.id, name:product.name, unit_price:product.sale_price, iva_rate:product.iva_rate, price_w_iva:product.sale_price_with_iva||product.price_with_iva||(product.sale_price*(1+product.iva_rate/100)), quantity:1, nexum_code:product.nexum_code }]
    })
    setScanError('')
  }

  function updateQty(product_id, delta) { setCart(prev => prev.map(i => i.product_id===product_id ? {...i,quantity:Math.max(1,i.quantity+delta)} : i).filter(i=>i.quantity>0)) }
  function removeFromCart(product_id) { setCart(prev => prev.filter(i => i.product_id!==product_id)) }

  const cartSubtotal = cart.reduce((s,i) => s+i.unit_price*i.quantity, 0)
  const cartIva      = cart.reduce((s,i) => s+(i.unit_price*i.quantity*i.iva_rate/100), 0)
  const cartTotal    = cartSubtotal + cartIva

  async function processSale() {
    if (cart.length===0) return
    setProcessingPayment(true)
    try {
      const res = await fetch(`${API}/api/ventas/venta`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({items:cart.map(i=>({product_id:i.product_id,quantity:i.quantity})),payment_method:paymentMethod})})
      if (res.ok) { const sale=await res.json(); setSaleSuccess(sale); setCart([]); loadDashboard() }
    } catch{} finally{setProcessingPayment(false)}
  }

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())||(p.category||'').toLowerCase().includes(productSearch.toLowerCase())||(p.nexum_code||'').toLowerCase().includes(productSearch.toLowerCase()))
  const card = { background:'white', borderRadius:'14px', border:'1px solid #e5e9f0' }
  const tabs = [
    { id:'pos',       label:'🛒 Punto de venta' },
    { id:'productos', label:'📦 Productos'       },
    { id:'historial', label:'📊 Historial'       },
  ]

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#f4f6fb', fontFamily:"'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;}
        input:focus,select:focus,textarea:focus{border-color:#0B1426!important;outline:none;}
        ::-webkit-scrollbar{width:5px;} ::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:3px;}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
      `}</style>

      <Sidebar active="/ventas"/>

      <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:'100vh', overflow:'hidden' }}>

        {/* TOP BAR */}
        <div style={{ background:'white', borderBottom:'1px solid #e5e9f0', padding:'0 32px', display:'flex', alignItems:'center', justifyContent:'space-between', height:'64px', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', flex:1 }}>
            <div style={{ paddingRight:'24px', marginRight:'8px', borderRight:'1px solid #f0f2f7' }}>
              <div style={{ fontSize:'16px', fontWeight:'800', color:NAVY, letterSpacing:'-0.4px' }}>🛒 Ventas</div>
              <div style={{ fontSize:'11px', color:'#9ca3af' }}>Punto de venta · Códigos Nexum · Inventario</div>
            </div>
            <div style={{ display:'flex' }}>
              {tabs.map(t => (
                <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:'0 14px', height:'64px', background:'none', border:'none', borderBottom:tab===t.id?`2px solid ${NAVY}`:'2px solid transparent', color:tab===t.id?NAVY:'#6b7280', fontWeight:tab===t.id?'700':'400', fontSize:'13px', cursor:'pointer', fontFamily:"'DM Sans', system-ui", transition:'all 0.15s' }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <SettingsButton/>
            <NotificationCenter token={token}/>
            <ProfileButton user={user}/>
            {tab==='productos' && <button onClick={()=>setShowAddProduct(true)} style={{ padding:'9px 18px', borderRadius:'9px', border:'none', background:NAVY, color:'white', fontWeight:'700', fontSize:'13px', cursor:'pointer', fontFamily:"'DM Sans', system-ui", marginLeft:'4px' }}>+ Nuevo producto</button>}
          </div>
        </div>

        {/* POS */}
        {tab==='pos' && (
          <div style={{ flex:1, display:'grid', gridTemplateColumns:'420px 1fr', overflow:'hidden' }}>
            <div style={{ borderRight:'1px solid #e5e9f0', display:'flex', flexDirection:'column', background:'white', overflow:'hidden' }}>
              <div style={{ padding:'16px', borderBottom:'1px solid #f0f2f7' }}>
                <div style={{ fontSize:'11px', fontWeight:'700', color:'#374151', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'10px' }}>Escáner</div>
                <CameraScanner onDetected={handleScan} token={token}/>
                {scanLoading && <div style={{ textAlign:'center', padding:'8px', fontSize:'12px', color:'#9ca3af' }}>Buscando producto...</div>}
                {scanError && <div style={{ padding:'8px 12px', background:'#fef2f2', borderRadius:'8px', color:RED, fontSize:'12px', marginTop:'8px' }}>{scanError}</div>}
              </div>
              <div style={{ flex:1, overflowY:'auto', padding:'12px' }}>
                {cart.length===0 ? (
                  <div style={{ textAlign:'center', padding:'40px', color:'#9ca3af' }}>
                    <div style={{ fontSize:'40px', marginBottom:'10px', opacity:0.3 }}>🛒</div>
                    <div style={{ fontSize:'13px', fontWeight:'500' }}>Escanea un producto para añadirlo</div>
                    <div style={{ fontSize:'12px', marginTop:'5px', color:'#d1d5db' }}>o introduce el código manualmente</div>
                  </div>
                ) : cart.map(item => (
                  <div key={item.product_id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', background:'#f8faff', borderRadius:'10px', marginBottom:'8px', border:'1px solid #f0f2f7', animation:'slideIn 0.2s ease' }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'13px', fontWeight:'600', color:NAVY, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</div>
                      <div style={{ fontSize:'10px', color:'#9ca3af', fontFamily:'monospace' }}>{item.nexum_code} · IVA {item.iva_rate}%</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                      <button onClick={()=>updateQty(item.product_id,-1)} style={{ width:'26px', height:'26px', borderRadius:'7px', border:'1px solid #e5e9f0', background:'white', cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700' }}>−</button>
                      <span style={{ fontSize:'14px', fontWeight:'800', color:NAVY, minWidth:'22px', textAlign:'center' }}>{item.quantity}</span>
                      <button onClick={()=>updateQty(item.product_id,1)} style={{ width:'26px', height:'26px', borderRadius:'7px', border:'1px solid #e5e9f0', background:'white', cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700' }}>+</button>
                    </div>
                    <div style={{ textAlign:'right', minWidth:'64px' }}>
                      <div style={{ fontSize:'14px', fontWeight:'800', color:NAVY }}>€{(item.price_w_iva*item.quantity).toFixed(2)}</div>
                      <div style={{ fontSize:'10px', color:'#9ca3af' }}>€{item.price_w_iva.toFixed(2)} c/u</div>
                    </div>
                    <button onClick={()=>removeFromCart(item.product_id)} style={{ background:'none', border:'none', color:'#d1d5db', cursor:'pointer', fontSize:'16px', padding:'2px', transition:'color 0.15s' }} onMouseEnter={e=>e.currentTarget.style.color=RED} onMouseLeave={e=>e.currentTarget.style.color='#d1d5db'}>✕</button>
                  </div>
                ))}
              </div>
              {cart.length>0 && (
                <div style={{ padding:'16px', borderTop:'1px solid #f0f2f7', background:'white' }}>
                  <div style={{ marginBottom:'12px' }}>
                    {[{label:'Subtotal',value:`€${cartSubtotal.toFixed(2)}`},{label:'IVA',value:`€${cartIva.toFixed(2)}`}].map(r => (
                      <div key={r.label} style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}><span style={{ fontSize:'13px', color:'#6b7280' }}>{r.label}</span><span style={{ fontSize:'13px', color:'#374151' }}>{r.value}</span></div>
                    ))}
                    <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderTop:'2px solid #0B1426', marginTop:'8px' }}>
                      <span style={{ fontSize:'16px', fontWeight:'800', color:NAVY }}>TOTAL</span>
                      <span style={{ fontSize:'22px', fontWeight:'800', color:NAVY }}>€{cartTotal.toFixed(2)}</span>
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'6px', marginBottom:'12px' }}>
                    {PAYMENT_METHODS.map(pm => (
                      <button key={pm.key} onClick={()=>setPaymentMethod(pm.key)} style={{ padding:'8px 4px', borderRadius:'9px', border:`1.5px solid ${paymentMethod===pm.key?NAVY:'#e5e9f0'}`, background:paymentMethod===pm.key?NAVY:'white', color:paymentMethod===pm.key?'white':'#374151', fontSize:'11px', fontWeight:'700', cursor:'pointer', fontFamily:"'DM Sans', system-ui", textAlign:'center', transition:'all 0.15s' }}>
                        <div style={{ fontSize:'17px', marginBottom:'2px' }}>{pm.icon}</div>{pm.label}
                      </button>
                    ))}
                  </div>
                  <button onClick={processSale} disabled={processingPayment} style={{ width:'100%', padding:'15px', borderRadius:'12px', border:'none', background:processingPayment?'#e5e9f0':GREEN, color:processingPayment?'#9ca3af':'white', fontWeight:'800', fontSize:'17px', cursor:processingPayment?'not-allowed':'pointer', fontFamily:"'DM Sans', system-ui", letterSpacing:'-0.3px', transition:'all 0.15s' }}>
                    {processingPayment?'Procesando...': `✓ Cobrar €${cartTotal.toFixed(2)}`}
                  </button>
                </div>
              )}
            </div>

            {/* Dashboard right */}
            <div style={{ overflowY:'auto', padding:'24px' }}>
              {saleSuccess && (
                <div style={{ ...card, padding:'18px 20px', marginBottom:'20px', borderLeft:`4px solid ${GREEN}`, animation:'fadeUp 0.3s ease', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div><div style={{ fontSize:'14px', fontWeight:'700', color:GREEN, marginBottom:'3px' }}>✓ Venta registrada correctamente</div><div style={{ fontSize:'13px', color:'#374151' }}>Total: <strong>€{saleSuccess.total?.toFixed(2)}</strong> · {saleSuccess.payment_method} · {saleSuccess.items?.length} productos</div></div>
                  <button onClick={()=>setSaleSuccess(null)} style={{ background:'none', border:'none', color:'#9ca3af', cursor:'pointer', fontSize:'18px' }}>×</button>
                </div>
              )}
              {dashboard && (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px', marginBottom:'20px' }}>
                    {[
                      {label:'Ventas hoy',   value:dashboard.today?.total_sales,                                    color:NAVY,  bg:'white'  },
                      {label:'Ingresos hoy', value:`€${(dashboard.today?.total_revenue||0).toFixed(2)}`,            color:GREEN, bg:'#f0fdf4'},
                      {label:'IVA hoy',      value:`€${(dashboard.today?.total_iva||0).toFixed(2)}`,                color:AMBER, bg:'#fffbeb'},
                    ].map(s => (
                      <div key={s.label} style={{ ...card, padding:'16px', background:s.bg, textAlign:'center' }}>
                        <div style={{ fontSize:'22px', fontWeight:'800', color:s.color, letterSpacing:'-0.5px' }}>{s.value}</div>
                        <div style={{ fontSize:'11px', color:'#6b7280', marginTop:'3px' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {dashboard.low_stock_alerts?.length>0 && (
                    <div style={{ ...card, padding:'16px', marginBottom:'16px', borderLeft:`3px solid ${AMBER}` }}>
                      <div style={{ fontSize:'11px', fontWeight:'800', color:AMBER, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'10px' }}>⚠ Stock bajo</div>
                      {dashboard.low_stock_alerts.map(p => (
                        <div key={p.id} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #f0f2f7', fontSize:'13px' }}>
                          <span style={{ color:NAVY, fontWeight:'500' }}>{p.name}</span>
                          <span style={{ color:p.stock<=0?RED:AMBER, fontWeight:'700' }}>{p.stock} uds</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {dashboard.best_sellers?.length>0 && (
                    <div style={{ ...card, padding:'16px', marginBottom:'16px' }}>
                      <div style={{ fontSize:'13px', fontWeight:'700', color:NAVY, marginBottom:'12px' }}>🏆 Más vendidos este mes</div>
                      {dashboard.best_sellers.map((p,i) => (
                        <div key={p.product_id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 0', borderBottom:i<dashboard.best_sellers.length-1?'1px solid #f0f2f7':'none' }}>
                          <div style={{ width:'24px', height:'24px', borderRadius:'50%', background:i===0?'#ffd700':i===1?'#c0c0c0':'#cd7f32', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:'800', color:'white', flexShrink:0 }}>{i+1}</div>
                          <div style={{ flex:1 }}><div style={{ fontSize:'13px', fontWeight:'600', color:NAVY }}>{p.name}</div><div style={{ fontSize:'11px', color:'#9ca3af' }}>{p.units_sold} uds vendidas</div></div>
                          <div style={{ fontSize:'13px', fontWeight:'700', color:GREEN }}>€{p.revenue.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {dashboard.daily_revenue?.length>0 && (
                    <div style={{ ...card, padding:'20px' }}>
                      <div style={{ fontSize:'13px', fontWeight:'700', color:NAVY, marginBottom:'16px' }}>Ingresos últimos 14 días</div>
                      <div style={{ display:'flex', alignItems:'flex-end', gap:'4px', height:'80px' }}>
                        {dashboard.daily_revenue.map((d,i) => {
                          const maxVal = Math.max(...dashboard.daily_revenue.map(x=>x.revenue),1)
                          const h = Math.max((d.revenue/maxVal)*68, d.revenue>0?4:0)
                          const isToday = i===dashboard.daily_revenue.length-1
                          return (
                            <div key={d.date} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
                              <div style={{ width:'100%', background:isToday?CYAN:NAVY, borderRadius:'3px 3px 0 0', height:`${h}px`, opacity:isToday?1:0.4+(i/14)*0.6, transition:'height 0.6s ease' }}/>
                              <div style={{ fontSize:'8px', color:'#9ca3af', transform:'rotate(-45deg)', transformOrigin:'center', whiteSpace:'nowrap' }}>{d.label}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* PRODUCTOS */}
        {tab==='productos' && (
          <div style={{ flex:1, overflowY:'auto', padding:'28px 32px' }}>
            <div style={{ marginBottom:'16px' }}>
              <input value={productSearch} onChange={e=>setProductSearch(e.target.value)} placeholder="Buscar por nombre, categoría o código Nexum..."
                style={{ width:'100%', padding:'11px 14px', borderRadius:'10px', border:'1.5px solid #e5e9f0', fontSize:'13px', fontFamily:"'DM Sans', system-ui", outline:'none' }}
                onFocus={e=>e.target.style.borderColor=NAVY} onBlur={e=>e.target.style.borderColor='#e5e9f0'}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'20px' }}>
              {[
                {label:'Total productos',  value:products.length,                                                          color:NAVY,  bg:'white'  },
                {label:'Ingresos totales', value:`€${products.reduce((a,p)=>a+(p.total_revenue||0),0).toLocaleString('es-ES',{minimumFractionDigits:0})}`, color:GREEN, bg:'#f0fdf4'},
                {label:'Stock bajo',       value:products.filter(p=>p.stock_status!=='ok').length,                          color:AMBER, bg:'#fffbeb'},
                {label:'Sin stock',        value:products.filter(p=>p.stock_status==='sin_stock').length,                   color:RED,   bg:'#fef2f2'},
              ].map(s => (
                <div key={s.label} style={{ background:s.bg, borderRadius:'12px', border:'1px solid #e5e9f0', padding:'16px', textAlign:'center' }}>
                  <div style={{ fontSize:'22px', fontWeight:'800', color:s.color, letterSpacing:'-0.5px' }}>{s.value}</div>
                  <div style={{ fontSize:'11px', color:'#6b7280', marginTop:'3px' }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ ...card, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:NAVY }}>
                    {['Producto','Código Nexum','Precio','Margen','Stock','Vendidos/mes','Ingresos','Último venta',''].map(h => (
                      <th key={h} style={{ padding:'11px 12px', textAlign:'left', fontSize:'10px', fontWeight:'700', color:'white', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {productsLoading ? <tr><td colSpan="9" style={{ padding:'40px', textAlign:'center', color:'#9ca3af' }}>Cargando...</td></tr>
                  : filteredProducts.length===0 ? <tr><td colSpan="9" style={{ padding:'48px', textAlign:'center' }}><div style={{ fontSize:'36px', marginBottom:'12px', opacity:0.3 }}>📦</div><div style={{ fontSize:'13px', color:'#6b7280' }}>No hay productos. Crea el primero.</div></td></tr>
                  : filteredProducts.map((p,i) => {
                    const stock = STOCK_CFG[p.stock_status]||STOCK_CFG.ok
                    return (
                      <tr key={p.id} style={{ borderBottom:'1px solid #f0f2f7', background:i%2===0?'white':'#fafafa' }} onMouseEnter={e=>e.currentTarget.style.background='#f4f6fb'} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'white':'#fafafa'}>
                        <td style={{ padding:'11px 12px' }}><div style={{ fontSize:'13px', fontWeight:'600', color:NAVY }}>{p.name}</div><div style={{ fontSize:'11px', color:'#9ca3af' }}>{p.category||'—'}</div></td>
                        <td style={{ padding:'11px 12px' }}><span style={{ fontSize:'11px', fontFamily:'monospace', fontWeight:'700', color:CYAN, background:NAVY, padding:'3px 8px', borderRadius:'5px' }}>{p.nexum_code}</span></td>
                        <td style={{ padding:'11px 12px' }}><div style={{ fontSize:'13px', fontWeight:'700', color:NAVY }}>€{(p.sale_price*(1+p.iva_rate/100)).toFixed(2)}</div><div style={{ fontSize:'10px', color:'#9ca3af' }}>s/IVA €{p.sale_price?.toFixed(2)}</div></td>
                        <td style={{ padding:'11px 12px', fontSize:'13px', fontWeight:'700', color:(p.margin_pct||0)>30?GREEN:(p.margin_pct||0)>0?AMBER:RED }}>{(p.margin_pct||0).toFixed(1)}%</td>
                        <td style={{ padding:'11px 12px' }}><span style={{ fontSize:'11px', fontWeight:'700', color:stock.color, background:stock.bg, padding:'3px 8px', borderRadius:'5px' }}>{p.stock_quantity} uds</span></td>
                        <td style={{ padding:'11px 12px', fontSize:'13px', fontWeight:'600', color:NAVY }}>{p.month_units_sold||0}</td>
                        <td style={{ padding:'11px 12px', fontSize:'13px', fontWeight:'700', color:GREEN }}>€{(p.total_revenue||0).toFixed(0)}</td>
                        <td style={{ padding:'11px 12px', fontSize:'12px', color:'#9ca3af' }}>{p.last_sale_date||'—'}</td>
                        <td style={{ padding:'11px 12px' }}>
                          <div style={{ display:'flex', gap:'6px' }}>
                            <button onClick={()=>setSelectedProduct(p)} title="Ver código QR" style={{ padding:'5px 10px', borderRadius:'6px', border:'1px solid #e5e9f0', background:'#111827', color:CYAN, fontSize:'11px', fontWeight:'700', cursor:'pointer', fontFamily:"'DM Sans', system-ui" }}>QR</button>
                            <button onClick={()=>{addToCart(p);setTab('pos')}} title="Añadir al carrito" style={{ padding:'5px 10px', borderRadius:'6px', border:'none', background:NAVY, color:'white', fontSize:'11px', fontWeight:'700', cursor:'pointer', fontFamily:"'DM Sans', system-ui" }}>+</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* HISTORIAL */}
        {tab==='historial' && (
          <div style={{ flex:1, overflowY:'auto', padding:'28px 32px' }}>
            {dashboard && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'20px', animation:'fadeUp 0.3s ease' }}>
                {[
                  {label:'Hoy',         value:`€${(dashboard.today?.total_revenue||0).toFixed(2)}`,  sub:`${dashboard.today?.total_sales||0} ventas`,  color:NAVY  },
                  {label:'Esta semana', value:`€${(dashboard.week?.total_revenue||0).toFixed(2)}`,   sub:`${dashboard.week?.total_sales||0} ventas`,   color:BLUE  },
                  {label:'Este mes',    value:`€${(dashboard.month?.total_revenue||0).toFixed(2)}`,  sub:`${dashboard.month?.total_sales||0} ventas`,  color:GREEN },
                  {label:'Métodos',     value:Object.keys(dashboard.payment_breakdown||{}).length,   sub:'tipos distintos',                             color:AMBER },
                ].map(s => (
                  <div key={s.label} style={{ ...card, padding:'16px', textAlign:'center' }}>
                    <div style={{ fontSize:'22px', fontWeight:'800', color:s.color, letterSpacing:'-0.5px' }}>{s.value}</div>
                    <div style={{ fontSize:'11px', color:'#6b7280', marginTop:'2px' }}>{s.label}</div>
                    <div style={{ fontSize:'11px', color:'#9ca3af' }}>{s.sub}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ ...card, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:NAVY }}>
                    {['Fecha','Hora','Productos','Método pago','Subtotal','IVA','Total'].map(h => (
                      <th key={h} style={{ padding:'11px 14px', textAlign:'left', fontSize:'11px', fontWeight:'700', color:'white', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historyLoading ? <tr><td colSpan="7" style={{ padding:'40px', textAlign:'center', color:'#9ca3af' }}>Cargando...</td></tr>
                  : history.length===0 ? <tr><td colSpan="7" style={{ padding:'48px', textAlign:'center' }}><div style={{ fontSize:'36px', marginBottom:'12px', opacity:0.3 }}>🧾</div><div style={{ fontSize:'13px', color:'#6b7280' }}>No hay ventas registradas aún</div></td></tr>
                  : history.map((s,i) => (
                    <tr key={s.id} style={{ borderBottom:'1px solid #f0f2f7', background:i%2===0?'white':'#fafafa' }} onMouseEnter={e=>e.currentTarget.style.background='#f4f6fb'} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'white':'#fafafa'}>
                      <td style={{ padding:'11px 14px', fontSize:'13px', color:NAVY, fontWeight:'500' }}>{s.sale_date}</td>
                      <td style={{ padding:'11px 14px', fontSize:'13px', color:'#6b7280' }}>{s.sale_time||'—'}</td>
                      <td style={{ padding:'11px 14px' }}>
                        <div style={{ fontSize:'12px', color:'#374151' }}>{s.items?.map(item=>`${item.product_name} ×${item.quantity}`).join(', ').substring(0,60)}{s.items?.length>2&&'...'}</div>
                        <div style={{ fontSize:'11px', color:'#9ca3af' }}>{s.items?.length} producto{s.items?.length!==1?'s':''}</div>
                      </td>
                      <td style={{ padding:'11px 14px' }}>
                        <span style={{ fontSize:'11px', fontWeight:'600', color:NAVY, background:'#f4f6fb', padding:'3px 8px', borderRadius:'5px' }}>
                          {PAYMENT_METHODS.find(p=>p.key===s.payment_method)?.icon} {s.payment_method}
                        </span>
                      </td>
                      <td style={{ padding:'11px 14px', fontSize:'13px', color:'#374151' }}>€{s.subtotal?.toFixed(2)}</td>
                      <td style={{ padding:'11px 14px', fontSize:'13px', color:'#6b7280' }}>€{s.iva_amount?.toFixed(2)}</td>
                      <td style={{ padding:'11px 14px', fontSize:'15px', fontWeight:'800', color:NAVY }}>€{s.total?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showAddProduct && token && <AddProductModal token={token} onClose={()=>setShowAddProduct(false)} onCreated={()=>{setShowAddProduct(false);loadProducts();if(tab==='pos')loadDashboard()}}/>}
      {selectedProduct && token && <QRModal product={selectedProduct} token={token} onClose={()=>setSelectedProduct(null)}/>}
    </div>
  )
}