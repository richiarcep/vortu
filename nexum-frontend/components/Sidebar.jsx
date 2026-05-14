'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const NAVY = '#0B1426'
const CYAN = '#00B4D8'
const BLUE = '#2563eb'
const AMBER = '#d97706'
const RED = '#DC2626'

const PLAN_MODULES = {
  starter:  ['dashboard', 'contabilidad', 'ventas', 'clientes'],
  pro:      ['dashboard', 'contabilidad', 'finanzas', 'hr', 'ventas', 'clientes', 'documentos', 'agente', 'marketing', 'costes'],
  business: ['dashboard', 'contabilidad', 'finanzas', 'hr', 'proyectos', 'ventas', 'clientes', 'documentos', 'agente', 'marketing', 'costes'],
  admin:    'all',
}

const ALL_MODULES = [
  { id: 'dashboard',    label: 'Dashboard',        href: '/dashboard',    icon: '◈' },
  { id: 'contabilidad', label: 'Contabilidad',     href: '/contabilidad', icon: '📒' },
  { id: 'finanzas',     label: 'Finanzas',         href: '/finanzas',     icon: '💰' },
  { id: 'hr',           label: 'Recursos Humanos', href: '/hr',           icon: '👥' },
  { id: 'proyectos',    label: 'Proyectos',        href: '/proyectos',    icon: '📋' },
  { id: 'clientes',     label: 'Clientes',         href: '/clientes',     icon: '💬' },
  { id: 'ventas',       label: 'Ventas',           href: '/ventas',       icon: '🛒' },
  { id: 'documentos',   label: 'Documentos',       href: '/documentos',   icon: '📁' },
  { id: 'agente',       label: 'Agente IA',        href: '/agente',       icon: '🤖' },
  { id: 'marketing',    label: 'Marketing',        href: '/marketing',    icon: '📣' },
  { id: 'costes',       label: 'Centro de Costes', href: '/costes',       icon: '💸' },
]

