'use client'
// One shared source of truth for the logged-in company. Fetches GET /api/auth/me
// ONCE and exposes { country, currency, symbol, locale, is_admin, … } to the whole
// tree via useCompany(). lib/money.js' useMoney() reads from here so every page
// formats money in the company's country currency. Mounted in app/layout.tsx.
import { createContext, useContext, useEffect, useState } from 'react'
import { getMe, getToken } from '@/lib/api'

const DEFAULTS = {
  country: null, currency: 'EUR', symbol: '€', locale: 'es-ES',
  is_admin: false, email: null, full_name: null, loading: true,
}

const CompanyContext = createContext(DEFAULTS)

export function CompanyProvider({ children }) {
  const [data, setData] = useState(DEFAULTS)

  useEffect(() => {
    // No token (e.g. /login) → don't fire an auth request; keep safe defaults.
    if (!getToken()) { setData((d) => ({ ...d, loading: false })); return }
    let alive = true
    getMe().then((me) => {
      if (!alive) return
      if (me) {
        setData({
          country: me.country || null,
          currency: me.currency || 'EUR',
          symbol: me.symbol || '€',
          locale: me.locale || 'es-ES',
          is_admin: !!me.is_admin,
          email: me.email || null,
          full_name: me.full_name || null,
          loading: false,
        })
      } else {
        setData((d) => ({ ...d, loading: false }))
      }
    })
    return () => { alive = false }
  }, [])

  return <CompanyContext.Provider value={data}>{children}</CompanyContext.Provider>
}

/** Read the current company context. Returns safe EUR defaults outside the
 *  provider / before /me resolves, so callers never crash and never show a
 *  blank symbol. */
export function useCompany() { return useContext(CompanyContext) }
