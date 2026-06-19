'use client'
import { useId } from 'react'
import { BRAND_NAME, VELA_VIOLET, VELA_PERIWINKLE } from '@/lib/brand'

// ── Marca Vela: velero + constelación ────────────────────────────────────────
// Recreación en SVG a partir de la guía de marca. Es el ÚNICO lugar donde vive
// el dibujo del logo: reemplazable por el asset final del diseñador sin tocar a
// ningún consumidor (Sidebar, login, admin, etc.).
//
// - El velero (vela + casco) usa el gradiente de marca (violeta → periwinkle),
//   que se lee bien sobre fondo claro y oscuro.
// - La constelación usa `constColor` (por defecto violeta). Sobre fondos oscuros
//   conviene pasar un tono claro (periwinkle/blanco) para contraste.

// Sparkle de 4 puntas centrado en (cx,cy) con radio r.
function sparkle(cx, cy, r) {
  const i = r * 0.32
  return `M${cx} ${cy - r}C${cx} ${cy - i} ${cx + i} ${cy} ${cx + r} ${cy}`
    + `C${cx + i} ${cy} ${cx} ${cy + i} ${cx} ${cy + r}`
    + `C${cx} ${cy + i} ${cx - i} ${cy} ${cx - r} ${cy}`
    + `C${cx - i} ${cy} ${cx} ${cy - i} ${cx} ${cy - r}Z`
}

export function BrandMark({ size = 28, constColor = VELA_VIOLET, title }) {
  const uid = useId().replace(/:/g, '')
  const gid = `vela-grad-${uid}`
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
      role="img" aria-label={title || `Logo ${BRAND_NAME}`} style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={gid} x1="20" y1="8" x2="52" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={VELA_VIOLET} />
          <stop offset="100%" stopColor={VELA_PERIWINKLE} />
        </linearGradient>
      </defs>

      {/* Constelación (triángulo de estrellas + sparkles) */}
      <g stroke={constColor} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 21 L23 11 L25 25 Z" fill="none" opacity="0.9" />
      </g>
      <g fill={constColor}>
        <circle cx="11" cy="21" r="1.7" />
        <circle cx="25" cy="25" r="1.7" />
        <path d={sparkle(23, 11, 3.2)} />
        <path d={sparkle(7, 13, 1.6)} opacity="0.8" />
        <path d={sparkle(18, 30, 1.5)} opacity="0.7" />
      </g>

      {/* Velero: vela + casco (gradiente de marca) */}
      <g fill={`url(#${gid})`}>
        <path d="M35 10 C31.5 21 29.5 32 30 43 L52 43 C47.5 30 42 19 35 10 Z" />
        <path d="M22 46.5 Q39 54 56 45.5 Q47 53 34 53 Q27 53 22 46.5 Z" />
      </g>
      {/* Estela / agua */}
      <path d="M20 57 Q34 61 50 56" stroke={VELA_PERIWINKLE} strokeWidth="1.6"
        strokeLinecap="round" fill="none" opacity="0.7" />
    </svg>
  )
}

// Logo horizontal: marca + wordmark. `showName=false` → solo el icono.
export default function BrandLogo({
  size = 28,
  showName = true,
  nameColor = 'currentColor',
  nameSize = 15,
  constColor = VELA_VIOLET,
  gap = 10,
  className,
  style,
}) {
  return (
    <span className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap, lineHeight: 1, ...style }}>
      <BrandMark size={size} constColor={constColor} />
      {showName && (
        <span className="display" style={{
          fontSize: nameSize, fontWeight: 600, color: nameColor, letterSpacing: -0.3,
        }}>{BRAND_NAME}</span>
      )}
    </span>
  )
}
