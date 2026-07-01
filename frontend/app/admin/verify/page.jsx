'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useT, useTheme } from '@/components/ui/tokens'
import { apiFetch } from '@/lib/api'

// Step-up 2FA del back-office: cada BACKOFFICE_2FA_DAYS días el operador debe
// re-verificar su TOTP para entrar. El backend exime /api/admin/2fa-status y
// /2fa-stepup del gate, así que esta página es alcanzable aunque la verificación
// haya vencido.
export default function BackofficeVerifyPage() {
  const router = useRouter()
  const T = useT()
  const { theme } = useTheme()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Si ya no hace falta (kill-switch env=0, no enrolado, o ya verificado), no
  // bloquees: vuelve directo al back-office.
  useEffect(() => {
    apiFetch('/api/admin/2fa-status')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d && d.required === false) router.replace('/admin') })
      .catch(() => {})
  }, [])

  async function submit(e) {
    e.preventDefault()
    if (code.length !== 6) return
    setLoading(true); setError('')
    try {
      const res = await apiFetch('/api/admin/2fa-stepup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(typeof data.detail === 'string' ? data.detail : 'Código inválido'); return }
      router.replace('/admin')
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: T.bg, fontFamily: 'Inter, system-ui, sans-serif', padding: 24 }}>
      <form onSubmit={submit} style={{ background: T.card, border: `1px solid ${T.hairline}`, borderRadius: 20, padding: '40px 36px', maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,.18)' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#3D2BFF,#A5B1FF)', margin: '0 auto 18px', display: 'grid', placeItems: 'center' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 6 }}>Verificación de seguridad</div>
        <div style={{ fontSize: 13, color: T.text3, marginBottom: 24, lineHeight: 1.5 }}>
          Para entrar al back-office, introduce el código de 6 dígitos de tu app de autenticación. Se te pedirá cada 15 días.
        </div>
        <input
          aria-label="Código 2FA"
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000" maxLength={6} autoFocus inputMode="numeric"
          style={{ width: '100%', padding: 14, borderRadius: 12, border: `1.5px solid ${theme === 'dark' ? T.hairline : '#e5e9f0'}`, background: theme === 'dark' ? T.bg : '#fff', color: T.text, fontSize: 26, fontFamily: 'monospace', textAlign: 'center', letterSpacing: 8, outline: 'none', marginBottom: 16 }}
        />
        {error && <div style={{ fontSize: 13, color: T.red, marginBottom: 12 }}>{error}</div>}
        <button type="submit" disabled={code.length !== 6 || loading}
          style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: code.length === 6 ? T.blue : (theme === 'dark' ? T.sidebar : '#e5e9f0'), color: code.length === 6 ? '#fff' : T.text4, fontSize: 15, fontWeight: 600, cursor: code.length === 6 ? 'pointer' : 'default', fontFamily: 'inherit' }}>
          {loading ? 'Verificando…' : 'Entrar al back-office'}
        </button>
        <button type="button" onClick={() => router.replace('/dashboard')}
          style={{ marginTop: 14, background: 'none', border: 'none', color: T.text3, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          Volver al dashboard
        </button>
      </form>
    </div>
  )
}
