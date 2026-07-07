'use client'
// Página SHELL: Términos de Servicio. Estructura + placeholders.
// El texto legal definitivo lo redactará un abogado. NO vinculante.
import LegalShell, { Section } from '../LegalShell'

const VERSION = '2026-07-borrador'

const SECTIONS = [
  'Objeto y aceptación',
  'Cuenta y acceso',
  'Uso aceptable',
  'Planes y pagos',
  'Propiedad intelectual',
  'Limitación de responsabilidad',
  'Suspensión y terminación',
  'Ley aplicable y jurisdicción',
  'Contacto',
]

export default function TerminosPage() {
  return (
    <LegalShell title="Términos de Servicio" version={VERSION} backHref="/register">
      {SECTIONS.map((title) => (
        <Section key={title} title={title} />
      ))}
    </LegalShell>
  )
}
