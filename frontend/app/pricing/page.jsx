'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { API_BASE } from '@/lib/api'

const NAVY  = '#0B0D2B'
const CYAN  = '#3D2BFF'
const BLUE  = '#6366F1'
const GREEN = '#059669'
const AMBER = '#d97706'
const RED   = '#dc2626'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    emoji: '🥉',
    tagline: 'Para autónomos y microempresas',
    monthly: 29,
    users: 1,
    ai: '50 consultas/mes',
    docs: '25 documentos/mes',
    color: '#6b7280',
    highlight: false,
    modules: ['Dashboard', 'Contabilidad', 'Finanzas', 'Ventas básica'],
    missing: ['RR.HH.', 'Proyectos', 'Clientes', 'Documentos', 'Agente IA', 'Marketing IA'],
  },
  {
    id: 'pro',
    name: 'Pro',
    emoji: '🥈',
    tagline: 'El más elegido por pymes',
    monthly: 59,
    users: 3,
    ai: '500 consultas/mes',
    docs: '50 documentos/mes',
    color: NAVY,
    highlight: true,
    modules: ['Dashboard', 'Contabilidad', 'Finanzas', 'Ventas', 'RR.HH.', 'Proyectos', 'Clientes', 'Documentos', 'Agente IA'],
    missing: ['Marketing IA'],
  },
  {
    id: 'business',
    name: 'Business',
    emoji: '🥇',
    tagline: 'Para empresas en crecimiento',
    monthly: 119,
    users: 10,
    ai: 'IA ilimitada',
    docs: 'Documentos ilimitados',
    color: CYAN,
    highlight: false,
    modules: ['Dashboard', 'Contabilidad', 'Finanzas', 'Ventas', 'RR.HH.', 'Proyectos', 'Clientes', 'Documentos', 'Agente IA', 'Marketing IA'],
    missing: [],
  },
]

const MODULE_ICONS = {
  'Dashboard': '◈',
  'Contabilidad': '📒',
  'Finanzas': '💰',
  'Ventas': '🛒',
  'Ventas básica': '🛒',
  'RR.HH.': '👥',
  'Proyectos': '📋',
  'Clientes': '💬',
  'Documentos': '📁',
  'Agente IA': '🤖',
  'Marketing IA': '📣',
}

function CountUp({ end, duration = 1200, prefix = '', suffix = '' }) {
  const [count, setCount] = useState(0)
  const ref = useRef()
  useEffect(() => {
    const start = Date.now()
    const step = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * end))
      if (progress < 1) ref.current = requestAnimationFrame(step)
    }
    ref.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(ref.current)
  }, [end, duration])
  return <span>{prefix}{count.toLocaleString('es-ES')}{suffix}</span>
}

