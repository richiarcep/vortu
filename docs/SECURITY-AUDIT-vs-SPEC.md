# Vela — Security Audit vs SECURITY-SPEC (gap analysis)

**Date:** 2026-06-25 · **Method:** 11 parallel section audits vs [SECURITY-SPEC.md](SECURITY-SPEC.md), each blocker/high-fail adversarially verified. (The current code uses FastAPI HS256 JWT + bcrypt + localStorage + SQLite + in-memory rate limits + `company_id` app-scoping; the spec targets Better Auth + JWKS + HttpOnly cookies + Postgres RLS + UUIDs + Redis + Veri*Factu.)

> Effort tags: **QUICK** (localized) · **MEDIUM** (multi-file / needs care) · **LARGE** (multi-phase project, may need infra/legal).

## Section status

| § | Section | Overall | Blockers | Highs |
|---|---------|---------|----------|-------|
| §1 | Authentication & token security | fail | 2 | 4 |
| §2 | Authorization, multi-tenant isolation, RLS, BOLA/BFLA/BOPLA | partial | 2 | 0 |
| §3 | Rate limiting & abuse/anomaly | fail | 1 | 6 |
| §4 | Input validation & sanitization (XSS/SSRF/injection) | partial | 0 | 1 |
| §5 | Secrets & API key handling | partial | 0 | 1 |
| §6 | AI agent (Vera) security — OWASP Agentic | partial | 0 | 4 |
| §7 | EU/Spanish legal-affecting code (GDPR, AI Act, Veri*Factu) | fail | 6 | 5 |
| §8 | Resilience & error handling | partial | 0 | 2 |
| §9 | Security config & headers | partial | 0 | 3 |
| §10 | Logging, monitoring & audit | fail | 2 | 6 |
| §11 | Software supply chain (A03) | partial | 0 | 2 |

## Findings (confirmed blockers + highs)

### §1 Authentication & token security

- **[BLOCKER · LARGE]** Rotating, revocable refresh tokens  
  - *Gap:* There is no refresh token at all, hence no rotation and no revocation. Combined with the 24h access token and client-only logout, a compromised token cannot be invalidated server-side before natural expiry.  
  - *Evidence:* `No refresh endpoint or refresh_token issuance in backend/api/auth.py or core/security.py (grep for /refresh/refresh_token in api/core returns only unrelated Goo`  
  - *Fix:* Issue an opaque, hashed, DB-stored refresh token (with jti, user_id, expiry, revoked flag) returned alongside the access token; add POST /api/auth/refresh that rotates it (revoke old, issue new) and POST /api/auth/logout that revokes it. Add a jti/denylist check (or short access TTL + refresh revocation) so logout/compromise invalidates sessions.
- **[BLOCKER · LARGE]** Refresh token in HttpOnly + Secure + SameSite cookie (not localStorage)  
  - *Gap:* No refresh token exists and the access token is in localStorage, which is readable by any XSS-injected script (no HttpOnly protection). This is the worst-case storage for a 24h token. SameSite/Secure cookie flags are moot because no auth cookie is set.  
  - *Evidence:* `frontend/lib/api.js:10-21 stores the JWT in localStorage ('vela_token') and reads it for the Authorization header (api.js:30-34); backend never issues a Set-Coo`  
  - *Fix:* Once refresh tokens exist, set them via Set-Cookie with HttpOnly, Secure, SameSite=Strict/Lax, Path=/api/auth/refresh. Keep the short-lived access token in memory (JS variable) rather than localStorage. Requires CORS credentials:'include' and a CSRF mitigation (SameSite covers most cases).
- **[HIGH · LARGE]** Short-lived access tokens (5-15 min)  
  - *Gap:* Access tokens live 24h, ~96x the 15-min ceiling. With no revocation (see below), a stolen/leaked token is valid for a full day. The only 5-min token is the 2FA temp token (auth.py:143).  
  - *Evidence:* `backend/core/config.py:26 (ACCESS_TOKEN_EXPIRE_MINUTES=1440 = 24h); applied via security.py:32; full session token minted at api/auth.py:150 and api/two_factor.`  
  - *Fix:* Set ACCESS_TOKEN_EXPIRE_MINUTES to 15 and introduce a refresh-token flow (next criterion) so sessions survive without a long-lived access token. Until refresh exists, dropping to 15 min alone would force re-login every 15 min, so land this together with refresh tokens.
