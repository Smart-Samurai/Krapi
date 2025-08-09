#!/usr/bin/env bash
set -euo pipefail

# Unified supervisor for KRAPI (Linux/macOS)
# - Interactive menu to:
#   1) Full setup: install deps, start Postgres, build apps, start in production
#   2) Dev mode: ensure Postgres, start SDK/Backend/Frontend in dev (watch) with supervision
#   3) Utilities: install deps, build apps, start/stop/reset Postgres
# - Non-interactive: pass -y or --auto to default to option 1
#
# Usage:
#   bash bin/supervise.sh [-y|--auto]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOG_DIR"

# Configurable defaults via environment
BACKEND_PORT="${BACKEND_PORT:-3470}"
FRONTEND_PORT="${FRONTEND_PORT:-3469}"
HEALTH_INTERVAL="${HEALTH_INTERVAL:-10}"
UNHEALTHY_RESTART_THRESHOLD="${UNHEALTHY_RESTART_THRESHOLD:-3}"

# DB env for local dev
export DB_HOST="${DB_HOST:-localhost}"
export DB_PORT="${DB_PORT:-5432}"
export DB_NAME="${DB_NAME:-krapi}"
export DB_USER="${DB_USER:-postgres}"
export DB_PASSWORD="${DB_PASSWORD:-postgres}"

AUTO=0
for arg in ${*:-}; do
  case "$arg" in
    -y|--auto) AUTO=1 ;;
  esac
done

info() { echo "[supervise] $*"; }
warn() { echo "[supervise] WARNING: $*"; }
err() { echo "[supervise] ERROR: $*" 1>&2; }

has_cmd() { command -v "$1" >/dev/null 2>&1; }

ensure_pnpm() {
  if has_cmd pnpm; then return 0; fi
  warn "pnpm not found. Attempting to activate via corepack..."
  if has_cmd corepack; then
    corepack enable || true
    corepack prepare pnpm@latest --activate || true
  fi
  if ! has_cmd pnpm; then
    err "pnpm is required. Install via: npm i -g corepack && corepack enable && corepack prepare pnpm@latest --activate"
    exit 1
  fi
}

compose() {
  # Prefer docker compose if available
  if has_cmd docker; then
    docker compose "$@"
  else
    err "docker not found in PATH"
    return 1
  fi
}

ensure_postgres() {
  if ! has_cmd docker; then
    warn "Docker not available; assuming local Postgres at $DB_HOST:$DB_PORT"
    return 0
  fi
  if ! compose -f "$SCRIPT_DIR/docker-compose.yml" ps | grep -q "krapi-postgres"; then
    info "Starting Postgres in Docker..."
    compose -f "$SCRIPT_DIR/docker-compose.yml" up -d postgres
  fi
  info "Waiting for Postgres to be ready..."
  for i in {1..30}; do
    if compose -f "$SCRIPT_DIR/docker-compose.yml" exec -T postgres pg_isready -U "$DB_USER" >/dev/null 2>&1; then
      info "Postgres is ready"
      return 0
    fi
    sleep 2
  done
  warn "Postgres readiness timed out; proceeding anyway."
}

reset_postgres() {
  info "This will STOP Postgres, DELETE its data volume ('postgres_data'), and start fresh."
  read -r -p "Type 'RESET' to continue: " CONFIRM
  if [ "${CONFIRM:-}" != "RESET" ]; then
    info "Aborted."
    return 0
  fi
  compose -f "$SCRIPT_DIR/docker-compose.yml" down --remove-orphans || true
  info "Removing volume postgres_data..."
  docker volume rm postgres_data || true
  info "Starting fresh Postgres..."
  compose -f "$SCRIPT_DIR/docker-compose.yml" up -d postgres
}

install_deps() {
  ensure_pnpm
  info "Installing workspace dependencies..."
  (cd "$PROJECT_ROOT" && pnpm install -w)
}

build_all() {
  ensure_pnpm
  info "Building SDK..."
  (cd "$PROJECT_ROOT/packages/krapi-sdk" && pnpm run build)
  info "Building Backend..."
  (cd "$PROJECT_ROOT/backend-server" && pnpm run build)
  info "Building Frontend..."
  (cd "$PROJECT_ROOT/frontend-manager" && pnpm run build)
}

start_service() {
  local name="$1"; shift
  local cmd="$*"
  local log_file="$LOG_DIR/${name}.log"
  info "Starting $name... (logs: $log_file)"
  stdbuf -oL -eL bash -lc "$cmd" >>"$log_file" 2>&1 &
  echo $!
}

