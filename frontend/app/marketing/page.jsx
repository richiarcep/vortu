'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { FONT, useT, useTheme } from '@/components/ui/tokens'
import VeraDrawer from '@/components/ui/VeraDrawer'
import { HeaderActions } from '@/components/ui/primitives'

import { API_BASE as API } from '@/lib/api'
const VERA_BLUE = '#0071E3'
const ANALYSIS_CACHE_KEY = 'vortu_marketing_analysis'

// ─────────────────────────────────────────────────────────
// CONFIGS
// ─────────────────────────────────────────────────────────
const STATUS_CFG = {
  active:    { label: 'Activa',    color: '#059669', bg: 'rgba(5,150,105,.1)', dot: '#059669' },
  draft:     { label: 'Borrador',  color: '#6b7280', bg: 'rgba(107,114,128,.1)', dot: '#9CA3AF' },
  paused:    { label: 'Pausada',   color: '#d97706', bg: 'rgba(217,119,6,.1)', dot: '#F59E0B' },
  completed: { label: 'Finalizada', color: '#0EA5E9', bg: 'rgba(14,165,233,.1)', dot: '#0EA5E9' },
}

const PLATFORM_CFG = {
  google: { label: 'Google', color: '#0071E3', bg: 'rgba(0,113,227,.1)' },
  meta:   { label: 'Meta',   color: '#7c3aed', bg: 'rgba(124,58,237,.1)' },
  tiktok: { label: 'TikTok', color: '#1d1d1f', bg: 'rgba(0,0,0,.06)' },
  email:  { label: 'Email',  color: '#059669', bg: 'rgba(5,150,105,.1)' },
}

const IMPACT_CFG = {
  alto:  { label: 'Impacto alto',  color: '#dc2626' },
  medio: { label: 'Impacto medio', color: '#d97706' },
  bajo:  { label: 'Impacto bajo',  color: '#059669' },
}

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────
function fmtEuro(n) { return n != null ? '€' + Math.round(n).toLocaleString('es-ES') : '—' }
function safeParse(json) {
  try { return JSON.parse(json) } catch { return null }
}

// ─────────────────────────────────────────────────────────
// BANDERA ES (SVG)
function FlagES({ size = 14 }) {
  return (
    <svg width={size * 1.4} height={size} viewBox="0 0 21 14" style={{ borderRadius: 2, display: 'block', flexShrink: 0 }}>
      <rect width="21" height="14" fill="#AA151B" />
      <rect y="3.5" width="21" height="7" fill="#F1BF00" />
    </svg>
  )
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
          background: active ? 'rgba(0,113,227,.12)' : 'rgba(0,0,0,.08)',
          color: active ? VERA_BLUE : T.text3,
          fontVariantNumeric: 'tabular-nums', minWidth: 16, textAlign: 'center',
        }}>{badge}</span>
      )}
    </button>
  )
}

