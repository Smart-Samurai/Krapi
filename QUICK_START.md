# Quick Start Guide

## For Normal Development

Just run the non-interactive manager:

**Windows:**
```bash
krapi-manager.bat
```

**Linux/Mac:**
```bash
./krapi-manager.sh
```

**PowerShell:**
```powershell
.\krapi-manager.ps1
```

This will:
1. ✅ Install dependencies (if needed)
2. ✅ Build backend and frontend
3. ✅ Start services automatically

**SDK is automatically installed from npm** - no building needed!

## For Debugging SDK

Use the interactive manager:

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

Then:
1. Select option **5** (SDK Management)
2. Select option **2** (Link local SDK)
3. Select option **4** (Build SDK)
4. Go back, select option **3** (Start development)
5. Make changes in `packages/krapi-sdk/src/`
6. Rebuild SDK when needed
7. When done: SDK Menu → option **3** (Unlink SDK)

## Check SDK Status

```bash
pnpm run sdk:status
```

Shows which packages use local vs npm SDK.

## Documentation

- **SDK_DEVELOPMENT.md** - Complete SDK development guide
- **MANAGER_SCRIPTS.md** - Manager scripts documentation
- **packages/krapi-sdk/DEVELOPMENT.md** - SDK-specific development guide

