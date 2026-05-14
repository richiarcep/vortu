'use client'

export default function TopBar({ user }) {
  return (
    <header
      style={{
        height: 64,
        borderBottom: '1px solid #e5e7eb',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
      }}
    >
      <div>
        <strong>Vortu</strong>
        <span style={{ color: '#64748b', marginLeft: 8 }}>
          Business Platform
        </span>
      </div>

      <div style={{ color: '#64748b', fontSize: 14 }}>
        {user?.name || 'Usuario'}
      </div>
    </header>
  )
}