function KpiCard({ label, value, color }) {
  const T = useT()
  const resolvedColor = color || T.text
  return (
    <div style={{
      background: T.card, borderRadius: 12,
      border: `.5px solid ${T.hairline}`,
      padding: 16, flex: 1,
    }}>
      <div style={{ fontSize: 11, color: T.text4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600, color: resolvedColor, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// TAB 1: ESTRATEGIA (Análisis IA)
// ─────────────────────────────────────────────────────────
function EstrategiaTab({ token, onCreateCampaign }) {
  const T = useT()
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [showFullAnalysis, setShowFullAnalysis] = useState(false)

  async function loadAnalysis() {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/marketing/analisis`, { headers: { Authorization: `Bearer ${token}` } })
      if (r.ok) {
        const d = await r.json()
        const a = d.analisis || d.analysis || d
        if (a && a.sector) {
          setAnalysis(a)
          localStorage.setItem(ANALYSIS_CACHE_KEY, JSON.stringify(a))
        }
      }
    } catch {}
    setLoading(false)
  }

  async function regenerate() {
    setRegenerating(true)
    try {
      const r = await fetch(`${API}/api/marketing/analizar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ use_internal_data: true }),
      })
      if (r.ok) {
        const d = await r.json()
        const a = d.analisis || d.analysis || d
        setAnalysis(a)
        localStorage.setItem(ANALYSIS_CACHE_KEY, JSON.stringify(a))
      }
    } catch {}
    setRegenerating(false)
  }

  useEffect(() => {
    const cached = typeof window !== 'undefined' ? localStorage.getItem(ANALYSIS_CACHE_KEY) : null
    if (cached) {
      const parsed = safeParse(cached)
      if (parsed) {
        setAnalysis(parsed)
        return
      }
    }
    loadAnalysis()
  }, [])

  if (loading && !analysis) {
    return <div style={{ padding: 60, textAlign: 'center', color: T.text4, fontSize: 13 }}>Cargando análisis...</div>
  }

  if (!analysis) {
    return (
      <div style={{
        background: T.card, borderRadius: 12,
        border: `.5px solid ${T.hairline}`,
        padding: 60, textAlign: 'center',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: VERA_BLUE,
          display: 'grid', placeItems: 'center',
          margin: '0 auto 16px',
        }}>
          <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
            <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" fill="#fff" />
          </svg>
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 6 }}>
          Genera tu análisis con Vera
        </div>
        <div style={{ fontSize: 13, color: T.text3, marginBottom: 20, maxWidth: 380, margin: '0 auto 20px' }}>
          Vera analizará tus ventas, contabilidad y clientes para entender tu negocio y crear una estrategia personalizada.
        </div>
        <button onClick={regenerate} disabled={regenerating} style={{
          padding: '10px 20px', borderRadius: 10,
          background: VERA_BLUE, color: '#fff', border: 'none',
          fontSize: 13, fontWeight: 500, cursor: regenerating ? 'wait' : 'pointer',
          fontFamily: 'inherit',
        }}>
          {regenerating ? 'Vera está analizando…' : 'Generar análisis'}
        </button>
      </div>
    )
  }

  // Parseo robusto: target_audience, opportunities, key_messages pueden venir como objeto, array o string
  const audience = typeof analysis.target_audience === 'object' && analysis.target_audience !== null
    ? analysis.target_audience
    : (safeParse(analysis.target_audience) || { primario: analysis.target_audience })

  const opportunities = Array.isArray(analysis.opportunities)
    ? analysis.opportunities
    : (safeParse(analysis.opportunities) || [])

  const platforms = Array.isArray(analysis.best_platforms)
    ? analysis.best_platforms
    : (safeParse(analysis.best_platforms) || [])

  const strengths = Array.isArray(analysis.strengths)
    ? analysis.strengths
    : (safeParse(analysis.strengths) || [])

  const weaknesses = Array.isArray(analysis.weaknesses)
    ? analysis.weaknesses
    : (safeParse(analysis.weaknesses) || [])

  const keyMessages = Array.isArray(analysis.key_messages)
    ? analysis.key_messages
    : (safeParse(analysis.key_messages) || [])

  const interests = Array.isArray(audience?.intereses) ? audience.intereses : []

  // Cortar el análisis para preview
  const fullText = analysis.full_analysis || ''
  const previewText = fullText.length > 320 ? fullText.substring(0, 320).trim() + '…' : fullText

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════
          HERO CARD OSCURA — sector + presupuesto + intro
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{
        background: 'linear-gradient(135deg, #0B1426 0%, #1d2939 100%)',
        borderRadius: 14, padding: 24, marginBottom: 16,
        color: '#fff',
        display: 'flex', justifyContent: 'space-between', gap: 24,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,.5)',
            textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <div style={{
              width: 14, height: 14, borderRadius: 4, background: VERA_BLUE,
              display: 'grid', placeItems: 'center',
            }}>
              <svg width="8" height="8" viewBox="0 0 16 16" fill="none">
                <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" fill="#fff" />
              </svg>
            </div>
            Análisis de Vera · {new Date(analysis.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 4, lineHeight: 1.2 }}>
            {analysis.sector || 'Sin sector definido'}
          </div>
          {analysis.business_type && (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', marginBottom: 16 }}>
              {analysis.business_type}
            </div>
          )}
          {fullText && (
            <>
              <div style={{
                fontSize: 13.5, lineHeight: 1.65,
                color: 'rgba(255,255,255,.85)',
                whiteSpace: 'pre-line',
              }}>
                {showFullAnalysis ? fullText : previewText}
              </div>
              {fullText.length > 320 && (
                <button onClick={() => setShowFullAnalysis(!showFullAnalysis)} style={{
                  marginTop: 10, padding: 0,
                  background: 'transparent', border: 'none',
                  color: '#0EA5E9', fontSize: 12, cursor: 'pointer',
                  fontFamily: 'inherit', fontWeight: 500,
                }}>{showFullAnalysis ? '← Ver menos' : 'Leer análisis completo →'}</button>
              )}
            </>
          )}
        </div>

        {analysis.recommended_budget_monthly && (
          <div style={{
            background: 'rgba(255,255,255,.06)',
            border: '.5px solid rgba(255,255,255,.1)',
            borderRadius: 12,
            padding: '18px 22px', textAlign: 'center',
            minWidth: 170, alignSelf: 'flex-start',
            flexShrink: 0,
          }}>
            <div style={{
              fontSize: 26, fontWeight: 600,
              color: '#0EA5E9', fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            }}>
              {fmtEuro(analysis.recommended_budget_monthly)}
            </div>
            <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.55)', marginTop: 6, lineHeight: 1.4 }}>
              Presupuesto mensual<br />recomendado
            </div>
            {platforms.length > 0 && (
              <div style={{
                display: 'flex', gap: 4, justifyContent: 'center',
                marginTop: 10, flexWrap: 'wrap',
              }}>
                {platforms.map(p => (
                  <span key={p} style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 999,
                    background: 'rgba(14,165,233,.15)', color: '#0EA5E9',
                    fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.3,
                  }}>{p}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          2 COLUMNAS: Info (izquierda) + Acciones (derecha)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="mkt-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* COLUMNA IZQUIERDA: INFO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Público objetivo */}
          <div style={{
            background: T.card, borderRadius: 12,
            border: `.5px solid ${T.hairline}`, padding: 18,
          }}>
            <div style={{ fontSize: 11, color: T.text4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
              Público objetivo
            </div>

            {audience.primario && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: T.text4, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 500 }}>Primario</div>
                <div style={{ fontSize: 12.5, color: T.text2, lineHeight: 1.5 }}>{audience.primario}</div>
              </div>
            )}

            {audience.secundario && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: T.text4, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 500 }}>Secundario</div>
                <div style={{ fontSize: 12.5, color: T.text3, lineHeight: 1.5 }}>{audience.secundario}</div>
              </div>
            )}

            {(audience.edad_rango || audience.edad) && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: T.text4, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 500 }}>Rango edad</div>
                <div style={{ fontSize: 12.5, color: T.text2 }}>{audience.edad_rango || audience.edad}</div>
              </div>
            )}

            {interests.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: T.text4, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 500 }}>Intereses</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {interests.map(it => (
                    <span key={it} style={{
                      fontSize: 11, padding: '3px 8px', borderRadius: 6,
                      background: T.sidebar, color: T.text2,
                    }}>{it}</span>
                  ))}
                </div>
              </div>
            )}

            {audience.comportamiento && (
              <div>
                <div style={{ fontSize: 10, color: T.text4, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 500 }}>Comportamiento</div>
                <div style={{ fontSize: 12, color: T.text3, lineHeight: 1.5 }}>{audience.comportamiento}</div>
              </div>
            )}
          </div>

          {/* Tono de voz */}
          {analysis.tone_of_voice && (
            <div style={{
              background: T.card, borderRadius: 12,
              border: `.5px solid ${T.hairline}`, padding: 18,
            }}>
              <div style={{ fontSize: 11, color: T.text4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                Tono de voz
              </div>
              <div style={{ fontSize: 12.5, color: T.text2, lineHeight: 1.55 }}>{analysis.tone_of_voice}</div>
            </div>
          )}

          {/* Mensajes clave */}
          {keyMessages.length > 0 && (
            <div style={{
              background: T.card, borderRadius: 12,
              border: `.5px solid ${T.hairline}`, padding: 18,
            }}>
              <div style={{ fontSize: 11, color: T.text4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                Mensajes clave
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {keyMessages.map((m, i) => (
                  <div key={i} style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: T.sidebar,
                    fontSize: 12.5, color: T.text2, lineHeight: 1.5,
                    fontStyle: 'italic',
                  }}>"{m}"</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: ACCIONES + DAFO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* OPORTUNIDADES (las accionables) */}
          <div style={{
            background: T.card, borderRadius: 12,
            border: `.5px solid ${T.hairline}`, padding: 18,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 12,
            }}>
              <div style={{ fontSize: 11, color: T.text4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Oportunidades · {opportunities.length}
              </div>
              <div style={{ fontSize: 10, color: T.text4 }}>Recomendadas por Vera</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {opportunities.length === 0 && (
                <div style={{ fontSize: 12, color: T.text4, padding: 12, textAlign: 'center' }}>
                  Sin oportunidades identificadas
                </div>
              )}
              {opportunities.map((opp, i) => {
                const impact = opp.impacto?.toLowerCase() || opp.impact?.toLowerCase() || 'medio'
                const impactCfg = IMPACT_CFG[impact] || IMPACT_CFG.medio
                const platform = opp.plataforma || opp.platform
                const title = opp.titulo || opp.title || opp
                const desc = opp.descripcion || opp.description

                return (
                  <div key={i} style={{
                    padding: '12px 14px', borderRadius: 10,
                    background: T.sidebar,
                    borderLeft: `3px solid ${impactCfg.color}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.3 }}>{title}</div>
                      <Pill label={impactCfg.label} color={impactCfg.color} bg={`${impactCfg.color}15`} />
                    </div>
                    {desc && (
                      <div style={{ fontSize: 11.5, color: T.text3, lineHeight: 1.5, marginBottom: 10 }}>{desc}</div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      {platform && (
                        <span style={{
                          fontSize: 10, padding: '2px 7px', borderRadius: 4,
                          background: 'rgba(0,113,227,.08)', color: VERA_BLUE,
                          textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 500,
                        }}>{platform}</span>
                      )}
                      <button onClick={() => onCreateCampaign?.(opp)} style={{
                        marginLeft: 'auto',
                        padding: '4px 10px', borderRadius: 6,
                        background: VERA_BLUE, color: '#fff', border: 'none',
                        fontSize: 11, fontWeight: 500, cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}>Crear campaña →</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* DAFO: Fortalezas y Debilidades */}
          {(strengths.length > 0 || weaknesses.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {strengths.length > 0 && (
                <div style={{
                  background: T.card, borderRadius: 12,
                  border: `.5px solid ${T.hairline}`, padding: 14,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: '#059669' }} />
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: '#059669', textTransform: 'uppercase', letterSpacing: 0.5 }}>Fortalezas</span>
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {strengths.slice(0, 4).map((s, i) => (
                      <li key={i} style={{ fontSize: 11.5, color: T.text2, lineHeight: 1.45, paddingLeft: 10, position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 0, color: '#059669' }}>+</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {weaknesses.length > 0 && (
                <div style={{
                  background: T.card, borderRadius: 12,
                  border: `.5px solid ${T.hairline}`, padding: 14,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: '#dc2626' }} />
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: '#dc2626', textTransform: 'uppercase', letterSpacing: 0.5 }}>Debilidades</span>
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {weaknesses.slice(0, 4).map((w, i) => (
                      <li key={i} style={{ fontSize: 11.5, color: T.text2, lineHeight: 1.45, paddingLeft: 10, position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 0, color: '#dc2626' }}>−</span>{w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Botón regenerar al final */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
        <button onClick={regenerate} disabled={regenerating} style={{
          padding: '8px 16px', borderRadius: 8,
          background: 'transparent', color: T.text3,
          border: `.5px solid ${T.hairline}`,
          fontSize: 12, cursor: regenerating ? 'wait' : 'pointer',
          fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          {regenerating ? 'Vera está reanalizando…' : 'Regenerar análisis'}
        </button>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────
// TAB 2: CAMPAÑAS
// ─────────────────────────────────────────────────────────
function CampanasTab({ token }) {
  const T = useT()
  const [campaigns, setCampaigns] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/marketing/campanas`, { headers: { Authorization: `Bearer ${token}` } })
      if (r.ok) {
        const d = await r.json()
        setCampaigns(d.campaigns || d || [])
      }
    } catch {}
    setLoading(false)
  }

  async function toggleStatus(c) {
    const newStatus = c.status === 'active' ? 'paused' : 'active'
    try {
      await fetch(`${API}/api/marketing/campanas/${c.id}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      load()
    } catch {}
  }

  useEffect(() => { load() }, [])

  const stats = {
    total:     campaigns.length,
    active:    campaigns.filter(c => c.status === 'active').length,
    draft:     campaigns.filter(c => c.status === 'draft').length,
    paused:    campaigns.filter(c => c.status === 'paused').length,
    completed: campaigns.filter(c => c.status === 'completed').length,
  }

  const filtered = filter === 'all' ? campaigns : campaigns.filter(c => c.status === filter)

  return (
    <>
      {/* KPI cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <KpiCard label="Total" value={stats.total} />
        <KpiCard label="Activas" value={stats.active} color="#059669" />
        <KpiCard label="Borradores" value={stats.draft} color="#6b7280" />
        <KpiCard label="Pausadas" value={stats.paused} color="#d97706" />
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 2, background: T.sidebar, borderRadius: 8, padding: 3, marginBottom: 16, width: 'fit-content' }}>
        {[
          { k: 'all', l: `Todas (${stats.total})` },
          { k: 'active', l: `Activas (${stats.active})` },
          { k: 'draft', l: `Borradores (${stats.draft})` },
          { k: 'paused', l: `Pausadas (${stats.paused})` },
          { k: 'completed', l: `Finalizadas (${stats.completed})` },
        ].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)} style={{
            padding: '5px 12px', borderRadius: 6, border: 'none',
            background: filter === f.k ? '#fff' : 'transparent',
            color: filter === f.k ? T.text : T.text3,
            boxShadow: filter === f.k ? '0 1px 2px rgba(0,0,0,.06)' : 'none',
            fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}>{f.l}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: T.text4, fontSize: 13 }}>Cargando...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {filtered.map(c => {
            const status = STATUS_CFG[c.status] || STATUS_CFG.draft
            const platforms = Array.isArray(c.platforms) ? c.platforms : (safeParse(c.platforms) || [])
            const isActive = c.status === 'active'
            const isPaused = c.status === 'paused'
            const isCompleted = c.status === 'completed'

            return (
              <div key={c.id}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.08)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,.03)' }}
                style={{
                  background: T.card, borderRadius: 14,
                  border: `.5px solid ${T.hairline}`,
                  padding: 0, transition: 'all .2s ease',
                  overflow: 'hidden', position: 'relative',
                  boxShadow: '0 1px 2px rgba(0,0,0,.03)',
                }}>
                {/* Borde gradiente superior según estado */}
                <div style={{
                  height: 3,
                  background: isActive ? 'linear-gradient(90deg, #00C2FF 0%, #0071E3 50%, #7c3aed 100%)' :
                             isPaused ? 'linear-gradient(90deg, #F59E0B 0%, #d97706 100%)' :
                             isCompleted ? 'linear-gradient(90deg, #0EA5E9 0%, #6b7280 100%)' :
                             T.hairline,
                }} />

                <div style={{ padding: 18 }}>
                  {/* Título + estado */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 600, color: T.text, marginBottom: 4, lineHeight: 1.3 }}>{c.name}</div>
                      {c.objective && (
                        <div style={{ fontSize: 11.5, color: T.text4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
                          </svg>
                          {c.objective}
                        </div>
                      )}
                    </div>
                    <Pill {...status} />
                  </div>

                  {/* Badges plataformas con colores reales */}
                  {platforms.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                      {platforms.map(p => {
                        const pl = p.toLowerCase()
                        const cfg = pl === 'google' ? { label: 'Google', bg: 'linear-gradient(135deg, #4285F4, #1a73e8)', color: '#fff' } :
                                    pl === 'meta' ? { label: 'Meta', bg: 'linear-gradient(135deg, #0866FF, #1877F2)', color: '#fff' } :
                                    pl === 'tiktok' ? { label: 'TikTok', bg: 'linear-gradient(135deg, #FF0050, #25F4EE)', color: '#fff' } :
                                    pl === 'email' ? { label: 'Email', bg: 'linear-gradient(135deg, #059669, #047857)', color: '#fff' } :
                                    { label: p, bg: '#6b7280', color: '#fff' }
                        return (
                          <span key={p} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '3px 9px', borderRadius: 999,
                            background: cfg.bg, color: cfg.color,
                            fontSize: 10.5, fontWeight: 600,
                            textTransform: 'uppercase', letterSpacing: 0.4,
                          }}>{cfg.label}</span>
                        )
                      })}
                    </div>
                  )}

                  {/* Presupuesto BIG + periodo */}
                  <div style={{
                    background: isActive ? 'linear-gradient(135deg, rgba(0,113,227,.05) 0%, rgba(124,58,237,.05) 100%)' : T.sidebar,
                    borderRadius: 10,
                    padding: '14px 16px', marginBottom: 12,
                    border: isActive ? '.5px solid rgba(0,113,227,.15)' : 'none',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 10, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                          Presupuesto diario
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: T.text, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                          {fmtEuro(c.budget_daily)}
                          <span style={{ fontSize: 12, color: T.text4, fontWeight: 400, marginLeft: 2 }}>/día</span>
                        </div>
                      </div>
                      {c.start_date && (
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 10, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                            Periodo
                          </div>
                          <div style={{ fontSize: 11.5, color: T.text2, fontWeight: 500 }}>
                            {new Date(c.start_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                            {c.end_date && ` → ${new Date(c.end_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botones acción: Ver detalle + Pausar/Reanudar */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setSelected(c)} style={{
                      flex: 1, padding: '9px', borderRadius: 8,
                      background: 'rgba(0,113,227,.08)', color: VERA_BLUE,
                      border: 'none',
                      fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      transition: 'all .12s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,113,227,.15)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,113,227,.08)' }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      Ver detalle
                    </button>
                    {(isActive || isPaused) && (
                      <button onClick={() => toggleStatus(c)} style={{
                        flex: 1, padding: '9px', borderRadius: 8,
                        background: isActive ? 'rgba(217,119,6,.1)' : 'rgba(5,150,105,.1)',
                        color: isActive ? '#d97706' : '#059669',
                        border: 'none',
                        fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                        fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        transition: 'all .12s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = isActive ? 'rgba(217,119,6,.15)' : 'rgba(5,150,105,.15)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = isActive ? 'rgba(217,119,6,.1)' : 'rgba(5,150,105,.1)' }}
                      >
                        {isActive ? (
                          <><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pausar</>
                        ) : (
                          <><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Reanudar</>
                        )}
                      </button>
                    )}
                  </div>
                  {isCompleted && (
                    <div style={{
                      width: '100%', padding: '8px', borderRadius: 8,
                      background: T.sidebar, color: T.text4,
                      fontSize: 11.5, textAlign: 'center', fontWeight: 500,
                    }}>Campaña finalizada</div>
                  )}
                  {c.status === 'draft' && (
                    <button style={{
                      width: '100%', padding: '9px', borderRadius: 8,
                      background: VERA_BLUE, color: '#fff',
                      border: 'none',
                      fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}>▶ Lanzar campaña</button>
                  )}
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div style={{ padding: 60, textAlign: 'center', color: T.text4, fontSize: 13, gridColumn: '1/-1' }}>
              Sin campañas en esta categoría
            </div>
          )}
        </div>
      )}

      {selected && <CampaignDrawer campaign={selected} onClose={() => setSelected(null)} token={token} onUpdate={load} />}
    </>
  )
}

// ─────────────────────────────────────────────────────────
// DRAWER DETALLE CAMPAÑA
// ─────────────────────────────────────────────────────────
function CampaignDrawer({ campaign, onClose, token, onUpdate }) {
  const T = useT()
  const [detail, setDetail] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/marketing/campanas/${campaign.id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
      fetch(`${API}/api/marketing/campanas/${campaign.id}/metricas`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([d, m]) => {
      setDetail(d?.campaign || d)
      setMetrics(m?.metrics || m)
      setLoading(false)
    })
  }, [campaign.id])

  const c = detail || campaign
  const status = STATUS_CFG[c.status] || STATUS_CFG.draft
  const platforms = Array.isArray(c.platforms) ? c.platforms : (safeParse(c.platforms) || [])
  const copiesGoogle = Array.isArray(c.copies_google) ? c.copies_google : (safeParse(c.copies_google) || [])
  const copiesMeta = Array.isArray(c.copies_meta) ? c.copies_meta : (safeParse(c.copies_meta) || [])
  const images = Array.isArray(c.generated_images) ? c.generated_images : (safeParse(c.generated_images) || [])
  const imagePrompts = Array.isArray(c.image_prompts) ? c.image_prompts : (safeParse(c.image_prompts) || [])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)',
      display: 'flex', justifyContent: 'flex-end', zIndex: 100,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 560, maxWidth: '100%', height: '100dvh', background: T.card,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'slideIn .2s ease',
      }}>
        <style>{`@keyframes slideIn{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

        {/* HEADER con gradiente */}
        <div style={{
          padding: '20px 24px 18px',
          borderBottom: `.5px solid ${T.hairline}`,
          background: c.status === 'active' ? 'linear-gradient(135deg, rgba(0,194,255,.04) 0%, rgba(0,113,227,.04) 50%, rgba(124,58,237,.04) 100%)' : '#fff',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 4, lineHeight: 1.3 }}>{c.name}</div>
              {c.objective && (
                <div style={{ fontSize: 12, color: T.text4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
                  </svg>
                  {c.objective}
                </div>
              )}
            </div>
            <Pill {...status} />
            <button onClick={onClose} aria-label="Cerrar detalle" style={{
              background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: T.text4,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* Badges plataformas */}
          {platforms.length > 0 && (
            <div style={{ display: 'flex', gap: 6 }}>
              {platforms.map(p => {
                const pl = p.toLowerCase()
                const cfg = pl === 'google' ? { label: 'Google Ads', bg: 'linear-gradient(135deg, #4285F4, #1a73e8)' } :
                            pl === 'meta' ? { label: 'Meta Ads', bg: 'linear-gradient(135deg, #0866FF, #1877F2)' } :
                            pl === 'tiktok' ? { label: 'TikTok', bg: 'linear-gradient(135deg, #FF0050, #25F4EE)' } :
                            { label: p, bg: '#6b7280' }
                return (
                  <span key={p} style={{
                    padding: '4px 10px', borderRadius: 999,
                    background: cfg.bg, color: '#fff',
                    fontSize: 10.5, fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: 0.4,
                  }}>{cfg.label}</span>
                )
              })}
            </div>
          )}
        </div>

        {/* CONTENIDO scroll */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: T.text4, fontSize: 13 }}>Cargando detalle...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* KPIs: presupuesto + métricas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(0,113,227,.05), rgba(124,58,237,.05))',
                  border: '.5px solid rgba(0,113,227,.15)',
                  borderRadius: 10, padding: 12,
                }}>
                  <div style={{ fontSize: 9.5, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Diario</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{fmtEuro(c.budget_daily)}</div>
                </div>
                <div style={{
                  background: T.sidebar, borderRadius: 10, padding: 12,
                }}>
                  <div style={{ fontSize: 9.5, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Total</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{fmtEuro(c.budget_total)}</div>
                </div>
                <div style={{
                  background: T.sidebar, borderRadius: 10, padding: 12,
                }}>
                  <div style={{ fontSize: 9.5, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Periodo</div>
                  <div style={{ fontSize: 11.5, color: T.text2, fontWeight: 500, lineHeight: 1.2, marginTop: 3 }}>
                    {c.start_date && new Date(c.start_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    {c.end_date && <><br />→ {new Date(c.end_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</>}
                  </div>
                </div>
              </div>

              {/* MÉTRICAS si hay */}
              {metrics && (metrics.impressions || metrics.clicks) && (
                <div style={{
                  background: T.card, borderRadius: 12,
                  border: `.5px solid ${T.hairline}`, padding: 14,
                }}>
                  <div style={{ fontSize: 10.5, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                    Métricas
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    {metrics.impressions != null && (
                      <div>
                        <div style={{ fontSize: 10, color: T.text4 }}>Impresiones</div>
                        <div style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{metrics.impressions.toLocaleString('es-ES')}</div>
                      </div>
                    )}
                    {metrics.clicks != null && (
                      <div>
                        <div style={{ fontSize: 10, color: T.text4 }}>Clicks</div>
                        <div style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{metrics.clicks.toLocaleString('es-ES')}</div>
                      </div>
                    )}
                    {metrics.ctr != null && (
                      <div>
                        <div style={{ fontSize: 10, color: T.text4 }}>CTR</div>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>{metrics.ctr}%</div>
                      </div>
                    )}
                    {metrics.cost != null && (
                      <div>
                        <div style={{ fontSize: 10, color: T.text4 }}>Gasto</div>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>{fmtEuro(metrics.cost)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* COPIES GOOGLE */}
              {copiesGoogle.length > 0 && (
                <div style={{
                  background: T.card, borderRadius: 12,
                  border: `.5px solid ${T.hairline}`, padding: 14,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <span style={{
                      padding: '2px 7px', borderRadius: 4,
                      background: 'linear-gradient(135deg, #4285F4, #1a73e8)',
                      color: '#fff', fontSize: 9.5, fontWeight: 700, letterSpacing: 0.4,
                    }}>GOOGLE</span>
                    <span style={{ fontSize: 10.5, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Anuncios · {copiesGoogle.length}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {copiesGoogle.slice(0, 5).map((copy, i) => (
                      <div key={i} style={{
                        background: T.sidebar, borderRadius: 8, padding: 10,
                      }}>
                        {copy.headline && <div style={{ fontSize: 13, fontWeight: 600, color: '#1a0dab', marginBottom: 2 }}>{copy.headline}</div>}
                        {copy.description && <div style={{ fontSize: 11.5, color: T.text2, lineHeight: 1.4 }}>{copy.description}</div>}
                        {typeof copy === 'string' && <div style={{ fontSize: 12, color: T.text2 }}>{copy}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* COPIES META */}
              {copiesMeta.length > 0 && (
                <div style={{
                  background: T.card, borderRadius: 12,
                  border: `.5px solid ${T.hairline}`, padding: 14,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <span style={{
                      padding: '2px 7px', borderRadius: 4,
                      background: 'linear-gradient(135deg, #0866FF, #1877F2)',
                      color: '#fff', fontSize: 9.5, fontWeight: 700, letterSpacing: 0.4,
                    }}>META</span>
                    <span style={{ fontSize: 10.5, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Anuncios · {copiesMeta.length}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {copiesMeta.slice(0, 5).map((copy, i) => (
                      <div key={i} style={{
                        background: T.sidebar, borderRadius: 8, padding: 10,
                      }}>
                        {copy.headline && <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4 }}>{copy.headline}</div>}
                        {copy.body && <div style={{ fontSize: 11.5, color: T.text2, lineHeight: 1.5, marginBottom: 4 }}>{copy.body}</div>}
                        {copy.cta && <div style={{ display: 'inline-block', fontSize: 10.5, padding: '2px 8px', borderRadius: 4, background: '#1877F2', color: '#fff', fontWeight: 600 }}>{copy.cta}</div>}
                        {typeof copy === 'string' && <div style={{ fontSize: 12, color: T.text2 }}>{copy}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* IMÁGENES o PROMPTS */}
              {imagePrompts.length > 0 && (
                <div style={{
                  background: T.card, borderRadius: 12,
                  border: `.5px solid ${T.hairline}`, padding: 14,
                }}>
                  <div style={{ fontSize: 10.5, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                    Prompts de imagen · {imagePrompts.length}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {imagePrompts.slice(0, 3).map((p, i) => (
                      <div key={i} style={{
                        background: T.sidebar, borderRadius: 6, padding: 8,
                        fontSize: 11, color: T.text3, fontStyle: 'italic', lineHeight: 1.4,
                      }}>"{typeof p === 'string' ? p : (p.prompt || JSON.stringify(p))}"</div>
                    ))}
                  </div>
                </div>
              )}

              {/* IDs de plataformas si están publicadas */}
              {(c.google_campaign_id || c.meta_campaign_id) && (
                <div style={{
                  background: 'rgba(5,150,105,.04)', borderRadius: 10,
                  border: '.5px solid rgba(5,150,105,.15)', padding: 12,
                }}>
                  <div style={{ fontSize: 10.5, color: '#059669', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                    ✓ Publicada
                  </div>
                  {c.google_campaign_id && <div style={{ fontSize: 11, color: T.text3 }}>Google: <code style={{ background: T.card, padding: '1px 5px', borderRadius: 3 }}>{c.google_campaign_id}</code></div>}
                  {c.meta_campaign_id && <div style={{ fontSize: 11, color: T.text3, marginTop: 3 }}>Meta: <code style={{ background: T.card, padding: '1px 5px', borderRadius: 3 }}>{c.meta_campaign_id}</code></div>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// TAB 3: PLATAFORMAS
// ─────────────────────────────────────────────────────────
function PlataformasTab({ token }) {
  const T = useT()
  const [platforms, setPlatforms] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/marketing/plataformas`, { headers: { Authorization: `Bearer ${token}` } })
      if (r.ok) {
        const d = await r.json()
        setPlatforms(Array.isArray(d) ? d : (d.platforms || (d.google || d.meta ? [d.google, d.meta].filter(Boolean) : [])))
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const PLATFORMS_LIST = [
    {
      id: 'google',
      name: 'Google Ads',
      description: 'Campañas de búsqueda, display y shopping en Google',
      color: '#4285F4',
    },
    {
      id: 'meta',
      name: 'Meta Ads',
      description: 'Anuncios en Facebook e Instagram',
      color: '#0866FF',
    },
  ]

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: T.text4, fontSize: 13 }}>Cargando...</div>
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 12 }}>
      {PLATFORMS_LIST.map(p => {
        const connected = Array.isArray(platforms) ? platforms.find(pl => pl.platform === p.id || pl.platform?.toLowerCase() === p.id || pl.id === p.id) : null
        return (
          <div key={p.id} style={{
            background: T.card, borderRadius: 12,
            border: `.5px solid ${T.hairline}`, padding: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: p.color, color: '#fff',
                display: 'grid', placeItems: 'center',
                fontSize: 18, fontWeight: 700,
                flexShrink: 0,
              }}>{p.name[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{p.name}</span>
                  {connected ? (
                    <Pill label="Conectada" color="#059669" bg="rgba(5,150,105,.1)" dot="#059669" />
                  ) : (
                    <Pill label="Desconectada" color="#6b7280" bg="rgba(107,114,128,.1)" dot="#9CA3AF" />
                  )}
                </div>
                <div style={{ fontSize: 12, color: T.text4, lineHeight: 1.4 }}>{p.description}</div>
              </div>
            </div>

            {connected ? (
              <>
                <div style={{
                  background: T.sidebar, borderRadius: 8,
                  padding: '10px 12px', marginBottom: 10,
                }}>
                  <div style={{ fontSize: 10, color: T.text4, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>Cuenta</div>
                  <div style={{ fontSize: 12, color: T.text2 }}>{connected.account_name || connected.account_id || '—'}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={{
                    flex: 1, padding: '7px', borderRadius: 8,
                    background: T.card, color: T.text2,
                    border: `.5px solid ${T.hairline}`,
                    fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                  }}>Verificar</button>
                  <button style={{
                    padding: '7px 14px', borderRadius: 8,
                    background: 'transparent', color: '#dc2626',
                    border: `.5px solid rgba(220,38,38,.3)`,
                    fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                  }}>Desconectar</button>
                </div>
              </>
            ) : (
              <button style={{
                width: '100%', padding: '9px', borderRadius: 8,
                background: VERA_BLUE, color: '#fff', border: 'none',
                fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'inherit',
              }}>Conectar {p.name}</button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// VERA DRAWER (chat con contexto Marketing)
// ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────
// MODAL NUEVA CAMPAÑA
// ─────────────────────────────────────────────────────────
function NewCampaignModal({ onClose, token, prefill, onCreated }) {
  const T = useT()
  const [name, setName] = useState(prefill?.name || '')
  const [objective, setObjective] = useState(prefill?.objective || 'sales')
  const [platforms, setPlatforms] = useState(prefill?.platforms || ['google', 'meta'])
  const [budgetDaily, setBudgetDaily] = useState(prefill?.budget || 20)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0]
  })
  const [extraContext, setExtraContext] = useState(prefill?.extra || '')
  const [creating, setCreating] = useState(false)
  const [step, setStep] = useState(1) // 1=form, 2=generating, 3=done
  const [mode, setMode] = useState('auto') // auto | manual
  const [manualHeadline, setManualHeadline] = useState('')
  const [manualBody, setManualBody] = useState('')
  const [manualCta, setManualCta] = useState('')
  const [veraReview, setVeraReview] = useState(null)
  const [reviewing, setReviewing] = useState(false)

  async function askVeraReview() {
    if (!manualHeadline.trim() && !manualBody.trim()) return
    setReviewing(true)
    setVeraReview(null)
    try {
      const r = await fetch(`${API}/api/vera/v2/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Revisa este copy de anuncio para una campaña de "${objective}" en ${platforms.join(', ')}.\n\nTitular: ${manualHeadline}\nCuerpo: ${manualBody}\nCTA: ${manualCta}\n\nDa feedback breve (3-5 puntos): qué funciona, qué mejorar, score 1-10. Sé directo.`,
        }),
      })
      if (r.ok) {
        const d = await r.json()
        setVeraReview(d.response || d.content || 'Sin respuesta')
      }
    } catch (e) {
      setVeraReview('Error: ' + e.message)
    }
    setReviewing(false)
  }

  function togglePlatform(p) {
    setPlatforms(platforms.includes(p) ? platforms.filter(x => x !== p) : [...platforms, p])
  }

  async function create() {
    if (!name.trim() || platforms.length === 0 || budgetDaily <= 0) return
    setCreating(true)
    setStep(2)

    try {
      const manualContext = mode === 'manual' && (manualHeadline || manualBody) ?
        `Usa estos copies escritos por el usuario:\nTitular: ${manualHeadline}\nCuerpo: ${manualBody}\nCTA: ${manualCta}\n${extraContext}` :
        extraContext

      const r = await fetch(`${API}/api/marketing/campanas`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          objective,
          platforms,
          budget_daily: budgetDaily,
          budget_total: budgetDaily * 30,
          start_date: startDate,
          end_date: endDate,
          extra_context: manualContext.trim() || undefined,
        }),
      })
      if (r.ok) {
        const data = await r.json()
        setStep(3)
        setTimeout(() => {
          onCreated?.(data)
          onClose()
        }, 800)
      } else {
        const err = await r.text()
        alert('Error: ' + err)
        setStep(1)
        setCreating(false)
      }
    } catch (e) {
      alert('Error: ' + e.message)
      setStep(1)
      setCreating(false)
    }
  }

  const OBJ_ICONS = {
    sales: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    leads: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    traffic: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    awareness: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>,
    retargeting: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  }
  const OBJECTIVES = [
    { k: 'sales', l: 'Ventas', desc: 'Maximizar conversiones' },
    { k: 'leads', l: 'Leads', desc: 'Captar datos de clientes' },
    { k: 'traffic', l: 'Tráfico', desc: 'Visitas a tu web' },
    { k: 'awareness', l: 'Notoriedad', desc: 'Dar a conocer marca' },
    { k: 'retargeting', l: 'Retargeting', desc: 'Recuperar clientes' },
  ]

  const PLATFORMS_AVAILABLE = [
    { k: 'google', l: 'Google Ads', bg: 'linear-gradient(135deg, #4285F4, #1a73e8)' },
    { k: 'meta', l: 'Meta Ads', bg: 'linear-gradient(135deg, #0866FF, #1877F2)' },
    { k: 'tiktok', l: 'TikTok', bg: 'linear-gradient(135deg, #FF0050, #25F4EE)' },
    { k: 'email', l: 'Email', bg: 'linear-gradient(135deg, #059669, #047857)' },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
      display: 'grid', placeItems: 'center', zIndex: 100, padding: 20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 560, maxHeight: '90vh',
        background: T.card, borderRadius: 14,
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        animation: 'modalIn .2s ease',
        boxShadow: '0 20px 60px rgba(0,0,0,.2)',
      }}>
        <style>{`@keyframes modalIn{from{transform:scale(.96);opacity:0}to{transform:scale(1);opacity:1}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>

        {step === 1 && (
          <>
            {/* HEADER */}
            <div style={{
              padding: '18px 22px',
              borderBottom: `.5px solid ${T.hairline}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: T.text }}>Nueva campaña</div>
                  <div style={{ fontSize: 11.5, color: T.text4, marginTop: 2 }}>
                    {mode === 'auto' ? 'Vera generará copies, prompts e imágenes automáticamente' : 'Tú escribes los copies, Vera te da feedback'}
                  </div>
                </div>
                <button onClick={onClose} aria-label="Cerrar" style={{
                  background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: T.text4,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* Toggle modo */}
              <div style={{ display: 'flex', gap: 2, background: T.sidebar, borderRadius: 8, padding: 3, width: 'fit-content' }}>
                <button onClick={() => setMode('auto')} style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none',
                  background: mode === 'auto' ? '#fff' : 'transparent',
                  color: mode === 'auto' ? VERA_BLUE : T.text3,
                  boxShadow: mode === 'auto' ? '0 1px 2px rgba(0,0,0,.06)' : 'none',
                  fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" />
                  </svg>
                  Vera lo hace
                </button>
                <button onClick={() => setMode('manual')} style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none',
                  background: mode === 'manual' ? '#fff' : 'transparent',
                  color: mode === 'manual' ? T.text : T.text3,
                  boxShadow: mode === 'manual' ? '0 1px 2px rgba(0,0,0,.06)' : 'none',
                  fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  Manual
                </button>
              </div>
            </div>

            {/* FORM */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Nombre */}
              <div>
                <label style={{ fontSize: 11, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
                  Nombre de la campaña
                </label>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="Ej: Black Friday Calzado 2026"
                  autoFocus
                  style={{
                    width: '100%', padding: '10px 12px',
                    borderRadius: 8, border: `.5px solid ${T.hairline}`,
                    fontSize: 13, fontFamily: 'inherit', color: T.text, outline: 'none',
                  }} />
              </div>

              {/* Objetivo */}
              <div>
                <label style={{ fontSize: 11, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>
                  Objetivo
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                  {OBJECTIVES.map(o => (
                    <button key={o.k} onClick={() => setObjective(o.k)} style={{
                      padding: '10px 12px', borderRadius: 8,
                      background: objective === o.k ? 'rgba(0,113,227,.08)' : '#fff',
                      border: objective === o.k ? `.5px solid ${VERA_BLUE}` : `.5px solid ${T.hairline}`,
                      cursor: 'pointer', textAlign: 'left',
                      fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: objective === o.k ? 'rgba(0,113,227,.12)' : T.sidebar,
                        color: objective === o.k ? VERA_BLUE : T.text3,
                        display: 'grid', placeItems: 'center', flexShrink: 0,
                      }}>{OBJ_ICONS[o.k]}</div>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: objective === o.k ? VERA_BLUE : T.text }}>{o.l}</div>
                        <div style={{ fontSize: 10.5, color: T.text4, marginTop: 1 }}>{o.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Plataformas */}
              <div>
                <label style={{ fontSize: 11, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>
                  Plataformas
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {PLATFORMS_AVAILABLE.map(p => {
                    const selected = platforms.includes(p.k)
                    return (
                      <button key={p.k} onClick={() => togglePlatform(p.k)} style={{
                        padding: '6px 12px', borderRadius: 999,
                        background: selected ? p.bg : '#fff',
                        color: selected ? '#fff' : T.text3,
                        border: selected ? 'none' : `.5px solid ${T.hairline}`,
                        fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                        fontFamily: 'inherit',
                        textTransform: 'uppercase', letterSpacing: 0.3,
                      }}>{selected ? '✓ ' : ''}{p.l}</button>
                    )
                  })}
                </div>
              </div>

              {/* Presupuesto */}
              <div>
                <label style={{ fontSize: 11, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>
                  Presupuesto diario
                </label>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(0,113,227,.05), rgba(124,58,237,.05))',
                  borderRadius: 10, padding: '14px 16px',
                  border: '.5px solid rgba(0,113,227,.15)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: T.text3 }}>€</span>
                    <input type="number" value={budgetDaily}
                      onChange={e => setBudgetDaily(parseFloat(e.target.value) || 0)}
                      min="1" max="10000"
                      style={{
                        flex: 1, padding: '6px 0', border: 'none', outline: 'none',
                        fontSize: 22, fontWeight: 700, color: T.text,
                        background: 'transparent', fontFamily: 'inherit',
                        fontVariantNumeric: 'tabular-nums',
                      }} />
                    <span style={{ fontSize: 13, color: T.text4 }}>/día</span>
                  </div>
                  <input type="range" min="5" max="500" step="5" value={budgetDaily}
                    onChange={e => setBudgetDaily(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: VERA_BLUE }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: T.text4, marginTop: 4 }}>
                    <span>≈ {fmtEuro(budgetDaily * 7)}/semana</span>
                    <span>≈ {fmtEuro(budgetDaily * 30)}/mes</span>
                  </div>
                </div>
              </div>

              {/* Fechas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Inicio</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 10px',
                      borderRadius: 8, border: `.5px solid ${T.hairline}`,
                      fontSize: 12.5, fontFamily: 'inherit', color: T.text, outline: 'none',
                    }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Fin</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 10px',
                      borderRadius: 8, border: `.5px solid ${T.hairline}`,
                      fontSize: 12.5, fontFamily: 'inherit', color: T.text, outline: 'none',
                    }} />
                </div>
              </div>

              {/* Contexto extra (opcional) */}
              <div>
                <label style={{ fontSize: 11, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
                  {mode === 'manual' ? 'Notas adicionales (opcional)' : 'Contexto para Vera (opcional)'}
                </label>
                <textarea value={extraContext} onChange={e => setExtraContext(e.target.value)}
                  placeholder={mode === 'manual' ? 'Ej: público objetivo específico, restricciones...' : 'Ej: Enfoca en producto nuevo, descuento 30%, mensaje urgente...'}
                  rows="2"
                  style={{
                    width: '100%', padding: '10px 12px',
                    borderRadius: 8, border: `.5px solid ${T.hairline}`,
                    fontSize: 12.5, fontFamily: 'inherit', color: T.text, outline: 'none',
                    resize: 'vertical',
                  }} />
              </div>

              {/* MODO MANUAL: Copies escritos por el usuario */}
              {mode === 'manual' && (
                <div style={{
                  background: T.sidebar, borderRadius: 12,
                  padding: 16, border: `.5px solid ${T.hairline}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: T.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Tu copy
                    </div>
                    <button onClick={askVeraReview} disabled={reviewing || (!manualHeadline.trim() && !manualBody.trim())} style={{
                      padding: '5px 11px', borderRadius: 6,
                      background: reviewing ? T.hairline : 'rgba(0,113,227,.1)',
                      color: VERA_BLUE, border: 'none',
                      fontSize: 11, fontWeight: 600, cursor: reviewing ? 'wait' : 'pointer',
                      fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" />
                      </svg>
                      {reviewing ? 'Revisando…' : 'Pedir feedback a Vera'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 10, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, display: 'block', marginBottom: 4 }}>Titular</label>
                      <input value={manualHeadline} onChange={e => setManualHeadline(e.target.value)}
                        placeholder="Ej: -50% en toda la tienda"
                        style={{
                          width: '100%', padding: '8px 10px',
                          borderRadius: 6, border: `.5px solid ${T.hairline}`,
                          fontSize: 12.5, fontFamily: 'inherit', color: T.text, outline: 'none',
                          background: T.card,
                        }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, display: 'block', marginBottom: 4 }}>Cuerpo</label>
                      <textarea value={manualBody} onChange={e => setManualBody(e.target.value)}
                        placeholder="Ej: Las mejores marcas de calzado al mejor precio. Envío gratis 24h..."
                        rows="3"
                        style={{
                          width: '100%', padding: '8px 10px',
                          borderRadius: 6, border: `.5px solid ${T.hairline}`,
                          fontSize: 12.5, fontFamily: 'inherit', color: T.text, outline: 'none',
                          background: T.card, resize: 'vertical',
                        }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, display: 'block', marginBottom: 4 }}>CTA</label>
                      <input value={manualCta} onChange={e => setManualCta(e.target.value)}
                        placeholder="Ej: Compra ahora"
                        style={{
                          width: '100%', padding: '8px 10px',
                          borderRadius: 6, border: `.5px solid ${T.hairline}`,
                          fontSize: 12.5, fontFamily: 'inherit', color: T.text, outline: 'none',
                          background: T.card,
                        }} />
                    </div>
                  </div>

                  {/* Feedback de Vera */}
                  {veraReview && (
                    <div style={{
                      marginTop: 14, padding: 12, borderRadius: 8,
                      background: 'linear-gradient(135deg, rgba(0,113,227,.05), rgba(124,58,237,.05))',
                      border: '.5px solid rgba(0,113,227,.15)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: 5, background: VERA_BLUE,
                          display: 'grid', placeItems: 'center',
                        }}>
                          <svg width="9" height="9" viewBox="0 0 16 16" fill="none">
                            <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" fill="#fff" />
                          </svg>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: VERA_BLUE }}>Vera dice:</span>
                      </div>
                      <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.55, whiteSpace: 'pre-line' }}>{veraReview}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div style={{
              padding: '14px 22px',
              borderTop: `.5px solid ${T.hairline}`,
              display: 'flex', justifyContent: 'flex-end', gap: 8,
              background: T.sidebar,
            }}>
              <button onClick={onClose} style={{
                padding: '9px 16px', borderRadius: 8,
                background: 'transparent', color: T.text3,
                border: `.5px solid ${T.hairline}`,
                fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              }}>Cancelar</button>
              <button onClick={create} disabled={!name.trim() || platforms.length === 0 || budgetDaily <= 0} style={{
                padding: '9px 18px', borderRadius: 8,
                background: (!name.trim() || platforms.length === 0 || budgetDaily <= 0) ? T.hairline : VERA_BLUE,
                color: '#fff', border: 'none',
                fontSize: 12.5, fontWeight: 600,
                cursor: (!name.trim() || platforms.length === 0 || budgetDaily <= 0) ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" />
                </svg>
                {mode === 'auto' ? 'Crear con Vera' : 'Crear campaña'}
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <div style={{ padding: '60px 40px', textAlign: 'center' }}>
            <div style={{
              width: 60, height: 60, borderRadius: 16,
              background: VERA_BLUE,
              display: 'grid', placeItems: 'center',
              margin: '0 auto 20px',
              animation: 'pulse 1.5s ease infinite',
            }}>
              <svg width="28" height="28" viewBox="0 0 16 16" fill="none">
                <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" fill="#fff" />
              </svg>
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, color: T.text, marginBottom: 8 }}>
              {mode === 'auto' ? 'Vera está creando tu campaña' : 'Creando campaña'}
            </div>
            <div style={{ fontSize: 12.5, color: T.text4, lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>
              {mode === 'auto'
                ? 'Generando copies, prompts de imagen y plan de testing A/B basado en tu análisis. Esto puede tardar 20-30 segundos.'
                : 'Guardando tu copy y generando los prompts de imagen complementarios.'}
            </div>
            <div style={{
              display: 'inline-block', marginTop: 20,
              width: 28, height: 28, borderRadius: 999,
              border: `2.5px solid ${T.hairline}`,
              borderTopColor: VERA_BLUE,
              animation: 'spin 1s linear infinite',
            }} />
          </div>
        )}

        {step === 3 && (
          <div style={{ padding: '60px 40px', textAlign: 'center' }}>
            <div style={{
              width: 60, height: 60, borderRadius: 999,
              background: '#059669',
              display: 'grid', placeItems: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, color: T.text, marginBottom: 6 }}>Campaña creada</div>
            <div style={{ fontSize: 12.5, color: T.text4 }}>Vera ha generado todo el contenido</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────
export default function MarketingPage() {
  const T = useT()
  const { theme } = useTheme()
  const router = useRouter()
  const [tab, setTab] = useState('estrategia')
  const [token, setToken] = useState(null)
  const [veraOpen, setVeraOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [newCampaignOpen, setNewCampaignOpen] = useState(false)
  const [campaignPrefill, setCampaignPrefill] = useState(null)
  const [summary, setSummary] = useState({ total: 0, active: 0 })

  async function loadSummary(t) {
    try {
      const r = await fetch(`${API}/api/marketing/campanas`, { headers: { Authorization: `Bearer ${t}` } })
      if (r.ok) {
        const d = await r.json()
        const list = d.campaigns || d || []
        setSummary({
          total: list.length,
          active: list.filter(c => c.status === 'active').length,
          draft: list.filter(c => c.status === 'draft').length,
        })
      }
    } catch {}
  }

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('nexum_token') : null
    if (!t) { router.push('/login'); return }
    setToken(t)
    loadSummary(t)
  }, [])

  const notificationCount = summary.active

  return (
    <div style={{
      minHeight: '100dvh', background: T.bg, display: 'flex',
      fontFamily: FONT, WebkitFontSmoothing: 'antialiased',
    }}>
      <style>{`*{box-sizing:border-box}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-thumb{background:${T.hairline};border-radius:999px}input:focus{outline:none}
        @media (max-width:768px){.mkt-row{grid-template-columns:1fr!important}}`}</style>

      <Sidebar active="/marketing" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100dvh' }}>
        <header style={{
          padding: '20px 32px 0',
          background: theme === 'dark' ? 'rgba(11,11,12,.85)' : 'rgba(251,251,253,.85)',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          borderBottom: `.5px solid ${T.hairline}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <h1 style={{ fontSize: 22, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.3 }}>Marketing</h1>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: '#059669' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.text4 }}>
                <FlagES size={11} />
                <span>España</span>
                <span>·</span>
                <span>{summary.total} campañas · {summary.active} activas</span>
              </div>
            </div>

            <HeaderActions onVera={() => setVeraOpen(true)} router={router}>
              <button onClick={() => setNotificationsOpen(o => !o)}
                aria-label={`Notificaciones${notificationCount > 0 ? ` (${notificationCount})` : ''}`}
                aria-expanded={notificationsOpen} style={{
                position: 'relative',
                padding: '7px 10px', borderRadius: 8,
                background: T.card, color: T.text2,
                border: `.5px solid ${T.hairline}`,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'grid', placeItems: 'center',
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
              <button onClick={() => { setCampaignPrefill(null); setNewCampaignOpen(true) }} style={{
                padding: '7px 14px', borderRadius: 8,
                background: VERA_BLUE, color: '#fff', border: 'none',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'inherit',
              }}>+ Nueva campaña</button>
            </HeaderActions>
          </div>

          <div style={{ display: 'flex', gap: 2, background: T.sidebar, borderRadius: 8, padding: 3, width: 'fit-content' }}>
            <Tab label="Estrategia" active={tab === 'estrategia'} onClick={() => setTab('estrategia')} />
            <Tab label="Campañas" active={tab === 'campanas'} onClick={() => setTab('campanas')} badge={summary.active} />
            <Tab label="Plataformas" active={tab === 'plataformas'} onClick={() => setTab('plataformas')} />
          </div>

          <div style={{ height: 16 }} />
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {tab === 'estrategia' && <EstrategiaTab token={token} onCreateCampaign={opp => {
            setCampaignPrefill({
              name: opp?.titulo || opp?.title || '',
              platforms: opp?.plataforma === 'ambas' ? ['google', 'meta'] :
                         opp?.plataforma === 'email' ? ['email'] :
                         opp?.plataforma ? [opp.plataforma] : ['google', 'meta'],
              extra: opp?.descripcion || opp?.description || '',
              objective: (opp?.plataforma === 'email' ? 'leads' : 'sales'),
            })
            setNewCampaignOpen(true)
          }} />}
          {tab === 'campanas' && <CampanasTab token={token} />}
          {tab === 'plataformas' && <PlataformasTab token={token} />}
        </div>
      </div>

      {veraOpen && <VeraDrawer onClose={() => setVeraOpen(false)} token={token} summary={summary} />}

      {newCampaignOpen && <NewCampaignModal
        token={token}
        prefill={campaignPrefill}
        onClose={() => { setNewCampaignOpen(false); setCampaignPrefill(null) }}
        onCreated={() => { loadSummary(token); setTab('campanas') }}
      />}

      {notificationsOpen && (
        <div onClick={() => setNotificationsOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }}>
          <div onClick={e => e.stopPropagation()} style={{
            position: 'fixed', top: 70, right: 32,
            width: 360, background: T.card, borderRadius: 12,
            border: `.5px solid ${T.hairline}`,
            boxShadow: '0 8px 30px rgba(0,0,0,.12)',
            padding: 14,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 10 }}>Notificaciones</div>
            {summary.active > 0 ? (
              <div onClick={() => { setNotificationsOpen(false); setTab('campanas') }} style={{
                padding: '10px 12px', borderRadius: 8,
                background: 'rgba(5,150,105,.04)',
                border: '.5px solid rgba(5,150,105,.15)',
                cursor: 'pointer',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 3 }}>
                  {summary.active} {summary.active === 1 ? 'campaña activa' : 'campañas activas'}
                </div>
                <div style={{ fontSize: 11, color: T.text2 }}>→ Revisa rendimiento y ajusta</div>
              </div>
            ) : (
              <div style={{ padding: 24, textAlign: 'center', color: T.text4, fontSize: 12 }}>
                Sin notificaciones
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
