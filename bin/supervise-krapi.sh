#!/usr/bin/env bash
set -euo pipefail

# Simple supervisor for KRAPI services (SDK, Backend, Frontend) with health checks and auto-restart
# Usage: bash bin/supervise-krapi.sh [--no-sdk] [--no-backend] [--no-frontend]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOG_DIR"

# Defaults
BACKEND_PORT=${BACKEND_PORT:-3470}
FRONTEND_PORT=${FRONTEND_PORT:-3469}
HEALTH_INTERVAL=${HEALTH_INTERVAL:-10}
UNHEALTHY_RESTART_THRESHOLD=${UNHEALTHY_RESTART_THRESHOLD:-3}

RUN_SDK=1
RUN_BACKEND=1
RUN_FRONTEND=1

for arg in "$@"; do
  case "$arg" in
    --no-sdk) RUN_SDK=0 ;;
    --no-backend) RUN_BACKEND=0 ;;
    --no-frontend) RUN_FRONTEND=0 ;;
  esac
done

# Export DB env for local dev
export DB_HOST=${DB_HOST:-localhost}
export DB_PORT=${DB_PORT:-5432}
export DB_NAME=${DB_NAME:-krapi}
export DB_USER=${DB_USER:-postgres}
export DB_PASSWORD=${DB_PASSWORD:-postgres}

# Try to ensure Postgres is running via docker compose
ensure_postgres() {
  if command -v docker >/dev/null 2>&1; then
    if ! docker compose -f "$SCRIPT_DIR/docker-compose.yml" ps | grep -q "krapi-postgres"; then
      echo "[supervisor] Starting Postgres in Docker..."
      docker compose -f "$SCRIPT_DIR/docker-compose.yml" up -d postgres
    fi
    # Wait for readiness
    echo "[supervisor] Waiting for Postgres to be ready..."
    for i in {1..30}; do
      if docker compose -f "$SCRIPT_DIR/docker-compose.yml" exec -T postgres pg_isready -U "$DB_USER" > /dev/null 2>&1; then
        echo "[supervisor] Postgres is ready"
        return 0
      fi
      sleep 2
    done
    echo "[supervisor] WARNING: Postgres readiness timed out; proceeding anyway."
  else
    echo "[supervisor] Docker not available; assuming local Postgres at $DB_HOST:$DB_PORT"
  fi
}

pids=()
services=()
stop_requested=0

cleanup() {
  stop_requested=1
  echo "\n[supervisor] Stopping services..."
  for pid in "${pids[@]:-}"; do
    if [ -n "${pid:-}" ] && kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  wait || true
  echo "[supervisor] All services stopped."
}
trap cleanup INT TERM EXIT

start_service() {
  local name="$1"
  local cmd="$2"
  local log_file="$LOG_DIR/${name}.log"

  echo "[supervisor] Starting $name... (logs: $log_file)"
  # shellcheck disable=SC2086
  stdbuf -oL -eL bash -lc "$cmd" >>"$log_file" 2>&1 &
  local pid=$!
  echo "$pid"
}

check_url() {
  local url="$1"
  curl -fsS --max-time 3 "$url" >/dev/null 2>&1
}

supervise() {
  local name="$1"
  local start_cmd="$2"
  local health_url="$3"

  local unhealthy=0

  while [ "$stop_requested" -eq 0 ]; do
    local pid
    pid=$(start_service "$name" "$start_cmd")
    services+=("$name")
    pids+=("$pid")

    # Health/watch loop
    while [ "$stop_requested" -eq 0 ]; do
      sleep "$HEALTH_INTERVAL"
      # If process exited, break to restart
      if ! kill -0 "$pid" >/dev/null 2>&1; then
        echo "[supervisor] $name exited (pid=$pid). Restarting..."
        break
      fi
      # Health check (if provided)
      if [ -n "$health_url" ]; then
        if check_url "$health_url"; then
          unhealthy=0
        else
          unhealthy=$((unhealthy+1))
          echo "[supervisor] $name health check failed ($unhealthy/$UNHEALTHY_RESTART_THRESHOLD)"
          if [ "$unhealthy" -ge "$UNHEALTHY_RESTART_THRESHOLD" ]; then
            echo "[supervisor] $name unhealthy threshold reached. Restarting..."
            kill "$pid" 2>/dev/null || true
            wait "$pid" 2>/dev/null || true
            break
          fi
        fi
      fi
    done

    # Remove last pid for this service
    for i in "${!services[@]}"; do
      if [ "${services[$i]}" = "$name" ]; then
        unset 'services[i]'
        unset 'pids[i]'
        break
      fi
    done

    [ "$stop_requested" -eq 0 ] || break
    echo "[supervisor] Restarting $name in 2s..."
    sleep 2
  done
}

main() {
  ensure_postgres || true

  # Start services under supervision
  if [ "$RUN_SDK" -eq 1 ]; then
    supervise "sdk" "cd '$PROJECT_ROOT/packages/krapi-sdk' && pnpm run dev" ""
  fi &

  if [ "$RUN_BACKEND" -eq 1 ]; then
    supervise "backend" "cd '$PROJECT_ROOT/backend-server' && pnpm run dev" "http://localhost:$BACKEND_PORT/krapi/k1/version"
  fi &

  if [ "$RUN_FRONTEND" -eq 1 ]; then
    supervise "frontend" "cd '$PROJECT_ROOT/frontend-manager' && pnpm run dev" "http://localhost:$FRONTEND_PORT/"
  fi &

  wait
}

main "$@"