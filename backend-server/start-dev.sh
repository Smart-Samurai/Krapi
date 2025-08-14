#!/bin/bash
export DB_HOST=localhost
export DB_PORT=5420
export DB_NAME=krapi
export DB_USER=postgres
export DB_PASSWORD=postgres
export JWT_SECRET=default-secret-change-this
export JWT_EXPIRES_IN=7d
export SESSION_EXPIRES_IN=1h
export DEFAULT_ADMIN_PASSWORD=admin123
export PORT=3470
export HOST=localhost
export NODE_ENV=development

echo "Starting KRAPI Backend with environment variables..."
pnpm run dev
