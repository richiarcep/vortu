'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { T, FONT } from '@/components/ui/tokens'
import VeraDrawer from '@/components/ui/VeraDrawer'

import { API_BASE as API } from '@/lib/api'
const VERA_BLUE = '#0071E3'

// ─────────────────────────────────────────────────────────
// CONFIGS
// ─────────────────────────────────────────────────────────
const DEPT_CFG = {
  diseno:     { label: 'Diseño',     color: '#7c3aed', bg: 'rgba(124,58,237,.1)' },
  ventas:     { label: 'Ventas',     color: '#16a34a', bg: 'rgba(22,163,74,.1)' },
  almacen:    { label: 'Almacén',    color: '#d97706', bg: 'rgba(217,119,6,.1)' },
  marketing:  { label: 'Marketing',  color: '#0EA5E9', bg: 'rgba(14,165,233,.1)' },
  admin:      { label: 'Admin',      color: '#6b7280', bg: 'rgba(107,114,128,.1)' },
  tecnologia: { label: 'Tecnología', color: '#0071E3', bg: 'rgba(0,113,227,.1)' },
}
const CONTRACT_CFG = {
  indefinido: { label: 'Indefinido', color: '#16a34a', bg: 'rgba(22,163,74,.1)', dot: '#16a34a' },
  temporal:   { label: 'Temporal',   color: '#d97706', bg: 'rgba(217,119,6,.1)', dot: '#F59E0B' },
  practicas:  { label: 'Prácticas',  color: '#0EA5E9', bg: 'rgba(14,165,233,.1)', dot: '#0EA5E9' },
  becario:    { label: 'Becario',    color: '#7c3aed', bg: 'rgba(124,58,237,.1)', dot: '#7c3aed' },
  autonomo:   { label: 'Autónomo',   color: '#6b7280', bg: 'rgba(107,114,128,.1)', dot: '#9CA3AF' },
}
const VACATION_CFG = {
  vacation: { label: 'Vacaciones', color: '#0071E3', bg: 'rgba(0,113,227,.1)', dot: '#0071E3' },
  sick:     { label: 'Baja',       color: '#dc2626', bg: 'rgba(220,38,38,.1)', dot: '#dc2626' },
  personal: { label: 'Personal',   color: '#7c3aed', bg: 'rgba(124,58,237,.1)', dot: '#7c3aed' },
  parental: { label: 'Maternidad', color: '#16a34a', bg: 'rgba(22,163,74,.1)', dot: '#16a34a' },
}
const STATUS_CFG = {
  approved: { label: 'Aprobado', color: '#16a34a', bg: 'rgba(22,163,74,.1)', dot: '#16a34a' },
  pending:  { label: 'Pendiente', color: '#d97706', bg: 'rgba(217,119,6,.1)', dot: '#F59E0B' },
  rejected: { label: 'Rechazado', color: '#dc2626', bg: 'rgba(220,38,38,.1)', dot: '#dc2626' },
}
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────
function avatarColor(name) {
  const colors = ['#0071E3', '#7c3aed', '#16a34a', '#dc2626', '#d97706', '#0EA5E9', '#8B5CF6']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}
function initials(name) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}
function fmtEuro(n) { return n != null ? '€' + Math.round(n).toLocaleString('es-ES') : '—' }
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}
function daysBetween(start, end) {
  if (!start || !end) return 0
  return Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1
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
      background: avatarColor(name),
      display: 'grid', placeItems: 'center',
      color: '#fff', fontSize: size * 0.4, fontWeight: 600,
      flexShrink: 0,
    }}>{initials(name)}</div>
  )
}

function Tab({ active, onClick, label, badge }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px', borderRadius: 8,
      background: active ? '#fff' : 'transparent',
      color: active ? T.text : T.text3, border: 'none',
      boxShadow: active ? '0 1px 2px rgba(0,0,0,.06)' : 'none',
      fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
      fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {label}
      {badge != null && badge > 0 && (
        <span style={{
          fontSize: 10, padding: '1px 5px', borderRadius: 999,
          background: active ? 'rgba(0,113,227,.12)' : 'rgba(0,0,0,.08)',
          color: active ? VERA_BLUE : T.text3,
          fontVariantNumeric: 'tabular-nums', minWidth: 16, textAlign: 'center',
        }}>{badge}</span>
      )}
    </button>
  )
}

