'use client'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import VeraRoutingEditor from './VeraRoutingEditor'
import VeraPipelineEditor from './VeraPipelineEditor'
import VeraDocTemplates from './VeraDocTemplates'
import VeraDocPrompts from './VeraDocPrompts'

import { API_BASE as API } from '@/lib/api'

// ════════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS (alineado con resto de Vela)
// ════════════════════════════════════════════════════════════════════════════
const T = {
  bg: '#FBFBFD', card: '#FFFFFF', sidebar: '#F5F5F7',
  hairline: 'rgba(0,0,0,0.08)', soft: 'rgba(0,0,0,0.05)',
  text: '#1D1D1F', text2: '#424245', text3: '#6E6E73', text4: '#86868B',
  blue: '#4F46E5', cyan: '#4F46E5',
  green: '#34C759', greenSoft: 'rgba(52,199,89,.1)',
  amber: '#FF9500', amberSoft: 'rgba(255,149,0,.1)',
  red: '#FF3B30', redSoft: 'rgba(255,59,48,.08)',
  purple: '#6366F1', purpleSoft: 'rgba(99,102,241,.1)',
  gold: '#B8860B',
}
const FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',system-ui,sans-serif"

const VERA_GRADIENT = 'linear-gradient(135deg, #4F46E5, #A5B1FF)'

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════
const eur = n => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(n || 0))
const usd = n => '$' + Number(n || 0).toFixed(4)
const num = n => new Intl.NumberFormat('es-ES').format(Number(n || 0))

function timeAgo(iso) {
  if (!iso) return '—'
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `hace ${s}s`
  if (s < 3600) return `hace ${Math.floor(s / 60)}m`
  if (s < 86400) return `hace ${Math.floor(s / 3600)}h`
  return `hace ${Math.floor(s / 86400)}d`
}

