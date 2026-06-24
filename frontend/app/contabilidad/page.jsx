'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import VeraPanel from '@/components/ui/VeraPanel'
import { FONT, useT, useTheme } from '@/components/ui/tokens'
import VeraDrawer from '@/components/ui/VeraDrawer'
import { PageHeader, ErrorBanner } from '@/components/ui/primitives'

import { API_BASE as API } from '@/lib/api'

// ───────────────────────────────────────────────────────────────
// PRIMITIVOS LOCALES
// ───────────────────────────────────────────────────────────────

function Card({ children, style = {}, padding = 20 }) {
  const T = useT()
  return (
    <div style={{
      background: T.card,
      borderRadius: 14,
      border: `.5px solid ${T.hairline}`,
      boxShadow: '0 1px 2px rgba(0,0,0,.02)',
      padding,
      ...style,
    }}>{children}</div>
  )
}

function Btn({ children, onClick, disabled, color, style = {} }) {
  const T = useT()
  const btnColor = color || T.blue
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '7px 16px', borderRadius: 999, border: 'none',
      fontSize: 13, fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: 'inherit',
      background: disabled ? T.sidebar : btnColor,
      color: disabled ? T.text4 : '#fff',
      opacity: disabled ? .6 : 1,
      display: 'inline-flex', alignItems: 'center', gap: 6,
      transition: 'opacity .15s',
      ...style,
    }}>{children}</button>
  )
}

function BtnSec({ children, onClick, style = {} }) {
  const T = useT()
  return (
    <button onClick={onClick} style={{
      padding: '7px 16px', borderRadius: 999,
      border: `.5px solid ${T.hairline}`, background: T.card,
      fontSize: 13, fontWeight: 500, cursor: 'pointer',
      fontFamily: 'inherit', color: T.text,
      display: 'inline-flex', alignItems: 'center', gap: 6,
      ...style,
    }}>{children}</button>
  )
}

const inp = (T) => ({
  width: '100%', padding: '8px 11px', borderRadius: 8,
  border: `.5px solid ${T.hairline}`, background: T.sidebar,
  fontSize: 13, color: T.text, fontFamily: 'inherit', outline: 'none',
})

function Field({ label, children }) {
  const T = useT()
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: T.text3, marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  )
}

function Input({ style = {}, ...props }) {
  const T = useT()
  return (
    <input style={{ ...inp(T), ...style }} {...props}
      onFocus={e => e.target.style.borderColor = T.blue}
      onBlur={e => e.target.style.borderColor = T.hairline} />
  )
}

function Sel({ children, style = {}, ...props }) {
  const T = useT()
  return <select style={{ ...inp(T), ...style }} {...props}>{children}</select>
}

function Toast({ msg }) {
  const T = useT()
  if (!msg) return null
  const ok = msg.type === 'success'
  return (
    <div style={{
      padding: '10px 14px',
      background: ok ? T.greenSoft : T.redSoft,
      border: `.5px solid ${ok ? T.green : T.red}`,
      borderRadius: 10, color: ok ? T.green : T.red,
      fontSize: 13, marginBottom: 14,
    }}>{msg.text}</div>
  )
}

// ───────────────────────────────────────────────────────────────
// BANDERA ESPAÑA SVG (limpia, sin emoji)
// ───────────────────────────────────────────────────────────────
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

// ───────────────────────────────────────────────────────────────
// PROFILE BUTTON
// ───────────────────────────────────────────────────────────────
// ───────────────────────────────────────────────────────────────
// DONUT CHART
// ───────────────────────────────────────────────────────────────
function DonutChart({ value, max, color, size = 80 }) {
  const T = useT()
  const pct = max > 0 ? Math.min(value / max, 1) : 0
  const r = 32, cx = size / 2, cy = size / 2
  const circ = 2 * Math.PI * r
  const dash = pct * circ
  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.sidebar} strokeWidth="8" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ / 4}
        strokeLinecap="round" style={{ transition: 'stroke-dasharray .6s ease' }} />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="13" fontWeight="600" fill={T.text} fontFamily={FONT}>
        {Math.round(pct * 100)}%
      </text>
    </svg>
  )
}

