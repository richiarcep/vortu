"""
Fix completo de Vera:
1. Buscador de chats
2. Validación de chat_id antes de enviar (evita "Conversación no encontrada")
3. Auto-crear chat si el actual no existe en BD
"""
import os

p = os.path.expanduser('~/Desktop/vela/frontend/app/vera/page.jsx')
s = open(p).read()

# Añadir searchQuery state
if 'searchQuery' not in s:
    s = s.replace(
        "const [hoveredChat, setHoveredChat] = useState(null)",
        "const [hoveredChat, setHoveredChat] = useState(null)\n  const [searchQuery, setSearchQuery] = useState('')"
    )
    print("OK searchQuery state añadido")

# Filtrar por searchQuery
if 'searchQuery.trim()' not in s:
    s = s.replace(
        "    conversations.forEach(c => {",
        """    const filtered = searchQuery.trim()
      ? conversations.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
      : conversations

    filtered.forEach(c => {""",
        1
    )
    print("OK filtrado añadido")

# Añadir buscador en UI
if 'Buscar chats' not in s:
    old = """                Nuevo chat
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>"""

    new = """                Nuevo chat
              </button>

              <div style={{ position: 'relative', marginTop: 8 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#999', pointerEvents: 'none' }}>
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar chats..."
                  style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: 8, border: '.5px solid #E5E5EA', background: '#fff', fontSize: 12, fontFamily: 'inherit', color: '#1d1d1f', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px', minHeight: 0 }}>"""
    s = s.replace(old, new)
    print("OK buscador UI anadido")

# Fix race condition + validación
old_send = """    let chat = activeChat
    if (!chat) {
      try {
        const r = await fetch(`${API}/api/vera/v2/conversations`, {
          method: 'POST', headers: h(),
          body: JSON.stringify({ title: 'Nuevo chat' }),
        })
        const d = await r.json()
        chat = { id: d.id, title: d.title, message_count: 0, created_at: new Date().toISOString() }
        setActiveChat(chat)
        setConversations(prev => [chat, ...prev])
      } catch (e) {
        setSending(false)
        return
      }
    }"""

new_send = """    let chat = activeChat

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
    }"""

if old_send in s:
    s = s.replace(old_send, new_send)
    print("OK sendMessage con validacion añadida")
else:
    print("WARN: patron sendMessage no encontrado, intentando alternativo...")
    # Intento más simple: solo añadir validación
    if "let chat = activeChat" in s:
        s = s.replace(
            "let chat = activeChat",
            """let chat = activeChat
    // Validar que existe en BD
    if (chat) {
      try {
        const ck = await fetch(`${API}/api/vera/v2/conversations/${chat.id}/messages`, { headers: h() })
        if (!ck.ok) { chat = null; setActiveChat(null) }
      } catch { chat = null; setActiveChat(null) }
    }""",
            1
        )
        print("OK validacion añadida (modo alternativo)")

open(p, 'w').write(s)
print("\nLISTO. Refresca el navegador con Cmd+Shift+R")
