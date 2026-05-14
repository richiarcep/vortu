'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

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

// ── Main ───────────────────────────────────────────────────────────────────────
export default function HR() {
  const router = useRouter()
  const [section, setSection] = useState('empleados')
  const [feedbackTab, setFeedbackTab] = useState('individual')
  const [employees, setEmployees] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const [form, setForm] = useState({ full_name: '', email: '', department: '', position: '', gross_salary: '' })
  const [showForm, setShowForm] = useState(false)
  const [payrollFile, setPayrollFile] = useState(null)
  const [payrollResult, setPayrollResult] = useState(null)
  const [feedback, setFeedback] = useState({ comments: '' })
  const [feedbackResult, setFeedbackResult] = useState(null)
  const [individualFeedback, setIndividualFeedback] = useState({ employee_id: '', content: '' })
  const [individualMsg, setIndividualMsg] = useState(null)
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)

  const getToken = () => localStorage.getItem('nexum_token')

  useEffect(() => {
    const t = getToken()
    if (!t) { router.push('/login'); return }
    setToken(t)
    try {
      const payload = JSON.parse(atob(t.split('.')[1]))
      setUser({ email: payload.sub || '', name: payload.name || payload.sub || 'Usuario' })
    } catch { setUser({ email: '', name: 'Usuario' }) }
    loadEmployees()
    loadSummary()
  }, [])

  function loadEmployees() {
    fetch(`${API}/api/hr/employees`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json()).then(setEmployees).catch(() => {})
  }

  function loadSummary() {
    fetch(`${API}/api/hr/summary`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json()).then(setSummary).catch(() => {})
  }

  async function createEmployee(e) {
    e.preventDefault()
    setLoading(true); setMsg(null)
    const res = await fetch(`${API}/api/hr/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ ...form, gross_salary: parseFloat(form.gross_salary) })
    })
    const data = await res.json()
    if (res.ok) {
      setMsg({ type: 'success', text: `✓ Empleado ${data.full_name} creado` })
      setForm({ full_name: '', email: '', department: '', position: '', gross_salary: '' })
      setShowForm(false); loadEmployees(); loadSummary()
    } else {
      setMsg({ type: 'error', text: data.detail || 'Error al crear empleado' })
    }
    setLoading(false)
  }

  async function deactivateEmployee(id, name) {
    if (!confirm(`¿Desactivar a ${name}?`)) return
    await fetch(`${API}/api/hr/employees/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } })
    loadEmployees(); loadSummary()
  }

  async function processPayroll(e) {
    e.preventDefault()
    if (!payrollFile) return
    setLoading(true); setMsg(null); setPayrollResult(null)
    const formData = new FormData()
    formData.append('file', payrollFile)
    formData.append('module', 'hr')
    const uploadRes = await fetch(`${API}/api/upload/`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: formData })
    const uploadData = await uploadRes.json()
    if (uploadRes.ok) {
      const payRes = await fetch(`${API}/api/hr/payroll/${uploadData.id}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      const payData = await payRes.json()
      setPayrollResult(payData)
      setMsg({ type: 'success', text: `✓ Nómina procesada para ${payData.payroll?.summary?.total_employees || 0} empleados` })
    } else {
      setMsg({ type: 'error', text: 'Error procesando el archivo' })
    }
    setLoading(false)
  }

  async function downloadPayslip(name) {
    const res = await fetch(`${API}/api/hr/payslip/${name}`, { headers: { Authorization: `Bearer ${getToken()}` } })
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `${name}_nomina.pdf`; a.click()
    }
  }

  async function submitIndividualFeedback(e) {
    e.preventDefault()
    setLoading(true); setIndividualMsg(null)
    const res = await fetch(`${API}/api/hr/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ employee_id: parseInt(individualFeedback.employee_id), content: individualFeedback.content })
    })
    const data = await res.json()
    if (res.ok) { setIndividualMsg({ type: 'success', text: '✓ Feedback registrado exitosamente' }); setIndividualFeedback({ employee_id: '', content: '' }) }
    else { setIndividualMsg({ type: 'error', text: data.detail || 'Error al registrar feedback' }) }
    setLoading(false)
  }

  async function analyzeFeedback(e) {
    e.preventDefault()
    if (!feedback.comments.trim()) return
    setLoading(true); setFeedbackResult(null)
    const comments = feedback.comments.split('\n').filter(c => c.trim())
    const res = await fetch(`${API}/api/hr/feedback/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ comments })
    })
    setFeedbackResult(await res.json())
    setLoading(false)
  }

  const sections = [
    { key: 'empleados', label: '👥 Empleados' },
    { key: 'nomina',    label: '💶 Nómina'    },
    { key: 'feedback',  label: '💬 Feedback'  },
  ]

  const card      = { background: 'white', borderRadius: '14px', border: '1px solid #e5e9f0' }
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #e5e9f0', fontSize: '13px', color: '#1f2937', fontFamily: "'DM Sans', system-ui, sans-serif", outline: 'none', background: 'white' }
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }
  const msgBox = (m) => m ? (
    <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px', background: m.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${m.type === 'success' ? '#bbf7d0' : '#fecaca'}`, color: m.type === 'success' ? GREEN : RED }}>{m.text}</div>
  ) : null

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f6fb', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        input:focus, textarea:focus, select:focus { border-color: #0B1426 !important; outline: none; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <Sidebar active="/hr" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'hidden' }}>

        {/* ── TOP BAR ── */}
        <div style={{ background: 'white', borderBottom: '1px solid #e5e9f0', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ paddingRight: '24px', marginRight: '8px', borderRight: '1px solid #f0f2f7' }}>
              <div style={{ fontSize: '16px', fontWeight: '800', color: NAVY, letterSpacing: '-0.4px' }}>👥 Recursos Humanos</div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>Empleados, nómina y análisis de equipo</div>
            </div>
            <div style={{ display: 'flex' }}>
              {sections.map(s => (
                <button key={s.key} onClick={() => { setSection(s.key); setMsg(null) }}
                  style={{ padding: '0 14px', height: '64px', background: 'none', border: 'none', borderBottom: section === s.key ? `2px solid ${NAVY}` : '2px solid transparent', color: section === s.key ? NAVY : '#6b7280', fontWeight: section === s.key ? '700' : '400', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", transition: 'all 0.15s' }}>
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

          {/* KPI strip */}
          {summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
              {[
                { label: 'Empleados activos',  value: summary.total_employees || 0,                                                                                                                                              color: NAVY,    bg: 'white'   },
                { label: 'Nómina bruta anual', value: `€${(summary.total_gross_payroll || 0).toLocaleString('es-ES')}`,                                                                                                          color: '#1e3a8a', bg: '#eff6ff' },
                { label: 'Departamentos',       value: Object.keys(summary.departments || {}).length,                                                                                                                             color: '#1a6b4a', bg: '#f0fdf4' },
                { label: 'Coste por empleado',  value: summary.total_employees > 0 ? `€${Math.round((summary.total_gross_payroll || 0) / summary.total_employees).toLocaleString('es-ES')}` : '—',                               color: '#92400e', bg: '#fffbeb' },
              ].map(k => (
                <div key={k.label} style={{ ...card, padding: '16px', background: k.bg, textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: k.color, letterSpacing: '-0.5px' }}>{k.value}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '3px' }}>{k.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* ══ EMPLEADOS ══ */}
          {section === 'empleados' && (
            <div style={{ animation: 'fadeUp 0.3s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '15px', fontWeight: '700', color: NAVY }}>Lista de empleados</div>
                <button onClick={() => setShowForm(!showForm)} style={{ padding: '9px 18px', borderRadius: '9px', border: 'none', background: showForm ? '#f1f5f9' : NAVY, color: showForm ? '#374151' : 'white', fontWeight: '600', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                  {showForm ? 'Cancelar' : '+ Añadir empleado'}
                </button>
              </div>

              {msgBox(msg)}

              {showForm && (
                <div style={{ ...card, padding: '24px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY, marginBottom: '16px' }}>Nuevo empleado</div>
                  <form onSubmit={createEmployee}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                      {[
                        { key: 'full_name',    label: 'Nombre completo',      placeholder: 'Juan García López',   type: 'text'   },
                        { key: 'email',        label: 'Email',                 placeholder: 'juan@empresa.com',   type: 'email'  },
                        { key: 'department',   label: 'Departamento',          placeholder: 'Marketing, Ventas',  type: 'text'   },
                        { key: 'position',     label: 'Cargo',                 placeholder: 'Director, Analista', type: 'text'   },
                        { key: 'gross_salary', label: 'Salario bruto anual €', placeholder: '30000',              type: 'number' },
                      ].map(f => (
                        <div key={f.key}>
                          <label style={labelStyle}>{f.label}</label>
                          <input style={inputStyle} type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} required={['full_name','email','gross_salary'].includes(f.key)} />
                        </div>
                      ))}
                    </div>
                    <button type="submit" disabled={loading} style={{ padding: '10px 24px', borderRadius: '9px', border: 'none', background: NAVY, color: 'white', fontWeight: '600', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                      {loading ? 'Creando...' : 'Crear empleado'}
                    </button>
                  </form>
                </div>
              )}

              <div style={{ ...card, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: NAVY }}>
                      {['Empleado', 'Departamento', 'Cargo', 'Salario bruto', 'Acciones'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f0f2f7', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', background: NAVY, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                              {emp.full_name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: NAVY }}>{emp.full_name}</div>
                              <div style={{ fontSize: '11px', color: '#9ca3af' }}>{emp.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{emp.department || '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{emp.position || '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: NAVY }}>€{(emp.gross_salary || 0).toLocaleString('es-ES')}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <button onClick={() => deactivateEmployee(emp.id, emp.full_name)} style={{ padding: '5px 12px', background: '#fef2f2', color: RED, border: '1px solid #fecaca', borderRadius: '7px', fontSize: '12px', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                            Desactivar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {employees.length === 0 && (
                  <div style={{ padding: '48px', textAlign: 'center' }}>
                    <div style={{ fontSize: '36px', marginBottom: '12px', opacity: 0.3 }}>👥</div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>No hay empleados. Añade el primero.</div>
                  </div>
                )}
              </div>

              {summary && Object.keys(summary.departments || {}).length > 0 && (
                <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  {Object.entries(summary.departments).map(([dept, data], i) => (
                    <div key={i} style={{ ...card, padding: '16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: NAVY, marginBottom: '4px' }}>{dept}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>{data.headcount} empleado{data.headcount !== 1 ? 's' : ''}</div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: NAVY }}>€{(data.total_gross || 0).toLocaleString('es-ES')}</div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>nómina bruta anual</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ NÓMINA ══ */}
          {section === 'nomina' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', animation: 'fadeUp 0.3s ease' }}>
              <div style={{ ...card, padding: '24px' }}>
                <div style={{ fontSize: '15px', fontWeight: '700', color: NAVY, marginBottom: '6px' }}>Procesar nómina</div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Sube un CSV o Excel. Calcula automáticamente el salario neto con SS e IRPF 2024.</div>
                <form onSubmit={processPayroll}>
                  <div style={{ border: `2px dashed ${payrollFile ? '#22c55e' : '#d1d5db'}`, borderRadius: '12px', padding: '32px', textAlign: 'center', marginBottom: '16px', background: payrollFile ? '#f0fdf4' : '#fafafa', cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={() => document.getElementById('payrollInput').click()}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: NAVY, marginBottom: '4px' }}>{payrollFile ? payrollFile.name : 'Haz clic para seleccionar'}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>CSV o Excel: nombre, departamento, salario</div>
                    <input id="payrollInput" type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={e => setPayrollFile(e.target.files[0])} />
                  </div>
                  {msgBox(msg)}
                  <button type="submit" disabled={loading || !payrollFile} style={{ width: '100%', padding: '12px', borderRadius: '9px', border: 'none', background: !payrollFile ? '#e5e9f0' : NAVY, color: !payrollFile ? '#9ca3af' : 'white', fontWeight: '700', fontSize: '14px', cursor: !payrollFile ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                    {loading ? 'Calculando...' : 'Procesar nómina'}
                  </button>
                </form>
                <div style={{ marginTop: '16px', padding: '14px', background: '#f8faff', borderRadius: '10px', border: '1px solid #e5e9f0' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Cálculos aplicados</div>
                  {['Seguridad Social empleado: 6.35%', 'IRPF tramos 2024 (19% → 45%)', 'Nóminas PDF generadas automáticamente'].map((t, i) => (
                    <div key={i} style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'flex', gap: '6px' }}>
                      <span style={{ color: GREEN, fontWeight: '700' }}>✓</span>{t}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...card, padding: '24px' }}>
                <div style={{ fontSize: '15px', fontWeight: '700', color: NAVY, marginBottom: '16px' }}>Resultado</div>
                {!payrollResult ? (
                  <div style={{ padding: '48px', textAlign: 'center' }}>
                    <div style={{ fontSize: '36px', marginBottom: '12px', opacity: 0.3 }}>💼</div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>Procesa un archivo para ver los resultados</div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                      {[
                        { label: 'Empleados',   value: payrollResult.payroll?.summary?.total_employees || 0,                                    color: NAVY  },
                        { label: 'Bruto total', value: `€${(payrollResult.payroll?.summary?.total_gross_payroll || 0).toLocaleString('es-ES')}`, color: NAVY  },
                        { label: 'Neto total',  value: `€${(payrollResult.payroll?.summary?.total_net_payroll || 0).toLocaleString('es-ES')}`,   color: GREEN },
                        { label: 'Deducciones', value: `€${(payrollResult.payroll?.summary?.total_deductions || 0).toLocaleString('es-ES')}`,    color: RED   },
                      ].map((s, i) => (
                        <div key={i} style={{ padding: '12px', background: '#f8faff', borderRadius: '8px', border: '1px solid #f0f2f7', textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>{s.label}</div>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: s.color }}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                      {payrollResult.payroll?.employees?.map((emp, i) => (
                        <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid #f0f2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: NAVY }}>{emp.name}</div>
                            <div style={{ fontSize: '11px', color: '#6b7280' }}>{emp.department} · Bruto: €{(emp.gross_salary || 0).toLocaleString('es-ES')}</div>
                            <div style={{ fontSize: '11px', color: '#9ca3af' }}>SS: -€{emp.social_security} · IRPF: -€{emp.income_tax}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '15px', fontWeight: '800', color: GREEN, marginBottom: '4px' }}>€{(emp.net_salary || 0).toLocaleString('es-ES')}</div>
                            <button onClick={() => downloadPayslip(emp.name?.replace(/ /g, '_'))} style={{ padding: '4px 10px', background: '#f8faff', border: '1px solid #e5e9f0', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', color: NAVY, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                              ⬇ PDF
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ══ FEEDBACK ══ */}
          {section === 'feedback' && (
            <div style={{ animation: 'fadeUp 0.3s ease' }}>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
                {[{ key: 'individual', label: '👤 Por empleado' }, { key: 'batch', label: '📊 Análisis grupal' }].map(t => (
                  <button key={t.key} onClick={() => setFeedbackTab(t.key)} style={{ padding: '8px 18px', borderRadius: '8px', border: '1.5px solid', borderColor: feedbackTab === t.key ? NAVY : '#e5e9f0', background: feedbackTab === t.key ? NAVY : 'white', color: feedbackTab === t.key ? 'white' : '#374151', fontWeight: '600', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", transition: 'all 0.15s' }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {feedbackTab === 'individual' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div style={{ ...card, padding: '24px' }}>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: NAVY, marginBottom: '6px' }}>Registrar feedback</div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Añade un comentario vinculado a un empleado específico.</div>
                    <form onSubmit={submitIndividualFeedback}>
                      <div style={{ marginBottom: '14px' }}>
                        <label style={labelStyle}>Empleado</label>
                        <select style={inputStyle} value={individualFeedback.employee_id} onChange={e => setIndividualFeedback({ ...individualFeedback, employee_id: e.target.value })} required>
                          <option value="">Selecciona un empleado</option>
                          {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name} — {emp.department || 'Sin departamento'}</option>)}
                        </select>
                      </div>
                      <div style={{ marginBottom: '20px' }}>
                        <label style={labelStyle}>Comentario</label>
                        <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '140px', lineHeight: '1.6' }} placeholder="Escribe el feedback para este empleado..." value={individualFeedback.content} onChange={e => setIndividualFeedback({ ...individualFeedback, content: e.target.value })} required />
                      </div>
                      {msgBox(individualMsg)}
                      <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: '9px', border: 'none', background: NAVY, color: 'white', fontWeight: '700', fontSize: '14px', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                        {loading ? 'Registrando...' : 'Registrar feedback'}
                      </button>
                    </form>
                  </div>

                  <div style={{ ...card, padding: '24px' }}>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: NAVY, marginBottom: '6px' }}>Equipo</div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>Haz clic para seleccionar un empleado.</div>
                    <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                      {employees.map((emp, i) => {
                        const selected = individualFeedback.employee_id === String(emp.id)
                        return (
                          <div key={i} onClick={() => setIndividualFeedback({ ...individualFeedback, employee_id: String(emp.id) })}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '10px', marginBottom: '6px', cursor: 'pointer', background: selected ? '#f0f7ff' : '#fafafa', border: `1px solid ${selected ? '#bfdbfe' : '#f0f2f7'}`, transition: 'all 0.15s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '34px', height: '34px', background: selected ? NAVY : '#e5e9f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: selected ? 'white' : '#374151', fontSize: '13px', fontWeight: '700', flexShrink: 0, transition: 'all 0.15s' }}>
                                {emp.full_name?.charAt(0) || '?'}
                              </div>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: NAVY }}>{emp.full_name}</div>
                                <div style={{ fontSize: '11px', color: '#9ca3af' }}>{emp.department || 'Sin departamento'}</div>
                              </div>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: selected ? GREEN : '#9ca3af' }}>
                              {selected ? '✓ Seleccionado' : 'Seleccionar'}
                            </span>
                          </div>
                        )
                      })}
                      {employees.length === 0 && <div style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#9ca3af' }}>No hay empleados registrados.</div>}
                    </div>
                  </div>
                </div>
              )}

              {feedbackTab === 'batch' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div style={{ ...card, padding: '24px' }}>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: NAVY, marginBottom: '6px' }}>Análisis grupal</div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Pega comentarios anónimos uno por línea. Claude analiza sentimiento e identifica temas.</div>
                    <form onSubmit={analyzeFeedback}>
                      <div style={{ marginBottom: '16px' }}>
                        <label style={labelStyle}>Comentarios (uno por línea)</label>
                        <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '200px', lineHeight: '1.6' }}
                          placeholder={'El ambiente es muy bueno\nNecesitamos más recursos\nMe siento valorado\nLa comunicación podría mejorar'}
                          value={feedback.comments} onChange={e => setFeedback({ ...feedback, comments: e.target.value })} required />
                      </div>
                      <button type="submit" disabled={loading || !feedback.comments.trim()} style={{ width: '100%', padding: '12px', borderRadius: '9px', border: 'none', background: !feedback.comments.trim() ? '#e5e9f0' : NAVY, color: !feedback.comments.trim() ? '#9ca3af' : 'white', fontWeight: '700', fontSize: '14px', cursor: !feedback.comments.trim() ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                        {loading ? 'Claude analizando...' : 'Analizar con IA'}
                      </button>
                    </form>
                  </div>

                  <div style={{ ...card, padding: '24px' }}>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: NAVY, marginBottom: '16px' }}>Resultado</div>
                    {!feedbackResult ? (
                      <div style={{ padding: '48px', textAlign: 'center' }}>
                        <div style={{ fontSize: '36px', marginBottom: '12px', opacity: 0.3 }}>💬</div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>Añade comentarios y analiza para ver resultados</div>
                      </div>
                    ) : (
                      <>
                        <div style={{ padding: '16px', background: feedbackResult.overall_sentiment === 'positive' ? '#f0fdf4' : feedbackResult.overall_sentiment === 'negative' ? '#fef2f2' : '#fffbeb', borderRadius: '10px', marginBottom: '16px', textAlign: 'center', border: `1px solid ${feedbackResult.overall_sentiment === 'positive' ? '#bbf7d0' : feedbackResult.overall_sentiment === 'negative' ? '#fecaca' : '#fde68a'}` }}>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Sentimiento general</div>
                          <div style={{ fontSize: '20px', fontWeight: '800', color: feedbackResult.overall_sentiment === 'positive' ? GREEN : feedbackResult.overall_sentiment === 'negative' ? RED : AMBER }}>
                            {feedbackResult.overall_sentiment === 'positive' ? '✓ Positivo' : feedbackResult.overall_sentiment === 'negative' ? '✗ Negativo' : '⚠ Neutral'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{feedbackResult.summary}</div>
                        </div>
                        {feedbackResult.positive_themes?.length > 0 && (
                          <div style={{ marginBottom: '14px' }}>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: GREEN, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>✓ Temas positivos</div>
                            {feedbackResult.positive_themes.map((t, i) => <div key={i} style={{ fontSize: '12px', color: '#374151', padding: '5px 0', borderBottom: '1px solid #f0f2f7' }}>• {t}</div>)}
                          </div>
                        )}
                        {feedbackResult.negative_themes?.length > 0 && (
                          <div style={{ marginBottom: '14px' }}>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: RED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>✗ Áreas de mejora</div>
                            {feedbackResult.negative_themes.map((t, i) => <div key={i} style={{ fontSize: '12px', color: '#374151', padding: '5px 0', borderBottom: '1px solid #f0f2f7' }}>• {t}</div>)}
                          </div>
                        )}
                        {feedbackResult.urgent_issues?.length > 0 && (
                          <div style={{ marginBottom: '14px', padding: '12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: RED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>⚠ Urgente</div>
                            {feedbackResult.urgent_issues.map((t, i) => <div key={i} style={{ fontSize: '12px', color: RED }}>• {t}</div>)}
                          </div>
                        )}
                        {feedbackResult.recommendations?.length > 0 && (
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Recomendaciones</div>
                            {feedbackResult.recommendations.map((r, i) => <div key={i} style={{ fontSize: '12px', color: '#374151', padding: '5px 0', borderBottom: '1px solid #f0f2f7' }}>→ {r}</div>)}
                          </div>
                        )}
                      </>
                    )}
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