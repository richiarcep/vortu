# Vela — Production-Readiness Audit

**Started:** 2026-06-23 · **Scope:** full-stack (`backend/` FastAPI + SQLite, `frontend/` Next 16.2.4)
**Goal:** launch-ready — all functions work, UI/UX solid, security hardened, deployable.

> **How to resume:** this file is the source of truth. Check off items as fixed (`[x]`).
> Findings were produced by 4 read-only agents (backend / frontend / security / deploy) and
> spot-verified against live code + the live `nexum.db` (currently 1 company, so several
> multi-tenant bugs are *latent* — they activate the moment a 2nd company signs up).

Severity legend: **P0** = must fix before launch · **P1** = fix before/at launch · **P2** = soon after · **P3** = nice-to-have.

---

## P0 — Blockers (security & data integrity)

> **STATUS 2026-06-23: all P0 security & data-integrity items below are FIXED** (backend boots clean, 306 routes; crypto + filename sanitizer unit-checked). Code-level only — see the deployment blockers section for the infra items still open.

### Multi-tenant authorization is broken (privilege escalation)
- [x] **Every customer is a de-facto platform superadmin.** `register()` sets `is_admin=True` on each company's first user (`api/auth.py:67`); `get_admin_user` only checks `is_admin` (`core/security.py:88`) and gates **all `/api/admin/*`** — read/mutate any company, any user, and read/download/edit any company's AI memory (`api/admin.py:900-971`). → Make `get_admin_user` require `is_superadmin` (column exists; `api/vera_network.py:19` is the correct pattern).
- [x] **Vera routing backoffice gated only by `is_admin`** — incl. set/delete/read global provider API keys (`api/vera_routing_admin.py:20`, keys at 297-341). Any tenant owner can exfiltrate/rotate platform LLM keys. → require `is_superadmin`.
- [x] **Platform-wide billing phase switch gated only by `is_admin`** (`api/billing.py:136`) — flips *every* tenant's subscription phase. → require `is_superadmin`.
- [x] **Backoffice routers use ad-hoc admin checks**, three against the misspelled, nonexistent attr `is_super_admin` (dead branch → collapses to `is_admin`): `doc_prompts_admin.py:19`, `doc_templates_admin.py:21`, `vera_pipeline_admin.py:21` (also `backoffice_prompts.py`). → replace all with `Depends(get_admin_user)` once that's fixed to `is_superadmin`.

### Secret exposure
- [x] **Fiscal config leaks plaintext tax-authority credentials to ANY authenticated user.** `GET /api/fiscal/config` does `SELECT *` + `dict(row._mapping)`, returning `certificado_password` (.p12 signing-cert pwd), `api_secret`, `api_key`, `token_actual` (`api/fiscal.py:43,46`). → return an explicit non-secret column allowlist.
- [x] **Fiscal cert password & API secrets stored plaintext at rest** (`api/fiscal.py:59,75`; schema `setup_db.py:87`). → encrypt at rest (Fernet keyed off `SECRET_KEY`).

### Path traversal
- [x] **Arbitrary file WRITE on upload** — `os.path.join(UPLOAD_DIR, f"{user.id}_{file.filename}")`; leading `../` escapes (`api/upload.py:71`; same at `api/accounting.py:242`; and `api/documentos.py:711` on confirm). → `Path(file.filename).name` before joining.
- [x] **Arbitrary file READ on payslip download** — `f"payslips/{employee_name}_payslip.pdf"` from raw path param, no tenant scope (`api/hr.py:270,278`). → look up by ID scoped to `company_id`; never build path from a path param.

### Cross-tenant data leaks / IDOR
- [x] **Vacation write IDOR** — `POST /api/hr/vacations` inserts against `data.employee_id` with no company check (`api/hr.py:412`). → verify employee belongs to caller's company.
- [x] **Salary leak** — `POST /api/proyectos/tareas/{id}/tiempo` reads any employee's `gross_salary` with no company filter (`api/projects.py:369`). → add `Employee.company_id == current_user.company_id`.
- [x] **Global LLM config + cross-tenant 24h cost/token aggregates leaked to any user** — `GET /api/vera/route/status` gated only by `get_current_user` (`api/vera_route_api.py:136-197`). → `Depends(get_admin_user)`.
- [x] **Marketing uses `user.id` where `company_id` is meant** — `_gather_internal_data` filters `Sale/Product/Contact.company_id == current_user.id` (`api/marketing.py:104-119`). Silently wrong figures + cross-tenant leak when ids collide. → filter by `current_user.company_id`.

