'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { T } from './tokens'
import { useVeraDrawer, closeVeraDrawer } from './useVeraStore'

import { API_BASE as API } from '@/lib/api'

/**
 * VeraDrawer — single instance global drawer.
 * Se abre desde cualquier sitio con openVeraDrawer({kpi, modulo, suggestions}).
 *
 * Si se le pasa la prop `controlled` (open, onClose, etc), funciona como antes.
 */
export default function VeraDrawer({
  open: openProp,
  onClose: onCloseProp,
  token: tokenProp,
  modulo: moduloProp,
  suggestions: suggestionsProp,
}) {
  const storeState = useVeraDrawer()
  const router = useRouter()

  // Modo controlado (legacy: módulos viejos pasan open/onClose por props)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : storeState.open
  const onClose = isControlled ? onCloseProp : closeVeraDrawer
  const modulo = isControlled ? moduloProp : storeState.modulo
  const suggestions = isControlled ? suggestionsProp : storeState.suggestions
  const kpi = isControlled ? null : storeState.kpi

  // Token: si no se pasa, leer de localStorage
  const [token, setToken] = useState(tokenProp || null)
  useEffect(() => {
    if (!tokenProp && typeof window !== 'undefined') {
      setToken(localStorage.getItem('vela_token'))
    }
  }, [tokenProp])

  // Status (plan, modelo, cuota)
  const [status, setStatus] = useState(null)
  useEffect(() => {
    if (!open || !token) return
    fetch(`${API}/api/vera/v2/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(s => setStatus(s))
      .catch(e => console.error('Error de red:', e))
  }, [open, token])

  // Chat
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  // Reset chat al cerrar
  useEffect(() => {
    if (!open) {
      setMsgs([])
      setInput('')
    }
  }, [open])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [msgs, loading])

  if (!open) return null

  const isPlus = status?.plan === 'plus'
  const isDegraded = status?.degraded
  const veraName = isPlus ? 'Vera Plus' : 'Vera'
  const headerColor = isPlus ? '#6366F1' : '#3D2BFF'
  const activeModel = status?.model_active_now?.display_name || ''

  // Sugerencias finales (priorizar contextuales por kpi, después módulo, después default)
  let finalSuggestions = suggestions || []
  if (kpi && (!suggestions || suggestions.length === 0)) {
    const label = kpi.label || 'esta métrica'
    finalSuggestions = [
      `¿Qué explica el valor de ${label}?`,
      `¿Cómo se compara con periodos anteriores?`,
      `¿Qué riesgos veo en ${label}?`,
    ]
  }
  if (!finalSuggestions.length) {
    finalSuggestions = [
      '¿Cuál es mi margen este mes?',
      '¿Qué producto vende más?',
      '¿Cuánto gasté en nóminas?',
    ]
  }

  async function send(messageText) {
    const text = (messageText || input).trim()
    if (!text || loading || !token) return
    setInput('')
    setLoading(true)
    setMsgs(prev => [...prev, { role: 'user', content: text }])

    try {
      // Crear conv efímera
      const convRes = await fetch(`${API}/api/vera/v2/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: text.slice(0, 60), module: modulo || null }),
      })
      if (!convRes.ok) throw new Error('No se pudo iniciar la conversación')
      const { id: convId } = await convRes.json()

      // Si hay contexto KPI, prefijar el mensaje
      let finalMsg = text
      if (kpi) {
        finalMsg = `Contexto: estoy mirando "${kpi.label}" con valor ${kpi.value}${kpi.hint ? ' (' + kpi.hint + ')' : ''}.\n\nPregunta: ${text}`
      }

      // Stream
      const r = await fetch(`${API}/api/vera/v2/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ conversation_id: convId, message: finalMsg }),
      })

      if (!r.ok || !r.body) throw new Error('Error de red')

      setMsgs(prev => [...prev, { role: 'assistant', content: '' }])
      const reader = r.body.getReader()
      const dec = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'chunk' && data.text) {
              setMsgs(prev => {
                const last = prev[prev.length - 1]
                if (last && last.role === 'assistant') {
                  return [...prev.slice(0, -1), { ...last, content: last.content + data.text }]
                }
                return prev
              })
            }
          } catch {}
        }
      }
      // Refrescar status (cuota cambió)
      fetch(`${API}/api/vera/v2/status`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null).then(s => s && setStatus(s)).catch(e => console.error('Error de red:', e))
    } catch (err) {
      setMsgs(prev => [...prev, { role: 'assistant', content: 'Error: ' + (err.message || 'desconocido'), error: true }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        display: 'flex', justifyContent: 'flex-end',
        background: 'rgba(0,0,0,.2)', backdropFilter: 'blur(2px)',
      }}
    >
      <div style={{
        width: 'min(480px, 94vw)', height: '100vh',
        background: '#fff', borderLeft: `.5px solid ${T.hairline}`,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-16px 0 48px rgba(0,0,0,.12)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: `.5px solid ${T.hairline}`,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: isPlus
                ? 'linear-gradient(135deg,#6366F1,#3D2BFF)'
                : 'linear-gradient(135deg,#3D2BFF,#A5B1FF)',
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" fill="#fff"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text, letterSpacing: -0.2 }}>
                {veraName}
              </div>
              <div style={{ fontSize: 11.5, color: T.text4, marginTop: 2 }}>
                {kpi ? (
                  <>Sobre: <strong style={{ color: T.text2 }}>{kpi.label}</strong> · {kpi.value}</>
                ) : modulo ? (
                  <>{modulo.charAt(0).toUpperCase() + modulo.slice(1)} · IA central</>
                ) : (
                  'IA central'
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: isPlus ? '#fff' : headerColor,
              background: isPlus ? '#6366F1' : 'rgba(61,43,255,.1)',
              padding: '3px 10px', borderRadius: 999, letterSpacing: 0.4,
            }}>
              {isPlus ? '★ PLUS' : 'BASE'}
            </span>
            <button onClick={onClose} style={{
              width: 30, height: 30, borderRadius: 8,
              border: 'none', background: T.sidebar, color: T.text3,
              cursor: 'pointer', fontSize: 18,
            }}>×</button>
          </div>
        </div>

        {/* Banner degradación */}
        {isDegraded && (
          <div style={{
            background: '#fef3c7', borderBottom: '1px solid #fbbf24',
            padding: '8px 20px', fontSize: 11.5, color: '#92400e',
            flexShrink: 0,
          }}>
            <strong>Modo básico</strong> · usando {activeModel}. {' '}
            <a href="/vera-plus" style={{ color: '#6366F1', fontWeight: 700, textDecoration: 'none' }}>
              Quitar el límite →
            </a>
          </div>
        )}

        {/* Cuerpo: mensajes o sugerencias */}
        <div ref={scrollRef} style={{
          flex: 1, overflow: 'auto', padding: '16px 20px',
        }}>
          {msgs.length === 0 ? (
            <>
              {kpi && (
                <div style={{
                  padding: '12px 14px', marginBottom: 16,
                  background: 'rgba(61,43,255,.04)',
                  border: `.5px solid rgba(61,43,255,.18)`,
                  borderRadius: 10,
                  fontSize: 12.5, color: T.text2, lineHeight: 1.5,
                }}>
                  Pregúntame cualquier cosa sobre <strong>{kpi.label}</strong> · {kpi.value}.
                </div>
              )}

              <div style={{
                fontSize: 10.5, fontWeight: 700, color: T.text4,
                textTransform: 'uppercase', letterSpacing: 0.5,
                marginBottom: 10,
              }}>
                {kpi ? 'Profundizar' : 'Sugerencias'}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {finalSuggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => send(s)}
                    style={{
                      textAlign: 'left',
                      padding: '10px 14px',
                      background: T.sidebar,
                      border: `.5px solid ${T.hairline}`,
                      borderRadius: 10,
                      fontSize: 13, color: T.text2,
                      cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'all .12s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#fff'
                      e.currentTarget.style.borderColor = headerColor
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = T.sidebar
                      e.currentTarget.style.borderColor = T.hairline
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {msgs.map((m, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                }}>
                  <div style={{
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: 12,
                    fontSize: 13, lineHeight: 1.55,
                    background: m.role === 'user' ? headerColor : T.sidebar,
                    color: m.role === 'user' ? '#fff' : (m.error ? '#dc2626' : T.text),
                    whiteSpace: 'pre-wrap',
                  }}>
                    {m.content || (loading && m.role === 'assistant' && i === msgs.length - 1 ? '…' : '')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer: input + info modelo */}
        <div style={{ padding: '12px 20px', borderTop: `.5px solid ${T.hairline}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Escribe tu pregunta…"
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 10,
                border: `.5px solid ${T.hairline}`,
                fontSize: 13, fontFamily: 'inherit',
                outline: 'none', background: T.sidebar, color: T.text,
              }}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              style={{
                padding: '10px 16px',
                borderRadius: 10, border: 'none',
                background: loading || !input.trim() ? T.sidebar : headerColor,
                color: loading || !input.trim() ? T.text4 : '#fff',
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {loading ? '…' : '↑'}
            </button>
          </div>

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: 10, fontSize: 10.5, color: T.text4,
          }}>
            <div>
              {activeModel}
              {status && !isPlus && (
                <> · {status.usage_pct}% usado</>
              )}
            </div>
              <a
              href="/vera"
              style={{ color: headerColor, fontWeight: 600, textDecoration: 'none' }}
            >
              Abrir chat completo →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
