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

/** Centralized API fetch — PREFER THIS over raw fetch() in pages/components.
 *  Prefixes API_BASE, attaches auth headers, and routes 401s through
 *  handleUnauthorized(). Returns the Response (callers still check res.ok). */
export async function apiFetch(path, options = {}) {
  const { headers, ...rest } = options
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`
  const res = await fetch(url, { ...rest, headers: authHeaders(headers || {}) })
  if (res.status === 401) handleUnauthorized()
  return res
}
