# Vela — Dev-team testing-phase checklist

What the team needs to set up, activate, and test before/with real testers. Grouped
by: (A) accounts & secrets, (B) infrastructure, (C) built-but-staged features that
need activation, (D) a test matrix, (E) known gaps not yet built.

---

## A. Accounts & secrets to provide (env vars)

Nothing here is "broken" — these are blank by default so dev runs, and must be
filled for the matching feature to work. Backend reads them from `.env`
(see `.env.production.example`).

| Var | Needed for | Notes |
|-----|-----------|-------|
| `SECRET_KEY` | everything | `openssl rand -hex 32`. Backend won't boot without it. |
| `DATABASE_URL` | prod DB | Postgres (`postgresql+psycopg://…?sslmode=require`). SQLite in dev. |
| `ENVIRONMENT` | secure cookies | Set to `production` in prod (else auth cookies aren't Secure). |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` | subscriptions + Connect | Use **test keys** for testing. |
| `STRIPE_WEBHOOK_SECRET` | billing + Connect status | From the Stripe webhook you create (see B). |
| `STRIPE_PRICE_STARTER/PRO/BUSINESS` + `EXTRA_USER` + `VERA_PLUS` | plans | Price IDs from the Stripe Dashboard. **The `.env` currently points at old (v2) price IDs — re-create the prices and update these.** |
| `REDIS_URL` | shared rate-limiting | Optional; falls back to in-memory if unset. |
| `SENTRY_DSN` | crash alerts | Optional; disabled if unset. |
| `ANTHROPIC_API_KEY` | Vera AI | Required for any AI feature. |
| `NEO4J_*` | graph features | Optional (leave password empty to disable). |
| `AEAT_VERIFACTU_ENDPOINT` | Veri\*Factu live submit | Leave empty → SANDBOX (simulated). |
| `CONNECT_APPLICATION_FEE_BPS` | platform fee on company sales | Default 0 (company keeps 100%). |

## B. Stripe Dashboard setup (one-time, in test mode first)

1. **Create the products/prices** for Starter/Pro/Business + Extra user + Vera Plus →
   put the price IDs in `.env` (the current ones are stale).
2. **Enable Apple Pay & Google Pay** under Settings → Payment methods (on by default
   for most accounts). Subscription Checkout shows them automatically.
3. **Enable Stripe Connect** (Dashboard → Connect → Get started) — REQUIRED, or the
   "Cobros" onboarding returns *"sign up for Connect"*. Use **Express** accounts.
4. **Create webhooks** pointing at `POST /api/billing/webhook` for:
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_succeeded`,
   `invoice.payment_failed`, and **`account.updated`** (Connect status). Put the
   signing secret in `STRIPE_WEBHOOK_SECRET`. Use `stripe listen` locally.

## C. Built-but-staged — activate before testers hit these

- **Postgres RLS (tenant isolation backstop).** Built; OFF on SQLite by design. To
  activate on a staging Postgres follow `docs/RLS.md` (swap remaining tenant routers,
  fix the network agent's PG portability, give background workers a tenant context,
  create the `vela_app` / `vela_network_ro` roles, run `alembic upgrade head`). Until
  then, tenant isolation relies on the app-layer `company_id` filters (intact).
- **Short access tokens.** Refresh-token system is live; access token is still 24h
  until the frontend is fully consolidated onto `apiFetch` (then drop to ~15 min).
- **Veri\*Factu / DTE go-live (Spain / El Salvador).** Works end-to-end in SANDBOX
  (no real submission). For live: each company uploads its **own qualified cert**
  (`.p12`) in Fiscal, and set `AEAT_VERIFACTU_ENDPOINT` + the production environment
  on the tenant. Other countries (MX/CO/AR/CL/PE) are accounting-only for now.
- **Branch protection** on `main` (GitHub setting — `docs/SECURITY.md`).

## D. Test matrix (happy-path + the security-critical flows)

Automated regression suite (run it in CI or locally):
`cd backend && python -m unittest tests.test_security` (12 tests).

Manual / exploratory, per area:

- **Auth:** register → login → refresh (leave a tab idle past token expiry) →
  logout (confirm the session is dead on another device) → 2FA enable + login →
  wrong-password lockout (per-IP and per-account).
- **Multi-tenant:** create **2 companies**, confirm neither sees the other's data in
  every module (sales, costes, accounting, hr, customers, projects, documents,
  fiscal). (Many isolation bugs only appear with a 2nd company.)
- **Billing:** subscribe to each plan (test card `4242…`), confirm plan modules
  unlock; Apple Pay shows on iPhone/Safari; cancel + downgrade; Vera Plus.
- **Stripe Connect (Cobros):** Settings → Cobros → onboard (Stripe test onboarding) →
  status flips to "activos" → Ventas → "Cobrar con tarjeta/Apple Pay" opens a
  checkout → pay with a test card → money shows in the connected test account.
- **Veri\*Factu (ES):** Fiscal → pick Spain → choose VERIFACTU/NO_VERIFACTU → emit an
  invoice → chain badge green → download XML → anular → chain still green. Upload a
  test `.p12` → "validado". Try switching to NO_VERIFACTU after emitting (blocked).
- **GDPR:** Settings → download my data; delete account (use a throwaway).
- **Ledger per country:** onboard each of the 7 countries → chart of accounts +
  taxes load; e-invoicing shows the right system (ES/SV live, rest "próximamente").
- **Plan gating:** flip a company to a paid phase and confirm Starter doesn't see
  Pro/Business modules (currently beta = full access; see `docs/SECURITY.md`).
- **Files/limits:** upload an oversized file (rejected), `?limit=99999` on a list
  (422), a runaway query (times out at 30s).

## E. Known gaps NOT built (decide if in-scope for testing)

- **UUID ids** — deferred (enumeration mitigated by audit log + cross-tenant→404).
- **Real e-invoicing for MX/CO/AR/CL/PE** — only registered/labelled; pipelines not
  built (each is a large country-specific integration: CFDI needs a SAT-certified PAC, etc.).
- **Card-present Apple Pay in the POS** — the web Connect flow opens a checkout the
  customer pays on their phone; true tap-to-pay needs a native iOS app + Stripe Terminal.
- **Auto-record sale on Connect payment success** — currently the cashier confirms
  the sale after charging; a webhook-driven auto-record is a follow-up.
- **Veri\*Factu RealSigner (XAdES) + live AEAT submit** — stubbed; needs the cert +
  AEAT WSDL/endpoint.
- **Email sending** (invites, notifications) — verify the provider is configured.
- **CI doesn't run the app test suite** (heavy deps); CVE scanning does run.

---

**Bottom line for the testing phase:** the app runs and is internally consistent
today on SQLite. Before external testers: (1) fill the Stripe test keys + create
prices + enable Connect + webhooks, (2) stand up a staging Postgres and activate
RLS, (3) run the 2-company isolation pass. Everything else degrades gracefully.
