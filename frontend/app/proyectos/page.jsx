'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { FONT, useT } from '@/components/ui/tokens'
import VeraDrawer from '@/components/ui/VeraDrawer'
import { Skeleton, EmptyState, PageHeader, Btn, BtnSec, Input, Field } from '@/components/ui/primitives'

import { API_BASE as API } from '@/lib/api'
const VERA_BLUE = '#3D2BFF'

// ─────────────────────────────────────────────────────────
// CONFIGS
// ─────────────────────────────────────────────────────────
const STATUS_CFG = {
  active:    { label: 'Activo',    color: '#059669', bg: 'rgba(5,150,105,.1)', dot: '#059669' },
  paused:    { label: 'Pausado',   color: '#d97706', bg: 'rgba(217,119,6,.1)', dot: '#F59E0B' },
  completed: { label: 'Completado', color: '#0EA5E9', bg: 'rgba(14,165,233,.1)', dot: '#0EA5E9' },
  cancelled: { label: 'Cancelado', color: '#6b7280', bg: 'rgba(107,114,128,.1)', dot: '#9CA3AF' },
}

const TASK_STATUS = {
  todo:        { label: 'Por hacer',   color: '#6b7280', bg: '#f3f4f6' },
  in_progress: { label: 'En progreso', color: '#3D2BFF', bg: 'rgba(61,43,255,.1)' },
  review:      { label: 'En revisión', color: '#3D2BFF', bg: 'rgba(61,43,255,.1)' },
  done:        { label: 'Hecho',       color: '#059669', bg: 'rgba(5,150,105,.1)' },
}

const PRIORITY_CFG = {
  urgent: { label: 'Urgente', color: '#dc2626', bg: 'rgba(220,38,38,.1)' },
  high:   { label: 'Alta',    color: '#d97706', bg: 'rgba(217,119,6,.1)' },
  medium: { label: 'Media',   color: '#0EA5E9', bg: 'rgba(14,165,233,.1)' },
  low:    { label: 'Baja',    color: '#6b7280', bg: 'rgba(107,114,128,.1)' },
}

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────
function fmtEuro(n) { return n != null ? '€' + Math.round(n).toLocaleString('es-ES') : '—' }
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDateShort(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}
function healthColor(score) {
  // score puede venir 0-10 o 0-100
  const s = score > 10 ? score / 10 : score
  if (s >= 8) return { color: '#059669', bg: 'rgba(5,150,105,.1)', label: 'Excelente' }
  if (s >= 6) return { color: '#0EA5E9', bg: 'rgba(14,165,233,.1)', label: 'Bien' }
  if (s >= 4) return { color: '#d97706', bg: 'rgba(217,119,6,.1)', label: 'Atención' }
  return { color: '#dc2626', bg: 'rgba(220,38,38,.1)', label: 'Crítico' }
}
function avatarColor(name) {
  const colors = ['#3D2BFF', '#3D2BFF', '#059669', '#dc2626', '#d97706', '#0EA5E9']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}
function initials(name) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

// ─────────────────────────────────────────────────────────
// BANDERA ES
// ─────────────────────────────────────────────────────────
function FlagES({ size = 14 }) {
  return (
    <svg width={size * 1.4} height={size} viewBox="0 0 21 14" style={{ borderRadius: 2, display: 'block', flexShrink: 0 }}>
      <rect width="21" height="14" fill="#AA151B" />
      <rect y="3.5" width="21" height="7" fill="#F1BF00" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────
// PRIMITIVOS
// ─────────────────────────────────────────────────────────
function Pill({ label, color, bg, dot }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px', borderRadius: 6,
      fontSize: 11, fontWeight: 500,
      color, background: bg, whiteSpace: 'nowrap',
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: dot }} />}
      {label}
    </span>
  )
}

function Avatar({ name, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 999,
      background: avatarColor(name || '?'),
      display: 'grid', placeItems: 'center',
      color: '#fff', fontSize: size * 0.4, fontWeight: 600,
      flexShrink: 0,
    }}>{initials(name)}</div>
  )
}

function Tab({ active, onClick, label, badge }) {
  const T = useT()
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px', borderRadius: 8,
      background: active ? T.card : 'transparent',
      color: active ? T.text : T.text3, border: 'none',
      boxShadow: active ? '0 1px 2px rgba(0,0,0,.06)' : 'none',
      fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
      fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {label}
      {badge != null && badge > 0 && (
        <span style={{
          fontSize: 10, padding: '1px 5px', borderRadius: 999,
          background: active ? 'rgba(61,43,255,.12)' : 'rgba(0,0,0,.08)',
          color: active ? VERA_BLUE : T.text3,
          fontVariantNumeric: 'tabular-nums', minWidth: 16, textAlign: 'center',
        }}>{badge}</span>
      )}
    </button>
  )
}

// Barra de progreso circular para health
function HealthRing({ score, size = 36 }) {
  const T = useT()
  const s = score > 10 ? score / 10 : score
  const pct = (s / 10) * 100
  const hc = healthColor(score)
  const radius = (size - 4) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={radius}
          fill="none" stroke={T.hairline} strokeWidth="3" />
        <circle cx={size/2} cy={size/2} r={radius}
          fill="none" stroke={hc.color} strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .4s ease' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'grid', placeItems: 'center',
        fontSize: size * 0.3, fontWeight: 700,
        color: hc.color, fontVariantNumeric: 'tabular-nums',
      }}>{Math.round(s)}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// TAB 1: PROYECTOS (Lista horizontal estilo Asana)
