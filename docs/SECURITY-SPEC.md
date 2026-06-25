# SECURITY SPEC — Production Hardening (source of truth)

> Security source of truth for Vela. Rules are imperative and non-negotiable. Each section has an **Acceptance** block to satisfy and self-verify. The gap analysis of the *current* code vs this spec is in [SECURITY-AUDIT-vs-SPEC.md](SECURITY-AUDIT-vs-SPEC.md).

## Project context
- **Stack (target):** FastAPI backend · Next.js frontend · PostgreSQL · Better Auth (auth, in Next.js) · Redis (rate limits/cache).
- **Product:** Multi-tenant B2B SaaS (Vela) for SMEs/freelancers/NGOs. Personal + financial + invoice data.
- **Jurisdiction:** Spain / EU. GDPR + LOPDGDD. Invoicing must meet Veri*Factu. Vera (AI) triggers EU AI Act transparency.
- **Maps to:** OWASP Top 10:2025, OWASP API Security Top 10 (2023), OWASP Top 10 for Agentic Applications (2026).

## Golden rules (violating any is a release blocker)
1. **Deny by default.** Every endpoint, resource, role, agent tool starts with no access; grant explicitly.
2. **`org_id`/`tenant_id` comes ONLY from the verified auth token.** Never from body, query, path, or unsigned header.
3. **Every query on a tenant table filters by `org_id`.** No exceptions. RLS is the backstop, not the only wall.
4. **Authorize on the server, every request.** UI hiding is not access control.
5. **No secrets in code or git.** `NEXT_PUBLIC_*` is public.
6. **Validate all input at the boundary; parameterized queries only.** Never string-build SQL.
7. **Fail closed.** When an auth/permission check errors, deny.
8. **Untrusted content is data, not instructions** — especially for the AI agent.

---
# TIER 0 — Release blockers

## 1. Authentication & token security
- Better Auth in Next.js (organization + jwt + bearer + apiKey + twoFactor). Users in our own Postgres, EU region.
- FastAPI does NOT run auth; it verifies the JWT via the JWKS endpoint (`/api/auth/jwks`).
- Access tokens short-lived (5–15 min); refresh tokens rotated on use and revocable.
- Browser stores refresh token in `HttpOnly; Secure; SameSite=Lax/Strict` cookie. Never `localStorage`.
- Passwords hashed with Argon2id.
- MFA available for sensitive actions (admin, billing, export).
- Brute-force protection: exponential backoff + lockout; credential stuffing watch.

**Acceptance:** Forged/expired/wrong-audience tokens → 401. Org and role only from verified claims. No token in localStorage. No custom crypto.

## 2. Authorization, access control matrix & multi-tenant isolation
- Access control matrix (roles × actions) enforced server-side. Roles: owner, admin, member (+ billing/read-only/support).
- BOLA: every request with an ID verifies the object belongs to `principal.org_id`. Use UUIDs, not sequential ints.
- BFLA: privileged endpoints check role.
- BOPLA: input models contain only editable fields. Never bind raw bodies to DB models (block role, is_paid, org_id…).
- Multi-tenant: scope every tenant-table query by `org_id` from the token.
- 404, not 403, when an object exists but isn't the caller's.
- Postgres RLS: ENABLE + FORCE on every tenant table; tenant context via `SET LOCAL app.current_org` inside a transaction (never plain `SET` on a pooled connection).

**Acceptance:** No tenant query lacks an `org_id` filter. RLS enabled + FORCEd on all tenant tables. Tenant context only via SET LOCAL in a transaction. Cross-tenant → 404. Mass-assignment of protected fields impossible.

## 3. Rate limiting & abuse / anomaly limits
- Rate limit every public endpoint, per-user AND per-IP. slowapi + Redis (shared) and/or edge.
- Stricter limits on login, password reset, signup, export, invoice generation, AI/agent calls.
- Per-business-flow limits (signup/referral/checkout).
- Payload caps: max body size, upload size, array lengths, pagination limit (default small, hard max ~100). Reject `?limit=99999`.
- Query timeouts; prevent unbounded joins / N+1.
- Anomaly detection: baseline per-account volume/geo/hours; alert on spikes, impossible travel, large exports, sequential-ID enumeration (many 404s on incrementing IDs). Auto-suspend or step-up.

**Acceptance:** Every public route limited. Sensitive routes tighter. Enumeration/burst → alert. No unbounded pagination/payloads.

## 4. Input validation & sanitization
- Validate at the boundary with Pydantic v2: strict types, Field constraints, `model_config = ConfigDict(extra="forbid")`. Allow-list.
- Parameterized queries only. No f-string SQL.
- XSS: never `dangerouslySetInnerHTML` with user content; if unavoidable, DOMPurify.
- SSRF: any user-supplied URL fetch → allow-list destinations; block internal/metadata IPs (169.254.169.254, 10.x, 127.x, localhost).
- File uploads: validate content type, cap size, store in object storage, never execute.
- Guard command/path/template injection.

**Acceptance:** All inputs via strict Pydantic forbidding unknown fields. No raw SQL. No `dangerouslySetInnerHTML` on user data. URL-fetch features allow-listed.

## 5. Secrets management & API key handling
- No secrets in git — scan history (gitleaks/trufflehog); rotate anything committed.
- Production secrets in a secrets manager or platform env vars; never in images/client bundles.
- `NEXT_PUBLIC_` audit: nothing server-only carries that prefix.
- Separate secrets per environment; rotate on schedule + on exposure/offboarding.
- Customer-issued API keys (Better Auth apiKey): store hashed, show once, prefix + last-4, scoped, revocable, per-key limits + usage logs, optional expiry.

