'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useT, useTheme } from '@/components/ui/tokens'

export default function LoginPage() {
  const router = useRouter()
  const T = useT()
  const { theme } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [needs2FA, setNeeds2FA] = useState(false)
  const [tempToken, setTempToken] = useState(null)
  const [totpCode, setTotpCode] = useState('')
  const [verifying2FA, setVerifying2FA] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const form = new URLSearchParams()
      form.append('username', email)
      form.append('password', password)
      const res = await fetch('http://127.0.0.1:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString()
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || 'Credenciales incorrectas'); return }
      if (data.requires_2fa) {
        setTempToken(data.access_token)
        setNeeds2FA(true)
        setLoading(false)
        return
      }
      localStorage.setItem('nexum_token', data.access_token)
      router.push('/dashboard')
    } catch {
      setError('Error de conexión. Verifica que el servidor esté activo.')
    } finally {
      setLoading(false)
    }
  }


  async function handle2FAVerify(e) {
    e.preventDefault()
    if (totpCode.length !== 6) return
    setVerifying2FA(true)
    setError('')
    try {
      const res = await fetch('http://127.0.0.1:8000/api/auth/2fa/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tempToken}` },
        body: JSON.stringify({ code: totpCode })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || 'Codigo incorrecto'); return }
      localStorage.setItem('nexum_token', data.access_token)
      router.push('/dashboard')
    } catch {
      setError('Error de conexion')
    } finally {
      setVerifying2FA(false)
    }
  }
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body { font-family: 'DM Sans', system-ui, sans-serif; }

        .login-root {
          min-height: 100dvh;
          display: flex;
          background: ${theme === 'dark' ? T.bg : '#f4f6fb'};
          font-family: 'DM Sans', system-ui, sans-serif;
        }

        /* ── Left panel ── */
        .left-panel {
          width: 520px;
          flex-shrink: 0;
          background: #0B1426;
          display: flex;
          flex-direction: column;
          padding: 48px;
          position: relative;
          overflow: hidden;
        }

        /* Subtle mesh background */
        .left-panel::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 60% 50% at 10% 20%, rgba(0,180,216,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 50% 60% at 90% 80%, rgba(37,99,235,0.15) 0%, transparent 60%);
          pointer-events: none;
        }

        /* Grid lines */
        .left-panel::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
        }

        .left-content { position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; }

        /* Vortu logo area */
        .vortu-logo {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 64px;
        }

        .vortu-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, #00B4D8, #2563eb);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 8px 24px rgba(0,180,216,0.3);
        }

        .vortu-name {
          font-size: 24px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.6px;
          line-height: 1;
        }
        .vortu-sub {
          font-size: 11px;
          color: rgba(255,255,255,0.35);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-top: 3px;
        }

        /* Hero text */
        .hero-headline {
          font-family: 'DM Serif Display', serif;
          font-size: 42px;
          color: white;
          line-height: 1.15;
          letter-spacing: -0.5px;
          margin-bottom: 20px;
        }
        .hero-headline em {
          font-style: italic;
          background: linear-gradient(90deg, #00B4D8, #60a5fa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-desc {
          font-size: 14px;
          color: rgba(255,255,255,0.5);
          line-height: 1.7;
          max-width: 340px;
          margin-bottom: 48px;
        }

        /* Feature pills */
        .features {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: auto;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .feature-dot {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          flex-shrink: 0;
        }

        .feature-text {
          font-size: 13px;
          color: rgba(255,255,255,0.55);
          font-weight: 400;
        }
        .feature-text strong {
          color: rgba(255,255,255,0.85);
          font-weight: 600;
        }

        /* Nexum footer */
        .nexum-footer {
          margin-top: 48px;
          padding-top: 24px;
          border-top: 1px solid rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .nexum-logo-mark {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* N logomark SVG inline */
        .nexum-n {
          width: 28px;
          height: 28px;
        }

        .nexum-label {
          font-size: 11px;
          color: rgba(255,255,255,0.25);
          letter-spacing: 0.06em;
        }
        .nexum-label strong {
          color: rgba(255,255,255,0.45);
          font-weight: 600;
        }

        /* ── Right panel ── */
        .right-panel {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px;
        }

        .form-container {
          width: 100%;
          max-width: 420px;
          animation: fadeUp 0.5s ease both;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0);    }
        }

        .form-header {
          margin-bottom: 36px;
        }

        .form-eyebrow {
          font-size: 11px;
          font-weight: 700;
          color: ${T.cyan};
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 10px;
        }

        .form-title {
          font-size: 30px;
          font-weight: 800;
          color: ${T.text};
          letter-spacing: -0.7px;
          line-height: 1.1;
          margin-bottom: 8px;
        }

        .form-subtitle {
          font-size: 14px;
          color: ${T.text3};
          line-height: 1.6;
        }

        /* Form fields */
        .field {
          margin-bottom: 20px;
        }

        .field label {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: ${T.text2};
          margin-bottom: 7px;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }

        .input-wrap {
          position: relative;
        }

        .field-input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1.5px solid ${theme === 'dark' ? T.hairline : '#e5e9f0'};
          background: ${theme === 'dark' ? T.card : 'white'};
          font-size: 14px;
          color: ${T.text};
          font-family: 'DM Sans', system-ui;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .field-input:focus {
          border-color: ${theme === 'dark' ? T.blue : '#0B1426'};
          box-shadow: 0 0 0 3px ${theme === 'dark' ? 'rgba(10,132,255,0.18)' : 'rgba(11,20,38,0.06)'};
        }
        .field-input::placeholder { color: ${T.text4}; }

        .pw-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: ${T.text4};
          display: flex;
          align-items: center;
          padding: 4px;
          transition: color 0.15s;
        }
        .pw-toggle:hover { color: ${T.text}; }

        /* Error */
        .error-box {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          background: ${theme === 'dark' ? T.redSoft : '#fef2f2'};
          border: 1px solid ${theme === 'dark' ? T.red : '#fecaca'};
          border-radius: 10px;
          color: ${theme === 'dark' ? T.red : '#dc2626'};
          font-size: 13px;
          margin-bottom: 20px;
          animation: fadeUp 0.2s ease;
        }

        /* Submit button */
        .submit-btn {
          width: 100%;
          padding: 13px;
          border-radius: 10px;
          border: none;
          background: ${theme === 'dark' ? T.blue : '#0B1426'};
          color: white;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'DM Sans', system-ui;
          letter-spacing: -0.2px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
          margin-bottom: 16px;
        }
        .submit-btn:hover:not(:disabled) {
          background: ${theme === 'dark' ? '#3395FF' : '#162038'};
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(11,20,38,0.25);
        }
        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Loading spinner */
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .divider-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 20px 0;
        }
        .divider-line { flex: 1; height: 1px; background: ${theme === 'dark' ? T.hairline : '#e5e9f0'}; }
        .divider-text { font-size: 12px; color: ${T.text4}; }

        .register-row {
          text-align: center;
          font-size: 13px;
          color: ${T.text3};
        }
        .register-row a {
          color: ${theme === 'dark' ? T.text : '#0B1426'};
          font-weight: 700;
          text-decoration: none;
          border-bottom: 1px solid ${theme === 'dark' ? T.text : '#0B1426'};
          padding-bottom: 1px;
          transition: opacity 0.15s;
        }
        .register-row a:hover { opacity: 0.6; }

        .form-footer {
          margin-top: 40px;
          padding-top: 24px;
          border-top: 1px solid ${theme === 'dark' ? T.hairline : '#f0f2f7'};
          text-align: center;
          font-size: 11px;
          color: ${T.text4};
        }

        /* Responsive */
        @media (max-width: 860px) {
          .left-panel { display: none; }
          .right-panel { padding: 32px 24px; }
        }
      `}</style>

      <div className="login-root">

        {/* ── LEFT PANEL ── */}
        <div className="left-panel">
          <div className="left-content">

            {/* Vortu logo */}
            <div className="vortu-logo">
              <div className="vortu-icon">
                {/* Bar chart icon matching Vortu logo */}
                <svg width="26" height="22" viewBox="0 0 26 22" fill="none">
                  <rect x="1" y="12" width="6" height="10" rx="1.5" fill="rgba(255,255,255,0.6)"/>
                  <rect x="10" y="6" width="6" height="16" rx="1.5" fill="rgba(255,255,255,0.8)"/>
                  <rect x="19" y="1" width="6" height="21" rx="1.5" fill="white"/>
                </svg>
              </div>
              <div>
                <div className="vortu-name">Vortu</div>
                <div className="vortu-sub">by Nexum Solutions</div>
              </div>
            </div>

            {/* Hero */}
            <h1 className="hero-headline">
              Tu negocio,<br/>
              <em>inteligente</em> y<br/>
              siempre activo.
            </h1>
            <p className="hero-desc">
              Gestión empresarial completa potenciada por IA. Contabilidad, finanzas, RR.HH., ventas y mucho más — todo en un solo lugar.
            </p>

            {/* Features */}
            <div className="features">
              {[
                { icon: '📒', title: 'Contabilidad automática', desc: 'Partida doble y PGC español con IA' },
                { icon: '📊', title: 'Análisis financiero en tiempo real', desc: 'P&L, ratios y proyecciones inteligentes' },
                { icon: '🤖', title: 'Agente IA 24/7', desc: 'Monitoriza anomalías y genera alertas' },
                { icon: '🛒', title: 'Punto de venta integrado', desc: 'Códigos Nexum y escáner de barras' },
              ].map(f => (
                <div className="feature-item" key={f.title}>
                  <div className="feature-dot">{f.icon}</div>
                  <div className="feature-text"><strong>{f.title}</strong> — {f.desc}</div>
                </div>
              ))}
            </div>

            {/* Nexum Solutions footer */}
            <div className="nexum-footer">
              {/* Nexum N logomark */}
              <svg className="nexum-n" viewBox="0 0 28 28" fill="none">
                <circle cx="5" cy="5" r="3" stroke="url(#ng)" strokeWidth="1.5"/>
                <circle cx="23" cy="5" r="3" stroke="url(#ng)" strokeWidth="1.5"/>
                <circle cx="5" cy="23" r="3" stroke="url(#ng)" strokeWidth="1.5"/>
                <circle cx="23" cy="23" r="3" stroke="url(#ng)" strokeWidth="1.5"/>
                <line x1="5" y1="5" x2="5" y2="23" stroke="url(#ng)" strokeWidth="1.5"/>
                <line x1="23" y1="5" x2="23" y2="23" stroke="url(#ng)" strokeWidth="1.5"/>
                <line x1="5" y1="5" x2="23" y2="23" stroke="url(#ng)" strokeWidth="1.5"/>
                <defs>
                  <linearGradient id="ng" x1="5" y1="5" x2="23" y2="23" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#00B4D8"/>
                    <stop offset="1" stopColor="#0B1426"/>
                  </linearGradient>
                </defs>
              </svg>
              <div className="nexum-label">Un producto de <strong>Nexum Solutions</strong> · © 2026</div>
            </div>

          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="right-panel">
          <div className="form-container">

            <div className="form-header">
              <div className="form-eyebrow">Bienvenido de vuelta</div>
              <h2 className="form-title">Accede a tu panel</h2>
              <p className="form-subtitle">Introduce tus credenciales para continuar gestionando tu empresa con Vortu.</p>
            </div>

            <form onSubmit={handleLogin}>
              <div className="field">
                <label htmlFor="login-email">Correo electrónico</label>
                <input
                  id="login-email"
                  className="field-input"
                  type="email"
                  placeholder="tu@empresa.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="field">
                <label htmlFor="login-password">Contraseña</label>
                <div className="input-wrap">
                  <input
                    id="login-password"
                    className="field-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    style={{ paddingRight: '44px' }}
                  />
                  <button type="button" className="pw-toggle" onClick={() => setShowPassword(s => !s)} tabIndex={-1} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="error-box">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              <button className="submit-btn" type="submit" disabled={loading}>
                {loading ? (
                  <><div className="spinner" />Iniciando sesión...</>
                ) : (
                  <>Iniciar sesión <span style={{ opacity: 0.5 }}>→</span></>
                )}
              </button>
            </form>

            <div className="divider-row">
              <div className="divider-line" />
              <span className="divider-text">¿Nuevo en Vortu?</span>
              <div className="divider-line" />
            </div>

            <div className="register-row">
              <a href="/register">Crear una cuenta gratis</a>
            </div>

            <div className="form-footer">
              Vortu by Nexum Solutions · Todos los derechos reservados · 2026
            </div>
          </div>
        </div>

      </div>

        {needs2FA && (
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
            <form onSubmit={handle2FAVerify} style={{background:T.card,borderRadius:20,padding:'40px 36px',maxWidth:380,width:'90%',textAlign:'center',boxShadow:'0 20px 60px rgba(0,0,0,.2)'}}>
              <div style={{width:56,height:56,borderRadius:16,background:theme==='dark'?'rgba(10,132,255,.18)':'#eff6ff',margin:'0 auto 16px',display:'grid',placeItems:'center'}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <div style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:6}}>Verificacion 2FA</div>
              <div style={{fontSize:13,color:T.text3,marginBottom:24}}>Introduce el codigo de tu app de autenticacion</div>
              <input aria-label="Código de verificación 2FA" value={totpCode} onChange={e=>setTotpCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="000000" maxLength={6} autoFocus style={{width:'100%',padding:'14px',borderRadius:12,border:`1.5px solid ${theme==='dark'?T.hairline:'#e5e9f0'}`,background:theme==='dark'?T.bg:'#fff',color:T.text,fontSize:24,fontFamily:'monospace',textAlign:'center',letterSpacing:8,outline:'none',marginBottom:16}} />
              {error && <div style={{fontSize:13,color:T.red,marginBottom:12}}>{error}</div>}
              <button type="submit" disabled={totpCode.length!==6||verifying2FA} style={{width:'100%',padding:14,borderRadius:12,border:'none',background:totpCode.length===6?T.blue:(theme==='dark'?T.sidebar:'#e5e9f0'),color:totpCode.length===6?'white':T.text4,fontSize:15,fontWeight:600,cursor:totpCode.length===6?'pointer':'default',fontFamily:'inherit'}}>
                {verifying2FA?'Verificando...':'Continuar'}
              </button>
              <button type="button" onClick={()=>{setNeeds2FA(false);setTempToken(null);setTotpCode('');setError('')}} style={{marginTop:12,background:'none',border:'none',color:T.text3,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Volver al login</button>
            </form>
          </div>
        )}
    </>
  )
}