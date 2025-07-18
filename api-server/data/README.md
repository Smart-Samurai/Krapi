# Database Data Directory

This directory contains database-related files for the Krapi CMS API server.

## Files in this directory:

### ✅ Committed to Git:
- `README.md` - This documentation file
- `.gitkeep` - Ensures directory exists in git
- `sample-data.json` - Sample content data for development
- `*.sample.json` - Any other sample data files

### ❌ NOT Committed to Git (excluded by .gitignore):
- `app.db` - Main SQLite database file
- `app.db-wal` - SQLite Write-Ahead Log file
- `app.db-shm` - SQLite Shared Memory file
- `app.db-journal` - SQLite Journal file (rollback mode)

## Database Configuration

The database path is configured in the `.env` file:
```env
DB_PATH=./data/app.db
```

## Initial Setup

When the API server starts for the first time:
1. It creates the SQLite database file (`app.db`)
2. It initializes the database schema
3. It can optionally seed the database with sample data
4. SQLite WAL mode files are created automatically

## SQLite WAL Mode

The database uses SQLite's Write-Ahead Logging (WAL) mode for better performance:
- `app.db` - Main database file
- `app.db-wal` - Write-ahead log (transactions)
- `app.db-shm` - Shared memory index

These files work together and should never be manually edited.

## Development

For development, you can:
- Delete the database files to reset to a clean state
- Use the sample data for consistent testing
- The database will be recreated automatically on next startup