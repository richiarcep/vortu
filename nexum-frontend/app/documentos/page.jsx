'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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

const MODULE_CONFIG = {
  finance:    { label:'Finanzas',     color:'#0071E3', bg:'rgba(0,113,227,.08)',   icon:'💰', desc:'Estados financieros, facturas, banco'  },
  hr:         { label:'RR.HH.',       color:'#34C759', bg:'rgba(52,199,89,.08)',   icon:'👥', desc:'Nóminas, empleados, feedback'           },
  accounting: { label:'Contabilidad', color:'#BF5AF2', bg:'rgba(191,90,242,.08)', icon:'📒', desc:'Asientos, cierre de caja, PGC'          },
  marketing:  { label:'Marketing',    color:'#FF9500', bg:'rgba(255,149,0,.08)',   icon:'📣', desc:'Campañas, análisis de mercado'          },
  general:    { label:'General',      color:'#86868B', bg:'rgba(134,134,139,.08)', icon:'📄', desc:'Documentos generales'                   },
}

const STATUS_CONFIG = {
  complete:   { label:'Completado', color:T.green,  bg:T.greenSoft,                        dot:T.green  },
  processing: { label:'Procesando', color:T.amber,  bg:T.amberSoft,                        dot:T.amber  },
  pending:    { label:'Pendiente',  color:T.blue,   bg:'rgba(0,113,227,.08)',               dot:T.blue   },
  error:      { label:'Error',      color:T.red,    bg:T.redSoft,                           dot:T.red    },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getFileIcon(name) {
  if (!name) return { emoji:'📄', color:'#86868B' }
  const ext = name.split('.').pop().toLowerCase()
  if (ext === 'pdf')                      return { emoji:'📕', color:'#FF3B30' }
  if (['csv','xlsx','xls'].includes(ext)) return { emoji:'📊', color:'#34C759' }
  if (['doc','docx'].includes(ext))       return { emoji:'📝', color:'#0071E3' }
  return { emoji:'📄', color:'#86868B' }
}

function formatDate(str) {
  if (!str) return '—'
  const d = new Date(str)
  return d.toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' })
    + ' · ' + d.toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' })
}

function formatSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024)    return bytes + ' B'
  if (bytes < 1048576) return (bytes/1024).toFixed(1) + ' KB'
  return (bytes/1048576).toFixed(1) + ' MB'
}

