// Single source of truth for brand identity (name, tagline, accent colors).
//
// Importa desde aquí en lugar de escribir "Vela" o los hex de marca a mano,
// para que un futuro reajuste de marca sea un cambio en un solo lugar.
// Consumible tanto desde .tsx como desde .jsx.

/** Nombre de marca visible en la UI. */
export const BRAND_NAME = 'Vela'

/** Tagline / promesa de marca. */
export const BRAND_TAGLINE = 'Chart a clearer course.'

/** Descripción corta (metadata, og, etc.). */
export const BRAND_DESCRIPTION =
  'Gestión empresarial inteligente para pymes y autónomos'

// ── Paleta Vela ──────────────────────────────────────────────────────────────
// Tonos base de la guía de marca. Los componentes deberían preferir los tokens
// reactivos de `components/ui/tokens` (useT); estas constantes son para acentos
// puntuales, gradientes y logos donde no aplica el token de tema.
export const VELA_NAVY = '#0B0D2B' // Midnight Navy
export const VELA_INDIGO = '#3730A3' // Deep Indigo
export const VELA_VIOLET = '#4F46E5' // Blue Violet (acento principal)
export const VELA_PERIWINKLE = '#A5B1FF' // Soft Periwinkle
export const VELA_MIST = '#EEF0F7' // Light Mist

/** Acento principal de marca (claro). */
export const BRAND_ACCENT = VELA_VIOLET
/** Acento de marca para fondos oscuros (mejor contraste que el violeta puro). */
export const BRAND_ACCENT_DARK = '#6366F1'

/** Gradiente de marca (logo, heros, botones primarios). */
export const BRAND_GRADIENT = `linear-gradient(135deg, ${VELA_VIOLET} 0%, ${VELA_PERIWINKLE} 100%)`
