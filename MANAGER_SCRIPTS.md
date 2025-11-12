# KRAPI Manager Scripts Guide

This guide explains the KRAPI manager scripts and how they work with the new SDK setup.

## Overview

There are **two versions** of each manager script:

1. **Interactive** - Menu-based interface for manual control
2. **Non-Interactive** - Auto-installs, builds, and starts automatically

## Available Scripts

### Windows

- `krapi-manager-interactive.bat` - Interactive menu interface
- `krapi-manager.bat` - Non-interactive (auto-start)

### Linux/Mac

- `krapi-manager-interactive.sh` - Interactive menu interface
- `krapi-manager.sh` - Non-interactive (auto-start)

### PowerShell

- `krapi-manager-interactive.ps1` - Interactive menu interface
- `krapi-manager.ps1` - Non-interactive (auto-start)

## Interactive Mode

### Usage

**Windows:**
```bash
krapi-manager-interactive.bat
```

**Linux/Mac:**
```bash
./krapi-manager-interactive.sh
```

**PowerShell:**
```powershell
.\krapi-manager-interactive.ps1
```

### Menu Options

1. **Install dependencies** - Installs all npm/pnpm dependencies
2. **Build all** - Builds backend and frontend (SDK excluded)
3. **Start development mode** - Starts app in development mode
4. **Start production mode** - Starts app in production mode
5. **SDK Management** - SDK information (SDK is now in separate repository)
6. **Run health checks** - Full health check (install + lint + type-check + build)
7. **Stop services** - Instructions for stopping services
8. **Exit** - Close the manager

### SDK Management

The SDK (`@smartsamurai/krapi-sdk`) is now maintained in a separate Git repository and is installed automatically via npm. All packages use the npm version.

## Non-Interactive Mode

### Usage

**Windows:**
```bash
krapi-manager.bat              # Production mode (default)
krapi-manager.bat --dev        # Development mode
```

**Linux/Mac:**
```bash
./krapi-manager.sh             # Production mode (default)
./krapi-manager.sh dev         # Development mode
```

**PowerShell:**
```powershell
.\krapi-manager.ps1            # Production mode (default)
.\krapi-manager.ps1 dev        # Development mode
```

### What It Does

**Production Mode (default):**
1. Installs dependencies (if `node_modules` doesn't exist)
2. Builds backend and frontend
3. Starts services in production mode

**Development Mode:**
1. Installs dependencies (if `node_modules` doesn't exist)
2. Starts services in development mode (with hot reload)

### Notes

- **SDK is NOT built** - Uses npm package automatically
- **Fast startup** - Skips install if `node_modules` exists
- **Auto-initialization** - Database initialized automatically if missing

## SDK Integration

### How Manager Scripts Handle SDK

1. **SDK from npm** - All scripts use the npm package (`@smartsamurai/krapi-sdk@latest`)
2. **No SDK building** - SDK is not built during main app builds
3. **Automatic installation** - SDK is installed automatically when running `pnpm install` or `npm install`

### SDK Development

The SDK is maintained in a separate Git repository. To develop or modify the SDK:

1. Clone the separate SDK repository
2. Make your changes
3. Build and test the SDK
4. Publish to npm: `npm publish --access public`
5. Update the version in this monorepo's `package.json` files if needed
6. Run `pnpm install` to get the latest version

## Differences from Old Scripts

### What Changed

1. **SDK removed from build:packages**
   - Old: `build:packages` included SDK
   - New: `build:packages` only includes logger, error-handler, monitor

2. **SDK is npm dependency**
   - Old: SDK was built locally
   - New: SDK installed from npm (separate repository)

### What Stayed the Same

- All other functionality works the same
- Same ports (3470 backend, 3498 frontend)
- Same development/production modes
- Same health checks

## Troubleshooting

### Script Won't Run

**Windows:**
- Make sure you're running from KRAPI root directory
- Check that Node.js is installed
- Try running from Command Prompt (not Git Bash)

**Linux/Mac:**
- Make script executable: `chmod +x krapi-manager*.sh`
- Make sure you're in KRAPI root directory

**PowerShell:**
- May need to allow scripts: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

### Build Fails

- Make sure no services are running (they lock database files)
- Try stopping services first (option 7 in interactive menu)
- Check for TypeScript errors: `pnpm run type-check:all`

### SDK Not Found

- Reinstall dependencies: `pnpm install`
- Check that `@smartsamurai/krapi-sdk` is in your `package.json` files
- Verify npm registry access

## Best Practices

1. **Use non-interactive for quick starts**
   ```bash
   ./krapi-manager.sh
   ```

2. **Use interactive for debugging**
   ```bash
   ./krapi-manager-interactive.sh
   ```

3. **SDK from npm only**
   - SDK is always from npm package
   - No local linking available (SDK is in separate repository)

## Examples

### Example 1: Quick Start

```bash
# Just run the non-interactive script
./krapi-manager.sh

# It will:
# 1. Install dependencies
# 2. Build everything
# 3. Start services
```

### Example 2: Using Updated SDK

```bash
# If SDK was updated on npm, update it:
pnpm install

# Then start development
./krapi-manager.sh dev
```

### Example 3: Development Mode

```bash
# Non-interactive development mode
./krapi-manager.sh dev

# Or interactive
./krapi-manager-interactive.sh
# Then select option 3
```

## Summary

- **Interactive scripts** - Menu-based, full control
- **Non-interactive scripts** - Auto-start, fast, production-ready
- **SDK excluded** from main builds (uses npm package from separate repository)
- **SDK always from npm** - No local SDK development in this repository
- **Same functionality** as before, just better organized

The SDK is maintained in a separate Git repository and published to npm as `@smartsamurai/krapi-sdk`.

