'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { T, FONT, useT } from '@/components/ui/tokens'
import VeraDrawer from '@/components/ui/VeraDrawer'
import { PageHeader, Btn, BtnSec, Input, Field } from '@/components/ui/primitives'
import { useMoney } from '@/lib/money'

import { API_BASE as API } from '@/lib/api'
const VERA_BLUE = '#3D2BFF'

// ─────────────────────────────────────────────────────────
// CONFIGS
// ─────────────────────────────────────────────────────────
const DEPT_CFG = {
  diseno:     { label: 'Diseño',     color: '#3D2BFF', bg: 'rgba(61,43,255,.1)' },
  ventas:     { label: 'Ventas',     color: '#059669', bg: 'rgba(5,150,105,.1)' },
  almacen:    { label: 'Almacén',    color: '#d97706', bg: 'rgba(217,119,6,.1)' },
  marketing:  { label: 'Marketing',  color: '#0EA5E9', bg: 'rgba(14,165,233,.1)' },
  admin:      { label: 'Admin',      color: '#6b7280', bg: 'rgba(107,114,128,.1)' },
  tecnologia: { label: 'Tecnología', color: '#3D2BFF', bg: 'rgba(61,43,255,.1)' },
}
const CONTRACT_CFG = {
  indefinido: { label: 'Indefinido', color: '#059669', bg: 'rgba(5,150,105,.1)', dot: '#059669' },
  temporal:   { label: 'Temporal',   color: '#d97706', bg: 'rgba(217,119,6,.1)', dot: '#F59E0B' },
  practicas:  { label: 'Prácticas',  color: '#0EA5E9', bg: 'rgba(14,165,233,.1)', dot: '#0EA5E9' },
  becario:    { label: 'Becario',    color: '#3D2BFF', bg: 'rgba(61,43,255,.1)', dot: '#3D2BFF' },
  autonomo:   { label: 'Autónomo',   color: '#6b7280', bg: 'rgba(107,114,128,.1)', dot: '#9CA3AF' },
}
const VACATION_CFG = {
  vacation: { label: 'Vacaciones', color: '#3D2BFF', bg: 'rgba(61,43,255,.1)', dot: '#3D2BFF' },
  sick:     { label: 'Baja',       color: '#dc2626', bg: 'rgba(220,38,38,.1)', dot: '#dc2626' },
  personal: { label: 'Personal',   color: '#3D2BFF', bg: 'rgba(61,43,255,.1)', dot: '#3D2BFF' },
  parental: { label: 'Maternidad', color: '#059669', bg: 'rgba(5,150,105,.1)', dot: '#059669' },
}
const STATUS_CFG = {
  approved: { label: 'Aprobado', color: '#059669', bg: 'rgba(5,150,105,.1)', dot: '#059669' },
  pending:  { label: 'Pendiente', color: '#d97706', bg: 'rgba(217,119,6,.1)', dot: '#F59E0B' },
  rejected: { label: 'Rechazado', color: '#dc2626', bg: 'rgba(220,38,38,.1)', dot: '#dc2626' },
}
// Tipo de vínculo del empleado (alineado con el backend: employee_type).
const EMPLOYEE_TYPE_CFG = {
  permanente: { label: 'Plantilla',  color: T.blue,  bg: 'rgba(61,43,255,.1)', dot: T.blue },
  temporal:   { label: 'Temporal',   color: T.amber, bg: T.amberSoft,          dot: T.amber },
  voluntario: { label: 'Voluntario', color: T.green, bg: T.greenSoft,          dot: T.green },
}
const TYPE_FILTERS = [
  { k: 'all',        l: 'Todos' },
  { k: 'permanente', l: 'Plantilla' },
  { k: 'temporal',   l: 'Temporales' },
  { k: 'voluntario', l: 'Voluntarios' },
]
// Estados/prioridad de las tareas de grupo (espejo de los enums del backend).
const TASK_STATUS_CFG = {
  pendiente:   { label: 'Pendiente',   color: T.text3, bg: 'rgba(0,0,0,.05)',    dot: '#9CA3AF' },
  en_progreso: { label: 'En progreso', color: T.blue,  bg: 'rgba(61,43,255,.1)', dot: T.blue },
  completada:  { label: 'Completada',  color: T.green, bg: T.greenSoft,          dot: T.green },
  bloqueada:   { label: 'Bloqueada',   color: T.red,   bg: T.redSoft,            dot: T.red },
}
const TASK_PRIORITY_CFG = {
  baja:    { label: 'Baja',    color: T.text3, bg: 'rgba(0,0,0,.05)' },
  media:   { label: 'Media',   color: T.blue,  bg: 'rgba(61,43,255,.1)' },
  alta:    { label: 'Alta',    color: T.amber, bg: T.amberSoft },
  urgente: { label: 'Urgente', color: T.red,   bg: T.redSoft },
}
const KANBAN_COLS = [
  { k: 'pendiente',   l: 'Pendiente' },
  { k: 'en_progreso', l: 'En progreso' },
  { k: 'completada',  l: 'Completada' },
  { k: 'bloqueada',   l: 'Bloqueada' },
]
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────
function avatarColor(name) {
  const colors = ['#3D2BFF', '#3D2BFF', '#059669', '#dc2626', '#d97706', '#0EA5E9', '#6366F1']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}
function initials(name) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}
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

