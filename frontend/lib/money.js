'use client'
// Central money formatting — every BUSINESS-DATA amount in the app goes through
// here so it shows the logged-in company's country currency (ES €/EUR, MX $/MXN,
// SV $/USD, …). The currency CODE drives correct grouping/decimals via Intl; the
// symbol ($ is shared by MX/SV/CO/AR/CL, so the code is what disambiguates).
//
// Vela's OWN subscription pricing (plans, Vera Plus) is billed in EUR and must NOT
// use this — keep those literals as €.
import { useCompany } from '@/components/CompanyProvider'

const DEFAULTS = { currency: 'EUR', symbol: '€', locale: 'es-ES' }

/** Format a number as currency. `meta` = { currency, symbol, locale }. */
export function formatCurrency(n, meta = {}, opts = {}) {
  const currency = meta.currency || DEFAULTS.currency
  const locale = meta.locale || DEFAULTS.locale
  const symbol = meta.symbol || DEFAULTS.symbol
  const num = Number(n || 0)
  const decimals = opts.decimals
  try {
    const fmtOpts = { style: 'currency', currency }
    if (decimals != null) { fmtOpts.minimumFractionDigits = decimals; fmtOpts.maximumFractionDigits = decimals }
    return new Intl.NumberFormat(locale, fmtOpts).format(num)
  } catch {
    // Unsupported locale/currency in this runtime → manual symbol + grouping.
    const d = decimals != null ? decimals : 2
    return `${symbol}${num.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`
  }
}

/** Hook bound to the current company's currency.
 *  - fmt(n)            → "€1.234,56" / "$1,234.56" (2 decimals)
 *  - fmt(n,{decimals:0})→ no decimals
 *  - short(n)          → "€1,2k" / "$3,4M" (abbreviated, with symbol)
 *  - symbol            → raw currency symbol (for labels/placeholders) */
export function useMoney() {
  const { currency, symbol, locale } = useCompany()
  const meta = { currency, symbol, locale }
  const fmt = (n, opts) => formatCurrency(n, meta, opts)
  const sym = symbol || DEFAULTS.symbol
  const short = (n) => {
    const num = Number(n || 0)
    if (Math.abs(num) >= 1e6) return `${sym}${(num / 1e6).toFixed(1)}M`
    if (Math.abs(num) >= 1e3) return `${sym}${(num / 1e3).toFixed(1)}k`
    return fmt(num, { decimals: 0 })
  }
  return { fmt, short, symbol: sym, currency: currency || DEFAULTS.currency, locale: locale || DEFAULTS.locale }
}
