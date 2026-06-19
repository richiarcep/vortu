'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useT, useTheme } from '@/components/ui/tokens'
import { API_BASE } from '@/lib/api'

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
      const res = await fetch(`${API_BASE}/api/auth/login`, {
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
      localStorage.setItem('vela_token', data.access_token)
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
      const res = await fetch(`${API_BASE}/api/auth/2fa/verify-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tempToken}` },
        body: JSON.stringify({ code: totpCode })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || 'Codigo incorrecto'); return }
      localStorage.setItem('vela_token', data.access_token)
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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body { font-family: 'Inter', system-ui, sans-serif; }

        .login-root {
          min-height: 100dvh;
          display: flex;
          background: ${theme === 'dark' ? T.bg : '#f4f6fb'};
          font-family: 'Inter', system-ui, sans-serif;
        }

        /* ── Left panel ── */
        .left-panel {
          width: 520px;
          flex-shrink: 0;
          background: #0B0D2B;
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
            radial-gradient(ellipse 60% 50% at 10% 20%, rgba(79,70,229,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 50% 60% at 90% 80%, rgba(79,70,229,0.15) 0%, transparent 60%);
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

        /* Vela logo area */
        .vela-logo {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 64px;
        }

        .vela-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, #6366F1, #4F46E5);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 8px 24px rgba(79,70,229,0.3);
        }

        .vela-name {
          font-size: 24px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.6px;
          line-height: 1;
        }
        .vela-sub {
          font-size: 11px;
          color: rgba(255,255,255,0.35);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-top: 3px;
        }

        /* ── Velero Vela navegando (animación) ── */
        .sail-scene { width: 100%; max-width: 300px; margin: -6px 0 34px; }
        .sail-scene svg { width: 100%; height: auto; display: block; overflow: visible; }
        .sail-boat { transform-box: fill-box; transform-origin: 50% 86%; animation: sailBob 4.4s ease-in-out infinite; }
        .sail-wave-a { animation: sailWave 7s linear infinite; }
        .sail-wave-b { animation: sailWave 9s linear infinite; }
        .sail-star  { transform-box: fill-box; transform-origin: center; animation: sailTwinkle 3.2s ease-in-out infinite; }
        @keyframes sailBob { 0%,100% { transform: translateY(0) rotate(-1.8deg); } 50% { transform: translateY(-6px) rotate(1.8deg); } }
        @keyframes sailWave { from { transform: translateX(0); } to { transform: translateX(-40px); } }
        @keyframes sailTwinkle { 0%,100% { opacity: .25; } 50% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .sail-boat, .sail-wave-a, .sail-wave-b, .sail-star { animation: none !important; }
        }

        /* Hero text */
        .hero-headline {
          font-family: 'Inter', system-ui;
          font-size: 42px;
          color: white;
          line-height: 1.15;
          letter-spacing: -0.5px;
          margin-bottom: 20px;
        }
        .hero-headline em {
          font-style: italic;
          background: linear-gradient(90deg, #4F46E5, #A5B1FF);
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

        /* Vela footer */
        .vela-footer {
          margin-top: 48px;
          padding-top: 24px;
          border-top: 1px solid rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .vela-logo-mark {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* N logomark SVG inline */
        .vela-n {
          width: 28px;
          height: 28px;
        }

        .vela-label {
          font-size: 11px;
          color: rgba(255,255,255,0.25);
          letter-spacing: 0.06em;
        }
        .vela-label strong {
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
          font-family: 'Inter', system-ui;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .field-input:focus {
          border-color: ${theme === 'dark' ? T.blue : '#0B0D2B'};
          box-shadow: 0 0 0 3px ${theme === 'dark' ? 'rgba(10,132,255,0.18)' : 'rgba(11,13,43,0.06)'};
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
          background: ${theme === 'dark' ? T.blue : '#0B0D2B'};
          color: white;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Inter', system-ui;
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
          background: ${theme === 'dark' ? '#3395FF' : '#1A1740'};
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(11,13,43,0.25);
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
          color: ${theme === 'dark' ? T.text : '#0B0D2B'};
          font-weight: 700;
          text-decoration: none;
          border-bottom: 1px solid ${theme === 'dark' ? T.text : '#0B0D2B'};
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

            {/* Vela logo */}
            <div className="vela-logo">
              <div className="vela-icon">
                {/* Velero Vela */}
                <svg width="30" height="28" viewBox="0 0 32 30" fill="none">
                  <path d="M18 3C15 9.5 13.3 16 14 21L27 21C23.5 13.5 21 7 18 3Z" fill="#fff"/>
                  <path d="M5.5 24Q16 29.5 27.5 23Q22 27 15.5 27Q9 27 5.5 24Z" fill="rgba(255,255,255,0.82)"/>
                </svg>
              </div>
              <div>
                <div className="vela-name">Vela</div>
              </div>
            </div>

            {/* Velero Vela navegando (animado) */}
            <div className="sail-scene" aria-hidden="true">
              <svg viewBox="0 0 300 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="loginSail" x1="120" y1="20" x2="190" y2="105" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#6366F1"/>
                    <stop offset="1" stopColor="#A5B1FF"/>
                  </linearGradient>
                </defs>

                {/* Constelación titilando */}
                <path d="M44 36 L74 22 L84 46 Z" stroke="#A5B1FF" strokeWidth="1.2" opacity="0.5" fill="none"/>
                <circle className="sail-star" cx="44" cy="36" r="2" fill="#A5B1FF"/>
                <circle className="sail-star" style={{ animationDelay: '.6s' }} cx="84" cy="46" r="2" fill="#A5B1FF"/>
                <circle className="sail-star" style={{ animationDelay: '1.2s' }} cx="74" cy="22" r="2.4" fill="#fff"/>
                <circle className="sail-star" style={{ animationDelay: '1.8s' }} cx="30" cy="60" r="1.5" fill="#A5B1FF"/>
                <circle className="sail-star" style={{ animationDelay: '2.4s' }} cx="102" cy="64" r="1.5" fill="#A5B1FF"/>

                {/* Olas (dos capas en movimiento) */}
                <path className="sail-wave-a" opacity="0.55" stroke="#6366F1" strokeWidth="2" fill="none" strokeLinecap="round"
                  d="M-40 120 q10 -5 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0"/>
                <path className="sail-wave-b" opacity="0.4" stroke="#A5B1FF" strokeWidth="2" fill="none" strokeLinecap="round"
                  d="M-40 131 q10 -4 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0"/>

                {/* Velero (cabecea sobre las olas) */}
                <g className="sail-boat">
                  <line x1="150" y1="34" x2="150" y2="104" stroke="#A5B1FF" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M150 34 C144 54 140 80 141 104 L188 104 C179 78 165 54 150 34 Z" fill="url(#loginSail)"/>
                  <path d="M146 50 C141 68 138 88 139 104 L120 104 C127 86 137 66 146 50 Z" fill="#A5B1FF" opacity="0.7"/>
                  <path d="M116 108 Q150 124 186 107 Q174 119 150 119 Q130 119 116 108 Z" fill="#6366F1"/>
                </g>
              </svg>
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
                { icon: '🛒', title: 'Punto de venta integrado', desc: 'Códigos Vela y escáner de barras' },
              ].map(f => (
                <div className="feature-item" key={f.title}>
                  <div className="feature-dot">{f.icon}</div>
                  <div className="feature-text"><strong>{f.title}</strong> — {f.desc}</div>
                </div>
              ))}
            </div>

            {/* Vela footer */}
            <div className="vela-footer">
              {/* Velero Vela */}
              <svg className="vela-n" viewBox="0 0 28 28" fill="none">
                <path d="M16 4C13.5 9 12 14 12.5 18.5L24 18.5C21 12.5 19 7.5 16 4Z" fill="url(#ng)"/>
                <path d="M5 21Q14 26 24 20.5Q19.5 24 14.5 24Q9 24 5 21Z" fill="#6366F1"/>
                <defs>
                  <linearGradient id="ng" x1="12" y1="4" x2="24" y2="19" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#6366F1"/>
                    <stop offset="1" stopColor="#A5B1FF"/>
                  </linearGradient>
                </defs>
              </svg>
              <div className="vela-label">Un producto de <strong>Vela</strong> · © 2026</div>
            </div>

          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="right-panel">
          <div className="form-container">

            <div className="form-header">
              <div className="form-eyebrow">Bienvenido de vuelta</div>
              <h2 className="form-title">Accede a tu panel</h2>
              <p className="form-subtitle">Introduce tus credenciales para continuar gestionando tu empresa con Vela.</p>
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
              <span className="divider-text">¿Nuevo en Vela?</span>
              <div className="divider-line" />
            </div>

            <div className="register-row">
              <a href="/register">Crear una cuenta gratis</a>
            </div>

            <div className="form-footer">
              Vela · Todos los derechos reservados · 2026
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