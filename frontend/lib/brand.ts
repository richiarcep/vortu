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
// Tonos base de la guía de marca, alineados al degradado de los logos oficiales
// del diseñador (#1A145E → #2E1CCC → #3D2BFF). Los componentes deberían preferir
// los tokens reactivos de `components/ui/tokens` (useT); estas constantes son para
// acentos puntuales, gradientes y logos donde no aplica el token de tema.
export const VELA_NAVY = '#0B0D2B' // Midnight Navy (lienzo / fondos)
export const VELA_INDIGO = '#1A145E' // Deep Indigo (inicio del degradado de marca)
export const VELA_BLUE_MID = '#2E1CCC' // Azul medio del degradado
export const VELA_VIOLET = '#3D2BFF' // Electric Blue Violet (acento principal del logo)
export const VELA_PERIWINKLE = '#A5B1FF' // Soft Periwinkle (acento claro / fondos oscuros)
export const VELA_MIST = '#EEF0F7' // Light Mist

/** Acento principal de marca (claro). */
export const BRAND_ACCENT = VELA_VIOLET
/** Acento de marca para fondos oscuros (más claro, mejor contraste sobre navy). */
export const BRAND_ACCENT_DARK = '#6E5DFF'

/** Gradiente de marca (logo, heros, botones primarios). */
export const BRAND_GRADIENT = `linear-gradient(135deg, ${VELA_INDIGO} 0%, ${VELA_BLUE_MID} 50%, ${VELA_VIOLET} 100%)`
