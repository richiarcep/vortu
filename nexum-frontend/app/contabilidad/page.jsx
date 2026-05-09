'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const NAVY  = '#0B1426'
const GREEN = '#16a34a'
const RED   = '#dc2626'
const AMBER = '#d97706'
const BLUE  = '#2563eb'
const CYAN  = '#00B4D8'

const card       = { background: 'white', borderRadius: '14px', border: '1px solid #e5e9f0' }
const input      = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #e5e9f0', fontSize: '13px', color: '#1f2937', fontFamily: "'DM Sans', system-ui, sans-serif", outline: 'none', background: 'white' }
const btnPrimary = { padding: '10px 20px', borderRadius: '9px', border: 'none', background: NAVY, color: 'white', fontWeight: '600', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }
const btnSecondary = { padding: '9px 18px', borderRadius: '9px', border: '1px solid #e5e9f0', background: 'white', color: NAVY, fontWeight: '600', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }
const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '5px' }

import Sidebar from '@/components/Sidebar'

// ── Notification Center ────────────────────────────────────────────────────────
function NotificationCenter({ token }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const ref = useRef()
  const router = useRouter()

  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => { if (token) loadNotifications() }, [token])

  async function loadNotifications() {
    setLoading(true)
    const notifs = []
    try {
      const [inboxRes, projectsRes, stockRes] = await Promise.allSettled([
        fetch(`http://127.0.0.1:8000/api/clientes/inbox`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`http://127.0.0.1:8000/api/proyectos/resumen`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`http://127.0.0.1:8000/api/ventas/alertas/stock`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (inboxRes.status === 'fulfilled' && inboxRes.value.ok) {
        const d = await inboxRes.value.json()
        if (d.requires_human > 0) notifs.push({ id: 'msg-1', type: 'urgent', icon: '💬', title: `${d.requires_human} mensaje${d.requires_human > 1 ? 's' : ''} requiere atención`, desc: 'Un cliente necesita respuesta humana', href: '/clientes', time: 'Ahora' })
        if (d.pending > 0) notifs.push({ id: 'msg-2', type: 'info', icon: '📬', title: `${d.pending} mensaje${d.pending > 1 ? 's' : ''} pendiente${d.pending > 1 ? 's' : ''}`, desc: 'Revisa la bandeja de entrada', href: '/clientes', time: 'Hoy' })
      }
      if (projectsRes.status === 'fulfilled' && projectsRes.value.ok) {
        const d = await projectsRes.value.json()
        if (d.at_risk > 0) notifs.push({ id: 'proj-1', type: 'warning', icon: '📋', title: `${d.at_risk} proyecto${d.at_risk > 1 ? 's' : ''} en riesgo`, desc: 'Health score bajo', href: '/proyectos', time: 'Hoy' })
      }
      if (stockRes.status === 'fulfilled' && stockRes.value.ok) {
        const d = await stockRes.value.json()
        if (d.total > 0) notifs.push({ id: 'stock-1', type: 'warning', icon: '📦', title: `${d.total} producto${d.total > 1 ? 's' : ''} con stock bajo`, desc: 'Reabastece antes de quedarte sin stock', href: '/ventas', time: 'Hoy' })
      }
    } catch { }
    setNotifications(notifs)
    setLoading(false)
  }

  const unread = notifications.length
  const TYPE_CFG = {
    urgent:  { color: RED,   bg: '#fef2f2', dot: RED   },
    warning: { color: AMBER, bg: '#fffbeb', dot: AMBER },
    info:    { color: BLUE,  bg: '#eff6ff', dot: BLUE  },
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{ position: 'relative', width: '38px', height: '38px', borderRadius: '10px', border: '1px solid #e5e9f0', background: open ? '#f4f6fb' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '18px', height: '18px', borderRadius: '50%', background: RED, color: 'white', fontSize: '10px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '46px', right: 0, width: '360px', background: 'white', borderRadius: '16px', border: '1px solid #e5e9f0', boxShadow: '0 16px 48px rgba(0,0,0,0.12)', zIndex: 200, overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid #f0f2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY }}>Notificaciones</div>
            {unread > 0 && <span style={{ fontSize: '11px', fontWeight: '700', color: 'white', background: RED, padding: '2px 8px', borderRadius: '10px' }}>{unread} nueva{unread > 1 ? 's' : ''}</span>}
          </div>
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>Cargando...</div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', marginBottom: '10px', opacity: 0.3 }}>🔔</div>
                <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>Todo en orden</div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>No hay notificaciones activas</div>
              </div>
            ) : notifications.map((n, i) => {
              const cfg = TYPE_CFG[n.type] || TYPE_CFG.info
              return (
                <div key={n.id} onClick={() => { router.push(n.href); setOpen(false) }}
                  style={{ padding: '13px 18px', borderBottom: i < notifications.length - 1 ? '1px solid #f8f9fc' : 'none', cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'flex-start', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>{n.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: NAVY, marginBottom: '2px' }}>{n.title}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{n.desc}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />{n.time}
                    </div>
                  </div>
                  <span style={{ fontSize: '16px', color: '#d1d5db' }}>›</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Profile Button ─────────────────────────────────────────────────────────────
function ProfileButton({ user }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  const router = useRouter()
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : 'US'
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 10px 5px 5px', borderRadius: '10px', border: '1px solid #e5e9f0', background: open ? '#f4f6fb' : 'white', cursor: 'pointer', transition: 'all 0.15s' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '11px', fontWeight: '800' }}>{initials}</div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: NAVY, lineHeight: 1.2 }}>{user?.name?.split(' ')[0] || 'Usuario'}</div>
          <div style={{ fontSize: '10px', color: '#9ca3af', lineHeight: 1.2 }}>Pro</div>
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: '#9ca3af' }}><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '46px', right: 0, width: '240px', background: 'white', borderRadius: '14px', border: '1px solid #e5e9f0', boxShadow: '0 16px 48px rgba(0,0,0,0.12)', zIndex: 200, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f2f7', background: '#fafafa', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px', fontWeight: '800' }}>{initials}</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: NAVY }}>{user?.name || 'Usuario'}</div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>{user?.email || ''}</div>
            </div>
          </div>
          <div style={{ padding: '6px 0' }}>
            {[
              { icon: '👤', label: 'Mi perfil',     action: () => {} },
              { icon: '💳', label: 'Suscripción',   action: () => router.push('/settings?tab=subscription') },
              { icon: '⚙️', label: 'Configuración', action: () => router.push('/settings') },
            ].map((item, i) => (
              <button key={i} onClick={() => { item.action(); setOpen(false) }} style={{ width: '100%', padding: '9px 16px', display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <span style={{ fontSize: '15px' }}>{item.icon}</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: NAVY }}>{item.label}</span>
              </button>
            ))}
          </div>
          <div style={{ padding: '8px 12px 12px', borderTop: '1px solid #f0f2f7' }}>
            <button onClick={() => { localStorage.removeItem('nexum_token'); router.push('/login') }} style={{ width: '100%', padding: '8px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: RED, fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Cerrar sesión</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Settings Button ────────────────────────────────────────────────────────────
function SettingsButton() {
  const router = useRouter()
  return (
    <button onClick={() => router.push('/settings')} style={{ width: '38px', height: '38px', borderRadius: '10px', border: '1px solid #e5e9f0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.background = '#f4f6fb'}
      onMouseLeave={e => e.currentTarget.style.background = 'white'}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    </button>
  )
}

function Msg({ msg }) {
  if (!msg) return null
  return (
    <div style={{ padding: '10px 14px', background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${msg.type === 'success' ? '#bbf7d0' : '#fecaca'}`, borderRadius: '8px', color: msg.type === 'success' ? GREEN : RED, fontSize: '13px', marginBottom: '14px' }}>
      {msg.text}
    </div>
  )
}

export default function Contabilidad() {
  const router = useRouter()
  const [section, setSection] = useState('registro')
  const [tab, setTab] = useState('ingreso')
  const [mode, setMode] = useState('manual')
  const [form, setForm] = useState({ fecha: new Date().toISOString().split('T')[0], categoria: '', descripcion: '', monto: '', referencia: '' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const [registro, setRegistro] = useState(null)
  const [pdfFile, setPdfFile] = useState(null)
  const [pdfResult, setPdfResult] = useState(null)
  const [plantillaConfig, setPlantillaConfig] = useState({ tipo_negocio: 'mixto', fecha: new Date().toISOString().split('T')[0] })
  const [estados, setEstados] = useState(null)
  const [estadosPeriodo, setEstadosPeriodo] = useState({ inicio: new Date().toISOString().split('T')[0].substring(0, 8) + '01', fin: new Date().toISOString().split('T')[0] })
  const [ledger, setLedger] = useState(null)
  const [balanza, setBalanza] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [downloadingReport, setDownloadingReport] = useState(null)
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)

  const getToken = () => localStorage.getItem('nexum_token')

  const categoriasIngreso = [
    { clave: 'ventas', nombre: 'Ventas' },
    { clave: 'servicios', nombre: 'Servicios' },
    { clave: 'otros_ingresos', nombre: 'Otros Ingresos' },
    { clave: 'intereses', nombre: 'Intereses' },
  ]
  const categoriasGasto = [
    { clave: 'nomina', nombre: 'Nómina' },
    { clave: 'alquiler', nombre: 'Alquiler' },
    { clave: 'marketing', nombre: 'Marketing' },
    { clave: 'suministros', nombre: 'Suministros' },
    { clave: 'software', nombre: 'Software' },
    { clave: 'servicios_basicos', nombre: 'Servicios Básicos' },
    { clave: 'servicios_profesionales', nombre: 'Servicios Profesionales' },
    { clave: 'impuestos', nombre: 'Impuestos' },
    { clave: 'otros_gastos', nombre: 'Otros Gastos' },
  ]

  useEffect(() => {
    const t = getToken()
    if (!t) { router.push('/login'); return }
    setToken(t)
    try {
      const payload = JSON.parse(atob(t.split('.')[1]))
      setUser({ email: payload.sub || '', name: payload.name || payload.sub || 'Usuario' })
    } catch { setUser({ email: '', name: 'Usuario' }) }
    loadRegistro()
  }, [])

  function loadRegistro() {
    const today = new Date().toISOString().split('T')[0]
    const monthStart = today.substring(0, 8) + '01'
    fetch(`http://127.0.0.1:8000/api/contabilidad/registro?fecha_inicio=${monthStart}&fecha_fin=${today}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json()).then(setRegistro)
  }

  async function submitManual(e) {
    e.preventDefault()
    setLoading(true); setMsg(null)
    const endpoint = tab === 'ingreso' ? '/api/contabilidad/ingresos' : '/api/contabilidad/gastos'
    const res = await fetch(`http://127.0.0.1:8000${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ ...form, monto: parseFloat(form.monto) })
    })
    const data = await res.json()
    if (res.ok) {
      setMsg({ type: 'success', text: `✓ ${data.mensaje} · Asiento: ${data.asiento_contable}` })
      setForm({ fecha: new Date().toISOString().split('T')[0], categoria: '', descripcion: '', monto: '', referencia: '' })
      loadRegistro()
    } else {
      setMsg({ type: 'error', text: data.detail || 'Error al registrar' })
    }
    setLoading(false)
  }

  async function submitPDF(e) {
    e.preventDefault()
    if (!pdfFile) return
    setLoading(true); setMsg(null); setPdfResult(null)
    const formData = new FormData()
    formData.append('file', pdfFile)
    formData.append('auto_registrar', 'true')
    const res = await fetch('http://127.0.0.1:8000/api/contabilidad/leer-pdf', { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: formData })
    const data = await res.json()
    if (res.ok) {
      setPdfResult(data)
      setMsg({ type: 'success', text: `✓ ${data.total_registradas} transacciones registradas automáticamente` })
      loadRegistro()
    } else {
      setMsg({ type: 'error', text: data.detail || 'Error procesando el PDF' })
    }
    setLoading(false)
  }

  async function downloadPlantilla() {
    setLoading(true)
    const res = await fetch(`http://127.0.0.1:8000/api/contabilidad/plantilla?fecha=${plantillaConfig.fecha}&tipo_negocio=${plantillaConfig.tipo_negocio}`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } })
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `cierre_caja_${plantillaConfig.fecha}.pdf`; a.click()
      setMsg({ type: 'success', text: '✓ Plantilla descargada. Rellénala y súbela por PDF.' })
    } else {
      setMsg({ type: 'error', text: 'Error generando la plantilla' })
    }
    setLoading(false)
  }

  async function loadEstados() {
    setLoading(true)
    const res = await fetch(`http://127.0.0.1:8000/api/contabilidad/estados-financieros?fecha_inicio=${estadosPeriodo.inicio}&fecha_fin=${estadosPeriodo.fin}`, { headers: { Authorization: `Bearer ${getToken()}` } })
    setEstados(await res.json()); setLoading(false)
  }

  async function loadLedger() {
    setLoading(true)
    const res = await fetch('http://127.0.0.1:8000/api/contabilidad/libro-mayor', { headers: { Authorization: `Bearer ${getToken()}` } })
    setLedger(await res.json()); setLoading(false)
  }

  async function loadBalanza() {
    setLoading(true)
    const res = await fetch('http://127.0.0.1:8000/api/contabilidad/balance-comprobacion', { headers: { Authorization: `Bearer ${getToken()}` } })
    setBalanza(await res.json()); setLoading(false)
  }

  async function downloadReport(type) {
    setDownloadingReport(type)
    const urls = {
      pl:      `http://127.0.0.1:8000/api/contabilidad/reporte/estado-resultados?fecha_inicio=${estadosPeriodo.inicio}&fecha_fin=${estadosPeriodo.fin}`,
      balance: `http://127.0.0.1:8000/api/contabilidad/reporte/balance-general?fecha=${estadosPeriodo.fin}`,
      flujo:   `http://127.0.0.1:8000/api/contabilidad/reporte/flujo-efectivo?fecha_inicio=${estadosPeriodo.inicio}&fecha_fin=${estadosPeriodo.fin}`,
    }
    const names = { pl: `estado_resultados_${estadosPeriodo.fin}.pdf`, balance: `balance_general_${estadosPeriodo.fin}.pdf`, flujo: `flujo_efectivo_${estadosPeriodo.fin}.pdf` }
    const res = await fetch(urls[type], { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } })
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = names[type]; a.click()
    }
    setDownloadingReport(null)
  }

  const categorias = tab === 'ingreso' ? categoriasIngreso : categoriasGasto

  const sections = [
    { key: 'registro', label: 'Registro diario'         },
    { key: 'estados',  label: 'Estados financieros'     },
    { key: 'ledger',   label: 'Libro mayor'             },
    { key: 'balanza',  label: 'Balanza de comprobación' },
  ]

  const reportCards = [
    { key: 'pl',      title: 'Estado de Resultados', desc: 'Ingresos, gastos, EBITDA y margen', color: '#0F6E56', bg: '#E1F5EE', icon: '📊' },
    { key: 'balance', title: 'Balance General',       desc: 'Activos, pasivos, patrimonio',     color: '#185FA5', bg: '#E6F1FB', icon: '⚖️'  },
    { key: 'flujo',   title: 'Flujo de Efectivo',     desc: 'Operativo, inversión, financiamiento', color: '#854F0B', bg: '#FAEEDA', icon: '💰' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6fb', display: 'flex', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;}
        input:focus,select:focus,textarea:focus{border-color:#0B1426!important;outline:none;}
        ::-webkit-scrollbar{width:5px;} ::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:3px;}
      `}</style>

      <Sidebar active="/contabilidad" />

      {/* DOWNLOAD MODAL */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }} onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '580px', boxShadow: '0 24px 64px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: NAVY, marginBottom: '4px' }}>Descargar reportes financieros</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Período: {estadosPeriodo.inicio} — {estadosPeriodo.fin}</div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#9ca3af' }}>✕</button>
            </div>
            <div style={{ padding: '12px 14px', background: '#f8faff', borderRadius: '8px', marginBottom: '20px', marginTop: '16px', border: '1px solid #e5e9f0' }}>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>⚡ Cada reporte incluye <strong>2 páginas</strong>: datos financieros completos + análisis IA con KPIs, fortalezas, riesgos y plan de acción. La generación toma 10-20 segundos.</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {reportCards.map(report => (
                <div key={report.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: report.bg, borderRadius: '12px', border: `1.5px solid ${report.color}40` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '28px' }}>{report.icon}</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: report.color, marginBottom: '2px' }}>{report.title}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{report.desc}</div>
                    </div>
                  </div>
                  <button onClick={() => downloadReport(report.key)} disabled={downloadingReport === report.key}
                    style={{ padding: '9px 18px', background: downloadingReport === report.key ? '#d1d5db' : report.color, color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, marginLeft: '12px', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                    {downloadingReport === report.key ? '⏳ Generando...' : '⬇ Descargar'}
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setShowModal(false)} style={{ ...btnSecondary, width: '100%', padding: '10px' }}>Cerrar</button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── TOP BAR ── */}
        <div style={{ background: 'white', borderBottom: '1px solid #e5e9f0', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px', flexShrink: 0 }}>
          {/* Left: title + tabs */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ paddingRight: '24px', marginRight: '8px', borderRight: '1px solid #f0f2f7' }}>
              <div style={{ fontSize: '16px', fontWeight: '800', color: NAVY, letterSpacing: '-0.4px' }}>📒 Contabilidad</div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>Partida doble · PGC español</div>
            </div>
            <div style={{ display: 'flex' }}>
              {sections.map(s => (
                <button key={s.key} onClick={() => { setSection(s.key); setMsg(null) }}
                  style={{ padding: '0 14px', height: '64px', background: 'none', border: 'none', borderBottom: section === s.key ? `2px solid ${NAVY}` : '2px solid transparent', color: section === s.key ? NAVY : '#6b7280', fontWeight: section === s.key ? '700' : '400', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          {/* Right: settings + notifications + profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <SettingsButton />
            <NotificationCenter token={token} />
            <ProfileButton user={user} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

          {/* ══ REGISTRO DIARIO ══ */}
          {section === 'registro' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
                {[
                  { key: 'manual',    label: '✏️ Manual',    desc: 'Registra una transacción'   },
                  { key: 'pdf',       label: '📄 Subir PDF', desc: 'Claude lee el documento'    },
                  { key: 'plantilla', label: '📋 Plantilla', desc: 'Cierre de caja oficial'     },
                ].map(m => (
                  <button key={m.key} onClick={() => { setMode(m.key); setMsg(null) }} style={{ padding: '16px', border: `1.5px solid ${mode === m.key ? NAVY : '#e5e9f0'}`, borderRadius: '12px', background: mode === m.key ? NAVY : 'white', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: mode === m.key ? 'white' : NAVY, marginBottom: '2px' }}>{m.label}</div>
                    <div style={{ fontSize: '12px', color: mode === m.key ? 'rgba(255,255,255,0.65)' : '#6b7280' }}>{m.desc}</div>
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ ...card, padding: '24px' }}>
                  {mode === 'manual' && (
                    <>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: NAVY, marginBottom: '16px' }}>Registro manual</div>
                      <div style={{ display: 'flex', marginBottom: '20px', background: '#f4f6fb', borderRadius: '8px', padding: '4px' }}>
                        {['ingreso', 'gasto'].map(t => (
                          <button key={t} onClick={() => { setTab(t); setForm({ ...form, categoria: '' }) }} style={{ flex: 1, padding: '8px', border: 'none', cursor: 'pointer', borderRadius: '6px', fontSize: '13px', fontWeight: '600', background: tab === t ? 'white' : 'transparent', color: tab === t ? NAVY : '#6b7280', boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                            {t === 'ingreso' ? '↑ Ingreso' : '↓ Gasto'}
                          </button>
                        ))}
                      </div>
                      <form onSubmit={submitManual}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                          <div><label style={labelStyle}>Fecha</label><input style={input} type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} required /></div>
                          <div><label style={labelStyle}>Monto €</label><input style={input} type="number" step="0.01" placeholder="0.00" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} required /></div>
                        </div>
                        <div style={{ marginBottom: '12px' }}><label style={labelStyle}>Categoría</label>
                          <select style={input} value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} required>
                            <option value="">Selecciona categoría</option>
                            {categorias.map(c => <option key={c.clave} value={c.clave}>{c.nombre}</option>)}
                          </select>
                        </div>
                        <div style={{ marginBottom: '12px' }}><label style={labelStyle}>Descripción</label><input style={input} type="text" placeholder="Describe la transacción..." value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} required /></div>
                        <div style={{ marginBottom: '18px' }}><label style={labelStyle}>Referencia (opcional)</label><input style={input} type="text" placeholder="Nº factura..." value={form.referencia} onChange={e => setForm({ ...form, referencia: e.target.value })} /></div>
                        <Msg msg={msg} />
                        <button style={{ ...btnPrimary, width: '100%', padding: '12px' }} type="submit" disabled={loading}>{loading ? 'Registrando...' : `Registrar ${tab}`}</button>
                      </form>
                    </>
                  )}

                  {mode === 'pdf' && (
                    <>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: NAVY, marginBottom: '6px' }}>Subir PDF para lectura IA</div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Claude lee cualquier PDF y extrae todas las transacciones automáticamente.</div>
                      <form onSubmit={submitPDF}>
                        <div style={{ border: `2px dashed ${pdfFile ? '#22c55e' : '#d1d5db'}`, borderRadius: '12px', padding: '32px', textAlign: 'center', marginBottom: '14px', background: pdfFile ? '#f0fdf4' : '#fafafa', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => document.getElementById('pdfInput').click()}>
                          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: NAVY, marginBottom: '4px' }}>{pdfFile ? pdfFile.name : 'Haz clic para seleccionar un PDF'}</div>
                          <div style={{ fontSize: '12px', color: '#9ca3af' }}>Estado de cuenta, factura, cierre de caja</div>
                          <input id="pdfInput" type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => setPdfFile(e.target.files[0])} />
                        </div>
                        <Msg msg={msg} />
                        <button style={{ ...btnPrimary, width: '100%', padding: '12px', opacity: !pdfFile ? 0.5 : 1, cursor: !pdfFile ? 'not-allowed' : 'pointer' }} type="submit" disabled={loading || !pdfFile}>
                          {loading ? 'Claude está leyendo...' : 'Procesar con IA'}
                        </button>
                      </form>
                      {pdfResult && (
                        <div style={{ marginTop: '14px', padding: '14px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: NAVY, marginBottom: '6px' }}>Resultado</div>
                          <div style={{ fontSize: '13px', color: '#374151' }}>✓ {pdfResult.total_registradas} transacciones registradas</div>
                          {pdfResult.total_errores > 0 && <div style={{ fontSize: '13px', color: AMBER }}>⚠ {pdfResult.total_errores} requieren revisión</div>}
                        </div>
                      )}
                    </>
                  )}

                  {mode === 'plantilla' && (
                    <>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: NAVY, marginBottom: '6px' }}>Plantilla oficial Vortu</div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Cierre de Caja Diario personalizado con QR cifrado.</div>
                      <div style={{ marginBottom: '12px' }}><label style={labelStyle}>Fecha del cierre</label><input style={input} type="date" value={plantillaConfig.fecha} onChange={e => setPlantillaConfig({ ...plantillaConfig, fecha: e.target.value })} /></div>
                      <div style={{ marginBottom: '18px' }}><label style={labelStyle}>Tipo de negocio</label>
                        <select style={input} value={plantillaConfig.tipo_negocio} onChange={e => setPlantillaConfig({ ...plantillaConfig, tipo_negocio: e.target.value })}>
                          <option value="mixto">Mixto</option>
                          <option value="restaurante">Restaurante / Bar</option>
                          <option value="tienda">Tienda / Comercio</option>
                          <option value="servicios">Servicios</option>
                        </select>
                      </div>
                      <div style={{ padding: '14px', background: '#f8faff', borderRadius: '10px', border: '1px solid #e5e9f0', marginBottom: '18px' }}>
                        {['Ventas por departamento con IVA', 'Propinas (restaurante)', 'Métodos de pago', 'Arqueo de caja', 'Resumen del día', 'Preguntas al Agente IA', 'QR con datos cifrados'].map((item, i) => (
                          <div key={i} style={{ fontSize: '12px', color: '#6b7280', marginBottom: '3px', display: 'flex', gap: '6px' }}>
                            <span style={{ color: GREEN, fontWeight: '700' }}>✓</span>{item}
                          </div>
                        ))}
                      </div>
                      <Msg msg={msg} />
                      <button style={{ ...btnPrimary, width: '100%', padding: '12px' }} onClick={downloadPlantilla} disabled={loading}>{loading ? 'Generando...' : '⬇ Descargar plantilla'}</button>
                      <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginTop: '10px' }}>Súbela rellena por "Subir PDF"</div>
                    </>
                  )}
                </div>

                <div style={{ ...card, padding: '24px' }}>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: NAVY, marginBottom: '4px' }}>Registro del mes</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>Transacciones registradas este mes</div>
                  {registro && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                        {[
                          { label: 'Ingresos', value: `€${registro.resumen?.total_ingresos || 0}`, color: GREEN },
                          { label: 'Gastos',   value: `€${registro.resumen?.total_gastos || 0}`,   color: RED   },
                          { label: 'Neto',     value: `€${registro.resumen?.resultado_neto || 0}`, color: registro.resumen?.es_positivo ? GREEN : RED },
                        ].map((s, i) => (
                          <div key={i} style={{ padding: '12px', background: '#f8faff', borderRadius: '8px', border: '1px solid #f0f2f7', textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>{s.label}</div>
                            <div style={{ fontSize: '16px', fontWeight: '800', color: s.color }}>{s.value}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                        {[...(registro.ingresos || []).map(r => ({ ...r, tipo: 'ingreso' })), ...(registro.gastos || []).map(r => ({ ...r, tipo: 'gasto' }))].sort((a, b) => b.fecha.localeCompare(a.fecha)).map((r, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f2f7' }}>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: NAVY }}>{r.descripcion}</div>
                              <div style={{ fontSize: '11px', color: '#9ca3af' }}>{r.fecha} · {r.categoria}</div>
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: r.tipo === 'ingreso' ? GREEN : RED }}>{r.tipo === 'ingreso' ? '+' : '-'}€{r.monto}</span>
                          </div>
                        ))}
                        {(registro.ingresos?.length || 0) + (registro.gastos?.length || 0) === 0 && (
                          <div style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#9ca3af' }}>Sin transacciones este mes</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ══ ESTADOS FINANCIEROS ══ */}
          {section === 'estados' && (
            <div>
              <div style={{ ...card, padding: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
                  <div><label style={labelStyle}>Desde</label><input style={{ ...input, width: '160px' }} type="date" value={estadosPeriodo.inicio} onChange={e => setEstadosPeriodo({ ...estadosPeriodo, inicio: e.target.value })} /></div>
                  <div><label style={labelStyle}>Hasta</label><input style={{ ...input, width: '160px' }} type="date" value={estadosPeriodo.fin} onChange={e => setEstadosPeriodo({ ...estadosPeriodo, fin: e.target.value })} /></div>
                  <button style={btnPrimary} onClick={loadEstados} disabled={loading}>{loading ? 'Generando...' : 'Generar estados financieros'}</button>
                  {estados && <button onClick={() => setShowModal(true)} style={{ ...btnPrimary, background: '#1a6b4a' }}>⬇ Descargar reportes PDF</button>}
                </div>
              </div>

              {estados && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ ...card, padding: '20px', gridColumn: '1/-1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: NAVY }}>Salud financiera</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '30px', fontWeight: '800', color: (estados.puntaje_salud_financiera?.puntaje || 0) >= 7 ? GREEN : (estados.puntaje_salud_financiera?.puntaje || 0) >= 5 ? AMBER : RED, letterSpacing: '-0.5px' }}>{estados.puntaje_salud_financiera?.puntaje}/10</span>
                        <span style={{ fontSize: '15px', fontWeight: '600', color: '#374151' }}>{estados.puntaje_salud_financiera?.calificacion}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {estados.puntaje_salud_financiera?.factores?.map((f, i) => (
                        <span key={i} style={{ padding: '4px 10px', background: '#f8faff', borderRadius: '20px', fontSize: '12px', color: '#374151', border: '1px solid #e5e9f0' }}>✓ {f}</span>
                      ))}
                    </div>
                  </div>

                  <div style={{ ...card, padding: '20px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY, marginBottom: '14px' }}>Estado de Resultados</div>
                    {estados.estado_de_resultados && (
                      <>
                        <div style={{ marginBottom: '14px' }}>
                          {[
                            { label: 'Total Ingresos', value: `€${estados.estado_de_resultados.ingresos?.total_ingresos || 0}`, color: GREEN },
                            { label: 'Total Gastos',   value: `€${estados.estado_de_resultados.gastos?.total_gastos || 0}`,     color: RED   },
                            { label: 'EBITDA',         value: `€${estados.estado_de_resultados.ebitda || 0}`,                   color: NAVY  },
                            { label: 'Utilidad Neta',  value: `€${estados.estado_de_resultados.utilidad_neta || 0}`,            color: estados.estado_de_resultados.es_rentable ? GREEN : RED },
                            { label: 'Margen',         value: `${estados.estado_de_resultados.margen_utilidad_porcentaje || 0}%`, color: '#374151' },
                          ].map((row, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f2f7' }}>
                              <span style={{ fontSize: '13px', color: '#6b7280' }}>{row.label}</span>
                              <span style={{ fontSize: '13px', fontWeight: '700', color: row.color }}>{row.value}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ padding: '12px', background: '#f8faff', borderRadius: '8px', border: '1px solid #e5e9f0' }}>
                          <div style={{ fontSize: '12px', color: '#374151', lineHeight: '1.6' }}>{estados.estado_de_resultados.analisis_ia}</div>
                        </div>
                      </>
                    )}
                  </div>

                  <div style={{ ...card, padding: '20px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY, marginBottom: '14px' }}>Balance General</div>
                    {estados.balance_general && (
                      <>
                        <div style={{ marginBottom: '14px' }}>
                          {[
                            { label: 'Total Activos',        value: `€${estados.balance_general.activos?.total_activos || 0}`,       color: NAVY  },
                            { label: 'Total Pasivos',        value: `€${estados.balance_general.pasivos?.total_pasivos || 0}`,        color: RED   },
                            { label: 'Total Patrimonio',     value: `€${estados.balance_general.patrimonio?.total_patrimonio || 0}`,  color: GREEN },
                            { label: 'Pasivos + Patrimonio', value: `€${estados.balance_general.total_pasivos_y_patrimonio || 0}`,    color: NAVY  },
                          ].map((row, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f2f7' }}>
                              <span style={{ fontSize: '13px', color: '#6b7280' }}>{row.label}</span>
                              <span style={{ fontSize: '13px', fontWeight: '700', color: row.color }}>{row.value}</span>
                            </div>
                          ))}
                        </div>
                        <span style={{ padding: '4px 10px', background: estados.balance_general.ecuacion_balanceada ? '#f0fdf4' : '#fef2f2', color: estados.balance_general.ecuacion_balanceada ? GREEN : RED, borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                          {estados.balance_general.ecuacion_balanceada ? '✓ Ecuación balanceada' : '✗ Ecuación no balanceada'}
                        </span>
                        <div style={{ padding: '12px', background: '#f8faff', borderRadius: '8px', border: '1px solid #e5e9f0', marginTop: '12px' }}>
                          <div style={{ fontSize: '12px', color: '#374151', lineHeight: '1.6' }}>{estados.balance_general.analisis_ia}</div>
                        </div>
                      </>
                    )}
                  </div>

                  <div style={{ ...card, padding: '20px', gridColumn: '1/-1' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY, marginBottom: '14px' }}>Flujo de Efectivo</div>
                    {estados.flujo_de_efectivo && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '14px' }}>
                        {[
                          { label: 'Flujo operativo',      value: `€${estados.flujo_de_efectivo.actividades_operativas?.flujo_operativo_neto || 0}`,         color: NAVY },
                          { label: 'Flujo inversión',      value: `€${estados.flujo_de_efectivo.actividades_inversion?.flujo_inversion_neto || 0}`,           color: NAVY },
                          { label: 'Flujo financiamiento', value: `€${estados.flujo_de_efectivo.actividades_financiamiento?.flujo_financiamiento_neto || 0}`, color: NAVY },
                          { label: 'Cambio neto efectivo', value: `€${estados.flujo_de_efectivo.cambio_neto_efectivo || 0}`,                                  color: estados.flujo_de_efectivo.posicion_efectivo === 'positiva' ? GREEN : RED },
                        ].map((s, i) => (
                          <div key={i} style={{ padding: '14px', background: '#f8faff', borderRadius: '10px', border: '1px solid #f0f2f7', textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '5px' }}>{s.label}</div>
                            <div style={{ fontSize: '17px', fontWeight: '800', color: s.color }}>{s.value}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {estados.flujo_de_efectivo?.analisis_ia && (
                      <div style={{ padding: '12px', background: '#f8faff', borderRadius: '8px', border: '1px solid #e5e9f0' }}>
                        <div style={{ fontSize: '12px', color: '#374151', lineHeight: '1.6' }}>{estados.flujo_de_efectivo.analisis_ia}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ LIBRO MAYOR ══ */}
          {section === 'ledger' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <button style={btnPrimary} onClick={loadLedger} disabled={loading}>{loading ? 'Cargando...' : 'Cargar libro mayor'}</button>
              </div>
              {ledger && ledger.ledger?.map((account, i) => (
                <div key={i} style={{ ...card, padding: '20px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <span style={{ fontSize: '12px', color: BLUE, fontWeight: '700', marginRight: '8px' }}>{account.account_code}</span>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: NAVY }}>{account.account_name}</span>
                      <span style={{ marginLeft: '8px', padding: '2px 8px', background: '#f8faff', borderRadius: '20px', fontSize: '11px', color: '#6b7280', border: '1px solid #e5e9f0' }}>{account.account_type}</span>
                    </div>
                    <span style={{ fontSize: '16px', fontWeight: '800', color: account.closing_balance >= 0 ? GREEN : RED }}>€{account.closing_balance?.toFixed(2)}</span>
                  </div>
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {account.entries?.map((entry, j) => (
                      <div key={j} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px 80px 100px', gap: '8px', padding: '6px 0', borderBottom: '1px solid #f0f2f7', fontSize: '12px' }}>
                        <span style={{ color: '#9ca3af' }}>{entry.date}</span>
                        <span style={{ color: '#374151' }}>{entry.description}</span>
                        <span style={{ color: GREEN, textAlign: 'right' }}>{entry.debit > 0 ? `€${entry.debit}` : ''}</span>
                        <span style={{ color: RED, textAlign: 'right' }}>{entry.credit > 0 ? `€${entry.credit}` : ''}</span>
                        <span style={{ color: NAVY, fontWeight: '600', textAlign: 'right' }}>€{entry.balance?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {ledger && ledger.ledger?.length === 0 && (
                <div style={{ ...card, padding: '48px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', marginBottom: '12px', opacity: 0.3 }}>📒</div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>No hay asientos contables registrados</div>
                </div>
              )}
            </div>
          )}

          {/* ══ BALANZA ══ */}
          {section === 'balanza' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <button style={btnPrimary} onClick={loadBalanza} disabled={loading}>{loading ? 'Cargando...' : 'Cargar balanza de comprobación'}</button>
              </div>
              {balanza && (
                <>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <span style={{ padding: '6px 14px', background: balanza.is_balanced ? '#f0fdf4' : '#fef2f2', color: balanza.is_balanced ? GREEN : RED, borderRadius: '20px', fontSize: '13px', fontWeight: '700', border: `1px solid ${balanza.is_balanced ? '#bbf7d0' : '#fecaca'}` }}>
                      {balanza.is_balanced ? '✓ Balanza cuadrada' : '✗ Balanza no cuadrada'}
                    </span>
                    <span style={{ padding: '6px 14px', background: '#f8faff', borderRadius: '20px', fontSize: '13px', color: '#374151', border: '1px solid #e5e9f0' }}>Total débitos: €{balanza.total_debits?.toFixed(2)}</span>
                    <span style={{ padding: '6px 14px', background: '#f8faff', borderRadius: '20px', fontSize: '13px', color: '#374151', border: '1px solid #e5e9f0' }}>Total créditos: €{balanza.total_credits?.toFixed(2)}</span>
                  </div>
                  <div style={{ ...card, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: NAVY }}>
                          {['Código', 'Cuenta', 'Tipo', 'Débito', 'Crédito'].map(h => (
                            <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {balanza.accounts?.map((acc, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f0f2f7', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                            <td style={{ padding: '10px 14px', fontSize: '12px', color: BLUE, fontWeight: '700' }}>{acc.code}</td>
                            <td style={{ padding: '10px 14px', fontSize: '13px', color: NAVY, fontWeight: '500' }}>{acc.name}</td>
                            <td style={{ padding: '10px 14px', fontSize: '12px', color: '#6b7280' }}>{acc.type}</td>
                            <td style={{ padding: '10px 14px', fontSize: '13px', color: GREEN, fontWeight: '600', textAlign: 'right' }}>{acc.debit > 0 ? `€${acc.debit?.toFixed(2)}` : ''}</td>
                            <td style={{ padding: '10px 14px', fontSize: '13px', color: RED, fontWeight: '600', textAlign: 'right' }}>{acc.credit > 0 ? `€${acc.credit?.toFixed(2)}` : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: NAVY }}>
                          <td colSpan="3" style={{ padding: '10px 14px', fontSize: '13px', fontWeight: '700', color: 'white' }}>TOTALES</td>
                          <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: '700', color: 'white', textAlign: 'right' }}>€{balanza.total_debits?.toFixed(2)}</td>
                          <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: '700', color: 'white', textAlign: 'right' }}>€{balanza.total_credits?.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}