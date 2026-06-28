'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  API_BASE,
  getToken,
  setToken,
  getImpersonation,
  getStashedAdminToken,
  clearStashedAdminToken,
} from '@/lib/api'

// Fired by the admin page right after it swaps to an act_as token so the banner
// (mounted once at the root) re-reads the token immediately, without a reload.
export const IMPERSONATION_EVENT = 'vela:impersonation-changed'

/**
 * Persistent, unmistakable banner shown on EVERY page while a platform admin is
 * impersonating a customer. Mounted once in the root layout.
 *
 * Source of truth = the CURRENT access token. An impersonation token carries
 * act_as / imp / imp_email / imp_ro claims (see /api/admin/impersonate); a normal
 * token has none, so this renders nothing in the common case. We also fetch the
 * target's email from /api/auth/me (under impersonation /me returns the TARGET
 * user) to label the banner with WHO is being acted as.
 *
 * "Salir" → POST /api/admin/impersonate/stop with the impersonation token, then
 * restore the admin's stashed token and hard-reload back into the back-office.
 */
export default function ImpersonationBanner() {
  const [imp, setImp] = useState(null)        // { actAs, adminId, adminEmail, readonly }
  const [targetEmail, setTargetEmail] = useState('')
  const [exiting, setExiting] = useState(false)

  // Re-read the impersonation context from whatever token is active right now.
  const refresh = useCallback(() => {
    setImp(getImpersonation(getToken()))
  }, [])

  useEffect(() => {
    refresh()
    // React to: token changes in OTHER tabs (storage), our own in-tab swap
    // (custom event), and tab focus (covers the 15-min token expiring).
    const onStorage = (e) => { if (!e.key || e.key === 'vela_token') refresh() }
    window.addEventListener('storage', onStorage)
    window.addEventListener(IMPERSONATION_EVENT, refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(IMPERSONATION_EVENT, refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [refresh])

  // Once we know we're impersonating, label the banner with the target's email.
  useEffect(() => {
    let cancelled = false
    if (!imp) { setTargetEmail(''); return }
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        })
        if (!cancelled && res.ok) {
          const d = await res.json()
          setTargetEmail(d?.email || '')
        }
      } catch { /* label falls back to the user id */ }
    })()
    return () => { cancelled = true }
  }, [imp])

  const stop = useCallback(async () => {
    setExiting(true)
    const impToken = getToken()
    try {
      // Best-effort: end the server-side session (sets ended_at + audit log).
      await fetch(`${API_BASE}/api/admin/impersonate/stop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${impToken}` },
      })
    } catch { /* still restore locally so we never get stuck impersonating */ }

    // Restore the admin's own session. Always clear the act_as token even if the
    // stash is somehow missing, so we can't be left holding the act_as token.
    const adminToken = getStashedAdminToken()
    if (adminToken) {
      setToken(adminToken)
      clearStashedAdminToken()
      // Hard nav back to the back-office so all in-flight state is dropped.
      window.location.href = '/admin?tab=users'
    } else {
      // No stash → safest is a clean login.
      window.location.href = '/login'
    }
  }, [])

  if (!imp) return null

  const who = targetEmail || `usuario #${imp.actAs ?? '?'}`
  const modeLabel = imp.readonly ? 'solo lectura' : 'lectura y escritura'

  return (
    <>
      <style>{`
        @keyframes velaImpPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }
      `}</style>
      <div
        role="alert"
        aria-live="assertive"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 2147483647, // above everything, incl. modals/drawers
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          padding: '10px 16px',
          background: imp.readonly
            ? 'linear-gradient(90deg, #b45309, #d97706)'
            : 'linear-gradient(90deg, #b91c1c, #dc2626)',
          color: '#fff',
          fontFamily: '-apple-system, system-ui, "Inter", sans-serif',
          fontSize: 13.5,
          fontWeight: 600,
          letterSpacing: '-0.1px',
          boxShadow: '0 2px 14px rgba(0,0,0,0.28)',
          borderBottom: '1px solid rgba(255,255,255,0.25)',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 9,
            height: 9,
            borderRadius: '50%',
            background: '#fff',
            flexShrink: 0,
            animation: 'velaImpPulse 1.4s ease-in-out infinite',
          }}
        />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          <strong style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Modo soporte
          </strong>
          <span>
            Actuando como <strong style={{ fontWeight: 800 }}>{who}</strong> ({modeLabel})
            {imp.adminEmail ? <span style={{ opacity: 0.85 }}> · admin: {imp.adminEmail}</span> : null}
          </span>
        </span>
        <button
          onClick={stop}
          disabled={exiting}
          style={{
            flexShrink: 0,
            padding: '6px 16px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.55)',
            background: 'rgba(255,255,255,0.16)',
            color: '#fff',
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 800,
            cursor: exiting ? 'default' : 'pointer',
            opacity: exiting ? 0.6 : 1,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { if (!exiting) e.currentTarget.style.background = 'rgba(255,255,255,0.3)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.16)' }}
        >
          {exiting ? 'Saliendo…' : 'Salir'}
        </button>
      </div>
      {/* Spacer so the fixed banner never covers page content. */}
      <div aria-hidden="true" style={{ height: 39 }} />
    </>
  )
}
