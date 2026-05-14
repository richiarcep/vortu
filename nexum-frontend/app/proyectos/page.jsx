'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const API   = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const NAVY  = '#0B1426'
const GREEN = '#16a34a'
const RED   = '#dc2626'
const AMBER = '#d97706'
const BLUE  = '#2563eb'
const CYAN  = '#00B4D8'

const STATUS_CFG = {
  activo:     { label: 'Activo',     color: '#1e3a8a', bg: '#eff6ff', dot: '#3b82f6' },
  borrador:   { label: 'Borrador',   color: '#374151', bg: '#f1f5f9', dot: '#9ca3af' },
  pausado:    { label: 'Pausado',    color: '#92400e', bg: '#fffbeb', dot: '#f59e0b' },
  completado: { label: 'Completado', color: '#1a6b4a', bg: '#f0fdf4', dot: '#22c55e' },
  cancelado:  { label: 'Cancelado',  color: '#991b1b', bg: '#fef2f2', dot: '#ef4444' },
}

const PRIORITY_CFG = {
  urgente: { color: RED,   bg: '#fef2f2', label: 'Urgente' },
  alta:    { color: AMBER, bg: '#fffbeb', label: 'Alta'    },
  media:   { color: BLUE,  bg: '#eff6ff', label: 'Media'   },
  baja:    { color: '#6b7280', bg: '#f1f5f9', label: 'Baja' },
}

const TASK_STATUS_CFG = {
  pendiente:   { label: 'Pendiente',   color: '#6b7280', bg: '#f8f9fc' },
  en_progreso: { label: 'En progreso', color: BLUE,      bg: '#eff6ff' },
  bloqueada:   { label: 'Bloqueada',   color: RED,       bg: '#fef2f2' },
  completada:  { label: 'Completada',  color: GREEN,     bg: '#f0fdf4' },
}

function healthColor(score) {
  if (score >= 8) return { text: GREEN,    bg: '#f0fdf4', border: '#bbf7d0', label: 'En buen camino', gradient: `linear-gradient(135deg, ${GREEN}, #4ade80)` }
  if (score >= 5) return { text: AMBER,    bg: '#fffbeb', border: '#fde68a', label: 'Atención',        gradient: `linear-gradient(135deg, ${AMBER}, #fcd34d)` }
  if (score >= 3) return { text: '#ea580c', bg: '#fff7ed', border: '#fed7aa', label: 'En riesgo',       gradient: 'linear-gradient(135deg, #ea580c, #fb923c)' }
  return               { text: RED,       bg: '#fef2f2', border: '#fecaca', label: 'Acción urgente',  gradient: `linear-gradient(135deg, ${RED}, #f87171)` }
}

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
        if (d.at_risk > 0) notifs.push({ id: 'proj-1', type: 'warning', icon: '📋', title: `${d.at_risk} proyecto${d.at_risk > 1 ? 's' : ''} en riesgo`, desc: 'Health score bajo — requiere acción', href: '/proyectos', time: 'Hoy' })
        if (d.urgent > 0) notifs.push({ id: 'proj-2', type: 'urgent', icon: '🚨', title: `${d.urgent} proyecto${d.urgent > 1 ? 's' : ''} urgente${d.urgent > 1 ? 's' : ''}`, desc: 'Fecha límite próxima o vencida', href: '/proyectos', time: 'Hoy' })
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

// ── Health Badge ───────────────────────────────────────────────────────────────
function HealthBadge({ score, size = 'sm' }) {
  const cfg = healthColor(score)
  const big = size === 'lg'
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: big ? '10px' : '6px', background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: big ? '12px' : '8px', padding: big ? '10px 16px' : '4px 10px' }}>
      <span style={{ fontSize: big ? '24px' : '14px', fontWeight: '800', color: cfg.text, letterSpacing: '-0.5px' }}>{score}</span>
      {big && <div><div style={{ fontSize: '11px', fontWeight: '700', color: cfg.text }}>Health Score</div><div style={{ fontSize: '11px', color: cfg.text, opacity: 0.7 }}>{cfg.label}</div></div>}
      {!big && <span style={{ fontSize: '11px', fontWeight: '600', color: cfg.text }}>{cfg.label}</span>}
    </div>
  )
}

