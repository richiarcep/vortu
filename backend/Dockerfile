# Vela backend — multi-stage production image.
# FastAPI served by gunicorn + uvicorn workers.
#
# Built on python:3.12-slim-bookworm: the pinned deps (psycopg[binary]==3.2.9,
# cryptography, pandas, etc.) ship 3.12 wheels; 3.14 has no psycopg-binary wheel.
# The app code itself is version-agnostic.

# ── Stage 1: builder — compile/install deps into an isolated venv ─────────────
FROM python:3.12-slim-bookworm AS builder

# build-essential + libpq-dev only needed to BUILD any sdist-only deps; they do
# not ship in the final image.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

ENV PIP_NO_CACHE_DIR=1
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# ── Stage 2: runtime — slim image with just the venv + runtime libs ───────────
FROM python:3.12-slim-bookworm AS runtime

# Runtime-only shared libs: libpq5 (Postgres client), Pillow/reportlab image libs,
# curl for the container HEALTHCHECK. No build toolchain in the final image.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 libjpeg62-turbo zlib1g libfreetype6 curl \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH"

COPY --from=builder /opt/venv /opt/venv

WORKDIR /app
COPY . .

# Persisted runtime dirs (uploads/payslips) — mounted as volumes in compose.
RUN mkdir -p uploads payslips && \
    useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -fsS http://localhost:8000/health || exit 1

# WEB_CONCURRENCY controls worker count (default 1 so the in-process scheduler runs
# exactly once). To run more web workers, set WEB_CONCURRENCY>1 AND
# ENABLE_SCHEDULER=false, and run one separate scheduler process.
CMD ["sh", "-c", "gunicorn main:app -k uvicorn.workers.UvicornWorker -w ${WEB_CONCURRENCY:-1} -b 0.0.0.0:8000 --timeout 120 --access-logfile - --error-logfile -"]