const PROVIDER_BADGES = {
  claude: { color: '#D97757', bg: '#FFF1EB', label: 'Anthropic' },
  'claude-haiku': { color: '#D97757', bg: '#FFF1EB', label: 'Anthropic' },
  openai: { color: '#10A37F', bg: '#E6F7F1', label: 'OpenAI' },
  gemini: { color: '#4285F4', bg: '#E8F0FE', label: 'Google' },
  perplexity: { color: '#20808D', bg: '#E0F2F4', label: 'Perplexity' },
  groq: { color: '#F55036', bg: '#FFEEEA', label: 'Groq' },
  deepseek: { color: '#5856D6', bg: '#EEEEFF', label: 'DeepSeek' },
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
    display: 'inline-flex', alignItems: 'center', gap: 6,
    transition: 'opacity .15s', ...style,
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

function StatusDot({ status, size = 8 }) {
  const colors = { ok: T.green, fail: T.red, missing_key: T.text4, unknown: T.amber }
  return <span style={{
    width: size, height: size, borderRadius: '50%',
    background: colors[status] || T.text4,
    display: 'inline-block', flexShrink: 0,
  }} />
}

function Toggle({ value, onChange, disabled }) {
  return <button onClick={() => !disabled && onChange(!value)} disabled={disabled} style={{
    width: 32, height: 18, borderRadius: 999,
    background: value ? T.green : T.hairline,
    border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    position: 'relative', transition: 'all .15s', flexShrink: 0,
    opacity: disabled ? .5 : 1,
  }}>
    <span style={{
      position: 'absolute', top: 2, left: value ? 16 : 2,
      width: 14, height: 14, borderRadius: '50%', background: '#fff',
      transition: 'left .15s',
      boxShadow: '0 1px 3px rgba(0,0,0,.2)',
    }} />
  </button>
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
        {it.icon}
        {it.label}
        {it.badge !== undefined && (
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
  layers:    <Icon d={<><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>} />,
  plug:      <Icon d={<><path d="M9 2v6M15 2v6M6 8h12v2a6 6 0 0 1-12 0V8zM12 22v-8"/></>} />,
  flow:      <Icon d={<><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><line x1="9" y1="6" x2="15" y2="6"/><line x1="6" y1="9" x2="6" y2="15"/></>} />,
  list:      <Icon d={<><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>} />,
  chart:     <Icon d={<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>} />,
  network:   <Icon d={<><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>} />,
  check:     <Icon d={<polyline points="20 6 9 17 4 12"/>} sw={2.2} />,
  x:         <Icon d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} sw={2.2} />,
  refresh:   <Icon d={<><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>} />,
  key:       <Icon d={<><circle cx="8" cy="15" r="4"/><path d="M10.85 12.15L19 4M18 5l2 2M15 8l2 2"/></>} />,
  zap:       <Icon d={<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>} />,
  edit:      <Icon d={<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>} />,
  euro:      <Icon d={<><path d="M21 5h-9a8 8 0 0 0 0 16h9M4 11h10M4 15h10"/></>} />,
  sparkle:   <Icon d={<path d="M12 3L13.5 8.5 19 10 13.5 11.5 12 17 10.5 11.5 5 10 10.5 8.5 12 3z"/>} sw={1.2}/>,
  chevron:   <Icon d={<polyline points="6 9 12 15 18 9"/>} sw={2}/>,
  external:  <Icon d={<><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>} />,
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
export default function VeraStudio({ token }) {
  const [tab, setTab] = useState('planes')
  const [refreshKey, setRefreshKey] = useState(0)

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
        input:focus,select:focus,textarea:focus{outline:none;border-color:${T.blue}!important}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .spin{animation:spin .9s linear infinite}
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
            background: VERA_GRADIENT,
            display: 'grid', placeItems: 'center',
          }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" fill="#fff" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: T.text, letterSpacing: -.3, lineHeight: 1.1 }}>
              Vera Studio
            </div>
            <div style={{ fontSize: 11.5, color: T.text4, marginTop: 2 }}>
              Control central de Vera · Planes · APIs · Routing · Logs · Stats
            </div>
          </div>
          <Pill color={T.blue} bg="rgba(79,70,229,.08)">
            <StatusDot status="ok" size={6} />
            Sistema operativo
          </Pill>
          <BtnSec onClick={() => setRefreshKey(k => k + 1)} style={{ width: 32, padding: 0, justifyContent: 'center' }}>
            {I.refresh}
          </BtnSec>
        </div>

        <PillTabs
          items={[
            { key: 'planes',  label: 'Planes',  icon: I.layers },
            { key: 'apis',    label: 'APIs',    icon: I.plug },
            { key: 'plantillas', label: 'Plantillas', icon: I.layers },
            { key: 'prompts', label: 'Prompts', icon: I.layers },
            { key: 'routing', label: 'Routing', icon: I.flow },
            { key: 'logs',    label: 'Logs',    icon: I.list },
            { key: 'stats',   label: 'Stats',   icon: I.chart },
          ]}
          active={tab}
          onChange={setTab}
        />
        <div style={{ height: 14 }} />
      </header>

      {/* CONTENIDO */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {tab === 'planes'  && <PlanesTab token={token} h={h} key={`p-${refreshKey}`} />}
        {tab === 'apis'    && <ApisTab token={token} h={h} key={`a-${refreshKey}`} />}
        {tab === 'plantillas' && <VeraDocTemplates token={token} key={`pt-${refreshKey}`} />}
        {tab === 'prompts' && <VeraDocPrompts token={token} key={`pr-${refreshKey}`} />}
        {tab === 'routing' && <RoutingTab token={token} key={`r-${refreshKey}`} />}
        {tab === 'logs'    && <LogsTab token={token} h={h} key={`l-${refreshKey}`} />}
        {tab === 'stats'   && <StatsTab token={token} h={h} key={`s-${refreshKey}`} />}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 1 — PLANES
// ════════════════════════════════════════════════════════════════════════════
const FEATURE_LABELS = {
  chat: 'Chat con Vera (todos los módulos)',
  vera_parse: 'Vera-Parse (texto → JSON)',
  insights_auto: 'Insights automáticos por módulo',
  anomaly_detection_daily: 'Detección anomalías (diaria)',
  anomaly_realtime: 'Detección anomalías (tiempo real)',
  vision_basic: 'Visión básica (facturas, tickets)',
  vision_advanced: 'Visión avanzada (contratos, multi-página)',
  crm_draft_only: 'CRM: solo borrador',
  crm_auto_send: 'CRM: envío automático (>90% confianza)',
  web_search: 'Búsqueda web (Perplexity)',
  tool_use_acts: 'Vera-Acts (Vera ejecuta acciones)',
  consensus_opus: 'Análisis Opus (consensus)',
  weekly_digest: 'Digest semanal por email',
  voice_mode: 'Modo voz (próximamente)',
  api_access: 'Acceso vía API',
}

function PlanesTab({ token, h }) {
  const [plans, setPlans] = useState([])
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pr, mr] = await Promise.all([
        fetch(`${API}/api/backoffice/vera-routing/plans`, { headers: h() }),
        fetch(`${API}/api/backoffice/vera-routing/models`, { headers: h() }),
      ])
      const plansData = await pr.json()
      setPlans(Array.isArray(plansData) ? plansData : [])
      const modelsData = await mr.json()
      setModels(Array.isArray(modelsData) ? modelsData : [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [h])
  useEffect(() => { load() }, [load])

  const savePlan = async () => {
    if (!editing) return
    setSaving(true)
    try {
      await fetch(`${API}/api/backoffice/vera-routing/plans/${editing.plan_key}`, {
        method: 'PUT', headers: h(),
        body: JSON.stringify({
          display_name: editing.display_name,
          price_eur_monthly: parseFloat(editing.price_eur_monthly),
          description: editing.description,
          tokens_daily_limit: parseInt(editing.tokens_daily_limit),
          primary_model: editing.primary_model,
          fallback_model: editing.fallback_model,
          memory_days: parseInt(editing.memory_days),
          features_json: JSON.stringify(editing.features),
        }),
      })
      setEditing(null)
      await load()
    } catch (e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  if (loading) return <LoadingState />

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 24px 40px' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>Planes de Vera</div>
        <div style={{ fontSize: 12, color: T.text4, lineHeight: 1.5 }}>
          Vera viene incluida en todos los planes de Vela. Vera Plus es el upgrade que añade capacidades avanzadas (búsqueda web, visión, auto-acciones, memoria permanente).
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 14,
      }}>
        {(plans || []).map(p => (
          <PlanCard
            key={p.plan_key}
            plan={p}
            models={models}
            onEdit={() => setEditing(JSON.parse(JSON.stringify(p)))}
          />
        ))}
      </div>

      {editing && (
        <PlanEditModal
          plan={editing}
          models={models}
          onChange={setEditing}
          onClose={() => setEditing(null)}
          onSave={savePlan}
          saving={saving}
        />
      )}
    </div>
  )
}

function PlanCard({ plan, models, onEdit }) {
  const isPlus = plan.plan_key === 'plus'
  const features = plan.features || {}
  const activeFeatures = Object.keys(features).filter(k => features[k])
  const primary = models.find(m => m.provider === plan.primary_model)
  const fallback = models.find(m => m.provider === plan.fallback_model)

  return (
    <div style={{
      background: T.card, borderRadius: 14,
      border: `.5px solid ${isPlus ? 'rgba(79,70,229,.25)' : T.hairline}`,
      boxShadow: isPlus ? '0 4px 16px rgba(79,70,229,.06)' : '0 1px 2px rgba(0,0,0,.02)',
      overflow: 'hidden', position: 'relative',
    }}>
      {isPlus && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: VERA_GRADIENT,
        }} />
      )}

      <div style={{ padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: -.3 }}>{plan.display_name}</span>
              {isPlus && <Pill color={T.blue} bg="rgba(79,70,229,.08)">PREMIUM</Pill>}
            </div>
            <div style={{ fontSize: 12, color: T.text3, lineHeight: 1.5 }}>{plan.description}</div>
          </div>
          <BtnSec onClick={onEdit} style={{ padding: '5px 10px', fontSize: 11.5 }}>
            {I.edit} Editar
          </BtnSec>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 18 }}>
          <span style={{ fontSize: 36, fontWeight: 600, letterSpacing: -1.5, color: T.text }}>
            {plan.price_eur_monthly === 0 ? 'Incluida' : `€${plan.price_eur_monthly}`}
          </span>
          {plan.price_eur_monthly > 0 && <span style={{ fontSize: 13, color: T.text3 }}>/mes</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          <MetricBox label="Tokens diarios" value={plan.tokens_daily_limit === -1 ? 'Ilimitado' : num(plan.tokens_daily_limit)} />
          <MetricBox label="Memoria" value={plan.memory_days === -1 ? 'Permanente' : `${plan.memory_days} días`} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10.5, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>
            Modelos
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {primary && <ModelBadge model={primary} role="principal" />}
            {fallback && fallback.provider !== primary?.provider && <ModelBadge model={fallback} role="fallback" />}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10.5, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>
            Capacidades · {activeFeatures.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Object.keys(features).map(k => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                <span style={{
                  width: 16, height: 16, borderRadius: 4,
                  background: features[k] ? T.greenSoft : T.sidebar,
                  color: features[k] ? T.green : T.text4,
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                  {features[k] ? I.check : I.x}
                </span>
                <span style={{ color: features[k] ? T.text2 : T.text4, textDecoration: features[k] ? 'none' : 'line-through' }}>
                  {FEATURE_LABELS[k] || k}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        padding: '12px 22px', borderTop: `.5px solid ${T.hairline}`,
        background: T.sidebar, display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', fontSize: 11.5, color: T.text3,
      }}>
        <span><strong style={{ color: T.text, fontWeight: 600 }}>{plan.companies_count}</strong> {plan.companies_count === 1 ? 'empresa' : 'empresas'}</span>
        <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{plan.plan_key}</span>
      </div>
    </div>
  )
}

function MetricBox({ label, value }) {
  return <div style={{
    padding: '10px 12px', background: T.sidebar,
    borderRadius: 9, border: `.5px solid ${T.hairline}`,
  }}>
    <div style={{ fontSize: 10, color: T.text4, fontWeight: 500, marginBottom: 3 }}>{label}</div>
    <div style={{ fontSize: 14, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
  </div>
}

function ModelBadge({ model, role }) {
  const brand = PROVIDER_BADGES[model.provider] || { color: T.text3, bg: T.sidebar }
  return <div style={{
    padding: '6px 10px', borderRadius: 8,
    background: brand.bg, border: `.5px solid ${brand.color}30`,
    display: 'inline-flex', alignItems: 'center', gap: 8,
  }}>
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: brand.color }} />
    <span style={{ fontSize: 11.5, fontWeight: 600, color: brand.color }}>{model.display_name}</span>
    <span style={{ fontSize: 9.5, color: brand.color, opacity: .65, textTransform: 'uppercase', letterSpacing: .3 }}>{role}</span>
  </div>
}

function PlanEditModal({ plan, models, onChange, onClose, onSave, saving }) {
  const update = (field, val) => onChange({ ...plan, [field]: val })
  const updateFeature = (key, val) => onChange({ ...plan, features: { ...plan.features, [key]: val } })

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed', inset: 0, zIndex: 800,
      background: 'rgba(0,0,0,.25)', backdropFilter: 'blur(3px)',
      display: 'grid', placeItems: 'center', padding: 20,
    }}>
      <Card padding={0} style={{ width: 600, maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 22px', borderBottom: `.5px solid ${T.hairline}` }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Editar plan · {plan.display_name}</div>
          <div style={{ fontSize: 11.5, color: T.text4, marginTop: 3 }}>
            Cambios aplicados al guardar afectan a {plan.companies_count} {plan.companies_count === 1 ? 'empresa' : 'empresas'}.
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
          <Field label="Nombre"><input value={plan.display_name} onChange={e => update('display_name', e.target.value)} style={inp} /></Field>
          <Field label="Descripción"><textarea rows={2} value={plan.description || ''} onChange={e => update('description', e.target.value)} style={{ ...inp, resize: 'vertical' }} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Precio €/mes"><input type="number" step="0.01" value={plan.price_eur_monthly} onChange={e => update('price_eur_monthly', e.target.value)} style={inp} /></Field>
            <Field label="Tokens diarios (-1 = ilimitado)"><input type="number" value={plan.tokens_daily_limit} onChange={e => update('tokens_daily_limit', e.target.value)} style={inp} /></Field>
          </div>
          {plan.plan_key === 'plus' && (
            <div style={{
              padding: '10px 12px', marginBottom: 12,
              background: 'rgba(79,70,229,.06)', borderRadius: 8,
              border: '.5px solid rgba(79,70,229,.18)',
              fontSize: 11.5, color: T.dark, lineHeight: 1.5,
            }}>
              <strong>En Vera Plus el orquestador decide el modelo</strong> según el tipo de pregunta (simple → Haiku, normal/análisis/crítico → Sonnet). Los campos primary/fallback de abajo son referencia/legacy.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Field label="Modelo principal">
              <select value={plan.primary_model || ''} onChange={e => update('primary_model', e.target.value)} style={inp} disabled={plan.plan_key === 'plus'}>
                {(models || []).map(m => <option key={m.provider} value={m.provider}>{m.display_name}</option>)}
              </select>
            </Field>
            <Field label="Modelo fallback">
              <select value={plan.fallback_model || ''} onChange={e => update('fallback_model', e.target.value)} style={inp} disabled={plan.plan_key === 'plus'}>
                {(models || []).map(m => <option key={m.provider} value={m.provider}>{m.display_name}</option>)}
              </select>
            </Field>
            <Field label="Memoria días (-1 = permanente)"><input type="number" value={plan.memory_days} onChange={e => update('memory_days', e.target.value)} style={inp} /></Field>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.text3, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 8 }}>Capacidades</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {Object.keys(plan.features || {}).map(k => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: T.sidebar, borderRadius: 8, cursor: 'pointer', fontSize: 12.5 }}>
                  <Toggle value={plan.features[k]} onChange={v => updateFeature(k, v)} />
                  <span style={{ color: T.text2 }}>{FEATURE_LABELS[k] || k}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: 16, borderTop: `.5px solid ${T.hairline}`, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <BtnSec onClick={onClose}>Cancelar</BtnSec>
          <Btn onClick={onSave} disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</Btn>
        </div>
      </Card>
    </div>
  )
}

