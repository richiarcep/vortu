'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { FONT, useT, useTheme } from '@/components/ui/tokens'
import VeraDrawer from '@/components/ui/VeraDrawer'
import { openVeraDrawer } from '@/components/ui/useVeraStore'
import { Skeleton, EmptyState, HeaderActions } from '@/components/ui/primitives'

import { API_BASE as API } from '@/lib/api'
const VERA_BLUE = '#0071E3'

// ─────────────────────────────────────────────────────────
// CONFIGS
// ─────────────────────────────────────────────────────────
const SENTIMENT_CFG = {
  positive: { label: 'Positivo', color: '#059669', bg: 'rgba(5,150,105,.1)', dot: '#059669' },
  neutral:  { label: 'Neutral',  color: '#6b7280', bg: 'rgba(107,114,128,.1)', dot: '#9CA3AF' },
  negative: { label: 'Negativo', color: '#dc2626', bg: 'rgba(220,38,38,.1)', dot: '#dc2626' },
  urgent:   { label: 'Urgente',  color: '#9a3412', bg: 'rgba(154,52,18,.12)', dot: '#dc2626' },
}
const INTENT_CFG = {
  question:   { label: 'Pregunta',  color: '#0071E3', bg: 'rgba(0,113,227,.1)' },
  complaint:  { label: 'Queja',     color: '#dc2626', bg: 'rgba(220,38,38,.1)' },
  purchase:   { label: 'Compra',    color: '#059669', bg: 'rgba(5,150,105,.1)' },
  compliment: { label: 'Elogio',    color: '#7c3aed', bg: 'rgba(124,58,237,.1)' },
  other:      { label: 'Otro',      color: '#6b7280', bg: 'rgba(107,114,128,.1)' },
}
const RISK_CFG = {
  bajo:    { label: 'Bajo',     color: '#059669', bg: 'rgba(5,150,105,.08)',  dot: '#059669' },
  medio:   { label: 'Medio',    color: '#d97706', bg: 'rgba(217,119,6,.08)',  dot: '#F59E0B' },
  alto:    { label: 'Alto',     color: '#dc2626', bg: 'rgba(220,38,38,.08)',  dot: '#dc2626' },
  critico: { label: 'Crítico',  color: '#9a3412', bg: 'rgba(154,52,18,.10)',  dot: '#9a3412' },
}
const PLATFORM_LABEL = {
  email: 'Email', whatsapp: 'WhatsApp', instagram: 'Instagram',
  facebook: 'Facebook', manual: 'Manual',
}
const KB_TYPE_CFG = {
  faq:             { label: 'FAQ',       color: '#0071E3' },
  policy:          { label: 'Política',  color: '#7c3aed' },
  product_catalog: { label: 'Catálogo',  color: '#059669' },
  pricing:         { label: 'Precios',   color: '#d97706' },
  general:         { label: 'General',   color: '#6b7280' },
}

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────
function avatarColor(name) {
  const colors = ['#0071E3', '#7c3aed', '#059669', '#dc2626', '#d97706', '#0EA5E9', '#8B5CF6']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}
function initials(name) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}
function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  const diff = (Date.now() - date.getTime()) / 1000
  if (diff < 60) return 'ahora'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─────────────────────────────────────────────────────────
// PRIMITIVOS UI
// ─────────────────────────────────────────────────────────
function Pill({ label, color, bg, dot }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px', borderRadius: 6,
      fontSize: 11, fontWeight: 500,
      color, background: bg, whiteSpace: 'nowrap',
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: dot }} />}
      {label}
    </span>
  )
}

function Avatar({ name, size = 32, isVip }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 999,
      background: avatarColor(name),
      display: 'grid', placeItems: 'center',
      color: '#fff', fontSize: size * 0.4, fontWeight: 600,
      flexShrink: 0, position: 'relative',
    }}>
      {initials(name)}
      {isVip && (
        <div style={{
          position: 'absolute', bottom: -2, right: -2,
          width: 13, height: 13, borderRadius: 999,
          background: '#FFD700', border: '1.5px solid #fff',
          display: 'grid', placeItems: 'center', fontSize: 7,
        }}>★</div>
      )}
    </div>
  )
}

function KpiPill({ label, value, color }) {
  const T = useT()
  const c = color ?? T.text
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '7px 12px', borderRadius: 999,
      background: T.card, border: `.5px solid ${T.hairline}`,
      fontSize: 12,
    }}>
      <span style={{ color: T.text4, fontWeight: 500 }}>{label}</span>
      <span style={{ color: c, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )
}

function Tab({ active, onClick, label, badge }) {
  const T = useT()
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px', borderRadius: 8,
      background: active ? T.card : 'transparent',
      color: active ? T.text : T.text3,
      border: 'none',
      boxShadow: active ? '0 1px 2px rgba(0,0,0,.06)' : 'none',
      fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
      fontFamily: 'inherit',
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {label}
      {badge != null && badge > 0 && (
        <span style={{
          fontSize: 10, padding: '1px 5px', borderRadius: 999,
          background: active ? 'rgba(0,113,227,.12)' : 'rgba(0,0,0,.08)',
          color: active ? VERA_BLUE : T.text3,
          fontVariantNumeric: 'tabular-nums', minWidth: 16, textAlign: 'center',
        }}>{badge}</span>
      )}
    </button>
  )
}

