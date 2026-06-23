'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

import { API_BASE as API } from '@/lib/api'

// ════════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS — estilo Vela + acento dorado para "premium interno"
// ════════════════════════════════════════════════════════════════════════════
const T = {
  bg: '#FBFBFD', card: '#FFFFFF', sidebar: '#F5F5F7',
  hairline: 'rgba(0,0,0,0.08)', soft: 'rgba(0,0,0,0.05)',
  text: '#1D1D1F', text2: '#424245', text3: '#6E6E73', text4: '#86868B',
  blue: '#3D2BFF', cyan: '#3D2BFF',
  green: '#34C759', greenSoft: 'rgba(52,199,89,.1)',
  amber: '#FF9500', amberSoft: 'rgba(255,149,0,.1)',
  red: '#FF3B30', redSoft: 'rgba(255,59,48,.08)',
  purple: '#6366F1', purpleSoft: 'rgba(99,102,241,.1)',
  gold: '#B8860B', goldSoft: 'rgba(184,134,11,.08)',
}
const FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',system-ui,sans-serif"

const NETWORK_GRADIENT = 'linear-gradient(135deg, #B8860B, #D4A017)'

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════
const eur = n => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(n || 0))
const eurShort = n => {
  const v = Number(n || 0)
  if (Math.abs(v) >= 1e6) return `€${(v / 1e6).toFixed(1)}M`
  if (Math.abs(v) >= 1e3) return `€${(v / 1e3).toFixed(1)}k`
  return eur(v)
}
const usd = n => '$' + Number(n || 0).toFixed(4)
const num = n => new Intl.NumberFormat('es-ES').format(Number(n || 0))
const fmtDate = iso => { if (!iso) return '—'; return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) }
function timeAgo(iso) {
  if (!iso) return '—'
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `hace ${s}s`
  if (s < 3600) return `hace ${Math.floor(s / 60)}m`
  if (s < 86400) return `hace ${Math.floor(s / 3600)}h`
  return `hace ${Math.floor(s / 86400)}d`
}

const PROVIDER_COLORS = {
  claude: '#D97757', 'claude-haiku': '#D97757',
  'claude-opus-4-7': '#B8860B',
  openai: '#10A37F', gemini: '#4285F4',
  perplexity: '#20808D', groq: '#F55036', deepseek: '#5856D6',
}

// ════════════════════════════════════════════════════════════════════════════
// PRIMITIVOS
// ════════════════════════════════════════════════════════════════════════════
function Card({ children, style = {}, padding = 20 }) {
  return <div style={{
    background: T.card, borderRadius: 14,
    border: `.5px solid ${T.hairline}`,
    boxShadow: '0 1px 2px rgba(0,0,0,.02)',
    padding, ...style,
  }}>{children}</div>
}

function Btn({ children, onClick, disabled, color = T.blue, style = {} }) {
  return <button onClick={onClick} disabled={disabled} style={{
    padding: '7px 14px', borderRadius: 8, border: 'none',
    fontSize: 12.5, fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
    background: disabled ? T.sidebar : color,
    color: disabled ? T.text4 : '#fff',
    opacity: disabled ? .6 : 1,
    display: 'inline-flex', alignItems: 'center', gap: 6, ...style,
  }}>{children}</button>
}

function BtnSec({ children, onClick, style = {}, ...rest }) {
  return <button onClick={onClick} {...rest} style={{
    padding: '7px 14px', borderRadius: 8,
    border: `.5px solid ${T.hairline}`, background: T.card,
    fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
    fontFamily: 'inherit', color: T.text,
    display: 'inline-flex', alignItems: 'center', gap: 6, ...style,
  }}>{children}</button>
}

function Pill({ children, color = T.text3, bg = T.sidebar, style = {} }) {
  return <span style={{
    padding: '2px 8px', fontSize: 10.5, fontWeight: 600,
    color, background: bg, borderRadius: 999,
    display: 'inline-flex', alignItems: 'center', gap: 4, ...style,
  }}>{children}</span>
}

function PillTabs({ items, active, onChange }) {
  return <div style={{
    display: 'inline-flex', gap: 2, background: T.sidebar,
    padding: 3, borderRadius: 9,
  }}>
    {items.map(it => (
      <button key={it.key} onClick={() => onChange(it.key)} style={{
        padding: '6px 14px', borderRadius: 7,
        background: active === it.key ? T.card : 'transparent',
        border: active === it.key ? `.5px solid ${T.hairline}` : '.5px solid transparent',
        color: active === it.key ? T.text : T.text3,
        fontWeight: active === it.key ? 600 : 500,
        fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        boxShadow: active === it.key ? '0 1px 2px rgba(0,0,0,.04)' : 'none',
        transition: 'all .15s',
      }}>
        {it.icon}{it.label}
        {it.badge !== undefined && it.badge > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 700,
            color: active === it.key ? T.text3 : T.text4,
            background: active === it.key ? T.sidebar : 'rgba(0,0,0,.05)',
            padding: '1px 6px', borderRadius: 8,
          }}>{it.badge}</span>
        )}
      </button>
    ))}
  </div>
}