### Broken endpoints (functions that don't work)
- [x] **`POST /api/marketing/analizar` 500s on any document** — queries nonexistent columns `Document.user_id` / `doc.extracted_text` (model has `uploaded_by`, `company_id`, `ai_result`) (`api/marketing.py:79-83`). → fix column names, read `ai_result`.

### Wrong money shown to customers
- [x] **Pricing page is stale & charges wrong amounts.** Advertises a removed one-time "licencia única" (`license: 149/299/499`) and POSTs to `/api/billing/license/checkout`; monthly prices `9/19/39` are wrong vs current **Starter €29 / Pro €59 / Business €119** (`app/pricing/page.jsx:14-61,148,238`). Backend billing was already corrected to v3 — frontend is out of sync. → align `PLANS`, drop the license tier, point CTA at subscription checkout.

---

## P0 — Blockers (deployment / launch)

> **STATUS 2026-06-23: deployment blockers RESOLVED in code.** Architecture: **all-on-Hetzner + Neon Postgres + Neo4j Aura** (Docker Compose + Caddy auto-TLS). Added `backend/Dockerfile`, `frontend/Dockerfile` (standalone), `docker-compose.yml`, `Caddyfile`, `.env.production.example`, `frontend/.env.example`, Alembic scaffold, dialect-aware Postgres-safe `ensure_runtime_schema`, psycopg/gunicorn/alembic deps, `/health`. Runbook: [DEPLOY.md](DEPLOY.md). Remaining = runtime steps on the server (provision Neon, set DNS, `docker compose up`).

- [x] **`NEXT_PUBLIC_API_URL` is build-time inlined and undefined** → a prod build defaults to `http://localhost:8000`, so the deployed app calls localhost from the user's browser and every API call fails (`frontend/lib/api.js:8`). No `.env*` exists in `frontend/`. → set it as a **build-time** env in CI/Docker; add `frontend/.env.example`. (Verified against Next 16 self-hosting docs.)
- [x] **SQLite as production DB** (`DATABASE_URL=sqlite:///./nexum.db`). Serializes writes (`database is locked` under concurrency), lost on ephemeral/containerized redeploys, can't scale horizontally. Code already supports Postgres (`core/database.py` `_is_sqlite` branch). → migrate to Postgres before launch.
- [x] **No migration strategy** — schema = `create_all()` + hand-rolled `ALTER TABLE`/`PRAGMA` in `ensure_runtime_schema()` on every boot (`core/database.py:53-171`), SQLite-specific (breaks on Postgres). 15+ ad-hoc `migrate_*/fix_*` scripts in `backend/`. → adopt Alembic; convert runtime-schema logic to versioned migrations.

---

## P1 — High

### Functionality / correctness
- [x] **`get_account_summary` ignores `company_id`** (`modules/accounting/ledger.py:202`) → double/triple-counted P&L, balance sheet, cash flow once a 2nd company exists (latent today). → add `Account.company_id == company_id`.
- [x] **`/graph/overview` inflates `ingresos_totales`** (~31e9) via cartesian `OPTIONAL MATCH` then `SUM(s.total)` (`services/graph/queries.py:40-56`; consumed by `api/admin.py:769`). → sum revenue in its own `MATCH`/`WITH`.
- [x] **`PENDING_DOCS = {}` is a process-global dict** for analyze→confirm (`api/documentos.py:44`). Breaks with >1 worker (`/confirm` hits another process → "documento caducado"); unbounded memory. → persist to DB/Redis keyed by temp_id+company.

