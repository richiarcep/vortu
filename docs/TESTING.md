# Guía de QA — demo de dev (Vela)

Entorno de **demo/dev** desplegado en Hetzner (full-stack, RLS activo). Esta guía es
para el testing individual y el del equipo de desarrollo.

## Acceso

- **App:** https://167-233-199-102.sslip.io  (redirige a `/login`; badge "Demo · Dev" abajo-derecha)
- **API:** mismo origen, bajo `/api/*` (Caddy enruta) · health: `/health`
- **Backend staging:** `root@167.233.199.102`, stack en `/opt/vela-backend` (`docker compose -f docker-compose.staging.yml`)

### Cuentas (password de todas: `VelaDemo2026!`)

| Cuenta | País | Estado |
|---|---|---|
| `demo.es@gmail.com` | España (ES) | Configurada (productos + plan contable) → entra al panel |
| `demo.mx@gmail.com` | México (MX) | Configurada |
| `demo.sv@gmail.com` | El Salvador (SV) | Configurada |
| `demo.nuevo@gmail.com` | — (sin país) | **Sin configurar** → dispara el **wizard de onboarding** |

Para probar el onboarding desde cero: registra una cuenta nueva en `/register` (email
con TLD real, p.ej. `@gmail.com`; `.local`/`example.com` los rechaza el validador).

## Qué probar (features de esta tanda)

### 1. Aislamiento multi-tenant (RLS) — LO MÁS CRÍTICO
La app corre como rol `vela_app` (RLS forzado a nivel DB). **Un tenant NO debe ver datos de otro.**
- Entra con `demo.es`, crea un producto/venta. Entra con `demo.mx` → **no** debe aparecer ese producto.
- En cada módulo (Ventas, Contabilidad, Clientes, Documentos, Costes, Proyectos, HR): los listados solo muestran datos de la empresa logueada.
- Criterio: **cero fugas** entre cuentas. Si ves datos de otra empresa, es un bug P0.

### 2. Onboarding obligatorio
- Con `demo.nuevo` (o una cuenta recién registrada): al entrar te lleva al wizard.
- Pasos: **Bienvenida → País (obligatorio) → Datos fiscales (OPCIONAL, botón "Saltar por ahora") → ¡Listo!**.
- Criterio: no puedes llegar al panel sin elegir país; el paso fiscal sí se puede saltar; tras completar, entras al dashboard y el wizard ya no vuelve a salir.

### 3. Extracción de documentos con Vera (conector externo)
- Por defecto usa el motor **nativo** de Vela. Hay un **toggle de proveedor** (solo admin) en la cabecera de Documentos: "Proveedor: Vera API / Vera nativo".
- Sube un documento (factura) en Documentos → revisa la extracción → confirma.
- Con proveedor "Vera API": el badge del modal dice "Vera API"; si Vera está caído, cae a "Motor local" sin romper.
- Criterio: la extracción no rompe; importes con formato (`1.234,56`, `$1,234.56`) se contabilizan con el valor correcto (no 0).

### 4. Webhooks de Stripe (test mode)
- Dos rutas independientes: plataforma `POST /api/billing/webhook` (suscripciones) y Connect `POST /api/connect/webhook` (connected accounts), cada una con su secreto.
- Smoke: `stripe trigger checkout.session.completed` (plataforma) y `stripe trigger account.updated --stripe-account <acct>` (Connect) → deben dar **200** en Event deliveries.
- Criterio: un fallo del handler devuelve un código que hace **reintentar** a Stripe (no traga el error con 200).

### 5. Despliegue / mismo origen
- Login → la sesión se mantiene (cookie de refresh same-origin). El front llama a `/api` del mismo dominio (no `localhost`).

## Limitaciones conocidas (no son bugs)

- **CFDI de México** aún no implementado (el ledger/plan contable de MX sí; la facturación electrónica MX está "próximamente"). DTE de El Salvador y VeriFactu de España sí están.
- **Stripe en modo test** — no uses tarjetas reales; usa las de prueba de Stripe.
- **Sin dominio propio** todavía: la URL es `sslip.io`. Cert Let's Encrypt real igualmente.
- **`ANTHROPIC_API_KEY` / claves Stripe**: si algún flujo de IA o cobro real falla por "no configurado", es porque esas claves se ponen en el `.env` del server cuando toque.
- Datos de prueba sembrados (`RLS Test A/B`, `Smoke One–Four`) pueden aparecer en vistas de super-admin; son ruido de QA, no de un tenant.

## Reset / datos

- Las cuentas demo son idempotentes de crear (re-registrar da 400 "ya existe", el login sigue). 
- Para empezar de cero un tenant: registra una cuenta nueva.
- Logs del backend: `cd backend && ./deploy.sh logs` (o `ssh root@167.233.199.102` → `docker compose -f docker-compose.staging.yml logs -f app`).

## Reportar

Indica: cuenta usada, módulo/URL, pasos, resultado esperado vs obtenido, y (si es backend)
el `error_id` que devuelve la API en errores 500 — sale en los logs del server para cruzarlo.