export default function Sidebar({ active }) {
  const router = useRouter()
  const [plan, setPlan] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(null)
  const [billingStatus, setBillingStatus] = useState(null)
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    try {
      const t = localStorage.getItem('nexum_token')
      if (!t) return
      const payload = JSON.parse(atob(t.split('.')[1]))
      setIsAdmin(payload.is_admin === true)
      setPlan(payload.plan_id || 'starter')

      if (!payload.is_admin) {
        // Obtener estado de billing completo
        fetch('http://127.0.0.1:8000/api/billing/status', {
          headers: { Authorization: `Bearer ${t}` }
        }).then(r => r.ok ? r.json() : null).then(d => {
          if (d) {
            if (d.plan && d.plan !== 'none') setPlan(d.plan)
            setBillingStatus(d)
          }
        }).catch(() => {})

        // Obtener notificaciones de vencimiento
        fetch('http://127.0.0.1:8000/api/billing/notifications', {
          headers: { Authorization: `Bearer ${t}` }
        }).then(r => r.ok ? r.json() : null).then(d => {
          if (d && d.notifications) setNotifications(d.notifications)
        }).catch(() => {})
      }
    } catch {}
  }, [])

  const hasAccess = billingStatus ? billingStatus.has_access : true
  const isExpired = billingStatus ? !billingStatus.has_access : false
  const expiryWarning = billingStatus?.expiry_warning
  const daysLeft = billingStatus?.days_until_expiry

  // Si vencio, solo dashboard disponible
  const allowedModules = isAdmin ? 'all' : isExpired ? ['dashboard'] : (PLAN_MODULES[plan] || PLAN_MODULES.starter)
  const isUnlocked = (moduleId) => allowedModules === 'all' || allowedModules.includes(moduleId)

  function handleLockedClick(module) {
    setShowUpgrade(module)
    setTimeout(() => setShowUpgrade(null), 3000)
  }

  // Color del banner de advertencia
  const warningColor = expiryWarning === 'expired' ? RED :
                       expiryWarning === '1_day' ? RED :
                       expiryWarning === '3_days' ? AMBER : CYAN

  return (
    <div style={{ width: '220px', minWidth: '220px', background: NAVY, height: '100vh', flexShrink: 0, display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, alignSelf: 'flex-start', overflowY: 'auto' }}>

      {/* Logo */}
      <div style={{ padding: '24px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div style={{ width: '32px', height: '32px', background: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
              <path d="M4 16V4L16 16V4" stroke="#0B1426" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: '800', fontSize: '15px', letterSpacing: '-0.4px', lineHeight: 1 }}>Vortu</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '1px' }}>by Nexum</div>
          </div>
        </div>
      </div>

      <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 20px 12px' }} />

      {/* Banner vencimiento — solo si hay warning */}
      {!isAdmin && expiryWarning && (
        <div style={{ margin: '0 12px 10px', padding: '10px 12px', borderRadius: '8px', background: `${warningColor}18`, border: `1px solid ${warningColor}40` }}>
          {expiryWarning === 'expired' ? (
            <>
              <div style={{ fontSize: '11px', fontWeight: '700', color: warningColor, marginBottom: '3px' }}>Acceso pausado</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4, marginBottom: '8px' }}>Tu negocio te está esperando. Reactiva tu plan para continuar.</div>
              <a href="/settings?tab=subscription" style={{ display: 'block', textAlign: 'center', padding: '6px', borderRadius: '6px', background: warningColor, color: 'white', fontSize: '10px', fontWeight: '700', textDecoration: 'none' }}>Retomar acceso →</a>
            </>
          ) : expiryWarning === '1_day' ? (
            <>
              <div style={{ fontSize: '11px', fontWeight: '700', color: warningColor, marginBottom: '3px' }}>⚠️ Mañana se pausa tu acceso</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4, marginBottom: '8px' }}>Renueva hoy para no perder el acceso.</div>
              <a href="/settings?tab=subscription" style={{ display: 'block', textAlign: 'center', padding: '6px', borderRadius: '6px', background: warningColor, color: 'white', fontSize: '10px', fontWeight: '700', textDecoration: 'none' }}>Renovar ahora →</a>
            </>
          ) : expiryWarning === '3_days' ? (
            <>
              <div style={{ fontSize: '11px', fontWeight: '700', color: warningColor, marginBottom: '3px' }}>Tu acceso vence en {daysLeft} días</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>No pierdas todo lo que has construido en Vortu.</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '11px', fontWeight: '700', color: warningColor, marginBottom: '3px' }}>Renueva en {daysLeft} días</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>Tu plan se renueva automáticamente.</div>
            </>
          )}
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: '4px 0' }}>
        {ALL_MODULES.map(item => {
          const unlocked = isUnlocked(item.id)
          const isActive = active === item.href
          const isExpiredLock = isExpired && item.id !== 'dashboard'

          if (unlocked && !isExpiredLock) {
            return (
              <a key={item.id} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 20px', color: isActive ? 'white' : 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '13px', fontWeight: isActive ? '600' : '400', background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent', borderLeft: isActive ? '2px solid white' : '2px solid transparent', transition: 'all 0.15s', letterSpacing: '0.01em' }}>
                <span style={{ fontSize: '13px', opacity: isActive ? 1 : 0.55, flexShrink: 0 }}>{item.icon}</span>
                {item.label}
              </a>
            )
          }

          // Locked — por plan o por vencimiento
          return (
            <div key={item.id} style={{ position: 'relative' }}>
              <button onClick={() => handleLockedClick(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 20px', width: '100%', color: 'rgba(255,255,255,0.2)', background: 'none', border: 'none', borderLeft: '2px solid transparent', fontSize: '13px', fontWeight: '400', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.01em', textAlign: 'left' }}>
                <span style={{ fontSize: '13px', opacity: 0.25, flexShrink: 0 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: '10px', opacity: 0.4 }}>{isExpiredLock ? '⏸' : '🔒'}</span>
              </button>

              {showUpgrade === item.id && (
                <div style={{ position: 'absolute', left: '230px', top: '0', zIndex: 100, background: 'white', borderRadius: '10px', padding: '12px 14px', width: '200px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', border: '1px solid #e5e9f0' }}>
                  {isExpiredLock ? (
                    <>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: NAVY, marginBottom: '4px' }}>⏸ Acceso pausado</div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '10px', lineHeight: '1.5' }}>Reactiva tu plan para acceder a <b>{item.label}</b>.</div>
                      <a href="/settings?tab=subscription" style={{ display: 'block', textAlign: 'center', padding: '7px', borderRadius: '7px', background: RED, color: 'white', fontSize: '11px', fontWeight: '700', textDecoration: 'none' }}>Retomar acceso →</a>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: NAVY, marginBottom: '4px' }}>🔒 Módulo bloqueado</div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '10px', lineHeight: '1.5' }}>Actualiza tu plan para acceder a <b>{item.label}</b>.</div>
                      <a href="/pricing" style={{ display: 'block', textAlign: 'center', padding: '7px', borderRadius: '7px', background: NAVY, color: 'white', fontSize: '11px', fontWeight: '700', textDecoration: 'none' }}>Ver planes →</a>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Backoffice button — admin only */}
      {isAdmin && (
        <a href="/admin" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 12px 8px', padding: '9px 12px', borderRadius: '8px', background: 'rgba(0,180,216,0.12)', border: '1px solid rgba(0,180,216,0.2)', textDecoration: 'none', transition: 'all 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,180,216,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,180,216,0.12)'}>
          <span style={{ fontSize: '14px' }}>🛡️</span>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: CYAN }}>Backoffice</div>
            <div style={{ fontSize: '9px', color: 'rgba(0,180,216,0.6)', marginTop: '1px' }}>Solo Nexum</div>
          </div>
        </a>
      )}

      {/* Plan bar */}
      {isAdmin ? (
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Nexum Admin</div>
        </div>
      ) : (
        <a href="/settings?tab=subscription" style={{ display: 'block', padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Plan {(plan || 'starter').charAt(0).toUpperCase() + (plan || 'starter').slice(1)}
            </div>
            {isExpired
              ? <span style={{ fontSize: '9px', color: RED, fontWeight: '700' }}>⏸ Pausado</span>
              : <span style={{ fontSize: '9px', color: CYAN, fontWeight: '700' }}>↑ Upgrade</span>
            }
          </div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden', marginBottom: '5px' }}>
            <div style={{ width: plan === 'business' ? '95%' : plan === 'pro' ? '65%' : '30%', height: '100%', background: isExpired ? `linear-gradient(90deg, ${RED}, #f87171)` : `linear-gradient(90deg, ${CYAN}, ${BLUE})`, borderRadius: '2px' }} />
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>
            {isExpired ? 'Acceso pausado · Pulsa para reactivar' :
             plan === 'business' ? '10 módulos · Pulsa para gestionar' :
             plan === 'pro' ? '9 módulos · Pulsa para gestionar' :
             '4 módulos · Pulsa para hacer upgrade'}
          </div>
        </a>
      )}
    </div>
  )
}
