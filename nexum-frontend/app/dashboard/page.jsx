'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const API = 'http://127.0.0.1:8000'
const NAVY  = '#0B1426'
const GREEN = '#16a34a'
const AMBER = '#d97706'
const RED   = '#dc2626'
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
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => { if (token) loadNotifications() }, [token])

  async function loadNotifications() {
    setLoading(true)
    const notifs = []
    try {
      // Pull from multiple modules in parallel
      const [inboxRes, projectsRes, stockRes, sentimentRes] = await Promise.allSettled([
        fetch(`${API}/api/clientes/inbox`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/proyectos/resumen`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/ventas/alertas/stock`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/clientes/analytics`, { headers: { Authorization: `Bearer ${token}` } }),
      ])

      // Inbox — pending messages
      if (inboxRes.status === 'fulfilled' && inboxRes.value.ok) {
        const d = await inboxRes.value.json()
        if (d.requires_human > 0) notifs.push({ id: 'msg-1', type: 'urgent', icon: '💬', title: `${d.requires_human} mensaje${d.requires_human > 1 ? 's' : ''} requiere${d.requires_human > 1 ? 'n' : ''} atención`, desc: 'Un cliente necesita respuesta humana', href: '/clientes', time: 'Ahora' })
        if (d.pending > 0) notifs.push({ id: 'msg-2', type: 'info', icon: '📬', title: `${d.pending} mensaje${d.pending > 1 ? 's' : ''} pendiente${d.pending > 1 ? 's' : ''}`, desc: 'Revisa la bandeja de entrada', href: '/clientes', time: 'Hoy' })
      }

      // Projects — at risk
      if (projectsRes.status === 'fulfilled' && projectsRes.value.ok) {
        const d = await projectsRes.value.json()
        if (d.at_risk > 0) notifs.push({ id: 'proj-1', type: 'warning', icon: '📋', title: `${d.at_risk} proyecto${d.at_risk > 1 ? 's' : ''} en riesgo`, desc: 'Health score bajo — requiere acción', href: '/proyectos', time: 'Hoy' })
        if (d.urgent > 0) notifs.push({ id: 'proj-2', type: 'urgent', icon: '🚨', title: `${d.urgent} proyecto${d.urgent > 1 ? 's' : ''} urgente${d.urgent > 1 ? 's' : ''}`, desc: 'Fecha límite próxima o vencida', href: '/proyectos', time: 'Hoy' })
      }

      // Stock alerts
      if (stockRes.status === 'fulfilled' && stockRes.value.ok) {
        const d = await stockRes.value.json()
        if (d.total > 0) notifs.push({ id: 'stock-1', type: 'warning', icon: '📦', title: `${d.total} producto${d.total > 1 ? 's' : ''} con stock bajo`, desc: 'Reabastece antes de quedarte sin stock', href: '/ventas', time: 'Hoy' })
      }

      // Sentiment — at risk clients
      if (sentimentRes.status === 'fulfilled' && sentimentRes.value.ok) {
        const d = await sentimentRes.value.json()
        const atRisk = d.overview?.at_risk_contacts || 0
        if (atRisk > 0) notifs.push({ id: 'sent-1', type: 'warning', icon: '😟', title: `${atRisk} cliente${atRisk > 1 ? 's' : ''} en riesgo de pérdida`, desc: 'Sentimiento deteriorándose', href: '/clientes', time: 'Esta semana' })
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
    success: { color: GREEN, bg: '#f0fdf4', dot: GREEN },
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{ position: 'relative', width: '38px', height: '38px', borderRadius: '10px', border: '1px solid #e5e9f0', background: open ? '#f4f6fb' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '18px', height: '18px', borderRadius: '50%', background: RED, color: 'white', fontSize: '10px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: '46px', right: 0, width: '360px', background: 'white', borderRadius: '16px', border: '1px solid #e5e9f0', boxShadow: '0 16px 48px rgba(0,0,0,0.12)', zIndex: 200, overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid #f0f2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY }}>Notificaciones</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {unread > 0 && <span style={{ fontSize: '11px', fontWeight: '700', color: 'white', background: RED, padding: '2px 8px', borderRadius: '10px' }}>{unread} nueva{unread > 1 ? 's' : ''}</span>}
              <button onClick={loadNotifications} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#6b7280' }}>↻</button>
            </div>
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>Cargando...</div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '10px', opacity: 0.3 }}>🔔</div>
                <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>Todo en orden</div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>No hay notificaciones activas</div>
              </div>
            ) : notifications.map((n, i) => {
              const cfg = TYPE_CFG[n.type] || TYPE_CFG.info
              return (
                <div key={n.id} onClick={() => { router.push(n.href); setOpen(false) }}
                  style={{ padding: '13px 18px', borderBottom: i < notifications.length - 1 ? '1px solid #f8f9fc' : 'none', cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'flex-start', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>{n.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: NAVY, marginBottom: '2px' }}>{n.title}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{n.desc}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.dot, display: 'inline-block', flexShrink: 0 }} />
                      {n.time}
                    </div>
                  </div>
                  <span style={{ fontSize: '16px', color: '#d1d5db', flexShrink: 0 }}>›</span>
                </div>
              )
            })}
          </div>

          <div style={{ padding: '12px 18px', borderTop: '1px solid #f0f2f7', background: '#fafafa' }}>
            <button onClick={() => setOpen(false)} style={{ width: '100%', padding: '8px', background: 'none', border: '1px solid #e5e9f0', borderRadius: '8px', fontSize: '12px', color: '#6b7280', cursor: 'pointer', fontFamily: "'DM Sans', system-ui" }}>
              Ver todas las notificaciones
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Profile Dropdown ───────────────────────────────────────────────────────────
function ProfileButton({ user }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  const router = useRouter()

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : 'US'

  function logout() { localStorage.removeItem('nexum_token'); router.push('/login') }

  const menuItems = [
    { icon: '👤', label: 'Mi perfil',          desc: user?.email || '',          action: () => {} },
    { icon: '💳', label: 'Suscripción',         desc: 'Plan Pro · Activo',         action: () => router.push('/settings?tab=subscription') },
    { icon: '⚙️', label: 'Configuración',       desc: 'Empresa, equipo, accesos',  action: () => router.push('/settings') },
    { icon: '🔔', label: 'Notificaciones',      desc: 'Preferencias de alertas',   action: () => router.push('/settings?tab=notifications') },
  ]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 10px 5px 5px', borderRadius: '10px', border: '1px solid #e5e9f0', background: open ? '#f4f6fb' : 'white', cursor: 'pointer', transition: 'all 0.15s' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '11px', fontWeight: '800', letterSpacing: '0.02em', flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: NAVY, lineHeight: 1.2 }}>{user?.name?.split(' ')[0] || 'Usuario'}</div>
          <div style={{ fontSize: '10px', color: '#9ca3af', lineHeight: 1.2 }}>Pro</div>
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: '2px', color: '#9ca3af', flexShrink: 0 }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{ position: 'absolute', top: '46px', right: 0, width: '280px', background: 'white', borderRadius: '16px', border: '1px solid #e5e9f0', boxShadow: '0 16px 48px rgba(0,0,0,0.12)', zIndex: 200, overflow: 'hidden' }}>
          {/* User header */}
          <div style={{ padding: '16px 18px', borderBottom: '1px solid #f0f2f7', display: 'flex', alignItems: 'center', gap: '12px', background: '#fafafa' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '16px', fontWeight: '800', flexShrink: 0 }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY }}>{user?.name || 'Usuario'}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>{user?.email || ''}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '3px', background: '#eff6ff', padding: '2px 8px', borderRadius: '6px' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: BLUE, display: 'inline-block' }} />
                <span style={{ fontSize: '10px', fontWeight: '700', color: BLUE }}>Plan Pro</span>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div style={{ padding: '8px 0' }}>
            {menuItems.map((item, i) => (
              <button key={i} onClick={() => { item.action(); setOpen(false) }}
                style={{ width: '100%', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s', fontFamily: "'DM Sans', system-ui" }}
                onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: NAVY }}>{item.label}</div>
                  {item.desc && <div style={{ fontSize: '11px', color: '#9ca3af' }}>{item.desc}</div>}
                </div>
              </button>
            ))}
          </div>

          <div style={{ padding: '8px 18px 14px', borderTop: '1px solid #f0f2f7' }}>
            <button onClick={logout} style={{ width: '100%', padding: '9px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: RED, fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans', system-ui" }}>
              Cerrar sesión
            </button>
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
      onMouseLeave={e => e.currentTarget.style.background = 'white'}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    </button>
  )
}

// ── Top Bar ────────────────────────────────────────────────────────────────────
function TopBar({ title, subtitle, token, user, actions }) {
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 13 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'
  const dateStr = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div style={{ background: 'white', borderBottom: '1px solid #e5e9f0', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: NAVY, letterSpacing: '-0.4px' }}>{title || greeting}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'capitalize' }}>{subtitle || dateStr}</div>
        </div>
        {actions}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <SettingsButton />
        <NotificationCenter token={token} />
        <ProfileButton user={user} />
      </div>
    </div>
  )
}

// ── Mini Chart ─────────────────────────────────────────────────────────────────
function Sparkline({ data = [], color = BLUE, height = 40 }) {
  if (!data.length) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const W = 120, H = height
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W
    const y = H - ((v - min) / range) * H * 0.85 - H * 0.075
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={data.length > 1 ? W : 0} cy={H - ((data[data.length-1] - min) / range) * H * 0.85 - H * 0.075} r="3" fill={color} />
    </svg>
  )
}

// ── Quick Chat ─────────────────────────────────────────────────────────────────
function QuickChat({ token }) {
  const [msg, setMsg] = useState('')
  const [resp, setResp] = useState('')
  const [loading, setLoading] = useState(false)

  async function send() {
    if (!msg.trim() || !token) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/agente/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mensaje: msg, historial: [] })
      })
      const data = await res.json()
      setResp(data.respuesta || '')
      setMsg('')
    } catch { } finally { setLoading(false) }
  }

  const suggestions = ['¿Cuál es mi margen este mes?', '¿Qué producto vende más?', '¿Tengo facturas pendientes?']

  return (
    <div>
      {!resp && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {suggestions.map(s => (
            <button key={s} onClick={() => { setMsg(s); }} style={{ padding: '5px 10px', borderRadius: '20px', border: '1px solid #e5e9f0', background: '#f8faff', color: '#374151', fontSize: '11px', cursor: 'pointer', fontFamily: "'DM Sans', system-ui", transition: 'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
              onMouseLeave={e => e.currentTarget.style.background = '#f8faff'}
            >{s}</button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input placeholder="Pregunta sobre tu negocio..." value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
          style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e5e9f0', fontSize: '13px', fontFamily: "'DM Sans', system-ui", outline: 'none', background: '#fafafa' }}
          onFocus={e => { e.target.style.borderColor = NAVY; e.target.style.background = 'white' }}
          onBlur={e => { e.target.style.borderColor = '#e5e9f0'; e.target.style.background = '#fafafa' }}
        />
        <button onClick={send} disabled={loading || !msg.trim()} style={{ padding: '10px 16px', borderRadius: '10px', border: 'none', background: loading ? '#e5e9f0' : NAVY, color: loading ? '#9ca3af' : 'white', fontWeight: '700', fontSize: '14px', cursor: loading || !msg.trim() ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', system-ui", flexShrink: 0 }}>
          {loading ? '⋯' : '→'}
        </button>
      </div>
      {resp && (
        <div style={{ marginTop: '12px', padding: '14px', background: '#f8faff', borderRadius: '10px', fontSize: '13px', color: '#374151', lineHeight: '1.65', maxHeight: '180px', overflowY: 'auto', border: '1px solid #e5e9f0', position: 'relative' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: BLUE, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>🤖 Agente Vortu</div>
          {resp}
          <button onClick={() => setResp('')} style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#9ca3af' }}>×</button>
        </div>
      )}
    </div>
  )
}

// ── Module Quick Access ────────────────────────────────────────────────────────
function ModuleCard({ icon, title, desc, href, stat, statLabel, statColor = NAVY }) {
  return (
    <a href={href} style={{ display: 'block', textDecoration: 'none', background: 'white', borderRadius: '14px', border: '1px solid #e5e9f0', padding: '18px', transition: 'all 0.15s', cursor: 'pointer' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.07)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#f4f6fb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>{icon}</div>
        <span style={{ fontSize: '10px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>→</span>
      </div>
      <div style={{ fontSize: '13px', fontWeight: '700', color: NAVY, marginBottom: '3px' }}>{title}</div>
      <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '10px' }}>{desc}</div>
      {stat !== undefined && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontSize: '18px', fontWeight: '800', color: statColor, letterSpacing: '-0.5px' }}>{stat}</span>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>{statLabel}</span>
        </div>
      )}
    </a>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter()
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [resumen, setResumen] = useState(null)
  const [ventas, setVentas] = useState(null)
  const [clientes, setClientes] = useState(null)
  const [proyectos, setProyectos] = useState(null)
  const [loading, setLoading] = useState(true)
  const [billingStatus, setBillingStatus] = useState(null)

  useEffect(() => {
    const t = localStorage.getItem('nexum_token')
    if (!t) { router.push('/login'); return }
    setToken(t)

    // Decode JWT to get user info
    try {
      const payload = JSON.parse(atob(t.split('.')[1]))
      setUser({ email: payload.sub || '', name: payload.name || payload.sub || 'Usuario' })
      if (payload.is_admin === true) setIsAdmin(true)
    } catch { setUser({ email: '', name: 'Usuario' }) }
  }, [])

  useEffect(() => {
    if (!token) return
    loadAll()
    fetch(`${API}/api/billing/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setBillingStatus(d) })
      .catch(() => {})
  }, [token])

  async function loadAll() {
    setLoading(true)
    const headers = { Authorization: `Bearer ${token}` }
    const [r1, r2, r3, r4] = await Promise.allSettled([
      fetch(`${API}/api/agente/resumen`, { headers }),
      fetch(`${API}/api/ventas/resumen`, { headers }),
      fetch(`${API}/api/clientes/analytics`, { headers }),
      fetch(`${API}/api/proyectos/resumen`, { headers }),
    ])
    if (r1.status === 'fulfilled' && r1.value.ok) setResumen(await r1.value.json())
    if (r2.status === 'fulfilled' && r2.value.ok) setVentas(await r2.value.json())
    if (r3.status === 'fulfilled' && r3.value.ok) setClientes(await r3.value.json())
    if (r4.status === 'fulfilled' && r4.value.ok) setProyectos(await r4.value.json())
    setLoading(false)
  }

  const d = resumen?.ultimos_30_dias || {}
  const esPositivo = (d.resultado_neto || 0) >= 0

  // Build sparkline data from daily revenue
  const sparkData = ventas?.daily_revenue?.map(d => d.revenue) || []

  const card = { background: 'white', borderRadius: '14px', border: '1px solid #e5e9f0' }

  if (billingStatus && !billingStatus.has_access) {
    return (
      <div style={{ minHeight: '100vh', background: '#f4f6fb', display: 'flex', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <Sidebar active="/dashboard" />
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {/* Dashboard borroso detrás */}
          <div style={{ filter: 'blur(4px)', opacity: 0.4, pointerEvents: 'none', padding: '32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              {['Ingresos', 'Gastos', 'Margen', 'Ventas'].map(k => (
                <div key={k} style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>{k}</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#0B1426' }}>███</div>
                  <div style={{ fontSize: '12px', color: '#d1d5db', marginTop: '4px' }}>██████</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
              <div style={{ background: 'white', borderRadius: '12px', padding: '20px', height: '200px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0B1426', marginBottom: '12px' }}>Actividad reciente</div>
                {[1,2,3,4].map(i => <div key={i} style={{ height: '12px', background: '#f1f5f9', borderRadius: '6px', marginBottom: '10px', width: `${60 + i*10}%` }} />)}
              </div>
              <div style={{ background: 'white', borderRadius: '12px', padding: '20px', height: '200px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0B1426', marginBottom: '12px' }}>Agente IA</div>
                {[1,2,3].map(i => <div key={i} style={{ height: '12px', background: '#f1f5f9', borderRadius: '6px', marginBottom: '10px' }} />)}
              </div>
            </div>
          </div>
          {/* Overlay central */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', borderRadius: '20px', padding: '40px 48px', maxWidth: '460px', width: '90%', boxShadow: '0 24px 48px rgba(0,0,0,0.12)', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏸</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#0B1426', marginBottom: '8px', letterSpacing: '-0.5px' }}>Tu negocio te está esperando</div>
              <div style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.6, marginBottom: '24px' }}>
                Tienes datos, clientes y proyectos activos en Vortu.<br/>
                Reactiva tu plan para continuar donde lo dejaste.
              </div>
              <a href="/settings?tab=subscription" style={{ display: 'block', padding: '14px', borderRadius: '10px', background: '#0B1426', color: 'white', fontSize: '15px', fontWeight: '800', textDecoration: 'none', marginBottom: '12px' }}>
                Retomar acceso →
              </a>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>Tus datos están seguros y te esperan</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6fb', display: 'flex', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      <Sidebar active="/dashboard" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'hidden' }}>

        <TopBar token={token} user={user} />

        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#9ca3af' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'pulse 1.5s ease infinite' }}>◈</div>
                <div style={{ fontSize: '14px' }}>Cargando dashboard...</div>
              </div>
            </div>
          ) : (
            <>
              {/* ── KPI STRIP ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
                {[
                  {
                    label: 'Ingresos (30 días)',
                    value: `€${(d.ingresos || 0).toLocaleString('es-ES')}`,
                    color: NAVY,
                    sub: 'últimos 30 días',
                    icon: '↑',
                    iconColor: GREEN,
                  },
                  {
                    label: 'Gastos (30 días)',
                    value: `€${(d.gastos || 0).toLocaleString('es-ES')}`,
                    color: NAVY,
                    sub: 'últimos 30 días',
                    icon: '↓',
                    iconColor: RED,
                  },
                  {
                    label: 'Resultado neto',
                    value: `€${(d.resultado_neto || 0).toLocaleString('es-ES')}`,
                    color: esPositivo ? GREEN : RED,
                    sub: `Margen ${d.margen || 0}%`,
                    icon: esPositivo ? '✓' : '⚠',
                    iconColor: esPositivo ? GREEN : RED,
                  },
                  {
                    label: 'Ventas hoy',
                    value: `€${(ventas?.today?.total_revenue || 0).toFixed(2)}`,
                    color: NAVY,
                    sub: `${ventas?.today?.total_sales || 0} transacciones`,
                    icon: '🛒',
                    iconColor: BLUE,
                  },
                ].map((kpi, i) => (
                  <div key={i} style={{ ...card, padding: '20px', animation: `fadeUp 0.3s ease ${i * 0.06}s both` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{kpi.label}</span>
                      <span style={{ fontSize: '13px', color: kpi.iconColor, fontWeight: '700' }}>{kpi.icon}</span>
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: '800', color: kpi.color, letterSpacing: '-0.8px', marginBottom: '4px' }}>{kpi.value}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>{kpi.sub}</div>
                  </div>
                ))}
              </div>

              {/* ── MAIN GRID ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '16px', marginBottom: '16px' }}>

                {/* Revenue chart */}
                <div style={{ ...card, padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY, marginBottom: '2px' }}>Ingresos — últimos 14 días</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>Ventas diarias acumuladas</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: GREEN }}>€{(ventas?.week?.total_revenue || 0).toFixed(0)}</div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>esta semana</div>
                    </div>
                  </div>
                  {/* Bar chart */}
                  {sparkData.length > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px', height: '100px' }}>
                      {(ventas?.daily_revenue || []).map((d, i) => {
                        const maxVal = Math.max(...(ventas?.daily_revenue || []).map(x => x.revenue), 1)
                        const h = Math.max((d.revenue / maxVal) * 80, d.revenue > 0 ? 3 : 0)
                        const isToday = i === (ventas?.daily_revenue?.length || 1) - 1
                        return (
                          <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                            <div style={{ fontSize: '9px', color: isToday ? NAVY : 'transparent', fontWeight: '700' }}>€{d.revenue.toFixed(0)}</div>
                            <div style={{ width: '100%', background: isToday ? NAVY : '#e5e9f0', borderRadius: '4px 4px 0 0', height: `${h}px`, transition: 'height 0.6s ease', minHeight: d.revenue > 0 ? '3px' : '0' }} />
                            <div style={{ fontSize: '8px', color: '#9ca3af', transform: 'rotate(-30deg)', transformOrigin: 'center', whiteSpace: 'nowrap' }}>{d.label}</div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '13px' }}>
                      Sin datos de ventas aún
                    </div>
                  )}
                </div>

                {/* AI Chat */}
                <div style={{ ...card, padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>🤖</div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY }}>Agente Vortu</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: GREEN, display: 'inline-block', animation: 'pulse 2s ease infinite' }} />
                        <span style={{ fontSize: '11px', color: '#6b7280' }}>En línea</span>
                      </div>
                    </div>
                  </div>
                  <QuickChat token={token} />
                  <a href="/agente" style={{ display: 'block', textAlign: 'center', marginTop: '12px', fontSize: '12px', color: BLUE, textDecoration: 'none', fontWeight: '600' }}>
                    Abrir chat completo →
                  </a>
                </div>
              </div>

              {/* ── SECONDARY GRID ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

                {/* Alerts */}
                <div style={{ ...card, padding: '20px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY, marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Estado del negocio</span>
                    <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: resumen?.estado === 'saludable' ? '#f0fdf4' : '#fffbeb', color: resumen?.estado === 'saludable' ? GREEN : AMBER, fontWeight: '700' }}>
                      {resumen?.estado === 'saludable' ? '✓ Saludable' : '⚠ Atención'}
                    </span>
                  </div>
                  {[
                    { label: 'Alertas activas',      value: resumen?.alertas_activas || 0,               color: (resumen?.alertas_activas || 0) > 0 ? RED : GREEN,   icon: '🔔' },
                    { label: 'Clientes en riesgo',   value: clientes?.overview?.at_risk_contacts || 0,   color: (clientes?.overview?.at_risk_contacts || 0) > 0 ? AMBER : GREEN, icon: '👥' },
                    { label: 'Proyectos en riesgo',  value: proyectos?.at_risk || 0,                     color: (proyectos?.at_risk || 0) > 0 ? AMBER : GREEN,       icon: '📋' },
                    { label: 'Stock bajo',            value: ventas?.low_stock_alerts?.length || 0,       color: (ventas?.low_stock_alerts?.length || 0) > 0 ? AMBER : GREEN, icon: '📦' },
                  ].map((row, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 3 ? '1px solid #f0f2f7' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '14px' }}>{row.icon}</span>
                        <span style={{ fontSize: '13px', color: '#374151' }}>{row.label}</span>
                      </div>
                      <span style={{ fontSize: '16px', fontWeight: '800', color: row.color }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* Best sellers */}
                <div style={{ ...card, padding: '20px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY, marginBottom: '14px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>🏆 Más vendidos este mes</span>
                    <a href="/ventas" style={{ fontSize: '12px', color: BLUE, textDecoration: 'none', fontWeight: '600' }}>Ver todo →</a>
                  </div>
                  {(ventas?.best_sellers || []).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af', fontSize: '13px' }}>Sin ventas registradas aún</div>
                  ) : (ventas?.best_sellers || []).slice(0, 4).map((p, i) => (
                    <div key={p.product_id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < 3 ? '1px solid #f0f2f7' : 'none' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: i === 0 ? '#FEF3C7' : i === 1 ? '#F1F5F9' : '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', color: i === 0 ? '#92400E' : i === 1 ? '#475569' : '#9A3412', flexShrink: 0 }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: NAVY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>{p.units_sold} uds</div>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: GREEN }}>€{p.revenue.toFixed(0)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── MODULE QUICK ACCESS ── */}
              <div style={{ ...card, padding: '20px', marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY, marginBottom: '14px' }}>Acceso rápido</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  <ModuleCard icon="📒" title="Contabilidad" desc="Partida doble · PGC"
                    stat={`€${(d.ingresos || 0).toLocaleString('es-ES')}`} statLabel="ingresos" statColor={GREEN}
                    href="/contabilidad" />
                  <ModuleCard icon="👥" title="Recursos Humanos" desc="Nóminas · IRPF · SS"
                    href="/hr" stat={resumen?.empleados || '—'} statLabel="empleados" />
                  <ModuleCard icon="💬" title="Clientes" desc="Bandeja unificada · IA"
                    stat={clientes?.overview?.pending_responses || 0} statLabel="pendientes"
                    statColor={(clientes?.overview?.pending_responses || 0) > 0 ? AMBER : GREEN}
                    href="/clientes" />
                  <ModuleCard icon="📋" title="Proyectos" desc="Health score · IA"
                    stat={proyectos?.total_projects || 0} statLabel="proyectos" href="/proyectos" />
                </div>
              </div>

              {/* ── CLIENT SENTIMENT STRIP ── */}
              {clientes && (
                <div style={{ ...card, padding: '20px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY, marginBottom: '14px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Sentimiento de clientes</span>
                    <a href="/clientes?tab=analytics" style={{ fontSize: '12px', color: BLUE, textDecoration: 'none', fontWeight: '600' }}>Analytics →</a>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    {[
                      { label: 'Satisfacción',    value: (clientes.overview?.avg_satisfaction || 0).toFixed(1) + '/10', color: GREEN },
                      { label: '% Positivos',     value: (clientes.sentiment_breakdown?.positive || 0) + '%', color: GREEN },
                      { label: '% Negativos',     value: (clientes.sentiment_breakdown?.negative || 0) + '%', color: RED   },
                      { label: 'Tiempo respuesta', value: clientes.overview?.avg_response_minutes ? `${clientes.overview.avg_response_minutes}min` : '—', color: NAVY },
                    ].map(s => (
                      <div key={s.label} style={{ background: '#f8faff', borderRadius: '10px', padding: '14px', textAlign: 'center', border: '1px solid #f0f2f7' }}>
                        <div style={{ fontSize: '20px', fontWeight: '800', color: s.color, marginBottom: '4px' }}>{s.value}</div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}