// ─────────────────────────────────────────────────────────
// TAB 1: CLIENTES (con sub-vistas Lista/Grid/Kanban)
// ─────────────────────────────────────────────────────────
function ClientesTab({ contacts, onSelect, selected }) {
  const T = useT()
  const [view, setView] = useState('list')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const filtered = contacts.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())
        && !c.email?.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === 'vip' && !c.is_vip) return false
    if (filter === 'risk' && !['alto', 'critico'].includes(c.risk_level)) return false
    if (filter === 'active' && c.total_messages === 0) return false
    return true
  })

  return (
    <>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.text4 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente..." aria-label="Buscar clientes"
            style={{
              width: '100%', padding: '7px 10px 7px 30px',
              borderRadius: 8, border: `.5px solid ${T.hairline}`,
              background: T.card, fontSize: 12, fontFamily: 'inherit',
              color: T.text, outline: 'none',
            }} />
        </div>

        <div style={{ display: 'flex', gap: 2, background: T.sidebar, borderRadius: 8, padding: 3 }}>
          {[{k:'all',l:'Todos'},{k:'vip',l:'VIPs'},{k:'risk',l:'Riesgo'},{k:'active',l:'Activos'}].map(f => (
            <button key={f.k} onClick={() => setFilter(f.k)} style={{
              padding: '5px 10px', borderRadius: 6, border: 'none',
              background: filter === f.k ? T.card : 'transparent',
              color: filter === f.k ? T.text : T.text3,
              boxShadow: filter === f.k ? '0 1px 2px rgba(0,0,0,.06)' : 'none',
              fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}>{f.l}</button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 2, background: T.sidebar, borderRadius: 8, padding: 3 }}>
          {[
            { k: 'list', label: 'Vista de lista', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
            { k: 'grid', label: 'Vista de cuadrícula', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
            { k: 'kanban', label: 'Vista kanban', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="6" height="18"/><rect x="10" y="3" width="6" height="12"/><rect x="17" y="3" width="4" height="9"/></svg> },
          ].map(v => (
            <button key={v.k} onClick={() => setView(v.k)} aria-label={v.label} style={{
              padding: '5px 10px', borderRadius: 6, border: 'none',
              background: view === v.k ? T.card : 'transparent',
              color: view === v.k ? T.text : T.text3,
              boxShadow: view === v.k ? '0 1px 2px rgba(0,0,0,.06)' : 'none',
              cursor: 'pointer', display: 'grid', placeItems: 'center',
            }}>{v.icon}</button>
          ))}
        </div>
      </div>

      {view === 'list' && <ListView contacts={filtered} onSelect={onSelect} selectedId={selected?.id} />}
      {view === 'grid' && <GridView contacts={filtered} onSelect={onSelect} />}
      {view === 'kanban' && <KanbanView contacts={filtered} onSelect={onSelect} />}
    </>
  )
}

function ListView({ contacts, onSelect, selectedId }) {
  const T = useT()
  return (
    <div style={{ background: T.card, borderRadius: 12, border: `.5px solid ${T.hairline}`, overflow: 'hidden' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '40px 1fr 220px 100px 100px 100px 70px',
        gap: 12, padding: '10px 16px',
        fontSize: 10, color: T.text4, fontWeight: 500,
        textTransform: 'uppercase', letterSpacing: 0.5,
        borderBottom: `.5px solid ${T.hairline}`, background: T.sidebar,
      }}>
        <div></div><div>Cliente</div><div>Email</div><div>Plataforma</div>
        <div>Sentiment</div><div>Riesgo</div>
        <div style={{ textAlign: 'right' }}>Mensajes</div>
      </div>
      {contacts.map(c => {
        const risk = RISK_CFG[c.risk_level] || RISK_CFG.bajo
        const sent = SENTIMENT_CFG[c.last_sentiment] || SENTIMENT_CFG.neutral
        return (
          <div key={c.id} onClick={() => onSelect(c)}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,.02)'}
            onMouseLeave={e => e.currentTarget.style.background = selectedId === c.id ? 'rgba(0,113,227,.04)' : 'transparent'}
            style={{
              display: 'grid', gridTemplateColumns: '40px 1fr 220px 100px 100px 100px 70px',
              gap: 12, padding: '12px 16px',
              borderBottom: `.5px solid ${T.hairline}`, cursor: 'pointer',
              background: selectedId === c.id ? 'rgba(0,113,227,.04)' : 'transparent',
              alignItems: 'center', transition: 'background .12s',
            }}>
            <Avatar name={c.name} size={28} isVip={c.is_vip} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
              {c.notes && <div style={{ fontSize: 11, color: T.text4, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.notes}</div>}
            </div>
            <div style={{ fontSize: 12, color: T.text3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.email || '—'}</div>
            <div style={{ fontSize: 12, color: T.text3 }}>{PLATFORM_LABEL[c.platform] || c.platform}</div>
            <div><Pill {...sent} /></div>
            <div><Pill {...risk} /></div>
            <div style={{ textAlign: 'right', fontSize: 12, color: T.text3, fontVariantNumeric: 'tabular-nums' }}>
              {c.total_messages}
            </div>
          </div>
        )
      })}
      {contacts.length === 0 && (
        <EmptyState
          icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          title="Sin clientes"
          hint="No hay clientes que coincidan con tu búsqueda o filtros. Ajusta los criterios o añade un nuevo cliente."
        />
      )}
    </div>
  )
}

function GridView({ contacts, onSelect }) {
  const T = useT()
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12,
    }}>
      {contacts.map(c => {
        const risk = RISK_CFG[c.risk_level] || RISK_CFG.bajo
        return (
          <div key={c.id} onClick={() => onSelect(c)} className="hover-lift"
            style={{
              background: T.card, borderRadius: 12,
              border: `.5px solid ${T.hairline}`,
              padding: 16, cursor: 'pointer',
            }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
              <Avatar name={c.name} size={40} isVip={c.is_vip} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: T.text, marginBottom: 2 }}>{c.name}</div>
                <div style={{ fontSize: 11.5, color: T.text4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.email || c.phone || '—'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 5, marginBottom: 12, flexWrap: 'wrap' }}>
              <Pill {...risk} />
              {c.is_vip && <Pill label="VIP" color="#9a3412" bg="rgba(255,215,0,.18)" />}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `.5px solid ${T.hairline}`, paddingTop: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: T.text4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>Sentiment</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>
                  {c.sentiment_score?.toFixed(1) || '—'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: T.text4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>Mensajes</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>
                  {c.total_messages}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function KanbanView({ contacts, onSelect }) {
  const T = useT()
  const cols = ['bajo', 'medio', 'alto', 'critico']
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      {cols.map(col => {
        const items = contacts.filter(c => c.risk_level === col)
        const cfg = RISK_CFG[col]
        return (
          <div key={col} style={{ background: T.sidebar, borderRadius: 12, padding: 12, minHeight: 400 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 12, paddingBottom: 8, borderBottom: `.5px solid ${T.hairline}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: cfg.dot }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{cfg.label}</span>
              </div>
              <span style={{ fontSize: 11, color: T.text4, fontVariantNumeric: 'tabular-nums' }}>{items.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map(c => (
                <div key={c.id} onClick={() => onSelect(c)} className="hover-lift"
                  style={{
                    background: T.card, borderRadius: 8,
                    border: `.5px solid ${T.hairline}`,
                    padding: 10, cursor: 'pointer',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Avatar name={c.name} size={24} isVip={c.is_vip} />
                    <div style={{ fontSize: 12, fontWeight: 500, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: T.text4 }}>
                    <span>Score {c.sentiment_score?.toFixed(1)}</span>
                    <span>{c.total_messages} msgs</span>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <EmptyState
                  icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>}
                  title="Sin clientes"
                  hint="Ningún cliente en este nivel de riesgo."
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// TAB 2: INBOX GLOBAL
// ─────────────────────────────────────────────────────────
function InboxTab({ token, onSelectContact }) {
  const T = useT()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/clientes/inbox?status=${statusFilter}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (r.ok) {
        const d = await r.json()
        setMessages(d.messages || d || [])
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [statusFilter])

  return (
    <>
      <div style={{ display: 'flex', gap: 2, background: T.sidebar, borderRadius: 8, padding: 3, marginBottom: 16, width: 'fit-content' }}>
        {[
          { k: 'pending', l: 'Pendientes' },
          { k: 'draft_ready', l: 'Borrador listo' },
          { k: 'approved', l: 'Aprobados' },
          { k: 'auto_sent', l: 'Auto-enviados' },
        ].map(s => (
          <button key={s.k} onClick={() => setStatusFilter(s.k)} style={{
            padding: '5px 12px', borderRadius: 6, border: 'none',
            background: statusFilter === s.k ? T.card : 'transparent',
            color: statusFilter === s.k ? T.text : T.text3,
            boxShadow: statusFilter === s.k ? '0 1px 2px rgba(0,0,0,.06)' : 'none',
            fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}>{s.l}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Skeleton w="100%" h={72} />
          <Skeleton w="100%" h={72} />
          <Skeleton w="100%" h={72} />
        </div>
      ) : (
        <div style={{ background: T.card, borderRadius: 12, border: `.5px solid ${T.hairline}`, overflow: 'hidden' }}>
          {messages.length === 0 ? (
            <EmptyState
              icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
              title="Bandeja vacía"
              hint="No hay mensajes en esta categoría. Aparecerán aquí cuando lleguen nuevas conversaciones de tus clientes."
            />
          ) : messages.map(m => {
            const sent = SENTIMENT_CFG[m.ai_sentiment] || SENTIMENT_CFG.neutral
            const intent = INTENT_CFG[m.ai_intent] || INTENT_CFG.other
            return (
              <div key={m.id}
                onClick={() => m.contact_id && onSelectContact?.({ id: m.contact_id, name: m.contact?.name || 'Cliente' })}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,.02)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                style={{
                  padding: '14px 18px', borderBottom: `.5px solid ${T.hairline}`,
                  cursor: 'pointer', transition: 'background .12s',
                }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <Avatar name={m.contact?.name || 'C'} size={32} isVip={m.contact?.is_vip} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{m.contact?.name || `Contacto #${m.contact_id}`}</span>
                      {m.contact?.is_vip && (
                        <Pill label="★ VIP" color="#9a3412" bg="rgba(255,215,0,.18)" />
                      )}
                      <Pill {...sent} />
                      <Pill {...intent} />
                      {m.urgency_score >= 7 && (
                        <Pill label={`Urgencia ${m.urgency_score}/10`} color="#dc2626" bg="rgba(220,38,38,.1)" />
                      )}
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: T.text4 }}>{timeAgo(m.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.5, marginBottom: 6 }}>
                      {m.content}
                    </div>
                    {m.ai_draft && (
                      <div style={{
                        marginTop: 8, padding: 10, borderRadius: 8,
                        background: 'rgba(0,113,227,.04)', border: '.5px solid rgba(0,113,227,.15)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <div style={{ width: 14, height: 14, borderRadius: 4, background: VERA_BLUE, display: 'grid', placeItems: 'center' }}>
                            <svg width="8" height="8" viewBox="0 0 16 16" fill="none">
                              <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" fill="#fff" />
                            </svg>
                          </div>
                          <span style={{ fontSize: 10.5, fontWeight: 600, color: VERA_BLUE, textTransform: 'uppercase', letterSpacing: 0.5 }}>Borrador Vera</span>
                        </div>
                        <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.5 }}>{m.ai_draft}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────
// TAB 3: CONOCIMIENTO (Knowledge Base + Auto-responses)
// ─────────────────────────────────────────────────────────
function ConocimientoTab({ token }) {
  const T = useT()
  const [kbEntries, setKbEntries] = useState([])
  const [autoEntries, setAutoEntries] = useState([])
  const [section, setSection] = useState('kb')

  useEffect(() => {
    fetch(`${API}/api/clientes/knowledge-base`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setKbEntries(d.entries || d || [])).catch(e => console.error('Error de red:', e))
    fetch(`${API}/api/clientes/auto-responses`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setAutoEntries(d.responses || d || [])).catch(e => console.error('Error de red:', e))
  }, [])

  return (
    <>
      <div style={{ display: 'flex', gap: 2, background: T.sidebar, borderRadius: 8, padding: 3, marginBottom: 16, width: 'fit-content' }}>
        {[
          { k: 'kb', l: `Base de conocimiento (${kbEntries.length})` },
          { k: 'auto', l: `Auto-respuestas (${autoEntries.length})` },
        ].map(s => (
          <button key={s.k} onClick={() => setSection(s.k)} style={{
            padding: '5px 12px', borderRadius: 6, border: 'none',
            background: section === s.k ? T.card : 'transparent',
            color: section === s.k ? T.text : T.text3,
            boxShadow: section === s.k ? '0 1px 2px rgba(0,0,0,.06)' : 'none',
            fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}>{s.l}</button>
        ))}
      </div>

      {section === 'kb' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {kbEntries.map(e => {
            const cfg = KB_TYPE_CFG[e.kb_type] || KB_TYPE_CFG.general
            return (
              <div key={e.id} style={{
                background: T.card, borderRadius: 12,
                border: `.5px solid ${T.hairline}`, padding: 16,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, flex: 1 }}>{e.title}</div>
                  <Pill label={cfg.label} color={cfg.color} bg={`${cfg.color}1A`} />
                </div>
                <div style={{ fontSize: 12, color: T.text3, lineHeight: 1.5, marginBottom: 8 }}>
                  {e.full_content?.substring(0, 200)}{e.full_content?.length > 200 ? '…' : ''}
                </div>
                <div style={{ fontSize: 10.5, color: T.text4 }}>Creado {fmtDate(e.created_at)}</div>
              </div>
            )
          })}
          {kbEntries.length === 0 && (
            <div style={{ gridColumn: '1/-1' }}>
              <EmptyState
                icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>}
                title="Sin entradas"
                hint="Añade FAQs, políticas o catálogos para que Vera responda con información de tu negocio."
              />
            </div>
          )}
        </div>
      )}

      {section === 'auto' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {autoEntries.map(a => (
            <div key={a.id} style={{
              background: T.card, borderRadius: 12,
              border: `.5px solid ${T.hairline}`, padding: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: T.text4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>Si contiene</span>
                {(a.trigger_keywords || []).map(k => (
                  <Pill key={k} label={k} color={VERA_BLUE} bg="rgba(0,113,227,.08)" />
                ))}
                <span style={{ marginLeft: 'auto' }}>
                  <Pill label={a.is_active ? 'Activo' : 'Inactivo'} color={a.is_active ? '#059669' : '#9CA3AF'} bg={a.is_active ? 'rgba(5,150,105,.08)' : 'rgba(107,114,128,.08)'} dot={a.is_active ? '#059669' : '#9CA3AF'} />
                </span>
              </div>
              <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.6, padding: 10, background: T.sidebar, borderRadius: 8 }}>
                {a.response_template}
              </div>
            </div>
          ))}
          {autoEntries.length === 0 && (
            <EmptyState
              icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>}
              title="Sin auto-respuestas"
              hint="Configura respuestas automáticas por palabras clave para que Vera atienda mensajes al instante."
            />
          )}
        </div>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────
// TAB 4: INFORMES
// ─────────────────────────────────────────────────────────
function InformesTab({ token }) {
  const T = useT()
  const [report, setReport] = useState(null)
  const [analytics, setAnalytics] = useState(null)

  useEffect(() => {
    fetch(`${API}/api/clientes/sentiment-report`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setReport(d.report || d)).catch(e => console.error('Error de red:', e))
    fetch(`${API}/api/clientes/analytics`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setAnalytics(d)).catch(e => console.error('Error de red:', e))
  }, [])

  return (
    <>
      {report && (
        <div style={{
          background: T.card, borderRadius: 12,
          border: `.5px solid ${T.hairline}`, padding: 20, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: T.text4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                Informe semanal · {fmtDate(report.week_of)}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 32, fontWeight: 600, color: T.text }}>{report.overall_score?.toFixed(1)}</span>
                <span style={{ fontSize: 13, color: T.text4 }}>/ 10 score global</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <KpiPill label="Positivos" value={`${report.positive_pct}%`} color="#059669" />
              <KpiPill label="Neutrales" value={`${report.neutral_pct}%`} color="#6b7280" />
              <KpiPill label="Negativos" value={`${report.negative_pct}%`} color="#dc2626" />
            </div>
          </div>

          {report.claude_narrative && (
            <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.65, paddingTop: 14, borderTop: `.5px solid ${T.hairline}` }}>
              {report.claude_narrative}
            </div>
          )}

          {report.trending_topics?.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `.5px solid ${T.hairline}` }}>
              <div style={{ fontSize: 11, color: T.text4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                Temas recurrentes
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {report.trending_topics.map(t => (
                  <Pill key={t} label={t} color={T.text2} bg="rgba(0,0,0,.04)" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {analytics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { label: 'Mensajes hoy', val: analytics.messages_today },
            { label: 'Esta semana', val: analytics.messages_week },
            { label: 'Tiempo respuesta', val: analytics.avg_response_time ? `${analytics.avg_response_time}h` : '—' },
            { label: 'Tasa auto-respuesta', val: analytics.auto_response_rate ? `${analytics.auto_response_rate}%` : '—' },
          ].map((k, i) => (
            <div key={i} style={{
              background: T.card, borderRadius: 10,
              border: `.5px solid ${T.hairline}`, padding: 14,
            }}>
              <div style={{ fontSize: 10, color: T.text4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: T.text }}>{k.val ?? '—'}</div>
            </div>
          ))}
        </div>
      )}

      {!report && !analytics && (
        <EmptyState
          icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>}
          title="Sin informes todavía"
          hint="Cuando se registre actividad de clientes, aquí verás el informe semanal de sentiment y las métricas clave."
        />
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────
// DRAWER INBOX DEL CLIENTE
// ─────────────────────────────────────────────────────────
function ClientDrawer({ contact, onClose, token, onUpdate }) {
  const T = useT()
  const [messages, setMessages] = useState([])
  const [selectedMsg, setSelectedMsg] = useState(null)
  const [editedDraft, setEditedDraft] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const h = () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' })

  async function loadMessages() {
    try {
      const r = await fetch(`${API}/api/clientes/contactos/${contact.id}`, { headers: h() })
      if (r.ok) {
        const d = await r.json()
        const msgs = d.messages || []
        setMessages(msgs)
        if (msgs.length) {
          setSelectedMsg(msgs[0])
          setEditedDraft(msgs[0].ai_draft || '')
        }
      }
    } catch {}
  }

  useEffect(() => { loadMessages() }, [contact?.id])

  async function veraAnalyze(msg) {
    setAnalyzing(true)
    try {
      const r = await fetch(`${API}/api/vera/v2/chat`, {
        method: 'POST', headers: h(),
        body: JSON.stringify({
          message: `Genera respuesta breve y profesional para este mensaje del cliente ${contact.name} (sentiment ${contact.sentiment_score}/10, riesgo ${contact.risk_level}${contact.is_vip ? ', VIP' : ''}):\n\n"${msg.content}"\n\nDevuelve solo la respuesta a enviar.`,
        }),
      })
      if (r.ok) {
        const d = await r.json()
        setEditedDraft(d.response || d.content || '')
      }
    } catch (e) { alert('Error: ' + e.message) }
    finally { setAnalyzing(false) }
  }

  async function approveDraft() {
    if (!selectedMsg || !editedDraft.trim()) return
    try {
      await fetch(`${API}/api/clientes/mensaje/${selectedMsg.id}/aprobar`, {
        method: 'POST', headers: h(),
        body: JSON.stringify({ draft: editedDraft }),
      })
      loadMessages()
      onUpdate?.()
    } catch {}
  }

  async function rejectDraft() {
    if (!selectedMsg) return
    try {
      await fetch(`${API}/api/clientes/mensaje/${selectedMsg.id}/rechazar`, {
        method: 'POST', headers: h(),
      })
      loadMessages()
    } catch {}
  }

  async function toggleVip() {
    try {
      await fetch(`${API}/api/clientes/contactos/${contact.id}/vip`, {
        method: 'PUT', headers: h(),
        body: JSON.stringify({ is_vip: !contact.is_vip }),
      })
      onUpdate?.()
    } catch {}
  }

  if (!contact) return null
  const risk = RISK_CFG[contact.risk_level] || RISK_CFG.bajo

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)',
      display: 'flex', justifyContent: 'flex-end', zIndex: 100,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="cli-row" style={{
        width: '88vw', maxWidth: 1200, height: '100dvh',
        background: T.card, display: 'grid',
        gridTemplateColumns: '300px 1fr 260px',
        animation: 'slideIn .2s ease',
      }}>
        <style>{`@keyframes slideIn{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}@media (max-width:768px){.cli-row{grid-template-columns:1fr!important}}`}</style>

        {/* COLUMNA 1: LISTA MENSAJES */}
        <div style={{ borderRight: `.5px solid ${T.hairline}`, background: T.sidebar, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: 16, borderBottom: `.5px solid ${T.hairline}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name={contact.name} size={36} isVip={contact.is_vip} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{contact.name}</div>
              <div style={{ fontSize: 11, color: T.text4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{contact.email}</div>
            </div>
            <button onClick={onClose} aria-label="Cerrar" style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: 4, color: T.text4, display: 'grid', placeItems: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
            {messages.map(m => {
              const sent = SENTIMENT_CFG[m.ai_sentiment] || SENTIMENT_CFG.neutral
              return (
                <div key={m.id} onClick={() => { setSelectedMsg(m); setEditedDraft(m.ai_draft || '') }}
                  style={{
                    padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                    background: selectedMsg?.id === m.id ? T.card : 'transparent',
                    border: selectedMsg?.id === m.id ? `.5px solid ${T.hairline}` : '.5px solid transparent',
                    marginBottom: 4,
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 10.5, color: T.text4, fontWeight: 500 }}>
                      {m.direction === 'inbound' ? '↓ Recibido' : '↑ Enviado'}
                    </span>
                    <span style={{ fontSize: 10, color: T.text4 }}>{timeAgo(m.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: T.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>
                    {m.content}
                  </div>
                  {m.ai_sentiment && <Pill {...sent} />}
                </div>
              )
            })}
            {messages.length === 0 && (
              <EmptyState
                icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
                title="Sin mensajes"
                hint="Este cliente todavía no tiene conversaciones registradas."
              />
            )}
          </div>
        </div>

        {/* COLUMNA 2: DETALLE + BORRADOR */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedMsg ? (
            <>
              <div style={{ padding: '24px 32px', borderBottom: `.5px solid ${T.hairline}` }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                  {selectedMsg.ai_sentiment && <Pill {...SENTIMENT_CFG[selectedMsg.ai_sentiment]} />}
                  {selectedMsg.ai_intent && <Pill {...INTENT_CFG[selectedMsg.ai_intent]} />}
                  {selectedMsg.urgency_score >= 7 && (
                    <Pill label={`Urgencia ${selectedMsg.urgency_score}/10`} color="#dc2626" bg="rgba(220,38,38,.1)" />
                  )}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: T.text }}>{selectedMsg.content}</div>
                <div style={{ fontSize: 11, color: T.text4, marginTop: 10 }}>
                  {new Date(selectedMsg.created_at).toLocaleString('es-ES')}
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 5, background: VERA_BLUE, display: 'grid', placeItems: 'center' }}>
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                      <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" fill="#fff" />
                    </svg>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: VERA_BLUE }}>Borrador de Vera</span>
                  <button onClick={() => veraAnalyze(selectedMsg)} disabled={analyzing} style={{
                    marginLeft: 'auto', padding: '5px 12px', borderRadius: 6,
                    background: 'rgba(0,113,227,.08)', color: VERA_BLUE,
                    border: 'none', cursor: analyzing ? 'wait' : 'pointer',
                    fontSize: 11.5, fontFamily: 'inherit', fontWeight: 500,
                  }}>{analyzing ? 'Pensando…' : 'Generar con Vera'}</button>
                </div>

                <textarea
                  value={editedDraft}
                  onChange={e => setEditedDraft(e.target.value)}
                  placeholder="Escribe la respuesta o usa 'Generar con Vera'..."
                  style={{
                    width: '100%', minHeight: 180,
                    padding: 14, borderRadius: 10,
                    border: `.5px solid ${T.hairline}`,
                    fontSize: 13, fontFamily: 'inherit', lineHeight: 1.6,
                    resize: 'vertical', outline: 'none', color: T.text,
                  }}
                />

                <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                  <button onClick={rejectDraft} style={{
                    padding: '8px 14px', borderRadius: 8,
                    background: 'transparent', border: `.5px solid ${T.hairline}`,
                    color: T.text3, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                  }}>Rechazar</button>
                  <button onClick={approveDraft} disabled={!editedDraft.trim()} style={{
                    padding: '8px 18px', borderRadius: 8,
                    background: editedDraft.trim() ? VERA_BLUE : T.hairline,
                    color: '#fff', border: 'none',
                    fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                  }}>Aprobar y enviar</button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: T.text4, fontSize: 13 }}>
              Selecciona un mensaje
            </div>
          )}
        </div>

        {/* COLUMNA 3: INFO CLIENTE */}
        <div style={{ borderLeft: `.5px solid ${T.hairline}`, background: T.sidebar, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: T.text4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Información</div>
            <div style={{ background: T.card, borderRadius: 10, border: `.5px solid ${T.hairline}`, padding: 12 }}>
              <div style={{ fontSize: 10.5, color: T.text4, marginBottom: 2 }}>Email</div>
              <div style={{ fontSize: 12.5, color: T.text, marginBottom: 8 }}>{contact.email || '—'}</div>
              <div style={{ fontSize: 10.5, color: T.text4, marginBottom: 2 }}>Teléfono</div>
              <div style={{ fontSize: 12.5, color: T.text, marginBottom: 8 }}>{contact.phone || '—'}</div>
              <div style={{ fontSize: 10.5, color: T.text4, marginBottom: 2 }}>Plataforma</div>
              <div style={{ fontSize: 12.5, color: T.text }}>{PLATFORM_LABEL[contact.platform] || contact.platform}</div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10, color: T.text4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Sentiment</div>
            <div style={{ background: T.card, borderRadius: 10, border: `.5px solid ${T.hairline}`, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 26, fontWeight: 600, color: T.text }}>{contact.sentiment_score?.toFixed(1)}</span>
                <span style={{ fontSize: 11, color: T.text4 }}>/ 10</span>
              </div>
              <Pill {...risk} />
              <div style={{ fontSize: 11, color: T.text4, marginTop: 10 }}>
                Tendencia: <strong style={{ color: T.text2 }}>{contact.sentiment_trend}</strong>
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10, color: T.text4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Stats</div>
            <div style={{ background: T.card, borderRadius: 10, border: `.5px solid ${T.hairline}`, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: T.text3 }}>Mensajes</span>
                <span style={{ fontSize: 12, color: T.text, fontWeight: 600 }}>{contact.total_messages}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: T.text3 }}>Último contacto</span>
                <span style={{ fontSize: 12, color: T.text }}>{timeAgo(contact.last_contact_at)}</span>
              </div>
            </div>
          </div>

          <button onClick={toggleVip} style={{
            padding: '8px 12px', borderRadius: 8,
            background: contact.is_vip ? 'rgba(255,215,0,.18)' : T.card,
            color: contact.is_vip ? '#9a3412' : T.text,
            border: `.5px solid ${contact.is_vip ? 'rgba(255,215,0,.5)' : T.hairline}`,
            fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}>{contact.is_vip ? '★ Quitar VIP' : '☆ Marcar como VIP'}</button>
        </div>
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────
// TAB 5: HISTORIAL (mensajes ya enviados/respondidos)
// ─────────────────────────────────────────────────────────
function HistorialTab({ token, onSelectContact }) {
  const T = useT()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  async function load() {
    setLoading(true)
    try {
      // Cargar mensajes sent + auto_sent + approved
      const r = await fetch(`${API}/api/clientes/inbox?status=${filter === 'all' ? 'sent' : filter}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (r.ok) {
        const d = await r.json()
        let msgs = d.messages || d || []

        // Si filtro all, cargar también auto_sent y approved
        if (filter === 'all') {
          const [r2, r3] = await Promise.all([
            fetch(`${API}/api/clientes/inbox?status=auto_sent`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API}/api/clientes/inbox?status=approved`, { headers: { Authorization: `Bearer ${token}` } }),
          ])
          if (r2.ok) { const d2 = await r2.json(); msgs = [...msgs, ...(d2.messages || d2 || [])] }
          if (r3.ok) { const d3 = await r3.json(); msgs = [...msgs, ...(d3.messages || d3 || [])] }
        }

        // Ordenar por fecha más reciente
        msgs.sort((a, b) => new Date(b.responded_at || b.created_at) - new Date(a.responded_at || a.created_at))
        setMessages(msgs)
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  // Agrupar por fecha
  const grouped = (() => {
    const groups = {}
    messages.forEach(m => {
      const d = new Date(m.responded_at || m.created_at)
      const today = new Date()
      const diff = (today - d) / (1000 * 60 * 60 * 24)
      let key
      if (d.toDateString() === today.toDateString()) key = 'Hoy'
      else if (diff < 2) key = 'Ayer'
      else if (diff < 7) key = 'Esta semana'
      else if (diff < 30) key = 'Este mes'
      else key = 'Anterior'
      if (!groups[key]) groups[key] = []
      groups[key].push(m)
    })
    return groups
  })()

  const STATUS_LABEL = {
    sent: { label: 'Enviado manualmente', color: '#059669', bg: 'rgba(5,150,105,.1)', dot: '#059669' },
    auto_sent: { label: 'Auto-enviado por Vera', color: '#0071E3', bg: 'rgba(0,113,227,.1)', dot: '#0071E3' },
    approved: { label: 'Aprobado', color: '#059669', bg: 'rgba(5,150,105,.1)', dot: '#059669' },
    rejected: { label: 'Rechazado', color: '#dc2626', bg: 'rgba(220,38,38,.1)', dot: '#dc2626' },
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 2, background: T.sidebar, borderRadius: 8, padding: 3, marginBottom: 16, width: 'fit-content' }}>
        {[
          { k: 'all', l: 'Todo el historial' },
          { k: 'sent', l: 'Enviados manualmente' },
          { k: 'auto_sent', l: 'Auto-enviados' },
          { k: 'rejected', l: 'Rechazados' },
        ].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)} style={{
            padding: '5px 12px', borderRadius: 6, border: 'none',
            background: filter === f.k ? T.card : 'transparent',
            color: filter === f.k ? T.text : T.text3,
            boxShadow: filter === f.k ? '0 1px 2px rgba(0,0,0,.06)' : 'none',
            fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}>{f.l}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Skeleton w={140} h={12} />
          <Skeleton w="100%" h={90} />
          <Skeleton w="100%" h={90} />
        </div>
      ) : messages.length === 0 ? (
        <div style={{ background: T.card, borderRadius: 12, border: `.5px solid ${T.hairline}` }}>
          <EmptyState
            icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
            title="Sin mensajes en el historial"
            hint="Aquí aparecerán las respuestas enviadas a tus clientes, manuales y automáticas, una vez que gestiones conversaciones."
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Object.entries(grouped).map(([groupName, items]) => (
            <div key={groupName}>
              <div style={{
                fontSize: 10, color: T.text4, fontWeight: 500,
                textTransform: 'uppercase', letterSpacing: 0.5,
                marginBottom: 8, paddingLeft: 4,
              }}>{groupName} · {items.length}</div>

              <div style={{ background: T.card, borderRadius: 12, border: `.5px solid ${T.hairline}`, overflow: 'hidden' }}>
                {items.map(m => {
                  const statusCfg = STATUS_LABEL[m.status] || STATUS_LABEL.sent
                  const sent = SENTIMENT_CFG[m.ai_sentiment] || SENTIMENT_CFG.neutral
                  return (
                    <div key={m.id}
                      onClick={() => m.contact && onSelectContact?.(m.contact)}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      style={{
                        padding: '14px 18px',
                        borderBottom: `.5px solid ${T.hairline}`,
                        cursor: 'pointer', transition: 'background .12s',
                      }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <Avatar name={m.contact?.name || 'C'} size={32} isVip={m.contact?.is_vip} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{m.contact?.name || 'Cliente'}</span>
                            {m.contact?.is_vip && <Pill label="★ VIP" color="#9a3412" bg="rgba(255,215,0,.18)" />}
                            <Pill {...statusCfg} />
                            {m.ai_sentiment && <Pill {...sent} />}
                            <span style={{ marginLeft: 'auto', fontSize: 11, color: T.text4 }}>
                              {timeAgo(m.responded_at || m.created_at)}
                            </span>
                          </div>
                          {/* Mensaje original */}
                          <div style={{
                            fontSize: 12, color: T.text3, lineHeight: 1.5,
                            paddingLeft: 10, borderLeft: `2px solid ${T.hairline}`,
                            marginBottom: 6,
                          }}>
                            {m.content}
                          </div>
                          {/* Respuesta enviada */}
                          {m.ai_draft && (
                            <div style={{
                              fontSize: 12.5, color: T.text2, lineHeight: 1.55,
                              padding: 10, borderRadius: 8,
                              background: m.status === 'auto_sent' ? 'rgba(0,113,227,.04)' : 'rgba(5,150,105,.04)',
                              borderLeft: `2px solid ${m.status === 'auto_sent' ? '#0071E3' : '#059669'}`,
                            }}>
                              <div style={{
                                fontSize: 10, fontWeight: 600,
                                color: m.status === 'auto_sent' ? '#0071E3' : '#059669',
                                textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
                              }}>
                                {m.status === 'auto_sent' ? '✦ Respuesta de Vera' : '↑ Respuesta enviada'}
                              </div>
                              {m.ai_draft}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────
export default function ClientesPage() {
  const T = useT()
  const { theme } = useTheme()
  const router = useRouter()
  const [tab, setTab] = useState('clientes')
  const [contacts, setContacts] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(null)
  const [pendingCount, setPendingCount] = useState(0)

  async function loadContacts(t) {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/clientes/contactos`, { headers: { Authorization: `Bearer ${t}` } })
      if (r.ok) {
        const d = await r.json()
        setContacts(d.contacts || d || [])
      }
    } catch {}
    setLoading(false)
  }

  async function loadPendingCount(t) {
    try {
      const r = await fetch(`${API}/api/clientes/inbox?status=pending`, { headers: { Authorization: `Bearer ${t}` } })
      if (r.ok) {
        const d = await r.json()
        const msgs = d.messages || d || []
        setPendingCount(Array.isArray(msgs) ? msgs.length : 0)
      }
    } catch {}
  }

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('nexum_token') : null
    if (!t) { router.push('/login'); return }
    setToken(t)
    loadContacts(t)
    loadPendingCount(t)
  }, [])

  const stats = {
    total: contacts.length,
    vips: contacts.filter(c => c.is_vip).length,
    risk: contacts.filter(c => ['alto', 'critico'].includes(c.risk_level)).length,
    avgSentiment: contacts.length ? (contacts.reduce((s, c) => s + (c.sentiment_score || 0), 0) / contacts.length).toFixed(1) : '0',
  }

  return (
    <div style={{
      minHeight: '100dvh', background: T.bg, display: 'flex',
      fontFamily: FONT, WebkitFontSmoothing: 'antialiased',
    }}>
      <style>{`*{box-sizing:border-box}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:999px}input:focus{outline:none}`}</style>

      <Sidebar active="/clientes" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100dvh' }}>
        {/* HEADER */}
        <header style={{
          padding: '20px 32px 0',
          background: theme === 'dark' ? 'rgba(11,11,12,.85)' : 'rgba(251,251,253,.85)',
          backdropFilter: 'saturate(180%) blur(20px)',
          borderBottom: `.5px solid ${T.hairline}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <h1 style={{ fontSize: 22, fontWeight: 600, color: T.text, margin: 0, letterSpacing: -0.3 }}>Clientes</h1>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: '#059669' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.text4 }}>
                <svg width="16" height="11" viewBox="0 0 21 14" style={{ borderRadius: 2, display: 'block', flexShrink: 0 }} aria-label="España">
                  <rect width="21" height="14" fill="#AA151B" />
                  <rect y="3.5" width="21" height="7" fill="#F1BF00" />
                </svg>
                <span>España</span>
                <span>·</span>
                <span>{stats.total} contactos · {stats.vips} VIPs · {stats.risk} en riesgo</span>
              </div>
            </div>

            <HeaderActions onVera={() => openVeraDrawer({ modulo: 'clientes' })} router={router}>
              <button style={{
                padding: '7px 14px', borderRadius: 8,
                background: VERA_BLUE, color: '#fff',
                border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5,
              }}>+ Nuevo cliente</button>
            </HeaderActions>
          </div>

          {/* TABS */}
          <div style={{ display: 'flex', gap: 2, background: T.sidebar, borderRadius: 8, padding: 3, width: 'fit-content' }}>
            <Tab label="Clientes" active={tab === 'clientes'} onClick={() => setTab('clientes')} />
            <Tab label="Inbox" active={tab === 'inbox'} onClick={() => setTab('inbox')} badge={pendingCount} />
            <Tab label="Conocimiento" active={tab === 'conocimiento'} onClick={() => setTab('conocimiento')} />
            <Tab label="Informes" active={tab === 'informes'} onClick={() => setTab('informes')} />
            <Tab label="Historial" active={tab === 'historial'} onClick={() => setTab('historial')} />
          </div>

          <div style={{ height: 16 }} />
        </header>

        {/* CONTENIDO */}
        <div className="fade-in" style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Skeleton w="100%" h={44} />
              <Skeleton w="100%" h={64} />
              <Skeleton w="100%" h={64} />
              <Skeleton w="100%" h={64} />
              <Skeleton w="100%" h={64} />
            </div>
          ) : (
            <>
              {tab === 'clientes' && (
                <ClientesTab contacts={contacts} onSelect={setSelected} selected={selected} />
              )}
              {tab === 'inbox' && (
                <InboxTab token={token} onSelectContact={c => {
                  const full = contacts.find(x => x.id === c.id)
                  if (full) setSelected(full)
                }} />
              )}
              {tab === 'conocimiento' && <ConocimientoTab token={token} />}
              {tab === 'informes' && <InformesTab token={token} />}
              {tab === 'historial' && (
                <HistorialTab token={token} onSelectContact={c => {
                  const full = contacts.find(x => x.id === c.id)
                  if (full) setSelected(full)
                }} />
              )}
            </>
          )}
        </div>
      </div>

      {selected && (
        <ClientDrawer contact={selected} onClose={() => setSelected(null)} token={token}
          onUpdate={() => { loadContacts(token); loadPendingCount(token) }} />
      )}

        <VeraDrawer />
    </div>
  )
}
