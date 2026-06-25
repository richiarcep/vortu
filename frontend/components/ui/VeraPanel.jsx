'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { T } from './tokens'
import { Card } from './primitives'

import { API_BASE as API } from '@/lib/api'

export default function VeraPanel({
  token,
  modulo = null,
  suggestions = [
    '¿Cuál es mi margen este mes?',
    '¿Qué producto vende más?',
    '¿Cuánto he gastado en nóminas?',
  ],
  compact = false,
}) {
  const [msg, setMsg] = useState('')
  const [resp, setResp] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)
  const [respMeta, setRespMeta] = useState(null)
  const router = useRouter()
  const abortRef = useRef(null)

  // Cargar estado al montar
  useEffect(() => {
    if (!token) return
    fetch(`${API}/api/vera/v2/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(s => setStatus(s))
      .catch(e => console.error('Error de red:', e))
  }, [token])

  const isPlus = status?.plan === 'plus'
  const isDegraded = status?.degraded || status?.blocked
  const isNearLimit = status && !isPlus && status.usage_pct > 70 && !isDegraded
  const planLabel = status?.plan_label || 'Vera'
  const activeModel = status?.model_active_now?.display_name || ''

  async function send() {
    if (!msg.trim() || !token) return
    setLoading(true)
    setResp('')
    setRespMeta(null)

    const startedAt = Date.now()

    try {
      // 1. Crear conversación efímera (cada panel embedido es de un solo turno)
      const convRes = await fetch(`${API}/api/vera/v2/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: msg.slice(0, 60),
          module: modulo || null,
        }),
      })
      if (!convRes.ok) throw new Error('No se pudo iniciar la conversación')
      const { id: convId } = await convRes.json()

      // 2. Stream del mensaje
      const ctrl = new AbortController()
      abortRef.current = ctrl
      const r = await fetch(`${API}/api/vera/v2/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversation_id: convId,
          message: msg,
        }),
        signal: ctrl.signal,
      })

      if (!r.ok || !r.body) {
        const errText = await r.text().catch(() => '')
        throw new Error(errText || `Error ${r.status}`)
      }

      const reader = r.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'chunk' && data.text) {
              accumulated += data.text
              setResp(accumulated)
            }
            if (data.type === 'done') {
              setRespMeta({
                model: data.model,
                model_label: data.model_label,
                latency_ms: data.latency_ms || (Date.now() - startedAt),
                degraded: data.degraded,
              })
            }
            if (data.type === 'error') {
              setResp(prev => prev + '\n[Error: ' + (data.message || 'desconocido') + ']')
            }
          } catch {}
        }
      }
      setMsg('')
      // Refrescar status (cuota cambió tras el chat)
      fetch(`${API}/api/vera/v2/status`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(s => s && setStatus(s))
        .catch(e => console.error('Error de red:', e))
    } catch (err) {
      setResp('Error conectando con Vera: ' + (err.message || 'desconocido'))
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }

  function clearResp() {
    setResp('')
    setRespMeta(null)
  }

  return (
    <Card style={{ padding: compact ? 16 : 20 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: isPlus
              ? 'linear-gradient(135deg,#3730A3,#3D2BFF)'
              : 'linear-gradient(135deg,#3D2BFF,#A5B1FF)',
            color: '#fff', display: 'grid', placeItems: 'center',
            fontSize: 12, fontWeight: 600,
          }}>V</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: -0.2 }}>
              Pregúntale a {planLabel}
            </div>
            {modulo && (
              <div style={{ fontSize: 11, color: T.text4 }}>
                Contexto: {modulo}
              </div>
            )}
          </div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, color: isPlus ? '#fff' : T.blue,
          background: isPlus ? '#3730A3' : 'rgba(61,43,255,.08)',
          padding: '3px 10px', borderRadius: 999, letterSpacing: 0.4,
        }}>
          {isPlus ? '★ PLUS' : 'BASE'}
        </span>
      </div>

      {/* Banner cuota agotada */}
      {isDegraded && (
        <div style={{
          background: '#fef3c7', border: '1px solid #f59e0b',
          borderRadius: 8, padding: '8px 10px', marginBottom: 12,
          fontSize: 11, color: '#92400e',
        }}>
          <strong>Modo básico</strong> · usando {activeModel || 'modelo básico'}.{' '}
          <a href="/vera-plus" style={{ color: '#3730A3', fontWeight: 700, textDecoration: 'none' }}>
            Quita el límite →
          </a>
        </div>
      )}

      {/* Banner cerca del límite */}
      {isNearLimit && (
        <div style={{
          background: 'rgba(245,158,11,.08)', border: '.5px solid #f59e0b',
          borderRadius: 8, padding: '7px 10px', marginBottom: 12,
          fontSize: 11, color: '#92400e',
        }}>
          Te acercas al límite diario ({status.usage_pct}%).{' '}
          <a href="/vera-plus" style={{ color: '#3730A3', fontWeight: 700, textDecoration: 'none' }}>
            Vera Plus →
          </a>
        </div>
      )}

      {/* Sugerencias */}
      {!resp && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {suggestions.map(s => (
            <button key={s} onClick={() => setMsg(s)} style={{
              padding: '5px 12px',
              borderRadius: 999,
              border: `.5px solid ${T.hairline}`,
              background: T.sidebar,
              color: T.text3,
              fontSize: 11.5,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Respuesta */}
      {resp && (
        <div style={{
          padding: '12px 14px',
          background: T.sidebar,
          borderRadius: 10,
          fontSize: 13,
          color: T.text2,
          lineHeight: 1.65,
          maxHeight: 240,
          overflowY: 'auto',
          border: `.5px solid ${T.hairline}`,
          position: 'relative',
          marginBottom: 12,
          whiteSpace: 'pre-wrap',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 600,
            color: isPlus ? '#3730A3' : T.blue,
            textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
          }}>
            {planLabel} responde
          </div>
          {resp}
          {respMeta?.model && (
            <div style={{
              fontSize: 10, color: T.text4,
              marginTop: 10, paddingTop: 8,
              borderTop: `.5px solid ${T.hairline}`,
              opacity: 0.7,
            }}>
              {status?.model_active_now?.display_name || respMeta.model}
              {respMeta.latency_ms ? ` · ${(respMeta.latency_ms / 1000).toFixed(1)}s` : ''}
              {respMeta.degraded ? ' · modo básico' : ''}
            </div>
          )}
          <button onClick={clearResp} style={{
            position: 'absolute', top: 8, right: 8,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 14, color: T.text4,
          }}>×</button>
        </div>
      )}

      {/* Input */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={msg}
          onChange={e => setMsg(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Pregunta sobre tu negocio..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '9px 12px',
            borderRadius: 9,
            border: `.5px solid ${T.hairline}`,
            fontSize: 13,
            fontFamily: 'inherit',
            outline: 'none',
            background: T.sidebar,
            color: T.text,
          }}
        />
        <button onClick={send} disabled={loading || !msg.trim()} style={{
          padding: '9px 16px',
          borderRadius: 9,
          border: 'none',
          background: loading || !msg.trim()
            ? T.sidebar
            : (isPlus ? '#3730A3' : T.text),
          color: loading || !msg.trim() ? T.text4 : '#fff',
          fontWeight: 600,
          fontSize: 14,
          cursor: loading || !msg.trim() ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
        }}>
          {loading ? '…' : '↑'}
        </button>
      </div>

      {/* EU AI Act (riesgo limitado): transparencia hacia el usuario. */}
      <div style={{ marginTop: 8, fontSize: 10, color: T.text4, lineHeight: 1.4 }}>
        {isPlus ? 'Vera Plus' : 'Vera'} es una IA. Puede cometer errores; verifica los datos importantes.
      </div>

      <button onClick={() => router.push('/vera')} style={{
        background: 'none', border: 'none',
        color: isPlus ? '#3730A3' : T.blue,
        fontSize: 12, fontWeight: 500,
        cursor: 'pointer', fontFamily: 'inherit',
        textAlign: 'center', width: '100%', marginTop: 12,
      }}>
        Abrir chat completo →
      </button>
    </Card>
  )
}
