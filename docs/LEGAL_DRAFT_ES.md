# Vela — Borrador de Términos y Privacidad (para revisión legal)

> ⚠️ **BORRADOR. NO es asesoramiento legal ni un documento vinculante.** Redactado por el equipo para dar contexto al abogado: describe **cómo funciona Vela y cómo trata los datos** para que el/la profesional lo convierta en Términos de Servicio y Política de Privacidad válidos (RGPD/LOPDGDD para 🇪🇸, y equivalentes en 🇲🇽 LFPDPPP y 🇸🇻). Rellenar/ajustar todo lo marcado con `[...]`.

**Datos a completar por el responsable:**
- Razón social / titular: `[NOMBRE LEGAL, S.L. — NIF/CIF]`
- Domicilio: `[dirección]` · Email de contacto/privacidad: `[privacidad@getvela.dev]` · DPO (si aplica): `[nombre/contacto]`
- Marca/servicio: **Vela** — `https://www.getvela.dev`
- Ley aplicable / jurisdicción: `[p. ej. España, tribunales de …]`

---

# PARTE 1 — TÉRMINOS DE SERVICIO (borrador)

## 1. Objeto y aceptación
Vela es una plataforma SaaS de gestión empresarial (contabilidad, ventas/TPV, finanzas, RR.HH., facturación electrónica y un asistente de IA llamado **Vera**) para PYMEs en España, México y El Salvador. Al crear una cuenta y marcar la casilla de aceptación, el Cliente acepta estos Términos y la Política de Privacidad. Debe ser mayor de edad y tener capacidad para contratar en nombre de la empresa que representa.

## 2. Cuenta y acceso
- El Cliente es responsable de la veracidad de sus datos, de la custodia de sus credenciales y de la actividad de los usuarios que invite a su empresa.
- Recomendamos activar la verificación en dos pasos (2FA). El primer usuario es administrador de su empresa.
- Podemos suspender cuentas por impago, uso indebido o riesgo de seguridad.

## 3. Uso aceptable
El Cliente no usará Vela para actividades ilícitas, para cargar datos sobre los que no tenga base legal, para vulnerar la seguridad de la plataforma ni para revender el servicio sin autorización.

## 4. Planes, precios y pagos
- Planes de suscripción (p. ej. Starter, Pro, Business) y complemento **Vera Plus**, con los precios publicados en la web. Impuestos según el país del Cliente.
- Pagos procesados por **Stripe**; renovación automática hasta cancelación. La cancelación surte efecto al final del periodo en curso; salvo obligación legal, no hay reembolso de periodos ya iniciados.
- **Límite de uso de IA por plan:** cada plan incluye una asignación de uso del asistente Vera. Al alcanzarla, el servicio puede degradar la calidad del modelo o requerir una ampliación de plan. (Ver Anexo de uso de IA / apartado de la Política de Privacidad sobre Vera.)

## 5. Facturación electrónica (VERI\*FACTU / DTE / CFDI)
- Vela **genera, firma y encadena** registros de facturación conforme a los sistemas de cada país. **El certificado digital cualificado pertenece siempre al Cliente** (obligado tributario), nunca a Vela.
- `[Estado de disponibilidad por país — ajustar a la realidad al publicar]`: la remisión en tiempo real a la autoridad tributaria (AEAT en 🇪🇸, Ministerio de Hacienda en 🇸🇻, SAT en 🇲🇽) puede estar en fase de certificación; Vela informa del estado real de cada emisión. El Cliente es el responsable último del cumplimiento fiscal de su negocio.

## 6. Asistente de IA (Vera) — condiciones de uso
- Vera genera respuestas mediante modelos de terceros (**Anthropic — Claude**). Las respuestas pueden contener errores; **no constituyen asesoramiento fiscal, contable ni legal** y deben ser revisadas por el Cliente antes de actuar.
- Para responder, Vela envía al proveedor de IA el mensaje del usuario y el contexto de negocio estrictamente necesario (ver Privacidad §Vera). El uso está sujeto a los límites del plan.

## 7. Propiedad intelectual y datos del Cliente
- El software y la marca Vela son de `[titular]`. El Cliente conserva la **titularidad de sus datos de negocio**; nos concede una licencia limitada para tratarlos con el único fin de prestar el servicio.
- A la baja, el Cliente puede exportar sus datos (ver Privacidad §Derechos).

## 8. Disponibilidad, garantías y responsabilidad
- Servicio "tal cual", con esfuerzos razonables de disponibilidad; `[SLA si se ofrece]`.
- En la medida permitida por la ley, la responsabilidad total se limita a `[p. ej. el importe pagado en los últimos 12 meses]`. Sin responsabilidad por daños indirectos.
- El Cliente hace copias/exportaciones razonables de sus datos críticos.

## 9. Suspensión y terminación
Cualquiera de las partes puede terminar con `[preaviso]`. Tras la baja, conservamos los datos el tiempo mínimo legal (ver Privacidad §Conservación) y luego los eliminamos o anonimizamos.

## 10. Modificaciones
Podemos actualizar estos Términos avisando con `[antelación]`; el uso continuado implica aceptación. Se registra la versión aceptada (`terms_version`), fecha e IP de aceptación.

## 11. Ley aplicable y contacto
Ley y jurisdicción: `[…]`. Contacto: `[email]`.

---

# PARTE 2 — POLÍTICA DE PRIVACIDAD (borrador)