- **[HIGH · LARGE]** Argon2id password hashing  
  - *Gap:* Passwords are hashed with bcrypt, not Argon2id. bcrypt with a default cost is a reasonable hash (this is a partial mitigation, not a plaintext/MD5 disaster), but it misses the Argon2id acceptance criterion and bcrypt's gensalt() here uses the library-default cost (12) without an explicit, tunable work factor.  
  - *Evidence:* `backend/core/security.py:16-25 uses raw bcrypt (bcrypt.gensalt()/hashpw/checkpw); requirements.txt:4 bcrypt==5.0.0; passlib==1.7.4 present (requirements.txt:12)`  
  - *Fix:* Switch to argon2-cffi (or passlib's argon2 with a CryptContext) using Argon2id; provide a verify-and-rehash path so existing bcrypt hashes are upgraded on next successful login. At minimum, pin an explicit bcrypt cost factor if Argon2id adoption is deferred.
- **[HIGH · MEDIUM]** MFA for sensitive actions  
  - *Gap:* MFA exists but is (1) fully opt-in — most users have totp_enabled=False so login needs only a password; (2) skipped for 15 days after one verification (auth.py:133-137); (3) gates only login, NOT individual sensitive actions (no step-up MFA on e.g. fiscal/billing/admin mutations). Also the 2FA temp token sets a requires_2fa:True claim (auth.py:143) that verify-login never checks (two_factor.py:108-143), so a full-session token is also accepted at the 2FA exchange — the temp-token scoping is cosmetic.  
  - *Evidence:* `TOTP implemented in api/two_factor.py:27-153 (pyotp, setup/verify/disable/verify-login); login enforces 2FA only if totp_enabled at api/auth.py:130-144`  
  - *Fix:* For Tier-0 sensitive operations (super-admin cross-tenant SQL, fiscal export, billing/plan changes, password/email change) require a fresh TOTP step-up. Enforce MFA enrollment for admin/superadmin accounts. In verify-login, reject tokens lacking requires_2fa (and ideally a distinct aud) so the temp token cannot be substituted. Reconsider the 15-day skip for high-privilege users.
- **[HIGH · LARGE]** Brute-force / credential-stuffing protection  
  - *Gap:* Mitigation exists but is per-process and per-IP only: (1) state is lost on restart and not shared across workers/instances (rate_limit.py:1-8 acknowledges this), so a multi-worker deploy multiplies the effective limit; (2) no per-account throttling or lockout (grep for failed_login/lockout returns nothing), so credential stuffing across many IPs against one account is unthrottled; (3) X-Forwarded-For is trusted blindly (rate_limit.py:22-25) and is client-spoofable unless a trusted proxy strips it, letting an attacker rotate the rate-limit key per request; (4) no CAPTCHA / breached-password / anomaly detection.  
  - *Evidence:* `backend/core/rate_limit.py:29-55 in-memory per-IP sliding window; applied to login (api/auth.py:102, 8/60s), 2FA verify (two_factor.py:64), verify-login (two_fa`  
  - *Fix:* Back the limiter with Redis for a shared sliding window; add a per-account failed-attempt counter with exponential backoff/temporary lockout; only honor X-Forwarded-For from a configured trusted-proxy list (else use request.client.host); add login throttling keyed on (account, IP) and consider a breached-password (HaveIBeenPwned k-anon) check at registration/login.

### §2 Authorization, multi-tenant isolation, RLS, BOLA/BFLA/BOPLA

- **[BLOCKER · LARGE]** Postgres Row-Level Security ENABLEd and FORCEd on tenant tables  
  - *Gap:* There is NO database-level tenant isolation. All multi-tenant safety rests entirely on hand-written app-level company_id filters (the BOLA mitigation above). A single forgotten WHERE company_id clause — or a SQL-injection in a raw text() query, or the Vera Network text-to-SQL bypass — would expose all tenants' data with nothing behind it. This is the central structural gap of the section.  
  - *Evidence:* `No RLS anywhere: grep for 'ENABLE ROW', 'FORCE ROW', 'row_security' returns nothing across backend/*.py and *.sql. DB is SQLite today (core/database.py:7 _is_sq`  
  - *Fix:* On the planned Postgres migration: add company_id to every tenant table, ENABLE ROW LEVEL SECURITY and ALTER TABLE ... FORCE ROW LEVEL SECURITY, define a USING/WITH CHECK policy keyed on current_setting('app.company_id'), and set it per-request (next item). Until Postgres lands, treat app-level scoping as the sole control and add automated tests asserting cross-tenant 404s on every id route.
- **[BLOCKER · LARGE]** Tenant context propagated via SET LOCAL inside the request transaction (so RLS sees the tenant)  
  - *Gap:* No mechanism exists to hand the tenant id to the database, because there is no RLS to consume it (dependent on the RLS finding). On SQLite this is N/A; on the planned Postgres it is missing and required for RLS to function.  
  - *Evidence:* `core/database.py:40-50 get_db yields a plain SessionLocal() with no per-request SET LOCAL / set_config of any app.tenant variable; grep for 'SET LOCAL'/'set_con`  
  - *Fix:* In get_db (or a dedicated dependency that runs after auth), open the transaction and execute SET LOCAL app.company_id = :cid (set_config('app.company_id', ..., true)) using the company_id from the authenticated user, so FORCE'd RLS policies filter automatically. Ensure it is SET LOCAL (transaction-scoped) to avoid leakage across pooled connections.

### §3 Rate limiting & abuse/anomaly

- **[BLOCKER · LARGE]** Rate limit EVERY public endpoint, per-user AND per-IP, via a shared store (Redis)  
  - *Gap:* The vast majority of authenticated endpoints (all of sales/costes/accounting/hr/documentos/fiscal/admin/billing/projects/customers/marketing CRUD) have NO rate limit. The limiter is IP-only (no per-user dimension, so a logged-in attacker rotating behind a NAT/proxy or sharing an IP is conflated, and a single user behind one IP can't be throttled independently) and in-memory per-process: with >1 uvicorn/gunicorn worker the window is divided per worker, so effective limits are N× looser and reset on deploy. X-Forwarded-For is trusted blindly (rate_limit.py:23-25), so the IP key is spoofable when not strictly behind a trusted proxy that overwrites it.  
  - *Evidence:* `core/rate_limit.py:17 (_WINDOWS is an in-process dict, not shared/Redis); core/rate_limit.py:36-37 keys only on 'scope:client_ip' (IP-only, never per-user); onl`  
  - *Fix:* Adopt a shared-store limiter (slowapi+Redis, or fastapi-limiter) applied as a global default dependency/middleware on the app so every route is covered by default, then tighten specific flows. Key on BOTH the authenticated user/company_id AND the real client IP. Only trust X-Forwarded-For when behind a known proxy (configure trusted-proxy count / use the platform's real-IP header). When Postgres replaces SQLite this becomes mandatory for multi-worker correctness.
- **[HIGH · MEDIUM]** Query timeouts  
  - *Gap:* No per-query execution timeout on any path. SQLite busy_timeout only governs lock contention, not a long-running scan. The super-admin text-to-SQL (network_engine) is the worst case: a cross-tenant Cartesian/unindexed query can run unbounded and fully materialize before truncation, exhausting CPU/memory. PRAGMA query_only (network_engine.py:113) prevents writes but not runaway reads.  
  - *Evidence:* `core/database.py:12,31 set only SQLite connect timeout=30 and PRAGMA busy_timeout=5000 (lock-wait, NOT statement-execution timeout). No statement_timeout anywhe`  
  - *Fix:* Set a statement timeout (Postgres statement_timeout per connection/role; for SQLite use a sqlite3 progress handler / set_progress_handler to abort long queries). In network_engine, stream with .fetchmany / yield_per and a hard row+time cap instead of fetchall(), and inject a server-enforced LIMIT into the generated SQL.
- **[HIGH · LARGE]** Anomaly detection (enumeration / many-404s / large exports / impossible travel) with alerting  
  - *Gap:* Zero detection of resource enumeration (sequential integer IDs make this easy — IDs are auto-increment, not UUIDs), 404 storms, abnormally large exports, or impossible-travel logins, and no alerting pipeline. There is no security audit log for auth events, exports, or cross-tenant access beyond the single super-admin SQL log.  
  - *Evidence:* `No anomaly detection or alerting exists. grep for anomaly/enumeration/impossible-travel/suspicious returns nothing. The only audit trail is the super-admin netw`  
  - *Fix:* Add a structured security audit log (auth success/failure, exports, admin/cross-tenant reads, 404 bursts) and a detector that flags enumeration (many distinct-ID 404s/IDORs per principal), oversized exports, and geo/velocity anomalies on login, emitting alerts (Sentry/Slack/PagerDuty). Switching IDs to UUIDs would also raise the bar against enumeration.
- **[HIGH · QUICK]** Tighter limits on login / password-reset / signup  
  - *Gap:* Signup (/register) is completely unthrottled — enables automated account/company creation, email-enumeration via the 'Email already registered' 400 (auth.py:51-55), and resource exhaustion (each register seeds a full chart of accounts, auth.py:82-85). No password reset exists, so that criterion is unimplemented (an unthrottled reset would later be a vector). Login limit is IP-only, so it does not stop credential-stuffing that spreads one attempt across many accounts from rotating IPs, nor per-account lockout.  
  - *Evidence:* `Login limited 8/60s (api/auth.py:102); 2FA verify-login 6/60s (api/two_factor.py:108). BUT /register has NO rate limit (api/auth.py:46) and there is NO password`  
  - *Fix:* Add a strict per-IP + per-email rate limit to /register (e.g. 3–5/hour/IP) and make the 'already registered' response non-enumerating (generic success/202 + email). When a reset flow is built, rate-limit it per-IP and per-target-account and use constant-time, generic responses.
- **[HIGH · MEDIUM]** Tighter limits on export / invoice / AI endpoints  
  - *Gap:* AI chat is throttled (good), but invoice issuance and every document/PDF/report export endpoint is unthrottled. An attacker (or buggy client) can hammer /dte/emitir to mass-issue fiscal documents, or loop expensive PDF/report generation and exports to exhaust CPU/IO and exfiltrate data at speed. There are also no per-business-flow caps (e.g. max invoices/min).  
  - *Evidence:* `AI is covered: vera chat 20/60s (vera/router.py:33,57, api/vera_v2.py:420,515, api/agent.py:51). Invoice emission api/fiscal.py:184 (/dte/emitir) has NO rate li`  
  - *Fix:* Add dedicated rate_limit dependencies to /dte/emitir and all export/download routes (e.g. invoices 30/min, heavy exports 10/min) keyed per-user+IP, plus a per-company business-flow ceiling on invoice issuance.
- **[HIGH · MEDIUM]** Payload caps: pagination hard-max (~100), reject limit=99999  
  - *Gap:* Almost no list endpoint caps the client-supplied limit. A caller can pass ?limit=99999 to sales /historial, /devoluciones, vera-network and others to pull entire tables in one query (DoS + bulk exfiltration). costes.py allows up to 500, above the ~100 target. No global default-pagination guard.  
  - *Evidence:* `Only api/costes.py:266 enforces a cap: limit:int = Query(100, le=500). Most list endpoints accept an UNBOUNDED limit: api/sales.py:722,738 (limit:int=50, no le)`  
  - *Fix:* Wrap all pagination params with Query(default, ge=1, le=100) (or a shared dependency that clamps), reject/cap oversized limit values app-wide, and remove the 500 ceiling on costes down to ~100.
- **[HIGH · QUICK]** Payload caps: body size / upload size / array length  
  - *Gap:* Upload byte caps are good but uneven — enforce_upload_size (core/files.py:23) relies on the spoofable multipart 'size'/Content-Length and only some routes also check len(read). There is NO cap on JSON request body size and NO max-length on inbound arrays (e.g. a sale with millions of line items, or huge AI message payloads), allowing memory-exhaustion DoS.  
  - *Evidence:* `Upload caps present at 20 MB: core/files.py:14 (MAX_UPLOAD_MB=20), enforced on actual bytes in api/documentos.py:650 and api/accounting.py:251, and via enforce_`  
  - *Fix:* Add a global request-body-size limit (ASGI middleware or reverse-proxy client_max_body_size) and bound every read; add Pydantic Field(max_length=...) / max_items on list inputs (sale items, batch arrays, chat history). Make every upload route check the real read length, not just the reported size.

### §4 Input validation & sanitization (XSS/SSRF/injection)

- **[HIGH · QUICK]** Strict Pydantic v2 with extra="forbid" + Field constraints (allow-list) on request bodies  
  - *Gap:* Pydantic v2 defaults to extra="ignore", so no model rejects unexpected fields, and almost no field has allow-list/length/range/pattern validators. Overlong strings, out-of-range numbers, and junk payloads are accepted and persisted. Mitigating: because extra keys are *dropped* (not forwarded), the dynamic SET/INSERT clauses built from `.dict()` keys (fiscal.py:73, vera_routing_admin.py:145/216, vera_v2.py:377) cannot be poisoned with attacker-chosen column names — column-name injection is NOT reachable. So this is a hardening/data-integrity gap, not an active injection hole.  
  - *Evidence:* `backend/api/fiscal.py:20 (ConfigFiscalBase — all Optional[str], no constraints, no model_config); backend/api/upload.py:36 and backend/api/auth.py:40 still use `  
  - *Fix:* Add a shared base: `class Strict(BaseModel): model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, str_max_length=...)` and have request models inherit it. Add Field constraints per field (max_length on strings, ge/le on numerics, pattern/Literal on enums like ambiente, serie_dte, country codes). Migrate the two legacy `class Config` blocks to model_config.

### §5 Secrets & API key handling

- **[HIGH · QUICK]** Per-environment separation + secret rotation  
  - *Gap:* (1) Rotating SECRET_KEY invalidates all 24h HS256 tokens AND makes every Fernet-encrypted fiscal secret undecryptable — encryption key is not separable from the JWT key, so there is no safe rotation path. (2) No key-versioning/keyring. (3) No documented rotation procedure.  
  - *Evidence:* `Per-env separation exists: separate dev (backend/.env.example, sqlite) vs prod (.env.production.example, Postgres+sslmode=require) templates; DEBUG defaults Fal`  
  - *Fix:* Introduce a dedicated FERNET_KEY (or a versioned keyring) independent of SECRET_KEY so encryption and JWT-signing keys rotate separately; support decrypt-with-old / encrypt-with-new during a rotation window. Document a rotation runbook per environment.

### §6 AI agent (Vera) security — OWASP Agentic

- **[HIGH · MEDIUM]** Rate-limit + cost-cap on agent usage  
  - *Gap:* The single most powerful and most expensive agent — the cross-tenant network agent running Opus with a 6-iteration tool-use loop (network_engine.py:262) — has NEITHER a rate limit NOR a cost cap. cost_usd is computed and stored for reporting (:320,:338) but never enforced: a super-admin (or a stolen super-admin token, given 24h non-revocable JWTs) can run unbounded Opus loops across all tenants. lab_compare fans out to up to 4 providers per call (:658) with no throttle. Customer-facing paths and the extraction pipeline ARE covered (mitigating), so this is scoped to the admin network agent.  
  - *Evidence:* `backend/api/vera_network.py:62-67 (POST /chat has NO rate_limit dependency) and :218-227 (POST /lab also none — 'NO rate_limit anywhere in vera_network.py'); co`  
  - *Fix:* Add rate_limit(...) dependencies to /chat and /lab in vera_network.py (e.g. tighter per-super-admin limits), and add a hard per-session and per-day USD/token cost ceiling in network_chat that aborts the tool loop when exceeded (the cost is already computed; just enforce it). Cap max iterations cost, not just count.
- **[HIGH · QUICK]** Instruction-source boundary: content the agent reads is treated as data, not commands (prompt-injection resistance, esp. document/extraction → SQL and network_engine text-to-SQL)  
  - *Gap:* No defensive instruction/data boundary exists in either LLM path. In network_engine the model FREELY composes SQL (text-to-SQL) and the only guard is a regex + PRAGMA, so an injected instruction in any tenant's data the agent reads (e.g. a malicious value in cost_entries.notes, a document, or a prior Vera conversation surfaced via search_semantic) can steer the model's next query. In the extraction path, untrusted document content is concatenated straight into the prompt with no delimiting, escaping, or 'treat the following strictly as data / ignore embedded instructions' framing. MITIGATING: the extraction output is constrained to a JSON schema and never becomes raw SQL — execute_sql_action only branches on a 3-table whitelist and uses parameterized INSERTs (documentos.py:558-568), so an injection there cannot produce arbitrary SQL, only wrong field values (which the human-in-the-loop /confirm step should catch). Customer Vera (engine.py / vera_v2.py) exposes NO tools and emits only text, so it has no injection→action path at all.  
  - *Evidence:* `backend/vera/network_engine.py:34-40 (is_safe_select regex), :219-313 (tool-use loop feeds tool_result back to the same model); backend/vera/extraction/cheap_ex`  
  - *Fix:* 1) network_engine: wrap all tool_result content and search_semantic hits in explicit delimiters with a system instruction that data returned by tools is untrusted and must never be interpreted as commands; prefer a constrained query builder or column/table allowlist over free text-to-SQL. 2) extraction: wrap {content} in clear data fences (e.g. <<<DOCUMENT_DATA ... DOCUMENT_DATA>>>) and add a line instructing the model to ignore any instructions found inside the document; this is cheap and closes the residual mis-extraction-by-injection risk.
- **[HIGH · LARGE]** Least-privilege tools running under the requesting user's identity + authz (not a god service account); cross-tenant network_engine is super-admin only  
  - *Gap:* Two-tier reality: customer Vera is correctly least-privilege at the APP layer (every query is company_id-scoped — mitigating control), but the network agent is by design a god read-all-tenants tool. It is gated to super-admins (good), yet it does NOT run under the requesting user's DB identity/authz: there is no Postgres RLS (SQLite today) and the tool executes on the app's single DB connection, so the ONLY thing between the LLM and every tenant's data is the is_safe_select regex + PRAGMA query_only + the super-admin gate. There is no per-tool scoping (e.g. the agent could SELECT users.hashed_password or any column). lab_compare also reads provider api_key_value straight from vera_models_config (network_engine.py:662-672), i.e. the tool has access to secret material.  
  - *Evidence:* `backend/api/vera_network.py:19-28 (require_superadmin gates every network endpoint incl. /chat, /lab, /audit); backend/vera/network_engine.py:102-179 (execute_t`  
  - *Fix:* Keep the super-admin gate (correct). Add a column/table denylist for the network agent (exclude users.hashed_password, 2FA secrets, fiscal/crypto columns, api_key_value) enforced before execution, not just by prompt. When Postgres lands, run the agent's queries under a dedicated read-only role with RLS/grants rather than the app role. Treat the regex as advisory and keep PRAGMA query_only / a read-only connection as the real backstop (already present — good).
- **[HIGH · MEDIUM]** Validate agent-generated SQL / tool-args before acting  
  - *Gap:* Validation is real but shallow for the text-to-SQL path: is_safe_select is a regex, not a SQL parser — it can be fooled (e.g. SELECT that calls a write via a side-effecting function, comment tricks, or multi-statement payloads), and it blocks PRAGMA by keyword yet the executor itself issues PRAGMA query_only. The genuine backstop is PRAGMA query_only / read-only intent, which holds for SQLite but is a different mechanism on Postgres (must be re-established with a read-only role + autocommit-off). No row/column-count or timeout limit is applied beyond a 200-row fetch slice (:120) and a 6-iteration loop (:262). Extraction tool-args are well validated (whitelist + parameterized).  
  - *Evidence:* `backend/vera/network_engine.py:34-40 (FORBIDDEN_SQL regex + first-word SELECT/WITH check), :110-118 (PRAGMA query_only=ON around execution), :142 (describe_tabl`  
  - *Fix:* Replace is_safe_select's regex with a real parse (e.g. sqlglot) that asserts a single read-only statement and rejects multiple statements / DDL / unknown functions; add a statement timeout and a hard row cap at the DB driver level. On Postgres, execute via a read-only role in a read-only transaction. Keep the table/column allowlist from the least-privilege fix as the primary gate.

### §7 EU/Spanish legal-affecting code (GDPR, AI Act, Veri*Factu)

- **[BLOCKER · MEDIUM]** GDPR Art.17 — Erasure (cascade delete / anonymize, right to be forgotten)  
  - *Gap:* There is no way to erase or anonymize a data subject. 'Deletion' only flips a status flag, so name/email/fiscal data persist indefinitely. No cascade across related tables (sales, documents, payslips, dte_emitidos, Vera audit logs). This is a direct Art.17 non-compliance.  
  - *Evidence:* `All deletes are soft-deletes that RETAIN PII: api/billing.py:257-264 sets TeamMember.status='removed' (row + email kept); api/hr.py:212-230 deactivate_employee `  
  - *Fix:* Implement DELETE /api/me/erase and admin erase-employee/erase-customer that either hard-delete or pseudonymize PII columns (name→'[deleted]', email→hashed token, free-text PII nulled) across ALL tables referencing the subject, while preserving legally-required fiscal records in anonymized form. Wrap in a transaction, scope by company_id, write an erasure audit entry. Note the legal tension: fiscal/invoice records have a retention duty, so erasure must anonymize rather than delete those.
- **[BLOCKER · LARGE]** Veri*Factu — per-invoice signed + hashed + timestamped record  
  - *Gap:* No Registro de Facturación record is generated per invoice. No SHA-256 hash, no XAdES/qualified signature, no Veri*Factu-format timestamp. Entirely the wrong jurisdiction (SV, simulated).  
  - *Evidence:* `Spanish invoicing is not implemented. country/es/ contains only AEAT tax-declaration models (fiscal_models.py:6-79: 303/130/390/...), no invoicing-record genera`  
  - *Fix:* Build an ES invoicing module that, on each invoice, generates a registro de facturación with the AEAT-specified fields, computes the prescribed hash, signs it (qualified cert already uploadable via api/fiscal.py:116), and timestamps it. This is a full build, not a patch.
- **[BLOCKER · LARGE]** Veri*Factu — hash-chaining (each record embeds previous record's hash)  
  - *Gap:* No tamper-evident chain. Records are independent rows in SQLite with no linkage to the prior record's hash, so deletion/reordering is undetectable — the core Veri*Factu anti-fraud mechanism is absent.  
  - *Evidence:* `dte_emitidos INSERT at api/fiscal.py:213-236 has no prev_hash / encadenamiento column or logic; numbering is a simple counter (siguiente_numero at :208, 239). g`  
  - *Fix:* Add hash-chaining: each new registro stores huella = hash(canonical_fields + huella_anterior). Persist huella_anterior, enforce ordering, and verify the chain on read/export.
- **[BLOCKER · LARGE]** Veri*Factu — immutability (corrections = new linked record, no edits/deletes)  
  - *Gap:* Issued fiscal records can be silently updated or deleted; corrections are not modeled as new linked rectifying records. Violates the inalterability requirement.  
  - *Evidence:* `No immutability: api/fiscal.py:239 UPDATEs config_fiscal in place, and dte_emitidos has no DB triggers / append-only enforcement (grep for TRIGGER/immutable on `  
  - *Fix:* Make the registro table append-only (DB triggers blocking UPDATE/DELETE, or move to Postgres with revoked UPDATE/DELETE grants), and model corrections as new facturas rectificativas that reference the original record id.
- **[BLOCKER · LARGE]** Veri*Factu — QR code + 'VERI*FACTU' legend on invoice  
  - *Gap:* No fiscal QR linking to the AEAT cotejo URL and no mandatory 'VERI*FACTU' / 'Factura verificable en la sede de la AEAT' legend on issued invoices.  
  - *Evidence:* `The only QR is a NaviLens-style decorative PRODUCT QR: modules/sales/qr_generator.py:100 generate_vela_qr_svg encodes a SHA-256 visual of a product code (NX-xxx`  
  - *Fix:* Generate the AEAT-spec invoice QR (tributary URL with NIF, número, fecha, importe params) and render the 'VERI*FACTU' legend on the invoice PDF. Do not reuse the product-label QR generator.
- **[BLOCKER · LARGE]** Veri*Factu — AEAT XML/JSON export  
  - *Gap:* No capability to produce the AEAT-format XML/JSON submission or remision of the registros de facturación; the integration that exists targets El Salvador's Hacienda, not the AEAT.  
  - *Evidence:* `No AEAT export of invoicing records exists (grep for aeat-export/libro-registro/registro-facturacion XML/JSON returns 0 relevant hits; the api/fiscal.py 'produc`  
  - *Fix:* Implement the AEAT Veri*Factu XML/JSON serialization and the remission/export endpoint per the official schema, replacing the SV DTE pathway for ES companies.
- **[HIGH · MEDIUM]** GDPR Art.15 — Right of access / data export (portability, Art.20)  
  - *Gap:* No data-subject access/portability endpoint exists. A data subject (user, employee, customer) cannot obtain a machine-readable copy of all personal data held about them (user profile, employees in hr.py, customers in customers.py, payslips/contracts written by api/documentos.py, Vera chat logs in vera/network_engine.py:326 audit table).  
  - *Evidence:* `backend/api/auth.py:46-181 (only register/login/me/set-country); no export endpoint anywhere — grep for export/portability/data-subject across backend/ returns `  
  - *Fix:* Add an authenticated GET /api/me/export (and an admin equivalent for employees/customers) that aggregates all PII rows keyed to the subject across users/employees/customers/documents/dte_emitidos/vera audit logs and returns JSON (and ideally CSV). Scope strictly by company_id + subject id. Log the request in an audit table.
- **[HIGH · MEDIUM]** Data minimization to the LLM (PII stripping before model calls)  
  - *Gap:* Customer/employee/company PII flows verbatim into third-party LLM providers (vera/llm_claude.py, llm_openai.py, llm_gemini.py, llm_perplexity.py) with no minimization or pseudonymization, and the network engine can return cross-tenant PII to a super-admin. No DPA/processor controls are visible in code.  
  - *Evidence:* `No redaction/anonymization layer exists — grep for redact/anonymiz/pii/mask across vera/ and api/vera_v2.py returns 0 hits. vera/context.py:22-59 builds LLM con`  
  - *Fix:* Insert a PII-minimization step before any LLM call: strip/pseudonymize names, emails, NIF/NIT, phones, addresses from the context payload (vera/context.py and the extraction prompts), prefer aggregates over raw rows, and gate the cross-tenant network engine behind explicit purpose + audit. Confirm a DPA with each LLM provider and document zero-retention settings.
- **[HIGH · LARGE]** Veri*Factu — event log (registro de eventos)  
  - *Gap:* Missing the mandatory immutable event log capturing system events (record generation, detected anomalies, exports, software restarts) required by the Veri*Factu regulation.  
  - *Evidence:* `No fiscal event log. The only audit-style logging is the Vera network engine query log at vera/network_engine.py:326-334 (unrelated). dte_emitidos stores only s`  
  - *Fix:* Add an append-only fiscal event-log table recording each regulated event with timestamp, type, and integrity hash, also chained.
- **[HIGH · LARGE]** Veri*Factu — 6-year retention of records  
  - *Gap:* No mechanism guarantees fiscal records survive the legally-required retention window; they can be edited or deleted and there is no archival/export-for-retention process.  
  - *Evidence:* `No retention policy or guarantee exists (grep for retention/6-year/archival returns only unrelated install/seed scripts). Records live in a local SQLite file (n`  
  - *Fix:* Define and enforce a retention policy (>=6 years, aligned to the longer commercial/tax obligation), with immutable storage and backups, on the Postgres deployment.
- **[HIGH · MEDIUM]** Encryption at rest  
  - *Gap:* Only a handful of fiscal credential columns are encrypted. The bulk of personal data (employees, customers, payslips, contracts, DTE receptor names/emails in api/fiscal.py:216-231) sits unencrypted in a SQLite file. No column-level encryption for PII and no full-database / volume encryption.  
  - *Evidence:* `core/crypto.py:16-41 provides Fernet (key derived from SECRET_KEY) and is applied to fiscal secrets only: api/fiscal.py:66-69 encrypts api_key/api_secret and :1`  
  - *Fix:* On the Postgres migration, enable storage/volume encryption (or TDE) and consider column-level encryption (pgcrypto / app-level Fernet) for high-sensitivity PII. At minimum ensure the DB file/volume is encrypted at the infra layer and document it as a control.

### §8 Resilience & error handling

- **[HIGH · MEDIUM]** Timeouts on DB / external / agent calls  
  - *Gap:* Several of the hottest agent paths (legacy Vera chat engine.py, the super-admin network agent network_engine.py:254, and the unified ClaudeClient used by vera_v2/extraction) have NO per-request HTTP timeout, so a hung Anthropic socket ties up a worker until gunicorn's 120s hard kill — under load that exhausts the small worker pool. ClaudeClient already has a timeout field that is simply never wired to the SDK.  
  - *Evidence:* `DB: core/database.py:12 SQLite connect timeout=30, :16-20 pool_pre_ping; :31 busy_timeout=5000. External with timeouts: vera/network_engine.py:678,688,717; vera`  
  - *Fix:* Pass Anthropic(api_key=..., timeout=30.0) (or settings-driven) in vera/llm_claude.py:15 using self.timeout, vera/engine.py:67, vera/selector.py:83, vera/network_engine.py:254, and the modules/* Anthropic clients; add timeout= to modules/marketing/platforms.py:31. Standardize a DEFAULT_LLM_TIMEOUT in config.
- **[HIGH · LARGE]** Idempotency keys on payment / critical writes  
  - *Gap:* The two most financially sensitive write paths are unprotected: fiscal DTE emission (duplicate invoices + wasted sequential numbers, hard to reconcile with AEAT/Hacienda later) and outbound Stripe create calls (no Stripe-side idempotency_key, so network retries during checkout/subscription creation can duplicate). Document-extraction inserts (api/documentos.py:559,488) also lack an idempotency guard beyond a filename/content check_duplicate (:321).  
  - *Evidence:* `STRONG where present: Stripe webhook dedupes on stripe_event_id (modules/billing/stripe_service.py:157-159) backed by BillingEvent; sales create (api/sales.py:3`  
  - *Fix:* Add an idempotency_key to DTERequest and a partial UNIQUE index on dte_emitidos(company_id, idempotency_key); return the existing DTE on replay (mirror the sales pattern). Pass idempotency_key=<uuid> to all mutating stripe.*.create calls. Optionally extend idempotency to the documentos write path.

### §9 Security config & headers

- **[HIGH · QUICK]** HTTPS + HSTS enabled; HTTP→HTTPS redirect  
  - *Gap:* HSTS header is emitted by Next.js (good, 2yr + includeSubDomains + preload). But (a) there is NO HTTP→HTTPS redirect anywhere: the FastAPI backend has no Starlette HTTPSRedirectMiddleware and Next has no http→https redirect, so TLS termination + redirect is assumed to live entirely in an unconfigured reverse proxy/ingress (none in repo). (b) The backend API responses carry NO HSTS header at all — only the Next frontend does — so direct API calls over http are not hardened. (c) HSTS is only effective once served over TLS; nothing in the repo provisions/forces TLS.  
  - *Evidence:* `frontend/next.config.ts:47 (Strict-Transport-Security: max-age=63072000; includeSubDomains; preload); backend/main.py has no HTTPSRedirectMiddleware (main.py:13`  
  - *Fix:* Terminate TLS at the edge (Caddy/nginx/ALB) and force-redirect http→https there, OR add Starlette's HTTPSRedirectMiddleware + a TrustedHostMiddleware on the FastAPI app behind a proxy (with ProxyHeadersMiddleware/forwarded-allow). Also emit Strict-Transport-Security from the backend (middleware) so API-only clients get HSTS too. Document the TLS/proxy layer in deploy config (Dockerfile/compose has none).
- **[HIGH · QUICK]** No default accounts / no sample data shipped in prod  
  - *Gap:* No seed/sample DB is committed and seeds do not auto-run on startup, so a clean prod deploy ships with no default account — the mitigating facts. BUT there is a real footgun: the seed scripts create an ADMIN user with a weak, hardcoded, publicly-known credential (demo@modabarcelonesa.es / demo1234, is_admin=1). If any of these scripts (seed_demo.py/seed_v1.py/setup_db.py which calls seed_demo.py at setup_db.py:158) are run against a production database — which is plausible since they're shipped alongside app code and setup_db.py is positioned as the DB bootstrap — a known-credential admin account is created. There is also a populated local nexum.db (38 MB) in the working tree that must never be deployed.  
  - *Evidence:* `backend/seed_demo.py:88-98 creates user demo@modabarcelonesa.es with password 'demo1234' and is_admin=1; seed_v1.py:78-85 same password; test_optimizer.py:11-12`  
  - *Fix:* Make seed scripts refuse to run when ENVIRONMENT=production (or when DATABASE_URL is non-sqlite/non-local) and replace the hardcoded password with a value read from env/generated-and-printed. Keep them out of the deployment image (Dockerignore the seed_*.py + setup_db.py and *.db). Add an explicit deploy check that no demo@modabarcelonesa.es user exists in the prod DB.

### §10 Logging, monitoring & audit

- **[BLOCKER · QUICK]** Audit covers logins and login failures  
  - *Gap:* No security-event record for successful logins, failed logins (the key brute-force/credential-stuffing signal), 2FA challenges/failures, or logins to disabled accounts. last_login is overwritten each time (single value, not a log) and carries no IP. Detection/forensics of account compromise is impossible.  
  - *Evidence:* `api/auth.py:104-151 login() — on success only sets user.last_login (auth.py:126) in the users row; on bad credentials it raises 401 (auth.py:112-116) with no re`  
  - *Fix:* Emit an audit event in login() for both outcomes: {actor=email/user_id, event=login_success|login_failure|account_disabled, ip, user_agent, ts}, and likewise in the 2FA verify path. Record failures even when the user doesn't exist (use the submitted email). Feed these to the immutable sink above and to alerting (e.g. N failures/IP/window).
- **[BLOCKER · MEDIUM]** Error tracking (Sentry) wired  
  - *Gap:* No centralized error tracking. Unhandled exceptions are logged to process stdout only — no aggregation, deduplication, release tagging, or notification. In production with multiple gunicorn workers, errors are scattered across stdout with no searchable store.  
  - *Evidence:* `No Sentry in backend/requirements.txt (no sentry-sdk; deps end at stripe==15.1.0) nor in frontend/package.json (deps: next, react, react-dom, reactflow, rechart`  
  - *Fix:* Add sentry-sdk to backend (FastAPI/Starlette + logging integrations) and @sentry/nextjs to the frontend; init from env DSN, set environment/release, traces sampling, and PII scrubbing (send_default_pii=False, before_send). Wire the existing global exception handler to capture to Sentry before returning the generic 500.
- **[HIGH · MEDIUM]** Immutable audit log of security events (append-only / tamper-evident)  
  - *Gap:* The only audit table is a regular read/write SQLite table any DB-privileged process (or the app's own raw SQL) can UPDATE/DELETE. No hash-chain, no append-only constraint, no separate write-only sink, no off-box shipping. Audit writes are best-effort and silently dropped on error, so absence of a record does not mean the event did not happen.  
  - *Evidence:* `core/database.py:87-103 (vera_network_audit DDL is a plain mutable table, no append-only/WORM, no hash-chaining); written best-effort in vera/network_engine.py:`  
  - *Fix:* Move audit events to an append-only sink: either a dedicated table with revoked UPDATE/DELETE grants for the app DB role plus a per-row prev_hash chain (hash(prev_hash + canonical_row)), or ship to an external WORM store (e.g. CloudWatch/Loki/managed log bucket with object-lock). Make the audit write part of the same transaction as the action (fail closed) rather than try/except-swallow. On Postgres, enforce with a BEFORE UPDATE/DELETE trigger that raises.
- **[HIGH · MEDIUM]** Audit covers data exports  
  - *Gap:* Bulk/document exports of financial, HR (payslips/contracts) and AI-memory data — prime exfiltration vectors and a GDPR data-export concern — are completely untracked. No way to answer 'who exported company X's data and when'.  
  - *Evidence:* `Export endpoints write no audit record: FileResponse PDF exports in api/accounting.py:218, 538, 560, 587; payslip/contract download in api/hr.py:308; AI-memory `  
  - *Fix:* Emit an export audit event (actor, company_id, resource type+id, IP, ts) on each FileResponse/StreamingResponse download endpoint and on the memory TXT download.
- **[HIGH · QUICK]** Each audit event records actor + IP + timestamp  
  - *Gap:* Actor and timestamp are captured, but IP is entirely missing from the audit schema and all writers — failing the explicit 'actor+IP+timestamp' acceptance criterion. Geolocating/correlating suspicious activity is impossible.  
  - *Evidence:* `vera_network_audit schema (core/database.py:87-103) has user_id, user_email, created_at — but NO ip column. None of the writers pass a Request or capture client`  
  - *Fix:* Add an ip (and ideally user_agent) column to the audit table; thread Request into audit writers and capture the first X-Forwarded-For hop (mirroring rate_limit.py logic) so the value is correct behind the reverse proxy. Backfill the helper so every event includes it.
- **[HIGH · QUICK]** Audit covers permission / role / plan changes (admin actions)  
  - *Gap:* Account enable/disable, plan/phase grants, and AI system-prompt edits by admins leave no audit trail with actor+IP+timestamp. There is no is_superadmin grant/revoke audit, and no record of who disabled whom. Coverage is incidental (one feature) rather than systematic.  
  - *Evidence:* `Only the Vera-Plus toggle is audited: api/admin.py:304-322 (update_company_vera_plan) and modules/billing/stripe_service.py:521-538. The genuinely security-rele`  
  - *Fix:* Add an audit_event() helper called from every state-mutating admin endpoint (status, plan, fase, prompt, memory, role/superadmin changes) capturing actor, target, before/after values, IP and ts. Prefer a generic dependency or decorator over per-endpoint inserts so new admin routes are covered by default.
- **[HIGH · QUICK]** Audit covers AI tool calls (actor + action)  
  - *Gap:* The highest-privilege AI path (cross-tenant SQL) is well-instrumented, but AI-initiated writes into a tenant's accounting/HR data (the extraction pipeline) and the main user-facing Vera chat tool calls have no audit trail. AI actions that mutate financial records can't be attributed/reviewed.  
  - *Evidence:* `Super-admin cross-tenant text-to-SQL IS audited including the executed SQL: vera/network_engine.py:323-343 writes question, response_preview, sql_executed, mode`  
  - *Fix:* Audit every AI tool call that reads cross-tenant data or writes business records: in execute_sql_action log {actor, company_id, table, action, doc_id, ts}; add equivalent audit emission to vera/router.py and api/vera_v2.py tool dispatch. Reuse the network_engine pattern but route to the immutable sink.
- **[HIGH · MEDIUM]** Uptime monitoring + alerting wired  
  - *Gap:* The probe endpoint is present and correct, but nothing is watching it and nothing pages anyone. There is no alerting on health failures, error spikes, or security signals (failed logins, cross-tenant SQL anomalies). Outages/attacks would go unnoticed.  
  - *Evidence:* `A real health/readiness probe exists: main.py:191-207 /health pings the DB (SELECT 1) and returns 200/503 — usable by an external monitor. But there is no exter`  
  - *Fix:* Point an external uptime monitor (UptimeRobot/Better Uptime/Grafana Synthetic/cloud LB health check) at /health with alert routing to email/Slack/PagerDuty. Once Sentry is in, configure issue/spike alerts, and add a log-based alert on login-failure rate and on vera_network_audit cross-tenant SQL volume.

### §11 Software supply chain (A03)

- **[HIGH · QUICK]** Automated CVE scanning in CI (pip-audit / npm audit / Dependabot / Snyk)  
  - *Gap:* There is zero automated dependency/CVE scanning. No Dependabot/Renovate config, no Snyk, no pip-audit/npm audit step, no CI pipeline at all. Vulnerable transitive deps would go undetected. Note ecdsa==0.19.2 and python-jose==3.5.0 are present (jose family has had advisories) with no scanner watching them.  
  - *Evidence:* `No .github/ directory exists anywhere in the repo (find for .github returned nothing); no CI workflow yaml exists (only /Users/eduardofuentes/Desktop/vortu/dock`  
  - *Fix:* Add .github/workflows/security.yml running `pip-audit -r backend/requirements.txt` and `npm audit --audit-level=high` (with `npm ci` from frontend/package-lock.json) on PR + a weekly schedule. Add .github/dependabot.yml with two ecosystems (pip on backend/, npm on frontend/) for automated bump PRs. Optionally add Snyk or `osv-scanner`.
- **[HIGH · QUICK]** Branch protection on main  
  - *Gap:* Cannot verify branch protection exists; given the complete absence of any repo governance artifacts (no .github/, no CODEOWNERS, no required-status-checks workflow to require), it is almost certainly unset. Without required PR review + status checks, unreviewed/unscanned code can land on main, undermining every other supply-chain control.  
  - *Evidence:* `Remote is git@github.com:richiarcep/vortu.git (git remote -v). Branch protection is a GitHub server-side setting, not represented in the repo; it cannot be conf`  
  - *Fix:* On GitHub, enable branch protection for main: require PRs + at least 1 approving review, require the new security/CVE-scan status checks to pass, dismiss stale approvals, require linear history, and block force-pushes/deletions. Add a CODEOWNERS file. (Verify with `gh api repos/richiarcep/vortu/branches/main/protection` once gh is available.)
