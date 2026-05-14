'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const API   = 'http://127.0.0.1:8000'
const NAVY  = '#0B1426'
const GREEN = '#16a34a'
const AMBER = '#d97706'
const RED   = '#dc2626'
const BLUE  = '#2563eb'
const CYAN  = '#00B4D8'

import Sidebar from '@/components/Sidebar'

// ── Notification Center ────────────────────────────────────────────────────────
function NotificationCenter({ token }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  const router = useRouter()
  useEffect(() => { function h(e){if(ref.current&&!ref.current.contains(e.target))setOpen(false)}; document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h) }, [])



  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{ position: 'relative', width: '38px', height: '38px', borderRadius: '10px', border: '1px solid #e5e9f0', background: open ? '#f4f6fb' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '46px', right: 0, width: '320px', background: 'white', borderRadius: '16px', border: '1px solid #e5e9f0', boxShadow: '0 16px 48px rgba(0,0,0,0.12)', zIndex: 200, overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid #f0f2f7', fontSize: '14px', fontWeight: '700', color: NAVY }}>Notificaciones</div>
          <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}><div style={{ fontSize: '28px', marginBottom: '8px', opacity: 0.3 }}>🔔</div><div style={{ fontSize: '13px' }}>Todo en orden</div></div>
        </div>
      )}
    </div>
  )
}

