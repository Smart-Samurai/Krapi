# SDK Development Guide

This guide explains how the KRAPI SDK is structured, how to develop it, and how it integrates with the main application.

## Overview

The KRAPI SDK (`@smartsamurai/krapi-sdk`) is now a **published npm package** that the main application uses as a dependency. This provides:

- ✅ **Clean separation** - SDK development is independent from app development
- ✅ **Version control** - App uses tested, published versions
- ✅ **Easy debugging** - Can switch to local SDK when needed
- ✅ **Faster builds** - SDK not built during main app builds

## Architecture

### Production Mode (Default)

```
Main App (backend/frontend)
    ↓
Uses npm package: @smartsamurai/krapi-sdk@^0.1.0
    ↓
Installed from npm registry
```

### Development Mode (Local Debugging)

```
Main App (backend/frontend)
    ↓
Uses local file: file:../packages/krapi-sdk
    ↓
Direct link to local SDK source
```

## Quick Reference

### Check Current Mode

```bash
pnpm run sdk:status
```

### Switch to Local SDK (for debugging)

```bash
pnpm run sdk:link
cd packages/krapi-sdk
pnpm run build
cd ../..
pnpm run dev:all
```

### Switch Back to NPM Package

```bash
pnpm run sdk:unlink
```

## Detailed Workflows

### Normal Development (Using NPM Package)

**Default behavior** - The app uses the published npm package:

```bash
# Just start the app normally
pnpm run dev:all

# The SDK is automatically installed from npm
# No SDK building required
```

**When to use:**
- Normal day-to-day development
- Testing the app with stable SDK version
- Production builds

### SDK Development (Using Local SDK)

**When you need to debug or modify the SDK:**

```bash
# 1. Switch to local SDK
pnpm run sdk:link

# 2. Make changes in packages/krapi-sdk/src/

# 3. Build the SDK
pnpm run sdk:build
# Or use watch mode for auto-rebuild:
pnpm run sdk:dev

# 4. Test your changes in the app
pnpm run dev:all

# 5. When done, switch back
pnpm run sdk:unlink
```

**When to use:**
- Fixing bugs in the SDK
- Adding new SDK features
- Testing SDK changes before publishing

### Publishing New SDK Version

```bash
# 1. Make sure you're using npm package
pnpm run sdk:unlink

# 2. Update version in packages/krapi-sdk/package.json
#    - patch: 0.1.0 → 0.1.1 (bug fixes)
#    - minor: 0.1.0 → 0.2.0 (new features)
#    - major: 0.1.0 → 1.0.0 (breaking changes)

# 3. Build and publish
cd packages/krapi-sdk
pnpm run build
npm publish --access public

# 4. Update app dependencies
cd ../..
# Update version in:
#   - backend-server/package.json
#   - frontend-manager/package.json
#   - KRAPI-COMPREHENSIVE-TEST-SUITE/package.json
#   - packages/krapi-mcp-server/package.json
pnpm install
```

## Available Scripts

### Main App Scripts (SDK Excluded)

These scripts **do not** include SDK building/checking:

- `pnpm run build:all` - Builds backend and frontend only
- `pnpm run lint:all` - Lints backend and frontend only
- `pnpm run type-check:all` - Type-checks backend and frontend only
- `pnpm run health` - Full health check (install + lint + type-check + build)

### SDK-Specific Scripts

These scripts are for SDK development:

- `pnpm run sdk:dev` - Watch mode for SDK (auto-rebuild on changes)
- `pnpm run sdk:build` - Build the SDK once
- `pnpm run sdk:check` - Lint + type-check the SDK
- `pnpm run sdk:link` - Switch to local SDK
- `pnpm run sdk:unlink` - Switch to npm package
- `pnpm run sdk:status` - Check current mode (local vs npm)

### Individual SDK Scripts

Run these from `packages/krapi-sdk/`:

- `pnpm run build` - Build SDK
- `pnpm run dev` - Watch mode
- `pnpm run lint` - Lint SDK
- `pnpm run type-check` - Type-check SDK

## How It Works

### The SDK Link Script

The `scripts/sdk-dev.js` script automatically:

1. **Updates package.json files** in:
   - `backend-server/package.json`
   - `frontend-manager/package.json`
   - `KRAPI-COMPREHENSIVE-TEST-SUITE/package.json`
   - `packages/krapi-mcp-server/package.json`

2. **Changes the dependency** from:
   - `"@smartsamurai/krapi-sdk": "^0.1.0"` (npm)
   - to: `"@smartsamurai/krapi-sdk": "file:../packages/krapi-sdk"` (local)

3. **Runs pnpm install** to update dependencies

### Package Structure

```
Krapi/
├── packages/
│   └── krapi-sdk/          # SDK source code
│       ├── src/            # TypeScript source
│       ├── dist/           # Compiled output (built)
│       └── package.json    # SDK package config
├── backend-server/         # Uses SDK from npm or local
├── frontend-manager/       # Uses SDK from npm or local
└── package.json           # Root workspace config
```

