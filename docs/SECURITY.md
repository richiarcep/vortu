# Vela — Security Review (2026-06-24)

Multi-agent security review of the session's changes (new endpoints, raw SQL, frontend auth/XSS) + a regression check on the earlier P0 fixes. Each high/critical finding was adversarially verified.

## Verdict
**Tenant isolation is intact** across every audited endpoint (auth + `company_id` scoping everywhere), the earlier **P0 fixes did not regress**, and there is **no SQL injection** (raw queries are parameterized; `order_by` is whitelisted). Safe to soft-launch in the current **beta** config.

## Implemented this pass (commit `00a456b`)
- **H-1 — server-side module gating** *(was frontend-only → paywall bypass when paid)*. `require_module()` dependency (`core/security.py`) attached to the module routers in `main.py` (documentos, finance, hr, accounting, projects, customers, sales, marketing, costs, costes). Dashboard-aggregation routers (agent `/resumen`, analytics, vera-insights) intentionally **not** gated so the dashboard works on every plan. Beta/superadmin get the full module set → nothing blocked today.
  - **⚠️ Before flipping the billing phase off `beta`:** verify each tier's dashboard still shows the right widgets (a Starter user will get empty proyectos/clientes widgets — correct, since `/proyectos/resumen` and `/clientes/analytics` are now gated).
- **M-1 — rate limiting** on Vera/LLM chat (`vera/router` chat+analizar, `vera_v2` chat+stream, `agent` chat) at 20/60. *(Note: the limiter is in-memory per-process; move to Redis for multi-worker — see `core/rate_limit.py`.)*
- **M-2 — security headers + CSP** in `next.config.ts` (frame-ancestors none, object-src none, base-uri/form-action self, nosniff, Referrer-Policy, HSTS). CSP keeps `unsafe-inline` for script/style (Next + the app's inline styles); tighten to nonces later.
- **M-3 — `/leer-pdf`**: content-type allowlist (PDF/PNG/JPG → 415 otherwise) + real post-read size cap (not just the spoofable `file.size`).
- **A-4** — ad-platform secret fields masked (`type=password`, `autoComplete=off`) in the Marketing connect modal.
- **A-5** — `amount > 0` + IVA-rate bounds on manual gasto (`GastoManual`) and project expense (`ExpenseCreate`).
- **A-7** — super-admin text-to-SQL runs on a read-only connection (`PRAGMA query_only=ON`). *(The review verified the regex sandbox was already not write-exploitable — this is defense-in-depth.)*

## Remaining (advisory — low/info, not launch blockers)
- **A-1 (known) — JWT in localStorage, 24h non-revocable.** `core/config.py` `ACCESS_TOKEN_EXPIRE_MINUTES=1440`; no refresh/rotation, no `jti`/denylist, logout is client-side only. Fix: shorter access token + revocable refresh flow, or a `token_version`/`jti` denylist checked in `get_current_user`. (Larger change.)
- **A-2 — cross-tenant `employee_id` not validated** on `assigned_to` (projects `create_task`/`update_task`) and workgroup `log_task_hours` (`hr.py:1100`) — referential-integrity pollution, not a leak (`projects.log_time` already validates; mirror it on the others).
- **A-3 — `documentos.execute_sql_action`** writes payslip/contract from AI-derived `employee_id` without a company check (row stays in caller's company → misattribution, not IDOR).
- **A-6 (info) — `EmployeeFeedback` has no `company_id` column** (isolation depends on the write-time employee→company check; add a denormalized column for defense-in-depth).
- **A-8 (info) — dead `?redirect=` param** in `lib/api.js` `handleUnauthorized` (login ignores it; no open-redirect — remove or validate same-origin).
