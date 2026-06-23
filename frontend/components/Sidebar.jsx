'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useT } from '@/components/ui/tokens'
import BrandLogo from '@/components/ui/BrandLogo'

const Icon = ({ d, size=17, sw=1.5 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round"
    strokeLinejoin="round" style={{flexShrink:0}} aria-hidden="true">{d}</svg>
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
  menu:      <Icon d={<path d="M4 6h16M4 12h16M4 18h16"/>} sw={2} />,
  close:     <Icon d={<path d="M6 6l12 12M18 6L6 18"/>} sw={2} />,
}

const NAV_GROUPS = [
  {
    title: 'General',
    items: [
      { href: '/dashboard',   label: 'Dashboard',        icon: I.dashboard },
      { href: '/vera',        label: 'Vera',             icon: I.sparkle, tag: 'IA' },
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

import { API_BASE as API } from '@/lib/api'

export default function Sidebar({ active }) {
  const T = useT()
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState(null)
  const [company, setCompany] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [open, setOpen] = useState(false)   // drawer móvil

  const currentPath = active || pathname

  useEffect(() => {
    const t = localStorage.getItem('vela_token')
    if (!t) return
    try {
      // Fast first paint from the token (only carries is_admin reliably; `sub` is
      // the numeric user id, so don't show it as a name).
      const p = JSON.parse(atob(t.split('.')[1]))
      setIsAdmin(p.is_admin === true || p.is_admin === 'true')
    } catch {
      localStorage.removeItem('vela_token')
      router.push('/login')
      return
    }
    // Real identity (name + email) comes from /api/auth/me, not the JWT claims.
    fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        const name = d.full_name || d.email || 'Usuario'
        const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
        setUser({ name, initials, email: d.email || '' })
      })
      .catch(() => {})
    fetch(`${API}/api/vera/v2/status`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.empresa) setCompany(d.empresa) })
      .catch(e => console.error('Error de red:', e))
  }, [])

  // Cerrar el drawer con Escape (a11y).
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const companyInitials = company
    ? company.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
    : 'MB'

  function navItemStyle(isActive) {
    return {
      display:'flex',alignItems:'center',gap:10,
      minHeight:44, padding:'0 10px',borderRadius:8,
      color: isActive ? T.text : T.text2,
      background: isActive ? T.card : 'transparent',
      fontSize:13.5,fontWeight:isActive?500:400,
      cursor:'pointer',marginBottom:1,
      textDecoration:'none',
      boxShadow: isActive ? '0 .5px 1px rgba(0,0,0,.04),0 1px 3px rgba(0,0,0,.04),inset 0 0 0 .5px rgba(0,0,0,.04)' : 'none',
    }
  }

  return (
    <>
      <style>{`
        .sb-aside{
          width:248px; display:flex; flex-direction:column; flex-shrink:0;
          height:100dvh; position:sticky; top:0; z-index:50;
        }
        .sb-scroll::-webkit-scrollbar{width:4px}
        .sb-scroll::-webkit-scrollbar-thumb{background:var(--scrollbar);border-radius:999px}
        .sb-hamburger{ display:none; }
        .sb-overlay{ display:none; }
        @media (max-width:768px){
          .sb-aside{
            position:fixed; top:0; left:0;
            transform:translateX(-100%);
            transition:transform .25s ease;
            box-shadow:0 0 40px rgba(0,0,0,.18);
            z-index:1001;
          }
          .sb-aside.sb-open{ transform:translateX(0); }
          .sb-hamburger{
            display:grid; position:fixed; top:10px; left:10px; z-index:1000;
            width:38px; height:38px; place-items:center; border-radius:9px;
            cursor:pointer; font-family:inherit;
          }
          .sb-overlay{
            display:block; position:fixed; inset:0; z-index:1000;
            background:rgba(0,0,0,.45);
          }
        }
      `}</style>

      {/* Hamburguesa (solo móvil) */}
      <button className="sb-hamburger" aria-label="Abrir menú" aria-expanded={open}
        onClick={() => setOpen(true)}
        style={{ background:T.card, border:`.5px solid ${T.hairline}`, color:T.text2 }}>
        {I.menu}
      </button>

      {/* Scrim (solo móvil cuando está abierto) */}
      {open && <div className="sb-overlay" onClick={() => setOpen(false)} aria-hidden="true" />}

      <aside className={`sb-aside${open ? ' sb-open' : ''}`}
        style={{
          background: T.sidebar,
          borderRight: `1px solid ${T.hairline}`,
          fontFamily: 'inherit',
        }}>
        {/* Brand + cerrar (móvil) */}
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'22px 20px 16px'}}>
          <BrandLogo size={28} nameSize={15} nameColor={T.text} constColor={T.blue} />
          <button onClick={() => setOpen(false)} aria-label="Cerrar menú"
            className="sb-hamburger" style={{ position:'static', marginLeft:'auto', background:'transparent', border:'none', color:T.text3 }}>
            {I.close}
          </button>
        </div>

        {/* Company */}
        <button type="button" style={{
          margin:'0 12px 14px',padding:'9px 11px',borderRadius:10,
          background:T.card,border:`.5px solid ${T.hairline}`,
          display:'flex',alignItems:'center',gap:10,cursor:'pointer',
          fontFamily:'inherit', textAlign:'left',
        }}>
          <span style={{width:24,height:24,borderRadius:6,background:T.text,color:T.bg,display:'grid',placeItems:'center',fontWeight:600,fontSize:11}}>{companyInitials}</span>
          <span style={{fontSize:13,fontWeight:500,color:T.text,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{company || 'Mi empresa'}</span>
          <span style={{color:T.text4,display:'flex'}}>{I.chevronDown}</span>
        </button>

        {/* Nav */}
        <nav aria-label="Principal" className="sb-scroll" style={{overflowY:'auto',flex:1,minHeight:0}}>
          {NAV_GROUPS.map(g => (
            <div key={g.title} style={{padding:'4px 12px 12px'}}>
              <div style={{fontSize:11,fontWeight:600,color:T.text4,padding:'8px 10px 6px',letterSpacing:0.1}}>{g.title}</div>
              {g.items.map(n => {
                const isActive = currentPath === n.href || currentPath?.startsWith(n.href + '/')
                return (
                  <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    style={navItemStyle(isActive)}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = T.soft }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    <span style={{color: isActive ? T.blue : T.text3, display:'flex',flexShrink:0}}>{n.icon}</span>
                    <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{n.label}</span>
                    {n.tag && (
                      <span style={{fontSize:10,fontWeight:600,padding:'1.5px 6px',borderRadius:4,color:T.blue,background:'rgba(61,43,255,.1)',letterSpacing:0.2,textTransform:'uppercase',flexShrink:0}}>{n.tag}</span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{padding:'12px',borderTop:`1px solid ${T.hairline}`}}>
          {isAdmin && (
            <Link href="/admin" onClick={() => setOpen(false)}
              aria-current={currentPath === '/admin' ? 'page' : undefined}
              style={navItemStyle(currentPath === '/admin')}>
              <span style={{width:18,height:18,display:'grid',placeItems:'center',color: currentPath === '/admin' ? T.blue : T.text3}}>{I.shield}</span>
              <span style={{flex:1}}>Backoffice</span>
              <span style={{fontSize:10,fontWeight:600,color:T.text4,letterSpacing:.5}}>ADMIN</span>
            </Link>
          )}
        </div>
      </aside>
    </>
  )
}
