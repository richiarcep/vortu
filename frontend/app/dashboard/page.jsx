'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import VeraPanel from '@/components/ui/VeraPanel'
import { useApi } from '@/components/ui/useApi'
import { FONT, useT, useTheme } from '@/components/ui/tokens'
import { Skeleton, EmptyState, Sparkline, HeaderActions } from '@/components/ui/primitives'
import VeraDrawer from '@/components/ui/VeraDrawer'
import { openVeraDrawer } from '@/components/ui/useVeraStore'
import KpiAskButton from '@/components/ui/KpiAskButton'

import { API_BASE as API } from '@/lib/api'

// ───────────────────────────────────────────────────────────────
// PRIMITIVOS LOCALES
// ───────────────────────────────────────────────────────────────
function Card({ children, style = {}, padding = 20 }) {
  const T = useT()
  return (
    <div style={{
      background: T.card, borderRadius: 18,
      border: `.5px solid ${T.hairline}`,
      boxShadow: 'var(--shadow-card)',
      padding, ...style,
    }}>{children}</div>
  )
}

function FlagES({ size = 14 }) {
  return (
    <svg width={size} height={size * 0.66} viewBox="0 0 3 2" style={{
      borderRadius: 2, boxShadow: '0 0 0 .5px rgba(0,0,0,0.1)', flexShrink: 0,
    }}>
      <rect width="3" height="2" fill="#AA151B" />
      <rect y="0.5" width="3" height="1" fill="#F1BF00" />
    </svg>
  )
}

