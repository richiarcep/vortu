'use client'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { API_BASE as API } from '@/lib/api'
const PUBLIC_ROUTES = ['/login', '/register', '/onboarding', '/pricing']

export default function JurisdictionGuard({ children }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Rutas públicas: renderizar de inmediato
    if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
      setReady(true)
      return
    }

    const token = localStorage.getItem('vela_token')
    if (!token) {
      // Sin token: dejar que cada módulo maneje su propio redirect a /login
      setReady(true)
      return
    }

    fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async r => {
        if (!r.ok) {
          // Token inválido/expirado (401/403) o cualquier otro fallo de
          // validación: fallar de forma segura → limpiar token y mandar a login.
          if (r.status === 401 || r.status === 403) {
            localStorage.removeItem('vela_token')
          }
          router.replace('/login')
          return null
        }
        return r.json()
      })
      .then(data => {
        if (!data) return            // ya redirigido arriba
        if (!data.country) {
          router.replace('/onboarding')
          // No setReady(true) — mantenemos pantalla en blanco hasta redirigir
        } else {
          setReady(true)
        }
      })
      .catch(() => {
        // Error de red / backend caído: fallar cerrado en vez de dejar pasar.
        router.replace('/login')
      })
  }, [pathname])

  if (!ready) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FBFBFD',
        fontFamily: '-apple-system, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 32, height: 32,
            border: '2px solid rgba(0,0,0,0.08)',
            borderTopColor: '#4F46E5',
            borderRadius: '50%',
            animation: 'spin .7s linear infinite',
            margin: '0 auto 12px',
          }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <div style={{ fontSize: 13, color: '#86868B' }}>Cargando...</div>
        </div>
      </div>
    )
  }

  return children
}
