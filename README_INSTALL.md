# Installation Guide

This project supports both **npm** and **pnpm** for package management. You can use either based on your preference.

## Using npm (default)

```bash
# Install all dependencies across all workspaces
npm install

# Or use the script
npm run install:all
```

## Using pnpm

```bash
# Install all dependencies across all workspaces
pnpm install

# Or use the script
npm run install:pnpm
```

## Workspace Structure

Both npm and pnpm will install dependencies for:
- Root workspace
- `backend-server/`
- `frontend-manager/`
- `packages/*` (all packages)
- `KRAPI-COMPREHENSIVE-TEST-SUITE/`

## Configuration Files

- **npm workspaces**: Configured in `package.json` under `workspaces` field
- **pnpm workspaces**: Configured in `pnpm-workspace.yaml`

Both configurations are identical and will install the same packages across the same workspaces.

