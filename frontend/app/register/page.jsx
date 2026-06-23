'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useT, useTheme } from '@/components/ui/tokens'

import { API_BASE as API } from '@/lib/api'
import BrandLogo from '@/components/ui/BrandLogo'

export default function RegisterPage() {
  const router = useRouter()
  const T = useT()
  const { theme } = useTheme()
  const [fullName, setFullName]         = useState('')
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [confirmPassword, setConfirm]   = useState('')
  const [companyName, setCompanyName]   = useState('')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [showPassword, setShowPassword] = useState(false)

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name:    fullName,
          email:        email,
          password:     password,
          company_name: companyName,
          country:      null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'Error al crear la cuenta.')
        return
      }
      // Login automático tras registro
      const form = new URLSearchParams()
      form.append('username', email)
      form.append('password', password)
      const loginRes = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      })
      const loginData = await loginRes.json()
      if (!loginRes.ok) {
        setError('Cuenta creada. Inicia sesión manualmente.')
        router.push('/login')
        return
      }
      localStorage.setItem('vela_token', loginData.access_token)
      router.push('/onboarding')
    } catch {
      setError('Error de conexión. Verifica que el servidor esté activo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', system-ui, sans-serif; }

        .register-root {
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
        .left-panel::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 60% 50% at 10% 20%, rgba(61,43,255,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 50% 60% at 90% 80%, rgba(61,43,255,0.15) 0%, transparent 60%);
          pointer-events: none;
        }
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

        .vela-logo { display: flex; align-items: center; gap: 14px; margin-bottom: 64px; }
        .vela-icon {
          width: 48px; height: 48px; border-radius: 12px;
          background: linear-gradient(135deg, #3D2BFF, #6366F1);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; box-shadow: 0 8px 24px rgba(61,43,255,0.3);
        }
        .vela-name { font-size: 24px; font-weight: 800; color: white; letter-spacing: -0.6px; line-height: 1; }
        .vela-sub  { font-size: 11px; color: rgba(255,255,255,0.35); letter-spacing: 0.08em; text-transform: uppercase; margin-top: 3px; }

        .hero-headline {
          font-family: 'Inter', system-ui;
          font-size: 38px; color: white; line-height: 1.15;
          letter-spacing: -0.5px; margin-bottom: 20px;
        }
        .hero-headline em {
          font-style: italic;
          background: linear-gradient(90deg, #3D2BFF, #A5B1FF);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .hero-desc { font-size: 14px; color: rgba(255,255,255,0.5); line-height: 1.7; max-width: 340px; margin-bottom: 40px; }

        .steps { display: flex; flex-direction: column; gap: 16px; margin-bottom: auto; }
        .step-item { display: flex; align-items: flex-start; gap: 14px; }
        .step-num {
          width: 28px; height: 28px; border-radius: 999px;
          background: rgba(61,43,255,0.2); border: 1px solid rgba(61,43,255,0.4);
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; color: #3D2BFF; flex-shrink: 0; margin-top: 1px;
        }
        .step-text { font-size: 13px; color: rgba(255,255,255,0.55); line-height: 1.5; }
        .step-text strong { color: rgba(255,255,255,0.85); font-weight: 600; }

        .vela-footer {
          margin-top: 48px; padding-top: 24px;
          border-top: 1px solid rgba(255,255,255,0.06);
          display: flex; align-items: center; gap: 10px;
        }
        .vela-n { width: 28px; height: 28px; }
        .vela-label { font-size: 11px; color: rgba(255,255,255,0.25); letter-spacing: 0.06em; }
        .vela-label strong { color: rgba(255,255,255,0.45); font-weight: 600; }

        /* ── Right panel ── */
        .right-panel {
          flex: 1; display: flex; align-items: center;
          justify-content: center; padding: 48px;
          overflow-y: auto;
        }
        .form-container {
          width: 100%; max-width: 440px;
          animation: fadeUp 0.5s ease both;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .form-header { margin-bottom: 32px; }
        .form-eyebrow {
          font-size: 11px; font-weight: 700; color: ${T.cyan};
          text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px;
        }
        .form-title {
          font-size: 28px; font-weight: 800; color: ${T.text};
          letter-spacing: -0.7px; line-height: 1.1; margin-bottom: 8px;
        }
        .form-subtitle { font-size: 14px; color: ${T.text3}; line-height: 1.6; }

        .field { margin-bottom: 18px; }
        .field label {
          display: block; font-size: 12px; font-weight: 700; color: ${T.text2};
          margin-bottom: 7px; letter-spacing: 0.03em; text-transform: uppercase;
        }
        .field-input {
          width: 100%; padding: 12px 14px; border-radius: 10px;
          border: 1.5px solid ${theme === 'dark' ? T.hairline : '#e5e9f0'}; background: ${theme === 'dark' ? T.card : 'white'};
          font-size: 14px; color: ${T.text}; font-family: 'Inter', system-ui;
          outline: none; transition: border-color 0.15s, box-shadow 0.15s;
        }
        .field-input:focus { border-color: ${theme === 'dark' ? T.blue : '#0B0D2B'}; box-shadow: 0 0 0 3px ${theme === 'dark' ? 'rgba(10,132,255,0.18)' : 'rgba(11,13,43,0.06)'}; }
        .field-input::placeholder { color: ${T.text4}; }

        .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

        .input-wrap { position: relative; }
        .pw-toggle {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: ${T.text4};
          display: flex; align-items: center; padding: 4px; transition: color 0.15s;
        }
        .pw-toggle:hover { color: ${T.text}; }

        .divider {
          display: flex; align-items: center; gap: 10px;
          margin: 6px 0 18px; font-size: 11px; color: ${T.text4};
        }
        .divider-line { flex: 1; height: 1px; background: ${theme === 'dark' ? T.hairline : '#e5e9f0'}; }

        .error-box {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 14px; background: ${theme === 'dark' ? T.redSoft : '#fef2f2'}; border: 1px solid ${theme === 'dark' ? T.red : '#fecaca'};
          border-radius: 10px; color: ${theme === 'dark' ? T.red : '#dc2626'}; font-size: 13px;
          margin-bottom: 18px; animation: fadeUp 0.2s ease;
        }
        .submit-btn {
          width: 100%; padding: 13px; border-radius: 10px; border: none;
          background: ${theme === 'dark' ? T.blue : '#0B0D2B'}; color: white; font-size: 14px; font-weight: 700;
          cursor: pointer; font-family: 'Inter', system-ui; letter-spacing: -0.2px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: all 0.2s; margin-bottom: 16px;
        }
        .submit-btn:hover:not(:disabled) {
          background: ${theme === 'dark' ? '#3395FF' : '#161A52'}; transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(11,13,43,0.25);
        }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .spinner {
          width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white; border-radius: 50%;
          animation: spin 0.7s linear infinite; flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .login-row { text-align: center; font-size: 13px; color: ${T.text3}; }
        .login-row a {
          color: ${theme === 'dark' ? T.text : '#0B0D2B'}; font-weight: 700; text-decoration: none;
          border-bottom: 1px solid ${theme === 'dark' ? T.text : '#0B0D2B'}; padding-bottom: 1px; transition: opacity 0.15s;
        }
        .login-row a:hover { opacity: 0.6; }

        .form-footer {
          margin-top: 32px; padding-top: 20px; border-top: 1px solid ${theme === 'dark' ? T.hairline : '#f0f2f7'};
          text-align: center; font-size: 11px; color: ${T.text4};
        }
        .terms { font-size: 11px; color: ${T.text4}; text-align: center; margin-bottom: 16px; line-height: 1.6; }

        @media (max-width: 860px) {
          .left-panel { display: none; }
          .right-panel { padding: 32px 24px; }
        }
      `}</style>

      <div className="register-root">

        {/* ── LEFT PANEL ── */}
        <div className="left-panel">
          <div className="left-content">

            <div className="vela-logo">
              <BrandLogo size={40} tone="dark" />
            </div>

            <h1 className="hero-headline">
              Empieza hoy.<br/>
              Tu negocio,<br/>
              <em>todo en uno.</em>
            </h1>
            <p className="hero-desc">
              Crea tu cuenta gratis en segundos. Sin tarjeta de crédito, sin contratos. Configura tu empresa y empieza a gestionar desde el primer día.
            </p>

            <div className="steps">
              {[
                { n:'1', title:'Crea tu cuenta',        desc:'Nombre, email y contraseña. Listo en 30 segundos.' },
                { n:'2', title:'Elige tu jurisdicción', desc:'Configuramos tu sistema fiscal y contable según tu país.' },
                { n:'3', title:'Empieza a gestionar',   desc:'Dashboard, ventas, contabilidad y Agente IA listos.' },
              ].map(step => (
                <div className="step-item" key={step.n}>
                  <div className="step-num">{step.n}</div>
                  <div className="step-text"><strong>{step.title}</strong> — {step.desc}</div>
                </div>
              ))}
            </div>

            <div className="vela-footer">
              <svg className="vela-n" viewBox="0 0 28 28" fill="none">
                <circle cx="5"  cy="5"  r="3" stroke="url(#ng)" strokeWidth="1.5"/>
                <circle cx="23" cy="5"  r="3" stroke="url(#ng)" strokeWidth="1.5"/>
                <circle cx="5"  cy="23" r="3" stroke="url(#ng)" strokeWidth="1.5"/>
                <circle cx="23" cy="23" r="3" stroke="url(#ng)" strokeWidth="1.5"/>
                <line x1="5"  y1="5"  x2="5"  y2="23" stroke="url(#ng)" strokeWidth="1.5"/>
                <line x1="23" y1="5"  x2="23" y2="23" stroke="url(#ng)" strokeWidth="1.5"/>
                <line x1="5"  y1="5"  x2="23" y2="23" stroke="url(#ng)" strokeWidth="1.5"/>
                <defs>
                  <linearGradient id="ng" x1="5" y1="5" x2="23" y2="23" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#3D2BFF"/>
                    <stop offset="1" stopColor="#0B0D2B"/>
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
              <div className="form-eyebrow">Registro gratuito</div>
              <h2 className="form-title">Crea tu cuenta</h2>
              <p className="form-subtitle">Completa los datos de tu empresa para empezar. Solo toma un minuto.</p>
            </div>

            <form onSubmit={handleRegister}>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="reg-fullname">Nombre completo</label>
                  <input id="reg-fullname" className="field-input" type="text" placeholder="Juan García"
                    value={fullName} onChange={e => setFullName(e.target.value)} required autoComplete="name"/>
                </div>
                <div className="field">
                  <label htmlFor="reg-company">Empresa</label>
                  <input id="reg-company" className="field-input" type="text" placeholder="Mi Empresa SL"
                    value={companyName} onChange={e => setCompanyName(e.target.value)} required autoComplete="organization"/>
                </div>
              </div>

              <div className="field">
                <label htmlFor="reg-email">Correo electrónico</label>
                <input id="reg-email" className="field-input" type="email" placeholder="tu@empresa.com"
                  value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"/>
              </div>

              <div className="divider">
                <div className="divider-line"/>
                <span>Contraseña</span>
                <div className="divider-line"/>
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="reg-password">Contraseña</label>
                  <div className="input-wrap">
                    <input id="reg-password" className="field-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mín. 8 caracteres"
                      value={password} onChange={e => setPassword(e.target.value)}
                      required autoComplete="new-password" style={{paddingRight:'44px'}}/>
                    <button type="button" className="pw-toggle"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onClick={() => setShowPassword(s => !s)} tabIndex={-1}>
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
                <div className="field">
                  <label htmlFor="reg-confirm">Confirmar</label>
                  <input id="reg-confirm" className="field-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Repite la contraseña"
                    value={confirmPassword} onChange={e => setConfirm(e.target.value)}
                    required autoComplete="new-password"/>
                </div>
              </div>

              {error && (
                <div className="error-box">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:'1px'}}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              <p className="terms">
                Al registrarte aceptas los <a href="#" style={{color:theme==='dark'?T.text:'#0B0D2B',fontWeight:600}}>Términos de servicio</a> y la <a href="#" style={{color:theme==='dark'?T.text:'#0B0D2B',fontWeight:600}}>Política de privacidad</a> de Vela.
              </p>

              <button className="submit-btn" type="submit" disabled={loading}>
                {loading ? (
                  <><div className="spinner"/>Creando cuenta...</>
                ) : (
                  <>Crear cuenta gratis <span style={{opacity:0.5}}>→</span></>
                )}
              </button>

            </form>

            <div className="login-row">
              ¿Ya tienes cuenta? <a href="/login">Inicia sesión</a>
            </div>

            <div className="form-footer">
              Vela · Todos los derechos reservados · 2026
            </div>

          </div>
        </div>

      </div>
    </>
  )
}
