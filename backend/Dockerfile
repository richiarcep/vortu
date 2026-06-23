# Vela backend — FastAPI served by gunicorn + uvicorn workers.
# Base image matches the Python the deps were pinned against (3.14). If a wheel
# is missing for 3.14 at build time, switch to python:3.12-slim-bookworm (see
# docs/DEPLOY.md) — the app code itself does not require 3.14.
FROM python:3.14-slim-bookworm

# System libraries:
#  - build-essential / libpq-dev: in case a dependency must compile from source
#    (psycopg, etc.); libpq is also the Postgres client lib.
#  - libjpeg/zlib/freetype: runtime libs for Pillow / reportlab (PDF + images).
#  - curl: used by the container HEALTHCHECK.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential libpq-dev libjpeg62-turbo zlib1g libfreetype6 curl \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install deps first so this layer is cached across code changes.
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

# Persisted runtime dirs (uploads/payslips). In production these should be a
# mounted volume or object storage — see docs/DEPLOY.md.
RUN mkdir -p uploads payslips && \
    useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -fsS http://localhost:8000/health || exit 1

# WEB_CONCURRENCY controls worker count (default 1 so the in-process scheduler
# runs exactly once). To run more web workers, set WEB_CONCURRENCY>1 AND
# ENABLE_SCHEDULER=false here, running one separate scheduler process instead.
CMD ["sh", "-c", "gunicorn main:app -k uvicorn.workers.UvicornWorker -w ${WEB_CONCURRENCY:-1} -b 0.0.0.0:8000 --timeout 120 --access-logfile - --error-logfile -"]