// ─────────────────────────────────────────────────────────
// VERA INSIGHT (banner arriba que dice qué hacer)
// ─────────────────────────────────────────────────────────
function VeraInsight({ dashboard, onAsk }) {
  if (!dashboard) return null

  // Generar insights inteligentes basados en datos reales
  const insights = []

  if (dashboard.employees_at_risk?.length > 0) {
    insights.push({
      priority: 'high',
      icon: '⚠',
      title: `${dashboard.employees_at_risk.length} ${dashboard.employees_at_risk.length === 1 ? 'empleado en riesgo' : 'empleados en riesgo de fuga'}`,
      detail: dashboard.employees_at_risk.map(e => `${e.name} (${e.negative_pct}% feedback negativo)`).join(', '),
      action: 'Agenda 1:1 esta semana',
    })
  }

  if (dashboard.contracts_expiring_60d > 0) {
    insights.push({
      priority: 'medium',
      icon: '📋',
      title: `${dashboard.contracts_expiring_60d} contrato${dashboard.contracts_expiring_60d === 1 ? '' : 's'} vence${dashboard.contracts_expiring_60d === 1 ? '' : 'n'} en 60 días`,
      action: 'Decide si renovar o no renovar',
    })
  }

  if (dashboard.out_today >= 3) {
    insights.push({
      priority: 'medium',
      icon: '🌴',
      title: `${dashboard.out_today} personas fuera hoy`,
      action: 'Verifica cobertura operativa',
    })
  }

  if (dashboard.feedback?.score >= 7) {
    insights.push({
      priority: 'low',
      icon: '✨',
      title: `Clima laboral excelente (${dashboard.feedback.score}/10)`,
      action: 'Buen momento para pedir feedback de procesos',
    })
  }

  if (insights.length === 0) return null

  return (
    <div style={{
      background: '#fff', borderRadius: 12,
      border: `.5px solid ${T.hairline}`,
      padding: 16, marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6,
          background: VERA_BLUE, display: 'grid', placeItems: 'center',
        }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" fill="#fff" />
          </svg>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Lo que necesita tu atención</div>
        <button onClick={onAsk} style={{
          marginLeft: 'auto', padding: '5px 12px', borderRadius: 6,
          background: 'rgba(0,113,227,.08)', color: VERA_BLUE,
          border: 'none', cursor: 'pointer',
          fontSize: 11.5, fontWeight: 500, fontFamily: 'inherit',
        }}>Pregunta a Vera →</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {insights.map((ins, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '10px 12px', borderRadius: 8,
            background: ins.priority === 'high' ? 'rgba(220,38,38,.04)' :
                       ins.priority === 'medium' ? 'rgba(217,119,6,.04)' :
                       'rgba(22,163,74,.04)',
            border: `.5px solid ${
              ins.priority === 'high' ? 'rgba(220,38,38,.15)' :
              ins.priority === 'medium' ? 'rgba(217,119,6,.15)' :
              'rgba(22,163,74,.15)'
            }`,
          }}>
            <span style={{ fontSize: 14, marginTop: 1 }}>{ins.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: T.text, marginBottom: 2 }}>{ins.title}</div>
              {ins.detail && <div style={{ fontSize: 11.5, color: T.text3, marginBottom: 4 }}>{ins.detail}</div>}
              <div style={{ fontSize: 11.5, color: T.text2, fontWeight: 500 }}>→ {ins.action}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// TAB 1: EQUIPO
// ─────────────────────────────────────────────────────────
function EquipoTab({ employees, onSelect }) {
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [view, setView] = useState('grid')

  const filtered = employees.filter(e => {
    if (search && !e.full_name.toLowerCase().includes(search.toLowerCase())) return false
    if (deptFilter !== 'all' && e.department !== deptFilter) return false
    return true
  })

  const depts = [...new Set(employees.map(e => e.department))].filter(Boolean)

  return (
    <>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.text4 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar empleado..."
            style={{
              width: '100%', padding: '7px 10px 7px 30px',
              borderRadius: 8, border: `.5px solid ${T.hairline}`,
              background: '#fff', fontSize: 12, fontFamily: 'inherit',
              color: T.text, outline: 'none',
            }} />
        </div>

        <div style={{ display: 'flex', gap: 2, background: T.sidebar, borderRadius: 8, padding: 3 }}>
          <button onClick={() => setDeptFilter('all')} style={{
            padding: '5px 10px', borderRadius: 6, border: 'none',
            background: deptFilter === 'all' ? '#fff' : 'transparent',
            color: deptFilter === 'all' ? T.text : T.text3,
            boxShadow: deptFilter === 'all' ? '0 1px 2px rgba(0,0,0,.06)' : 'none',
            fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}>Todos</button>
          {depts.map(d => (
            <button key={d} onClick={() => setDeptFilter(d)} style={{
              padding: '5px 10px', borderRadius: 6, border: 'none',
              background: deptFilter === d ? '#fff' : 'transparent',
              color: deptFilter === d ? T.text : T.text3,
              boxShadow: deptFilter === d ? '0 1px 2px rgba(0,0,0,.06)' : 'none',
              fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}>{DEPT_CFG[d]?.label || d}</button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 2, background: T.sidebar, borderRadius: 8, padding: 3 }}>
          {[
            { k: 'grid', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
            { k: 'list', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
          ].map(v => (
            <button key={v.k} onClick={() => setView(v.k)} style={{
              padding: '5px 10px', borderRadius: 6, border: 'none',
              background: view === v.k ? '#fff' : 'transparent',
              color: view === v.k ? T.text : T.text3,
              boxShadow: view === v.k ? '0 1px 2px rgba(0,0,0,.06)' : 'none',
              cursor: 'pointer', display: 'grid', placeItems: 'center',
            }}>{v.icon}</button>
          ))}
        </div>
      </div>

      {view === 'grid' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {filtered.map(e => {
            const dept = DEPT_CFG[e.department] || { label: e.department, color: T.text3, bg: 'rgba(0,0,0,.04)' }
            return (
              <div key={e.id} onClick={() => onSelect(e)}
                onMouseEnter={ev => { ev.currentTarget.style.transform = 'translateY(-1px)'; ev.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.05)' }}
                onMouseLeave={ev => { ev.currentTarget.style.transform = 'translateY(0)'; ev.currentTarget.style.boxShadow = 'none' }}
                style={{
                  background: '#fff', borderRadius: 12,
                  border: `.5px solid ${T.hairline}`,
                  padding: 16, cursor: 'pointer', transition: 'all .15s',
                }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <Avatar name={e.full_name} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: T.text, marginBottom: 2 }}>{e.full_name}</div>
                    <div style={{ fontSize: 11.5, color: T.text4 }}>{e.position}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
                  <Pill label={dept.label} color={dept.color} bg={dept.bg} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `.5px solid ${T.hairline}`, paddingTop: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, color: T.text4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>Salario anual</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>
                      {fmtEuro(e.gross_salary)}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {view === 'list' && (
        <div style={{ background: '#fff', borderRadius: 12, border: `.5px solid ${T.hairline}`, overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '40px 1fr 1fr 110px 100px',
            gap: 12, padding: '10px 16px',
            fontSize: 10, color: T.text4, fontWeight: 500,
            textTransform: 'uppercase', letterSpacing: 0.5,
            borderBottom: `.5px solid ${T.hairline}`, background: T.sidebar,
          }}>
            <div></div><div>Nombre</div><div>Puesto</div><div>Departamento</div>
            <div style={{ textAlign: 'right' }}>Salario</div>
          </div>
          {filtered.map(e => {
            const dept = DEPT_CFG[e.department] || { label: e.department, color: T.text3, bg: 'rgba(0,0,0,.04)' }
            return (
              <div key={e.id} onClick={() => onSelect(e)}
                onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(0,0,0,.02)'}
                onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                style={{
                  display: 'grid', gridTemplateColumns: '40px 1fr 1fr 110px 100px',
                  gap: 12, padding: '12px 16px',
                  borderBottom: `.5px solid ${T.hairline}`,
                  cursor: 'pointer', alignItems: 'center',
                  transition: 'background .12s',
                }}>
                <Avatar name={e.full_name} size={28} />
                <div style={{ fontSize: 13, fontWeight: 500 }}>{e.full_name}</div>
                <div style={{ fontSize: 12, color: T.text3 }}>{e.position}</div>
                <div><Pill label={dept.label} color={dept.color} bg={dept.bg} /></div>
                <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{fmtEuro(e.gross_salary)}</div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────
// TAB 2: VACACIONES
// ─────────────────────────────────────────────────────────
function VacacionesTab({ token }) {
  const [vacations, setVacations] = useState([])
  const [summary, setSummary] = useState({})
  const [filter, setFilter] = useState('upcoming')

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const r = await fetch(`${API}/api/hr/vacations`, { headers: { Authorization: `Bearer ${token}` } })
      if (r.ok) {
        const d = await r.json()
        setVacations(d.vacations || [])
        setSummary(d.summary || {})
      }
    } catch {}
  }

  async function updateStatus(id, status) {
    try {
      await fetch(`${API}/api/hr/vacations/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      load()
    } catch {}
  }

  const today = new Date()
  const filtered = vacations.filter(v => {
    const end = new Date(v.end_date)
    const start = new Date(v.start_date)
    if (filter === 'upcoming') return end >= today
    if (filter === 'past') return end < today
    if (filter === 'pending') return v.status === 'pending'
    return true
  })

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{
          padding: '8px 14px', borderRadius: 10,
          background: '#fff', border: `.5px solid ${T.hairline}`,
        }}>
          <div style={{ fontSize: 10, color: T.text4, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Fuera hoy</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{summary.today_out || 0}</div>
        </div>
        <div style={{
          padding: '8px 14px', borderRadius: 10,
          background: '#fff', border: `.5px solid ${T.hairline}`,
        }}>
          <div style={{ fontSize: 10, color: T.text4, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Esta semana</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{summary.this_week || 0}</div>
        </div>
        <div style={{
          padding: '8px 14px', borderRadius: 10,
          background: '#fff', border: `.5px solid ${T.hairline}`,
        }}>
          <div style={{ fontSize: 10, color: T.text4, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Pendientes</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#d97706', fontVariantNumeric: 'tabular-nums' }}>{summary.pending || 0}</div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 2, background: T.sidebar, borderRadius: 8, padding: 3 }}>
          {[
            { k: 'upcoming', l: 'Próximas' },
            { k: 'pending', l: 'Pendientes' },
            { k: 'past', l: 'Pasadas' },
            { k: 'all', l: 'Todas' },
          ].map(f => (
            <button key={f.k} onClick={() => setFilter(f.k)} style={{
              padding: '5px 12px', borderRadius: 6, border: 'none',
              background: filter === f.k ? '#fff' : 'transparent',
              color: filter === f.k ? T.text : T.text3,
              boxShadow: filter === f.k ? '0 1px 2px rgba(0,0,0,.06)' : 'none',
              fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}>{f.l}</button>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: `.5px solid ${T.hairline}`, overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '40px 1fr 200px 100px 110px 110px 130px',
          gap: 12, padding: '10px 16px',
          fontSize: 10, color: T.text4, fontWeight: 500,
          textTransform: 'uppercase', letterSpacing: 0.5,
          borderBottom: `.5px solid ${T.hairline}`, background: T.sidebar,
        }}>
          <div></div><div>Empleado</div><div>Fechas</div>
          <div style={{ textAlign: 'right' }}>Días</div>
          <div>Tipo</div><div>Estado</div>
          <div style={{ textAlign: 'right' }}>Acciones</div>
        </div>
        {filtered.map(v => {
          const vt = VACATION_CFG[v.vacation_type] || VACATION_CFG.vacation
          const st = STATUS_CFG[v.status] || STATUS_CFG.pending
          return (
            <div key={v.id} style={{
              display: 'grid', gridTemplateColumns: '40px 1fr 200px 100px 110px 110px 130px',
              gap: 12, padding: '12px 16px',
              borderBottom: `.5px solid ${T.hairline}`,
              alignItems: 'center',
            }}>
              <Avatar name={v.employee_name || '?'} size={28} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{v.employee_name}</div>
                <div style={{ fontSize: 11, color: T.text4 }}>{DEPT_CFG[v.employee_department]?.label || v.employee_department}</div>
              </div>
              <div style={{ fontSize: 12, color: T.text3 }}>
                {fmtDate(v.start_date)} → {fmtDate(v.end_date)}
              </div>
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                {v.days}
              </div>
              <div><Pill {...vt} /></div>
              <div><Pill {...st} /></div>
              <div style={{ textAlign: 'right' }}>
                {v.status === 'pending' && (
                  <>
                    <button onClick={() => updateStatus(v.id, 'approved')} style={{
                      padding: '4px 8px', borderRadius: 6,
                      background: 'rgba(22,163,74,.1)', color: '#16a34a',
                      border: 'none', cursor: 'pointer',
                      fontSize: 11, fontFamily: 'inherit', marginRight: 4,
                    }}>Aprobar</button>
                    <button onClick={() => updateStatus(v.id, 'rejected')} style={{
                      padding: '4px 8px', borderRadius: 6,
                      background: 'transparent', color: T.text3,
                      border: `.5px solid ${T.hairline}`, cursor: 'pointer',
                      fontSize: 11, fontFamily: 'inherit',
                    }}>Rechazar</button>
                  </>
                )}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ padding: 60, textAlign: 'center', color: T.text4, fontSize: 13 }}>
            Sin vacaciones en esta categoría
          </div>
        )}
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────
// TAB 3: CONTRATOS
// ─────────────────────────────────────────────────────────
function ContratosTab({ token }) {
  const [contracts, setContracts] = useState([])
  const [summary, setSummary] = useState({})

  useEffect(() => {
    fetch(`${API}/api/hr/contracts`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setContracts(d.contracts || []); setSummary(d.summary || {}) }).catch(e => console.error('Error de red:', e))
  }, [])

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ padding: '8px 14px', borderRadius: 10, background: '#fff', border: `.5px solid ${T.hairline}` }}>
          <div style={{ fontSize: 10, color: T.text4, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Indefinidos</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{summary.indefinidos || 0}</div>
        </div>
        <div style={{ padding: '8px 14px', borderRadius: 10, background: '#fff', border: `.5px solid ${T.hairline}` }}>
          <div style={{ fontSize: 10, color: T.text4, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Temporales</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{summary.temporales || 0}</div>
        </div>
        <div style={{ padding: '8px 14px', borderRadius: 10, background: '#fff', border: `.5px solid ${T.hairline}` }}>
          <div style={{ fontSize: 10, color: T.text4, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Prácticas</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{summary.practicas || 0}</div>
        </div>
        {summary.expiring_60d > 0 && (
          <div style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(220,38,38,.05)', border: '.5px solid rgba(220,38,38,.2)' }}>
            <div style={{ fontSize: 10, color: '#dc2626', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>⚠ Vencen en 60d</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>{summary.expiring_60d}</div>
          </div>
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: `.5px solid ${T.hairline}`, overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '40px 1fr 120px 110px 110px 90px 110px',
          gap: 12, padding: '10px 16px',
          fontSize: 10, color: T.text4, fontWeight: 500,
          textTransform: 'uppercase', letterSpacing: 0.5,
          borderBottom: `.5px solid ${T.hairline}`, background: T.sidebar,
        }}>
          <div></div><div>Empleado</div><div>Tipo</div><div>Inicio</div><div>Fin</div>
          <div style={{ textAlign: 'right' }}>Horas</div>
          <div style={{ textAlign: 'right' }}>Salario</div>
        </div>
        {contracts.map(c => {
          const ct = CONTRACT_CFG[c.contract_type] || CONTRACT_CFG.indefinido
          return (
            <div key={c.id} style={{
              display: 'grid', gridTemplateColumns: '40px 1fr 120px 110px 110px 90px 110px',
              gap: 12, padding: '12px 16px',
              borderBottom: `.5px solid ${T.hairline}`,
              alignItems: 'center',
              background: c.expires_soon ? 'rgba(220,38,38,.03)' : 'transparent',
            }}>
              <Avatar name={c.employee_name || '?'} size={28} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{c.employee_name}</div>
                <div style={{ fontSize: 11, color: T.text4 }}>{c.employee_position}</div>
              </div>
              <div><Pill {...ct} /></div>
              <div style={{ fontSize: 12, color: T.text3 }}>{fmtDate(c.start_date)}</div>
              <div style={{ fontSize: 12, color: c.expires_soon ? '#dc2626' : T.text3, fontWeight: c.expires_soon ? 600 : 400 }}>
                {c.end_date ? fmtDate(c.end_date) : '—'}
                {c.expires_soon && <span style={{ marginLeft: 4 }}>⚠</span>}
              </div>
              <div style={{ textAlign: 'right', fontSize: 12 }}>{c.working_hours}h</div>
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{fmtEuro(c.salary_gross)}</div>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────
// TAB 4: NÓMINAS
// ─────────────────────────────────────────────────────────
function NominasTab({ token }) {
  const [payslips, setPayslips] = useState([])
  const [summary, setSummary] = useState({})

  useEffect(() => {
    fetch(`${API}/api/hr/payslips`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setPayslips(d.payslips || []); setSummary(d.summary || {}) }).catch(e => console.error('Error de red:', e))
  }, [])

  // Agrupar por mes/año
  const grouped = (() => {
    const g = {}
    payslips.forEach(p => {
      const k = `${p.period_year}-${String(p.period_month).padStart(2, '0')}`
      if (!g[k]) g[k] = { label: `${MESES[p.period_month - 1]} ${p.period_year}`, items: [], total_gross: 0, total_net: 0, total_cost: 0 }
      g[k].items.push(p)
      g[k].total_gross += p.gross_amount
      g[k].total_net += p.net_amount
      g[k].total_cost += p.gross_amount + p.ss_company
    })
    return g
  })()

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ padding: '8px 14px', borderRadius: 10, background: '#fff', border: `.5px solid ${T.hairline}` }}>
          <div style={{ fontSize: 10, color: T.text4, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Bruto pagado</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{fmtEuro(summary.total_gross)}</div>
        </div>
        <div style={{ padding: '8px 14px', borderRadius: 10, background: '#fff', border: `.5px solid ${T.hairline}` }}>
          <div style={{ fontSize: 10, color: T.text4, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Neto pagado</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{fmtEuro(summary.total_net)}</div>
        </div>
        <div style={{ padding: '8px 14px', borderRadius: 10, background: '#fff', border: `.5px solid ${T.hairline}` }}>
          <div style={{ fontSize: 10, color: T.text4, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Coste total empresa</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{fmtEuro(summary.total_cost)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])).map(([k, group]) => (
          <div key={k}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 8, paddingLeft: 4,
            }}>
              <div style={{ fontSize: 11, color: T.text4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {group.label} · {group.items.length} nóminas
              </div>
              <div style={{ display: 'flex', gap: 14, fontSize: 11 }}>
                <span style={{ color: T.text4 }}>Bruto: <strong style={{ color: T.text2 }}>{fmtEuro(group.total_gross)}</strong></span>
                <span style={{ color: T.text4 }}>Neto: <strong style={{ color: T.text2 }}>{fmtEuro(group.total_net)}</strong></span>
                <span style={{ color: T.text4 }}>Coste: <strong style={{ color: T.text2 }}>{fmtEuro(group.total_cost)}</strong></span>
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 12, border: `.5px solid ${T.hairline}`, overflow: 'hidden' }}>
              {group.items.map(p => (
                <div key={p.id} style={{
                  display: 'grid', gridTemplateColumns: '40px 1fr 100px 100px 100px 100px',
                  gap: 12, padding: '10px 16px',
                  borderBottom: `.5px solid ${T.hairline}`,
                  alignItems: 'center',
                }}>
                  <Avatar name={p.employee_name || '?'} size={26} />
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{p.employee_name}</div>
                    <div style={{ fontSize: 10.5, color: T.text4 }}>{DEPT_CFG[p.employee_department]?.label || p.employee_department}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 11.5 }}>
                    <div style={{ color: T.text4, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.4 }}>Bruto</div>
                    <div style={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{fmtEuro(p.gross_amount)}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 11.5 }}>
                    <div style={{ color: T.text4, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.4 }}>IRPF</div>
                    <div style={{ color: T.text3, fontVariantNumeric: 'tabular-nums' }}>{fmtEuro(p.irpf)}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 11.5 }}>
                    <div style={{ color: T.text4, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.4 }}>SS</div>
                    <div style={{ color: T.text3, fontVariantNumeric: 'tabular-nums' }}>{fmtEuro(p.ss_employee)}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 11.5 }}>
                    <div style={{ color: T.text4, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.4 }}>Neto</div>
                    <div style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmtEuro(p.net_amount)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────
// DRAWER EMPLEADO (detalle)
// ─────────────────────────────────────────────────────────
function EmployeeDrawer({ employee, onClose, token }) {
  const [feedbacks, setFeedbacks] = useState([])
  const [contract, setContract] = useState(null)
  const [vacations, setVacations] = useState([])

  useEffect(() => {
    fetch(`${API}/api/hr/vacations?employee_id=${employee.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setVacations(d.vacations || [])).catch(e => console.error('Error de red:', e))
    fetch(`${API}/api/hr/contracts`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setContract((d.contracts || []).find(c => c.employee_id === employee.id))).catch(e => console.error('Error de red:', e))
  }, [employee?.id])

  if (!employee) return null
  const dept = DEPT_CFG[employee.department] || { label: employee.department, color: T.text3, bg: 'rgba(0,0,0,.04)' }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)',
      display: 'flex', justifyContent: 'flex-end', zIndex: 100,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 460, height: '100vh', background: '#fff',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'slideIn .2s ease',
      }}>
        <style>{`@keyframes slideIn{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

        <div style={{ padding: 20, borderBottom: `.5px solid ${T.hairline}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <Avatar name={employee.full_name} size={56} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 2 }}>{employee.full_name}</div>
              <div style={{ fontSize: 12.5, color: T.text3, marginBottom: 8 }}>{employee.position}</div>
              <div style={{ display: 'flex', gap: 5 }}>
                <Pill label={dept.label} color={dept.color} bg={dept.bg} />
              </div>
            </div>
            <button onClick={onClose} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: 4, color: T.text4,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: T.text4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Contacto</div>
            <div style={{ background: T.sidebar, borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 10.5, color: T.text4, marginBottom: 2 }}>Email</div>
              <div style={{ fontSize: 12.5, color: T.text }}>{employee.email}</div>
            </div>
          </div>

          {contract && (
            <div>
              <div style={{ fontSize: 10, color: T.text4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Contrato</div>
              <div style={{ background: T.sidebar, borderRadius: 10, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Pill {...(CONTRACT_CFG[contract.contract_type] || CONTRACT_CFG.indefinido)} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{fmtEuro(contract.salary_gross)}/año</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: T.text3 }}>
                  <span>{fmtDate(contract.start_date)}</span>
                  <span>{contract.end_date ? fmtDate(contract.end_date) : 'Indefinido'}</span>
                </div>
                <div style={{ fontSize: 11, color: T.text4, marginTop: 4 }}>{contract.working_hours}h/semana</div>
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: 10, color: T.text4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              Vacaciones · {vacations.length}
            </div>
            <div style={{ background: T.sidebar, borderRadius: 10, padding: 12 }}>
              {vacations.length === 0 ? (
                <div style={{ fontSize: 12, color: T.text4, textAlign: 'center' }}>Sin vacaciones registradas</div>
              ) : vacations.slice(0, 6).map(v => (
                <div key={v.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 0',
                  borderBottom: `.5px solid ${T.hairline}`,
                }}>
                  <Pill {...VACATION_CFG[v.vacation_type]} />
                  <span style={{ fontSize: 11.5, color: T.text3, flex: 1 }}>
                    {fmtDate(v.start_date)} · {v.days}d
                  </span>
                  <Pill {...STATUS_CFG[v.status]} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────
// VERA DRAWER (chat con contexto HR)
// ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────
export default function HRPage() {
  const router = useRouter()
  const [tab, setTab] = useState('equipo')
  const [employees, setEmployees] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [selected, setSelected] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pendingVacations, setPendingVacations] = useState(0)

  // Notificaciones: empleados en riesgo + contratos por vencer + vacaciones pendientes
  const notificationCount = (
    (dashboard?.employees_at_risk?.length || 0) +
    (dashboard?.contracts_expiring_60d || 0) +
    pendingVacations
  )
  const [veraOpen, setVeraOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('nexum_token') : null
    if (!t) { router.push('/login'); return }
    setToken(t)
    loadAll(t)
  }, [])

  async function loadAll(t) {
    setLoading(true)
    try {
      const [empR, dashR, vacR] = await Promise.all([
        fetch(`${API}/api/hr/employees`, { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`${API}/api/hr/dashboard`, { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`${API}/api/hr/vacations?status=pending`, { headers: { Authorization: `Bearer ${t}` } }),
      ])
      if (empR.ok) {
        const d = await empR.json()
        setEmployees(d.employees || d || [])
      }
      if (dashR.ok) setDashboard(await dashR.json())
      if (vacR.ok) {
        const d = await vacR.json()
        setPendingVacations(d.summary?.pending || 0)
      }
    } catch {}
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', background: T.bg, display: 'flex',
      fontFamily: FONT, WebkitFontSmoothing: 'antialiased',
    }}>
      <style>{`*{box-sizing:border-box}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:999px}input:focus{outline:none}`}</style>

      <Sidebar active="/hr" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100vh' }}>
        <header style={{
          padding: '20px 32px 0',
          background: 'rgba(251,251,253,.85)',
          backdropFilter: 'saturate(180%) blur(20px)',
          borderBottom: `.5px solid ${T.hairline}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <h1 style={{ fontSize: 22, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.3 }}>Recursos Humanos</h1>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: '#16a34a' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.text4 }}>
                <span style={{ fontSize: 14 }}>🇪🇸</span>
                <span>España</span>
                {dashboard && (
                  <>
                    <span>·</span>
                    <span>{dashboard.total_employees} personas · {fmtEuro(dashboard.monthly_cost)}/mes · {dashboard.out_today} fuera hoy</span>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setNotificationsOpen(o => !o)} style={{
                position: 'relative',
                padding: '7px 10px', borderRadius: 8,
                background: '#fff', color: T.text2,
                border: `.5px solid ${T.hairline}`,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'grid', placeItems: 'center',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {notificationCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    background: '#dc2626', color: '#fff',
                    fontSize: 9, fontWeight: 600,
                    padding: '1px 5px', borderRadius: 999,
                    minWidth: 16, textAlign: 'center',
                  }}>{notificationCount}</span>
                )}
              </button>
              <button onClick={() => setVeraOpen(true)} style={{
                padding: '7px 14px', borderRadius: 8,
                background: '#fff', color: VERA_BLUE,
                border: `.5px solid rgba(0,113,227,.3)`,
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" />
                </svg>
                Vera
              </button>
              <button style={{
                padding: '7px 14px', borderRadius: 8,
                background: VERA_BLUE, color: '#fff',
                border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'inherit',
              }}>+ Nuevo empleado</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 2, background: T.sidebar, borderRadius: 8, padding: 3, width: 'fit-content' }}>
            <Tab label="Equipo" active={tab === 'equipo'} onClick={() => setTab('equipo')} />
            <Tab label="Vacaciones" active={tab === 'vacaciones'} onClick={() => setTab('vacaciones')} badge={pendingVacations} />
            <Tab label="Contratos" active={tab === 'contratos'} onClick={() => setTab('contratos')} badge={dashboard?.contracts_expiring_60d} />
            <Tab label="Nóminas" active={tab === 'nominas'} onClick={() => setTab('nominas')} />
          </div>

          <div style={{ height: 16 }} />
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: T.text4, fontSize: 13 }}>Cargando...</div>
          ) : (
            <>
              {tab === 'equipo' && <EquipoTab employees={employees} onSelect={setSelected} />}
              {tab === 'vacaciones' && <VacacionesTab token={token} />}
              {tab === 'contratos' && <ContratosTab token={token} />}
              {tab === 'nominas' && <NominasTab token={token} />}
            </>
          )}
        </div>
      </div>

      {selected && <EmployeeDrawer employee={selected} onClose={() => setSelected(null)} token={token} />}
      {veraOpen && <VeraDrawer onClose={() => setVeraOpen(false)} token={token} dashboard={dashboard} />}

      {notificationsOpen && (
        <div onClick={() => setNotificationsOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 90,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            position: 'fixed', top: 70, right: 32,
            width: 380, maxHeight: 500, overflowY: 'auto',
            background: '#fff', borderRadius: 12,
            border: `.5px solid ${T.hairline}`,
            boxShadow: '0 8px 30px rgba(0,0,0,.12)',
            padding: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Notificaciones</div>
              <button onClick={() => { setNotificationsOpen(false); setVeraOpen(true) }} style={{
                fontSize: 11, color: VERA_BLUE, background: 'transparent',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
              }}>Pregunta a Vera →</button>
            </div>

            {notificationCount === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: T.text4, fontSize: 12 }}>
                Sin notificaciones nuevas
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dashboard?.employees_at_risk?.length > 0 && (
                  <div style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: 'rgba(220,38,38,.04)',
                    border: '.5px solid rgba(220,38,38,.15)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: '#dc2626' }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>
                        {dashboard.employees_at_risk.length} {dashboard.employees_at_risk.length === 1 ? 'empleado en riesgo de fuga' : 'empleados en riesgo de fuga'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: T.text3, marginBottom: 4, paddingLeft: 12 }}>
                      {dashboard.employees_at_risk.map(e => `${e.name} (${e.negative_pct}%)`).join(', ')}
                    </div>
                    <div style={{ fontSize: 11, color: T.text2, fontWeight: 500, paddingLeft: 12 }}>→ Agenda 1:1 esta semana</div>
                  </div>
                )}

                {dashboard?.contracts_expiring_60d > 0 && (
                  <div onClick={() => { setNotificationsOpen(false); setTab('contratos') }} style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: 'rgba(217,119,6,.04)',
                    border: '.5px solid rgba(217,119,6,.15)',
                    cursor: 'pointer',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: '#d97706' }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>
                        {dashboard.contracts_expiring_60d} {dashboard.contracts_expiring_60d === 1 ? 'contrato vence' : 'contratos vencen'} en 60 días
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: T.text2, fontWeight: 500, paddingLeft: 12 }}>→ Decide si renovar</div>
                  </div>
                )}

                {pendingVacations > 0 && (
                  <div onClick={() => { setNotificationsOpen(false); setTab('vacaciones') }} style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: 'rgba(0,113,227,.04)',
                    border: '.5px solid rgba(0,113,227,.15)',
                    cursor: 'pointer',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: VERA_BLUE }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>
                        {pendingVacations} {pendingVacations === 1 ? 'solicitud de vacaciones pendiente' : 'solicitudes de vacaciones pendientes'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: T.text2, fontWeight: 500, paddingLeft: 12 }}>→ Revisa y aprueba</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {veraOpen && <VeraDrawer onClose={() => setVeraOpen(false)} token={token} dashboard={dashboard} />}

      {notificationsOpen && (
        <div onClick={() => setNotificationsOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 90,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            position: 'fixed', top: 70, right: 32,
            width: 380, maxHeight: 500, overflowY: 'auto',
            background: '#fff', borderRadius: 12,
            border: `.5px solid ${T.hairline}`,
            boxShadow: '0 8px 30px rgba(0,0,0,.12)',
            padding: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Notificaciones</div>
              <button onClick={() => { setNotificationsOpen(false); setVeraOpen(true) }} style={{
                fontSize: 11, color: VERA_BLUE, background: 'transparent',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
              }}>Pregunta a Vera →</button>
            </div>

            {notificationCount === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: T.text4, fontSize: 12 }}>
                Sin notificaciones nuevas
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dashboard?.employees_at_risk?.length > 0 && (
                  <div style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: 'rgba(220,38,38,.04)',
                    border: '.5px solid rgba(220,38,38,.15)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: '#dc2626' }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>
                        {dashboard.employees_at_risk.length} {dashboard.employees_at_risk.length === 1 ? 'empleado en riesgo de fuga' : 'empleados en riesgo de fuga'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: T.text3, marginBottom: 4, paddingLeft: 12 }}>
                      {dashboard.employees_at_risk.map(e => `${e.name} (${e.negative_pct}%)`).join(', ')}
                    </div>
                    <div style={{ fontSize: 11, color: T.text2, fontWeight: 500, paddingLeft: 12 }}>→ Agenda 1:1 esta semana</div>
                  </div>
                )}

                {dashboard?.contracts_expiring_60d > 0 && (
                  <div onClick={() => { setNotificationsOpen(false); setTab('contratos') }} style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: 'rgba(217,119,6,.04)',
                    border: '.5px solid rgba(217,119,6,.15)',
                    cursor: 'pointer',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: '#d97706' }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>
                        {dashboard.contracts_expiring_60d} {dashboard.contracts_expiring_60d === 1 ? 'contrato vence' : 'contratos vencen'} en 60 días
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: T.text2, fontWeight: 500, paddingLeft: 12 }}>→ Decide si renovar</div>
                  </div>
                )}

                {pendingVacations > 0 && (
                  <div onClick={() => { setNotificationsOpen(false); setTab('vacaciones') }} style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: 'rgba(0,113,227,.04)',
                    border: '.5px solid rgba(0,113,227,.15)',
                    cursor: 'pointer',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: VERA_BLUE }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>
                        {pendingVacations} {pendingVacations === 1 ? 'solicitud de vacaciones pendiente' : 'solicitudes de vacaciones pendientes'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: T.text2, fontWeight: 500, paddingLeft: 12 }}>→ Revisa y aprueba</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
