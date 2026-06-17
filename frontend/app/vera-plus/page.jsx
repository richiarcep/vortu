'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { API_BASE as API } from '@/lib/api'
import { FONT, useT, useTheme } from '@/components/ui/tokens'

// ─── Theme (matches /vera) ────────────────────────────────────
const VERA_BLUE = '#0071E3'
const VERA_PLUS_BLUE = '#003D8F'
const GOLD = '#B8860B'

// ─── Iconos (Lucide-style, inline SVG, decorativos) ───────────
const IconBolt = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
)
const IconLock = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)
const IconUndo = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
  </svg>
)

// ─── Labels para las 17 features (mapping desde feature_json a texto humano) ────
const FEATURE_LABELS = {
  chat: 'Chat con Vera',
  vera_parse: 'Vera Parse (entender preguntas en lenguaje natural)',
  insights_auto: 'Insights automáticos diarios',
  anomaly_detection_daily: 'Detección de anomalías diaria',
  anomaly_realtime: 'Detección de anomalías en tiempo real',
  vision_basic: 'Visión IA básica',
  vision_advanced: 'Visión IA avanzada (Gemini)',
  crm_draft_only: 'CRM: borradores generados',
  crm_auto_send: 'CRM: envío automático con confianza >90%',
  memory_days: 'Memoria de conversaciones',
  tokens_daily: 'Tokens diarios',
  web_search: 'Búsqueda web en tiempo real (Perplexity)',
  tool_use_acts: 'Vera-Acts: acciones automáticas',
  consensus_opus: 'Consenso multi-modelo con Claude Opus',
  weekly_digest: 'Resumen semanal IA',
  voice_mode: 'Modo voz',
  api_access: 'Acceso API para integraciones',
}

const FEATURE_ORDER = [
  'chat', 'vera_parse', 'insights_auto',
  'memory_days', 'tokens_daily',
  'anomaly_detection_daily', 'anomaly_realtime',
  'vision_basic', 'vision_advanced',
  'crm_draft_only', 'crm_auto_send',
  'web_search', 'tool_use_acts', 'consensus_opus',
  'weekly_digest', 'voice_mode', 'api_access',
]

function formatFeatureValue(key, value) {
  if (key === 'memory_days') return value === 365 ? '365 días (1 año)' : `${value} días`
  if (key === 'tokens_daily') return value === -1 ? 'Sin límite' : `${(value / 1000).toFixed(0)}k/día`
  return value === true ? '✓' : value === false ? '—' : value
}