## 1. Responsable del tratamiento
`[NOMBRE LEGAL]`, `[domicilio]`, `[email de privacidad]`. En la relación con el Cliente, Vela actúa como **encargado del tratamiento** respecto de los datos de terceros que el Cliente introduce (sus clientes, empleados, proveedores), y como **responsable** respecto de los datos de la propia cuenta del Cliente. `[El abogado debe formalizar el rol y el DPA — ver §Encargados.]`

## 2. Qué datos tratamos
- **De la cuenta/usuario:** nombre, email, contraseña (almacenada solo como *hash* argon2), país, rol, registros de acceso, foto de perfil (opcional), y el registro de aceptación de términos (versión, fecha, IP).
- **De la empresa del Cliente:** razón social, país, datos fiscales (NIF/RFC/NIT), y **certificados fiscales** que el Cliente suba (almacenados **cifrados en reposo**).
- **Datos de negocio que el Cliente introduce** (y que pueden contener datos personales de terceros): asientos contables, ventas/TPV, gastos, **empleados y nóminas**, **clientes/contactos**, proyectos y **documentos** subidos.
- **Técnicos:** dirección IP, tipo de navegador, y telemetría de errores (Sentry) para seguridad y estabilidad.
- **Pagos:** gestionados por Stripe; **no almacenamos los datos completos de tarjeta**.

## 3. Finalidades y base legal (RGPD Art. 6)
- **Prestar el servicio** (cuenta, contabilidad, facturación, IA) → *ejecución del contrato*.
- **Seguridad, prevención de fraude y auditoría** → *interés legítimo*.
- **Facturación y obligaciones fiscales/contables** → *obligación legal*.
- **Comunicaciones transaccionales** (verificación de email, avisos) → *ejecución del contrato*. Marketing solo con *consentimiento*.

## 4. Asistente de IA (Vera) — tratamiento con Anthropic
- Cuando el Cliente usa Vera, Vela envía a **Anthropic (Claude)** el mensaje del usuario y el **contexto de negocio mínimo** necesario para responder (p. ej. KPIs o datos del módulo consultado). 
- `[A confirmar/formalizar en el DPA:]` se contrata a Anthropic mediante su **DPA/SCC**, con **retención cero y sin uso para entrenamiento** de los datos enviados por API. Anthropic trata los datos en **EE. UU.** → transferencia internacional cubierta por **Cláusulas Contractuales Tipo (SCC)**.
- El Cliente puede `[opción a implementar]` desactivar el uso de IA / la "red Vera" en la configuración.

## 5. Encargados / subencargados del tratamiento
Vela se apoya en los siguientes proveedores (subencargados). El abogado debe firmar el DPA con cada uno y mantener esta lista pública/actualizada:

| Proveedor | Finalidad | Ubicación | Salvaguarda |
|---|---|---|---|
| **Anthropic** | Modelos de IA (Vera) | EE. UU. | DPA + SCC + `[zero-retention/no-train]` |
| **Hetzner** | Hosting/servidores | Alemania (UE) | Encargado UE |
| **Stripe** | Procesamiento de pagos | EE. UU./UE | DPA + SCC |
| **Resend** | Email transaccional | EE. UU. | DPA + SCC |
| **Sentry** | Telemetría de errores | EE. UU. | DPA + SCC |

*(Lista de ejemplo — confirmar proveedores, ubicaciones y salvaguardas reales.)*

## 6. Ubicación y transferencias
Los datos de negocio se alojan en la **UE (Alemania, Hetzner)**. Las transferencias a EE. UU. (Anthropic, Stripe, Resend, Sentry) se amparan en **SCC** y garantías equivalentes.

## 7. Conservación
- Datos con **obligación fiscal/contable** (facturación, asientos): se conservan el plazo legal (`[p. ej. 4–6 años según país]`).
- Resto de datos de cuenta: mientras la cuenta esté activa y hasta `[X]` tras la baja; después se eliminan o **anonimizan/pseudonimizan** (no hay borrado físico de lo que la ley obliga a conservar).

## 8. Seguridad
Aislamiento multi-inquilino a nivel de base de datos (**Row-Level Security**), cifrado en tránsito (HTTPS) y **cifrado en reposo de los certificados fiscales**, contraseñas con *hashing* argon2, **2FA** opcional, control de acceso por roles, y registro de auditoría.

## 9. Tus derechos (RGPD Art. 15–22)
Acceso, rectificación, **supresión**, **portabilidad** (exportación), oposición y limitación. `[Para datos de terceros que introdujo el Cliente, el interesado ejerce sus derechos ante el Cliente (responsable); Vela asiste como encargado.]`

## 10. Cómo ejercerlos
Escribiendo a `[email de privacidad]`. Plazo de respuesta: `[1 mes, RGPD]`. Derecho a reclamar ante la autoridad de control (**AEPD** en 🇪🇸, `[INAI en 🇲🇽]`, `[… en 🇸🇻]`).

## 11. Menores y cambios
El servicio no está dirigido a menores. Avisaremos de cambios materiales en esta política con `[antelación]` y registraremos la versión.

---

### Notas para el abogado (checklist)
1. Formalizar el **rol responsable/encargado** y redactar el **Contrato de Encargo (DPA)** con el Cliente (RGPD Art. 28).
2. Firmar **DPA + SCC** con Anthropic, Stripe, Hetzner, Resend, Sentry; confirmar **retención cero/no-train** con Anthropic.
3. Ajustar plazos de conservación por país (ES/MX/SV) y las autoridades de control.
4. Validar las cláusulas de facturación electrónica según el estado real de certificación por país.
5. Confirmar la limitación de responsabilidad y la ley/jurisdicción.
