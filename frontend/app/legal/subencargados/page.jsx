'use client'
// Página SHELL: Subencargados del tratamiento. Tabla placeholder de ejemplo.
// La lista definitiva la confirma y mantiene el responsable. NO vinculante.
import { useT } from '@/components/ui/tokens'
import LegalShell, { Placeholder } from '../LegalShell'

const VERSION = '2026-07-borrador'

// Subencargados conocidos como PLACEHOLDER de ejemplo (a confirmar).
const SUBPROCESSORS = [
  {
    provider: 'Anthropic',
    purpose: 'Inteligencia artificial (asistente Vera)',
    location: 'EE. UU.',
    safeguard: 'Cláusulas Contractuales Tipo (SCC)',
  },
  {
    provider: 'Hetzner',
    purpose: 'Hosting e infraestructura',
    location: 'Alemania (UE)',
    safeguard: 'Ubicación en la UE',
  },
  {
    provider: 'Stripe',
    purpose: 'Procesamiento de pagos',
    location: 'EE. UU. / UE',
    safeguard: 'Cláusulas Contractuales Tipo (SCC)',
  },
  {
    provider: 'Resend',
    purpose: 'Envío de correo transaccional',
    location: 'EE. UU.',
    safeguard: 'Cláusulas Contractuales Tipo (SCC)',
  },
  {
    provider: 'Sentry',
    purpose: 'Monitorización de errores',
    location: 'EE. UU.',
    safeguard: 'Cláusulas Contractuales Tipo (SCC)',
  },
]

const COLUMNS = ['Proveedor', 'Finalidad', 'Ubicación', 'Salvaguarda']

export default function SubencargadosPage() {
  const T = useT()

  const cellBase = {
    padding: '10px 12px',
    fontSize: 13.5,
    textAlign: 'left',
    borderBottom: `.5px solid ${T.hairline}`,
    verticalAlign: 'top',
  }

  return (
    <LegalShell title="Subencargados del tratamiento" version={VERSION} backHref="/register">
      <div style={{ marginBottom: 16, fontSize: 14.5, color: T.text2, lineHeight: 1.7 }}>
        <Placeholder />
      </div>

      {/* Contenedor con scroll horizontal en móvil para la tabla */}
      <div style={{ overflowX: 'auto', border: `.5px solid ${T.hairline}`, borderRadius: 12 }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            minWidth: 560,
            background: T.card,
          }}
        >
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col}
                  scope="col"
                  style={{
                    ...cellBase,
                    fontWeight: 700,
                    color: T.text,
                    background: T.sidebar,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SUBPROCESSORS.map((s) => (
              <tr key={s.provider}>
                <td style={{ ...cellBase, fontWeight: 600, color: T.text }}>{s.provider}</td>
                <td style={{ ...cellBase, color: T.text2 }}>{s.purpose}</td>
                <td style={{ ...cellBase, color: T.text2 }}>{s.location}</td>
                <td style={{ ...cellBase, color: T.text2 }}>{s.safeguard}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 12, fontSize: 13, color: T.text3, fontStyle: 'italic' }}>
        [Lista a confirmar y mantener por el responsable]
      </p>
    </LegalShell>
  )
}
