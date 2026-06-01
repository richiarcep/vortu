'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { T, FONT } from '@/components/ui/tokens'

import { API_BASE as API } from '@/lib/api'
const VERA_BLUE = '#0071E3'

// ─────────────────────────────────────────────
// CONFIGS
// ─────────────────────────────────────────────
const DOC_TYPES = [
  { k: 'all',         label: 'Todos',        icon: 'folder', color: T.text3 },
  { k: 'factura',     label: 'Facturas',     icon: 'invoice', color: '#16a34a' },
  { k: 'contrato',    label: 'Contratos',    icon: 'contract', color: '#7c3aed' },
  { k: 'nomina',      label: 'Nóminas',      icon: 'people', color: '#0EA5E9' },
  { k: 'legal',       label: 'Legal',        icon: 'shield', color: '#dc2626' },
  { k: 'reporte',     label: 'Reportes',     icon: 'report', color: '#d97706' },
  { k: 'presupuesto', label: 'Presupuestos', icon: 'calc', color: '#0EA5E9' },
  { k: 'recibo',      label: 'Recibos',      icon: 'receipt', color: '#6b7280' },
  { k: 'certificado', label: 'Certificados', icon: 'cert', color: '#7c3aed' },
  { k: 'otro',        label: 'Otros',        icon: 'doc', color: '#6b7280' },
]

const TYPE_LABELS = {
  factura: 'Factura', contrato: 'Contrato', nomina: 'Nómina',
  legal: 'Legal', reporte: 'Reporte', presupuesto: 'Presupuesto',
  recibo: 'Recibo', certificado: 'Certificado', otro: 'Otro',
}

const TYPE_COLORS = {
  factura: '#16a34a', contrato: '#7c3aed', nomina: '#0EA5E9',
  legal: '#dc2626', reporte: '#d97706', presupuesto: '#0EA5E9',
  recibo: '#6b7280', certificado: '#7c3aed', otro: '#6b7280',
}

const MODULE_LABELS = {
  finance: 'Finanzas', hr: 'RRHH', marketing: 'Marketing',
  legal: 'Legal', general: 'General',
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function fmtSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024*1024) return (bytes/1024).toFixed(0) + ' KB'
  return (bytes/(1024*1024)).toFixed(1) + ' MB'
}
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDateShort(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}
function fmtEuro(n) { return n != null ? '€' + Math.round(n).toLocaleString('es-ES') : '—' }

// ─────────────────────────────────────────────
// BANDERA ES
// ─────────────────────────────────────────────
function FlagES({ size = 14 }) {
  return (
    <svg width={size * 1.4} height={size} viewBox="0 0 21 14" style={{ borderRadius: 2, display: 'block', flexShrink: 0 }}>
      <rect width="21" height="14" fill="#AA151B" />
      <rect y="3.5" width="21" height="7" fill="#F1BF00" />
    </svg>
  )
}

// ─────────────────────────────────────────────
// ICONOS para sidebar
// ─────────────────────────────────────────────
function TypeIcon({ kind, size = 14, color = 'currentColor' }) {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: 'none', stroke: color, strokeWidth: 2 }
  switch (kind) {
    case 'folder': return <svg {...props}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
    case 'invoice': return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
    case 'contract': return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
    case 'people': return <svg {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    case 'shield': return <svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    case 'report': return <svg {...props}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
    case 'calc': return <svg {...props}><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8.01" y2="10"/><line x1="12" y1="10" x2="12.01" y2="10"/><line x1="16" y1="10" x2="16.01" y2="10"/><line x1="8" y1="14" x2="8.01" y2="14"/><line x1="12" y1="14" x2="12.01" y2="14"/><line x1="16" y1="14" x2="16.01" y2="14"/><line x1="8" y1="18" x2="8.01" y2="18"/><line x1="12" y1="18" x2="12.01" y2="18"/><line x1="16" y1="18" x2="16.01" y2="18"/></svg>
    case 'receipt': return <svg {...props}><path d="M16 2H8a2 2 0 0 0-2 2v18l3-3 3 3 3-3 3 3V4a2 2 0 0 0-2-2z"/></svg>
    case 'cert': return <svg {...props}><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
    case 'doc':
    default: return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
  }
}

