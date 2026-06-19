'use client'
import React, { useEffect, useState } from 'react'

import { API_BASE as API } from '@/lib/api'

const T = {
  text: '#1d1d1f', text2: '#3a3a3c', text3: '#6e6e73', text4: '#86868b',
  card: '#fff', sidebar: '#f5f5f7', hairline: 'rgba(0,0,0,.08)',
  blue: '#4F46E5', green: '#34c759', amber: '#ff9500', red: '#ff3b30',
  orange: '#ff6b35', purple: '#5e5ce6', dark: '#3730A3',
}
const FONT = "-apple-system,BlinkMacSystemFont,system-ui,sans-serif"

const FIELD_TYPES = [
  { value: 'text',       label: 'Texto libre',       hint: 'Cualquier texto' },
  { value: 'number',     label: 'Número',            hint: 'Solo dígitos' },
  { value: 'currency',   label: 'Importe (€)',       hint: 'Decimal con 2 decimales' },
  { value: 'percentage', label: 'Porcentaje (%)',    hint: 'Número con %' },
  { value: 'date',       label: 'Fecha',             hint: 'DD/MM/YYYY' },
  { value: 'cif',        label: 'CIF / NIF español', hint: 'Validación automática' },
  { value: 'iban',       label: 'IBAN',              hint: 'Cuenta bancaria' },
  { value: 'email',      label: 'Email',             hint: 'Validación de email' },
  { value: 'phone',      label: 'Teléfono',          hint: 'Número de teléfono' },
]

const POSITION_HINTS = [
  { value: 'cabecera_arriba', label: 'Cabecera arriba' },
  { value: 'cabecera_abajo', label: 'Cabecera abajo' },
  { value: 'inferior_derecha', label: 'Inferior derecha' },
  { value: 'inferior_izquierda', label: 'Inferior izquierda' },
  { value: 'centro', label: 'Centro del documento' },
  { value: 'cualquier', label: 'En cualquier sitio' },
]

const VALIDATORS = [
  { value: 'spanish_cif', label: 'CIF español (con dígito control)' },
  { value: 'spanish_date', label: 'Fecha española válida' },
  { value: 'email_format', label: 'Formato email válido' },
  { value: 'iban_format', label: 'IBAN con checksum' },
  { value: '', label: 'Sin validador especial' },
]

const FALLBACKS = [
  { value: 'lookup_provider_db', label: 'Buscar en BD de proveedores' },
  { value: 'ai_secondary_pass', label: 'Segundo paso de IA con prompt más estricto' },
  { value: 'mark_for_review', label: 'Marcar para revisión manual' },
  { value: '', label: 'Sin estrategia (dejar vacío)' },
]

const SECTION_LABELS = {
  encabezado: 'Encabezado',
  lineas: 'Líneas del documento',
  impuestos: 'Tabla de impuestos',
  totales: 'Totales',
}

