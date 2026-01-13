# Smart better-sqlite3 Rebuild

## Overview

The `smart-rebuild-sqlite.js` script optimizes the `better-sqlite3` rebuild process by only rebuilding when necessary. This significantly speeds up `npm install` during test runs.

## How It Works

The script checks if a rebuild is needed by comparing:
1. **Binary existence** - Is the compiled binary present?
2. **Node version** - Has Node.js version changed?
3. **Platform** - Has the platform (OS/architecture) changed?
4. **better-sqlite3 version** - Has the package version changed?

If all checks pass, the rebuild is **skipped**, saving significant time.

## Performance Impact

**Before:**
- Every `npm install` → Rebuild better-sqlite3 (~30-60 seconds)
- Test runs with reinstalls → Always slow

**After:**
- First `npm install` → Rebuild better-sqlite3 (~30-60 seconds)
- Subsequent `npm install` → Skip rebuild (~0.1 seconds) ⚡
- Test runs → Much faster when binary is already built

## When Rebuild Happens

The rebuild will occur when:
- ✅ Binary doesn't exist (first install)
- ✅ Node.js version changes
- ✅ Platform changes (e.g., switching between Linux/Windows/Mac)
- ✅ better-sqlite3 package version changes

## Cache File

The script creates `.sqlite-rebuild-cache.json` in the backend-server directory to track:
- Node version
- Platform
- better-sqlite3 version
- Last rebuild timestamp

This file is gitignored and is local to each environment.

## Manual Rebuild

If you need to force a rebuild:

```bash
cd backend-server
npm rebuild better-sqlite3
```

Or delete the cache file:

```bash
rm backend-server/.sqlite-rebuild-cache.json
```

## Integration

The script is automatically called via the `postinstall` hook in `package.json`:

```json
{
  "scripts": {
    "postinstall": "node scripts/smart-rebuild-sqlite.js"
  }
}
```

## Testing

To verify it's working:

1. **First run** (should rebuild):
   ```bash
   cd backend-server
   node scripts/smart-rebuild-sqlite.js
   # Output: 📦 No rebuild cache found, rebuilding to be safe...
   ```

2. **Second run** (should skip):
   ```bash
   node scripts/smart-rebuild-sqlite.js
   # Output: ✅ better-sqlite3 binary is up to date, skipping rebuild
   ```

## Benefits for Test Suites

Since test suites often reinstall dependencies, this optimization:
- ⚡ Reduces test suite execution time
- ⚡ Speeds up CI/CD pipelines
- ⚡ Improves developer experience
- ✅ Still ensures binary is up-to-date when needed









