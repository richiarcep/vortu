'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const API  = 'http://127.0.0.1:8000'
const NAVY = '#0B1426'
const BLUE = '#2563eb'
const CYAN = '#00B4D8'
const RED  = '#dc2626'
const GREEN = '#16a34a'
const AMBER = '#d97706'

const card = { background: 'white', borderRadius: '14px', border: '1px solid #e5e9f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }
const btnPrimary = { padding: '10px 20px', borderRadius: '9px', background: NAVY, color: 'white', fontWeight: '700', fontSize: '13px', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }

const DEFAULT_CATS = [
  { name: 'Personal', color: '#2563eb', icon: '👥' },
  { name: 'Marketing', color: '#d97706', icon: '📣' },
  { name: 'Tecnología', color: '#7c3aed', icon: '💻' },
  { name: 'Oficina', color: '#0891b2', icon: '🏢' },
  { name: 'Viajes', color: '#059669', icon: '✈️' },
  { name: 'Servicios', color: '#dc2626', icon: '🔧' },
]

const DEFAULT_DEPS = ['Administración', 'Ventas', 'Marketing', 'Tecnología', 'Operaciones', 'RRHH']

export default function CentroCostesPag() {
  const router = useRouter()
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dashboard, setDashboard] = useState(null)
  const [entries, setEntries] = useState([])
  const [categories, setCategories] = useState([])
  const [departments, setDepartments] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ description: '', amount: '', category_id: '', department_id: '', date: new Date().toISOString().split('T')[0], notes: '' })
  const [saving, setSaving] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    const t = localStorage.getItem('nexum_token')
    if (!t) { router.push('/login'); return }
    setToken(t)
  }, [])

  useEffect(() => {
    if (!token) return
    loadAll()
  }, [token, selectedMonth, selectedYear])

  async function loadAll() {
    setLoading(true)
    const h = { Authorization: `Bearer ${token}` }
    try {
      const [dash, ents, cats, deps] = await Promise.all([
        fetch(`${API}/api/costs/dashboard`, { headers: h }).then(r => r.json()),
        fetch(`${API}/api/costs/entries?month=${selectedMonth}&year=${selectedYear}`, { headers: h }).then(r => r.json()),
        fetch(`${API}/api/costs/categories`, { headers: h }).then(r => r.json()),
        fetch(`${API}/api/costs/departments`, { headers: h }).then(r => r.json()),
      ])
      setDashboard(dash)
      setEntries(ents)
      setCategories(cats)
      setDepartments(deps)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function initDefaults() {
    const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    for (const cat of DEFAULT_CATS) {
      await fetch(`${API}/api/costs/categories`, { method: 'POST', headers: h, body: JSON.stringify(cat) })
    }
    for (const dep of DEFAULT_DEPS) {
      await fetch(`${API}/api/costs/departments`, { method: 'POST', headers: h, body: JSON.stringify({ name: dep }) })
    }
    await loadAll()
  }

  async function handleSubmit() {
    if (!form.description || !form.amount) return
    setSaving(true)
    try {
      await fetch(`${API}/api/costs/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount), category_id: form.category_id || null, department_id: form.department_id || null })
      })
      setForm({ description: '', amount: '', category_id: '', department_id: '', date: new Date().toISOString().split('T')[0], notes: '' })
      setShowForm(false)
      await loadAll()
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este gasto?')) return
    await fetch(`${API}/api/costs/entries/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    await loadAll()
  }

  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6fb', display: 'flex', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');*{box-sizing:border-box;}`}</style>
      <Sidebar active="/costes" />
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: NAVY, letterSpacing: '-0.5px' }}>Centro de Costes</div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>Controla dónde va el dinero de tu negocio</div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e9f0', fontFamily: 'inherit', fontSize: '13px', color: NAVY }}>
              {months.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e9f0', fontFamily: 'inherit', fontSize: '13px', color: NAVY }}>
              {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {categories.length === 0 && (
              <button onClick={initDefaults} style={{ ...btnPrimary, background: AMBER }}>⚡ Inicializar categorías</button>
            )}
            <button onClick={() => setShowForm(true)} style={btnPrimary}>+ Registrar gasto</button>
          </div>
        </div>

        {/* KPIs */}
        {dashboard && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={{ ...card, padding: '20px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total este mes</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: NAVY, letterSpacing: '-0.5px' }}>€{dashboard.total_current.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
              <div style={{ fontSize: '12px', color: dashboard.diff_pct > 0 ? RED : GREEN, marginTop: '4px', fontWeight: '600' }}>
                {dashboard.diff_pct > 0 ? '↑' : '↓'} {Math.abs(dashboard.diff_pct)}% vs mes anterior
              </div>
            </div>
            <div style={{ ...card, padding: '20px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mes anterior</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: NAVY, letterSpacing: '-0.5px' }}>€{dashboard.total_prev.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Referencia comparativa</div>
            </div>
            <div style={{ ...card, padding: '20px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nº de gastos</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: NAVY, letterSpacing: '-0.5px' }}>{dashboard.count}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Este mes</div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          {/* Por categoría */}
          <div style={{ ...card, padding: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY, marginBottom: '16px' }}>Por categoría</div>
            {dashboard?.by_category?.length > 0 ? dashboard.by_category.map((cat, i) => {
              const pct = dashboard.total_current > 0 ? (cat.total / dashboard.total_current * 100) : 0
              return (
                <div key={i} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: NAVY, fontWeight: '600' }}>{cat.icon} {cat.name}</span>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>€{cat.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} <span style={{ fontSize: '11px', color: '#9ca3af' }}>({pct.toFixed(1)}%)</span></span>
                  </div>
                  <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: cat.color, borderRadius: '3px', transition: 'width 0.4s' }} />
                  </div>
                </div>
              )
            }) : <div style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>Sin gastos este mes</div>}
          </div>

          {/* Por departamento */}
          <div style={{ ...card, padding: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY, marginBottom: '16px' }}>Por departamento</div>
            {dashboard?.by_department?.length > 0 ? dashboard.by_department.map((dep, i) => {
              const pct = dashboard.total_current > 0 ? (dep.total / dashboard.total_current * 100) : 0
              return (
                <div key={i} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: NAVY, fontWeight: '600' }}>{dep.name}</span>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>€{dep.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} <span style={{ fontSize: '11px', color: '#9ca3af' }}>({pct.toFixed(1)}%)</span></span>
                  </div>
                  <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: CYAN, borderRadius: '3px', transition: 'width 0.4s' }} />
                  </div>
                </div>
              )
            }) : <div style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>Sin gastos este mes</div>}
          </div>
        </div>

        {/* Lista de gastos */}
        <div style={{ ...card, padding: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY, marginBottom: '16px' }}>
            Gastos de {months[selectedMonth - 1]} {selectedYear}
          </div>
          {entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Sin gastos registrados</div>
              <div style={{ fontSize: '12px' }}>Pulsa "+ Registrar gasto" para añadir el primero</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f0f2f7' }}>
                  {['Descripción', 'Categoría', 'Departamento', 'Fecha', 'Importe', ''].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                    <td style={{ padding: '12px', fontSize: '13px', color: NAVY, fontWeight: '600' }}>{e.description}</td>
                    <td style={{ padding: '12px' }}>
                      {e.category ? <span style={{ padding: '3px 10px', borderRadius: '20px', background: `${e.category.color}18`, color: e.category.color, fontSize: '11px', fontWeight: '700' }}>{e.category.icon} {e.category.name}</span> : <span style={{ color: '#9ca3af', fontSize: '12px' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#6b7280' }}>{e.department?.name || '—'}</td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#9ca3af' }}>{new Date(e.date).toLocaleDateString('es-ES')}</td>
                    <td style={{ padding: '12px', fontSize: '14px', fontWeight: '800', color: RED }}>€{e.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '12px' }}>
                      <button onClick={() => handleDelete(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '16px' }}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal form */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '480px', boxShadow: '0 24px 48px rgba(0,0,0,0.15)' }}>
              <div style={{ fontSize: '18px', fontWeight: '800', color: NAVY, marginBottom: '20px' }}>Registrar gasto</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <input placeholder="Descripción del gasto *" value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={{ padding: '10px 14px', borderRadius: '9px', border: '1px solid #e5e9f0', fontFamily: 'inherit', fontSize: '13px' }} />
                <input type="number" placeholder="Importe en EUR *" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} style={{ padding: '10px 14px', borderRadius: '9px', border: '1px solid #e5e9f0', fontFamily: 'inherit', fontSize: '13px' }} />
                <select value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})} style={{ padding: '10px 14px', borderRadius: '9px', border: '1px solid #e5e9f0', fontFamily: 'inherit', fontSize: '13px', color: form.category_id ? NAVY : '#9ca3af' }}>
                  <option value="">Categoría (opcional)</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
                <select value={form.department_id} onChange={e => setForm({...form, department_id: e.target.value})} style={{ padding: '10px 14px', borderRadius: '9px', border: '1px solid #e5e9f0', fontFamily: 'inherit', fontSize: '13px', color: form.department_id ? NAVY : '#9ca3af' }}>
                  <option value="">Departamento (opcional)</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} style={{ padding: '10px 14px', borderRadius: '9px', border: '1px solid #e5e9f0', fontFamily: 'inherit', fontSize: '13px' }} />
                <textarea placeholder="Notas (opcional)" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} style={{ padding: '10px 14px', borderRadius: '9px', border: '1px solid #e5e9f0', fontFamily: 'inherit', fontSize: '13px', resize: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button onClick={handleSubmit} disabled={saving} style={{ ...btnPrimary, flex: 1 }}>{saving ? 'Guardando...' : 'Guardar gasto'}</button>
                <button onClick={() => setShowForm(false)} style={{ ...btnPrimary, background: '#f4f6fb', color: NAVY, flex: 1 }}>Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