// ── Upload Zone ───────────────────────────────────────────────────────────────
function UploadZone({ onUpload, uploading }) {
  const [dragging, setDragging]       = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedModule, setModule]   = useState('finance')
  const fileRef = useRef()

  function handleDrop(e) {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]; if (f) setSelectedFile(f)
  }

  const fi = getFileIcon(selectedFile?.name)

  return (
    <div style={{ background:T.card, borderRadius:16, border:`.5px solid ${T.hairline}`, overflow:'hidden' }}>
      {/* Header */}
      <div style={{
        background:T.navy, padding:'16px 20px',
        backgroundImage:'radial-gradient(ellipse 80% 100% at 100% 50%, rgba(0,180,216,0.15) 0%, transparent 70%)',
      }}>
        <div style={{ fontSize:14, fontWeight:700, color:'#fff', marginBottom:2 }}>Subir documento</div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>Claude analiza cualquier archivo automáticamente</div>
      </div>

      <div style={{ padding:20 }}>
        {/* Módulo destino */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:600, color:T.text4, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>
            Módulo destino
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6 }}>
            {Object.entries(MODULE_CONFIG).map(([key, cfg]) => {
              const active = selectedModule === key
              return (
                <button key={key} onClick={() => setModule(key)} style={{
                  padding:'9px 4px', borderRadius:10, cursor:'pointer', textAlign:'center',
                  border:`.5px solid ${active ? cfg.color : T.hairline}`,
                  background: active ? cfg.bg : T.sidebar,
                  transition:'all .15s',
                }}>
                  <div style={{ fontSize:16, marginBottom:3 }}>{cfg.icon}</div>
                  <div style={{ fontSize:10, fontWeight:600, color: active ? cfg.color : T.text4 }}>{cfg.label}</div>
                </button>
              )
            })}
          </div>
          <div style={{ fontSize:11, color:T.text4, marginTop:8 }}>
            {MODULE_CONFIG[selectedModule].desc}
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !selectedFile && fileRef.current.click()}
          style={{
            border: `1.5px dashed ${dragging ? T.blue : selectedFile ? T.green : T.hairline}`,
            borderRadius:12, padding:24, textAlign:'center', marginBottom:12,
            background: dragging ? 'rgba(0,113,227,.04)' : selectedFile ? T.greenSoft : T.sidebar,
            cursor: selectedFile ? 'default' : 'pointer', transition:'all .2s',
          }}
        >
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.pdf,.doc,.docx"
            onChange={e => { if (e.target.files[0]) setSelectedFile(e.target.files[0]) }}
            style={{ display:'none' }}
          />
          {selectedFile ? (
            <div>
              <div style={{ fontSize:32, marginBottom:8 }}>{fi.emoji}</div>
              <div style={{ fontSize:13, fontWeight:600, color:T.text, marginBottom:4 }}>{selectedFile.name}</div>
              <div style={{ fontSize:11, color:T.text4, marginBottom:10 }}>{formatSize(selectedFile.size)}</div>
              <button onClick={e => { e.stopPropagation(); setSelectedFile(null) }} style={{
                fontSize:11, color:T.text3, background:T.card, border:`.5px solid ${T.hairline}`,
                borderRadius:999, padding:'4px 12px', cursor:'pointer',
              }}>
                Cambiar archivo
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize:28, marginBottom:8, opacity:.3 }}>📂</div>
              <div style={{ fontSize:13, fontWeight:500, color:T.text2, marginBottom:4 }}>Arrastra tu archivo aquí</div>
              <div style={{ fontSize:12, color:T.text4, marginBottom:10 }}>o haz clic para seleccionar</div>
              <div style={{ display:'flex', gap:5, justifyContent:'center' }}>
                {['CSV','Excel','PDF','Word'].map(t => (
                  <span key={t} style={{
                    fontSize:10, background:T.card, color:T.text3, fontWeight:600,
                    padding:'2px 8px', borderRadius:999, border:`.5px solid ${T.hairline}`,
                  }}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Botón */}
        <button
          onClick={() => selectedFile && onUpload(selectedFile, selectedModule)}
          disabled={!selectedFile || uploading}
          style={{
            width:'100%', padding:'11px', borderRadius:999, border:'none',
            background: selectedFile && !uploading ? T.navy : T.sidebar,
            color: selectedFile && !uploading ? '#fff' : T.text4,
            fontSize:13, fontWeight:600, cursor: selectedFile && !uploading ? 'pointer' : 'not-allowed',
            fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            transition:'all .2s', opacity: uploading ? .7 : 1,
          }}
        >
          {uploading ? (
            <>
              <div style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
              Procesando con IA...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Analizar con Claude
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ── Result Modal ──────────────────────────────────────────────────────────────
function ResultModal({ doc, onClose }) {
  if (!doc) return null
  let result = {}
  try { result = JSON.parse(doc.ai_result) } catch {}
  const mod    = MODULE_CONFIG[doc.module] || MODULE_CONFIG.general
  const fi     = getFileIcon(doc.filename)

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}
      onClick={onClose}
    >
      <div
        style={{ background:T.card, borderRadius:20, width:'100%', maxWidth:700, maxHeight:'85vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 32px 80px rgba(0,0,0,0.2)', border:`.5px solid ${T.hairline}` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div style={{ background:T.navy, padding:'20px 24px', display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:42, height:42, borderRadius:12, background:'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
            {mod.icon}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'#fff', marginBottom:2 }}>{doc.filename}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>Análisis IA · {mod.label}</div>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.08)', border:'none', color:'rgba(255,255,255,0.6)', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>

        {/* Modal body */}
        <div style={{ padding:24, overflowY:'auto', flex:1 }}>
          {result.summary && (
            <div style={{ background:T.sidebar, borderRadius:12, padding:16, marginBottom:16, borderLeft:`3px solid ${T.navy}` }}>
              <div style={{ fontSize:11, fontWeight:600, color:T.text4, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Resumen ejecutivo</div>
              <p style={{ margin:0, fontSize:13.5, color:T.text, lineHeight:1.65 }}>{result.summary}</p>
            </div>
          )}

          {result.health_score && (
            <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16, padding:16, background:T.greenSoft, borderRadius:12, border:`.5px solid rgba(52,199,89,.3)` }}>
              <div style={{ fontSize:36, fontWeight:700, color:T.green, letterSpacing:'-1px' }}>{result.health_score}</div>
              <div>
                <div style={{ fontWeight:700, color:T.green, fontSize:14 }}>Puntuación de salud financiera</div>
                <div style={{ fontSize:12, color:T.text4 }}>Sobre 10 — calculado por Claude</div>
              </div>
            </div>
          )}

          {(result.net_profit || result.total_revenue || result.total_expenses) && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
              {[
                { label:'Ingresos totales', value:result.total_revenue,  color:T.green },
                { label:'Gastos totales',   value:result.total_expenses, color:T.red   },
                { label:'Utilidad neta',    value:result.net_profit,     color: result.net_profit >= 0 ? T.green : T.red },
              ].filter(m => m.value !== undefined).map(m => (
                <div key={m.label} style={{ background:T.sidebar, borderRadius:12, padding:14, border:`.5px solid ${T.hairline}` }}>
                  <div style={{ fontSize:11, color:T.text4, marginBottom:4 }}>{m.label}</div>
                  <div style={{ fontWeight:700, color:m.color, fontSize:18, letterSpacing:'-0.4px' }}>
                    €{Number(m.value || 0).toLocaleString('es-ES', { minimumFractionDigits:2 })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {result.recommendations?.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:600, color:T.text4, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>Recomendaciones</div>
              {result.recommendations.map((rec, i) => (
                <div key={i} style={{ display:'flex', gap:10, marginBottom:8, padding:'10px 14px', background:T.sidebar, borderRadius:10, borderLeft:`2.5px solid ${T.blue}` }}>
                  <span style={{ color:T.blue, fontWeight:700, flexShrink:0, fontSize:12 }}>{i+1}</span>
                  <span style={{ fontSize:13, color:T.text }}>{rec}</span>
                </div>
              ))}
            </div>
          )}

          {result.raw_analysis && !result.summary && (
            <div style={{ background:T.sidebar, borderRadius:12, padding:16 }}>
              <div style={{ fontSize:11, fontWeight:600, color:T.text4, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Análisis completo</div>
              <p style={{ margin:0, fontSize:13, color:T.text, lineHeight:1.7, whiteSpace:'pre-wrap' }}>{result.raw_analysis}</p>
            </div>
          )}

          {!result.summary && !result.raw_analysis && (
            <div style={{ background:T.sidebar, borderRadius:12, padding:16 }}>
              <div style={{ fontSize:11, fontWeight:600, color:T.text4, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Datos del análisis</div>
              <pre style={{ margin:0, fontSize:12, color:T.text, overflowX:'auto', whiteSpace:'pre-wrap', fontFamily:'monospace' }}>{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DocumentosPage() {
  const router = useRouter()
  const [documents,   setDocuments]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [uploading,   setUploading]   = useState(false)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [filter,      setFilter]      = useState('all')
  const [success,     setSuccess]     = useState(false)
  const [error,       setError]       = useState('')
  const [token,       setToken]       = useState(null)
  const [sortKey,     setSortKey]     = useState('date')
  const [sortDir,     setSortDir]     = useState('desc')
  const [hoverRow,    setHoverRow]    = useState(null)

  useEffect(() => {
    const t = localStorage.getItem('nexum_token')
    if (!t) { router.push('/login'); return }
    setToken(t)
  }, [])

  async function fetchDocuments() {
    const t = localStorage.getItem('nexum_token')
    if (!t) return
    try {
      const res = await fetch(`${API}/api/upload/`, { headers:{ Authorization:`Bearer ${t}` } })
      if (res.status === 401) { router.push('/login'); return }
      if (res.ok) { const d = await res.json(); setDocuments(d.documents || d || []) }
    } catch { setError('No se pudo conectar con el servidor') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchDocuments()
    const iv = setInterval(fetchDocuments, 8000)
    return () => clearInterval(iv)
  }, [])

  async function handleRetry(documentId) {
    const t = localStorage.getItem('nexum_token')
    if (!t) return
    setError('')
    try {
      const res = await fetch(`${API}/api/upload/${documentId}/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}` },
      })
      if (res.ok) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 4000)
        fetchDocuments()
      } else {
        const e = await res.json()
        setError(e.detail || 'Error al reintentar el análisis')
      }
    } catch {
      setError('Error de conexión')
    }
  }

  async function handleUpload(file, module) {
    const t = localStorage.getItem('nexum_token')
    if (!t) return
    setUploading(true); setError('')
    try {
      const form = new FormData()
      form.append('file', file); form.append('module', module)
      const res = await fetch(`${API}/api/upload/`, { method:'POST', headers:{ Authorization:`Bearer ${t}` }, body:form })
      if (res.ok) { setSuccess(true); setTimeout(() => setSuccess(false), 4000); fetchDocuments() }
      else { const e = await res.json(); setError(e.detail || 'Error al subir el archivo') }
    } catch { setError('Error de conexión') }
    finally { setUploading(false) }
  }

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const filtered = (filter === 'all' ? documents : documents.filter(d => d.module === filter))
    .slice().sort((a, b) => {
      let av, bv
      if (sortKey === 'date')   { av = new Date(a.created_at); bv = new Date(b.created_at) }
      if (sortKey === 'name')   { av = a.filename?.toLowerCase(); bv = b.filename?.toLowerCase() }
      if (sortKey === 'module') { av = a.module; bv = b.module }
      if (sortKey === 'status') { av = a.status; bv = b.status }
      if (av < bv) return sortDir === 'asc' ? -1 :  1
      if (av > bv) return sortDir === 'asc' ?  1 : -1
      return 0
    })

  const stats = {
    total:      documents.length,
    complete:   documents.filter(d => d.status === 'complete').length,
    processing: documents.filter(d => d.status === 'processing' || d.status === 'pending').length,
    error:      documents.filter(d => d.status === 'error').length,
  }

  const modules = ['all', ...Object.keys(MODULE_CONFIG)]

  function SortArrow({ col }) {
    if (sortKey !== col) return <span style={{ color:T.text4, marginLeft:4, opacity:.4 }}>↕</span>
    return <span style={{ color:T.blue, marginLeft:4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:T.bg, fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif' }}>
      <style>{`
        @keyframes spin    { to { transform:rotate(360deg) } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        @keyframes slideIn { from { opacity:0; transform:translateX(-6px) } to { opacity:1; transform:translateX(0) } }
      `}</style>

      <Sidebar active="/documentos"/>

      <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:'100vh', overflow:'hidden' }}>

        {/* ── TOP BAR ── */}
        <div style={{ background:T.card, borderBottom:`.5px solid ${T.hairline}`, padding:'0 32px', display:'flex', alignItems:'center', height:56, flexShrink:0, gap:0 }}>
          {/* Título */}
          <div style={{ paddingRight:20, marginRight:4, borderRight:`.5px solid ${T.hairline}` }}>
            <div style={{ fontSize:15, fontWeight:700, color:T.text, letterSpacing:'-0.3px' }}>Documentos</div>
            <div style={{ fontSize:11, color:T.text4 }}>Claude analiza cualquier archivo</div>
          </div>

          {/* Tabs de módulo */}
          <div style={{ display:'flex', flex:1, overflowX:'auto' }}>
            {modules.map(m => {
              const cfg    = m === 'all' ? { label:'Todos', icon:'◻', color:T.text } : MODULE_CONFIG[m]
              const active = filter === m
              const count  = m === 'all' ? documents.length : documents.filter(d => d.module === m).length
              return (
                <button key={m} onClick={() => setFilter(m)} style={{
                  padding:'0 16px', height:56, background:'none', border:'none',
                  borderBottom: active ? `2px solid ${active && m !== 'all' ? MODULE_CONFIG[m]?.color || T.blue : T.text}` : '2px solid transparent',
                  color: active ? (m !== 'all' ? MODULE_CONFIG[m]?.color || T.text : T.text) : T.text3,
                  fontWeight: active ? 600 : 400, fontSize:13, cursor:'pointer',
                  fontFamily:'inherit', transition:'all .15s', whiteSpace:'nowrap',
                  display:'flex', alignItems:'center', gap:6,
                }}>
                  {m !== 'all' && <span style={{ fontSize:14 }}>{MODULE_CONFIG[m].icon}</span>}
                  {cfg.label}
                  {count > 0 && (
                    <span style={{
                      background: active ? (m !== 'all' ? MODULE_CONFIG[m]?.bg || T.soft : T.soft) : T.sidebar,
                      color: active ? (m !== 'all' ? MODULE_CONFIG[m]?.color || T.text3 : T.text) : T.text4,
                      borderRadius:999, padding:'1px 7px', fontSize:11, fontWeight:700,
                    }}>{count}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Stats rápidas */}
          <div style={{ display:'flex', gap:16, paddingLeft:20, borderLeft:`.5px solid ${T.hairline}`, flexShrink:0 }}>
            {[
              { label:'Completados', value:stats.complete,   color:T.green },
              { label:'Procesando',  value:stats.processing, color:T.amber },
              { label:'Con error',   value:stats.error,      color:T.red   },
            ].map(s => (
              <div key={s.label} style={{ textAlign:'center' }}>
                <div style={{ fontSize:16, fontWeight:700, color:s.value > 0 ? s.color : T.text4, lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:10, color:T.text4, marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div style={{ flex:1, overflowY:'auto', padding:'24px 32px' }}>

          {/* Alertas */}
          {success && (
            <div style={{ background:T.greenSoft, border:`.5px solid rgba(52,199,89,.3)`, borderRadius:10, padding:'11px 16px', marginBottom:16, color:T.green, fontWeight:600, fontSize:13, animation:'fadeUp .3s ease', display:'flex', alignItems:'center', gap:8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Archivo subido — Claude está analizando...
            </div>
          )}
          {error && (
            <div style={{ background:T.redSoft, border:`.5px solid rgba(255,59,48,.2)`, borderRadius:10, padding:'11px 16px', marginBottom:16, color:T.red, fontSize:13, animation:'fadeUp .3s ease', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span>⚠ {error}</span>
              <button onClick={() => setError('')} style={{ background:'none', border:'none', color:T.red, cursor:'pointer', fontSize:18, lineHeight:1 }}>×</button>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20, alignItems:'start' }}>

            {/* ── TABLA PRINCIPAL ── */}
            <div style={{ background:T.card, borderRadius:16, border:`.5px solid ${T.hairline}`, overflow:'hidden' }}>

              {/* Toolbar de tabla */}
              <div style={{ padding:'14px 18px', borderBottom:`.5px solid ${T.hairline}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ fontSize:13, fontWeight:600, color:T.text }}>
                  {filtered.length} {filtered.length === 1 ? 'documento' : 'documentos'}
                  {filter !== 'all' && <span style={{ color:T.text4, fontWeight:400 }}> en {MODULE_CONFIG[filter]?.label}</span>}
                </div>
                <div style={{ fontSize:11, color:T.text4 }}>
                  Actualización automática cada 8s
                  <span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background:T.green, marginLeft:6, verticalAlign:'middle' }}/>
                </div>
              </div>

              {loading ? (
                <div style={{ padding:'60px 20px', textAlign:'center', color:T.text4 }}>
                  <div style={{ width:24, height:24, border:`2px solid ${T.hairline}`, borderTopColor:T.blue, borderRadius:'50%', animation:'spin .7s linear infinite', margin:'0 auto 12px' }}/>
                  <div style={{ fontSize:13 }}>Cargando documentos...</div>
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ padding:'60px 20px', textAlign:'center' }}>
                  <div style={{ fontSize:40, marginBottom:12, opacity:.2 }}>📭</div>
                  <div style={{ fontSize:15, fontWeight:600, color:T.text, marginBottom:6 }}>
                    {filter === 'all' ? 'Aún no hay documentos' : `Sin documentos en ${MODULE_CONFIG[filter]?.label}`}
                  </div>
                  <div style={{ fontSize:13, color:T.text4 }}>Sube tu primer archivo desde el panel derecho</div>
                </div>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:T.sidebar }}>
                      {[
                        { key:'name',   label:'Nombre',     width:'35%' },
                        { key:'module', label:'Módulo',     width:'14%' },
                        { key:'status', label:'Estado',     width:'14%' },
                        { key:'date',   label:'Subido',     width:'18%' },
                        { key:null,     label:'Tamaño',     width:'10%' },
                        { key:null,     label:'',           width:'9%'  },
                      ].map(col => (
                        <th
                          key={col.label}
                          onClick={() => col.key && toggleSort(col.key)}
                          style={{
                            padding:'10px 14px', textAlign:'left',
                            fontSize:11, fontWeight:600, color:T.text4,
                            textTransform:'uppercase', letterSpacing:'0.07em',
                            width:col.width, cursor:col.key ? 'pointer' : 'default',
                            userSelect:'none',
                          }}
                        >
                          {col.label}
                          {col.key && <SortArrow col={col.key}/>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((doc, i) => {
                      const mod    = MODULE_CONFIG[doc.module] || MODULE_CONFIG.general
                      const status = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending
                      const fi     = getFileIcon(doc.filename)
                      const hover  = hoverRow === doc.id

                      return (
                        <tr
                          key={doc.id}
                          onMouseEnter={() => setHoverRow(doc.id)}
                          onMouseLeave={() => setHoverRow(null)}
                          style={{
                            borderTop:`.5px solid ${T.hairline}`,
                            background: hover ? T.sidebar : T.card,
                            transition:'background .1s',
                            animation:`slideIn .2s ease ${i*0.03}s both`,
                          }}
                        >
                          {/* Nombre */}
                          <td style={{ padding:'12px 14px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <div style={{
                                width:32, height:32, borderRadius:8,
                                background:`${fi.color}14`,
                                display:'flex', alignItems:'center', justifyContent:'center',
                                fontSize:16, flexShrink:0,
                              }}>
                                {fi.emoji}
                              </div>
                              <div style={{ minWidth:0 }}>
                                <div style={{ fontSize:13, fontWeight:500, color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:240 }}>
                                  {doc.filename}
                                </div>
                                {doc.file_size && (
                                  <div style={{ fontSize:11, color:T.text4 }}>{formatSize(doc.file_size)}</div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Módulo */}
                          <td style={{ padding:'12px 14px' }}>
                            <span style={{
                              display:'inline-flex', alignItems:'center', gap:4,
                              padding:'3px 10px', borderRadius:999,
                              background:mod.bg, color:mod.color,
                              fontSize:11, fontWeight:600,
                            }}>
                              {mod.icon} {mod.label}
                            </span>
                          </td>

                          {/* Estado */}
                          <td style={{ padding:'12px 14px' }}>
                            <span style={{
                              display:'inline-flex', alignItems:'center', gap:5,
                              padding:'3px 10px', borderRadius:999,
                              background:status.bg, color:status.color,
                              fontSize:11, fontWeight:600,
                            }}>
                              <span style={{ width:5, height:5, borderRadius:'50%', background:status.dot, display:'inline-block' }}/>
                              {status.label}
                              {doc.status === 'processing' && (
                                <span style={{ width:10, height:10, border:`1.5px solid ${T.amber}33`, borderTopColor:T.amber, borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
                              )}
                            </span>
                          </td>

                          {/* Fecha */}
                          <td style={{ padding:'12px 14px', fontSize:12, color:T.text3 }}>
                            {formatDate(doc.created_at)}
                          </td>

                          {/* Tamaño */}
                          <td style={{ padding:'12px 14px', fontSize:12, color:T.text4 }}>
                            {formatSize(doc.file_size)}
                          </td>

                          {/* Acciones */}
                          <td style={{ padding:'12px 14px' }}>
                            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                              {doc.status === 'complete' && doc.ai_result ? (
                                <button
                                  onClick={() => setSelectedDoc(doc)}
                                  style={{
                                    padding:'5px 12px', borderRadius:999, border:`.5px solid ${T.hairline}`,
                                    background: hover ? T.blue : T.card, color: hover ? '#fff' : T.text,
                                    fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                                    transition:'all .15s', whiteSpace:'nowrap',
                                  }}
                                >
                                  Ver análisis →
                                </button>
                              ) : doc.status === 'processing' ? (
                                <span style={{ fontSize:11, color:T.amber, fontStyle:'italic' }}>En proceso...</span>
                              ) : (doc.status === 'failed' || doc.status === 'pending' || doc.status === 'error') ? (
                                <button
                                  onClick={() => handleRetry(doc.id)}
                                  style={{
                                    padding:'5px 12px', borderRadius:999,
                                    border:`.5px solid ${T.red}`,
                                    background: hover ? T.red : T.redSoft,
                                    color: hover ? '#fff' : T.red,
                                    fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                                    transition:'all .15s', whiteSpace:'nowrap',
                                  }}
                                >
                                  ↺ Reintentar
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* ── PANEL DERECHO ── */}
            <div style={{ position:'sticky', top:0, display:'flex', flexDirection:'column', gap:14 }}>
              <UploadZone onUpload={handleUpload} uploading={uploading}/>

              {/* Tips */}
              <div style={{ background:T.card, borderRadius:16, border:`.5px solid ${T.hairline}`, padding:'16px 18px' }}>
                <div style={{ fontSize:11, fontWeight:600, color:T.text4, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:14 }}>
                  Qué puedes subir
                </div>
                {[
                  { icon:'📊', title:'Extractos bancarios CSV',  desc:'Claude genera P&L y flujo de caja automáticamente'      },
                  { icon:'📕', title:'Facturas PDF',             desc:'Extrae proveedor, importe, IVA e imputa al módulo'       },
                  { icon:'📋', title:'Nóminas Excel',            desc:'Calcula IRPF, SS y genera recibos de sueldo'            },
                  { icon:'📝', title:'Cierre de caja Vortu',     desc:'Sube la plantilla y Claude la procesa automáticamente'  },
                ].map(tip => (
                  <div key={tip.title} style={{ display:'flex', gap:10, marginBottom:12 }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:T.sidebar, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                      {tip.icon}
                    </div>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:T.text }}>{tip.title}</div>
                      <div style={{ fontSize:11, color:T.text4, marginTop:2, lineHeight:1.4 }}>{tip.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Info módulo seleccionado */}
              {filter !== 'all' && (
                <div style={{ background: MODULE_CONFIG[filter]?.bg, borderRadius:12, padding:'12px 16px', border:`.5px solid ${MODULE_CONFIG[filter]?.color}33` }}>
                  <div style={{ fontSize:13, fontWeight:600, color: MODULE_CONFIG[filter]?.color, marginBottom:4 }}>
                    {MODULE_CONFIG[filter]?.icon} {MODULE_CONFIG[filter]?.label}
                  </div>
                  <div style={{ fontSize:12, color:T.text3 }}>{MODULE_CONFIG[filter]?.desc}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedDoc && <ResultModal doc={selectedDoc} onClose={() => setSelectedDoc(null)}/>}
    </div>
  )
}