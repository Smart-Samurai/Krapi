# SDK Development Guide

This guide explains how to develop and debug the SDK locally while the main app uses the npm package.

## Quick Start

### Using NPM Package (Production Mode - Default)

By default, the app uses the published npm package:

```bash
# Check current status
pnpm run sdk:status

# All packages should show: "Using NPM package"
```

### Using Local SDK (Development/Debug Mode)

When you need to debug or test SDK changes locally:

```bash
# 1. Switch to local SDK
pnpm run sdk:link

# 2. Build the SDK (required after changes)
cd packages/krapi-sdk
pnpm run build

# 3. Go back to root and start the app
cd ../..
pnpm run dev:all

# 4. When done debugging, switch back to npm package
pnpm run sdk:unlink
```

## SDK Development Workflow

### Making Changes to SDK

1. **Switch to local SDK:**
   ```bash
   pnpm run sdk:link
   ```

2. **Make your changes** in `packages/krapi-sdk/src/`

3. **Build the SDK:**
   ```bash
   pnpm run sdk:build
   # Or watch mode for auto-rebuild:
   pnpm run sdk:dev
   ```

4. **Test your changes:**
   ```bash
   # Start the app (it will use local SDK)
   pnpm run dev:all
   ```

5. **Check SDK code quality:**
   ```bash
   pnpm run sdk:check  # Runs lint + type-check
   ```

6. **When done, switch back:**
   ```bash
   pnpm run sdk:unlink
   ```

### Publishing New SDK Version

1. **Make sure you're using npm package:**
   ```bash
   pnpm run sdk:unlink
   ```

2. **Update version in `packages/krapi-sdk/package.json`**

3. **Build and publish:**
   ```bash
   cd packages/krapi-sdk
   pnpm run build
   npm publish --access public
   ```

4. **Update app dependencies:**
   ```bash
   cd ../..
   # Update version in backend-server/package.json and frontend-manager/package.json
   pnpm install
   ```

## Available Scripts

### Main App Scripts (SDK excluded by default)

- `pnpm run build:all` - Builds backend and frontend (not SDK)
- `pnpm run lint:all` - Lints backend and frontend (not SDK)
- `pnpm run type-check:all` - Type-checks backend and frontend (not SDK)

### SDK-Specific Scripts

- `pnpm run sdk:dev` - Watch mode for SDK development
- `pnpm run sdk:build` - Build the SDK
- `pnpm run sdk:check` - Lint + type-check the SDK
- `pnpm run sdk:link` - Switch to local SDK
- `pnpm run sdk:unlink` - Switch to npm package
- `pnpm run sdk:status` - Check current mode

## Troubleshooting

### App not picking up SDK changes

1. Make sure you've built the SDK: `pnpm run sdk:build`
2. Check you're using local SDK: `pnpm run sdk:status`
3. Restart the app after building SDK

### Type errors after linking

1. Rebuild the SDK: `cd packages/krapi-sdk && pnpm run build`
2. Reinstall dependencies: `pnpm install`
3. Check types: `pnpm run sdk:check`

### Mixed mode warning

If you see "Mixed mode detected", some packages are using local SDK while others use npm. Run:
```bash
pnpm run sdk:unlink  # Then
pnpm run sdk:link    # To ensure all use local
```

## Best Practices

1. **Default to npm package** - Only link local SDK when actively developing/debugging
2. **Always build SDK** - After making changes, run `pnpm run sdk:build`
3. **Check before commit** - Run `pnpm run sdk:check` before committing SDK changes
4. **Unlink before commit** - Switch back to npm package before committing main app changes
5. **Test both modes** - Test your app with both npm package and local SDK before publishing


