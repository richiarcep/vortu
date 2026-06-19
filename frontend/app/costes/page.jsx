'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import VeraPanel from '@/components/ui/VeraPanel'
import { useT, useTheme, FONT, I } from '@/components/ui/tokens'
import VeraDrawer from '@/components/ui/VeraDrawer'
import { HeaderActions } from '@/components/ui/primitives'

import { API_BASE as API } from '@/lib/api'

// ─────────── PRIMITIVOS ───────────
function Card({ children, style = {}, padding = 20 }) {
  const T = useT()
  return <div style={{
    background: T.card, borderRadius: 14,
    border: `.5px solid ${T.hairline}`,
    boxShadow: '0 1px 2px rgba(0,0,0,.02)',
    padding, ...style,
  }}>{children}</div>
}
function Btn({ children, onClick, disabled, color, style = {} }) {
  const T = useT()
  const c = color || T.blue
  return <button onClick={onClick} disabled={disabled} style={{
    padding: '7px 16px', borderRadius: 999, border: 'none',
    fontSize: 13, fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
    background: disabled ? T.sidebar : c, color: disabled ? T.text4 : '#fff',
    opacity: disabled ? .6 : 1,
    display: 'inline-flex', alignItems: 'center', gap: 6, ...style,
  }}>{children}</button>
}
function BtnSec({ children, onClick, style = {}, ...rest }) {
  const T = useT()
  return <button onClick={onClick} {...rest} style={{
    padding: '7px 16px', borderRadius: 999,
    border: `.5px solid ${T.hairline}`, background: T.card,
    fontSize: 13, fontWeight: 500, cursor: 'pointer',
    fontFamily: 'inherit', color: T.text,
    display: 'inline-flex', alignItems: 'center', gap: 6, ...style,
  }}>{children}</button>
}

const inpStyle = (T) => ({ width: '100%', padding: '8px 11px', borderRadius: 8, border: `.5px solid ${T.hairline}`, background: T.sidebar, fontSize: 13, color: T.text, fontFamily: 'inherit', outline: 'none' })
function Input(props) { const T = useT(); return <input style={inpStyle(T)} {...props} /> }
function Sel({ children, ...props }) { const T = useT(); return <select style={inpStyle(T)} {...props}>{children}</select> }
function Textarea(props) { const T = useT(); return <textarea style={{ ...inpStyle(T), fontFamily: 'inherit', resize: 'vertical' }} {...props} /> }

function FlagES({ size = 14 }) {
  return <svg width={size} height={size * 0.66} viewBox="0 0 3 2" style={{ borderRadius: 2, boxShadow: '0 0 0 .5px rgba(0,0,0,0.1)', flexShrink: 0 }}>
    <rect width="3" height="2" fill="#AA151B" />
    <rect y="0.5" width="3" height="1" fill="#F1BF00" />
  </svg>
}
function GreenDot() { const T = useT(); return <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: T.green }} /> }

// ─────────── ICONOS POR CATEGORÍA ───────────
function CatIcon({ name, size = 22, color = 'currentColor' }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const map = {
    megaphone: <svg {...props}><path d="M3 11l18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>,
    code:      <svg {...props}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
    building:  <svg {...props}><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"/></svg>,
    bolt:      <svg {...props}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    users:     <svg {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    truck:     <svg {...props}><rect x="1" y="3" width="15" height="13" rx="1"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    card:      <svg {...props}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
    box:       <svg {...props}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  }
  return map[name] || map.box
}

// utils
const eur = n => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(n || 0))
const eurShort = n => { const v = Number(n || 0); if (Math.abs(v) >= 1e6) return `€${(v/1e6).toFixed(1)}M`; if (Math.abs(v) >= 1e3) return `€${(v/1e3).toFixed(1)}k`; return eur(v) }
const fmtDate = iso => { if (!iso) return '—'; return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) }
const fmtDateShort = iso => { if (!iso) return '—'; return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) }

async function call(path, token, opts = {}) {
  const r = await fetch(`${API}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) } })
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`)
  return r.json()
}

// ─────────── TABS PEGADOS ───────────
function TabsPegados({ items, active, onChange }) {
  const T = useT()
  return <div style={{ display: 'flex', gap: 4, marginTop: 14 }}>
    {items.map(it => (
      <button key={it.key} onClick={() => onChange(it.key)} style={{
        padding: '7px 14px', borderRadius: 9,
        background: active === it.key ? T.card : 'transparent',
        border: active === it.key ? `.5px solid ${T.hairline}` : '.5px solid transparent',
        color: active === it.key ? T.text : T.text3,
        fontWeight: active === it.key ? 600 : 500,
        fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        boxShadow: active === it.key ? '0 1px 2px rgba(0,0,0,.04)' : 'none',
      }}>
        {it.label}
        {it.badge !== undefined && it.badge > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: active === it.key ? T.text3 : T.text4, background: active === it.key ? T.sidebar : 'rgba(0,0,0,.05)', padding: '1px 6px', borderRadius: 8 }}>{it.badge}</span>}
      </button>
    ))}
  </div>
}

