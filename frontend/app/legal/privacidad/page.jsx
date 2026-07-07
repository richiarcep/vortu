'use client'
// Página SHELL: Política de Privacidad. Estructura + placeholders (RGPD).
// El texto legal definitivo lo redactará un abogado. NO vinculante.
import Link from 'next/link'
import { useT } from '@/components/ui/tokens'
import LegalShell, { Section, Placeholder } from '../LegalShell'

const VERSION = '2026-07-borrador'

// Sección de Subencargados con enlace a su página dedicada.
function SubencargadosSection() {
  const T = useT()
  return (
    <Section title="Subencargados del tratamiento">
      <Placeholder />
      <p style={{ margin: '10px 0 0' }}>
        Consulta la lista de subencargados en{' '}
        <Link href="/legal/subencargados" style={{ color: T.blue, textDecoration: 'none', fontStyle: 'normal' }}>
          /legal/subencargados
        </Link>
        .
      </p>
    </Section>
  )
}

export default function PrivacidadPage() {
  return (
    <LegalShell title="Política de Privacidad" version={VERSION} backHref="/register">
      <Section title="Responsable del tratamiento" />
      <Section title="Datos que recogemos" />
      <Section title="Finalidades y base legal (RGPD Art. 6)" />
      <SubencargadosSection />
      <Section title="Transferencias internacionales" />
      <Section title="Conservación" />
      <Section title="Tus derechos (RGPD Art. 15-22)" />
      <Section title="Cómo ejercerlos" />
      <Section title="Contacto / Delegado de Protección de Datos (DPO)" />
    </LegalShell>
  )
}