const Icon = ({ d, size = 16, sw = 1.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>{d}</svg>
)
const I = {
  pulse:    <Icon d={<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>} />,
  chat:     <Icon d={<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>} />,
  building: <Icon d={<><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"/></>} />,
  lab:      <Icon d={<><path d="M9 2v6L4 18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2L15 8V2M9 2h6"/></>} />,
  send:     <Icon d={<><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>} />,
  refresh:  <Icon d={<><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>} />,
  chevron:  <Icon d={<polyline points="9 18 15 12 9 6"/>} sw={2} />,
  back:     <Icon d={<polyline points="15 18 9 12 15 6"/>} sw={2} />,
  external: <Icon d={<><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>} />,
  shield:   <Icon d={<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>} />,
  database: <Icon d={<><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></>} />,
  zap:      <Icon d={<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>} />,
  users:    <Icon d={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>} />,
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
export default function VeraNetwork({ token }) {
  const [tab, setTab] = useState('pulso')
  const [contextCompany, setContextCompany] = useState(null)

  const h = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token])

  return (
    <div style={{
      height: 'calc(100vh - 80px)',
      background: T.bg,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', fontFamily: FONT,
      WebkitFontSmoothing: 'antialiased', borderRadius: 8,
    }}>
      <style>{`
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:999px}
        input:focus,select:focus,textarea:focus{outline:none;border-color:${T.gold}!important}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        .spin{animation:spin .9s linear infinite}
        .pulse{animation:pulse 2s ease-in-out infinite}
      `}</style>

      {/* HEADER */}
      <header style={{
        background: 'rgba(251,251,253,.92)',
        backdropFilter: 'saturate(180%) blur(20px)',
        borderBottom: `.5px solid ${T.hairline}`,
        padding: '14px 24px 0',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: NETWORK_GRADIENT,
            display: 'grid', placeItems: 'center',
            boxShadow: `0 2px 8px ${T.goldSoft}`,
          }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" fill="#fff" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1.1 }}>
              <span style={{ fontSize: 17, fontWeight: 600, color: T.text, letterSpacing: -.3 }}>
                Vera Network Agent
              </span>
              <Pill color={T.gold} bg={T.goldSoft}>
                {I.shield} Acceso interno
              </Pill>
            </div>
            <div style={{ fontSize: 11.5, color: T.text4, marginTop: 3 }}>
              La super-Vera con acceso cross-empresa · Claude Opus 4.7 · Auditada
            </div>
          </div>
          {contextCompany && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 10px', background: T.sidebar,
              borderRadius: 8, fontSize: 11.5, color: T.text2,
            }}>
              <span style={{ color: T.text4 }}>Contexto:</span>
              <strong>{contextCompany.name}</strong>
              <button onClick={() => setContextCompany(null)} style={{
                background: 'none', border: 'none', color: T.text4, fontSize: 14,
                cursor: 'pointer', fontFamily: 'inherit', padding: 0, lineHeight: 1,
              }}>×</button>
            </div>
          )}
        </div>

        <PillTabs
          items={[
            { key: 'pulso',    label: 'Pulso',    icon: I.pulse },
            { key: 'chat',     label: 'Chat',     icon: I.chat },
            { key: 'empresas', label: 'Empresas', icon: I.building },
            { key: 'lab',      label: 'Lab',      icon: I.lab },
          ]}
          active={tab}
          onChange={setTab}
        />
        <div style={{ height: 14 }} />
      </header>

      {/* CONTENIDO */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {tab === 'pulso'    && <PulsoTab h={h} />}
        {tab === 'chat'     && <ChatTab h={h} contextCompany={contextCompany} />}
        {tab === 'empresas' && <EmpresasTab h={h} onOpenChat={(c) => { setContextCompany(c); setTab('chat') }} />}
        {tab === 'lab'      && <LabTab h={h} />}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 1 — PULSO
// ════════════════════════════════════════════════════════════════════════════
function PulsoTab({ h }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/admin/vera-network/pulso`, { headers: h() })
      setData(await r.json())
      setLastUpdate(new Date())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [h])

  useEffect(() => {
    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [load])

  if (loading) return <Loading />
  if (!data) return <div style={{ padding: 40, color: T.text4, textAlign: 'center' }}>Sin datos.</div>

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 24px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>Pulso de la red Vela</div>
          <div style={{ fontSize: 12, color: T.text4 }}>Métricas agregadas en tiempo real · {(data?.totals?.companies || 0)} {(data?.totals?.companies || 0) === 1 ? 'empresa' : 'empresas'} en la red</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: T.text4 }}>
          <span className="pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: T.green }} />
          Actualizado {lastUpdate ? timeAgo(lastUpdate.toISOString()) : '—'}
          <BtnSec onClick={load} style={{ width: 30, padding: 0, justifyContent: 'center' }}>{I.refresh}</BtnSec>
        </div>
      </div>

      {/* KPIs grandes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        <BigMetric label="Empresas red" value={num((data?.totals?.companies || 0))} sub={`${data?.totals?.active_7d} activas 7d`} color={T.blue} icon={I.building} />
        <BigMetric label="Ventas hoy" value={eurShort(data?.sales?.today)} sub={`Mes: ${eurShort(data?.sales?.month)}`} color={T.green} icon={I.zap} />
        <BigMetric label="Ventas YTD" value={eurShort(data?.sales?.year)} sub="Agregado de toda la red" color={T.purple} icon={I.pulse} />
        <BigMetric label="Vera uso 7d" value={num(data?.vera_usage_7d?.requests)} sub={`${usd(data?.vera_usage_7d?.cost_usd)} coste`} color={T.gold} icon={I.chat} />
      </div>

      {/* Distribución de planes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 18 }}>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Distribución por plan</div>
          {data?.totals?.by_plan.map(p => {
            const pct = Math.round((p.count / (data?.totals?.companies || 0)) * 100)
            const isPlus = p.plan === 'plus'
            return (
              <div key={p.plan} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                  <span style={{ fontWeight: 500, color: T.text2 }}>{isPlus ? 'Vera Plus' : 'Vela (base)'}</span>
                  <span style={{ color: T.text3, fontVariantNumeric: 'tabular-nums' }}>{p.count} · {pct}%</span>
                </div>
                <div style={{ height: 6, background: T.sidebar, borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: isPlus ? T.blue : T.text3, borderRadius: 999 }} />
                </div>
              </div>
            )
          })}
          <div style={{ marginTop: 14, padding: '8px 10px', background: T.goldSoft, borderRadius: 8, fontSize: 11, color: T.gold }}>
            💡 Convierte {(data?.totals?.companies || 0) - (data?.totals?.by_plan.find(p => p.plan === 'plus')?.count || 0)} a Plus → +€{19 * ((data?.totals?.companies || 0) - (data?.totals?.by_plan.find(p => p.plan === 'plus')?.count || 0))}/mes MRR
          </div>
        </Card>

        <Card padding={0}>
          <div style={{ padding: '14px 18px', borderBottom: `.5px solid ${T.hairline}` }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Top empresas por ventas YTD</div>
            <div style={{ fontSize: 11, color: T.text4, marginTop: 2 }}>Ranking actual de la red</div>
          </div>
          {(data?.top_companies_ytd || []).length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: T.text4, fontSize: 12 }}>Sin datos.</div>
          ) : (data?.top_companies_ytd || []).map((c, i) => (
            <div key={c.id} style={{
              padding: '11px 18px',
              borderBottom: i < (data?.top_companies_ytd || []).length - 1 ? `.5px solid ${T.hairline}` : 'none',
              display: 'grid', gridTemplateColumns: '24px 1fr 70px 90px',
              alignItems: 'center', fontSize: 12.5, gap: 10,
            }}>
              <span style={{
                width: 22, height: 22, borderRadius: 6,
                background: i === 0 ? T.goldSoft : T.sidebar,
                color: i === 0 ? T.gold : T.text3,
                display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700,
              }}>{i + 1}</span>
              <span style={{ fontWeight: 500 }}>{c.name}</span>
              <Pill color={c.plan === 'plus' ? T.blue : T.text3} bg={c.plan === 'plus' ? 'rgba(61,43,255,.08)' : T.sidebar}>{c.plan}</Pill>
              <span style={{ textAlign: 'right', fontWeight: 600, color: T.green, fontVariantNumeric: 'tabular-nums' }}>{eurShort(c.sales_ytd)}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Vera usage breakdown */}
      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Uso de Vera últimos 7 días</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <MiniMetric label="Peticiones" val={num(data?.vera_usage_7d?.requests)} color={T.blue} />
          <MiniMetric label="Tokens" val={num(data?.vera_usage_7d?.tokens)} color={T.purple} />
          <MiniMetric label="Coste total" val={usd(data?.vera_usage_7d?.cost_usd)} color={T.green} />
          <MiniMetric label="Empresas activas" val={num(data?.vera_usage_7d?.active_companies)} color={T.amber} />
        </div>
      </Card>

      {/* Sectores + Proveedores top */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
        <Card padding={0}>
          <div style={{ padding: '14px 18px', borderBottom: `.5px solid ${T.hairline}` }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Ventas por sector (YTD)</div>
            <div style={{ fontSize: 11, color: T.text4, marginTop: 2 }}>Distribución de actividad económica</div>
          </div>
          {((data?.by_sector || []) || []).length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: T.text4, fontSize: 12 }}>Sin datos sectoriales.</div>
          ) : (data?.by_sector || []).map((s, i) => {
            const totalSales = (data?.by_sector || []).reduce((a, x) => a + x.sales, 0) || 1
            const pct = Math.round((s.sales / totalSales) * 100)
            const sectorIcons = { retail: '🛍️', hosteleria: '🍽️', servicios: '💼', tecnologia: '💻', salud: '⚕️', otros: '📊' }
            return (
              <div key={i} style={{
                padding: '12px 18px',
                borderBottom: i < (data?.by_sector || []).length - 1 ? `.5px solid ${T.hairline}` : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, opacity: .8 }}>{sectorIcons[s.sector] || '📊'}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 500, textTransform: 'capitalize' }}>{s.sector}</span>
                    <Pill>{s.companies} {s.companies === 1 ? 'emp' : 'emps'}</Pill>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.green, fontVariantNumeric: 'tabular-nums' }}>{eurShort(s.sales)}</span>
                </div>
                <div style={{ height: 4, background: T.sidebar, borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: T.green, borderRadius: 999 }} />
                </div>
              </div>
            )
          })}
        </Card>

        <Card padding={0}>
          <div style={{ padding: '14px 18px', borderBottom: `.5px solid ${T.hairline}` }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Top proveedores cross-red (YTD)</div>
            <div style={{ fontSize: 11, color: T.text4, marginTop: 2 }}>A quién pagan tus clientes</div>
          </div>
          {((data?.top_providers_ytd || []) || []).length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: T.text4, fontSize: 12 }}>Sin proveedores aún.</div>
          ) : (data?.top_providers_ytd || []).map((p, i) => (
            <div key={i} style={{
              padding: '11px 18px',
              borderBottom: i < (data?.top_providers_ytd || []).length - 1 ? `.5px solid ${T.hairline}` : 'none',
              display: 'grid', gridTemplateColumns: '24px 1fr 90px',
              alignItems: 'center', fontSize: 12.5, gap: 10,
            }}>
              <span style={{
                width: 22, height: 22, borderRadius: 6,
                background: T.sidebar, color: T.text3,
                display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600,
              }}>{i + 1}</span>
              <span style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
              <span style={{ textAlign: 'right', fontWeight: 600, color: T.red, fontVariantNumeric: 'tabular-nums' }}>{eurShort(p.total)}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Mapa España + Regiones */}
      <Card padding={0} style={{ marginTop: 14 }}>
        <div style={{ padding: '14px 18px', borderBottom: `.5px solid ${T.hairline}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Actividad geográfica</div>
            <div style={{ fontSize: 11, color: T.text4, marginTop: 2 }}>Empresas y ventas por comunidad autónoma</div>
          </div>
          <Pill>{((data?.by_region || []) || []).length} {(data?.by_region || [])?.length === 1 ? 'región' : 'regiones'}</Pill>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 0 }}>
          {/* Mapa SVG */}
          <div style={{ padding: 16, borderRight: `.5px solid ${T.hairline}`, display: 'grid', placeItems: 'center', minHeight: 280 }}>
            <SpainMap regions={(data?.by_region || []) || []} />
          </div>
          {/* Tabla regiones */}
          <div>
            {((data?.by_region || []) || []).length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: T.text4, fontSize: 12 }}>Sin datos regionales.</div>
            ) : (data?.by_region || []).map((r, i) => {
              const totalSales = (data?.by_region || []).reduce((a, x) => a + x.sales, 0) || 1
              const pct = Math.round((r.sales / totalSales) * 100)
              return (
                <div key={i} style={{
                  padding: '12px 18px',
                  borderBottom: i < (data?.by_region || []).length - 1 ? `.5px solid ${T.hairline}` : 'none',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                    <span style={{ fontWeight: 500 }}>{r.region}</span>
                    <span style={{ color: T.text3, fontVariantNumeric: 'tabular-nums' }}>{r.companies} · {pct}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ flex: 1, height: 4, background: T.sidebar, borderRadius: 999, overflow: 'hidden', marginRight: 8 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: T.gold, borderRadius: 999 }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: T.green, fontVariantNumeric: 'tabular-nums', minWidth: 60, textAlign: 'right' }}>{eurShort(r.sales)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>
    </div>
  )
}

// ─── MAPA DE ESPAÑA SVG (versión simple por comunidades autónomas) ───
function SpainMap({ regions }) {
  const regionData = {}
  regions.forEach(r => { regionData[r.region] = r })
  const maxSales = Math.max(...regions.map(r => r.sales), 1)

  const getColor = (regionName) => {
    const r = regionData[regionName]
    if (!r) return '#E5E5EA'
    const intensity = Math.min(r.sales / maxSales, 1)
    const alpha = 0.2 + intensity * 0.7
    return `rgba(184, 134, 11, ${alpha})`
  }

  const COMUNIDADES = [
    { name: 'Galicia', d: 'M55,55 L100,50 L110,80 L75,95 Z' },
    { name: 'Asturias', d: 'M105,52 L150,55 L145,75 L108,78 Z' },
    { name: 'Cantabria', d: 'M150,55 L185,58 L180,72 L148,72 Z' },
    { name: 'País Vasco', d: 'M185,58 L220,60 L218,80 L182,76 Z' },
    { name: 'Navarra', d: 'M218,80 L240,82 L235,110 L215,105 Z' },
    { name: 'La Rioja', d: 'M195,90 L218,82 L215,108 L195,108 Z' },
    { name: 'Aragón', d: 'M218,105 L255,108 L258,180 L218,175 Z' },
    { name: 'Cataluña', d: 'M258,108 L320,115 L325,180 L260,180 Z' },
    { name: 'Castilla y León', d: 'M105,80 L218,80 L218,170 L108,170 Z' },
    { name: 'Madrid', d: 'M168,150 L195,148 L195,178 L165,178 Z' },
    { name: 'Extremadura', d: 'M108,170 L165,178 L160,235 L105,232 Z' },
    { name: 'Castilla-La Mancha', d: 'M165,170 L258,180 L255,235 L160,235 Z' },
    { name: 'Comunidad Valenciana', d: 'M258,180 L300,225 L290,265 L255,235 Z' },
    { name: 'Andalucía', d: 'M105,232 L290,265 L260,295 L100,275 Z' },
    { name: 'Murcia', d: 'M255,235 L290,265 L275,285 L250,265 Z' },
    { name: 'Baleares', d: 'M325,210 L355,215 L355,225 L325,225 Z' },
    { name: 'Canarias', d: 'M65,300 L120,300 L120,318 L65,318 Z' },
  ]

  return (
    <svg viewBox="0 0 380 340" style={{ width: '100%', maxWidth: 380, height: 'auto', display: 'block' }}>
      {COMUNIDADES.map(c => {
        const data = regionData[c.name]
        const hasData = !!data
        return (
          <g key={c.name}>
            <path
              d={c.d}
              fill={getColor(c.name)}
              stroke={hasData ? '#B8860B' : '#D1D1D6'}
              strokeWidth={hasData ? 1.2 : 0.5}
              style={{ transition: 'fill .2s' }}
            >
              {hasData && <title>{c.name}: €{data?.sales?.toLocaleString('es-ES')} · {data.companies} {data.companies === 1 ? 'empresa' : 'empresas'}</title>}
            </path>
          </g>
        )
      })}
      <text x="190" y="335" textAnchor="middle" fontSize="9" fill="#86868B" fontFamily="system-ui">
        {regions.length === 0 ? 'Sin datos geográficos' : 'Pasa el cursor sobre cada región'}
      </text>
    </svg>
  )
}

function BigMetric({ label, value, sub, color, icon }) {
  return <Card padding={16}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 7,
        background: color + '15', color,
        display: 'grid', placeItems: 'center',
      }}>{icon}</div>
    </div>
    <div style={{ fontSize: 10.5, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: -.6, color: T.text, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: T.text4, marginTop: 4 }}>{sub}</div>}
  </Card>
}

