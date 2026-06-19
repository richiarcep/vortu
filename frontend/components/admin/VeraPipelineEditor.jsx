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

const MODULES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'finanzas', label: 'Finanzas' },
  { id: 'contabilidad', label: 'Contabilidad' },
  { id: 'costes', label: 'Costes' },
  { id: 'ventas', label: 'Ventas' },
  { id: 'proyectos', label: 'Proyectos' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'hr', label: 'Recursos Humanos' },
  { id: 'clientes', label: 'Clientes' },
]

const STEPS = [
  { id: 'trigger', icon: '⚡', label: 'Trigger' },
  { id: 'context', icon: '📍', label: 'Contexto' },
  { id: 'database', icon: '🗄', label: 'BD' },
  { id: 'orchestrator', icon: '🤖', label: 'Orquestador' },
  { id: 'apis', icon: '🔌', label: 'APIs' },
  { id: 'validator', icon: '✓', label: 'Validador' },
  { id: 'output', icon: '📤', label: 'Salida' },
]

const TRIGGER_TYPES = [
  { id: 'chat', label: 'Chat conversacional', desc: 'Usuario escribe en el drawer o /vera' },
  { id: 'kpi_click', label: 'Click en KPI', desc: 'Usuario pulsa Ask Vera sobre una métrica' },
  { id: 'auto_insight', label: 'Insight automático', desc: 'Vera genera observaciones del módulo' },
  { id: 'doc_analysis', label: 'Análisis de documento', desc: 'Usuario sube PDF/imagen para analizar' },
  { id: 'vera_acts', label: 'Vera Acts', desc: 'Vera ejecuta acción automática' },
  { id: 'vera_parse', label: 'Vera Parse', desc: 'Texto libre a JSON estructurado' },
]

const TYPE_COLOR_MAP = {
  green: T.green, yellow: T.amber, blue: T.blue,
  orange: T.orange, red: T.red, purple: T.purple,
}

const MODEL_OPTIONS = [
  { value: 'claude', label: 'Claude Sonnet 4.6' },
  { value: 'claude-haiku', label: 'Claude Haiku 4.5' },
  { value: 'openai', label: 'GPT-4o' },
  { value: 'gemini', label: 'Gemini 1.5 Pro' },
  { value: 'perplexity', label: 'Perplexity Sonar' },
  { value: 'groq', label: 'Llama 3.3 70B (Groq)' },
  { value: 'deepseek', label: 'DeepSeek R1' },
]

const ALL_APIS = [
  { id: 'claude', label: 'Anthropic' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'gemini', label: 'Google' },
  { id: 'perplexity', label: 'Perplexity' },
  { id: 'groq', label: 'Groq' },
  { id: 'deepseek', label: 'DeepSeek' },
]

const ALL_DATABASES = [
  {
    id: 'sql',
    icon: '🗄',
    label: 'SQL (Postgres)',
    desc: 'Datos transaccionales: ventas, gastos, contactos, facturas, empleados, proyectos, productos. Acceso a todas las tablas.',
  },
  {
    id: 'chroma',
    icon: '🧠',
    label: 'ChromaDB (vectores)',
    desc: 'Búsqueda semántica sobre documentos, conocimiento del cliente y RAG. Necesario para preguntas con contexto documental.',
  },
  {
    id: 'neo4j',
    icon: '🕸',
    label: 'Neo4j (grafo)',
    desc: 'Relaciones y patrones: cliente↔proveedor, concentración de riesgo, comunidades, fraude, dependencias.',
  },
]

const CONTEXT_SOURCES = [
  { id: 'page_url', label: 'URL de la página' },
  { id: 'module_name', label: 'Nombre del módulo' },
  { id: 'kpis_visible', label: 'KPIs visibles' },
  { id: 'user_role', label: 'Rol del usuario' },
  { id: 'company_data', label: 'Datos de la empresa' },
  { id: 'history', label: 'Conversación previa' },
]