// ── Profile Button ─────────────────────────────────────────────────────────────
function ProfileButton({ user }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  const router = useRouter()
  useEffect(() => { function h(e){if(ref.current&&!ref.current.contains(e.target))setOpen(false)}; document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h) }, [])
  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : 'US'
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 10px 5px 5px', borderRadius: '10px', border: '1px solid #e5e9f0', background: 'white', cursor: 'pointer' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '11px', fontWeight: '800' }}>{initials}</div>
        <div style={{ textAlign: 'left' }}><div style={{ fontSize: '12px', fontWeight: '700', color: NAVY, lineHeight: 1.2 }}>{user?.name?.split(' ')[0] || 'Usuario'}</div><div style={{ fontSize: '10px', color: '#9ca3af', lineHeight: 1.2 }}>Pro</div></div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: '#9ca3af' }}><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '46px', right: 0, width: '220px', background: 'white', borderRadius: '14px', border: '1px solid #e5e9f0', boxShadow: '0 16px 48px rgba(0,0,0,0.12)', zIndex: 200, overflow: 'hidden' }}>
          <div style={{ padding: '10px 0' }}>
            {[{icon:'👤',label:'Mi perfil',action:()=>{}},{icon:'💳',label:'Suscripción',action:()=>router.push('/settings?tab=subscription')},{icon:'⚙️',label:'Configuración',action:()=>router.push('/settings')}].map((item,i)=>(
              <button key={i} onClick={()=>{item.action();setOpen(false)}} style={{width:'100%',padding:'10px 16px',display:'flex',alignItems:'center',gap:'10px',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}} onMouseEnter={e=>e.currentTarget.style.background='#fafafa'} onMouseLeave={e=>e.currentTarget.style.background='none'}>
                <span>{item.icon}</span><span style={{fontSize:'13px',fontWeight:'600',color:NAVY}}>{item.label}</span>
              </button>
            ))}
          </div>
          <div style={{ padding: '8px 12px 12px', borderTop: '1px solid #f0f2f7' }}>
            <button onClick={() => { localStorage.removeItem('nexum_token'); router.push('/login') }} style={{ width: '100%', padding: '8px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: RED, fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Cerrar sesión</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Module access panel ────────────────────────────────────────────────────────
const MODULE_ACCESS = [
  { key: 'dashboard',    label: 'Dashboard',       icon: '◈' },
  { key: 'contabilidad', label: 'Contabilidad',    icon: '📒' },
  { key: 'finanzas',     label: 'Finanzas',        icon: '💰' },
  { key: 'hr',           label: 'Recursos Humanos',icon: '👥' },
  { key: 'proyectos',    label: 'Proyectos',       icon: '📋' },
  { key: 'clientes',     label: 'Clientes',        icon: '💬' },
  { key: 'ventas',       label: 'Ventas',          icon: '🛒' },
  { key: 'documentos',   label: 'Documentos',      icon: '📁' },
  { key: 'agente',       label: 'Agente IA',       icon: '🤖' },
  { key: 'marketing',    label: 'Marketing IA',    icon: '📣' },
]

// ── Plan config (mirrors backend) ──────────────────────────────────────────────
const PLAN_CFG = {
  starter:  { name: 'Starter',  color: '#6b7280', monthly: 9,  license: 149, badge: '#f1f5f9' },
  pro:      { name: 'Pro',      color: BLUE,       monthly: 19, license: 299, badge: '#eff6ff' },
  business: { name: 'Business', color: CYAN,       monthly: 39, license: 499, badge: '#ecfeff' },
  trial:    { name: 'Trial',    color: GREEN,      monthly: 0,  license: 0,   badge: '#f0fdf4' },
  none:     { name: 'Sin plan', color: RED,        monthly: 0,  license: 0,   badge: '#fef2f2' },
}

// ── Inner settings component ───────────────────────────────────────────────────
function SettingsInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState(searchParams?.get('tab') || 'company')
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [saved, setSaved] = useState(false)

  // Billing state
  const [billingStatus, setBillingStatus] = useState(null)
  const [billingLoading, setBillingLoading] = useState(false)
  const [team, setTeam] = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [upgradeLoading, setUpgradeLoading] = useState(null)
  const [downgradeModal, setDowngradeModal] = useState(null) // {planId, planName, lostModules}
  const [downgradeReason, setDowngradeReason] = useState('')
  const [downgradeLoading, setDowngradeLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [memberAccess, setMemberAccess] = useState({})

  // Company form
  const [company, setCompany] = useState({ name: 'Mi Empresa S.L.', cif: 'B12345678', address: 'Calle Mayor 1, Madrid', phone: '+34 600 000 000', email: 'contacto@empresa.com', sector: 'Comercio', website: '' })

  // Notification prefs
  const [notifPrefs, setNotifPrefs] = useState({ stock_bajo: true, clientes_riesgo: true, proyectos_urgentes: true, mensajes_pendientes: true, alertas_contabilidad: true, informe_semanal: true, email_digest: false, push: true })

  useEffect(() => {
    const t = localStorage.getItem('nexum_token')
    if (!t) { router.push('/login'); return }
    setToken(t)
    try { const p = JSON.parse(atob(t.split('.')[1])); setUser({ email: p.sub || '', name: p.name || p.sub || 'Usuario' }) } catch { setUser({ email: '', name: 'Usuario' }) }

    // Check URL success param
    const success = searchParams?.get('success')
    if (success) {
      setSaved(true)
      setTimeout(() => setSaved(false), 6000)
      // Load billing to reflect new plan
      if (success === 'license' || success === 'subscription' || success === 'trial') {
        setTimeout(() => loadBillingStatus(), 1000)
        // Re-login para obtener JWT con nuevo plan
        setTimeout(async () => {
          try {
            const t = localStorage.getItem('nexum_token')
            if (t) {
              const r = await fetch(`${API}/api/billing/status`, { headers: { Authorization: `Bearer ${t}` } })
              if (r.ok) {
                const d = await r.json()
                // Update plan in localStorage for sidebar
                const payload = JSON.parse(atob(t.split('.')[1]))
                payload.plan_id = d.plan
                console.log('Plan actualizado a:', d.plan)
              }
            }
          } catch(e) {}
        }, 2000)
      }
    }
  }, [])

  useEffect(() => {
    if (token && (tab === 'subscription' || tab === 'team')) {
      loadBillingStatus()
      loadTeam()
    }
  }, [token, tab])

  async function loadBillingStatus() {
    setBillingLoading(true)
    try {
      const res = await fetch(`${API}/api/billing/status`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setBillingStatus(await res.json())
    } catch {} finally { setBillingLoading(false) }
  }

  async function loadTeam() {
    try {
      const res = await fetch(`${API}/api/billing/team`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); setTeam(d.members || []) }
    } catch {}
  }

  async function handlePortal() {
    setPortalLoading(true)
    try {
      const res = await fetch(`${API}/api/billing/portal`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); window.location.href = d.portal_url }
      else { alert('Conecta tu cuenta de Stripe primero') }
    } catch { alert('Error de conexión') } finally { setPortalLoading(false) }
  }

  const PLAN_MODULES_NAMES = {
    starter:  ['Dashboard', 'Contabilidad', 'Ventas', 'Clientes'],
    pro:      ['Dashboard', 'Contabilidad', 'Finanzas', 'RRHH', 'Ventas', 'Clientes', 'Documentos', 'Agente IA', 'Marketing'],
    business: ['Dashboard', 'Contabilidad', 'Finanzas', 'RRHH', 'Proyectos', 'Ventas', 'Clientes', 'Documentos', 'Agente IA', 'Marketing'],
  }

  async function handleUpgrade(planId) {
    const currentPlanOrder = { starter: 0, pro: 1, business: 2 }
    const currentPlan = billingStatus?.plan || 'starter'
    const isDowngrade = currentPlanOrder[planId] < currentPlanOrder[currentPlan]

    if (isDowngrade) {
      // Mostrar modal de downgrade con behavioral economics
      const currentModules = PLAN_MODULES_NAMES[currentPlan] || []
      const newModules = PLAN_MODULES_NAMES[planId] || []
      const lostModules = currentModules.filter(m => !newModules.includes(m))
      const planNames = { starter: 'Starter', pro: 'Pro', business: 'Business' }
      setDowngradeModal({ planId, planName: planNames[planId], lostModules })
      return
    }

    setUpgradeLoading(planId)
    try {
      const res = await fetch(`${API}/api/billing/subscription/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan_id: planId })
      })
      if (res.ok) {
        const d = await res.json()
        if (d.checkout_url) {
          window.location.href = d.checkout_url
        } else if (d.upgraded) {
          await loadBillingStatus()
          showSaved()
        }
      }
    } catch {} finally { setUpgradeLoading(null) }
  }

  async function confirmDowngrade() {
    if (!downgradeModal) return
    setDowngradeLoading(true)
    try {
      const res = await fetch(`${API}/api/billing/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ new_plan_id: downgradeModal.planId })
      })
      if (res.ok) {
        const d = await res.json()
        setDowngradeModal(null)
        await loadBillingStatus()
        showSaved()
      }
    } catch {} finally { setDowngradeLoading(false) }
  }

  async function handlePayNow() {
    // Redirige al portal de Stripe donde puede pagar manualmente
    setPortalLoading(true)
    try {
      const res = await fetch(`${API}/api/billing/portal`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); window.location.href = d.portal_url }
      else alert('Error al abrir el portal de facturación')
    } catch {} finally { setPortalLoading(false) }
  }

  async function handleToggleAutoRenew() {
    try {
      const newValue = !billingStatus.cancel_at_period_end
      const res = await fetch(`${API}/api/billing/toggle-autorenew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ auto_renew: !newValue })
      })
      if (res.ok) { await loadBillingStatus(); showSaved() }
    } catch {}
  }

  async function handleCancel() {
    if (!confirm('¿Seguro que quieres cancelar? Mantendrás acceso hasta el final del período.')) return
    setCancelLoading(true)
    try {
      const res = await fetch(`${API}/api/billing/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ at_period_end: true }) })
      if (res.ok) { await loadBillingStatus(); showSaved() }
    } catch {} finally { setCancelLoading(false) }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      const res = await fetch(`${API}/api/billing/users/add`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ email: inviteEmail, role: inviteRole }) })
      if (res.ok) { setInviteEmail(''); loadTeam(); showSaved() }
      else { const e = await res.json(); alert(e.detail || 'Error al invitar') }
    } catch {} finally { setInviting(false) }
  }

  async function handleRemoveMember(memberId) {
    if (!confirm('¿Eliminar este miembro del equipo?')) return
    try {
      const res = await fetch(`${API}/api/billing/users/remove`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ member_user_id: memberId }) })
      if (res.ok) loadTeam()
    } catch {}
  }

  function toggleModuleAccess(memberId, moduleKey) {
    setMemberAccess(prev => ({ ...prev, [memberId]: { ...prev[memberId], [moduleKey]: !prev[memberId]?.[moduleKey] } }))
  }

  function showSaved() { setSaved(true); setTimeout(() => setSaved(false), 2500) }

  const card = { background: 'white', borderRadius: '14px', border: '1px solid #e5e9f0' }
  const input = { width: '100%', padding: '10px 12px', borderRadius: '9px', border: '1.5px solid #e5e9f0', fontSize: '13px', fontFamily: "'DM Sans', system-ui", outline: 'none', color: NAVY }
  const label = { fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '5px' }
  const btnPrimary = { padding: '10px 22px', borderRadius: '9px', border: 'none', background: NAVY, color: 'white', fontWeight: '700', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', system-ui" }

  const TABS = [
    { id: 'company',       label: '🏢 Empresa'       },
    { id: 'subscription',  label: '💳 Suscripción'   },
    { id: 'team',          label: '👥 Equipo'         },
    { id: 'notifications', label: '🔔 Notificaciones' },
    { id: 'security',      label: '🔒 Seguridad'      },
  ]

  const planCfg = PLAN_CFG[billingStatus?.plan] || PLAN_CFG.none


  // ── Modal Downgrade ─────────────────────────────────────────────────────────
  const DowngradeModal = () => {
    if (!downgradeModal) return null
    const REASONS = ['El precio es demasiado alto', 'No uso todos los módulos', 'Es temporal, vuelvo pronto', 'Otro motivo']
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
        <div style={{ background: 'white', borderRadius: '16px', padding: '32px', maxWidth: '460px', width: '90%', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>😔</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0B1426', marginBottom: '6px' }}>¿Seguro que quieres reducir tu plan?</div>
            <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
              Al cambiar a <b>{downgradeModal.planName}</b> perderás acceso inmediato a estos módulos:
            </div>
          </div>

          {/* Módulos perdidos */}
          {downgradeModal.lostModules.length > 0 && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Perderás acceso a:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {downgradeModal.lostModules.map(m => (
                  <span key={m} style={{ padding: '3px 10px', background: 'white', border: '1px solid #FECACA', borderRadius: '20px', fontSize: '12px', color: '#DC2626', fontWeight: '600' }}>✕ {m}</span>
                ))}
              </div>
              <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '8px' }}>Tus datos se conservan. Puedes volver cuando quieras.</div>
            </div>
          )}

          {/* Motivo */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>¿Por qué quieres cambiar? (opcional)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {REASONS.map(r => (
                <button key={r} onClick={() => setDowngradeReason(r)} style={{ padding: '8px 12px', borderRadius: '8px', border: `1.5px solid ${downgradeReason === r ? '#2563EB' : '#E5E7EB'}`, background: downgradeReason === r ? '#EFF6FF' : 'white', color: downgradeReason === r ? '#2563EB' : '#374151', fontSize: '12px', fontWeight: downgradeReason === r ? '600' : '400', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                  {downgradeReason === r ? '● ' : '○ '}{r}
                </button>
              ))}
            </div>
          </div>

          {/* CTAs — behavioral economics: opcion default = mantener plan */}
          <button onClick={() => setDowngradeModal(null)} style={{ width: '100%', padding: '14px', borderRadius: '10px', background: '#0B1426', color: 'white', fontSize: '14px', fontWeight: '800', border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '10px', transition: 'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#1e3a5f'}
            onMouseLeave={e => e.currentTarget.style.background = '#0B1426'}>
            ✓ Mantener mi plan actual
          </button>

          <button onClick={confirmDowngrade} disabled={downgradeLoading} style={{ width: '100%', padding: '10px', borderRadius: '10px', background: 'transparent', color: '#9CA3AF', fontSize: '12px', fontWeight: '400', border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#6B7280'}
            onMouseLeave={e => e.currentTarget.style.color = '#9CA3AF'}>
            {downgradeLoading ? 'Procesando...' : `Continuar con cambio a ${downgradeModal.planName}`}
          </button>
        </div>
      </div>
    )
  }
  return (
    <div style={{ minHeight: '100vh', background: '#f4f6fb', display: 'flex', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <DowngradeModal />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        *{box-sizing:border-box;} input:focus,select:focus,textarea:focus{border-color:#0B1426!important;outline:none;}
        ::-webkit-scrollbar{width:5px;} ::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:3px;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <Sidebar active="/settings" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'hidden' }}>

        {/* TOP BAR */}
        <div style={{ background: 'white', borderBottom: '1px solid #e5e9f0', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', color: '#6b7280', fontSize: '13px' }}>← Dashboard</a>
            <span style={{ color: '#d1d5db' }}>/</span>
            <span style={{ fontSize: '14px', fontWeight: '700', color: NAVY }}>Configuración</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <NotificationCenter token={token} />
            <ProfileButton user={user} />
          </div>
        </div>

        {/* TAB BAR */}
        <div style={{ background: 'white', borderBottom: '1px solid #e5e9f0', padding: '0 32px', display: 'flex', flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '18px 16px', background: 'none', border: 'none', borderBottom: tab === t.id ? `2px solid ${NAVY}` : '2px solid transparent', color: tab === t.id ? NAVY : '#6b7280', fontWeight: tab === t.id ? '700' : '400', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', system-ui", transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

          {saved && (
            <div style={{ padding: '14px 18px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', marginBottom: '16px', color: GREEN, fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px', animation: 'fadeUp 0.3s ease' }}>
              <span style={{ fontSize: '20px' }}>🎉</span>
              <div>
                {searchParams?.get('success') === 'license' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', borderRadius: '12px', background: '#F0FDF4', border: '1px solid #BBF7D0', marginBottom: '16px' }}>
                    <div style={{ fontSize: '28px', flexShrink: 0 }}>🎉</div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#15803D', marginBottom: '2px' }}>¡Plan activado correctamente!</div>
                      <div style={{ fontSize: '12px', color: '#16A34A' }}>Tu licencia está activa y todos los módulos están desbloqueados. El primer mes es gratis.</div>
                    </div>
                  </div>
                )}
                {searchParams?.get('success') === 'subscription' && <div>¡Suscripción activada! Bienvenido a Vortu. Ya tienes acceso completo a tu plan.</div>}
                {searchParams?.get('success') === 'trial' && <div>¡Trial iniciado! Tienes 14 días gratis para explorar Vortu sin límites.</div>}
                {!searchParams?.get('success') && <div>✓ Cambios guardados correctamente</div>}
              </div>
            </div>
          )}

          {/* ══ EMPRESA ══ */}
          {tab === 'company' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px' }}>
              <div style={{ ...card, padding: '28px' }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: NAVY, marginBottom: '4px' }}>Información de la empresa</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '24px' }}>Estos datos aparecen en tus facturas y reportes oficiales</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  {[{key:'name',label:'Nombre de la empresa',placeholder:'Mi Empresa S.L.'},{key:'cif',label:'CIF / NIF',placeholder:'B12345678'},{key:'address',label:'Dirección fiscal',placeholder:'Calle Mayor 1, Madrid'},{key:'phone',label:'Teléfono',placeholder:'+34 600 000 000'},{key:'email',label:'Email de contacto',placeholder:'contacto@empresa.com'},{key:'website',label:'Sitio web (opcional)',placeholder:'www.empresa.com'}].map(f=>(
                    <div key={f.key}><label style={label}>{f.label}</label><input value={company[f.key]} onChange={e=>setCompany(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder} style={input}/></div>
                  ))}
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <label style={label}>Sector</label>
                  <select value={company.sector} onChange={e=>setCompany(p=>({...p,sector:e.target.value}))} style={input}>
                    {['Comercio','Hostelería','Servicios profesionales','Tecnología','Construcción','Salud','Educación','Manufactura','Transporte','Otro'].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={showSaved} style={btnPrimary}>Guardar cambios</button>
                  <button style={{ ...btnPrimary, background: '#f4f6fb', color: NAVY, border: '1px solid #e5e9f0' }}>Cancelar</button>
                </div>
              </div>

              {/* Status card */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ ...card, padding: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: NAVY, marginBottom: '16px' }}>Estado de la cuenta</div>
                  {billingLoading ? <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: '13px' }}>Cargando...</div> : billingStatus ? (
                    <>
                      {[
                        { label: 'Plan actual', value: planCfg.name, badge: true, color: planCfg.color },
                        { label: 'Estado', value: billingStatus.status === 'trialing' ? `Trial — ${billingStatus.trial_days_left}d restantes` : billingStatus.status === 'active' ? 'Activo' : billingStatus.status, badge: false },
                        { label: 'Próxima factura', value: billingStatus.current_period_end ? new Date(billingStatus.current_period_end).toLocaleDateString('es-ES') : '—', badge: false },
                        { label: 'Usuarios', value: `${team.length + 1} / ${billingStatus.max_users}`, badge: false },
                        { label: 'Consultas IA', value: `${billingStatus.ai_used} / ${billingStatus.ai_limit === 99999 ? '∞' : billingStatus.ai_limit}`, badge: false },
                      ].map((row, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < 4 ? '1px solid #f0f2f7' : 'none' }}>
                          <span style={{ fontSize: '13px', color: '#6b7280' }}>{row.label}</span>
                          {row.badge
                            ? <span style={{ fontSize: '11px', fontWeight: '700', color: row.color, background: planCfg.badge, padding: '3px 10px', borderRadius: '20px' }}>{row.value}</span>
                            : <span style={{ fontSize: '13px', fontWeight: '600', color: NAVY }}>{row.value}</span>
                          }
                        </div>
                      ))}
                      {billingStatus.trial_active && (
                        <div style={{ marginTop: '12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#92400e' }}>
                          ⏰ Tu trial termina el {new Date(billingStatus.trial_end).toLocaleDateString('es-ES')}. Activa tu plan para no perder el acceso.
                        </div>
                      )}
                      {billingStatus.downgrade_applied && (
                        <div style={{ marginTop: '10px', padding: '10px 14px', borderRadius: '8px', background: '#FFF7ED', border: '1px solid #FED7AA', fontSize: '12px', color: '#92400E' }}>
                          📅 Tu plan cambiará a <b>{billingStatus.plan_name}</b> el {billingStatus.current_period_end ? new Date(billingStatus.current_period_end).toLocaleDateString('es-ES') : '—'}. Hasta entonces mantienes tu acceso actual.
                          <a href="/settings?tab=subscription" style={{ marginLeft: '8px', color: '#D97706', fontWeight: '700', textDecoration: 'none' }}>Mantener plan →</a>
                        </div>
                      )}
                      {billingStatus.cancel_at_period_end && (
                        <div style={{ marginTop: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: RED }}>
                          ⚠ Suscripción cancelada — acceso hasta {new Date(billingStatus.current_period_end).toLocaleDateString('es-ES')}
                        </div>
                      )}
                      {billingStatus.pending_downgrade_plan && (
                        <div style={{ marginTop: '12px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '8px', padding: '12px 14px', fontSize: '12px', color: '#92400E', lineHeight: 1.6 }}>
                          <b>📅 Cambio programado</b> — Pasarás a <b>{billingStatus.pending_downgrade_plan.charAt(0).toUpperCase() + billingStatus.pending_downgrade_plan.slice(1)}</b> el {billingStatus.current_period_end ? new Date(billingStatus.current_period_end).toLocaleDateString('es-ES') : '—'}.<br/>
                          Hasta entonces sigues disfrutando de todos los módulos de tu plan actual.
                          <div style={{ marginTop: '8px' }}>
                            <a href="#" onClick={async e => { e.preventDefault(); await fetch(`${API}/api/billing/cancel-downgrade`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }); loadBillingStatus() }} style={{ color: '#D97706', fontWeight: '700', textDecoration: 'none' }}>↩ Mantener plan actual →</a>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '16px' }}>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>Sin suscripción activa</div>
                      <button onClick={() => router.push('/pricing')} style={{ ...btnPrimary, fontSize: '12px', padding: '8px 16px' }}>Ver planes →</button>
                    </div>
                  )}
                </div>

                {/* AI Usage bar */}
                {billingStatus && (
                  <div style={{ ...card, padding: '20px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: NAVY, marginBottom: '14px' }}>Uso del plan</div>
                    {[
                      { label: 'Consultas IA', used: billingStatus.ai_used, total: billingStatus.ai_limit },
                      { label: 'Documentos', used: billingStatus.documents_used, total: billingStatus.documents_limit },
                    ].map(r => {
                      const pct = r.total >= 99999 ? 0 : Math.min((r.used / r.total) * 100, 100)
                      const color = pct > 80 ? RED : pct > 60 ? AMBER : BLUE
                      return (
                        <div key={r.label} style={{ marginBottom: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <span style={{ fontSize: '12px', color: '#374151' }}>{r.label}</span>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: NAVY }}>{r.used} / {r.total >= 99999 ? '∞' : r.total}</span>
                          </div>
                          <div style={{ height: '5px', background: '#f0f2f7', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: r.total >= 99999 ? '30%' : `${pct}%`, height: '100%', background: r.total >= 99999 ? GREEN : color, borderRadius: '3px', transition: 'width 0.6s ease' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ SUSCRIPCIÓN ══ */}
          {tab === 'subscription' && (
            <div>
              {billingLoading ? (
                <div style={{ textAlign: 'center', padding: '80px', color: '#9ca3af' }}><div style={{ fontSize: '32px', marginBottom: '12px', animation: 'spin 1s linear infinite' }}>⟳</div><div>Cargando suscripción...</div></div>
              ) : (
                <>
                  {/* Current plan hero */}
                  {billingStatus && billingStatus.plan !== 'none' && (
                    <div style={{ background: NAVY, borderRadius: '16px', padding: '24px 28px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Plan actual</div>
                        <div style={{ fontSize: '22px', fontWeight: '800', color: 'white', letterSpacing: '-0.5px', marginBottom: '4px' }}>
                          {billingStatus?.status === 'none' ? '¡Elige tu plan Vortu!' : 
                           !billingStatus?.has_access ? '⏸ Tu acceso está pausado' :
                           `Vortu ${planCfg.name}`}
                        </div>
                        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                          {billingStatus.trial_active
                            ? `Trial activo — ${billingStatus.trial_days_left} días restantes`
                            : billingStatus.cancel_at_period_end
                            ? `Cancelado — acceso hasta ${new Date(billingStatus.current_period_end).toLocaleDateString('es-ES')}`
                            : billingStatus.status === 'none'
                            ? '1er mes gratis — no se cobra nada hoy'
                            : `Próxima factura: ${billingStatus.current_period_end ? new Date(billingStatus.current_period_end).toLocaleDateString('es-ES') : '—'}`
                          }
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button onClick={handlePortal} disabled={portalLoading} style={{ padding: '10px 20px', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: 'white', fontWeight: '600', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                            {portalLoading ? '...' : '🧾 Gestionar facturación'}
                          </button>
                          {billingStatus.status === 'active' && (
                            <button onClick={handlePayNow} disabled={portalLoading} style={{ padding: '10px 20px', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: 'white', fontWeight: '600', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                              💳 Pagar ahora
                            </button>
                          )}
                          {billingStatus.status !== 'none' && (
                            <button onClick={handleCancel} disabled={cancelLoading} style={{ padding: '10px 20px', borderRadius: '9px', border: '1px solid rgba(220,38,38,0.4)', background: 'rgba(220,38,38,0.1)', color: '#fca5a5', fontWeight: '600', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                              {cancelLoading ? '...' : 'Cancelar plan'}
                            </button>
                          )}
                        </div>
                        {billingStatus.status === 'active' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button onClick={handleToggleAutoRenew} style={{ position: 'relative', width: '36px', height: '20px', borderRadius: '10px', border: 'none', background: billingStatus.cancel_at_period_end ? 'rgba(255,255,255,0.2)' : '#16A34A', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}>
                              <span style={{ position: 'absolute', top: '2px', left: billingStatus.cancel_at_period_end ? '2px' : '18px', width: '16px', height: '16px', borderRadius: '50%', background: 'white', transition: 'all 0.2s' }} />
                            </button>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                              {billingStatus.cancel_at_period_end ? 'Renovación automática desactivada' : 'Renovación automática activada'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Plans grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
                    {[
                      { id: 'starter',  name: 'Starter',  license: 149, monthly: 9,  users: 1,  ai: '50/mes',  docs: '25/mes',  color: '#6b7280', modules: 4 },
                      { id: 'pro',      name: 'Pro',       license: 299, monthly: 19, users: 3,  ai: '500/mes', docs: '50/mes',  color: BLUE,      modules: 9 },
                      { id: 'business', name: 'Business',  license: 499, monthly: 39, users: 10, ai: '∞',       docs: '∞',       color: CYAN,      modules: 10 },
                    ].map(plan => {
                      const isCurrent = billingStatus?.plan === plan.id && billingStatus?.status !== 'none'
                      const isPendingDowngrade = billingStatus?.pending_downgrade_plan === plan.id
                      return (
                        <div key={plan.id} style={{ ...card, padding: '22px', border: isCurrent ? `2px solid ${plan.color}` : isPendingDowngrade ? '2px dashed #D97706' : '1px solid #e5e9f0', position: 'relative', background: isCurrent ? `${plan.color}08` : isPendingDowngrade ? '#FFFBEB' : 'white' }}>
                          {isCurrent && <div style={{ position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)', background: plan.color, color: 'white', fontSize: '10px', fontWeight: '800', padding: '3px 12px', borderRadius: '20px', whiteSpace: 'nowrap' }}>✓ Plan actual</div>}
                          {isPendingDowngrade && <div style={{ position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)', background: '#D97706', color: 'white', fontSize: '10px', fontWeight: '800', padding: '3px 12px', borderRadius: '20px', whiteSpace: 'nowrap' }}>📅 Activo el {billingStatus.current_period_end ? new Date(billingStatus.current_period_end).toLocaleDateString('es-ES') : '—'}</div>}
                          <div style={{ fontSize: '16px', fontWeight: '800', color: isPendingDowngrade ? '#D97706' : plan.color, marginBottom: '4px' }}>{plan.name}</div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '28px', fontWeight: '800', color: NAVY, letterSpacing: '-0.5px' }}>€{plan.monthly}</span>
                            <span style={{ fontSize: '13px', color: '#6b7280' }}>/mes</span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '8px' }}>+ €{plan.license} licencia única</div>
                          {!isCurrent && !isPendingDowngrade && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '20px', padding: '3px 10px', marginBottom: '12px' }}>
                              <span style={{ fontSize: '10px' }}>🎁</span>
                              <span style={{ fontSize: '10px', fontWeight: '700', color: '#16A34A' }}>1er mes gratis</span>
                            </div>
                          )}
                          {[`${plan.users} usuario${plan.users>1?'s':''} incluido${plan.users>1?'s':''}`,`${plan.modules} módulos`,`IA: ${plan.ai}`,`Docs: ${plan.docs}`].map((f,i)=>(
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
                              <span style={{ fontSize: '11px', color: plan.color, fontWeight: '700', flexShrink: 0 }}>✓</span>
                              <span style={{ fontSize: '12px', color: '#374151' }}>{f}</span>
                            </div>
                          ))}
                          {isPendingDowngrade && (
                            <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '8px', background: '#FEF3C7', border: '1px solid #FDE68A', fontSize: '11px', color: '#92400E', lineHeight: 1.5 }}>
                              ⚠️ Perderás acceso a módulos que usas ahora. Tus datos se conservan.
                              <div style={{ marginTop: '6px' }}>
                                <a href="#" onClick={async e => { e.preventDefault(); await fetch(`${API}/api/billing/cancel-downgrade`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }); loadBillingStatus() }} style={{ color: '#D97706', fontWeight: '800', textDecoration: 'none' }}>↩ Mantener {billingStatus?.plan_name} →</a>
                              </div>
                            </div>
                          )}
                          <button onClick={() => !isCurrent && !isPendingDowngrade && handleUpgrade(plan.id)} disabled={isCurrent || isPendingDowngrade || upgradeLoading === plan.id} style={{ width: '100%', padding: '10px', borderRadius: '9px', border: isCurrent ? 'none' : isPendingDowngrade ? 'none' : `1.5px solid ${plan.color}`, background: isCurrent ? `${plan.color}15` : isPendingDowngrade ? '#FEF3C7' : 'white', color: isCurrent ? plan.color : isPendingDowngrade ? '#D97706' : plan.color, fontWeight: '700', fontSize: '13px', cursor: isCurrent || isPendingDowngrade ? 'default' : 'pointer', fontFamily: 'inherit', marginTop: '10px', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            {upgradeLoading === plan.id 
                              ? <><span style={{ width: '14px', height: '14px', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: plan.color, borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />Redirigiendo...</>
                              : isCurrent ? 'Plan actual' 
                              : isPendingDowngrade ? '📅 Cambio programado'
                              : `Cambiar a ${plan.name}`}
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  {/* No subscription */}
                  {(!billingStatus || billingStatus.plan === 'none') && (
                    <div style={{ ...card, padding: '40px', textAlign: 'center', marginBottom: '20px' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>💳</div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: NAVY, marginBottom: '8px' }}>Sin suscripción activa</div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px' }}>Elige un plan para acceder a todos los módulos de Vortu</div>
                      <button onClick={() => router.push('/pricing')} style={{ ...btnPrimary, padding: '12px 32px', fontSize: '14px' }}>Ver planes y precios →</button>
                    </div>
                  )}

                  {/* Enterprise */}
                  <div style={{ ...card, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ fontSize: '24px' }}>🏢</div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY }}>Enterprise</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>Usuarios ilimitados · Instancia dedicada · SLA · Onboarding personalizado</div>
                      </div>
                    </div>
                    <button onClick={() => window.open('mailto:hola@nexumsolutions.com?subject=Vortu Enterprise', '_blank')} style={{ padding: '10px 20px', borderRadius: '9px', border: `1.5px solid ${NAVY}`, background: 'white', color: NAVY, fontWeight: '700', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Contactar →</button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ══ EQUIPO ══ */}
          {tab === 'team' && (
            <div>
              {/* Invite */}
              <div style={{ ...card, padding: '20px', marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY, marginBottom: '4px' }}>Invitar miembro</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '14px' }}>
                  {billingStatus ? `${team.length + 1} de ${billingStatus.max_users} usuarios · +€8/mes por usuario adicional` : 'Cargando...'}
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="correo@empresa.com" type="email" onKeyDown={e => e.key === 'Enter' && handleInvite()} style={{ ...input, flex: 1, minWidth: '200px' }} />
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={{ ...input, width: '140px' }}>
                    {['member', 'admin', 'viewer'].map(r => <option key={r} value={r}>{r === 'member' ? 'Miembro' : r === 'admin' ? 'Admin' : 'Solo lectura'}</option>)}
                  </select>
                  <button onClick={handleInvite} disabled={inviting} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {inviting ? '...' : 'Enviar invitación'}
                  </button>
                </div>
              </div>

              {/* Team list */}
              <div style={{ ...card, overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ background: NAVY, padding: '12px 18px', display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '16px', alignItems: 'center' }}>
                  {['Miembro', 'Rol', 'Estado', ''].map(h => <div key={h} style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>)}
                </div>

                {/* Current user (owner) */}
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #f0f2f7', display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '16px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: '800', flexShrink: 0 }}>
                      {user?.name?.substring(0, 2).toUpperCase() || 'YO'}
                    </div>
                    <div><div style={{ fontSize: '13px', fontWeight: '600', color: NAVY }}>{user?.name || 'Tú'}</div><div style={{ fontSize: '11px', color: '#9ca3af' }}>{user?.email}</div></div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: NAVY, background: '#f4f6fb', padding: '3px 10px', borderRadius: '6px' }}>Propietario</span>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: GREEN, background: '#f0fdf4', padding: '3px 10px', borderRadius: '20px' }}>● Activo</span>
                  <div />
                </div>

                {/* Invited members */}
                {team.map((m, i) => (
                  <div key={m.id} style={{ padding: '14px 18px', borderBottom: i < team.length - 1 ? '1px solid #f0f2f7' : 'none', display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '16px', alignItems: 'center', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: '#e5e9f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: NAVY, fontSize: '12px', fontWeight: '800', flexShrink: 0 }}>
                        {m.email.substring(0, 2).toUpperCase()}
                      </div>
                      <div><div style={{ fontSize: '13px', fontWeight: '600', color: NAVY }}>{m.email}</div><div style={{ fontSize: '11px', color: '#9ca3af' }}>{m.joined_at ? new Date(m.joined_at).toLocaleDateString('es-ES') : 'Pendiente'}</div></div>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: BLUE, background: '#eff6ff', padding: '3px 10px', borderRadius: '6px' }}>{m.role === 'member' ? 'Miembro' : m.role === 'admin' ? 'Admin' : 'Solo lectura'}</span>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: m.status === 'active' ? GREEN : AMBER, background: m.status === 'active' ? '#f0fdf4' : '#fffbeb', padding: '3px 10px', borderRadius: '20px' }}>
                      {m.status === 'active' ? '● Activo' : '○ Pendiente'}
                    </span>
                    <button onClick={() => handleRemoveMember(m.id)} style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', color: RED, fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Eliminar</button>
                  </div>
                ))}

                {team.length === 0 && (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>Aún no has invitado a nadie. Añade miembros arriba.</div>
                )}
              </div>

              {/* Module access */}
              {selectedMember && (
                <div style={{ ...card, padding: '20px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY, marginBottom: '14px' }}>Acceso a módulos — {selectedMember.email}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                    {MODULE_ACCESS.map(mod => {
                      const enabled = memberAccess[selectedMember.id]?.[mod.key] ?? false
                      return (
                        <div key={mod.key} onClick={() => toggleModuleAccess(selectedMember.id, mod.key)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '10px', border: `1.5px solid ${enabled ? NAVY : '#e5e9f0'}`, background: enabled ? '#f8faff' : 'white', cursor: 'pointer', transition: 'all 0.15s' }}>
                          <span style={{ fontSize: '16px' }}>{mod.icon}</span>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: enabled ? NAVY : '#9ca3af' }}>{mod.label}</span>
                          <div style={{ marginLeft: 'auto', width: '16px', height: '16px', borderRadius: '50%', border: `2px solid ${enabled ? NAVY : '#d1d5db'}`, background: enabled ? NAVY : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {enabled && <span style={{ fontSize: '9px', color: 'white', fontWeight: '800' }}>✓</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <button onClick={showSaved} style={btnPrimary}>Guardar accesos</button>
                </div>
              )}
            </div>
          )}

          {/* ══ NOTIFICACIONES ══ */}
          {tab === 'notifications' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ ...card, padding: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY, marginBottom: '4px' }}>Alertas de módulos</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '20px' }}>Elige qué alertas quieres recibir</div>
                {[{key:'stock_bajo',label:'Stock bajo',desc:'Cuando un producto baja del umbral'},{key:'clientes_riesgo',label:'Clientes en riesgo',desc:'Sentimiento deteriorándose'},{key:'proyectos_urgentes',label:'Proyectos urgentes',desc:'Health score crítico o vencidos'},{key:'mensajes_pendientes',label:'Mensajes pendientes',desc:'Bandeja sin responder'},{key:'alertas_contabilidad',label:'Alertas contabilidad',desc:'Anomalías en ingresos o gastos'},{key:'informe_semanal',label:'Informe semanal IA',desc:'Resumen ejecutivo los lunes'}].map(n=>(
                  <div key={n.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f0f2f7' }}>
                    <div><div style={{ fontSize: '13px', fontWeight: '600', color: NAVY }}>{n.label}</div><div style={{ fontSize: '11px', color: '#9ca3af' }}>{n.desc}</div></div>
                    <div onClick={() => setNotifPrefs(p => ({ ...p, [n.key]: !p[n.key] }))} style={{ width: '40px', height: '22px', borderRadius: '11px', background: notifPrefs[n.key] ? NAVY : '#e5e9f0', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: notifPrefs[n.key] ? '20px' : '2px', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
                    </div>
                  </div>
                ))}
                <button onClick={showSaved} style={{ ...btnPrimary, marginTop: '20px' }}>Guardar preferencias</button>
              </div>
              <div style={{ ...card, padding: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY, marginBottom: '4px' }}>Canal de notificaciones</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '20px' }}>Cómo quieres recibirlas</div>
                {[{key:'push',label:'Notificaciones en app',desc:'Centro de notificaciones de Vortu'},{key:'email_digest',label:'Resumen por email',desc:'Un email diario con el resumen'}].map(c=>(
                  <div key={c.key} onClick={() => setNotifPrefs(p => ({ ...p, [c.key]: !p[c.key] }))} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', borderRadius: '10px', border: `1.5px solid ${notifPrefs[c.key] ? NAVY : '#e5e9f0'}`, background: notifPrefs[c.key] ? '#f8faff' : 'white', marginBottom: '10px', cursor: 'pointer', transition: 'all 0.15s' }}>
                    <div><div style={{ fontSize: '13px', fontWeight: '600', color: NAVY }}>{c.label}</div><div style={{ fontSize: '11px', color: '#9ca3af' }}>{c.desc}</div></div>
                    <div style={{ width: '40px', height: '22px', borderRadius: '11px', background: notifPrefs[c.key] ? NAVY : '#e5e9f0', position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: notifPrefs[c.key] ? '20px' : '2px', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ SEGURIDAD ══ */}
          {tab === 'security' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ ...card, padding: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY, marginBottom: '4px' }}>Cambiar contraseña</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '20px' }}>Mínimo 12 caracteres</div>
                {['Contraseña actual','Nueva contraseña','Confirmar contraseña'].map(f=>(
                  <div key={f} style={{ marginBottom: '12px' }}><label style={label}>{f}</label><input type="password" placeholder="••••••••••••" style={input}/></div>
                ))}
                <button onClick={showSaved} style={{ ...btnPrimary, marginTop: '8px' }}>Actualizar contraseña</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ ...card, padding: '24px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY, marginBottom: '4px' }}>Autenticación en dos pasos</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>Añade una capa extra de seguridad</div>
                  <div style={{ padding: '14px', background: '#f8faff', borderRadius: '10px', border: '1px solid #e5e9f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div><div style={{ fontSize: '13px', fontWeight: '600', color: NAVY }}>App de autenticación</div><div style={{ fontSize: '11px', color: '#9ca3af' }}>Google Authenticator, Authy...</div></div>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', background: '#f4f6fb', padding: '3px 10px', borderRadius: '20px' }}>No activo</span>
                  </div>
                  <button style={{ ...btnPrimary, background: '#f4f6fb', color: NAVY, border: '1px solid #e5e9f0' }}>Activar 2FA</button>
                </div>
                <div style={{ ...card, padding: '20px', border: '1px solid #fecaca' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: RED, marginBottom: '4px' }}>Zona de peligro</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '14px' }}>Estas acciones son irreversibles</div>
                  <button style={{ padding: '9px 18px', borderRadius: '9px', border: '1px solid #fecaca', background: '#fef2f2', color: RED, fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Eliminar mi cuenta</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: '#6b7280' }}>Cargando...</div>}>
      <SettingsInner />
    </Suspense>
  )
}