'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { T, FONT } from '@/components/ui/tokens'
import ReactFlow, {
  Background, Controls, MiniMap, useNodesState, useEdgesState,
  addEdge, Handle, Position, MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { API_BASE as API } from '@/lib/api'
const VERA_BLUE = '#3D2BFF'

// ─────────────────────────────────────────────────────────
// NODOS PERSONALIZADOS
// ─────────────────────────────────────────────────────────

function TriggerNode({ data }) {
  return (
    <div style={{
      background: '#fff', border: `1.5px solid ${VERA_BLUE}`,
      borderRadius: 10, padding: 12, minWidth: 180,
      boxShadow: '0 2px 8px rgba(61,43,255,.1)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: 4, background: VERA_BLUE,
          display: 'grid', placeItems: 'center',
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, color: VERA_BLUE, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Entrada
        </span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#1d1d1f', marginBottom: 2 }}>
        {data.label || 'Pregunta usuario'}
      </div>
      {data.keywords && (
        <div style={{ fontSize: 11, color: '#666' }}>
          Keywords: <code style={{ background: '#f5f5f5', padding: '1px 4px', borderRadius: 3 }}>{data.keywords}</code>
        </div>
      )}
      {data.module && (
        <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
          Módulo: <strong>{data.module}</strong>
        </div>
      )}
      <Handle type="source" position={Position.Right} style={{ background: VERA_BLUE }} />
    </div>
  )
}

function ConditionNode({ data }) {
  return (
    <div style={{
      background: '#FFFBEB', border: `1.5px solid #F59E0B`,
      borderRadius: 10, padding: 12, minWidth: 180,
    }}>
      <Handle type="target" position={Position.Left} style={{ background: '#F59E0B' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#92400E', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Condición
        </span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#1d1d1f' }}>
        {data.label || 'Si...'}
      </div>
      <Handle type="source" position={Position.Right} id="true" style={{ background: '#10B981', top: '35%' }} />
      <Handle type="source" position={Position.Right} id="false" style={{ background: '#EF4444', top: '65%' }} />
    </div>
  )
}

function ModelNode({ data }) {
  const colors = {
    claude: { bg: '#F0EEFF', border: '#3D2BFF', text: '#3730A3' },
    openai: { bg: '#F0FAF4', border: '#10A37F', text: '#0F6E56' },
    gemini: { bg: '#FFF7ED', border: '#EA580C', text: '#9A3412' },
    perplexity: { bg: '#F5F3FF', border: '#3D2BFF', text: '#4C1D95' },
  }
  const c = colors[data.provider] || colors.claude
  return (
    <div style={{
      background: c.bg, border: `1.5px solid ${c.border}`,
      borderRadius: 10, padding: 12, minWidth: 180,
    }}>
      <Handle type="target" position={Position.Left} style={{ background: c.border }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: c.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Modelo IA
        </span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>
        {data.label}
      </div>
      <div style={{ fontSize: 11, color: c.text, opacity: 0.7, marginTop: 2 }}>
        {data.model_id || data.provider}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: c.border }} />
    </div>
  )
}

function StrategyNode({ data }) {
  const labels = {
    cascade: 'Cascade — Prueba uno, si falla el siguiente',
    parallel: 'Paralelo — Llama a todos a la vez',
    specialist: 'Especialista — El primero responde',
  }
  return (
    <div style={{
      background: '#F5F3FF', border: `1.5px solid #3D2BFF`,
      borderRadius: 10, padding: 12, minWidth: 200,
    }}>
      <Handle type="target" position={Position.Left} style={{ background: '#3D2BFF' }} />
      <div style={{ fontSize: 10, fontWeight: 600, color: '#4C1D95', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
        Estrategia
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#4C1D95' }}>
        {data.strategy || 'cascade'}
      </div>
      <div style={{ fontSize: 11, color: '#6B21A8', marginTop: 4 }}>
        {labels[data.strategy] || ''}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#3D2BFF' }} />
    </div>
  )
}

function OutputNode({ data }) {
  return (
    <div style={{
      background: '#1d1d1f', border: `1.5px solid #000`,
      borderRadius: 10, padding: 12, minWidth: 160, color: '#fff',
    }}>
      <Handle type="target" position={Position.Left} style={{ background: '#1d1d1f' }} />
      <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
        Salida
      </div>
      <div style={{ fontSize: 13, fontWeight: 500 }}>
        {data.label || 'Respuesta al usuario'}
      </div>
    </div>
  )
}

const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  model: ModelNode,
  strategy: StrategyNode,
  output: OutputNode,
}

// ─────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────

export default function VeraRoutingEditor({ token }) {
  const router = useRouter()
  const [rules, setRules] = useState([])
  const [activeRule, setActiveRule] = useState(null)
  const [models, setModels] = useState([])
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState(null)
  const [view, setView] = useState('editor') // editor | logs | stats
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNode, setSelectedNode] = useState(null)
  const [showPaletteModal, setShowPaletteModal] = useState(false)
  const [creatingRule, setCreatingRule] = useState(false)
  const [newRuleName, setNewRuleName] = useState('')

  const getToken = () => token || (typeof window !== 'undefined' ? localStorage.getItem('vela_token') : null)
  const h = () => ({ Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' })

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    if (activeRule) buildFlowFromRule(activeRule)
  }, [activeRule])

  async function loadAll() {
    await Promise.all([loadRules(), loadModels(), loadStats()])
  }

  async function loadRules() {
    try {
      const r = await fetch(`${API}/api/backoffice/vera-routing/rules`, { headers: h() })
      if (r.ok) {
        const d = await r.json()
        setRules(d)
        if (d.length && !activeRule) setActiveRule(d[0])
      }
    } catch (e) { console.error(e) }
  }

  async function loadModels() {
    try {
      const r = await fetch(`${API}/api/backoffice/vera-routing/models`, { headers: h() })
      if (r.ok) setModels(await r.json())
    } catch { }
  }

  async function loadLogs() {
    try {
      const r = await fetch(`${API}/api/backoffice/vera-routing/logs?limit=30`, { headers: h() })
      if (r.ok) setLogs(await r.json())
    } catch { }
  }

  async function loadStats() {
    try {
      const r = await fetch(`${API}/api/backoffice/vera-routing/stats`, { headers: h() })
      if (r.ok) setStats(await r.json())
    } catch { }
  }

  function buildFlowFromRule(rule) {
    const ruleModels = Array.isArray(rule.models) ? rule.models : []

    const newNodes = [
      {
        id: 'trigger', type: 'trigger', position: { x: 50, y: 150 },
        data: {
          label: rule.name,
          keywords: rule.trigger_keywords,
          module: rule.module,
        },
      },
      {
        id: 'strategy', type: 'strategy', position: { x: 320, y: 150 },
        data: { strategy: rule.strategy },
      },
      ...ruleModels.map((m, i) => {
        const cfg = models.find(mm => mm.provider === m) || { display_name: m, model_id: m, provider: m }
        return {
          id: `model-${m}`, type: 'model', position: { x: 600, y: 50 + i * 110 },
          data: {
            label: cfg.display_name,
            provider: m,
            model_id: cfg.model_id,
          },
        }
      }),
      {
        id: 'output', type: 'output',
        position: { x: 880, y: 50 + (ruleModels.length - 1) * 55 },
        data: { label: 'Respuesta unificada' },
      },
    ]

    const newEdges = [
      {
        id: 'e-trigger-strategy', source: 'trigger', target: 'strategy',
        animated: true, style: { stroke: VERA_BLUE, strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: VERA_BLUE },
      },
      ...ruleModels.map(m => ({
        id: `e-strategy-${m}`, source: 'strategy', target: `model-${m}`,
        animated: rule.strategy === 'parallel',
        style: { stroke: '#3D2BFF', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#3D2BFF' },
      })),
      ...ruleModels.map(m => ({
        id: `e-${m}-output`, source: `model-${m}`, target: 'output',
        style: { stroke: '#666', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#666' },
      })),
    ]

    setNodes(newNodes)
    setEdges(newEdges)
  }

  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: VERA_BLUE, strokeWidth: 2 } }, eds))
  }, [setEdges])

  async function saveRule() {
    if (!activeRule) return
    const ruleModels = nodes.filter(n => n.type === 'model').map(n => n.data.provider)
    const strategyNode = nodes.find(n => n.type === 'strategy')
    const triggerNode = nodes.find(n => n.type === 'trigger')

    try {
      const r = await fetch(`${API}/api/backoffice/vera-routing/rules/${activeRule.id}`, {
        method: 'PUT', headers: h(),
        body: JSON.stringify({
          name: triggerNode?.data.label || activeRule.name,
          trigger_keywords: triggerNode?.data.keywords || activeRule.trigger_keywords,
          module: triggerNode?.data.module || activeRule.module,
          strategy: strategyNode?.data.strategy || 'cascade',
          models: ruleModels,
        }),
      })
      if (r.ok) {
        alert('Regla guardada correctamente')
        loadRules()
      } else {
        alert('Error al guardar')
      }
    } catch (e) { alert('Error: ' + e.message) }
  }

  async function deleteRule(id) {
    if (!confirm('¿Eliminar esta regla?')) return
    try {
      await fetch(`${API}/api/backoffice/vera-routing/rules/${id}`, {
        method: 'DELETE', headers: h(),
      })
      setActiveRule(null)
      loadRules()
    } catch { }
  }

  async function createRule() {
    if (!newRuleName.trim()) return
    try {
      const r = await fetch(`${API}/api/backoffice/vera-routing/rules`, {
        method: 'POST', headers: h(),
        body: JSON.stringify({
          name: newRuleName.trim(),
          strategy: 'cascade',
          models: ['claude'],
          priority: 50,
          is_active: true,
        }),
      })
      if (r.ok) {
        const d = await r.json()
        await loadRules()
        const newRule = await (await fetch(`${API}/api/backoffice/vera-routing/rules`, { headers: h() })).json()
        const created = newRule.find(rr => rr.id === d.id)
        if (created) setActiveRule(created)
        setCreatingRule(false)
        setNewRuleName('')
      }
    } catch (e) { alert('Error: ' + e.message) }
  }

  async function toggleModel(provider, isActive) {
    try {
      await fetch(`${API}/api/backoffice/vera-routing/models/${provider}`, {
        method: 'PUT', headers: h(),
        body: JSON.stringify({ is_active: !isActive }),
      })
      loadModels()
    } catch { }
  }

  function addModelToFlow(provider) {
    const cfg = models.find(m => m.provider === provider) || { display_name: provider, model_id: provider }
    const existing = nodes.filter(n => n.type === 'model')
    const newNode = {
      id: `model-${provider}-${Date.now()}`,
      type: 'model',
      position: { x: 600, y: 50 + existing.length * 110 },
      data: { label: cfg.display_name, provider, model_id: cfg.model_id },
    }
    setNodes([...nodes, newNode])
  }

  return (
    <div style={{
      height: 'calc(100vh - 80px)', background: T.bg, display: 'flex',
      flexDirection: 'column', overflow: 'hidden',
      fontFamily: FONT, WebkitFontSmoothing: 'antialiased',
      borderRadius: 8,
    }}>
      <style>{`*{box-sizing:border-box}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:999px}input:focus{outline:none}.react-flow__attribution{display:none}`}</style>
        {/* HEADER */}
        <header style={{
          height: 56, background: 'rgba(251,251,253,.85)',
          backdropFilter: 'saturate(180%) blur(20px)',
          borderBottom: `.5px solid ${T.hairline}`,
          display: 'flex', alignItems: 'center', padding: '0 24px',
          flexShrink: 0, gap: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'linear-gradient(135deg,#3D2BFF,#3D2BFF)',
              display: 'grid', placeItems: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" />
                <circle cx="6" cy="18" r="3" /><circle cx="18" cy="18" r="3" />
                <line x1="9" y1="6" x2="15" y2="6" /><line x1="6" y1="9" x2="6" y2="15" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text, lineHeight: 1.1 }}>
                Vera Routing Editor
              </div>
              <div style={{ fontSize: 11, color: T.text4, marginTop: 2 }}>
                Configura cómo Vera enruta cada pregunta a los modelos IA
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{
            marginLeft: 24, display: 'flex', gap: 2,
            background: T.sidebar, borderRadius: 8, padding: 3,
          }}>
            {[
              { k: 'editor', label: 'Editor' },
              { k: 'logs', label: 'Logs', onClick: loadLogs },
              { k: 'stats', label: 'Stats' },
            ].map(t => (
              <button key={t.k}
                onClick={() => { setView(t.k); t.onClick?.() }}
                style={{
                  padding: '5px 12px', borderRadius: 6,
                  background: view === t.k ? '#fff' : 'transparent',
                  color: view === t.k ? T.text : T.text3,
                  border: 'none',
                  boxShadow: view === t.k ? '0 1px 2px rgba(0,0,0,.06)' : 'none',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}>{t.label}</button>
            ))}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {view === 'editor' && activeRule && (
              <>
                <button onClick={saveRule} style={{
                  padding: '6px 14px', borderRadius: 8,
                  background: VERA_BLUE, color: '#fff', border: 'none',
                  fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}>Guardar regla</button>
              </>
            )}
          </div>
        </header>

        {/* CONTENIDO */}
        {view === 'editor' && (
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '260px 1fr 260px', overflow: 'hidden' }}>

            {/* LEFT: Reglas */}
            <div style={{
              borderRight: `.5px solid ${T.hairline}`,
              background: T.sidebar,
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
              <div style={{ padding: 12, borderBottom: `.5px solid ${T.hairline}` }}>
                {creatingRule ? (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input
                      autoFocus value={newRuleName}
                      onChange={e => setNewRuleName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') createRule()
                        if (e.key === 'Escape') { setCreatingRule(false); setNewRuleName('') }
                      }}
                      placeholder="Nombre de la regla"
                      style={{
                        flex: 1, padding: '7px 10px', borderRadius: 6,
                        border: `.5px solid ${VERA_BLUE}`, fontSize: 12,
                        fontFamily: 'inherit',
                      }}
                    />
                    <button onClick={createRule} style={{
                      padding: '6px 10px', borderRadius: 6,
                      background: VERA_BLUE, color: '#fff', border: 'none',
                      fontSize: 11, fontWeight: 500, cursor: 'pointer',
                    }}>OK</button>
                  </div>
                ) : (
                  <button onClick={() => setCreatingRule(true)} style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    background: '#fff', color: T.text,
                    border: `.5px solid ${T.hairline}`,
                    fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>+ Nueva regla</button>
                )}
              </div>

              <div style={{
                fontSize: 10, color: T.text4, fontWeight: 500,
                textTransform: 'uppercase', letterSpacing: 0.5,
                padding: '10px 14px 6px',
              }}>Reglas activas ({rules.length})</div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
                {rules.map(r => (
                  <div key={r.id}
                    onClick={() => setActiveRule(r)}
                    style={{
                      padding: '10px 12px', borderRadius: 7, cursor: 'pointer',
                      marginBottom: 4,
                      background: activeRule?.id === r.id ? '#fff' : 'transparent',
                      border: activeRule?.id === r.id ? `.5px solid ${VERA_BLUE}` : '.5px solid transparent',
                    }}
                    onMouseEnter={e => { if (activeRule?.id !== r.id) e.currentTarget.style.background = 'rgba(0,0,0,.03)' }}
                    onMouseLeave={e => { if (activeRule?.id !== r.id) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{
                      fontSize: 12.5, fontWeight: 500, color: T.text,
                      marginBottom: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.name}
                      </span>
                      {r.is_active && (
                        <span style={{ width: 6, height: 6, borderRadius: 999, background: '#10B981', flexShrink: 0, marginLeft: 6 }} />
                      )}
                    </div>
                    <div style={{ fontSize: 10.5, color: T.text4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ padding: '1px 6px', background: '#F3F4F6', borderRadius: 3 }}>
                        {r.strategy}
                      </span>
                      {r.models?.map(m => (
                        <span key={m} style={{ padding: '1px 6px', background: '#EFEDFF', color: '#3D2BFF', borderRadius: 3 }}>
                          {m}
                        </span>
                      ))}
                    </div>
                    {r.trigger_keywords && (
                      <div style={{ fontSize: 10, color: T.text4, marginTop: 4 }}>
                        kw: {r.trigger_keywords.substring(0, 30)}{r.trigger_keywords.length > 30 ? '…' : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* CENTER: React Flow Canvas */}
            <div style={{ background: '#FAFAFA', position: 'relative' }}>
              {activeRule ? (
                <ReactFlow
                  nodes={nodes} edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onNodeClick={(_, node) => setSelectedNode(node)}
                  nodeTypes={nodeTypes}
                  fitView
                  defaultEdgeOptions={{ animated: false }}
                >
                  <Background gap={20} size={1} color="#E5E5EA" />
                  <Controls showInteractive={false} />
                  <MiniMap nodeColor={n => {
                    if (n.type === 'trigger') return VERA_BLUE
                    if (n.type === 'model') return '#10B981'
                    if (n.type === 'strategy') return '#3D2BFF'
                    if (n.type === 'output') return '#1d1d1f'
                    return '#999'
                  }} />
                </ReactFlow>
              ) : (
                <div style={{
                  height: '100%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexDirection: 'column', gap: 12,
                  color: T.text4, fontSize: 13,
                }}>
                  <div>Selecciona una regla o crea una nueva</div>
                </div>
              )}
            </div>

            {/* RIGHT: Panel propiedades / modelos disponibles */}
            <div style={{
              borderLeft: `.5px solid ${T.hairline}`,
              background: T.sidebar,
              padding: 14, overflowY: 'auto',
              display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              {selectedNode && (
                <div style={{
                  background: '#fff', borderRadius: 10,
                  border: `.5px solid ${T.hairline}`, padding: 14,
                }}>
                  <div style={{ fontSize: 10, color: T.text4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                    Nodo seleccionado
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                    {selectedNode.type}
                  </div>

                  {selectedNode.type === 'trigger' && (
                    <>
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: 11, color: T.text3, display: 'block', marginBottom: 3 }}>Nombre</label>
                        <input
                          value={selectedNode.data.label || ''}
                          onChange={e => {
                            const v = e.target.value
                            setNodes(ns => ns.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, label: v } } : n))
                            setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, label: v } })
                          }}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: `.5px solid ${T.hairline}`, fontSize: 12, fontFamily: 'inherit' }}
                        />
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: 11, color: T.text3, display: 'block', marginBottom: 3 }}>Keywords (separadas por coma)</label>
                        <input
                          value={selectedNode.data.keywords || ''}
                          onChange={e => {
                            const v = e.target.value
                            setNodes(ns => ns.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, keywords: v } } : n))
                            setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, keywords: v } })
                          }}
                          placeholder="ej: iva,fiscal,impuestos"
                          style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: `.5px solid ${T.hairline}`, fontSize: 12, fontFamily: 'inherit' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: T.text3, display: 'block', marginBottom: 3 }}>Módulo (opcional)</label>
                        <select
                          value={selectedNode.data.module || ''}
                          onChange={e => {
                            const v = e.target.value
                            setNodes(ns => ns.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, module: v } } : n))
                            setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, module: v } })
                          }}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: `.5px solid ${T.hairline}`, fontSize: 12, fontFamily: 'inherit' }}
                        >
                          <option value="">— Cualquiera —</option>
                          <option value="contabilidad">Contabilidad</option>
                          <option value="ventas">Ventas</option>
                          <option value="clientes">Clientes</option>
                          <option value="dashboard">Dashboard</option>
                          <option value="fiscal">Fiscal</option>
                        </select>
                      </div>
                    </>
                  )}

                  {selectedNode.type === 'strategy' && (
                    <div>
                      <label style={{ fontSize: 11, color: T.text3, display: 'block', marginBottom: 3 }}>Estrategia</label>
                      <select
                        value={selectedNode.data.strategy || 'cascade'}
                        onChange={e => {
                          const v = e.target.value
                          setNodes(ns => ns.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, strategy: v } } : n))
                          setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, strategy: v } })
                        }}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: `.5px solid ${T.hairline}`, fontSize: 12, fontFamily: 'inherit' }}
                      >
                        <option value="cascade">Cascade — Prueba uno tras otro</option>
                        <option value="parallel">Paralelo — Todos a la vez</option>
                        <option value="specialist">Especialista — Primero responde</option>
                      </select>
                    </div>
                  )}

                  {selectedNode.type === 'model' && (
                    <div style={{ fontSize: 12, color: T.text2 }}>
                      Proveedor: <strong>{selectedNode.data.provider}</strong><br />
                      Modelo: <code>{selectedNode.data.model_id}</code>
                      <button onClick={() => {
                        setNodes(ns => ns.filter(n => n.id !== selectedNode.id))
                        setEdges(es => es.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id))
                        setSelectedNode(null)
                      }} style={{
                        marginTop: 10, padding: '5px 10px', borderRadius: 6,
                        background: 'transparent', border: `.5px solid ${T.red}`,
                        color: T.red, fontSize: 11, cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}>Quitar nodo</button>
                    </div>
                  )}
                </div>
              )}

              <div>
                <div style={{ fontSize: 10, color: T.text4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  Modelos disponibles
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {models.map(m => (
                    <div key={m.provider} style={{
                      background: '#fff', borderRadius: 8,
                      border: `.5px solid ${T.hairline}`,
                      padding: '10px 12px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{m.display_name}</span>
                        <button onClick={() => toggleModel(m.provider, m.is_active)} style={{
                          width: 28, height: 16, borderRadius: 999,
                          background: m.is_active ? '#10B981' : T.hairline,
                          border: 'none', cursor: 'pointer', position: 'relative',
                          transition: 'all .12s',
                        }}>
                          <span style={{
                            position: 'absolute', top: 2, left: m.is_active ? 14 : 2,
                            width: 12, height: 12, borderRadius: 999, background: '#fff',
                            transition: 'left .12s',
                          }} />
                        </button>
                      </div>
                      <div style={{ fontSize: 10, color: T.text4 }}>
                        {m.has_api_key ? '✓ API key configurada' : '✗ Sin API key'}
                      </div>
                      {activeRule && m.is_active && m.has_api_key && (
                        <button onClick={() => addModelToFlow(m.provider)} style={{
                          marginTop: 6, fontSize: 10, padding: '3px 8px',
                          background: 'rgba(61,43,255,.08)', color: VERA_BLUE,
                          border: 'none', borderRadius: 4, cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}>+ Añadir al flujo</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {activeRule && (
                <button onClick={() => deleteRule(activeRule.id)} style={{
                  padding: '8px', borderRadius: 8,
                  background: 'transparent', border: `.5px solid ${T.red}`,
                  color: T.red, fontSize: 12, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}>Eliminar regla</button>
              )}
            </div>
          </div>
        )}

        {view === 'logs' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `.5px solid ${T.hairline}` }}>
                  <th style={{ padding: 8, textAlign: 'left', color: T.text3, fontWeight: 500 }}>Fecha</th>
                  <th style={{ padding: 8, textAlign: 'left', color: T.text3, fontWeight: 500 }}>Pregunta</th>
                  <th style={{ padding: 8, textAlign: 'left', color: T.text3, fontWeight: 500 }}>Modelo</th>
                  <th style={{ padding: 8, textAlign: 'left', color: T.text3, fontWeight: 500 }}>Estrategia</th>
                  <th style={{ padding: 8, textAlign: 'right', color: T.text3, fontWeight: 500 }}>Latencia</th>
                  <th style={{ padding: 8, textAlign: 'right', color: T.text3, fontWeight: 500 }}>Tokens</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} style={{ borderBottom: `.5px solid ${T.hairline}` }}>
                    <td style={{ padding: 8, color: T.text3, fontSize: 11 }}>{l.created_at?.substring(0, 19)}</td>
                    <td style={{ padding: 8 }}>{l.question?.substring(0, 60)}{l.question?.length > 60 ? '…' : ''}</td>
                    <td style={{ padding: 8 }}>
                      <span style={{ padding: '1px 6px', background: '#EFEDFF', color: '#3D2BFF', borderRadius: 3, fontSize: 10 }}>
                        {l.winning_model || '—'}
                      </span>
                    </td>
                    <td style={{ padding: 8, color: T.text2 }}>{l.strategy_used}</td>
                    <td style={{ padding: 8, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{l.latency_ms}ms</td>
                    <td style={{ padding: 8, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{l.tokens_input + l.tokens_output}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: T.text4 }}>No hay logs todavía</div>
            )}
          </div>
        )}

        {view === 'stats' && stats && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {[
                { label: 'Peticiones 7d', val: stats.summary_7d?.total_requests },
                { label: 'Tokens 7d', val: stats.summary_7d?.total_tokens?.toLocaleString() },
                { label: 'Coste 7d', val: '$' + (stats.summary_7d?.total_cost_usd || 0).toFixed(4) },
                { label: 'Latencia media', val: stats.summary_7d?.avg_latency_ms + 'ms' },
              ].map((k, i) => (
                <div key={i} style={{
                  background: '#fff', borderRadius: 10,
                  border: `.5px solid ${T.hairline}`, padding: 14,
                }}>
                  <div style={{ fontSize: 10, color: T.text4, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{k.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: T.text }}>{k.val ?? '—'}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#fff', borderRadius: 10, border: `.5px solid ${T.hairline}`, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Por modelo</div>
              {stats.by_model?.map(m => (
                <div key={m.model} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `.5px solid ${T.hairline}` }}>
                  <span style={{ fontSize: 12 }}>{m.model}</span>
                  <span style={{ fontSize: 12, color: T.text3 }}>{m.count} peticiones · {m.avg_latency_ms}ms · ${m.cost}</span>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  )
}