const inp = {
  width: '100%', padding: '9px 11px', borderRadius: 8,
  border: `.5px solid ${T.hairline}`, background: T.card,
  fontSize: 13, color: T.text, fontFamily: 'inherit',
  transition: 'border-color .15s',
}

function Field({ label, children }) {
  return <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 11, fontWeight: 500, color: T.text3, marginBottom: 4, letterSpacing: .2, textTransform: 'uppercase' }}>{label}</div>
    {children}
  </div>
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 2 — APIs
// ════════════════════════════════════════════════════════════════════════════
function ApisTab({ token, h }) {
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedKey, setExpandedKey] = useState(null)
  const [keyDraft, setKeyDraft] = useState('')
  const [testing, setTesting] = useState(null)
  const [saving, setSaving] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/backoffice/vera-routing/models`, { headers: h() })
      setModels(await r.json())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [h])
  useEffect(() => { load() }, [load])

  const toggleActive = async (m) => {
    await fetch(`${API}/api/backoffice/vera-routing/models/${m.provider}`, {
      method: 'PUT', headers: h(), body: JSON.stringify({ is_active: !m.is_active }),
    })
    load()
  }

  const saveApiKey = async (provider) => {
    if (!keyDraft.trim()) return
    setSaving(provider)
    try {
      await fetch(`${API}/api/backoffice/vera-routing/models/${provider}/api-key`, {
        method: 'PUT', headers: h(), body: JSON.stringify({ api_key_value: keyDraft.trim() }),
      })
      setKeyDraft(''); setExpandedKey(null)
      await load()
      // Auto-probar tras guardar
      await testModel(provider)
    } catch (e) { alert('Error: ' + e.message) }
    finally { setSaving(null) }
  }

  const deleteApiKey = async (provider) => {
    if (!confirm('¿Borrar la API key guardada? Volverá a usar la del .env si está.')) return
    await fetch(`${API}/api/backoffice/vera-routing/models/${provider}/api-key`, { method: 'DELETE', headers: h() })
    load()
  }

  const testModel = async (provider) => {
    setTesting(provider)
    try {
      await fetch(`${API}/api/backoffice/vera-routing/models/${provider}/test`, { method: 'POST', headers: h() })
      await load()
    } catch (e) { console.error(e) }
    finally { setTesting(null) }
  }

  if (loading) return <LoadingState />

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 24px 40px' }}>
      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>APIs de modelos de IA</div>
          <div style={{ fontSize: 12, color: T.text4, lineHeight: 1.5, maxWidth: 700 }}>
            Configura las API keys de cada proveedor. Las keys guardadas aquí sobrescriben las del .env del servidor. Botón "Probar" hace una llamada real de validación.
          </div>
        </div>
        <Pill color={T.text3}>
          {models.filter(m => m.has_api_key).length}/{models.length} configurados
        </Pill>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 12 }}>
        {(models || []).map(m => (
          <ApiModelCard
            key={m.provider}
            model={m}
            isExpanded={expandedKey === m.provider}
            onToggleExpand={() => { setExpandedKey(expandedKey === m.provider ? null : m.provider); setKeyDraft('') }}
            onSaveKey={() => saveApiKey(m.provider)}
            onDeleteKey={() => deleteApiKey(m.provider)}
            onTest={() => testModel(m.provider)}
            onToggleActive={() => toggleActive(m)}
            keyDraft={keyDraft}
            setKeyDraft={setKeyDraft}
            testing={testing === m.provider}
            saving={saving === m.provider}
          />
        ))}
      </div>
    </div>
  )
}

function ApiModelCard({ model: m, isExpanded, onToggleExpand, onSaveKey, onDeleteKey, onTest, onToggleActive, keyDraft, setKeyDraft, testing, saving }) {
  const brand = PROVIDER_BADGES[m.provider] || { color: T.text3, bg: T.sidebar, label: '—' }
  const statusColor = m.api_key_status === 'ok' ? T.green : m.api_key_status === 'fail' ? T.red : m.has_api_key ? T.amber : T.text4
  const statusLabel = m.api_key_status === 'ok' ? 'OK' : m.api_key_status === 'fail' ? 'Falla' : m.has_api_key ? 'Sin probar' : 'Sin key'

  return (
    <div style={{
      background: T.card, borderRadius: 12,
      border: `.5px solid ${T.hairline}`,
      boxShadow: '0 1px 2px rgba(0,0,0,.02)',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: brand.color, flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{m.display_name}</span>
            </div>
            <div style={{ fontSize: 11, color: T.text4 }}>{brand.label} · <code style={{ fontSize: 10 }}>{m.model_id}</code></div>
          </div>
          <Toggle value={m.is_active} onChange={onToggleActive} disabled={!m.has_api_key} />
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          <Pill color={statusColor} bg={statusColor + '15'}>
            <StatusDot status={m.api_key_status === 'ok' ? 'ok' : m.api_key_status === 'fail' ? 'fail' : m.has_api_key ? 'unknown' : 'missing_key'} size={6} />
            {statusLabel}
          </Pill>
          {m.has_api_key && (
            <Pill>{m.key_source === 'database' ? 'BD' : 'ENV'}</Pill>
          )}
          <Pill color={m.plan_required === 'plus' ? T.blue : T.text3} bg={m.plan_required === 'plus' ? 'rgba(79,70,229,.08)' : T.sidebar}>
            Plan {m.plan_required}
          </Pill>
        </div>

        <div style={{ display: 'flex', gap: 10, fontSize: 11, color: T.text3, marginBottom: 12 }}>
          <span><strong style={{ color: T.text2, fontVariantNumeric: 'tabular-nums' }}>${m.cost_per_1k_input}</strong>/<strong style={{ color: T.text2, fontVariantNumeric: 'tabular-nums' }}>${m.cost_per_1k_output}</strong> /1M</span>
          {m.api_key_last_test_at && <span style={{ marginLeft: 'auto' }}>Probado {timeAgo(m.api_key_last_test_at)}</span>}
        </div>

        {m.api_key_last_error && (
          <div style={{ marginBottom: 12, padding: '8px 10px', background: T.redSoft, border: `.5px solid ${T.red}30`, borderRadius: 8, fontSize: 11, color: T.red }}>
            {m.api_key_last_error.substring(0, 200)}
          </div>
        )}

        <div style={{ display: 'flex', gap: 6 }}>
          <BtnSec onClick={onToggleExpand} style={{ flex: 1, justifyContent: 'center', fontSize: 11.5 }}>
            {I.key}
            {m.has_api_key && m.key_source === 'database' ? 'Cambiar key' : 'Configurar key'}
          </BtnSec>
          <BtnSec onClick={onTest} disabled={!m.has_api_key || testing} style={{ flex: 1, justifyContent: 'center', fontSize: 11.5 }}>
            {testing ? <span className="spin">{I.refresh}</span> : I.zap}
            {testing ? 'Probando' : 'Probar'}
          </BtnSec>
        </div>
      </div>

      {isExpanded && (
        <div style={{ padding: '14px 18px', background: T.sidebar, borderTop: `.5px solid ${T.hairline}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.text3, marginBottom: 6, textTransform: 'uppercase', letterSpacing: .4 }}>
            API key · {m.api_key_env || m.provider}
          </div>
          <input
            type="password" autoFocus
            value={keyDraft}
            onChange={e => setKeyDraft(e.target.value)}
            placeholder={m.has_api_key ? '••• ya hay key configurada' : 'sk-...'}
            style={{ ...inp, fontFamily: 'monospace', fontSize: 12, marginBottom: 8 }}
            onKeyDown={e => { if (e.key === 'Enter') onSaveKey() }}
          />
          <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 10.5, color: T.text4 }}>
              {m.key_source === 'database' && <button onClick={onDeleteKey} style={{ background: 'none', border: 'none', color: T.red, fontSize: 10.5, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>Borrar key guardada</button>}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <BtnSec onClick={onToggleExpand} style={{ padding: '5px 12px', fontSize: 11.5 }}>Cancelar</BtnSec>
              <Btn onClick={onSaveKey} disabled={!keyDraft.trim() || saving} style={{ padding: '5px 12px', fontSize: 11.5 }}>{saving ? 'Guardando…' : 'Guardar y probar'}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 3 — ROUTING (reutiliza el editor existente)
// ════════════════════════════════════════════════════════════════════════════
function RoutingTab({ token }) {
  return (
    <VeraPipelineEditor token={token} />
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 4 — LOGS
// ════════════════════════════════════════════════════════════════════════════
function LogsTab({ token, h }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`${API}/api/backoffice/vera-routing/logs?limit=50`, { headers: h() })
      .then(r => r.json()).then(setLogs).catch(console.error).finally(() => setLoading(false))
  }, [h])

  if (loading) return <LoadingState />

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 24px 40px' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>Logs de Vera</div>
        <div style={{ fontSize: 12, color: T.text4 }}>Últimas {logs.length} llamadas con su modelo, estrategia, tokens y latencia.</div>
      </div>

      <Card padding={0}>
        <div style={{
          display: 'grid', gridTemplateColumns: '130px 1fr 110px 100px 70px 70px',
          padding: '10px 16px', borderBottom: `.5px solid ${T.hairline}`,
          fontSize: 10, fontWeight: 600, color: T.text4, textTransform: 'uppercase', letterSpacing: .4,
          background: T.sidebar,
        }}>
          <span>Fecha</span><span>Pregunta</span><span>Modelo</span><span>Estrategia</span>
          <span style={{ textAlign: 'right' }}>Latencia</span><span style={{ textAlign: 'right' }}>Tokens</span>
        </div>
        {logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: T.text4, fontSize: 12 }}>No hay logs todavía. Conversa con Vera para generar registros.</div>
        ) : (logs || []).map(l => {
          const brand = PROVIDER_BADGES[l.winning_model] || { color: T.text3, bg: T.sidebar }
          return (
            <div key={l.id} style={{
              display: 'grid', gridTemplateColumns: '130px 1fr 110px 100px 70px 70px',
              padding: '10px 16px', borderBottom: `.5px solid ${T.hairline}`,
              fontSize: 12, alignItems: 'center',
            }}>
              <span style={{ color: T.text3, fontSize: 11 }}>{l.created_at?.substring(5, 19)}</span>
              <span style={{ color: T.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 8 }}>{l.question}</span>
              <span>
                <Pill color={brand.color} bg={brand.bg}>{l.winning_model || '—'}</Pill>
              </span>
              <span style={{ color: T.text3, fontSize: 11 }}>{l.strategy_used}</span>
              <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: T.text3, fontSize: 11 }}>{l.latency_ms}ms</span>
              <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{(l.tokens_input || 0) + (l.tokens_output || 0)}</span>
            </div>
          )
        })}
      </Card>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 5 — STATS (globales + por cliente)