// ─────────────────────────────────────────────────────────
// VERA INSIGHT (banner arriba que dice qué hacer)
// ─────────────────────────────────────────────────────────
function VeraInsight({ dashboard, onAsk }) {
  const T = useT()
  if (!dashboard) return null

  // Generar insights inteligentes basados en datos reales
  const insights = []

  const ICON_SVG = {
    risk: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></svg>,
    contract: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></svg>,
    calendar: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>,
    star: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8L12 14.6 7 18.2l1.9-5.8L4 8.8h6.1L12 3z" /></svg>,
  }

  if (dashboard.employees_at_risk?.length > 0) {
    insights.push({
      priority: 'high',
      icon: ICON_SVG.risk,
      title: `${dashboard.employees_at_risk.length} ${dashboard.employees_at_risk.length === 1 ? 'empleado en riesgo' : 'empleados en riesgo de fuga'}`,
      detail: dashboard.employees_at_risk.map(e => `${e.name} (${e.negative_pct}% feedback negativo)`).join(', '),
      action: 'Agenda 1:1 esta semana',
    })
  }

  if (dashboard.contracts_expiring_60d > 0) {
    insights.push({
      priority: 'medium',
      icon: ICON_SVG.contract,
      title: `${dashboard.contracts_expiring_60d} contrato${dashboard.contracts_expiring_60d === 1 ? '' : 's'} vence${dashboard.contracts_expiring_60d === 1 ? '' : 'n'} en 60 días`,
      action: 'Decide si renovar o no renovar',
    })
  }

  if (dashboard.out_today >= 3) {
    insights.push({
      priority: 'medium',
      icon: ICON_SVG.calendar,
      title: `${dashboard.out_today} personas fuera hoy`,
      action: 'Verifica cobertura operativa',
    })
  }

  if (dashboard.feedback?.score >= 7) {
    insights.push({
      priority: 'low',
      icon: ICON_SVG.star,
      title: `Clima laboral excelente (${dashboard.feedback.score}/10)`,
      action: 'Buen momento para pedir feedback de procesos',
    })
  }

  if (insights.length === 0) return null

  return (
    <div style={{
      background: T.card, borderRadius: 12,
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
          background: 'rgba(61,43,255,.08)', color: VERA_BLUE,
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
                       'rgba(5,150,105,.04)',
            border: `.5px solid ${
              ins.priority === 'high' ? 'rgba(220,38,38,.15)' :
              ins.priority === 'medium' ? 'rgba(217,119,6,.15)' :
              'rgba(5,150,105,.15)'
            }`,
          }}>
            <span style={{ marginTop: 1, display: 'flex', color: ins.priority === 'high' ? T.red : ins.priority === 'medium' ? T.amber : T.green }}>{ins.icon}</span>
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
  const T = useT()
  const { fmt } = useMoney()
  const money = (n) => n != null ? fmt(n, { decimals: 0 }) : '—'
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [view, setView] = useState('grid')

  const filtered = employees.filter(e => {
    if (search && !e.full_name.toLowerCase().includes(search.toLowerCase())) return false
    if (deptFilter !== 'all' && e.department !== deptFilter) return false
    if (typeFilter !== 'all' && (e.employee_type || 'permanente') !== typeFilter) return false
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
              background: T.card, fontSize: 12, fontFamily: 'inherit',
              color: T.text, outline: 'none',
            }} />
        </div>

        <div style={{ display: 'flex', gap: 2, background: T.sidebar, borderRadius: 8, padding: 3 }}>
          {TYPE_FILTERS.map(f => (
            <button key={f.k} onClick={() => setTypeFilter(f.k)} style={{
              padding: '5px 10px', borderRadius: 6, border: 'none',
              background: typeFilter === f.k ? T.card : 'transparent',
              color: typeFilter === f.k ? T.text : T.text3,
              boxShadow: typeFilter === f.k ? '0 1px 2px rgba(0,0,0,.06)' : 'none',
              fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}>{f.l}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 2, background: T.sidebar, borderRadius: 8, padding: 3 }}>
          <button onClick={() => setDeptFilter('all')} style={{
            padding: '5px 10px', borderRadius: 6, border: 'none',
            background: deptFilter === 'all' ? T.card : 'transparent',
            color: deptFilter === 'all' ? T.text : T.text3,
            boxShadow: deptFilter === 'all' ? '0 1px 2px rgba(0,0,0,.06)' : 'none',
            fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}>Todos</button>
          {depts.map(d => (
            <button key={d} onClick={() => setDeptFilter(d)} style={{
              padding: '5px 10px', borderRadius: 6, border: 'none',
              background: deptFilter === d ? T.card : 'transparent',
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
              background: view === v.k ? T.card : 'transparent',
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
            const etype = EMPLOYEE_TYPE_CFG[e.employee_type || 'permanente']
            const isVolunteer = (e.employee_type || 'permanente') === 'voluntario'
            return (
              <div key={e.id} onClick={() => onSelect(e)}
                onMouseEnter={ev => { ev.currentTarget.style.transform = 'translateY(-1px)'; ev.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.05)' }}
                onMouseLeave={ev => { ev.currentTarget.style.transform = 'translateY(0)'; ev.currentTarget.style.boxShadow = 'none' }}
                style={{
                  background: T.card, borderRadius: 12,
                  border: `.5px solid ${T.hairline}`,
                  padding: 16, cursor: 'pointer', transition: 'all .15s',
                }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <Avatar name={e.full_name} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: T.text, marginBottom: 2 }}>{e.full_name}</div>
                    <div style={{ fontSize: 11.5, color: T.text4 }}>{e.position || '—'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
                  {etype && <Pill label={etype.label} color={etype.color} bg={etype.bg} dot={etype.dot} />}
                  {e.department && <Pill label={dept.label} color={dept.color} bg={dept.bg} />}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `.5px solid ${T.hairline}`, paddingTop: 10 }}>
                  {isVolunteer ? (
                    <div>
                      <div style={{ fontSize: 10, color: T.text4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>Horas aportadas</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>
                        {(e.hours_contributed || 0).toLocaleString('es-ES')}h
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 10, color: T.text4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>Salario anual</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>
                        {money(e.gross_salary)}
                      </div>
                    </div>
                  )}
                  {e.end_date && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, color: T.text4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>Hasta</div>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: T.text3, marginTop: 2 }}>{fmtDate(e.end_date)}</div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {view === 'list' && (
        <div style={{ background: T.card, borderRadius: 12, border: `.5px solid ${T.hairline}`, overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '40px 1fr 1fr 110px 110px 100px',
            gap: 12, padding: '10px 16px',
            fontSize: 10, color: T.text4, fontWeight: 500,
            textTransform: 'uppercase', letterSpacing: 0.5,
            borderBottom: `.5px solid ${T.hairline}`, background: T.sidebar,
          }}>
            <div></div><div>Nombre</div><div>Puesto</div><div>Tipo</div><div>Departamento</div>
            <div style={{ textAlign: 'right' }}>Salario / Horas</div>
          </div>
          {filtered.map(e => {
            const dept = DEPT_CFG[e.department] || { label: e.department, color: T.text3, bg: 'rgba(0,0,0,.04)' }
            const etype = EMPLOYEE_TYPE_CFG[e.employee_type || 'permanente']
            const isVolunteer = (e.employee_type || 'permanente') === 'voluntario'
            return (
              <div key={e.id} onClick={() => onSelect(e)}
                onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(0,0,0,.02)'}
                onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                style={{
                  display: 'grid', gridTemplateColumns: '40px 1fr 1fr 110px 110px 100px',
                  gap: 12, padding: '12px 16px',
                  borderBottom: `.5px solid ${T.hairline}`,
                  cursor: 'pointer', alignItems: 'center',
                  transition: 'background .12s',
                }}>
                <Avatar name={e.full_name} size={28} />
                <div style={{ fontSize: 13, fontWeight: 500 }}>{e.full_name}</div>
                <div style={{ fontSize: 12, color: T.text3 }}>{e.position || '—'}</div>
                <div>{etype && <Pill label={etype.label} color={etype.color} bg={etype.bg} dot={etype.dot} />}</div>
                <div>{e.department && <Pill label={dept.label} color={dept.color} bg={dept.bg} />}</div>
                <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                  {isVolunteer ? `${(e.hours_contributed || 0)}h` : money(e.gross_salary)}
                </div>
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
  const T = useT()
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
          background: T.card, border: `.5px solid ${T.hairline}`,
        }}>
          <div style={{ fontSize: 10, color: T.text4, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Fuera hoy</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{summary.today_out || 0}</div>
        </div>
        <div style={{
          padding: '8px 14px', borderRadius: 10,
          background: T.card, border: `.5px solid ${T.hairline}`,
        }}>
          <div style={{ fontSize: 10, color: T.text4, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Esta semana</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{summary.this_week || 0}</div>
        </div>
        <div style={{
          padding: '8px 14px', borderRadius: 10,
          background: T.card, border: `.5px solid ${T.hairline}`,
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
              background: filter === f.k ? T.card : 'transparent',
              color: filter === f.k ? T.text : T.text3,
              boxShadow: filter === f.k ? '0 1px 2px rgba(0,0,0,.06)' : 'none',
              fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}>{f.l}</button>
          ))}
        </div>
      </div>

      <div style={{ background: T.card, borderRadius: 12, border: `.5px solid ${T.hairline}`, overflow: 'hidden' }}>
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
                      background: 'rgba(5,150,105,.1)', color: '#059669',
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
function CreateContractModal({ token, employees, onClose, onCreated }) {
  const T = useT()
  const { symbol } = useMoney()
  const [form, setForm] = useState({ employee_id: '', contract_type: 'indefinido', start_date: '', end_date: '', working_hours: '40', salary_gross: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    if (!form.employee_id) { setErr('Selecciona un empleado'); return }
    if (!form.start_date) { setErr('La fecha de inicio es obligatoria'); return }
    setSaving(true); setErr('')
    try {
      const r = await fetch(`${API}/api/hr/contracts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          employee_id: parseInt(form.employee_id, 10),
          contract_type: form.contract_type,
          start_date: form.start_date,
          end_date: form.end_date || null,
          working_hours: form.working_hours ? parseInt(form.working_hours, 10) : 40,
          salary_gross: form.salary_gross ? parseFloat(form.salary_gross) : null,
        }),
      })
      if (!r.ok) { const d = await r.json().catch(() => ({})); setErr(d.detail || 'No se pudo crear el contrato'); setSaving(false); return }
      onCreated()
    } catch { setErr('Error de conexión'); setSaving(false) }
  }

  const selStyle = { width: '100%', padding: '8px 10px', borderRadius: 8, border: `.5px solid ${T.hairline}`, background: T.card, color: T.text, fontFamily: 'inherit', fontSize: 13 }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <form onClick={e => e.stopPropagation()} onSubmit={submit} style={{ background: T.card, borderRadius: 16, padding: 24, width: 'min(460px, 100%)', border: `.5px solid ${T.hairline}` }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: T.text, marginBottom: 16 }}>Nuevo contrato</div>
        {err && <div role="alert" style={{ color: T.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}
        <Field label="Empleado *">
          <select value={form.employee_id} onChange={e => set('employee_id', e.target.value)} style={selStyle}>
            <option value="">Selecciona…</option>
            {employees.map(em => <option key={em.id} value={em.id}>{em.full_name}</option>)}
          </select>
        </Field>
        <Field label="Tipo">
          <select value={form.contract_type} onChange={e => set('contract_type', e.target.value)} style={selStyle}>
            <option value="indefinido">Indefinido</option>
            <option value="temporal">Temporal</option>
            <option value="practicas">Prácticas</option>
          </select>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Inicio *"><Input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} /></Field>
          <Field label="Fin"><Input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} /></Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Horas/sem"><Input type="number" value={form.working_hours} onChange={e => set('working_hours', e.target.value)} /></Field>
          <Field label={`Salario bruto (${symbol})`}><Input type="number" value={form.salary_gross} onChange={e => set('salary_gross', e.target.value)} placeholder="(del empleado)" /></Field>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <BtnSec onClick={onClose}>Cancelar</BtnSec>
          <Btn type="submit" disabled={saving}>{saving ? 'Creando…' : 'Crear contrato'}</Btn>
        </div>
      </form>
    </div>
  )
}

function ContratosTab({ token }) {
  const T = useT()
  const { fmt } = useMoney()
  const money = (n) => n != null ? fmt(n, { decimals: 0 }) : '—'
  const [contracts, setContracts] = useState([])
  const [summary, setSummary] = useState({})
  const [employees, setEmployees] = useState([])
  const [showCreate, setShowCreate] = useState(false)

  function loadContracts() {
    return fetch(`${API}/api/hr/contracts`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setContracts(d.contracts || []); setSummary(d.summary || {}) }).catch(e => console.error('Error de red:', e))
  }

  useEffect(() => {
    loadContracts()
    fetch(`${API}/api/hr/employees`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null).then(d => setEmployees(d?.employees || d || [])).catch(() => {})
  }, [])

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Btn onClick={() => setShowCreate(true)}>Nuevo contrato</Btn>
      </div>
      {showCreate && (
        <CreateContractModal token={token} employees={employees}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadContracts() }} />
      )}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ padding: '8px 14px', borderRadius: 10, background: T.card, border: `.5px solid ${T.hairline}` }}>
          <div style={{ fontSize: 10, color: T.text4, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Indefinidos</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{summary.indefinidos || 0}</div>
        </div>
        <div style={{ padding: '8px 14px', borderRadius: 10, background: T.card, border: `.5px solid ${T.hairline}` }}>
          <div style={{ fontSize: 10, color: T.text4, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Temporales</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{summary.temporales || 0}</div>
        </div>
        <div style={{ padding: '8px 14px', borderRadius: 10, background: T.card, border: `.5px solid ${T.hairline}` }}>
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

      <div style={{ background: T.card, borderRadius: 12, border: `.5px solid ${T.hairline}`, overflow: 'hidden' }}>
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
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{money(c.salary_gross)}</div>
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
  const T = useT()
  const { fmt } = useMoney()
  const money = (n) => n != null ? fmt(n, { decimals: 0 }) : '—'
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
        <div style={{ padding: '8px 14px', borderRadius: 10, background: T.card, border: `.5px solid ${T.hairline}` }}>
          <div style={{ fontSize: 10, color: T.text4, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Bruto pagado</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{money(summary.total_gross)}</div>
        </div>
        <div style={{ padding: '8px 14px', borderRadius: 10, background: T.card, border: `.5px solid ${T.hairline}` }}>
          <div style={{ fontSize: 10, color: T.text4, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Neto pagado</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{money(summary.total_net)}</div>
        </div>
        <div style={{ padding: '8px 14px', borderRadius: 10, background: T.card, border: `.5px solid ${T.hairline}` }}>
          <div style={{ fontSize: 10, color: T.text4, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Coste total empresa</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{money(summary.total_cost)}</div>
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
                <span style={{ color: T.text4 }}>Bruto: <strong style={{ color: T.text2 }}>{money(group.total_gross)}</strong></span>
                <span style={{ color: T.text4 }}>Neto: <strong style={{ color: T.text2 }}>{money(group.total_net)}</strong></span>
                <span style={{ color: T.text4 }}>Coste: <strong style={{ color: T.text2 }}>{money(group.total_cost)}</strong></span>
              </div>
            </div>

            <div style={{ background: T.card, borderRadius: 12, border: `.5px solid ${T.hairline}`, overflow: 'hidden' }}>
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
                    <div style={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{money(p.gross_amount)}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 11.5 }}>
                    <div style={{ color: T.text4, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.4 }}>IRPF</div>
                    <div style={{ color: T.text3, fontVariantNumeric: 'tabular-nums' }}>{money(p.irpf)}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 11.5 }}>
                    <div style={{ color: T.text4, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.4 }}>SS</div>
                    <div style={{ color: T.text3, fontVariantNumeric: 'tabular-nums' }}>{money(p.ss_employee)}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 11.5 }}>
                    <div style={{ color: T.text4, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.4 }}>Neto</div>
                    <div style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{money(p.net_amount)}</div>
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
  const T = useT()
  const { fmt } = useMoney()
  const money = (n) => n != null ? fmt(n, { decimals: 0 }) : '—'
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
  const etype = EMPLOYEE_TYPE_CFG[employee.employee_type || 'permanente']
  const isVolunteer = (employee.employee_type || 'permanente') === 'voluntario'
  const skillList = (employee.skills || '').split(',').map(s => s.trim()).filter(Boolean)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)',
      display: 'flex', justifyContent: 'flex-end', zIndex: 100,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 460, height: '100vh', background: T.card,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'slideIn .2s ease',
      }}>
        <style>{`@keyframes slideIn{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

        <div style={{ padding: 20, borderBottom: `.5px solid ${T.hairline}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <Avatar name={employee.full_name} size={56} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 2 }}>{employee.full_name}</div>
              <div style={{ fontSize: 12.5, color: T.text3, marginBottom: 8 }}>{employee.position || '—'}</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {etype && <Pill label={etype.label} color={etype.color} bg={etype.bg} dot={etype.dot} />}
                {employee.department && <Pill label={dept.label} color={dept.color} bg={dept.bg} />}
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

          {/* Compromiso temporal / voluntariado */}
          {(isVolunteer || employee.employee_type === 'temporal' || employee.start_date || employee.end_date || employee.availability || skillList.length > 0) && (
            <div>
              <div style={{ fontSize: 10, color: T.text4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                {isVolunteer ? 'Voluntariado' : 'Vínculo'}
              </div>
              <div style={{ background: T.sidebar, borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {etype && <Pill label={etype.label} color={etype.color} bg={etype.bg} dot={etype.dot} />}
                  {isVolunteer && (
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                      {(employee.hours_contributed || 0)}h aportadas
                    </span>
                  )}
                </div>
                {(employee.start_date || employee.end_date) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: T.text3 }}>
                    <span>{employee.start_date ? fmtDate(employee.start_date) : '—'}</span>
                    <span>{employee.end_date ? fmtDate(employee.end_date) : 'Sin fin'}</span>
                  </div>
                )}
                {employee.availability && (
                  <div>
                    <div style={{ fontSize: 10.5, color: T.text4, marginBottom: 2 }}>Disponibilidad</div>
                    <div style={{ fontSize: 12, color: T.text2 }}>{employee.availability}</div>
                  </div>
                )}
                {skillList.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10.5, color: T.text4, marginBottom: 4 }}>Habilidades</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {skillList.map((s, i) => (
                        <span key={i} style={{
                          fontSize: 11, padding: '3px 8px', borderRadius: 6,
                          background: T.card, border: `.5px solid ${T.hairline}`, color: T.text2,
                        }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {contract && (
            <div>
              <div style={{ fontSize: 10, color: T.text4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Contrato</div>
              <div style={{ background: T.sidebar, borderRadius: 10, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Pill {...(CONTRACT_CFG[contract.contract_type] || CONTRACT_CFG.indefinido)} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{money(contract.salary_gross)}/año</span>
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
// MODAL: NUEVO EMPLEADO / VOLUNTARIO
// ─────────────────────────────────────────────────────────
function fieldStyle(T) {
  return {
    width: '100%', padding: '8px 10px', borderRadius: 8,
    border: `.5px solid ${T.hairline}`, background: T.sidebar,
    fontSize: 12.5, fontFamily: 'inherit', color: T.text, outline: 'none',
  }
}
function Label({ children }) {
  const T = useT()
  return <div style={{ fontSize: 11, color: T.text3, fontWeight: 500, marginBottom: 5 }}>{children}</div>
}

function NewEmployeeModal({ token, onClose, onCreated }) {
  const T = useT()
  const { symbol } = useMoney()
  const [form, setForm] = useState({
    full_name: '', email: '', employee_type: 'permanente', department: '', position: '',
    gross_salary: '', start_date: '', end_date: '', availability: '', skills: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isVolunteer = form.employee_type === 'voluntario'
  const isTemporal = form.employee_type === 'temporal'

  async function save() {
    if (!form.full_name || !form.email) { setError('Nombre y email son obligatorios'); return }
    setSaving(true); setError('')
    try {
      const body = {
        full_name: form.full_name, email: form.email, employee_type: form.employee_type,
        department: form.department || null, position: form.position || null,
        gross_salary: isVolunteer ? 0 : (parseFloat(form.gross_salary) || 0),
        start_date: form.start_date || null, end_date: form.end_date || null,
        availability: form.availability || null, skills: form.skills || null,
      }
      const r = await fetch(`${API}/api/hr/employees`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.detail || 'Error al crear'); setSaving(false); return }
      onCreated && onCreated()
      onClose()
    } catch { setError('Error de red'); setSaving(false) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', display: 'grid', placeItems: 'center', zIndex: 110 }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 460, maxHeight: '88vh', overflowY: 'auto', background: T.card, borderRadius: 16,
        border: `.5px solid ${T.hairline}`, boxShadow: '0 12px 48px rgba(0,0,0,.18)', padding: 22,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.text }}>Nuevo miembro del equipo</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.text4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <Label>Tipo de vínculo</Label>
            <div style={{ display: 'flex', gap: 6 }}>
              {Object.entries(EMPLOYEE_TYPE_CFG).map(([k, cfg]) => (
                <button key={k} onClick={() => set('employee_type', k)} style={{
                  flex: 1, padding: '7px 0', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 12, fontWeight: 500,
                  border: `1px solid ${form.employee_type === k ? cfg.color : T.hairline}`,
                  background: form.employee_type === k ? cfg.bg : T.card,
                  color: form.employee_type === k ? cfg.color : T.text3,
                }}>{cfg.label}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}><Label>Nombre completo *</Label>
              <input style={fieldStyle(T)} value={form.full_name} onChange={e => set('full_name', e.target.value)} /></div>
          </div>
          <div><Label>Email *</Label>
            <input style={fieldStyle(T)} value={form.email} onChange={e => set('email', e.target.value)} /></div>

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}><Label>Departamento</Label>
              <input style={fieldStyle(T)} value={form.department} onChange={e => set('department', e.target.value)} placeholder="ventas, logística..." /></div>
            <div style={{ flex: 1 }}><Label>{isVolunteer ? 'Rol' : 'Puesto'}</Label>
              <input style={fieldStyle(T)} value={form.position} onChange={e => set('position', e.target.value)} /></div>
          </div>

          {!isVolunteer && (
            <div><Label>Salario bruto anual ({symbol})</Label>
              <input style={fieldStyle(T)} type="number" value={form.gross_salary} onChange={e => set('gross_salary', e.target.value)} /></div>
          )}

          {(isVolunteer || isTemporal) && (
            <>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}><Label>Fecha inicio</Label>
                  <input style={fieldStyle(T)} type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} /></div>
                <div style={{ flex: 1 }}><Label>Fecha fin</Label>
                  <input style={fieldStyle(T)} type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} /></div>
              </div>
              <div><Label>Disponibilidad / turnos</Label>
                <input style={fieldStyle(T)} value={form.availability} onChange={e => set('availability', e.target.value)} placeholder="Tardes L-V, fines de semana..." /></div>
              <div><Label>Habilidades (separadas por coma)</Label>
                <input style={fieldStyle(T)} value={form.skills} onChange={e => set('skills', e.target.value)} placeholder="Logística, Atención al público" /></div>
            </>
          )}

          {error && <div style={{ fontSize: 12, color: T.red }}>{error}</div>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button onClick={onClose} style={{
              padding: '8px 16px', borderRadius: 999, border: `.5px solid ${T.hairline}`,
              background: T.card, color: T.text2, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit',
            }}>Cancelar</button>
            <button onClick={save} disabled={saving} style={{
              padding: '8px 16px', borderRadius: 999, border: 'none',
              background: VERA_BLUE, color: '#fff', fontSize: 12.5, fontWeight: 500,
              cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: 'inherit',
            }}>{saving ? 'Guardando...' : 'Crear'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// MODAL: NUEVO GRUPO
// ─────────────────────────────────────────────────────────
function NewGroupModal({ token, onClose, onCreated }) {
  const T = useT()
  const [form, setForm] = useState({ name: '', description: '', start_date: '', end_date: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    if (!form.name) { setError('El nombre es obligatorio'); return }
    setSaving(true); setError('')
    try {
      const r = await fetch(`${API}/api/hr/workgroups`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, description: form.description || null,
          start_date: form.start_date || null, end_date: form.end_date || null,
        }),
      })
      if (!r.ok) { setError('Error al crear el grupo'); setSaving(false); return }
      const g = await r.json()
      onCreated && onCreated(g)
      onClose()
    } catch { setError('Error de red'); setSaving(false) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', display: 'grid', placeItems: 'center', zIndex: 110 }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 420, background: T.card, borderRadius: 16,
        border: `.5px solid ${T.hairline}`, boxShadow: '0 12px 48px rgba(0,0,0,.18)', padding: 22,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.text }}>Nuevo grupo de trabajo</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.text4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><Label>Nombre *</Label>
            <input style={fieldStyle(T)} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Logística evento" /></div>
          <div><Label>Descripción</Label>
            <textarea style={{ ...fieldStyle(T), minHeight: 60, resize: 'vertical' }} value={form.description} onChange={e => set('description', e.target.value)} /></div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}><Label>Inicio</Label>
              <input style={fieldStyle(T)} type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} /></div>
            <div style={{ flex: 1 }}><Label>Fin</Label>
              <input style={fieldStyle(T)} type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} /></div>
          </div>
          {error && <div style={{ fontSize: 12, color: T.red }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button onClick={onClose} style={{
              padding: '8px 16px', borderRadius: 999, border: `.5px solid ${T.hairline}`,
              background: T.card, color: T.text2, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit',
            }}>Cancelar</button>
            <button onClick={save} disabled={saving} style={{
              padding: '8px 16px', borderRadius: 999, border: 'none',
              background: VERA_BLUE, color: '#fff', fontSize: 12.5, fontWeight: 500,
              cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: 'inherit',
            }}>{saving ? 'Creando...' : 'Crear grupo'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// TAB 5: GRUPOS DE TRABAJO
// ─────────────────────────────────────────────────────────
function GruposTab({ token, employees, onSelect, reloadKey }) {
  const T = useT()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/hr/workgroups`, { headers: { Authorization: `Bearer ${token}` } })
      if (r.ok) setGroups(await r.json())
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [reloadKey])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: T.text4, fontSize: 13 }}>Cargando grupos...</div>
  if (groups.length === 0) return (
    <div style={{ padding: 60, textAlign: 'center', color: T.text4, fontSize: 13 }}>
      Aún no hay grupos de trabajo. Crea el primero con “+ Nuevo grupo”.
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
      {groups.map(g => {
        return (
          <div key={g.id} onClick={() => onSelect(g.id)}
            onMouseEnter={ev => { ev.currentTarget.style.transform = 'translateY(-1px)'; ev.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.05)' }}
            onMouseLeave={ev => { ev.currentTarget.style.transform = 'translateY(0)'; ev.currentTarget.style.boxShadow = 'none' }}
            style={{ background: T.card, borderRadius: 12, border: `.5px solid ${T.hairline}`, padding: 16, cursor: 'pointer', transition: 'all .15s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: g.color || T.blue, flexShrink: 0 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
            </div>
            {g.description && <div style={{ fontSize: 12, color: T.text4, marginBottom: 12, lineHeight: 1.4 }}>{g.description}</div>}

            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.text4, marginBottom: 4 }}>
                <span>{g.completed_tasks}/{g.task_count} tareas</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{g.completion_percentage}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: T.sidebar, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${g.completion_percentage}%`, background: T.green, borderRadius: 999, transition: 'width .4s' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `.5px solid ${T.hairline}`, paddingTop: 10, fontSize: 11.5, color: T.text3 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                {g.member_count} miembros
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                {g.total_hours}h
              </span>
              {g.blocked_tasks > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: T.red }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M15 9l-6 6M9 9l6 6" /></svg>
                  {g.blocked_tasks}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// DRAWER GRUPO (miembros + kanban de tareas + horas)
// ─────────────────────────────────────────────────────────
function GroupDrawer({ groupId, token, employees, onClose, onChanged }) {
  const T = useT()
  const [group, setGroup] = useState(null)
  const [tab, setTab] = useState('tareas')
  const [newTask, setNewTask] = useState('')
  const [addMemberId, setAddMemberId] = useState('')

  async function load() {
    try {
      const r = await fetch(`${API}/api/hr/workgroups/${groupId}`, { headers: { Authorization: `Bearer ${token}` } })
      if (r.ok) setGroup(await r.json())
    } catch {}
  }
  function changed() { load(); onChanged && onChanged() }
  useEffect(() => { load() }, [groupId])

  async function createTask() {
    if (!newTask.trim()) return
    await fetch(`${API}/api/hr/workgroups/${groupId}/tasks`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTask.trim() }),
    })
    setNewTask(''); changed()
  }
  async function moveTask(taskId, status) {
    await fetch(`${API}/api/hr/tasks/${taskId}`, {
      method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    changed()
  }
  async function deleteTask(taskId) {
    await fetch(`${API}/api/hr/tasks/${taskId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    changed()
  }
  async function assignTask(taskId, employeeId) {
    await fetch(`${API}/api/hr/tasks/${taskId}`, {
      method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to: employeeId ? parseInt(employeeId) : null }),
    })
    changed()
  }
  async function logHours(taskId) {
    const h = prompt('¿Cuántas horas aportar a esta tarea?')
    if (!h) return
    const hours = parseFloat(h); if (isNaN(hours) || hours <= 0) return
    const t = (group.tasks || []).find(x => x.id === taskId)
    await fetch(`${API}/api/hr/tasks/${taskId}/horas`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ hours, employee_id: t?.assigned_to || null }),
    })
    changed()
  }
  async function addMember() {
    if (!addMemberId) return
    await fetch(`${API}/api/hr/workgroups/${groupId}/members`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: parseInt(addMemberId) }),
    })
    setAddMemberId(''); changed()
  }
  async function removeMember(memberId) {
    await fetch(`${API}/api/hr/workgroups/${groupId}/members/${memberId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    changed()
  }
  async function archiveGroup() {
    if (!confirm('¿Archivar este grupo?')) return
    await fetch(`${API}/api/hr/workgroups/${groupId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    onChanged && onChanged(); onClose()
  }

  const tasks = group?.tasks || []
  const memberIds = new Set((group?.members || []).map(m => m.employee_id))
  const nonMembers = employees.filter(e => !memberIds.has(e.id))

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', display: 'flex', justifyContent: 'flex-end', zIndex: 100 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 640, maxWidth: '94vw', height: '100vh', background: T.card,
        display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'slideIn .2s ease',
      }}>
        <style>{`@keyframes slideIn{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

        {!group ? (
          <div style={{ padding: 40, textAlign: 'center', color: T.text4 }}>Cargando...</div>
        ) : (
          <>
            <div style={{ padding: 20, borderBottom: `.5px solid ${T.hairline}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ width: 12, height: 12, borderRadius: 4, background: group.color || T.blue, marginTop: 5 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 600, color: T.text }}>{group.name}</div>
                  {group.description && <div style={{ fontSize: 12.5, color: T.text3, marginTop: 3 }}>{group.description}</div>}
                  <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 11.5, color: T.text4 }}>
                    <span>{group.member_count} miembros</span>
                    <span>{group.completed_tasks}/{group.task_count} tareas ({group.completion_percentage}%)</span>
                    <span>{group.total_hours}h aportadas</span>
                  </div>
                </div>
                <button onClick={archiveGroup} title="Archivar" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.text4, fontSize: 11 }}>Archivar</button>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: T.text4 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div style={{ display: 'flex', gap: 2, background: T.sidebar, borderRadius: 8, padding: 3, width: 'fit-content', marginTop: 14 }}>
                <Tab label="Tareas" active={tab === 'tareas'} onClick={() => setTab('tareas')} badge={tasks.length} />
                <Tab label="Miembros" active={tab === 'miembros'} onClick={() => setTab('miembros')} badge={group.member_count} />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              {tab === 'tareas' && (
                <>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && createTask()}
                      placeholder="Nueva tarea y Enter..." style={{ ...fieldStyle(T), flex: 1 }} />
                    <button onClick={createTask} style={{
                      padding: '8px 16px', borderRadius: 8, border: 'none', background: VERA_BLUE, color: '#fff',
                      fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                    }}>Añadir</button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    {KANBAN_COLS.map(col => {
                      const colTasks = tasks.filter(t => t.status === col.k)
                      const cfg = TASK_STATUS_CFG[col.k]
                      return (
                        <div key={col.k} style={{ background: T.sidebar, borderRadius: 10, padding: 10, minHeight: 80 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <span style={{ width: 7, height: 7, borderRadius: 999, background: cfg.dot }} />
                            <span style={{ fontSize: 11.5, fontWeight: 600, color: T.text2 }}>{col.l}</span>
                            <span style={{ fontSize: 10.5, color: T.text4 }}>{colTasks.length}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {colTasks.map(t => {
                              const prio = TASK_PRIORITY_CFG[t.priority] || TASK_PRIORITY_CFG.media
                              const idx = KANBAN_COLS.findIndex(c => c.k === col.k)
                              const next = KANBAN_COLS[(idx + 1) % KANBAN_COLS.length]
                              return (
                                <div key={t.id} style={{ background: T.card, borderRadius: 8, border: `.5px solid ${T.hairline}`, padding: 10 }}>
                                  <div style={{ fontSize: 12.5, fontWeight: 500, color: T.text, marginBottom: 6 }}>{t.title}</div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8, flexWrap: 'wrap' }}>
                                    <Pill label={prio.label} color={prio.color} bg={prio.bg} />
                                    {t.actual_hours > 0 && <span style={{ fontSize: 10.5, color: T.text4 }}>{t.actual_hours}h</span>}
                                  </div>
                                  <select value={t.assigned_to || ''} onChange={e => assignTask(t.id, e.target.value)}
                                    style={{ ...fieldStyle(T), padding: '5px 8px', fontSize: 11, marginBottom: 6 }}>
                                    <option value="">Sin asignar</option>
                                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                                  </select>
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button type="button" onClick={() => moveTask(t.id, next.k)} title={`Mover a ${next.l}`} aria-label={`Mover "${t.title}" a ${next.l}`} style={{
                                      flex: 1, padding: '5px 0', minHeight: 28, borderRadius: 6, border: `.5px solid ${T.hairline}`,
                                      background: T.card, color: T.text2, fontSize: 10.5, cursor: 'pointer', fontFamily: 'inherit',
                                    }}>→ {next.l}</button>
                                    <button type="button" onClick={() => logHours(t.id)} title="Registrar horas" aria-label={`Registrar horas en "${t.title}"`} style={{
                                      padding: '5px 8px', minHeight: 28, borderRadius: 6, border: `.5px solid ${T.hairline}`,
                                      background: T.card, color: T.text2, cursor: 'pointer', fontFamily: 'inherit', display: 'grid', placeItems: 'center',
                                    }}>
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                                    </button>
                                    <button type="button" onClick={() => deleteTask(t.id)} title="Eliminar tarea" aria-label={`Eliminar "${t.title}"`} style={{
                                      padding: '5px 8px', minHeight: 28, borderRadius: 6, border: `.5px solid ${T.hairline}`,
                                      background: T.card, color: T.red, cursor: 'pointer', fontFamily: 'inherit', display: 'grid', placeItems: 'center',
                                    }}>
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {tab === 'miembros' && (
                <>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <select value={addMemberId} onChange={e => setAddMemberId(e.target.value)} style={{ ...fieldStyle(T), flex: 1 }}>
                      <option value="">Añadir miembro...</option>
                      {nonMembers.map(e => <option key={e.id} value={e.id}>{e.full_name} ({EMPLOYEE_TYPE_CFG[e.employee_type || 'permanente']?.label})</option>)}
                    </select>
                    <button onClick={addMember} style={{
                      padding: '8px 16px', borderRadius: 8, border: 'none', background: VERA_BLUE, color: '#fff',
                      fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                    }}>Añadir</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(group.members || []).map(m => (
                      <div key={m.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                        background: T.card, borderRadius: 10, border: `.5px solid ${T.hairline}`,
                      }}>
                        <Avatar name={m.employee_name || '?'} size={32} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{m.employee_name}</div>
                          {m.role && <div style={{ fontSize: 11.5, color: T.text4 }}>{m.role}</div>}
                        </div>
                        <button onClick={() => removeMember(m.id)} style={{
                          background: 'transparent', border: 'none', cursor: 'pointer', color: T.text4, fontSize: 12,
                        }}>Quitar</button>
                      </div>
                    ))}
                    {(group.members || []).length === 0 && (
                      <div style={{ padding: 30, textAlign: 'center', color: T.text4, fontSize: 12.5 }}>Sin miembros todavía</div>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────
export default function HRPage() {
  const T = useT()
  const { fmt } = useMoney()
  const money = (n) => n != null ? fmt(n, { decimals: 0 }) : '—'
  const router = useRouter()
  const [tab, setTab] = useState('equipo')
  const [employees, setEmployees] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [selected, setSelected] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pendingVacations, setPendingVacations] = useState(0)
  const [showNewEmployee, setShowNewEmployee] = useState(false)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [groupsReloadKey, setGroupsReloadKey] = useState(0)
  const refreshGroups = () => setGroupsReloadKey(k => k + 1)

  // Notificaciones: empleados en riesgo + contratos por vencer + vacaciones pendientes
  const notificationCount = (
    (dashboard?.employees_at_risk?.length || 0) +
    (dashboard?.contracts_expiring_60d || 0) +
    pendingVacations
  )
  const [veraOpen, setVeraOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('vela_token') : null
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
      <style>{`*{box-sizing:border-box}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:999px}input:focus{outline:none}@media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}}`}</style>

      <Sidebar active="/hr" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100vh' }}>
        <PageHeader
          title="Recursos Humanos"
          subtitle={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span>🇪🇸</span>
              <span>España</span>
              {dashboard && (
                <>
                  <span>·</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{dashboard.total_employees} personas · {money(dashboard.monthly_cost)}/mes · {dashboard.out_today} fuera hoy</span>
                </>
              )}
            </span>
          }
          tabs={[
            { key: 'equipo', label: 'Equipo' },
            { key: 'grupos', label: 'Grupos' },
            { key: 'vacaciones', label: 'Vacaciones', badge: pendingVacations },
            { key: 'contratos', label: 'Contratos', badge: dashboard?.contracts_expiring_60d },
            { key: 'nominas', label: 'Nóminas' },
          ]}
          activeTab={tab}
          onTab={setTab}
          primary={
            tab === 'equipo'
              ? { label: 'Nuevo empleado', onClick: () => setShowNewEmployee(true), icon: <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 0, marginRight: 1 }}>+</span> }
              : tab === 'grupos'
              ? { label: 'Nuevo grupo', onClick: () => setShowNewGroup(true), icon: <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 0, marginRight: 1 }}>+</span> }
              : undefined
          }
          secondary={
            <button
              onClick={() => setNotificationsOpen(o => !o)}
              aria-label={`Notificaciones${notificationCount > 0 ? ` (${notificationCount})` : ''}`}
              aria-expanded={notificationsOpen}
              style={{
                position: 'relative',
                width: 44, height: 44, borderRadius: 8,
                background: T.card, color: T.text2,
                border: `.5px solid ${T.hairline}`,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'grid', placeItems: 'center', flexShrink: 0,
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
          }
          onVera={() => setVeraOpen(true)}
          user={null}
          router={router}
        />

        <div id="main-content" tabIndex={-1} style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: T.text4, fontSize: 13 }}>Cargando...</div>
          ) : (
            <>
              {tab === 'equipo' && <EquipoTab employees={employees} onSelect={setSelected} />}
              {tab === 'grupos' && <GruposTab token={token} employees={employees} onSelect={setSelectedGroup} reloadKey={groupsReloadKey} />}
              {tab === 'vacaciones' && <VacacionesTab token={token} />}
              {tab === 'contratos' && <ContratosTab token={token} />}
              {tab === 'nominas' && <NominasTab token={token} />}
            </>
          )}
        </div>
      </div>

      {selected && <EmployeeDrawer employee={selected} onClose={() => setSelected(null)} token={token} />}
      {selectedGroup && <GroupDrawer groupId={selectedGroup} token={token} employees={employees} onClose={() => setSelectedGroup(null)} onChanged={refreshGroups} />}
      {showNewEmployee && <NewEmployeeModal token={token} onClose={() => setShowNewEmployee(false)} onCreated={() => loadAll(token)} />}
      {showNewGroup && <NewGroupModal token={token} onClose={() => setShowNewGroup(false)} onCreated={() => { refreshGroups(); setTab('grupos') }} />}
      {veraOpen && <VeraDrawer onClose={() => setVeraOpen(false)} token={token} dashboard={dashboard} />}

      {notificationsOpen && (
        <div onClick={() => setNotificationsOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 90,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            position: 'fixed', top: 70, right: 32,
            width: 380, maxHeight: 500, overflowY: 'auto',
            background: T.card, borderRadius: 12,
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
                    background: 'rgba(61,43,255,.04)',
                    border: '.5px solid rgba(61,43,255,.15)',
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