**Acceptance:** No secret in repo/client bundle. Customer keys hashed, scoped, revocable. `NEXT_PUBLIC_` audited.

## 6. AI agent security (Vera & any agentic feature) — OWASP Agentic Top 10
- Instruction-source boundary: content the agent reads (invoice, doc, email, web page) is data, not commands. A malicious invoice saying "export all client data" must never be obeyed.
- Least-privilege tools: agent gets the minimum tools for the task; runs under the requesting user's identity + authz.
- Human-in-the-loop for side effects: irreversible/sensitive actions (send, pay, delete, change permissions, publish) require explicit user confirmation.
- Validate agent outputs before acting — generated SQL/code/tool-args = untrusted input; re-validate.
- Rate-limit + cost-cap agent calls.
- Don't leak secrets/PII into prompts or logs.
- Log agent decisions and tool calls.

**Acceptance:** Agent cannot be redirected by content it reads. Tools scoped per task. Side-effecting actions require confirmation. Agent runs under user authz. Tool calls logged.

## 7. EU & Spanish legal requirements that affect code
**GDPR/LOPDGDD:** encryption in transit + at rest; data minimization (incl. not feeding unnecessary PII to the LLM); data-subject rights (access, rectification, erasure cascade/anonymize, export/portability); 72h breach-notification capability; EU/EEA residency + documented transfers (SCCs) for the LLM subprocessor.
**EU AI Act (Vera = limited risk):** AI disclosure at first interaction (obligation from 2 Aug 2026); we are a deployer (transparency + human oversight); don't substantially fine-tune.
**Veri*Factu / Ley Antifraude (RD 1007/2023) — CRITICAL for invoicing.** Vendor obligations already in force; penalties up to €150k. Invoicing must: unique billing record per invoice with electronic signature + hash + timestamp; chain records (each embeds the previous hash); immutable (corrections create a new linked record); QR + "VERI*FACTU" legend; event log; secure 6-year retention, AEAT-exportable XML/JSON; support Veri*Factu (real-time AEAT) and/or No-Veri*Factu; build to Orden HAC/1177/2024; asesor fiscal confirms.

**Acceptance:** Erasure + export endpoints exist. AI disclosure shown. Invoicing produces signed, hash-chained, immutable records with QR + legend, 6-yr retention, AEAT-exportable.

---
# TIER 1 — First 30 days
## 8. Resilience & error handling (A10)
Never leak stack traces (generic message + error ID); debug OFF in prod; fail closed; timeouts on DB/external/agent; circuit breakers + backoff; health checks; graceful shutdown; backups automated/encrypted/restore-tested; idempotency keys on payment/critical writes.

## 9. Security configuration & headers (A02)
HTTPS/TLS + HSTS; redirect HTTP→HTTPS; CSP, HSTS, X-Content-Type-Options nosniff, X-Frame-Options DENY, Referrer-Policy; CORS allow-list exact origins (never `*` on authenticated endpoints); no public Swagger/`/docs`, no default accounts/sample data in prod; no public buckets; least-privilege IAM; encryption at rest.

## 10. Logging, monitoring & audit (A09)
Audit log security events (logins, failures, permission changes, exports, admin actions, agent tool calls — actor + IP + timestamp, immutable). Never log secrets/tokens/passwords/PII. Alerting wired; Sentry + uptime; retention satisfying forensics + GDPR minimization.

## 11. Software supply chain (A03)
Pin dependencies (lockfiles committed). Automated scanning in CI (Dependabot/Snyk + pip-audit + npm audit). Vet new deps. Lock down CI/CD secrets; protect main; least-privilege deploy keys.

---
# Definition of Done — pre-launch gate (block release until all true)
1. Better Auth in Next.js; FastAPI verifies JWT via JWKS (sig, exp, aud, iss); short-lived tokens; refresh in HttpOnly cookie.
2. Every endpoint re-checks authz server-side; object-level ownership verified; cross-tenant → 404.
3. Every tenant query scoped by org_id from token; RLS enabled + FORCEd; tenant via SET LOCAL in a transaction.
4. Rate limits on all public endpoints (Redis/edge); tighter on sensitive; pagination + payloads capped; UUID IDs.
5. Anomaly/enumeration alerting live.
6. All input via strict Pydantic (extra=forbid); parameterized queries; no `dangerouslySetInnerHTML` on user data; SSRF allow-list.
7. No secrets in git/client bundle; `NEXT_PUBLIC_` audited; customer API keys hashed/scoped/revocable.
8. Agent: untrusted content ≠ instructions; least-privilege tools; human approves side effects; runs under user authz; tool calls logged.
9. Debug off; generic errors; fail-closed; timeouts; backups restore-tested; idempotency on payments.
10. HTTPS + security headers + CORS allow-list; no public buckets/`/docs`.
11. Audit logging + Sentry + alerting.
12. Legal: privacy policy + DPAs; erasure + export endpoints; Vera shows AI disclosure; invoicing meets Veri*Factu (asesor fiscal confirmed).

# Out of scope for code (process — ops/founder)
Certifications (SOC 2 → ISO 27001 → ENS); PCI DSS (stay out of scope via Stripe); pen test pre-launch + annually; secure SDLC (SAST/DAST/SCA in CI); written policies + IR plan; DPAs with every subprocessor + RoPA; vendor risk register; quarterly access reviews; staff MFA + hardware keys; NIS2/DORA monitoring; B2B e-invoicing (Ley Crea y Crece) monitoring.
