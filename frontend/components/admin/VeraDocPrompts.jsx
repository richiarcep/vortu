'use client'
import React, { useEffect, useState } from 'react'

import { API_BASE as API } from '@/lib/api'

const T = {
  text: '#1d1d1f', text2: '#3a3a3c', text3: '#6e6e73', text4: '#86868b',
  card: '#fff', sidebar: '#f5f5f7', hairline: 'rgba(0,0,0,.08)',
  blue: '#4F46E5', green: '#34c759', amber: '#ff9500', red: '#ff3b30',
  purple: '#5e5ce6', dark: '#3730A3',
}
const FONT = "-apple-system,BlinkMacSystemFont,system-ui,sans-serif"

export default function VeraDocPrompts({ token }) {
  const [view, setView] = useState('templates') // 'templates' | 'prompts' | 'editor'
  const [templates, setTemplates] = useState([])
  const [activeTemplate, setActiveTemplate] = useState(null)
  const [prompts, setPrompts] = useState([])
  const [activePrompt, setActivePrompt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savedMsg, setSavedMsg] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  async function loadTemplates() {
    setLoading(true)
    try {
      const r = await fetch(API + '/api/admin/doc-prompts/list-templates', {
        headers: { Authorization: 'Bearer ' + token },
      })
      if (r.ok) setTemplates(await r.json())
    } catch {}
    setLoading(false)
  }

  async function loadPrompts(templateId) {
    setLoading(true)
    try {
      const r = await fetch(API + '/api/admin/doc-prompts/by-template/' + templateId, {
        headers: { Authorization: 'Bearer ' + token },
      })
      if (r.ok) setPrompts(await r.json())
    } catch {}
    setLoading(false)
  }

  async function loadPromptDetail(promptId) {
    try {
      const r = await fetch(API + '/api/admin/doc-prompts/' + promptId, {
        headers: { Authorization: 'Bearer ' + token },
      })
      if (r.ok) {
        setActivePrompt(await r.json())
        setView('editor')
      }
    } catch {}
  }

  useEffect(() => { if (token) loadTemplates() }, [token])

  function openTemplate(t) {
    setActiveTemplate(t)
    loadPrompts(t.id)
    setView('prompts')
  }

  async function savePrompt(changes) {
    try {
      const r = await fetch(API + '/api/admin/doc-prompts/' + activePrompt.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(changes),
      })
      if (r.ok) {
        setSavedMsg('Prompt guardado')
        setTimeout(() => setSavedMsg(''), 2000)
        loadPromptDetail(activePrompt.id)
        loadPrompts(activeTemplate.id)
      }
    } catch {}
  }

  async function createNewPrompt(data) {
    try {
      const r = await fetch(API + '/api/admin/doc-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ ...data, template_id: activeTemplate.id }),
      })
      if (r.ok) {
        setShowCreate(false)
        loadPrompts(activeTemplate.id)
        setSavedMsg('Prompt creado')
        setTimeout(() => setSavedMsg(''), 2000)
      }
    } catch {}
  }

  async function deletePrompt(promptId) {
    if (!confirm('¿Eliminar este prompt? No se puede deshacer.')) return
    try {
      const r = await fetch(API + '/api/admin/doc-prompts/' + promptId, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token },
      })
      if (r.ok) {
        setView('prompts')
        setActivePrompt(null)
        loadPrompts(activeTemplate.id)
      } else {
        const e = await r.json()
        alert(e.detail || 'Error')
      }
    } catch {}
  }

  if (loading) return <div style={{padding:40,color:T.text4,fontFamily:FONT,fontSize:14}}>Cargando…</div>

  // ════════════════════════════════════════════════
  // VISTA 1: Lista de templates
  // ════════════════════════════════════════════════
  if (view === 'templates') {
    return (
      <div style={{ fontFamily: FONT, padding: '20px 24px 40px' }}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4 }}>
            Prompts de extracción
          </div>
          <div style={{ fontSize: 12.5, color: T.text3, lineHeight: 1.5 }}>
            Cada tipo de documento tiene varios prompts. Vera aprende cuál funciona mejor con cada proveedor
            y se va asignando automáticamente.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {templates.map(t => (
            <div key={t.id} onClick={() => openTemplate(t)}
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
                </div>
                <div style={{ fontSize: 11.5, color: T.text4, marginBottom: 3 }}>
                  {t.description}
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: T.text3 }}>
                  <span><strong style={{ color: T.dark }}>{t.prompts_count}</strong> prompts ({t.active_count} activos)</span>
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

  // ════════════════════════════════════════════════
  // VISTA 2: Lista de prompts del template
  // ════════════════════════════════════════════════
  if (view === 'prompts') {
    return (
      <div style={{ fontFamily: FONT, padding: '20px 24px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, paddingBottom: 14, borderBottom: '.5px solid ' + T.hairline }}>
          <button onClick={() => setView('templates')} style={btnSecStyle}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Volver
          </button>
          <div style={{ fontSize: 28 }}>{activeTemplate.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{activeTemplate.label}</div>
            <div style={{ fontSize: 11.5, color: T.text4 }}>
              {prompts.length} prompts. Vera elige el mejor para cada proveedor automáticamente.
            </div>
          </div>
          {savedMsg && (
            <span style={{
              fontSize: 12, color: T.green, fontWeight: 600,
              background: 'rgba(52,199,89,.1)', padding: '5px 10px', borderRadius: 6,
            }}>✓ {savedMsg}</span>
          )}
          <button onClick={() => setShowCreate(true)} style={btnPrimaryStyle}>
            + Nuevo prompt
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', paddingBottom: 40, paddingRight: 4 }}>
          {prompts.map(p => (
            <div key={p.id} onClick={() => loadPromptDetail(p.id)}
              style={{
                padding: '14px 16px', background: T.card,
                border: '.5px solid ' + T.hairline, borderRadius: 12,
                cursor: 'pointer', transition: 'all .12s',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = T.sidebar }}
              onMouseLeave={e => { e.currentTarget.style.background = T.card }}>
              <div style={{ fontSize: 16, width: 28, textAlign: 'center' }}>
                {p.is_default ? '⭐' : '·'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>{p.label}</span>
                  {p.is_default && (
                    <span style={{
                      fontSize: 9, padding: '2px 6px', borderRadius: 4,
                      background: 'rgba(79,70,229,.1)', color: T.blue,
                      fontWeight: 700, letterSpacing: 0.4,
                    }}>DEFAULT</span>
                  )}
                  {p.is_system && (
                    <span style={{
                      fontSize: 9, padding: '2px 6px', borderRadius: 4,
                      background: T.sidebar, color: T.text4,
                      fontWeight: 600, letterSpacing: 0.4,
                    }}>SISTEMA</span>
                  )}
                  {!p.is_active && (
                    <span style={{
                      fontSize: 9, padding: '2px 6px', borderRadius: 4,
                      background: 'rgba(255,59,48,.1)', color: T.red,
                      fontWeight: 700, letterSpacing: 0.4,
                    }}>INACTIVO</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: T.text4, marginBottom: 4, lineHeight: 1.5 }}>
                  {p.description}
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 10.5, color: T.text3 }}>
                  <span>🎯 {p.providers_count} prov</span>
                  <span>·</span>
                  <span>{p.times_used} usos</span>
                  <span>·</span>
                  <span>{p.accuracy_score > 0 ? Math.round(p.accuracy_score * 100) + '% acc' : 'sin evaluar'}</span>
                  <span>·</span>
                  <span>{p.prompt_length} chars</span>
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.text4} strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          ))}
        </div>

        {showCreate && (
          <CreatePromptModal
            onClose={() => setShowCreate(false)}
            onCreate={createNewPrompt}
          />
        )}
      </div>
    )
  }

  // ════════════════════════════════════════════════
  // VISTA 3: Editor de prompt
  // ════════════════════════════════════════════════
  if (view === 'editor' && activePrompt) {
    return (
      <PromptEditor
        prompt={activePrompt}
        templateLabel={activeTemplate.label}
        onBack={() => { setView('prompts'); setActivePrompt(null) }}
        onSave={savePrompt}
        onDelete={() => deletePrompt(activePrompt.id)}
        savedMsg={savedMsg}
      />
    )
  }

  return null
}

function PromptEditor({ prompt, templateLabel, onBack, onSave, onDelete, savedMsg }) {
  const [draft, setDraft] = useState(JSON.parse(JSON.stringify(prompt)))
  useEffect(() => { setDraft(JSON.parse(JSON.stringify(prompt))) }, [prompt.id])

  function update(patch) { setDraft(d => ({ ...d, ...patch })) }

  return (
    <div style={{ fontFamily: FONT, padding: '20px 24px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, paddingBottom: 14, borderBottom: '.5px solid ' + T.hairline }}>
        <button onClick={onBack} style={btnSecStyle}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Volver
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{prompt.label}</div>
          <div style={{ fontSize: 11.5, color: T.text4 }}>
            {templateLabel} · {prompt.is_system ? 'Prompt del sistema' : 'Prompt personalizado'}
          </div>
        </div>
        {savedMsg && (
          <span style={{
            fontSize: 12, color: T.green, fontWeight: 600,
            background: 'rgba(52,199,89,.1)', padding: '5px 10px', borderRadius: 6,
          }}>✓ {savedMsg}</span>
        )}
        {!prompt.is_system && (
          <button onClick={onDelete} style={{
            ...btnSecStyle, color: T.red, borderColor: 'rgba(255,59,48,.3)',
          }}>Eliminar</button>
        )}
        <button onClick={() => onSave({
          label: draft.label,
          description: draft.description,
          prompt_text: draft.prompt_text,
          is_default: draft.is_default,
          is_active: draft.is_active,
        })} style={btnPrimaryStyle}>Guardar cambios</button>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* IZQUIERDA: configuración */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Clave interna (no se puede cambiar)">
            <input value={draft.prompt_key || ''} readOnly
              style={{ ...inputStyle, background: T.sidebar, color: T.text4 }} />
          </Field>

          <Field label="Etiqueta visible">
            <input value={draft.label || ''} onChange={e => update({ label: e.target.value })} style={inputStyle} />
          </Field>

          <Field label="Descripción">
            <textarea value={draft.description || ''} onChange={e => update({ description: e.target.value })}
              rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>

          <Toggle label="Marcar como prompt por defecto"
            value={!!draft.is_default} onChange={v => update({ is_default: v })} />
          <Toggle label="Activo (Vera lo usa)"
            value={draft.is_active !== false} onChange={v => update({ is_active: v })} />

          <SectionHeader title="Estadísticas de uso" />
          <div style={{
            background: T.sidebar, borderRadius: 9, padding: 14,
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
          }}>
            <Stat label="Proveedores asignados" value={prompt.top_providers ? prompt.top_providers.length : 0} />
            <Stat label="Veces usado" value={prompt.times_used || 0} />
            <Stat label="Accuracy media" value={prompt.accuracy_score > 0 ? Math.round(prompt.accuracy_score * 100) + '%' : '—'} />
            <Stat label="Correcciones promedio" value={prompt.corrections_avg > 0 ? prompt.corrections_avg.toFixed(1) : '—'} />
          </div>

          {prompt.top_providers && prompt.top_providers.length > 0 && (
            <>
              <SectionHeader title="Top proveedores que lo usan" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {prompt.top_providers.map((p, i) => (
                  <div key={i} style={{
                    padding: '8px 12px', background: T.card,
                    border: '.5px solid ' + T.hairline, borderRadius: 7,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{p.name || p.cif}</div>
                      <div style={{ fontSize: 10.5, color: T.text4, fontFamily: 'monospace' }}>{p.cif}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.text2 }}>
                        {Math.round((p.accuracy || 0) * 100)}%
                      </div>
                      <div style={{ fontSize: 10, color: T.text4 }}>{p.times_used} usos</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* DERECHA: editor de prompt */}
        <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            fontSize: 10.5, color: T.text4, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: 0.5,
          }}>Texto del prompt ({(draft.prompt_text || '').length} chars)</div>
          <textarea
            value={draft.prompt_text || ''}
            onChange={e => update({ prompt_text: e.target.value })}
            style={{
              width: '100%', minHeight: 500, padding: 14,
              border: '.5px solid ' + T.hairline, borderRadius: 9,
              fontSize: 12, lineHeight: 1.6, fontFamily: 'monospace',
              background: T.card, color: T.text, outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>
      </div>
    </div>
  )
}

function CreatePromptModal({ onClose, onCreate }) {
  const [data, setData] = useState({
    prompt_key: '', label: '', description: '', prompt_text: '', is_default: false,
  })

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,.3)', backdropFilter: 'blur(4px)',
        display: 'grid', placeItems: 'center', padding: 20,
      }}>
      <div style={{
        width: 'min(640px, 95vw)', maxHeight: '90vh',
        background: '#fff', borderRadius: 12,
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 30px 80px rgba(0,0,0,.25)', overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '.5px solid ' + T.hairline }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Nuevo prompt</div>
        </div>
        <div style={{ padding: 20, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Clave interna (sin espacios, ej: 'mi_categoria')">
            <input value={data.prompt_key}
              onChange={e => setData({ ...data, prompt_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              style={inputStyle} placeholder="ej: gastos_combustible" />
          </Field>
          <Field label="Etiqueta visible">
            <input value={data.label} onChange={e => setData({ ...data, label: e.target.value })}
              style={inputStyle} placeholder="ej: Gastos de combustible" />
          </Field>
          <Field label="Descripción">
            <textarea value={data.description} onChange={e => setData({ ...data, description: e.target.value })}
              rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="¿Cuándo usar este prompt?" />
          </Field>
          <Field label="Texto del prompt">
            <textarea value={data.prompt_text} onChange={e => setData({ ...data, prompt_text: e.target.value })}
              rows={10} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: 11.5 }}
              placeholder="Eres un experto en..." />
          </Field>
          <Toggle label="Marcar como prompt por defecto"
            value={data.is_default} onChange={v => setData({ ...data, is_default: v })} />
        </div>
        <div style={{
          padding: '14px 20px', borderTop: '.5px solid ' + T.hairline,
          display: 'flex', gap: 8, justifyContent: 'flex-end',
        }}>
          <button onClick={onClose} style={btnSecStyle}>Cancelar</button>
          <button onClick={() => onCreate(data)}
            disabled={!data.prompt_key || !data.label || !data.prompt_text}
            style={{
              ...btnPrimaryStyle,
              opacity: (!data.prompt_key || !data.label || !data.prompt_text) ? 0.5 : 1,
            }}>Crear prompt</button>
        </div>
      </div>
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
      paddingTop: 8, paddingBottom: 2,
      borderTop: '.5px solid ' + T.hairline,
    }}>{title}</div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, color: T.text4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{value}</div>
    </div>
  )
}

function Toggle({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 12.5, color: T.text, fontWeight: 500 }}>{label}</span>
      <button onClick={() => onChange(!value)} style={{
        width: 40, height: 22, borderRadius: 11, border: 'none',
        background: value ? T.green : T.hairline,
        position: 'relative', cursor: 'pointer', padding: 0,
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

const btnSecStyle = {
  padding: '7px 12px', borderRadius: 7, border: '.5px solid ' + T.hairline,
  background: '#fff', color: T.text2, fontSize: 12, fontWeight: 500,
  cursor: 'pointer', fontFamily: FONT,
  display: 'flex', alignItems: 'center', gap: 5,
}

const btnPrimaryStyle = {
  padding: '7px 14px', borderRadius: 7, border: 'none',
  background: '#3730A3', color: '#fff', fontSize: 12, fontWeight: 600,
  cursor: 'pointer', fontFamily: FONT,
}
