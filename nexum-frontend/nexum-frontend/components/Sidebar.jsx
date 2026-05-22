'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const T = {
  bg:         '#FBFBFD',
  sidebar:    '#F5F5F7',
  card:       '#FFFFFF',
  hairline:   'rgba(0,0,0,0.08)',
  text:       '#1D1D1F',
  text2:      '#424245',
  text3:      '#6E6E73',
  text4:      '#86868B',
  blue:       '#0071E3',
  cyan:       '#00B4D8',
  green:      '#34C759',
  amber:      '#FF9500',
  red:        '#FF3B30',
}

const Icon = ({ d, size=17, sw=1.5 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round"
    strokeLinejoin="round" style={{flexShrink:0}}>{d}</svg>
)
const I = {
  dashboard: <Icon d={<><rect x="3.5" y="3.5" width="7" height="8" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="5" rx="1.8"/><rect x="13.5" y="12.5" width="7" height="8" rx="1.8"/><rect x="3.5" y="15.5" width="7" height="5" rx="1.8"/></>} />,
  book:      <Icon d={<><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z"/><path d="M8 7.5h7M8 11.5h7"/></>} />,
  coin:      <Icon d={<><circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.5c-.7-1-1.9-1.5-2.8-1.5-1.8 0-3 .9-3 2.2 0 3 6 1.6 6 4.6 0 1.3-1.2 2.2-3 2.2-1.4 0-2.6-.7-3.2-1.7M12 7v10"/></>} />,
  users:     <Icon d={<><circle cx="9" cy="8" r="3"/><path d="M3.5 19.5c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5"/><circle cx="17" cy="9" r="2.3"/><path d="M15.5 14.3c2.5.5 4.3 2.5 4.3 5"/></>} />,
  folder:    <Icon d={<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>} />,
  briefcase: <Icon d={<><rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M8 7V5.5A2 2 0 0 1 10 3.5h4a2 2 0 0 1 2 2V7M3 13h18"/></>} />,
  cart:      <Icon d={<><path d="M3 4.5h2L7.4 15.7a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8.5H6"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/></>} />,
  doc:       <Icon d={<><path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5l-5-5z"/><path d="M14 3.5v5h5M9 14h6M9 17h6"/></>} />,
  sparkle:   <Icon d={<><path d="M12 3.5l1.6 4.4 4.4 1.6-4.4 1.6L12 15.5l-1.6-4.4-4.4-1.6 4.4-1.6L12 3.5z"/><path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7L19 16z"/></>} />,
  megaphone: <Icon d={<><path d="M3.5 11v2a2 2 0 0 0 2 2h.5l3 4 1-1V8L9 7H5.5a2 2 0 0 0-2 2v2z"/><path d="M9 7l11-4v18L9 17"/></>} />,
  target:    <Icon d={<><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></>} />,
  shield:    <Icon d={<path d="M12 3.5l8 3v5.5c0 4.8-3.4 7.8-8 8.5-4.6-.7-8-3.7-8-8.5V6.5l8-3z"/>} />,
  chevronDown: <Icon d={<path d="M6 9.5l6 5 6-5"/>} />,
}

const NAV_GROUPS = [
  {
    title: 'General',
    items: [
      { href: '/dashboard',   label: 'Dashboard',        icon: I.dashboard },
      { href: '/agente',      label: 'Agente IA',        icon: I.sparkle, tag: 'IA' },
    ],
  },
  {
    title: 'Finanzas',
    items: [
      { href: '/contabilidad', label: 'Contabilidad',    icon: I.book },
      { href: '/finanzas',     label: 'Finanzas',        icon: I.coin },
      { href: '/costes',       label: 'Centro de Costes',icon: I.target },
      { href: '/documentos',   label: 'Documentos',      icon: I.doc },
    ],
  },
  {
    title: 'Negocio',
    items: [
      { href: '/clientes',    label: 'Clientes',          icon: I.briefcase },
      { href: '/ventas',      label: 'Ventas',            icon: I.cart },
      { href: '/proyectos',   label: 'Proyectos',         icon: I.folder },
      { href: '/marketing',   label: 'Marketing',         icon: I.megaphone },
      { href: '/hr',          label: 'Recursos Humanos',  icon: I.users },
    ],
  },
]

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function Sidebar({ active }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState(null)
  const [company, setCompany] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const currentPath = active || pathname

  useEffect(() => {
    const t = localStorage.getItem('nexum_token')
    if (!t) return
    try {
      const p = JSON.parse(atob(t.split('.')[1]))
      const name = p.name || p.sub || 'Usuario'
      const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
      setUser({ name, initials, email: p.sub || '' })
      setIsAdmin(p.is_admin === true || p.is_admin === 'true')
    } catch {}
    fetch(`${API}/api/agente/resumen`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.empresa) setCompany(d.empresa) })
      .catch(() => {})
  }, [])

  const companyInitials = company
    ? company.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
    : 'MB'

  return (
    <aside style={{
      width: 248, background: T.sidebar,
      borderRight: `1px solid ${T.hairline}`,
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      height: '100vh', position: 'sticky', top: 0,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif",
    }}>
      <style>{`
        .sb-scroll::-webkit-scrollbar{width:4px}
        .sb-scroll::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:999px}
        .sb-item{transition:background .12s ease}
      `}</style>

      {/* Brand */}
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'22px 20px 16px'}}>
        <div style={{
          width:28,height:28,borderRadius:7,
          background:'linear-gradient(135deg,#00B4D8 0%,#5EEAD4 100%)',
          display:'grid',placeItems:'center',
          color:'#fff',fontWeight:700,fontSize:13,
          boxShadow:'inset 0 0 0 .5px rgba(0,0,0,.12),0 1px 1px rgba(0,0,0,.04)',
        }}>V</div>
        <div style={{display:'flex',flexDirection:'column',lineHeight:1.1}}>
          <span style={{fontSize:15,fontWeight:600,color:T.text,letterSpacing:-0.3}}>Vortu</span>
          <span style={{fontSize:11,color:T.text4,fontWeight:500,marginTop:1}}>by Nexum</span>
        </div>
      </div>

      {/* Company */}
      <div style={{
        margin:'0 12px 14px',padding:'9px 11px',borderRadius:10,
        background:T.card,border:`.5px solid ${T.hairline}`,
        display:'flex',alignItems:'center',gap:10,cursor:'pointer',
      }}>
        <div style={{width:24,height:24,borderRadius:6,background:'#1D1D1F',color:'#fff',display:'grid',placeItems:'center',fontWeight:600,fontSize:11}}>{companyInitials}</div>
        <span style={{fontSize:13,fontWeight:500,color:T.text,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{company || 'Mi empresa'}</span>
        <span style={{color:T.text4,display:'flex'}}>{I.chevronDown}</span>
      </div>

      {/* Nav */}
      <div className="sb-scroll" style={{overflowY:'auto',flex:1,minHeight:0}}>
        {NAV_GROUPS.map(g => (
          <div key={g.title} style={{padding:'4px 12px 12px'}}>
            <div style={{fontSize:11,fontWeight:600,color:T.text4,padding:'8px 10px 6px',letterSpacing:0.1}}>{g.title}</div>
            {g.items.map(n => {
              const isActive = currentPath === n.href || currentPath?.startsWith(n.href + '/')
              return (
                <div key={n.href} className="sb-item"
                  onClick={() => router.push(n.href)}
                  style={{
                    display:'flex',alignItems:'center',gap:10,
                    padding:'7px 10px',borderRadius:8,
                    color: isActive ? T.text : T.text2,
                    background: isActive ? T.card : 'transparent',
                    fontSize:13.5,fontWeight:isActive?500:400,
                    cursor:'pointer',marginBottom:1,
                    boxShadow: isActive ? '0 .5px 1px rgba(0,0,0,.04),0 1px 3px rgba(0,0,0,.04),inset 0 0 0 .5px rgba(0,0,0,.04)' : 'none',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(0,0,0,.04)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{color: isActive ? T.blue : T.text3, display:'flex',flexShrink:0}}>{n.icon}</span>
                  <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{n.label}</span>
                  {n.tag && (
                    <span style={{fontSize:10,fontWeight:600,padding:'1.5px 6px',borderRadius:4,color:T.blue,background:'rgba(0,113,227,.1)',letterSpacing:0.2,textTransform:'uppercase',flexShrink:0}}>{n.tag}</span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div style={{padding:'0 12px 12px',borderTop:`1px solid ${T.hairline}`,paddingTop:12}}>
        {/* AI Card */}
        <div style={{marginBottom:10,padding:14,borderRadius:12,background:T.card,border:`.5px solid ${T.hairline}`,boxShadow:'0 1px 2px rgba(0,0,0,.03)'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
            <div style={{width:22,height:22,borderRadius:6,background:'linear-gradient(135deg,#0071E3,#00B4D8)',color:'#fff',display:'grid',placeItems:'center',flexShrink:0}}>{I.sparkle}</div>
            <span style={{fontSize:13,fontWeight:600,color:T.text}}>Vera</span>
          </div>
          <div style={{fontSize:11.5,color:T.text3,lineHeight:1.4,marginBottom:10}}>Tu agente analiza datos en tiempo real y detecta anomalias automaticamente.</div>
          <button onClick={() => router.push('/agente')} style={{fontSize:12,fontWeight:500,padding:'5px 12px',borderRadius:999,background:T.blue,color:'#fff',border:'none',cursor:'pointer',whiteSpace:'nowrap'}}>
            Abrir agente
          </button>
        </div>

        {/* Backoffice */}
        {isAdmin && (
          <div className="sb-item"
            onClick={() => router.push('/admin')}
            style={{
              display:'flex',alignItems:'center',gap:10,
              padding:'7px 10px',borderRadius:8,
              color: currentPath === '/admin' ? T.text : T.text2,
              background: currentPath === '/admin' ? T.card : 'transparent',
              fontSize:13.5,fontWeight:400,cursor:'pointer',marginBottom:8,
              boxShadow: currentPath === '/admin' ? '0 .5px 1px rgba(0,0,0,.04),inset 0 0 0 .5px rgba(0,0,0,.04)' : 'none',
            }}
            onMouseEnter={e => { if (currentPath !== '/admin') e.currentTarget.style.background = 'rgba(0,0,0,.04)' }}
            onMouseLeave={e => { if (currentPath !== '/admin') e.currentTarget.style.background = 'transparent' }}
          >
            <span style={{color:T.text3,display:'flex',flexShrink:0}}>{I.shield}</span>
            <span style={{flex:1}}>Backoffice</span>
            <span style={{fontSize:10,fontWeight:600,padding:'1.5px 6px',borderRadius:4,background:'rgba(0,0,0,.06)',color:T.text3,letterSpacing:0.2,textTransform:'uppercase'}}>Admin</span>
          </div>
        )}

        {/* User */}
        {user && (
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:10,cursor:'pointer'}}
            onClick={() => { localStorage.removeItem('nexum_token'); router.push('/login') }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,.04)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            title="Cerrar sesion"
          >
            <div style={{width:26,height:26,borderRadius:999,background:'linear-gradient(135deg,#0071E3,#00B4D8)',color:'#fff',display:'grid',placeItems:'center',fontWeight:600,fontSize:11,flexShrink:0,boxShadow:'inset 0 0 0 .5px rgba(0,0,0,.1)'}}>{user.initials}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:500,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.name}</div>
              <div style={{fontSize:11,color:T.text4}}>Cerrar sesion</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}