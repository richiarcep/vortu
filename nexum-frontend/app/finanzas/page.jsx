'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

const API   = 'http://127.0.0.1:8000'
const NAVY  = '#0B1426'
const GREEN = '#16a34a'
const RED   = '#dc2626'
const AMBER = '#d97706'
const BLUE  = '#2563eb'
const CYAN  = '#00B4D8'

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
        fetch(`${API}/api/clientes/inbox`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/proyectos/resumen`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/ventas/alertas/stock`, { headers: { Authorization: `Bearer ${token}` } }),
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
  const TYPE_CFG = { urgent: { color: RED, bg: '#fef2f2', dot: RED }, warning: { color: AMBER, bg: '#fffbeb', dot: AMBER }, info: { color: BLUE, bg: '#eff6ff', dot: BLUE } }
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{ position: 'relative', width: '38px', height: '38px', borderRadius: '10px', border: '1px solid #e5e9f0', background: open ? '#f4f6fb' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        {unread > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '18px', height: '18px', borderRadius: '50%', background: RED, color: 'white', fontSize: '10px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '46px', right: 0, width: '360px', background: 'white', borderRadius: '16px', border: '1px solid #e5e9f0', boxShadow: '0 16px 48px rgba(0,0,0,0.12)', zIndex: 200, overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid #f0f2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY }}>Notificaciones</div>
            {unread > 0 && <span style={{ fontSize: '11px', fontWeight: '700', color: 'white', background: RED, padding: '2px 8px', borderRadius: '10px' }}>{unread} nueva{unread > 1 ? 's' : ''}</span>}
          </div>
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {loading ? <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>Cargando...</div>
            : notifications.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', marginBottom: '10px', opacity: 0.3 }}>🔔</div>
                <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>Todo en orden</div>
              </div>
            ) : notifications.map((n, i) => {
              const cfg = TYPE_CFG[n.type] || TYPE_CFG.info
              return (
                <div key={n.id} onClick={() => { router.push(n.href); setOpen(false) }}
                  style={{ padding: '13px 18px', borderBottom: i < notifications.length - 1 ? '1px solid #f8f9fc' : 'none', cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'flex-start' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>{n.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: NAVY, marginBottom: '2px' }}>{n.title}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{n.desc}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />{n.time}
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
      <button onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 10px 5px 5px', borderRadius: '10px', border: '1px solid #e5e9f0', background: 'white', cursor: 'pointer' }}>
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

function SettingsButton() {
  const router = useRouter()
  return (
    <button onClick={() => router.push('/settings')} style={{ width: '38px', height: '38px', borderRadius: '10px', border: '1px solid #e5e9f0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
      onMouseEnter={e => e.currentTarget.style.background = '#f4f6fb'}
      onMouseLeave={e => e.currentTarget.style.background = 'white'}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    </button>
  )
}

function MsgBox({ msg }) {
  if (!msg) return null
  return (
    <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px', background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${msg.type === 'success' ? '#bbf7d0' : '#fecaca'}`, color: msg.type === 'success' ? GREEN : RED }}>
      {msg.text}
    </div>
  )
}

// ── Custom tooltip for chart ───────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'white', border: '1px solid #e5e9f0', borderRadius: '10px', padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: '12px' }}>
      <div style={{ fontWeight: '700', color: NAVY, marginBottom: '6px' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: p.color, fontWeight: '600' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          {p.name}: {p.value >= 0 ? '+' : ''}€{(p.value || 0).toLocaleString('es-ES')}
        </div>
      ))}
    </div>
  )
}

// ── Health score ring ──────────────────────────────────────────────────────────
function HealthRing({ score = 0, size = 80 }) {
  const pct = Math.min(score / 10, 1)
  const r = size / 2 - 8
  const cx = size / 2, cy = size / 2
  const circ = 2 * Math.PI * r
  const color = score >= 7 ? GREEN : score >= 5 ? AMBER : RED
  return (
    <svg width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f2f7" strokeWidth="7" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dashoffset 1s ease' }} />
      <text x={cx} y={cy - 3} textAnchor="middle" dominantBaseline="middle" fontSize="16" fontWeight="800" fill={color}>{score || '—'}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="#9ca3af">/10</text>
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
  const [deepAnalysis, setDeepAnalysis] = useState(null)

  const [contextFiles, setContextFiles] = useState([])
  const [contextFile, setContextFile] = useState(null)
  const [proyecciones, setProyecciones] = useState(null)
  const [proyLoading, setProyLoading] = useState(false)

  const [ratios, setRatios] = useState(null)
  const [ratiosLoading, setRatiosLoading] = useState(false)

  const getToken = () => localStorage.getItem('nexum_token')

  useEffect(() => {
    const t = getToken()
    if (!t) { router.push('/login'); return }
    setToken(t)
    try {
      const payload = JSON.parse(atob(t.split('.')[1]))
      setUser({ email: payload.sub || '', name: payload.name || payload.sub || 'Usuario' })
    } catch { setUser({ email: '', name: 'Usuario' }) }
    loadSummary()
  }, [])

  function loadSummary() {
    fetch(`${API}/api/finance/summary`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json()).then(setSummary).catch(() => {})
  }

  async function uploadDocument(e) {
    e.preventDefault()
    if (!uploadFile) return
    setLoading(true); setMsg(null); setUploadResult(null); setDeepAnalysis(null)
    const formData = new FormData()
    formData.append('file', uploadFile)
    formData.append('module', 'finance')
    const res = await fetch(`${API}/api/upload/`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: formData })
    const data = await res.json()
    if (res.ok) {
      setUploadResult(data)
      setMsg({ type: 'success', text: `✓ Documento analizado · ID: ${data.id}` })
      if (uploadMode === 'financial' && data.id) {
        const stRes = await fetch(`${API}/api/finance/statements/${data.id}`, { headers: { Authorization: `Bearer ${getToken()}` } })
        if (stRes.ok) setDeepAnalysis(await stRes.json())
      }
      loadSummary()
    } else {
      setMsg({ type: 'error', text: data.detail || 'Error al subir el archivo' })
    }
    setLoading(false)
  }

  async function uploadContextFile(e) {
    e.preventDefault()
    if (!contextFile) return
    setLoading(true)
    const formData = new FormData()
    formData.append('file', contextFile)
    formData.append('module', 'marketing')
    const res = await fetch(`${API}/api/upload/`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: formData })
    const data = await res.json()
    if (res.ok) {
      setContextFiles(prev => [...prev, { name: contextFile.name, id: data.id }])
      setContextFile(null)
      setMsg({ type: 'success', text: `✓ Contexto añadido: ${contextFile.name}` })
    }
    setLoading(false)
  }

  async function generateProyecciones() {
    setProyLoading(true); setProyecciones(null)
    try {
      const res = await fetch(`${API}/api/finance/proyecciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ context_document_ids: contextFiles.map(f => f.id).filter(Boolean), meses_historico: 6 })
      })
      setProyecciones(await res.json())
    } catch { setProyecciones({ error: 'No se pudieron generar las proyecciones' }) }
    finally { setProyLoading(false) }
  }

  async function generateRatios() {
    setRatiosLoading(true); setRatios(null)
    try {
      const res = await fetch(`${API}/api/finance/ratios`, { headers: { Authorization: `Bearer ${getToken()}` } })
      setRatios(await res.json())
    } catch { setRatios({ error: 'No se pudieron calcular los ratios' }) }
    finally { setRatiosLoading(false) }
  }

  // Chart data — area chart from document summaries
  const chartData = summary?.summaries?.slice(0, 8).reverse().map((doc, i) => ({
    name:       doc.uploaded_at?.split('T')[0]?.substring(5) || `Doc ${i + 1}`,
    resultado:  doc.net_profit || 0,
    ingresos:   doc.total_revenue || 0,
    gastos:     doc.total_expenses || 0,
    score:      doc.health_score || 0,
  })) || []

  const latestDoc   = summary?.summaries?.[0] || {}
  const healthScore = latestDoc.health_score || 0
  const netProfit   = latestDoc.net_profit || 0
  const isPositive  = netProfit >= 0

  const sections = [
    { key: 'resumen',      label: 'Resumen'           },
    { key: 'analizar',     label: 'Analizar documento' },
    { key: 'proyecciones', label: 'Proyecciones IA'   },
    { key: 'ratios',       label: 'Ratios financieros' },
  ]

  const scenarioColors = { green: GREEN, amber: AMBER, red: RED }
  const card = { background: 'white', borderRadius: '14px', border: '1px solid #e5e9f0' }
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #e5e9f0', fontSize: '13px', color: '#1f2937', fontFamily: "'DM Sans', system-ui, sans-serif", outline: 'none', background: 'white' }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f6fb', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        input:focus, textarea:focus, select:focus { border-color: #0B1426 !important; outline: none; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      <Sidebar active="/finanzas" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'hidden' }}>

        {/* ── TOP BAR ── */}
        <div style={{ background: 'white', borderBottom: '1px solid #e5e9f0', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ paddingRight: '24px', marginRight: '8px', borderRight: '1px solid #f0f2f7' }}>
              <div style={{ fontSize: '16px', fontWeight: '800', color: NAVY, letterSpacing: '-0.4px' }}>💰 Finanzas</div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>Análisis financiero con proyecciones IA</div>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <SettingsButton />
            <NotificationCenter token={token} />
            <ProfileButton user={user} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

          {/* ══ RESUMEN — complete redesign ══ */}
          {section === 'resumen' && (
            <div style={{ animation: 'fadeUp 0.3s ease' }}>

              {/* Hero KPI row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 200px', gap: '14px', marginBottom: '20px' }}>

                {/* Resultado neto — big hero card */}
                <div style={{ ...card, padding: '24px', gridColumn: '1 / 2', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: isPositive ? `linear-gradient(90deg, ${GREEN}, #4ade80)` : `linear-gradient(90deg, ${RED}, #f87171)` }} />
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Resultado neto</div>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: isPositive ? GREEN : RED, letterSpacing: '-1px', lineHeight: 1, marginBottom: '6px' }}>
                    {isPositive ? '+' : ''}€{Math.abs(netProfit).toLocaleString('es-ES')}
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: isPositive ? '#f0fdf4' : '#fef2f2', padding: '3px 10px', borderRadius: '20px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: isPositive ? GREEN : RED }}>{isPositive ? '↑ Rentable' : '↓ Pérdidas'}</span>
                  </div>
                </div>

                {/* Ingresos */}
                <div style={{ ...card, padding: '24px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${BLUE}, ${CYAN})` }} />
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Ingresos totales</div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: NAVY, letterSpacing: '-0.8px', lineHeight: 1, marginBottom: '6px' }}>
                    €{(latestDoc.total_revenue || 0).toLocaleString('es-ES')}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>Último documento analizado</div>
                </div>

                {/* Gastos */}
                <div style={{ ...card, padding: '24px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${AMBER}, #fcd34d)` }} />
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Gastos totales</div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: NAVY, letterSpacing: '-0.8px', lineHeight: 1, marginBottom: '6px' }}>
                    €{(latestDoc.total_expenses || 0).toLocaleString('es-ES')}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>Último período analizado</div>
                </div>

                {/* Health score ring */}
                <div style={{ ...card, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: healthScore >= 7 ? `linear-gradient(90deg, ${GREEN}, #4ade80)` : healthScore >= 5 ? `linear-gradient(90deg, ${AMBER}, #fcd34d)` : `linear-gradient(90deg, ${RED}, #f87171)` }} />
                  <HealthRing score={healthScore} size={80} />
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Health score</div>
                  <div style={{ fontSize: '11px', color: healthScore >= 7 ? GREEN : healthScore >= 5 ? AMBER : RED, fontWeight: '700' }}>
                    {healthScore >= 7 ? 'Saludable' : healthScore >= 5 ? 'Regular' : healthScore > 0 ? 'Crítico' : 'Sin datos'}
                  </div>
                </div>
              </div>

              {/* Secondary stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
                {[
                  { label: 'Documentos analizados', value: summary?.total_documents || 0,             icon: '📄', color: NAVY  },
                  { label: 'Margen de beneficio',   value: latestDoc.health_score ? `${Math.round((netProfit / (latestDoc.total_revenue || 1)) * 100)}%` : '—', icon: '📊', color: BLUE  },
                  { label: 'Ratio ingresos/gastos', value: latestDoc.total_expenses ? `${((latestDoc.total_revenue || 0) / latestDoc.total_expenses).toFixed(2)}x` : '—', icon: '⚖️', color: isPositive ? GREEN : RED },
                  { label: 'Estado financiero',     value: healthScore >= 7 ? '✓ Saludable' : healthScore >= 5 ? '⚠ Regular' : healthScore > 0 ? '✗ Crítico' : '—', icon: '🔍', color: healthScore >= 7 ? GREEN : healthScore >= 5 ? AMBER : RED },
                ].map(k => (
                  <div key={k.label} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e9f0', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f4f6fb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>{k.icon}</div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: k.color, letterSpacing: '-0.3px' }}>{k.value}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>{k.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Area chart + actions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px', marginBottom: '20px' }}>

                {/* Area chart */}
                <div style={{ ...card, padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: NAVY, marginBottom: '3px' }}>Evolución financiera</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>Resultado neto por documento analizado</div>
                    </div>
                    <div style={{ display: 'flex', gap: '14px' }}>
                      {[
                        { color: GREEN, label: 'Resultado' },
                        { color: BLUE,  label: 'Ingresos'  },
                      ].map(l => (
                        <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '10px', height: '3px', background: l.color, borderRadius: '2px', display: 'inline-block' }} />
                          <span style={{ fontSize: '11px', color: '#6b7280' }}>{l.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <defs>
                          <linearGradient id="gradResultado" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={GREEN} stopOpacity={0.15}/>
                            <stop offset="95%" stopColor={GREEN} stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={BLUE} stopOpacity={0.1}/>
                            <stop offset="95%" stopColor={BLUE} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="ingresos" stroke={BLUE} strokeWidth={2} fill="url(#gradIngresos)" name="Ingresos" dot={false} />
                        <Area type="monotone" dataKey="resultado" stroke={GREEN} strokeWidth={2.5} fill="url(#gradResultado)" name="Resultado" dot={{ fill: GREEN, r: 4, strokeWidth: 0 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                      <div style={{ fontSize: '32px', marginBottom: '10px', opacity: 0.3 }}>📈</div>
                      <div style={{ fontSize: '13px' }}>Analiza documentos para ver la evolución</div>
                    </div>
                  )}
                </div>

                {/* Quick actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { icon: '🔍', title: 'Analizar documento', desc: 'Sube un CSV, Excel o PDF', action: () => setSection('analizar'), color: NAVY, primary: true },
                    { icon: '🔮', title: 'Proyecciones IA',    desc: '3 escenarios a 3 meses',  action: () => setSection('proyecciones'), color: BLUE },
                    { icon: '📐', title: 'Calcular ratios',    desc: '8 indicadores clave',      action: () => setSection('ratios'), color: '#7c3aed' },
                    { icon: '📒', title: 'Estados financieros', desc: 'P&L, Balance, Cash flow', action: () => router.push('/contabilidad'), color: GREEN },
                  ].map(m => (
                    <div key={m.title} onClick={m.action}
                      style={{ ...card, padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.15s', background: m.primary ? NAVY : 'white' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(3px)'; if (!m.primary) e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)' }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = 'none' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: m.primary ? 'rgba(255,255,255,0.15)' : '#f4f6fb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>{m.icon}</div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: m.primary ? 'white' : NAVY, marginBottom: '1px' }}>{m.title}</div>
                        <div style={{ fontSize: '11px', color: m.primary ? 'rgba(255,255,255,0.55)' : '#9ca3af' }}>{m.desc}</div>
                      </div>
                      <span style={{ marginLeft: 'auto', color: m.primary ? 'rgba(255,255,255,0.4)' : '#d1d5db', fontSize: '16px' }}>›</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Document history */}
              {summary?.summaries?.length > 0 && (
                <div style={{ ...card, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY }}>Historial de análisis</div>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>{summary.total_documents} documentos</span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#fafafa', borderBottom: '1px solid #f0f2f7' }}>
                        {['Archivo', 'Fecha', 'Resultado neto', 'Health score', 'Estado'].map(h => (
                          <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {summary.summaries.map((doc, i) => {
                        const profit  = doc.net_profit || 0
                        const score   = doc.health_score || 0
                        const sColor  = score >= 7 ? GREEN : score >= 5 ? AMBER : score > 0 ? RED : '#9ca3af'
                        const sBg     = score >= 7 ? '#f0fdf4' : score >= 5 ? '#fffbeb' : score > 0 ? '#fef2f2' : '#f8f9fc'
                        const sLabel  = score >= 7 ? 'Saludable' : score >= 5 ? 'Regular' : score > 0 ? 'Crítico' : '—'
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid #f8f9fc', background: i % 2 === 0 ? 'white' : '#fafafa', transition: 'background 0.15s', cursor: 'default' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f4f6fb'}
                            onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#fafafa'}>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: NAVY, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.filename}</div>
                              {doc.summary && <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.summary?.substring(0, 60)}...</div>}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{doc.uploaded_at?.split('T')[0] || '—'}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ fontSize: '14px', fontWeight: '800', color: profit >= 0 ? GREEN : RED, letterSpacing: '-0.3px' }}>
                                {profit >= 0 ? '+' : ''}€{Math.abs(profit).toLocaleString('es-ES')}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              {score > 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ width: '60px', height: '5px', background: '#f0f2f7', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${score * 10}%`, height: '100%', background: sColor, borderRadius: '3px' }} />
                                  </div>
                                  <span style={{ fontSize: '12px', fontWeight: '700', color: sColor }}>{score}/10</span>
                                </div>
                              ) : <span style={{ fontSize: '12px', color: '#9ca3af' }}>—</span>}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ fontSize: '11px', fontWeight: '700', color: sColor, background: sBg, padding: '3px 10px', borderRadius: '20px' }}>{sLabel}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Empty state */}
              {(!summary?.summaries?.length) && (
                <div style={{ ...card, padding: '64px', textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.25 }}>📊</div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: NAVY, marginBottom: '8px', letterSpacing: '-0.4px' }}>Sin análisis financieros aún</div>
                  <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px', lineHeight: '1.6', maxWidth: '380px', margin: '0 auto 24px' }}>
                    Sube un estado de cuenta bancario, factura o cualquier documento financiero para que Vortu lo analice automáticamente.
                  </div>
                  <button onClick={() => setSection('analizar')} style={{ padding: '12px 28px', borderRadius: '10px', border: 'none', background: NAVY, color: 'white', fontWeight: '700', fontSize: '14px', cursor: 'pointer', fontFamily: "'DM Sans', system-ui" }}>
                    Analizar primer documento
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ══ ANALIZAR ══ */}
          {section === 'analizar' && (
            <div style={{ animation: 'fadeUp 0.3s ease' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                {[
                  { key: 'financial', icon: '📊', title: 'Estado financiero', desc: 'CSV, Excel o PDF de estado de cuenta bancario. Genera P&L automático y health score.' },
                  { key: 'general',   icon: '🔍', title: 'Análisis libre',    desc: 'Cualquier documento — factura, contrato, informe. Claude hace análisis completo.' },
                ].map(m => (
                  <button key={m.key} onClick={() => { setUploadMode(m.key); setUploadFile(null); setUploadResult(null); setDeepAnalysis(null) }}
                    style={{ padding: '18px', border: `1.5px solid ${uploadMode === m.key ? NAVY : '#e5e9f0'}`, borderRadius: '12px', background: uploadMode === m.key ? NAVY : 'white', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', fontFamily: "'DM Sans', system-ui" }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>{m.icon}</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: uploadMode === m.key ? 'white' : NAVY, marginBottom: '4px' }}>{m.title}</div>
                    <div style={{ fontSize: '12px', color: uploadMode === m.key ? 'rgba(255,255,255,0.65)' : '#6b7280', lineHeight: '1.5' }}>{m.desc}</div>
                  </button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ ...card, padding: '24px' }}>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: NAVY, marginBottom: '16px' }}>{uploadMode === 'financial' ? 'Subir estado financiero' : 'Subir documento'}</div>
                  <form onSubmit={uploadDocument}>
                    <div style={{ border: `2px dashed ${uploadFile ? '#22c55e' : '#d1d5db'}`, borderRadius: '12px', padding: '36px', textAlign: 'center', marginBottom: '14px', background: uploadFile ? '#f0fdf4' : '#fafafa', cursor: 'pointer', transition: 'all 0.2s' }}
                      onClick={() => document.getElementById('financeFile').click()}>
                      <div style={{ fontSize: '36px', marginBottom: '8px' }}>{uploadFile ? '✓' : uploadMode === 'financial' ? '📊' : '🔍'}</div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: NAVY, marginBottom: '4px' }}>{uploadFile ? uploadFile.name : 'Haz clic para seleccionar'}</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>{uploadMode === 'financial' ? 'CSV, Excel o PDF' : 'Cualquier formato'}</div>
                      <input id="financeFile" type="file" accept=".csv,.xlsx,.xls,.pdf" style={{ display: 'none' }} onChange={e => setUploadFile(e.target.files[0])} />
                    </div>
                    <MsgBox msg={msg} />
                    <button type="submit" disabled={loading || !uploadFile} style={{ width: '100%', padding: '12px', borderRadius: '9px', border: 'none', background: !uploadFile ? '#e5e9f0' : NAVY, color: !uploadFile ? '#9ca3af' : 'white', fontWeight: '700', fontSize: '14px', cursor: !uploadFile ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', system-ui" }}>
                      {loading ? 'Claude analizando...' : 'Analizar con IA'}
                    </button>
                  </form>
                </div>
                <div style={{ ...card, padding: '24px' }}>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: NAVY, marginBottom: '16px' }}>Resultado del análisis</div>
                  {!uploadResult ? (
                    <div style={{ padding: '48px', textAlign: 'center' }}>
                      <div style={{ fontSize: '36px', marginBottom: '12px', opacity: 0.3 }}>🤖</div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>Sube un documento para ver el análisis aquí</div>
                    </div>
                  ) : (() => {
                    let ai = {}
                    try { ai = JSON.parse(uploadResult.ai_result || '{}') } catch {}
                    return (
                      <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                          <span style={{ padding: '3px 10px', background: '#f0fdf4', color: GREEN, borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>✓ Completado</span>
                          <span style={{ padding: '3px 10px', background: '#f8faff', borderRadius: '20px', fontSize: '12px', color: '#6b7280' }}>ID: {uploadResult.id}</span>
                        </div>
                        {ai.summary && (
                          <div style={{ padding: '12px', background: '#f8faff', borderRadius: '10px', marginBottom: '12px', borderLeft: `3px solid ${NAVY}` }}>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: NAVY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Resumen ejecutivo</div>
                            <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6' }}>{ai.summary}</div>
                          </div>
                        )}
                        {(ai.total_income !== undefined || ai.total_expenses !== undefined) && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                            {[
                              { label: 'Ingresos',  value: ai.total_income,   color: GREEN, show: ai.total_income !== undefined },
                              { label: 'Gastos',    value: ai.total_expenses, color: RED,   show: ai.total_expenses !== undefined },
                              { label: 'Resultado', value: ai.net_profit,     color: (ai.net_profit || 0) >= 0 ? GREEN : RED, show: ai.net_profit !== undefined },
                              { label: 'H. Score',  value: ai.health_score ? `${ai.health_score}/10` : null, color: (ai.health_score || 0) >= 7 ? GREEN : (ai.health_score || 0) >= 5 ? AMBER : RED, show: ai.health_score !== undefined, raw: true },
                            ].filter(m => m.show).map(m => (
                              <div key={m.label} style={{ padding: '10px', background: '#f8faff', borderRadius: '8px', border: '1px solid #f0f2f7', textAlign: 'center' }}>
                                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '3px' }}>{m.label}</div>
                                <div style={{ fontSize: '16px', fontWeight: '800', color: m.color }}>{m.raw ? m.value : `€${(m.value || 0).toLocaleString('es-ES')}`}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        {ai.recommendations?.length > 0 && (
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Recomendaciones</div>
                            {ai.recommendations.map((r, i) => (
                              <div key={i} style={{ fontSize: '12px', color: '#374151', padding: '5px 0', borderBottom: '1px solid #f0f2f7', display: 'flex', gap: '6px' }}>
                                <span style={{ color: NAVY, fontWeight: '700', flexShrink: 0 }}>→</span>
                                {typeof r === 'string' ? r : r.accion || JSON.stringify(r)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ══ PROYECCIONES ══ */}
          {section === 'proyecciones' && (
            <div style={{ animation: 'fadeUp 0.3s ease' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ ...card, padding: '20px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY, marginBottom: '4px' }}>Contexto económico</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '14px', lineHeight: '1.5' }}>Sube informes, noticias o análisis de mercado para que Claude los considere.</div>
                    <form onSubmit={uploadContextFile}>
                      <div style={{ border: `2px dashed ${contextFile ? '#22c55e' : '#d1d5db'}`, borderRadius: '10px', padding: '20px', textAlign: 'center', marginBottom: '10px', background: contextFile ? '#f0fdf4' : '#fafafa', cursor: 'pointer' }}
                        onClick={() => document.getElementById('contextFile').click()}>
                        <div style={{ fontSize: '24px', marginBottom: '4px' }}>🌐</div>
                        <div style={{ fontSize: '12px', color: contextFile ? NAVY : '#9ca3af', fontWeight: contextFile ? '600' : '400' }}>{contextFile ? contextFile.name : 'Subir informe o noticia'}</div>
                        <input id="contextFile" type="file" accept=".pdf,.csv,.xlsx" style={{ display: 'none' }} onChange={e => setContextFile(e.target.files[0])} />
                      </div>
                      <button type="submit" disabled={loading || !contextFile} style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #e5e9f0', background: !contextFile ? '#f8f9fc' : 'white', color: !contextFile ? '#9ca3af' : NAVY, fontWeight: '600', fontSize: '12px', cursor: !contextFile ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', system-ui" }}>
                        {loading ? 'Procesando...' : 'Añadir al contexto'}
                      </button>
                    </form>
                    {contextFiles.length > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Contexto cargado</div>
                        {contextFiles.map((f, i) => (
                          <div key={i} style={{ fontSize: '12px', color: '#374151', padding: '5px 0', borderBottom: '1px solid #f0f2f7', display: 'flex', gap: '6px' }}>
                            <span style={{ color: GREEN, fontWeight: '700' }}>✓</span>{f.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ background: '#f8faff', borderRadius: '12px', border: '1px solid #e5e9f0', padding: '14px' }}>
                    <div style={{ fontSize: '11px', color: '#6b7280', lineHeight: '1.5' }}>💡 Sin contexto externo Claude usa su conocimiento de tendencias económicas de España y Europa 2025-2026.</div>
                  </div>
                  <button onClick={generateProyecciones} disabled={proyLoading} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: proyLoading ? '#e5e9f0' : NAVY, color: proyLoading ? '#9ca3af' : 'white', fontWeight: '700', fontSize: '14px', cursor: proyLoading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', system-ui" }}>
                    {proyLoading ? 'Claude generando escenarios...' : '🔮 Generar proyecciones a 3 meses'}
                  </button>
                </div>
                <div>
                  {!proyecciones && !proyLoading && (
                    <div style={{ ...card, padding: '60px', textAlign: 'center' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>🔮</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: NAVY, marginBottom: '8px' }}>Proyecciones con contexto económico</div>
                      <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.6', maxWidth: '380px', margin: '0 auto' }}>Claude analizará tus datos financieros y generará 3 escenarios detallados para los próximos 3 meses.</div>
                    </div>
                  )}
                  {proyLoading && (
                    <div style={{ ...card, padding: '60px', textAlign: 'center' }}>
                      <div style={{ fontSize: '36px', marginBottom: '12px', opacity: 0.5, animation: 'pulse 1.5s ease infinite' }}>⏳</div>
                      <div style={{ fontSize: '15px', fontWeight: '600', color: NAVY }}>Claude está analizando...</div>
                    </div>
                  )}
                  {proyecciones?.error && (
                    <div style={{ ...card, padding: '20px', borderLeft: `3px solid ${RED}` }}>
                      <div style={{ color: RED, fontWeight: '600', marginBottom: '4px' }}>Error</div>
                      <div style={{ color: '#374151', fontSize: '13px' }}>{proyecciones.error}</div>
                    </div>
                  )}
                  {proyecciones && !proyecciones.error && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {proyecciones.contexto_economico && (
                        <div style={{ background: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe', padding: '14px 16px', borderLeft: `3px solid ${BLUE}` }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: BLUE, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>🌐 Contexto económico considerado</div>
                          <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6' }}>{proyecciones.contexto_economico}</div>
                        </div>
                      )}
                      {proyecciones.escenarios?.map((esc, i) => {
                        const color = scenarioColors[esc.color] || AMBER
                        const bg = esc.color === 'green' ? '#f0fdf4' : esc.color === 'red' ? '#fef2f2' : '#fffbeb'
                        const icon = esc.nombre === 'Optimista' ? '🚀' : esc.nombre === 'Conservador' ? '📊' : '⚠️'
                        return (
                          <div key={i} style={{ ...card, padding: '20px', borderLeft: `3px solid ${color}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                              <div>
                                <div style={{ fontSize: '15px', fontWeight: '700', color, marginBottom: '3px' }}>{icon} Escenario {esc.nombre}</div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>{esc.descripcion}</div>
                              </div>
                              <span style={{ padding: '4px 12px', background: bg, color, borderRadius: '20px', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>{esc.probabilidad}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
                              {esc.meses?.map((mes, j) => (
                                <div key={j} style={{ padding: '12px', background: bg, borderRadius: '8px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '11px', fontWeight: '700', color, marginBottom: '6px' }}>{mes.mes}</div>
                                  <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>Ingresos</div>
                                  <div style={{ fontSize: '13px', fontWeight: '800', color: GREEN, marginBottom: '4px' }}>€{(mes.ingresos || 0).toLocaleString('es-ES')}</div>
                                  <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>Resultado</div>
                                  <div style={{ fontSize: '13px', fontWeight: '800', color: (mes.resultado || 0) >= 0 ? GREEN : RED }}>{(mes.resultado || 0) >= 0 ? '+' : ''}€{(mes.resultado || 0).toLocaleString('es-ES')}</div>
                                </div>
                              ))}
                            </div>
                            {esc.supuestos?.length > 0 && (
                              <div style={{ marginBottom: '10px' }}>
                                <div style={{ fontSize: '10px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px' }}>Supuestos</div>
                                {esc.supuestos.map((s, j) => <div key={j} style={{ fontSize: '12px', color: '#374151' }}>• {s}</div>)}
                              </div>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              {esc.oportunidades?.length > 0 && (
                                <div style={{ padding: '10px', background: '#f0fdf4', borderRadius: '8px' }}>
                                  <div style={{ fontSize: '10px', fontWeight: '700', color: GREEN, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px' }}>✓ Oportunidades</div>
                                  {esc.oportunidades.map((o, j) => <div key={j} style={{ fontSize: '11px', color: '#374151' }}>• {o}</div>)}
                                </div>
                              )}
                              {esc.acciones?.length > 0 && (
                                <div style={{ padding: '10px', background: '#f8faff', borderRadius: '8px', border: '1px solid #f0f2f7' }}>
                                  <div style={{ fontSize: '10px', fontWeight: '700', color: NAVY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px' }}>→ Acciones</div>
                                  {esc.acciones.map((a, j) => <div key={j} style={{ fontSize: '11px', color: '#374151' }}>• {a}</div>)}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      {proyecciones.recomendacion_principal && (
                        <div style={{ background: NAVY, borderRadius: '12px', padding: '16px 20px', display: 'flex', gap: '14px', alignItems: 'center' }}>
                          <div style={{ fontSize: '24px' }}>⭐</div>
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Recomendación principal</div>
                            <div style={{ fontSize: '13.5px', color: 'white', lineHeight: '1.6' }}>{proyecciones.recomendacion_principal}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══ RATIOS ══ */}
          {section === 'ratios' && (
            <div style={{ animation: 'fadeUp 0.3s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: NAVY, marginBottom: '3px' }}>Ratios financieros</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>8 indicadores clave calculados automáticamente desde tus datos contables.</div>
                </div>
                <button onClick={generateRatios} disabled={ratiosLoading} style={{ padding: '10px 20px', borderRadius: '9px', border: 'none', background: ratiosLoading ? '#e5e9f0' : NAVY, color: ratiosLoading ? '#9ca3af' : 'white', fontWeight: '600', fontSize: '13px', cursor: ratiosLoading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', system-ui" }}>
                  {ratiosLoading ? 'Calculando...' : 'Calcular ratios'}
                </button>
              </div>
              {!ratios && !ratiosLoading && (
                <div style={{ ...card, padding: '60px', textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📐</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: NAVY, marginBottom: '8px' }}>Análisis de ratios financieros</div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px', maxWidth: '380px', margin: '0 auto 20px' }}>Claude calculará 8 ratios clave — liquidez, rentabilidad, solvencia y eficiencia.</div>
                  <button onClick={generateRatios} style={{ padding: '10px 24px', borderRadius: '9px', border: 'none', background: NAVY, color: 'white', fontWeight: '600', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', system-ui" }}>Calcular mis ratios</button>
                </div>
              )}
              {ratiosLoading && (
                <div style={{ ...card, padding: '60px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', marginBottom: '12px', opacity: 0.5, animation: 'pulse 1.5s ease infinite' }}>⏳</div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: NAVY }}>Calculando ratios financieros...</div>
                </div>
              )}
              {ratios?.error && (
                <div style={{ ...card, padding: '20px', borderLeft: `3px solid ${RED}` }}>
                  <div style={{ color: RED, fontWeight: '600', marginBottom: '4px' }}>Error</div>
                  <div style={{ color: '#374151', fontSize: '13px' }}>{ratios.error}</div>
                </div>
              )}
              {ratios && !ratios.error && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '16px' }}>
                    {ratios.ratios?.map((ratio, i) => {
                      const sColor = ratio.estado === 'bueno' ? GREEN : ratio.estado === 'regular' ? AMBER : RED
                      const sBg   = ratio.estado === 'bueno' ? '#f0fdf4' : ratio.estado === 'regular' ? '#fffbeb' : '#fef2f2'
                      return (
                        <div key={i} style={{ ...card, padding: '18px', borderLeft: `3px solid ${sColor}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div>
                              <div style={{ fontSize: '13.5px', fontWeight: '700', color: NAVY, marginBottom: '2px' }}>{ratio.nombre}</div>
                              <div style={{ fontSize: '10px', color: '#9ca3af', fontFamily: 'monospace' }}>{ratio.formula}</div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontSize: '20px', fontWeight: '800', color: sColor, letterSpacing: '-0.5px' }}>{ratio.valor}</div>
                              <span style={{ padding: '2px 8px', background: sBg, color: sColor, borderRadius: '20px', fontSize: '10px', fontWeight: '700' }}>
                                {ratio.estado === 'bueno' ? '✓ Bueno' : ratio.estado === 'regular' ? '⚠ Regular' : '✗ Crítico'}
                              </span>
                            </div>
                          </div>
                          <div style={{ fontSize: '12px', color: '#374151', lineHeight: '1.5', marginBottom: '6px' }}>{ratio.interpretacion}</div>
                          <div style={{ fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>📊 {ratio.benchmark}</div>
                        </div>
                      )
                    })}
                  </div>
                  {ratios.conclusion && (
                    <div style={{ ...card, padding: '18px', marginBottom: '12px', borderLeft: `3px solid ${NAVY}` }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: NAVY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Conclusión general</div>
                      <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6' }}>{ratios.conclusion}</div>
                    </div>
                  )}
                  {ratios.accion_prioritaria && (
                    <div style={{ background: NAVY, borderRadius: '12px', padding: '16px 20px', display: 'flex', gap: '14px', alignItems: 'center' }}>
                      <div style={{ fontSize: '24px' }}>🎯</div>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Acción prioritaria</div>
                        <div style={{ fontSize: '13.5px', color: 'white', lineHeight: '1.6' }}>{ratios.accion_prioritaria}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}