function FileIcon({ ext, size = 32 }) {
  const map = {
    pdf: { color: '#dc2626', label: 'PDF' },
    csv: { color: '#16a34a', label: 'CSV' },
    xlsx: { color: '#16a34a', label: 'XLS' },
    xls: { color: '#16a34a', label: 'XLS' },
    docx: { color: '#0071E3', label: 'DOC' },
    txt: { color: '#6b7280', label: 'TXT' },
    jpg: { color: '#7c3aed', label: 'IMG' },
    jpeg: { color: '#7c3aed', label: 'IMG' },
    png: { color: '#7c3aed', label: 'IMG' },
  }
  const cfg = map[ext?.toLowerCase()] || { color: '#6b7280', label: ext?.toUpperCase().slice(0,3) || 'DOC' }
  return (
    <div style={{
      width: size, height: size, borderRadius: 8,
      background: cfg.color, color: '#fff',
      display: 'grid', placeItems: 'center',
      fontSize: size * 0.28, fontWeight: 700,
      flexShrink: 0, letterSpacing: 0.3,
    }}>{cfg.label}</div>
  )
}

// ─────────────────────────────────────────────
// MODAL APROBACIÓN VERA v2
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
  const journalEntry = analysis.journal_entry || {}
  const canCreateJournal = journalEntry.should_create && journalEntry.lines?.length > 0

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

          {/* REVISIÓN RECOMENDADA — señal del pipeline de extracción por evidencia */}
          {analysis.needs_review && (
            <div style={{
              background: 'rgba(217,119,6,.06)', border: '.5px solid rgba(217,119,6,.25)',
              borderRadius: 12, padding: '12px 14px', marginBottom: 18,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.45 }}>
                <strong style={{ color: '#d97706' }}>Revisión recomendada.</strong> Algunos campos tienen baja
                confianza o no superaron la validación automática. Verifícalos antes de aprobar.
              </div>
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

          {/* ASIENTO CONTABLE (si Vera lo propone) */}
          {canCreateJournal && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 10.5, color: T.text4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                Asiento contable (PGC)
              </div>
              <div style={{
                border: '.5px solid rgba(124,58,237,.3)',
                borderRadius: 12, overflow: 'hidden',
                background: 'rgba(124,58,237,.02)',
              }}>
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(124,58,237,.06)',
                  borderBottom: '.5px solid rgba(124,58,237,.15)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Libro diario
                    </div>
                    <div style={{ fontSize: 10.5, color: T.text4, marginTop: 2 }}>
                      {journalEntry.description} · {journalEntry.reference}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: T.text4, fontWeight: 600 }}>{journalEntry.date}</div>
                    <div style={{ fontSize: 9.5, color: '#16a34a', fontWeight: 600, marginTop: 2 }}>
                      ✓ {journalEntry.balance_check || 'Asiento cuadrado'}
                    </div>
                  </div>
                </div>

                <table style={{ width: '100%', fontSize: 11.5 }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,.02)' }}>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 9.5, color: T.text4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, width: 50 }}>Cta</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 9.5, color: T.text4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Concepto</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right', fontSize: 9.5, color: T.text4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, width: 90 }}>Debe</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right', fontSize: 9.5, color: T.text4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, width: 90 }}>Haber</th>
                    </tr>
                  </thead>
                  <tbody>
                    {journalEntry.lines.map((l, i) => (
                      <tr key={i} style={{ borderTop: '.5px solid rgba(0,0,0,.04)' }}>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 700, color: '#7c3aed', fontSize: 11 }}>{l.account_code}</td>
                        <td style={{ padding: '8px 10px', color: T.text2 }}>
                          <div style={{ fontWeight: 500 }}>{l.description}</div>
                          <div style={{ fontSize: 10, color: T.text4, marginTop: 1 }}>{l.account_name}</div>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: l.debit > 0 ? T.text : T.text4 }}>
                          {l.debit > 0 ? fmtEuro(l.debit) : '—'}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: l.credit > 0 ? T.text : T.text4 }}>
                          {l.credit > 0 ? fmtEuro(l.credit) : '—'}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: 'rgba(124,58,237,.05)', borderTop: '.5px solid rgba(124,58,237,.2)' }}>
                      <td colSpan={2} style={{ padding: '8px 10px', fontWeight: 700, fontSize: 10.5, color: T.text2, textTransform: 'uppercase', letterSpacing: 0.4 }}>Totales</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: T.text }}>
                        {fmtEuro(journalEntry.lines.reduce((s, l) => s + (l.debit || 0), 0))}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: T.text }}>
                        {fmtEuro(journalEntry.lines.reduce((s, l) => s + (l.credit || 0), 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
// LOADING MODAL (mientras Vera analiza)
// ─────────────────────────────────────────────
function AnalyzingModal({ filename }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
      display: 'grid', placeItems: 'center', zIndex: 110,
    }}>
      <div style={{
        background: '#fff', borderRadius: 14,
        padding: '40px 50px', textAlign: 'center', minWidth: 380,
        boxShadow: '0 20px 60px rgba(0,0,0,.2)',
      }}>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: VERA_BLUE,
          display: 'grid', placeItems: 'center',
          margin: '0 auto 18px',
          animation: 'pulse 1.5s infinite',
        }}>
          <svg width="26" height="26" viewBox="0 0 16 16" fill="none">
            <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" fill="#fff" />
          </svg>
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 6 }}>Vera está analizando</div>
        <div style={{ fontSize: 12, color: T.text4, marginBottom: 4 }}>{filename}</div>
        <div style={{ fontSize: 11.5, color: T.text4, lineHeight: 1.5, maxWidth: 280, margin: '12px auto 0' }}>
          Clasificando, extrayendo datos y comprobando duplicados antes de añadir a la memoria semántica.
        </div>
        <div style={{
          marginTop: 18, display: 'inline-block',
          width: 24, height: 24, borderRadius: 999,
          border: `2.5px solid ${T.hairline}`,
          borderTopColor: VERA_BLUE,
          animation: 'spin 1s linear infinite',
        }} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// PREVIEW DOC SELECCIONADO
