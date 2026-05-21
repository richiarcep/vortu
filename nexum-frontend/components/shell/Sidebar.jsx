'use client'

import Link from 'next/link'

export default function Sidebar({ active = 'dashboard' }) {
  const links = [
    { href: '/dashboard', label: 'Dashboard', key: 'dashboard' },
    { href: '/finanzas', label: 'Finanzas', key: 'finanzas' },
    { href: '/documentos', label: 'Documentos', key: 'documentos' },
    { href: '/agente', label: 'Agente', key: 'agente' },
    { href: '/hr', label: 'HR', key: 'hr' },
    { href: '/ventas', label: 'Ventas', key: 'ventas' },
    { href: '/clientes', label: 'Clientes', key: 'clientes' },
    { href: '/proyectos', label: 'Proyectos', key: 'proyectos' },
    { href: '/contabilidad', label: 'Contabilidad', key: 'contabilidad' },
    { href: '/marketing', label: 'Marketing', key: 'marketing' },
    { href: '/settings', label: 'Settings', key: 'settings' },
  ]

  return (
    <aside
      style={{
        width: 240,
        minHeight: '100vh',
        borderRight: '1px solid #e5e7eb',
        background: '#ffffff',
        padding: 20,
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 24 }}>
        Nexum
      </div>

      <nav style={{ display: 'grid', gap: 8 }}>
        {links.map((link) => {
          const isActive = active === link.key

          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                textDecoration: 'none',
                color: isActive ? '#0f172a' : '#64748b',
                background: isActive ? '#f1f5f9' : 'transparent',
                fontWeight: isActive ? 700 : 500,
              }}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