const VALIDATOR_RULES = [
  { id: 'numeric_consistency', label: 'Coherencia numérica', desc: 'Verifica que cifras sumen y porcentajes cuadren' },
  { id: 'no_hallucination_check', label: 'Anti-alucinación', desc: 'Cruza respuesta con datos de BD para evitar inventos' },
  { id: 'cross_ai_validation', label: 'Cross-AI checking', desc: 'Una segunda IA revisa la respuesta antes de mostrarla' },
  { id: 'max_length', label: 'Longitud máxima', desc: 'Trunca respuestas excesivamente largas' },
  { id: 'safe_language', label: 'Lenguaje seguro', desc: 'Evita consejos legales/médicos directos' },
  { id: 'cite_sources', label: 'Citar fuentes', desc: 'Obliga a citar de qué tabla o doc vienen los datos' },
]

const OUTPUT_FORMATS = [
  { value: 'stream', label: 'Streaming' },
  { value: 'json', label: 'JSON estructurado' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'plain', label: 'Texto plano' },
]



export default function VeraPipelineEditor({ token }) {
  const [plan, setPlan] = useState('base')
  const [pipelines, setPipelines] = useState({})
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(null)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [apiStatus, setApiStatus] = useState({})

  async function loadAll() {
    setLoading(true)
    const result = {}
    await Promise.all(MODULES.map(async m => {
      try {
        const r = await fetch(API + '/api/admin/vera-pipeline/' + plan + '/' + m.id, {
          headers: { Authorization: 'Bearer ' + token },
        })
        if (r.ok) {
          const j = await r.json()
          result[m.id] = j.config
        }
      } catch {}
    }))
    setPipelines(result)
    setLoading(false)
  }

  async function loadApiStatus() {
    try {
      const r = await fetch(API + '/api/backoffice/vera-routing/models', {
        headers: { Authorization: 'Bearer ' + token },
      })
      if (r.ok) {
        const j = await r.json()
        const status = {}
        // Mapeo de aliases: el provider en BD puede ser distinto
        const ALIASES = {
          'claude': ['claude', 'anthropic', 'claude-sonnet', 'claude-haiku'],
          'openai': ['openai', 'gpt-4o', 'gpt4o'],
          'gemini': ['gemini', 'google'],
          'perplexity': ['perplexity', 'pplx'],
          'groq': ['groq', 'llama'],
          'deepseek': ['deepseek'],
        }
        ;(Array.isArray(j) ? j : (j.models || [])).forEach(m => {
          const ok = m.is_active === true && m.api_key_status === 'ok' && m.has_api_key === true
          status[m.provider] = ok
          // Marcar todos los aliases también
          Object.entries(ALIASES).forEach(([key, list]) => {
            if (list.includes(m.provider) || list.includes(m.provider?.toLowerCase())) {
              status[key] = status[key] || ok
            }
          })
        })
        setApiStatus(status)
      }
    } catch {}
  }

  useEffect(() => { if (token) { loadAll(); loadApiStatus() } }, [plan, token])

  async function saveStep(moduleId, stepName, stepConfig) {
    const cfg = pipelines[moduleId]
    if (!cfg) return
    setSaving(true)
    const newCfg = { ...cfg, steps: { ...cfg.steps, [stepName]: stepConfig } }
    try {
      const r = await fetch(API + '/api/admin/vera-pipeline/' + plan + '/' + moduleId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(newCfg),
      })
      if (r.ok) {
        setPipelines(p => ({ ...p, [moduleId]: newCfg }))
        setSavedMsg('Guardado')
        setTimeout(() => setSavedMsg(''), 2000)
      }
    } catch {}
    setSaving(false)
  }

  if (loading) return <div style={{padding:40,color:T.text4,fontFamily:FONT,fontSize:14}}>Cargando pipelines...</div>

  return (
    <div style={{ fontFamily: FONT }}>
      <div style={{
        display: 'flex', gap: 16, alignItems: 'center',
        padding: '16px 0', borderBottom: '.5px solid ' + T.hairline,
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', gap: 4, background: T.sidebar, borderRadius: 8, padding: 3 }}>
          {['base', 'plus'].map(p => (
            <button key={p} onClick={() => setPlan(p)} style={{
              padding: '7px 16px', borderRadius: 6, border: 'none',
              background: plan === p ? '#fff' : 'transparent',
              color: plan === p ? T.dark : T.text3,
              fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: FONT,
              letterSpacing: 0.5, textTransform: 'uppercase',
              boxShadow: plan === p ? '0 1px 3px rgba(0,0,0,.06)' : 'none',
            }}>{p === 'plus' ? '★ Plus' : 'Base'}</button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: T.text3 }}>
          Configurando los 9 módulos del plan {plan.toUpperCase()}
        </div>
        <div style={{ flex: 1 }} />
        {savedMsg && (
          <span style={{
            fontSize: 12, color: T.green, fontWeight: 600,
            background: 'rgba(52,199,89,.1)', padding: '5px 10px', borderRadius: 6,
          }}>✓ {savedMsg}</span>
        )}
      </div>

      <div style={{
        paddingRight: 4,
        maxHeight: 'calc(100vh - 200px)',
        overflowY: 'auto',
        paddingBottom: 40,
      }}>
        {MODULES.map(m => {
          const cfg = pipelines[m.id]
          const steps = (cfg && cfg.steps) || {}
          return (
            <div key={m.id} style={{
              marginBottom: 12, background: T.sidebar, borderRadius: 12, padding: '12px 16px',
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: T.text2,
                textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10,
              }}>{m.label}</div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                {STEPS.map((step, i) => {
                  const stepData = steps[step.id] || {}
                  const enabled = stepData.enabled !== false
                  const isActive = active && active.module === m.id && active.stepId === step.id

                  let summary = ''
                  if (step.id === 'trigger') summary = (stepData.types || []).length + ' tipos'
                  if (step.id === 'context') summary = (stepData.sources || []).length + ' fuentes'
                  if (step.id === 'database') summary = (stepData.databases || []).length + ' motores'
                  if (step.id === 'orchestrator') summary = (stepData.question_types || []).length + ' tipos'
                  if (step.id === 'apis') summary = enabled ? (stepData.active || []).length + ' activas' : 'off'
                  if (step.id === 'validator') summary = (stepData.rules || []).filter(r => r.enabled !== false).length + ' reglas'
                  if (step.id === 'output') summary = stepData.format || 'stream'

                  return (
                    <React.Fragment key={step.id}>
                      <button
                        onClick={() => setActive({ module: m.id, stepId: step.id })}
                        style={{
                          padding: '10px 12px', minWidth: 110, flexShrink: 0,
                          borderRadius: 10,
                          border: isActive ? '1.5px solid ' + T.dark : '.5px solid ' + T.hairline,
                          background: enabled ? '#fff' : 'rgba(255,255,255,.5)',
                          cursor: 'pointer', textAlign: 'left', fontFamily: FONT,
                          opacity: enabled ? 1 : 0.5,
                          boxShadow: isActive ? '0 2px 8px rgba(0,61,143,.12)' : 'none',
                          transition: 'all .12s',
                        }}
                      >
                        <div style={{ fontSize: 18, marginBottom: 4 }}>{step.icon}</div>
                        <div style={{ fontSize: 11.5, fontWeight: 600, color: T.text }}>{step.label}</div>
                        <div style={{ fontSize: 10, color: T.text4, marginTop: 1 }}>{summary}</div>
                      </button>
                      {i < STEPS.length - 1 && (
                        <span style={{ color: T.text4, fontSize: 14, flexShrink: 0 }}>→</span>
                      )}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {active && pipelines[active.module] && pipelines[active.module].steps && (
        <SidePanel
          step={STEPS.find(s => s.id === active.stepId)}
          module={MODULES.find(m => m.id === active.module)}
          plan={plan}
          config={pipelines[active.module].steps[active.stepId] || {}}
          apiStatus={apiStatus}
          onSave={(newCfg) => { saveStep(active.module, active.stepId, newCfg); setActive(null) }}
          onClose={() => setActive(null)}
          saving={saving}
        />
      )}
    </div>
  )
}

function SidePanel({ step, module, plan, config, apiStatus, onSave, onClose, saving }) {
  const [draft, setDraft] = useState(JSON.parse(JSON.stringify(config)))
  useEffect(() => { setDraft(JSON.parse(JSON.stringify(config))) }, [step, module])

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,.3)', backdropFilter: 'blur(4px)',
        display: 'flex', justifyContent: 'flex-end',
      }}
    >
      <div style={{
        width: 'min(560px, 95vw)', height: '100vh',
        background: '#fff', display: 'flex', flexDirection: 'column',
        boxShadow: '-20px 0 60px rgba(0,0,0,.15)',
      }}>
        <div style={{
          padding: '18px 22px', borderBottom: '.5px solid ' + T.hairline,
          display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0,
        }}>
          <div style={{ fontSize: 26 }}>{step.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{step.label}</div>
            <div style={{ fontSize: 11.5, color: T.text4, marginTop: 1 }}>
              {module.label} · {plan === 'plus' ? '★ Plus' : 'Base'}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 8, border: 'none',
            background: T.sidebar, fontSize: 17, cursor: 'pointer', color: T.text3,
          }}>×</button>
        </div>

        <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>
          <StepForm step={step} draft={draft} setDraft={setDraft} apiStatus={apiStatus} />
        </div>

        <div style={{
          padding: '14px 22px', borderTop: '.5px solid ' + T.hairline,
          display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0,
        }}>
          <button onClick={onClose} style={{
            padding: '9px 16px', borderRadius: 8, border: '.5px solid ' + T.hairline,
            background: '#fff', color: T.text2, fontSize: 13, fontWeight: 500,
            cursor: 'pointer', fontFamily: FONT,
          }}>Cancelar</button>
          <button onClick={() => onSave(draft)} disabled={saving} style={{
            padding: '9px 18px', borderRadius: 8, border: 'none',
            background: T.dark, color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: saving ? 'wait' : 'pointer', fontFamily: FONT,
          }}>{saving ? 'Guardando...' : 'Guardar paso'}</button>
        </div>
      </div>
    </div>
  )
}



function StepForm({ step, draft, setDraft, apiStatus }) {
  if (step.id === 'trigger') return <TriggerForm draft={draft} setDraft={setDraft} />
  if (step.id === 'context') return <ContextForm draft={draft} setDraft={setDraft} />
  if (step.id === 'database') return <DatabaseForm draft={draft} setDraft={setDraft} />
  if (step.id === 'orchestrator') return <OrchestratorForm draft={draft} setDraft={setDraft} />
  if (step.id === 'apis') return <ApisForm draft={draft} setDraft={setDraft} apiStatus={apiStatus} />
  if (step.id === 'validator') return <ValidatorForm draft={draft} setDraft={setDraft} />
  if (step.id === 'output') return <OutputForm draft={draft} setDraft={setDraft} />
  return null
}

function TriggerForm({ draft, setDraft }) {
  const types = draft.types || []
  function toggle(id) {
    const next = types.includes(id) ? types.filter(x => x !== id) : [...types, id]
    setDraft({ ...draft, types: next })
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Toggle label="Step habilitado" value={draft.enabled !== false} onChange={v => setDraft({ ...draft, enabled: v })} />
      <SectionHeader title="Cómo se invoca Vera" subtitle="Activa los modos por los que Vera entra en acción en este módulo" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {TRIGGER_TYPES.map(t => {
          const active = types.includes(t.id)
          return (
            <button key={t.id} onClick={() => toggle(t.id)} style={{
              padding: '12px 14px', borderRadius: 9, fontFamily: FONT, textAlign: 'left',
              border: active ? '1.5px solid ' + T.green : '.5px solid ' + T.hairline,
              background: active ? 'rgba(52,199,89,.05)' : '#fff', cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: active ? T.green : T.hairline }} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>{t.label}</span>
              </div>
              <div style={{ fontSize: 11, color: T.text4, marginLeft: 15 }}>{t.desc}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ContextForm({ draft, setDraft }) {
  const sources = draft.sources || []
  function toggle(id) {
    const next = sources.includes(id) ? sources.filter(x => x !== id) : [...sources, id]
    setDraft({ ...draft, sources: next })
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Toggle label="Step habilitado" value={draft.enabled !== false} onChange={v => setDraft({ ...draft, enabled: v })} />
      <SectionHeader title="Fuentes de contexto" subtitle="Qué información recoge Vera de la pantalla" />
      <ChipGrid items={CONTEXT_SOURCES} selected={sources} onToggle={toggle} />
      <Field label={'Máximo de caracteres (' + (draft.max_chars || 2000) + ')'}>
        <input type="range" min="500" max="8000" step="500" value={draft.max_chars || 2000}
          onChange={e => setDraft({ ...draft, max_chars: parseInt(e.target.value) })}
          style={{ width: '100%' }} />
      </Field>
    </div>
  )
}

function DatabaseForm({ draft, setDraft }) {
  const dbs = draft.databases || []
  function toggle(id) {
    const next = dbs.includes(id) ? dbs.filter(x => x !== id) : [...dbs, id]
    setDraft({ ...draft, databases: next })
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Toggle label="Step habilitado" value={draft.enabled !== false} onChange={v => setDraft({ ...draft, enabled: v })} />
      <SectionHeader title="Motores de base de datos" subtitle="Activa los motores que Vera puede consultar en este módulo" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ALL_DATABASES.map(db => {
          const active = dbs.includes(db.id)
          return (
            <button key={db.id} onClick={() => toggle(db.id)} style={{
              padding: '12px 14px', borderRadius: 9, fontFamily: FONT, textAlign: 'left',
              border: active ? '1.5px solid ' + T.green : '.5px solid ' + T.hairline,
              background: active ? 'rgba(52,199,89,.05)' : '#fff', cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 18 }}>{db.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{db.label}</span>
                <div style={{ flex: 1 }} />
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: active ? T.green : T.hairline }} />
              </div>
              <div style={{ fontSize: 11, color: T.text4, marginLeft: 28, lineHeight: 1.45 }}>{db.desc}</div>
            </button>
          )
        })}
      </div>
      <Field label={'Máximo de filas por consulta SQL (' + (draft.max_rows_per_query || 100) + ')'}>
        <input type="range" min="10" max="1000" step="10" value={draft.max_rows_per_query || 100}
          onChange={e => setDraft({ ...draft, max_rows_per_query: parseInt(e.target.value) })}
          style={{ width: '100%' }} />
      </Field>
    </div>
  )
}

function ApisForm({ draft, setDraft, apiStatus }) {
  const active = draft.active || []
  function toggle(id) {
    const next = active.includes(id) ? active.filter(x => x !== id) : [...active, id]
    setDraft({ ...draft, active: next })
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Toggle label="APIs externas habilitadas" value={draft.enabled !== false} onChange={v => setDraft({ ...draft, enabled: v })} />
      <SectionHeader title="Proveedores de IA" subtitle="Punto verde = API key configurada" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {ALL_APIS.map(api => {
          const isActive = active.includes(api.id)
          const isConnected = apiStatus[api.id]
          return (
            <button key={api.id} onClick={() => toggle(api.id)} style={{
              padding: '10px 12px', borderRadius: 8, fontFamily: FONT, textAlign: 'left',
              border: isActive ? '1.5px solid ' + T.green : '.5px solid ' + T.hairline,
              background: isActive ? 'rgba(52,199,89,.05)' : '#fff', cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: isConnected ? T.green : T.red }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{api.label}</span>
              </div>
              <div style={{ fontSize: 10, color: T.text4 }}>
                {isConnected ? (isActive ? 'Activa en flujo' : 'Conectada') : 'Sin API key'}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function OrchestratorForm({ draft, setDraft }) {
  const types = draft.question_types || []
  function updateType(i, patch) { const n = [...types]; n[i] = { ...n[i], ...patch }; setDraft({ ...draft, question_types: n }) }
  function deleteType(i) { setDraft({ ...draft, question_types: types.filter((_, idx) => idx !== i) }) }
  function addType() {
    setDraft({ ...draft, question_types: [...types, {
      id: 'nuevo_' + Date.now(), color: 'purple', label: 'Nuevo tipo',
      description: '', model_primary: 'claude', model_fallback: 'claude-haiku',
    }]})
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Toggle label="Step habilitado" value={draft.enabled !== false} onChange={v => setDraft({ ...draft, enabled: v })} />
      <Field label="Modelo clasificador (decide a qué tipo pertenece la pregunta)">
        <select value={draft.classifier_model || 'claude-haiku'}
          onChange={e => setDraft({ ...draft, classifier_model: e.target.value })} style={inputStyle}>
          {MODEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Field>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <SectionHeader title={'Tipos de pregunta (' + types.length + ')'} subtitle="Cada tipo usa un modelo distinto" inline />
          <button onClick={addType} style={{
            padding: '5px 10px', borderRadius: 6, border: '.5px solid ' + T.hairline,
            background: '#fff', fontSize: 11.5, color: T.dark, fontWeight: 600, cursor: 'pointer', fontFamily: FONT,
          }}>+ Añadir tipo</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {types.map((t, i) => <TypeCard key={i} type={t} onChange={p => updateType(i, p)} onDelete={() => deleteType(i)} />)}
        </div>
      </div>
    </div>
  )
}

function TypeCard({ type, onChange, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const c = TYPE_COLOR_MAP[type.color] || T.text3
  return (
    <div style={{ border: '.5px solid ' + T.hairline, borderRadius: 9, background: '#fff', overflow: 'hidden' }}>
      <div onClick={() => setExpanded(e => !e)} style={{
        padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
        borderBottom: expanded ? '.5px solid ' + T.hairline : 'none',
      }}>
        <div style={{ width: 9, height: 9, borderRadius: '50%', background: c, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>{type.label}</div>
          <div style={{ fontSize: 10.5, color: T.text4 }}>→ {type.model_primary}</div>
        </div>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.text4} strokeWidth="2.5"
          style={{ transition: 'transform .2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      {expanded && (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, background: T.sidebar }}>
          <Field label="Nombre"><input value={type.label || ''} onChange={e => onChange({ label: e.target.value })} style={inputStyle} /></Field>
          <Field label="Descripción"><input value={type.description || ''} onChange={e => onChange({ description: e.target.value })} style={inputStyle} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Modelo principal">
              <select value={type.model_primary || 'claude'} onChange={e => onChange({ model_primary: e.target.value })} style={inputStyle}>
                {MODEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Fallback">
              <select value={type.model_fallback || 'claude-haiku'} onChange={e => onChange({ model_fallback: e.target.value })} style={inputStyle}>
                {MODEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Color">
            <div style={{ display: 'flex', gap: 6 }}>
              {['green','yellow','blue','orange','red','purple'].map(col => (
                <button key={col} onClick={() => onChange({ color: col })} style={{
                  width: 22, height: 22, borderRadius: 6, background: TYPE_COLOR_MAP[col],
                  border: type.color === col ? '2px solid ' + T.text : 'none', cursor: 'pointer',
                }} />
              ))}
            </div>
          </Field>
          <button onClick={onDelete} style={{
            alignSelf: 'flex-start', padding: '5px 10px', borderRadius: 6,
            border: '.5px solid ' + T.red, background: '#fff', color: T.red,
            fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: FONT,
          }}>Eliminar tipo</button>
        </div>
      )}
    </div>
  )
}

function ValidatorForm({ draft, setDraft }) {
  const enabledRules = (draft.rules || []).filter(r => r.enabled !== false).map(r => r.type)
  function toggle(id) {
    const existing = (draft.rules || []).find(r => r.type === id)
    let newRules
    if (existing) newRules = draft.rules.map(r => r.type === id ? { ...r, enabled: !(r.enabled !== false) } : r)
    else newRules = [...(draft.rules || []), { type: id, enabled: true }]
    setDraft({ ...draft, rules: newRules })
  }
  const crossEnabled = enabledRules.includes('cross_ai_validation')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Toggle label="Step habilitado" value={draft.enabled !== false} onChange={v => setDraft({ ...draft, enabled: v })} />
      <SectionHeader title="Reglas de validación" subtitle="Chequeos antes de mostrar la respuesta" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {VALIDATOR_RULES.map(rule => {
          const active = enabledRules.includes(rule.id)
          return (
            <button key={rule.id} onClick={() => toggle(rule.id)} style={{
              padding: '12px 14px', borderRadius: 9, fontFamily: FONT, textAlign: 'left',
              border: active ? '1.5px solid ' + T.green : '.5px solid ' + T.hairline,
              background: active ? 'rgba(52,199,89,.05)' : '#fff', cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: active ? T.green : T.hairline }} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>{rule.label}</span>
              </div>
              <div style={{ fontSize: 11, color: T.text4, marginLeft: 16 }}>{rule.desc}</div>
            </button>
          )
        })}
      </div>
      {crossEnabled && (
        <div style={{
          padding: 14, background: 'rgba(79,70,229,.05)', borderRadius: 9,
          border: '.5px solid rgba(79,70,229,.2)', marginTop: 8,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.dark, marginBottom: 8 }}>
            Configuración Cross-AI
          </div>
          <Field label="Modelo revisor (verifica la respuesta del orquestador)">
            <select value={draft.cross_ai_reviewer || 'openai'}
              onChange={e => setDraft({ ...draft, cross_ai_reviewer: e.target.value })} style={inputStyle}>
              {MODEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <div style={{ marginTop: 10 }}>
            <Field label="Modo de validación">
              <select value={draft.cross_ai_mode || 'flag_disagreement'}
                onChange={e => setDraft({ ...draft, cross_ai_mode: e.target.value })} style={inputStyle}>
                <option value="flag_disagreement">Marcar si hay desacuerdo</option>
                <option value="require_consensus">Requerir consenso (rechaza si difieren)</option>
                <option value="merge_answers">Fusionar ambas respuestas</option>
                <option value="reviewer_wins">El revisor sobreescribe si discrepa</option>
              </select>
            </Field>
          </div>
        </div>
      )}
    </div>
  )
}

function OutputForm({ draft, setDraft }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Toggle label="Step habilitado" value={draft.enabled !== false} onChange={v => setDraft({ ...draft, enabled: v })} />
      <Field label="Formato de respuesta">
        <select value={draft.format || 'stream'} onChange={e => setDraft({ ...draft, format: e.target.value })} style={inputStyle}>
          {OUTPUT_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </Field>
      <Field label="Idioma">
        <select value={draft.language || 'es'} onChange={e => setDraft({ ...draft, language: e.target.value })} style={inputStyle}>
          <option value="es">Español</option>
          <option value="en">Inglés</option>
          <option value="ca">Catalán</option>
          <option value="fr">Francés</option>
        </select>
      </Field>
      <Field label="Tono">
        <select value={draft.tone || 'professional'} onChange={e => setDraft({ ...draft, tone: e.target.value })} style={inputStyle}>
          <option value="professional">Profesional</option>
          <option value="casual">Casual / cercano</option>
          <option value="technical">Técnico / preciso</option>
          <option value="executive">Ejecutivo / breve</option>
        </select>
      </Field>
    </div>
  )
}

function Toggle({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
      <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{label}</span>
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

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: T.text4, fontWeight: 600, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      {children}
    </div>
  )
}

function SectionHeader({ title, subtitle, inline }) {
  return (
    <div style={{ marginTop: inline ? 0 : 4 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text, marginBottom: subtitle ? 2 : 0 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 11, color: T.text4 }}>{subtitle}</div>}
    </div>
  )
}

function ChipGrid({ items, selected, onToggle }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
      {items.map(item => {
        const active = selected.includes(item.id)
        return (
          <button key={item.id} onClick={() => onToggle(item.id)} style={{
            padding: '8px 12px', borderRadius: 7, fontFamily: FONT, textAlign: 'left',
            border: active ? '1.5px solid ' + T.green : '.5px solid ' + T.hairline,
            background: active ? 'rgba(52,199,89,.05)' : '#fff',
            cursor: 'pointer', fontSize: 12, fontWeight: 500,
            color: active ? T.text : T.text2,
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: active ? T.green : T.hairline, flexShrink: 0 }} />
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '8px 10px', borderRadius: 7,
  border: '.5px solid rgba(0,0,0,.1)', fontSize: 12.5, fontFamily: FONT,
  background: '#fff', color: '#1d1d1f', outline: 'none', boxSizing: 'border-box',
}
