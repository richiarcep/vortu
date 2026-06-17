'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import VeraPanel from '@/components/ui/VeraPanel'
import { FONT, useT, useTheme } from '@/components/ui/tokens'
import { Skeleton, EmptyState, HeaderActions } from '@/components/ui/primitives'
import VeraDrawer from '@/components/ui/VeraDrawer'

import { API_BASE as API } from '@/lib/api'

// ───────────────────────────────────────────────────────────────
// PRIMITIVOS LOCALES
// ───────────────────────────────────────────────────────────────
function Card({ children, style = {}, padding = 20 }) {
  const T = useT()
  return (
    <div style={{
      background: T.card, borderRadius: 14,
      border: `.5px solid ${T.hairline}`,
      boxShadow: '0 1px 2px rgba(0,0,0,.02)',
      padding, ...style,
    }}>{children}</div>
  )
}

function Btn({ children, onClick, disabled, color, style = {} }) {
  const T = useT()
  const bg = color || T.blue
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '7px 16px', borderRadius: 999, border: 'none',
      fontSize: 13, fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: 'inherit',
      background: disabled ? T.sidebar : bg,
      color: disabled ? T.text4 : '#fff',
      opacity: disabled ? .6 : 1,
      display: 'inline-flex', alignItems: 'center', gap: 6,
      transition: 'opacity .15s', ...style,
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
      display: 'inline-flex', alignItems: 'center', gap: 6, ...style,
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

function VeraInsight({ insight, loading, onOpenChat, onRegenerate }) {
  const T = useT()
  return (
    <Card padding={18}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg,#0071E3,#00B4D8)',
            display: 'grid', placeItems: 'center',
          }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" fill="#fff" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, letterSpacing: -0.2 }}>
              Vera — Análisis de ventas
            </div>
            <div style={{ fontSize: 11, color: T.text4 }}>
              Lee tus ventas y resume lo importante
            </div>
          </div>
        </div>
        <button onClick={onOpenChat} style={{
          padding: '5px 12px', borderRadius: 7,
          border: `.5px solid rgba(0,113,227,.18)`,
          background: 'rgba(0,113,227,.05)', color: T.blue,
          fontSize: 12, fontWeight: 500, cursor: 'pointer',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5,
        }}>
          Abrir chat
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      {loading && (
        <div style={{
          padding: 18, background: T.sidebar, borderRadius: 10,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <Skeleton w="92%" h={13} />
          <Skeleton w="100%" h={13} />
          <Skeleton w="74%" h={13} />
        </div>
      )}

      {insight && !loading && (
        <div style={{
          padding: '16px 18px',
          background: 'linear-gradient(180deg, rgba(0,113,227,.025), rgba(0,113,227,.01))',
          borderRadius: 10,
          border: `.5px solid rgba(0,113,227,.1)`,
          fontSize: 13, color: T.text2, lineHeight: 1.65,
          whiteSpace: 'pre-wrap',
        }}>
          {insight.replace(/#{1,4} /g, '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/^- /gm, '• ').replace(/^\d+\. /gm, '• ').trim()}
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
// COMPONENTE PRINCIPAL VENTAS
// ───────────────────────────────────────────────────────────────
export default function Ventas() {
  const T = useT()
  const { theme } = useTheme()
  const router = useRouter()
  const [section, setSection] = useState('pos')
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [veraOpen, setVeraOpen] = useState(false)
  const [veraInsight, setVeraInsight] = useState(null)
  const [veraInsightLoading, setVeraInsightLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(false)

  // POS state
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [search, setSearch] = useState('')
  const [payment, setPayment] = useState('card')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [facturaElectronica, setFacturaElectronica] = useState(false)
  const [clienteQuery, setClienteQuery] = useState('')
  const [clienteSelected, setClienteSelected] = useState(null)
  const [clientesResults, setClientesResults] = useState([])

  // Historial
  const [historial, setHistorial] = useState([])
  const [resumen, setResumen] = useState(null)
  const [stockAlerts, setStockAlerts] = useState([])

  // Productos
  const [newProduct, setNewProduct] = useState({
    name: '', category: '', sale_price: '', cost_price: '',
    iva_rate: 21, stock_quantity: 0, low_stock_threshold: 10,
  })
  const [showProductForm, setShowProductForm] = useState(false)

  const getToken = () => localStorage.getItem('nexum_token')

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
    loadProducts()
    loadHistorial()
    loadResumen()
    loadStockAlerts()
    loadVeraInsight()
  }

  async function loadProducts() {
    try {
      const res = await fetch(`${API}/api/ventas/productos`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (res.ok) {
        const d = await res.json()
        setProducts(d.products || d || [])
      }
    } catch { }
  }

  async function loadHistorial() {
    try {
      const res = await fetch(`${API}/api/ventas/historial`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (res.ok) {
        const d = await res.json()
        setHistorial(d.sales || d || [])
      }
    } catch { }
  }

  async function loadResumen() {
    try {
      const res = await fetch(`${API}/api/ventas/resumen`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (res.ok) {
        const d = await res.json()
        setResumen(d)
      }
    } catch { }
  }

  async function loadStockAlerts() {
    try {
      const res = await fetch(`${API}/api/ventas/alertas/stock`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (res.ok) {
        const d = await res.json()
        setStockAlerts(d.alerts || d || [])
      }
    } catch { }
  }

  async function loadVeraInsight() {
    setVeraInsightLoading(true)
    try {
      const res = await fetch(`${API}/api/vera/insights/ventas`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (res.ok) {
        const d = await res.json()
        setVeraInsight(d.insight)
      }
    } catch { }
    setVeraInsightLoading(false)
  }

  function addToCart(product) {
    const existing = cart.find(c => c.id === product.id)
    if (existing) {
      setCart(cart.map(c => c.id === product.id ? { ...c, qty: c.qty + 1 } : c))
    } else {
      setCart([...cart, { ...product, qty: 1 }])
    }
  }

  function updateQty(id, delta) {
    setCart(cart.map(c => {
      if (c.id === id) {
        const newQty = c.qty + delta
        return newQty <= 0 ? null : { ...c, qty: newQty }
      }
      return c
    }).filter(Boolean))
  }

  function removeFromCart(id) {
    setCart(cart.filter(c => c.id !== id))
  }

  async function searchClientes(q) {
    setClienteQuery(q)
    if (q.length < 2) { setClientesResults([]); return }
    try {
      const res = await fetch(`${API}/api/clientes/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (res.ok) {
        const d = await res.json()
        setClientesResults(d.contacts || d || [])
      }
    } catch { setClientesResults([]) }
  }

  async function submitSale() {
    if (cart.length === 0) return
    setLoading(true)
    setMsg(null)

    const items = cart.map(c => ({
      product_id: c.id,
      quantity: c.qty,
      unit_price: c.sale_price,
    }))

    try {
      const res = await fetch(`${API}/api/ventas/venta`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          items,
          payment_method: payment,
          contact_id: clienteSelected?.id || null,
          factura_electronica: facturaElectronica,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setMsg({ type: 'success', text: `Venta registrada · €${data.total?.toFixed(2)}` })
        setCart([])
        setShowPaymentModal(false)
        setClienteSelected(null)
        setClienteQuery('')
        setFacturaElectronica(false)
        loadHistorial()
        loadResumen()
        loadVeraInsight()
      } else {
        setMsg({ type: 'error', text: data.detail || 'Error registrando venta' })
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'Error de red' })
    }
    setLoading(false)
  }

  async function createProduct(e) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch(`${API}/api/ventas/productos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          ...newProduct,
          sale_price: parseFloat(newProduct.sale_price),
          cost_price: parseFloat(newProduct.cost_price),
          stock_quantity: parseInt(newProduct.stock_quantity),
          low_stock_threshold: parseInt(newProduct.low_stock_threshold),
          iva_rate: parseFloat(newProduct.iva_rate),
        }),
      })
      if (res.ok) {
        setMsg({ type: 'success', text: 'Producto creado' })
        setNewProduct({
          name: '', category: '', sale_price: '', cost_price: '',
          iva_rate: 21, stock_quantity: 0, low_stock_threshold: 10,
        })
        setShowProductForm(false)
        loadProducts()
      } else {
        const d = await res.json()
        setMsg({ type: 'error', text: d.detail || 'Error creando producto' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Error de red' })
    }
    setLoading(false)
  }

  const cartSubtotal = cart.reduce((s, c) => s + c.sale_price * c.qty, 0)
  const cartIva = cartSubtotal * 0.21
  const cartTotal = cartSubtotal + cartIva

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.nexum_code?.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(search.toLowerCase())
  )

  const sections = [
    { key: 'pos', label: 'Punto de venta' },
    { key: 'historial', label: 'Historial' },
    { key: 'productos', label: 'Productos' },
    { key: 'alertas', label: 'Alertas' },
  ]

  return (
    <div style={{
      minHeight: '100dvh', background: T.bg, display: 'flex',
      fontFamily: FONT, WebkitFontSmoothing: 'antialiased',
    }}>
      <style>{`
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:999px}
        ::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.2)}
        input:focus,select:focus{border-color:${T.blue}!important;outline:none}
        @media (max-width:768px){
          .ven-pos-row{grid-template-columns:1fr!important}
          .ven-insight-row{grid-template-columns:1fr!important}
          .ven-prod-name-row{grid-template-columns:1fr!important}
        }
      `}</style>

      <Sidebar active="/ventas" />
      <VeraDrawer open={veraOpen} onClose={() => setVeraOpen(false)} token={token} />

      {/* ── PAYMENT MODAL ── */}
      {showPaymentModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(8px)',
          padding: 24,
        }} onClick={e => { if (e.target === e.currentTarget) setShowPaymentModal(false) }}>
          <div style={{
            width: '100%', maxWidth: 460, background: T.card,
            borderRadius: 20, boxShadow: '0 24px 64px rgba(0,0,0,.18)',
            animation: 'modalIn .2s cubic-bezier(0.16,1,0.3,1)',
            overflow: 'hidden',
          }}>
            <style>{`@keyframes modalIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}`}</style>

            <div style={{ padding: '20px 24px', borderBottom: `.5px solid ${T.hairline}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: T.text, letterSpacing: -0.3 }}>Confirmar venta</div>
                  <div style={{ fontSize: 12, color: T.text4, marginTop: 2 }}>{cart.length} {cart.length === 1 ? 'producto' : 'productos'} · IVA incluido</div>
                </div>
                <button onClick={() => setShowPaymentModal(false)} aria-label="Cerrar" style={{
                  width: 30, height: 30, borderRadius: 8, border: 'none',
                  background: T.sidebar, color: T.text3, cursor: 'pointer',
                  fontSize: 18, display: 'grid', placeItems: 'center',
                }}>×</button>
              </div>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {/* Total grande */}
              <div style={{
                textAlign: 'center', padding: '18px',
                background: 'linear-gradient(180deg, rgba(52,199,89,.04), rgba(52,199,89,.01))',
                borderRadius: 12, border: `.5px solid rgba(52,199,89,.15)`, marginBottom: 18,
              }}>
                <div style={{ fontSize: 11, color: T.text3, marginBottom: 6, fontWeight: 500, letterSpacing: 0.5, textTransform: 'uppercase' }}>Total a cobrar</div>
                <div style={{ fontSize: 36, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums', letterSpacing: -1, lineHeight: 1 }}>€{cartTotal.toFixed(2)}</div>
              </div>

              {/* Método de pago */}
              <Field label="Método de pago">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px,1fr))', gap: 6 }}>
                  {[
                    { key: 'card', label: 'Tarjeta' },
                    { key: 'cash', label: 'Efectivo' },
                    { key: 'transfer', label: 'Transfer.' },
                    { key: 'bizum', label: 'Bizum' },
                  ].map(p => (
                    <button key={p.key} type="button" onClick={() => setPayment(p.key)} style={{
                      padding: '9px 6px', borderRadius: 9,
                      border: `.5px solid ${payment === p.key ? T.blue : T.hairline}`,
                      background: payment === p.key ? 'rgba(0,113,227,.06)' : T.sidebar,
                      color: payment === p.key ? T.blue : T.text2,
                      fontSize: 12, fontWeight: payment === p.key ? 500 : 400,
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                    }}>{p.label}</button>
                  ))}
                </div>
              </Field>

              {/* Cliente opcional */}
              <Field label="Cliente (opcional)">
                {clienteSelected ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', background: 'rgba(0,113,227,.06)',
                    border: `.5px solid rgba(0,113,227,.2)`, borderRadius: 8,
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{clienteSelected.name}</div>
                      <div style={{ fontSize: 11, color: T.text4 }}>{clienteSelected.tax_id || clienteSelected.email || '—'}</div>
                    </div>
                    <button onClick={() => { setClienteSelected(null); setClienteQuery('') }} aria-label="Quitar cliente" style={{
                      background: 'none', border: 'none', color: T.text4, cursor: 'pointer', fontSize: 16,
                    }}>×</button>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <Input
                      type="text" placeholder="Buscar por nombre o NIF…"
                      value={clienteQuery}
                      onChange={e => searchClientes(e.target.value)}
                    />
                    {clientesResults.length > 0 && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0,
                        marginTop: 4, background: T.card, borderRadius: 8,
                        border: `.5px solid ${T.hairline}`, boxShadow: '0 8px 24px rgba(0,0,0,.08)',
                        zIndex: 10, maxHeight: 180, overflowY: 'auto',
                      }}>
                        {clientesResults.slice(0, 5).map(c => (
                          <div key={c.id} onClick={() => { setClienteSelected(c); setClientesResults([]); setClienteQuery('') }} style={{
                            padding: '9px 12px', cursor: 'pointer',
                            borderBottom: `.5px solid ${T.soft}`,
                          }}
                            onMouseEnter={e => e.currentTarget.style.background = T.sidebar}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{c.name}</div>
                            <div style={{ fontSize: 11, color: T.text4 }}>{c.tax_id || c.email || '—'}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Field>

              {/* Toggle Facturación electrónica */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', background: T.sidebar, borderRadius: 10,
                border: `.5px solid ${T.hairline}`, marginBottom: 16,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>Facturación electrónica</div>
                  <div style={{ fontSize: 11, color: T.text4, marginTop: 2 }}>
                    {facturaElectronica ? 'Se generará factura legal (Verifactu)' : 'Solo ticket simple'}
                  </div>
                </div>
                <button onClick={() => setFacturaElectronica(!facturaElectronica)} role="switch" aria-checked={facturaElectronica} aria-label="Facturación electrónica" style={{
                  width: 40, height: 24, borderRadius: 999,
                  background: facturaElectronica ? T.green : T.hairline,
                  border: 'none', cursor: 'pointer', position: 'relative',
                  transition: 'background .2s',
                }}>
                  <div style={{
                    position: 'absolute', top: 2, left: facturaElectronica ? 18 : 2,
                    width: 20, height: 20, borderRadius: 999, background: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,.15)', transition: 'left .2s',
                  }} />
                </button>
              </div>

              {facturaElectronica && !clienteSelected && (
                <div style={{
                  padding: '10px 12px', background: 'rgba(255,149,0,.08)',
                  border: `.5px solid rgba(255,149,0,.25)`,
                  borderRadius: 8, fontSize: 12, color: T.amber, marginBottom: 16,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden="true">
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  Para facturación electrónica necesitas seleccionar un cliente con NIF
                </div>
              )}

              <Toast msg={msg} />

              <div style={{ display: 'flex', gap: 8 }}>
                <BtnSec onClick={() => setShowPaymentModal(false)} style={{ flex: 1, justifyContent: 'center' }}>
                  Cancelar
                </BtnSec>
                <Btn onClick={submitSale} disabled={loading || (facturaElectronica && !clienteSelected)} color={T.green}
                  style={{ flex: 2, justifyContent: 'center', padding: '11px', borderRadius: 10, fontSize: 14, fontWeight: 600 }}>
                  {loading ? 'Procesando…' : `Confirmar pago · €${cartTotal.toFixed(2)}`}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* HEADER */}
        <header style={{
          height: 64, background: theme === 'dark' ? 'rgba(11,11,12,.85)' : 'rgba(251,251,253,.85)',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          borderBottom: `.5px solid ${T.hairline}`,
          display: 'flex', alignItems: 'center', padding: '0 28px',
          flexShrink: 0, position: 'sticky', top: 0, zIndex: 10, gap: 20,
        }}>
          <div>
            <div style={{
              fontSize: 16, fontWeight: 600, color: T.text,
              letterSpacing: -0.3, lineHeight: 1.1,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              Ventas
              {resumen?.today && (
                <span style={{
                  fontSize: 11, fontWeight: 500, color: T.green,
                  background: 'rgba(52,199,89,.08)', padding: '2px 8px',
                  borderRadius: 999, marginLeft: 4,
                }}>
                  €{(resumen.today.total_revenue || 0).toFixed(0)} hoy
                </span>
              )}
            </div>
            <div style={{
              fontSize: 11, color: T.text4, marginTop: 3,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <FlagES size={12} />
              <span>Punto de venta · IVA 21%</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <PillGroup items={sections} active={section} onChange={setSection} />
          </div>

          <HeaderActions onVera={() => setVeraOpen(true)} user={user} router={router} />
        </header>

        {/* CONTENIDO */}
        <div className="fade-in" style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {/* ──── PUNTO DE VENTA ──── */}
          {section === 'pos' && (
            <div>
              {/* KPIs como pills medianas */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {[
                  { label: 'Ventas hoy', value: `€${(resumen?.today?.total_revenue || 0).toFixed(0)}`, accent: T.green },
                  { label: 'Transacciones', value: resumen?.today?.total_sales || 0 },
                  { label: 'Ticket medio', value: `€${(resumen?.today?.avg_ticket || 0).toFixed(2)}` },
                  { label: 'Productos', value: products.length },
                ].map((k, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 14px', background: T.card,
                    borderRadius: 999, border: `.5px solid ${T.hairline}`,
                    boxShadow: '0 1px 2px rgba(0,0,0,.02)',
                  }}>
                    <span style={{ fontSize: 12, color: T.text4, fontWeight: 400 }}>{k.label}</span>
                    <span style={{
                      fontSize: 13.5, fontWeight: 600, color: k.accent || T.text,
                      fontVariantNumeric: 'tabular-nums', letterSpacing: -0.2,
                    }}>{k.value}</span>
                  </div>
                ))}
              </div>

              <div className="ven-pos-row" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
                {/* Catálogo */}
                <Card>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: 14,
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: -0.2 }}>Catálogo</div>
                      <div style={{ fontSize: 11, color: T.text4 }}>Toca para añadir al carrito</div>
                    </div>
                    <Input
                      type="text" placeholder="Buscar producto…"
                      value={search} onChange={e => setSearch(e.target.value)}
                      style={{ width: 220 }}
                    />
                  </div>
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))',
                    gap: 8, maxHeight: 540, overflowY: 'auto',
                  }}>
                    {filteredProducts.length === 0 && !search && products.length === 0 && (
                      <>
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} style={{
                            padding: 12, background: T.sidebar, borderRadius: 10,
                            border: `.5px solid ${T.hairline}`,
                            display: 'flex', flexDirection: 'column', gap: 8,
                          }}>
                            <Skeleton w="80%" h={13} />
                            <Skeleton w="50%" h={13} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                              <Skeleton w={48} h={14} />
                              <Skeleton w={44} h={14} radius={999} />
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                    {filteredProducts.length === 0 && (search || products.length > 0) && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <EmptyState
                          icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18M16 10a4 4 0 0 1-8 0" /></svg>}
                          title={search ? 'Sin resultados' : 'Sin productos'}
                          hint={search ? 'Prueba con otro nombre, código o código de barras.' : 'Añade productos al catálogo para empezar a vender.'}
                        />
                      </div>
                    )}
                    {filteredProducts.map(p => {
                      const stock = p.stock_quantity || 0
                      const threshold = p.low_stock_threshold || 10
                      let stockColor, stockBg, stockBorder
                      if (stock === 0) {
                        stockColor = T.red
                        stockBg = 'rgba(255,59,48,.1)'
                        stockBorder = 'rgba(255,59,48,.25)'
                      } else if (stock <= threshold) {
                        stockColor = T.amber
                        stockBg = 'rgba(255,149,0,.1)'
                        stockBorder = 'rgba(255,149,0,.25)'
                      } else {
                        stockColor = T.green
                        stockBg = 'rgba(52,199,89,.08)'
                        stockBorder = 'rgba(52,199,89,.2)'
                      }
                      return (
                        <div key={p.id} className="hover-lift" onClick={() => stock > 0 && addToCart(p)} style={{
                          padding: 12, background: T.sidebar, borderRadius: 10,
                          border: `.5px solid ${T.hairline}`,
                          cursor: stock > 0 ? 'pointer' : 'not-allowed',
                          opacity: stock > 0 ? 1 : 0.55,
                          transition: 'all .15s',
                          display: 'flex', flexDirection: 'column', gap: 6,
                        }}
                          onMouseEnter={e => {
                            if (stock > 0) {
                              e.currentTarget.style.background = T.card
                              e.currentTarget.style.borderColor = T.blue
                            }
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = T.sidebar
                            e.currentTarget.style.borderColor = T.hairline
                          }}
                        >
                          <div style={{
                            fontSize: 12.5, fontWeight: 500, color: T.text,
                            lineHeight: 1.3,
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                            minHeight: 32,
                          }}>{p.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                            <span style={{
                              fontSize: 14, fontWeight: 600, color: T.text,
                              fontVariantNumeric: 'tabular-nums',
                            }}>€{p.sale_price?.toFixed(2)}</span>
                            <span style={{
                              padding: '2px 8px', borderRadius: 999,
                              fontSize: 10.5, fontWeight: 500,
                              background: stockBg, color: stockColor,
                              border: `.5px solid ${stockBorder}`,
                              fontVariantNumeric: 'tabular-nums',
                              whiteSpace: 'nowrap',
                            }}>{stock} uds</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>

                {/* Carrito */}
                <Card>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: 14,
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: -0.2 }}>Carrito</div>
                      <div style={{ fontSize: 11, color: T.text4 }}>{cart.length} {cart.length === 1 ? 'producto' : 'productos'}</div>
                    </div>
                    {cart.length > 0 && (
                      <button onClick={() => setCart([])} style={{
                        background: 'none', border: 'none', color: T.red,
                        fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                      }}>Vaciar</button>
                    )}
                  </div>

                  <div style={{ maxHeight: 320, overflowY: 'auto', marginBottom: 14 }}>
                    {cart.length === 0 && (
                      <EmptyState
                        icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>}
                        title="Carrito vacío"
                        hint="Toca un producto del catálogo para añadirlo."
                      />
                    )}
                    {cart.map(c => (
                      <div key={c.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 0', borderBottom: `.5px solid ${T.soft}`,
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 12.5, fontWeight: 500, color: T.text,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: T.text4 }}>
                            €{c.sale_price?.toFixed(2)} × {c.qty}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 10 }}>
                          <button onClick={() => updateQty(c.id, -1)} aria-label={`Restar una unidad de ${c.name}`} style={{
                            width: 22, height: 22, borderRadius: 6, border: `.5px solid ${T.hairline}`,
                            background: T.card, cursor: 'pointer', color: T.text3, fontSize: 12,
                          }}>−</button>
                          <span style={{ minWidth: 16, textAlign: 'center', fontSize: 12.5, fontWeight: 500 }}>{c.qty}</span>
                          <button onClick={() => updateQty(c.id, 1)} aria-label={`Sumar una unidad de ${c.name}`} style={{
                            width: 22, height: 22, borderRadius: 6, border: `.5px solid ${T.hairline}`,
                            background: T.card, cursor: 'pointer', color: T.text3, fontSize: 12,
                          }}>+</button>
                          <button onClick={() => removeFromCart(c.id)} aria-label={`Quitar ${c.name} del carrito`} style={{
                            marginLeft: 4, background: 'none', border: 'none',
                            color: T.text4, cursor: 'pointer', fontSize: 14,
                          }}>×</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {cart.length > 0 && (
                    <>
                      <div style={{ background: T.sidebar, borderRadius: 10, padding: 12, marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, color: T.text3 }}>
                          <span>Subtotal</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>€{cartSubtotal.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, color: T.text3 }}>
                          <span>IVA 21%</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>€{cartIva.toFixed(2)}</span>
                        </div>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between',
                          padding: '8px 0 4px', borderTop: `.5px solid ${T.hairline}`,
                          fontSize: 16, fontWeight: 600, color: T.text,
                        }}>
                          <span>Total</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>€{cartTotal.toFixed(2)}</span>
                        </div>
                      </div>

                      <Toast msg={msg} />

                      <Btn onClick={() => setShowPaymentModal(true)} disabled={loading} color={T.green}
                        style={{ width: '100%', justifyContent: 'center', padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 600 }}>
                        Cobrar €{cartTotal.toFixed(2)}
                      </Btn>
                    </>
                  )}
                </Card>
              </div>

              {/* Vera Insight + alertas */}
              <div className="ven-insight-row" style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <VeraInsight insight={veraInsight} loading={veraInsightLoading}
                  onOpenChat={() => setVeraOpen(true)} onRegenerate={loadVeraInsight} />

                <Card>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: 14,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: 'rgba(0,113,227,.08)',
                        display: 'grid', placeItems: 'center',
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: -0.2 }}>
                          Facturación electrónica
                        </div>
                        <div style={{ fontSize: 11, color: T.text4 }}>Verifactu · AEAT</div>
                      </div>
                    </div>
                    <span style={{
                      padding: '3px 10px', borderRadius: 999,
                      fontSize: 11, fontWeight: 500,
                      background: 'rgba(255,149,0,.1)', color: T.amber,
                      border: `.5px solid rgba(255,149,0,.25)`,
                    }}>Pendiente activar</span>
                  </div>

                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
                    marginBottom: 14,
                  }}>
                    <div style={{
                      padding: '12px 14px', background: T.sidebar,
                      borderRadius: 10, border: `.5px solid ${T.hairline}`,
                    }}>
                      <div style={{ fontSize: 11, color: T.text4, marginBottom: 4 }}>Emitidas este mes</div>
                      <div style={{
                        fontSize: 20, fontWeight: 600, color: T.text,
                        fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                      }}>0</div>
                      <div style={{ fontSize: 10, color: T.text4, marginTop: 4 }}>de {resumen?.today?.total_sales || 0} ventas</div>
                    </div>
                    <div style={{
                      padding: '12px 14px', background: T.sidebar,
                      borderRadius: 10, border: `.5px solid ${T.hairline}`,
                    }}>
                      <div style={{ fontSize: 11, color: T.text4, marginBottom: 4 }}>Próximo modelo</div>
                      <div style={{
                        fontSize: 20, fontWeight: 600, color: T.text,
                        fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                      }}>303</div>
                      <div style={{ fontSize: 10, color: T.text4, marginTop: 4 }}>IVA trimestral · jul 20</div>
                    </div>
                  </div>

                  <div style={{
                    padding: '12px 14px',
                    background: 'linear-gradient(180deg, rgba(0,113,227,.04), rgba(0,113,227,.01))',
                    borderRadius: 10,
                    border: `.5px solid rgba(0,113,227,.12)`,
                    marginBottom: 12,
                  }}>
                    <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.5 }}>
                      Verifactu es obligatorio en España desde 2026 para empresas. Vortu lo genera automáticamente al activar el toggle en cada venta.
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <Btn onClick={() => router.push('/settings')} style={{
                      flex: 1, justifyContent: 'center', padding: '8px',
                      borderRadius: 8, fontSize: 12,
                    }}>Configurar AEAT</Btn>
                    <BtnSec onClick={() => setSection('historial')} style={{
                      flex: 1, justifyContent: 'center', padding: '8px',
                      borderRadius: 8, fontSize: 12,
                    }}>Ver facturas</BtnSec>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ──── HISTORIAL ──── */}
          {section === 'historial' && (
            <Card padding={0} style={{ overflow: 'hidden' }}>
              <div style={{ padding: 20, borderBottom: `.5px solid ${T.hairline}` }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: -0.2 }}>
                  Historial de ventas
                </div>
                <div style={{ fontSize: 11, color: T.text4, marginTop: 2 }}>
                  {historial.length} transacciones
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: T.sidebar, borderBottom: `.5px solid ${T.hairline}` }}>
                    {['Fecha', 'Hora', 'Método', 'Productos', 'Subtotal', 'IVA', 'Total'].map(h => (
                      <th key={h} style={{
                        padding: '10px 14px',
                        textAlign: ['Subtotal', 'IVA', 'Total'].includes(h) ? 'right' : 'left',
                        fontSize: 11, fontWeight: 600, color: T.text3,
                        textTransform: 'uppercase', letterSpacing: 0.5,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historial.length === 0 && (
                    <tr><td colSpan="7">
                      <EmptyState
                        icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>}
                        title="Sin ventas registradas"
                        hint="Las ventas que cobres aparecerán aquí."
                      />
                    </td></tr>
                  )}
                  {historial.slice(0, 50).map((s, i) => (
                    <tr key={i} style={{ borderBottom: `.5px solid ${T.soft}` }}>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: T.text }}>{s.sale_date}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: T.text3 }}>{s.sale_time}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: T.text3 }}>
                        <span style={{
                          padding: '2px 8px', background: T.sidebar,
                          borderRadius: 999, fontSize: 11,
                        }}>{s.payment_method}</span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: T.text3 }}>
                        {s.items_count || s.item_count || '—'}
                      </td>
                      <td style={{
                        padding: '10px 14px', fontSize: 13, color: T.text2,
                        textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                      }}>€{s.subtotal?.toFixed(2)}</td>
                      <td style={{
                        padding: '10px 14px', fontSize: 13, color: T.text3,
                        textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                      }}>€{s.iva_amount?.toFixed(2)}</td>
                      <td style={{
                        padding: '10px 14px', fontSize: 13, fontWeight: 600, color: T.text,
                        textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                      }}>€{s.total?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* ──── PRODUCTOS ──── */}
          {section === 'productos' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 14, color: T.text3 }}>{products.length} productos en catálogo</div>
                <Btn onClick={() => setShowProductForm(true)}>+ Nuevo producto</Btn>
              </div>

              {showProductForm && (
                <Card style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 14 }}>Nuevo producto</div>
                  <form onSubmit={createProduct}>
                    <div className="ven-prod-name-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                      <Field label="Nombre">
                        <Input value={newProduct.name}
                          onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} required />
                      </Field>
                      <Field label="Categoría">
                        <Input value={newProduct.category}
                          onChange={e => setNewProduct({ ...newProduct, category: e.target.value })} />
                      </Field>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 12 }}>
                      <Field label="Precio venta €">
                        <Input type="number" step="0.01" value={newProduct.sale_price}
                          onChange={e => setNewProduct({ ...newProduct, sale_price: e.target.value })} required />
                      </Field>
                      <Field label="Coste €">
                        <Input type="number" step="0.01" value={newProduct.cost_price}
                          onChange={e => setNewProduct({ ...newProduct, cost_price: e.target.value })} />
                      </Field>
                      <Field label="IVA %">
                        <Sel value={newProduct.iva_rate}
                          onChange={e => setNewProduct({ ...newProduct, iva_rate: e.target.value })}>
                          <option value="21">21%</option>
                          <option value="10">10%</option>
                          <option value="4">4%</option>
                          <option value="0">0%</option>
                        </Sel>
                      </Field>
                      <Field label="Stock inicial">
                        <Input type="number" value={newProduct.stock_quantity}
                          onChange={e => setNewProduct({ ...newProduct, stock_quantity: e.target.value })} />
                      </Field>
                    </div>
                    <Toast msg={msg} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Btn disabled={loading}>{loading ? 'Creando…' : 'Crear producto'}</Btn>
                      <BtnSec onClick={() => setShowProductForm(false)}>Cancelar</BtnSec>
                    </div>
                  </form>
                </Card>
              )}

              <Card padding={0} style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: T.sidebar, borderBottom: `.5px solid ${T.hairline}` }}>
                      {['Nombre', 'Categoría', 'Código', 'Precio', 'Coste', 'Margen', 'Stock'].map(h => (
                        <th key={h} style={{
                          padding: '10px 14px',
                          textAlign: ['Precio', 'Coste', 'Margen', 'Stock'].includes(h) ? 'right' : 'left',
                          fontSize: 11, fontWeight: 600, color: T.text3,
                          textTransform: 'uppercase', letterSpacing: 0.5,
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 && (
                      <tr><td colSpan="7">
                        <EmptyState
                          icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18M16 10a4 4 0 0 1-8 0" /></svg>}
                          title="Sin productos"
                          hint="Crea tu primer producto con el botón Nuevo producto."
                        />
                      </td></tr>
                    )}
                    {products.map(p => {
                      const margin = p.sale_price && p.cost_price
                        ? ((p.sale_price - p.cost_price) / p.sale_price * 100).toFixed(0)
                        : '—'
                      const lowStock = (p.stock_quantity || 0) <= (p.low_stock_threshold || 10)
                      return (
                        <tr key={p.id} style={{ borderBottom: `.5px solid ${T.soft}` }}>
                          <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500, color: T.text }}>{p.name}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: T.text3 }}>{p.category || '—'}</td>
                          <td style={{ padding: '10px 14px', fontSize: 11, color: T.text4, fontFamily: 'monospace' }}>{p.nexum_code || '—'}</td>
                          <td style={{
                            padding: '10px 14px', fontSize: 13, color: T.text, fontWeight: 600,
                            textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                          }}>€{p.sale_price?.toFixed(2)}</td>
                          <td style={{
                            padding: '10px 14px', fontSize: 13, color: T.text3,
                            textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                          }}>€{p.cost_price?.toFixed(2) || '—'}</td>
                          <td style={{
                            padding: '10px 14px', fontSize: 13, color: T.text2,
                            textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                          }}>{margin}%</td>
                          <td style={{
                            padding: '10px 14px', fontSize: 13,
                            textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                          }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                              background: lowStock ? T.redSoft : T.sidebar,
                              color: lowStock ? T.red : T.text2,
                            }}>{p.stock_quantity || 0}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {/* ──── ALERTAS ──── */}
          {section === 'alertas' && (
            <Card>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: -0.2 }}>
                  Alertas de stock
                </div>
                <div style={{ fontSize: 11, color: T.text4, marginTop: 2 }}>
                  Productos por debajo del umbral mínimo
                </div>
              </div>
              {stockAlerts.length === 0 && (
                <EmptyState
                  icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
                  title="Sin alertas"
                  hint="Todo el stock está por encima del umbral mínimo."
                />
              )}
              {stockAlerts.map((p, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 0', borderBottom: i < stockAlerts.length - 1 ? `.5px solid ${T.soft}` : 'none',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: T.text4, marginTop: 2 }}>
                      {p.category} · Umbral: {p.low_stock_threshold || 10}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 13, fontWeight: 600, color: T.red,
                    background: T.redSoft, padding: '4px 12px', borderRadius: 999,
                  }}>{p.stock_quantity} uds</span>
                </div>
              ))}
            </Card>
          )}

        </div>
      </div>
    </div>
  )
}
