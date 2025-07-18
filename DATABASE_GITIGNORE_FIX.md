# Database Files Gitignore Fix

## Issue
Database files were being committed to the repository, which is problematic because:
- Database files can be large and change frequently
- They contain user data that shouldn't be in version control
- SQLite WAL mode creates multiple files that work together
- Database files are environment-specific

## Files Affected
The following database files were being tracked and needed to be excluded:
- `api-server/data/app.db` - Main SQLite database
- `api-server/data/app.db-wal` - SQLite Write-Ahead Log
- `api-server/data/app.db-shm` - SQLite Shared Memory file

## Solution Applied

### 1. Enhanced `.gitignore` Patterns
Updated `api-server/.gitignore` with comprehensive database file exclusions:

```gitignore
# Database files - SQLite (anywhere in project)
*.db
*.sqlite
*.sqlite3
*.db-wal
*.db-shm
*.db-journal

# But allow sample database files and documentation
!*sample*.db
!*sample*.sqlite
!*sample*.sqlite3

# Data directory - ignore all files but allow specific ones
data/*
!data/.gitkeep
!data/README.md
!data/sample-data.json
!data/*.sample.json
```

### 2. Removed Tracked Database Files
Since gitignore doesn't affect files already tracked by git, removed them:

```bash
git rm --cached data/app.db data/app.db-shm data/app.db-wal
```

### 3. Added Documentation and Structure
- ✅ Created `api-server/data/.gitkeep` - Ensures data directory exists
- ✅ Created `api-server/data/README.md` - Documents what files should/shouldn't be committed
- ✅ Kept `api-server/data/sample-data.json` - Sample data for development

## Verification

After the fix, git properly handles the database files:

```bash
$ git check-ignore data/*
data/app.db: IGNORED ✅
data/app.db-shm: IGNORED ✅  
data/app.db-wal: IGNORED ✅
data/README.md: NOT IGNORED ✅ (should be committed)
data/sample-data.json: NOT IGNORED ✅ (should be committed)
```

## What's Now Committed vs Ignored

### ✅ Committed to Git:
- `api-server/data/.gitkeep` - Ensures directory structure
- `api-server/data/README.md` - Documentation
- `api-server/data/sample-data.json` - Development sample data
- `api-server/data/*.sample.json` - Any other sample files

### ❌ Ignored by Git:
- `api-server/data/app.db` - Runtime database file
- `api-server/data/app.db-wal` - SQLite WAL file  
- `api-server/data/app.db-shm` - SQLite shared memory
- `api-server/data/*.db` - Any other database files
- `api-server/data/*.sqlite*` - SQLite variants

## Benefits
1. **Repository Size**: No large database files cluttering the repo
2. **Security**: No accidental commit of user data or sensitive information
3. **Environment Isolation**: Each environment has its own database
4. **Performance**: No database file conflicts during merges
5. **Best Practices**: Follows standard database handling in version control

## Database Configuration
The database location is configured in `api-server/.env`:
```env
DB_PATH=./data/app.db
```

When the API server starts:
1. It checks if the database exists
2. Creates it if missing (using the configured path)
3. Initializes schema and optionally seeds with sample data
4. SQLite automatically creates WAL/SHM files in WAL mode

## For Developers
- **Fresh Setup**: Database is created automatically on first run
- **Reset Database**: Delete `data/app.db*` files and restart server
- **Sample Data**: Use `data/sample-data.json` for consistent test data
- **Migration**: Database schema changes are handled by the application