export default function VeraPlusPage() {
  const T = useT()
  const { theme } = useTheme()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState(false)
  const [error, setError] = useState(null)

  const successMode = searchParams.get('success') === '1'
  const canceledMode = searchParams.get('canceled') === '1'

  useEffect(() => {
    async function loadInfo() {
      setLoading(true)
      try {
        const token = localStorage.getItem('nexum_token')
        if (!token) {
          router.push('/login')
          return
        }
        const r = await fetch(`${API}/api/vera/plus/info`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (r.ok) {
          const d = await r.json()
          setData(d)
        } else {
          setError('No se pudo cargar la información de planes')
        }
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    loadInfo()
  }, [router])

  async function activatePlus() {
    setActivating(true)
    setError(null)
    try {
      const token = localStorage.getItem('nexum_token')
      const r = await fetch(`${API}/api/vera/plus/checkout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      const d = await r.json()
      if (r.ok && d.checkout_url) {
        window.location.href = d.checkout_url
      } else {
        setError(d.detail || 'Error creando sesión de pago')
        setActivating(false)
      }
    } catch (e) {
      setError(e.message)
      setActivating(false)
    }
  }

  if (loading) {
    return (
      <div style={{ background: T.bg, minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: T.text3 }}>Cargando...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ background: T.bg, minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: T.red }}>{error || 'Error cargando datos'}</div>
      </div>
    )
  }

  const basePlan = data.plans.find(p => p.plan_key === 'base')
  const plusPlan = data.plans.find(p => p.plan_key === 'plus')
  const isPlus = data.is_plus_active

  return (
    <div style={{ background: T.bg, minHeight: '100dvh', fontFamily: FONT }}>
      <style>{`
        @media (max-width:768px){
          .vp-table-row{grid-template-columns:1.5fr 1fr 1fr !important;font-size:12px}
          .vp-faq{grid-template-columns:1fr !important}
        }
      `}</style>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 24px' }}>

        {/* ─── Banner success/canceled ─── */}
        {successMode && (
          <div style={{
            background: T.greenSoft, border: `1px solid ${T.green}`,
            borderRadius: 12, padding: '14px 18px', marginBottom: 24,
            color: theme === 'dark' ? T.green : '#166534',
          }}>
            <strong>✓ Pago recibido.</strong> Tu suscripción a Vera Plus se está activando.
            Si en 1 minuto no ves los cambios, refresca la página.
          </div>
        )}
        {canceledMode && (
          <div style={{
            background: T.sidebar, border: `1px solid ${T.hairline}`,
            borderRadius: 12, padding: '14px 18px', marginBottom: 24,
            color: T.text2,
          }}>
            Pago cancelado. Puedes activar Vera Plus cuando quieras.
          </div>
        )}

        {/* ─── HERO ─── */}
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: VERA_PLUS_BLUE, color: 'white',
            padding: '6px 14px', borderRadius: 999,
            fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
            marginBottom: 16,
          }}>
            ★ {plusPlan.display_name.toUpperCase()}
          </div>
          <h1 style={{
            fontSize: 48, fontWeight: 800, color: T.text,
            margin: '0 0 16px', letterSpacing: -1.5,
          }}>
            Vera sin límites.
          </h1>
          <p style={{
            fontSize: 18, color: T.text2, maxWidth: 600,
            margin: '0 auto 32px', lineHeight: 1.5,
          }}>
            {plusPlan.description}
          </p>

          {/* Precio */}
          <div style={{ marginBottom: 28 }}>
            <span style={{ fontSize: 56, fontWeight: 800, color: T.text }}>€{plusPlan.price_eur_monthly.toFixed(0)}</span>
            <span style={{ fontSize: 18, color: T.text3, marginLeft: 6 }}>/mes</span>
          </div>

          {/* Botón principal según estado */}
          {isPlus ? (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: T.greenSoft, color: theme === 'dark' ? T.green : '#166534',
              padding: '14px 28px', borderRadius: 12,
              fontSize: 16, fontWeight: 700,
            }}>
              ✓ Vera Plus activado
            </div>
          ) : (
            <button
              onClick={activatePlus}
              disabled={activating}
              style={{
                background: VERA_PLUS_BLUE, color: 'white',
                border: 'none', borderRadius: 12,
                padding: '16px 36px', fontSize: 16, fontWeight: 700,
                cursor: activating ? 'wait' : 'pointer', fontFamily: 'inherit',
                boxShadow: '0 4px 14px rgba(0,61,143,.25)',
                transition: 'transform .1s',
                opacity: activating ? 0.7 : 1,
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {activating ? 'Redirigiendo a Stripe…' : `Activar Vera Plus — €${plusPlan.price_eur_monthly.toFixed(0)}/mes`}
            </button>
          )}

          {error && (
            <div style={{ marginTop: 14, color: T.red, fontSize: 13 }}>{error}</div>
          )}

          <div style={{ marginTop: 14, fontSize: 12, color: T.text4 }}>
            Pago seguro con Stripe · Cancela cuando quieras · Sin permanencia
          </div>
        </div>

        {/* ─── TABLA COMPARATIVA ─── */}
        <div style={{
          background: T.card, borderRadius: 16,
          border: `1px solid ${T.hairline}`, overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,.04)',
        }}>
          <div className="vp-table-row" style={{
            display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr',
            background: T.sidebar, padding: '16px 24px',
            borderBottom: `1px solid ${T.hairline}`,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Capacidades
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, textAlign: 'center' }}>
              {basePlan.display_name} <span style={{ fontSize: 11, fontWeight: 500, color: T.text4 }}>(incluido)</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: VERA_PLUS_BLUE, textAlign: 'center' }}>
              ★ {plusPlan.display_name}
            </div>
          </div>

          {FEATURE_ORDER.map((key, i) => {
            const baseVal = basePlan.features[key]
            const plusVal = plusPlan.features[key]
            if (baseVal === undefined && plusVal === undefined) return null

            return (
              <div key={key} className="vp-table-row" style={{
                display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr',
                padding: '14px 24px',
                borderBottom: i < FEATURE_ORDER.length - 1 ? `1px solid ${T.hairline}` : 'none',
                background: i % 2 === 0 ? T.card : T.bg,
                alignItems: 'center',
              }}>
                <div style={{ fontSize: 13, color: T.text }}>
                  {FEATURE_LABELS[key] || key}
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 600,
                  color: baseVal === false || baseVal === 0 ? T.text4 : T.text,
                  textAlign: 'center',
                }}>
                  {formatFeatureValue(key, baseVal)}
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 700,
                  color: VERA_PLUS_BLUE, textAlign: 'center',
                }}>
                  {formatFeatureValue(key, plusVal)}
                </div>
              </div>
            )
          })}
        </div>

        {/* ─── FAQ / Cómo funciona ─── */}
        <div className="vp-faq" style={{ marginTop: 48, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 20 }}>
          {[
            { icon: <IconBolt />, title: 'Activación instantánea', text: 'Tras el pago, Vera Plus se activa automáticamente. No esperas a nadie.' },
            { icon: <IconLock />, title: 'Pago seguro', text: 'Procesado por Stripe. Nunca vemos los datos de tu tarjeta.' },
            { icon: <IconUndo />, title: 'Cancela cuando quieras', text: 'Sin permanencia ni penalizaciones. Vuelves a Vortu base con 1 click.' },
          ].map((item, i) => (
            <div key={i} style={{
              background: T.card, borderRadius: 12,
              border: `1px solid ${T.hairline}`,
              padding: 20,
            }}>
              <div style={{ marginBottom: 8, color: T.text }}>{item.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 6 }}>
                {item.title}
              </div>
              <div style={{ fontSize: 13, color: T.text3, lineHeight: 1.5 }}>
                {item.text}
              </div>
            </div>
          ))}
        </div>

        {/* ─── Volver a Vera ─── */}
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <button
            onClick={() => router.push('/vera')}
            style={{
              background: 'transparent', color: T.text3,
              border: `1px solid ${T.hairline}`, borderRadius: 999,
              padding: '10px 22px', fontSize: 13,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            ← Volver a Vera
          </button>
        </div>

      </div>
    </div>
  )
}
