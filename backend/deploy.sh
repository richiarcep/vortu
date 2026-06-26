#!/usr/bin/env bash
# Vela backend — staging deploy to the Hetzner box.
#
# Uses your existing SSH key/agent (BatchMode: never prompts for / stores a
# password). Installs Docker, syncs the backend repo, and brings up the compose
# stack. The server .env is NEVER overwritten — you create it from .env.example
# with real secrets; this script refuses to boot with placeholders.
#
# Usage:
#   ./deploy.sh            # install docker (if needed) + sync + bring up the stack
#   ./deploy.sh sync       # just rsync the code (no compose)
#   ./deploy.sh up         # just (re)build + bring up the stack
#   ./deploy.sh verify     # check containers + HTTPS /health
#   ./deploy.sh logs       # tail the app logs
set -euo pipefail

SERVER="${VELA_SERVER:-root@167.233.199.102}"
REMOTE_DIR="${VELA_REMOTE_DIR:-/opt/vela-backend}"
HOSTNAME_PUB="${VELA_HOSTNAME:-167-233-199-102.sslip.io}"
COMPOSE="docker compose -f docker-compose.staging.yml"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SSH=(ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new "$SERVER")

say() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }

ensure_ssh() {
  say "Checking SSH to $SERVER (key/agent only)…"
  "${SSH[@]}" 'echo ok' >/dev/null || { echo "SSH failed — is your key loaded (ssh-add -l)?"; exit 1; }
}

install_docker() {
  say "Ensuring Docker is installed on the server…"
  "${SSH[@]}" 'command -v docker >/dev/null 2>&1 || (curl -fsSL https://get.docker.com | sh)'
  "${SSH[@]}" 'docker --version && docker compose version'
}

sync_code() {
  say "Syncing backend → $SERVER:$REMOTE_DIR …"
  "${SSH[@]}" "mkdir -p $REMOTE_DIR"
  rsync -az --delete \
    -e 'ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new' \
    --include '.env.example' \
    --exclude '.env' --exclude '.env.*' \
    --exclude '.git/' --exclude '__pycache__/' --exclude '*.pyc' \
    --exclude '.venv/' --exclude 'venv/' --exclude '.pytest_cache/' \
    --exclude '*.db' --exclude '*.db-wal' --exclude '*.db-shm' --exclude '*.sqlite' \
    --exclude 'uploads/' --exclude 'payslips/' --exclude 'reports/' \
    "$HERE/" "$SERVER:$REMOTE_DIR/"
}

ensure_env() {
  # Refuse to boot with placeholder values. First run drops a .env you must fill.
  if "${SSH[@]}" "test -f $REMOTE_DIR/.env"; then return 0; fi
  say "No .env on the server yet — seeding one from .env.example."
  "${SSH[@]}" "cp $REMOTE_DIR/.env.example $REMOTE_DIR/.env && chmod 600 $REMOTE_DIR/.env"
  cat <<EOF

  ⚠  Fill in the real values now (secrets stay only on the server):
       ssh $SERVER
       nano $REMOTE_DIR/.env        # SECRET_KEY, POSTGRES_PASSWORD, the 3 VELA_*_PASSWORD,
                                     # DATABASE_URL (same pw), ANTHROPIC_API_KEY, Stripe test keys…
  Then re-run:  ./deploy.sh up
EOF
  exit 2
}

stack_up() {
  ensure_env
  say "Building + starting the stack…"
  "${SSH[@]}" "cd $REMOTE_DIR && $COMPOSE up -d --build"
  verify
}

verify() {
  say "Container status:"
  "${SSH[@]}" "cd $REMOTE_DIR && $COMPOSE ps"
  say "Waiting for HTTPS + /health (Caddy provisions the cert on first hit; up to ~60s)…"
  for i in $(seq 1 20); do
    code="$("${SSH[@]}" "curl -sk -o /dev/null -w '%{http_code}' https://$HOSTNAME_PUB/health" || true)"
    if [ "$code" = "200" ]; then
      say "✅ https://$HOSTNAME_PUB/health → 200"
      "${SSH[@]}" "curl -s https://$HOSTNAME_PUB/health; echo"
      return 0
    fi
    printf '  …attempt %s/20 (got %s)\n' "$i" "${code:-none}"; sleep 5
  done
  echo "❌ /health did not return 200 over HTTPS. Check:  ./deploy.sh logs"; exit 1
}

logs() { "${SSH[@]}" "cd $REMOTE_DIR && $COMPOSE logs --tail=120 ${2:-app} ${3:-}"; }

restart() {
  # `docker compose restart` does NOT reload env_file — it restarts the SAME
  # container with the environment it was created with. To pick up .env changes
  # we must recreate the container (`up --force-recreate`), which re-reads .env
  # without rebuilding the image. `--no-deps` leaves postgres/redis untouched.
  say "Recreating the app container so it re-reads .env (no image rebuild)…"
  "${SSH[@]}" "cd $REMOTE_DIR && $COMPOSE up -d --force-recreate --no-deps app"
  verify
}

case "${1:-deploy}" in
  deploy)  ensure_ssh; install_docker; sync_code; stack_up ;;
  sync)    ensure_ssh; sync_code ;;
  up)      ensure_ssh; stack_up ;;
  restart) ensure_ssh; restart ;;
  verify)  ensure_ssh; verify ;;
  logs)    ensure_ssh; logs "$@" ;;
  *) echo "Usage: ./deploy.sh [deploy|sync|up|restart|verify|logs]"; exit 1 ;;
esac