// ════════════════════════════════════════════════════════════════════════════
function StatsTab({ token, h }) {
  const [stats, setStats] = useState(null)
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`${API}/api/backoffice/vera-routing/stats`, { headers: h() }).then(r => r.json()),
      fetch(`${API}/api/backoffice/vera-routing/clients?days=30`, { headers: h() }).then(r => r.json()),
    ]).then(([s, c]) => { setStats(s); setClients(c.clients || []) })
      .catch(console.error).finally(() => setLoading(false))
  }, [h])

  if (loading) return <LoadingState />

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 24px 40px' }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>Estadísticas globales</div>
        <div style={{ fontSize: 12, color: T.text4 }}>Resumen últimos 7 días de toda la plataforma + ranking por cliente últimos 30 días.</div>
      </div>

      {/* KPIs globales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        {[
          { label: 'Peticiones 7d', val: num(stats?.summary_7d?.total_requests || 0), color: T.blue },
          { label: 'Tokens 7d', val: num(stats?.summary_7d?.total_tokens || 0), color: T.purple },
          { label: 'Coste 7d', val: usd(stats?.summary_7d?.total_cost_usd || 0), color: T.green },
          { label: 'Latencia media', val: `${Math.round(stats?.summary_7d?.avg_latency_ms || 0)}ms`, color: T.amber },
        ].map((k, i) => (
          <Card key={i} padding={14}>
            <div style={{ fontSize: 10.5, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: k.color, fontVariantNumeric: 'tabular-nums', letterSpacing: -.5 }}>{k.val}</div>
          </Card>
        ))}
      </div>

      {/* Por modelo y por estrategia */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Por modelo</div>
          {(stats?.by_model || []).map((m, i) => {
            const brand = PROVIDER_BADGES[m.model] || { color: T.text3, bg: T.sidebar }
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < (stats?.by_model?.length || 0) - 1 ? `.5px solid ${T.soft}` : 'none' }}>
                <Pill color={brand.color} bg={brand.bg}>{m.model || '—'}</Pill>
                <span style={{ fontSize: 11, color: T.text3, fontVariantNumeric: 'tabular-nums' }}>
                  {m.count} · {m.avg_latency_ms}ms · {usd(m.cost)}
                </span>
              </div>
            )
          })}
        </Card>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Por estrategia</div>
          {(stats?.by_strategy || []).map((s, i) => {
            const total = (stats?.summary_7d?.total_requests || 1)
            const pct = Math.round((s.count / total) * 100)
            return (
              <div key={i} style={{ padding: '8px 0', borderBottom: i < (stats?.by_strategy?.length || 0) - 1 ? `.5px solid ${T.soft}` : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                  <span style={{ color: T.text2, fontWeight: 500 }}>{s.strategy || '—'}</span>
                  <span style={{ color: T.text3, fontVariantNumeric: 'tabular-nums' }}>{s.count} · {pct}%</span>
                </div>
                <div style={{ height: 4, background: T.sidebar, borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: T.blue, borderRadius: 999 }} />
                </div>
              </div>
            )
          })}
        </Card>
      </div>

      {/* Por cliente */}
      <Card padding={0}>
        <div style={{ padding: '14px 18px', borderBottom: `.5px solid ${T.hairline}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Por cliente · últimos 30 días</div>
            <div style={{ fontSize: 11, color: T.text4, marginTop: 2 }}>Ranking de empresas por consumo</div>
          </div>
          <Pill>{clients.length} {clients.length === 1 ? 'empresa' : 'empresas'}</Pill>
        </div>
        {clients.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: T.text4, fontSize: 12 }}>Sin clientes con actividad reciente.</div>
        ) : (
          <>
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 80px 80px 110px 90px 110px 90px',
              padding: '10px 18px', borderBottom: `.5px solid ${T.hairline}`,
              fontSize: 10, fontWeight: 600, color: T.text4, textTransform: 'uppercase', letterSpacing: .4,
              background: T.sidebar,
            }}>
              <span>Empresa</span><span>Plan</span><span style={{ textAlign: 'right' }}>Req</span>
              <span style={{ textAlign: 'right' }}>Tokens</span><span style={{ textAlign: 'right' }}>Coste</span>
              <span>Modelo top</span><span style={{ textAlign: 'right' }}>Último</span>
            </div>
            {(clients || []).map(c => {
              const brand = PROVIDER_BADGES[c.top_model] || { color: T.text3, bg: T.sidebar }
              return (
                <div key={c.company_id} style={{
                  display: 'grid', gridTemplateColumns: '2fr 80px 80px 110px 90px 110px 90px',
                  padding: '11px 18px', borderBottom: `.5px solid ${T.hairline}`,
                  fontSize: 12, alignItems: 'center',
                }}>
                  <span style={{ fontWeight: 500 }}>{c.company_name}</span>
                  <span>
                    <Pill color={c.plan === 'plus' ? T.blue : T.text3} bg={c.plan === 'plus' ? 'rgba(79,70,229,.08)' : T.sidebar}>{c.plan}</Pill>
                  </span>
                  <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{num(c.requests)}</span>
                  <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: T.text3, fontSize: 11 }}>{num(c.tokens_total)}</span>
                  <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: T.green }}>{usd(c.cost_usd)}</span>
                  <span>{c.top_model ? <Pill color={brand.color} bg={brand.bg}>{c.top_model}</Pill> : '—'}</span>
                  <span style={{ textAlign: 'right', fontSize: 11, color: T.text4 }}>{c.last_request ? timeAgo(c.last_request) : '—'}</span>
                </div>
              )
            })}
          </>
        )}
      </Card>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// SHARED — Loading state
// ════════════════════════════════════════════════════════════════════════════
function LoadingState() {
  return <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: T.text4 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
      <span className="spin" style={{ display: 'flex' }}>{I.refresh}</span>
      Cargando…
    </div>
  </div>
}
