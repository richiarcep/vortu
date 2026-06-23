'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'

// ── Paleta CLARA (marca Vela: acentos azul-violeta) ──────────────────────────
// Solo cambian los acentos (blue/cyan/purple) y derivados; los grises de texto y
// los colores semánticos (green/amber/red) se conservan para no romper el a11y.
export const T_LIGHT = {
  bg: '#F7F8FA',
  card: '#FFFFFF',
  sidebar: '#FBFCFD',
  hairline: 'rgba(15,23,42,0.08)',
  soft: 'rgba(15,23,42,0.05)',
  text: '#0F172A',
  text2: '#334155',
  text3: '#64748B',
  text4: '#586474', // a11y: ≥4.5:1 sobre card/bg/sidebar (texto pequeño cumple AA)
  blue: '#3D2BFF',  // Vela Electric Blue Violet (acento principal, logo oficial)
  cyan: '#6E5DFF',  // Vela violeta-claro (compañero de gradiente)
  green: '#047857', // a11y: ≥4.5:1 sobre greenSoft/card (texto de badge AA)
  greenSoft: 'rgba(5,150,105,.10)',
  amber: '#B45309', // a11y: ≥4.5:1 sobre amberSoft/card
  amberSoft: 'rgba(217,119,6,.12)',
  red: '#B91C1C',   // a11y: ≥4.5:1 sobre redSoft/card
  redSoft: 'rgba(220,38,38,.10)',
  purple: '#6366F1',
  purpleSoft: 'rgba(99,102,241,.1)',
}

// ── Paleta OSCURA (marca Vela: fondos Midnight Navy + acentos violeta) ────────
export const T_DARK = {
  bg: '#0B0D22',     // Vela Midnight Navy (lienzo)
  card: '#15172E',
  sidebar: '#0F1126',
  hairline: 'rgba(255,255,255,0.10)',
  soft: 'rgba(255,255,255,0.05)',
  text: '#E6EDF3',
  text2: '#C9D1D9',
  text3: '#8B949E',
  text4: '#7C8593', // a11y: subido de #6E7681 → ~4.5:1 sobre el fondo oscuro
  blue: '#6E5DFF',  // azul-violeta más claro para contraste sobre navy (alineado al logo)
  cyan: '#A5B1FF',  // Soft Periwinkle (acento claro)
  green: '#3FB950',
  greenSoft: 'rgba(63,185,80,.16)',
  amber: '#D29922',
  amberSoft: 'rgba(210,153,34,.16)',
  red: '#F85149',
  redSoft: 'rgba(248,81,73,.16)',
  purple: '#818CF8',
  purpleSoft: 'rgba(129,140,248,.20)',
}

// Compat: `T` estático = paleta clara. Las páginas no migradas lo siguen usando
// tal cual (quedan idénticas). Las páginas migradas usan `useT()` (reactivo).
export const T = T_LIGHT

// ── Theme context / hooks ────────────────────────────────────────────────────
const ThemeContext = createContext({ theme: 'light', setTheme: () => {}, toggle: () => {} })

function applyTheme(theme) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.style.colorScheme = theme
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('light')

  useEffect(() => {
    let initial = 'light'
    try {
      const saved = localStorage.getItem('vela_theme')
      if (saved === 'light' || saved === 'dark') initial = saved
      else if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) initial = 'dark'
    } catch {}
    setThemeState(initial)
    applyTheme(initial)
  }, [])

  const setTheme = useCallback((t) => {
    setThemeState(t)
    applyTheme(t)
    try { localStorage.setItem('vela_theme', t) } catch {}
  }, [])

  const toggle = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() { return useContext(ThemeContext) }

// Devuelve la paleta (objeto de hex, válido para inline-style Y atributos SVG)
// según el tema activo. Las páginas migradas hacen: `const T = useT()`.
export function useT() {
  const { theme } = useContext(ThemeContext)
  return theme === 'dark' ? T_DARK : T_LIGHT
}

export const FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',system-ui,sans-serif"

const Icon = ({ d, size = 16, sw = 1.5 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round"
    strokeLinejoin="round" style={{ flexShrink: 0 }}>{d}</svg>
)

export const I = {
  coin: <Icon d={<><circle cx="12" cy="12" r="9" /><path d="M15 9.5c-.7-1-1.9-1.5-3-1.5-1.8 0-3 .9-3 2.2 0 3 6 1.6 6 4.6 0 1.3-1.2 2.2-3 2.2-1.4 0-2.6-.7-3.2-1.7M12 6.5v11" /></>} />,
  trend: <Icon d={<><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></>} />,
  cart: <Icon d={<><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" /><circle cx="10" cy="20" r="1.4" /><circle cx="17" cy="20" r="1.4" /></>} />,
  spark: <Icon d={<><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /><circle cx="12" cy="12" r="3" /></>} />,
  bell: <Icon d={<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z" /><path d="M10 21a2 2 0 0 0 4 0" /></>} />,
  gear: <Icon d={<><circle cx="12" cy="12" r="3" /><path d="M19.4 14.5a1.5 1.5 0 0 0 .3 1.7l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.5 1.5 0 0 0-1.7-.3 1.5 1.5 0 0 0-.9 1.4v.4a2 2 0 1 1-4 0v-.2a1.5 1.5 0 0 0-1-1.4 1.5 1.5 0 0 0-1.7.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.5 1.5 0 0 0 .3-1.7 1.5 1.5 0 0 0-1.4-.9H3a2 2 0 1 1 0-4h.1a1.5 1.5 0 0 0 1.4-1 1.5 1.5 0 0 0-.3-1.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.5 1.5 0 0 0 1.7.3h.1a1.5 1.5 0 0 0 .9-1.4V3a2 2 0 1 1 4 0v.1a1.5 1.5 0 0 0 .9 1.4 1.5 1.5 0 0 0 1.7-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.5 1.5 0 0 0-.3 1.7v.1a1.5 1.5 0 0 0 1.4.9H21a2 2 0 1 1 0 4h-.2a1.5 1.5 0 0 0-1.4.9z" /></>} />,
  arrowUp: <Icon d={<path d="M7 14l5-5 5 5" />} sw={2} />,
  arrowDown: <Icon d={<path d="M7 10l5 5 5-5" />} sw={2} />,
  chevron: <Icon d={<path d="M6 9l6 6 6-6" />} />,
  search: <Icon d={<><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>} />,
  folder: <Icon d={<><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" /></>} />,
  brief: <Icon d={<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" /></>} />,
  pkg: <Icon d={<><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></>} />,
  users: <Icon d={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>} />,
  mail: <Icon d={<><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" /></>} />,
  plus: <Icon d={<><path d="M12 5v14M5 12h14" /></>} sw={2} />,
  check: <Icon d={<path d="M20 6L9 17l-5-5" />} sw={2} />,
  x: <Icon d={<><path d="M18 6L6 18M6 6l12 12" /></>} sw={2} />,
}