function MiniMetric({ label, val, color }) {
  return <div style={{ padding: '10px 12px', background: T.sidebar, borderRadius: 9, border: `.5px solid ${T.hairline}` }}>
    <div style={{ fontSize: 10, color: T.text4, fontWeight: 500, marginBottom: 3 }}>{label}</div>
    <div style={{ fontSize: 16, fontWeight: 600, color, fontVariantNumeric: 'tabular-nums' }}>{val}</div>
  </div>
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 2 — CHAT
// ════════════════════════════════════════════════════════════════════════════
function ChatTab({ h, contextCompany }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversations, setConversations] = useState([])
  const [activeConvId, setActiveConvId] = useState(null)
  const [lastMeta, setLastMeta] = useState(null)
  const scrollRef = useRef(null)

  const loadConvs = useCallback(async () => {
    const r = await fetch(`${API}/api/admin/vera-network/conversations`, { headers: h() })
    setConversations(await r.json())
  }, [h])

  useEffect(() => { loadConvs() }, [loadConvs])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, loading])

  const loadConv = async (id) => {
    const r = await fetch(`${API}/api/admin/vera-network/conversations/${id}`, { headers: h() })
    const d = await r.json()
    setActiveConvId(id)
    setMessages(d.messages || [])
  }

  const newConv = () => { setActiveConvId(null); setMessages([]); setLastMeta(null) }

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input }
    setMessages(m => [...m, userMsg])
    const question = input
    setInput('')
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/admin/vera-network/chat`, {
        method: 'POST', headers: h(),
        body: JSON.stringify({
          mensaje: question,
          historial: messages,
          context_company_id: contextCompany?.id || null,
          conversation_id: activeConvId,
        }),
      })
      const d = await r.json()
      if (d.respuesta) {
        setMessages(m => [...m, { role: 'assistant', content: d.respuesta }])
        setLastMeta(d.metadata)
        if (d.conversation_id && !activeConvId) setActiveConvId(d.conversation_id)
        loadConvs()
      } else {
        setMessages(m => [...m, { role: 'assistant', content: 'Error: ' + (d.detail || 'sin respuesta') }])
      }
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: 'Error de red: ' + e.message }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ height: '100%', display: 'grid', gridTemplateColumns: '260px 1fr', gap: 0, overflow: 'hidden' }}>
      {/* SIDEBAR conversaciones */}
      <div style={{ borderRight: `.5px solid ${T.hairline}`, background: T.sidebar, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: 12, borderBottom: `.5px solid ${T.hairline}` }}>
          <Btn onClick={newConv} color={T.gold} style={{ width: '100%', justifyContent: 'center', background: NETWORK_GRADIENT }}>+ Nueva conversación</Btn>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
          {conversations.length === 0 ? (
            <div style={{ padding: 20, fontSize: 11, color: T.text4, textAlign: 'center' }}>Sin conversaciones aún</div>
          ) : conversations.map(c => (
            <div key={c.id} onClick={() => loadConv(c.id)} style={{
              padding: '9px 10px', marginBottom: 4, borderRadius: 7,
              background: activeConvId === c.id ? T.card : 'transparent',
              border: activeConvId === c.id ? `.5px solid ${T.hairline}` : '.5px solid transparent',
              cursor: 'pointer', fontSize: 11.5,
              boxShadow: activeConvId === c.id ? '0 1px 2px rgba(0,0,0,.04)' : 'none',
            }}>
              <div style={{ fontWeight: 500, color: T.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</div>
              <div style={{ fontSize: 10, color: T.text4, marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
                <span>{timeAgo(c.updated_at)}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{usd(c.total_cost_usd)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CHAT main */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {messages.length === 0 && !loading && <EmptyChat contextCompany={contextCompany} onPick={(q) => setInput(q)} />}
          {messages.map((m, i) => <Message key={i} role={m.role} content={typeof m.content === 'string' ? m.content : JSON.stringify(m.content)} />)}
          {loading && <Message role="assistant" content={null} loading />}
        </div>

        {lastMeta && (
          <div style={{
            padding: '6px 24px', borderTop: `.5px solid ${T.hairline}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: 10.5, color: T.text4, background: T.sidebar,
          }}>
            <span>
              {lastMeta.model} · {num(lastMeta.tokens_input + lastMeta.tokens_output)} tokens · {usd(lastMeta.cost_usd)} · {lastMeta.latency_ms}ms · {lastMeta.iterations} {lastMeta.iterations === 1 ? 'iter' : 'iters'}
              {lastMeta.sql_executed?.length > 0 && ` · ${lastMeta.sql_executed.length} SQL`}
            </span>
          </div>
        )}

        <div style={{ padding: 16, borderTop: `.5px solid ${T.hairline}`, display: 'flex', gap: 8 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={contextCompany ? `Pregúntale a Vera Network Agent sobre ${contextCompany.name}…` : 'Pregúntale a Vera Network Agent… (Opus 4.7 con acceso cross-empresa)'}
            disabled={loading}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 9,
              border: `.5px solid ${T.hairline}`, background: T.card,
              fontSize: 13, color: T.text, fontFamily: 'inherit',
            }}
          />
          <Btn onClick={send} disabled={loading || !input.trim()} color={T.gold} style={{ background: loading ? T.sidebar : NETWORK_GRADIENT }}>
            {loading ? <span className="spin" style={{ display: 'flex' }}>{I.refresh}</span> : I.send}
            {loading ? 'Pensando…' : 'Enviar'}
          </Btn>
        </div>
      </div>
    </div>
  )
}

