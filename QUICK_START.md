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

## SDK Development

The SDK (`@smartsamurai/krapi-sdk`) is maintained in a separate Git repository. To develop or modify the SDK:

1. Clone the separate SDK repository
2. Make your changes
3. Build and test the SDK
4. Publish to npm: `npm publish --access public`
5. Update this monorepo: `pnpm install`

## Documentation

- **MANAGER_SCRIPTS.md** - Manager scripts documentation
- **API_DOCUMENTATION.md** - API documentation
- **[@smartsamurai/krapi-sdk](https://www.npmjs.com/package/@smartsamurai/krapi-sdk)** - SDK npm package

