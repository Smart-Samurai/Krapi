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
5. **SDK Management** - Submenu for SDK operations:
   - Check SDK status (local vs npm)
   - Link local SDK (for debugging)
   - Unlink SDK (use npm package)
   - Build SDK
   - Check SDK (lint + type-check)
6. **Run health checks** - Full health check (install + lint + type-check + build)
7. **Stop services** - Instructions for stopping services
8. **Exit** - Close the manager

### SDK Management Submenu

When you select option 5, you get access to SDK-specific operations:

- **Check SDK status** - Shows which packages use local vs npm SDK
- **Link local SDK** - Switches all packages to use local SDK from `packages/krapi-sdk`
- **Unlink SDK** - Switches all packages back to npm package
- **Build SDK** - Builds the SDK (required after linking)
- **Check SDK** - Runs lint and type-check on SDK

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

1. **By default** - All scripts use the npm package (`@smartsamurai/krapi-sdk@^0.1.0`)
2. **No SDK building** - SDK is not built during main app builds
3. **SDK management** - Available via interactive menu option 5

### When to Use Local SDK

Use the interactive menu's SDK Management option when:
- Debugging SDK issues
- Developing new SDK features
- Testing SDK changes before publishing

### Workflow Example

```bash
# 1. Start interactive manager
./krapi-manager-interactive.sh

# 2. Select option 5 (SDK Management)

# 3. Select option 2 (Link local SDK)

# 4. Go back to main menu, select option 5 again

# 5. Select option 4 (Build SDK)

# 6. Select option 3 (Start development mode)

# 7. Test your SDK changes

# 8. When done, go to SDK Management → option 3 (Unlink SDK)
```

## Differences from Old Scripts

### What Changed

1. **SDK removed from build:packages**
   - Old: `build:packages` included SDK
   - New: `build:packages` only includes logger, error-handler, monitor

2. **SDK is npm dependency**
   - Old: SDK was built locally
   - New: SDK installed from npm

3. **SDK management added**
   - New: Interactive menu option for SDK operations
   - New: Scripts to link/unlink local SDK

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

- Check SDK status: `pnpm run sdk:status`
- If using local SDK, make sure it's built: `pnpm run sdk:build`
- If using npm, reinstall: `pnpm install`

## Best Practices

1. **Use non-interactive for quick starts**
   ```bash
   ./krapi-manager.sh
   ```

2. **Use interactive for debugging**
   ```bash
   ./krapi-manager-interactive.sh
   ```

3. **Default to npm package**
   - Only link local SDK when actively debugging
   - Always unlink before committing

4. **Check SDK status**
   - Use `pnpm run sdk:status` to verify mode
   - Or use interactive menu option 5 → option 1

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

### Example 2: Debugging SDK

```bash
# Start interactive manager
./krapi-manager-interactive.sh

# Menu → 5 (SDK Management)
# SDK Menu → 2 (Link local SDK)
# SDK Menu → 4 (Build SDK)
# Main Menu → 3 (Start development)

# Make changes in packages/krapi-sdk/src/
# Rebuild: SDK Menu → 4
# Test changes

# When done: SDK Menu → 3 (Unlink SDK)
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

- **Interactive scripts** - Menu-based, full control, SDK management
- **Non-interactive scripts** - Auto-start, fast, production-ready
- **SDK excluded** from main builds (uses npm package)
- **SDK management** available via interactive menu
- **Same functionality** as before, just better organized

For SDK development details, see `SDK_DEVELOPMENT.md`.