### Frontend auth/robustness
- [~] **401s strand users on empty pages.** *(PARTIAL: added `apiFetch`/`handleUnauthorized` in lib/api.js + SWR fetcher + onboarding fix; per-page raw fetches should migrate to `apiFetch` incrementally with the app running.)* — ORIG: `useApi`/SWR never handles 401 (`components/ui/useApi.js:6-25`); most pages only check token *presence* at mount, not validity, and swallow data-call errors (`app/ventas/page.jsx:261`, `app/contabilidad/page.jsx:412`, `app/finanzas/page.jsx:278`, `app/onboarding/page.jsx:68` parses body without `r.ok`). → centralize fetch through a helper that clears token + redirects on 401.
- [x] **Internal pricing-psychology notes shipped in client bundle** — `be_note: 'Compromise Effect…'` etc. (`app/pricing/page.jsx:28,44,60`). → remove from shipped data.

### Deploy / ops
- [x] **No global exception handler / structured logging / error monitor** (`backend/main.py`). → add `@app.exception_handler`, JSON logging, Sentry-style monitor.
- [ ] **Uploads/payslips/reports on local relative filesystem** (`api/documentos.py:37`, `api/upload.py:18`, `api/hr.py:270`) — lost on redeploy, broken across instances. → object storage (S3/GCS) or persistent volume with absolute configurable paths.
- [x] **`NEO4J_PASSWORD` hard-required, blocks startup even when graph unused** (`core/config.py` validator; driver connects lazily). → make optional, gate graph features on its presence.
- [x] **No deployment manifests / prod server config** — no Dockerfile/Procfile/gunicorn; README is dev-only (`uvicorn --reload`); `uvicorn==0.46.0` not `[standard]`, single-process. → add prod run config (gunicorn + uvicorn workers), pin `uvicorn[standard]`, Dockerfile.
- [x] **HR email uniqueness checked across ALL companies** (`api/hr.py:130`) → cross-tenant email enumeration + blocks legit hires. → scope to `company_id`.

---

## P2 — Medium

- [x] Exception text leaked to clients via `detail=str(e)` — ~14 sites (`api/agent.py:45,62`, `api/upload.py:97`, `api/finance.py:213`, `api/marketing.py:193,330`, `api/accounting.py:142,165,260,320,440,667`, `vera/router.py:51,73`). → log server-side, return generic message.
- [ ] No upload size limit / unbounded read into RAM (`api/upload.py:73`, `api/accounting.py:245`, `api/fiscal.py:106`; `documentos.py:593` correctly caps 20 MB). → enforce max size / stream.
- [ ] JWT in `localStorage` (key `vela_token`, ~40 read sites) — XSS-exfiltratable, not httpOnly. → httpOnly Secure SameSite cookie.
- [ ] `/api/finance/ratios` prompt is a truncated/malformed f-string → LLM gets broken spec, returns garbage (try/except hides it) (`api/finance.py:265-336`).
- [ ] `vera_v2` non-streaming chat persists & bills failed generations as assistant messages (`api/vera_v2.py:470`).
- [ ] N+1 in product listing — `get_product_stats` per product, ~3N queries (`api/sales.py:213`, `modules/sales/reports.py:8`). → single grouped query / paginate.
- [ ] Hardcoded account codes contradict seeded chart (`400`=Proveedores, `100`=Capital, not Revenue/Cash) in dead `record_revenue/expense` + opt-in credit-note path (`journal.py:279,310`, `revenue_register.py:72`, `sales.py:523`). Latent unless `post_accounting=true`. → route through `get_entry_accounts`, delete dead fns.
- [ ] Fiscal config endpoints accept untyped `dict`, no validation (`api/fiscal.py:86-128,181`); IVA stored as fraction but range unvalidated (a `13` → 1300%). → Pydantic models + range check.
- [x] Duplicate fiscal route `/fiscal/fiscal` — second near-copy of the config page (`app/fiscal/fiscal/page.jsx`), will drift. → confirm intent, delete one.
- [ ] `/settings`, `/fiscal`, `/vera-plus` are real pages absent from Sidebar (`components/Sidebar.jsx:31-58`). → verify reachability.
- [ ] Pervasive silent-failure pattern in frontend (`catch {}` / `if(r.ok)` no else) — empty UI, no message/retry (`app/settings/page.jsx:205`, `app/vera/page.jsx:216`, `app/finanzas`). → add error states on primary loads.
- [ ] Unvalidated redirect to backend-supplied `checkout_url` — silent no-op if missing (`app/pricing/page.jsx:244,258`, `app/vera-plus/page.jsx:125`). → guard + feedback.
- [ ] Super-admin text-to-SQL sandbox is a regex blocklist, not read-only/allowlist (`vera/network_engine.py:34-40,102-122`). Super-admin-only + audit-logged, but prompt-injectable. → open SQLite read-only (`mode=ro`/`PRAGMA query_only`), allowlist tables/cols.
- [ ] Swallowed-exception clusters drop real failures silently: document pipeline (`api/documentos.py:518,696,908…`), vera_v2 context builders, `modules/projects/scheduler.py:111` (milestone notify is a `pass` stub). → `logging.warning` instead of bare `pass`; implement/remove the stub.
- [ ] No top-level DB-checking health endpoint for LB probes (only `GET /` and a namespaced `vera/router.py:76`). → add `/health` + `/readyz` that ping the DB.
- [ ] ~40 leftover `print()` calls bypass the logger (`modules/prospector/scraper.py`, `modules/billing/stripe_service.py`, `services/vector/chroma_store.py`); dev/`test_*`/`*.bak`/stray `vela.db` files in `backend/` shouldn't ship. → use logging; exclude from deploy artifact.

