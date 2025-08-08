#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="$(dirname "$0")/docker-compose.yml"
VOLUME_NAME="postgres_data"
SERVICE_NAME="postgres"
CONTAINER_NAME="krapi-postgres"

echo "This will STOP Postgres, DELETE its data volume ('$VOLUME_NAME'), and start fresh."
read -r -p "Type 'RESET' to continue: " CONFIRM
if [ "${CONFIRM:-}" != "RESET" ]; then
  echo "Aborted."
  exit 1;
fi

if command -v docker >/dev/null 2>&1; then
  DOCKER="docker"
elif command -v docker-compose >/dev/null 2>&1; then
  DOCKER="docker-compose"
else
  echo "Docker is not installed or not in PATH."
  exit 1
fi

if [ "$DOCKER" = "docker" ]; then
  echo "Stopping and removing containers..."
  docker compose -f "$COMPOSE_FILE" down --remove-orphans
  echo "Removing volume $VOLUME_NAME..."
  docker volume rm "$VOLUME_NAME" || true
  echo "Starting fresh Postgres..."
  docker compose -f "$COMPOSE_FILE" up -d "$SERVICE_NAME"
else
  echo "Stopping and removing containers..."
  docker-compose -f "$COMPOSE_FILE" down --remove-orphans
  echo "Removing volume $VOLUME_NAME..."
  docker volume rm "$VOLUME_NAME" || true
  echo "Starting fresh Postgres..."
  docker-compose -f "$COMPOSE_FILE" up -d "$SERVICE_NAME"
fi

echo "Done. Postgres has been reset."