// ───────────────────────────────────────────────────────────────
// VERA INSIGHT INLINE — análisis automático, no chat
// ───────────────────────────────────────────────────────────────
function VeraInsight({ insight, loading, onOpenChat, onRegenerate }) {
  const T = useT()
  return (
    <Card padding={18}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg,#3D2BFF,#A5B1FF)',
            display: 'grid', placeItems: 'center', flexShrink: 0,
          }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" fill="#fff" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, letterSpacing: -0.2 }}>
              Vera — Análisis automático
            </div>
            <div style={{ fontSize: 11, color: T.text4 }}>
              Lee tu contabilidad y resume lo importante
            </div>
          </div>
        </div>
        <button onClick={onOpenChat} style={{
          padding: '5px 12px', borderRadius: 7,
          border: `.5px solid rgba(61,43,255,.18)`,
          background: 'rgba(61,43,255,.05)', color: T.blue,
          fontSize: 12, fontWeight: 500, cursor: 'pointer',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5,
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(61,43,255,.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(61,43,255,.05)'}
        >
          Abrir chat
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      {loading && (
        <div style={{
          padding: '20px', background: T.sidebar, borderRadius: 10,
          fontSize: 13, color: T.text4, textAlign: 'center',
        }}>
          Vera está analizando tus datos…
        </div>
      )}

      {insight && !loading && (
        <div style={{
          padding: '16px 18px',
          background: 'linear-gradient(180deg, rgba(61,43,255,.025), rgba(61,43,255,.01))',
          borderRadius: 10,
          border: `.5px solid rgba(61,43,255,.1)`,
          fontSize: 13, color: T.text2, lineHeight: 1.65,
          whiteSpace: 'pre-wrap',
        }}>
          {insight
            .replace(/#{1,4} /g, '')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/^- /gm, '• ')
            .replace(/^\d+\. /gm, '• ')
            .trim()}
        </div>
      )}

      {!insight && !loading && (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <button onClick={onRegenerate} style={{
            color: T.blue, background: 'none', border: 'none',
            cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
          }}>Generar análisis</button>
        </div>
      )}
    </Card>
  )
}

// ───────────────────────────────────────────────────────────────
// VERA DRAWER — chat lateral fullscreen estilo ChatGPT
// ───────────────────────────────────────────────────────────────
// ───────────────────────────────────────────────────────────────
// PILL TAB GROUP (segmented control estilo iOS)
// ───────────────────────────────────────────────────────────────
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
// DOWNLOAD MODAL
// ───────────────────────────────────────────────────────────────
function DownloadModal({ onClose, estadosPeriodo, downloadReport, downloadingReport }) {
  const T = useT()
  const reports = [
    { key: 'pl', title: 'Estado de Resultados', desc: 'P&L completo con análisis Vera', color: T.green },
    { key: 'balance', title: 'Balance General', desc: 'Activos, pasivos y patrimonio', color: T.blue },
    { key: 'flujo', title: 'Flujo de Efectivo', desc: 'Operativo, inversión, financiamiento', color: T.amber },
  ]
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)',
      backdropFilter: 'blur(8px)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 24,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: T.card, borderRadius: 20, padding: 28,
        width: '100%', maxWidth: 460,
        boxShadow: '0 24px 64px rgba(0,0,0,.15)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: T.text, letterSpacing: -0.3 }}>
            Descargar reportes PDF
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{
            background: 'none', border: 'none', fontSize: 22,
            cursor: 'pointer', color: T.text4, fontFamily: 'inherit',
          }}>×</button>
        </div>
        <div style={{ fontSize: 13, color: T.text3, marginBottom: 18 }}>
          Periodo: {estadosPeriodo.inicio} al {estadosPeriodo.fin}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          {reports.map(r => (
            <div key={r.key} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px', background: T.sidebar,
              borderRadius: 12, border: `.5px solid ${T.hairline}`,
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{r.title}</div>
                <div style={{ fontSize: 11, color: T.text4, marginTop: 2 }}>{r.desc}</div>
              </div>
              <Btn onClick={() => downloadReport(r.key)} disabled={downloadingReport === r.key}
                color={r.color} style={{ marginLeft: 12, padding: '6px 14px', borderRadius: 8, fontSize: 12 }}>
                {downloadingReport === r.key ? 'Generando…' : 'Descargar'}
              </Btn>
            </div>
          ))}
        </div>
        <BtnSec onClick={onClose} style={{ width: '100%', justifyContent: 'center' }}>Cerrar</BtnSec>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ───────────────────────────────────────────────────────────────
export default function Contabilidad() {
  const T = useT()
  const { theme } = useTheme()
  const router = useRouter()
  const [section, setSection] = useState('resumen')
  const [tab, setTab] = useState('ingreso')
  const [mode, setMode] = useState('manual')
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    categoria: '', descripcion: '', monto: '', referencia: '', iva_rate: 21,
  })
  const [loading, setLoading] = useState(false)
  const [loadErr, setLoadErr] = useState(false)
  const [msg, setMsg] = useState(null)
  const [registro, setRegistro] = useState(null)
  const [pdfFile, setPdfFile] = useState(null)
  const [pdfResult, setPdfResult] = useState(null)
  const [plantillaConfig, setPlantillaConfig] = useState({
    tipo_negocio: 'mixto',
    fecha: new Date().toISOString().split('T')[0],
  })
  const [estados, setEstados] = useState(null)
  const [estadosPeriodo, setEstadosPeriodo] = useState({
    inicio: new Date().toISOString().split('T')[0].substring(0, 8) + '01',
    fin: new Date().toISOString().split('T')[0],
  })
  const [ledger, setLedger] = useState(null)
  const [expandedAcc, setExpandedAcc] = useState(() => new Set())
  const toggleAcc = (code) => setExpandedAcc(prev => {
    const next = new Set(prev)
    next.has(code) ? next.delete(code) : next.add(code)
    return next
  })
  const [balanza, setBalanza] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [downloadingReport, setDownloadingReport] = useState(null)
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [periodo, setPeriodo] = useState('month')
  const [snapshotInfo, setSnapshotInfo] = useState(null)
  const [cuadre, setCuadre] = useState(null)
  const [veraOpen, setVeraOpen] = useState(false)
  const [veraInsight, setVeraInsight] = useState(null)
  const [veraInsightLoading, setVeraInsightLoading] = useState(false)

  // Asiento manual
  const [cuentas, setCuentas] = useState([])
  const [asiento, setAsiento] = useState(() => {
    const today = new Date().toISOString().split('T')[0]
    return {
      fecha: today, descripcion: '', referencia: '',
      lineas: [
        { account_code: '', debit: '', credit: '' },
        { account_code: '', debit: '', credit: '' },
      ],
    }
  })
  const [asientoLoading, setAsientoLoading] = useState(false)

  // IVA / 303
  const [iva, setIva] = useState(null)
  const [ivaLoading, setIvaLoading] = useState(false)
  const [ivaRange, setIvaRange] = useState(() => {
    const today = new Date().toISOString().split('T')[0]
    return { inicio: today.substring(0, 4) + '-01-01', fin: today }
  })

  // Libro mayor: rango (month | year | all)
  const [ledgerRange, setLedgerRange] = useState('month')

  const getToken = () => localStorage.getItem('vela_token')

  const categoriasIngreso = [
    { clave: 'ventas', nombre: 'Ventas' },
    { clave: 'servicios', nombre: 'Servicios' },
    { clave: 'otros_ingresos', nombre: 'Otros Ingresos' },
    { clave: 'intereses', nombre: 'Intereses' },
  ]
  const categoriasGasto = [
    { clave: 'nomina', nombre: 'Nómina' },
    { clave: 'alquiler', nombre: 'Alquiler' },
    { clave: 'marketing', nombre: 'Marketing' },
    { clave: 'suministros', nombre: 'Suministros' },
    { clave: 'software', nombre: 'Software' },
    { clave: 'servicios_basicos', nombre: 'Servicios Básicos' },
    { clave: 'servicios_profesionales', nombre: 'Servicios Profesionales' },
    { clave: 'impuestos', nombre: 'Impuestos' },
    { clave: 'otros_gastos', nombre: 'Otros Gastos' },
  ]

  useEffect(() => {
    const t = getToken()
    if (!t) { router.push('/login'); return }
    setToken(t)
    try {
      const p = JSON.parse(atob(t.split('.')[1]))
      setUser({ email: p.sub || '', name: p.name || p.sub || 'Usuario' })
    } catch {
      setUser({ email: '', name: 'Usuario' })
    }
    loadAll()
  }, [])

  async function loadAll() {
    loadRegistro()
    loadEstadosAuto('month')
    loadCuadre()
    loadVeraInsight()
    loadCuentas()
  }

  async function loadCuentas() {
    try {
      const res = await fetch(`${API}/api/contabilidad/cuentas`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (res.ok) { const d = await res.json(); setCuentas(d.cuentas || []) }
    } catch (e) { console.error('Error de red:', e) }
  }

  function loadRegistro() {
    const today = new Date().toISOString().split('T')[0]
    const monthStart = today.substring(0, 8) + '01'
    fetch(`${API}/api/contabilidad/registro?fecha_inicio=${monthStart}&fecha_fin=${today}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }).then(r => r.json()).then(setRegistro).catch(e => console.error('Error de red:', e))
  }

  function loadCuadre() {
    fetch(`${API}/api/contabilidad/balance-comprobacion`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }).then(r => r.ok ? r.json() : null).then(d => {
      if (d) setCuadre({ balanced: d.is_balanced, debe: d.total_debits, haber: d.total_credits })
    }).catch(e => console.error('Error de red:', e))
  }

  async function loadVeraInsight() {
    setVeraInsightLoading(true)
    try {
      const res = await fetch(`${API}/api/vera/insights/contabilidad`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (res.ok) {
        const d = await res.json()
        // La API devuelve {insights:[{label,text,tone}]}; el banner espera un string.
        const txt = Array.isArray(d.insights)
          ? d.insights.map(i => (i.label ? `${i.label}: ${i.text}` : i.text)).filter(Boolean).join('\n')
          : (typeof d.insight === 'string' ? d.insight : '')
        setVeraInsight(txt || null)
      }
    } catch { }
    setVeraInsightLoading(false)
  }

  async function loadEstadosAuto(p) {
    const period = p || periodo
    try {
      const res = await fetch(`${API}/api/contabilidad/snapshot?period=${period}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) throw new Error()
      const d = await res.json()
      setEstados(d.data)
      setSnapshotInfo({ cached: d.cached, label: d.label, generated_at: d.generated_at })
      setLoadErr(false)
    } catch { setLoadErr(true) }
  }

  async function refreshSnapshot() {
    await fetch(`${API}/api/contabilidad/snapshot/${periodo}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    setEstados(null)
    setSnapshotInfo(null)
    await loadEstadosAuto()
    loadVeraInsight()
  }

  async function loadEstados() {
    setLoading(true)
    const res = await fetch(`${API}/api/contabilidad/estados-financieros?fecha_inicio=${estadosPeriodo.inicio}&fecha_fin=${estadosPeriodo.fin}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    if (res.ok) setEstados(await res.json())
    setLoading(false)
  }

  async function submitManual(e) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    const endpoint = tab === 'ingreso' ? '/api/contabilidad/ingresos' : '/api/contabilidad/gastos'
    const res = await fetch(`${API}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ ...form, monto: parseFloat(form.monto) }),
    })
    const data = await res.json()
    if (res.ok) {
      setMsg({ type: 'success', text: `Registrado. Asiento: ${data.asiento_contable}` })
      setForm({
        fecha: new Date().toISOString().split('T')[0],
        categoria: '', descripcion: '', monto: '', referencia: '', iva_rate: form.iva_rate,
      })
      loadRegistro()
    } else {
      setMsg({ type: 'error', text: data.detail || 'Error al registrar' })
    }
    setLoading(false)
  }

  async function submitPDF(e) {
    e.preventDefault()
    if (!pdfFile) return
    setLoading(true)
    setMsg(null)
    setPdfResult(null)
    const fd = new FormData()
    fd.append('file', pdfFile)
    fd.append('auto_registrar', 'true')
    const res = await fetch(`${API}/api/contabilidad/leer-pdf`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: fd,
    })
    const data = await res.json()
    if (res.ok) {
      setPdfResult(data)
      setMsg({ type: 'success', text: `${data.total_registradas} transacciones registradas` })
      loadRegistro()
    } else {
      setMsg({ type: 'error', text: data.detail || 'Error procesando PDF' })
    }
    setLoading(false)
  }

  async function downloadPlantilla() {
    setLoading(true)
    const res = await fetch(`${API}/api/contabilidad/plantilla?fecha=${plantillaConfig.fecha}&tipo_negocio=${plantillaConfig.tipo_negocio}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cierre_caja_${plantillaConfig.fecha}.pdf`
      a.click()
      setMsg({ type: 'success', text: 'Plantilla descargada' })
    } else {
      setMsg({ type: 'error', text: 'Error generando plantilla' })
    }
    setLoading(false)
  }

  async function loadLedger(range = ledgerRange) {
    setLoading(true)
    setLedgerRange(range)
    // El backend ya sirve el histórico completo de forma eficiente (índices +
    // agregados). 'all' = sin filtro de fechas.
    const today = new Date().toISOString().split('T')[0]
    let qs = ''
    if (range === 'month') {
      qs = `?fecha_inicio=${today.substring(0, 8)}01&fecha_fin=${today}`
    } else if (range === 'year') {
      qs = `?fecha_inicio=${today.substring(0, 4)}-01-01&fecha_fin=${today}`
    }
    const res = await fetch(`${API}/api/contabilidad/libro-mayor${qs}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    if (res.ok) setLedger(await res.json())
    setLoading(false)
  }

  // ── Asiento manual ──
  function setLinea(idx, patch) {
    setAsiento(a => ({ ...a, lineas: a.lineas.map((l, i) => i === idx ? { ...l, ...patch } : l) }))
  }
  function addLinea() {
    setAsiento(a => ({ ...a, lineas: [...a.lineas, { account_code: '', debit: '', credit: '' }] }))
  }
  function removeLinea(idx) {
    setAsiento(a => ({ ...a, lineas: a.lineas.length > 2 ? a.lineas.filter((_, i) => i !== idx) : a.lineas }))
  }
  const asientoTotals = {
    debit: Math.round(asiento.lineas.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0) * 100) / 100,
    credit: Math.round(asiento.lineas.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0) * 100) / 100,
  }
  const asientoBalanced = asientoTotals.debit === asientoTotals.credit && asientoTotals.debit > 0

  async function submitAsiento(e) {
    e.preventDefault()
    const lineas = asiento.lineas
      .filter(l => l.account_code && ((parseFloat(l.debit) || 0) > 0 || (parseFloat(l.credit) || 0) > 0))
      .map(l => ({ account_code: l.account_code, debit: parseFloat(l.debit) || 0, credit: parseFloat(l.credit) || 0 }))
    if (lineas.length < 2) { setMsg({ type: 'error', text: 'Añade al menos 2 líneas con cuenta e importe' }); return }
    if (!asientoBalanced) {
      setMsg({ type: 'error', text: `El asiento no cuadra: debe €${asientoTotals.debit.toFixed(2)} ≠ haber €${asientoTotals.credit.toFixed(2)}` })
      return
    }
    setAsientoLoading(true); setMsg(null)
    try {
      const res = await fetch(`${API}/api/contabilidad/asiento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          fecha: asiento.fecha, descripcion: asiento.descripcion,
          referencia: asiento.referencia || null, lineas,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setMsg({ type: 'success', text: `Asiento registrado · ${data.transaction_id}` })
        setAsiento(a => ({
          ...a, descripcion: '', referencia: '',
          lineas: [{ account_code: '', debit: '', credit: '' }, { account_code: '', debit: '', credit: '' }],
        }))
        loadCuadre()
      } else {
        setMsg({ type: 'error', text: data.detail || 'Error registrando el asiento' })
      }
    } catch { setMsg({ type: 'error', text: 'Error de conexión' }) }
    finally { setAsientoLoading(false) }
  }

  // ── IVA / 303 ──
  async function loadIva() {
    if (!ivaRange.inicio || !ivaRange.fin) { setMsg({ type: 'error', text: 'Elige fecha de inicio y de fin' }); return }
    setIvaLoading(true); setMsg(null)
    try {
      const res = await fetch(`${API}/api/contabilidad/iva?fecha_inicio=${ivaRange.inicio}&fecha_fin=${ivaRange.fin}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) setIva(data)
      else setMsg({ type: 'error', text: (typeof data.detail === 'string' ? data.detail : 'No se pudo calcular el IVA del periodo') })
    } catch (e) { setMsg({ type: 'error', text: 'Error de conexión' }) }
    finally { setIvaLoading(false) }
  }

  async function loadBalanza() {
    setLoading(true)
    const res = await fetch(`${API}/api/contabilidad/balance-comprobacion`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    if (res.ok) setBalanza(await res.json())
    setLoading(false)
  }

  async function downloadReport(type) {
    setDownloadingReport(type)
    const urls = {
      pl: `${API}/api/contabilidad/reporte/estado-resultados?fecha_inicio=${estadosPeriodo.inicio}&fecha_fin=${estadosPeriodo.fin}`,
      balance: `${API}/api/contabilidad/reporte/balance-general?fecha=${estadosPeriodo.fin}`,
      flujo: `${API}/api/contabilidad/reporte/flujo-efectivo?fecha_inicio=${estadosPeriodo.inicio}&fecha_fin=${estadosPeriodo.fin}`,
    }
    const names = {
      pl: `estado_resultados_${estadosPeriodo.fin}.pdf`,
      balance: `balance_general_${estadosPeriodo.fin}.pdf`,
      flujo: `flujo_efectivo_${estadosPeriodo.fin}.pdf`,
    }
    const res = await fetch(urls[type], {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = names[type]
      a.click()
    }
    setDownloadingReport(null)
  }

  const categorias = tab === 'ingreso' ? categoriasIngreso : categoriasGasto
  const pl = estados?.estado_de_resultados
  const bal = estados?.balance_general
  const flujo = estados?.flujo_de_efectivo
  const salud = estados?.puntaje_salud_financiera

  const sections = [
    { key: 'resumen', label: 'Resumen' },
    { key: 'estados', label: 'Estados financieros' },
    { key: 'registro', label: 'Registro diario' },
    { key: 'asiento', label: 'Asiento manual' },
    { key: 'libros', label: 'Libros' },
    { key: 'iva', label: 'IVA / 303' },
  ]

  const periodos = [
    { key: 'month', label: 'Este mes' },
    { key: 'quarter', label: 'Trimestre' },
    { key: 'year', label: 'Este año' },
  ]

  return (
    <div style={{
      minHeight: '100dvh', background: T.bg, display: 'flex',
      fontFamily: FONT, WebkitFontSmoothing: 'antialiased',
    }}>
      <style>{`
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-thumb{background:${T.hairline};border-radius:999px}
        ::-webkit-scrollbar-thumb:hover{background:${T.text4}}
        input:focus,select:focus{border-color:${T.blue}!important;outline:none}
        @media (max-width:768px){
          .cont-row{grid-template-columns:1fr!important}
        }
        @media (prefers-reduced-motion: reduce){
          *{animation:none!important;transition:none!important}
        }
      `}</style>

      <Sidebar active="/contabilidad" />

      <VeraDrawer open={veraOpen} onClose={() => setVeraOpen(false)} token={token} />

      {showModal && (
        <DownloadModal onClose={() => setShowModal(false)}
          estadosPeriodo={estadosPeriodo}
          downloadReport={downloadReport}
          downloadingReport={downloadingReport} />
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <PageHeader
          title={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Contabilidad
              {cuadre && (
                <span
                  title={cuadre.balanced
                    ? `Libro cuadrado · DEBE €${cuadre.debe?.toLocaleString('es-ES')} = HABER €${cuadre.haber?.toLocaleString('es-ES')}`
                    : `Descuadre · DEBE €${cuadre.debe?.toLocaleString('es-ES')} vs HABER €${cuadre.haber?.toLocaleString('es-ES')}`}
                  style={{
                    width: 7, height: 7, borderRadius: 999,
                    background: cuadre.balanced ? T.green : T.red,
                    boxShadow: `0 0 0 3px ${cuadre.balanced ? 'rgba(52,199,89,.15)' : 'rgba(255,59,48,.15)'}`,
                  }} />
              )}
            </span>
          }
          subtitle={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <FlagES size={12} />
              <span>España · PGC RD 1514/2007</span>
            </span>
          }
          tabs={sections}
          activeTab={section}
          onTab={(s) => { setMsg(null); setSection(s) }}
          primary={undefined}
          onVera={() => setVeraOpen(true)}
          user={user}
          router={router}
        />

        {/* ═══════════════ CONTENIDO ═══════════════ */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          <ErrorBanner show={loadErr && !estados} onRetry={() => loadEstadosAuto()} />

          {/* ──── RESUMEN ──── */}
          {section === 'resumen' && (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: 18,
              }}>
                <PillGroup items={periodos} active={periodo}
                  onChange={p => {
                    setPeriodo(p)
                    setEstados(null)
                    setSnapshotInfo(null)
                    loadEstadosAuto(p)
                  }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {snapshotInfo && (
                    <span style={{ fontSize: 11, color: T.text4 }}>
                      {snapshotInfo.cached ? 'Guardado' : 'Generado'} · {new Date(snapshotInfo.generated_at).toLocaleDateString('es-ES')}
                    </span>
                  )}
                  <button onClick={refreshSnapshot} style={{
                    padding: '6px 14px', borderRadius: 999,
                    border: `.5px solid ${T.hairline}`, background: T.card,
                    color: T.text2, fontSize: 12, fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>Actualizar</button>
                </div>
              </div>

              {/* KPI STRIP — números sutiles, sin grito de color */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12, marginBottom: 16,
              }}>
                {[
                  {
                    label: 'Ingresos',
                    value: `€${(pl?.ingresos?.total_ingresos || 0).toLocaleString('es-ES')}`,
                    sub: `Margen ${pl?.margen_utilidad_porcentaje || 0}%`,
                    trend: 'up',
                  },
                  {
                    label: 'Gastos',
                    value: `€${(pl?.gastos?.total_gastos || 0).toLocaleString('es-ES')}`,
                    sub: 'Últimos 30 días',
                  },
                  {
                    label: 'Resultado neto',
                    value: `€${(pl?.utilidad_neta || 0).toLocaleString('es-ES')}`,
                    sub: pl?.es_rentable ? 'Rentable' : 'No rentable',
                    trend: (pl?.utilidad_neta || 0) >= 0 ? 'up' : 'down',
                  },
                  {
                    label: 'Salud financiera',
                    value: `${salud?.puntaje || 0}/10`,
                    sub: salud?.calificacion || '—',
                  },
                ].map((k, i) => (
                  <Card key={i} padding={20}>
                    <div style={{
                      fontSize: 12, color: T.text3, fontWeight: 400,
                      marginBottom: 14, letterSpacing: 0,
                    }}>{k.label}</div>
                    <div style={{
                      fontSize: 28, fontWeight: 500, letterSpacing: -0.7,
                      color: T.text, fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1,
                    }}>{k.value}</div>
                    <div style={{
                      fontSize: 11.5, color: T.text4,
                      marginTop: 8, fontWeight: 400,
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
                  </Card>
                ))}
              </div>

              {/* P&L + Balance */}
              <div className="cont-row" style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: 14, marginBottom: 14,
              }}>
                <Card>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: 16,
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: -0.2 }}>
                        Estado de Resultados
                      </div>
                      <div style={{ fontSize: 11, color: T.text4, marginTop: 2 }}>
                        Ingresos vs Gastos del período
                      </div>
                    </div>
                  </div>
                  {pl?.ingresos?.cuentas && (
                    <div style={{ marginBottom: 12 }}>
                      {Object.entries(pl.ingresos.cuentas).map(([k, v]) => (
                        <div key={k} style={{
                          display: 'flex', justifyContent: 'space-between',
                          padding: '8px 0', borderBottom: `.5px solid ${T.soft}`,
                        }}>
                          <span style={{ fontSize: 12.5, color: T.text2 }}>
                            {typeof v === 'object' ? v.nombre : k}
                          </span>
                          <span style={{
                            fontSize: 12.5, fontWeight: 500,
                            color: T.text, fontVariantNumeric: 'tabular-nums',
                          }}>+€{(typeof v === 'number' ? v : v?.saldo || v?.balance || 0).toLocaleString('es-ES')}</span>
                        </div>
                      ))}
                      {Object.entries(pl.gastos?.cuentas || {}).map(([k, v]) => (
                        <div key={k} style={{
                          display: 'flex', justifyContent: 'space-between',
                          padding: '8px 0', borderBottom: `.5px solid ${T.soft}`,
                        }}>
                          <span style={{ fontSize: 12.5, color: T.text2 }}>
                            {typeof v === 'object' ? v.nombre : k}
                          </span>
                          <span style={{
                            fontSize: 12.5, fontWeight: 500,
                            color: T.text3, fontVariantNumeric: 'tabular-nums',
                          }}>-€{(typeof v === 'number' ? v : v?.saldo || v?.balance || 0).toLocaleString('es-ES')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', padding: '14px 16px',
                    background: T.sidebar, borderRadius: 10, marginTop: 12,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>Utilidad neta</span>
                    <span style={{
                      fontSize: 20, fontWeight: 600, color: T.text,
                      fontVariantNumeric: 'tabular-nums', letterSpacing: -0.4,
                    }}>€{(pl?.utilidad_neta || 0).toLocaleString('es-ES')}</span>
                  </div>
                </Card>

                <Card>
                  <div style={{
                    fontSize: 14, fontWeight: 600, color: T.text,
                    letterSpacing: -0.2, marginBottom: 4,
                  }}>Balance General</div>
                  <div style={{ fontSize: 11, color: T.text4, marginBottom: 16 }}>
                    Activos = Pasivos + Patrimonio
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'center',
                    gap: 24, marginBottom: 16,
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <DonutChart value={bal?.activos?.total_activos || 0}
                        max={Math.max(bal?.activos?.total_activos || 1, 1)} color={T.blue} />
                      <div style={{ fontSize: 11, color: T.text4, marginTop: 6 }}>Activos</div>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: T.text,
                        fontVariantNumeric: 'tabular-nums', marginTop: 2,
                      }}>€{(bal?.activos?.total_activos || 0).toLocaleString('es-ES')}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <DonutChart value={bal?.pasivos?.total_pasivos || 0}
                        max={Math.max(bal?.activos?.total_activos || 1, 1)} color={T.text3} />
                      <div style={{ fontSize: 11, color: T.text4, marginTop: 6 }}>Pasivos</div>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: T.text,
                        fontVariantNumeric: 'tabular-nums', marginTop: 2,
                      }}>€{(bal?.pasivos?.total_pasivos || 0).toLocaleString('es-ES')}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <DonutChart value={bal?.patrimonio?.total_patrimonio || 0}
                        max={Math.max(bal?.activos?.total_activos || 1, 1)} color={T.green} />
                      <div style={{ fontSize: 11, color: T.text4, marginTop: 6 }}>Patrimonio</div>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: T.text,
                        fontVariantNumeric: 'tabular-nums', marginTop: 2,
                      }}>€{(bal?.patrimonio?.total_patrimonio || 0).toLocaleString('es-ES')}</div>
                    </div>
                  </div>
                  <div style={{
                    padding: '10px 14px',
                    background: bal?.ecuacion_balanceada ? 'rgba(52,199,89,.06)' : 'rgba(255,59,48,.06)',
                    borderRadius: 10,
                    border: `.5px solid ${bal?.ecuacion_balanceada ? 'rgba(52,199,89,.2)' : 'rgba(255,59,48,.2)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                    {bal?.ecuacion_balanceada ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth="2.5" strokeLinecap="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    )}
                    <span style={{
                      fontSize: 12.5, fontWeight: 500,
                      color: bal?.ecuacion_balanceada ? T.green : T.red,
                    }}>{bal?.ecuacion_balanceada ? 'Ecuación balanceada' : 'Ecuación no balanceada'}</span>
                  </div>
                  {flujo && (
                    <div style={{
                      marginTop: 12, display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8,
                    }}>
                      {[
                        { label: 'Flujo operativo', value: flujo.actividades_operativas?.flujo_operativo_neto || 0 },
                        { label: 'Cambio neto', value: flujo.cambio_neto_efectivo || 0 },
                      ].map((s, i) => (
                        <div key={i} style={{
                          padding: '10px', background: T.sidebar,
                          borderRadius: 9, border: `.5px solid ${T.hairline}`,
                          textAlign: 'center',
                        }}>
                          <div style={{ fontSize: 11, color: T.text4, marginBottom: 3 }}>{s.label}</div>
                          <div style={{
                            fontSize: 14, fontWeight: 600, color: T.text,
                            fontVariantNumeric: 'tabular-nums',
                          }}>€{s.value.toLocaleString('es-ES')}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {/* VERA INSIGHT + MOVIMIENTOS */}
              <div className="cont-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <VeraInsight insight={veraInsight} loading={veraInsightLoading}
                  onOpenChat={() => setVeraOpen(true)} onRegenerate={loadVeraInsight} />
                <Card>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: 14,
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: -0.2 }}>
                        Movimientos recientes
                      </div>
                      <div style={{ fontSize: 11, color: T.text4, marginTop: 2 }}>Últimas transacciones</div>
                    </div>
                    <button onClick={() => { setMsg(null); setSection('registro') }} style={{
                      background: 'none', border: 'none', color: T.blue,
                      fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                    }}>Ver todo</button>
                  </div>
                  <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                    {registro && [...(registro.ingresos || []).map(r => ({ ...r, tipo: 'ingreso' })),
                    ...(registro.gastos || []).map(r => ({ ...r, tipo: 'gasto' }))]
                      .sort((a, b) => b.fecha.localeCompare(a.fecha))
                      .slice(0, 10).map((r, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 0', borderBottom: `.5px solid ${T.soft}`,
                        }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{r.descripcion}</div>
                            <div style={{ fontSize: 11, color: T.text4 }}>{r.fecha} · {r.categoria}</div>
                          </div>
                          <span style={{
                            fontSize: 13, fontWeight: 500,
                            color: r.tipo === 'ingreso' ? T.text : T.text3,
                            fontVariantNumeric: 'tabular-nums',
                          }}>{r.tipo === 'ingreso' ? '+' : '-'}€{r.monto}</span>
                        </div>
                      ))}
                    {!registro && (
                      <div style={{ padding: 32, textAlign: 'center', color: T.text4, fontSize: 13 }}>
                        Cargando…
                      </div>
                    )}
                    {registro && (registro.ingresos?.length || 0) + (registro.gastos?.length || 0) === 0 && (
                      <div style={{ padding: 32, textAlign: 'center', color: T.text4, fontSize: 13 }}>
                        Sin transacciones este mes
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ──── ESTADOS FINANCIEROS ──── */}
          {section === 'estados' && (
            <div>
              <Card style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
                  <Field label="Desde">
                    <Input type="date" value={estadosPeriodo.inicio}
                      onChange={e => setEstadosPeriodo({ ...estadosPeriodo, inicio: e.target.value })}
                      style={{ width: 160 }} />
                  </Field>
                  <Field label="Hasta">
                    <Input type="date" value={estadosPeriodo.fin}
                      onChange={e => setEstadosPeriodo({ ...estadosPeriodo, fin: e.target.value })}
                      style={{ width: 160 }} />
                  </Field>
                  <div style={{ display: 'flex', gap: 8, paddingBottom: 12 }}>
                    <Btn onClick={loadEstados} disabled={loading}>
                      {loading ? 'Generando…' : 'Generar estados'}
                    </Btn>
                    {estados && (
                      <Btn onClick={() => setShowModal(true)} color={T.green}>Descargar PDF</Btn>
                    )}
                  </div>
                </div>
              </Card>

              {estados && (
                <>
                  <Card style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: -0.2 }}>
                          Salud financiera
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                          {salud?.factores?.map((f, i) => (
                            <span key={i} style={{
                              padding: '3px 10px', background: T.sidebar,
                              borderRadius: 999, fontSize: 11, color: T.text2,
                              border: `.5px solid ${T.hairline}`,
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                            }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontSize: 38, fontWeight: 600, letterSpacing: -1.2,
                          color: T.text, fontVariantNumeric: 'tabular-nums',
                        }}>{salud?.puntaje || 0}</div>
                        <div style={{ fontSize: 12, color: T.text3 }}>de 10 — {salud?.calificacion}</div>
                      </div>
                    </div>
                  </Card>

                  <Card style={{ marginBottom: 14 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', marginBottom: 16,
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: -0.2 }}>
                          Estado de Resultados
                        </div>
                        <div style={{ fontSize: 11, color: T.text4 }}>
                          {estadosPeriodo.inicio} al {estadosPeriodo.fin}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontSize: 22, fontWeight: 600, color: T.text,
                          fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5,
                        }}>€{(pl?.utilidad_neta || 0).toLocaleString('es-ES')}</div>
                        <div style={{ fontSize: 11, color: T.text4 }}>
                          Utilidad neta · {pl?.margen_utilidad_porcentaje || 0}% margen
                        </div>
                      </div>
                    </div>
                    <div className="cont-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div>
                        {[
                          { label: 'Total Ingresos', value: `€${(pl?.ingresos?.total_ingresos || 0).toLocaleString('es-ES')}` },
                          { label: 'Total Gastos', value: `€${(pl?.gastos?.total_gastos || 0).toLocaleString('es-ES')}` },
                          { label: 'EBITDA', value: `€${(pl?.ebitda || 0).toLocaleString('es-ES')}` },
                          { label: 'Utilidad Neta', value: `€${(pl?.utilidad_neta || 0).toLocaleString('es-ES')}` },
                          { label: 'Margen', value: `${pl?.margen_utilidad_porcentaje || 0}%` },
                        ].map((row, i) => (
                          <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between',
                            padding: '10px 0', borderBottom: `.5px solid ${T.soft}`,
                          }}>
                            <span style={{ fontSize: 12.5, color: T.text3 }}>{row.label}</span>
                            <span style={{
                              fontSize: 13, fontWeight: 600, color: T.text,
                              fontVariantNumeric: 'tabular-nums',
                            }}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{
                        padding: '14px',
                        background: 'linear-gradient(180deg, rgba(61,43,255,.04), rgba(61,43,255,.01))',
                        borderRadius: 12, border: `.5px solid rgba(61,43,255,.1)`,
                      }}>
                        <div style={{
                          fontSize: 11, fontWeight: 500, color: T.blue,
                          marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase',
                        }}>Vera analiza</div>
                        <div style={{ fontSize: 12.5, color: T.text2, lineHeight: 1.65 }}>
                          {pl?.analisis_ia || 'Generando análisis…'}
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card style={{ marginBottom: 14 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', marginBottom: 16,
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: -0.2 }}>
                        Balance General
                      </div>
                      <span style={{
                        padding: '4px 12px',
                        background: bal?.ecuacion_balanceada ? 'rgba(52,199,89,.08)' : 'rgba(255,59,48,.08)',
                        color: bal?.ecuacion_balanceada ? T.green : T.red,
                        borderRadius: 999, fontSize: 11.5, fontWeight: 500,
                      }}>{bal?.ecuacion_balanceada ? 'Balanceado' : 'No balanceado'}</span>
                    </div>
                    <div className="cont-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div>
                        {[
                          { label: 'Total Activos', value: `€${(bal?.activos?.total_activos || 0).toLocaleString('es-ES')}` },
                          { label: 'Total Pasivos', value: `€${(bal?.pasivos?.total_pasivos || 0).toLocaleString('es-ES')}` },
                          { label: 'Total Patrimonio', value: `€${(bal?.patrimonio?.total_patrimonio || 0).toLocaleString('es-ES')}` },
                          { label: 'Pasivos + Patrimonio', value: `€${(bal?.total_pasivos_y_patrimonio || 0).toLocaleString('es-ES')}` },
                        ].map((row, i) => (
                          <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between',
                            padding: '10px 0', borderBottom: `.5px solid ${T.soft}`,
                          }}>
                            <span style={{ fontSize: 12.5, color: T.text3 }}>{row.label}</span>
                            <span style={{
                              fontSize: 13, fontWeight: 600, color: T.text,
                              fontVariantNumeric: 'tabular-nums',
                            }}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{
                        padding: '14px',
                        background: 'linear-gradient(180deg, rgba(61,43,255,.04), rgba(61,43,255,.01))',
                        borderRadius: 12, border: `.5px solid rgba(61,43,255,.1)`,
                      }}>
                        <div style={{
                          fontSize: 11, fontWeight: 500, color: T.blue,
                          marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase',
                        }}>Vera analiza</div>
                        <div style={{ fontSize: 12.5, color: T.text2, lineHeight: 1.65 }}>
                          {bal?.analisis_ia || 'Generando análisis…'}
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: -0.2, marginBottom: 16 }}>
                      Flujo de Efectivo
                    </div>
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: 10, marginBottom: 14,
                    }}>
                      {[
                        { label: 'Operativo', value: flujo?.actividades_operativas?.flujo_operativo_neto || 0 },
                        { label: 'Inversión', value: flujo?.actividades_inversion?.flujo_inversion_neto || 0 },
                        { label: 'Financiamiento', value: flujo?.actividades_financiamiento?.flujo_financiamiento_neto || 0 },
                        { label: 'Cambio neto', value: flujo?.cambio_neto_efectivo || 0, highlight: true },
                      ].map((s, i) => (
                        <div key={i} style={{
                          padding: '12px',
                          background: s.highlight ? T.sidebar : T.bg,
                          borderRadius: 10,
                          border: `.5px solid ${T.hairline}`, textAlign: 'center',
                        }}>
                          <div style={{ fontSize: 11, color: T.text4, marginBottom: 4 }}>{s.label}</div>
                          <div style={{
                            fontSize: 15, fontWeight: 600, color: T.text,
                            fontVariantNumeric: 'tabular-nums',
                          }}>€{s.value.toLocaleString('es-ES')}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{
                      padding: '14px',
                      background: 'linear-gradient(180deg, rgba(61,43,255,.04), rgba(61,43,255,.01))',
                      borderRadius: 12, border: `.5px solid rgba(61,43,255,.1)`,
                    }}>
                      <div style={{
                        fontSize: 11, fontWeight: 500, color: T.blue,
                        marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase',
                      }}>Vera analiza</div>
                      <div style={{ fontSize: 12.5, color: T.text2, lineHeight: 1.65 }}>
                        {flujo?.analisis_ia || '—'}
                      </div>
                    </div>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* ──── REGISTRO DIARIO ──── */}
          {section === 'registro' && (
            <>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 10, marginBottom: 16,
              }}>
                {[
                  { key: 'manual', label: 'Registro manual', desc: 'Ingreso o gasto manualmente' },
                  { key: 'pdf', label: 'Subir PDF a Vera', desc: 'Vera extrae las transacciones' },
                  { key: 'plantilla', label: 'Cierre de caja', desc: 'Plantilla oficial con QR' },
                ].map(m => (
                  <button key={m.key} onClick={() => { setMode(m.key); setMsg(null) }} style={{
                    padding: '14px 16px',
                    border: `.5px solid ${mode === m.key ? T.blue : T.hairline}`,
                    borderRadius: 12,
                    background: mode === m.key ? 'rgba(61,43,255,.04)' : T.card,
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all .15s', fontFamily: 'inherit',
                  }}>
                    <div style={{
                      fontSize: 13, fontWeight: 500,
                      color: mode === m.key ? T.blue : T.text, marginBottom: 3,
                    }}>{m.label}</div>
                    <div style={{ fontSize: 11, color: T.text4 }}>{m.desc}</div>
                  </button>
                ))}
              </div>

              <div className="cont-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Card>
                  {mode === 'manual' && (
                    <>
                      <div style={{
                        fontSize: 14, fontWeight: 600, color: T.text,
                        letterSpacing: -0.2, marginBottom: 14,
                      }}>Registro manual</div>
                      <div style={{
                        display: 'flex', marginBottom: 14,
                        background: T.sidebar, borderRadius: 8, padding: 3,
                      }}>
                        {['ingreso', 'gasto'].map(t => (
                          <button key={t} onClick={() => { setTab(t); setForm({ ...form, categoria: '' }) }} style={{
                            flex: 1, padding: '7px', border: 'none',
                            cursor: 'pointer', borderRadius: 6, fontSize: 13,
                            fontWeight: t === tab ? 500 : 400,
                            background: t === tab ? T.card : 'transparent',
                            color: t === tab ? T.text : T.text3,
                            boxShadow: t === tab ? '0 .5px 1px rgba(0,0,0,.06),0 1px 3px rgba(0,0,0,.04)' : 'none',
                            transition: 'all .15s', fontFamily: 'inherit',
                          }}>{t === 'ingreso' ? 'Ingreso' : 'Gasto'}</button>
                        ))}
                      </div>
                      <form onSubmit={submitManual}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px', gap: 12 }}>
                          <Field label="Fecha">
                            <Input type="date" value={form.fecha}
                              onChange={e => setForm({ ...form, fecha: e.target.value })} required />
                          </Field>
                          <Field label="Monto € (IVA incl.)">
                            <Input type="number" step="0.01" placeholder="0.00"
                              value={form.monto}
                              onChange={e => setForm({ ...form, monto: e.target.value })} required />
                          </Field>
                          <Field label="IVA %">
                            <Sel value={form.iva_rate}
                              onChange={e => setForm({ ...form, iva_rate: Number(e.target.value) })}>
                              {[21, 10, 4, 0].map(r => <option key={r} value={r}>{r}%</option>)}
                            </Sel>
                          </Field>
                        </div>
                        <Field label="Categoría">
                          <Sel value={form.categoria}
                            onChange={e => setForm({ ...form, categoria: e.target.value })} required>
                            <option value="">Selecciona categoría</option>
                            {categorias.map(c => <option key={c.clave} value={c.clave}>{c.nombre}</option>)}
                          </Sel>
                        </Field>
                        <Field label="Descripción">
                          <Input type="text" placeholder="Describe la transacción…"
                            value={form.descripcion}
                            onChange={e => setForm({ ...form, descripcion: e.target.value })} required />
                        </Field>
                        <Field label="Referencia (opcional)">
                          <Input type="text" placeholder="Nº factura…"
                            value={form.referencia}
                            onChange={e => setForm({ ...form, referencia: e.target.value })} />
                        </Field>
                        <Toast msg={msg} />
                        <Btn disabled={loading}
                          style={{ width: '100%', justifyContent: 'center', borderRadius: 10, padding: '10px' }}>
                          {loading ? 'Registrando…' : `Registrar ${tab}`}
                        </Btn>
                      </form>
                    </>
                  )}
                  {mode === 'pdf' && (
                    <>
                      <div style={{
                        fontSize: 14, fontWeight: 600, color: T.text,
                        letterSpacing: -0.2, marginBottom: 4,
                      }}>Subir PDF a Vera</div>
                      <div style={{ fontSize: 12.5, color: T.text3, marginBottom: 14 }}>
                        Vera analiza el documento y registra las transacciones automáticamente.
                      </div>
                      <form onSubmit={submitPDF}>
                        <div style={{
                          border: `1.5px dashed ${pdfFile ? T.green : T.hairline}`,
                          borderRadius: 12, padding: '28px 24px',
                          textAlign: 'center', marginBottom: 14,
                          background: pdfFile ? T.greenSoft : T.sidebar,
                          cursor: 'pointer', transition: 'all .2s',
                        }} onClick={() => document.getElementById('pdfInput').click()}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: T.text, marginBottom: 4 }}>
                            {pdfFile ? pdfFile.name : 'Selecciona un PDF'}
                          </div>
                          <div style={{ fontSize: 11, color: T.text4 }}>
                            Factura, estado de cuenta, cierre de caja
                          </div>
                          <input id="pdfInput" type="file" accept=".pdf"
                            style={{ display: 'none' }}
                            onChange={e => setPdfFile(e.target.files[0])} />
                        </div>
                        <Toast msg={msg} />
                        <Btn disabled={loading || !pdfFile}
                          style={{ width: '100%', justifyContent: 'center', borderRadius: 10, padding: '10px' }}>
                          {loading ? 'Vera está analizando…' : 'Procesar con Vera'}
                        </Btn>
                      </form>
                      {pdfResult && (
                        <div style={{
                          marginTop: 12, padding: '10px 14px',
                          background: T.greenSoft, borderRadius: 10,
                          border: `.5px solid ${T.green}`,
                          fontSize: 13, color: T.green,
                        }}>{pdfResult.total_registradas} transacciones registradas</div>
                      )}
                    </>
                  )}
                  {mode === 'plantilla' && (
                    <>
                      <div style={{
                        fontSize: 14, fontWeight: 600, color: T.text,
                        letterSpacing: -0.2, marginBottom: 4,
                      }}>Cierre de caja oficial</div>
                      <div style={{ fontSize: 12.5, color: T.text3, marginBottom: 14 }}>
                        Plantilla con QR cifrado para cumplimiento legal.
                      </div>
                      <Field label="Fecha">
                        <Input type="date" value={plantillaConfig.fecha}
                          onChange={e => setPlantillaConfig({ ...plantillaConfig, fecha: e.target.value })} />
                      </Field>
                      <Field label="Tipo de negocio">
                        <Sel value={plantillaConfig.tipo_negocio}
                          onChange={e => setPlantillaConfig({ ...plantillaConfig, tipo_negocio: e.target.value })}>
                          <option value="mixto">Mixto</option>
                          <option value="restaurante">Restaurante / Bar</option>
                          <option value="tienda">Tienda / Comercio</option>
                          <option value="servicios">Servicios</option>
                        </Sel>
                      </Field>
                      <div style={{
                        padding: '10px 14px', background: T.sidebar,
                        borderRadius: 10, border: `.5px solid ${T.hairline}`,
                        marginBottom: 14,
                      }}>
                        {[
                          'Ventas por departamento con IVA',
                          'Métodos de pago',
                          'Arqueo de caja',
                          'Análisis Vera',
                          'QR cifrado',
                        ].map((item, i) => (
                          <div key={i} style={{
                            fontSize: 12, color: T.text3, marginBottom: 3,
                            display: 'flex', gap: 6, alignItems: 'center',
                          }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden="true">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                            {item}
                          </div>
                        ))}
                      </div>
                      <Toast msg={msg} />
                      <Btn onClick={downloadPlantilla} disabled={loading}
                        style={{ width: '100%', justifyContent: 'center', borderRadius: 10, padding: '10px' }}>
                        {loading ? 'Generando…' : 'Descargar plantilla'}
                      </Btn>
                    </>
                  )}
                </Card>

                <Card>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: 14,
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: -0.2 }}>
                        Registro del mes
                      </div>
                      <div style={{ fontSize: 11, color: T.text4 }}>Transacciones registradas</div>
                    </div>
                  </div>
                  {registro && (
                    <>
                      <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
                        gap: 8, marginBottom: 14,
                      }}>
                        {[
                          { label: 'Ingresos', value: `€${registro.resumen?.total_ingresos || 0}` },
                          { label: 'Gastos', value: `€${registro.resumen?.total_gastos || 0}` },
                          { label: 'Neto', value: `€${registro.resumen?.resultado_neto || 0}` },
                        ].map((s, i) => (
                          <div key={i} style={{
                            padding: '10px', background: T.sidebar,
                            borderRadius: 10, border: `.5px solid ${T.hairline}`,
                            textAlign: 'center',
                          }}>
                            <div style={{ fontSize: 11, color: T.text4, marginBottom: 3 }}>{s.label}</div>
                            <div style={{
                              fontSize: 14, fontWeight: 600, color: T.text,
                              fontVariantNumeric: 'tabular-nums',
                            }}>{s.value}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                        {[...(registro.ingresos || []).map(r => ({ ...r, tipo: 'ingreso' })),
                        ...(registro.gastos || []).map(r => ({ ...r, tipo: 'gasto' }))]
                          .sort((a, b) => b.fecha.localeCompare(a.fecha))
                          .map((r, i) => (
                            <div key={i} style={{
                              display: 'flex', alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 0', borderBottom: `.5px solid ${T.soft}`,
                            }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{r.descripcion}</div>
                                <div style={{ fontSize: 11, color: T.text4 }}>{r.fecha} · {r.categoria}</div>
                              </div>
                              <span style={{
                                fontSize: 13, fontWeight: 500,
                                color: r.tipo === 'ingreso' ? T.text : T.text3,
                                fontVariantNumeric: 'tabular-nums',
                              }}>{r.tipo === 'ingreso' ? '+' : '-'}€{r.monto}</span>
                            </div>
                          ))}
                        {(registro.ingresos?.length || 0) + (registro.gastos?.length || 0) === 0 && (
                          <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: T.text4 }}>
                            Sin transacciones este mes
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </Card>
              </div>
            </>
          )}

          {/* ──── LIBROS ──── */}
          {section === 'libros' && (
            <div>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 14, marginBottom: 16,
              }}>
                <Btn onClick={() => loadLedger()} disabled={loading}>
                  {loading ? 'Cargando…' : 'Cargar libro mayor'}
                </Btn>
                <Btn onClick={loadBalanza} disabled={loading} color={T.amber}>
                  {loading ? 'Cargando…' : 'Cargar balanza'}
                </Btn>
              </div>

              {/* Rango del libro mayor (el backend ya sirve el histórico completo) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 12, color: T.text4 }}>Periodo del libro mayor:</span>
                {[
                  { key: 'month', label: 'Este mes' },
                  { key: 'year', label: 'Este año' },
                  { key: 'all', label: 'Todo el histórico' },
                ].map(r => (
                  <button key={r.key} onClick={() => loadLedger(r.key)} disabled={loading} style={{
                    padding: '5px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 12, fontWeight: ledgerRange === r.key ? 600 : 400,
                    border: `.5px solid ${ledgerRange === r.key ? T.blue : T.hairline}`,
                    background: ledgerRange === r.key ? 'rgba(61,43,255,.08)' : T.card,
                    color: ledgerRange === r.key ? T.blue : T.text3,
                  }}>{r.label}</button>
                ))}
              </div>

              {ledger && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 600, color: T.text,
                    marginBottom: 12, letterSpacing: -0.2,
                  }}>Libro Mayor — {ledger.total_accounts} cuentas</div>
                  {ledger.ledger?.map((account, i) => {
                    const isOpen = expandedAcc.has(account.account_code)
                    const nEntries = account.entries_total ?? account.entries?.length ?? 0
                    return (
                    <Card key={i} style={{ marginBottom: 10 }} padding={16}>
                      <button
                        onClick={() => toggleAcc(account.account_code)}
                        aria-expanded={isOpen}
                        aria-label={`${account.account_code} ${account.account_name} — ${nEntries} asientos`}
                        style={{
                          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                          fontFamily: 'inherit', padding: 0,
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.text4}
                            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }}>
                            <path d="M9 6l6 6-6 6" />
                          </svg>
                          <span style={{
                            fontSize: 12, fontWeight: 600, color: T.blue,
                            background: 'rgba(61,43,255,.08)',
                            padding: '2px 8px', borderRadius: 999, flexShrink: 0,
                          }}>{account.account_code}</span>
                          <span style={{ fontSize: 13, fontWeight: 500, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{account.account_name}</span>
                          <span style={{
                            fontSize: 11, color: T.text3, background: T.sidebar,
                            padding: '2px 8px', borderRadius: 999, flexShrink: 0,
                            border: `.5px solid ${T.hairline}`,
                          }}>{nEntries} {nEntries === 1 ? 'asiento' : 'asientos'}</span>
                        </div>
                        <span style={{
                          fontSize: 14, fontWeight: 600, color: T.text,
                          fontVariantNumeric: 'tabular-nums', flexShrink: 0, marginLeft: 12,
                        }}>€{account.closing_balance?.toFixed(2)}</span>
                      </button>
                      {isOpen && (
                      <div style={{ maxHeight: 280, overflowY: 'auto', marginTop: 12 }}>
                        {account.truncated && (
                          <div style={{ fontSize: 11, color: T.amber, marginBottom: 8 }}>
                            Mostrando los {account.entries?.length} asientos más recientes de {nEntries}. El saldo es exacto sobre el total.
                          </div>
                        )}
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr style={{ borderBottom: `.5px solid ${T.hairline}` }}>
                              {['Fecha', 'Descripción', 'Debe', 'Haber', 'Saldo'].map(h => (
                                <th key={h} style={{
                                  padding: '5px 8px',
                                  textAlign: h === 'Debe' || h === 'Haber' || h === 'Saldo' ? 'right' : 'left',
                                  fontSize: 11, fontWeight: 500, color: T.text3,
                                }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {account.entries?.map((entry, j) => (
                              <tr key={j} style={{ borderBottom: `.5px solid ${T.soft}` }}
                                onMouseEnter={e => e.currentTarget.style.background = T.sidebar}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <td style={{ padding: '5px 8px', color: T.text3 }}>{entry.date}</td>
                                <td style={{
                                  padding: '5px 8px', color: T.text2,
                                  maxWidth: 200, overflow: 'hidden',
                                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>{entry.description}</td>
                                <td style={{
                                  padding: '5px 8px', color: T.text2,
                                  textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                                }}>{entry.debit > 0 ? `€${entry.debit}` : ''}</td>
                                <td style={{
                                  padding: '5px 8px', color: T.text2,
                                  textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                                }}>{entry.credit > 0 ? `€${entry.credit}` : ''}</td>
                                <td style={{
                                  padding: '5px 8px', color: T.text, fontWeight: 500,
                                  textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                                }}>€{entry.balance?.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      )}
                    </Card>
                    )
                  })}
                  {ledger.ledger?.length === 0 && (
                    <Card style={{ textAlign: 'center', padding: 48 }}>
                      <div style={{ fontSize: 13, color: T.text4 }}>Sin asientos contables registrados</div>
                    </Card>
                  )}
                </div>
              )}

              {balanza && (
                <div>
                  <div style={{
                    fontSize: 14, fontWeight: 600, color: T.text,
                    marginBottom: 12, letterSpacing: -0.2,
                  }}>Balanza de Comprobación</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '5px 14px',
                      background: balanza.is_balanced ? T.greenSoft : T.redSoft,
                      color: balanza.is_balanced ? T.green : T.red,
                      borderRadius: 999, fontSize: 13, fontWeight: 500,
                    }}>{balanza.is_balanced ? 'Balanza cuadrada' : 'Balanza no cuadrada'}</span>
                    <span style={{
                      padding: '5px 14px', background: T.sidebar,
                      borderRadius: 999, fontSize: 13, color: T.text2,
                      border: `.5px solid ${T.hairline}`,
                    }}>Débitos: €{balanza.total_debits?.toFixed(2)}</span>
                    <span style={{
                      padding: '5px 14px', background: T.sidebar,
                      borderRadius: 999, fontSize: 13, color: T.text2,
                      border: `.5px solid ${T.hairline}`,
                    }}>Créditos: €{balanza.total_credits?.toFixed(2)}</span>
                  </div>
                  <Card padding={0} style={{ overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: T.sidebar, borderBottom: `.5px solid ${T.hairline}` }}>
                          {['Código', 'Cuenta', 'Tipo', 'Débito', 'Crédito'].map(h => (
                            <th key={h} style={{
                              padding: '10px 14px',
                              textAlign: h === 'Débito' || h === 'Crédito' ? 'right' : 'left',
                              fontSize: 11, fontWeight: 600, color: T.text3,
                              textTransform: 'uppercase', letterSpacing: 0.5,
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {balanza.accounts?.map((acc, i) => (
                          <tr key={i} style={{ borderBottom: `.5px solid ${T.soft}` }}
                            onMouseEnter={e => e.currentTarget.style.background = T.sidebar}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '9px 14px', fontSize: 12, fontWeight: 600, color: T.blue }}>{acc.code}</td>
                            <td style={{ padding: '9px 14px', fontSize: 13, color: T.text, fontWeight: 500 }}>{acc.name}</td>
                            <td style={{ padding: '9px 14px', fontSize: 12, color: T.text4 }}>{acc.type}</td>
                            <td style={{
                              padding: '9px 14px', fontSize: 13, color: T.text2,
                              fontWeight: 500, textAlign: 'right',
                              fontVariantNumeric: 'tabular-nums',
                            }}>{acc.debit > 0 ? `€${acc.debit?.toFixed(2)}` : ''}</td>
                            <td style={{
                              padding: '9px 14px', fontSize: 13, color: T.text2,
                              fontWeight: 500, textAlign: 'right',
                              fontVariantNumeric: 'tabular-nums',
                            }}>{acc.credit > 0 ? `€${acc.credit?.toFixed(2)}` : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: `.5px solid ${T.hairline}`, background: T.sidebar }}>
                          <td colSpan="3" style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: T.text }}>Totales</td>
                          <td style={{
                            padding: '10px 14px', fontSize: 13, fontWeight: 600,
                            color: T.text, textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                          }}>€{balanza.total_debits?.toFixed(2)}</td>
                          <td style={{
                            padding: '10px 14px', fontSize: 13, fontWeight: 600,
                            color: T.text, textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                          }}>€{balanza.total_credits?.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* ──── ASIENTO MANUAL ──── */}
          {section === 'asiento' && (
            <div>
              <Card>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: -0.2, marginBottom: 4 }}>Asiento contable manual</div>
                <div style={{ fontSize: 12, color: T.text4, marginBottom: 16 }}>
                  Apunte libre de partida doble (cualquier cuenta contra cualquier cuenta). El total del Debe debe igualar al Haber.
                </div>
                <form onSubmit={submitAsiento}>
                  <div className="cont-row" style={{ display: 'grid', gridTemplateColumns: '150px 1fr 180px', gap: 12, marginBottom: 14 }}>
                    <Field label="Fecha">
                      <Input type="date" value={asiento.fecha} onChange={e => setAsiento(a => ({ ...a, fecha: e.target.value }))} required />
                    </Field>
                    <Field label="Descripción">
                      <Input value={asiento.descripcion} onChange={e => setAsiento(a => ({ ...a, descripcion: e.target.value }))} placeholder="Concepto del asiento…" required />
                    </Field>
                    <Field label="Referencia (opcional)">
                      <Input value={asiento.referencia} onChange={e => setAsiento(a => ({ ...a, referencia: e.target.value }))} placeholder="Nº documento…" />
                    </Field>
                  </div>

                  <div style={{ border: `.5px solid ${T.hairline}`, borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 130px 36px', gap: 10, padding: '8px 12px', background: T.sidebar, fontSize: 11, fontWeight: 600, color: T.text3, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      <div>Cuenta</div>
                      <div style={{ textAlign: 'right' }}>Debe</div>
                      <div style={{ textAlign: 'right' }}>Haber</div>
                      <div></div>
                    </div>
                    {asiento.lineas.map((l, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 130px 36px', gap: 10, padding: '8px 12px', borderTop: `.5px solid ${T.soft}`, alignItems: 'center' }}>
                        <Sel value={l.account_code} onChange={e => setLinea(idx, { account_code: e.target.value })}>
                          <option value="">Selecciona cuenta…</option>
                          {cuentas.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                        </Sel>
                        <Input type="number" step="0.01" placeholder="0.00" value={l.debit} style={{ textAlign: 'right' }}
                          onChange={e => setLinea(idx, { debit: e.target.value, credit: e.target.value ? '' : l.credit })} />
                        <Input type="number" step="0.01" placeholder="0.00" value={l.credit} style={{ textAlign: 'right' }}
                          onChange={e => setLinea(idx, { credit: e.target.value, debit: e.target.value ? '' : l.debit })} />
                        <button type="button" onClick={() => removeLinea(idx)} disabled={asiento.lineas.length <= 2}
                          aria-label="Quitar línea" style={{ border: 'none', background: 'transparent', color: T.text4, cursor: asiento.lineas.length <= 2 ? 'default' : 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addLinea} style={{ marginTop: 10, border: 'none', background: 'transparent', color: T.blue, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    + Añadir línea
                  </button>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 28, marginTop: 14, padding: '12px 16px', borderRadius: 10, background: T.sidebar }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: T.text4 }}>Total Debe</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>€{asientoTotals.debit.toFixed(2)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: T.text4 }}>Total Haber</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>€{asientoTotals.credit.toFixed(2)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: T.text4 }}>Cuadre</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: asientoBalanced ? T.green : T.amber }}>{asientoBalanced ? '✓ Cuadrado' : 'Descuadrado'}</div>
                    </div>
                  </div>

                  <Toast msg={msg} />
                  <Btn disabled={asientoLoading || !asientoBalanced} style={{ marginTop: 14, width: '100%', justifyContent: 'center', borderRadius: 10, padding: '11px' }}>
                    {asientoLoading ? 'Registrando…' : 'Registrar asiento'}
                  </Btn>
                </form>
              </Card>
            </div>
          )}

          {/* ──── IVA / 303 ──── */}
          {section === 'iva' && (
            <div>
              <Card style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
                  <Field label="Desde">
                    <Input type="date" value={ivaRange.inicio} onChange={e => setIvaRange(r => ({ ...r, inicio: e.target.value }))} />
                  </Field>
                  <Field label="Hasta">
                    <Input type="date" value={ivaRange.fin} onChange={e => setIvaRange(r => ({ ...r, fin: e.target.value }))} />
                  </Field>
                  <Btn onClick={loadIva} disabled={ivaLoading} style={{ borderRadius: 10, padding: '10px 18px' }}>
                    {ivaLoading ? 'Calculando…' : 'Calcular IVA'}
                  </Btn>
                </div>
                <Toast msg={msg} />
              </Card>

              {iva && (
                <>
                  <div className="cont-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                    {[
                      { label: 'IVA repercutido · cta 477', value: iva.iva_repercutido, color: T.text },
                      { label: 'IVA soportado · cta 472', value: iva.iva_soportado, color: T.text },
                      { label: iva.resultado_tipo === 'a_compensar' ? 'Resultado · a compensar' : iva.resultado_tipo === 'cero' ? 'Resultado · sin cuota' : 'Resultado · a ingresar', value: Math.abs(iva.resultado || 0), color: (iva.resultado || 0) > 0 ? T.red : ((iva.resultado || 0) < 0 ? T.green : T.text) },
                    ].map((k, i) => (
                      <Card key={i}>
                        <div style={{ fontSize: 11, color: T.text4, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>{k.label}</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: k.color, fontVariantNumeric: 'tabular-nums' }}>€{(k.value || 0).toFixed(2)}</div>
                      </Card>
                    ))}
                  </div>
                  <Card>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>Borrador modelo 303</div>
                    <div style={{ fontSize: 11, color: T.text4, marginBottom: 14 }}>{iva.nota}</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        {[
                          ['Casilla 27 — Cuota IVA devengada', iva.modelo_303?.casilla_27_cuota_devengada],
                          ['Casilla 45 — Cuota IVA deducible', iva.modelo_303?.casilla_45_cuota_deducible],
                          ['Casilla 71 — Resultado', iva.modelo_303?.casilla_71_resultado],
                        ].map(([k, v], i) => (
                          <tr key={i} style={{ borderBottom: `.5px solid ${T.soft}` }}>
                            <td style={{ padding: '10px 4px', fontSize: 13, color: T.text2 }}>{k}</td>
                            <td style={{ padding: '10px 4px', fontSize: 13, fontWeight: 600, color: T.text, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>€{(v || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Card>
                </>
              )}
              {!iva && !ivaLoading && (
                <Card><div style={{ fontSize: 13, color: T.text4, textAlign: 'center', padding: 20 }}>Elige un periodo y pulsa «Calcular IVA».</div></Card>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