---

## P3 — Low / cleanup

- [ ] Dead `ssl_context` built but never passed in `services/graph/neo4j_store.py:17-27` (works over `neo4j+s://`; misleading). → drop or pass it.
- [ ] `admin.update_company_plan` only updates the first user's subscription then `break`s (`api/admin.py:247-268`).
- [ ] DeepSeek model row inactive in live DB (NOT the "active w/o key" risk reported); router skips providers with no key. Don't run `configure_deepseek.py` in prod without `DEEPSEEK_API_KEY` (`configure_deepseek.py:22`).
- [ ] Many endpoints feed user dates straight to `date.fromisoformat` → raw 500 on bad input (`api/sales.py:767`, `api/costes.py:277`). → return 400/422.
- [ ] 24h JWT lifetime, no refresh/revocation (`core/config.py:22`). · No rate limit on Vera chat (only login/2FA). · No content-type allowlist on `/leer-pdf` (`api/accounting.py:227`).
- [ ] Dead "Términos / Política" links `href="#"` (`app/register/page.jsx:400`); dead `components/_outdated/` folder (broken in-JSX import); ~30 `console.error` in catch blocks; client-side `atob` JWT decode for display (all try/caught, cosmetic).
- [ ] `next.config.ts` hardcodes LAN IP `192.168.1.196` in `allowedDevOrigins` (dev-only, harmless); no CSP/security headers. `frontend/README.md` is untouched create-next-app boilerplate.
- [ ] CORS always includes localhost origins (`main.py:100-108`) — gate behind `DEBUG`.
- [ ] `.env.bak.*` / `nexum.db.bak-*` on disk (gitignored, never committed) — confirm & rotate any secret that left the machine.

---

## ✅ Verified solid (don't re-investigate)
- **CORS**: explicit allowlist, not `*`, correctly paired with `allow_credentials` (`main.py:100-115`).
- **Auth core**: bcrypt hashing; JWT HS256 w/ expiry; `get_current_user`/`get_admin_user` re-fetch live User and check live `is_admin` — token claims never trusted → no stale-token escalation.
- **No SQL injection**: raw `text()`/`execute` use bound params; f-string builders interpolate only Pydantic-constrained column *names*, never values.
- **No `eval`/`exec`/`os.system`/`subprocess`/`pickle.loads`** in runtime code.
- **Secrets**: `backend/.env` & `nexum.db` are NOT git-tracked; `.gitignore` correct; `SECRET_KEY`/`NEO4J_PASSWORD` strength-validated at startup; `DEBUG=False` default.
- **Sales path**: `create_sale`/`refund_sale` atomic, idempotency keys, net-of-refund revenue math — no money bug.
- **Double-entry**: `record_transaction` validates balance with `Decimal`, rejects unbalanced/unknown accounts.
- **Stripe webhook** verifies signature. **Login** rate-limited. **Error boundaries** (`app/error.jsx`, `app/global-error.jsx`) real. **Frontend API base** centralized & env-driven (no scattered localhost). **Python deps fully pinned.**