## Troubleshooting

### App Not Picking Up SDK Changes

**Problem:** Made changes to SDK but app still uses old code.

**Solution:**
1. Make sure you're using local SDK: `pnpm run sdk:status`
2. Rebuild the SDK: `pnpm run sdk:build`
3. Restart the app

### Type Errors After Linking

**Problem:** TypeScript errors after switching to local SDK.

**Solution:**
1. Build the SDK: `cd packages/krapi-sdk && pnpm run build`
2. Reinstall dependencies: `pnpm install`
3. Check SDK types: `pnpm run sdk:check`

### Mixed Mode Warning

**Problem:** `sdk:status` shows "Mixed mode detected"

**Solution:**
```bash
# Unlink everything
pnpm run sdk:unlink

# Then link everything
pnpm run sdk:link
```

### Build Fails with "Module not found"

**Problem:** App can't find SDK after linking.

**Solution:**
1. Make sure SDK is built: `pnpm run sdk:build`
2. Reinstall dependencies: `pnpm install`
3. Check SDK status: `pnpm run sdk:status`

## Best Practices

### 1. Default to NPM Package

Always start with the npm package. Only link local SDK when actively developing/debugging.

```bash
# Good: Start with npm
pnpm run sdk:unlink
pnpm run dev:all

# Only link when needed
pnpm run sdk:link
# ... make changes ...
pnpm run sdk:unlink
```

### 2. Always Build After Changes

After modifying SDK source, always rebuild:

```bash
pnpm run sdk:build
# Or use watch mode:
pnpm run sdk:dev
```

### 3. Check Before Committing

Before committing SDK changes:

```bash
# Check SDK quality
pnpm run sdk:check

# Make sure app still works
pnpm run sdk:unlink
pnpm run dev:all
```

### 4. Unlink Before Committing App Changes

Before committing main app changes, switch back to npm:

```bash
pnpm run sdk:unlink
# Then commit
```

### 5. Test Both Modes

Before publishing a new SDK version:

1. Test with npm package (current version)
2. Test with local SDK (new version)
3. Publish if both work

## Integration with Manager Scripts

The KRAPI manager scripts (`krapi-manager.bat`, `krapi-manager.sh`) automatically handle SDK:

- **Non-interactive mode**: Uses npm package (default)
- **Interactive mode**: Option to switch to local SDK for debugging

See the manager script documentation for details.

## Migration Notes

### What Changed

1. **SDK removed from main build scripts**
   - `build:packages` no longer includes SDK
   - `lint:all` no longer includes SDK
   - `type-check:all` no longer includes SDK

2. **SDK is now an npm dependency**
   - Installed via `pnpm install`
   - Version controlled in `package.json`

3. **Local SDK available for debugging**
   - Use `pnpm run sdk:link` to switch
   - Use `pnpm run sdk:unlink` to switch back

### Breaking Changes

**None!** The app works exactly the same. The only difference is:
- SDK is installed from npm instead of built locally
- Faster builds (SDK not built during app builds)

## Examples

### Example 1: Fixing a Bug in SDK

```bash
# 1. Switch to local SDK
pnpm run sdk:link

# 2. Find and fix bug in packages/krapi-sdk/src/

# 3. Build SDK
pnpm run sdk:build

# 4. Test fix
pnpm run dev:all

# 5. Verify fix works
# ... test the app ...

# 6. Switch back
pnpm run sdk:unlink

# 7. Publish fix
cd packages/krapi-sdk
npm version patch
npm publish --access public
```

### Example 2: Adding New SDK Feature

```bash
# 1. Switch to local SDK
pnpm run sdk:link

# 2. Add feature in packages/krapi-sdk/src/

# 3. Build and test
pnpm run sdk:build
pnpm run sdk:check
pnpm run dev:all

# 4. Iterate until feature works
# ... repeat steps 2-3 ...

# 5. When ready, publish
pnpm run sdk:unlink
cd packages/krapi-sdk
npm version minor  # New feature = minor version
npm publish --access public
```

### Example 3: Testing SDK Changes

```bash
# Test with local SDK
pnpm run sdk:link
pnpm run sdk:build
pnpm run dev:all
# ... test changes ...

# Test with npm package (make sure it still works)
pnpm run sdk:unlink
pnpm install  # Get latest from npm
pnpm run dev:all
# ... verify npm version works ...
```

## Summary

- **Default**: App uses npm package (`@smartsamurai/krapi-sdk@^0.1.0`)
- **Debugging**: Use `pnpm run sdk:link` to switch to local SDK
- **Development**: Make changes in `packages/krapi-sdk/src/`, build with `pnpm run sdk:build`
- **Publishing**: Update version, build, then `npm publish --access public`

For more details, see `packages/krapi-sdk/DEVELOPMENT.md`.