// ── Upgraded Project Card ──────────────────────────────────────────────────────
function ProjectCard({ project, onClick }) {
  const status  = STATUS_CFG[project.status] || STATUS_CFG.activo
  const pct     = project.completion_percentage || 0
  const daysLeft = project.days_left
  const health  = project.health?.score || project.health_score || 10
  const hcfg    = healthColor(health)
  const overBudget = (project.total_spent || 0) > (project.budget || 0)

  return (
    <div onClick={onClick}
      style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e9f0', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-3px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {/* Top accent bar — health color */}
      <div style={{ height: '3px', background: hcfg.gradient }} />

      <div style={{ padding: '18px 20px 20px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '15px', fontWeight: '800', color: NAVY, marginBottom: '3px', letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</div>
            {project.client_name && (
              <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#f0f2f7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>👤</span>
                {project.client_name}
              </div>
            )}
          </div>
          <span style={{ fontSize: '11px', fontWeight: '700', color: status.color, background: status.bg, padding: '3px 10px', borderRadius: '6px', flexShrink: 0, marginLeft: '8px' }}>{status.label}</span>
        </div>

        {/* Progress section */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500' }}>Progreso</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: NAVY }}>{pct.toFixed(0)}%</span>
              <HealthBadge score={health} />
            </div>
          </div>
          <div style={{ height: '7px', background: '#f0f2f7', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: pct >= 80 ? hcfg.gradient : pct >= 40 ? `linear-gradient(90deg, ${BLUE}, ${CYAN})` : `linear-gradient(90deg, ${AMBER}, #fcd34d)`, borderRadius: '4px', width: `${pct}%`, transition: 'width 1s ease' }} />
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
          {[
            { label: 'Presupuesto', value: `€${Number(project.budget || 0).toLocaleString('es-ES')}`,      color: NAVY,                    icon: '💼' },
            { label: 'Gastado',     value: `€${Number(project.total_spent || 0).toLocaleString('es-ES')}`, color: overBudget ? RED : NAVY, icon: overBudget ? '⚠' : '💶' },
            { label: 'Horas',       value: `${(project.total_hours || 0).toFixed(0)}h`,                   color: NAVY,                    icon: '⏱' },
          ].map(s => (
            <div key={s.label} style={{ padding: '10px 8px', background: s.color === RED ? '#fef2f2' : '#f8faff', borderRadius: '10px', textAlign: 'center', border: `1px solid ${s.color === RED ? '#fecaca' : '#f0f2f7'}` }}>
              <div style={{ fontSize: '10px', marginBottom: '3px' }}>{s.icon}</div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: s.color, letterSpacing: '-0.3px' }}>{s.value}</div>
              <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '1px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #f0f2f7' }}>
          <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: '#6b7280' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: BLUE, display: 'inline-block' }} />
              {project.total_tasks || 0} tareas
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: GREEN, display: 'inline-block' }} />
              {project.completed_tasks || 0} hechas
            </span>
            {(project.blocked_tasks || 0) > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: RED, display: 'inline-block' }} />
                {project.blocked_tasks} bloqueadas
              </span>
            )}
          </div>
          {daysLeft !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', background: daysLeft < 0 ? '#fef2f2' : daysLeft <= 7 ? '#fffbeb' : '#f8faff' }}>
              <span style={{ fontSize: '10px' }}>{daysLeft < 0 ? '🔴' : daysLeft <= 7 ? '🟡' : '🟢'}</span>
              <span style={{ fontSize: '11px', fontWeight: '700', color: daysLeft < 0 ? RED : daysLeft <= 7 ? AMBER : '#6b7280' }}>
                {daysLeft < 0 ? `${Math.abs(daysLeft)}d vencido` : daysLeft === 0 ? 'Vence hoy' : `${daysLeft}d`}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── New Project Modal ──────────────────────────────────────────────────────────
function NewProjectModal({ onClose, onCreated, token }) {
  const [form, setForm] = useState({ name: '', description: '', client_name: '', start_date: '', deadline: '', budget: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!form.name.trim()) { setError('El nombre del proyecto es obligatorio'); return }
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/proyectos/`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...form, budget: parseFloat(form.budget) || 0 }) })
      if (res.ok) { const data = await res.json(); onCreated(data) }
      else { const e = await res.json(); setError(e.detail || 'Error al crear el proyecto') }
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '18px', width: '100%', maxWidth: '520px', boxShadow: '0 32px 80px rgba(0,0,0,0.2)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: NAVY, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'white', letterSpacing: '-0.3px' }}>Nuevo proyecto</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Vortu generará automáticamente el health score</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
        <div style={{ padding: '24px' }}>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: RED, fontSize: '13px' }}>{error}</div>}
          {[
            { key: 'name',        label: 'Nombre del proyecto *', placeholder: 'Rediseño web cliente A',    type: 'text' },
            { key: 'client_name', label: 'Cliente',               placeholder: 'Empresa XYZ (opcional)',   type: 'text' },
            { key: 'description', label: 'Descripción',           placeholder: 'Descripción del proyecto', type: 'text' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '5px' }}>{f.label}</label>
              <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} type={f.type}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '9px', border: '1.5px solid #e5e9f0', fontSize: '13px', color: '#1f2937', fontFamily: 'inherit', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = NAVY} onBlur={e => e.target.style.borderColor = '#e5e9f0'} />
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            {[
              { key: 'start_date', label: 'Fecha inicio',  type: 'date'   },
              { key: 'deadline',   label: 'Fecha límite',  type: 'date'   },
              { key: 'budget',     label: 'Presupuesto €', type: 'number' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '5px' }}>{f.label}</label>
                <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} type={f.type}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '9px', border: '1.5px solid #e5e9f0', fontSize: '13px', color: '#1f2937', fontFamily: 'inherit', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = NAVY} onBlur={e => e.target.style.borderColor = '#e5e9f0'} />
              </div>
            ))}
          </div>
          <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: '10px', border: 'none', background: loading ? '#e5e9f0' : NAVY, color: loading ? '#9ca3af' : 'white', fontWeight: '700', fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', letterSpacing: '-0.2px' }}>
            {loading ? 'Creando...' : '✓ Crear proyecto'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Task Card ──────────────────────────────────────────────────────────────────
function TaskCard({ task, onUpdate, token }) {
  const [updating, setUpdating] = useState(false)
  const cfg = TASK_STATUS_CFG[task.status] || TASK_STATUS_CFG.pendiente
  const pri = PRIORITY_CFG[task.priority] || PRIORITY_CFG.media
  const NEXT = { pendiente: 'en_progreso', en_progreso: 'completada', bloqueada: 'en_progreso', completada: 'pendiente' }
  async function cycleStatus() {
    setUpdating(true)
    try {
      const res = await fetch(`${API}/api/proyectos/tareas/${task.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status: NEXT[task.status] }) })
      if (res.ok) onUpdate()
    } catch { } finally { setUpdating(false) }
  }
  return (
    <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e5e9f0', padding: '11px 14px', marginBottom: '7px', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
      <button onClick={cycleStatus} disabled={updating} title="Cambiar estado"
        style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${cfg.color}`, background: task.status === 'completada' ? cfg.color : 'white', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'white', transition: 'all 0.15s' }}>
        {task.status === 'completada' ? '✓' : ''}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: task.status === 'completada' ? '#9ca3af' : NAVY, textDecoration: task.status === 'completada' ? 'line-through' : 'none', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10px', fontWeight: '600', color: pri.color, background: pri.bg, padding: '1px 6px', borderRadius: '4px' }}>{pri.label}</span>
          <span style={{ fontSize: '10px', fontWeight: '600', color: cfg.color, background: cfg.bg, padding: '1px 6px', borderRadius: '4px' }}>{cfg.label}</span>
          {task.due_date && <span style={{ fontSize: '10px', color: '#9ca3af' }}>📅 {task.due_date}</span>}
          {task.estimated_hours > 0 && <span style={{ fontSize: '10px', color: '#9ca3af' }}>⏱ {task.actual_hours}h/{task.estimated_hours}h</span>}
        </div>
      </div>
    </div>
  )
}

// ── Add Task Form ──────────────────────────────────────────────────────────────
function AddTaskForm({ projectId, token, onAdded }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', priority: 'media', due_date: '', estimated_hours: '' })
  const [loading, setLoading] = useState(false)
  async function handleAdd() {
    if (!form.title.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/proyectos/${projectId}/tareas`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...form, estimated_hours: parseFloat(form.estimated_hours) || 0 }) })
      if (res.ok) { setForm({ title: '', priority: 'media', due_date: '', estimated_hours: '' }); setOpen(false); onAdded() }
    } catch { } finally { setLoading(false) }
  }
  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1.5px dashed #d1d5db', background: 'none', color: '#9ca3af', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', marginTop: '6px', transition: 'all 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = NAVY; e.currentTarget.style.color = NAVY }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#9ca3af' }}>
      + Añadir tarea
    </button>
  )
  return (
    <div style={{ background: '#f8faff', borderRadius: '10px', border: '1px solid #e5e9f0', padding: '14px', marginTop: '6px' }}>
      <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Título de la tarea..." autoFocus
        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #e5e9f0', fontSize: '13px', fontFamily: 'inherit', marginBottom: '10px', outline: 'none' }}
        onFocus={e => e.target.style.borderColor = NAVY} onBlur={e => e.target.style.borderColor = '#e5e9f0'}
        onKeyDown={e => e.key === 'Enter' && handleAdd()} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
        <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} style={{ padding: '8px', borderRadius: '8px', border: '1.5px solid #e5e9f0', fontSize: '12px', fontFamily: 'inherit', outline: 'none' }}>
          <option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option><option value="urgente">Urgente</option>
        </select>
        <input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} style={{ padding: '8px', borderRadius: '8px', border: '1.5px solid #e5e9f0', fontSize: '12px', fontFamily: 'inherit', outline: 'none' }} />
        <input type="number" value={form.estimated_hours} onChange={e => setForm(p => ({ ...p, estimated_hours: e.target.value }))} placeholder="Horas est." style={{ padding: '8px', borderRadius: '8px', border: '1.5px solid #e5e9f0', fontSize: '12px', fontFamily: 'inherit', outline: 'none' }} />
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={handleAdd} disabled={loading} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none', background: NAVY, color: 'white', fontWeight: '600', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>{loading ? 'Añadiendo...' : 'Añadir'}</button>
        <button onClick={() => setOpen(false)} style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #e5e9f0', background: 'white', color: '#374151', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
      </div>
    </div>
  )
}

