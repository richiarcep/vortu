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
