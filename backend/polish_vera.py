"""
Pulir Vera:
1. Animación pulse del logo mientras piensa
2. Mejor formato de mensajes (más aire)
3. Botón Copiar al hover sobre mensaje de Vera
4. Botón Regenerar respuesta
5. Mover "Vera Plus by Vela" a columna izquierda
"""
import os

p = os.path.expanduser('~/Desktop/vela/frontend/app/vera/page.jsx')
s = open(p).read()

# 1. Añadir keyframe pulse + helper para copiar
if '@keyframes veraThink' not in s:
    s = s.replace(
        '@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}',
        '''@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes veraThink{0%,100%{box-shadow:0 0 0 0 rgba(0,113,227,.4)}50%{box-shadow:0 0 0 6px rgba(0,113,227,0)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        .msg-actions{opacity:0;transition:opacity .15s}
        .msg-wrapper:hover .msg-actions{opacity:1}'''
    )
    print("OK keyframes añadidos")

# 2. Añadir lastUserMessage state y función regenerate + copyToClipboard
if 'function regenerateLastResponse' not in s:
    helper = '''
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
'''
    s = s.replace(
        '  const groupedChats = (() => {',
        helper + '\n  const groupedChats = (() => {'
    )
    print("OK helpers copy/regenerate añadidos")

# 3. Animación pulse en el logo cuando sending
old_streaming_logo = '''                      <div style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: VERA_BLUE,
                        display: 'grid', placeItems: 'center', flexShrink: 0,
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
                        <div style={{ fontSize: 14, lineHeight: 1.65, color: T.text }}'''

new_streaming_logo = '''                      <div style={{
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
                        <div style={{ fontSize: 14, lineHeight: 1.65, color: T.text }}'''

s = s.replace(old_streaming_logo, new_streaming_logo)

# 4. Animación también en el loading "Vera está pensando..."
old_loading_logo = '''                  {sending && !streamingText && (
                    <div style={{
                      display: 'flex', gap: 12, marginBottom: 22,
                      maxWidth: 760, margin: '0 auto 22px',
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: VERA_BLUE,
                        display: 'grid', placeItems: 'center',
                      }}>'''

new_loading_logo = '''                  {sending && !streamingText && (
                    <div style={{
                      display: 'flex', gap: 12, marginBottom: 22,
                      maxWidth: 760, margin: '0 auto 22px',
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: VERA_BLUE,
                        display: 'grid', placeItems: 'center',
                        animation: 'veraThink 1.6s infinite',
                      }}>'''

s = s.replace(old_loading_logo, new_loading_logo)

# 5. Añadir botones copiar/regenerar en mensajes de Vera + animación fade-in
old_msg = """                  {messages.map((m, i) => (
                    <div key={`msg-${i}`} style={{
                      display: 'flex', gap: 12, marginBottom: 22,
                      maxWidth: 760, margin: '0 auto 22px',
                    }}>"""

new_msg = """                  {messages.map((m, i) => (
                    <div key={`msg-${i}`} className="msg-wrapper" style={{
                      display: 'flex', gap: 12, marginBottom: 24,
                      maxWidth: 760, margin: '0 auto 24px',
                      animation: 'fadeIn .25s ease',
                    }}>"""

s = s.replace(old_msg, new_msg)

# 6. Añadir botones después del contenido del mensaje (solo si es de Vera)
old_msg_end = """                        {m.role === 'user' ? (
                          <div style={{
                            fontSize: 14, lineHeight: 1.6, color: T.text,
                            whiteSpace: 'pre-wrap',
                          }}>{m.content}</div>
                        ) : (
                          <div style={{
                            fontSize: 14, lineHeight: 1.65,
                            color: m.error ? T.red : T.text,
                          }}
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                          />
                        )}
                      </div>
                    </div>
                  ))}"""

new_msg_end = """                        {m.role === 'user' ? (
                          <div style={{
                            fontSize: 14, lineHeight: 1.6, color: T.text,
                            whiteSpace: 'pre-wrap',
                          }}>{m.content}</div>
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
                  ))}"""

s = s.replace(old_msg_end, new_msg_end)
print("OK botones copiar/regenerar añadidos a mensajes")

# 7. Mover el footer "Vera Plus by Vela" de columna derecha a columna izquierda
old_footer = """            <div style={{
              paddingTop: 12,
              borderTop: `.5px solid ${T.hairline}`,
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: 10.5, color: T.text4, fontWeight: 500,
                letterSpacing: 0.3,
              }}>
                {isPlus ? 'Vera Plus' : 'Vera'} <span style={{ color: T.text4, opacity: 0.6, margin: '0 4px' }}>·</span> by Vela
              </div>
              <div style={{
                fontSize: 9.5, color: T.text4, opacity: 0.7,
                marginTop: 3, letterSpacing: 0.2,
              }}>
                IA empresarial · v1.0
              </div>
            </div>
          </div>"""

# Eliminar el footer de la columna derecha
s = s.replace(old_footer, """          </div>""")

# Añadir el footer al final de la columna izquierda (después del scroll de chats, antes del cierre del div izquierdo)
# Buscamos el cierre de la lista de chats y añadimos el footer antes de cerrar el contenedor izquierdo
old_left_end = """            <div style={{
              flex: 1, overflowY: 'auto', padding: '6px 8px', minHeight: 0,
            }}>"""

# Es más fiable buscar el cierre del componente principal de la lista izquierda
# Asumimos que después de la lista hay el cierre de </div>. Vamos a añadir el footer
# dentro del contenedor izquierdo, debajo del scroll de chats.
old_close_left = """              {[
                { key: 'hoy', label: 'Hoy', items: groupedChats.hoy },"""

# En realidad el patrón más fiable: el contenedor izquierdo cierra después de la lista de chats
# Buscamos el patrón donde termina el div del scroll de chats y empieza el panel central
target = """          </div>

          {/* PANEL CENTRO */}"""

footer_jsx = """
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

          {/* PANEL CENTRO */}"""

if target in s and footer_jsx not in s:
    s = s.replace(target, footer_jsx)
    print("OK footer movido a columna izquierda")

# 8. Limpiar el flex: 1 del panel derecho (ya no necesita empujar nada al fondo)
s = s.replace(
    '            <div style={{ flex: 1 }}></div>\n\n            <div>\n              <div style={{\n                fontSize: 10, color: T.text4, fontWeight: 500,\n                textTransform: \'uppercase\', letterSpacing: 0.5, marginBottom: 8,\n              }}>Límite diario</div>',
    '            <div>\n              <div style={{\n                fontSize: 10, color: T.text4, fontWeight: 500,\n                textTransform: \'uppercase\', letterSpacing: 0.5, marginBottom: 8,\n              }}>Límite diario</div>'
)

open(p, 'w').write(s)
print("\nLISTO. Refresca con Cmd+Shift+R")
