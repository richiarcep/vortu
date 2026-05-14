'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const API   = 'http://127.0.0.1:8000'
const NAVY  = '#0B1426'
const GREEN = '#16a34a'
const AMBER = '#d97706'
const RED   = '#dc2626'
const BLUE  = '#2563eb'
const CYAN  = '#00B4D8'
const PURPLE = '#7c3aed'

// ── Admin Sidebar ──────────────────────────────────────────────────────────────
function AdminSidebar({ active }) {
  const router = useRouter()
  const links = [
    { label: 'Overview',      href: '/admin',                icon: '◈' },
    { label: 'Empresas',      href: '/admin?tab=companies',  icon: '🏢' },
    { label: 'Usuarios',      href: '/admin?tab=users',      icon: '👤' },
    { label: 'Snapshots',     href: '/admin?tab=snapshots',  icon: '📊' },
    { label: 'Prompts IA',    href: '/admin?tab=prompts',    icon: '🧠' },
    { label: 'Memoria IA',    href: '/admin?tab=memory',     icon: '💾' },
    { label: 'Flujo datos',   href: '/admin?tab=flowchart',  icon: '🔀' },
    { label: 'Prospector',    href: '/admin?tab=prospector', icon: '🎯' },
    { label: 'Billing',       href: '/admin?tab=billing',    icon: '💳' },
  ]
  return (
    <div style={{ width: '220px', background: '#060d1a', minHeight: '100vh', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '24px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div style={{ width: '32px', height: '32px', background: `linear-gradient(135deg, ${CYAN}, ${BLUE})`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><path d="M4 16V4L16 16V4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: '800', fontSize: '15px', letterSpacing: '-0.4px', lineHeight: 1 }}>Nexum</div>
            <div style={{ color: CYAN, fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '1px' }}>Backoffice</div>
          </div>
        </div>
      </div>
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 20px 12px' }} />
      <nav style={{ flex: 1, padding: '4px 0' }}>
        {links.map(item => {
          const isActive = active === item.href
          return (
            <a key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 20px', color: isActive ? 'white' : 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '13px', fontWeight: isActive ? '600' : '400', background: isActive ? 'rgba(0,180,216,0.12)' : 'transparent', borderLeft: isActive ? `2px solid ${CYAN}` : '2px solid transparent', transition: 'all 0.15s' }}>
              <span style={{ fontSize: '13px', opacity: isActive ? 1 : 0.55 }}>{item.icon}</span>{item.label}
            </a>
          )
        })}
      </nav>
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>← Volver a Vortu</a>
      </div>
    </div>
  )
}

// ── Stat Card ──────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = NAVY, bg = 'white' }) {
  return (
    <div style={{ background: bg, borderRadius: '14px', border: '1px solid #e5e9f0', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <span style={{ fontSize: '20px' }}>{icon}</span>
        {sub && <span style={{ fontSize: '11px', color: '#9ca3af' }}>{sub}</span>}
      </div>
      <div style={{ fontSize: '28px', fontWeight: '800', color, letterSpacing: '-0.8px', marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>{label}</div>
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
  const nodes = [
    { id: 'user',    x: 380, y: 30,  label: 'Usuario / Empresa',   icon: '👤', color: NAVY,   w: 160 },
    { id: 'sales',   x: 60,  y: 160, label: 'Ventas & Productos',  icon: '🛒', color: BLUE,   w: 150 },
    { id: 'clients', x: 240, y: 160, label: 'Clientes & Mensajes', icon: '💬', color: GREEN,  w: 150 },
    { id: 'projects',x: 420, y: 160, label: 'Proyectos & Tareas',  icon: '📋', color: AMBER,  w: 150 },
    { id: 'hr',      x: 600, y: 160, label: 'RR.HH. & Nóminas',   icon: '👥', color: PURPLE, w: 150 },
    { id: 'acc',     x: 780, y: 160, label: 'Contabilidad',        icon: '📒', color: '#dc2626', w: 150 },
    { id: 'snapshot',x: 380, y: 310, label: 'Business Snapshot',   icon: '📊', color: CYAN,   w: 160 },
    { id: 'claude',  x: 380, y: 440, label: 'Claude AI',           icon: '🤖', color: '#7c3aed', w: 160 },
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
    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e9f0', padding: '24px', overflow: 'auto' }}>
      <div style={{ fontSize: '15px', fontWeight: '700', color: NAVY, marginBottom: '20px' }}>🔀 Flujo de datos — Vortu</div>
      <svg width="980" height="540" style={{ display: 'block', minWidth: '980px' }}>
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="8" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#cbd5e1" />
          </marker>
        </defs>
        {/* Edges */}
        {edges.map(([from, to], i) => {
          const a = getCenter(from), b = getCenter(to)
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4,3" markerEnd="url(#arrow)" />
        })}
        {/* Nodes */}
        {nodes.map(n => (
          <g key={n.id}>
            <rect x={n.x} y={n.y} width={n.w} height={56} rx="10" fill={n.color} opacity="0.1" stroke={n.color} strokeWidth="1.5" />
            <text x={n.x + 14} y={n.y + 22} fontSize="16">{n.icon}</text>
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
            <span style={{ fontSize: '11px', color: '#6b7280' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
function MemoryTab({ companies, selectedCompany, setSelectedCompany, token, API }) {
  const [entries, setEntries] = useState([])
  const [memEdit, setMemEdit] = useState({ manual_training: '', business_personality: '', business_goals: '' })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [autoLoading, setAutoLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const [activeTab, setActiveTab] = useState('auto')
  const [stats, setStats] = useState({ total: 0, auto_count: 0, manual_count: 0, last_auto_update: null, context_version: 0 })

  const NAVY = '#0B1426', GREEN = '#16a34a', AMBER = '#d97706', RED = '#dc2626', BLUE = '#2563eb', PURPLE = '#7c3aed', CYAN = '#00B4D8'
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
      <div style={{ ...{background:'white',borderRadius:'14px',border:'1px solid #e5e9f0',padding:'20px',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}, marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: NAVY, marginBottom: '10px' }}>Selecciona empresa</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {companies.length === 0 && <div style={{ color: '#9ca3af', fontSize: '13px' }}>Carga las empresas primero en la pestaña Empresas</div>}
          {companies.map(c => (
            <button key={c.id} onClick={() => selectCompany(c.id)} style={{ padding: '8px 16px', borderRadius: '8px', border: `1.5px solid ${selectedCompany === c.id ? NAVY : '#e5e9f0'}`, background: selectedCompany === c.id ? NAVY : 'white', color: selectedCompany === c.id ? 'white' : NAVY, fontWeight: '600', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
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
              <div style={{ fontSize: '15px', fontWeight: '800', color: NAVY }}>💾 Memoria IA — {selectedCompanyName}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                v{stats.context_version} · {stats.auto_count} aprendizajes auto · {stats.manual_count} entradas manuales
                {stats.last_auto_update && ` · Último auto: ${stats.last_auto_update.substring(0,10)}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {msg && <span style={{ fontSize: '12px', fontWeight: '600', color: msg.type === 'ok' ? GREEN : RED, background: msg.type === 'ok' ? '#f0fdf4' : '#fef2f2', padding: '5px 12px', borderRadius: '8px', border: `1px solid ${msg.type === 'ok' ? '#bbf7d0' : '#fecaca'}` }}>{msg.text}</span>}
              <button onClick={downloadTxt} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #bbf7d0', background: '#f0fdf4', color: GREEN, fontWeight: '700', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>⬇ Descargar TXT</button>
              <button onClick={runAutoUpdate} disabled={autoLoading} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: autoLoading ? '#e5e9f0' : PURPLE, color: autoLoading ? '#9ca3af' : 'white', fontWeight: '700', fontSize: '12px', cursor: autoLoading ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                {autoLoading ? '⟳ Analizando...' : '🤖 Auto-actualizar IA'}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '14px', background: '#f1f5f9', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
            {[{ id: 'auto', label: `🤖 Aprendizajes IA (${stats.auto_count})` }, { id: 'manual', label: '✏️ Entrenamiento manual' }].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: '7px 16px', borderRadius: '7px', border: 'none', background: activeTab === t.id ? 'white' : 'transparent', color: activeTab === t.id ? NAVY : '#6b7280', fontWeight: activeTab === t.id ? '700' : '400', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', boxShadow: activeTab === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* AUTO TAB */}
          {activeTab === 'auto' && (
            <div>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Cargando memoria...</div>
              ) : autoEntries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af', background: 'white', borderRadius: '14px', border: '1px solid #e5e9f0' }}>
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>🤖</div>
                  <div style={{ fontSize: '14px', marginBottom: '6px' }}>Sin aprendizajes todavía</div>
                  <div style={{ fontSize: '12px' }}>Pulsa "Auto-actualizar IA" para que Claude analice los datos y detecte patrones.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {autoEntries.map((e, i) => (
                    <div key={e.id} style={{ background: 'white', borderRadius: '10px', border: '1px solid #e5e9f0', padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ flexShrink: 0, width: '6px', height: '6px', borderRadius: '50%', background: catColor(e.categoria), marginTop: '6px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '10px', fontWeight: '700', color: catColor(e.categoria), background: catColor(e.categoria)+'15', padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase' }}>{e.categoria}</span>
                          <span style={{ fontSize: '10px', color: '#9ca3af' }}>confianza: {Math.round((e.confianza || 0) * 100)}%</span>
                          <span style={{ fontSize: '10px', color: '#9ca3af' }}>{e.created_at?.substring(0, 16).replace('T', ' ')}</span>
                          {e.snapshot_id && <span style={{ fontSize: '10px', color: '#9ca3af' }}>snapshot #{e.snapshot_id}</span>}
                        </div>
                        <div style={{ fontSize: '13px', color: '#1e293b', lineHeight: '1.6' }}>{e.contenido}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MANUAL TAB */}
          {activeTab === 'manual' && (
            <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e5e9f0', padding: '24px' }}>
              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px', lineHeight: '1.6' }}>
                Escribe aquí lo que quieres que la IA sepa sobre este negocio. Esto se combina con los aprendizajes automáticos en cada consulta.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                {[
                  { key: 'manual_training', label: 'Contexto del negocio', placeholder: 'Somos una panadería artesanal familiar. No hacemos descuentos en productos frescos. Nuestros clientes valoran la calidad sobre el precio...' },
                  { key: 'business_personality', label: 'Personalidad y valores', placeholder: 'Tono cercano y profesional. Nos diferenciamos por la calidad artesanal. Público objetivo: familias 30-50 años...' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</label>
                    <textarea value={memEdit[f.key]} onChange={e => setMemEdit(p => ({ ...p, [f.key]: e.target.value }))} rows={8} placeholder={f.placeholder} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e5e9f0', fontSize: '13px', fontFamily: 'inherit', lineHeight: '1.6', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Objetivos del negocio</label>
                <textarea value={memEdit.business_goals} onChange={e => setMemEdit(p => ({ ...p, business_goals: e.target.value }))} rows={4} placeholder="Queremos abrir una segunda tienda en 2027. Objetivo: llegar a €20k/mes de facturación. Foco actual: fidelizar clientes existentes..." style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e5e9f0', fontSize: '13px', fontFamily: 'inherit', lineHeight: '1.6', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Manual entries history */}
              {manualEntries.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>Historial de entradas manuales</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                    {manualEntries.map(e => (
                      <div key={e.id} style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px', border: '1px solid #e5e9f0', fontSize: '11px' }}>
                        <div style={{ color: '#9ca3af', marginBottom: '3px' }}>{e.created_at?.substring(0,16).replace('T',' ')} · {e.autor}</div>
                        <div style={{ color: '#374151', lineHeight: '1.5' }}>{e.contenido?.substring(0, 150)}{e.contenido?.length > 150 ? '...' : ''}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={saveManual} disabled={saving} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: saving ? '#e5e9f0' : NAVY, color: saving ? '#9ca3af' : 'white', fontWeight: '700', fontSize: '13px', cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                {saving ? 'Guardando...' : '💾 Guardar entrenamiento manual'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BillingTab({ token, API }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [msg, setMsg] = useState(null)

  const NAVY = '#0B1426', GREEN = '#16a34a', AMBER = '#d97706', RED = '#dc2626', BLUE = '#2563eb', PURPLE = '#7c3aed'
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

  if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>Cargando billing...</div>
  if (!data) return null

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'MRR estimado', value: `€${data.total_mrr?.toLocaleString('es-ES')}`, color: GREEN, bg: '#f0fdf4' },
          { label: 'En Beta', value: data.by_fase?.beta || 0, color: PURPLE, bg: '#f5f3ff' },
          { label: 'Early Adopters', value: data.by_fase?.early_adopter || 0, color: AMBER, bg: '#fffbeb' },
          { label: 'Pagando', value: data.by_fase?.paid || 0, color: GREEN, bg: '#f0fdf4' },
          { label: 'Total empresas', value: data.total || 0, color: NAVY, bg: 'white' },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, borderRadius: '12px', padding: '14px 16px', border: '1px solid #e5e9f0' }}>
            <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{k.label}</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {msg && (
        <div style={{ marginBottom: '12px', fontSize: '12px', fontWeight: '600', color: msg.type === 'ok' ? GREEN : RED, background: msg.type === 'ok' ? '#f0fdf4' : '#fef2f2', padding: '8px 14px', borderRadius: '8px', border: `1px solid ${msg.type === 'ok' ? '#bbf7d0' : '#fecaca'}` }}>
          {msg.text}
        </div>
      )}

      {/* Companies table */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e5e9f0', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: NAVY, padding: '10px 16px', display: 'grid', gridTemplateColumns: '2fr 100px 120px 140px 1fr 1fr 180px', gap: '12px', alignItems: 'center' }}>
          {['Empresa', 'Plan', 'Fase', 'Vence', 'Uso IA', 'Docs', 'Cambiar fase'].map(h => (
            <div key={h} style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        {(data.companies || []).map((c, i) => (
          <div key={c.company_id} style={{ padding: '12px 16px', borderBottom: i < data.companies.length - 1 ? '1px solid #f0f2f7' : 'none', display: 'grid', gridTemplateColumns: '2fr 100px 120px 140px 1fr 1fr 180px', gap: '12px', alignItems: 'center', background: i % 2 === 0 ? 'white' : '#fafbfc' }}>

            {/* Empresa */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: NAVY }}>{c.company_name}</div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>{c.company_email} · {c.users_count} usuario{c.users_count !== 1 ? 's' : ''}</div>
            </div>

            {/* Plan */}
            <div style={{ fontSize: '12px', fontWeight: '700', color: BLUE, background: '#eff6ff', padding: '3px 10px', borderRadius: '20px', textAlign: 'center', textTransform: 'capitalize' }}>{c.plan}</div>

            {/* Fase */}
            <div style={{ fontSize: '11px', fontWeight: '700', color: faseColor(c.fase), background: faseBg(c.fase), padding: '3px 10px', borderRadius: '20px', textAlign: 'center' }}>{faseLabel(c.fase)}</div>

            {/* Vence */}
            <div style={{ fontSize: '11px', color: '#6b7280' }}>
              {c.fase_expiry ? (
                <span style={{ color: new Date(c.fase_expiry) < new Date() ? RED : '#374151' }}>
                  {new Date(c.fase_expiry).toLocaleDateString('es-ES')}
                </span>
              ) : c.fase === 'beta' ? '∞ Sin límite' : '—'}
            </div>

            {/* Uso IA */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#374151', marginBottom: '3px' }}>
                <span>{c.ai_queries_used}/{c.ai_queries_limit === 999999 ? '∞' : c.ai_queries_limit}</span>
                <span style={{ color: c.ai_pct >= 80 ? RED : c.ai_pct >= 60 ? AMBER : GREEN }}>{c.ai_pct}%</span>
              </div>
              <div style={{ height: '4px', background: '#e5e9f0', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '4px', width: `${Math.min(c.ai_pct, 100)}%`, background: c.ai_pct >= 80 ? RED : c.ai_pct >= 60 ? AMBER : GREEN, borderRadius: '2px', transition: 'width 0.5s' }} />
              </div>
            </div>

            {/* Docs */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#374151', marginBottom: '3px' }}>
                <span>{c.documents_used}/{c.documents_limit === 999999 ? '∞' : c.documents_limit}</span>
                <span style={{ color: c.doc_pct >= 80 ? RED : c.doc_pct >= 60 ? AMBER : GREEN }}>{c.doc_pct}%</span>
              </div>
              <div style={{ height: '4px', background: '#e5e9f0', borderRadius: '2px', overflow: 'hidden' }}>
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
          <div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>💳</div>
            <div>Sin empresas todavía</div>
          </div>
        )}
      </div>
    </div>
  )
}

function ProspectorTab({ token, API }) {
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

  const NAVY = '#0B1426', GREEN = '#16a34a', AMBER = '#d97706', RED = '#dc2626', BLUE = '#2563eb', PURPLE = '#7c3aed', CYAN = '#00B4D8'
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Búsquedas', value: stats.total_searches, color: NAVY },
            { label: 'Leads totales', value: stats.total_leads, color: PURPLE },
            { label: 'Aprobados', value: stats.leads_aprobados, color: GREEN },
            { label: 'Enviados', value: stats.leads_enviados, color: BLUE },
            { label: 'Score medio', value: `${stats.avg_score}/10`, color: AMBER },
          ].map(k => (
            <div key={k.label} style={{ background: 'white', borderRadius: '12px', padding: '14px 16px', border: '1px solid #e5e9f0' }}>
              <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{k.label}</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '16px' }}>

        {/* Left panel — Search + History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Search form */}
          <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e5e9f0', padding: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: '800', color: NAVY, marginBottom: '14px' }}>🎯 Nueva búsqueda</div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Qué buscar</label>
              <input value={prompt} onChange={e => setPrompt(e.target.value)} placeholder='Ej: "restaurantes", "peluquerías", "gimnasios"' style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e5e9f0', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} onKeyDown={e => e.key === 'Enter' && startSearch()} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ciudad</label>
                <input value={location} onChange={e => setLocation(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e5e9f0', fontSize: '12px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Max leads</label>
                <select value={maxResults} onChange={e => setMaxResults(Number(e.target.value))} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e5e9f0', fontSize: '12px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}>
                  <option value={20}>20 leads</option>
                  <option value={50}>50 leads</option>
                  <option value={100}>100 leads</option>
                  <option value={200}>200 leads</option>
                  <option value={500}>500 leads</option>
                </select>
              </div>
            </div>

            <button onClick={startSearch} disabled={searching || !prompt.trim()} style={{ width: '100%', padding: '11px', borderRadius: '9px', border: 'none', background: searching ? '#e5e9f0' : NAVY, color: searching ? '#9ca3af' : 'white', fontWeight: '700', fontSize: '13px', cursor: searching ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {searching ? '⟳ Buscando...' : '🚀 Iniciar búsqueda'}
            </button>

            {msg && (
              <div style={{ marginTop: '10px', fontSize: '12px', fontWeight: '600', color: msg.type === 'ok' ? GREEN : RED, background: msg.type === 'ok' ? '#f0fdf4' : '#fef2f2', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${msg.type === 'ok' ? '#bbf7d0' : '#fecaca'}` }}>
                {msg.text}
              </div>
            )}
          </div>

          {/* Search history */}
          <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e5e9f0', padding: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: NAVY, marginBottom: '10px' }}>Historial de búsquedas</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '400px', overflowY: 'auto' }}>
              {searches.length === 0 && <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', padding: '20px' }}>Sin búsquedas todavía</div>}
              {searches.map(s => (
                <div key={s.id} onClick={() => s.status === 'done' && loadLeads(s.id)} style={{ padding: '10px 12px', borderRadius: '8px', border: `1.5px solid ${selectedSearch === s.id ? NAVY : '#e5e9f0'}`, background: selectedSearch === s.id ? '#f8faff' : 'white', cursor: s.status === 'done' ? 'pointer' : 'default', transition: 'all 0.15s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: NAVY }}>"{s.prompt}"</span>
                    <span style={{ fontSize: '10px', fontWeight: '700', color: s.status === 'done' ? GREEN : s.status === 'error' ? RED : AMBER, background: s.status === 'done' ? '#f0fdf4' : s.status === 'error' ? '#fef2f2' : '#fffbeb', padding: '1px 7px', borderRadius: '10px' }}>{s.status}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>{s.location} · {s.total_leads} leads · {s.leads_contactar} para contactar</div>
                  <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>{s.created_at?.substring(0,16).replace('T',' ')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel — Leads */}
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e5e9f0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {!selectedSearch ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', padding: '60px', color: '#9ca3af' }}>
              <div style={{ fontSize: '40px', opacity: 0.2 }}>🎯</div>
              <div style={{ fontSize: '14px' }}>Selecciona una búsqueda del historial para ver los leads</div>
            </div>
          ) : (
            <>
              {/* Leads toolbar */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e9f0', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: NAVY }}>Leads #{selectedSearch}</span>
                <button onClick={() => setShowMap(m => !m)} style={{ padding: '5px 12px', borderRadius: '7px', border: '1px solid #e5e9f0', background: showMap ? NAVY : 'white', color: showMap ? 'white' : '#374151', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                  🗺️ {showMap ? 'Ocultar mapa' : 'Ver mapa'}
                </button>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {['all','pendiente','aprobado','enviado','descartado'].map(f => (
                    <button key={f} onClick={() => setFilterEstado(f)} style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: filterEstado === f ? NAVY : '#f1f5f9', color: filterEstado === f ? 'white' : '#6b7280', fontSize: '11px', fontWeight: filterEstado === f ? '700' : '400', cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>
                      {f === 'all' ? 'Todos' : f}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>Score min:</span>
                  <select value={minScore} onChange={e => { setMinScore(Number(e.target.value)); loadLeads(selectedSearch) }} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e5e9f0', fontSize: '11px', fontFamily: 'inherit' }}>
                    {[0,5,6,7,8,9].map(s => <option key={s} value={s}>{s}+</option>)}
                  </select>
                </div>
              </div>

              {/* Map */}
              {showMap && (() => {
                const leadsWithCoords = filteredLeads.filter(l => l.lat && l.lng)
                if (leadsWithCoords.length === 0) return (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '12px', background: '#f8fafc', borderBottom: '1px solid #e5e9f0' }}>
                    Ningún lead tiene coordenadas disponibles
                  </div>
                )
                return (
                  <div style={{ borderBottom: '1px solid #e5e9f0' }}>
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
                          const colors = {'pendiente':'#6b7280','aprobado':'#16a34a','enviado':'#2563eb','descartado':'#dc2626'};
                          leads.forEach(l => {
                            const color = l.score >= 8 ? '#16a34a' : l.score >= 6 ? '#d97706' : '#dc2626';
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
                    <div style={{ padding: '8px 16px', background: '#f8fafc', fontSize: '11px', color: '#6b7280', display: 'flex', gap: '16px' }}>
                      <span>🟢 Score 8-10</span>
                      <span>🟡 Score 6-7</span>
                      <span>🔴 Score 0-5</span>
                      <span style={{ marginLeft: 'auto' }}>{leadsWithCoords.length} leads en el mapa · {filteredLeads.length - leadsWithCoords.length} sin coordenadas</span>
                    </div>
                  </div>
                )
              })()}

              {/* Leads list */}
              <div style={{ flex: 1, overflowY: 'auto', maxHeight: '680px' }}>
                {leadsLoading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Cargando leads...</div>
                ) : filteredLeads.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>No hay leads con estos filtros</div>
                ) : filteredLeads.map(lead => (
                  <div key={lead.id} style={{ padding: '14px 16px', borderBottom: '1px solid #f0f2f7' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: NAVY }}>{lead.nombre}</span>
                          <span style={{ fontSize: '11px', fontWeight: '800', color: scoreColor(lead.score), background: scoreColor(lead.score)+'18', padding: '1px 8px', borderRadius: '20px' }}>{lead.score}/10</span>
                          <span style={{ fontSize: '10px', color: '#6b7280', background: '#f1f5f9', padding: '1px 7px', borderRadius: '10px' }}>{lead.source}</span>
                          <span style={{ fontSize: '10px', fontWeight: '600', color: estadoColor(lead.estado), background: estadoBg(lead.estado), padding: '1px 7px', borderRadius: '10px' }}>{lead.estado}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>
                          {lead.ciudad && `📍 ${lead.ciudad}`}
                          {lead.rating > 0 && ` · ⭐ ${lead.rating} (${lead.reviews} reseñas)`}
                          {lead.telefono && ` · 📞 ${lead.telefono}`}
                          {lead.website && ` · 🌐 web`}
                          {lead.instagram && ` · 📸 ig`}
                        </div>
                        {lead.pain_point && <div style={{ fontSize: '11px', color: AMBER, marginTop: '3px' }}>💡 {lead.pain_point}</div>}
                        {lead.razon_score && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', fontStyle: 'italic' }}>{lead.razon_score}</div>}
                      </div>
                    </div>

                    {/* Mensaje */}
                    {lead.mensaje_generado && (
                      <div style={{ background: '#f8faff', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', border: '1px solid #e5e9f0' }}>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: BLUE, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Mensaje — {lead.canal_recomendado}</div>
                        {editingMsg === lead.id ? (
                          <textarea defaultValue={lead.mensaje_generado} id={`msg-${lead.id}`} rows={4} style={{ width: '100%', fontSize: '11px', fontFamily: 'inherit', lineHeight: '1.6', border: '1px solid #e5e9f0', borderRadius: '6px', padding: '8px', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                        ) : (
                          <div style={{ fontSize: '11px', color: '#374151', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{lead.mensaje_generado}</div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {lead.estado === 'pendiente' && (
                        <button onClick={() => updateLead(lead.id, 'aprobado', null)} style={{ padding: '5px 12px', borderRadius: '7px', border: 'none', background: '#f0fdf4', color: GREEN, fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>✅ Aprobar</button>
                      )}
                      {lead.estado === 'aprobado' && (
                        <button onClick={() => updateLead(lead.id, 'enviado', null)} style={{ padding: '5px 12px', borderRadius: '7px', border: 'none', background: '#eff6ff', color: BLUE, fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>📤 Marcar enviado</button>
                      )}
                      {lead.estado !== 'descartado' && (
                        <button onClick={() => updateLead(lead.id, 'descartado', null)} style={{ padding: '5px 12px', borderRadius: '7px', border: 'none', background: '#fef2f2', color: RED, fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>🗑 Descartar</button>
                      )}
                      {editingMsg === lead.id ? (
                        <>
                          <button onClick={() => { const el = document.getElementById(`msg-${lead.id}`); updateLead(lead.id, lead.estado, el.value); setEditingMsg(null) }} style={{ padding: '5px 12px', borderRadius: '7px', border: 'none', background: NAVY, color: 'white', fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>💾 Guardar</button>
                          <button onClick={() => setEditingMsg(null)} style={{ padding: '5px 12px', borderRadius: '7px', border: '1px solid #e5e9f0', background: 'white', color: '#6b7280', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setEditingMsg(lead.id)} style={{ padding: '5px 12px', borderRadius: '7px', border: '1px solid #e5e9f0', background: 'white', color: '#374151', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>✏️ Editar mensaje</button>
                          <button onClick={() => regenerateMessage(lead.id)} style={{ padding: '5px 12px', borderRadius: '7px', border: '1px solid #e5e9f0', background: 'white', color: PURPLE, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>🔄 Regenerar</button>
                        </>
                      )}
                      {lead.website && <a href={lead.website} target="_blank" rel="noreferrer" style={{ padding: '5px 12px', borderRadius: '7px', border: '1px solid #e5e9f0', background: 'white', color: '#374151', fontSize: '11px', textDecoration: 'none' }}>🌐 Web</a>}
                      {lead.instagram && <a href={lead.instagram} target="_blank" rel="noreferrer" style={{ padding: '5px 12px', borderRadius: '7px', border: '1px solid #e5e9f0', background: 'white', color: '#374151', fontSize: '11px', textDecoration: 'none' }}>📸 IG</a>}
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
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const API = 'http://127.0.0.1:8000'
  const NAVY = '#0B1426', GREEN = '#16a34a', AMBER = '#d97706', RED = '#dc2626', BLUE = '#2563eb'

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
    <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e5e9f0', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '800', color: NAVY }}>🧠 Análisis IA de la plataforma</div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>Claude analiza los datos reales y detecta oportunidades</div>
        </div>
        <button onClick={analyze} disabled={loading} style={{ padding: '9px 18px', borderRadius: '10px', border: 'none', background: loading ? '#e5e9f0' : NAVY, color: loading ? '#9ca3af' : 'white', fontWeight: '700', fontSize: '13px', cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {loading ? '⟳ Analizando...' : '✨ Analizar ahora'}
        </button>
      </div>

      {!analysis && !loading && !error && (
        <div style={{ textAlign: 'center', padding: '32px', color: '#9ca3af', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #e5e9f0' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>🤖</div>
          <div style={{ fontSize: '13px' }}>Pulsa "Analizar ahora" para que Claude analice los datos de Nexum y detecte oportunidades de negocio.</div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>
          <div style={{ fontSize: '13px', marginBottom: '6px' }}>Claude está analizando los datos de la plataforma...</div>
          <div style={{ fontSize: '11px' }}>Esto puede tardar unos segundos</div>
        </div>
      )}

      {error && (
        <div style={{ color: RED, fontSize: '13px', padding: '12px', background: '#fef2f2', borderRadius: '8px' }}>❌ {error}</div>
      )}

      {analysis && (
        <div>
          <div style={{ background: '#eff6ff', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px', borderLeft: `3px solid ${BLUE}` }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: BLUE, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Resumen</div>
            <div style={{ fontSize: '13px', color: '#1e3a5f', lineHeight: '1.6' }}>{analysis.resumen}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: GREEN, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>✅ Oportunidades</div>
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
              <div style={{ fontSize: '10px', fontWeight: '700', color: RED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>⚠️ Riesgos</div>
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

          <div style={{ background: `${NAVY}08`, borderRadius: '10px', padding: '14px 16px', borderLeft: `3px solid ${NAVY}` }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: NAVY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>⭐ Recomendación principal</div>
            <div style={{ fontSize: '13px', color: NAVY, fontWeight: '600', lineHeight: '1.6' }}>{analysis.recomendacion_principal}</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const [token, setToken] = useState(null)
  const [tab, setTab] = useState('overview')

  // Data states
  const [overview, setOverview] = useState(null)
  const [companies, setCompanies] = useState([])
  const [users, setUsers] = useState([])
  const [snapshots, setSnapshots] = useState([])
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
    const t = localStorage.getItem('nexum_token')
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

  const card = { background: 'white', borderRadius: '14px', border: '1px solid #e5e9f0' }
  const input = { width: '100%', padding: '9px 12px', borderRadius: '9px', border: '1.5px solid #e5e9f0', fontSize: '13px', fontFamily: "'DM Sans', system-ui", outline: 'none', color: NAVY }
  const btn = { padding: '9px 18px', borderRadius: '9px', border: 'none', background: NAVY, color: 'white', fontWeight: '700', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', system-ui" }

  const TABS = [
    { id: 'overview',   label: '◈ Overview'     },
    { id: 'companies',  label: '🏢 Empresas'     },
    { id: 'users',      label: '👤 Usuarios'     },
    { id: 'snapshots',  label: '📊 Snapshots'    },
    { id: 'prompts',    label: '🧠 Prompts IA'   },
    { id: 'memory',     label: '💾 Memoria IA'   },
    { id: 'flowchart',  label: '🔀 Flujo datos'  },
    { id: 'prospector', label: '🎯 Prospector'   },
    { id: 'billing',    label: '💳 Billing'      },
  ]

  const filteredCompanies = companies.filter(c =>
    !searchQ || c.name?.toLowerCase().includes(searchQ.toLowerCase()) || c.email?.toLowerCase().includes(searchQ.toLowerCase())
  )
  const filteredSnapshots = snapshots.filter(s =>
    snapshotFilter === 'all' || s.tendencia === snapshotFilter
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f6fb', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        *{box-sizing:border-box;} input:focus,select:focus,textarea:focus{border-color:#0B1426!important;outline:none;}
        ::-webkit-scrollbar{width:5px;} ::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:3px;}
        tr:hover td{background:#fafafa!important;}
      `}</style>

      <AdminSidebar active={`/admin${tab !== 'overview' ? `?tab=${tab}` : ''}`} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'hidden' }}>

        {/* CONTENT */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <div style={{ animation: 'fadeUp 0.3s ease' }}>
              {loading ? <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>Cargando...</div> : overview && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '20px' }}>
                    <StatCard icon="🏢" label="Empresas registradas"  value={overview.total_companies}    color={NAVY}  />
                    <StatCard icon="👤" label="Usuarios activos"      value={overview.active_users}       color={GREEN} bg="#f0fdf4" />
                    <StatCard icon="💳" label="Suscripciones activas" value={overview.active_subscriptions} color={BLUE} bg="#eff6ff" />
                    <StatCard icon="💶" label="MRR estimado"          value={`€${overview.mrr_estimated?.toLocaleString('es-ES')}`} color={GREEN} bg="#f0fdf4" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '24px' }}>
                    <StatCard icon="🧪" label="En trial"       value={overview.trial_subscriptions} color={AMBER} bg="#fffbeb" />
                    <StatCard icon="👥" label="Total usuarios" value={overview.total_users}          color={NAVY}  />
                    <StatCard icon="📈" label="Total empresas" value={overview.total_companies}      color={CYAN}  bg="#ecfeff" />
                  </div>

                  {/* Plans breakdown */}
                  <div style={{ ...card, padding: '20px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY, marginBottom: '16px' }}>Distribución de planes</div>
                    {Object.keys(overview.subscriptions_by_plan || {}).length === 0 ? (
                      <div style={{ color: '#9ca3af', fontSize: '13px', padding: '12px 0' }}>Aún no hay suscripciones activas.</div>
                    ) : (
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {Object.entries(overview.subscriptions_by_plan || {}).map(([plan, count]) => (
                          <div key={plan} style={{ background: '#f8faff', borderRadius: '10px', padding: '14px 20px', textAlign: 'center', border: '1px solid #e5e9f0', minWidth: '100px' }}>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: NAVY, marginBottom: '4px' }}>{count}</div>
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
                <span style={{ fontSize: '13px', color: '#6b7280' }}>{filteredCompanies.length} empresa{filteredCompanies.length !== 1 ? 's' : ''}</span>
              </div>

              {selectedCompany && companyDetail ? (
                <div>
                  <button onClick={() => { setSelectedCompany(null); setCompanyDetail(null) }} style={{ ...btn, background: '#f4f6fb', color: NAVY, border: '1px solid #e5e9f0', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>← Volver</button>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ ...card, padding: '20px' }}>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: NAVY, marginBottom: '4px' }}>{companyDetail.company?.name}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>{companyDetail.company?.email}</div>
                      {[{label:'Contactos',value:companyDetail.stats?.contacts},{label:'Productos',value:companyDetail.stats?.products},{label:'Proyectos',value:companyDetail.stats?.projects}].map(s=>(
                        <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f2f7' }}>
                          <span style={{ fontSize: '13px', color: '#6b7280' }}>{s.label}</span>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: NAVY }}>{s.value}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ ...card, padding: '20px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: NAVY, marginBottom: '12px' }}>Historial de snapshots</div>
                      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {(companyDetail.snapshots || []).map((s, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f8f9fc', fontSize: '12px' }}>
                            <span style={{ color: '#6b7280' }}>{s.date}</span>
                            <span style={{ fontWeight: '600', color: GREEN }}>€{s.ingresos?.toLocaleString('es-ES')}</span>
                            <StatusBadge status={s.tendencia === 'creciendo' ? 'active' : s.tendencia === 'bajando' ? 'past_due' : 'trialing'} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Memory edit */}
                  <div style={{ ...card, padding: '20px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY, marginBottom: '14px' }}>💾 Memoria IA de esta empresa</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                      {[{key:'manual_training',label:'Entrenamiento manual'},{key:'business_personality',label:'Personalidad del negocio'},{key:'business_goals',label:'Objetivos'}].map(f=>(
                        <div key={f.key}>
                          <label style={{ fontSize: '11px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</label>
                          <textarea value={memoryEdit[f.key]} onChange={e => setMemoryEdit(p => ({ ...p, [f.key]: e.target.value }))} rows={5} style={{ ...input, resize: 'vertical' }} />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => saveMemory(selectedCompany)} disabled={savingMemory} style={{ ...btn }}>{savingMemory ? 'Guardando...' : '💾 Guardar memoria'}</button>
                      <button onClick={() => autoUpdateMemory(selectedCompany)} style={{ ...btn, background: PURPLE }}>🤖 Auto-actualizar con IA</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ ...card, overflow: 'hidden' }}>
                  <div style={{ background: NAVY, padding: '12px 18px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'center' }}>
                    {['Empresa', 'Plan', 'Estado', 'Ingresos/mes', 'Snapshots', 'Acciones'].map(h => (
                      <div key={h} style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
                    ))}
                  </div>
                  {loading ? <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Cargando empresas...</div>
                  : filteredCompanies.map((c, i) => (
                    <div key={c.id} style={{ padding: '14px 18px', borderBottom: i < filteredCompanies.length - 1 ? '1px solid #f0f2f7' : 'none', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'center', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: NAVY }}>{c.name}</div>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>{c.email} · {c.users_count} usuario{c.users_count !== 1 ? 's' : ''}</div>
                      </div>
                      <PlanBadge plan={c.plan} />
                      <StatusBadge status={c.plan_status} />
                      <span style={{ fontSize: '13px', fontWeight: '700', color: GREEN }}>€{c.monthly_revenue?.toLocaleString('es-ES') || 0}</span>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>{c.snapshot ? `${c.snapshot.date?.substring(0,7)} · ${c.snapshot.tendencia}` : '—'}</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => { setSelectedCompany(c.id); loadCompanyDetail(c.id) }} style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #e5e9f0', background: 'white', color: NAVY, fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Ver</button>
                        <button onClick={() => { setPlanModal(c.id); setNewPlan(c.plan || 'pro') }} style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #e5e9f0', background: '#eff6ff', color: BLUE, fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Plan</button>
                        <button onClick={() => generateSnapshot(c.id)} style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #e5e9f0', background: '#f5f3ff', color: PURPLE, fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>📊</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Plan change modal */}
              {planModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,38,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setPlanModal(null)}>
                  <div style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '360px', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: NAVY, marginBottom: '16px' }}>Cambiar plan de empresa</div>
                    <select value={newPlan} onChange={e => setNewPlan(e.target.value)} style={{ ...input, marginBottom: '16px' }}>
                      {['starter','pro','business','enterprise','trial'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={updatePlan} disabled={saving} style={{ ...btn, flex: 1 }}>{saving ? 'Guardando...' : 'Confirmar cambio'}</button>
                      <button onClick={() => setPlanModal(null)} style={{ ...btn, background: '#f4f6fb', color: NAVY, border: '1px solid #e5e9f0' }}>Cancelar</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── USERS ── */}
          {tab === 'users' && (
            <div style={{ animation: 'fadeUp 0.3s ease' }}>
              <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Buscar usuario..." style={{ ...input, maxWidth: '300px' }} />
                <span style={{ fontSize: '13px', color: '#6b7280' }}>{users.length} usuarios</span>
              </div>
              <div style={{ ...card, overflow: 'hidden' }}>
                <div style={{ background: NAVY, padding: '12px 18px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '12px' }}>
                  {['Usuario', 'Empresa', 'Rol', 'Estado', 'Acciones'].map(h => (
                    <div key={h} style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
                  ))}
                </div>
                {loading ? <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Cargando usuarios...</div>
                : users.filter(u => !searchQ || u.email?.includes(searchQ) || u.full_name?.includes(searchQ)).map((u, i) => (
                  <div key={u.id} style={{ padding: '12px 18px', borderBottom: '1px solid #f0f2f7', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'center', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: NAVY }}>{u.full_name || u.email}</div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>{u.email}</div>
                    </div>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>ID: {u.company_id || '—'}</span>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: u.is_admin ? PURPLE : BLUE, background: u.is_admin ? '#f5f3ff' : '#eff6ff', padding: '2px 8px', borderRadius: '6px' }}>{u.is_admin ? 'Admin' : 'Usuario'}</span>
                    <StatusBadge status={u.is_active ? 'active' : 'canceled'} />
                    <button onClick={() => toggleUser(u.id, !u.is_active)} style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid', borderColor: u.is_active ? '#fecaca' : '#bbf7d0', background: u.is_active ? '#fef2f2' : '#f0fdf4', color: u.is_active ? RED : GREEN, fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
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
                  <div style={{ fontSize: '15px', fontWeight: '800', color: NAVY }}>📊 Base de datos — Business Snapshots</div>
                  <span style={{ fontSize: '12px', color: '#6b7280', background: '#f1f5f9', padding: '3px 10px', borderRadius: '20px' }}>{snapshots.length} registros</span>
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
                  const a = document.createElement('a'); a.href = url; a.download = `nexum_snapshots_${new Date().toISOString().substring(0,10)}.csv`; a.click()
                  URL.revokeObjectURL(url)
                }} style={{ ...btn, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  ⬇ Exportar CSV
                </button>
              </div>

              {/* ── Tabla completa scrollable ── */}
              <div style={{ ...card, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  {/* Header */}
                  <div style={{ background: NAVY, padding: '10px 16px', display: 'grid', gridTemplateColumns: '50px 70px 80px 90px 80px 70px 100px 100px 100px 75px 75px 70px 75px 75px 80px 70px 75px 75px 80px 110px 110px 100px', gap: '8px', alignItems: 'center', minWidth: '1700px' }}>
                    {['ID','Empresa','Fecha','Sector','Tamaño','Emp.','Ingresos','Gastos','Resultado','Margen%','Crecim%','Ventas','Ticket €','Clientes','Sentiment','Cli.Riesgo','Proyectos','Health','AI Score','Tendencia','Salud Fin.','Riesgo'].map(h=>(
                      <div key={h} style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</div>
                    ))}
                  </div>

                  {/* Rows */}
                  {loading
                    ? <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Cargando base de datos...</div>
                    : snapshots.length === 0
                    ? (
                      <div style={{ padding: '60px', textAlign: 'center' }}>
                        <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.2 }}>📊</div>
                        <div style={{ fontSize: '14px', color: '#9ca3af' }}>La base de datos está vacía — aún no hay registros.</div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>Los registros se crearán automáticamente cuando las empresas usen la plataforma.</div>
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
                          <div key={s.id} style={{ padding: '8px 16px', borderBottom: i < snapshots.length - 1 ? '1px solid #f0f2f7' : 'none', display: 'grid', gridTemplateColumns: '50px 70px 80px 90px 80px 70px 100px 100px 100px 75px 75px 70px 75px 75px 80px 70px 75px 75px 80px 110px 110px 100px', gap: '8px', alignItems: 'center', background: i % 2 === 0 ? 'white' : '#fafbfc', fontSize: '11px', minWidth: '1700px' }}>
                            <span style={{ color: '#9ca3af', fontSize: '10px' }}>#{s.id}</span>
                            <span style={{ fontWeight: '700', color: NAVY }}>#{s.company_id}</span>
                            <span style={{ color: '#6b7280' }}>{s.date?.substring(0,7) || '—'}</span>
                            <span style={{ color: '#374151' }}>{s.sector || '—'}</span>
                            <span style={{ color: '#374151' }}>{s.empresa_size || '—'}</span>
                            <span style={{ color: '#374151' }}>{s.num_empleados ?? 0}</span>
                            <span style={{ fontWeight: '700', color: GREEN }}>€{(s.ingresos_mes||0).toLocaleString('es-ES')}</span>
                            <span style={{ color: '#374151' }}>€{(s.gastos_mes||0).toLocaleString('es-ES')}</span>
                            <span style={{ fontWeight: '700', color: (s.resultado_neto||0) >= 0 ? GREEN : RED }}>€{(s.resultado_neto||0).toLocaleString('es-ES')}</span>
                            <span style={{ color: '#374151' }}>{(s.margen_neto_pct||0).toFixed(1)}%</span>
                            <span style={{ color: (s.crecimiento_pct||0) >= 0 ? GREEN : RED, fontWeight: '600' }}>{(s.crecimiento_pct||0).toFixed(1)}%</span>
                            <span style={{ color: '#374151' }}>{s.num_ventas||0}</span>
                            <span style={{ color: '#374151' }}>€{(s.ticket_medio||0).toFixed(0)}</span>
                            <span style={{ color: '#374151' }}>{s.total_contactos||0}</span>
                            <span style={{ color: (s.sentiment_avg||5) >= 7 ? GREEN : (s.sentiment_avg||5) >= 5 ? AMBER : RED, fontWeight: '600' }}>{(s.sentiment_avg||0).toFixed(1)}</span>
                            <span style={{ color: '#374151' }}>{s.clientes_riesgo||0}</span>
                            <span style={{ color: '#374151' }}>{s.proyectos_activos||0}</span>
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
                <div style={{ padding: '10px 16px', background: '#f8fafc', borderTop: '1px solid #e5e9f0', fontSize: '11px', color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
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
                  <button onClick={() => setSelectedPrompt(null)} style={{ ...btn, background: '#f4f6fb', color: NAVY, border: '1px solid #e5e9f0', marginBottom: '16px', fontSize: '13px' }}>← Volver</button>
                  <div style={{ ...card, padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: NAVY, marginBottom: '4px' }}>{selectedPrompt.name}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>{selectedPrompt.description}</div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: PURPLE, background: '#f5f3ff', padding: '2px 8px', borderRadius: '6px' }}>{selectedPrompt.module}</span>
                          {parseVars(selectedPrompt.variables).map(v => (
                            <span key={v} style={{ fontSize: '11px', color: '#6b7280', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>{`{${v}}`}</span>
                          ))}
                        </div>
                      </div>
                      {selectedPrompt.last_modified && <span style={{ fontSize: '11px', color: '#9ca3af' }}>Modificado: {selectedPrompt.last_modified?.substring(0,10)}</span>}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Contenido del prompt</div>
                    <textarea value={editingPrompt} onChange={e => setEditingPrompt(e.target.value)} rows={14} style={{ ...input, fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.6', resize: 'vertical', background: '#0f172a', color: '#e2e8f0', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }} />
                    <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                      <button onClick={savePrompt} disabled={saving} style={{ ...btn }}>{saving ? 'Guardando...' : '💾 Guardar prompt'}</button>
                      <button onClick={() => setEditingPrompt(selectedPrompt.content)} style={{ ...btn, background: '#f4f6fb', color: NAVY, border: '1px solid #e5e9f0' }}>↩ Restaurar original</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                  {loading ? <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: '#9ca3af' }}>Cargando prompts...</div>
                  : prompts.map(p => (
                    <div key={p.key} style={{ ...card, padding: '20px', cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.07)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                      onClick={() => { setSelectedPrompt(p); setEditingPrompt(p.content) }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: PURPLE, background: '#f5f3ff', padding: '2px 8px', borderRadius: '6px' }}>{p.module}</span>
                        {p.last_modified && <span style={{ fontSize: '10px', color: AMBER }}>✏ Modificado</span>}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY, marginBottom: '4px' }}>{p.name}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px', lineHeight: '1.5' }}>{p.description}</div>
                      <div style={{ background: '#0f172a', borderRadius: '8px', padding: '10px 12px', fontSize: '11px', fontFamily: 'monospace', color: '#94a3b8', overflow: 'hidden', maxHeight: '60px', lineHeight: '1.5' }}>
                        {p.content?.substring(0, 120)}...
                      </div>
                      <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {parseVars(p.variables).map(v => <span key={v} style={{ fontSize: '10px', color: '#6b7280', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>{`{${v}}`}</span>)}
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

          {/* ── BILLING ── */}
          {tab === 'billing' && (
            <BillingTab token={token} API={API} />
          )}

          {/* ── PROSPECTOR ── */}
          {tab === 'prospector' && (
            <ProspectorTab token={token} API={API} />
          )}

          {/* ── FLOWCHART ── */}
          {tab === 'flowchart' && (
            <div style={{ animation: 'fadeUp 0.3s ease' }}>
              <DataFlowchart />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginTop: '20px' }}>
                {[
                  { title: 'Módulos de captura', icon: '📥', desc: 'Ventas, Clientes, Proyectos, RRHH, Contabilidad capturan datos en tiempo real de cada empresa.', color: BLUE },
                  { title: 'Business Snapshot', icon: '📊', desc: 'Cada día/semana/mes se agrega toda la información en una fila del snapshot con KPIs, ratios y labels para ML.', color: CYAN },
                  { title: 'Claude AI + Memoria', icon: '🧠', desc: 'Claude analiza los snapshots, extrae patrones y los guarda en la memoria de IA de cada empresa. El usuario puede entrenarla manualmente.', color: PURPLE },
                ].map(c => (
                  <div key={c.title} style={{ ...card, padding: '20px', borderTop: `3px solid ${c.color}` }}>
                    <div style={{ fontSize: '22px', marginBottom: '8px' }}>{c.icon}</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY, marginBottom: '6px' }}>{c.title}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.6' }}>{c.desc}</div>
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