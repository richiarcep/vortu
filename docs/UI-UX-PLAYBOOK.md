# UI/UX Playbook (Vela)

Guía de diseño anti "AI-slop" para auditar y rediseñar la UI. Copiable a cualquier proyecto.

## 🧩 Skills / plugins (Claude Code)
| Skill | Para qué | Instalar |
|---|---|---|
| `frontend-design` | Dirección estética distintiva (anti "AI-slop") | built-in: Skill `frontend-design` |
| `ui-ux-pro-max` | Leyes UX, paletas, fuentes, checklists | skill en `~/.claude/skills` |
| `impeccable` | 23 comandos (audit/critique/polish) + detección de tells de IA | github.com/pbakaus/impeccable → `/plugin marketplace add pbakaus/impeccable` · o `npx impeccable` |
| `design-extract` (designlang) | Extrae el diseño real de cualquier web (colores/fuentes/spacing → Tailwind/CSS/Figma) | github.com/Manavarya09/design-extract → `npx designlang <url> --screenshots` |

## 📐 Leyes UX (las 6 + base)
- **Hick**: menos opciones, 1 CTA.
- **Fitts**: targets grandes ≥44px.
- **Jakob**: patrones familiares.
- **Zeigarnik**: barras de progreso.
- **Von Restorff**: un foco distintivo.
- **Miller**: agrupar, 7±2.
- Base: contraste ≥4.5:1, números tabulares, reduced-motion.

## 🌐 Webs de referencia
- **Aceternity UI** (ui.aceternity.com) — componentes animados copy-paste, gratis, sin cuenta (Motion).
- **Refero** (refero.design) — galería de referencias (inspiración).
- **Manus.im** — acabado limpio premium.
- **Rocket Money / SoFi** — fintech (extraídas con designlang; Cloudflare bloquea a veces).

## 🎨 Stack que lo hace verse bien
- Fuentes Fontshare: **Clash Display + Satoshi** (vía `<link>`). Nada de Inter/Roboto.
- **Motion** (`npm i motion`) · **Lucide** (sin emojis) · tokens CSS · acento sólido, sin gradiente · fotos reales.

## 🚫 Reglas "que no parezca IA" (de impeccable)
- Nada de fondo beige/crema (cliché 2026) → neutro real o color de marca.
- No emparejar dos sans parecidas → eje de contraste o una familia en pesos.
- Las cards son la respuesta perezosa → úsalas solo si son lo mejor; nunca anidadas.
- Varía el movimiento → evita el "reflejo uniforme" (misma entrada en todo).
- Contraste y reduced-motion obligatorios. Usa **OKLCH**, color de marca real, tipografía distintiva.
