'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { T, I } from './tokens'
import { HeaderTabs } from './primitives'

function ProfileBtn({ user, router }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
    : 'US'

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '3px 4px 3px 3px', borderRadius: 999, cursor: 'pointer',
      }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,.04)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{
          width: 28, height: 28, borderRadius: 999,
          background: 'linear-gradient(135deg,#0071E3,#00B4D8)',
          color: '#fff', display: 'grid', placeItems: 'center',
          fontWeight: 600, fontSize: 11,
        }}>{initials}</div>
        <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>
          {user?.name?.split(' ')[0] || 'Usuario'}
        </span>
        <span style={{ color: T.text4, display: 'flex' }}>{I.chevron}</span>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 44, right: 0, width: 200,
          background: T.card, borderRadius: 12,
          border: `.5px solid ${T.hairline}`,
          boxShadow: '0 8px 32px rgba(0,0,0,.12)',
          zIndex: 200, overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 14px', borderBottom: `.5px solid ${T.hairline}` }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{user?.name || 'Usuario'}</div>
            <div style={{ fontSize: 11, color: T.text4 }}>{user?.email || ''}</div>
          </div>
          <div style={{ padding: '6px 0' }}>
            <button onClick={() => { router.push('/settings'); setOpen(false) }} style={{
              width: '100%', padding: '9px 14px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13, color: T.text, textAlign: 'left',
            }}
              onMouseEnter={e => e.currentTarget.style.background = T.sidebar}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >Configuración</button>
          </div>
          <div style={{ padding: '6px 8px 10px', borderTop: `.5px solid ${T.hairline}` }}>
            <button onClick={() => { localStorage.removeItem('nexum_token'); router.push('/login') }} style={{
              width: '100%', padding: '8px',
              background: T.redSoft, border: 'none', borderRadius: 8,
              color: T.red, fontSize: 13, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>Cerrar sesión</button>
          </div>
        </div>
      )}
    </div>
  )
}

function NotificationBtn({ token }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const ref = useRef()
  const router = useRouter()
  import { API_BASE as API } from '@/lib/api'

  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => { if (token) load() }, [token])

  async function load() {
    const notifs = []
    try {
      const [a, b, c] = await Promise.allSettled([
        fetch(`${API}/api/clientes/inbox`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/proyectos/resumen`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/ventas/alertas/stock`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (a.status === 'fulfilled' && a.value.ok) {
        const d = await a.value.json()
        if (d.requires_human > 0) notifs.push({ id: 'm1', title: `${d.requires_human} mensajes requieren atención`, href: '/clientes' })
      }
      if (b.status === 'fulfilled' && b.value.ok) {
        const d = await b.value.json()
        if (d.at_risk > 0) notifs.push({ id: 'p1', title: `${d.at_risk} proyecto en riesgo`, href: '/proyectos' })
      }
      if (c.status === 'fulfilled' && c.value.ok) {
        const d = await c.value.json()
        if (d.total > 0) notifs.push({ id: 's1', title: `${d.total} productos con stock bajo`, href: '/ventas' })
      }
    } catch { }
    setNotifications(notifs)
  }

  const unread = notifications.length

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: 32, height: 32, borderRadius: 8, border: 'none',
        background: 'transparent', display: 'grid', placeItems: 'center',
        cursor: 'pointer', color: T.text3, position: 'relative',
      }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,.06)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {I.bell}
        {unread > 0 && <span style={{
          position: 'absolute', top: 6, right: 6,
          width: 7, height: 7, borderRadius: 999,
          background: T.blue, border: '2px solid #fff',
        }} />}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 40, right: 0, width: 320,
          background: T.card, borderRadius: 12,
          border: `.5px solid ${T.hairline}`,
          boxShadow: '0 8px 32px rgba(0,0,0,.12)',
          zIndex: 200, overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 16px', borderBottom: `.5px solid ${T.hairline}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Notificaciones</span>
            {unread > 0 && <span style={{
              fontSize: 11, fontWeight: 600, color: '#fff',
              background: T.red, padding: '2px 8px', borderRadius: 999,
            }}>{unread}</span>}
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {notifications.length === 0
              ? <div style={{ padding: 32, textAlign: 'center', color: T.text4, fontSize: 13 }}>Todo en orden</div>
              : notifications.map((n, i) => (
                <div key={n.id} onClick={() => { router.push(n.href); setOpen(false) }}
                  style={{
                    padding: '12px 16px',
                    borderBottom: i < notifications.length - 1 ? `.5px solid ${T.soft}` : 'none',
                    cursor: 'pointer', fontSize: 13, color: T.text,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = T.sidebar}
                  onMouseLeave={e => e.currentTarget.style.background = T.card}
                >
                  {n.title}
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}

export default function TopBar({ title, subtitle, sections, activeSection, onSection, user, token }) {
  const router = useRouter()

  return (
    <header style={{
      height: 56,
      background: 'rgba(251,251,253,.9)',
      backdropFilter: 'saturate(180%) blur(20px)',
      WebkitBackdropFilter: 'saturate(180%) blur(20px)',
      borderBottom: `.5px solid ${T.hairline}`,
      display: 'flex', alignItems: 'center', padding: '0 24px',
      flexShrink: 0, position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', lineHeight: 1.1,
        paddingRight: 20, borderRight: sections ? `.5px solid ${T.hairline}` : 'none',
        marginRight: 4,
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.text, letterSpacing: -0.3 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: T.text4 }}>{subtitle}</div>}
      </div>

      {sections && <HeaderTabs sections={sections} active={activeSection} onChange={onSection} />}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => router.push('/settings')} style={{
          width: 32, height: 32, borderRadius: 8, border: 'none',
          background: 'transparent', display: 'grid', placeItems: 'center',
          cursor: 'pointer', color: T.text3,
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,.06)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {I.gear}
        </button>
        <NotificationBtn token={token} />
        <ProfileBtn user={user} router={router} />
      </div>
    </header>
  )
}