// ─────────── PULSE CARD ───────────
function PulseCard({ kpis, variacion }) {
  const T = useT()
  if (!kpis) return null
  const variacionLabel = kpis.total_mes_anterior === 0 ? 'Primer mes con gastos' : variacion === 0 ? 'Igual que mes anterior' : `${variacion > 0 ? '↑' : '↓'} ${Math.abs(variacion)}% vs mes anterior`
  const variacionColor = variacion > 10 ? T.red : variacion < -5 ? T.green : T.text3
  const pctTop = kpis.top_proveedor && kpis.total_mes > 0 ? Math.round((kpis.top_proveedor.total / kpis.total_mes) * 100) : 0

  return <Card padding={0} style={{ overflow: 'hidden' }}>
    <div className="cos-pulse" style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1.4fr 1fr 1.2fr', gap: 24, alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: 11, color: T.text4, fontWeight: 500, letterSpacing: .3, textTransform: 'uppercase', marginBottom: 8 }}>Este mes · {kpis.mes_label}</div>
        <div style={{ fontSize: 38, fontWeight: 600, letterSpacing: -1, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{eur(kpis.total_mes)}</div>
        <div style={{ fontSize: 13, color: T.text3, marginTop: 6 }}>{kpis.count_mes} {kpis.count_mes === 1 ? 'transacción' : 'transacciones'}</div>
      </div>
      <div style={{ borderLeft: `.5px solid ${T.hairline}`, paddingLeft: 24 }}>
        <div style={{ fontSize: 11, color: T.text4, fontWeight: 500, letterSpacing: .3, textTransform: 'uppercase', marginBottom: 8 }}>Comparativa</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: variacionColor, letterSpacing: -.3 }}>{variacionLabel}</div>
        <div style={{ fontSize: 12, color: T.text3, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>Mes ant: {eur(kpis.total_mes_anterior)} · YTD: {eur(kpis.total_ytd)}</div>
      </div>
      <div style={{ borderLeft: `.5px solid ${T.hairline}`, paddingLeft: 24 }}>
        <div style={{ fontSize: 11, color: T.text4, fontWeight: 500, letterSpacing: .3, textTransform: 'uppercase', marginBottom: 8 }}>Top proveedor</div>
        {kpis.top_proveedor ? <>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: -.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{kpis.top_proveedor.name}</div>
          <div style={{ fontSize: 12, color: T.text3, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{eur(kpis.top_proveedor.total)} · {pctTop}% del mes</div>
        </> : <div style={{ fontSize: 13, color: T.text4 }}>Sin datos aún</div>}
      </div>
    </div>
    {kpis.top_proveedor && <div style={{
      padding: '11px 24px', borderTop: `.5px solid ${T.hairline}`,
      background: 'linear-gradient(180deg, rgba(79,70,229,.025), rgba(79,70,229,.01))',
      fontSize: 12.5, color: T.text2, display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ width: 16, height: 16, borderRadius: 4, background: 'linear-gradient(135deg,#4F46E5,#A5B1FF)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <svg width="9" height="9" viewBox="0 0 16 16" fill="none"><path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" fill="#fff"/></svg>
      </span>
      <span><strong style={{ color: T.blue, fontWeight: 600 }}>Vera:</strong> {kpis.top_proveedor.name} concentra el {pctTop}% del gasto del mes. {variacion > 20 ? 'El gasto ha subido bastante respecto al mes pasado.' : kpis.count_mes === 1 ? 'Aún hay poca actividad para identificar patrones.' : 'El reparto parece estable.'}</span>
    </div>}
  </Card>
}

// ─────────── BANNER INICIALIZACIÓN ───────────
function InicializarBanner({ onInit, loading }) {
  const T = useT()
  return <Card padding={18} style={{ background: 'linear-gradient(135deg, rgba(79,70,229,.05) 0%, rgba(165,177,255,.04) 100%)', border: `.5px solid rgba(79,70,229,.18)` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#4F46E5,#A5B1FF)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none"><path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" fill="#fff"/></svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Aún no has organizado tus gastos</div>
        <div style={{ fontSize: 12.5, color: T.text3, lineHeight: 1.5 }}>Vera creará 8 categorías típicas y clasificará automáticamente tus gastos existentes. Tardas un click.</div>
      </div>
      <Btn onClick={onInit} disabled={loading}>{loading ? 'Creando…' : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" fill="#fff"/></svg> Inicializar con Vera</>}</Btn>
    </div>
  </Card>
}

// ─────────── CATEGORY CARD (la pieza estrella) ───────────
function CategoryCard({ c, ancho = 'normal', onClick }) {
  const T = useT()
  const color = c.color || T.text
  const isLarge = ancho === 'large'

  return <div onClick={onClick} style={{
    background: T.card, borderRadius: 14,
    border: `.5px solid ${T.hairline}`, boxShadow: '0 1px 2px rgba(0,0,0,.02)',
    overflow: 'hidden', cursor: onClick ? 'pointer' : 'default',
    transition: 'transform .15s, box-shadow .15s',
    position: 'relative',
  }}
    onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.06)' } }}
    onMouseLeave={e => { if (onClick) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,.02)' } }}>
    {/* Banda lateral de color */}
    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: color }} />

    <div style={{ padding: isLarge ? 22 : 18, paddingLeft: isLarge ? 26 : 22 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{
          width: isLarge ? 44 : 36, height: isLarge ? 44 : 36, borderRadius: 10,
          background: `${color}15`, color, display: 'grid', placeItems: 'center',
        }}>
          <CatIcon name={c.icon} size={isLarge ? 22 : 18} color={color} />
        </div>
        <div style={{ fontSize: 11, color: T.text4, fontWeight: 500 }}>{c.count} {c.count === 1 ? 'gasto' : 'gastos'}</div>
      </div>

      <div style={{ fontSize: isLarge ? 13 : 12, color: T.text3, fontWeight: 500, marginBottom: 4 }}>{c.name}</div>
      <div style={{ fontSize: isLarge ? 26 : 22, fontWeight: 600, letterSpacing: -.5, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, marginBottom: 10 }}>
        {eur(c.total)}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{ flex: 1, height: 5, background: T.sidebar, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${c.pct}%`, height: '100%', background: color, borderRadius: 3 }} />
        </div>
        <span style={{ fontSize: 11, color: T.text3, fontWeight: 600, fontVariantNumeric: 'tabular-nums', minWidth: 38, textAlign: 'right' }}>{c.pct}%</span>
      </div>
      <div style={{ fontSize: 11, color: T.text4 }}>del total YTD</div>
    </div>
  </div>
}

// ─────────── VERA DRAWER ───────────
// ─────────── PREVIEW DRAWER ───────────
function PreviewDrawer({ detail, onClose }) {
  const T = useT()
  const [showContable, setShowContable] = useState(false)
  if (!detail) return null
  const g = detail.gasto
  const asiento = detail.asiento_pgc || []
  const doc = detail.documento_origen
  const histo = detail.historico_proveedor || []
  const tDebe = asiento.reduce((s, l) => s + Number(l.debit || 0), 0)
  const tHaber = asiento.reduce((s, l) => s + Number(l.credit || 0), 0)
  const cuadrado = Math.abs(tDebe - tHaber) < 0.01

  return <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,.15)', backdropFilter: 'blur(2px)' }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
    <div style={{ width: 'min(460px, 95vw)', height: '100dvh', background: T.card, borderLeft: `.5px solid ${T.hairline}`, overflowY: 'auto', boxShadow: '-12px 0 40px rgba(0,0,0,.1)' }}>
      <div style={{ padding: '16px 20px', borderBottom: `.5px solid ${T.hairline}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: T.text4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 4 }}>Detalle del gasto</div>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: -.2 }}>{g.description}</div>
          <div style={{ marginTop: 4, fontSize: 12, color: T.text3 }}>{g.provider || 'Sin proveedor'} · {fmtDate(g.date)}</div>
        </div>
        <button onClick={onClose} aria-label="Cerrar" style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: T.sidebar, color: T.text3, cursor: 'pointer', fontSize: 18 }}>×</button>
      </div>
      <div style={{ padding: 20, borderBottom: `.5px solid ${T.hairline}` }}>
        <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: -.6, fontVariantNumeric: 'tabular-nums' }}>{eur(g.amount)}</div>
        {(g.base_imponible || g.iva_amount) && <div style={{ fontSize: 12, color: T.text3, marginTop: 4 }}>Base {eur(g.base_imponible)} + IVA {eur(g.iva_amount)} ({g.iva_rate || 21}%)</div>}
        {g.factura_ref && <div style={{ fontSize: 11, color: T.text4, marginTop: 8 }}>Factura: <span style={{ color: T.text2, fontWeight: 500 }}>{g.factura_ref}</span></div>}
      </div>
      {g.proveedor_total_ytd > 0 && <div style={{ padding: '16px 16px 0' }}>
        <div style={{ background: 'linear-gradient(180deg, rgba(79,70,229,.04), rgba(79,70,229,.01))', border: `.5px solid rgba(79,70,229,.15)`, borderRadius: 10, padding: 12, fontSize: 12.5, color: T.text2, lineHeight: 1.5 }}>
          <strong style={{ color: T.blue }}>Vera observa:</strong> Llevas <strong>{eur(g.proveedor_total_ytd)}</strong> pagados a {g.provider} este año ({g.proveedor_count_ytd} {g.proveedor_count_ytd === 1 ? 'factura' : 'facturas'}).
        </div>
      </div>}
      {doc && <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: T.sidebar, border: `.5px solid ${T.hairline}`, borderRadius: 10 }}>
          <div style={{ color: T.text3 }}>{I.brief}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.filename}</div>
            <div style={{ fontSize: 10.5, color: T.text4 }}>{doc.file_type?.toUpperCase()} · Factura original</div>
          </div>
        </div>
      </div>}
      {histo.length > 0 && <div style={{ padding: '16px 16px 0' }}>
        <div style={{ fontSize: 11, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 8 }}>Histórico con {g.provider}</div>
        {histo.map(h => (<div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `.5px solid ${T.hairline}`, fontSize: 12 }}>
          <div><div>{h.description}</div><div style={{ color: T.text4, fontSize: 11 }}>{fmtDate(h.date)}</div></div>
          <div style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{eur(h.amount)}</div>
        </div>))}
      </div>}
      {asiento.length > 0 && <div style={{ padding: 16 }}>
        <button onClick={() => setShowContable(s => !s)} style={{ width: '100%', padding: '10px 12px', background: T.sidebar, border: `.5px solid ${T.hairline}`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, color: T.text3, fontWeight: 500 }}>
          <span>{showContable ? 'Ocultar' : 'Ver'} detalles contables</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showContable ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}><path d="M6 9l6 6 6-6"/></svg>
        </button>
        {showContable && <div style={{ marginTop: 10, background: T.purpleSoft, borderRadius: 12, padding: 14, border: `.5px solid ${T.purple}30` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: T.purple, background: T.card, padding: '2px 6px', borderRadius: 4 }}>PGC</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.purple }}>Asiento contable</span>
            {cuadrado && <span style={{ marginLeft: 'auto', fontSize: 10, color: T.green, fontWeight: 600 }}>✓ Cuadrado</span>}
          </div>
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead><tr style={{ color: T.text4, textAlign: 'left' }}><th style={{ padding: '4px 0', fontWeight: 500 }}>Cuenta</th><th style={{ padding: '4px 6px', fontWeight: 500 }}>Concepto</th><th style={{ padding: '4px 0', fontWeight: 500, textAlign: 'right' }}>Debe</th><th style={{ padding: '4px 0', fontWeight: 500, textAlign: 'right' }}>Haber</th></tr></thead>
            <tbody>
              {asiento.map(l => (<tr key={l.id} style={{ borderTop: `.5px solid ${T.purple}20` }}>
                <td style={{ padding: '6px 0', fontWeight: 600 }}>{l.account_code}</td>
                <td style={{ padding: '6px 6px', color: T.text3, fontSize: 10.5 }}>{l.account_name}</td>
                <td style={{ padding: '6px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: l.debit > 0 ? T.text : T.text4 }}>{l.debit > 0 ? eur(l.debit) : '—'}</td>
                <td style={{ padding: '6px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: l.credit > 0 ? T.text : T.text4 }}>{l.credit > 0 ? eur(l.credit) : '—'}</td>
              </tr>))}
              <tr style={{ borderTop: `1px solid ${T.purple}` }}>
                <td colSpan={2} style={{ padding: '7px 0', fontWeight: 600 }}>Totales</td>
                <td style={{ padding: '7px 0', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{eur(tDebe)}</td>
                <td style={{ padding: '7px 0', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{eur(tHaber)}</td>
              </tr>
            </tbody>
          </table>
        </div>}
      </div>}
      <div style={{ height: 24 }} />
    </div>
  </div>
}

// ─────────── REGISTRAR MODAL ───────────
function RegistrarModal({ open, onClose, onSaved, token }) {
  const T = useT()
  const [step, setStep] = useState('input')
  const [veraIn, setVeraIn] = useState('')
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ description: '', amount: '', iva_rate: 21, date: new Date().toISOString().slice(0, 10), provider: '', pgc_cuenta_gasto: '629', notes: '' })

  useEffect(() => {
    if (open) { setStep('input'); setVeraIn(''); setForm({ description: '', amount: '', iva_rate: 21, date: new Date().toISOString().slice(0, 10), provider: '', pgc_cuenta_gasto: '629', notes: '' }) }
  }, [open])
  if (!open) return null

  const handleVera = async () => {
    if (!veraIn.trim()) return
    setParsing(true)
    try {
      const r = await call('/api/costes/vera-parse', token, { method: 'POST', body: JSON.stringify({ descripcion_libre: veraIn }) })
      if (r.ok && r.parsed) { setForm({ ...form, ...r.parsed }); setStep('preview') }
      else { setForm({ ...form, description: veraIn }); setStep('manual') }
    } catch { setForm({ ...form, description: veraIn }); setStep('manual') }
    finally { setParsing(false) }
  }
  const handleSave = async () => {
    setSaving(true)
    try {
      await call('/api/costes/registrar', token, { method: 'POST', body: JSON.stringify({ ...form, amount: Number(form.amount), iva_rate: Number(form.iva_rate), crear_asiento: true }) })
      onSaved()
    } catch (e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }
  const nombresPGC = { '600': 'Compras de mercaderías', '621': 'Arrendamientos', '622': 'Reparaciones', '623': 'Servicios profesionales', '624': 'Transportes', '625': 'Seguros', '626': 'Bancarios', '627': 'Publicidad', '628': 'Suministros', '629': 'Otros servicios' }

  return <div style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,.2)', backdropFilter: 'blur(2px)' }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
    <Card padding={0} style={{ width: 540, maxWidth: '92vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '18px 22px', borderBottom: `.5px solid ${T.hairline}` }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Registrar gasto</div>
        <div style={{ fontSize: 12, color: T.text3, marginTop: 3 }}>
          {step === 'input' && 'Cuéntale a Vera el gasto en lenguaje natural'}
          {step === 'preview' && 'Vera entendió esto. Confirma o edita lo que haga falta'}
          {step === 'manual' && 'Vera no pudo interpretar. Rellena los campos manualmente'}
        </div>
      </div>
      <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>
        {step === 'input' && <div>
          <Textarea rows={4} value={veraIn} onChange={e => setVeraIn(e.target.value)} placeholder='Ej: "Pagué 65€ de gasolina ayer con tarjeta", "Factura de Endesa 124€ del 15 de mayo"' />
          <div style={{ fontSize: 11, color: T.text4, marginTop: 8, lineHeight: 1.5 }}>Vera detectará: importe, IVA, proveedor, fecha, categoría y cuenta contable.</div>
        </div>}
        {(step === 'preview' || step === 'manual') && <div>
          {step === 'preview' && <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '8px 12px', background: 'rgba(52,199,89,.08)', borderRadius: 8, border: '.5px solid rgba(52,199,89,.2)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
            <span style={{ fontSize: 12, color: T.green, fontWeight: 500 }}>Vera entendió el gasto</span>
          </div>}
          <PreviewField label="Descripción" value={form.description} onChange={v => setForm({ ...form, description: v })} />
          <div className="cos-row" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 10 }}>
            <PreviewField label="Importe (con IVA)" value={form.amount} onChange={v => setForm({ ...form, amount: v })} type="number" />
            <PreviewField label="IVA" value={form.iva_rate} onChange={v => setForm({ ...form, iva_rate: v })} type="select" options={[{ v: 21, l: '21%' }, { v: 10, l: '10%' }, { v: 4, l: '4%' }, { v: 0, l: '0%' }]} />
          </div>
          <div className="cos-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 10 }}>
            <PreviewField label="Fecha" value={form.date} onChange={v => setForm({ ...form, date: v })} type="date" />
            <PreviewField label="Proveedor" value={form.provider} onChange={v => setForm({ ...form, provider: v })} />
          </div>
          <PreviewField label="Cuenta contable" value={form.pgc_cuenta_gasto} onChange={v => setForm({ ...form, pgc_cuenta_gasto: v })} type="select" options={Object.entries(nombresPGC).map(([v, l]) => ({ v, l: `${v} · ${l}` }))} />
        </div>}
      </div>
      <div style={{ padding: 16, borderTop: `.5px solid ${T.hairline}`, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <div>{step === 'preview' && <BtnSec onClick={() => setStep('input')}>← Volver</BtnSec>}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <BtnSec onClick={onClose}>Cancelar</BtnSec>
          {step === 'input' && <Btn onClick={handleVera} disabled={parsing || !veraIn.trim()}>{parsing ? 'Vera analizando…' : 'Que Vera lo entienda →'}</Btn>}
          {(step === 'preview' || step === 'manual') && <Btn onClick={handleSave} disabled={saving || !form.description || !form.amount}>{saving ? 'Guardando…' : '✓ Confirmar y guardar'}</Btn>}
        </div>
      </div>
    </Card>
  </div>
}

function PreviewField({ label, value, onChange, type = 'text', options }) {
  const T = useT()
  return <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 11, fontWeight: 500, color: T.text3, marginBottom: 4, letterSpacing: .2, textTransform: 'uppercase' }}>{label}</div>
    {type === 'select' ? (<Sel value={value} onChange={e => onChange(e.target.value)}>{options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</Sel>) : (<Input type={type} value={value} onChange={e => onChange(e.target.value)} />)}
  </div>
}

// ─────────── PÁGINA PRINCIPAL ───────────
export default function CentroCostes() {
  const T = useT()
  const router = useRouter()
  const [token, setToken] = useState(null)
  const [section, setSection] = useState('dashboard')
  const [veraOpen, setVeraOpen] = useState(false)
  const [registrarOpen, setRegistrarOpen] = useState(false)
  const [initLoading, setInitLoading] = useState(false)

  const [kpis, setKpis] = useState(null)
  const [aggCats, setAggCats] = useState(null)
  const [aggProvs, setAggProvs] = useState(null)
  const [gastos, setGastos] = useState({ items: [], total: 0 })
  const [filtroCat, setFiltroCat] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [expandedProv, setExpandedProv] = useState(null)
  const [provDetail, setProvDetail] = useState({})

  useEffect(() => { const t = localStorage.getItem('vela_token'); if (!t) { router.push('/login'); return } setToken(t) }, [router])

  const reload = async (tk = token) => {
    if (!tk) return
    try {
      const [k, ac, ap, gs] = await Promise.all([
        call('/api/costes/kpis', tk), call('/api/costes/agg/categorias', tk),
        call('/api/costes/agg/proveedores?limit=20', tk), call('/api/costes/list?limit=200', tk),
      ])
      setKpis(k); setAggCats(ac); setAggProvs(ap); setGastos(gs)
    } catch (err) { console.error(err) }
  }
  useEffect(() => { if (token) reload(token) }, [token])

  useEffect(() => {
    if (!token) return
    const p = new URLSearchParams()
    if (filtroCat) p.set('category_id', filtroCat)
    if (search) p.set('search', search)
    p.set('limit', '200')
    call(`/api/costes/list?${p}`, token).then(setGastos).catch(console.error)
  }, [token, filtroCat, search])

  useEffect(() => {
    if (!selectedId || !token) { setDetail(null); return }
    call(`/api/costes/${selectedId}`, token).then(setDetail).catch(console.error)
  }, [selectedId, token])

  const handleInicializar = async () => {
    setInitLoading(true)
    try { await call('/api/costes/inicializar-categorias', token, { method: 'POST' }); await reload() }
    catch (e) { alert('Error: ' + e.message) }
    finally { setInitLoading(false) }
  }

  const handleExpandProv = async (nombre) => {
    if (expandedProv === nombre) { setExpandedProv(null); return }
    setExpandedProv(nombre)
    if (!provDetail[nombre]) {
      try {
        const d = await call(`/api/costes/proveedor-detail?nombre=${encodeURIComponent(nombre)}`, token)
        setProvDetail(prev => ({ ...prev, [nombre]: d }))
      } catch (err) { console.error(err) }
    }
  }

  const variacion = kpis?.variacion_pct || 0
  const sinCategorias = aggCats?.items?.length === 0 || (aggCats?.items?.length === 1 && aggCats.items[0].name === 'Sin categoría')

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: T.bg, fontFamily: FONT, color: T.text }}>
      <style>{`
        *{box-sizing:border-box}
        input:focus,select:focus,textarea:focus{border-color:${T.blue}!important;outline:none}
        @media (max-width:768px){
          .cos-pulse{grid-template-columns:1fr!important}
          .cos-row-2{grid-template-columns:1fr!important}
          .cos-row{grid-template-columns:1fr!important}
        }
      `}</style>
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ padding: '24px 32px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -.5, margin: 0 }}>Centro de Costes</h1>
                <GreenDot />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.text3 }}>
                <FlagES /> España
                <span style={{ color: T.text4 }}>·</span>
                <span>{kpis?.count_mes || 0} {kpis?.count_mes === 1 ? 'gasto' : 'gastos'}</span>
                <span style={{ color: T.text4 }}>·</span>
                <span style={{ color: T.text2, fontWeight: 500 }}>{eur(kpis?.total_mes)} este mes</span>
                <span style={{ color: T.text4 }}>·</span>
                <span>IVA 21%</span>
              </div>
            </div>
            <HeaderActions onVera={() => setVeraOpen(true)} router={router}>
              <Btn onClick={() => setRegistrarOpen(true)}>+ Registrar gasto</Btn>
            </HeaderActions>
          </div>
          <TabsPegados items={[
            { key: 'dashboard', label: 'Dashboard' },
            { key: 'gastos', label: 'Gastos', badge: gastos.total },
            { key: 'categorias', label: 'Categorías', badge: aggCats?.items?.length },
            { key: 'proveedores', label: 'Proveedores', badge: aggProvs?.items?.length },
          ]} active={section} onChange={setSection} />
        </div>

        <div style={{ padding: '22px 32px 60px' }}>
          {sinCategorias && <div style={{ marginBottom: 16 }}><InicializarBanner onInit={handleInicializar} loading={initLoading} /></div>}

          {section === 'dashboard' && <DashboardSection kpis={kpis} variacion={variacion} aggCats={aggCats} aggProvs={aggProvs} recientes={gastos.items} onSelect={setSelectedId} onVerTodos={() => setSection('gastos')} onVerCategorias={() => setSection('categorias')} />}
          {section === 'gastos' && <GastosSection aggCats={aggCats} gastos={gastos} filtroCat={filtroCat} setFiltroCat={setFiltroCat} search={search} setSearch={setSearch} selectedId={selectedId} onSelect={setSelectedId} />}
          {section === 'categorias' && <CategoriasSection data={aggCats} />}
          {section === 'proveedores' && <ProveedoresSection data={aggProvs} expanded={expandedProv} onExpand={handleExpandProv} detail={provDetail} onSelectGasto={setSelectedId} />}
        </div>
      </div>

      <PreviewDrawer detail={detail} onClose={() => setSelectedId(null)} />
      <VeraDrawer open={veraOpen} onClose={() => setVeraOpen(false)} token={token} />
      <RegistrarModal open={registrarOpen} onClose={() => setRegistrarOpen(false)} onSaved={() => { setRegistrarOpen(false); reload() }} token={token} />
    </div>
  )
}

