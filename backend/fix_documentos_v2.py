"""
Fix frontend documentos: rediseñar modal aprobación con 2 destinos
1. Memoria semántica (siempre)
2. SQL estructurado (toggle, Vera lo propone)
"""
import os

p = os.path.expanduser('~/Desktop/vela/frontend/app/documentos/page.jsx')
s = open(p).read()

# REEMPLAZAR todo el componente ApprovalModal con la nueva versión
import re

old_pattern = r'// MODAL APROBACIÓN VERA\n// ─────────────────────────────────────────────\nfunction ApprovalModal.*?\n// ─────────────────────────────────────────────\n// LOADING MODAL'

new_modal = '''// MODAL APROBACIÓN VERA v2
// ─────────────────────────────────────────────
function ApprovalModal({ analysis, onApprove, onReject, onClose }) {
  const [notes, setNotes] = useState('')
  const [overrideType, setOverrideType] = useState(analysis.document_type)
  const [saveToSql, setSaveToSql] = useState(analysis.sql_action?.should_create !== false)
  const [submitting, setSubmitting] = useState(false)

  async function handleApprove() {
    setSubmitting(true)
    await onApprove({ notes, overrideType: overrideType !== analysis.document_type ? overrideType : null, saveToSql })
  }

  async function handleReject() {
    setSubmitting(true)
    await onReject()
  }

  const hasWarnings = analysis.warnings?.length > 0
  const isDuplicate = analysis.warnings?.some(w => w.toLowerCase().includes('duplicado'))
  const conf = analysis.confidence || 0
  const confColor = conf >= 0.8 ? '#16a34a' : conf >= 0.5 ? '#d97706' : '#dc2626'
  const sqlAction = analysis.sql_action || {}
  const canCreateSql = sqlAction.should_create && sqlAction.table

  const TABLE_LABELS = {
    expenses: 'Gastos (Contabilidad)',
    payslips: 'Nóminas (RRHH)',
    contracts: 'Contratos (RRHH)',
    invoices: 'Facturas (Contabilidad)',
  }

  const TABLE_ICONS = {
    expenses: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    payslips: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
    contracts: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/></svg>,
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
      display: 'grid', placeItems: 'center', zIndex: 100, padding: 20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 720, maxHeight: '92vh',
        background: '#fff', borderRadius: 16,
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        animation: 'modalIn .2s ease',
        boxShadow: '0 30px 80px rgba(0,0,0,.25)',
      }}>
        <style>{`@keyframes modalIn{from{transform:scale(.96);opacity:0}to{transform:scale(1);opacity:1}}`}</style>

        {/* HEADER pulido con icono Vera */}
        <div style={{
          padding: '20px 24px 18px',
          borderBottom: `.5px solid ${T.hairline}`,
          background: 'linear-gradient(180deg, rgba(0,113,227,.025) 0%, transparent 100%)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: VERA_BLUE,
              display: 'grid', placeItems: 'center',
              boxShadow: '0 4px 12px rgba(0,113,227,.25)',
            }}>
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" fill="#fff" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.text, lineHeight: 1.2 }}>Análisis de Vera</div>
              <div style={{ fontSize: 11.5, color: T.text4, marginTop: 3 }}>Revisa antes de añadir a memoria semántica</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, color: T.text4,
            borderRadius: 6,
          }}
            onMouseEnter={e => e.currentTarget.style.background = T.sidebar}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* ARCHIVO + TIPO */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: 14, borderRadius: 12,
            background: T.sidebar,
            marginBottom: 18,
          }}>
            <FileIcon ext={analysis.filename?.split('.').pop()} size={42} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis' }}>{analysis.filename}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: T.text4 }}>
                <span>{fmtSize(analysis.file_size)}</span>
                <span>·</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Analizado hace un momento
                </span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Confianza</div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 10px', borderRadius: 999,
                background: `${confColor}15`, color: confColor,
                fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
              }}>
                {Math.round(conf*100)}%
              </div>
            </div>
          </div>

          {/* WARNINGS */}
          {hasWarnings && (
            <div style={{
              background: isDuplicate ? 'rgba(220,38,38,.05)' : 'rgba(217,119,6,.05)',
              border: isDuplicate ? '.5px solid rgba(220,38,38,.2)' : '.5px solid rgba(217,119,6,.2)',
              borderRadius: 12, padding: 14, marginBottom: 18,
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700,
                color: isDuplicate ? '#dc2626' : '#d97706',
                textTransform: 'uppercase', letterSpacing: 0.5,
                marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                {isDuplicate ? 'Duplicado detectado' : 'Alertas'}
              </div>
              {analysis.warnings.map((w, i) => (
                <div key={i} style={{ fontSize: 12, color: T.text2, lineHeight: 1.5, paddingLeft: 16, position: 'relative', marginBottom: 4 }}>
                  <span style={{ position: 'absolute', left: 0 }}>•</span>{w}
                </div>
              ))}
            </div>
          )}

          {/* CLASIFICACIÓN + RESUMEN en grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 16, marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 10.5, color: T.text4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Tipo
              </div>
              <select value={overrideType} onChange={e => setOverrideType(e.target.value)} style={{
                width: '100%', padding: '10px 12px',
                borderRadius: 10, border: `.5px solid ${T.hairline}`,
                fontSize: 12.5, color: T.text, background: '#fff',
                fontFamily: 'inherit', cursor: 'pointer',
                fontWeight: 500,
              }}>
                {Object.entries(TYPE_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>{l}{overrideType === k && overrideType !== analysis.document_type ? ' (corregido)' : ''}</option>
                ))}
              </select>
              <div style={{ fontSize: 10.5, color: T.text4, marginTop: 6, lineHeight: 1.4 }}>
                Vera detectó: <strong style={{ color: T.text3 }}>{TYPE_LABELS[analysis.document_type] || analysis.document_type}</strong>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 10.5, color: T.text4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Resumen
              </div>
              <div style={{
                padding: 12, borderRadius: 10,
                background: T.sidebar,
                fontSize: 12.5, color: T.text2, lineHeight: 1.6,
              }}>{analysis.summary || 'Sin resumen'}</div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              DESTINOS DE GUARDADO — la parte central nueva
              ═══════════════════════════════════════════════════════════ */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10.5, color: T.text4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
              Vera lo guardará en
            </div>

            {/* DESTINO 1: Memoria semántica (siempre) */}
            <div style={{
              border: `.5px solid ${T.hairline}`,
              borderRadius: 12, padding: 14, marginBottom: 8,
              background: 'linear-gradient(135deg, rgba(0,113,227,.03), rgba(124,58,237,.03))',
              display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: VERA_BLUE, color: '#fff',
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Memoria semántica</div>
                  <span style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 999,
                    background: 'rgba(22,163,74,.1)', color: '#16a34a',
                    fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4,
                  }}>Siempre</span>
                </div>
                <div style={{ fontSize: 11.5, color: T.text3, lineHeight: 1.5 }}>
                  Vera podrá referenciar este documento cuando le preguntes. Se indexa en Neo4j (relaciones) y Chroma (búsqueda semántica).
                </div>
                {analysis.semantic_tags && analysis.semantic_tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                    {analysis.semantic_tags.map(t => (
                      <span key={t} style={{
                        padding: '2px 7px', borderRadius: 5,
                        background: 'rgba(0,113,227,.08)', color: VERA_BLUE,
                        fontSize: 10, fontWeight: 500,
                      }}>#{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* DESTINO 2: SQL estructurado (toggle) */}
            {canCreateSql ? (
              <div style={{
                border: saveToSql ? `.5px solid rgba(22,163,74,.3)` : `.5px solid ${T.hairline}`,
                borderRadius: 12, padding: 14,
                background: saveToSql ? 'rgba(22,163,74,.03)' : '#fff',
                display: 'flex', alignItems: 'flex-start', gap: 12,
                transition: 'all .15s',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: saveToSql ? '#16a34a' : T.sidebar,
                  color: saveToSql ? '#fff' : T.text4,
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                  transition: 'all .15s',
                }}>
                  {TABLE_ICONS[sqlAction.table] || <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                      {TABLE_LABELS[sqlAction.table] || sqlAction.table}
                    </div>
                    {/* Toggle */}
                    <button onClick={() => setSaveToSql(!saveToSql)} style={{
                      width: 38, height: 22, borderRadius: 999,
                      background: saveToSql ? '#16a34a' : '#d1d5db',
                      border: 'none', cursor: 'pointer', position: 'relative',
                      transition: 'background .2s',
                    }}>
                      <div style={{
                        position: 'absolute', top: 2,
                        left: saveToSql ? 18 : 2,
                        width: 18, height: 18, borderRadius: 999,
                        background: '#fff',
                        boxShadow: '0 1px 2px rgba(0,0,0,.2)',
                        transition: 'left .2s',
                      }} />
                    </button>
                  </div>
                  <div style={{ fontSize: 11.5, color: T.text3, lineHeight: 1.5, marginBottom: 10 }}>
                    {sqlAction.reason || 'Crear registro estructurado además de la memoria semántica'}
                  </div>

                  {/* Preview del registro SQL */}
                  {saveToSql && sqlAction.preview_record && Object.keys(sqlAction.preview_record).length > 0 && (
                    <div style={{
                      background: '#fff', border: `.5px solid ${T.hairline}`,
                      borderRadius: 8, padding: 10, marginTop: 4,
                    }}>
                      <div style={{ fontSize: 9.5, color: T.text4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                        Registro a crear
                      </div>
                      <table style={{ width: '100%', fontSize: 11.5 }}>
                        <tbody>
                          {Object.entries(sqlAction.preview_record).filter(([k, v]) => v != null && v !== '').map(([k, v]) => (
                            <tr key={k}>
                              <td style={{ padding: '3px 0', color: T.text4, fontWeight: 500, width: '35%', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</td>
                              <td style={{ padding: '3px 0', color: T.text, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                                {typeof v === 'number' && (k.includes('amount') || k.includes('importe') || k.includes('gross') || k.includes('net')) ? fmtEuro(v) : String(v)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{
                border: `.5px dashed ${T.hairline}`,
                borderRadius: 12, padding: 14,
                background: 'transparent',
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: T.sidebar, color: T.text4,
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text3, marginBottom: 3 }}>Sin registro SQL</div>
                  <div style={{ fontSize: 11.5, color: T.text4, lineHeight: 1.5 }}>
                    {sqlAction.reason || 'Vera no detectó datos estructurables que merezcan un registro en BD. Solo se guardará en memoria semántica.'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* DATOS EXTRAÍDOS (compactos) */}
          {analysis.extracted_data && Object.keys(analysis.extracted_data).filter(k => analysis.extracted_data[k] != null && analysis.extracted_data[k] !== '').length > 0 && (
            <details style={{ marginBottom: 14 }}>
              <summary style={{
                fontSize: 11, color: T.text4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5,
                cursor: 'pointer', padding: '4px 0',
                listStyle: 'none',
              }}>
                Ver todos los datos extraídos ({Object.keys(analysis.extracted_data).filter(k => analysis.extracted_data[k] != null && analysis.extracted_data[k] !== '').length})
              </summary>
              <div style={{
                background: T.sidebar, borderRadius: 8, padding: 10, marginTop: 8,
              }}>
                <table style={{ width: '100%', fontSize: 11.5 }}>
                  <tbody>
                    {Object.entries(analysis.extracted_data).filter(([k, v]) => v != null && v !== '').map(([k, v]) => (
                      <tr key={k} style={{ borderBottom: `.5px solid ${T.hairline}` }}>
                        <td style={{ padding: '5px 4px', color: T.text4, fontWeight: 500, width: '35%', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</td>
                        <td style={{ padding: '5px 4px', color: T.text, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                          {typeof v === 'number' && k.includes('importe') ? fmtEuro(v) : String(v)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          {/* NOTAS USUARIO */}
          <div>
            <label style={{ fontSize: 10.5, color: T.text4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
              Tus notas (opcional)
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Contexto que Vera no sabe..."
              style={{
                width: '100%', padding: '10px 12px',
                borderRadius: 10, border: `.5px solid ${T.hairline}`,
                fontSize: 12.5, fontFamily: 'inherit', color: T.text, outline: 'none',
                resize: 'vertical',
              }} />
          </div>
        </div>

        {/* FOOTER */}
        <div style={{
          padding: '16px 24px',
          borderTop: `.5px solid ${T.hairline}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
          background: T.sidebar,
        }}>
          <button onClick={handleReject} disabled={submitting} style={{
            padding: '10px 18px', borderRadius: 10,
            background: 'transparent', color: '#dc2626',
            border: `.5px solid rgba(220,38,38,.3)`,
            fontSize: 12.5, fontWeight: 500, cursor: submitting ? 'wait' : 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Rechazar
          </button>
          <button onClick={handleApprove} disabled={submitting} style={{
            padding: '10px 22px', borderRadius: 10,
            background: VERA_BLUE, color: '#fff', border: 'none',
            fontSize: 12.5, fontWeight: 600, cursor: submitting ? 'wait' : 'pointer',
            fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 2px 8px rgba(0,113,227,.25)',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {submitting ? 'Guardando…' : (canCreateSql && saveToSql ? 'Aprobar y guardar (memoria + SQL)' : 'Aprobar y guardar')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// LOADING MODAL'''

s = re.sub(old_pattern, new_modal, s, count=1, flags=re.DOTALL)

# Actualizar handleApprove para pasar saveToSql
s = s.replace(
    """async function handleApprove({ notes, overrideType }) {
    try {
      const r = await fetch(`${API}/api/documentos/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temp_id: pendingAnalysis.temp_id,
          approved: true,
          user_notes: notes,
          override_type: overrideType,
        }),
      })
      if (r.ok) {
        setPendingAnalysis(null)
        loadAll(token)
      }
    } catch {}
  }""",
    """async function handleApprove({ notes, overrideType, saveToSql }) {
    try {
      const r = await fetch(`${API}/api/documentos/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temp_id: pendingAnalysis.temp_id,
          approved: true,
          user_notes: notes,
          override_type: overrideType,
          save_to_sql: saveToSql,
        }),
      })
      if (r.ok) {
        setPendingAnalysis(null)
        loadAll(token)
      }
    } catch {}
  }"""
)

open(p, 'w').write(s)
print("OK Modal rediseñado con destino dual + toggle SQL")
