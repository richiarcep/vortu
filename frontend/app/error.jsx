'use client'
// Route-segment error boundary. Catches render/runtime errors thrown anywhere
// in the page tree below the root layout, so one crash shows a recovery UI
// instead of a blank screen. `reset()` re-renders the segment to retry.
import { useEffect } from 'react'

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Route error boundary caught:', error)
  }, [error])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#FBFBFD', fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      padding: 24,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1D1D1F', margin: '0 0 8px' }}>
          Algo ha ido mal
        </h2>
        <p style={{ fontSize: 14, color: '#6E6E73', margin: '0 0 20px', lineHeight: 1.5 }}>
          Se ha producido un error inesperado en esta página. Puedes reintentar o volver al inicio.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={() => reset()} style={{
            padding: '9px 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
            background: '#0071E3', color: '#fff', fontSize: 14, fontWeight: 500, fontFamily: 'inherit',
          }}>Reintentar</button>
          <button onClick={() => { window.location.href = '/dashboard' }} style={{
            padding: '9px 18px', borderRadius: 999, cursor: 'pointer',
            background: 'transparent', color: '#0071E3', fontSize: 14, fontWeight: 500,
            border: '.5px solid rgba(0,0,0,0.15)', fontFamily: 'inherit',
          }}>Ir al inicio</button>
        </div>
      </div>
    </div>
  )
}