function EmptyChat({ contextCompany, onPick }) {
  const sugerencias = contextCompany ? [
    `¿Cómo está la salud financiera de ${contextCompany.name}?`,
    `Compara ${contextCompany.name} con el resto de la red`,
    `¿Cuál es el patrón de ventas de ${contextCompany.name} este año?`,
    `Identifica oportunidades de upsell para ${contextCompany.name}`,
  ] : [
    '¿Cuántas empresas hay en la red y cuál es la top por ventas YTD?',
    'Identifica las 3 empresas con margen más bajo este mes',
    '¿Qué proveedores son más comunes entre clientes de la red?',
    'Detecta empresas candidatas a upsell a Vera Plus',
    'Resumen ejecutivo de la red Vela hoy',
  ]
  return (
    <div style={{ maxWidth: 600, margin: '40px auto', textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: 14, background: NETWORK_GRADIENT, display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
        <svg width="26" height="26" viewBox="0 0 16 16" fill="none">
          <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" fill="#fff" />
        </svg>
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, letterSpacing: -.3 }}>Vera Network Agent lista</div>
      <div style={{ fontSize: 13, color: T.text3, marginBottom: 24, lineHeight: 1.5 }}>
        Pregunta lo que quieras sobre cualquier dato de la red Vela. Vera ejecuta SQL automáticamente para responder con datos reales.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
        {sugerencias.map(s => (
          <button key={s} onClick={() => onPick(s)} style={{
            padding: '11px 14px', borderRadius: 9,
            background: T.card, border: `.5px solid ${T.hairline}`,
            fontSize: 12.5, color: T.text2, cursor: 'pointer', fontFamily: 'inherit',
            textAlign: 'left',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = T.sidebar; e.currentTarget.style.borderColor = T.gold + '60' }}
            onMouseLeave={e => { e.currentTarget.style.background = T.card; e.currentTarget.style.borderColor = T.hairline }}>
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

function Message({ role, content, loading }) {
  const isUser = role === 'user'
  return (
    <div style={{
      display: 'flex', gap: 10, marginBottom: 16,
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: 7, flexShrink: 0,
        background: isUser ? T.text3 : NETWORK_GRADIENT,
        display: 'grid', placeItems: 'center', color: '#fff', fontSize: 11, fontWeight: 700,
      }}>
        {isUser ? 'TÚ' : (
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" fill="#fff" />
          </svg>
        )}
      </div>
      <div style={{
        maxWidth: '78%',
        padding: '11px 15px', borderRadius: 12,
        background: isUser ? T.blue : T.card,
        color: isUser ? '#fff' : T.text,
        border: isUser ? 'none' : `.5px solid ${T.hairline}`,
        fontSize: 13, lineHeight: 1.55,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {loading ? (
          <span style={{ display: 'inline-flex', gap: 4, color: T.text3 }}>
            <span className="pulse" style={{ width: 5, height: 5, borderRadius: '50%', background: T.gold }} />
            <span className="pulse" style={{ width: 5, height: 5, borderRadius: '50%', background: T.gold, animationDelay: '.2s' }} />
            <span className="pulse" style={{ width: 5, height: 5, borderRadius: '50%', background: T.gold, animationDelay: '.4s' }} />
            <span style={{ marginLeft: 6, fontSize: 11.5 }}>Vera Network Agent razonando con Opus…</span>
          </span>
        ) : content}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 3 — EMPRESAS (lista + drill-down)
// ════════════════════════════════════════════════════════════════════════════
function EmpresasTab({ h, onOpenChat }) {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [drilldown, setDrilldown] = useState(null)
  const [drilldownLoading, setDrilldownLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`${API}/api/admin/vera-network/empresas`, { headers: h() })
      .then(r => r.json()).then(setCompanies).catch(console.error)
      .finally(() => setLoading(false))
  }, [h])

  const selectCompany = async (c) => {
    setSelectedId(c.id)
    setDrilldownLoading(true)
    setDrilldown(null)
    try {
      const r = await fetch(`${API}/api/admin/vera-network/empresas/${c.id}`, { headers: h() })
      setDrilldown(await r.json())
    } catch (e) { console.error(e) }
    finally { setDrilldownLoading(false) }
  }

  if (loading) return <Loading />

  return (
    <div style={{ height: '100%', display: 'grid', gridTemplateColumns: selectedId ? '380px 1fr' : '1fr', overflow: 'hidden' }}>
      {/* LISTA */}
      <div style={{ overflowY: 'auto', padding: '20px 24px 40px', borderRight: selectedId ? `.5px solid ${T.hairline}` : 'none' }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>Empresas de la red</div>
          <div style={{ fontSize: 12, color: T.text4 }}>{companies.length} {companies.length === 1 ? 'empresa' : 'empresas'} · Click para ver detalle</div>
        </div>

        {companies.map(c => (
          <div key={c.id} onClick={() => selectCompany(c)} style={{
            padding: '12px 14px', marginBottom: 8, borderRadius: 10,
            background: selectedId === c.id ? T.goldSoft : T.card,
            border: `.5px solid ${selectedId === c.id ? T.gold + '40' : T.hairline}`,
            cursor: 'pointer',
            boxShadow: selectedId === c.id ? `0 2px 8px ${T.goldSoft}` : '0 1px 2px rgba(0,0,0,.02)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 10.5, color: T.text4, marginTop: 2 }}>{c.country || '—'} · ID {c.id}</div>
              </div>
              <Pill color={c.plan === 'plus' ? T.blue : T.text3} bg={c.plan === 'plus' ? 'rgba(61,43,255,.08)' : T.sidebar}>{c.plan}</Pill>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.text3 }}>
              <span><strong style={{ color: T.green, fontWeight: 600 }}>{eurShort(c.sales_ytd)}</strong> YTD</span>
              <span>{c.vera_requests_7d} req Vera 7d</span>
              <span style={{ color: T.text4 }}>{c.users_count} {c.users_count === 1 ? 'user' : 'users'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* DRILL-DOWN */}
      {selectedId && (
        <div style={{ overflowY: 'auto', padding: '20px 24px 40px' }}>
          {drilldownLoading ? <Loading /> : drilldown ? (
            <CompanyDrilldown data={drilldown} onOpenChat={onOpenChat} />
          ) : (
            <div style={{ padding: 40, color: T.text4, textAlign: 'center' }}>Sin datos.</div>
          )}
        </div>
      )}
    </div>
  )
}

function CompanyDrilldown({ data, onOpenChat }) {
  const c = data.company
  const f = data.financials_ytd
  const v = data.vera_usage_30d
  const health = data.health_score
  const healthColor = health >= 7 ? T.green : health >= 5 ? T.amber : T.red
  const healthLabel = health >= 7 ? 'Saludable' : health >= 5 ? 'Regular' : 'Atención'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: -.3 }}>{c.name}</div>
          <div style={{ fontSize: 12, color: T.text4, marginTop: 3 }}>
            {c.country || '—'} · Plan <strong style={{ color: c.plan === 'plus' ? T.blue : T.text3 }}>{c.plan}</strong> · ID {c.id} · Creada {fmtDate(c.created_at)}
          </div>
        </div>
        <Btn onClick={() => onOpenChat(c)} color={T.gold} style={{ background: NETWORK_GRADIENT }}>
          {I.chat} Preguntar a Vera Network Agent
        </Btn>
      </div>

      {/* Health + financials */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <Card>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.text3, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 10 }}>Health score</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 36, fontWeight: 600, color: healthColor, letterSpacing: -1, fontVariantNumeric: 'tabular-nums' }}>{health}</span>
            <span style={{ fontSize: 14, color: T.text4 }}>/10</span>
            <span style={{ fontSize: 13, color: healthColor, fontWeight: 500, marginLeft: 'auto' }}>{healthLabel}</span>
          </div>
          <div style={{ height: 6, background: T.sidebar, borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${health * 10}%`, height: '100%', background: healthColor, borderRadius: 999 }} />
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.text3, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 10 }}>Margen YTD</div>
          <div style={{ fontSize: 32, fontWeight: 600, color: f.margen_pct >= 0 ? T.green : T.red, letterSpacing: -.8, fontVariantNumeric: 'tabular-nums', marginBottom: 6 }}>
            {f.margen_pct}%
          </div>
          <div style={{ fontSize: 11, color: T.text4 }}>
            <strong style={{ color: T.text2 }}>{eurShort(f.ingresos)}</strong> ing · <strong style={{ color: T.text2 }}>{eurShort(f.gastos)}</strong> gast
          </div>
        </Card>
      </div>

      {/* Vera usage */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Uso de Vera (30 días)</div>
          <span style={{ fontSize: 11, color: T.text4 }}>Último uso: {v.last_used ? timeAgo(v.last_used) : 'nunca'}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <MiniMetric label="Peticiones" val={num(v.requests)} color={T.blue} />
          <MiniMetric label="Tokens" val={num(v.tokens)} color={T.purple} />
          <MiniMetric label="Coste" val={usd(v.cost_usd)} color={T.green} />
        </div>
        {data.vera_topics_30d.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `.5px solid ${T.hairline}` }}>
            <div style={{ fontSize: 10.5, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 8 }}>Temas más consultados</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {data.vera_topics_30d.map(t => (
                <Pill key={t.module}>{t.module} · {t.count}</Pill>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Acciones recomendadas */}
      {data.actions && data.actions.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Acciones recomendadas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.actions.map((a, i) => {
              const colors = {
                alert: { c: T.red, bg: T.redSoft, label: 'Alerta' },
                warning: { c: T.amber, bg: T.amberSoft, label: 'Atención' },
                upsell: { c: T.blue, bg: 'rgba(61,43,255,.08)', label: 'Upsell' },
                churn: { c: T.red, bg: T.redSoft, label: 'Riesgo' },
                engagement: { c: T.amber, bg: T.amberSoft, label: 'Engagement' },
                success: { c: T.green, bg: T.greenSoft, label: 'Éxito' },
              }
              const cfg = colors[a.type] || { c: T.text3, bg: T.sidebar, label: '' }
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: 12, borderRadius: 9, background: cfg.bg,
                  border: `.5px solid ${cfg.c}30`,
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', background: cfg.c,
                    marginTop: 6, flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 9.5, fontWeight: 700, color: cfg.c, textTransform: 'uppercase', letterSpacing: .4, padding: '1px 6px', background: '#fff', borderRadius: 4 }}>{cfg.label}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>{a.title}</span>
                    </div>
                    <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.5 }}>{a.detail}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Conversaciones recientes con su Vera */}
      {data.recent_chats && data.recent_chats.length > 0 && (
        <Card padding={0} style={{ marginBottom: 16 }}>
          <div style={{ padding: '12px 16px', borderBottom: `.5px solid ${T.hairline}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Últimas conversaciones con Vera</div>
              <div style={{ fontSize: 11, color: T.text4, marginTop: 2 }}>Lo que el cliente le ha estado preguntando</div>
            </div>
            <Pill>{data.recent_chats.length}</Pill>
          </div>
          {data.recent_chats.map((ch, i) => (
            <div key={ch.id} style={{
              padding: '12px 16px',
              borderBottom: i < data.recent_chats.length - 1 ? `.5px solid ${T.hairline}` : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 12 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: T.text, flex: 1, minWidth: 0 }}>
                  "{ch.question || '(sin pregunta)'}"
                </div>
                <span style={{ fontSize: 10.5, color: T.text4, whiteSpace: 'nowrap', flexShrink: 0 }}>{timeAgo(ch.created_at)}</span>
              </div>
              {ch.preview && (
                <div style={{ fontSize: 11, color: T.text3, lineHeight: 1.5, paddingLeft: 10, borderLeft: `2px solid ${T.hairline}` }}>
                  {ch.preview.length > 180 ? ch.preview.substring(0, 180) + '…' : ch.preview}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 10, color: T.text4 }}>
                {ch.model && <Pill color={T.text3}>{ch.model}</Pill>}
                {ch.tokens > 0 && <span>{ch.tokens} tokens</span>}
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Users */}
      <Card padding={0}>
        <div style={{ padding: '12px 16px', borderBottom: `.5px solid ${T.hairline}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Usuarios de la empresa</div>
          <Pill>{data.users.length}</Pill>
        </div>
        {data.users.map((u, i) => (
          <div key={u.id} style={{
            padding: '10px 16px',
            borderBottom: i < data.users.length - 1 ? `.5px solid ${T.hairline}` : 'none',
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5,
          }}>
            <span style={{ width: 24, height: 24, borderRadius: 6, background: T.sidebar, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600, color: T.text3 }}>
              {u.name?.[0]?.toUpperCase() || '?'}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500 }}>{u.name}</div>
              <div style={{ fontSize: 11, color: T.text4 }}>{u.email}</div>
            </div>
            {u.is_superadmin && <Pill color={T.gold} bg={T.goldSoft}>Superadmin</Pill>}
            {u.is_admin && !u.is_superadmin && <Pill color={T.blue} bg="rgba(61,43,255,.08)">Admin</Pill>}
          </div>
        ))}
      </Card>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 4 — LAB (comparativa modelos)
// ════════════════════════════════════════════════════════════════════════════
function LabTab({ h }) {
  const [models, setModels] = useState([])
  const [selected, setSelected] = useState(['claude', 'claude-haiku'])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)

  useEffect(() => {
    fetch(`${API}/api/backoffice/vera-routing/models`, { headers: h() })
      .then(r => r.json()).then(ms => setModels(ms.filter(m => m.has_api_key)))
      .catch(console.error)
  }, [h])

  const toggle = (p) => {
    if (selected.includes(p)) setSelected(selected.filter(x => x !== p))
    else if (selected.length < 4) setSelected([...selected, p])
  }

  const run = async () => {
    if (!question.trim() || selected.length < 2) return
    setLoading(true); setResults(null)
    try {
      const r = await fetch(`${API}/api/admin/vera-network/lab`, {
        method: 'POST', headers: h(),
        body: JSON.stringify({ mensaje: question, models: selected }),
      })
      setResults(await r.json())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 24px 40px' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>Laboratorio de modelos</div>
        <div style={{ fontSize: 12, color: T.text4, lineHeight: 1.5, maxWidth: 700 }}>
          Compara respuestas de varios modelos a la misma pregunta. Útil para decidir qué modelo asignar a cada tarea o regla de routing.
        </div>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.text3, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 8 }}>Modelos a comparar ({selected.length}/4)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {models.map(m => {
            const isSel = selected.includes(m.provider)
            const color = PROVIDER_COLORS[m.provider] || T.text3
            return (
              <button key={m.provider} onClick={() => toggle(m.provider)} style={{
                padding: '6px 12px', borderRadius: 999, fontFamily: 'inherit',
                fontSize: 12, cursor: 'pointer',
                background: isSel ? color : T.card,
                color: isSel ? '#fff' : T.text2,
                border: `.5px solid ${isSel ? color : T.hairline}`,
                fontWeight: 500,
              }}>{m.display_name}</button>
            )
          })}
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.text3, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 6 }}>Pregunta</div>
        <textarea
          rows={3}
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Ej: ¿Cómo afecta una bajada del IVA al margen de un negocio de retail?"
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 9,
            border: `.5px solid ${T.hairline}`, fontFamily: 'inherit',
            fontSize: 13, color: T.text, resize: 'vertical', marginBottom: 12,
          }}
        />
        <Btn onClick={run} disabled={loading || !question.trim() || selected.length < 2} color={T.gold} style={{ background: NETWORK_GRADIENT }}>
          {loading ? <span className="spin" style={{ display: 'flex' }}>{I.refresh}</span> : I.zap}
          {loading ? 'Ejecutando…' : `Comparar ${selected.length} modelos`}
        </Btn>
      </Card>

      {results && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(results.results.length, 2)}, 1fr)`, gap: 12 }}>
          {results.results.map((r, i) => {
            const color = PROVIDER_COLORS[r.provider] || T.text3
            return (
              <Card key={i} padding={0}>
                <div style={{
                  padding: '11px 14px', borderBottom: `.5px solid ${T.hairline}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: `${color}08`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                    <strong style={{ fontSize: 13, color: T.text }}>{r.provider}</strong>
                    {r.model_id && <code style={{ fontSize: 10, color: T.text4 }}>{r.model_id}</code>}
                  </div>
                  {!r.error && (
                    <span style={{ fontSize: 10.5, color: T.text4, fontVariantNumeric: 'tabular-nums' }}>
                      {(r.tokens_input || 0) + (r.tokens_output || 0)} tok · {r.latency_ms}ms
                    </span>
                  )}
                </div>
                <div style={{ padding: '14px 16px', fontSize: 12.5, lineHeight: 1.55, color: T.text2, whiteSpace: 'pre-wrap', minHeight: 100 }}>
                  {r.error ? <span style={{ color: T.red }}>⚠ {r.error}</span> : r.response}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Loading() {
  return <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: T.text4 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
      <span className="spin" style={{ display: 'flex' }}>{I.refresh}</span>
      Cargando…
    </div>
  </div>
}