// ─────────────────────────────────────────────────────────
function ProyectosTab({ projects, onSelect, employees }) {
  const T = useT()
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('priority')

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter)

  // Ordenamiento: prioridad (health bajo + deadline cercano = primero)
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'priority') {
      const aHealth = a.health?.score ?? a.health_score ?? 10
      const bHealth = b.health?.score ?? b.health_score ?? 10
      const aUrgent = (a.days_left != null && a.days_left <= 14 && a.status === 'active') ? 1 : 0
      const bUrgent = (b.days_left != null && b.days_left <= 14 && b.status === 'active') ? 1 : 0
      if (aUrgent !== bUrgent) return bUrgent - aUrgent
      return aHealth - bHealth
    }
    if (sortBy === 'deadline') {
      return (a.days_left ?? 9999) - (b.days_left ?? 9999)
    }
    if (sortBy === 'budget') {
      return (b.budget || 0) - (a.budget || 0)
    }
    return 0
  })

  // Obtener empleados involucrados (aprox: por departamento del proyecto)
  function getTeamForProject(p) {
    // Si tenemos tasks, contar empleados únicos asignados
    return []
  }

  return (
    <>
      {/* Filtros + sort */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 2, background: T.sidebar, borderRadius: 8, padding: 3 }}>
          {[
            { k: 'all', l: `Todos (${projects.length})` },
            { k: 'active', l: `Activos (${projects.filter(p => p.status === 'active').length})` },
            { k: 'paused', l: `Pausados (${projects.filter(p => p.status === 'paused').length})` },
            { k: 'completed', l: `Completados (${projects.filter(p => p.status === 'completed').length})` },
          ].map(f => (
            <button key={f.k} onClick={() => setFilter(f.k)} style={{
              padding: '5px 12px', borderRadius: 6, border: 'none',
              background: filter === f.k ? T.card : 'transparent',
              color: filter === f.k ? T.text : T.text3,
              boxShadow: filter === f.k ? '0 1px 2px rgba(0,0,0,.06)' : 'none',
              fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}>{f.l}</button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: T.text4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.4 }}>Ordenar:</span>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
            padding: '6px 10px', borderRadius: 8,
            border: `.5px solid ${T.hairline}`,
            fontSize: 12, color: T.text2, background: T.card,
            fontFamily: 'inherit', cursor: 'pointer',
          }}>
            <option value="priority">Prioridad de atención</option>
            <option value="deadline">Deadline más cercano</option>
            <option value="budget">Presupuesto mayor</option>
          </select>
        </div>
      </div>

      {/* Lista horizontal */}
      <div style={{
        background: T.card, borderRadius: 12,
        border: `.5px solid ${T.hairline}`,
        overflow: 'hidden',
      }}>
        {/* Header tabla */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60px 1fr 120px 160px 140px 120px',
          gap: 16, padding: '12px 20px',
          background: T.sidebar,
          borderBottom: `.5px solid ${T.hairline}`,
          fontSize: 10.5, color: T.text4, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: 0.5,
        }}>
          <div style={{ textAlign: 'center' }}>Health</div>
          <div>Proyecto</div>
          <div>Estado</div>
          <div>Progreso</div>
          <div style={{ textAlign: 'right' }}>Presupuesto</div>
          <div style={{ textAlign: 'right' }}>Deadline</div>
        </div>

        {/* Filas */}
        {sorted.map(p => {
          const status = STATUS_CFG[p.status] || STATUS_CFG.active
          const hc = healthColor(p.health?.score ?? p.health_score ?? 0)
          const completion = p.completion_percentage || 0
          const daysLeft = p.days_left
          const isUrgent = daysLeft != null && daysLeft <= 7 && daysLeft >= 0 && p.status === 'active'
          const isOverdue = daysLeft != null && daysLeft < 0 && p.status !== 'completed'
          const spent = p.total_spent || 0
          const budgetPct = p.budget ? Math.min((spent / p.budget) * 100, 100) : 0
          const overBudget = spent > (p.budget || 0)

          return (
            <div key={p.id} onClick={() => onSelect(p)} className="hover-lift"
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,.015)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr 120px 160px 140px 120px',
                gap: 16, padding: '16px 20px',
                borderBottom: `.5px solid ${T.hairline}`,
                cursor: 'pointer', alignItems: 'center',
                transition: 'background .12s',
                position: 'relative',
              }}>
              {/* Indicador lateral de prioridad */}
              {(isUrgent || isOverdue || (hc.color === '#dc2626')) && (
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: 3, background: hc.color === '#dc2626' ? '#dc2626' : '#d97706',
                }} />
              )}

              {/* HEALTH RING */}
              <div style={{ display: 'grid', placeItems: 'center' }}>
                <HealthRing score={p.health?.score ?? p.health_score ?? 0} size={44} />
              </div>

              {/* NOMBRE + cliente + descripción corta */}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 3, lineHeight: 1.3 }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: T.text4 }}>
                  {p.client_name && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      {p.client_name}
                    </span>
                  )}
                  {p.description && (
                    <span style={{
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      maxWidth: 380, color: T.text3,
                    }}>· {p.description}</span>
                  )}
                </div>
              </div>

              {/* ESTADO */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Pill {...status} />
                {isUrgent && <Pill label={`${daysLeft}d`} color="#dc2626" bg="rgba(220,38,38,.1)" dot="#dc2626" />}
                {isOverdue && <Pill label={`${Math.abs(daysLeft)}d retraso`} color="#dc2626" bg="rgba(220,38,38,.15)" dot="#dc2626" />}
              </div>

              {/* PROGRESO con barra */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: T.text3, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{Math.round(completion)}%</span>
                  <span style={{ fontSize: 10, color: T.text4 }}>completado</span>
                </div>
                <div style={{
                  height: 6, background: T.sidebar,
                  borderRadius: 999, overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${completion}%`,
                    background: completion >= 100 ? '#059669' :
                                completion < 30 ? '#dc2626' :
                                completion < 70 ? '#d97706' : hc.color,
                    transition: 'width .4s ease',
                  }} />
                </div>
              </div>

              {/* PRESUPUESTO (gastado / total) con barra */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: overBudget ? '#dc2626' : T.text, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                  {fmtEuro(p.budget)}
                </div>
                <div style={{ fontSize: 10, color: overBudget ? '#dc2626' : T.text4, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                  {fmtEuro(spent)} gastado · {Math.round(budgetPct)}%
                </div>
              </div>

              {/* DEADLINE */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: isOverdue ? '#dc2626' : isUrgent ? '#d97706' : T.text, lineHeight: 1.1 }}>
                  {fmtDateShort(p.deadline)}
                </div>
                <div style={{ fontSize: 10, color: T.text4, marginTop: 2 }}>
                  {daysLeft == null ? '—' :
                   daysLeft < 0 ? `Vencido ${Math.abs(daysLeft)}d` :
                   daysLeft === 0 ? 'Hoy' :
                   `En ${daysLeft} días`}
                </div>
              </div>
            </div>
          )
        })}

        {sorted.length === 0 && (
          <EmptyState
            icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>}
            title="Sin proyectos en esta categoría"
            hint="No hay proyectos que coincidan con este filtro. Prueba con otra categoría o crea un nuevo proyecto."
          />
        )}
      </div>

      {/* Cards de resumen abajo: top en riesgo + próximos deadlines */}
      {filter === 'all' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 16 }}>
          {/* Proyectos que requieren atención */}
          <div style={{
            background: T.card, borderRadius: 12,
            border: `.5px solid ${T.hairline}`, padding: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{
                width: 24, height: 24, borderRadius: 6, background: VERA_BLUE,
                display: 'grid', placeItems: 'center',
              }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" fill="#fff" />
                </svg>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Lo que Vera recomienda revisar</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sorted.filter(p => {
                const h = p.health?.score ?? p.health_score ?? 10
                return h < 7 && p.status === 'active'
              }).slice(0, 3).map(p => {
                const h = p.health?.score ?? p.health_score ?? 0
                const hc = healthColor(h)
                return (
                  <div key={p.id} onClick={() => onSelect(p)} className="hover-lift" style={{
                    padding: '8px 10px', borderRadius: 8,
                    background: T.sidebar,
                    borderLeft: `3px solid ${hc.color}`,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>{p.name}</div>
                      <div style={{ fontSize: 10.5, color: T.text4, marginTop: 1 }}>
                        Health {h}/10 · {p.completion_percentage}% completado
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: VERA_BLUE, fontWeight: 600 }}>→</span>
                  </div>
                )
              })}
              {sorted.filter(p => (p.health?.score ?? p.health_score ?? 10) < 7 && p.status === 'active').length === 0 && (
                <div style={{ fontSize: 12, color: T.text4, padding: 12, textAlign: 'center' }}>
                  ✓ Todos los proyectos están sanos
                </div>
              )}
            </div>
          </div>

          {/* Próximos deadlines */}
          <div style={{
            background: T.card, borderRadius: 12,
            border: `.5px solid ${T.hairline}`, padding: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{
                width: 24, height: 24, borderRadius: 6,
                background: 'rgba(217,119,6,.1)', color: '#d97706',
                display: 'grid', placeItems: 'center',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Próximos deadlines</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {projects.filter(p => p.status === 'active' && p.days_left != null && p.days_left >= 0).sort((a, b) => a.days_left - b.days_left).slice(0, 3).map(p => (
                <div key={p.id} onClick={() => onSelect(p)} className="hover-lift" style={{
                  padding: '8px 10px', borderRadius: 8,
                  background: T.sidebar,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>{p.name}</div>
                    <div style={{ fontSize: 10.5, color: T.text4, marginTop: 1 }}>
                      {fmtDateShort(p.deadline)} · {p.days_left === 0 ? 'Hoy' : `En ${p.days_left} días`}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: p.days_left <= 7 ? '#dc2626' : '#d97706', fontWeight: 600 }}>
                    {p.days_left}d
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────
// TAB 2: TAREAS (Kanban)
// ─────────────────────────────────────────────────────────
function TareasTab({ token, projects, employees }) {
  const T = useT()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [projectFilter, setProjectFilter] = useState('all')

  async function load() {
    if (projects.length === 0) return
    setLoading(true)
    try {
      const allTasks = []
      for (const p of projects) {
        const r = await fetch(`${API}/api/proyectos/${p.id}`, { headers: { Authorization: `Bearer ${token}` } })
        if (r.ok) {
          const d = await r.json()
          ;(d.tasks || d.project?.tasks || []).forEach(t => {
            allTasks.push({ ...t, project_name: p.name, project_id: p.id })
          })
        }
      }
      setTasks(allTasks)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [projects])

  async function updateStatus(task, newStatus) {
    try {
      await fetch(`${API}/api/proyectos/tareas/${task.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
    } catch {}
  }

  const filtered = projectFilter === 'all' ? tasks : tasks.filter(t => t.project_id === projectFilter)
  const columns = ['todo', 'in_progress', 'review', 'done']
  const grouped = columns.reduce((acc, c) => { acc[c] = filtered.filter(t => t.status === c); return acc }, {})

  function empName(id) {
    const e = employees.find(e => e.id === id)
    return e?.full_name || null
  }

  if (loading) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      {[0, 1, 2, 3].map(col => (
        <div key={col} style={{ background: T.sidebar, borderRadius: 12, padding: 12, minHeight: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Skeleton w={80} h={11} /><Skeleton w={16} h={11} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[0, 1].map(i => (
              <div key={i} style={{ background: T.card, borderRadius: 10, border: `.5px solid ${T.hairline}`, padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Skeleton w="90%" h={12} /><Skeleton w="50%" h={10} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 12, color: T.text4 }}>{filtered.length} tareas</div>
        <select value={projectFilter} onChange={e => setProjectFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
          style={{
            padding: '6px 10px', borderRadius: 8,
            border: `.5px solid ${T.hairline}`,
            fontSize: 12, color: T.text2, background: T.card,
            fontFamily: 'inherit', outline: 'none',
          }}>
          <option value="all">Todos los proyectos</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {columns.map(col => {
          const cfg = TASK_STATUS[col]
          const items = grouped[col]
          return (
            <div key={col} style={{
              background: T.sidebar, borderRadius: 12,
              padding: 12, minHeight: 200,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: cfg.color }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: T.text2, textTransform: 'uppercase', letterSpacing: 0.5 }}>{cfg.label}</span>
                </div>
                <span style={{ fontSize: 10.5, color: T.text4, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{items.length}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map(t => {
                  const prio = PRIORITY_CFG[t.priority] || PRIORITY_CFG.medium
                  const overdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
                  const assignedName = empName(t.assigned_to)

                  return (
                    <div key={t.id} style={{
                      background: T.card, borderRadius: 10,
                      border: `.5px solid ${T.hairline}`,
                      padding: 10,
                      borderLeft: `3px solid ${prio.color}`,
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: T.text, lineHeight: 1.35, marginBottom: 6 }}>{t.title}</div>

                      <div style={{ fontSize: 10, color: T.text4, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                        </svg>
                        {t.project_name}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          {assignedName && <Avatar name={assignedName} size={20} />}
                          {t.due_date && (
                            <span style={{
                              fontSize: 10, color: overdue ? '#dc2626' : T.text4,
                              fontWeight: overdue ? 600 : 400,
                            }}>{fmtDateShort(t.due_date)}</span>
                          )}
                        </div>
                        <Pill label={prio.label} color={prio.color} bg={prio.bg} />
                      </div>

                      {/* Quick action: avanzar columna */}
                      {col !== 'done' && (
                        <button onClick={() => {
                          const next = col === 'todo' ? 'in_progress' : col === 'in_progress' ? 'review' : 'done'
                          updateStatus(t, next)
                        }} style={{
                          marginTop: 6, width: '100%', padding: '4px',
                          borderRadius: 6, border: 'none',
                          background: 'transparent', color: T.text4,
                          fontSize: 10, fontWeight: 500, cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background = T.sidebar; e.currentTarget.style.color = VERA_BLUE }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.text4 }}
                        >→ {col === 'todo' ? 'Iniciar' : col === 'in_progress' ? 'A revisión' : 'Marcar hecho'}</button>
                      )}
                    </div>
                  )
                })}
                {items.length === 0 && (
                  <EmptyState
                    icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 12h6" /></svg>}
                    title="Sin tareas"
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────
// TAB 3: CALENDARIO
// ─────────────────────────────────────────────────────────
function CalendarioTab({ projects }) {
  const T = useT()
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth())
  const [year, setYear] = useState(today.getFullYear())

  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startWeekday = (firstDay.getDay() + 6) % 7
  const daysInMonth = lastDay.getDate()

  function prev() {
    if (month === 0) { setMonth(11); setYear(year - 1) } else setMonth(month - 1)
  }
  function next() {
    if (month === 11) { setMonth(0); setYear(year + 1) } else setMonth(month + 1)
  }

  // Eventos del mes (deadlines de proyectos)
  function eventsOn(day) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return projects.filter(p => p.deadline === dateStr)
  }

  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: T.text }}>{MESES[month]} {year}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={prev} style={{
            width: 32, height: 32, borderRadius: 8,
            background: T.card, border: `.5px solid ${T.hairline}`,
            cursor: 'pointer', display: 'grid', placeItems: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()) }} style={{
            padding: '0 12px', height: 32, borderRadius: 8,
            background: T.card, border: `.5px solid ${T.hairline}`,
            cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
          }}>Hoy</button>
          <button onClick={next} style={{
            width: 32, height: 32, borderRadius: 8,
            background: T.card, border: `.5px solid ${T.hairline}`,
            cursor: 'pointer', display: 'grid', placeItems: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      <div style={{ background: T.card, borderRadius: 12, border: `.5px solid ${T.hairline}`, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {DIAS.map(d => (
            <div key={d} style={{
              padding: '10px 0', textAlign: 'center',
              fontSize: 10.5, fontWeight: 600, color: T.text4,
              textTransform: 'uppercase', letterSpacing: 0.5,
              background: T.sidebar,
              borderBottom: `.5px solid ${T.hairline}`,
            }}>{d}</div>
          ))}
          {cells.map((d, i) => {
            const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear()
            const events = d ? eventsOn(d) : []
            return (
              <div key={i} style={{
                minHeight: 88, padding: 6,
                borderRight: `.5px solid ${T.hairline}`,
                borderBottom: `.5px solid ${T.hairline}`,
                background: isToday ? 'rgba(61,43,255,.04)' : 'transparent',
              }}>
                {d && (
                  <div style={{
                    fontSize: 11, fontWeight: isToday ? 700 : 500,
                    color: isToday ? VERA_BLUE : T.text3,
                    marginBottom: 4,
                  }}>{d}</div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {events.map(p => {
                    const hc = healthColor(p.health?.score ?? p.health_score ?? 0)
                    return (
                      <div key={p.id} style={{
                        fontSize: 10, padding: '2px 5px', borderRadius: 4,
                        background: hc.bg, color: hc.color,
                        fontWeight: 500,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{p.name}</div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────
// DRAWER DETALLE PROYECTO
// ─────────────────────────────────────────────────────────
function ProjectDrawer({ project, onClose, token, employees }) {
  const T = useT()
  const [detail, setDetail] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newTask, setNewTask] = useState('')
  const [addingTask, setAddingTask] = useState(false)

  function loadDetail() {
    return fetch(`${API}/api/proyectos/${project.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setDetail(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadDetail() }, [project.id])

  async function createTask() {
    const title = newTask.trim()
    if (!title) return
    setAddingTask(true)
    try {
      const r = await fetch(`${API}/api/proyectos/${project.id}/tareas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title }),
      })
      if (r.ok) { setNewTask(''); await loadDetail() }
    } catch {}
    setAddingTask(false)
  }

  async function runAnalysis() {
    setAnalyzing(true)
    try {
      const r = await fetch(`${API}/api/proyectos/${project.id}/analisis`, { headers: { Authorization: `Bearer ${token}` } })
      if (r.ok) setAnalysis(await r.json())
    } catch {}
    setAnalyzing(false)
  }

  const p = detail?.project || detail || project
  const tasks = detail?.tasks || p.tasks || []
  const hc = healthColor(p.health?.score ?? p.health_score ?? 0)
  const status = STATUS_CFG[p.status] || STATUS_CFG.active

  function empName(id) {
    const e = employees.find(e => e.id === id)
    return e?.full_name || '—'
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)',
      display: 'flex', justifyContent: 'flex-end', zIndex: 100,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 580, height: '100dvh', background: T.card,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'slideIn .2s ease',
      }}>
        <style>{`@keyframes slideIn{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

        {/* HEADER */}
        <div style={{ padding: '20px 24px 18px', borderBottom: `.5px solid ${T.hairline}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 4 }}>{p.name}</div>
              {p.client_name && <div style={{ fontSize: 12, color: T.text4 }}>{p.client_name}</div>}
            </div>
            <HealthRing score={p.health?.score ?? p.health_score ?? 0} size={48} />
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: T.text4 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            <Pill {...status} />
            <Pill label={hc.label} color={hc.color} bg={hc.bg} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Skeleton w="100%" h={40} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {[0, 1, 2, 3].map(i => <Skeleton key={i} w="100%" h={56} radius={10} />)}
              </div>
              <Skeleton w="40%" h={11} />
              {[0, 1, 2].map(i => <Skeleton key={i} w="100%" h={44} radius={10} />)}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {p.description && (
                <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.55 }}>{p.description}</div>
              )}

              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                <div style={{ background: T.sidebar, borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 10, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>Presupuesto</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginTop: 3 }}>{fmtEuro(p.budget)}</div>
                </div>
                <div style={{ background: T.sidebar, borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 10, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>Gastado</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: T.text2, marginTop: 3 }}>{fmtEuro(p.total_spent || 0)}</div>
                </div>
                <div style={{ background: T.sidebar, borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 10, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>Inicio</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.text2, marginTop: 3 }}>{fmtDate(p.start_date)}</div>
                </div>
                <div style={{ background: T.sidebar, borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 10, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>Deadline</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.text2, marginTop: 3 }}>{fmtDate(p.deadline)}</div>
                </div>
              </div>

              {/* Análisis IA */}
              {(p.last_ai_analysis || analysis) && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(61,43,255,.04), rgba(61,43,255,.04))',
                  borderRadius: 12, padding: 14,
                  border: '.5px solid rgba(61,43,255,.15)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 18, height: 18, borderRadius: 5, background: VERA_BLUE, display: 'grid', placeItems: 'center' }}>
                        <svg width="9" height="9" viewBox="0 0 16 16" fill="none">
                          <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" fill="#fff" />
                        </svg>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: VERA_BLUE, textTransform: 'uppercase', letterSpacing: 0.5 }}>Análisis de Vera</span>
                    </div>
                    <button onClick={runAnalysis} disabled={analyzing} style={{
                      fontSize: 10.5, color: VERA_BLUE, background: 'transparent',
                      border: 'none', cursor: analyzing ? 'wait' : 'pointer', fontFamily: 'inherit', fontWeight: 600,
                    }}>{analyzing ? 'Analizando…' : '↻ Reanalizar'}</button>
                  </div>
                  <div style={{ fontSize: 12.5, color: T.text2, lineHeight: 1.55 }}>
                    {analysis ? (
                      <>
                        {analysis.resumen_ejecutivo && <div>{analysis.resumen_ejecutivo}</div>}
                        {analysis.accion_hoy && (
                          <div style={{ marginTop: 8 }}>
                            <span style={{ fontWeight: 600, color: VERA_BLUE }}>Acción de hoy: </span>
                            {analysis.accion_hoy}
                          </div>
                        )}
                        {analysis.prediccion && (
                          <div style={{ marginTop: 8, color: T.text3 }}>{analysis.prediccion}</div>
                        )}
                      </>
                    ) : (
                      p.last_ai_analysis
                    )}
                  </div>
                </div>
              )}

              {/* Tareas */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1, fontSize: 11, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Tareas · {tasks.length}
                  </div>
                  <input value={newTask} onChange={e => setNewTask(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') createTask() }}
                    placeholder="Nueva tarea…" aria-label="Nueva tarea"
                    style={{ fontSize: 12, padding: '5px 8px', borderRadius: 7, border: `.5px solid ${T.hairline}`, background: T.card, color: T.text, fontFamily: 'inherit', width: 150 }} />
                  <BtnSec onClick={createTask} style={{ padding: '5px 10px', fontSize: 12 }}>{addingTask ? '…' : '+ Añadir'}</BtnSec>
                </div>
                <div style={{ background: T.card, border: `.5px solid ${T.hairline}`, borderRadius: 10, overflow: 'hidden' }}>
                  {tasks.length === 0 ? (
                    <EmptyState
                      icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>}
                      title="Sin tareas"
                      hint="Este proyecto aún no tiene tareas asignadas."
                    />
                  ) : tasks.slice(0, 12).map(t => {
                    const ts = TASK_STATUS[t.status] || TASK_STATUS.todo
                    const prio = PRIORITY_CFG[t.priority] || PRIORITY_CFG.medium
                    return (
                      <div key={t.id} style={{
                        padding: '10px 12px',
                        borderBottom: `.5px solid ${T.hairline}`,
                        display: 'flex', alignItems: 'center', gap: 10,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: 999, background: ts.color, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, color: T.text, fontWeight: 500, marginBottom: 2 }}>{t.title}</div>
                          <div style={{ fontSize: 10.5, color: T.text4, display: 'flex', alignItems: 'center', gap: 8 }}>
                            {t.assigned_to && <span>{empName(t.assigned_to)}</span>}
                            {t.due_date && <span>· {fmtDateShort(t.due_date)}</span>}
                            {t.estimated_hours && <span>· {t.estimated_hours}h est</span>}
                          </div>
                        </div>
                        <Pill label={prio.label} color={prio.color} bg={prio.bg} />
                      </div>
                    )
                  })}
                  {tasks.length > 12 && (
                    <div style={{ padding: 10, textAlign: 'center', fontSize: 11, color: T.text4 }}>
                      + {tasks.length - 12} más
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// VERA DRAWER
// ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────
function CreateProjectModal({ token, onClose, onCreated }) {
  const T = useT()
  const [form, setForm] = useState({ name: '', client_name: '', deadline: '', budget: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setErr('El nombre es obligatorio'); return }
    setSaving(true); setErr('')
    try {
      const r = await fetch(`${API}/api/proyectos/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name.trim(),
          client_name: form.client_name.trim() || null,
          deadline: form.deadline || null,
          budget: form.budget ? parseFloat(form.budget) : 0,
          description: form.description.trim() || null,
        }),
      })
      if (!r.ok) { const d = await r.json().catch(() => ({})); setErr(d.detail || 'No se pudo crear el proyecto'); setSaving(false); return }
      onCreated()
    } catch { setErr('Error de conexión'); setSaving(false) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <form onClick={e => e.stopPropagation()} onSubmit={submit} style={{ background: T.card, borderRadius: 16, padding: 24, width: 'min(460px, 100%)', border: `.5px solid ${T.hairline}` }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: T.text, marginBottom: 16 }}>Nuevo proyecto</div>
        {err && <div role="alert" style={{ color: T.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}
        <Field label="Nombre *"><Input value={form.name} onChange={e => set('name', e.target.value)} autoFocus placeholder="Web corporativa…" /></Field>
        <Field label="Cliente"><Input value={form.client_name} onChange={e => set('client_name', e.target.value)} placeholder="Acme S.L." /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Fecha límite"><Input type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} /></Field>
          <Field label="Presupuesto (€)"><Input type="number" value={form.budget} onChange={e => set('budget', e.target.value)} placeholder="0" /></Field>
        </div>
        <Field label="Descripción"><Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Opcional" /></Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <BtnSec onClick={onClose}>Cancelar</BtnSec>
          <Btn type="submit" disabled={saving}>{saving ? 'Creando…' : 'Crear proyecto'}</Btn>
        </div>
      </form>
    </div>
  )
}

export default function ProjectsPage() {
  const T = useT()
  const router = useRouter()
  const [tab, setTab] = useState('proyectos')
  const [projects, setProjects] = useState([])
  const [employees, setEmployees] = useState([])
  const [selected, setSelected] = useState(null)
  const [veraOpen, setVeraOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  async function loadAll(t) {
    setLoading(true)
    try {
      const [pR, eR] = await Promise.all([
        fetch(`${API}/api/proyectos/`, { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`${API}/api/hr/employees`, { headers: { Authorization: `Bearer ${t}` } }),
      ])
      if (pR.ok) {
        const d = await pR.json()
        setProjects(d.projects || d || [])
      }
      if (eR.ok) {
        const d = await eR.json()
        setEmployees(d.employees || d || [])
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('vela_token') : null
    if (!t) { router.push('/login'); return }
    setToken(t)
    loadAll(t)
  }, [])

  // KPIs calculados
  const summary = useMemo(() => {
    const active = projects.filter(p => p.status === 'active')
    const at_risk = active.filter(p => (p.health?.score ?? p.health_score ?? 10) < 6)
    const urgent = active.filter(p => p.days_left != null && p.days_left <= 7 && p.days_left >= 0)
    const overdue = active.filter(p => p.days_left != null && p.days_left < 0)
    const completed = projects.filter(p => p.status === 'completed')
    const totalBudget = active.reduce((s, p) => s + (p.budget || 0), 0)
    const totalSpent = active.reduce((s, p) => s + (p.total_spent || 0), 0)
    const avgHealth = active.length > 0
      ? Math.round((active.reduce((s, p) => s + (p.health?.score ?? p.health_score ?? 0), 0) / active.length) * 10) / 10
      : 0

    return {
      total: projects.length,
      active: active.length,
      at_risk: at_risk.length,
      urgent: urgent.length,
      overdue: overdue.length,
      completed: completed.length,
      totalBudget,
      totalSpent,
      avgHealth,
      atRiskProjects: at_risk,
      urgentProjects: urgent,
      overdueProjects: overdue,
    }
  }, [projects])

  const notifCount = summary.at_risk + summary.urgent + summary.overdue

  return (
    <div style={{
      minHeight: '100dvh', background: T.bg, display: 'flex',
      fontFamily: FONT, WebkitFontSmoothing: 'antialiased',
    }}>
      <style>{`*{box-sizing:border-box}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:999px}input:focus,select:focus{outline:none}@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}`}</style>

      <Sidebar active="/proyectos" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100dvh' }}>
        <PageHeader
          title="Proyectos"
          subtitle={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <FlagES size={11} />
              España · {summary.total} proyectos · {summary.active} activos · health {summary.avgHealth}/10 · {fmtEuro(summary.totalBudget)} presupuesto
            </span>
          }
          tabs={[
            { key: 'proyectos', label: 'Proyectos' },
            { key: 'tareas',    label: 'Tareas' },
            { key: 'calendario', label: 'Calendario' },
          ]}
          activeTab={tab}
          onTab={setTab}
          primary={{ label: 'Nuevo proyecto', onClick: () => setShowCreate(true) }}
          secondary={
            <button onClick={() => setNotificationsOpen(o => !o)}
              aria-label={`Notificaciones${notifCount > 0 ? ` (${notifCount})` : ''}`}
              aria-expanded={notificationsOpen} style={{
              position: 'relative',
              padding: '7px 10px', borderRadius: 8,
              background: T.card, color: T.text2,
              border: `.5px solid ${T.hairline}`,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'grid', placeItems: 'center',
              minHeight: 44,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {notifCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  background: '#dc2626', color: '#fff',
                  fontSize: 9, fontWeight: 600,
                  padding: '1px 5px', borderRadius: 999,
                  minWidth: 16, textAlign: 'center',
                }}>{notifCount}</span>
              )}
            </button>
          }
          onVera={() => setVeraOpen(true)}
          user={null} router={router}
        />

        {/* ── Hero persistente: Lo que Vera recomienda revisar ─────────────── */}
        {!loading && summary.atRiskProjects.length > 0 && (
          <div style={{
            margin: '0 24px',
            marginTop: 16,
            padding: '12px 16px',
            background: 'linear-gradient(135deg, rgba(61,43,255,.05), rgba(61,43,255,.03))',
            border: '.5px solid rgba(61,43,255,.18)',
            borderRadius: 12,
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6, background: VERA_BLUE,
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" fill="#fff" />
                </svg>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: VERA_BLUE }}>Lo que Vera recomienda revisar</span>
              <span style={{ fontSize: 11, color: '#6366f1', marginLeft: 2 }}>· {summary.atRiskProjects.length} {summary.atRiskProjects.length === 1 ? 'proyecto' : 'proyectos'} en riesgo</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {summary.atRiskProjects.slice(0, 4).map(p => {
                const h = p.health?.score ?? p.health_score ?? 0
                const hc = healthColor(h)
                return (
                  <button key={p.id} onClick={() => setSelected(p)} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', borderRadius: 8,
                    background: T.card,
                    border: `.5px solid ${hc.color}33`,
                    borderLeft: `3px solid ${hc.color}`,
                    cursor: 'pointer', fontFamily: 'inherit',
                    minHeight: 44,
                  }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>{p.name}</div>
                      <div style={{ fontSize: 10.5, color: T.text4, marginTop: 1, fontVariantNumeric: 'tabular-nums' }}>
                        Health {h}/10 · {p.completion_percentage ?? 0}% completado
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: VERA_BLUE, fontWeight: 600, flexShrink: 0 }}>→</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
        {!loading && summary.atRiskProjects.length === 0 && !loading && (
          <div style={{
            margin: '0 24px', marginTop: 16,
            padding: '9px 14px',
            background: 'rgba(5,150,105,.05)',
            border: '.5px solid rgba(5,150,105,.18)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', gap: 8,
            flexShrink: 0,
          }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" fill={VERA_BLUE} />
            </svg>
            <span style={{ fontSize: 12, color: '#059669', fontWeight: 500 }}>Vera: todos los proyectos activos están sanos</span>
          </div>
        )}

        <div className="fade-in" style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Skeleton w={280} h={36} radius={8} />
                <Skeleton w={200} h={32} radius={8} style={{ marginLeft: 'auto' }} />
              </div>
              <div style={{ background: T.card, borderRadius: 12, border: `.5px solid ${T.hairline}`, overflow: 'hidden' }}>
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '60px 1fr 120px 160px 140px 120px',
                    gap: 16, padding: '16px 20px', alignItems: 'center',
                    borderBottom: `.5px solid ${T.hairline}`,
                  }}>
                    <div style={{ display: 'grid', placeItems: 'center' }}><Skeleton w={44} h={44} radius={999} /></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <Skeleton w="60%" h={14} /><Skeleton w="40%" h={11} />
                    </div>
                    <Skeleton w={72} h={20} radius={6} />
                    <Skeleton w="100%" h={14} />
                    <Skeleton w="80%" h={14} style={{ marginLeft: 'auto' }} />
                    <Skeleton w="70%" h={14} style={{ marginLeft: 'auto' }} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {tab === 'proyectos' && <ProyectosTab projects={projects} onSelect={setSelected} />}
              {tab === 'tareas' && <TareasTab token={token} projects={projects} employees={employees} />}
              {tab === 'calendario' && <CalendarioTab projects={projects} />}
            </>
          )}
        </div>
      </div>

      {selected && <ProjectDrawer project={selected} onClose={() => setSelected(null)} token={token} employees={employees} />}
      {veraOpen && <VeraDrawer onClose={() => setVeraOpen(false)} token={token} summary={summary} />}

      {showCreate && (
        <CreateProjectModal
          token={token}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadAll(token) }}
        />
      )}

      {notificationsOpen && (
        <div onClick={() => setNotificationsOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }}>
          <div onClick={e => e.stopPropagation()} style={{
            position: 'fixed', top: 70, right: 32,
            width: 380, maxHeight: 500, overflowY: 'auto',
            background: T.card, borderRadius: 12,
            border: `.5px solid ${T.hairline}`,
            boxShadow: '0 8px 30px rgba(0,0,0,.12)',
            padding: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Notificaciones</div>
              <button onClick={() => { setNotificationsOpen(false); setVeraOpen(true) }} style={{
                fontSize: 11, color: VERA_BLUE, background: 'transparent',
                border: 'none', cursor: 'pointer', fontWeight: 500,
              }}>Pregunta a Vera →</button>
            </div>

            {notifCount === 0 ? (
              <EmptyState
                icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>}
                title="Sin alertas"
                hint="Todos los proyectos están en orden. Te avisaremos si algo requiere atención."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {summary.atRiskProjects.map(p => (
                  <div key={'r'+p.id} onClick={() => { setNotificationsOpen(false); setSelected(p) }} style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: 'rgba(220,38,38,.04)',
                    border: '.5px solid rgba(220,38,38,.15)',
                    cursor: 'pointer',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: '#dc2626' }} />
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</span>
                    </div>
                    <div style={{ fontSize: 11, color: T.text3, paddingLeft: 12 }}>Health {p.health?.score ?? p.health_score}/10 → riesgo alto</div>
                  </div>
                ))}
                {summary.urgentProjects.map(p => (
                  <div key={'u'+p.id} onClick={() => { setNotificationsOpen(false); setSelected(p) }} style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: 'rgba(217,119,6,.04)',
                    border: '.5px solid rgba(217,119,6,.15)',
                    cursor: 'pointer',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: '#d97706' }} />
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</span>
                    </div>
                    <div style={{ fontSize: 11, color: T.text3, paddingLeft: 12 }}>Deadline en {p.days_left} días</div>
                  </div>
                ))}
                {summary.overdueProjects.map(p => (
                  <div key={'o'+p.id} onClick={() => { setNotificationsOpen(false); setSelected(p) }} style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: 'rgba(220,38,38,.06)',
                    border: '.5px solid rgba(220,38,38,.2)',
                    cursor: 'pointer',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: '#dc2626' }} />
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</span>
                    </div>
                    <div style={{ fontSize: 11, color: T.text3, paddingLeft: 12 }}>Vencido hace {Math.abs(p.days_left)} días</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
