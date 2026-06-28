'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import VeraStudio from '@/components/admin/VeraStudio'
import VeraNetwork from '@/components/admin/VeraNetwork'
import { FONT, I, useT, useTheme } from '@/components/ui/tokens'
import { API_BASE, apiFetch, authHeaders } from '@/lib/api'
import ImpersonatePanel from '@/components/ImpersonatePanel'

// Iconos SVG inline (Lucide-style, stroke currentColor) para reemplazar emojis.
const Svg = ({ children, size = 16, sw = 1.8, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    style={{ flexShrink: 0, ...style }}>{children}</svg>
)
const Ico = {
  building: (p) => <Svg {...p}><path d="M3 21h18M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M9 8h2M9 12h2M9 16h2" /><path d="M16 21V9h3a1 1 0 0 1 1 1v11" /></Svg>,
  user: (p) => <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 12 0v1" /></Svg>,
  users: (p) => <Svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></Svg>,
  chart: (p) => <Svg {...p}><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="6" /><rect x="12" y="7" width="3" height="10" /><rect x="17" y="13" width="3" height="4" /></Svg>,
  brain: (p) => <Svg {...p}><path d="M9.5 2A2.5 2.5 0 0 0 7 4.5v.5a2.5 2.5 0 0 0-2 4 2.5 2.5 0 0 0 .5 4.5A2.5 2.5 0 0 0 7 18v.5A2.5 2.5 0 0 0 9.5 21 2.5 2.5 0 0 0 12 18.5v-13A2.5 2.5 0 0 0 9.5 2zM14.5 2A2.5 2.5 0 0 1 17 4.5v.5a2.5 2.5 0 0 1 2 4 2.5 2.5 0 0 1-.5 4.5A2.5 2.5 0 0 1 17 18v.5A2.5 2.5 0 0 1 14.5 21 2.5 2.5 0 0 1 12 18.5" /></Svg>,
  save: (p) => <Svg {...p}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><path d="M17 21v-8H7v8M7 3v5h8" /></Svg>,
  flow: (p) => <Svg {...p}><rect x="3" y="3" width="6" height="6" rx="1" /><rect x="15" y="15" width="6" height="6" rx="1" /><path d="M9 6h6a3 3 0 0 1 3 3v6" /></Svg>,
  target: (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></Svg>,
  card: (p) => <Svg {...p}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></Svg>,
  robot: (p) => <Svg {...p}><rect x="4" y="8" width="16" height="12" rx="2" /><path d="M12 8V4M9 13h.01M15 13h.01M9 17h6" /><circle cx="12" cy="3" r="1" /></Svg>,
  sparkles: (p) => <Svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" /></Svg>,
  download: (p) => <Svg {...p}><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></Svg>,
  check: (p) => <Svg {...p}><path d="M20 6L9 17l-5-5" /></Svg>,
  refresh: (p) => <Svg {...p}><path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" /></Svg>,
  send: (p) => <Svg {...p}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></Svg>,
  trash: (p) => <Svg {...p}><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6M10 11v6M14 11v6" /></Svg>,
  edit: (p) => <Svg {...p}><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></Svg>,
  map: (p) => <Svg {...p}><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" /></Svg>,
  pin: (p) => <Svg {...p}><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></Svg>,
  phone: (p) => <Svg {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></Svg>,
  globe: (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z" /></Svg>,
  camera: (p) => <Svg {...p}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></Svg>,
  bulb: (p) => <Svg {...p}><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1v.2h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" /></Svg>,
  euro: (p) => <Svg {...p}><path d="M18 7a6 6 0 1 0 0 10M5 10h7M5 14h7" /></Svg>,
  flask: (p) => <Svg {...p}><path d="M9 2h6M10 2v6L5 18a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-10V2M7.5 14h9" /></Svg>,
  trend: (p) => <Svg {...p}><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></Svg>,
  inbox: (p) => <Svg {...p}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z" /></Svg>,
  message: (p) => <Svg {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Svg>,
  clipboard: (p) => <Svg {...p}><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></Svg>,
  book: (p) => <Svg {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z" /></Svg>,
  star: (p) => <Svg {...p}><path d="M12 2l3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1L12 2z" /></Svg>,
  warning: (p) => <Svg {...p}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01" /></Svg>,
}

const API   = API_BASE
const NAVY  = '#0B0D2B'
const GREEN = '#059669'
const AMBER = '#d97706'
const RED   = '#dc2626'
const BLUE  = '#3D2BFF'
const CYAN  = '#10b981'
const PURPLE = '#3D2BFF'
const GOLD = '#B8860B'

// ── Admin Sidebar ──────────────────────────────────────────────────────────────
function AdminSidebar({ active }) {
  const router = useRouter()
  const links = [
    { label: 'Overview',      href: '/admin',                icon: '◇' },
    { label: 'Empresas',      href: '/admin?tab=companies',  icon: '◻' },
    { label: 'Usuarios',      href: '/admin?tab=users',      icon: '○' },
    { label: 'Seguridad',     href: '/admin?tab=security',   icon: '⛨' },
    { label: 'Snapshots',     href: '/admin?tab=snapshots',  icon: '▣' },
    { label: 'Prompts IA',    href: '/admin?tab=prompts',    icon: '◆' },
    { label: 'Memoria IA',    href: '/admin?tab=memory',     icon: '◈' },
    { label: 'Flujo datos',   href: '/admin?tab=flowchart',  icon: '◎' },
    { label: 'Vera Routing',  href: '/admin?tab=vera-routing', icon: '✦' },
    { label: 'Vera Network Agent',    href: '/admin?tab=vera-network',   icon: '★' },
    { label: 'Prospector',    href: '/admin?tab=prospector', icon: '◉' },
    { label: 'Profit Optimizer', href: '/admin?tab=profit',  icon: '◐' },
    { label: 'Billing',       href: '/admin?tab=billing',    icon: '▤' },
  ]
  return (
    <div style={{ width: '220px', background: '#0a0f1a', minHeight: '100dvh', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '24px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div style={{ width: '32px', height: '32px', background: `linear-gradient(135deg, #10b981, #059669)`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><path d="M4 16V4L16 16V4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: '800', fontSize: '15px', letterSpacing: '-0.4px', lineHeight: 1 }}>Vela</div>
            <div style={{ color: '#10b981', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '1px' }}>Backoffice</div>
          </div>
        </div>
      </div>
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 20px 12px' }} />
      <nav style={{ flex: 1, padding: '4px 0' }}>
        {links.map(item => {
          const isActive = active === item.href
          return (
            <a key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 20px', color: isActive ? 'white' : 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '13px', fontWeight: isActive ? '600' : '400', background: isActive ? 'rgba(16,185,129,0.12)' : 'transparent', borderLeft: isActive ? '2px solid #10b981' : '2px solid transparent', transition: 'all 0.15s' }}>
              <span style={{ fontSize: '13px', opacity: isActive ? 1 : 0.55 }}>{item.icon}</span>{item.label}
            </a>
          )
        })}
      </nav>
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>← Volver a Vela</a>
      </div>
    </div>
  )
}

// ── Stat Card ──────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color, bg }) {
  const T = useT()
  return (
    <div style={{ background: bg || T.card, borderRadius: '16px', border: `0.5px solid ${T.hairline}`, padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <span style={{ display: 'inline-flex', color: color || T.text }}>{icon}</span>
        {sub && <span style={{ fontSize: '11px', color: T.text4 }}>{sub}</span>}
      </div>
      <div style={{ fontSize: '28px', fontWeight: '800', color: color || T.text, letterSpacing: '-0.8px', marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '12px', color: T.text3, fontWeight: '500' }}>{label}</div>
    </div>
  )
}

// ── Plan Badge ─────────────────────────────────────────────────────────────────
function PlanBadge({ plan }) {
  const cfg = {
    starter:    { color: '#6b7280', bg: '#f1f5f9' },
    pro:        { color: BLUE,      bg: '#eff6ff' },
    business:   { color: CYAN,      bg: '#ecfeff' },
    trial:      { color: GREEN,     bg: '#f0fdf4' },
    none:       { color: RED,       bg: '#fef2f2' },
    enterprise: { color: PURPLE,    bg: '#f5f3ff' },
  }[plan] || { color: '#6b7280', bg: '#f1f5f9' }
  return <span style={{ fontSize: '11px', fontWeight: '700', color: cfg.color, background: cfg.bg, padding: '3px 10px', borderRadius: '20px', textTransform: 'capitalize' }}>{plan || 'none'}</span>
}

// ── Status Badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    active:    { color: GREEN, bg: '#f0fdf4', dot: GREEN,  label: 'Activo'    },
    trialing:  { color: AMBER, bg: '#fffbeb', dot: AMBER,  label: 'Trial'     },
    past_due:  { color: RED,   bg: '#fef2f2', dot: RED,    label: 'Vencido'   },
    canceled:  { color: '#6b7280', bg: '#f1f5f9', dot: '#9ca3af', label: 'Cancelado' },
    none:      { color: '#6b7280', bg: '#f1f5f9', dot: '#9ca3af', label: 'Sin plan'  },
  }[status] || { color: '#6b7280', bg: '#f1f5f9', dot: '#9ca3af', label: status }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', color: cfg.color, background: cfg.bg, padding: '3px 10px', borderRadius: '20px' }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
      {cfg.label}
    </span>
  )
}

// ── Flowchart ──────────────────────────────────────────────────────────────────
function DataFlowchart() {
  const T = useT()
  const nodes = [
    { id: 'user',    x: 380, y: 30,  label: 'Usuario / Empresa',   icon: '👤', color: NAVY,   w: 160 },
    { id: 'sales',   x: 60,  y: 160, label: 'Ventas & Productos',  icon: '🛒', color: BLUE,   w: 150 },
    { id: 'clients', x: 240, y: 160, label: 'Clientes & Mensajes', icon: '💬', color: GREEN,  w: 150 },
    { id: 'projects',x: 420, y: 160, label: 'Proyectos & Tareas',  icon: '📋', color: AMBER,  w: 150 },
    { id: 'hr',      x: 600, y: 160, label: 'RR.HH. & Nóminas',   icon: '👥', color: PURPLE, w: 150 },
    { id: 'acc',     x: 780, y: 160, label: 'Contabilidad',        icon: '📒', color: '#dc2626', w: 150 },
    { id: 'snapshot',x: 380, y: 310, label: 'Business Snapshot',   icon: '📊', color: CYAN,   w: 160 },
    { id: 'claude',  x: 380, y: 440, label: 'Claude AI',           icon: '🤖', color: '#3D2BFF', w: 160 },
    { id: 'memory',  x: 650, y: 440, label: 'AI Memory',           icon: '💾', color: GREEN,  w: 140 },
    { id: 'output',  x: 100, y: 440, label: 'Outputs',             icon: '✨', color: AMBER,  w: 140 },
  ]

  const edges = [
    ['user','sales'],['user','clients'],['user','projects'],['user','hr'],['user','acc'],
    ['sales','snapshot'],['clients','snapshot'],['projects','snapshot'],['hr','snapshot'],['acc','snapshot'],
    ['snapshot','claude'],['claude','memory'],['claude','output'],['memory','claude'],
  ]

  const getCenter = (id) => {
    const n = nodes.find(x => x.id === id)
    return { x: n.x + n.w/2, y: n.y + 28 }
  }

  return (
    <div style={{ background: T.card, borderRadius: '16px', border: `0.5px solid ${T.hairline}`, padding: '24px', overflow: 'auto' }}>
      <div style={{ fontSize: '15px', fontWeight: '700', color: T.text, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><Ico.flow size={18} />Flujo de datos — Vela</div>
      <svg width="980" height="540" style={{ display: 'block', minWidth: '980px' }}>
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="8" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#cbd5e1" />
          </marker>
        </defs>
        {/* Edges */}
        {edges.map(([from, to], i) => {
          const a = getCenter(from), b = getCenter(to)
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={T.hairline} strokeWidth="1.5" strokeDasharray="4,3" markerEnd="url(#arrow)" />
        })}
        {/* Nodes */}
        {nodes.map(n => (
          <g key={n.id}>
            <rect x={n.x} y={n.y} width={n.w} height={56} rx="10" fill={n.color} opacity="0.1" stroke={n.color} strokeWidth="1.5" />
            <circle cx={n.x + 20} cy={n.y + 28} r="6" fill={n.color} />
            <text x={n.x + 38} y={n.y + 20} fontSize="11" fontWeight="700" fill={n.color}>{n.label.split('&')[0]}</text>
            {n.label.includes('&') && <text x={n.x + 38} y={n.y + 34} fontSize="10" fill={n.color} opacity="0.7">& {n.label.split('&')[1]}</text>}
          </g>
        ))}
        {/* Labels on edges */}
        <text x={385} y={280} fontSize="10" fill={CYAN} fontWeight="700">KPIs agregados</text>
        <text x={385} y={410} fontSize="10" fill={PURPLE} fontWeight="700">Análisis + Insights</text>
        <text x={660} y={400} fontSize="10" fill={GREEN} fontWeight="700">Aprende</text>
        <text x={90} y={400} fontSize="10" fill={AMBER} fontWeight="700">Respuestas IA</text>
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '20px', marginTop: '16px', flexWrap: 'wrap' }}>
        {[
          { color: BLUE,   label: 'Módulos de datos' },
          { color: CYAN,   label: 'Agregación / Snapshot' },
          { color: PURPLE, label: 'Claude IA' },
          { color: GREEN,  label: 'Memoria IA' },
          { color: AMBER,  label: 'Outputs al usuario' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: l.color }} />
            <span style={{ fontSize: '11px', color: T.text3 }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
function MemoryTab({ companies, selectedCompany, setSelectedCompany, token, API }) {
  const T = useT()
  const [entries, setEntries] = useState([])
  const [memEdit, setMemEdit] = useState({ manual_training: '', business_personality: '', business_goals: '' })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [autoLoading, setAutoLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const [activeTab, setActiveTab] = useState('auto')
  const [stats, setStats] = useState({ total: 0, auto_count: 0, manual_count: 0, last_auto_update: null, context_version: 0 })

  const NAVY = '#0B0D2B', GREEN = '#059669', AMBER = '#d97706', RED = '#dc2626', BLUE = '#3D2BFF', PURPLE = '#3D2BFF', CYAN = '#3D2BFF'
  const h = () => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' })

  const catColor = c => ({ ventas: BLUE, clientes: GREEN, finanzas: AMBER, proyectos: PURPLE, rrhh: CYAN, general: '#6b7280' }[c] || '#6b7280')

  async function loadEntries(companyId) {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/admin/memory/${companyId}/entries`, { headers: h() })
      if (r.ok) {
        const d = await r.json()
        setEntries(d.entries || [])
        setStats({ total: d.total, auto_count: d.auto_count, manual_count: d.manual_count, last_auto_update: d.last_auto_update, context_version: d.context_version })
        setMemEdit({ manual_training: d.manual_training || '', business_personality: d.business_personality || '', business_goals: d.business_goals || '' })
      }
    } catch(e) {} finally { setLoading(false) }
  }

  function selectCompany(id) {
    setSelectedCompany(id)
    setEntries([])
    setMsg(null)
    loadEntries(id)
  }

  async function saveManual() {
    setSaving(true)
    setMsg(null)
    try {
      const r = await fetch(`${API}/api/admin/memory/${selectedCompany}`, {
        method: 'PUT', headers: h(),
        body: JSON.stringify({ company_id: selectedCompany, ...memEdit })
      })
      if (r.ok) { setMsg({ type: 'ok', text: '✅ Memoria manual guardada' }); loadEntries(selectedCompany) }
      else setMsg({ type: 'err', text: '❌ Error guardando' })
    } catch(e) { setMsg({ type: 'err', text: '❌ Error de conexión' }) }
    finally { setSaving(false); setTimeout(() => setMsg(null), 4000) }
  }

  async function runAutoUpdate() {
    setAutoLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${API}/api/admin/memory/${selectedCompany}/auto-update`, { method: 'POST', headers: h() })
      if (r.ok) { setMsg({ type: 'ok', text: '✅ IA actualizó la memoria con nuevos patrones' }); loadEntries(selectedCompany) }
      else setMsg({ type: 'err', text: '❌ Error en auto-actualización' })
    } catch(e) { setMsg({ type: 'err', text: '❌ Error de conexión' }) }
    finally { setAutoLoading(false); setTimeout(() => setMsg(null), 5000) }
  }

  async function downloadTxt() {
    try {
      const r = await fetch(`${API}/api/admin/memory/${selectedCompany}/download`, { headers: h() })
      if (r.ok) {
        const d = await r.json()
        const blob = new Blob([d.txt], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = d.filename; a.click()
        URL.revokeObjectURL(url)
      }
    } catch(e) {}
  }

  const autoEntries = entries.filter(e => e.tipo === 'auto')
  const manualEntries = entries.filter(e => e.tipo === 'manual')
  const selectedCompanyName = companies.find(c => c.id === selectedCompany)?.name || ''

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>
      {/* Company selector */}
      <div style={{ background: T.card, borderRadius: '14px', border: `1px solid ${T.hairline}`, padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: T.text, marginBottom: '10px' }}>Selecciona empresa</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {companies.length === 0 && <div style={{ color: T.text4, fontSize: '13px' }}>Carga las empresas primero en la pestaña Empresas</div>}
          {companies.map(c => (
            <button key={c.id} onClick={() => selectCompany(c.id)} style={{ padding: '8px 16px', borderRadius: '8px', border: `1.5px solid ${selectedCompany === c.id ? NAVY : T.hairline}`, background: selectedCompany === c.id ? NAVY : T.card, color: selectedCompany === c.id ? 'white' : T.text, fontWeight: '600', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {selectedCompany && (
        <div>
          {/* Header + stats */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: T.text, display: 'flex', alignItems: 'center', gap: '7px' }}><Ico.save size={17} />Memoria IA — {selectedCompanyName}</div>
              <div style={{ fontSize: '12px', color: T.text4, marginTop: '2px' }}>
                v{stats.context_version} · {stats.auto_count} aprendizajes auto · {stats.manual_count} entradas manuales
                {stats.last_auto_update && ` · Último auto: ${stats.last_auto_update.substring(0,10)}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {msg && <span style={{ fontSize: '12px', fontWeight: '600', color: msg.type === 'ok' ? GREEN : RED, background: msg.type === 'ok' ? T.greenSoft : T.redSoft, padding: '5px 12px', borderRadius: '8px', border: `1px solid ${msg.type === 'ok' ? T.greenSoft : T.redSoft}` }}>{msg.text}</span>}
              <button onClick={downloadTxt} aria-label="Descargar memoria en TXT" style={{ padding: '8px 14px', borderRadius: '8px', border: `1px solid ${T.greenSoft}`, background: T.greenSoft, color: GREEN, fontWeight: '700', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}><Ico.download size={14} /> Descargar TXT</button>
              <button onClick={runAutoUpdate} disabled={autoLoading} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: autoLoading ? T.soft : PURPLE, color: autoLoading ? T.text4 : 'white', fontWeight: '700', fontSize: '12px', cursor: autoLoading ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {autoLoading ? <><Ico.refresh size={14} /> Analizando...</> : <><Ico.robot size={14} /> Auto-actualizar IA</>}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '14px', background: T.soft, padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
            {[{ id: 'auto', icon: <Ico.robot size={13} />, label: `Aprendizajes IA (${stats.auto_count})` }, { id: 'manual', icon: <Ico.edit size={13} />, label: 'Entrenamiento manual' }].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: '7px 16px', borderRadius: '7px', border: 'none', background: activeTab === t.id ? T.card : 'transparent', color: activeTab === t.id ? T.text : T.text3, fontWeight: activeTab === t.id ? '700' : '400', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', boxShadow: activeTab === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* AUTO TAB */}
          {activeTab === 'auto' && (
            <div>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: T.text4 }}>Cargando memoria...</div>
              ) : autoEntries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: T.text4, background: T.card, borderRadius: '16px', border: `0.5px solid ${T.hairline}` }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px', color: T.text3 }}><Ico.robot size={32} /></div>
                  <div style={{ fontSize: '14px', marginBottom: '6px' }}>Sin aprendizajes todavía</div>
                  <div style={{ fontSize: '12px' }}>Pulsa "Auto-actualizar IA" para que Claude analice los datos y detecte patrones.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {autoEntries.map((e, i) => (
                    <div key={e.id} style={{ background: T.card, borderRadius: '10px', border: `0.5px solid ${T.hairline}`, padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ flexShrink: 0, width: '6px', height: '6px', borderRadius: '50%', background: catColor(e.categoria), marginTop: '6px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '10px', fontWeight: '700', color: catColor(e.categoria), background: catColor(e.categoria)+'15', padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase' }}>{e.categoria}</span>
                          <span style={{ fontSize: '10px', color: T.text4 }}>confianza: {Math.round((e.confianza || 0) * 100)}%</span>
                          <span style={{ fontSize: '10px', color: T.text4 }}>{e.created_at?.substring(0, 16).replace('T', ' ')}</span>
                          {e.snapshot_id && <span style={{ fontSize: '10px', color: T.text4 }}>snapshot #{e.snapshot_id}</span>}
                        </div>
                        <div style={{ fontSize: '13px', color: T.text2, lineHeight: '1.6' }}>{e.contenido}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MANUAL TAB */}
          {activeTab === 'manual' && (
            <div style={{ background: T.card, borderRadius: '16px', border: `0.5px solid ${T.hairline}`, padding: '24px' }}>
              <div style={{ fontSize: '13px', color: T.text3, marginBottom: '20px', lineHeight: '1.6' }}>
                Escribe aquí lo que quieres que la IA sepa sobre este negocio. Esto se combina con los aprendizajes automáticos en cada consulta.
              </div>
              <div className="adm-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                {[
                  { key: 'manual_training', label: 'Contexto del negocio', placeholder: 'Somos una panadería artesanal familiar. No hacemos descuentos en productos frescos. Nuestros clientes valoran la calidad sobre el precio...' },
                  { key: 'business_personality', label: 'Personalidad y valores', placeholder: 'Tono cercano y profesional. Nos diferenciamos por la calidad artesanal. Público objetivo: familias 30-50 años...' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: T.text2, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</label>
                    <textarea value={memEdit[f.key]} onChange={e => setMemEdit(p => ({ ...p, [f.key]: e.target.value }))} rows={8} placeholder={f.placeholder} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `0.5px solid ${T.hairline}`, fontSize: '13px', fontFamily: 'inherit', lineHeight: '1.6', resize: 'vertical', outline: 'none', boxSizing: 'border-box', background: T.card, color: T.text }} />
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: T.text2, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Objetivos del negocio</label>
                <textarea value={memEdit.business_goals} onChange={e => setMemEdit(p => ({ ...p, business_goals: e.target.value }))} rows={4} placeholder="Queremos abrir una segunda tienda en 2027. Objetivo: llegar a €20k/mes de facturación. Foco actual: fidelizar clientes existentes..." style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `0.5px solid ${T.hairline}`, fontSize: '13px', fontFamily: 'inherit', lineHeight: '1.6', resize: 'vertical', outline: 'none', boxSizing: 'border-box', background: T.card, color: T.text }} />
              </div>

              {/* Manual entries history */}
              {manualEntries.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: T.text2, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>Historial de entradas manuales</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                    {manualEntries.map(e => (
                      <div key={e.id} style={{ background: T.soft, borderRadius: '8px', padding: '10px 12px', border: `0.5px solid ${T.hairline}`, fontSize: '11px' }}>
                        <div style={{ color: T.text4, marginBottom: '3px' }}>{e.created_at?.substring(0,16).replace('T',' ')} · {e.autor}</div>
                        <div style={{ color: T.text2, lineHeight: '1.5' }}>{e.contenido?.substring(0, 150)}{e.contenido?.length > 150 ? '...' : ''}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={saveManual} disabled={saving} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: saving ? T.soft : NAVY, color: saving ? T.text4 : 'white', fontWeight: '700', fontSize: '13px', cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Ico.save size={15} /> {saving ? 'Guardando...' : 'Guardar entrenamiento manual'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BillingTab({ token, API }) {
  const T = useT()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [msg, setMsg] = useState(null)

  const NAVY = '#0B0D2B', GREEN = '#059669', AMBER = '#d97706', RED = '#dc2626', BLUE = '#3D2BFF', PURPLE = '#3D2BFF'
  const h = () => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' })

  const faseColor = f => ({ beta: PURPLE, early_adopter: AMBER, paid: GREEN }[f] || '#6b7280')
  const faseBg = f => ({ beta: '#f5f3ff', early_adopter: '#fffbeb', paid: '#f0fdf4' }[f] || '#f1f5f9')
  const faseLabel = f => ({ beta: 'Beta', early_adopter: 'Early Adopter', paid: 'Pago' }[f] || f)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/admin/billing/overview`, { headers: h() })
      if (r.ok) setData(await r.json())
    } catch(e) {} finally { setLoading(false) }
  }

  async function updateFase(companyId, fase, days) {
    setUpdating(companyId)
    try {
      const body = { fase }
      if (days) body.fase_expiry_days = days
      const r = await fetch(`${API}/api/admin/billing/${companyId}/fase`, {
        method: 'PUT', headers: h(), body: JSON.stringify(body)
      })
      if (r.ok) {
        setMsg({ type: 'ok', text: `✅ Fase actualizada a ${faseLabel(fase)}` })
        load()
      } else setMsg({ type: 'err', text: '❌ Error actualizando fase' })
    } catch(e) { setMsg({ type: 'err', text: '❌ Error de conexión' }) }
    finally {
      setUpdating(null)
      setTimeout(() => setMsg(null), 3000)
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: T.text4 }}>Cargando billing...</div>
  if (!data) return null

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'MRR estimado', value: `€${data.total_mrr?.toLocaleString('es-ES')}`, color: GREEN, bg: T.greenSoft },
          { label: 'En Beta', value: data.by_fase?.beta || 0, color: PURPLE, bg: T.purpleSoft },
          { label: 'Early Adopters', value: data.by_fase?.early_adopter || 0, color: AMBER, bg: T.amberSoft },
          { label: 'Pagando', value: data.by_fase?.paid || 0, color: GREEN, bg: T.greenSoft },
          { label: 'Total empresas', value: data.total || 0, color: T.text, bg: T.card },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, borderRadius: '14px', padding: '14px 16px', border: `0.5px solid ${T.hairline}` }}>
            <div style={{ fontSize: '10px', color: T.text4, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{k.label}</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {msg && (
        <div style={{ marginBottom: '12px', fontSize: '12px', fontWeight: '600', color: msg.type === 'ok' ? GREEN : RED, background: msg.type === 'ok' ? T.greenSoft : T.redSoft, padding: '8px 14px', borderRadius: '8px', border: `1px solid ${msg.type === 'ok' ? T.greenSoft : T.redSoft}` }}>
          {msg.text}
        </div>
      )}

      {/* Companies table */}
      <div style={{ background: T.card, borderRadius: '16px', border: `0.5px solid ${T.hairline}`, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: '#0f1729', padding: '10px 16px', borderRadius: '10px 10px 0 0', display: 'grid', gridTemplateColumns: '2fr 100px 120px 140px 1fr 1fr 180px', gap: '12px', alignItems: 'center' }}>
          {['Empresa', 'Plan', 'Fase', 'Vence', 'Uso IA', 'Docs', 'Cambiar fase'].map(h => (
            <div key={h} style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        {(data.companies || []).map((c, i) => (
          <div key={c.company_id} style={{ padding: '12px 16px', borderBottom: i < data.companies.length - 1 ? `1px solid ${T.hairline}` : 'none', display: 'grid', gridTemplateColumns: '2fr 100px 120px 140px 1fr 1fr 180px', gap: '12px', alignItems: 'center', background: i % 2 === 0 ? T.card : T.soft }}>

            {/* Empresa */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: T.text }}>{c.company_name}</div>
              <div style={{ fontSize: '11px', color: T.text3 }}>{c.company_email} · {c.users_count} usuario{c.users_count !== 1 ? 's' : ''}</div>
            </div>

            {/* Plan */}
            <div style={{ fontSize: '12px', fontWeight: '700', color: BLUE, background: '#eff6ff', padding: '3px 10px', borderRadius: '20px', textAlign: 'center', textTransform: 'capitalize' }}>{c.plan}</div>

            {/* Fase */}
            <div style={{ fontSize: '11px', fontWeight: '700', color: faseColor(c.fase), background: faseBg(c.fase), padding: '3px 10px', borderRadius: '20px', textAlign: 'center' }}>{faseLabel(c.fase)}</div>

            {/* Vence */}
            <div style={{ fontSize: '11px', color: T.text3 }}>
              {c.fase_expiry ? (
                <span style={{ color: new Date(c.fase_expiry) < new Date() ? RED : T.text2 }}>
                  {new Date(c.fase_expiry).toLocaleDateString('es-ES')}
                </span>
              ) : c.fase === 'beta' ? '∞ Sin límite' : '—'}
            </div>

            {/* Uso IA */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: T.text2, marginBottom: '3px' }}>
                <span>{c.ai_queries_used}/{c.ai_queries_limit === 999999 ? '∞' : c.ai_queries_limit}</span>
                <span style={{ color: c.ai_pct >= 80 ? RED : c.ai_pct >= 60 ? AMBER : GREEN }}>{c.ai_pct}%</span>
              </div>
              <div style={{ height: '4px', background: T.soft, borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '4px', width: `${Math.min(c.ai_pct, 100)}%`, background: c.ai_pct >= 80 ? RED : c.ai_pct >= 60 ? AMBER : GREEN, borderRadius: '2px', transition: 'width 0.5s' }} />
              </div>
            </div>

            {/* Docs */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: T.text2, marginBottom: '3px' }}>
                <span>{c.documents_used}/{c.documents_limit === 999999 ? '∞' : c.documents_limit}</span>
                <span style={{ color: c.doc_pct >= 80 ? RED : c.doc_pct >= 60 ? AMBER : GREEN }}>{c.doc_pct}%</span>
              </div>
              <div style={{ height: '4px', background: T.soft, borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '4px', width: `${Math.min(c.doc_pct, 100)}%`, background: c.doc_pct >= 80 ? RED : c.doc_pct >= 60 ? AMBER : GREEN, borderRadius: '2px', transition: 'width 0.5s' }} />
              </div>
            </div>

            {/* Cambiar fase */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {['beta','early_adopter','paid'].filter(f => f !== c.fase).map(f => (
                <button key={f} onClick={() => updateFase(c.company_id, f, f === 'early_adopter' ? 90 : null)} disabled={updating === c.company_id} style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', background: faseBg(f), color: faseColor(f), fontSize: '10px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', opacity: updating === c.company_id ? 0.5 : 1 }}>
                  → {faseLabel(f)}
                </button>
              ))}
              {c.mrr > 0 && <span style={{ fontSize: '11px', fontWeight: '700', color: GREEN, alignSelf: 'center', marginLeft: '4px' }}>€{c.mrr}/mes</span>}
            </div>
          </div>
        ))}

        {data.companies?.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', color: T.text4 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px', color: T.text3 }}><Ico.card size={32} /></div>
            <div>Sin empresas todavía</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Security Tab (read-only) ────────────────────────────────────────────────────
// Consumes GET /api/admin/security/threats (BYPASSRLS, superadmin-only). Shows the
// scored threat_level, the summary KPI strip, each indicator with its offenders,
// and a flattened "most recent suspicious events" feed derived from offenders.
function SecurityTab({ threats, loading, onRefresh }) {
  const T = useT()
  const NAVY = '#0B0D2B', GREEN = '#059669', AMBER = '#d97706', RED = '#dc2626', BLUE = '#3D2BFF'

  // level/severity → soft-token color pair (reuses the existing palette)
  const levelStyle = (lvl) => ({
    tranquilo:   { color: GREEN, bg: T.greenSoft },
    vigilancia:  { color: AMBER, bg: T.amberSoft },
    elevado:     { color: AMBER, bg: T.amberSoft },
    crítico:     { color: RED,   bg: T.redSoft },
    critico:     { color: RED,   bg: T.redSoft },
  }[lvl] || { color: T.text4, bg: T.soft })
  // severity → top-border accent color for indicator cards
  const sevColor = (sev) => ({
    ok: T.text4, vigilancia: AMBER, elevado: AMBER, crítico: RED, critico: RED,
  }[sev] || T.text4)
  const sevLabel = (sev) => ({
    ok: 'OK', vigilancia: 'Vigilancia', elevado: 'Elevado', crítico: 'Crítico', critico: 'Crítico',
  }[sev] || sev)
  const fmtTs = (ts) => (ts ? String(ts).substring(0, 16).replace('T', ' ') : '—')

  const card = { background: T.card, borderRadius: '14px', border: `0.5px solid ${T.hairline}` }
  const pill = (s) => ({ padding: '6px 14px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', border: `1px solid ${s.bg}`, color: s.color, background: s.bg, display: 'inline-block' })
  const badge = (s) => ({ padding: '2px 10px', borderRadius: '8px', fontWeight: '700', fontSize: '11px', border: `1px solid ${s.bg}`, color: s.color, background: s.bg, display: 'inline-block' })
  const btn = { padding: '9px 18px', borderRadius: '9px', background: NAVY, color: 'white', fontWeight: '700', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }

  if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: T.text4 }}>Cargando seguridad...</div>

  if (!threats) {
    return (
      <div style={{ animation: 'fadeUp 0.3s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button style={btn} onClick={onRefresh}>Actualizar</button>
        </div>
        <div style={{ ...card, padding: '48px', textAlign: 'center', color: T.text4 }}>
          Sin actividad sospechosa en la ventana seleccionada
        </div>
      </div>
    )
  }

  const s = threats.summary || {}
  const indicators = threats.indicators || []
  const level = threats.threat_level || 'tranquilo'
  const ls = levelStyle(level)

  // which summary KPIs go "red": value is non-zero AND a related indicator triggered
  const triggered = (key) => indicators.some(i => i.key === key && i.triggered)
  const kpis = [
    { label: 'Logins fallidos 24h', value: s.failed_logins_24h ?? 0, hot: triggered('credential_stuffing') || triggered('brute_force_account') },
    { label: 'Logins fallidos 15m', value: s.failed_logins_15m ?? 0, hot: triggered('brute_force_ip') || triggered('brute_force_account') },
    { label: 'Fallos 2FA 24h',      value: s.twofa_failures_24h ?? 0, hot: triggered('twofa_spike') },
    { label: 'IPs atacantes 24h',   value: s.distinct_attacker_ips_24h ?? 0, hot: triggered('brute_force_ip') || triggered('credential_stuffing') },
    { label: 'Cuentas deshabilitadas 24h', value: s.account_disables_24h ?? 0, hot: triggered('account_lockouts') },
    { label: 'Bloqueos 429 24h',    value: s.rate_limit_blocks_24h ?? 0, hot: triggered('rate_limit_blocks') },
  ]

  // Flatten offenders across indicators → a "most recent suspicious events" feed
  // (ip · email · event · time), sorted by last_ts desc, capped. Read-only derivation.
  const recent = []
  indicators.forEach(ind => {
    (ind.offenders || []).forEach(o => {
      recent.push({
        ip: o.ip || '—',
        email: o.email || o.actor_email || '—',
        event: ind.label || ind.key,
        count: o.count ?? null,
        last_ts: o.last_ts || null,
      })
    })
  })
  recent.sort((a, b) => String(b.last_ts || '').localeCompare(String(a.last_ts || '')))
  const recentTop = recent.slice(0, 15)

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>

      {/* Threat-level banner + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: T.text4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>Nivel de amenaza</span>
          <span style={pill(ls)}>{String(level).toUpperCase()}</span>
          <span style={{ fontSize: '11px', color: T.text4 }}>
            Ventana {threats.window?.hours ?? 24}h · reciente {threats.window?.recent_minutes ?? 15}m
            {threats.generated_at ? ` · ${fmtTs(threats.generated_at)}` : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={btn} onClick={onRefresh}>Actualizar</button>
          <a href="/admin?tab=security" onClick={(e) => { e.preventDefault(); onRefresh && onRefresh() }} style={{ ...btn, background: T.card, color: T.text3, border: `0.5px solid ${T.hairline}`, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Ver registro completo</a>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: '12px', marginBottom: '20px' }}>
        {kpis.map(k => (
          <div key={k.label} style={{ ...card, padding: '14px 16px' }}>
            <div style={{ fontSize: '10px', color: T.text4, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{k.label}</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: k.hot ? RED : T.text }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Indicators */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px,1fr))', gap: '14px', marginBottom: '20px' }}>
        {indicators.map(ind => {
          const sc = sevColor(ind.severity)
          const bs = levelStyle(ind.severity === 'ok' ? '' : ind.severity)
          const offenders = ind.offenders || []
          const unavailable = ind.available === false
          return (
            <div key={ind.key} style={{ ...card, padding: '20px', borderTop: `3px solid ${sc}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: T.text }}>{ind.label}</div>
                <span style={badge(ind.severity === 'ok' ? { color: T.text4, bg: T.soft } : bs)}>{sevLabel(ind.severity)}</span>
              </div>
              <div style={{ fontSize: '12px', color: T.text3, marginBottom: '12px' }}>
                Umbral {ind.threshold} · ventana {ind.window}
                {ind.triggered ? <span style={{ color: RED, fontWeight: '700' }}> · activado</span> : ''}
                {unavailable ? <span style={{ color: T.text4 }}> · no disponible aún</span> : ''}
              </div>

              {unavailable ? (
                <div style={{ fontSize: '12px', color: T.text4, padding: '8px 0' }}>
                  Pendiente del hook de auditoría de rate-limit.
                </div>
              ) : offenders.length === 0 ? (
                <div style={{ fontSize: '12px', color: T.text4, padding: '8px 0' }}>Sin coincidencias.</div>
              ) : (
                <div style={{ borderRadius: '10px', overflow: 'hidden', border: `0.5px solid ${T.hairline}` }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 0.6fr 0.8fr 1.1fr', gap: '8px', padding: '7px 10px', background: '#0f1729' }}>
                    {['Origen', 'Hits', 'Distintos', 'Último'].map(hd => (
                      <div key={hd} style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{hd}</div>
                    ))}
                  </div>
                  {offenders.map((o, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.6fr 0.6fr 0.8fr 1.1fr', gap: '8px', padding: '7px 10px', alignItems: 'center', background: i % 2 ? T.soft : T.card, borderBottom: i < offenders.length - 1 ? `1px solid ${T.hairline}` : 'none' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {o.ip || o.email || o.actor_email || '—'}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: ind.triggered ? RED : T.text2 }}>{o.count ?? '—'}</div>
                      <div style={{ fontSize: '11px', color: T.text3 }}>
                        {o.distinct_emails != null ? `${o.distinct_emails} emails`
                          : o.distinct_ips != null ? `${o.distinct_ips} IPs`
                          : o.target ? o.target : '—'}
                      </div>
                      <div style={{ fontSize: '11px', color: T.text3 }}>{fmtTs(o.last_ts)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Most recent suspicious events */}
      <div style={{ ...card, borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: `0.5px solid ${T.hairline}`, fontSize: '13px', fontWeight: '700', color: T.text }}>
          Eventos sospechosos recientes
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.7fr 1.6fr 0.5fr 1.1fr', gap: '10px', padding: '8px 16px', background: '#0f1729' }}>
          {['IP', 'Email', 'Evento', 'Hits', 'Hora'].map(hd => (
            <div key={hd} style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{hd}</div>
          ))}
        </div>
        {recentTop.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: T.text4, fontSize: '13px' }}>
            Sin actividad sospechosa en la ventana seleccionada
          </div>
        ) : recentTop.map((ev, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.7fr 1.6fr 0.5fr 1.1fr', gap: '10px', padding: '9px 16px', alignItems: 'center', background: i % 2 ? T.soft : T.card, borderBottom: i < recentTop.length - 1 ? `1px solid ${T.hairline}` : 'none' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: T.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.ip}</div>
            <div style={{ fontSize: '12px', color: T.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.email}</div>
            <div style={{ fontSize: '12px', color: T.text2 }}>{ev.event}</div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: T.text3 }}>{ev.count ?? '—'}</div>
            <div style={{ fontSize: '11px', color: T.text4 }}>{fmtTs(ev.last_ts)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProspectorTab({ token, API }) {
  const T = useT()
  const [prompt, setPrompt] = useState('')
  const [location, setLocation] = useState('Madrid')
  const [maxResults, setMaxResults] = useState(50)
  const [searching, setSearching] = useState(false)
  const [searches, setSearches] = useState([])
  const [selectedSearch, setSelectedSearch] = useState(null)
  const [leads, setLeads] = useState([])
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [minScore, setMinScore] = useState(6)
  const [filterEstado, setFilterEstado] = useState('all')
  const [msg, setMsg] = useState(null)
  const [editingMsg, setEditingMsg] = useState(null)
  const [stats, setStats] = useState(null)
  const [polling, setPolling] = useState(null)
  const [showMap, setShowMap] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)

  const NAVY = '#0B0D2B', GREEN = '#059669', AMBER = '#d97706', RED = '#dc2626', BLUE = '#3D2BFF', PURPLE = '#3D2BFF', CYAN = '#3D2BFF'
  const h = () => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' })

  useEffect(() => {
    loadSearches()
    loadStats()
  }, [])

  useEffect(() => {
    return () => { if (polling) clearInterval(polling) }
  }, [polling])

  async function loadSearches() {
    try {
      const r = await fetch(`${API}/api/prospector/searches`, { headers: h() })
      if (r.ok) { const d = await r.json(); setSearches(d.searches || []) }
    } catch(e) {}
  }

  async function loadStats() {
    try {
      const r = await fetch(`${API}/api/prospector/stats`, { headers: h() })
      if (r.ok) { const d = await r.json(); setStats(d) }
    } catch(e) {}
  }

  async function startSearch() {
    if (!prompt.trim()) return
    setSearching(true)
    setMsg(null)
    try {
      const r = await fetch(`${API}/api/prospector/search`, {
        method: 'POST', headers: h(),
        body: JSON.stringify({ prompt, location, max_results: maxResults })
      })
      if (r.ok) {
        const d = await r.json()
        setMsg({ type: 'ok', text: `✅ Búsqueda iniciada — ID #${d.search_id}` })
        loadSearches()
        // Poll until done
        const interval = setInterval(async () => {
          await loadSearches()
          const r2 = await fetch(`${API}/api/prospector/searches`, { headers: h() })
          if (r2.ok) {
            const d2 = await r2.json()
            const search = d2.searches?.find(s => s.id === d.search_id)
            if (search?.status === 'done' || search?.status === 'error') {
              clearInterval(interval)
              setPolling(null)
              setSearching(false)
              if (search.status === 'done') {
                setMsg({ type: 'ok', text: `✅ Completado — ${search.total_leads} leads encontrados, ${search.leads_contactar} para contactar` })
                loadStats()
              } else {
                setMsg({ type: 'err', text: '❌ Error en la búsqueda' })
              }
            }
          }
        }, 3000)
        setPolling(interval)
      } else {
        setMsg({ type: 'err', text: '❌ Error iniciando búsqueda' })
        setSearching(false)
      }
    } catch(e) {
      setMsg({ type: 'err', text: '❌ Error de conexión' })
      setSearching(false)
    }
  }

  async function loadLeads(searchId) {
    setLeadsLoading(true)
    setSelectedSearch(searchId)
    try {
      const r = await fetch(`${API}/api/prospector/searches/${searchId}/leads?min_score=${minScore}`, { headers: h() })
      if (r.ok) { const d = await r.json(); setLeads(d.leads || []) }
    } catch(e) {} finally { setLeadsLoading(false) }
  }

  async function updateLead(leadId, estado, mensaje) {
    try {
      const r = await fetch(`${API}/api/prospector/leads/${leadId}`, {
        method: 'PUT', headers: h(),
        body: JSON.stringify({ estado, mensaje_generado: mensaje })
      })
      if (r.ok) {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, estado, mensaje_generado: mensaje || l.mensaje_generado } : l))
      }
    } catch(e) {}
  }

  async function regenerateMessage(leadId) {
    try {
      const r = await fetch(`${API}/api/prospector/leads/${leadId}/regenerate-message`, { method: 'POST', headers: h() })
      if (r.ok) {
        const d = await r.json()
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, mensaje_generado: d.mensaje_generado } : l))
      }
    } catch(e) {}
  }

  const filteredLeads = leads.filter(l => filterEstado === 'all' || l.estado === filterEstado)
  const scoreColor = s => s >= 8 ? GREEN : s >= 6 ? AMBER : RED
  const estadoBg = e => ({ pendiente: '#f1f5f9', aprobado: '#f0fdf4', enviado: '#eff6ff', descartado: '#fef2f2' }[e] || '#f1f5f9')
  const estadoColor = e => ({ pendiente: '#6b7280', aprobado: GREEN, enviado: BLUE, descartado: RED }[e] || '#6b7280')

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Búsquedas', value: stats.total_searches, color: NAVY },
            { label: 'Leads totales', value: stats.total_leads, color: PURPLE },
            { label: 'Aprobados', value: stats.leads_aprobados, color: GREEN },
            { label: 'Enviados', value: stats.leads_enviados, color: BLUE },
            { label: 'Score medio', value: `${stats.avg_score}/10`, color: AMBER },
          ].map(k => (
            <div key={k.label} style={{ background: T.card, borderRadius: '14px', padding: '14px 16px', border: `0.5px solid ${T.hairline}` }}>
              <div style={{ fontSize: '10px', color: T.text4, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{k.label}</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: k.color === NAVY ? T.text : k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="adm-row" style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '16px' }}>

        {/* Left panel — Search + History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Search form */}
          <div style={{ background: T.card, borderRadius: '16px', border: `0.5px solid ${T.hairline}`, padding: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: '800', color: T.text, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}><Ico.target size={15} />Nueva búsqueda</div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: T.text2, display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Qué buscar</label>
              <input value={prompt} onChange={e => setPrompt(e.target.value)} placeholder='Ej: "restaurantes", "peluquerías", "gimnasios"' style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `0.5px solid ${T.hairline}`, fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: T.card, color: T.text }} onKeyDown={e => e.key === 'Enter' && startSearch()} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: T.text2, display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ciudad</label>
                <input value={location} onChange={e => setLocation(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: `0.5px solid ${T.hairline}`, fontSize: '12px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: T.card, color: T.text }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: T.text2, display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Max leads</label>
                <select value={maxResults} onChange={e => setMaxResults(Number(e.target.value))} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: `0.5px solid ${T.hairline}`, fontSize: '12px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: T.card, color: T.text }}>
                  <option value={20}>20 leads</option>
                  <option value={50}>50 leads</option>
                  <option value={100}>100 leads</option>
                  <option value={200}>200 leads</option>
                  <option value={500}>500 leads</option>
                </select>
              </div>
            </div>

            <button onClick={startSearch} disabled={searching || !prompt.trim()} style={{ width: '100%', padding: '11px', borderRadius: '9px', border: 'none', background: searching ? T.soft : NAVY, color: searching ? T.text4 : 'white', fontWeight: '700', fontSize: '13px', cursor: searching ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {searching ? <><Ico.refresh size={15} /> Buscando...</> : <><Ico.send size={15} /> Iniciar búsqueda</>}
            </button>

            {msg && (
              <div style={{ marginTop: '10px', fontSize: '12px', fontWeight: '600', color: msg.type === 'ok' ? GREEN : RED, background: msg.type === 'ok' ? T.greenSoft : T.redSoft, padding: '8px 12px', borderRadius: '8px', border: `1px solid ${msg.type === 'ok' ? T.greenSoft : T.redSoft}` }}>
                {msg.text}
              </div>
            )}
          </div>

          {/* Search history */}
          <div style={{ background: T.card, borderRadius: '16px', border: `0.5px solid ${T.hairline}`, padding: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: T.text, marginBottom: '10px' }}>Historial de búsquedas</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '400px', overflowY: 'auto' }}>
              {searches.length === 0 && <div style={{ fontSize: '12px', color: T.text4, textAlign: 'center', padding: '20px' }}>Sin búsquedas todavía</div>}
              {searches.map(s => (
                <div key={s.id} onClick={() => s.status === 'done' && loadLeads(s.id)} style={{ padding: '10px 12px', borderRadius: '8px', border: `1.5px solid ${selectedSearch === s.id ? NAVY : T.hairline}`, background: selectedSearch === s.id ? T.soft : T.card, cursor: s.status === 'done' ? 'pointer' : 'default', transition: 'all 0.15s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: T.text }}>"{s.prompt}"</span>
                    <span style={{ fontSize: '10px', fontWeight: '700', color: s.status === 'done' ? GREEN : s.status === 'error' ? RED : AMBER, background: s.status === 'done' ? T.greenSoft : s.status === 'error' ? T.redSoft : T.amberSoft, padding: '1px 7px', borderRadius: '10px' }}>{s.status}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: T.text3 }}>{s.location} · {s.total_leads} leads · {s.leads_contactar} para contactar</div>
                  <div style={{ fontSize: '10px', color: T.text4, marginTop: '2px' }}>{s.created_at?.substring(0,16).replace('T',' ')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel — Leads */}
        <div style={{ background: T.card, borderRadius: '16px', border: `0.5px solid ${T.hairline}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {!selectedSearch ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', padding: '60px', color: T.text4 }}>
              <div style={{ opacity: 0.4, color: T.text3 }}><Ico.target size={40} /></div>
              <div style={{ fontSize: '14px' }}>Selecciona una búsqueda del historial para ver los leads</div>
            </div>
          ) : (
            <>
              {/* Leads toolbar */}
              <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.hairline}`, display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: T.text }}>Leads #{selectedSearch}</span>
                <button onClick={() => setShowMap(m => !m)} aria-label={showMap ? 'Ocultar mapa' : 'Ver mapa'} style={{ padding: '5px 12px', borderRadius: '7px', border: `0.5px solid ${T.hairline}`, background: showMap ? NAVY : T.card, color: showMap ? 'white' : T.text2, fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Ico.map size={13} /> {showMap ? 'Ocultar mapa' : 'Ver mapa'}
                </button>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {['all','pendiente','aprobado','enviado','descartado'].map(f => (
                    <button key={f} onClick={() => setFilterEstado(f)} style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: filterEstado === f ? NAVY : T.soft, color: filterEstado === f ? 'white' : T.text3, fontSize: '11px', fontWeight: filterEstado === f ? '700' : '400', cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>
                      {f === 'all' ? 'Todos' : f}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                  <span style={{ fontSize: '11px', color: T.text3 }}>Score min:</span>
                  <select value={minScore} onChange={e => { setMinScore(Number(e.target.value)); loadLeads(selectedSearch) }} style={{ padding: '4px 8px', borderRadius: '6px', border: `0.5px solid ${T.hairline}`, fontSize: '11px', fontFamily: 'inherit', background: T.card, color: T.text }}>
                    {[0,5,6,7,8,9].map(s => <option key={s} value={s}>{s}+</option>)}
                  </select>
                </div>
              </div>

              {/* Map */}
              {showMap && (() => {
                const leadsWithCoords = filteredLeads.filter(l => l.lat && l.lng)
                if (leadsWithCoords.length === 0) return (
                  <div style={{ padding: '20px', textAlign: 'center', color: T.text4, fontSize: '12px', background: T.soft, borderBottom: `1px solid ${T.hairline}` }}>
                    Ningún lead tiene coordenadas disponibles
                  </div>
                )
                return (
                  <div style={{ borderBottom: `1px solid ${T.hairline}` }}>
                    <iframe
                      key={selectedSearch + filterEstado}
                      style={{ width: '100%', height: '320px', border: 'none' }}
                      srcDoc={`<!DOCTYPE html><html><head>
                        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
                        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                        <style>body{margin:0}#map{height:320px}</style>
                      </head><body>
                        <div id="map"></div>
                        <script>
                          const leads = ${JSON.stringify(leadsWithCoords.map(l => ({
                            nombre: l.nombre, lat: l.lat, lng: l.lng,
                            score: l.score, ciudad: l.ciudad, rating: l.rating,
                            maps_url: l.maps_url, estado: l.estado
                          })))};
                          const map = L.map('map');
                          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);
                          const colors = {'pendiente':'#6b7280','aprobado':'#059669','enviado':'#3D2BFF','descartado':'#dc2626'};
                          leads.forEach(l => {
                            const color = l.score >= 8 ? '#059669' : l.score >= 6 ? '#d97706' : '#dc2626';
                            const marker = L.circleMarker([l.lat, l.lng], {radius:8, fillColor:color, color:'white', weight:2, fillOpacity:0.9}).addTo(map);
                            marker.bindPopup('<b>'+l.nombre+'</b><br/>Score: '+l.score+'/10<br/>'+l.ciudad+(l.rating?'<br/>⭐ '+l.rating:'')+(l.maps_url?'<br/><a href="'+l.maps_url+'" target="_blank">Ver en Maps</a>':''));
                          });
                          if (leads.length > 0) {
                            const bounds = L.latLngBounds(leads.map(l => [l.lat, l.lng]));
                            map.fitBounds(bounds, {padding:[20,20]});
                          }
                        </script>
                      </body></html>`}
                    />
                    <div style={{ padding: '8px 16px', background: T.soft, fontSize: '11px', color: T.text3, display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: GREEN }} /> Score 8-10</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: AMBER }} /> Score 6-7</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: RED }} /> Score 0-5</span>
                      <span style={{ marginLeft: 'auto' }}>{leadsWithCoords.length} leads en el mapa · {filteredLeads.length - leadsWithCoords.length} sin coordenadas</span>
                    </div>
                  </div>
                )
              })()}

              {/* Leads list */}
              <div style={{ flex: 1, overflowY: 'auto', maxHeight: '680px' }}>
                {leadsLoading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: T.text4 }}>Cargando leads...</div>
                ) : filteredLeads.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: T.text4 }}>No hay leads con estos filtros</div>
                ) : filteredLeads.map(lead => (
                  <div key={lead.id} style={{ padding: '14px 16px', borderBottom: `1px solid ${T.hairline}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: T.text }}>{lead.nombre}</span>
                          <span style={{ fontSize: '11px', fontWeight: '800', color: scoreColor(lead.score), background: scoreColor(lead.score)+'18', padding: '1px 8px', borderRadius: '20px' }}>{lead.score}/10</span>
                          <span style={{ fontSize: '10px', color: T.text3, background: T.soft, padding: '1px 7px', borderRadius: '10px' }}>{lead.source}</span>
                          <span style={{ fontSize: '10px', fontWeight: '600', color: estadoColor(lead.estado), background: estadoBg(lead.estado), padding: '1px 7px', borderRadius: '10px' }}>{lead.estado}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: T.text3, display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                          {lead.ciudad && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Ico.pin size={12} /> {lead.ciudad}</span>}
                          {lead.rating > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Ico.star size={12} /> {lead.rating} ({lead.reviews} reseñas)</span>}
                          {lead.telefono && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Ico.phone size={12} /> {lead.telefono}</span>}
                          {lead.website && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Ico.globe size={12} /> web</span>}
                          {lead.instagram && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Ico.camera size={12} /> ig</span>}
                        </div>
                        {lead.pain_point && <div style={{ fontSize: '11px', color: AMBER, marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}><Ico.bulb size={12} /> {lead.pain_point}</div>}
                        {lead.razon_score && <div style={{ fontSize: '11px', color: T.text3, marginTop: '2px', fontStyle: 'italic' }}>{lead.razon_score}</div>}
                      </div>
                    </div>

                    {/* Mensaje */}
                    {lead.mensaje_generado && (
                      <div style={{ background: T.soft, borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', border: `0.5px solid ${T.hairline}` }}>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: BLUE, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Mensaje — {lead.canal_recomendado}</div>
                        {editingMsg === lead.id ? (
                          <textarea defaultValue={lead.mensaje_generado} id={`msg-${lead.id}`} rows={4} style={{ width: '100%', fontSize: '11px', fontFamily: 'inherit', lineHeight: '1.6', border: `0.5px solid ${T.hairline}`, borderRadius: '6px', padding: '8px', resize: 'vertical', outline: 'none', boxSizing: 'border-box', background: T.card, color: T.text }} />
                        ) : (
                          <div style={{ fontSize: '11px', color: T.text2, lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{lead.mensaje_generado}</div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {lead.estado === 'pendiente' && (
                        <button onClick={() => updateLead(lead.id, 'aprobado', null)} style={{ padding: '5px 12px', borderRadius: '7px', border: 'none', background: T.greenSoft, color: GREEN, fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '5px' }}><Ico.check size={13} /> Aprobar</button>
                      )}
                      {lead.estado === 'aprobado' && (
                        <button onClick={() => updateLead(lead.id, 'enviado', null)} style={{ padding: '5px 12px', borderRadius: '7px', border: 'none', background: T.soft, color: BLUE, fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '5px' }}><Ico.send size={13} /> Marcar enviado</button>
                      )}
                      {lead.estado !== 'descartado' && (
                        <button onClick={() => updateLead(lead.id, 'descartado', null)} style={{ padding: '5px 12px', borderRadius: '7px', border: 'none', background: T.redSoft, color: RED, fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '5px' }}><Ico.trash size={13} /> Descartar</button>
                      )}
                      {editingMsg === lead.id ? (
                        <>
                          <button onClick={() => { const el = document.getElementById(`msg-${lead.id}`); updateLead(lead.id, lead.estado, el.value); setEditingMsg(null) }} style={{ padding: '5px 12px', borderRadius: '7px', border: 'none', background: NAVY, color: 'white', fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '5px' }}><Ico.save size={13} /> Guardar</button>
                          <button onClick={() => setEditingMsg(null)} style={{ padding: '5px 12px', borderRadius: '7px', border: `0.5px solid ${T.hairline}`, background: T.card, color: T.text3, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setEditingMsg(lead.id)} style={{ padding: '5px 12px', borderRadius: '7px', border: `0.5px solid ${T.hairline}`, background: T.card, color: T.text2, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '5px' }}><Ico.edit size={13} /> Editar mensaje</button>
                          <button onClick={() => regenerateMessage(lead.id)} style={{ padding: '5px 12px', borderRadius: '7px', border: `0.5px solid ${T.hairline}`, background: T.card, color: PURPLE, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '5px' }}><Ico.refresh size={13} /> Regenerar</button>
                        </>
                      )}
                      {lead.website && <a href={lead.website} target="_blank" rel="noreferrer" aria-label="Abrir sitio web del lead" style={{ padding: '5px 12px', borderRadius: '7px', border: `0.5px solid ${T.hairline}`, background: T.card, color: T.text2, fontSize: '11px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Ico.globe size={13} /> Web</a>}
                      {lead.instagram && <a href={lead.instagram} target="_blank" rel="noreferrer" aria-label="Abrir Instagram del lead" style={{ padding: '5px 12px', borderRadius: '7px', border: `0.5px solid ${T.hairline}`, background: T.card, color: T.text2, fontSize: '11px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Ico.camera size={13} /> IG</a>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function AIInsights({ token }) {
  const T = useT()
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const API = API_BASE
  const NAVY = '#0B0D2B', GREEN = '#059669', AMBER = '#d97706', RED = '#dc2626', BLUE = '#3D2BFF'

  async function analyze() {
    setLoading(true)
    setError(null)
    setAnalysis(null)
    try {
      const r = await fetch(`${API}/api/admin/ai-insights`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      })
      if (!r.ok) { setError('Error al conectar con el servidor'); return }
      const data = await r.json()
      setAnalysis(data)
    } catch(e) {
      setError('No se pudo conectar con el backend')
    } finally {
      setLoading(false)
    }
  }

  const impactColor = v => v === 'alto' ? GREEN : v === 'medio' ? AMBER : BLUE
  const urgColor = v => v === 'alta' ? RED : v === 'media' ? AMBER : GREEN

  return (
    <div style={{ background: T.card, borderRadius: '16px', border: `0.5px solid ${T.hairline}`, padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '800', color: T.text, display: 'flex', alignItems: 'center', gap: '7px' }}><Ico.brain size={17} />Análisis IA de la plataforma</div>
          <div style={{ fontSize: '12px', color: T.text4, marginTop: '2px' }}>Claude analiza los datos reales y detecta oportunidades</div>
        </div>
        <button onClick={analyze} disabled={loading} style={{ padding: '9px 18px', borderRadius: '10px', border: 'none', background: loading ? T.soft : NAVY, color: loading ? T.text4 : 'white', fontWeight: '700', fontSize: '13px', cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {loading ? <><Ico.refresh size={15} /> Analizando...</> : <><Ico.sparkles size={15} /> Analizar ahora</>}
        </button>
      </div>

      {!analysis && !loading && !error && (
        <div style={{ textAlign: 'center', padding: '32px', color: T.text4, background: T.soft, borderRadius: '10px', border: `1px dashed ${T.hairline}` }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px', color: T.text3 }}><Ico.robot size={28} /></div>
          <div style={{ fontSize: '13px' }}>Pulsa "Analizar ahora" para que Claude analice los datos de Vela y detecte oportunidades de negocio.</div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '32px', color: T.text4 }}>
          <div style={{ fontSize: '13px', marginBottom: '6px' }}>Claude está analizando los datos de la plataforma...</div>
          <div style={{ fontSize: '11px' }}>Esto puede tardar unos segundos</div>
        </div>
      )}

      {error && (
        <div style={{ color: RED, fontSize: '13px', padding: '12px', background: T.redSoft, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><Ico.warning size={15} /> {error}</div>
      )}

      {analysis && (
        <div>
          <div style={{ background: '#eff6ff', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px', borderLeft: `3px solid ${BLUE}` }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: BLUE, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Resumen</div>
            <div style={{ fontSize: '13px', color: '#1e3a5f', lineHeight: '1.6' }}>{analysis.resumen}</div>
          </div>

          <div className="adm-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: GREEN, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}><Ico.check size={13} /> Oportunidades</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(analysis.oportunidades || []).map((o, i) => (
                  <div key={i} style={{ background: '#f0fdf4', borderRadius: '8px', padding: '12px', border: '1px solid #bbf7d0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: NAVY }}>{o.titulo}</div>
                      <span style={{ fontSize: '9px', fontWeight: '700', color: impactColor(o.impacto), background: impactColor(o.impacto)+'18', padding: '1px 6px', borderRadius: '10px', textTransform: 'uppercase', whiteSpace: 'nowrap', marginLeft: '8px' }}>{o.impacto}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#374151', lineHeight: '1.5', marginBottom: '6px' }}>{o.descripcion}</div>
                    <div style={{ fontSize: '11px', color: GREEN, fontWeight: '600' }}>→ {o.accion}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: RED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}><Ico.warning size={13} /> Riesgos</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(analysis.riesgos || []).map((r, i) => (
                  <div key={i} style={{ background: '#fef2f2', borderRadius: '8px', padding: '12px', border: '1px solid #fecaca' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: NAVY }}>{r.titulo}</div>
                      <span style={{ fontSize: '9px', fontWeight: '700', color: urgColor(r.urgencia), background: urgColor(r.urgencia)+'18', padding: '1px 6px', borderRadius: '10px', textTransform: 'uppercase', whiteSpace: 'nowrap', marginLeft: '8px' }}>{r.urgencia}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#374151', lineHeight: '1.5' }}>{r.descripcion}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ background: T.soft, borderRadius: '10px', padding: '14px 16px', borderLeft: `3px solid ${T.blue}` }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}><Ico.star size={13} /> Recomendación principal</div>
            <div style={{ fontSize: '13px', color: T.text, fontWeight: '600', lineHeight: '1.6' }}>{analysis.recomendacion_principal}</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Profit Optimizer Tab ───────────────────────────────────────────────────────
function ProfitOptimizerTab({ token, API }) {
  const T = useT()
  const NAVY = '#0B0D2B', GREEN = '#059669', AMBER = '#d97706', RED = '#dc2626', BLUE = '#3D2BFF'
  const h = () => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' })
  const euro = n => n == null ? '—' : '€' + Math.round(n).toLocaleString('es-ES')

  const [period, setPeriod] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` })
  const [lines, setLines] = useState([])
  const [selectedLine, setSelectedLine] = useState(null)
  const [products, setProducts] = useState([])
  const [inputs, setInputs] = useState({ fixed_costs: 5000, total_budget: 45000, vacation_factor: 1.0, vacation_month: false })
  const [runs, setRuns] = useState([])
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)
  const [msg, setMsg] = useState(null)
  const [showLineForm, setShowLineForm] = useState(false)
  const [showProdForm, setShowProdForm] = useState(false)
  const [newLine, setNewLine] = useState({ name: '', description: '', seasonality: 1.0 })
  const [newProd, setNewProd] = useState({ name: '', selling_price: '', supply_limit: 0, labour: '', material: '', logistics: '' })

  useEffect(() => { loadLines(); loadInputs(); loadRuns() }, [])
  useEffect(() => { if (selectedLine) loadProducts(selectedLine) }, [selectedLine])
  useEffect(() => { loadInputs() }, [period])

  async function loadLines() {
    try { const r = await fetch(`${API}/profit-optimizer/lines`, { headers: h() }); if (r.ok) { const d = await r.json(); setLines(d || []); if (d?.length && !selectedLine) setSelectedLine(d[0].id) } } catch (e) {}
  }
  async function loadProducts(id) {
    try { const r = await fetch(`${API}/profit-optimizer/lines/${id}/products`, { headers: h() }); if (r.ok) setProducts(await r.json() || []) } catch (e) {}
  }
  async function loadInputs() {
    try { const r = await fetch(`${API}/profit-optimizer/inputs/${period}`, { headers: h() }); if (r.ok) { const d = await r.json(); setInputs({ fixed_costs: d.fixed_costs, total_budget: d.total_budget, vacation_factor: d.vacation_factor, vacation_month: d.vacation_month }) } } catch (e) {}
  }
  async function loadRuns() {
    try { const r = await fetch(`${API}/profit-optimizer/runs`, { headers: h() }); if (r.ok) setRuns(await r.json() || []) } catch (e) {}
  }
  async function createLine() {
    if (!newLine.name.trim()) return
    try { const r = await fetch(`${API}/profit-optimizer/lines`, { method: 'POST', headers: h(), body: JSON.stringify(newLine) }); if (r.ok) { setNewLine({ name: '', description: '', seasonality: 1.0 }); setShowLineForm(false); loadLines() } } catch (e) {}
  }
  async function createProduct() {
    if (!selectedLine || !newProd.name.trim() || !newProd.selling_price) return
    const lab = Number(newProd.labour) || 0, mat = Number(newProd.material) || 0, log = Number(newProd.logistics) || 0
    const body = {
      line_id: selectedLine, name: newProd.name, selling_price: Number(newProd.selling_price), supply_limit: Number(newProd.supply_limit) || 0,
      labour_cost_m1: lab, labour_cost_m2: lab, labour_cost_m3: lab,
      material_cost_m1: mat, material_cost_m2: mat, material_cost_m3: mat,
      logistics_cost_m1: log, logistics_cost_m2: log, logistics_cost_m3: log,
    }
    try { const r = await fetch(`${API}/profit-optimizer/lines/${selectedLine}/products`, { method: 'POST', headers: h(), body: JSON.stringify(body) }); if (r.ok) { setNewProd({ name: '', selling_price: '', supply_limit: 0, labour: '', material: '', logistics: '' }); setShowProdForm(false); loadProducts(selectedLine) } } catch (e) {}
  }
  async function saveInputs() {
    try { await fetch(`${API}/profit-optimizer/inputs`, { method: 'PUT', headers: h(), body: JSON.stringify({ period_label: period, ...inputs }) }); setMsg({ type: 'ok', text: '✅ Parámetros guardados' }) } catch (e) {}
  }
  async function runOpt() {
    setRunning(true); setMsg(null); setResult(null)
    try {
      await saveInputs()
      const r = await fetch(`${API}/profit-optimizer/run`, { method: 'POST', headers: h(), body: JSON.stringify({ period_label: period, n_months: 8 }) })
      const d = await r.json()
      if (r.ok) { setResult(d); setMsg({ type: 'ok', text: '✅ Optimización completada' }); loadRuns() }
      else { setMsg({ type: 'err', text: '❌ ' + (d.detail || 'Error en la optimización') }) }
    } catch (e) { setMsg({ type: 'err', text: '❌ Error de conexión' }) } finally { setRunning(false) }
  }

  const lbl = { fontSize: '11px', fontWeight: '700', color: T.text2, display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }
  const inp = { width: '100%', padding: '9px 11px', borderRadius: '8px', border: `0.5px solid ${T.hairline}`, fontSize: '12.5px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: T.card, color: T.text }
  const card = { background: T.card, borderRadius: '16px', border: `0.5px solid ${T.hairline}`, padding: '18px' }
  const totalProducts = lines.reduce((s, l) => s + (l.n_products || 0), 0)
  const lastRun = runs[0]
  // Extrae recomendaciones del result_json de forma defensiva (formato del solver no garantizado)
  const recList = result && (Array.isArray(result.line_estimates) ? result.line_estimates : Array.isArray(result.products) ? result.products : Array.isArray(result.recommendations) ? result.recommendations : Array.isArray(result.lines) ? result.lines : null)

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>
      {/* Intro */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: T.text3, maxWidth: 720 }}>
          Optimización de márgenes por línea comercial y producto (solver de programación lineal). Define tus líneas y productos con sus costes, ajusta los parámetros del periodo y ejecuta la optimización para obtener el mix de precio/cantidad que maximiza el beneficio.
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'Líneas comerciales', value: lines.length, color: NAVY },
          { label: 'Productos', value: totalProducts, color: BLUE },
          { label: 'Optimizaciones', value: runs.length, color: AMBER },
          { label: 'Último beneficio óptimo', value: lastRun ? euro(lastRun.optimised_profit) : '—', color: GREEN },
        ].map(k => (
          <div key={k.label} style={{ background: T.card, borderRadius: '14px', padding: '14px 16px', border: `0.5px solid ${T.hairline}` }}>
            <div style={{ fontSize: '10px', color: T.text4, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{k.label}</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: k.color === NAVY ? T.text : k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="adm-row" style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '16px' }}>

        {/* Left — Líneas + productos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: T.text }}>Líneas comerciales</div>
              <button onClick={() => setShowLineForm(v => !v)} style={{ border: 'none', background: T.soft, color: T.text2, borderRadius: '7px', padding: '4px 10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>{showLineForm ? '×' : '+ Nueva'}</button>
            </div>
            {showLineForm && (
              <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input value={newLine.name} onChange={e => setNewLine({ ...newLine, name: e.target.value })} placeholder="Nombre de la línea" style={inp} />
                <input value={newLine.description} onChange={e => setNewLine({ ...newLine, description: e.target.value })} placeholder="Descripción (opcional)" style={inp} />
                <div>
                  <label style={lbl}>Estacionalidad ({newLine.seasonality}×)</label>
                  <input type="range" min="0.1" max="5" step="0.1" value={newLine.seasonality} onChange={e => setNewLine({ ...newLine, seasonality: Number(e.target.value) })} style={{ width: '100%' }} />
                </div>
                <button onClick={createLine} style={{ border: 'none', background: NAVY, color: '#fff', borderRadius: '8px', padding: '9px', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>Crear línea</button>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
              {lines.length === 0 && <div style={{ fontSize: '12px', color: T.text4, textAlign: 'center', padding: '16px' }}>Sin líneas todavía</div>}
              {lines.map(l => (
                <div key={l.id} onClick={() => setSelectedLine(l.id)} style={{ padding: '10px 12px', borderRadius: '8px', border: `1.5px solid ${selectedLine === l.id ? NAVY : T.hairline}`, background: selectedLine === l.id ? T.soft : T.card, cursor: 'pointer' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: '700', color: T.text }}>{l.name}</div>
                  <div style={{ fontSize: '11px', color: T.text3 }}>{l.n_products} productos · estacionalidad {l.seasonality}×</div>
                </div>
              ))}
            </div>
          </div>

          {/* Productos de la línea seleccionada */}
          {selectedLine && (
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: T.text }}>Productos</div>
                <button onClick={() => setShowProdForm(v => !v)} style={{ border: 'none', background: T.soft, color: T.text2, borderRadius: '7px', padding: '4px 10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>{showProdForm ? '×' : '+ Nuevo'}</button>
              </div>
              {showProdForm && (
                <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input value={newProd.name} onChange={e => setNewProd({ ...newProd, name: e.target.value })} placeholder="Nombre del producto" style={inp} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div><label style={lbl}>Precio venta €</label><input type="number" value={newProd.selling_price} onChange={e => setNewProd({ ...newProd, selling_price: e.target.value })} style={inp} /></div>
                    <div><label style={lbl}>Límite producción</label><input type="number" value={newProd.supply_limit} onChange={e => setNewProd({ ...newProd, supply_limit: e.target.value })} style={inp} /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div><label style={lbl}>Mano obra €</label><input type="number" value={newProd.labour} onChange={e => setNewProd({ ...newProd, labour: e.target.value })} style={inp} /></div>
                    <div><label style={lbl}>Material €</label><input type="number" value={newProd.material} onChange={e => setNewProd({ ...newProd, material: e.target.value })} style={inp} /></div>
                    <div><label style={lbl}>Logística €</label><input type="number" value={newProd.logistics} onChange={e => setNewProd({ ...newProd, logistics: e.target.value })} style={inp} /></div>
                  </div>
                  <button onClick={createProduct} style={{ border: 'none', background: NAVY, color: '#fff', borderRadius: '8px', padding: '9px', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>Añadir producto</button>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '320px', overflowY: 'auto' }}>
                {products.length === 0 && <div style={{ fontSize: '12px', color: T.text4, textAlign: 'center', padding: '16px' }}>Sin productos en esta línea</div>}
                {products.map(p => {
                  const margin = (p.implied_margin || 0) * 100
                  return (
                    <div key={p.id} style={{ padding: '10px 12px', borderRadius: '8px', border: `0.5px solid ${T.hairline}`, background: T.card }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: '700', color: T.text }}>{p.name}</span>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: margin >= 30 ? GREEN : margin >= 10 ? AMBER : RED }}>{margin.toFixed(0)}% margen</span>
                      </div>
                      <div style={{ fontSize: '11px', color: T.text3, marginTop: '2px' }}>PV {euro(p.selling_price)} · coste {euro(p.unit_cost)} · límite {p.supply_limit || '∞'}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right — Parámetros + ejecutar + resultado */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={card}>
            <div style={{ fontSize: '13px', fontWeight: '800', color: T.text, marginBottom: '14px' }}>Parámetros del periodo</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><label style={lbl}>Periodo</label><input value={period} onChange={e => setPeriod(e.target.value)} placeholder="2026-06" style={inp} /></div>
              <div><label style={lbl}>Costes fijos €</label><input type="number" value={inputs.fixed_costs} onChange={e => setInputs({ ...inputs, fixed_costs: Number(e.target.value) })} style={inp} /></div>
              <div><label style={lbl}>Presupuesto total €</label><input type="number" value={inputs.total_budget} onChange={e => setInputs({ ...inputs, total_budget: Number(e.target.value) })} style={inp} /></div>
              <div><label style={lbl}>Factor vacaciones ({inputs.vacation_factor}×)</label><input type="range" min="0.5" max="1" step="0.05" value={inputs.vacation_factor} onChange={e => setInputs({ ...inputs, vacation_factor: Number(e.target.value) })} style={{ width: '100%', marginTop: '8px' }} /></div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '12.5px', color: T.text2, cursor: 'pointer' }}>
              <input type="checkbox" checked={inputs.vacation_month} onChange={e => setInputs({ ...inputs, vacation_month: e.target.checked })} /> Mes de vacaciones
            </label>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button onClick={saveInputs} style={{ flex: '0 0 auto', border: `0.5px solid ${T.hairline}`, background: T.card, color: T.text2, borderRadius: '9px', padding: '11px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>Guardar</button>
              <button onClick={runOpt} disabled={running || totalProducts === 0} style={{ flex: 1, border: 'none', background: running || totalProducts === 0 ? T.soft : NAVY, color: running || totalProducts === 0 ? T.text4 : '#fff', borderRadius: '9px', padding: '11px', fontSize: '13px', fontWeight: '700', cursor: running || totalProducts === 0 ? 'default' : 'pointer', fontFamily: 'inherit' }}>{running ? 'Optimizando…' : '⚡ Ejecutar optimización'}</button>
            </div>
            {totalProducts === 0 && <div style={{ fontSize: '11.5px', color: T.text4, marginTop: '8px' }}>Añade al menos un producto para poder optimizar.</div>}
            {msg && <div style={{ marginTop: '10px', fontSize: '12px', fontWeight: '600', color: msg.type === 'ok' ? GREEN : RED, background: msg.type === 'ok' ? T.greenSoft : T.redSoft, padding: '8px 12px', borderRadius: '8px' }}>{msg.text}</div>}
          </div>

          {/* Resultado de la optimización */}
          {result && (
            <div style={card}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: T.text, marginBottom: '14px' }}>Resultado</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: '10px', marginBottom: recList ? '14px' : 0 }}>
                {result.optimised_profit != null && <div style={{ background: T.greenSoft, borderRadius: '12px', padding: '12px 14px' }}><div style={{ fontSize: '10px', color: T.text4, textTransform: 'uppercase' }}>Beneficio óptimo</div><div style={{ fontSize: '20px', fontWeight: '800', color: GREEN }}>{euro(result.optimised_profit)}</div></div>}
                {result.profit_gain != null && <div style={{ background: T.soft, borderRadius: '12px', padding: '12px 14px' }}><div style={{ fontSize: '10px', color: T.text4, textTransform: 'uppercase' }}>Ganancia extra</div><div style={{ fontSize: '20px', fontWeight: '800', color: T.text }}>{euro(result.profit_gain)}</div></div>}
                {result.status && <div style={{ background: T.soft, borderRadius: '12px', padding: '12px 14px' }}><div style={{ fontSize: '10px', color: T.text4, textTransform: 'uppercase' }}>Estado</div><div style={{ fontSize: '14px', fontWeight: '700', color: T.text }}>{result.status}</div></div>}
              </div>
              {result.escalation_reason && <div style={{ fontSize: '12px', color: AMBER, marginBottom: '10px' }}>⚠ {result.escalation_reason}</div>}
              {recList && (
                <div style={{ border: `0.5px solid ${T.hairline}`, borderRadius: '10px', overflow: 'hidden' }}>
                  {recList.slice(0, 30).map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderTop: i ? `0.5px solid ${T.hairline}` : 'none', fontSize: '12px' }}>
                      <span style={{ color: T.text, fontWeight: '600' }}>{r.name || r.product || r.producto || `#${i + 1}`}</span>
                      <span style={{ color: T.text3 }}>{[
                        r.quantity != null ? `${Math.round(r.quantity)} uds` : null,
                        r.price != null ? euro(r.price) : null,
                        r.profit != null ? euro(r.profit) : null,
                        r.baseline_B != null ? `base ${euro(r.baseline_B)}` : null,
                        r.eta != null ? `η ${(r.eta * 100).toFixed(0)}%` : null,
                      ].filter(Boolean).join(' · ')}</span>
                    </div>
                  ))}
                </div>
              )}
              <details style={{ marginTop: '12px' }}>
                <summary style={{ fontSize: '11.5px', color: T.text4, cursor: 'pointer' }}>Ver datos completos (JSON)</summary>
                <pre style={{ fontSize: '11px', color: T.text3, background: T.soft, padding: '12px', borderRadius: '8px', overflowX: 'auto', marginTop: '8px' }}>{JSON.stringify(result, null, 2)}</pre>
              </details>
            </div>
          )}

          {/* Historial de optimizaciones */}
          <div style={card}>
            <div style={{ fontSize: '13px', fontWeight: '800', color: T.text, marginBottom: '12px' }}>Historial de optimizaciones</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
              {runs.length === 0 && <div style={{ fontSize: '12px', color: T.text4, textAlign: 'center', padding: '16px' }}>Sin optimizaciones todavía</div>}
              {runs.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderRadius: '8px', border: `0.5px solid ${T.hairline}` }}>
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: '700', color: T.text }}>{r.period}</div>
                    <div style={{ fontSize: '10.5px', color: T.text4 }}>{new Date(r.run_at).toLocaleString('es-ES')}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: GREEN }}>{euro(r.optimised_profit)}</div>
                    <div style={{ fontSize: '10.5px', color: r.status === 'optimal' || r.status === 'done' ? GREEN : AMBER }}>{r.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const T = useT()
  const { theme } = useTheme()
  const router = useRouter()
  const [token, setToken] = useState(null)
  const [tab, setTab] = useState('overview')

  // Data states
  const [overview, setOverview] = useState(null)
  const [companies, setCompanies] = useState([])
  const [users, setUsers] = useState([])
  const [snapshots, setSnapshots] = useState([])
  const [threats, setThreats] = useState(null)
  const [prompts, setPrompts] = useState([])
  const [selectedPrompt, setSelectedPrompt] = useState(null)
  const [editingPrompt, setEditingPrompt] = useState('')
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [companyDetail, setCompanyDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const parseVars = (v) => { try { return typeof v === 'string' ? JSON.parse(v) : (v || []) } catch { return [] } }
  const [snapshotMsg, setSnapshotMsg] = useState(null)
  const [planModal, setPlanModal] = useState(null)
  const [newPlan, setNewPlan] = useState('pro')
  const [memoryEdit, setMemoryEdit] = useState({ manual_training: '', business_personality: '', business_goals: '' })
  const [savingMemory, setSavingMemory] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [snapshotFilter, setSnapshotFilter] = useState('all')

  useEffect(() => {
    const t = localStorage.getItem('vela_token')
    if (!t) { router.push('/login'); return }
    setToken(t)
    // Read tab from URL
    const params = new URLSearchParams(window.location.search)
    setTab(params.get('tab') || 'overview')
  }, [])

  useEffect(() => {
    if (!token) return
    if (tab === 'overview') loadOverview()
    if (tab === 'companies') loadCompanies()
    if (tab === 'users') loadUsers()
    if (tab === 'snapshots') loadSnapshots()
    if (tab === 'security') loadThreats()
    if (tab === 'prospector') {}
    if (tab === 'memory') loadCompanies()
    if (tab === 'billing') loadCompanies()
    if (tab === 'prompts') loadPrompts()
  }, [token, tab])

  const h = () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' })

  async function loadOverview() {
    setLoading(true)
    try { const r = await fetch(`${API}/api/admin/overview`, { headers: h() }); if (r.ok) setOverview(await r.json()) } catch {} finally { setLoading(false) }
  }
  async function loadCompanies() {
    setLoading(true)
    try { const r = await fetch(`${API}/api/admin/companies`, { headers: h() }); if (r.ok) { const d = await r.json(); setCompanies(d.companies || []) } } catch {} finally { setLoading(false) }
  }
  async function loadUsers() {
    setLoading(true)
    try { const r = await fetch(`${API}/api/admin/users`, { headers: h() }); if (r.ok) { const d = await r.json(); setUsers(d.users || []) } } catch {} finally { setLoading(false) }
  }
  async function loadSnapshots() {
    setLoading(true)
    try { const r = await fetch(`${API}/api/admin/snapshots`, { headers: h() }); if (r.ok) { const d = await r.json(); setSnapshots(d.snapshots || []) } } catch {} finally { setLoading(false) }
  }
  async function loadPrompts() {
    setLoading(true)
    try { const r = await fetch(`${API}/api/admin/prompts`, { headers: h() }); if (r.ok) { const d = await r.json(); setPrompts(d.prompts || []) } } catch {} finally { setLoading(false) }
  }
  async function loadThreats() {
    setLoading(true)
    try { const r = await apiFetch('/api/admin/security/threats', { headers: authHeaders() }); if (r.ok) setThreats(await r.json()) } catch {} finally { setLoading(false) }
  }
  async function loadCompanyDetail(id) {
    try { const r = await fetch(`${API}/api/admin/companies/${id}`, { headers: h() }); if (r.ok) { const d = await r.json(); setCompanyDetail(d); setMemoryEdit({ manual_training: d.memory?.manual_training || '', business_personality: d.memory?.business_personality || '', business_goals: d.memory?.business_goals || '' }) } } catch {}
  }

  async function updatePlan() {
    if (!planModal) return
    setSaving(true)
    try {
      const r = await fetch(`${API}/api/admin/companies/${planModal}/plan`, { method: 'PUT', headers: h(), body: JSON.stringify({ plan_id: newPlan }) })
      if (r.ok) { setPlanModal(null); loadCompanies() }
    } catch {} finally { setSaving(false) }
  }

  async function toggleVeraPlan(companyId, currentPlan) {
    const newPlan = currentPlan === 'plus' ? 'base' : 'plus'
    // Optimistic update — actualizar UI inmediatamente
    setCompanies(prev => prev.map(c =>
      c.id === companyId ? { ...c, vera_plan: newPlan } : c
    ))
    try {
      const r = await fetch(`${API}/api/admin/companies/${companyId}/vera-plan`, {
        method: 'PUT',
        headers: { ...h(), 'Cache-Control': 'no-cache' },
        body: JSON.stringify({ vera_plan: newPlan }),
      })
      if (r.ok) {
        const refresh = await fetch(`${API}/api/admin/companies?_t=${Date.now()}`, { headers: h() })
        if (refresh.ok) {
          const d = await refresh.json()
          setCompanies(d.companies || [])
        }
      } else {
        // Rollback si falla
        setCompanies(prev => prev.map(c =>
          c.id === companyId ? { ...c, vera_plan: currentPlan } : c
        ))
      }
    } catch {
      setCompanies(prev => prev.map(c =>
        c.id === companyId ? { ...c, vera_plan: currentPlan } : c
      ))
    }
  }

  async function toggleUser(userId, isActive) {
    try {
      await fetch(`${API}/api/admin/users/${userId}/status`, { method: 'PUT', headers: h(), body: JSON.stringify({ is_active: isActive }) })
      loadUsers()
    } catch {}
  }

  async function generateAllSnapshots() {
    setSnapshotLoading(true)
    setSnapshotMsg(null)
    try {
      const r = await fetch(`${API}/api/admin/snapshots/generate-all`, { method: 'POST', headers: h() })
      if (r.ok) {
        const d = await r.json()
        const total = d.results?.length || 0
        setSnapshotMsg(`✅ ${total} snapshot${total !== 1 ? 's' : ''} generado${total !== 1 ? 's' : ''} correctamente`)
        await loadSnapshots()
      } else {
        const err = await r.json()
        setSnapshotMsg(`❌ Error: ${err.detail || 'Error desconocido'}`)
      }
    } catch (e) {
      setSnapshotMsg('❌ No se pudo conectar con el servidor')
    } finally {
      setSnapshotLoading(false)
      setTimeout(() => setSnapshotMsg(null), 5000)
    }
  }

  async function generateSnapshot(companyId) {
    try { await fetch(`${API}/api/admin/snapshots/generate/${companyId}`, { method: 'POST', headers: h() }); loadSnapshots() } catch {}
  }

  async function savePrompt() {
    if (!selectedPrompt) return
    setSaving(true)
    try {
      await fetch(`${API}/api/admin/prompts/${selectedPrompt.key}`, { method: 'PUT', headers: h(), body: JSON.stringify({ prompt_key: selectedPrompt.key, new_content: editingPrompt }) })
      setSelectedPrompt(null)
      loadPrompts()
    } catch {} finally { setSaving(false) }
  }

  async function saveMemory(companyId) {
    setSavingMemory(true)
    try { await fetch(`${API}/api/admin/memory/${companyId}`, { method: 'PUT', headers: h(), body: JSON.stringify(memoryEdit) }) } catch {} finally { setSavingMemory(false) }
  }

  async function autoUpdateMemory(companyId) {
    try { await fetch(`${API}/api/admin/memory/${companyId}/auto-update`, { method: 'POST', headers: h() }) } catch {}
  }

  const card = { background: T.card, borderRadius: '16px', border: `0.5px solid ${T.hairline}` }
  const input = { width: '100%', padding: '9px 12px', borderRadius: '9px', border: `1.5px solid ${T.hairline}`, fontSize: '13px', fontFamily: "'Inter', system-ui", outline: 'none', color: T.text, background: T.card }
  const btn = { padding: '9px 18px', borderRadius: '9px', border: 'none', background: NAVY, color: 'white', fontWeight: '700', fontSize: '13px', cursor: 'pointer', fontFamily: "'Inter', system-ui" }

  const filteredCompanies = companies.filter(c =>
    !searchQ || c.name?.toLowerCase().includes(searchQ.toLowerCase()) || c.email?.toLowerCase().includes(searchQ.toLowerCase())
  )
  const filteredSnapshots = snapshots.filter(s =>
    snapshotFilter === 'all' || s.tendencia === snapshotFilter
  )

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: T.bg, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        *{box-sizing:border-box;} input:focus,select:focus,textarea:focus{border-color:${T.blue}!important;outline:none;}
        ::-webkit-scrollbar{width:5px;} ::-webkit-scrollbar-thumb{background:${T.hairline};border-radius:3px;}
        @media (max-width:768px){ .adm-row{grid-template-columns:1fr!important} .adm-3col{grid-template-columns:1fr!important} }
      `}</style>

      <AdminSidebar active={`/admin${tab !== 'overview' ? `?tab=${tab}` : ''}`} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100dvh', overflow: 'hidden' }}>

        {/* CONTENT */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <div style={{ animation: 'fadeUp 0.3s ease' }}>
              {loading ? <div style={{ textAlign: 'center', padding: '60px', color: T.text4 }}>Cargando...</div> : overview && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: '14px', marginBottom: '20px' }}>
                    <StatCard icon={<Ico.building size={20} color={NAVY} />} label="Empresas registradas"  value={overview.total_companies}    color={NAVY}  />
                    <StatCard icon={<Ico.user size={20} color={GREEN} />} label="Usuarios activos"      value={overview.active_users}       color={GREEN} bg={T.greenSoft} />
                    <StatCard icon={<Ico.card size={20} color={BLUE} />} label="Suscripciones activas" value={overview.active_subscriptions} color={BLUE} bg={theme === 'dark' ? T.soft : '#eff6ff'} />
                    <StatCard icon={<Ico.euro size={20} color={GREEN} />} label="MRR estimado"          value={`€${overview.mrr_estimated?.toLocaleString('es-ES')}`} color={GREEN} bg={T.greenSoft} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: '14px', marginBottom: '24px' }}>
                    <StatCard icon={<Ico.flask size={20} color={AMBER} />} label="En trial"       value={overview.trial_subscriptions} color={AMBER} bg={T.amberSoft} />
                    <StatCard icon={<Ico.users size={20} color={NAVY} />} label="Total usuarios" value={overview.total_users}          color={NAVY}  />
                    <StatCard icon={<Ico.trend size={20} color={CYAN} />} label="Total empresas" value={overview.total_companies}      color={CYAN}  bg={theme === 'dark' ? T.soft : '#ecfeff'} />
                  </div>

                  {/* Plans breakdown */}
                  <div style={{ ...card, padding: '20px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: T.text, marginBottom: '16px' }}>Distribución de planes</div>
                    {Object.keys(overview.subscriptions_by_plan || {}).length === 0 ? (
                      <div style={{ color: T.text4, fontSize: '13px', padding: '12px 0' }}>Aún no hay suscripciones activas.</div>
                    ) : (
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {Object.entries(overview.subscriptions_by_plan || {}).map(([plan, count]) => (
                          <div key={plan} style={{ background: T.soft, borderRadius: '10px', padding: '14px 20px', textAlign: 'center', border: `0.5px solid ${T.hairline}`, minWidth: '100px' }}>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: T.text, marginBottom: '4px' }}>{count}</div>
                            <PlanBadge plan={plan} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── AI Insights ── */}
                  <AIInsights token={token} />
                </>
              )}
            </div>
          )}

          {/* ── COMPANIES ── */}
          {tab === 'companies' && (
            <div style={{ animation: 'fadeUp 0.3s ease' }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Buscar empresa..." style={{ ...input, maxWidth: '300px' }} />
                <span style={{ fontSize: '13px', color: T.text3 }}>{filteredCompanies.length} empresa{filteredCompanies.length !== 1 ? 's' : ''}</span>
              </div>

              {selectedCompany && companyDetail ? (
                <div>
                  <button onClick={() => { setSelectedCompany(null); setCompanyDetail(null) }} style={{ ...btn, background: T.soft, color: T.text, border: `0.5px solid ${T.hairline}`, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>← Volver</button>

                  <div className="adm-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ ...card, padding: '20px' }}>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: T.text, marginBottom: '4px' }}>{companyDetail.company?.name}</div>
                      <div style={{ fontSize: '12px', color: T.text3, marginBottom: '16px' }}>{companyDetail.company?.email}</div>
                      {[{label:'Contactos',value:companyDetail.stats?.contacts},{label:'Productos',value:companyDetail.stats?.products},{label:'Proyectos',value:companyDetail.stats?.projects}].map(s=>(
                        <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.hairline}` }}>
                          <span style={{ fontSize: '13px', color: T.text3 }}>{s.label}</span>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: T.text }}>{s.value}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ ...card, padding: '20px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: T.text, marginBottom: '12px' }}>Historial de snapshots</div>
                      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {(companyDetail.snapshots || []).map((s, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${T.hairline}`, fontSize: '12px' }}>
                            <span style={{ color: T.text3 }}>{s.date}</span>
                            <span style={{ fontWeight: '600', color: GREEN }}>€{s.ingresos?.toLocaleString('es-ES')}</span>
                            <StatusBadge status={s.tendencia === 'creciendo' ? 'active' : s.tendencia === 'bajando' ? 'past_due' : 'trialing'} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Memory edit */}
                  <div style={{ ...card, padding: '20px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: T.text, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '7px' }}><Ico.save size={16} />Memoria IA de esta empresa</div>
                    <div className="adm-3col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                      {[{key:'manual_training',label:'Entrenamiento manual'},{key:'business_personality',label:'Personalidad del negocio'},{key:'business_goals',label:'Objetivos'}].map(f=>(
                        <div key={f.key}>
                          <label style={{ fontSize: '11px', fontWeight: '700', color: T.text2, display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</label>
                          <textarea value={memoryEdit[f.key]} onChange={e => setMemoryEdit(p => ({ ...p, [f.key]: e.target.value }))} rows={5} style={{ ...input, resize: 'vertical' }} />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => saveMemory(selectedCompany)} disabled={savingMemory} style={{ ...btn, display: 'flex', alignItems: 'center', gap: '7px' }}><Ico.save size={15} /> {savingMemory ? 'Guardando...' : 'Guardar memoria'}</button>
                      <button onClick={() => autoUpdateMemory(selectedCompany)} style={{ ...btn, background: PURPLE, display: 'flex', alignItems: 'center', gap: '7px' }}><Ico.robot size={15} /> Auto-actualizar con IA</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ ...card, overflow: 'hidden' }}>
                  <div style={{ background: '#0f1729', padding: '12px 18px', borderRadius: '10px 10px 0 0', display: 'grid', gridTemplateColumns: '1.8fr 0.8fr 0.9fr 0.8fr 0.9fr 0.9fr auto', gap: '12px', alignItems: 'center' }}>
                    {['Empresa', 'Plan', 'Vera', 'Estado', 'Ingresos/mes', 'Snapshots', 'Acciones'].map(h => (
                      <div key={h} style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
                    ))}
                  </div>
                  {loading ? <div style={{ padding: '40px', textAlign: 'center', color: T.text4 }}>Cargando empresas...</div>
                  : filteredCompanies.map((c, i) => (
                    <div key={c.id} style={{ padding: '14px 18px', borderBottom: i < filteredCompanies.length - 1 ? `1px solid ${T.hairline}` : 'none', display: 'grid', gridTemplateColumns: '1.8fr 0.8fr 0.9fr 0.8fr 0.9fr 0.9fr auto', gap: '12px', alignItems: 'center', background: i % 2 === 0 ? T.card : T.soft }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: T.text }}>{c.name}</div>
                        <div style={{ fontSize: '11px', color: T.text4 }}>{c.email} · {c.users_count} usuario{c.users_count !== 1 ? 's' : ''}</div>
                      </div>
                      <PlanBadge plan={c.plan} />
                        <button
                          onClick={() => toggleVeraPlan(c.id, c.vera_plan)}
                          title={c.vera_plan === 'plus' ? 'Desactivar Vera Plus' : 'Activar Vera Plus'}
                          style={{
                            padding: '4px 10px', borderRadius: '999px',
                            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                            fontSize: '10px', fontWeight: '700', letterSpacing: '0.04em',
                            background: c.vera_plan === 'plus' ? GOLD : T.soft,
                            color: c.vera_plan === 'plus' ? '#fff' : T.text3,
                            boxShadow: c.vera_plan === 'plus' ? '0 2px 6px rgba(184,134,11,.25)' : 'none',
                            transition: 'all .15s',
                          }}
                        >
                          {c.vera_plan === 'plus' ? '★ PLUS' : 'BASE'}
                        </button>
                      <StatusBadge status={c.plan_status} />
                      <span style={{ fontSize: '13px', fontWeight: '700', color: GREEN }}>€{c.monthly_revenue?.toLocaleString('es-ES') || 0}</span>
                      <span style={{ fontSize: '12px', color: T.text3 }}>{c.snapshot ? `${c.snapshot.date?.substring(0,7)} · ${c.snapshot.tendencia}` : '—'}</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => { setSelectedCompany(c.id); loadCompanyDetail(c.id) }} style={{ padding: '5px 10px', borderRadius: '6px', border: `0.5px solid ${T.hairline}`, background: T.card, color: T.text, fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Ver</button>
                        <button onClick={() => { setPlanModal(c.id); setNewPlan(c.plan || 'pro') }} style={{ padding: '5px 10px', borderRadius: '6px', border: `0.5px solid ${T.hairline}`, background: theme === 'dark' ? T.soft : '#eff6ff', color: BLUE, fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Plan</button>
                        <button onClick={() => generateSnapshot(c.id)} aria-label="Generar snapshot" title="Generar snapshot" style={{ padding: '5px 10px', borderRadius: '6px', border: `0.5px solid ${T.hairline}`, background: theme === 'dark' ? T.soft : '#f5f3ff', color: PURPLE, fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center' }}><Ico.chart size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Plan change modal */}
              {planModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setPlanModal(null)}>
                  <div style={{ background: T.card, borderRadius: '16px', padding: '28px', width: '360px', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: T.text, marginBottom: '16px' }}>Cambiar plan de empresa</div>
                    <select value={newPlan} onChange={e => setNewPlan(e.target.value)} style={{ ...input, marginBottom: '16px' }}>
                      {['starter','pro','business','enterprise','trial'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={updatePlan} disabled={saving} style={{ ...btn, flex: 1 }}>{saving ? 'Guardando...' : 'Confirmar cambio'}</button>
                      <button onClick={() => setPlanModal(null)} style={{ ...btn, background: T.soft, color: T.text, border: `0.5px solid ${T.hairline}` }}>Cancelar</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── USERS ── */}
          {tab === 'users' && (
            <div style={{ animation: 'fadeUp 0.3s ease' }}>
              <ImpersonatePanel T={T} />
              <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Buscar usuario..." style={{ ...input, maxWidth: '300px' }} />
                <span style={{ fontSize: '13px', color: T.text3 }}>{users.length} usuarios</span>
              </div>
              <div style={{ ...card, overflow: 'hidden' }}>
                <div style={{ background: '#0f1729', padding: '12px 18px', borderRadius: '10px 10px 0 0', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '12px' }}>
                  {['Usuario', 'Empresa', 'Rol', 'Estado', 'Acciones'].map(h => (
                    <div key={h} style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
                  ))}
                </div>
                {loading ? <div style={{ padding: '40px', textAlign: 'center', color: T.text4 }}>Cargando usuarios...</div>
                : users.filter(u => !searchQ || u.email?.includes(searchQ) || u.full_name?.includes(searchQ)).map((u, i) => (
                  <div key={u.id} style={{ padding: '12px 18px', borderBottom: `1px solid ${T.hairline}`, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'center', background: i % 2 === 0 ? T.card : T.soft }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: T.text }}>{u.full_name || u.email}</div>
                      <div style={{ fontSize: '11px', color: T.text4 }}>{u.email}</div>
                    </div>
                    <span style={{ fontSize: '12px', color: T.text3 }}>ID: {u.company_id || '—'}</span>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: u.is_admin ? PURPLE : BLUE, background: u.is_admin ? (theme === 'dark' ? T.purpleSoft : '#f5f3ff') : (theme === 'dark' ? T.soft : '#eff6ff'), padding: '2px 8px', borderRadius: '6px' }}>{u.is_admin ? 'Admin' : 'Usuario'}</span>
                    <StatusBadge status={u.is_active ? 'active' : 'canceled'} />
                    <button onClick={() => toggleUser(u.id, !u.is_active)} style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid', borderColor: u.is_active ? T.redSoft : T.greenSoft, background: u.is_active ? T.redSoft : T.greenSoft, color: u.is_active ? RED : GREEN, fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                      {u.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SNAPSHOTS ── */}
          {tab === 'snapshots' && (
            <div style={{ animation: 'fadeUp 0.3s ease' }}>

              {/* ── Toolbar ── */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: T.text, display: 'flex', alignItems: 'center', gap: '8px' }}><Ico.chart size={18} />Base de datos — Business Snapshots</div>
                  <span style={{ fontSize: '12px', color: T.text3, background: T.soft, padding: '3px 10px', borderRadius: '20px' }}>{snapshots.length} registros</span>
                </div>
                <button onClick={() => {
                  if (!snapshots.length) return
                  const cols = ['id','company_id','date','sector','empresa_size','num_empleados','ingresos_mes','gastos_mes','resultado_neto','margen_neto_pct','crecimiento_pct','num_ventas','ticket_medio','total_contactos','sentiment_avg','clientes_riesgo','proyectos_activos','health_score_avg','ai_health_score','label_tendencia','label_salud_financiera','label_riesgo_negocio']
                  const rows = snapshots.map(s => cols.map(c => {
                    const v = s[c] ?? ''
                    return typeof v === 'string' && v.includes(',') ? `"${v}"` : v
                  }).join(','))
                  const csv = [cols.join(','), ...rows].join('\n')
                  const blob = new Blob([csv], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a'); a.href = url; a.download = `vela_snapshots_${new Date().toISOString().substring(0,10)}.csv`; a.click()
                  URL.revokeObjectURL(url)
                }} aria-label="Exportar snapshots a CSV" style={{ ...btn, background: T.greenSoft, color: GREEN, border: `1px solid ${T.greenSoft}`, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <Ico.download size={14} /> Exportar CSV
                </button>
              </div>

              {/* ── Tabla completa scrollable ── */}
              <div style={{ ...card, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  {/* Header */}
                  <div style={{ background: '#0f1729', padding: '10px 16px', borderRadius: '10px 10px 0 0', display: 'grid', gridTemplateColumns: '50px 70px 80px 90px 80px 70px 100px 100px 100px 75px 75px 70px 75px 75px 80px 70px 75px 75px 80px 110px 110px 100px', gap: '8px', alignItems: 'center', minWidth: '1700px' }}>
                    {['ID','Empresa','Fecha','Sector','Tamaño','Emp.','Ingresos','Gastos','Resultado','Margen%','Crecim%','Ventas','Ticket €','Clientes','Sentiment','Cli.Riesgo','Proyectos','Health','AI Score','Tendencia','Salud Fin.','Riesgo'].map(h=>(
                      <div key={h} style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</div>
                    ))}
                  </div>

                  {/* Rows */}
                  {loading
                    ? <div style={{ padding: '40px', textAlign: 'center', color: T.text4 }}>Cargando base de datos...</div>
                    : snapshots.length === 0
                    ? (
                      <div style={{ padding: '60px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', opacity: 0.4, color: T.text3 }}><Ico.chart size={40} /></div>
                        <div style={{ fontSize: '14px', color: T.text4 }}>La base de datos está vacía — aún no hay registros.</div>
                        <div style={{ fontSize: '12px', color: T.text4, marginTop: '8px' }}>Los registros se crearán automáticamente cuando las empresas usen la plataforma.</div>
                      </div>
                    )
                    : snapshots.map((s, i) => {
                        const tendColor = s.tendencia === 'creciendo' ? GREEN : s.tendencia === 'bajando' ? RED : AMBER
                        const saludColor = s.salud_financiera === 'saludable' ? GREEN : s.salud_financiera === 'crisis' ? RED : AMBER
                        const riesgoColor = s.riesgo_negocio === 'bajo' ? GREEN : s.riesgo_negocio === 'alto' || s.riesgo_negocio === 'critico' ? RED : AMBER
                        const badge = (val, color) => (
                          <span style={{ fontSize: '10px', fontWeight: '700', color: color || '#6b7280', background: (color||'#6b7280')+'18', padding: '2px 7px', borderRadius: '20px' }}>{val || '—'}</span>
                        )
                        return (
                          <div key={s.id} style={{ padding: '8px 16px', borderBottom: i < snapshots.length - 1 ? `1px solid ${T.hairline}` : 'none', display: 'grid', gridTemplateColumns: '50px 70px 80px 90px 80px 70px 100px 100px 100px 75px 75px 70px 75px 75px 80px 70px 75px 75px 80px 110px 110px 100px', gap: '8px', alignItems: 'center', background: i % 2 === 0 ? T.card : T.soft, fontSize: '11px', minWidth: '1700px' }}>
                            <span style={{ color: T.text4, fontSize: '10px' }}>#{s.id}</span>
                            <span style={{ fontWeight: '700', color: T.text }}>#{s.company_id}</span>
                            <span style={{ color: T.text3 }}>{s.date?.substring(0,7) || '—'}</span>
                            <span style={{ color: T.text2 }}>{s.sector || '—'}</span>
                            <span style={{ color: T.text2 }}>{s.empresa_size || '—'}</span>
                            <span style={{ color: T.text2 }}>{s.num_empleados ?? 0}</span>
                            <span style={{ fontWeight: '700', color: GREEN }}>€{(s.ingresos_mes||0).toLocaleString('es-ES')}</span>
                            <span style={{ color: T.text2 }}>€{(s.gastos_mes||0).toLocaleString('es-ES')}</span>
                            <span style={{ fontWeight: '700', color: (s.resultado_neto||0) >= 0 ? GREEN : RED }}>€{(s.resultado_neto||0).toLocaleString('es-ES')}</span>
                            <span style={{ color: T.text2 }}>{(s.margen_neto_pct||0).toFixed(1)}%</span>
                            <span style={{ color: (s.crecimiento_pct||0) >= 0 ? GREEN : RED, fontWeight: '600' }}>{(s.crecimiento_pct||0).toFixed(1)}%</span>
                            <span style={{ color: T.text2 }}>{s.num_ventas||0}</span>
                            <span style={{ color: T.text2 }}>€{(s.ticket_medio||0).toFixed(0)}</span>
                            <span style={{ color: T.text2 }}>{s.total_contactos||0}</span>
                            <span style={{ color: (s.sentiment_avg||5) >= 7 ? GREEN : (s.sentiment_avg||5) >= 5 ? AMBER : RED, fontWeight: '600' }}>{(s.sentiment_avg||0).toFixed(1)}</span>
                            <span style={{ color: T.text2 }}>{s.clientes_riesgo||0}</span>
                            <span style={{ color: T.text2 }}>{s.proyectos_activos||0}</span>
                            <span style={{ color: (s.health_score_avg||0) >= 7 ? GREEN : (s.health_score_avg||0) >= 5 ? AMBER : RED, fontWeight: '600' }}>{(s.health_score_avg||0).toFixed(1)}</span>
                            <span style={{ color: (s.ai_health_score||0) >= 7 ? GREEN : (s.ai_health_score||0) >= 5 ? AMBER : RED, fontWeight: '600' }}>{s.ai_health_score ? s.ai_health_score.toFixed(1) : '—'}</span>
                            {badge(s.tendencia, tendColor)}
                            {badge(s.salud_financiera, saludColor)}
                            {badge(s.riesgo_negocio, riesgoColor)}
                          </div>
                        )
                      })
                  }
                </div>

                {/* Footer */}
                <div style={{ padding: '10px 16px', background: T.soft, borderTop: `1px solid ${T.hairline}`, fontSize: '11px', color: T.text3, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{snapshots.length} registros en la base de datos</span>
                  <span>Actualizado: {new Date().toLocaleTimeString('es-ES')}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── PROMPTS ── */}
          {tab === 'prompts' && (
            <div style={{ animation: 'fadeUp 0.3s ease' }}>
              {selectedPrompt ? (
                <div>
                  <button onClick={() => setSelectedPrompt(null)} style={{ ...btn, background: T.soft, color: T.text, border: `0.5px solid ${T.hairline}`, marginBottom: '16px', fontSize: '13px' }}>← Volver</button>
                  <div style={{ ...card, padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: T.text, marginBottom: '4px' }}>{selectedPrompt.name}</div>
                        <div style={{ fontSize: '12px', color: T.text3, marginBottom: '8px' }}>{selectedPrompt.description}</div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: PURPLE, background: theme === 'dark' ? T.purpleSoft : '#f5f3ff', padding: '2px 8px', borderRadius: '6px' }}>{selectedPrompt.module}</span>
                          {parseVars(selectedPrompt.variables).map(v => (
                            <span key={v} style={{ fontSize: '11px', color: T.text3, background: T.soft, padding: '2px 8px', borderRadius: '6px' }}>{`{${v}}`}</span>
                          ))}
                        </div>
                      </div>
                      {selectedPrompt.last_modified && <span style={{ fontSize: '11px', color: T.text4 }}>Modificado: {selectedPrompt.last_modified?.substring(0,10)}</span>}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: T.text2, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Contenido del prompt</div>
                    <textarea value={editingPrompt} onChange={e => setEditingPrompt(e.target.value)} rows={14} style={{ ...input, fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.6', resize: 'vertical', background: '#0f172a', color: '#e2e8f0', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }} />
                    <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                      <button onClick={savePrompt} disabled={saving} style={{ ...btn, display: 'flex', alignItems: 'center', gap: '7px' }}><Ico.save size={15} /> {saving ? 'Guardando...' : 'Guardar prompt'}</button>
                      <button onClick={() => setEditingPrompt(selectedPrompt.content)} style={{ ...btn, background: T.soft, color: T.text, border: `0.5px solid ${T.hairline}`, display: 'flex', alignItems: 'center', gap: '7px' }}><Ico.refresh size={15} /> Restaurar original</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                  {loading ? <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: T.text4 }}>Cargando prompts...</div>
                  : prompts.map(p => (
                    <div key={p.key} style={{ ...card, padding: '20px', cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.07)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                      onClick={() => { setSelectedPrompt(p); setEditingPrompt(p.content) }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: PURPLE, background: theme === 'dark' ? T.purpleSoft : '#f5f3ff', padding: '2px 8px', borderRadius: '6px' }}>{p.module}</span>
                        {p.last_modified && <span style={{ fontSize: '10px', color: AMBER, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Ico.edit size={11} /> Modificado</span>}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: T.text, marginBottom: '4px' }}>{p.name}</div>
                      <div style={{ fontSize: '12px', color: T.text3, marginBottom: '12px', lineHeight: '1.5' }}>{p.description}</div>
                      <div style={{ background: '#0f172a', borderRadius: '8px', padding: '10px 12px', fontSize: '11px', fontFamily: 'monospace', color: '#94a3b8', overflow: 'hidden', maxHeight: '60px', lineHeight: '1.5' }}>
                        {p.content?.substring(0, 120)}...
                      </div>
                      <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {parseVars(p.variables).map(v => <span key={v} style={{ fontSize: '10px', color: T.text3, background: T.soft, padding: '1px 6px', borderRadius: '4px' }}>{`{${v}}`}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── MEMORY ── */}
                   {tab === 'memory' && (
            <MemoryTab
              companies={companies}
              selectedCompany={selectedCompany}
              setSelectedCompany={setSelectedCompany}
              token={token}
              API={API}
            />
          )}

          {/* ── SECURITY ── */}
          {tab === 'security' && (
            <SecurityTab threats={threats} loading={loading} onRefresh={loadThreats} />
          )}

          {/* ── BILLING ── */}
          {tab === 'billing' && (
            <BillingTab token={token} API={API} />
          )}

          {/* ── PROSPECTOR ── */}
          {tab === 'profit' && (
            <ProfitOptimizerTab token={token} API={API} />
          )}
          {tab === 'prospector' && (
            <ProspectorTab token={token} API={API} />
          )}

          {/* ── FLOWCHART ── */}
          {tab === 'vera-routing' && (
            <VeraStudio token={typeof window !== 'undefined' ? localStorage.getItem('vela_token') : null} />
            )}
            {tab === 'vera-network' && (
              <VeraNetwork token={typeof window !== 'undefined' ? localStorage.getItem('vela_token') : null} />
          )}
          {tab === 'flowchart' && (
            <div style={{ animation: 'fadeUp 0.3s ease' }}>
              <DataFlowchart />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: '14px', marginTop: '20px' }}>
                {[
                  { title: 'Módulos de captura', icon: <Ico.inbox size={22} />, desc: 'Ventas, Clientes, Proyectos, RRHH, Contabilidad capturan datos en tiempo real de cada empresa.', color: BLUE },
                  { title: 'Business Snapshot', icon: <Ico.chart size={22} />, desc: 'Cada día/semana/mes se agrega toda la información en una fila del snapshot con KPIs, ratios y labels para ML.', color: CYAN },
                  { title: 'Claude AI + Memoria', icon: <Ico.brain size={22} />, desc: 'Claude analiza los snapshots, extrae patrones y los guarda en la memoria de IA de cada empresa. El usuario puede entrenarla manualmente.', color: PURPLE },
                ].map(c => (
                  <div key={c.title} style={{ ...card, padding: '20px', borderTop: `3px solid ${c.color}` }}>
                    <div style={{ marginBottom: '8px', color: c.color }}>{c.icon}</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: T.text, marginBottom: '6px' }}>{c.title}</div>
                    <div style={{ fontSize: '13px', color: T.text3, lineHeight: '1.6' }}>{c.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}