check_url() {
  local url="$1"
  curl -fsS --max-time 3 "$url" >/dev/null 2>&1
}

supervise_loop() {
  local name="$1"; shift
  local start_cmd="$1"; shift
  local health_url="${1:-}"
  local unhealthy=0

  while true; do
    local pid
    pid=$(start_service "$name" "$start_cmd")
    while true; do
      sleep "$HEALTH_INTERVAL"
      if ! kill -0 "$pid" >/dev/null 2>&1; then
        info "$name exited (pid=$pid). Restarting..."
        break
      fi
      if [ -n "$health_url" ]; then
        if check_url "$health_url"; then
          unhealthy=0
        else
          unhealthy=$((unhealthy+1))
          warn "$name health check failed ($unhealthy/$UNHEALTHY_RESTART_THRESHOLD)"
          if [ "$unhealthy" -ge "$UNHEALTHY_RESTART_THRESHOLD" ]; then
            warn "$name unhealthy threshold reached. Restarting..."
            kill "$pid" 2>/dev/null || true
            wait "$pid" 2>/dev/null || true
            break
          fi
        fi
      fi
    done
    info "Restarting $name in 2s..."; sleep 2
  done
}

start_dev_all_supervised() {
  ensure_pnpm
  ensure_postgres || true
  info "Starting all services in DEV mode (supervised)..."

  trap 'info "Stopping services..."; p=$(jobs -p); if [ -n "$p" ]; then kill $p 2>/dev/null || true; fi; exit 0' INT TERM EXIT

  supervise_loop "sdk" "cd '$PROJECT_ROOT/packages/krapi-sdk' && pnpm run dev" &
  supervise_loop "backend" "cd '$PROJECT_ROOT/backend-server' && pnpm run dev" "http://localhost:$BACKEND_PORT/krapi/k1/version" &
  supervise_loop "frontend" "cd '$PROJECT_ROOT/frontend-manager' && pnpm run dev" "http://localhost:$FRONTEND_PORT/" &

  wait
}

start_prod_all() {
  ensure_pnpm
  ensure_postgres || true
  info "Starting Backend and Frontend in PRODUCTION mode..."

  trap 'info "Stopping services..."; p=$(jobs -p); if [ -n "$p" ]; then kill $p 2>/dev/null || true; fi; exit 0' INT TERM EXIT

  start_service "backend" "cd '$PROJECT_ROOT/backend-server' && pnpm run start" >/dev/null
  start_service "frontend" "cd '$PROJECT_ROOT/frontend-manager' && pnpm run start" >/dev/null

  info "Backend:  http://localhost:$BACKEND_PORT"
  info "Frontend: http://localhost:$FRONTEND_PORT"
  info "Press Ctrl+C to stop."
  wait
}

menu() {
  echo ""
  echo "KRAPI Supervisor (sh)"
  echo "1) Full setup: install deps, start Postgres, build, start (prod)"
  echo "2) Dev mode: ensure Postgres, start all in dev (supervised)"
  echo "3) Utilities"
  echo "   a) Install deps only"
  echo "   b) Build all only"
  echo "   c) Start Postgres"
  echo "   d) Reset Postgres (DESTROYS DATA)"
  echo "   e) Back"
  echo "q) Quit"
  echo -n "> "
}

utilities_menu() {
  while true; do
    echo ""
    echo "Utilities:"
    echo "a) Install deps only"
    echo "b) Build all only"
    echo "c) Start Postgres"
    echo "d) Reset Postgres (DESTROYS DATA)"
    echo "e) Back"
    echo -n "> "
    read -r choice
    case "$choice" in
      a|A) install_deps ;;
      b|B) build_all ;;
      c|C) ensure_postgres ;;
      d|D) reset_postgres ;;
      e|E) break ;;
      *) echo "Invalid option" ;;
    esac
  done
}

main() {
  if [ "$AUTO" -eq 1 ]; then
    info "Auto mode: running Option 1 (Full setup)"
    install_deps
    ensure_postgres || true
    build_all
    start_prod_all
    exit 0
  fi

  while true; do
    menu
    read -r selection
    case "$selection" in
      1)
        install_deps
        ensure_postgres || true
        build_all
        start_prod_all
        ;;
      2)
        start_dev_all_supervised
        ;;
      3)
        utilities_menu
        ;;
      q|Q)
        exit 0
        ;;
      *)
        echo "Invalid selection"
        ;;
    esac
  done
}

main "$@"