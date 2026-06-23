'use client'
import useSWR from 'swr'

import { API_BASE as API, authHeaders, handleUnauthorized } from '@/lib/api'

async function fetcher(url) {
  const res = await fetch(`${API}${url}`, {
    headers: authHeaders(),
  })
  if (!res.ok) {
    // Expired/invalid session → clear token and redirect to login instead of
    // leaving the page rendering empty data forever.
    if (res.status === 401) handleUnauthorized()
    const err = new Error('Error en la API')
    err.status = res.status
    throw err
  }
  return res.json()
}

export function useApi(path, options = {}) {
  return useSWR(path, fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
    ...options,
  })
}

export function useApiMultiple(paths) {
  const results = paths.map(p => useApi(p))
  return {
    data: results.map(r => r.data),
    isLoading: results.some(r => r.isLoading),
    errors: results.map(r => r.error),
    mutate: () => results.forEach(r => r.mutate()),
  }
}
