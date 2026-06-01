"""
Aplica al frontend/app/marketing/page.jsx:
1. Bandera SVG España (3 franjas) en lugar de emoji
2. Tab Estrategia rediseñado:
   - Hero card oscura (sector + presupuesto + intro narrativa)
   - Columna izquierda: público (con intereses), tono, mensajes clave
   - Columna derecha: oportunidades con botón "Crear campaña →" + fortalezas + debilidades
3. Fix campo: el endpoint devuelve {analisis}, no {analysis}
"""
import os
p = os.path.expanduser('~/Desktop/vortu/frontend/app/marketing/page.jsx')
s = open(p).read()

# 1. BANDERA SVG (reusable) — añadir helper al inicio
if 'function FlagES' not in s:
    s = s.replace(
        "// ─────────────────────────────────────────────────────────\n// PRIMITIVOS",
        """// ─────────────────────────────────────────────────────────
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
// PRIMITIVOS"""
    )

# 2. Reemplazar el emoji bandera en el header
s = s.replace(
    '<span style={{ fontSize: 14 }}>🇪🇸</span>',
    '<FlagES size={11} />'
)

# 3. Fix campo "analisis" del endpoint (estaba leyendo analysis)
s = s.replace(
    "const a = d.analysis || d",
    "const a = d.analisis || d.analysis || d"
)
# segunda ocurrencia en regenerate
s = s.replace(
    "        const a = d.analysis || d\n        setAnalysis(a)",
    "        const a = d.analisis || d.analysis || d\n        setAnalysis(a)"
)

# 4. Reemplazar TODO el EstrategiaTab con rediseño completo
import re

old_estrategia_pattern = r'// TAB 1: ESTRATEGIA.*?// ─────────────────────────────────────────────────────────\n// TAB 2'
new_estrategia = '''// TAB 1: ESTRATEGIA (Análisis IA)
// ─────────────────────────────────────────────────────────
function EstrategiaTab({ token, onCreateCampaign }) {
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [showFullAnalysis, setShowFullAnalysis] = useState(false)

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

  if (loading && !analysis) {
    return <div style={{ padding: 60, textAlign: 'center', color: T.text4, fontSize: 13 }}>Cargando análisis...</div>
  }

  if (!analysis) {
    return (
      <div style={{
        background: '#fff', borderRadius: 12,
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* COLUMNA IZQUIERDA: INFO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Público objetivo */}
          <div style={{
            background: '#fff', borderRadius: 12,
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
              background: '#fff', borderRadius: 12,
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
              background: '#fff', borderRadius: 12,
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
            background: '#fff', borderRadius: 12,
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
                  background: '#fff', borderRadius: 12,
                  border: `.5px solid ${T.hairline}`, padding: 14,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: '#16a34a' }} />
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: '#16a34a', textTransform: 'uppercase', letterSpacing: 0.5 }}>Fortalezas</span>
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {strengths.slice(0, 4).map((s, i) => (
                      <li key={i} style={{ fontSize: 11.5, color: T.text2, lineHeight: 1.45, paddingLeft: 10, position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 0, color: '#16a34a' }}>+</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {weaknesses.length > 0 && (
                <div style={{
                  background: '#fff', borderRadius: 12,
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
// TAB 2'''

s = re.sub(old_estrategia_pattern, new_estrategia, s, count=1, flags=re.DOTALL)

# 5. Pasar onCreateCampaign al EstrategiaTab (cambiar a la tab campañas)
s = s.replace(
    "{tab === 'estrategia' && <EstrategiaTab token={token} />}",
    "{tab === 'estrategia' && <EstrategiaTab token={token} onCreateCampaign={() => setTab('campanas')} />}"
)

open(p, 'w').write(s)
print("OK Tab Estrategia rediseñado + bandera SVG + fix campo analisis")
