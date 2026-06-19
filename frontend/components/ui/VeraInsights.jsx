'use client'
import { useEffect, useState } from 'react'
import { T } from './tokens'
import { openVeraDrawer } from './useVeraStore'

import { API_BASE as API } from '@/lib/api'

const toneColor = {
  good:    '#34c759',
  amber:   '#ff9500',
  red:     '#ff3b30',
  neutral: '#4F46E5',
}

/**
 * VeraInsights — observaciones automáticas del backend.
 *
 * Props:
 *   - modulo: string ("finanzas", "ventas", "costes", etc)
 *   - title?: string (default: "Vera Insights")
 *   - subtitle?: string
 *
 * Comportamiento:
 *   - Carga insights desde GET /api/vera/insights/{modulo}
 *   - Si plan=plus, muestra botón "Actualizar" para regenerar
 *   - Click "Preguntar a Vera" → abre drawer del módulo
 */
export default function VeraInsights({ modulo, title, subtitle }) {
  const [data, setData] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  async function load(force = false) {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('vela_token')
    if (!token) return

    if (force) setRefreshing(true)
    else setLoading(true)

    try {
      const url = `${API}/api/vera/insights/${modulo}${force ? '?force=true' : ''}`
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!r.ok) throw new Error('No se pudieron cargar los insights')
      const json = await r.json()
      setData(json)
      setError(null)
    } catch (e) {
      setError(e.message || 'Error desconocido')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load(false) }, [modulo])

  const canRefresh = data?.can_refresh
  const insights = data?.insights || []
  const fromCache = data?.from_cache

  return (
    <div style={{
      background: T.card,
      border: `.5px solid ${T.hairline}`,
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 16,
    }}>
      {/* Header (clickeable para expandir/colapsar) */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: expanded ? `.5px solid ${T.hairline}` : 'none',
          background: 'linear-gradient(180deg, rgba(79,70,229,.025), transparent)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: 'linear-gradient(135deg, #4F46E5, #A5B1FF)',
            display: 'grid', placeItems: 'center',
          }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" fill="#fff"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, letterSpacing: -0.1 }}>
              {title || 'Vera Insights'}
            </div>
            <div style={{ fontSize: 11, color: T.text4, marginTop: 1 }}>
              {subtitle || `Observaciones automáticas sobre ${modulo}`}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {canRefresh && (
            <button
              onClick={(e) => { e.stopPropagation(); load(true) }}
              disabled={refreshing}
              style={{
                padding: '5px 10px', borderRadius: 7,
                border: `.5px solid rgba(0,61,143,.18)`,
                background: refreshing ? 'transparent' : 'rgba(0,61,143,.05)',
                color: '#3730A3', fontSize: 11, fontWeight: 600,
                cursor: refreshing ? 'wait' : 'pointer',
                fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M3 21v-5h5"/>
              </svg>
              {refreshing ? 'Actualizando…' : 'Actualizar'}
            </button>
          )}
          {expanded && (
            <button
              onClick={(e) => { e.stopPropagation(); openVeraDrawer({ modulo }) }}
              style={{
                padding: '5px 12px', borderRadius: 7,
                border: `.5px solid rgba(79,70,229,.18)`,
                background: 'rgba(79,70,229,.05)',
                color: '#4F46E5', fontSize: 11.5, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: 4,
                whiteSpace: 'nowrap',
              }}
            >
              Preguntar a Vera
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M13 6l6 6-6 6"/>
              </svg>
            </button>
          )}

          {/* Chevron de toggle */}
          <svg
            width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke={T.text4} strokeWidth="2.5"
            style={{
              transition: 'transform .2s ease',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              marginLeft: 4,
            }}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      {/* Body (solo si expanded) */}
      {expanded && (
      <>
      <div style={{ padding: '4px 0' }}>
        {loading && (
          <div style={{ padding: '24px 18px', textAlign: 'center', color: T.text4, fontSize: 12 }}>
            Cargando observaciones…
          </div>
        )}

        {error && !loading && (
          <div style={{ padding: '18px', color: '#dc2626', fontSize: 12 }}>
            {error}
          </div>
        )}

        {!loading && !error && insights.length === 0 && (
          <div style={{ padding: '24px 18px', textAlign: 'center', color: T.text4, fontSize: 12 }}>
            Aún no hay observaciones para este módulo.
          </div>
        )}

        {!loading && !error && insights.map((ins, i) => {
          const c = toneColor[ins.tone] || toneColor.neutral
          return (
            <div key={i} style={{
              padding: '11px 18px',
              display: 'flex', alignItems: 'flex-start', gap: 12,
              borderBottom: i < insights.length - 1 ? `.5px solid ${T.soft || T.hairline}` : 'none',
            }}>
              <div style={{
                flexShrink: 0, marginTop: 6,
                width: 6, height: 6, borderRadius: '50%', background: c,
              }}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 10.5, fontWeight: 700, color: c,
                  textTransform: 'uppercase', letterSpacing: 0.5,
                  marginBottom: 2,
                }}>
                  {ins.label}
                </div>
                <div style={{ fontSize: 12.5, color: T.text2 || T.text, lineHeight: 1.5 }}>
                  {ins.text}
                </div>
              </div>
            </div>
          )
        })}

        {/* Footer info */}
        {!loading && !error && fromCache && (
          <div style={{
            padding: '8px 18px',
            fontSize: 10, color: T.text4,
            borderTop: `.5px solid ${T.soft || T.hairline}`,
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span>Análisis generado por {data.model || 'Vera'}</span>
            {!canRefresh && (
              <a href="/vera-plus" style={{ color: '#3730A3', textDecoration: 'none', fontWeight: 600 }}>
                Plus actualiza bajo demanda →
              </a>
            )}
          </div>
        )}
      </div>
      </>
      )}
    </div>
  )
}