// ─────────── DASHBOARD ───────────
function DashboardSection({ kpis, variacion, aggCats, aggProvs, recientes, onSelect, onVerTodos, onVerCategorias }) {
  const T = useT()
  const catsConGasto = (aggCats?.items || []).filter(c => c.total > 0)
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
    <PulseCard kpis={kpis} variacion={variacion} />

    {/* Cómo se compone */}
    {catsConGasto.length > 0 && <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: -.2 }}>Cómo se compone tu gasto</div>
          <div style={{ fontSize: 12, color: T.text3, marginTop: 2 }}>Distribución del gasto YTD por categoría</div>
        </div>
        <button onClick={onVerCategorias} style={{ fontSize: 12, color: T.blue, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Ver todas →</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {catsConGasto.slice(0, 8).map(c => <CategoryCard key={c.category_id} c={c} />)}
      </div>
    </div>}

    {/* Tabla gastos + Top proveedores */}
    <div className="cos-row-2" style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 16 }}>
      <Card padding={0}>
        <div style={{ padding: '14px 18px', borderBottom: `.5px solid ${T.hairline}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Gastos recientes</div>
          <button onClick={onVerTodos} style={{ fontSize: 12, color: T.blue, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Ver todos →</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.3fr 1fr 100px 80px', padding: '9px 18px', borderBottom: `.5px solid ${T.hairline}`, fontSize: 10, fontWeight: 600, color: T.text4, textTransform: 'uppercase', letterSpacing: .4, background: T.sidebar }}>
          <span>Concepto</span><span>Proveedor</span><span>Categoría</span>
          <span style={{ textAlign: 'right' }}>Importe</span><span style={{ textAlign: 'right' }}>Fecha</span>
        </div>
        {recientes?.slice(0, 10).map(g => <GastoRow key={g.id} g={g} onSelect={() => onSelect(g.id)} />)}
        {(!recientes || recientes.length === 0) && <div style={{ padding: 28, textAlign: 'center', color: T.text4, fontSize: 13 }}>Aún no hay gastos.</div>}
      </Card>
      <Card padding={0}>
        <div style={{ padding: '14px 18px', borderBottom: `.5px solid ${T.hairline}` }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Top proveedores <span style={{ color: T.text4, fontWeight: 400, marginLeft: 6, fontSize: 11 }}>YTD</span></div>
        </div>
        {aggProvs?.items?.slice(0, 6).map((p, i) => <ProveedorMiniRow key={i} p={p} />)}
        {(!aggProvs?.items || aggProvs.items.length === 0) && <div style={{ padding: 16, color: T.text4, fontSize: 12 }}>Sin proveedores.</div>}
      </Card>
    </div>
  </div>
}

function ProveedorMiniRow({ p }) {
  const T = useT()
  return <div style={{ padding: '10px 18px', borderBottom: `.5px solid ${T.hairline}`, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
    <div style={{ width: 26, height: 26, borderRadius: 6, background: T.sidebar, fontSize: 11, fontWeight: 600, display: 'grid', placeItems: 'center' }}>{p.inicial}</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
        {p.es_recurrente && <span style={{ fontSize: 9, fontWeight: 700, color: T.blue, background: 'rgba(79,70,229,.08)', padding: '1px 5px', borderRadius: 3 }}>REC</span>}
      </div>
      <span style={{ fontSize: 10.5, color: T.text4 }}>{p.count} fac. · {fmtDateShort(p.ultimo_gasto)}</span>
    </div>
    <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{eurShort(p.total)}</span>
  </div>
}

// ─────────── GASTOS ───────────
function GastosSection({ aggCats, gastos, filtroCat, setFiltroCat, search, setSearch, selectedId, onSelect }) {
  const T = useT()
  return <div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
      <FilterPill active={filtroCat === null} onClick={() => setFiltroCat(null)} count={gastos.total}>Todos</FilterPill>
      {aggCats?.items?.map(c => (<FilterPill key={c.category_id || c.name} active={filtroCat === c.category_id} onClick={() => setFiltroCat(c.category_id)} count={c.count} color={c.color}>{c.name}</FilterPill>))}
    </div>
    <div style={{ marginBottom: 14 }}><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por descripción o proveedor…" /></div>
    <Card padding={0}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.3fr 1fr 110px 80px', padding: '10px 18px', borderBottom: `.5px solid ${T.hairline}`, fontSize: 10, fontWeight: 600, color: T.text4, textTransform: 'uppercase', letterSpacing: .4, background: T.sidebar }}>
        <span>Concepto</span><span>Proveedor</span><span>Categoría</span>
        <span style={{ textAlign: 'right' }}>Importe</span><span style={{ textAlign: 'right' }}>Fecha</span>
      </div>
      {gastos.items.map(g => <GastoRow key={g.id} g={g} selected={selectedId === g.id} onSelect={() => onSelect(g.id)} />)}
      {gastos.items.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: T.text4, fontSize: 13 }}>No hay gastos con estos filtros.</div>}
    </Card>
  </div>
}

function FilterPill({ active, onClick, children, count, color }) {
  const T = useT()
  const activeColor = color || T.text
  return <button onClick={onClick} style={{
    padding: '3px 10px', fontSize: 11.5, fontWeight: 500,
    border: `.5px solid ${active ? activeColor : T.hairline}`,
    background: active ? activeColor : T.card, color: active ? '#fff' : T.text3,
    borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
    display: 'inline-flex', alignItems: 'center', gap: 5,
  }}>
    {children}
    {count !== undefined && <span style={{ fontSize: 10, opacity: .75, background: active ? 'rgba(255,255,255,.18)' : T.sidebar, padding: '1px 5px', borderRadius: 6, color: active ? '#fff' : T.text4 }}>{count}</span>}
  </button>
}

function GastoRow({ g, selected, onSelect }) {
  const T = useT()
  return <div onClick={onSelect} style={{
    display: 'grid', gridTemplateColumns: '2fr 1.3fr 1fr 110px 80px',
    padding: '11px 18px', borderBottom: `.5px solid ${T.hairline}`,
    fontSize: 13, cursor: 'pointer', background: selected ? 'rgba(79,70,229,.05)' : 'transparent',
    alignItems: 'center', transition: 'background .12s',
  }}
    onMouseEnter={e => { if (!selected) e.currentTarget.style.background = T.sidebar }}
    onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent' }}>
    <span style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.description}</span>
    <span style={{ color: T.text3, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.provider || '—'}</span>
    <span style={{ color: T.text3, fontSize: 12 }}>{g.category_name || '—'}</span>
    <span style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{eur(g.amount)}</span>
    <span style={{ textAlign: 'right', color: T.text4, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{fmtDateShort(g.date)}</span>
  </div>
}

// ─────────── CATEGORÍAS (cards grandes) ───────────
function CategoriasSection({ data }) {
  const T = useT()
  if (!data?.items?.length) return <div style={{ color: T.text4, padding: 24 }}>Sin datos.</div>
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
    {data.items.map(c => <CategoryCard key={c.category_id || c.name} c={c} ancho="large" />)}
  </div>
}

// ─────────── PROVEEDORES (expandibles) ───────────
function ProveedoresSection({ data, expanded, onExpand, detail, onSelectGasto }) {
  const T = useT()
  if (!data?.items?.length) return <div style={{ color: T.text4, padding: 24 }}>Sin proveedores.</div>
  return <Card padding={0}>
    <div style={{ display: 'grid', gridTemplateColumns: '24px 44px 2fr 80px 1fr 100px 1fr', padding: '10px 18px', borderBottom: `.5px solid ${T.hairline}`, fontSize: 10, fontWeight: 600, color: T.text4, textTransform: 'uppercase', letterSpacing: .4, background: T.sidebar }}>
      <span></span><span></span><span>Proveedor</span><span>Facturas</span><span>Último</span><span>Desde</span>
      <span style={{ textAlign: 'right' }}>Total YTD</span>
    </div>
    {data.items.map((p, i) => {
      const isOpen = expanded === p.name
      const d = detail[p.name]
      return <div key={i}>
        <div onClick={() => onExpand(p.name)} style={{
          display: 'grid', gridTemplateColumns: '24px 44px 2fr 80px 1fr 100px 1fr',
          padding: '12px 18px', borderBottom: isOpen ? 'none' : `.5px solid ${T.hairline}`,
          alignItems: 'center', fontSize: 13, cursor: 'pointer',
          background: isOpen ? T.sidebar : 'transparent', transition: 'background .12s',
        }}
          onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = T.sidebar }}
          onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="2" style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}><path d="M9 6l6 6-6 6"/></svg>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: T.card, fontSize: 13, fontWeight: 600, display: 'grid', placeItems: 'center', border: `.5px solid ${T.hairline}` }}>{p.inicial}</div>
          <div>
            <div style={{ fontWeight: 500 }}>{p.name}</div>
            {p.es_recurrente && <div style={{ marginTop: 3 }}><span style={{ fontSize: 9, fontWeight: 700, color: T.blue, background: 'rgba(79,70,229,.08)', padding: '1px 5px', borderRadius: 3 }}>RECURRENTE</span></div>}
          </div>
          <span style={{ color: T.text3 }}>{p.count} fac.</span>
          <span style={{ color: T.text4, fontSize: 12 }}>{fmtDate(p.ultimo_gasto)}</span>
          <span style={{ color: T.text4, fontSize: 12 }}>{fmtDateShort(p.primer_gasto)}</span>
          <span style={{ fontWeight: 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{eur(p.total)}</span>
        </div>
        {isOpen && <ProveedorExpandido d={d} onSelectGasto={onSelectGasto} />}
      </div>
    })}
  </Card>
}

function ProveedorExpandido({ d, onSelectGasto }) {
  const T = useT()
  if (!d) return <div style={{ padding: 24, background: T.sidebar, borderBottom: `.5px solid ${T.hairline}`, fontSize: 12, color: T.text4, textAlign: 'center' }}>Cargando…</div>
  const maxEvol = Math.max(...d.evolucion.map(m => m.total), 1)
  return <div style={{ padding: '18px 24px 22px 56px', background: T.sidebar, borderBottom: `.5px solid ${T.hairline}` }}>
    <div className="cos-row-2" style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr', gap: 24 }}>
      {/* Evolución 12 meses */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.text4, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 10 }}>Evolución 12 meses</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 70, background: T.card, padding: 10, borderRadius: 10, border: `.5px solid ${T.hairline}` }}>
          {d.evolucion.map((m, i) => {
            const h = (m.total / maxEvol) * 48
            return <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }} title={`${m.label}: ${eur(m.total)}`}>
              <div style={{ width: '100%', height: Math.max(h, 1), background: m.total > 0 ? T.blue : T.hairline, borderRadius: 2 }} />
              <div style={{ fontSize: 8.5, color: T.text4 }}>{m.label[0]}</div>
            </div>
          })}
        </div>
        <div style={{ fontSize: 12, color: T.text3, marginTop: 10 }}>
          <strong style={{ color: T.text }}>{eur(d.total_ytd)}</strong> en {d.count_ytd} {d.count_ytd === 1 ? 'factura' : 'facturas'} este año
        </div>
      </div>

      {/* Lista de compras */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.text4, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 10 }}>Todas las compras ({d.count_historico})</div>
        <div style={{ background: T.card, borderRadius: 10, border: `.5px solid ${T.hairline}`, maxHeight: 220, overflowY: 'auto' }}>
          {d.compras.map(c => (
            <div key={c.id} onClick={() => onSelectGasto(c.id)} style={{
              padding: '9px 14px', borderBottom: `.5px solid ${T.hairline}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: 12, cursor: 'pointer',
            }}
              onMouseEnter={e => e.currentTarget.style.background = T.sidebar}
              onMouseLeave={e => e.currentTarget.style.background = T.card}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.description}</div>
                <div style={{ fontSize: 10.5, color: T.text4, marginTop: 1 }}>{fmtDate(c.date)} {c.factura_ref ? `· ${c.factura_ref}` : ''}</div>
              </div>
              <div style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginLeft: 12 }}>{eur(c.amount)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
}
