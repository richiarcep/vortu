'use client'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { API_BASE as API } from '@/lib/api'
const PUBLIC_ROUTES = ['/login', '/register', '/onboarding', '/pricing']

// Maps a top-level route to its plan module key. Routes not listed are never
// gated (dashboard, settings, admin, vera-plus, fiscal...). During the beta phase
// the backend returns the full module set, so nothing locks until the phase flips.
const ROUTE_MODULE = {
  contabilidad: 'contabilidad', finanzas: 'finanzas', costes: 'finanzas',
  ventas: 'ventas', hr: 'hr', proyectos: 'proyectos', clientes: 'clientes',
  documentos: 'documentos', marketing: 'marketing', vera: 'agente',
}
function routeModule(pathname) {
  return ROUTE_MODULE[(pathname.split('/')[1] || '')] || null
}

// Cache the allowed-module set for the session so we don't refetch on every nav.
let _allowedModulesCache = null
async function getAllowedModules(token) {
  if (_allowedModulesCache) return _allowedModulesCache
  try {
    const r = await fetch(`${API}/api/billing/status`, { headers: { Authorization: `Bearer ${token}` } })
    if (r.ok) {
      const d = await r.json()
      _allowedModulesCache = Array.isArray(d.modules) ? d.modules : null
      return _allowedModulesCache
    }
  } catch {}
  return null  // fail OPEN — a billing hiccup must never lock a paying user out
}

export default function JurisdictionGuard({ children }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    setBlocked(false)
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
      .then(async data => {
        if (!data) return            // ya redirigido arriba

        // ── Platform admins (back-office) ──────────────────────────────────
        // Superadmins operate the back-office across tenants; they have no
        // company/country of their own, so the onboarding/country bounce below
        // must NOT apply to them or they'd be trapped on /onboarding forever.
        // They're also the only ones allowed under /admin — gate it here
        // client-side (the server already 403s every /api/admin/* route).
        const isSuper = !!data.is_superadmin
        const onAdmin = pathname === '/admin' || pathname.startsWith('/admin/')

        if (isSuper) {
          setReady(true)              // exempt from country/onboarding + module gating
          return
        }
        if (onAdmin) {
          // Non-superadmin trying to reach the back-office → bounce to their app.
          router.replace('/dashboard')
          return
        }

        if (!data.country) {
          router.replace('/onboarding')
          return                     // pantalla en blanco hasta redirigir
        }
        // Module gating: block direct access to a module not in the plan.
        const mod = routeModule(pathname)
        if (mod) {
          const allowed = await getAllowedModules(token)
          if (allowed && !allowed.includes(mod)) {
            setBlocked(true); setReady(true); return
          }
        }
        setReady(true)
      })
      .catch(() => {
        // Error de red / backend caído: fallar cerrado en vez de dejar pasar.
        router.replace('/login')
      })
  }, [pathname])

  if (ready && blocked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FBFBFD', fontFamily: '-apple-system, sans-serif', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#0B0D2B', marginBottom: 8 }}>Módulo no incluido en tu plan</div>
          <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, marginBottom: 24 }}>
            Este módulo requiere un plan superior. Mejora tu plan para desbloquearlo.
          </div>
          <button onClick={() => router.push('/settings?tab=subscription')} style={{ padding: '12px 28px', borderRadius: 10, border: 'none', background: '#3D2BFF', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
            Ver planes →
          </button>
        </div>
      </div>
    )
  }

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
            borderTopColor: '#3D2BFF',
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
