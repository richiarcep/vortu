# Deploying Vela (all-on-Hetzner)

This deploys the whole app to **one Hetzner server** with Docker Compose, behind
Caddy (automatic HTTPS). The database is **managed Postgres (Neon)** and the graph
is **Neo4j Aura** — neither runs on your server.

```
  Browser ──HTTPS──► Caddy ──┬──► frontend (Next.js)   :3000   (the site)
                             └──► backend  (FastAPI)   :8000   (/api/*, /health)
  backend ──► Neon Postgres (managed)
          └─► Neo4j Aura     (managed, optional)
```

Same-origin routing (`domain.com` for the site, `domain.com/api/*` for the API)
means **there is no CORS to configure**.

---

## One-time setup

### 1. Provision the managed Postgres (Neon)
1. Create a project at neon.tech → copy the connection string.
2. It looks like `postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require`.
   **Change `postgresql://` to `postgresql+psycopg://`** (the app uses the psycopg3 driver).

### 2. Point DNS at the server
Create an `A` record: `your-domain.com → <your Hetzner IP>`. Open ports **80** and
**443** in the Hetzner firewall.

### 3. Install Docker on the server
```bash
curl -fsSL https://get.docker.com | sh
```

### 4. Get the code + configure
```bash
git clone <your-repo> vela && cd vela
cp .env.production.example .env
nano .env            # fill in DOMAIN, PUBLIC_BASE_URL, SECRET_KEY, DATABASE_URL, keys…
```
Generate `SECRET_KEY` with `openssl rand -hex 32`.

> **Why both PUBLIC_BASE_URL and DOMAIN?** `DOMAIN` tells Caddy which hostname to
> get a TLS cert for. `PUBLIC_BASE_URL` is baked into the **frontend build** as
> `NEXT_PUBLIC_API_URL` (Next inlines `NEXT_PUBLIC_*` at build time — it cannot be
> changed afterward without rebuilding).

### 5. Build + run
```bash
docker compose up -d --build
```
Check it: `curl https://your-domain.com/health` → `{"status":"ok","database":true}`.

---

## Database schema & migrations

On first boot the backend runs `create_all()` + `ensure_runtime_schema()` (now
dialect-aware), which builds a correct, complete schema on a fresh Postgres DB.
No manual step needed for the first deploy.

**Going forward, use Alembic** instead of editing the schema by hand:
```bash
# inside the backend container (or a venv with requirements installed):
alembic stamp head                              # first time: mark current schema as baseline
alembic revision --autogenerate -m "describe change"   # after changing models
alembic upgrade head                            # apply
```
(Alembic reads `DATABASE_URL` from the environment via `alembic/env.py`.)

---

## Updating after a code change
```bash
git pull
docker compose up -d --build      # rebuilds changed images, restarts
```
If you changed anything the frontend reads at build time (e.g. `PUBLIC_BASE_URL`),
the `--build` is required — the frontend must be rebuilt.

---

## Operational notes

- **Uploads/payslips** are stored on Docker volumes (`backend_uploads`,
  `backend_payslips`). They survive restarts/redeploys on the same host. If you
  ever move to multiple backend hosts, switch to object storage (S3/R2).
- **Backups:** Neon has point-in-time restore built in — enable it. Volumes can be
  backed up with `docker run --rm -v vela_backend_uploads:/d -v $PWD:/b alpine tar czf /b/uploads.tgz /d`.
- **Scheduler:** runs in the single backend worker (`WEB_CONCURRENCY=1`). To scale
  web concurrency: raise `WEB_CONCURRENCY`, set `ENABLE_SCHEDULER=false` on the web
  service, and add one more backend service with `ENABLE_SCHEDULER=true` (1 worker)
  that isn't routed by Caddy.
- **Logs:** `docker compose logs -f backend` (structured, level-tagged to stdout).
- **Stripe webhook:** point it at `https://your-domain.com/api/billing/webhook`.

## Validation checklist (first deploy — these need a real environment to confirm)
- [ ] `docker compose build` succeeds. If a Python wheel fails to build for 3.14,
      change `backend/Dockerfile` base image to `python:3.12-slim-bookworm` and rebuild.
- [ ] `curl https://DOMAIN/health` returns `database: true` (backend ↔ Neon OK).
- [ ] Frontend loads over HTTPS and login works (frontend ↔ backend via /api OK).
- [ ] A Stripe test checkout completes and the webhook is received.