function PillGroup({ items, active, onChange }) {
  const T = useT()
  return (
    <div style={{
      display: 'flex', gap: 2, alignItems: 'center',
      background: T.sidebar, padding: 3, borderRadius: 10,
    }}>
      {items.map(item => (
        <button key={item.key} onClick={() => onChange(item.key)} style={{
          padding: '5px 12px', height: 26, borderRadius: 7,
          background: active === item.key ? T.card : 'transparent',
          border: 'none',
          color: active === item.key ? T.text : T.text3,
          fontWeight: active === item.key ? 500 : 400,
          fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit',
          whiteSpace: 'nowrap', transition: 'all .15s',
          boxShadow: active === item.key
            ? '0 .5px 1px rgba(0,0,0,.04),0 1px 3px rgba(0,0,0,.03)'
            : 'none',
        }}>{item.label}</button>
      ))}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────
// VERA HÍBRIDO — insight corto + preguntas + input + abrir chat
// ───────────────────────────────────────────────────────────────
function VeraHybrid({ token, onOpenChat }) {
  const T = useT()
  const [insight, setInsight] = useState(null)
  const [insightLoading, setInsightLoading] = useState(false)
  const [question, setQuestion] = useState('')

  const suggested = [
    '¿Cuál es mi margen este mes?',
    '¿Qué producto vende más?',
    '¿Cuánto gasté en nóminas?',
  ]

  async function loadInsight() {
    setInsightLoading(true)
    try {
      const res = await fetch(`${API}/api/vera/insights/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const d = await res.json()
        // La API devuelve {insights:[{label,text,tone}]}; este banner espera un string.
        const txt = Array.isArray(d.insights)
          ? d.insights.map(i => (i.label ? `${i.label}: ${i.text}` : i.text)).filter(Boolean).join('\n')
          : (typeof d.insight === 'string' ? d.insight : '')
        setInsight(txt || null)
      }
    } catch { }
    setInsightLoading(false)
  }

  useEffect(() => {
    if (!token) return
    loadInsight()
  }, [token])

  function handleAsk(text) {
    const q = text || question
    if (!q.trim()) return
    sessionStorage.setItem('vera_pending_question', q)
    onOpenChat()
    setQuestion('')
  }

  // Quedarse solo con la primera frase substantiva del insight (2-3 líneas max)
  const shortInsight = insight
    ? insight
      .replace(/#{1,4} /g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .split('\n').filter(l => l.trim().length > 20)
      .slice(0, 2).join(' ')
      .substring(0, 200)
    : null

  return (
    <Card padding={18}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg,#4F46E5,#A5B1FF)',
            display: 'grid', placeItems: 'center',
          }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" fill="#fff" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, letterSpacing: -0.2 }}>Vera</div>
            <div style={{ fontSize: 11, color: T.text4 }}>Resumen del negocio</div>
          </div>
        </div>
        <span style={{
          padding: '3px 10px', background: 'rgba(79,70,229,.06)',
          color: T.blue, borderRadius: 999, fontSize: 10, fontWeight: 600,
          letterSpacing: 0.4,
        }}>BASE</span>
      </div>

      {/* Insight corto */}
      {insightLoading && (
        <div style={{
          padding: '14px', background: T.sidebar, borderRadius: 10,
          fontSize: 12.5, color: T.text4, textAlign: 'center', marginBottom: 12,
        }}>Analizando…</div>
      )}
      {!insightLoading && shortInsight && (
        <div style={{
          padding: '12px 14px',
          background: 'linear-gradient(180deg, rgba(79,70,229,.04), rgba(79,70,229,.01))',
          borderRadius: 10,
          border: `.5px solid rgba(79,70,229,.12)`,
          fontSize: 12.5, color: T.text2, lineHeight: 1.55, marginBottom: 12,
        }}>{shortInsight}</div>
      )}

      {/* Preguntas sugeridas */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {suggested.map((q, i) => (
          <button key={i} onClick={() => handleAsk(q)} style={{
            padding: '5px 11px', background: T.sidebar,
            border: `.5px solid ${T.hairline}`,
            borderRadius: 999, fontSize: 11.5,
            color: T.text2, cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all .15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = T.card; e.currentTarget.style.borderColor = T.blue }}
            onMouseLeave={e => { e.currentTarget.style.background = T.sidebar; e.currentTarget.style.borderColor = T.hairline }}
          >{q}</button>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAsk() }}
          placeholder="Pregunta a Vera…"
          style={{
            flex: 1, padding: '8px 11px', borderRadius: 8,
            border: `.5px solid ${T.hairline}`, background: T.sidebar,
            fontSize: 12.5, color: T.text, fontFamily: 'inherit', outline: 'none',
          }}
        />
        <button onClick={() => handleAsk()} disabled={!question.trim()} aria-label="Enviar pregunta a Vera" style={{
          width: 32, height: 32, borderRadius: 8,
          border: 'none',
          background: question.trim() ? T.blue : T.sidebar,
          color: question.trim() ? '#fff' : T.text4,
          cursor: question.trim() ? 'pointer' : 'not-allowed',
          display: 'grid', placeItems: 'center', fontFamily: 'inherit',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      </div>

      <button onClick={onOpenChat} style={{
        width: '100%', padding: '7px', background: 'transparent',
        border: 'none', color: T.blue, fontSize: 12, fontWeight: 500,
        cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
      }}>
        Abrir chat completo
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
    </Card>
  )
}

// ───────────────────────────────────────────────────────────────
// BAR CHART — gráfico de ingresos 14 días
// ───────────────────────────────────────────────────────────────
function BarChart({ data = [] }) {
  const T = useT()
  const [hover, setHover] = useState(null)
  if (!data.length) return (
    <Card style={{ minHeight: 260, display: 'grid', placeItems: 'center' }}>
      <EmptyState
        icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-6" /></svg>}
        title="Sin datos de ventas"
        hint="Cuando registres ventas en este periodo, verás aquí la evolución diaria de ingresos."
      />
    </Card>
  )
  const W = 760, H = 220, padL = 48, padR = 16, padT = 12, padB = 32
  const plotW = W - padL - padR, plotH = H - padT - padB
  const maxVal = Math.max(...data.map(d => d.ing || 0), 1)
  const gridVals = [0, 0.33, 0.66, 1].map(p => Math.round(maxVal * p))
  const barW = Math.floor(plotW / data.length * 0.55)
  const slotW = plotW / data.length

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div className="display" style={{ fontSize: 15, fontWeight: 600, color: T.text, letterSpacing: -0.2 }}>Ingresos · últimos 14 días</div>
          <div style={{ fontSize: 11, color: T.text4, marginTop: 2 }}>Ventas diarias · hover para detalle</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: T.text3 }}>
          <span style={{ width: 8, height: 8, borderRadius: 3, background: T.blue, display: 'inline-block' }} />
          <span>Ingresos diarios</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 220, display: 'block' }}>
        {gridVals.map((v, idx) => {
          const y = padT + plotH - (v / maxVal) * plotH
          return (
            <g key={idx}>
              <line x1={padL} x2={W - padR} y1={y} y2={y}
                stroke={T.hairline} strokeWidth="1" strokeDasharray={idx === 0 ? 'none' : '0'} />
              <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="10" fill={T.text4} fontFamily={FONT}>
                {v === 0 ? '0' : `${(v / 1000).toFixed(0)}k`}
              </text>
            </g>
          )
        })}
        {data.map((d, i) => {
          const cx = padL + slotW * i + slotW / 2
          const x = cx - barW / 2
          const ingH = Math.max(((d.ing || 0) / maxVal) * plotH, 2)
          const isHov = hover === i
          const barColor = isHov ? T.blue : 'rgba(79,70,229,.45)'
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }}>
              <rect x={padL + slotW * i} y={padT} width={slotW} height={plotH} fill="transparent" />
              <rect x={x} y={padT + plotH - ingH} width={barW} height={ingH}
                fill={barColor} rx="4"
                style={{ transition: 'fill .1s' }} />
              <text x={cx} y={H - 8} textAnchor="middle" fontSize="9.5"
                fill={isHov ? T.text : T.text4}
                fontWeight={isHov ? 600 : 400} fontFamily={FONT}>{d.label}</text>
              {isHov && (
                <g>
                  <rect x={cx - 52} y={padT + plotH - ingH - 46} width="104" height="36" rx="8" fill={T.text} />
                  <text x={cx} y={padT + plotH - ingH - 28} textAnchor="middle" fontSize="10"
                    fill="rgba(255,255,255,.55)" fontFamily={FONT}>{d.label}</text>
                  <text x={cx} y={padT + plotH - ingH - 14} textAnchor="middle" fontSize="12"
                    fill="#fff" fontWeight="600" fontFamily={FONT}>€{(d.ing || 0).toLocaleString('es-ES')}</text>
                </g>
              )}
            </g>
          )
        })}
      </svg>
    </Card>
  )
}

// ───────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ───────────────────────────────────────────────────────────────
export default function Dashboard() {
  const T = useT()
  const { theme } = useTheme()
  const router = useRouter()
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [veraOpen, setVeraOpen] = useState(false)

  const [periodo, setPeriodo] = useState(() => {
    if (typeof window === 'undefined') return '30d'
    return localStorage.getItem('vela_dashboard_periodo') || '30d'
  })

  useEffect(() => {
    const t = localStorage.getItem('vela_token')
    if (!t) { router.push('/login'); return }
    setToken(t)
    try {
      const p = JSON.parse(atob(t.split('.')[1]))
      setUser({ email: p.sub || '', name: p.name || p.sub || 'Usuario' })
    } catch { setUser({ email: '', name: 'Usuario' }) }
  }, [])

  const { data: resumen, mutate: mResumen } = useApi(token ? `/api/agente/resumen?period=${periodo}` : null)
  const { data: ventas, mutate: mVentas } = useApi(token ? '/api/ventas/resumen' : null)
  const { data: clientes, mutate: mClientes } = useApi(token ? '/api/clientes/analytics' : null)
  const { data: proyectos, mutate: mProyectos } = useApi(token ? '/api/proyectos/resumen' : null)

  const loading = !resumen && !ventas && !clientes && !proyectos

  function refetchAll() {
    mResumen(); mVentas(); mClientes(); mProyectos()
  }

  const d = resumen?.ultimos_30_dias || {}
  const esPositivo = (d.resultado_neto || 0) >= 0
  const chartData = (ventas?.daily_revenue || []).map(x => ({ label: x.label, ing: x.revenue || 0, gas: (x.revenue || 0) * 0.45 }))

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 13 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'

  const statusRows = [
    { label: 'Alertas activas', value: resumen?.alertas_activas || 0, bad: (resumen?.alertas_activas || 0) > 0 },
    { label: 'Clientes en riesgo', value: clientes?.overview?.at_risk_contacts || 0, bad: (clientes?.overview?.at_risk_contacts || 0) > 0 },
    { label: 'Proyectos en riesgo', value: proyectos?.at_risk || 0, bad: (proyectos?.at_risk || 0) > 0 },
    { label: 'Stock bajo', value: ventas?.low_stock_alerts?.length || 0, bad: (ventas?.low_stock_alerts?.length || 0) > 0 },
  ]
  const isOk = statusRows.every(r => !r.bad)

  const modules = [
    { title: 'Contabilidad', desc: 'Partida doble · PGC', href: '/contabilidad', stat: resumen ? `€${((d.ingresos || 0) / 1000).toFixed(0)}k` : '—', statLabel: 'ingresos' },
    { title: 'Recursos Humanos', desc: 'Nóminas · IRPF · SS', href: '/hr', stat: resumen?.empleados || '—', statLabel: 'empleados' },
    { title: 'Clientes', desc: 'CRM · Inbox · IA', href: '/clientes', stat: clientes?.overview?.pending_responses || 0, statLabel: 'pendientes' },
    { title: 'Proyectos', desc: 'Health score · IA', href: '/proyectos', stat: proyectos?.total_projects || 0, statLabel: 'activos' },
  ]

  const periodos = [
    { key: '7d', label: 'Últimos 7 días' },
    { key: '30d', label: 'Últimos 30 días' },
    { key: '90d', label: 'Trimestre' },
    { key: 'year', label: 'Año' },
  ]

  return (
    <div style={{ minHeight: '100dvh', background: T.bg, display: 'flex', fontFamily: FONT, WebkitFontSmoothing: 'antialiased' }}>
      <style>{`
        *{box-sizing:border-box}
        input:focus,select:focus{border-color:${T.blue}!important;outline:none}
        @media (max-width:768px){
          .dash-row-main{grid-template-columns:1fr!important}
          .dash-row-2{grid-template-columns:1fr!important}
        }
      `}</style>

      <Sidebar active="/dashboard" />
      <VeraDrawer />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* HEADER */}
        <header style={{
          minHeight: 64, background: theme === 'dark' ? 'rgba(11,11,12,.85)' : 'rgba(251,251,253,.85)',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          borderBottom: `.5px solid ${T.hairline}`,
          display: 'flex', alignItems: 'center', padding: '8px 28px',
          flexShrink: 0, position: 'sticky', top: 0, zIndex: 10, gap: 20,
          flexWrap: 'wrap', rowGap: 8,
        }}>
          <div>
            <div className="display" style={{
              fontSize: 20, color: T.text,
              letterSpacing: -0.4, lineHeight: 1.05,
            }}>{greeting}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</div>
            <div style={{
              fontSize: 11, color: T.text4, marginTop: 3,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <FlagES size={12} />
              <span>{now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <PillGroup items={periodos} active={periodo}
              onChange={v => { setPeriodo(v); localStorage.setItem('vela_dashboard_periodo', v) }} />
          </div>

          <HeaderActions onVera={() => openVeraDrawer({ modulo: 'dashboard' })} user={user} router={router}>
            <button onClick={refetchAll} style={{
              padding: '6px 14px', borderRadius: 999,
              border: `.5px solid ${T.hairline}`, background: T.card,
              color: T.text2, fontSize: 12, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>Actualizar</button>
          </HeaderActions>
        </header>

        {/* CONTENIDO */}
        <div className="fade-in" style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {/* ──── KPIs GRANDES con iconos + estado ──── */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12, marginBottom: 14,
          }}>
            {(() => {
              const margen = d.margen || 0
              const ingresosColor = margen > 20 ? T.green : margen > 10 ? T.amber : T.red
              const netoColor = esPositivo ? T.green : T.red
              const ventasHoyVal = ventas?.today?.total_revenue || 0

              return [
                {
                  label: 'Ingresos',
                  value: `€${(d.ingresos || 0).toLocaleString('es-ES')}`,
                  sub: `Margen ${margen}%`,
                  trend: margen > 10 ? 'up' : 'down',
                  color: ingresosColor,
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  ),
                },
                {
                  label: 'Gastos',
                  value: `€${(d.gastos || 0).toLocaleString('es-ES')}`,
                  sub: 'Últimos 30 días',
                  color: T.amber,
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
                      <polyline points="16 17 22 17 22 11" />
                    </svg>
                  ),
                },
                {
                  label: 'Resultado neto',
                  value: `€${(d.resultado_neto || 0).toLocaleString('es-ES')}`,
                  sub: esPositivo ? 'Rentable' : 'Pérdida',
                  trend: esPositivo ? 'up' : 'down',
                  color: netoColor,
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                      <polyline points="17 6 23 6 23 12" />
                    </svg>
                  ),
                },
                {
                  label: 'Ventas hoy',
                  value: `€${ventasHoyVal.toFixed(0)}`,
                  sub: `${ventas?.today?.total_sales || 0} transacciones`,
                  color: T.blue,
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="21" r="1" />
                      <circle cx="20" cy="21" r="1" />
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                  ),
                },
              ]
            })().map((k, i) => {
              // Tinte translúcido a partir de cualquier hex del tema (la paleta es cálida ahora)
              const colorToRgba = (hex, alpha) => {
                const h = (hex || '#000').replace('#', '')
                const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h
                const n = parseInt(f, 16)
                return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
              }
              // Sparkline con la serie diaria REAL (14 días) de cada KPI.
              // Color según si la tendencia es BUENA: ingresos/neto subiendo = verde; gastos bajando = verde.
              const _serie = resumen?.series_14d || []
              const sparkByLabel = {
                'Ingresos': _serie.map(s => s.ingresos),
                'Gastos': _serie.map(s => s.gastos),
                'Resultado neto': _serie.map(s => (s.ingresos || 0) - (s.gastos || 0)),
                'Ventas hoy': _serie.map(s => s.ventas || 0),
              }
              const spark = sparkByLabel[k.label] || []
              const _rising = spark.length > 1 ? spark[spark.length - 1] >= spark[0] : true
              const sparkGood = k.label === 'Gastos' ? !_rising : _rising
              // "Ventas hoy" sin ninguna venta (hoy ni en la serie) → CTA primera venta
              const noVentas = k.label === 'Ventas hoy'
                && (ventas?.today?.total_sales || 0) === 0
                && spark.reduce((a, b) => a + (b || 0), 0) === 0
              return (
                <KpiAskButton
                  key={i}
                  kpi={{ label: k.label, value: k.value, hint: k.sub }}
                  modulo="dashboard"
                >
                  <div className="hover-lift" style={{
                    background: T.card,
                    borderRadius: 18,
                    border: `.5px solid ${T.hairline}`,
                    boxShadow: 'var(--shadow-card)',
                    padding: 20,
                  }}>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: 16,
                  }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: colorToRgba(k.color, 0.1),
                      color: k.color,
                      display: 'grid', placeItems: 'center',
                    }}>{k.icon}</div>
                    <div style={{ fontSize: 12, color: T.text3, fontWeight: 400 }}>{k.label}</div>
                  </div>
                  {(!loading && noVentas) ? (
                    /* Sin ninguna venta todavía → CTA para registrar la primera */
                    <>
                      <div style={{
                        fontSize: 15, fontWeight: 500, color: T.text, lineHeight: 1.3,
                      }}>Aún no hay ventas</div>
                      <div
                        role="link"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); router.push('/ventas') }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); router.push('/ventas') } }}
                        style={{
                          marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6,
                          fontSize: 12.5, fontWeight: 600, color: T.blue, cursor: 'pointer',
                        }}>
                        Haz tu primera venta
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.blue} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{
                        fontSize: 28, fontWeight: 500, letterSpacing: -0.7,
                        color: T.text, fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                      }}>{loading ? <Skeleton w={96} h={26} /> : k.value}</div>
                      <div style={{
                        fontSize: 11.5, color: T.text4, marginTop: 10,
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        {k.trend === 'up' && (
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2.5" strokeLinecap="round">
                            <path d="M7 14l5-5 5 5" />
                          </svg>
                        )}
                        {k.trend === 'down' && (
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth="2.5" strokeLinecap="round">
                            <path d="M7 10l5 5 5-5" />
                          </svg>
                        )}
                        {k.sub}
                      </div>
                      {!loading && spark.length > 1 && (
                        <div style={{ marginTop: 10 }}>
                          <Sparkline data={spark} up={sparkGood} height={22} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </KpiAskButton>
              )
            })}
          </div>

          {/* ──── BAR CHART + VERA HÍBRIDO ──── */}
          <div className="dash-row-main" style={{
            display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 360px',
            gap: 14, marginBottom: 14,
          }}>
            <BarChart data={chartData} />
            <VeraHybrid token={token} onOpenChat={() => openVeraDrawer({ modulo: 'dashboard' })} />
          </div>

          {/* ──── ESTADO + MÁS VENDIDOS ──── */}
          <div className="dash-row-2" style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 14, marginBottom: 14,
          }}>
            <Card>
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: isOk ? 'rgba(52,199,89,.1)' : 'rgba(255,149,0,.1)',
                    color: isOk ? T.green : T.amber,
                    display: 'grid', placeItems: 'center',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <div>
                    <div className="display" style={{ fontSize: 15, fontWeight: 600, color: T.text, letterSpacing: -0.2 }}>
                      Estado del negocio
                    </div>
                    <div style={{ fontSize: 11, color: T.text4, marginTop: 2 }}>
                      Indicadores clave
                    </div>
                  </div>
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: 999,
                  fontSize: 11, fontWeight: 500,
                  background: isOk ? 'rgba(52,199,89,.08)' : 'rgba(255,149,0,.1)',
                  color: isOk ? T.green : T.amber,
                  border: `.5px solid ${isOk ? 'rgba(52,199,89,.2)' : 'rgba(255,149,0,.25)'}`,
                }}>{isOk ? 'Saludable' : 'Atención'}</span>
              </div>
              {statusRows.map((r, i) => {
                const icons = {
                  'Alertas activas': (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                      <path d="M10 21a2 2 0 0 0 4 0" />
                    </svg>
                  ),
                  'Clientes en riesgo': (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <line x1="20" y1="8" x2="20" y2="14" />
                      <line x1="23" y1="11" x2="17" y2="11" />
                    </svg>
                  ),
                  'Proyectos en riesgo': (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                  ),
                  'Stock bajo': (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    </svg>
                  ),
                }
                return (
                  <div key={r.label} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '11px 0',
                    borderBottom: i < statusRows.length - 1 ? `.5px solid ${T.soft}` : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        color: r.bad ? T.red : T.text4,
                        display: 'flex',
                      }}>{icons[r.label]}</span>
                      <span style={{ fontSize: 13, color: T.text2 }}>{r.label}</span>
                    </div>
                    <span style={{
                      fontSize: 14, fontWeight: 600,
                      color: r.bad ? T.red : T.text,
                      fontVariantNumeric: 'tabular-nums',
                    }}>{r.value}</span>
                  </div>
                )
              })}
            </Card>

            <Card>
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'rgba(79,70,229,.1)', color: T.cyan,
                    display: 'grid', placeItems: 'center',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </div>
                  <div>
                    <div className="display" style={{ fontSize: 15, fontWeight: 600, color: T.text, letterSpacing: -0.2 }}>
                      Más vendidos
                    </div>
                    <div style={{ fontSize: 11, color: T.text4, marginTop: 2 }}>
                      Top productos del período
                    </div>
                  </div>
                </div>
                <button onClick={() => router.push('/ventas')} style={{
                  background: 'none', border: 'none', color: T.blue,
                  fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                }}>Ver todo</button>
              </div>
              {(ventas?.best_sellers || []).length === 0 ? (
                <EmptyState
                  icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18M16 10a4 4 0 0 1-8 0" /></svg>}
                  title="Sin ventas aún"
                  hint="Tus productos más vendidos aparecerán aquí."
                />
              ) : (
                (ventas?.best_sellers || []).slice(0, 5).map((p, i) => (
                  <div key={p.product_id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 0',
                    borderBottom: i < 4 ? `.5px solid ${T.soft}` : 'none',
                  }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6,
                      background: T.sidebar, display: 'grid', placeItems: 'center',
                      fontSize: 11, fontWeight: 600, color: T.text4,
                    }}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 500, color: T.text,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: T.text4 }}>{p.units_sold} uds</div>
                    </div>
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: T.text,
                      fontVariantNumeric: 'tabular-nums',
                    }}>€{p.revenue.toFixed(0)}</div>
                  </div>
                ))
              )}
            </Card>
          </div>

          {/* ──── ACCESO RÁPIDO ──── */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'rgba(99,102,241,.1)', color: T.purple,
                display: 'grid', placeItems: 'center',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </div>
              <div className="display" style={{ fontSize: 15, fontWeight: 600, color: T.text, letterSpacing: -0.2 }}>
                Acceso rápido
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              {modules.map((m, idx) => {
                const moduleIcons = {
                  'Contabilidad': {
                    color: T.green,
                    bg: 'rgba(52,199,89,.1)',
                    icon: (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    ),
                  },
                  'Recursos Humanos': {
                    color: T.blue,
                    bg: 'rgba(79,70,229,.1)',
                    icon: (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    ),
                  },
                  'Clientes': {
                    color: T.cyan,
                    bg: 'rgba(79,70,229,.1)',
                    icon: (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="8.5" cy="7" r="4" />
                        <path d="M20 8v6M23 11h-6" />
                      </svg>
                    ),
                  },
                  'Proyectos': {
                    color: T.amber,
                    bg: 'rgba(255,149,0,.1)',
                    icon: (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                    ),
                  },
                }
                const mi = moduleIcons[m.title] || { color: T.text, bg: T.sidebar, icon: null }
                return (
                  <div key={m.href} onClick={() => router.push(m.href)} style={{
                    background: T.sidebar, borderRadius: 12,
                    border: `.5px solid ${T.hairline}`, padding: 16,
                    cursor: 'pointer', transition: 'all .15s',
                  }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = T.card
                      e.currentTarget.style.transform = 'translateY(-1px)'
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.06)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = T.sidebar
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: mi.bg, color: mi.color,
                      display: 'grid', placeItems: 'center', marginBottom: 10,
                    }}>{mi.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 3 }}>{m.title}</div>
                    <div style={{ fontSize: 11, color: T.text4, marginBottom: 10 }}>{m.desc}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{
                        fontSize: 17, fontWeight: 600, color: T.text,
                        fontVariantNumeric: 'tabular-nums',
                      }}>{m.stat}</span>
                      <span style={{ fontSize: 11, color: T.text4 }}>{m.statLabel}</span>
                    </div>
                  </div>
                
                )
              })}
            </div>
          </Card>

        </div>
      </div>
    </div>
  )
}
