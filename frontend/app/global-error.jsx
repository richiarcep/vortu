'use client'
// Global error boundary — the last line of defence. Catches errors thrown in the
// root layout itself (which `error.jsx` cannot). Must render its own <html>/<body>.
import { useEffect } from 'react'

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('Global error boundary caught:', error)
  }, [error])

  return (
    <html lang="es">
      <body style={{ margin: 0 }}>
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#FBFBFD', fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          padding: 24,
        }}>
          <div style={{ textAlign: 'center', maxWidth: 420 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1D1D1F', margin: '0 0 8px' }}>
              La aplicación ha fallado
            </h2>
            <p style={{ fontSize: 14, color: '#6E6E73', margin: '0 0 20px', lineHeight: 1.5 }}>
              Se ha producido un error grave. Recarga la página para continuar.
            </p>
            <button onClick={() => reset()} style={{
              padding: '9px 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: '#4F46E5', color: '#fff', fontSize: 14, fontWeight: 500, fontFamily: 'inherit',
            }}>Recargar</button>
          </div>
        </div>
      </body>
    </html>
  )
}
