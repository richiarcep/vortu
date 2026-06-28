'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { API_BASE } from '@/lib/api'
import { useT } from '@/components/ui/tokens'
import BrandLogo from '@/components/ui/BrandLogo'

// Reads the ?token from the verify link emailed at register/resend, confirms it
// against POST /api/auth/verify-email (single-use, server-side), and lets the user
// request a fresh link if it expired. The login gate stays server-side; this page
// just drives the UX.
export default function VerifyEmailPage() {
  const router = useRouter()
  const T = useT()
  const [status, setStatus] = useState('verifying')   // verifying | ok | error
  const [msg, setMsg] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [resent, setResent] = useState(false)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token')
    if (!token) { setStatus('error'); setMsg('Falta el token de verificación en el enlace.'); return }
    ;(async () => {
      try {
        const r = await fetch(`${API_BASE}/api/auth/verify-email`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const d = await r.json().catch(() => ({}))
        if (r.ok) { setStatus('ok'); setMsg('¡Correo verificado! Ya puedes iniciar sesión.') }
        else { setStatus('error'); setMsg(d.detail || 'El enlace no es válido o ha caducado.') }
      } catch { setStatus('error'); setMsg('Error de conexión. Inténtalo de nuevo.') }
    })()
  }, [])

  async function resend() {
    if (!resendEmail || resending) return
    setResending(true)
    try {
      await fetch(`${API_BASE}/api/auth/resend-verification`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail }),
      })
      setResent(true)   // generic success (anti-enumeration: backend never says if the email exists)
    } catch { /* generic */ setResent(true) }
    finally { setResending(false) }
  }

  const card = {
    background: T.card, border: `.5px solid ${T.hairline}`, borderRadius: 18,
    padding: '40px 36px', width: '100%', maxWidth: 440, textAlign: 'center',
    boxShadow: '0 12px 40px rgba(0,0,0,.06)',
  }
  const btn = {
    padding: '11px 22px', borderRadius: 10, border: 'none', background: T.blue,
    color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: T.bg, fontFamily: '-apple-system, system-ui, Inter, sans-serif', padding: 20 }}>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}><BrandLogo /></div>

        {status === 'verifying' && (
          <>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>Verificando tu correo…</div>
            <div style={{ fontSize: 13, color: T.text3, marginTop: 8 }}>Un momento.</div>
          </>
        )}

        {status === 'ok' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>Correo verificado</div>
            <div style={{ fontSize: 13.5, color: T.text3, margin: '10px 0 24px' }}>{msg}</div>
            <button style={btn} onClick={() => router.push('/login')}>Iniciar sesión</button>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>No se pudo verificar</div>
            <div style={{ fontSize: 13.5, color: T.text3, margin: '10px 0 22px' }}>{msg}</div>
            {resent ? (
              <div style={{ fontSize: 13.5, color: '#059669', fontWeight: 600 }}>
                Si ese correo existe y no está verificado, te enviamos un enlace nuevo. Revisa tu bandeja.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 12.5, color: T.text3 }}>¿Caducó? Pide un enlace nuevo:</div>
                <input
                  type="email" value={resendEmail} placeholder="tu@correo.com"
                  onChange={(e) => setResendEmail(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: 10, border: `.5px solid ${T.hairline}`,
                           fontSize: 14, fontFamily: 'inherit', outline: 'none', background: T.bg, color: T.text }}
                />
                <button style={{ ...btn, opacity: resending ? .6 : 1 }} onClick={resend} disabled={resending}>
                  {resending ? 'Enviando…' : 'Reenviar verificación'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