function PlanCard({ plan, onChoose, loading }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderRadius: '20px',
        border: plan.highlight ? `2px solid ${NAVY}` : '1px solid #e5e9f0',
        background: plan.highlight ? NAVY : 'white',
        padding: '32px 28px',
        display: 'flex',
        flexDirection: 'column',
        transform: plan.highlight ? 'scale(1.04)' : hovered ? 'translateY(-4px)' : 'none',
        transition: 'all 0.25s ease',
        boxShadow: plan.highlight
          ? '0 24px 64px rgba(11,13,43,0.25)'
          : hovered ? '0 16px 40px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.04)',
        zIndex: plan.highlight ? 2 : 1,
      }}>

      {/* Popular badge — Social Proof */}
      {plan.highlight && (
        <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: `linear-gradient(135deg, ${CYAN}, ${BLUE})`, color: 'white', fontSize: '11px', fontWeight: '800', padding: '4px 16px', borderRadius: '20px', whiteSpace: 'nowrap', letterSpacing: '0.05em', boxShadow: '0 4px 12px rgba(61,43,255,0.4)' }}>
          ⭐ MÁS POPULAR
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>{plan.emoji}</div>
        <div style={{ fontSize: '22px', fontWeight: '800', color: plan.highlight ? 'white' : NAVY, letterSpacing: '-0.5px', marginBottom: '4px' }}>{plan.name}</div>
        <div style={{ fontSize: '13px', color: plan.highlight ? 'rgba(255,255,255,0.5)' : '#6b7280' }}>{plan.tagline}</div>
      </div>

      {/* Pricing */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', marginBottom: '4px' }}>
          <span style={{ fontSize: '48px', fontWeight: '800', color: plan.highlight ? 'white' : NAVY, letterSpacing: '-2px', lineHeight: 1 }}>€{plan.monthly}</span>
          <span style={{ fontSize: '14px', color: plan.highlight ? 'rgba(255,255,255,0.5)' : '#6b7280', marginBottom: '8px' }}>/mes</span>
        </div>
        <div style={{ fontSize: '11px', color: plan.highlight ? 'rgba(255,255,255,0.3)' : '#9ca3af', marginTop: '6px' }}>
          {plan.users} usuario{plan.users > 1 ? 's' : ''} incluido{plan.users > 1 ? 's' : ''} · +€8/usuario extra
        </div>
      </div>

      {/* CTA — Default selection on Pro */}
      <button
        onClick={() => onChoose(plan.id)}
        disabled={loading === plan.id}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '12px',
          border: plan.highlight ? 'none' : `2px solid ${NAVY}`,
          background: plan.highlight ? `linear-gradient(135deg, ${CYAN}, ${BLUE})` : 'white',
          color: plan.highlight ? 'white' : NAVY,
          fontWeight: '800',
          fontSize: '14px',
          cursor: loading === plan.id ? 'not-allowed' : 'pointer',
          fontFamily: "'Inter', system-ui",
          letterSpacing: '-0.2px',
          marginBottom: '24px',
          transition: 'all 0.15s',
          opacity: loading === plan.id ? 0.7 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: plan.highlight ? '0 8px 24px rgba(61,43,255,0.4)' : 'none',
        }}>
        {loading === plan.id
          ? <><span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Iniciando...</>
          : `Empezar con ${plan.name} →`
        }
      </button>

      {/* Modules */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: plan.highlight ? 'rgba(255,255,255,0.4)' : '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Módulos incluidos</div>
        {plan.modules.map(m => (
          <div key={m} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: plan.highlight ? 'rgba(61,43,255,0.2)' : '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', flexShrink: 0 }}>✓</span>
            <span style={{ fontSize: '13px', color: plan.highlight ? 'rgba(255,255,255,0.85)' : '#374151' }}>{MODULE_ICONS[m]} {m}</span>
          </div>
        ))}
        {plan.missing.map(m => (
          <div key={m} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', opacity: 0.35 }}>
            <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', flexShrink: 0, color: '#9ca3af' }}>—</span>
            <span style={{ fontSize: '13px', color: plan.highlight ? 'rgba(255,255,255,0.3)' : '#9ca3af' }}>{MODULE_ICONS[m]} {m}</span>
          </div>
        ))}
      </div>

      {/* IA limits */}
      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${plan.highlight ? 'rgba(255,255,255,0.1)' : '#f0f2f7'}` }}>
        {[
          { icon: '🤖', label: plan.ai },
          { icon: '📄', label: plan.docs },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px' }}>{item.icon}</span>
            <span style={{ fontSize: '12px', color: plan.highlight ? 'rgba(255,255,255,0.5)' : '#6b7280' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PricingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(null)
  const [trialLoading, setTrialLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showFaq, setShowFaq] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('vela_token')
    setIsLoggedIn(!!token)
  }, [])

  async function handleChoosePlan(planId) {
    const token = localStorage.getItem('vela_token')
    if (!token) { router.push('/login?redirect=/pricing'); return }
    setLoading(planId)
    try {
      const res = await fetch(`${API_BASE}/api/billing/subscription/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan_id: planId }),
      })
      const data = await res.json()
      if (data.checkout_url) window.location.href = data.checkout_url
      else alert(data.detail || 'No se pudo iniciar el checkout. Inténtalo de nuevo.')
    } catch { alert('Error de conexión') } finally { setLoading(null) }
  }

  function handleTrial() {
    // El trial se activa al registrarse. Usuarios nuevos → registro;
    // usuarios ya autenticados → su panel (ya tienen cuenta/trial activo).
    const token = localStorage.getItem('vela_token')
    router.push(token ? '/dashboard' : '/register')
  }

  const faqs = [
    { q: '¿Puedo cambiar de plan después?', a: 'Sí, en cualquier momento desde Ajustes → Facturación. Si subes de plan, se aplica un prorrateo proporcional al tiempo restante del mes.' },
    { q: '¿Qué pasa si supero el límite de consultas IA?', a: 'Vela te avisa antes de llegar al límite. Puedes subir de plan o esperar al próximo ciclo de facturación. Nunca se te cobra automáticamente extra.' },
    { q: '¿Cómo funciona el free trial?', a: '14 días con acceso completo al plan Business. Se requiere tarjeta de crédito para activarlo — si cancelas antes del día 14, no se te cobra nada. Si no cancelas, convierte automáticamente al plan Business.' },
    { q: '¿Los usuarios adicionales se pueden añadir en cualquier momento?', a: 'Sí. Desde Ajustes → Equipo, el administrador puede añadir usuarios a €8/mes cada uno. Se cobran de forma prorrateada el primer mes.' },
    { q: '¿Funciona en cualquier país?', a: 'Sí. Vela acepta tarjetas de crédito, débito y transferencias bancarias en todo el mundo a través de Stripe. Los precios se muestran en EUR.' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6fb', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:5px;} ::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:3px;}
      `}</style>

      {/* NAV */}
      <nav style={{ background: 'white', borderBottom: '1px solid #e5e9f0', padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>
          <div style={{ width: '32px', height: '32px', background: NAVY, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><path d="M4 16V4L16 16V4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: NAVY, lineHeight: 1 }}>Vela</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {isLoggedIn
            ? <button onClick={() => router.push('/dashboard')} style={{ padding: '9px 20px', borderRadius: '9px', border: 'none', background: NAVY, color: 'white', fontWeight: '700', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>Ir al panel →</button>
            : <>
                <button onClick={() => router.push('/login')} style={{ padding: '9px 20px', borderRadius: '9px', border: '1px solid #e5e9f0', background: 'white', color: NAVY, fontWeight: '600', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>Iniciar sesión</button>
                <button onClick={handleTrial} style={{ padding: '9px 20px', borderRadius: '9px', border: 'none', background: NAVY, color: 'white', fontWeight: '700', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>Prueba gratis 14 días</button>
              </>
          }
        </div>
      </nav>

      {/* HERO */}
      <div style={{ textAlign: 'center', padding: '72px 40px 48px', animation: 'fadeUp 0.5s ease' }}>
        {/* Trial banner — Scarcity + Endowment Effect */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: `linear-gradient(135deg, ${CYAN}15, ${BLUE}15)`, border: `1px solid ${CYAN}40`, borderRadius: '20px', padding: '6px 16px', marginBottom: '24px' }}>
          <span style={{ fontSize: '14px' }}>🎁</span>
          <span style={{ fontSize: '13px', fontWeight: '600', color: NAVY }}>14 días gratis con acceso completo · Sin compromiso · Cancela cuando quieras</span>
        </div>

        <h1 style={{ fontFamily: "'Inter', system-ui", fontSize: '52px', color: NAVY, letterSpacing: '-1px', lineHeight: 1.1, marginBottom: '16px', margin: '0 auto 16px' }}>
          Gestiona tu empresa con<br/><em style={{ color: CYAN }}>inteligencia artificial</em>
        </h1>
        <p style={{ fontSize: '18px', color: '#6b7280', maxWidth: '500px', margin: '0 auto 32px', lineHeight: '1.6' }}>
          Contabilidad, ventas, proyectos, marketing y mucho más. Todo en Vela.
        </p>

        {/* Social proof — números */}
        <div style={{ display: 'flex', gap: '32px', justifyContent: 'center', marginBottom: '48px' }}>
          {[
            { value: 500, suffix: '+', label: 'pymes activas' },
            { value: 98, suffix: '%', label: 'satisfacción' },
            { value: 14, suffix: 'h', label: 'ahorradas/semana' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: '800', color: NAVY, letterSpacing: '-0.5px' }}>
                <CountUp end={s.value} suffix={s.suffix} />
              </div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Pago mensual, sin permanencia */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>
          <span>Facturación mensual · Sin permanencia · Cancela cuando quieras</span>
        </div>
      </div>

      {/* PRICING CARDS */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 40px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', alignItems: 'center' }}>
          {PLANS.map(plan => (
            <PlanCard key={plan.id} plan={plan} onChoose={handleChoosePlan} loading={loading} />
          ))}
        </div>

        {/* Enterprise row */}
        <div style={{ marginTop: '20px', background: 'white', borderRadius: '16px', border: '1px solid #e5e9f0', padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '28px' }}>🏢</div>
            <div>
              <div style={{ fontSize: '17px', fontWeight: '800', color: NAVY, letterSpacing: '-0.3px' }}>Enterprise</div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>Instancia dedicada · Usuarios ilimitados · SLA garantizado · Onboarding con Vela</div>
            </div>
          </div>
          <button onClick={() => window.open('mailto:hola@vela.com?subject=Vela Enterprise', '_blank')} style={{ padding: '12px 28px', borderRadius: '10px', border: `2px solid ${NAVY}`, background: 'white', color: NAVY, fontWeight: '700', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Contactar →</button>
        </div>

        {/* Trial CTA — Endowment Effect */}
        <div style={{ marginTop: '48px', background: NAVY, borderRadius: '20px', padding: '48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 60% 80% at 50% 0%, ${CYAN}20, transparent)`, pointerEvents: 'none' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: CYAN, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Sin tarjeta necesaria para registrarse</div>
            <h2 style={{ fontFamily: "'Inter', system-ui", fontSize: '36px', color: 'white', letterSpacing: '-0.5px', marginBottom: '12px', lineHeight: 1.2 }}>
              14 días con todo Business<br/>completamente gratis
            </h2>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.55)', marginBottom: '28px', maxWidth: '440px', margin: '0 auto 28px', lineHeight: '1.6' }}>
              Experimenta Vela al completo. Si no te convence, cancela sin preguntas. Si te queda, introduces tu tarjeta al final del trial.
            </p>
            <button onClick={handleTrial} disabled={trialLoading} style={{ padding: '16px 40px', borderRadius: '12px', border: 'none', background: `linear-gradient(135deg, ${CYAN}, ${BLUE})`, color: 'white', fontWeight: '800', fontSize: '16px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '-0.2px', boxShadow: '0 8px 32px rgba(61,43,255,0.4)', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
              {trialLoading ? <><span style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />Iniciando...</> : '🚀 Empezar prueba gratuita'}
            </button>
            <div style={{ marginTop: '14px', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
              Se activa automáticamente al registrarte · Tarjeta requerida al finalizar el trial
            </div>
          </div>
        </div>

        {/* Trust signals */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '48px' }}>
          {[
            { icon: '🔒', title: 'Pago seguro', desc: 'Stripe — estándar global PCI DSS' },
            { icon: '🌍', title: 'Global', desc: 'Disponible en 195 países' },
            { icon: '↩️', title: 'Sin permanencia', desc: 'Cancela cuando quieras' },
            { icon: '📞', title: 'Soporte incluido', desc: 'Chat y email en todos los planes' },
          ].map(t => (
            <div key={t.title} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e9f0', padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{t.icon}</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: NAVY, marginBottom: '4px' }}>{t.title}</div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>{t.desc}</div>
            </div>
          ))}
        </div>

        {/* FAQ — Curiosity Gap */}
        <div style={{ marginTop: '64px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: NAVY, letterSpacing: '-0.5px', textAlign: 'center', marginBottom: '32px' }}>Preguntas frecuentes</h2>
          <div style={{ display: 'grid', gap: '10px' }}>
            {faqs.map((faq, i) => (
              <div key={i} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e9f0', overflow: 'hidden' }}>
                <button onClick={() => setShowFaq(showFaq === i ? null : i)} style={{ width: '100%', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: NAVY }}>{faq.q}</span>
                  <span style={{ fontSize: '18px', color: '#9ca3af', transition: 'transform 0.2s', transform: showFaq === i ? 'rotate(45deg)' : 'none', flexShrink: 0, marginLeft: '16px' }}>+</span>
                </button>
                {showFaq === i && (
                  <div style={{ padding: '0 22px 18px', fontSize: '13.5px', color: '#374151', lineHeight: '1.7', animation: 'fadeUp 0.2s ease' }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '64px', paddingTop: '32px', borderTop: '1px solid #e5e9f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', background: NAVY, borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M4 16V4L16 16V4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: NAVY }}>Vela</div>
              <div style={{ fontSize: '10px', color: '#9ca3af' }}>© 2026</div>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
            <a href="mailto:hola@vela.com" style={{ color: '#9ca3af', textDecoration: 'none' }}>hola@vela.com</a>
          </div>
        </div>
      </div>
    </div>
  )
}