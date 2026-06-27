// Single source of truth for backend access.
//
// Previously every page/component re-declared
//   const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
// with inconsistent fallbacks ('localhost' vs '127.0.0.1'). Import from here
// instead so there is exactly one base URL and one place to manage the token.

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const TOKEN_KEY = 'vela_token'

/** Read the auth token (browser only; returns null during SSR). */
export function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

/** Persist the auth token. */
export function setToken(token) {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
}

/** Remove the auth token (logout / invalid session). */
export function clearToken() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
}

/** Authorization header helper: `{ Authorization: 'Bearer <token>' }` or `{}`. */
export function authHeaders(extra = {}) {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}`, ...extra } : { ...extra }
}

/** React to an expired/invalid session: clear the token and bounce to /login
 *  (preserving where the user was). Centralized so every caller handles a 401
 *  the same way instead of silently rendering an empty/broken page. */
export function handleUnauthorized() {
  clearToken()
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    const redirect = encodeURIComponent(window.location.pathname + window.location.search)
    window.location.href = `/login?redirect=${redirect}`
  }
}

// Silent token refresh. The refresh token lives in an HttpOnly cookie set at
// login; POST /api/auth/refresh rotates it and returns a fresh access token.
// In production (same-origin behind Caddy) the cookie is sent and this keeps the
// session alive past the access-token TTL. In dev (cross-origin http) the
// SameSite cookie isn't attached, so refresh 401s and we fall back to the normal
// logout path — identical to today's behaviour, no regression.
let _refreshPromise = null
export async function refreshAccessToken() {
  if (!_refreshPromise) {
    _refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: 'POST', credentials: 'include',
        })
        if (!res.ok) return false
        const data = await res.json().catch(() => null)
        if (data && data.access_token) { setToken(data.access_token); return true }
        return false
      } catch { return false }
    })()
    _refreshPromise.finally(() => { _refreshPromise = null })
  }
  return _refreshPromise
}

/** Full logout: revoke the refresh token + bump token_version server-side
 *  (best-effort), clear local state, and redirect to /login. Always completes
 *  the local logout even if the server call fails. */
export async function logout() {
  try {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST', credentials: 'include', headers: authHeaders(),
    })
  } catch { /* proceed with local logout regardless */ }
  clearToken()
  if (typeof window !== 'undefined') window.location.href = '/login'
}

/** Centralized API fetch — PREFER THIS over raw fetch() in pages/components.
 *  Prefixes API_BASE, attaches auth headers, and on a 401 tries ONE silent
 *  token refresh + retry before routing through handleUnauthorized().
 *  Returns the Response (callers still check res.ok). */
export async function apiFetch(path, options = {}) {
  const { headers, _retried, ...rest } = options
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`
  const res = await fetch(url, { ...rest, headers: authHeaders(headers || {}), credentials: 'include' })
  if (res.status === 401 && !_retried && !url.includes('/api/auth/refresh')) {
    if (await refreshAccessToken()) {
      return apiFetch(path, { ...options, _retried: true })
    }
    handleUnauthorized()
  } else if (res.status === 401) {
    handleUnauthorized()
  }
  return res
}

/** Current user + company profile (id, email, is_admin, country, and the
 *  derived currency/symbol/locale). One round-trip the CompanyProvider caches
 *  so every page formats money in the company's country currency. */
export async function getMe() {
  try {
    const res = await apiFetch('/api/auth/me')
    return res.ok ? await res.json() : null
  } catch {
    return null
  }
}
