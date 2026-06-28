'use client'
import { useState } from 'react'
import { API_BASE, getToken, setToken, stashAdminToken } from '@/lib/api'
import { IMPERSONATION_EVENT } from '@/components/ImpersonationBanner'

// Operator-only panel (rendered in the back-office Users tab) to start a scoped
// impersonation session. Mints via POST /api/admin/impersonate/{id} (15-min,
// refresh-less, audited, read-only by default, 2FA step-up required), stashes the
// admin's own token so "Salir" can restore it, swaps to the act_as token, and
// drops into the target's app. The persistent banner takes over from there.
export default function ImpersonatePanel({ T }) {
  const [userId, setUserId] = useState('')
  const [reason, setReason] = useState('')
  const [totp, setTotp] = useState('')
  const [mode, setMode] = useState('read')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function go() {
    setErr('')
    if (!userId || !reason.trim() || totp.length !== 6) {
      setErr('Completa ID de usuario, motivo y tu código 2FA (6 dígitos).'); return
    }
    setBusy(true)
    try {
      const adminToken = getToken()
      const r = await fetch(`${API_BASE}/api/admin/impersonate/${encodeURIComponent(userId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ reason: reason.trim(), totp_code: totp, mode }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        const detail = Array.isArray(d.detail) ? (d.detail[0]?.msg || 'Datos inválidos') : (d.detail || 'No se pudo impersonar')
        setErr(detail); return
      }
      stashAdminToken(adminToken)            // keep the admin token to restore on "Salir"
      setToken(d.access_token)               // swap to the short-lived act_as token
      window.dispatchEvent(new Event(IMPERSONATION_EVENT))
      window.location.href = '/dashboard'    // act as the target; the banner takes over
    } catch { setErr('Error de conexión') }
    finally { setBusy(false) }
  }

  const inp = {
    padding: '9px 12px', borderRadius: 8, border: `.5px solid ${T.hairline}`, fontSize: 13,
    fontFamily: 'inherit', outline: 'none', background: T.bg, color: T.text, width: '100%', boxSizing: 'border-box',
  }
  return (
    <div style={{ background: T.card, border: `.5px solid ${T.hairline}`, borderRadius: 14, padding: 18, marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>🎭 Impersonar (modo soporte)</div>
      <div style={{ fontSize: 12, color: T.text3, marginBottom: 14 }}>
        Sesión de <strong>15 min</strong>, <strong>auditada</strong>, por defecto <strong>solo lectura</strong>.
        Requiere tu código 2FA. No se puede impersonar a otros operadores.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 10 }}>
        <input style={inp} placeholder="ID de usuario" value={userId}
               onChange={(e) => setUserId(e.target.value.replace(/\D/g, ''))} />
        <input style={inp} placeholder="Motivo (obligatorio, queda auditado)" value={reason}
               onChange={(e) => setReason(e.target.value)} />
        <input style={inp} placeholder="Código 2FA" value={totp} maxLength={6}
               onChange={(e) => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))} />
        <select style={inp} value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="read">Solo lectura</option>
          <option value="write">Lectura y escritura (extra-auditado)</option>
        </select>
      </div>
      {err && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 10 }}>{err}</div>}
      <button onClick={go} disabled={busy}
              style={{ marginTop: 12, padding: '9px 18px', borderRadius: 8, border: 'none', background: T.blue,
                       color: '#fff', fontSize: 13, fontWeight: 700, cursor: busy ? 'default' : 'pointer',
                       opacity: busy ? 0.6 : 1, fontFamily: 'inherit' }}>
        {busy ? 'Iniciando…' : 'Impersonar'}
      </button>
    </div>
  )
}
