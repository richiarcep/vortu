'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { FONT, I, useT, useTheme } from '@/components/ui/tokens'

import { API_BASE as API } from '@/lib/api'
const VERA_BLUE = '#3D2BFF'
const VERA_PLUS_BLUE = '#3730A3'

// Iconos Lucide-style inline (stroke currentColor) — sustituyen a los emojis usados
// como icono en las sugerencias, para a11y consistente.
const SUGG_ICON_PROPS = {
  width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round',
  strokeLinejoin: 'round', 'aria-hidden': true,
}
const SUGGESTIONS = [
  { icon: <svg {...SUGG_ICON_PROPS}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>, text: '¿Cuál es mi margen este mes?' },
  { icon: <svg {...SUGG_ICON_PROPS}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>, text: 'Top 5 productos más vendidos' },
  { icon: <svg {...SUGG_ICON_PROPS}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>, text: 'Clientes en riesgo de impago' },
  { icon: <svg {...SUGG_ICON_PROPS}><line x1="12" y1="2" x2="12" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>, text: 'Previsión de caja próximos 30 días' },
  { icon: <svg {...SUGG_ICON_PROPS}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>, text: 'Compara este trimestre vs el anterior' },
  { icon: <svg {...SUGG_ICON_PROPS}><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 17.5v-11" /></svg>, text: 'Explícame mi modelo 303 de IVA' },
]

function FlagES({ size = 12 }) {
  return (
    <svg width={size} height={size * 0.66} viewBox="0 0 3 2" style={{
      borderRadius: 2, boxShadow: '0 0 0 .5px rgba(0,0,0,0.1)', flexShrink: 0,
    }}>
      <rect width="3" height="2" fill="#AA151B" />
      <rect y="0.5" width="3" height="1" fill="#F1BF00" />
    </svg>
  )
}

function ProfileBtn({ user, router }) {
  const T = useT()
  const [open, setOpen] = useState(false)
  const ref = useRef()
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
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
        padding: '3px 4px', borderRadius: 999, cursor: 'pointer',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 999,
          background: 'linear-gradient(135deg,#3D2BFF,#A5B1FF)',
          color: '#fff', display: 'grid', placeItems: 'center',
          fontWeight: 600, fontSize: 11,
        }}>{initials}</div>
        <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>
          {user?.name?.split(' ')[0] || 'Usuario'}
        </span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 40, right: 0, width: 180,
          background: T.card, borderRadius: 10,
          border: `.5px solid ${T.hairline}`,
          boxShadow: '0 8px 32px rgba(0,0,0,.12)', zIndex: 200, overflow: 'hidden',
        }}>
          <button onClick={() => { localStorage.removeItem('vela_token'); router.push('/login') }} style={{
            width: '100%', padding: '10px 14px', background: 'none',
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 13, color: T.red, textAlign: 'left',
          }}>Cerrar sesión</button>
        </div>
      )}
    </div>
  )
}

function VeraLogo({ size = 26 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 7,
      background: VERA_BLUE,
      display: 'grid', placeItems: 'center', flexShrink: 0,
    }}>
      <svg width={Math.round(size * 0.5)} height={Math.round(size * 0.5)} viewBox="0 0 16 16" fill="none">
        <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" fill="#fff" />
      </svg>
    </div>
  )
}

