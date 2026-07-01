# Guía de testing — Vela

> App de gestión empresarial multi-país con IA (Vera). Entorno de **staging** para pruebas.
> URL: **https://www.getvela.dev**

---

## 1. Cómo acceder

Hay dos formas según quién prueba:

### A) Tester con cuenta propia (recomendado para el equipo)
1. Entra a **https://www.getvela.dev/register** y crea tu cuenta.
2. Te llega un **correo de verificación** (revisa spam). Confírmalo.
3. Inicia sesión. En **fase beta tienes acceso a todos los módulos** (plan Business).
4. Tu empresa empieza vacía → ideal para probar el flujo de alta de datos desde cero.

### B) Empresas demo (datos ya cargados)
Hay **3 empresas demo** precargadas con ventas, gastos, empleados y proyectos de ejemplo, una por país:
| Empresa | País | Moneda |
|---|---|---|
| Vela Demo España | 🇪🇸 ES | € EUR |
| Vela Demo México | 🇲🇽 MX | $ MXN |
| Vela Demo El Salvador | 🇸🇻 SV | $ USD |

Son cuentas **no-admin con plan Business + Vera Plus gratis** (clientes realistas). Se acceden por **impersonación** desde la cuenta de operador (ver §6). *(Si el equipo necesita login directo a las demos, se puede habilitar — pídelo.)*

---

## 2. Qué probar — módulos

| Módulo | Qué validar |
|---|---|
| **Dashboard** | KPIs (ventas, resultado, caja), que los números cuadren con los módulos |
| **Ventas / TPV** | Crear venta, escáner/códigos, cobro con tarjeta (Stripe Connect), reembolsos |
| **Contabilidad** | Asientos en partida doble, que una venta genere su asiento de ingreso |
| **Costes** | Alta de gastos, buscador (prueba mayúsculas/minúsculas), filtro por proveedor |
| **Finanzas** | P&L, ratios, proyecciones |
| **Fiscal** | Facturación electrónica por país (VeriFactu ES / DTE SV / CFDI MX), numeración correlativa |
| **RR.HH.** | Empleados, masa salarial, nóminas |
| **Clientes** | Alta/edición de contactos |
| **Proyectos** | Tareas, horas, estados |
| **Marketing** | Campañas, gasto de marketing |
| **Documentos** | Subir documento → extracción por IA → registro |
| **Vera (IA)** | Pregúntale sobre tu negocio (ver §3) |

---

## 3. Vera (asistente IA)

- Abre Vera desde el botón/panel de la app.
- Pruebas sugeridas:
  - "¿Cómo van mis ventas este mes?"
  - "¿Cuál es mi resultado del año?"
  - "Resúmeme mis gastos por categoría."
  - Preguntas por módulo (HR, ventas, costes) — Vera usa los datos reales de tu empresa.
- **Vera Plus** desbloquea más capacidad/uso. Las demos lo tienen activo.

---

## 4. Multi-país

Cambia según el país de la empresa: **moneda, formato de fecha/número, impuestos y facturación electrónica**. Verifica que todo se muestre en la moneda y formato correctos (€ en ES, $ MXN en MX, $ USD en SV).

---

## 5. Cómo reportar un bug

Incluye siempre:
1. **Qué hacías** (módulo + pasos para reproducir).
2. **Qué esperabas** vs **qué pasó**.
3. **Captura de pantalla** si es visual.
4. Email de la cuenta y hora aproximada (ayuda a cruzar con los logs).

> Los errores del servidor se capturan automáticamente en **Sentry**, así que con la hora + el email solemos poder rastrearlo aunque no veas el detalle.

---

## 6. Impersonación (solo operador de plataforma)

El operador puede **entrar como una empresa** para ver su experiencia sin su contraseña:
1. Inicia sesión como operador (requiere **2FA**).
2. Back-office → Impersonar → elige la empresa demo.
3. La sesión de impersonación es **de solo lectura por defecto** (no altera datos del cliente) y dura **15 min**.
4. Nunca se puede impersonar a otro operador/superadmin.

---

## 7. Notas de la fase beta

- Entorno de **staging**: los datos pueden reiniciarse; no metas información real sensible.
- En beta, **todos los módulos están desbloqueados** independientemente del plan.
- Pagos (Stripe) en **modo test**: usa tarjetas de prueba de Stripe, no tarjetas reales.
- Si algo "no carga" justo después de un cambio de seguridad (p.ej. activar 2FA), **cierra sesión y vuelve a entrar** (renueva el token).
