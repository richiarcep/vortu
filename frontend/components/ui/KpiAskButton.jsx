'use client'
import { useState } from 'react'
import { openVeraDrawer } from './useVeraStore'

/**
 * KpiAskButton — Envoltura sutil con estrella ✦ dorada que abre Vera con contexto del KPI.
 *
 * Diseño:
 *   - Al hacer hover, aparece una pequeña ✦ con tooltip "Ask Vera"
 *   - Posicionada DENTRO del card, en la esquina superior derecha
 *   - Click → abre el drawer con contexto del KPI
 *
 * Uso:
 *   <KpiAskButton kpi={{ label, value, hint }} modulo="finanzas">
 *     <div>...tu card del KPI...</div>
 *   </KpiAskButton>
 */
export default function KpiAskButton({ kpi, modulo, suggestions, children }) {
  const [hover, setHover] = useState(false)
  const [btnHover, setBtnHover] = useState(false)

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setBtnHover(false) }}
      style={{ position: 'relative', width: '100%' }}
    >
      {children}

      {/* Star button + tooltip */}
      <div style={{
        position: 'absolute',
        top: 12,
        right: 12,
        opacity: hover ? 1 : 0,
        transition: 'opacity .15s ease',
        pointerEvents: hover ? 'auto' : 'none',
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        {/* Tooltip */}
        {btnHover && (
          <div style={{
            background: '#3730A3',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.4,
            padding: '4px 9px',
            borderRadius: 6,
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,61,143,.25)',
            fontFamily: 'inherit',
          }}>
            Ask Vera
          </div>
        )}

        {/* Estrella ✦ */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            openVeraDrawer({ kpi, modulo, suggestions })
          }}
          onMouseEnter={() => setBtnHover(true)}
          onMouseLeave={() => setBtnHover(false)}
          aria-label="Ask Vera about this KPI"
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: btnHover
              ? 'linear-gradient(135deg, #3730A3, #4F46E5)'
              : 'rgba(0,61,143,.08)',
            border: 'none',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            transition: 'all .15s ease',
            boxShadow: btnHover ? '0 2px 8px rgba(0,61,143,.3)' : 'none',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z"
              fill={btnHover ? '#fff' : '#3730A3'}
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
