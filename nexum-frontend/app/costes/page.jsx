'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { useCurrency } from '@/components/useCurrency'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

const T = {
  bg:'#FBFBFD', card:'#FFFFFF', sidebar:'#F5F5F7',
  hairline:'rgba(0,0,0,0.08)', soft:'rgba(0,0,0,0.05)',
  text:'#1D1D1F', text2:'#424245', text3:'#6E6E73', text4:'#86868B',
  blue:'#0071E3', cyan:'#00B4D8',
  green:'#34C759', greenSoft:'rgba(52,199,89,.1)',
  amber:'#FF9500', amberSoft:'rgba(255,149,0,.1)',
  red:'#FF3B30', redSoft:'rgba(255,59,48,.08)',
  navy:'#0B1426',
}

const DEFAULT_CATS = [
  { name:'Personal',    color:'#0071E3', icon:'👥' },
  { name:'Marketing',   color:'#FF9500', icon:'📣' },
  { name:'Tecnología',  color:'#BF5AF2', icon:'💻' },
  { name:'Oficina',     color:'#00B4D8', icon:'🏢' },
  { name:'Viajes',      color:'#34C759', icon:'✈️' },
  { name:'Servicios',   color:'#FF3B30', icon:'🔧' },
]

const DEFAULT_DEPS = ['Administración','Ventas','Marketing','Tecnología','Operaciones','RRHH']

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function Card({ children, style={} }) {
  return (
    <div style={{
      background:T.card, borderRadius:16,
      border:`.5px solid ${T.hairline}`,
      boxShadow:'0 1px 2px rgba(0,0,0,.03)',
      padding:20, ...style,
    }}>
      {children}
    </div>
  )
}

function Btn({ children, onClick, disabled, color=T.blue, style={} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding:'8px 16px', borderRadius:999, border:'none',
      fontSize:13, fontWeight:500, cursor:disabled?'not-allowed':'pointer',
      fontFamily:'inherit', background:disabled?T.sidebar:color,
      color:disabled?T.text4:'#fff', opacity:disabled?.6:1,
      display:'inline-flex', alignItems:'center', gap:6,
      transition:'opacity .15s', ...style,
    }}>
      {children}
    </button>
  )
}

function BtnSec({ children, onClick, style={} }) {
  return (
    <button onClick={onClick} style={{
      padding:'8px 16px', borderRadius:999,
      border:`.5px solid ${T.hairline}`, background:T.card,
      fontSize:13, fontWeight:500, cursor:'pointer',
      fontFamily:'inherit', color:T.text,
      display:'inline-flex', alignItems:'center', gap:6, ...style,
    }}>
      {children}
    </button>
  )
}

const inp = {
  width:'100%', padding:'9px 12px', borderRadius:10,
  border:`.5px solid ${T.hairline}`, background:T.sidebar,
  fontSize:13, color:T.text, fontFamily:'inherit', outline:'none',
}

function Field({ label, children }) {
  return (
    <div style={{marginBottom:12}}>
      <div style={{fontSize:12,fontWeight:500,color:T.text3,marginBottom:5}}>{label}</div>
      {children}
    </div>
  )
}

