'use client'
import { useEffect } from 'react'
import { refreshAccessToken, getToken } from '@/lib/api'

/**
 * Keeps the access token fresh app-wide so short-lived tokens work WITHOUT
 * touching every page. Mounted once at the root: while a session exists it calls
 * /api/auth/refresh on an interval (and on tab focus), which rotates the HttpOnly
 * refresh cookie and writes a new access token to localStorage. Every page —
 * including the ones that still read the token directly — therefore always reads
 * a valid token.
 *
 * Silent + safe: does nothing if there's no token, and in dev (cross-origin http,
 * where the SameSite cookie isn't attached) the refresh just no-ops, so behaviour
 * is unchanged. This is what lets prod run a short ACCESS_TOKEN_EXPIRE_MINUTES.
 */
const REFRESH_EVERY_MS = 10 * 60 * 1000  // 10 min — well under a short token TTL

export default function TokenRefresher() {
  useEffect(() => {
    let stopped = false
    const tick = () => { if (!stopped && getToken()) refreshAccessToken() }
    // Refresh shortly after load (covers a token that expired while the tab slept),
    // then on a steady interval and whenever the tab regains focus.
    const initial = setTimeout(tick, 3000)
    const interval = setInterval(tick, REFRESH_EVERY_MS)
    const onFocus = () => tick()
    window.addEventListener('focus', onFocus)
    return () => {
      stopped = true
      clearTimeout(initial)
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [])
  return null
}
