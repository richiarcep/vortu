import { useState, useEffect } from 'react'
const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
const CURRENCY_MAP = {
  MX: { symbol: '$',  locale: 'es-MX', currency: 'MXN' },
  ES: { symbol: '€',  locale: 'es-ES', currency: 'EUR' },
  SV: { symbol: '$',  locale: 'es-SV', currency: 'USD' },
  CO: { symbol: '$',  locale: 'es-CO', currency: 'COP' },
  GT: { symbol: 'Q',  locale: 'es-GT', currency: 'GTQ' },
  HN: { symbol: 'L',  locale: 'es-HN', currency: 'HNL' },
}
const DEFAULT = { symbol: '€', locale: 'es-ES', currency: 'EUR' }

// Cache por token — se limpia al cambiar de usuario
let _cache = {}

export function useCurrency() {
  const [config, setConfig] = useState(DEFAULT)

  useEffect(() => {
    const token = localStorage.getItem('nexum_token')
    if (!token) return
    const key = token.slice(-16)
    if (_cache[key]) { setConfig(_cache[key]); return }
    fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        const country = d.country || d.company?.country || 'ES'
        const cfg = { ...(CURRENCY_MAP[country] || DEFAULT), country }
        _cache[key] = cfg
        setConfig(cfg)
      })
      .catch(() => {})
  }, [])

  const fmt = (value, decimals = 0) => {
    if (value === null || value === undefined) return `${config.symbol}0`
    const n = Number(value)
    if (isNaN(n)) return `${config.symbol}0`
    return config.symbol + n.toLocaleString(config.locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  return { sym: config.symbol, fmt, config, country: config.country || 'ES' }
}

export function getCurrencySymbol(country) {
  return (CURRENCY_MAP[country] || DEFAULT).symbol
}
