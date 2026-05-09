'use client'

export default function DashboardView({
  user,
  resumen,
  ventas,
  clientes,
  proyectos,
  loading,
}) {
  if (loading) {
    return (
      <main style={{ padding: 32 }}>
        <h1>Dashboard</h1>
        <p>Cargando datos...</p>
      </main>
    )
  }

  return (
    <main style={{ padding: 32 }}>
      <h1>Dashboard</h1>
      <p>Bienvenido, {user?.name || 'Usuario'}.</p>

      <section style={{ display: 'grid', gap: 16, marginTop: 24 }}>
        <div style={{ padding: 20, border: '1px solid #e5e7eb', borderRadius: 12, background: 'white' }}>
          <h2>Resumen</h2>
          <pre>{JSON.stringify(resumen, null, 2)}</pre>
        </div>

        <div style={{ padding: 20, border: '1px solid #e5e7eb', borderRadius: 12, background: 'white' }}>
          <h2>Ventas</h2>
          <pre>{JSON.stringify(ventas, null, 2)}</pre>
        </div>

        <div style={{ padding: 20, border: '1px solid #e5e7eb', borderRadius: 12, background: 'white' }}>
          <h2>Clientes</h2>
          <pre>{JSON.stringify(clientes, null, 2)}</pre>
        </div>

        <div style={{ padding: 20, border: '1px solid #e5e7eb', borderRadius: 12, background: 'white' }}>
          <h2>Proyectos</h2>
          <pre>{JSON.stringify(proyectos, null, 2)}</pre>
        </div>
      </section>
    </main>
  )
}