// ── Project Detail Panel ───────────────────────────────────────────────────────
function ProjectDetail({ projectId, token, onClose, onUpdate }) {
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analysis, setAnalysis] = useState(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('tareas')
  const [reportLoading, setReportLoading] = useState(false)

  async function fetchProject() {
    try { const res = await fetch(`${API}/api/proyectos/${projectId}`, { headers: { Authorization: `Bearer ${token}` } }); if (res.ok) setProject(await res.json()) }
    catch { } finally { setLoading(false) }
  }
  async function fetchAnalysis() {
    setAnalysisLoading(true)
    try { const res = await fetch(`${API}/api/proyectos/${projectId}/analisis`, { headers: { Authorization: `Bearer ${token}` } }); if (res.ok) setAnalysis(await res.json()) }
    catch { } finally { setAnalysisLoading(false) }
  }
  async function downloadReport() {
    setReportLoading(true)
    try {
      const res = await fetch(`${API}/api/proyectos/${projectId}/reporte`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `proyecto_${projectId}.pdf`; a.click(); URL.revokeObjectURL(url) }
    } catch { } finally { setReportLoading(false) }
  }
  useEffect(() => { fetchProject() }, [projectId])

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'pulse 1.5s ease infinite' }}>📋</div>
        <div style={{ fontSize: '14px', color: '#6b7280' }}>Cargando proyecto...</div>
      </div>
    </div>
  )
  if (!project) return null

  const health   = project.health || {}
  const velocity = project.velocity || {}
  const tasks    = project.tasks || []
  const hcfg     = healthColor(health.score || 10)
  const byStatus = {
    pendiente:   tasks.filter(t => t.status === 'pendiente'),
    en_progreso: tasks.filter(t => t.status === 'en_progreso'),
    bloqueada:   tasks.filter(t => t.status === 'bloqueada'),
    completada:  tasks.filter(t => t.status === 'completada'),
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={onClose}>
      <div style={{ background: '#f4f6fb', borderRadius: '20px', width: '100%', maxWidth: '1060px', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 40px 100px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>

        {/* Header — navy with gradient accent */}
        <div style={{ background: NAVY, padding: '0', overflow: 'hidden' }}>
          <div style={{ height: '3px', background: hcfg.gradient }} />
          <div style={{ padding: '20px 28px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
                {project.client_name || 'Proyecto interno'}
              </div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: 'white', letterSpacing: '-0.6px' }}>{project.name}</div>
            </div>
            <HealthBadge score={health.score || 10} size="lg" />
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', width: '34px', height: '34px', borderRadius: '9px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{ background: 'white', borderBottom: '1px solid #e5e9f0', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {[
            { label: 'Completado',     value: `${(project.completion_percentage || 0).toFixed(0)}%`, color: NAVY },
            { label: 'Presupuesto',    value: `€${Number(project.budget || 0).toLocaleString('es-ES')}`, color: NAVY },
            { label: 'Gastado',        value: `€${Number(project.total_spent || 0).toLocaleString('es-ES')}`, color: (project.total_spent || 0) > (project.budget || 0) ? RED : NAVY },
            { label: 'Horas',          value: `${(project.total_hours || 0).toFixed(1)}h`, color: NAVY },
            { label: 'Días restantes', value: project.days_left !== null ? (project.days_left < 0 ? `${Math.abs(project.days_left)}d vencido` : `${project.days_left}d`) : '—', color: project.days_left < 0 ? RED : project.days_left <= 7 ? AMBER : NAVY },
          ].map((k, i) => (
            <div key={k.label} style={{ textAlign: 'center', padding: '14px 8px', borderRight: i < 4 ? '1px solid #f0f2f7' : 'none' }}>
              <div style={{ fontSize: '20px', fontWeight: '800', color: k.color, letterSpacing: '-0.5px' }}>{k.value}</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div style={{ background: 'white', padding: '0 28px', borderBottom: '1px solid #e5e9f0', display: 'flex' }}>
          {[{ id: 'tareas', label: '📋 Tareas' }, { id: 'analisis', label: '🧠 Análisis IA' }, { id: 'velocity', label: '📈 Velocidad' }].map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id === 'analisis' && !analysis) fetchAnalysis() }}
              style={{ padding: '14px 18px', background: 'none', border: 'none', borderBottom: activeTab === tab.id ? `2px solid ${NAVY}` : '2px solid transparent', color: activeTab === tab.id ? NAVY : '#6b7280', fontWeight: activeTab === tab.id ? '700' : '400', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
              {tab.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={downloadReport} disabled={reportLoading} style={{ padding: '10px 16px', margin: '6px 0', borderRadius: '8px', border: '1px solid #e5e9f0', background: 'white', color: NAVY, fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {reportLoading ? '⏳ Generando...' : '📄 Descargar PDF'}
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {activeTab === 'tareas' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
              {Object.entries(byStatus).map(([status, statusTasks]) => {
                const cfg = TASK_STATUS_CFG[status]
                return (
                  <div key={status} style={{ background: 'white', borderRadius: '14px', border: '1px solid #e5e9f0', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #f0f2f7' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
                      <span style={{ fontSize: '11px', fontWeight: '800', color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cfg.label}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: '700', color: 'white', background: cfg.color, padding: '1px 7px', borderRadius: '10px' }}>{statusTasks.length}</span>
                    </div>
                    {statusTasks.map(task => <TaskCard key={task.id} task={task} token={token} onUpdate={() => { fetchProject(); onUpdate() }} />)}
                    {status === 'pendiente' && <AddTaskForm projectId={project.id} token={token} onAdded={() => { fetchProject(); onUpdate() }} />}
                  </div>
                )
              })}
            </div>
          )}

          {activeTab === 'analisis' && (
            <div>
              {analysisLoading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'pulse 1.5s ease infinite' }}>🧠</div>
                  <div style={{ fontSize: '14px', fontWeight: '500' }}>Claude está analizando el proyecto...</div>
                </div>
              ) : analysis ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={{ gridColumn: '1 / -1', background: '#f8faff', borderRadius: '14px', border: '1px solid #e5e9f0', padding: '20px', borderLeft: `4px solid ${NAVY}` }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: NAVY, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>📋 Resumen ejecutivo</div>
                    <p style={{ margin: 0, fontSize: '13.5px', color: '#374151', lineHeight: '1.7' }}>{analysis.resumen_ejecutivo}</p>
                  </div>
                  {analysis.accion_hoy && (
                    <div style={{ gridColumn: '1 / -1', background: NAVY, borderRadius: '14px', padding: '18px 22px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>⚡</div>
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Acción prioritaria hoy</div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'white', lineHeight: '1.5' }}>{analysis.accion_hoy}</div>
                      </div>
                    </div>
                  )}
                  {analysis.riesgos?.length > 0 && (
                    <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e5e9f0', padding: '18px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '800', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>⚠ Riesgos</div>
                      {analysis.riesgos.map((r, i) => {
                        const sev = r.severidad === 'alta' ? RED : r.severidad === 'media' ? AMBER : '#6b7280'
                        return (
                          <div key={i} style={{ marginBottom: '10px', padding: '12px', background: '#fafafa', borderRadius: '10px', borderLeft: `3px solid ${sev}` }}>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: sev, marginBottom: '4px' }}>{r.tipo}</div>
                            <div style={{ fontSize: '12px', color: '#374151', lineHeight: '1.5' }}>{r.descripcion}</div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {analysis.recomendaciones?.length > 0 && (
                    <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e5e9f0', padding: '18px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '800', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>💡 Recomendaciones</div>
                      {analysis.recomendaciones.map((r, i) => (
                        <div key={i} style={{ marginBottom: '10px', padding: '12px', background: '#fafafa', borderRadius: '10px', display: 'flex', gap: '10px' }}>
                          <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '11px', fontWeight: '800', flexShrink: 0 }}>{r.prioridad}</div>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: NAVY, marginBottom: '2px' }}>{r.accion}</div>
                            <div style={{ fontSize: '11px', color: '#9ca3af' }}>{r.responsable} · {r.plazo}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {analysis.prediccion && (
                    <div style={{ gridColumn: '1 / -1', background: 'white', borderRadius: '14px', border: '1px solid #e5e9f0', padding: '18px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '800', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>🔮 Predicción</div>
                      <p style={{ margin: 0, fontSize: '13.5px', color: '#374151', lineHeight: '1.7', fontStyle: 'italic' }}>{analysis.prediccion}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '80px' }}>
                  <div style={{ fontSize: '56px', marginBottom: '20px', opacity: 0.2 }}>🧠</div>
                  <div style={{ fontWeight: '800', color: NAVY, fontSize: '18px', marginBottom: '8px', letterSpacing: '-0.4px' }}>Análisis IA no generado</div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px' }}>Claude analizará el estado del proyecto, detectará riesgos y propondrá acciones</div>
                  <button onClick={fetchAnalysis} style={{ padding: '12px 28px', borderRadius: '10px', border: 'none', background: NAVY, color: 'white', fontWeight: '700', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Generar análisis con Claude
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'velocity' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {[
                { label: 'Velocidad',          value: `${velocity.velocity_per_day || 0} tareas/día`, icon: '⚡', color: BLUE  },
                { label: 'Completadas (7d)',    value: velocity.tasks_completed_last_7_days || 0,      icon: '✅', color: GREEN },
                { label: 'Tareas restantes',   value: velocity.remaining_tasks || 0,                  icon: '📋', color: NAVY  },
                { label: 'Fin estimado',        value: velocity.predicted_completion_date || '—',      icon: '📅', color: NAVY  },
                { label: 'Terminará a tiempo', value: velocity.will_finish_on_time === null ? '—' : velocity.will_finish_on_time ? '✅ Sí' : '❌ No', icon: '🎯', color: velocity.will_finish_on_time ? GREEN : RED },
                { label: 'Coste acumulado',     value: `€${Number(velocity.total_cost_so_far || 0).toLocaleString('es-ES')}`, icon: '💶', color: NAVY },
              ].map(m => (
                <div key={m.label} style={{ background: 'white', borderRadius: '14px', border: '1px solid #e5e9f0', padding: '18px', display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#f4f6fb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>{m.icon}</div>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: m.color, letterSpacing: '-0.5px' }}>{m.value}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{m.label}</div>
                  </div>
                </div>
              ))}
              {velocity.recommendation && (
                <div style={{ gridColumn: '1 / -1', background: '#f8faff', borderRadius: '14px', border: '1px solid #e5e9f0', padding: '18px', borderLeft: `4px solid ${NAVY}` }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: NAVY, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Recomendación</div>
                  <p style={{ margin: 0, fontSize: '13.5px', color: '#374151', lineHeight: '1.7' }}>{velocity.recommendation}</p>
                </div>
              )}
              {velocity.budget_warning && (
                <div style={{ gridColumn: '1 / -1', background: '#fffbeb', borderRadius: '14px', border: '1px solid #fde68a', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>⚠️</span>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#92400e' }}>{velocity.budget_warning}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ProyectosPage() {
  const router = useRouter()
  const [projects, setProjects]   = useState([])
  const [summary, setSummary]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [showNew, setShowNew]     = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [filter, setFilter]       = useState('all')
  const [token, setToken]         = useState(null)
  const [user, setUser]           = useState(null)

  useEffect(() => {
    const t = localStorage.getItem('nexum_token')
    if (!t) { router.push('/login'); return }
    setToken(t)
    try {
      const payload = JSON.parse(atob(t.split('.')[1]))
      setUser({ email: payload.sub || '', name: payload.name || payload.sub || 'Usuario' })
    } catch { setUser({ email: '', name: 'Usuario' }) }
  }, [])

  async function fetchProjects(t) {
    const tk = t || token
    if (!tk) return
    try {
      const [projRes, sumRes] = await Promise.all([
        fetch(`${API}/api/proyectos/`, { headers: { Authorization: `Bearer ${tk}` } }),
        fetch(`${API}/api/proyectos/resumen`, { headers: { Authorization: `Bearer ${tk}` } }),
      ])
      if (projRes.ok) { const d = await projRes.json(); setProjects(d.projects || []) }
      if (sumRes.ok) setSummary(await sumRes.json())
    } catch { } finally { setLoading(false) }
  }

  useEffect(() => { if (token) fetchProjects(token) }, [token])

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter)

  const FILTERS = [
    { key: 'all',        label: 'Todos',      count: projects.length },
    { key: 'activo',     label: 'Activos',    count: projects.filter(p => p.status === 'activo').length },
    { key: 'pausado',    label: 'Pausados',   count: projects.filter(p => p.status === 'pausado').length },
    { key: 'completado', label: 'Completados',count: projects.filter(p => p.status === 'completado').length },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f6fb', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes slideIn{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}
        *{box-sizing:border-box;} input:focus,select:focus,textarea:focus{outline:none;}
        ::-webkit-scrollbar{width:5px;} ::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:3px;}
      `}</style>

      <Sidebar active="/proyectos" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'hidden' }}>

        {/* ── TOP BAR ── */}
        <div style={{ background: 'white', borderBottom: '1px solid #e5e9f0', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ paddingRight: '24px', marginRight: '8px', borderRight: '1px solid #f0f2f7' }}>
              <div style={{ fontSize: '16px', fontWeight: '800', color: NAVY, letterSpacing: '-0.4px' }}>📋 Proyectos</div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>Gestión inteligente · Health score · IA 24/7</div>
            </div>
            <div style={{ display: 'flex' }}>
              {FILTERS.map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  style={{ padding: '0 14px', height: '64px', background: 'none', border: 'none', borderBottom: filter === f.key ? `2px solid ${NAVY}` : '2px solid transparent', color: filter === f.key ? NAVY : '#6b7280', fontWeight: filter === f.key ? '700' : '400', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', system-ui", transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {f.label}
                  {f.count > 0 && <span style={{ fontSize: '10px', fontWeight: '700', background: filter === f.key ? NAVY : '#f0f2f7', color: filter === f.key ? 'white' : '#6b7280', padding: '1px 6px', borderRadius: '8px', transition: 'all 0.15s' }}>{f.count}</span>}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <SettingsButton />
            <NotificationCenter token={token} />
            <ProfileButton user={user} />
            <button onClick={() => setShowNew(true)} style={{ padding: '9px 18px', borderRadius: '9px', border: 'none', background: NAVY, color: 'white', fontWeight: '700', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', system-ui", marginLeft: '4px' }}>
              + Nuevo proyecto
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>

          {/* Summary KPI cards */}
          {summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px', animation: 'fadeUp 0.3s ease' }}>
              {[
                { label: 'Total proyectos',  value: summary.total_projects, color: NAVY,    bg: 'white',   icon: '📋', border: NAVY  },
                { label: 'Activos',          value: summary.active,         color: '#1e3a8a', bg: '#eff6ff', icon: '▶',  border: '#3b82f6' },
                { label: 'En riesgo',        value: summary.at_risk,        color: '#92400e', bg: '#fffbeb', icon: '⚠',  border: '#f59e0b' },
                { label: 'Urgentes',         value: summary.urgent,         color: '#991b1b', bg: '#fef2f2', icon: '🚨', border: RED   },
                { label: 'Health promedio',  value: summary.average_health, color: '#1a6b4a', bg: '#f0fdf4', icon: '💚', border: GREEN },
              ].map((s, i) => (
                <div key={s.label} style={{ background: s.bg, borderRadius: '14px', border: `1px solid ${s.border}20`, padding: '16px', textAlign: 'center', position: 'relative', overflow: 'hidden', animation: `fadeUp 0.3s ease ${i * 0.06}s both` }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: s.border, opacity: 0.6 }} />
                  <div style={{ fontSize: '14px', marginBottom: '6px', opacity: 0.7 }}>{s.icon}</div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: s.color, letterSpacing: '-0.8px', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Project grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '100px', color: '#9ca3af' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'pulse 1.5s ease infinite' }}>📋</div>
              <div style={{ fontSize: '15px', fontWeight: '500' }}>Cargando proyectos...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ background: 'white', borderRadius: '18px', border: '1px solid #e5e9f0', padding: '100px', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '20px', opacity: 0.2 }}>📋</div>
              <div style={{ fontWeight: '800', color: NAVY, fontSize: '20px', marginBottom: '10px', letterSpacing: '-0.5px' }}>
                {filter === 'all' ? 'No hay proyectos aún' : `No hay proyectos ${FILTERS.find(f => f.key === filter)?.label?.toLowerCase()}`}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '28px', lineHeight: '1.6', maxWidth: '360px', margin: '0 auto 28px' }}>
                Crea tu primer proyecto para empezar a monitorizar el health score y obtener análisis IA
              </div>
              <button onClick={() => setShowNew(true)} style={{ padding: '13px 32px', borderRadius: '12px', border: 'none', background: NAVY, color: 'white', fontWeight: '700', fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '-0.2px' }}>
                + Crear primer proyecto
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {filtered.map((p, i) => (
                <div key={p.id} style={{ animation: `fadeUp 0.3s ease ${i * 0.05}s both` }}>
                  <ProjectCard project={p} onClick={() => setSelectedId(p.id)} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showNew && token && (
        <NewProjectModal token={token} onClose={() => setShowNew(false)} onCreated={p => { setProjects(prev => [p, ...prev]); setShowNew(false); fetchProjects() }} />
      )}
      {selectedId && token && (
        <ProjectDetail projectId={selectedId} token={token} onClose={() => setSelectedId(null)} onUpdate={() => fetchProjects()} />
      )}
    </div>
  )
}