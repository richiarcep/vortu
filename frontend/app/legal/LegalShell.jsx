'use client'
// Layout compartido para las páginas legales SHELL (públicas, sin auth).
// El contenido real lo redactará un abogado; aquí solo va la estructura y
// los placeholders. NO contiene cláusulas legales vinculantes.
import Link from 'next/link'
import { useT, useTheme, FONT } from '@/components/ui/tokens'

// Banner de aviso: estas páginas son un BORRADOR no vinculante.
export function DraftBanner() {
  const T = useT()
  return (
    <div
      role="alert"
      style={{
        background: T.amberSoft,
        border: `1px solid ${T.amber}`,
        color: T.amber,
        borderRadius: 12,
        padding: '12px 16px',
        fontSize: 13.5,
        fontWeight: 600,
        lineHeight: 1.5,
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        marginBottom: 28,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1.3 }}>⚠️</span>
      <span>
        BORRADOR — pendiente de revisión legal. No vinculante hasta su publicación final.
      </span>
    </div>
  )
}

// Encabezado de sección reutilizable.
export function Section({ title, children }) {
  const T = useT()
  return (
    <section style={{ marginBottom: 28 }}>
      <h2
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: T.text,
          letterSpacing: '-0.2px',
          margin: '0 0 8px',
        }}
      >
        {title}
      </h2>
      <div style={{ fontSize: 14.5, color: T.text2, lineHeight: 1.7 }}>
        {children ?? <Placeholder />}
      </div>
    </section>
  )
}

// Párrafo placeholder por defecto.
export function Placeholder({ text = '[Contenido pendiente de redacción legal]' }) {
  const T = useT()
  return (
    <p style={{ margin: 0, color: T.text3, fontStyle: 'italic' }}>{text}</p>
  )
}

// Contenedor de página: banner, título, fecha/versión, cuerpo y enlace Volver.
export default function LegalShell({ title, version, backHref = '/register', children }) {
  const T = useT()
  const { theme, toggle } = useTheme()

  return (
    <div
      style={{
        minHeight: '100vh',
        background: T.bg,
        color: T.text,
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          maxWidth: 760,
          margin: '0 auto',
          padding: '32px 20px 80px',
        }}
      >
        {/* Barra superior: Volver + toggle de tema */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 28,
          }}
        >
          <Link
            href={backHref}
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              color: T.blue,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span aria-hidden="true">←</span> Volver
          </Link>
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            style={{
              border: `.5px solid ${T.hairline}`,
              background: T.card,
              color: T.text2,
              borderRadius: 999,
              padding: '6px 12px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {theme === 'dark' ? '☀️ Claro' : '🌙 Oscuro'}
          </button>
        </div>

        <DraftBanner />

        <header style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: '-0.6px',
              margin: '0 0 8px',
              color: T.text,
            }}
          >
            {title}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: T.text3 }}>
            Versión {version}
          </p>
        </header>

        <main>{children}</main>

        {/* Pie: navegación entre documentos legales */}
        <footer
          style={{
            marginTop: 40,
            paddingTop: 20,
            borderTop: `.5px solid ${T.hairline}`,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            fontSize: 13,
          }}
        >
          <Link href="/legal/terminos" style={{ color: T.text3, textDecoration: 'none' }}>
            Términos de Servicio
          </Link>
          <Link href="/legal/privacidad" style={{ color: T.text3, textDecoration: 'none' }}>
            Política de Privacidad
          </Link>
          <Link href="/legal/subencargados" style={{ color: T.text3, textDecoration: 'none' }}>
            Subencargados del tratamiento
          </Link>
        </footer>
      </div>
    </div>
  )
}