// ─────────────────────────────────────────────
function DocPreview({ doc, token, onClose, onDelete }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!doc) return
    setLoading(true)
    fetch(`${API}/api/documentos/${doc.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setDetail(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [doc?.id])

  if (!doc) return null

  async function handleDelete() {
    if (!confirm('¿Eliminar documento? Esto lo borrará de SQL, Neo4j y Chroma.')) return
    setDeleting(true)
    await fetch(`${API}/api/documentos/${doc.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    onDelete()
  }

  const d = detail || doc
  const typeColor = TYPE_COLORS[d.document_type] || '#6b7280'

  return (
    <div style={{
      background: '#fff', borderLeft: `.5px solid ${T.hairline}`,
      width: 420, height: '100%', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: 18, borderBottom: `.5px solid ${T.hairline}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 0 }}>
            <FileIcon ext={d.file_type} size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text, lineHeight: 1.3, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.filename}</div>
              <div style={{ display: 'flex', gap: 5 }}>
                <span style={{
                  padding: '2px 8px', borderRadius: 6,
                  background: `${typeColor}15`, color: typeColor,
                  fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3,
                }}>{TYPE_LABELS[d.document_type] || d.document_type}</span>
                {d.module && (
                  <span style={{
                    padding: '2px 8px', borderRadius: 6,
                    background: T.sidebar, color: T.text3,
                    fontSize: 10.5, fontWeight: 500,
                  }}>{MODULE_LABELS[d.module] || d.module}</span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: T.text4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: T.text4, fontSize: 13 }}>Cargando…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Resumen Vera */}
            {d.summary && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(0,113,227,.04), rgba(124,58,237,.04))',
                border: '.5px solid rgba(0,113,227,.15)',
                borderRadius: 10, padding: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 5, background: VERA_BLUE, display: 'grid', placeItems: 'center' }}>
                    <svg width="9" height="9" viewBox="0 0 16 16" fill="none">
                      <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" fill="#fff" />
                    </svg>
                  </div>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: VERA_BLUE, textTransform: 'uppercase', letterSpacing: 0.5 }}>Resumen Vera</span>
                </div>
                <div style={{ fontSize: 12.5, color: T.text2, lineHeight: 1.55 }}>{d.summary}</div>
              </div>
            )}

            {/* Datos extraídos */}
            {d.extracted_data && Object.keys(d.extracted_data).length > 0 && (
              <div>
                <div style={{ fontSize: 10.5, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  Datos extraídos
                </div>
                <div style={{ background: T.sidebar, borderRadius: 10, padding: 12 }}>
                  {Object.entries(d.extracted_data).filter(([k, v]) => v != null && v !== '').map(([k, v]) => (
                    <div key={k} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '6px 0', borderBottom: `.5px solid ${T.hairline}`,
                      fontSize: 12,
                    }}>
                      <span style={{ color: T.text4, textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
                      <span style={{ color: T.text, fontWeight: 500, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                        {typeof v === 'number' && k.includes('importe') ? fmtEuro(v) : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {d.semantic_tags && d.semantic_tags.length > 0 && (
              <div>
                <div style={{ fontSize: 10.5, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Tags</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {d.semantic_tags.map(t => (
                    <span key={t} style={{
                      padding: '2px 8px', borderRadius: 5,
                      background: 'rgba(0,113,227,.08)', color: VERA_BLUE,
                      fontSize: 10.5, fontWeight: 500,
                    }}>#{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings históricas */}
            {d.warnings && d.warnings.length > 0 && (
              <div>
                <div style={{ fontSize: 10.5, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Alertas registradas</div>
                <div style={{
                  background: 'rgba(217,119,6,.05)', border: '.5px solid rgba(217,119,6,.15)',
                  borderRadius: 10, padding: 10,
                }}>
                  {d.warnings.map((w, i) => (
                    <div key={i} style={{ fontSize: 11.5, color: T.text3, lineHeight: 1.5, paddingLeft: 12, position: 'relative', marginBottom: 3 }}>
                      <span style={{ position: 'absolute', left: 0 }}>•</span>{w}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div style={{ borderTop: `.5px solid ${T.hairline}`, paddingTop: 14, fontSize: 11, color: T.text4 }}>
              <div style={{ marginBottom: 4 }}>Subido: {fmtDate(d.created_at)}</div>
              {d.approved_at && <div>Aprobado: {fmtDate(d.approved_at)}</div>}
            </div>

            {/* Acciones */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleDelete} disabled={deleting} style={{
                flex: 1, padding: '9px', borderRadius: 8,
                background: 'transparent', color: '#dc2626',
                border: `.5px solid rgba(220,38,38,.3)`,
                fontSize: 12, fontWeight: 500, cursor: deleting ? 'wait' : 'pointer', fontFamily: 'inherit',
              }}>{deleting ? 'Eliminando…' : 'Eliminar'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────
export default function DocumentosPage() {
  const router = useRouter()
  const [token, setToken] = useState(null)
  const [docs, setDocs] = useState([])
  const [stats, setStats] = useState({ total: 0, by_type: {}, by_module: {} })
  const [activeType, setActiveType] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  // Upload flow
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzingFilename, setAnalyzingFilename] = useState('')
  const [pendingAnalysis, setPendingAnalysis] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('nexum_token') : null
    if (!t) { router.push('/login'); return }
    setToken(t)
    loadAll(t)
  }, [])

  async function loadAll(t) {
    setLoading(true)
    try {
      const [dR, sR] = await Promise.all([
        fetch(`${API}/api/documentos/`, { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`${API}/api/documentos/types/stats`, { headers: { Authorization: `Bearer ${t}` } }),
      ])
      if (dR.ok) {
        const d = await dR.json()
        setDocs(d.documents || [])
      }
      if (sR.ok) setStats(await sR.json())
    } catch {}
    setLoading(false)
  }

  async function handleFileSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''

    setAnalyzing(true)
    setAnalyzingFilename(file.name)

    const fd = new FormData()
    fd.append('file', file)

    try {
      const r = await fetch(`${API}/api/documentos/analyze`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      if (r.ok) {
        const analysis = await r.json()
        setPendingAnalysis(analysis)
      } else {
        const err = await r.text()
        alert('Error: ' + err)
      }
    } catch (e) {
      alert('Error: ' + e.message)
    }
    setAnalyzing(false)
  }

  async function handleApprove({ notes, overrideType, saveToSql }) {
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
  }

  async function handleReject() {
    try {
      await fetch(`${API}/api/documentos/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ temp_id: pendingAnalysis.temp_id, approved: false }),
      })
    } catch {}
    setPendingAnalysis(null)
  }

  // Filtros
  const filtered = docs.filter(d => {
    if (activeType !== 'all' && d.document_type !== activeType) return false
    if (search && !d.filename.toLowerCase().includes(search.toLowerCase()) &&
        !(d.summary || '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div style={{
      minHeight: '100vh', background: T.bg, display: 'flex',
      fontFamily: FONT, WebkitFontSmoothing: 'antialiased',
    }}>
      <style>{`*{box-sizing:border-box}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:999px}input:focus,select:focus{outline:none}`}</style>

      <Sidebar active="/documentos" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100vh' }}>
        {/* HEADER */}
        <header style={{
          padding: '20px 32px',
          background: 'rgba(251,251,253,.85)',
          backdropFilter: 'saturate(180%) blur(20px)',
          borderBottom: `.5px solid ${T.hairline}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <h1 style={{ fontSize: 22, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.3 }}>Documentos</h1>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: '#16a34a' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.text4 }}>
                <FlagES size={11} />
                <span>España</span>
                <span>·</span>
                <span>{stats.total} documentos · Vera revisa cada uno antes de guardar</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input ref={fileInputRef} type="file" onChange={handleFileSelect}
                accept=".pdf,.csv,.xlsx,.xls,.docx,.txt,.jpg,.jpeg,.png"
                style={{ display: 'none' }} />
              <button onClick={() => fileInputRef.current?.click()} style={{
                padding: '8px 16px', borderRadius: 8,
                background: VERA_BLUE, color: '#fff', border: 'none',
                fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Subir documento
              </button>
            </div>
          </div>
        </header>

        {/* TIPOS COMO TABS HORIZONTALES + BUSCADOR */}
        <div style={{
          padding: '14px 32px',
          background: '#fff',
          borderBottom: `.5px solid ${T.hairline}`,
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1 }}>
            {DOC_TYPES.map(dt => {
              const count = dt.k === 'all' ? docs.length : (stats.by_type?.[dt.k] || 0)
              const isActive = activeType === dt.k
              return (
                <button key={dt.k} onClick={() => setActiveType(dt.k)} style={{
                  padding: '6px 12px', borderRadius: 999,
                  background: isActive ? VERA_BLUE : (count > 0 ? T.sidebar : 'transparent'),
                  color: isActive ? '#fff' : (count > 0 ? T.text2 : T.text4),
                  border: isActive ? 'none' : `.5px solid ${count > 0 ? T.hairline : 'transparent'}`,
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 12, fontWeight: isActive ? 600 : 500,
                  transition: 'all .12s',
                }}>
                  <TypeIcon kind={dt.icon} size={12} color={isActive ? '#fff' : (count > 0 ? dt.color : T.text4)} />
                  <span>{dt.label}</span>
                  {count > 0 && (
                    <span style={{
                      fontSize: 10, padding: '1px 6px', borderRadius: 999,
                      background: isActive ? 'rgba(255,255,255,.25)' : 'rgba(0,0,0,.06)',
                      color: isActive ? '#fff' : T.text4,
                      fontWeight: 600, fontVariantNumeric: 'tabular-nums', minWidth: 16, textAlign: 'center',
                    }}>{count}</span>
                  )}
                </button>
              )
            })}
          </div>

          <div style={{ position: 'relative', width: 280, flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.text4 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              style={{
                width: '100%', padding: '7px 12px 7px 32px',
                borderRadius: 999, border: `.5px solid ${T.hairline}`,
                background: T.sidebar, fontSize: 12, fontFamily: 'inherit',
                color: T.text, outline: 'none',
              }} />
          </div>
        </div>

        {/* LAYOUT 2 COLUMNAS: lista + preview */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* LISTA DOCUMENTOS */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {/* Lista */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {loading ? (
                <div style={{ padding: 60, textAlign: 'center', color: T.text4, fontSize: 13 }}>Cargando…</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: T.sidebar,
                    display: 'grid', placeItems: 'center',
                    margin: '0 auto 12px',
                    color: T.text4,
                  }}>
                    <TypeIcon kind="folder" size={22} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.text2, marginBottom: 4 }}>
                    {search ? 'Sin resultados' : 'No hay documentos'}
                  </div>
                  <div style={{ fontSize: 12, color: T.text4, marginBottom: 20 }}>
                    {search ? 'Prueba con otra búsqueda' : 'Sube tu primer documento y Vera lo analizará'}
                  </div>
                  {!search && (
                    <button onClick={() => fileInputRef.current?.click()} style={{
                      padding: '8px 18px', borderRadius: 8,
                      background: VERA_BLUE, color: '#fff', border: 'none',
                      fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                    }}>Subir primer documento</button>
                  )}
                </div>
              ) : (
                <div style={{
                  background: '#fff', borderRadius: 12,
                  border: `.5px solid ${T.hairline}`,
                  overflow: 'hidden',
                }}>
                  {/* Header tabla */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '40px 1fr 140px 130px 80px 90px',
                    gap: 16, padding: '10px 16px',
                    background: T.sidebar,
                    borderBottom: `.5px solid ${T.hairline}`,
                    fontSize: 10, color: T.text4, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: 0.5,
                  }}>
                    <div></div>
                    <div>Documento</div>
                    <div>Proveedor / Origen</div>
                    <div style={{ textAlign: 'right' }}>Importe</div>
                    <div style={{ textAlign: 'center' }}>Asiento</div>
                    <div style={{ textAlign: 'right' }}>Fecha</div>
                  </div>

                  {filtered.map(d => {
                    const isSelected = selected?.id === d.id
                    const typeColor = TYPE_COLORS[d.document_type] || '#6b7280'
                    const importe = d.extracted_data?.importe_total || d.extracted_data?.importe || d.extracted_data?.amount
                    const emisor = d.extracted_data?.emisor || d.extracted_data?.supplier
                    const hasJournal = d.sql_action_result?.journal_created || d.sql_action_result?.transaction_id
                    const isInvoice = d.document_type === 'factura'

                    return (
                      <div key={d.id} onClick={() => setSelected(d)}
                        onMouseEnter={e => !isSelected && (e.currentTarget.style.background = T.sidebar)}
                        onMouseLeave={e => !isSelected && (e.currentTarget.style.background = '#fff')}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '40px 1fr 140px 130px 80px 90px',
                          gap: 16, padding: '12px 16px',
                          background: isSelected ? 'rgba(0,113,227,.05)' : '#fff',
                          borderBottom: `.5px solid ${T.hairline}`,
                          borderLeft: isSelected ? `2px solid ${VERA_BLUE}` : '2px solid transparent',
                          cursor: 'pointer',
                          alignItems: 'center',
                          transition: 'background .12s',
                        }}>

                        {/* Icono archivo */}
                        <FileIcon ext={d.file_type} size={32} />

                        {/* Nombre + tipo + summary */}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {d.filename}
                            </span>
                            <span style={{
                              padding: '1px 6px', borderRadius: 4,
                              background: `${typeColor}15`, color: typeColor,
                              fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4,
                              flexShrink: 0,
                            }}>{TYPE_LABELS[d.document_type] || d.document_type}</span>
                          </div>
                          {d.summary && (
                            <div style={{
                              fontSize: 11, color: T.text4, lineHeight: 1.4,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{d.summary}</div>
                          )}
                        </div>

                        {/* Proveedor / Origen */}
                        <div style={{ fontSize: 11.5, color: T.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                          {emisor || (d.module ? MODULE_LABELS[d.module] : '—')}
                        </div>

                        {/* Importe */}
                        <div style={{ textAlign: 'right' }}>
                          {importe ? (
                            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                              {fmtEuro(importe)}
                            </div>
                          ) : (
                            <span style={{ color: T.text4, fontSize: 11 }}>—</span>
                          )}
                        </div>

                        {/* Asiento PGC indicator */}
                        <div style={{ textAlign: 'center' }}>
                          {hasJournal ? (
                            <span title="Asiento contable creado en PGC" style={{
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                              padding: '2px 7px', borderRadius: 999,
                              background: 'rgba(124,58,237,.1)', color: '#7c3aed',
                              fontSize: 10, fontWeight: 700,
                            }}>
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                              PGC
                            </span>
                          ) : (
                            <span style={{ color: T.text4, fontSize: 11 }}>—</span>
                          )}
                        </div>

                        {/* Fecha */}
                        <div style={{ textAlign: 'right', fontSize: 11, color: T.text4, fontVariantNumeric: 'tabular-nums' }}>
                          {fmtDateShort(d.created_at)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* PREVIEW LATERAL */}
          {selected && (
            <DocPreview doc={selected} token={token}
              onClose={() => setSelected(null)}
              onDelete={() => { setSelected(null); loadAll(token) }}
            />
          )}
        </div>
      </div>

      {/* MODALES */}
      {analyzing && <AnalyzingModal filename={analyzingFilename} />}
      {pendingAnalysis && (
        <ApprovalModal
          analysis={pendingAnalysis}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setPendingAnalysis(null)}
        />
      )}
    </div>
  )
}