export default function VeraDocTemplates({ token }) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTemplate, setActiveTemplate] = useState(null)
  const [editingField, setEditingField] = useState(null)
  const [savedMsg, setSavedMsg] = useState('')

  async function loadList() {
    setLoading(true)
    try {
      const r = await fetch(API + '/api/admin/doc-templates', {
        headers: { Authorization: 'Bearer ' + token },
      })
      if (r.ok) setTemplates(await r.json())
    } catch {}
    setLoading(false)
  }

  async function loadDetail(id) {
    try {
      const r = await fetch(API + '/api/admin/doc-templates/' + id, {
        headers: { Authorization: 'Bearer ' + token },
      })
      if (r.ok) setActiveTemplate(await r.json())
    } catch {}
  }

  useEffect(() => { if (token) loadList() }, [token])

  async function saveField(fieldId, changes) {
    try {
      const r = await fetch(API + '/api/admin/doc-templates/' + activeTemplate.id + '/fields/' + fieldId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(changes),
      })
      if (r.ok) {
        setSavedMsg('Campo guardado')
        setTimeout(() => setSavedMsg(''), 2000)
        loadDetail(activeTemplate.id)
        setEditingField(null)
      }
    } catch {}
  }

  if (loading) return <div style={{padding:40,color:T.text4,fontFamily:FONT,fontSize:14}}>Cargando plantillas…</div>

  // Vista LISTA
  if (!activeTemplate) {
    return (
      <div style={{ fontFamily: FONT, padding: '20px 24px 40px' }}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4 }}>
            Plantillas de extracción
          </div>
          <div style={{ fontSize: 12.5, color: T.text3, lineHeight: 1.5 }}>
            Configura qué datos extrae Vera de cada tipo de documento. Las plantillas se aplican
            automáticamente cuando una empresa sube un PDF o imagen.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {templates.map(t => (
            <div key={t.id} onClick={() => loadDetail(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', background: T.card,
                border: '.5px solid ' + T.hairline, borderRadius: 12,
                cursor: 'pointer', transition: 'all .12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = T.sidebar }}
              onMouseLeave={e => { e.currentTarget.style.background = T.card }}>
              <div style={{
                fontSize: 28, width: 44, height: 44, borderRadius: 10,
                background: (t.color || '#888') + '15',
                display: 'grid', placeItems: 'center',
              }}>{t.icon || '📄'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{t.label}</span>
                  {t.is_active && (
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.green }} />
                  )}
                  {t.is_system && (
                    <span style={{
                      fontSize: 9, padding: '2px 6px', borderRadius: 4,
                      background: T.sidebar, color: T.text4,
                      fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4,
                    }}>Sistema</span>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: T.text4, marginBottom: 3 }}>
                  {t.description}
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: T.text3 }}>
                  <span>Módulo: <strong style={{ color: T.text2 }}>{t.module_target}</strong></span>
                  <span>·</span>
                  <span>{t.fields_count} campos</span>
                  <span>·</span>
                  <span>Cuenta: {t.accounting_account_default || '—'}</span>
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.text4} strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Vista EDITOR de template
  return (
    <div style={{ fontFamily: FONT, padding: '20px 24px 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, paddingBottom: 14, borderBottom: '.5px solid ' + T.hairline }}>
        <button onClick={() => setActiveTemplate(null)} style={{
          padding: '7px 12px', borderRadius: 8, border: '.5px solid ' + T.hairline,
          background: T.card, color: T.text2, fontSize: 12, fontWeight: 500,
          cursor: 'pointer', fontFamily: FONT, display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Volver
        </button>
        <div style={{ fontSize: 28 }}>{activeTemplate.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{activeTemplate.label}</div>
          <div style={{ fontSize: 11.5, color: T.text4 }}>
            Vera extraerá estos datos cuando una empresa suba este tipo de documento.
          </div>
        </div>
        {savedMsg && (
          <span style={{
            fontSize: 12, color: T.green, fontWeight: 600,
            background: 'rgba(52,199,89,.1)', padding: '5px 10px', borderRadius: 6,
          }}>✓ {savedMsg}</span>
        )}
      </div>

      {/* Secciones de campos */}
      {activeTemplate.sections.map(sect => (
        <SectionBlock
          key={sect.name}
          section={sect}
          onEditField={setEditingField}
        />
      ))}

      {/* Ajustes avanzados */}
      <AdvancedSettings template={activeTemplate} />

      {/* Drawer editor de campo */}
      {editingField && (
        <FieldEditorDrawer
          field={editingField}
          onClose={() => setEditingField(null)}
          onSave={(changes) => saveField(editingField.id, changes)}
        />
      )}
    </div>
  )
}

function SectionBlock({ section, onEditField }) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ marginBottom: 18, background: T.card, borderRadius: 12, border: '.5px solid ' + T.hairline, overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
        cursor: 'pointer', background: T.sidebar,
      }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="2.5"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform .15s' }}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.text2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {SECTION_LABELS[section.name] || section.name}
        </div>
        <span style={{ fontSize: 11, color: T.text4 }}>
          {section.fields.length} {section.fields.length === 1 ? 'campo' : 'campos'}
        </span>
      </div>
      {open && (
        <div>
          {section.fields.map((f, i) => (
            <div key={f.id} onClick={() => onEditField(f)}
              style={{
                padding: '11px 16px', borderTop: i > 0 ? '.5px solid ' + T.hairline : 'none',
                display: 'flex', alignItems: 'center', gap: 12,
                cursor: 'pointer', transition: 'background .1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = T.sidebar }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: f.is_enabled ? T.green : T.hairline,
                flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>{f.label}</span>
                  {f.is_required && (
                    <span style={{
                      fontSize: 9, padding: '1px 5px', borderRadius: 3,
                      background: 'rgba(255,59,48,.1)', color: T.red,
                      fontWeight: 700, letterSpacing: 0.3,
                    }}>OBLIGATORIO</span>
                  )}
                </div>
                <div style={{ fontSize: 10.5, color: T.text4, display: 'flex', gap: 8 }}>
                  <span style={{ fontFamily: 'monospace' }}>{f.field_key}</span>
                  <span>·</span>
                  <span>{f.field_type}</span>
                  {f.example_value && (
                    <>
                      <span>·</span>
                      <span style={{ color: T.text3 }}>ej: {f.example_value}</span>
                    </>
                  )}
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.text4} strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AdvancedSettings({ template }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ background: T.card, borderRadius: 12, border: '.5px solid ' + T.hairline, overflow: 'hidden', marginTop: 18 }}>
      <div onClick={() => setOpen(o => !o)} style={{
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
        cursor: 'pointer', background: T.sidebar,
      }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="2.5"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform .15s' }}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.text2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Ajustes avanzados
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: T.text4 }}>Modelo, prompt, validaciones</span>
      </div>
      {open && (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Cuenta contable por defecto">
            <input type="text" defaultValue={template.accounting_account_default || ''} style={inputStyle} readOnly />
          </Field>
          <Field label="Modelo de IA">
            <input type="text" defaultValue={template.model_preferred || ''} style={inputStyle} readOnly />
          </Field>
          <Field label="Validaciones cruzadas">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(template.validation_rules || []).map((r, i) => (
                <div key={i} style={{
                  padding: '8px 10px', background: T.sidebar, borderRadius: 7,
                  fontSize: 11.5, color: T.text2, fontFamily: 'monospace',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{
                    fontSize: 9, padding: '2px 6px', borderRadius: 3,
                    background: r.severity === 'error' ? 'rgba(255,59,48,.1)' : 'rgba(255,149,0,.1)',
                    color: r.severity === 'error' ? T.red : T.amber,
                    fontWeight: 700, letterSpacing: 0.4, fontFamily: FONT,
                  }}>{(r.severity || 'warning').toUpperCase()}</span>
                  <span>{r.rule}</span>
                </div>
              ))}
            </div>
          </Field>
          <Field label="Prompt de extracción (avanzado)">
            <textarea defaultValue={template.extraction_prompt || ''} rows={6} style={{
              ...inputStyle, fontFamily: 'monospace', fontSize: 11, resize: 'vertical', lineHeight: 1.5,
            }} readOnly />
          </Field>
        </div>
      )}
    </div>
  )
}

function FieldEditorDrawer({ field, onClose, onSave }) {
  const [draft, setDraft] = useState(JSON.parse(JSON.stringify(field)))
  function update(patch) { setDraft(d => ({ ...d, ...patch })) }
  function addKeyword(kw) {
    const next = [...(draft.keywords || []), kw.trim()].filter(Boolean)
    update({ keywords: Array.from(new Set(next)) })
  }
  function removeKeyword(idx) {
    update({ keywords: (draft.keywords || []).filter((_, i) => i !== idx) })
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,.3)', backdropFilter: 'blur(4px)',
        display: 'flex', justifyContent: 'flex-end',
      }}>
      <div style={{
        width: 'min(520px, 95vw)', height: '100vh', background: '#fff',
        display: 'flex', flexDirection: 'column', boxShadow: '-20px 0 60px rgba(0,0,0,.15)',
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '.5px solid ' + T.hairline,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Editar campo</div>
            <div style={{ fontSize: 11, color: T.text4, fontFamily: 'monospace', marginTop: 1 }}>{draft.field_key}</div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 7, border: 'none',
            background: T.sidebar, fontSize: 16, cursor: 'pointer', color: T.text3,
          }}>×</button>
        </div>

        <div style={{ padding: 20, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Etiqueta que ve la empresa">
            <input value={draft.label || ''} onChange={e => update({ label: e.target.value })} style={inputStyle} />
          </Field>

          <Field label="Tipo de dato">
            <select value={draft.field_type} onChange={e => update({ field_type: e.target.value })} style={inputStyle}>
              {FIELD_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <div style={{ fontSize: 10.5, color: T.text4, marginTop: 4 }}>
              {(FIELD_TYPES.find(o => o.value === draft.field_type) || {}).hint}
            </div>
          </Field>

          <Toggle label="¿Obligatorio? (no se aprueba sin esto)"
            value={!!draft.is_required} onChange={v => update({ is_required: v })} />
          <Toggle label="Habilitado (Vera intenta extraerlo)"
            value={draft.is_enabled !== false} onChange={v => update({ is_enabled: v })} />

          <SectionHeader title="Para ayudar a Vera a encontrarlo" />

          <Field label="Textos que buscar en el documento">
            <KeywordChips
              keywords={draft.keywords || []}
              onAdd={addKeyword}
              onRemove={removeKeyword}
            />
            <div style={{ fontSize: 10.5, color: T.text4, marginTop: 4 }}>
              Vera buscará estos textos cerca del valor a extraer.
            </div>
          </Field>

          <Field label="Dónde suele aparecer">
            <select value={draft.position_hint || ''} onChange={e => update({ position_hint: e.target.value })} style={inputStyle}>
              <option value="">(sin preferencia)</option>
              {POSITION_HINTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>

          <Field label="Descripción para Vera (qué es este campo)">
            <textarea value={draft.ai_hint || ''} onChange={e => update({ ai_hint: e.target.value })}
              rows={2} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
          </Field>

          <Field label="Valor de ejemplo">
            <input value={draft.example_value || ''} onChange={e => update({ example_value: e.target.value })} style={inputStyle} />
            <div style={{ fontSize: 10.5, color: T.text4, marginTop: 4 }}>
              Para mostrar a la empresa qué tipo de valor extraer.
            </div>
          </Field>

          <SectionHeader title="Validación avanzada" />

          <Field label="Patrón regex (opcional)">
            <input value={draft.regex_pattern || ''} onChange={e => update({ regex_pattern: e.target.value })}
              style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 11.5 }}
              placeholder="^[A-Z]\\d{8}$" />
            <div style={{ fontSize: 10.5, color: T.text4, marginTop: 4 }}>
              Si no sabes regex, déjalo vacío.
            </div>
          </Field>

          <Field label="Validador especial">
            <select value={draft.validator || ''} onChange={e => update({ validator: e.target.value })} style={inputStyle}>
              {VALIDATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>

          <Field label="Si Vera no lo encuentra">
            <select value={draft.fallback_strategy || ''} onChange={e => update({ fallback_strategy: e.target.value })} style={inputStyle}>
              {FALLBACKS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>

          <Field label="Valor por defecto (si nada funciona)">
            <input value={draft.default_value || ''} onChange={e => update({ default_value: e.target.value })} style={inputStyle} />
          </Field>
        </div>

        <div style={{
          padding: '12px 20px', borderTop: '.5px solid ' + T.hairline,
          display: 'flex', gap: 8, justifyContent: 'flex-end',
        }}>
          <button onClick={onClose} style={{
            padding: '8px 14px', borderRadius: 7, border: '.5px solid ' + T.hairline,
            background: '#fff', color: T.text2, fontSize: 12, fontWeight: 500,
            cursor: 'pointer', fontFamily: FONT,
          }}>Cancelar</button>
          <button onClick={() => {
            const changes = {
              label: draft.label,
              field_type: draft.field_type,
              is_required: draft.is_required,
              is_enabled: draft.is_enabled,
              regex_pattern: draft.regex_pattern || null,
              keywords: draft.keywords || [],
              position_hint: draft.position_hint || null,
              validator: draft.validator || null,
              fallback_strategy: draft.fallback_strategy || null,
              default_value: draft.default_value || null,
              ai_hint: draft.ai_hint || null,
              example_value: draft.example_value || null,
            }
            onSave(changes)
          }} style={{
            padding: '8px 16px', borderRadius: 7, border: 'none',
            background: T.dark, color: '#fff', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: FONT,
          }}>Guardar</button>
        </div>
      </div>
    </div>
  )
}

function KeywordChips({ keywords, onAdd, onRemove }) {
  const [input, setInput] = useState('')
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
        {keywords.map((k, i) => (
          <span key={i} style={{
            padding: '3px 8px', background: T.sidebar, borderRadius: 5,
            fontSize: 11.5, color: T.text, fontFamily: 'monospace',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            {k}
            <button onClick={() => onRemove(i)} style={{
              background: 'none', border: 'none', color: T.text4,
              cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1,
            }}>×</button>
          </span>
        ))}
      </div>
      <input value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && input.trim()) {
            e.preventDefault()
            onAdd(input)
            setInput('')
          }
        }}
        placeholder="Añadir palabra clave + Enter"
        style={{ ...inputStyle, fontSize: 11.5 }} />
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{
        fontSize: 10.5, color: T.text4, fontWeight: 600,
        marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5,
      }}>{label}</div>
      {children}
    </div>
  )
}

function SectionHeader({ title }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: T.text2,
      textTransform: 'uppercase', letterSpacing: 0.6,
      paddingTop: 8, paddingBottom: 4,
      borderTop: '.5px solid ' + T.hairline,
    }}>{title}</div>
  )
}

function Toggle({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 12.5, color: T.text, fontWeight: 500 }}>{label}</span>
      <button onClick={() => onChange(!value)} style={{
        width: 40, height: 22, borderRadius: 11, border: 'none',
        background: value ? T.green : T.hairline,
        position: 'relative', cursor: 'pointer', padding: 0, transition: 'background .15s',
      }}>
        <div style={{
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          position: 'absolute', top: 3, left: value ? 21 : 3, transition: 'left .15s',
        }} />
      </button>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '8px 10px', borderRadius: 7,
  border: '.5px solid rgba(0,0,0,.1)', fontSize: 12.5, fontFamily: FONT,
  background: '#fff', color: '#1d1d1f', outline: 'none', boxSizing: 'border-box',
}
