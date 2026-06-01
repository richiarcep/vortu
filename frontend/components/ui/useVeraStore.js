'use client'
// Store ultra-simple para el drawer de Vera.
// Cualquier componente puede llamar openVeraDrawer({kpi, modulo, suggestions})
// para abrir el drawer con contexto, sin pasar props por toda la jerarquía.
import { useSyncExternalStore } from 'react'

let listeners = []
let state = {
  open: false,
  kpi: null,        // { label, value, hint } | null
  modulo: null,     // "finanzas" | "ventas" | etc
  suggestions: null,
}

export function getDrawerState() {
  return state
}

export function openVeraDrawer({ kpi = null, modulo = null, suggestions = null } = {}) {
  state = { open: true, kpi, modulo, suggestions }
  listeners.forEach(fn => fn(state))
}

export function closeVeraDrawer() {
  state = { ...state, open: false }
  listeners.forEach(fn => fn(state))
}

export function subscribeVeraDrawer(fn) {
  listeners.push(fn)
  return () => { listeners = listeners.filter(l => l !== fn) }
}

// React-correct subscription. useSyncExternalStore avoids the tearing/stale-read
// risks of a hand-rolled useState+useEffect+subscribe under concurrent rendering,
// and handles unsubscribe cleanup automatically. `state` is only ever reassigned
// (never mutated), so its identity is a valid snapshot for change detection.
export function useVeraDrawer() {
  return useSyncExternalStore(subscribeVeraDrawer, getDrawerState, getDrawerState)
}