export default function CentroCostesPag() {
  const { fmt, sym } = useCurrency()
  const router = useRouter()
  const [token,       setToken]       = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [dashboard,   setDashboard]   = useState(null)
  const [entries,     setEntries]     = useState([])
  const [categories,  setCategories]  = useState([])
  const [departments, setDepartments] = useState([])
  const [showForm,    setShowForm]    = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [selectedMonth, setMonth]     = useState(new Date().getMonth()+1)
  const [selectedYear,  setYear]      = useState(new Date().getFullYear())
  const [form, setForm] = useState({
    description:'', amount:'', category_id:'', department_id:'',
    date: new Date().toISOString().split('T')[0], notes:'',
  })

  useEffect(() => {
    const t = localStorage.getItem('nexum_token')
    if (!t) { router.push('/login'); return }
    setToken(t)
  }, [])

  useEffect(() => { if (token) loadAll() }, [token, selectedMonth, selectedYear])

  async function loadAll() {
    setLoading(true)
    const h = { Authorization:`Bearer ${token}` }
    try {
      const [dash, ents, cats, deps] = await Promise.all([
        fetch(`${API}/api/costs/dashboard`,                                   { headers:h }).then(r=>r.json()),
        fetch(`${API}/api/costs/entries?month=${selectedMonth}&year=${selectedYear}`, { headers:h }).then(r=>r.json()),
        fetch(`${API}/api/costs/categories`,                                  { headers:h }).then(r=>r.json()),
        fetch(`${API}/api/costs/departments`,                                 { headers:h }).then(r=>r.json()),
      ])
      setDashboard(dash); setEntries(ents); setCategories(cats); setDepartments(deps)
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  async function initDefaults() {
    const h = { 'Content-Type':'application/json', Authorization:`Bearer ${token}` }
    for (const cat of DEFAULT_CATS)
      await fetch(`${API}/api/costs/categories`,  { method:'POST', headers:h, body:JSON.stringify(cat) })
    for (const dep of DEFAULT_DEPS)
      await fetch(`${API}/api/costs/departments`, { method:'POST', headers:h, body:JSON.stringify({name:dep}) })
    await loadAll()
  }

  async function handleSubmit() {
    if (!form.description || !form.amount) return
    setSaving(true)
    try {
      await fetch(`${API}/api/costs/entries`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          amount:      parseFloat(form.amount),
          category_id: form.category_id   || null,
          department_id: form.department_id || null,
        }),
      })
      setForm({ description:'', amount:'', category_id:'', department_id:'',
                date:new Date().toISOString().split('T')[0], notes:'' })
      setShowForm(false)
      await loadAll()
    } catch(e) { console.error(e) }
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este gasto?')) return
    await fetch(`${API}/api/costs/entries/${id}`,
      { method:'DELETE', headers:{ Authorization:`Bearer ${token}` } })
    await loadAll()
  }

  const fmtLocal = n => (n||0).toLocaleString('es-ES', { minimumFractionDigits:2 })

  return (
    <div style={{
      minHeight:'100vh', background:T.bg, display:'flex',
      fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif',
    }}>
      <Sidebar active="/costes"/>
      <div style={{ flex:1, padding:'32px 36px', overflowY:'auto' }}>

        {/* ── HEADER ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:28 }}>
          <div>
            <div style={{ fontSize:22, fontWeight:700, color:T.text, letterSpacing:'-0.5px' }}>
              Centro de Costes
            </div>
            <div style={{ fontSize:13, color:T.text3, marginTop:2 }}>
              Controla dónde va el dinero de tu negocio
            </div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {/* Selector mes */}
            <select
              value={selectedMonth}
              onChange={e => setMonth(Number(e.target.value))}
              style={{...inp, width:'auto', padding:'7px 12px', borderRadius:999, cursor:'pointer'}}
            >
              {MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
            </select>
            {/* Selector año */}
            <select
              value={selectedYear}
              onChange={e => setYear(Number(e.target.value))}
              style={{...inp, width:'auto', padding:'7px 12px', borderRadius:999, cursor:'pointer'}}
            >
              {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {categories.length === 0 && (
              <BtnSec onClick={initDefaults}>⚡ Inicializar</BtnSec>
            )}
            <Btn onClick={() => setShowForm(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Registrar gasto
            </Btn>
          </div>
        </div>

        {/* ── KPIs ── */}
        {dashboard && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:20 }}>
            {[
              {
                label:'Total este mes',
                value:fmt(dashboard.total_current),
                sub: `${dashboard.diff_pct > 0 ? '↑' : '↓'} ${Math.abs(dashboard.diff_pct)}% vs mes anterior`,
                subColor: dashboard.diff_pct > 0 ? T.red : T.green,
              },
              {
                label:'Mes anterior',
                value:fmt(dashboard.total_prev),
                sub:'Referencia comparativa',
                subColor: T.text4,
              },
              {
                label:'Nº de gastos',
                value: dashboard.count,
                sub:'Este mes',
                subColor: T.text4,
              },
            ].map(k => (
              <Card key={k.label}>
                <div style={{ fontSize:11, fontWeight:600, color:T.text4, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>
                  {k.label}
                </div>
                <div style={{ fontSize:28, fontWeight:700, color:T.text, letterSpacing:'-0.5px', marginBottom:6 }}>
                  {k.value}
                </div>
                <div style={{ fontSize:12, color:k.subColor, fontWeight:500 }}>{k.sub}</div>
              </Card>
            ))}
          </div>
        )}

        {/* ── GRÁFICAS POR CATEGORÍA / DEPARTAMENTO ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>

          <Card>
            <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:16 }}>Por categoría</div>
            {dashboard?.by_category?.length > 0
              ? dashboard.by_category.map(cat => {
                  const pct = dashboard.total_current > 0 ? (cat.total / dashboard.total_current * 100) : 0
                  return (
                    <div key={cat.name} style={{ marginBottom:14 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                        <span style={{ fontSize:13, color:T.text, fontWeight:500 }}>
                          {cat.icon} {cat.name}
                        </span>
                        <span style={{ fontSize:13, color:T.text3 }}>
                          {fmt(cat.total)}
                          <span style={{ fontSize:11, color:T.text4, marginLeft:4 }}>({pct.toFixed(1)}%)</span>
                        </span>
                      </div>
                      <div style={{ height:4, background:T.soft, borderRadius:999, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${pct}%`, background:cat.color, borderRadius:999, transition:'width .4s' }}/>
                      </div>
                    </div>
                  )
                })
              : <div style={{ color:T.text4, fontSize:13, textAlign:'center', padding:'20px 0' }}>Sin gastos este mes</div>
            }
          </Card>

          <Card>
            <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:16 }}>Por departamento</div>
            {dashboard?.by_department?.length > 0
              ? dashboard.by_department.map(dep => {
                  const pct = dashboard.total_current > 0 ? (dep.total / dashboard.total_current * 100) : 0
                  return (
                    <div key={dep.name} style={{ marginBottom:14 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                        <span style={{ fontSize:13, color:T.text, fontWeight:500 }}>{dep.name}</span>
                        <span style={{ fontSize:13, color:T.text3 }}>
                          {fmt(dep.total)}
                          <span style={{ fontSize:11, color:T.text4, marginLeft:4 }}>({pct.toFixed(1)}%)</span>
                        </span>
                      </div>
                      <div style={{ height:4, background:T.soft, borderRadius:999, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${pct}%`, background:T.cyan, borderRadius:999, transition:'width .4s' }}/>
                      </div>
                    </div>
                  )
                })
              : <div style={{ color:T.text4, fontSize:13, textAlign:'center', padding:'20px 0' }}>Sin gastos este mes</div>
            }
          </Card>
        </div>

        {/* ── TABLA DE GASTOS ── */}
        <Card style={{ padding:0, overflow:'hidden' }}>
          <div style={{ padding:'18px 20px', borderBottom:`.5px solid ${T.hairline}` }}>
            <div style={{ fontSize:14, fontWeight:600, color:T.text }}>
              Gastos de {MONTHS[selectedMonth-1]} {selectedYear}
            </div>
          </div>
          {entries.length === 0
            ? (
              <div style={{ textAlign:'center', padding:'48px 20px', color:T.text4 }}>
                <div style={{ fontSize:32, marginBottom:10 }}>📭</div>
                <div style={{ fontSize:14, fontWeight:600, color:T.text3, marginBottom:4 }}>Sin gastos registrados</div>
                <div style={{ fontSize:13 }}>Pulsa "+ Registrar gasto" para añadir el primero</div>
              </div>
            )
            : (
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:T.sidebar }}>
                    {['Descripción','Categoría','Departamento','Fecha','Importe',''].map(h => (
                      <th key={h} style={{
                        padding:'10px 16px', textAlign:'left',
                        fontSize:11, fontWeight:600, color:T.text4,
                        textTransform:'uppercase', letterSpacing:'0.07em',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e,i) => (
                    <tr key={e.id} style={{
                      borderTop:`.5px solid ${T.hairline}`,
                      background: i%2===0 ? T.card : 'transparent',
                    }}>
                      <td style={{ padding:'13px 16px', fontSize:13, color:T.text, fontWeight:500 }}>
                        {e.description}
                      </td>
                      <td style={{ padding:'13px 16px' }}>
                        {e.category
                          ? <span style={{
                              padding:'3px 10px', borderRadius:999,
                              background:`${e.category.color}18`,
                              color:e.category.color,
                              fontSize:11, fontWeight:600,
                            }}>
                              {e.category.icon} {e.category.name}
                            </span>
                          : <span style={{ color:T.text4, fontSize:12 }}>—</span>
                        }
                      </td>
                      <td style={{ padding:'13px 16px', fontSize:13, color:T.text3 }}>
                        {e.department?.name || '—'}
                      </td>
                      <td style={{ padding:'13px 16px', fontSize:12, color:T.text4 }}>
                        {new Date(e.date).toLocaleDateString('es-ES')}
                      </td>
                      <td style={{ padding:'13px 16px', fontSize:14, fontWeight:700, color:T.red }}>
                        {fmt(e.amount)}
                      </td>
                      <td style={{ padding:'13px 16px' }}>
                        <button
                          onClick={() => handleDelete(e.id)}
                          style={{
                            background:'none', border:'none', cursor:'pointer',
                            color:T.text4, display:'flex', alignItems:'center',
                            padding:4, borderRadius:6, transition:'color .15s',
                          }}
                          onMouseEnter={ev => ev.currentTarget.style.color=T.red}
                          onMouseLeave={ev => ev.currentTarget.style.color=T.text4}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </Card>

        {/* ── MODAL ── */}
        {showForm && (
          <div style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.4)',
            zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <div style={{
              background:T.card, borderRadius:20, padding:28,
              width:460, boxShadow:'0 24px 64px rgba(0,0,0,.18)',
              border:`.5px solid ${T.hairline}`,
            }}>
              <div style={{ fontSize:17, fontWeight:700, color:T.text, marginBottom:20 }}>
                Registrar gasto
              </div>

              <Field label="Descripción *">
                <input
                  placeholder="Ej. Factura proveedor, nóminas..."
                  value={form.description}
                  onChange={e => setForm({...form, description:e.target.value})}
                  style={inp}
                  onFocus={e => e.target.style.borderColor=T.blue}
                  onBlur={e  => e.target.style.borderColor=T.hairline}
                />
              </Field>

              <Field label={`Importe (${sym}) *`}>
                <input
                  type="number" placeholder="0.00"
                  value={form.amount}
                  onChange={e => setForm({...form, amount:e.target.value})}
                  style={inp}
                  onFocus={e => e.target.style.borderColor=T.blue}
                  onBlur={e  => e.target.style.borderColor=T.hairline}
                />
              </Field>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Field label="Categoría">
                  <select
                    value={form.category_id}
                    onChange={e => setForm({...form, category_id:e.target.value})}
                    style={inp}
                  >
                    <option value="">Sin categoría</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </Field>
                <Field label="Departamento">
                  <select
                    value={form.department_id}
                    onChange={e => setForm({...form, department_id:e.target.value})}
                    style={inp}
                  >
                    <option value="">Sin departamento</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Fecha">
                <input
                  type="date" value={form.date}
                  onChange={e => setForm({...form, date:e.target.value})}
                  style={inp}
                />
              </Field>

              <Field label="Notas">
                <textarea
                  placeholder="Opcional..."
                  value={form.notes}
                  onChange={e => setForm({...form, notes:e.target.value})}
                  rows={2}
                  style={{...inp, resize:'none'}}
                />
              </Field>

              <div style={{ display:'flex', gap:10, marginTop:20 }}>
                <Btn onClick={handleSubmit} disabled={saving} style={{ flex:1, justifyContent:'center' }}>
                  {saving ? 'Guardando...' : 'Guardar gasto'}
                </Btn>
                <BtnSec onClick={() => setShowForm(false)} style={{ flex:1, justifyContent:'center' }}>
                  Cancelar
                </BtnSec>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}