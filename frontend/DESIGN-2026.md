# Vortu — Reglas de Diseño & Arquitectura 2026

Síntesis de investigación (deep-research: 6 ángulos, 28 fuentes, 24 claims verificados) +
`ui-ux-pro-max` + `frontend-design`. Guía para llevar Vortu a calidad de producción 2026.

## 1. Accesibilidad — WCAG 2.2 AA (alta confianza)
- Contraste texto ≥ 4.5:1; targets táctiles/click ≥ **24×24px**; el **foco nunca debe quedar tapado** por barras fijas (header/sidebar).
- Estado actual: ✅ focus-visible, ✅ dark, ✅ skip-link, ✅ `text4` con más contraste (light ~3.3:1, dark ~4.5:1), ✅ foco no oscurecido (`scroll-margin-top:80px` bajo la cabecera sticky, SC 2.4.11), ✅ `min-height:24px` en botones (SC 2.5.8), ✅ `aria-label`/`aria-expanded` en botones de solo icono (campanas, ⚙). Pendiente: revisar contraste de `text4` donde lleve info crítica a tamaño pequeño.
- Fuente: https://www.w3.org/TR/WCAG22/ , https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/

## 2. Dashboards — claridad + progressive disclosure + por rol (media)
- Mostrar lo esencial primero; detalle bajo demanda; vistas según rol (admin vs usuario).
- NO regla rígida de "5-15 KPIs" (descartada en verificación) — depende del panel.
- Fuente: https://www.gitnexa.com/blogs/saas-dashboard-ux-patterns

## 3. Rendimiento — Core Web Vitals 2026 (alta) ← MAYOR IMPACTO
- **Virtualizar** tablas/listas grandes (TanStack Virtual); paginar/limitar en backend; minimizar payload RSC; vigilar INP/LCP/CLS.
- Caso crítico: `GET /api/contabilidad/libro-mayor` devuelve ~30 MB (172k asientos) → congela el navegador. ✅ RESUELTO: (1) backend acota ventana (90d por defecto, tope duro 2 años) y limita `max_entries_per_account` (500) — saldos siempre exactos, devuelve `entries_total`/`truncated`; (2) frontend pinta cada cuenta como **acordeón** (colapsada por defecto), así no monta cientos de tablas a la vez. Pendiente opcional: virtualizar entradas dentro de una cuenta muy grande (TanStack Virtual).
- Fuente: https://vercel.com/kb/guide/how-to-optimize-rsc-payload-size , https://tanstack.com/virtual/latest

## 4. Vera = copilot, no autopilot (alta)
- Control humano, **citar de qué datos sale** el análisis, disclaimers, confirmar antes de acciones.
- Fuente: https://learn.microsoft.com/en-us/microsoft-cloud/dev/copilot/isv/ux-guidance

## 0. Paleta DEFINITIVA (decidida) — neutra-fría estilo Holded, acento azul
Para un ERP de datos densos se eligió **frío/neutro** (no cálido): más legible, menos fatiga, convención de finanzas (Holded/Xero/Stripe). Tokens (claro / oscuro):
- bg `#F7F8FA` / `#0F141B` · card `#FFFFFF` / `#161B22` · sidebar `#FBFCFD` / `#11161D`
- text `#0F172A` / `#E6EDF3` · text2 `#334155`/`#C9D1D9` · text3 `#64748B`/`#8B949E` · text4 `#94A3B8`/`#6E7681`
- hairline `rgba(15,23,42,.08)` / `rgba(255,255,255,.10)`
- **blue (acento) `#0071E3` / `#3B82F6`** (se mantiene; Vera azul-cian)
- green `#059669`/`#3FB950` · red `#DC2626`/`#F85149` · amber `#D97706`/`#D29922`
- Tipografía: **Bricolage Grotesque** solo en títulos (`.display`); cuerpo en system. Radios 18px, sombra en capas `--shadow-card`.
- Sparklines KPI: serie diaria REAL 14d (`/api/agente/resumen` → `series_14d`), color según tendencia buena.

## 5. Sistema de diseño — tokens semánticos
- Tokens por ROL semántico (surface / on-surface / primary / border / danger…) en vez de color crudo; pensar claro+oscuro juntos; escala tipográfica y de espaciado formal.
- Estado: ✅ T_LIGHT/T_DARK + useT(). Pendiente: capa semántica + escala.
- Fuente: https://www.uxpin.com/studio/blog/what-are-design-tokens/ , https://muz.li/blog/dark-mode-design-systems-a-complete-guide-to-patterns-tokens-and-hierarchy/

## 6. Estructura de proyecto
- Next.js 16: `hooks/`, `lib/`, `types/`, colocación por feature. https://nextjs.org/docs/app/getting-started/project-structure
- FastAPI: capas router→servicio→modelo, `logging` (no `print`), config validada, scripts fuera de la raíz. https://github.com/zhanymkanov/fastapi-best-practices

## Plan de pulido (fases, refactor conservador con backup)
1. **Rendimiento**: virtualizar/paginar Libro Mayor y tablas grandes.
2. **Frontend 2026**: micro-interacciones/motion, skeletons/empty states en todas las páginas, capa de tokens semánticos + escala tipográfica, data-viz limpia, Vera con "fuentes/confirmar".
3. **A11y 2.2 AA pass**: targets ≥24px, contraste, foco no tapado.
4. **Backend/estructura**: logging, scripts→`scripts/`, consolidar modelos, borrar copias `~/bizos`.
5. **Cierre**: code-review (ultra) + security-review + verify + init (CLAUDE.md).