// Markdown renderer minimalista — convierte **bold**, ## headers, listas, tablas básicas.
//
// SEGURIDAD (no romper): el contenido se escapa (& < >) ANTES de construir cualquier
// HTML, y todo el HTML generado usa estilos estáticos sin atributos href/src. Por eso
// el resultado es seguro para dangerouslySetInnerHTML aunque el texto venga del LLM.
// Si en el futuro añades enlaces/imágenes (href/src) o cualquier atributo dinámico,
// DEBES sanear esos valores (p.ej. rechazar javascript:) o migrar a react-markdown
// + rehype-sanitize, o se abrirá un vector XSS.
function renderMarkdown(text) {
  if (!text) return ''
  // Escape HTML — debe ir primero (ver nota de seguridad arriba).
  let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // Tablas markdown (debe ir antes que listas)
  html = html.replace(/((?:\|[^\n]+\|\n)+)/g, (match) => {
    const lines = match.trim().split('\n').filter(l => l.trim())
    if (lines.length < 2) return match
    // Skip línea separadora ---
    const rows = lines.filter(l => !/^\|\s*[-:]+/.test(l))
    if (rows.length === 0) return match
    const cells = rows.map(r => r.split('|').slice(1, -1).map(c => c.trim()))
    let tbl = `<table style="border-collapse:collapse;margin:8px 0;font-size:13px;width:100%;max-width:520px;">`
    cells.forEach((row, idx) => {
      tbl += '<tr>'
      row.forEach(c => {
        if (idx === 0) tbl += `<th style="text-align:left;padding:6px 10px;border-bottom:.5px solid #DDD;font-weight:500;color:#666;font-size:12px;">${c}</th>`
        else tbl += `<td style="padding:6px 10px;border-bottom:.5px solid #EEE;">${c}</td>`
      })
      tbl += '</tr>'
    })
    tbl += '</table>'
    return tbl
  })

  // Headers
  html = html.replace(/^### (.+)$/gm, '<div style="font-size:14px;font-weight:600;margin:14px 0 6px;color:#1d1d1f;">$1</div>')
  html = html.replace(/^## (.+)$/gm, '<div style="font-size:15px;font-weight:600;margin:16px 0 8px;color:#1d1d1f;">$1</div>')
  html = html.replace(/^# (.+)$/gm, '<div style="font-size:16px;font-weight:600;margin:18px 0 10px;color:#1d1d1f;">$1</div>')

  // Listas con guión
  html = html.replace(/^- (.+)$/gm, '<div style="padding-left:14px;position:relative;margin:3px 0;"><span style="position:absolute;left:0;color:#999;">·</span>$1</div>')

  // Listas numeradas
  html = html.replace(/^(\d+)\. (.+)$/gm, '<div style="padding-left:22px;position:relative;margin:3px 0;"><span style="position:absolute;left:0;color:#666;font-weight:500;">$1.</span>$2</div>')

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:600;color:#1d1d1f;">$1</strong>')

  // Code inline
  html = html.replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,.05);padding:1px 5px;border-radius:4px;font-family:monospace;font-size:12.5px;">$1</code>')

  // Separadores
  html = html.replace(/^---$/gm, '<div style="height:.5px;background:#E5E5EA;margin:12px 0;"></div>')

  // Saltos de línea
  html = html.replace(/\n\n/g, '<div style="height:8px;"></div>')
  html = html.replace(/\n/g, '<br/>')

  return html
}

export default function VeraModule() {
  const T = useT()
  const { theme } = useTheme()
  const router = useRouter()
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState(null)
  const [conversations, setConversations] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingTitleChat, setEditingTitleChat] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [hoveredChat, setHoveredChat] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const messagesEnd = useRef(null)
  const textareaRef = useRef(null)

  const isPlus = status?.plan === 'plus'

  const getToken = () => localStorage.getItem('vela_token')
  const h = () => ({ Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' })

  useEffect(() => {
    const t = getToken()
    if (!t) { router.push('/login'); return }
    setToken(t)
    try {
      const p = JSON.parse(atob(t.split('.')[1]))
      setUser({ email: p.sub || '', name: p.name || p.sub || 'Usuario' })
    } catch {
      // Token malformado: limpiar y volver a login en vez de seguir con sesión rota.
      localStorage.removeItem('vela_token')
      router.push('/login')
      return
    }
    loadAll()
  }, [])

  useEffect(() => {
    if (activeChat?.id) loadMessages(activeChat.id)
    else setMessages([])
  }, [activeChat?.id])

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  async function loadAll() {
    await Promise.all([loadStatus(), loadConversations()])
  }

  async function loadStatus() {
    try {
      const r = await fetch(`${API}/api/vera/v2/status`, { headers: h() })
      if (r.ok) setStatus(await r.json())
    } catch { }
  }

  async function loadConversations() {
    try {
      const r = await fetch(`${API}/api/vera/v2/conversations`, { headers: h() })
      if (r.ok) {
        const d = await r.json()
        setConversations(d.conversations || [])
      }
    } catch { }
  }

  async function loadMessages(convId) {
    try {
      const r = await fetch(`${API}/api/vera/v2/conversations/${convId}/messages`, { headers: h() })
      if (r.ok) {
        const d = await r.json()
        setMessages(d.messages || [])
      } else {
        // Chat no existe -> deseleccionar
        setActiveChat(null)
        setMessages([])
        loadConversations()
      }
    } catch { }
  }

  async function newChat() {
    try {
      const r = await fetch(`${API}/api/vera/v2/conversations`, {
        method: 'POST', headers: h(),
        body: JSON.stringify({ title: 'Nuevo chat' }),
      })
      if (r.ok) {
        const d = await r.json()
        const newConv = { id: d.id, title: d.title, message_count: 0, created_at: new Date().toISOString() }
        setConversations(prev => [newConv, ...prev])
        setActiveChat(newConv)
        setMessages([])
        setTimeout(() => textareaRef.current?.focus(), 100)
      }
    } catch { }
  }

  async function deleteChat(id, e) {
    if (e) e.stopPropagation()
    if (!confirm('¿Eliminar este chat?')) return
    try {
      await fetch(`${API}/api/vera/v2/conversations/${id}`, {
        method: 'DELETE', headers: h(),
      })
      setConversations(prev => prev.filter(c => c.id !== id))
      if (activeChat?.id === id) {
        setActiveChat(null)
        setMessages([])
      }
    } catch { }
  }

  async function startRenameChat(c, e) {
    e.stopPropagation()
    setEditingId(c.id)
    setTitleDraft(c.title)
  }

  async function saveRename(id) {
    if (!titleDraft.trim()) { setEditingId(null); return }
    try {
      await fetch(`${API}/api/vera/v2/conversations/${id}`, {
        method: 'PATCH', headers: h(),
        body: JSON.stringify({ title: titleDraft.trim() }),
      })
      setConversations(prev => prev.map(c =>
        c.id === id ? { ...c, title: titleDraft.trim() } : c
      ))
      if (activeChat?.id === id) {
        setActiveChat({ ...activeChat, title: titleDraft.trim() })
      }
    } catch { }
    setEditingId(null)
  }

  async function sendMessage(messageText) {
    const msg = (messageText || input).trim()
    if (!msg || sending) return
    if (!messageText) setInput('')
    setSending(true)
    setStreamingText('')

    let chat = activeChat

    // Validar que el chat existe en BD antes de enviar (puede haberse borrado)
    let needNewChat = !chat
    if (chat) {
      try {
        const checkR = await fetch(`${API}/api/vera/v2/conversations/${chat.id}/messages`, { headers: h() })
        if (!checkR.ok) needNewChat = true
      } catch { needNewChat = true }
    }

    if (needNewChat) {
      try {
        const r = await fetch(`${API}/api/vera/v2/conversations`, {
          method: 'POST', headers: h(),
          body: JSON.stringify({ title: 'Nuevo chat' }),
        })
        if (!r.ok) throw new Error('Crear chat falló')
        const d = await r.json()
        chat = { id: d.id, title: d.title, message_count: 0, created_at: new Date().toISOString() }
        setActiveChat(chat)
        setConversations(prev => [chat, ...prev.filter(c => c.id !== chat.id)])
      } catch (e) {
        setMessages(prev => [...prev, {
          id: 'err-' + Date.now(),
          role: 'assistant', error: true,
          content: 'No se pudo crear el chat: ' + e.message,
        }])
        setSending(false)
        return
      }
    }

    // Mostrar mensaje del usuario inmediatamente
    setMessages(prev => [...prev, {
      id: 'temp-u-' + Date.now(),
      role: 'user', content: msg,
      created_at: new Date().toISOString(),
    }])

    // Streaming SSE
    try {
      const r = await fetch(`${API}/api/vera/v2/chat/stream`, {
        method: 'POST', headers: h(),
        body: JSON.stringify({ conversation_id: chat.id, message: msg }),
      })

      if (!r.ok) {
        const errText = await r.text()
        setMessages(prev => [...prev, {
          id: 'err-' + Date.now(),
          role: 'assistant', error: true,
          content: 'Error: ' + (errText || r.statusText),
        }])
        setSending(false)
        setStreamingText('')
        return
      }

      const reader = r.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullText = ''
      let finalPlan = 'base'

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'chunk') {
              fullText += data.text
              setStreamingText(fullText)
            } else if (data.type === 'title') {
              setConversations(prev => prev.map(c =>
                c.id === chat.id ? { ...c, title: data.title } : c
              ))
              if (activeChat?.id === chat.id) {
                setActiveChat({ ...activeChat, title: data.title })
              }
            } else if (data.type === 'done') {
              finalPlan = data.plan || 'base'
            } else if (data.type === 'error') {
              fullText = 'Error: ' + data.message
            }
          } catch { }
        }
      }

      // Cuando termina, persistir el mensaje final
      setMessages(prev => [...prev, {
        id: 'asst-' + Date.now(),
        role: 'assistant',
        content: fullText,
        is_plus: finalPlan === 'plus',
        created_at: new Date().toISOString(),
      }])
      setStreamingText('')
      loadStatus()
    } catch (e) {
      setMessages(prev => [...prev, {
        id: 'err-' + Date.now(),
        role: 'assistant', error: true,
        content: 'Error de red: ' + e.message,
      }])
      setStreamingText('')
    }
    setSending(false)
  }


  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {}
  }

  async function regenerateLastResponse() {
    // Buscar el último mensaje del usuario
    const lastUser = [...messages].reverse().find(m => m.role === 'user')
    if (!lastUser || !activeChat || sending) return
    // Eliminar el último mensaje de Vera localmente
    setMessages(prev => {
      const idx = prev.map(m => m.role).lastIndexOf('assistant')
      return idx >= 0 ? prev.slice(0, idx) : prev
    })
    await sendMessage(lastUser.content)
  }

  const groupedChats = (() => {
    const groups = { hoy: [], ayer: [], semana: [], anterior: [] }
    const now = new Date()
    const today = now.toDateString()
    const y = new Date(now); y.setDate(y.getDate() - 1)
    const yesterday = y.toDateString()
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7)

    const filtered = searchQuery.trim()
      ? conversations.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
      : conversations

    filtered.forEach(c => {
      const d = new Date(c.last_message_at || c.created_at)
      if (d.toDateString() === today) groups.hoy.push(c)
      else if (d.toDateString() === yesterday) groups.ayer.push(c)
      else if (d >= weekAgo) groups.semana.push(c)
      else groups.anterior.push(c)
    })
    return groups
  })()

  return (
    <div style={{
      height: '100dvh', background: T.bg, display: 'flex', overflow: 'hidden',
      fontFamily: FONT, WebkitFontSmoothing: 'antialiased',
    }}>
      <style>{`
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-thumb{background:${theme === 'dark' ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.12)'};border-radius:999px}
        input:focus,textarea:focus{outline:none}
        .chat-item .actions{opacity:0;transition:opacity .15s}
        .chat-item:hover .actions{opacity:1}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes veraThink{0%,100%{box-shadow:0 0 0 0 rgba(61,43,255,.4)}50%{box-shadow:0 0 0 6px rgba(61,43,255,0)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        .msg-actions{opacity:0;transition:opacity .15s}
        .msg-wrapper:hover .msg-actions{opacity:1}
        @media (max-width:900px){
          .vera-row{grid-template-columns:1fr!important}
          .vera-side{display:none!important}
        }
      `}</style>

      <Sidebar active="/vera" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{
          height: 56, background: theme === 'dark' ? 'rgba(11,11,12,.85)' : 'rgba(251,251,253,.85)',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          borderBottom: `.5px solid ${T.hairline}`,
          display: 'flex', alignItems: 'center', padding: '0 24px',
          flexShrink: 0, gap: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <VeraLogo size={28} />
            <div>
              <div style={{
                fontSize: 14, fontWeight: 600,
                color: isPlus ? VERA_PLUS_BLUE : T.text,
                letterSpacing: -0.2, lineHeight: 1.1,
              }}>
                {isPlus ? 'Vera Plus' : 'Vera'}
              </div>
              <div style={{
                fontSize: 11, color: T.text4, marginTop: 2,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <FlagES size={11} />
                <span>España · IA central</span>
              </div>
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <ProfileBtn user={user} router={router} />
          </div>
        </header>

        <div className="vera-row" style={{
          flex: 1, display: 'grid',
          gridTemplateColumns: '240px 1fr 260px',
          overflow: 'hidden',
          minHeight: 0,
        }}>

          {/* PANEL IZQUIERDO */}
          <div style={{
            borderRight: `.5px solid ${T.hairline}`,
            background: T.sidebar,
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ padding: 12, borderBottom: `.5px solid ${T.hairline}` }}>
              <button onClick={newChat}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,.06)'}
                onMouseLeave={e => e.currentTarget.style.background = T.card}
                style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                background: T.card, color: T.text, border: `.5px solid ${T.hairline}`,
                fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'background .12s',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Nuevo chat
              </button>

              <div style={{ position: 'relative', marginTop: 8 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#999', pointerEvents: 'none' }}>
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar chats..." aria-label="Buscar chats"
                  style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: 8, border: `.5px solid ${T.hairline}`, background: T.card, fontSize: 12, fontFamily: 'inherit', color: T.text, outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px', minHeight: 0 }}>
              {conversations.length === 0 && (
                <div style={{
                  padding: '32px 16px', textAlign: 'center',
                  color: T.text4, fontSize: 12,
                }}>
                  Sin chats todavía
                </div>
              )}

              {[
                { key: 'hoy', label: 'Hoy', items: groupedChats.hoy },
                { key: 'ayer', label: 'Ayer', items: groupedChats.ayer },
                { key: 'semana', label: 'Semana pasada', items: groupedChats.semana },
                { key: 'anterior', label: 'Anterior', items: groupedChats.anterior },
              ].filter(g => g.items.length > 0).map(group => (
                <div key={group.key} style={{ marginBottom: 8 }}>
                  <div style={{
                    fontSize: 10, color: T.text4, fontWeight: 500,
                    padding: '6px 8px', textTransform: 'uppercase', letterSpacing: 0.5,
                  }}>{group.label}</div>
                  {group.items.map((c, idx) => (
                    <div key={`${group.key}-${c.id}`}
                      className="chat-item"
                      onClick={() => editingId !== c.id && setActiveChat(c)}
                      onMouseEnter={e => {
                        if (activeChat?.id !== c.id) e.currentTarget.style.background = 'rgba(0,0,0,.04)'
                      }}
                      onMouseLeave={e => {
                        if (activeChat?.id !== c.id) e.currentTarget.style.background = 'transparent'
                      }}
                      style={{
                        padding: '7px 10px', borderRadius: 6, cursor: 'pointer',
                        marginBottom: 1, position: 'relative',
                        background: activeChat?.id === c.id ? 'rgba(0,0,0,.06)' : 'transparent',
                        transition: 'background .12s',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>

                      {editingId === c.id ? (
                        <input autoFocus
                          value={titleDraft}
                          onChange={e => setTitleDraft(e.target.value)}
                          onBlur={() => saveRename(c.id)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveRename(c.id)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          onClick={e => e.stopPropagation()}
                          aria-label="Renombrar chat"
                          style={{
                            flex: 1, border: `.5px solid ${VERA_BLUE}`,
                            borderRadius: 4, padding: '2px 6px',
                            fontSize: 12.5, fontFamily: 'inherit',
                            background: T.card, color: T.text,
                          }}
                        />
                      ) : (
                        <>
                          <div style={{
                            flex: 1, minWidth: 0,
                            fontSize: 12.5, color: T.text,
                            fontWeight: activeChat?.id === c.id ? 500 : 400,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>{c.title}</div>

                          <div className="actions" style={{
                            display: 'flex', gap: 2, flexShrink: 0,
                          }}>
                            <button onClick={(e) => startRenameChat(c, e)} title="Editar nombre" aria-label={`Editar nombre del chat "${c.title}"`} style={{
                              width: 22, height: 22, borderRadius: 5,
                              background: 'transparent', border: 'none',
                              color: T.text4, cursor: 'pointer',
                              display: 'grid', placeItems: 'center',
                            }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,.06)'; e.currentTarget.style.color = T.text2 }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.text4 }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button onClick={(e) => deleteChat(c.id, e)} title="Eliminar" aria-label={`Eliminar chat "${c.title}"`} style={{
                              width: 22, height: 22, borderRadius: 5,
                              background: 'transparent', border: 'none',
                              color: T.text4, cursor: 'pointer',
                              display: 'grid', placeItems: 'center',
                            }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,59,48,.1)'; e.currentTarget.style.color = T.red }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.text4 }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div style={{
              padding: '10px 12px',
              borderTop: `.5px solid ${T.hairline}`,
              textAlign: 'center',
              flexShrink: 0,
            }}>
              <div style={{
                fontSize: 10.5, color: T.text4, fontWeight: 500,
                letterSpacing: 0.3,
              }}>
                {isPlus ? 'Vera Plus' : 'Vera'} <span style={{ opacity: 0.5, margin: '0 4px' }}>·</span> by Vela
              </div>
              <div style={{
                fontSize: 9.5, color: T.text4, opacity: 0.7,
                marginTop: 2, letterSpacing: 0.2,
              }}>
                IA empresarial · v1.0
              </div>
            </div>
          </div>

          {/* PANEL CENTRO */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            minWidth: 0, overflow: 'hidden', height: '100%',
          }}>
            {activeChat ? (
              <>
                {/* Header del chat: SOLO título editable, sin botón eliminar grande */}
                <div style={{
                  padding: '14px 20px',
                  borderBottom: `.5px solid ${T.hairline}`,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  {editingTitleChat ? (
                    <input
                      autoFocus value={titleDraft}
                      onChange={e => setTitleDraft(e.target.value)}
                      onBlur={() => { if (titleDraft.trim()) saveRename(activeChat.id); setEditingTitleChat(false) }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { saveRename(activeChat.id); setEditingTitleChat(false) }
                        if (e.key === 'Escape') setEditingTitleChat(false)
                      }}
                      aria-label="Renombrar chat actual"
                      style={{
                        flex: 1, padding: '4px 8px', borderRadius: 6,
                        border: `.5px solid ${VERA_BLUE}`, fontSize: 13, fontWeight: 500,
                        background: T.card, fontFamily: 'inherit', color: T.text,
                      }}
                    />
                  ) : (
                    <span onClick={() => { setTitleDraft(activeChat.title); setEditingTitleChat(true) }}
                      style={{
                        fontSize: 13.5, fontWeight: 500, color: T.text, cursor: 'text',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{activeChat.title}</span>
                  )}
                </div>

                <div style={{
                  flex: 1, overflowY: 'auto', padding: '24px 32px',
                  minHeight: 0,
                  scrollBehavior: 'smooth',
                }}>
                  {messages.length === 0 && !sending && !streamingText && (
                    <div style={{ maxWidth: 680, margin: '40px auto 0' }}>
                      <div style={{ textAlign: 'center', marginBottom: 32 }}>
                        <div style={{ display: 'inline-block', marginBottom: 16 }}>
                          <VeraLogo size={48} />
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 6 }}>
                          Hola, soy <span style={{ color: isPlus ? VERA_PLUS_BLUE : VERA_BLUE }}>
                            {isPlus ? 'Vera Plus' : 'Vera'}
                          </span>
                        </div>
                        <div style={{ fontSize: 13.5, color: T.text3, lineHeight: 1.5 }}>
                          Tu IA central de Vela. Tengo acceso a toda tu información en tiempo real.<br />
                          Pregúntame lo que quieras sobre tu negocio.
                        </div>
                      </div>

                      <div style={{
                        fontSize: 10, color: T.text4, fontWeight: 500,
                        textTransform: 'uppercase', letterSpacing: 0.5,
                        marginBottom: 10, padding: '0 4px',
                      }}>Prueba a preguntar</div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 10,
                      }}>
                        {SUGGESTIONS.map((s, i) => (
                          <div key={i}
                            onClick={() => sendMessage(s.text)}
                            style={{
                              padding: '12px 14px',
                              background: T.card,
                              border: `.5px solid ${T.hairline}`,
                              borderRadius: 10,
                              cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 10,
                              transition: 'all .15s',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.borderColor = VERA_BLUE
                              e.currentTarget.style.transform = 'translateY(-1px)'
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(61,43,255,.08)'
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.borderColor = T.hairline
                              e.currentTarget.style.transform = 'translateY(0)'
                              e.currentTarget.style.boxShadow = 'none'
                            }}
                          >
                            <span style={{ flexShrink: 0, display: 'grid', placeItems: 'center', color: VERA_BLUE }}>{s.icon}</span>
                            <span style={{ fontSize: 12.5, color: T.text2, lineHeight: 1.4 }}>{s.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((m, i) => (
                    <div key={`msg-${i}`} className="msg-wrapper" style={{
                      display: 'flex',
                      flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
                      gap: 12, marginBottom: 24,
                      maxWidth: 760, margin: '0 auto 24px',
                      animation: 'fadeIn .25s ease',
                      justifyContent: m.role === 'user' ? 'flex-start' : 'flex-start',
                    }}>
                      <div style={{
                        width: 28, height: 28,
                        borderRadius: m.role === 'user' ? 999 : 7,
                        background: m.role === 'user' ? T.sidebar : VERA_BLUE,
                        color: m.role === 'user' ? T.text2 : '#fff',
                        display: 'grid', placeItems: 'center',
                        fontSize: 11, fontWeight: 600, flexShrink: 0,
                      }}>
                        {m.role === 'user' ? (
                          (user?.name?.charAt(0) || 'U').toUpperCase()
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" fill="#fff" />
                          </svg>
                        )}
                      </div>
                      <div style={{
                        flex: m.role === 'user' ? '0 1 auto' : 1,
                        minWidth: 0,
                        maxWidth: m.role === 'user' ? '75%' : '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
                      }}>
                        {m.role === 'assistant' && (
                          <div style={{
                            fontSize: 12, fontWeight: 600,
                            color: m.is_plus ? VERA_PLUS_BLUE : T.text,
                            marginBottom: 6,
                          }}>
                            {m.is_plus ? 'Vera Plus' : 'Vera'}
                          </div>
                        )}
                        {m.role === 'user' ? (
                          <div style={{
                            fontSize: 14, lineHeight: 1.5, color: T.text,
                            whiteSpace: 'pre-wrap',
                            background: T.sidebar,
                            padding: '10px 14px',
                            borderRadius: 16,
                            display: 'inline-block',
                            maxWidth: '100%',
                          }}>{m.content}
                          {m.role === 'assistant' && m.model && (
                            <div style={{
                              fontSize: 10, color: T.text4,
                              marginTop: 8, opacity: 0.6,
                              display: 'inline-block',
                            }}>
                              {m.model_label || m.model}{m.latency_ms ? ` · ${(m.latency_ms/1000).toFixed(1)}s` : ''}
                            </div>
                          )}</div>
                        ) : (
                          <>
                            <div style={{
                              fontSize: 14, lineHeight: 1.7,
                              color: m.error ? T.red : T.text,
                            }}
                              dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                            />
                            {!m.error && (
                              <div className="msg-actions" style={{
                                display: 'flex', gap: 4, marginTop: 10,
                              }}>
                                <button onClick={() => copyToClipboard(m.content)}
                                  title="Copiar respuesta"
                                  style={{
                                    background: 'transparent', border: `.5px solid ${T.hairline}`,
                                    borderRadius: 6, padding: '4px 8px',
                                    fontSize: 11, color: T.text3, cursor: 'pointer',
                                    fontFamily: 'inherit',
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    transition: 'all .12s',
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,.04)'; e.currentTarget.style.color = T.text }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.text3 }}
                                >
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" />
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                  </svg>
                                  Copiar
                                </button>
                                {i === messages.length - 1 && (
                                  <button onClick={regenerateLastResponse}
                                    disabled={sending}
                                    title="Regenerar respuesta"
                                    style={{
                                      background: 'transparent', border: `.5px solid ${T.hairline}`,
                                      borderRadius: 6, padding: '4px 8px',
                                      fontSize: 11, color: T.text3,
                                      cursor: sending ? 'not-allowed' : 'pointer',
                                      fontFamily: 'inherit',
                                      display: 'flex', alignItems: 'center', gap: 4,
                                      transition: 'all .12s',
                                    }}
                                    onMouseEnter={e => { if (!sending) { e.currentTarget.style.background = 'rgba(0,0,0,.04)'; e.currentTarget.style.color = T.text } }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.text3 }}
                                  >
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="23 4 23 10 17 10" />
                                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                    </svg>
                                    Regenerar
                                  </button>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Mensaje en streaming */}
                  {streamingText && (
                    <div style={{
                      display: 'flex', gap: 12, marginBottom: 22,
                      maxWidth: 760, margin: '0 auto 22px',
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: VERA_BLUE,
                        display: 'grid', placeItems: 'center', flexShrink: 0,
                        animation: 'veraThink 1.6s infinite',
                      }}>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" fill="#fff" />
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 12, fontWeight: 600,
                          color: isPlus ? VERA_PLUS_BLUE : T.text,
                          marginBottom: 6,
                        }}>{isPlus ? 'Vera Plus' : 'Vera'}</div>
                        <div style={{ fontSize: 14, lineHeight: 1.65, color: T.text }}
                          dangerouslySetInnerHTML={{
                            __html: renderMarkdown(streamingText) +
                              '<span style="display:inline-block;width:7px;height:14px;background:#3D2BFF;margin-left:2px;vertical-align:-2px;animation:blink 1s infinite;"></span>'
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Loading antes del primer chunk */}
                  {sending && !streamingText && (
                    <div style={{
                      display: 'flex', gap: 12, marginBottom: 22,
                      maxWidth: 760, margin: '0 auto 22px',
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: VERA_BLUE,
                        display: 'grid', placeItems: 'center',
                        animation: 'veraThink 1.6s infinite',
                      }}>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" fill="#fff" />
                        </svg>
                      </div>
                      <div style={{
                        fontSize: 13, color: T.text4, padding: 4,
                        animation: 'blink 1.4s infinite',
                      }}>Vera está pensando…</div>
                    </div>
                  )}

                  <div ref={messagesEnd} />
                </div>

                <div style={{ padding: '16px 24px 20px', borderTop: `.5px solid ${T.hairline}`, background: T.bg }}>
                  <div style={{
                    display: 'flex', gap: 8, alignItems: 'center',
                    background: T.card, borderRadius: 999,
                    padding: '6px 6px 6px 18px',
                    border: `.5px solid ${T.hairline}`,
                    maxWidth: 720, margin: '0 auto',
                    boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 2px 12px rgba(0,0,0,.03)',
                    transition: 'all .15s',
                  }}>
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                      placeholder={isPlus ? 'Pregunta a Vera Plus…' : 'Pregunta a Vera…'}
                      aria-label={isPlus ? 'Pregunta a Vera Plus' : 'Pregunta a Vera'}
                      rows={1}
                      style={{
                        flex: 1, border: 'none', background: 'transparent',
                        fontSize: 14, color: T.text, fontFamily: 'inherit',
                        resize: 'none', padding: '6px 0', maxHeight: 120,
                      }}
                    />
                    <button onClick={() => sendMessage()} disabled={!input.trim() || sending} aria-label="Enviar mensaje" style={{
                      width: 34, height: 34, borderRadius: 999,
                      background: input.trim() ? (isPlus ? VERA_PLUS_BLUE : VERA_BLUE) : T.hairline,
                      color: input.trim() ? '#fff' : T.text4,
                      border: 'none',
                      cursor: input.trim() ? 'pointer' : 'not-allowed',
                      display: 'grid', placeItems: 'center',
                      transition: 'all .12s',
                      flexShrink: 0,
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="19" x2="12" y2="5" />
                        <polyline points="5 12 12 5 19 12" />
                      </svg>
                    </button>
                  </div>
                  {/* EU AI Act (riesgo limitado): transparencia hacia el usuario. */}
                  <div style={{ marginTop: 8, fontSize: 10.5, color: T.text4, textAlign: 'center', lineHeight: 1.4 }}>
                    {isPlus ? 'Vera Plus' : 'Vera'} es una asistente de inteligencia artificial. Puede cometer errores; verifica los datos importantes.
                  </div>
                </div>
              </>
            ) : (
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexDirection: 'column', gap: 14,
              }}>
                <VeraLogo size={56} />
                <div style={{
                  fontSize: 18, fontWeight: 600,
                  color: isPlus ? VERA_PLUS_BLUE : T.text,
                }}>{isPlus ? 'Vera Plus' : 'Vera'}</div>
                <div style={{ fontSize: 13, color: T.text4 }}>
                  Selecciona un chat o crea uno nuevo
                </div>
                <button onClick={newChat} style={{
                  marginTop: 8, padding: '8px 20px', borderRadius: 999,
                  background: VERA_BLUE, color: '#fff', border: 'none',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}>+ Nuevo chat</button>
              </div>
            )}
          </div>

          {/* PANEL DERECHO */}
          <div className="vera-side" style={{
            borderLeft: `.5px solid ${T.hairline}`,
            background: T.sidebar,
            padding: 14,
            display: 'flex', flexDirection: 'column', gap: 14,
            overflow: 'hidden', height: '100%',
          }}>
            <div>
              <div style={{
                fontSize: 10, color: T.text4, fontWeight: 500,
                textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
              }}>Estado</div>
              <div style={{
                padding: 14, borderRadius: 10,
                background: T.card, border: `.5px solid ${T.hairline}`,
              }}>
                <div style={{
                  fontSize: 12, fontWeight: 600, marginBottom: 6,
                  color: isPlus ? VERA_PLUS_BLUE : T.text,
                }}>
                  {isPlus ? 'Utilizando Vera Plus' : 'Utilizando Vera'}
                </div>
                <div style={{ fontSize: 11, color: T.text3, lineHeight: 1.5 }}>
                  {isPlus
                    ? 'Análisis profundo · más memoria · respuestas verificadas'
                    : 'Acceso a tu negocio · datos en tiempo real'}
                </div>
              </div>
            </div>

            <div>
              <div style={{
                fontSize: 10, color: T.text4, fontWeight: 500,
                textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
              }}>Datos conectados</div>
              <div style={{
                background: T.card, borderRadius: 10,
                border: `.5px solid ${T.hairline}`,
                padding: '10px 12px',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                {(status?.data_sources || []).map((s, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ fontSize: 12, color: T.text2 }}>{s.name}</span>
                    <span style={{
                      width: 6, height: 6, borderRadius: 999,
                      background: s.active ? '#059669' : T.text4,
                    }} />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ flex: 1 }}></div>

            <div>
              <div style={{
                fontSize: 10, color: T.text4, fontWeight: 500,
                textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
              }}>{isPlus ? 'Modelo activo' : 'Límite diario'}</div>

              {/* PLUS: sin barra, solo info de modelo */}
              {isPlus ? (
                <div style={{
                  background: T.card, borderRadius: 10,
                  border: `.5px solid ${T.hairline}`,
                  padding: '12px 14px',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: VERA_PLUS_BLUE, marginBottom: 3 }}>
                    {status?.model_active_now?.display_name || '—'}
                  </div>
                  <div style={{ fontSize: 11, color: T.text3 }}>
                    Sin límite · acceso ilimitado
                  </div>
                </div>
              ) : (
                /* BASE: barra + estado + CTA según nivel */
                <div style={{
                  background: T.card, borderRadius: 10,
                  border: `.5px solid ${status?.blocked ? T.redSoft : T.hairline}`,
                  padding: '10px 12px',
                }}>
                  <div style={{
                    height: 4, background: T.hairline, borderRadius: 2,
                    overflow: 'hidden', marginBottom: 8,
                  }}>
                    <div style={{
                      width: `${status?.usage_pct || 0}%`, height: '100%',
                      background: status?.blocked ? T.red : (status?.usage_pct > 70 ? '#f59e0b' : VERA_BLUE),
                      transition: 'width .3s',
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: T.text3, marginBottom: status?.blocked || status?.usage_pct > 70 ? 8 : 0 }}>
                    {status?.blocked
                      ? <><span style={{ fontWeight: 600, color: T.red }}>Modo básico</span> · usando {status?.model_active_now?.display_name || 'modelo básico'}</>
                      : status?.usage_pct > 70
                        ? <>Te acercas al límite ({status?.usage_pct}%)</>
                        : <>{status?.model_active_now?.display_name || ''} activo</>
                    }
                  </div>

                  {/* CTA Vera Plus cuando degradado o cerca */}
                  {(status?.blocked || status?.usage_pct > 70) && (
                    
                      <a
                        href="/vera-plus"
                      style={{
                        display: 'block',
                        background: VERA_PLUS_BLUE, color: 'white',
                        padding: '7px 10px', borderRadius: 7,
                        fontSize: 11, fontWeight: 600,
                        textAlign: 'center', textDecoration: 'none',
                        marginTop: 4,
                      }}
                    >
                      ★ Quita el límite con Vera Plus
                    </a>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
