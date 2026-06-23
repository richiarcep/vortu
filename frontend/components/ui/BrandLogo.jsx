'use client'
import { BRAND_NAME, VELA_VIOLET } from '@/lib/brand'
import { useTheme } from '@/components/ui/tokens'

// ── Marca Vela (assets oficiales del diseñador) ──────────────────────────────
// Los SVG viven en `public/brand/` y se sirven como ficheros (no inline) para
// evitar colisiones de los ids de gradiente que traen (`gP`, `gDark`, `gI`…).
// Este sigue siendo el ÚNICO punto donde se decide qué logo se pinta: cambiar
// aquí actualiza Sidebar, login, register y cualquier consumidor futuro.
//
// Variantes por superficie:
//  - claro  → `vela-logo-primary.svg`     (wordmark navy, constelación oscura)
//  - oscuro → `vela-logo-lockup-dark.svg` (fondo transparente, constelación clara)
//  - icono  → `vela-logo-icon.svg`        (solo el velero)

// Aspect ratios tomados del viewBox de cada asset.
const RATIO_ICON = 202 / 176              // ≈ 1.148
const RATIO_LOCKUP = 502.9163636363637 / 176  // ≈ 2.857

// `tone`: 'auto' sigue el tema activo; 'light'/'dark' lo fuerzan (paneles que son
// siempre oscuros, p.ej. login/register, deben pasar tone="dark").
function resolveTone(tone, theme) {
  if (tone === 'light' || tone === 'dark') return tone
  return theme === 'dark' ? 'dark' : 'light'
}

function assetFor(tone, showName) {
  if (!showName) return '/brand/vela-logo-icon.svg'
  return tone === 'dark'
    ? '/brand/vela-logo-lockup-dark.svg'
    : '/brand/vela-logo-primary.svg'
}

// Solo el icono de marca. `size` = alto en px. Acepta `tone` para fondos oscuros.
// (`constColor` se conserva por compatibilidad de firma; los SVG oficiales traen
//  su propio color, así que no se usa.)
export function BrandMark({ size = 28, tone = 'auto', constColor = VELA_VIOLET, title }) {
  const { theme } = useTheme() || {}
  const t = resolveTone(tone, theme)
  return (
    <img
      src={assetFor(t, false)}
      alt={title || `Logo ${BRAND_NAME}`}
      width={Math.round(size * RATIO_ICON)}
      height={size}
      style={{ height: size, width: 'auto', flexShrink: 0, display: 'block' }}
    />
  )
}

// Logo horizontal (lockup): marca + wordmark oficiales. `showName=false` → solo icono.
// Firma idéntica a la versión anterior para no tocar consumidores; `nameColor`,
// `nameSize`, `constColor` y `gap` quedan como no-op (el wordmark vive dentro del SVG).
export default function BrandLogo({
  size = 28,
  showName = true,
  tone = 'auto',
  nameColor = 'currentColor',
  nameSize = 15,
  constColor = VELA_VIOLET,
  gap = 10,
  className,
  style,
}) {
  const { theme } = useTheme() || {}
  const t = resolveTone(tone, theme)
  const ratio = showName ? RATIO_LOCKUP : RATIO_ICON
  return (
    <img
      className={className}
      src={assetFor(t, showName)}
      alt={`Logo ${BRAND_NAME}`}
      width={Math.round(size * ratio)}
      height={size}
      style={{ height: size, width: 'auto', flexShrink: 0, display: 'block', ...style }}
    />
  )
}
